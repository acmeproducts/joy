# Talk + Say v3.4 Specification (Vetted Against `test.html`)

Prepared: March 28, 2026  
Target runtime file: `test.html` only  
Out of scope: relay worker (`worker-talk.js`), wrangler configs, non-target HTML files.

## 1) Scope and baseline

This spec is revised to match the current code in `test.html` (title currently `v3.3`) and defines **only** changes required for v3.4.

### Guardrails
- Keep single-file architecture.
- Do not remove phrasebook, clarify, back-translate, tags, import/export, STT/TTS, or translation providers.
- Do not migrate storage keys.
- Preserve backwards compatibility for existing sessions/prefs.

## 2) Data model updates (must be backward compatible)

### Session object (`ts3_sessions`)
Add and normalize:
- `myHandle: string`
- `partnerHandle: string`
- `peerLastSeenAt: number`

Compatibility aliases must remain:
- Existing `myName` and `peerName` remain readable/writable.
- `normalizeSession()` maps old and new fields both directions.

Required normalization behavior:
- `myHandle <- raw.myHandle || raw.myName || prefs.globalName || prefs.userName || ""`
- `partnerHandle <- raw.partnerHandle || raw.peerName || ""`
- `peerLastSeenAt <- Number(raw.peerLastSeenAt) || 0`
- Also mirror `myName=myHandle` and `peerName=partnerHandle` before return.

### Prefs object (`ts3_prefs`)
Add canonical field:
- `globalName: string`

Compatibility:
- Keep `userName` as alias during v3.4.
- Reads should prefer `globalName`, fallback to `userName`.

## 3) Identity UX

### 3.1 Onboarding gate (global name required)
- If no usable `prefs.globalName` exists (empty or `"yournamehere"`), show blocking onboarding overlay.
- Prompt: `What's your name?`
- Continue button remains disabled until non-empty trimmed value.
- Save to `prefs.globalName`; do not show gate again once set.

### 3.2 New-session naming
Before creating a new session from `+`:
- Pre-fill name input with `prefs.globalName`.
- If unchanged: create session immediately.
- If changed: show two-choice confirmation:
  - `Use for this chat only`
  - `Also update my default name`

### 3.3 Header editing rules
- Owner name (`shell-self-name`) is editable inline.
- Partner name (`shell-peer-name`) becomes display-only (remove `contenteditable`, blur, keydown editing handlers).
- On owner rename blur with changed text, prompt same two choices as above.
- Any accepted owner rename sends hello update immediately.
- Existing bubbles keep historical display names.

### 3.4 Rename conflict rule
If resulting session label (`myHandle / partnerHandle`) equals another existing session label:
- Abort rename.
- Show: `A session with this name already exists. Delete that session and continue, or choose a different name.`

## 4) Presence and session labeling

### 4.1 Session labels
`getSessionLabel(sess)` must display:
- `myHandle / partnerHandle` when partner known.
- Else `myHandle / Invite Pending — [timestamp]`.
- Fallback `New Chat`.

### 4.2 Partner hello ingestion
`upsertPartnerFromEnvelope()` must write:
- `partnerHandle` + compatibility `peerName`.

### 4.3 Persist last seen
`markPeerSeen()` must persist `peerLastSeenAt` to session record via `putSession(sess)`.
`normalizeSession()` must rehydrate runtime from stored value.

### 4.4 Join system notes
- Replace `Partner joined` with `[PartnerHandle] joined`.
- Suppress duplicate `You joined` note if a prior one exists in same session within 5 minutes.

## 5) Ribbon + settings refactor

### 5.1 Ribbon composition
Final ribbon order:
- Hamburger
- Phrasebook icon
- Globe icon (language picker trigger)
- Flexible spacer
- Auto-read toggle (icon + switch, no text label)

Remove from ribbon/settings legacy surfaces:
- Share ribbon button
- Legacy autoread ribbon button
- `autoread-bar` strip
- Phrasebook row in settings drawer
- Auto-read row in settings drawer
- Old language picker row in settings drawer

### 5.2 Language picker modal
Use existing `.overlay` + `.sheet` pattern.
- Title: `Your Language`
- First row: Auto-detect (`🌐`)
- Then all LANGS entries with full language names + flags.
- Selected row shows checkmark.
- Selecting row calls `setMyLang(code)`, closes modal, updates globe icon state.

## 6) Header render guard during edit

`updatePartnerHeader()` must not clobber active owner inline edit.
At top of function:
- detect owner label element
- if activeElement is that label, skip owner-label rewrite
- still run presence indicator updates every call

## 7) Left panel cleanup

- Remove editable `left-name` element from DOM.
- Remove `.left-name` CSS rules.
- Keep `saveLocalName()` function; repurpose to update active session handle only (no orphan references).
- Left top row should contain only gear icon with adjusted spacing.

## 8) Bubble name stamping

`stampMsgNames()` must stamp from handle-first fields:
- mine => `myHandle || myName || "Me"`
- theirs => `partnerHandle || peerName || "Partner"`

No retroactive mutation of old bubbles.

## 9) Acceptance criteria summary

v3.4 is acceptable when:
1. New and legacy sessions both render correctly after reload.
2. Owner rename flows support chat-only vs global update.
3. Partner name cannot be manually edited locally.
4. Session labels use `my/partner` form with pending fallback.
5. Last-seen survives reload.
6. Ribbon/settings match redesigned control placement.
7. No regressions in phrasebook, translation, clarify, tags, import/export, or voice features.
