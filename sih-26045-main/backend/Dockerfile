# IP-SAKTI Sahayak — backend (FastAPI + RAG). CPU-only.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# build-essential covers native wheels (e.g. hnswlib used by chromadb)
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential \
 && rm -rf /var/lib/apt/lists/*

# Install the CPU build of torch first so sentence-transformers does NOT pull the
# multi-GB CUDA build. Keeps the image lean and GPU-free.
RUN pip install --upgrade pip \
 && pip install torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt requirements-translation.txt ./
RUN pip install -r requirements.txt -r requirements-translation.txt

# App code + the pre-built TKDL index (backend/chroma_db) + rule/graph JSONs.
COPY . .

EXPOSE 8000

# Listen on dynamic PORT passed by Render/Cloud Run, or default to 8000 locally
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
