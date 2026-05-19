# First-time Docker setup for the Persian Social Bot panel.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\setup.ps1
# or, if execution policy already allows scripts:
#   .\setup.ps1
#
# After this completes once, manage the container from Docker Desktop:
#   - Container name: persian-social-bot
#   - Status: should be "Running" (restart policy: unless-stopped)
#   - Start / Stop / Logs from the Containers tab
# A reboot of Windows will auto-start the container once Docker Desktop is running.

$ErrorActionPreference = "Stop"

function Test-PortFree {
    param([int]$Port)
    $listener = $null
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
        $listener.Start()
        return $true
    } catch {
        return $false
    } finally {
        if ($listener) { $listener.Stop() }
    }
}

function Find-FreePort {
    param([int]$Start = 8000, [int]$MaxTries = 50)
    for ($i = 0; $i -lt $MaxTries; $i++) {
        $candidate = $Start + $i
        if (Test-PortFree -Port $candidate) { return $candidate }
    }
    throw "No free port in range $Start..$($Start + $MaxTries - 1) on 127.0.0.1"
}

Write-Host "[setup] checking Docker..." -ForegroundColor Cyan
try {
    docker version --format '{{.Server.Version}}' | Out-Null
} catch {
    Write-Host "[setup] Docker not reachable. Start Docker Desktop and rerun." -ForegroundColor Red
    exit 1
}

$requested = if ($env:HOST_PORT) { [int]$env:HOST_PORT } else { 8000 }
if (Test-PortFree -Port $requested) {
    $port = $requested
} else {
    Write-Host "[setup] port $requested busy on 127.0.0.1, scanning for next free port..." -ForegroundColor Yellow
    $port = Find-FreePort -Start ($requested + 1)
}

$env:HOST_PORT = "$port"
Write-Host "[setup] HOST_PORT=$port" -ForegroundColor Cyan
Write-Host "[setup] building image and starting container (this may take a minute on first run)..." -ForegroundColor Cyan

docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[setup] docker compose failed (exit $LASTEXITCODE)" -ForegroundColor Red
    exit $LASTEXITCODE
}

$url = "http://127.0.0.1:$port"
Write-Host ""
Write-Host "[setup] panel ready: $url" -ForegroundColor Green
Write-Host "[setup] open it in your browser and complete the token setup wizard." -ForegroundColor Green
Write-Host ""
Write-Host "From now on, manage the container in Docker Desktop:" -ForegroundColor Cyan
Write-Host "  - Containers tab -> 'persian-social-bot' -> Start / Stop / Logs"
Write-Host "  - It will auto-start whenever Docker Desktop is running (restart: unless-stopped)."
Write-Host "  - To change the host port later, rerun this script with `$env:HOST_PORT = 'NNNN'`."
