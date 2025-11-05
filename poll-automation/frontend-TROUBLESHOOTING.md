# Frontend Troubleshooting (apps/frontend)

## Symptoms observed
- Dev server exited immediately earlier with return code 130 and no output.

## Likely causes
- Exit code 130 usually indicates the process received SIGINT/CTRL+C (e.g., the terminal or orchestrator stopped it).
- Port 5173 may be taken; Vite will auto-bump to the next port (e.g., 5174).
- Missing dependencies can also cause an early exit (would show errors in the console).

## Fixes applied
- Relaunched with the standard command:
  `powershell -NoProfile -ExecutionPolicy Bypass -Command 'cd poll-automation; pnpm --filter automatic-poll-system dev'`
- Verified Vite started successfully on http://localhost:5174 (5173 was likely busy).

## What to try if it happens again
1) Ensure no prior Vite dev server is running. Close any terminals or kill Node processes bound to 5173/5174.
2) If dependencies might be missing, run `pnpm install` at the repo root (ask for confirmation before running).
3) Check for errors printed to the console; fix the reported issue.
4) Try forcing a port: `vite --port 5175` or set `VITE_PORT` in env.

