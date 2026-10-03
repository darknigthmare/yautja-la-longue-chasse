import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
const api=homeworldQaModelV64(process.cwd(),['homeworldCity.ts','homeworldGeometryV64.ts','homeworldCameraV72.ts','homeworldSpatialCodex.ts','homeworldOutskirtsV71.ts','homeworldOutskirtsArtV71.ts','homeworldLandscapeV75.ts','homeworldRegionConnectionsV72.ts']);
const modules=api.HOMEWORLD_LANDSCAPE_MODULES_V75;
const overlaps=(a,b,margin=0)=>a.left<b.right+margin&&a.right>b.left-margin&&a.top<b.bottom+margin&&a.bottom>b.top-margin;

test('212 independent V75 natural supports preserve all 162 historical supports and public terrain with real clearance',()=>{
  assert.equal(modules.length,212);assert.equal(api.HOMEWORLD_OUTSKIRTS_MODULES_V71.length,162);
  assert.equal(new Set([...modules,...api.HOMEWORLD_OUTSKIRTS_MODULES_V71].map(m=>m.id)).size,374);
  const reserved=[...api.HOMEWORLD_OUTSKIRTS_MODULES_V71.map(api.homeworldOutskirtsFootprintV71),
    ...api.homeworldConnectionFurnitureFootprintsV72(),...api.HOMEWORLD_REGION_CONNECTIONS_V72.flatMap(api.homeworldGatewayFootprintsV72),
    ...api.HOMEWORLD_CONNECTION_DIRECTION_SIGNS_V72.map(s=>({left:s.x-s.footprintWorld.width/2,right:s.x+s.footprintWorld.width/2,top:s.y-s.footprintWorld.depth,bottom:s.y}))];
  assert.equal(reserved.length,232);const boxes=[];
  for(const scenery of modules){const r=api.homeworldLandscapeFootprintV75(scenery),margin=42;
    for(let x=r.left-margin;x<=r.right+margin;x+=8)for(let y=r.top-margin;y<=r.bottom+margin;y+=8)
      assert.equal(api.isHomeworldTerrainWalkable({x,y},{halfWidth:0,halfDepth:0}),false,scenery.id+' must not occupy the route or door support');
    for(const other of reserved)assert(!overlaps(r,other,30),scenery.id+' must preserve old shoulder furnishings');
    for(const other of boxes)assert(!overlaps(r,other,18),scenery.id+' independent natural support');boxes.push(r);
  }
});

test('every one of the ten real regional outlets has a local ecotone without changing its existing physical approach',()=>{
  assert.equal(api.HOMEWORLD_LANDSCAPE_PATCHES_V75.length,14);
  for(const route of api.HOMEWORLD_REGION_CONNECTIONS_V72){
    const support=modules.filter(m=>m.regionId===route.regionId);assert(support.length>=8);
    const patch=api.HOMEWORLD_LANDSCAPE_PATCHES_V75.find(p=>p.regionId===route.regionId);assert(patch);
    assert.deepEqual({x:patch.x,y:patch.y},route.threshold);
    assert.equal(api.homeworldSpatialRoute(api.createHomeworldActor(),route.arrival).status,'reachable',route.regionId);
    const camera=api.homeworldCameraV72({actor:route.arrival,viewport:{width:1440,height:850},width:7200,depth:5900,interior:false});
    const visible=modules.filter(scenery=>{const r=api.homeworldLandscapePaintV75(scenery);return r.left+r.width>camera.x&&r.left<camera.x+camera.viewWidth&&r.top+r.height>camera.y&&r.top<camera.y+camera.viewHeight;});
    assert(visible.length>=3,route.regionId+' actual camera must reveal natural silhouettes, not only records outside the view');
  }
  for(const building of api.HOMEWORLD_BUILDINGS){const door=api.homeworldBuildingDoorwayV64(building);
    assert.equal(api.homeworldSpatialRoute(api.createHomeworldActor(),door.approach).status,'reachable',building.id+' unchanged door approach');
  }
});

test('camera floor now covers the actual -620px northern view while still mounting only a tile-snapped window',()=>{
  const d=api.HOMEWORLD_GEOMETRY_V64.depthScale,bounds=api.HOMEWORLD_LANDSCAPE_BOUNDS_V75;
  for(const camera of[{x:2280,y:-620,width:1500,height:900},{x:500,y:-620,width:410,height:540},{x:5700,y:1500,width:1500,height:950},{x:3200,y:2550,width:410,height:640}]){
    const floor=api.homeworldLandscapeGroundWindowV75(camera);
    assert(floor.left<=camera.x&&floor.left+floor.width>=camera.x+camera.width);
    assert(floor.top*d<=camera.y&&(floor.top+floor.depth)*d>=camera.y+camera.height);
    assert(floor.width<camera.width+1000);assert(floor.width*floor.depth<bounds.width*bounds.depth/5);
  }
  const old=api.homeworldOutskirtsGroundWindowV71({x:2300,y:-620,width:1400,height:900});assert(old.top*d>-620,'real previous northern gap reproduced');
  assert.deepEqual(api.homeworldLandscapeGroundWindowV75({x:980,y:2310,width:410,height:540}),api.homeworldLandscapeGroundWindowV75({x:982,y:2312,width:410,height:540}));
});

test('native ground atlas bytes and six rectangular windows retain a uniform scale before exactly one ground projection',()=>{
  const source=api.HOMEWORLD_LANDSCAPE_GROUND_V75,bytes=fs.readFileSync('public'+source.src);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),source.sha256);assert.equal(bytes.readUInt32BE(16),1254);assert.equal(bytes.readUInt32BE(20),1254);
  const materials=Object.values(api.HOMEWORLD_LANDSCAPE_MATERIALS_V75);assert.equal(materials.length,6);
  for(const material of materials){const r=material.sourceRect;
    assert.equal(r.width,418);assert.equal(r.height,627);assert(r.x+r.width<=1254&&r.y+r.height<=1254);
    assert.equal(material.tileWorldWidth/r.width,material.tileWorldDepth/r.height,'no square-stretch of a rectangular native cell');
    assert.equal(material.nativeStatus,'OpenAI-native-immutable');assert.match(material.seamStatus,/visual-check-required/);
  }
});

test('upright landscape modules retain their native ground pivot, depth, culling and foreground-only fade',()=>{
  for(const scenery of modules){const art=api.HOMEWORLD_OUTSKIRTS_ART_V71[scenery.artId],paint=api.homeworldLandscapePaintV75(scenery),p=api.homeworldProjectGroundV64(scenery);
    assert(Math.abs(paint.width/art.alphaBounds.width-paint.height/art.alphaBounds.height)<1e-10);
    assert(Math.abs(paint.top+(art.pivot.y-art.alphaBounds.y)*paint.scale-p.y)<1e-9);
    assert(Math.abs(paint.left+(art.pivot.x-art.alphaBounds.x)*paint.scale-p.x)<1e-9);
    assert(api.homeworldLandscapeVisibleV75(scenery,{x:paint.left,y:paint.top,width:80,height:80}));
    assert(!api.homeworldLandscapeVisibleV75(scenery,{x:90000,y:90000,width:300,height:500}));
    assert(!api.shouldFadeHomeworldLandscapeV75(scenery,{x:scenery.x,y:scenery.y+40}));
  }
  const patch=api.HOMEWORLD_LANDSCAPE_PATCHES_V75[0];assert(api.homeworldLandscapePatchVisibleV75(patch,{x:patch.x,y:patch.y*.573576,width:100,height:100}));
  assert(!api.homeworldLandscapePatchVisibleV75(patch,{x:90000,y:90000,width:300,height:500}));
});

test('actual landscape JSX retains every public union mask and mounts separate native material windows and scenery',async()=>{
  const result=await build({stdin:{contents:"import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import View from './app/game/HomeworldOutskirtsV71.tsx';export const html=renderToStaticMarkup(React.createElement(View,{actor:{x:2900,y:250},cameraX:2200,cameraY:-620,width:1440,height:1000}));",resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'node',format:'cjs',external:['react','react-dom/server'],plugins:[{name:'css-test-only',setup(build){build.onLoad({filter:/\.module\.css$/},()=>({contents:'export default {};',loader:'js'}));}}]});
  const taskModule={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),taskModule,taskModule.exports);const html=taskModule.exports.html;
  assert.match(html,/data-homeworld-landscape-floor="v75"/);assert.match(html,/scaleY\(0\.573576436351046\)/);
  const masks=[...html.matchAll(/<mask[^>]+id="[^\"]+-(?:outside|public)"[^>]*>([\s\S]*?)<\/mask>/g)];
  assert.equal(masks.length,2,'both real terrain masks');
  for(const mask of masks)assert.equal((mask[1].match(/<polygon /g)??[]).length,api.HOMEWORLD_DISTRICTS.length+api.HOMEWORLD_STREETS.length,'ALL public surfaces remain in each terrain union mask');
  assert.equal((html.match(/data-homeworld-approach-oriented-v76="true"/g)??[]).length,6,'six independent angled doorway floors do not alter the terrain mask');
  assert.equal((html.match(/data-homeworld-landscape-native-material=/g)??[]).length,6);
  assert((html.match(/data-homeworld-prop-id="landscape-v75-/g)??[]).length>0);
  assert((html.match(/data-homeworld-landscape-patch-v75=/g)??[]).length>0);
  assert(!html.includes('width="11000"'));assert(!html.includes('rotate('));assert(!html.includes('scaleX(-1)'));
  assert(!html.includes('backgrounds/'),'no panorama masquerades as natural modular geometry');
});

test('227 source codex entries have exact supports, native assets and explicit local adaptation limits',()=>{
  const codex=api.HOMEWORLD_LANDSCAPE_CODEX_V75;assert.equal(codex.length,227);assert.equal(new Set(codex.map(r=>r.id)).size,227);
  for(const record of codex){assert.equal(record.lore,'original-adaptation');assert.equal(record.spaceId,'world');assert(record.asset);assert(record.constraints.length>0);assert(record.associatedElementIds.length>0);}
  for(const scenery of modules){const record=codex.find(r=>r.id===scenery.id);assert.deepEqual(record.footprint,api.homeworldLandscapeFootprintV75(scenery));assert.equal(record.position.y,scenery.y);}
});
