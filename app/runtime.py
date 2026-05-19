import asyncio
import logging
from contextlib import suppress
from dataclasses import dataclass

from fastapi import FastAPI

from .clients.bale import BaleClient
from .clients.rubika import RubikaClient
from .worker import bale_loop, rubika_loop


log = logging.getLogger(__name__)


PLATFORMS = ("bale", "rubika")
CLIENT_CLASS = {"bale": BaleClient, "rubika": RubikaClient}
LOOP_FN = {"bale": bale_loop, "rubika": rubika_loop}


@dataclass
class WorkerHandle:
    client: BaleClient | RubikaClient | None = None
    task: asyncio.Task | None = None


async def reload_platform(app: FastAPI, platform: str, new_token: str | None) -> None:
    old: WorkerHandle = app.state.workers[platform]

    if old.task and not old.task.done():
        old.task.cancel()
        with suppress(asyncio.CancelledError, Exception):
            await old.task
    if old.client:
        with suppress(Exception):
            await old.client.close()

    new = WorkerHandle()
    if new_token:
        new.client = CLIENT_CLASS[platform](new_token)
        new.task = asyncio.create_task(LOOP_FN[platform](new.client, app.state.stop))
        log.info("%s worker started", platform)
    else:
        log.info("%s worker stopped (no token)", platform)

    app.state.workers[platform] = new
    setattr(app.state, platform, new.client)
