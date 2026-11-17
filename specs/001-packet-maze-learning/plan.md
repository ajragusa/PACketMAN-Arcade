# PACketMan · Implementation plan

**Branch**: `001-reference-starterkit-spec` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)
**Input**: Clarified feature specification based on `WORKSHOP/LAB/StarterKit/SPEC.md`

## Summary

Build a six-level, browser-based networking maze in which the learner directly moves one packet through a grid and resolves explicit network decisions at gates and junctions. Keep authored level data separate from deterministic networking rules, session state, and accessible DOM controls. Deliver one complete playable level first, then add the remaining five lessons without adding new scoring pathways.

The Level 6 risk decision is graded independently from a particular hazard outcome. A drop is explained as an environmental event; the learner retries delivery without penalty using the next authored trace, and the level advances only after delivery. Tied best routes are all valid.

Three original ghosts move continuously during active play. Captures open extra same-topic questions without changing checkpoint grading or erasing progress. Keep deterministic ghost steps in the engine and one browser-owned timer in the entry point; all questions and pause states stop the chase.

## Build target

Implement all six lessons, each with three required checkpoints and a pool of extra ghost questions, with a first playthrough target of 5–10 minutes that still requires human validation. Prioritize a correct, complete Level 1 vertical slice before adding campaign content.

**Hardest behavior to get right:** Keep networking correctness separate from movement, delivery outcomes, authored hazard traces, and progress transitions.

**First evidence we'll check:** A hand-reviewed Level 1 case accepts every minimum-latency route, including tied routes, and rejects a plausible non-minimum route with an explanation based on the displayed link latencies.

## Stack and serving

- Semantic HTML, CSS, and native browser JavaScript modules; no framework, bundler, backend, or runtime model.
- Use DOM controls for the grid and decisions, with SVG only for data-driven network diagrams where it improves comprehension. No rendering dependency.
- Store authored content in `data/levels.json` and load it with a relative URL. Always validate every included level; only the explicit local MVP mode may start with a partial campaign. Normal startup requires all six levels.
- Keep progress in memory. Reload starts a new session; no persistence in v1.
- Serve over HTTP so native modules and JSON loading work. Use relative paths so the game also works when hosted below a repository subpath.
- Use a dependency-free browser test page at `tests/index.html`; it imports pure engine modules and reports passed and failed case IDs.

Preview from `WORKSHOP/LAB/Examples/PACketMan/` after implementation creates `index.html`:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/`. During the Level 1 MVP, open `http://127.0.0.1:8000/?dev=1` to explicitly allow the partial campaign; normal startup without that flag requires all six levels. Run the test page at `http://127.0.0.1:8000/tests/`. Do not use `file://`.

## Technical Context

- **Language/Version**: Browser JavaScript ES modules, HTML5, CSS; Python 3 standard library for local serving
- **Primary Dependencies**: None at runtime; no framework, bundler, or rendering library
- **Storage**: Authored JSON files; in-memory session state only
- **Testing**: Dependency-free browser test runner in `tests/index.html`; manual acceptance and accessibility checks
- **Target Platform**: Current evergreen desktop browsers; responsive narrow-window layout; same-origin static hosting
- **Project Type**: Static browser learning game
- **Performance Goals**: Discrete grid movement and decisions update without perceptible delay; feedback is available immediately and never waits on animation
- **Constraints**: No account, backend, live network, external answer service, runtime AI, or runtime-generated content. Every simplified network rule is declared in the level briefing. Keep essential information available without color, animation, or pointer-only interaction.
- **Scale/Scope**: Six ordered lessons, eighteen required checkpoints, three roaming ghosts, and eighteen authored extra questions; one learner-controlled packet; visible scripted background packets in Levels 5–6; target first playthrough 5–10 minutes.

## Constitution Check

The repository's `.specify/memory/constitution.md` explicitly governs Per-Hop Works only. Its Three.js, tool-gate, and five-loop implementation requirements do not apply to PACketMan. Use the workshop StarterKit principles as planning guidance and the clarified feature specification as the product contract.

| Gate | Assessment | Status |
| --- | --- | --- |
| Technical truth | Domain decisions use explicit models, deterministic evaluation, cited sources, and independently reviewed expected cases. Level 6 loss does not grade the learner's risk choice. | PASS |
| Learning through decisions | Each level has one stated learning outcome and a player action that exercises it; wrong choices explain the applicable rule and permit retry. | PASS |
| Honest progress | Only satisfying the level objective advances the campaign. Hints, incorrect choices, and Level 6 drops do not award completion. | PASS |
| Accessibility | Keyboard movement and decision controls, visible focus, textual feedback, reduced-motion support, and a narrow layout are included in the design and verification. | PASS |
| Self-contained and deterministic | Runtime content is local and authored; domain evaluation is pure. Fixed Level 6 traces are replayable, with no external service deciding answers. | PASS |
| Reviewable content and logic | Levels and references are data-driven; content validation, evaluation, and session progression are separate modules. | PASS |
| Evidence of completion | Tests include correct, incorrect, boundary, content-error, and state-transition cases; manual play and accessibility checks are recorded. | PASS |

No external API or system contract is exposed, so no `contracts/` directory is required. The six-level scope exceeds the StarterKit constitution's three-level first-release default because six distinct learning topics were explicitly requested. Keep that scope bounded to one primary challenge per level and use staged delivery rather than reducing a required topic.

## Research decisions

See [research.md](./research.md) for the investigated alternatives and sources. The remaining implementation choices are resolved: native browser modules, relative same-origin JSON loading, deterministic authored hazard traces, and an accessible grid with deliberate focus handling.

## Project Structure

Planning artifacts live in `specs/001-packet-maze-learning/`: `spec.md`, `plan.md`, `research.md`, `data-model.md`, and `quickstart.md`. `tasks.md` will be generated in the next phase. No `contracts/` directory is needed because PACketMan exposes no external API or system interface.

```text
WORKSHOP/LAB/Examples/PACketMan/
├── index.html                    Semantic page shell and module entry point
├── style.css                     Layout, focus, feedback, and reduced motion
├── main.js                       Load, validate, start, render loading/errors
├── engine/
│   ├── content.js                Validate authored levels and references
│   ├── rules.js                  Pure networking evaluation and route metrics
│   ├── state.js                  Session transitions, retries, and completion
│   ├── checkpoints.js            Effective checkpoint models and unlocked maze cells
│   ├── ghosts.js                 Deterministic patrol, chase, safe zones, and retreat
│   └── feedback.js               Explanations from structured evaluation results
├── ui/
│   ├── render.js                 Briefing, grid, prompts, feedback, and summary
│   └── controls.js               Keyboard/pointer events and focus handling
├── data/
│   └── levels.json               Six lessons, network models, sources, and traces
├── tests/
│   ├── index.html                Browser runner and visible pass/fail summary
│   ├── rules.test.js             Independent correct, wrong, and boundary cases
│   ├── state.test.js             Retry, hints, drops, and progression cases
│   └── content.test.js           Missing, duplicate, and contradictory data cases
└── README.md                     Run instructions, model, and verification evidence
```

Keep files together if a split would create indirection without a distinct responsibility. `data/levels.json` is the source of editable lesson content; UI code must not contain answer keys or decide correctness.

**Structure Decision:** Use one self-contained static browser application under `WORKSHOP/LAB/Examples/PACketMan/`, matching the workshop examples layout. Keep the pure engine, DOM UI, authored data, and browser tests in separate top-level directories so their responsibilities and verification remain clear.

## Data contract

The JSON document contains `schemaVersion`, `sources`, a shared three-section `maze`, and ordered `levels`. Each level has a stable unique ID, title, learning outcome, briefing, source IDs, base network model/challenge, hints, completion condition, and exactly three same-topic checkpoints. Each checkpoint independently overlays the base model with its own scenario, hints, and optional link changes. The detailed entities and validation rules are in [data-model.md](./data-model.md).

The maze also declares ghost spawns and patrol waypoints in separate reachable regions, excluding safe checkpoints/start/destination. Each level supplies a nonempty `ghostQuestions` pool with validated prompts, choices, answer references, and explanations.

Core authored values and invariants:

- Every included level and its references are validated before play in every mode. The explicit `?dev=1` local mode accepts a partial campaign for staged implementation; normal startup and release validation require exactly the six ordered levels. Missing or inconsistent content is a content error, not a wrong learner answer.
- Grid coordinates are zero-based integer row/column pairs; every traversable cell and link endpoint must exist.
- Latencies are non-negative integer milliseconds. Route latency is the sum of displayed link latencies; route hop count is the number of links.
- Risk is a non-negative integer risk-point total, explicitly labeled as a game model rather than a real-world probability. Lower is safer; all routes tied for the best objective value are accepted.
- ACL rules are ordered and use explicit protocol, source, destination-port match fields, action, and a declared default action.
- Subnet prefixes and addresses must parse as IPv4; local/off-subnet behavior uses the configured prefix and gateway.
- Background schedules and hazard traces are authored, finite, and deterministic. Every accepted Level 6 strategy has a trace that delivers; a retry uses the next trace without adding a learner error or penalty.
- Every factual claim links to a source record containing a title, URL, section, and supported claim. Missing or inconsistent content is a content error, not a wrong learner answer.

## Domain evaluation contract

`engine/rules.js` exposes pure evaluators that receive a validated challenge and a structured learner decision and return a structured result:

```text
{
  status: "correct" | "incorrect" | "invalid-input" | "content-error",
  reasonCode: stable identifier,
  expected: domain-specific result or null,
  evidence: values used to explain the decision
}
```

- Identical inputs produce identical results. Evaluators do not read the DOM, change progress, use timers, fetch data, or generate randomness.
- Route comparison uses the level's stated objective and modeled links. Accept all tied best routes.
- ACL evaluation uses the first matching rule, or the declared default action when none match.
- Transport, subnet/gateway, QoS, and congestion/loss evaluators use only the assumptions explicitly authored for that level.
- For Level 6, evaluate the risk strategy before delivery. A later trace drop changes delivery state, not the already-correct risk evaluation. Keep delivery retry state distinct from decision attempts.
- Feedback is composed from `reasonCode` and `evidence`; the UI does not calculate the expected answer.
- Expected test results are hand-reviewed examples independent of the evaluator implementation.
- Extra ghost answers use the authored current-topic question key and explanation; their grading and solved count are separate from required checkpoint decisions and completion.

## Session transitions

```text
loading → briefing → playing-grid
playing-grid ↔ paused
playing-grid → ghost-question → ghost-feedback → ghost-question
ghost-question → ghost-success → acknowledgement → playing-grid
playing-grid → decision-prompt → playing-grid
decision-prompt → incorrect-feedback → decision-prompt
decision-prompt → correct-decision → playing-grid → next checkpoint
playing-grid (all three checkpoints cleared, destination reached) → delivering
delivering → dropped-feedback → delivery-retry → delivering
delivering → delivered → level-complete → next briefing / campaign summary
loading or validation failure → content-error → retry load
restart confirmation → fresh first briefing
```

The state module owns the current level, packet position, submitted decisions, completion, hints/assistance, and Level 6 trace index. A wrong decision leaves the current challenge available. A Level 6 drop keeps the accepted strategy, explains the event, and retries delivery using the next authored trace; a successful delivery completes the level. Reload resets all state.

Arrow keys, WASD, and on-screen direction buttons move through unlocked grid cells. Movement stops at each of three authored decision gates until the learner resolves its same-topic prompt. Route/risk choices open a selected corridor; other correct decisions open all three corridors. Backtracking and cosmetic bit detours are allowed without resetting progress or duplicating pickups. After entering a prompt, move focus deliberately to its heading or first control; after feedback, keep a predictable path back to the grid.

One 750 ms browser interval advances ghosts only during visible `playing-grid` play. Ordinary ticks update sprites, occupancy labels, and textual positions in place, preserving the board, focus, and scroll. Captures trigger a full prompt render. P/Escape and the pause button stop play; hidden pages pause and require deliberate resume. Correct encounter acknowledgement retreats the catcher and grants four protected ticks; wrong answers retain the same question and all progress. Ghost state resets per lesson while campaign encounter totals persist.

## Interaction and visual direction

Use an original network-maze visual identity. The grid depicts topology and packet position; link metrics, packet fields, classes, and hazard state are rendered as text from data. Do not copy Pac-Man characters, maze layouts, sounds, artwork, or signature presentation.

Represent the maze as an ARIA grid with roving tabindex and arrow-key navigation. Keep an accessible text description of current location and objective. Use labeled, focusable controls for network decisions, a polite status region for concise outcome updates, and textual explanations that do not depend on color. Do not announce every background animation tick. Respect `prefers-reduced-motion`; animation never delays a decision, retry, or feedback.

## Implementation order

| Slice | Deliverable | Evidence before the next slice |
| --- | --- | --- |
| 1 · Prove rules | Pure Level 1 route evaluator, validated content shape, and independent expected cases | Correct, plausible-wrong, blocked, and tied-best route cases pass |
| 2 · Complete one level | Level 1 briefing, direct grid movement, junction prompt, feedback, retry, and advance | One wrong and one correct browser path reach the expected states |
| 3 · Add the curriculum | Levels 2–6, level-specific models, background traffic, and Level 6 trace retry | Each level's reviewed cases pass; content validation rejects invalid lessons |
| 4 · Make it usable | Keyboard/focus behavior, reduced motion, narrow layout, loading/content errors, and final summary | Manual keyboard-only, reduced-motion, narrow-window, and error-state checks recorded |
| 5 · Package the result | README, run/test instructions, and verification evidence | A new attendee can run the game, tests, and a fresh-start playthrough |

Generate `tasks.md` from these slices and the actual acceptance criteria. Do not add a large task tree for hypothetical stretch features.

## Verification and reporting

The browser test page imports the same pure engine modules used by the game and shows the number of executed cases, failures, and failed case IDs. A zero-test run is a failure. Cover:

| Check | Evidence required |
| --- | --- |
| Domain cases | Correct, plausible wrong, tie, boundary, and invalid decision outcomes for all six models |
| Content validation | Missing fields, duplicate IDs, broken references, invalid prefixes, unsupported rules, and impossible Level 6 traces fail before play |
| State transitions | Retry, help, repeated submit, Level 6 drop/retry/success, advance, summary, and reload reset |
| Ghost encounters | Legal deterministic chase/patrol, safe cells, both collision directions, frozen prompts/pause, retry preservation, retreat/grace, rotation, lesson resets, and real browser timer/focus behavior |
| Source review | Each factual claim and explanation matches its cited source and declared model |
| Browser playthrough | Fresh session through all six levels, including one wrong answer and a Level 6 drop |
| Traffic ownership visibility | Before the first decision in Levels 5–6, the learner can identify the controlled packet, scripted background packets, and their shared bottleneck from text and visual markers |
| Learner outcomes | Test five first-time learners from the intended audience without facilitator intervention; SC-002 passes at 4/5 completing in 5–10 minutes, and SC-003 passes at 4/5 explaining a sampled wrong result and naming a valid next action after feedback |
| Accessibility | Keyboard-only core flow, visible focus, textual equivalents, reduced motion, and narrow viewport |
| Hosting | Relative assets and data load from the game path and a repository subpath |

Record pass/fail/not-run, date, environment, and evidence in `README.md`. Automated tests do not replace human review of teaching content and actual screen-reader behavior.

## Scope controls

No persistence, accounts, multiplayer, live device access, runtime AI, procedural levels, editor, leaderboard, audio, or framework. Avoid adding physics or animation systems: movement is discrete and modeled outcomes are authored. If time runs short, propose the smallest coherent scope change and update the specification; do not silently omit a level or weaken a correctness rule.

## Complexity Tracking

| Scope deviation | Why needed | Simpler alternative rejected because |
| --- | --- | --- |
| Six lessons rather than the StarterKit's three-level default | The requested game explicitly covers six distinct networking topics in order. | Reducing the campaign would omit required learning outcomes; one primary challenge per level and staged implementation bound the work. |
