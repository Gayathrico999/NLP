# Services Guide

This repository is a pnpm/Turborepo monorepo with four runnable services and MongoDB.

## Services and Ports
- Frontend (React + Vite): http://localhost:5173 (auto-bumps to 5174 if 5173 in use)
- Backend (Express + TypeScript): http://localhost:3000
- Whisper (FastAPI + faster-whisper): http://localhost:8000
- LLM (FastAPI + LangChain/Gemini/Ollama): http://localhost:5001
- MongoDB: mongodb://localhost:27017

## Prerequisites
- Node.js and pnpm installed
- Python 3.10+ available
- MongoDB running locally (or change connection string in services)
- API key for Google Gemini (GOOGLE_API_KEY)

## One-time setup (if needed)
- Ensure Python virtual envs exist:
  - LLM: poll-automation/services/pollgen-llm/llm-env
  - Whisper: poll-automation/services/whisper/whisper-env
- At repo root: `pnpm install` (Ask before running if you want me to execute.)

## Start order (recommended)
1) LLM service (port 5001)
2) Whisper service (port 8000)
3) Backend (port 3000)
4) Frontend (port 5173/5174)

## How to run each service

### LLM service (poll-automation/services/pollgen-llm)
- Provide environment variables (either in shell or .env):
  - USER_HOME=C:/Users/ADITYA/Desktop/NLP
  - GOOGLE_API_KEY=<your_key>  (for Gemini)
  - Optional (Ollama):
    - OLLAMA_HOST=http://127.0.0.1:11434
    - OLLAMA_BASE_URL=http://127.0.0.1:11434
- Start (Gemini):
  - Windows PowerShell (note single-quoted -Command to preserve $):
    `powershell -NoProfile -ExecutionPolicy Bypass -Command '$env:USER_HOME="C:/Users/ADITYA/Desktop/NLP"; $env:GOOGLE_API_KEY="<your_key>"; cd poll-automation/services/pollgen-llm; & "llm-env\Scripts\python.exe" -m uvicorn server:app --host 0.0.0.0 --port 5001 --reload'`
- Start (Ollama):
  - Windows PowerShell:
    `powershell -NoProfile -ExecutionPolicy Bypass -Command '$env:USER_HOME="C:/Users/ADITYA/Desktop/NLP"; $env:OLLAMA_HOST="http://127.0.0.1:11434"; $env:OLLAMA_BASE_URL="http://127.0.0.1:11434"; cd poll-automation/services/pollgen-llm; & "llm-env\Scripts\python.exe" -m uvicorn server:app --host 0.0.0.0 --port 5001 --reload'`
- Optional: copy `.env.example` to `.env` (UTF-8 encoding) and fill values (now includes USER_HOME, GEMINI/GOOGLE keys, and Ollama placeholders).

### Whisper service (poll-automation/services/whisper)
- Start:
  `powershell -NoProfile -ExecutionPolicy Bypass -Command 'cd poll-automation/services/whisper; & "whisper-env\Scripts\python.exe" -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload'`

### Backend (poll-automation/apps/backend)
- Start:
  `powershell -NoProfile -ExecutionPolicy Bypass -Command 'cd poll-automation; pnpm --filter @poll-automation/backend dev'`
- Expected logs: server on http://localhost:3000, connected to MongoDB, LLM WebSocket connected

### Frontend (poll-automation/apps/frontend)
- Start:
  `powershell -NoProfile -ExecutionPolicy Bypass -Command 'cd poll-automation; pnpm --filter automatic-poll-system dev'`
- Expected logs: Vite ready on 5173 (or 5174 if 5173 busy)

## Stopping services
- Press Ctrl+C in each terminal.

## Troubleshooting quick links
- See `llm-TROUBLESHOOTING.md` and `frontend-TROUBLESHOOTING.md` in repo root.



## Run all services at once (Windows)

- Use the included start-all.bat at repo root (poll-automation\start-all.bat).
- It opens 4 terminals: LLM (5001), Whisper (8000), Backend (3000), Frontend (5173/5174).
- Prerequisites: pnpm installed; Python venvs exist (llm-env, whisper-env); MongoDB running.

Commands it runs:
- LLM: uvicorn server:app --port 5001
- Whisper: uvicorn src.main:app --port 8000
- Backend: pnpm --filter @poll-automation/backend dev
- Frontend: pnpm --filter automatic-poll-system dev

Tip: To share a room, open Audio Capture at http://localhost:5174/audio-capture?meetingId=ABC-123 and click "Generate Guest Link". Guests open the link (http://localhost:5174/guest?meetingId=ABC-123&displayName=...)
