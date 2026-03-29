# Implementation Plan — Talk + Say v3.4 (`test.html`)

Prepared: March 29, 2026  
Scope authority: this plan, `talk-say-v34-spec.md`, `talk-say-v34-tests.md`.

## 1) Baseline-first, scope-locked workflow

### 1.1 Pre-work baseline protocol
1. Reset to clean baseline and inspect only approved target files.
2. Record baseline checks before edits (syntax check + targeted runtime smoke where possible).
3. Split work into explicit slices with file touch constraints.

### 1.2 Per-slice scope controls (must pass before commit)
- **Allowed-touch list:** only files explicitly listed in that slice.
- **Forbidden-touch list:** every non-target file and every out-of-scope surface in `test.html`.
- **Pre-commit scope gate:**
  - `git diff --name-only` must only include: `test.html`, `talk-say-v34-spec.md`, `talk-say-v34-tests.md`, `IMPLEMENTATION_PLAN.md`.
  - `git diff` must show no unrelated UI drift (legacy settings language rows, non-header identity editing, unrelated feature regressions).
- **Rollback protocol:** if out-of-scope diff appears, immediately revert that hunk/file and reapply only approved changes.

## 2) Slice plan with allowed/forbidden touch lists

### Slice A — Identity + ownership model in runtime (`test.html`)
**Allowed touch**
- Session normalization/persistence (`myHandle`, `partnerHandle`, `peerLastSeenAt`, compatibility aliases)
- Header identity behavior (owner editable inline only, partner display-only)
- Ownership-safe merge rules for history sync

**Forbidden touch**
- Control-panel identity edit pathways
- Non-header identity UX surfaces
- Unrelated translation/phrasebook logic except ownership-role invariants

### Slice B — Presence/join-note ordering + transport-noise suppression (`test.html`)
**Allowed touch**
- `hello` handling order (partner upsert before join-note decision)
- Join-note emission guards (no generic fallback)
- Suppression for ping/pong/history transport events

**Forbidden touch**
- Relay protocol shape changes
- New event types or storage schema outside v3.4 fields

### Slice C — Canonical language UX path (`test.html`)
**Allowed touch**
- Ribbon-driven language selector path only
- Disable/remove active legacy language controls in settings drawer/overlay
- Ensure hello and translation use effective/preferred language rules

**Forbidden touch**
- Adding another language entry path
- Reintroducing duplicated language controls

### Slice D — Spec/tests alignment (`talk-say-v34-spec.md`, `talk-say-v34-tests.md`)
**Allowed touch**
- Canonical behavior contracts and release-gate tests only

**Forbidden touch**
- Claims of completion not backed by concrete runtime behavior/tests

## 3) Ownership model contract (explicit requirements)

1. **Session ownership semantics**
   - `myHandle` is always local-owner identity for a session on this device.
   - `partnerHandle` is always remote participant identity for that session.
   - Compatibility aliases (`myName`, `peerName`) mirror these roles.

2. **Role rendering consistency across device join**
   - Header and bubble role labels must never invert after partner join/rejoin.
   - Incoming partner hello/message updates partner identity only.

3. **Sync merge conflict policy**
   - History-sync merges must reconcile sender-relative roles to local-relative roles.
   - Never allow remote chunk merge to overwrite local ownership role semantics.
   - Preserve stable order by timestamp with deterministic tie-break.

## 4) Validation gates (truthful reporting only)

- Execute only checks actually runnable in environment.
- Report exact command + pass/fail status.
- No implied lint/build/browser automation unless explicitly executed.
- Release gate requires mandatory negative/counter tests listed in `talk-say-v34-tests.md`.

## 5) Commit readiness checklist

- [ ] Scope gate passes (`git diff --name-only` limited to 4 target files).
- [ ] Runtime behavior matches spec canonical paths.
- [ ] Positive + negative test cases documented and status-recorded.
- [ ] No over-claiming in test/report output.
