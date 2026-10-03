import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

// Execute production TypeScript in memory. No esbuild/native binary or emitted
// bundle, and no substitutions of the story reducer, roster or arena catalogue.
const loader = homeworldSceneSsrV78();
const C = loader.load('app/game/systems/pitCharacterChroniclesV79.ts');
const combat = loader.load('app/game/systems/pitCombat.ts');
const roster = loader.load('app/game/systems/pitRosterExpansion.ts');
const owner = '2026-10-03T08:00:00.000Z';
const create = id => C.createPitCharacterChronicleRunV79(id, owner, 'test-run-' + id);
function fight(run) {
  let next = run;
  while (['intro', 'post', 'defeat'].includes(next.phase)) next = C.advancePitCharacterChronicleV79(next);
  if (next.phase === 'pre') next = C.advancePitCharacterChronicleV79(next);
  assert.equal(next.phase, 'fight');
  return next;
}
function receipt(run, suffix, winner = 'hero') {
  const e = C.getPitCharacterChronicleEncounterV79(run);
  return { mode: 'cpu', resultId: 'result-' + suffix, runId: run.runId, encounterId: e.id,
    leftId: e.leftId, rightId: e.rightId, arenaId: e.arenaId,
    winnerId: winner === 'hero' ? e.leftId : winner === 'opponent' ? e.rightId : null };
}
function complete(id) {
  let run = create(id);
  for (let index = 0; index < 3; index++) {
    run = fight(run);
    run = C.applyPitCharacterChronicleResultV79(run, receipt(run, id + '-' + index)).run;
    assert.equal(run.phase, 'post');
    assert.equal(run.encounterIndex, index + 1);
  }
  run = C.advancePitCharacterChronicleV79(run);
  assert.equal(run.phase, 'outro');
  run = C.advancePitCharacterChronicleV79(run);
  assert.equal(run.phase, 'outro');
  run = C.advancePitCharacterChronicleV79(run);
  assert.equal(run.phase, 'finished');
  return run;
}

test('four distinct authored routes use actual combatants and existing arenas; no phantom cinematic art', () => {
  assert.equal(C.PIT_CHARACTER_CHRONICLE_ROUTES_V79.length, 4);
  assert.equal(new Set(C.PIT_CHARACTER_CHRONICLE_ROUTES_V79.map(r => r.title)).size, 4);
  const sequences = new Set();
  for (const route of C.PIT_CHARACTER_CHRONICLE_ROUTES_V79) {
    assert.equal(route.encounters.length, 3);
    assert.equal(route.intro.length, 2); assert.equal(route.outro.length, 2);
    assert.ok(route.biographySources.every(ref => /^https:\/\//.test(ref.url)));
    assert.match(route.continuity, /[Rr]econstit|[Ss]imulation/);
    sequences.add(route.encounters.map(e => e.rightId + '@' + e.arenaId).join('|'));
    for (const e of route.encounters) {
      assert.ok(combat.PIT_FIGHTERS[e.leftId]); assert.ok(combat.PIT_FIGHTERS[e.rightId]);
      assert.notEqual(e.leftId, e.rightId); assert.ok(combat.PIT_ARENAS[e.arenaId]);
      assert.equal(e.mode, 'cpu'); assert.equal(e.continuity, 'ritual-reconstruction');
      assert.ok(e.before.length > 30 && e.after.length > 30 && e.challenge.length > 3);
    }
    for (const p of [...route.intro, ...route.outro]) {
      assert.ok(combat.PIT_ARENAS[p.arenaId]); assert.ok(combat.PIT_FIGHTERS[p.focusId]);
      assert.equal(p.illustrationKind, 'existing-stage-and-portrait');
    }
  }
  assert.equal(sequences.size, 4);
});

test('all runtime roster entries have honest archives, only four advertise playable authored stories', () => {
  assert.equal(C.PIT_CHARACTER_CHRONICLE_ARCHIVE_IDS_V79.length, roster.PIT_VERSUS_FIGHTER_IDS.length);
  let authored = 0;
  for (const id of roster.PIT_VERSUS_FIGHTER_IDS) {
    const archive = C.getPitCharacterChronicleStatusV79(id);
    assert.equal(archive.name, roster.getPitFighterProfile(id).name);
    assert.equal(archive.sourceWork, roster.getPitFighterProfile(id).sourceWork);
    if (archive.status === 'authored-reconstruction') authored++;
    else { assert.equal(archive.route, null); assert.match(archive.limitation, /non produite/); }
  }
  assert.equal(authored, 4);
  assert.equal(C.getPitCharacterChronicleStatusV79('not-a-hunter'), null);
  assert.equal(C.getPitCharacterChronicleRouteV79('jungle-hunter'), null);
});

for (const id of C.PIT_CHARACTER_CHRONICLE_CURATED_IDS_V79) {
  test(id + ': exact three victories then two outro pages, serializable owner-bound ending', () => {
    const run = complete(id);
    assert.equal(run.results.length, 3); assert.equal(run.continuesRemaining, 2);
    assert.deepEqual(C.parsePitCharacterChronicleRunV79(C.serializePitCharacterChronicleRunV79(run), owner), run);
    assert.deepEqual(C.advancePitCharacterChronicleV79(run), run);
    assert.deepEqual(C.checkpointPitCharacterChronicleV79(run), run);
  });
}

test('serialize/reload of a pending real duel restarts its pre scene without a victory or spent continue', () => {
  let run = fight(create('tracker'));
  run = C.applyPitCharacterChronicleResultV79(run, receipt(run, 'first')).run;
  run = fight(run);
  const restored = C.parsePitCharacterChronicleRunV79(C.serializePitCharacterChronicleRunV79(run), owner);
  assert.equal(restored.phase, 'pre'); assert.equal(restored.encounterIndex, 1);
  assert.equal(restored.results.length, 1); assert.equal(restored.continuesRemaining, 2);
  assert.deepEqual(C.getPitCharacterChronicleEncounterV79(restored), C.getPitCharacterChronicleEncounterV79(run));
  assert.equal(run.phase, 'fight'); // Serialization does not mutate live state.
});

test('result replay is idempotent but the same id cannot carry a contradictory actor, stage or outcome', () => {
  const live = fight(create('greyback')), r = receipt(live, 'once');
  const settled = C.applyPitCharacterChronicleResultV79(live, r);
  const again = C.applyPitCharacterChronicleResultV79(settled.run, r);
  assert.equal(settled.applied, true); assert.equal(again.applied, false);
  assert.deepEqual(again.run, settled.run);
  for (const patch of [{ winnerId: r.rightId }, { rightId: 'berserker' }, { arenaId: 'the-pit' }, { encounterId: 'wrong' }]) {
    assert.throws(() => C.applyPitCharacterChronicleResultV79(settled.run, { ...r, ...patch }));
  }
  assert.equal(live.results.length, 0);
});

test('non CPU, foreign run, wrong opponent/stage, unknown winner and out-of-order callback are rejected', () => {
  const live = fight(create('theta')), r = receipt(live, 'foreign');
  for (const patch of [{ mode: 'arcade' }, { runId: 'other-run' }, { leftId: 'tracker' },
    { rightId: 'tracker' }, { arenaId: 'the-pit' }, { winnerId: 'tracker' },
    { encounterId: C.getPitCharacterChronicleRouteV79('theta').encounters[1].id }, { resultId: '' }]) {
    assert.throws(() => C.applyPitCharacterChronicleResultV79(live, { ...r, ...patch }));
  }
  assert.throws(() => C.applyPitCharacterChronicleResultV79(C.checkpointPitCharacterChronicleV79(live), r));
});

test('two recoveries are real defeats; third defeat fails and never opens the ending', () => {
  let run = create('machiko-noguchi');
  for (let index = 0; index < 3; index++) {
    run = fight(run);
    run = C.applyPitCharacterChronicleResultV79(run, receipt(run, 'loss-' + index, 'opponent')).run;
    assert.equal(run.encounterIndex, 0);
    assert.equal(run.continuesRemaining, Math.max(0, 1 - index));
    assert.equal(run.phase, index < 2 ? 'defeat' : 'failed');
  }
  assert.deepEqual(C.advancePitCharacterChronicleV79(run), run);
  assert.equal(C.normalizePitCharacterChronicleRunV79({ ...run, phase: 'outro' }), null);
  assert.equal(C.normalizePitCharacterChronicleRunV79({ ...run, continuesRemaining: 2 }), null);
});

test('a draw returns to the same chapter without spending a continue or counting a victory', () => {
  const live = fight(create('tracker'));
  const run = C.applyPitCharacterChronicleResultV79(live, receipt(live, 'draw', 'draw')).run;
  assert.equal(run.phase, 'pre'); assert.equal(run.encounterIndex, 0);
  assert.equal(run.continuesRemaining, 2); assert.equal(run.results.length, 1);
  assert.ok(C.normalizePitCharacterChronicleRunV79(run));
});

test('malformed, future-version, wrong-owner and forged result-history saves cannot fabricate an ending', () => {
  const run = complete('greyback');
  for (const patch of [{ version: 2 }, { contentVersion: 2 }, { routeId: 'wrong' },
    { ownerSaveCreatedAt: 'not-a-date' }, { runId: '' }, { page: 1 }, { phase: 'fight' },
    { results: [] }, { encounterIndex: 2 }, { results: [run.results[0], run.results[0], run.results[2]] },
    { results: [{ ...run.results[0], arenaId: 'the-pit' }, ...run.results.slice(1)] },
    { results: [run.results[1], run.results[0], run.results[2]] }]) {
    assert.equal(C.normalizePitCharacterChronicleRunV79({ ...run, ...patch }, owner), null);
  }
  assert.equal(C.parsePitCharacterChronicleRunV79(JSON.stringify(run), '2026-10-04T08:00:00.000Z'), null);
  assert.equal(C.parsePitCharacterChronicleRunV79('{', owner), null);
  assert.equal(C.parsePitCharacterChronicleRunV79(' '.repeat(32769), owner), null);
  assert.equal(C.normalizePitCharacterChronicleRunV79(new Proxy({}, { get() { throw Error('hostile'); } })), null);
});

test('result history has a bounded size instead of silently losing receipts on long draw retries', () => {
  let run = fight(create('tracker'));
  for (let index = 0; index < C.PIT_CHARACTER_CHRONICLE_MAX_RESULTS_V79; index++) {
    run = C.applyPitCharacterChronicleResultV79(run, receipt(run, 'draw-' + index, 'draw')).run;
    run = fight(run);
  }
  assert.throws(() => C.applyPitCharacterChronicleResultV79(run, receipt(run, 'overflow')));
  assert.equal(run.results.length, 24);
});

test('separate owner namespace and no campaign/historical Arcade persistence dependencies', () => {
  const source = fs.readFileSync('app/game/systems/pitCharacterChroniclesV79.ts', 'utf8');
  assert.doesNotMatch(source, /from\s+['"]\.\/(?:pitSave|pitArcade|campaign|clanChronicle|\.\.\/save)/);
  const run = complete('theta');
  assert.deepEqual(Object.keys(run).sort(), ['contentVersion', 'continuesRemaining', 'encounterIndex', 'fighterId',
    'ownerSaveCreatedAt', 'page', 'phase', 'results', 'routeId', 'runId', 'version'].sort());
  assert.notEqual(C.pitCharacterChronicleStorageKeyV79(owner), C.pitCharacterChronicleStorageKeyV79('2026-10-04T08:00:00.000Z'));
  assert.match(C.pitCharacterChronicleStorageKeyV79(owner), /the-pit-character-chronicles\.v1\./);
  assert.throws(() => C.createPitCharacterChronicleRunV79('jungle-hunter', owner, 'run'));
});
