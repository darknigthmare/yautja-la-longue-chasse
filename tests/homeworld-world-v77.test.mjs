import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
const api=homeworldQaModelV64(process.cwd(),['homeworldWorldV77.ts','homeworldCity.ts','homeworldGeometryV64.ts']);const world=api,city=api,geo=api;
test('real V76 source IDs, native art and 98 resident routines survive the per-level overlay',()=>{
 assert.equal(world.HOMEWORLD_BUILDINGS_V77.length,43);assert.equal(world.HOMEWORLD_RESIDENTS_V77.length,98);
 assert.deepEqual(world.HOMEWORLD_BUILDINGS_V77.map(b=>b.id),city.HOMEWORLD_BUILDINGS.map(b=>b.id));
 for(const b of world.HOMEWORLD_BUILDINGS_V77){const old=city.HOMEWORLD_BUILDINGS.find(old=>old.id===b.id);assert.deepEqual(b.art,old.art);assert.deepEqual(b.footprint,old.footprint);assert.equal(b.width,old.width);assert.equal(b.y,old.y);assert.equal(b.x,old.x+(b.districtId==='port'?6500:0));}
 assert.equal(world.HOMEWORLD_POINTS_V77.length,26);assert.equal(world.HOMEWORLD_EXTERIOR_V77.length,74);
});
test('all six floors, connector landings, current building doors and region return sockets have complete support',()=>{
 const bad=[];
 for(const connector of world.HOMEWORLD_CONNECTORS_V77)for(const side of[connector.from,connector.to])if(!world.homeworldWalkableV77(side.levelId,side.point))bad.push({id:connector.id,side,terrain:world.homeworldTerrainV77(side.levelId,side.point),collision:world.homeworldCollisionV77(side.levelId,side.point)});
 for(const b of world.HOMEWORLD_BUILDINGS_V77){const p=geo.homeworldBuildingDoorwayV64(b).approach;if(!world.homeworldWalkableV77(b.levelId,p))bad.push({id:b.id,side:p,level:b.levelId,terrain:world.homeworldTerrainV77(b.levelId,p),collision:world.homeworldCollisionV77(b.levelId,p)});}
 for(const p of world.HOMEWORLD_POINTS_V77.filter(p=>p.regionId))if(!world.homeworldWorldArrivalV77(p.regionId))bad.push({id:p.regionId,return:'missing'});
 assert.deepEqual(bad,[]);
});
test('same x/y cannot interact with or collide against a building on another physical floor',()=>{
 const b=world.HOMEWORLD_BUILDINGS_V77.find(b=>b.id==='throne-audience'),door=geo.homeworldBuildingDoorwayV64(b).approach;
 assert.equal(b.levelId,'+2');assert.equal(world.nearestHomeworldDoorV77('0',door),null);assert.equal(world.nearestHomeworldDoorV77('+2',door)?.id,b.id);
 const point={x:b.x,y:b.y-100};assert.equal(world.homeworldCollisionV77('+2',point)?.id,b.id);assert.notEqual(world.homeworldCollisionV77('0',point)?.id,b.id);
 const a=world.projectHomeworldWorldV77(point,'0'),z=world.projectHomeworldWorldV77(point,'+2');assert.equal(a.x,z.x);assert.equal(a.y-z.y,1080);
});
test('a real stair travels continuously, freezes at its actual height in pause and ends on the supported destination',()=>{
 const c=world.HOMEWORLD_CONNECTORS_V77[0];let actor={...city.createHomeworldActor(),...c.from.point},transit=world.beginHomeworldTransitV77(c.from.levelId,actor),latest;
 assert(transit);let last=actor;
 for(let i=0;i<480;i++){latest=world.stepHomeworldTransitV77(transit,actor,1/60);assert(Math.hypot(latest.actor.x-last.x,latest.actor.y-last.y)<=1);last=actor=latest.actor;if(i===120){const frozen=world.stepHomeworldTransitV77(latest.transit,actor,5,true);assert.equal(frozen.actor,actor);assert.equal(frozen.elevation,latest.elevation);assert.equal(frozen.transit,latest.transit);}transit=latest.transit;if(!transit)break;}
 while(transit){latest=world.stepHomeworldTransitV77(transit,actor,1/60);actor=latest.actor;transit=latest.transit;}
 assert.equal(latest.done,true);assert.equal(latest.levelId,c.to.levelId);assert.deepEqual({x:actor.x,y:actor.y},c.to.point);assert.equal(latest.elevation,520);
 assert.equal(world.beginHomeworldTransitV77('0',city.createHomeworldActor()),null,'no remote transit command');
});
test('right spaceport translates native cluster consistently and lava/coast gates sit on the west',()=>{
 const spawn=world.createHomeworldWorldActorV77();assert.deepEqual({x:spawn.x,y:spawn.y},{x:7780,y:4480});assert(world.homeworldWalkableV77('0',spawn));
 assert(world.HOMEWORLD_SPACEPORT_V77.pad.x>Math.max(...world.HOMEWORLD_DISTRICTS_V77.filter(d=>d.id!=='port').map(d=>d.x+d.width)));
 assert(world.HOMEWORLD_REGIONAL_DOCKS_V77.every(dock=>dock.point.x<700));
 const skiff=world.HOMEWORLD_REGIONAL_DOCKS_V77.find(dock=>dock.kind==='skiff');assert.equal(skiff.statueSockets.length,2);assert.equal(skiff.artStatus,'SKIFF_AND_STATUES_REQUIRED');
});
test('98 original full-body resident paths remain supported and collision-free in their mapped floors',()=>{
 const failures=[];
 for(const resident of world.HOMEWORLD_RESIDENTS_V77)for(let segment=1;segment<resident.path.length;segment++){
  const a=resident.path[segment-1],b=resident.path[segment],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/.5));
  for(let i=0;i<=n;i++){const p={x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n};if(!world.homeworldWalkableV77(resident.levelId,p))failures.push({id:resident.id,p,level:resident.levelId,collision:world.homeworldCollisionV77(resident.levelId,p)});}
 }assert.deepEqual(failures,[]);
});
