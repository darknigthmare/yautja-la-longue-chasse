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
