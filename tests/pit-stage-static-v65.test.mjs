import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {build} from 'esbuild';
const compiled=await build({stdin:{contents:`export * from './app/game/pitStageCompositionV65';export * from './app/game/pitStageCompositionV63';export {PIT_ARENA_PRODUCTION_MANIFEST,resolvePitArenaProductionKit} from './app/game/pitArenaProduction';export {getPitArenaArtPaths} from './app/game/pitArenaRendering';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const manifest=api.PIT_STAGE_COMPOSITION_V65,sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=id=>api.PIT_ARENA_PRODUCTION_MANIFEST.stages.find(s=>s.catalogueId===id);
const original=id=>source(id).planes.map(p=>({...p,assets:p.assets.map(a=>api.applyPitStageCompositionV63(id,a))}));
test('six revisions preserve187 runtime identities, historical files and six independent rendering passes',()=>{
 assert.deepEqual(manifest.stages.map(s=>Number(s.stageId.split('-')[1])),[12,20,36,50,69,76]);
 assert.equal(api.PIT_ARENA_PRODUCTION_MANIFEST.stages.length,187);
 const baseline=JSON.stringify(api.PIT_ARENA_PRODUCTION_MANIFEST);
 for(const stage of manifest.stages){const s=source(stage.stageId),kit=api.resolvePitArenaProductionKit(s.legacyRuntimeArenaId??s.runtimeExtension.arenaId);
  assert(kit);assert.deepEqual(kit.planes.map(p=>p.id),['P0','P1','P2','P3','P4','P5']);
  assert.equal(kit.paths.filter(p=>p.includes('/v65/')).length,2);
  assert.equal(kit.paths.length,4,'two native PNGs and two reused floor PNGs, never six new images');
  assert(kit.planes.every(p=>p.assets.every(a=>!a.animation&&!a.ambientMotion)));
  const historicalDecor=s.planes.filter(p=>p.id!=='P4').flatMap(p=>p.assets.flatMap(a=>a.frames.map(f=>f.path)));
  assert(kit.paths.every(p=>!historicalDecor.includes(p)));assert(kit.requiredPaths.every(p=>kit.paths.includes(p)));
  const floorSource=s.number===36?source('arena-020-trone-fracture'):s;
  assert.deepEqual(kit.planes.find(p=>p.id==='P4').assets.flatMap(a=>a.frames.map(f=>f.path)),floorSource.planes.find(p=>p.id==='P4').assets.flatMap(a=>a.frames.map(f=>f.path)));
 }assert.equal(JSON.stringify(api.PIT_ARENA_PRODUCTION_MANIFEST),baseline);
});
test('source bindings reject stale assets and do not affect unrelated arenas',()=>{
 for(const stage of manifest.stages){const planes=original(stage.stageId),stale=structuredClone(planes);stale[0].assets[0].frames[0].generation.sha256='0'.repeat(64);
  assert.strictEqual(api.applyPitStageCompositionV65(stage.stageId,stale),stale);
  assert.strictEqual(api.applyPitStageCompositionV65('arena-not-in-v65',planes),planes);
  const before=JSON.stringify(planes);api.applyPitStageCompositionV65(stage.stageId,planes);assert.equal(JSON.stringify(planes),before);
 }
});
test('invalid native paths, alpha, source rectangles, animation and duplicate registrations cannot enter the renderer',()=>{
 const entry=manifest.stages[0],planes=original(entry.stageId);
 const mutations=[m=>m.stages.push(structuredClone(m.stages[0])),m=>m.stages[0].planes.pop(),
  m=>m.stages[0].planes[0].assets[0].frames[0].path='https://example.com/wrong.png',
  m=>m.stages[0].planes[1].assets[0].frames[0].generation.hasAlpha=false,
  m=>m.stages[0].planes[1].assets[0].frames[0].generation.sha256='0'.repeat(64),
  m=>m.stages[0].planes[1].assets[0].sourceCrop.width=99999,
  m=>m.stages[0].planes[1].assets[0].sourceCrop={...m.stages[0].planes[2].assets[0].sourceCrop},
  m=>m.stages[0].planes[2].assets[0].animation={fps:6,loop:true,reducedMotionFrame:0},
  m=>m.stages[0].floorCorrections[0].height=Infinity,
  m=>m.stages[0].floorCorrections[0].sourceCrop.y=-1,
  m=>m.stages[0].planes[0].assets[0].frames[0].review.evidenceRecorded=false];
 for(const mutate of mutations){const bad=structuredClone(manifest);mutate(bad);assert.throws(()=>api.applyPitStageCompositionV65(entry.stageId,planes,bad),/Invalid V65/);}
 const shared=manifest.stages.find(s=>s.stageId.includes('036'));
 for(const change of [r=>r.stageId='missing-stage',r=>r.assetId='missing-asset',r=>r.sha256='0'.repeat(64)]){const bad=structuredClone(manifest);change(bad.stages.find(s=>s.stageId===shared.stageId).floorCorrections[0].librarySource);assert.throws(()=>api.applyPitStageCompositionV65(shared.stageId,original(shared.stageId),bad),/Invalid V65/);}
});
test('native files match receipts and all reused contact/fascia crops are solid without image edits',async()=>{
 const checked=new Set();for(const entry of manifest.stages){
  const kit=api.resolvePitArenaProductionKit(source(entry.stageId).legacyRuntimeArenaId??entry.stageId);
  for(const plane of kit.planes)for(const asset of plane.assets){const frame=asset.frames[0],bytes=await fs.readFile('public'+frame.path);assert.equal(sha(bytes),frame.generation.sha256);
   const meta=await sharp(bytes).metadata();assert.equal(meta.width,frame.generation.width);assert.equal(meta.height,frame.generation.height);
   if(plane.id!=='P4'||checked.has(frame.path))continue;checked.add(frame.path);
   const r=asset.sourceCrop,{data,info}=await sharp(bytes).extract({left:r.x,top:r.y,width:r.width,height:r.height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   for(let i=3;i<data.length;i+=info.channels)assert(data[i]>=250,`${entry.stageId}/${asset.id}: transparent floor pixel`);
  }
 }assert.equal(checked.size,4,'two unchanged floor families, including the explicit 020-to-036 reuse');
});
test('every superseded native source remains byte identical, and each new atlas contains four distinct static drawings',async()=>{
 const checked=new Set();
 for(const entry of manifest.stages){
  for(const plane of source(entry.stageId).planes)for(const asset of plane.assets)for(const frame of asset.frames){if(checked.has(frame.path))continue;checked.add(frame.path);assert.equal(sha(await fs.readFile('public'+frame.path)),frame.generation.sha256,`Historical source preserved: ${frame.path}`);}
  const hashes=[];for(const plane of entry.planes.filter(p=>p.id!=='P0')){const asset=plane.assets[0],r=asset.sourceCrop;hashes.push(sha(await sharp('public'+asset.frames[0].path).extract({left:r.x,top:r.y,width:r.width,height:r.height}).raw().toBuffer()));}
  assert.equal(new Set(hashes).size,4,'Different authored objects, not four references counted as four drawings');
 }
});
