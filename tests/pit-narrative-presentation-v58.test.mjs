import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import { build } from 'esbuild';

const bundle = await build({ stdin: { contents: [
  'systems/pitNarrativeTrialsV57', 'systems/pitNarrativePresentationV58',
].map(name => `export * from './app/game/${name}';`).join('\n'), resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const p = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const source = JSON.parse(await fs.readFile('docs/v56-excel-priorities.json', 'utf8'));
const greyback = p.getPitNarrativeTrial('greyback-city-rival');

test('only the workbook clan trial opts into a nonlethal presentation, not every fight involving a named hunter', () => {
  assert.deepEqual(p.PIT_NARRATIVE_TRIALS_V57.filter(trial => trial.combatPolicy).map(trial => trial.id), ['greyback-city-rival']);
  const row = source.p0Specifications.find(spec => spec.fighterId === 'greyback');
  assert.match(row.campaign.cells.F18, /Épreuve de clan non létale/);
  assert.match(row.campaign.cells.H18, /duel non létal si mentor, allié ou rival d'épreuve/);
  assert(greyback.combatPolicy.sources.includes('08_CAMPAGNES!F18'));
  assert(greyback.combatPolicy.sources.includes('07_PRESENTATIONS!J18'));
  assert.match(greyback.continuity, /alternative/);
});

test('the clan trial reduces contact rings locally while every other encounter respects either user setting', () => {
  const before = JSON.stringify(p.PIT_NARRATIVE_TRIALS_V57);
  for (const requested of [false, true]) for (const trial of p.PIT_NARRATIVE_TRIALS_V57) {
    const presentation = p.resolvePitNarrativePresentation(trial, requested);
    assert.deepEqual(presentation, {
      nonLethalTrial: trial === greyback,
      reducedGore: trial === greyback || requested,
    });
  }
  assert.equal(JSON.stringify(p.PIT_NARRATIVE_TRIALS_V57), before, 'resolving the presentation must not mutate the catalogue');
});

test('a Greyback loss or draw stays an alternate nonlethal result; abandoning never awards success', () => {
  assert.match(p.pitNarrativeOutcomeDescription(greyback, 'defeat'), /City Hunter remporte/);
  assert.match(p.pitNarrativeOutcomeDescription(greyback, 'defeat'), /aucun des deux chasseurs n’est tué/);
  assert.match(p.pitNarrativeOutcomeDescription(greyback, 'defeat'), /branche alternative/);
  assert.match(p.pitNarrativeOutcomeDescription(greyback, 'draw'), /sans mise à mort/);
  for (const trial of p.PIT_NARRATIVE_TRIALS_V57) {
    assert.equal(p.pitNarrativeOutcomeDescription(trial, 'victory'), trial.victory);
    assert.match(p.pitNarrativeOutcomeDescription(trial, 'abandoned'), /Aucun succès ni récompense/);
    if (trial !== greyback) assert.doesNotMatch(p.pitNarrativeOutcomeDescription(trial, 'defeat'), /City Hunter|Greyback/);
  }
});
