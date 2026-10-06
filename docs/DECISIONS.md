# Decisions

A running log of design decisions, 1–2 lines each, grouped by build phase.

## Phase 1: setup and skeleton deploy

- **Python 3.11 everywhere.** It's the installed interpreter, and Render pins `PYTHON_VERSION=3.11.5` to match. The code avoids 3.12-only syntax.
- **One root `.gitignore`.** `.env*` plus `!.env.example` keeps real env files out and the examples in. A nested `frontend/.gitignore` would override that exception, so it was merged into the root file.
- **Frontend config fails fast.** `lib/config.ts` throws if a `NEXT_PUBLIC_*` value is missing, so a misconfigured Vercel build fails instead of deploying a site that can't reach the API.
- **`CORS_ORIGINS` is a comma-separated string.** `config.py` splits it into a list, so the Render env var needs no JSON.
- **Test dependencies live in `requirements.txt`.** One file keeps the documented setup (`pip install -r requirements.txt`, then `pytest`) working as written.
- **The temporary `/ws/ping` echo has its own file** (`app/realtime/ping.py`), so Phase 5 removes it by deleting one file and one include line.
- **Render health check on `/api/health`.** Render waits for it to pass before sending traffic to a new deploy.
- **`cacheComponents` and `partialPrefetching` are off.** create-next-app 16.4 turns them on, but they cache server rendering we don't do. With them on, a route you leave stays mounted but hidden, keeps its state and re-runs its effects when you return. The room and pre-join pages are simpler when leaving means unmounting.
- **`agentRules: false` in `next.config.ts`.** Without it, `next dev` can write a generated `AGENTS.md` into `frontend/`. Turning it off keeps the folder to files we chose.
- **`httpx` stays, with a known warning.** Starlette 1.7 prefers `httpx2` for `TestClient`, so pytest prints a deprecation warning. httpx is only used by the tests and is on the approved list, so we keep it and accept the warning.
