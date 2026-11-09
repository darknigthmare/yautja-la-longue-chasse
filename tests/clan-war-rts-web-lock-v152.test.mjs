import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {build} from "esbuild";
const root=fileURLToPath(new URL("../",import.meta.url));
const read=path=>readFileSync(root+path,"utf8");
const buildResult=await build({stdin:{contents:[
  "export * from './app/game/systems/clanWarOperationsV115';",
  "export * from './app/game/systems/clanWarBibleV6';",
].join("\n"),resolveDir:root},bundle:true,write:false,format:"esm",platform:"node",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+Buffer.from(buildResult.outputFiles[0].contents).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
function start(){
  const initial=api.createWarOperationsV115(rules);
  const team=initial.teams[0].id;
  const target=rules.territories.find(t=>t.id!==initial.baseId&&
    api.warMissionEligibleV115(initial,rules,t.id,[team])===null)?.id;
  assert.ok(target);
  const launched=api.beginWarOperationV115(initial,"rts",target,[team],rules,1000);
  assert.equal(launched.accepted,true,launched.message);
  const real=api.toggleWarRtsRealtimeV115(launched.state,true);
  assert.equal(real.accepted,true,real.message);
  return {initial,team,target,state:real.state};
}
test("V152 RTS start debits source V6 RAV only once and loads the REAL V115 realtime state",()=>{
  const {initial,state,team,target}=start();
  assert.equal(state.serial,1);
  assert.equal(state.active?.mode,"rts");
  assert.equal(state.active?.targetId,target);
  assert.equal(state.active?.rts?.realtime,true);
  const unit=rules.units.find(x=>x.id===state.teams.find(t=>t.id===team).unitId);
  assert.equal(state.rav,initial.rav-unit.upkeepRav);
  assert.equal(state.assignments[team],state.active.id);
  const archive=JSON.stringify(state);
  assert.deepEqual(api.readWarOperationsV115(archive,rules),state);
  assert.equal(JSON.stringify(initial),JSON.stringify(api.createWarOperationsV115(rules)));
});
test("V152 native RTS ticks never debit upkeep a second time and can be resumed or finish with a unique report",()=>{
  const {state}=start(),rav=state.rav,serial=state.serial;
  let current=state,steps=0;
  for(let i=0;i<6&&current.active?.mode==="rts";i++){
    const result=api.stepWarRtsRealtimeV115(current,rules);
    assert.equal(result.accepted,true,result.message);
    current=result.state;steps++;
    assert.equal(current.serial,serial,"Ticks do not recruit new operations");
    assert.equal(current.rav,rav,"RAV cost is committed once, at launch");
    assert.ok(current.clock>state.clock,"Simulation clock must advance");
    assert.equal(api.readWarOperationsV115(JSON.stringify(current),rules)?.clock,current.clock);
  }
  assert.ok(steps>0);
  if(!current.active) {
    assert.equal(current.reports.length,1,"Exactly one completed exercise report");
    const extra=api.stepWarRtsRealtimeV115(current,rules);
    assert.equal(extra.accepted,false,"No duplicate terminal report");
  }
});
test("V152 the real Chromium fixture never mocks the engine or campaign storage",()=>{
  const script=read("scripts/qa-clan-war-rts-two-tabs-v152.mjs");
  assert.match(script,/entryPoints:\["tests\/browser\/clan-war-v151-four-modes\.fixture\.tsx"\]/);
  assert.match(script,/navigator\.locks\.request\(name/);
  assert.match(script,/rts\?\.realtime===true/);
  assert.match(script,/frozen\.active\.tick/);
  assert.match(script,/Shared Web Lock must freeze native realtime RTS ticks/);
  assert.match(script,/resumed\.rav,initialRav/);
  assert.match(script,/b\.reload/);
  assert.match(script,/artOneToOneApproved:0/);
  assert.doesNotMatch(script,/localStorage\.setItem\(key,JSON\.stringify/);
  assert.doesNotMatch(script,/gamestate=\{.*fake/);
  const component=read("app/game/ClanWarOperationsV115.tsx");
  assert.match(component,/if\(state\.active\?\.mode==="rts"&&state\.active\.rts\?\.realtime\) commit\(stepWarRtsRealtimeV115\(state,rules\)\)/);
  assert.match(component,/navigator\.locks\.request\(`\$\{WAR_OPERATIONS_STORAGE_V115\}\.write`/);
  assert.match(component,/if\(!verifyOwnV115ArchiveV148\(\)\)return/);
});
