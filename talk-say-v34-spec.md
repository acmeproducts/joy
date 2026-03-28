# Talk + Say · v3.4 — Release Build Specification

> **Prepared:** March 23, 2026  
> **Baseline:** test.html (Joy build 2026-03-17 + talk-signal transport patch)  
> **Relay:** talk-signal.myacctfortracking.workers.dev · worker-talk.js · **off-limits**

**Purpose:** Complete specification for the v3.4 release of `test.html`. Written in two forms: a human-readable outline (Sections 1–6) and a machine-readable AI prompt (Section 7). Section 8 is the test plan. No other documents or prior conversation context are needed to execute this build.

---

## 1. Context and Constraints

Talk + Say (`test.html`) is a single-file bilingual chat and phrasebook PWA. It connects two people via a Cloudflare Durable Object WebSocket relay (`talk-signal.myacctfortracking.workers.dev`). The relay is off-limits — no changes to `worker-talk.js` are permitted in this release.

The file is self-contained. All logic, markup, and styles live in one HTML file. The current baseline is the Joy build of `test.html` (Build 2026-03-17, subsequently patched with the talk-signal transport rewrite).

> **Do not touch:** `worker-talk.js` · `wrangler-talk.toml` · any relay infrastructure · the phrasebook bubble renderer · the back-translate system · the clarify system · the tag system · the export/import system · the translation engine (MyMemory + on-device) · the TTS/STT system.

---

## 2. Data Model Changes

### 2.1 Session Record

The session record stored in localStorage under key `ts3_sessions` gains two new fields. All existing fields are preserved unchanged.

```js
// ADD to session record — do not remove any existing fields
myHandle:      string   // session-specific display name for the device owner
                        // defaults to prefs.userName on session creation
                        // independent per session, never propagates to other sessions
partnerHandle: string   // display name announced by the partner via hello
                        // set by incoming hello events, read-only on this device
peerLastSeenAt: number  // unix ms timestamp — persisted to localStorage
                        // previously in-memory only; now written on every markPeerSeen()
```

> **Key rule:** The session GUID (`convId`) remains the true primary key. `myHandle` + `partnerHandle` is a display label only, never used as a lookup key. Name changes never cause key migrations.

### 2.2 Prefs Record

One new field added to the prefs record stored under key `ts3_prefs`.

```js
// ADD to prefs
globalName: string  // the onboarding name — the factory default for new sessions
                    // replaces the old userName field as the canonical global identity
                    // userName is kept as a compat alias during this release
```

### 2.3 normalizeSession() Update

Update `normalizeSession()` to populate the two new fields with safe defaults:

```js
myHandle:      raw.myHandle      || raw.myName    || p.globalName || p.userName || ""
partnerHandle: raw.partnerHandle || raw.peerName  || ""
peerLastSeenAt: Number(raw.peerLastSeenAt) || 0
```

> Do not remove `myName` or `peerName` from `normalizeSession` — keep them as compat aliases that mirror `myHandle` and `partnerHandle` respectively. This prevents regressions in any code that still reads those fields.

---

## 3. Identity and Name Editing

### 3.1 Global Name (Onboarding)

The global name is set once at onboarding. It is stored in `prefs.globalName`. It is the default pre-populated value for every new session. It is never directly editable from within an active conversation.

- On first app load if `prefs.globalName` is empty or `"yournamehere"`, show a full-screen onboarding prompt: a centered input field with placeholder `"What's your name?"` and a single Continue button. No other UI is shown until a non-empty name is submitted.
- Save the submitted name to `prefs.globalName`. Dismiss the onboarding prompt.
- Never show the onboarding prompt again once `prefs.globalName` is set.

### 3.2 New Conversation Name (+ Button Flow)

When the user taps + to create a new session, before generating the invite:

- Show a compact inline name field pre-populated with `prefs.globalName`.
- The user may edit it or proceed as-is.
- If the user edits the name, show two options before proceeding:
  - **"Use for this chat only"** — sets `session.myHandle` only, `prefs.globalName` unchanged.
  - **"Also update my default name"** — sets `session.myHandle` AND `prefs.globalName`.
- If the user does not edit the name, no prompt is shown — proceed directly.
- Session is created with `myHandle` set to whatever name was confirmed.

### 3.3 In-Session Name Editing (Chat Header)

The device owner's name in the chat session header is tappable and editable inline. The partner's name in the header is display-only — not editable, not `contenteditable`.

- Tapping the owner name in the header activates inline editing on that element only.
- On blur (focus lost) with a changed value, show the two-option prompt:
  - **"Update for this chat only"** — updates `session.myHandle`, `prefs.globalName` unchanged.
  - **"Also update my default name"** — updates `session.myHandle` AND `prefs.globalName`.
- On confirmation, send a `hello` event with the new name so the partner sees the update immediately.
- Previous chat bubbles in this session retain the name that was stamped at send time. Only new bubbles use the updated name.
- If the changed name would create a session card label (`myHandle / partnerHandle`) identical to an existing session, abort the rename and show a conflict alert:
  - *"A session with this name already exists. Delete that session and continue, or choose a different name."*
- Do not edit the partner name from the header under any circumstances.

### 3.4 Header Re-Render Guard

The header currently re-renders on every incoming hello, canceling any in-progress edit. Fix this without changing the render logic:

```js
// In updatePartnerHeader() — add this guard at the top of the function
var ownerLabel = document.getElementById("shell-self-name");
var ownerLabelEl = ownerLabel && ownerLabel.querySelector(".shell-participant-label");
if (ownerLabelEl && document.activeElement === ownerLabelEl) return; // edit in progress
```

> This guard must not suppress presence dot updates. Call `updatePresenceIndicators()` unconditionally after the guard — only skip the name label re-render.

### 3.5 Remove Name Field from Hamburger Settings Drawer

The `left-name` contenteditable span currently in the left panel header (above the settings gear) must be removed.

- Remove the `left-name` span and its `saveLocalName()` onblur handler from the DOM.
- Remove the `.left-name` CSS class and its hover/focus styles.
- Do not remove `saveLocalName()` from JavaScript — redirect it to update `session.myHandle` only.
- The left panel top row now contains only the gear icon. Remove gap spacing that accounted for the name span.

### 3.6 Bubble Name Stamping

Chat bubbles stamp `displayFromName` at send time from `session.myHandle` (not `session.myName`). Previously stamped bubbles are never retroactively updated.

```js
// In stampMsgNames() — update to use myHandle
msg.displayFromName = s.myHandle || s.myName || "Me";           // mine
msg.displayFromName = s.partnerHandle || s.peerName || "Partner"; // theirs
```

### 3.7 Session Card Label

The session list card title displays **myHandle / partnerHandle**. Update `getSessionLabel()` and `renderSessionList()`:

```js
function getSessionLabel(sess) {
  var s = sess ? normalizeSession(sess) : null;
  var peer = firstRealName(s && s.partnerHandle) || firstRealName(s && s.peerName);
  var me   = firstRealName(s && s.myHandle)      || firstRealName(s && s.myName);
  if (peer) return me ? me + " / " + peer : peer;
  var ts = s && s.createdAt ?
    new Date(s.createdAt).toLocaleString([], {month:"short",day:"2-digit",
      hour:"2-digit",minute:"2-digit"}) : "";
  return me ? me + " / Invite Pending" + (ts ? " — " + ts : "") : "New Chat";
}
```

### 3.8 upsertPartnerFromEnvelope() Update

When a hello arrives from the partner, update `partnerHandle` on the session record:

```js
var partnerName = firstRealName(d.name, sess.partnerHandle, sess.peerName);
if (partnerName) {
  sess.partnerHandle = partnerName;
  sess.peerName = partnerName;  // compat alias
}
```

### 3.9 Persist peerLastSeenAt

`peerLastSeenAt` is currently stored only in the in-memory `roomRuntimeByConv` object. Fix: write it to the session record on every update.

```js
// In markPeerSeen() — after updating rt.peerLastSeenAt
var sess = getSession(convId);
if (sess) {
  sess.peerLastSeenAt = stamp;
  putSession(sess);
}

// In normalizeSession() — restore it
var rt = getRoomRuntime(out.convId);
if (rt && out.peerLastSeenAt) rt.peerLastSeenAt = out.peerLastSeenAt;
```

---

## 4. Header and Ribbon Redesign

### 4.1 Ribbon — New Layout

The ribbon is a single horizontal row. Three items only, no labels, no words:

```
[Hamburger]  [Phrasebook]  [Globe]  ————————————  [Auto-read toggle]
```

- **Hamburger** (left) — existing SVG, existing `openLeftPanel()` behavior. No change.
- **Phrasebook icon** (center-left) — open book SVG. Calls `openPhrasebookModal()`. Moved from settings drawer to ribbon.
- **Globe icon** (center-left, after phrasebook) — opens language picker modal (see 4.2). Shows the flag of the currently selected language, or 🌐 if Auto.
- **Spacer** — `flex:1`, pushes auto-read toggle to the right.
- **Auto-read toggle** (right) — an SVG speaker icon with an inline on/off slide switch. No label. When off: grey. When on: teal. Replaces the `autoread-bar` strip entirely.

> **Remove:** ribbon-share button · autoread-btn ribbon button · autoread-bar strip with dismiss X · phrasebook row from settings drawer · auto-read row from settings drawer · language picker row from settings drawer.

### 4.2 Language Picker Modal

Tapping the globe icon opens a bottom sheet modal (using the existing `.sheet` / `.overlay` pattern):

- Title: **"Your Language"**
- First option: Auto-detect — 🌐 globe icon, label "Auto-detect", selected by default if no language is set.
- Then all 21 LANGS entries: flag emoji + full language name. No two-letter abbreviations.
- Active selection shown with a teal checkmark on the right.
- Tapping any row calls `setMyLang(code)`, closes the modal, updates the globe button.
- No search field — 21 languages fits on one scroll without it.

> The globe icon in the ribbon always reflects current state: 🌐 for Auto, or the flag emoji of the selected language.

### 4.3 Partner Presence Header

- Owner name (left side): tappable to edit inline. See section 3.3.
- Partner name (right side): display only. Remove `contenteditable`, `onblur`, and `onkeydown` from `shell-peer-name`.
- Presence dots: unchanged.
- **"Partner joined"** system note → replace with actual partner name. Format: `"[PartnerHandle] joined"`.
- **"You joined"** system note: suppress if one already exists in this session within the last 5 minutes.

### 4.4 Delivery Status Tooltip

```html
<!-- Single dot — sent -->
<span class="msg-status sent" title="Sent [fmtTime(msg.timestamp)]">

<!-- Double dot — delivered -->
<span class="msg-status delivered" title="Delivered [fmtTime(msg.deliveredAt || msg.timestamp)]">
```

```js
// Stamp when ack received
msg.deliveredAt = Date.now();
```

> `deliveredAt` is not persisted to localStorage — it is ephemeral. Falls back to send timestamp on reload.

---

## 5. Multi-Device Support

### 5.1 Overview

A participant may use multiple devices in the same session. Gaps: (a) message history not available on second device, (b) messages from the other device render as "theirs", (c) share URL would create a new session.

### 5.2 PART_ID as Participant Identity

`PART_ID` (stored in `ts3_part`) is the stable participant identifier. For multi-device, both devices must share the same `PART_ID`.

- When a second device opens a device-join URL, the `PART_ID` from the URL overwrites any existing `PART_ID` in localStorage.
- Messages where `msg.participant === PART_ID` render as "mine" regardless of which `DEVICE_ID` sent them.

```js
// In renderMsg() and getSides()
var isMine = msg.from === DEVICE_ID || msg.participant === PART_ID;
```

### 5.3 Device-Join URL (Session Card Share Icon)

```js
// Device-join URL structure
?devicejoin=<base64-encoded-payload>

// Payload
{
  sessionId:    string,   // the session GUID
  partId:       string,   // PART_ID of the originating device
  myHandle:     string,   // session-specific display name
  partnerHandle:string,   // partner display name
  token:        string,   // hash for tamper detection
  createdAt:    number,
  schemaVersion:1
}
```

- The share icon calls `shareDeviceJoin(convId)` not `shareSession(convId)`.
- URL is NOT the same as the partner invite URL.
- Address bar URL contains no session parameters — opens app fresh.

### 5.4 Token Generation (Client-Side Signing)

```js
function buildDeviceJoinToken(sessionId, partId, createdAt) {
  var raw = sessionId + "|" + partId + "|" + String(createdAt);
  var hash = 0;
  for (var i = 0; i < raw.length; i++) {
    hash = Math.imul(31, hash) + raw.charCodeAt(i) | 0;
  }
  return Math.abs(hash).toString(36);
}

function verifyDeviceJoinToken(payload) {
  var expected = buildDeviceJoinToken(
    payload.sessionId, payload.partId, payload.createdAt);
  return expected === payload.token;
}
```

### 5.5 Receiving a Device-Join URL

On page load, check for `?devicejoin=` before checking for `?invite=`:

1. Decode and validate payload. If token fails: toast `"This link is not valid. Use the share icon on the session card."` — stop.
2. Write `payload.partId` to localStorage as `PART_ID`.
3. Look up session by `payload.sessionId`. If not found locally, create it.
4. Connect to the relay session.
5. Fetch full history: call `fetchBackfill()` with `since=0` to retrieve all stored messages.
6. Render history. Messages where `msg.participant === PART_ID` render as "mine".
7. Clear the `?devicejoin=` param from the URL using `history.replaceState`.

### 5.6 Session Card Share Icon Behavior

Change session card share icon from `shareSession()` to `shareDeviceJoin()`. The partner invite flow (QR + Copy + Share buttons in the message thread) continues to generate partner invite URLs — do not change that flow.

---

## 6. Bug Fixes

### 6.1 "You joined" Appears Multiple Times

Extend dedup check to 5 minutes; also check across full message history:

```js
// In noteRuntimeJoin() — replace the existing cutoff check
var cutoff = now - (5 * 60 * 1000);  // 5 minutes
var msgs = (convId === state.activeConvId)
  ? state.messages : (getMsgs(convId) || []);
if (msgs.some(function(m) {
  return m.from === "system" && m.text === text && m.timestamp > cutoff;
})) return;
```

### 6.2 Typing Indicator Persists Too Long

```js
typingTimer = setTimeout(function() { if(el) el.textContent=""; }, 1500);
```
*(was 3000ms)*

### 6.3 "Partner joined" Uses Hardcoded String

```js
// In markPeerSeen()
var sess = getSession(convId);
var pName = (sess && firstRealName(sess.partnerHandle, sess.peerName)) || "Partner";
noteRuntimeJoin(convId, "peerJoin", pName + " joined", stamp);
```

### 6.4 Footer Version Label

Change `"Test Version for Joy"` → `"Talk + Say · v3.4"`

### 6.5 HTML Comment Build Stamp

```html
<!-- Talk + Say · v3.4 · Build 2026-03-23 -->
```

---

## 7. AI Execution Prompt

> **Instructions:** Paste the content below verbatim as the prompt. Attach the current `test.html` as the file to modify. No other context is needed.

---

```
You are modifying a single-file HTML application: test.html (Talk + Say v3.4).
Read the entire file before making any changes. Then apply the following changes
in order. After all changes, run a self-audit: search for every function name
referenced in the changes and confirm it exists. Search for every removed element
and confirm it is gone. Output the complete modified file.

CONSTRAINTS — do not change anything not listed below:
- worker-talk.js and the relay infrastructure are off-limits
- The phrasebook bubble renderer (buildBubbleCard) must not change
- The back-translate, clarify, tag, export/import systems must not change
- The translation engine (translate()) must not change
- The TTS/STT systems must not change
- The transport layer (transportConnect, transportSend, etc.) must not change
- CSS variable names and the :root block must not change

═══════════════════════════════════════════════
SECTION A — DATA MODEL
═══════════════════════════════════════════════

A1. In normalizeSession(), add two new output fields after the existing ones:
    myHandle:       raw.myHandle || raw.myName || p.globalName || p.userName || ""
    partnerHandle:  raw.partnerHandle || raw.peerName || ""
    peerLastSeenAt: Number(raw.peerLastSeenAt) || 0
    Keep myName and peerName as-is (compat aliases).

A2. In getPrefs(), add globalName to the defaults object:
    globalName: ""
    Keep userName as-is.

A3. In markPeerSeen(), after updating rt.peerLastSeenAt, write it to the session:
    var sess = getSession(convId);
    if (sess) { sess.peerLastSeenAt = stamp; putSession(sess); }

A4. In DOMContentLoaded init, after restoring sessions, restore peerLastSeenAt
    into the runtime for the active session:
    var rt = getRoomRuntime(state.activeConvId);
    var sess = state.activeConvId && getSession(state.activeConvId);
    if (rt && sess && sess.peerLastSeenAt) rt.peerLastSeenAt = sess.peerLastSeenAt;

═══════════════════════════════════════════════
SECTION B — IDENTITY AND NAME EDITING
═══════════════════════════════════════════════

B1. ONBOARDING PROMPT — Add a full-screen overlay with id="onboarding-overlay"
    that shows when prefs.globalName is empty or "yournamehere":
    - A centered input field, placeholder "What's your name?", maxlength 40
    - A "Continue" button that saves the value to prefs.globalName and
      prefs.userName (compat), hides the overlay, and proceeds with normal init
    - Style: position:fixed; inset:0; background:var(--cream); z-index:500;
      display:flex; flex-direction:column; align-items:center;
      justify-content:center; gap:16px;
    - Show the app logo (Lora font, "talk", same as shell-empty-logo) above the input
    - Check for and show this overlay at the END of DOMContentLoaded,
      after all other init is complete

B2. NEW SESSION FLOW — In createNewSession(), before putSession():
    - Show a compact sheet overlay with:
      - An input pre-populated with prefs.globalName
      - Two buttons: "Start Chat" (primary) and a small "x" to cancel
      - Below the input, only if the user has edited the value, show:
        [ ] Also update my default name
        (a checkbox, unchecked by default)
    - On "Start Chat": set sess.myHandle to the input value.
      If checkbox is checked, also set prefs.globalName = input value.
      Save prefs. Then proceed with the existing session creation logic.
    - On cancel: do nothing, close the sheet.

B3. SESSION HEADER NAME EDIT — The shell-self-name element contains a
    shell-participant-label span. Make ONLY that inner span contenteditable,
    not the outer element. Add:
    - contenteditable="true" spellcheck="false" on the inner label span
    - onblur="saveSessionHandle(this)" on the inner label span
    - onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}"

    Write saveSessionHandle(el):
    function saveSessionHandle(el) {
      var v = (el.textContent || "").trim();
      if (!v || !state.activeConvId) { return; }
      var sess = getSession(state.activeConvId);
      if (!sess || v === sess.myHandle) return;
      // Collision check
      var wouldBe = v + "/" + (sess.partnerHandle || sess.peerName || "");
      var collision = getAllSessions().find(function(s) {
        return s.convId !== sess.convId &&
          (s.myHandle||s.myName||"") + "/" + (s.partnerHandle||s.peerName||"")
            === wouldBe;
      });
      if (collision) {
        toast("A session with this name already exists. Choose a different name.");
        el.textContent = sess.myHandle || sess.myName || getPrefs().globalName;
        return;
      }
      var choice = confirm(
        "Update name to \"" + v + "\"\n\n" +
        "OK = this chat only\nCancel = also update default name"
      );
      sess.myHandle = v;
      sess.myName = v;
      if (!choice) {
        var p = getPrefs(); p.globalName = v; p.userName = v; savePrefs(p);
      }
      putSession(sess);
      updatePartnerHeader(sess);
      renderSessionList();
      if (connectedConvId && ws && ws.readyState === 1) {
        transportSend({type:"hello", transient:true,
          name:v, lang:sess.myLang||getPrefs().myLang||"en"});
      }
      toast("Name updated");
    }

B4. PARTNER NAME — Remove contenteditable, onblur, and onkeydown from
    shell-peer-name and its inner label span. Make it display-only.
    Stub out savePartnerName(): function savePartnerName(el) {}

B5. REMOVE left-name element from the left panel header:
    - Remove the span with id="left-local-name" and class="left-name"
    - Remove its contenteditable, onblur, onkeydown attributes
    - Remove the .left-name CSS rule block (hover and focus variants too)
    Stub saveLocalName(): function saveLocalName(el) {}

B6. UPDATE stampMsgNames() to use myHandle:
    msg.displayFromName = s.myHandle || s.myName || "Me";
    msg.displayFromName = s.partnerHandle || s.peerName || "Partner";

B7. UPDATE getSessionLabel() per Section 3.7.

B8. UPDATE upsertPartnerFromEnvelope() to set partnerHandle per Section 3.8.

B9. HEADER RE-RENDER GUARD — At the top of updatePartnerHeader():
    var ownerLbl = document.querySelector("#shell-self-name .shell-participant-label");
    if (ownerLbl && document.activeElement === ownerLbl) {
      updatePresenceIndicators();
      return;
    }

═══════════════════════════════════════════════
SECTION C — RIBBON AND HEADER REDESIGN
═══════════════════════════════════════════════

C1. RIBBON HTML — Replace entire shell-ribbon div with:
    hamburger | phrasebook | globe | spacer | autoread-icon+toggle

C2. RIBBON CSS:
    .ribbon-autoread { display:flex; align-items:center; gap:2px; }
    #ribbon-autoread-icon { color:var(--ink-dim); }
    #ribbon-autoread-icon.active { color:var(--teal); }

C3. REMOVE: autoread-bar div, .autoread-bar, .autoread-mute-btn,
    .autoread-dismiss-btn CSS. Remove muteAutoRead() and dismissAutoRead().

C4. UPDATE syncAutoReadState():
    var on = !!state.autoSpeakIncoming;
    var icon = document.getElementById("ribbon-autoread-icon");
    var toggle = document.getElementById("ribbon-autoread-toggle");
    if (icon) icon.classList.toggle("active", on);
    if (toggle) toggle.checked = on;

C5. LANGUAGE MODAL — Add overlay id="lang-modal-overlay" using .overlay/.sheet
    pattern. Content: "Your Language" title, 🌐 Auto-detect first, then 21 LANGS
    rows (flag + full name, no abbreviations). Teal checkmark on active row.
    Add openLangModal() and closeLangModal() functions.

C6. UPDATE updateLangPill() to update ribbon-lang-flag:
    var myLang = getPrefs().myLang || "";
    if (!myLang) { flag.textContent = "🌐"; return; }
    var entry = LANGS.find(function(l){return l.code===myLang;});
    flag.textContent = entry ? entry.flag : "🌐";

C7. REMOVE from settings drawer: phrasebook row, auto-read row, language picker
    row. Remove id="ribbon-share" button from ribbon entirely.

C8. "Partner joined" note — update markPeerSeen() to use actual name (C10).

C9. PARTNER NAME in header: remove contenteditable from shell-peer-name.

C10. "You joined" dedup — update noteRuntimeJoin() cutoff to 5 minutes (300000ms).

═══════════════════════════════════════════════
SECTION D — MULTI-DEVICE
═══════════════════════════════════════════════

D1. Add buildDeviceJoinToken(sessionId, partId, createdAt) per Section 5.4.

D2. Add shareDeviceJoin(convId) function per Section 5.3.

D3. Update renderSessionList() — change session card share icon from
    shareSession() to shareDeviceJoin().

D4. In DOMContentLoaded, check for ?devicejoin= BEFORE ?invite=.
    Decode, verify token, adopt PART_ID, create/load session,
    connect, fetch backfill with since=0, clear URL param.

D5. Update the "mine" check in getSides() and renderMsg():
    var isMine = msg.from === DEVICE_ID || msg.participant === PART_ID;

D6. Add verifyDeviceJoinToken(payload) per Section 5.4.

═══════════════════════════════════════════════
SECTION E — BUG FIXES
═══════════════════════════════════════════════

E1. Typing indicator: change 3000 to 1500 in showTyping().

E2. deliveredAt stamp: add msg.deliveredAt = Date.now() in ack handler.
    Add title="Delivered [fmtTime]" to delivered status dot in buildBubbleCard().

E3. Footer label: "Test Version for Joy" → "Talk + Say · v3.4"

E4. HTML comment line 1: update build stamp to 2026-03-23.

═══════════════════════════════════════════════
SELF-AUDIT BEFORE OUTPUT
═══════════════════════════════════════════════

Before outputting the file, verify:
1.  saveSessionHandle() defined, called from inner label span onblur
2.  openLangModal() and closeLangModal() defined
3.  shareDeviceJoin() defined, used in renderSessionList()
4.  buildDeviceJoinToken() and verifyDeviceJoinToken() defined
5.  onboarding-overlay exists in DOM
6.  lang-modal-overlay exists in DOM
7.  left-local-name element GONE from DOM
8.  autoread-bar div GONE from DOM
9.  shell-peer-name has NO contenteditable attribute
10. Ribbon has exactly: hamburger, phrasebook, globe, spacer, autoread-toggle
11. No reference to sendInitialHello() anywhere
12. No reference to shouldDropInboundDuplicate() anywhere
13. normalizeSession() returns myHandle and partnerHandle
14. getSessionLabel() returns "me / partner" or "me / Invite Pending — datetime"
15. syncAutoReadState() updates ribbon-autoread-toggle and ribbon-autoread-icon
```

---

## 8. Test Plan

See companion document: **`talk-say-v34-tests.md`**

Tests T101–T905 · Use Cases UC-1–UC-8 · English / Thai dual-language

---

## Key Constants

```js
RELAY_BASE      = 'talk-signal.myacctfortracking.workers.dev/signal'
RELAY_WS_URL    = 'wss://' + RELAY_BASE
RELAY_HTTP_URL  = 'https://' + RELAY_BASE
RELAY_APP       = 'talk-say-v1'
HEARTBEAT_MS    = 30000
PING_TIMEOUT_MS = 120000
RECONNECT_MAX_MS= 180000
```

**Storage keys:** `ts3_sessions` · `ts3_active` · `ts3_prefs` · `ts3_dev` · `ts3_part` · `ts3_order` · `ts3_recycled` · `ts3_notes` · `say_catalogs` · `say_cards` · `say_tags`
