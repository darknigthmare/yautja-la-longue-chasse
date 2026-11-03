import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { test } from 'node:test';
import { formationCampaignRoute, formationModel as p, formationEnvironment as env, stamp } from './helpers/solo-v90-played-route.mjs';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';
let route;
const played = () => route ??= formationCampaignRoute();

test('played triad training walks out and back, records eight contributions of every participant and preserves every global rite', () => {
  const run = played(); assert.equal(run.state.result, 'success'); assert.equal(run.state.drone.hp, 0);
  assert.equal(run.save.soloV90.status, 'completed'); assert.equal(run.save.soloV90.receipts.length, 7); assert(run.state.walked >= 4400);
  assert.deepEqual(run.state.contributions, { player: 8, saar: 8, vek: 8 });
  for (const key of ['prologue', 'soloV66', 'soloV67', 'soloV68', 'soloV69', 'soloV70', 'inventory', 'loadout', 'statistics', 'missionProgress', 'homeworld']) assert.deepEqual(run.save[key], run.origin[key], key);
  assert.deepEqual({ ...run.save.profile, playTimeSeconds: 0 }, { ...run.origin.profile, playTimeSeconds: 0 });
  assert.equal(run.save.soloV90.ownerCreatedAt, run.origin.createdAt); assert.equal(run.save.soloV90.checkpoint.replay.length, 0);
});

test('withdrawal is played separately from victory and the triad must return physically', () => {
  const run = formationCampaignRoute({ mode: 'retreated' }); assert.equal(run.state.result, 'retreated');
  assert.equal(run.state.drone.hp, 8); assert.deepEqual(run.state.contributions, { player: 0, saar: 0, vek: 0 });
  assert(run.state.walked >= 4400); assert(run.state.companions.every(c => Math.abs(c.x - 160) < 120));
  assert.deepEqual(run.save.prologue, run.origin.prologue);
});

test('actual incapacitation preserves zero vitality and produces a slower assisted extraction without reviving', () => {
  const run = formationCampaignRoute({ mode: 'assisted' }); assert.equal(run.state.result, 'assisted'); assert.equal(run.state.health, 0);
  const zero = run.commits.find(c => c.state.health === 0); assert(zero); assert.equal(zero.state.phase, 'return');
  for (const c of run.commits.slice(run.commits.indexOf(zero))) assert.equal(c.state.health, 0);
  assert(run.state.walked >= 4400); assert.equal(run.save.soloV90.status, 'completed');
  assert.deepEqual(run.save.prologue, run.origin.prologue);
});

test('exact bounded command replay rejects invented kills, healing, teleports and contributions', () => {
  const run = played();
  for (const commit of run.commits.filter(c => c.receipts.length || c.state.drone.hp < c.before.soloV90.checkpoint.drone.hp)) {
    for (const change of [s => { s.player.x += 1; }, s => { s.health = Math.min(6, s.health + 1); s.player.x += 1; }, s => { s.replay = []; }, s => { s.contributions.saar++; }]) {
      const forged = structuredClone(commit.state); change(forged);
      assert.equal(p.withSoloV90Progress(commit.before, commit.receipts, forged, stamp), null);
    }
    if (commit.receipts.length) assert.equal(p.withSoloV90Checkpoint(commit.before, commit.state, stamp), null);
  }
  const c = run.commits.find(c => c.receipts.length);
  assert.equal(p.withSoloV90Progress(c.before, [{ ...c.receipts[0], sourceId: 'chronicle.quatza-rij.triad-completed' }], c.state, stamp), null);
});

test('foreign owner, future versions, unfinished prior chapter and concurrent journeys are rejected', () => {
  const run = played();
  for (const change of [s => { s.createdAt = '2026-10-11T00:00:01.000Z'; }, s => { s.soloV70 = null; }, s => { s.soloV90.version = 2; }, s => { s.soloV90.checkpoint.version = 2; }, s => { s.soloV90.sourceSha256 = 'wrong'; }]) {
    const save = structuredClone(run.save); change(save); assert.equal(p.soloV90MatchesSave(save), false);
  }
  const started = p.startSoloV90Campaign(run.origin, stamp);
  assert.equal(p.canStartSoloV90({ ...started, homeworldRegionV68: { status: 'outbound' } }), false);
  assert.equal(p.soloV90MatchesSave({ ...started, gameReserveV66: { status: 'active' } }), false);
});

test('every command window is durable, reloadable and idempotent while a refused write leaves the exact trace unchanged', () => {
  const run = formationCampaignRoute({ restoreEvery: 1 }); assert.equal(run.state.result, 'success');
  for (const c of run.commits) {
    assert(c.state.replay.length <= 120); const before = JSON.stringify(c.state);
    for (const blocked of [{ ...env, paused: true }, { ...env, pageVisible: false }, { ...env, assetsReady: false }]) {
      assert.deepEqual(p.stepSoloV90(c.state, { move: 1, command: true, interact: true }, blocked), { state: c.state, receipts: [] });
    }
    assert.equal(JSON.stringify(c.state), before);
    const replay = c.receipts.length ? p.withSoloV90Progress(c.before, c.receipts, c.state, stamp) : p.withSoloV90Checkpoint(c.before, c.state, stamp);
    assert.deepEqual(replay.soloV90, c.after.soloV90);
    assert(p.normalizeSoloV90Campaign(JSON.parse(JSON.stringify(c.after.soloV90))));
    assert.deepEqual(p.withSoloV90Progress(c.after, c.receipts, c.after.soloV90.checkpoint, stamp).soloV90, c.after.soloV90);
    const uncertainRetry = c.receipts.length ? p.withSoloV90Progress(c.after, c.receipts, c.state, stamp) : p.withSoloV90Checkpoint(c.after, c.state, stamp);
    assert.equal(uncertainRetry, c.after, 'reconciled durable write recognizes the unchanged pending trace');
    const moved = structuredClone(c.state); moved.player.x += 1;
    assert.equal(p.withSoloV90Progress(c.after, c.receipts, moved, stamp), null, 'reconciliation cannot turn idempotence into new movement');
  }
});

test('missing partners at their posts cannot create an opening and bounded replay stops at 120 until the owner commits', () => {
  const start = p.createSoloV90State(); let s = start;
  for (let i = 0; i < 200; i++) s = p.stepSoloV90(s, {}, env).state;
  assert.equal(s.replay.length, 120); assert.deepEqual(p.stepSoloV90(s, { move: 1 }, env).state, s);
  const run = played(), battle = run.snapshots.combat;
  const misplaced = { ...battle, companions: [{ x: 65 }, { x: 65 }], replay: [], drone: { ...battle.drone, mode: 'recover', age: 0, x: 2630 }, player: { ...battle.player, x: 2590 }, inputArmed: true, previousCommand: false };
  const out = p.stepSoloV90(misplaced, { command: true }, env); assert.equal(out.state.drone.hp, battle.drone.hp); assert.equal(out.state.contributions.player, 0);
});

test('V6 source extraction pins actual cells and does not claim that training implements the rite', t => {
  const source = p.CAMPAIGN_TRAINING_SOURCE_V90;
  assert.equal(source.source.sha256, p.SOLO_V90_SOURCE_SHA); assert.equal(source.runtimeScope, 'training-only-not-R2-M018-completion');
  const sheet = source.sheets.find(s => s.name === 'Campagne commune'), row = sheet.rows.find(r => r.number === 23);
  assert.equal(row.cells.find(c => c.address === 'A23').value, 'R2-M018');
  assert.match(row.cells.find(c => c.address === 'I23').value, /uniquement en cas de réussite/);
  const path = 'work-local/drive-import-20261007/downloads/Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx';
  if (!fs.existsSync(path)) { if (process.env.YAUTJA_V90_REQUIRE_SOURCE === '1') assert.fail('Required private V6 source missing'); else t.skip('Private V6 source is not distributed in Git'); return; }
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'), source.source.sha256);
});

test('runtime component uses native orientations, release gating and durable trace clearing without cosmetic fake movement', () => {
  const code = fs.readFileSync('app/game/FirstHuntSoloV90.tsx', 'utf8'), render = fs.readFileSync('app/game/firstHuntSoloV90Rendering.ts', 'utf8');
  assert.match(code, /neutralRequired\.current \|\| release\.current\.size/); assert.match(code, /if \(latest\.current\.onCheckpoint\(stateRef\.current\)\)/);
  assert.match(code, /stateRef\.current = \{ \.\.\.item\.state, replay: \[\] \}/); assert.match(code, /window\.addEventListener\("blur", blur\)/);
  assert.doesNotMatch(render, /scale\(-1|transform.*-1/); assert.match(render, /getSpriteContact/); assert.match(render, /SOLO_V90_POSTS/);
});

test('portrait demonstration follows the full native drone cell throughout its course without teleporting the observer', () => {
  const render = homeworldQaModelV64(process.cwd(), ['../firstHuntSoloV90Rendering.ts']);
  const state = played().snapshots.observe, saved = structuredClone(state);
  assert(p.soloV90ObservationPostReady(state));
  const png = fs.readFileSync('public' + render.TRAINING_DRONE_V90);
  const cellWidth = png.readUInt32BE(16) / 6, height = png.readUInt32BE(20);
  const paintedWidth = cellWidth * 130 / (height - 8);
  for (const width of [320, 375, 545, 960]) {
    for (let x = 2980; x <= 3130; x += 5) {
      const camera = render.soloV90CameraFrame({ ...state, drone: { ...state.drone, x } }, width); assert(camera.remote);
      assert(x - paintedWidth / 2 >= camera.x, `left native cell visible at ${width}`);
      assert(x + paintedWidth / 2 <= camera.x + width, `right native cell visible at ${width}`);
    }
  }
  assert.deepEqual(state, saved, 'framing never moves the actor or credits observation');
  for (const change of [s => { s.player.vx = 3.5; }, s => { s.player.x = 2450; }, s => { s.phase = 'combat'; }, s => { s.player.y = 400; }]) {
    const moved = structuredClone(state); change(moved); const camera = render.soloV90CameraFrame(moved, 320); assert.equal(camera.remote, false);
    assert(moved.player.x >= camera.x && moved.player.x <= camera.x + 320, 'moving or combat returns the player view');
  }
});

test('moving while a distant cycle ends cannot credit an observation with a hidden target', () => {
  const state = { ...played().snapshots.observe, inputArmed: true, replay: [], observedCycles: 0,
    drone: { ...played().snapshots.observe.drone, mode: 'lunge', age: 59 } };
  const moved = p.stepSoloV90(state, { move: 1, interact: true }, env).state;
  assert.equal(moved.observedCycles, 0);
  const stationary = p.stepSoloV90(state, { interact: true }, env).state;
  assert.equal(stationary.observedCycles, 1);
});
