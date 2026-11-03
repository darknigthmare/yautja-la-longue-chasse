/** Constructed operator tests. These are NOT authentic gameplay runs.
 * The 24 real unladen missions are separate evidence. This file checks the
 * proposed local retraction from optional cargo to a zero-load actor.
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {runInNewContext} from "node:vm";
import {build} from "esbuild";
import ts from "typescript";

const root=fileURLToPath(new URL("../",import.meta.url));
const out=root+"docs/qa/v112-ground-deposit-composition/";
const source=await readFile(root+"app/game/HuntCanvas.tsx","utf8");
const clientSource=await readFile(root+"app/game/GameClient.tsx","utf8");
const ast=ts.createSourceFile("HuntCanvas.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const clientAst=ts.createSourceFile("GameClient.tsx",clientSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let packHandler,riteHandler,configurationFunction;
const visit=node=>{
 if(ts.isBinaryExpression(node)&&ts.isArrowFunction(node.right)){
  if(node.left.getText(ast)==="fieldPackActionRefV112.current"&&node.right.parameters.length===2)packHandler=node.right;
  if(node.left.getText(ast)==="riteMenuActionRef.current"&&node.right.parameters.length===1)riteHandler=node.right;
 }
 ts.forEachChild(node,visit);
};visit(ast);
for(const node of clientAst.statements)if(ts.isFunctionDeclaration(node)&&node.name?.text==="huntConfiguration")configurationFunction=node;
assert.ok(packHandler&&riteHandler&&configurationFunction);
const append=String.raw`
export {makeGameState,makeEnemy,damageEnemy,stepGame,updatePlayer,updateHuntRitesV77,
 riteContextV77,riteRuntimeOptionsV112,startHuntRiteV77,snapshot,huntFieldLoadV112,
 captureCheckpoint,serializeActiveHuntCheckpoint,deserializeActiveHuntCheckpoint,restoreCheckpoint,
 overlapsSolidPlatform,huntStructuralBarrierV94,resultFor};
export * from "./systems/fieldStashV112";
export {fieldLoadV112} from "./systems/harvestInventoryV112";
export {writeActiveHuntSave,loadActiveHuntSave,ACTIVE_HUNT_MAX_SERIALIZED_BYTES} from "./systems/activeHuntSave";
export {defaultSave} from "./save";
export {MISSION_BY_ID} from "./data";
export function unitJson(text){return JSON.parse(text);}
export function nativePackUnit(game,mission,action,id,observe){
 const setUi=ui=>observe.ui=ui;const emitPersistence=()=>observe.emissions++;
 const persistHuntRef={current:null};const handler=`+packHandler.getText(ast)+String.raw`;handler(action,id);
}
export function nativeRiteMenuUnit(game,mission,action){
 const setUi=()=>{};const emitPersistence=()=>{};const persistHuntRef={current:null};
 const handler=`+riteHandler.getText(ast)+String.raw`;handler(action);
}
`+configurationFunction.getText(clientAst)+"\nexport {huntConfiguration};";
const compiled=await build({stdin:{contents:source+append,resolveDir:root+"app/game",sourcefile:root+"app/game/HuntCanvas.tsx",loader:"tsx"},bundle:true,write:false,format:"cjs",platform:"node",jsx:"automatic",loader:{".module.css":"empty"},external:["react","react/jsx-runtime","react-dom"],logLevel:"silent"});
const mod={exports:{}};
runInNewContext(compiled.outputFiles[0].text,{module:mod,exports:mod.exports,require:createRequire(import.meta.url),TextEncoder,TextDecoder,document:{hidden:false,hasFocus:()=>true},navigator:{getGamepads:()=>[]}});
const r=mod.exports,plain=x=>JSON.parse(JSON.stringify(x)),hash=x=>createHash("sha256").update(typeof x==="string"?x:JSON.stringify(x)).digest("hex");
const missionIds=["jungle-vey","ice-cryostalker","volcano-bad-blood","swamp-hydra","desert-sandmaw","ocean-leviathan","fungal-hivemind","ruins-ancient-guardian"];
const armorIds=["scout","hunter","berserker"];
const report={schema:1,classification:"CONSTRUCTED_OPERATOR_TESTS_NOT_GAMEPLAY",engineSourceSha256:hash(source),clientSourceSha256:hash(clientSource),scriptSha256:hash(await readFile(fileURLToPath(import.meta.url),"utf8")),createdAt:new Date().toISOString(),node:process.version,
 scope:"Unit fixtures admit native actors and tool ownership and advance only rite clocks during preparation. No fixture here is reported as a mission, an authentic harvested encounter or a winning continuation.",cases:[],gates:[],takeGates:[],carcassCases:[],coefficientBounds:[],persistenceCounterexample:null,conclusion:"CONDITIONAL_GEOMETRIC_LEMMA_ONLY; NO_AUTOMATIC_REQUIREMENT_CLOSURE"};
function inputHub(){return {keyboardHeld:new Set(),touchHeld:new Set(),gamepadHeld:new Set(),pressed:new Set(),previousGamepadButtons:[],activeGamepadIndex:null,gamepadNeedsNeutral:true,gamepadDialogActions:[],pointerScreen:null};}
function fixture(missionId,armorId){
 const save=r.defaultSave("2026-11-02T00:00:00.000Z");
 save.inventory.fieldToolIds=["flaying-tool"];save.inventory.unlockedArmorIds=[...armorIds];save.loadout.armorId=armorId;
 if(armorId==="scout")save.loadout.weaponIds=["wristblades","plasma-caster"];
 const mission=r.MISSION_BY_ID[missionId];
 const game=r.makeGameState(mission,save.loadout,save.inventory,"hunter",save.appearance,false,false,0,save.exploration);
 const amount=armorId==="scout"?6:armorId==="hunter"?8:10;
 for(let index=0;index<amount;index++){
  // Constructed fixture boundary: actors and dimensions are admitted here,
  // and only rite time advances during preparation. Original hostiles remain.
  const prey=r.makeEnemy("unit-deposit-"+index,"hell-hound-stalker",missionId,game.player.x+30,game.world.width,80,10,0,1,1);
  Object.assign(prey,{x:game.player.x+game.player.width/2-20,y:game.world.floorY-60,width:40,height:60,scanned:true});
  game.enemies.push(prey);r.damageEnemy(game,mission,prey,prey.health,"melee");
  for(const action of ["flay","harvest-hide"]){
   const started=r.startHuntRiteV77(game.huntRites,prey.id,action,r.riteContextV77(game));
   assert.equal(started.accepted,true,started.message);game.huntRites=started.state;game.riteOperationDamageStart=game.damageTaken;
   for(let tick=0;tick<200&&game.huntRites.operation;tick++){game.elapsed+=.05;r.updateHuntRitesV77(game,.05);}
   assert.equal(game.huntRites.operation,null);assert.ok(game.huntRites.completedEventIds.includes(action+":"+prey.id));
  }
 }
 assert.equal(game.huntRites.specimensV112.length,amount);assert.equal(r.huntFieldLoadV112(game).ratio,1);
 return {save,mission,game,amount};
}
function invariantProjection(game){
 const cp=r.captureCheckpoint(game,"resume");
 cp.spawnedWaves=[...cp.spawnedWaves];cp.completedObjectives=[...cp.completedObjectives];cp.brokenPillarIds=[...cp.brokenPillarIds];
 delete cp.huntRites.stashedSpecimensV112;
 return JSON.stringify(cp);
}
function pack(f,action,id){const observed={emissions:0,ui:null};r.nativePackUnit(f.game,f.mission,action,id,observed);return observed;}
function assertEmptyFactors(game){
 const load=r.huntFieldLoadV112(game);assert.equal(load.massKg,0);assert.equal(load.volumeUnits,0);
 for(const key of ["movementMultiplier","jumpMultiplier","climbStaminaMultiplier","noiseMultiplier"])assert.equal(load[key],1,key);
}
function snapshotArchive(f){const archived=r.serializeActiveHuntCheckpoint(r.captureCheckpoint(f.game,"resume"),f.game.nextCheckpointIndex);assert.ok(archived);assert.ok(r.deserializeActiveHuntCheckpoint(archived));return archived;}
// JSON adapter gives the VM's strict plain-object validator its own realm.
function envelope(f,snapshot,sequence){return r.unitJson(JSON.stringify({version:1,runtimeRevision:1,ownerSaveCreatedAt:f.save.createdAt,missionId:f.mission.id,difficultyId:"hunter",encounterRun:0,runId:"unit-deposit-"+f.mission.id+"-"+f.save.loadout.armorId,sequence,startedAt:"2026-11-02T00:00:00.000Z",savedAt:"2026-11-02T00:01:00.000Z",configuration:r.huntConfiguration(f.save,f.game.elapsed),snapshot,retryCheckpoint:null}));}
function memoryStorage(){const values=new Map();return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};}

for(const missionId of missionIds)for(const armorId of armorIds){
 const f=fixture(missionId,armorId),g=f.game,items=g.huntRites.specimensV112,canonical=plain(items),events=plain(g.huntRites.completedEventIds);
 assert.equal(g.player.grounded,true);assert.equal(g.player.climbing,false);assert.ok(g.player.health>0);assert.equal(g.huntRites.operation,null);assert.equal(g.huntRites.carryingCorpseId,null);
 const input=inputHub(),elapsed=g.elapsed,enemyPositions=plain(g.enemies.map(e=>[e.id,e.x,e.y,e.health]));input.pressed.add("pause");
 r.stepGame(g,f.mission,f.save.loadout,f.save.inventory,f.save.appearance,"hunter",input,1/60,()=>assert.fail("unit fixture must not return a mission result"));
 assert.equal(g.paused,true);assert.equal(g.elapsed,elapsed);assert.deepEqual(plain(g.enemies.map(e=>[e.id,e.x,e.y,e.health])),enemyPositions);
 const before=invariantProjection(g),toolBefore=r.snapshot(g,f.mission).toolConditionV112,worldBefore=hash(g.world),worldIdentity=g.world;
 for(const item of items){const observed=pack(f,"drop",item.id);assert.equal(observed.emissions,1);assert.ok(observed.ui);}
 assertEmptyFactors(g);assert.equal(invariantProjection(g),before);assert.equal(g.huntRites.specimensV112,items);
 assert.deepEqual(plain(g.huntRites.specimensV112),canonical);assert.deepEqual(plain(g.huntRites.completedEventIds),events);assert.equal(r.snapshot(g,f.mission).toolConditionV112,toolBefore);
 assert.equal(g.world,worldIdentity);assert.equal(hash(g.world),worldBefore);
 assert.equal(r.fieldStashGeometryValidV112(g.huntRites,g.world),true);
 const archive=snapshotArchive(f),storage=memoryStorage(),written=r.writeActiveHuntSave(envelope(f,archive,1),{storage});assert.equal(written.persisted,true);
 const loaded=r.loadActiveHuntSave({storage,compatibility:{ownerSaveCreatedAt:f.save.createdAt,encounterRun:0,missionId,difficultyId:"hunter",missionAvailable:true}});assert.equal(loaded.loaded,true);
 const decoded=r.deserializeActiveHuntCheckpoint(loaded.save.snapshot);assert.ok(decoded);
 const fresh=r.makeGameState(f.mission,f.save.loadout,f.save.inventory,"hunter",f.save.appearance,false,false,0,f.save.exploration);
 const restored=r.restoreCheckpoint(fresh,decoded.checkpoint,"resume");assert.equal(restored.paused,true);assert.equal(restored.elapsed,g.elapsed);
 assert.deepEqual(plain(restored.huntRites),plain(g.huntRites));assertEmptyFactors(restored);
 assert.deepEqual([...restored.completedObjectives],[...g.completedObjectives]);assert.equal(restored.player.health,g.player.health);
 const restoredFixture={...f,game:restored};
 for(const item of items){assert.equal(r.fieldStashCanTakeV112(restored.huntRites,item.id,restored.player,restored.world,armorId,restored.harvestDepotFreeV112),true);const observed=pack(restoredFixture,"take",item.id);assert.equal(observed.emissions,1);}
 assert.equal(r.huntFieldLoadV112(restored).ratio,1);assert.deepEqual(plain(restored.huntRites.specimensV112),canonical);assert.deepEqual(plain(restored.huntRites.completedEventIds),events);
 for(const item of items)pack(restoredFixture,"drop",item.id);assertEmptyFactors(restored);
 // Exact geometry cases sample the lemma, rather than claiming exhaustive play.
 const places=[{kind:"floor",y:g.world.floorY,xMin:36,xMax:g.world.width-36}];
 for(const p of g.world.platforms)places.push({kind:p.collision==="solid"?"solid-top":"one-way-top",y:p.y,xMin:Math.max(36,p.x-35),xMax:Math.min(g.world.width-36,p.x+p.width+35)});
 let geometryProbes=0;
 for(const place of places)for(const fraction of [0,.01,.25,.5,.75,.99,1]){
  if(place.xMax<place.xMin)continue;
  const centerX=place.xMin+(place.xMax-place.xMin)*fraction,actor={...g.player,x:centerX-36,y:place.y-116,grounded:true,climbing:false};
  if(actor.y<(g.world.minY??0)||r.overlapsSolidPlatform(actor,g.world.platforms))continue;
  assert.equal(r.huntStructuralBarrierV94({x:centerX,y:place.y-6},{x:centerX,y:place.y-6},g.world.platforms),false);
  const moved=r.moveFieldSpecimenV112({specimensV112:[items[0]],stashedSpecimensV112:[]},"drop",items[0].id,actor,g.world,armorId,{suspended:false,operationActive:false,depotFreeSlots:0});
  assert.equal(moved.accepted,true,moved.message);assert.equal(r.fieldStashGeometryValidV112(moved.state,g.world),true);geometryProbes++;
 }
 assert.ok(geometryProbes>0);
 // Carcass mass is a separate mechanism. The crowded-corpse fixture also
 // tests why its UI drop must not be conflated with the always-local bag drop.
 restored.paused=false;
 r.updatePlayer(restored,f.mission,f.save.loadout,f.save.inventory,f.save.appearance,"hunter",inputHub(),1/60,()=>assert.fail("operator unit is not a mission result"));
 r.nativeRiteMenuUnit(restored,f.mission,"open");r.nativeRiteMenuUnit(restored,f.mission,"carry");
 assert.equal(restored.huntRites.carryingCorpseId,"unit-deposit-0");assert.ok(r.huntFieldLoadV112(restored).massKg>0);
 const menuAfterCarry=r.snapshot(restored,f.mission).huntRiteMenu;
 const carriedBodyId=restored.huntRites.carryingCorpseId;
 r.nativeRiteMenuUnit(restored,f.mission,"drop");
 const dedicatedUiDropAccepted=restored.huntRites.carryingCorpseId===null;
 const jumpInput=inputHub();jumpInput.pressed.add("jump");jumpInput.keyboardHeld.add("jump");
 r.updatePlayer(restored,f.mission,f.save.loadout,f.save.inventory,f.save.appearance,"hunter",jumpInput,1/60,()=>assert.fail("operator unit is not a mission result"));
 assert.equal(restored.huntRites.carryingCorpseId,null);assertEmptyFactors(restored);assert.ok(restored.player.velocityY< -650);
 report.carcassCases.push({missionId,armorId,classification:"CONSTRUCTED_CROWDED_CORPSES",carriedBodyId,menuAfterCarry:menuAfterCarry?{corpseId:menuAfterCarry.corpseId,open:menuAfterCarry.open,carrying:menuAfterCarry.carrying}:null,dedicatedUiDropAccepted,nativeJumpDropsCarcassBeforeLoadAndImpulse:true,observedJumpVelocityY:restored.player.velocityY,zeroBagLoadAfterAutomaticCarcassDrop:true,uiUniversalityClaim:false});
 report.cases.push({missionId,armorId,classification:"CONSTRUCTED_OPERATOR_ONLY",preparedHides:f.amount,initialLoadRatio:1,geometryProbes,pauseStopsTimeAndAi:true,dropPreservesCheckpointProjection:true,canonicalStockAndToolWearPreserved:true,zeroFactorsRestored:true,acknowledgedMemoryStorageRoundtrip:true,sameRunNativeResume:true,immediateTakeThenDropReversible:true,snapshotBytes:Buffer.byteLength(JSON.stringify(written.save)),storageLimitBytes:r.ACTIVE_HUNT_MAX_SERIALIZED_BYTES});
 if(missionId==="jungle-vey"&&armorId==="hunter"){
  // Native UI permits drop in all live phases; these phase states are fixtures,
  // not claims that mandatory objectives have been completed by gameplay.
  const storedRites=g.huntRites;
  for(const phase of ["tracking","target","trophy","extraction"]){g.phase=phase;g.huntRites={...storedRites,stashedSpecimensV112:[]};assert.equal(pack(f,"drop",items[0].id).emissions,1);report.gates.push({case:"live-phase-"+phase,expected:"accept",observed:"accept"});}
  g.phase="tracking";
  for(const [name,alter,reset] of [
   ["not-paused",()=>g.paused=false,()=>g.paused=true],
   ["dead",()=>g.phase="dead",()=>g.phase="tracking"],
   ["finished",()=>g.phase="finished",()=>g.phase="tracking"],
   ["airborne",()=>g.player.grounded=false,()=>g.player.grounded=true],
   ["climbing",()=>g.player.climbing=true,()=>g.player.climbing=false],
   ["active-optional-operation",()=>g.huntRites.operation={corpseId:"unit-deposit-0",action:"erase",elapsed:0,startHealth:g.player.health,supportId:null,confirmedDishonor:false},()=>g.huntRites.operation=null],
   ["trophy-operation",()=>g.trophyExtracting=true,()=>g.trophyExtracting=false],
   ["carcass-carried",()=>g.huntRites.carryingCorpseId="unit-deposit-0",()=>g.huntRites.carryingCorpseId=null],
  ]){g.huntRites={...storedRites,stashedSpecimensV112:[]};alter();const before=plain(g.huntRites),observed=pack(f,"drop",items[0].id);assert.deepEqual(plain(g.huntRites),before,name);reset();report.gates.push({case:name,expected:"refuse",observed:"refuse",persistenceCallbackEmissions:observed.emissions});}
  g.huntRites={...storedRites,stashedSpecimensV112:[]};
  const carryCp=snapshotArchive(f),failingStorage=memoryStorage();assert.equal(r.writeActiveHuntSave(envelope(f,carryCp,1),{storage:failingStorage}).persisted,true);
  pack(f,"drop",items[0].id);const stashCp=snapshotArchive(f);const oldSet=failingStorage.setItem;failingStorage.setItem=()=>{throw new Error("constructed storage quota failure");};
  const refused=r.writeActiveHuntSave(envelope(f,stashCp,2),{storage:failingStorage});assert.equal(refused.persisted,false);assert.equal(refused.failure,"write-failed");failingStorage.setItem=oldSet;
  const older=r.loadActiveHuntSave({storage:failingStorage});assert.equal(older.loaded,true);assert.equal(older.save.sequence,1);assert.equal(older.save.snapshot.checkpoint.huntRites.stashedSpecimensV112.length,0);
  report.persistenceCounterexample={classification:"CONSTRUCTED_STORAGE_FAILURE",dropAcceptedInMemory:true,newWritePersisted:false,failure:refused.failure,reloadedSequence:1,description:"A successful local drop does not imply durable storage after an unacknowledged failed write. The prior saved carried state remains the reload source."};
  for(const [name,state,actor,world,slots] of [
   ["distance",g.huntRites,{...g.player,x:g.player.x+300},g.world,256],
   ["airborne",g.huntRites,{...g.player,grounded:false},g.world,256],
   ["depot-full",g.huntRites,g.player,g.world,0],
   ["still-falling",{...g.huntRites,stashedSpecimensV112:g.huntRites.stashedSpecimensV112.map(entry=>({...entry,fallSpeed:1}))},g.player,g.world,256],
   ["new-wall",g.huntRites,{...g.player,x:g.player.x+90},{...g.world,platforms:[...g.world.platforms,{x:g.player.x+g.player.width/2+45,y:g.player.y-100,width:5,height:300,collision:"solid"}]},256],
  ]){assert.equal(r.fieldStashCanTakeV112(state,items[0].id,actor,world,armorId,slots),false,name);report.takeGates.push({case:name,classification:"CONSTRUCTED_GATE",expected:"refuse",observed:"refuse"});}
 }
}
for(const armorId of armorIds)for(const ratio of [0,.25,.5,1,2]){
 const capacity=armorId==="scout"?{m:24,v:18}:armorId==="hunter"?{m:36,v:24}:{m:52,v:30};
 const load=r.fieldLoadV112(ratio===0?[]:[{massKg:capacity.m*ratio,volumeUnits:capacity.v*ratio}],armorId);
 assert.ok(load.movementMultiplier>=.68-1e-12&&load.movementMultiplier<=1);assert.ok(load.jumpMultiplier>=.84&&load.jumpMultiplier<=1);
 assert.ok(load.climbStaminaMultiplier>=1&&load.climbStaminaMultiplier<=1.6);assert.ok(load.noiseMultiplier>=1&&load.noiseMultiplier<=1.8);
 report.coefficientBounds.push({armorId,ratio,movement:load.movementMultiplier,jump:load.jumpMultiplier,admissible:ratio<=1});
}
const nativeRuns=JSON.parse(await readFile(root+"docs/qa/v112-ground-campaign/qualified-unladen/report.json","utf8"));
assert.equal(nativeRuns.outcomes.length,24);assert.ok(nativeRuns.outcomes.every(x=>x.success&&x.replay.verified));
report.compositionEvidence={actualUnladenReport:"docs/qa/v112-ground-campaign/qualified-unladen/report.json",sourceCommit:nativeRuns.commit,sha256:hash(await readFile(root+"docs/qa/v112-ground-campaign/qualified-unladen/report.json","utf8")),actualUnladenMissionArmorPairs:24,
 supportedClaim:"Optional specimen load can be removed without time, movement, mandatory-objective mutation or coefficient penalty at the stable post-acquisition boundary, provided the stated live-session and free-body preconditions hold.",
 unsupportedClaims:["Every loaded state has a winning continuation.","All full loads can be held to extraction.","A dropped item is always recoverable after moving away.","A successful in-memory drop is durable after storage failure.","REM112-08 is fully satisfied."]};
report.sourceArtifacts={};
for(const name of ["app/game/HuntCanvas.tsx","app/game/GameClient.tsx","app/game/systems/fieldStashV112.ts","app/game/systems/harvestInventoryV112.ts","app/game/systems/ritesOfHuntV77.ts","app/game/systems/huntRitesRuntimeV77.ts","app/game/systems/platformCollision.ts","app/game/systems/activeHuntSave.ts"])report.sourceArtifacts[name]=hash(await readFile(root+name,"utf8"));
report.mandatoryObjectiveKinds=missionIds.map(missionId=>({missionId,kinds:r.MISSION_BY_ID[missionId].objectives.filter(o=>o.required).map(o=>o.kind)}));
const objectiveFlow=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==="updateObjectiveFlow");assert.ok(objectiveFlow);
assert.equal(/specimensV112|stashedSpecimensV112|fieldLoad|harvest/.test(objectiveFlow.getText(ast)),false);
report.objectiveFlowDirectlyReadsOptionalSpecimens=false;report.bundleSha256=hash(compiled.outputFiles[0].text);
await mkdir(out,{recursive:true});await writeFile(out+"operator-report.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({classification:report.classification,operatorCases:report.cases.length,geometryProbes:report.cases.reduce((n,x)=>n+x.geometryProbes,0),gateCases:report.gates.length,coefficientCases:report.coefficientBounds.length,persistenceCounterexample:report.persistenceCounterexample.failure,conclusion:report.conclusion}));
