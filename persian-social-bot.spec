# PyInstaller spec for persian-social-bot. Build via build_bundle.ps1.
# -*- mode: python ; coding: utf-8 -*-

from PyInstaller.utils.hooks import collect_submodules

uvicorn_hidden = collect_submodules("uvicorn")

hidden = list(set(uvicorn_hidden + [
    "h11",
    "httptools",
    "websockets",
    "websockets.legacy",
    "websockets.legacy.server",
    "wsproto",
    "anyio",
    "anyio._backends._asyncio",
    "sniffio",
    "email.mime.multipart",
    "email.mime.text",
    "multipart",
    "python_multipart",
    "sse_starlette",
    "starlette.middleware",
    "starlette.routing",
]))


a = Analysis(
    ["bundle_launcher.py"],
    pathex=[],
    binaries=[],
    datas=[
        ("app/web_dist", "app/web_dist"),
    ],
    hiddenimports=hidden,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter", "test", "unittest"],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="persian-social-bot",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name="persian-social-bot",
)
