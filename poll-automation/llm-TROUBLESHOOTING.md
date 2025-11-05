# LLM Service Troubleshooting (pollgen-llm)

## Symptoms observed
- Crash at startup with:
  `OSError: [Errno 22] Invalid argument` at `load_dotenv()` in `server.py`
- PowerShell errors like:
  `:USER_HOME=... : The term ':USER_HOME=...' is not recognized ...`

## Root causes
1) .env file encoding was UTF-16 (contained NUL characters), which produced malformed keys like `G\x00O\x00O...` and caused `os.environ[...]` to throw `OSError: [Errno 22] Invalid argument`.
2) Passing PowerShell env assignments via bash without escaping the `$` led to `$env:USER_HOME` becoming `:USER_HOME` (bash stripped `$`), causing PowerShell to error and the service not to start.

## Fixes applied
- Deleted the broken `.env` so `load_dotenv()` no longer ingests malformed values.
- Launched the service with explicit environment variables using a single-quoted `-Command` to prevent bash from expanding `$`:

  `powershell -NoProfile -ExecutionPolicy Bypass -Command '$env:USER_HOME="C:/Users/ADITYA/Desktop/NLP"; $env:GOOGLE_API_KEY="<your_key>"; cd poll-automation/services/pollgen-llm; & "llm-env\Scripts\python.exe" -m uvicorn server:app --host 0.0.0.0 --port 5001 --reload'`

- Verified service listening on port 5001 and that the backend connected successfully.

## How to prevent in future
- Keep `.env` files encoded as UTF-8 (no BOM). If editing on Windows, avoid saving as UTF-16.
- Use `.env.example` (already present) as a template and copy to `.env`.
- When running PowerShell via bash, wrap the whole PowerShell script in single quotes so `$env:` variables are not expanded by bash.

## Optional: recreate a clean .env
Create `poll-automation/services/pollgen-llm/.env` (UTF-8) with:

```
USER_HOME=C:/Users/ADITYA/Desktop/NLP
PORT=5001
MONGO_URI=mongodb://localhost:27017/
GEMINI_API_KEY=<your_key>
GOOGLE_API_KEY=<your_key>
# Optional Ollama (when installed)
# OLLAMA_HOST=http://127.0.0.1:11434
# OLLAMA_BASE_URL=http://127.0.0.1:11434
```

