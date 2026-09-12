import test from 'node:test';
import assert from 'node:assert/strict';
import { productionCoverage } from '../scripts/production-coverage-v34.mjs';

const readyPlane = () => ({ assets: [{ requiredForRuntime: true, frames: [{ generation: { sha256: 'fixture' }, status: 'reviewed' }] }] });
const stage = () => ({ runtimeEnabled: false, planes: Array.from({ length: 6 }, readyPlane) });

test('a complete graphical kit does not become a playable arena or a complete game', () => {
  const coverage = productionCoverage([{ category: 'arena' }], [stage()]);
  assert.equal(coverage.arenas.requested, 1);
  assert.equal(coverage.arenas.reviewedKits, 1);
  assert.equal(coverage.arenas.playable, 0);
  assert.equal(coverage.completeGameImplied, false);
  assert.equal(coverage.hunters.completeMovesets, 0);
  assert.equal(coverage.vehicles.rideableVehicles, 0);
});

test('missing source receipt, unreviewed art, missing plane and optional-only plane cannot inflate reviewed kit counts', () => {
  const noReceipt = stage();delete noReceipt.planes[1].assets[0].frames[0].generation;
  const draft = stage();draft.planes[2].assets[0].frames[0].status = 'authored-review';
  const incomplete = stage();incomplete.planes.pop();
  const optionalOnly = stage();optionalOnly.planes[3].assets[0].requiredForRuntime = false;
  const empty = stage();empty.planes[4].assets = [];
  const coverage = productionCoverage([], [noReceipt, draft, incomplete, optionalOnly, empty]);
  assert.equal(coverage.arenas.reviewedKits, 0);
  assert.equal(coverage.arenas.playable, 0);
});

test('the shared vehicle effect library is not a fifty-first catalogue vehicle', () => {
  const coverage = productionCoverage([], []);
  assert.equal(coverage.vehicles.requested, 50);
  assert(coverage.vehicles.entriesWithNonRejectedDrafts <= coverage.vehicles.entriesWithSourceArt);
  assert(coverage.vehicles.entriesWithSourceArt <= 50);
});
