import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from . import db
from .clients.bale import BaleClient, BotError
from .clients.rubika import RubikaClient
from .runtime import reload_platform


log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["settings"])


class TokenUpdate(BaseModel):
    bale_token: str | None = None
    rubika_token: str | None = None


def _status(platform: str) -> dict:
    token = db.get_token(platform)
    return {"configured": bool(token), "masked": db.mask_token(token)}


def _snapshot() -> dict:
    return {"bale": _status("bale"), "rubika": _status("rubika")}


async def _validate(platform: str, token: str) -> None:
    if platform == "bale":
        client = BaleClient(token)
        try:
            await client.get_me()
        finally:
            await client.close()
    else:
        client = RubikaClient(token)
        try:
            await client.get_me()
        finally:
            await client.close()


@router.get("")
async def get_settings() -> dict:
    return _snapshot()


@router.post("")
async def update_settings(payload: TokenUpdate, request: Request) -> dict:
    fields = {"bale": payload.bale_token, "rubika": payload.rubika_token}

    for platform, raw in fields.items():
        if raw is None:
            continue
        new_value = raw.strip()
        current = db.get_token(platform)
        if new_value == (current or ""):
            continue

        if not new_value:
            db.set_token(platform, None)
            await reload_platform(request.app, platform, None)
            continue

        try:
            await _validate(platform, new_value)
        except BotError as e:
            raise HTTPException(
                status_code=400,
                detail={"error": "invalid_token", "platform": platform, "detail": str(e)},
            )
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail={"error": "invalid_token", "platform": platform, "detail": str(e)},
            )

        db.set_token(platform, new_value)
        await reload_platform(request.app, platform, new_value)

    return _snapshot()
