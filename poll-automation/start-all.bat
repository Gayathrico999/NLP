@echo off
setlocal ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION
cd /d "%~dp0"

echo Starting all poll-automation services in separate windows...

echo.
start "LLM Service (5001)" powershell -NoProfile -ExecutionPolicy Bypass -Command "cd services/pollgen-llm; & '.\llm-env\Scripts\python.exe' -m uvicorn server:app --host 0.0.0.0 --port 5001 --reload"

echo.
start "Whisper Service (8000)" powershell -NoProfile -ExecutionPolicy Bypass -Command "cd services/whisper; & '.\whisper-env\Scripts\python.exe' -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload"

echo.
start "Backend (3000)" powershell -NoProfile -ExecutionPolicy Bypass -Command "cd .; pnpm --filter @poll-automation/backend dev"

echo.
start "Frontend (5173/5174)" powershell -NoProfile -ExecutionPolicy Bypass -Command "cd .; pnpm --filter automatic-poll-system dev"

echo.
echo All services started. URLs:
echo   Frontend: http://localhost:5174
echo   Backend:  http://localhost:3000
echo   Whisper:  http://localhost:8000
echo   LLM:      http://localhost:5001

echo.
echo Tip: Use Audio Capture at http://localhost:5174/audio-capture?meetingId=ABC-123 then share the Guest link.

echo Done.
endlocal

