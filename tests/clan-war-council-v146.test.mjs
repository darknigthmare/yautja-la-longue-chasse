import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const built=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarCouncilAuditV146';",
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarRtsSquadsV133';",
 "export * from './app/game/systems/clanWarBibleV6';",
 "export * from './app/game/systems/clanWarRtsSourceMissionsV129';",
].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
 format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+
 Buffer.from(built.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
function operation(mode){
 const original=api.createWarOperationsV115(rules);
 const team=original.teams[0].id;
 const t=rules.territories.find(t=>t.id!==original.baseId&&
  !api.warMissionEligibleV115(original,rules,t.id,[team]));
 assert.ok(t,"A real reachable V6 target must exist");
 const opened=api.beginWarOperationV115(original,mode,t.id,[team],rules,1000);
 assert.equal(opened.accepted,true,opened.message);
 return opened.state;
}
function completed(mode){
 const s=operation(mode);
 if(mode==="outer"){
  const order=s.outer[0];assert.ok(order);
  const final=api.settleWarOuterOpsV115(s,order.dueAt,rules);
  assert.equal(final.accepted,true,final.message);
  return final.state;
 }
 const closed=api.leaveWarOperationV115(s,rules);
 assert.equal(closed.accepted,true,closed.message);
 return closed.state;
}
function w3Receipt(){
 const loaded=api.createWarRtsSquadsV133("W3-RTS01",rules);
 const launched=api.launchWarRtsSquadsV133(loaded);
 assert.equal(launched.accepted,true,launched.message);
 const s=launched.state,actor=s.squads[0];
 const positioned={...s,squads:s.squads.map(u=>u.id===actor.id?
  {...u,x:s.map.extraction.x,y:s.map.extraction.y}:u)};
 const retreat=api.commandWarRtsSquadsV133(positioned,{kind:"retreat",squadId:actor.id});
 assert.equal(retreat.accepted,true,retreat.message);
 return retreat.state;
}
test("Council V146: no speculative dossier before any of the four modes has finished",()=>{
 const openAssault=operation("assault");
 const openOuter=operation("outer");
 const activeRts=api.launchWarRtsSquadsV133(
  api.createWarRtsSquadsV133("W3-RTS01",rules)).state;
 for(const ops of [openAssault,openOuter]){
  const audit=api.buildWarCouncilAuditV146(ops,activeRts,rules);
  assert.equal(audit.total,0);
  assert.equal(audit.campaignMutation,false);
  assert.deepEqual(audit.issues,[]);
  assert.deepEqual(audit.byMode,{assault:0,outer:0,stealth:0,rts:0});
 }
});
for(const mode of ["assault","outer","stealth","rts"]){
 test("Council V146: completed V115 "+mode+" yields one traceable, non-conquering audit dossier",()=>{
  const s=completed(mode);
  assert.equal(s.reports.length,1);
  assert.ok(api.readWarOperationsV115(JSON.stringify(s),rules));
  const audit=api.buildWarCouncilAuditV146(s,null,rules);
  assert.equal(audit.total,1);
  assert.equal(audit.issues.length,0);
  assert.equal(audit.byMode[mode],1);
  const d=audit.dossiers[0];
  assert.equal(d.mode,mode);
  assert.equal(d.operationId,s.reports[0].id);
  assert.equal(d.sourceSha,rules.metadata.sha256);
  assert.equal(d.sourceType,"V115-exercise");
  assert.deepEqual(d.sourceIds,s.reports[0].sourceIds);
  assert.equal(d.targetId,s.reports[0].targetId);
  assert.equal(d.teamIds.length,1);
  assert.equal(d.unitIds.length,1);
  assert.equal(d.readyForCampaign,false);
  assert.equal(d.campaignMutation,false);
  assert.equal(d.status,"partial-evidence");
  assert.ok(d.missingEvidence.length>=2,"do not fabricate missing evidence");
  assert.equal(d.routePassageIds,null,
   "V115 report must not claim a full route that was not archived");
  assert.equal(s.reports.length,1,"audit is read-only");
 });
}
test("Council V146: completed W3 RTS receipt carries actual source-map, unit and task evidence",()=>{
 const done=w3Receipt();
 assert.equal(done.phase,"retreat");
 const audit=api.buildWarCouncilAuditV146(null,done,rules);
 assert.equal(audit.total,1);
 assert.equal(audit.issues.length,0);
 assert.equal(audit.byMode.rts,1);
 const d=audit.dossiers[0];
 assert.equal(d.id,"W133:"+done.report.id);
 assert.equal(d.targetId,done.mission.id);
 assert.equal(d.planetId,done.map.planetId);
 assert.equal(d.sourceType,"W133-source-study");
 assert.equal(d.remainingRav,done.ravRemaining);
 assert.deepEqual(d.sourceIds,done.report.sourceCells);
 assert.deepEqual(d.completedTaskIds,done.report.completedTaskIds);
 assert.deepEqual(d.teamIds,done.squads.map(s=>s.id));
 assert.deepEqual(d.casualtyIds,done.report.downSquadIds);
 assert.equal(d.escortExtracted,Boolean(done.tracked?.extracted));
 assert.equal(d.readyForCampaign,false);
 assert.equal(d.campaignMutation,false);
});
test("Council V146: a V115 and standalone W3 result coexist without duplicate ID or overwriting V85",()=>{
 const ops=completed("outer"),rts=w3Receipt();
 const original=JSON.stringify(ops)+JSON.stringify(rts);
 const audit=api.buildWarCouncilAuditV146(ops,rts,rules);
 assert.equal(audit.total,2);
 assert.equal(audit.byMode.outer,1);
 assert.equal(audit.byMode.rts,1);
 assert.equal(new Set(audit.dossiers.map(d=>d.id)).size,2);
 assert.ok(audit.dossiers.every(d=>!d.campaignMutation&&!d.readyForCampaign));
 assert.equal(JSON.stringify(ops)+JSON.stringify(rts),original);
});
test("Council V146: forged V115 source, missing team or duplicate report never becomes evidence",()=>{
 const ops=completed("stealth");
 const badSource={...ops,sourceSha:"other-sha"};
 const invalid=api.buildWarCouncilAuditV146(badSource,null,rules);
 assert.equal(invalid.total,0);assert.ok(invalid.issues.length);
 const duplicated={...ops,reports:[ops.reports[0],ops.reports[0]]};
 assert.equal(api.buildWarCouncilAuditV146(duplicated,null,rules).total,0);
 const noUnit={...ops,reports:[{...ops.reports[0],teamIds:["foreign-unit"]}]};
 assert.equal(api.buildWarCouncilAuditV146(noUnit,null,rules).total,0);
});
test("Council V146: forged W3 receipt identity, map, RAV or completed tasks is rejected",()=>{
 const done=w3Receipt();
 const bad=[
  {...done,sourceSha:"different"},
  {...done,report:{...done.report,mapId:"W3-MAP-FAKE"}},
  {...done,report:{...done.report,remainingRav:done.report.remainingRav+1}},
  {...done,report:{...done.report,completedTaskIds:["fake-target"]}},
  {...done,report:{...done.report,sourceCells:["FAKE-PROOF"]}},
  {...done,report:{...done.report,campaignMutation:true}},
  {...done,report:{...done.report,downSquadIds:["NOT-A-SQUAD"]}},
 ];
 for(const candidate of bad){
  const audit=api.buildWarCouncilAuditV146(null,candidate,rules);
  assert.equal(audit.total,0);
  assert.ok(audit.issues.length>=1);
 }
});
test("Council V146: 24 source mission scripts and neutral escort provenance remain immutable",()=>{
 const audit=api.auditWarRtsSquadsV133(rules);
 assert.equal(audit.missions,24);
 assert.equal(audit.steps,72);
 assert.deepEqual(audit.issues,[]);
 const state=api.createWarOperationsV115(rules);
 assert.equal(state.context,"free");
 assert.equal(state.reports.length,0);
});
