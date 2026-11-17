# PACketMan Networking Maze

A six-lesson, static browser game about routing, ordered packet filters, TCP/UDP, subnet boundaries, QoS, and congestion/loss. The network models and hazards are authored and deterministic; no account, backend, external runtime service, or generated content is used.

## Run locally

From the repository root:

```sh
cd WORKSHOP/LAB/Examples/PACketMan
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/`. Keep the server running while playing; press `Ctrl-C` to stop it. Native JavaScript modules and JSON loading require HTTP, so `file://` is not supported. Reloading starts a fresh in-memory session.

During staged authoring only, `http://127.0.0.1:8000/?dev=1` enables the development validator, which accepts a valid one-to-six-level partial document. Normal startup uses strict validation and requires the complete, ordered six-level campaign. The game reports content problems separately from learner feedback and offers a retry.

## Explore the expanded maze

Each lesson uses a 19-by-19 maze with 163 corridor tiles and **three sequential decision checkpoints**: 18 decisions across the campaign. Each checkpoint explores its lesson's topic in more depth rather than mixing unrelated topics.

- Move with arrow keys, WASD, the direction buttons, or adjacent tiles.
- Follow gates **1 → 2 → 3**, then reach the destination. Each gate changes the scenario, so repeating the previous answer is not necessarily correct.
- Routing and risk decisions unlock the chosen direct, upper (north), or lower (south) corridor. Other lesson decisions unlock all three corridors for free exploration.
- Cleared paths remain open for backtracking. Optional side paths contain extra network bits; each bit can be collected only once per lesson.
- Wrong decisions retry the current checkpoint without erasing earlier checkpoints or collected bits. Hints and one-crossing ACL edits are checkpoint-specific.
- The route/link values describe the current checkpoint's network segment, not the physical distance or movement time on the maze.

Checkpoint scenarios include changed latencies and an outage, source-specific and default ACL policies, alternating TCP/UDP delivery needs, /26 prefix boundaries, different local queue policies, and changing risk/shielding values.

## Ghost encounters

- **Echo, Jitter, and Loop** move continuously, one corridor tile every 750 ms during active play. Each patrols a separate region and follows the shortest corridor path toward you when you enter that region.
- Ghosts can use dim, player-locked corridors. The start, numbered checkpoints, and destination are safe zones that ghosts cannot enter.
- Contact in either direction freezes the entire chase and opens an extra question on the current lesson's topic. Each lesson has three authored questions; new catches rotate through the pool, while retries keep the same question.
- Wrong answers show an explanation and let you retry without losing position, checkpoints, bits, or your accepted delivery strategy. Extra answers do not count as required checkpoint attempts or clear gates.
- Correct feedback waits until you choose **Return to maze**. The catcher then retreats, and you receive four protected chase ticks to escape. Clearing a required checkpoint also grants protection.
- Use **Pause chase**, **P**, or **Escape** to stop and plan; hints remain available while paused. Leaving the browser page automatically pauses active play, and returning requires an explicit resume. Pause cannot skip a question.

Ghosts are an arcade mechanic, not a simulation of network latency or packet loss. Questions have no time limit. Their names and textual positions are available under **Ghosts and safe zones**; reduced-motion settings suppress cosmetic animation without changing the chase rules.

## Run tests

Run the dependency-free Node test suite:

```sh
npm test
```

Or, with the local server running, open `http://127.0.0.1:8000/tests/`. The browser runner shows discovered, executed, passed, and failed totals plus failed case IDs. A zero-test run is a failure. The suite covers campaign and partial-content validation, route ties and changed links, first-match filtering and one-use edits, transport selection, subnet boundaries, queue order, risk grading, state transitions, retries, and accessible text semantics. Ghost cases cover legal deterministic movement, collisions in both directions, frozen questions/pause, progress-preserving retries, retreat/protection, question rotation, and lesson/session resets.

## Model and limitations

- **Routing:** links have visible integer latency and risk values. The shortest route is not presumed fastest; all tied minimum-latency routes are accepted. The traceroute button reveals one authored hop sequence for five seconds and does not choose a route.
- **ACL:** the lesson uses its declared, ordered first-match rules and default action. Its temporary edit applies for one crossing only. This is a small teaching policy, not a universal firewall configuration.
- **Transport:** TCP is described as a reliable, ordered byte stream with retransmission behavior; UDP datagrams do not have transport-level delivery/retransmission guarantees. There is no blanket movement-speed penalty.
- **Subnet/gateway:** the displayed IPv4 prefix determines local versus off-subnet delivery, with one configured gateway.
- **QoS:** a declared strict-priority queue serves voice before bulk when both are waiting. This is a local model, not a universal service guarantee.
- **Congestion/loss:** displayed integer risk points are not probabilities. A shield action lowers the modeled score. Authored traces are finite and deterministic; a drop does not undo a correct strategy, and the next retry trace delivers.
- **Movement and timing:** the maze is a discrete grid, and queue/hazard timing is a teaching abstraction. First visits to open cells collect network bits for a cosmetic score; revisits do not award extra bits, and score does not affect correctness. No live network is accessed.
- **Visual identity:** the game uses an original neon-arcade palette, angular packet courier, spectral chasers, and network-bit collectibles. It does not reproduce another game's characters, maze layout, artwork, or audio.

The game uses original text and a simple abstract grid; it includes no borrowed characters, layouts, audio, or artwork. Link values and explanations are game-authored values, not measurements of a real network.

### Authoring checkpoints and ghosts

The shared `maze` in `data/levels.json` owns the dimensions, approach, three sections, route paths, connectors, and side paths. Traversable cells are derived from those authored paths; network nodes are a separate logical model, not tile coordinates.

Each level declares a base network/challenge and exactly three `checkpoints`. A checkpoint supplies its own title, briefing, hints, challenge-field overrides, and optional link-value/availability overrides. Overrides apply to the base model independently, never cumulatively. The validator checks every effective checkpoint, its topic, link references, continuous maze paths, reachable detours, and premature access to future gates or the destination.

`maze.ghosts` supplies unique IDs, names, `violet`/`coral`/`mint` tones, spawn coordinates, and patrol waypoints. Spawns and waypoints must be ordinary corridors in separate reachable regions, with room to retreat and no safe-zone crossings.

Each level's nonempty `ghostQuestions` pool supplies unique question IDs, prompts, labeled choices with unique IDs, an `answerId` referencing one choice, and an explanation. The campaign authors three questions per lesson, eighteen in total; their networking claims use the lesson's existing references and declared model.

## Source review

RFC Editor information pages and cited sections were reviewed on 2026-11-17. Update and status notes relevant to the lessons:

| Reference | Status observed | Update/relationship notes |
|---|---|---|
| [RFC 791](https://www.rfc-editor.org/info/rfc791), §3.1 | Internet Standard | Updated by RFC 1349, RFC 2474, and RFC 6864. |
| [RFC 792](https://www.rfc-editor.org/info/rfc792), §5 | Internet Standard | Updated by RFC 950, RFC 4884, RFC 6633, and RFC 6918; used only as context for the traceroute abstraction. |
| [RFC 4301](https://www.rfc-editor.org/info/rfc4301), §4.4.1 | Proposed Standard | Updated by RFC 6040 and RFC 7619; the lesson explicitly labels its ordered filter as a simplified game policy. |
| [RFC 9293](https://www.rfc-editor.org/info/rfc9293), §§2.2, 3.3 | Internet Standard | Replaces RFC 793 and updates the TCP requirements portions of RFC 1122. |
| [RFC 768](https://www.rfc-editor.org/info/rfc768), Introduction | Internet Standard | Updated by RFC 9868 (published October 2025); the lesson does not imply UDP itself guarantees delivery. |
| [RFC 1122](https://www.rfc-editor.org/info/rfc1122), §§3.3.1.1–3.3.1.2 | Internet Standard | Updated by RFC 9293 among other documents; TCP facts cite RFC 9293 directly. |
| [RFC 4632](https://www.rfc-editor.org/info/rfc4632), §3.1 | Best Current Practice | Obsoletes RFC 1519. |
| [RFC 2474](https://www.rfc-editor.org/info/rfc2474), §3 | Proposed Standard | Updated by RFC 3168, RFC 3260, and RFC 8436. |
| [RFC 4594](https://www.rfc-editor.org/info/rfc4594), §§1.4.1, 2.1–2.3 | Informational | Updated by RFC 5865 and RFC 8622; recommendations are not presented as protocol requirements. |
| [RFC 5681](https://www.rfc-editor.org/info/rfc5681), §3 | Draft Standard | Updated by RFC 9438. |
| [RFC 7567](https://www.rfc-editor.org/info/rfc7567), §2 | Best Current Practice | Obsoletes RFC 2309; it does not prescribe one universal queue or loss model. |

This source review checks document status and relationships, not every possible standards interpretation. The simulation remains explicitly narrower than the cited protocols.

## Verification record

**Date:** 2026-11-17

| Check | Result | Evidence / limitation |
|---|---|---|
| Content, route, state, ghost, and summary cases | Pass | `npm test`: 48/48 cases passed on Node v26.7.0. The browser test page also reports 48 discovered, 48 executed, 48 passed, and 0 failed. Includes checkpoint regressions plus ghost movement, captures, recovery, question grading, and invalid encounter content. |
| Full six-level browser progression | Pass | Static app opened below `/WORKSHOP/LAB/Examples/PACketMan/`; with ghosts active, the integrated-browser run completed all 18 checkpoints, 424 arrow-key moves, and six extra ghost questions (one per lesson). Wrong checkpoint and ghost answers retried without losing progress. The Level 6 drop/retry reached a summary of 18 checkpoints, 400 bits, and six extra answers with no page errors. |
| Real-time ghost and pause behavior | Pass | Three ghosts moved while the packet stood still without replacing the board or changing focus/scroll. A timed catch opened a same-topic question; wrong-answer retry, held success feedback, retreat, and protected recovery preserved position, checkpoints, and bits. Manual pause, paused hints, checkpoint/encounter freezes, ignored repeated pause keys, and real hidden-page pause with explicit resume were exercised. |
| Local HTTP and repository-subpath asset/data loading | Pass | Python 3.7.9 standard-library server; HTTP 200 for the app, main module, stylesheet, content module, JSON, and browser test page under the repository subpath. The browser loaded and played the app there. No hosted deployment is configured. |
| Five first-time learner timing and explanation study (SC-002, SC-003) | Not run | Requires five human participants from the intended audience; no participant data or 5–10 minute completion claim is made for the expanded campaign. |
| Keyboard-only playthrough | Not run manually | The browser smoke exercised 424 arrow-key moves and automated choice activation. A separate check exercised WASD and direction buttons. A real keyboard-only user playthrough remains required. |
| Responsive and reduced-motion smoke | Pass | Ghost encounter panels had no horizontal overflow at 320px and 1280px. At 320px all three ghost shapes rendered and direction buttons measured 48px wide. Reduced-motion emulation reduced ghost animation to 0.01 ms; button and WASD movement worked without duplicate bit collection. Original ghost shapes and the encounter panel were visually inspected. |
| Screen-reader behavior | Not run manually | ARIA grid/status semantics are implemented; actual assistive-technology testing remains required. |
| Original expression review | Pass by source inspection | No third-party artwork, character designs, sound, or maze layout is included. |
