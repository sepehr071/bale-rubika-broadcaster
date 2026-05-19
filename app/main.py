import asyncio
import json
import logging
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
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


STATIC_DIR = Path(__file__).parent / "static"


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
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.include_router(settings_router)


def _no_tokens_json() -> JSONResponse:
    return JSONResponse({"error": "no_tokens"}, status_code=503)


@app.get("/")
async def index():
    if not any_token_configured():
        return RedirectResponse("/setup", status_code=302)
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/history")
async def history_page():
    if not any_token_configured():
        return RedirectResponse("/setup", status_code=302)
    return FileResponse(STATIC_DIR / "history.html")


@app.get("/setup")
async def setup_page():
    return FileResponse(STATIC_DIR / "setup.html")


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


@app.post("/api/broadcast")
async def api_broadcast(
    text: str = Form(""),
    image: UploadFile | None = File(None),
    targets: list[str] = Form(default=[]),
):
    if not any_token_configured():
        return _no_tokens_json()
    text = (text or "").strip()
    image_path: str | None = None
    if image and image.filename:
        content = await image.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(413, "image > 10MB")
        suffix = Path(image.filename).suffix or ".bin"
        name = f"{uuid.uuid4().hex}{suffix}"
        dest = UPLOADS_DIR / name
        dest.write_bytes(content)
        image_path = str(dest)
    if not text and not image_path:
        raise HTTPException(400, "text or image required")

    if targets:
        selected = db.get_chats_by_keys(targets)
    else:
        selected = db.broadcast_targets()
    if not selected:
        raise HTTPException(400, "no targets selected")

    broadcast_id = db.create_broadcast(text or None, image_path, len(selected))
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
            bale=bale,  # type: ignore[arg-type]
            rubika=rubika,  # type: ignore[arg-type]
            targets=selected,
        ):
            yield {"event": evt["event"], "data": json.dumps(evt, ensure_ascii=False)}

    return EventSourceResponse(event_gen())


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
