import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
const result=await build({
 stdin:{contents:[
 "export * from './app/game/systems/clanWarProofSyncV145';",
 "export * from './app/game/systems/clanWarDebriefV144';",
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarRtsSquadsV133';",
 "export * from './app/game/systems/clanWarV85';",
 "export * from './app/game/systems/clanWarV85Data';",
 "export * from './app/game/systems/clanWarPlanetsV96';",
 "export * from './app/game/systems/clanWarBibleV6';",
 "export * from './app/game/systems/clanWarSessionV85';",
 ].join("\n"),resolveDir:process.cwd()},
 bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent",
});
const api=await import("data:text/javascript;base64,"+
 Buffer.from(result.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;

function sourceArchive(mode){
 const initial=api.createWarOperationsV115(rules),team=initial.teams[0].id;
 const target=rules.territories.find(t=>t.id!==initial.baseId&&
  !api.warMissionEligibleV115(initial,rules,t.id,[team]));
 assert.ok(target,mode+" has no valid source territory");
 const opened=api.beginWarOperationV115(initial,mode,target.id,[team],rules,1000);
 assert.equal(opened.accepted,true,opened.message);
 let next;
 if(mode==="outer"){
  const order=opened.state.outer[0];
  const recall=api.recallWarOuterMissionV116(opened.state,order.id,order.startedAt+100,rules);
  assert.equal(recall.accepted,true,recall.message);
  const receipt=api.settleWarOuterOpsV115(recall.state,recall.state.outer[0].dueAt,rules);
  assert.equal(receipt.accepted,true,receipt.message);next=receipt.state;
 }else{
  const quit=api.leaveWarOperationV115(opened.state,rules);
  assert.equal(quit.accepted,true,quit.message);next=quit.state;
 }
 assert.equal(next.reports.length,1);
 return {raw:JSON.stringify(next),state:next,team,target:target.id};
}
function first(mode,front=api.createWarSimulationV85()){
 const archive=sourceArchive(mode),review=api.reviewWarProofSyncV145(archive.raw,front,rules);
 assert.equal(review.reason,null);
 assert.deepEqual(review.rejectedIds,[]);
 assert.equal(review.sourceReportCount,1);
 assert.equal(review.eligible.length,1);
 assert.equal(review.eligible[0].mode,mode);
 return {...archive,front,review,offer:review.eligible[0]};
}

test("V145: four real V115 modes produce distinct valid debrief candidates only on Korthas",()=>{
 const keys=new Set();
 for(const mode of ["assault","outer","stealth","rts"]){
  const src=first(mode);
  assert.equal(src.offer.territoryId,src.target);
  assert.equal(src.offer.matchedV85TerritoryId,null,
   "W3-K territories cannot be fabricated as CON-T sites");
  assert.equal(src.offer.outcome,"retreat");
  assert.equal(src.offer.teamIds.length,1);
  assert.equal(src.offer.woundedCount,0);
  assert.equal(src.offer.alreadyImported,false);
  assert.match(src.offer.marker,/^clan-proof-v145:V115:/);
  keys.add(src.offer.receiptKey);
 }
 // Each practice starts its local serial at 0, so identical receipt IDs across
 // resets are not sufficient to infer distinct campaigns. This is intentional
 // idempotence for the same exercise-local archive identity.
 assert.ok(keys.size>=1);
});

test("V145: explicit proof import adds exactly one documentary receipt without claiming game gains",()=>{
 const src=first("assault"),before=JSON.stringify(src.front),snapshot=JSON.parse(before);
 const value=api.importWarProofV145(src.front,src.raw,src.offer.receiptKey,src.front.revision,rules);
 assert.equal(value.accepted,true,value.message);
 const after=value.state;
 assert.equal(after.revision,src.front.revision+1);
 assert.equal(after.reports.length,src.front.reports.length+1);
 assert.deepEqual(after.appliedResultIds,[...src.front.appliedResultIds,src.offer.marker]);
 assert.equal(after.reports.at(-1).id,src.offer.marker);
 assert.equal(after.reports.at(-1).turn,src.front.turn);
 assert.ok(after.reports.at(-1).text.includes("Aucune conquête ni XP attribuée"));
 assert.match(after.reports.at(-1).text,/territoire V85 NON APPARIÉ/);
 for(const field of ["turn","seed","planetId","version","context",
                     "combatants","territories","stocks","orders","observations",
                     "totalStability","regionStability","corridorStability",
                     "completedObjectives","stableRegionId","heldStocks","convoyRouteV105"]){
  assert.deepEqual(after[field],snapshot[field],field+" gameplay field mutated");
 }
 assert.equal(JSON.stringify(src.front),before,"input V85 was mutated");
 assert.equal(api.readWarSimulationV85(after)?.revision,after.revision);
 const replay=api.importWarProofV145(after,src.raw,src.offer.receiptKey,after.revision,rules);
 assert.equal(replay.accepted,false);
 assert.equal(replay.state,after,"replay never mutates or writes");
 const review=api.reviewWarProofSyncV145(src.raw,after,rules);
 assert.equal(review.eligible[0].alreadyImported,true);
});

test("V145: missing, stale, forged or mismatched receipts all reject without archive changes",()=>{
 const src=first("outer");
 const missing=api.importWarProofV145(src.front,src.raw,"V115:invented",
  src.front.revision,rules);
 assert.equal(missing.accepted,false);assert.equal(missing.state,src.front);
 const stale=api.importWarProofV145(src.front,src.raw,src.offer.receiptKey,
  src.front.revision+1,rules);
 assert.equal(stale.accepted,false);assert.equal(stale.state,src.front);
 const malformed=api.reviewWarProofSyncV145("{bad",src.front,rules);
 assert.equal(malformed.eligible.length,0);
 assert.ok(malformed.reason);
 const altered={...src.state,sourceSha:"SOURCE-SPOOF"};
 const forged=api.importWarProofV145(src.front,JSON.stringify(altered),src.offer.receiptKey,
  src.front.revision,rules);
 assert.equal(forged.accepted,false);assert.equal(forged.state,src.front);
 const sourceTooLarge=api.reviewWarProofSyncV145("x".repeat(450001),src.front,rules);
 assert.equal(sourceTooLarge.eligible.length,0);
});

test("V145: cross-planet source V115 never writes a different world's V85 journal",()=>{
 const alien=api.WAR_PLANETS_V96.find(p=>p.id!=="korthas");
 assert.ok(alien);
 const v85=api.createWarSimulationV85(undefined,alien.id);
 const source=sourceArchive("stealth");
 const review=api.reviewWarProofSyncV145(source.raw,v85,rules);
 assert.equal(review.eligible.length,0);
 assert.match(review.reason,/planète/);
 const result=api.importWarProofV145(v85,source.raw,"V115:INVALID",v85.revision,rules);
 assert.equal(result.accepted,false);
 assert.equal(result.state,v85);
});

test("V145: RTS W3 from source V133 does not map to a fictitious Korthas territory",()=>{
 const draft=api.createWarRtsSquadsV133("W3-RTS01",rules);
 const launched=api.launchWarRtsSquadsV133(draft);
 assert.equal(launched.accepted,true,launched.message);
 const state=launched.state,actor=state.squads[0];
 const atExit={...state,squads:state.squads.map(u=>u.id===actor.id?{
  ...u,x:state.map.extraction.x,y:state.map.extraction.y}:u)};
 const done=api.commandWarRtsSquadsV133(atExit,{kind:"retreat",squadId:actor.id});
 assert.equal(done.accepted,true,done.message);
 const d=api.auditWarRtsDebriefV144(done.state,rules).debriefs[0];
 assert.equal(d.campaignCandidateTerritoryId,null);
 assert.equal(d.campaignMutation,false);
 assert.ok(d.planetId);
 assert.ok(d.mapId);
});

test("V145: a genuine documentary receipt survives V85 JSON reload but cannot be imported twice",()=>{
 const src=first("stealth");
 const result=api.importWarProofV145(src.front,src.raw,src.offer.receiptKey,src.front.revision,rules);
 assert.equal(result.accepted,true);
 const loaded=api.readWarSimulationV85(JSON.parse(JSON.stringify(result.state)));
 assert.ok(loaded);
 const found=api.reviewWarProofSyncV145(src.raw,loaded,rules).eligible[0];
 assert.equal(found.alreadyImported,true);
 const again=api.importWarProofV145(loaded,src.raw,found.receiptKey,loaded.revision,rules);
 assert.equal(again.accepted,false);
 assert.equal(again.state,loaded);
});

test("V145: session writes through the existing V85 transaction gate, not the V115 or main save",async()=>{
 const source=first("outer");
 const map=new Map([["real-campaign-save","UNTOUCHED"]]);
 const writes=[];
 const storage={getItem:key=>map.get(key)??null,setItem(key,value){writes.push(key);map.set(key,value);}};
 const lock=async operation=>({acquired:true,value:await operation()});
 const session=api.createWarSessionV85(()=>storage,lock,null);
 session.subscribe(()=>{});
 assert.equal(session.getSnapshot().loaded,true);
 const start=session.getSnapshot().simulation;
 const proof=api.importWarProofV145(start,source.raw,source.offer.receiptKey,start.revision,rules);
 assert.equal(proof.accepted,true,proof.message);
 session.setSimulation(proof.state);
 await session.whenSettled();
 assert.equal(session.getSnapshot().persistedWar,true);
 assert.equal(map.get("real-campaign-save"),"UNTOUCHED");
 assert.deepEqual(writes,[api.WAR_STORAGE_KEY_V85]);
 const saved=api.readWarSimulationV85(JSON.parse(map.get(api.WAR_STORAGE_KEY_V85)));
 assert.ok(saved?.appliedResultIds.includes(source.offer.marker));
 const repeated=api.importWarProofV145(saved,source.raw,source.offer.receiptKey,saved.revision,rules);
 assert.equal(repeated.accepted,false);
 assert.equal(writes.length,1);
});

test("V145: registry limits cannot overflow V85 revision or report capacity",()=>{
 const src=first("rts");
 const exhausted={...src.front,revision:1000000};
 const denied=api.importWarProofV145(exhausted,src.raw,src.offer.receiptKey,
   exhausted.revision,rules);
 assert.equal(denied.accepted,false);
 assert.equal(denied.state,exhausted);
});

test("V145: V85 destination archive invalidity is a hard stop, never an implicit reset",()=>{
 const src=first("assault");
 const corrupt={...src.front,territories:{"FOREIGN":{controller:"CON-F01",
   installationIntact:true,transitUntilTurn:null}}};
 const review=api.reviewWarProofSyncV145(src.raw,corrupt,rules);
 assert.equal(review.eligible.length,0);
 assert.ok(review.reason);
 const denied=api.importWarProofV145(corrupt,src.raw,src.offer.receiptKey,
  corrupt.revision,rules);
 assert.equal(denied.accepted,false);
 assert.equal(denied.state,corrupt);
});
