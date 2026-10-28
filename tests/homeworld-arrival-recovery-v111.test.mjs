import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
import {createLegacyArrivalRecoveryV111} from './helpers/arrival-recovery-v111-route.mjs';

const qa=homeworldSceneSsrV78(),load=name=>qa.load('app/game/systems/'+name+'.ts');
const api={...load('homeworldArrivalRecoveryLedgerV111'),...load('homeworldArrivalRecoveryV111'),...load('homeworldWorldV77'),
  ...load('homeworldCity'),...load('homeworldInteriorsV64'),...load('homeworldWayfindingV75'),...load('homeworldLocationV77'),
  ...load('homeworldTransitionsV110'),...load('homeworldCargoV108'),...load('homeworldCargoLedgerV108')};
const saves=qa.load('app/game/save.ts'),owner='2026-10-26T10:00:00.000Z';
let original;
const reproduction=()=>structuredClone(original??=createLegacyArrivalRecoveryV111(owner));

function fixture(){
  const played=reproduction();
  let actor={...played.restoredActor},steps=0;
  const route=api.homeworldWayfindingInteriorRouteV75(played.room,actor,'exit');assert.equal(route.status,'reachable');
  for(const point of route.points.slice(1)){
    let budget=1000;
    while(Math.hypot(point.x-actor.x,point.y-actor.y)>.01&&budget-->0){
      const before=actor,span=Math.max(Math.abs(point.x-actor.x)/330,Math.abs(point.y-actor.y)/260,1/60);
      actor=api.stepHomeworldActorOnFloor(actor,{moveX:(point.x-actor.x)/(330*span),climb:(point.y-actor.y)/(260*span),jumpPressed:false},1/60,
        p=>api.isHomeworldInteriorWalkableV64(played.room,p),()=>before);
      assert(Math.hypot(actor.x-before.x,actor.y-before.y)>0);steps++;
    }
    assert(Math.hypot(point.x-actor.x,point.y-actor.y)<=.01);
  }
  assert.equal(api.nearestHomeworldInteriorTargetV64(played.room,actor)?.kind,'exit');
  const context={ownerCreatedAt:owner,currentOwnerCreatedAt:owner,checkpoint:played.checkpoint,ledgers:played.ledgers,
    actor:{x:actor.x,y:actor.y},levelId:'0',interiorId:played.room.buildingId,active:true,inTransit:false};
  return {played,context,steps,ledger:api.defaultHomeworldArrivalRecoveryV111(owner)};
}

test('V111: the real603-step legacy trap proposes only its recorded empty-handed exterior point at the walked interior exit',()=>{
  const f=fixture(),before=JSON.stringify(f.context),out=api.planHomeworldArrivalRecoveryV111(f.ledger,f.context);
  assert.equal(f.played.ticks,603);assert(f.steps>0);
  assert.equal(api.homeworldInteriorExitV110('0',{...f.played.actor,...f.played.checkpoint.exterior},f.played.ledger,owner),null);
  assert.equal(out.ok,true);assert.deepEqual(out.plan.to,f.played.recordedExterior);
  assert.equal(Math.hypot(out.plan.to.x-f.played.approach.x,out.plan.to.y-f.played.approach.y),60);
  assert.notDeepEqual(out.plan.to,{x:f.played.actor.x,y:f.played.actor.y},'do not guess the free side approach as historical fact');
  assert.equal(out.plan.checkpoint.interiorId,null);assert.equal(out.plan.checkpoint.local,null);
  assert.equal(out.plan.ledger.receipt.originalCheckpointJson,JSON.stringify(f.played.checkpoint));
  assert.equal(out.plan.ledger.receipt.originalLedgersJson,JSON.stringify(f.played.ledgers));
  assert.equal(JSON.stringify(f.context),before);assert.equal(f.ledger.receipt,null);
});

test('V111: quota failure and throwing storage acknowledgements never consume the restoration or its original documents',()=>{
  for(const thrown of[false,true]){
    const f=fixture(),before=JSON.stringify(f),key=api.planHomeworldArrivalRecoveryV111(f.ledger,f.context).plan.key;let calls=0;
    const send=api.createHomeworldArrivalRecoveryTransactionV111(()=>f.ledger,()=>f.context,proposal=>{
      calls++;assert(api.normalizeHomeworldArrivalRecoveryV111(proposal.ledger));if(thrown)throw Error('quota');return false;
    });
    const out=send(key);assert.equal(out.ok,false);assert.equal(out.writeRefused,true);assert.equal(calls,1);
    assert.equal(JSON.stringify(f),before);assert.equal(out.ledger,f.ledger);
  }
});

test('V111: a delayed confirmation rechecks ledger revision, interior pose, owner, pause and live obstacles',()=>{
  for(const change of[
    f=>{f.context.ledgers.cargoV108.revision++;},f=>{f.context.actor.x+=.25;},
    f=>{f.context.currentOwnerCreatedAt='2026-10-25T10:00:00.000Z';},f=>{f.context.active=false;},
    f=>{f.context.inTransit=true;},f=>{f.context.interiorId=null;},f=>{f.context.levelId='+1';},
  ]){
    const f=fixture(),key=api.planHomeworldArrivalRecoveryV111(f.ledger,f.context).plan.key;let calls=0;
    change(f);const before=JSON.stringify(f);
    const out=api.createHomeworldArrivalRecoveryTransactionV111(()=>f.ledger,()=>f.context,()=>{calls++;return true;})(key);
    assert.equal(out.ok,false);assert.equal(calls,0);assert.equal(JSON.stringify(f),before);
  }
});

test('V111: an occupied or distant recorded point, another carrier or an unknown/future document cannot be restored',()=>{
  for(const change of[
    f=>{f.context.ledgers.cargoV108.receipt.last={x:7070,y:5395};},
    f=>{const r=f.context.ledgers.cargoV108.receipt;r.last={...f.played.approach};},
    f=>{f.context.ledgers.cargoV108.ownerCreatedAt='2026-10-25T10:00:00.000Z';},
    f=>{f.context.ledgers.cargoV108.version=2;},
    f=>{const r=f.context.ledgers.cargoV108.receipt;r.carrier='narrow';r.pickupWalked=r.walked;Object.assign(r.lots[1],r.last,{place:'carried'});},
    f=>{f.context.ledgers.cartographyV104={version:99};},
    f=>{f.context.ledgers.futureOperationV112={version:1};},
  ]){
    const f=fixture();change(f);assert.equal(api.planHomeworldArrivalRecoveryV111(f.ledger,f.context).ok,false);
  }
});

test('V111: free ordinary anchors and unwalked interior positions retain the existing exit instead of granting recovery',()=>{
  const f=fixture();f.context.checkpoint.exterior={x:f.played.actor.x,y:f.played.actor.y};
  assert.equal(api.planHomeworldArrivalRecoveryV111(f.ledger,f.context).ok,false);
  const g=fixture();g.context.actor={...g.played.room.spawn};
  assert.equal(api.planHomeworldArrivalRecoveryV111(g.ledger,g.context).ok,false);
  const h=fixture();h.context.checkpoint.ownerCreatedAt='2026-10-25T10:00:00.000Z';
  assert.equal(api.planHomeworldArrivalRecoveryV111(h.ledger,h.context).ok,false);
});

test('V111: strict backup import rejects forged destination, source revision, owner, shape and future recovery versions',()=>{
  const f=fixture(),valid=api.planHomeworldArrivalRecoveryV111(f.ledger,f.context).plan.ledger;
  assert(api.normalizeHomeworldArrivalRecoveryV111(valid));
  for(const change of[
    x=>{x.version=2;},x=>{x.revision=2;},x=>{x.extra=true;},x=>{x.receipt.source='nearest-free-offset';},
    x=>{x.receipt.sourceRevision++;},x=>{x.receipt.restoredCheckpoint.exterior.x++;},
    x=>{x.receipt.restoredCheckpoint.futureField=true;},x=>{x.receipt.restoredCheckpoint.exterior.futureField=true;},
    x=>{x.receipt.restoredCheckpoint.ownerCreatedAt='2026-10-25T10:00:00.000Z';},
    x=>{x.receipt.originalCheckpointJson='{bad';},x=>{x.receipt.originalLedgersJson+=' '.repeat(524288);},
    x=>{x.receipt.buildingId='other-door';},x=>{x.receipt.exitLocal.x=Infinity;},
  ]){const bad=structuredClone(valid);change(bad);assert.equal(api.normalizeHomeworldArrivalRecoveryV111(bad),null);}
});

test('V111: one real atomic save retains the original interior checkpoint and all ledgers through load and ordinary egress',()=>{
  const f=fixture(),values=new Map(),key='arrival-recovery-v111',storage={getItem:n=>values.get(n)??null,setItem:(n,v)=>values.set(n,v),removeItem:n=>values.delete(n)};
  let save=saves.defaultSave(owner);save.homeworld.visitedDistrictIds=['port'];Object.assign(save.homeworld,f.played.ledgers,{locationV77:f.played.checkpoint});
  assert(saves.writeSaveWithStatus(save,storage,key).persisted);
  const originalCheckpoint=JSON.stringify(save.homeworld.locationV77),originalLedgers=JSON.stringify(f.played.ledgers),cargo=JSON.stringify(save.homeworld.cargoV108);
  let writes=0,current=f.ledger;
  const send=api.createHomeworldArrivalRecoveryTransactionV111(()=>current,()=>f.context,proposal=>{
    const next={...save,homeworld:{...save.homeworld,locationV77:proposal.checkpoint,arrivalRecoveryV111:proposal.ledger}};
    const result=saves.writeSaveWithStatus(next,storage,key);if(!result.persisted)return false;
    save=result.save;current=proposal.ledger;writes++;return true;
  });
  const result=send(api.planHomeworldArrivalRecoveryV111(current,f.context).plan.key);
  assert.equal(result.ok,true);assert.equal(writes,1);
  const loaded=saves.loadSave(storage,key),receipt=loaded.homeworld.arrivalRecoveryV111?.receipt;
  assert(receipt,'actual save parser retains the strict optional audit receipt');
  assert.equal(receipt.originalCheckpointJson,originalCheckpoint);assert.equal(receipt.originalLedgersJson,originalLedgers);
  assert.equal(JSON.stringify(loaded.homeworld.cargoV108),cargo);
  assert.deepEqual(loaded.homeworld.locationV77.exterior,f.played.recordedExterior);assert.equal(loaded.homeworld.locationV77.interiorId,null);
  const restored=api.resolveHomeworldLocationV77(loaded.homeworld.locationV77,owner);assert.equal(restored.restored,true);assert.equal(restored.interiorId,null);
  const after=api.stepHomeworldCargoActorV108(restored.actor,{moveX:0,climb:1,jumpPressed:false},1/60,'0',loaded.homeworld.cargoV108);
  assert(after.y>restored.actor.y,'ordinary motor can walk away from the restored recorded exterior point');
  assert.equal(api.planHomeworldArrivalRecoveryV111(current,f.context).ok,false,'the acknowledged receipt cannot be consumed twice');
});

test('V111: the real save quota adapter refuses the entire checkpoint/backup pair and leaves the old campaign intact',()=>{
  const f=fixture(),values=new Map(),key='arrival-recovery-quota-v111';let full=false;
  const storage={getItem:n=>values.get(n)??null,setItem:(n,v)=>{if(full)throw Error('quota');values.set(n,v);},removeItem:n=>values.delete(n)};
  const save=saves.defaultSave(owner);save.homeworld.visitedDistrictIds=['port'];Object.assign(save.homeworld,f.played.ledgers,{locationV77:f.played.checkpoint});
  assert(saves.writeSaveWithStatus(save,storage,key).persisted);const before=values.get(key);full=true;
  const send=api.createHomeworldArrivalRecoveryTransactionV111(()=>f.ledger,()=>f.context,proposal=>
    saves.writeSaveWithStatus({...save,homeworld:{...save.homeworld,locationV77:proposal.checkpoint,arrivalRecoveryV111:proposal.ledger}},storage,key).persisted);
  const result=send(api.planHomeworldArrivalRecoveryV111(f.ledger,f.context).plan.key);
  assert.equal(result.ok,false);assert.equal(result.writeRefused,true);assert.equal(values.get(key),before);
  assert.equal(saves.loadSave(storage,key).homeworld.locationV77.interiorId,f.played.room.buildingId);
});

test('V111: the actual same-owner storage conflict prevents a stale-tab restore despite an unchanged local preview',()=>{
  const f=fixture(),values=new Map(),key='arrival-recovery-conflict-v111';
  const storage={getItem:n=>values.get(n)??null,setItem:(n,v)=>values.set(n,v),removeItem:n=>values.delete(n)};
  const save=saves.defaultSave(owner);save.homeworld.visitedDistrictIds=['port'];Object.assign(save.homeworld,f.played.ledgers,{locationV77:f.played.checkpoint});
  assert(saves.writeSaveWithStatus(save,storage,key).persisted);
  const other=structuredClone(save);other.profile.hunterName='Autre onglet';values.set(key,JSON.stringify(other));
  const durable=values.get(key),keyBefore=api.planHomeworldArrivalRecoveryV111(f.ledger,f.context).plan.key;
  let reason;
  const result=api.createHomeworldArrivalRecoveryTransactionV111(()=>f.ledger,()=>f.context,proposal=>{
    const out=saves.writeSaveWithStatus({...save,homeworld:{...save.homeworld,locationV77:proposal.checkpoint,arrivalRecoveryV111:proposal.ledger}},storage,key);
    reason=out.failure;return out.persisted;
  })(keyBefore);
  assert.equal(reason,'save-conflict');assert.equal(result.ok,false);assert.equal(result.writeRefused,true);
  assert.equal(values.get(key),durable);assert.equal(f.ledger.receipt,null);
});
