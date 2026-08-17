@echo off
echo ========================================
echo  Namvinscom Fantasy 2026/27 — Startup Script
echo ========================================
echo.

echo [1/2] Starting Backend (FastAPI)...
start "Namvinscom Backend" cmd /k "cd /d "%~dp0backend" && .\venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend (Next.js)...
start "Namvinscom Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"


echo.
echo Both servers starting in separate windows.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo   API Docs: http://localhost:8000/docs
echo.
pause
