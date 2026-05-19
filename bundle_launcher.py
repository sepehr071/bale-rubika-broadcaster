"""PyInstaller entrypoint for the portable Windows bundle.

When frozen by PyInstaller:
  - sys._MEIPASS holds read-only resources (app/static, packages).
  - sys.executable is the .exe inside the dist folder.
We anchor the SQLite DB + uploads to the .exe's parent, so state survives
across restarts and the user can ship the bundle as a single folder.

Reads PORT / HOST env vars (defaults: 127.0.0.1:8000) and picks the next
free port if the requested one is busy. Auto-opens the browser to the
correct URL once the server has started.
"""
import logging
import os
import sys
import threading
import webbrowser
from pathlib import Path


def _bundle_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def _bootstrap_paths() -> None:
    root = _bundle_root()
    data_dir = root / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("PERSIAN_BOT_DATA_DIR", str(data_dir))
    env_path = root / ".env"
    if env_path.exists():
        os.environ.setdefault("PERSIAN_BOT_ENV_FILE", str(env_path))


def _force_utf8_stdio() -> None:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
        except Exception:
            pass


def _quiet_logging() -> None:
    logging.basicConfig(level=logging.ERROR, format="%(message)s")
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access", "httpx", "httpcore", "app"):
        logging.getLogger(name).setLevel(logging.ERROR)


def _print_banner(url: str) -> None:
    bar = "=" * 56
    lines = [
        "",
        bar,
        "  Persian Social Bot - Bale & Rubika broadcast panel",
        f"  Panel URL: {url}",
        "  Browser opens automatically.",
        "  To stop: close this window or press Ctrl+C.",
        bar,
        "",
    ]
    sys.stdout.write("\n".join(lines) + "\n")
    sys.stdout.flush()


def _open_browser_soon(url: str) -> None:
    def _open() -> None:
        try:
            webbrowser.open(url, new=2)
        except Exception:
            pass

    threading.Timer(1.5, _open).start()


def main() -> int:
    _force_utf8_stdio()
    _bootstrap_paths()
    _quiet_logging()

    import uvicorn
    from app.main import app
    from app.portutil import find_free_port, is_port_free

    host = os.environ.get("HOST", "127.0.0.1")
    requested = int(os.environ.get("PORT", "8000"))
    if is_port_free(host, requested):
        port = requested
    else:
        port = find_free_port(host, requested + 1)
        print(f"Port {requested} in use - using port {port} instead", flush=True)

    url = f"http://{host}:{port}"
    _print_banner(url)
    _open_browser_soon(url)

    uvicorn.run(app, host=host, port=port, log_level="warning", access_log=False)
    return 0


if __name__ == "__main__":
    sys.exit(main())
