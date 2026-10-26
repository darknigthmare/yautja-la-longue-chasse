import test from 'node:test';
import assert from 'node:assert/strict';
import {archiveContinuationRouteV111} from './helpers/archive-continuation-v111-route.mjs';
import {cargoRouteV108} from './helpers/cargo-v108-route.mjs';
import {createOccupiedDoorwayV110} from './helpers/cargo-doorway-v110-route.mjs';

const f=archiveContinuationRouteV111(),initial=structuredClone(f.state()),qa=f.qa;
const api=qa.load('app/game/systems/homeworldObjectivesV111.ts');
const routes=qa.load('app/game/systems/homeworldWayfindingV111.ts');
const legacy=qa.load('app/game/systems/homeworldObjectivesV110.ts');
const oldRoutes=qa.load('app/game/systems/homeworldWayfindingV110.ts');
const saves=qa.load('app/game/save.ts');
const currentSave=()=>{const s=saves.defaultSave(f.owner);s.homeworld.visitedDistrictIds=['port'];s.homeworld.archivePlaqueV109=structuredClone(f.state().base);s.homeworld.archiveContinuationV111=structuredClone(f.state().ledger);return s;};
const objective=s=>api.homeworldCurrentObjectiveV111(s);
const stand=o=>({x:o.landmark.position.x,y:o.landmark.position.y+55});
const step=(s,name)=>{const before=JSON.stringify(s),o=objective(s);assert(o);assert.equal(o.operation,'continuation');assert.equal(o.destinationId,`objective-continuation-${name}-v111`);assert.equal(JSON.stringify(s),before);assert(api.homeworldAtlasLandmarksV111(s).some(r=>r.id===o.destinationId));assert(!api.homeworldAtlasLandmarksV111(s).some(r=>r.id.startsWith('objective-plaque-')));return o;};

test('V111 keeps every legacy-only recommendation, landmark and path without saved-state changes',()=>{
  assert.equal(objective(undefined),null);
  const s=saves.defaultSave(f.owner);s.homeworld.visitedDistrictIds=['port'];
  const before=JSON.stringify(s);
  assert.deepEqual(objective(s),legacy.homeworldCurrentObjectiveV110(s));
  assert.deepEqual(api.homeworldAtlasLandmarksV111(s),legacy.homeworldAtlasLandmarksV110(s));
  const origin={actor:f.b.post,levelId:'0',interiorId:null};
  assert.deepEqual(routes.homeworldRoutePlanV111(s,origin,f.b.npcId),oldRoutes.homeworldRoutePlanV110(s,origin,f.b.npcId));
  assert.equal(JSON.stringify(s),before);
});

test('V111 actual later choice, reply and consent receive distinct current-objective IDs at the unchanged K17 post',()=>{
  f.restore(initial);const base=JSON.stringify(f.state().base);
  f.action('open');let o=step(currentSave(),'offer');assert.deepEqual(stand(o),f.b.post);
  f.action('choose-a');step(currentSave(),'reply');f.action('reply');step(currentSave(),'authorize');
  f.action('authorize');step(currentSave(),'start');f.action('start');
  o=step(currentSave(),'edge');assert.deepEqual(stand(o),f.b.supports[0].stand);
  assert.equal(JSON.stringify(f.state().base),base);
  assert.equal(f.state().ledger.receipt.study.receipt.objects[0].place,'support');
  assert.equal(f.state().ledger.receipt.study.receipt.objects[1].place,'support');
});

test('V111 continuation offers do not steal the current objective from another actual in-progress operation',()=>{
  f.restore(initial);f.action('open');const s=currentSave(),cargo=cargoRouteV108(f.owner);cargo.start();s.homeworld.cargoV108=cargo.state().ledger;
  assert.equal(objective(s).operation,'cargo');assert(!api.homeworldAtlasLandmarksV111(s).some(r=>r.id.startsWith('objective-continuation-')));
});

test('V111 voluntary interruption keeps its real exact stand, three-unit route and stale-result rejection',()=>{
  f.restore(initial);f.start();f.walkTo({x:7660,y:5350});f.action('interrupt',{active:false});
  const s=currentSave(),o=step(s,'resume'),origin={actor:f.state().actor,levelId:'0',interiorId:null},base=JSON.stringify(s.homeworld.archivePlaqueV109);
  assert.deepEqual(stand(o),s.homeworld.archiveContinuationV111.receipt.study.receipt.last);
  const plan=routes.homeworldRoutePlanV111(s,origin,o.destinationId);assert.equal(plan.status,'reachable',plan.reason);assert.equal(plan.stages.at(-1).radius,3);
  const request={ownerCreatedAt:s.createdAt,destinationId:o.destinationId,origin,geometryKey:plan.geometryKey,destinationKey:plan.destinationKey};
  assert(routes.homeworldRouteResponseCurrentV111(request,plan,s,origin));
  f.action('resume');const resumed=currentSave();
  assert.equal(routes.homeworldRouteResponseCurrentV111(request,plan,resumed,origin),false);
  assert.equal(routes.homeworldRouteGuidanceV111(plan,origin,resumed).state,'off-route');
  assert.equal(JSON.stringify(resumed.homeworld.archivePlaqueV109),base);
});

test('V111 real failure and return recommend only the next source action, preserving physical legacy IDs and B bytes',()=>{
  f.restore(initial);const base=JSON.stringify(f.state().base);f.mismatch();
  step(currentSave(),'request-reprise');f.action('interrupt',{active:false});step(currentSave(),'resume-source');f.action('resume');
  step(currentSave(),'observe-fragment');
  assert(api.homeworldAtlasLandmarksV111(currentSave()).some(r=>r.id==='archive-plaque-object-fragment-v109'));
  f.fragment();f.walkTo(f.b.supports[0].stand);f.action('compare-fragment');step(currentSave(),'conclude');
  f.action('conclude');step(currentSave(),'return');f.walkTo(f.b.post);f.action('report');
  assert.notEqual(objective(currentSave())?.operation,'continuation');
  assert(!api.homeworldAtlasLandmarksV111(currentSave()).some(r=>r.id.startsWith('objective-continuation-')));
  assert(api.homeworldAtlasLandmarksV111(currentSave()).some(r=>r.id==='archive-plaque-object-fragment-v109'));
  assert.equal(JSON.stringify(f.state().base),base);
});

test('V111 owner, changed-base, future and unknown-port continuation receipts cannot supply objectives or fragment locations',()=>{
  f.restore(initial);f.mismatch();f.action('interrupt',{active:false});f.action('resume');
  for(const mutate of [s=>s.createdAt='2026-10-27T10:00:00.000Z',s=>s.homeworld.archiveContinuationV111.version=2,s=>s.homeworld.archivePlaqueV109.revision++,s=>s.homeworld.visitedDistrictIds=[]]){
    const s=currentSave();mutate(s);assert.notEqual(objective(s)?.operation,'continuation');assert(!api.homeworldAtlasLandmarksV111(s).some(r=>r.id.startsWith('objective-continuation-')));
  }
});

let doorwayFixture;
function doorway(){
  if(!doorwayFixture){const c=cargoRouteV108(f.owner),played=createOccupiedDoorwayV110(f.owner,c),location=c.qa.load('app/game/systems/homeworldLocationV77.ts'),interiors=c.qa.load('app/game/systems/homeworldInteriorsV64.ts');doorwayFixture={c,played,location,room:interiors.homeworldInteriorForBuildingV64(played.building.id)};}
  const {c,played,location,room}=doorwayFixture,s=saves.defaultSave(f.owner);s.homeworld.visitedDistrictIds=['port'];s.homeworld.cargoV108=structuredClone(played.ledger);s.homeworld.locationV77=location.createHomeworldCheckpointV77(f.owner,'0',{...played.actor,...room.spawn},room.buildingId,played.actor);return{c,played,location,room,s};
}

test('V111 uses the real603-step doorway stand and only a motor-valid bounded departure before ordinary street clearance',()=>{
  const {c,played,room,s}=doorway(),origin={actor:room.spawn,levelId:'0',interiorId:room.buildingId},target=c.b.npcId,bytes=JSON.stringify(s);
  assert.equal(oldRoutes.homeworldRoutePlanV110(s,origin,target).status,'unavailable','reproduce the authored occupied-centre failure');
  const plan=routes.homeworldRoutePlanV111(s,origin,target);assert.equal(plan.status,'reachable',plan.reason);
  const exterior=plan.stages.find(stage=>stage.interiorId===null);assert.deepEqual(exterior.points[0],{x:played.actor.x,y:played.actor.y});
  assert(Math.hypot(exterior.doorDepartureV111.socket.x-played.actor.x,exterior.doorDepartureV111.socket.y-played.actor.y)<=96.000001);
  assert.equal(JSON.stringify(s),bytes);
});

test('V111 the actual native motor follows the side-door guide into the normal street route without a phantom movement or cargo mutation',()=>{
  const {c,played,location,s}=doorway();let actor={...played.actor,vx:0,vy:0};
  s.homeworld.locationV77=location.createHomeworldCheckpointV77(f.owner,'0',actor,null,actor);
  const origin={actor,levelId:'0',interiorId:null},plan=routes.homeworldRoutePlanV111(s,origin,c.b.npcId),cargo=JSON.stringify(s.homeworld.cargoV108);
  assert.equal(plan.status,'reachable',plan.reason);let steps=0,walked=0;
  while(steps++<6000){
    const guide=routes.homeworldRouteGuidanceV111(plan,{...origin,actor},s);assert(guide);assert.notEqual(guide.state,'off-route',JSON.stringify(actor));
    if(guide.state==='arrived')break;
    assert(guide.waypoint);const before=actor,target=guide.waypoint,span=Math.max(Math.abs(target.x-actor.x)/330,Math.abs(target.y-actor.y)/260,1/60);
    actor=c.api.stepHomeworldCargoActorV108(actor,{moveX:(target.x-actor.x)/(330*span),climb:(target.y-actor.y)/(260*span),jumpPressed:false},1/60,'0',s.homeworld.cargoV108);
    const travelled=Math.hypot(actor.x-before.x,actor.y-before.y);assert(travelled>.000001,'the unchanged motor resolves the indicated step');walked+=travelled;
    assert.equal(c.api.cargoCaseCollisionV108(s.homeworld.cargoV108,actor),null);
  }
  assert(steps<6000);assert(walked>2000);assert.equal(routes.homeworldRouteGuidanceV111(plan,{...origin,actor},s).state,'arrived');
  assert.equal(JSON.stringify(s.homeworld.cargoV108),cargo);
});

test('V111 a real later pickup invalidates the accepted side-door prefix just like every other cargo route',()=>{
  const {c,played,location,s}=doorway(),origin={actor:played.actor,levelId:'0',interiorId:null};
  s.homeworld.locationV77=location.createHomeworldCheckpointV77(f.owner,'0',played.actor,null,played.actor);
  const plan=routes.homeworldRoutePlanV111(s,origin,c.b.npcId),request={ownerCreatedAt:s.createdAt,destinationId:c.b.npcId,origin,geometryKey:plan.geometryKey,destinationKey:plan.destinationKey};
  assert.equal(plan.status,'reachable');assert(routes.homeworldRouteResponseCurrentV111(request,plan,s,origin));
  // The fixture's source route remains at the genuine park stand, before the
  // empty-handed side approach. Taking that same load is an actual new action.
  c.action('resume');c.action('take-narrow');const changed=structuredClone(s);changed.homeworld.cargoV108=structuredClone(c.state().ledger);
  assert.equal(routes.homeworldRouteResponseCurrentV111(request,plan,changed,origin),false);
  assert.equal(routes.homeworldRouteGuidanceV111(plan,origin,changed).state,'off-route');
});

test('V111 cannot use a foreign, wrong-room, wrong-floor or blocked old checkpoint as a side-door departure',()=>{
  for(const mutate of [s=>s.homeworld.locationV77.ownerCreatedAt='2026-10-27T10:00:00.000Z',s=>s.homeworld.locationV77.interiorId='residence-port-1',s=>s.homeworld.locationV77.levelId='+1',s=>s.homeworld.locationV77.exterior={x:7570,y:3410}]){
    const {c,room,s}=doorway();mutate(s);const p=routes.homeworldRoutePlanV111(s,{actor:room.spawn,levelId:'0',interiorId:room.buildingId},c.b.npcId);assert.equal(p.status,'unavailable');assert.deepEqual(p.stages,[]);
  }
});

test('V111 arrived guide collapses to its real destination and mapped action while options remain accessible and pause/stale hide action advice',()=>{
  const guidance={state:'arrived',direction:'À portée',instruction:'Interagis sur place pour consulter ce poste.',remaining:0,stage:{levelId:'0',interiorId:null}},props={label:'Surface séparée · plaque',targetId:'surface',guidance,current:true,interactionShortcut:'E / A',suspended:false,onRecalculate(){},onChange(){},onClear(){}};
  const html=qa.render('app/game/HomeworldRouteGuideV111.tsx',props);
  assert.match(html,/data-homeworld-guide-compact-v111="true"/);assert.match(html,/Options de l’itinéraire/);assert.match(html,/aria-label="Effacer l’itinéraire à pied"/);assert.match(html,/Interagir sur place : E \/ A/);
  assert(!/<details[^>]*\bopen(?:=|\s|>)/.test(html),'arrival does not cover the scene with an opened options panel');
  for(const patch of [{suspended:true},{calculating:true},{current:false}]){
    const blocked=qa.render('app/game/HomeworldRouteGuideV111.tsx',{...props,...patch});assert.match(blocked,/data-homeworld-guide-compact-v111="false"/);assert(!blocked.includes('aria-label="Interagir sur place :'));
  }
});
