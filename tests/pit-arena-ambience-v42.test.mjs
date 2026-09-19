import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {projectPitArenaRuntimeData,verifyPitArenaSourceReferences} from '../scripts/build-pit-arena-runtime-v33.mjs';
import {arenaCompositionDigest} from '../scripts/lib/pit-arena-composition-v42.mjs';
const bundled=await build({stdin:{contents:'export * from "./app/game/pitArenaAmbience"; export * from "./app/game/pitArenaProduction"; export * from "./app/game/pitArenaRendering"; export {createPitCombatState,serializePitCombat} from "./app/game/systems/pitCombat";',loader:'ts',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const motion={kind:'drift-x',amplitudePx:14,periodFrames:1200};
function fixture(){
 const manifest=structuredClone(api.PIT_ARENA_PRODUCTION_MANIFEST);
 const haze=manifest.stages[0].planes[0].assets.find(a=>a.id==='p0-b-vault-haze');
 haze.ambientMotion={...motion};
 const kit=api.resolvePitArenaProductionKit('the-pit',manifest);assert(kit);
 const images=new Map(kit.planes.flatMap(p=>p.assets.flatMap(a=>a.frames.map(f=>[f.path,{src:f.path,naturalWidth:f.generation.width,naturalHeight:f.generation.height}]))));
 return {manifest,haze,bank:{arenaId:'the-pit',productionKit:kit,images,failedPaths:new Set(),requestedPaths:new Set(kit.paths)}};
}
function render(bank,frame,reducedMotion=false){
 const state=api.createPitCombatState('jungle-hunter','city-hunter',{mode:'training',arenaId:'the-pit'});state.frame=frame;
 const snapshot=api.serializePitCombat(state),camera={arenaId:'the-pit',centerX:480,centerY:270,zoom:1,targetZoom:1,frame,mode:'follow'},cameraBefore=JSON.stringify(camera);
 const calls=[],stack=[];const ctx=new Proxy({globalAlpha:1},{get(target,key){if(key in target)return target[key];if(key==='save')return()=>stack.push(target.globalAlpha);if(key==='restore')return()=>{target.globalAlpha=stack.pop();};return(...args)=>calls.push({name:key,args});}});
 api.drawPitArenaBackdrop(ctx,state,camera,bank,{reducedMotion});api.drawPitArenaForeground(ctx,state,camera,bank,{reducedMotion});
 assert.equal(api.serializePitCombat(state),snapshot);assert.equal(JSON.stringify(camera),cameraBefore);
 return calls.filter(c=>c.name==='drawImage').map(c=>({src:c.args[0].src,args:c.args.slice(1)}));
}
test('atmospheric motion is bounded, deterministic, stationary during pause and disabled by reduced motion',()=>{
 assert.equal(api.getPitArenaAmbientOffset(motion,0),0);assert.equal(api.getPitArenaAmbientOffset(motion,300),14);
 assert.equal(api.getPitArenaAmbientOffset(motion,900),-14);assert.equal(api.getPitArenaAmbientOffset(motion,300),api.getPitArenaAmbientOffset(motion,300));
 for(const frame of [0,300,900,100000])assert.equal(api.getPitArenaAmbientOffset(motion,frame,true),0);
 for(const value of [{...motion,amplitudePx:25},{...motion,periodFrames:30},{...motion,kind:'flash'}])assert.equal(api.getPitArenaAmbientOffset(value,300),0);
 assert.equal(api.getPitArenaAmbientOffset(motion,NaN),0);
});
test('actual drawing calls move only the haze and use true flame frames without changing simulation or floor',()=>{
 const {bank,haze}=fixture(),a=render(bank,0),b=render(bank,300),hazePath=haze.frames[0].path;
 const ha=a.find(c=>c.src===hazePath),hb=b.find(c=>c.src===hazePath);assert(ha&&hb);
 assert.equal(hb.args[4]-ha.args[4],14);assert.deepEqual(hb.args.slice(5),ha.args.slice(5));
 assert.deepEqual(a.filter(c=>/p4-/.test(c.src)),b.filter(c=>/p4-/.test(c.src)));
 assert.deepEqual(render(bank,0,true),render(bank,300,true),'Reduced motion holds all atmosphere at its reference');
 assert(render(bank,8).some(c=>c.src.endsWith('p3-c-brazier-flame-f01.png')));
 assert(render(bank,8,true).some(c=>c.src.endsWith('p3-c-brazier-flame-f00.png')));
});
test('ground movement and forged fast effects are rejected while approval hashes cover motion settings',async()=>{
 const {manifest,haze}=fixture(),stage=manifest.stages[0],before=arenaCompositionDigest(stage);
 haze.ambientMotion.amplitudePx=15;assert.notEqual(arenaCompositionDigest(stage),before);
 haze.ambientMotion.secret='PRIVATE_MOTION_SENTINEL';assert(!JSON.stringify(projectPitArenaRuntimeData(manifest)).includes('PRIVATE_MOTION_SENTINEL'));
 stage.planes[4].assets[0].ambientMotion={...motion};assert.equal(api.resolvePitArenaProductionKit('the-pit',manifest),null);
 await assert.rejects(verifyPitArenaSourceReferences(manifest),/atmospheric alpha/);
});
