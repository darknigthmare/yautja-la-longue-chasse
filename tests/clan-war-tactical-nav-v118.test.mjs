import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle=await build({
  stdin:{contents:"export * from './app/game/systems/clanWarOperationsV115'; export * from './app/game/systems/clanWarBibleV6'; export * from './app/game/systems/clanWarTacticalNavigationV118'; export * from './app/game/systems/clanWarMissionTerrainV116';",resolveDir:process.cwd()},
  bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent",
});
const api=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const tile=p=>p.x+","+p.y;

test("all thirty-six W3 tactical sites allow reproducible routed enemy movement without wall crossing",()=>{
  const sites=rules.territories;
  assert.equal(sites.length,36);
  for(const site of sites) {
    const t=api.warMissionTerrainV116(site.id,rules),goal={x:1,y:1};
    let from={x:7,y:3},steps=0;
    const initial=api.warTerrainPathLengthV116(t,from,goal);
    assert.ok(initial!==null,site.id+" should have an accessible goal");
    while(tile(from)!==tile(goal)&&steps<54){
      const next=api.warRtsNextPathStepV118(t,from,goal);
      assert.ok(next,site.id+" cannot strand a routed squad");
      assert.equal(Math.abs(next.x-from.x)+Math.abs(next.y-from.y),1);
      assert.equal(t.walls.includes(tile(next)),false,site.id+" cannot cross a wall");
      const previous=api.warTerrainPathLengthV116(t,from,goal);
      const remaining=api.warTerrainPathLengthV116(t,next,goal);
      assert.equal(remaining,previous-1,site.id+" path must advance, not oscillate");
      assert.deepEqual(api.warRtsNextPathStepV118(t,from,goal),next,site.id+" must be deterministic");
      from=next;steps++;
    }
    assert.deepEqual(from,goal);
    assert.equal(steps,initial);
  }
});

test("occupied positions, blocked goal and already reached point do not generate illegal steps",()=>{
  const t=api.warMissionTerrainV116("W3-K02",rules);
  const from={x:2,y:2},goal={x:4,y:2};
  const path=api.warRtsNextPathStepV118(t,from,goal);
  assert.ok(path);
  assert.notEqual(tile(path),"3,2","solid separating wall is never traversed");
  assert.equal(api.warRtsNextPathStepV118(t,from,{x:3,y:2}),null);
  assert.equal(api.warRtsNextPathStepV118(t,from,from),null);
  const occupied=api.warRtsNextPathStepV118(t,from,goal,["2,1"]);
  assert.notEqual(occupied&&tile(occupied),"2,1");
});

function front(){
  const s=api.createWarOperationsV115(rules),team=s.teams[0].id;
  const mission=api.beginWarOperationV115(s,"rts","W3-K02",[team],rules,40000);
  assert.equal(mission.accepted,true,mission.message);
  const live=structuredClone(mission.state);
  const ally=live.active.rts.actors.find(a=>a.side==="ally");
  const rival=live.active.rts.actors.find(a=>a.side==="rival");
  Object.assign(ally,{x:2,y:2,hp:35});
  Object.assign(rival,{x:4,y:2,hp:35});
  live.active.rts.actors=[ally,rival];
  return {live,team,rival:rival.id};
}
test("turn-based rival routes around the K02 wall instead of colliding into it forever",()=>{
  const {live,team,rival}=front();
  const acted=api.commandRtsV115(live,team,2,1,rules);
  assert.equal(acted.accepted,true,acted.message);
  const hostile=acted.state.active.rts.actors.find(a=>a.id===rival);
  assert.deepEqual({x:hostile.x,y:hostile.y},{x:4,y:1});
});
test("realtime rival uses the same obstruction-aware step with no conflicting occupancy",()=>{
  const {live,team,rival}=front();
  live.active.rts.actors.find(a=>a.teamId===team).y=1;
  const enabled=api.toggleWarRtsRealtimeV115(live,true);
  assert.equal(enabled.accepted,true);
  const held=api.issueWarRtsRealtimeOrderV115(enabled.state,team,2,1,"hold",rules);
  assert.equal(held.accepted,true);
  const tick=api.stepWarRtsRealtimeV115(held.state,rules);
  assert.equal(tick.accepted,true);
  const hostile=tick.state.active.rts.actors.find(a=>a.id===rival);
  assert.deepEqual({x:hostile.x,y:hostile.y},{x:4,y:1});
});
