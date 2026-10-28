import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
const compiled=await build({stdin:{contents:`export * from "./app/game/systems/fieldStashV112";export * from "./app/game/systems/harvestInventoryV112";`,resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,format:"esm",platform:"node",logLevel:"silent"});
const r=await import("data:text/javascript;base64,"+Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const item=(id="a",massKg=3)=>({id:"jungle-vey:0:"+id+":bone",sourceId:"jungle-vey:0:"+id,speciesId:"razorback-grazer",partId:"bone",label:"Côte dorsale",quality:90,massKg,volumeUnits:2,stage:"raw"});
const actor={x:80,y:40,width:40,height:60,health:100,grounded:true,climbing:false};
const ledge={x:0,y:100,width:400,height:20,collision:"solid"};
const world={width:1000,floorY:600,platforms:[ledge]};
const options={suspended:false,operationActive:false,depotFreeSlots:256};
const fixture=()=>({specimensV112:[item()],stashedSpecimensV112:[],completedEventIds:["harvest-bone:a"]});
function put(state=fixture()){const moved=r.moveFieldSpecimenV112(state,"drop",item().id,actor,world,"hunter",options);assert.equal(moved.accepted,true,moved.message);return moved.state;}
test("deposit creates one physical position without freeing or copying the harvested anatomy",()=>{
  const state=fixture(),before=structuredClone(state),dropped=put(state);
  assert.deepEqual(state,before);assert.equal(dropped.specimensV112,state.specimensV112);
  assert.deepEqual(dropped.completedEventIds,state.completedEventIds);
  assert.deepEqual(r.carriedFieldSpecimensV112(dropped),[]);
  assert.deepEqual(dropped.stashedSpecimensV112,[{specimenId:item().id,x:100,y:100,fallSpeed:0}]);
  assert.equal(r.moveFieldSpecimenV112(dropped,"drop",item().id,actor,world,"hunter",options).accepted,false);
});
test("pick up returns the same item once without changing source or completion receipt",()=>{
  const dropped=put(),picked=r.moveFieldSpecimenV112(dropped,"take",item().id,actor,world,"hunter",options);
  assert.equal(picked.accepted,true);assert.deepEqual(picked.state.stashedSpecimensV112,[]);
  assert.equal(r.carriedFieldSpecimensV112(picked.state)[0],dropped.specimensV112[0]);
  assert.deepEqual(picked.state.completedEventIds,dropped.completedEventIds);
  assert.equal(r.moveFieldSpecimenV112(picked.state,"take",item().id,actor,world,"hunter",options).accepted,false);
});
for(const [label,change]of [
  ["airborne",{grounded:false}],["climbing",{climbing:true}],["dead",{health:0}],["invalidhealth",{health:NaN}],
  ["nonfinite",{x:Infinity}],["invalidbody",{width:0}],
])test("drop and take refuse "+label+" without altering the unique item",()=>{
  const state=fixture(),dropped=put(state);
  for(const [action,source]of [["drop",state],["take",dropped]]){
    const moved=r.moveFieldSpecimenV112(source,action,item().id,{...actor,...change},world,"hunter",options);
    assert.equal(moved.accepted,false);assert.equal(moved.state,source);
  }
});
for(const option of [{suspended:true},{operationActive:true}])test("suspended or busy manipulation does no work: "+JSON.stringify(option),()=>{
  const state=fixture(),moved=r.moveFieldSpecimenV112(state,"drop",item().id,actor,world,"hunter",{...options,...option});
  assert.equal(moved.accepted,false);assert.equal(moved.state,state);
});
test("a stash cannot manufacture an item absent from the finite source registry",()=>{
  const state=fixture();assert.equal(r.moveFieldSpecimenV112(state,"drop","invented",actor,world,"hunter",options).accepted,false);
  assert.equal(r.normalizeFieldStashesV112([{specimenId:"invented",x:100,y:100,fallSpeed:0}],state.specimensV112),null);
});
test("pickup uses true two dimensional distance and requires a settled source",()=>{
  const state=put();
  assert.equal(r.fieldStashCanTakeV112(state,item().id,{...actor,x:500},world,"hunter"),false);
  const falling={...state,stashedSpecimensV112:[{...state.stashedSpecimensV112[0],fallSpeed:5}]};
  assert.equal(r.fieldStashCanTakeV112(falling,item().id,actor,world,"hunter"),false);
});
test("solid occlusion blocks retrieval while a one-way ledge remains traversable",()=>{
  const state=put(),left={...actor,x:30},wall={x:72,y:0,width:8,height:100,collision:"solid"};
  assert.equal(r.fieldStashCanTakeV112(state,item().id,left,{...world,platforms:[ledge,wall]},"hunter"),false);
  assert.equal(r.fieldStashCanTakeV112(state,item().id,left,{...world,platforms:[ledge,{...wall,collision:"one-way"}]},"hunter"),true);
});
test("mass volume and free depot slots all gate retrieval without losing the world item",()=>{
  const state={specimensV112:[item("carried",23),item("stored",3)],stashedSpecimensV112:[{specimenId:item("stored").id,x:100,y:100,fallSpeed:0}]};
  assert.equal(r.fieldStashCanTakeV112(state,item("stored").id,actor,world,"scout"),false);
  assert.equal(r.fieldStashCanTakeV112(state,item("stored").id,actor,world,"hunter"),true);
  assert.equal(r.fieldStashCanTakeV112(state,item("stored").id,actor,world,"hunter",1),false);
  const volume={...state,specimensV112:[{...item("carried",1),volumeUnits:18},item("stored",1)]};
  assert.equal(r.fieldStashCanTakeV112(volume,item("stored").id,actor,world,"scout"),false);
  assert.equal(r.moveFieldSpecimenV112(state,"take",item("stored").id,actor,world,"scout",options).state,state);
});
test("paused serialization retains the same stash and rejects duplicate nonfinite or foreign positions",()=>{
  const state=put(),raw=JSON.parse(JSON.stringify(state.stashedSpecimensV112));
  assert.deepEqual(r.normalizeFieldStashesV112(raw,state.specimensV112),raw);
  assert.deepEqual(r.normalizeFieldStashesV112(undefined,state.specimensV112),[]);
  for(const entries of [[raw[0],raw[0]],[{...raw[0],x:NaN}],[{...raw[0],fallSpeed:-1}],[{...raw[0],fallSpeed:1201}],[{...raw[0],specimenId:"foreign"}]])
    assert.equal(r.normalizeFieldStashesV112(entries,state.specimensV112),null);
  assert.equal(r.fieldStashGeometryValidV112(state,world),true);
  for(const point of [{x:-20},{x:2000},{y:601},{x:100,y:110}]){
    assert.equal(r.fieldStashGeometryValidV112({...state,stashedSpecimensV112:[{...raw[0],...point}]},world),false);
  }
});
test("a deposited item stays on its authored ledge and falls when that support disappears",()=>{
  let state=put();assert.equal(r.stepFieldStashesV112(state,world,.05),state);
  const noLedge={...world,platforms:[]};
  state=r.stepFieldStashesV112(state,noLedge,.05);assert.ok(state.stashedSpecimensV112[0].y>100);
  assert.ok(state.stashedSpecimensV112[0].fallSpeed>0);
  for(let n=0;n<200;n++)state=r.stepFieldStashesV112(state,noLedge,.05);
  assert.equal(state.stashedSpecimensV112[0].y,600);assert.equal(state.stashedSpecimensV112[0].fallSpeed,0);
});
test("swept contact catches a thin ledge at high fall speed without tunneling",()=>{
  const state={specimensV112:[item()],stashedSpecimensV112:[{specimenId:item().id,x:100,y:0,fallSpeed:1190}]};
  const landed=r.stepFieldStashesV112(state,{...world,platforms:[{...ledge,y:75,height:2}]},.1);
  assert.equal(landed.stashedSpecimensV112[0].y,75);assert.equal(landed.stashedSpecimensV112[0].fallSpeed,0);
  for(const delta of [0,-.1,NaN,.2])assert.equal(r.stepFieldStashesV112(state,world,delta),state);
});
test("deposit reduces carried load without changing ownership, and retrieval restores that exact load",()=>{
  const state=fixture(),before=r.fieldLoadV112(r.carriedFieldSpecimensV112(state),"hunter"),dropped=put(state);
  assert.equal(r.fieldLoadV112(r.carriedFieldSpecimensV112(dropped),"hunter").massKg,0);
  const picked=r.moveFieldSpecimenV112(dropped,"take",item().id,actor,world,"hunter",options).state;
  assert.deepEqual(r.fieldLoadV112(r.carriedFieldSpecimensV112(picked),"hunter"),before);
});
