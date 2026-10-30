import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
import {createGeometryUpgradeFixtureV112} from './helpers/homeworld-geometry-upgrade-v112-route.mjs';

const played=await createGeometryUpgradeFixtureV112(),qa=homeworldSceneSsrV78(),saves=qa.load('app/game/save.ts');
const modules=['homeworldGeometryRecoveryV112','homeworldWorldV77','homeworldCartographyLedgerV104','homeworldCartographyLedgerV105',
  'homeworldArchiveLedgerV106','homeworldArchiveComparisonLedgerV107','homeworldCargoLedgerV108','homeworldArchivePlaqueLedgerV109','homeworldArchiveContinuationLedgerV111'];
const api=Object.assign({},...modules.map(name=>qa.load('app/game/systems/'+name+'.ts')));
const source=await fs.readFile('app/game/HomeworldHub.tsx','utf8'),tree=ts.createSourceFile('HomeworldHub.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function callback(name,environment){
  let implementation;
  function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(tree)===name)implementation=ts.isCallExpression(node.initializer)&&node.initializer.expression.getText(tree)==='useCallback'?node.initializer.arguments[0]:node.initializer;ts.forEachChild(node,visit);}
  visit(tree);assert(implementation,'Execute actual Hub '+name);
  const compiled=ts.transpileModule('const handler='+implementation.getText(tree)+';',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
  return runInNewContext('(()=>{'+compiled+';return handler;})()',environment);
}
function incomingEffect(environment){
  let implementation;
  function visit(node){
    if(ts.isCallExpression(node)&&node.expression.getText(tree)==='useEffect'&&node.arguments[0]?.getText(tree).includes('GameClient also keys this component'))implementation=node.arguments[0];
    ts.forEachChild(node,visit);
  }
  visit(tree);assert(implementation,'execute the actual Hub incoming Save effect');
  return runInNewContext('('+ts.transpileModule(implementation.getText(tree),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText.replace(/;\s*$/,'')+')',environment);
}
const fields=[['cartographyDraftRefV104','cartographyV104','defaultHomeworldCartographyV104'],['cartographyDraftRefV105','cartographyV105','defaultHomeworldCartographyV105'],
 ['archiveDraftRefV106','archiveV106','defaultHomeworldArchiveV106'],['comparisonDraftRefV107','archiveComparisonV107','defaultHomeworldArchiveComparisonV107'],
 ['cargoDraftRefV108','cargoV108','defaultHomeworldCargoV108'],['plaqueDraftRefV109','archivePlaqueV109','defaultHomeworldArchivePlaqueV109'],
 ['continuationDraftRefV111','archiveContinuationV111','defaultHomeworldArchiveContinuationV111']];
function fixture(playedFixture=played){
  const values=new Map(),key='homeworld-geometry-recovery-v112',setters=[];let failure='none',attempts=0,writes=0,unreadable=0;
  const storage={getItem:name=>{if(name===key&&unreadable-->0)throw Error('readback unavailable once');return values.get(name)??null;},setItem(name,value){if(failure==='all-quota'||failure==='backup-quota'&&name!==key||failure==='save-quota'&&name===key)throw Error('QuotaExceededError');values.set(name,value);if(failure==='readback-once'&&name===key)unreadable=1;},removeItem:name=>values.delete(name)};
  const save=saves.defaultSave(playedFixture.owner);save.homeworld={...save.homeworld,...playedFixture.ledgers,locationV77:playedFixture.checkpoint,visitedDistrictIds:['port']};
  assert(saves.writeSaveWithStatus(save,storage,key).persisted);
  const env={...api,saveRef:{current:save},progressRef:{current:save.homeworld},localStorage:storage,
    upgradeRecoveryOwnerRefV112:{current:save.createdAt},upgradeRecoveryPendingRefV112:{current:true},upgradeRecoverySubmittedRefV112:{current:null},upgradeRecoveryFinishRefV112:{current:null},cargoMigrationWriteReadyRefV108:{current:false},cargoMigrationPendingRefV108:{current:true},cargoMigrationOnlyPendingV108:false,
    actorRef:{current:structuredClone(playedFixture.remote||playedFixture.groundObject?playedFixture.historicalActor:playedFixture.expectedFallbackActor)},
    exteriorAnchorRef:{current:structuredClone(playedFixture.remote||playedFixture.groundObject?playedFixture.historicalActor:playedFixture.expectedFallbackActor)},
    interiorRef:{current:null},levelRefV77:{current:'0'},transitRefV77:{current:null},skiffRefV77:{current:null},
    suspendedRef:{current:false},pausedRef:{current:true},paused:false,inactive:false,motionAssetsV74:{ready:true},document:{hidden:false,hasFocus:()=>true},
    spatialCodexOpenRef:{current:false},wayfindingOpenRefV75:{current:false},viewportRef:{current:{focus(){}}},clearInputs(){},
    pendingVisitOwnerRef:{current:save.createdAt},pendingVisitsRef:{current:new Set()},visitedAttempt:{current:null},
    setUpgradeRecoveryPlanV112:next=>{env.plan=next;},setUpgradeRecoveryMessageV112:next=>{env.message=next;},setUpgradeRecoveryWriteRefusedV112:next=>{env.writeRefused=next;},setAnnouncement:next=>{env.announcement=next;},
    setUpgradeRecoveryPendingV112:next=>{env.pending=next;},
    persistProgress(next){attempts++;if(failure==='throw')throw Error('save host threw before acknowledgement');const result=saves.writeSaveWithStatus({...save,homeworld:next},storage,key);if(result.persisted)writes++;return result.persisted;},
  };
  for(const [ref,field,def]of fields)env[ref]={current:save.homeworld[field]??api[def](save.createdAt)};
  for(const name of ['setArchiveViewV106','setComparisonViewV107','setCargoViewV108','setPlaqueViewV109','setContinuationViewV111','setActor','setInteriorId','setLevelIdV77','setElevationV77'])env[name]=value=>setters.push([name,value]);
  for(const name of ['cartographyWritePausedRefV104','cartographyWritePausedRefV105','archiveWritePausedRefV106','comparisonWritePausedRefV107','plaqueWritePausedRefV109','cargoWritePausedRefV108'])env[name]={current:false};
  for(const name of ['setPendingVisitCount','setWayfindingOpenV75','setWayfindingRequestV75','setCartographyWritePausedV104','setCartographyMessageV104','setCartographyWritePausedV105','setCartographyMessageV105','setArchiveWritePausedV106','setArchiveMessageV106','setComparisonWritePausedV107','setComparisonMessageV107','setPlaqueWritePausedV109','setPlaqueMessageV109','setCargoWritePausedV108','setCargoMessageV108'])env[name]=()=>{};
  for(const name of ['finishUpgradeRecoveryV112','upgradeRecoveryContextV112','prepareUpgradeRecoveryV112','confirmUpgradeRecoveryV112','onProgress'])env[name]=callback(name,env);
  env.upgradeRecoveryFinishRefV112.current=env.finishUpgradeRecoveryV112;
  env.importSave=incoming=>{env.save=incoming;incomingEffect(env)();};
  const references=()=>Object.fromEntries(['actorRef','exteriorAnchorRef','interiorRef','levelRefV77','progressRef',...fields.map(row=>row[0])].map(name=>[name,env[name].current]));
  return{env,storage,values,key,setters,references,mode:value=>{failure=value;},get attempts(){return attempts;},get writes(){return writes;}};
}

test('V112 actual Hub preview retains the occupied saved checkpoint and all seven draft/actor references while ordinary position saves remain blocked',()=>{
  const f=fixture(),before=f.references(),disk=f.values.get(f.key);
  assert.equal(f.env.onProgress(f.env.progressRef.current),false,'the existing acknowledged-save gate closes before any new ordinary write');
  f.env.prepareUpgradeRecoveryV112();assert(f.env.plan);assert.equal(f.env.plan.movesActor,true);
  for(const [name,value]of Object.entries(before))assert.equal(f.env[name].current,value,name);
  assert.equal(f.values.get(f.key),disk);assert.equal(f.attempts,0);assert.equal(f.setters.length,0);
  assert.equal([...f.values.keys()].filter(key=>key.startsWith(api.HOMEWORLD_GEOMETRY_RECOVERY_PREFIX_V112)).length,0,'preview creates no backup write either');
});

test('V112 actual Hub adopts only its submitted exact proposal when a successful write receives a delayed acknowledgement',()=>{
  const f=fixture();f.env.prepareUpgradeRecoveryV112();const plan=f.env.plan,before=f.references();f.mode('readback-once');f.env.confirmUpgradeRecoveryV112(plan.key);
  assert(f.env.upgradeRecoveryPendingRefV112.current);assert(f.env.upgradeRecoverySubmittedRefV112.current);
  for(const [name,value]of Object.entries(before))assert.equal(f.env[name].current,value,'uncertain ack '+name);
  const acknowledged=saves.parseSaveImport(f.values.get(f.key)).save;assert(acknowledged);
  assert.notDeepEqual(acknowledged.homeworld.locationV77,played.checkpoint,'the actual storage write succeeded before readback failed');
  f.mode('none');f.env.importSave(acknowledged);
  assert.equal(f.env.upgradeRecoveryPendingRefV112.current,false);assert.equal(f.env.upgradeRecoverySubmittedRefV112.current,null);
  assert.deepEqual({x:f.env.actorRef.current.x,y:f.env.actorRef.current.y},acknowledged.homeworld.locationV77.exterior);
  assert.equal(f.env.cargoMigrationWriteReadyRefV108.current,true);assert.equal(f.attempts,1,'a later acknowledgement does not repeat the campaign write');
  assert.equal(f.env.plan,null);assert.equal(f.env.writeRefused,false);
});

test('V112 an unrelated incoming Save or missing exact backup cannot acknowledge a submitted restoration',()=>{
  for(const variation of ['owner','checkpoint','document','backup']){
    const f=fixture();f.env.prepareUpgradeRecoveryV112();const plan=f.env.plan;f.mode('readback-once');f.env.confirmUpgradeRecoveryV112(plan.key);
    const incoming=saves.parseSaveImport(f.values.get(f.key)).save;assert(incoming);const actor=f.env.actorRef.current;
    if(variation==='owner')incoming.createdAt='2026-09-21T10:00:00.000Z';
    if(variation==='checkpoint')incoming.homeworld.locationV77.exterior.x++;
    if(variation==='document')incoming.homeworld.archivePlaqueV109.revision++;
    if(variation==='backup')f.values.set(plan.backupKey,'unrelated retained bytes');
    f.mode('none');f.env.importSave(incoming);
    assert(f.env.upgradeRecoveryPendingRefV112.current,variation);assert.equal(f.env.actorRef.current,actor,variation);
  }
});

test('V112 actual Hub backup/save quota and a throwing persistence host retain every actor, room, level and draft reference; retry commits once',()=>{
  for(const failure of ['backup-quota','save-quota','throw']){
    const f=fixture();f.env.prepareUpgradeRecoveryV112();const key=f.env.plan.key,before=f.references(),disk=f.values.get(f.key);
    f.mode(failure);f.env.confirmUpgradeRecoveryV112(key);
    for(const [name,value]of Object.entries(before))assert.equal(f.env[name].current,value,failure+' '+name);
    assert.equal(f.values.get(f.key),disk);assert.equal(f.writes,0);assert.equal(f.setters.length,0);assert(f.env.writeRefused);assert(f.env.upgradeRecoveryPendingRefV112.current);
    const copy=[...f.values.entries()].find(([key])=>key.startsWith(api.HOMEWORLD_GEOMETRY_RECOVERY_PREFIX_V112));
    if(failure==='backup-quota')assert.equal(f.attempts,0);else assert(copy,'a successful backup remains exact even when the campaign write refuses');
    f.mode('none');f.env.confirmUpgradeRecoveryV112(key);assert.equal(f.writes,1);assert.equal(f.env.upgradeRecoveryPendingRefV112.current,false);
    assert.equal(f.env.cargoMigrationWriteReadyRefV108.current,true);assert.equal(f.env.cargoMigrationPendingRefV108.current,false);
    const saved=saves.loadSave(f.storage,f.key);assert(saves.parseSaveImport(JSON.stringify(saved)).save);
    assert.equal(saved.homeworld.archivePlaqueV109.receipt.walked,played.oldOperationWalked);
    assert.deepEqual({x:f.env.actorRef.current.x,y:f.env.actorRef.current.y},saved.homeworld.archivePlaqueV109.receipt.last);
    if(copy)assert.equal(f.values.get(copy[0]),copy[1]);
    assert.equal(JSON.parse([...f.values.entries()].find(([key])=>key.startsWith(api.HOMEWORLD_GEOMETRY_RECOVERY_PREFIX_V112))[1]).originalCheckpointJson,JSON.stringify(played.checkpoint));
  }
});

test('V112 actual Hub delayed confirmation refuses owner replacement, a changed actor, hidden document or replaced operation bytes',()=>{
  for(const change of [f=>{f.env.saveRef.current={...f.env.saveRef.current,createdAt:'2026-09-21T10:00:00.000Z'};},
    f=>{f.env.actorRef.current={...f.env.actorRef.current,x:f.env.actorRef.current.x+.1};},f=>{f.env.document.hidden=true;},
    f=>{const save=structuredClone(f.env.saveRef.current);save.homeworld.archivePlaqueV109.revision++;f.env.saveRef.current=save;}]){
    const f=fixture();f.env.prepareUpgradeRecoveryV112();const key=f.env.plan.key,disk=f.values.get(f.key);change(f);const before=f.references();
    f.env.confirmUpgradeRecoveryV112(key);assert.equal(f.writes,0);assert.equal(f.attempts,0);assert.equal(f.values.get(f.key),disk);assert.equal(f.setters.length,0);
    for(const [name,value]of Object.entries(before))assert.equal(f.env[name].current,value,name);
  }
});

test('V112 actual Hub remote study and parked object confirmations preserve the exact free actor/room/level/checkpoint',async()=>{
  for(const options of [{remote:true},{groundObject:true}]){
    const playedFixture=await createGeometryUpgradeFixtureV112(played.owner,options),f=fixture(playedFixture);
    f.env.prepareUpgradeRecoveryV112();const before=f.references(),plan=f.env.plan;assert.equal(plan.movesActor,false);
    f.env.confirmUpgradeRecoveryV112(plan.key);assert.equal(f.writes,1);
    for(const ref of ['actorRef','exteriorAnchorRef','interiorRef','levelRefV77'])assert.equal(f.env[ref].current,before[ref],ref);
    assert(!f.setters.some(([name])=>['setActor','setInteriorId','setLevelIdV77','setElevationV77'].includes(name)));
    assert.deepEqual(saves.loadSave(f.storage,f.key).homeworld.locationV77,playedFixture.checkpoint);
  }
});
