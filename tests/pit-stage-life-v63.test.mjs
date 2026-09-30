import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const result=await build({stdin:{contents:`export * from './app/game/pitStageLifeV63';export * from './app/game/pitStageLifeDirectorV63';export * from './app/game/pitStageLifeRenderingV63';export * from './app/game/pitStageCompositionV63';export {getPitArenaArtPaths} from './app/game/pitArenaRendering';export {resolvePitArenaProductionKit,PIT_ARENA_PRODUCTION_MANIFEST} from './app/game/pitArenaProduction';`,resolveDir:process.cwd()},write:false,bundle:true,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const stages=api.PIT_STAGE_LIFE_V63.stages,sha=b=>createHash('sha256').update(b).digest('hex');
test('V63 preserves all retained metadata and explicitly archives the contradictory roof evacuation',()=>{
 assert.deepEqual(stages.map(s=>s.events.length),[5,6]);
 for(const s of stages){assert(api.isPitStageLifeStageV63(s));for(const mutate of [s=>s.events[0].fps=7,s=>s.events[0].reusedV62EventId='wrong',s=>s.events.pop(),s=>s.continuity.chapterReconstructionComplete=true,s=>s.events.at(-1).src=s.events.at(-1).src.replace('/v63/','/v62/'),s=>s.events.at(-1).frames[0].rect=[0,0,9999,9999],s=>s.suppressedV62Events.push({id:'invented',sourceCell:'E1',reason:'bad'})]){const bad=structuredClone(s);mutate(bad);assert.equal(api.isPitStageLifeStageV63(bad),false);}}
 assert.equal(stages[0].suppressedV62Events[0].id,'ambient-01');assert(!stages[0].events.some(e=>e.id==='ambient-01'));
});
test('V63 bags cover every event with bounded gaps and no boundary repetition without consuming random',()=>{
 const random=Math.random;Math.random=()=>{throw Error('No combat RNG for ambience');};try{for(const s of stages)for(let round=1;round<=8;round++)for(let cycle=0;cycle<20;cycle++){
  const t=api.getPitStageLifeScheduleV63(s.stageId,round,cycle,s.events.length);assert.equal(new Set(t.bag).size,s.events.length);assert(t.gaps.every(g=>g>=435&&g<=675));assert.equal(t.gaps.reduce((a,b)=>a+b),t.cycleFrames);
  if(cycle)assert.notEqual(t.bag[0],api.getPitStageLifeScheduleV63(s.stageId,round,cycle-1,s.events.length).bag.at(-1));
 }}finally{Math.random=random;}
});
test('every native pose is reachable, pause is deterministic and reduced motion freezes all active events',()=>{
 for(const s of stages){const before=JSON.stringify(s),t=api.getPitStageLifeScheduleV63(s.stageId,1,0,s.events.length);for(let slot=0;slot<s.events.length;slot++)for(let f=0;f<6;f++){
  const event=s.events[t.bag[slot]],ctx={round:1,phase:'round',roundFrame:t.firstDelay+t.starts[slot]+Math.ceil(f*60/event.fps)};
  const poses=api.getPitStageLifePosesV63(s,ctx),active=poses.filter(p=>p.active);assert.equal(active.length,1);assert.equal(active[0].eventId,event.id);assert.equal(active[0].nativeFrame,f);assert.deepEqual(poses,api.getPitStageLifePosesV63(s,ctx));assert(api.getPitStageLifePosesV63(s,ctx,true).every(p=>!p.active&&p.nativeFrame===0));
 }assert.equal(JSON.stringify(s),before);for(const phase of ['round-over','match-over'])assert(api.getPitStageLifePosesV63(s,{round:1,phase,roundFrame:1500}).every(p=>!p.active));}
});
test('the selected bank requests only active V63/retained V62 sprites and preserves stage187 untouched',()=>{
 for(const s of stages){const paths=api.getPitArenaArtPaths(s.stageId);assert.deepEqual(paths.filter(p=>/\/v(?:62|63)\/pit-life\//.test(p)).sort(),s.events.map(e=>e.src).sort());assert(!paths.some(p=>p.includes('/v54/pit-life/')));}
 assert(!api.getPitArenaArtPaths(stages[0].stageId).includes(`/game/sprites/v62/pit-life/${stages[0].stageId}/ambient-01.png`));
 assert.equal(api.getPitArenaArtPaths('arena-187-golgotha-uscm-airlock').filter(p=>p.includes('/v62/pit-life/')).length,3);
});
test('seven native files remain byte identical to their receipts; six new sheets contain36 distinct cells',async()=>{
 const receipts=[];for(const file of (await fs.readdir('docs/v63-generation')).filter(f=>f.startsWith('arena-'))){const r=JSON.parse(await fs.readFile('docs/v63-generation/'+file,'utf8'));receipts.push(r);assert.equal(sha(await fs.readFile(r.workspacePath)),r.sha256);}
 assert.equal(receipts.length,7);const sheets=receipts.filter(r=>r.frames);assert.equal(sheets.length,6);assert.equal(sheets.flatMap(r=>r.frames).length,36);
 for(const r of sheets){assert.equal(new Set(r.frames.map(f=>f.contentSha256)).size,6);assert(r.frames.every(f=>f.borderSolidPixels===0));}
});
test('composition overlay preserves historical source and only replaces an exactly identified backdrop',()=>{
 const s=api.PIT_ARENA_PRODUCTION_MANIFEST.stages.find(s=>s.catalogueId===stages[0].stageId),asset=s.planes[0].assets[0],before=JSON.stringify(asset);
 const changed=api.applyPitStageCompositionV63(s.catalogueId,asset);assert(changed.frames[0].path.includes('/v63/'));assert.equal(JSON.stringify(asset),before);assert.deepEqual(changed.placements,asset.placements);
 assert.strictEqual(api.applyPitStageCompositionV63('other-stage',asset),asset);
 const stale=structuredClone(asset);stale.frames[0].generation.sha256='0'.repeat(64);assert.strictEqual(api.applyPitStageCompositionV63(s.catalogueId,stale),stale);
 const kit=api.resolvePitArenaProductionKit(s.catalogueId);assert(kit.paths.some(p=>p.includes('/v63/pit-arenas/')));assert(!kit.paths.includes(asset.frames[0].path));
});

