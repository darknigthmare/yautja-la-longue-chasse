import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:'export * from "./app/game/pitStageLifeRenderingV61";export * from "./app/game/pitStageStoryV61";export * from "./app/game/pitStageLifeDirectorV60";',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const stageId='arena-144-archie-riverdale';
const stage={stageId,events:[0,1,2].map(i=>({id:'event-'+i,name:'Native motif '+i,src:`/game/sprites/v61/pit-life/${stageId}/ambient-${i}.png`,sha256:String(i+1).repeat(64),width:1536,height:1024,
  frames:Array.from({length:6},(_,j)=>({rect:[j%3*512,Math.floor(j/3)*512,512,512],pivot:[256,480],alphaBounds:[120,130,270,351]})),
  fps:3,restFrame:0,reducedMotionFrame:1,placement:{x:250+i*150,bottom:320,height:90,parallax:.05,renderPass:'P2',anchor:'world'},
  ...(i===2?{idleVisibility:'hidden',travelX:[260,580],clipWorld:{x:300,y:220,width:240,height:105},opacity:.7}:{})}))};
const images=new Map(stage.events.map(e=>[e.src,{naturalWidth:e.width,naturalHeight:e.height,src:e.src}]));
const transform=factor=>({scale:1+factor*.4,translateX:-40*factor,translateY:-30*factor});
const clock=t=>({round:2,phase:'round',roundFrame:t});
const start=cycle=>{const schedule=api.getPitStageLifeScheduleV60(stageId,2,cycle);return schedule.firstDelay+cycle*api.PIT_STAGE_LIFE_CYCLE_V60+schedule.starts[schedule.bag.indexOf(2)];};
const canvas=()=>({globalAlpha:1,calls:[],clips:[],stack:[],save(){this.stack.push(this.globalAlpha);},restore(){this.globalAlpha=this.stack.pop();},beginPath(){},rect(...rect){this.clips.push(rect);},clip(){this.clipCalls=(this.clipCalls??0)+1;},drawImage(...args){this.calls.push({args,alpha:this.globalAlpha});}});
function render(t,reduced=false){const ctx=canvas(),report=api.drawPitStageLifeV61(ctx,{stage,images,pass:'P2',groundY:430,transform,eventContext:clock(t),reducedMotion:reduced});return {ctx,report};}

test('a traversing native actor requires a hidden rest state, explicit world aperture and bounded opacity',()=>{
  assert(api.isPitStageLifeStageV61(stage));
  for(const mutate of [s=>s.events[2].idleVisibility='rest',s=>s.events[2].placement.anchor='ground',s=>delete s.events[2].clipWorld,
    s=>s.events[2].travelX=[10,10],s=>s.events[2].travelX=[NaN,500],s=>s.events[2].clipWorld.width=-1,s=>s.events[2].opacity=1.5]){
    const changed=structuredClone(stage);mutate(changed);assert.equal(api.isPitStageLifeStageV61(changed),false);
  }
});
test('six native drawings cross the aperture at constant tick velocity, with unchanged source rectangles and exact plane-space clip',()=>{
  let previous;const begin=start(0),motion=stage.events[2],depth=transform(.05);
  for(let t=0;t<120;t++){
    const {ctx,report}=render(begin+t),traveler=report.events.find(e=>e.eventId===motion.id);
    assert.equal(report.actorsDrawn,3);assert(traveler.active&&traveler.visible&&traveler.drawn&&traveler.clipped);
    assert.equal(traveler.nativeFrame,Math.floor(t/20));assert(Math.abs(traveler.travelX-(260+320*t/119))<1e-9);
    if(previous!==undefined)assert(Math.abs(traveler.travelX-previous-320/119)<1e-9);previous=traveler.travelX;
    const call=ctx.calls.at(-1),cell=motion.frames[Math.floor(t/20)];assert.deepEqual(call.args.slice(1,5),cell.rect);
    assert.equal(call.args[7]/cell.rect[2],call.args[8]/cell.rect[3]);assert(Math.abs(call.alpha-.92*.7)<1e-9);
    assert.deepEqual(ctx.clips,[[300*depth.scale+depth.translateX,220*depth.scale+depth.translateY,240*depth.scale,105*depth.scale]]);
    assert.equal(ctx.clipCalls,1);assert.equal(ctx.globalAlpha,1);assert.equal(traveler.attachment[0],traveler.travelX*depth.scale+depth.translateX);
  }
});
test('idle and reduced motion never leave a frozen running pose in the window; three events stay authored',()=>{
  for(const t of [0,start(0)-1,start(0)+120,start(1)-1]){
    const {ctx,report}=render(t);assert.equal(stage.events.length,3);assert.equal(report.events.length,3);assert.equal(report.actorsDrawn,2);
    const traveler=report.events[2];assert.equal(traveler.visible,false);assert.equal(traveler.drawn,false);assert.equal(traveler.travelX,null);assert.equal(traveler.attachment,null);assert.equal(ctx.clips.length,0);
  }
  for(let frame=0;frame<6;frame++){const {report}=render(start(0)+frame*20,true);assert.equal(report.actorsDrawn,2);assert.equal(report.events[2].visible,false);assert(report.events.every(e=>!e.active));}
});
test('pause and arbitrary seeking reproduce movement and native pose without changing stage metadata or seeded schedule',()=>{
  const before=JSON.stringify(stage),wanted=render(start(0)+45),schedule=api.getPitStageLifeScheduleV60(stageId,2,0),random=Math.random;
  Math.random=()=>{throw Error('No RNG for backdrop travel');};
  try {for(const tick of [0,start(2)+119,start(1)+40,70000,start(0)+45]){render(tick);const actual=render(start(0)+45);assert.deepEqual(actual.report,wanted.report);assert.deepEqual(actual.ctx.calls,wanted.ctx.calls);assert.deepEqual(actual.ctx.clips,wanted.ctx.clips);}}finally{Math.random=random;}
  assert.equal(JSON.stringify(stage),before);assert.deepEqual(api.getPitStageLifeScheduleV60(stageId,2,0),schedule);
});
