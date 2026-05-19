import asyncio
import json as _json
from typing import Any

import httpx


ALLOWED_UPDATES = [
    "message",
    "edited_message",
    "channel_post",
    "edited_channel_post",
    "my_chat_member",
    "chat_member",
]


BASE = "https://tapi.bale.ai"


class BotError(Exception):
    def __init__(self, platform: str, code: int | str, message: str, retry_after: float | None = None) -> None:
        super().__init__(f"[{platform}] {code}: {message}")
        self.platform = platform
        self.code = code
        self.message = message
        self.retry_after = retry_after


class BaleClient:
    def __init__(self, token: str, timeout: float = 60.0) -> None:
        self.token = token
        self._client = httpx.AsyncClient(timeout=timeout)

    async def close(self) -> None:
        await self._client.aclose()

    def _url(self, method: str) -> str:
        return f"{BASE}/bot{self.token}/{method}"

    async def _call(self, method: str, *, json: dict | None = None, files: dict | None = None, data: dict | None = None, params: dict | None = None) -> Any:
        for attempt in range(2):
            try:
                if files is not None:
                    resp = await self._client.post(self._url(method), data=data, files=files)
                elif json is not None:
                    resp = await self._client.post(self._url(method), json=json)
                else:
                    resp = await self._client.get(self._url(method), params=params)
            except httpx.HTTPError as e:
                raise BotError("bale", "network", str(e)) from e

            try:
                payload = resp.json()
            except Exception:
                raise BotError("bale", resp.status_code, resp.text[:200])

            if payload.get("ok"):
                return payload.get("result")

            desc = payload.get("description", "unknown")
            code = payload.get("error_code", resp.status_code)
            retry_after = (payload.get("parameters") or {}).get("retry_after")
            if retry_after and attempt == 0:
                await asyncio.sleep(min(float(retry_after), 30.0))
                continue
            raise BotError("bale", code, desc, retry_after=retry_after)
        raise BotError("bale", "exhausted", "retries exhausted")

    async def get_me(self) -> dict:
        return await self._call("getMe", params={})

    async def get_updates(self, offset: int | None = None, timeout: int = 30) -> list[dict]:
        params: dict = {
            "timeout": timeout,
            "allowed_updates": _json.dumps(ALLOWED_UPDATES),
        }
        if offset is not None:
            params["offset"] = offset
        return await self._call("getUpdates", params=params) or []

    async def send_message(self, chat_id: str, text: str) -> dict:
        return await self._call("sendMessage", json={"chat_id": chat_id, "text": text})

    async def send_photo(self, chat_id: str, image_bytes: bytes, filename: str, mime: str, caption: str | None = None) -> dict:
        data = {"chat_id": chat_id}
        if caption:
            data["caption"] = caption
        files = {"photo": (filename, image_bytes, mime)}
        return await self._call("sendPhoto", data=data, files=files)

    async def send_video(self, chat_id: str, video_bytes: bytes, filename: str, mime: str, caption: str | None = None) -> dict:
        data = {"chat_id": chat_id}
        if caption:
            data["caption"] = caption
        files = {"video": (filename, video_bytes, mime)}
        return await self._call("sendVideo", data=data, files=files)
