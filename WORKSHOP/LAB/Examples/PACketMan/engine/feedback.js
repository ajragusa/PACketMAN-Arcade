export function explainResult(evaluation, level) {
  if (!evaluation || typeof evaluation.message !== "string") {
    return "The game could not evaluate that choice. Try again.";
  }
  const { evidence } = evaluation;
  switch (evaluation.reasonCode) {
    case "higher-latency-route": {
      const route = level.network.routes.find((item) => item.id === evidence.chosen.routeId);
      return `${route.label} has ${evidence.chosen.hops} hops and totals ${evidence.chosen.latencyMs} ms. The lowest available total is ${evidence.bestLatencyMs} ms.`;
    }
    case "blocked-route":
      return `${level.network.routes.find((item) => item.id === evidence.chosen.routeId)?.label ?? "That route"} is unavailable, so it cannot deliver the packet. Choose a viable route.`;
    case "first-match":
    case "default-action":
      return evaluation.message;
    case "one-crossing-edit":
      return `One-crossing edit changes ${evidence.matchedRuleId} from ${evidence.originalAction} to ${evidence.action} for this packet. The original rule is restored afterward.`;
    case "transport-fits-need":
    case "transport-misses-need":
      return evaluation.message;
    case "correct-subnet-path":
    case "wrong-subnet-path":
      return evaluation.message;
    case "first-served-class":
    case "lower-service-order":
      return `${evidence.trafficClass} is at service position ${evidence.position} under the declared ${evidence.queuePolicy} policy; ${evidence.serviceOrder[0]} is served first.`;
    case "lowest-risk-strategy":
    case "higher-risk-strategy":
      return evaluation.message;
    default:
      return evaluation.message;
  }
}

export function explainDelivery(trace, level) {
  const dropped = trace.linkEffects.find((effect) => effect.drop);
  if (dropped) {
    return `A scripted loss event on ${dropped.linkId} dropped the packet: ${dropped.explanation} Your risk decision remains correct; retry delivery without a penalty.`;
  }
  const addedDelay = trace.linkEffects.reduce((total, effect) => total + effect.additionalDelayMs, 0);
  return `Packet delivered on trace ${trace.id}${addedDelay ? ` with ${addedDelay} ms of modeled additional delay` : ""}.`;
}
