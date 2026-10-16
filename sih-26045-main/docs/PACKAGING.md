# Packaging this project into a shareable ZIP

Everything needed to run is already in this folder. To make a clean, reasonably-sized
ZIP that the recipient can run with only the commands in `README.md`, **exclude the
rebuildable and platform-specific folders below before zipping** (they are recreated by
`setup.ps1` / `setup.sh` on the recipient's machine):

```
backend/.venv/                                   # Python venv (platform-specific)
IP-SAKTI-frontend/frontend-koutsa/node_modules/  # npm packages (platform-specific, large)
IP-SAKTI-frontend/frontend-koutsa/.next/         # Next.js build cache
**/__pycache__/  **/.pytest_cache/               # Python caches
backend/app.db                                   # dev database (auto-created on first run)
```

**Keep** `backend/chroma_db/` — it's the pre-built TKDL search index (small, ~350 KB) so
the app works without re-running ingestion.

### Optional: shrink `ml_models/` (large, offline-only)
`ml_models/` is the offline ML/reference pipeline and is **not required at runtime**, except
`ml_models/data/IP_SAKTI_FINAL_DATASET/retrieval_stage16/` (needed only if the recipient has
to rebuild the search index). The large `*_predictions.csv` and `*_risk_*.csv` files (hundreds
of MB total) can be deleted to shrink the ZIP dramatically. To keep only what runtime needs,
you may ship just `ml_models/data/IP_SAKTI_FINAL_DATASET/retrieval_stage16/` and drop the rest.

### Quick exclude commands

**Windows (PowerShell)** — copy to a clean folder, then zip that folder:
```powershell
$dst = "..\ip-sakti-share"
robocopy . $dst /E /XD .venv node_modules .next __pycache__ .pytest_cache .git /XF app.db
Compress-Archive -Path $dst\* -DestinationPath ..\ip-sakti-share.zip
```

**macOS / Linux:**
```bash
zip -r ../ip-sakti-share.zip . \
  -x '*/.venv/*' -x '*/node_modules/*' -x '*/.next/*' \
  -x '*/__pycache__/*' -x '*/.pytest_cache/*' -x 'backend/app.db' -x '*/.git/*'
```

The recipient then runs `setup.ps1` / `setup.sh` and the two `run-*` scripts — see `README.md`.
