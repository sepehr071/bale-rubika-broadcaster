import socket


def is_port_free(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind((host, port))
        except OSError:
            return False
    return True


def find_free_port(host: str = "127.0.0.1", start: int = 8000, max_tries: int = 50) -> int:
    for offset in range(max_tries):
        candidate = start + offset
        if is_port_free(host, candidate):
            return candidate
    raise RuntimeError(f"no free port in range {start}..{start + max_tries - 1} on {host}")
