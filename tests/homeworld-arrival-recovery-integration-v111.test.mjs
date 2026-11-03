import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
import {createLegacyArrivalRecoveryV111} from './helpers/arrival-recovery-v111-route.mjs';

const qa=homeworldSceneSsrV78(),owner='2026-10-26T10:00:00.000Z',saves=qa.load('app/game/save.ts');
const api=Object.assign({},...[
  'homeworldWorldV77','homeworldCity','homeworldInteriorsV64','homeworldWayfindingV75','homeworldLocationV77',
  'homeworldCartographyLedgerV104','homeworldCartographyLedgerV105','homeworldCartographyV105',
  'homeworldArchiveLedgerV106','homeworldArchiveV106','homeworldArchiveComparisonLedgerV107','homeworldArchiveComparisonV107',
  'homeworldCargoLedgerV108','homeworldCargoV108','homeworldArchivePlaqueLedgerV109','homeworldArchivePlaqueV109',
  'homeworldArchiveContinuationLedgerV111','homeworldArchiveContinuationV111','homeworldTransitionsV110',
  'homeworldArrivalRecoveryLedgerV111','homeworldArrivalRecoveryV111',
].map(name=>qa.load('app/game/systems/'+name+'.ts')));
const source=await fs.readFile('app/game/HomeworldHub.tsx','utf8');
const tree=ts.createSourceFile('HomeworldHub.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let original;
const played=()=>structuredClone(original??=createLegacyArrivalRecoveryV111(owner));

/** Execute the actual controller, including its temporary refs and finally
 * rollback. Only React setters, focus and the real save-storage adapter are
 * supplied; no recovery decision or checkpoint assignment is duplicated. */
function callback(name,environment){
  let implementation;
  function visit(node){
    if(ts.isVariableDeclaration(node)&&node.name.getText(tree)===name)implementation=ts.isCallExpression(node.initializer)
      &&node.initializer.expression.getText(tree)==='useCallback'?node.initializer.arguments[0]:node.initializer;
    ts.forEachChild(node,visit);
  }
  visit(tree);assert(implementation,'execute actual Hub '+name);
  const compiled=ts.transpileModule('const handler='+implementation.getText(tree)+';',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
  return runInNewContext('(()=>{'+compiled+';return handler;})()',environment);
}
function walkToExit(environment){
  const room=environment.interiorRef.current;
  const route=api.homeworldWayfindingInteriorRouteV75(room,environment.actorRef.current,'exit');assert.equal(route.status,'reachable');
  let actor=environment.actorRef.current;
  for(const point of route.points.slice(1)){
    let budget=1000;
    while(Math.hypot(point.x-actor.x,point.y-actor.y)>.01&&budget-->0){
      const previous=actor,span=Math.max(Math.abs(point.x-actor.x)/330,Math.abs(point.y-actor.y)/260,1/60);
      actor=api.stepHomeworldActorOnFloor(actor,{moveX:(point.x-actor.x)/(330*span),climb:(point.y-actor.y)/(260*span),jumpPressed:false},1/60,
        position=>api.isHomeworldInteriorWalkableV64(room,position),()=>previous);
      assert(Math.hypot(actor.x-previous.x,actor.y-previous.y)>0);
    }
    assert(Math.hypot(point.x-actor.x,point.y-actor.y)<=.01);
  }
  environment.actorRef.current=actor;
  assert.equal(api.nearestHomeworldInteriorTargetV64(room,actor)?.kind,'exit');
}
function fixture(){
  const state=played(),values=new Map(),key='arrival-recovery-controller-v111',setters=[],notifications=[];
  let mode='ok',writes=0,attempts=0;
  const storage={getItem:name=>values.get(name)??null,setItem(name,value){if(mode==='quota')throw Error('quota');values.set(name,value);},removeItem:name=>values.delete(name)};
  let save=saves.defaultSave(owner);save.homeworld.visitedDistrictIds=['port'];Object.assign(save.homeworld,state.ledgers,{locationV77:state.checkpoint});
  const first=saves.writeSaveWithStatus(save,storage,key);assert(first.persisted);save=first.save;
  const restored=api.resolveHomeworldLocationV77(save.homeworld.locationV77,owner);
  const env={...api,save,saveRef:{current:save},progressRef:{current:save.homeworld},
    actorRef:{current:restored.actor},exteriorAnchorRef:{current:restored.exterior},interiorRef:{current:state.room},levelRefV77:{current:'0'},
    transitRefV77:{current:null},skiffRefV77:{current:null},suspendedRef:{current:false},pausedRef:{current:false},dialogStateRef:{current:null},
    residentAdmissionRefV110:{current:{owner,active:true}},document:{hidden:false,hasFocus:()=>true},cargoMigrationWriteReadyRefV108:{current:true},
    cartographyDraftRefV104:{current:api.defaultHomeworldCartographyV104(owner)},cartographyDraftRefV105:{current:api.defaultHomeworldCartographyV105(owner)},
    archiveDraftRefV106:{current:api.defaultHomeworldArchiveV106(owner)},comparisonDraftRefV107:{current:api.defaultHomeworldArchiveComparisonV107(owner)},
    cargoDraftRefV108:{current:structuredClone(save.homeworld.cargoV108)},plaqueDraftRefV109:{current:api.defaultHomeworldArchivePlaqueV109(owner)},
    continuationDraftRefV111:{current:api.defaultHomeworldArchiveContinuationV111(owner)},
    viewportRef:{current:{focus(){}}},clearInputs(){},requestAnimationFrame(handler){handler();return 1;},
    setActor(actor){setters.push(['actor',actor]);},setInteriorId(id){setters.push(['room',id]);},setLevelIdV77(id){setters.push(['level',id]);},setElevationV77(value){setters.push(['elevation',value]);},
    setDialog(value){env.dialog=value;},setRecoveryPlanV111(value){env.plan=value;},setRecoveryMessageV111(value){env.message=value;},setRecoveryWriteRefusedV111(value){env.writeRefused=value;},
    setAnnouncement(value){env.announcement=value;},onNotify(value){notifications.push(value);},
    persistProgress(homeworld){
      attempts++;if(mode==='throw')throw Error('host write failed');
      const result=saves.writeSaveWithStatus({...env.saveRef.current,homeworld},storage,key);
      if(result.persisted){env.saveRef.current=result.save;writes++;}return result.persisted;
    },
  };
  for(const [name,version]of[['cartography','V104'],['cartography','V105'],['archive','V106'],['comparison','V107'],['cargo','V108'],['plaque','V109']])env[name+'WritePausedRef'+version]={current:false};
  for(const name of['setContinuationViewV111','setPlaqueViewV109','setPlaqueWritePausedV109','setCargoViewV108','setCargoWritePausedV108','setComparisonViewV107','setComparisonWritePausedV107','setArchiveViewV106','setArchiveWritePausedV106','setCartographyWritePausedV104','setCartographyWritePausedV105'])env[name]=()=>{};
  for(const name of['onProgress','recordLocationV77','recoveryContextV111','prepareRecoveryV111','confirmRecoveryV111','exitInterior'])env[name]=callback(name,env);
  return{env,state,values,key,storage,setters,notifications,mode(value){mode=value;},get writes(){return writes;},get attempts(){return attempts;}};
}
function consult(f){walkToExit(f.env);f.env.exitInterior();assert.equal(f.env.dialogStateRef.current?.recoveryV111?.owner,owner);f.env.prepareRecoveryV111();assert(f.env.plan);return f.env.plan.key;}

test('V111 actual Hub opens a read-only recovery at the walked exit, then atomically restores and reloads without changing cargo',()=>{
  const f=fixture(),{env}=f,before=f.values.get(f.key),cargo=JSON.stringify(env.progressRef.current.cargoV108),originalCheckpoint=JSON.stringify(env.progressRef.current.locationV77);
  const key=consult(f);
  assert.equal(f.writes,0);assert.equal(f.values.get(f.key),before);assert.equal(env.interiorRef.current.buildingId,f.state.room.buildingId);
  env.confirmRecoveryV111(key);assert.equal(f.writes,1);assert.equal(env.interiorRef.current,null);assert.equal(env.dialogStateRef.current,null);
  assert.equal(env.plan,null);assert.equal(env.writeRefused,false);assert(f.notifications.some(value=>/restauré/.test(value)));
  const loaded=saves.loadSave(f.storage,f.key),receipt=loaded.homeworld.arrivalRecoveryV111.receipt;
  assert.equal(receipt.originalCheckpointJson,originalCheckpoint);assert.equal(JSON.stringify(loaded.homeworld.cargoV108),cargo);
  assert.deepEqual(loaded.homeworld.locationV77.exterior,f.state.recordedExterior);assert.equal(loaded.homeworld.locationV77.interiorId,null);
  assert.equal(env.actorRef.current.x,f.state.recordedExterior.x);assert.equal(env.actorRef.current.y,f.state.recordedExterior.y);
  assert(f.setters.some(([name,value])=>name==='room'&&value===null));
  const restored=api.resolveHomeworldLocationV77(loaded.homeworld.locationV77,owner),after=api.stepHomeworldCargoActorV108(restored.actor,{moveX:0,climb:1,jumpPressed:false},1/60,'0',loaded.homeworld.cargoV108);
  assert(after.y>restored.actor.y);env.actorRef.current=after;assert.equal(env.recordLocationV77(),true);
  const continued=saves.loadSave(f.storage,f.key);assert.equal(JSON.stringify(continued.homeworld.arrivalRecoveryV111),JSON.stringify(loaded.homeworld.arrivalRecoveryV111));
  assert.equal(JSON.stringify(continued.homeworld.cargoV108),cargo);
});

test('V111 actual Hub rolls every temporary actor/room/level reference back on real quota refusal or a throwing save host',()=>{
  for(const failure of['quota','throw']){
    const f=fixture(),{env}=f,key=consult(f),durable=f.values.get(f.key),progress=env.progressRef.current;
    const refs={actor:env.actorRef.current,exterior:env.exteriorAnchorRef.current,room:env.interiorRef.current,level:env.levelRefV77.current};
    f.mode(failure);env.confirmRecoveryV111(key);
    assert.equal(env.actorRef.current,refs.actor);assert.equal(env.exteriorAnchorRef.current,refs.exterior);assert.equal(env.interiorRef.current,refs.room);assert.equal(env.levelRefV77.current,refs.level);
    assert.equal(env.progressRef.current,progress);assert.equal(f.values.get(f.key),durable);assert.equal(f.writes,0);assert.equal(f.setters.length,0);
    assert.equal(env.writeRefused,true);assert(env.plan);assert(env.dialogStateRef.current?.recoveryV111);assert.match(env.message,/pas été enregistrée/);
    f.mode('ok');env.confirmRecoveryV111(key);assert.equal(f.writes,1);assert.equal(env.interiorRef.current,null);
  }
});

test('V111 actual Hub refuses a delayed confirmation after local movement, owner replacement, pause or changed operation source',()=>{
  for(const change of[
    f=>{f.env.actorRef.current={...f.env.actorRef.current,x:f.env.actorRef.current.x+.1};},
    f=>{f.env.residentAdmissionRefV110.current.owner='2026-10-25T10:00:00.000Z';},
    f=>{f.env.pausedRef.current=true;},f=>{f.env.document.hidden=true;},
    f=>{f.env.progressRef.current={...f.env.progressRef.current,cargoV108:{...f.env.progressRef.current.cargoV108,revision:f.env.progressRef.current.cargoV108.revision+1}};},
  ]){
    const f=fixture(),key=consult(f),durable=f.values.get(f.key);change(f);
    f.env.confirmRecoveryV111(key);assert.equal(f.attempts,0);assert.equal(f.writes,0);assert.equal(f.values.get(f.key),durable);
    assert.equal(f.env.interiorRef.current.buildingId,f.state.room.buildingId);assert.equal(f.setters.length,0);
  }
});

test('V111 actual Hub rejects a source draft that would change the documents preserved by the preview',()=>{
  const f=fixture(),{env}=f,key=consult(f),durable=f.values.get(f.key),refs={actor:env.actorRef.current,exterior:env.exteriorAnchorRef.current,room:env.interiorRef.current};
  env.cargoDraftRefV108.current={...env.cargoDraftRefV108.current,receipt:{...env.cargoDraftRefV108.current.receipt,walked:env.cargoDraftRefV108.current.receipt.walked+1}};
  assert(api.normalizeHomeworldCargoV108(env.cargoDraftRefV108.current));
  env.confirmRecoveryV111(key);assert.equal(f.attempts,0);assert.equal(f.writes,0);assert.equal(f.values.get(f.key),durable);
  assert.equal(env.actorRef.current,refs.actor);assert.equal(env.exteriorAnchorRef.current,refs.exterior);assert.equal(env.interiorRef.current,refs.room);assert.equal(env.writeRefused,true);
});

test('V111 actual Hub preserves the other tab on a real same-owner storage conflict and leaves the recovery dialog retryable',()=>{
  const f=fixture(),{env}=f,key=consult(f),other=structuredClone(env.saveRef.current);other.profile.hunterName='Autre onglet';f.values.set(f.key,JSON.stringify(other));
  const durable=f.values.get(f.key),actor=env.actorRef.current,room=env.interiorRef.current;
  env.confirmRecoveryV111(key);assert.equal(f.writes,0);assert.equal(f.values.get(f.key),durable);assert.equal(env.actorRef.current,actor);assert.equal(env.interiorRef.current,room);assert.equal(env.writeRefused,true);
});
