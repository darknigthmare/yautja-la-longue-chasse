import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const compiled=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarCouncilReviewV147';",
 "export * from './app/game/systems/clanWarSourceAuditV146';",
 "export * from './app/game/systems/clanWarDebriefV144';",
 "export * from './app/game/systems/clanWarRtsSquadsV133';",
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarRtsSourceMissionsV129';",
 "export * from './app/game/systems/clanWarBibleV6';",
 "export * from './app/game/systems/clanWarV85';",
].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
 format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+
 Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;

function rtsReceipt(){
 const init=api.createWarRtsSquadsV133("W3-RTS01",rules);
 const launched=api.launchWarRtsSquadsV133(init);
 assert.equal(launched.accepted,true,launched.message);
 const s=launched.state,ally=s.squads[0];
 const onExit={...s,squads:s.squads.map(u=>u.id===ally.id?
  {...u,x:s.map.extraction.x,y:s.map.extraction.y}:u)};
 const r=api.commandWarRtsSquadsV133(onExit,{kind:"retreat",squadId:ally.id});
 assert.equal(r.accepted,true,r.message);
 assert.ok(r.state.report);
 return r.state;
}
function completed(mode){
 const state=api.createWarOperationsV115(rules),team=state.teams[0].id;
 const target=rules.territories.find(t=>t.id!==state.baseId&&
  !api.warMissionEligibleV115(state,rules,t.id,[team]));
 assert.ok(target);
 const opened=api.beginWarOperationV115(state,mode,target.id,[team],rules,1000);
 assert.equal(opened.accepted,true,opened.message);
 if(mode==="outer"){
  const order=opened.state.outer[0];
  const recall=api.recallWarOuterMissionV116(opened.state,order.id,order.startedAt+100,rules);
  assert.equal(recall.accepted,true);
  const settled=api.settleWarOuterOpsV115(recall.state,recall.state.outer[0].dueAt,rules);
  assert.equal(settled.accepted,true);
  return settled.state;
 }
 const leave=api.leaveWarOperationV115(opened.state,rules);
 assert.equal(leave.accepted,true,leave.message);
 return leave.state;
}
test("V147 hardened W133 debrief verifies the unmodified authored W3 source and never authorizes V85",()=>{
 const state=rtsReceipt(),before=JSON.stringify(state);
 assert.equal(api.isWarRtsSourceConsistentV147(state,rules),true);
 const audit=api.auditWarRtsDebriefV144(state,rules);
 assert.deepEqual(audit.rejectedIds,[]);
 assert.equal(audit.debriefs.length,1);
 const proof=audit.debriefs[0];
 assert.equal(proof.source,"V133-W3-EXERCISE");
 assert.equal(proof.campaignMutation,false);
 assert.equal(proof.requiresAuthorizedCampaignBridge,true);
 assert.equal(proof.campaignCandidateTerritoryId,null);
 assert.equal(JSON.stringify(state),before);
});

test("V147 rejects a forged map even when the receipt and the state agree on all IDs",()=>{
 const state=rtsReceipt(),map=state.map;
 const adjusted={...state,map:{...map,
  tiles:map.tiles.map((t,i)=>i===0?{...t,cover:!t.cover}:t)}};
 assert.equal(api.isWarRtsSourceConsistentV147(adjusted,rules),false);
 const audit=api.auditWarRtsDebriefV144(adjusted,rules);
 assert.equal(audit.debriefs.length,0);
 assert.deepEqual(audit.rejectedIds,["V133:"+state.report.id]);
});

test("V147 rejects a changed mission objective geometry or invented mission source cells",()=>{
 const state=rtsReceipt();
 const fake={...state,mission:{...state.mission,tasks:state.mission.tasks.map((t,i)=>
  i===0?{...t,location:{x:t.location.x+1,y:t.location.y}}:t)}};
 assert.equal(api.isWarRtsSourceConsistentV147(fake,rules),false);
 assert.equal(api.auditWarRtsDebriefV144(fake,rules).debriefs.length,0);
 const cells={...state,mission:{...state.mission,sourceCells:[...state.mission.sourceCells,"invented-cell"]}};
 assert.equal(api.isWarRtsSourceConsistentV147(cells,rules),false);
});

test("V147 detects inflated W3 unit statistics and PC budget in a self-consistent client save",()=>{
 const state=rtsReceipt();
 const actor=state.squads[0];
 for(const fake of [
  {...state,squads:state.squads.map(s=>s.id===actor.id?{...s,attack:s.attack+15}:s)},
  {...state,squads:state.squads.map(s=>s.id===actor.id?{...s,memberCount:s.memberCount+1}:s)},
  {...state,pcCommitted:state.pcCommitted+5},
  {...state,ravRemaining:state.initialRav+1},
 ]){
  assert.equal(api.isWarRtsSourceConsistentV147(fake,rules),false);
  assert.equal(api.auditWarRtsDebriefV144(fake,rules).debriefs.length,0);
 }
});

test("V147 rejects mutually forged victory and receipt before the 3 source objectives are done",()=>{
 const state=rtsReceipt(),report=state.report;
 const forged={...state,phase:"victory",
  report:{...report,outcome:"victory",id:"W133-"+state.mission.id+"-victory-"+state.turn}};
 assert.equal(api.isWarRtsSourceConsistentV147(forged,rules),false);
 assert.equal(api.auditWarRtsDebriefV144(forged,rules).debriefs.length,0);
});

test("V147 four V115 modes and one W133 study coexist in a Council without V85 conquest",()=>{
 const rts=rtsReceipt();
 for(const mode of ["assault","outer","stealth","rts"]){
  const ops=completed(mode),before=JSON.stringify(ops);
  const council=api.buildWarCouncilAuditV147(ops,rts,rules);
  assert.equal(council.campaignMutation,false);
  assert.equal(council.dossiers.length,2);
  assert.equal(council.issues.length,0);
  assert.ok(council.dossiers.some(p=>p.mode===mode&&p.sourceType==="V115-exercise"));
  assert.ok(council.dossiers.some(p=>p.mode==="rts"&&p.sourceType==="W133-source-study"));
  assert.ok(council.dossiers.every(p=>p.campaignMutation===false&&p.readyForCampaign===false));
  const strategic=api.createWarSimulationV85();
  const territorial=api.inspectWarSourcesV146(JSON.stringify(ops),strategic,rules);
  assert.equal(territorial.allowTerritoryMutation,false);
  assert.equal(territorial.allowCasualtyMutation,false);
  assert.ok(territorial.territories.every(t=>t.militaryLinkAuthorized===false));
  assert.equal(JSON.stringify(ops),before);
 }
});
test("V147 source validators do not claim to authenticate arbitrary client telemetry",()=>{
 const s=rtsReceipt(),d=api.buildWarCouncilAuditV147(null,s,rules).dossiers[0];
 assert.ok(d.missingEvidence.some(e=>/authenti|server|local/i.test(e)));
 assert.equal(d.readyForCampaign,false);
 assert.equal(d.campaignMutation,false);
});
