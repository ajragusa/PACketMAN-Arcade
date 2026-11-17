import { validateCampaign, validateDevelopmentDocument } from "./engine/content.js";
import { explainDelivery, explainResult } from "./engine/feedback.js";
import { evaluateDecision, evaluateGhostAnswer } from "./engine/rules.js";
import { assistanceKey, currentCheckpointLevel } from "./engine/checkpoints.js";
import { GHOST_STEP_MS } from "./engine/ghosts.js";
import {
  advanceLevel,
  armRuleEdit,
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
} from "./engine/state.js";
import { bindControls, focusAfterRender } from "./ui/controls.js";
import { renderApp, renderContentError, updateGhosts } from "./ui/render.js";

const root = document.querySelector("#app");
let session = null;
let devMode = new URLSearchParams(location.search).get("dev") === "1";
let tracerouteTimer = null;

function draw(focus = true) {
  root.innerHTML = renderApp(session);
  if (focus) focusAfterRender(root, session);
}

function displayError(message) {
  session = null;
  root.innerHTML = renderContentError(message);
  root.querySelector("#error-title")?.focus();
}

async function loadCampaign() {
  session = null;
  root.innerHTML = `<section class="panel"><h1>Loading the network…</h1><p>Preparing the authored lessons.</p></section>`;
  let response;
  try {
    response = await fetch(new URL("./data/levels.json", import.meta.url));
  } catch (error) {
    displayError(`The level file could not be requested: ${error.message}`);
    return;
  }
  if (!response.ok) {
    displayError(`The level file returned HTTP ${response.status}. Check the local server and retry.`);
    return;
  }
  let document;
  try {
    document = await response.json();
  } catch (error) {
    displayError(`The level file is not valid JSON: ${error.message}`);
    return;
  }
  const errors = (devMode ? validateDevelopmentDocument : validateCampaign)(document);
  if (errors.length) {
    displayError(`Please fix the authored content before playing: ${errors.join("; ")}`);
    return;
  }
  session = createSession(document);
  draw();
}

function choose(kind, value, reduceRisk) {
  if (!session) return;
  if (kind === "ghost") {
    if (session.view !== "ghost-question") return;
    const question = session.document.levels[session.levelIndex].ghostQuestions[session.encounter.questionIndex];
    submitGhostAnswer(session, evaluateGhostAnswer(question, value));
    draw();
    return;
  }
  if (session.view !== "decision-prompt") return;
  const level = currentCheckpointLevel(session);
  const decision = {};
  if (kind === "route") {
    decision.routeId = value;
    if (level.challenge.type === "congestion-loss") decision.reduceRisk = reduceRisk;
  } else if (kind === "packet") {
    decision.packetId = value;
    if (session.ruleEditArmed) decision.editRuleId = level.challenge.editableRule.id;
  } else if (kind === "transport") {
    decision.transport = value;
  } else if (kind === "path") {
    decision.pathChoice = value;
  } else if (kind === "class") {
    decision.trafficClass = value;
  }
  const evaluation = evaluateDecision(level, decision);
  evaluation.message = explainResult(evaluation, level);
  submitDecision(session, decision, evaluation);
  draw();
}

function move(coordinate) {
  if (!session) return;
  if (!movePacket(session, coordinate)) {
    if (session.view === "playing-grid") draw();
    return;
  }
  if (coordinate[0] === session.document.maze.destination[0]
      && coordinate[1] === session.document.maze.destination[1]) {
    const delivery = deliverPacket(session);
    if (delivery?.trace) session.notice = explainDelivery(delivery.trace, session.document.levels[session.levelIndex]);
  }
  draw();
}

function action(name) {
  if (name === "retry-load") {
    void loadCampaign();
    return;
  }
  if (!session) return;
  if (name === "start") startLevel(session);
  else if (name === "toggle-pause") {
    if (!togglePause(session)) return;
  } else if (name === "retry-ghost") retryGhostQuestion(session);
  else if (name === "continue-ghost") continueAfterGhost(session);
  else if (name === "edit-rule") armRuleEdit(session);
  else if (name === "retry-decision") retryDecision(session);
  else if (name === "retry-delivery") {
    const delivery = retryDelivery(session);
    if (delivery?.trace) session.notice = explainDelivery(delivery.trace, session.document.levels[session.levelIndex]);
  } else if (name === "advance") advanceLevel(session);
  else if (name === "hint-method" || name === "hint-solution") {
    const hint = currentCheckpointLevel(session).hints[0];
    const solution = name === "hint-solution";
    const methodId = assistanceKey(session, "method");
    if (solution && !session.assistanceUsed.includes(methodId)) return;
    recordAssistance(session, assistanceKey(session, solution ? "solution" : "method"),
      solution ? hint.solution : hint.method);
  } else if (name === "traceroute") {
    session.tracerouteVisible = true;
    if (tracerouteTimer) clearTimeout(tracerouteTimer);
    const shownSession = session;
    const shownLevel = session.levelIndex;
    const shownCheckpoint = session.checkpointIndex;
    tracerouteTimer = setTimeout(() => {
      if (session === shownSession && session.levelIndex === shownLevel
          && session.checkpointIndex === shownCheckpoint) {
        session.tracerouteVisible = false;
        root.querySelector("[data-traceroute]")?.remove();
      }
    }, 5000);
  } else if (name === "restart") {
    if (window.confirm("Start a fresh session? Current progress and assistance tracking will be cleared.")) {
      session = restartSession(session.document);
    } else {
      return;
    }
  }
  draw();
}

bindControls(root, { action, choose, move });
setInterval(() => {
  if (!session || document.hidden) return;
  const previousView = session.view;
  if (!tickGhosts(session)) return;
  if (session.view !== previousView) draw();
  else updateGhosts(root, session);
}, GHOST_STEP_MS);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && session?.view === "playing-grid") {
    togglePause(session);
    draw();
  }
});
void loadCampaign();
