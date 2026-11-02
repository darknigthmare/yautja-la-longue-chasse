import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
import {createGeometryUpgradeFixtureV112} from './helpers/homeworld-geometry-upgrade-v112-route.mjs';

const qa=homeworldSceneSsrV78(),load=name=>qa.load('app/game/systems/'+name+'.ts');
const api=load('homeworldGeometryRecoveryV112'),cargo=load('homeworldCargoV108');
const directory=new URL('./fixtures/homeworld-upgrade-v112/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',directory),'utf8'));
const fixtures=manifest.fixtures.map(row=>{
  const bytes=fs.readFileSync(new URL(row.path,directory));assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);
  const raw=JSON.parse(bytes),f=raw.ledger?{...raw,owner:raw.ownerCreatedAt,ledgers:{cartographyV104:raw.ledger},actor:raw.actorAtSavedCheckpoint}:raw;
  return{name:row.path,expectedRecovery:row.expectedRecovery!==false,...f};
});
const contextFor=f=>({ownerCreatedAt:f.owner,currentOwnerCreatedAt:f.owner,checkpoint:f.checkpoint,ledgers:f.ledgers,
  actor:load('homeworldCivicWorldV80').homeworldCivicWalkableV80('0',f.actor)?f.actor:load('homeworldWorldV77').createHomeworldWorldActorV77(),levelId:'0',interiorId:null,active:true});
const receipt=(ledgers,key)=>key==='archiveContinuationV111'?ledgers[key].receipt.study.receipt:ledgers[key].receipt;
function validSave(owner,ledgers,checkpoint){
  const save=qa.load('app/game/save.ts').defaultSave(owner);save.homeworld={...save.homeworld,...ledgers,locationV77:checkpoint,visitedDistrictIds:['port']};
  const out=qa.load('app/game/save.ts').parseSaveImport(JSON.stringify(save));assert(out.save,out.failure);return out.save;
}

/** Synthetic geometry only: wrap the public queries in an isolated module
 * graph with the measured hull at the marker’s retired position. This does not mount
 * it in the game, modify the authentic receipt, or claim a historical play.
 * Every native collision remains active; the former-ground query is unchanged.
 */
function syntheticBlockedCartographyGeometry(){
  const isolated=homeworldSceneSsrV78(),read=name=>isolated.load('app/game/systems/'+name+'.ts');
  const civic=read('homeworldCivicWorldV80'),places=read('homeworldPublicPlacesV112');
  const marker=places.HOMEWORLD_PUBLIC_PLACE_CANDIDATES_V112.find(p=>p.id==='public-place-v112:register-marker');
  assert(marker);const candidate={...marker,x:6140,y:5020};
  assert(!places.HOMEWORLD_PUBLIC_PLACES_V112.some(p=>p.id===candidate.id&&p.x===candidate.x&&p.y===candidate.y));
  const polygon=places.homeworldPublicPlacePolygonV112(candidate),overlap=read('homeworldStreetDecorV83').homeworldStreetDecorOverlapV83;
  const nativeCollision=places.homeworldPublicPlaceCollisionV112,nativeWalkable=civic.homeworldCivicWalkableV80;
  const obstacleId='synthetic-test-only:retired-register-marker';
  const addedCollision=(level,p,body={halfWidth:24,halfDepth:14})=>{
    if(level!=='0')return null;
    const box=[{x:p.x-body.halfWidth,y:p.y-body.halfDepth},{x:p.x+body.halfWidth,y:p.y-body.halfDepth},
      {x:p.x+body.halfWidth,y:p.y+body.halfDepth},{x:p.x-body.halfWidth,y:p.y+body.halfDepth}];
    return overlap(polygon,box)?obstacleId:null;
  };
  places.homeworldPublicPlaceCollisionV112=(level,p,body)=>nativeCollision(level,p,body)??addedCollision(level,p,body);
  civic.homeworldCivicWalkableV80=(level,p,body)=>nativeWalkable(level,p,body)&&!addedCollision(level,p,body);
  return{api:read('homeworldGeometryRecoveryV112'),civic,obstacleId};
}

for(const f of fixtures)test('V112 genuine played receipt '+f.name+' preserves coupled documents and exact original bytes',()=>{
  assert((f.oldNativeSteps??f.oldNativeWalkSteps)>0);
  validSave(f.owner,f.ledgers,f.checkpoint);
  const context=contextFor(f),before=JSON.stringify(context),inspection=api.planHomeworldGeometryRecoveryV112(context);
  if(f.name==='v112-v104-played-blocked-fixture.json'){
    // The repaired placement policy keeps this authentic old checkpoint free.
    // There is no migration to confirm and no reason to rewrite its documents.
    assert.equal(api.homeworldGeometryRecoveryRequiredV112(f.checkpoint,f.owner,f.ledgers),false);
    assert.equal(inspection.ok,false);assert.equal(inspection.plan,null);
    assert.match(inspection.reason,/Aucun point ou objet incomplet n’est occupé/);
    const restored=load('homeworldCargoArrivalV108').resolveCargoArrivalV108(f.checkpoint,f.owner,undefined,f.ledgers);
    assert.equal(restored.restored,true);assert.equal(restored.migrationBackup,null);
    assert.deepEqual(restored.migratedLedgers,{});
    assert.deepEqual({x:restored.actor.x,y:restored.actor.y},{x:f.actor.x,y:f.actor.y});
    assert.deepEqual(validSave(f.owner,f.ledgers,f.checkpoint).homeworld.cartographyV104,f.ledgers.cartographyV104);
    const civic=load('homeworldCivicWorldV80'),cartography=load('homeworldCartographyV104');
    const next=civic.stepHomeworldCivicActorV80(restored.actor,{moveX:0,climb:1,jumpPressed:false},1/60,'0');
    const travelled=Math.hypot(next.x-restored.actor.x,next.y-restored.actor.y);assert(travelled>.000001);
    const sample=cartography.sampleCartographyWalkV104(f.ledgers.cartographyV104,restored.actor,next,1/60,
      {...context,actor:next,visitedDistrictIds:['port']});
    assert.equal(sample.invalid,false);
    assert(Math.abs(sample.ledger.receipt.walked-f.ledgers.cartographyV104.receipt.walked-travelled)<.000001);
    assert.equal(sample.ledger.receipt.nextWaypoint,f.ledgers.cartographyV104.receipt.nextWaypoint);
    assert.equal(sample.ledger.receipt.interruptedCount,f.ledgers.cartographyV104.receipt.interruptedCount);
    assert.deepEqual(sample.ledger.receipt.trailBreaks,f.ledgers.cartographyV104.receipt.trailBreaks);
    assert.equal(JSON.stringify(context),before,'normal restoration and real walking cannot mutate fixture bytes');
    return;
  }
  if(!f.expectedRecovery){
    // Keep the original played receipt byte-identical. Moving only the new
    // register marker frees both earlier points, so no migration is due.
    const preservedSteps={'v112-v104-played-blocked-fixture.json':56,'v112-reviewed-v104-register-marker-fixture.json':72};
    assert(Object.hasOwn(preservedSteps,f.name));assert.equal(f.oldNativeSteps,preservedSteps[f.name]);
    assert.equal(load('homeworldCivicWorldV80').homeworldCivicWalkableV80('0',f.checkpoint.exterior),true);
    assert.equal(load('homeworldCivicWorldV80').homeworldCivicWalkableV80('0',f.ledgers.cartographyV104.receipt.last),true);
    assert.equal(api.homeworldGeometryRecoveryRequiredV112(f.checkpoint,f.owner,f.ledgers),false);
    assert.equal(inspection.ok,false);assert.equal(inspection.plan,null);
    assert.equal(JSON.stringify(context),before);return;
  }
  assert(inspection.ok,inspection.reason);const plan=inspection.plan;
  assert(plan.migrations.every(m=>Math.hypot(m.to.x-m.from.x,m.to.y-m.from.y)<=96.000001));
  assert.equal(plan.backup.originalCheckpointJson,JSON.stringify(f.checkpoint));
  assert.equal(plan.backup.originalLedgersJson,JSON.stringify(f.ledgers));
  assert.equal(api.homeworldGeometryRecoveryRequiredV112(plan.checkpoint,f.owner,plan.ledgers),false);
  validSave(f.owner,plan.ledgers,plan.checkpoint);
  for(const key of Object.keys(f.ledgers)){
    const old=receipt(f.ledgers,key),now=receipt(plan.ledgers,key);
    if(old.phase==='completed')assert.deepEqual(plan.ledgers[key],f.ledgers[key],'completed B or prerequisite remains byte-exact');
    else{
      assert.equal(now.phase,'interrupted','a geometry migration requires a voluntary métier resume');
      assert.equal(now.walked,old.walked);assert.equal(now.option,old.option);
      for(const field of ['ownerConsents','ownerConsent','depositConsent','provenances','observations','lineIds','consent','waypointIds','nextWaypoint','legWalked','pickupWalked','passageStartWalked']){
        assert.deepEqual(now[field],old[field],key+'.'+field+' cannot be granted by geometry');
      }
      if(now.carrier){
        const carried=now.evidence?.place==='carried'?now.evidence:[...(now.lots??[]),...(now.cases??[]),...(now.objects??[])].find(p=>p.id===now.carrier);
        assert(carried);assert.deepEqual({x:carried.x,y:carried.y},{x:now.last.x,y:now.last.y});
      }
      if(old.phase!=='interrupted')assert.equal(now.interruptedCount,old.interruptedCount+1,'one migration records one interruption');
    }
  }
  if(f.ledgers.archiveContinuationV111)assert.equal(plan.ledgers.archiveContinuationV111.receipt.baseLedgerJson,f.ledgers.archiveContinuationV111.receipt.baseLedgerJson);
  assert.equal(JSON.stringify(context),before);
});

test('V112 parked wide cargo cannot be restored onto its conserved owner; the actual native motor can leave afterwards',async()=>{
  const f=await createGeometryUpgradeFixtureV112('2026-09-20T10:00:00.000Z',{cargo:true,groundObject:true});
  assert.equal(f.oldNativeWalkSteps,473);assert.equal(f.ledgerKey,'cargoV108');
  const context={...contextFor({...f,actor:f.historicalActor}),actor:f.historicalActor},inspection=api.planHomeworldGeometryRecoveryV112(context);
  assert(inspection.ok,inspection.reason);const plan=inspection.plan;
  assert.equal(plan.movesActor,false);assert.deepEqual(plan.checkpoint,f.checkpoint);
  assert.deepEqual(plan.ledgers.cargoV108.receipt.last,f.ledgers.cargoV108.receipt.last);
  assert.equal(cargo.cargoCaseCollisionV108(plan.ledgers.cargoV108,context.actor),null);
  const cargoContext={...context,visitedDistrictIds:['port']};
  assert(cargo.cargoWalkableV108(plan.ledgers.cargoV108,cargoContext));
  let departure=0;
  for(const [moveX,climb]of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1]]){
    let actor={...context.actor,vx:0,vy:0};
    for(let n=0;n<120;n++)actor=cargo.stepHomeworldCargoActorV108(actor,{moveX,climb,jumpPressed:false},1/60,'0',plan.ledgers.cargoV108);
    departure=Math.max(departure,Math.hypot(actor.x-context.actor.x,actor.y-context.actor.y));
  }
  assert(departure>20,'a saved free actor must retain a real physical departure');
  const lot=plan.ledgers.cargoV108.receipt.lots[0];
  assert(cargo.cargoWalkableV108(plan.ledgers.cargoV108,{...cargoContext,actor:{x:lot.x,y:lot.y+60}}),'the declared pickup stand accepts the real body');
  validSave(f.owner,plan.ledgers,plan.checkpoint);
});

test('V112 a schema-boundary512-point trace compacts under explicit synthetic native-hull geometry without doubling interruptions',()=>{
  const f=structuredClone(fixtures.find(f=>f.name==='v112-v104-played-blocked-fixture.json')),ledger=f.ledgers.cartographyV104;
  // Zero-distance duplicate samples construct a schema-capacity boundary. They
  // do not claim that the old UI emitted this 512-point trace.
  while(ledger.receipt.trail.length<512)ledger.receipt.trail.splice(1,0,{...ledger.receipt.trail[0]});
  assert(load('homeworldCartographyLedgerV104').normalizeHomeworldCartographyV104(ledger));
  const synthetic=syntheticBlockedCartographyGeometry(),context=contextFor(f),bytes=JSON.stringify(context);
  assert.equal(load('homeworldCivicWorldV80').homeworldCivicWalkableV80('0',f.actor),true,'the authentic checkpoint is free in the repaired product');
  assert.equal(synthetic.civic.homeworldCivicWalkableV80('0',f.actor),false,'the test explicitly adds a real full-body obstruction');
  assert(synthetic.api.homeworldBeforePublicPlacesWalkableV112(f.actor),'all retained former native collisions remain enforced');
  assert(synthetic.api.homeworldGeometryRecoveryRequiredV112(f.checkpoint,f.owner,f.ledgers));
  const inspection=synthetic.api.planHomeworldGeometryRecoveryV112(context);assert(inspection.ok,inspection.reason);
  assert(inspection.plan.migrations.some(m=>m.obstacleId===synthetic.obstacleId));
  const next=inspection.plan.ledgers.cartographyV104.receipt;
  assert.equal(next.trail.length,512);assert.equal(next.trimmedCount,ledger.receipt.trimmedCount+1);
  assert.equal(next.interruptedCount,ledger.receipt.interruptedCount+1);assert.equal(next.trailBreaks.length,ledger.receipt.trailBreaks.length+1);
  assert.equal(next.walked,ledger.receipt.walked);assert.equal(next.nextWaypoint,ledger.receipt.nextWaypoint);
  assert.deepEqual(next.trail.at(-1),next.last);
  assert.equal(JSON.stringify(context),bytes,'synthetic geometry migration only proposes a copy');
});

test('V112 revision and interruption bounds refuse the whole proposal without changing any supplied receipt',()=>{
  for(const boundary of ['revision','interruptedCount','trimmedCount']){
    const f=structuredClone(fixtures.find(f=>f.name==='v112-v104-played-blocked-fixture.json')),ledger=f.ledgers.cartographyV104;
    if(boundary==='revision')ledger.revision=999990;
    else if(boundary==='interruptedCount')ledger.receipt.interruptedCount=10000;
    else{
      while(ledger.receipt.trail.length<512)ledger.receipt.trail.splice(1,0,{...ledger.receipt.trail[0]});
      ledger.receipt.trimmedCount=1_000_000_000;
    }
    assert(load('homeworldCartographyLedgerV104').normalizeHomeworldCartographyV104(ledger),'constructed boundary input remains a valid ledger');
    const synthetic=syntheticBlockedCartographyGeometry(),context=contextFor(f),bytes=JSON.stringify(context);
    assert(synthetic.api.homeworldGeometryRecoveryRequiredV112(f.checkpoint,f.owner,f.ledgers),'a real synthetic obstruction is present before testing the bound');
    const result=synthetic.api.planHomeworldGeometryRecoveryV112(context);
    assert.equal(result.ok,false,boundary);assert.equal(result.plan,null);assert.equal(JSON.stringify(context),bytes);
  }
});

test('V112 continuation resume attaches a nearby real checkpoint and its carried fragment while immutable B stays exact',()=>{
  const f=fixtures.find(f=>f.ledgers.archiveContinuationV111),inspection=api.planHomeworldGeometryRecoveryV112(contextFor(f));assert(inspection.ok,inspection.reason);
  const plan=inspection.plan,old=plan.ledgers.archiveContinuationV111,base=plan.ledgers.archivePlaqueV109,study=old.receipt.study;
  const actor={x:study.receipt.last.x+1.25,y:study.receipt.last.y},context={ownerCreatedAt:f.owner,currentOwnerCreatedAt:f.owner,actor,levelId:'0',visitedDistrictIds:['port'],active:true,artAvailable:true,basePlaque:base};
  const adapter=load('homeworldArchiveResumeV112'),next=adapter.applyArchiveContinuationV112(old,'resume',old.revision,context);assert(next.ok,next.message);
  assert.deepEqual(next.ledger.receipt.study.receipt.last,actor);assert.equal(next.ledger.receipt.study.receipt.walked,study.receipt.walked);
  assert.equal(next.ledger.receipt.baseLedgerJson,old.receipt.baseLedgerJson);assert.equal(JSON.stringify(base),JSON.stringify(f.ledgers.archivePlaqueV109));
  validSave(f.owner,{...plan.ledgers,archiveContinuationV111:next.ledger},load('homeworldLocationV77').createHomeworldCheckpointV77(f.owner,'0',actor,null,actor));
  for(const commit of [()=>false,()=>{throw Error('quota');}]){
    const result=adapter.createArchiveContinuationTransactionV112(()=>old,()=>context,commit)('resume',old.revision);
    assert.equal(result.ok,false);assert.equal(result.writeRefused,true);assert.deepEqual(result.ledger,old);
  }
});
