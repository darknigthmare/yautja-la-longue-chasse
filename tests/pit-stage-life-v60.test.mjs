import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {build} from 'esbuild';

const bundle=await build({stdin:{contents:'export * from "./app/game/pitStageLifeV60"; export * from "./app/game/pitStageLifeDirectorV60"; export * from "./app/game/pitStageLifeRenderingV60"; export {loadPitArenaArt,isPitArenaArtBankReady,drawPitArenaBackdrop} from "./app/game/pitArenaRendering"; export {resolvePitArenaProductionKit} from "./app/game/pitArenaProduction"; export {createPitCombatState,serializePitCombat,PIT_ROUND_FRAMES} from "./app/game/systems/pitCombat";',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const arena='arena-138-avp-ryushi-prosperity-wells';
const frame=i=>({rect:[i%3*256,Math.floor(i/3)*256,256,256],pivot:[120+i,240-i],alphaBounds:[20,20,220,222]});
const event=(id,pass)=>({id,name:'Native event '+id,src:`/game/sprites/v60/pit-life/${arena}/${id}.png`,width:768,height:512,
  sha256:(id==='first'?'1':id==='second'?'2':'3').repeat(64),frames:Array.from({length:6},(_,i)=>frame(i)),fps:3,restFrame:0,reducedMotionFrame:1,
  placement:{x:100+['first','second','third'].indexOf(id)*330,bottom:420,height:80,parallax:.24,renderPass:pass,anchor:'ground'}});
const fixture=()=>({stageId:arena,events:[event('first','P1'),event('second','P2'),event('third','P3')]});
const manifest=stage=>({schemaVersion:1,release:'V60',stages:[stage]});
const clock=(roundFrame,extra={})=>({round:1,phase:'round',roundFrame,...extra});
const poses=(stage,t,extra)=>api.getPitStageLifePosesV60(stage,clock(t,extra));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('V60 contract requires three distinct native sources, valid cells and explicit support planes',()=>{
  assert(api.isPitStageLifeStageV60(fixture()));
  for(const mutate of [
    s=>s.events.pop(),s=>s.events[1].id=s.events[0].id,s=>s.events[1].src=s.events[0].src,
    s=>s.events[0].src='/game/sprites/v54/pit-life/colony-watchers.png',s=>s.events[0].src=s.events[0].src.replace('/first.png','/../first.png'),
    s=>s.events[0].sha256='',s=>s.events[0].frames[1].rect=s.events[0].frames[0].rect,
    s=>s.events[0].frames[0].pivot=[300,200],s=>s.events[0].frames[0].alphaBounds=[250,0,20,10],
    s=>s.events[0].placement.renderPass='P4',s=>s.events[0].placement.anchor='screen',s=>s.events[0].placement.parallax=2,
    s=>s.events[0].fps=0,s=>s.events[0].restFrame=6,s=>s.events[0].reducedMotionFrame=-1,
  ]){const stage=fixture();mutate(stage);assert.equal(api.isPitStageLifeStageV60(stage),false);assert.throws(()=>api.getPitStageLifeV60Stage(arena,manifest(stage)));}
  assert.throws(()=>api.getPitStageLifeV60Stage(arena,{...manifest(fixture()),stages:[fixture(),fixture()]}));
  assert.equal(api.getPitStageLifeV60Stage('constructor',manifest(fixture())),null);
  assert.deepEqual(api.getPitStageLifeV60Paths(arena,manifest(fixture())),fixture().events.map(e=>e.src));
});

test('three-event bags cover each independent animation once without consecutive repeats across bags',()=>{
  const schedules=new Set();
  for(const stage of [arena,'arena-162-laboratoire','arena-186-sanctuaire'])for(let round=1;round<=9;round++){
    let previous;
    for(let cycle=0;cycle<100;cycle++){
      const bag=api.getPitStageLifeBagV60(stage,round,cycle);
      assert.deepEqual([...bag].sort(),[0,1,2]);assert.notEqual(bag[0],previous);previous=bag[2];schedules.add(bag.join(','));
      assert.deepEqual(api.getPitStageLifeBagV60(stage,round,cycle),bag);
    }
  }
  assert.equal(schedules.size,6,'All permutations are available rather than a fixed1/2/3 loop');
});

test('stage and round seeds desynchronise bounded native events without advancing a random stream',()=>{
  const schedules=new Set();
  for(let round=1;round<=7;round++)for(const stage of [arena,'arena-162-laboratoire','arena-186-sanctuaire'])for(let cycle=0;cycle<100;cycle++){
    const schedule=api.getPitStageLifeScheduleV60(stage,round,cycle);
    assert(schedule.firstDelay>=720&&schedule.firstDelay<=1500);
    assert(schedule.gaps.every(g=>g>=750&&g<=1470));assert.equal(schedule.gaps.reduce((sum,g)=>sum+g),3330);
    assert.deepEqual(schedule.starts,[0,schedule.gaps[0],schedule.gaps[0]+schedule.gaps[1]]);
    schedules.add(JSON.stringify(schedule));
  }
  assert(schedules.size>1500);
});

test('only the selected native event advances its distinct source cells then returns to calm',()=>{
  const stage=fixture();
  for(let cycle=0;cycle<3;cycle++){
    const schedule=api.getPitStageLifeScheduleV60(arena,1,cycle);
    for(let occurrence=0;occurrence<3;occurrence++){
      const start=schedule.firstDelay+cycle*3330+schedule.starts[occurrence],selected=schedule.bag[occurrence];
      for(let nativeFrame=0;nativeFrame<6;nativeFrame++){
        const result=poses(stage,start+nativeFrame*20);
        assert.equal(result.filter(p=>p.active).length,1);assert.equal(result[selected].nativeFrame,nativeFrame);
        assert.equal(result[selected].eventId,stage.events[selected].id);
        assert(result.every((p,i)=>i===selected||p.nativeFrame===0));
      }
      assert(poses(stage,start+120).every(p=>!p.active&&p.nativeFrame===0));
    }
  }
});

test('pause and arbitrary replay seeking reproduce the same drawings in constant bounded work',()=>{
  const stage=fixture(),t=api.getPitStageLifeScheduleV60(arena,1,0).firstDelay+40;
  const frozen=Object.freeze(clock(t)),before=JSON.stringify(frozen),wanted=api.getPitStageLifePosesV60(stage,frozen);
  for(const other of [0,70000,3,Number.MAX_SAFE_INTEGER,1,800,999999999])poses(stage,other);
  for(let i=0;i<100;i++)assert.deepEqual(api.getPitStageLifePosesV60(stage,frozen),wanted);
  assert.equal(JSON.stringify(frozen),before);
  const previous=Math.random;Math.random=()=>{throw Error('Background animation must never use random state');};
  try{assert.deepEqual(poses(stage,t),wanted);}finally{Math.random=previous;}
});

test('reduced motion, invalid clocks and result screens hold authored calm frames',()=>{
  const stage=fixture();
  for(const t of [0,1000,5000,900000]){
    assert(api.getPitStageLifePosesV60(stage,clock(t),true).every(p=>!p.active&&p.nativeFrame===1));
    for(const phase of ['round-over','match-over'])assert(poses(stage,t,{phase,resultElapsedFrames:60}).every(p=>!p.active&&p.nativeFrame===0));
  }
  for(const context of [undefined,clock(NaN),clock(Infinity),clock(-1),clock(1.5),clock(10,{round:0}),clock(10,{round:1.2})])
    assert(api.getPitStageLifePosesV60(stage,context).every(p=>!p.active&&p.nativeFrame===0));
});

function context(){return {globalAlpha:1,calls:[],stack:[],save(){this.stack.push(this.globalAlpha);},restore(){this.globalAlpha=this.stack.pop();},drawImage(...args){this.calls.push(args);},fillRect(){}};}
const images=stage=>new Map(stage.events.map(e=>[e.src,{src:e.src,naturalWidth:e.width,naturalHeight:e.height}]));

test('native rendering selects exact cells, keeps pivots anchored and respects separate depth passes',()=>{
  const stage=fixture(),schedule=api.getPitStageLifeScheduleV60(arena,1,0),selected=schedule.bag[0];
  stage.events[1].placement.anchor='world';
  for(const parallax of [false,true])for(let nativeFrame=0;nativeFrame<6;nativeFrame++){
    const t=schedule.firstDelay+nativeFrame*20,bank=images(stage);
    const transform=factor=>parallax?{scale:1+factor*.4,translateX:factor*-30,translateY:factor*-40}:{scale:1,translateX:0,translateY:0};
    for(const pass of ['P1','P2','P3']){
      const ctx=context(),report=api.drawPitStageLifeV60(ctx,{stage,pass,groundY:430,images:bank,transform,eventContext:clock(t)});
      assert.equal(report.actorsDrawn,1);assert.equal(report.events.length,1);assert.deepEqual(report.missingPaths,[]);assert.equal(ctx.globalAlpha,1);
      const index=['P1','P2','P3'].indexOf(pass),event=stage.events[index],cell=event.frames[index===selected?nativeFrame:0],draw=ctx.calls[0];
      assert.deepEqual(draw.slice(1,5),cell.rect);assert.equal(draw[0].src,event.src);
      const depth=transform(event.placement.parallax),ground=transform(1),[x,y]=report.events[0].attachment;
      assert.equal(x,event.placement.x*depth.scale+depth.translateX);
      assert.equal(y,event.placement.anchor==='world'?event.placement.bottom*depth.scale+depth.translateY:430*ground.scale+ground.translateY+(event.placement.bottom-430)*depth.scale);
      assert(Math.abs(draw[5]+cell.pivot[0]*draw[7]/cell.rect[2]-x)<1e-9);
      assert(Math.abs(draw[6]+cell.pivot[1]*draw[8]/cell.rect[3]-y)<1e-9);
      assert.equal(draw[7]/cell.rect[2],draw[8]/cell.rect[3],'Uniform native pixel scale');
    }
  }
});

test('a missing or malformed native PNG is reported rather than replaced by unrelated legacy animation',()=>{
  const stage=fixture(),bank=images(stage);bank.delete(stage.events[1].src);bank.get(stage.events[2].src).naturalWidth--;
  for(const [index,pass] of ['P1','P2','P3'].entries()){
    const ctx=context(),report=api.drawPitStageLifeV60(ctx,{stage,pass,groundY:430,images:bank,transform:()=>({scale:1,translateX:0,translateY:0}),eventContext:clock(900)});
    assert.equal(report.actorsDrawn,index===0?1:0);assert.deepEqual(report.missingPaths,index===0?[]:[stage.events[index].src]);
    assert.equal(ctx.calls.length,index===0?1:0);
  }
});

test('loader requests only the selected three native PNGs, gates malformed banks and retries independently',async()=>{
  const stage=fixture(),stageLifeManifestV60=manifest(stage),kit=api.resolvePitArenaProductionKit(arena),previous=globalThis.Image;
  const expected=new Map(kit.planes.flatMap(p=>p.assets.flatMap(a=>a.frames.map(f=>[f.path,[f.generation.width,f.generation.height]]))));
  expected.set('/game/sprites/v54/pit-life/colony-watchers.png',[1536,1024]);
  for(const e of stage.events)expected.set(e.src,[e.width,e.height]);
  const foreign=structuredClone(stage);foreign.stageId='arena-162-unselected';foreign.events=foreign.events.map(e=>({...e,src:e.src.replace(arena,foreign.stageId)}));
  stageLifeManifestV60.stages.push(foreign);
  const requested=[];let failed=stage.events[2].src;
  globalThis.Image=class {naturalWidth=0;naturalHeight=0;onload=null;onerror=null;set src(src){if(!src)return;requested.push(src);queueMicrotask(()=>{
    if(src===failed){this.onerror?.();return;}[this.naturalWidth,this.naturalHeight]=expected.get(src)||[0,0];this.onload?.();
  });}};
  try{
    const bad=await api.loadPitArenaArt(arena,{stageLifeManifestV60,timeoutMs:1000});
    assert.deepEqual([...bad.failedPaths],[failed]);assert.equal(api.isPitArenaArtBankReady(bad,arena),false);
    assert.deepEqual(requested.filter(p=>p.includes('/v60/')),stage.events.map(e=>e.src));
    assert(requested.every(p=>!p.includes('unselected')));
    failed='';const good=await api.loadPitArenaArt(arena,{stageLifeManifestV60,timeoutMs:1000});
    assert(api.isPitArenaArtBankReady(good,arena));assert.equal(api.isPitArenaArtBankReady(bad,arena),false);
    assert.equal(good.stageLifeV60,stage);assert.equal(good.requestedPaths.size,expected.size);
    expected.set(stage.events[0].src,[767,512]);
    const malformed=await api.loadPitArenaArt(arena,{stageLifeManifestV60,timeoutMs:1000});
    assert.deepEqual([...malformed.failedPaths],[stage.events[0].src]);assert.equal(api.isPitArenaArtBankReady(malformed,arena),false);
    const controller=new AbortController();controller.abort();
    const aborted=await api.loadPitArenaArt(arena,{stageLifeManifestV60,signal:controller.signal});assert(aborted.cancelled);assert.equal(aborted.images.size,0);assert.equal(api.isPitArenaArtBankReady(aborted,arena),false);
  }finally{if(previous===undefined)delete globalThis.Image;else globalThis.Image=previous;}
});

test('production drawing projects round-local time and leaves every combat/save/replay byte unchanged',()=>{
  const stage=fixture(),schedule=api.getPitStageLifeScheduleV60(arena,2,0),elapsed=schedule.firstDelay+40;
  const combat=api.createPitCombatState('jungle-hunter','city-hunter',{mode:'match',arenaId:arena});
  combat.round=2;combat.frame=99999;combat.roundFramesRemaining=api.PIT_ROUND_FRAMES-elapsed;
  const bank={arenaId:arena,images:images(stage),requestedPaths:new Set(stage.events.map(e=>e.src)),failedPaths:new Set(),cancelled:false,
    productionKit:{catalogueId:arena,planes:['P0','P1','P2','P3','P4'].map(id=>({id,assets:[]}))},stageLifeV60:stage};
  const camera={arenaId:arena,centerX:480,centerY:270,zoom:1},before=api.serializePitCombat(combat),cameraBefore=JSON.stringify(camera);
  const report=api.drawPitArenaBackdrop(context(),combat,camera,bank);
  assert.equal(report.stageLifeV60.actorsDrawn,3);assert.equal(report.stageLifeV60.events.filter(e=>e.active).length,1);
  assert.equal(report.stageLifeV60.events.find(e=>e.active).nativeFrame,2);
  assert.equal(api.serializePitCombat(combat),before);assert.equal(JSON.stringify(camera),cameraBefore);
  combat.phase='match-over';assert(api.drawPitArenaBackdrop(context(),combat,camera,bank,{lifeResultElapsedMs:1000}).stageLifeV60.events.every(e=>!e.active&&e.nativeFrame===0));
});

test('declared production sheets have exact bytes, native alpha and distinct drawings, never recycled per stage',async()=>{
  const allPaths=new Set(),allHashes=new Set(),ids=new Set();
  for(const stage of api.PIT_STAGE_LIFE_V60.stages){
    assert(!ids.has(stage.stageId));ids.add(stage.stageId);assert(api.isPitStageLifeStageV60(stage));
    for(const event of stage.events){
      assert(!allPaths.has(event.src),'A native event PNG belongs to only one stage');allPaths.add(event.src);
      assert(!allHashes.has(event.sha256),'Renaming shared art does not create a unique stage animation');allHashes.add(event.sha256);
      const bytes=await fs.readFile('public'+event.src);assert.equal(sha(bytes),event.sha256);
      const image=sharp(bytes),meta=await image.metadata();assert(meta.hasAlpha);assert.equal(meta.width,event.width);assert.equal(meta.height,event.height);
      const drawings=new Set();
      for(const frame of event.frames){
        const [left,top,width,height]=frame.rect;const {data,info}=await image.clone().extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
        assert.equal(info.channels,4);drawings.add(sha(data));
        let visible=0,clear=0,minX=width,minY=height,maxX=-1,maxY=-1;
        for(let y=0;y<height;y++)for(let x=0;x<width;x++){const alpha=data[(y*width+x)*4+3];if(alpha>2){visible++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}else clear++;}
        assert(visible>0&&clear>0,'Each authored cell is an isolated drawing on alpha, not a flat scenery rectangle');
        assert.deepEqual(frame.alphaBounds,[minX,minY,maxX-minX+1,maxY-minY+1],'Measured alpha>2 bounds must remain exact');
      }
      assert.equal(drawings.size,event.frames.length,'A held or copied still cannot masquerade as another drawing');
    }
  }
});
