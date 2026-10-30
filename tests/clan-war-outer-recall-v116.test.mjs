import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle=await build({
  stdin:{contents:"export * from './app/game/systems/clanWarOperationsV115'; export * from './app/game/systems/clanWarBibleV6';",resolveDir:process.cwd()},
  bundle:true,write:false,platform:"node",format:"esm",target:"es2022",logLevel:"silent",
});
const api=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
function mission(){
  const state=api.createWarOperationsV115(rules),ids=[state.teams[0].id],target=rules.territories.find(t=>
    t.id!==state.baseId&&!api.warMissionEligibleV115(state,rules,t.id,ids))?.id;
  assert.ok(target);
  const opened=api.beginWarOperationV115(state,"outer",target,ids,rules,50000,"escort");
  assert.equal(opened.accepted,true,opened.message);
  return {state,live:opened.state,id:opened.state.outer[0].id,ids,target};
}
test("Outer Ops recalls require an authorized ongoing mission, not an instant team release",()=>{
  const {live,id,ids}=mission();
  const previousDue=live.outer[0].dueAt,balance=live.rav;
  assert.equal(api.recallWarOuterMissionV116(live,"MADE-UP",51000,rules).accepted,false);
  assert.equal(api.recallWarOuterMissionV116(live,id,49999,rules).accepted,false);
  assert.equal(api.recallWarOuterMissionV116(live,id,previousDue,rules).accepted,false);
  const result=api.recallWarOuterMissionV116(live,id,51000,rules);
  assert.equal(result.accepted,true,result.message);
  assert.equal(result.state.rav,balance,"used upkeep may never be refunded");
  assert.equal(result.state.assignments[ids[0]],id,"team is still in transit");
  assert.equal(result.state.outer[0].recall.orderedAt,51000);
  assert.equal(result.state.outer[0].recall.originalDueAt,previousDue);
  assert.ok(result.state.outer[0].dueAt>=61000);
  assert.notEqual(result.state.outer[0].dueAt,previousDue);
  assert.equal(result.state.reports.length,0);
  assert.equal(api.recallWarOuterMissionV116(result.state,id,52000,rules).accepted,false);
  assert.deepEqual(api.readWarOperationsV115(JSON.stringify(result.state),rules),result.state);
});
test("due recalls end exactly once as safe withdrawals without XP, wounds or territory rewards",()=>{
  const {live,id,ids,target}=mission();
  const ordered=api.recallWarOuterMissionV116(live,id,51000,rules);
  assert.equal(ordered.accepted,true);
  const before=ordered.state;
  assert.equal(api.settleWarOuterOpsV115(before,before.outer[0].dueAt-1,rules).accepted,false);
  const after=api.settleWarOuterOpsV115(before,before.outer[0].dueAt,rules);
  assert.equal(after.accepted,true);
  assert.equal(after.state.outer.length,0);
  assert.equal(after.state.assignments[ids[0]],undefined);
  assert.equal(after.state.reports.length,1);
  assert.equal(after.state.reports[0].id,id);
  assert.equal(after.state.reports[0].outcome,"retreat");
  assert.equal(after.state.reports[0].woundedIds.length,0);
  assert.ok(after.state.reports[0].engagementLog.some(x=>x.includes("retour")));
  assert.deepEqual(after.state.teams,live.teams,"recall does not create free XP or casualties");
  assert.equal(after.state.pressure[target],undefined);
  assert.equal(after.state.intelIds.includes(target),false);
  assert.equal(after.state.escortedIds.includes(target),false);
  assert.equal(after.state.rav,live.rav);
  assert.deepEqual(api.readWarOperationsV115(JSON.stringify(after.state),rules),after.state);
  assert.equal(api.settleWarOuterOpsV115(after.state,after.state.clock+100000,rules).accepted,false);
});
test("forged recall deadlines, foreign rules and impossible timestamps preserve archive protection",()=>{
  const {live,id}=mission();
  const good=api.recallWarOuterMissionV116(live,id,51000,rules).state;
  for(const mutate of [
    o=>{o.outer[0].recall.orderedAt=0;},
    o=>{o.outer[0].recall.originalDueAt=o.outer[0].startedAt;},
    o=>{o.outer[0].dueAt+=1234;},
    o=>{o.outer[0].recall.originalDueAt=Number.MAX_SAFE_INTEGER;},
    o=>{o.outer[0].recall={orderedAt:30000,originalDueAt:90000};},
    o=>{o.outer[0].recall=null;},
  ]){
    const forged=structuredClone(good);
    mutate(forged);
    assert.equal(api.readWarOperationsV115(JSON.stringify(forged),rules),null);
  }
  assert.equal(api.recallWarOuterMissionV116(good,id,51002,{...rules,metadata:{...rules.metadata,sha256:"FOREIGN"}}).accepted,false);
});
test("voluntary immediate withdrawal does not wound or level a dormant combat team",()=>{
  const {state,ids,target}=mission();
  const opened=api.beginWarOperationV115(state,"rts",target,ids,rules,120000);
  assert.equal(opened.accepted,true);
  const retreat=api.leaveWarOperationV115(opened.state,rules);
  assert.equal(retreat.accepted,true);
  assert.equal(retreat.state.reports[0].outcome,"retreat");
  assert.deepEqual(retreat.state.teams,state.teams);
  assert.equal(retreat.state.reports[0].woundedIds.length,0);
});
