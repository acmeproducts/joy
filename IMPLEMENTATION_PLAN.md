# Plan: Session Log Analysis + Reliability + UI Refactoring
**File:** `/home/user/joy/test.html`
**Branch:** `claude/test-cross-device-sessions-3ZJVj`

---

## Context

Session log (mn5tixcn, Mar 25) reveals three active problems and confirms two from prior commits. User also specified complete settings-panel and top-ribbon refactors. All changes are in one file.

---

## Problem Analysis from Log + Chat Export

### 0. Translation routing broken end-to-end (root cause confirmed)
From the log:
- `09:07:01.414 HELLO from s23 lang=en` — S23 announces lang=en (no preference set, defaults to 'en')
- `09:11:15.545 RX msg srcLang=en myLang=en` — Laptop sees both sides as EN, no translation happens
- `09:28:28.878 partnerLang updated (tally lead): en (th:1 en:2)` — old tally bug overwrites partnerLang back to en
- `10:02:25.766 TX msg src=en tgt=en` — even after S23 sends Thai (09:58), Laptop still targets EN

Fix path: (a) tally fix is already on feature branch; (b) language picker in settings lets S23 set lang=th; (c) hello propagation from saveLocalName ensures reconnects carry the correct lang.

### 1. Heartbeat timeout loop (CRITICAL — dominates the log)
Pattern from 09:31 to 09:55 (24 min): reconnect every ~30 s, forever.
```
09:31:38 HEARTBEAT timeout — reconnecting
09:31:48 DISCONNECTED code=1006
09:31:49 CONNECTED session=mn5tixcn        ← rcAttempts reset to 0
09:32:20 HEARTBEAT timeout — reconnecting  ← fires again in 30 s
09:32:30 DISCONNECTED code=1006            ← cycle repeats 15+ times
```
**Root causes:**
- `PING_TIMEOUT_MS = 25000` but `lastPongAt` only updates on pong frames. When alone (no partner), pings go unanswered → timeout fires after 25 s.
- `rcAttempts` is reset to 0 on every `onopen`, so exponential backoff never accumulates. Max delay is 20 s and it's never reached — reconnect stays at ~1 s.
- `lastRxAt` (set on ANY relay message including acks) is never consulted in the heartbeat check — so even acks from your own messages don't keep the clock alive.

### 2. "X joined!" toast spams on every reconnect
`toast((d.name||'Partner')+' joined!')` fires every time a hello is received, including on every 30-second reconnect. Both parties get random toasts throughout the session.

### 3. Name changes don't propagate to partner
`saveLocalName` saves to `prefs.userName` but does not update `sess.myName` or resend a hello frame. Partner keeps seeing the old name.

### 4. "partnerLang updated (tally lead)" still running (old deploy)
Fixed in prior commit but session log confirms the bug was real and impactful. Confirmed our fix is correct.

### 5. Language selector not in settings
Session log confirms "the flag pulldown in the settings menu is not functioning or present." The sidebar lang pill (`#my-lang-pill` in `left-top`, lines 387–390) is in the feature branch code but not in the deployed version, and user considers the settings panel the correct home. Plan: remove sidebar pill, add language selector only to settings.

---

## Changes

### A — Heartbeat & reconnect (3 constant changes + 1 logic change)

**Constants** (around line 1328):
```
HEARTBEAT_MS:       10000 → 30000    (ping every 30 s, not 10 s)
PING_TIMEOUT_MS:    25000 → 120000   (2-min window before declaring dead)
RECONNECT_MAX_MS:   20000 → 180000   (3-min max backoff, never reached before but needed)
```

**Heartbeat check** — use `Math.max(lastPongAt, lastRxAt)` so any relay message (ack, tr, typing) resets the clock:
```js
// Before:
if(lastPongAt&&(now-lastPongAt)>PING_TIMEOUT_MS){
// After:
var lastAct=Math.max(lastPongAt||0,lastRxAt||0);
if(lastAct&&(now-lastAct)>PING_TIMEOUT_MS){
```

**Do not reset `rcAttempts` on reconnect** — remove `rcAttempts=0` from `onopen`. Keep the reset only in `forceReconnect()`, visibility/focus handlers, and `transportConnect` when switching sessions. This allows backoff to accumulate across multiple heartbeat-timeout reconnects.

### B — Join toast dedup

In the hello handler (~line 2113), capture state BEFORE `markPeerSeen` (which sets `peerEverSeen=true`):
```js
var rt=getRoomRuntime(sess.convId);
var wasEverSeen=rt&&rt.peerEverSeen;
var lastSeen=rt&&rt.peerLastSeenAt||0;
markPeerSeen(sess.convId,d.timestamp||d.ts||Date.now(),{fromBackfill:!!d._fromBackfill});
// ... existing upsert, addDiagLog, updatePartnerHeader, renderSessionList ...
if(!d._fromBackfill){
  resendUnacked();renderAllMessages();scrollBottom();
  if(!wasEverSeen||(Date.now()-lastSeen)>300000){
    toast((d.name||'Partner')+' joined!');
  }
}
```

### C — Name display + change propagation

**"Name showing up at all" (issue #2):** `#shell-peer-name` starts `hidden`; it's revealed by `updatePartnerHeader`. If hello arrives before the session is fully open (e.g., from backfill), the element may remain hidden. In `updatePartnerHeader`, ensure the peer name element is un-hidden whenever `sess.peerName` is set, regardless of path.

**"Name Change not helping" (issue #3):** In `saveLocalName` (line 1654), after saving prefs, mirror what `setMyLang` does:
- Iterate all sessions, update `myName` if changed, call `putSession`
- If connected, resend hello with updated name and current lang

### D — Settings panel + sidebar lang pill

**Remove from sidebar:** `#lang-pill-wrap` div and children (lines 387–390 of left-top).

**Remove from settings body (lines 477–522):**
- "Translation behavior" group (lines 501–506)
- "Export + Clear sessions" row (line 516)
- "Export phrasebook" and "Import phrasebook" rows (lines 512–513)

**New section order (replacing all of lines 477–522):**

1. **Preferred Language** — flag pill + dropdown. First item in dropdown is **Auto** (globe icon 🌐, label "Auto-detect") which calls `setMyLang('')` — clears the pref so hello uses `detectBrowserLang()||'en'`. Remaining items are the existing LANGS array. Pill shows "🌐 Auto" when `myLang` is empty. Use existing `toggleLangPicker` / `setMyLang` / `updateLangPill` — just add Auto to the rendered dropdown list and update `updateLangPill` to handle empty myLang. Add `id="settings-lang-pill-wrap"` wrapper; `openSettings()` calls `updateLangPill()`.

2. **Appearance** — merge "Source bubble" + "Target bubble" + "Layout" into a single two-column (Me | Partner) `<table>`:
   | Row | Me | Partner |
   |---|---|---|
   | Bubble Color | `set-src-bg` (existing) | `set-tgt-bg` (existing) |
   | Font Color | `set-src-font` (NEW) | `set-tgt-font` (NEW) |
   | Font Size | `set-bbl-size` → change to `<select>` (12–20) | `set-target-size` → `<select>` |
   | Bubble Width | `set-bbl-width` (existing) | `set-tgt-width` (NEW) |

   Remove the `set-bbl-size-val`, `set-target-size-val`, `set-bbl-width-val` span elements (no longer needed with select/label).
   New prefs: `srcFontColor` (default `''`), `tgtFontColor` (default `''`), `tgtBubbleWidth` (default `75`)
   `applyBubbleTheme()` changes:
   - Font color: if `p.srcFontColor` is set, use it for `mineText`; otherwise keep auto-compute from luminance. Same for `tgtFontColor`/`theirsText`.
   - Bubble width: split `'.msg-row{…width:'+width+'%}'` into mine/theirs separate rules using `p.tgtBubbleWidth||75` for theirs.
   New functions: `applySrcFontColor(v)`, `applyTgtFontColor(v)`, `applyTgtWidth(v)`.
   Update `applyGlobalSize(v)` and `applyTargetSize(v)` to remove the val-span DOM write (element removed).
   Update `applyGlobalWidth(v)` similarly.
   Update `resetAllBubbleDefaults()` to also clear `srcFontColor`, `tgtFontColor`, `tgtBubbleWidth`.

3. **Features** — two rows:
   - Phrasebook: button calls `closeSettings(); openPhrasebookModal()`
   - Auto-read: `<label>` with `<input type="checkbox" id="set-autoread">`. New function `setAutoReadFromSettings(checked)` calls `toggleAutoRead()` only if state differs (avoids double-toggle). `openSettings()` sets `set-autoread.checked = state.autoSpeakIncoming`.

4. **Data Management** — 2×3 grid (`<table class="data-mgmt-grid">`):
   ```
              Settings    Sessions
   Export   [btn]        [btn]
   Import   [btn]        [btn]
   Clear    [btn]        [btn]
   ```
   Existing: `exportAppSettings`, `importAppSettings`, `exportSessionsData`, `importSessionsData`, `clearDataOnly`.
   New `clearAppSettings()`: delete prefs key from localStorage → reload or call `resetAllBubbleDefaults`.

5. **Reset All Settings** button — calls `resetAllBubbleDefaults()` (already clears appearance prefs) then additionally clears `srcFontColor`, `tgtFontColor`, `tgtBubbleWidth`. Styled as full-width danger button.

6. **Info** — About + Privacy (keep as-is, lines 518–522).

**CSS additions:**
- `.data-mgmt-grid` — compact table with small icon buttons
- `.toggle-switch` / `.toggle-slider` — iOS-style toggle for auto-read row

### E — Top ribbon refactor

**Remove from ribbon HTML:**
- Share button (`id="ribbon-share"`)
- Phrasebook button
- Auto-read button (`id="autoread-btn"`)
- Connection dot (`id="shell-dot"`) and all its CSS (`.shell-dot`, `.shell-dot.green`, `.shell-dot.yellow` etc., `connPulse` animation)

**Ribbon after change:** only the hamburger button remains. `flex:1` spacer and dot go away.

**Add Share to session card** — in `renderSessionList()` HTML template, add a share icon button before the export button:
```js
+'<button class="sess-card-act" onclick="event.stopPropagation();shareSession(\''+s.convId+'\')" title="Share">'+ICON_SHARE+'</button>'
```

**Auto-read active chip in header** — when auto-read is on, show a dismissible chip in the `shell-partner` header row:
- New HTML element after `#shell-partner-name`: `<div id="autoread-chip" hidden style="...teal pill...">🔊 Auto-read <button onclick="toggleAutoRead()">✕</button></div>`
- `updateAutoReadBtn()` (line 2065) currently sets button color; update it to instead call new `syncAutoReadState()` which: shows/hides `#autoread-chip`, updates `#set-autoread` checkbox if settings is open.

**`updateDot()` function** — simplify body to only call `updatePresenceIndicators()` (remove dot element lookup since `#shell-dot` is removed). Keep function name as many call sites use it.

**`forceReconnect()` function** — the dot was its only UI trigger (onclick on `#shell-dot`). Keep function (may be called by other code or useful for debugging); just remove the trigger element.

---

## Critical Files
- `/home/user/joy/test.html` — all changes in one file

## Key Functions to Modify
| Function | Location | Change |
|---|---|---|
| `startHeartbeatLoop` | line 1456 | use `Math.max(lastPongAt\|\|0,lastRxAt\|\|0)` |
| `onopen` handler | line 1510 | remove `rcAttempts=0` from line 1513 |
| hello handler | line 2113 | capture wasEverSeen before markPeerSeen; gate toast |
| `saveLocalName` | line 1654 | propagate name to sessions + resend hello |
| `updateDot` | line 1630 | simplify to just call `updatePresenceIndicators()` |
| `updateAutoReadBtn` | line 2065 | replace with `syncAutoReadState()` |
| `renderSessionList` | line 1856 | add share icon button to session card HTML |
| `applyBubbleTheme` | line 3087 | add font color override + per-side bubble width |
| `applyGlobalSize` | line 3177 | remove val-span DOM write |
| `applyTargetSize` | line 3179 | remove val-span DOM write |
| `applyGlobalWidth` | line 3176 | remove val-span DOM write |
| `resetAllBubbleDefaults` | line 3066 | clear new prefs + call `updateLangPill` |
| `openSettings` | line 3036 | init all new fields (font color, tgt width, autoread, lang pill) |

## Constants to change
```
HEARTBEAT_MS:     10000 → 30000
PING_TIMEOUT_MS:  25000 → 120000
RECONNECT_MAX_MS: 20000 → 180000
```

## Verification
1. **Heartbeat:** Open solo session. Tab stays connected for 2+ minutes without reconnecting. Diagnostics show no "HEARTBEAT timeout" during solo idle.
2. **Name display:** Open session from invite link — partner name in header shows the other device's name (not "?") after first hello.
3. **Name change:** Edit name in sidebar → partner's header updates within one hello cycle.
4. **Toast dedup:** Partner reconnects repeatedly → "X joined!" only shows on first join (or after 5-min gap), not every reconnect.
5. **Translation routing:** S23 opens settings → sets language to Thai → sends a message → Laptop receives it as Thai → Laptop's reply shows tgt=th in diagnostics.
6. **Settings:** Language pill at top (Auto option present); Appearance is two-column Me/Partner table; Translation Behavior group gone; Data is 2×3 grid; Reset All Settings button present.
7. **Ribbon:** Only hamburger button. Share icon on each session card. Auto-read chip appears in header when on; tap chip or × dismisses it.
