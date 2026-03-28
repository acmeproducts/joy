# Talk + Say v3.4 Test Plan (Guidance)

Prepared: March 28, 2026  
Target: `test.html`

## Test matrix

Legend: ✅ pass / ❌ fail / ➖ n/a

### A. Data compatibility

| ID | Scenario | Steps | Expected |
|---|---|---|---|
| T100 | Legacy session migration | Seed localStorage with session containing only `myName/peerName`; reload app | Session works; header and list show names via handle aliases |
| T101 | New fields persistence | Create session, receive partner ping/typing, reload | `peerLastSeenAt` survives reload and presence tooltip uses real time |
| T102 | Pref aliasing | Set only `userName`; clear `globalName`; create new session | New session defaults from `userName` fallback |

### B. Onboarding + new chat naming

| ID | Scenario | Steps | Expected |
|---|---|---|---|
| T200 | First-run gate | Clear prefs; open app | Blocking onboarding appears with name input + continue |
| T201 | Empty submit blocked | Submit blank name | Overlay stays; validation shown |
| T202 | Valid submit | Enter "Alice", continue, reload | Gate dismissed and not shown again |
| T203 | New chat unchanged name | Tap + and start without edits | No 2-option prompt |
| T204 | New chat changed name chat-only | Tap +, edit name, choose chat-only | `session.myHandle` changes; `prefs.globalName` unchanged |
| T205 | New chat changed name global | Tap +, edit name, choose global | `session.myHandle` + `prefs.globalName` both updated |

### C. In-session rename behavior

| ID | Scenario | Steps | Expected |
|---|---|---|---|
| T300 | Owner editable | Tap owner name in header | Inline edit activates |
| T301 | Partner not editable | Tap partner name | No caret/editing allowed |
| T302 | Rename prompt options | Change owner name and blur | Two-option prompt shown |
| T303 | Rename chat-only | Choose chat-only | Session updates only; default unchanged |
| T304 | Rename + update default | Choose global option | Session + default updated |
| T305 | Conflict prevention | Create two sessions with distinct labels; rename to duplicate | Rename blocked + conflict message |
| T306 | Active-edit render guard | Begin owner edit while incoming hello arrives | Text being edited is not overwritten |
| T307 | Bubble stamp integrity | Rename, send new message | Old bubble keeps old name, new bubble uses new name |

### D. Session list + presence

| ID | Scenario | Steps | Expected |
|---|---|---|---|
| T400 | Label with partner | Connect partner and exchange hello | Card shows `Me / Partner` form |
| T401 | Invite pending label | Create chat not yet joined | Card shows `Me / Invite Pending — [time]` |
| T402 | Partner joined note | Partner joins | System note uses partner handle text |
| T403 | You-joined dedup | Reopen same session several times under 5 min | At most one `You joined` note in window |

### E. Ribbon/settings redesign

| ID | Scenario | Steps | Expected |
|---|---|---|---|
| T500 | Ribbon controls | Inspect shell ribbon | Contains hamburger, phrasebook, globe, spacer, auto-read toggle only |
| T501 | Language modal | Tap globe | Bottom sheet opens with Auto + all LANGS full labels |
| T502 | Globe state | Select language then auto | Icon shows language flag, then 🌐 in auto |
| T503 | Auto-read control location | Enable/disable auto-read from ribbon | Works without legacy autoread bar |
| T504 | Settings cleanup | Open settings drawer | No old phrasebook row, no old auto-read row, no old language picker row |

### F. Regression smoke tests

| ID | Scenario | Steps | Expected |
|---|---|---|---|
| T900 | Send/receive translation | Exchange messages across different languages | Translation still works |
| T901 | Phrasebook add/use | Save phrase and insert into chat | Works unchanged |
| T902 | Tag + clarify + back-translate | Use each control on a message | Works unchanged |
| T903 | Import/export | Export and import sessions/settings/phrasebook | Works and data integrity preserved |
| T904 | Voice flows | STT send + TTS playback | Works unchanged |

## Suggested execution order
1. A (compatibility)
2. B + C (identity)
3. D (labels/presence)
4. E (UI refactor)
5. F (regressions)

## Exit criteria
- All P0 tests pass: T100, T101, T200, T202, T301, T306, T400, T500, T501, T900.
- No blocker regressions in F-series.
