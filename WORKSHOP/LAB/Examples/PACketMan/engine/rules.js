function result(status, reasonCode, expected, evidence, message) {
  return { status, reasonCode, expected, evidence, message };
}

function findRoute(level, routeId) {
  return level.network.routes.find((route) => route.id === routeId);
}

function routeMetrics(level, route) {
  const links = route.linkIds.map((id) => level.network.links.find((link) => link.id === id));
  const connected = links.every((link, index) => link
    && (index === 0 || link.from === links[index - 1].to));
  const startsAtHost = level.network.nodes.find((node) => node.id === links[0]?.from)?.role === "host";
  const endsAtHost = level.network.nodes.find((node) => node.id === links.at(-1)?.to)?.role === "host";
  const available = connected && startsAtHost && endsAtHost && links.every((link) => link.available);
  return {
    routeId: route.id,
    hops: links.length,
    latencyMs: links.reduce((total, link) => total + (link?.latencyMs ?? 0), 0),
    riskPoints: links.reduce((total, link) => total + (link?.riskPoints ?? 0), 0),
    available,
  };
}

export function evaluateRouting(level, routeId) {
  const route = findRoute(level, routeId);
  if (!route) return result("invalid-input", "unknown-route", null, { routeId }, "Choose a listed route.");
  const routes = level.network.routes.map((candidate) => routeMetrics(level, candidate));
  const viable = routes.filter((candidate) => candidate.available);
  if (!viable.length) {
    return result("content-error", "no-viable-route", null, { routes }, "No route is currently available.");
  }
  const bestLatency = Math.min(...viable.map((candidate) => candidate.latencyMs));
  const best = viable.filter((candidate) => candidate.latencyMs === bestLatency);
  const chosen = routes.find((candidate) => candidate.routeId === routeId);
  const correct = chosen.available && best.some((candidate) => candidate.routeId === routeId);
  return result(
    correct ? "correct" : "incorrect",
    correct ? "best-latency-route" : chosen.available ? "higher-latency-route" : "blocked-route",
    best.map((candidate) => candidate.routeId),
    { chosen, bestLatencyMs: bestLatency, routes },
    correct
      ? `${route.label} is a lowest-latency route at ${chosen.latencyMs} ms.`
      : chosen.available
        ? `${route.label} uses ${chosen.hops} hops and totals ${chosen.latencyMs} ms; the best available route totals ${bestLatency} ms.`
        : `${route.label} is unavailable. Choose an available route.`,
  );
}

function packetMatches(packet, rule) {
  return (rule.protocol === "any" || rule.protocol === packet.protocol)
    && (rule.sourceIp === "any" || rule.sourceIp === packet.sourceIp)
    && (rule.destinationPort === "any" || rule.destinationPort === packet.destinationPort);
}

export function evaluateACL(level, packetId, editRuleId = null) {
  const challenge = level.challenge;
  const packet = challenge.packets.find((candidate) => candidate.id === packetId);
  if (!packet) return result("invalid-input", "unknown-packet", null, { packetId }, "Choose a listed packet.");
  const matched = challenge.rules.find((rule) => packetMatches(packet, rule));
  const originalAction = matched?.action ?? challenge.defaultAction;
  const action = matched?.id === editRuleId && challenge.editableRule?.id === editRuleId
    ? challenge.editableRule.temporaryAction
    : originalAction;
  const correct = action === "allow";
  return result(
    correct ? "correct" : "incorrect",
    editRuleId && matched?.id === editRuleId ? "one-crossing-edit" : matched ? "first-match" : "default-action",
    "allow",
    {
      packet,
      matchedRuleId: matched?.id ?? null,
      originalAction,
      action,
      defaultAction: challenge.defaultAction,
    },
    correct
      ? `${matched ? `First match: ${matched.id}.` : `No rule matched; the default is ${action}.`} The packet is allowed.`
      : `${matched ? `First match: ${matched.id} says deny.` : `No rule matched; the default action is deny.`} The packet is dropped.`,
  );
}

export function evaluateTransport(level, transport) {
  if (!["tcp", "udp"].includes(transport)) {
    return result("invalid-input", "unknown-transport", null, { transport }, "Choose TCP or UDP.");
  }
  const expected = level.challenge.correctTransport;
  const correct = transport === expected;
  return result(
    correct ? "correct" : "incorrect",
    correct ? "transport-fits-need" : "transport-misses-need",
    expected,
    { transport, need: level.challenge.need },
    correct
      ? `${transport.toUpperCase()} fits this need: ${level.challenge.explanation}`
      : `${transport.toUpperCase()} does not fit this need. ${level.challenge.explanation}`,
  );
}

export function ipv4ToNumber(address) {
  if (typeof address !== "string") return null;
  const octets = address.split(".");
  if (octets.length !== 4 || octets.some((part) => !/^(0|[1-9]\d{0,2})$/.test(part))) return null;
  const values = octets.map(Number);
  if (values.some((value) => value > 255)) return null;
  return values.reduce((value, octet) => ((value << 8) | octet) >>> 0, 0);
}

export function isIpv4InPrefix(address, prefix) {
  const match = typeof prefix === "string" && /^(.+)\/(\d|[12]\d|3[0-2])$/.exec(prefix);
  const ip = ipv4ToNumber(address);
  const network = match ? ipv4ToNumber(match[1]) : null;
  if (ip === null || network === null) return null;
  const bits = Number(match[2]);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ip & mask) >>> 0 === (network & mask) >>> 0;
}

export function evaluateSubnet(level, pathChoice) {
  if (!["local", "gateway"].includes(pathChoice)) {
    return result("invalid-input", "unknown-next-hop", null, { pathChoice }, "Choose local delivery or the gateway.");
  }
  const challenge = level.challenge;
  const isLocal = isIpv4InPrefix(challenge.destinationIp, challenge.prefix);
  if (isLocal === null) {
    return result("content-error", "invalid-prefix-data", null, { prefix: challenge.prefix }, "The subnet content is invalid.");
  }
  const expected = isLocal ? "local" : "gateway";
  const correct = pathChoice === expected;
  return result(
    correct ? "correct" : "incorrect",
    correct ? "correct-subnet-path" : "wrong-subnet-path",
    expected,
    {
      destinationIp: challenge.destinationIp,
      prefix: challenge.prefix,
      gateway: challenge.gateway,
      isLocal,
    },
    correct
      ? isLocal
        ? `${challenge.destinationIp} is inside ${challenge.prefix}; deliver locally.`
        : `${challenge.destinationIp} is outside ${challenge.prefix}; send it to ${challenge.gateway}.`
      : isLocal
        ? `${challenge.destinationIp} is in ${challenge.prefix}, so it is reached locally rather than through the gateway.`
        : `${challenge.destinationIp} is outside ${challenge.prefix}, so send it to gateway ${challenge.gateway}.`,
  );
}

export function evaluateQos(level, trafficClass) {
  const { classes, serviceOrder, queuePolicy } = level.challenge;
  if (!classes.some((item) => item.id === trafficClass)) {
    return result("invalid-input", "unknown-traffic-class", null, { trafficClass }, "Choose a listed traffic class.");
  }
  const best = serviceOrder[0];
  const correct = trafficClass === best;
  const position = serviceOrder.indexOf(trafficClass) + 1;
  return result(
    correct ? "correct" : "incorrect",
    correct ? "first-served-class" : "lower-service-order",
    best,
    { trafficClass, serviceOrder, position, queuePolicy },
    correct
      ? `${trafficClass} is first under the declared ${queuePolicy} policy.`
      : `${trafficClass} is service position ${position} under the declared ${queuePolicy} policy; ${best} is served first.`,
  );
}

export function evaluateRisk(level, routeId, reduceRisk = false) {
  const route = findRoute(level, routeId);
  if (!route) return result("invalid-input", "unknown-route", null, { routeId }, "Choose a listed route.");
  const candidateRisks = level.network.routes.flatMap((candidate) => [false, true].map((reduced) => {
    const metrics = routeMetrics(level, candidate);
    return {
      routeId: candidate.id,
      reduceRisk: reduced,
      available: metrics.available,
      riskPoints: Math.max(0, metrics.riskPoints
        - (reduced ? level.challenge.riskReductionPoints : 0)),
    };
  })).filter((candidate) => candidate.available);
  if (!candidateRisks.length) {
    return result("content-error", "no-viable-route", null, { candidateRisks }, "No route is currently available.");
  }
  const bestRisk = Math.min(...candidateRisks.map((candidate) => candidate.riskPoints));
  const best = candidateRisks.filter((candidate) => candidate.riskPoints === bestRisk);
  const chosen = candidateRisks.find((candidate) =>
    candidate.routeId === routeId && candidate.reduceRisk === Boolean(reduceRisk));
  const correct = chosen && best.some((candidate) =>
    candidate.routeId === routeId && candidate.reduceRisk === Boolean(reduceRisk));
  return result(
    correct ? "correct" : "incorrect",
    correct ? "lowest-risk-strategy" : "higher-risk-strategy",
    best,
    { chosen, bestRiskPoints: bestRisk, candidateRisks },
    correct
      ? `${route.label}${reduceRisk ? " with the risk-reducing action" : ""} has the lowest modeled risk (${chosen.riskPoints} points).`
      : `${route.label} has ${chosen?.riskPoints ?? "unavailable"} modeled risk points; the lowest available strategy has ${bestRisk}.`,
  );
}

export function evaluateDecision(level, decision) {
  if (!decision || typeof decision !== "object") {
    return result("invalid-input", "missing-decision", null, {}, "Choose an option before submitting.");
  }
  switch (level.challenge.type) {
    case "routing":
      return evaluateRouting(level, decision.routeId);
    case "acl":
      return evaluateACL(level, decision.packetId, decision.editRuleId);
    case "transport":
      return evaluateTransport(level, decision.transport);
    case "subnet-gateway":
      return evaluateSubnet(level, decision.pathChoice);
    case "qos":
      return evaluateQos(level, decision.trafficClass);
    case "congestion-loss":
      return evaluateRisk(level, decision.routeId, decision.reduceRisk);
    default:
      return result("content-error", "unsupported-challenge", null, {}, "This challenge is not supported.");
  }
}

export function evaluateGhostAnswer(question, choiceId) {
  if (!question.choices.some((choice) => choice.id === choiceId)) {
    return result("invalid-input", "unknown-ghost-answer", question.answerId, { choiceId }, "Choose one of the listed answers.");
  }
  const correct = choiceId === question.answerId;
  return result(
    correct ? "correct" : "incorrect",
    correct ? "ghost-answer-correct" : "ghost-answer-incorrect",
    question.answerId,
    { questionId: question.id, choiceId },
    `${correct ? "Correct!" : "Not quite."} ${question.explanation}`,
  );
}
