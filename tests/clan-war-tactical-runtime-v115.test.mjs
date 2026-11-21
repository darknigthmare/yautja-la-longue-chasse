import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

const bundle=await build({stdin:{contents:"export * from './app/game/systems/clanWarOperationsV115'; export * from './app/game/systems/clanWarBibleV6'; export * from './app/game/systems/clanWarAssaultContactV141'; export * from './app/game/systems/clanWarFocusV142';",resolveDir:process.cwd()},bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
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

function deployedAssault() {
  const origin = base(), team = origin.teams[0].id;
  const started = war.beginWarOperationV115(origin, "assault", routeFor(origin, [team]), [team], bible, 60000);
  assert.equal(started.accepted, true);
  const teamUnit = bible.units.find(unit => unit.id === origin.teams[0].unitId);
  assert(teamUnit);
  const deployed = war.deployAssaultUnitV115(started.state, team, bible);
  assert.equal(deployed.accepted, true);
  return { team, started: started.state, deployed: deployed.state };
}

test("assault camouflage drains exactly one charge per quiet turn, resumes from the archive and recharges at the bastion", () => {
  const { team, started, deployed } = deployedAssault();
  assert.equal(war.toggleWarAssaultCloakV115(started, team, bible).accepted, false);
  assert.deepEqual(war.readWarOperationsV115(JSON.stringify(deployed), bible), deployed);
  const active = war.toggleWarAssaultCloakV115(deployed, team, bible);
  assert(active.accepted);
  assert.equal(active.state.clock, deployed.clock);
  assert.equal(active.state.rav, deployed.rav);
  assert.equal(active.state.active.assault.ap, deployed.active.assault.ap);
  const ally = state => state.active.assault.actors.find(actor => actor.teamId === team);
  assert.equal(ally(deployed).assaultCloak, undefined);
  assert.deepEqual(ally(active.state).assaultCloak, { active: true, energy: 5 });
  let state = active.state;
  for (let energy = 4; energy >= 0; energy--) {
    const before = war.readWarOperationsV115(JSON.stringify(state), bible);
    assert.deepEqual(before, state);
    state = war.stepAssaultV115(before, bible).state;
    assert.deepEqual(ally(state).assaultCloak, { active: energy > 0, energy });
  }
  assert.equal(war.toggleWarAssaultCloakV115(state, team, bible).accepted, false);
  const front = structuredClone(state);
  ally(front).x = 35;
  assert.equal(ally(war.stepAssaultV115(front, bible).state).assaultCloak.energy, 0);
  const back = structuredClone(state);
  ally(back).x = 8;
  assert.deepEqual(ally(war.stepAssaultV115(back, bible).state).assaultCloak, { active: false, energy: 1 });
});

test("assault camouflage holds fire and blocks crossings while ordinary enemies lose optical contact", () => {
  const ally = { id: "ally", teamId: "team", unitId: "W3-U14", side: "ally", x: 42, hp: 35,
    assaultCloak: { active: true, energy: 4 } };
  const rival = { id: "rival", teamId: null, unitId: "W3-U14", side: "rival", x: 46, hp: 35 };
  const beyond = { ...ally, id: "back", teamId: "other", x: 40, assaultCloak: undefined };
  const first = war.warAssaultContactV141([ally, rival, beyond], bible, {}, 1);
  assert(!first.shots.some(shot => shot.attackerId === ally.id || shot.attackerId === rival.id));
  assert(first.actors.find(actor => actor.id === rival.id).x > ally.x);
  assert(first.actors.find(actor => actor.id === ally.id).x < rival.x);
  const byBastion = war.warAssaultContactV141([{ ...ally, x: 94 }], bible, {}, 1);
  assert.equal(byBastion.rivalBaseDamage, 0);
  const opticalContact = war.warAssaultContactV141([ally, { ...rival, x: 44 }], bible, {}, 1);
  assert(opticalContact.shots.some(shot => shot.attackerId === rival.id && shot.targetId === ally.id));
  assert(!opticalContact.shots.some(shot => shot.attackerId === ally.id));
});

test("source W3-U04 detects nearby cloaked troops, makes an impact and leaves a disrupted archive", () => {
  const { team, deployed } = deployedAssault();
  const state = war.toggleWarAssaultCloakV115(deployed, team, bible).state;
  const arena = state.active.assault, ally = arena.actors.find(actor => actor.teamId === team);
  ally.x = 40;
  const tracker = { id: "track-unit", teamId: null, unitId: "W3-U04", side: "rival", x: 46, hp: 35 };
  arena.actors = [ally, tracker];
  assert.equal(war.warAssaultCanSeeActorV141(tracker, ally), true);
  assert.equal(war.warAssaultCanSeeActorV141({ ...tracker, x: 48 }, ally), false);
  arena.ap = 40;
  const special = war.issueWarAssaultSpecialV117(state, team, bible);
  const focus = war.issueWarAssaultFocusV142(state, team, tracker.id, bible);
  assert.equal(special.accepted, false);
  assert.equal(focus.accepted, false);
  assert.equal(special.state, state);
  assert.equal(focus.state, state);
  const after = war.stepAssaultV115(state, bible).state;
  const struck = after.active.assault.actors.find(actor => actor.teamId === team);
  assert(struck.hp < ally.hp);
  assert.deepEqual(struck.assaultCloak, { active: false, energy: 3 });
  assert.deepEqual(war.readWarOperationsV115(JSON.stringify(after), bible), after);
  for (const corruptCloak of [{ active: true, energy: 0 }, { active: false, energy: 6 }, { active: false, energy: 1.5 }]) {
    const invalid = structuredClone(state);
    invalid.active.assault.actors[0].assaultCloak = corruptCloak;
    assert.equal(war.readWarOperationsV115(JSON.stringify(invalid), bible), null);
  }
  const counterfeit = structuredClone(after);
  counterfeit.active.assault.actors.find(actor => actor.id === tracker.id).assaultCloak = { active: true, energy: 3 };
  assert.equal(war.readWarOperationsV115(JSON.stringify(counterfeit), bible), null);
});
