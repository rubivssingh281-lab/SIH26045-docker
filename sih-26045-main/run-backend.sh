#!/usr/bin/env bash
# Start the IP-SAKTI backend (macOS / Linux)
set -euo pipefail
cd "$(dirname "$0")/backend"
if [ ! -x ".venv/bin/python" ]; then echo "Backend not set up. Run: bash setup.sh"; exit 1; fi
echo "Backend running at http://localhost:8000 (Ctrl+C to stop)"
exec ./.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
