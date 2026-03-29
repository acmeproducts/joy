# Talk + Say v3.4 Test Plan (Release Gate)

Prepared: March 29, 2026  
Target runtime: `test.html`

Legend: ✅ pass / ❌ fail / ⚠️ blocked (environment)

## A) Positive slice coverage

### Slice A — Identity/session model
| ID | Scenario | Steps | Expected |
|---|---|---|---|
| T-A1 | Handle compatibility read | Load legacy session with only `myName/peerName` | UI renders via `myHandle/partnerHandle` aliases without data loss |
| T-A2 | Handle persistence write | Rename owner in header and reload | `myHandle` persists and aliases remain in sync |
| T-A3 | Presence persistence | Receive presence update, reload | `peerLastSeenAt` survives and presence tooltip remains coherent |

### Slice B — Presence/join handling
| ID | Scenario | Steps | Expected |
|---|---|---|---|
| T-B1 | Name-first hello join | Partner joins with hello name | Join note uses partner handle/name |
| T-B2 | Rejoin dedupe sanity | Reconnect quickly | No duplicate noisy join spam |
| T-B3 | Ping/pong stability | Simulate heartbeat traffic only | Presence updates without join-note emission |

### Slice C — Canonical language UX
| ID | Scenario | Steps | Expected |
|---|---|---|---|
| T-C1 | Ribbon language entry | Use ribbon globe | Single canonical language selector opens |
| T-C2 | Legacy language controls inactive | Open settings surfaces | No active duplicate language control path |
| T-C3 | Effective hello language | Change language then hello emit | Hello advertises effective preferred language |

## B) Mandatory negative/counter tests (release blocker)

| ID | Scenario | Steps | Expected |
|---|---|---|---|
| T-N1 | Spanish preference override with English input | Set preferred `es`, send English message, receive reply | Incoming reply target remains Spanish (not forced to English) |
| T-N2 | Malformed device-join link isolation | Open malformed/partial `?j=` invite | No cross-session pollution or ownership corruption |
| T-N3 | Ownership-role consistency across same-owner multi-device | Same owner joins from second device; exchange + sync history | Roles stay consistent (`mine` never rendered as `theirs`) |
| T-N4 | Join-note race/order | Deliver hello with delayed name availability simulation | No generic `Partner joined`; note emitted only once name resolved |
| T-N5 | Heartbeat/history noise suppression | Replay ping/pong/history bursts | No false join note from transport-only events |
| T-N6 | Rename conflict race | Concurrent rename/edit-clobber attempt across updates | Conflict blocked; active editor text not clobbered mid-edit |

## C) Additional regression checks

| ID | Scenario | Steps | Expected |
|---|---|---|---|
| T-R1 | Basic send/receive translation | Normal conversation flow | Translation pipeline still works |
| T-R2 | Phrasebook | Save and reuse phrase | Unchanged behavior |
| T-R3 | Clarify/back-translate/tags | Use all three on a message | Unchanged behavior |
| T-R4 | Import/export | Export then import data | Integrity preserved |

## Release gate

A release is blocked unless all are satisfied:
1. Positive slices A/B/C pass.
2. All mandatory negative/counter tests `T-N1`..`T-N6` pass.
3. Any blocked test is explicitly marked ⚠️ with concrete blocker reason (no silent omission).
4. Report only checks actually executed.
