import assert from 'node:assert/strict';
import { test } from 'node:test';
import { thresholds as p, thresholdsCampaignRoute, thresholdsInput, environment, stamp } from './helpers/solo-v69-played-route.mjs';
import { cohortCampaignRoute } from './helpers/solo-v68-played-route.mjs';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';

test('twelve actual scene receipts certify preparation without changing rites, rank, weapons, old branches or kill statistics', () => {
  const run = thresholdsCampaignRoute();
  assert.equal(run.save.soloV69.status, 'completed'); assert.equal(run.save.soloV69.receipts.length, 12);
  assert(p.soloV69MatchesSave(run.save)); assert(p.normalizeSoloV69Campaign(JSON.parse(JSON.stringify(run.save.soloV69))));
  for (const field of ['prologue', 'youthTraining', 'soloV66', 'soloV67', 'soloV68', 'inventory', 'statistics', 'loadout', 'missionProgress', 'homeworld']) assert.deepEqual(run.save[field], run.origin[field]);
  assert.deepEqual({ ...run.save.profile, playTimeSeconds: 0 }, { ...run.origin.profile, playTimeSeconds: 0 });
  assert(run.save.profile.playTimeSeconds > run.origin.profile.playTimeSeconds);
  assert.equal(p.withSoloV69Checkpoint(run.save, run.state, stamp).profile.playTimeSeconds, run.save.profile.playTimeSeconds);
});

test('a loose Young Blood rite or incomplete V68 cannot start the preparation', () => {
  const origin = cohortCampaignRoute().save;
  for (const change of [s => { s.soloV68 = null; }, s => { s.soloV67 = null; }, s => { s.prologue.chronicle.rites.pop(); }, s => { s.soloV68.receipts.pop(); }, s => { s.youthTraining.receipts.pop(); }]) {
    const save = structuredClone(origin); change(save); assert.equal(p.canStartSoloV69(save), false); assert.equal(p.startSoloV69Campaign(save, stamp), null);
  }
});

test('only one physical journey can be active; a certified preparation does not erase a later region', () => {
  const origin = cohortCampaignRoute().save;
  const routes = homeworldQaModelV64(process.cwd(), ['homeworldRegionsV68.ts', 'homeworldPassageV67.ts', 'gameReserveV66.ts']);
  const journeys = [
    ['homeworldRegionV68', routes.createHomeworldRegionV68('ash-marches', 'another-route')],
    ['homeworldPassageV67', routes.createHomeworldPassageV67('ash-marches', 'outbound', 'another-passage')],
    ['gameReserveV66', routes.createGameReserveV66(17)],
  ];
  for (const [field, journey] of journeys) {
    const occupied = { ...origin, [field]: journey };
    assert.equal(p.canStartSoloV69(occupied), false); assert.equal(p.startSoloV69Campaign(occupied, stamp), null);
    const active = p.startSoloV69Campaign(origin, stamp);
    assert.equal(p.soloV69MatchesSave({ ...active, [field]: journey }), false);
  }
  const completed = thresholdsCampaignRoute({ origin }).save;
  const later = { ...completed, homeworldRegionV68: journeys[0][1] };
  assert.equal(p.soloV69MatchesSave(later), true); assert.equal(p.canStartSoloV69(later), false);
});

test('changed receipt source/order and progress without its exact receipt are rejected; exact retry is idempotent', () => {
  const run = thresholdsCampaignRoute();
  for (const commit of run.commits) {
    assert.equal(p.withSoloV69Checkpoint(commit.before, commit.state, stamp), null);
    const receipt = { ...commit.receipts[0], sourceId: 'chronicle.rite.first-blood' };
    assert.equal(p.withSoloV69Progress(commit.before, [receipt], commit.state, stamp), null);
    const retry = p.withSoloV69Progress(commit.after, commit.receipts, commit.state, stamp);
    assert(retry); assert.deepEqual(retry.soloV69, commit.after.soloV69); assert.equal(retry.profile.playTimeSeconds, commit.after.profile.playTimeSeconds);
  }
});

test('a stale scene cannot rewind a certified sas, waiting/scout proof, previous shadow route or returned chapter', () => {
  const run = thresholdsCampaignRoute();
  for (let i = 1; i < run.commits.length; i++) assert.equal(p.withSoloV69Progress(run.commits[i].after, run.commits[i - 1].receipts, run.commits[i - 1].state, stamp), null);
  const final = structuredClone(run.state); final.walked = 0;
  assert.equal(p.withSoloV69Checkpoint(run.save, final, stamp), null);
  const altered = structuredClone(run.save.soloV69); altered.receipts[2].tick++;
  assert.equal(p.normalizeSoloV69Campaign(altered), null);
});

test('proofs with fabricated physical endpoints cannot be committed even if their phase/milestone structure is valid', () => {
  const run = thresholdsCampaignRoute();
  for (const commit of run.commits) {
    const forged = structuredClone(commit.state); forged.player.x = 75;
    assert.equal(p.withSoloV69Progress(commit.before, commit.receipts, forged, stamp), null);
  }
});

test('the real 120-tick UI cadence commits physical subobjectives immediately and freezes exact retry arguments on refusal', () => {
  let save = p.startSoloV69Campaign(cohortCampaignRoute().save, stamp), state = p.createSoloV69State(), lastWrite = 0, writes = 0;
  const refused = new Set(), groundProofs = [];
  for (let i = 0; i < 50000 && state.phase !== 'complete'; i++) {
    const before = state, out = p.stepSoloV69(state, thresholdsInput(state), environment); state = out.state;
    const boundary = p.soloV69NeedsImmediateCheckpoint(before, state);
    if (!boundary && state.tick - lastWrite < 120) continue;
    const argument = state, serializedArgument = JSON.stringify(argument);
    const write = () => out.receipts.length ? p.withSoloV69Progress(save, out.receipts, argument, stamp) : p.withSoloV69Checkpoint(save, argument, stamp);
    const candidate = write(); assert(candidate, `cadence rejected ${state.phase} tick${state.tick} posts${state.shadowPosts}`);
    const kind = state.shadowPosts > before.shadowPosts ? 'post' : state.gateTimers.some((t, j) => t > before.gateTimers[j]) ? 'sas-open' : state.waitingSignal && !before.waitingSignal ? 'safe-wait' : state.scouted && !before.scouted ? 'river-scout' : '';
    if (kind && !refused.has(kind)) {
      // Simulate a durable callback refusing quota/readback: the candidate is
      // not installed, and no second simulation step may move from the proof.
      refused.add(kind); const retained = JSON.stringify(save), tick = state.tick;
      for (let f = 0; f < 180; f++) state = p.stepSoloV69(state, { move: 1, jump: true, command: true, interact: true }, { ...environment, paused: true }).state;
      assert.equal(state.tick, tick); assert.deepEqual(state.player, argument.player); assert.equal(state.scan, argument.scan); assert.deepEqual(state.gateTimers, argument.gateTimers); assert.deepEqual(state.trainee, argument.trainee);
      assert.equal(JSON.stringify(save), retained); assert.equal(JSON.stringify(argument), serializedArgument);
      assert.deepEqual(write(), candidate, 'same physical argument remains valid after the refused write');
      groundProofs.push({ kind, phase: state.phase, tick, x: state.player.x });
    }
    save = candidate; lastWrite = argument.tick; writes++;
  }
  assert.equal(state.phase, 'complete'); assert.equal(save.soloV69.status, 'completed'); assert.equal(save.soloV69.receipts.length, 12);
  assert.deepEqual([...refused].sort(), ['post', 'river-scout', 'safe-wait', 'sas-open']); assert.equal(groundProofs.length, 4);
  assert(writes < 100, `movement must retain periodic autosave rather than writing every tick: ${writes}`);
  assert(save.soloV69.checkpoint.walked >= 10500); assert(save.soloV69.checkpoint.trainee.reached); assert(p.soloV69MatchesSave(save));
});
