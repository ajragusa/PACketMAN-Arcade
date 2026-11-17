import { evaluateDecision, evaluateGhostAnswer, evaluateRouting, evaluateRisk } from "../engine/rules.js";
import {
  armRuleEdit,
  advanceLevel,
  completeLevel,
  continueAfterGhost,
  createSession,
  deliverPacket,
  movePacket,
  recordAssistance,
  restartSession,
  retryDecision,
  retryDelivery,
  retryGhostQuestion,
  startLevel,
  submitDecision,
  submitGhostAnswer,
  tickGhosts,
  togglePause,
} from "../engine/state.js";
import { evaluateACL } from "../engine/rules.js";
import { renderApp } from "../ui/render.js";
import { assistanceKey, currentCheckpointLevel, mazeCoordinates } from "../engine/checkpoints.js";

const SOLUTIONS = [
  [{ routeId: "upper" }, { routeId: "direct" }, { routeId: "upper" }],
  [{ packetId: "web" }, { packetId: "trusted" }, { packetId: "telemetry" }],
  [{ transport: "tcp" }, { transport: "udp" }, { transport: "tcp" }],
  [{ pathChoice: "gateway" }, { pathChoice: "local" }, { pathChoice: "gateway" }],
  [{ trafficClass: "voice" }, { trafficClass: "control" }, { trafficClass: "bulk" }],
  [{ routeId: "lower", reduceRisk: true }, { routeId: "upper", reduceRisk: true }, { routeId: "lower", reduceRisk: true }],
];

function reachGate(state) {
  startLevel(state);
  for (const cell of state.document.maze.approach.slice(1)) {
    if (!movePacket(state, cell)) throw new Error(`Cannot reach the first gate: ${state.notice}`);
  }
}

function moveAlongRoute(state, routeId) {
  const section = state.document.maze.sections[state.checkpointIndex];
  for (const cell of [...section.paths[routeId].slice(1), ...section.connector.slice(1)]) {
    if (!movePacket(state, cell)) throw new Error(`Route ${routeId} blocked at ${cell}: ${state.notice}`);
  }
}

function finishCheckpoints(state) {
  do {
    if (state.view === "decision-prompt") {
      const decision = SOLUTIONS[state.levelIndex][state.checkpointIndex];
      const evaluation = evaluateDecision(currentCheckpointLevel(state), decision);
      if (evaluation.status !== "correct") throw new Error(`Authored checkpoint solution rejected: ${evaluation.message}`);
      submitDecision(state, decision, evaluation);
    }
    if (state.view !== "playing-grid") throw new Error(`Cannot follow a corridor in ${state.view}`);
    moveAlongRoute(state, state.selectedRouteId ?? ["upper", "lower", "direct"][state.checkpointIndex]);
  } while (state.checkpointChoices.length < 3);
}

function prepareGhostChase(document) {
  const state = createSession(document);
  reachGate(state);
  submitDecision(state, { routeId: "upper" }, evaluateRouting(currentCheckpointLevel(state), "upper"));
  const path = document.maze.sections[0].paths.upper;
  const beforeGhost = path.findIndex((cell) => cell.join(",") === "1,8");
  for (const cell of path.slice(1, beforeGhost + 1)) movePacket(state, cell);
  state.ghostGraceTicks = 0;
  return state;
}

export function createStateCases(document) {
  return [
    {
      id: "state:wrong-answer-retry-does-not-complete",
      run() {
        const state = createSession(document);
        reachGate(state);
        submitDecision(state, { routeId: "direct" }, evaluateRouting(document.levels[0], "direct"));
        if (state.view !== "feedback" || state.completedLevelIds.length) throw new Error("Wrong answer completed the lesson.");
        if (!retryDecision(state) || state.view !== "decision-prompt") throw new Error("Wrong answer did not allow retry.");
      },
    },
    {
      id: "state:correct-answer-delivers-and-advances-once",
      run() {
        const state = createSession(document);
        const level = document.levels[0];
        reachGate(state);
        submitDecision(state, { routeId: "upper" }, evaluateRouting(level, "upper"));
        if (submitDecision(state, { routeId: "upper" }, evaluateRouting(level, "upper"))) {
          throw new Error("Duplicate submit was accepted after the decision.");
        }
        finishCheckpoints(state);
        if (state.checkpointChoices.length !== 3) throw new Error("The lesson did not require all three checkpoints.");
        if (!deliverPacket(state)?.delivered || state.completedLevelIds.length !== 1) {
          throw new Error("Successful delivery did not complete exactly one lesson.");
        }
        const bits = state.bitsCollected;
        if (!advanceLevel(state) || state.levelIndex !== 1 || state.view !== "briefing"
            || state.checkpointIndex !== 0 || state.checkpointChoices.length || state.bitsCollected !== bits) {
          throw new Error("Campaign did not advance to the next ordered lesson.");
        }
        if (advanceLevel(state)) throw new Error("Duplicate advance was accepted.");
      },
    },
    {
      id: "state:acl-edit-restores-after-one-crossing",
      run() {
        const state = createSession(document);
        state.levelIndex = 1;
        reachGate(state);
        if (!armRuleEdit(state) || !state.ruleEditArmed) throw new Error("One-use edit did not arm.");
        const level = document.levels[1];
        submitDecision(state, { packetId: "missing" }, { status: "invalid-input", message: "Unknown packet." });
        if (!state.ruleEditArmed || state.decisionAttempts !== 0) {
          throw new Error("Invalid input consumed the one-crossing edit or counted as an attempt.");
        }
        retryDecision(state);
        const evaluation = evaluateACL(level, "admin", level.challenge.editableRule.id);
        submitDecision(state, { packetId: "admin" }, evaluation);
        if (state.view !== "playing-grid" || state.ruleEditArmed) {
          throw new Error("One-use edit remained armed after its crossing.");
        }
        if (evaluateACL(level, "admin").status !== "incorrect") {
          throw new Error("Original ACL rule was not restored after the crossing.");
        }
      },
    },
    {
      id: "state:invalid-movement-and-input-are-safe",
      run() {
        const state = createSession(document);
        if (movePacket(state, [2, 1]) || retryDecision(state)) {
          throw new Error("Invalid movement or transition changed state.");
        }
        reachGate(state);
        const invalid = evaluateDecision(document.levels[0], { routeId: "missing" });
        submitDecision(state, { routeId: "missing" }, invalid);
        if (state.decisionAttempts !== 0 || state.completedLevelIds.length) {
          throw new Error("Invalid choice was treated as a learner attempt or completion.");
        }
      },
    },
    {
      id: "state:network-bits-collect-once-and-render-in-the-maze",
      run() {
        const state = createSession(document);
        startLevel(state);
        movePacket(state, [3, 2]);
        if (state.bitsCollected !== 1 || state.direction !== "right") {
          throw new Error("Moving onto a new corridor did not collect one bit and face the movement direction.");
        }
        movePacket(state, [3, 1]);
        movePacket(state, [3, 2]);
        if (state.bitsCollected !== 1 || !renderApp(state).includes('data-bit="true"')) {
          throw new Error("A revisited corridor awarded another bit or unvisited bits were not rendered.");
        }
      },
    },
    {
      id: "state:hint-tracking-and-restart-reset",
      run() {
        const state = createSession(document);
        startLevel(state);
        if (renderApp(state).includes("Show worked solution")) {
          throw new Error("Worked solution was exposed before the method hint.");
        }
        if (!recordAssistance(state, assistanceKey(state, "method"), "Compare totals.")) throw new Error("Hint was not recorded.");
        if (!renderApp(state).includes("Show worked solution")) {
          throw new Error("Worked solution did not become available after the method hint.");
        }
        const fresh = restartSession(document);
        if (fresh.view !== "briefing" || fresh.completedLevelIds.length || fresh.assistanceUsed.length
            || fresh.bitsCollected || fresh.checkpointChoices.length) {
          throw new Error("Restart did not create a fresh in-memory session.");
        }
      },
    },
    {
      id: "state:level-completion-is-unique",
      run() {
        const state = createSession(document);
        const level = document.levels[0];
        reachGate(state);
        submitDecision(state, { routeId: "upper" }, evaluateRouting(level, "upper"));
        finishCheckpoints(state);
        deliverPacket(state);
        if (state.completedLevelIds.join(",") !== "routing") throw new Error("Completion list is incorrect.");
        if (completeLevel(state) || state.completedLevelIds.length !== 1) {
          throw new Error("Repeated completion was not prevented.");
        }
      },
    },
    {
      id: "state:level-six-drop-retains-correct-strategy",
      run() {
        const state = createSession(document);
        state.levelIndex = 5;
        state.position = [...document.maze.start];
        reachGate(state);
        const level = document.levels[5];
        const decision = { routeId: "lower", reduceRisk: true };
        submitDecision(state, decision, evaluateRisk(level, decision.routeId, decision.reduceRisk));
        finishCheckpoints(state);
        const first = deliverPacket(state);
        if (first.delivered || state.view !== "dropped-feedback" || state.completedLevelIds.includes(level.id)) {
          throw new Error("First scripted drop was not a no-penalty retry state.");
        }
        if (state.acceptedRiskStrategy.routeId !== "lower" || state.decisionAttempts !== 3
            || state.checkpointChoices.length !== 3) {
          throw new Error("Correct risk choice was not retained across the drop.");
        }
        const second = retryDelivery(state);
        if (!second.delivered || state.view !== "level-complete" || state.completedLevelIds[0] !== level.id) {
          throw new Error("Next scripted trace did not deliver and complete the lesson.");
        }
        if (!advanceLevel(state) || state.view !== "summary") throw new Error("Final summary was not shown.");
        const summary = renderApp(state);
        if (!summary.includes("Assistance used") || !summary.includes("Manage delivery risk")) {
          throw new Error("Completion summary omitted progress or assistance.");
        }
      },
    },
    {
      id: "state:background-traffic-and-grid-are-labeled",
      run() {
        const state = createSession(document);
        state.levelIndex = 4;
        startLevel(state);
        const markup = renderApp(state);
        if (!markup.includes('role="grid"') || !markup.includes("YOU CONTROL")
            || !markup.includes("SCRIPTED") || !markup.includes("Shared bottleneck")) {
          throw new Error("Grid or traffic ownership is not exposed textually.");
        }
      },
    },
    {
      id: "state:all-eighteen-decisions-complete-the-campaign",
      run() {
        const state = createSession(document);
        for (let index = 0; index < document.levels.length; index += 1) {
          reachGate(state);
          finishCheckpoints(state);
          if (state.checkpointChoices.length !== 3) throw new Error("A checkpoint was skipped.");
          const delivery = deliverPacket(state);
          if (!delivery.delivered && !retryDelivery(state)?.delivered) throw new Error("Delivery could not finish.");
          if (state.completedLevelIds.length !== index + 1) throw new Error("Progress was lost or duplicated.");
          advanceLevel(state);
        }
        if (state.view !== "summary" || state.decisionAttempts !== 18) {
          throw new Error("The full campaign did not complete all eighteen decisions.");
        }
      },
    },
    {
      id: "state:route-locks-and-backtracking-preserve-checkpoints",
      run() {
        const state = createSession(document);
        reachGate(state);
        if (movePacket(state, [3, 4])) throw new Error("An unanswered checkpoint allowed movement.");
        submitDecision(state, { routeId: "upper" }, evaluateRouting(currentCheckpointLevel(state), "upper"));
        if (movePacket(state, [3, 4]) || !state.notice.includes("locked")) {
          throw new Error("A route choice left an unselected corridor open.");
        }
        movePacket(state, [2, 3]);
        const bits = state.bitsCollected;
        movePacket(state, [3, 3]);
        movePacket(state, [2, 3]);
        movePacket(state, [3, 3]);
        if (state.bitsCollected !== bits || state.checkpointChoices.length !== 1 || state.view !== "playing-grid") {
          throw new Error("Backtracking farmed bits or reopened a resolved checkpoint.");
        }
        moveAlongRoute(state, "upper");
        if (state.checkpointIndex !== 1 || state.view !== "decision-prompt") throw new Error("Second gate did not pause.");
        state.position = [...document.maze.destination];
        if (deliverPacket(state) || completeLevel(state)) throw new Error("Destination completed before all gates.");
      },
    },
    {
      id: "state:later-retries-and-hints-are-checkpoint-local",
      run() {
        const state = createSession(document);
        reachGate(state);
        recordAssistance(state, assistanceKey(state, "method"), "First gate method.");
        submitDecision(state, { routeId: "upper" }, evaluateRouting(currentCheckpointLevel(state), "upper"));
        moveAlongRoute(state, "upper");
        if (state.shownHint || renderApp(state).includes("Show worked solution")) {
          throw new Error("A later checkpoint leaked an earlier checkpoint's hint.");
        }
        const bits = state.bitsCollected;
        const wrong = evaluateRouting(currentCheckpointLevel(state), "upper");
        if (wrong.status !== "incorrect") throw new Error("The second checkpoint reused the first one's answer.");
        submitDecision(state, { routeId: "upper" }, wrong);
        retryDecision(state);
        if (state.checkpointChoices.length !== 1 || state.bitsCollected !== bits || state.checkpointIndex !== 1) {
          throw new Error("A later wrong answer reset previous checkpoint progress.");
        }
        submitDecision(state, { routeId: "direct" }, evaluateRouting(currentCheckpointLevel(state), "direct"));
        if (state.checkpointChoices.length !== 2) throw new Error("Retry did not clear the second checkpoint.");
      },
    },
    {
      id: "state:non-routing-choices-open-multiple-walkable-paths",
      run() {
        const state = createSession(document);
        state.levelIndex = 2;
        reachGate(state);
        submitDecision(state, { transport: "tcp" }, evaluateDecision(currentCheckpointLevel(state), { transport: "tcp" }));
        for (const next of [[2, 3], [4, 3], [3, 4]]) {
          if (!movePacket(state, next) || !movePacket(state, [3, 3])) {
            throw new Error("A transport decision unnecessarily forced one spatial corridor.");
          }
        }
        if (state.checkpointChoices.length !== 1) throw new Error("Exploration changed decision progress.");
      },
    },
    {
      id: "state:delivery-ignores-hazards-on-other-routes",
      run() {
        const fixture = JSON.parse(JSON.stringify(document));
        fixture.levels[5].hazardTraces[0].linkEffects[0].linkId = "upper-b";
        const state = createSession(fixture);
        state.levelIndex = 5;
        reachGate(state);
        finishCheckpoints(state);
        const delivery = deliverPacket(state);
        if (!delivery.delivered || delivery.trace.linkEffects.length || state.deliveryAttempts !== 1) {
          throw new Error("A hazard outside the final selected route caused a drop.");
        }
      },
    },
    {
      id: "ghosts:stationary-player-still-triggers-legal-deterministic-patrols",
      run() {
        const state = createSession(document);
        const replay = createSession(document);
        if (tickGhosts(state)) throw new Error("Ghosts moved during the briefing.");
        startLevel(state);
        startLevel(replay);
        const initial = JSON.stringify(state.ghosts);
        const corridors = mazeCoordinates(document.maze);
        const safe = new Set([document.maze.start, document.maze.destination, ...document.maze.sections.map((section) => section.gate)]
          .map((cell) => cell.join(",")));
        for (let tick = 0; tick < 30; tick += 1) {
          const previous = state.ghosts.map((ghost) => [...ghost.position]);
          tickGhosts(state);
          tickGhosts(replay);
          state.ghosts.forEach((ghost, index) => {
            const distance = Math.abs(ghost.position[0] - previous[index][0]) + Math.abs(ghost.position[1] - previous[index][1]);
            if (distance > 1 || !corridors.has(ghost.position.join(",")) || safe.has(ghost.position.join(","))) {
              throw new Error("A ghost jumped, crossed a wall, or entered a safe zone.");
            }
          });
        }
        if (JSON.stringify(state.ghosts) === initial || JSON.stringify(state.ghosts) !== JSON.stringify(replay.ghosts)
            || state.position.join(",") !== document.maze.start.join(",") || state.view !== "playing-grid") {
          throw new Error("Continuous patrols required player movement, were nondeterministic, or caught a safe player.");
        }
      },
    },
    {
      id: "ghosts:both-movement-directions-trigger-one-encounter",
      run() {
        for (const mover of ["ghost", "player"]) {
          const state = prepareGhostChase(document);
          if (mover === "ghost") tickGhosts(state);
          else movePacket(state, [1, 9]);
          if (state.view !== "ghost-question" || state.encounter.ghostId !== "echo"
              || state.ghostEncounters !== 1 || state.encounter.questionIndex !== 0) {
            throw new Error(`${mover} movement did not trigger an encounter.`);
          }
          const frozen = JSON.stringify(state.ghosts);
          if (tickGhosts(state) || JSON.stringify(state.ghosts) !== frozen || movePacket(state, [1, 7])) {
            throw new Error("Movement continued while a ghost question was open.");
          }
        }
      },
    },
    {
      id: "ghosts:wrong-answer-retry-preserves-progress-and-correct-feedback-waits",
      run() {
        const state = prepareGhostChase(document);
        tickGhosts(state);
        const progress = () => JSON.stringify([state.position, state.checkpointChoices, state.selectedRouteId,
          state.bitsCollected, state.decisionAttempts, state.assistanceUsed]);
        const before = progress();
        const question = document.levels[0].ghostQuestions[0];
        submitGhostAnswer(state, evaluateGhostAnswer(question, "a"));
        if (state.view !== "ghost-feedback" || progress() !== before || state.ghostQuestionsSolved
            || tickGhosts(state) || togglePause(state)) {
          throw new Error("A wrong ghost answer lost progress, kept the chase running, or could be skipped.");
        }
        retryGhostQuestion(state);
        if (state.encounter.questionIndex !== 0 || state.ghostEncounters !== 1) {
          throw new Error("Retrying changed the question or counted another capture.");
        }
        submitGhostAnswer(state, evaluateGhostAnswer(question, "b"));
        if (state.view !== "ghost-success" || state.ghostQuestionsSolved !== 1 || tickGhosts(state)
            || submitGhostAnswer(state, evaluateGhostAnswer(question, "b"))) {
          throw new Error("Correct feedback did not wait for acknowledgement or counted twice.");
        }
        continueAfterGhost(state);
        const ghost = state.ghosts.find((item) => item.id === "echo");
        const distance = Math.abs(ghost.position[0] - state.position[0]) + Math.abs(ghost.position[1] - state.position[1]);
        if (state.view !== "playing-grid" || state.encounter || state.ghostGraceTicks <= 0
            || distance <= 1 || progress() !== before) {
          throw new Error("Recovery did not preserve progress, retreat the ghost, and grant protection.");
        }
      },
    },
    {
      id: "ghosts:grace-blocks-recapture-then-the-next-question-rotates",
      run() {
        const state = prepareGhostChase(document);
        tickGhosts(state);
        submitGhostAnswer(state, evaluateGhostAnswer(document.levels[0].ghostQuestions[0], "b"));
        continueAfterGhost(state);
        state.ghosts[0].position = [1, 9];
        const grace = state.ghostGraceTicks;
        if (!movePacket(state, [1, 9]) || state.view !== "playing-grid" || state.ghostGraceTicks !== grace) {
          throw new Error("Protected movement triggered a capture or consumed time-based protection.");
        }
        for (let tick = 0; tick < grace; tick += 1) {
          tickGhosts(state);
          if (state.view !== "playing-grid") throw new Error("A ghost caught the packet during grace.");
        }
        tickGhosts(state);
        if (state.view !== "ghost-question" || state.ghostEncounters !== 2 || state.encounter.questionIndex !== 1
            || state.ghostQuestionsSolved !== 1) {
          throw new Error("Protection never expired or the next capture did not rotate questions.");
        }
      },
    },
    {
      id: "ghosts:pause-and-checkpoint-prompts-freeze-the-chase",
      run() {
        const state = createSession(document);
        startLevel(state);
        togglePause(state);
        const frozen = JSON.stringify(state.ghosts);
        if (state.view !== "paused" || tickGhosts(state) || movePacket(state, [3, 2])
            || JSON.stringify(state.ghosts) !== frozen || !renderApp(state).includes("Resume chase")) {
          throw new Error("Pause did not freeze packet and ghosts or expose a resume control.");
        }
        if (!recordAssistance(state, assistanceKey(state, "method"), "Read while paused.")) {
          throw new Error("Hints could not be read while safely paused.");
        }
        togglePause(state);
        if (!tickGhosts(state)) throw new Error("The chase did not resume.");
        reachGate(state);
        if (tickGhosts(state)) throw new Error("Ghosts moved during a checkpoint question.");
        submitDecision(state, { routeId: "direct" }, evaluateRouting(currentCheckpointLevel(state), "direct"));
        if (tickGhosts(state)) throw new Error("Ghosts moved during checkpoint feedback.");
      },
    },
    {
      id: "ghosts:level-advance-and-restart-reset-local-chase-state",
      run() {
        const state = prepareGhostChase(document);
        tickGhosts(state);
        submitGhostAnswer(state, evaluateGhostAnswer(document.levels[0].ghostQuestions[0], "b"));
        continueAfterGhost(state);
        const path = document.maze.sections[0].paths.upper;
        const current = path.findIndex((cell) => cell.join(",") === state.position.join(","));
        for (const cell of path.slice(0, current).reverse()) movePacket(state, cell);
        finishCheckpoints(state);
        deliverPacket(state);
        advanceLevel(state);
        if (state.encounter || state.encounterSequence || state.ghostGraceTicks || state.ghostQuestionsSolved !== 1
            || state.ghosts.some((ghost) => ghost.position.join(",") !== ghost.spawn.join(","))) {
          throw new Error("Advancing did not reset local chase state while retaining answered-question totals.");
        }
        const fresh = restartSession(document);
        if (fresh.ghostQuestionsSolved || fresh.ghostEncounters || fresh.encounter || fresh.encounterSequence) {
          throw new Error("Restart retained previous ghost encounters.");
        }
      },
    },
  ];
}
