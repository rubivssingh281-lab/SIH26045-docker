# Running IP-SAKTI Sahayak with Docker

One command brings up the whole stack — frontend, backend, and a local Ollama LLM —
so other teams can run it without installing Python, Node, or Ollama themselves.

## Prerequisites
- Docker Desktop (or Docker Engine + Compose v2)
- `backend/.env` must exist. If it's missing:
  `cp backend/.env.example backend/.env` and fill in `GEMINI_API_KEY` (+ mail settings).

## Start
```bash
docker compose up --build
```
Then open:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Ollama:** http://localhost:11434

To stop: `Ctrl+C`, then `docker compose down` (add `-v` to also delete the pulled model).

## Services
| Service | What it does | Port |
|---|---|---|
| `frontend` | Next.js UI (dev server) | 3000 |
| `backend` | FastAPI + RAG; includes the pre-built TKDL index | 8000 |
| `ollama` | Local LLM runtime | 11434 |
| `ollama-pull` | One-shot: downloads the model on first run, then exits | — |

## The LLM model
`ollama-pull` downloads `gemma4:e4b` (~9 GB) on first run into a persistent volume
(`ollama-models`), so later starts are instant. Use a lighter model instead:

```bash
# Linux / macOS
LLM_MODEL=phi3 docker compose up --build
# Windows (cmd)
set LLM_MODEL=phi3&& docker compose up --build
```

The app runs even before the model finishes downloading — it falls back to
deterministic, evidence-based answers and starts using the LLM once it's ready.

## Notes
- **CPU-only** by default (no GPU needed). The backend image installs the CPU build
  of PyTorch to stay lean.
- Translation uses the **Gemini API** (key from `backend/.env`); answers use the
  **local Ollama** model.
- The frontend calls the backend from the browser, so it uses `http://localhost:8000`
  (already set via `NEXT_PUBLIC_API_BASE_URL`).
- First `up` is slow (image builds + model download, ~10–30 min depending on network);
  subsequent starts are fast.

## ⚠️ Secrets
`backend/.env` holds live credentials (Gemini key, Gmail app password). Keep it out of
public images/registries — it is passed to the backend container at runtime via
`env_file`, not baked into the image (see `backend/.dockerignore`).
