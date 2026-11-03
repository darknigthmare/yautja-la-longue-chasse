import assert from 'node:assert/strict';import test from 'node:test';import fs from 'node:fs';import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
const a=homeworldQaModelV64(process.cwd(),['homeworldCity.ts','homeworldSpatialCodex.ts','homeworldGeometryV64.ts','homeworldContextCodexV71.ts','homeworldInteriorsV64.ts','homeworldArchitectureV75.ts','homeworldExteriorDecorV76.ts','homeworldBuildingPlacementsV76.ts','homeworldFurnitureV72.ts','homeworldWorldV77.ts','homeworldNavigationV77.ts','homeworldCivicWorldV80.ts','homeworldArchitectureArtV76.ts','homeworldNativeArchitectureV81.ts']);
// Translating a computed native polygon or recomputing it at its translated
// origin differs by one IEEE754 ulp. Compare only that proven operation budget.
const samePoints=(actual,expected)=>{assert.equal(actual.length,expected.length);for(let i=0;i<actual.length;i++)for(const axis of['x','y'])assert(Math.abs(actual[i][axis]-expected[i][axis])<=Number.EPSILON*Math.max(1,Math.abs(actual[i][axis]),Math.abs(expected[i][axis]))*4,`${i}.${axis} physical native coordinate`);};
test('all 43 final physical doors are joined to the east-port spawn by full-body routes and public connectors',()=>{
 assert.equal(a.HOMEWORLD_BUILDINGS_V77.length,43);
 const from={levelId:'0',point:a.HOMEWORLD_SPACEPORT_V77.spawn};
 for(const building of a.HOMEWORLD_BUILDINGS_V77){const door=a.homeworldBuildingDoorwayV64(building),route=a.homeworldWorldRouteV77(from,{levelId:building.levelId,point:door.approach});
  assert.equal(route.status,'reachable',building.id);
  const final=route.segments.at(-1);assert.equal(final.levelId,building.levelId);assert.deepEqual(final.points.at(-1),door.approach);
  assert.equal(a.nearestHomeworldDoorV77(building.levelId,final.points.at(-1))?.id,building.id);
  for(const segment of route.segments)if(segment.points){
   for(let i=1;i<segment.points.length;i++)assert(a.homeworldRouteSegmentV77(segment.levelId,segment.points[i-1],segment.points[i]),building.id+' complete segment');
  }else assert(a.HOMEWORLD_CONNECTORS_V77.some(c=>c.id===segment.connectorId),building.id+' actual connector');
 }
});
test('source decor and six historical facades retain provenance while current native volumes expose actual scene bounds and links',()=>{
 const records=a.HOMEWORLD_ALL_ELEMENT_CODEX_V71,ids=new Set(records.map(r=>r.id));assert.equal(ids.size,records.length);
 const interiors=a.HOMEWORLD_INTERIORS_V64.flatMap(r=>r.orientedDecorV76??[]),exteriors=a.HOMEWORLD_EXTERIOR_V77;
 const sourceInteriors=Object.values(JSON.parse(fs.readFileSync('app/game/data/homeworldInteriorDecorPlacementsV76.json','utf8'))).flat();
 assert.equal(sourceInteriors.length,92);assert.equal(new Set(sourceInteriors.map(p=>p.id)).size,92);
 assert.equal(interiors.length,102);assert.equal(exteriors.length,74);
 const historical=Object.entries(a.HOMEWORLD_ARCHITECTURE_IDENTITIES_V76);assert.equal(historical.length,6);
 assert.deepEqual(records.filter(r=>r.id.startsWith('v76-facade:')).map(r=>r.id).sort(),historical.map(([id])=>'v76-facade:'+id).sort());
 for(const [id,identity]of historical){const record=records.find(r=>r.id==='v76-facade:'+id);assert.equal(record.asset,identity.art.src);assert(record.source.some(s=>s.url===identity.art.src&&s.note.includes(identity.art.sha256)));
  if(a.homeworldBuildingIdentityV81(id)){assert.equal(record.spaceId,'archive:architecture-v76:'+id);assert.equal(record.footprint,null);assert.equal(record.door,null);assert(record.associatedElementIds.includes('v81-facade:'+id));}
 }
 for(const item of [...interiors,...exteriors]){const record=records.find(r=>r.id===item.id);assert(record,item.id);assert(record.constraints.length>=4);assert(record.asset);assert.equal(record.lore,'original-adaptation');
  assert.equal(record.position.x,item.x);assert.equal(record.position.y,item.y);assert.equal(!!record.footprint,item.solid);for(const id of record.associatedElementIds)assert(ids.has(id),item.id+' missing '+id);
  if(item.levelId)assert.equal(record.position.z,a.homeworldLevelV77(item.levelId).elevation+(item.elevation??0),item.id+' actual World floor plus measured wall height');
 }
 const activeAngled=a.HOMEWORLD_BUILDINGS_V77.filter(b=>b.art.groundFrame);assert.equal(activeAngled.length,13);
 for(const building of activeAngled){const version=a.homeworldBuildingIdentityV81(building.id)?'v81':'v76',record=records.find(r=>r.id===version+'-facade:'+building.id);assert(record,building.id);assert.equal(record.spaceId,'world');assert.equal(record.asset,building.art.src);
  samePoints(record.footprint.polygon,a.homeworldBuildingFootprintV64(building).polygon);samePoints(Object.values(record.door.groundOpening),Object.values(a.homeworldBuildingDoorwayV64(building).groundOpening));
  const approach=a.HOMEWORLD_BUILDING_APPROACHES_V71.find(p=>p.buildingId===building.id),old=a.HOMEWORLD_BUILDINGS.find(b=>b.id===building.id);
  assert.equal(approach.polygon.length,4);samePoints(approach.polygon.slice(0,2).map(p=>({x:p.x+building.x-old.x,y:p.y+building.y-old.y})),Object.values(record.door.groundOpening));
  assert.equal(record.position.z,a.homeworldLevelV77(building.levelId).elevation);
 }
});
test('five historical placement IDs and subsequent native revisions preserve all stable building and room identities',()=>{
 const placements=a.HOMEWORLD_BUILDING_PLACEMENT_OFFSETS_V76;
 for(const id of['convoy-store','convoy-workshop','dock-control','rite-sanctum','trophy-mausoleum'])assert(placements[id],id+' historical placement retained');
 for(const [id,offset]of Object.entries(placements)){assert(a.HOMEWORLD_BUILDINGS.some(b=>b.id===id),id+' real building');assert(Number.isFinite(offset.x)&&Number.isFinite(offset.y));assert(offset.reason.length>0);}
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

test('all thirteen native forecourts support current furnishings and retained civic beacons on their actual floor',()=>{
 assert.equal(a.HOMEWORLD_FORECOURTS_V76.length,13);
 assert.deepEqual(a.HOMEWORLD_FORECOURTS_V76.map(c=>c.id).sort(),a.HOMEWORLD_BUILDINGS_V77.filter(b=>b.art.groundFrame).map(b=>'forecourt-v76:'+b.id).sort());
 for(const court of a.HOMEWORLD_FORECOURTS_V76){
  assert(a.HOMEWORLD_STREETS.includes(court));
  const record=a.HOMEWORLD_ALL_ELEMENT_CODEX_V71.find(r=>r.id==='street:'+court.id);
  const actual=a.HOMEWORLD_GROUND_V77.find(g=>g.id===court.id);assert(actual);assert.deepEqual(record.footprint.polygon,actual.polygon);assert(record.asset);assert.equal(record.position.z,a.homeworldLevelV77(actual.levelId).elevation);
 }
 for(const item of a.HOMEWORLD_FRONTAGE_V77.filter(p=>a.HOMEWORLD_BUILDINGS_V77.find(b=>b.id===p.buildingId)?.art.groundFrame)){
  const box=a.homeworldFurnitureFootprintV72(item);
  assert(a.homeworldTerrainV77(item.levelId,{x:(box.left+box.right)/2,y:(box.top+box.bottom)/2},
   {halfWidth:(box.right-box.left)/2,halfDepth:(box.bottom-box.top)/2}),item.id+' complete paved support');
 }
 const existingProps=[...Object.keys(a.HOMEWORLD_ARCHITECTURE_IDENTITIES_V76).map(id=>'beacon-v64-'+id),'bench-v64-trophy-mausoleum'];
 for(const id of existingProps){
  const prop=a.HOMEWORLD_PROPS_V77.find(p=>p.id===id);assert(prop,id+' historical civic prop retained');
  assert(a.homeworldTerrainV77(prop.levelId,{x:prop.x,y:prop.y-prop.footprint.halfDepth},prop.footprint),prop.id+' complete paved support');
  const centre={x:prop.x,y:prop.y-prop.footprint.halfDepth};
  for(const building of a.HOMEWORLD_BUILDINGS_V77.filter(b=>b.levelId===prop.levelId))assert(!a.homeworldBuildingTouchesV76(building,centre,prop.footprint),prop.id+' masonry '+building.id);
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
