# Persian Social Bot Broadcaster — Project Guide

Local admin web UI to broadcast a text + optional image to selected groups/channels across **Bale** (Telegram-clone) and **Rubika** (Iranian messengers).

## Stack

- Python 3.13, `uv` for env mgmt
- FastAPI + httpx (async) + SQLite (no ORM, raw SQL via `sqlite3`)
- sse-starlette for live broadcast progress
- React 18 + TypeScript + Vite + Tailwind v3 + shadcn/ui (in `frontend/`)
- TanStack Query + Zustand + Sonner + react-router-dom
- Vazirmatn + JetBrains Mono Variable self-hosted via `@fontsource/*` (offline-friendly)

Design context lives in `PRODUCT.md` (audience, register, anti-references) and `DESIGN.md`
(tokens, components, motion). Both are loaded by the `impeccable` skill — keep them updated
when UI direction shifts.

## Architecture

```
app/
  main.py          FastAPI: lifespan starts workers, routes, SSE stream
  config.py        pydantic-settings; reads .env (BALE_TOKEN, RUBIKA_TOKEN, HOST, PORT)
  db.py            SQLite schema + helpers (chats, broadcasts, broadcast_results,
                   worker_state, settings, chat_presets)
  worker.py        per-platform long-polling loops; rubika has getChat backfill at startup.
                   Bale loop extracts chat from message-like updates AND my_chat_member/chat_member
                   (skips upsert on left/kicked/banned status).
  broadcaster.py   async generator iterating selected targets, media→text fallback (image or video)
  clients/
    bale.py        BaleClient: getUpdates, sendMessage, sendPhoto. retries on retry_after.
    rubika.py      RubikaClient: getUpdates, sendMessage, getChat, requestSendFile→upload→sendFile.
                   _send_uploaded() retries 3× (Image) / 5× (Video) — bigger files hit flaky shards more.
  web_dist/        Built React SPA (gitignored, produced by `npm run build` in frontend/)
frontend/          React + Vite project. Build emits to `../app/web_dist`.
  src/pages/       Compose, History, Setup, Help
  src/components/  ChatPicker, ChatTile, PresetBar, MediaDropzone, ProgressStream,
                   HistoryRow, TokenCard, EmptyState; shadcn primitives under ui/
  src/hooks/       useChats, usePresets, useBroadcastStream, useSettings, useBootstrap
  src/lib/         api (fetch wrapper + NoTokensError), cleanError, types, constants,
                   vocab (Persian copy + toFa identity), format
  src/store/       selection.ts (Zustand: Set<"platform:chat_id">)
data/              SQLite DB + uploaded images (gitignored)
bale/, rubika/     Upstream Persian API docs (read-only reference)
scripts/
  probe_upload.py  Diagnostic for Rubika upload CDN — tries 6 HTTP variants
```

Data model summary:
- `chats(platform, chat_id, chat_type, title)` — unique on `(platform, chat_id)`
- `broadcasts(id, text, image_path, media_kind, total, sent, failed)` — media_kind ∈ {'image','video'}
- `broadcast_results(broadcast_id, platform, chat_id, status, error)`
- `worker_state(platform, last_offset)` — getUpdates cursor
- `settings(key, value)` — tokens (`bale_token`/`rubika_token`)
- `chat_presets(name UNIQUE, keys_json)` — named saved chat selections; keys are `"platform:chat_id"` strings

## Run

**Portable Windows bundle (only supported end-user path):**

```powershell
# Build once on a dev machine with uv + Node 20+ installed:
powershell -ExecutionPolicy Bypass -File .\build_bundle.ps1
# Runs `npm ci && npm run build` in frontend/, then PyInstaller.
# Outputs dist\persian-social-bot\ + dist\persian-social-bot.zip
```

End user unzips, double-clicks `run.bat`, opens the printed URL.
State (DB, uploads) lives in `data/` next to the .exe — copy the folder to migrate.
Bundle anchoring is driven by `PERSIAN_BOT_DATA_DIR` env var read by `app/config.py`;
`bundle_launcher.py` sets it to `Path(sys.executable).parent / "data"` when frozen.

Spec gotchas (do not "simplify" without testing):
- `uvicorn` loads workers/protocols dynamically — spec uses `collect_submodules("uvicorn")`.
- `app/web_dist` is bundled via `datas=[("app/web_dist", "app/web_dist")]`. Must run
  `npm run build` in `frontend/` BEFORE PyInstaller — `build_bundle.ps1` handles this.
- `uvicorn.run(app, ...)` is called with the imported app object, NOT the string
  `"app.main:app"` — string form forces re-import which fails inside the frozen bundle.

**Source / dev:**

```bash
# Backend
uv sync
uv run python run.py                       # auto-picks free port from $PORT (default 8000)

# Frontend (separate terminal)
cd frontend && npm install && npm run dev  # :5173, proxies /api → :8000
```

UI at <http://127.0.0.1:5173> during dev, <http://127.0.0.1:8000> when serving the
built SPA. First visit (no tokens) is redirected to `/setup` by `useBootstrap`.

**Production preview from single port:** `cd frontend && npm run build` →
FastAPI reads `app/web_dist/` from disk on each request (no server restart needed).
Hard-refresh browser to pick new asset hashes.

**Tokens**: stored in the SQLite `settings` table (keys `bale_token` / `rubika_token`).
`.env` (`BALE_TOKEN` / `RUBIKA_TOKEN`) seeds the DB on first startup only if the row
is missing — after that, `.env` is ignored and the DB is the source of truth. Edit tokens
via the `/setup` page, which hot-reloads the corresponding worker without restarting
the process.

## Platform quirks (load these before debugging)

### Bale
- API base: `https://tapi.bale.ai/bot<TOKEN>/<METHOD>` — Telegram-compatible.
- `getUpdates` MUST pass `allowed_updates` (JSON list) including `my_chat_member`/`chat_member`
  or the server omits join events — bot stays invisible until a message lands. Worker skips
  upsert when `new_chat_member.status` ∈ {left, kicked, banned}.
- `sendPhoto` is single `multipart/form-data` POST with `chat_id`, `photo` (bytes), optional `caption`.
- `sendVideo` mirrors `sendPhoto` — multipart `video` field, mp4 expected. **Doc claims 50MB but
  the nginx front-end 413s well below that** (empirically fails ≥20MB). `broadcaster.BALE_VIDEO_MAX`
  (20MB) preflights size and falls back to text before hitting the upload — do not raise without
  reverifying the real cap.
- Rate-limit hint: `parameters.retry_after` (seconds). Client retries once.
- Response envelope: `{ok, result, error_code, description, parameters}`.

### Rubika
- API base: `https://botapi.rubika.ir/v3/<TOKEN>/<METHOD>` — JSON POST only.
- **Token leak in logs:** httpx at INFO level prints the full request URL including `<TOKEN>`.
  Use `--log-level warning` before sharing logs / screenshots.
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
- File types: `Image` (jpg/png/gif/webp ≤10MB), `Video` (mp4 ≤50MB), `File`/`Music`/`Voice`/`Gif`.
- **Upload CDN (`messengerg2*.rubika.ir`) is flaky** — frequently returns generic 502
  nginx error page (identical `etag: "6627fd3f-1f1"`, 497 bytes). `_send_uploaded()` retries
  3× for Image, 5× for Video (Video uploads bigger → more shard-sensitive); fresh
  `requestSendFile` each attempt may land on a different shard. Backoff 2.0s × attempt.
  When all retries fail and text exists, broadcaster falls back to text-only (recorded as
  `ok` with note).

## Frontend rules

- React renders text safely by default. Never use `dangerouslySetInnerHTML` — Rubika
  errors carry raw `<!DOCTYPE html>...` that would render inline.
- **HSL only in CSS.** `oklch()` / `color-mix()` / `color()` / `lab()` drop silently on
  older Chromium and break the whole color layer. shadcn's `new-york` template may emit
  `oklch` defaults — audit `frontend/src/styles/globals.css` + `tailwind.config.ts` after
  any `shadcn add` and overwrite.
- `cleanError()` at `frontend/src/lib/cleanError.ts` — verbatim port from old util.js.
  Raw error reachable only via `<Popover>` triggered by an Info icon in error rows.
- **Latin digits everywhere.** `toFa()` in `lib/vocab.ts` is intentionally identity. Do
  not convert numeric values to Persian numerals (`۰۱۲...`).
- `sonner.tsx` rewritten to drop `next-themes` import — don't re-add it if shadcn
  regenerates the file. Light theme is hardcoded.
- Refresh buttons need a forced ≥600ms spin (`setForceSpin(true)`); TanStack Query does
  not trigger `isFetching` for cache hits.
- SPA catch-all in `app/main.py` must stay **last** and exclude `/api/*` + `/assets/*`.
- RTL throughout. `<DirectionProvider dir="rtl">` wraps the React root for Radix
  primitives. `dir="rtl"` also set on `<html>` in `frontend/index.html`.
- Vocabulary is non-technical Persian: no "broadcast" / "worker" / "token" / chat IDs
  in the UI. See `frontend/src/lib/vocab.ts` for the pinned word map.

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
- Don't annotate FastAPI route handlers with `-> dict` if they may also return `_no_tokens_json()`
  (which is a `JSONResponse`) — pyright will complain. Leave return type off.
- Don't add `private` / `User` / `Bot` chat types to `db.BROADCAST_TYPES` — they're
  intentionally filtered out so the admin can't accidentally DM users.
- Don't drop the `send_image` retry loop — Rubika upload shards fail often enough that
  removing it makes the feature unusable.
- Don't lower Rubika Video retries below 5× — mp4 uploads survive shard flakiness only
  with the extra attempts. Same reason: don't raise `broadcaster.BALE_VIDEO_MAX` past 20MB
  without empirically reverifying — Bale's nginx silently rejects, no clean error.
- Don't switch to webhook mode without addressing Bale's port allowlist (443/88 only)
  and Rubika's HTTPS requirement.
- Don't add auth scaffolding — the app is explicitly localhost-only (bind 127.0.0.1).
- Don't reintroduce `oklch` / `color-mix` / `color()` / `lab()` — older Chromium drops
  them silently and breaks the entire color layer.
- Don't reintroduce `app/static/` or HTML route handlers in `app/main.py` — the SPA
  serves all client routes via the catch-all.
- Don't add `next-themes` (or any dark-mode plumbing) to `frontend/` — light theme is
  hardcoded; the rewritten `sonner.tsx` explicitly avoids the dep.
- Don't render numeric values as Persian numerals — `toFa()` is identity by design.

## Out of scope (do not implement without asking)

- Webhook support, public hosting, TLS
- Multi-user auth, password rotation
- Audio / document attachments (video IS supported, mp4 only, ≤50MB)
- Automatic retry queue for failed sends across broadcasts
