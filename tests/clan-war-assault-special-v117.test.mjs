import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

const output=await build({stdin:{contents:"export * from './app/game/systems/clanWarOperationsV115'; export * from './app/game/systems/clanWarBibleV6';",resolveDir:process.cwd()},
  bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+Buffer.from(output.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
function setup(){
  const starting=api.createWarOperationsV115(rules);
  const id=starting.teams[0].id;
  const target=rules.territories.find(t=>t.id!==starting.baseId&&
    api.warMissionEligibleV115(starting,rules,t.id,[id])===null)?.id;
  assert.ok(target);
  const opened=api.beginWarOperationV115(starting,"assault",target,[id],rules,1000);
  assert.equal(opened.accepted,true);
  return {starting,id,target,state:opened.state};
}

test("assault coordination increases AP regeneration, not V6 command or RAV budget",()=>{
  const {state}=setup(),original=JSON.stringify(state);
  assert.equal(api.upgradeWarAssaultApV117(state).accepted,false,"base 24 AP insufficient");
  const ready={...state,active:{...state.active,assault:{...state.active.assault,ap:80}}};
  const lv2=api.upgradeWarAssaultApV117(ready);
  assert.equal(lv2.accepted,true);
  assert.equal(lv2.state.active.assault.apLevel,2);
  assert.equal(lv2.state.active.assault.ap,45);
  assert.equal(lv2.state.rav,state.rav);
  assert.deepEqual(lv2.state.teams,state.teams);
  const step=api.stepAssaultV115(lv2.state,rules);
  assert.equal(step.accepted,true);
  assert.equal(step.state.active.assault.ap,58);
  const lv3=api.upgradeWarAssaultApV117(step.state);
  assert.equal(lv3.accepted,true);
  assert.equal(lv3.state.active.assault.apLevel,3);
  assert.equal(lv3.state.active.assault.ap,3);
  assert.equal(api.upgradeWarAssaultApV117(lv3.state).accepted,false);
  assert.deepEqual(api.readWarOperationsV115(JSON.stringify(lv3.state),rules),lv3.state);
  assert.equal(JSON.stringify(state),original,"source state remained unchanged");
});

test("a concentrated attack needs an existing deployed warrior, 20 AP and V6 line-of-range",()=>{
  const {state,id}=setup(),deployed=api.deployAssaultUnitV115(state,id,rules);
  assert.equal(deployed.accepted,true);
  const ally=deployed.state.active.assault.actors.find(a=>a.teamId===id);
  const hostile={id:"rival-test",teamId:null,unitId:rules.units[0].id,side:"rival",x:ally.x+4,hp:18};
  const scenario={...deployed.state,active:{...deployed.state.active,assault:{...deployed.state.active.assault,ap:30,
    actors:[...deployed.state.active.assault.actors,hostile]}}};
  const result=api.issueWarAssaultSpecialV117(scenario,id,rules);
  assert.equal(result.accepted,true);
  assert.equal(result.state.active.assault.ap,10);
  assert.deepEqual(result.state.active.assault.usedSpecials,[id]);
  assert.ok(result.state.active.assault.actors.find(a=>a.id==="rival-test").hp<hostile.hp);
  assert.equal(result.state.active.assault.actors.length,2);
  assert.equal(api.issueWarAssaultSpecialV117(result.state,id,rules).accepted,false);
  assert.equal(api.issueWarAssaultSpecialV117(state,id,rules).accepted,false);
  const outOfRange={...scenario,active:{...scenario.active,assault:{...scenario.active.assault,
    actors:[ally,{...hostile,x:90}]}}};
  assert.equal(api.issueWarAssaultSpecialV117(outOfRange,id,rules).accepted,false);
  assert.deepEqual(api.readWarOperationsV115(JSON.stringify(result.state),rules),result.state);
});

test("save validation blocks invented AP levels and duplicated tactical maneuver receipts",()=>{
  const {state,id}=setup();
  const bad={...state,active:{...state.active,assault:{...state.active.assault,apLevel:5}}};
  assert.equal(api.readWarOperationsV115(JSON.stringify(bad),rules),null);
  const duplicated={...state,active:{...state.active,assault:{...state.active.assault,
    launched:[id],usedSpecials:[id,id]}}};
  assert.equal(api.readWarOperationsV115(JSON.stringify(duplicated),rules),null);
  const phantom={...state,active:{...state.active,assault:{...state.active.assault,
    launched:[],usedSpecials:[id]}}};
  assert.equal(api.readWarOperationsV115(JSON.stringify(phantom),rules),null);
  const overCap={...state,active:{...state.active,assault:{...state.active.assault,ap:175,apLevel:3}}};
  assert.equal(api.readWarOperationsV115(JSON.stringify(overCap),rules),null);
});
