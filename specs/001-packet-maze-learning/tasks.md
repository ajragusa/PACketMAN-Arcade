# Tasks: PACketMan Networking Maze

**Input**: Design documents in `specs/001-packet-maze-learning/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)
**Project root**: `WORKSHOP/LAB/Examples/PACketMan/`

Tests are included because the plan requires a dependency-free browser runner and independently reviewed domain cases; they verify the spec's learning and grading behavior.

## Phase 1: Setup

**Purpose**: Create the static game skeleton and browser test entry point.

- [X] T001 Create `WORKSHOP/LAB/Examples/PACketMan/engine/`, `ui/`, `data/`, and `tests/` directories.
- [X] T002 [P] Create the semantic game shell and module entry reference in `WORKSHOP/LAB/Examples/PACketMan/index.html`.
- [X] T003 [P] Create the base responsive stylesheet in `WORKSHOP/LAB/Examples/PACketMan/style.css`.
- [X] T004 [P] Implement the dependency-free browser test runner in `WORKSHOP/LAB/Examples/PACketMan/tests/index.html`; load the authored test modules, display discovered/executed and passed/failed totals with failed case IDs, and treat zero discovered tests as failure.

## Phase 2: Foundational

**Purpose**: Complete shared loading, content validation, and session-state foundations that block all user stories.

- [X] T005 [P] Implement per-level and development-document validation plus strict six-level campaign validation in `WORKSHOP/LAB/Examples/PACketMan/engine/content.js`.
- [X] T006 [P] Add independent cases proving one valid Level 1 document passes development validation but fails campaign validation, alongside missing-field, duplicate-ID, broken-reference, malformed-prefix, and impossible-trace cases in `WORKSHOP/LAB/Examples/PACketMan/tests/content.test.js`.
- [X] T007 [P] Implement the shared in-memory session state shape, legal view transitions, and reload-reset initializer in `WORKSHOP/LAB/Examples/PACketMan/engine/state.js`.
- [X] T008 Load `data/levels.json` by a module-relative URL, check `response.ok`, select partial-campaign validation only for the explicit `?dev=1` local mode, require strict six-level validation otherwise, and show retryable loading/content-error states in `WORKSHOP/LAB/Examples/PACketMan/main.js`.

**Checkpoint**: The app can load and validate a content document, show a useful content error, and initialize a fresh session before any story work begins.

## Phase 3: User Story 1 — Choose a route and understand its cost (Priority: P1)

**Goal**: Deliver a complete Level 1 vertical slice with direct packet movement, route comparison, explanations, retry, and advance.

**Independent Test**: Open the explicit local `?dev=1` mode with only the valid Level 1 document; verify a minimum-latency path (including tied minima) succeeds, a fewer-hop but higher-latency path is explained and retryable, and traceroute reveals timings without selecting a route. Verify the same partial document is rejected by default campaign validation.

### Tests and authored case data

- [X] T009 [P] [US1] Add independent correct, plausible-wrong, blocked-route, changed-link, and tied-best cases in `WORKSHOP/LAB/Examples/PACketMan/tests/rules.test.js`.
- [X] T010 [P] [US1] Author the Level 1 briefing, objective, two contrasting routes, gate, hints, and source records in `WORKSHOP/LAB/Examples/PACketMan/data/levels.json`.
- [X] T011 [P] [US1] Add wrong-answer, retry, successful delivery, and single-advance state cases in `WORKSHOP/LAB/Examples/PACketMan/tests/state.test.js`.

### Implementation

- [X] T012 [P] [US1] Implement pure route connectivity, hop-count, latency-sum, availability, and all-tied-best evaluation in `WORKSHOP/LAB/Examples/PACketMan/engine/rules.js`.
- [X] T013 [US1] Map routing result codes and link values to specific learner explanations in `WORKSHOP/LAB/Examples/PACketMan/engine/feedback.js`.
- [X] T014 [US1] Render the Level 1 briefing, maze grid, route metrics, objective, and traceroute output in `WORKSHOP/LAB/Examples/PACketMan/ui/render.js`.
- [X] T015 [US1] Implement arrow-key grid movement, pointer supplements, and prompts that pause movement at Level 1 decision gates in `WORKSHOP/LAB/Examples/PACketMan/ui/controls.js`.
- [X] T016 [US1] Connect the Level 1 data, route evaluator, feedback, and state transitions to the page flow in `WORKSHOP/LAB/Examples/PACketMan/main.js` and `WORKSHOP/LAB/Examples/PACketMan/engine/state.js`.

**Checkpoint**: The Level 1 independent test passes through the browser; incorrect choices do not complete the level and the learner can retry.

## Phase 4: User Story 2 — Apply network rules across the campaign (Priority: P1)

**Goal**: Add Levels 2–6 with their distinct network models, visible background packets, authored hazards, and sequential progression.

**Independent Test**: Verify each later level with at least one valid and one plausible incorrect decision against its declared model; play through all five levels in order, including a Level 6 drop followed by a no-penalty successful delivery retry.

### Tests and authored case data

- [X] T017 [P] [US2] Add independently reviewed ACL first-match/default, TCP/UDP need, subnet-boundary/gateway, QoS service-order, risk-ranking, and deterministic trace cases in `WORKSHOP/LAB/Examples/PACketMan/tests/rules.test.js`.
- [X] T018 [P] [US2] Author Level 2 ACL and Level 3 transport lessons, packet fields, policies, hints, and source records in `WORKSHOP/LAB/Examples/PACketMan/data/levels.json`.
- [X] T019 [P] [US2] Add direct Level 2–6 state cases for rule-edit restoration, ordered progression, retained correct risk choice, and no-penalty hazard retry in `WORKSHOP/LAB/Examples/PACketMan/tests/state.test.js`.

### Implementation

- [X] T020 [US2] Author Level 4 subnet/gateway and Level 5 QoS lessons, including IPv4 prefixes, queue policy, and scripted shared-link traffic, in `WORKSHOP/LAB/Examples/PACketMan/data/levels.json`.
- [X] T021 [US2] Author Level 6 candidate routes, displayed risk model, risk-reducing action, background traffic, and ordered deterministic per-link hazard traces in `WORKSHOP/LAB/Examples/PACketMan/data/levels.json`.
- [X] T022 [US2] Implement ordered ACL matching/default action, one-crossing rule edits, TCP/UDP delivery-need evaluation, and local/off-subnet gateway selection in `WORKSHOP/LAB/Examples/PACketMan/engine/rules.js`.
- [X] T023 [US2] Implement the declared QoS service policy and Level 6 risk grading, link-effect delivery, and successful-trace validation in `WORKSHOP/LAB/Examples/PACketMan/engine/rules.js`.
- [X] T024 [US2] Add level-specific feedback that names the matching rule, transport behavior, gateway decision, queue effect, or hazard cause in `WORKSHOP/LAB/Examples/PACketMan/engine/feedback.js`.
- [X] T025 [US2] Render Level 2–6 packet fields, rule list, transport/gateway decisions, shared traffic, queue state, risk values, and trace outcomes in `WORKSHOP/LAB/Examples/PACketMan/ui/render.js`; visibly label the learner-controlled packet and scripted background packets using text as well as distinct visual markers, and identify their shared bottleneck before enabling the level's first decision.
- [X] T026 [US2] Wire each authored gate decision to its evaluator and advance through the six levels only after the level objective and required delivery succeed in `WORKSHOP/LAB/Examples/PACketMan/ui/controls.js` and `WORKSHOP/LAB/Examples/PACketMan/engine/state.js`.

**Checkpoint**: Each lesson can be evaluated against reviewed cases; the complete campaign follows the specified order and a Level 6 drop never reverses a correct risk grade.

## Phase 5: User Story 3 — Get help, retry, and finish accessibly (Priority: P1)

**Goal**: Complete the method-first help flow, safe retries, final summary, and keyboard/reduced-motion/narrow-window experience.

**Independent Test**: Complete all six levels with keyboard-only controls; use hints, make and retry a wrong choice, observe and retry a Level 6 drop, reach the summary, then verify reload starts a fresh session.

### Tests and content

- [X] T027 [P] [US3] Add method-first hints and optional worked solutions for all six lessons in `WORKSHOP/LAB/Examples/PACketMan/data/levels.json`.
- [X] T028 [P] [US3] Add state cases for hint tracking, invalid input, duplicate submit/advance, completed-level uniqueness, restart reset, assistance summary, and Level 6 retry state in `WORKSHOP/LAB/Examples/PACketMan/tests/state.test.js`.

### Implementation

- [X] T029 [US3] Track attempts, assistance, completed level IDs, hint state, and final progress summary without duplicate completion in `WORKSHOP/LAB/Examples/PACketMan/engine/state.js`.
- [X] T030 [US3] Render method hints, worked solutions, confirmation for restart, and the final completed-level/assistance summary in `WORKSHOP/LAB/Examples/PACketMan/ui/render.js`.
- [X] T031 [US3] Implement ARIA-grid roving tabindex, predictable focus movement to prompts and feedback, labeled decision controls, and accessible status updates in `WORKSHOP/LAB/Examples/PACketMan/ui/controls.js`.
- [X] T032 [US3] Provide textual equivalents for essential grid state, status announcements, and accessible names for challenge controls in `WORKSHOP/LAB/Examples/PACketMan/ui/render.js`.
- [X] T033 [US3] Add visible focus, non-color feedback distinctions, reduced-motion behavior, and narrow-window layout rules in `WORKSHOP/LAB/Examples/PACketMan/style.css`.
- [X] T034 [US3] Verify state behavior and rendered accessibility semantics with focused cases in `WORKSHOP/LAB/Examples/PACketMan/tests/state.test.js` and `WORKSHOP/LAB/Examples/PACketMan/tests/index.html`.

**Checkpoint**: The full campaign is keyboard operable; help never awards completion, retries remain safe, and the final summary is accurate.

## Phase 6: Polish and cross-cutting verification

**Purpose**: Verify technical claims, original presentation, static hosting, learner outcomes, and reproducible release instructions.

- [X] T035 Write actual server, game, and browser-test instructions plus the declared model and limitations in `WORKSHOP/LAB/Examples/PACketMan/README.md`.
- [X] T036 Review each level's factual claims, source section, RFC status, simplifications, and explanations; record verification evidence in `WORKSHOP/LAB/Examples/PACketMan/data/levels.json` and `WORKSHOP/LAB/Examples/PACketMan/README.md`.
- [ ] T037 Run the six-level fresh-session playthrough and verify packet ownership and shared-bottleneck visibility before acting in Levels 5–6; test with five first-time learners from the intended audience without facilitator intervention; record aggregate, non-identifying results and browser/environment in `WORKSHOP/LAB/Examples/PACketMan/README.md`; mark SC-002 passed only if at least four of five finish in 5–10 minutes, and SC-003 passed only if at least four of the same five can explain a sampled wrong result and identify a valid next action after reading its feedback.
- [X] T038 Verify game data, modules, and styles resolve from a repository-subpath URL; record the hosting result and any limitations in `WORKSHOP/LAB/Examples/PACketMan/README.md`.
- [X] T039 Review the game identity and all authored visuals/copy for original expression, keyboard-only completion, reduced motion, narrow layout, and screen-reader behavior; record pass/fail/not-run evidence in `WORKSHOP/LAB/Examples/PACketMan/README.md`.

## Dependencies and execution order

### Phase dependencies

- **Setup (Phase 1)**: No dependencies; creates the application and test entry points.
- **Foundational (Phase 2)**: Depends on Setup; content validation, state initialization, and loading/error behavior block all stories.
- **User Story 1 (Phase 3)**: Depends on Foundations; delivers the MVP route lesson.
- **User Story 2 (Phase 4)**: Depends on User Story 1 because the campaign is sequential; each later lesson remains independently checkable through its domain cases.
- **User Story 3 (Phase 5)**: Depends on User Stories 1–2 so full help, accessibility, progression, and summary can be verified across all six levels.
- **Polish (Phase 6)**: Depends on all stories; human review and release evidence apply to the complete game.

### Within-story dependencies

- **US1**: T009, T010, T011, and T012 can proceed in parallel after Foundations. T013 follows T012; T014 follows T010 and T013; T015 follows T014 and T016 integrates the completed flow.
- **US2**: T017–T019 can proceed in parallel after US1. T020 and T021 build the remaining content; T022–T023 extend the rules; T024–T025 add feedback and views; T026 integrates progression and Level 6 retry.
- **US3**: T027 and T028 can proceed in parallel after US2. T029–T034 add help, accessible controls, style, summary, and focused verification in that order where they share files.
- **Polish**: T035–T039 all update `README.md`, so serialize their documentation edits and merge each evidence result before the next task records its results. Independent verification activities may run in parallel only when they are not concurrently editing that file.

## Parallel execution examples

### User Story 1

```text
Parallel: T009 route cases, T010 Level 1 data, T011 state cases, T012 pure route evaluator
Then: T013 feedback → T014 view → T015 controls → T016 app integration
```

### User Story 2

```text
Parallel: T017 later-level rule cases, T018 Levels 2–3 data, T019 progression/drop cases
Then: T020 Levels 4–5 data → T021 Level 6 data
Then: T022 rules → T023 QoS/hazard evaluation → T024 feedback → T025 views → T026 progression integration
```

### User Story 3

```text
Parallel: T027 help content and T028 help/progress state cases
Then: T029 state → T030 help/summary views → T031 keyboard/focus behavior
Then: T032 accessible text/status → T033 styling → T034 focused verification
```

## Implementation strategy

### MVP first

Complete Setup, Foundations, and User Story 1 only. Stop and verify the full Level 1 route lesson—including tied-best routes, an explained wrong route, retry, and traceroute—before expanding the campaign.

### Incremental delivery

1. Setup and Foundations produce a runnable shell and content-error handling.
2. User Story 1 produces the first complete, independently testable lesson.
3. User Story 2 adds Levels 2–6 while preserving the Level 1 flow.
4. User Story 3 adds help, accessible operation, safe progression, and the completion summary.
5. Polish records factual, learner, accessibility, and hosting evidence.

## Format validation

All task entries use `- [ ]`, a sequential `T###` ID, `[P]` only where files can be worked on independently, `[US#]` on user-story phase tasks, and an explicit project-relative file or directory path.
