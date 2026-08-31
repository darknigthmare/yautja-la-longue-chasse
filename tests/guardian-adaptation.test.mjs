import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { build } from "esbuild";
const explorationBundle = await build({ stdin: { contents: 'export * from "./app/game/systems/explorationProgress"; export * from "./app/game/systems/metroidvaniaPilot"; export * from "./app/game/systems/explorationRegions"; export * from "./app/game/systems/jumpAssist"; export * from "./app/game/systems/platformCollision"; export {worldBlueprintFor} from "./app/game/systems/worldBlueprints";', resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, platform: "node", format: "cjs" });
const explorationModule = { exports: {} };
runInNewContext(explorationBundle.outputFiles[0].text, { module: explorationModule, exports: explorationModule.exports });

const systemsSource = await readFile(new URL("../app/game/systems/huntSystems.ts", import.meta.url), "utf8");
const systemsCode = ts.transpileModule(systemsSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const hunt = await import(`data:text/javascript;base64,${Buffer.from(systemsCode).toString("base64")}`);
const canvasSource = await readFile(new URL("../app/game/HuntCanvas.tsx", import.meta.url), "utf8");
const canvasAst = ts.createSourceFile("HuntCanvas.tsx", canvasSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function canvasFunction(name, dependencies) {
  const node = canvasAst.statements.find((candidate) => ts.isFunctionDeclaration(candidate) && candidate.name?.text === name);
  assert.ok(node, `${name}: missing Canvas integration`);
  const code = ts.transpileModule(node.getText(canvasAst), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return runInNewContext(`${code}\n${name};`, dependencies);
}
const input = (changes = {}) => ({
  deltaSeconds: 0.1, elapsedSeconds: 1, healthRatio: 0.9,
  distanceToPlayer: 300, lineOfSight: true, playerCloaked: false,
  playerOnHighGround: false, playerUsedRangedWeapon: false,
  playerUsedEnergyWeapon: false, bossHitPillar: false,
  disabledConsoleId: null, activeSupportCount: 0, ...changes,
});
const fresh = () => hunt.createBossMechanicState("ruins-ancient-guardian");
const advance = (state, changes = {}) => hunt.stepBossMechanics(state, input(changes));
const shot = (state, changes = {}) => advance(state, {
  playerUsedRangedWeapon: true, playerUsedEnergyWeapon: true, ...changes,
});
function warning() {
  let state = fresh();
  for (let index = 0; index < 3; index += 1) state = shot(state).state;
  return state;
}
function field() {
  return advance(warning(), { deltaSeconds: hunt.GUARDIAN_ADAPTATION.warningSeconds }).state;
}
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

test("three observed energy discharges start a warning before any field or resource lock", () => {
  let state = fresh();
  for (let count = 1; count <= 2; count += 1) {
    const step = shot(state);
    assert.equal(step.state.guardianAdaptation.energyUses, count);
    assert.equal(step.decision.energyWeaponsLocked, false);
    assert.equal(step.effects.length, 0);
    state = advance(step.state).state;
    assert.equal(state.guardianAdaptation.energyUses, count, "idle frame is not another shot");
  }
  const third = shot(state);
  assert.equal(third.state.guardianAdaptation.warningSeconds, 1.6);
  assert.equal(third.state.guardianAdaptation.fieldSeconds, 0);
  assert.equal(third.decision.energyWeaponsLocked, false);
  assert.equal(third.decision.attackId, null);
  assert.equal(third.decision.movement, "hold");
  assert.deepEqual(third.effects.map(({ kind }) => kind), ["guardian-adaptive-warning"]);
});

test("hidden, cloaked and distant energy shots are not counted; observation memory expires", () => {
  for (const hidden of [{ lineOfSight: false }, { playerCloaked: true }, { distanceToPlayer: 721 }]) {
    let state = fresh();
    for (let index = 0; index < 4; index += 1) state = shot(state, hidden).state;
    assert.equal(state.guardianAdaptation.energyUses, 0);
    assert.equal(state.guardianAdaptation.warningSeconds, 0);
  }
  let state = shot(shot(fresh()).state).state;
  state = advance(state, { deltaSeconds: 8.1 }).state;
  assert.equal(state.guardianAdaptation.energyUses, 0);
  assert.equal(shot(state).state.guardianAdaptation.energyUses, 1);
});

test("an observed kinetic shot interrupts energy repetition", () => {
  const state = shot(shot(fresh()).state).state;
  const varied = advance(state, { playerUsedRangedWeapon: true });
  assert.equal(varied.state.guardianAdaptation.energyUses, 0);
  assert.equal(shot(varied.state).state.guardianAdaptation.warningSeconds, 0);
});

test("the warned field persists beyond one tick then expires without renewal", () => {
  const prepared = warning();
  const early = advance(prepared, { deltaSeconds: 1 });
  assert.equal(early.decision.energyWeaponsLocked, false);
  assert.ok(early.state.guardianAdaptation.warningSeconds > 0);
  const activated = advance(early.state, { deltaSeconds: 0.61 });
  assert.equal(activated.decision.energyWeaponsLocked, true);
  assert.deepEqual(activated.effects.map(({ kind }) => kind), ["guardian-adaptive-field"]);
  const next = advance(activated.state, { deltaSeconds: 0.2, healthRatio: 0.2, playerUsedEnergyWeapon: true });
  assert.equal(next.decision.energyWeaponsLocked, true, "no next-tick reset");
  assert.ok(next.state.guardianAdaptation.fieldSeconds < activated.state.guardianAdaptation.fieldSeconds);
  assert.equal(next.effects.length, 0, "phase changes and injected shots cannot renew an active field");
  const expired = advance(next.state, { deltaSeconds: 4.5 });
  assert.equal(expired.decision.energyWeaponsLocked, false);
  assert.equal(expired.state.guardianAdaptation.fieldSeconds, 0);
});

for (const [name, escape] of Object.entries({
  cover: { lineOfSight: false }, cloak: { playerCloaked: true }, range: { distanceToPlayer: 730 },
})) {
  test(`${name} cancels the warning before any field activates`, () => {
    const escaped = advance(warning(), escape);
    assert.equal(escaped.state.guardianAdaptation.warningSeconds, 0);
    assert.equal(escaped.decision.energyWeaponsLocked, false);
    assert.deepEqual(escaped.effects.map(({ kind }) => kind), ["guardian-adaptive-evaded"]);
    const returned = advance(escaped.state);
    assert.equal(returned.effects.length, 0);
    assert.equal(returned.state.guardianAdaptation.fieldSeconds, 0);
  });
}

test("cover or range releases energy weapons while a running field keeps its original deadline", () => {
  const active = field();
  const escaped = advance(active, { lineOfSight: false });
  assert.equal(escaped.decision.energyWeaponsLocked, false);
  assert.ok(escaped.state.guardianAdaptation.fieldSeconds > 0);
  const returned = advance(escaped.state);
  assert.equal(returned.decision.energyWeaponsLocked, true);
  assert.ok(returned.state.guardianAdaptation.fieldSeconds < active.guardianAdaptation.fieldSeconds);
});

test("legacy checkpoints initialize adaptation safely and new checkpoints resume the exact timer", () => {
  const legacy = fresh();
  delete legacy.guardianAdaptation;
  assert.equal(shot(legacy).state.guardianAdaptation.energyUses, 1);
  const saved = advance(field(), { deltaSeconds: 0.4 }).state;
  const restored = JSON.parse(JSON.stringify(saved));
  assert.deepEqual(advance(restored), advance(saved));
  const clone = canvasFunction("cloneBossMechanics", {})(saved);
  clone.guardianAdaptation.fieldSeconds = 0;
  assert.ok(saved.guardianAdaptation.fieldSeconds > 0, "checkpoint cloning does not alias the live timer");
});

test("restoring an old dead-boss checkpoint releases its stale energy lock", () => {
  const clone = (value) => structuredClone(value);
  const restore = canvasFunction("restoreCheckpoint", {
    ...explorationModule.exports,
    clonePlayerState: clone, cloneEnemyState: clone, cloneAiBrains: clone,
    cloneProjectileState: clone, cloneArsenalRuntime: clone, cloneTrophyRitual: clone,
    cloneBossMechanics: canvasFunction("cloneBossMechanics", {}),
    clamp, VIEW_WIDTH: 1280, getWorldScreenAtX: () => ({ id: "arena" }),
    normalizeVisitedScreenIds: (_missionId, ids) => ids,
    discoverWorldScreen: (_missionId, ids) => ids,
  });
  const checkpoint = {
    player: { x: 1000, y: 508, height: 116, width: 72, health: 80, maxHealth: 100, stamina: 90,
      maxStamina: 100, energy: 40, maxEnergy: 100, cloaked: false },
    phase: "trophy", elapsed: 300, boss: { alive: false, health: 0 },
    bossMechanics: { ...fresh(), guardianAdaptation: undefined },
    energyWeaponsLocked: true, aiBrains: {}, mud: {}, arsenal: {}, trophyRitual: null,
    enemies: [], projectiles: [], scentNodes: [], noiseEvents: [], tracks: [],
    scanNodes: [], recoveryNodes: [], purgeConsoleNodes: [], regularTrophyDrops: [],
    spawnedWaves: [], completedObjectives: [], honorEvents: [], brokenPillarIds: [], traps: [],
  };
  const state = { player: clone(checkpoint.player), nextCheckpointIndex: 1,
    world: { width: 5000, missionId: "ruins-ancient-guardian" } };
  for (const mode of ["resume", "retry"]) {
    const restored = restore(state, checkpoint, mode);
    assert.equal(restored.energyWeaponsLocked, false, `${mode}: no permanent postmortem lock`);
    assert.equal(restored.boss.alive, false);
  }
  assert.equal(checkpoint.energyWeaponsLocked, true, "normalization does not mutate the saved input");
  const living = { ...checkpoint, boss: { alive: true, health: 30 }, bossMechanics: field() };
  assert.equal(restore(state, living, "resume").energyWeaponsLocked, true,
    "an actual living-boss field survives restoration until the next decision");
});

function weaponRuntime(energyCost = 12) {
  const weaponId = energyCost > 0 ? "plasma-caster" : "yautja-bow";
  const fire = canvasFunction("playerWeapon", {
    equippedWeapon: () => ({ id: weaponId, attackType: "ranged", color: "#fff" }),
    effectiveWeaponStats: () => ({ id: weaponId, ammo: 12 }),
    resolveHunterWeaponAttack: () => ({
      energyCost, staminaCost: 0, ammoCost: energyCost > 0 ? 0 : 1,
      cooldownSeconds: 0.5, projectileSpeedPx: 650, projectileRadius: 5,
      damage: 20, recovery: "none", rangePx: 800, maxTargetHits: 1,
      chargeRatio: 0, noiseLoudness: 1, noiseRadius: 600,
    }),
    solvePlayerRigFrame: () => ({ anchors: { muzzle: { x: 0, y: 0 }, handGrip: { x: 0, y: 0 } } }),
    forceDecloak: (state) => { state.player.cloaked = false; },
    queueSound() {}, emitNoise() {}, announce() {},
  });
  const state = {
    phase: "target", energyWeaponsLocked: false, nextProjectileId: 1, projectiles: [],
    playerUsedEnergyWeapon: false, playerUsedRangedWeapon: false,
    player: { activeWeaponSlot: 0, weaponCooldown: 0, weaponChargeSeconds: 0,
      energy: 100, stamina: 100, weaponAmmo: [12, 12], aimAngle: 0 },
  };
  return { state, fire: () => fire(state, { id: "ruins-ancient-guardian" }, {}, { weaponUpgrades: {} }) };
}

test("actual accepted Canvas energy shots drive the counter while blocked attempts consume nothing", () => {
  const runtime = weaponRuntime();
  let boss = fresh();
  for (let count = 0; count < 3; count += 1) {
    runtime.state.player.weaponCooldown = 0;
    runtime.state.playerUsedEnergyWeapon = false;
    runtime.state.playerUsedRangedWeapon = false;
    runtime.fire();
    boss = advance(boss, {
      playerUsedEnergyWeapon: runtime.state.playerUsedEnergyWeapon,
      playerUsedRangedWeapon: runtime.state.playerUsedRangedWeapon,
    }).state;
  }
  assert.equal(runtime.state.projectiles.length, 3);
  assert.equal(boss.guardianAdaptation.warningSeconds, 1.6);
  runtime.state.energyWeaponsLocked = true;
  runtime.state.player.weaponCooldown = 0;
  runtime.state.playerUsedEnergyWeapon = false;
  runtime.state.playerUsedRangedWeapon = false;
  const energy = runtime.state.player.energy;
  runtime.fire();
  assert.equal(runtime.state.player.energy, energy);
  assert.equal(runtime.state.projectiles.length, 3);
  assert.equal(runtime.state.playerUsedEnergyWeapon, false);
  const kinetic = weaponRuntime(0);
  kinetic.state.energyWeaponsLocked = true;
  kinetic.fire();
  assert.equal(kinetic.state.projectiles.length, 1, "kinetic fire remains available under the lock");
  assert.equal(kinetic.state.playerUsedEnergyWeapon, false);
});

test("Canvas keeps the timed lock and only neutralizes exposed nearby plasma", () => {
  const messages = [];
  const update = canvasFunction("updateBoss", {
    DIFFICULTY_BY_ID: { hunter: { enemyDamageMultiplier: 1 } },
    GUARDIAN_ADAPTATION: hunt.GUARDIAN_ADAPTATION,
    stepBossMechanics: hunt.stepBossMechanics,
    calculateLineOfSightOcclusion: hunt.calculateLineOfSightOcclusion,
    distance, clamp, announce: (_state, message) => messages.push(message),
    emitEnemyFootprint() {},
  });
  const state = {
    elapsed: 10, playerUsedRangedWeapon: false, playerUsedEnergyWeapon: false,
    bossMechanics: { ...warning(), guardianAdaptation: { ...warning().guardianAdaptation, warningSeconds: 0.1 } },
    boss: { active: true, alive: true, health: 90, maxHealth: 100, restrainedUntil: 0,
      x: 0, y: 100, width: 80, height: 100, velocityX: 0, telegraph: 0,
      pendingAttackId: null, hitFlash: 0, moveSpeed: 100, patrolLeft: 0, patrolRight: 2000 },
    player: { x: 300, y: 100, width: 72, height: 116, cloaked: false, energy: 100, weaponCooldown: 0 },
    enemies: [], brokenPillarIds: new Set(), world: { covers: [], floorY: 216 },
    projectiles: [
      { id: "plasma", weaponId: "plasma-caster", hostile: false, x: 120, y: 130 },
      { id: "far-plasma", weaponId: "plasma-caster", hostile: false, x: 1500, y: 130 },
      { id: "arrow", weaponId: "yautja-bow", hostile: false, x: 120, y: 130 },
      { id: "disc", weaponId: "smart-disc", hostile: false, x: 120, y: 130 },
      { id: "hostile", hostile: true, x: 120, y: 130 },
    ],
  };
  const mission = { id: "ruins-ancient-guardian", boss: { attacks: [] } };
  update(state, mission, "hunter", 0.1);
  assert.equal(state.energyWeaponsLocked, true);
  assert.deepEqual(state.projectiles.map(({ id }) => id), ["far-plasma", "arrow", "disc", "hostile"]);
  assert.equal(state.player.energy, 76);
  assert.equal(state.player.weaponCooldown, 0, "field does not also lock kinetic attacks");
  update(state, mission, "hunter", 0.1);
  assert.equal(state.energyWeaponsLocked, true);
  assert.equal(state.player.energy, 76, "activation drain occurs only once");
  assert.match(messages[0], /armes cinétiques/);
});
