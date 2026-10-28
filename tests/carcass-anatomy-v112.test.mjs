import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
const compiled=await build({stdin:{contents:`export * from "./app/game/systems/anatomyHarvestV112"; export * from "./app/game/systems/carcassSupportsV112"; export * from "./app/game/systems/ritesOfHuntV77"; export * from "./app/game/systems/huntRitesRuntimeV77";`,resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,platform:"node",format:"esm",logLevel:"silent"});
const a=await import("data:text/javascript;base64,"+Buffer.from(compiled.outputFiles[0].text).toString("base64"));
function scene(species="hell-hound-stalker"){
  const label=id=>id,player={x:100,y:540,width:40,height:60,health:100,grounded:true,climbing:false};
  const actors=[{id:"body",archetype:species,kind:"beast",x:110,y:540,width:40,height:60,health:0,maxHealth:100,alive:false,active:true,boss:false,riteDefeatedAt:1,riteIntegrityLossV112:0}];
  const options={flayingToolOwned:true,acceptSpecimen:()=>true,supports:[{id:"real-hook",x:145,y:450,suitable:true,maximumMass:170}]};
  let state=a.createRitesOfHuntV77("jungle-vey:7","jungle-vey");
  const context=()=>a.riteRuntimeContextV77(state,player,actors,label,false,options);
  const registrationContext=context();
  const registered=a.registerRitePreyV77(state,registrationContext.prey[0],registrationContext);
  assert.equal(registered.accepted,true,registered.message);
  state=registered.state;
  return {get state(){return state},set state(value){state=value},actors,player,label,options,context};
}
function act(f,action,options={}){
  const start=a.startHuntRiteV77(f.state,"body",action,f.context(),options);assert.equal(start.accepted,true,start.message);f.state=start.state;
  for(let i=0;i<140&&f.state.operation;i++)f.state=a.stepHuntRiteV77(f.state,.05,f.context()).state;
  assert.equal(f.state.operation,null);
}
test("anatomical tables are species-specific and never invent universal human or synthetic meat",()=>{
  assert.equal(a.anatomyPartsV112("colonial-marine").length,0);
  assert.equal(a.anatomyPartsV112("weyland-synth").length,0);
  assert.equal(a.anatomyPartsV112("unknown-species").length,0);
  assert.deepEqual(a.anatomyPartsV112("xeno-drone").map(x=>x.action),["harvest-bone"]);
  assert.ok(a.anatomyPartsV112("hell-hound-stalker").some(p=>p.action==="harvest-hide"));
  assert.ok(Object.keys(a.ANATOMY_CATALOGUE_V112).length>=35);
});
test("all real hits contribute deterministic damage and excessive finishing damage costs integrity",()=>{
  const precision=a.applyAnatomyDamageV112(0,40,100,100,"melee");
  const damage=a.applyAnatomyDamageV112(precision,60,60,100,"melee");
  assert.equal(a.anatomyIntegrityV112(damage),91);
  const ranged=a.applyAnatomyDamageV112(0,100,100,100,"weapon");
  assert.equal(a.anatomyIntegrityV112(ranged),72);
  assert.ok(a.applyAnatomyDamageV112(0,220,100,100,"weapon")>ranged);
  assert.equal(a.applyAnatomyDamageV112(damage,NaN,10,100,"weapon"),damage);
});
test("analysis must precede the irreversible finite extraction and improves its previewed quality",()=>{
  const f=scene();act(f,"analyze");act(f,"flay");
  const preview=a.huntRiteMenuSnapshotV77(f.state,f.context().actor,"body",true,f.options).parts.find(p=>p.action==="harvest-hide");
  assert.equal(preview.quality,100);act(f,"harvest-hide");
  assert.equal(f.state.specimensV112.length,1);
  assert.equal(f.state.specimensV112[0].quality,preview.quality);
  assert.equal(f.state.specimensV112[0].sourceId,"jungle-vey:7:body");
  assert.equal(a.startHuntRiteV77(f.state,"body","harvest-hide",f.context()).accepted,false);
  assert.ok(a.normalizeRitesOfHuntV77(f.state,"jungle-vey:7","jungle-vey"));
});
test("skin requires preparation; a full or changed pack never consumes a part",()=>{
  const f=scene();assert.equal(a.startHuntRiteV77(f.state,"body","harvest-hide",f.context()).accepted,false);
  act(f,"flay");f.options.acceptSpecimen=()=>false;
  assert.equal(a.startHuntRiteV77(f.state,"body","harvest-hide",f.context()).accepted,false);
  f.options.acceptSpecimen=()=>true;
  f.state=a.startHuntRiteV77(f.state,"body","harvest-hide",f.context()).state;
  f.options.acceptSpecimen=()=>false;
  for(let i=0;i<100&&f.state.operation;i++)f.state=a.stepHuntRiteV77(f.state,.05,f.context()).state;
  assert.equal(f.state.specimensV112.length,0);
  assert.equal(f.state.completedEventIds.includes("harvest-hide:body"),false);
});
test("damage, lost tool, source or footing interrupt anatomy without a specimen",()=>{
  for(const change of [f=>{f.player.health=99},f=>{f.options.flayingToolOwned=false},f=>{f.actors[0].alive=true},f=>{f.player.grounded=false}]){
    const f=scene();f.state=a.startHuntRiteV77(f.state,"body","harvest-tissue",f.context()).state;change(f);
    f.state=a.stepHuntRiteV77(f.state,.05,f.context()).state;
    assert.equal(f.state.operation,null);assert.equal(f.state.specimensV112.length,0);
  }
});
test("transport and attachment are separate, require real capacity and cannot occupy one hook twice",()=>{
  const f=scene();act(f,"flay");
  assert.equal(a.startHuntRiteV77(f.state,"body","hang",f.context(),{supportId:"real-hook"}).accepted,false);
  act(f,"carry");assert.equal(f.state.carryingCorpseId,"body");
  f.options.supports[0].maximumMass=1;
  assert.equal(a.startHuntRiteV77(f.state,"body","hang",f.context(),{supportId:"real-hook"}).accepted,false);
  f.options.supports[0].maximumMass=170;act(f,"hang",{supportId:"real-hook"});
  assert.equal(f.state.carryingCorpseId,null);assert.equal(f.state.corpses[0].y,532);
  assert.equal(f.state.corpses[0].supportId,"real-hook");assert.equal(f.state.corpses.length,1);
  assert.equal(a.startHuntRiteV77(f.state,"body","carry",f.context()).accepted,false);
});
test("drop preserves the single original source and an unfinished hang preserves no attachment",()=>{
  const f=scene();act(f,"flay");act(f,"carry");act(f,"drop");assert.equal(f.state.corpses.length,1);
  act(f,"carry");f.state=a.startHuntRiteV77(f.state,"body","hang",f.context(),{supportId:"real-hook"}).state;
  f.options.supports=[];f.state=a.stepHuntRiteV77(f.state,.05,f.context()).state;
  assert.equal(f.state.operation,null);assert.equal(f.state.corpses[0].supportId,null);
  assert.equal(f.state.carryingCorpseId,"body");
});
test("restoration cross-checks attachment and anatomy against the real source, tool and geometry",()=>{
  const f=scene();act(f,"flay");act(f,"harvest-hide");act(f,"carry");act(f,"hang",{supportId:"real-hook"});
  const c=f.state.corpses[0];f.actors[0].x=c.x-20;f.actors[0].y=c.y-60;
  const elapsed=f.state.elapsed;f.options.world={width:3000,floorY:624,platforms:[]};
  assert.ok(a.restoreRitesRuntimeV77(f.state,"jungle-vey:7","jungle-vey",f.actors,elapsed,f.label,f.options));
  assert.equal(a.restoreRitesRuntimeV77(f.state,"jungle-vey:7","jungle-vey",f.actors,elapsed,f.label,{...f.options,supports:[]}),null);
  assert.equal(a.restoreRitesRuntimeV77(f.state,"jungle-vey:7","jungle-vey",f.actors,elapsed,f.label,{...f.options,maximumSpecimens:0}),null);
  f.options.world.platforms=[{x:c.x-10,y:c.y-40,width:20,height:20,collision:"solid"}];
  assert.equal(a.restoreRitesRuntimeV77(f.state,"jungle-vey:7","jungle-vey",f.actors,elapsed,f.label,f.options),null);
  f.options.world.platforms=[];
  const tampered=structuredClone(f.state);tampered.specimensV112[0].quality=1;
  assert.equal(a.restoreRitesRuntimeV77(tampered,"jungle-vey:7","jungle-vey",f.actors,elapsed,f.label,f.options),null);
  tampered.specimensV112=[null];assert.equal(a.normalizeRitesOfHuntV77(tampered,"jungle-vey:7","jungle-vey"),null);
});
test("socket authoring uses real structural geometry and excludes decoration, narrow supports and blocked space",()=>{
  const world={width:3000,floorY:624,platforms:[],climbables:[
    {id:"tree",x:400,y:240,width:132,height:384,kind:"tree"},
    {id:"vine",x:900,y:120,width:80,height:400,kind:"vine"},
    {id:"thin-tree",x:1200,y:240,width:40,height:384,kind:"tree"}]};
  const sockets=a.carcassSupportsForWorldV112(world);assert.equal(sockets.length,1);
  assert.equal(sockets[0].id,"carcass-socket:tree");
  world.platforms=[{x:sockets[0].x-20,y:sockets[0].y+10,width:40,height:80,collision:"solid"}];
  assert.equal(a.carcassSupportsForWorldV112(world).length,0);
  world.platforms=[];world.climbables=[];assert.equal(a.carcassSupportsForWorldV112(world).length,0);
});

test("legacy corpse anatomy is derived from its real actor rather than a universal fallback mass",()=>{
  const f=scene();const legacy=structuredClone(f.state);
  delete legacy.corpses[0].massKg;delete legacy.corpses[0].integrity;
  f.actors[0].riteIntegrityLossV112=20;
  const restored=a.restoreRitesRuntimeV77(legacy,"jungle-vey:7","jungle-vey",f.actors,legacy.elapsed,f.label,f.options);
  assert.ok(restored);assert.equal(restored.corpses[0].massKg,40);assert.equal(restored.corpses[0].integrity,80);
  assert.equal(legacy.corpses[0].massKg,undefined,"the incoming save is not mutated");
});
