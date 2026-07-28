import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readSource = (relativePath) =>
  readFile(resolve(projectRoot, relativePath), "utf8");

test("V18 secondary claims are wired from kill through checkpoint and success result", async () => {
  const source = await readSource("app/game/HuntCanvas.tsx");

  assert.match(source, /regularTrophyDrops: RegularTrophyDrop\[\]/);
  assert.match(source, /regularTrophyDrops: state\.regularTrophyDrops\.map/);
  assert.match(source, /regularTrophyDrops: checkpoint\.regularTrophyDrops\.map/);
  assert.match(source, /const trophy = enemyTrophyGameplayForEnemyId\(enemy\.archetype\)/);
  assert.match(source, /y: state\.world\.floorY - 24/);
  assert.match(source, /definitionId: trophy\.id/);
  assert.match(source, /sourceEnemyId: enemy\.archetype/);
  assert.match(source, /createTrophyRitual\([\s\S]*nearbyDrop[\s\S]*,\s*3,\s*\)/);
  assert.match(
    source,
    /\.\.\.\(state\.trophyClaim \? \[state\.trophyClaim\] : \[\]\),[\s\S]*state\.regularTrophyDrops[\s\S]*filter\(\(drop\) => drop\.collected\)/,
  );
  assert.match(source, /outcome === "success"[\s\S]*trophyClaims/);
});

test("V18 claims have a visible Canvas object, trophy-wall art and workshop preview", async () => {
  const [canvas, client, workshop] = await Promise.all([
    readSource("app/game/HuntCanvas.tsx"),
    readSource("app/game/GameClient.tsx"),
    readSource("app/game/TrophyWorkshop.tsx"),
  ]);

  assert.match(canvas, /assets\.enemyTrophies\[drop\.claim\.definitionId\]/);
  assert.match(canvas, /drop\.name\.toUpperCase\(\).*?\[E\]/s);
  assert.match(client, /enemyTrophyGameplayForDefinitionId\(trophy\.definitionId\)/);
  assert.match(client, /enemyTrophyGameplayForEnemyId\(trophy\.sourceEnemyId\)/);
  assert.match(client, /trophyImageUrl=\{trophyWorkshop\.trophyImageUrl\}/);
  assert.match(workshop, /trophyImageUrl\?: string/);
  assert.match(workshop, /Prise physique en cours de préparation/);
});

test("full QA rebuilds and audits the V18 gameplay derivatives", async () => {
  const packageData = JSON.parse(await readSource("package.json"));
  assert.equal(
    packageData.scripts["enemy-trophies:gameplay-build"],
    "node scripts/build-enemy-trophy-gameplay-v18.mjs",
  );
  assert.equal(
    packageData.scripts["enemy-trophies:gameplay-audit"],
    "node scripts/audit-enemy-trophy-gameplay-v18.mjs",
  );
  assert.match(packageData.scripts.qa, /enemy-trophies:gameplay-build/);
  assert.match(packageData.scripts.qa, /enemy-trophies:gameplay-audit/);
});
