# IP-SAKTI Sahayak — one-command setup (Windows / PowerShell)
# Creates the backend venv, installs all dependencies, and builds the TKDL search index.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "`n=== IP-SAKTI setup ===`n" -ForegroundColor Cyan

# --- Prerequisite checks ---
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw "Python not found. Install Python 3.11+ and re-run." }
if (-not (Get-Command npm -ErrorAction SilentlyContinue))    { throw "Node.js/npm not found. Install Node 18+ and re-run." }
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  Write-Warning "Ollama not found. Install from https://ollama.com/download, then run: ollama pull phi3"
} else {
  Write-Host "Ensuring the phi3 model is available (this may download ~2.2 GB the first time)..." -ForegroundColor Yellow
  ollama pull phi3
}

# --- Backend ---
Write-Host "`n[1/3] Backend: virtual env + dependencies" -ForegroundColor Green
Set-Location "$PSScriptRoot\backend"
if (-not (Test-Path ".venv")) { python -m venv .venv }
$py = "$PSScriptRoot\backend\.venv\Scripts\python.exe"
& $py -m pip install --upgrade pip
& $py -m pip install -r requirements.txt

# --- Corpus index ---
Write-Host "`n[2/3] Backend: building TKDL search index (ChromaDB)" -ForegroundColor Green
& $py -m scripts.ingest_corpus

# --- Frontend ---
Write-Host "`n[3/3] Frontend: npm install" -ForegroundColor Green
Set-Location "$PSScriptRoot\IP-SAKTI-frontend\frontend-koutsa"
npm install

Set-Location $PSScriptRoot
Write-Host "`n=== Setup complete ===" -ForegroundColor Cyan
Write-Host "Start the app in two terminals:"
Write-Host "  Terminal 1:  ./run-backend.ps1"
Write-Host "  Terminal 2:  ./run-frontend.ps1"
Write-Host "Then open http://localhost:3000`n"
