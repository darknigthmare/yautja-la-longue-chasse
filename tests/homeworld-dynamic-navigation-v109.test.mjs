import test from 'node:test';
import assert from 'node:assert/strict';
import {cargoRouteV108} from './helpers/cargo-v108-route.mjs';
import {archivePlaqueRouteV109} from './helpers/archive-plaque-v109-route.mjs';

const f=cargoRouteV108('2026-10-25T10:00:00.000Z');
const navigation=f.qa.load('app/game/systems/homeworldNavigationV109.ts');
const wayfinding=f.qa.load('app/game/systems/homeworldWayfindingV109.ts');
const atlas=f.qa.load('app/game/systems/homeworldAtlasLandmarksV109.ts');
const saves=f.qa.load('app/game/save.ts');
const initial=structuredClone(f.state());
const from={...f.b.passage.start},to={...f.b.passage.end};
const stateSave=ledger=>{const save=saves.defaultSave(f.owner);save.homeworld.visitedDistrictIds=['port'];save.homeworld.cargoV108=structuredClone(ledger);return save;};
const makeParked=()=>{
 f.restore(initial);f.start();f.walkTo(f.b.lots[0].stand);f.action('take-wide');f.walkTo({x:6850,y:5590});f.action('interrupt');f.action('park');
 assert(f.schema.normalizeHomeworldCargoV108(f.state().ledger));
 return structuredClone(f.state());
};
function verify(route,ledger,start,end){
 assert.equal(route.status,'reachable');assert.deepEqual(route.points[0],start);assert.deepEqual(route.points.at(-1),end);
 assert(Math.abs(route.distance-route.points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-route.points[i].x,p.y-route.points[i].y),0))<1e-7);
 for(let i=1;i<route.points.length;i++)assert(navigation.homeworldRouteSegmentV109(route.levelId,route.points[i-1],route.points[i],ledger));
}
function motorTo(actor,point,ledger){
 let steps=0;
 while(Math.hypot(point.x-actor.x,point.y-actor.y)>2&&steps++<2000){
  const span=Math.max(Math.abs(point.x-actor.x)/330,Math.abs(point.y-actor.y)/260,1/60);
  const next=f.api.stepHomeworldCargoActorV108(actor,{moveX:(point.x-actor.x)/(330*span),climb:(point.y-actor.y)/(260*span),jumpPressed:false},1/60,'0',ledger);
  assert(f.civic.homeworldCivicWalkableV80('0',next));assert(!f.api.cargoCaseCollisionV108(ledger,next));
  assert(Math.hypot(next.x-actor.x,next.y-actor.y)>.0001,'native motor must make real progress along the returned edge');actor=next;
 }
 assert(Math.hypot(point.x-actor.x,point.y-actor.y)<=2,'native motor reaches the exact waypoint neighbourhood');
 return {actor,steps};
}

test('V109 routes around the real initial cargo hulls and every waypoint is traversed by the unchanged native motor',()=>{
 const ledger=initial.ledger,before=JSON.stringify(ledger);
 assert(f.nav.homeworldRouteSegmentV77('0',from,to));
 assert.equal(navigation.homeworldRouteSegmentV109('0',from,to,ledger),false);
 const route=navigation.homeworldWalkRouteV109('0',from,to,ledger);verify(route,ledger,from,to);assert(route.points.length>2);
 let actor={...f.world.createHomeworldWorldActorV77(),...from,vx:0,vy:0},steps=0;
 for(const point of route.points.slice(1)){const out=motorTo(actor,point,ledger);actor=out.actor;steps+=out.steps;}
 assert(steps>50);assert.equal(JSON.stringify(ledger),before,'planning and walking do not write an operation');
});

test('V109 a genuinely carried then parked lot changes the cached route while ordinary carried walking does not change ground geometry',()=>{
 f.restore(initial);f.start();f.walkTo(f.b.lots[0].stand);f.action('take-wide');
 const carried=structuredClone(f.state()),key=navigation.homeworldCargoGeometryKeyV109(carried.ledger);
 f.walkTo({x:6850,y:5590});assert.equal(navigation.homeworldCargoGeometryKeyV109(f.state().ledger),key);
 const clear=navigation.homeworldWalkRouteV109('0',from,to,f.state().ledger);verify(clear,f.state().ledger,from,to);
 f.action('interrupt');f.action('park');const parked=structuredClone(f.state().ledger);assert.notEqual(navigation.homeworldCargoGeometryKeyV109(parked),key);
 const route=navigation.homeworldWalkRouteV109('0',from,to,parked);verify(route,parked,from,to);assert.notDeepEqual(route.points,clear.points);
 let actor={...f.world.createHomeworldWorldActorV77(),...from,vx:0,vy:0};for(const point of route.points.slice(1))actor=motorTo(actor,point,parked).actor;
 const expected=structuredClone(route);route.points[0].x=-99999;route.points.push({x:0,y:0});assert.deepEqual(navigation.homeworldWalkRouteV109('0',from,to,parked),expected);
 assert.equal(navigation.homeworldWalkRouteV109('0',from,parked.receipt.lots[0],parked).status,'unavailable','an occupied destination must not be snapped or declared reached');
});

test('V109 guidance follows a real parked-load detour and stops offering an old route after the ground changes',()=>{
 const parked=makeParked(),save=stateSave(parked.ledger),origin={actor:from,levelId:'0',interiorId:null};
 const plan=wayfinding.homeworldRoutePlanV109(save,origin,f.b.npcId);assert.equal(plan.status,'reachable',plan.reason);
 let actor={...f.world.createHomeworldWorldActorV77(),...from,vx:0,vy:0},walking=0,arrived=false;
 for(let i=0;i<2500;i++){
  const guide=wayfinding.homeworldRouteGuidanceV109(plan,{...origin,actor},save);
  assert(guide&&guide.state!=='off-route','a live route must remain useful while following its own waypoints');
  if(guide.state==='arrived'){arrived=true;break;}
  assert(guide.waypoint);const span=Math.max(Math.abs(guide.waypoint.x-actor.x)/330,Math.abs(guide.waypoint.y-actor.y)/260,1/60);
  actor=f.api.stepHomeworldCargoActorV108(actor,{moveX:(guide.waypoint.x-actor.x)/(330*span),climb:(guide.waypoint.y-actor.y)/(260*span),jumpPressed:false},1/60,'0',parked.ledger);walking++;
 }
 assert(arrived&&walking>50);assert(f.api.cargoPostReachedV108(f.context(actor),parked.ledger));
 const moved=stateSave(initial.ledger);const stale=wayfinding.homeworldRouteGuidanceV109(plan,origin,moved);assert.equal(stale.state,'off-route');assert.match(stale.instruction,/lot a changé/);
});

test('V109 worker result admission rejects changed lots, changed target, slot, floor, room and a far moved origin',()=>{
 const parked=makeParked(),save=stateSave(parked.ledger),origin={actor:from,levelId:'0',interiorId:null},id=f.b.npcId;
 const plan=wayfinding.homeworldRoutePlanV109(save,origin,id),target=atlas.homeworldAtlasLandmarksV109(save).find(row=>row.id===id);
 const request={ownerCreatedAt:save.createdAt,destinationId:id,origin:structuredClone(origin),geometryKey:navigation.homeworldCargoGeometryKeyV109(save.homeworld.cargoV108),destinationKey:wayfinding.homeworldDestinationKeyV109(target)};
 assert(wayfinding.homeworldRouteResponseCurrentV109(request,plan,save,origin));
 const foreign=structuredClone(save);foreign.createdAt='2026-10-26T10:00:00.000Z';assert.equal(wayfinding.homeworldRouteResponseCurrentV109(request,plan,foreign,origin),false);
 const moved=stateSave(initial.ledger);assert.equal(wayfinding.homeworldRouteResponseCurrentV109(request,plan,moved,origin),false);
 for(const patch of [{levelId:'+1'},{interiorId:'dock-control'},{actor:{x:from.x+181,y:from.y}}])assert.equal(wayfinding.homeworldRouteResponseCurrentV109(request,plan,save,{...origin,...patch}),false);
 assert.equal(wayfinding.homeworldRouteResponseCurrentV109({...request,destinationKey:'old-position'},plan,save,origin),false);
 const hidden=structuredClone(save);hidden.homeworld.visitedDistrictIds=[];assert.equal(wayfinding.homeworldRouteResponseCurrentV109(request,plan,hidden,origin),false);
});

test('V109 current lot landmarks preserve observed placements and hide their positions before the port is visited',()=>{
 const parked=makeParked(),save=stateSave(parked.ledger),before=JSON.stringify(save),records=atlas.homeworldAtlasLandmarksV109(save);
 const wide=records.find(row=>row.id==='cargo-lot-wide-v109');assert(wide);assert.equal(wide.position.x,parked.ledger.receipt.lots[0].x);assert.equal(wide.position.y+55,parked.ledger.receipt.lots[0].y+60);
 assert.equal(JSON.stringify(save),before);
 save.homeworld.visitedDistrictIds=[];assert(!atlas.homeworldAtlasLandmarksV109(save).some(row=>row.id.startsWith('cargo-lot-')));
 assert.equal(wayfinding.homeworldRoutePlanV109(save,{actor:from,levelId:'0',interiorId:null},'cargo-lot-wide-v109').status,'unavailable');
});

test('V109 a physically moved K-17 object invalidates its destination even when cargo geometry is unchanged',()=>{
 const plaque=archivePlaqueRouteV109(f.owner);plaque.start();const object=plaque.b.objects.find(row=>row.id==='plaque');
 plaque.walkTo(object.stand);plaque.action('observe-plaque');plaque.action('copy-plaque');
 const save=saves.defaultSave(f.owner);save.homeworld.visitedDistrictIds=['port'];save.homeworld.archivePlaqueV109=structuredClone(plaque.state().ledger);
 const origin={actor:{x:plaque.state().actor.x,y:plaque.state().actor.y},levelId:'0',interiorId:null},id='archive-plaque-object-plaque-v109';
 const plan=wayfinding.homeworldRoutePlanV109(save,origin,id);assert.equal(plan.status,'reachable');
 const target=atlas.homeworldAtlasLandmarksV109(save).find(row=>row.id===id),request={ownerCreatedAt:save.createdAt,destinationId:id,origin:structuredClone(origin),geometryKey:plan.geometryKey,destinationKey:wayfinding.homeworldDestinationKeyV109(target)};
 assert(wayfinding.homeworldRouteResponseCurrentV109(request,plan,save,origin));
 plaque.action('take-plaque');plaque.walkTo(plaque.b.supports.find(row=>row.id==='plaque').stand);plaque.action('interrupt');plaque.action('park');
 const moved=structuredClone(save);moved.homeworld.archivePlaqueV109=structuredClone(plaque.state().ledger);
 assert(plaque.schema.normalizeHomeworldArchivePlaqueV109(moved.homeworld.archivePlaqueV109));
 assert.equal(navigation.homeworldCargoGeometryKeyV109(save.homeworld.cargoV108),navigation.homeworldCargoGeometryKeyV109(moved.homeworld.cargoV108));
 assert.equal(wayfinding.homeworldRouteResponseCurrentV109(request,plan,moved,origin),false);
 const stale=wayfinding.homeworldRouteGuidanceV109(plan,origin,moved);assert.equal(stale.state,'off-route');assert.match(stale.instruction,/repère a changé/);
});

test('V109 a parked K-17 study guides back to its exact preserved point and remains walking between three and five units',()=>{
 const plaque=archivePlaqueRouteV109(f.owner);plaque.start();plaque.walkTo(plaque.b.objects[0].stand);
 for(const action of ['observe-plaque','copy-plaque','take-plaque','interrupt','park'])plaque.action(action);
 const preserved=structuredClone(plaque.state().ledger.receipt.last);plaque.walkTo(plaque.b.post);
 const save=saves.defaultSave(f.owner);save.homeworld.visitedDistrictIds=['port'];save.homeworld.archivePlaqueV109=structuredClone(plaque.state().ledger);
 const before=JSON.stringify(save),id='archive-plaque-resume-v109',target=atlas.homeworldAtlasLandmarksV109(save).find(row=>row.id===id);
 assert(target,'the genuine interrupted receipt exposes its preserved point');assert.deepEqual({x:target.position.x,y:target.position.y+55},preserved);
 const origin={actor:{x:plaque.state().actor.x,y:plaque.state().actor.y},levelId:'0',interiorId:null},plan=wayfinding.homeworldRoutePlanV109(save,origin,id);
 assert.equal(plan.status,'reachable',plan.reason);assert.equal(plan.stages.at(-1).radius,3);assert.deepEqual(plan.stages.at(-1).points.at(-1),preserved);
 const near={...origin,actor:{x:preserved.x,y:preserved.y+4}},nearGuide=wayfinding.homeworldRouteGuidanceV109(plan,near,save);
 assert.equal(nearGuide.state,'walking','four units is outside the precise arrival radius and must still offer the final waypoint');assert.deepEqual(nearGuide.waypoint,preserved);
 let actor={...plaque.state().actor},arrived=false,steps=0;
 for(;steps<1000;steps++){
  const guide=wayfinding.homeworldRouteGuidanceV109(plan,{...origin,actor},save);assert(guide&&guide.state!=='off-route');
  if(guide.state==='arrived'){arrived=true;break;}
  const span=Math.max(Math.abs(guide.waypoint.x-actor.x)/330,Math.abs(guide.waypoint.y-actor.y)/260,1/60);
  actor=f.api.stepHomeworldCargoActorV108(actor,{moveX:(guide.waypoint.x-actor.x)/(330*span),climb:(guide.waypoint.y-actor.y)/(260*span),jumpPressed:false},1/60,'0');
 }
 assert(arrived&&steps>10);assert(Math.hypot(actor.x-preserved.x,actor.y-preserved.y)<=3);
 const resumed=plaque.api.applyArchivePlaqueV109(save.homeworld.archivePlaqueV109,'resume',save.homeworld.archivePlaqueV109.revision,plaque.context(actor));
 assert(resumed.ok,resumed.message);assert.equal(resumed.ledger.receipt.phase,'working');assert.equal(JSON.stringify(save),before,'read-only planning and guidance preserve the receipt');
 assert.equal(wayfinding.homeworldRoutePlanV109(save,origin,plaque.b.npcId).stages.at(-1).radius,24,'ordinary destination radii stay unchanged');
});

test('V109 keeps actual multi-floor connectors and interior endpoints with all exterior cargo edges checked',()=>{
 const save=saves.defaultSave(f.owner);save.homeworld.visitedDistrictIds=['port'];
 const origin={actor:f.world.HOMEWORLD_SPACEPORT_V77.spawn,levelId:'0',interiorId:null},before=JSON.stringify(save);
 const plan=wayfinding.homeworldRoutePlanV109(save,origin,'point:audience-point');assert.equal(plan.status,'reachable',plan.reason);assert.equal(plan.stages.filter(stage=>stage.kind==='connector').length,2);
 for(const stage of plan.stages.filter(stage=>!stage.interiorId))verify({...stage,status:'reachable'},undefined,stage.points[0],stage.points.at(-1));
 assert.equal(JSON.stringify(save),before);
});
