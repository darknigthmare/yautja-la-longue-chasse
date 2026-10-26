import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { build } from "esbuild";
import ts from "typescript";

const canvasUrl = new URL("../app/game/HuntCanvas.tsx", import.meta.url);
const source = await readFile(canvasUrl, "utf8");
const ast = ts.createSourceFile("HuntCanvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
// Export the actual production simulation and handler dependencies only inside
// this in-memory bundle. Actor creation, damage, physics and rites stay native.
const bundled = await build({
  stdin: {
    contents: `${source.replace("export default function HuntCanvas", "function HuntCanvas")}
export { makeGameState, makeEnemy, damageEnemy, hurtPlayer, interact, updatePlayer, updateBoss, updateRegularEnemy, stepGame, finishTrophyExtraction, syncSecondaryTrophyAnchorsV111, canContinueTrophyHarvestV111, captureCheckpoint, serializeActiveHuntCheckpoint, deserializeActiveHuntCheckpoint, restoreCheckpoint, updateHuntRitesV77, riteContextV77, huntRiteMenuSnapshotV77, startHuntRiteV77, announce, snapshot, stepTrophyRitual };
export { defaultSave } from "./save";
export { MISSION_BY_ID } from "./data";
export { ENEMY_TROPHY_GAMEPLAY_V18_ASSETS } from "./enemyTrophyGameplayV18";`,
    resolveDir: fileURLToPath(new URL("../app/game/", import.meta.url)),
    sourcefile: fileURLToPath(canvasUrl), loader: "tsx",
  },
  bundle: true, write: false, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".module.css": "empty" },
  external: ["react", "react/jsx-runtime", "react-dom"], logLevel: "silent",
});
const compiled = { exports: {} };
runInNewContext(bundled.outputFiles[0].text, {
  module: compiled, exports: compiled.exports, require: createRequire(import.meta.url),
  document: { hidden: false, hasFocus: () => true },
  navigator: { getGamepads: () => [] },
});
const r = compiled.exports;
const plain = value => JSON.parse(JSON.stringify(value));
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} expected ${expected}`);
const DT = 1 / 120;
const ledge = { id: "harvest-ledge", x: 1200, y: 400, width: 600, height: 24, collision: "solid", routeId: "ground", material: "stone", noiseMultiplier: 1, trackPersistence: 1 };

function fixture({ owned = false, secondary = true } = {}) {
  const save = r.defaultSave("2026-10-26T00:00:00.000Z");
  save.inventory.fieldToolIds = owned ? ["flaying-tool"] : [];
  const mission = r.MISSION_BY_ID["jungle-vey"];
  const state = r.makeGameState(mission, save.loadout, save.inventory, "hunter", save.appearance, false, false, "harvest-v111", save.exploration);
  state.world = { ...state.world, floorY: 624, platforms: [{ ...ledge }], climbables: [], hazards: [], covers: [] };
  state.enemies = [];
  state.recoveryNodes = [];
  Object.assign(state.player, { x: 1300, y: 400 - state.player.height, previousY: 400 - state.player.height,
    velocityX: 0, velocityY: 0, grounded: true, climbing: false, climbZoneId: null });
  const input = { keyboardHeld: new Set(), touchHeld: new Set(), gamepadHeld: new Set(), pressed: new Set(),
    previousGamepadButtons: [], activeGamepadIndex: null, gamepadNeedsNeutral: true, gamepadDialogActions: [], pointerScreen: null };
  const f = { state, save, mission, input };
  f.frame = (delta = DT) => {
    state.elapsed += delta;
    r.updatePlayer(state, mission, save.loadout, save.inventory, save.appearance, "hunter", input, delta, () => {});
  };
  f.riteFrame = (delta = DT) => { state.elapsed += delta; r.updateHuntRitesV77(state, delta); };
  if (secondary) {
    const asset = r.ENEMY_TROPHY_GAMEPLAY_V18_ASSETS.find(candidate => candidate.available && candidate.enemyIds.length);
    assert.ok(asset, "a genuine runtime trophy asset is available");
    const enemy = r.makeEnemy("harvest-prey", asset.enemyIds[0], mission.id, 1340, state.world.width, 80, 10, 0, 1, 1);
    Object.assign(enemy, { x: state.player.x + state.player.width / 2 + 40 - enemy.width / 2,
      y: 400 - enemy.height, knockbackRestY: 400 - enemy.height, scanned: true });
    state.enemies = [enemy];
    r.damageEnemy(state, mission, enemy, enemy.maxHealth + 1, "melee");
    assert.equal(enemy.alive, false);
    assert.equal(state.regularTrophyDrops.length, 1, "native damage produces one physical claim");
    assert.equal(state.huntRites.corpses.length, 1, "the same death produces one ritual corpse");
    f.enemy = enemy;
    f.drop = state.regularTrophyDrops[0];
  }
  return f;
}

function startHarvest(f) {
  r.interact(f.state, f.mission);
  assert.equal(f.state.trophyExtracting, true);
  assert.ok(f.state.trophyRitual);
  assert.equal(r.canContinueTrophyHarvestV111(f.state), true);
}

function completeHarvest(f) {
  let frames = 0;
  while (f.state.trophyExtracting && frames++ < 1200) {
    const ritual = f.state.trophyRitual;
    if (ritual.phase === "cue" && ritual.cueElapsedSeconds >= .48)
      f.input.pressed.add(ritual.sequence[ritual.cueIndex]);
    f.frame();
  }
  assert.ok(frames < 1200, "real input and physics finish the rhythm within its authored duration");
}

function riteHandler(f) {
  let arrow;
  const visit = node => {
    if (ts.isBinaryExpression(node) && node.left.getText(ast) === "riteMenuActionRef.current" &&
        ts.isArrowFunction(node.right) && node.right.parameters.length === 1) arrow = node.right;
    else ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(arrow, "the production menu action handler is present");
  const code = ts.transpileModule(`const handler = ${arrow.getText(ast)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return runInNewContext(`(() => { ${code}; return handler; })()`, {
    ...r, game: f.state, mission: f.mission, setUi() {}, emitPersistence() {},
    persistHuntRef: { current: undefined },
  });
}

test("a genuine canopy kill, input rite and collection keep one source and one claim", () => {
  const f = fixture();
  close(f.drop.y, 376);
  assert.notEqual(f.drop.y, f.state.world.floorY - 24);
  const id = f.drop.claim.id, honorBefore = f.state.honor;
  startHarvest(f);
  assert.equal(f.state.regularTrophyDropId, f.drop.id);
  completeHarvest(f);
  assert.equal(f.drop.collected, true);
  assert.equal(f.drop.claim.id, id);
  assert.equal(f.state.regularTrophyDrops.length, 1);
  assert.equal(f.state.honor, honorBefore + 2);
  assert.equal(f.state.phase, "tracking", "a secondary trophy does not finish the hunt");
  assert.equal(f.state.trophyCarried, false, "secondary collection cannot invent an Apex claim");
  r.finishTrophyExtraction(f.state, f.mission);
  r.interact(f.state, f.mission);
  assert.equal(f.state.honor, honorBefore + 2, "a second completion or interaction cannot duplicate the reward");
  assert.equal(f.state.regularTrophyDrops.filter(drop => drop.collected).length, 1);
});

test("an old floor anchor is refreshed from its real source before selection", () => {
  const f = fixture();
  f.drop.y = f.state.world.floorY - 24;
  startHarvest(f);
  close(f.drop.y, f.enemy.y + f.enemy.height - 24);
});

for (const [name, change] of [
  ["player leaves the corpse", f => { f.state.player.x += 300; }],
  ["player loses footing", f => { f.state.player.grounded = false; }],
  ["player catches a climbing support", f => { f.state.player.climbing = true; }],
  ["a solid wall separates the source", f => { f.state.world.platforms.push({ ...ledge, id: "blocking-wall", x: 1350, y: 0, width: 8, height: 624 }); }],
  ["source moves to another level", f => { f.enemy.y += 250; }],
  ["source is no longer defeated", f => { f.enemy.alive = true; f.enemy.health = 1; }],
  ["source becomes inactive", f => { f.enemy.active = false; }],
  ["claim no longer matches its source", f => { f.drop.claim.sourceEnemyId = "other-source"; }],
]) test(`native harvest interrupts without collection when ${name}`, () => {
  const f = fixture();
  startHarvest(f);
  const honorBefore = f.state.honor;
  change(f);
  f.frame();
  assert.equal(f.state.trophyExtracting, false);
  assert.equal(f.state.trophyRitual, null);
  assert.equal(f.state.regularTrophyDropId, null);
  assert.equal(f.drop.collected, false);
  assert.equal(f.state.honor, honorBefore);
});

test("real damage interrupts the active collection and preserves the uncollected source", () => {
  const f = fixture();
  startHarvest(f);
  r.hurtPlayer(f.state, 5, f.mission);
  assert.equal(f.state.trophyExtracting, false);
  assert.equal(f.drop.collected, false);
  assert.equal(f.state.regularTrophyDrops.length, 1);
  assert.equal(f.state.damageTaken, 5);
});

test("the final production collection rechecks its target after the last domain gesture", () => {
  const f = fixture();
  startHarvest(f);
  // Advance the actual domain to its final result, then exercise the production
  // commit separately: a source can disappear between gesture and admission.
  let ritual = f.state.trophyRitual;
  ritual = r.stepTrophyRitual(ritual, 1.8, null).state;
  for (const action of ritual.sequence) ritual = r.stepTrophyRitual(ritual, .5, action).state;
  assert.equal(ritual.status, "complete");
  f.state.trophyRitual = ritual;
  f.enemy.active = false;
  const honorBefore = f.state.honor;
  r.finishTrophyExtraction(f.state, f.mission);
  assert.equal(f.drop.collected, false);
  assert.equal(f.state.honor, honorBefore);
  assert.equal(f.state.trophyExtracting, false);
});

test("a real Apex death in the air falls onto its actual ledge and remains collectible there", () => {
  const f = fixture({ secondary: false }), boss = f.state.boss;
  Object.assign(boss, { active: true, x: f.state.player.x + f.state.player.width / 2 + 40 - boss.width / 2,
    y: 320 - boss.height, knockbackRestY: 624 - boss.height });
  r.damageEnemy(f.state, f.mission, boss, boss.maxHealth + 1, "melee");
  assert.equal(f.state.phase, "trophy");
  const startY = boss.y;
  for (let tick = 0; tick < 240; tick++) {
    f.state.elapsed += DT;
    r.updateBoss(f.state, f.mission, "hunter", DT);
  }
  assert.ok(boss.y > startY);
  close(boss.y + boss.height, 400);
  assert.notEqual(boss.y + boss.height, f.state.world.floorY);
  startHarvest(f);
  completeHarvest(f);
  assert.equal(f.state.phase, "extraction");
  assert.equal(f.state.trophyCarried, true);
  assert.equal(f.state.trophyClaim.definitionId, f.mission.trophy.id);
  const id = f.state.trophyClaim.id, honor = f.state.honor;
  r.finishTrophyExtraction(f.state, f.mission);
  assert.equal(f.state.trophyClaim.id, id);
  assert.equal(f.state.honor, honor);
});

test("the actual corpse menu requires ownership and completes one native flay without granting a trophy", () => {
  const denied = fixture();
  assert.equal(denied.state.flayingToolOwned, false);
  const deniedHandler = riteHandler(denied);
  deniedHandler("open"); deniedHandler("flay");
  assert.equal(denied.state.huntRites.operation, null);
  const f = fixture({ owned: true }), handler = riteHandler(f);
  assert.equal(f.state.flayingToolOwned, true, "ownership came from the real inventory at initialization");
  handler("open"); handler("flay");
  assert.equal(f.state.huntRites.operation.action, "flay");
  const honor = f.state.honor;
  for (let tick = 0; tick < 384; tick++) f.riteFrame();
  assert.equal(f.state.huntRites.operation, null);
  assert.equal(f.state.huntRites.corpses[0].flayed, true);
  assert.equal(f.state.huntRites.completedEventIds.filter(id => id === "flay:" + f.enemy.id).length, 1);
  assert.equal(f.drop.collected, false, "skinning is distinct from trophy collection");
  assert.equal(f.state.honor, honor);
  handler("flay");
  assert.equal(f.state.huntRites.operation, null);
  assert.equal(f.state.huntRites.completedEventIds.length, 1);
});

for (const [name, change] of [
  ["departure", f => { f.state.player.x += 300; }],
  ["fall", f => { f.state.player.grounded = false; }],
  ["solid obstacle", f => { f.state.world.platforms.push({ ...ledge, id: "flay-wall", x: 1350, y: 0, width: 8, height: 624 }); }],
  ["loss of tool", f => { f.state.flayingToolOwned = false; }],
  ["source removed", f => { f.enemy.active = false; }],
  ["damage followed by healing", f => { r.hurtPlayer(f.state, 5, f.mission); f.state.player.health = f.state.player.maxHealth; }],
]) test(`native flay interrupts after ${name} without a completed event`, () => {
  const f = fixture({ owned: true }), handler = riteHandler(f);
  handler("open"); handler("flay"); f.riteFrame(.1);
  assert.ok(f.state.huntRites.operation.elapsed > 0);
  change(f); f.riteFrame();
  assert.equal(f.state.huntRites.operation, null);
  assert.equal(f.state.huntRites.corpses[0].flayed, false);
  assert.equal(f.state.huntRites.completedEventIds.length, 0);
  assert.equal(f.drop.collected, false);
});

test("a flayed native checkpoint passes structural preflight but final restore still requires actual ownership", () => {
  const f = fixture({ owned: true }), handler = riteHandler(f);
  handler("open"); handler("flay");
  for (let tick = 0; tick < 384; tick++) f.riteFrame();
  const archive = r.serializeActiveHuntCheckpoint(r.captureCheckpoint(f.state), 0);
  assert.ok(archive);
  const decoded = r.deserializeActiveHuntCheckpoint(archive);
  assert.ok(decoded, "structural admission does not pretend to own a campaign tool");
  const owned = fixture({ owned: true, secondary: false });
  const restored = r.restoreCheckpoint(owned.state, decoded.checkpoint, "resume");
  assert.equal(restored.flayingToolOwned, true);
  assert.equal(restored.huntRites.corpses[0].flayed, true);
  const unowned = fixture({ secondary: false });
  const denied = r.restoreCheckpoint(unowned.state, decoded.checkpoint, "resume");
  assert.equal(denied.paused, true);
  assert.equal(denied.flayingToolOwned, false);
  assert.equal(denied.huntRites.corpses.length, 0, "preflight cannot manufacture ownership or corpse work");
  assert.match(denied.message, /reprise refusée/);
  assert.equal(plain(f.save.inventory).fieldToolIds[0], "flaying-tool");
});
