import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import { build } from 'esbuild';
const load=async path=>{const r=await build({entryPoints:[path],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));};
const city=await load('app/game/systems/homeworldCity.ts'),model=await load('app/game/systems/homeworldOutskirtsV71.ts');
const art=await load('app/game/systems/homeworldOutskirtsArtV71.ts'),codex=await load('app/game/systems/homeworldContextCodexV71.ts');
const rooms=await load('app/game/systems/homeworldInteriorsV64.ts'),geo=await load('app/game/systems/homeworldGeometryV64.ts');
test('outskirts preserve every public support with measured clearance and no overlapping terrain footprints',()=>{
  assert.equal(model.HOMEWORLD_OUTSKIRTS_MODULES_V71.length,139);
  assert.equal(new Set(model.HOMEWORLD_OUTSKIRTS_MODULES_V71.map(m=>m.id)).size,139);
  assert.equal(new Set(model.HOMEWORLD_OUTSKIRTS_MODULES_V71.map(m=>m.artId)).size,6);
  for(const item of model.HOMEWORLD_OUTSKIRTS_MODULES_V71){
    const r=model.homeworldOutskirtsFootprintV71(item), margin=model.HOMEWORLD_OUTSKIRTS_CLEARANCE_V71;
    // Sample the actual city terrain implementation independently of the
    // generator's exact segment/rectangle intersection algorithm.
    for(let y=r.top-margin;y<=r.bottom+margin;y+=8)for(let x=r.left-margin;x<=r.right+margin;x+=8)
      assert.equal(city.isHomeworldTerrainWalkable({x,y},{halfWidth:0,halfDepth:0}),false,item.id+' public support overlap');
  }
  const rects=model.HOMEWORLD_OUTSKIRTS_MODULES_V71.map(model.homeworldOutskirtsFootprintV71);
  for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
    const a=rects[i],b=rects[j];assert(!(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top));
  }
  assert.equal(city.HOMEWORLD_BUILDINGS.length,43);assert.equal(rooms.HOMEWORLD_INTERIORS_V64.length,43);
});
test('native cells have one uniform scale, measured supports and unchanged OpenAI source bytes',()=>{
  // Independent measured connected alpha>200 silhouettes of the immutable PNG.
  // This catches a cell stealing pixels from its neighbour (the first thicket
  // crop contained 17px of the retaining wall), without repainting the atlas.
  const nativeCores={basalt:[22,29,513,492],resinwood:[549,19,1013,501],vent:[1056,180,1511,487],
    retaining:[17,672,572,917],thicket:[594,588,1022,941],marker:[1090,515,1489,963]};
  for(const [id,source] of Object.entries(art.HOMEWORLD_OUTSKIRTS_ART_V71)){
    const rect=source.sourceRect,core=nativeCores[id];
    assert(rect.x<=core[0]&&rect.y<=core[1]&&rect.x+rect.width>=core[2]&&rect.y+rect.height>=core[3],id+' fully contains its native silhouette');
    for(const [other,bounds] of Object.entries(nativeCores))if(other!==id)
      assert(!(rect.x<bounds[2]&&rect.x+rect.width>bounds[0]&&rect.y<bounds[3]&&rect.y+rect.height>bounds[1]),id+' includes pixels from '+other);
  }
  for(const source of [art.HOMEWORLD_OUTSKIRTS_GROUND_V71,...Object.values(art.HOMEWORLD_OUTSKIRTS_ART_V71)]){
    const bytes=fs.readFileSync('public'+source.src);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),source.sha256);
    assert.equal(bytes.readUInt32BE(16),source.sourceWidth);assert.equal(bytes.readUInt32BE(20),source.sourceHeight);
    if(source.pivot){assert(source.sourceRect.x+source.sourceRect.width<=source.sourceWidth);assert(source.sourceRect.y+source.sourceRect.height<=source.sourceHeight);}
  }
  for(const item of model.HOMEWORLD_OUTSKIRTS_MODULES_V71){
    const source=art.HOMEWORLD_OUTSKIRTS_ART_V71[item.artId],paint=model.homeworldOutskirtsPaintV71(item),p=geo.homeworldProjectGroundV64(item);
    assert(Math.abs(paint.width/source.alphaBounds.width-paint.height/source.alphaBounds.height)<1e-10);
    assert(Math.abs(paint.left+(source.pivot.x-source.alphaBounds.x)*paint.scale-p.x)<1e-9);
    assert(Math.abs(paint.top+(source.pivot.y-source.alphaBounds.y)*paint.scale-p.y)<1e-9);
  }
});
test('culling and fade use painted camera bounds and ground depth, not a fixed background plane',()=>{
  const item=model.HOMEWORLD_OUTSKIRTS_MODULES_V71.find(m=>m.artId==='basalt'),r=model.homeworldOutskirtsPaintV71(item);
  assert(model.homeworldOutskirtsVisibleV71(item,{x:r.left+1,y:r.top+1,width:100,height:100}));
  assert(!model.homeworldOutskirtsVisibleV71(item,{x:90000,y:90000,width:100,height:100}));
  assert(model.shouldFadeHomeworldOutskirtsV71(item,{x:item.x,y:item.y-50}));
  assert(!model.shouldFadeHomeworldOutskirtsV71(item,{x:item.x,y:item.y+50}));
  assert(!model.shouldFadeHomeworldOutskirtsV71(item,{x:item.x+500,y:item.y-50}));
  for(const camera of [{x:530,y:2180,width:1500,height:900},{x:980,y:2280,width:410,height:540},{x:-80,y:-100,width:1200,height:700},{x:5100,y:1500,width:1280,height:900}]){
    const floor=model.homeworldOutskirtsGroundWindowV71(camera),d=geo.HOMEWORLD_GEOMETRY_V64.depthScale;
    assert(floor.left<=camera.x&&floor.left+floor.width>=camera.x+camera.width);
    assert(floor.top*d<=camera.y&& (floor.top+floor.depth)*d>=camera.y+camera.height);
    assert(floor.width*floor.depth<model.HOMEWORLD_OUTSKIRTS_BOUNDS_V71.width*model.HOMEWORLD_OUTSKIRTS_BOUNDS_V71.depth/4,'camera mask is smaller than full-world surface');
    assert(floor.width<camera.width+1000);
  }
  const camera={x:990,y:2310,width:410,height:540};
  assert.deepEqual(model.homeworldOutskirtsGroundWindowV71(camera),model.homeworldOutskirtsGroundWindowV71({...camera,x:camera.x+2,y:camera.y+2}),'tile origin is stable through a small camera step');
});
test('codex connects every real facade, front path, threshold and proportionate furnished interior',()=>{
  const ids=new Set(codex.HOMEWORLD_ALL_ELEMENT_CODEX_V71.map(r=>r.id));
  assert.equal(ids.size,codex.HOMEWORLD_ALL_ELEMENT_CODEX_V71.length);
  assert.equal(model.HOMEWORLD_BUILDING_APPROACHES_V71.length,43);
  for(const building of city.HOMEWORLD_BUILDINGS){
    const room=rooms.homeworldInteriorForBuildingV64(building.id),record=codex.HOMEWORLD_CONTEXT_CODEX_V71.find(r=>r.id==='assembly-v71:'+building.id);
    assert(record);assert.equal(record.asset,building.art.src);assert(room.width<=building.footprint.width&&room.depth<=building.footprint.depth);
    assert(record.associatedElementIds.includes('interior:'+building.id));assert(record.associatedElementIds.includes('door:'+building.id));
    assert(record.associatedElementIds.includes('approach-v71:'+building.id));assert(room.props.length>0);
    assert.equal(record.lore,'original-adaptation');
  }
  for(const record of codex.HOMEWORLD_CONTEXT_CODEX_V71)for(const id of record.associatedElementIds)assert(ids.has(id),record.id+' missing '+id);
});
test('actual JSX projects ground once, masks all public polygons, and crops independent native cells',async()=>{
  const result=await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import View from './app/game/HomeworldOutskirtsV71.tsx';export const html=renderToStaticMarkup(React.createElement(View,{actor:{x:1280,y:4480},cameraX:530,cameraY:2180,width:1500,height:900}));`,resolveDir:process.cwd(),loader:'tsx'},
    bundle:true,write:false,format:'cjs',platform:'node',logLevel:'silent',external:['react','react-dom/server'],plugins:[{name:'native-render-css-only',setup(build){build.onLoad({filter:/\.module\.css$/},()=>({contents:'export default {};',loader:'js'}));}}]});
  const taskModule={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),taskModule,taskModule.exports);
  const {html}=taskModule.exports;
  assert(html.includes('data-homeworld-outskirts-floor="v71"'));assert(html.includes('scaleY(0.573576436351046)'));
  assert(!html.includes('width="8100"'),'actual ground SVG is restricted to camera window');
  assert.equal((html.match(/<polygon /g)??[]).length,(city.HOMEWORLD_DISTRICTS.length+city.HOMEWORLD_STREETS.length)*2,'union ground masks are actual rendered polygons');
  assert.equal((html.match(/data-homeworld-approach-v71=/g)??[]).length,43);
  const nativeCount=(html.match(/data-homeworld-prop-id="outskirts-v71-/g)??[]).length;
  assert(nativeCount>0&&nativeCount<139);assert(html.includes('data-native-source-rect='));
  assert(!html.includes('backgrounds/'),'no painted panorama substitutes for outside terrain');
});
