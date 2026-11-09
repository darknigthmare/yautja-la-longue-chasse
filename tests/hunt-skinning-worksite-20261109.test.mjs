import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {build} from 'esbuild';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

// Deliberate unit fixtures: these proofs exercise the production rules and
// rendered menu. They do not claim a played hunt, artwork or physical device.
const compiled=await build({stdin:{contents:`
export * from './app/game/systems/ritesOfHuntV77';
export * from './app/game/systems/huntRitesRuntimeV77';
export * from './app/game/systems/harvestInventoryV112';
export * from './app/game/systems/anatomyHarvestV112';
export {default as Menu} from './app/game/HuntRitesMenuV77';
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',
  loader:{'.module.css':'empty'},external:['react','react/jsx-runtime','react-dom'],logLevel:'silent'});
const loaded={exports:{}};
runInNewContext(compiled.outputFiles[0].text,{module:loaded,exports:loaded.exports,require:createRequire(import.meta.url)});
const api=loaded.exports;
const plain=value=>JSON.parse(JSON.stringify(value));
function scene(condition=100,species='hell-hound-stalker'){
  const proof={id:'body',sourceEnemyId:species,label:'Proie de contrôle',kind:'beast',x:130,y:600,
    defeated:true,active:true,health:0,worthy:true,protectedPrey:false,defeatedAt:1,integrity:84,massKg:70};
  const facts={grounded:true,climbing:false,blocked:false,reachable:true,toolOwned:true};
  const supports=[{id:'hook',x:140,y:450,suitable:true,maximumMass:170}];
  let state=api.createRitesOfHuntV77('jungle-vey:9','jungle-vey');
  const uses=()=>state.completedEventIds.filter(id=>id.startsWith('flay:')||id.startsWith('harvest-')).length;
  const options=()=>({flayingToolOwned:facts.toolOwned,grounded:facts.grounded,climbing:facts.climbing,
    worksiteBlocked:()=>facts.blocked,worksiteReachable:()=>facts.reachable,supports,acceptSpecimen:()=>true,
    toolCondition:api.toolConditionAfterUsesV112(condition,uses()),
    toolWorkMultiplier:api.flayingToolWorkMultiplierV112(api.toolConditionAfterUsesV112(condition,uses()))});
  const context=()=>({runId:state.runId,missionId:state.missionId,actor:{x:120,y:600},health:100,suspended:false,
    prey:[proof],...options()});
  const registered=api.registerRitePreyV77(state,proof,context());assert.equal(registered.accepted,true);state=registered.state;
  const start=action=>{const result=api.startHuntRiteV77(state,'body',action,context(),{supportId:'hook'});state=result.state;return result;};
  const tick=(seconds=.05)=>{const result=api.stepHuntRiteV77(state,seconds,context());state=result.state;return result;};
  const complete=action=>{const result=start(action);assert.equal(result.accepted,true,result.message);
    for(let i=0;i<1000&&state.operation;i++)tick(.02);
    assert.equal(state.operation,null);};
  return {facts,options,context,start,tick,complete,uses,
    menu:()=>api.huntRiteMenuSnapshotV77(state,context().actor,'body',true,options()),
    get state(){return state},set state(value){state=value}};
}

test('preview and admission share live footing, climb and collision refusals for each physical action',()=>{
  for(const action of ['flay','harvest-tissue','carry','hang'])for(const changed of [
    {grounded:false},{climbing:true},{blocked:true},
  ]){
    const f=scene();
    if(action==='carry'||action==='hang')f.complete('flay');
    if(action==='hang')assert.equal(f.start('carry').accepted,true);
    Object.assign(f.facts,changed);
    const before=JSON.stringify(f.state),menu=f.menu();
    const previewReason=action==='flay'?menu.flayLockedReason:action==='carry'?menu.carryLockedReason:
      action==='hang'?menu.hangReason:menu.parts.find(part=>part.action===action).reason;
    assert.ok(previewReason,action+' must explain the unavailable worksite');
    const result=f.start(action);assert.equal(result.accepted,false,action);
    assert.equal(result.message,previewReason);
    assert.equal(JSON.stringify(f.state),before,'refused admission does not alter any body or receipt');
    assert.equal(action==='flay'?menu.canFlay:action==='carry'?menu.canCarry:action==='hang'?menu.canHang:
      menu.parts.find(part=>part.action===action).available,false);
  }
});

test('a changed worksite cancels a partly executed physical gesture without extraction or paid use',()=>{
  for(const action of ['flay','harvest-tissue','hang'])for(const changed of [
    {grounded:false},{climbing:true},{blocked:true},
  ]){
    const f=scene(40);
    if(action==='hang'){f.complete('flay');assert.equal(f.start('carry').accepted,true);}
    const before=plain(f.state),usesBefore=f.uses();
    assert.equal(f.start(action).accepted,true);f.tick();
    assert.ok(f.state.operation.elapsed>0);
    Object.assign(f.facts,changed);const interrupted=f.tick();
    assert.equal(interrupted.accepted,false);assert.equal(f.state.operation,null);
    assert.deepEqual(plain(f.state.completedEventIds),before.completedEventIds);
    assert.deepEqual(plain(f.state.specimensV112),before.specimensV112);
    assert.deepEqual(plain(f.state.corpses),before.corpses);
    assert.equal(f.uses(),usesBefore,'no completed-use receipt exists for the interrupted action');
    assert.equal(f.menu().tool.condition,api.toolConditionAfterUsesV112(40,usesBefore));
  }
});

test('preparation and extraction require free hands, while dropping remains possible at a blocked airborne worksite',()=>{
  const f=scene();f.complete('flay');assert.equal(f.start('carry').accepted,true);
  const menu=f.menu(),part=menu.parts.find(item=>item.action==='harvest-tissue');
  assert.equal(part.available,false);assert.match(part.reason,/libérer tes mains/);
  assert.equal(f.start('harvest-tissue').message,part.reason);
  const other={...f.state.corpses[0],id:'other',flayed:false};
  const direct=api.startHuntRiteV77({...f.state,corpses:[...f.state.corpses,other]},'other','flay',
    {...f.context(),prey:[...f.context().prey,{...f.context().prey[0],id:'other'}]});
  assert.equal(direct.accepted,false);assert.match(direct.message,/libérer tes mains/);
  Object.assign(f.facts,{grounded:false,climbing:true,blocked:true});
  assert.equal(f.menu().carrying,true);assert.equal(f.start('drop').accepted,true);
  assert.equal(f.state.carryingCorpseId,null);assert.equal(f.state.corpses.length,1);
});

test('tool contact gates preparation and extraction without reducing analysis or transport reach',()=>{
  for(const action of ['flay','harvest-tissue','harvest-hide']){
    const f=scene(40);
    if(action==='harvest-hide')f.complete('flay');
    f.facts.reachable=false;
    const menu=f.menu(),before=plain(f.state),reason=action==='flay'?menu.flayLockedReason:
      menu.parts.find(part=>part.action===action).reason;
    assert.match(reason,/Approche davantage la proie/);
    assert.equal(f.start(action).message,reason);assert.deepEqual(plain(f.state),before);
    f.facts.reachable=true;assert.equal(f.start(action).accepted,true);f.tick(.05);
    const usesBefore=f.uses();f.facts.reachable=false;
    assert.equal(f.tick().accepted,false);assert.equal(f.state.operation,null);
    assert.deepEqual(plain(f.state.specimensV112),before.specimensV112);assert.equal(f.uses(),usesBefore);
  }
  const f=scene();f.facts.reachable=false;
  f.complete('analyze');f.complete('mark');
  f.facts.reachable=true;f.complete('flay');f.facts.reachable=false;
  assert.equal(f.menu().canCarry,true);assert.equal(f.start('carry').accepted,true);
  assert.equal(f.menu().canHang,true);f.complete('hang');
});

test('tool preview and remaining operation time follow actual sharp, worn and blunt work duration',()=>{
  for(const condition of [100,40,0])for(const action of ['flay','harvest-tissue']){
    const f=scene(condition),before=f.menu();
    assert.equal(before.tool.condition,condition);assert.equal(before.tool.wearPerCompletion,5);
    assert.equal(before.tool.conditionAfterCompletion,Math.max(0,condition-5));
    assert.equal(f.start(action).accepted,true,'a blunt tool remains usable');
    let time=0;for(let i=0;i<20;i++){f.tick(.02);time+=.02;}
    const menu=f.menu(),expected=api.RITE_DURATIONS_V77[action]*api.flayingToolWorkMultiplierV112(condition);
    assert.ok(Math.abs(menu.operation.secondsTotal-expected)<1e-9);
    assert.ok(Math.abs(menu.operation.secondsRemaining-(expected-time))<1e-9);
    assert.ok(Math.abs(menu.operation.progress-time/expected)<1e-9);
    assert.equal(menu.operation.toolWear,5);assert.equal(menu.tool.condition,condition);
    const interrupted=api.stepHuntRiteV77(f.state,.05,{...f.context(),worksiteBlocked:()=>true});
    assert.equal(interrupted.state.operation,null);assert.equal(f.uses(),0);
    while(f.state.operation){f.tick(.02);time+=.02;}
    assert.ok(time>=expected-1e-8&&time<expected+.0200001);
    assert.equal(f.uses(),1);assert.equal(f.menu().tool.condition,Math.max(0,condition-5));
  }
});

test('analysis and suspension timers never inherit the worn-tool multiplier or consume tool uses',()=>{
  for(const action of ['analyze','mark','hang']){
    const f=scene(0);
    if(action==='hang'){f.complete('flay');assert.equal(f.start('carry').accepted,true);}
    const before=f.uses();assert.equal(f.start(action).accepted,true);f.tick(.05);
    assert.equal(f.menu().operation.secondsTotal,api.RITE_DURATIONS_V77[action]);
    assert.equal(f.menu().operation.toolWear,0);
    while(f.state.operation)f.tick(.05);
    assert.equal(f.uses(),before);
  }
});

test('every species part shares its catalogue work clock across preview, saved progress and actual completion',()=>{
  for(const [species,parts] of Object.entries(api.ANATOMY_CATALOGUE_V112))for(const part of parts){
    const f=scene(40,species);
    if(part.requiresFlay)f.complete('flay');
    const condition=f.menu().tool.condition,multiplier=api.flayingToolWorkMultiplierV112(condition);
    const expected=part.seconds*multiplier;
    assert.equal(api.riteOperationSecondsV77(part.action,species,multiplier),expected);
    assert.equal(f.menu().parts.find(value=>value.action===part.action).seconds,expected);
    assert.equal(f.start(part.action).accepted,true);f.tick(.02);
    assert.equal(f.menu().operation.secondsTotal,expected);
    assert.ok(api.normalizeRitesOfHuntV77(plain(f.state),f.state.runId,f.state.missionId),'saved in-progress anatomy retains its catalogue clock');
    let elapsed=.02;
    while(f.state.operation){f.tick(.02);elapsed+=.02;}
    assert.ok(elapsed>=expected-1e-8&&elapsed<expected+.0200001,species+':'+part.partId);
    assert.equal(f.state.specimensV112.at(-1).partId,part.partId);
  }
  for(const multiplier of [-5,1.65,9,NaN,Infinity]){
    assert.equal(api.riteOperationSecondsV77('analyze','hell-hound-stalker',multiplier),1.4);
    assert.ok(Number.isFinite(api.riteOperationSecondsV77('flay','hell-hound-stalker',multiplier)));
  }
});

test('finite anatomical stock is tied to irreversible source receipts and survives serialization',()=>{
  const f=scene();assert.deepEqual(plain(f.menu().stock),{total:2,remaining:2});
  f.complete('analyze');f.complete('flay');f.complete('harvest-hide');
  const expected=plain(f.state.specimensV112[0]);
  assert.deepEqual(plain(f.menu().stock),{total:2,remaining:1});
  assert.equal(f.menu().parts.find(part=>part.action==='harvest-hide').harvested,true);
  assert.equal(f.start('harvest-hide').accepted,false);
  const restored=api.normalizeRitesOfHuntV77(JSON.parse(JSON.stringify(f.state)),f.state.runId,f.state.missionId);
  assert.ok(restored);f.state=restored;
  assert.deepEqual(plain(f.state.specimensV112[0]),expected);
  assert.deepEqual(plain(f.menu().stock),{total:2,remaining:1});
  f.complete('harvest-tissue');assert.deepEqual(plain(f.menu().stock),{total:2,remaining:0});
  assert.equal(f.state.specimensV112.length,2);assert.equal(f.uses(),3);
});

test('the actual menu exposes physical refusals, tool cost, stock and a named progress control',()=>{
  const f=scene(40);f.facts.blocked=true;
  const markup=renderToStaticMarkup(createElement(api.Menu,{menu:f.menu(),onOpen(){},onClose(){},onAction(){}}));
  assert.match(markup,/data-rite-worksite-v112/);assert.match(markup,/Un obstacle sépare la proie/);
  assert.match(markup,/data-rite-tool-preview-v112/);assert.match(markup,/État : 40\/100/);
  assert.match(markup,/35\/100/);assert.match(markup,/Parties encore sur cette proie : 2 \/ 2/);
  const flay=/<button\b[^>]*data-rite-action-v112="flay"[^>]*>/.exec(markup)?.[0];
  assert.ok(flay);assert.match(flay,/disabled/);
  const described=/aria-describedby="([^"]+)"/.exec(flay)?.[1].split(' ');
  assert.equal(described.length,2);
  for(const id of described)assert.ok(markup.includes('id="'+id+'"'));
  f.facts.blocked=false;assert.equal(f.start('flay').accepted,true);f.tick(.05);
  const active=renderToStaticMarkup(createElement(api.Menu,{menu:f.menu(),onOpen(){},onClose(){},onAction(){}}));
  assert.match(active,/<progress[^>]*aria-label="Dépecer la carcasse"/);assert.match(active,/s restantes/);
  assert.match(active,/<strong role="status">Dépecer la carcasse<\/strong>/);
  assert.match(active,/<span aria-live="off">/);assert.match(active,/<progress aria-live="off"/);
  assert.match(active,/Interrompre le geste/);
});
