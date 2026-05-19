import json
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Iterator

from .config import DB_PATH, DATA_DIR, UPLOADS_DIR


SCHEMA = """
CREATE TABLE IF NOT EXISTS chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  chat_type TEXT,
  title TEXT,
  first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform, chat_id)
);

CREATE TABLE IF NOT EXISTS broadcasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT,
  image_path TEXT,
  media_kind TEXT DEFAULT 'image',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total INTEGER DEFAULT 0,
  sent INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS broadcast_results (
  broadcast_id INTEGER REFERENCES broadcasts(id) ON DELETE CASCADE,
  platform TEXT,
  chat_id TEXT,
  status TEXT,
  error TEXT,
  PRIMARY KEY (broadcast_id, platform, chat_id)
);

CREATE TABLE IF NOT EXISTS worker_state (
  platform TEXT PRIMARY KEY,
  last_offset TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_presets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  keys_json TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""


TOKEN_KEY = {"bale": "bale_token", "rubika": "rubika_token"}


@dataclass
class Chat:
    platform: str
    chat_id: str
    chat_type: str | None
    title: str | None


def init_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    with connect() as c:
        c.executescript(SCHEMA)
        cols = {r["name"] for r in c.execute("PRAGMA table_info(broadcasts)").fetchall()}
        if "media_kind" not in cols:
            c.execute("ALTER TABLE broadcasts ADD COLUMN media_kind TEXT DEFAULT 'image'")
    _bootstrap_tokens_from_env()


def _bootstrap_tokens_from_env() -> None:
    from .config import settings
    seeds = {"bale": settings.bale_token, "rubika": settings.rubika_token}
    for platform, env_value in seeds.items():
        if env_value and get_token(platform) is None:
            set_token(platform, env_value)


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    con = sqlite3.connect(DB_PATH, isolation_level=None, timeout=30)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA foreign_keys=ON")
    try:
        yield con
    finally:
        con.close()


def upsert_chat(platform: str, chat_id: str, chat_type: str | None, title: str | None) -> None:
    with connect() as c:
        c.execute(
            """
            INSERT INTO chats (platform, chat_id, chat_type, title, last_seen_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(platform, chat_id) DO UPDATE SET
              chat_type = COALESCE(excluded.chat_type, chats.chat_type),
              title = COALESCE(excluded.title, chats.title),
              last_seen_at = CURRENT_TIMESTAMP
            """,
            (platform, str(chat_id), chat_type, title),
        )


def list_chats(platform: str | None = None) -> list[Chat]:
    sql = "SELECT platform, chat_id, chat_type, title FROM chats"
    args: tuple = ()
    if platform:
        sql += " WHERE platform = ?"
        args = (platform,)
    sql += " ORDER BY platform, id"
    with connect() as c:
        rows = c.execute(sql, args).fetchall()
    return [Chat(**dict(r)) for r in rows]


BROADCAST_TYPES = ("group", "supergroup", "channel", "Group", "Channel")


def broadcast_targets() -> list[Chat]:
    return [c for c in list_chats() if c.chat_type in BROADCAST_TYPES]


def get_chats_by_keys(keys: list[str]) -> list[Chat]:
    if not keys:
        return []
    wanted = set(keys)
    return [c for c in list_chats() if f"{c.platform}:{c.chat_id}" in wanted]


def get_chat(platform: str, chat_id: str) -> Chat | None:
    with connect() as c:
        row = c.execute(
            "SELECT platform, chat_id, chat_type, title FROM chats WHERE platform = ? AND chat_id = ?",
            (platform, str(chat_id)),
        ).fetchone()
    return Chat(**dict(row)) if row else None


def get_offset(platform: str) -> str | None:
    with connect() as c:
        row = c.execute("SELECT last_offset FROM worker_state WHERE platform = ?", (platform,)).fetchone()
    return row["last_offset"] if row else None


def set_offset(platform: str, offset: str | int) -> None:
    with connect() as c:
        c.execute(
            """
            INSERT INTO worker_state (platform, last_offset) VALUES (?, ?)
            ON CONFLICT(platform) DO UPDATE SET last_offset = excluded.last_offset
            """,
            (platform, str(offset)),
        )


def create_broadcast(text: str | None, image_path: str | None, total: int, media_kind: str = "image") -> int:
    with connect() as c:
        cur = c.execute(
            "INSERT INTO broadcasts (text, image_path, media_kind, total) VALUES (?, ?, ?, ?)",
            (text, image_path, media_kind, total),
        )
        assert cur.lastrowid is not None
        return cur.lastrowid


def record_result(broadcast_id: int, platform: str, chat_id: str, status: str, error: str | None = None) -> None:
    with connect() as c:
        c.execute(
            """
            INSERT OR REPLACE INTO broadcast_results (broadcast_id, platform, chat_id, status, error)
            VALUES (?, ?, ?, ?, ?)
            """,
            (broadcast_id, platform, str(chat_id), status, error),
        )
        col = "sent" if status == "ok" else "failed"
        c.execute(f"UPDATE broadcasts SET {col} = {col} + 1 WHERE id = ?", (broadcast_id,))


def list_broadcasts(limit: int = 100) -> list[dict]:
    with connect() as c:
        rows = c.execute(
            "SELECT id, text, image_path, media_kind, created_at, total, sent, failed FROM broadcasts ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_setting(key: str) -> str | None:
    with connect() as c:
        row = c.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else None


def set_setting(key: str, value: str) -> None:
    with connect() as c:
        c.execute(
            """
            INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
            """,
            (key, value),
        )


def delete_setting(key: str) -> None:
    with connect() as c:
        c.execute("DELETE FROM settings WHERE key = ?", (key,))


def get_token(platform: str) -> str | None:
    return get_setting(TOKEN_KEY[platform])


def set_token(platform: str, value: str | None) -> None:
    key = TOKEN_KEY[platform]
    if value:
        set_setting(key, value)
    else:
        delete_setting(key)


def mask_token(value: str | None) -> str | None:
    if not value:
        return None
    if len(value) >= 10:
        return value[:4] + "***" + value[-4:]
    return "***"


_PRESET_NAME_MIN = 1
_PRESET_NAME_MAX = 64


def _normalize_preset_name(name: str) -> str:
    cleaned = (name or "").strip()
    if not (_PRESET_NAME_MIN <= len(cleaned) <= _PRESET_NAME_MAX):
        raise ValueError(f"preset name must be {_PRESET_NAME_MIN}-{_PRESET_NAME_MAX} chars")
    return cleaned


def _normalize_preset_keys(keys: list[str]) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()
    for k in keys:
        parts = k.split(":", 1)
        if len(parts) != 2 or not parts[0] or not parts[1]:
            raise ValueError(f"malformed key: {k!r}")
        if k in seen:
            continue
        seen.add(k)
        cleaned.append(k)
    return cleaned


def list_presets() -> list[dict]:
    with connect() as c:
        rows = c.execute(
            "SELECT id, name, keys_json, created_at, updated_at FROM chat_presets ORDER BY name COLLATE NOCASE"
        ).fetchall()
    presets: list[dict] = []
    for r in rows:
        try:
            keys = json.loads(r["keys_json"])
            if not isinstance(keys, list):
                keys = []
        except (ValueError, TypeError):
            keys = []
        presets.append({
            "id": r["id"],
            "name": r["name"],
            "keys": keys,
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
        })
    return presets


def get_preset(name: str) -> dict | None:
    cleaned = _normalize_preset_name(name)
    with connect() as c:
        row = c.execute(
            "SELECT id, name, keys_json, created_at, updated_at FROM chat_presets WHERE name = ?",
            (cleaned,),
        ).fetchone()
    if not row:
        return None
    try:
        keys = json.loads(row["keys_json"])
        if not isinstance(keys, list):
            keys = []
    except (ValueError, TypeError):
        keys = []
    return {
        "id": row["id"],
        "name": row["name"],
        "keys": keys,
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def save_preset(name: str, keys: list[str]) -> dict:
    cleaned_name = _normalize_preset_name(name)
    cleaned_keys = _normalize_preset_keys(keys)
    payload = json.dumps(cleaned_keys, ensure_ascii=False)
    with connect() as c:
        c.execute(
            """
            INSERT INTO chat_presets (name, keys_json, created_at, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(name) DO UPDATE SET
              keys_json = excluded.keys_json,
              updated_at = CURRENT_TIMESTAMP
            """,
            (cleaned_name, payload),
        )
    result = get_preset(cleaned_name)
    assert result is not None
    return result


def rename_preset(old_name: str, new_name: str) -> dict:
    cleaned_old = _normalize_preset_name(old_name)
    cleaned_new = _normalize_preset_name(new_name)
    if cleaned_new != cleaned_old:
        with connect() as c:
            collision = c.execute(
                "SELECT 1 FROM chat_presets WHERE name = ? AND name != ?",
                (cleaned_new, cleaned_old),
            ).fetchone()
            if collision:
                raise ValueError(f"preset name already exists: {cleaned_new!r}")
            cur = c.execute(
                "UPDATE chat_presets SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?",
                (cleaned_new, cleaned_old),
            )
            if cur.rowcount == 0:
                raise LookupError(f"preset not found: {cleaned_old!r}")
    result = get_preset(cleaned_new)
    if result is None:
        raise LookupError(f"preset not found: {cleaned_new!r}")
    return result


def delete_preset(name: str) -> bool:
    cleaned = _normalize_preset_name(name)
    with connect() as c:
        cur = c.execute("DELETE FROM chat_presets WHERE name = ?", (cleaned,))
        return cur.rowcount > 0


def get_broadcast(broadcast_id: int) -> dict | None:
    with connect() as c:
        head = c.execute(
            "SELECT id, text, image_path, media_kind, created_at, total, sent, failed FROM broadcasts WHERE id = ?",
            (broadcast_id,),
        ).fetchone()
        if not head:
            return None
        results = c.execute(
            "SELECT platform, chat_id, status, error FROM broadcast_results WHERE broadcast_id = ? ORDER BY platform, chat_id",
            (broadcast_id,),
        ).fetchall()
    return {**dict(head), "results": [dict(r) for r in results]}
