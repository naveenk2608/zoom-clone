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
- **Delete is optimistic.** `useDeleteMeeting` keeps a set of deleted codes and the list hides them, so the card goes at once. If the request fails the code is dropped from the set and the card returns to its old place, since the loaded list was never changed.
- **Meetings is highlighted in the sidebar on the Schedule pages**, as in Zoom. It links to Home, where the meetings list lives in this demo.
- **The Join box checks the meeting before leaving the page.** `parseMeetingInput` accepts an ID with spaces or dashes, or any URL containing `/j/<11 digits>`. Then `GET /meetings/{code}` turns unknown, cancelled and ended meetings into an inline error instead of a dead end on the next page.
- **Join error messages match the backend's wording** (`lib/meetingStatus.ts`), so a meeting reads "has ended" the same way whether the browser or the server found it.
- **`useStartMeeting` is shared by Host, New meeting and Start.** It calls the API, saves the join session (mic on, camera from the meeting's host-video setting) and opens the room. The button stays disabled until the room loads, so a double click can't start two meetings.
- **The join session is checked when read back.** sessionStorage can hold anything, so `loadJoinSession` checks the stored shape and treats damaged data as "not joined".
- **The Start button sits beside the title** on a meeting card; the bottom row has no room for three controls in the narrow column. It reads "Join" for a meeting that is already running, where `/start` rejoins as host.
- **A placeholder room until Phase 5.** `/meeting/{code}` shows the meeting and your role, and sends a tab with no saved session to `/j/{code}`. Phase 5 replaces it with the real room.

## Phase 4: pre-join

- **The preview opens only the camera.** The mic is just a choice on this page (Mute / Unmute), saved in the join session; the room opens it in Phase 6.
- **A camera failure never blocks joining.** `useCameraPreview` turns the camera off and the preview shows why (blocked, missing, busy); Join then saves `video_on: false`.
- **The preview and the room each open the camera.** The light blinks once on the way in, which is simpler than handing a live stream from one page to the next.
- **A meeting nobody can join never asks for the camera.** Invalid, cancelled and ended meetings show their message and "Back to home" without rendering the preview.
- **The code is checked before any request.** `/j/upcoming` would otherwise call `GET /api/meetings/upcoming`, which is a real path, so `isMeetingCode` rejects anything that isn't 11 digits first. The Edit page (`/schedule/{code}`) does the same.
- **Back goes to Home.** An invite link opened in a new tab has no history to go back to.
- **The Remember box shows whether a name is stored.** It starts ticked when one is, ticking it saves the name on Join, and unticking it forgets the name.
- **The name follows /me until you type.** The field shows the remembered name, then the signed-in user's, and switches to what you type once you change it, so a slow `/me` still fills it in.
- **Join errors appear under the button, not in a toast.** For example, a meeting cancelled after the page loaded.
- **No carets on the preview pill.** Zoom's ^ menus pick devices, which this demo doesn't offer; the room toolbar will show them as placeholders.

## Phase 5: room shell and presence

- **Accept first, then check.** The socket accepts the connection and closes with 4001 (bad token), 4003 (removed) or 4010 (ended) after a failed check, because a browser can't read the close code of a refused handshake. `close_code_for` maps each admission error to its code.
- **One lock per meeting code.** Joins, leaves, the grace timer and "End meeting for all" take it, so a reconnect can't race a leave or an ending. Everything for a meeting runs one step at a time.
- **Short database sessions.** The socket gets a session factory (`get_session_factory`) and opens a session for each step inside `run_in_threadpool`, instead of holding one open for the whole call. Services return plain data (`RoomMember`), never ORM objects from a closed session.
- **A reconnect replaces the old socket silently.** The manager keys sockets by participant. A newer socket for the same participant replaces the old one (closed with 4001) and only a `media_state` is broadcast, not a second `participant_joined`. Cleanup of the old socket does nothing, since it is no longer the registered one.
- **Grace period is a task.** When the last connection drops, a task waits 30 s and ends the session if the room is still empty. A reconnect cancels it. Clicking Leave as the last person ends the session at once.
- **WebSocket tests share one event loop.** `live_client` runs the app inside `with TestClient(...)`, as the real server shares one loop and one connection manager across sockets. Each test also gets a fresh manager.
- **Media is flags only until Phase 6.** Mute and Video flip a flag, broadcast `media_state` and save it in the join session, so a refresh keeps it. No camera or mic opens in the room yet, so every tile shows its camera-off look.
- **Chat and host controls wait for Phase 7.** Chat and Host tools show "Not available in this demo". The panel frame (`RoomPanel`) is built so Chat is a second panel later.
- **Cancel replaces the toolbar while the End menu is open**, as in the reference screenshot. Escape also closes the menu.
- **Rejoin reloads the page.** After a lost connection the room shows "Rejoin", which reloads. The page reads the saved join session again, so it reconnects with the latest mic and camera state.
- **`/ws/ping` is gone**, together with its test.
