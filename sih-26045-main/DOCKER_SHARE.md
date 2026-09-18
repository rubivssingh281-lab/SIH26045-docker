# IP-SAKTI Sahayak — Docker Sharing Guide

Your Docker project is now ready to share with others via Docker Hub. Here's how to distribute and run it.

---

## Quick Start for Users

### Prerequisites
- **Docker Desktop** or Docker Engine installed
- **Git** (to clone your repository)

### Option 1: Run with Pre-built Images (Recommended)

This pulls your pre-built images from Docker Hub — no compilation needed.

```bash
# 1. Clone your repository
git clone https://github.com/<your-github>/sih-26045-main.git
cd sih-26045-main

# 2. Set up configuration
cp backend/.env.example backend/.env
# Edit backend/.env and fill in GEMINI_API_KEY and mail settings

# 3. Run with production docker-compose (pulls images, no build)
docker compose -f docker-compose.prod.yml up --pull always
```

Then open:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Ollama:** http://localhost:11434

---

### Option 2: Run with Local Build

If you want to modify the code:

```bash
git clone https://github.com/<your-github>/sih-26045-main.git
cd sih-26045-main

cp backend/.env.example backend/.env
# Edit backend/.env

docker compose up --build
```

---

## Docker Hub Images

Your pre-built images are publicly available on Docker Hub:

| Component | Image | Size |
|-----------|-------|------|
| Backend | `sakshamsinghipsakti/ip-sakti-backend:latest` | 676 MB |
| Frontend | `sakshamsinghipsakti/ip-sakti-frontend:latest` | 281 MB |

Users can also pull individual images:

```bash
docker pull sakshamsinghipsakti/ip-sakti-backend:latest
docker pull sakshamsinghipsakti/ip-sakti-frontend:latest
```

---

## Environment Configuration

Before running, users must configure `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

Key settings:
- `GEMINI_API_KEY` — required for AI features (get from Google Cloud)
- `EMAIL_ADDRESS` / `EMAIL_PASSWORD` — for OTP mail (optional; OTP prints to terminal if not set)
- `SECRET_KEY` — set a unique value for production
- `LLM_MODEL` — defaults to `gemma4:e4b`; use `phi3` for lighter loads

---

## Customizing the LLM Model

By default, the project uses `gemma4:e4b` (~9 GB). For lighter systems, switch to `phi3` (~2.2 GB):

**Linux/macOS:**
```bash
LLM_MODEL=phi3 docker compose -f docker-compose.prod.yml up
```

**Windows PowerShell:**
```powershell
$env:LLM_MODEL='phi3'
docker compose -f docker-compose.prod.yml up
```

**Windows CMD:**
```cmd
set LLM_MODEL=phi3
docker compose -f docker-compose.prod.yml up
```

---

## Sharing Your Project

### 1. GitHub Repository (Recommended)
Push your code to GitHub:

```bash
git add .
git commit -m "Initial IP-SAKTI Sahayak Docker setup"
git push origin main
```

Users clone and run:
```bash
git clone https://github.com/your-username/sih-26045-main.git
cd sih-26045-main
docker compose -f docker-compose.prod.yml up --pull always
```

### 2. Direct Docker Hub Link
Share the images directly:
```
https://hub.docker.com/r/sakshamsinghipsakti/ip-sakti-backend
https://hub.docker.com/r/sakshamsinghipsakti/ip-sakti-frontend
```

### 3. Docker Compose File
Share just the `docker-compose.prod.yml`:

Users download it and run:
```bash
docker compose -f docker-compose.prod.yml up --pull always
```

---

## Troubleshooting for Users

### "Port 3000 already in use"
Change the frontend port in docker-compose:
```yaml
frontend:
  ports:
    - "3001:3000"  # Use 3001 instead of 3000
```

### "Port 8000 already in use"
Change the backend port:
```yaml
backend:
  ports:
    - "8001:8000"  # Use 8001 instead of 8000
```

Then update `NEXT_PUBLIC_API_BASE_URL`:
```yaml
frontend:
  environment:
    NEXT_PUBLIC_API_BASE_URL: "http://localhost:8001"
```

### Ollama model download fails
Ensure Ollama is running and has enough disk space. Check:
```bash
docker logs ipsakti-ollama-pull
```

### Backend fails to connect to Ollama
Wait a few seconds — Ollama takes time to start. Check:
```bash
docker logs ipsakti-backend
```

### High memory usage
Reduce the LLM context window in `backend/.env`:
```
LLM_NUM_CTX=2048
```

Or use a lighter model:
```bash
LLM_MODEL=phi3 docker compose -f docker-compose.prod.yml up
```

---

## Updating Images

When you push new versions of your backend or frontend:

1. **Rebuild locally:**
   ```bash
   docker build -t sakshamsinghipsakti/ip-sakti-backend:latest ./backend
   docker build -t sakshamsinghipsakti/ip-sakti-frontend:latest ./IP-SAKTI-frontend/frontend-koutsa
   ```

2. **Push to Docker Hub:**
   ```bash
   docker push sakshamsinghipsakti/ip-sakti-backend:latest
   docker push sakshamsinghipsakti/ip-sakti-frontend:latest
   ```

3. **Users get the latest by pulling:**
   ```bash
   docker compose -f docker-compose.prod.yml up --pull always
   ```

---

## Next Steps

- **Version your images:** Tag releases with version numbers (e.g., `v1.0`, `v1.1`)
- **Set up CI/CD:** Auto-push images on GitHub commits (GitHub Actions)
- **Add healthchecks:** Ensure containers restart on failure
- **Document API:** Share OpenAPI/Swagger docs for backend integration
- **Create issues tracker:** Guide users to report bugs

---

## Questions?

For support, refer to:
- **README.md** — main project documentation
- **DOCKER.md** — Docker-specific notes
- **Docker Hub:** https://hub.docker.com/r/sakshamsinghipsakti
