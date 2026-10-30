import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle=await build({
  stdin:{contents:"export * from './app/game/systems/clanWarMissionTerrainV116'; export * from './app/game/systems/clanWarOperationsV115'; export * from './app/game/systems/clanWarBibleV6';",resolveDir:process.cwd()},
  bundle:true,write:false,platform:"node",format:"esm",target:"es2022",logLevel:"silent",
});
const api=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6, initial=()=>api.createWarOperationsV115(rules);
const key=(x,y)=>x+","+y;
function legal(start,mode="stealth"){
  const teamId=start.teams[0].id;
  const t=rules.territories.find(item=>item.id!=="W3-K01"&&!api.warMissionEligibleV115(start,rules,item.id,[teamId]));
  assert.ok(t,"source W3 theatre has a traversable military passage");
  const opened=api.beginWarOperationV115(start,mode,t.id,[teamId],rules,12000);
  assert.equal(opened.accepted,true,opened.message);
  return opened.state;
}

test("the thirty-six authored W3 territories produce deterministic, coherent tactical maps",()=>{
  const maps=rules.territories.map(t=>api.warMissionTerrainV116(t.id,rules));
  assert.equal(maps.length,36);
  assert.equal(new Set(maps.map(m=>m.targetId)).size,36);
  assert.ok(new Set(maps.map(m=>m.walls.join("|"))).size>=6,"regional layouts must not all be identical");
  assert.equal(new Set(maps.map(m=>m.regionId)).size,6);
  for(const map of maps) {
    const same=api.warMissionTerrainV116(map.targetId,rules);
    assert.deepEqual(map,same);
    assert.equal(map.width,9);assert.equal(map.height,6);
    assert.equal(map.walls.length,new Set(map.walls).size);
    assert.equal(map.cover.length,new Set(map.cover).size);
    assert.ok(map.walls.every(item=>/^[0-8],[0-5]$/.test(item)));
    assert.ok(map.cover.every(item=>/^[0-8],[0-5]$/.test(item)&&!map.walls.includes(item)));
    for(const origin of ["1,1","1,2","1,3","1,4","7,1","7,2","7,3"]) assert.ok(!map.walls.includes(origin),map.targetId+" / "+origin);
    assert.ok(api.warTerrainPathLengthV116(map,map.extraction,map.relay)!==null,map.targetId+" stealth");
    assert.ok(api.warTerrainPathLengthV116(map,{x:1,y:1},map.objective)!==null,map.targetId+" RTS");
  }
  const legacy=api.warMissionTerrainV116("W3-K02",rules);
  assert.deepEqual(legacy.walls,["3,2","3,3","5,3","6,4"]);
  assert.throws(()=>api.warMissionTerrainV116("CON-T01",rules),RangeError);
});

test("solid barriers block action, sight and movement but never consume a rejected order",()=>{
  const layout=api.warMissionTerrainV116("W3-K02",rules);
  assert.equal(api.warTerrainCellBlockedV116(layout,3,2),true);
  assert.equal(api.warTerrainCellBlockedV116(layout,1,4),false);
  assert.equal(api.warTerrainCellBlockedV116(layout,9,4),true);
  assert.equal(api.warTerrainLineOfSightV116(layout,{x:2,y:2},{x:4,y:2}),false);
  assert.equal(api.warTerrainLineOfSightV116(layout,{x:1,y:1},{x:5,y:1}),true);
  assert.equal(api.warTerrainPathLengthV116(layout,{x:2,y:3},{x:3,y:3}),null);
  const stealth=legal(initial());
  const right=api.commandStealthV115(stealth,"right",rules);
  const up=api.commandStealthV115(right.state,"up",rules);
  const wall=api.commandStealthV115(up.state,"right",rules);
  assert.equal(wall.accepted,false);
  assert.equal(wall.state.clock,up.state.clock);
});

test("realtime RTS rejects wall targeting and treats all regional walls as occupied in simulation",()=>{
  let state=legal(initial(),"rts");
  const terrain=api.warMissionTerrainV116(state.active.targetId,rules),team=state.active.teamIds[0];
  state=api.toggleWarRtsRealtimeV115(state,true).state;
  const wall=terrain.walls[0].split(",").map(Number);
  const denied=api.issueWarRtsRealtimeOrderV115(state,team,wall[0],wall[1],"advance",rules);
  assert.equal(denied.accepted,false);
  assert.equal(denied.state,state);
  const dest=api.issueWarRtsRealtimeOrderV115(state,team,terrain.objective.x,terrain.objective.y,"advance",rules);
  assert.equal(dest.accepted,true);
  state=dest.state;
  for(let i=0;i<40&&state.active;i++){
    const update=api.stepWarRtsRealtimeV115(state,rules);
    assert.equal(update.accepted,true,update.message);
    state=update.state;
    for(const actor of state.active?.rts?.actors??[])assert.ok(!terrain.walls.includes(key(actor.x,actor.y)),actor.id+" crossed a wall");
  }
});

test("turn-based RTS may not teleport across a solid regional barrier",()=>{
  const state=legal(initial(),"rts");
  const terrain=api.warMissionTerrainV116(state.active.targetId,rules);
  const teamId=state.active.teamIds[0],wall=terrain.walls[0].split(",").map(Number);
  const blocked=api.commandRtsV115(state,teamId,wall[0],wall[1],rules);
  assert.equal(blocked.accepted,false);
  assert.equal(blocked.state,state);
});
