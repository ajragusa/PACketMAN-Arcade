import { checkpointLevel, mazeCoordinates } from "./checkpoints.js";
import { evaluateDecision } from "./rules.js";
import { ghostWalkableCells } from "./ghosts.js";

const CHALLENGE_TYPES = new Set([
  "routing",
  "acl",
  "transport",
  "subnet-gateway",
  "qos",
  "congestion-loss",
]);
const ORDERED_CHALLENGES = ["routing", "acl", "transport", "subnet-gateway", "qos", "congestion-loss"];

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value.trim().length > 0;
const isInteger = (value) => Number.isInteger(value);

function validIpv4(value) {
  if (typeof value !== "string") return false;
  const octets = value.split(".");
  return octets.length === 4 && octets.every((octet) =>
    /^(0|[1-9]\d{0,2})$/.test(octet) && Number(octet) <= 255);
}

function validPrefix(value) {
  const match = typeof value === "string" && /^(.+)\/(\d|[12]\d|3[0-2])$/.exec(value);
  return Boolean(match && validIpv4(match[1]));
}

function uniqueIds(items, label, errors) {
  const seen = new Set();
  for (const [index, item] of items.entries()) {
    if (!isRecord(item) || !isText(item.id)) {
      errors.push(`${label}[${index}] must have a non-empty id`);
    } else if (seen.has(item.id)) {
      errors.push(`${label} contains duplicate id "${item.id}"`);
    }
    if (isRecord(item) && isText(item.id)) seen.add(item.id);
  }
}

function validCoordinate(value, grid) {
  return Array.isArray(value)
    && value.length === 2
    && value.every(isInteger)
    && value[0] >= 0
    && value[0] < grid.rows
    && value[1] >= 0
    && value[1] < grid.columns;
}

function sameCoordinate(left, right) {
  return left?.[0] === right?.[0] && left?.[1] === right?.[1];
}

function validateGhostQuestions(questions, prefix, errors) {
  if (!Array.isArray(questions) || questions.length === 0) {
    errors.push(`${prefix}.ghostQuestions must contain encounter questions`);
    return;
  }
  uniqueIds(questions, `${prefix}.ghostQuestions`, errors);
  questions.forEach((question, index) => {
    const name = `${prefix}.ghostQuestions[${index}]`;
    if (!isRecord(question) || !isText(question.prompt) || !isText(question.explanation)
        || !isText(question.answerId) || !Array.isArray(question.choices) || question.choices.length < 2) {
      errors.push(`${name} must define a prompt, choices, answer, and explanation`);
      return;
    }
    uniqueIds(question.choices, `${name}.choices`, errors);
    if (question.choices.some((choice) => !isRecord(choice) || !isText(choice.label))
        || !question.choices.some((choice) => isRecord(choice) && choice.id === question.answerId)) {
      errors.push(`${name} must have labeled choices and an answer referencing a choice`);
    }
  });
}

function validateLevel(level, index, sourceIds, errors, prefix = `levels[${index}]`) {
  if (!isRecord(level)) {
    errors.push(`${prefix} must be an object`);
    return;
  }

  for (const field of ["title", "learningOutcome", "briefing"]) {
    if (!isText(level[field])) errors.push(`${prefix}.${field} must be non-empty text`);
  }
  if (!isInteger(level.order) || level.order !== index + 1) {
    errors.push(`${prefix}.order must be ${index + 1}`);
  }
  if (!Array.isArray(level.sourceIds) || level.sourceIds.length === 0) {
    errors.push(`${prefix}.sourceIds must contain at least one source`);
  } else {
    for (const id of level.sourceIds) {
      if (!sourceIds.has(id)) errors.push(`${prefix} references missing source "${id}"`);
    }
  }

  const network = level.network;
  if (!isRecord(network)
      || !Array.isArray(network.nodes)
      || !Array.isArray(network.links)
      || !Array.isArray(network.routes)) {
    errors.push(`${prefix}.network must define nodes, links, and routes`);
  } else {
    uniqueIds(network.nodes, `${prefix}.network.nodes`, errors);
    uniqueIds(network.links, `${prefix}.network.links`, errors);
    uniqueIds(network.routes, `${prefix}.network.routes`, errors);
    const nodeIds = new Set(network.nodes.filter(isRecord).map((node) => node.id));
    if (network.nodes.some((node) => !isRecord(node)
        || !["host", "router", "gateway"].includes(node.role))) {
      errors.push(`${prefix}.network nodes must have valid roles`);
    }
    const linkMap = new Map(network.links.filter(isRecord).map((link) => [link.id, link]));
    for (const link of network.links) {
      if (!isRecord(link)
          || !nodeIds.has(link.from)
          || !nodeIds.has(link.to)
          || !isInteger(link.latencyMs) || link.latencyMs < 0
          || !isInteger(link.riskPoints) || link.riskPoints < 0
          || typeof link.available !== "boolean") {
        errors.push(`${prefix}.network contains an invalid link`);
      }
    }
    for (const route of network.routes) {
      if (!isRecord(route) || !Array.isArray(route.linkIds) || route.linkIds.length === 0) {
        errors.push(`${prefix}.network contains a route without links`);
        continue;
      }
      let previousTo = null;
      for (const linkId of route.linkIds) {
        const link = linkMap.get(linkId);
        if (!link) {
          errors.push(`${prefix}.network route "${route.id}" references missing link "${linkId}"`);
          break;
        }
        if (previousTo !== null && link.from !== previousTo) {
          errors.push(`${prefix}.network route "${route.id}" has disconnected links`);
          break;
        }
        previousTo = link.to;
      }
      if (route.linkIds.length) {
        const firstLink = linkMap.get(route.linkIds[0]);
        const lastLink = linkMap.get(route.linkIds.at(-1));
        if (firstLink && network.nodes.find((node) => isRecord(node) && node.id === firstLink.from)?.role !== "host") {
          errors.push(`${prefix}.network route "${route.id}" must start at a host`);
        }
        if (lastLink && network.nodes.find((node) => isRecord(node) && node.id === lastLink.to)?.role !== "host") {
          errors.push(`${prefix}.network route "${route.id}" must end at a host`);
        }
      }
    }
  }

  const challenge = level.challenge;
  if (!isRecord(challenge) || !CHALLENGE_TYPES.has(challenge.type)) {
    errors.push(`${prefix}.challenge has an unsupported type`);
  } else {
    if (level.order >= 1 && level.order <= 6 && challenge.type !== ORDERED_CHALLENGES[level.order - 1]) {
      errors.push(`${prefix}.challenge type does not match campaign order`);
    }
    if (!isRecord(level.completion) || !isText(level.completion.required)) {
      errors.push(`${prefix}.completion.required must describe the completion condition`);
    }
  }
  if (isRecord(challenge) && challenge.type === "acl") {
    if (!Array.isArray(challenge.packets) || challenge.packets.length < 2
        || !Array.isArray(challenge.rules) || challenge.rules.length === 0
        || !["allow", "deny"].includes(challenge.defaultAction)
        || !isRecord(challenge.editableRule)
        || !isText(challenge.editableRule.id)
        || !["allow", "deny"].includes(challenge.editableRule.temporaryAction)
        || !challenge.rules.some((rule) =>
          isRecord(rule) && rule.id === challenge.editableRule.id)) {
      errors.push(`${prefix}.challenge ACL requires packets, ordered rules, and a default action`);
    }
    if (Array.isArray(challenge.rules) && challenge.rules.some((rule) => !isRecord(rule)
        || !isText(rule.id) || !["allow", "deny"].includes(rule.action))) {
      errors.push(`${prefix}.challenge ACL contains an invalid rule`);
    }
    if (Array.isArray(challenge.packets) && challenge.packets.some((packet) => !isRecord(packet)
        || !isText(packet.id) || !isText(packet.label)
        || !validIpv4(packet.sourceIp)
        || !isInteger(packet.destinationPort) || packet.destinationPort < 1 || packet.destinationPort > 65535
        || !["tcp", "udp"].includes(packet.protocol))) {
      errors.push(`${prefix}.challenge ACL contains an invalid packet`);
    }
    if (Array.isArray(challenge.rules) && challenge.rules.some((rule) => isRecord(rule)
        && (!["any", "tcp", "udp"].includes(rule.protocol)
          || (rule.sourceIp !== "any" && !validIpv4(rule.sourceIp))
          || (rule.destinationPort !== "any"
            && (!isInteger(rule.destinationPort) || rule.destinationPort < 1 || rule.destinationPort > 65535))))) {
      errors.push(`${prefix}.challenge ACL contains a malformed rule matcher`);
    }
  } else if (isRecord(challenge) && challenge.type === "transport") {
    if (!["tcp", "udp"].includes(challenge.correctTransport)
        || !isText(challenge.need) || !isText(challenge.explanation)) {
      errors.push(`${prefix}.challenge must define a valid transport objective`);
    }
  } else if (isRecord(challenge) && challenge.type === "subnet-gateway") {
    if (!validPrefix(challenge.prefix)
        || !validIpv4(challenge.sourceIp)
        || !validIpv4(challenge.destinationIp)
        || !validIpv4(challenge.gateway)
        || !validIpv4(challenge.localExample)) {
      errors.push(`${prefix}.challenge subnet model is incomplete`);
    }
  } else if (isRecord(challenge) && challenge.type === "qos") {
    if (!Array.isArray(challenge.serviceOrder) || challenge.serviceOrder.length === 0
        || !Array.isArray(challenge.classes) || challenge.classes.length === 0
        || !isText(challenge.queuePolicy)
        || new Set(challenge.serviceOrder).size !== challenge.serviceOrder.length
        || challenge.classes.some((item) => !isRecord(item) || !isText(item.id))
        || challenge.serviceOrder.some((id) => !challenge.classes.some((item) => item?.id === id))) {
      errors.push(`${prefix}.challenge QoS model must declare classes and service order`);
    }
  } else if (isRecord(challenge) && challenge.type === "congestion-loss") {
    if (!isInteger(challenge.riskReductionPoints) || challenge.riskReductionPoints < 0
        || !Array.isArray(level.hazardTraces) || level.hazardTraces.length === 0) {
      errors.push(`${prefix} must define a risk reduction and replayable hazard traces`);
    }
  }

  if (!Array.isArray(level.hints)
      || level.hints.length < 1
      || !level.hints.every((hint) => isRecord(hint)
        && isText(hint.method) && isText(hint.solution))) {
    errors.push(`${prefix}.hints must provide method-first and worked-solution text`);
  }

  if (level.order === 5 || level.order === 6) {
    if (!Array.isArray(level.backgroundPackets) || level.backgroundPackets.length === 0
        || !isText(level.bottleneckLinkId)) {
      errors.push(`${prefix} must identify visible background traffic and its shared bottleneck`);
    }
    if (Array.isArray(level.backgroundPackets)
        && level.backgroundPackets.some((packet) => !isRecord(packet)
          || !isText(packet.id) || !isText(packet.label)
          || !network?.links?.some((link) => isRecord(link) && link.id === packet.linkId))) {
      errors.push(`${prefix} background traffic references an invalid shared link`);
    }
    if (!network?.links?.some((link) => isRecord(link) && link.id === level.bottleneckLinkId)) {
      errors.push(`${prefix}.bottleneckLinkId must name a network link`);
    }
  }
  if (level.order === 6 && Array.isArray(level.hazardTraces) && Array.isArray(network?.links)) {
    const linkIds = new Set(network.links.filter(isRecord).map((link) => link.id));
    for (const trace of level.hazardTraces) {
      if (!isRecord(trace) || !Array.isArray(trace.linkEffects)
          || trace.linkEffects.some((effect) => !isRecord(effect)
            || !linkIds.has(effect.linkId)
            || !isInteger(effect.additionalDelayMs) || effect.additionalDelayMs < 0
            || typeof effect.drop !== "boolean")) {
        errors.push(`${prefix} contains an invalid hazard trace`);
      }
    }
    const routes = network.routes ?? [];
    const validRoutes = routes.filter((route) => isRecord(route) && Array.isArray(route.linkIds));
    const candidateStrategies = validRoutes.flatMap((route) => [false, true].map((reduced) => {
      const risk = route.linkIds.reduce((total, id) => {
        const link = network.links.find((candidate) => candidate.id === id);
        return total + (link?.riskPoints ?? 0);
      }, 0);
      return {
        route,
        risk: Math.max(0, risk - (reduced ? level.challenge.riskReductionPoints : 0)),
      };
    }));
    if (candidateStrategies.length) {
      const bestRisk = Math.min(...candidateStrategies.map((candidate) => candidate.risk));
      const bestStrategies = candidateStrategies.filter((candidate) => candidate.risk === bestRisk);
      const hasSafeBestStrategy = bestStrategies.every(({ route }) =>
        level.hazardTraces.some((trace) => isRecord(trace)
          && Array.isArray(trace.linkEffects)
          && trace.linkEffects.every((effect) => isRecord(effect)
            && (!effect.drop || !route.linkIds.includes(effect.linkId)))));
      if (!hasSafeBestStrategy) {
        errors.push(`${prefix} has a lowest-risk strategy with no successful authored trace`);
      }
    }
  }
  validateGhostQuestions(level.ghostQuestions, prefix, errors);
}

function validateMaze(maze, errors) {
  if (!isRecord(maze) || !isInteger(maze.rows) || maze.rows < 1
      || !isInteger(maze.columns) || maze.columns < 1
      || !Array.isArray(maze.sections) || maze.sections.length !== 3) {
    errors.push("maze must define dimensions and exactly three sections");
    return;
  }
  const initialErrors = errors.length;
  const checkCells = (cells, name) => {
    if (!Array.isArray(cells) || cells.some((cell) => !validCoordinate(cell, maze))) {
      errors.push(`${name} must contain in-bounds coordinates`);
      return false;
    }
    return true;
  };
  const checkPath = (cells, start, end, name) => {
    if (!checkCells(cells, name)) return;
    if (cells.length < 2 || !sameCoordinate(cells[0], start) || !sameCoordinate(cells.at(-1), end)
        || new Set(cells.map((cell) => cell.join(","))).size !== cells.length
        || cells.some((cell, index) => index > 0
          && Math.abs(cell[0] - cells[index - 1][0]) + Math.abs(cell[1] - cells[index - 1][1]) !== 1)) {
      errors.push(`${name} must join its endpoints through adjacent, non-repeating cells`);
    }
  };
  checkCells([maze.start, maze.destination], "maze endpoints");
  checkCells(maze.detours, "maze.detours");
  checkPath(maze.approach, maze.start, maze.sections[0]?.gate, "maze.approach");
  maze.sections.forEach((section, index) => {
    const prefix = `maze.sections[${index}]`;
    if (!isRecord(section) || !isRecord(section.paths)
        || !["direct", "upper", "lower"].every((id) => Array.isArray(section.paths[id]))
        || Object.keys(section.paths).length !== 3) {
      errors.push(`${prefix} must define direct, upper, and lower paths`);
      return;
    }
    checkCells([section.gate, section.exit], `${prefix} endpoints`);
    checkCells(section.detours, `${prefix}.detours`);
    for (const [id, cells] of Object.entries(section.paths)) {
      checkPath(cells, section.gate, section.exit, `${prefix}.paths.${id}`);
    }
    checkPath(section.connector, section.exit,
      maze.sections[index + 1]?.gate ?? maze.destination, `${prefix}.connector`);
  });
  if (errors.length !== initialErrors) return;

  const reachable = (cells, start) => {
    const available = new Set(cells.map((cell) => cell.join(",")));
    const visited = new Set([start.join(",")]);
    const queue = [start];
    for (let index = 0; index < queue.length; index += 1) {
      const [row, column] = queue[index];
      for (const next of [[row - 1, column], [row + 1, column], [row, column - 1], [row, column + 1]]) {
        const key = next.join(",");
        if (available.has(key) && !visited.has(key)) {
          visited.add(key);
          queue.push(next);
        }
      }
    }
    return visited;
  };
  const initialCells = [...maze.approach, ...maze.detours];
  if (reachable(initialCells, maze.start).size !== new Set(initialCells.map((cell) => cell.join(","))).size) {
    errors.push("maze approach detours must be reachable");
  }
  const unlocked = new Set(initialCells.map((cell) => cell.join(",")));
  for (const [index, section] of maze.sections.entries()) {
    if (unlocked.has(maze.destination.join(","))
        || maze.sections.slice(index + 1).some((future) => unlocked.has(future.gate.join(",")))) {
      errors.push(`maze bypasses checkpoint ${index + 1}`);
    }
    for (const cells of Object.values(section.paths)) {
      const area = [...cells, ...section.connector, ...section.detours];
      if (reachable(area, section.gate).size !== new Set(area.map((cell) => cell.join(","))).size) {
        errors.push(`maze section ${index + 1} has an unreachable detour`);
      }
    }
    for (const cell of [...Object.values(section.paths).flat(), ...section.connector, ...section.detours]) {
      unlocked.add(cell.join(","));
    }
  }
  if (reachable([...mazeCoordinates(maze).values()], maze.start).size !== mazeCoordinates(maze).size) {
    errors.push("maze contains disconnected corridors");
  }
  if (!Array.isArray(maze.ghosts) || maze.ghosts.length === 0) {
    errors.push("maze.ghosts must contain ghost patrols");
    return;
  }
  uniqueIds(maze.ghosts, "maze.ghosts", errors);
  const ghostCells = ghostWalkableCells(maze);
  const regions = [];
  maze.ghosts.forEach((ghost, index) => {
    const name = `maze.ghosts[${index}]`;
    if (!isRecord(ghost) || !isText(ghost.name) || !["violet", "coral", "mint"].includes(ghost.tone)
        || !Array.isArray(ghost.patrol) || ghost.patrol.length < 2) {
      errors.push(`${name} must define a name, tone, spawn, and patrol waypoints`);
      return;
    }
    if (!checkCells([ghost.spawn, ...ghost.patrol], name)) return;
    if ([ghost.spawn, ...ghost.patrol].some((cell) => !ghostCells.has(cell.join(",")))) {
      errors.push(`${name} must stay on corridors outside safe checkpoints, start, and destination`);
      return;
    }
    const region = reachable([...ghostCells.values()], ghost.spawn);
    if (region.size < 5 || new Set(ghost.patrol.map((cell) => cell.join(","))).size < 2
        || ghost.patrol.some((cell) => !region.has(cell.join(",")))) {
      errors.push(`${name} needs a reachable patrol with room to retreat`);
    }
    if (regions.some((previous) => previous.has(ghost.spawn.join(",")))) {
      errors.push(`${name} must patrol a separate maze region`);
    }
    regions.push(region);
  });
}

function validateCheckpoints(level, index, sourceIds, errors) {
  if (!Array.isArray(level.checkpoints) || level.checkpoints.length !== 3) {
    errors.push(`levels[${index}] must define exactly three checkpoints`);
    return;
  }
  uniqueIds(level.checkpoints, `levels[${index}].checkpoints`, errors);
  const links = new Set(level.network.links.map((link) => link.id));
  if (level.network.routes.length !== 3
      || !["direct", "upper", "lower"].every((id) => level.network.routes.some((route) => route.id === id))) {
    errors.push(`levels[${index}] routes must match the maze's three paths`);
  }
  level.checkpoints.forEach((checkpoint, checkpointIndex) => {
    const prefix = `levels[${index}].checkpoints[${checkpointIndex}]`;
    if (!isRecord(checkpoint) || !isText(checkpoint.title) || !isText(checkpoint.briefing)
        || !isRecord(checkpoint.challenge) || !Array.isArray(checkpoint.linkOverrides)
        || checkpoint.linkOverrides.some((override) => !isRecord(override)
          || !links.has(override.id)
          || Object.keys(override).some((key) => !["id", "latencyMs", "riskPoints", "available"].includes(key)))) {
      errors.push(`${prefix} must define text, a challenge overlay, and valid link overrides`);
      return;
    }
    uniqueIds(checkpoint.linkOverrides, `${prefix}.linkOverrides`, errors);
    const effective = checkpointLevel(level, checkpointIndex);
    const before = errors.length;
    validateLevel(effective, index, sourceIds, errors, prefix);
    if (errors.length === before) {
      let candidates;
      switch (effective.challenge.type) {
        case "routing":
          candidates = effective.network.routes.map((route) => ({ routeId: route.id }));
          break;
        case "congestion-loss":
          candidates = effective.network.routes.flatMap((route) =>
            [false, true].map((reduceRisk) => ({ routeId: route.id, reduceRisk })));
          break;
        case "acl":
          candidates = effective.challenge.packets.flatMap((packet) =>
            [null, effective.challenge.editableRule.id].map((editRuleId) => ({ packetId: packet.id, editRuleId })));
          break;
        case "transport":
          candidates = ["tcp", "udp"].map((transport) => ({ transport }));
          break;
        case "subnet-gateway":
          candidates = ["local", "gateway"].map((pathChoice) => ({ pathChoice }));
          break;
        case "qos":
          candidates = effective.challenge.classes.map((item) => ({ trafficClass: item.id }));
          break;
      }
      if (!candidates.some((decision) => evaluateDecision(effective, decision).status === "correct")) {
        errors.push(`${prefix} has no solvable decision`);
      }
    }
  });
}

export function validateDevelopmentDocument(document) {
  const errors = [];
  if (!isRecord(document) || document.schemaVersion !== 1) {
    return ["content must be a version 1 document"];
  }
  if (!Array.isArray(document.sources) || document.sources.length === 0) {
    errors.push("sources must contain at least one record");
  } else {
    uniqueIds(document.sources, "sources", errors);
    for (const source of document.sources) {
      if (!isRecord(source)) continue;
      let validUrl = false;
      try {
        validUrl = new URL(source.url).protocol === "https:";
      } catch {
        validUrl = false;
      }
      if (!isText(source.title) || !isText(source.section) || !isText(source.claim) || !validUrl) {
        errors.push(`source "${source.id}" must have a title, HTTPS URL, section, and supported claim`);
      }
    }
  }
  if (!Array.isArray(document.levels) || document.levels.length < 1 || document.levels.length > 6) {
    errors.push("levels must contain between one and six lessons");
    return errors;
  }
  const sourceIds = new Set((Array.isArray(document.sources) ? document.sources : [])
    .filter(isRecord).map((source) => source.id));
  validateMaze(document.maze, errors);
  uniqueIds(document.levels, "levels", errors);
  document.levels.forEach((level, index) => {
    const count = errors.length;
    validateLevel(level, index, sourceIds, errors);
    if (errors.length === count) validateCheckpoints(level, index, sourceIds, errors);
  });
  return errors;
}

export function validateCampaign(document) {
  const errors = validateDevelopmentDocument(document);
  if (Array.isArray(document?.levels)
      && (document.levels.length !== 6
        || document.levels.some((level, index) => level?.order !== index + 1))) {
    errors.push("campaign must contain exactly six lessons ordered 1 through 6");
  }
  return errors;
}
