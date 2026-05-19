"""Probe Rubika upload endpoint with multiple request variants to find the one CDN accepts."""
import asyncio
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.config import settings  # noqa: E402


PNG_1x1 = bytes.fromhex(
    "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C489"
    "0000000D49444154789C6300010000000500010D0A2DB40000000049454E44AE426082"
)


async def request_upload_url(client: httpx.AsyncClient) -> tuple[str, str]:
    url = f"https://botapi.rubika.ir/v3/{settings.rubika_token}/requestSendFile"
    r = await client.post(url, json={"type": "Image"})
    r.raise_for_status()
    body = r.json()
    if body.get("status") != "OK":
        raise RuntimeError(f"requestSendFile failed: {body}")
    data = body["data"]
    return data["upload_url"], data.get("file_id", "")


async def attempt(name: str, send) -> None:
    print(f"\n=== {name} ===")
    try:
        resp = await send()
        body_preview = (resp.text or "")[:250].replace("\n", " ")
        print(f"status={resp.status_code}")
        print(f"headers={dict(resp.headers)}")
        print(f"body={body_preview!r}")
    except Exception as e:
        print(f"EXC: {type(e).__name__}: {e}")


async def main() -> None:
    if not settings.rubika_token:
        print("RUBIKA_TOKEN not set")
        return

    async with httpx.AsyncClient(timeout=30) as base:
        # Variant A: current (multipart field=file, httpx default UA)
        upload_url, fid = await request_upload_url(base)
        print(f"upload_url={upload_url}\nfile_id_hint={fid}")

        await attempt("A: multipart file= (httpx UA)", lambda: base.post(
            upload_url, files={"file": ("a.png", PNG_1x1, "image/png")}
        ))

        # Variant B: multipart with browser-ish UA
        upload_url, _ = await request_upload_url(base)
        async with httpx.AsyncClient(timeout=30, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "*/*",
        }) as ua_client:
            await attempt("B: multipart file= (Chrome UA)", lambda: ua_client.post(
                upload_url, files={"file": ("a.png", PNG_1x1, "image/png")}
            ))

        # Variant C: raw bytes, Content-Type image/png
        upload_url, _ = await request_upload_url(base)
        await attempt("C: raw bytes POST application/octet-stream",
                      lambda: base.post(upload_url, content=PNG_1x1,
                                        headers={"Content-Type": "application/octet-stream"}))

        # Variant D: raw bytes, Content-Type image/png
        upload_url, _ = await request_upload_url(base)
        await attempt("D: raw bytes POST image/png",
                      lambda: base.post(upload_url, content=PNG_1x1,
                                        headers={"Content-Type": "image/png"}))

        # Variant E: PUT multipart
        upload_url, _ = await request_upload_url(base)
        await attempt("E: PUT multipart", lambda: base.put(
            upload_url, files={"file": ("a.png", PNG_1x1, "image/png")}
        ))

        # Variant F: PUT raw bytes
        upload_url, _ = await request_upload_url(base)
        await attempt("F: PUT raw", lambda: base.put(
            upload_url, content=PNG_1x1, headers={"Content-Type": "image/png"}
        ))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    asyncio.run(main())
