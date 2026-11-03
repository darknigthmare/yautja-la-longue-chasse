import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {build} from 'esbuild';

const extractionBytes = fs.readFileSync('docs/v56-excel-priorities.json');
const extraction = JSON.parse(extractionBytes);
const scope = JSON.parse(fs.readFileSync('app/game/data/pitWorkbookScopeV105.json'));
const built = await build({
  entryPoints: ['app/game/systems/pitWorkbookMovesV105.ts'],
  bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
});
const p = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
const keys = ['5L', '5M', '5H', '2L', '2M', '2H', 'jL', 'jM', 'jH', 'TH_F', 'TH_B', '6M', 'S1', 'S2', 'S3', 'S4', 'SUPER', 'EQUIP'];
const commonTargets = {
  '5L': [5,3,10,45,0], '5M': [9,4,16,70,0], '5H': [16,5,26,110,0],
  '2L': [6,3,12,35,0], '2M': [11,4,21,65,0], '2H': [14,5,29,90,0],
  jL: [6,3,12,35,0], jM: [10,5,18,65,0], jH: [15,6,24,100,0],
  TH_F: [8,3,30,110,0], TH_B: [10,3,32,110,0], '6M': [17,5,26,90,0],
  SUPER: [24,8,48,280,100], EQUIP: [20,0,20,0,0],
};
const specialTargets = {
  'feral-hunter': {S1:[23,6,30,115,30], S2:[9,18,25,70,15], S3:[16,7,24,110,10], S4:[34,90,30,105,35]},
  scar: {S1:[17,5,24,100,0], S2:[23,4,29,90,25], S3:[20,3,28,105,25], S4:[5,14,30,85,10]},
};

test('V105 source stays pinned without claiming access to the private workbook', () => {
  assert.equal(crypto.createHash('sha256').update(extractionBytes).digest('hex'), 'fc8e1c6c81de62d8966e04746ed0751b0eeefc62f0458728c818896ad79972f4');
  assert.equal(scope.source.originalAvailable, false);
  assert.equal(scope.source.baseline, 'V104');
});

test('36 moves retain every exact source cell and the source targets rather than legacy values', () => {
  assert.equal(p.PIT_WORKBOOK_MOVES_V105.length, 36);
  for (const fighter of scope.fighters) {
    const spec = extraction.p0Specifications.find(spec => spec.fighterId === fighter.fighterId);
    for (const [index, key] of keys.entries()) {
      const move = p.getPitWorkbookMoveV105(fighter.fighterId, key);
      assert.ok(move, fighter.fighterId + '/' + key);
      assert.equal(move.sheet, '05_MOVES_PROPOSES');
      assert.equal(move.cell, String.fromCharCode(68 + index) + fighter.sourceRow);
      assert.equal(move.sourceText, spec.moves.cells[move.cell]);
      assert.deepEqual([move.startup, move.active, move.recovery, move.damage, move.costPercent], commonTargets[key] ?? specialTargets[fighter.fighterId][key]);
      assert.match(move.sourceText, new RegExp('Corps : ' + move.bodyId + '\n'));
      assert.equal(new Set(move.entityIds).size, move.entityIds.length);
    }
  }
  assert.equal(p.getPitWorkbookMoveV105('jungle-hunter', '5L'), undefined);
  assert.equal(p.getPitWorkbookMoveV105('scar', 'UNKNOWN'), undefined);
  assert.equal(p.isPitWorkbookMoveKeyV105('INTRO'), false);
});

test('entity prerequisites, ambiguous height and zero-active inventory are not inferred away', () => {
  assert.deepEqual(p.getPitWorkbookMoveV105('feral-hunter', 'S1').entityIds, ['E_F006_bolt']);
  assert.deepEqual(p.getPitWorkbookMoveV105('feral-hunter', 'S2').entityIds, ['E_F006_shield']);
  assert.deepEqual(p.getPitWorkbookMoveV105('feral-hunter', 'S4').entityIds, ['E_F006_mine']);
  assert.deepEqual(p.getPitWorkbookMoveV105('scar', 'S2').entityIds, ['E_F003_shuriken']);
  assert.deepEqual(p.getPitWorkbookMoveV105('scar', 'S3').entityIds, ['E_F003_plasma']);
  assert.deepEqual(p.getPitWorkbookMoveV105('scar', 'S1').entityIds, []);
  assert.equal(p.getPitWorkbookMoveV105('scar', 'S1').guardLevelText, 'Selon trajectoire / prototype');
  for (const fighter of scope.fighters) {
    const equip = p.getPitWorkbookMoveV105(fighter.fighterId, 'EQUIP');
    assert.equal(equip.active, 0);
    assert.equal(equip.damage, 0);
    assert.match(equip.sourceText, /Les armes perdues ne réapparaissent pas/);
  }
});

test('16 presentation briefs retain their true triggers and conditional context', () => {
  assert.equal(p.PIT_WORKBOOK_PRESENTATIONS_V105.length, 16);
  for (const scene of p.PIT_WORKBOOK_PRESENTATIONS_V105) {
    const spec = extraction.p0Specifications.find(spec => spec.fighterId === scene.fighterId);
    assert.equal(scene.sheet, '07_PRESENTATIONS');
    assert.equal(scene.sourceText, spec.presentations.cells[scene.cell]);
    assert.ok(scene.sourceText.includes('Déclenchement : ' + scene.triggerText + '\n'));
  }
  assert.match(p.getPitWorkbookPresentationV105('scar', 'INTRO').sourceText, /version déjà initiée/);
  assert.match(p.getPitWorkbookPresentationV105('feral-hunter', 'CLEMENCE').triggerText, /entraînement \/ allié \/ option violence réduite/);
});

test('52 admitted BODY studies remain separate from 16 campaign stages and 14 variant constraints', () => {
  assert.equal(scope.fighters.flatMap(f => f.actions).length, 52);
  assert.equal(scope.fighters.flatMap(f => f.campaignStages).length, 16);
  assert.equal(scope.fighters.flatMap(f => f.variantConstraints).length, 14);
  for (const fighter of scope.fighters) {
    const spec = extraction.p0Specifications.find(spec => spec.fighterId === fighter.fighterId);
    assert.deepEqual(fighter.identity, spec.identity);
    for (const action of fighter.actions) {
      const cells = action.category === 'move' ? spec.moves.cells : spec.presentations.cells;
      assert.equal(action.sourceText, cells[action.cell]);
      assert.equal(action.nativeAdmission.reviewStatus, 'validated');
      assert.equal(action.nativeAdmission.partnerComposite, ['TH_F','TH_B','FATALITE_1','FATALITE_2','CLEMENCE'].includes(action.key));
    }
    assert.equal(fighter.actions.filter(action => action.baselineV104.gameplay === 'source-normal-recipe').length, 9);
    assert.equal(fighter.campaignStages.filter(stage => stage.sourceActionId === null).length, 5);
    for (const [index, stage] of fighter.campaignStages.entries()) {
      assert.equal(stage.ordinal, index + 1);
      assert.equal(stage.sourceText, spec.campaign.cells[stage.cell]);
      assert.equal(stage.admissionStatus, 'not-admitted-as-campaign');
      assert.equal(stage.sourceFrameCount, null);
      assert.ok(stage.visualNeeds.length > 0);
    }
    for (const variant of fighter.variantConstraints) {
      assert.equal(variant.sourceText, spec.variants.cells[variant.cell]);
      assert.equal(variant.assessment, 'not-measured-by-body-action-admissions');
    }
  }
});
