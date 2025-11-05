# Backend Troubleshooting (apps/backend)

## Symptoms observed
- EADDRINUSE: port 3000 already in use
- Earlier: ECONNREFUSED to LLM at ws://localhost:5001/ws/llm (when LLM was down)

## Root causes
- A previous backend process was still listening on 3000
- LLM service had failed to start due to a corrupted `.env`, so the backend could not connect

## Fixes applied
- Identified and killed the orphan process on 3000:
  - `Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object -Expand OwningProcess`
  - `Stop-Process -Id <PID> -Force`
- Restarted backend after LLM was running; it connected successfully: "🧠 Connected to LLM WebSocket"

## How to prevent
- If restarting frequently, close previous terminals or kill the PID bound to 3000
- Start services in order: LLM ➜ Whisper ➜ Backend ➜ Frontend
- If LLM is optional and off, set `LLM_FORWARD_URL` to a reachable endpoint or handle disabled state in code

