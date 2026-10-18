import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import sharp from 'sharp';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
const load=async path=>{const r=await build({entryPoints:[path],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));};
const model=await load('app/game/systems/homeworldRegionConnectionsV72.ts'),furniture=await load('app/game/systems/homeworldFurnitureV72.ts');
const city=await load('app/game/systems/homeworldCity.ts');
const arrivals=await load('app/game/systems/homeworldArrivalV67.ts'),codex=await load('app/game/systems/homeworldConnectionCodexV72.ts');
const geo=await load('app/game/systems/homeworldGeometryV64.ts');
const world=homeworldQaModelV64(process.cwd(),['homeworldWorldV77.ts','homeworldNavigationV77.ts','homeworldCivicWorldV80.ts','homeworldContextCodexV71.ts']);
const assertWalkingRoute=route=>{
  assert.equal(route.status,'reachable');
  for(let n=1;n<route.points.length;n++)assert(world.homeworldRouteSegmentV77(route.levelId,route.points[n-1],route.points[n]),'complete actor and navigation clearance');
};
const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;

test('ten exterior thresholds replace urban departure pylons but keep all region identities and access actions',()=>{
  assert.equal(model.HOMEWORLD_REGION_CONNECTIONS_V72.length,10);
  assert.equal(new Set(model.HOMEWORLD_REGION_CONNECTIONS_V72.map(r=>r.regionId)).size,10);
  for(const r of model.HOMEWORLD_REGION_CONNECTIONS_V72){
    assert(r.clearWidth>=180&&r.clearWidth<=220);
    assert.deepEqual(city.HOMEWORLD_POINT_POSITIONS['region-'+r.regionId],r.threshold);
    assert.deepEqual(model.homeworldConnectionArrivalV72(r.regionId),r.arrival);
    const arrived=arrivals.homeworldCityArrivalV67(r.regionId);assert(arrived);assert.equal(arrived.x,r.arrival.x);assert.equal(arrived.y,r.arrival.y);
    assert.equal(r.lore,'original-adaptation');assert.equal(r.traversal,'existing-region-action');assert.equal(r.rewards,false);
    assert(model.homeworldConnectionLengthV72(r)>200);
    assert.equal(model.homeworldConnectionNearestV72(r.legacySign,100),null,'old city pylon cannot be a departure');
    assert.equal(model.homeworldConnectionNearestV72(r.arrival)?.regionId,r.regionId);
  }
  assert.equal(city.HOMEWORLD_OUTDOOR_POINT_ART_V64.filter(p=>p.id.startsWith('region-')).length,0);
  assert.equal(model.homeworldConnectionThresholdV72('invented-territory'),null);
});

test('all eight retained corridors guide the complete actor around current native solids on their actual floor',()=>{
  assert.equal(world.HOMEWORLD_CONNECTIONS_V77.length,8);
  for(const r of world.HOMEWORLD_CONNECTIONS_V77){
    assert(world.homeworldCivicWalkableV80(r.levelId,r.nodes[0]),r.regionId+' city anchor');
    assert(world.homeworldCivicWalkableV80(r.levelId,r.arrival),r.regionId+' return');
    assert(world.homeworldCivicWalkableV80(r.levelId,r.threshold),r.regionId+' aperture');
    // V72 nodes describe authored paving, including old alcoves with no
    // outgoing guidance margin. Route from the actual public spawn and use
    // current walking segments/connectors around the unchanged native solids.
    const route=world.homeworldWorldRouteV77({levelId:'0',point:world.HOMEWORLD_SPACEPORT_V77.spawn},{levelId:r.levelId,point:r.arrival});
    assert.equal(route.status,'reachable',r.regionId);
    for(const segment of route.segments)if(segment.points)assertWalkingRoute(segment);
    else assert(world.HOMEWORLD_CONNECTORS_V77.some(c=>c.id===segment.connectorId),'actual public connector');
    const last=route.segments.at(-1);assert.equal(last.levelId,r.levelId);
    assert.deepEqual({x:last.points.at(-1).x,y:last.points.at(-1).y},r.arrival);
    assert(model.HOMEWORLD_CONNECTION_STREETS_V72.some(s=>s.id.startsWith('connection-v72:'+r.regionId+':')));
  }
});

test('native arch supports stay solid and retained world apertures admit the complete actor on their real floor',()=>{
  for(const r of model.HOMEWORLD_REGION_CONNECTIONS_V72){
    const feet=model.homeworldGatewayFootprintsV72(r);assert.equal(feet.length,2);
    for(const foot of feet){const p={x:(foot.left+foot.right)/2,y:(foot.top+foot.bottom)/2};
      assert.equal(model.homeworldConnectionCollisionV72(p)?.id,foot.id);
    }
  }
  for(const r of world.HOMEWORLD_CONNECTIONS_V77){
    for(const foot of model.homeworldGatewayFootprintsV72(r)){
      const p={x:(foot.left+foot.right)/2,y:(foot.top+foot.bottom)/2};
      // An existing shoulder prop may share the same solid support. The
      // gateway's source footprint is checked above; its world support remains solid.
      assert(world.homeworldCivicCollisionV80(r.levelId,p),foot.id+' solid support');
      assert.equal(world.homeworldCivicWalkableV80(r.levelId,p),false);
    }
    for(let y=r.threshold.y-90;y<=r.arrival.y;y+=8)assert(world.homeworldCivicWalkableV80(r.levelId,{x:r.threshold.x,y}),r.regionId+' central passage');
  }
  assert.equal(model.homeworldConnectionFloorV72({x:NaN,y:10}),false);
});

test('forty source furnishings retain their IDs while thirty-two active shoulders clear same-floor native volumes',()=>{
  assert.equal(model.HOMEWORLD_CONNECTION_FURNITURE_V72.length,40);
  assert.equal(new Set(model.HOMEWORLD_CONNECTION_FURNITURE_V72.map(p=>p.id)).size,40);
  // The coast and thermal gates became physical docks in V77; their eight
  // historical furnishings remain in the source catalogue, not the scene.
  const props=world.HOMEWORLD_CONNECTION_FURNITURE_V77.map(item=>({item,box:furniture.homeworldFurnitureFootprintV72(item)}));
  assert.equal(props.length,32);
  for(const {item,box}of props){
    const source=model.HOMEWORLD_CONNECTION_FURNITURE_V72.find(p=>p.id===item.id);assert(source);
    assert.equal(item.artId,source.artId);assert.equal(item.scale,source.scale);
    // Compare real oriented masonry on the item's actual physical floor.
    for(const b of world.HOMEWORLD_BUILDINGS_V77.filter(b=>b.levelId===item.levelId))assert(!geo.homeworldBuildingTouchesV76(b,
      {x:(box.left+box.right)/2,y:(box.top+box.bottom)/2},
      {halfWidth:(box.right-box.left)/2,halfDepth:(box.bottom-box.top)/2}),item.id+' masonry '+b.id);
    for(const p of world.HOMEWORLD_PROPS_V77){if(p.levelId!==item.levelId||p.plane!=='ground')continue;const hw=p.footprint?.halfWidth,hd=p.footprint?.halfDepth;
      if(hw!==undefined&&hd!==undefined)assert(!intersects(box,{left:p.x-hw,right:p.x+hw,top:p.y-hd*(p.artId?2:1),bottom:p.y+(p.artId?0:hd)}),item.id+' existing prop '+p.id);
    }
    // Floor zero's port overlay is the only historical coordinate translation.
    const dx=item.levelId==='0'&&item.regionId==='ash-marches'?world.HOMEWORLD_PORT_TRANSLATION_V77.x:0;
    for(let y=box.top;y<=box.bottom;y+=4)for(let x=box.left;x<=box.right;x+=4)
      assert.equal(model.homeworldConnectionFloorV72({x:x-dx,y}),false,item.id+' traversable road overlap');
    assert.equal(world.homeworldCivicCollisionV80(item.levelId,{x:(box.left+box.right)/2,y:(box.top+box.bottom)/2},{halfWidth:0,halfDepth:0})?.id,item.id);
  }
  for(let n=0;n<props.length;n++)for(let j=n+1;j<props.length;j++)if(props[n].item.levelId===props[j].item.levelId)
    assert(!intersects(props[n].box,props[j].box),props[n].item.id+' furniture overlap '+props[j].item.id);
});

test('the displaced storm-chain crates retain native identity on a fully supported, accessible Council shoulder',()=>{
  const id='connection-furniture-v72:storm-chain:3';
  const source=model.HOMEWORLD_CONNECTION_FURNITURE_V72.find(p=>p.id===id),item=world.HOMEWORLD_CONNECTION_FURNITURE_V77.find(p=>p.id===id);
  assert.deepEqual({x:source.x,y:source.y},{x:3870,y:720},'historical authored source retained');
  assert.deepEqual({x:item.x,y:item.y},{x:4100,y:960});assert.equal(item.levelId,'+1');
  assert.equal(item.artId,source.artId);assert.equal(item.scale,source.scale);
  const box=furniture.homeworldFurnitureFootprintV72(item),centre={x:(box.left+box.right)/2,y:(box.top+box.bottom)/2};
  const clearance={halfWidth:(box.right-box.left)/2+36,halfDepth:(box.bottom-box.top)/2+26};
  assert(world.homeworldTerrainV77(item.levelId,centre,clearance),'whole prop plus actor and guidance margin supported');
  const ring=[{x:box.left-38,y:box.top-28},{x:box.right+38,y:box.top-28},{x:box.right+38,y:box.bottom+28},{x:box.left-38,y:box.bottom+28}];
  for(let i=0;i<ring.length;i++)assert(world.homeworldRouteSegmentV77(item.levelId,ring[i],ring[(i+1)%ring.length]),'complete actor can pass every side');
  for(const resident of world.HOMEWORLD_RESIDENTS_V77.filter(r=>r.levelId===item.levelId))for(let n=1;n<resident.path.length;n++){
    const a=resident.path[n-1],b=resident.path[n],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/4));
    for(let i=0;i<=steps;i++)assert(!furniture.homeworldFurnitureTouchesV72(item,{x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps},{halfWidth:36,halfDepth:26}),resident.id+' native full-body path');
  }
  const record=world.HOMEWORLD_ALL_ELEMENT_CODEX_V71.find(r=>r.id===id);assert(record);
  assert.deepEqual(record.position,{x:item.x,y:item.y,z:world.homeworldLevelV77(item.levelId).elevation});
  assert.equal(record.asset,furniture.HOMEWORLD_FURNITURE_ART_V72[item.artId].src);
  assert.deepEqual(record.footprint,{...box,polygon:undefined});
});

test('all ten historical regional identities have real departure routes using current floors and public connectors',()=>{
  const from={levelId:'0',point:world.HOMEWORLD_SPACEPORT_V77.spawn};
  const points=world.HOMEWORLD_POINTS_V77.filter(p=>p.regionId);
  assert.deepEqual(points.map(p=>p.regionId).sort(),model.HOMEWORLD_REGION_CONNECTIONS_V72.map(r=>r.regionId).sort());
  for(const point of points){
    const arrival=world.homeworldWorldArrivalV77(point.regionId);assert(arrival,point.regionId+' return socket');
    const route=world.homeworldWorldRouteV77(from,{levelId:arrival.levelId,point:arrival.actor});
    assert.equal(route.status,'reachable',point.regionId);
    for(const segment of route.segments)if(segment.points)assertWalkingRoute(segment);
    else assert(world.HOMEWORLD_CONNECTORS_V77.some(c=>c.id===segment.connectorId),'real connector');
    const last=route.segments.at(-1);assert.equal(last.levelId,arrival.levelId);
    assert.deepEqual({x:last.points.at(-1).x,y:last.points.at(-1).y},{x:arrival.actor.x,y:arrival.actor.y});
  }
});

test('all forty-three existing building entrances and eight retained thresholds remain reachable from the east-port spawn',()=>{
  assert.equal(world.HOMEWORLD_BUILDINGS_V77.length,43);
  const from={levelId:'0',point:world.HOMEWORLD_SPACEPORT_V77.spawn};
  for(const building of world.HOMEWORLD_BUILDINGS_V77){const goal=city.homeworldBuildingDoorwayV64(building).approach;
    assert.equal(world.homeworldWorldRouteV77(from,{levelId:building.levelId,point:goal}).status,'reachable','existing public doorway '+building.id);
  }
  for(const connection of world.HOMEWORLD_CONNECTIONS_V77)
    assert.equal(world.homeworldWorldRouteV77(from,{levelId:connection.levelId,point:connection.arrival}).status,'reachable','regional threshold '+connection.regionId);
});

test('native PNGs and every cell stay transparent, unmodified and padded with genuine open apertures',async()=>{
  const sources=[...Object.values(model.HOMEWORLD_GATEWAY_ART_V72),...Object.values(furniture.HOMEWORLD_FURNITURE_ART_V72)];
  const images=new Map;
  for(const art of sources){
    if(!images.has(art.src)){const bytes=fs.readFileSync('public'+art.src);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),art.sha256);
      const info=await sharp(bytes).metadata();assert(info.hasAlpha);assert.equal(info.width,art.sourceWidth);assert.equal(info.height,art.sourceHeight);
      images.set(art.src,await sharp(bytes).raw().toBuffer({resolveWithObject:true}));}
    const rect=art.sourceRect;assert(rect.x+rect.width<=art.sourceWidth);assert(rect.y+rect.height<=art.sourceHeight);
    const {data,info}=images.get(art.src),alpha=(x,y)=>data[((rect.y+y)*info.width+rect.x+x)*info.channels+3];
    for(let x=0;x<rect.width;x++){assert(alpha(x,0)<=12,'top crop cuts object');assert(alpha(x,rect.height-1)<=12,'bottom crop cuts object');}
    for(let y=0;y<rect.height;y++){assert(alpha(0,y)<=12,'left crop cuts object');assert(alpha(rect.width-1,y)<=12,'right crop cuts object');}
    if(art.opening)for(let y=art.opening.top;y<art.opening.bottom;y+=4)for(let x=art.opening.left;x<art.opening.right;x+=4)
      assert(alpha(x,y)<=12,'transparent native aperture cannot contain painted pillar pixels');
  }
  assert.equal(images.size,2);assert.equal(sources.length,16);
});

test('codex records derive from actual measured native supports, paths and furnishings with unique IDs',()=>{
  const records=codex.HOMEWORLD_CONNECTION_CODEX_V72;assert.equal(records.length,100);
  const ids=new Set(records.map(r=>r.id));assert.equal(ids.size,100);
  for(const r of records){assert.equal(r.lore,'original-adaptation');assert(r.asset&&fs.existsSync('public'+r.asset));
    for(const key of ['x','y','z'])assert(Number.isFinite(r.position[key]));
    for(const key of ['width','depth','height'])assert(Number.isFinite(r.dimensions[key])&&r.dimensions[key]>=0);
    for(const id of r.associatedElementIds)assert(ids.has(id)||id.startsWith('point:region-')||city.HOMEWORLD_STREETS.some(s=>'street:'+s.id===id),r.id+' broken link '+id);
  }
  for(const r of model.HOMEWORLD_REGION_CONNECTIONS_V72){const door=records.find(p=>p.id==='connection-door-v72:'+r.regionId);
    assert.deepEqual(door.door.threshold,r.threshold);assert.deepEqual(door.door.approach,r.arrival);assert.equal(door.door.clearWidth,r.clearWidth);
  }
});

test('actual JSX mounts only nearby native props and projects the floor once without painting a giant backdrop',async()=>{
  const result=await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import View from './app/game/HomeworldRegionConnectionsV72.tsx';export const html=renderToStaticMarkup(React.createElement(View,{actor:{x:500,y:1100},cameraX:0,cameraY:70,width:1200,height:850,save:{prologue:null,homeworld:{expeditions:{},evidenceIds:[]}}}));`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'cjs',platform:'node',logLevel:'silent',external:['react','react-dom/server'],plugins:[{name:'native-cells-css-only',setup(build){build.onLoad({filter:/\.module\.css$/},()=>({contents:'export default {};',loader:'js'}));}}]});
  const output={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),output,output.exports);
  const html=output.exports.html;assert(html.includes('data-homeworld-connection-floor="v72"'));assert(html.includes(`scaleY(${geo.HOMEWORLD_GEOMETRY_V64.depthScale})`));
  const count=(html.match(/data-homeworld-region-connection-v72=/g)??[]).length;assert(count>0&&count<10,'camera culls distant entrances');
  assert(html.includes('/game/homeworld/v72/region-gateway-kit.png'));assert(html.includes('data-native-source-rect='));
  assert(!html.includes('width="7200"'),'SVG is only the camera window');assert(!html.includes('backgrounds/'),'no full-scene bitmap substitute');
  assert(!html.includes('rotate('),'native arches do not rotate into unsupported perspective');
});
