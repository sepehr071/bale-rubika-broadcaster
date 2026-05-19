import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT = Path(__file__).resolve().parent.parent
_data_override = os.environ.get("PERSIAN_BOT_DATA_DIR")
DATA_DIR = Path(_data_override).resolve() if _data_override else ROOT / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
DB_PATH = DATA_DIR / "app.db"

_env_override = os.environ.get("PERSIAN_BOT_ENV_FILE")
_env_file = Path(_env_override) if _env_override else ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_env_file, env_file_encoding="utf-8", extra="ignore")

    bale_token: str = ""
    rubika_token: str = ""
    host: str = "127.0.0.1"
    port: int = 8000


settings = Settings()
