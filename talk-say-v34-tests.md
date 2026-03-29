# Talk + Say v3.4 Test Plan (Release Gate)

Prepared: March 29, 2026
Target runtime: `test.html`

Legend: ✅ pass / ❌ fail / ⚠️ blocked (environment)

## 1) Spanish-preference override precedence
- **Add:** Set `myLang='es'`, send outbound English, receive partner reply.
- **Change:** Expected result: inbound `targetLang` MUST remain Spanish (`es`) regardless of latest typed source language.
- **Remove:** Any vague pass condition that allows auto behavior to override explicit header language.

## 2) Auto-mode continuity + empty-string non-coercion
- **Add:** Persist `myLang=''`, send Thai then English, reload and continue.
- **Change:** Expected result: `myLang` MUST remain empty string; inbound target follows `autoReplyTargetLang` continuity.
- **Remove:** Assertions that accept coercion of empty-string auto mode to `'en'`.

## 3) Malformed invite isolation
- **Add:** Load malformed/invalid invite payload (bad schema/version/missing sessionId).
- **Change:** Expected result: invalid invite MUST be ignored; runtime remains isolated with no cross-session mutation.
- **Remove:** Any acceptance condition that tolerates partial hydration from invalid invite payloads.

## 4) Ownership-role consistency across multi-device sync
- **Add:** Merge history-sync chunks from second device with mixed `owner`/`partner` roles.
- **Change:** Expected result: local render mapping MUST remain consistent (`owner→me`, `partner→them`) with no inversion.
- **Remove:** Non-deterministic ownership expectations.

## 5) Join-note race + transport-noise suppression
- **Add:** Replay `hello`, `ping`, `pong`, `history-sync`, heartbeat/backfill traffic under reconnect race.
- **Change:** Expected result: join note appears only after identity upsert and never for noise events.
- **Remove:** Vague join-note assertions that allow noise-triggered join output.

## 6) Rename conflict race/collision block
- **Add:** Attempt owner rename that collides with an existing computed session label.
- **Change:** Expected result: rename MUST be blocked with explicit user-visible collision reason and no silent merge.
- **Remove:** Acceptance of collision overwrite/merge.

## 7) Header edit clobber-guard during presence rerender
- **Add:** Edit owner header while presence rerender events fire (`typing`/presence tick).
- **Change:** Expected result: active owner edit text MUST NOT be clobbered until edit commit/blur.
- **Remove:** Any test wording that allows rerender overwrite during active edit.

## 8) Payload metadata consistency (`targetLang`/effective language + handle-first names)
- **Add:** Inspect outgoing `typing`/`hello`/`msg` payloads during auto and explicit language modes.
- **Change:** Expected result: payload name fields are handle-first and `msg.targetLang` equals runtime effective target language.
- **Remove:** Non-deterministic payload checks that permit stale/hardcoded target metadata.

## Release blocker mapping
- Contract §1 ↔ Test 1, 8
- Contract §2 ↔ Test 8
- Contract §3 ↔ Test 7
- Contract §4 ↔ Test 8
- Contract §5 ↔ Test 1, 2
- Contract §6 ↔ Test 4
- Contract §7 ↔ Test 5
- Contract §8 ↔ Test 4
- Contract §9 ↔ Test 8
