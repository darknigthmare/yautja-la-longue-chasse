import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const names=["clanWarOperationsV115","clanWarParallelModesV138","clanWarParallelModesV137",
 "clanWarOuterInspectionV144","clanWarOuterPaceV144","clanWarOuterRerouteV144","clanWarOuterIncidentV143","clanWarOuterChoicesV142",
 "clanWarOuterWeightedProgressV141","clanWarTravelLedgerV145","clanWarBibleV6"];
const built=await build({stdin:{contents:names.map(n=>"export * from './app/game/systems/"+n+"';").join("\n"),resolveDir:process.cwd()},
 bundle:true,write:false,platform:"node",format:"esm",target:"es2022"});
const api=await import("data:text/javascript;base64,"+Buffer.from(built.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
function open(){
 const initial=api.createWarOperationsV115(rules),team=initial.teams[0];
 const site=rules.territories.find(t=>t.id!==initial.baseId&&!api.warMissionEligibleV115(initial,rules,t.id,[team.id]));
 assert.ok(site);
 const launch=api.beginWarOperationV115(initial,"outer",site.id,[team.id],rules,1000);
 assert.equal(launch.accepted,true,launch.message);return launch.state;
}
test("signal and late recall remain readable with original outbound deadline",()=>{
 const s=open(),o=s.outer[0],span=o.dueAt-o.startedAt;
 const signal=api.requestWarOuterSignalV138(s,o.id,o.startedAt+Math.ceil(span*.52),rules);
 assert.equal(signal.accepted,true,signal.message);
 const recall=api.recallWarOuterMissionV116(signal.state,o.id,o.startedAt+Math.floor(span*.90),rules);
 assert.equal(recall.accepted,true,recall.message);
 assert.deepEqual(api.readWarOperationsV115(JSON.stringify(recall.state),rules),recall.state);
 const falseSignal={...recall.state,outer:[{...recall.state.outer[0],fieldSignal:{
  ...recall.state.outer[0].fieldSignal,transmittedAt:recall.state.outer[0].recall.orderedAt+1}}]};
 assert.equal(api.readWarOperationsV115(JSON.stringify(falseSignal),rules),null);
 assert.equal(api.settleWarOuterOpsV115(recall.state,recall.state.outer[0].dueAt,rules).accepted,true);
});
test("late recall retains valid signal after forced pace, halt and incident detour",()=>{
 for(const variant of ["pace","halt","incident"]){
  const initial=open(),order=initial.outer[0],at=order.startedAt+100;
  const changed=variant==="pace"?api.commandWarOuterPaceV144(initial,order.id,at,rules):
   variant==="halt"?api.orderWarOuterReconHaltV137(initial,order.id,at,rules):
   api.commandWarOuterIncidentV143(initial,order.id,"detour",at,rules);
  assert.equal(changed.accepted,true,variant+": "+changed.message);
  const o=changed.state.outer[0],duration=o.dueAt-o.startedAt;
  const signal=api.requestWarOuterSignalV138(changed.state,o.id,o.startedAt+Math.ceil(duration*.70),rules);
  assert.equal(signal.accepted,true,variant+": "+signal.message);
  const recalled=api.recallWarOuterMissionV116(signal.state,o.id,o.startedAt+Math.floor(duration*.9),rules);
  assert.equal(recalled.accepted,true,variant+": "+recalled.message);
  assert.deepEqual(api.readWarOperationsV115(JSON.stringify(recalled.state),rules),recalled.state,variant);
 }
});
test("inspect actual public source passage once, pay one RAV, preserve team and defer benefit",()=>{
 const s=open(),o=s.outer[0],time=o.startedAt+5000;
 const original=api.simulateWarOuterMissionV115(s,o,rules);
 const progress=api.warOuterWeightedProgressV141(o,time,rules);
 const result=api.inspectWarOuterPassageV144(s,o.id,time,rules);
 assert.equal(result.accepted,true,result.message);
 const changed=result.state.outer[0],source=rules.passages.find(p=>p.id===progress.currentPassageId);
 assert.equal(result.state.rav,s.rav-1);assert.equal(changed.passageCheck.passageId,source.id);
 assert.equal(changed.passageCheck.sourceCondition,String(source.condition??"").slice(0,240));
 assert.deepEqual(changed.teamIds,o.teamIds);assert.equal(changed.dueAt,o.dueAt);
 assert.equal(result.state.reports.length,0);
 assert.equal(api.simulateWarOuterMissionV115(result.state,changed,rules).strength,original.strength+2);
 assert.equal(api.inspectWarOuterPassageV144(result.state,o.id,time+1,rules).accepted,false);
 assert.equal(api.commandWarOuterRerouteV144(result.state,o.id,o.routeIds,time+1,rules).accepted,false);
 assert.equal(api.settleWarOuterOpsV115(result.state,o.dueAt-1,rules).accepted,false);
 assert.deepEqual(api.readWarOperationsV115(JSON.stringify(result.state),rules),result.state);
 const recall=api.recallWarOuterMissionV116(result.state,o.id,time,rules);
 assert.equal(recall.accepted,true,recall.message);
 assert.deepEqual(api.readWarOperationsV115(JSON.stringify(recall.state),rules),recall.state);
 assert.equal(api.settleWarOuterOpsV115(recall.state,recall.state.outer[0].dueAt,rules).accepted,true);
});
test("new inspections refuse a paused convoi and can resume on same passage after pause",()=>{
 const s=open(),o=s.outer[0],at=o.startedAt+100;
 const halted=api.orderWarOuterReconHaltV137(s,o.id,at,rules);
 assert.equal(halted.accepted,true,halted.message);
 assert.equal(api.warOuterTravelLedgerV145(halted.state.outer[0],at+1,rules).workable,false);
 const blocked=api.inspectWarOuterPassageV144(halted.state,o.id,at+1,rules);
 assert.equal(blocked.accepted,false);assert.equal(blocked.state,halted.state);
 const resumed=api.inspectWarOuterPassageV144(halted.state,o.id,at+15000,rules);
 assert.equal(resumed.accepted,true,resumed.message);
 assert.deepEqual(api.readWarOperationsV115(JSON.stringify(resumed.state),rules),resumed.state);
});
test("inspection and forced pace coexist without moving passage instantly or losing save",()=>{
 const s=open(),o=s.outer[0],at=o.startedAt+1000;
 const accelerated=api.commandWarOuterPaceV144(s,o.id,at,rules);
 assert.equal(accelerated.accepted,true,accelerated.message);
 const inspected=api.inspectWarOuterPassageV144(accelerated.state,o.id,at+1,rules);
 assert.equal(inspected.accepted,true,inspected.message);
 assert.equal(inspected.state.rav,s.rav-4);
 assert.deepEqual(api.readWarOperationsV115(JSON.stringify(inspected.state),rules),inspected.state);
});
test("new inspection is blocked throughout a real passage detour",()=>{
 const s=open(),o=s.outer[0],at=o.startedAt+100;
 const detour=api.commandWarOuterIncidentV143(s,o.id,"detour",at,rules);
 assert.equal(detour.accepted,true,detour.message);
 assert.equal(api.inspectWarOuterPassageV144(detour.state,o.id,at+5000,rules).accepted,false);
 const after=api.inspectWarOuterPassageV144(detour.state,o.id,at+10000,rules);
 assert.equal(after.accepted,true,after.message);
 assert.deepEqual(api.readWarOperationsV115(JSON.stringify(after.state),rules),after.state);
});
test("bulletin, inspected passage and late recall survive a complete save roundtrip",()=>{
 const s=open(),o=s.outer[0],span=o.dueAt-o.startedAt,at=o.startedAt+Math.ceil(span*.52);
 const signal=api.requestWarOuterSignalV138(s,o.id,at,rules);assert.equal(signal.accepted,true,signal.message);
 const inspected=api.inspectWarOuterPassageV144(signal.state,o.id,at,rules);assert.equal(inspected.accepted,true,inspected.message);
 const recalled=api.recallWarOuterMissionV116(inspected.state,o.id,o.startedAt+Math.floor(span*.9),rules);
 assert.equal(recalled.accepted,true,recalled.message);
 assert.deepEqual(api.readWarOperationsV115(JSON.stringify(recalled.state),rules),recalled.state);
});
test("real PR55 runtime archives, including prior inspection while halted, remain readable",()=>{
 const dir="tests/fixtures/outer-inspection-pr55/";
 const metadata=JSON.parse(readFileSync(dir+"provenance.json","utf8"));
 for(const [name,sha] of [["outer-pr55-inspected.json",metadata.inspectedSha256],
  ["outer-pr55-inspected-recall.json",metadata.recalledSha256],
  ["outer-pr55-inspected-during-halt.json",metadata.inspectedDuringHaltSha256]]){
  const data=readFileSync(dir+name);
  assert.equal(createHash("sha256").update(data).digest("hex"),sha);
  const source=JSON.parse(data),loaded=api.readWarOperationsV115(data.toString(),rules);
  assert.deepEqual(loaded,source,name);
  assert.equal(loaded.outer[0].passageCheck.paidRav,1);
 }
});
test("falsified inspection cannot become saved public source evidence",()=>{
 const s=open(),o=s.outer[0],done=api.inspectWarOuterPassageV144(s,o.id,o.startedAt+100,rules);
 assert.equal(done.accepted,true,done.message);
 for(const patch of [{paidRav:0},{sourceCondition:"inventé"},{passageId:"inventé"},
  {checkedAt:o.startedAt},{checkedAt:o.dueAt}]){
  const fake={...done.state,outer:[{...done.state.outer[0],passageCheck:{...done.state.outer[0].passageCheck,...patch}}]};
  assert.equal(api.readWarOperationsV115(JSON.stringify(fake),rules),null);
 }
});
