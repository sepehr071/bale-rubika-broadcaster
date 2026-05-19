"""Docker launcher: picks a free host port, exports HOST_PORT, runs `docker compose up`.

The compose file binds "${HOST_PORT:-8000}:8000" on 127.0.0.1. This script picks the
host port so users don't have to hand-edit anything when 8000 is taken.

Usage:
    uv run python scripts/docker_up.py             # build + up -d, pick free port >= 8000
    HOST_PORT=9000 uv run python scripts/docker_up.py   # honor explicit port if free
    uv run python scripts/docker_up.py --foreground     # no -d
    uv run python scripts/docker_up.py --no-build       # skip --build
"""
import argparse
import os
import socket
import subprocess
import sys


def _is_free(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind((host, port))
        except OSError:
            return False
    return True


def _find_free(host: str, start: int, max_tries: int = 50) -> int:
    for offset in range(max_tries):
        candidate = start + offset
        if _is_free(host, candidate):
            return candidate
    raise RuntimeError(f"no free port in {start}..{start + max_tries - 1} on {host}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--foreground", action="store_true", help="run without -d")
    parser.add_argument("--no-build", action="store_true", help="skip --build")
    args = parser.parse_args()

    host_bind = "127.0.0.1"
    requested = int(os.environ.get("HOST_PORT", "8000"))

    if _is_free(host_bind, requested):
        port = requested
    else:
        port = _find_free(host_bind, requested + 1)
        print(f"[docker_up] port {requested} busy on {host_bind} — using {port} instead", flush=True)

    env = os.environ.copy()
    env["HOST_PORT"] = str(port)

    cmd = ["docker", "compose", "up"]
    if not args.foreground:
        cmd.append("-d")
    if not args.no_build:
        cmd.append("--build")

    print(f"[docker_up] HOST_PORT={port} → {' '.join(cmd)}", flush=True)
    result = subprocess.run(cmd, env=env)
    if result.returncode == 0 and not args.foreground:
        print(f"[docker_up] panel: http://127.0.0.1:{port}", flush=True)
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
