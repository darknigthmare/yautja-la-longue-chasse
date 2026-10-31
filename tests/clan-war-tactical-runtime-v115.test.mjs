import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

const bundle=await build({stdin:{contents:"export * from './app/game/systems/clanWarOperationsV115'; export * from './app/game/systems/clanWarBibleV6';",resolveDir:process.cwd()},bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const war=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const bible=war.DEFAULT_WAR_RULES_V6;
const base=()=>war.createWarOperationsV115(bible);
function routeFor(state,ids){
  const territory=bible.territories.find(site=>site.id!==state.baseId&&!war.warMissionEligibleV115(state,bible,site.id,ids));
  assert.ok(territory,"no traversable source V6 passage found");
  return territory.id;
}
test("Outer Ops has repeatable three-stage, source-visible exchanges; settling twice is impossible",()=>{
  const state=base(),teams=[state.teams[0].id],target=routeFor(state,teams);
  const launch=war.beginWarOperationV115(state,"outer",target,teams,bible,15000,"intercept");
  assert.equal(launch.accepted,true);
  const order=launch.state.outer[0];
  const first=war.simulateWarOuterMissionV115(launch.state,order,bible);
  const repeated=war.simulateWarOuterMissionV115(launch.state,order,bible);
  assert.deepEqual(first,repeated);
  assert.equal(first.engagementLog.length,order.departureContext?7:6);
  assert.ok(first.engagementLog.some(line=>line.includes("Échange 3/3")));
  const before=war.settleWarOuterOpsV115(launch.state,order.dueAt-1,bible);
  assert.equal(before.accepted,false);
  const settled=war.settleWarOuterOpsV115(launch.state,order.dueAt,bible);
  assert.equal(settled.accepted,true);
  assert.equal(settled.state.reports.length,1);
  assert.deepEqual(settled.state.reports[0].engagementLog,first.engagementLog);
  assert.equal(war.settleWarOuterOpsV115(settled.state,order.dueAt+1000,bible).accepted,false);
  assert.deepEqual(war.readWarOperationsV115(JSON.stringify(settled.state),bible),settled.state);
});

test("realtime RTS starts from real identified teams and advances autonomous orders by simulation ticks",()=>{
  const s=base(),team=s.teams[0].id,target=routeFor(s,[team]);
  const opened=war.beginWarOperationV115(s,"rts",target,[team],bible,30000);
  assert.equal(opened.accepted,true);
  assert.equal(opened.state.active.rts.realtime,false);
  const enabled=war.toggleWarRtsRealtimeV115(opened.state,true);
  assert.equal(enabled.accepted,true);
  assert.equal(war.commandRtsV115(enabled.state,team,2,1,bible).accepted,false);
  const destination=war.issueWarRtsRealtimeOrderV115(enabled.state,team,2,1,"advance");
  assert.equal(destination.accepted,true);
  assert.equal(destination.state.active.rts.orders[team].x,2);
  assert.equal(war.issueWarRtsRealtimeOrderV115(enabled.state,team,99,1).accepted,false);
  let state=destination.state;
  const tick=war.stepWarRtsRealtimeV115(state,bible);
  assert.equal(tick.accepted,true);
  assert.equal(tick.state.clock,1);
  assert.equal(tick.state.active.rts.actors.find(actor=>actor.teamId===team).x,2);
  assert.equal(state.active.rts.actors.find(actor=>actor.teamId===team).x,1);
  assert.deepEqual(war.readWarOperationsV115(JSON.stringify(tick.state),bible),tick.state);
  state=tick.state;
  for(let i=0;i<110&&state.active;i++) state=war.stepWarRtsRealtimeV115(state,bible).state;
  assert.equal(state.active,null);
  assert.equal(state.reports.length,1);
  assert.equal(state.assignments[team],undefined);
});

test("the ally can hold a position and enemies cannot teleport or create a second turn",()=>{
  const s=base(),team=s.teams[0].id,target=routeFor(s,[team]);
  const opened=war.beginWarOperationV115(s,"rts",target,[team],bible,30000).state;
  const playing=war.toggleWarRtsRealtimeV115(opened,true).state;
  const hold=war.issueWarRtsRealtimeOrderV115(playing,team,1,1,"hold");
  assert.equal(hold.accepted,true);
  const next=war.stepWarRtsRealtimeV115(hold.state,bible).state;
  assert.equal(next.active.rts.actors.find(actor=>actor.teamId===team).x,1);
  assert.equal(next.clock,1);
  assert.equal(playing.clock,0);
  assert.equal(war.toggleWarRtsRealtimeV115(playing,true).accepted,false);
  assert.equal(war.issueWarRtsRealtimeOrderV115(playing,team,3,3,"attack").accepted,false);
});

test("archive checks reject impossible actors, cross-team orders, duplicate persons and forged phases",()=>{
  const s=base(),team=s.teams[0].id,target=routeFor(s,[team]);
  const outer=war.beginWarOperationV115(s,"outer",target,[team],bible,40000).state;
  const corrupt=structuredClone(outer);
  corrupt.outer[0].routeIds.push("UNVERIFIED-PASSAGE");
  assert.equal(war.readWarOperationsV115(JSON.stringify(corrupt),bible),null);
  const duplicate=structuredClone(s);
  duplicate.teams[1].members[0].id=duplicate.teams[0].members[0].id;
  assert.equal(war.readWarOperationsV115(JSON.stringify(duplicate),bible),null);
  const opened=war.beginWarOperationV115(s,"rts",target,[team],bible,40000).state;
  const rts=structuredClone(opened);
  rts.active.rts.actors[0].x=-100;
  assert.equal(war.readWarOperationsV115(JSON.stringify(rts),bible),null);
  const badOrder=structuredClone(opened);
  badOrder.active.rts.orders["NOT_A_MEMBER"]={x:5,y:3,kind:"attack"};
  assert.equal(war.readWarOperationsV115(JSON.stringify(badOrder),bible),null);
  const settled=war.settleWarOuterOpsV115(outer,outer.outer[0].dueAt,bible).state;
  const fabricated=structuredClone(settled);
  fabricated.reports[0].engagementLog=["fake".repeat(300)];
  assert.equal(war.readWarOperationsV115(JSON.stringify(fabricated),bible),null);
});
