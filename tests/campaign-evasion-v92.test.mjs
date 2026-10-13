import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { formationCampaignRoute, formationModel as p, formationEnvironment as env, stamp } from './helpers/solo-v90-played-route.mjs';
import { p as saves } from './helpers/solo-v67-campaign-route.mjs';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';

let combatRoute, finishedRoute;
const combat = () => combatRoute ??= formationCampaignRoute({ stop: 'combat' });
const finished = () => finishedRoute ??= formationCampaignRoute();
/** Real engine commands only. No position, phase or enemy mode is injected. */
function controller(origin = combat()) {
  let save = structuredClone(origin.save), state = structuredClone(save.soloV90.checkpoint);
  const commits = [];
  const advance = (input = {}) => {
    const before = state, output = p.stepSoloV90(state, input, env); state = output.state;
    assert(p.normalizeSoloV90State(state), 'Invalid physical result: ' + JSON.stringify(state));
    if (output.receipts.length || p.soloV90NeedsImmediateCheckpoint(before, state)) {
      const prior = save;
      save = output.receipts.length ? p.withSoloV90Progress(save, output.receipts, state, stamp) : p.withSoloV90Checkpoint(save, state, stamp);
      assert(save, 'Physical command checkpoint rejected');
      commits.push({ before: prior, after: save, state: structuredClone(state), receipts: output.receipts });
      state = { ...state, replay: [] };
    }
    return state;
  };
  const until = (condition, input = () => ({}), limit = 1500) => {
    for (let i = 0; !condition(state) && i < limit; i++) advance(input(state));
    assert(condition(state), 'Physical target not reached: ' + JSON.stringify(state)); return state;
  };
  return { advance, until, commits, get state() { return state; }, get save() { return save; } };
}
function actualCharge() {
  const run = controller(); run.advance();
  run.until(s => s.player.x >= 2730, () => ({ move: 1 }));
  run.until(s => s.drone.mode === 'lunge' && s.drone.x - s.player.x < 100);
  assert.equal(run.state.health, 6); assert(run.state.drone.x - run.state.player.x > 62);
  return run;
}

test('a timed native dodge moves through a real incoming charge; ordinary running from the same played checkpoint is hit', () => {
  const run = actualCharge(), before = structuredClone(run.state);
  let ordinary = structuredClone(before), collisionInsideWindow = false;
  for (let i = 0; i < p.SOLO_V92_EVASION.duration; i++) {
    const state = run.advance({ move: 1, dodge: true });
    ordinary = p.stepSoloV90(ordinary, { move: 1 }, env).state;
    if (state.drone.mode === 'lunge' && Math.abs(state.player.x - state.drone.x) < 62) collisionInsideWindow = true;
  }
  assert(collisionInsideWindow, 'actual contact, not a dodge at an empty point');
  assert.equal(run.state.health, 6); assert(ordinary.health < 6);
  assert.equal(Math.round((run.state.player.x - before.player.x) * 100), Math.round(p.SOLO_V92_EVASION.speed * p.SOLO_V92_EVASION.duration * 100));
  assert.equal(run.state.drone.hp, before.drone.hp); assert.deepEqual(run.state.contributions, before.contributions);
});

test('holding dodge cannot repeat it after recovery; a new released press is required and no jump or strike is folded into the roll', () => {
  const run = controller(); run.advance();
  let starts = 0;
  for (let i = 0; i < 95; i++) {
    const prior = run.state, next = run.advance({ move: -1, dodge: true, ...(i === 2 ? { jump: true, command: true } : {}) });
    if (!prior.evasion?.ticks && next.evasion?.ticks === p.SOLO_V92_EVASION.duration) starts++;
    assert.equal(next.player.y, p.SOLO_V90_GROUND); assert.equal(next.attackTimer, 0);
  }
  assert.equal(starts, 1); assert.equal(run.state.evasion.cooldown, 0); assert.equal(run.state.evasion.ticks, 0);
  run.advance({}); const again = run.advance({ move: 1, dodge: true });
  assert.equal(again.evasion.ticks, p.SOLO_V92_EVASION.duration); assert.equal(again.player.vx, p.SOLO_V92_EVASION.speed);
});

test('an early dodge does not provide a permanent shield through the later charge', () => {
  const run = controller(); run.advance(); run.until(s => s.player.x >= 2730, () => ({ move: 1 }));
  run.until(s => s.drone.mode === 'telegraph' && s.drone.age >= 4);
  run.advance({ move: 1, dodge: true });
  run.until(s => s.health < 6);
  assert.equal(run.state.evasion.ticks, 0); assert.equal(run.state.health, 5);
});

test('acid created by an actual hit still wounds during the evasive window and stops the action', () => {
  const hit = finished().commits.find(c => c.state.drone.hp < c.before.soloV90.checkpoint.drone.hp);
  assert(hit); const run = controller({ save: hit.after });
  run.until(s => s.player.y === p.SOLO_V90_GROUND && s.player.vy === 0 && s.attackTimer === 0);
  assert(run.state.acid.ttl > 10); assert.equal(run.state.health, 6);
  assert(run.state.acid.x - run.state.player.x > 42 && run.state.acid.x - run.state.player.x < 100);
  const evading = run.advance({ move: 1, dodge: true }); assert.equal(evading.evasion.ticks, p.SOLO_V92_EVASION.duration);
  run.until(s => s.health === 5, () => ({ move: 1, dodge: true }), 20);
  assert(run.state.acid.ttl > 0); assert.equal(run.state.evasion.ticks, 0);
  assert.equal(run.state.player.vx, 0); assert.equal(run.state.hurtTimer, 90);
});

test('new dodge commands survive the actual save parser and exact replay rejects altered action, cooldown, velocity and trace', () => {
  const run = actualCharge(); run.advance({ move: 1, dodge: true });
  const checkpoint = run.commits.at(-1); assert(checkpoint.state.evasion.ticks > 0);
  assert(checkpoint.state.replay.some(code => !!(code & 32)));
  const parsed = saves.parseSaveImport(JSON.stringify(checkpoint.after)); assert.equal(parsed.failure, null);
  assert.deepEqual(parsed.save.soloV90, checkpoint.after.soloV90);
  assert.equal(p.withSoloV90Checkpoint(checkpoint.after, checkpoint.state, stamp), checkpoint.after, 'uncertain durable write is idempotent');
  for (const edit of [s => { s.evasion.cooldown--; }, s => { s.evasion.direction *= -1; }, s => { s.evasion.ticks--; }, s => { s.player.vx = 0; }, s => { s.replay = s.replay.map(code => code & 31); }]) {
    const forged = structuredClone(checkpoint.state); edit(forged);
    assert.equal(p.withSoloV90Checkpoint(checkpoint.before, forged, stamp), null);
  }
  for (const blocked of [{ ...env, paused: true }, { ...env, pageVisible: false }, { ...env, assetsReady: false }]) {
    assert.deepEqual(p.stepSoloV90(checkpoint.state, { dodge: true, move: -1 }, blocked), { state: checkpoint.state, receipts: [] });
  }
  for (const field of ['prologue', 'soloV66', 'soloV67', 'soloV68', 'soloV69', 'soloV70', 'inventory', 'loadout', 'statistics', 'missionProgress', 'homeworld']) assert.deepEqual(checkpoint.after[field], combat().save[field], field);
});

test('old chapter checkpoints and all three outcomes remain without a fabricated evasion field or any new rank', () => {
  for (const run of [finished(), formationCampaignRoute({ mode: 'retreated' }), formationCampaignRoute({ mode: 'assisted' })]) {
    assert(!Object.hasOwn(run.state, 'evasion'));
    const parsed = saves.parseSaveImport(JSON.stringify(run.save)); assert.equal(parsed.failure, null);
    assert.deepEqual(parsed.save.soloV90, run.save.soloV90); assert.deepEqual(run.save.prologue, run.origin.prologue);
    const evaluation = p.soloV92Evaluation(run.state); assert(evaluation.reported);
    assert.equal(evaluation.health, run.state.health); assert.deepEqual(evaluation.contributions, run.state.contributions);
    assert.equal(evaluation.result === 'Entraînement réussi', run.state.result === 'success');
  }
  const unarmed = combat().state, held = p.stepSoloV90(unarmed, { dodge: true }, env).state;
  assert.equal(held.inputArmed, false); assert.equal(held.tick, unarmed.tick); assert.equal(held.evasion, undefined);
  const start = p.createSoloV90State(); start.inputArmed = true;
  const notCombat = p.stepSoloV90(start, { dodge: true }, env).state;
  assert.equal(notCombat.evasion.ticks, 0); assert.equal(notCombat.player.vx, 0);
});

test('the actual renderer consumes the two independently authored dodge orientations, with action-local ticks and constant standing scale', () => {
  const art = homeworldQaModelV64(process.cwd(), ['../firstHuntSoloV90Rendering.ts', '../youthArtManifest.ts', '../youthTrainingRendering.ts']);
  const run = controller(); run.advance(); run.advance({ move: -1, dodge: true });
  const images = new Map(art.youthArtSources(art.YOUTH_ART_MANIFEST).map(src => [src, { width: 1536, height: 1024 }]));
  images.set(art.TRAINING_DRONE_V90, { width: 1536, height: 1024 });
  images.set('/game/homeworld/v70/temple-modules.png', { width: 1536, height: 1024 });
  const painted = [];
  for (const move of [-1, 1]) {
    const branch = controller(); branch.advance(); branch.advance({ move, dodge: true });
    const calls = [], ctx = new Proxy({ canvas: { width: 375 }, globalAlpha: 1, drawImage(...args) { calls.push(args); } }, { get(target, key) { return key in target ? target[key] : () => {}; } });
    for (let i = 0; i < 11; i++) {
      const s = branch.state, side = move < 0 ? 'left' : 'right', atlas = art.YOUTH_ART_MANIFEST.actors.player[side];
      art.drawFirstHuntSoloV90(ctx, s, { manifest: art.YOUTH_ART_MANIFEST, images }, false);
      const expected = art.youthClipFrame(atlas.clips.dodge, p.SOLO_V92_EVASION.duration - s.evasion.ticks);
      const draw = calls.findLast(c => c[0] === images.get(atlas.src)); assert(draw);
      assert.deepEqual(draw.slice(1, 5), [...expected.rect]);
      assert(Math.abs(draw[8] / expected.rect[3] - 112 / atlas.bodyHeight) < 1e-12, 'standing body scale never fits each crouched pose');
      painted.push(`${side}:${expected.rect.join(',')}`); branch.advance({ move, dodge: true });
    }
  }
  assert.equal(new Set(painted).size, 4, 'two native drawings for each of two directions');
  const code = fs.readFileSync('app/game/FirstHuntSoloV90.tsx', 'utf8');
  assert.match(code, /dodge: sample\.actions\.dodge/); assert.match(code, /\["dodge", "Esquive"\]/);
});

test('configured keyboard, touch and the standard gamepad B button feed the same dodge control without requiring a fixed key', () => {
  const input = homeworldQaModelV64(process.cwd(), ['youthControls.ts', 'controlBindings.ts']);
  const bindings = { ...input.DEFAULT_CONTROL_BINDINGS, [input.YOUTH_CONTROL_ACTIONS.dodge]: ['KeyQ'] };
  const samples = [
    input.sampleYouthControls(new Set(['KeyQ']), new Set(), bindings, null),
    input.sampleYouthControls(new Set(), new Set(['dodge']), bindings, null),
    input.sampleYouthControls(new Set(), new Set(), bindings, { connected: true, mapping: 'standard', axes: [0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === 1, value: i === 1 ? 1 : 0 })) }),
  ];
  for (const sample of samples) { assert(sample.actions.dodge); assert.equal(sample.neutral, false); }
  assert.equal(input.sampleYouthControls(new Set(), new Set(), bindings, null).neutral, true);
});

test('portrait navigation is a bounded projection of the real goal and never moves the actor or credits progress', () => {
  const render = homeworldQaModelV64(process.cwd(), ['../firstHuntSoloV90Rendering.ts']);
  const old = finished(), s = old.snapshots.arsenal, saved = structuredClone(s);
  for (const width of [320, 375, 545, 960]) {
    const marker = render.soloV92RouteMarker(s, width); assert(marker.visible);
    assert(marker.x >= 28 && marker.x <= width - 28); assert.equal(marker.distance, Math.round(Math.abs(780 - s.player.x)));
    assert.equal(marker.direction, width < 780 ? 1 : 0);
    const returning = render.soloV92RouteMarker(old.snapshots.return, width); assert(returning.visible); assert.equal(returning.direction, -1);
    assert.equal(render.soloV92RouteMarker(old.snapshots.observe, width).visible, false);
    assert.equal(render.soloV92RouteMarker(old.state, width).visible, false);
  }
  assert.deepEqual(s, saved);
});
