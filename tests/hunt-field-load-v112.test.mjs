import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {runInNewContext} from "node:vm";
import test from "node:test";
import {build} from "esbuild";
const url=new URL("../app/game/HuntCanvas.tsx",import.meta.url),source=await readFile(url,"utf8");
const bundle=await build({stdin:{contents:source.replace("export default function HuntCanvas","function HuntCanvas")+String.raw`
export {makeGameState,updatePlayer,snapshot,emitNoise,huntFieldLoadV112};
export {defaultSave} from "./save"; export {MISSION_BY_ID} from "./data";`,
  resolveDir:fileURLToPath(new URL("../app/game/",import.meta.url)),sourcefile:fileURLToPath(url),loader:"tsx"},
  bundle:true,write:false,format:"cjs",platform:"node",jsx:"automatic",loader:{".module.css":"empty"},
  external:["react","react/jsx-runtime","react-dom"],logLevel:"silent"});
const compiled={exports:{}};runInNewContext(bundle.outputFiles[0].text,{module:compiled,exports:compiled.exports,require:createRequire(import.meta.url)});
const r=compiled.exports;
function fixture(armorId="hunter",loaded=false) {
  const save=r.defaultSave("2026-10-28T00:00:00Z");save.loadout.armorId=armorId;
  const mission=r.MISSION_BY_ID["jungle-vey"];
  const state=r.makeGameState(mission,save.loadout,save.inventory,"hunter",save.appearance,false,false,7,save.exploration);
  state.world={...state.world,platforms:[],climbables:[],hazards:[],surfaces:[{id:"flat",x:0,width:state.world.width,movementMultiplier:1,noiseMultiplier:1,trackPersistence:1}]};
  state.enemies=[];state.player.x=300;state.player.y=state.world.floorY-state.player.height;
  const maxMass=armorId==="scout"?24:armorId==="berserker"?52:36;
  state.huntRites.specimensV112=loaded?[{id:"jungle-vey:7:body:hide",sourceId:"jungle-vey:7:body",speciesId:"hell-hound-stalker",partId:"hide",label:"Prise contrôlée",quality:80,massKg:maxMass,volumeUnits:1,stage:"raw"}]:[];
  const input={keyboardHeld:new Set(),touchHeld:new Set(),gamepadHeld:new Set(),pressed:new Set(),previousGamepadButtons:[],activeGamepadIndex:null,gamepadNeedsNeutral:true,gamepadDialogActions:[],pointerScreen:null};
  const frame=(delta=1/120)=>r.updatePlayer(state,mission,save.loadout,save.inventory,save.appearance,"hunter",input,delta,()=>{});
  return {state,input,frame,mission};
}
test("field stock slows native movement for every armor and the HUD exposes the same actual load",()=>{
  for(const armor of ["scout","hunter","berserker"]) {
    const empty=fixture(armor),full=fixture(armor,true);
    empty.input.keyboardHeld.add("right");full.input.keyboardHeld.add("right");
    for(let i=0;i<80;i++){empty.frame();full.frame();}
    assert.ok(full.state.player.x<empty.state.player.x-35);
    assert.ok(Math.abs(full.state.player.velocityX/empty.state.player.velocityX-.68)<1e-8);
    full.state.fieldLoadV112={noiseMultiplier:0,massKg:0};
    const view=r.snapshot(full.state,full.mission);
    assert.ok(view.fieldLoadV112.massKg>0,"HUD derives stock rather than trusting transient cached values");
    assert.equal(view.fieldLoadV112.movementMultiplier,.68);
  }
});
test("native jumps preserve assistance and pay the explicit load penalty without consuming a boost",()=>{
  for(const armor of ["scout","hunter","berserker"]) {
    const empty=fixture(armor),full=fixture(armor,true);
    for(const f of [empty,full]){f.input.pressed.add("jump");f.input.keyboardHeld.add("jump");f.frame();}
    assert.ok(full.state.player.velocityY>empty.state.player.velocityY+70);
    assert.equal(full.state.player.aerialBoostUsed,false);
    assert.equal(full.state.player.grounded,false);
  }
});
test("native climbing charges the weight effort and reduces ascent speed for all armors",()=>{
  for(const armor of ["scout","hunter","berserker"]) {
    const empty=fixture(armor),full=fixture(armor,true);
    for(const f of [empty,full]) {
      const p=f.state.player;
      const support={id:"actual-tree",x:p.x+p.width/2-50,y:40,width:100,height:584,kind:"tree",routeId:"canopy",climbSpeedMultiplier:1,staminaPerSecond:10,dismounts:[]};
      f.state.world.climbables=[support];p.y=280;p.grounded=false;p.climbing=true;p.climbZoneId=support.id;p.stamina=80;
      f.input.keyboardHeld.add("up");
      for(let i=0;i<60;i++)f.frame();
    }
    assert.ok(full.state.player.y>empty.state.player.y+20);
    assert.ok(empty.state.player.stamina-full.state.player.stamina>2.9);
  }
});
test("pack noise changes footsteps and landings while hostile or weapon signals retain their meaning",()=>{
  const f=fixture("hunter",true);f.frame();f.state.noiseEvents=[];
  r.emitNoise(f.state,"footstep",.2,100,{x:300,y:624});
  r.emitNoise(f.state,"landing",.3,120,{x:300,y:624});
  r.emitNoise(f.state,"weapon",.5,200,{x:300,y:624});
  r.emitNoise(f.state,"footstep",.2,100,{x:300,y:624},"real-enemy");
  assert.equal(f.state.noiseEvents[0].radius,180);assert.ok(Math.abs(f.state.noiseEvents[0].loudness-.36)<1e-8);
  assert.equal(f.state.noiseEvents[1].radius,216);
  assert.equal(f.state.noiseEvents[2].radius,200);assert.equal(f.state.noiseEvents[3].radius,100);
});
test("carcass is dropped before jumping and never charges the jump as if still carried",()=>{
  const f=fixture(),p=f.state.player;
  f.state.huntRites.corpses=[{id:"body",massKg:150,erased:false,supportId:null}];
  f.state.huntRites.carryingCorpseId="body";f.frame();
  assert.equal(f.state.fieldLoadV112.massKg,150);
  f.input.pressed.add("jump");f.input.keyboardHeld.add("jump");f.frame();
  assert.equal(f.state.huntRites.carryingCorpseId,null);
  assert.equal(f.state.fieldLoadV112.massKg,0);
  assert.ok(p.velocityY<-500);
});
