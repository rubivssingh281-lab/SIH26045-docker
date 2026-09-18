#!/bin/bash
# IP-SAKTI Sahayak — Quick Start for Linux/macOS

set -e

echo "=== IP-SAKTI Sahayak Docker Setup ==="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi

echo "✅ Docker found"

# Setup env
if [ ! -f backend/.env ]; then
    echo ""
    echo "⚠️  backend/.env not found. Copying from .env.example..."
    if [ -f backend/.env.example ]; then
        cp backend/.env.example backend/.env
        echo "✅ Created backend/.env"
        echo "⚠️  EDIT backend/.env and fill in GEMINI_API_KEY and mail settings"
        echo ""
        read -p "Press Enter to continue (or Ctrl+C to exit and edit)..."
    else
        echo "❌ backend/.env.example not found"
        exit 1
    fi
fi

echo ""
echo "🚀 Starting IP-SAKTI Sahayak..."
echo ""
echo "Frontend : http://localhost:3000"
echo "Backend  : http://localhost:8000"
echo "Ollama   : http://localhost:11434"
echo ""

docker compose -f docker-compose.prod.yml up --pull always
