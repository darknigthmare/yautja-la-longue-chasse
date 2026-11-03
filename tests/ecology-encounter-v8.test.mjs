import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import vm from "node:vm";

const projectRoot = process.cwd();

async function loadTsModule(relativePath, injected = {}) {
  const source = await readFile(join(projectRoot, relativePath), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(output, {
    module: loadedModule,
    exports: loadedModule.exports,
    require(specifier) {
      if (specifier === "./ecologyV8") return injected.ecology;
      throw new Error(`Unexpected import: ${specifier}`);
    },
  });
  return loadedModule.exports;
}

const ecology = await loadTsModule("app/game/ecologyV8.ts");
const encounters = await loadTsModule("app/game/ecologyEncounterV8.ts", {
  ecology,
});

const PLANNED_SPAWN_COUNTS = {
  "jungle-vey": 9,
  "ice-cryostalker": 9,
  "volcano-bad-blood": 12,
  "swamp-hydra": 12,
  "desert-sandmaw": 12,
  "ocean-leviathan": 12,
  "fungal-hivemind": 12,
  "ruins-ancient-guardian": 12,
};

test("every planet receives a deterministic ordinary deck and reserves its expansion boss", () => {
  for (const planet of ecology.ECOLOGY_V8_PLANETS) {
    const first = encounters.createEcologyEncounterDeck(planet.missionId, "run-42");
    const again = encounters.createEcologyEncounterDeck(planet.missionId, "run-42");
    const bossId = ecology.ECOLOGY_V8_BOSS_ENEMY_IDS[planet.missionId] ?? null;
    const expectedLength = bossId ? 29 : 30;
    assert.equal(first.length, expectedLength, planet.id);
    assert.deepEqual(first.map(({ id }) => id), again.map(({ id }) => id), planet.id);
    assert.equal(new Set(first.map(({ id }) => id)).size, expectedLength, planet.id);
    assert.equal(first.filter(({ distribution }) => distribution === "endemic").length, bossId ? 23 : 24);
    assert.equal(first.filter(({ distribution }) => distribution === "common").length, 6);
    if (bossId) assert.ok(!first.some(({ id }) => id === bossId), planet.id);
  }
});

test("the opening 12 spawns mix nine endemic and three common threats", () => {
  for (const planet of ecology.ECOLOGY_V8_PLANETS) {
    const opening = encounters
      .createEcologyEncounterDeck(planet.missionId, 1)
      .slice(0, 12);
    assert.equal(opening.filter(({ distribution }) => distribution === "endemic").length, 9);
    assert.equal(opening.filter(({ distribution }) => distribution === "common").length, 3);
  }
});

test("different run seeds rotate every endemic species into the opening hunt", () => {
  for (const planet of ecology.ECOLOGY_V8_PLANETS) {
    const seen = new Set();
    for (let seed = 0; seed < 80; seed += 1) {
      for (const enemy of encounters
        .createEcologyEncounterDeck(planet.missionId, seed)
        .slice(0, 12)) {
        seen.add(enemy.id);
      }
    }
    const bossId = ecology.ECOLOGY_V8_BOSS_ENEMY_IDS[planet.missionId] ?? null;
    for (const id of planet.endemicEnemyIds.filter((id) => id !== bossId)) {
      assert.ok(seen.has(id), `${planet.id}: ${id}`);
    }
    if (bossId) assert.ok(!seen.has(bossId), `${planet.id}: reserved boss`);
    for (const id of planet.commonEnemyIds) assert.ok(seen.has(id), `${planet.id}: ${id}`);
  }
});

test("persisted mission attempts expose every ordinary species within real wave limits", () => {
  for (const planet of ecology.ECOLOGY_V8_PLANETS) {
    const seen = new Set();
    const plannedSpawnCount = PLANNED_SPAWN_COUNTS[planet.missionId];
    const attemptsNeeded = plannedSpawnCount === 9 ? 4 : 3;
    for (let attempt = 0; attempt < attemptsNeeded; attempt += 1) {
      for (const enemy of encounters
        .createEcologyEncounterDeck(
          planet.missionId,
          attempt,
          plannedSpawnCount,
        )
        .slice(0, plannedSpawnCount)) {
        seen.add(enemy.id);
      }
    }
    const bossId = ecology.ECOLOGY_V8_BOSS_ENEMY_IDS[planet.missionId] ?? null;
    const ordinaryIds = [
      ...planet.endemicEnemyIds.filter((id) => id !== bossId),
      ...planet.commonEnemyIds,
    ];
    for (const id of ordinaryIds) assert.ok(seen.has(id), `${planet.id}: ${id}`);
  }
});

test("the two nine-spawn hunts rotate through all six common species", () => {
  for (const missionId of ["jungle-vey", "ice-cryostalker"]) {
    const seenCommon = new Set();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      for (const enemy of encounters
        .createEcologyEncounterDeck(missionId, attempt, 9)
        .slice(0, 9)) {
        if (enemy.distribution === "common") seenCommon.add(enemy.id);
      }
    }
    assert.equal(seenCommon.size, 6, missionId);
  }
});

test("runtime profiles cover all 198 identities", () => {
  for (const enemy of ecology.ECOLOGY_V8_ENEMIES) {
    const profile = encounters.ecologyV8RuntimeProfile(enemy);
    assert.ok(["human", "beast", "yautja"].includes(profile.kind), enemy.id);
    assert.ok(profile.width >= 60 && profile.width <= 130, enemy.id);
    assert.ok(profile.height >= 70 && profile.height <= 140, enemy.id);
    assert.ok(profile.animationFps >= 5 && profile.animationFps <= 10, enemy.id);
    assert.ok(["ground", "flying", "stationary", "burrowing"].includes(profile.mobility), enemy.id);
    assert.ok(["melee", "ranged"].includes(profile.attackStyle), enemy.id);
    assert.ok(profile.healthScale >= 0.8 && profile.healthScale <= 1.25, enemy.id);
    assert.ok(profile.damageScale >= 0.8 && profile.damageScale <= 1.15, enemy.id);
  }
});

test("ancient and desert guardians use articulated machine combat AI", () => {
  for (const enemyId of [
    "serekh-9--desert-temple-guardian",
    "acheron-sigma--ancient-guardian",
  ]) {
    const enemy = ecology.ecologyV8EnemyForId(enemyId);
    assert.ok(enemy, enemyId);
    assert.equal(encounters.ecologyV8RuntimeProfile(enemy).kind, "human", enemyId);
  }
});

test("the travelling xenomorph drone never inherits machine gunner AI", () => {
  const xeno = ecology.ecologyV8EnemyForId("common--wandering-xeno-drone");
  assert.ok(xeno);
  assert.equal(encounters.ecologyV8RuntimeProfile(xeno).kind, "beast");
});

test("ecological roles drive distinct mobility and attack profiles", () => {
  const expected = new Map([
    ["oseris-iv--canopy-razorwing", ["flying", "melee"]],
    ["oseris-iv--root-burrower", ["burrowing", "melee"]],
    ["oseris-iv--carnivore-vine", ["stationary", "melee"]],
    ["oseris-iv--walking-mangrove", ["ground", "melee"]],
    ["oseris-iv--canopy-sniper", ["ground", "ranged"]],
    ["cinder-12--bad-blood-plasma-gunner", ["ground", "ranged"]],
  ]);
  for (const [enemyId, [mobility, attackStyle]] of expected) {
    const enemy = ecology.ecologyV8EnemyForId(enemyId);
    assert.ok(enemy, enemyId);
    const profile = encounters.ecologyV8RuntimeProfile(enemy);
    assert.equal(profile.mobility, mobility, enemyId);
    assert.equal(profile.attackStyle, attackStyle, enemyId);
  }
});

test("semantic markers match complete words instead of accidental substrings", () => {
  const expected = new Map([
    ["common--interplanetary-scavenger", ["ground", "melee"]],
    ["common--spore-tick", ["ground", "melee"]],
    ["oseris-iv--amber-jaw-stalker", ["ground", "melee"]],
    ["oseris-iv--drumcrest-herdling", ["ground", "melee"]],
    ["oseris-iv--strangler-fig", ["ground", "melee"]],
    ["oseris-iv--dart-pod", ["stationary", "ranged"]],
  ]);

  for (const [enemyId, [mobility, attackStyle]] of expected) {
    const enemy = ecology.ecologyV8EnemyForId(enemyId);
    assert.ok(enemy, enemyId);
    const profile = encounters.ecologyV8RuntimeProfile(enemy);
    assert.equal(profile.mobility, mobility, enemyId);
    assert.equal(profile.attackStyle, attackStyle, enemyId);
  }
});
