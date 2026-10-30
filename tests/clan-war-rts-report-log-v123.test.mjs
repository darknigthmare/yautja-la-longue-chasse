import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
const compiled=await build({stdin:{contents:"export * from './app/game/systems/clanWarOperationsV115'; export * from './app/game/systems/clanWarRtsScenariosV119'; export * from './app/game/systems/clanWarBibleV6';",resolveDir:process.cwd()},bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const war=await import("data:text/javascript;base64,"+Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const rules=war.DEFAULT_WAR_RULES_V6;
const init=()=>war.createWarOperationsV115(rules);
function guardMission(){
 const s=init(),g=s.teams.find(t=>t.unitId==="W3-U07");
 const start=war.beginWarOperationV115(s,"rts","W3-K02",[g.id],rules,1000,"recon","W3-RTS02");
 assert.equal(start.accepted,true,start.message);
 return {state:start.state,teamId:g.id};
}
test("scripted RTS victory retains the last phases with one source-bound combat receipt",()=>{
 const {state,teamId}=guardMission();
 let staged=structuredClone(state);
 const guard=staged.active.rts.actors.find(actor=>actor.teamId===teamId);
 guard.x=7;guard.y=3;
 staged.active.rts.actors=staged.active.rts.actors.filter(actor=>actor.side==="ally");
 for(let turn=0;turn<3;turn++){
  const next=war.holdWarRtsAlternatingV119(staged,teamId,rules);
  assert.equal(next.accepted,true,next.message);
  staged=next.state;
 }
 assert.equal(staged.active,null);
 assert.equal(staged.reports.length,1);
 assert.equal(staged.reports[0].outcome,"victory");
 assert.ok(staged.reports[0].sourceIds.includes("W3-RTS02"));
 assert.equal(staged.reports[0].engagementLog.length,3);
 assert.match(staged.reports[0].engagementLog[2],/trois tours|3\/3/);
 assert.deepEqual(war.readWarOperationsV115(JSON.stringify(staged),rules),staged);
 assert.equal(war.holdWarRtsAlternatingV119(staged,teamId,rules).accepted,false);
});

test("manual retraction preserves already executed RTS phases without awarding a second report",()=>{
 const {state,teamId}=guardMission();
 const tick=war.holdWarRtsAlternatingV119(state,teamId,rules);
 assert.equal(tick.accepted,true);
 assert.equal(tick.state.active.rts.history.length,1);
 const returnHome=war.leaveWarOperationV115(tick.state,rules);
 assert.equal(returnHome.accepted,true);
 assert.equal(returnHome.state.reports.length,1);
 assert.equal(returnHome.state.reports[0].outcome,"retreat");
 assert.deepEqual(returnHome.state.reports[0].engagementLog,tick.state.active.rts.history);
 assert.equal(war.leaveWarOperationV115(returnHome.state,rules).accepted,false);
});

test("ten prior tactical actions remain bounded and untrusted log injection cannot bypass import",()=>{
 const {state,teamId}=guardMission();
 let next=state;
 for(let round=0;round<14&&next.active;round++){
  const action=war.holdWarRtsAlternatingV119(next,teamId,rules);
  assert.equal(action.accepted,true);
  next=action.state;
 }
 const entries=next.active?.rts.history??next.reports[0].engagementLog;
 assert.ok(entries.length>0&&entries.length<=10);
 assert.deepEqual(war.readWarOperationsV115(JSON.stringify(next),rules),next);
 const bad=structuredClone(state);
 bad.active.rts.history=["X".repeat(700)];
 assert.equal(war.readWarOperationsV115(JSON.stringify(bad),rules),null);
 const bad2=structuredClone(state);
 bad2.active.rts.history=Array.from({length:11},(_,i)=>String(i));
 assert.equal(war.readWarOperationsV115(JSON.stringify(bad2),rules),null);
});
