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
- **Simultaneous first joins:** if two people join a not-yet-started meeting at the same instant, both try to start a session. The one-live-session index rejects the second INSERT, and that request rolls back and joins the session that won (`live_or_new_session`), so nobody sees an error.

## Phase 3: dashboard

- **Inter font** through `next/font/google`. It is the closest free match to Zoom's font and a variable font, so every weight is available. The system UI stack is the fallback.
- **A text wordmark instead of Zoom's logo.** "zoom" in Zoom's blue looks right without shipping Zoom's logo file.
- **Sizes come from the screenshots divided by 1.25.** The references were taken at 125% display scaling, so 1920 screenshot pixels are 1536 CSS pixels.
- **`useResource(load)`** is the one data-loading pattern. It sets state only in promise callbacks (the React lint rules forbid synchronous setState in effects), ignores results from a discarded run, and keeps old data on screen while `reload()` refreshes it.
- **`CurrentUserProvider`** in the root layout loads `/me` once. The nav avatar, the profile card and later the pre-join page all read it, instead of each fetching it.
- **Live meetings sit under an "In progress" header** at the top of Upcoming. A live instant meeting has no scheduled start, so it can't be grouped by day.
- **One toast at a time, kept in a context.** The toast survives a page change, so "Meeting scheduled" still shows after Save returns to Home.
- **Placeholders show "Not available in this demo".** Nav and sidebar items use a tooltip; Profile and Settings in the avatar menu show the same text as a toast, since a menu item closes the menu on click.
- **The new-meeting Schedule form renders only in the browser** (`next/dynamic` with `ssr: false`). Its defaults come from the browser's clock and time zone, so a server render would differ and React would report a hydration mismatch.
- **One form for create and edit.** `ScheduleForm` takes an optional meeting; the value conversions (12-hour ↔ 24-hour, duration split, validation) are plain functions in `scheduleFormValues.ts`.
- **Default duration is 1 hour.** The 40 minutes in the screenshot is Zoom's Basic-plan limit, which is out of scope.
- **Selects keep unusual saved values.** A meeting made through the API might last 40 minutes; `withValue` adds that option, so Edit shows it and Save doesn't quietly change it.
- **Current time-zone names.** Chrome reports some zones by old names (`Asia/Calcutta`). A short rename map shows `Asia/Kolkata` instead; Chrome and the server accept both.
- **The description goes into the Copy Invitation text**, so the field is used as well as saved.
- **Native date input and selects.** They come with keyboard and screen-reader support, and the date field shows the browser's own calendar picker, like Zoom's.
- **The meeting card menu is non-modal** (`modal={false}`). A modal menu closing while the delete dialog opens can leave the page unclickable.
- **Meetings is highlighted in the sidebar on the Schedule pages**, as in Zoom. It links to Home, where the meetings list lives in this demo.
- **The Join box checks the meeting before leaving the page.** `parseMeetingInput` accepts an ID with spaces or dashes, or any URL containing `/j/<11 digits>`. Then `GET /meetings/{code}` turns unknown, cancelled and ended meetings into an inline error instead of a dead end on the next page.
- **Join error messages match the backend's wording** (`lib/meetingStatus.ts`), so a meeting reads "has ended" the same way whether the browser or the server found it.
- **`useStartMeeting` is shared by Host, New meeting and Start.** It calls the API, saves the join session (mic on, camera from the meeting's host-video setting) and opens the room. The button stays disabled until the room loads, so a double click can't start two meetings.
- **The join session is checked when read back.** sessionStorage can hold anything, so `loadJoinSession` checks the stored shape and treats damaged data as "not joined".
- **The Start button sits beside the title** on a meeting card; the bottom row has no room for three controls in the narrow column. It reads "Join" for a meeting that is already running, where `/start` rejoins as host.
- **A placeholder room until Phase 5.** `/meeting/{code}` shows the meeting and your role, and sends a tab with no saved session to `/j/{code}`. Phase 5 replaces it with the real room.
