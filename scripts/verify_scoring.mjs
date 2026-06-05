// Quick verification of the new weighted scoring rubric.
// Loads constants.ts via a minimal hand-mirrored copy of the data so we
// don't need TS tooling installed.
// Run: node scripts/verify_scoring.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, "..", "constants.ts"), "utf8");

// Extract the weights from the source — proves the file is internally consistent.
const weightMatches = [...src.matchAll(/id:\s*'(q\d+)',[\s\S]*?weight:\s*(\d+)/g)];
const optsPerQ = [...src.matchAll(/id:\s*'(q\d+)'[\s\S]*?options:\s*\[\s*([\s\S]*?)\],/g)];

const questions = optsPerQ.map(([, id, optsBlock]) => {
  const scores = [...optsBlock.matchAll(/score:\s*(\d+)/g)].map(m => Number(m[1]));
  const weight = Number(weightMatches.find(w => w[1] === id)?.[2] ?? 1);
  return { id, scores, weight };
});

const sumWeights = questions.reduce((s, q) => s + q.weight, 0);
const maxScore = questions.reduce((s, q) => s + Math.max(...q.scores) * q.weight, 0);

console.log(`Questions:       ${questions.length}`);
console.log(`Sum of weights:  ${sumWeights}`);
console.log(`MAX_SCORE:       ${maxScore}\n`);

const tierOf = pct => (pct > 75 ? "Leader" : pct > 40 ? "Adopter" : "Explorer");

const scenarios = [
  ["Pure floor (all 0s)",                () => 0],
  ["Weak Explorer (0 on critical, 1 else)", q => (q.weight === 3 ? 0 : 1)],
  ["Mid Explorer (mostly 1s)",           () => 1],
  ["Strong Explorer / weak Adopter",     q => (q.weight === 3 ? 1 : 2)],
  ["Mid Adopter (mostly 2s)",            () => 2],
  ["Strong Adopter (2s + 3 on critical)", q => (q.weight === 3 ? 3 : 2)],
  ["Weak Leader (3 on critical, 2 else)", q => (q.weight === 3 ? 3 : 2)],
  ["Pure Leader (all 3s)",               () => 3],
];

console.log("Scenario".padEnd(42), "Score".padStart(7), "Pct".padStart(6), " Tier");
console.log("-".repeat(72));
for (const [label, scoreFn] of scenarios) {
  let total = 0;
  for (const q of questions) total += scoreFn(q) * q.weight;
  const pct = Math.round((total / maxScore) * 100);
  console.log(label.padEnd(42), String(total).padStart(7), (pct + "%").padStart(6), " " + tierOf(pct));
}
