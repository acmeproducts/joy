# Implementation Plan — Talk + Say v3.4 (`test.html`)

Prepared: March 29, 2026  
Scope authority: this plan, `talk-say-v34-spec.md`, `talk-say-v34-tests.md`.

## 1) Baseline-first, scope-locked workflow

### 1.1 Pre-work baseline protocol
1. Reset to clean baseline and inspect only approved target files.
2. Record baseline checks before edits (available local checks only).
3. Split work into explicit slices with file-touch constraints.

### 1.2 Baseline scope gate + rollback protocol (mandatory)
- **Allowed-touch list:** `test.html`, `talk-say-v34-spec.md`, `talk-say-v34-tests.md`, `IMPLEMENTATION_PLAN.md`.
- **Hard scope gate:** `git diff --name-only` must contain only the four files above.
- **Rollback protocol:** if any out-of-scope hunk/file appears, revert immediately and reapply only approved hunks.
- **No over-claim policy:** do not report lint/tests/browser automation unless actually executed in this environment.

## 2) Slice plan with allowed/forbidden touch lists

### Slice A — Canonical language runtime contract (`test.html`)
**Allowed touch**
- Canonical target resolution helper for incoming target language.
- Auto mode continuity persistence (`autoReplyTargetLang`).
- Empty-string language override normalization/persistence.
- Outgoing payload metadata contract (`targetLang` mirrors runtime target).

**Forbidden touch**
- New language control surfaces.
- Any fallback path that silently forces auto state to `'en'` for active reply targeting.

### Slice B — Presence/join-note ordering + suppression (`test.html`)
**Allowed touch**
- `hello` ordering: identity upsert before join decision.
- Join-note suppression for heartbeat/history/backfill/transport-noise events.
- Presence updates that still refresh timestamps/dots without emitting join notes.

**Forbidden touch**
- Protocol/event-type redesign.
- Join-note generic fallback emissions.

### Slice C — Ownership + header integrity (`test.html`)
**Allowed touch**
- History chunk merge role reconciliation contract.
- Deterministic local role mapping during sync merge.
- Owner inline edit protection from rerender clobber.
- Rename conflict detection against computed session labels.

**Forbidden touch**
- Partner-editable header paths.
- Role inversion edge paths in merge.

### Slice D — Spec/tests alignment (`talk-say-v34-spec.md`, `talk-say-v34-tests.md`)
**Allowed touch**
- Unambiguous statements for canonical language rule, join contract, owner/partner header policy, merge contract.
- Explicit negative/counter release-gate checklist IDs.

**Forbidden touch**
- Ambiguous wording implying multiple active language/identity paths.
- Claims not backed by runtime behavior.

## 3) Ownership policy (explicit)

1. `myHandle` is local-owner identity on this device/session.
2. `partnerHandle` is remote participant identity on this device/session.
3. History-sync merge must reconcile role intent into local rendering roles deterministically.
4. Ownership semantics must remain stable through reconnect/backfill/history merge.

## 4) Validation gates (truthful only)

- Execute only checks actually runnable in the environment.
- Record exact command and result status.
- Tie validation reporting to test IDs in `talk-say-v34-tests.md`.
- Negative/counter tests are release blockers.

## 5) Commit readiness checklist

- [ ] Scope gate passes (`git diff --name-only` limited to 4 target files).
- [ ] Runtime behavior matches canonical contracts.
- [ ] Test checklist IDs reported truthfully with pass/fail/blocked state.
- [ ] No over-claiming in final report.
