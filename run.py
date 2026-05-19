"""Local launcher: picks a free port starting from $PORT (default 8000), then runs uvicorn.

Usage:
    uv run python run.py            # binds 127.0.0.1, picks first free port >= 8000
    PORT=9000 uv run python run.py  # starts scan at 9000
    HOST=0.0.0.0 uv run python run.py
"""
import os
import sys

import uvicorn

from app.portutil import find_free_port, is_port_free


def main() -> int:
    host = os.environ.get("HOST", "127.0.0.1")
    requested = int(os.environ.get("PORT", "8000"))

    if is_port_free(host, requested):
        port = requested
    else:
        port = find_free_port(host, requested + 1)
        print(f"[run] port {requested} busy on {host} — using {port} instead", flush=True)

    print(f"[run] starting on http://{host}:{port}", flush=True)
    uvicorn.run("app.main:app", host=host, port=port, log_level="info")
    return 0


if __name__ == "__main__":
    sys.exit(main())
