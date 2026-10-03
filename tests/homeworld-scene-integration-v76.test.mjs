import assert from 'node:assert/strict';import test from 'node:test';import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
const a=homeworldQaModelV64(process.cwd(),['homeworldCity.ts','homeworldSpatialCodex.ts','homeworldGeometryV64.ts','homeworldContextCodexV71.ts','homeworldInteriorsV64.ts','homeworldArchitectureV75.ts','homeworldExteriorDecorV76.ts','homeworldBuildingPlacementsV76.ts','homeworldFurnitureV72.ts']);
test('all 43 final physical doors are joined to spawn by actual full-body routes with clearance',()=>{
 for(const building of a.HOMEWORLD_BUILDINGS){const door=a.homeworldBuildingDoorwayV64(building),route=a.homeworldSpatialRoute(a.createHomeworldActor(),door.approach);
  assert.equal(route.status,'reachable',building.id);assert.equal(a.nearestHomeworldDoor(route.points.at(-1))?.id,building.id);
  for(let i=1;i<route.points.length;i++)assert(a.isHomeworldRouteSegmentWalkable(route.points[i-1],route.points[i]),building.id+' complete segment');
 }
});
test('all new decor and six angled facades are individually enumerated with actual scene bounds and real links',()=>{
 const records=a.HOMEWORLD_ALL_ELEMENT_CODEX_V71,ids=new Set(records.map(r=>r.id));assert.equal(ids.size,records.length);
 const interiors=a.HOMEWORLD_INTERIORS_V64.flatMap(r=>r.orientedDecorV76??[]),exteriors=a.HOMEWORLD_EXTERIOR_MODULES_V76;
 assert.equal(interiors.length,92);assert.equal(exteriors.length,74);assert.equal(records.filter(r=>r.id.startsWith('v76-facade:')).length,6);
 for(const item of [...interiors,...exteriors]){const record=records.find(r=>r.id===item.id);assert(record,item.id);assert(record.constraints.length>=4);assert(record.asset);assert.equal(record.lore,'original-adaptation');
  assert.equal(record.position.x,item.x);assert.equal(record.position.y,item.y);assert.equal(!!record.footprint,item.solid);for(const id of record.associatedElementIds)assert(ids.has(id),item.id+' missing '+id);
 }
 for(const building of a.HOMEWORLD_BUILDINGS.filter(b=>b.art.groundFrame)){const record=records.find(r=>r.id==='v76-facade:'+building.id);assert.equal(record.asset,building.art.src);
  assert.deepEqual(record.footprint.polygon,a.homeworldBuildingGroundFrameV76(building).polygon);assert.deepEqual(record.door.groundOpening,a.homeworldBuildingDoorwayV64(building).groundOpening);
  const approach=a.HOMEWORLD_BUILDING_APPROACHES_V71.find(p=>p.buildingId===building.id);assert.equal(approach.polygon.length,4);assert.deepEqual(approach.polygon.slice(0,2),Object.values(record.door.groundOpening));
 }
});
test('five authored placements clear angled volumes and old paths; no stable building or room IDs are removed',()=>{
 assert.deepEqual(Object.keys(a.HOMEWORLD_BUILDING_PLACEMENT_OFFSETS_V76).sort(),['convoy-store','convoy-workshop','dock-control','rite-sanctum','trophy-mausoleum']);
 assert.equal(a.HOMEWORLD_BUILDINGS.length,43);assert.equal(a.HOMEWORLD_INTERIORS_V64.length,43);
 for(const building of a.HOMEWORLD_BUILDINGS.slice(0,19)){const previous=a.HOMEWORLD_BUILDINGS_V54.find(b=>b.id===building.id),offset=a.HOMEWORLD_BUILDING_PLACEMENT_OFFSETS_V76[building.id]??{x:0,y:0};
  assert.equal(building.x,previous.x+offset.x);assert.equal(building.y,previous.y*a.HOMEWORLD_GEOMETRY_V64.planDepthExpansion+offset.y);
  assert(a.HOMEWORLD_INTERIORS_V64.some(r=>r.buildingId===building.id));
 }
});
test('angled facades sort at their actual front line beside the hero rather than a horizontal centre pivot',()=>{
 for(const building of a.HOMEWORLD_BUILDINGS){const frame=a.homeworldBuildingGroundFrameV76(building);
  if(!building.art.groundFrame){assert.equal(a.homeworldBuildingRenderDepthV76(building,{x:building.x+100,y:building.y}),building.y);continue;}
  for(const t of [.1,.5,.9]){const p={x:frame.frontLeft.x+(frame.frontRight.x-frame.frontLeft.x)*t,y:frame.frontLeft.y+(frame.frontRight.y-frame.frontLeft.y)*t};
   assert(Math.abs(a.homeworldBuildingRenderDepthV76(building,p)-p.y)<1e-8,building.id+' native front line');
  }
  const door=a.homeworldBuildingDoorwayV64(building);assert(a.homeworldBuildingRenderDepthV76(building,door.approach)<door.approach.y,'hero in front of its real doorway');
 }
});

test('six physical forecourts support native furnishings and beacons and expose their true paved polygon in the codex',()=>{
 assert.equal(a.HOMEWORLD_FORECOURTS_V76.length,6);
 for(const court of a.HOMEWORLD_FORECOURTS_V76){
  assert(a.HOMEWORLD_STREETS.includes(court));
  const record=a.HOMEWORLD_ALL_ELEMENT_CODEX_V71.find(r=>r.id==='street:'+court.id);
  assert.deepEqual(record.footprint.polygon,court.polygon);assert(record.asset);
 }
 for(const item of a.HOMEWORLD_ANGLED_FRONTAGE_ITEMS_V76){
  const box=a.homeworldFurnitureFootprintV72(item);
  assert(a.isHomeworldTerrainWalkable({x:(box.left+box.right)/2,y:(box.top+box.bottom)/2},
   {halfWidth:(box.right-box.left)/2,halfDepth:(box.bottom-box.top)/2}),item.id+' complete paved support');
 }
 const existingProps=[...a.HOMEWORLD_BUILDINGS.filter(b=>b.art.groundFrame).map(b=>'beacon-v64-'+b.id),'bench-v64-trophy-mausoleum'];
 for(const id of existingProps){
  const prop=a.HOMEWORLD_PROPS.find(p=>p.id===id);
  assert(a.isHomeworldTerrainWalkable({x:prop.x,y:prop.y-prop.footprint.halfDepth},prop.footprint),prop.id+' complete paved support');
  const centre={x:prop.x,y:prop.y-prop.footprint.halfDepth};
  for(const building of a.HOMEWORLD_BUILDINGS)assert(!a.homeworldBuildingTouchesV76(building,centre,prop.footprint),prop.id+' masonry '+building.id);
 }
});

test('real port boundary stops a whole hunter corner while neighboring valid street movement remains possible',()=>{
 const actor={...a.createHomeworldActor(),x:214,y:3077},input={moveX:-1,climb:0,jumpPressed:false};
 const outside={x:182,y:3091};
 assert(![...a.HOMEWORLD_DISTRICTS,...a.HOMEWORLD_STREETS].some(p=>a.pointInHomeworldPolygon(outside,p.polygon)));
 assert(a.isHomeworldWalkable(actor));assert(!a.isHomeworldTerrainWalkable({x:206,y:3077}));
 const stopped=a.stepHomeworldActor(actor,input,8/330);assert.equal(stopped.x,208.5);assert.equal(stopped.y,3077);assert.equal(stopped.vx,0);
 for(const [start,direction,expected]of[
  [actor,{moveX:1,climb:0},{x:222,y:3077}],
  [{...actor,x:220,y:3046},input,{x:212,y:3046}],
 ]){const moved=a.stepHomeworldActor(start,{...direction,jumpPressed:false},8/330);assert.equal(moved.x,expected.x);assert.equal(moved.y,expected.y);assert(a.isHomeworldWalkable(moved));}
});
