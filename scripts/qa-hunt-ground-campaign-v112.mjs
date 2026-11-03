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
import {decideHuntCampaignInputV112} from "./lib/qa-hunt-ground-policy-v112.mjs";

const root=fileURLToPath(new URL("../",import.meta.url));
const scriptBytesAtAdmission=await readFile(fileURLToPath(import.meta.url));
const policyBytesAtAdmission=await readFile(new URL("./lib/qa-hunt-ground-policy-v112.mjs",import.meta.url));
const source=await readFile(new URL("../app/game/HuntCanvas.tsx",import.meta.url),"utf8");
const ast=ts.createSourceFile("HuntCanvas.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let riteHandler;
const visit=node=>{if(ts.isBinaryExpression(node)&&node.left.getText(ast)==="riteMenuActionRef.current"&&ts.isArrowFunction(node.right)&&node.right.parameters.length===1)riteHandler=node.right;ts.forEachChild(node,visit);};
visit(ast);assert.ok(riteHandler,"the actual rite UI callback must exist");
const append="\nexport {makeGameState,stepGame,snapshot,riteContextV77,riteRuntimeOptionsV112,huntRiteMenuSnapshotV77};\nexport {defaultSave,applyMissionResult,normalizeSave} from './save'; export {purchaseFieldToolV111} from './systems/fieldToolsV111'; export {anatomyPartsV112,makeAnatomySpecimenV112} from './systems/anatomyHarvestV112'; export {MISSION_BY_ID,ARMOR_BY_ID,WEAPON_BY_ID,GEAR_BY_ID} from './data';\n"+
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
const output=root+(args.output??"docs/qa/v112-ground-campaign");
await mkdir(output,{recursive:true});
// HuntCanvas's actual animation loop advances the simulation at 1/60 s.
const dt=1/60;
const outcomes=[];
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
 // An explicit replay admission: armor ownership is the only unlocked inventory
 // fixture. Stats, gear charges, weapon upgrades and exploration stay at zero/default.
 save.inventory.unlockedArmorIds=["hunter","scout","berserker"];
 save.loadout.armorId=armorId;
 if(armorId==="scout")save.loadout.weaponIds=["wristblades","plasma-caster"];
 const mission=runtime.MISSION_BY_ID[missionId];
 const encounterRun=save.missionProgress[missionId].attempts;
 const weight=save.loadout.weaponIds.reduce((n,id)=>n+runtime.WEAPON_BY_ID[id].weight,0)+save.loadout.gearIds.reduce((n,id)=>n+runtime.GEAR_BY_ID[id].weight,0);
 assert.ok(weight<=runtime.ARMOR_BY_ID[armorId].carryingCapacity);
 const state=runtime.makeGameState(mission,save.loadout,save.inventory,"hunter",save.appearance,false,false,encounterRun,save.exploration);
 const input={keyboardHeld:new Set(),touchHeld:new Set(),gamepadHeld:new Set(),pressed:new Set(),previousGamepadButtons:[],activeGamepadIndex:null,gamepadNeedsNeutral:true,gamepadDialogActions:[],pointerScreen:null};
 const admission=JSON.parse(JSON.stringify({missionId,armorId,loadout:save.loadout,inventory:save.inventory,toolOrigin,baseSaveOrigin,exploration:save.exploration,difficulty:"hunter",encounterRun,random:{algorithm:"xorshift32",seed:0x1122026},spawn:{...state.world.spawn},initial:brief(state),world:{width:state.world.width,bossArena:state.world.bossArena,extraction:state.world.extraction,platforms:state.world.platforms.filter(p=>p.collision==="solid"),hazards:state.world.hazards},scanNodes:state.scanNodes,recoveryNodes:state.recoveryNodes}));
 const originalEnemies=[...state.enemies];
 let result=null,climbFrames=0,swingFrames=0,authoredCanopyContactFrames=0,maxX=state.player.x,lastX=state.player.x,stuck=0,nextJump=0,jumpUntil=-1,lastPhase=state.phase,lastAction="",lastSnapshot=-1,ticksExecuted=0;
 const trace=[],samples=[],events=[],harvestActions=[];
 const sharedMemory={previousX:state.player.x,stuckTicks:0,jumpUntil:-1};
 let peakLoadRatio=0,peakSpecimens=[],firstLoadAt=null;
 const lastPress={};
 const press=a=>input.pressed.add(a);
 const moveTo=(target,tolerance=15)=>{const dx=target-(state.player.x+state.player.width/2);if(Math.abs(dx)>tolerance)input.keyboardHeld.add(dx>0?"right":"left");};
 for(let tick=0;tick<Number(args.seconds??360)/dt&&!result&&!['dead','finished'].includes(state.phase);tick++){
  input.keyboardHeld.clear();input.pressed.clear();
  let menuAction=null;
  const p=state.player,center=p.x+p.width/2;
  const enemies=[...state.enemies.filter(e=>e.alive&&e.active),...(state.boss.alive&&state.boss.active?[state.boss]:[])].sort((a,b)=>Math.abs(a.x+a.width/2-center)-Math.abs(b.x+b.width/2-center));
  const target=enemies[0],gap=target?Math.abs(target.x+target.width/2-center)-(target.width+p.width)/2:Infinity;
  const availableCorpse=args.harvest==="true"&&!state.trophyExtracting&&['tracking','target'].includes(state.phase)&&gap>650?
   state.huntRites.corpses.filter(c=>!c.erased&&runtime.anatomyPartsV112(c.sourceEnemyId).some(part=>!state.huntRites.completedEventIds.includes(part.action+":"+c.id)))
    .filter(c=>Math.abs(c.y-(p.y+p.height))<45)
    .filter(c=>runtime.anatomyPartsV112(c.sourceEnemyId).some(part=>!state.huntRites.completedEventIds.includes(part.action+":"+c.id)&&runtime.riteRuntimeOptionsV112(state).acceptSpecimen(runtime.makeAnatomySpecimenV112(state.huntRites.runId,c.id,c.sourceEnemyId,part.action,c.integrity??100,c.analyzed))))
    .sort((a,b)=>Math.abs(a.x-center)-Math.abs(b.x-center))[0]:null;
  if(state.huntRites.operation){
   // Native rite time advances with all enemies, damage and interruptions live.
  }else if(availableCorpse){
   moveTo(availableCorpse.x,10);
   if(p.grounded&&Math.abs(p.velocityX)<10&&Math.abs(availableCorpse.x-center)<60){
    const menu=runtime.huntRiteMenuSnapshotV77(state.huntRites,runtime.riteContextV77(state).actor,state.riteMenuCorpseId,true,runtime.riteRuntimeOptionsV112(state));
    if(menu?.corpseId===availableCorpse.id){
     menuAction=!menu.open?"open":menu.canFlay?"flay":menu.parts.find(part=>part.available)?.action??null;
     if(menuAction){runtime.nativeRiteMenuQa(state,mission,menuAction);harvestActions.push({tick,t:state.elapsed,action:menuAction,corpseId:availableCorpse.id,sourceEnemyId:availableCorpse.sourceEnemyId,operation:state.huntRites.operation?{...state.huntRites.operation}:null});}
    }
   }
  }else if(state.trophyExtracting&&state.trophyRitual){
   if(state.trophyRitual.phase!=="ready"&&state.trophyRitual.cueElapsedSeconds>=.49)press(state.trophyRitual.sequence[state.trophyRitual.cueIndex]);
  }else if(state.phase==="trophy"&&(!target||gap>900)){
   moveTo(state.boss.x+state.boss.width/2,10);
   if(Math.abs(state.boss.x+state.boss.width/2-center)<70&&p.grounded&&Math.abs(p.velocityX)<15)press("interact");
  }else if(state.phase==="extraction"){
   moveTo(state.world.extraction.x,20);
   if(Math.abs(state.world.extraction.x-center)<=100)press("interact");
  }else {
   const scan=state.scanNodes.find(n=>!n.scanned),recover=state.recoveryNodes.find(n=>!n.recovered);
   let waypoint=scan?.x??recover?.x??(state.boss.active?state.boss.x+state.boss.width/2:state.world.bossArena.x-150);
   if(state.phase==="target"&&state.supportKills<(mission.objectives.find(o=>o.kind==="hunt")?.targetCount??0)&&target)waypoint=target.x+target.width/2;
   if(scan&&Math.hypot(scan.x-center,scan.y-(p.y+p.height/2))<410&&p.scanCooldown<=0)press("scan");
   if(!scan&&recover&&Math.hypot(recover.x-center,recover.y-(p.y+p.height/2))<95)press("interact");
   const duel=state.energyWeaponsLocked||missionId==="volcano-bad-blood"&&target?.boss&&gap<600;
   if(duel&&p.activeWeaponSlot!==0)press("weaponOne");
   if(!duel&&p.activeWeaponSlot!==1)press("weaponTwo");
   if(target&&gap<850){
    input.keyboardHeld.add("aim");
    if(p.weaponChargeSeconds>=.95&&p.weaponCooldown<=0&&p.energy>=35)press("weapon");
    if(gap<100&&p.stamina>14&&(duel||p.energy<35||p.weaponCooldown>0)){input.keyboardHeld.delete("aim");press("melee");}
    if(!duel&&gap<250&&p.grounded&&state.elapsed>nextJump){press("jump");input.keyboardHeld.add("jump");nextJump=state.elapsed+1.1;}
   }
   if(state.phase==="trophy"&&target)waypoint=target.x+target.width/2;
   const purge=state.bossMechanics.missionId==="volcano-bad-blood"&&state.bossMechanics.purgeSeconds!==null&&!state.bossMechanics.purgeResolved?state.purgeConsoleNodes.find(n=>!n.recovered):null;
   if(purge){waypoint=purge.x;if(Math.hypot(purge.x-center,purge.y-(p.y+p.height/2))<100)press("interact");}
   moveTo(waypoint,purge?25:scan?260:recover?25:target?duel?40:170:20);
  }
  if(!state.trophyExtracting&&p.health<p.maxHealth*.55&&p.medicomps>0&&p.healCooldown<=0)press("heal");
  const lava=state.world.hazards.find(h=>h.kind==="lava"&&p.x+p.width>h.x-50&&p.x<h.x+h.width+25);
  if(stuck>.5&&p.grounded&&state.elapsed>nextJump){press("jump");input.keyboardHeld.add("jump");nextJump=state.elapsed+1;stuck=0;}
  if(state.elapsed<jumpUntil)input.keyboardHeld.add("jump");
  if((args.policy==="shared"||["volcano-bad-blood","ocean-leviathan"].includes(missionId))&&!availableCorpse&&!state.huntRites.operation){
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
  runtime.stepGame(state,mission,save.loadout,save.inventory,save.appearance,"hunter",input,dt,r=>{result=r;});
  ticksExecuted=tick+1;
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.health));
  assert.ok(originalEnemies.every(enemy=>state.enemies.includes(enemy)),"original enemies remain owned by the native simulation");
  assert.equal(p.aerialBoostUsed,false,"no ground route may use the locked aerial boost");
  if(p.climbing)climbFrames++;if(p.canopySwing)swingFrames++;
  if(p.grounded&&state.world.platforms.some(platform=>platform.id?.startsWith("v112-canopy-")&&Math.abs(platform.y-p.y-p.height)<1e-6&&p.x+p.width>platform.x&&p.x<platform.x+platform.width))authoredCanopyContactFrames++;
  if(state.fieldLoadV112.ratio>peakLoadRatio){peakLoadRatio=state.fieldLoadV112.ratio;peakSpecimens=state.huntRites.specimensV112.map(item=>({...item}));}
  if(firstLoadAt===null&&state.fieldLoadV112.ratio>0)firstLoadAt={tick,...brief(state)};
  maxX=Math.max(maxX,p.x);
  if(input.keyboardHeld.has("right")||input.keyboardHeld.has("left")){stuck=Math.abs(p.x-lastX)<.05?stuck+dt:0;}else stuck=0;
  lastX=p.x;
  if(state.phase!==lastPhase){events.push(brief(state));lastPhase=state.phase;}
  if(Math.floor(state.elapsed)>lastSnapshot){samples.push(brief(state));lastSnapshot=Math.floor(state.elapsed);}
 }
 const outcome={missionId,armorId,success:result?.outcome==="success",result,climbFrames,swingFrames,authoredCanopyContactFrames,maxX,terminal:brief(state),admission,events,traceFrames:trace.length,ticksExecuted,harvestActions,peakLoadRatio,peakSpecimens,firstLoadAt};
 if(result)assert.equal(state.phase,"finished");
 if(outcome.success){
  assert.ok(state.player.health>0);
  assert.equal(state.boss.alive,false);
  assert.equal(state.boss.health,0);
  assert.ok(state.scanNodes.every(n=>n.scanned)&&state.recoveryNodes.every(n=>n.recovered));
  assert.ok(mission.objectives.every(o=>state.completedObjectives.has(o.id)),"every mission objective must finish natively");
  assert.ok(result.trophyClaims.some(c=>c.definitionId===mission.trophy.id));
 }
 assert.equal(climbFrames,0,"terrestrial controller must never attach to a climb support");
 assert.equal(swingFrames,0,"terrestrial controller must never swing");
 assert.equal(authoredCanopyContactFrames,0,"terrestrial route must never borrow an authored canopy rest");
 if(args.replay==="true"){
  randomState=0x1122026;
  const replay=runtime.makeGameState(mission,save.loadout,save.inventory,"hunter",save.appearance,false,false,encounterRun,save.exploration);
  const replayInput={keyboardHeld:new Set(),touchHeld:new Set(),gamepadHeld:new Set(),pressed:new Set(),previousGamepadButtons:[],activeGamepadIndex:null,gamepadNeedsNeutral:true,gamepadDialogActions:[],pointerScreen:null};
  let index=0,action=trace[0],replayedResult=null;
  for(let tick=0;tick<ticksExecuted;tick++){
   if(trace[index+1]?.tick===tick)action=trace[++index];
   replayInput.keyboardHeld=new Set(action.held);replayInput.pressed=new Set(action.pressed);replayInput.pointerScreen=action.pointer??null;
   if(action.menuAction)runtime.nativeRiteMenuQa(replay,mission,action.menuAction);
   runtime.stepGame(replay,mission,save.loadout,save.inventory,save.appearance,"hunter",replayInput,dt,r=>{replayedResult=r;});
  }
  assert.equal(JSON.stringify(brief(replay)),JSON.stringify(outcome.terminal),"the recorded inputs must reproduce the exact terminal simulation");
  assert.equal(replayedResult?.outcome,result?.outcome);
  outcome.replay={verified:true,ticks:ticksExecuted,terminalSha256:createHash("sha256").update(JSON.stringify(brief(replay))).digest("hex")};
 }
 outcomes.push(outcome);
 await writeFile(`${output}/${missionId}-${armorId}.json`,JSON.stringify({...outcome,samples,inputTrace:trace},null,2)+"\n");
 console.log(JSON.stringify({missionId,armorId,result:result?.outcome??result?.status??null,phase:state.phase,t:state.elapsed,x:state.player.x,health:state.player.health,kills:state.supportKills,bossHealth:state.boss.health,scans:state.scanNodes.map(n=>n.scanned),recoveries:state.recoveryNodes.map(n=>n.recovered),climbFrames,swingFrames}));
}
const head=(await readFile(root+".git/HEAD","utf8")).trim();
let commit=head;
if(head.startsWith("ref: ")){
 const ref=head.slice(5);
 try{commit=(await readFile(root+".git/"+ref,"utf8")).trim();}
 catch{commit=(await readFile(root+".git/packed-refs","utf8")).split("\n").find(line=>line.endsWith(" "+ref))?.split(" ")[0]??null;}
}
const report={schema:1,createdAt:new Date().toISOString(),commit,sourceSha256:createHash("sha256").update(source).digest("hex"),bundleSha256:createHash("sha256").update(bundle.outputFiles[0].text).digest("hex"),scriptSha256:createHash("sha256").update(scriptBytesAtAdmission).digest("hex"),policySha256:createHash("sha256").update(policyBytesAtAdmission).digest("hex"),command:process.argv,harvest:args.harvest==="true",scope:"Native stepGame, unchanged production source with appended exports and verbatim AST-extracted rite UI callback. GameInput and native menu callback only after explicit replay armor admission. Hunter difficulty, zero upgrades, seeded Math.random for reproducible legal spawn jitter. Harvest mode buys its tool using two documented real mission results, and only prepares real prey killed during this run. Actions capped at 10 rising edges per second. No browser, progression, physical keyboard or visual qualification.",outcomes};
await writeFile(`${output}/report.json`,JSON.stringify(report,null,2)+"\n");
if(args.requireComplete==="true")assert.ok(outcomes.every(o=>o.success),"all requested missions must finish through native extraction");
