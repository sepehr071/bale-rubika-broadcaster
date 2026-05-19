import asyncio
import json
import logging
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from . import db
from .broadcaster import run_broadcast
from .clients.bale import BaleClient
from .clients.rubika import RubikaClient
from .config import UPLOADS_DIR
from .gating import any_token_configured
from .routes_settings import router as settings_router
from .runtime import PLATFORMS, WorkerHandle, reload_platform


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("app")


WEB_DIST = Path(__file__).parent / "web_dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    app.state.stop = asyncio.Event()
    app.state.workers = {p: WorkerHandle() for p in PLATFORMS}
    app.state.bale = None
    app.state.rubika = None
    app.state.pending_targets = {}
    for p in PLATFORMS:
        token = db.get_token(p)
        if not token:
            log.warning("%s token not set — %s polling disabled", p, p)
        await reload_platform(app, p, token)
    try:
        yield
    finally:
        app.state.stop.set()
        for p in PLATFORMS:
            await reload_platform(app, p, None)


app = FastAPI(lifespan=lifespan)
app.include_router(settings_router)


def _no_tokens_json() -> JSONResponse:
    return JSONResponse({"error": "no_tokens"}, status_code=503)


@app.get("/api/chats")
async def api_chats():
    if not any_token_configured():
        return _no_tokens_json()
    chats = db.list_chats()
    targets = db.broadcast_targets()
    by_platform: dict[str, list[dict]] = {"bale": [], "rubika": []}
    for c in chats:
        by_platform.setdefault(c.platform, []).append({
            "chat_id": c.chat_id, "type": c.chat_type, "title": c.title,
        })
    return {
        "chats": by_platform,
        "counts": {
            "bale_total": sum(1 for c in chats if c.platform == "bale"),
            "rubika_total": sum(1 for c in chats if c.platform == "rubika"),
            "broadcast_targets": len(targets),
        },
    }


IMAGE_MAX = 10 * 1024 * 1024
VIDEO_MAX = 50 * 1024 * 1024


@app.post("/api/broadcast")
async def api_broadcast(
    text: str = Form(""),
    media: UploadFile | None = File(None),
    image: UploadFile | None = File(None),
    targets: list[str] = Form(default=[]),
):
    if not any_token_configured():
        return _no_tokens_json()
    text = (text or "").strip()
    upload = media if (media and media.filename) else (image if (image and image.filename) else None)
    media_path: str | None = None
    media_kind = "image"
    if upload and upload.filename:
        content = await upload.read()
        ctype = (upload.content_type or "").lower()
        if ctype.startswith("video/"):
            media_kind = "video"
            if ctype != "video/mp4":
                raise HTTPException(415, "only mp4 video supported")
            if len(content) > VIDEO_MAX:
                raise HTTPException(413, "video > 50MB")
        else:
            media_kind = "image"
            if len(content) > IMAGE_MAX:
                raise HTTPException(413, "image > 10MB")
        suffix = Path(upload.filename).suffix or (".mp4" if media_kind == "video" else ".bin")
        name = f"{uuid.uuid4().hex}{suffix}"
        dest = UPLOADS_DIR / name
        dest.write_bytes(content)
        media_path = str(dest)
    if not text and not media_path:
        raise HTTPException(400, "text or media required")

    if targets:
        selected = db.get_chats_by_keys(targets)
    else:
        selected = db.broadcast_targets()
    if not selected:
        raise HTTPException(400, "no targets selected")

    broadcast_id = db.create_broadcast(text or None, media_path, len(selected), media_kind=media_kind)
    app.state.pending_targets[broadcast_id] = selected
    return {"broadcast_id": broadcast_id, "total": len(selected)}


@app.get("/api/broadcast/{broadcast_id}/stream")
async def api_broadcast_stream(broadcast_id: int):
    if not any_token_configured():
        return _no_tokens_json()
    bcast = db.get_broadcast(broadcast_id)
    if not bcast:
        raise HTTPException(404, "broadcast not found")

    bale: BaleClient | None = app.state.bale
    rubika: RubikaClient | None = app.state.rubika
    if bale is None and rubika is None:
        raise HTTPException(500, "no bot clients configured")

    selected = app.state.pending_targets.pop(broadcast_id, None)

    async def event_gen():
        async for evt in run_broadcast(
            broadcast_id=broadcast_id,
            text=bcast["text"] or "",
            image_path=bcast["image_path"],
            media_kind=bcast.get("media_kind") or "image",
            bale=bale,  # type: ignore[arg-type]
            rubika=rubika,  # type: ignore[arg-type]
            targets=selected,
        ):
            yield {"event": evt["event"], "data": json.dumps(evt, ensure_ascii=False)}

    return EventSourceResponse(event_gen())


class PresetCreate(BaseModel):
    name: str
    keys: list[str]


class PresetPatch(BaseModel):
    name: str | None = None
    keys: list[str] | None = None


@app.get("/api/presets")
async def api_list_presets():
    if not any_token_configured():
        return _no_tokens_json()
    return {"presets": db.list_presets()}


@app.post("/api/presets", status_code=201)
async def api_create_preset(payload: PresetCreate):
    if not any_token_configured():
        return _no_tokens_json()
    try:
        return db.save_preset(payload.name, payload.keys)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.patch("/api/presets/{name}")
async def api_update_preset(name: str, payload: PresetPatch):
    if not any_token_configured():
        return _no_tokens_json()
    current = db.get_preset(name)
    if current is None:
        raise HTTPException(404, "preset not found")
    target_name = payload.name if payload.name is not None else current["name"]
    target_keys = payload.keys if payload.keys is not None else current["keys"]
    try:
        if payload.name is not None and payload.name.strip() != current["name"]:
            db.rename_preset(current["name"], target_name)
        if payload.keys is not None:
            return db.save_preset(target_name, target_keys)
        result = db.get_preset(target_name)
        if result is None:
            raise HTTPException(404, "preset not found")
        return result
    except LookupError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        msg = str(e)
        status = 409 if "already exists" in msg else 400
        raise HTTPException(status, msg)


@app.delete("/api/presets/{name}", status_code=204)
async def api_delete_preset(name: str):
    if not any_token_configured():
        return _no_tokens_json()
    try:
        existed = db.delete_preset(name)
    except ValueError as e:
        raise HTTPException(400, str(e))
    if not existed:
        raise HTTPException(404, "preset not found")
    return Response(status_code=204)


@app.get("/api/broadcasts")
async def api_broadcasts():
    if not any_token_configured():
        return _no_tokens_json()
    return JSONResponse(db.list_broadcasts())


@app.get("/api/broadcasts/{broadcast_id}")
async def api_broadcast_detail(broadcast_id: int):
    if not any_token_configured():
        return _no_tokens_json()
    bcast = db.get_broadcast(broadcast_id)
    if not bcast:
        raise HTTPException(404, "broadcast not found")
    return bcast


_ASSETS_DIR = WEB_DIST / "assets"
if _ASSETS_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=_ASSETS_DIR), name="assets")


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    fav = WEB_DIST / "favicon.ico"
    if fav.exists():
        return FileResponse(fav)
    return Response(status_code=204)


_INDEX_FALLBACK = (
    "<!doctype html><meta charset='utf-8'>"
    "<title>پخش پیام</title>"
    "<p style='font-family:sans-serif;padding:2rem;direction:rtl'>"
    "نسخه ساخته‌شدهٔ رابط کاربری یافت نشد. در پوشهٔ <code>frontend</code> "
    "دستور <code>npm run build</code> را اجرا کنید."
    "</p>"
)


@app.get("/{full_path:path}", include_in_schema=False)
async def spa_fallback(full_path: str):
    if full_path.startswith("api/") or full_path.startswith("assets/"):
        raise HTTPException(404)
    index = WEB_DIST / "index.html"
    if not index.exists():
        return Response(_INDEX_FALLBACK, media_type="text/html", status_code=503)
    return FileResponse(index)
