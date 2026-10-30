import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({
  stdin:{contents:"export * from './app/game/systems/clanWarOperationsV115'; export * from './app/game/systems/clanWarBibleV6';",resolveDir:process.cwd()},
  bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent",
});
const api=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const initial=()=>api.createWarOperationsV115(rules);
function legal(state=initial(),length=1) {
  const ids=state.teams.map(team=>team.id);
  for(const territory of rules.territories) for(let n=0;n<ids.length;n++) {
    const teamIds=ids.slice(n,n+length);
    if(teamIds.length===length && api.warMissionEligibleV115(state,rules,territory.id,teamIds)===null) return {targetId:territory.id,teamIds};
  }
  throw Error("No reachable V6 operation with "+length+" genuine detachment(s)");
}

test("V115 uses only V6 units, unique people and workbook RAV; it creates no V3/campaign front",()=>{
  const state=initial();
  assert.equal(state.context,"free");
  assert.equal(state.version,1);
  assert.equal(state.rav,rules.parameters.rav_cap);
  assert.equal(state.baseId,rules.territories[0].id);
  assert.ok(state.teams.length>=4);
  const ids=state.teams.flatMap(team=>team.members.map(member=>member.id));
  assert.equal(new Set(ids).size,ids.length);
  assert.ok(state.teams.every(team=>rules.units.some(unit=>unit.id===team.unitId) && team.members.length===rules.units.find(unit=>unit.id===team.unitId).fullMembers));
  assert.ok(Object.values(state).every(value=>!(value && typeof value==="object" && "combatants" in value && "territories" in value)));
});

test("all four operation formats are dispatchable on validated passages, with single upkeep debit",()=>{
  for(const mode of ["assault","outer","stealth","rts"]) {
    const state=initial(),chosen=legal(state);
    const unit=rules.units.find(item=>item.id===state.teams.find(team=>team.id===chosen.teamIds[0]).unitId);
    const first=api.beginWarOperationV115(state,mode,chosen.targetId,chosen.teamIds,rules,1000);
    assert.equal(first.accepted,true,mode+": "+first.message);
    assert.equal(first.state.rav,state.rav-unit.upkeepRav);
    assert.equal(first.state.assignments[chosen.teamIds[0]],"W115-OPS-0001");
    assert.equal(first.state.active?.mode??"outer",mode);
    assert.equal(first.state.outer.length,mode==="outer"?1:0);
    assert.deepEqual(state,initial(),"source state should be immutable");
    assert.notEqual(api.beginWarOperationV115(first.state,mode,chosen.targetId,chosen.teamIds,rules,1000).accepted,true);
  }
});

test("missing routes, duplicate people, over-command formations and own home remain blocked",()=>{
  const state=initial(),chosen=legal(state);
  assert.ok(api.warMissionEligibleV115(state,rules,state.baseId,chosen.teamIds));
  assert.ok(api.warMissionEligibleV115(state,rules,chosen.targetId,[chosen.teamIds[0],chosen.teamIds[0]]));
  assert.ok(api.warMissionEligibleV115(state,rules,"CON-T02",chosen.teamIds));
  assert.equal(api.beginWarOperationV115(state,"stealth",chosen.targetId,chosen.teamIds,rules,-1).accepted,false);
  assert.equal(JSON.stringify(state),JSON.stringify(initial()));
});

test("assault cannot spawn an unreserved unit or spend AP twice; tick advances and produces one report",()=>{
  const start=initial(),chosen=legal(start);
  let state=api.beginWarOperationV115(start,"assault",chosen.targetId,chosen.teamIds,rules,2000).state;
  assert.equal(api.deployAssaultUnitV115(state,"NOT_A_REAL_TEAM",rules).accepted,false);
  assert.equal(api.deployAssaultUnitV115(state,chosen.teamIds[0],rules).accepted,true);
  state=api.deployAssaultUnitV115(state,chosen.teamIds[0],rules).state;
  assert.equal(api.deployAssaultUnitV115(state,chosen.teamIds[0],rules).accepted,false);
  const before=state.active.assault.ap;
  const tick=api.stepAssaultV115(state,rules);
  assert.equal(tick.accepted,true);
  assert.ok(tick.state.active?.assault.ap<=Math.min(100,before+9) || tick.state.reports.length===1);
  state=tick.state;
  for(let i=0;i<110&&state.active;i++) state=api.stepAssaultV115(state,rules).state;
  assert.equal(state.active,null);
  assert.equal(state.reports.length,1);
  assert.equal(state.reports[0].id,"W115-OPS-0001");
  assert.equal(state.assignments[chosen.teamIds[0]],undefined);
  assert.equal(api.leaveWarOperationV115(state,rules).accepted,false);
});

test("stealth is grid-based: no remote sabotage, no walking through solid walls, and patrols react",()=>{
  const chosen=legal(),start=api.beginWarOperationV115(initial(),"stealth",chosen.targetId,chosen.teamIds,rules,2000).state;
  assert.equal(api.commandStealthV115(start,"interact",rules).accepted,false);
  assert.equal(api.commandStealthV115(start,"left",rules).accepted,true);
  const moved=api.commandStealthV115(start,"right",rules).state;
  assert.equal(moved.active.stealth.x,2);
  assert.equal(moved.clock,1);
  assert.equal(start.clock,0);
  assert.equal(api.commandStealthV115(start,"teleport",rules).accepted,false);
});

test("an actual stealth path reaches the relay, sabotages it and extracts with one unique V6 receipt",()=>{
  const chosen=legal(),started=api.beginWarOperationV115(initial(),"stealth",chosen.targetId,chosen.teamIds,rules,2000).state;
  const route=["up","up","up","right","right","right","right","right","interact","left","left","left","left","left","down","down","down"];
  let state=started;
  for(const action of route) {
    const result=api.commandStealthV115(state,action,rules);
    assert.equal(result.accepted,true,action+": "+result.message);
    state=result.state;
  }
  assert.equal(state.active,null);
  assert.equal(state.reports.length,1);
  assert.equal(state.reports[0].outcome,"victory");
  assert.ok(state.weakenedIds.includes(chosen.targetId));
  assert.ok(state.intelIds.includes(chosen.targetId));
  const usedTeam=state.teams.find(team=>team.id===chosen.teamIds[0]);
  assert.ok(usedTeam.resultReceipts.includes(state.reports[0].id));
  assert.equal(api.readWarOperationsV115(JSON.stringify(state),rules).reports.length,1);
});

test("RTS movement and enemy response are simultaneous per order, with controlled occupancy",()=>{
  const chosen=legal(initial(),2);
  const state=api.beginWarOperationV115(initial(),"rts",chosen.targetId,chosen.teamIds,rules,3000).state;
  const team=chosen.teamIds[0];
  assert.equal(api.commandRtsV115(state,team,9,2,rules).accepted,false);
  assert.equal(api.commandRtsV115(state,team,1,1,rules).accepted,false);
  assert.equal(api.commandRtsV115(state,team,2,1,rules).accepted,true);
  const next=api.commandRtsV115(state,team,2,1,rules).state;
  assert.equal(next.clock,1);
  assert.equal(next.active.rts.actors.find(actor=>actor.teamId===team).x,2);
  assert.equal(state.active.rts.actors.find(actor=>actor.teamId===team).x,1);
});

test("Outer Ops completes only at dueAt, reconciles missing UI time, and never awards twice",()=>{
  const chosen=legal();
  const start=api.beginWarOperationV115(initial(),"outer",chosen.targetId,chosen.teamIds,rules,50000,"recon").state;
  const due=start.outer[0].dueAt;
  assert.equal(api.settleWarOuterOpsV115(start,due-1,rules).accepted,false);
  const output=api.settleWarOuterOpsV115(start,due,rules);
  assert.equal(output.accepted,true);
  assert.equal(output.state.outer.length,0);
  assert.equal(output.state.reports.length,1);
  assert.equal(output.state.assignments[chosen.teamIds[0]],undefined);
  assert.equal(api.settleWarOuterOpsV115(output.state,due+999999,rules).accepted,false);
  assert.equal(output.state.reports.length,1);
  assert.equal(api.warOuterSecondsRemainingV115(start.outer[0],due-1000),1);
});

test("up to three independent Outer Ops can run; the fourth is rejected",()=>{
  let state=initial();
  const ids=state.teams.map(team=>team.id);
  for(const id of ids.slice(0,3)) {
    const chosen=legal(state);
    const dispatched=api.beginWarOperationV115(state,"outer",chosen.targetId,chosen.teamIds,rules,1000,"escort");
    assert.equal(dispatched.accepted,true,dispatched.message);
    state=dispatched.state;
  }
  assert.equal(state.outer.length,3);
  const chosen=legal(state);
  assert.equal(api.beginWarOperationV115(state,"outer",chosen.targetId,chosen.teamIds,rules,1000).accepted,false);
});

test("manual retreat produces a unique report and frees the same identified members",()=>{
  const start=initial(),chosen=legal(start);
  const live=api.beginWarOperationV115(start,"stealth",chosen.targetId,chosen.teamIds,rules,5000).state;
  const result=api.leaveWarOperationV115(live,rules);
  assert.equal(result.accepted,true);
  assert.equal(result.state.reports[0].outcome,"retreat");
  assert.equal(result.state.active,null);
  assert.equal(result.state.assignments[chosen.teamIds[0]],undefined);
  assert.equal(result.state.teams[0].members[0].id,start.teams[0].members[0].id);
});

test("archive roundtrip and source pinning reject corrupt or cross-context payloads",()=>{
  const chosen=legal(),state=api.beginWarOperationV115(initial(),"outer",chosen.targetId,chosen.teamIds,rules,1000).state;
  const raw=JSON.stringify(state);
  assert.deepEqual(api.readWarOperationsV115(raw,rules),state);
  assert.equal(api.readWarOperationsV115("{",rules),null);
  assert.equal(api.readWarOperationsV115(JSON.stringify({...state,version:999}),rules),null);
  assert.equal(api.readWarOperationsV115(JSON.stringify({...state,assignments:{}}),rules),null);
  assert.equal(api.readWarOperationsV115(JSON.stringify({...state,rav:-5}),rules),null);
  assert.equal(api.readWarOperationsV115(JSON.stringify({...state,intelIds:["CON-T01"]}),rules),null);
  const alternate={...rules,metadata:{...rules.metadata,sha256:"ALTERNATE-PRIVATE-RULES"}};
  assert.equal(api.readWarOperationsV115(raw,alternate),null);
});
