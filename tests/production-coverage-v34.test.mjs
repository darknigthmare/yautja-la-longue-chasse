import test from 'node:test';
import assert from 'node:assert/strict';
import { productionCoverage, readProductionSpriteRegistry } from '../scripts/production-coverage-v34.mjs';

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

test('the six masked V50 movement sheets add only reviewed partial coverage, not walks or complete movesets', () => {
  const coverage = productionCoverage([], []);
  // V50 adds three identities (Falconer, Scarface, Enforcer). Ahab, Wolf and
  // Celtic already existed; this report counts identities, not appearances.
  assert.equal(coverage.hunters.runtimeFighters, 17);
  // Six new drawings for Ahab form eight oriented clips; the five other
  // supplied appearances each add six. Reusing a pose does not add drawings.
  assert.equal(coverage.hunters.validatedClips, 315 + 6 + 12 + 4 + 10 - 6 + 12 + 4,
    'V62 adds two Emissary idle animations and two declared held entries, never a complete moveset');
  assert.equal(coverage.hunters.completeMovesets, 0);
  assert.equal(coverage.completeGameImplied, false);
  const registry = readProductionSpriteRegistry();
  assert.equal(registry.filter(entry => !entry.atlas.id.endsWith('-v53') && !entry.atlas.id.endsWith('-v62') && !['valkyrie-hammer-v57', 'jungle-final-duel-v57-held-poses', 'feral-actions-v59'].includes(entry.atlas.id)).reduce((sum, entry) => sum + entry.atlas.clips.filter(clip => !clip.id.startsWith('pit.presentation.')).length, 0), 309,
    'Historical/V50 coverage loses only the six superseded Feral heavy phases');
  const movement = registry.filter(entry => entry.atlas.id.endsWith('-v50'));
  assert.deepEqual(movement.map(entry => entry.fighterId).sort(),
    ['user-ahab', 'wolf', 'falconer', 'scarface', 'enforcer', 'celtic'].sort());
  assert.ok(movement.every(entry => entry.variantId?.includes('-avec-casque-')),
    'New coverage is owned only by the reviewed supplied masked appearances');
  for (const entry of movement) {
    const permitted = ['pit.air.jump.rise', 'pit.air.jump.apex', 'pit.air.jump.fall'];
    if (entry.fighterId === 'user-ahab') permitted.push('crouch');
    assert.deepEqual(entry.atlas.clips.map(clip => [clip.id, clip.facing].join(':')).sort(),
      permitted.flatMap(id => ['right', 'left'].map(facing => [id, facing].join(':'))).sort());
    assert.equal(entry.atlas.clips.some(clip => clip.id === 'walk' || clip.id === 'walk-backward'), false,
      'Rejected walk cycles must not be reclassified as delivered movements');
  }
});

test('V51 adds exactly six presentation clips for the reviewed masked Jungle Hunter, not a complete moveset', () => {
  const registry = readProductionSpriteRegistry();
  const dedicated = registry.filter(entry => entry.atlas.id.endsWith('-v51'));
  assert.equal(dedicated.length, 1);
  const [entry] = dedicated;
  assert.equal(entry.atlas.id, 'jungle-hunter-masked-round-presentation-v51');
  assert.equal(entry.fighterId, 'jungle-hunter');
  assert.equal(entry.variantId, 'jungle-hunter-avec-casque-53f4eb349a');
  assert.deepEqual(entry.atlas.clips.map(clip => [clip.id, clip.facing, clip.frames.length, clip.loop, clip.ticksPerSecond, clip.status].join(':')).sort(),
    ['intro', 'victory', 'defeat'].flatMap(kind => ['right', 'left'].map(facing =>
      ['pit.presentation.' + kind, facing, 3, false, 60, 'validated'].join(':'))).sort());
  const coverage = productionCoverage([], []);
  assert.equal(coverage.hunters.runtimeFighters, 17);
  assert.equal(coverage.hunters.validatedClips, 357,
    'The six V51 clips remain unchanged; V62 adds only four declared entries');
  assert.equal(coverage.hunters.completeMovesets, 0);
  assert.equal(coverage.completeGameImplied, false);
});

test('imported V62 entries retain two animated idles and two honest held stances in the real registry', () => {
  const entries = readProductionSpriteRegistry().filter(entry => entry.atlas.id.endsWith('-v62'));
  assert.equal(entries.length, 2);
  assert(entries.every(entry => entry.fighterId === 'user-emissary-phg'));
  const animated=entries.find(entry=>!entry.heldPoseClips),held=entries.find(entry=>entry.heldPoseClips);
  assert.deepEqual(animated.atlas.clips.map(clip=>[clip.facing,clip.frames.length,clip.loop]), [['right',6,true],['left',6,true]]);
  assert.deepEqual(held.atlas.clips.map(clip=>[clip.facing,clip.frames.length,clip.loop]), [['right',1,false],['left',1,false]]);
  assert.equal(productionCoverage([],[]).hunters.completeMovesets,0);
});
