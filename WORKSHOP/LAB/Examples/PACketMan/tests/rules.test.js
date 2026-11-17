import {
  evaluateACL,
  evaluateGhostAnswer,
  evaluateQos,
  evaluateRisk,
  evaluateRouting,
  evaluateSubnet,
  evaluateTransport,
  isIpv4InPrefix,
} from "../engine/rules.js";
import { explainResult } from "../engine/feedback.js";

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createRulesCases(document) {
  const routing = document.levels[0];
  const acl = document.levels[1];
  const transport = document.levels[2];
  const subnet = document.levels[3];
  const qos = document.levels[4];
  const risk = document.levels[5];
  return [
    {
      id: "rules:minimum-latency-route",
      run() {
        if (evaluateRouting(routing, "upper").status !== "correct") throw new Error("Expected upper route to be accepted.");
      },
    },
    {
      id: "rules:all-tied-minimum-routes",
      run() {
        for (const routeId of ["upper", "lower"]) {
          if (evaluateRouting(routing, routeId).status !== "correct") throw new Error(`${routeId} tied route was rejected.`);
        }
      },
    },
    {
      id: "rules:fewer-hops-but-higher-latency",
      run() {
        const result = evaluateRouting(routing, "direct");
        result.message = explainResult(result, routing);
        if (result.status !== "incorrect" || !result.message.includes("80 ms")) {
          throw new Error("The higher-latency route was not explained with its total.");
        }
      },
    },
    {
      id: "rules:blocked-route",
      run() {
        const fixture = copy(routing);
        fixture.network.links.find((link) => link.id === "direct-a").available = false;
        if (evaluateRouting(fixture, "direct").reasonCode !== "blocked-route") {
          throw new Error("Unavailable route was not rejected as blocked.");
        }
      },
    },
    {
      id: "rules:disconnected-route",
      run() {
        const fixture = copy(routing);
        fixture.network.links.find((link) => link.id === "upper-b").from = "source";
        if (evaluateRouting(fixture, "upper").reasonCode !== "blocked-route") {
          throw new Error("Disconnected links were graded as a viable route.");
        }
      },
    },
    {
      id: "rules:changed-link-reorders-routes",
      run() {
        const fixture = copy(routing);
        fixture.network.links.find((link) => link.id === "upper-a").latencyMs = 100;
        if (evaluateRouting(fixture, "upper").status !== "incorrect") {
          throw new Error("Evaluator did not use the changed displayed link latency.");
        }
      },
    },
    {
      id: "rules:acl-first-match-and-one-crossing-edit",
      run() {
        if (evaluateACL(acl, "web").status !== "correct") throw new Error("Allowed web packet was rejected.");
        if (evaluateACL(acl, "admin").status !== "incorrect") throw new Error("Denied admin packet was allowed.");
        if (evaluateACL(acl, "admin", "deny-admin").status !== "correct") {
          throw new Error("Temporary rule edit did not apply to the crossing.");
        }
        if (evaluateACL(acl, "admin").status !== "incorrect") throw new Error("Temporary rule edit persisted.");
      },
    },
    {
      id: "rules:acl-default-action",
      run() {
        const fixture = copy(acl);
        fixture.challenge.packets.push({
          id: "unmatched", label: "Unmatched", sourceIp: "203.0.113.8", destinationPort: 8080, protocol: "udp",
        });
        const result = evaluateACL(fixture, "unmatched");
        if (result.reasonCode !== "default-action" || result.evidence.action !== "deny") {
          throw new Error("The explicit default deny action was not applied.");
        }
      },
    },
    {
      id: "rules:transport-need-and-no-speed-penalty",
      run() {
        if (evaluateTransport(transport, "tcp").status !== "correct") throw new Error("TCP did not satisfy ordered delivery.");
        if (evaluateTransport(transport, "udp").status !== "incorrect") throw new Error("UDP incorrectly satisfied ordered delivery.");
        if (!evaluateTransport(transport, "tcp").message.includes("retransmission")) {
          throw new Error("Transport explanation omitted retransmission behavior.");
        }
      },
    },
    {
      id: "rules:subnet-boundaries-and-gateway",
      run() {
        if (!isIpv4InPrefix("192.0.2.0", "192.0.2.0/24")
            || !isIpv4InPrefix("192.0.2.255", "192.0.2.0/24")
            || isIpv4InPrefix("192.0.3.0", "192.0.2.0/24") !== false
            || isIpv4InPrefix("192.0.2.256", "192.0.2.0/24") !== null) {
          throw new Error("IPv4 prefix boundary handling is incorrect.");
        }
        if (evaluateSubnet(subnet, "gateway").status !== "correct") throw new Error("Off-subnet destination did not use gateway.");
        const local = copy(subnet);
        local.challenge.destinationIp = local.challenge.localExample;
        if (evaluateSubnet(local, "local").status !== "correct") throw new Error("Local destination did not use local path.");
      },
    },
    {
      id: "rules:qos-declared-service-order",
      run() {
        if (evaluateQos(qos, "voice").status !== "correct"
            || evaluateQos(qos, "bulk").status !== "incorrect") {
          throw new Error("QoS choice ignored the declared service order.");
        }
      },
    },
    {
      id: "rules:risk-choice-separate-from-delivery-event",
      run() {
        const result = evaluateRisk(risk, "lower", true);
        if (result.status !== "correct" || result.evidence.chosen.riskPoints !== 2) {
          throw new Error("Lowest-risk shielded strategy was not accepted.");
        }
        if (evaluateRisk(risk, "lower", false).status !== "incorrect") {
          throw new Error("Higher-risk unshielded strategy was accepted.");
        }
        if (!risk.hazardTraces[0].linkEffects[0].drop || evaluateRisk(risk, "lower", true).status !== "correct") {
          throw new Error("A hazard drop changed risk-choice grading.");
        }
      },
    },
    {
      id: "rules:ghost-question-pools-accept-reviewed-answers",
      run() {
        const answers = [
          ["b", "available", "either"],
          ["deny", "drop", "restored"],
          ["tcp", "application", "application"],
          ["local", "gateway", "inside"],
          ["control", "not-guaranteed", "bulk"],
          ["b", "retry", "model"],
        ];
        document.levels.forEach((level, index) => {
          level.ghostQuestions.forEach((question, questionIndex) => {
            const correct = evaluateGhostAnswer(question, answers[index][questionIndex]);
            const wrong = question.choices.find((choice) => choice.id !== answers[index][questionIndex]);
            if (correct.status !== "correct" || !correct.message.includes(question.explanation)
                || evaluateGhostAnswer(question, wrong.id).status !== "incorrect") {
              throw new Error(`Ghost question ${level.id}/${question.id} was graded incorrectly.`);
            }
          });
        });
      },
    },
    {
      id: "rules:ghost-question-rejects-unknown-answer",
      run() {
        const result = evaluateGhostAnswer(document.levels[0].ghostQuestions[0], "missing");
        if (result.status !== "invalid-input" || !result.message.includes("listed")) {
          throw new Error("An unknown ghost answer was graded as a learner mistake or silently ignored.");
        }
      },
    },
  ];
}
