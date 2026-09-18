# Start the IP-SAKTI frontend (Windows / PowerShell)
$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\IP-SAKTI-frontend\frontend-koutsa"
if (-not (Test-Path "node_modules")) { throw "Frontend not set up. Run ./setup.ps1 first (or 'npm install' here)." }
Write-Host "Frontend running at http://localhost:3000 (Ctrl+C to stop)" -ForegroundColor Cyan
npm run dev
