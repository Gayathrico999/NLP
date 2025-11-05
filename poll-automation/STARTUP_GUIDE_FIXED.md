# POLL AUTOMATION - QUICK STARTUP GUIDE

## ? WHAT'S BEEN FIXED

1. **pnpm** - Reinstalled globally
2. **Python Dependencies** - Core packages installed for both Whisper and LLM
3. **Service Scripts** - New fixed launchers created:
   - RUN-WHISPER-FIXED.ps1
   - RUN-LLM-FIXED.ps1
   - RUN-BACKEND-FIXED.ps1
   - RUN-FRONTEND-FIXED.ps1
   - START-ALL-SERVICES-IMPROVED.ps1

## ?? QUICK START (3 OPTIONS)

### OPTION 1: Start All Services At Once (EASIEST)
Open PowerShell and run:
\\\powershell
cd "c:\Users\ADITYA\Desktop\NLP\poll-automation"
.\START-ALL-SERVICES-IMPROVED.ps1
\\\
Wait 60 seconds, browser will open automatically to http://localhost:5173

### OPTION 2: Start Services Individually (FOR DEBUGGING)
Open **5 separate PowerShell windows** and run each:

**Window 1 - Whisper Service (Port 8000):**
\\\powershell
cd "c:\Users\ADITYA\Desktop\NLP\poll-automation"
.\RUN-WHISPER-FIXED.ps1
\\\

**Window 2 - LLM Service (Port 5001):**
\\\powershell
cd "c:\Users\ADITYA\Desktop\NLP\poll-automation"
.\RUN-LLM-FIXED.ps1
\\\

**Window 3 - Backend (Port 3000):**
\\\powershell
cd "c:\Users\ADITYA\Desktop\NLP\poll-automation"
.\RUN-BACKEND-FIXED.ps1
\\\

**Window 4 - Frontend (Port 5173):**
\\\powershell
cd "c:\Users\ADITYA\Desktop\NLP\poll-automation"
.\RUN-FRONTEND-FIXED.ps1
\\\

**Window 5 - MongoDB (Already Running):**
MongoDB is already running as a system service on port 27017

Then open browser to: http://localhost:5173

### OPTION 3: Verify Everything First
\\\powershell
cd "c:\Users\ADITYA\Desktop\NLP\poll-automation"

# Check all tools
pnpm --version      # Should show 10.13.1
node --version      # Should show v24.x
npm --version       # Should show 11.x

# Check Python services
cd services\whisper
.\whisper-env\Scripts\python.exe -c "import fastapi, uvicorn; print('? Whisper OK')"

cd ..\pollgen-llm
.\llm-env\Scripts\python.exe -c "import fastapi; print('? LLM OK')"

# Check MongoDB
netstat -ano | findstr :27017
\\\

## ?? SERVICE LOCATIONS

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| Frontend | 5173 | http://localhost:5173 | React UI |
| Backend | 3000 | http://localhost:3000 | Express API |
| Whisper | 8000 | http://localhost:8000 | Audio transcription |
| LLM | 5001 | http://localhost:5001 | Poll generation |
| MongoDB | 27017 | mongodb://localhost:27017 | Database |

## ?? IF SERVICES DON'T START

**Whisper/LLM Python Error?**
\\\powershell
cd services\whisper
.\whisper-env\Scripts\python.exe -m pip install -r requirements.txt

cd ..\pollgen-llm
.\llm-env\Scripts\python.exe -m pip install -r requirements.txt
\\\

**pnpm not found?**
\\\powershell
npm install -g pnpm@10.13.1
# Then restart PowerShell
\\\

**Port already in use?**
Find and stop process using that port:
\\\powershell
netstat -ano | findstr :5173    # Find which process uses port
taskkill /PID <PID> /F         # Kill that process
\\\

## ?? WHAT TO EXPECT

1. **Whisper Service** will boot and wait for WebSocket connections
2. **LLM Service** will initialize (may take 10-20 seconds on first run)
3. **Backend** will connect to MongoDB and start Express server
4. **Frontend** will compile React and show Vite dev server ready
5. **Browser** will open to React app at http://localhost:5173

All 5 services should be responding in ~60 seconds.

## ?? TIPS

- Keep all 5 service windows open while developing
- Frontend/Backend have hot-reload enabled
- Python services restart automatically on file changes
- Check .env files for configuration (whisper/.env, pollgen-llm/.env, apps/backend/.env)

## ?? SUPPORT

Run diagnostics:
\\\powershell
# Check all ports are listening
netstat -ano | findstr "LISTENING" | findstr ":5173\|:3000\|:8000\|:5001\|:27017"

# Check service logs in their windows
# Each service window shows real-time logs
\\\

--- 

**READY TO GO! Choose one of the 3 startup options above.**
