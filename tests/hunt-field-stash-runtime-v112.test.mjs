import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {runInNewContext} from "node:vm";
import {build} from "esbuild";
import ts from "typescript";
const url=new URL("../app/game/HuntCanvas.tsx",import.meta.url),source=await readFile(url,"utf8");
const ast=ts.createSourceFile("HuntCanvas.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const built=await build({
  stdin:{contents:`${source.replace("export default function HuntCanvas","function HuntCanvas")}
export {makeGameState,makeEnemy,damageEnemy,updateHuntRitesV77,riteContextV77,startHuntRiteV77,snapshot,resultFor,captureCheckpoint,serializeActiveHuntCheckpoint,deserializeActiveHuntCheckpoint,restoreCheckpoint,announce,worldBlueprintFor};
export * from "./systems/fieldStashV112"; export {defaultSave} from "./save"; export {MISSION_BY_ID} from "./data";`,
    resolveDir:fileURLToPath(new URL("../app/game/",import.meta.url)),sourcefile:fileURLToPath(url),loader:"tsx"},
  bundle:true,write:false,format:"cjs",platform:"node",jsx:"automatic",loader:{".module.css":"empty"},
  external:["react","react/jsx-runtime","react-dom"],logLevel:"silent",
});
const exports={exports:{}};runInNewContext(built.outputFiles[0].text,{module:exports,exports:exports.exports,require:createRequire(import.meta.url),
  document:{hidden:false,hasFocus:()=>true},navigator:{getGamepads:()=>[]}});
const r=exports.exports,plain=x=>JSON.parse(JSON.stringify(x));
const ledge={id:"stash-ledge",x:1200,y:400,width:600,height:24,collision:"solid",routeId:"ground",material:"stone",noiseMultiplier:1,trackPersistence:1};
function fixture(harvest=true,authoredWorld=false){
  const save=r.defaultSave("2026-10-28T00:00:00.000Z");save.inventory.fieldToolIds=["flaying-tool"];
  const mission=r.MISSION_BY_ID["jungle-vey"];
  const state=r.makeGameState(mission,save.loadout,save.inventory,"hunter",save.appearance,false,false,0,save.exploration);
  let standingY=400,standingX=1300;
  if(authoredWorld){
    const actual=state.world;
    const platform=actual.platforms.find(p=>p.width>=180&&p.y>=160&&p.y<actual.floorY-40&&
      !actual.platforms.some(w=>w.collision==="solid"&&p.x+p.width*.3+state.player.width/2>w.x&&p.x+p.width*.3-state.player.width/2<w.x+w.width&&
        p.y>w.y+1e-6&&p.y-state.player.height<w.y+w.height-1e-6));
    assert.ok(platform,"an actual authored resting platform with clear standing space must exist");
    state.world=actual;standingY=platform.y;standingX=platform.x+platform.width*.3-state.player.width/2;
  }else state.world={...state.world,floorY:624,platforms:[{...ledge}],climbables:[],hazards:[],covers:[]};
  state.enemies=[];state.recoveryNodes=[];
  Object.assign(state.player,{x:standingX,y:standingY-state.player.height,previousY:standingY-state.player.height,
    velocityX:0,velocityY:0,grounded:true,climbing:false,climbZoneId:null});
  const enemy=r.makeEnemy("stash-prey","razorback-grazer",mission.id,1340,state.world.width,100,10,0,1,1);
  Object.assign(enemy,{x:state.player.x+state.player.width/2+40-enemy.width/2,y:standingY-enemy.height,knockbackRestY:standingY-enemy.height,scanned:true});
  state.enemies=[enemy];r.damageEnemy(state,mission,enemy,enemy.maxHealth+1,"melee");
  const f={state,save,mission,enemy,standingY,persisted:0,ui:null};
  const perform=action=>{
    const started=r.startHuntRiteV77(state.huntRites,enemy.id,action,r.riteContextV77(state));
    assert.equal(started.accepted,true,started.message);state.huntRites=started.state;state.riteOperationDamageStart=state.damageTaken;
    for(let i=0;i<300&&state.huntRites.operation;i++){state.elapsed+=.05;r.updateHuntRitesV77(state,.05);}
    assert.equal(state.huntRites.operation,null);
  };
  if(harvest){perform("analyze");perform("harvest-bone");assert.equal(state.huntRites.specimensV112.length,1);}
  return f;
}
function actionHandler(f){
  let expression;
  function visit(node){if(ts.isBinaryExpression(node)&&node.left.getText(ast)==="fieldPackActionRefV112.current"&&ts.isArrowFunction(node.right)&&node.right.parameters.length===2)expression=node.right;ts.forEachChild(node,visit);}
  visit(ast);assert.ok(expression,"the actual paused inventory callback must exist");
  const compiled=ts.transpileModule("const fn="+expression.getText(ast)+";",{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
  return runInNewContext("(()=>{"+compiled+"return fn;})()",{...r,game:f.state,mission:f.mission,
    setUi:x=>{f.ui=x;},emitPersistence:()=>{f.persisted++;},persistHuntRef:{current:undefined}});
}
test("native anatomy, paused deposit, resume and retrieval retain exactly one consumed body part",()=>{
  const f=fixture(),state=f.state,id=state.huntRites.specimensV112[0].id,events=plain(state.huntRites.completedEventIds);
  state.paused=true;const action=actionHandler(f);action("drop",id);
  assert.equal(state.huntRites.specimensV112.length,1);assert.equal(state.huntRites.stashedSpecimensV112.length,1);
  assert.equal(r.carriedFieldSpecimensV112(state.huntRites).length,0);assert.deepEqual(plain(state.huntRites.completedEventIds),events);
  assert.equal(f.ui.fieldPackV112.carried.length,0);assert.equal(f.ui.fieldPackV112.nearby.length,1);
  assert.equal(f.ui.fieldPackV112.nearby[0].canTake,true);assert.equal(f.persisted,1);
  action("take",id);assert.equal(r.carriedFieldSpecimensV112(state.huntRites).length,1);
  assert.equal(state.huntRites.stashedSpecimensV112.length,0);assert.equal(state.huntRites.specimensV112[0].id,id);
  action("take",id);assert.equal(r.carriedFieldSpecimensV112(state.huntRites).length,1);
  assert.deepEqual(plain(state.huntRites.completedEventIds),events);
  state.paused=false;const again=r.startHuntRiteV77(state.huntRites,f.enemy.id,"harvest-bone",r.riteContextV77(state));
  assert.equal(again.accepted,false,"deposit and retrieval never grow the finite source back");
});
test("the actual result only delivers specimens carried to extraction and never a distant world stash",()=>{
  const f=fixture(),id=f.state.huntRites.specimensV112[0].id;
  const carried=r.resultFor(f.state,f.mission,"hunter","success");assert.equal(carried.specimensV112.length,1);
  f.state.paused=true;actionHandler(f)("drop",id);
  const dropped=r.resultFor(f.state,f.mission,"hunter","success");assert.equal(dropped.specimensV112.length,0);
  assert.equal(dropped.toolUseIdsV112.length,1,"completed harvest still wears the tool even if its item is left behind");
  assert.equal(dropped.harvestEncounterRunV112,0);
  for(const outcome of ["failed","abandoned"])assert.equal(r.resultFor(f.state,f.mission,"hunter",outcome).specimensV112.length,0);
});
test("paused capture/deserialize/restore keeps canonical proof and the exact ledge deposit",()=>{
  const f=fixture(true,true),id=f.state.huntRites.specimensV112[0].id;
  f.state.paused=true;actionHandler(f)("drop",id);
  const archive=r.serializeActiveHuntCheckpoint(r.captureCheckpoint(f.state),0);assert.ok(archive);
  const decoded=r.deserializeActiveHuntCheckpoint(archive);assert.ok(decoded);
  const fresh=fixture(false,true),restored=r.restoreCheckpoint(fresh.state,decoded.checkpoint,"resume");
  assert.equal(restored.huntRites.specimensV112.length,1);assert.equal(restored.huntRites.stashedSpecimensV112.length,1);
  assert.equal(restored.huntRites.stashedSpecimensV112[0].y,f.standingY);
  assert.equal(r.carriedFieldSpecimensV112(restored.huntRites).length,0);
  assert.equal(restored.huntRites.specimensV112[0].id,id);
});
test("forged duplicate or foreign stash identity is refused before restoring a saved hunt",()=>{
  const f=fixture(),id=f.state.huntRites.specimensV112[0].id;f.state.paused=true;actionHandler(f)("drop",id);
  const archive=r.serializeActiveHuntCheckpoint(r.captureCheckpoint(f.state),0);assert.ok(archive);
  const decoded=r.deserializeActiveHuntCheckpoint(archive);assert.ok(decoded);
  for(const mutate of [
    cp=>cp.huntRites.stashedSpecimensV112.push({...cp.huntRites.stashedSpecimensV112[0]}),
    cp=>cp.huntRites.stashedSpecimensV112[0].specimenId="foreign",
    cp=>cp.huntRites.stashedSpecimensV112[0].y=10000,
  ]){
    const checkpoint=r.captureCheckpoint(f.state);mutate(checkpoint);
    const raw=r.serializeActiveHuntCheckpoint(checkpoint,0);assert.ok(raw);
    const changed=r.deserializeActiveHuntCheckpoint(raw);
    if(changed){const restored=r.restoreCheckpoint(fixture(false).state,changed.checkpoint,"resume");
      assert.match(restored.message,/reprise refusée/);assert.equal(restored.huntRites.specimensV112.length,0);}
  }
});
for(const [label,alter]of [
  ["not in pause",f=>f.state.paused=false],["dead",f=>f.state.phase="dead"],
  ["no footing",f=>f.state.player.grounded=false],["climbing",f=>f.state.player.climbing=true],
  ["active rite",f=>f.state.huntRites.operation={corpseId:f.enemy.id,action:"mark",elapsed:0,startHealth:100,supportId:null,confirmedDishonor:false}],
])test("native pause pack rejects "+label+" without losing a specimen",()=>{
  const f=fixture(),id=f.state.huntRites.specimensV112[0].id;f.state.paused=true;alter(f);const before=plain(f.state.huntRites);
  actionHandler(f)("drop",id);assert.deepEqual(plain(f.state.huntRites),before);
});
test("native pickup cannot reach through a new solid wall or succeed when capacity was filled",()=>{
  const f=fixture(),id=f.state.huntRites.specimensV112[0].id;f.state.paused=true;
  const action=actionHandler(f);action("drop",id);
  f.state.player.x-=90;f.state.world.platforms.push({...ledge,id:"stash-wall",x:1300,y:0,width:10,height:400});
  action("take",id);assert.equal(f.state.huntRites.stashedSpecimensV112.length,1);
  f.state.world.platforms.pop();f.state.player.x+=90;f.state.harvestDepotFreeV112=0;
  action("take",id);assert.equal(f.state.huntRites.stashedSpecimensV112.length,1);
});
