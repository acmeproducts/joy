# Peace chat: persistent transcript and watch usability

## Watch scrolling — November 3, 2026

The owner requested fully scrollable, watch-friendly chat. Baseline Chromium
swipes and wheel scrolling worked, so the physical-watch failure was not reproduced
in the lab. The baseline nevertheless disabled touch gestures at the body level,
used a two-row toolbar, and replaced message nodes during live refreshes.

- While chat is open, the body permits vertical gestures; the canvas retains its
  own gesture handling. Transcript and Tools use native momentum scrolling with
  contained overscroll. The transcript has an accessible focus target for keyboard
  and crown-style wheel navigation.
- A single-row watch toolbar increases transcript height from 132px to 161px in
  the measured 198×242 viewport. Composer and close controls remain available;
  Tools and attachment previews scroll within bounded areas. Translated text
  uses the full message width on watches.
- Live refreshes defer replacing message nodes until a swipe/scroll settles,
  preserving native gestures and the existing reading-position behavior.
- Browser checks pass for touch swipes, wheel input, Home/End access to both ends
  of a 350-entry transcript, refresh during an active swipe, and usable viewing
  space at 162, 176, 198, and 240px widths. Existing identity, link, persistence,
  phone, and desktop checks also pass. Physical-watch behavior remains unverified.
- Retired the two-row watch toolbar and immediate rerendering during gestures.

## Launcher label correction — November 3, 2026

Removed the visible “Chat” word from the session beacon at the owner's request.
The participant count and existing open/close action remain. The button retains
its accessible name. The visible label is retired and should not be restored.

## Name-entry correction — November 3, 2026

The owner reported that launch accepted a generated date/time twice and asked
for name editing in Settings. Launch had prefilled the saved value and validated
only that it was nonempty; periodic profile refreshes could also overwrite an
unfinished session-name edit after focus moved away from the field.

- Launch now starts blank whenever entry is required. Invalid saved timestamps,
  blank names, and null/undefined values lose their confirmation and require a
  valid name. Valid confirmed names continue to skip the prompt.
- One validator covers launch, Settings, and the existing session editor. Errors
  keep the form open and leave the current name intact. Settings saves persist
  without reloading the page; background updates preserve unfinished edits.
- Settings has a labeled name field, Save name button, and inline feedback, and
  fits watch widths. Chat-panel renaming remains removed.
- Before the fix, both new name/config acceptance checks failed. The corrected
  validator, invalid-storage repair, and browser naming checks pass, along with
  transcript, watch layout, links, offline replay, and deletion checks.
- Removed timestamp prefilling and reload-on-name-save: neither is a valid way
  to collect or correct a person's name. Physical-watch verification is pending.

## Requirements and implementation

The owner requires that the transcript is never wiped, chat fills a watch's
available viewing area, names are requested once and saved, the room works alone,
any participant can delete an entry, and specialized Markdown links never regress.
New-device recovery with all other participants offline is also required.

- Baseline: `peace.html` at `50ef70b8dcc92270c6f900dcc47ed1a856debe61`.
- The baseline trims local chat to 300 entries, offers immediate bulk Clear,
  generates a timestamp name, and enforces a 320px minimum window width.
- The worker resets relay history after 12 minutes of inactivity. Dedicated SQLite
  chat records now survive that reset, event pruning, and object restart. Existing
  relay chat and browser history merge into those records by stable entry ID.
- `GET /signal?session=…&chat=1&cursor=…` returns up to 50 entries and a nullable
  cursor. Existing chat POST types save before acknowledging; `chat-room-migrate`
  merges batches of up to 50 existing entries. Tombstones always win.
- The browser caches entries and persists an outgoing queue. Server failures are
  visible and retry on reconnect, opening chat, foregrounding, and every 10 seconds.
  Async translation saves merge with newer entries instead of replacing them.
- At widths up to 480px, chat fills the visual viewport. Tools holds secondary
  actions and participants; message entry and Send remain visible. Desktop keeps
  its movable/resizable window.
- Names require one-time confirmation, reuse `relax_join_name`, and add
  `relax_name_confirmed`. Chat has no rename controls. The launcher works alone.
- Link normalization/rendering functions are unchanged.

## Acceptance results

- Baseline: two history/layout checks fail; specialized-link checks pass.
- Updated: six Node checks pass, covering link syntax, history caps, SQLite
  persistence, 312 retained entries, pagination, restart, 13-minute inactivity,
  large attachments, deduplication, migration, and deletion resurrection.
- Chromium against the actual local Wrangler/workerd runtime passes at 162, 176,
  198, 240, 390, and 1280px: geometry, Tools, identity persistence, links, reload,
  offline queue replay, fresh-browser recovery without peers, shared deletion,
  stale translation saves, 350-entry local history, and reading position.
- `wrangler deploy --dry-run` passes. These are lab checks; physical-watch and
  production page checks remain pending publication.
- The original page also throws `splashSheetSource is not defined` in pagehide
  telemetry. Browser tests exclude only that confirmed baseline error.

Run Node checks with `node tests/peace.test.mjs` and
`node tests/peace-worker.test.mjs` (Node 24 supports the SQLite test adapter).
For browser checks, install Python Playwright and Chromium, cache
`https://cdn.tailwindcss.com` in `/tmp/peace-tailwind.js`, start
`npx wrangler dev --local --ip 127.0.0.1 --port 8787`, then run
`REAL_WORKER=1 python tests/peace-browser.py`. Without `REAL_WORKER`, the browser
test uses a deterministic relay stub. Each real-worker run uses its own room.

## Rollout and limits

Deploy the worker with `npx wrangler deploy` before publishing the updated page.
The existing SQLite Durable Object binding is reused; its table is created on
startup. Confirm production recovery from a fresh browser with all peers closed,
then verify on a physical watch. Deployment uses
`acmeproducts/stuff/.github/workflows/deploy-peace-chat.yml` and its existing
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` Actions secrets; credentials
never leave GitHub Actions. Production worker checks passed in run
[41614274364](https://github.com/acmeproducts/stuff/actions/runs/41614274364),
including pagination beyond 300 entries, deletion protection, and reading the
real room. A stale history response observed during deployment prompted explicit
`Cache-Control: no-store` on history responses and unique client request URLs.

Previously discarded history is recoverable only if retained in a browser,
export, or relay buffer. Browser storage quotas still apply; failures are shown,
and server-saved data remains recoverable. Names stay local to each browser.

## Graveyard

- Removed bulk Clear: it conflicts with preserving the transcript.
- Removed automatic chat trimming: pagination must not delete stored history.
- Removed chat-panel renaming: launch identity is persistent.
- Removed watch drag/resize geometry and nested transcript scrolling: these
  consumed space and overflowed small screens. Desktop window controls remain.
