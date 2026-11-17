# PACketMan · Data model

## Document shape

`data/levels.json` is one versioned document:

```text
ContentDocument
├── schemaVersion: positive integer
├── sources: Source[]
├── maze: Maze with three spatial sections
└── levels: Level[1..6] ordered by `order`
```

Every mode validates the document structure and every included level before starting; included levels must have unique IDs and contiguous orders beginning at 1. `validateDevelopmentDocument` accepts one through six valid levels for the explicit local `?dev=1` MVP mode. The default `validateCampaign` path additionally requires exactly six levels ordered 1–6. Normal startup and release checks use `validateCampaign`; a partial campaign must not pass that check. Invalid content produces a visible content error and cannot be graded.

## Entities

### Source

| Field | Type | Constraints |
| --- | --- | --- |
| `id` | string | Stable and unique in the document |
| `title` | string | Non-empty display title |
| `url` | string | Valid HTTPS URL to an authoritative source |
| `section` | string | Section or subsection supporting the claim |
| `claim` | string | Concise factual claim supported by that section |

Every factual level statement references one or more source IDs. Missing IDs or unsupported claims are authoring errors.

### Level

| Field | Type | Constraints |
| --- | --- | --- |
| `id` | string | Stable and unique |
| `order` | integer | Exactly 1–6, with no duplicate or missing order |
| `title` | string | Non-empty |
| `learningOutcome` | string | One observable outcome |
| `briefing` | string | States the objective, relevant model, and simplifications |
| `sourceIds` | string[] | Every ID resolves to a `Source` |
| `network` | `NetworkModel` | Level-specific nodes, links, packet fields, policies, and metrics |
| `challenge` | discriminated union | Its `type` matches the level's prescribed lesson |
| `hints` | `Hint[]` | Ordered method-first, solution-second |
| `completion` | `CompletionRule` | States what must be true before advancing |
| `backgroundPackets` | `BackgroundPacket[]` | Required and visible for Levels 5–6; absent or empty elsewhere |
| `hazardTraces` | `HazardTrace[]` | Required for Level 6; absent or empty elsewhere |
| `checkpoints` | `Checkpoint[3]` | Three ordered, individually validated same-topic scenarios |
| `ghostQuestions` | `GhostQuestion[]` | Nonempty same-topic question pool; three authored per lesson |

Level order is fixed: routing, ACL, transport, subnet/gateway, QoS, congestion/loss.

### Grid and network topology

| Entity | Fields and invariants |
| --- | --- |
| `Maze` | Shared positive integer `rows` and `columns`, start/destination coordinates, approach path, optional detour cells, and exactly three ordered sections. Coordinates are zero-based and in bounds. Traversable tiles are derived from the union of authored paths. |
| `MazeSection` | A gate, exit, `direct`/`upper`/`lower` paths, connector to the next gate (or destination), and optional reachable detours. Paths join their endpoints through adjacent non-repeating cells. Later gates and the destination cannot be unlocked prematurely. |
| `NetworkNode` | Stable ID and logical node role such as host, router, or gateway; independent of tile coordinates. |
| `NetworkLink` | Stable ID, valid endpoint node IDs, integer `latencyMs >= 0`, `available` boolean, and integer `riskPoints >= 0`. |
| `Route` | An ordered list of connected link IDs across the current checkpoint's logical network segment. Compute hop count from link count and latency/risk totals from link values; do not duplicate derived values in authoritative content. |

The level objective selects which route metric is compared. Lower latency or lower risk is better when explicitly stated. Every tied minimum is accepted. A blocked or disconnected route is not a valid answer.

### Checkpoint

Each checkpoint has a unique ID within its level, title, briefing, method/solution hints, a `challenge` field overlay, and a `linkOverrides` array. Link overrides reference existing link IDs and may change only latency, risk, or availability. Each checkpoint is composed independently with the base level; it does not inherit mutations from previous checkpoints. Its effective challenge must retain the lesson's topic and pass all model validation.

Network routes identify the matching spatial path in the current maze section. A correct routing/risk choice opens that path; other correct decisions open all three paths. Cleared sections remain traversable. Hints are tracked by level, checkpoint, and hint kind; temporary rule edits reset after a crossing and at the next checkpoint.

### Ghost and encounter question

The shared maze declares `ghosts`, a nonempty array of unique IDs, names, color tones (`violet`, `coral`, `mint`), spawn coordinates, and patrol waypoints. The campaign has three ghosts in separate connected regions. Spawns and patrols must use ordinary corridor cells, excluding the start, destination, and numbered gates. Every region needs reachable waypoints and room to retreat.

Runtime ghosts add a copied `position` and `patrolIndex`. Each active chase tick advances one adjacent tile along a deterministic shortest path toward the reachable packet, or toward the next patrol waypoint when the packet is in another region or a safe zone. Player route locks do not restrict ghost movement. The browser schedules ticks every 750 ms; this is an arcade clock, not a network metric.

Each `GhostQuestion` has a unique level-local `id`, `prompt`, at least two labeled choices with unique IDs, an `answerId` referencing a choice, and an `explanation`. New captures select the next question modulo the pool length. Incorrect or invalid answers enter retry feedback without rotating the question or changing required checkpoint attempts, position, bits, or progress.

### Packet and decision

The learner-controlled packet has a stable ID, current node/coordinate, status, and only the fields needed by its level: source IPv4 address, destination IPv4 address, destination port, protocol, transport choice, or traffic class. User decisions are structured identifiers, never presentation text or choice position.

| Decision type | Authored inputs | Evaluation rule |
| --- | --- | --- |
| `routing` | Objective metric and valid topology | Accept a viable route with a best objective value; include all ties |
| `acl` | Packet header, ordered match rules, default action | First matching rule decides; if none match, use the explicit default |
| `transport` | Delivery need and modeled TCP/UDP behavior | Compare the selected transport with the stated need; do not impose an unstated movement-speed penalty |
| `subnet-gateway` | IPv4 source/destination, prefix, configured gateway | Local destination uses local delivery; off-subnet destination uses the configured gateway |
| `qos` | Traffic classes, shared bottleneck, declared queue policy | Derive service order and delay from the declared model and scripted arrivals |
| `congestion-loss` | Candidate routes, risk points, optional risk-reducing action | Grade the lowest-risk viable strategy before attempting delivery |

ACL `Rule` fields include stable ID, protocol matcher, source matcher, destination-port matcher, and `allow`/`deny` action. Rule order is significant; the default action is mandatory. The Level 2 one-use edit identifies the single rule and field it changes and the crossing after which the original value is restored.

IPv4 addresses and prefixes must parse and be in range. Prefix boundaries are inclusive according to the authored network prefix; no malformed or missing prefix may be graded.

### Background packet and queue

Levels 5–6 may define visible scripted packets with stable IDs, class, route/link schedule, and arrival tick. A shared `QueuePolicy` names the service discipline and all parameters required by the level. Queue outcomes are computed from authored values; the visualization cannot imply priority, service, or loss that the model did not produce.

Ticks are abstract game steps, not wall-clock seconds. Any timing simplification is stated in the briefing. Background motion may be animated, but it does not change evaluator results.

### Hazard trace

| Field | Type | Constraints |
| --- | --- | --- |
| `id` | string | Stable and unique within the level |
| `linkEffects` | `LinkHazardEffect[]` | At most one deterministic effect per valid link ID |

Each `LinkHazardEffect` contains a `linkId`, non-negative `additionalDelayMs`, `drop` boolean, and explanation. Delivery outcome is computed from the selected route and trace: a route is dropped if it crosses a link whose effect has `drop: true`; otherwise it is delivered. Route delay includes the selected effects' delay. The evaluator does not trust a separately authored outcome that could contradict the modeled links.

Trace sequence order is fixed. Each Level 6 delivery attempt uses the next trace for the already-accepted strategy; a drop does not add a wrong decision, erase the correct strategy, or count as a learner penalty. Every accepted low-risk route must have at least one trace with no drop effect on its links. Validate this invariant before play. The same trace and strategy always reproduce the same result.

### Session progress

Session state exists only in memory and resets on reload.

| Field | Meaning |
| --- | --- |
| `levelIndex` | Current level index, starting at Level 1 |
| `view` | Current UI state in the transition model |
| `position` | Current grid coordinate |
| `checkpointIndex` | Current checkpoint within the level |
| `checkpointChoices` | Accepted decisions and selected route IDs for the cleared prefix of checkpoints; determines unlocked corridors |
| `bitsCollected` / `collectedCells` | Campaign cosmetic score and per-level collected tile keys; backtracking cannot award a second bit |
| `ghosts` | Runtime ghost positions and patrol cursors |
| `ghostGraceTicks` | Remaining protected chase ticks; movement does not consume them, and pause/questions freeze them |
| `encounter` | Null or the caught ghost ID, question index, and current evaluation |
| `encounterSequence` | Per-level question rotation cursor; advances only on a new capture |
| `ghostEncounters` / `ghostQuestionsSolved` | Campaign capture and correct extra-answer totals, separate from required decisions |
| `decisionAttempts` | Required checkpoint attempts only; ghost answers do not increment this counter |
| `completedLevelIds` | Ordered IDs of satisfied levels; each appears at most once |
| `assistanceUsed` | Hint or worked-solution IDs used during this session |
| `deliveryTraceIndex` | Index of the next trace to use for delivery retry |
| `acceptedRiskStrategy` | The correct Level 6 strategy retained across environmental drops |

## State transitions

```text
loading
  ├─ valid document → briefing
  └─ invalid document → content-error → retry loading

briefing → playing-grid
playing-grid ↔ paused
playing-grid → ghost-question
ghost-question
  ├─ invalid/incorrect → ghost-feedback → ghost-question
  └─ correct → ghost-success → acknowledgement → playing-grid
playing-grid → decision-prompt → playing-grid
decision-prompt
  ├─ invalid/incorrect → feedback → decision-prompt
  └─ correct → playing-grid → next checkpoint
playing-grid (all three checkpoints cleared, destination reached) → delivering
delivering
  ├─ delivered → level-complete → next briefing or summary
  └─ dropped → drop-explanation → delivery-retry → delivering
```

Only all three accepted checkpoint decisions followed by required delivery add the level ID to `completedLevelIds`. A repeated submit after completion cannot add duplicate progress. Level 6's final checkpoint risk choice is retained through drops, while delivery consumes the next authored trace and applies only effects on that selected route.

Ghost ticks run only in `playing-grid`. A hidden page transitions active play to `paused`; returning does not resume automatically. Successful encounter feedback remains frozen until acknowledgement, which retreats the catcher to a far reachable unoccupied tile and grants four protected chase ticks. A correct required checkpoint also grants four ticks. Level advance resets positions, patrols, grace, and question rotation while retaining campaign encounter totals; restart resets everything.

## Validation and error handling

Reject the document before play if any of the following is found:

- Unknown schema version, missing required field, wrong field type, duplicate ID/order, or unsupported level/challenge type.
- Grid coordinate out of bounds, missing start/destination, invalid gate, broken link endpoint, or no viable route.
- Invalid IPv4 address/prefix, malformed ACL matcher, missing default action, or contradictory rule data.
- Missing source record, broken source URL shape, or unreferenced content that claims a factual rule without evidence.
- Missing background traffic where required, a QoS policy with unspecified service behavior, or a Level 6 accepted route with no successful trace.
- Non-finite numeric values, negative latency/risk, or derived totals inconsistent with the evaluator.
- Missing ghost/question pools, duplicate identities or choices, unknown answer references, or missing prompts/explanations.
- Ghost spawns/patrols on walls or safe cells, overlapping patrol regions, unreachable waypoints, or no room to retreat.

Surface an actionable content error naming the level and field when possible. Do not increment learner decision attempts or show the error as an incorrect answer.
