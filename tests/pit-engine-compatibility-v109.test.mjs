import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {getHistoricalExcelContextV109, EXCEL_HISTORY_COMMIT_V109} from '../scripts/historical-excel-context-v109.mjs';

const context = await getHistoricalExcelContextV109();
assert.equal(context.manifest.sourceCommit, EXCEL_HISTORY_COMMIT_V109);
assert.equal(EXCEL_HISTORY_COMMIT_V109, '2d88854b44c7cac14063f4445b8e0855646e7dec');
async function engine(root) {
  const bundle = await build({stdin: {contents: [
    "export * from './app/game/systems/pitCombat';",
    "export * from './app/game/systems/pitReplay';",
  ].join('\n'), resolveDir: root}, absWorkingDir: root, bundle: true, write: false, platform: 'node', format: 'esm'});
  return import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
}
// Only the explicit baseline bundle reads the immutable capsule. The current
// bundle resolves the actual current application, without import redirection.
const [baseline, current] = await Promise.all([engine(context.root), engine(path.resolve('.'))]);

function inputAt(frame, slot, id, recipe) {
  const tick = (frame + slot * 37) % 180;
  if (tick < 28) return slot === 0 ? {right: true} : {left: true};
  if (tick === 30) return {throw: true};
  if (tick >= 38 && tick < 47) return {guardHigh: true};
  if (tick === 52) return {attack: 'light'};
  if (tick === 71) return {attack: 'medium', ...(slot === 0 ? {right: true} : {left: true})};
  if (tick === 94) return {attack: 'heavy'};
  if (tick === 118) return recipe === 'workbook-v107' ? {workbookAction: id === 'feral-hunter' ? 'mine' : id === 'scar' ? 'shuriken' : 'projectile'} : {attack: 'technique'};
  if (tick === 137) return {jump: true};
  if (tick >= 142 && tick < 145) return {down: true, attack: 'light'};
  if (tick === 161) return {resource: true};
  return {};
}

const cases = [
  {name: 'V11 default Feral/Scar', fighters: ['feral-hunter', 'scar']},
  {name: 'V11 default Scar/Wolf', fighters: ['scar', 'wolf']},
  {name: 'V12 normals Feral/Scar', fighters: ['feral-hunter', 'scar'], recipe: 'workbook-v104'},
  {name: 'V13 source contact Scar/Feral', fighters: ['scar', 'feral-hunter'], recipe: 'workbook-v105'},
  {name: 'V14 projectile Feral/Wolf', fighters: ['feral-hunter', 'wolf'], recipe: 'workbook-v106'},
  {name: 'V15 devices Feral/Scar', fighters: ['feral-hunter', 'scar'], recipe: 'workbook-v107'},
  {name: 'V15 devices Scar/Feral', fighters: ['scar', 'feral-hunter'], recipe: 'workbook-v107'},
  {name: 'V15 source hero and third-party Wolf', fighters: ['feral-hunter', 'wolf'], recipe: 'workbook-v107'},
];
for (const scenario of cases) test('current ' + scenario.name + ' stays byte-identical to the reviewed V108 engine at every tick', () => {
  const options = {mode: 'training', ...(scenario.recipe ? {normalMoves: scenario.recipe} : {})};
  let oldState = baseline.createPitCombatState(...scenario.fighters, options);
  let liveState = current.createPitCombatState(...scenario.fighters, options);
  // Same declared model initial conditions in both independent engines make
  // source releases/throws observable; this is not a browser/campaign result.
  for (const state of [oldState, liveState]) {
    state.fighters[0].x = 400; state.fighters[1].x = 460;
    state.fighters.forEach(fighter => {fighter.traque = 1000;});
  }
  const oldDigest = createHash('sha256'), liveDigest = createHash('sha256');
  for (let frame = 0; frame < 900; frame++) {
    const inputs = scenario.fighters.map((id, slot) => inputAt(frame, slot, id, scenario.recipe));
    oldState = baseline.stepPitCombat(oldState, inputs); liveState = current.stepPitCombat(liveState, inputs);
    const expected = baseline.serializePitCombat(oldState), actual = current.serializePitCombat(liveState);
    assert.equal(actual, expected, `${scenario.name}, frame ${frame + 1}`);
    oldDigest.update(expected); liveDigest.update(actual);
    assert.deepEqual(current.deserializePitCombat(actual), liveState);
  }
  assert.equal(liveDigest.digest('hex'), oldDigest.digest('hex'));
});

test('current V11–V15 input archives retain the original complete bytes, outcomes and checksums', () => {
  for (const recipe of [undefined, 'workbook-v104', 'workbook-v105', 'workbook-v106', 'workbook-v107']) {
    const frames = Array.from({length: 1200}, (_, frame) => [inputAt(frame, 0, 'feral-hunter', recipe), inputAt(frame, 1, 'scar', recipe)]);
    const options = {fighters: ['feral-hunter', 'scar'], rules: {mode: 'match', ...(recipe ? {normalMoves: recipe} : {})}};
    const oldReplay = baseline.recordPitReplay(frames, options), newReplay = current.recordPitReplay(frames, options);
    assert.equal(current.serializePitReplay(newReplay), baseline.serializePitReplay(oldReplay), String(recipe));
    assert.deepEqual(current.playPitReplay(newReplay), baseline.playPitReplay(oldReplay));
    assert.deepEqual(current.normalizePitReplay(oldReplay), newReplay);
  }
});
