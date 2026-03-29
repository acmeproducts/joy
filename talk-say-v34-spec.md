# Talk + Say v3.4 Normative Contract (Scope-Locked)

Prepared: March 29, 2026
Primary runtime file: `test.html`

## 1) Canonical identity model (`myHandle`/`partnerHandle`) + aliases
- **Add:** Runtime/storage MUST persist canonical identity fields `myHandle` and `partnerHandle` (plus `peerLastSeenAt`, `autoReplyTargetLang`).
- **Change:** `myName` and `peerName` MUST be compatibility aliases mirroring canonical handles.
- **Remove:** Any primary-write path that targets legacy name aliases instead of canonical handles.

## 2) `getPreferredOwnerName()` behavior and source of truth
- **Add:** `getPreferredOwnerName()` MUST resolve owner identity from global preference (`globalName`, then `userName`) with placeholder fallback.
- **Change:** Outgoing owner identity stamping MUST be handle-first (`myHandle`) with global preference only as fallback.
- **Remove:** Direct dependence on legacy `myName` as a source-of-truth field.

## 3) Header edit policy
- **Add:** Owner header inline editing MUST include a rerender clobber guard while editing is active.
- **Change:** Partner header MUST be display-only and MUST NOT permit local inline edits.
- **Remove:** Any partner-editable header path.

## 4) Ribbon-only language control and scoped selector behavior
- **Add:** Ribbon globe button MUST open the single scoped language sheet/overlay.
- **Change:** Language selection UI MUST resolve through that scoped selector path.
- **Remove:** Duplicate/legacy language controls as canonical language-entry points.

## 5) Effective language precedence + auto semantics
- **Add:** Effective language precedence MUST be: explicit header override (`myLang !== ''`) > auto (`autoReplyTargetLang`) > fallback bootstrap language.
- **Change:** Auto mode (`myLang === ''`) MUST preserve continuity and MUST NOT be coerced to `'en'` during normalization/persistence.
- **Remove:** Any hardcoded/coercive path that rewrites valid empty-string auto mode to a fixed language.

## 6) Bubble semantics matrix (initiator/partner × inbound/outbound)
- **Add:** Bubble semantics MUST maintain invariant fields: `source` (typed/original text), `target` (receiver-facing translation), `backtranslate` (target→source audit).
- **Change:** Default language behavior MUST follow “what you receive back in” unless explicit header override is set.
- **Remove:** Contradictory dual-canonical matrix wording that allows ambiguous source/target ownership.

## 7) Join-note name-first sequencing and transport-noise suppression
- **Add:** Partner identity upsert MUST run before join-note decisions.
- **Change:** Join-note emission MUST be name-first and only after identity resolution.
- **Remove:** Join-note emission for transport noise (`ping`, `pong`, `history-sync`, heartbeat/backfill-only traffic).

## 8) History-sync role mapping and deterministic merge order
- **Add:** History-sync merge MUST map wire role `owner/partner` to local rendering role `me/them` deterministically.
- **Change:** Merge order MUST be deterministic (`timestamp`, then stable tie-breaker).
- **Remove:** Ambiguous role inference that can invert ownership across devices.

## 9) Payload contract for `typing`/`hello`/`msg`
- **Add:** `typing`, `hello`, and `msg` payloads MUST stamp handle-first owner identity and computed effective-language metadata.
- **Change:** Outgoing `targetLang` in `msg` MUST mirror runtime-computed effective target language.
- **Remove:** Stale/hardcoded target-language metadata paths and duplicate canonical payload paths.
