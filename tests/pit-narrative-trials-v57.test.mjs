import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import { build } from 'esbuild';

const bundle = await build({ stdin: { contents: [
  'systems/pitNarrativeTrialsV57', 'systems/pitCombat', 'systems/pitRosterExpansion', 'systems/pitArcade',
  'pitArenaProduction',
].map(name => `export * from './app/game/${name}';`).join('\n'), resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const p = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const source = JSON.parse(await fs.readFile('docs/v56-excel-priorities.json', 'utf8'));

test('four extracts preserve the workbook rival and scene, without manufacturing missing campaign opponents', async () => {
  assert.equal(p.PIT_NARRATIVE_TRIALS_V57.length, 4);
  assert.equal(new Set(p.PIT_NARRATIVE_TRIALS_V57.map(x => x.id)).size, 4);
  for (const trial of p.PIT_NARRATIVE_TRIALS_V57) {
    const row = source.p0Specifications.find(spec => spec.fighterId === trial.leftId);
    const cell = row.campaign.cells[trial.source.encounterCell];
    assert(cell.includes('7 — Combat rival'));
    assert(cell.includes('Adversaire : ' + trial.rightId));
    if (!trial.source.stageMapping) assert(cell.includes('Stage : ' + trial.arenaId));
    else assert.equal(trial.arenaId, 'arena-140-bad-blood-pine-barrens');
    assert(p.PIT_FIGHTERS[trial.leftId]); assert(p.PIT_FIGHTERS[trial.rightId]); assert(p.PIT_ARENAS[trial.arenaId]);
    assert(p.canPitFighterEnterMode(trial.leftId, 'cpu')); assert(!trial.rightId.startsWith('npc-'));
    assert.match(trial.continuity, /alternative|originale/);
    const kit = p.resolvePitArenaProductionKit(trial.arenaId); assert(kit); assert.equal(kit.planes.length, 6);
    for (const plane of kit.planes) for (const asset of plane.assets) for (const frame of asset.frames) await fs.access('public' + frame.path);
  }
  assert.equal(p.getPitNarrativeTrial('unknown'), null);
});

test('results from another fighter, venue, mode or unknown winner cannot resolve this extract', () => {
  const trial = p.PIT_NARRATIVE_TRIALS_V57[0];
  const result = { mode: 'cpu', leftId: trial.leftId, rightId: trial.rightId, arenaId: trial.arenaId, winnerId: trial.leftId, resultId: 'actual-result' };
  for (const patch of [{ mode: 'arcade' }, { leftId: 'tracker' }, { rightId: 'city-hunter' }, { arenaId: 'the-pit' }, { winnerId: 'unknown' }, { resultId: '' }]) {
    assert.equal(p.resolvePitNarrativeOutcome(trial, { ...result, ...patch }), null);
  }
  assert.equal(p.resolvePitNarrativeOutcome(trial, { ...result, winnerId: null }), 'draw');
  assert.equal(p.resolvePitNarrativeOutcome(trial, result), 'victory');
  assert.equal(p.resolvePitNarrativeOutcome(trial, { ...result, winnerId: trial.rightId }), 'defeat');
});

test('the actual Canvas callback branch resolves extension narratives without opening extension persistence', async () => {
  const canvas = await fs.readFile('app/game/PitCanvas.tsx', 'utf8');
  const playerLine = canvas.indexOf('const playerId = combat.fighters[0].definitionId;', canvas.indexOf('reportedMatchFrameRef.current !== null'));
  const effectStart = canvas.lastIndexOf('useEffect(() => {', playerLine) + 'useEffect(() => {'.length;
  const branchEnd = canvas.indexOf('if (mode === "descent")', playerLine);
  assert(playerLine > 0 && effectStart > 0 && branchEnd > playerLine);
  // Execute the real effect prelude, not a duplicate of its gate. The terminal
  // fixture isolates callback routing; the tests below exercise actual bouts.
  const callbackBundle = await build({ stdin: { contents: `
    import {isPitFirstEditionFighterId} from './app/game/systems/pitFirstEdition';
    export function report(combat, narrativeEncounter) {
      const calls = []; let enteredOrdinaryPersistence = false;
      const playbackReplay = false, reportedMatchFrameRef = {current:null};
      const recorderRef = {current:null}, matchResultIdRef = {current:'callback-fixture'}, mode = 'cpu';
      const setRecordedReplay = () => {}, setReplayNotice = () => {}, setAriaAnnouncement = () => {};
      const onNarrativeComplete = result => { calls.push(result); };
      const effect = () => { ${canvas.slice(effectStart, branchEnd)} enteredOrdinaryPersistence = true; };
      effect(); return {calls, enteredOrdinaryPersistence};
    }`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
  const callback = await import('data:text/javascript;base64,' + Buffer.from(callbackBundle.outputFiles[0].text).toString('base64'));
  for (const trial of p.PIT_NARRATIVE_TRIALS_V57.filter(item => ['greyback', 'machiko-noguchi'].includes(item.leftId))) {
    for (const winnerId of [trial.leftId, trial.rightId]) {
      const combat = p.createPitCombatState(trial.leftId, trial.rightId, { arenaId: trial.arenaId });
      combat.phase = 'match-over'; combat.matchWinnerId = winnerId;
      const narrative = callback.report(combat, trial);
      assert.equal(narrative.calls.length, 1); assert.equal(narrative.enteredOrdinaryPersistence, false);
      assert.equal(p.resolvePitNarrativeOutcome(trial, narrative.calls[0]), winnerId === trial.leftId ? 'victory' : 'defeat');
      assert.equal(narrative.calls[0].cosmeticRewardIds, undefined); assert.equal(narrative.calls[0].arcadeCompleted, undefined);
      assert.deepEqual(callback.report(combat, undefined), {calls: [], enteredOrdinaryPersistence: false});
    }
  }
});

for (const trial of p.PIT_NARRATIVE_TRIALS_V57) for (const winningSlot of [0, 1]) test(`${trial.id}: actual rounds resolve ${winningSlot === 0 ? 'victory' : 'defeat'} without touching historical arcade runs`, () => {
  const historicalRun = p.createPitArcadeRun('jungle-hunter');
  const before = p.serializePitArcadeRun(historicalRun);
  let combat = p.createPitCombatState(trial.leftId, trial.rightId, { arenaId: trial.arenaId });
  for (let tick = 0; tick < 18000 && combat.phase !== 'match-over'; tick++) {
    const actor = combat.fighters[winningSlot], target = combat.fighters[1 - winningSlot], input = [{}, {}];
    if (combat.phase === 'round') {
      if (Math.abs(actor.x - target.x) > 64) input[winningSlot] = target.x > actor.x ? { right: true } : { left: true };
      else if (target.phase !== 'knockdown' && target.wakeInvulnerabilityFrames === 0 && actor.phase === 'idle') input[winningSlot] = { attack: 'heavy' };
    }
    combat = p.stepPitCombat(combat, input);
  }
  assert.equal(combat.phase, 'match-over');
  const result = { mode: 'cpu', leftId: trial.leftId, rightId: trial.rightId, arenaId: combat.arenaId, winnerId: combat.matchWinnerId, resultId: trial.id + '-' + winningSlot };
  assert.equal(p.resolvePitNarrativeOutcome(trial, result), winningSlot === 0 ? 'victory' : 'defeat');
  assert.equal(p.serializePitArcadeRun(historicalRun), before);
  assert.equal(combat.fighters[winningSlot].roundsWon, 2);
});
