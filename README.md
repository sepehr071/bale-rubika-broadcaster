# Persian Social Bot Broadcaster

Local admin web UI to send a text + optional image to **every group and channel** that a Bale bot and a Rubika bot are members of.

## Architecture

- **Backend**: FastAPI + httpx + SQLite (no external services)
- **Frontend**: vanilla HTML/JS, RTL Persian
- **Discovery**: background long-polling worker harvests `chat_id`s from `getUpdates` (no public URL needed)
- **Send**: server iterates stored chats, streams per-chat status via SSE
- **Storage**: SQLite — chats, broadcasts, per-chat results, polling cursor

## Quick start (Docker — recommended)

Only Docker Desktop is required on the host. No Python, no `uv`.

**First time (one command):**

Windows (PowerShell):
```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

Linux / macOS:
```bash
bash setup.sh
```

The script checks that Docker is running, picks the first free host port starting at
8000 (use `HOST_PORT=NNNN` to override), builds the image, and starts the container
detached with `restart: unless-stopped`. It prints the panel URL when done — open it
and complete the in-app setup wizard to enter your Bale / Rubika bot tokens.

**After that — manage from Docker Desktop:**

Open Docker Desktop → **Containers** tab → `persian-social-bot`:
- Start / Stop / Restart buttons
- View logs and stats
- Auto-starts whenever Docker Desktop runs (so it survives a reboot)

Or use the CLI:
```bash
docker compose start          # start the existing container
docker compose stop           # stop it
docker compose logs -f bot    # tail logs
```

**Where state lives:** everything is in the host-side `./data/` directory
(volume-mounted into the container as `/app/data`). Tokens, broadcast history,
and uploaded images all persist across container restarts, rebuilds, and `down`.
Wipe `./data/` to reset the panel completely.

**Security note:** the compose file binds the published port to `127.0.0.1` only
(the host loopback). The admin UI has no authentication, so do not drop the
`127.0.0.1:` prefix — that would expose the panel on every network interface of
the host.

Get bot tokens from `@botfather` on Bale and from BotFather on Rubika. The wizard
includes a Persian step-by-step guide for both. You can configure either one or
both — the worker for the unconfigured platform simply stays off.

---

## Run from source (development)

Requires Python 3.13+ and [`uv`](https://docs.astral.sh/uv/).

```bash
uv sync
uv run python run.py            # picks free port from $PORT (default 8000)
```

Or invoke uvicorn directly (no auto port-pick):

```bash
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

`run.py` and the in-app setup wizard work the same way as in Docker — tokens enter
through `/setup`, not `.env`. (If you do drop a `.env` with `BALE_TOKEN=…` /
`RUBIKA_TOKEN=…`, it seeds the SQLite settings table on the *very first* startup
and is ignored thereafter.)

## Usage

1. **Add bot to chats.** Add each bot to the groups/channels you want to broadcast to. The bot must be an admin in channels. Rubika allows up to 10 admin bots per chat.
2. **Trigger discovery.** Send any message in each group/channel so the bot receives an update. The worker captures the `chat_id` within ~30s.
3. **Compose.** Open the UI. Verify the chat counts (Bale / Rubika / total broadcast targets).
4. **Send.** Type text and/or attach an image (≤10 MB), click "ارسال به همه". Watch live status per chat.
5. **History.** Click "تاریخچه" to review past broadcasts and per-chat failures.

## Notes

- Only groups/channels are targeted — private chats with the bot are ignored.
- Image limit: 10 MB (Rubika constraint). Both platforms accept caption alongside the image.
- The worker logs warnings if a token is missing. The app still runs with just one bot configured.
- All data lives in `data/` (SQLite + uploaded images). Delete `data/app.db` to reset chat list and history.

## Files

```
app/
  main.py          FastAPI app + routes + SSE
  config.py        env loader (pydantic-settings)
  db.py            SQLite schema + helpers
  worker.py        per-platform long-poll loops
  broadcaster.py   broadcast orchestration (async generator)
  clients/
    bale.py        Bale Bot API client (Telegram-compatible)
    rubika.py      Rubika Bot API client (3-step file upload)
  static/          index.html, history.html, app.js, style.css
data/              SQLite DB + uploaded images (gitignored)
bale/              upstream Bale Bot API docs (Persian)
rubika/            upstream Rubika Bot API docs (Persian)
```
