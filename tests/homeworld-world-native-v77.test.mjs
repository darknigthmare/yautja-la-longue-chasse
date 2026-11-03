import test from 'node:test';import assert from 'node:assert/strict';import crypto from 'node:crypto';import fs from 'node:fs';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
const api=homeworldQaModelV64(process.cwd(),['homeworldCity.ts','homeworldWorldV77.ts','homeworldGeometryV64.ts','homeworldConnectorArtV77.ts','homeworldLavaPlacementV77.ts']);
test('Council stair native SHA and both flat sockets align through one uniform scale with no source mutation',()=>{
 const c=api.HOMEWORLD_CONNECTORS_V77.find(c=>c.id==='council-stair'),art=api.HOMEWORLD_COUNCIL_STAIR_ART_V77,p=api.homeworldCouncilStairPlacementV77({...c.from,elevation:0},{...c.to,elevation:520});
 for(const [socket,actual]of[[art.lowerSocket,p.lower],[art.upperSocket,p.upper]]){assert(Math.abs(p.left+socket.x*p.scale-actual.x)<1e-7);assert(Math.abs(p.top+socket.y*p.scale-actual.y)<1e-7);}
 assert.equal(p.width/art.sourceWidth,p.height/art.sourceHeight);assert.equal(crypto.createHash('sha256').update(fs.readFileSync('public'+art.src)).digest('hex'),art.sha256);assert.equal(art.borderPixels,0);
 for(const rail of api.homeworldCouncilStairRailsV77({...c.from,elevation:0},{...c.to,elevation:520})){assert.equal(api.homeworldCollisionV77(rail.levelId,{x:(rail.left+rail.right)/2,y:(rail.top+rail.bottom)/2}).id,rail.id);}
 for(const side of[c.from,c.to])assert(api.homeworldWalkableV77(side.levelId,side.point));
 // Conservative complete image bounds independently reject the first runtime
 // placement, whose volée cut the native lodge. No z-index hides that defect.
 for(const b of api.HOMEWORLD_BUILDINGS_V77.filter(b=>['0','+1'].includes(b.levelId))){
  const r=api.homeworldBuildingSpritePlacementV64(b),top=r.top-api.homeworldLevelV77(b.levelId).elevation;
  assert(!(p.painted.left<r.left+r.width+24&&p.painted.left+p.painted.width>r.left-24&&p.painted.top<top+r.height+24&&p.painted.top+p.painted.height>top-24),b.id+' overlaps native Council stair paint');
 }
 assert(api.homeworldTerrainV77(c.from.levelId,c.from.point,{halfWidth:330,halfDepth:100}),'entire lower native landing has real support');
 assert(api.homeworldTerrainV77(c.to.levelId,c.to.point,{halfWidth:330,halfDepth:100}),'entire upper native landing has real support');
});
test('two separate statue bases have complete ground support, remain solid and preserve native image hashes',()=>{
 for(const base of api.HOMEWORLD_LAVA_BASES_V77){assert(api.homeworldTerrainV77('0',{x:base.x,y:base.y-base.depth/2},{halfWidth:base.width/2,halfDepth:base.depth/2}));assert.equal(api.homeworldCollisionV77('0',{x:base.x,y:base.y-40}).id,base.id);}
 for(const art of api.HOMEWORLD_LAVA_ART_V77){assert.equal(crypto.createHash('sha256').update(fs.readFileSync('public'+art.src)).digest('hex'),art.sha256);assert.equal(art.borderPixels,0);}
});
test('skiff needs the actual permitted dock, travels continuously for12seconds and freezes in pause',()=>{
 const actor={...api.createHomeworldWorldActorV77(),x:460,y:3600};assert.equal(api.beginHomeworldSkiffV77('0',actor,false),null);assert.equal(api.beginHomeworldSkiffV77('+1',actor,true),null);assert.equal(api.beginHomeworldSkiffV77('0',api.createHomeworldWorldActorV77(),true),null);
 let ride=api.beginHomeworldSkiffV77('0',actor,true),current=actor,result;assert(ride);
 for(const point of[{x:460,y:3480},{x:330,y:3600}])assert.equal(api.beginHomeworldSkiffV77('0',{...actor,...point},true),null,'nearby shore cannot board without painted whole-body deck support');
 const art=api.homeworldLavaArtV77('lava-transit-skiff');assert(api.homeworldSkiffSourceOnDeckV77(art.pivot));assert(api.homeworldSkiffSourceOnDeckV77(art.ferrymanSource));assert(api.homeworldSkiffFootOnDeckV77(actor));
 const scale=art.heightWorld/art.alphaBounds.height,passeur={x:actor.x+(art.ferrymanSource.x-art.pivot.x)*scale,y:actor.y+(art.ferrymanSource.y-art.pivot.y)*scale/api.HOMEWORLD_GEOMETRY_V64.depthScale};
 assert(api.homeworldSkiffFootOnDeckV77(passeur,actor,api.HOMEWORLD_ACTOR),'entire ferryman support remains inside the measured painted deck');
 assert(Math.abs(passeur.x-actor.x)>api.HOMEWORLD_ACTOR.halfWidth*2||Math.abs(passeur.y-actor.y)>api.HOMEWORLD_ACTOR.halfDepth*2,'adult passenger and ferryman do not overlap physical support boxes');
 while(ride){result=api.stepHomeworldSkiffV77(ride,current,1/60);assert(Math.hypot(current.x-result.actor.x,current.y-result.actor.y)<1);current=result.actor;if(ride.elapsed>4&&ride.elapsed<4.02){const frozen=api.stepHomeworldSkiffV77(result.ride,current,10,true);assert.equal(frozen.ride,result.ride);assert.equal(frozen.actor,current);}ride=result.ride;}
 assert(result.done);assert.deepEqual({x:current.x,y:current.y},{x:260,y:3850});assert.equal(result.actor.vx,0);assert.equal(result.actor.vy,0);
});
