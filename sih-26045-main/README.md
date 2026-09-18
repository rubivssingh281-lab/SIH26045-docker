# IP-SAKTI Sahayak

An evidence-grounded decision-support system for **Ayurvedic / traditional-knowledge intellectual-property research**. It classifies formulations with a deterministic rule engine, retrieves supporting TKDL prior art (RAG), scores multi-dimensional confidence, and explains every step — all running **fully offline on a local LLM (phi3 via Ollama)**.

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind — `IP-SAKTI-frontend/frontend-koutsa/`
- **Backend:** FastAPI + SQLite + ChromaDB — `backend/`
- **LLM:** local **phi3** through **Ollama** (no API keys, no cloud)
- **RAG corpus:** 694 TKDL formulations, `all-MiniLM-L6-v2` embeddings, hybrid BM25 + vector retrieval
- **ML pipeline (offline, reference only):** `ml_models/`

---

## 1. Prerequisites

Install these once:

| Tool | Version | Notes |
|------|---------|-------|
| **Python** | 3.11 or 3.12 | `python --version` |
| **Node.js** | 18+ (20+ recommended) | includes `npm`; `node --version` |
| **Ollama** | latest | https://ollama.com/download — powers the local LLM |

Then pull the model (~2.2 GB, one time):

```bash
ollama pull phi3
```

Make sure Ollama is running (`ollama serve` — the desktop app starts it automatically).

> **RAM note:** phi3 defaults to a 128k context. On machines with ≤8 GB RAM the backend caps the context window (`LLM_NUM_CTX=4096`) so it fits. No action needed; just know phi3 on CPU takes ~20–40s per call.

---

## 2. One-command setup

From the project root (`sih-26045-main/`):

**Windows (PowerShell):**
```powershell
./setup.ps1
```

**macOS / Linux (bash):**
```bash
bash setup.sh
```

This creates the backend virtual environment, installs Python + Node dependencies, and builds the local TKDL search index (ChromaDB). See [Manual setup](#5-manual-setup) if you prefer to run the steps yourself.

---

## 3. Run it

Open **two terminals** from the project root.

**Terminal 1 — backend (http://localhost:8000):**
```bash
# Windows:  ./run-backend.ps1
# macOS/Linux:  bash run-backend.sh
```

**Terminal 2 — frontend (http://localhost:3000):**
```bash
# Windows:  ./run-frontend.ps1
# macOS/Linux:  bash run-frontend.sh
```

Then open **http://localhost:3000** and register an account.

> **OTP without email:** email sending is optional. When you register, the 6-digit OTP is also **printed in the backend terminal** (`[IP-SAKTI] Signup OTP for ... : 123456`) — copy it from there to verify.

---

## 4. Try it (demo flow)

1. **Register** → copy the OTP from the backend terminal → **verify**.
2. **Dashboard** → **Formulation Classifier** (or any tool).
3. Fill the intake form → **Continue to Fact Review**.
4. The local LLM extracts facts (~30s) → review/edit → **Confirm facts & continue**.
5. **Run analysis** → see the classification, TKDL evidence, and confidence bands.
6. **Explainability**, **Report**, **History**, and the floating **Sahayak AI** chat all work against the local model.

---

## 5. Manual setup

### Backend
```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python -m scripts.ingest_corpus        # builds the TKDL ChromaDB index
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd IP-SAKTI-frontend/frontend-koutsa
npm install
npm run dev
```

The frontend reads `NEXT_PUBLIC_API_BASE_URL` from `.env.local` (defaults to `http://localhost:8000`).

---

## 6. Configuration

Backend settings live in `backend/app/config.py` and can be overridden with environment variables or a `backend/.env` file (copy `backend/.env.example`). Key ones:

| Variable | Default | Purpose |
|----------|---------|---------|
| `LLM_PROVIDER` | `ollama` | `ollama` (local) or `openai` |
| `LLM_MODEL` | `phi3` | Ollama model/tag |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama endpoint |
| `LLM_NUM_CTX` | `4096` | phi3 context cap (raise if you have RAM) |
| `SECRET_KEY` | dev default | **set a real value for any shared deployment** |

To use OpenAI instead of local phi3: `LLM_PROVIDER=openai`, `LLM_MODEL=gpt-4o-mini`, `OPENAI_API_KEY=sk-...`.

The frontend API timeout is generous (`NEXT_PUBLIC_API_TIMEOUT_MS`, default 300000) because the local LLM is slow on CPU.

---

## 7. Tests

```bash
cd backend
.venv/Scripts/python -m pytest tests/ -q      # Windows path shown; use .venv/bin/python elsewhere
```

Frontend type-check:
```bash
cd IP-SAKTI-frontend/frontend-koutsa
npx tsc --noEmit
```

---

## 8. Troubleshooting

- **"Ollama request failed" / chat returns a fallback message** → ensure `ollama serve` is running and `ollama pull phi3` completed. `ollama list` should show `phi3`.
- **"model requires more system memory"** → lower `LLM_NUM_CTX` (e.g. 2048) in `backend/.env`.
- **Fact extraction / analysis seems stuck** → it's phi3 on CPU (~30s). The client waits up to 5 minutes.
- **Port already in use** → change `--port` for the backend and update `NEXT_PUBLIC_API_BASE_URL` in `frontend-koutsa/.env.local`.
- **Search index empty (no prior-art evidence)** → re-run `python -m scripts.ingest_corpus` from `backend/` (needs `ml_models/data/IP_SAKTI_FINAL_DATASET/retrieval_stage16/`).

---

## 9. What's in the box

```
sih-26045-main/
├── backend/            FastAPI app, rule engine, RAG, pipeline, tests
│   ├── app/            application code
│   ├── scripts/        corpus ingestion
│   ├── chroma_db/      pre-built TKDL vector index (694 records)
│   └── requirements.txt
├── IP-SAKTI-frontend/frontend-koutsa/   Next.js app
├── ml_models/          offline ML pipeline + datasets (reference)
├── setup.ps1 / setup.sh
├── run-backend.ps1 / run-backend.sh
├── run-frontend.ps1 / run-frontend.sh
└── README.md (this file)
```

> **This is a prototype**, not legal advice. See `IP-SAKTI-Sahayak-final-spec-v4.md` and `PROJECT_ARCHITECTURE.md` for the full design.
