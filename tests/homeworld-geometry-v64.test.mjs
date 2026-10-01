import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
const load=async path=>{const r=await build({entryPoints:[path],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));};
const city=await load('app/game/systems/homeworldCity.ts'), codex=await load('app/game/systems/homeworldElementCodexV64.ts');
const geo=await load('app/game/systems/homeworldGeometryV64.ts'), rooms=await load('app/game/systems/homeworldInteriorsV64.ts');
const hw=await load('app/game/systems/homeworld.ts'), art=await load('app/game/systems/homeworldArtV64.ts');
const newDecorIds=city.HOMEWORLD_PROPS.filter(p=>p.id.startsWith('life-v68-')).map(p=>p.id);
const v69DecorIds=city.HOMEWORLD_PROPS.filter(p=>p.id.startsWith('life-v69-')).map(p=>p.id);
const close=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('one35-degree camera preserves vertical adult/door scale, including inverse ground coordinates',()=>{
  assert.equal(geo.HOMEWORLD_GEOMETRY_V64.adultHeight,100);
  for(const p of [{x:0,y:0},{x:1280,y:4480},{x:6000,y:3200}])for(const z of [0,100,268]){
    const q=geo.homeworldProjectGroundV64(p,z),r=geo.homeworldUnprojectGroundV64(q,z);
    close(r.x,p.x);close(r.y,p.y);close(geo.homeworldProjectGroundV64(p).y-q.y,z);
  }
});
test('43 solid envelopes never overlap, every door accepts only its accessible south passage',()=>{
  assert.equal(city.HOMEWORLD_BUILDINGS.length,43);
  const footprints=city.HOMEWORLD_BUILDINGS.map(b=>geo.homeworldBuildingFootprintV64(b));
  for(let i=0;i<footprints.length;i++)for(let j=i+1;j<footprints.length;j++){
    const a=footprints[i],b=footprints[j];assert(!(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top),`${i}/${j}`);
  }
  for(const building of city.HOMEWORLD_BUILDINGS){
    const door=geo.homeworldBuildingDoorwayV64(building);
    assert.equal(city.nearestHomeworldDoor(door.approach)?.id,building.id);
    for(const p of [{x:building.x,y:building.y-20},{x:building.x+building.width/2,y:building.y+25},{x:building.x,y:door.approach.y+60}])
      assert.notEqual(city.nearestHomeworldDoor(p)?.id,building.id,`cannot enter ${building.id} through back/side/from afar`);
    assert.equal(city.isHomeworldWalkable({x:building.x,y:building.y-70}),false,'front wall remains solid');
  }
});
test('painted forward prop pivots and station volumes share the exact native width and depth',()=>{
  assert.equal(newDecorIds.length,15,'V68 adds fifteen independent native furniture modules');
  assert.equal(new Set(newDecorIds).size,15,'new furnishings remain distinct physical objects');
  assert.equal(city.HOMEWORLD_PROPS.filter(p=>!newDecorIds.includes(p.id)&&!v69DecorIds.includes(p.id)).length,26,'all twenty-six original V64 props are retained');
  assert.equal(v69DecorIds.length,3,'V69 adds three supported native braziers');
  assert.equal(city.HOMEWORLD_PROPS.length,44);
  assert.equal(city.HOMEWORLD_OUTDOOR_POINT_ART_V64.length,11);
  for(const prop of city.HOMEWORLD_PROPS){
    const source=art.HOMEWORLD_PROP_ART_V64[prop.artId],p=city.homeworldPropArtPlacement(prop);
    const sx=p.width/source.sourceRect.width,sy=p.height/source.sourceRect.height;
    close(sx,sy);close(p.left+source.pivot.x*sx,prop.x);close(p.top+source.pivot.y*sy,geo.homeworldProjectGroundV64(prop).y);
    const center={x:prop.x,y:prop.y-prop.footprint.halfDepth};
    assert.equal(city.homeworldCollisionAt(center,{halfWidth:0,halfDepth:0})?.id,prop.id);
    assert(city.isHomeworldTerrainWalkable(center,prop.footprint),prop.id);
  }
  for(const point of city.HOMEWORLD_OUTDOOR_POINT_ART_V64){
    const source=art.HOMEWORLD_PROP_ART_V64[point.artId],solid=city.HOMEWORLD_POINT_PROP_COLLIDERS.find(p=>p.id===point.id);
    close(solid.radiusX*2,source.footprintWorld.width);close(solid.radiusY*2,source.footprintWorld.depth);
    close(solid.y+solid.radiusY,point.y);
  }
});
test('all19 civic IDs,26 interaction IDs and14 district IDs remain stable; indoor points cannot be used from the street',()=>{
  assert.deepEqual(city.HOMEWORLD_BUILDINGS.slice(0,19).map(b=>b.id),city.HOMEWORLD_BUILDINGS_V54.map(b=>b.id));
  assert.deepEqual(city.HOMEWORLD_DISTRICTS.map(d=>d.id),city.HOMEWORLD_DISTRICTS_V54.map(d=>d.id));
  assert.deepEqual(Object.keys(city.HOMEWORLD_POINT_POSITIONS),Object.keys(city.HOMEWORLD_POINT_POSITIONS_V54));
  assert.equal(rooms.HOMEWORLD_INTERIORS_V64.length,43);assert.equal(rooms.HOMEWORLD_INTERIOR_POINT_IDS_V64.size,15);
  for(const point of hw.HOMEWORLD_POINTS.filter(p=>rooms.HOMEWORLD_INTERIOR_POINT_IDS_V64.has(p.id)))assert.notEqual(hw.nearestHomeworldPoint(point)?.id,point.id);
  const old=hw.defaultHomeworldProgress();old.visitedDistrictIds=['port','clans'];old.greetedNpcIds=['dock-officer'];
  assert.deepEqual(hw.normalizeHomeworldProgress(JSON.parse(JSON.stringify(old))),old);
  assert(!('position' in old),'no obsolete coordinate persists in campaign progress');
});
test('the element codex enumerates actual spaces, source assets and measurements without granting actions',()=>{
  const records=codex.HOMEWORLD_ELEMENT_CODEX_V64;
  assert.equal(new Set(records.map(r=>r.id)).size,records.length);
  assert.equal(records.filter(r=>r.category==='building').length,43);
  assert.equal(records.filter(r=>r.category==='door').length,86);
  assert.equal(records.filter(r=>r.category==='interior').length,43);
  assert.equal(records.filter(r=>r.category==='service').length,26);
  assert.equal(records.filter(r=>r.category==='npc').length,12);
  assert.equal(records.filter(r=>r.category==='floor').length,43);
  assert.equal(records.filter(r=>r.category==='panel').length,286);
  assert.equal(records.filter(r=>r.category==='prop'&&newDecorIds.some(id=>r.id===`prop:${id}`)).length,15,'the codex includes every additional native physical prop once');
  assert.equal(records.length,741);
  assert.equal(records.filter(r=>r.category==='prop').length,city.HOMEWORLD_PROPS.length+11+3+8+rooms.HOMEWORLD_INTERIORS_V64.reduce((n,r)=>n+r.props.length,0));
  for(const r of records){
    assert(Object.values(r.position).every(Number.isFinite),r.id);assert(Object.values(r.dimensions).every(v=>Number.isFinite(v)&&v>=0),r.id);
    assert(r.constraints.length>0,r.id);assert.equal(r.lore,'original-adaptation');
    if(r.category==='prop') {
      if(r.id.startsWith('trophy-slot:')){assert.equal(r.asset,null);assert.equal(r.footprint,null);assert.match(r.constraints.join(' '),/déterminée uniquement par une prise déjà possédée/);}
      else if(r.id==='interior-station:suspect-trophy-point')assert.equal(r.asset,'/game/assets/v15/trophies/trophy-ruins-ancient-guardian.webp');
      else if(v69DecorIds.some(id=>r.id===`prop:${id}`)) assert.equal(r.asset,'/game/homeworld/v69/clan-brazier.png',r.id);
      else assert.match(r.asset,/\/game\/homeworld\/v64\//,r.id);
    }
  }
  for(const room of rooms.HOMEWORLD_INTERIORS_V64){
    const b=city.HOMEWORLD_BUILDINGS.find(b=>b.id===room.buildingId);assert(room.width<b.footprint.width&&room.depth<b.footprint.depth);
    for(const prop of room.props){const r=codex.homeworldElementByIdV64(`prop:${prop.id}`);close(r.footprint.top,prop.y-2*prop.halfDepth);close(r.footprint.bottom,prop.y);}
  }
});
test('the same movement integrator recovers inside the current room, never at the port; pause is inert',()=>{
  const room=rooms.HOMEWORLD_INTERIORS_V64[0];const fallback=()=>({...city.createHomeworldActor(),...room.spawn});
  const floor=p=>rooms.isHomeworldInteriorWalkableV64(room,p);
  const bad={...fallback(),x:NaN,y:Infinity};const input={moveX:0,climb:0,jumpPressed:false};
  const recovered=city.stepHomeworldActorOnFloor(bad,input,1/60,floor,fallback);
  assert.deepEqual({x:recovered.x,y:recovered.y},room.spawn);assert(floor(recovered));
  assert.equal(city.stepHomeworldActorOnFloor(recovered,{...input,moveX:1},0,floor,fallback),recovered);
});
