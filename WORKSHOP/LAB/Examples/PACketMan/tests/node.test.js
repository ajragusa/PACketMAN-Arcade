import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createContentCases } from "./content.test.js";
import { createRulesCases } from "./rules.test.js";
import { createStateCases } from "./state.test.js";

const document = JSON.parse(readFileSync(new URL("../data/levels.json", import.meta.url), "utf8"));
const cases = [
  ...createContentCases(document),
  ...createRulesCases(document),
  ...createStateCases(document),
];

if (cases.length === 0) throw new Error("No tests were discovered.");

for (const testCase of cases) test(testCase.id, async () => {
  await testCase.run();
  assert.ok(true);
});
