import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

// Exercise the actual Canvas simulation and archive decoder, not a second test implementation.
const sourceUrl = new URL('../app/game/HuntCanvas.tsx', import.meta.url);
const source = await readFile(sourceUrl, 'utf8');
const built = await build({ stdin: { contents: source.replace('export default function HuntCanvas', 'function HuntCanvas') + `
export { makeGameState, makeEnemy, applyHuntInsertion, updateHuntInsertionCompanions, commandHuntCompanion,
  visibleHuntCompanionTarget, updateRegularEnemy, updateProjectiles, captureCheckpoint,
  serializeActiveHuntCheckpoint, deserializeActiveHuntCheckpoint, restoreCheckpoint, resultFor, interact, updatePlayer, snapshot };
export * from './systems/huntInsertion';
export { DEFAULT_PLAN, EXPEDITION_MEMBER_SIZE } from './systems/planetInsertion';
export { WORLD_BLUEPRINTS_BY_MISSION, worldBlueprintFor } from './systems/worldBlueprints';
export { applyExplorationWorld } from './systems/explorationRegions';
export { createAiBrain } from './systems/huntSystems';
export { carrierArtForShip } from './systems/planetArrivalArt';
export { arrivalSurfaceShipGeometry } from './systems/planetArrivalSpatial';
export { createDropShipArrival, stepDropShip } from './systems/trophyRitual';
export { defaultSave } from './save';
export { MISSION_BY_ID } from './data';
export const testPlan = (method='pod', team='solo') => ({version:1,method,team});
export const testJson = text => JSON.parse(text);
`, resolveDir: fileURLToPath(new URL('../app/game/', import.meta.url)), sourcefile: fileURLToPath(sourceUrl), loader: 'tsx' },
bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', loader: { '.module.css': 'empty' },
external: ['react', 'react/jsx-runtime', 'react-dom'], logLevel: 'silent' });
const compiled = { exports: {} };
runInNewContext(built.outputFiles[0].text, { module: compiled, exports: compiled.exports, require: createRequire(import.meta.url),
  document: { hidden: false, hasFocus: () => true }, navigator: { getGamepads: () => [] } });
const r = compiled.exports;
const plain = value => JSON.parse(JSON.stringify(value));
const detached = value => r.testJson(JSON.stringify(value));
const close = (actual, expected, tolerance = .01) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≠ ${expected}`);
function fixture(method = 'ship', team = 'triad', missionId = 'jungle-vey', liveId = 'live-session') {
  const save = r.defaultSave('2026-11-05T00:00:00.000Z'), mission = r.MISSION_BY_ID[missionId];
  const state = r.makeGameState(mission, save.loadout, save.inventory, 'hunter', save.appearance, false, false, 44,
    save.exploration, r.testPlan(method, team), liveId, 'wolf-ship');
  return { save, mission, state };
}
function arena() {
  const f = fixture();
  f.state.world = { ...f.state.world, platforms: [], hazards: [], climbables: [], covers: [] };
  f.state.enemies = []; f.state.noiseEvents = []; f.state.tracks = []; f.state.scentNodes = [];
  f.state.insertion.patrolIds = []; f.state.insertion.alertedIds = [];
  return f;
}
function step(f, seconds, callback = () => {}) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) {
    callback(i / 60);
    f.state.elapsed += 1 / 60;
    r.updateHuntInsertionCompanions(f.state, f.mission, 1 / 60);
  }
}
function regular(f, { id = 'regular', x = 600, archetype = 'bad-blood-initiate', health = 80 } = {}) {
  const enemy = r.makeEnemy(id, archetype, f.mission.id, x, f.state.world.width, health, 18, 100, 1, 1);
  Object.assign(enemy, { x, y: f.state.world.floorY - enemy.height, active: true, waveActivationAt: null, facing: -1 });
  f.state.enemies.push(enemy); f.state.aiBrains[id] = r.createAiBrain(id, enemy.kind);
  return enemy;
}

test('all eight authored worlds have the same safe cinematic-to-hunt centers and distinct companion bodies', () => {
  for (const missionId of Object.keys(r.WORLD_BLUEPRINTS_BY_MISSION)) {
    const f = fixture('ship', 'triad', missionId);
    const companions = f.state.insertion.companions;
    assert.deepEqual(plain(companions.map(member => member.id)), ['karhek', 'saketh']);
    for (const [index, member] of companions.entries()) {
      close(member.x + member.width / 2, f.state.player.x + f.state.player.width / 2 + 160 * (index + 1));
      close(member.y + member.height, f.state.world.floorY);
      assert.equal(member.width, r.EXPEDITION_MEMBER_SIZE.width); assert.equal(member.height, r.EXPEDITION_MEMBER_SIZE.height);
    }
  }
});

test('a landed ship hands off the exact final actor facing, and resuming keeps saved facing', () => {
  const f = fixture(), art = r.carrierArtForShip(f.state.insertionShipId);
  const geometry = r.arrivalSurfaceShipGeometry(art, art.nose.x < art.tail.x ? -1 : 1, f.state.world.floorY);
  for (const actor of [f.state.player, ...f.state.insertion.companions]) {
    assert.equal(actor.facing, actor.x + actor.width / 2 < geometry.exit.x ? -1 : 1);
  }
  f.state.player.facing = 1; f.state.insertion.companions[0].facing = -1;
  const checkpoint = r.captureCheckpoint(f.state, 'resume');
  const restored = r.restoreCheckpoint(fixture().state, checkpoint, 'resume');
  assert.equal(restored.player.facing, 1); assert.equal(restored.insertion.companions[0].facing, -1);
});

test('ship patrols are deterministic, bounded, away from spawn, and applied exactly once', () => {
  for (const missionId of Object.keys(r.WORLD_BLUEPRINTS_BY_MISSION)) {
    const a = fixture('ship', 'triad', missionId), b = fixture('ship', 'triad', missionId);
    const patrols = f => f.state.enemies.filter(enemy => f.state.insertion.patrolIds.includes(enemy.id));
    assert.ok(patrols(a).length > 0 && patrols(a).length <= 4);
    assert.deepEqual(plain(patrols(a).map(enemy => [enemy.id, enemy.x, enemy.archetype])), plain(patrols(b).map(enemy => [enemy.id, enemy.x, enemy.archetype])));
    for (const enemy of patrols(a)) assert.ok(enemy.x + enemy.width / 2 >= a.state.world.spawn.x + 950);
    const count = a.state.enemies.length, suspicion = a.state.aiBrains[patrols(a)[0].id].suspicion;
    r.applyHuntInsertion(a.state, a.mission, 'hunter');
    assert.equal(a.state.enemies.length, count); assert.equal(a.state.aiBrains[patrols(a)[0].id].suspicion, suspicion);
  }
  const quiet = fixture('pod', 'solo');
  assert.equal(quiet.state.insertion.patrolIds.length, 0); assert.equal(quiet.state.insertion.alertedIds.length, 0);
  assert.equal(quiet.state.insertion.companions.length, 0);
});

test('insertion awareness searches the landing site and cannot reveal the moved hidden player', () => {
  const f = fixture('ship', 'solo'), id = f.state.insertion.patrolIds[0];
  const enemy = f.state.enemies.find(entry => entry.id === id);
  f.state.player.x = f.state.world.width - 250; f.state.player.cloaked = true;
  f.state.noiseEvents = []; f.state.tracks = []; f.state.scentNodes = [];
  const expected = { x: f.state.insertion.origin.x, y: f.state.insertion.origin.y - 60 };
  const start = enemy.x;
  for (let i = 0; i < 60; i++) { f.state.elapsed += 1 / 60; r.updateRegularEnemy(f.state, enemy, f.mission, 1 / 60); }
  assert.deepEqual(plain(f.state.aiBrains[id].lastKnownTarget), expected);
  assert.equal(f.state.aiBrains[id].mode, 'search'); assert.ok(enemy.x < start); assert.equal(enemy.pendingAttackId, null);
  f.state.player.x -= 1_500;
  r.updateRegularEnemy(f.state, enemy, f.mission, .05);
  assert.deepEqual(plain(f.state.aiBrains[id].lastKnownTarget), expected);
});

test('save, retry, and resume preserve orders, wounds, patrol identities and the live session runId', () => {
  const f = fixture();
  f.state.insertion.companions[0].order = 'hold';
  r.hurtHuntCompanion(f.state.insertion.companions[1], 29);
  const checkpoint = r.captureCheckpoint(f.state, 'resume');
  const archive = r.serializeActiveHuntCheckpoint(checkpoint, 0);
  const decoded = r.deserializeActiveHuntCheckpoint(archive); assert.ok(decoded);
  const renewed = fixture('ship', 'triad', 'jungle-vey', 'renewed-live-session');
  for (const mode of ['resume', 'retry']) {
    const restored = r.restoreCheckpoint(renewed.state, decoded.checkpoint, mode);
    assert.deepEqual(plain(restored.insertion), plain(f.state.insertion));
    assert.equal(restored.enemies.length, f.state.enemies.length);
    assert.equal(new Set(restored.enemies.map(enemy => enemy.id)).size, restored.enemies.length);
    assert.equal(r.resultFor(restored, renewed.mission, 'hunter', 'abandoned').insertionOutcome.runId, 'renewed-live-session');
    restored.insertion.companions[0].health = 1;
    assert.equal(decoded.checkpoint.insertion.companions[0].health, 100);
  }
});

test('a checkpoint cannot substitute the frozen departure plan or foreign companion identities', () => {
  const f = fixture(), checkpoint = r.captureCheckpoint(f.state, 'resume');
  const other = fixture('pod', 'solo');
  const rejected = r.restoreCheckpoint(other.state, checkpoint, 'resume');
  assert.equal(rejected.paused, true); assert.match(rejected.message, /reprise refusée/);
  assert.equal(rejected.insertion.plan.method, 'pod'); assert.equal(rejected.insertion.companions.length, 0);
  for (const mutate of [state => { state.runId = 'foreign'; }, state => { state.companions[0].id = 'saar'; },
    state => { state.companions[0].health = -1; }, state => { state.companions.push(state.companions[0]); },
    state => { state.patrolIds.push('invented'); }, state => { state.companions[1].x = f.state.world.width + 1; }]) {
    const bad = detached(f.state.insertion); mutate(bad);
    assert.equal(r.restoreHuntInsertion(bad, f.state.insertion.runId, f.state.world), null);
  }
});

test('active archives reject invented boarding, prior evacuation and abandonment outside extraction', () => {
  const f = fixture();
  for (const status of ['boarding', 'extracted', 'left-behind']) {
    const checkpoint = r.captureCheckpoint(f.state, 'resume');
    checkpoint.insertion.companions[0].status = status;
    const archive = r.serializeActiveHuntCheckpoint(checkpoint, 0);
    assert.equal(r.deserializeActiveHuntCheckpoint(archive), null, status);
    const rejected = r.restoreCheckpoint(f.state, checkpoint, 'resume');
    assert.equal(rejected.paused, true); assert.match(rejected.message, /reprise refusée/);
  }
  const forged = r.captureCheckpoint(f.state, 'resume'); forged.phase = 'extraction';
  forged.dropShip = { phase: 'boarding', phaseElapsedSeconds: 0, totalElapsedSeconds: 4 };
  forged.insertion.companions.forEach(member => { member.status = 'boarding'; });
  assert.equal(r.deserializeActiveHuntCheckpoint(r.serializeActiveHuntCheckpoint(forged, 0)), null,
    'a real ship phase cannot pull distant hunters across the level');
});

test('legacy insertion decoding remains solo without inventing reinforcements or actors', () => {
  const f = fixture('pod', 'solo'), checkpoint = r.captureCheckpoint(f.state, 'resume');
  delete checkpoint.insertion;
  const restored = r.restoreCheckpoint(f.state, checkpoint, 'resume');
  assert.equal(restored.insertion.companions.length, 0); assert.equal(restored.insertion.patrolIds.length, 0);
  assert.equal(restored.insertion.searchUntil, 0); assert.equal(restored.enemies.length, checkpoint.enemies.length);
});

test('follow and hold are independent physical orders; pause freezes the escort', () => {
  const f = arena(), [a, b] = f.state.insertion.companions;
  f.state.player.x = 1_000;
  assert.equal(r.commandHuntCompanion(f.state, b.id, 'hold'), true);
  const beforeA = a.x, beforeB = b.x;
  step(f, 1); assert.ok(a.x > beforeA + 150); close(b.x, beforeB);
  f.state.paused = true; const paused = plain(f.state.insertion);
  step(f, 1); assert.deepEqual(plain(f.state.insertion), paused);
});

test('a structural wall stops an escort and produces a blocked status instead of a teleport', () => {
  const f = arena(), member = f.state.insertion.companions[0];
  f.state.world.platforms = [{ id: 'wall', x: 700, y: 0, width: 40, height: f.state.world.floorY, collision: 'solid' }];
  f.state.player.x = 1_200;
  step(f, 6);
  assert.ok(member.x + member.width <= 700.01); assert.ok(member.blockedSeconds >= 1);
  assert.ok(member.x < f.state.player.x - 400);
});

test('real jungle underpass and timed flora route retain living physical escorts without crossing the cave ceiling', () => {
  const f = fixture('pod', 'triad'); f.state.enemies = [];
  const [a, b] = f.state.insertion.companions;
  step(f, 40, seconds => { f.state.player.x = Math.min(4_540, 225 + seconds * 180); });
  assert.ok(a.x > 4_252.5 && b.x > 4_252.5, 'both hunters traverse the gallery underpass and authored flora');
  assert.ok(a.health > 0 && b.health > 0); assert.equal(a.grounded, true); assert.equal(b.grounded, true);
});

test('a safe short hazard leap follows a continuous ballistic arc and lands without damage or snapping', () => {
  const f = arena(), member = f.state.insertion.companions[0];
  f.state.world.hazards = [{ id: 'small-ground-gap', x: 700, y: 590, width: 120, height: 34, damagePerSecond: 20 }];
  f.state.player.x = 1_100;
  let airborne = false, previousX = member.x, largestStep = 0;
  step(f, 6, () => { airborne ||= !member.grounded; largestStep = Math.max(largestStep, Math.abs(member.x - previousX)); previousX = member.x; });
  assert.ok(airborne); assert.ok(member.x > 820); assert.ok(largestStep <= 400 / 60 + .01);
  assert.equal(member.health, member.maxHealth); assert.equal(member.grounded, true);
});

test('the actual ice rift is crossed via its authored starter and cave platforms', () => {
  const f = fixture('pod', 'triad', 'ice-cryostalker'); f.state.enemies = [];
  f.state.elapsed = 3;
  const [a, b] = f.state.insertion.companions;
  f.state.player.x = 2_350;
  let airborne = false;
  step(f, 14, () => { airborne ||= !a.grounded; });
  assert.ok(airborne); assert.ok(a.x > 1_875 && b.x > 1_875, 'both escorts reach the far side of the ice rift');
  assert.ok(a.health > 0 && b.health > 0);
});

test('an escort takes actual mild ash damage on the volcanic route instead of gaining hazard immunity', () => {
  const f = fixture('pod', 'triad', 'volcano-bad-blood'); f.state.enemies = [];
  const member = f.state.insertion.companions[0];
  Object.assign(member, { x: 4_900, y: f.state.world.floorY - member.height, grounded: true });
  f.state.insertion.companions[1].order = 'hold'; f.state.player.x = 6_260;
  step(f, 9);
  assert.ok(member.x > 6_060, 'member traverses the real ash region');
  assert.ok(member.health > 0 && member.health < member.maxHealth, 'the traversal costs actual health');
});

test('the final live volcano lava is crossed from its intermediate platform to the extraction beacon', () => {
  const f = fixture('pod', 'triad', 'volcano-bad-blood'); f.state.enemies = [];
  f.state.phase = 'extraction'; f.state.player.x = f.state.world.extraction.x - f.state.player.width / 2;
  for (const [index, member] of f.state.insertion.companions.entries()) Object.assign(member,
    { x: 7_200 - index * 100, y: f.state.world.floorY - member.height, grounded: true });
  let airborne = false;
  step(f, 14, () => { airborne ||= !f.state.insertion.companions[0].grounded; });
  assert.ok(airborne);
  for (const member of f.state.insertion.companions) {
    assert.ok(member.health > 0, `${member.id} reaches extraction alive`);
    assert.ok(r.huntCompanionAtExtraction(member, f.state.world), `${member.id} physically joins the beacon`);
  }
});

test('a companion already exposed in lava can escape while taking real damage instead of freezing inside it', () => {
  const f = fixture('pod', 'triad', 'volcano-bad-blood'); f.state.enemies = [];
  const member = f.state.insertion.companions[0];
  Object.assign(member, { x: 7_799, y: f.state.world.floorY - member.height, grounded: true });
  f.state.phase = 'extraction'; f.state.player.x = f.state.world.extraction.x - f.state.player.width / 2;
  step(f, 3);
  assert.ok(r.huntCompanionAtExtraction(member, f.state.world));
  assert.ok(member.health > 0 && member.health < member.maxHealth, 'escape does not grant immunity');
});

test('bounded escort combat damages only reachable regular opponents, never an Apex at range', () => {
  const f = arena(), a = f.state.insertion.companions[0];
  f.state.player.x = a.x - 80; a.order = 'hold'; a.attackCooldown = 0;
  f.state.insertion.companions[1].order = 'hold';
  const enemy = regular(f, { x: a.x + 70, health: 100 });
  const health = enemy.health;
  r.updateHuntInsertionCompanions(f.state, f.mission, 1 / 60);
  assert.equal(enemy.health, health - 9);
  step(f, .5); assert.equal(enemy.health, health - 9, 'no damage every animation frame');
  enemy.boss = true; a.attackCooldown = 0;
  step(f, .2); assert.equal(enemy.health, health - 9);
  enemy.boss = false; enemy.x += 200; a.attackCooldown = 0;
  step(f, .2); assert.equal(enemy.health, health - 9, 'hold does not pursue a distant opponent');
});

test('walls prevent escort strikes, hostile acquisition and hostile projectiles', () => {
  const f = arena(), a = f.state.insertion.companions[0];
  f.state.player.x = 3_000; a.order = 'hold'; a.attackCooldown = 0;
  f.state.insertion.companions[1].x = 2_000;
  const enemy = regular(f, { x: a.x + 95, health: 100 }); enemy.facing = -1;
  f.state.world.platforms = [{ id: 'shield', x: a.x + 75, y: 0, width: 8, height: f.state.world.floorY, collision: 'solid' }];
  assert.equal(r.visibleHuntCompanionTarget(f.state, enemy), null);
  r.updateHuntInsertionCompanions(f.state, f.mission, .05); assert.equal(enemy.health, 100);
  f.state.projectiles = [{ id: 1, x: enemy.x, y: a.y + 50, velocityX: -1_000, velocityY: 0, radius: 4,
    damage: 20, hostile: true, color: '#fff', life: 1, source: 'enemy', weaponId: null, coverGraceSeconds: 0 }];
  r.updateProjectiles(f.state, f.mission, .2); assert.equal(a.health, a.maxHealth);
});

test('opaque covers block escort strikes, hostile acquisition and aid; destruction and soft foliage are respected', () => {
  const f = arena(), a = f.state.insertion.companions[0];
  Object.assign(a, { x: 400, y: 512, order: 'hold', attackCooldown: 0 });
  f.state.player.x = 2_000; f.state.insertion.companions[1].x = 2_600;
  const enemy = regular(f, { x: 500, health: 100 }); Object.assign(enemy, { width: 32, height: 104, y: 520 });
  const cover = { id: 'opaque-cover', x: 480, y: 350, width: 12, height: 274, protection: 1, destructible: true };
  f.state.world.covers = [cover];
  r.updateHuntInsertionCompanions(f.state, f.mission, 1 / 60);
  assert.equal(enemy.health, 100); assert.equal(r.visibleHuntCompanionTarget(f.state, enemy), null);
  a.health = 50; f.state.player.x = 500; f.state.player.medicomps = 1;
  assert.equal(r.commandHuntCompanion(f.state, a.id, 'aid'), false); assert.equal(f.state.player.medicomps, 1);
  assert.equal(r.huntInsertionLineOfSight({ x: 432, y: 568 }, { x: 516, y: 572 }, f.state.world, [{ ...cover, protection: .45 }]), true,
    'soft foliage is not promoted to a solid wall');
  f.state.brokenPillarIds.add(cover.id);
  assert.equal(r.commandHuntCompanion(f.state, a.id, 'aid'), true); assert.equal(f.state.player.medicomps, 0);
  f.state.player.x = 600;
  assert.equal(r.visibleHuntCompanionTarget(f.state, enemy)?.id, a.id);
  r.updateHuntInsertionCompanions(f.state, f.mission, 1 / 60); assert.equal(enemy.health, 91);
});

test('the first actual escort body intercepts a hostile projectile before the player', () => {
  const f = arena(), [a, b] = f.state.insertion.companions;
  Object.assign(a, { x: 500, y: 512, invulnerability: 0 });
  Object.assign(b, { x: 1_100, y: 512 }); f.state.player.x = 700; f.state.player.invulnerability = 0;
  const playerHealth = f.state.player.health;
  f.state.projectiles = [{ id: 1, x: 400, y: 560, velocityX: 2_000, velocityY: 0, radius: 4,
    damage: 23, hostile: true, color: '#fff', life: 1, source: 'enemy', weaponId: null, coverGraceSeconds: 0 }];
  r.updateProjectiles(f.state, f.mission, .2);
  assert.equal(a.health, 77); assert.equal(f.state.player.health, playerHealth); assert.equal(b.health, b.maxHealth);
});

test('nearby visible escorts can receive a real telegraphed hostile melee strike', () => {
  const f = arena(), a = f.state.insertion.companions[0];
  a.order = 'hold'; f.state.player.x = 3_000;
  f.state.insertion.companions[1].x = 2_000;
  const enemy = regular(f, { x: a.x + 65 }); enemy.facing = -1;
  assert.equal(r.visibleHuntCompanionTarget(f.state, enemy)?.id, a.id);
  for (let i = 0; i < 100; i++) { f.state.elapsed += 1 / 60; r.updateRegularEnemy(f.state, enemy, f.mission, 1 / 60); }
  assert.ok(a.health < a.maxHealth, 'enemy telegraph resolves against its chosen physical escort');
  assert.equal(f.state.player.health, f.state.player.maxHealth);
});

test('a hostile telegraph retains its companion target and cancels if that target is downed or occluded', () => {
  for (const obstacle of ['downed', 'cover']) {
    const f = arena(), a = f.state.insertion.companions[0];
    Object.assign(a, { x: 600, y: 512, order: 'hold' }); f.state.insertion.companions[1].x = 3_000;
    Object.assign(f.state.player, { x: 700, y: 508, cloaked: true, invulnerability: 0 });
    f.state.mud.thermalVisibility = 0; f.state.mud.cloakShimmer = 0;
    const enemy = regular(f, { x: 730 }); enemy.facing = -1;
    for (let tick = 0; tick < 120 && !enemy.pendingAttackId; tick++) {
      f.state.elapsed += 1 / 60; r.updateRegularEnemy(f.state, enemy, f.mission, 1 / 60);
    }
    assert.equal(enemy.pendingAttackId, 'regular-melee'); assert.equal(enemy.pendingAttackTargetId, a.id);
    if (obstacle === 'downed') { a.health = 0; a.status = 'downed'; }
    else f.state.world.covers = [{ id: 'occluder', x: 680, y: 0, width: 12, height: 624, protection: 1, destructible: false }];
    const playerHealth = f.state.player.health, allyHealth = a.health;
    for (let tick = 0; tick < 45; tick++) { f.state.elapsed += 1 / 60; r.updateRegularEnemy(f.state, enemy, f.mission, 1 / 60); }
    assert.equal(f.state.player.health, playerHealth, `${obstacle}: no unannounced transfer to the cloaked player`);
    assert.equal(a.health, allyHealth); assert.equal(enemy.pendingAttackTargetId, undefined);
  }
});

test('a downed hunter cannot move or attack; aid requires proximity and spends exactly one real medicomp', () => {
  const f = arena(), a = f.state.insertion.companions[0];
  r.hurtHuntCompanion(a, 100); assert.equal(a.status, 'downed');
  const x = a.x; f.state.player.x = 2_000; f.state.player.medicomps = 1;
  step(f, 1); close(a.x, x); assert.equal(r.commandHuntCompanion(f.state, a.id, 'aid'), false);
  assert.equal(f.state.player.medicomps, 1);
  f.state.player.x = a.x - 70;
  assert.equal(r.commandHuntCompanion(f.state, a.id, 'aid'), true);
  assert.equal(f.state.player.medicomps, 0); assert.equal(a.status, 'active'); close(a.health, 55);
  assert.equal(r.commandHuntCompanion(f.state, a.id, 'aid'), false); close(a.health, 55);
});

test('extraction never marks a remote companion evacuated; explicit leaving has a distinct persistent consequence', () => {
  const f = arena(), [a, b] = f.state.insertion.companions;
  f.state.phase = 'extraction'; f.state.player.x = f.state.world.extraction.x - f.state.player.width / 2;
  assert.equal(r.beginHuntCompanionBoarding(f.state.insertion, f.state.world), false);
  assert.equal(r.commandHuntCompanion(f.state, a.id, 'leave'), true);
  Object.assign(b, { x: f.state.world.extraction.x - b.width / 2 + 40, health: 90, grounded: true });
  assert.equal(r.beginHuntCompanionBoarding(f.state.insertion, f.state.world), true);
  const boarding = r.huntInsertionOutcome(f.state.insertion, 'live-new');
  assert.deepEqual(plain(boarding.extracted), [], 'boarding is not yet an evacuation');
  r.completeHuntCompanionBoarding(f.state.insertion);
  const completed = r.huntInsertionOutcome(f.state.insertion, 'live-new');
  assert.deepEqual(plain(completed.extracted), ['saketh']); assert.deepEqual(plain(completed.leftBehind), ['karhek']);
  assert.deepEqual(plain(completed.injured), ['saketh']); assert.equal(completed.runId, 'live-new');
  assert.ok(a.x < 1_000, 'abandonment did not move the missing hunter to the beacon');
});

test('native extraction interaction refuses remote members, then starts their boarding only with the actual ship', () => {
  const f = arena(); f.state.phase = 'extraction'; f.state.player.x = f.state.world.extraction.x - f.state.player.width / 2;
  f.state.dropShip = r.createDropShipArrival();
  for (let i = 0; i < 100; i++) f.state.dropShip = r.stepDropShip(f.state.dropShip, { deltaSeconds: .1, playerAtBeacon: true, requestBoarding: false }).state;
  r.interact(f.state, f.mission, 'hunter');
  assert.notEqual(f.state.dropShip.phase, 'boarding'); assert.match(f.state.message, /Triade incomplète/);
  f.state.insertion.companions.forEach((member, index) => Object.assign(member, {
    x: f.state.world.extraction.x - member.width / 2 + (index ? 55 : -55), grounded: true }));
  r.interact(f.state, f.mission, 'hunter');
  assert.equal(f.state.dropShip.phase, 'boarding'); assert.ok(f.state.insertion.companions.every(member => member.status === 'boarding'));
  const input = { keyboardHeld: new Set(), touchHeld: new Set(), gamepadHeld: new Set(), pressed: new Set(),
    previousGamepadButtons: [], activeGamepadIndex: null, gamepadNeedsNeutral: true, gamepadDialogActions: [], pointerScreen: null };
  const completed = [];
  const restoredPhases = new Set();
  for (let tick = 0; tick < 300 && completed.length === 0; tick++) {
    f.state.elapsed += 1 / 60;
    r.updatePlayer(f.state, f.mission, f.save.loadout, f.save.inventory, f.save.appearance, 'hunter', input, 1 / 60, result => completed.push(result));
    r.updateHuntInsertionCompanions(f.state, f.mission, 1 / 60);
    if (!completed.length && !restoredPhases.has(f.state.dropShip.phase)) {
      const checkpoint = r.captureCheckpoint(f.state, 'resume');
      const archive = r.serializeActiveHuntCheckpoint(checkpoint, 0);
      const decoded = r.deserializeActiveHuntCheckpoint(archive); assert.ok(decoded, `legitimate ${f.state.dropShip.phase} archive`);
      const base = fixture('ship', 'triad', 'jungle-vey', 'claimed-again');
      const resumed = r.restoreCheckpoint(base.state, decoded.checkpoint, 'resume');
      assert.deepEqual(plain(resumed.insertion), plain(f.state.insertion));
      assert.equal(resumed.insertionRunId, 'claimed-again');
      restoredPhases.add(f.state.dropShip.phase);
    }
  }
  assert.equal(completed.length, 1, 'actual ship completion produces one result');
  assert.equal(completed[0].outcome, 'success');
  assert.deepEqual(plain(completed[0].insertionOutcome.extracted), ['karhek', 'saketh']);
  assert.deepEqual(plain(completed[0].insertionOutcome.leftBehind), []);
  assert.deepEqual([...restoredPhases].sort(), ['boarding', 'departure']);
});
