import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import {build} from "esbuild";

const compiled=await build({stdin:{contents:[
  "anatomyHarvestV112","carcassSupportsV112","canopyTraversalV112",
  "harvestInventoryV112","huntAccessibilityV112","ritesOfHuntV77","huntRitesRuntimeV77",
].map(name=>'export * from "./app/game/systems/'+name+'";').join("\n")+
  '\nexport {defaultSave,normalizeSave,parseSaveImport} from "./app/game/save";',
  resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,platform:"node",format:"esm",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const source=JSON.parse(await fs.readFile(new URL("../docs/hunt-mechanics-v112.json",import.meta.url),"utf8"));
const rows=source.sheets.flatMap(sheet=>sheet.rows),byId=new Map(rows.map(row=>[row.id,row]));
const expectedSpeciesActions=Object.fromEntries([
  ["hell-hound-stalker cinder-12--hell-hound-stalker","hide tissue"],
  ["razorback-grazer nivalis-k--razorback-grazer","hide bone"],
  ["oseris-iv--vineback-grazer oseris-iv--mist-pouncer oseris-iv--mirror-chameleon naraka-delta--reed-cat nivalis-k--snow-prowler","hide tissue"],
  ["serekh-9--dust-jackal nivalis-k--glacier-ram cinder-12--basalt-ram serekh-9--salt-ram","hide bone"],
  ["xeno-drone common--wandering-xeno-drone oseris-iv--jungle-xeno-scout nivalis-k--frost-xeno cinder-12--scorch-xeno acheron-sigma--temple-xeno pelagos-m--swimmer-xeno xeno-praetorian","bone"],
  ["oseris-iv--needle-frog naraka-delta--lantern-toad pelagos-m--storm-eel naraka-delta--sludge-eel serekh-9--dune-strider mycora-v--spore-hound mycora-v--glow-moth","tissue"],
  ["bonecrest-ravager naraka-delta--iron-croc oseris-iv--thunder-macaque","hide bone"],
  ["amber-mire-lurker naraka-delta--bog-stalker naraka-delta--fen-leaper serekh-9--quill-lizard cinder-12--smoke-wyvern pelagos-m--hunter-manta nivalis-k--frost-manta","hide"],
  ["pelagos-m--razor-shark","hide tissue"],
].flatMap(([species,parts])=>species.split(" ").map(id=>[id,parts.split(" ")])));
const species=Object.keys(expectedSpeciesActions);
const partFields=part=>({label:part.label,massKg:part.massKg,volumeUnits:part.volumeUnits,
  seconds:part.seconds,fragility:part.fragility,requiresFlay:part.requiresFlay});
const documentedParts=row=>row.rule.split("\n").map(line=>{
  const match=/^(.+) : ([\d.]+) kg ; ([\d.]+) volume\(s\) ; ([\d.]+) s ; fragilité ([\d.]+) ; dépeçage (requis|non requis)$/.exec(line);
  assert.ok(match,"Every catalogue line must carry its complete physical/work contract: "+row.id);
  return {label:match[1],massKg:Number(match[2]),volumeUnits:Number(match[3]),
    seconds:Number(match[4]),fragility:Number(match[5]),requiresFlay:match[6]==="requis"};
});
const approximately=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-10,message+": "+actual+" != "+expected);
const parameter=number=>{
  const row=byId.get("PAR112-"+String(number).padStart(2,"0"));
  assert.ok(row,"Parameter identity remains available");assert.equal(typeof row.value,"number");return row;
};

test("every one of the 39 documented species has its exact compatible production parts and physical values",()=>{
  assert.equal(species.length,39);
  assert.deepEqual(Object.keys(api.ANATOMY_CATALOGUE_V112).sort(),[...species].sort());
  const catalogue=rows.filter(row=>/^CAT112-\d+$/.test(row.id)&&row.id!=="CAT112-00");
  assert.equal(catalogue.length,39);
  assert.deepEqual(catalogue.map(row=>row.topic).sort(),[...species].sort());
  let parts=0;
  for(const id of species){
    const actual=api.anatomyPartsV112(id),row=catalogue.find(entry=>entry.topic===id);
    assert.deepEqual(actual.map(part=>part.partId),expectedSpeciesActions[id],id+": compatibility");
    assert.deepEqual(actual.map(partFields),documentedParts(row),id+": all names, masses, volumes, durations, fragilities and preparation guards");
    for(const part of actual){
      assert.equal(part.action,"harvest-"+part.partId);
      assert.equal(part.requiresFlay,part.partId==="hide");
      assert.ok(part.massKg>0&&part.volumeUnits>0);
      assert.equal(api.RITE_DURATIONS_V77[part.action],part.seconds,"Preview and operation clock agree");
    }
    parts+=actual.length;
  }
  assert.equal(parts,56);
  for(const id of ["colonial-marine","weyland-synth","unknown-species","unknown--plant"]){
    assert.deepEqual(api.anatomyPartsV112(id),[]);
    for(const action of ["harvest-hide","harvest-tissue","harvest-bone"])
      assert.equal(api.makeAnatomySpecimenV112("jungle-vey:0","corpse",id,action,100,true),null);
  }
});

function scene(speciesId){
  const label=id=>id;
  const player={x:100,y:540,width:40,height:60,health:100,grounded:true,climbing:false};
  const actors=[{id:"body",archetype:speciesId,kind:"beast",x:110,y:540,width:40,height:60,
    health:0,maxHealth:100,alive:false,active:true,boss:false,riteDefeatedAt:1,riteIntegrityLossV112:20}];
  const f={player,actors,label,state:api.createRitesOfHuntV77("jungle-vey:0","jungle-vey"),options:{flayingToolOwned:true}};
  f.options.acceptSpecimen=item=>api.tryCarrySpecimenV112(f.state.specimensV112??[],item,"scout").ok;
  f.context=()=>api.riteRuntimeContextV77(f.state,player,actors,label,false,f.options);
  const context=f.context(),registration=api.registerRitePreyV77(f.state,context.prey[0],context);
  assert.equal(registration.accepted,true,registration.message);f.state=registration.state;
  return f;
}
function operate(f,action,{rejectAtCompletion=false}={}){
  const begin=api.startHuntRiteV77(f.state,"body",action,f.context());
  assert.equal(begin.accepted,true,begin.message);f.state=begin.state;
  const original=f.options.acceptSpecimen;
  if(rejectAtCompletion)f.options.acceptSpecimen=()=>false;
  let completion;
  for(let tick=0;tick<160&&f.state.operation;tick++){
    completion=api.stepHuntRiteV77(f.state,.05,f.context());f.state=completion.state;
  }
  f.options.acceptSpecimen=original;
  assert.equal(f.state.operation,null,"Bounded operation must finish");
  assert.equal(completion.accepted,!rejectAtCompletion,completion.message);
}
for(const id of species)test("finite anatomy, actual source restore and single campaign delivery: "+id,()=>{
  const f=scene(id),parts=api.anatomyPartsV112(id);
  for(const action of ["harvest-hide","harvest-tissue","harvest-bone"]){
    if(!parts.some(part=>part.action===action))
      assert.equal(api.startHuntRiteV77(f.state,"body",action,f.context()).accepted,false,"Absent part is unavailable");
  }
  for(const part of parts){
    f.options.flayingToolOwned=false;
    assert.equal(api.startHuntRiteV77(f.state,"body",part.action,f.context()).accepted,false,"No tool cannot harvest");
    f.options.flayingToolOwned=true;
    if(part.requiresFlay)assert.equal(api.startHuntRiteV77(f.state,"body",part.action,f.context()).accepted,false,"Hide requires preparation");
  }
  operate(f,"analyze");
  if(parts.some(part=>part.requiresFlay))operate(f,"flay");
  for(const part of parts){
    const count=f.state.specimensV112.length;
    operate(f,part.action,{rejectAtCompletion:true});
    assert.equal(f.state.specimensV112.length,count,"Last-tick refusal leaves the part in the corpse");
    assert.equal(f.state.completedEventIds.includes(part.action+":body"),false);
    const preview=api.huntRiteMenuSnapshotV77(f.state,f.context().actor,"body",true,f.options).parts.find(p=>p.action===part.action);
    assert.equal(preview.available,true);assert.equal(preview.seconds,part.seconds);
    assert.equal(preview.massKg,part.massKg);assert.equal(preview.volumeUnits,part.volumeUnits);
    operate(f,part.action);
    const item=f.state.specimensV112.at(-1);
    assert.equal(item.id,"jungle-vey:0:body:"+part.partId);
    assert.equal(item.sourceId,"jungle-vey:0:body");assert.equal(item.speciesId,id);
    assert.equal(item.massKg,part.massKg);assert.equal(item.volumeUnits,part.volumeUnits);
    assert.equal(item.quality,preview.quality);assert.equal(item.quality,Math.round(100-20*part.fragility));
    const restored=api.restoreRitesRuntimeV77(JSON.parse(JSON.stringify(f.state)),f.state.runId,f.state.missionId,
      f.actors,f.state.elapsed,f.label,f.options);
    assert.ok(restored,"Real defeated source admits its checkpoint");f.state=restored;
    const unchanged=structuredClone(f.state);
    assert.equal(api.startHuntRiteV77(f.state,"body",part.action,f.context()).accepted,false);
    assert.deepEqual(f.state,unchanged,"A consumed part cannot grow back after reload");
  }
  assert.equal(f.state.specimensV112.length,parts.length);
  const save=api.defaultSave();save.inventory.fieldToolIds=["flaying-tool"];
  const uses=f.state.completedEventIds.filter(event=>event==="flay:body"||event.startsWith("harvest-"))
    .map(event=>"jungle-vey:0:"+event);
  const delivered=api.deliverHarvestV112(save,f.state.specimensV112,uses,true,"jungle-vey",0);
  assert.equal(delivered.ok,true,delivered.reason);save.inventory=delivered.inventory;
  const imported=api.parseSaveImport(JSON.stringify(api.normalizeSave(save)));
  assert.ok(imported.save,"Actual campaign parser retains delivered source identities");
  assert.deepEqual(imported.save.inventory.harvestV112.specimens,f.state.specimensV112);
  const replay=api.deliverHarvestV112(imported.save,f.state.specimensV112,uses,true,"jungle-vey",0);
  assert.equal(replay.ok,true);assert.deepEqual(replay.inventory,imported.save.inventory,"Terminal replay grants no second specimen or wear");
});

test("all 33 documented V112 parameters agree with production constants or observed boundary behavior",()=>{
  const p=api.CANOPY_PHYSICS_V112;
  for(const [number,key] of [[1,"gravity"],[2,"minimumLength"],[3,"maximumAngle"],[4,"maximumSpeed"],
    [5,"pumpAcceleration"],[6,"damping"],[7,"lengthSpeed"],[8,"substepSeconds"]])
    approximately(p[key],parameter(number).value,parameter(number).id);
  assert.equal(p.maximumLength,2048);
  assert.match(parameter(2).unit,/plafond2048/);
  for(const [number,armor] of [[9,"scout"],[10,"hunter"],[11,"berserker"]]){
    const row=parameter(number),capacity=api.capacityForArmorV112(armor);
    assert.equal(capacity.massKg,row.value);
    assert.equal(capacity.volumeUnits,Number(/\/(\d+) vol/.exec(row.unit)[1]));
  }
  const full=api.fieldLoadV112([{massKg:24,volumeUnits:18}],"scout");
  for(const [number,key] of [[12,"movementMultiplier"],[13,"jumpMultiplier"],[14,"climbStaminaMultiplier"],[15,"noiseMultiplier"]])
    approximately(full[key],parameter(number).value,parameter(number).id);
  assert.equal(api.TOOL_WEAR_PER_COMPLETION_V112,parameter(16).value);
  approximately(api.flayingToolWorkMultiplierV112(0),parameter(17).value,"Blunt tool");
  const save=api.defaultSave();save.inventory.fieldToolIds=["flaying-tool"];save.profile.clanMarks=0;
  save.inventory.harvestV112.toolCondition=0;
  const repair=api.repairFieldToolV112(save);assert.equal(repair.ok,true);
  assert.equal(save.profile.clanMarks-repair.save.profile.clanMarks,parameter(18).value);
  assert.equal(api.HARVEST_DEPOT_LIMIT_V112,parameter(19).value);
  for(const [index,step] of api.CONSERVATION_STEPS_V112.entries()){
    const row=parameter(21+index);assert.equal(step.units,row.value);
    assert.equal(step.cost,Number(/\/(\d+) marques/.exec(row.unit)[1]));
  }
  assert.equal(api.CARCASS_SOCKET_RULES_V112.tree.maximumMass,parameter(26).value);
  assert.equal(api.CARCASS_SOCKET_RULES_V112.chain.maximumMass,parameter(27).value);
  for(const [number,kind] of [[26,"tree"],[27,"chain"]]){
    const dimensions=/\/(\d+) ×(\d+) px/.exec(parameter(number).unit),rule=api.CARCASS_SOCKET_RULES_V112[kind];
    assert.equal(rule.minimumWidth,Number(dimensions[1]));assert.equal(rule.minimumHeight,Number(dimensions[2]));
  }
  assert.equal(api.RITE_DURATIONS_V77.hang,parameter(28).value);
  const support={id:"actual-socket",x:0,y:100,suitable:true,maximumMass:170},world={platforms:[]};
  assert.equal(api.carcassSupportAccessibleV112({x:parameter(29).value,y:100},support,world),true);
  assert.equal(api.carcassSupportAccessibleV112({x:parameter(29).value+.001,y:100},support,world),false);
  assert.equal(api.CARCASS_HANG_DROP_V112,parameter(30).value);
  for(const [number,action] of [[31,"harvest-hide"],[32,"harvest-tissue"],[33,"harvest-bone"]]){
    assert.equal(api.RITE_DURATIONS_V77[action],parameter(number).value);
    for(const id of species)for(const part of api.anatomyPartsV112(id).filter(p=>p.action===action))
      assert.equal(part.seconds,parameter(number).value);
  }

  // The non-exported station limit is observed through the actual reducer.
  const limit=parameter(20).value;assert.equal(limit,16);
  let campaign=api.defaultSave();campaign.profile.clanMarks=100;
  campaign.inventory.harvestV112.specimens=Array.from({length:limit+1},(_,index)=>({
    ...api.makeAnatomySpecimenV112("jungle-vey:0","body-"+index,"hell-hound-stalker","harvest-hide",100,true),
  }));
  for(const item of campaign.inventory.harvestV112.specimens.slice(0,limit)){
    const start=api.startConservationV112(campaign,item.id);assert.equal(start.ok,true);campaign=start.save;
  }
  const before=structuredClone(campaign);
  assert.equal(api.startConservationV112(campaign,campaign.inventory.harvestV112.specimens.at(-1).id).ok,false);
  assert.deepEqual(campaign,before,"Station limit refuses before another cost or job");

  // Confirmation threshold is measured, not scraped from function text.
  const threshold=parameter(25).value;assert.equal(threshold,.35);
  let state=api.freshRitualAssistV112(),elapsed=0;
  while(elapsed<threshold-.001-1e-10){
    const delta=Math.min(.1,threshold-.001-elapsed);
    const result=api.stepRitualAssistV112(state,{cueKey:"one",phase:"cue",cueElapsedSeconds:1,
      deltaSeconds:delta,mode:"hold",timing:"normal",event:elapsed===0?"down":null});
    assert.equal(result.confirm,false);state=result.state;elapsed+=delta;
  }
  const accepted=api.stepRitualAssistV112(state,{cueKey:"one",phase:"cue",cueElapsedSeconds:1,
    deltaSeconds:.002,mode:"hold",timing:"normal",event:null});
  assert.equal(accepted.confirm,true);
  const repeated=api.stepRitualAssistV112(accepted.state,{cueKey:"one",phase:"cue",cueElapsedSeconds:1,
    deltaSeconds:.1,mode:"hold",timing:"normal",event:null});
  assert.equal(repeated.confirm,false,"A completed hold cannot produce another glyph automatically");
});
