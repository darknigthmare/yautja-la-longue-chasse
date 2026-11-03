import assert from 'node:assert/strict';
import test from 'node:test';
import { cohort, cohortCampaignRoute, stamp } from './helpers/solo-v68-played-route.mjs';
import { p } from './helpers/solo-v67-campaign-route.mjs';
const run = cohortCampaignRoute();
test('a complete played V67 chain is required; a legacy rank and isolated evidence cannot start this cohort', () => {
  assert(cohort.canStartSoloV68(run.origin));
  for (const change of [s => s.soloV67 = null, s => s.soloV67.status = 'active', s => s.soloV66 = null, s => s.youthTraining = null, s => s.prologue = null, s => s.homeworld.greetedNpcIds = []]) {
    const copy = structuredClone(run.origin); change(copy); assert.equal(cohort.startSoloV68Campaign(copy, stamp), null);
  }
  const started = cohort.startSoloV68Campaign(run.origin, stamp); assert.equal(cohort.startSoloV68Campaign(started, stamp), started);
});
test('the distinct final physical recognition grants exactly Young Blood and preserves adult inventory and statistics', () => {
  for (const c of run.commits.slice(0, -1)) assert.equal(p.getChronicleRank(c.after.prologue.chronicle), 'unblooded');
  assert.equal(p.getChronicleRank(run.save.prologue.chronicle), 'young-blood');
  assert.deepEqual(run.save.prologue.chronicle.rites.map(r => r.id), ['nursery-recognition', 'unguided-hunt-recognition']);
  for (const field of ['createdAt', 'inventory', 'statistics', 'missionProgress', 'youthTraining', 'soloV66', 'soloV67', 'loadout']) assert.deepEqual(run.save[field], run.origin[field]);
  assert.equal(run.save.profile.honor, run.origin.profile.honor); assert.equal(run.save.profile.rankId, run.origin.profile.rankId);
  assert.equal(run.save.soloV68.status, 'completed'); assert.equal(run.save.soloV68.receipts.length, 13);
});
test('new proofs require their exact acknowledgement; combined, changed, stale and reordered transitions are rejected', () => {
  for (const c of run.commits) {
    assert.equal(cohort.withSoloV68Checkpoint(c.before, c.state, stamp), null);
    assert.deepEqual(cohort.withSoloV68Progress(c.after, c.receipts, c.state, stamp), c.after);
    assert.equal(cohort.withSoloV68Checkpoint(c.after, c.before.soloV68.checkpoint, stamp), null);
  }
  for (let i = 0; i < run.commits.length - 1; i++) { const a = run.commits[i], b = run.commits[i + 1]; assert.equal(cohort.withSoloV68Progress(a.before, [...a.receipts, ...b.receipts], b.state, stamp), null); }
  const c = run.commits[6]; assert.equal(cohort.withSoloV68Progress(c.before, [{ ...c.receipts[0], sourceId: 'fake' }], c.state, stamp), null);
  const shifted = structuredClone(run.commits.at(-1).state); shifted.player.x += 300; assert.equal(cohort.withSoloV68Progress(run.commits.at(-1).before, run.commits.at(-1).receipts, shifted, stamp), null);
});
test('recognition is cross-owned by the full cohort and never accepted as a standalone imported rite', () => {
  for (const change of [s => s.soloV68 = null, s => s.soloV68.status = 'active', s => s.prologue.chronicle.rites.pop(), s => s.soloV67 = null]) { const copy = structuredClone(run.save); change(copy); assert.equal(cohort.soloV68MatchesSave(copy), false); }
  const missingRite = structuredClone(run.save.soloV68); missingRite.receipts.pop(); assert.equal(cohort.normalizeSoloV68Campaign(missingRite), null);
  const future = structuredClone(run.save.soloV68); future.version = 2; assert.equal(cohort.normalizeSoloV68Campaign(future), null);
});
test('the real save parser preserves the completed cohort and refuses missing or future ownership', () => {
  const parsed = p.parseSaveImport(JSON.stringify(run.save)); assert(parsed.save, parsed.failure); assert.deepEqual(parsed.save.soloV68, run.save.soloV68);
  for (const change of [s => s.soloV68 = null, s => s.soloV68.version = 2, s => s.soloV68.checkpoint.version = 2]) {
    const copy = structuredClone(run.save); change(copy); assert.notEqual(p.parseSaveImport(JSON.stringify(copy)).failure, null);
  }
});
