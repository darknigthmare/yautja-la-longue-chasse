import test from 'node:test';import assert from 'node:assert/strict';import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
const api=homeworldQaModelV64(process.cwd(),['homeworldWorldV77.ts','homeworldCheckpointV77.ts','homeworldLocationV77.ts','homeworldGeometryV64.ts','homeworldInteriorsV64.ts']);const world=api,shape=api,location=api,geo=api,rooms=api;
test('old/invalid/future and foreign save checkpoints never grant progress or restore unsupported coordinates',()=>{
 assert.equal(shape.inspectHomeworldCheckpointV77(undefined),'absent');assert.equal(shape.inspectHomeworldCheckpointV77({version:2}),'future-version');assert.equal(shape.inspectHomeworldCheckpointV77({version:1,layoutRevision:2}),'future-version');
 const actor=world.createHomeworldWorldActorV77(),c=location.createHomeworldCheckpointV77('owner','0',actor,null,actor);
 assert.equal(shape.inspectHomeworldCheckpointV77(c),'valid');assert(location.resolveHomeworldLocationV77(c,'owner').restored);assert(!location.resolveHomeworldLocationV77(c,'other').restored);
 for(const bad of[{...c,exterior:{x:NaN,y:1}},{...c,levelId:'999'},{...c,interiorId:null,local:{x:1,y:1}}])assert.equal(shape.inspectHomeworldCheckpointV77(bad),'invalid-save');
 assert(!location.resolveHomeworldLocationV77({...c,exterior:{x:500,y:300}},'owner').restored);
});
test('all 43 true local interiors resume with their actual exterior floor and doorway anchor',()=>{
 for(const b of world.HOMEWORLD_BUILDINGS_V77){const room=rooms.homeworldInteriorForBuildingV64(b.id),exterior={...world.createHomeworldWorldActorV77(),...geo.homeworldBuildingDoorwayV64(b).approach},actor={...exterior,...room.spawn},c=location.createHomeworldCheckpointV77('owner',b.levelId,actor,b.id,exterior),result=location.resolveHomeworldLocationV77(c,'owner');assert(result.restored,b.id);assert.equal(result.interiorId,b.id);assert.equal(result.levelId,b.levelId);assert.deepEqual({x:result.actor.x,y:result.actor.y},room.spawn);assert.deepEqual({x:result.exterior.x,y:result.exterior.y},c.exterior);}
});
