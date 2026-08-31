import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { build } from "esbuild";
import { isBoundedJsonValue } from "../app/game/systems/activeHuntSave.ts";

const bundle = await build({ stdin: { contents: 'export * from "./app/game/systems/explorationMap"; export {worldScreensFor,getWorldScreenAtX} from "./app/game/worldScreens";', resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "cjs", platform: "node" });
const compiled = { exports: {} };
runInNewContext(bundle.outputFiles[0].text, { module: compiled, exports: compiled.exports });
const world = compiled.exports;
const source = await readFile(new URL("../app/game/HuntCanvas.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("HuntCanvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ["clonePlayerState", "cloneEnemyState", "cloneProjectileState", "cloneTrophyRitual", "cloneAiBrains", "cloneBossMechanics", "cloneArsenalRuntime", "captureCheckpoint", "isJsonObject", "isFiniteJsonNumber", "isStringArray", "hasFiniteFields", "isValidSerializedHuntActor", "isValidSerializedHuntProjectile", "activeHuntSnapshotChecksum", "isValidSerializedAiBrains", "isValidSerializedArsenal", "serializeActiveHuntCheckpoint", "deserializeActiveHuntCheckpoint", "restoreCheckpoint"];
function codeFor(names) {
  return names.map(name => { const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name); assert.ok(declaration, name); return declaration.getText(ast); }).join("\n");
}
function runtime(names, dependencies) {
  const code = ts.transpileModule(codeFor(names), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  return runInNewContext(`${code}\n({${names.join(",")}})`, dependencies);
}
// The VM and host have different Object prototypes; bridge only JSON data to
// the real bounded-value validator, as the app does within its single realm.
const environment = { ...world, isBoundedJsonValue: value => isBoundedJsonValue(JSON.parse(JSON.stringify(value))), ACTIVE_HUNT_SNAPSHOT_VERSION: 1, ACTIVE_HUNT_PHASES: new Set(["tracking", "target", "trophy", "extraction"]), VIEW_WIDTH: 1280, clamp: (n, min, max) => Math.max(min, Math.min(max, n)) };
const api = runtime(names, environment);
const plain = value => JSON.parse(JSON.stringify(value));
const missionId = "jungle-vey";
const rooms = world.worldScreensFor(missionId).screens;
function fixture() {
  const player = Object.fromEntries(["previousY", "velocityX", "velocityY", "medicomps", "activeWeaponSlot", "aimAngle", "gauntletOpen", "bladeExtension", "attackFlash", "invulnerability", "meleeCooldown", "weaponCooldown", "weaponChargeSeconds", "scanCooldown", "healCooldown"].map(key => [key, 0]));
  Object.assign(player, { x: rooms[2].startX + 100, y: 400, width: 72, height: 116, health: 80, maxHealth: 100, stamina: 80, maxStamina: 100, energy: 50, maxEnergy: 100, facing: 1, grounded: true, cloaked: false, maskOn: true, aiming: false, climbing: false, aimPoint: { x: 100, y: 100 }, weaponAmmo: [6, -1], dreadAngles: [], dreadVelocities: [] });
  const state = Object.fromEntries(["ecologySpawnIndex", "honor", "kills", "scans", "supportKills", "damageTaken", "trophyExtraction", "nextProjectileId", "nextSignalId"].map(key => [key, 0]));
  Object.assign(state, { phase: "tracking", elapsed: 120, player, visitedScreenIds: [rooms[0].id, rooms[2].id], world: { width: 8400, missionId }, nextCheckpointIndex: 1, bossVulnerabilityMultiplier: 1, bossThermalVisibility: 1, boss: { x: 7400, y: 400, width: 120, height: 150, health: 300, maxHealth: 300, alive: true, active: false }, bossMechanics: { missionId }, aiBrains: {}, mud: {}, arsenal: { slots: [{}, {}], activeEffects: [] }, trophyRitual: null, trophyClaim: null, trophyVictory: null, dropShip: null });
  for (const key of ["enemies", "projectiles", "scentNodes", "noiseEvents", "tracks", "scanNodes", "recoveryNodes", "purgeConsoleNodes", "regularTrophyDrops", "honorEvents", "traps"]) state[key] = [];
  for (const key of ["spawnedWaves", "completedObjectives", "brokenPillarIds"]) state[key] = new Set();
  for (const key of ["secondWindUsed", "energyWeaponsLocked", "bossHitPillar", "playerUsedRangedWeapon", "playerUsedEnergyWeapon", "trophyExtracting", "trophyCarried", "rangedBossViolation"]) state[key] = false;
  return state;
}

test("checkpoint captures detached discovery and saves/restores it through the real checksum schema", () => {
  const state = fixture();
  const checkpoint = api.captureCheckpoint(state, "resume");
  state.visitedScreenIds.push(rooms[4].id);
  assert.deepEqual(plain(checkpoint.visitedScreenIds), [rooms[0].id, rooms[2].id]);
  const envelope = api.serializeActiveHuntCheckpoint(checkpoint, 1);
  assert.ok(envelope);
  const decoded = api.deserializeActiveHuntCheckpoint(envelope);
  assert.ok(decoded);
  const restored = api.restoreCheckpoint(state, decoded.checkpoint, "resume");
  assert.deepEqual(plain(restored.visitedScreenIds), [rooms[0].id, rooms[2].id]);
  assert.equal(restored.paused, true);
});

test("legacy checkpoints reveal only their actual room and foreign ids never enter the map", () => {
  const state = fixture();
  const checkpoint = api.captureCheckpoint(state, "resume");
  delete checkpoint.visitedScreenIds;
  assert.ok(api.deserializeActiveHuntCheckpoint(api.serializeActiveHuntCheckpoint(checkpoint, 1)));
  const legacy = api.restoreCheckpoint(state, checkpoint, "resume");
  assert.deepEqual(plain(legacy.visitedScreenIds), [rooms[2].id]);
  checkpoint.visitedScreenIds = ["ice-foreign", rooms[0].id, rooms[0].id];
  assert.deepEqual(plain(api.restoreCheckpoint(state, checkpoint, "resume").visitedScreenIds), [rooms[0].id, rooms[2].id]);
});

test("retry preserves knowledge found after the checkpoint without revealing skipped rooms", () => {
  const state = fixture();
  const checkpoint = api.captureCheckpoint(state);
  state.visitedScreenIds.push(rooms[5].id);
  const restored = api.restoreCheckpoint(state, checkpoint, "retry");
  assert.deepEqual(plain(restored.visitedScreenIds), [rooms[0].id, rooms[2].id, rooms[5].id]);
  assert.equal(restored.paused, false);
});

test("a newly entered sector is discovered before the checkpoint on the same simulation frame", () => {
  const state = fixture(); state.elapsed = 1; state.player.x = 100; state.visitedScreenIds = [rooms[0].id]; state.worldScreenId = rooms[0].id;
  Object.assign(state, { paused: false, messageTimer: 0, scanPulse: 0, screenShake: 0, cameraX: 0 });
  const captures = [];
  const noOp = () => {};
  const { stepGame } = runtime(["stepGame"], { ...environment, pollGamepad: () => null, consume: () => false, tickArsenalRuntime: value => value,
    updateRevealEffects: noOp, updatePlayer: game => { game.player.x = rooms[1].startX + 20; }, updateHuntTraps: noOp, updateHuntSignals: noOp, updateRegularEnemy: noOp, updateBoss: noOp, updateProjectiles: noOp, updateGoreParticles: noOp, updateObjectiveFlow: noOp, announce: noOp,
    updateMissionCheckpoint: game => captures.push(api.captureCheckpoint(game)),
  });
  stepGame(state, { id: missionId }, {}, {}, {}, "hunter", { pressed: new Set() }, 1 / 60, noOp);
  assert.deepEqual(plain(captures[0].visitedScreenIds), [rooms[0].id, rooms[1].id]);
});

test("checksum-valid but malformed combat snapshots are rejected before restoration", () => {
  const changes = [
    value => { value.player.health = 0; },
    value => { value.player.width = -72; },
    value => { value.player.energy = -1; },
    value => { value.boss.height = 0; },
    value => { value.enemies = [null]; },
    value => { value.enemies = [{}]; },
    value => { value.projectiles = [{ x: 0, y: 0, velocityX: 1, velocityY: 0, radius: -2, damage: 1, life: 1, coverGraceSeconds: 0, hostile: true }]; },
    value => { value.tracks = [null]; },
    value => { value.visitedScreenIds = [123]; },
  ];
  for (const change of changes) {
    const checkpoint = api.captureCheckpoint(fixture(), "resume"); change(checkpoint);
    const envelope = api.serializeActiveHuntCheckpoint(checkpoint, 1);
    assert.ok(envelope, "the bounded JSON envelope alone cannot validate combat semantics");
    assert.equal(api.deserializeActiveHuntCheckpoint(envelope), null);
  }
});
