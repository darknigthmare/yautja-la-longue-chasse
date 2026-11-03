import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

// Controlled, schema-valid compatibility fixtures. These are not played source
// routes, discoveries or victories and grant no new progress in a browser proof.
const qa=homeworldSceneSsrV78(),load=file=>qa.load('app/game/systems/'+file+'.ts');
const arrival=load('homeworldCargoArrivalV108'),loc=load('homeworldLocationV77'),world=load('homeworldWorldV77');
const cargo=load('homeworldCargoV108'),civic=load('homeworldCivicWorldV80'),fixed=load('homeworldCargoSolidsV108');
const saves=qa.load('app/game/save.ts'),owner='2026-10-24T10:00:00.000Z';
const blocked=[{x:6690,y:5410},{x:6903,y:5343},{x:6560,y:5348},{x:6726,y:5396}];
const context=actor=>({ownerCreatedAt:owner,currentOwnerCreatedAt:owner,actor,levelId:'0',visitedDistrictIds:['port'],active:true});
const actorAt=p=>({...world.createHomeworldWorldActorV77(),...p,vx:0,vy:0});
function start(module,method,choice,post,extra={}){
 let ledger;
 for(const action of[choice,'reply','start']){const out=module[method](ledger,action,ledger?.revision??0,{...context(post),...extra});assert(out.ok,out.message);ledger=out.ledger;}
 return ledger;
}
function archive106(point,carry=false){
 const defs=load('homeworldArchiveDefinitionV106'),b=defs.HOMEWORLD_ARCHIVE_V106;
 const ledger=start(load('homeworldArchiveV106'),'applyArchiveActionV106','choose-b',b.post);
 ledger.receipt.last={...point};ledger.receipt.walked=2000;
 if(carry){ledger.receipt.carrier='A';ledger.receipt.pickupWalked=1800;Object.assign(ledger.receipt.cases[0],point,{place:'carried'});}
 assert(load('homeworldArchiveLedgerV106').normalizeHomeworldArchiveV106(ledger));
 return ledger;
}
function completed106(){const ledger=archive106(load('homeworldArchiveDefinitionV106').HOMEWORLD_ARCHIVE_V106.post);const b=load('homeworldArchiveDefinitionV106').HOMEWORLD_ARCHIVE_V106;
 ledger.receipt.phase='completed';ledger.receipt.uncertaintyRecorded=true;ledger.receipt.cases.forEach((c,i)=>Object.assign(c,{place:'support',x:b.supports[i].x,y:b.supports[i].y}));assert(load('homeworldArchiveLedgerV106').normalizeHomeworldArchiveV106(ledger));return ledger;}
function fixture(kind,point,carry=false){
 const bag={};
 if(kind===104){
  const b=load('homeworldCartographyDefinitionV104').HOMEWORLD_CARTOGRAPHY_V104;
  const ledger=start(load('homeworldCartographyV104'),'applyCartographyActionV104','choose-b',b.post);
  // Its authored envelope ends at6380. An interrupted walker can subsequently
  // stand elsewhere; that old route anchor must stay inside its own envelope.
  ledger.receipt.phase='interrupted';ledger.receipt.interruptedCount=1;
  bag.cartographyV104=ledger;
 }else if(kind===105){
  const b=load('homeworldCartographyDefinitionV105').HOMEWORLD_CARTOGRAPHY_V105;
  const ledger=start(load('homeworldCartographyV105'),'applyCartographyActionV105','choose-a',b.post);
  ledger.receipt.last={...point,levelId:'0'};ledger.receipt.walked=2000;bag.cartographyV105=ledger;
 }else if(kind===106)bag.archiveV106=archive106(point,carry);
 else{
  const b=load('homeworldArchiveComparisonDefinitionV107').HOMEWORLD_ARCHIVE_COMPARISON_V107;
  const base=completed106(),ledger=start(load('homeworldArchiveComparisonV107'),'applyArchiveComparisonV107','choose-a',b.post,{legacyArchive:base});
  ledger.receipt.last={...point};ledger.receipt.walked=2000;
  if(carry){ledger.receipt.phase='carrying';ledger.receipt.evidence={...point,place:'carried'};ledger.receipt.discovery={position:{...b.evidence.origin},observer:{...b.evidence.origin},levelId:'0'};ledger.receipt.provenanceCopied=true;ledger.receipt.pickupWalked=1800;}
  bag.archiveV106=base;bag.archiveComparisonV107=ledger;
 }
 const actor=actorAt(point),checkpoint=loc.createHomeworldCheckpointV77(owner,'0',actor,null,actor);
 const save=saves.defaultSave(owner);Object.assign(save.homeworld,bag,{visitedDistrictIds:['port'],locationV77:checkpoint});
 assert(saves.parseSaveImport(JSON.stringify(save)).save,'controlled compatibility fixture must import');
 return{bag,checkpoint,save};
}
function recover(f){return arrival.resolveCargoArrivalV108(f.checkpoint,owner,undefined,f.bag);}
function assertNoCredit(before,after){
 for(const key of['walked','legWalked','nextWaypoint','pickupWalked','uncertaintyRecorded','observedAt','compared','observations','comparison','provenanceCopied','discovery','crossings','highPoint'])if(Object.hasOwn(before,key))assert.deepEqual(after[key],before[key],key+' cannot be granted by geometric migration');
 assert.notEqual(after.phase,'completed');
}
test('all four newly occupied checkpoints recover each valid old operation without fabricating route progress',()=>{
 for(const point of blocked)for(const kind of[104,105,106,107]){
  assert(cargo.cargoCaseCollisionV108(undefined,point)||fixed.cargoFixedCollisionV108('0',point));
  const f=fixture(kind,point),before=JSON.stringify(f),out=recover(f);
  assert.equal(JSON.stringify(f),before,'input bytes remain available for recovery');
  assert(out.cargoRecoveryMessage,'migration is announced');
  assert(Math.hypot(out.actor.x-point.x,out.actor.y-point.y)>0);
  assert(Math.hypot(out.actor.x-point.x,out.actor.y-point.y)<=96);
  assert(civic.homeworldCivicWalkableV80('0',out.actor));assert.equal(cargo.cargoCaseCollisionV108(undefined,out.actor),null);
  assert(out.migrationBackup);assert.deepEqual(out.migrationBackup.originalCheckpoint,f.checkpoint);
  const ledgers=out.migratedLedgers??f.bag;
  for(const [key,old]of Object.entries(f.bag))if(old.receipt.phase!=='completed'){
   const next=ledgers[key]??old;assertNoCredit(old.receipt,next.receipt);
   if(kind===104)assert.deepEqual(next.receipt.last,old.receipt.last,'a decoupled interrupted route anchor stays in its own authored envelope');
  }
  Object.assign(f.save.homeworld,ledgers,{locationV77:loc.createHomeworldCheckpointV77(owner,'0',out.actor,null,out.actor)});
  assert(saves.parseSaveImport(JSON.stringify(f.save)).save,'recovered checkpoint and ledgers must import together');
 }
});
test('old A/C carriers move with their own checkpoint and keep identity, source observations and pickup distance',()=>{
 for(const point of blocked)for(const kind of[106,107]){
  const f=fixture(kind,point,true),out=recover(f),key=kind===106?'archiveV106':'archiveComparisonV107';
  const before=f.bag[key].receipt,after=out.migratedLedgers[key].receipt;
  assertNoCredit(before,after);assert.equal(after.phase,'interrupted');
  assert.deepEqual(after.last,{x:out.actor.x,y:out.actor.y});
  if(kind===106){assert.equal(after.carrier,'A');assert.equal(after.cases[0].id,'A');assert.equal(after.cases[0].place,'carried');assert.deepEqual({x:after.cases[0].x,y:after.cases[0].y},after.last);assert.deepEqual(after.cases[1],before.cases[1]);}
  else{assert.equal(after.evidence.place,'carried');assert.deepEqual({x:after.evidence.x,y:after.evidence.y},after.last);}
  Object.assign(f.save.homeworld,out.migratedLedgers,{locationV77:loc.createHomeworldCheckpointV77(owner,'0',out.actor,null,out.actor)});
  assert(saves.parseSaveImport(JSON.stringify(f.save)).save);
 }
});
test('safe checkpoints and foreign owners do not acquire a migration or a new source receipt',()=>{
 const point={x:7350,y:5260},f=fixture(106,point),out=recover(f);
 assert.deepEqual({x:out.actor.x,y:out.actor.y},point);assert.equal(out.cargoRecoveryMessage,'');assert(!out.migrationBackup);
 const foreign=arrival.resolveCargoArrivalV108(f.checkpoint,'2026-10-23T10:00:00.000Z',undefined,f.bag);assert(!foreign.migrationBackup);
});
