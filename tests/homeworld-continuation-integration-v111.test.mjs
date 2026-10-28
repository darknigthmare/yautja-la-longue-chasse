import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {archiveContinuationRouteV111} from './helpers/archive-continuation-v111-route.mjs';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
import {getHistoricalHomeworldExcelContextV111} from '../scripts/historical-excel-context-homeworld-v111.mjs';

const route=archiveContinuationRouteV111(),initial=structuredClone(route.state()),{qa,owner,b}=route;
const saves=qa.load('app/game/save.ts');
const {emptyHarvestInventoryV112}=qa.load('app/game/systems/harvestInventoryV112.ts');
const {normalizeHuntAccessibilityV112}=qa.load('app/game/systems/huntAccessibilityV112.ts');
const api=Object.assign({},...[
  'homeworldWorldV77','homeworldLocationV77','homeworldCartographyLedgerV104','homeworldCartographyV104',
  'homeworldCartographyLedgerV105','homeworldCartographyV105','homeworldArchiveLedgerV106','homeworldArchiveV106',
  'homeworldArchiveComparisonLedgerV107','homeworldArchiveComparisonV107','homeworldCargoLedgerV108','homeworldCargoV108',
  'homeworldArchivePlaqueLedgerV109','homeworldArchivePlaqueDefinitionV109','homeworldArchivePlaqueV109',
  'homeworldArchiveContinuationLedgerV111','homeworldArchiveContinuationV111',
].map(name=>qa.load('app/game/systems/'+name+'.ts')));
const source=await fs.readFile('app/game/HomeworldHub.tsx','utf8');
const tree=ts.createSourceFile('HomeworldHub.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function callback(name,environment){
  let implementation;
  function visit(node){
    if(ts.isVariableDeclaration(node)&&node.name.getText(tree)===name)implementation=ts.isCallExpression(node.initializer)&&node.initializer.expression.getText(tree)==='useCallback'?node.initializer.arguments[0]:node.initializer;
    ts.forEachChild(node,visit);
  }
  visit(tree);assert(implementation,'Execute actual Hub '+name);
  const compiled=ts.transpileModule('const handler='+implementation.getText(tree)+';',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
  return runInNewContext('(()=>{'+compiled+';return handler;})()',environment);
}
const prepared=new Map();
function stateAt(phase='working'){
  if(!prepared.has(phase)){
    route.restore(initial);
    if(phase==='offer')route.action('open');
    else if(phase==='completed')route.complete();
    else if(phase==='carried'){
      route.mismatch();route.action('interrupt',{active:false});route.action('resume');route.walkTo(b.objects[2].stand);
      for(const action of ['observe-fragment','copy-fragment','take-fragment'])route.action(action);
    }else{route.start();route.walkTo(b.supports[0].stand);}
    prepared.set(phase,structuredClone(route.state()));
  }
  return structuredClone(prepared.get(phase));
}
function campaign(state){
  const save=saves.defaultSave(owner);save.homeworld.visitedDistrictIds=['port'];
  save.homeworld.archivePlaqueV109=state.base;save.homeworld.archiveContinuationV111=state.ledger;
  save.homeworld.locationV77=api.createHomeworldCheckpointV77(owner,'0',state.actor,null,state.actor);
  return save;
}
function fixture(phase='working',state=stateAt(phase)){
  const values=new Map(),key='homeworld-continuation-v111';let quota=false,writes=0;
  const storage={getItem:name=>values.get(name)??null,setItem(name,value){if(quota)throw Error('quota');values.set(name,value);},removeItem:name=>values.delete(name)};
  const save=campaign(state);assert(saves.writeSaveWithStatus(save,storage,key).persisted);
  const env={...api,save,saveRef:{current:save},progressRef:{current:save.homeworld},
    actorRef:{current:state.actor},exteriorAnchorRef:{current:state.actor},interiorRef:{current:null},levelRefV77:{current:'0'},transitRefV77:{current:null},skiffRefV77:{current:null},
    residentAdmissionRefV110:{current:{owner,active:true}},cargoMigrationWriteReadyRefV108:{current:true},suspendedRef:{current:false},pausedRef:{current:false},motionAssetsV74:{ready:true},document:{hidden:false,hasFocus:()=>true},
    cartographyDraftRefV104:{current:api.defaultHomeworldCartographyV104(owner)},cartographyDraftRefV105:{current:api.defaultHomeworldCartographyV105(owner)},
    archiveDraftRefV106:{current:api.defaultHomeworldArchiveV106(owner)},comparisonDraftRefV107:{current:api.defaultHomeworldArchiveComparisonV107(owner)},
    cargoDraftRefV108:{current:api.defaultHomeworldCargoV108(owner)},plaqueDraftRefV109:{current:state.base},continuationDraftRefV111:{current:state.ledger},
    continuationViewV111:state.ledger,plaqueViewV109:state.base,plaqueWritePausedRefV109:{current:false},
    viewportRef:{current:{focus(){}}},clearInputs(){},setActor(){},setAnnouncement(){},onNotify(){},
    setPlaqueMessageV109(message){env.message=message;},
    setPlaqueWritePausedV109(value){env.pausedWrite=value;},
    persistProgress(homeworld){const result=saves.writeSaveWithStatus({...env.saveRef.current,homeworld},storage,key);if(result.persisted){env.saveRef.current=result.save;writes++;}return result.persisted;},
  };
  for(const [name,version] of [['cartography','V104'],['cartography','V105'],['archive','V106'],['comparison','V107'],['cargo','V108']])env[name+'WritePausedRef'+version]={current:false};
  for(const name of ['setContinuationViewV111','setPlaqueViewV109','setCargoViewV108','setCargoWritePausedV108','setComparisonViewV107','setComparisonWritePausedV107','setArchiveViewV106','setArchiveWritePausedV106','setCartographyWritePausedV104','setCartographyWritePausedV105'])env[name]=()=>{};
  for(const name of ['onProgress','recordLocationV77','cartographyContextV104','plaqueContextV109','continuationContextV111','plaqueWriteRefusedV109','submitContinuationV111','submitPlaqueV109','interruptPlaqueV109','samplePlaqueV109','actContinuationFromWorldV111','actPlaqueFromWorldV109'])env[name]=callback(name,env);
  if(source.includes('const submitEffectivePlaqueV111='))env.submitEffectivePlaqueV111=callback('submitEffectivePlaqueV111',env);
  return{env,state,values,key,storage,quota(value){quota=value;},get writes(){return writes;}};
}

test('V111 real Save import, write and load preserve B byte-exact across offer, active carry and completed continuation',()=>{
  for(const phase of ['offer','working','carried','completed']){
    const state=fixture(phase),before=JSON.stringify(state.state.base),loaded=saves.loadSaveWithStatus(state.storage,state.key);
    assert(loaded.loaded);assert.equal(loaded.source,'primary');assert.equal(JSON.stringify(loaded.save.homeworld.archivePlaqueV109),before);
    assert.deepEqual(loaded.save.homeworld.archiveContinuationV111,state.state.ledger);
    assert(saves.parseSaveImport(JSON.stringify(loaded.save)).save);
  }
});

test('V111 real Save rejects future, foreign, no-B, mutated-base and unsupported actor/object pairs before writing',()=>{
  const state=stateAt('carried'),valid=campaign(state);
  const patches=[value=>value.homeworld.archiveContinuationV111.version=2,value=>value.homeworld.archiveContinuationV111.ownerCreatedAt='2026-10-25T10:00:00.000Z',value=>delete value.homeworld.archivePlaqueV109,value=>value.homeworld.archivePlaqueV109.revision++,value=>value.homeworld.locationV77.exterior.x++,value=>delete value.homeworld.locationV77,value=>value.homeworld.visitedDistrictIds=[]];
  for(const [index,patch] of patches.entries()){
    const bad=structuredClone(valid);patch(bad);const result=saves.parseSaveImport(JSON.stringify(bad));assert.equal(result.failure,index===0?'future-version':'invalid-save');assert.equal(result.save,null);
  }
  const bad=structuredClone(valid),cargo=api.applyCargoActionV108(undefined,'choose-a',0,{...route.context(),actor:qa.load('app/game/systems/homeworldCargoDefinitionV108.ts').HOMEWORLD_CARGO_V108.post});
  assert(cargo.ok);bad.homeworld.cargoV108=cargo.ledger;assert.equal(saves.parseSaveImport(JSON.stringify(bad)).failure,'invalid-save');
});

test('V111 actual Hub sampler and onProgress persist the carried candidate with its new checkpoint without changing archived B',()=>{
  const state=fixture('carried'),{env}=state,baseBefore=JSON.stringify(env.plaqueDraftRefV109.current),previousRevision=env.continuationDraftRefV111.current.revision;
  const before={...env.actorRef.current},after=route.motor.stepHomeworldCargoActorV108(before,{moveX:.15,climb:0,jumpPressed:false},1/60,'0');
  assert(Math.hypot(after.x-before.x,after.y-before.y)>0);env.actorRef.current=after;
  assert.equal(env.samplePlaqueV109(before,after,1/60),true);assert.equal(env.onProgress(env.progressRef.current),true);
  const loaded=saves.loadSave(state.storage,state.key),receipt=loaded.homeworld.archiveContinuationV111.receipt.study.receipt;
  assert.equal(loaded.homeworld.archiveContinuationV111.revision,previousRevision+1);
  assert(Math.hypot(receipt.last.x-after.x,receipt.last.y-after.y)<.001);assert.deepEqual(receipt.objects[2].x,receipt.last.x);
  assert.equal(JSON.stringify(loaded.homeworld.archivePlaqueV109),baseBefore);assert.equal(loaded.homeworld.archiveContinuationV111.receipt.baseLedgerJson,baseBefore);
});

test('V111 actual Hub quota refusal freezes new actions without rewriting either durable receipt, then Retry can persist the same episode',()=>{
  const state=fixture(),{env}=state,before=state.values.get(state.key),current=JSON.stringify(env.continuationDraftRefV111.current),base=JSON.stringify(env.plaqueDraftRefV109.current);
  state.quota(true);assert.equal(env.submitContinuationV111('inspect-edge',env.continuationDraftRefV111.current.revision),false);
  assert.equal(state.values.get(state.key),before);assert.equal(JSON.stringify(env.continuationDraftRefV111.current),current);assert.equal(JSON.stringify(env.plaqueDraftRefV109.current),base);
  assert(env.plaqueWritePausedRefV109.current);assert.equal(state.writes,0);
  state.quota(false);assert.equal(env.submitContinuationV111('inspect-edge',env.continuationDraftRefV111.current.revision),false,'a retained control cannot clear the refused write without explicit Retry');
  assert.equal(env.onProgress(env.progressRef.current),true);assert.equal(env.plaqueWritePausedRefV109.current,false);
  assert.equal(env.submitContinuationV111('inspect-edge',env.continuationDraftRefV111.current.revision),true);
  assert(saves.loadSave(state.storage,state.key).homeworld.archiveContinuationV111.receipt.study.receipt.edgeObserved);
});

test('V111 actual Hub callbacks refuse replaced owners, stale outer revisions and an old legacy adapter',()=>{
  const state=fixture(),{env}=state,current=env.continuationDraftRefV111.current,old=JSON.stringify(current),base=JSON.stringify(env.plaqueDraftRefV109.current);
  assert.equal(env.submitContinuationV111('inspect-edge',current.revision-1),false);
  assert.equal(env.submitPlaqueV109('inspect-edge',current.receipt.study.revision),false,'a retained legacy callback cannot operate the later episode');
  env.saveRef.current={...env.saveRef.current,createdAt:'2026-10-25T10:00:00.000Z'};
  assert.equal(env.submitContinuationV111('inspect-edge',current.revision),false);assert.equal(env.onProgress(env.progressRef.current),false);
  assert.equal(JSON.stringify(env.continuationDraftRefV111.current),old);assert.equal(JSON.stringify(env.plaqueDraftRefV109.current),base);assert.equal(state.writes,0);
});

test('V111 continuation UI uses newly played source lines and binds its inner controls to the outer render revision',()=>{
  route.restore(initial);const component=qa.load('app/game/HomeworldArchiveContinuationV111.tsx').default,oldPanel=qa.load('app/game/HomeworldArchivePlaqueV111.tsx').default;
  for(const action of ['open','choose-a','reply']){
    route.action(action);const ledger=route.state().ledger,line=route.original.defs.HOMEWORLD_ARCHIVE_PLAQUE_LINES_V109.find(value=>value.id===ledger.receipt.lineIds.at(-1));
    const html=qa.render('app/game/HomeworldArchiveContinuationV111.tsx',{ledger,base:route.state().base,disabled:false,message:'',onAction:()=>false,onClose(){}});
    const escaped=line.text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');assert(html.includes(escaped));
  }
  const state=fixture(),{env}=state,old=structuredClone(env.continuationDraftRefV111.current);
  const rendered=component({ledger:old,base:state.state.base,disabled:false,message:'',onAction:env.submitContinuationV111,onClose(){}});
  const children=Array.isArray(rendered.props.children)?rendered.props.children:[rendered.props.children],panel=children.find(child=>child?.type===oldPanel);assert(panel);
  const newer=structuredClone(env.continuationDraftRefV111.current);newer.revision++;env.continuationDraftRefV111.current=newer;env.progressRef.current={...env.progressRef.current,archiveContinuationV111:newer};
  assert.equal(panel.props.onAction('inspect-edge',old.receipt.study.revision),false,'old rendered outer revision is refused even though inner revision is unchanged');
  assert.equal(state.writes,0);
});

test('V111 actual motor and render gates stop an interrupted carried candidate, despite its archived B being completed',()=>{
  const state=stateAt('carried'),paused=api.applyArchiveContinuationV111(state.ledger,'interrupt',state.ledger.revision,{...route.context(state.actor),basePlaque:state.base,active:false});assert(paused.ok);
  const ledger=paused.ledger,view=api.archiveContinuationViewV111(ledger),empty={receipt:null};
  let motorGuard,renderGuard;
  function visit(node){
    if(ts.isIfStatement(node)&&node.expression.getText(tree).includes('!handledAction')&&node.expression.getText(tree).includes('plaqueWritePausedRefV109'))motorGuard=node.expression;
    if(ts.isVariableDeclaration(node)&&node.name.getText(tree)==='blocked')renderGuard=node.initializer;
    ts.forEachChild(node,visit);
  }
  visit(tree);assert(motorGuard&&renderGuard);
  const environment={...api,active:true,handledAction:false,suspended:false,paused:false,inactive:false,dialog:null,spatialCodexOpen:false,wayfindingOpenV75:false,guideOptionsFocusedV111:false,transitV77:null,skiffV77:null,
    cargoMigrationPendingV108:false,motionAssetsV74:{ready:true},liftSessionOwnerV83:owner,save:{createdAt:owner},document:{hidden:false},
    suspendedRef:{current:false},pausedRef:{current:false},dialogStateRef:{current:null},plaqueDraftRefV109:{current:state.base},continuationDraftRefV111:{current:ledger},
    archiveDraftRefV106:{current:empty},comparisonDraftRefV107:{current:empty},cargoDraftRefV108:{current:empty},
    archiveViewV106:empty,comparisonViewV107:empty,cargoViewV108:empty,plaqueViewV109:state.base,plaqueEffectiveViewV111:view,plaqueLiveV111:view.receipt,continuationViewV111:ledger,
  };
  for(const [name,version]of[['cartography','V104'],['cartography','V105'],['archive','V106'],['comparison','V107'],['cargo','V108'],['plaque','V109']]){
    environment[name+'WritePaused'+version]=false;environment[name+'WritePausedRef'+version]={current:false};
  }
  assert.equal(state.base.receipt.phase,'completed');assert.equal(state.base.receipt.carrier,null);
  assert.equal(view.receipt.phase,'interrupted');assert.equal(view.receipt.carrier,'fragment');
  assert.equal(runInNewContext(motorGuard.getText(tree),environment),false,'the shipped motor gate cannot move past the retained fragment');
  assert.equal(runInNewContext(renderGuard.getText(tree),environment),true,'rendered world controls stay blocked until Resume or Park');
  const sampled=api.sampleArchiveContinuationWalkV111(ledger,state.actor,{...state.actor,x:state.actor.x+2},1/60,{...route.context(state.actor),basePlaque:state.base});
  assert.equal(sampled.ledger,ledger,'paused physical receipt itself never invents fragment movement');
});

test('V111 actual interact refuses an available doorway while A carries the fragment and B is completed',()=>{
  route.restore(stateAt('carried'));
  const geometry=qa.load('app/game/systems/homeworldGeometryV64.ts');
  const building=route.world.HOMEWORLD_BUILDINGS_V77.find(value=>value.id==='residence-port-2');assert(building);
  const steps=route.state().motorSteps;
  route.walkTo(geometry.homeworldBuildingDoorwayV64(building).approach);
  assert(route.state().motorSteps>steps,'the fragment reaches the doorway through the actual motor');
  const state=fixture('carried',structuredClone(route.state())),{env}=state,events=[];
  assert.equal(env.plaqueDraftRefV109.current.receipt.phase,'completed');
  assert.equal(env.plaqueDraftRefV109.current.receipt.carrier,null);
  assert.equal(env.continuationDraftRefV111.current.receipt.study.receipt.carrier,'fragment');
  assert.equal(api.nearestHomeworldDoorV77('0',env.actorRef.current)?.id,building.id,'the real doorway is available before interacting');
  assert.equal(api.nearestHomeworldConnectorV77('0',env.actorRef.current),null);
  Object.assign(env,qa.load('app/game/systems/homeworldCartographyDefinitionV105.ts'),qa.load('app/game/systems/homeworldCntlipPhysicalV77.ts'),{
    cargoMigrationPendingRefV108:{current:false},dialogStateRef:{current:null},
    clearInputs(){env.cleared=(env.cleared??0)+1;},
    setActor(){events.push('move');},setDialog(){events.push('dialog');},
    enterInterior(id){events.push('enter:'+id);},exitInterior(){events.push('exit');},
    openObservationV105(){return false;},
  });
  for(const name of ['cargoContextV108','comparisonContextV107','archiveContextV106','cartographyContextV105'])env[name]=callback(name,env);
  const interrupt=env.interruptPlaqueV109,progress=env.onProgress;
  env.interruptPlaqueV109=()=>{events.push('interrupt-plaque');return interrupt();};
  env.onProgress=next=>{events.push('progress');return progress(next);};
  for(const name of ['interruptCargoV108','interruptComparisonV107','interruptArchiveV106','interruptCartographyV104','interruptCartographyV105'])env[name]=()=>{events.push(name);return true;};
  const actor=env.actorRef.current,actorJson=JSON.stringify(actor),baseJson=JSON.stringify(env.plaqueDraftRefV109.current),continuationJson=JSON.stringify(env.continuationDraftRefV111.current),durable=[...state.values];
  callback('interact',env)();
  assert.deepEqual(events,[],'carrying cannot dispatch an interruption, write, room/activity entry or actor movement');
  assert.equal(env.cleared,1);assert.match(env.message,/Dépose la pièce/);
  assert.equal(env.actorRef.current,actor);assert.equal(JSON.stringify(env.actorRef.current),actorJson);
  assert.equal(env.interiorRef.current,null);assert.equal(env.dialogStateRef.current,null);
  assert.equal(JSON.stringify(env.plaqueDraftRefV109.current),baseJson);
  assert.equal(JSON.stringify(env.continuationDraftRefV111.current),continuationJson);
  assert.deepEqual([...state.values],durable);assert.equal(state.writes,0);
});

test('V111 Save11 to12 preserves the genuine V110 campaign and B document while initializing additive hunting defaults',async()=>{
  const history=await getHistoricalHomeworldExcelContextV111(),old=homeworldSceneSsrV78(history.root).load('app/game/save.ts');
  assert.equal(old.SAVE_VERSION,11);assert.equal(saves.SAVE_VERSION,12);
  const state=stateAt('working'),legacy=old.defaultSave(owner);
  legacy.profile.hunterName='Migration · constat B conservé';legacy.settings.masterVolume=.37;
  legacy.homeworld.visitedDistrictIds=['port'];legacy.homeworld.archivePlaqueV109=state.base;
  const oldLocation=homeworldSceneSsrV78(history.root).load('app/game/systems/homeworldLocationV77.ts');
  legacy.homeworld.locationV77=oldLocation.createHomeworldCheckpointV77(owner,'0',state.actor,null,state.actor);
  const previous=old.parseSaveImport(JSON.stringify(legacy)).save;assert(previous);
  const migrated=saves.parseSaveImport(JSON.stringify(previous)).save;assert(migrated);
  assert.deepEqual(migrated,{...previous,version:12,
    inventory:{...previous.inventory,fieldToolIds:[],harvestV112:emptyHarvestInventoryV112()},
    settings:{...previous.settings,huntAccessibility:normalizeHuntAccessibilityV112(undefined)},
  },'every pre-existing campaign field survives; additive hunting inventory and accessibility use their real production defaults');
  assert.equal(JSON.stringify(migrated.homeworld.archivePlaqueV109),JSON.stringify(previous.homeworld.archivePlaqueV109));
  assert.equal(migrated.homeworld.archiveContinuationV111,undefined,'migration does not create or auto-start an A continuation');
});

test('V111 actual V110 client treats a12 campaign as future and cannot drop its new continuation or overwrite its bytes',async()=>{
  const history=await getHistoricalHomeworldExcelContextV111(),old=homeworldSceneSsrV78(history.root).load('app/game/save.ts'),values=new Map(),key='v111-downgrade-protection';
  const storage={getItem:name=>values.get(name)??null,setItem:(name,value)=>values.set(name,value),removeItem:name=>values.delete(name)};
  const actual=campaign(stateAt('carried')),previous=structuredClone(actual);previous.version=11;delete previous.homeworld.archiveContinuationV111;
  assert(old.writeSaveWithStatus(previous,storage,key).persisted);assert(saves.loadSaveWithStatus(storage,key).loaded);
  assert.equal(actual.version,12);assert(saves.writeSaveWithStatus(actual,storage,key).persisted);
  const exact=values.get(key);assert.equal(old.parseSaveImport(exact).failure,'future-version');
  const denied=old.loadSaveWithStatus(storage,key);assert.equal(denied.failure,'future-version');assert.equal(denied.loaded,false);
  assert.equal(old.writeSaveWithStatus(denied.save,storage,key).persisted,false);
  assert.equal(old.writeSaveWithStatus(actual,storage,key).persisted,false);
  assert.equal(values.get(key),exact,'the older client cannot erase the continued study through its normal load/write APIs');
  assert(saves.loadSaveWithStatus(storage,key).loaded);
});

test('V111 integrated main keeps a real field-tool purchase through Save11 migration and a quota-refused B to A continuation write',()=>{
  const tools=qa.load('app/game/systems/fieldToolsV111.ts'),state=stateAt('working');
  const legacy=campaign(state);legacy.version=11;delete legacy.homeworld.archiveContinuationV111;
  legacy.profile.clanMarks=240;
  // PR21 kept campaign schema11. Declare that pre-continuation shape before
  // buying through its unchanged production purchase function.
  const purchase=tools.purchaseFieldToolV111(legacy,'flaying-tool');
  assert(purchase.ok);assert.equal(purchase.save.version,11);assert.equal(purchase.spentClanMarks,120);
  assert.equal(purchase.save.profile.clanMarks,120);assert.deepEqual(purchase.save.inventory.fieldToolIds,['flaying-tool']);
  assert.equal(purchase.save.homeworld.archiveContinuationV111,undefined);
  const migrated=saves.parseSaveImport(JSON.stringify(purchase.save));assert.equal(migrated.failure,null);
  assert.equal(migrated.save.version,12);assert.deepEqual(migrated.save.inventory.fieldToolIds,['flaying-tool']);
  assert.equal(migrated.save.profile.clanMarks,120);assert.deepEqual(migrated.save.loadout,purchase.save.loadout);
  assert.equal(JSON.stringify(migrated.save.homeworld.archivePlaqueV109),JSON.stringify(state.base));
  assert.equal(migrated.save.homeworld.archiveContinuationV111,undefined,'migration does not invent a continuation alongside the purchased tool');
  const combined={...migrated.save,homeworld:{...migrated.save.homeworld,archiveContinuationV111:state.ledger}};
  const baseJson=JSON.stringify(combined.homeworld.archivePlaqueV109),continuationJson=JSON.stringify(combined.homeworld.archiveContinuationV111);
  const values=new Map(),key='v111-integrated-main';let quota=false;
  const storage={getItem:name=>values.get(name)??null,setItem(name,value){if(quota)throw Error('quota');values.set(name,value);},removeItem:name=>values.delete(name)};
  assert(saves.writeSaveWithStatus(combined,storage,key).persisted);
  const loaded=saves.loadSaveWithStatus(storage,key);assert(loaded.loaded);
  assert.equal(JSON.stringify(loaded.save.homeworld.archivePlaqueV109),baseJson);
  assert.equal(JSON.stringify(loaded.save.homeworld.archiveContinuationV111),continuationJson);
  assert.deepEqual(loaded.save.inventory.fieldToolIds,['flaying-tool']);assert.equal(loaded.save.profile.clanMarks,120);
  const action=api.applyArchiveContinuationV111(loaded.save.homeworld.archiveContinuationV111,'inspect-edge',state.ledger.revision,{...route.context(state.actor),basePlaque:state.base});
  assert(action.ok&&action.changed);
  const candidate={...loaded.save,homeworld:{...loaded.save.homeworld,archiveContinuationV111:action.ledger}};
  const inputBefore=JSON.stringify(candidate),durableBefore=[...values];
  quota=true;const refused=saves.writeSaveWithStatus(candidate,storage,key);
  assert.equal(refused.persisted,false);assert.equal(refused.failure,'write-failed');
  assert.deepEqual([...values],durableBefore,'quota does not change either durable document, tool ownership, marks or backup');
  assert.equal(JSON.stringify(candidate),inputBefore,'a refused durable write does not mutate the proposed campaign');
  const reloaded=saves.loadSaveWithStatus(storage,key);assert(reloaded.loaded);
  assert.equal(JSON.stringify(reloaded.save.homeworld.archivePlaqueV109),baseJson);
  assert.equal(JSON.stringify(reloaded.save.homeworld.archiveContinuationV111),continuationJson);
  assert.deepEqual(reloaded.save.inventory.fieldToolIds,['flaying-tool']);assert.equal(reloaded.save.profile.clanMarks,120);
  quota=false;assert(saves.writeSaveWithStatus(candidate,storage,key).persisted);
  const retried=saves.loadSaveWithStatus(storage,key);assert(retried.loaded);
  assert.equal(JSON.stringify(retried.save.homeworld.archivePlaqueV109),baseJson);
  assert.deepEqual(retried.save.inventory.fieldToolIds,['flaying-tool']);assert.equal(retried.save.profile.clanMarks,120);
  assert(retried.save.homeworld.archiveContinuationV111.receipt.study.receipt.edgeObserved);
});
