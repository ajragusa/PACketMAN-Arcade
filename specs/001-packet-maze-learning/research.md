# PACketMan · Planning research

## Decision: Native browser modules and static JSON

**Decision:** Implement with semantic HTML, CSS, and native JavaScript ES modules. Keep the six lessons in authored JSON and fetch them from a relative URL. Use no framework, bundler, backend, external runtime content service, or rendering library.

**Rationale:** This matches the StarterKit's self-contained browser-game target, keeps setup small, supports static hosting under a repository subpath, and makes domain logic independently testable. Native modules and JSON fetch require HTTP serving; `file://` is not a supported run mode. Check `response.ok` explicitly because `fetch()` resolves for HTTP error responses such as 404.

**Alternatives considered:** A framework or bundler would add setup without a need for a build pipeline. Embedding the level data in JavaScript would make content less independently reviewable. Root-absolute paths could fail when hosted below a repository subpath.

**Sources:**
- [MDN: JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [MDN: Using Fetch — checking response status](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#checking_response_status)
- [StarterKit plan](../../WORKSHOP/LAB/StarterKit/PLAN.md)

## Decision: Pure deterministic domain evaluators

**Decision:** Keep domain rules in pure functions, and keep rendering, session progression, and feedback composition outside those evaluators. Represent packet drops and background traffic as authored trace data rather than unseeded randomness.

**Rationale:** A stable evaluator lets the same authored challenge and decision produce the same result in the browser and tests. Separating a Level 6 risk choice from a later delivery drop avoids grading a correct choice as incorrect due to an environmental outcome. Ordered traces are reproducible and can guarantee a successful delivery for each accepted low-risk strategy.

**Alternatives considered:** Unseeded random drops are harder to reproduce and could make the right answer appear wrong. Folding movement, grading, and progression into a single UI handler would make the model harder to verify and risk duplicate completion.

## Decision: All tied best routes are correct

**Decision:** Accept every viable route tied for the best value of the level's stated objective.

**Rationale:** Route layouts can have multiple equivalent paths; accepting all minima prevents arbitrary grading based on route order or authored choice position. This is now stated in the specification and is covered by independent evaluator cases.

**Alternatives considered:** Requiring one canonical route would reject equally valid solutions. Asking the learner to break a tie would add an unstated objective.

## Decision: Accessible grid and explicit focus changes

**Decision:** Render the maze as an ARIA grid with roving tabindex and arrow-key navigation. Use labeled native controls for network decisions, deliberate focus movement when a prompt appears, and a polite status region for concise outcome updates. Preserve textual equivalents for information shown graphically.

**Rationale:** The grid is a spatial interaction, while the network decisions are discrete controls. Separating these roles gives keyboard users a predictable movement model and avoids requiring pointer precision. Focus changes make prompts discoverable; short status announcements communicate outcomes without continuously announcing scripted background animation.

**Alternatives considered:** Making every maze cell a separate tab stop would create a long, inefficient tab sequence. Communicating outcomes only by color, movement, or animation would hide information from some learners. A modal dialog is unnecessary for decisions that can remain in the game flow.

**Sources:**
- [WAI-ARIA Authoring Practices: Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- [MDN: ARIA status role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/status_role)

## Decision: Staged six-level scope

**Decision:** Prove a complete Level 1 vertical slice before filling in Levels 2–6. Keep one primary challenge per level and avoid stretch features.

**Rationale:** Six topics are explicit user scope even though the generic StarterKit constitution suggests three short levels by default. A staged implementation protects correctness and first-playthrough pacing without deleting a required topic.

**Alternatives considered:** Reducing the campaign to three levels would omit requested topics. Implementing all content before verifying a playable level would postpone evidence for the core grid, feedback, and progression loop.

## Decisions requiring human validation

- RFC and other technical citations must be checked against current authoritative text during content authoring; planning research does not replace that review.
- Screen-reader behavior, focus order, reduced-motion behavior, and narrow-window usability require manual checks in the implemented browser experience.
- The 5–10 minute first-playthrough target is validated with intended learners, not inferred from code tests.
