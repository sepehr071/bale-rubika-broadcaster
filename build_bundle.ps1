# Build a portable Windows bundle for persian-social-bot.
# Output: dist\persian-social-bot\  (zip and ship this folder)
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

Write-Host "[build] checking uv..." -ForegroundColor Cyan
$null = Get-Command uv -ErrorAction Stop

Write-Host "[build] checking npm..." -ForegroundColor Cyan
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm not found. Install Node 20+ from https://nodejs.org."
}

Write-Host "[build] building React UI (frontend/)" -ForegroundColor Cyan
Push-Location frontend
try {
    npm ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed (exit $LASTEXITCODE)" }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed (exit $LASTEXITCODE)" }
} finally {
    Pop-Location
}

if (-not (Test-Path "app\web_dist\index.html")) {
    throw "frontend build missing — app\web_dist\index.html not found"
}

if (-not (Test-Path .venv)) {
    Write-Host "[build] no .venv -> running 'uv sync'" -ForegroundColor Cyan
    uv sync
}

Write-Host "[build] ensuring pyinstaller is installed" -ForegroundColor Cyan
uv pip install --quiet pyinstaller

Write-Host "[build] cleaning previous build/ and dist/" -ForegroundColor Cyan
Remove-Item -Recurse -Force build, dist -ErrorAction SilentlyContinue

Write-Host "[build] running pyinstaller (this can take 1-3 minutes)" -ForegroundColor Cyan
uv run pyinstaller persian-social-bot.spec --noconfirm --clean
if ($LASTEXITCODE -ne 0) {
    throw "pyinstaller failed (exit $LASTEXITCODE)"
}

$dist = Join-Path $PSScriptRoot "dist\persian-social-bot"
if (-not (Test-Path $dist)) {
    throw "expected output folder not found: $dist"
}

Write-Host "[build] copying launcher + readme into dist" -ForegroundColor Cyan
Copy-Item -Path "bundle_assets\run.bat"    -Destination $dist -Force
Copy-Item -Path "bundle_assets\README.txt" -Destination $dist -Force

New-Item -ItemType Directory -Force -Path (Join-Path $dist "data") | Out-Null

$zipPath = Join-Path $PSScriptRoot "dist\persian-social-bot.zip"
Write-Host "[build] zipping -> $zipPath" -ForegroundColor Cyan
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path $dist -DestinationPath $zipPath -CompressionLevel Optimal

$sizeMB = "{0:N1}" -f ((Get-Item $zipPath).Length / 1MB)
Write-Host ""
Write-Host "[build] done" -ForegroundColor Green
Write-Host "  folder: $dist"
Write-Host "  zip:    $zipPath  ($sizeMB MB)"
Write-Host ""
Write-Host "End user instructions:"
Write-Host "  1. unzip persian-social-bot.zip"
Write-Host "  2. double-click run.bat inside the unzipped folder"
Write-Host "  3. open the printed URL in a browser"
