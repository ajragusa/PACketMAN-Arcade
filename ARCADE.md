---
# PACketMan Arcade submission. Game and build facts are drawn from README.md, the Spec Kit artifacts,
# and the implementation session. Human creator details were confirmed by the owner.
arcade_version: 1

game:
  title: "PACketMan - Networking Maze"
  slug: packetman-networking-maze
  tagline: "Move a packet through a network maze. Learn each decision along the way."
  summary: "Move a packet through six networking lessons, choosing routes and making decisions at checkpoints. Learn how routing, ACLs, transport, subnets, QoS, and congestion affect packet delivery."
  topics: [Routing, ACLs, TCP/UDP, "IPv4 subnets and gateways", QoS, "Congestion and loss"]
  category: network-fundamentals
  skill_level: beginner
  play_minutes: unknown
  levels: 6
  card_image: "WORKSHOP/LAB/Examples/PACketMan/assets/images/arcade-card.png"
  card_image_alt: "A 19-by-19 neon maze with the packet, three roaming ghosts, and numbered checkpoint gates."
  repo: "https://github.com/ajragusa/PACketMAN-Arcade"
  repo_path: "WORKSHOP/LAB/Examples/PACketMan"
  license: Apache-2.0

creator:
  name: "A.J. Ragusa"
  github: ajragusa
  location: "Bloomington, Indiana, United States"
  organization: ""
  links: []
  first_spec_project: true
  workshop: "NAF AC6"
  consent_to_publish: true

build:
  started: unknown
  finished: "2026-11-17"
  wall_time: unknown
  spec_driven:
    framework: "GitHub Spec Kit"
    framework_version: unknown
    artifacts: [spec, plan, tasks, research, data-model, quickstart, checklists]
    task_count: 39
    loops_or_phases: 6
  model: unknown
  helper_models: []
  harness: "Copilot SDK in VS Code"
  harness_version: unknown
  mcp_servers: ["GitHub MCP Server"]
  rag_and_sources: ["Workshop StarterKit feature brief", "RFC 791", "RFC 792", "RFC 4301", "RFC 9293", "RFC 768", "RFC 1122", "RFC 4632", "RFC 2474", "RFC 4594", "RFC 5681", "RFC 7567", "RFC Editor status and update information"]
  skills_and_plugins: ["speckit-implement", "speckit-git-commit"]
  other_tools: ["Node.js built-in test runner (Node v26.7.0)", "Python standard-library HTTP server", "Git", "integrated browser"]
  human_prompts: 0
  usage:
    input_tokens: unknown
    output_tokens: unknown
    cost_note: "Not recorded; no cost estimate was made."
  ai_generated_assets: []

runtime:
  kind: static-web
  stack: [HTML5, CSS, "JavaScript ES modules", "Python 3 standard library for local serving"]
  start: "cd WORKSHOP/LAB/Examples/PACketMan && python3 -m http.server 8000 --bind 127.0.0.1"
  url_after_start: "http://127.0.0.1:8000/"
  hosted_url: ""
  static_root: "WORKSHOP/LAB/Examples/PACketMan"
  requires_install: false
  requires_network: false
  requires_api_key: false
  uses_ai_at_runtime: false
  browsers: ["Integrated browser (version unknown)"]
  accessibility: "Keyboard movement supports arrow keys, WASD, and direction buttons; reduced-motion behavior and 320px layout were checked in browser automation. Manual keyboard-only play and screen-reader testing were not run."
  save_state: "In-memory only; reloading starts a fresh session."

verification:
  tests: "cd WORKSHOP/LAB/Examples/PACketMan && npm test"
  tests_passing: 48
  facts_sourced_from: ["RFC 791", "RFC 792", "RFC 4301", "RFC 9293", "RFC 768", "RFC 1122", "RFC 4632", "RFC 2474", "RFC 4594", "RFC 5681", "RFC 7567"]
  known_limits: ["The five-person first-time learner study has not been run, so the 5-10 minute completion and learning-outcome targets are unverified.", "Manual keyboard-only and screen-reader testing remain outstanding.", "Networking behavior is a deterministic teaching model, not a live network or vendor implementation.", "The ACL lesson uses a small ordered first-match policy, not a universal firewall configuration.", "QoS uses a declared local strict-priority queue model, not a service guarantee.", "Congestion and loss use authored integer risk points and finite deterministic traces, not probabilities or TCP feedback.", "No public hosted deployment is configured."]
---

## In one paragraph

PACketMan is a browser game for learning practical networking decisions. Move a packet through a branching maze, clear three checkpoints in each of six lessons, and collect optional network bits. The lessons cover routing, ordered ACL rules, TCP and UDP, subnet boundaries and gateways, QoS, and congestion and loss. Roaming ghosts can catch the packet and ask an extra question about the current lesson.

## How it was built

The work followed a Spec Kit feature specification, then research and design artifacts, an ordered task list, and phased implementation. The first playable campaign covered six networking lessons, but the owner wanted a stronger PAC-MAN-style feel; the maze was reshaped around a grid, gates, branching paths, and collectible bits. Further feedback asked for more decisions and paths, so each lesson gained three sequential checkpoints. The owner then requested roaming ghosts that trigger an extra question when they catch the packet. We kept those questions separate from required checkpoint grading so a catch or wrong answer would not erase lesson progress. Ghosts pause during questions and while the game is paused; the chase updates sprites in place so routine movement does not disturb focus or scroll. The dependency-free Node suite now passes 48 cases, and a browser playthrough verified all 18 checkpoints and ghost encounters. The five-person learner study and manual screen-reader and keyboard-only checks are still outstanding. A future builder should preserve that separation between arcade pressure and network correctness.

## What we'd tell the next builder

- Keep the learning checkpoints independent from collectibles, ghost questions, and other optional arcade events.
- Test ghost movement, pause, capture, retry, and recovery as state transitions, not only as animation.
- Treat the learner study and manual assistive-technology checks as release work; automated tests do not replace them.
