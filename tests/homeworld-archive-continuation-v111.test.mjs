import test from 'node:test';
import assert from 'node:assert/strict';
import {archiveContinuationRouteV111} from './helpers/archive-continuation-v111-route.mjs';

const route=archiveContinuationRouteV111(),initial=structuredClone(route.state()),{api,schema,owner,b}=route;
const reset=()=>route.restore(initial);
const refused=(action,patch={},revision=route.state().ledger.revision)=>api.applyArchiveContinuationV111(route.state().ledger,action,revision,route.context(route.state().actor,patch));
let finished;
const complete=()=>{if(!finished){reset();finished=structuredClone(route.complete());}route.restore(finished);return route.state();};

test('V111 opens a later A episode only from a genuinely completed B, preserving the exact original JSON and all source history',()=>{
  reset();const baseJSON=JSON.stringify(route.state().base),before=route.state().base.receipt;
  assert.equal(before.option,'B');assert.equal(before.phase,'completed');assert.deepEqual(before.objects.map(object=>object.place),['support','support','source']);
  route.start();const current=route.state();
  assert.equal(JSON.stringify(current.base),baseJSON);assert.equal(current.ledger.receipt.baseLedgerJson,baseJSON);
  assert.equal(current.ledger.receipt.phase,'active');assert.equal(current.ledger.receipt.study.receipt.option,'A');
  assert.deepEqual(current.ledger.receipt.study.receipt.objects,before.objects);
  assert.deepEqual(current.ledger.receipt.study.receipt.observations,before.observations);
  assert.deepEqual(current.ledger.receipt.study.receipt.provenances,before.provenances);
  assert.equal(current.ledger.receipt.study.receipt.walked,before.walked,'opening credits no new walking');
  assert.notDeepEqual(current.ledger.receipt.lineIds,before.lineIds,'newly played A lines do not replace old B lines');
});

test('V111 physically completes edge, mismatch, voluntary reprise and a separately carried candidate, without repeating the two B deposits',()=>{
  const current=complete(),before=current.base.receipt,after=current.ledger.receipt.study.receipt;
  assert.equal(after.phase,'completed');assert.deepEqual(after.objects.map(object=>object.place),['support','support','support']);
  assert.deepEqual(after.objects.slice(0,2),before.objects.slice(0,2));assert(after.edgeObserved&&after.mismatchObserved&&after.failureSpoken&&after.resumeSpoken&&after.fragmentCompared);
  assert(after.walked>before.walked+500);assert(current.motorSteps>100);assert(current.motorDistance>500);
  assert.equal(current.ledger.receipt.baseLedgerJson,JSON.stringify(current.base));assert.equal(current.base.receipt.option,'B');
  assert.equal(after.interruptedCount,1);assert(!Object.hasOwn(after,'repaired'));assert(!Object.hasOwn(after,'lineage'));
  const lines=route.original.defs.HOMEWORLD_ARCHIVE_PLAQUE_LINES_V109;
  assert.deepEqual(after.lineIds.map(id=>lines.find(line=>line.id===id).kind),['OUV','CHOIX','REPONSE','ECHEC','REPRISE','SUCCES']);
  assert.deepEqual(before.lineIds.map(id=>lines.find(line=>line.id===id).kind),['OUV','CHOIX','REPONSE','SUCCES']);
});

test('V111 refusal guards require the current consenting owner, visible post, fresh revision and a separate new choice and consent',()=>{
  reset();for(const patch of [{artAvailable:false},{active:false},{hostPresent:false},{hostConsenting:false},{visitedDistrictIds:[]},{currentOwnerCreatedAt:'2026-10-25T10:00:00.000Z'},{otherOperationActive:true},{interiorId:'residence-port-2'},{levelId:'+1'}])assert.equal(refused('open',patch).ok,false);
  const original=route.state().base;
  for(const bad of [undefined,route.original.schema.defaultHomeworldArchivePlaqueV109(owner),{...original,ownerCreatedAt:'2026-10-25T10:00:00.000Z'}])assert.equal(refused('open',{basePlaque:bad}).ok,false);
  route.action('open');assert.equal(refused('start').ok,false);assert.equal(refused('choose-a',{},0).ok,false);
  route.action('choose-a');assert.equal(refused('authorize').ok,false);route.action('reply');assert.equal(refused('start').ok,false);assert.equal(refused('authorize',{hostConsenting:false}).ok,false);
  route.action('authorize');route.action('start');assert.equal(refused('choose-a').ok,false);assert.equal(refused('report').ok,false);assert.equal(refused('compare-fragment').ok,false);
});

test('V111 quota, stale/foreign B replacement and impossible movement never mutate either confirmed receipt',()=>{
  reset();route.start();route.walkTo(b.supports[0].stand);
  const current=structuredClone(route.state()),old=JSON.stringify(current.ledger),baseJSON=JSON.stringify(current.base);
  const transaction=api.createArchiveContinuationTransactionV111(()=>route.state().ledger,()=>route.context(),()=>false);
  const denied=transaction('inspect-edge',current.ledger.revision);assert(denied.writeRefused);assert.equal(JSON.stringify(denied.ledger),old);assert.equal(JSON.stringify(route.state().ledger),old);assert.equal(JSON.stringify(route.state().base),baseJSON);
  const replaced=structuredClone(current.base);replaced.revision++;
  assert.equal(refused('inspect-edge',{basePlaque:replaced}).ok,false);assert.equal(schema.normalizeHomeworldArchiveContinuationV111(current.ledger,replaced),null);
  assert.equal(refused('inspect-edge',{currentOwnerCreatedAt:'2026-10-25T10:00:00.000Z'}).ok,false);
  assert(api.sampleArchiveContinuationWalkV111(current.ledger,current.actor,{x:current.actor.x+500,y:current.actor.y},1/60,route.context()).invalid);
  assert.equal(JSON.stringify(route.state().base),baseJSON);
});

test('V111 strict imports reject future/forged/unbound episodes and preserve completed B source lines independently',()=>{
  const current=complete(),valid=current.ledger;
  assert.deepEqual(schema.normalizeHomeworldArchiveContinuationV111(JSON.parse(JSON.stringify(valid)),current.base),valid);
  assert.equal(schema.normalizeHomeworldArchiveContinuationV111(valid,undefined),null,'a removed live B cannot be replaced by the stored snapshot');
  const patches=[value=>value.version=2,value=>value.extra=true,value=>value.ownerCreatedAt='2026-10-25T10:00:00.000Z',value=>value.receipt.phase=['active'],value=>value.receipt.study.receipt.objects[0].x++,value=>value.receipt.study.receipt.walked=0,value=>value.receipt.study.revision=value.revision,value=>value.revision=1,value=>value.receipt.lineIds.push('forged'),value=>value.receipt.baseLedgerJson=value.receipt.baseLedgerJson.replace('"option":"B"','"option":"A"'),value=>value.receipt.study.receipt.provenances.reverse(),value=>value.receipt.study.receipt.option='B'];
  for(const patch of patches){const value=structuredClone(valid);patch(value);assert.equal(schema.normalizeHomeworldArchiveContinuationV111(value,current.base),null);}
  assert.equal(JSON.stringify(schema.archiveContinuationViewV111(valid).receipt.objects.slice(0,2)),JSON.stringify(current.base.receipt.objects.slice(0,2)));
  assert.equal(schema.archiveContinuationActiveV111(valid),false);
});

test('V111 a carried candidate survives serialization, interrupt/park/resume and retains the old discovery places',()=>{
  reset();route.mismatch();route.action('interrupt',{active:false});route.action('resume');route.walkTo(b.objects[2].stand);
  for(const action of ['observe-fragment','copy-fragment','take-fragment'])route.action(action);
  const current=structuredClone(route.state()),baseJSON=JSON.stringify(current.base);
  assert.equal(current.ledger.receipt.study.receipt.carrier,'fragment');
  const imported=schema.normalizeHomeworldArchiveContinuationV111(JSON.parse(JSON.stringify(current.ledger)),current.base);assert(imported);
  route.restore({...current,ledger:imported});route.action('interrupt',{active:false});route.action('park');
  assert.equal(route.state().ledger.receipt.study.receipt.objects[2].place,'ground');route.action('resume');
  assert.equal(route.state().ledger.receipt.study.receipt.provenances.at(-1),'fragment');
  assert.equal(route.state().ledger.receipt.baseLedgerJson,baseJSON);assert.equal(JSON.stringify(route.state().base),baseJSON);
  const resumed=structuredClone(route.state().ledger);resumed.receipt.study.receipt.phase='interrupted';resumed.receipt.study.receipt.resumePhase=['working'];
  assert.equal(schema.normalizeHomeworldArchiveContinuationV111(resumed,route.state().base),null,'legacy String() resume coercion is not admitted into the new receipt');
});
