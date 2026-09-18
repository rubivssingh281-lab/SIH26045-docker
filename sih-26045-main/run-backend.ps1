# Start the IP-SAKTI backend (Windows / PowerShell)
$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\backend"
$py = "$PSScriptRoot\backend\.venv\Scripts\python.exe"
if (-not (Test-Path $py)) { throw "Backend not set up. Run ./setup.ps1 first." }
Write-Host "Backend running at http://localhost:8000 (Ctrl+C to stop)" -ForegroundColor Cyan
& $py -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
