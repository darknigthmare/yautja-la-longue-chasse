import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {assertHistoricalArenasUnchanged,assertV43AssetPath,resolveV43AssetFile,parseArenaNumbers,createPlannedScreenStage,invalidateScreenCompositionApproval,orderScreenArenaAssembly,resolveV43ReceiptFile} from '../scripts/lib/pit-screen-arena-v43.mjs';
import {projectPitArenaRuntimeData} from '../scripts/build-pit-arena-runtime-v33.mjs';
const manifest=JSON.parse(await fs.readFile('art-source/v33/pit-arenas/production-manifest.json','utf8'));
const bundle=await build({stdin:{contents:'export * from "./app/game/systems/pitScreenArenas"; export * from "./app/game/systems/pitArenaExtensions"; export * from "./app/game/pitArenaProduction";',loader:'ts',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));

test('nine confirmed films have three unique reference adaptations each, excluding Alien-only works',()=>{
 assert.equal(api.PIT_SCREEN_ARENA_WORKS.filter(w=>w.kind==='film').length,9);assert.equal(api.PIT_SCREEN_ARENA_WORKS.filter(w=>w.kind==='game').length,3);assert.equal(api.PIT_SCREEN_ARENA_DEFINITIONS.length,36);
 for(const work of api.PIT_SCREEN_ARENA_WORKS){assert(['film','game'].includes(work.kind));assert.equal(api.PIT_SCREEN_ARENA_DEFINITIONS.filter(a=>a.workId===work.id).length,3);}
 assert.deepEqual(api.PIT_SCREEN_ARENA_DEFINITIONS.map(a=>a.catalogueNumber),Array.from({length:36},(_,i)=>101+i));
 assert.equal(new Set(api.PIT_SCREEN_ARENA_DEFINITIONS.map(a=>a.id)).size,36);
 for(const value of [null,undefined,{},'__proto__','constructor','the-pit','arena-128-alien'])assert.equal(api.getPitScreenArenaMetadata(value),null);
 for(const definition of api.PIT_SCREEN_ARENA_DEFINITIONS){assert.equal(api.getPitScreenArenaMetadata(definition.id).workId,definition.workId);assert.equal(definition.fidelityClaim,`adaptation-2d-reference-${definition.kind}-not-certified-1to1`);}
});
test('planned reference metadata cannot unlock a duel or masquerade as six reviewed plans',()=>{
 for(const definition of api.PIT_SCREEN_ARENA_DEFINITIONS){
  const stage=createPlannedScreenStage(definition);assert.equal(stage.runtimeEnabled,false);assert.equal(stage.runtimeExtension,undefined);
  assert(stage.planes.every(p=>p.status==='planned'&&p.assets.every(a=>a.frames.every(f=>!f.generation&&!f.review&&!f.integration))));
  assert.equal(api.resolvePitArenaProductionKit(definition.id,{...manifest,stages:[stage]}),null);
  const actual=manifest.stages.find(s=>s.catalogueId===definition.id);
  if(!actual.runtimeEnabled)assert.equal(api.getPitArenaExtension(definition.id,definition.catalogueNumber),null);
 }
});
test('first 100 source records are byte-equivalent as serialized objects to V42',async()=>{
 await assertHistoricalArenasUnchanged(manifest);
 const changed=structuredClone(manifest);changed.stages[3].name+=' changed';
 await assert.rejects(()=>assertHistoricalArenasUnchanged(changed),/Historical 100/);
});
test('V43 paths reject traversal, foreign kit ownership, filenames and nested link remapping before import',async()=>{
 const id=api.PIT_SCREEN_ARENA_DEFINITIONS[0].id,asset='p0-depth',valid=`/game/sprites/v43/pit-arenas/${id}/${asset}.png`;
 assertV43AssetPath(id,asset,valid);assert.deepEqual(parseArenaNumbers('101,102,127'),[101,102,127]);
 for(const invalid of ['100','137','101,101','../101',''])assert.throws(()=>parseArenaNumbers(invalid));
 let calls=0;await assert.rejects(()=>resolveV43AssetFile(id,asset,'/../../escape.png',async()=>{calls++;}),/exact owned/);assert.equal(calls,0);
 for(const bad of [valid.replace(id,'arena-102-predator-1987-rocky-riverbank'),valid.replace('.png','.svg'),valid+'/../a.png'])assert.throws(()=>assertV43AssetPath(id,asset,bad));
 const root=path.resolve('fixture-physical-root');const expected=path.join(root,'pit-arenas',id,asset+'.png');
 assert.equal(await resolveV43AssetFile(id,asset,valid,async p=>p==='public/game/sprites/v43'?root:expected),expected);
 await assert.rejects(()=>resolveV43AssetFile(id,asset,valid,async p=>p==='public/game/sprites/v43'?root:path.resolve('outside.png')),/escapes/);
 await assert.rejects(()=>resolveV43AssetFile(id,asset,valid,async p=>p==='public/game/sprites/v43'?root:path.join(root,'different-kit','same.png')),/remaps/);
});
test('screen authoring notes and private receipt metadata do not enter browser projection',()=>{
 const copy=structuredClone(manifest);copy.stages[100].screenReference.privateNote='PRIVATE_SCREEN_SENTINEL';
 assert(!JSON.stringify(projectPitArenaRuntimeData(copy)).includes('PRIVATE_SCREEN_SENTINEL'));
});
test('V43 shared PNGs need exact explicit provenance, never copies or widened directories',()=>{
 const owner=manifest.stages.find(s=>s.number===101),target=manifest.stages.find(s=>s.number===102);
 assert(target.planes[1].assets[0].libraryRef);
 const instance=target.planes[1].assets[0];assert(api.isPitArenaAssetPathAuthorized(target,instance,manifest));
 assert.equal(instance.frames[0].path,owner.planes[1].assets[0].frames[0].path);
 const bad=structuredClone(instance);delete bad.libraryRef;assert.equal(api.isPitArenaAssetPathAuthorized(target,bad,manifest),false);
 assert.equal(api.isPitArenaAssetPathAuthorized({...target,assetDirectory:'/game/sprites/v43/pit-arenas'},bad,manifest),false);
});

test('explicit revisions revoke renderer, visual and application proofs without changing an unapproved request',()=>{
 const stage={number:101,runtimeEnabled:true,runtimeExtension:{rendererEvidence:'old-renderer',applicationEvidence:'old-app'},compositionVisualReview:{digest:'old'}};
 const before=structuredClone(stage);assert.throws(()=>invalidateScreenCompositionApproval(stage),/explicit review invalidation/);assert.deepEqual(stage,before);
 invalidateScreenCompositionApproval(stage,true);assert.equal(stage.runtimeEnabled,false);assert.equal(stage.runtimeExtension,undefined);assert.equal(stage.compositionVisualReview,undefined);
 assert.throws(()=>invalidateScreenCompositionApproval({...before,number:100},true),/Only additive/);
});

test('assembly resolves later-numbered owners before instances and rejects cycles',()=>{
 const entries=[{number:111,catalogueId:'school',modules:[{sourceCatalogueId:'forest'}]},{number:113,catalogueId:'forest',modules:[{sourceCatalogueId:'forest'}]}];
 assert.deepEqual(orderScreenArenaAssembly([111,113],entries),[113,111]);
 entries[1].modules.push({sourceCatalogueId:'school'});assert.throws(()=>orderScreenArenaAssembly([111,113],entries),/Cyclic/);
});

test('receipt paths reject invalid segments before any I/O and prohibit descendant links',async()=>{
 const id=api.PIT_SCREEN_ARENA_DEFINITIONS[0].id;let calls=0;
 for(const [owner,asset] of [['../../../outside','p0-depth'],[id,'../../secret']])await assert.rejects(()=>resolveV43ReceiptFile(owner,asset,async()=>{calls++;return 'unused';}));
 assert.equal(calls,0);
 const root=path.resolve('authoring-root'),file=path.join(root,id,'receipt-p0-depth.json');
 assert.equal(await resolveV43ReceiptFile(id,'p0-depth',async p=>p==='art-source/v43/pit-arenas'?root:file),file);
 await assert.rejects(()=>resolveV43ReceiptFile(id,'p0-depth',async p=>p==='art-source/v43/pit-arenas'?root:path.resolve('outside-receipt.json')),/escapes/);
});
