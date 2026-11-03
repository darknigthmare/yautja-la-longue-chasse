import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
import {readFileSync} from "node:fs";

const built=await build({stdin:{contents:[
  "export * from './app/game/systems/clanWarOperationsV115';",
  "export * from './app/game/systems/clanWarBibleV6';",
].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
 platform:"node",format:"esm",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+
 Buffer.from(built.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;

function setup(count=1){
 const created=api.createWarOperationsV115(rules);
 const sourceMedic=rules.units.find(unit=>unit.id==="W3-U18");
 assert.ok(sourceMedic?.fullMembers>0);
 const teams=created.teams.map((team,index)=>index>=1&&index<=count?
  {...team,members:team.members.map((member,i)=>i===0?{...member,status:"wounded"}:member)}:team);
 const medics=Array.from({length:count},(_,i)=>{
  const team=api.createWarTeamV6("W3-U18","W115-MEDIC-V151-"+(i+1),rules);
  assert.ok(team);
  return team;
 });
 return {...created,teams:[...teams,...medics]};
}
function paidTreatment(state,number,when){
 const team=state.teams[number];
 const medic=state.teams.find(s=>s.id==="W115-MEDIC-V151-"+number);
 assert.ok(team&&medic);
 const result=api.queueWarTreatmentV116(state,team.id,team.members[0].id,medic.id,when,rules);
 assert.equal(result.accepted,true,result.message);
 return result.state;
}
function readyThreeTypes(){
 let state=paidTreatment(setup(),1,1000);
 const missionTeam=state.teams[0].id;
 const territory=rules.territories.find(t=>t.id!==state.baseId&&
  api.warMissionEligibleV115(state,rules,t.id,[missionTeam])===null);
 assert.ok(territory,"the V6 route must exist");
 const opened=api.beginWarOperationV115(state,"outer",territory.id,[missionTeam],rules,2000,"recon");
 assert.equal(opened.accepted,true,opened.message);
 state=opened.state;
 const candidate=rules.units.filter(u=>u.fullMembers>0&&u.recruitmentRav<=state.rav)
   .sort((a,b)=>a.recruitmentRav-b.recruitmentRav)[0];
 assert.ok(candidate);
 const recruited=api.queueWarRecruitmentV115(state,candidate.id,3000,rules);
 assert.equal(recruited.accepted,true,recruited.message);
 return recruited.state;
}

test("V151 groups a real delegated report, recruit and paid wound treatment into one V115 archive",()=>{
 const state=readyThreeTypes();
 assert.equal(state.outer.length,1);
 assert.equal(state.pendingRecruits.length,1);
 assert.equal(state.pendingTreatments.length,1);
 assert.ok(api.readWarOperationsV115(JSON.stringify(state),rules));
 const original=JSON.stringify(state),ravBefore=state.rav;
 const care=state.pendingTreatments[0],recruit=state.pendingRecruits[0];
 const stamp=Math.max(state.outer[0].dueAt,care.dueAt,recruit.dueAt)+1;
 const combined=api.settleWarDueEventsV151(state,stamp,rules);
 assert.equal(combined.accepted,true,combined.message);
 const outer=api.settleWarOuterOpsV115(state,stamp,rules);
 const arrivals=api.settleWarRecruitmentsV115(outer.state,stamp,rules);
 const heal=api.settleWarTreatmentsV116(arrivals.state,stamp,rules);
 assert.equal(outer.accepted,true);
 assert.equal(arrivals.accepted,true);
 assert.equal(heal.accepted,true);
 assert.deepEqual(combined.state,heal.state,"no lost result or extra tick versus source V6 actions");
 assert.equal(combined.state.rav,ravBefore,"no second RAV debit when deadlines settle");
 assert.equal(combined.state.outer.length,0);
 assert.equal(combined.state.pendingRecruits.length,0);
 assert.equal(combined.state.pendingTreatments.length,0);
 assert.equal(combined.state.reports.length,1);
 assert.ok(combined.state.recruitedTeamIds.includes(recruit.teamId));
 assert.deepEqual(combined.state.treatmentReceipts,[care.id]);
 assert.equal(combined.state.teams.find(t=>t.id===care.teamId).members[0].status,"fit");
 assert.ok(api.readWarOperationsV115(JSON.stringify(combined.state),rules),
  "the grouped result must survive a real V115 archive round-trip");
 assert.equal(api.settleWarDueEventsV151(combined.state,stamp,rules).accepted,false);
 assert.equal(JSON.stringify(state),original,"the caller's input remains unchanged");
});

test("V151 resolves two independent field-medic orders once, without resurrecting anyone or duplicating personnel",()=>{
 let state=setup(2);
 state=paidTreatment(state,1,1000);
 state=paidTreatment(state,2,1000);
 const paidRav=state.rav;
 const memberIds=state.teams.flatMap(t=>t.members.map(m=>m.id));
 assert.equal(new Set(memberIds).size,memberIds.length);
 assert.ok(api.readWarOperationsV115(JSON.stringify(state),rules));
 const before=api.settleWarDueEventsV151(state,45999,rules);
 assert.equal(before.accepted,false);
 assert.strictEqual(before.state,state);
 const done=api.settleWarDueEventsV151(state,46000,rules);
 assert.equal(done.accepted,true,done.message);
 assert.equal(done.state.pendingTreatments.length,0);
 assert.equal(done.state.treatmentReceipts.length,2);
 assert.equal(new Set(done.state.treatmentReceipts).size,2);
 assert.equal(done.state.clock,state.clock+2);
 assert.equal(done.state.rav,paidRav);
 for(const patient of state.teams.slice(1,3)){
  const cured=done.state.teams.find(t=>t.id===patient.id);
  assert.equal(cured.members[0].id,patient.members[0].id);
  assert.equal(cured.members[0].xp,patient.members[0].xp);
  assert.equal(cured.members[0].status,"fit");
  assert.equal(done.state.assignments[patient.id],undefined);
 }
 assert.equal(done.state.teams.length,state.teams.length);
 assert.ok(api.readWarOperationsV115(JSON.stringify(done.state),rules));
 assert.equal(api.settleWarDueEventsV151(done.state,46001,rules).accepted,false);
});

test("V151 refuses a stale or malformed treatment without partially settling other source reports",()=>{
 const state=readyThreeTypes();
 const due=Math.max(...[...state.outer,...state.pendingRecruits,...state.pendingTreatments].map(o=>o.dueAt))+1;
 for(const candidate of [
  {...state,sourceSha:"not-V6"},
  {...state,assignments:{...state.assignments,[state.pendingTreatments[0].medicTeamId]:"foreign"}},
 ]){
  const original=JSON.stringify(candidate);
  const invalid=api.settleWarDueEventsV151(candidate,due,rules);
  assert.equal(invalid.accepted,false);
  assert.strictEqual(invalid.state,candidate,"a rejected transaction must not apply partial settlement");
  assert.equal(JSON.stringify(candidate),original);
 }
 for(const now of [-1,1.5,NaN]){
  assert.equal(api.settleWarDueEventsV151(state,now,rules).accepted,false);
 }
});

test("V151 UI schedules just one locked update for all due categories while manual Outer Ops remains intact",()=>{
 const panel=readFileSync("app/game/ClanWarOperationsV115.tsx","utf8");
 assert.match(panel,/if\(anyDue\)commit\(settleWarDueEventsV151\(state,stamp,rules\)\)/);
 assert.match(panel,/pendingTreatments\?\?\[\]/);
 assert.match(panel,/pendingRecruits\?\?\[\]/);
 assert.match(panel,/commit\(settleWarOuterOpsV115\(worldRef\.current,Date\.now\(\),rules\)\)/);
 assert.match(panel,/navigator\.locks\.request/);
});
