@echo off
REM IP-SAKTI Sahayak — Quick Start for Windows

echo === IP-SAKTI Sahayak Docker Setup ===
echo.

REM Check Docker
docker --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo X Docker not found. Install Docker Desktop from https://www.docker.com/products/docker-desktop
    exit /b 1
)

echo OK Docker found
echo.

REM Setup env
if not exist backend\.env (
    echo WARNING backend\.env not found. Copying from .env.example...
    if exist backend\.env.example (
        copy backend\.env.example backend\.env
        echo OK Created backend\.env
        echo WARNING EDIT backend\.env and fill in GEMINI_API_KEY and mail settings
        echo.
        pause
    ) else (
        echo X backend\.env.example not found
        exit /b 1
    )
)

echo.
echo Starting IP-SAKTI Sahayak...
echo.
echo Frontend : http://localhost:3000
echo Backend  : http://localhost:8000
echo Ollama   : http://localhost:11434
echo.

docker compose -f docker-compose.prod.yml up --pull always
