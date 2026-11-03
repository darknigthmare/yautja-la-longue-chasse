import assert from 'node:assert/strict';
import test from 'node:test';
import { firstTracksCompleted, huntCampaignRoute, p, hunt, stamp } from './helpers/solo-v67-campaign-route.mjs';
const origin = firstTracksCompleted(), run = huntCampaignRoute(origin);

test('the played previous assessment is required; legacy or merely forged evidence never opens the continuation', () => {
  assert(hunt.canStartSoloV67(origin));
  for (const change of [s => s.soloV66 = null, s => s.youthTraining = null, s => s.prologue = null, s => s.homeworld.greetedNpcIds = [], s => s.soloV66.status = 'active']) {
    const copy = structuredClone(origin); change(copy); assert.equal(hunt.startSoloV67Campaign(copy, stamp), null);
  }
  const started = hunt.startSoloV67Campaign(origin, stamp); assert.equal(hunt.startSoloV67Campaign(started, stamp), started);
  assert.equal(origin.soloV67 ?? null, null);
});
test('only played return plus distinct final report grants unguided-hunt, never a rite, rank, kill, equipment or ship', () => {
  for (const c of run.commits.slice(0, -1)) assert.equal(c.after.prologue.chronicle.evidence.some(e => e.id === 'unguided-hunt'), false);
  assert.equal(run.save.prologue.chronicle.evidence.filter(e => e.id === 'unguided-hunt').length, 1);
  assert.deepEqual(run.save.prologue.chronicle.rites, origin.prologue.chronicle.rites);
  assert.equal(p.getChronicleRank(run.save.prologue.chronicle), 'unblooded');
  for (const field of ['createdAt', 'inventory', 'statistics', 'missionProgress', 'youthTraining', 'soloV66']) assert.deepEqual(run.save[field], origin[field]);
  assert.equal(run.save.profile.rankId, origin.profile.rankId); assert.equal(run.save.profile.honor, origin.profile.honor);
  assert.equal(run.save.soloV67.status, 'completed');
});
test('checkpoints cannot create receipts; skipping or altering an ordered receipt is rejected', () => {
  for (const c of run.commits) assert.equal(hunt.withSoloV67Checkpoint(c.before, c.state, stamp), null);
  for (let i = 0; i < run.commits.length - 1; i++) {
    const a = run.commits[i], b = run.commits[i + 1];
    assert.equal(hunt.withSoloV67Progress(a.before, [...a.receipts, ...b.receipts], b.state, stamp), null);
  }
  const c = run.commits[4];
  assert.equal(hunt.withSoloV67Progress(c.before, [{ ...c.receipts[0], sourceId: 'forged' }], c.state, stamp), null);
  const changed = structuredClone(c.state); changed.milestones.departure++;
  assert.equal(hunt.withSoloV67Progress(c.before, c.receipts, changed, stamp), null);
  const branch = structuredClone(c.state); branch.route = 'ravine';
  assert.equal(hunt.withSoloV67Progress(c.before, c.receipts, branch, stamp), null);
});
test('duplicate acknowledgement is idempotent, old/future states and coercible enums are refused', () => {
  for (const c of run.commits) {
    assert.deepEqual(hunt.withSoloV67Progress(c.after, c.receipts, c.state, stamp), c.after);
    assert.equal(hunt.withSoloV67Checkpoint(c.after, c.before.soloV67.checkpoint, stamp), null);
  }
  for (const change of [s => s.version = 2, s => s.status = ['completed'], s => s.checkpoint.version = 2, s => s.checkpoint.player.facing = '1', s => s.checkpoint.route = ['ridge']]) {
    const copy = structuredClone(run.save.soloV67); change(copy); assert.equal(hunt.normalizeSoloV67Campaign(copy), null);
  }
});
test('cross-save proof needs its complete chapter, and all later recognition rites remain forbidden', () => {
  for (const change of [s => s.soloV67 = null, s => s.soloV67.status = 'active', s => s.prologue.chronicle.evidence = s.prologue.chronicle.evidence.filter(e => e.id !== 'unguided-hunt'), s => s.soloV66 = null]) {
    const copy = structuredClone(run.save); change(copy); assert.equal(hunt.soloV67MatchesSave(copy), false);
  }
  assert(p.parseSaveImport(JSON.stringify(run.save)).save, 'real save parser accepts the completed observation');
  const prematureRank = structuredClone(run.save);
  prematureRank.prologue.chronicle.rites.push({ id: 'unguided-hunt-recognition', sourceId: 'chronicle.rite.unguided-hunt' });
  assert.equal(hunt.soloV67MatchesSave(prematureRank), false);
  assert.notEqual(p.parseSaveImport(JSON.stringify(prematureRank)).failure, null);
});
