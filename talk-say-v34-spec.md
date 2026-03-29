# Talk + Say v3.4 Specification (Final Scope-Locked)

Prepared: March 29, 2026  
Primary runtime file: `test.html`

## 1) Scope and constraints

### In scope
- Session identity model hardening (`myHandle`, `partnerHandle`, `peerLastSeenAt` + compat aliases)
- Header identity UX (owner editable inline, partner display-only)
- Canonical language UX (single ribbon-driven path)
- Join-note ordering/noise suppression
- Multi-device ownership-safe history merge

### Out of scope
- Worker/protocol redesign outside existing event types
- New settings surfaces for language/identity editing
- Non-target files beyond:
  - `talk-say-v34-spec.md`
  - `talk-say-v34-tests.md`
  - `IMPLEMENTATION_PLAN.md`

## 2) Canonical UX rules

### 2.1 Language control (single path)
- **Only canonical control:** ribbon language button.
- Any legacy settings-drawer/overlay language rows are inactive and non-canonical.
- Language selection opens a single selector surface.

### 2.2 Owner-name editing (single path)
- **Only canonical owner edit path:** inline edit in session header (`shell-self-name`).
- Partner header name (`shell-peer-name`) is display-only.
- Partner name cannot be edited locally.

## 3) Identity and ownership data contract

### 3.1 Session normalization/persistence
- Persist and normalize:
  - `myHandle`
  - `partnerHandle`
  - `peerLastSeenAt`
  - `autoReplyTargetLang` (auto-mode continuity)
- Maintain compatibility aliases:
  - `myName` mirrors `myHandle`
  - `peerName` mirrors `partnerHandle`

### 3.2 Ownership semantics
- Local owner data remains local-owner role across all rendering and sync.
- Remote participant data remains remote role across join/rejoin and sync merge.
- History-sync merge reconciles remote-relative roles into local-relative roles deterministically.

### 3.3 Label generation and collisions
- Session label uses `myHandle / partnerHandle` when partner known.
- If partner unknown: `myHandle / Invite Pending — [timestamp]`.
- Rename that would collide with another computed session label is blocked with explicit message.

## 4) Presence/join contract

1. On `hello`, partner identity must be upserted **before** join-note decision.
2. Join notes must not emit unresolved generic partner fallback.
3. Transport noise (`ping`, `pong`, `history-sync`, heartbeat/backfill-only traffic) must not trigger join semantics.
4. Presence updates may refresh seen timestamps/online dots while join-note is suppressed.

## 5) Canonical language behavior contract

1. **Canonical incoming target rule:**
   - Explicit owner language override (`myLang !== ''`) wins.
   - Otherwise, auto mode uses `autoReplyTargetLang` (latest owner typed outgoing language).
2. **Auto semantics:** “Auto = what I type is what I get back” unless explicit override is set.
3. Empty-string language override (`''`, auto) is valid persisted state and must not be coerced to `'en'`.
4. Outgoing envelope metadata (`targetLang`) must mirror runtime-computed target semantics.
5. Payload metadata must not contradict runtime language intent (no stale/hardcoded target).

## 6) Multi-device sync merge contract

1. History-sync payloads are merged in chunks.
2. Merge reconciles ownership role (`owner`/`partner`) into local `from` (`me`/`them`) deterministically.
3. Merge preserves deterministic ordering/stability (timestamp + deterministic tie-break).
4. Merge must not invert ownership roles during sync/merge.

## 7) Acceptance criteria

v3.4 is complete when all are true:
1. Canonical single-path language UX is enforced.
2. Header-only owner editing is enforced; partner is display-only.
3. Join-note race/noise issues are resolved per contract.
4. Ownership-role integrity holds across same-owner multi-device sync.
5. Canonical auto-language rule is preserved in mixed-language behavior.
6. Tests in `talk-say-v34-tests.md` (including negative/counter gates) are tracked with truthful pass/fail status.
