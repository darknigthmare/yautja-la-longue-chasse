import test from 'node:test';
import assert from 'node:assert/strict';
import {archivePlaqueRouteV109} from './helpers/archive-plaque-v109-route.mjs';
import {cargoRouteV108} from './helpers/cargo-v108-route.mjs';
import {archiveComparisonRouteV107} from './helpers/archive-comparison-v107-route.mjs';

const f=archivePlaqueRouteV109(),qa=f.qa;
const objectives=qa.load('app/game/systems/homeworldObjectivesV110.ts');
const routes=qa.load('app/game/systems/homeworldWayfindingV110.ts');
const historical=qa.load('app/game/systems/homeworldWayfindingV109.ts');
const atlas=qa.load('app/game/systems/homeworldAtlasLandmarksV109.ts');
const oldRecommendation=qa.load('app/game/systems/homeworldWayfindingV75.ts');
const initial=structuredClone(f.state());
function save(ledger,field='archivePlaqueV109',owner=f.owner){
  const s=qa.load('app/game/save.ts').normalizeSave({});
  s.createdAt=owner;s.homeworld.visitedDistrictIds=['port'];
  if(ledger)s.homeworld[field]=ledger;
  return s;
}
const objective=s=>objectives.homeworldCurrentObjectiveV110(s);
const stand=o=>({x:o.landmark.position.x,y:o.landmark.position.y+55});
const at=(s,operation,step,point)=>{
  const bytes=JSON.stringify(s),o=objective(s);assert(o);assert.equal(o.operation,operation);assert.match(o.destinationId,new RegExp(step));
  if(point)assert.deepEqual(stand(o),{x:point.x,y:point.y});
  assert.equal(JSON.stringify(s),bytes,'a recommendation cannot grant progression or move an object');
  const records=objectives.homeworldAtlasLandmarksV110(s);assert(records.some(r=>r.id===o.destinationId));return o;
};

test('V110 empty and historical saves preserve intro recommendation and registered routes without ledger writes',()=>{
  assert.equal(objective(undefined),null);
  const s=save(),bytes=JSON.stringify(s),oldId=oldRecommendation.homeworldWayfindingRecommendedV75(s);
  const legacy=atlas.homeworldAtlasLandmarksV109(s),resolved=legacy.find(r=>[r.id,r.pointId,r.buildingId,r.regionId].includes(oldId));
  const o=objective(s);assert.equal(o.operation,'intro');assert.equal(o.destinationId,resolved.id);
  assert.deepEqual(objectives.homeworldAtlasLandmarksV110(s),legacy);assert.equal(JSON.stringify(s),bytes);
  const origin={actor:f.b.post,levelId:'0',interiorId:null};
  assert.deepEqual(routes.homeworldRoutePlanV110(s,origin,f.b.npcId),historical.homeworldRoutePlanV109(s,origin,f.b.npcId));
});

test('V110 K-17 objective tracks real observe, provenance, pickup and own-surface deposit actions',()=>{
  f.restore(initial);f.start();let s=save(f.state().ledger);
  at(s,'plaque','observe-plaque',f.b.objects[0].stand);
  f.walkTo(f.b.objects[0].stand);f.action('observe-plaque');
  at(save(f.state().ledger),'plaque','copy-plaque',f.b.objects[0].stand);
  f.action('copy-plaque');at(save(f.state().ledger),'plaque','take-plaque',f.b.objects[0].stand);
  f.action('take-plaque');const state=f.state();s=save(state.ledger);
  const o=at(s,'plaque','deposit-plaque',f.b.supports[0].stand);
  const origin={actor:state.actor,levelId:'0',interiorId:null};
  const plan=routes.homeworldRoutePlanV110(s,origin,o.destinationId);
  assert.equal(plan.status,'reachable',plan.reason);assert.deepEqual(plan.stages.at(-1).points.at(-1),f.b.supports[0].stand);
  const guide=routes.homeworldRouteGuidanceV110(plan,origin,s);assert(guide&&guide.state!=='off-route');
  f.walkTo(f.b.supports[0].stand);f.action('deposit');
  at(save(f.state().ledger),'plaque','observe-trace',f.b.objects[1].stand);
});

test('V110 interrupted K-17 retains the exact resumable point and rejects a worker proposal after its step changes',()=>{
  f.restore(initial);f.start();f.walkTo(f.b.objects[0].stand);for(const a of ['observe-plaque','copy-plaque','take-plaque'])f.action(a);
  f.walkTo({x:7660,y:5350});f.action('interrupt',{active:false});
  const s=save(f.state().ledger),o=at(s,'plaque','resume',s.homeworld.archivePlaqueV109.receipt.last),origin={actor:f.state().actor,levelId:'0',interiorId:null};
  assert(o.interrupted);const plan=routes.homeworldRoutePlanV110(s,origin,o.destinationId);assert.equal(plan.status,'reachable',plan.reason);assert.equal(plan.stages.at(-1).radius,3);
  const request={ownerCreatedAt:s.createdAt,destinationId:o.destinationId,origin,geometryKey:plan.geometryKey,destinationKey:plan.destinationKey};
  assert(routes.homeworldRouteResponseCurrentV110(request,plan,s,origin));
  f.action('resume');const resumed=save(f.state().ledger);
  assert.equal(routes.homeworldRouteResponseCurrentV110(request,plan,resumed,origin),false);
  assert.equal(routes.homeworldRouteGuidanceV110(plan,origin,resumed).state,'off-route');
  const foreign=structuredClone(s);foreign.createdAt='2026-10-26T00:00:00.000Z';assert.equal(routes.homeworldRouteResponseCurrentV110(request,plan,foreign,origin),false);
});

test('V110 source failure recommends the consenting post and B report never invents a fragment objective',()=>{
  f.restore(initial);f.beforeMismatch();let s=save(f.state().ledger);
  at(s,'plaque','request-reprise',f.b.post);f.action('interrupt',{active:false});
  at(save(f.state().ledger),'plaque','resume-source',f.b.post);f.action('resume');
  at(save(f.state().ledger),'plaque','observe-fragment',f.b.objects[2].stand);
  f.restore(initial);f.start('B');f.place('plaque');f.place('trace');f.walkTo(f.b.supports[0].stand);f.action('conclude');
  s=save(f.state().ledger);at(s,'plaque','return',f.b.post);assert(!objective(s).instruction.includes('fragment'));
  f.walkTo(f.b.post);f.action('report');assert.equal(objective(save(f.state().ledger)).operation,'intro');
});

test('V110 cargo objective respects owner and depot consent, actual carried destination and physical passage test',()=>{
  const c=cargoRouteV108(),s=()=>save(c.state().ledger,'cargoV108',c.owner);
  c.action('choose-b');c.action('reply');c.action('start');
  at(s(),'cargo','owner-consent',c.b.post);c.action('consent-owner');
  at(s(),'cargo','depot-consent',c.b.guardian.post);c.walkTo(c.b.guardian.post);c.action('consent-depot');
  at(s(),'cargo','take-wide',c.b.lots[0].stand);c.walkTo(c.b.lots[0].stand);c.action('take-wide');
  at(s(),'cargo','deposit-wide',c.b.depot.stand);c.walkTo(c.b.depot.stand);c.action('deposit-depot');c.placeNarrow();
  at(s(),'cargo','passage-start',c.b.passage.start);c.walkTo(c.b.passage.start);c.action('check-passage');
  at(s(),'cargo','passage-end',c.b.passage.end);c.walkTo(c.b.passage.end);
  at(s(),'cargo','return',c.b.post);c.action('interrupt',{active:false});at(s(),'cargo','resume',c.state().ledger.receipt.last);
});

test('V110 comparison C requires preserved A/B, then directs to discovery, copied provenance, carried C and unobserved supports',()=>{
  const c=archiveComparisonRouteV107();c.restore(c.baseCompleted());for(const a of ['choose-a','reply','start'])c.action(a);
  const s=()=>{const result=save(c.state().ledger,'archiveComparisonV107',c.owner);result.homeworld.archiveV106=c.state().legacyArchive;return result;};
  at(s(),'comparison','discover',c.b.evidence.stand);c.walkTo(c.b.evidence.stand);c.action('discover');at(s(),'comparison','copy',c.b.evidence.stand);
  c.action('copy-provenance');c.action('take');at(s(),'comparison','deposit',c.b.table.stand);c.walkTo(c.b.table.stand);c.action('deposit');
  at(s(),'comparison','observe-A',c.b.references[0].stand);c.walkTo(c.b.references[0].stand);c.action('observe-a');
  at(s(),'comparison','observe-B',c.b.references[1].stand);c.walkTo(c.b.references[1].stand);c.action('observe-b');
  at(s(),'comparison','compare',c.b.table.stand);c.walkTo(c.b.table.stand);c.action('compare');at(s(),'comparison','return',c.b.post);
  const missing=s();delete missing.homeworld.archiveV106;assert.equal(objective(missing).operation,'intro');
});

test('V110 separate A/B records follow the actual next dossier, carried support and walked report',()=>{
  const c=archiveComparisonRouteV107(f.owner),api=c.qa.load('app/game/systems/homeworldArchiveV106.ts');
  const action=name=>{const state=c.state(),out=api.applyArchiveActionV106(state.legacyArchive,name,state.legacyArchive?.revision??0,c.context());assert(out.ok,out.message);c.restore({...state,legacyArchive:out.ledger});};
  const s=()=>save(c.state().legacyArchive,'archiveV106',c.owner);
  for(const a of ['choose-b','reply','start'])action(a);
  at(s(),'archive','take-A',{x:c.base.cases[0].origin.x,y:c.base.cases[0].origin.y+55});
  c.walkTo(c.base.cases[0].stand,true);action('take-a');at(s(),'archive','deposit-A',c.base.supports[0].stand);
  c.walkTo(c.base.supports[0].stand,true);action('deposit-a');
  at(s(),'archive','take-B',{x:c.base.cases[1].origin.x,y:c.base.cases[1].origin.y+55});
  c.walkTo(c.base.cases[1].stand,true);action('take-b');at(s(),'archive','deposit-B',c.base.supports[1].stand);
  c.walkTo(c.base.supports[1].stand,true);action('deposit-b');at(s(),'archive','return',c.base.post);
  c.walkTo(c.base.post,true);action('report');assert.equal(objective(s()).operation,'intro');
});

test('V110 active manipulation precedes a paused study in a contradictory input without changing either receipt',()=>{
  f.restore(initial);f.start();const c=cargoRouteV108(f.owner);c.start();c.action('interrupt',{active:false});
  const s=save(f.state().ledger);s.homeworld.cargoV108=c.state().ledger;const bytes=JSON.stringify(s);
  assert.equal(objective(s).operation,'plaque');
  assert.equal(JSON.stringify(s),bytes,'the read-only resolver cannot repair or merge conflicting receipts');
});

test('V110 strict foreign, future, malformed and unseen-port receipts never supply an operation objective',()=>{
  f.restore(initial);f.start();const s=save(f.state().ledger),bytes=JSON.stringify(s);
  const mutations=[x=>x.homeworld.archivePlaqueV109.ownerCreatedAt='2026-10-24T00:00:00.000Z',x=>x.homeworld.archivePlaqueV109.version=2,x=>x.homeworld.archivePlaqueV109.receipt.phase=['working'],x=>x.homeworld.visitedDistrictIds=[]];
  for(const mutate of mutations){const bad=structuredClone(s);mutate(bad);assert.equal(objective(bad).operation,'intro');assert(!objectives.homeworldAtlasLandmarksV110(bad).some(r=>r.id.startsWith('objective-')));}
  assert.equal(JSON.stringify(s),bytes);
});

test('V110 rejects historical phase lookalikes even where a legacy schema coerces them, without indexing a missing item',()=>{
  const c=archiveComparisonRouteV107(f.owner),completed=c.baseCompleted().legacyArchive;
  const schema=c.qa.load('app/game/systems/homeworldArchiveLedgerV106.ts');
  const impossible=structuredClone(completed);impossible.receipt.phase='working';impossible.receipt.uncertaintyRecorded=false;
  assert.equal(schema.normalizeHomeworldArchiveV106(impossible),null,'two supported records cannot be a live working phase');
  const lookalike=structuredClone(impossible);lookalike.receipt.phase=['working'];
  assert(schema.normalizeHomeworldArchiveV106(lookalike),'declared historical String(phase) weakness is preserved for its old API');
  const s=save(lookalike,'archiveV106');assert.doesNotThrow(()=>objective(s));assert.equal(objective(s).operation,'intro');
  assert(!objectives.homeworldAtlasLandmarksV110(s).some(r=>r.id.startsWith('objective-archive-')));
  const interrupted=structuredClone(impossible);interrupted.receipt.phase='interrupted';interrupted.receipt.resumePhase=['return'];interrupted.receipt.interruptedCount=1;
  assert.doesNotThrow(()=>objective(save(interrupted,'archiveV106')));assert.equal(objective(save(interrupted,'archiveV106')).operation,'intro');
});

test('V110 cartography A uses its actual +1 high point and exact interrupted floor instead of an unrelated intro service',()=>{
  const api=qa.load('app/game/systems/homeworldCartographyV105.ts'),b=qa.load('app/game/systems/homeworldCartographyDefinitionV105.ts').HOMEWORLD_CARTOGRAPHY_V105;
  const context={ownerCreatedAt:f.owner,currentOwnerCreatedAt:f.owner,actor:b.post,levelId:'0',visitedDistrictIds:['port'],active:true};
  let ledger;for(const a of ['choose-a','reply','start']){const out=api.applyCartographyActionV105(ledger,a,ledger?.revision??0,context);assert(out.ok,out.message);ledger=out.ledger;}
  const s=save(ledger,'cartographyV105');let o=at(s,'cartography-high','high-point',b.highPoint);assert.equal(o.landmark.levelId,'+1');
  const interrupted=api.applyCartographyActionV105(ledger,'interrupt',ledger.revision,{...context,active:false});assert(interrupted.ok);o=at(save(interrupted.ledger,'cartographyV105'),'cartography-high','resume',b.post);assert.equal(o.landmark.levelId,'0');
});

test('V110 local cartography uses the next real waypoint and frozen historical recommendation remains unchanged',()=>{
  const api=qa.load('app/game/systems/homeworldCartographyV104.ts'),b=qa.load('app/game/systems/homeworldCartographyDefinitionV104.ts').HOMEWORLD_CARTOGRAPHY_V104;
  const context={ownerCreatedAt:f.owner,currentOwnerCreatedAt:f.owner,actor:b.post,levelId:'0',visitedDistrictIds:['port'],active:true};
  let ledger;for(const a of ['choose-b','reply','start']){const out=api.applyCartographyActionV104(ledger,a,ledger?.revision??0,context);assert(out.ok,out.message);ledger=out.ledger;}
  const s=save(ledger,'cartographyV104'),previous=oldRecommendation.homeworldWayfindingRecommendedV75(s);at(s,'cartography-local','waypoint-0',b.waypoints[0]);
  assert.equal(oldRecommendation.homeworldWayfindingRecommendedV75(s),previous);
});

test('V110 atlas renders the operational next action and its selectable marker using the same owner-scoped registry',()=>{
  f.restore(initial);f.start();f.walkTo(f.b.objects[0].stand);for(const a of ['observe-plaque','copy-plaque','take-plaque'])f.action(a);
  const s=save(f.state().ledger),o=objective(s),html=qa.render('app/game/HomeworldWorldMapV77.tsx',{actor:f.state().actor,levelId:'0',open:true,save:s,onOpenChange(){}});
  assert(html.includes('data-homeworld-current-objective-v110="plaque"'));assert(html.includes('Étape actuelle'));assert(html.includes(o.instruction));assert(html.includes('data-map-landmark-v83="'+o.destinationId+'"'));
  assert(html.includes('Objectif actuel'));
});
