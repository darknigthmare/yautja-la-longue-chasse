import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78();
const v111=qa.load('app/game/systems/homeworldWayfindingV111.ts');
const v112=qa.load('app/game/systems/homeworldWayfindingV112.ts');
const rooms=qa.load('app/game/systems/homeworldInteriorsV64.ts');
const atlas=qa.load('app/game/systems/homeworldObjectivesV111.ts');
const motor=qa.load('app/game/systems/homeworldCity.ts');

test('the market stop can rejoin the existing safe route and follow a replanned V112 route to the actual service',()=>{
 const save=qa.load('app/game/save.ts').defaultSave('2026-10-28T10:00:00.000Z');
 save.homeworld.visitedDistrictIds=['port','market','forges','memory','terraces','temple','enforcers','citadel','undercity'];
 const target=atlas.homeworldAtlasLandmarksV111(save).find(item=>item.pointId==='market-service');
 assert(target);
 const room=rooms.homeworldInteriorForBuildingV64(target.buildingId);
 const origin={actor:room.spawn,levelId:target.levelId,interiorId:target.buildingId};
 const stopped={x:198.4823632125863,y:178.47060535431052};
 const oldPlan=v111.homeworldRoutePlanV111(save,origin,target.id);
 const oldGuide=v111.homeworldRouteGuidanceV111(oldPlan,{...origin,actor:stopped},save);
 assert.equal(oldGuide.state,'walking');
 assert(rooms.isHomeworldInteriorWalkableV64(room,oldGuide.waypoint));
 const plan=v112.homeworldRoutePlanV112(save,{...origin,actor:stopped},target.id);
 assert.equal(plan.status,'reachable');
 let actor={...motor.createHomeworldActor(),...stopped,vx:0,vy:0},arrived=false;
 const before=JSON.stringify(save);
 for(let step=0;step<2000;step++){
  const guide=v112.homeworldRouteGuidanceV112(plan,{...origin,actor},save);
  assert(guide);assert.notEqual(guide.state,'off-route');
  if(guide.state==='arrived'){
   assert.equal(rooms.nearestHomeworldInteriorTargetV64(room,actor)?.pointId,target.pointId);
   arrived=true;break;
  }
  const point=guide.waypoint;assert(point);
  const span=Math.max(Math.abs(point.x-actor.x)/330,Math.abs(point.y-actor.y)/260,1/60);
  const next=motor.stepHomeworldActorOnFloor(actor,{moveX:(point.x-actor.x)/(330*span),climb:(point.y-actor.y)/(260*span),jumpPressed:false},1/60,
   p=>rooms.isHomeworldInteriorWalkableV64(room,p),()=>{throw Error('Unexpected recovery');});
  assert(rooms.isHomeworldInteriorWalkableV64(room,next));
  assert(Math.hypot(next.x-actor.x,next.y-actor.y)>0.000001);
  actor=next;
 }
 assert(arrived);assert.equal(JSON.stringify(save),before);
});
