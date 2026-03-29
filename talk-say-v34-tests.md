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
| T-A3 | Auto continuity persistence | In auto mode send mixed-language messages and reload | `autoReplyTargetLang` continuity is preserved |

### Slice B — Presence/join handling
| ID | Scenario | Steps | Expected |
|---|---|---|---|
| T-B1 | Name-first hello join | Partner joins with hello name | Join note uses resolved partner handle/name |
| T-B2 | Rejoin dedupe sanity | Reconnect quickly | No duplicate noisy join spam |
| T-B3 | Ping/pong stability | Simulate heartbeat traffic only | Presence updates without join-note emission |
| T-B4 | History/ack/typing suppression | Replay history-sync/ack/typing events | Seen timestamps update while join note stays suppressed |
| T-B5 | Solo-session idle stability | Create session, no partner joins, wait idle > ping timeout window | No reconnect spam loop while socket remains healthy |

### Slice C — Canonical language UX + runtime targeting
| ID | Scenario | Steps | Expected |
|---|---|---|---|
| T-C1 | Ribbon language entry | Use ribbon globe | Single canonical language selector opens |
| T-C2 | Legacy language controls inactive | Open legacy settings surfaces | No active duplicate language control path |
| T-C3 | Auto canonical rule | `myLang=''`, send Thai then English | Incoming targets follow latest typed language |
| T-C4 | Explicit override precedence | Set `myLang='es'`, send English | Incoming target remains Spanish |
| T-C5 | Envelope contract | Inspect outgoing `msg` payload | `targetLang` equals runtime-computed targetLang |

## B) Mandatory negative/counter tests (release blocker)

| ID | Scenario | Steps | Expected |
|---|---|---|---|
| T-N1 | Auto state coercion guard | Persist `myLang=''` and reload | Auto state remains empty-string, not coerced to `'en'` |
| T-N2 | Stale metadata mismatch guard | Send message after language flip | No stale/hardcoded `targetLang` mismatch in payload |
| T-N3 | Join-note unresolved-name guard | Receive join traffic before name resolution | No generic fallback join-note emitted |
| T-N4 | Transport-noise join guard | Replay ping/pong/history bursts | No user-visible join notes from noise |
| T-N5 | Ownership-role consistency across sync | Merge history chunks from another device | No `me/them` inversion edge path |
| T-N6 | Rename collision block | Rename owner to colliding computed label | Rename blocked with explicit collision message |
| T-N7 | Owner-label rerender clobber guard | Edit owner label while presence rerenders | Active edit not clobbered mid-edit |

## C) Release checklist (fill truthfully at execution time)

| ID | Status | Evidence command/output |
|---|---|---|
| T-A1 | ☐ | |
| T-A2 | ☐ | |
| T-A3 | ☐ | |
| T-B1 | ☐ | |
| T-B2 | ☐ | |
| T-B3 | ☐ | |
| T-B4 | ☐ | |
| T-B5 | ☐ | |
| T-C1 | ☐ | |
| T-C2 | ☐ | |
| T-C3 | ☐ | |
| T-C4 | ☐ | |
| T-C5 | ☐ | |
| T-N1 | ☐ | |
| T-N2 | ☐ | |
| T-N3 | ☐ | |
| T-N4 | ☐ | |
| T-N5 | ☐ | |
| T-N6 | ☐ | |
| T-N7 | ☐ | |

## Release gate

A release is blocked unless all are satisfied:
1. Positive slices A/B/C pass.
2. All mandatory negative/counter tests `T-N1`..`T-N7` pass.
3. Any blocked test is explicitly marked ⚠️ with concrete blocker reason.
4. Report only checks actually executed.
