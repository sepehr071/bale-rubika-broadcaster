import asyncio
import mimetypes
from pathlib import Path
from typing import AsyncIterator

from . import db
from .clients.bale import BaleClient, BotError
from .clients.rubika import RubikaClient


async def run_broadcast(
    broadcast_id: int,
    text: str,
    image_path: str | None,
    bale: BaleClient,
    rubika: RubikaClient,
    targets: list | None = None,
) -> AsyncIterator[dict]:
    image_bytes: bytes | None = None
    filename = ""
    mime = "application/octet-stream"
    if image_path:
        p = Path(image_path)
        image_bytes = p.read_bytes()
        filename = p.name
        mime = mimetypes.guess_type(p.name)[0] or "image/jpeg"

    if targets is None:
        targets = db.broadcast_targets()
    if not targets:
        yield {"event": "done", "sent": 0, "failed": 0, "total": 0}
        return

    sent = 0
    failed = 0
    for chat in targets:
        image_err: str | None = None
        delivered = False
        try:
            if image_bytes is not None:
                try:
                    if chat.platform == "bale":
                        await bale.send_photo(chat.chat_id, image_bytes, filename, mime, caption=text or None)
                    elif chat.platform == "rubika":
                        await rubika.send_image(chat.chat_id, image_bytes, filename, mime, caption=text or None)
                    else:
                        raise BotError(chat.platform, "unknown_platform", chat.platform)
                    delivered = True
                except BotError as e:
                    image_err = str(e)
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
            status_note = f"ok (text only, image failed: {image_err})" if image_err else None
            db.record_result(broadcast_id, chat.platform, chat.chat_id, "ok", status_note)
            sent += 1
            yield {
                "event": "progress",
                "platform": chat.platform,
                "chat_id": chat.chat_id,
                "title": chat.title,
                "status": "ok",
                "fallback": bool(image_err),
                "error": image_err,
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
