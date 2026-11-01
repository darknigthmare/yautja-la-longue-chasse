/**
 * Repeatable CPU-only qualification of the existing HuntCanvas simulation.
 * No renderer, asset loading, DOM interaction, GPU or target-device FPS claim.
 * Run: node scripts/qa-hunt-native-performance-v112.mjs --report <json path>
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {cpus,platform,release,totalmem} from "node:os";
import {dirname} from "node:path";
import {performance} from "node:perf_hooks";
import {fileURLToPath} from "node:url";
import {runInNewContext} from "node:vm";
import {build} from "esbuild";

const argument=process.argv.indexOf("--report");
const reportPath=argument>=0?process.argv[argument+1]:"outputs/qa-v112-followup/native-performance.json";
assert.ok(reportPath&&!reportPath.startsWith("--"),"--report requires a path");
assert.ok(process.argv.slice(2).every((arg,index,args)=>arg==="--report"||args[index-1]==="--report"),"unknown option");
const revision=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
const canvasUrl=new URL("../app/game/HuntCanvas.tsx",import.meta.url);
const source=await readFile(canvasUrl,"utf8");
const exportSymbols=["makeGameState","stepGame","damageEnemy","spawnEligibleWaves","snapshot"];
const bundle=await build({
  stdin:{contents:source.replace("export default function HuntCanvas","function HuntCanvas")+"\nexport {"+exportSymbols.join(",")+"};\n"+
    'export {defaultSave} from "./save"; export {MISSION_BY_ID} from "./data";\n'+
    'export {CORPSE_DISCOVERY_V112,createCorpseDiscoveryV112,stepCorpseDiscoveryV112} from "./systems/corpseDiscoveryV112";',
    resolveDir:fileURLToPath(new URL("../app/game/",import.meta.url)),sourcefile:fileURLToPath(canvasUrl),loader:"tsx"},
  bundle:true,write:false,format:"cjs",platform:"node",jsx:"automatic",loader:{".module.css":"empty"},
  external:["react","react/jsx-runtime","react-dom"],logLevel:"silent",minify:true,
});
let randomState=1;
const random=()=>{randomState^=randomState<<13;randomState^=randomState>>>17;randomState^=randomState<<5;return (randomState>>>0)/4294967296;};
const math=Object.create(Math);math.random=random;
const compiled={exports:{}};
runInNewContext(bundle.outputFiles[0].text,{
  module:compiled,exports:compiled.exports,require:createRequire(import.meta.url),Math:math,
  document:{hidden:false,hasFocus:()=>true},navigator:{getGamepads:()=>[]},
});
const runtime=compiled.exports;
const missionIds=["jungle-vey","ice-cryostalker","volcano-bad-blood","swamp-hydra",
  "desert-sandmaw","ocean-leviathan","fungal-hivemind","ruins-ancient-guardian"];
const configuration={fixedStepSeconds:1/120,warmupSteps:240,measuredSteps:1800,passes:2,
  cpuRegressionGuard:{meanMs:8.333334,p95Ms:16.666667}};
const limits=runtime.CORPSE_DISCOVERY_V112;
const percentile=(sorted,fraction)=>sorted[Math.max(0,Math.ceil(sorted.length*fraction)-1)]??0;
function summary(samples){
  const sorted=[...samples].sort((a,b)=>a-b);
  return {samples:samples.length,meanMs:samples.reduce((a,b)=>a+b,0)/Math.max(1,samples.length),
    p50Ms:percentile(sorted,.5),p95Ms:percentile(sorted,.95),p99Ms:percentile(sorted,.99),
    maximumMs:sorted.at(-1)??0};
}
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
function inputHub(){
  return {keyboardHeld:new Set(),touchHeld:new Set(),gamepadHeld:new Set(),pressed:new Set(),
    previousGamepadButtons:[],activeGamepadIndex:null,gamepadNeedsNeutral:true,gamepadDialogActions:[],pointerScreen:null};
}
function budgetState(state){
  const ecosystem=state.ecosystem;
  assert.ok(ecosystem.receipts.length<=limits.maximumReceipts);
  assert.ok(ecosystem.events.length<=limits.maximumEvents);
  assert.ok(ecosystem.reactions.length<=limits.maximumReactions);
  assert.ok(ecosystem.zones.length<=limits.maximumZones);
  assert.ok(ecosystem.pendingRadios.length<=limits.maximumPendingRadios);
  for(const value of [state.elapsed,state.player.x,state.player.y,state.player.velocityX,state.player.velocityY,
    state.player.health,state.player.stamina])assert.ok(Number.isFinite(value),"native state must remain finite");
}
function finalStateDigest(state){
  return hash({elapsed:state.elapsed,phase:state.phase,kills:state.kills,damageTaken:state.damageTaken,
    player:{x:state.player.x,y:state.player.y,velocityX:state.player.velocityX,velocityY:state.player.velocityY,
      health:state.player.health,stamina:state.player.stamina},
    enemies:state.enemies.map(enemy=>[enemy.id,enemy.x,enemy.y,enemy.health,enemy.alive,enemy.active,enemy.facing]),
    receipts:state.ecosystem.receipts,corpses:state.huntRites.corpses,
    noiseEvents:state.noiseEvents,tracks:state.tracks});
}
function scenario(missionId,kind,pass){
  randomState=0x1234ab00+missionIds.indexOf(missionId)*17+(kind==="authored-waves-with-corpses"?1:0);
  const save=runtime.defaultSave("2026-11-01T00:00:00.000Z");
  save.inventory.fieldToolIds=["flaying-tool"];
  const mission=runtime.MISSION_BY_ID[missionId];
  assert.ok(mission,missionId);
  const state=runtime.makeGameState(mission,save.loadout,save.inventory,"hunter",save.appearance,
    true,false,"performance-v112-"+missionId,save.exploration);
  const initialEnemies=state.enemies.length;
  assert.ok(initialEnemies>0,"real start wave required: "+missionId);
  // Survival fixture only: retain native world, physics, AI and damage paths
  // while preventing a dead player from turning later measurements into no-ops.
  // Keep native health within the rites' validated numeric domain (<1e8).
  // Invulnerability alone keeps this fixed-duration CPU scene alive.
  state.player.invulnerability=1e6;
  if(kind==="authored-waves-with-corpses"){
    // Stress schedule: all actual mission waves are made available at t=0.
    // No additional enemy definition, geometry or fake corpse is introduced.
    for(const wave of mission.enemyWaves)runtime.spawnEligibleWaves(state,mission,"hunter",wave.trigger,wave.triggerId);
    for(const enemy of state.enemies){enemy.active=true;enemy.waveActivationAt=null;}
    const victims=state.enemies.slice(0,Math.min(3,Math.max(1,Math.floor(state.enemies.length/4))));
    for(const enemy of victims)runtime.damageEnemy(state,mission,enemy,enemy.health,"melee");
    assert.equal(state.huntRites.corpses.length,victims.length,"each corpse must come from native damage/death");
    assert.ok(state.enemies.some(enemy=>enemy.alive),"live native AI must remain");
  }
  const initial={enemies:state.enemies.length,alive:state.enemies.filter(enemy=>enemy.alive).length,
    corpses:state.huntRites.corpses.length,worldWidth:state.world.width,platforms:state.world.platforms.length,
    climbables:state.world.climbables.length,covers:state.world.covers.length};
  const input=inputHub(),samples=[],hudSamples=[];
  const peak={enemies:0,alive:0,corpses:0,receipts:0,reactions:0,zones:0,pendingRadios:0,
    projectiles:0,noiseEvents:0,tracks:0,goreParticles:0,stashes:0};
  const heapBefore=process.memoryUsage().heapUsed;
  let finishes=0;
  const count=configuration.warmupSteps+configuration.measuredSteps;
  const expectedDelta=count*configuration.fixedStepSeconds;
  for(let tick=0;tick<count;tick++){
    input.keyboardHeld.clear();input.pressed.clear();
    input.keyboardHeld.add(Math.floor(tick/900)%2===0?"right":"left");
    if(tick%360<96)input.keyboardHeld.add("up");
    if(tick%180<18)input.keyboardHeld.add("jump");
    if(tick%180===0)input.pressed.add("jump");
    if(tick%240===0)input.pressed.add("scan");
    if(tick%80===0)input.pressed.add("melee");
    const start=performance.now();
    runtime.stepGame(state,mission,save.loadout,save.inventory,save.appearance,"hunter",input,
      configuration.fixedStepSeconds,()=>{finishes++;});
    const duration=performance.now()-start;
    if(tick>=configuration.warmupSteps)samples.push(duration);
    // Mirror the shell's sound-queue consumption. No audio or drawing is timed.
    state.soundEvents.length=0;input.gamepadDialogActions.length=0;
    if(input.gamepadRiteActionsV112)input.gamepadRiteActionsV112.length=0;
    assert.equal(state.paused,false,"paused simulation cannot supply performance evidence");
    assert.notEqual(state.phase,"dead");assert.notEqual(state.phase,"finished");
    if(tick%12===0){
      const hudStart=performance.now();runtime.snapshot(state,mission);
      const hudDuration=performance.now()-hudStart;
      if(tick>=configuration.warmupSteps)hudSamples.push(hudDuration);
      budgetState(state);
      const values={enemies:state.enemies.length,alive:state.enemies.filter(enemy=>enemy.alive).length,
        corpses:state.huntRites.corpses.length,receipts:state.ecosystem.receipts.length,
        reactions:state.ecosystem.reactions.length,zones:state.ecosystem.zones.length,
        pendingRadios:state.ecosystem.pendingRadios.length,projectiles:state.projectiles.length,
        noiseEvents:state.noiseEvents.length,tracks:state.tracks.length,goreParticles:state.goreParticles.length,
        stashes:state.huntRites.stashedSpecimensV112?.length??0};
      for(const key of Object.keys(peak))peak[key]=Math.max(peak[key],values[key]);
    }
  }
  budgetState(state);
  assert.equal(finishes,0);
  assert.ok(Math.abs(state.elapsed-expectedDelta)<1e-8,"every step must advance native simulation time");
  const timing=summary(samples),hud=summary(hudSamples);
  return {missionId,kind,pass,initial,peak,simulatedSeconds:state.elapsed,
    measuredSimulatedSeconds:configuration.measuredSteps*configuration.fixedStepSeconds,timing,hud,
    heap:{beforeBytes:heapBefore,afterBytes:process.memoryUsage().heapUsed,
      interpretation:"Process heap snapshot without forced GC; not a retained-memory/leak measurement."},
    finalDigest:finalStateDigest(state),
    gate:{mean:timing.meanMs<=configuration.cpuRegressionGuard.meanMs,p95:timing.p95Ms<=configuration.cpuRegressionGuard.p95Ms}};
}
function discoveryStress(){
  const actors=Array.from({length:128},(_,index)=>({id:"stress-actor-"+index,kind:index%4===0?"beast":"human",
    factionId:"human",x:index%16*20,y:100+Math.floor(index/16)*10,alive:true,active:true,boss:false,
    radio:index%4!==0,animalResponse:"inspect"}));
  const corpses=Array.from({length:128},(_,index)=>({id:"stress-body-"+index,kind:"human",x:index%16*20,
    y:100+Math.floor(index/16)*10,erased:false,marked:true,flayed:false,supportId:null,witnesses:[]}));
  let state=runtime.createCorpseDiscoveryV112("synthetic-discovery-stress");
  const samples=[],peak={pairs:0,sightQueries:0,scentQueries:0,radioRecipients:0,receipts:0,pendingRadios:0};
  for(let index=0;index<600;index++){
    const start=performance.now();
    const result=runtime.stepCorpseDiscoveryV112(state,{now:index*.11,actors,corpses,canSee:()=>true,canSmell:()=>true});
    samples.push(performance.now()-start);state=result.state;
    for(const key of ["pairs","sightQueries","scentQueries","radioRecipients"])peak[key]=Math.max(peak[key],result.metrics[key]);
    peak.receipts=Math.max(peak.receipts,state.receipts.length);peak.pendingRadios=Math.max(peak.pendingRadios,state.pendingRadios.length);
    assert.ok(result.metrics.pairs<=limits.pairsPerScan);
    assert.ok(result.metrics.sightQueries<=limits.pairsPerScan);
    assert.ok(result.metrics.scentQueries<=limits.pairsPerScan);
    assert.ok(result.metrics.radioRecipients<=limits.radiosPerScan*limits.recipientsPerRadio);
    assert.ok(state.receipts.length<=limits.maximumReceipts);
    assert.ok(state.events.length<=limits.maximumEvents);
    assert.ok(state.reactions.length<=limits.maximumReactions);
    assert.ok(state.zones.length<=limits.maximumZones);
    assert.ok(state.pendingRadios.length<=limits.maximumPendingRadios);
  }
  assert.equal(peak.receipts,limits.maximumReceipts,"the saturation fixture must actually reach its bounded ledger");
  return {scope:"Synthetic isolated discovery stress, 128 actors × 128 corpses, always-visible callbacks; not a live mission.",
    actors:actors.length,corpses:corpses.length,steps:samples.length,peak,timing:summary(samples)};
}
const cases=[];
for(const missionId of missionIds)for(const kind of ["start-roster","authored-waves-with-corpses"]){
  for(let pass=1;pass<=configuration.passes;pass++){
    const result=scenario(missionId,kind,pass);cases.push(result);
    console.log(missionId+" "+kind+" pass "+pass+": mean="+result.timing.meanMs.toFixed(3)+
      "ms p95="+result.timing.p95Ms.toFixed(3)+"ms enemies="+result.initial.enemies+" bodies="+result.initial.corpses);
  }
  const pair=cases.slice(-2);
  assert.equal(pair[0].finalDigest,pair[1].finalDigest,"same seed/input must produce the same final state: "+missionId+"/"+kind);
}
const stress=discoveryStress();
const failures=cases.filter(result=>!result.gate.mean||!result.gate.p95).map(result=>result.missionId+"/"+result.kind+"/pass"+result.pass);
const cpu=cpus();
const report={schemaVersion:1,generatedAt:new Date().toISOString(),qualification:"NATIVE_CPU_CI",
  status:failures.length?"FAIL":"PASS",provenance:{revision,githubRunId:process.env.GITHUB_RUN_ID??null,
    githubJob:process.env.GITHUB_JOB??null,sourceSha256:createHash("sha256").update(source).digest("hex"),
    bundle:"esbuild minified in-memory production source; React external, CSS empty; private native symbols exposed only in harness."},
  environment:{node:process.version,platform:platform(),osRelease:release(),arch:process.arch,
    cpuModel:cpu[0]?.model??"unknown",logicalCpus:cpu.length,totalMemoryBytes:totalmem()},
  configuration,limits,scope:{
    measured:"Native CPU stepGame and separately 10 Hz HUD snapshot. Eight actual mission worlds, both original and stress-scheduled authored enemies.",
    survivalFixture:"Native health/maxHealth retained; player invulnerability set to 1e6 seconds. Simulation, geometry, AI, collision and enemy damage/death stay enabled.",
    input:"Deterministic normalized keyboard InputHub commands; no physical input device, DOM, renderer, asset loading or audio.",
    stressSchedule:"All-waves scenario moves existing mission wave activation to t=0, kills up to three real actors through damageEnemy, retains other native enemies.",
    memory:"Before/after process heap samples are informational, not a leak qualification.",
    guard:"Generous CPU regression guard for this CI runner; not a whole-frame/FPS, GPU, phone or controller certification.",
    unqualified:["GPU and renderer frame times","target physical hardware and thermal behavior","complete interactive combat campaign","retained memory/leak profile"]},
  cases,discoveryStress:stress,summary:{cases:cases.length,nativeStepCalls:cases.length*(configuration.warmupSteps+configuration.measuredSteps),
    measuredStepCalls:cases.length*configuration.measuredSteps,deterministicPairs:cases.length/2,failures}};
await mkdir(dirname(reportPath),{recursive:true});await writeFile(reportPath,JSON.stringify(report,null,2)+"\n");
console.log("Native CPU qualification "+report.status+": "+cases.length+" scenarios, "+report.summary.measuredStepCalls+
  " measured native steps, "+report.summary.deterministicPairs+" deterministic pairs; report "+reportPath);
assert.deepEqual(failures,[],"native CPU regression guard exceeded (see report)");
