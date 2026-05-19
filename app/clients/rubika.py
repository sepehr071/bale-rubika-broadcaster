import asyncio
import logging
from typing import Any

import httpx

from .bale import BotError


log = logging.getLogger(__name__)


BASE = "https://botapi.rubika.ir/v3"


class RubikaClient:
    def __init__(self, token: str, timeout: float = 60.0) -> None:
        self.token = token
        self._client = httpx.AsyncClient(timeout=timeout)

    async def close(self) -> None:
        await self._client.aclose()

    def _url(self, method: str) -> str:
        return f"{BASE}/{self.token}/{method}"

    async def _call(self, method: str, payload: dict) -> Any:
        for attempt in range(2):
            try:
                resp = await self._client.post(self._url(method), json=payload)
            except httpx.HTTPError as e:
                raise BotError("rubika", "network", str(e)) from e

            try:
                body = resp.json()
            except Exception:
                raise BotError("rubika", resp.status_code, resp.text[:200])

            status = body.get("status", "")
            if status == "OK":
                return body.get("data", {})

            desc = body.get("status_det") or body.get("description") or body.get("error") or str(body)[:200]
            if status in ("RateLimit", "TooManyRequests") and attempt == 0:
                await asyncio.sleep(2.0)
                continue
            raise BotError("rubika", status or resp.status_code, desc)
        raise BotError("rubika", "exhausted", "retries exhausted")

    async def get_me(self) -> dict:
        try:
            return await self._call("getMe", {})
        except BotError as e:
            msg = str(e).lower()
            if "unknown" in msg or "not found" in msg or "method" in msg:
                await self._call("getUpdates", {"limit": 1})
                return {"ok": True}
            raise

    async def get_updates(self, offset_id: str | None = None, limit: int = 100) -> dict:
        payload: dict = {"limit": limit}
        if offset_id:
            payload["offset_id"] = offset_id
        return await self._call("getUpdates", payload) or {}

    async def send_message(self, chat_id: str, text: str) -> dict:
        return await self._call("sendMessage", {"chat_id": chat_id, "text": text})

    async def get_chat(self, chat_id: str) -> dict:
        return await self._call("getChat", {"chat_id": chat_id})

    async def _request_send_file(self, file_type: str) -> dict:
        return await self._call("requestSendFile", {"type": file_type})

    async def _upload(self, upload_url: str, image_bytes: bytes, filename: str, mime: str) -> str:
        host = httpx.URL(upload_url).host
        try:
            resp = await self._client.post(upload_url, files={"file": (filename, image_bytes, mime)})
        except httpx.HTTPError as e:
            raise BotError("rubika", "upload_network", f"host={host} err={e}") from e
        snippet = (resp.text or "")[:300].replace("\n", " ")
        try:
            body = resp.json()
        except Exception:
            raise BotError("rubika", resp.status_code, f"upload non-json host={host} body={snippet!r}")
        if body.get("status") != "OK":
            raise BotError("rubika", body.get("status", resp.status_code), f"upload failed host={host} body={body}")
        data = body.get("data") or {}
        file_id = data.get("file_id") or data.get("file", {}).get("file_id")
        if not file_id:
            raise BotError("rubika", "upload_no_id", f"no file_id host={host} body={body}")
        return file_id

    async def send_image(self, chat_id: str, image_bytes: bytes, filename: str, mime: str, caption: str | None = None) -> dict:
        last_err: BotError | None = None
        file_id: str | None = None
        for attempt in range(3):
            req = await self._request_send_file("Image")
            upload_url = req.get("upload_url")
            file_id_from_req = req.get("file_id")
            if not upload_url:
                raise BotError("rubika", "no_upload_url", f"requestSendFile missing upload_url: {req}")
            log.info("rubika upload target (attempt %d): %s", attempt + 1, upload_url)
            try:
                file_id = await self._upload(upload_url, image_bytes, filename, mime)
                if not file_id:
                    file_id = file_id_from_req
                if file_id:
                    break
            except BotError as e:
                last_err = e
                log.warning("rubika upload attempt %d failed: %s", attempt + 1, e)
                await asyncio.sleep(1.5 * (attempt + 1))
        if not file_id:
            raise last_err or BotError("rubika", "upload_failed", "exhausted upload retries")
        payload: dict = {"chat_id": chat_id, "file_id": file_id}
        if caption:
            payload["text"] = caption
        return await self._call("sendFile", payload)
