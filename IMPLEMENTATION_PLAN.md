# Implementation Plan — Talk + Say v3.4 (`test.html`)

Prepared: March 29, 2026

## 1) Identity normalization & compatibility
- **Add:** Persist canonical fields `myHandle`, `partnerHandle`, `peerLastSeenAt`, and `autoReplyTargetLang`; add helper `getPreferredOwnerName()` as owner-name source resolver.
- **Change:** Treat `myName` and `peerName` as compatibility aliases that mirror canonical handles on read/write.
- **Remove:** Any behavior or wording that treats legacy `myName`/`peerName` as primary write targets.

## 2) Language UX single canonical path
- **Add:** Ribbon globe button opens a single scoped language sheet/overlay for chat language selection.
- **Change:** Effective-language precedence is mandatory: explicit header override (`myLang !== ''`) > auto (`autoReplyTargetLang`) > fallback bootstrap.
- **Remove:** Legacy language controls in non-ribbon surfaces as canonical/active selection paths.

## 3) Header ownership editing policy
- **Add:** Owner header inline-edit rerender guard to prevent presence rerender clobber while editing.
- **Change:** Partner header remains display-only and must never be locally editable.
- **Remove:** Any partner-editable header flow.

## 4) Join-note ordering & noise suppression
- **Add:** Upsert partner identity before join-note decisions.
- **Change:** Join-note emission is name-first and only after identity resolution.
- **Remove:** Join-note triggers for transport noise (`ping`, `pong`, `history-sync`, heartbeat/backfill-only traffic).

## 5) Rename collision policy
- **Add:** Collision detection against computed session labels with explicit user-facing block reason.
- **Change:** Rename flow requires explicit decision between “chat-only update” and “default/global update”.
- **Remove:** Silent overwrite/merge of colliding labels.

## 6) Deterministic history-sync merge
- **Add:** Deterministic wire-role (`owner`/`partner`) to local-role (`me`/`them`) mapping rules.
- **Change:** Deterministic merge ordering (`timestamp` + stable tie-breaker) and chunk reconciliation.
- **Remove:** Ambiguous role inference that can invert ownership across devices.

## 7) Payload/message stamping contract
- **Add:** Handle-first message name stamping and effective-language metadata usage.
- **Change:** `typing`/`hello`/`msg` payloads carry handle-first identity and computed effective language metadata.
- **Remove:** Stale/hardcoded target-language metadata paths.

## 8) Release gate and anti-scope-drift controls
- **Add:** Pre-commit scope gate and rollback protocol text.
- **Change:** Spec and test references map each contract point to test IDs.
- **Remove:** Ambiguous acceptance wording that permits mixed canonical/non-canonical behavior.
