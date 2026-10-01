import assert from 'node:assert/strict';
import test from 'node:test';
import { cageRoute, p } from './helpers/youth-cage-played-route.mjs';
import { solo, playSolo, stamp, environment, soloInput } from './helpers/solo-v66-played-route.mjs';

const origin = cageRoute().save;
function campaignRoute() {
  let save = solo.startSoloV66Campaign(origin, stamp); assert(save);
  const commits = [];
  const run = playSolo({ onStep(out) {
    const before = save;
    save = out.receipts.length ? solo.withSoloV66Progress(save, out.receipts, out.state, stamp) : solo.withSoloV66Checkpoint(save, out.state, stamp);
    assert(save, `save refused ${out.state.phase}:${out.state.tick}`);
    assert(solo.soloV66MatchesSave(save)); assert(solo.normalizeSoloV66Campaign(save.soloV66));
    if (out.receipts.length) commits.push({ before, state: out.state, receipts: out.receipts, after: save });
  } });
  return { ...run, save, commits };
}
const run = campaignRoute();

test('a whole played nursery/training/desert/patrol/cage campaign is required; no old campaign starts automatically', () => {
  assert.equal(solo.soloV66MatchesSave(origin), true); assert.equal(origin.soloV66, null);
  const legacy = structuredClone(origin); delete legacy.soloV66;
  assert.equal(solo.soloV66MatchesSave(legacy), true);
  assert(solo.canStartSoloV66(legacy));
  assert.equal(legacy.soloV66, undefined, 'recognizing an older save cannot start the chapter automatically');
  assert(solo.canStartSoloV66(origin));
  const fresh = p.createNewGame ? p.createNewGame() : { ...origin, youthTraining: null };
  assert.equal(solo.startSoloV66Campaign(fresh, stamp), null);
  for (const candidate of [{ ...origin, prologue: null }, { ...origin, youthTraining: null }, { ...origin, homeworld: { ...origin.homeworld, greetedNpcIds: [] } }, { ...origin, soloV66: { version: 2 } }]) assert.equal(solo.startSoloV66Campaign(candidate, stamp), null);
  const once = solo.startSoloV66Campaign(origin, stamp);
  assert.equal(solo.startSoloV66Campaign(once, stamp), once);
});

test('only the final real mentor report grants first-tracks, preserving all prior equipment, owner, rites, rank and adult statistics', () => {
  for (const commit of run.commits.slice(0, -1)) assert.equal(commit.after.prologue.chronicle.evidence.some(e => e.id === 'first-tracks'), false);
  assert.equal(run.save.prologue.chronicle.evidence.filter(e => e.id === 'first-tracks').length, 1);
  assert.deepEqual(run.save.prologue.chronicle.rites, origin.prologue.chronicle.rites);
  assert.equal(p.getChronicleRank(run.save.prologue.chronicle), 'unblooded');
  for (const key of ['createdAt', 'inventory', 'statistics', 'missionProgress', 'youthTraining']) assert.deepEqual(run.save[key], origin[key]);
  assert.equal(run.save.profile.rankId, origin.profile.rankId); assert.equal(run.save.profile.honor, origin.profile.honor);
  assert.equal(run.save.soloV66.status, 'completed');
});

test('routine checkpoints cannot mint any milestone, and forged later phases cannot skip a durable receipt', () => {
  for (const c of run.commits) assert.equal(solo.withSoloV66Checkpoint(c.before, c.state, stamp), null);
  for (let i = 0; i < run.commits.length - 1; i++) {
    const c = run.commits[i], skipped = run.commits[i + 1];
    assert.equal(solo.withSoloV66Progress(c.before, [...c.receipts, ...skipped.receipts], skipped.state, stamp), null);
  }
  const c = run.commits[0];
  assert.equal(solo.withSoloV66Progress(c.before, [{ ...c.receipts[0], sourceId: 'invented' }], c.state, stamp), null);
});

test('duplicate acknowledgement is idempotent; rollback, invalid dates, altered old receipt and future version are refused', () => {
  for (const c of run.commits) {
    const retry = solo.withSoloV66Progress(c.after, c.receipts, c.state, stamp); assert(retry);
    assert.deepEqual(retry, c.after);
    const before = structuredClone(c.before.soloV66.checkpoint);
    assert.equal(solo.withSoloV66Checkpoint(c.after, before, stamp), null);
  }
  const c = run.commits[3], altered = structuredClone(c.state); altered.milestones.departure++;
  assert.equal(solo.withSoloV66Progress(c.before, c.receipts, altered, stamp), null);
  assert.equal(solo.withSoloV66Checkpoint(c.before, c.before.soloV66.checkpoint, '1999-01-01'), null);
  assert.equal(solo.normalizeSoloV66Campaign({ ...run.save.soloV66, version: 2 }), null);
  for (const status of [['active'], ['completed'], { toString: () => 'active' }]) assert.equal(solo.normalizeSoloV66Campaign({ ...run.commits[0].after.soloV66, status }), null);
});

test('cross-field validation refuses an orphan chapter proof, missing proof, wrong rank or premature completed status', () => {
  for (const mutate of [s => s.soloV66 = null, s => s.soloV66.status = 'active', s => s.prologue.chronicle.evidence = s.prologue.chronicle.evidence.filter(e => e.id !== 'first-tracks'), s => s.youthTraining = null]) {
    const save = structuredClone(run.save); mutate(save); assert.equal(solo.soloV66MatchesSave(save), false);
  }
});

test('a real failed approach and its physical retreat persist without fabricating an observation', () => {
  let save = run.commits[3].after, state = structuredClone(save.soloV66.checkpoint);
  for (let i = 0; i < 5000 && state.phase !== 'setback'; i++) {
    let input = {};
    if (state.inputArmed) {
      const ahead = solo.SOLO_V66_ROCKS.find(r => r.x - 17 > state.player.x && r.x - 17 - state.player.x < 70);
      input = { move: state.player.x < 2550 ? 1 : 0, jump: !!ahead && state.player.vy === 0 && !state.previousJump, attack: true };
    }
    const out = solo.stepSoloV66(state, input, environment); state = out.state;
    save = solo.withSoloV66Checkpoint(save, state, stamp); assert(save);
  }
  assert.equal(state.phase, 'setback'); assert.equal(save.soloV66.receipts.length, 4);
  for (let i = 0; i < 5000 && state.phase !== 'stalk'; i++) {
    const out = solo.stepSoloV66(state, soloInput(state), environment); state = out.state;
    save = solo.withSoloV66Checkpoint(save, state, stamp); assert(save);
  }
  assert.equal(state.attempts, 2); assert.equal(save.soloV66.receipts.length, 4);
});
