import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {runInNewContext} from "node:vm";
import {build} from "esbuild";
const canvasUrl=new URL("../app/game/HuntCanvas.tsx",import.meta.url);
const source=await readFile(canvasUrl,"utf8");
const compiled=await build({stdin:{contents:`${source.replace("export default function HuntCanvas","function HuntCanvas")}
export {makeGameState,makeEnemy,damageEnemy,updateHuntRitesV77,riteContextV77,riteRuntimeOptionsV112,syncCarcassTransportV112,resultFor,captureCheckpoint,serializeActiveHuntCheckpoint,deserializeActiveHuntCheckpoint,restoreCheckpoint,updateRegularEnemy,riteSourceLabelV77};
export {defaultSave} from "./save";
export {MISSION_BY_ID} from "./data";
export {startHuntRiteV77} from "./systems/ritesOfHuntV77";
export {restoreRitesRuntimeV77} from "./systems/huntRitesRuntimeV77";
export {carcassSupportsForWorldV112} from "./systems/carcassSupportsV112";`,resolveDir:fileURLToPath(new URL("../app/game/",import.meta.url)),sourcefile:fileURLToPath(canvasUrl),loader:"tsx"},
  bundle:true,write:false,format:"cjs",platform:"node",jsx:"automatic",loader:{".module.css":"empty"},external:["react","react/jsx-runtime","react-dom"],logLevel:"silent"});
const mod={exports:{}};
runInNewContext(compiled.outputFiles[0].text,{module:mod,exports:mod.exports,require:createRequire(import.meta.url),document:{hidden:false,hasFocus:()=>true},navigator:{getGamepads:()=>[]}});
const r=mod.exports,plain=x=>JSON.parse(JSON.stringify(x));
function fixture({width=40,height=60}={}){
  const save=r.defaultSave("2026-10-28T00:00:00.000Z");save.inventory.fieldToolIds=["flaying-tool"];
  const mission=r.MISSION_BY_ID["jungle-vey"];
  const state=r.makeGameState(mission,save.loadout,save.inventory,"hunter",save.appearance,false,false,7,save.exploration);
  state.world={...state.world,platforms:[],hazards:[],covers:[],climbables:[{id:"j-tree-west",x:1000,y:248,width:132,height:376,kind:"tree",routeId:"canopy",climbSpeedMultiplier:1,staminaPerSecond:3,dismounts:[]}]};
  Object.assign(state.player,{x:1100,y:624-state.player.height,previousY:624-state.player.height,grounded:true,climbing:false,velocityX:0,velocityY:0});
  const enemy=r.makeEnemy("body","hell-hound-stalker",mission.id,1120,state.world.width,80,10,0,1,1);
  Object.assign(enemy,{x:1120,y:624-height,width,height,health:80,maxHealth:80,scanned:true});
  state.enemies=[enemy];state.elapsed=1;r.damageEnemy(state,mission,enemy,80,"melee");
  assert.equal(state.huntRites.corpses.length,1);return {state,save,mission,enemy};
}
function act(f,action){
  const options=r.riteRuntimeOptionsV112(f.state);
  const started=r.startHuntRiteV77(f.state.huntRites,"body",action,r.riteContextV77(f.state),{supportId:options.supports[0]?.id});
  assert.equal(started.accepted,true,started.message);f.state.huntRites=started.state;
  if(f.state.huntRites.operation)f.state.riteOperationDamageStart=f.state.damageTaken;
  for(let i=0;i<160&&f.state.huntRites.operation;i++){f.state.elapsed+=.05;r.updateHuntRitesV77(f.state,.05);}
  assert.equal(f.state.huntRites.operation,null);r.syncCarcassTransportV112(f.state);
}
test("native damage, flay, carry, attachment and falling preserve one real collision actor",()=>{
  const f=fixture();act(f,"analyze");act(f,"flay");act(f,"carry");
  assert.equal(f.state.huntRites.carryingCorpseId,"body");
  const target=r.carcassSupportsForWorldV112(f.state.world)[0];assert.ok(target);
  act(f,"hang");
  assert.equal(f.enemy.x+f.enemy.width/2,target.x);assert.equal(f.enemy.y+f.enemy.height,target.y+82);
  assert.equal(f.state.huntRites.corpses[0].supportId,target.id);
  const before=f.enemy.y;
  r.updateRegularEnemy(f.state,f.enemy,f.mission,.05);
  assert.equal(f.enemy.y,before,"attached source must not fall through its own displayed body");
  f.state.world.climbables=[];r.updateHuntRitesV77(f.state,.05);
  assert.equal(f.state.huntRites.corpses[0].supportId,null);
  r.updateRegularEnemy(f.state,f.enemy,f.mission,.05);
  assert.ok(f.enemy.y>before,"lost support releases the same real body");
  assert.equal(f.state.enemies.length,1);assert.equal(f.state.huntRites.corpses.length,1);
});
test("native anatomy preview, finite harvest and mission extraction produce the same source and quality",()=>{
  const f=fixture();act(f,"analyze");act(f,"flay");act(f,"harvest-hide");
  const item=f.state.huntRites.specimensV112[0];assert.equal(item.speciesId,"hell-hound-stalker");assert.equal(item.quality,91);
  const success=r.resultFor(f.state,f.mission,"hunter","success");
  assert.deepEqual(plain(success.specimensV112),plain([item]));
  assert.equal(success.harvestEncounterRunV112,7);
  assert.equal(new Set(success.toolUseIdsV112).size,2);
  assert.deepEqual(plain(r.resultFor(f.state,f.mission,"hunter","failed").specimensV112),[]);
  assert.equal(f.state.regularTrophyDrops.length,1,"secondary tissue is distinct from the primary trophy stock");
  assert.equal(f.state.regularTrophyDrops[0].collected,false);
});
test("native interrupted anatomy and a full depot never consume or invent specimen stock",()=>{
  const f=fixture();act(f,"flay");
  let started=r.startHuntRiteV77(f.state.huntRites,"body","harvest-hide",r.riteContextV77(f.state));assert.equal(started.accepted,true);
  f.state.huntRites=started.state;f.state.riteOperationDamageStart=f.state.damageTaken;f.state.damageTaken+=1;
  r.updateHuntRitesV77(f.state,.05);assert.equal(f.state.huntRites.operation,null);assert.equal(f.state.huntRites.specimensV112.length,0);
  f.state.harvestDepotFreeV112=0;started=r.startHuntRiteV77(f.state.huntRites,"body","harvest-hide",r.riteContextV77(f.state));
  assert.equal(started.accepted,false);assert.equal(f.state.huntRites.specimensV112.length,0);
});
test("live source teleport across a solid obstruction cannot complete a harvest",()=>{
  const f=fixture();act(f,"flay");f.state.player.x=1050;
  const started=r.startHuntRiteV77(f.state.huntRites,"body","harvest-hide",r.riteContextV77(f.state));
  assert.equal(started.accepted,true,started.message);f.state.huntRites=started.state;
  f.state.riteOperationDamageStart=f.state.damageTaken;
  f.enemy.x=1140;
  f.state.world.platforms=[{id:"wall",x:1128,y:0,width:6,height:624,collision:"solid",routeId:"ground",material:"stone",noiseMultiplier:1,trackPersistence:1}];
  assert.ok(f.state.player.x+f.state.player.width<1128&&f.enemy.x>1134,"real wall separates both full actors");
  r.updateHuntRitesV77(f.state,.05);
  assert.equal(f.state.huntRites.operation,null);assert.equal(f.state.huntRites.specimensV112.length,0);
});
test("carrying into blocked space drops the same corpse without moving it through the wall",()=>{
  const f=fixture();act(f,"flay");act(f,"carry");
  const previous=f.enemy.x;
  f.state.player.x+=200;f.state.world.platforms=[{id:"block",x:1300,y:0,width:300,height:624,collision:"solid",routeId:"ground",material:"stone",noiseMultiplier:1,trackPersistence:1}];
  r.syncCarcassTransportV112(f.state);
  assert.equal(f.state.huntRites.carryingCorpseId,null);assert.equal(f.enemy.x,previous);
  assert.equal(f.state.enemies.length,1);
});

test("a clear final transport point cannot teleport its source across an intervening solid wall",()=>{
  const f=fixture();act(f,"flay");act(f,"carry");const previous=f.enemy.x;
  f.state.world.platforms=[{id:"wall-between",x:1240,y:0,width:12,height:624,collision:"solid",routeId:"ground",material:"stone",noiseMultiplier:1,trackPersistence:1}];
  f.state.player.x=1450;r.syncCarcassTransportV112(f.state);
  assert.equal(f.state.huntRites.carryingCorpseId,null);assert.equal(f.enemy.x,previous);
});

test("an authored hook cannot attach an actual wide body through a wall outside its preview icon",()=>{
  const f=fixture({width:90,height:70});act(f,"flay");act(f,"carry");
  const hook=r.carcassSupportsForWorldV112(f.state.world)[0];assert.ok(hook);
  f.state.world.platforms=[{id:"body-side-wall",x:hook.x+31,y:hook.y+28,width:10,height:24,collision:"solid",routeId:"ground",material:"stone",noiseMultiplier:1,trackPersistence:1}];
  assert.equal(r.carcassSupportsForWorldV112(f.state.world).length,1,"compact socket icon remains clear");
  const start=r.startHuntRiteV77(f.state.huntRites,"body","hang",r.riteContextV77(f.state),{supportId:hook.id});
  assert.equal(start.accepted,false,"actual source width must be checked before source consumption");
});

test("native suspended corpse restore admits the real source and refuses the same ledger when that actor is removed",()=>{
  const f=fixture();
  act(f,"flay");act(f,"carry");
  assert.equal(f.state.huntRites.carryingCorpseId,f.enemy.id);
  act(f,"hang");
  const checkpoint=r.captureCheckpoint(f.state),ledger=checkpoint.huntRites;
  assert.ok(ledger);
  assert.equal(ledger.corpses.length,1);
  assert.equal(ledger.corpses[0].flayed,true);
  assert.ok(ledger.corpses[0].supportId);
  assert.equal(ledger.carryingCorpseId,null);
  const options=r.riteRuntimeOptionsV112(f.state);
  assert.ok(options.supports.some(support=>support.id===ledger.corpses[0].supportId));
  const before=JSON.stringify(ledger);
  const restore=actors=>r.restoreRitesRuntimeV77(ledger,ledger.runId,f.mission.id,actors,
    checkpoint.elapsed,r.riteSourceLabelV77,options);
  const admitted=restore(checkpoint.enemies);
  assert.ok(admitted,"the genuinely defeated, prepared and attached source must restore");
  assert.equal(admitted.corpses[0].id,f.enemy.id);
  assert.equal(admitted.corpses[0].supportId,ledger.corpses[0].supportId);
  const missingSource=checkpoint.enemies.filter(actor=>actor.id!==f.enemy.id);
  assert.equal(missingSource.length,checkpoint.enemies.length-1);
  assert.equal(restore(missingSource),null,"a surviving support cannot replace the missing real corpse actor");
  assert.equal(JSON.stringify(ledger),before,"neither admission nor rejection may rewrite the same input ledger");
});
