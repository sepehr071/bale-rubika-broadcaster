#!/usr/bin/env bash
# First-time Docker setup for the Persian Social Bot panel (Linux / macOS).
#
# Usage:  bash setup.sh
#
# After this completes once, manage the container with `docker compose`
# or with Docker Desktop (container name: persian-social-bot).

set -euo pipefail

is_free() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ! ss -lnt "sport = :$port" 2>/dev/null | tail -n +2 | grep -q .
  elif command -v lsof >/dev/null 2>&1; then
    ! lsof -iTCP:"$port" -sTCP:LISTEN -nP >/dev/null 2>&1
  else
    python3 - "$port" <<'PY'
import socket, sys
p = int(sys.argv[1])
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
try:
    s.bind(("127.0.0.1", p))
    sys.exit(0)
except OSError:
    sys.exit(1)
finally:
    s.close()
PY
  fi
}

find_free() {
  local start="$1" max=50 i=0
  while [ $i -lt $max ]; do
    local candidate=$((start + i))
    if is_free "$candidate"; then echo "$candidate"; return 0; fi
    i=$((i + 1))
  done
  echo "no free port in $start..$((start + max - 1))" >&2
  return 1
}

echo "[setup] checking Docker..."
if ! docker version --format '{{.Server.Version}}' >/dev/null 2>&1; then
  echo "[setup] Docker not reachable. Start Docker Desktop / dockerd and rerun." >&2
  exit 1
fi

requested="${HOST_PORT:-8000}"
if is_free "$requested"; then
  port="$requested"
else
  echo "[setup] port $requested busy on 127.0.0.1, scanning for next free port..."
  port="$(find_free $((requested + 1)))"
fi

export HOST_PORT="$port"
echo "[setup] HOST_PORT=$port"
echo "[setup] building image and starting container (this may take a minute on first run)..."

docker compose up -d --build

url="http://127.0.0.1:$port"
echo
echo "[setup] panel ready: $url"
echo "[setup] open it in your browser and complete the token setup wizard."
echo
echo "From now on, manage the container with Docker Desktop or:"
echo "  docker compose start       # start the existing container"
echo "  docker compose stop        # stop it"
echo "  docker compose logs -f bot # tail logs"
echo "  HOST_PORT=NNNN bash setup.sh   # rebuild on a different host port"
