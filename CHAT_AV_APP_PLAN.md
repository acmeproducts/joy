# Chat-Native AV Apps Planning Document

## Purpose

This document resets the direction after the abandoned `campfire` / `camper` experiment and defines a cleaner planning framework for two separate products:

- **App1**: a chat client that supports multiple simultaneous sessions, where each session owns its own interactive audio-visual background/runtime and its own gear/settings surface.
- **App2**: a chat system that supports sending a message that is itself an interactive audio-visual experience.

This is intentionally **not** a file-level spec, **not** an implementation diff, and **not** a final design lock. It is a planning document that captures the product model, UX intent, architecture direction, phased delivery strategy, and draft one-shot prompts for future implementation work.

## Confirmed Direction

The following answers are treated as agreed inputs for this planning round:

1. **Desktop shell direction for App1**: yes — left sessions / right active conversation.
2. **Visible active conversation model for App1 MVP**: yes — only one conversation is visibly open at once, even if many sessions exist simultaneously.
3. **Per-session control model for App1**: all participants can control the session’s gear/background/runtime.
4. **Scope for App2 MVP**: yes — direct-message-first.
5. **Lifecycle rule for App2 MVP**: yes — only the latest interactive AV message is active; older ones remain inert/history.
6. **Current deliverable**: a comprehensive plan and draft one-shot prompts, not a file-level spec.

## Product Definitions

## App1 — Multi-Session Chat Client with Per-Session AV Rooms

### Plain-language definition
A chat client where every conversation is also its own configurable shared sensory room.

### Core idea
The outer application is a messaging shell. Inside that shell:
- users can create and switch between multiple chat sessions,
- each session has its own message history,
- each session also has its own interactive audio-visual runtime,
- each session has its own gear/settings surface,
- unread state and participants belong to each session,
- only one session is foregrounded at a time, but multiple sessions may exist concurrently.

### What App1 is not
- not a single AV page with a chat modal layered on top,
- not a one-session toy with sharing added later,
- not a split “session panel vs chat panel” workflow,
- not a message-embedded interactive object system.

### User value
App1 should make creating, naming, sharing, returning to, and inhabiting a conversation feel as low-friction as a normal chat client while preserving the uniqueness of a shared visual/audio/tactile room.

## App2 — Interactive AV Message Object

### Plain-language definition
A messaging experience where one message can be a live expressive object instead of plain text or static media.

### Core idea
The outer application is still a chat timeline. Inside that timeline, a sender can create a special message whose payload includes an interactive AV state. That message can be opened and experienced as a live object.

### MVP posture
For MVP:
- start with direct messages,
- allow only one live AV message to be active at a time per conversation,
- keep older AV messages as inert history cards,
- optimize for clarity, performance, and emotional expressiveness.

### What App2 is not
- not the same as App1 with fewer tabs,
- not a room-level background system,
- not unlimited concurrent interactive objects,
- not a substitute for the conversation container.

## Shared Design Principles

1. **Low friction beats novelty theater.**
   The user should be able to create a conversation or expressive object with minimal clicks and almost no setup burden.

2. **Chat reliability comes first.**
   Reading, typing, replying, opening links, viewing attachments, deleting messages, and understanding unread state must remain dependable.

3. **The AV layer must feel communicative, not decorative.**
   Visual/audio/tactile behavior should add meaning to interaction, not function as wallpaper.

4. **Bounded concurrency is essential.**
   One active room runtime at a time in App1; one active live message at a time per thread in App2.

5. **Shared state and ephemeral state must stay distinct.**
   Persistent settings/history should not be modeled the same way as transient taps, blooms, strums, pulses, or timed activations.

6. **Keep the model legible.**
   Users should be able to tell what belongs to the conversation, what belongs to the active room/message, and what is just transient activity.

## App1 — Experience Model

## Primary UX model

### Layout
- **Left rail**: conversation list / tabs / session workspace index.
- **Right pane**: active conversation.
- **Inside active conversation**:
  - message timeline,
  - composer,
  - visible share action,
  - participant popover,
  - per-session unread state,
  - the AV runtime as the active session background,
  - a gear/settings surface for the active session only.

### Lowest-friction target flow
1. User lands on page.
2. User taps **New Chat**.
3. A new conversation tab appears immediately.
4. The conversation is ready to type into with the composer already focused.
5. User sends the first message.
6. User taps **Share** on that same conversation.
7. Recipient opens the link and appears in the participant popover.
8. Unread replies show directly on the conversation tab.

### Interaction philosophy
- There should be no conceptual split between “session management” and “chat.”
- Session switching should happen through the conversation tabs/list itself.
- Participant visibility should be lightweight: a popup/popover, not a permanently expanded panel.
- Low-frequency actions belong in secondary surfaces; high-frequency actions should be one tap away.

## App1 — Functional Capabilities

### Conversation workspace
- create conversation,
- switch between conversations,
- rename/edit conversation handle,
- show last activity / timestamp metadata,
- show unread badge per conversation,
- delete/archive conversation,
- share conversation,
- participant popover,
- lightweight lock semantics only if honest and clearly non-security-critical.

### Active conversation view
- standard text chat,
- links,
- attachments,
- copy/export/import/clear behavior,
- message-level actions,
- participant presence,
- local + synced state where appropriate.

### AV room runtime per conversation
- background image or runtime backdrop,
- taps/drags/gestures,
- shared visual responses,
- shared audio responses where permitted,
- gear/settings panel scoped to the active conversation,
- per-conversation persistence for settings.

## App1 — Data Model Direction

### Core entities
- **User / participant**
- **Conversation**
- **Conversation metadata**
- **Conversation message history**
- **Conversation AV state**
- **Conversation transient activity stream**

### Conversation record should minimally support
- stable conversation id,
- handle / title,
- created timestamp,
- updated timestamp / last activity,
- unread count or unread marker,
- share token / shareable entry identifier,
- participant summary,
- lock state if retained,
- persisted AV settings payload,
- active-presence state.

### AV state should minimally support
- background/media selection,
- active visual/audio settings,
- custom words or equivalent expressive payloads if retained,
- local persisted preferences vs shared room state,
- version/timestamp for conflict resolution.

### Transient activity stream should support
- taps,
- drags,
- bursts,
- pulses,
- active live gestures,
- short-lived cues that should not be treated like persistent configuration.

## App1 — Architecture Direction

### Shell-level responsibilities
- conversation registry,
- active conversation selection,
- unread management,
- share entry points,
- participant summaries,
- persistence bootstrap,
- mounting/unmounting active conversation runtime.

### Conversation-level responsibilities
- message timeline and actions,
- composer,
- attachment handling,
- presence display,
- conversation metadata editing,
- per-conversation gear/settings,
- AV runtime control panel,
- room-state syncing.

### Runtime constraints
- only the active conversation should run the full AV/audio/tactile runtime in foreground,
- inactive conversations should preserve state but remain lightweight,
- unread and participant state must still update even when a conversation is inactive.

## App1 — Risks and Mitigations

### Risk: shell complexity overwhelms chat simplicity
**Mitigation**: make conversation creation, switching, and sharing first-class, not buried in panels.

### Risk: AV runtime harms chat usability
**Mitigation**: chat remains functionally topmost and readable; AV behavior is bounded and tuned per conversation.

### Risk: too much state per conversation
**Mitigation**: isolate persistent room state from ephemeral live events; mount only active runtime.

### Risk: multiple conversations create performance pressure
**Mitigation**: only one live canvas/audio runtime is foregrounded; inactive sessions become passive snapshots/state holders.

## App1 — MVP Boundaries

### Include
- desktop shell with left sessions / right active conversation,
- create new chat,
- share active conversation,
- participant popover,
- unread per conversation,
- editable handle + lightweight metadata on conversation item,
- active conversation timeline/composer,
- per-conversation AV background/runtime,
- per-conversation gear/settings,
- all participants may control room settings.

### Exclude for MVP
- complex permissions/admin roles,
- many-pane simultaneous visible conversations,
- advanced moderation,
- full security/auth lock semantics,
- cross-conversation concurrent live canvases,
- embedded AV messages as a primary system.

## App2 — Experience Model

## Primary UX model

A sender composes a special interactive AV message from within a direct-message thread. The message is inserted into the timeline as a distinct object/card. The receiver can open or expand it and experience the live AV state. Only the latest such message is active; earlier AV messages remain visible but inert.

## App2 — Functional Capabilities

### Composition
- create a live AV message,
- define its visual/audio/tactile payload,
- optionally include label/caption text,
- send it into a DM thread.

### Timeline behavior
- render as a distinct message type,
- visually signal active vs inactive,
- allow expansion/opening,
- keep old AV messages visible as history but not interactive.

### Active-lifecycle model
- latest live AV message wins,
- prior AV messages immediately become inactive/history,
- conversation-level pointer to the currently active AV message,
- sender/receiver can experience the active message without timeline chaos.

## App2 — Data Model Direction

### Core entities
- **DM thread**
- **standard message**
- **live AV message**
- **active live AV message pointer**

### Live AV message record should minimally support
- stable message id,
- author id,
- created timestamp,
- optional title/caption,
- AV payload/config,
- preview state / summary,
- active flag or activity derived from current-thread active pointer,
- replaced/expired metadata if useful.

### Thread-level state should minimally support
- active live message id,
- time activated,
- time replaced,
- optional activity summary.

## App2 — Architecture Direction

### Thread-level responsibilities
- maintain current active live message pointer,
- keep standard message flow intact,
- preserve chronology while allowing one active expressive object.

### Message-level responsibilities
- render preview card,
- expand/open live runtime,
- degrade to inert historical representation when replaced,
- keep payload portable and bounded.

### Runtime constraints
- only one active AV message runtime per thread,
- old objects become passive cards,
- interactive payload must remain lightweight enough to render safely inside a chat product.

## App2 — Risks and Mitigations

### Risk: live messages become chaotic in-thread
**Mitigation**: one active object at a time; old ones become inert.

### Risk: message object becomes too much like a room
**Mitigation**: keep App2 message-scoped, not conversation-scoped.

### Risk: performance problems from many historical AV objects
**Mitigation**: historical objects render as previews/cards, not live runtimes.

### Risk: emotional expressiveness gets buried by mechanics
**Mitigation**: prioritize composition simplicity and beautiful defaults.

## App2 — MVP Boundaries

### Include
- DM-only,
- one active AV message at a time per thread,
- inline preview/history card,
- open/expand active live message,
- replace old active AV message on send.

### Exclude for MVP
- group-room live message concurrency,
- multiple active AV messages at once,
- advanced authoring studio,
- complicated ownership/admin controls,
- room-level AV runtime semantics.

## Shared Delivery Strategy

## Phase 0 — Planning lock
- confirm terminology,
- confirm MVP boundaries,
- define shared data vocabulary,
- define success criteria.

## Phase 1 — App1 shell
- build conversation list + active conversation model,
- establish per-conversation metadata,
- implement low-friction create/share flow,
- add participant popover + unread badges.

## Phase 2 — App1 per-conversation AV runtime
- embed room runtime into active conversation,
- scope gear/settings per conversation,
- persist per-conversation room state,
- mount only one active runtime.

## Phase 3 — App2 live message prototype
- define live-message payload,
- render inline preview card,
- add active-live-message pointer,
- enforce latest-only active behavior.

## Phase 4 — refinement
- tune UI hierarchy,
- tune performance,
- simplify sharing and return flows,
- harden state sync,
- refine emotional expressiveness.

## Success Criteria

## App1 success criteria
- a user can create a conversation in one obvious action,
- the composer is ready immediately,
- sharing is available from the active conversation surface,
- participants can be seen from the conversation surface,
- unread state is visible on the conversation item itself,
- each conversation clearly owns its own room background/settings,
- moving between conversations feels like using a chat client, not opening separate tools.

## App2 success criteria
- a user can send a live AV message without learning a new subsystem,
- the receiver can recognize it as special immediately,
- only one AV message is active at a time in a DM,
- older AV messages remain understandable as history,
- the feature feels expressive rather than gimmicky.

## Draft One-Shot Prompt — App1

```text
You are designing and implementing App1: a chat client that supports multiple simultaneous conversations, where each conversation owns its own interactive audio-visual background/runtime and its own gear/settings surface.

Target:
- The application shell architecture for a multi-session chat client
- Conversation/workspace UI
- Conversation state model
- Per-conversation interactive AV runtime model
- Sharing, unread, presence, and participant UX for the conversation shell
- The output should define implementation direction and then produce a minimal patch/diff only after the architecture is clearly mapped

Actions:
1. Treat this as a chat-native application, not as an AV page with chat attached.
2. Design a desktop-first shell with:
   - a left conversation list / tab rail
   - a right active conversation pane
   - only one conversation visibly foregrounded at a time
3. Make creating a new conversation extremely low friction:
   - the user lands on the page
   - taps New Chat
   - a new conversation appears immediately
   - the composer is already focused
4. Make each conversation item support lightweight editable metadata:
   - editable handle/title
   - timestamp or last-activity line
   - unread indicator
   - participant/status affordance
5. Make the active conversation contain:
   - message timeline
   - composer
   - share action
   - participant popover
   - message actions appropriate to a real chat client
6. Design the interactive AV system as a property of each conversation:
   - each conversation has its own room background/runtime
   - each conversation has its own gear/settings surface
   - all participants may control the room settings for that conversation
   - only the active conversation mounts the full live runtime in foreground
   - inactive conversations preserve state but stay lightweight
7. Keep chat reliability primary:
   - reading, typing, links, attachments, and message actions must remain dependable
   - the AV layer must enhance the conversation without making the chat client feel secondary
8. Define a clean data model for:
   - conversation registry
   - conversation metadata
   - conversation message history
   - per-conversation AV state
   - transient room activity vs persistent room configuration
9. Define a clean sync/persistence model for:
   - per-conversation share identity
   - participant presence summary
   - unread state
   - persisted room settings
   - active conversation selection
10. Keep scope bounded:
   - do not add speculative admin systems or complex auth
   - do not add multi-pane simultaneous active conversations
   - do not fold App2’s message-object system into this work
11. First produce a concise implementation plan covering:
   - UI structure
   - state model
   - runtime model
   - sync/persistence model
   - MVP boundaries
12. Then produce only the minimal patch/diff needed to implement that plan.

Implementation requirements:
- Keep the implementation focused on App1 only.
- Prefer adapting existing working chat, presence, sharing, and AV runtime logic where practical instead of rewriting everything.
- Preserve the low-friction workflow as the highest priority.
- Keep the architecture legible: conversation-scoped room runtime, not message-scoped runtime.
- Scope is limited strictly to the modules/components required for App1.
- After the plan, produce only a minimal patch/diff.
```

## Draft One-Shot Prompt — App2

```text
You are designing and implementing App2: a chat feature where a message can itself be an interactive audio-visual experience.

Target:
- Live interactive message composition flow
- Live interactive message data model
- Chat timeline rendering for the new message type
- Active/inactive lifecycle model for the live message system
- Direct-message-first experience definition
- The output should define implementation direction and then produce a minimal patch/diff only after the architecture is clearly mapped

Actions:
1. Treat this as a message-native feature, not as a room or conversation background system.
2. Design the feature for direct messages first.
3. Introduce a special message type that can carry an interactive AV payload.
4. Make sending this message feel lightweight and expressive rather than like opening a complex studio.
5. Ensure the timeline can clearly distinguish:
   - normal text/media messages
   - live AV messages
   - active live AV message
   - inactive/historical live AV messages
6. Enforce a simple lifecycle model:
   - only one live AV message may be active at a time per DM thread
   - when a new live AV message is sent, it becomes the active one
   - older live AV messages remain visible in history but become inert/non-live
7. Define the minimum viable payload model for a live AV message:
   - author
   - timestamp
   - preview/summary
   - AV configuration payload
   - active vs historical state
8. Define how the live AV message is experienced:
   - inline preview card in the timeline
   - expanded/opened live experience when appropriate
   - graceful degradation for historical/inactive messages
9. Keep standard chat behavior intact:
   - sending/receiving ordinary messages must remain simple
   - the feature must not overwhelm the normal DM thread
10. Keep scope bounded:
   - DM-only for MVP
   - no multiple simultaneous active live AV messages
   - no room-level settings system here
   - no speculative moderation/admin frameworks
11. First produce a concise implementation plan covering:
   - composition flow
   - timeline rendering
   - payload/state model
   - active-message lifecycle
   - MVP boundaries
12. Then produce only the minimal patch/diff needed to implement that plan.

Implementation requirements:
- Keep the implementation focused on App2 only.
- Preserve clarity and performance over maximal flexibility.
- Prefer portable, bounded payloads and simple lifecycle rules.
- Keep the distinction between conversation-scoped state and message-scoped state explicit.
- Scope is limited strictly to the modules/components required for App2.
- After the plan, produce only a minimal patch/diff.
```

## Final Notes

- This document intentionally avoids locking file names, page names, or a final repo layout.
- The draft prompts are intentionally architecture-first so they can be adapted later once concrete targets are chosen.
- The most important planning distinction to preserve is:
  - **App1 = conversation-scoped AV runtime**
  - **App2 = message-scoped AV runtime**
