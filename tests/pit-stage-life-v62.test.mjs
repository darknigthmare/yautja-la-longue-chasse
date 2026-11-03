import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import { build } from 'esbuild';
const bundle=await build({stdin:{contents:`export * from './app/game/pitStageLifeV62';export {getPitStageLifeV63Stage} from './app/game/pitStageLifeV63';export * from './app/game/pitStageLifeDirectorV60';export * from './app/game/pitStageLifeRenderingV61';export {getPitArenaArtPaths,loadPitArenaArt} from './app/game/pitArenaRendering';export {getPitArenaLifePaths} from './app/game/pitArenaLife';export {resolvePitArenaProductionKit} from './app/game/pitArenaProduction';export {PIT_ARENAS,createPitCombatState,serializePitCombat} from './app/game/systems/pitCombat';export {getPitArenaCatalogueEntry} from './app/game/systems/pitArenaCatalogue';export {PIT_ALL_LORE_STAGE_DEFINITIONS} from './app/game/systems/pitLoreStages';export {PIT_CHARACTER_STAGE_COVERAGE} from './app/game/systems/pitCharacterStages';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const id='arena-126-avpr-2007-hospital-roof';
const stage=()=>({stageId:id,continuity:{mode:'exhibition-adaptation',sourceCells:['10_VIE_DES_STAGES!E62','10_VIE_DES_STAGES!E63','10_VIE_DES_STAGES!E64'],chapterReconstructionComplete:false,note:'Original anonymous environment; exact narrative remains separate.'},events:[0,1,2].map(n=>({id:`ambient-0${n+1}`,name:`Ambient ${n+1}`,src:`/game/sprites/v62/pit-life/${id}/ambient-0${n+1}.png`,sha256:String(n+1).repeat(64),width:1536,height:1024,fps:3,restFrame:0,reducedMotionFrame:0,placement:{x:300,bottom:210,height:40,parallax:.05,renderPass:'P1',anchor:'world'},frames:Array.from({length:6},(_,i)=>({rect:[i%3*512,Math.floor(i/3)*512,512,512],pivot:[256,420],alphaBounds:[80,80,350,341]}))}))});
const manifest=s=>({schemaVersion:1,release:'V62',stages:[s]});

test('V62 preserves source URLs and cannot masquerade as a canon chapter or replace an older ambient stage',()=>{
  const s=stage();assert(api.isPitStageLifeStageV62(s));assert.strictEqual(api.getPitStageLifeV62Stage(id,manifest(s)),s);
  assert(s.events.every(e=>e.src.includes('/v62/')));
  for(const mutate of [s=>s.continuity.chapterReconstructionComplete=true,s=>s.continuity.mode='canon',s=>s.continuity.sourceCells[0]='E62',
    s=>s.continuity.sourceCells[1]=s.continuity.sourceCells[0],s=>s.replacesV60Stage=true,s=>s.events[0].reusedV60EventId='ambient-01',
    s=>s.events[0].src=s.events[0].src.replace('/v62/','/v61/'),s=>s.events[0].src=s.events[0].src.replace('ambient-01.png','../x.png'),
    s=>s.events[1].src=s.events[0].src,s=>s.events[0].frames[1].rect=s.events[0].frames[0].rect]){
    const bad=stage();mutate(bad);assert.equal(api.isPitStageLifeStageV62(bad),false);assert.throws(()=>api.getPitStageLifeV62Stage(id,manifest(bad)));
  }
  assert.throws(()=>api.getPitStageLifeV62Stage(id,{...manifest(s),stages:[s,s]}));
  assert.equal(api.getPitStageLifeV62Stage('constructor',manifest(s)),null);
});

test('V62 ambience uses all three seeded variants, stays deterministic, and never advances while the simulation is frozen',()=>{
  const s=stage(),before=JSON.stringify(s),random=Math.random;
  Math.random=()=>{throw Error('Background must not consume game randomness');};
  try {
    const schedule=api.getPitStageLifeScheduleV60(id,1,0),seen=new Set();
    for(let i=0;i<3;i++)for(let pose=0;pose<6;pose++){
      const context={round:1,roundFrame:schedule.firstDelay+schedule.starts[i]+pose*20,phase:'round',training:false};
      const a=api.getPitStageLifePosesV60(s,context),b=api.getPitStageLifePosesV60(s,context);
      assert.deepEqual(a,b);const active=a.find(p=>p.active);assert(active);assert.equal(active.nativeFrame,pose);seen.add(active.eventId);
      assert(api.getPitStageLifePosesV60(s,context,true).every(p=>!p.active&&p.nativeFrame===0));
    }
    assert.equal(seen.size,3);
    for(const phase of ['round-over','match-over'])assert(api.getPitStageLifePosesV60(s,{round:1,roundFrame:10000,phase,training:false}).every(p=>!p.active));
  } finally {Math.random=random;}
  assert.equal(JSON.stringify(s),before);
});

test('V62 walking actors remain hidden until their authored window and stay clipped behind the scene',()=>{
  const s=stage(),e=s.events[0];e.idleVisibility='hidden';e.travelX=[280,370];e.clipWorld={x:280,y:170,width:90,height:45};
  assert(api.isPitStageLifeStageV62(s));
  const schedule=api.getPitStageLifeScheduleV60(id,1,0),slot=schedule.bag.indexOf(0),start=schedule.firstDelay+schedule.starts[slot];
  const position=frame=>{const context={round:1,roundFrame:frame,phase:'round',training:false},pose=api.getPitStageLifePosesV60(s,context)[0];return api.getPitStageLifeTravelXV61(id,e,pose,context);};
  assert.equal(position(0),null);assert.equal(position(start),280);assert.equal(position(start+119),370);assert.equal(position(start+120),null);
  const invalid=structuredClone(s);delete invalid.events[0].clipWorld;assert.equal(api.isPitStageLifeStageV62(invalid),false);
});

test('V62 selected stages preload only their own native triplet and cannot draw a second V60/V61 cast',async()=>{
  for(const s of api.PIT_STAGE_LIFE_V62.stages){
    const paths=api.getPitArenaArtPaths(s.stageId),old=api.getPitArenaLifePaths(s.stageId);
    const correction=api.getPitStageLifeV63Stage(s.stageId);
    const active=correction?.events??s.events;
    assert(active.every(e=>paths.includes(e.src)));
    assert.equal(paths.filter(p=>p.includes('/v62/pit-life/')).length,correction?correction.events.filter(e=>e.reusedV62EventId).length:3);
    assert(old.every(p=>!paths.includes(p)),'Shared historical cast must not survive next to a dedicated V62 triplet');
    const fakeV60={stageId:s.stageId,events:s.events.map(e=>({...e,src:e.src.replace('/v62/','/v60/')}))};
    await assert.rejects(api.loadPitArenaArt(s.stageId,{stageLifeManifestV60:{schemaVersion:1,release:'V60',stages:[fakeV60]}}),/cannot duplicate/);
    const fakeV61={stageId:s.stageId,events:s.events.map(e=>({...e,src:e.src.replace('/v62/','/v61/')}))};
    await assert.rejects(api.loadPitArenaArt(s.stageId,{stageLifeManifestV61:{schemaVersion:1,release:'V61',stages:[fakeV61]}}),/cannot duplicate/);
  }
  const older=api.getPitArenaArtPaths('arena-140-bad-blood-pine-barrens');
  assert(older.some(p=>p.includes('/v61/pit-life/')));assert(older.every(p=>!p.includes('/v62/')));
});

test('Golgotha moves to a separate USCM adaptation while waterfall saves and image paths remain valid',async()=>{
  const reconciliation=JSON.parse(await fs.readFile('docs/v62-golgotha-reconciliation.json','utf8'));
  const old='arena-051-golgotha-etude-jaguar',current='arena-187-golgotha-uscm-airlock';
  const oldKit=api.resolvePitArenaProductionKit(old),newKit=api.resolvePitArenaProductionKit(current);
  assert(oldKit&&newKit);assert.deepEqual(oldKit.paths,reconciliation.oldStage.imagePaths);
  assert.equal(api.getPitArenaCatalogueEntry(51).id,old);
  assert.equal(api.getPitArenaCatalogueEntry(51).name,reconciliation.oldStage.name);
  assert.equal(api.getPitArenaCatalogueEntry(51).referenceStudy,null);
  assert.equal(api.PIT_ARENAS[old].name,reconciliation.oldStage.name);
  assert.equal(api.PIT_ARENAS[current].name,'Camp Golgotha — sas USCM');
  const golgotha=api.PIT_ALL_LORE_STAGE_DEFINITIONS.filter(s=>s.workId==='avp-jaguar-1994');
  assert.deepEqual(golgotha.map(s=>s.id),[current]);
  assert(golgotha[0].sourceClaim.includes('pas une reproduction1:1'));
  assert(api.PIT_CHARACTER_STAGE_COVERAGE.every(s=>s.stageId!==old),'No verified Jaguar identity may point to the reclassified original');
  for(const arenaId of [old,current]){
    const state=api.createPitCombatState('jungle-hunter','city-hunter',{arenaId});
    assert.equal(state.arenaId,arenaId);assert(api.serializePitCombat(state).includes(arenaId));
  }
  assert.equal(newKit.planes.length,6);
  assert.equal(newKit.paths.filter(p=>p.includes('/v62/pit-arenas/')).length,1,'Only the P0 backdrop is newly generated; P1–P5 are declared library assets');
  assert.equal(api.getPitStageLifeV62Stage(old),null);
  assert.equal(api.getPitStageLifeV62Stage(current).continuity.chapterReconstructionComplete,false);
});
