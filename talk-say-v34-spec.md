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
- Any legacy settings-drawer/overlay language rows are inactive or removed from active UX.
- Language selection opens a single language selector surface.

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
- Maintain compatibility aliases:
  - `myName` mirrors `myHandle`
  - `peerName` mirrors `partnerHandle`

### 3.2 Ownership semantics
- Local owner data remains local-owner role across all rendering and sync.
- Remote participant data remains remote role across join/rejoin and sync merge.
- “Mine is mine / yours is yours” must hold after reconnect/backfill/history-sync.

### 3.3 Label generation and collisions
- Session label uses `myHandle / partnerHandle` when partner known.
- If partner unknown: `myHandle / Invite Pending — [timestamp]`.
- Rename that would collide with another session label is rejected with explicit conflict message.

## 4) Presence/join-note contract

1. On `hello`, partner identity must be upserted **before** join-note decision.
2. Join notes must never fall back to generic `Partner joined` when partner name is unresolved.
3. Transport noise (`ping`, `pong`, `history-sync`) must not trigger join semantics.
4. Heartbeat/backfill traffic must not emit spurious “joined” notes.

## 5) Language behavior contract

1. Outgoing hello language uses effective preferred language (manual selection or auto-detected fallback).
2. Incoming translation target is always receiver preferred language (`sess.myLang`/prefs), not inferred from latest typed input.
3. **Preference override rule:** if user preference is Spanish and user types English, incoming responses still target Spanish.

## 6) Multi-device sync merge contract

1. History-sync payloads are merged in chunks.
2. Merge must reconcile role ownership (remote-relative roles mapped to local-relative roles) to prevent inversion.
3. Merge preserves deterministic ordering/stability (timestamp + deterministic tie-break).
4. Merge does not clobber existing ownership metadata or role semantics.

## 7) Acceptance criteria

v3.4 is complete when all are true:
1. Canonical single-path language UX is enforced.
2. Header-only owner editing is enforced; partner is display-only.
3. Join-note race/noise issues are resolved per contract.
4. Ownership-role integrity holds across same-owner multi-device sync.
5. Preferred language targeting rule is preserved in mixed-language input behavior.
6. Tests in `talk-say-v34-tests.md` (including negative/counter gates) are tracked with truthful pass/fail status.
