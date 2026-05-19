import asyncio
import logging

from . import db
from .clients.bale import BaleClient, BotError
from .clients.rubika import RubikaClient


log = logging.getLogger(__name__)


async def bale_loop(client: BaleClient, stop: asyncio.Event) -> None:
    while not stop.is_set():
        try:
            offset_raw = db.get_offset("bale")
            offset = int(offset_raw) if offset_raw else None
            updates = await client.get_updates(offset=offset, timeout=30)
            for u in updates:
                msg = u.get("message") or u.get("edited_message") or u.get("channel_post") or u.get("edited_channel_post") or {}
                chat = msg.get("chat") or {}
                if chat.get("id") is not None:
                    db.upsert_chat("bale", str(chat["id"]), chat.get("type"), chat.get("title") or chat.get("username"))
                db.set_offset("bale", int(u["update_id"]) + 1)
        except BotError as e:
            log.warning("bale poll error: %s", e)
            await asyncio.sleep(5)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            log.exception("bale loop crash: %s", e)
            await asyncio.sleep(5)


async def rubika_backfill(client: RubikaClient) -> None:
    for chat in db.list_chats("rubika"):
        if chat.chat_type:
            continue
        try:
            info = await client.get_chat(chat.chat_id)
            data = info.get("chat") or info
            db.upsert_chat(
                "rubika",
                chat.chat_id,
                data.get("chat_type"),
                data.get("title") or data.get("first_name") or data.get("username"),
            )
            log.info("rubika backfill: %s -> type=%s", chat.chat_id, data.get("chat_type"))
        except BotError as e:
            log.warning("rubika backfill %s failed: %s", chat.chat_id, e)


async def rubika_loop(client: RubikaClient, stop: asyncio.Event) -> None:
    await rubika_backfill(client)
    while not stop.is_set():
        try:
            offset = db.get_offset("rubika")
            data = await client.get_updates(offset_id=offset)
            for u in data.get("updates") or []:
                chat_id = u.get("chat_id")
                if not chat_id:
                    msg = u.get("new_message") or u.get("message") or {}
                    chat_id = msg.get("chat_id") or msg.get("sender_id")
                if not chat_id:
                    continue
                existing = db.get_chat("rubika", str(chat_id))
                if existing is None or not existing.chat_type:
                    try:
                        info = await client.get_chat(str(chat_id))
                        chat = info.get("chat") or info
                        chat_type = chat.get("chat_type")
                        title = chat.get("title") or chat.get("first_name") or chat.get("username")
                    except BotError as e:
                        log.warning("rubika getChat(%s) failed: %s", chat_id, e)
                        chat_type, title = None, None
                    db.upsert_chat("rubika", str(chat_id), chat_type, title)
                else:
                    db.upsert_chat("rubika", str(chat_id), existing.chat_type, existing.title)
            next_off = data.get("next_offset_id")
            if next_off:
                db.set_offset("rubika", next_off)
            if not data.get("updates"):
                await asyncio.sleep(2)
        except BotError as e:
            log.warning("rubika poll error: %s", e)
            await asyncio.sleep(5)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            log.exception("rubika loop crash: %s", e)
            await asyncio.sleep(5)
