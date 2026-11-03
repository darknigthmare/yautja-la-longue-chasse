import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import sharp from 'sharp';

const read = async path => JSON.parse(await fs.readFile(path, 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const data = await read('app/game/data/pitWorkbookEntityAnchorsV106.json');
const plan = await read('app/game/data/pitWorkbookAnimationPlanV100.json');
const admissions = await read('app/game/data/pitWorkbookAnimationsV100.json');
const built = await build({stdin:{contents:"export * from './app/game/systems/pitWorkbookProjectileSourceV106.ts'; export {PIT_SPRITE_SHEET_REGISTRY} from './app/game/pitSpriteSheetRegistry.ts'; export {measureSpriteContact} from './app/game/spriteContact.ts';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const source = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
const nativeFrame = (entry, frame) => {
  const admission = admissions.find(item => item.actionId === entry.actionId);
  const clips = admission.definition?.atlas?.clips ?? source.PIT_SPRITE_SHEET_REGISTRY.find(definition => definition.atlas.id === admission.atlasId)?.atlas.clips;
  if (entry.actionId === 'M_F006_S1') return clips.find(clip => clip.facing === frame.facing && clip.id === 'pit.stand.technique.feral-guided-bolts-v58.active').frames[0];
  const clip = clips.find(clip => clip.facing === frame.facing && clip.id === 'workbook.' + entry.actionId);
  return clip.frames[frame.startupFrameIndex ?? 2 + frame.activeFrameIndex];
};

test('V106 keeps the exact three source targets, cells, entity identities and historical source hashes', async () => {
  assert.equal(data.source.originalWorkbookAvailable, false);
  assert.equal(sha(await fs.readFile(data.source.extractionPath)), data.source.extractionSha256);
  assert.equal(sha(await fs.readFile(data.source.admissionsPath)), data.source.admissionsSha256);
  const expected = {M_F006_S1:[23,6,30,115,30,'P10','E_F006_bolt'],M_F006_S2:[9,18,25,70,15,'Q10','E_F006_shield'],M_F003_S3:[20,3,28,105,25,'R7','E_F003_plasma']};
  for (const entry of data.entries) {
    const action = plan.fighters.flatMap(f => f.actions).find(action => action.id === entry.actionId);
    const values = /Préparation \/ actif \/ récupération : (\d+) \/ (\d+) \/ (\d+) images · dégâts (\d+) · coût (\d+) %/.exec(action.sourceText).slice(1).map(Number);
    assert.deepEqual([...values,action.cell,entry.entityId],expected[entry.actionId]);
    assert.deepEqual(Object.values(entry.sourceTargets),values);
    assert.match(action.sourceText,new RegExp('Corps : ' + entry.bodyId + '\\n'));
    assert.match(action.sourceText,new RegExp('Entité : ' + entry.entityId));
    assert.equal(entry.sourceCell,action.cell);assert.equal(entry.sourceSheet,action.sheet);
    assert.equal(entry.newNativeDrawings,0);
    for (const [path,hash] of Object.entries(entry.sourceHashes)) assert.equal(sha(await fs.readFile('public'+path)),hash,path);
  }
  assert.equal(data.entries.length,3);
});

test('Feral reuses the admitted V59 active cell and explicitly retimes its references without changing history', () => {
  const entry = data.entries.find(item => item.actionId === 'M_F006_S1');
  const original = admissions.find(item => item.actionId === entry.actionId);
  assert.equal(original.atlasId,'feral-actions-v59');assert.equal(original.definition,undefined);
  assert.match(entry.visualReuse,/not a new independently authored/);
  assert.deepEqual(entry.historicalTiming,[9,5,18]);
  assert.deepEqual(Object.values(entry.v106FrameDurations).map(values=>values.reduce((a,b)=>a+b,0)),[23,6,30]);
  for (const frame of entry.anchors) {
    const actual = nativeFrame(entry,frame);
    assert.deepEqual(frame.rect,actual.rect);assert.deepEqual(frame.pivot,actual.pivot);
    assert.equal(frame.bodyHeightPx,470);assert.equal(frame.railSpacingPx,6);
    assert.deepEqual(source.getPitWorkbookProjectileAnchorV106('feral-hunter',frame.facing),frame);
  }
});

test('Scar release, recoil and charge anchors keep independent native rectangles, feet and fixed page references', () => {
  const entry = data.entries.find(item => item.actionId === 'M_F003_S3');
  const admission = admissions.find(item => item.actionId === entry.actionId);
  for (const frame of [...entry.anchors,...entry.chargeAnchors]) {
    const native = nativeFrame(entry,frame);
    assert.deepEqual(frame.rect,native.rect);assert.deepEqual(frame.pivot,native.pivot);
    assert.equal(frame.bodyHeightPx,admission.definition.pageBodyHeightPx[frame.pageId]);
    assert.equal(frame.bodyOcclusion,true);
  }
  assert.deepEqual(entry.anchors.map(frame=>[frame.rect[0]+frame.point[0],frame.rect[1]+frame.point[1]]),[[448,420],[1059,422],[425,432],[1183,432]]);
  assert.deepEqual(entry.chargeAnchors.map(frame=>[frame.rect[0]+frame.point[0],frame.rect[1]+frame.point[1]]),[[1107,109],[1107,126]]);
  assert.match(entry.measurement,/REAR caps/);
});

test('native apertures and the historical open rail gap retain independent unreflected source directions', async () => {
  for (const entry of data.entries.filter(item=>item.anchors)) {
    for (const frame of [...entry.anchors,...entry.chargeAnchors??[]]) {
      const absolute={left:frame.rect[0]+frame.point[0],top:frame.rect[1]+frame.point[1],width:1,height:1};
      const pixel=await sharp('public'+frame.path).ensureAlpha().extract(absolute).raw().toBuffer();
      if (entry.actionId === 'M_F006_S1' && frame.facing === 'right') {
        assert.equal(frame.anchorKind,'open-rail-emission-gap');
        assert.ok(pixel[3]<=2,'historical center stays in the open rail gap');
        const rail=await sharp('public'+frame.path).ensureAlpha().extract({...absolute,top:absolute.top-2}).raw().toBuffer();
        assert.ok(rail[3]>=128,'the independently measured adjacent native rail remains2px above the emitter');
      } else assert.ok(pixel[3]>=128,entry.actionId+'/'+frame.facing+': aperture is not visible native paint');
    }
    const right=entry.anchors.find(frame=>frame.facing==='right'),left=entry.anchors.find(frame=>frame.facing==='left');
    assert.notEqual(left.path,right.path);
    assert.notEqual(left.point[0],right.rect[2]-right.point[0]);
  }
});

test('shield geometry follows the real V100 guard and edge drawings with a declared conservative window split', () => {
  const entry=data.entries.find(item=>item.actionId==='M_F006_S2');
  assert.equal(entry.atlasId,'feral-workbook-s2-v100');
  assert.deepEqual(entry.guardWindowActiveTicks,[0,8]);assert.deepEqual(entry.edgeWindowActiveTicks,[9,17]);
  for (const frame of entry.geometry) {
    // S2 native frames are deployment0, guard1, edge2, recoil3, fold4, return5.
    const admission=admissions.find(item=>item.actionId===entry.actionId);
    const actual=admission.definition.atlas.clips.find(clip=>clip.facing===frame.facing).frames[1+frame.activeFrameIndex];
    assert.deepEqual(frame.rect,actual.rect);assert.deepEqual(frame.pivot,actual.pivot);
    const [x,y,w,h]=frame.bounds;
    assert.ok(x>=0&&y>=0&&x+w<=frame.rect[2]&&y+h<=frame.rect[3]);
    const box=source.projectPitWorkbookShieldV106(frame,500,0,119);
    assert.ok(frame.facing==='right'?box.x>500:box.x+box.width<500);
    assert.ok(box.y>40&&box.y+box.height<110,'enclosed visible shield, no full-height invulnerability');
  }
});

test('source projection applies the exact production alpha contact correction to every native cell', async () => {
  for (const entry of data.entries) for (const frame of [...entry.anchors??[],...entry.chargeAnchors??[],...entry.geometry??[]]) {
    const [left,top,width,height]=frame.rect;
    const pixels=await sharp('public'+frame.path).ensureAlpha().extract({left,top,width,height}).raw().toBuffer();
    const actual=source.measureSpriteContact(pixels,width,height,frame.pivot[1]);
    assert.equal(frame.contactOffsetPx,actual.offsetY,entry.actionId+'/'+frame.facing);
    const scale=119/frame.bodyHeightPx;
    if(frame.point) assert.equal(source.projectPitWorkbookAnchorV106(frame,500,10,119).y,
      10+(frame.pivot[1]-frame.point[1]-actual.offsetY)*scale);
    if(frame.bounds) assert.equal(source.projectPitWorkbookShieldV106(frame,500,10,119).y,
      10+(frame.pivot[1]-frame.bounds[1]-frame.bounds[3]-actual.offsetY)*scale);
  }
});

test('world projection preserves native vertical height and rejects unsupported actors, faces or frames', () => {
  for (const facing of [-1,1]) {
    const scar=source.getPitWorkbookProjectileAnchorV106('scar',facing);
    const point=source.projectPitWorkbookAnchorV106(scar,500,10,119);
    assert.ok(point.y>98&&point.y<105,'head/shoulder-height shot is separately avoidable by crouching');
    assert.equal(source.projectPitWorkbookAnchorV106(scar,500,10,0),null);
  }
  assert.equal(source.getPitWorkbookProjectileAnchorV106('scar','right',2),undefined);
  assert.equal(source.getPitWorkbookProjectileAnchorV106('feral-hunter','left',1),undefined);
  assert.equal(source.getPitWorkbookProjectileAnchorV106('jungle-hunter',1),undefined);
  assert.equal(source.getPitWorkbookProjectileAnchorV106('scar',0),undefined);
  assert.equal(source.getPitWorkbookShieldGeometryV106('right',2),undefined);
  assert.equal(source.getPitWorkbookChargeAnchorV106('other'),undefined);
  assert.equal(source.projectPitWorkbookShieldV106(source.getPitWorkbookShieldGeometryV106('left'),NaN,0,119),null);
  assert.equal(data.remaining.openAtV105,17);assert.equal(data.remaining.openIfAllThreeGameplayBindingsValidated,14);
  assert.equal(data.remaining.campaignStages,16);assert.equal(data.remaining.variantConstraints,14);
});
