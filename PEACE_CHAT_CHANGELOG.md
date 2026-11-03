# Peace chat: persistent transcript and watch usability

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
  production deployment checks remain unverified.
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
then verify on a physical watch. This environment has no Cloudflare credentials,
so production deployment cannot be performed here.

Previously discarded history is recoverable only if retained in a browser,
export, or relay buffer. Browser storage quotas still apply; failures are shown,
and server-saved data remains recoverable. Names stay local to each browser.

## Graveyard

- Removed bulk Clear: it conflicts with preserving the transcript.
- Removed automatic chat trimming: pagination must not delete stored history.
- Removed chat-panel renaming: launch identity is persistent.
- Removed watch drag/resize geometry and nested transcript scrolling: these
  consumed space and overflowed small screens. Desktop window controls remain.
