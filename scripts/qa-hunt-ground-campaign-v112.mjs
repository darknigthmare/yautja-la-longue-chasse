// Explicit, opt-in gameplay qualification. The production module is bundled
// unchanged; append-only exports expose existing private entry points and a
// verbatim AST-extracted rite UI callback, with rendering/persistence sinks.
import assert from "node:assert/strict";
import {readFile, mkdir, writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {runInNewContext} from "node:vm";
import {createHash} from "node:crypto";
import {build} from "esbuild";
import ts from "typescript";
import {decideGroundApexTrophyInputV112,decideHuntCampaignInputV112,groundTrophyGuardV112,observeGroundTrophyDamageV112} from "./lib/qa-hunt-ground-policy-v112.mjs";
import {chooseGroundHarvestV112,groundHarvestMenuActionV112,nearestGroundHarvestThreatV112,observeGroundHarvestV112} from "./lib/qa-hunt-ground-harvest-v112.mjs";
import {decideLoadedCanopyRouteV112,loadedCanopyRouteV112} from "./lib/qa-hunt-full-canopy-route-v112.mjs";

const root=fileURLToPath(new URL("../",import.meta.url));
const scriptBytesAtAdmission=await readFile(fileURLToPath(import.meta.url));
const policyBytesAtAdmission=await readFile(new URL("./lib/qa-hunt-ground-policy-v112.mjs",import.meta.url));
const harvestPolicyBytesAtAdmission=await readFile(new URL("./lib/qa-hunt-ground-harvest-v112.mjs",import.meta.url));
const canopyPolicyBytesAtAdmission=await readFile(new URL("./lib/qa-hunt-full-canopy-route-v112.mjs",import.meta.url));
const source=await readFile(new URL("../app/game/HuntCanvas.tsx",import.meta.url),"utf8");
const ast=ts.createSourceFile("HuntCanvas.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let riteHandler;
const visit=node=>{if(ts.isBinaryExpression(node)&&node.left.getText(ast)==="riteMenuActionRef.current"&&ts.isArrowFunction(node.right)&&node.right.parameters.length===1)riteHandler=node.right;ts.forEachChild(node,visit);};
visit(ast);assert.ok(riteHandler,"the actual rite UI callback must exist");
const append="\nexport {makeGameState,stepGame,snapshot,riteContextV77,riteRuntimeOptionsV112,huntRiteMenuSnapshotV77,riteOperationSecondsV77,trophyHarvestPoint,trophyHarvestInReach,APEX_TROPHY_REACH,huntStructuralBarrierV94,canopySupportReachableV112};\nexport {defaultSave,applyMissionResult,normalizeSave} from './save'; export {purchaseFieldToolV111} from './systems/fieldToolsV111'; export {anatomyPartsV112,makeAnatomySpecimenV112} from './systems/anatomyHarvestV112'; export {fieldLoadV112} from './systems/harvestInventoryV112'; export {carriedFieldSpecimensV112} from './systems/fieldStashV112'; export {MISSION_BY_ID,ARMOR_BY_ID,WEAPON_BY_ID,GEAR_BY_ID,DIFFICULTY_BY_ID} from './data';\nexport {evaluateClanShipAccess} from './systems/clanShipOperations'; export {shipSupportsSurfaceInsertion} from './systems/planetInsertion'; export {loadShipProgression} from './systems/progression';\n"+
 "export function visibleSoloShipPlanQa(){return normalizePlanetInsertionPlan({version:1,method:'ship',team:'solo'});}\n"+
 "export function nativeRiteMenuQa(game,mission,action){const setUi=()=>{};const emitPersistence=()=>{};const persistHuntRef={current:null};const handler="+riteHandler.getText(ast)+";handler(action);}";
const bundle=await build({stdin:{contents:source+append,
 resolveDir:root+"app/game",sourcefile:root+"app/game/HuntCanvas.tsx",loader:"tsx"},bundle:true,write:false,format:"cjs",platform:"node",jsx:"automatic",loader:{".module.css":"empty"},external:["react","react/jsx-runtime","react-dom"],logLevel:"silent"});
const compiled={exports:{}};
let randomState=1;
const deterministicMath=Object.create(Math);
deterministicMath.random=()=>{randomState^=randomState<<13;randomState^=randomState>>>17;randomState^=randomState<<5;return (randomState>>>0)/4294967296;};
runInNewContext(bundle.outputFiles[0].text,{module:compiled,exports:compiled.exports,require:createRequire(import.meta.url),Math:deterministicMath});
const runtime=compiled.exports;
const allMissionIds=["jungle-vey","ice-cryostalker","volcano-bad-blood","swamp-hydra","desert-sandmaw","ocean-leviathan","fungal-hivemind","ruins-ancient-guardian"];
const args=Object.fromEntries(process.argv.slice(2).map(v=>v.replace(/^--/,"").split("=")));
const missionIds=args.mission?args.mission.split(","):allMissionIds;
const armorIds=args.armor?[args.armor]:["scout","hunter","berserker"];
const difficultyId=args.difficulty??"hunter";
assert.ok(Object.hasOwn(runtime.DIFFICULTY_BY_ID,difficultyId)&&runtime.DIFFICULTY_BY_ID[difficultyId].unlockedByDefault,
 "the replay difficulty must be a real campaign difficulty unlocked by default");
if(args.insertion!==undefined)assert.equal(args.insertion,"visible-ship","supported explicit insertion is visible-ship");
if(args.successSave!==undefined){
 assert.ok(missionIds.length===1&&armorIds.length===1,"--successSave captures one named mission and armor");
 assert.ok(args.successSave!==args.baseSave,"--successSave must preserve the original campaign save");
}
const minimumRetainedLoad=args.minimumRetainedLoad===undefined?null:Number(args.minimumRetainedLoad);
const harvestSweep=args.harvestSweep==="true";
const sweepEarly=args.sweepEarly==="true";
const fullCanopy=args.fullCanopy==="true";
const canopySequence=args.canopySequence===undefined?0:Number(args.canopySequence);
if(fullCanopy)assert.ok(args.harvest==="true"&&minimumRetainedLoad===1,"loaded canopy requires a real bag at the full threshold");
if(args.canopySequence!==undefined)assert.ok(fullCanopy&&Number.isInteger(canopySequence)&&canopySequence>=0,"select an authored loaded canopy route");
const sweepDistance=args.sweepDistance===undefined?240:Number(args.sweepDistance);
const leaveSpecimens=new Set((args.leaveSpecimens??"").split(",").filter(Boolean));
const preferSpecimens=new Set((args.preferSpecimens??"").split(",").filter(Boolean));
if(harvestSweep)assert.ok(args.harvest==="true"&&minimumRetainedLoad!==null,"--harvestSweep requires a declared harvest load target");
if(sweepEarly||args.sweepDistance!==undefined||leaveSpecimens.size||preferSpecimens.size)
 assert.equal(harvestSweep,true,"sweep tuning requires --harvestSweep=true");
assert.ok(Number.isFinite(sweepDistance)&&sweepDistance>=0,"sweep distance must be a finite map distance");
if(minimumRetainedLoad!==null){
 assert.ok(Number.isFinite(minimumRetainedLoad)&&minimumRetainedLoad>0&&minimumRetainedLoad<=1,
  "--minimumRetainedLoad must be a finite ratio above zero and at most one");
 assert.equal(args.harvest,"true","--minimumRetainedLoad needs --harvest=true to obtain specimens in play");
}
const output=root+(args.output??"docs/qa/v112-ground-campaign");
await mkdir(output,{recursive:true});
// HuntCanvas's actual animation loop advances the simulation at 1/60 s.
const dt=1/60;
const outcomes=[];
let verifiedSuccessSave=null;
function packedLoad(state,armorId,tick){
 const items=runtime.carriedFieldSpecimensV112(state.huntRites);
 return {tick,load:runtime.fieldLoadV112(items,armorId),specimenIds:items.map(item=>item.id)};
}
function meetsLoad(load,minimum){return load.ratio+1e-9>=minimum;}
function harvestStock(state){
 return state.enemies.filter(enemy=>!enemy.boss).flatMap(enemy=>{
  const parts=runtime.anatomyPartsV112(enemy.archetype);
  if(!parts.length)return [];
  return [{id:enemy.id,archetype:enemy.archetype,active:enemy.active,alive:enemy.alive,x:Math.round(enemy.x),
   y:Math.round(enemy.y+enemy.height),parts:parts.map(part=>({
    id:part.partId,massKg:part.massKg,volumeUnits:part.volumeUnits,
    taken:state.huntRites.completedEventIds.includes(part.action+":"+enemy.id),
   }))}];
 });
}
function brief(s){return {t:+s.elapsed.toFixed(3),phase:s.phase,x:+s.player.x.toFixed(2),y:+s.player.y.toFixed(2),vx:+s.player.velocityX.toFixed(2),vy:+s.player.velocityY.toFixed(2),health:+s.player.health.toFixed(2),stamina:+s.player.stamina.toFixed(2),energy:+s.player.energy.toFixed(2),kills:s.supportKills,boss:{active:s.boss.active,alive:s.boss.alive,health:s.boss.health,x:s.boss.x},scans:s.scanNodes.map(n=>n.scanned),recoveries:s.recoveryNodes.map(n=>n.recovered),objectives:[...s.completedObjectives],message:s.message,grounded:s.player.grounded,climbing:s.player.climbing,load:s.fieldLoadV112,energyWeaponsLocked:s.energyWeaponsLocked,weaponSlot:s.player.activeWeaponSlot,threats:s.enemies.filter(e=>e.active&&e.alive).map(e=>({id:e.id,x:e.x,y:e.y,health:e.health,width:e.width,height:e.height}))};}
for(const missionId of missionIds)for(const armorId of armorIds){
 randomState=0x1122026;
 let save=runtime.defaultSave("2026-11-02T00:00:00Z");
 let baseSaveOrigin=null;
 if(args.baseSave){
  const baseBytes=await readFile(root+args.baseSave);
  save=runtime.normalizeSave(JSON.parse(baseBytes));
  assert.ok(allMissionIds.every(id=>save.missionProgress[id].status!=="locked"),"the recorded campaign must really unlock all replays");
  baseSaveOrigin={path:args.baseSave,sha256:createHash("sha256").update(baseBytes).digest("hex"),missionAttempts:Object.fromEntries(allMissionIds.map(id=>[id,save.missionProgress[id].attempts]))};
 }
 let toolOrigin=null;
 if(args.harvest==="true"){
  const originPath=args.toolOrigin??"docs/qa/v112-ground-campaign/tool-origin.json";
  const originBytes=await readFile(root+originPath);
  const origin=JSON.parse(originBytes);
  const results=origin.attempts.slice(0,2).map(attempt=>attempt.nativeResults.find(r=>r.outcome==="success"));
  assert.deepEqual(results.map(r=>r?.missionId),["jungle-vey","ice-cryostalker"]);
  if(!baseSaveOrigin)for(const result of results)save=runtime.applyMissionResult(save,result);
  const balanceBefore=save.profile.clanMarks;
  const purchase=runtime.purchaseFieldToolV111(save,"flaying-tool");
  assert.equal(purchase.ok,true);assert.equal(purchase.spentClanMarks,120);
  save=purchase.save;
  toolOrigin={path:baseSaveOrigin?.path??originPath,sha256:baseSaveOrigin?.sha256??createHash("sha256").update(originBytes).digest("hex"),missions:baseSaveOrigin?null:results.map(r=>({missionId:r.missionId,outcome:r.outcome,score:r.score,elapsedSeconds:r.elapsedSeconds})),balanceBefore,spentClanMarks:purchase.spentClanMarks,balanceAfter:save.profile.clanMarks};
 }
 const campaignSave=args.successSave!==undefined?structuredClone(save):null;
 const insertionPlan=args.insertion==="visible-ship"
  ?runtime.visibleSoloShipPlanQa():undefined;
 if(args.insertion!==undefined)assert.ok(insertionPlan,"the selected native insertion must normalize");
 const insertionShipId=insertionPlan?runtime.loadShipProgression(save).selectedShipId:undefined;
 if(insertionPlan){
  assert.ok(runtime.evaluateClanShipAccess(save).allowed,"the campaign must admit solo ship insertion");
  assert.ok(runtime.shipSupportsSurfaceInsertion(insertionShipId),"the selected campaign ship must be able to land");
 }
 // An explicit replay admission: armor ownership is the only unlocked inventory
 // fixture. Stats, gear charges, weapon upgrades and exploration stay at zero/default.
 save.inventory.unlockedArmorIds=["hunter","scout","berserker"];
 save.loadout.armorId=armorId;
 if(armorId==="scout")save.loadout.weaponIds=["wristblades","plasma-caster"];
 const mission=runtime.MISSION_BY_ID[missionId];
 const encounterRun=save.missionProgress[missionId].attempts;
 const weight=save.loadout.weaponIds.reduce((n,id)=>n+runtime.WEAPON_BY_ID[id].weight,0)+save.loadout.gearIds.reduce((n,id)=>n+runtime.GEAR_BY_ID[id].weight,0);
 assert.ok(weight<=runtime.ARMOR_BY_ID[armorId].carryingCapacity);
 const createState=()=>runtime.makeGameState(mission,save.loadout,save.inventory,difficultyId,save.appearance,
  false,false,encounterRun,save.exploration,insertionPlan,undefined,insertionShipId);
 const state=createState();
 const input={keyboardHeld:new Set(),touchHeld:new Set(),gamepadHeld:new Set(),pressed:new Set(),previousGamepadButtons:[],activeGamepadIndex:null,gamepadNeedsNeutral:true,gamepadDialogActions:[],pointerScreen:null};
 const initial=packedLoad(state,armorId,-1);
 assert.equal(initial.specimenIds.length,0,"qualified loads must be obtained during the hunt");
 const admission=JSON.parse(JSON.stringify({missionId,armorId,loadout:save.loadout,inventory:save.inventory,toolOrigin,baseSaveOrigin,exploration:save.exploration,difficulty:difficultyId,encounterRun,random:{algorithm:"xorshift32",seed:0x1122026},spawn:{...state.world.spawn},initial:{...brief(state),load:initial.load},insertion:{plan:state.insertion.plan,shipId:insertionShipId??null,patrolIds:state.insertion.patrolIds},world:{width:state.world.width,bossArena:state.world.bossArena,extraction:state.world.extraction,platforms:state.world.platforms.filter(p=>p.collision==="solid"),hazards:state.world.hazards},scanNodes:state.scanNodes,recoveryNodes:state.recoveryNodes}));
 const originalEnemies=[...state.enemies];
 let result=null,climbFrames=0,swingFrames=0,authoredCanopyContactFrames=0,maxX=state.player.x,lastX=state.player.x,stuck=0,nextJump=0,jumpUntil=-1,lastPhase=state.phase,lastAction="",lastSnapshot=-1,ticksExecuted=0;
 const seenStock=new Map();
 const trace=[],samples=[],events=[],harvestActions=[];
 const sharedMemory={previousX:state.player.x,stuckTicks:0,jumpUntil:-1};
 const useSharedPolicy=args.policy==="shared"||["volcano-bad-blood","ocean-leviathan"].includes(missionId);
 const harvestMemory={target:null,pending:null,deferred:new Map(),events:[]};
 const trophyMemory={},trophyInterruptions=[];
 const sweepEvents=[];
 let lastSweepTarget=null,stockAtApex=null,canopy=null;
 let peakLoadRatio=0,peakSpecimens=[],firstLoadAt=null;
 let atBoarding=null,atLoadTarget=null,heldLoadTarget=true;
 const lastPress={};
 const press=a=>input.pressed.add(a);
 const moveTo=(target,tolerance=15)=>{const dx=target-(state.player.x+state.player.width/2);if(Math.abs(dx)>tolerance)input.keyboardHeld.add(dx>0?"right":"left");};
 for(let tick=0;tick<Number(args.seconds??360)/dt&&!result&&!['dead','finished'].includes(state.phase);tick++){
  input.keyboardHeld.clear();input.pressed.clear();
  let menuAction=null;
  input.pointerScreen=null;
  const p=state.player,center=p.x+p.width/2;
  const enemies=[...state.enemies.filter(e=>e.alive&&e.active),...(state.boss.alive&&state.boss.active?[state.boss]:[])].sort((a,b)=>Math.abs(a.x+a.width/2-center)-Math.abs(b.x+b.width/2-center));
  const trophyGuard=groundTrophyGuardV112(state,tick,trophyMemory,
   (a,b)=>runtime.huntStructuralBarrierV94(a,b,state.world.platforms));
  const purgePending=state.bossMechanics.missionId==="volcano-bad-blood"&&state.bossMechanics.purgeSeconds!==null&&!state.bossMechanics.purgeResolved;
  observeGroundHarvestV112(state.huntRites,tick,harvestMemory);
  const load=state.fieldLoadV112??initial.load;
  const loadRatio=load.ratio;
  const needsLoad=minimumRetainedLoad===null||!meetsLoad(load,minimumRetainedLoad);
  const groundThreat=args.harvest==="true"?nearestGroundHarvestThreatV112(p,enemies):Infinity;
  if(fullCanopy&&atLoadTarget&&!canopy){
   const route=loadedCanopyRouteV112(state.world,missionId,canopySequence);
   canopy={route,stage:route?"approach":"route-missing",startedTick:tick,events:[],exitLoad:null};
  }
  const nextCanopy=canopy?.route&&!["timeout","lost-first-vine","grounded-exit"].includes(canopy.stage)
   ?decideLoadedCanopyRouteV112(state,tick,canopy,support=>runtime.canopySupportReachableV112(p,support,state.world.platforms)):null;
  if(canopy?.stage==="grounded-exit"&&!canopy.exitLoad)canopy.exitLoad=packedLoad(state,armorId,tick);
  let harvestTarget=null;
  if(args.harvest==="true"&&!state.huntRites.operation&&!state.trophyExtracting&&
    (state.phase==="tracking"||state.phase==="target")&&
    needsLoad&&groundThreat>(harvestSweep?sweepDistance:650)){
   const options=runtime.riteRuntimeOptionsV112(state),choices=[];
   for(const corpse of state.huntRites.corpses){
    if(corpse.erased||Math.abs(corpse.y-(p.y+p.height))>=45)continue;
    const distance=Math.abs(corpse.x-center);
    if(distance<=88&&options.worksiteBlocked(corpse))continue;
    for(const part of runtime.anatomyPartsV112(corpse.sourceEnemyId)){
     const key=part.action+":"+corpse.id;
     if(leaveSpecimens.has(key)||state.huntRites.completedEventIds.includes(key))continue;
     const item=runtime.makeAnatomySpecimenV112(state.huntRites.runId,corpse.id,corpse.sourceEnemyId,part.action,corpse.integrity??100,corpse.analyzed);
     const preview=options.specimenPreview(item);
     if(!preview.accepted)continue;
     const seconds=action=>runtime.riteOperationSecondsV77(action,corpse.sourceEnemyId,options.toolWorkMultiplier);
     choices.push({key,corpse,part,distance,projectedRatio:preview.projectedLoad.ratio,
      workSeconds:seconds(part.action)+(part.requiresFlay&&!corpse.flayed?seconds("flay"):0)});
    }
   }
   let packing;
   if(harvestSweep&&choices.length){
    const pool=choices.filter(choice=>{
     const skipped=harvestMemory.deferred.get(choice.key);
     return !skipped||skipped.attempts<2&&tick>=skipped.until;
    }).map(choice=>({key:choice.key,massKg:choice.part.massKg,volumeUnits:choice.part.volumeUnits}));
    for(const enemy of enemies){
     if(enemy.boss)continue;
     for(const part of runtime.anatomyPartsV112(enemy.archetype)){
      const key=part.action+":"+enemy.id;
      if(!leaveSpecimens.has(key))pool.push({key,massKg:part.massKg,volumeUnits:part.volumeUnits});
     }
    }
    packing={load,pool};
   }
   harvestTarget=chooseGroundHarvestV112(choices,tick,harvestMemory,loadRatio,minimumRetainedLoad,packing,preferSpecimens);
  }
  const sweepRouteReady=sweepEarly
   ?(state.phase==="tracking"||state.phase==="target")&&state.scanNodes.some(node=>node.scanned)
   :state.phase==="target"&&state.scanNodes.every(node=>node.scanned)&&state.recoveryNodes.every(node=>node.recovered);
  const sweepAllowed=harvestSweep&&needsLoad&&!harvestTarget&&!state.huntRites.operation&&
    !state.trophyExtracting&&sweepRouteReady&&p.health>p.maxHealth*.4&&
    (!state.boss.active||nearestGroundHarvestThreatV112(p,[state.boss])>325);
  const sweepTarget=sweepAllowed?enemies.find(enemy=>!enemy.boss&&
    Math.abs(enemy.x+enemy.width/2-center)<1200&&Math.abs(enemy.y+enemy.height-p.y-p.height)<140&&
    runtime.anatomyPartsV112(enemy.archetype).some(part=>
     !leaveSpecimens.has(part.action+":"+enemy.id)&&part.massKg<=load.capacityMassKg-load.massKg+1e-9&&part.volumeUnits<=load.capacityVolumeUnits-load.volumeUnits)&&
    !runtime.huntStructuralBarrierV94({x:center,y:p.y+p.height/2},
     {x:enemy.x+enemy.width/2,y:enemy.y+enemy.height/2},state.world.platforms)):null;
  if(sweepTarget&&sweepTarget.id!==lastSweepTarget){
   lastSweepTarget=sweepTarget.id;
   sweepEvents.push({tick,enemyId:sweepTarget.id,archetype:sweepTarget.archetype,loadRatio,groundThreat});
  }
  const target=trophyGuard??sweepTarget??enemies[0];
  const gap=target?Math.abs(target.x+target.width/2-center)-(target.width+p.width)/2:Infinity;
  if(nextCanopy){
   input.keyboardHeld=new Set(nextCanopy.held);
   for(const action of nextCanopy.pressed)press(action);
  }else if(state.huntRites.operation){
   // Native rite time advances with enemies, damage and interruptions live.
  }else if(harvestTarget){
   moveTo(harvestTarget.corpse.x,10);
   if(p.grounded&&Math.abs(p.velocityX)<10&&harvestTarget.distance<60){
    const menu=runtime.huntRiteMenuSnapshotV77(state.huntRites,runtime.riteContextV77(state).actor,state.riteMenuCorpseId,true,runtime.riteRuntimeOptionsV112(state));
    menuAction=groundHarvestMenuActionV112(menu,harvestTarget);
    if(menuAction){
     runtime.nativeRiteMenuQa(state,mission,menuAction);
     const selected=state.huntRites.corpses.find(corpse=>corpse.id===state.riteMenuCorpseId);
     const operation=state.huntRites.operation;
     if(operation)harvestMemory.pending={action:operation.action,target:harvestTarget};
     harvestActions.push({tick,t:state.elapsed,action:menuAction,corpseId:selected?.id??null,
      sourceEnemyId:selected?.sourceEnemyId??null,operation:operation?{...operation}:null});
    }
   }
  }else if(state.trophyExtracting&&state.trophyRitual){
   const ritual=state.trophyRitual;
   if(ritual.phase==="cue"&&ritual.cueElapsedSeconds>=(useSharedPolicy ? .48 : .49))press(ritual.sequence[ritual.cueIndex]);
  }else if(state.phase==="trophy"&&!purgePending&&trophyGuard){
   if(p.activeWeaponSlot!==0)press("weaponOne");
   if(gap<90)press("melee");
   const guardX=trophyGuard.x+trophyGuard.width/2;
   if(gap>35||Math.sign(guardX-center)!==p.facing)moveTo(guardX,10);
  }else if(state.phase==="trophy"&&!purgePending){
   const point=runtime.trophyHarvestPoint(state.boss,52);
   const inReach=runtime.trophyHarvestInReach(p,point,state.world.platforms,runtime.APEX_TROPHY_REACH);
   const decision=decideGroundApexTrophyInputV112(state,tick,trophyMemory,point,inReach);
   input.keyboardHeld=new Set(decision.held);
   for(const action of decision.pressed)press(action);
  }else if(state.phase==="extraction"){
   moveTo(state.world.extraction.x,20);
   if(Math.abs(state.world.extraction.x-center)<=100)press("interact");
  }else {
   const scan=state.scanNodes.find(n=>!n.scanned),recover=state.recoveryNodes.find(n=>!n.recovered);
   let waypoint=scan?.x??recover?.x??(state.boss.active?state.boss.x+state.boss.width/2:state.world.bossArena.x-150);
   if(sweepTarget||state.phase==="target"&&state.supportKills<(mission.objectives.find(o=>o.kind==="hunt")?.targetCount??0)&&target)waypoint=target.x+target.width/2;
   if(scan&&Math.hypot(scan.x-center,scan.y-(p.y+p.height/2))<410&&p.scanCooldown<=0)press("scan");
   if(!scan&&recover&&Math.hypot(recover.x-center,recover.y-(p.y+p.height/2))<95)press("interact");
   const duel=state.energyWeaponsLocked||missionId==="volcano-bad-blood"&&target?.boss&&gap<600;
   if(duel&&p.activeWeaponSlot!==0)press("weaponOne");
   if(!duel&&p.activeWeaponSlot!==1)press("weaponTwo");
   if(target&&gap<850){
    input.keyboardHeld.add("aim");
    if(sweepTarget)input.pointerScreen={x:target.x+target.width/2-state.cameraX,y:target.y+target.height/2-(state.cameraY??0)};
    if(p.weaponChargeSeconds>=.95&&p.weaponCooldown<=0&&p.energy>=35)press("weapon");
    if(gap<100&&p.stamina>14&&(duel||p.energy<35||p.weaponCooldown>0)){input.keyboardHeld.delete("aim");press("melee");}
    if(!duel&&gap<250&&p.grounded&&state.elapsed>nextJump){press("jump");input.keyboardHeld.add("jump");nextJump=state.elapsed+1.1;}
   }
   const purge=purgePending?state.purgeConsoleNodes.find(n=>!n.recovered):null;
   if(purge){waypoint=purge.x;if(Math.hypot(purge.x-center,purge.y-(p.y+p.height/2))<100)press("interact");}
   moveTo(waypoint,purge?25:scan?260:recover?25:target?duel?40:170:20);
  }
  if(!state.trophyExtracting&&p.health<p.maxHealth*.55&&p.medicomps>0&&p.healCooldown<=0)press("heal");
  const lava=state.world.hazards.find(h=>h.kind==="lava"&&p.x+p.width>h.x-50&&p.x<h.x+h.width+25);
  if(!nextCanopy&&!harvestTarget&&!state.huntRites.operation&&state.phase!=="trophy"&&stuck>.5&&p.grounded&&state.elapsed>nextJump){press("jump");input.keyboardHeld.add("jump");nextJump=state.elapsed+1;stuck=0;}
  if(state.elapsed<jumpUntil)input.keyboardHeld.add("jump");
  if(useSharedPolicy&&(state.phase!=="trophy"||purgePending)&&!state.trophyExtracting&&!harvestTarget&&!state.huntRites.operation&&!sweepTarget&&!nextCanopy){
   const decision=decideHuntCampaignInputV112(state,tick,sharedMemory,"mixed");
   input.keyboardHeld=new Set(decision.held);input.pressed.clear();
   for(const action of decision.pressed)press(action);
   input.pointerScreen=decision.pointer??null;
  }
  if(lava&&state.phase==="extraction"&&p.grounded&&state.elapsed>nextJump){press("jump");jumpUntil=state.elapsed+.2;nextJump=state.elapsed+.65;}
  if(state.elapsed<jumpUntil)input.keyboardHeld.add("jump");
  for(const action of [...input.pressed]){
   if(state.elapsed-(lastPress[action]??-1)<.1)input.pressed.delete(action);
   else lastPress[action]=state.elapsed;
  }
  // Down is used only with an actual melee or dodge edge, so a control
  // intended as a technique cannot silently become a canopy grasp.
  if(input.keyboardHeld.has("down")&&!input.pressed.has("melee")&&!(p.grounded&&input.pressed.has("jump")))input.keyboardHeld.delete("down");
  for(const action of ["left","right","jump"])if(input.pressed.has(action))input.keyboardHeld.add(action);
  const action=JSON.stringify({held:[...input.keyboardHeld],pressed:[...input.pressed],pointer:input.pointerScreen,menuAction});
  if(action!==lastAction){trace.push({tick,...JSON.parse(action)});lastAction=action;}
  const wasApexRite=state.phase==="trophy"&&state.trophyExtracting,damageBefore=state.damageTaken;
  runtime.stepGame(state,mission,save.loadout,save.inventory,save.appearance,difficultyId,input,dt,r=>{result=r;});
  if(ticksExecuted%30===0)for(const row of harvestStock(state))if(!seenStock.has(row.id))seenStock.set(row.id,row);
  if(observeGroundTrophyDamageV112(state,tick,trophyMemory,wasApexRite,damageBefore)){
   trophyInterruptions.push({tick,t:state.elapsed,x:state.player.x,health:state.player.health,
    damage:state.damageTaken-damageBefore});
  }
  ticksExecuted=tick+1;
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.health));
  assert.ok(originalEnemies.every(enemy=>state.enemies.includes(enemy)),"original enemies remain owned by the native simulation");
  assert.equal(p.aerialBoostUsed,false,"no ground route may use the locked aerial boost");
  if(p.climbing)climbFrames++;if(p.canopySwing)swingFrames++;
  if(p.grounded&&state.world.platforms.some(platform=>platform.id?.startsWith("v112-canopy-")&&Math.abs(platform.y-p.y-p.height)<1e-6&&p.x+p.width>platform.x&&p.x<platform.x+platform.width))authoredCanopyContactFrames++;
  if(state.fieldLoadV112.ratio>peakLoadRatio){peakLoadRatio=state.fieldLoadV112.ratio;peakSpecimens=state.huntRites.specimensV112.map(item=>({...item}));}
  if(firstLoadAt===null&&state.fieldLoadV112.ratio>0)firstLoadAt={tick,...brief(state)};
  if(!atBoarding&&state.dropShip?.phase==="boarding")atBoarding=packedLoad(state,armorId,tick);
  if(minimumRetainedLoad!==null){
   const atTick=packedLoad(state,armorId,tick);
   if(!atLoadTarget&&meetsLoad(atTick.load,minimumRetainedLoad))atLoadTarget=atTick;
   else if(atLoadTarget&&(!meetsLoad(atTick.load,minimumRetainedLoad)||
     !atLoadTarget.specimenIds.every(id=>atTick.specimenIds.includes(id))))heldLoadTarget=false;
  }
  maxX=Math.max(maxX,p.x);
  if(input.keyboardHeld.has("right")||input.keyboardHeld.has("left")){stuck=Math.abs(p.x-lastX)<.05?stuck+dt:0;}else stuck=0;
  lastX=p.x;
  if(state.phase!==lastPhase){
   if(harvestSweep&&state.phase==="trophy"&&!stockAtApex)stockAtApex=harvestStock(state);
   events.push(brief(state));lastPhase=state.phase;
  }
  if(Math.floor(state.elapsed)>lastSnapshot){samples.push(brief(state));lastSnapshot=Math.floor(state.elapsed);}
 }
 const success=result?.outcome==="success";
 const atExtraction=success?packedLoad(state,armorId,ticksExecuted-1):null;
 const retainedLoad={requiredRatio:minimumRetainedLoad,atLoadTarget,atBoarding,atExtraction,
  qualified:minimumRetainedLoad===null?null:!!(atLoadTarget&&heldLoadTarget&&atBoarding&&atExtraction&&
    meetsLoad(atBoarding.load,minimumRetainedLoad)&&meetsLoad(atExtraction.load,minimumRetainedLoad)&&
    atLoadTarget.specimenIds.every(id=>atBoarding.specimenIds.includes(id)&&atExtraction.specimenIds.includes(id)))};
 const canopyRoute=fullCanopy?{sequence:canopySequence,stage:canopy?.stage??"load-not-reached",
  events:canopy?.events??[],exitLoad:canopy?.exitLoad??null,qualified:Boolean(canopy?.stage==="grounded-exit"&&
   canopy.exitLoad?.load.ratio===1&&climbFrames>0&&swingFrames>0&&authoredCanopyContactFrames>0)}:null;
 // Upper bound of the bag: every anatomical part on every non-Apex creature seen during the run (sampled every 30 ticks).
 for(const row of harvestStock(state))if(!seenStock.has(row.id))seenStock.set(row.id,row);
 const endStock=[...seenStock.values()],volumeOf=rows=>rows.reduce((sum,row)=>sum+row.parts.reduce((s,part)=>s+part.volumeUnits,0),0);
 const anatomyCensusAtEnd={sampledEveryTicks:30,creaturesWithPartsSeen:endStock.length,spawnedCreaturesAtEnd:state.enemies.filter(enemy=>!enemy.boss).length,totalVolume:volumeOf(endStock),defeatedAtEndVolume:volumeOf(harvestStock(state).filter(row=>!row.alive)),
  bySpecies:Object.entries(endStock.reduce((map,row)=>{map[row.archetype]=(map[row.archetype]??0)+row.parts.reduce((s,part)=>s+part.volumeUnits,0);return map;},{})).map(([species,volume])=>({species,volume}))};
 const outcome={missionId,armorId,success,result,canopyRoute,climbFrames,swingFrames,authoredCanopyContactFrames,maxX,terminal:brief(state),admission,events,traceFrames:trace.length,ticksExecuted,harvestActions,harvestDecisions:harvestMemory.events,sweepEvents,stockAtApex,trophyInterruptions,peakLoadRatio,peakSpecimens,firstLoadAt,retainedLoad,anatomyCensusAtEnd};
 if(result)assert.equal(state.phase,"finished");
 if(outcome.success){
  assert.ok(atBoarding,"success must include a native boarding transition");
  const bag=runtime.carriedFieldSpecimensV112(state.huntRites);
  assert.equal(JSON.stringify(result.specimensV112),JSON.stringify(bag),"mission result must carry the actual final bag");
  assert.ok(atExtraction.load.overloaded===false,"the final bag must respect both capacity limits");
  assert.ok(atBoarding.specimenIds.every(id=>atExtraction.specimenIds.includes(id)),"boarding cannot discard a packed specimen");
  for(const item of bag){
   const corpse=state.huntRites.corpses.find(c=>state.huntRites.runId+":"+c.id===item.sourceId);
   assert.ok(corpse,"each packed item has a live-encounter source");
   const part=runtime.anatomyPartsV112(corpse.sourceEnemyId).find(candidate=>candidate.partId===item.partId);
   assert.ok(part&&result.toolUseIdsV112.includes(state.huntRites.runId+":"+part.action+":"+corpse.id),
    "each packed item has a native harvesting receipt");
  }
  assert.ok(state.player.health>0);
  assert.equal(state.boss.alive,false);
  assert.equal(state.boss.health,0);
  assert.ok(state.scanNodes.every(n=>n.scanned)&&state.recoveryNodes.every(n=>n.recovered));
  assert.ok(mission.objectives.every(o=>state.completedObjectives.has(o.id)),"every mission objective must finish natively");
  assert.ok(result.trophyClaims.some(c=>c.definitionId===mission.trophy.id));
 }
 if(!fullCanopy){
  assert.equal(climbFrames,0,"terrestrial controller must never attach to a climb support");
  assert.equal(swingFrames,0,"terrestrial controller must never swing");
  assert.equal(authoredCanopyContactFrames,0,"terrestrial route must never borrow an authored canopy rest");
 }
 if(args.replay==="true"){
  randomState=0x1122026;
  const replay=createState();
  const replayInput={keyboardHeld:new Set(),touchHeld:new Set(),gamepadHeld:new Set(),pressed:new Set(),previousGamepadButtons:[],activeGamepadIndex:null,gamepadNeedsNeutral:true,gamepadDialogActions:[],pointerScreen:null};
  let index=0,action=trace[0],replayedResult=null,replayedBoarding=null;
  for(let tick=0;tick<ticksExecuted;tick++){
   if(trace[index+1]?.tick===tick)action=trace[++index];
   replayInput.keyboardHeld=new Set(action.held);replayInput.pressed=new Set(action.pressed);replayInput.pointerScreen=action.pointer??null;
   if(action.menuAction)runtime.nativeRiteMenuQa(replay,mission,action.menuAction);
   runtime.stepGame(replay,mission,save.loadout,save.inventory,save.appearance,difficultyId,replayInput,dt,r=>{replayedResult=r;});
   if(!replayedBoarding&&replay.dropShip?.phase==="boarding")replayedBoarding=packedLoad(replay,armorId,tick);
  }
  assert.equal(JSON.stringify(brief(replay)),JSON.stringify(outcome.terminal),"the recorded inputs must reproduce the exact terminal simulation");
  const receipt=payload=>payload&&{outcome:payload.outcome,specimens:payload.specimensV112,toolUses:payload.toolUseIdsV112};
  assert.equal(JSON.stringify(receipt(replayedResult)),JSON.stringify(receipt(result)),"replay must preserve the returned items and tool receipts");
  assert.equal(JSON.stringify(replayedBoarding),JSON.stringify(atBoarding),"replay must preserve load and time at boarding");
  outcome.replay={verified:true,ticks:ticksExecuted,terminalSha256:createHash("sha256").update(JSON.stringify(brief(replay))).digest("hex")};
 }
 if(campaignSave&&success){
  assert.ok(campaignSave.inventory.unlockedArmorIds.includes(armorId),"save proof needs armor actually owned by the campaign");
  verifiedSuccessSave=runtime.applyMissionResult(campaignSave,result);
  assert.equal(verifiedSuccessSave.missionProgress[missionId].attempts,encounterRun+1,
    "the next attempt must come from committing the real mission result");
 }
 if(!success)console.log(JSON.stringify({case:missionId+"/"+armorId,events,trophyInterruptions,terminal:outcome.terminal}));
 if(harvestSweep)console.log(JSON.stringify({sweepCase:missionId+"/"+armorId,encounterRun,patrolIds:state.insertion.patrolIds,
  harvested:harvestMemory.events.filter(event=>event.reason==="prise récoltée"),sweepEvents,stockAtApex,
  canopyRoute,peakLoadRatio,atLoadTarget,atBoarding,atExtraction}));
 outcomes.push(outcome);
 await writeFile(`${output}/${missionId}-${armorId}.json`,JSON.stringify({...outcome,samples,inputTrace:trace},null,2)+"\n");
 console.log(JSON.stringify({missionId,armorId,result:result?.outcome??result?.status??null,phase:state.phase,t:state.elapsed,x:state.player.x,health:state.player.health,kills:state.supportKills,bossHealth:state.boss.health,scans:state.scanNodes.map(n=>n.scanned),recoveries:state.recoveryNodes.map(n=>n.recovered),climbFrames,swingFrames,boardingRatio:atBoarding?.load.ratio??null,retainedRatio:atExtraction?.load.ratio??null,loadQualified:retainedLoad.qualified}));
}
const head=(await readFile(root+".git/HEAD","utf8")).trim();
let commit=head;
if(head.startsWith("ref: ")){
 const ref=head.slice(5);
 try{commit=(await readFile(root+".git/"+ref,"utf8")).trim();}
 catch{commit=(await readFile(root+".git/packed-refs","utf8")).split("\n").find(line=>line.endsWith(" "+ref))?.split(" ")[0]??null;}
}
const report={schema:1,createdAt:new Date().toISOString(),commit,sourceSha256:createHash("sha256").update(source).digest("hex"),bundleSha256:createHash("sha256").update(bundle.outputFiles[0].text).digest("hex"),scriptSha256:createHash("sha256").update(scriptBytesAtAdmission).digest("hex"),policySha256:createHash("sha256").update(policyBytesAtAdmission).digest("hex"),harvestPolicySha256:createHash("sha256").update(harvestPolicyBytesAtAdmission).digest("hex"),canopyPolicySha256:createHash("sha256").update(canopyPolicyBytesAtAdmission).digest("hex"),fullCanopy,canopySequence,difficulty:difficultyId,command:process.argv,harvest:args.harvest==="true",harvestSweep,sweepEarly,sweepDistance,leaveSpecimens:[...leaveSpecimens],preferSpecimens:[...preferSpecimens],minimumRetainedLoad,scope:"Native stepGame, unchanged production source with appended exports and verbatim AST-extracted rite UI callback. GameInput and native menu callback only after explicit replay armor admission. Declared campaign difficulty and admission gear, seeded Math.random for reproducible legal spawn jitter. Harvest mode buys its tool using two documented real mission results, and only prepares real prey killed during this run. Actions capped at 10 rising edges per second. No browser, progression, physical keyboard or visual qualification.",outcomes};
await writeFile(`${output}/report.json`,JSON.stringify(report,null,2)+"\n");
if(args.successSave!==undefined){
 assert.ok(verifiedSuccessSave,"a successful native extraction is required to emit the next campaign save");
 await writeFile(root+args.successSave,JSON.stringify(verifiedSuccessSave,null,2)+"\n");
}
if(args.requireComplete==="true")assert.ok(outcomes.every(o=>o.success),"all requested missions must finish through native extraction");
if(minimumRetainedLoad!==null)assert.ok(outcomes.every(o=>o.retainedLoad.qualified===true),
 "all requested hunts must board and finish with the required real bag load; see each recorded outcome");
if(fullCanopy)assert.ok(outcomes.every(o=>o.success&&o.canopyRoute.qualified),
 "all requested hunts must complete the authored canopy transfer and end with a native extraction");
