import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";

const canvasUrl=new URL("../app/game/HuntCanvas.tsx",import.meta.url);
const source=await readFile(canvasUrl,"utf8");
const bundled=await build({
  stdin:{contents:source.replace("export default function HuntCanvas","function HuntCanvas")+ `
export { makeGameState, makeEnemy, damageEnemy, updateRegularEnemy, updateCorpseDiscoveryV112, updateHuntRitesV77, captureCheckpoint, serializeActiveHuntCheckpoint, deserializeActiveHuntCheckpoint, restoreCheckpoint, riteContextV77, startHuntRiteV77 };
export { stepHuntRiteV77 } from "./systems/ritesOfHuntV77";
export * from "./systems/corpseDiscoveryV112";
export * from "./discoverySignalsV112";
export { defaultSave } from "./save";
export { MISSION_BY_ID } from "./data";
`,resolveDir:fileURLToPath(new URL("../app/game/",import.meta.url)),sourcefile:fileURLToPath(canvasUrl),loader:"tsx"},
  bundle:true,write:false,format:"cjs",platform:"node",jsx:"automatic",loader:{".module.css":"empty"},
  external:["react","react/jsx-runtime","react-dom"],logLevel:"silent",
});
const compiled={exports:{}};
runInNewContext(bundled.outputFiles[0].text,{module:compiled,exports:compiled.exports,require:createRequire(import.meta.url),
  document:{hidden:false,hasFocus:()=>true},navigator:{getGamepads:()=>[]}});
const r=compiled.exports;
const plain=value=>JSON.parse(JSON.stringify(value));
const actor=(id="witness",extra={})=>({id,kind:"human",factionId:"human",x:100,y:100,alive:true,active:true,boss:false,radio:true,animalResponse:"avoid",...extra});
const corpse=(id="prey",extra={})=>({id,kind:"human",x:180,y:100,erased:false,marked:false,flayed:false,supportId:null,witnesses:[],...extra});
const input=(now=0,extra={})=>({now,corpses:[corpse()],actors:[actor()],canSee:()=>true,canSmell:()=>true,...extra});
const step=(state,now=0,extra={})=>r.stepCorpseDiscoveryV112(state,input(now,extra));
const initial=()=>r.createCorpseDiscoveryV112("run");
test("a body is visual evidence once, with local fear and no hunter position",()=>{
  const first=step(initial());
  assert.equal(first.observations.length,1);
  assert.equal(first.observations[0].channel,"visual");
  assert.equal(first.state.zones.length,1);
  assert.equal(first.state.reactions[0].response,"investigate");
  assert.equal("lastKnownTarget" in first.state,false);
  assert.equal(step(first.state,.2).observations.length,0);
});
test("occlusion, inactive actors and boss never create discoveries or radios",()=>{
  const blocked=step(initial(),0,{canSee:()=>false,canSmell:()=>false});
  assert.equal(blocked.state.receipts.length,0);assert.equal(blocked.state.pendingRadios.length,0);
  for(const change of [{alive:false},{active:false},{boss:true}]){
    assert.equal(step(initial(),0,{actors:[actor("w",change)]}).observations.length,0);
  }
});
test("radio waits for transmission, stays in faction and range, and stops after one hop",()=>{
  const actors=[actor("source"),actor("near",{x:400}),actor("other-faction",{x:120,factionId:"rival"}),
    actor("far",{x:700}),actor("beast",{x:120,kind:"beast",radio:false})];
  const onlySource=a=>a.id==="source";
  let result=step(initial(),0,{actors,canSee:onlySource,canSmell:()=>false});
  assert.equal(result.state.pendingRadios.length,1);
  result=step(result.state,.7,{actors,canSee:()=>false,canSmell:()=>false});
  assert.equal(result.observations.length,0);
  result=step(result.state,.9,{actors,canSee:()=>false,canSmell:()=>false});
  assert.deepEqual(plain(result.observations.map(o=>[o.actorId,o.channel])),[["near","radio"]]);
  assert.equal(result.state.pendingRadios.length,0);
  assert.equal(step(result.state,2,{actors,canSee:()=>false,canSmell:()=>false}).observations.length,0);
});
test("killed or erased radio source cancels the untransmitted report",()=>{
  for(const erased of [false,true]){
    let result=step(initial());
    result=step(result.state,1,{actors:[actor("witness",{alive:erased})],corpses:[corpse("prey",{erased})]});
    assert.equal(result.observations.length,0);assert.equal(result.state.pendingRadios.length,0);
  }
});
test("radio receipt followed by real sight is a distinct event, never a duplicate visual",()=>{
  const actors=[actor("source"),actor("ally",{x:400})];
  let result=step(initial(),0,{actors,canSee:a=>a.id==="source"});
  result=step(result.state,1,{actors,canSee:()=>false});
  assert.equal(result.observations[0].channel,"radio");
  result=step(result.state,1.2,{actors});
  assert.equal(result.observations[0].channel,"visual");
  assert.equal(step(result.state,1.4,{actors}).observations.length,0);
});
test("legacy V111 witnesses are seeded silently and do not replay morale or alert",()=>{
  const result=step(initial(),0,{corpses:[corpse("prey",{marked:true,witnesses:["witness"]})]});
  assert.equal(result.observations.length,0);assert.equal(result.state.receipts.length,1);
  assert.equal(result.state.reactions.length,0);assert.equal(result.state.pendingRadios.length,0);
});
test("beasts use local scent and ecological behavior instead of human fear",()=>{
  assert.equal(r.animalCorpseResponseV112("Herbivore territorial"),"avoid");
  assert.equal(r.animalCorpseResponseV112("Charognard cavernicole"),"inspect");
  assert.equal(r.animalCorpseResponseV112("Prédateur territorial"),"guard");
  const result=step(initial(),0,{actors:[actor("animal",{kind:"beast",radio:false,animalResponse:"inspect"})],canSee:()=>false});
  assert.equal(result.observations[0].channel,"scent");assert.equal(result.observations[0].fear,0);
  assert.equal(result.state.reactions[0].response,"inspect");
  assert.equal(result.state.zones.length,0);assert.equal(result.state.pendingRadios.length,0);
});
test("scent does not cross a solid occluder and is limited to 140 pixels",()=>{
  const a=actor("animal",{kind:"beast",radio:false});
  assert.equal(step(initial(),0,{actors:[a],canSee:()=>false,canSmell:()=>false}).observations.length,0);
  assert.equal(step(initial(),0,{actors:[{...a,x:1000}],canSee:()=>false}).observations.length,0);
});
test("fear decays locally, follows moved corpse, and never affects wildlife or rival factions",()=>{
  const c=corpse("prey",{flayed:true});const a=actor();
  const result=step(initial(),0,{corpses:[c]});
  assert.ok(r.corpseZoneFearV112(result.state,a,[c],0)>0);
  assert.equal(r.corpseZoneFearV112(result.state,a,[c],31),0);
  assert.equal(r.corpseZoneFearV112(result.state,actor("rival",{factionId:"rival"}),[c],0),0);
  assert.equal(r.corpseZoneFearV112(result.state,actor("beast",{kind:"beast"}),[c],0),0);
  assert.equal(r.corpseZoneFearV112(result.state,a,[{...c,x:2000}],0),0);
});
test("line-of-sight workload and radio fanout are strictly bounded under a dense encounter",()=>{
  const actors=Array.from({length:100},(_,i)=>actor("a"+i,{x:100+i}));
  const corpses=Array.from({length:100},(_,i)=>corpse("c"+i));
  const first=step(initial(),0,{actors,corpses});
  assert.equal(first.metrics.pairs,32);assert.ok(first.metrics.sightQueries<=32);
  const skipped=step(first.state,.01,{actors,corpses});
  assert.equal(skipped.metrics.pairs,0);
  const next=step(first.state,1,{actors,corpses,canSee:()=>false});
  assert.ok(next.metrics.radioRecipients<=8);
  assert.ok(next.state.pendingRadios.length<=16);
});
test("full receipt capacity preserves histories without deleting them to create duplicate rewards",()=>{
  const state=initial();
  state.receipts=Array.from({length:1024},(_,i)=>({id:"reserved"+i,corpseId:"c"+i,actorId:"a",channel:"visual",at:0,fear:4,sourceActorId:null}));
  const result=step(state);
  assert.equal(result.state.receipts.length,1024);assert.equal(result.observations.length,0);
});
test("persistence restores detached data and rejects foreign identities, invented radio and altered timing",()=>{
  const actors=[actor("source"),actor("ally",{x:400})],corpses=[corpse()];
  let result=step(initial(),0,{actors,corpses,canSee:a=>a.id==="source"});
  result=step(result.state,1,{actors,corpses,canSee:()=>false});
  const saved=plain(result.state);
  const restored=r.restoreCorpseDiscoveryV112(saved,"run",corpses,actors,1);
  assert.ok(restored);assert.notEqual(restored,saved);
  assert.equal(r.restoreCorpseDiscoveryV112(saved,"foreign",corpses,actors,1),null);
  for(const mutate of [
    s=>{s.receipts[0].actorId="invented";},
    s=>{s.receipts.push(null);},
    s=>{s.zones.push(null);},
    s=>{s.receipts[1].sourceActorId="invented";},
    s=>{s.receipts[1].at=.1;},
    s=>{s.reactions[0].until=1000;},
    s=>{s.events.push("invented");},
  ]){const bad=plain(saved);mutate(bad);assert.equal(r.restoreCorpseDiscoveryV112(bad,"run",corpses,actors,1),null);}
});
function fixture(){
  const save=r.defaultSave("2026-10-28T00:00:00.000Z");
  const mission=r.MISSION_BY_ID["jungle-vey"];
  const state=r.makeGameState(mission,save.loadout,save.inventory,"hunter",save.appearance,false,false,"ecosystem-v112",save.exploration);
  state.world={...state.world,floorY:624,platforms:[],climbables:[],hazards:[],covers:[]};
  state.enemies=[];state.noiseEvents=[];state.tracks=[];state.scentNodes=[];
  state.player.x=3000;state.player.y=624-state.player.height;
  const prey=r.makeEnemy("prey","scout",mission.id,1300,state.world.width,80,10,0,1,1);
  Object.assign(prey,{x:1300,y:624-prey.height,knockbackRestY:624-prey.height});
  state.enemies.push(prey);r.damageEnemy(state,mission,prey,prey.maxHealth+1,"melee");
  const makeWitness=(id="observer",archetype="scout",x=1500)=>{
    const e=r.makeEnemy(id,archetype,mission.id,x,state.world.width,80,10,0,1,1);
    Object.assign(e,{x,y:624-e.height,knockbackRestY:624-e.height,facing:-1,active:true});
    state.enemies.push(e);return e;
  };
  return {save,mission,state,prey,makeWitness};
}
test("native HuntCanvas discovery records the actual body and no last-known hunter position",()=>{
  const f=fixture(),w=f.makeWitness();
  r.updateCorpseDiscoveryV112(f.state);
  assert.equal(f.state.ecosystem.receipts.length,1);
  assert.equal(f.state.aiBrains[w.id].lastKnownTarget,null);
  assert.equal(w.riteInvestigate.x,f.state.huntRites.corpses[0].x);
  assert.equal(f.state.huntRites.corpses[0].witnesses.length,0,"unstaged body does not invent a staged-rite witness");
  const suspicion=f.state.aiBrains[w.id].suspicion;
  f.state.elapsed=.2;r.updateCorpseDiscoveryV112(f.state);
  assert.equal(f.state.aiBrains[w.id].suspicion,suspicion);
});
test("native structural wall prevents body discovery, local fear and radio",()=>{
  const f=fixture();f.makeWitness();
  f.state.world.platforms=[{id:"wall",x:1420,y:100,width:30,height:600,collision:"solid"}];
  r.updateCorpseDiscoveryV112(f.state);
  assert.equal(f.state.ecosystem.receipts.length,0);assert.equal(f.state.ecosystem.zones.length,0);
});
test("native allied report investigates the body without revealing hunter behind terrain",()=>{
  const f=fixture(),source=f.makeWitness("source","scout",1450),ally=f.makeWitness("ally","scout",1850);
  ally.facing=1;
  r.updateCorpseDiscoveryV112(f.state);
  f.state.elapsed=1;r.updateCorpseDiscoveryV112(f.state);
  const report=f.state.ecosystem.receipts.find(o=>o.actorId===ally.id&&o.channel==="radio");
  assert.ok(report);assert.equal(report.sourceActorId,source.id);
  assert.equal(f.state.aiBrains[ally.id].lastKnownTarget,null);
  assert.equal(ally.riteInvestigate.x,f.state.huntRites.corpses[0].x);
});
test("native animal avoidance changes real movement and suppresses a corpse-directed attack",()=>{
  const f=fixture(),grazer=f.makeWitness("grazer","oseris-iv--vineback-grazer",1450);
  r.updateCorpseDiscoveryV112(f.state);
  const reaction=r.corpseDiscoveryReactionV112(f.state.ecosystem,grazer.id,0);
  assert.equal(reaction.response,"avoid");assert.equal(f.state.aiBrains[grazer.id]?.morale,undefined);
  const previous=grazer.x;r.updateRegularEnemy(f.state,grazer,f.mission,.05);
  assert.ok(grazer.x>previous,"grazer moves away from corpse to the left");
  assert.equal(grazer.pendingAttackId,null);
});
test("native discovery archive round-trips without replaying evidence or source coordinates",()=>{
  const f=fixture();f.makeWitness();r.updateCorpseDiscoveryV112(f.state);
  const checkpoint=r.captureCheckpoint(f.state,"resume");
  const serialized=r.serializeActiveHuntCheckpoint(checkpoint,0);
  assert.ok(serialized);const decoded=r.deserializeActiveHuntCheckpoint(serialized);assert.ok(decoded);
  const restored=r.restoreCheckpoint(f.state,decoded.checkpoint,"resume");
  assert.equal(restored.ecosystem.receipts.length,1);
  assert.equal(restored.ecosystem.runId,f.state.huntRites.runId);
  restored.paused=false;restored.elapsed=.2;r.updateCorpseDiscoveryV112(restored);
  assert.equal(restored.ecosystem.receipts.length,1);
});
test("signal text and shape are independent of color and asset loading",()=>{
  const reaction={actorId:"a",corpseId:"c",channel:"radio",response:"investigate",startedAt:0,until:7};
  assert.equal(r.discoverySignalLabelV112(reaction),"RADIO · CORPS");
  const calls=[];const context=new Proxy({}, {get:(_,key)=> (...args)=>calls.push([key,...args]),set:()=>true});
  r.drawDiscoverySignalV112(context,reaction,100,100);
  assert.ok(calls.some(c=>c[0]==="arc"));assert.ok(calls.some(c=>c[0]==="fillText"&&c[1]==="RADIO · CORPS"));
});
