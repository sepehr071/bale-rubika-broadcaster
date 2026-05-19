import asyncio
import mimetypes
from pathlib import Path
from typing import AsyncIterator

from . import db
from .clients.bale import BaleClient, BotError
from .clients.rubika import RubikaClient


BALE_VIDEO_MAX = 20 * 1024 * 1024


async def run_broadcast(
    broadcast_id: int,
    text: str,
    image_path: str | None,
    media_kind: str,
    bale: BaleClient,
    rubika: RubikaClient,
    targets: list | None = None,
) -> AsyncIterator[dict]:
    media_bytes: bytes | None = None
    filename = ""
    mime = "application/octet-stream"
    if image_path:
        p = Path(image_path)
        media_bytes = p.read_bytes()
        filename = p.name
        default_mime = "video/mp4" if media_kind == "video" else "image/jpeg"
        mime = mimetypes.guess_type(p.name)[0] or default_mime

    if targets is None:
        targets = db.broadcast_targets()
    if not targets:
        yield {"event": "done", "sent": 0, "failed": 0, "total": 0}
        return

    sent = 0
    failed = 0
    for chat in targets:
        media_err: str | None = None
        delivered = False
        try:
            if media_bytes is not None:
                try:
                    if chat.platform == "bale":
                        if media_kind == "video":
                            if len(media_bytes) > BALE_VIDEO_MAX:
                                raise BotError("bale", 413, f"video {len(media_bytes)//1024//1024}MB exceeds bale cap {BALE_VIDEO_MAX//1024//1024}MB")
                            await bale.send_video(chat.chat_id, media_bytes, filename, mime, caption=text or None)
                        else:
                            await bale.send_photo(chat.chat_id, media_bytes, filename, mime, caption=text or None)
                    elif chat.platform == "rubika":
                        if media_kind == "video":
                            await rubika.send_video(chat.chat_id, media_bytes, filename, mime, caption=text or None)
                        else:
                            await rubika.send_image(chat.chat_id, media_bytes, filename, mime, caption=text or None)
                    else:
                        raise BotError(chat.platform, "unknown_platform", chat.platform)
                    delivered = True
                except BotError as e:
                    media_err = str(e)
                    if not text:
                        raise
            if not delivered:
                if chat.platform == "bale":
                    await bale.send_message(chat.chat_id, text)
                elif chat.platform == "rubika":
                    await rubika.send_message(chat.chat_id, text)
                else:
                    raise BotError(chat.platform, "unknown_platform", chat.platform)
                delivered = True
            status_note = f"ok (text only, {media_kind} failed: {media_err})" if media_err else None
            db.record_result(broadcast_id, chat.platform, chat.chat_id, "ok", status_note)
            sent += 1
            yield {
                "event": "progress",
                "platform": chat.platform,
                "chat_id": chat.chat_id,
                "title": chat.title,
                "status": "ok",
                "fallback": bool(media_err),
                "media_kind": media_kind,
                "error": media_err,
            }
        except BotError as e:
            db.record_result(broadcast_id, chat.platform, chat.chat_id, "error", str(e))
            failed += 1
            yield {"event": "progress", "platform": chat.platform, "chat_id": chat.chat_id, "title": chat.title, "status": "error", "error": str(e)}
        except Exception as e:
            db.record_result(broadcast_id, chat.platform, chat.chat_id, "error", repr(e))
            failed += 1
            yield {"event": "progress", "platform": chat.platform, "chat_id": chat.chat_id, "title": chat.title, "status": "error", "error": repr(e)}
        await asyncio.sleep(0.15)

    yield {"event": "done", "sent": sent, "failed": failed, "total": len(targets)}
