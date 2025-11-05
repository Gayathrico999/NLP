# POLL AUTOMATION - COMPLETE SETUP GUIDE

## Prerequisites Installation

### 1. Install Python 3.9 or Higher
- Download from: https://www.python.org/downloads/
- During installation, CHECK "Add Python to PATH"
- Verify: `python --version`

### 2. Install MongoDB Community Edition
- Download from: https://www.mongodb.com/try/download/community
- Choose Windows, MSI
- During installation, install MongoDB as a Service
- Verify: `mongod --version`
- Start MongoDB: Open Services app and ensure MongoDB is running

### 3. Node.js (Already Installed)
- Current version: Node.js v22.14.0
- npm version: v10.9.2

## Project Setup

### Step 1: Install pnpm and Dependencies
```bash
# Navigate to project root
cd c:\Users\ADITYA\Desktop\NLP\poll-automation

# Install pnpm (if not already installed globally)
npm install -g pnpm

# Install all dependencies
pnpm install
```

### Step 2: Set Up Python Environments

#### Whisper Service (Audio Transcription)
```bash
# Navigate to whisper service
cd services/whisper

# Create Python virtual environment
python -m venv whisper-env

# Activate virtual environment (Windows)
whisper-env\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Deactivate
deactivate
```

#### Pollgen-LLM Service (Poll Generation)
```bash
# Navigate to pollgen-llm service
cd services/pollgen-llm

# Create Python virtual environment
python -m venv llm-env

# Activate virtual environment (Windows)
llm-env\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Deactivate
deactivate
```

### Step 3: Environment Configuration

Verify `.env` files are properly configured:

**apps/backend/.env**
- PORT=3000
- WHISPER_WS_URL=ws://127.0.0.1:8000
- LLM_FORWARD_URL=ws://127.0.0.1:5001/ws/llm
- MONGO_URI=mongodb://localhost:27017/

**services/whisper/.env**
- CHUNK_DURATION=30
- MODEL=tiny
- SILENCE_THRESHOLD=92000

## Running All Services

### Terminal 1: Start MongoDB
```bash
mongod
# Or ensure it''s running as a Windows Service
```

### Terminal 2: Backend Server
```bash
cd c:\Users\ADITYA\Desktop\NLP\poll-automation
pnpm --filter @poll-automation/backend dev
# Server runs on: http://localhost:3000
```

### Terminal 3: Frontend Application
```bash
cd c:\Users\ADITYA\Desktop\NLP\poll-automation
pnpm --filter automatic-poll-system dev
# Frontend runs on: http://localhost:5173
```

### Terminal 4: Whisper Service
```bash
cd c:\Users\ADITYA\Desktop\NLP\poll-automation\services\whisper
whisper-env\Scripts\activate
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
# Service runs on: http://localhost:8000
```

### Terminal 5: Pollgen-LLM Service
```bash
cd c:\Users\ADITYA\Desktop\NLP\poll-automation\services\pollgen-llm
llm-env\Scripts\activate
python -m uvicorn src.main:app --host 0.0.0.0 --port 5001 --reload
# Service runs on: http://localhost:5001
```

## Service Endpoints

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Whisper Service**: http://localhost:8000
- **Pollgen-LLM Service**: http://localhost:5001
- **MongoDB**: localhost:27017

## Troubleshooting

### pnpm not found
```bash
npm install -g pnpm@10.12.1
# Or use npx pnpm@10.12.1
```

### Python virtual environment not working
```bash
# Re-create the virtual environment
python -m venv --clear whisper-env
whisper-env\Scripts\activate
pip install -r requirements.txt
```

### Port already in use
- Kill the process using the port: `netstat -ano | findstr :PORT_NUMBER`
- Then: `taskkill /PID process_id /F`

### MongoDB connection issues
- Ensure MongoDB service is running: Check Services app
- Or start manually: `mongod --dbpath "C:\data\db"`

### WebSocket connection errors
- Ensure all services are running on correct ports
- Check firewall settings
- Verify URLs in backend .env match your setup

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Express.js + TypeScript + WebSockets + MongoDB
- **Whisper**: FastAPI + Faster Whisper + WebSockets
- **LLM**: FastAPI + LangChain + Google Generative AI
- **Build Tool**: Turborepo with pnpm workspaces
