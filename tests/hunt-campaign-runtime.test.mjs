import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const source = await readFile(new URL("../app/game/HuntCanvas.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("HuntCanvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

// Execute the actual private Canvas functions without mounting React or copying
// their implementation into a test helper. Effects below are observation spies;
// harvest eligibility, source validation and structural collision stay native.
function runtimeFunction(name, dependencies = {}) {
  const declaration = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration, `${name}: runtime function missing`);
  const code = ts.transpileModule(declaration.getText(ast), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return runInNewContext(`${code}\n${name};`, dependencies);
}

const harvestBuild = await build({
  stdin: { contents: 'export * from "./systems/trophyHarvestV111"; export * from "./systems/anatomyHarvestV112";',
    resolveDir: fileURLToPath(new URL("../app/game/", import.meta.url)), loader: "ts" },
  bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent",
});
const harvest = await import("data:text/javascript;base64," + Buffer.from(harvestBuild.outputFiles[0].text).toString("base64"));

function trophyRuntime(effects) {
  const activeTrophyHarvestTargetV111 = runtimeFunction("activeTrophyHarvestTargetV111", { ...harvest });
  const canContinueTrophyHarvestV111 = runtimeFunction("canContinueTrophyHarvestV111", {
    activeTrophyHarvestTargetV111, trophyHarvestInReach: harvest.trophyHarvestInReach,
  });
  const interruptTrophyHarvestV111 = runtimeFunction("interruptTrophyHarvestV111", effects);
  return runtimeFunction("finishTrophyExtraction", {
    ...harvest, ...effects, canContinueTrophyHarvestV111, interruptTrophyHarvestV111,
  });
}

// A completed rite beside its real defeated target, with the hunter standing
// on support. These are the same physical preconditions required by the game.
function completedApexFixture() {
  return {
    phase: "trophy", trophyExtracting: true, trophyRitual: { status: "complete" },
    regularTrophyDropId: null, regularTrophyDrops: [], trophyClaim: null,
    bossDefeatedAt: 10, elapsed: 11, secondWindUsed: false,
    player: { x: 100, y: 0, width: 40, height: 80, grounded: true, climbing: false,
      health: 100, maxHealth: 100 },
    boss: enemy("boss", { boss: true, alive: false, health: 0, height: 80 }),
    world: { floorY: 200, platforms: [{ id: "claim-support", x: 0, y: 80, width: 400, height: 20, collision: "solid" }] },
  };
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const enemy = (id, overrides = {}) => ({ id, alive: true, active: true, scanned: false, x: 100, y: 0, width: 40, height: 40, ...overrides });

for (const sensor of ["playerScan", "revealWithinEffect"]) {
  test(`${sensor} detects present prey but never delayed spawns or dead prey`, () => {
    const scan = runtimeFunction(sensor, {
      distance, queueSound() {}, addHonor() {}, announce() {},
      honorRuleEventId: (rule) => rule.id,
    });
    const prey = [enemy("present"), enemy("delayed", { active: false }), enemy("dead", { alive: false }), enemy("far", { x: 900 })];
    const state = {
      player: { x: 0, y: 0, width: 40, height: 40, scanCooldown: 0, energy: 100 },
      enemies: prey, boss: enemy("boss", { boss: true, active: false }),
      scanNodes: [{ id: "trace", x: 180, y: 0, scanned: false }], scans: 0,
    };
    if (sensor === "playerScan") {
      scan(state, { honorRules: [] });
      assert.equal(state.player.energy, 92);
    } else {
      assert.equal(scan(state, { origin: { x: 20, y: 20 }, radiusPx: 470 }), 2);
    }
    assert.deepEqual(prey.map(({ scanned }) => scanned), [true, false, false, false]);
    assert.equal(state.boss.scanned, false);
    assert.equal(state.scanNodes[0].scanned, true);
    assert.equal(state.scans, 2);
  });
}

for (const partId of ["insignia", "mask", "skull", "skull-and-spine"]) {
  test(`claiming ${partId} preserves its identity and only anatomical claims produce harvest gore`, () => {
    const gore = [];
    const messages = [];
    const finish = trophyRuntime({
      uniqueTrophyClaimId: () => "claim-id",
      createTrophyVictory: () => ({ complete: false }),
      createDropShipArrival: () => ({ phase: "approach" }),
      spawnExtractionThreat() {}, queueSound() {}, addHonor() {},
      spawnGore: (...args) => gore.push(args),
      announce: (_state, message) => messages.push(message),
    });
    const state = completedApexFixture();
    const mission = {
      targetName: "Exact target", targetKind: "beast",
      boss: { trophyWindowSeconds: 16 },
      trophy: { id: "exact-definition", name: "Exact claim", partId },
    };
    finish(state, mission);
    assert.equal(state.trophyClaim.definitionId, mission.trophy.id);
    assert.equal(state.trophyClaim.partId, partId);
    assert.equal(state.trophyClaim.id, "claim-id");
    assert.equal(state.trophyClaim.quality, "flawless");
    assert.equal(state.trophyClaimedAt, state.elapsed);
    assert.equal(state.phase, "extraction");
    assert.equal(gore.length, partId === "mask" || partId === "insignia" ? 0 : 1);
    if (gore.length) {
      assert.equal(gore[0][1], state.boss, "only the real target supplies anatomical harvest effects");
      assert.equal(gore[0][2], "trophy");
    }
    assert.match(messages[0], /Exact claim/);
    assert.doesNotMatch(messages[0], /arraché/);
  });
}

for (const [reason, alter] of [
  ["unfinished rite", state => { state.trophyRitual.status = "active"; }],
  ["lost footing", state => { state.player.grounded = false; }],
  ["climbing", state => { state.player.climbing = true; }],
  ["living target", state => { state.boss.alive = true; state.boss.health = 1; }],
  ["inactive target", state => { state.boss.active = false; }],
  ["target out of reach", state => { state.boss.x += 300; }],
  ["solid separation", state => {
    state.boss.x = 180;
    state.world.platforms.push({ x: 150, y: -50, width: 8, height: 200, collision: "solid" });
  }],
]) test(`campaign harvest refuses ${reason} before producing a claim or gore`, () => {
  const gore = [], rewards = [], messages = [];
  const finish = trophyRuntime({
    uniqueTrophyClaimId: () => assert.fail("refused collection cannot create an identity"),
    createTrophyVictory: () => assert.fail("refused collection cannot start victory"),
    createDropShipArrival: () => assert.fail("refused collection cannot call extraction"),
    spawnExtractionThreat: () => assert.fail("refused collection cannot spawn extraction threats"),
    queueSound() {}, addHonor: (...args) => rewards.push(args),
    spawnGore: (...args) => gore.push(args), announce: (_state, message) => messages.push(message),
  });
  const state = completedApexFixture();
  alter(state);
  finish(state, {
    targetName: "Exact target", targetKind: "beast", boss: { trophyWindowSeconds: 16 },
    trophy: { id: "exact-definition", name: "Exact claim", partId: "skull-and-spine" },
  });
  assert.equal(state.trophyClaim, null);
  assert.equal(state.trophyExtracting, false);
  assert.equal(state.trophyRitual, null);
  assert.equal(state.phase, "trophy");
  assert.equal(gore.length, 0);
  assert.equal(rewards.length, 0);
  assert.match(messages[0], /Prélèvement interrompu/);
});

test("the exact campaign image takes priority over a generic skull or V6 symbol during harvest and carry", () => {
  const image = { name: "mycelial-core" };
  const visual = { definitionId: "core", validation: { bounds: [10, 20, 209, 119] } };
  const calls = [];
  const draw = runtimeFunction("drawNamedTrophyAtAnchor", {
    trophyHuntVisualForDefinitionId: (id) => id === "core" ? visual : null,
    resolveV6TrophyVisualId: () => assert.fail("exact image must win"),
  });
  const context = {
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
    drawImage: (...args) => calls.push(args),
  };
  const drawn = draw(context, { campaignTrophies: { core: image } },
    { definitionId: "core", partId: "skull" }, { x: 25, y: 35 }, 1, 1, 0);
  assert.equal(drawn, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], image);
  assert.deepEqual(calls[0].slice(1, 5), [10, 20, 200, 100]);
  assert.equal(calls[0][7] / calls[0][8], 2, "cutout aspect ratio preserved");
  assert.ok(calls[0][7] <= 185 && calls[0][8] <= 185, "claimed object fits the hand scale");
});
