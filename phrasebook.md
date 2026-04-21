## Phrasebook Future Roadmap (Phased, with Design Choices & Options)

> Goal: Make phrasebook **high-utility, low-friction, unobtrusive**, while supporting both quick conversational retrieval and high-volume corpus building.

---

## 0) Product North Star (Before Build)

### Primary Jobs to Serve
1. **Recall in the moment**: “I need a phrase now while chatting.”
2. **Capture from conversation**: “Save this useful expression with context.”
3. **Curate at scale**: “Build/refine hundreds of phrase pairs quickly.”
4. **Reuse across surfaces**: “Use phrasebook in chat, video, export, and learning flows.”

### Core Principles
- No permanent UI clutter in chat.
- Fast keyboard/gesture access beats static buttons.
- Curated phrasebook ≠ raw transcript dump.
- Language pair is **entry-level truth**, catalog-level is optional metadata/default.

---

## Phase 1 — Stabilize Core UX (Immediate, low risk)

### Objectives
- Resolve current friction points.
- Improve discoverability without adding persistent controls.
- Close loop between search and action.

### Features
1. **Actionable phrase search results**
   - In omni search, phrase results become tappable:
     - `Use in chat`
     - `Open in phrasebook`
2. **Contextual insertion**
   - Select source/target variant when inserting into composer.
3. **Non-intrusive discoverability**
   - Add helper text in composer or quick tip only when no prior usage.

### Design Options
- **A. Tap row inserts immediately** (fast, but can be surprising)
- **B. Tap row opens micro-action sheet** (safer, slightly slower) ✅ preferred

### Data/Schema
- No schema changes required if `sourceLang/targetLang` already entry-level.

### Success Metrics
- % of phrase searches that result in insertion.
- Time from search open → insertion.
- Session retention for users who used phrasebook retrieval.

---

## Phase 2 — Command-Driven Access in Chat (Unobtrusive power)

### Objectives
- Make phrasebook accessible “from anywhere” in chat with almost zero UI chrome.

### Features
1. **Composer triggers**
   - `/` command mode
   - `//` or `@` phrase lookup mode
2. **Inline command palette**
   - Typeahead over phrase text, tags, languages, catalog.
3. **Keyboard flow**
   - arrows navigate
   - Enter inserts
   - Shift+Enter inserts+send (optional)
   - Esc dismisses

### Design Options
- **A. Slash-only (`/pb ...`)**
  - explicit, clear, more verbose
- **B. Dual trigger (`//` + `/`)** ✅ preferred
  - faster for power users
- **C. @mention style**
  - familiar metaphor, but semantically overloaded

### Technical Choices
- Reuse existing omni search backend vs dedicated phrase index.
- Add query operators:
  - `lang:en>th`
  - `tag:travel`
  - `cat:clinic`

### Success Metrics
- % of active chats using command retrieval.
- Command abandonment rate.
- Median keystrokes to insert phrase.

---

## Phase 3 — Capture Pipeline & Phrasebook Inbox (Quality gate)

### Objectives
- Prevent curated phrasebook pollution while enabling large-scale accumulation.

### Features
1. **Inbox (staging area)**
   - Raw captures from chat/video/transcript land here first.
2. **Candidate scoring**
   - novelty (not duplicate)
   - confidence
   - frequency
   - “conversation utility” heuristics
3. **Batch triage actions**
   - Accept to catalog
   - Merge duplicate
   - Reject
   - Defer

### Design Options
- **A. Direct-to-phrasebook (status quo)**
  - fast but noisy
- **B. Optional inbox toggle**
  - flexible, potentially inconsistent
- **C. Inbox-first default** ✅ preferred for scale

### Schema Additions (Recommended)
- `origin` (`chat`, `video`, `import`, `manual`)
- `status` (`inbox`, `curated`, `archived`)
- `qualityScore`
- `usageCount`, `lastUsedAt`
- `contextSnippet`, `sourceSessionId`

### Success Metrics
- Curated acceptance rate from inbox.
- Duplicate rate reduction.
- % of curated entries actually reused in chat.

---

## Phase 4 — Companion Curation App / Dedicated Studio

### Objectives
- Enable high-throughput phrase acquisition, translation, editing, and organization.

### Features
1. **Bulk import**
   - transcript chunks, CSV/JSON, clipboard blocks
2. **Auto-translation + back-translation at scale**
3. **Bulk edit tools**
   - mass retag, re-catalog, language normalization
4. **Dedup/merge workbench**
5. **Corpus analytics**
   - underused entries, high-value phrases, gaps by domain/language pair

### Product Boundary Options
- **A. Keep inside main app**
  - simpler deployment, denser UI
- **B. Separate companion web app** ✅ preferred
  - clearer mental model, no chat clutter
- **C. Hybrid: embedded “Advanced Mode”**
  - compromise but complexity risk

### Sync Options
- local-first with manual export/import
- account-based cloud sync
- team/shared phrasebooks (future enterprise)

### Success Metrics
- phrases curated per hour
- % with tags/catalog/language completeness
- dedup effectiveness
- curator satisfaction / task completion time

---

## Phase 5 — Video App & Cross-Surface Integration

### Objectives
- Turn transcript export touchpoint into intelligent phrase harvesting.

### Features
1. **Transcript export to Inbox**
2. **Segment-level recommendations**
   - recommend only high-value phrase candidates
3. **Context-preserving cards**
   - attach timestamp, speaker, short snippet
4. **Round-trip**
   - “Use in chat” from harvested phrase candidates

### Design Options
- **A. Full transcript dump**
  - maximum capture, minimum quality
- **B. Smart candidate extraction** ✅ preferred
- **C. User-guided clipping in video app**
  - high quality, higher effort

### Risks
- Excess noise from full conversation dumps.
- User trust issues if auto-generated phrases are poor quality.
- Cross-app identity/linking complexity.

### Success Metrics
- % of transcript candidates accepted.
- downstream reuse in live chat.
- user-reported quality of suggested phrases.

---

## Phase 6 — Intelligence Layer (Longer-term differentiation)

### Objectives
- Make phrasebook context-aware and proactively helpful without feeling intrusive.

### Features
1. **Contextual suggestion engine**
   - suggests relevant saved phrases based on current message intent/domain.
2. **Adaptive ranking**
   - rank by personal usage, recency, partner language, conversation topic.
3. **Learning loops**
   - spaced review for low-confidence/high-value phrases.
4. **Quality governance**
   - flag stale, conflicting, or low-confidence entries.

### Guardrails
- suggestions must be dismissible
- avoid unsolicited popups; use subtle affordances
- transparent provenance (“from video transcript”, “saved from chat X”)

---

## Cross-Phase Architecture Decisions (Make Early)

## 1) Source of Truth Model
- **Phrase Entry** (canonical): text pair + language pair + metadata
- **Catalog**: organizational lens, not semantic truth
- **Inbox Item**: candidate object prior to curation

## 2) Retrieval Engine Strategy
- Start: in-memory/local simple search
- Mid: indexed local search (fuzzy + filters)
- Later: semantic hybrid retrieval (keyword + embeddings)

## 3) Identity & Sync
- Start local-first
- Add optional cloud account sync
- Later shared/team phrasebooks with permissions

## 4) Quality Model
- Explicit states: `inbox -> curated -> archived`
- Score + provenance + usage metrics
- Dedup by normalized source/target/lang + fuzzy thresholds

---

## Suggested Execution Sequence (Practical)

1. **Phase 1 + 2 MVP** (actionable search + command access)  
2. **Phase 3 inbox pipeline** (protect quality before scaling capture)  
3. **Phase 5 transcript integration via inbox**  
4. **Phase 4 companion studio** (once high-volume need validated)  
5. **Phase 6 intelligence layer**

---

## Decision Checklist for Each New Feature

- Does it reduce retrieval latency during chat?
- Does it preserve or improve curation quality?
- Does it avoid persistent UI clutter?
- Does it support multilingual entry-level correctness?
- Does it scale to transcript-sized ingestion?
- Is provenance and reversibility clear?

If you want, next I can convert this roadmap into:
1) a **quarter-by-quarter delivery plan**, and/or  
2) a **PRD template** with acceptance criteria per phase.
3) 
