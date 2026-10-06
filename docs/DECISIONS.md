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

## Phase 2: backend core

- **Services raise small domain errors** (`NotFound`, `Gone`, `Conflict`, …). One handler in `main.py` turns them into `{"detail": ...}` with the right status, so services never import FastAPI.
- **Extra CHECK constraints** beyond the documented schema: 11-digit meeting codes, text lengths that match request validation, and end times after start times. Bad data can't get in by any route.
- **Meeting codes:** a lookup catches collisions, and the UNIQUE constraint is the final guard (up to 5 retries). `add_with_unique_code` must be the first write in its transaction, because a collision rolls the transaction back.
- **Upcoming:** an indexed SQL pre-filter (no meeting runs past 24 h), then an exact end-time check in Python.
- **The past-start check lives in the service**, not in Pydantic, so its 422 carries a message the UI can show as-is.
- **`requirements.txt` pins every package**, sub-dependencies included, so Render installs what we tested. The exceptions are `colorama` (Windows only) and `uvloop` (Linux only).
- **Tests use a temporary SQLite file per test** and a new session per request, so a missing commit fails a test.
- **Seeded times fall in office hours in India** (10:00–18:00, Asia/Kolkata), relative to today, plus one meeting later today while office time remains. `seed_if_empty` takes an optional `now`, so tests can fix the clock.
- **The seed is split into three files:** `seed.py` (what), `seed_time.py` (when) and `seed_rows.py` (how rows are built), to keep files short.
- **Known limitation:** if two people join a not-yet-started scheduled meeting at the same instant, the one-live-session index lets only one create the session. The other gets an error and can retry.
