# Quick Start Guide - Poll Automation

## ?? Fastest Way to Start

Double-click this file from your project folder:
\\\
START-ALL-SERVICES.ps1
\\\

This will launch all 5 services automatically in separate windows!

---

## ?? Manual Service Startup (Alternative)

Open 5 separate PowerShell windows and run these commands:

### Window 1: MongoDB Database
\\\powershell
cd c:\Users\ADITYA\Desktop\NLP\poll-automation
.\RUN-MONGODB.ps1
\\\

### Window 2: Whisper Audio Service (Port 8000)
\\\powershell
cd c:\Users\ADITYA\Desktop\NLP\poll-automation
.\RUN-WHISPER.ps1
\\\

### Window 3: LLM Poll Generation Service (Port 5001)
\\\powershell
cd c:\Users\ADITYA\Desktop\NLP\poll-automation
.\RUN-LLM.ps1
\\\

### Window 4: Backend API Server (Port 3000)
\\\powershell
cd c:\Users\ADITYA\Desktop\NLP\poll-automation
.\RUN-BACKEND.ps1
\\\

### Window 5: Frontend Website (Port 5173)
\\\powershell
cd c:\Users\ADITYA\Desktop\NLP\poll-automation
.\RUN-FRONTEND.ps1
\\\

---

## ?? Access Your Website

After all services start (typically 30-60 seconds), open your browser:

**\\http://localhost:5173\\**

---

## ?? Service Health Check

All services should show these messages when running:

| Service | Port | Message |
|---------|------|---------|
| Frontend | 5173 | \VITE v5.x.x  ready in XXX ms\ |
| Backend | 3000 | \listening on port 3000\ |
| Whisper | 8000 | \Uvicorn running on http://0.0.0.0:8000\ |
| LLM | 5001 | \Uvicorn running on http://0.0.0.0:5001\ |
| MongoDB | 27017 | \waiting for connections\ |

---

## ? What to Check If Something Goes Wrong

### Issue: Port Already in Use
**Solution**: Check if another service is running on that port and close it.

### Issue: Python Service Won't Start
**Solution**: Activate the virtual environment manually:
\\\powershell
cd services\whisper
.\whisper-env\Scripts\Activate.ps1
python -m uvicorn src.main:app --port 8000 --reload
\\\

### Issue: Frontend Shows "Cannot reach server"
**Solution**: Make sure backend is running first, then wait for connection.

### Issue: MongoDB Won't Connect
**Solution**: Make sure mongod is running on port 27017.

---

## ?? Features to Try

1. **Upload Audio**: Record or upload an MP3/WAV file
2. **Generate Polls**: System transcribes audio and generates polls
3. **View Results**: See poll responses in real-time
4. **Export Data**: Download results as PDF or Excel

---

## ?? Project Structure

\\\
poll-automation/
+-- apps/
¦   +-- backend/        (Express API - Port 3000)
¦   +-- frontend/       (React Website - Port 5173)
+-- services/
¦   +-- whisper/        (Audio Transcription - Port 8000)
¦   +-- pollgen-llm/    (Poll Generation - Port 5001)
+-- shared/
¦   +-- types/          (Shared TypeScript definitions)
¦   +-- utils/          (Shared utilities)
+-- START-ALL-SERVICES.ps1    (Master launcher)
+-- RUN-FRONTEND.ps1          (Frontend only)
+-- RUN-BACKEND.ps1           (Backend only)
+-- RUN-WHISPER.ps1           (Whisper service only)
+-- RUN-LLM.ps1               (LLM service only)
+-- RUN-MONGODB.ps1           (MongoDB only)
\\\

---

## ?? Environment Variables

All are pre-configured in .env files:

**Backend** (\pps/backend/.env\):
- PORT=3000
- MONGO_URI=mongodb://localhost:27017/
- WHISPER_WS_URL=ws://127.0.0.1:8000
- LLM_FORWARD_URL=ws://127.0.0.1:5001/ws/llm

**Whisper** (\services/whisper/.env\):
- MODEL=tiny
- CHUNK_DURATION=30

No changes needed - everything is ready to go!

---

## ?? Troubleshooting Tips

1. **Read Error Messages**: They often tell you exactly what's wrong
2. **Check Port Availability**: Use \
etstat -ano | findstr :PORT\ to check
3. **Restart Services**: Close window and run the script again
4. **Clear Browser Cache**: Ctrl+Shift+Delete
5. **Check Logs**: Each terminal window shows live logs

---

## ?? Development Tips

- Edit React files ? Auto-refresh in browser
- Edit Backend TypeScript ? Auto-restart backend
- Edit Python services ? Auto-reload with --reload flag
- All changes are instant in dev mode!

---

**Status**: Ready to launch! ??

For more information, see:
- SETUP_GUIDE.md (detailed setup)
- SERVICE_STATUS_REPORT.md (current status)
- .zencoder/rules/repo.md (full documentation)
