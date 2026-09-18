# README-DOCKER — Agent Runbook to Initialize IP-SAKTI Sahayak on Docker

> **Who this is for:** an AI agent (or a person) setting up this project on a machine
> where **Docker Desktop was just installed**. Follow the steps **in order**. Each step
> has the exact command, the **expected result**, and **what to do if it fails**.
> Goal: go from zero → the full app running, **without trouble**.

**When you finish, these will work:**
- Frontend (the app): http://localhost:3000
- Backend API: http://localhost:8000
- Local AI (Ollama): http://localhost:11434

---

## 0. What you are deploying (context for the agent)
IP-SAKTI Sahayak is a 3-service app orchestrated by Docker Compose:
| Service | What it is | Port |
|---|---|---|
| `frontend` | Next.js UI | 3000 |
| `backend` | FastAPI + RAG (ships with the pre-built TKDL index) | 8000 |
| `ollama` | Local LLM runtime | 11434 |
| `ollama-pull` | One-shot helper that downloads the model, then exits | — |

There are **two** compose files:
- **`docker-compose.yml`** — **self-contained** (runs Ollama in a container, auto-pulls the model). **Use this on a fresh machine** — this is the default for your friend.
- `docker-compose.local.yml` — only for a machine that *already* has Ollama installed (reuses host models). **Do not use this on a fresh install.**

---

## 1. Preflight checks (do ALL of these before building)

### 1.1 Confirm Docker Desktop is actually RUNNING (not just installed)
Installing Docker is not enough — the engine must be started. On Windows/Mac, **open the Docker Desktop app once** and wait until it says "Engine running".

```bash
docker version
```
- **Expected:** both a `Client:` and a `Server:` section print.
- **If it fails** with "cannot connect to the Docker daemon" / "engine stopped": open the **Docker Desktop** application, wait ~30–60 s until the whale icon is steady/green, then retry. On Windows, also ensure **WSL 2** is enabled if Docker prompts for it.

```bash
docker compose version
```
- **Expected:** a version like `Docker Compose version v2.x`.
- **If `compose` is not found:** update Docker Desktop (Compose v2 is built in). Do **not** use the old `docker-compose` (hyphen) binary.

### 1.2 Be in the correct project folder
Run every command from the folder that **contains `docker-compose.yml`** (the project root).

```bash
# from the project root:
ls docker-compose.yml backend/Dockerfile "IP-SAKTI-frontend/frontend-koutsa/Dockerfile"
```
- **Expected:** all three paths exist.
- **If not found:** `cd` into the unzipped project folder first (the one with `backend/` and `IP-SAKTI-frontend/` inside).

### 1.3 Ensure the backend environment file exists
The backend reads secrets (Gemini key, mail, model name) from `backend/.env`.

```bash
ls backend/.env
```
- **Expected:** the file exists → skip to Step 2.
- **If missing:** create it from the template and fill in the key:
  ```bash
  cp backend/.env.example backend/.env      # Windows PowerShell: copy backend\.env.example backend\.env
  ```
  Then open `backend/.env` and set at least:
  ```
  GEMINI_API_KEY=<paste the project's Gemini API key>
  LLM_MODEL=gemma4:e4b
  OLLAMA_BASE_URL=http://ollama:11434
  ```
  > The app still runs without a valid Gemini key (translation just won't work) and
  > without the model (it falls back to deterministic answers) — but set them for the full experience.

### 1.4 Make sure the ports are free
Ports **3000, 8000, 11434** must not be in use.
- Windows (PowerShell): `Get-NetTCPConnection -State Listen -LocalPort 3000,8000,11434 -ErrorAction SilentlyContinue`
- Mac/Linux: `lsof -i :3000 -i :8000 -i :11434`
- **If a port is busy:** stop whatever uses it. Common case: a **native Ollama** already using 11434 — either quit it, or use `docker-compose.local.yml` instead (see Step 7).

---

## 2. Initialize (build + start everything) — the one command
```bash
docker compose up -d --build
```
- `--build` builds the images the first time; `-d` runs in the background.
- **Expected:** it downloads base images, builds `backend` and `frontend`, then prints `Started` for the containers.
- **This first run is slow:** ~10–20 minutes for the image builds, **plus** a one-time model download (see Step 3). Be patient; do not cancel.

**Optional — lighter/faster model** (recommended if the machine has limited RAM or slow internet): use `phi3` (~2 GB) instead of `gemma4:e4b` (~9 GB):
- Mac/Linux: `LLM_MODEL=phi3 docker compose up -d --build`
- Windows (PowerShell): `$env:LLM_MODEL="phi3"; docker compose up -d --build`
- Windows (cmd): `set LLM_MODEL=phi3&& docker compose up -d --build`

---

## 3. Wait for the model to download (first run only)
The `ollama-pull` container downloads the model into a persistent volume, then exits.

```bash
docker compose logs -f ollama-pull
```
- **Expected:** you see "pulling ... " progress, then **"Model ready."**, then this container stops (that is normal — its job is done).
- **The app is usable before this finishes** — it will just give deterministic answers until the model is ready, then AI-phrased answers start working.
- **If the pull errors** (network hiccup): re-run only that step: `docker compose up -d ollama-pull` (it resumes/retries).

---

## 4. Verify it works
Give the containers ~20–30 seconds after Step 2, then:

```bash
docker compose ps
```
- **Expected:** `frontend` and `backend` show **Up**; `ollama` shows **Up**; `ollama-pull` may show **Exited (0)** (normal).

Check each endpoint:
```bash
curl http://localhost:8000/
```
- **Expected:** `{"message":"SIH 2026 Patent Formulation API is running"}`

```bash
curl http://localhost:8000/graph
```
- **Expected:** JSON with many `nodes` and `edges` (the knowledge graph).

Open the app in a browser: **http://localhost:3000**
- **Expected:** the IP-SAKTI Sahayak sign-in / landing page loads.

> Note: the **first** AI answer (Deep Research / Jurisdiction Diff) takes ~30 s while the
> model loads into memory the first time; later answers are fast.

**If the frontend doesn't load yet:** it may still be compiling. Check `docker compose logs -f frontend` and wait for `Ready in ...`. Retry the browser.

---

## 5. Everyday commands (after the first setup)
```bash
docker compose up -d            # start again (no rebuild — fast)
docker compose stop             # stop the containers (keeps them)
docker compose down             # stop and remove containers (keeps the model volume)
docker compose logs -f backend  # watch backend logs
docker compose logs -f frontend # watch frontend logs
docker compose up -d --build    # rebuild after code changes
```
- To also delete the downloaded model volume: `docker compose down -v` (next start re-pulls the model).

---

## 6. Troubleshooting (first-time issues → fixes)
| Symptom | Cause | Fix |
|---|---|---|
| `cannot connect to the Docker daemon` | Docker Desktop not started | Open Docker Desktop, wait for "Engine running", retry |
| `port is already allocated` | 3000/8000/11434 in use | Free the port, or stop native Ollama (see Step 7) |
| Build fails on `pip install` / network timeout | flaky network | Re-run `docker compose up -d --build` (it resumes cached layers) |
| Frontend 500 / blank | still compiling | `docker compose logs -f frontend`; wait for "Ready", refresh |
| Answers say "AI explanation unavailable" | model not pulled yet | Wait for Step 3 to finish, or `docker compose up -d ollama-pull` |
| `env file backend/.env not found` | missing env file | Do Step 1.3 |
| Very slow / high RAM | `gemma4:e4b` too heavy | Rebuild with `LLM_MODEL=phi3` (Step 2) |
| Everything "Up" but browser refused | wrong URL | Use `http://localhost:3000` (not https, not the container name) |

To read the last errors quickly:
```bash
docker compose logs --tail=50 backend
docker compose logs --tail=50 frontend
```

---

## 7. Special case — machine that ALREADY has Ollama
If port 11434 is taken by a **native** Ollama the friend installed, use the local compose,
which reuses the host's Ollama and skips the container download:
```bash
docker compose -f docker-compose.local.yml up -d --build
```
Then verify with the same checks in Step 4. (Fresh machines should ignore this section.)

---

## 8. Security notes (do not skip)
- `backend/.env` holds **live secrets** (Gemini API key, mail app password). Never commit it,
  never paste it into logs or screenshots, and keep the shared folder private.
- Secrets are passed to the container at runtime via `env_file`; they are **not** baked into the
  image (`backend/.dockerignore` excludes `.env`).
- The app is for local/dev use here; do not expose these ports to the public internet as-is.

---

## 9. Agent quick-checklist (execute top to bottom)
1. `docker version` → Server present? (else start Docker Desktop)
2. In the folder with `docker-compose.yml`? (else `cd`)
3. `backend/.env` exists? (else copy from `.env.example` + add `GEMINI_API_KEY`)
4. Ports 3000/8000/11434 free? (else free them or use `docker-compose.local.yml`)
5. `docker compose up -d --build` (use `LLM_MODEL=phi3` if low resources)
6. `docker compose logs -f ollama-pull` → wait for "Model ready."
7. `curl http://localhost:8000/` → API message; open http://localhost:3000
8. Report success + the three URLs. On any failure, read `docker compose logs --tail=50 <service>` and apply Section 6.

**Definition of done:** `docker compose ps` shows `frontend` + `backend` + `ollama` **Up**, `http://localhost:8000/` returns the API message, and `http://localhost:3000` loads the app.

---

## 10. Development mode — live code editing (hot-reload)
Use this when a developer wants to **edit the code and see changes instantly** in the
running containers — no image rebuild per change. It layers `docker-compose.dev.yml`
on top of the base file (bind-mounts the source + enables auto-reload).

**Start in dev mode (note both `-f` flags, in this order):**
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```
Now:
- Edit anything under **`backend/`** → the FastAPI server auto-restarts (uvicorn `--reload`).
- Edit anything under **`IP-SAKTI-frontend/frontend-koutsa/`** → the Next.js dev server hot-reloads in the browser.
- No `docker compose build` needed for source edits. (Rebuild only if you change
  `requirements.txt` or `package.json` — dependencies live inside the image.)

**How it works / what to know:**
- The dev overlay bind-mounts your host source into the containers, so your saved files
  *are* the files the app runs.
- `node_modules` and `.next` are kept **inside** the container (anonymous volumes), so your
  host OS never clobbers them — you do **not** need Node or Python installed on the host.
- Polling is enabled (`WATCHFILES_FORCE_POLLING`, `WATCHPACK_POLLING`) so file-change
  detection works reliably through Docker Desktop on Windows/macOS.

**Important:** this lets each developer edit **their own local copy** with live reload — it is
not remote access to someone else's machine. To collaborate, everyone first needs the code
(via the shared zip or a Git repo), then runs the command above. Push changes back with Git
so teammates stay in sync.

**Stop dev mode:**
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```
