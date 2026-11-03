import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import sharp from 'sharp';

const data=JSON.parse(await fs.readFile('app/game/data/pitWorkbookSuperAnchorsV106.json','utf8'));
const admissions=JSON.parse(await fs.readFile(data.source.admissionsPath,'utf8'));
const plan=JSON.parse(await fs.readFile('app/game/data/pitWorkbookAnimationPlanV100.json','utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const built=await build({stdin:{contents:"export * from './app/game/systems/pitWorkbookProjectileSourceV106.ts'; export {measureSpriteContact} from './app/game/spriteContact.ts';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const source=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const pixels=async frame=>{
  const [left,top,width,height]=frame.rect;
  return sharp('public'+frame.path).ensureAlpha().extract({left,top,width,height}).raw().toBuffer();
};

test('two SUPER contracts preserve original source targets, identities and five byte-identical native pages',async()=>{
  assert.equal(data.source.originalWorkbookAvailable,false);
  assert.equal(sha(await fs.readFile(data.source.extractionPath)),data.source.extractionSha256);
  assert.equal(sha(await fs.readFile(data.source.admissionsPath)),data.source.admissionsSha256);
  const pages=new Set();
  assert.equal(data.entries.length,2);
  for(const entry of data.entries){
    const action=plan.fighters.flatMap(f=>f.actions).find(action=>action.id===entry.actionId);
    assert.equal(entry.sourceCell,entry.fighterId==='scar'?'T7':'T10');
    assert.equal(entry.sourceCell,action.cell);assert.equal(entry.sourceSheet,action.sheet);
    assert.match(action.sourceText,/24 \/ 8 \/ 48 images · dégâts 280 · coût 100 %/);
    assert.match(action.sourceText,/Si le premier contact est gardé, la scène ne se déclenche pas/);
    assert.deepEqual(Object.values(entry.sourceTargets),[24,8,48,280,100]);
    assert.equal(entry.newNativeDrawings,0);assert.equal(entry.partnerPainted,false);
    assert.match(action.sourceText,new RegExp('Corps : '+entry.bodyId));
    for(const [path,hash] of Object.entries(entry.sourceHashes)){
      pages.add(path);assert.equal(sha(await fs.readFile('public'+path)),hash,path);
    }
  }
  assert.equal(pages.size,5);
});

test('every SUPER drawing keeps the admitted native rectangle, pivot, fixed page scale and production floor contact',async()=>{
  for(const entry of data.entries){
    const admission=admissions.find(a=>a.actionId===entry.actionId),definition=admission.definition;
    assert.equal(entry.atlasId,admission.atlasId);
    assert.equal(entry.frames.length,12);
    for(const frame of entry.frames){
      const native=definition.atlas.clips.find(c=>c.facing===frame.facing).frames[frame.drawingIndex];
      assert.deepEqual(frame.rect,native.rect);assert.deepEqual(frame.pivot,native.pivot);
      assert.equal(frame.pageId,native.pageId);
      assert.equal(frame.bodyHeightPx,definition.pageBodyHeightPx?.[frame.pageId]??definition.bodyHeightPx);
      const actual=source.measureSpriteContact(await pixels(frame),frame.rect[2],frame.rect[3],frame.pivot[1]);
      assert.equal(frame.contactOffsetPx,actual.offsetY,entry.actionId+'/'+frame.facing+'/'+frame.drawingIndex);
    }
  }
});

test('confirmed branch alone draws extensions, with exact24/8/48 totals and firing/thrust windows',()=>{
  for(const entry of data.entries){
    const phases=source.getPitWorkbookSuperFramePlanV106(entry.fighterId);
    const total=key=>phases[key].reduce((sum,frame)=>sum+frame.durationTicks,0);
    assert.deepEqual(['startup','active','recoveryMiss','recoveryConfirmed'].map(total),[24,8,48,48]);
    assert.equal(entry.mechanicalAdaptation.damageBudget.opening+entry.mechanicalAdaptation.damageBudget.continuation.reduce((a,b)=>a+b,0),280);
    const extended=phases.recoveryConfirmed.find(frame=>frame.index===3);
    const before=phases.recoveryConfirmed.slice(0,phases.recoveryConfirmed.indexOf(extended)).reduce((sum,frame)=>sum+frame.durationTicks,0);
    assert.equal(32+before,entry.fighterId==='scar'?40:48);
    assert.ok(!phases.recoveryMiss.some(frame=>frame.index===2||frame.index===3));
    assert.equal(phases.active[0].index,entry.fighterId==='scar'?1:0);
    assert.deepEqual([...new Set([...phases.startup,...phases.active,...phases.recoveryConfirmed].map(frame=>frame.index))].sort(),[0,1,2,3,4,5]);
  }
  assert.equal(source.getPitWorkbookSuperFramePlanV106('jungle-hunter'),undefined);
});

test('short openers and full combistick contact use independent native BODY geometry, not a painted victim',()=>{
  for(const entry of data.entries) for(const frame of entry.geometry){
    const actual=source.getPitWorkbookSuperContactGeometryV106(entry.fighterId,frame.facing,frame.contact);
    assert.deepEqual(actual.rect,frame.rect);assert.deepEqual(actual.bounds,frame.bounds);
    assert.equal(actual.contactOffsetPx,frame.contactOffsetPx);
    const native=entry.frames.find(f=>f.facing===frame.facing&&f.drawingIndex===frame.drawingIndex);
    assert.deepEqual(frame.rect,native.rect);assert.deepEqual(frame.pivot,native.pivot);
    const [x,y,w,h]=frame.bounds;
    assert.ok(x>=0&&y>=0&&x+w<=frame.rect[2]&&y+h<=frame.rect[3]);
    const world=source.projectPitWorkbookShieldV106(actual,500,0,119);
    assert.ok(frame.facing==='right'?world.x>500:world.x+world.width<500);
    assert.ok(world.y>35&&world.y+world.height<115,'contact stays at the actual weapon height');
    if(frame.contact==='extension'){
      assert.equal(entry.fighterId,'scar');assert.equal(frame.drawingIndex,3);
      const opening=source.projectPitWorkbookShieldV106(source.getPitWorkbookSuperContactGeometryV106('scar',frame.facing,'opening'),500,0,119);
      assert.ok(world.width>opening.width*4,'only confirmed full thrust reaches extended distance');
    }
  }
  assert.equal(source.getPitWorkbookSuperContactGeometryV106('feral-hunter',1,'extension'),undefined);
  assert.equal(source.getPitWorkbookSuperContactGeometryV106('scar',0,'opening'),undefined);
});

test('Feral SUPER emitters are independently measured on the firing drawings, not reused S1 muzzles',async()=>{
  const entry=data.entries.find(e=>e.fighterId==='feral-hunter');
  for(const frame of entry.anchors){
    const actual=source.getPitWorkbookSuperProjectileAnchorV106('feral-hunter',frame.facing);
    assert.deepEqual(actual,frame);assert.equal(frame.drawingIndex,3);
    const native=entry.frames.find(f=>f.facing===frame.facing&&f.drawingIndex===3);
    assert.deepEqual(frame.rect,native.rect);assert.deepEqual(frame.pivot,native.pivot);
    const rgba=await pixels(frame),width=frame.rect[2],index=(frame.point[1]*width+frame.point[0])*4;
    assert.ok(rgba[index+3]<=8,'an open rail gap may correctly have transparent center');
    let adjacentOpaque=false;
    for(let dy=-5;dy<=5;dy++)for(let dx=-3;dx<=3;dx++)
      if(rgba[((frame.point[1]+dy)*width+frame.point[0]+dx)*4+3]>=128)adjacentOpaque=true;
    assert.ok(adjacentOpaque,'native rail borders the real muzzle gap');
    assert.notEqual(frame.path,source.getPitWorkbookProjectileAnchorV106('feral-hunter',frame.facing).path);
    const point=source.projectPitWorkbookAnchorV106(actual,500,0,119);
    assert.ok(frame.facing==='right'?point.x>500:point.x<500);
    assert.ok(point.y>70&&point.y<90);
  }
  assert.equal(source.getPitWorkbookSuperProjectileAnchorV106('scar',1),undefined);
  assert.equal(data.remaining.openIfAllFiveGameplayBindingsValidated,12);
  assert.equal(data.remaining.campaignStages,16);assert.equal(data.remaining.variantConstraints,14);
});
