#!/usr/bin/env bash
# IP-SAKTI Sahayak — one-command setup (macOS / Linux)
# Creates the backend venv, installs all dependencies, and builds the TKDL search index.
set -euo pipefail
cd "$(dirname "$0")"

echo ""
echo "=== IP-SAKTI setup ==="
echo ""

# --- Prerequisite checks ---
command -v python3 >/dev/null 2>&1 || { echo "Python 3 not found. Install Python 3.11+ and re-run."; exit 1; }
command -v npm >/dev/null 2>&1     || { echo "Node.js/npm not found. Install Node 18+ and re-run."; exit 1; }
if command -v ollama >/dev/null 2>&1; then
  echo "Ensuring the phi3 model is available (may download ~2.2 GB the first time)..."
  ollama pull phi3
else
  echo "WARNING: Ollama not found. Install from https://ollama.com/download, then run: ollama pull phi3"
fi

# --- Backend ---
echo ""
echo "[1/3] Backend: virtual env + dependencies"
cd backend
[ -d .venv ] || python3 -m venv .venv
./.venv/bin/python -m pip install --upgrade pip
./.venv/bin/python -m pip install -r requirements.txt

# --- Corpus index ---
echo ""
echo "[2/3] Backend: building TKDL search index (ChromaDB)"
./.venv/bin/python -m scripts.ingest_corpus
cd ..

# --- Frontend ---
echo ""
echo "[3/3] Frontend: npm install"
cd IP-SAKTI-frontend/frontend-koutsa
npm install
cd ../..

echo ""
echo "=== Setup complete ==="
echo "Start the app in two terminals:"
echo "  Terminal 1:  bash run-backend.sh"
echo "  Terminal 2:  bash run-frontend.sh"
echo "Then open http://localhost:3000"
echo ""
