import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { build } from "esbuild";

const bundled = await build({
  entryPoints:[fileURLToPath(new URL("../app/game/systems/canopyTraversalV112.ts",import.meta.url))],
  bundle:true,write:false,platform:"node",format:"cjs",logLevel:"silent",
});
const compiled={exports:{}};
runInNewContext(bundled.outputFiles[0].text,{module:compiled,exports:compiled.exports,require:createRequire(import.meta.url)});
const runtime=compiled.exports;
const support={id:"actual-vine",x:300,y:100,width:50,height:340,kind:"vine",routeId:"canopy",climbSpeedMultiplier:1,staminaPerSecond:4,dismounts:[]};
const body={x:287,y:267.52,width:76,height:116,velocityX:0,velocityY:0};
const close=(a,b,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<tolerance,`${a} expected ${b}`);
const platform=(x,y,width,height,collision="solid")=>({id:"solid",x,y,width,height,collision,routeId:"ground",material:"stone",noiseMultiplier:1,trackPersistence:1});

test("grasp initializes from the actual hand without changing position; rigid and short supports refuse",()=>{
  const swing=runtime.attachCanopySwingV112(body,support);
  assert.ok(swing);
  const point=runtime.canopySwingPointV112(swing,support);
  close(point.x,body.x+body.width/2); close(point.y,body.y+body.height*.28);
  assert.equal(runtime.attachCanopySwingV112(body,{...support,kind:"tree"}),null);
  assert.equal(runtime.attachCanopySwingV112({...body,y:100},support),null);
  assert.equal(runtime.attachCanopySwingV112({...body,y:600},support),null);
});

test("unpowered pendulum uses rope length and gravity, with damping rather than energy growth",()=>{
  for(const length of [110,220,330]){
    let swing={supportId:support.id,length,angle:.6,angularVelocity:0};
    const point=runtime.canopySwingPointV112(swing,support);
    let actor={...body,x:point.x-body.width/2,y:point.y-body.height*.28};
    const energy=s=>.5*(s.length*s.angularVelocity)**2+1850*s.length*(1-Math.cos(s.angle));
    const before=energy(swing); let previous=swing.angle, crossings=0;
    for(let frame=0;frame<1200;frame++){
      const next=runtime.stepCanopySwingV112(swing,actor,support,{moveAxis:0,climbAxis:0},1/120,[],624);
      assert.equal(next.detached,false); assert.ok(next.tensionPerKg>0);
      if(next.swing.angle*previous<0)crossings++;
      previous=next.swing.angle;swing=next.swing;actor=next.body;
      assert.ok(energy(swing)<before*1.025,"semi-implicit solver has bounded discretization error");
    }
    assert.ok(crossings>=7 && crossings<=14);
    assert.ok(energy(swing)<before*.35);
  }
});

test("pumping and length adjustment remain finite, bounded and charge stamina only for simulated time",()=>{
  let swing=runtime.attachCanopySwingV112(body,support),actor={...body},cost=0;
  for(let frame=0;frame<7200;frame++){
    const input={moveAxis:Math.sign(swing.angularVelocity)||1,climbAxis:frame<180?-1:frame<1200?1:0};
    const next=runtime.stepCanopySwingV112(swing,actor,support,input,1/120,[],624,1.6);
    assert.equal(next.detached,false);swing=next.swing;actor=next.body;cost+=next.staminaCost;
    assert.ok(runtime.isCanopySwingSnapshotV112(swing));
    assert.ok(swing.length>=70&&swing.length<=support.height);
    assert.ok(Math.abs(swing.angularVelocity*swing.length)<=850.001);
  }
  assert.ok(cost>400&&cost<1000);
  const remote={...actor,x:actor.x+1000};
  const refused=runtime.stepCanopySwingV112(swing,remote,support,{moveAxis:1,climbAxis:0},.1,[],624);
  assert.equal(refused.detached,true); close(refused.body.x,remote.x); close(refused.staminaCost,0);
  const idle=runtime.stepCanopySwingV112(swing,actor,support,{moveAxis:0,climbAxis:0},0,[],624);
  close(idle.staminaCost,0);
  assert.throws(()=>runtime.stepCanopySwingV112(swing,actor,support,{moveAxis:0,climbAxis:0},.251,[],624),/delta/);
});

test("release exports tangent velocity, including downward motion, without adding a boost",()=>{
  for(const angle of [-.8,0,.8]){
    const swing={supportId:support.id,length:220,angle,angularVelocity:2};
    const velocity=runtime.releaseCanopySwingV112(swing);
    close(velocity.velocityX,Math.cos(angle)*440);
    close(velocity.velocityY,-Math.sin(angle)*440);
    close(Math.hypot(velocity.velocityX,velocity.velocityY),440);
  }
});

test("swept swing stops at a thin solid wall and releases rather than crossing or snapping to the rope",()=>{
  const swing={supportId:support.id,length:220,angle:0,angularVelocity:3};
  const point=runtime.canopySwingPointV112(swing,support);
  const actor={...body,x:point.x-body.width/2,y:point.y-body.height*.28};
  const wall=platform(actor.x+body.width+12,200,3,220);
  const next=runtime.stepCanopySwingV112(swing,actor,support,{moveAxis:1,climbAxis:0},.1,[wall],624);
  assert.equal(next.detached,true);
  assert.ok(next.body.x+body.width<=wall.x+1e-5);
  assert.equal(runtime.canopySegmentClearV112({x:10,y:10},{x:200,y:10},[platform(90,0,2,40)]),false);
  assert.equal(runtime.canopySegmentClearV112({x:10,y:10},{x:200,y:10},[platform(90,0,2,40,"one-way")]),true);
});

test("support reach checks reject remote or wall-separated grips and malformed suspended state",()=>{
  assert.equal(runtime.canopySupportReachableV112(body,support,[]),true);
  assert.equal(runtime.canopySupportReachableV112({...body,x:1000},support,[]),false);
  const edgeBody={...body,x:support.x-body.width/2-12};
  assert.equal(runtime.canopySupportReachableV112(edgeBody,support,[platform(support.x-8,100,3,400)]),false);
  const swing=runtime.attachCanopySwingV112(body,support);
  assert.equal(runtime.canopySupportReachableV112(body,support,[],swing),true);
  assert.equal(runtime.canopySupportReachableV112(body,{...support,id:"invented"},[],swing),false);
  for(const malformed of [{...swing,length:NaN},{...swing,angle:1.251},{...swing,angularVelocity:100},{...swing,supportId:""}])
    assert.equal(runtime.isCanopySwingSnapshotV112(malformed),false);
});

const worldBundle=await build({entryPoints:[fileURLToPath(new URL("../app/game/systems/worldBlueprints.ts",import.meta.url))],bundle:true,write:false,platform:"node",format:"cjs",logLevel:"silent"});
const worldModule={exports:{}};
runInNewContext(worldBundle.outputFiles[0].text,{module:worldModule,exports:worldModule.exports,require:createRequire(import.meta.url)});
test("each authored hunt has reachable resting sequences, real end supports and an optional fallback",()=>{
  for(const world of Object.values(worldModule.exports.WORLD_BLUEPRINTS_BY_MISSION)){
    const route=world.routes.find(route=>route.id==="canopy-transfer");
    assert.ok(route,`${world.missionId} has an authored route`);
    assert.deepEqual(Array.from(route.requirements),["climb"]);
    assert.ok(!route.requirements.includes("aerial-boost"));
    const rests=world.platforms.filter(p=>p.id.startsWith("v112-canopy-"));
    const grips=world.climbables.filter(p=>p.id.startsWith("v112-canopy-"));
    assert.ok(rests.length>=6&&grips.length===rests.length);
    for(let index=0;index<rests.length;index++){
      assert.ok(route.waypointIds.includes(rests[index].id));
      assert.ok(route.waypointIds.includes(grips[index].id));
      if(index%6===0||index%6===5)close(grips[index].y+grips[index].height,world.floorY);
      if(index%6!==5){
        close(rests[index+1].x-rests[index].x,180);
        assert.ok(Math.abs(rests[index+1].y-rests[index].y)<=25);
        assert.ok(rests[index+1].x-rests[index].x-rests[index].width<=50);
      }
    }
    assert.deepEqual(Array.from(worldModule.exports.validateWorldBlueprint(world)),[]);
  }
});
