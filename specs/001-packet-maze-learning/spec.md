# Feature Specification: PACketMan Networking Maze

**Feature Branch**: `001-reference-starterkit-spec`
**Created**: 2026-11-17
**Status**: Draft
**Input**: User asks to reference `WORKSHOP/LAB/StarterKit/SPEC.md`, then describes PACketMan: a packet-maze game with six progressively advanced networking lessons.

## The pitch

**Guide a packet through an original network maze, make networking decisions, and see how each choice affects delivery.**

The player is a beginner learning how packets move through a network. Each level has three sequential checkpoints exploring its topic through different network conditions. Valid decisions unlock onward paths; invalid decisions explain what happened and permit a local retry. All three checkpoints must be cleared before delivery. The session ends when the player completes all six levels and eighteen checkpoint decisions.

Three original ghosts patrol and chase continuously during maze play. A catch pauses movement for an extra same-topic question. Wrong answers retry without losing progress; a correct answer sends the catcher away after the learner acknowledges its explanation. These extra questions do not replace required checkpoints.

The working title is **PACketMan**. The game uses an original packet-maze identity and visual design; it does not reproduce Pac-Man characters, maze layouts, sounds, artwork, or signature presentation.

## Clarifications

### Session 2026-11-17

- Q: How should the player control packet movement? → A: Direct grid movement with explicit decision prompts at network gates and junctions.
- Q: How should the maze become more complex? → A: A larger branching maze with three checkpoints per lesson, alternative corridors, and collectible side paths. Checkpoints explore the current lesson's topic in more depth rather than mixing earlier topics.
- Q: How should ghosts move? → A: Continuously while playing, with the chase paused during questions.
- Q: What happens after a wrong ghost-question answer? → A: Show feedback and retry the same question without losing progress.
- Q: How should competing traffic appear in Levels 5–6? → A: One player-controlled packet plus visible, scripted background packets sharing links and queues.
- Q: How should Level 3 make the TCP/UDP distinction playable? → A: Choose a transport for a stated delivery need and compare protocol behavior without a blanket speed penalty.
- Q: How should a random drop affect Level 6 completion? → A: Grade the risk-aware choice separately; allow a no-penalty retry after a drop and complete the level after delivery.

## Who this is for

- **Learner**: People new to networking or learning foundational networking concepts.
- **Assumed knowledge**: None.
- **What the briefing teaches**: The terms and decision method needed for that level before the learner acts.
- **Why interaction helps**: Choosing a route or packet makes consequences such as delay, filtering, and loss visible rather than leaving them as abstract rules.
- **Session target**: A first playthrough takes 5–10 minutes, with unlimited thinking time.

## Learning outcomes and evidence

| ID | After playing, the learner can… | The game asks them to… | Evidence of success |
| --- | --- | --- | --- |
| LO1 | Compare routes using the level's stated path criteria | Choose between routes with different hop counts and total latency | Reach the destination using the route that satisfies the stated objective |
| LO2 | Apply a simple packet filter and distinguish basic transport behavior | Match visible packet fields to rules and choose TCP or UDP for a stated need | Pass or reject the intended packet and explain the result |
| LO3 | Recognize subnet boundaries, gateway roles, traffic treatment, and congestion risk | Choose a gateway, traffic class, or route under changing network conditions | Deliver the packet and identify the network condition that affected it |

## The technical model

Version one uses a small, declared IPv4 teaching model. It presents only the fields and network behavior needed for each challenge. A level briefing states its routing objective, filtering policy, queue behavior, and any simplifications. The game distinguishes protocol facts from its own movement and timing rules.

| Level | Model and boundary |
| --- | --- |
| 1 — Routing & Pathfinding | Each viable path has a visible hop count and link latency. When asked for the lowest-latency path, compare the sum of its displayed link latencies; the fewest-hop path is not automatically fastest. The traceroute power-up briefly reveals the probed path and its hop timings. It does not claim to find a universal best path. |
| 2 — Firewalls / ACLs | A packet displays source IP, destination port, and protocol. A small, ordered rule list determines whether it is allowed or dropped; the first matching rule controls the result. A one-use rule-edit power-up may change the indicated rule for one crossing, then restores it. This is a declared game policy, not a universal firewall configuration. |
| 3 — TCP vs UDP | The learner chooses a transport for a stated delivery need. TCP is presented as an ordered byte stream with retransmission behavior; UDP as independent datagrams without transport-level delivery or retransmission guarantees. The game does not apply a blanket TCP movement-speed penalty. Applications can add recovery above UDP. |
| 4 — Subnets & Gateways | Levels use labeled IPv4 prefixes. A destination in the local subnet is reached locally; a destination outside it is sent through the configured gateway. The level shows the addresses and prefix needed to decide. |
| 5 — QoS / Priority | The level declares its traffic classes and one queue-service policy. Visible scripted background packets share the modeled bottleneck with the learner-controlled packet. A priority lane can receive service sooner; bulk traffic may wait longer. The visual lane does not imply that priority traffic is immune to link failure or packet loss. |
| 6 — Packet Loss & Congestion | Visible scripted background packets share corridors with the learner-controlled packet. Corridors show their modeled delay or loss risk. The player can compare routes and use an explicitly described power-up to reduce modeled exposure. Grade the route choice by its modeled risk, not whether one packet survives. If a drop occurs, explain it as an environmental event and allow a no-penalty retry with the next replayable hazard trace. Complete the level after delivery. A valid low-risk strategy must have a successful trace available. |

**Authoritative references**:

- [RFC 791, §3.1 — Internet Header Format](https://www.rfc-editor.org/rfc/rfc791.html): IPv4 header fields, including source, destination, protocol, and time to live.
- [RFC 792 — Time Exceeded Message](https://www.rfc-editor.org/rfc/rfc792.html): ICMP time-exceeded behavior used as background for the traceroute lesson. The game power-up is an abstraction, not a complete traceroute implementation.
- [RFC 1122, §§3.3.1.1–3.3.1.2 — Local/Remote Decision and Gateway Selection](https://www.rfc-editor.org/rfc/rfc1122.html): host routing and use of a gateway for off-link destinations.
- [RFC 4632, §3.1 — Basic Concept and Prefix Notation](https://www.rfc-editor.org/rfc/rfc4632.html): modern IPv4 prefix notation.
- [RFC 9293, §§2.2 and 3.3](https://www.rfc-editor.org/rfc/rfc9293.html): TCP's reliable, in-order byte-stream service, retransmission, and sequence numbers.
- [RFC 768 — User Datagram Protocol](https://www.rfc-editor.org/rfc/rfc768.html): UDP datagram format and service.
- [RFC 2474, §3 — Differentiated Services Field Definition](https://www.rfc-editor.org/rfc/rfc2474.html), and [RFC 4594, §§1.4.1, 2.1–2.3, and 4](https://www.rfc-editor.org/rfc/rfc4594.html): the DS field, queuing, service classes, and service-class guidance. RFC 4594 is Informational; its recommendations are not presented as protocol requirements.
- [RFC 5681, §3 — Congestion Control Algorithms](https://www.rfc-editor.org/rfc/rfc5681.html), and [RFC 7567, §2 — The Need for Active Queue Management](https://www.rfc-editor.org/rfc/rfc7567.html): TCP congestion control and active queue management context. The game does not claim that every network uses the same queue or loss behavior.

Before lesson content is authored, check each RFC Editor status page for updates and use the current text relevant to each claim. RFC 2474 has updates including RFC 3168, RFC 3260, and RFC 8436; RFC 4594 is updated by RFC 5865 and RFC 8622.

## The repeatable game loop

1. **Brief**: introduce the level's concept and terms with a worked example different from the challenge.
2. **Inspect**: show the learner-controlled packet, relevant network fields, available routes, any visible scripted background traffic, and any stated policy or hazard.
3. **Choose**: move the packet directly through the maze grid; at network gates and junctions, movement pauses while the learner makes the relevant networking choice.
4. **Observe**: move the packet through the maze and show delivery, delay, filtering, or loss.
5. **Explain**: identify the decision or network condition that caused the result; offer a hint and a retry when needed.
6. **Advance or reflect**: a successful objective unlocks the next level; the final summary shows completed lessons and assistance used.

While moving, ghosts may catch the packet from either direction. A catch opens a rotating, authored question from the current lesson; every ghost freezes until the learner answers correctly and returns to the maze. Start, numbered checkpoints, and destination are safe zones. Pause is available for planning, and the chase also pauses when the browser page becomes hidden.

**Worked interaction**: The learner sees two routes to the destination. Route A has two links totaling 80 ms; Route B has three links totaling 30 ms. The objective asks for the lowest latency, so choosing Route A produces: “This route has fewer hops, but its total latency is 80 ms. The three-hop route totals 30 ms.” The learner can retry. A traceroute power-up reveals the hops and timings of the probed route, but does not choose for the learner.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Choose a route and understand its cost (Priority: P1)

As a beginner, I want to guide a packet from its source to its destination so that I can compare path length, latency, and changing link conditions.

**Why this priority**: Routing and pathfinding are the first lesson and establish the packet-maze interaction used by later levels.

**Independent Test**: Complete Level 1 by selecting the lowest-latency viable route, then make the fewer-hop but higher-latency choice and inspect the explanation.

**Acceptance Scenarios**:

1. **Given** a fresh session, **When** I start, **Then** I see the Level 1 briefing and a source, destination, and at least two routes with visible hop counts and link latencies.
2. **Given** routes with different hop counts and total latencies, **When** I select the route satisfying the stated objective, **Then** the packet reaches its destination and the game explains the relevant route values.
3. **Given** a route with fewer hops but higher total latency, **When** I choose it for a lowest-latency objective, **Then** the game explains the comparison, does not mark the level complete, and lets me retry.
4. **Given** the traceroute power-up, **When** I use it, **Then** the probed route's hop sequence and timings appear briefly without automatically selecting a route.
5. **Given** a link becomes congested or unavailable, **When** I choose another viable route, **Then** the game shows the changed result and the cause.
6. **Given** I am moving through the maze, **When** I reach a network gate or junction, **Then** movement pauses for the relevant decision before the packet can proceed.
7. **Given** two viable routes tie for the best value of the stated objective, **When** I take either route, **Then** both are accepted as correct.

### User Story 2 — Apply network rules across the campaign (Priority: P1)

As a learner, I want each later level to introduce a different networking concept so that I can practice filtering, transport behavior, gateways, traffic treatment, and congestion one step at a time.

**Why this priority**: The requested game is a six-level learning sequence, not only a routing maze.

**Independent Test**: Play each level with one valid choice and one plausible mistake; verify the result and explanation against the level's stated model and references.

**Acceptance Scenarios**:

1. **Given** an ordered ACL and packet header, **When** I choose a packet that matches an allow rule, **Then** the packet passes and the game identifies the first matching rule.
2. **Given** a packet that matches a deny rule, **When** I submit it, **Then** it is dropped with the matching rule and relevant header fields identified; the level remains retryable.
3. **Given** the one-use rule-edit power-up, **When** I use it, **Then** only the indicated rule changes for one crossing and the original rule is restored afterward.
4. **Given** the Level 3 delivery objective, **When** I choose TCP or UDP for the stated delivery need, **Then** the outcome demonstrates ordering and retransmission behavior without a blanket movement-speed penalty; a lost UDP datagram is not automatically retransmitted by UDP.
5. **Given** a destination in the same or a different displayed subnet, **When** I choose local delivery or a gateway, **Then** the packet follows the local or configured off-subnet path respectively.
6. **Given** visible background packets sharing a Level 5 bottleneck with my packet, **When** I select a traffic class, **Then** the displayed service order and delay follow the stated policy without implying universal immunity from loss or failure.
7. **Given** visible background packets and Level 6 corridors with displayed risk, **When** I choose the lowest-risk viable strategy, **Then** the choice is graded from modeled risk, not one event's outcome; a drop is explained and allows a no-penalty retry, and the level completes after delivery.
8. **Given** a completed level, **When** I continue, **Then** the next level introduces its listed concept in order: routing, ACLs, TCP/UDP, subnets/gateways, QoS, and congestion/loss.

### User Story 3 — Get help, retry, and finish accessibly (Priority: P1)

As a learner, I want clear help, forgiving retries, and accessible controls so that I can complete the lessons without prior knowledge or a mouse.

**Why this priority**: The game is intended to teach beginners; unexplained failure or inaccessible controls would block its learning purpose.

**Independent Test**: Complete the campaign with keyboard-only controls, use hints, make an invalid action, retry, and inspect the final summary.

**Acceptance Scenarios**:

1. **Given** a challenge, **When** I request help, **Then** the game first explains the method and may then show a worked solution without marking the level complete.
2. **Given** a wrong or invalid action, **When** I submit it, **Then** I receive specific feedback, completion remains unchanged, and I can retry without penalty.
3. **Given** a solved level, **When** I advance, **Then** it completes once and the next level opens; repeated actions do not duplicate completion.
4. **Given** the final level is solved, **When** I advance, **Then** I see a summary of completed levels and assistance used.
5. **Given** keyboard-only use or reduced-motion settings, **When** I play, **Then** every core action is reachable, focused, and understandable without relying on motion or color alone.
6. **Given** a fresh page session, **When** I play and then reload, **Then** no account or live network service is required and the game starts a new session.
7. **Given** active maze play, **When** a ghost and packet meet, **Then** all movement pauses and an extra current-topic question receives focus.
8. **Given** a ghost question, **When** I answer incorrectly, **Then** feedback and a retry retain the same question, location, cleared checkpoints, bits, and accepted strategy.
9. **Given** a correct ghost answer, **When** I acknowledge the explanation, **Then** the catcher retreats and I resume with a short protected escape window; required checkpoint progress and attempts are unchanged.
10. **Given** active play, **When** I use the pause button, P, Escape, or leave the browser page, **Then** the packet and ghosts freeze until I deliberately resume. Pausing cannot bypass an unanswered question.

### Edge Cases

- A route is blocked or disconnected before the packet reaches the destination.
- Two routes tie on the objective metric, or one route is shorter but has greater total latency.
- A packet matches multiple ACL rules; the first matching rule controls the result.
- A packet matches no ACL rule; the level's explicit default action is shown.
- A power-up is unavailable, expired, or used on a rule/route that cannot be changed.
- A destination is exactly on a subnet boundary or its prefix is malformed in authored content.
- A priority class has no scheduled service in the stated observation window.
- A Level 5 or 6 scenario has no background traffic on the modeled bottleneck; the game must not invent a congestion or priority effect for that scenario.
- A Level 6 packet is dropped after a valid risk-aware choice; the decision remains correct, the learner can retry without penalty, and the authored trace sequence includes a successful delivery.
- A loss event occurs during a TCP retry, or a UDP datagram is dropped.
- An authored scenario has missing, contradictory, or unsupported teaching data; it must show a content error and must not grade or advance.
- A learner requests a hint repeatedly, submits after completion, or tries to advance before satisfying the objective.
- A ghost reaches a stationary packet, the packet moves into a ghost, or a protected packet overlaps a ghost.
- A ghost cannot reach the packet because a safe checkpoint separates their regions; it follows its patrol instead.
- A page is hidden during active play, or a pause key repeats while held; neither may accidentally resume play.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game MUST contain six ordered levels, beginning with routing and pathfinding and progressing through ACLs, TCP/UDP, subnets/gateways, QoS, and congestion/loss.
- **FR-002**: Each level MUST present a briefing, a distinct challenge, relevant values, an objective, feedback, and a retry or advance action.
- **FR-003**: Level 1 MUST show at least two viable paths whose hop counts and total latencies allow the learner to distinguish path length from delay.
- **FR-004**: The optional traceroute power-up MUST reveal the probed hop sequence and timings briefly and MUST NOT select a route or claim to identify a universal best path.
- **FR-005**: Level 2 MUST show source IP, destination port, protocol, and an ordered allow/deny rule list; results MUST follow the first matching rule and declared default action.
- **FR-006**: Level 2 MUST offer the described one-use rule-edit power-up, show the changed rule, and restore the rule after one crossing.
- **FR-007**: Level 3 MUST ask the learner to choose a transport for a stated delivery need and demonstrate TCP ordering/retransmission versus UDP datagram behavior without a blanket movement-speed penalty.
- **FR-008**: Level 4 MUST show IPv4 subnet prefixes and a configured gateway; local destinations MUST use the local path and off-subnet destinations MUST use the configured gateway.
- **FR-009**: Level 5 MUST state its queue-service policy and show how the selected traffic class affects service at the modeled bottleneck.
- **FR-010**: Level 6 MUST make modeled delay and loss risk visible and let the learner compare routes or use a risk-reducing power-up; grade route choices by modeled risk, not single-event survival; after a drop, allow a no-penalty retry with replayable traces and complete the level after delivery.
- **FR-011**: A wrong or invalid choice MUST produce a specific explanation, MUST NOT count as completion, and MUST leave the challenge retryable without penalty.
- **FR-012**: Hints MUST teach the decision method before revealing a worked solution; using help MUST be recorded separately from completion.
- **FR-013**: Progress MUST advance sequentially only after each level's objective is satisfied, and the final level MUST provide a completion summary.
- **FR-014**: All core actions MUST be keyboard accessible with visible focus and accessible names; feedback MUST be readable without color or motion alone, and reduced-motion preferences MUST be respected.
- **FR-015**: Every factual networking claim MUST identify a current authoritative reference and section; RFC status MUST be checked for relevant updates or obsoletions, and each simulation simplification MUST be stated in the level briefing.
- **FR-016**: Missing, contradictory, or unsupported authored content MUST produce a visible content error and MUST NOT be treated as learner failure or permit progress.
- **FR-017**: The game MUST use original characters, maze layouts, artwork, audio, and presentation rather than copying protected expression from existing maze games.
- **FR-018**: Version one MUST require no account, backend, live infrastructure access, or runtime AI; a reload starts a new session.
- **FR-019**: The learner MUST move the packet directly through the maze grid; movement MUST pause at each of three sequential checkpoints per lesson until the learner resolves its same-topic networking decision. Each checkpoint MUST offer direct, upper, and lower spatial corridors. Route/risk choices unlock the selected corridor; other correct decisions leave all three open. Wrong-answer retries MUST preserve earlier checkpoint progress, and all three checkpoints MUST be cleared before delivery. Open corridors permit backtracking and optional one-time bit collection.
- **FR-020**: Levels 5 and 6 MUST show visible, scripted background packets sharing relevant links or queues with the learner-controlled packet; only the learner-controlled packet is directly controlled by the player.
- **FR-021**: When multiple viable routes tie for the best value of the stated objective, the game MUST accept every tied route as correct.
- **FR-022**: Three ghosts MUST move continuously during active maze play, chasing reachable packets and otherwise patrolling their regions. Ghosts may traverse player-locked corridors but MUST NOT enter the start, numbered checkpoints, or destination. Their movement is an arcade rule, not modeled network delay.
- **FR-023**: Contact in either direction MUST open an authored extra question from the current lesson and freeze all movement. New catches rotate through the question pool; wrong-answer retries retain the question and all progress. Correct feedback MUST wait for acknowledgement before retreating the catcher and granting a protected escape window. Extra answers MUST NOT count as required checkpoint attempts or unlock gates.
- **FR-024**: A visible pause/resume button and P/Escape shortcuts MUST freeze active play without allowing questions to be skipped. Hidden pages MUST pause automatically and require deliberate resume on return. Hints remain available while paused; questions and feedback have no time limit.

### Key Entities

- **Level**: A lesson with an objective, briefing, network model, challenge, reference, hints, and completion condition.
- **Packet**: The learner-controlled item, with the displayed fields relevant to the current level.
- **Route and link**: An ordered path from source to destination, with modeled hop, delay, availability, and risk properties.
- **Rule**: An ordered allow/deny condition evaluated against the displayed packet fields.
- **Subnet and gateway**: A labeled IPv4 prefix and the configured next hop for off-subnet destinations.
- **Traffic class and queue policy**: A declared class and the level-specific rule for service at a bottleneck.
- **Background traffic**: Visible, scripted packets that share a modeled link or queue and provide context for QoS, congestion, and loss.
- **Hazard event**: A replayable modeled congestion, delay, link failure, or packet-loss event.
- **Ghost and encounter question**: An original arcade chaser with a spawn/patrol region and an authored, explained multiple-choice question from the current lesson.
- **Session progress**: The levels solved and assistance used during the current page session.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All six levels can be completed in order, and each includes at least one valid solution and one plausible incorrect action with an explanation grounded in its stated rule.
- **SC-002**: At least four of five first-time learners from the intended audience complete the first playthrough in 5–10 minutes without facilitator intervention.
- **SC-003**: After reading feedback, at least four of five tested learners can explain the cause of a sampled wrong result and identify a valid next action.
- **SC-004**: Every networking claim and declared simplification in all six levels has a cited reference or an explicit game-model label, with no unsupported claim presented as protocol fact.
- **SC-005**: A keyboard-only learner can complete all six levels, and every required action and result remains understandable with reduced motion enabled.
- **SC-006**: Replaying the same Level 6 hazard trace reproduces its modeled delay and loss events; a drop never makes a valid risk-aware choice incorrect, and a valid low-risk strategy has a successful delivery trace.
- **SC-007**: Before acting in Levels 5 and 6, learners can see which packets are under their control and which scripted background packets share the modeled bottleneck.

## Assumptions

- The working title is PACketMan; the delivered visual identity and assets are original.
- Version one teaches IPv4 only and assumes no prior networking knowledge.
- The game uses the six concepts and their order provided by the user.
- A “best” route is defined by the objective stated in that level; where lowest latency is requested, it is the viable route with the lowest sum of displayed link latencies.
- If multiple viable routes tie for the best value of the stated objective, all tied routes are accepted.
- ACL behavior is a deliberately small, ordered first-match model, not a complete firewall language.
- TCP acknowledgment/retry costs, movement, queue service, and hazard effects are game abstractions and are labeled as such.
- Congestion and loss vary across a finite, authored sequence of Level 6 hazard traces; replaying the same trace reproduces its outcomes, drops allow no-penalty retries, and valid strategies can reach delivery.
- Hints are available without penalty. Ghosts use a real-time chase clock only during active play; questions have no deadline, and there is no leaderboard or permanent life loss.
- Progress lasts only for the current page session; reloading starts the first briefing again.
- The StarterKit default first-playthrough target of 5–10 minutes is appropriate for this six-level campaign.

## Non-goals

- Recreating Pac-Man characters, mazes, audio, artwork, or signature visual presentation.
- Modeling complete Internet routing protocols, production firewall configurations, all TCP/UDP behavior, IPv6, vendor-specific QoS, or a real network.
- Accounts, multiplayer, backend services, live infrastructure access, runtime AI, leaderboards, or an authoring editor.
- Treating randomized hazards, speed, or power-up use as evidence that the learner understands a networking concept.

## Release evidence

All acceptance scenarios must have a recorded result. Each level must have a checked valid example, a plausible mistake with a specific explanation, and a reference review. A first-time learner must complete the core flow using only the keyboard. An asset review must confirm the game uses original maze-game expression rather than copied characters, layouts, audio, or artwork. The accompanying README must describe the actual behavior, how to start and test the game, and any remaining limitations.
