import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const model = qa.load('app/game/systems/buriedCradle.ts');
const snapshots = qa.load('app/game/systems/buriedCradleSnapshot.ts');
const campaign = qa.load('app/game/systems/buriedCradleCampaign.ts');
const saves = qa.load('app/game/save.ts');
const { MISSIONS } = qa.load('app/game/data.ts');
const OWNER = '2026-11-08T12:00:00.000Z';
const SHIP = 'classic-predator-spaceship';
const ctx = { personalShipId: SHIP, ownedShipIds: [SHIP] };
const step = (run, input = {}) => model.stepBuriedCradle(run, input, 1 / 60).run;
function roundTrip(run) {
  const before = JSON.stringify(run), snapshot = snapshots.snapshotBuriedCradleRun(run);
  const result = snapshots.inspectBuriedCradleSnapshot(JSON.parse(JSON.stringify(snapshot)), run.progress, run.checkpointBudget);
  assert.equal(result.status, 'valid', `${run.roomId} / ${run.boss.phase} / ${run.boss.stage}`);
  assert.deepEqual(result.state.run, run); assert.equal(JSON.stringify(run), before);
  return result.state.run;
}
function active() {
  let save = saves.defaultSave(OWNER); save.settings.difficultyId = 'young-blood';
  for (const mission of MISSIONS) save.missionProgress[mission.id] = { ...save.missionProgress[mission.id], status: 'completed', attempts: 1, completions: 1 };
  for (const type of ['prepare', 'depart']) {
    const result = campaign.actBuriedCradleCampaign(save, { type }, ctx);
    assert(result.accepted, result.message); save = { ...save, buriedCradle: result.state };
  }
  return save;
}
const bossRun = () => {
  const progress = { ...model.createBuriedCradleProgress(), visitedRoomIds: [...model.CRADLE_ROOM_IDS], checkpointId: '11', rootRingCut: true };
  const run = model.createBuriedCradleRun(progress, 2); run.roomId = '12'; return run;
};

test('positions, jump velocity and timers round-trip into the same next simulation frame', () => {
  let run = model.createBuriedCradleRun(undefined, 2);
  for (let i = 0; i < 100; i++) {
    run = step(run, { move: 1, jumpPressed: i === 10, jumpHeld: true });
    if (i % 7 === 0) {
      const restored = roundTrip(run), input = { move: -1, jumpHeld: false };
      assert.deepEqual(step(restored, input), step(run, input));
    }
  }
});

test('all twelve room spawns and three shortcut directions admit exact resume without embedding an actor', () => {
  for (const door of model.BURIED_CRADLE_DOORS) for (const end of [door.a, door.b]) {
    const run = bossRun(); run.roomId = end.roomId;
    run.player.x = end.feet.x - 36; run.player.y = end.feet.y - 116;
    roundTrip(run);
  }
});

test('every real boss phase and attack stage remains serializable through an ordinary-input victory', () => {
  let run = bossRun();
  const phases = new Set(), stages = new Set();
  let checks = 0;
  for (let i = 0; i < 18000 && !run.progress.bossDefeated; i++) {
    const boss = run.boss, center = run.player.x + 36, feet = run.player.y + 116;
    let goal = center, jump = false;
    if (boss.phase === 'tentacles') {
      if (boss.weakPoint) goal = boss.weakPoint.x - 36;
      else if (boss.attack === 'puncture' || boss.attack === 'capture') goal = Math.max(60, boss.targetX - 160);
      else goal = 96;
    } else if (boss.phase === 'sheath') {
      goal = 1496; jump = run.player.grounded && feet > 552 && center > 1280 && center < 1610;
    } else if (boss.phase === 'bulb') {
      goal = boss.weakPoint ? 1496 : boss.attack === 'bite' ? 1260 : 1496;
      jump = run.player.grounded && feet > 552 && center > 1280 && center < 1610;
      if ((boss.attack === 'sweep' || boss.attack === 'pulse') && boss.stage === 'telegraph' && boss.remainingSeconds < .3 && feet > 560) jump = run.player.grounded;
    }
    const weak = model.getCradleWeakPoint(run);
    const close = weak && Math.abs(center - (weak.x - 36)) < 36;
    const strike = !!(weak && (close || boss.phase !== 'tentacles' && Math.abs(center - 1496) < 8));
    const result = model.stepBuriedCradle(run, { move: strike ? 1 : Math.abs(goal - center) < 3 ? 0 : goal > center ? 1 : -1,
      jumpPressed: jump, jumpHeld: true, meleePressed: strike }, 1 / 60);
    assert.equal(result.events.some(event => event.type === 'knockout'), false);
    run = result.run; phases.add(run.boss.phase); stages.add(run.boss.stage);
    if (i % 15 === 0 || result.events.length) { roundTrip(run); checks++; }
  }
  assert(run.progress.bossDefeated); roundTrip(run);
  assert(checks > 100); assert.deepEqual([...phases], ['tentacles', 'sheath', 'bulb', 'defeated']);
  assert.deepEqual([...stages].sort(), ['active', 'opening', 'telegraph']);
});

test('root trap waiting, warning, active and opening snapshots keep their actual timers', () => {
  const progress = { ...model.createBuriedCradleProgress(), visitedRoomIds: ['01', '02', '03', '04', '05', '07', '08', '10'] };
  let run = model.createBuriedCradleRun(progress, 2); run.roomId = '10'; run.player.x = 736 - 36;
  const stages = new Set(['waiting']); roundTrip(run);
  for (let i = 0; i < 360; i++) {
    run = step(run, { move: i < 35 ? -1 : 0 });
    stages.add(run.rootTrap.stage); if (i % 11 === 0) roundTrip(run);
  }
  assert.deepEqual([...stages].sort(), ['active', 'opening', 'telegraph', 'waiting']);
});

test('KO saves the real reset state while retaining discovery and world modifications', () => {
  const run = bossRun(); run.player.health = 0; run.boss.health['motor-a'] = 0;
  run.progress.drainageOpened = true;
  const recovered = roundTrip(step(run));
  assert.equal(recovered.roomId, '11'); assert.equal(recovered.player.health, 100);
  assert.equal(recovered.boss.health['motor-a'], 60); assert(recovered.progress.drainageOpened);
});

test('pause, portable export, import and depart preserve a saved mid-fight position and damaged anatomy', () => {
  let save = active(), run = bossRun();
  run.player.x = 240; run.player.health = 84; run.clockSeconds = 12.75;
  run.boss.health['motor-a'] = 40; run.boss.remainingSeconds = .45;
  const snapshot = snapshots.snapshotBuriedCradleRun(run);
  const field = campaign.actBuriedCradleCampaign(save, { type: 'checkpoint', progress: run.progress, snapshot }, ctx);
  assert(field.accepted, field.message); save = { ...save, buriedCradle: field.state };
  const suspension = campaign.actBuriedCradleCampaign(save, { type: 'suspend' }, ctx);
  assert(suspension.accepted); save.buriedCradle = suspension.state;
  const imported = saves.parseSaveImport(saves.exportSave(save)); assert(imported.save, imported.failure);
  const resumed = campaign.actBuriedCradleCampaign(imported.save, { type: 'depart' }, ctx);
  assert(resumed.accepted, resumed.message); assert.deepEqual(resumed.state.snapshot.run, run);
  assert.deepEqual(step(resumed.state.snapshot.run), step(run));
});

test('older clocks, omitted snapshots and altered phase consistency cannot erase an exact saved state', () => {
  let save = active(), run = bossRun(); run.clockSeconds = 20;
  const result = campaign.actBuriedCradleCampaign(save, { type: 'checkpoint', progress: run.progress,
    snapshot: snapshots.snapshotBuriedCradleRun(run) }, ctx);
  assert(result.accepted); save.buriedCradle = result.state;
  run.clockSeconds = 10;
  assert.equal(campaign.actBuriedCradleCampaign(save, { type: 'checkpoint', progress: run.progress,
    snapshot: snapshots.snapshotBuriedCradleRun(run) }, ctx).accepted, false);
  assert.equal(campaign.actBuriedCradleCampaign(save, { type: 'checkpoint', progress: run.progress }, ctx).accepted, false);
  const corrupt = structuredClone(save); corrupt.buriedCradle.snapshot.run.boss.phase = 'bulb';
  assert.equal(saves.parseSaveImport(JSON.stringify(corrupt)).failure, 'invalid-save');
  corrupt.buriedCradle.snapshot.version = 2;
  assert.equal(saves.parseSaveImport(JSON.stringify(corrupt)).failure, 'future-version');
});

test('malformed numeric, geometry and transient-input payloads are rejected without modifying their bytes', () => {
  const good = snapshots.snapshotBuriedCradleRun(bossRun());
  const cases = [
    value => { value.run.player.x = -1; }, value => { value.run.player.y = 625; },
    value => { value.run.player.health = 1000; }, value => { value.run.player.width = 1; },
    value => { value.run.player.velocityX = Number.POSITIVE_INFINITY; }, value => { value.run.clockSeconds = Number.NaN; },
    value => { value.run.boss.health.bulb = 0; }, value => { value.run.rootTrap.remainingSeconds = 999; },
    value => { value.run.pressedKeys = { melee: true }; }, value => { value.run.checkpointBudget = 0; },
    value => { value.run.boss.weakPoint = { partId: 'bulb', x: 0, y: 0, width: 999, height: 999 }; },
    value => { value.run.boss.attack = ['puncture']; }, value => { value.run.boss.stage = ['active']; },
    value => { value.run.rootTrap.stage = ['waiting']; }, value => { value.run.extracted = true; },
    value => { value.run.boss.pools = [{ x: '640', y: 602, width: 144, height: 22, remainingSeconds: 1 }]; },
  ];
  for (const mutate of cases) {
    const value = structuredClone(good); mutate(value); const before = JSON.stringify(value);
    assert.equal(snapshots.inspectBuriedCradleSnapshot(value, good.run.progress, 2).status, 'invalid-save');
    assert.equal(JSON.stringify(value), before);
  }
});

test('extraction records a terminal snapshot and a later retreat expedition starts a fresh live run', () => {
  let save = active(), run = model.createBuriedCradleRun(undefined, 2);
  run.player.x = 156; run = step(run, { interactPressed: true }); assert(run.extracted);
  const extracted = campaign.actBuriedCradleCampaign(save, { type: 'extract', progress: run.progress,
    snapshot: snapshots.snapshotBuriedCradleRun(run) }, ctx);
  assert(extracted.accepted, extracted.message); save.buriedCradle = extracted.state;
  const reported = campaign.actBuriedCradleCampaign(save, { type: 'report' }, ctx);
  assert(reported.accepted); save.buriedCradle = reported.state;
  assert(save.buriedCradle.snapshot.run.extracted);
  const departed = campaign.actBuriedCradleCampaign(save, { type: 'depart' }, ctx);
  assert(departed.accepted, departed.message); assert.equal(departed.state.snapshot, null);
});
