import { accessibleCells, currentCheckpointLevel, mazeCoordinates } from "./checkpoints.js";
import { createGhosts, ghostSafeCells, GHOST_GRACE_TICKS, retreatGhost, stepGhosts } from "./ghosts.js";

const TRANSITIONS = {
  briefing: new Set(["playing-grid"]),
  "playing-grid": new Set(["decision-prompt", "delivering", "level-complete", "ghost-question", "paused"]),
  paused: new Set(["playing-grid"]),
  "ghost-question": new Set(["ghost-feedback", "ghost-success"]),
  "ghost-feedback": new Set(["ghost-question"]),
  "ghost-success": new Set(["playing-grid"]),
  "decision-prompt": new Set(["playing-grid", "feedback"]),
  feedback: new Set(["decision-prompt"]),
  delivering: new Set(["dropped-feedback", "level-complete"]),
  "dropped-feedback": new Set(["delivering"]),
  "level-complete": new Set(["briefing", "summary"]),
  summary: new Set(),
};

function setView(state, nextView) {
  if (!TRANSITIONS[state.view]?.has(nextView)) {
    throw new Error(`Illegal session transition: ${state.view} -> ${nextView}`);
  }
  state.view = nextView;
}

function currentLevel(state) {
  return state.document.levels[state.levelIndex];
}

function isSameCoordinate(left, right) {
  return left[0] === right[0] && left[1] === right[1];
}

function isAdjacent(left, right) {
  return Math.abs(left[0] - right[0]) + Math.abs(left[1] - right[1]) === 1;
}

export function createSession(document) {
  const start = document.maze.start;
  return {
    document,
    levelIndex: 0,
    checkpointIndex: 0,
    checkpointChoices: [],
    view: "briefing",
    position: [...start],
    direction: "right",
    collectedCells: [start.join(",")],
    bitsCollected: 0,
    ghosts: createGhosts(document.maze),
    ghostGraceTicks: 0,
    encounter: null,
    encounterSequence: 0,
    ghostEncounters: 0,
    ghostQuestionsSolved: 0,
    completedLevelIds: [],
    assistanceUsed: [],
    decisionAttempts: 0,
    deliveryAttempts: 0,
    deliveryTraceIndex: 0,
    acceptedRiskStrategy: null,
    selectedRouteId: null,
    gateResolved: false,
    lastEvaluation: null,
    ruleEditArmed: false,
    tracerouteVisible: false,
    shownHint: null,
    notice: "",
  };
}

export function startLevel(state) {
  if (state.view !== "briefing") return false;
  state.notice = "";
  setView(state, "playing-grid");
  return true;
}

export function movePacket(state, coordinate) {
  if (state.view !== "playing-grid" || !Array.isArray(coordinate)
      || coordinate.length !== 2 || !coordinate.every(Number.isInteger)) return false;
  const maze = state.document.maze;
  const key = coordinate.join(",");
  if (!isAdjacent(state.position, coordinate)) {
    state.notice = "Move to an adjacent corridor tile, or use the direction controls.";
    return false;
  }
  if (!mazeCoordinates(maze).has(key)) {
    state.notice = "A wall blocks that direction.";
    return false;
  }
  if (!accessibleCells(state).has(key)) {
    state.notice = "That corridor is locked. Clear its checkpoint and follow an unlocked route.";
    return false;
  }
  const [rowDelta, columnDelta] = [coordinate[0] - state.position[0], coordinate[1] - state.position[1]];
  state.direction = rowDelta < 0 ? "up" : rowDelta > 0 ? "down" : columnDelta < 0 ? "left" : "right";
  const gateIndex = maze.sections.findIndex((section) => isSameCoordinate(section.gate, coordinate));
  const isGate = gateIndex >= 0;
  const isDestination = isSameCoordinate(maze.destination, coordinate);
  if (!isGate && !isDestination && !state.collectedCells.includes(key)) {
    state.collectedCells.push(key);
    state.bitsCollected += 1;
  }
  state.position = [...coordinate];
  if (isGate && gateIndex === state.checkpointChoices.length) {
    state.checkpointIndex = gateIndex;
    state.gateResolved = false;
    state.selectedRouteId = null;
    state.ruleEditArmed = false;
    state.tracerouteVisible = false;
    state.shownHint = null;
    state.lastEvaluation = null;
    state.notice = "";
    setView(state, "decision-prompt");
  }
  captureGhost(state);
  return true;
}

function captureGhost(state) {
  if (state.view !== "playing-grid" || state.ghostGraceTicks > 0
      || ghostSafeCells(state.document.maze).has(state.position.join(","))) return false;
  const ghost = state.ghosts.find((candidate) => isSameCoordinate(candidate.position, state.position));
  if (!ghost) return false;
  state.encounter = {
    ghostId: ghost.id,
    questionIndex: state.encounterSequence % currentLevel(state).ghostQuestions.length,
    evaluation: null,
  };
  state.encounterSequence += 1;
  state.ghostEncounters += 1;
  state.notice = `${ghost.name} caught your packet. Answer the extra question to continue; your progress is safe.`;
  setView(state, "ghost-question");
  return true;
}

export function tickGhosts(state) {
  if (state.view !== "playing-grid") return false;
  if (captureGhost(state)) return true;
  state.ghosts = stepGhosts(state.document.maze, state.ghosts, state.position);
  if (state.ghostGraceTicks > 0) state.ghostGraceTicks -= 1;
  else captureGhost(state);
  return true;
}

export function submitGhostAnswer(state, evaluation) {
  if (state.view !== "ghost-question") return false;
  state.encounter.evaluation = evaluation;
  if (evaluation.status === "correct") {
    state.ghostQuestionsSolved += 1;
    setView(state, "ghost-success");
  } else {
    setView(state, "ghost-feedback");
  }
  return true;
}

export function retryGhostQuestion(state) {
  if (state.view !== "ghost-feedback") return false;
  state.encounter.evaluation = null;
  setView(state, "ghost-question");
  return true;
}

export function continueAfterGhost(state) {
  if (state.view !== "ghost-success") return false;
  state.ghosts = retreatGhost(state.document.maze, state.ghosts, state.encounter.ghostId, state.position);
  state.encounter = null;
  state.ghostGraceTicks = GHOST_GRACE_TICKS;
  state.notice = "Correct! The ghost has retreated. You have a short protected window to move away.";
  setView(state, "playing-grid");
  return true;
}

export function togglePause(state) {
  if (state.view === "playing-grid") setView(state, "paused");
  else if (state.view === "paused") setView(state, "playing-grid");
  else return false;
  return true;
}

export function submitDecision(state, decision, evaluation) {
  if (state.view !== "decision-prompt") return false;
  state.lastEvaluation = evaluation;
  if (evaluation.status === "correct" || evaluation.status === "incorrect") {
    state.ruleEditArmed = false;
  }
  state.shownHint = null;
  if (evaluation.status === "correct") {
    state.gateResolved = true;
    state.ghostGraceTicks = GHOST_GRACE_TICKS;
    state.decisionAttempts += 1;
    if (currentLevel(state).challenge.type === "routing") state.selectedRouteId = decision.routeId;
    else if (currentLevel(state).challenge.type === "congestion-loss") {
      state.selectedRouteId = decision.routeId;
      state.acceptedRiskStrategy = { ...decision };
    } else {
      state.selectedRouteId = null;
    }
    state.checkpointChoices.push({
      checkpointId: currentLevel(state).checkpoints[state.checkpointIndex].id,
      routeId: state.selectedRouteId,
      decision: { ...decision },
    });
    state.notice = `${evaluation.message} Checkpoint ${state.checkpointIndex + 1} cleared. ${
      state.selectedRouteId ? `Follow the unlocked ${state.selectedRouteId} corridor.` : "All three onward paths are open; choose your own corridor."
    }`;
    setView(state, "playing-grid");
  } else {
    state.decisionAttempts += evaluation.status === "incorrect" ? 1 : 0;
    state.notice = evaluation.message;
    setView(state, "feedback");
  }
  return true;
}

export function retryDecision(state) {
  if (state.view !== "feedback") return false;
  setView(state, "decision-prompt");
  return true;
}

export function completeLevel(state) {
  const level = currentLevel(state);
  if (state.view !== "playing-grid"
      || state.checkpointChoices.length !== level.checkpoints.length
      || !isSameCoordinate(state.position, state.document.maze.destination)) return false;
  if (!state.completedLevelIds.includes(level.id)) state.completedLevelIds.push(level.id);
  state.notice = "Level objective complete.";
  setView(state, "level-complete");
  return true;
}

function beginDeliveryAttempt(state) {
  const level = currentCheckpointLevel(state);
  const authoredTrace = level.hazardTraces[state.deliveryTraceIndex % level.hazardTraces.length];
  const route = level.network.routes.find((item) => item.id === state.selectedRouteId);
  const trace = {
    ...authoredTrace,
    linkEffects: authoredTrace.linkEffects.filter((effect) => route.linkIds.includes(effect.linkId)),
  };
  state.deliveryTraceIndex += 1;
  state.deliveryAttempts += 1;
  const dropped = trace.linkEffects.some((effect) => effect.drop);
  state.notice = dropped
    ? `Delivery attempt ${state.deliveryAttempts} dropped; your correct strategy is retained.`
    : `Delivery succeeded on ${trace.id}.`;
  if (dropped) {
    setView(state, "dropped-feedback");
    return { delivered: false, trace };
  }
  if (!state.completedLevelIds.includes(level.id)) state.completedLevelIds.push(level.id);
  setView(state, "level-complete");
  return { delivered: true, trace };
}

export function deliverPacket(state) {
  if (state.view !== "playing-grid") return null;
  const level = currentLevel(state);
  if (state.checkpointChoices.length !== level.checkpoints.length
      || !isSameCoordinate(state.position, state.document.maze.destination)) return null;
  if (level.challenge.type !== "congestion-loss") {
    completeLevel(state);
    return { delivered: true, trace: null };
  }
  setView(state, "delivering");
  return beginDeliveryAttempt(state);
}

export function retryDelivery(state) {
  if (state.view !== "dropped-feedback") return null;
  setView(state, "delivering");
  return beginDeliveryAttempt(state);
}

export function advanceLevel(state) {
  if (state.view !== "level-complete") return false;
  if (state.levelIndex === state.document.levels.length - 1) {
    setView(state, "summary");
    return true;
  }
  state.levelIndex += 1;
  state.position = [...state.document.maze.start];
  state.checkpointIndex = 0;
  state.checkpointChoices = [];
  state.direction = "right";
  state.collectedCells = [state.document.maze.start.join(",")];
  state.ghosts = createGhosts(state.document.maze);
  state.ghostGraceTicks = 0;
  state.encounter = null;
  state.encounterSequence = 0;
  state.deliveryAttempts = 0;
  state.deliveryTraceIndex = 0;
  state.acceptedRiskStrategy = null;
  state.selectedRouteId = null;
  state.gateResolved = false;
  state.lastEvaluation = null;
  state.ruleEditArmed = false;
  state.tracerouteVisible = false;
  state.shownHint = null;
  state.notice = "";
  setView(state, "briefing");
  return true;
}

export function recordAssistance(state, id, text) {
  if (!["briefing", "playing-grid", "paused", "decision-prompt", "feedback"].includes(state.view)) return false;
  if (!state.assistanceUsed.includes(id)) state.assistanceUsed.push(id);
  state.shownHint = text;
  return true;
}

export function armRuleEdit(state) {
  if (state.view !== "decision-prompt" || currentLevel(state).challenge.type !== "acl") return false;
  state.ruleEditArmed = !state.ruleEditArmed;
  return true;
}

export function restartSession(document) {
  return createSession(document);
}

