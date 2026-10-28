import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { build } from "esbuild";

const url=new URL("../app/game/HuntCanvas.tsx",import.meta.url);
const source=await readFile(url,"utf8");
const bundle=await build({stdin:{contents:`${source.replace("export default function HuntCanvas","function HuntCanvas")}
export {makeGameState,updatePlayer,captureCheckpoint,restoreCheckpoint,serializeActiveHuntCheckpoint,deserializeActiveHuntCheckpoint};
export {defaultSave} from "./save"; export {MISSION_BY_ID} from "./data";`,
resolveDir:fileURLToPath(new URL("../app/game/",import.meta.url)),sourcefile:fileURLToPath(url),loader:"tsx"},
bundle:true,write:false,format:"cjs",platform:"node",jsx:"automatic",loader:{".module.css":"empty"},external:["react","react/jsx-runtime","react-dom"],logLevel:"silent"});
const compiled={exports:{}};
runInNewContext(bundle.outputFiles[0].text,{module:compiled,exports:compiled.exports,require:createRequire(import.meta.url)});
const runtime=compiled.exports;
function fixture(held="keyboardHeld"){
 const save=runtime.defaultSave("2026-10-28T00:00:00Z"),mission=runtime.MISSION_BY_ID["jungle-vey"];
 const state=runtime.makeGameState(mission,save.loadout,save.inventory,"hunter",save.appearance,false,false,"canopy-test",save.exploration);
 const support=state.world.climbables.find(s=>s.id.startsWith("v112-canopy-")&&s.kind==="vine");
 assert.ok(support);
 Object.assign(state.player,{x:support.x+support.width/2-state.player.width/2,y:support.y+180-state.player.height*.28,
 velocityX:0,velocityY:0,grounded:false,climbing:true,climbZoneId:support.id,stamina:100});
 state.enemies=[];
 const input={keyboardHeld:new Set(),touchHeld:new Set(),gamepadHeld:new Set(),pressed:new Set(),previousGamepadButtons:[],activeGamepadIndex:null,gamepadNeedsNeutral:true,gamepadDialogActions:[],pointerScreen:null};
 const frame=()=>runtime.updatePlayer(state,mission,save.loadout,save.inventory,save.appearance,"hunter",input,1/120,()=>{});
 return {save,mission,state,support,input,frame,held:input[held]};
}
test("shared keyboard, touch and gamepad actions activate, pump and release the real pendulum",()=>{
 for(const device of ["keyboardHeld","touchHeld","gamepadHeld"]){
  const f=fixture(device);f.held.add("right");f.frame();
  assert.ok(f.state.player.canopySwing);assert.equal(f.state.player.climbing,true);
  const initialX=f.state.player.x;
  for(let tick=0;tick<30;tick++)f.frame();
  assert.ok(f.state.player.x>initialX);assert.ok(f.state.player.stamina<100);
  const before={...f.state.player.canopySwing};
  f.input.pressed.add("jump");f.held.add("jump");f.frame();
  assert.equal(f.state.player.canopySwing,null);assert.equal(f.state.player.climbing,false);
  assert.equal(f.state.player.aerialBoostUsed,false);
  assert.ok(f.state.player.climbReattachSeconds>0);
  assert.ok(Math.abs(f.state.player.velocityX-Math.cos(before.angle)*before.length*before.angularVelocity)<.001);
 }
});
test("real checkpoint cloning restores the same swing without replaying an impulse and rejects phantom anchors",()=>{
 const f=fixture();f.held.add("right");f.frame();
 const checkpoint=runtime.captureCheckpoint(f.state);
 const restored=runtime.restoreCheckpoint(f.state,checkpoint,"resume");
 assert.ok(restored.player.canopySwing);
 assert.equal(JSON.stringify(restored.player.canopySwing),JSON.stringify(checkpoint.player.canopySwing));
 assert.notEqual(restored.player.canopySwing,checkpoint.player.canopySwing);
 assert.equal(restored.player.velocityX,checkpoint.player.velocityX);
 const malformed=JSON.parse(JSON.stringify(checkpoint));malformed.player.canopySwing.angle=2;
 assert.equal(runtime.deserializeActiveHuntCheckpoint(runtime.serializeActiveHuntCheckpoint(malformed,0)),null);
 checkpoint.player.climbZoneId="decorative-branch";
 const rejected=runtime.restoreCheckpoint(f.state,checkpoint,"resume");
 assert.equal(rejected.player.canopySwing,null);assert.equal(rejected.player.climbing,false);
 const retried=runtime.restoreCheckpoint(f.state,runtime.captureCheckpoint(f.state),"retry");
 assert.equal(retried.player.canopySwing,null);assert.equal(retried.player.climbing,false);
});
test("remote active supports cannot attract the real player through a wall or across the world",()=>{
 const f=fixture();
 f.state.player.x+=1000;f.frame();
 assert.equal(f.state.player.climbing,false);assert.equal(f.state.player.canopySwing,null);
});
test("stamina exhaustion releases the swing and requires a real landing before reacquisition",()=>{
 const f=fixture();f.held.add("right");f.frame();f.state.player.stamina=.001;f.frame();
 assert.equal(f.state.player.climbing,false);assert.equal(f.state.player.canopySwing,null);
 assert.equal(f.state.player.climbGripExhausted,true);
 f.held.clear();f.held.add("up");f.state.player.stamina=100;
 for(let tick=0;tick<5;tick++)f.frame();
 assert.equal(f.state.player.climbing,false);
});

for(const missionId of ["jungle-vey","ice-cryostalker","volcano-bad-blood","swamp-hydra","desert-sandmaw","ocean-leviathan","fungal-hivemind","ruins-ancient-guardian"]){
 for(const armorId of ["scout","hunter","berserker"]){
  for(const device of ["keyboardHeld","touchHeld","gamepadHeld"]){
   test(`complete authored canopy rests: ${missionId}, ${armorId}, ${device}`,()=>{
    const save=runtime.defaultSave("2026-10-28T00:00:00Z");
    save.loadout.armorId=armorId;
    const mission=runtime.MISSION_BY_ID[missionId];
    const state=runtime.makeGameState(mission,save.loadout,save.inventory,"hunter",save.appearance,false,false,"canopy-qualification",save.exploration);
    state.enemies=[];
    const input={keyboardHeld:new Set(),touchHeld:new Set(),gamepadHeld:new Set(),pressed:new Set(),previousGamepadButtons:[],activeGamepadIndex:null,gamepadNeedsNeutral:true,gamepadDialogActions:[],pointerScreen:null};
    const held=input[device];
    const frame=()=>runtime.updatePlayer(state,mission,save.loadout,save.inventory,save.appearance,"hunter",input,1/120,()=>{});
    const rests=state.world.platforms.filter(p=>p.id.startsWith(`v112-canopy-${missionId}-0-`));
    assert.equal(rests.length,6);
    const firstGrip=state.world.climbables.find(s=>s.id===rests[0].id.replace("-rest","-grip"));
    const lastGrip=state.world.climbables.find(s=>s.id===rests[5].id.replace("-rest","-grip"));
    assert.ok(firstGrip&&lastGrip);
    // Only initial insertion is positioned by the fixture. Entry, every
    // transfer and the return to ground use production controls and collision.
    Object.assign(state.player,{x:firstGrip.x+firstGrip.width/2-state.player.width/2,
      y:state.world.floorY-state.player.height,previousY:state.world.floorY-state.player.height,
      velocityX:0,velocityY:0,grounded:true,climbing:false,climbZoneId:null,canopySwing:null});
    frame();
    assert.equal(state.player.grounded,true);
    assert.equal(state.player.y+state.player.height,state.world.floorY);
    held.add("up");
    for(let tick=0;tick<420&&state.player.y+state.player.height>rests[0].y-16;tick++)frame();
    assert.equal(state.player.climbing,true);
    assert.equal(state.player.climbZoneId,firstGrip.id);
    assert.ok(state.player.y+state.player.height<=rests[0].y-16);
    // A directional release from a rigid trunk/face lets gravity deliver
    // the hunter onto the first branch; no jump or boost is fabricated.
    held.clear();held.add("right");frame();held.clear();
    for(let tick=0;tick<240&&!state.player.grounded;tick++)frame();
    assert.equal(state.player.grounded,true);
    assert.ok(Math.abs(state.player.y+state.player.height-rests[0].y)<1e-6);
    assert.ok(state.player.x+state.player.width>rests[0].x&&state.player.x<rests[0].x+rests[0].width);
    let contacts=1;
    for(const target of rests.slice(1)){
      const center=target.x+target.width/2;
      held.add("right");held.add("jump");input.pressed.add("jump");
      let airborne=false,landed=false;
      for(let tick=0;tick<240;tick++){
        if(state.player.x+state.player.width/2>=center-20)held.delete("right");
        else held.add("right");
        frame();
        if(!state.player.grounded)airborne=true;
        if(airborne&&state.player.grounded){landed=true;break;}
      }
      assert.equal(landed,true,`${target.id}: must finish a real airborne transfer`);
      assert.ok(Math.abs(state.player.y+state.player.height-target.y)<1e-6,
        `${target.id}: landing must be on the expected resting height, got ${state.player.y+state.player.height}`);
      assert.ok(state.player.x+state.player.width>target.x&&state.player.x<target.x+target.width,
        `${target.id}: real body must overlap the intended branch`);
      assert.equal(state.player.aerialBoostUsed,false);
      contacts++;
      held.delete("jump");
      // Walk to the resting center using the same device, then release. This
      // also supplies the fresh release edge required by the next jump.
      for(let tick=0;tick<180;tick++){
        const difference=center-(state.player.x+state.player.width/2);
        held.delete("left");held.delete("right");
        if(difference>12)held.add("right");
        else if(difference< -12)held.add("left");
        frame();
        if(Math.abs(difference)<=12&&Math.abs(state.player.velocityX)<8)break;
      }
      held.clear();
      for(let tick=0;tick<12;tick++)frame();
      assert.equal(state.player.grounded,true);
      assert.ok(Math.abs(state.player.y+state.player.height-target.y)<1e-6);
    }
    assert.equal(contacts,6);
    held.clear();held.add("down");
    for(let tick=0;tick<420;tick++){
      frame();
      if(state.player.grounded&&Math.abs(state.player.y+state.player.height-state.world.floorY)<1e-6)break;
    }
    held.clear();
    assert.equal(state.player.grounded,true);
    assert.ok(Math.abs(state.player.y+state.player.height-state.world.floorY)<1e-6,"end support returns to the real ground");
    assert.ok(Math.abs(state.player.x+state.player.width/2-(lastGrip.x+lastGrip.width/2))<80);
    assert.equal(state.player.aerialBoostUsed,false);
   });
  }
 }
}

test("canopy and airborne controls do not inherit mud from a distant ground surface",()=>{
 function velocityAt(height){
  const f=fixture();
  const branch=f.state.world.platforms.find(p=>p.id===f.support.id.replace("-grip","-rest"));
  f.state.world={...f.state.world,surfaces:[{id:"ground-mud",x:0,y:582,width:f.state.world.width,height:42,
    material:"mud",footprintPersistenceSeconds:20,scentRetention:1,movementMultiplier:.4,baseNoise:.3,mudDepth:1}],
    hazards:[]};
  Object.assign(f.state.player,{y:height==="ground"?624-f.state.player.height:branch.y-f.state.player.height-(height==="air"?20:0),
    previousY:height==="ground"?624-f.state.player.height:branch.y-f.state.player.height-(height==="air"?20:0),
    grounded:height!=="air",climbing:false,climbZoneId:null,canopySwing:null,velocityX:0,velocityY:height==="air"?-250:0});
  f.held.add("right");
  for(let tick=0;tick<20;tick++)f.frame();
  return f.state.player.velocityX;
 }
 const ground=velocityAt("ground"),canopy=velocityAt("canopy"),air=velocityAt("air");
 assert.ok(canopy>ground*2,"the branch remains dry above the ground mud");
 assert.ok(air>ground*2,"air steering remains independent of the floor material");
});

test("a pumped native pendulum releases and catches the next authored vine without a boost",()=>{
 const f=fixture();
 // Climb above the resting branches before pumping. A low pendulum is meant
 // to land on a real branch; that collision is not a failed rope constraint.
 f.held.add("up");
 let climbTicks=0;
 while(f.state.player.y+f.state.player.height*.28-f.support.y>120&&climbTicks++<100)f.frame();
 assert.ok(climbTicks<100,"the actual up input gives the swing clearance above the rests");
 assert.equal(f.state.player.climbing,true);
 f.held.clear();
 const nextId=f.support.id.replace(/-1-grip$/,"-2-grip");
 assert.ok(f.state.world.climbables.some(s=>s.id===nextId&&s.kind==="vine"));
 f.held.add("right");f.frame();
 let ready=false;
 for(let tick=0;tick<600;tick++){
  const swing=f.state.player.canopySwing;
  assert.ok(swing,"the real rope remains held while pumping");
  if(swing.angle>.5&&swing.angularVelocity>1.2){ready=true;break;}
  f.held.delete("left");f.held.delete("right");
  f.held.add(swing.angularVelocity>=0?"right":"left");
  f.frame();
 }
 assert.equal(ready,true,"alternating physical direction builds a bounded useful swing");
 f.held.clear();f.held.add("right");f.held.add("up");f.held.add("jump");f.input.pressed.add("jump");
 f.frame();
 assert.equal(f.state.player.climbing,false);
 assert.equal(f.state.player.canopySwing,null);
 for(let tick=0;tick<60&&!f.state.player.climbing;tick++)f.frame();
 assert.equal(f.state.player.climbing,true);
 assert.equal(f.state.player.climbZoneId,nextId);
 assert.equal(f.state.player.aerialBoostUsed,false);
 assert.ok(f.state.player.stamina>0&&f.state.player.stamina<f.state.player.maxStamina);
});

for(const [supportId,expectedHeight,gripLength] of [
 ["jungle-vertical-vine-heart",862,760],
 ["jungle-vertical-vine-east",1054,900],
]){
 test(`real unlocked Oseris long vine ${supportId} starts, resumes and releases above 720 px`,()=>{
  const save=runtime.defaultSave("2026-10-28T00:00:00Z");
  save.exploration.abilityIds.push("aerial-boost");
  const mission=runtime.MISSION_BY_ID["jungle-vey"];
  const state=runtime.makeGameState(mission,save.loadout,save.inventory,"hunter",save.appearance,false,false,"long-oseris-vine",save.exploration);
  const support=state.world.climbables.find(zone=>zone.id===supportId);
  assert.ok(support,"the unlocked production world provides the actual vine");
  assert.equal(support.height,expectedHeight);
  state.enemies=[];
  // Place only the initial grasp on the real support. The heart grasp stays
  // above its gallery floor; neither its support nor collision geometry is edited.
  Object.assign(state.player,{x:support.x+support.width/2-state.player.width/2,
    y:support.y+gripLength-state.player.height*.28,
    previousY:support.y+gripLength-state.player.height*.28,
    velocityX:0,velocityY:0,grounded:false,climbing:true,climbZoneId:support.id,
    canopySwing:null,aerialBoostUsed:false});
  const input={keyboardHeld:new Set(["right"]),touchHeld:new Set(),gamepadHeld:new Set(),pressed:new Set(),previousGamepadButtons:[],activeGamepadIndex:null,gamepadNeedsNeutral:true,gamepadDialogActions:[],pointerScreen:null};
  const frame=game=>runtime.updatePlayer(game,mission,save.loadout,save.inventory,save.appearance,"hunter",input,1/120,()=>{});
  assert.doesNotThrow(()=>frame(state),"a valid long attachment must not throw from the simulation");
  assert.ok(state.player.canopySwing);
  assert.ok(state.player.canopySwing.length>720);
  for(let tick=0;tick<18;tick++)frame(state);
  assert.equal(state.player.climbZoneId,supportId);
  assert.ok(state.player.canopySwing?.length>720);
  const checkpoint=runtime.captureCheckpoint(state);
  const decoded=runtime.deserializeActiveHuntCheckpoint(runtime.serializeActiveHuntCheckpoint(checkpoint,0));
  assert.ok(decoded,"the real checksum/schema accepts the same long swing produced by attach");
  const resumed=runtime.restoreCheckpoint(state,decoded.checkpoint,"resume");
  assert.equal(resumed.player.climbing,true);
  assert.equal(resumed.player.climbZoneId,supportId);
  assert.ok(resumed.player.canopySwing?.length>720);
  assert.equal(resumed.player.canopySwing.length,checkpoint.player.canopySwing.length);
  resumed.paused=false;
  input.keyboardHeld.clear();frame(resumed); // acknowledge the real resume neutral requirement
  input.keyboardHeld.add("right");input.keyboardHeld.add("jump");input.pressed.add("jump");
  assert.doesNotThrow(()=>frame(resumed));
  assert.equal(resumed.player.canopySwing,null);
  assert.equal(resumed.player.climbing,false);
  assert.equal(resumed.player.aerialBoostUsed,false,"climb release takes priority over the owned boost");
  assert.ok(Number.isFinite(resumed.player.velocityX)&&Number.isFinite(resumed.player.velocityY));
  const forged=JSON.parse(JSON.stringify(checkpoint));
  forged.player.canopySwing.length=2048.001;
  assert.equal(runtime.deserializeActiveHuntCheckpoint(runtime.serializeActiveHuntCheckpoint(forged,0)),null,
    "a checksum cannot expand the shared physical domain");
 });
}
