import { validateCampaign, validateDevelopmentDocument } from "../engine/content.js";

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createContentCases(document) {
  const firstLesson = { schemaVersion: 1, sources: document.sources, maze: document.maze, levels: [document.levels[0]] };
  return [
    {
      id: "content:complete-six-level-campaign",
      run() {
        const errors = validateCampaign(document);
        if (errors.length) throw new Error(errors.join("; "));
      },
    },
    {
      id: "content:valid-partial-only-in-development-mode",
      run() {
        if (validateDevelopmentDocument(firstLesson).length) throw new Error("Valid Level 1 was rejected in development mode.");
        if (!validateCampaign(firstLesson).some((error) => error.includes("exactly six"))) {
          throw new Error("Partial campaign passed strict validation.");
        }
      },
    },
    {
      id: "content:missing-required-field",
      run() {
        const fixture = copy(firstLesson);
        fixture.levels[0].title = "";
        if (!validateDevelopmentDocument(fixture).some((error) => error.includes(".title"))) {
          throw new Error("Missing level title was not reported.");
        }
      },
    },
    {
      id: "content:duplicate-source-id",
      run() {
        const fixture = copy(firstLesson);
        fixture.sources[1].id = fixture.sources[0].id;
        if (!validateDevelopmentDocument(fixture).some((error) => error.includes("duplicate id"))) {
          throw new Error("Duplicate source IDs were not reported.");
        }
      },
    },
    {
      id: "content:broken-source-reference",
      run() {
        const fixture = copy(firstLesson);
        fixture.levels[0].sourceIds = ["missing-source"];
        if (!validateDevelopmentDocument(fixture).some((error) => error.includes("missing source"))) {
          throw new Error("Broken source reference was not reported.");
        }
      },
    },
    {
      id: "content:malformed-ipv4-prefix",
      run() {
        const fixture = copy(document);
        fixture.levels[3].challenge.prefix = "192.0.2.0/33";
        if (!validateCampaign(fixture).some((error) => error.includes("subnet model"))) {
          throw new Error("Malformed prefix was not reported.");
        }
      },
    },
    {
      id: "content:lowest-risk-route-needs-a-successful-trace",
      run() {
        const fixture = copy(document);
        fixture.levels[5].hazardTraces.forEach((trace) => {
          trace.linkEffects = [{ linkId: "lower-b", additionalDelayMs: 0, drop: true, explanation: "blocked" }];
        });
        if (!validateCampaign(fixture).some((error) => error.includes("lowest-risk strategy"))) {
          throw new Error("Impossible low-risk delivery trace was not reported.");
        }
      },
    },
    {
      id: "content:malformed-nested-data-is-reported",
      run() {
        const fixture = copy(document);
        fixture.maze.sections[0].paths.direct[3] = null;
        fixture.levels[1].challenge.rules[0] = null;
        fixture.levels[5].hazardTraces[0].linkEffects[0] = null;
        const errors = validateCampaign(fixture);
        if (!errors.length) throw new Error("Malformed nested values were not reported.");
      },
    },
    {
      id: "content:requires-three-same-topic-checkpoints",
      run() {
        const missing = copy(document);
        missing.levels[0].checkpoints.pop();
        if (!validateCampaign(missing).some((error) => error.includes("three checkpoints"))) {
          throw new Error("A two-checkpoint lesson passed validation.");
        }
        const mixed = copy(document);
        mixed.levels[0].checkpoints[1].challenge.type = "transport";
        if (!validateCampaign(mixed).some((error) => error.includes("campaign order"))) {
          throw new Error("A checkpoint was allowed to change the lesson's topic.");
        }
      },
    },
    {
      id: "content:checks-later-models-and-maze-paths",
      run() {
        const fixture = copy(document);
        fixture.levels[0].checkpoints[2].linkOverrides.push({ id: "missing", latencyMs: 1 });
        fixture.maze.sections[2].paths.upper[4] = [18, 18];
        const errors = validateCampaign(fixture);
        if (!errors.some((error) => error.includes("link overrides"))
            || !errors.some((error) => error.includes("adjacent"))) {
          throw new Error("An invalid later-checkpoint model or disconnected path was accepted.");
        }
      },
    },
    {
      id: "content:rejects-gate-bypasses-and-disconnected-detours",
      run() {
        const fixture = copy(document);
        fixture.maze.detours.push([...fixture.maze.destination]);
        const errors = validateCampaign(fixture);
        if (!errors.some((error) => error.includes("bypasses"))
            || !errors.some((error) => error.includes("detours must be reachable"))) {
          throw new Error("A detour could unlock the destination before all gates.");
        }
      },
    },
    {
      id: "content:rejects-an-unsolvable-later-checkpoint",
      run() {
        const fixture = copy(document);
        fixture.levels[0].checkpoints[1].linkOverrides =
          fixture.levels[0].network.links.map((link) => ({ id: link.id, available: false }));
        if (!validateCampaign(fixture).some((error) => error.includes("no solvable decision"))) {
          throw new Error("A checkpoint with no available route passed validation.");
        }
      },
    },
    {
      id: "content:ghost-questions-require-valid-answers-and-unique-choices",
      run() {
        const fixture = copy(document);
        fixture.levels[0].ghostQuestions[0].answerId = "missing";
        fixture.levels[1].ghostQuestions[0].choices[1].id = fixture.levels[1].ghostQuestions[0].choices[0].id;
        fixture.levels[2].ghostQuestions = [];
        const errors = validateCampaign(fixture);
        if (!errors.some((error) => error.includes("answer referencing a choice"))
            || !errors.some((error) => error.includes("choices contains duplicate"))
            || !errors.some((error) => error.includes("must contain encounter questions"))) {
          throw new Error("Invalid encounter pools passed content validation.");
        }
      },
    },
    {
      id: "content:ghost-patrols-cannot-cross-safe-gates",
      run() {
        const fixture = copy(document);
        fixture.maze.ghosts[0].spawn = [...fixture.maze.sections[0].gate];
        fixture.maze.ghosts[1].patrol.push([...fixture.maze.ghosts[2].spawn]);
        const errors = validateCampaign(fixture);
        if (!errors.some((error) => error.includes("outside safe checkpoints"))
            || !errors.some((error) => error.includes("reachable patrol"))) {
          throw new Error("A ghost was allowed to spawn on a safe gate or patrol across disconnected regions.");
        }
      },
    },
  ];
}
