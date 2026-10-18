import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78(),load=name=>qa.load('app/game/systems/'+name+'.ts');
const rooms=load('homeworldInteriorsV64'),furniture=load('homeworldFurnitureV72'),decor=load('homeworldInteriorDecorV76'),street=load('homeworldStreetDecorV83'),port=load('homeworldPortPublicComplexV84');
const corners=b=>[{x:b.left,y:b.top},{x:b.right,y:b.top},{x:b.right,y:b.bottom},{x:b.left,y:b.bottom}];
// Independent SAT, including the native polygons, not a gameplay collision mock.
function penetrates(a,b){
 for(const poly of[a,b])for(let i=0;i<poly.length;i++){
  const p=poly[i],q=poly[(i+1)%poly.length],axis={x:-(q.y-p.y),y:q.x-p.x};
  const left=a.map(v=>v.x*axis.x+v.y*axis.y),right=b.map(v=>v.x*axis.x+v.y*axis.y);
  if(Math.max(...left)<=Math.min(...right)+1e-7||Math.max(...right)<=Math.min(...left)+1e-7)return false;
 }
 return true;
}
function actualSolids(room){
 return[
  ...(room.partitions??[]).map(p=>({id:p.id,polygon:corners({left:p.x,right:p.x+p.width,top:p.y,bottom:p.y+p.depth})})),
  ...[...(room.furniture??[]),...(room.publicFittingsV82?.furniture??[])].map(p=>({id:p.id,polygon:corners(furniture.homeworldFurnitureFootprintV72(p))})),
  ...[...(room.orientedDecorV76??[]),...(room.monumentDecorV81??[]),...(room.publicFittingsV82?.decor??[])].filter(p=>p.solid).map(p=>({id:p.id,polygon:corners(decor.homeworldInteriorDecorBoundsV76(p))})),
  ...(room.publicComplexV83?.nativeProps??[]).map(p=>({id:p.id,polygon:street.homeworldStreetDecorPolygonV83(p)})),
  ...(room.portComplexV84?.nativeProps??[]).map(p=>({id:p.id,polygon:port.homeworldPortNativePolygonV84(p)})),
  ...room.props.map(p=>({id:p.id,polygon:corners({left:p.x-p.halfWidth,right:p.x+p.halfWidth,top:p.y-p.halfDepth*2,bottom:p.y})})),
  ...room.points.map(p=>rooms.homeworldInteriorPointPropV64(p)).filter(Boolean).map(p=>({id:p.id,polygon:corners({left:p.x-p.halfWidth,right:p.x+p.halfWidth,top:p.y-p.halfDepth*2,bottom:p.y})})),
 ];
}
const cases=[
 {room:'dock-control',id:'dock-control-v74-cargaison',previous:{x:402,y:72},wall:'dock-control-v84-wall-reserve-screen',artId:'convoy-crates',scale:.7},
 {room:'dock-control',id:'dock-control-v84-departure-lot',previous:{x:388,y:282},wall:'dock-control-v74-wall-lower',artId:'convoy-crates',scale:.55},
 {room:'market-armory',id:'market-armory-v72-foyer-light-east',previous:{x:505,y:230},wall:'market-armory-crosswall-2',artId:'resin-lantern',scale:.66},
 {room:'convoy-workshop',id:'convoy-workshop-v74-veille',previous:{x:506,y:146},wall:'convoy-workshop-v74-wall-east',artId:'resin-lantern',scale:.6},
];
for(const c of cases)test(c.id+': full native contact clears every nearby wall, furnishing and existing solid without shrinking',()=>{
 const room=rooms.HOMEWORLD_INTERIORS_V64.find(r=>r.buildingId===c.room),item=room.furniture.find(p=>p.id===c.id);assert(item);
 assert.equal(item.artId,c.artId);assert.equal(item.scale,c.scale);
 const prior=furniture.homeworldFurnitureFootprintV72({...item,...c.previous}),actual=furniture.homeworldFurnitureFootprintV72(item),polygon=corners(actual),solids=actualSolids(room);
 const wall=solids.find(p=>p.id===c.wall);assert(wall);
 assert(penetrates(corners(prior),wall.polygon),'regression fixture must reproduce its original penetration');
 assert.equal(actual.right-actual.left,prior.right-prior.left,'preserve complete native width');assert.equal(actual.bottom-actual.top,prior.bottom-prior.top,'preserve complete native depth');
 assert(actual.left>=10&&actual.right<=room.width-10&&actual.top>=10&&actual.bottom<=room.depth-10,'complete support stays within the original room');
 for(const other of solids)if(other.id!==item.id)assert(!penetrates(polygon,other.polygon),'new crossing with '+other.id);
 assert.equal(rooms.isHomeworldInteriorWalkableV64(room,{x:(actual.left+actual.right)/2,y:(actual.top+actual.bottom)/2},{halfWidth:0,halfDepth:0}),false,'moved native footprint remains a real solid');
});

test('alignment preserves the exact original port/armory service bindings and V84 operator console',()=>{
 const dock=rooms.HOMEWORLD_INTERIORS_V64.find(r=>r.buildingId==='dock-control'),market=rooms.HOMEWORLD_INTERIORS_V64.find(r=>r.buildingId==='market-armory'),workshop=rooms.HOMEWORLD_INTERIORS_V64.find(r=>r.buildingId==='convoy-workshop');
 assert.deepEqual(dock.points,[{pointId:'dock-officer-point',x:108,y:144},{pointId:'suspect-trophy-point',x:410,y:172}]);
 const service=market.points.find(p=>p.pointId==='market-service');assert.equal(service.x,134.5);assert(Math.abs(service.y-121.44)<1e-8);
 const console=workshop.portComplexV84.nativeProps.find(p=>p.id==='convoy-workshop-v84-preparation-console');assert.deepEqual({x:console.x,y:console.y,scale:console.scale},{x:134,y:190,scale:1});
});
