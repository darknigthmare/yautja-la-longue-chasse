import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle=await build({
  stdin:{contents:"export * from './app/game/systems/clanWarOperationsV115'; export * from './app/game/systems/clanWarBibleV6';",resolveDir:process.cwd()},
  bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent",
});
const api=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const create=()=>api.createWarOperationsV115(rules);

function woundedState(){
  const start=create(),team=start.teams[0],target=rules.territories.find(item=>item.id!==start.baseId&&
    !api.warMissionEligibleV115(start,rules,item.id,[team.id]));
  assert.ok(target,"requires a real connected V6 passage");
  const mission=api.beginWarOperationV115(start,"stealth",target.id,[team.id],rules,1000);
  assert.equal(mission.accepted,true,mission.message);
  const retreat=api.leaveWarOperationV115(mission.state,rules);
  assert.equal(retreat.accepted,true);
  const person=retreat.state.teams[0].members.find(item=>item.status==="wounded");
  assert.ok(person);
  return {state:retreat.state,teamId:team.id,personId:person.id};
}
function medicState(){
  const {state,teamId,personId}=woundedState();
  const queue=api.queueWarRecruitmentV115(state,"W3-U18",2000,rules);
  assert.equal(queue.accepted,true,queue.message);
  const due=queue.state.pendingRecruits[0].dueAt;
  const result=api.settleWarRecruitmentsV115(queue.state,due,rules);
  assert.equal(result.accepted,true);
  const medic=result.state.teams.find(item=>item.unitId==="W3-U18");
  assert.ok(medic);
  return {state:result.state,teamId,personId,medicId:medic.id};
}

test("wounded exercise members cannot heal without a recruited source W3-U18 medic",()=>{
  const {state,teamId,personId}=woundedState();
  const invalid=api.queueWarTreatmentV116(state,teamId,personId,state.teams[1].id,9000,rules);
  assert.equal(invalid.accepted,false);
  assert.equal(invalid.state,state);
  assert.equal(state.teams[0].members.find(person=>person.id===personId).status,"wounded");
});

test("care reserves the real patient team and paid medic; due date is not immediate",()=>{
  const {state,teamId,personId,medicId}=medicState();
  const cost=rules.units.find(unit=>unit.id==="W3-U18").upkeepRav;
  const treatment=api.queueWarTreatmentV116(state,teamId,personId,medicId,50000,rules);
  assert.equal(treatment.accepted,true,treatment.message);
  assert.equal(treatment.state.rav,state.rav-cost);
  const order=treatment.state.pendingTreatments[0];
  assert.equal(order.paidRav,cost);
  assert.equal(order.dueAt-order.startedAt,45000);
  assert.equal(treatment.state.assignments[teamId],order.id);
  assert.equal(treatment.state.assignments[medicId],order.id);
  assert.equal(api.warMissionEligibleV115(treatment.state,rules,rules.territories[1].id,[medicId])!==null,true);
  assert.equal(api.queueWarTreatmentV116(treatment.state,teamId,personId,medicId,50001,rules).accepted,false);
  assert.equal(api.settleWarTreatmentsV116(treatment.state,order.dueAt-1,rules).accepted,false);
  const recovered=api.settleWarTreatmentsV116(treatment.state,order.dueAt,rules);
  assert.equal(recovered.accepted,true,recovered.message);
  assert.equal(recovered.state.teams.find(team=>team.id===teamId).members.find(person=>person.id===personId).status,"fit");
  assert.equal(recovered.state.assignments[teamId],undefined);
  assert.equal(recovered.state.assignments[medicId],undefined);
  assert.deepEqual(recovered.state.treatmentReceipts,[order.id]);
  assert.equal(recovered.state.pendingTreatments.length,0);
  assert.equal(api.settleWarTreatmentsV116(recovered.state,order.dueAt+1000,rules).accepted,false);
  assert.deepEqual(api.readWarOperationsV115(JSON.stringify(recovered.state),rules),recovered.state);
});

test("abort does not refund supplies or invent recovery, and never harms another team",()=>{
  const {state,teamId,personId,medicId}=medicState();
  const treatment=api.queueWarTreatmentV116(state,teamId,personId,medicId,60000,rules).state;
  const id=treatment.pendingTreatments[0].id;
  const cancelled=api.cancelWarTreatmentV116(treatment,id);
  assert.equal(cancelled.accepted,true);
  assert.equal(cancelled.state.rav,treatment.rav);
  assert.equal(cancelled.state.teams.find(team=>team.id===teamId).members.find(person=>person.id===personId).status,"wounded");
  assert.equal(cancelled.state.assignments[teamId],undefined);
  assert.equal(cancelled.state.assignments[medicId],undefined);
  assert.equal(api.cancelWarTreatmentV116(cancelled.state,id).accepted,false);
});

test("corrupt care archives and forged early recovery dates preserve the archive",()=>{
  const {state,teamId,personId,medicId}=medicState();
  const care=api.queueWarTreatmentV116(state,teamId,personId,medicId,50000,rules).state;
  const raw=JSON.stringify(care);
  assert.deepEqual(api.readWarOperationsV115(raw,rules),care);
  const forged=structuredClone(care);
  forged.pendingTreatments[0].dueAt-=44000;
  assert.equal(api.readWarOperationsV115(JSON.stringify(forged),rules),null);
  const duplicate=structuredClone(care);
  duplicate.pendingTreatments.push({...duplicate.pendingTreatments[0]});
  assert.equal(api.readWarOperationsV115(JSON.stringify(duplicate),rules),null);
  const missing=structuredClone(care);
  delete missing.assignments[medicId];
  assert.equal(api.readWarOperationsV115(JSON.stringify(missing),rules),null);
  const fabricated=structuredClone(care);
  fabricated.teams.find(team=>team.id===teamId).members.find(person=>person.id===personId).status="fit";
  assert.equal(api.readWarOperationsV115(JSON.stringify(fabricated),rules),null);
  assert.equal(api.readWarOperationsV115(raw,rules).teams.find(team=>team.id===teamId).members.find(person=>person.id===personId).status,"wounded");
});
