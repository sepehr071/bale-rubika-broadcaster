# Persian Social Bot Broadcaster — Project Guide

Local admin web UI to broadcast a text + optional image to selected groups/channels across **Bale** (Telegram-clone) and **Rubika** (Iranian messengers).

## Stack

- Python 3.13, `uv` for env mgmt
- FastAPI + httpx (async) + SQLite (no ORM, raw SQL via `sqlite3`)
- sse-starlette for live broadcast progress
- Vanilla JS + Vazirmatn font, no frontend framework

## Architecture

```
app/
  main.py          FastAPI: lifespan starts workers, routes, SSE stream
  config.py        pydantic-settings; reads .env (BALE_TOKEN, RUBIKA_TOKEN, HOST, PORT)
  db.py            SQLite schema + helpers (chats, broadcasts, broadcast_results, worker_state)
  worker.py        per-platform long-polling loops; rubika has getChat backfill at startup
  broadcaster.py   async generator iterating selected targets, image→text fallback
  clients/
    bale.py        BaleClient: getUpdates, sendMessage, sendPhoto. retries on retry_after.
    rubika.py      RubikaClient: getUpdates, sendMessage, getChat, requestSendFile→upload→sendFile.
                   send_image() retries 3× to survive a flaky upload shard.
  static/          index.html, history.html, app.js, style.css
data/              SQLite DB + uploaded images (gitignored)
bale/, rubika/     Upstream Persian API docs (read-only reference)
scripts/
  probe_upload.py  Diagnostic for Rubika upload CDN — tries 6 HTTP variants
```

Data model summary:
- `chats(platform, chat_id, chat_type, title)` — unique on `(platform, chat_id)`
- `broadcasts(id, text, image_path, total, sent, failed)`
- `broadcast_results(broadcast_id, platform, chat_id, status, error)`
- `worker_state(platform, last_offset)` — getUpdates cursor

## Run

**Docker (intended path — only Docker Desktop required on the host):**

```powershell
# First time (Windows):
powershell -ExecutionPolicy Bypass -File .\setup.ps1
# First time (Linux / macOS):
bash setup.sh
```

`setup.ps1` / `setup.sh` find a free host port starting at `$HOST_PORT` (default 8000),
export it, run `docker compose up -d --build`, and print the panel URL. After that the
container is managed from Docker Desktop's Containers tab (`persian-social-bot`) — it
auto-starts with Docker thanks to `restart: unless-stopped`. State persists in `./data/`.

**Portable Windows bundle (no Docker, no Python install — for Iran where Docker Hub is censored):**

```powershell
# Build once on a dev machine with uv installed:
powershell -ExecutionPolicy Bypass -File .\build_bundle.ps1
# Outputs dist\persian-social-bot\ + dist\persian-social-bot.zip
```

Ship the zip. End user unzips, double-clicks `run.bat`, opens the printed URL.
State (DB, uploads) lives in `data/` next to the .exe — copy the folder to migrate.
Bundle anchoring is driven by `PERSIAN_BOT_DATA_DIR` env var read by `app/config.py`;
`bundle_launcher.py` sets it to `Path(sys.executable).parent / "data"` when frozen.

Spec gotchas (do not "simplify" without testing):
- `uvicorn` loads workers/protocols dynamically — spec uses `collect_submodules("uvicorn")`.
- `app/static` is bundled via `datas=[("app/static", "app/static")]`. Removing this
  breaks the `/static` mount and the index/setup HTML.
- `uvicorn.run(app, ...)` is called with the imported app object, NOT the string
  `"app.main:app"` — string form forces re-import which fails inside the frozen bundle.

**Source / dev:**

```bash
uv sync
uv run python run.py                       # auto-picks free port from $PORT (default 8000)
# or (no auto port-pick, fails if 8000 busy):
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

UI at the URL the launcher prints (typically <http://127.0.0.1:8000>; falls forward if
the port is busy). First visit redirects to `/setup` if no tokens configured.

**Tokens**: stored in the SQLite `settings` table (keys `bale_token` / `rubika_token`).
`.env` (`BALE_TOKEN` / `RUBIKA_TOKEN`) seeds the DB on first startup only if the row
is missing — after that, `.env` is ignored and the DB is the source of truth. Edit tokens
via the `/setup` page, which hot-reloads the corresponding worker without restarting
the process.

## Platform quirks (load these before debugging)

### Bale
- API base: `https://tapi.bale.ai/bot<TOKEN>/<METHOD>` — Telegram-compatible.
- `sendPhoto` is single `multipart/form-data` POST with `chat_id`, `photo` (bytes), optional `caption`.
- Rate-limit hint: `parameters.retry_after` (seconds). Client retries once.
- Response envelope: `{ok, result, error_code, description, parameters}`.

### Rubika
- API base: `https://botapi.rubika.ir/v3/<TOKEN>/<METHOD>` — JSON POST only.
- Response envelope: `{status: "OK", data: {...}}` (or status_det/description on error).
- **Geo-blocked outside Iran.** VPN traffic returns DNS failures or 403/connection-refused.
  Without a working v2ray-N split-tunnel for `rubika.ir`, all Rubika calls fail.
- **Bot privacy:** by default the bot only receives group messages mentioning it (`@botname`)
  or starting with `/`. To capture all messages, disable Group Privacy in `@BotFather`.
- **No "list chats" endpoint** on either platform — chat IDs harvested from `getUpdates`.
- **Update model** carries only `chat_id` (no `chat_type`/`title`). Worker calls `getChat`
  to populate type/title; backfill at startup re-resolves any rows with null type.
- **3-step file upload:** `requestSendFile(type)` → `upload_url` → POST multipart `file=`
  field to that URL → `{file_id}` → `sendFile(chat_id, file_id, text=caption)`.
- **Upload CDN (`messengerg2*.rubika.ir`) is flaky** — frequently returns generic 502
  nginx error page (identical `etag: "6627fd3f-1f1"`, 497 bytes). `send_image()` retries
  3× with fresh `requestSendFile` (may land on different shard). When all retries fail
  and text exists, broadcaster falls back to text-only send (recorded as `ok` with note).

## Frontend rules

- **All dynamic strings rendered as DOM text nodes** (`textContent` / `el()` helper),
  never via `innerHTML`. Rubika error responses contain raw `<!DOCTYPE html>...` that
  would otherwise render inline.
- Error strings translated to short Persian summaries by `cleanError()` in `app.js`;
  raw error hidden behind `<details>` toggle.
- RTL throughout (`dir="rtl"`). Vazirmatn for Persian, JetBrains Mono for chat IDs.

## Common diagnostics

```bash
# Inspect captured chats (PYTHONIOENCODING needed on Windows for Persian titles)
PYTHONIOENCODING=utf-8 uv run python -c "
import sys; sys.stdout.reconfigure(encoding='utf-8')
from app import db
for c in db.list_chats(): print(c.platform, c.chat_id, repr(c.chat_type), c.title)
"

# Test Rubika upload CDN (stop the server first so token isn't being polled)
uv run python scripts/probe_upload.py
```

If all 6 probe variants return identical 502s, Rubika upload backend is degraded;
not a code bug.

## Things to NOT do

- Don't render server-returned strings with `innerHTML` — re-introduces HTML injection.
- Don't add `private` / `User` / `Bot` chat types to `db.BROADCAST_TYPES` — they're
  intentionally filtered out so the admin can't accidentally DM users.
- Don't drop the `send_image` retry loop — Rubika upload shards fail often enough that
  removing it makes the feature unusable.
- Don't switch to webhook mode without addressing Bale's port allowlist (443/88 only)
  and Rubika's HTTPS requirement.
- Don't add auth scaffolding — the app is explicitly localhost-only (bind 127.0.0.1).
- Don't change the Docker compose port mapping from `127.0.0.1:8000:8000` to `8000:8000` —
  the admin UI has no auth; the loopback-only host binding is the security boundary.
  Inside the container uvicorn binds `0.0.0.0` so port forwarding works, which is fine
  because the container itself is unreachable from outside the host.

## Out of scope (do not implement without asking)

- Webhook support, public hosting, TLS
- Multi-user auth, password rotation
- Video / audio / document attachments
- Automatic retry queue for failed sends across broadcasts
