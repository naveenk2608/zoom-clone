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
- **Signals are relayed as opaque JSON.** The server checks only `type` and `to`, and passes `data` (offer, answer or ICE candidate) to that participant in the same session. Typing the SDP on the server would add nothing.
- **One `replaceTrack` effect for every track change.** `usePeerConnections` swaps the current mic and camera tracks into every peer whenever they change. That covers camera on/off and devices that open after the offer went out, with no renegotiation.
- **A fresh `MediaStream` per received track.** `ontrack` builds a new stream holding the tracks so far, so React sees a new value and the tile's effect re-sets `srcObject`.
- **Refresh rejoin needs no extra code.** The refreshed tab is a newcomer: `welcome` lists the others and it offers to each. An existing peer that gets an offer from an id it already knows closes the old connection and answers on a new one.

## Phase 7: bonus

- **Host commands live in `realtime/host_actions.py`**, with "End meeting for all" moved there from `actions.py`. `ws.py` refuses them from anyone whose role isn't host, so each command can assume a host sent it.
- **Mute is a request.** The server sends `force_mute`; the client mutes its own mic and reports `media_state` like any mute, so the person can unmute again, as in Zoom. People already muted, and other hosts, are skipped, so nobody sees the toast for nothing.
- **Host commands only reach people connected to the host's own session.** A host can't touch another meeting's participant by guessing an id, and can't mute or remove themselves this way.
- **Remove runs under the meeting lock.** The row becomes `removed` before the socket closes with 4003, so a refresh can't slip back in; `admit` already refuses removed tokens. With no accounts, the person can still join again from the pre-join page as a new guest.
- **Remove asks first** with the existing `ConfirmDialog`. Mute and Mute All don't, because people can unmute themselves.
- **A dark `RoomMenu`** wraps Radix's dropdown for the room: the row "…" menu and Host tools. The portal's white `Menu` is unchanged.
- **Host tools opens a small menu**: Mute All, and Manage Participants (opens the panel). Zoom's other host tools (locking, waiting room) are out of scope.
- **WebSocket test helpers moved to `tests/ws_helpers.py`**, shared by the presence, host-control and chat tests.
- **`devIndicators: false` in `next.config.ts`.** Next's dev-only badge sits at the bottom left, on top of the room's Mute button.
- **Chat is saved, then sent to everyone, the sender included.** The sender's own copy comes back from the server, so every message on screen has the id and time the database saved. Nothing is replayed: people who join (or refresh) later see only new messages, Zoom's default.
- **Chat bodies are checked by the socket message model**: trimmed, 1–2000 characters, the same as the table's CHECK. A bad one gets an `error` and nothing is saved.
- **Only "Everyone".** The "to:" pill is a label, not a menu, since private messages are out of scope. "Who can see your messages?" answers itself in a tooltip.
- **Unread count on the Chat button.** The room remembers how many messages there were when the chat was last closed; newer ones show as a red badge.
- **Enter sends, Shift+Enter adds a line.** Enter is left alone while an input method (Chinese, Japanese, …) is still composing.
- **The red button reads "Leave" for attendees**, as in Zoom, since only the host can end the meeting. Its menu then offers only Leave Meeting.
- **The toolbar collapses by its own width, not the screen's.** The footer is a CSS container (Tailwind's `@container`), and each button shows "always", "wide" or "narrow". A side panel open at 1024px used to push End off the toolbar; now the toolbar switches to the short set (Mute, Video, Participants, More, End or Leave), the same one a phone gets.
- **When narrow, More is a real menu**: Chat (with the unread count), React, Share, and Mute All for the host. When wide, More stays a placeholder.
- **Narrow toolbar buttons are 64px instead of 72px**, so the five fit on a 360px phone as well as 390px.
- **Grid rows never get shorter than 8rem.** A crowded one-column grid on a phone scrolls instead of squeezing tiles into strips.
- **The dashboard already stacks below `lg`.** A page-by-page check found no sideways scrolling at 390px or 360px.
- **Screen share swaps the outgoing video track, nothing else.** The screen reaches every peer through the same `replaceTrack` effect as the camera, so nothing is renegotiated; stopping puts the camera track (or nothing) back. The camera keeps running meanwhile, so switching back is instant.
- **`media_state` has a `screen` flag**, also sent in `welcome` and `participant_joined`. Other people's tiles need it: a screen is shown whole (`object-contain`), never mirrored, and even when that person's camera is off. A client that leaves the flag out counts as not sharing.
- **The screen picker opens straight from the click.** `getDisplayMedia` only works during a user gesture (Safari is strict about this), so unlike the camera it isn't opened from an effect. Closing the picker is silent; phones, which can't share, get a notice.
- **The browser's own "Stop sharing" button** ends the track; the hook listens for `ended` and switches back to the camera.
- **The `meeting_ended` and `removed` messages end the room, not the close code.** On the live site the server's 4010/4003 close didn't reach the browser in time, so End seemed to do nothing. The tab now switches screens and closes its own socket when the message arrives; the close code is kept as a fallback.
- **End closes sockets outside the lock, all at once.** A close waits for the browser to answer. Done one by one inside the meeting lock, one slow browser held up everyone after it and blocked the meeting. Remove also closes its socket after releasing the lock.
- **Speaker view is the default, Gallery is one click away.** The grid icon in the room header switches them. The main tile goes to someone else sharing their screen, then the active speaker, then the first other person, then you when alone. Your own shared screen is never put there, because it would show the room inside itself.
- **Active speaker from Web Audio.** One AnalyserNode per remote mic, read every 100 ms. The loudest above a small RMS threshold takes over once the current speaker has been quiet for 1.5 s, so the main tile doesn't flicker. The green border shows only while they are still talking. Meters are rebuilt whenever the set of remote mics changes, which is simpler than patching them.
- **Tiles are sized in code, not stretched by CSS.** A ResizeObserver measures the stage. Speaker view's main video is the largest 16:9 box that fits under the strip. Gallery view tries every column count and keeps the one with the biggest 16:9 tiles. The math lives in `lib/tileLayout.ts`. Main and gallery videos show the whole picture (object-contain); strip tiles fill theirs (object-cover).
- **TURN credentials come from the backend.** `GET /api/ice-servers` returns STUN plus a TURN relay, with a password of base64(HMAC-SHA1(secret, "<expiry>:zoomclone")), valid for 24 hours, so the secret never reaches the browser. The room loads this list with the meeting, before the socket opens, so no peer connection is made without it. If the request fails, it falls back to STUN. `?relay=1` forces `iceTransportPolicy: "relay"` for testing.
- **Metered's Open Relay didn't grant relays when tested.** `staticauth.openrelay.metered.ca` refused TCP connections and `openrelay.metered.ca` answered allocations with a 400 error. The host and secret are settings, so a working TURN server can be swapped in without code changes.

## More Zoom room features

- **Device menus reuse the camera-switch path.** Picking a mic or camera reopens it with an `exact` deviceId, and the existing `replaceTrack` effect in `usePeerConnections` swaps it into every peer, so there is no renegotiation. This replaces the Phase 4 plan of placeholder ^ menus.
- **Muted and camera-off survive a switch.** The mute effect re-applies `enabled` to the new mic track. With the camera off, a picked camera is only remembered and is used when Video starts.
- **The device list is read again on `devicechange` and whenever our mic or camera opens.** Browsers hide device names and ids until a device has been allowed. Entries without an id are dropped.
- **The ticked device:** the one picked, else the one the open track reports, else the first listed (the browser's default). Choices aren't saved, so a refresh goes back to the defaults.
- **Speaker choice is `setSinkId` on each remote tile's `<video>`**, passed down with the playback settings. The section is shown only where `HTMLMediaElement.setSinkId` exists. Our own tile is muted, so it's left alone.
- **The ^ menus show only on a wide toolbar**, like the other carets; a phone keeps the five-button toolbar.
- **Pin is local state in `useMeetingRoom`.** It is cleared on `participant_left` rather than hidden while that person is away, so someone who reconnects with the same id isn't pinned again. Only other people can be pinned.
- **Main-tile order:** someone else's shared screen, then the pinned person, then the active speaker. A shared screen still wins over a pin, as in Zoom. Pinning from Gallery switches to Speaker view.
- **The tile's … button is CSS-only on hover** (`group-hover`), and also shows on keyboard focus and while its menu is open.
- **"(Host)" on the tile is its own span**, outside the truncated name, so a long name never hides it.
- **The WebSocket messages are split by direction:** `messages.py` (client to server, close codes) and `server_messages.py` (server to client). One file was heading past 200 lines.
- **Reactions are a Pydantic `Literal` of the six emoji.** Anything else gets the usual "not understood" error. The heart is two code points (U+2764 U+FE0F), so both sides use the same literal.
- **Reactions and hands go to everyone, the sender included**, like chat. So the sender's own tile shows exactly what the others see, and the host lowering your hand reaches you the same way.
- **A reaction shows for 10 s.** A newer one from the same person replaces it, and each timer only removes its own reaction. Nothing is saved.
- **A raised hand is part of the live connection**, like the mic and camera flags. `PersonOut` carries `hand_raised`, so `welcome` and `participant_joined` include it. Raising twice or lowering a lowered hand sends nothing.
- **Reconnecting lowers the hand**, as rejoining does in Zoom. A refresh that replaces a live socket tells the others the hand went down; a refresh after the old socket closed is a fresh join anyway.
- **`lower_hand` isn't host-only**, because anyone can lower their own. With someone else's `participant_id`, the server checks that the sender is the host and looks the person up in the host's own session.
- **Our own hand lives in `useReactions`**, set from `hand` messages about us; other people's hands are updated in `lib/roomState.ts` with their media state.
- **Raised hands are listed first** with a stable sort. Zoom orders them by when they were raised; that would need a timestamp per hand.
- **The React palette is a Radix menu** (`ToolbarMenuButton`), so picking a reaction closes it, as in Zoom, and arrow keys work. The same items sit at the top of More on a narrow toolbar.
- **Ask to Unmute is only a request.** The server sends `ask_unmute` to that one person, and only if they are muted. Their own Unmute click turns the mic on, and the usual `media_state` tells everyone. The host's row menu shows Mute or Ask to Unmute depending on the person's mic.
- **The unmute dialog reuses `ConfirmDialog`**, which now takes a cancel label and a primary button style. Escape and the backdrop count as Stay Muted.

## Host permissions and the phone layout

- **Permissions live with the connections, per live session.** `SessionPermissions` sits in the connection manager: the two settings (on by default, as in Zoom), the people the host asked to unmute or start video, and whether Mute All muted newcomers. It is forgotten when the session ends (`finish_session`), so the next run of a scheduled meeting starts with everything allowed.
- **An ask is also a permission.** Ask to Unmute (or Ask to Start Video) lets that one person turn it on while the setting is off. Mute (or Stop Video) takes it back, and Mute All takes back every unmute ask. The asks are kept by participant id, so a refresh keeps them.
- **Each person gets their own view.** The `permissions` message carries the host's two settings plus `can_unmute` and `can_start_video` for that person. After a change the server compares everyone's view before and after, and sends only to people whose view changed. A toggle reaches everyone; an ask or a mute reaches one person.
- **The server enforces it twice.** On entry, `admit` turns off a mic or camera the newcomer may not have, and `welcome.self` tells the app how it was let in. In `media_state`, turning on without permission is refused for that part only: it stays off, and the sender gets `force_mute` or `force_video_off` (so the existing code path turns the device off) and then an `error` with the reason, whose toast is the one left on screen. Turning off is always allowed, and someone who was already unmuted when the host turned unmuting off stays unmuted, as in Zoom.
- **This is enforcement of the signalled state.** Media goes peer to peer, so a modified browser could still send audio. Real enforcement would need a media server.
- **Mute All also mutes newcomers.** The dialog says "All current and new participants will be muted", so a session flag mutes later joiners (but not hosts), as Zoom's Mute All does. Its checkbox starts from the current setting, which is on by default, so it doesn't silently turn unmuting back on.
- **Screen sharing isn't covered by "Start video".** Zoom has a separate sharing permission, which is out of scope.
- **The disabled toolbar buttons use `aria-disabled`, not `disabled`.** A disabled button gets no hover or focus, so its tooltip couldn't explain why. The click is ignored, the button is dimmed, and it loses its hover background.
- **The host's commands are one helper, `lib/hostCommands.ts`.** The room returns them as `room.host`. The Participants panel and its rows take that object instead of a callback per command. `useHostRequests` handles permissions, the force messages and the two ask dialogs, which keeps `useMeetingRoom` under 200 lines.
- **`mute`, `unmute`, `stopVideo` and `startVideo` set state directly** instead of toggling. A `welcome` and a `force_video_off` in the same render can't flip the camera back on.
- **Toolbar menus are non-modal.** Mute All opens a dialog from the Host tools menu, and a modal menu closing as a dialog opens can leave the page unclickable (the same reason as the participant row menu).
- **`relays.py` holds what one participant passes on** (signals, mic and camera state, chat), split out of `actions.py`, which keeps joining and leaving.
- **The room uses `h-dvh`, not `h-screen`.** On a phone, `100vh` is the height with the address bar hidden, so with the bar showing, the toolbar sat below the screen. `100dvh` is what is visible now. The room also has `overflow-hidden`, so the page never scrolls and only the panels' own lists do.
- **`viewport-fit=cover` with safe-area padding.** The toolbar is `box-content` with `pb-[env(safe-area-inset-bottom)]`, so the home bar's space is added below the 72px buttons instead of squeezing them. The room pads its top and sides for a notch, and the full-screen phone panels pad top and bottom. Checked with Chrome's safe-area emulation (34px home bar, 47px notch) at 390×844.

## Host ownership without accounts

- **One host per live session.** `/start` answers 409 "This meeting is already being hosted on another device." while the live session has a host whose status is `in_meeting`. Status follows the WebSocket (closing it marks the host left), so Start works again once the host has gone.
- **A partial unique index is the final guard**, the same pattern as one live session per meeting: `participants(session_id) WHERE role = 'host' AND status = 'in_meeting'`. Two Starts at the same moment both pass the check; the index rejects the second INSERT, which rolls back and becomes the same 409.
- **A refresh keeps the host role** because the tab reconnects with its saved join token and never calls `/start`. If another device took over while the old tab was away, `admit` refuses that token (4001), which already sends the tab to the pre-join page to join as a participant. Without this check the reconnect would also break the index.
- **The 409 dialog reuses `ConfirmDialog`**: "Join as Participant" opens `/j/{code}`, Cancel closes it. `useStartMeeting` keeps the server's message and the card shows it, so only Start's 409 opens a dialog; other errors stay toasts.
- **Host keys prove which browser created a meeting.** Everyone is the same demo user, so creating a meeting returns a `secrets.token_urlsafe(32)` key once. Only its SHA-256 hash is stored (`meetings.host_key_hash`), so a copy of the database can't be used to act as host. A plain hash is enough because the key is random, not a password; `secrets.compare_digest` keeps the comparison constant-time.
- **The key is checked after the account check and before the meeting's state**: not your meeting → 403, wrong key → 403, then 410 or 409. A wrong-key browser learns nothing from Start that `GET /meetings/{code}` doesn't already show.
- **The creation responses are subclasses** (`MeetingWithKeyOut`, `JoinWithKeyOut`) that add `host_key`, so it appears in exactly those two responses. Every meeting carries `has_host_key`, which tells the dashboard whether ownership matters.
- **Seeded meetings have no key** (NULL), so any browser can start, edit or delete them, and the one-host rule still applies. The CHECK on the column is a length check that NULL passes.
- **`lib/api.ts` owns the keys**: it saves the key from a create response in `localStorage` (`zc:hostkey:{code}`), adds `X-Host-Key` on Start, Edit and Delete, and forgets the key after a successful Delete. No caller handles the key, so none can forget to send it. localStorage, not sessionStorage, because ownership should survive closing the tab and be shared by the browser's tabs.
- **Not owned means Join**: the card's Start becomes Join (the pre-join page) and the "…" menu is hidden. The edit page says "Only the host can edit this meeting." instead of showing a form whose Save would get 403.
- **The schema change needs a fresh local database.** `create_all` doesn't add columns or indexes to existing tables, and there are no migrations, so the local `zoom_clone.db` must be deleted once. Render starts each deploy with a fresh database.
