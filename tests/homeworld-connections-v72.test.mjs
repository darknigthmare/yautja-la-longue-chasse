import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import sharp from 'sharp';
const load=async path=>{const r=await build({entryPoints:[path],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));};
const model=await load('app/game/systems/homeworldRegionConnectionsV72.ts'),furniture=await load('app/game/systems/homeworldFurnitureV72.ts');
const city=await load('app/game/systems/homeworldCity.ts'),atlas=await load('app/game/systems/homeworldSpatialCodex.ts');
const arrivals=await load('app/game/systems/homeworldArrivalV67.ts'),codex=await load('app/game/systems/homeworldConnectionCodexV72.ts');
const geo=await load('app/game/systems/homeworldGeometryV64.ts');
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

test('every actual corridor can be walked with the complete actor and solid shoulder props leave the centre free',()=>{
  for(const r of model.HOMEWORLD_REGION_CONNECTIONS_V72){
    assert(city.isHomeworldWalkable(r.nodes[0]),r.regionId+' city anchor');
    assert(city.isHomeworldWalkable(r.arrival),r.regionId+' return');assert(city.isHomeworldWalkable(r.threshold),r.regionId+' aperture');
    for(let n=1;n<r.nodes.length;n++){
      const a=r.nodes[n-1],b=r.nodes[n],length=Math.hypot(b.x-a.x,b.y-a.y);
      for(let s=0;s<=length;s+=4){const p={x:a.x+(b.x-a.x)*s/length,y:a.y+(b.y-a.y)*s/length};
        assert(city.isHomeworldWalkable(p),r.regionId+' physical road '+JSON.stringify(p));
        assert.equal(city.homeworldCollisionAt(p),null);
      }
    }
    assert(model.HOMEWORLD_CONNECTION_STREETS_V72.some(s=>s.id.startsWith('connection-v72:'+r.regionId+':')));
  }
});

test('both native arch supports are solid while the complete central aperture remains traversable',()=>{
  for(const r of model.HOMEWORLD_REGION_CONNECTIONS_V72){
    const feet=model.homeworldGatewayFootprintsV72(r);assert.equal(feet.length,2);
    for(const foot of feet){const p={x:(foot.left+foot.right)/2,y:(foot.top+foot.bottom)/2};
      assert.equal(model.homeworldConnectionCollisionV72(p)?.id,foot.id);assert.equal(city.homeworldCollisionAt(p)?.id,foot.id);
      assert.equal(city.isHomeworldWalkable(p),false);
    }
    for(let y=r.threshold.y-90;y<=r.arrival.y;y+=8)assert(city.isHomeworldWalkable({x:r.threshold.x,y}),r.regionId+' central passage');
  }
  assert.equal(model.homeworldConnectionFloorV72({x:NaN,y:10}),false);
});

test('forty independent shoulder furnishings never intersect roads or building ground volumes',()=>{
  assert.equal(model.HOMEWORLD_CONNECTION_FURNITURE_V72.length,40);
  const props=model.HOMEWORLD_CONNECTION_FURNITURE_V72.map(item=>({item,box:furniture.homeworldFurnitureFootprintV72(item)}));
  for(const {item,box}of props){
    // The whole furnishing rectangle must avoid actual masonry. Angled native
    // buildings have empty AABB corners; those are not building ground volume.
    for(const b of city.HOMEWORLD_BUILDINGS)assert(!geo.homeworldBuildingTouchesV76(b,
      {x:(box.left+box.right)/2,y:(box.top+box.bottom)/2},
      {halfWidth:(box.right-box.left)/2,halfDepth:(box.bottom-box.top)/2}),item.id+' masonry '+b.id);
    for(const p of city.HOMEWORLD_PROPS){if(p.plane!=='ground')continue;const hw=p.footprint?.halfWidth,hd=p.footprint?.halfDepth;
      if(hw!==undefined&&hd!==undefined)assert(!intersects(box,{left:p.x-hw,right:p.x+hw,top:p.y-hd*(p.artId?2:1),bottom:p.y+(p.artId?0:hd)}),item.id+' existing prop '+p.id);
    }
    for(let y=box.top;y<=box.bottom;y+=4)for(let x=box.left;x<=box.right;x+=4)
      assert.equal(model.homeworldConnectionFloorV72({x,y}),false,item.id+' traversable road overlap');
    assert.equal(model.homeworldConnectionCollisionV72({x:(box.left+box.right)/2,y:(box.top+box.bottom)/2},{halfWidth:0,halfDepth:0})?.id,item.id);
  }
  for(let n=0;n<props.length;n++)for(let j=n+1;j<props.length;j++)assert(!intersects(props[n].box,props[j].box),props[n].item.id+' furniture overlap '+props[j].item.id);
});

test('real navigation guides all ten former urban landmarks to their physical departure without teleportation',()=>{
  for(const r of model.HOMEWORLD_REGION_CONNECTIONS_V72){
    const start={x:r.legacySign.x,y:r.legacySign.y+70};assert(city.isHomeworldWalkable(start),r.regionId+' former sign approach');
    const route=atlas.homeworldSpatialRoute(start,r.arrival);assert.equal(route.status,'reachable',r.regionId);
    assert.deepEqual(route.points[0],start);assert.deepEqual(route.points.at(-1),r.arrival);assert(route.distance>200);
    for(let n=1;n<route.points.length;n++)assert(atlas.isHomeworldRouteSegmentWalkable(route.points[n-1],route.points[n]),r.regionId+' guided segment');
  }
});

test('all forty-three existing building entrances remain connected while every new threshold is reachable from the public spawn',()=>{
  assert.equal(city.HOMEWORLD_BUILDINGS.length,43);
  const start=city.createHomeworldActor();
  for(const building of city.HOMEWORLD_BUILDINGS){const goal=city.homeworldBuildingDoorwayV64(building).approach;
    assert.equal(atlas.homeworldSpatialRoute(start,goal).status,'reachable','existing public doorway '+building.id);
  }
  for(const connection of model.HOMEWORLD_REGION_CONNECTIONS_V72)
    assert.equal(atlas.homeworldSpatialRoute(start,connection.arrival).status,'reachable','regional threshold '+connection.regionId);
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
