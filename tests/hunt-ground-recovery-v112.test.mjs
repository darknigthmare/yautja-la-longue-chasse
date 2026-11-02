import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {runInNewContext} from "node:vm";
import {build} from "esbuild";
import ts from "typescript";

/** Bounded ground fallback below one authored six-rest canopy corridor.
 * This is not a complete mission, campaign, or a survival guarantee for all
 * encounters. The fixture prepares real finite hides before the route begins;
 * every original enemy, hazard, surface and collision object is retained.
 */
const sourceUrl=new URL("../app/game/HuntCanvas.tsx",import.meta.url);
const source=await readFile(sourceUrl,"utf8");
const ast=ts.createSourceFile("HuntCanvas.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let packHandler;
const visit=node=>{
  if(ts.isBinaryExpression(node)&&node.left.getText(ast)==="fieldPackActionRefV112.current"&&
    ts.isArrowFunction(node.right)&&node.right.parameters.length===2)packHandler=node.right;
  ts.forEachChild(node,visit);
};
visit(ast);assert.ok(packHandler,"Use the actual pause-pack action handler");
const built=await build({stdin:{contents:source.replace("export default function HuntCanvas","function HuntCanvas")+"\n"+[
  "export {makeGameState,makeEnemy,damageEnemy,stepGame,updateHuntRitesV77,riteContextV77,riteRuntimeOptionsV112,huntFieldLoadV112,snapshot};",
  'export {defaultSave} from "./save";export {MISSION_BY_ID} from "./data";',
  'export {startHuntRiteV77} from "./systems/ritesOfHuntV77";',
  "export function fieldPackQaV112(game,mission,action,id){",
  "const setUi=()=>{};const emitPersistence=()=>{};const persistHuntRef={current:null};",
  "const handler="+packHandler.getText(ast)+";handler(action,id);",
  "}",
].join("\n"),resolveDir:fileURLToPath(new URL("../app/game/",import.meta.url)),sourcefile:fileURLToPath(sourceUrl),loader:"tsx"},
  bundle:true,write:false,format:"cjs",platform:"node",jsx:"automatic",loader:{".module.css":"empty"},
  external:["react","react/jsx-runtime","react-dom"],logLevel:"silent"});
const mod={exports:{}};
runInNewContext(built.outputFiles[0].text,{module:mod,exports:mod.exports,require:createRequire(import.meta.url),
  document:{hidden:false,hasFocus:()=>true},navigator:{getGamepads:()=>[]},TextEncoder,TextDecoder});
const api=mod.exports;
const missionIds=["jungle-vey","ice-cryostalker","volcano-bad-blood","swamp-hydra",
  "desert-sandmaw","ocean-leviathan","fungal-hivemind","ruins-ancient-guardian"];
function operation(f,bodyId,action){
  const started=api.startHuntRiteV77(f.game.huntRites,bodyId,action,api.riteContextV77(f.game));
  assert.equal(started.accepted,true,started.message);f.game.huntRites=started.state;
  f.game.riteOperationDamageStart=f.game.damageTaken;
  for(let tick=0;tick<160&&f.game.huntRites.operation;tick++){
    f.game.elapsed+=.05;api.updateHuntRitesV77(f.game,.05);
  }
  assert.equal(f.game.huntRites.operation,null,"Preparation completes through the native rite clock");
  assert.ok(f.game.huntRites.completedEventIds.includes(action+":"+bodyId),"Preparation really completed");
}
function fixture(missionId,armorId){
  const save=api.defaultSave("2026-11-01T00:00:00.000Z");
  save.loadout.armorId=armorId;save.inventory.fieldToolIds=["flaying-tool"];
  const mission=api.MISSION_BY_ID[missionId];
  const game=api.makeGameState(mission,save.loadout,save.inventory,"hunter",save.appearance,false,false,7,save.exploration);
  const originalEnemies=[...game.enemies],world=game.world,boss=game.boss;
  const rests=world.platforms.filter(item=>item.id.startsWith("v112-canopy-"+missionId+"-0-"))
    .sort((a,b)=>a.x-b.x);
  assert.equal(rests.length,6);
  const entry=world.climbables.find(item=>item.id===rests[0].id.replace("-rest","-grip"));
  const exit=world.climbables.find(item=>item.id===rests.at(-1).id.replace("-rest","-grip"));
  assert.ok(entry&&exit);
  // This is the only fixture placement. Route motion after preparation uses
  // stepGame and its live enemies/hazards; no later position assignment occurs.
  Object.assign(game.player,{x:entry.x+entry.width/2-game.player.width/2,y:world.floorY-game.player.height,
    previousY:world.floorY-game.player.height,velocityX:0,velocityY:0,grounded:true,climbing:false,
    climbZoneId:null,canopySwing:null});
  const input={keyboardHeld:new Set(),touchHeld:new Set(),gamepadHeld:new Set(),pressed:new Set(),
    previousGamepadButtons:[],activeGamepadIndex:null,gamepadNeedsNeutral:true,gamepadDialogActions:[],pointerScreen:null};
  const results=[],f={game,save,mission,input,results,world,boss,originalEnemies,entry,exit};
  const hides=armorId==="scout"?6:armorId==="hunter"?8:10;
  // Explicit prepared-fixture boundary: bodies are real production actors,
  // killed and harvested through production rules. Original hostiles remain
  // present; their AI clock starts advancing once route actions begin.
  for(let index=0;index<hides;index++){
    const body=api.makeEnemy("fallback-source-"+index,"hell-hound-stalker",missionId,
      game.player.x+game.player.width/2-20,world.width,80,10,0,1,1);
    Object.assign(body,{width:40,height:60,y:world.floorY-60,scanned:true});
    game.enemies.push(body);api.damageEnemy(game,mission,body,body.health,"melee");
    assert.equal(body.alive,false);assert.equal(body.health,0);
    operation(f,body.id,"flay");operation(f,body.id,"harvest-hide");
  }
  assert.equal(game.huntRites.specimensV112.length,hides);
  const load=api.huntFieldLoadV112(game);
  assert.equal(load.ratio,1,"Real hides exactly fill the armor's volume budget");
  assert.ok(load.massKg<=load.capacityMassKg);
  f.step=()=>api.stepGame(game,mission,save.loadout,save.inventory,save.appearance,"hunter",input,1/60,result=>results.push(result));
  f.assertRetained=()=>{
    assert.equal(game.world,world,"No world geometry/surface/hazard replacement");
    assert.equal(game.boss,boss,"No replacement or fabricated defeat of the Apex");
    for(const enemy of originalEnemies)assert.ok(game.enemies.includes(enemy),"Every original hostile remains in the simulation");
    assert.equal(results.length,0,"This local route cannot manufacture a campaign result");
    assert.ok(game.player.health>0&&game.player.health<=game.player.maxHealth,"Real health remains bounded and positive");
  };
  return f;
}
function walk(f,targetCenter){
  f.input.keyboardHeld.clear();
  let reached=false;
  for(let tick=0;tick<1800;tick++){
    const distance=targetCenter-(f.game.player.x+f.game.player.width/2);
    f.input.keyboardHeld.delete("left");f.input.keyboardHeld.delete("right");
    if(Math.abs(distance)>10)f.input.keyboardHeld.add(distance>0?"right":"left");
    f.step();f.assertRetained();
    assert.equal(f.game.player.climbing,false,"Ground fallback never borrows a canopy grip");
    assert.equal(f.game.player.aerialBoostUsed,false);
    assert.equal(f.game.player.grounded,true,"No fixture float or forced jump");
    assert.ok(Math.abs(f.game.player.y+f.game.player.height-f.world.floorY)<1e-6);
    if(Math.abs(distance)<=10&&Math.abs(f.game.player.velocityX)<8){reached=true;break;}
  }
  f.input.keyboardHeld.clear();assert.equal(reached,true,"Native controls reach the intended end of the local ground corridor");
}
for(const missionId of missionIds)for(const armorId of ["scout","hunter","berserker"])
test("loaded ground fallback, native pause-pack deposit and recovered jump: "+missionId+" / "+armorId,()=>{
  const f=fixture(missionId,armorId);
  const initialHealth=f.game.player.health,started=f.game.elapsed;
  const start=f.entry.x+f.entry.width/2,end=f.exit.x+f.exit.width/2;
  assert.ok(end-start>=900);
  walk(f,end);walk(f,start);
  assert.ok(f.game.elapsed>started+1);
  assert.ok(f.game.player.health<=initialHealth,"No health refill or invulnerability fixture");
  const canonical=f.game.huntRites.specimensV112.map(item=>({id:item.id,sourceId:item.sourceId,quality:item.quality}));
  const beforePause=f.game.elapsed;
  f.input.pressed.add("pause");f.step();assert.equal(f.game.paused,true);assert.equal(f.game.elapsed,beforePause);
  assert.equal(api.snapshot(f.game,f.mission).fieldPackV112.canDrop,true);
  for(const item of [...f.game.huntRites.specimensV112])api.fieldPackQaV112(f.game,f.mission,"drop",item.id);
  const empty=api.huntFieldLoadV112(f.game);
  assert.equal(empty.massKg,0);assert.equal(empty.volumeUnits,0);
  assert.equal(empty.movementMultiplier,1);assert.equal(empty.jumpMultiplier,1);
  assert.equal(empty.climbStaminaMultiplier,1);assert.equal(empty.noiseMultiplier,1);
  assert.equal(f.game.huntRites.stashedSpecimensV112.length,canonical.length);
  assert.deepEqual(f.game.huntRites.specimensV112.map(item=>({id:item.id,sourceId:item.sourceId,quality:item.quality})),canonical,
    "Depositing restores movement without un-consuming anatomy or inventing another item");
  f.input.pressed.add("pause");f.step();assert.equal(f.game.paused,false);
  f.input.keyboardHeld.add("jump");f.input.pressed.add("jump");f.step();
  f.assertRetained();
  assert.equal(f.game.fieldLoadV112.jumpMultiplier,1);
  assert.equal(f.game.player.grounded,false);
  assert.ok(f.game.player.velocityY< -650,"Real ground jump regains the unladen launch, beyond the full-pack launch");
  assert.equal(f.game.player.aerialBoostUsed,false);
});
