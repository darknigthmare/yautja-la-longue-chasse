import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
const api=homeworldQaModelV64(process.cwd(),['homeworldCity.ts','homeworldGeometryV64.ts','homeworldLifeV69.ts',
  'homeworldExteriorDecorV76.ts','homeworldRegionConnectionsV72.ts','homeworldSpatialCodex.ts','homeworldFurnitureV72.ts',
  'homeworldWorldV77.ts','homeworldCivicWorldV80.ts','homeworldNavigationV77.ts',
  'homeworldStreetDecorMountV84.ts','homeworldStreetCompositionMountV92.ts',
  'homeworldUrbanLayoutV78.ts','homeworldCivicDecorV80.ts','homeworldStreetModulesV78.ts']);
const scenery=api.HOMEWORLD_EXTERIOR_V77,solid=scenery.filter(item=>item.solid);
const rectanglePolygon=box=>[{x:box.left,y:box.top},{x:box.right,y:box.top},{x:box.right,y:box.bottom},{x:box.left,y:box.bottom}];
const expandPolygon=(polygon,margin)=>api.homeworldCivicContactHullV80(polygon.flatMap(point=>[-1,1].flatMap(x=>[-1,1]
  .map(y=>({x:point.x+x*margin,y:point.y+y*margin})))));

test('70 solid fixtures occupy fourteen functional neighbourhoods rather than one flattened city image',()=>{
  assert.deepEqual(scenery.map(item=>item.id),api.HOMEWORLD_EXTERIOR_MODULES_V76.map(item=>item.id));
  assert.equal(solid.length,70);assert.equal(new Set(scenery.map(item=>item.id)).size,scenery.length);
  assert.equal(new Set(solid.map(item=>item.districtId)).size,14);
  for(const district of api.HOMEWORLD_DISTRICTS)assert(solid.some(s=>s.districtId===district.id),district.id);
  assert.equal(scenery.length,74);assert.equal(scenery.filter(s=>!s.solid).length,4);
  const newTypes=['mineral-planter-left','terrace-bench-right','merchant-canopy-diagonal','logistics-container-rack'];
  for(const artId of newTypes)assert(solid.some(s=>s.artId===artId),artId+' actually placed');
  for(const item of solid){
    assert(item.scale>=.7&&item.scale<=1.1);assert(api.HOMEWORLD_EXTERIOR_ART_V76[item.artId]);
    assert.equal(item.solid,true);assert(api.homeworldExteriorPolygonV76(item).length>=4);
    const b=api.homeworldExteriorFootprintV76(item);
    for(const p of b.polygon)assert(api.homeworldUrbanTerrainV78(item.levelId,p,{halfWidth:10,halfDepth:8}),item.id+' supported by real public floor');
    assert(api.HOMEWORLD_BUILDINGS.some(b=>b.id===item.associatedBuildingId),'real related building');
  }
});

test('98 existing civil routines retain continuous body clearance along every current outward/return segment',()=>{
  assert.equal(api.HOMEWORLD_RESIDENTS_V77.length,98);
  assert.deepEqual(api.HOMEWORLD_RESIDENTS_V77.map(r=>r.id),api.HOMEWORLD_RESIDENTS_V69.map(r=>r.id));
  for(const resident of api.HOMEWORLD_RESIDENTS_V77)for(let segment=0;segment<resident.path.length;segment++){
    const first=resident.path[segment],last=resident.path[segment+1]??first;
    const steps=Math.max(1,Math.ceil(Math.hypot(last.x-first.x,last.y-first.y)/.5));
    for(let n=0;n<=steps;n++){
      const point={x:first.x+(last.x-first.x)*n/steps,y:first.y+(last.y-first.y)*n/steps};
      for(const item of solid.filter(item=>item.levelId===resident.levelId))
        assert(!api.homeworldExteriorTouchesV76(item,point,{halfWidth:32,halfDepth:22}),resident.id+' would be blocked by '+item.id);
      assert(api.homeworldCivicWalkableV80(resident.levelId,point),resident.id+' current continuous body collision '+JSON.stringify(api.homeworldCivicCollisionV80(resident.levelId,point)));
    }
  }
});

const publicSpawn={levelId:'0',point:api.HOMEWORLD_SPACEPORT_V77.spawn};
function assertActiveRoute(route,label){
  assert.equal(route.status,'reachable',label);
  for(const segment of route.segments)if(segment.points)for(let index=1;index<segment.points.length;index++){
    const from=segment.points[index-1],to=segment.points[index];
    assert(api.homeworldRouteSegmentV77(segment.levelId,from,to),label+' full-body navigation segment');
    const steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/4));
    for(let step=0;step<=steps;step++){
      const point={x:from.x+(to.x-from.x)*step/steps,y:from.y+(to.y-from.y)*step/steps};
      for(const item of solid.filter(item=>item.levelId===segment.levelId))
        assert(!api.homeworldExteriorTouchesV76(item,point,{halfWidth:36,halfDepth:26}),label+' true exterior clearance '+item.id);
    }
  }
}

test('historical ground waymarks and all ten current regional approaches retain physically clear guidance',()=>{
  for(const point of api.HOMEWORLD_WAYMARKS){
    assert(api.isHomeworldWalkable(point,{halfWidth:36,halfDepth:26}),point.id+' preserved public waymark body+12');
    assert.equal(api.homeworldSpatialRoute(api.createHomeworldActor(),point).status,'reachable',point.id+' preserved reachable waymark');
  }
  assert.equal(api.HOMEWORLD_CONNECTIONS_V77.length+api.HOMEWORLD_REGIONAL_DOCKS_V77.length,10);
  // Original V72 road nodes are authored paving. Current guidance follows the
  // actual floor and retained native buildings, including V81 route changes.
  for(const region of api.HOMEWORLD_CONNECTIONS_V77){
    const route=api.homeworldWorldRouteV77(publicSpawn,{levelId:region.levelId,point:region.arrival});
    assertActiveRoute(route,region.regionId+' current regional corridor');
    const walking=route.segments.filter(segment=>segment.points);
    assert.deepEqual(walking[0].points[0],publicSpawn.point);assert.deepEqual(walking.at(-1).points.at(-1),region.arrival);
  }
  for(const dock of api.HOMEWORLD_REGIONAL_DOCKS_V77)
    assertActiveRoute(api.homeworldWorldRouteV77(publicSpawn,{levelId:dock.levelId,point:dock.point}),dock.regionId+' current dock approach');
});

test('native facades, all43 thresholds, the shuttle pad and pedestrian lane remain reserved on their physical floor',()=>{
  const angled=new Set(['convoy-workshop','dock-control','rite-sanctum','trophy-mausoleum','rampart-watch','convoy-store']);
  const port=api.HOMEWORLD_SPACEPORT_V77,pad={left:port.pad.x-port.pad.width/2,right:port.pad.x+port.pad.width/2,top:port.pad.y-port.pad.depth,bottom:port.pad.y};
  const lane=api.HOMEWORLD_SPACEPORT_V64.pedestrian,offset=api.HOMEWORLD_PORT_TRANSLATION_V77.x;
  const activeLane={left:lane.left+offset,right:lane.right+offset,top:lane.top,bottom:lane.bottom};
  assert.equal(api.HOMEWORLD_BUILDINGS_V77.length,43);
  for(const item of solid){const polygon=api.homeworldExteriorPolygonV76(item);
    if(item.levelId==='0'){
      assert(!api.homeworldUrbanOverlapV78(expandPolygon(polygon,40),rectanglePolygon(pad)),item.id+' pad reservation');
      assert(!api.homeworldUrbanOverlapV78(expandPolygon(polygon,30),rectanglePolygon(activeLane)),item.id+' pedestrian reservation');
    }
    for(const building of api.HOMEWORLD_BUILDINGS_V77.filter(building=>building.levelId===item.levelId)){
      assert(!api.homeworldUrbanOverlapV78(expandPolygon(polygon,26),api.homeworldBuildingGroundFrameV76(building).polygon),item.id+' obstructs '+building.id);
      const door=api.homeworldBuildingDoorwayV64(building),dx=door.approach.x-door.threshold.x,dy=door.approach.y-door.threshold.y,length=Math.hypot(dx,dy);
      const far={x:door.approach.x+dx/length*120,y:door.approach.y+dy/length*120},steps=Math.max(1,Math.ceil(Math.hypot(far.x-door.threshold.x,far.y-door.threshold.y)/4));
      for(let step=0;step<=steps;step++)assert(!api.homeworldExteriorTouchesV76(item,
        {x:door.threshold.x+(far.x-door.threshold.x)*step/steps,y:door.threshold.y+(far.y-door.threshold.y)*step/steps},
        {halfWidth:45,halfDepth:45}),item.id+' occupies door approach '+building.id);
    }
    for(const fixture of api.HOMEWORLD_FRONTAGE_V77.filter(fixture=>fixture.levelId===item.levelId))
      assert(!api.homeworldUrbanOverlapV78(expandPolygon(polygon,18),rectanglePolygon(api.homeworldFurnitureFootprintV72(fixture))),item.id+' intersects frontage '+fixture.id);
  }
  for(const id of angled)assert(api.HOMEWORLD_BUILDINGS_V77.find(building=>building.id===id)?.art.groundFrame,id+' original oblique facade retained');
  assert.equal(api.HOMEWORLD_BUILDINGS_V77.filter(building=>building.art.groundFrame).length,13,'all current measured native facade frames are active');
  assert.equal(api.HOMEWORLD_ANGLED_FRONTAGE_ITEMS_V76.length,19,'all fittings of the current measured facade frames retain their original identities');
  for(const fixture of api.HOMEWORLD_ANGLED_FRONTAGE_ITEMS_V76)
    assert(api.HOMEWORLD_FRONTAGE_V77.some(current=>current.id===fixture.id),'historical fitting remains in current scene: '+fixture.id);
});

test('all43 door routes and ten regional arrivals stay reachable with the final decoration solids mounted',()=>{
  const targets=[...api.HOMEWORLD_BUILDINGS_V77.map(building=>({id:building.id,levelId:building.levelId,point:api.homeworldBuildingDoorwayV64(building).approach})),
    ...api.HOMEWORLD_REGION_CONNECTIONS_V72.map(region=>{
      const current=api.homeworldWorldArrivalV77(region.regionId);assert(current,region.regionId+' real supported return');
      return{id:region.regionId,levelId:current.levelId,point:{x:current.actor.x,y:current.actor.y}};
    })];
  assert.equal(targets.length,53);
  for(const target of targets)assertActiveRoute(api.homeworldWorldRouteV77(publicSpawn,target),target.id);
  for(const region of api.HOMEWORLD_CONNECTIONS_V77){
    assert(api.homeworldCivicWalkableV80(region.levelId,region.threshold),region.regionId+' true threshold');
    assert(api.homeworldRouteSegmentV77(region.levelId,region.arrival,region.threshold),region.regionId+' final approach');
  }
});

test('measured convex native bases are solid while gutters and elevated wall ornaments are not',()=>{
  for(const item of solid){const polygon=api.homeworldExteriorPolygonV76(item),center={
    x:polygon.reduce((s,p)=>s+p.x,0)/polygon.length,y:polygon.reduce((s,p)=>s+p.y,0)/polygon.length};
    assert(api.homeworldExteriorTouchesV76(item,center,{halfWidth:1,halfDepth:1}));
    const box=api.homeworldExteriorFootprintV76(item);
    assert(!api.homeworldExteriorTouchesV76(item,{x:box.right+80,y:box.bottom+80}));
  }
  for(const item of scenery.filter(s=>!s.solid))assert(!api.homeworldExteriorTouchesV76(item,item));
  const angled=solid.find(item=>item.artId==='mineral-planter-left'),bounds=api.homeworldExteriorFootprintV76(angled);
  assert(!api.homeworldExteriorTouchesV76(angled,{x:bounds.left+5,y:bounds.bottom-5},{halfWidth:2,halfDepth:2}),
    'empty corner of an angled planter bbox must not create an invisible solid fence');
  assert.equal(api.homeworldExteriorFootprintV76(angled),bounds,'immutable instance reuses measured bounds cache');
  for(let i=0;i<solid.length;i++)for(let j=i+1;j<solid.length;j++)
    if(solid[i].levelId===solid[j].levelId)assert(!api.homeworldUrbanOverlapV78(expandPolygon(api.homeworldExteriorPolygonV76(solid[i]),28),api.homeworldExteriorPolygonV76(solid[j])),solid[i].id+' crowds '+solid[j].id);
});

test('four separate original native PNGs retain exact bytes, true alpha contacts and a uniform scale',async()=>{
  const newArt=Object.values(api.HOMEWORLD_EXTERIOR_ART_V76).filter(art=>art.nativeGroundSupport);
  assert.equal(newArt.length,4);assert.equal(new Set(newArt.map(a=>a.src)).size,4);
  for(const art of newArt){const bytes=fs.readFileSync('public'+art.src);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),art.sha256);
    assert.equal(bytes.readUInt32BE(16),art.sourceWidth);assert.equal(bytes.readUInt32BE(20),art.sourceHeight);
    assert.deepEqual(art.sourceRect,{x:0,y:0,width:art.sourceWidth,height:art.sourceHeight});
    assert(art.alphaBounds.x>0&&art.alphaBounds.y>0&&art.alphaBounds.x+art.alphaBounds.width<art.sourceWidth);
    assert(Math.abs(art.heightWorld/art.alphaBounds.height-art.scaleWorldPerPixel)<1e-10);
    for(const p of art.nativeGroundSupport)assert(p.x>0&&p.x<art.sourceWidth&&p.y<=art.pivot.y);
    const{data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    for(const[x,y]of[[0,0],[info.width-1,0],[0,info.height-1],[info.width-1,info.height-1]])
      assert.equal(data[(y*info.width+x)*4+3],0,'true transparent background');
    for(const p of art.nativeGroundSupport)
      assert(data[(Math.round(p.y)*info.width+Math.round(p.x))*4+3]>=128,art.src+' contact must land on a visible support pixel');
  }
});

test('paint culling, one projection and foreground fade preserve independent props and codex truth',()=>{
  for(const item of scenery){const b=api.homeworldExteriorVisibleBoundsV76(item),art=api.HOMEWORLD_EXTERIOR_ART_V76[item.artId],s=art.scaleWorldPerPixel*item.scale;
    assert.equal(b.top,item.y*api.HOMEWORLD_GEOMETRY_V64.depthScale-(item.elevation??0)+(art.alphaBounds.y-art.pivot.y)*s);
    assert(api.homeworldExteriorVisibleV76(item,{x:b.left,y:b.top,width:10,height:10}));
    assert(!api.homeworldExteriorVisibleV76(item,{x:50000,y:50000,width:400,height:800}));
    const record=api.HOMEWORLD_EXTERIOR_CODEX_V76.find(r=>r.id===item.id);assert(record);
    assert.equal(record.asset,art.src);assert.equal(record.lore,'original-adaptation');
    assert.equal(Boolean(record.footprint),item.solid);assert(record.constraints.some(text=>text.includes('aucun butin')));
  }
  assert.equal(api.HOMEWORLD_EXTERIOR_CODEX_V76.length,scenery.length);
  const source=fs.readFileSync('app/game/HomeworldExteriorDecorV76.tsx','utf8');
  assert(!/rotate\(|scaleX\(-1|Math\.random/.test(source));assert(source.includes('homeworldProjectGroundV64'));
});
