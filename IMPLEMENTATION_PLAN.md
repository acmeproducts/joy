# Build Plan — Talk + Say v3.4 (`test.html`)

Prepared: March 28, 2026  
Inputs reviewed:
- `test.html` current implementation
- `talk-say-v34-spec.md` revised instructions
- `talk-say-v34-tests.md` revised test guidance

## 1) Codebase review findings (current state)

1. Names are still primarily `myName/peerName`; `myHandle/partnerHandle/globalName` are not first-class yet.
2. Left-panel editable name (`#left-local-name`, `.left-name`) still exists and calls `saveLocalName()`.
3. Partner header label is currently editable (`#shell-peer-name` has `contenteditable` and edit handlers).
4. Ribbon still contains legacy auto-read bar (`#autoread-bar`) and does not match final v3.4 target layout.
5. Presence runtime tracks last seen in memory; persistence behavior requires hardening.

## 2) Expert questions resolved before implementation

### Q1: Should v3.4 migrate old stored sessions or support dual-read forever?
**Decision:** Dual-read + dual-write in v3.4 (no destructive migration) to avoid user data loss risk.

### Q2: Should session keying ever depend on names?
**Decision:** No. `convId` remains sole primary key; names are display-only.

### Q3: During inline owner-name edit, can incoming hello events update presence dots?
**Decision:** Yes. Block only owner-label rerender while editing; keep presence updates live.

### Q4: Where should language selection live after redesign?
**Decision:** Ribbon globe opens dedicated bottom-sheet modal; remove legacy settings row.

### Q5: Should old bubbles update when names change?
**Decision:** No retroactive edits; new names apply only to newly stamped bubbles.

## 3) Implementation phases

### Phase 1 — Data model + normalization
- Update `normalizeSession()` to support handles and persisted `peerLastSeenAt`.
- Update prefs accessors to support `globalName` with `userName` fallback.
- Ensure all session writes preserve compat aliases.

### Phase 2 — Identity UX
- Add onboarding gate for missing global name.
- Update new-session creation flow with edit-detection and 2-option branching.
- Make owner header name editable inline with save prompt options.
- Make partner header strictly read-only.
- Add rename conflict detection against existing computed labels.

### Phase 3 — Presence + labeling
- Update `getSessionLabel()` to `my / partner` format with invite fallback.
- Update hello ingestion (`upsertPartnerFromEnvelope`) to fill handle fields.
- Persist `peerLastSeenAt` on every `markPeerSeen()` update.
- Update joined-note messaging and dedup logic.

### Phase 4 — Ribbon/settings refactor
- Rebuild ribbon controls into final target order.
- Remove legacy autoread bar and displaced controls.
- Add language picker modal using existing overlay/sheet patterns.
- Remove left-panel editable name UI and related CSS.

### Phase 5 — Bubble stamping and regression pass
- Switch `stampMsgNames()` to handle-first logic.
- Validate no regressions in translation, phrasebook, clarify, tags, import/export, TTS/STT.

## 4) File-level change scope

Primary file:
- `test.html` (all runtime/UI changes)

Planning/docs (already revised):
- `talk-say-v34-spec.md`
- `talk-say-v34-tests.md`

## 5) Validation plan

Execute P0 subset first:
- T100, T101, T200, T202, T301, T306, T400, T500, T501, T900

Then full matrix in `talk-say-v34-tests.md`.

## 6) Delivery criteria

A build is ready when:
1. P0 matrix passes.
2. No regression failures in feature smoke tests (F-series).
3. Session data survives reload with old and new fields.
4. UI matches v3.4 ribbon/header/settings placement rules.
