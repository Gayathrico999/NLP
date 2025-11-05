---
description: Repository Information Overview
alwaysApply: true
---

# Poll Automation Monorepo - Status Report

## Summary
Production-ready Turborepo monorepo with 5 microservices:
- **Frontend** (React 18 + Vite + Tailwind) - ? Running on Port 5174
- **Backend** (Express.js TypeScript) - ? Running on Port 3001
- **Whisper Service** (FastAPI + Faster-Whisper) - Port 8000 (installing dependencies)
- **LLM Service** (FastAPI + LangChain) - Port 5001 (missing packages)
- **MongoDB** - ? Running on Port 27017

## Repository Structure
- **apps/backend** - Express.js TypeScript backend (PORT: 3001)
- **apps/frontend** - React 18 + Vite + Tailwind (PORT: 5174)
- **services/whisper** - FastAPI transcription service (PORT: 8000)
- **services/pollgen-llm** - FastAPI LLM service (PORT: 5001)
- **shared/** - TypeScript utilities and types

## Installed Versions
- Node.js: v24.11.0
- npm: 11.6.1
- pnpm: 10.20.0 (at C:\Users\ADITYA\AppData\Roaming\npm)
- Python: 3.14.0
- MongoDB: System service (running)

## Node.js Services (Frontend/Backend)
**Package Manager**: pnpm v10.20.0
**Configuration**: pnpm-workspace.yaml, turbo.json

**Frontend** (apps/frontend):
- Framework: React 18 + Vite 5.4.19
- CSS: Tailwind CSS
- Dev: pnpm dev ? http://localhost:5173 (or 5174)

**Backend** (apps/backend):
- Framework: Express 5.1
- Language: TypeScript (ts-node-dev)
- Dev: pnpm dev (use BACKEND_HTTP_PORT=3001)
- Connects to MongoDB at localhost:27017

## Python Services

### Whisper Service (services/whisper)
- **Venv**: whisper-env
- **Port**: 8000
- **Status**: Installing faster_whisper
- **Installed**: uvicorn, fastapi, pydantic, websockets, python-dotenv
- **Missing**: faster_whisper (in progress)
- **Main**: src/main.py
- **Start**: whisper-env\Scripts\python.exe -m uvicorn src.main:app --host 0.0.0.0 --port 8000

### LLM Service (services/pollgen-llm)
- **Venv**: llm-env
- **Port**: 5001
- **Status**: Missing langchain_ollama and dependencies
- **Missing**: langchain_ollama, google-generativeai, pymongo
- **Main**: main.py
- **Start**: llm-env\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 5001

## Launch Scripts
- **FINAL-WORKING-START.ps1** - Master launcher for all 5 services
- **RUN-WHISPER-FIXED.ps1**, **RUN-LLM-FIXED.ps1**, **RUN-BACKEND-FIXED.ps1**, **RUN-FRONTEND-FIXED.ps1** - Individual service launchers

## Critical Fixes Required
1. Whisper: Install faster_whisper in whisper-env
2. LLM: Install langchain_ollama, google-generativeai, pymongo in llm-env

## Environment Configuration
- **Frontend**: Use default ports (5173/5174)
- **Backend**: Set BACKEND_HTTP_PORT=3001 to avoid conflicts
- **MongoDB**: mongodb://localhost:27017/

## Working Services
- ? Frontend on 5174
- ? Backend on 3001
- ? MongoDB on 27017
- ? Whisper (awaiting faster_whisper)
- ? LLM (awaiting langchain packages)
