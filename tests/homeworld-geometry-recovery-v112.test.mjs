import assert from 'node:assert/strict';
import test from 'node:test';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
import {createGeometryUpgradeFixtureV112} from './helpers/homeworld-geometry-upgrade-v112-route.mjs';

const fixture=await createGeometryUpgradeFixtureV112(),qa=homeworldSceneSsrV78();
const api=qa.load('app/game/systems/homeworldGeometryRecoveryV112.ts'),civic=qa.load('app/game/systems/homeworldCivicWorldV80.ts');
const plaque=qa.load('app/game/systems/homeworldArchivePlaqueV109.ts'),plaqueSchema=qa.load('app/game/systems/homeworldArchivePlaqueLedgerV109.ts');
const contextFor=f=>({ownerCreatedAt:f.owner,currentOwnerCreatedAt:f.owner,checkpoint:f.checkpoint,ledgers:f.ledgers,
  actor:f.remote||f.groundObject?f.historicalActor:f.expectedFallbackActor,levelId:'0',interiorId:null,active:true});
const context=contextFor(fixture),initialBytes=JSON.stringify(context);
const prepare=c=>{const result=api.planHomeworldGeometryRecoveryV112(c);assert(result.ok,result.reason);assert(result.plan);return result.plan;};
const storage=()=>{const map=new Map();return{map,getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};};

test('V112 reproduces the pinned old543-step occupied checkpoint then previews a local geometry migration without changing one input byte',()=>{
  assert.equal(fixture.oldNativeWalkSteps,543);assert(fixture.oldNativeWalkDistance>2900);
  assert(fixture.oldFree&&fixture.currentBlocked);
  const oldArrival=qa.load('app/game/systems/homeworldCargoArrivalV108.ts').resolveCargoArrivalV108(fixture.checkpoint,fixture.owner,undefined);
  assert.equal(oldArrival.restored,false);assert.equal(oldArrival.cargoRecoveryMessage,'');
  assert(api.homeworldGeometryRecoveryRequiredV112(context.checkpoint,context.ownerCreatedAt,context.ledgers));
  const plan=prepare(context);assert(plan.movesActor);assert.equal(plan.migrations.length,2);
  assert(plan.migrations.every(m=>Math.hypot(m.to.x-m.from.x,m.to.y-m.from.y)<=96.000001));
  assert(civic.homeworldCivicWalkableV80('0',plan.checkpoint.exterior));
  assert.equal(plan.backup.source,'new-local-geometry-position');
  assert.equal(plan.backup.originalCheckpointJson,JSON.stringify(context.checkpoint));
  assert.equal(plan.backup.originalLedgersJson,JSON.stringify(api.homeworldGeometryRecoveryLedgersV112(context.ledgers)));
  assert.equal(JSON.stringify(context),initialBytes,'preview grants no checkpoint, count, consent, object or walk');
});

test('V112 confirmation writes an exact readable backup before one atomic campaign write and makes real K17 resumption possible',()=>{
  const plan=prepare(context),disk=storage(),order=[];let saved;
  const transaction=api.createHomeworldGeometryRecoveryTransactionV112(()=>context,p=>{order.push('backup');return api.storeHomeworldGeometryRecoveryBackupV112(p,disk);},p=>{order.push('save');saved=p;return true;});
  const result=transaction(plan.key);assert(result.ok);assert.deepEqual(order,['backup','save']);
  assert.equal(disk.getItem(plan.backupKey),JSON.stringify(plan.backup));
  assert.deepEqual(JSON.parse(plan.backup.originalLedgersJson),context.ledgers);
  assert.equal(saved.ledgers.archivePlaqueV109.receipt.walked,fixture.oldOperationWalked);
  assert.deepEqual(saved.ledgers.archivePlaqueV109.receipt.objects,context.ledgers.archivePlaqueV109.receipt.objects);
  assert.equal(saved.ledgers.archivePlaqueV109.receipt.phase,'interrupted');
  const resumed=plaque.applyArchivePlaqueV109(saved.ledgers.archivePlaqueV109,'resume',saved.ledgers.archivePlaqueV109.revision,
    {ownerCreatedAt:fixture.owner,currentOwnerCreatedAt:fixture.owner,actor:saved.checkpoint.exterior,levelId:'0',visitedDistrictIds:['port'],active:true,artAvailable:true});
  assert(resumed.ok,resumed.message);assert.equal(resumed.ledger.receipt.phase,'working');
  assert.equal(resumed.ledger.receipt.walked,fixture.oldOperationWalked);
  assert.equal(JSON.stringify(context),initialBytes);
});

test('V112 quota, unreadable backup and conflicting retained bytes refuse before a campaign write; retry keeps the original copy',()=>{
  const plan=prepare(context);let writes=0;
  for(const disk of [{getItem:()=>null,setItem(){throw Error('QuotaExceededError');}}, {getItem:()=>null,setItem(){}}, {getItem:()=>'{"unrelated-old-copy":true}',setItem(){throw Error('must not overwrite');}}]){
    const result=api.createHomeworldGeometryRecoveryTransactionV112(()=>context,p=>api.storeHomeworldGeometryRecoveryBackupV112(p,disk),()=>{writes++;return true;})(plan.key);
    assert.equal(result.ok,false);assert(result.writeRefused);assert.equal(writes,0);
  }
  const disk=storage();let acknowledge=false;
  const transaction=api.createHomeworldGeometryRecoveryTransactionV112(()=>context,p=>api.storeHomeworldGeometryRecoveryBackupV112(p,disk),()=>{writes++;if(!acknowledge)throw Error('campaign quota');return true;});
  assert.equal(transaction(plan.key).ok,false);const exact=disk.getItem(plan.backupKey);assert.equal(exact,JSON.stringify(plan.backup));
  acknowledge=true;assert(transaction(plan.key).ok);assert.equal(disk.getItem(plan.backupKey),exact);assert.equal(writes,2);
});

test('V112 an owner, actor, document, availability or nonce change invalidates confirmation before it can mutate a campaign',()=>{
  const plan=prepare(context);let calls=0;
  for(const mutate of [c=>c.currentOwnerCreatedAt='2026-09-21T10:00:00.000Z',c=>c.actor.x++,c=>c.ledgers.archivePlaqueV109.revision++,c=>c.active=false,c=>c.inTransit=true]){
    const c=structuredClone(context);mutate(c);
    const result=api.createHomeworldGeometryRecoveryTransactionV112(()=>c,()=>{calls++;return true;},()=>{calls++;return true;})(plan.key);
    assert.equal(result.ok,false);
  }
  assert.equal(api.createHomeworldGeometryRecoveryTransactionV112(()=>context,()=>{calls++;return true;},()=>{calls++;return true;})('old-unrelated-plan-key').ok,false);
  assert.equal(calls,0);
  const c=structuredClone(context);
  const raced=api.createHomeworldGeometryRecoveryTransactionV112(()=>c,()=>{c.currentOwnerCreatedAt='2026-09-21T10:00:00.000Z';return true;},()=>{calls++;return true;})(plan.key);
  assert.equal(raced.ok,false);assert(raced.stale);assert.equal(calls,0);
});

test('V112 a genuinely free actor remains at its checkpoint while its remote interrupted study receives only a local anchor migration',async()=>{
  const remote=await createGeometryUpgradeFixtureV112(fixture.owner,{remote:true}),c=contextFor(remote),plan=prepare(c);
  assert.equal(plan.movesActor,false);assert.deepEqual(plan.checkpoint,remote.checkpoint);
  assert.equal(plan.migrations.length,1);assert.equal(plan.migrations[0].kind,'operation-last');
  assert.equal(plan.ledgers.archivePlaqueV109.receipt.walked,remote.oldOperationWalked);
  assert.deepEqual(plan.ledgers.archivePlaqueV109.receipt.objects,c.ledgers.archivePlaqueV109.receipt.objects);
  assert(Math.hypot(plan.ledgers.archivePlaqueV109.receipt.last.x-c.actor.x,plan.ledgers.archivePlaqueV109.receipt.last.y-c.actor.y)>2000,'remote study does not teleport the actor');
  const s=qa.load('app/game/save.ts').defaultSave(fixture.owner);s.homeworld={...s.homeworld,...plan.ledgers,locationV77:plan.checkpoint,visitedDistrictIds:['port']};
  const objective=qa.load('app/game/systems/homeworldObjectivesV111.ts').homeworldCurrentObjectiveV111(s);
  const route=qa.load('app/game/systems/homeworldWayfindingV112.ts').homeworldRoutePlanV112(s,{actor:c.actor,levelId:'0',interiorId:null},objective.destinationId);
  assert.equal(route.status,'reachable');assert.equal(route.stages.at(-1).radius,3);
  assert.deepEqual(route.stages.at(-1).points.at(-1),plan.ledgers.archivePlaqueV109.receipt.last);
});

test('V112 a genuinely parked and documented piece is migrated locally without moving its free owner or granting a pickup/provenance',async()=>{
  const dropped=await createGeometryUpgradeFixtureV112(fixture.owner,{groundObject:true}),c=contextFor(dropped),before=JSON.stringify(c),plan=prepare(c);
  assert.equal(plan.movesActor,false);assert.deepEqual(plan.checkpoint,c.checkpoint);
  assert.equal(plan.migrations.length,1);assert.equal(plan.migrations[0].kind,'ground-object');
  const old=c.ledgers.archivePlaqueV109.receipt,now=plan.ledgers.archivePlaqueV109.receipt;
  assert.equal(now.objects[0].id,old.objects[0].id);assert.equal(now.objects[0].place,'ground');assert.equal(now.carrier,null);
  assert.deepEqual(now.last,old.last);assert.equal(now.walked,old.walked);
  assert.deepEqual(now.observations,old.observations);assert.deepEqual(now.provenances,old.provenances);assert.deepEqual(now.lineIds,old.lineIds);
  assert(civic.homeworldCivicWalkableV80('0',{x:now.objects[0].x,y:now.objects[0].y+60}),'actual later pickup stand remains supported');
  assert(plaqueSchema.normalizeHomeworldArchivePlaqueV109(plan.ledgers.archivePlaqueV109));
  assert.equal(JSON.stringify(c),before);
});

test('V112 real resume within the admitted four-unit range attaches the exact active checkpoint without fabricating walking',()=>{
  const plan=prepare(context),adapter=qa.load('app/game/systems/homeworldArchiveResumeV112.ts'),old=plan.ledgers.archivePlaqueV109;
  const actor={x:old.receipt.last.x+1.25,y:old.receipt.last.y},c={ownerCreatedAt:fixture.owner,currentOwnerCreatedAt:fixture.owner,actor,levelId:'0',visitedDistrictIds:['port'],active:true,artAvailable:true};
  assert(civic.homeworldCivicWalkableV80('0',actor));
  const previous=JSON.stringify(old),historical=plaque.applyArchivePlaqueV109(old,'resume',old.revision,c);assert(historical.ok);
  const save=qa.load('app/game/save.ts').defaultSave(fixture.owner);
  save.homeworld={...save.homeworld,visitedDistrictIds:['port'],archivePlaqueV109:historical.ledger,
    locationV77:qa.load('app/game/systems/homeworldLocationV77.ts').createHomeworldCheckpointV77(fixture.owner,'0',actor,null,actor)};
  assert.equal(qa.load('app/game/save.ts').parseSaveImport(JSON.stringify(save)).save,null,'the former successful action could not be stored at the real nearby actor');
  const corrected=adapter.applyArchivePlaqueV112(old,'resume',old.revision,c);assert(corrected.ok,corrected.message);
  assert.deepEqual(corrected.ledger.receipt.last,actor);assert.equal(corrected.ledger.receipt.walked,old.receipt.walked);
  assert.deepEqual(corrected.ledger.receipt.objects,old.receipt.objects);save.homeworld.archivePlaqueV109=corrected.ledger;
  assert(qa.load('app/game/save.ts').parseSaveImport(JSON.stringify(save)).save,'strict Save12 guard remains satisfied');
  assert.equal(JSON.stringify(old),previous);
  for(const patch of [{actor:{x:actor.x+8,y:actor.y}},{currentOwnerCreatedAt:'2026-09-21T10:00:00.000Z'},{active:false}])assert.equal(adapter.applyArchivePlaqueV112(old,'resume',old.revision,{...c,...patch}).ok,false);
});
