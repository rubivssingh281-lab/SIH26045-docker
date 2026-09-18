#!/usr/bin/env bash
# Start the IP-SAKTI frontend (macOS / Linux)
set -euo pipefail
cd "$(dirname "$0")/IP-SAKTI-frontend/frontend-koutsa"
if [ ! -d "node_modules" ]; then echo "Frontend not set up. Run: bash setup.sh (or 'npm install' here)"; exit 1; fi
echo "Frontend running at http://localhost:3000 (Ctrl+C to stop)"
exec npm run dev
