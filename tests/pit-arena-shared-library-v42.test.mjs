import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {projectPitArenaRuntimeData,verifyPitArenaSourceReferences} from '../scripts/build-pit-arena-runtime-v33.mjs';
import {arenaCompositionDigest,libraryEntryFromOriginal,parseArenaNumbers,assertV42P0Path,resolveV42P0File} from '../scripts/lib/pit-arena-composition-v42.mjs';
const compiled=await build({stdin:{contents:'export * from "./app/game/pitArenaProduction";',loader:'ts',resolveDir:process.cwd()},write:false,bundle:true,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
function fixture(){
 const manifest=structuredClone(api.PIT_ARENA_PRODUCTION_MANIFEST);
 const origin=manifest.stages[2],stage=manifest.stages[3],original=origin.planes[4].assets[0];
 const entry=libraryEntryFromOriginal(origin,original);
 manifest.sharedLibrary=[entry];
 const asset={...structuredClone(original),libraryRef:entry.id};
 return {manifest,stage,asset,entry,origin,original};
}
test('foreign paths remain forbidden until the exact immutable source is explicitly admitted',()=>{
 const f=fixture();delete f.asset.libraryRef;
 assert.equal(api.isPitArenaAssetPathAuthorized(f.stage,f.asset,f.manifest),false);
 f.asset.libraryRef=f.entry.id;
 assert.equal(api.isPitArenaAssetPathAuthorized(f.stage,f.asset,f.manifest),true);
 f.asset.placements=[{x:0,y:430,width:350,height:35}];
 assert.equal(api.isPitArenaAssetPathAuthorized(f.stage,f.asset,f.manifest),true,'Authored instance placement is allowed');
});
test('neither target nor original may widen its asset directory to admit foreign files',()=>{
 const f=fixture();delete f.asset.libraryRef;
 f.stage.assetDirectory='/game/sprites/v34/pit-arenas';
 assert.equal(api.isPitArenaAssetPathAuthorized(f.stage,f.asset,f.manifest),false);
 f.stage.assetDirectory=f.origin.assetDirectory;
 assert.equal(api.isPitArenaAssetPathAuthorized(f.stage,f.asset,f.manifest),false);
 const g=fixture();g.origin.assetDirectory='/game/sprites/v34/pit-arenas';
 assert.equal(api.isPitArenaAssetPathAuthorized(g.stage,g.asset,g.manifest),false);
});
test('reference substitution, recursion, conflicting declarations and forged raster metadata fail closed',()=>{
 const mutations=[
  f=>{f.asset.libraryRef='constructor';},
  f=>{f.manifest.sharedLibrary.push(structuredClone(f.entry));},
  f=>{f.entry.sourceAssetId='absent';},
  f=>{f.original.libraryRef=f.entry.id;},
  f=>{f.asset.frames[0].path='https://foreign.invalid/image.png';},
  f=>{f.asset.frames[0].generation.sha256='0'.repeat(64);},
  f=>{f.entry.frames[0].width++;},
  f=>{f.original.frames[0].generation.height++;},
  f=>{f.asset.sourceCrop.x++;},
  f=>{f.asset.mode='cover';},
  f=>{f.original.frames[0].status='generated';},
 ];
 for(const mutate of mutations){const f=fixture();mutate(f);assert.equal(api.isPitArenaAssetPathAuthorized(f.stage,f.asset,f.manifest),false,mutate.toString());}
});
test('the shared library projection never publishes extra private fields or source filenames',()=>{
 const {manifest}=fixture();const secret='PRIVATE_V42_SENTINEL';manifest.sharedLibrary[0].originalSource=secret;manifest.sharedLibrary[0].frames[0].prompt=secret;
 assert(!JSON.stringify(projectPitArenaRuntimeData(manifest)).includes(secret));
});
test('composition approval digest changes with pixels, crop or position, not status or evidence paths',()=>{
 const stage=structuredClone(api.PIT_ARENA_PRODUCTION_MANIFEST.stages[2]);const digest=arenaCompositionDigest(stage);
 stage.runtimeEnabled=!stage.runtimeEnabled;stage.planes[0].assets[0].frames[0].status='reviewed';
 assert.equal(arenaCompositionDigest(stage),digest);
 stage.planes[0].assets[0].drawOrder=1000;
 assert.notEqual(arenaCompositionDigest(stage),digest,'Drawing order changes must invalidate visual approval');
 delete stage.planes[0].assets[0].drawOrder;
 assert.equal(arenaCompositionDigest(stage),digest,'Missing optional order preserves existing valid proofs');
 stage.planes[0].assets[0].placements[0].x++;
 assert.notEqual(arenaCompositionDigest(stage),digest);
});
test('production authoring rejects declarations that do not match their original',async()=>{
 const {manifest}=fixture();manifest.sharedLibrary[0].frames[0].sha256='f'.repeat(64);
 await assert.rejects(verifyPitArenaSourceReferences(manifest),/Altered shared source/);
});
test('library placements and source drawings are reported separately',()=>{
 const before=api.summarizePitArenaProduction();const {manifest,asset,stage}=fixture();stage.planes[4].assets.push(asset);
 const after=api.summarizePitArenaProduction(manifest);
 assert.equal(after.uniqueImageFiles,before.uniqueImageFiles);
 assert.equal(after.requestedImageFiles,before.requestedImageFiles+1);
 assert.equal(after.sharedModuleInstances,before.sharedModuleInstances+1);
});
test('arena number selection rejects duplicates and values outside the approved 80-entry tranche',()=>{
 assert.equal(parseArenaNumbers('all').length,80);assert.deepEqual(parseArenaNumbers('21,100'),[21,100]);
 for(const bad of ['','0','20','101','21,21','21,NaN','../21'])assert.throws(()=>parseArenaNumbers(bad));
});

test('P0 import rejects matching traversal paths and nested links outside the dedicated output root',async()=>{
 const id='arena-021-marche-du-convoi',url='/game/sprites/v42/pit-arenas/'+id+'/p0-depth.png';
 assertV42P0Path(id,url);
 for(const bad of ['/../../outside.png','/game/sprites/v42/pit-arenas/other/p0-depth.png',url+'?file=elsewhere'])assert.throws(()=>assertV42P0Path(id,bad));
 assert.throws(()=>assertV42P0Path('../outside',url));
 const root=process.cwd()+'/fixture-v42',inside=root+'/pit-arenas/'+id+'/p0-depth.png';
 assert.equal(await resolveV42P0File(id,url,async p=>p==='public/game/sprites/v42'?root:inside),inside,'The dedicated root may itself be a supported junction');
 await assert.rejects(resolveV42P0File(id,url,async p=>p==='public/game/sprites/v42'?root:process.cwd()+'/outside.png'),/escapes/);
});
