import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const bundled = await build({stdin:{contents:`export * from './app/game/pitStageStoryV61'; export * from './app/game/pitStageStoryDirectorV61'; export * from './app/game/pitStageStoryRenderingV61'; export * from './app/game/pitStageLifeDirectorV60'; export {drawPitStageLifeV60} from './app/game/pitStageLifeRenderingV60'; export {loadPitArenaArt,drawPitArenaBackdrop,isPitArenaArtBankReady} from './app/game/pitArenaRendering'; export {resolvePitArenaProductionKit} from './app/game/pitArenaProduction'; export {createPitCombatState,serializePitCombat,PIT_ROUND_FRAMES} from './app/game/systems/pitCombat'; export * from './app/game/systems/pitRoundPresentation';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api = await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const arena = 'arena-138-avp-ryushi-prosperity-wells';
const empty = {schemaVersion:1,release:'V61',stages:[]};
const manifest = stage => ({...empty,stages:[stage]});
const native = (id,kind='pit-story') => ({id,name:id,src:`/game/sprites/v61/${kind}/${arena}/${id}.png`,width:1536,height:1024,sha256:'a'.repeat(64),
  frames:Array.from({length:6},(_,i)=>({rect:[i%3*512,Math.floor(i/3)*512,512,512],pivot:[256,460],alphaBounds:[80,80,350,381]})),
  fps:3,restFrame:0,reducedMotionFrame:1,placement:{x:400,bottom:320,height:80,parallax:.05,renderPass:'P2',anchor:'world'}});
const story = (trigger='round-start',extra={}) => ({stageId:arena,events:[{...native('gong'),trigger,idleVisibility:'hidden',...extra}]});
const life = (version=61) => ({stageId:arena,events:['first','second','third'].map((id,i)=>({...native(id,'pit-life'),src:`/game/sprites/v${version}/pit-life/${arena}/${id}.png`,sha256:String(i+1).repeat(64)}))});
const context = extra => ({round:1,roundFrame:0,phase:'round',training:false,presentationPhase:'fight',presentationRound:1,fighterIds:['jungle-hunter','city-hunter'],...extra});
const pose = (stage,extra={},reduced=false) => api.getPitStageStoryPosesV61(stage,context(extra),reduced)[0];
const result = extra => context({phase:'round-over',presentationPhase:'round-result',resultRound:1,resultElapsedFrames:40,winnerId:'jungle-hunter',...extra});
const bankImages = stages => new Map(stages.flatMap(s=>s.events.map(e=>[e.src,{src:e.src,naturalWidth:e.width,naturalHeight:e.height}])));
const canvas = () => ({globalAlpha:1,calls:[],stack:[],save(){this.stack.push(this.globalAlpha);},restore(){this.globalAlpha=this.stack.pop();},drawImage(...args){this.calls.push(args);},fillRect(){}});
const transform = factor => ({scale:1+factor*.3,translateX:-factor*50,translateY:-factor*20});

test('V61 registries separate three-event ambient bags from explicit conditional clips',()=>{
  assert(api.isPitStageLifeStageV61(life()));assert(api.isPitStageStoryStageV61(story()));
  assert.equal(api.isPitStageLifeStageV61(story()),false);assert.equal(api.isPitStageStoryStageV61(life()),false);
  for(const mutate of [
    s=>s.events[0].trigger='hit',s=>s.events[0].trigger='victory',s=>s.events[0].src=s.events[0].src.replace('/v61/','/v60/'),
    s=>s.events[0].src=s.events[0].src.replace('/gong.png','/../gong.png'),s=>s.events[0].cue='first-incident',
    s=>s.events[0].placement.renderPass='P5',s=>s.events[0].frames[0].pivot=[900,900],s=>s.events[0].frames[0].alphaBounds=[0,0,999,999],
    s=>s.events[0].frames[0].rect=[1530,0,512,512],s=>s.events[0].frames[1].rect=s.events[0].frames[0].rect,
    s=>s.events[0].idleVisibility='always',s=>s.events[0].afterPlayback='hold-last',s=>s.events[0].excludedFighterIds=['../hunter'],
  ]) {const s=story();mutate(s);assert.equal(api.isPitStageStoryStageV61(s),false);assert.throws(()=>api.getPitStageStoryV61Stage(arena,manifest(s)));}
  assert.throws(()=>api.getPitStageStoryV61Stage(arena,{...empty,stages:[story(),story()]}));
  assert.equal(api.getPitStageStoryV61Stage('constructor',manifest(story())),null);
  assert.equal(api.isPitStageStoryStageV61(story('round-end',{replacesAmbientEventId:'first',idleVisibility:'rest'})),false);
  assert.equal(api.isPitStageStoryStageV61(story('narrative-cue',{cue:'first-incident'})),false);
  assert(api.isPitStageStoryStageV61(story('narrative-cue',{cue:'first-incident',encounterId:'verified-trial',afterPlayback:'hold-last'})));
});

test('gong starts only after both introductions and the entire countdown, once per round',()=>{
  const combat=api.createPitCombatState('jungle-hunter','city-hunter',{arenaId:arena});
  const before=api.serializePitCombat(combat),stage=story();let view=api.createPitRoundPresentation(combat);
  const inspect=()=>api.getPitStageStoryPosesV61(stage,api.createPitStageStoryContextV61(combat,view))[0];
  for(let elapsed=0;elapsed<5400;elapsed+=100){assert.equal(inspect().active,false,view.phase);view=api.advancePitRoundPresentation(view,combat,100);}
  assert.equal(view.phase,'fight');assert.equal(inspect().active,true);assert.equal(inspect().nativeFrame,0);
  for(let frame=0;frame<6;frame++) {combat.roundFramesRemaining=api.PIT_ROUND_FRAMES-frame*20;assert.equal(inspect().nativeFrame,frame);}
  combat.roundFramesRemaining=api.PIT_ROUND_FRAMES-120;assert.equal(inspect().active,false);
  combat.roundFramesRemaining=api.PIT_ROUND_FRAMES;assert.equal(api.serializePitCombat(combat),before);
  combat.round=2;view=api.observePitRoundPresentation(view,combat);assert.equal(view.phase,'countdown');assert.equal(inspect().active,false);
  for(let i=0;i<30;i++)view=api.advancePitRoundPresentation(view,combat,100);
  assert.equal(inspect().occurrence,'round:2:start');assert.equal(inspect().active,true);
  for(const extra of [{presentationPhase:'intro-left'},{presentationPhase:'intro-right'},{presentationPhase:'countdown'},{presentationRound:2},{training:true},{roundFrame:-1},{roundFrame:NaN},{roundFrame:1.5}])assert.equal(pose(stage,extra).active,false);
});

test('victory needs a current winning result; judgment also accepts draws and never guesses winner identity',()=>{
  const salute=story('round-victory'),judgment=story('round-end');
  for(const stage of [salute,judgment])assert.equal(api.getPitStageStoryPosesV61(stage,result())[0].nativeFrame,2);
  assert.equal(api.getPitStageStoryPosesV61(salute,result({winnerId:null}))[0].visible,false);
  assert.equal(api.getPitStageStoryPosesV61(judgment,result({winnerId:null}))[0].active,true);
  for(const extra of [{resultRound:0},{presentationRound:2},{phase:'round'},{presentationPhase:'fight'},{resultElapsedFrames:NaN},{resultElapsedFrames:-1}])
    assert.equal(api.getPitStageStoryPosesV61(salute,result(extra))[0].active,false);
  for(const stage of [salute,judgment])assert.equal(api.getPitStageStoryPosesV61(stage,result({resultElapsedFrames:120}))[0].visible,false);
});

test('ordinary combat hits and phase changes cannot fabricate any narrative cue',()=>{
  const combat=api.createPitCombatState('jungle-hunter','city-hunter',{arenaId:arena});
  combat.events.push({type:'hit',frame:5,attackerId:'jungle-hunter',defenderId:'city-hunter',attack:'heavy',damage:20});
  for(const cue of ['first-incident','objective-beacon','engineer-preboss','chapter-captive']) {
    const stage=story('narrative-cue',{cue,encounterId:'real-scenario'});
    for(const phase of ['round','round-over','match-over']){combat.phase=phase;const view=api.createPitRoundPresentation(combat);
      assert.equal(api.getPitStageStoryPosesV61(stage,api.createPitStageStoryContextV61(combat,view))[0].visible,false);}
    for(const narrative of [undefined,{stageId:arena,encounterId:'another-scenario',cues:[{cue,occurrenceId:'reached',elapsedFrames:40}]},
      {stageId:'another-stage',encounterId:'real-scenario',cues:[{cue,occurrenceId:'reached',elapsedFrames:40}]},
      {stageId:arena,encounterId:'real-scenario',cues:[{cue,occurrenceId:'',elapsedFrames:40}]},
      {stageId:arena,encounterId:'real-scenario',cues:[{cue,occurrenceId:'one',elapsedFrames:40},{cue,occurrenceId:'two',elapsedFrames:40}]}])assert.equal(pose(stage,{narrative}).visible,false);
    const narrative={stageId:arena,encounterId:'real-scenario',cues:[{cue,occurrenceId:'reached',elapsedFrames:40}]};
    assert.equal(pose(stage,{narrative}).nativeFrame,2);assert.equal(pose(stage,{narrative}).occurrence,'real-scenario:reached');
  }
});

test('after-duel guard and patrol wait for the whole match, never an intermediate round',()=>{
  const stage=story('match-end');assert(api.isPitStageStoryStageV61(stage));
  assert.equal(api.getPitStageStoryPosesV61(stage,result())[0].visible,false);
  assert.equal(api.getPitStageStoryPosesV61(stage,result({phase:'match-over',presentationPhase:'round-result'}))[0].visible,false);
  const ended=api.getPitStageStoryPosesV61(stage,result({phase:'match-over',presentationPhase:'match-result'}))[0];assert(ended.active&&ended.visible);assert.equal(ended.nativeFrame,2);
});

test('completed objectives can hold their authored final state until the scenario withdraws the cue',()=>{
  const stage=story('narrative-cue',{cue:'objective-beacon',encounterId:'beacon-mission',afterPlayback:'hold-last',replacesAmbientEventId:'first'});
  const narrative={stageId:arena,encounterId:'beacon-mission',cues:[{cue:'objective-beacon',occurrenceId:'objective-completed',elapsedFrames:999999}]};
  const current=pose(stage,{narrative});assert.equal(current.active,false);assert.equal(current.held,true);assert.equal(current.visible,true);assert.equal(current.nativeFrame,5);
  assert.equal(pose(stage).visible,false);assert.equal(pose(stage,{narrative},true).nativeFrame,1);
  assert.deepEqual([...api.getPitStageStoryReplacementsV61({stage,images:bankImages([stage]),groundY:430,transform,eventContext:context({narrative})})],['first']);
});

test('pausing and seeking preserve exact poses, reduced motion holds a native cell and selected named fighters suppress their double',()=>{
  const stage=story('round-start',{idleVisibility:'rest',excludedFighterIds:['wolf']});const frozen=Object.freeze(context({roundFrame:40}));
  const wanted=api.getPitStageStoryPosesV61(stage,frozen);const before=JSON.stringify(frozen);
  const random=Math.random;Math.random=()=>{throw Error('Story rendering must not consume RNG');};
  try {for(const frame of [999999,0,40,9,800,40]){pose(stage,{roundFrame:frame});assert.deepEqual(api.getPitStageStoryPosesV61(stage,frozen),wanted);}} finally {Math.random=random;}
  assert.equal(JSON.stringify(frozen),before);assert.equal(pose(stage,{roundFrame:40},true).nativeFrame,1);
  assert.equal(pose(stage,{fighterIds:['wolf','city-hunter']}).visible,false);
  assert.equal(pose(stage,{presentationPhase:'countdown'}).visible,true);assert.equal(pose(stage,{presentationPhase:'countdown'}).active,false);
});

test('terminal gestures use the existing frozen result clock rather than simulation ticks or wall time',()=>{
  const combat=api.createPitCombatState('jungle-hunter','city-hunter',{arenaId:arena});
  combat.phase='match-over';combat.frame=400;combat.lastRoundResult={round:1,reason:'ko',winnerId:'jungle-hunter',frame:400};combat.matchWinnerId='jungle-hunter';
  let view=api.createPitRoundPresentation(combat);const stage=story('round-victory');
  for(let i=0;i<7;i++)view=api.advancePitRoundPresentation(view,combat,100);
  const current=api.getPitStageStoryPosesV61(stage,api.createPitStageStoryContextV61(combat,view))[0];assert.equal(current.nativeFrame,2);
  const paused=api.advancePitRoundPresentation(view,combat,60000,true);assert.strictEqual(paused,view);
  assert.deepEqual(api.getPitStageStoryPosesV61(stage,api.createPitStageStoryContextV61(combat,paused))[0],current);
  assert.equal(combat.frame,400);
});

test('native gestures replace exactly one V60 actor without changing its bag, preserve source cells and depth anchors',()=>{
  const stage=story('round-victory',{replacesAmbientEventId:'first'}),ambient=life(60),images=bankImages([stage,ambient]),ctx=canvas();
  const input={stage,images,groundY:430,transform,eventContext:result()};
  const excluded=api.getPitStageStoryReplacementsV61(input);assert.deepEqual([...excluded],['first']);
  const clock={round:1,phase:'round',roundFrame:2000},before=api.getPitStageLifePosesV60(ambient,clock);
  const ambientReport=api.drawPitStageLifeV60(ctx,{stage:ambient,pass:'P2',images,groundY:430,transform,eventContext:clock,excludedEventIds:excluded});
  const report=api.drawPitStageStoryV61(ctx,{...input,pass:'P2'});
  assert.equal(ambientReport.actorsDrawn,2);assert.equal(report.actorsDrawn,1);assert.equal(ctx.calls.length,3);assert.equal(ctx.globalAlpha,1);
  assert.deepEqual(api.getPitStageLifePosesV60(ambient,clock),before);assert.deepEqual(report.replacedAmbientEventIds,['first']);
  const call=ctx.calls.at(-1),cell=stage.events[0].frames[2];assert.deepEqual(call.slice(1,5),cell.rect);
  const [x,y]=report.events[0].attachment;assert.equal(x,400*transform(.05).scale+transform(.05).translateX);assert.equal(y,320*transform(.05).scale+transform(.05).translateY);
  assert.equal(call[7]/cell.rect[2],call[8]/cell.rect[3]);
  for(const damage of ['missing','dimensions','transform']){const broken={...input,images:new Map(images)};
    if(damage==='missing')broken.images.delete(stage.events[0].src);if(damage==='dimensions')broken.images.set(stage.events[0].src,{naturalWidth:1,naturalHeight:1});if(damage==='transform')broken.transform=()=>({scale:NaN,translateX:0,translateY:0});
    assert.equal(api.getPitStageStoryReplacementsV61(broken).size,0,'The original body must remain when the replacement cannot draw');
    const failed=api.drawPitStageStoryV61(canvas(),{...broken,pass:'P2'});assert.equal(failed.actorsDrawn,0);assert.equal(failed.missingPaths.length,damage==='transform'?0:1);
  }
});

test('V61 selected-stage loader requests only its own triplet and gesture, rejects size mismatch and retries',async()=>{
  const ambient=life(),gesture=story('round-end',{replacesAmbientEventId:'first'}),kit=api.resolvePitArenaProductionKit(arena),previous=globalThis.Image;
  const expected=new Map(kit.planes.flatMap(p=>p.assets.flatMap(a=>a.frames.map(f=>[f.path,[f.generation.width,f.generation.height]]))));
  for(const e of [...ambient.events,...gesture.events])expected.set(e.src,[e.width,e.height]);
  const requested=[];let fail=gesture.events[0].src;let malformed=false;
  globalThis.Image=class {naturalWidth=0;naturalHeight=0;set src(src){if(!src)return;requested.push(src);queueMicrotask(()=>{if(src===fail){this.onerror?.();return;}[this.naturalWidth,this.naturalHeight]=expected.get(src)||[0,0];if(malformed&&src===gesture.events[0].src)this.naturalWidth--;this.onload?.();});}};
  const foreign=structuredClone(ambient);foreign.stageId='arena-162-other';foreign.events.forEach(e=>e.src=e.src.replace(arena,foreign.stageId));
  const options={stageLifeManifestV60:{schemaVersion:1,release:'V60',stages:[]},stageLifeManifestV61:{...empty,stages:[ambient,foreign]},stageStoryManifestV61:manifest(gesture),timeoutMs:1000};
  try {
    const bad=await api.loadPitArenaArt(arena,options);assert.equal(api.isPitArenaArtBankReady(bad),false);assert.deepEqual([...bad.failedPaths],[fail]);
    assert.equal(requested.filter(p=>p.includes('/v61/')).length,4);assert(requested.every(p=>!p.includes('/v54/pit-life/')&&!p.includes('arena-162-other')));
    fail='';const good=await api.loadPitArenaArt(arena,options);assert(api.isPitArenaArtBankReady(good));assert.equal(good.stageLifeV61,ambient);assert.equal(good.stageStoryV61,gesture);
    malformed=true;assert.equal(api.isPitArenaArtBankReady(await api.loadPitArenaArt(arena,options)),false);
    const controller=new AbortController();controller.abort();assert.equal((await api.loadPitArenaArt(arena,{...options,signal:controller.signal})).images.size,0);
    await assert.rejects(()=>api.loadPitArenaArt(arena,{...options,stageStoryManifestV61:manifest(story('round-end',{replacesAmbientEventId:'nonexistent'}))}));
    await assert.rejects(()=>api.loadPitArenaArt(arena,{...options,stageLifeManifestV60:{schemaVersion:1,release:'V60',stages:[life(60)]}}));
  } finally {if(previous===undefined)delete globalThis.Image;else globalThis.Image=previous;}
});

test('actual production pass replacement is behind fighters, has diagnostics and changes no combat/save/replay byte',()=>{
  const ambient=life(60),stage=story('round-victory',{replacesAmbientEventId:'first'}),images=bankImages([ambient,stage]);
  const bank={arenaId:arena,images,requestedPaths:new Set(images.keys()),failedPaths:new Set(),cancelled:false,stageLifeV60:ambient,stageStoryV61:stage,
    productionKit:{catalogueId:arena,planes:['P0','P1','P2','P3','P4'].map(id=>({id,assets:[]}))}};
  const combat=api.createPitCombatState('jungle-hunter','city-hunter',{arenaId:arena});combat.phase='round-over';combat.frame=1040;combat.lastRoundResult={round:1,reason:'ko',winnerId:'jungle-hunter',frame:1000};
  const view=api.createPitRoundPresentation(combat),camera={arenaId:arena,centerX:480,centerY:270,zoom:1},before=api.serializePitCombat(combat),cameraBefore=JSON.stringify(camera);
  const report=api.drawPitArenaBackdrop(canvas(),combat,camera,bank,{roundPresentation:view});
  assert.equal(report.stageLifeV60.actorsDrawn,2);assert.equal(report.stageStoryV61.actorsDrawn,1);assert.equal(report.stageStoryV61.events[0].nativeFrame,2);assert.deepEqual(report.stageStoryV61.replacedAmbientEventIds,['first']);
  assert.equal(api.serializePitCombat(combat),before);assert.equal(JSON.stringify(camera),cameraBefore);
  assert.equal(api.drawPitArenaBackdrop(canvas(),combat,camera,bank).stageStoryV61.actorsDrawn,0,'Absent presentation cannot impersonate a finished round');
});

test('V60 native manifest bytes stay exactly as released while V61 registries are independent',async()=>{
  const bytes=await fs.readFile('app/game/data/pitStageLifeV60.json');
  assert.equal(JSON.parse(bytes).stages.length,25);assert.equal(JSON.parse(bytes).stages.reduce((n,s)=>n+s.events.length,0),75);
  const proof=JSON.parse(await fs.readFile('docs/v60-stage-pipeline-final-qa.json','utf8'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),proof.sourceHashes['app/game/data/pitStageLifeV60.json']);
});

test('an explicit V60 correction preserves source metadata and seeded identities; named ambient exclusion never shrinks its bag',()=>{
  const base=life(60),overlay=life();overlay.replacesV60Stage=true;
  for(const event of overlay.events)event.reusedV60EventId=event.id;
  assert.doesNotThrow(()=>api.validatePitStageLifeOverrideV61(overlay,base));
  for(const mutate of [s=>s.events.reverse(),s=>s.events[0].frames[0].pivot[0]++,s=>s.events[0].sha256='f'.repeat(64),
    s=>delete s.events[0].reusedV60EventId,s=>s.replacesV60Stage=false]){const changed=structuredClone(overlay);mutate(changed);assert.throws(()=>api.validatePitStageLifeOverrideV61(changed,base));}
  const stage=life();stage.events[1].excludedFighterIds=['user-extinction-hydra'];
  const schedule=api.getPitStageLifeScheduleV60(arena,1,0),secondOccurrence=schedule.bag.indexOf(1),t=schedule.firstDelay+schedule.starts[secondOccurrence]+40;
  const clock={round:1,phase:'round',roundFrame:t},before=api.getPitStageLifePosesV60(stage,clock),excluded=api.getPitStageLifeExclusionsV61(stage,['user-extinction-hydra']);
  assert.deepEqual([...excluded],['second']);assert.equal(stage.events.length,3);assert(before[1].active);
  const hidden=api.drawPitStageLifeV60(canvas(),{stage,pass:'P2',groundY:430,images:bankImages([stage]),transform,eventContext:clock,excludedEventIds:excluded});
  assert.equal(hidden.actorsDrawn,2);assert(hidden.events.every(e=>e.eventId!=='second'&&!e.active));
  assert.deepEqual(api.getPitStageLifePosesV60(stage,clock),before);assert.deepEqual(api.getPitStageLifeScheduleV60(arena,1,0),schedule);
  assert.equal(api.getPitStageLifeExclusionsV61(stage,['jungle-hunter']).size,0);
});
