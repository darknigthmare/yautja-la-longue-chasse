import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
const qa=homeworldSceneSsrV78(),load=name=>qa.load('app/game/systems/'+name+'.ts');
const art=load('homeworldCityNativeArtV78'),placements=load('homeworldCityNativePlacementV78'),urban=load('homeworldStreetModulesV78');
const world=load('homeworldWorldV77'),navigation=load('homeworldUrbanNavigationV78'),codex=load('homeworldCityNativeCodexV78');
const manifest=JSON.parse(fs.readFileSync('app/game/data/homeworldCityGeneratedProvenanceV78.json','utf8'));

test('all13 installed originals retain SHA and dimensions; V81 separately reports one reviewed source without a safe authored placement',async()=>{
 assert.equal(manifest.modules.length,13);
 assert.equal(manifest.runtimeIntegration,true);assert.equal(manifest.runtimeMountedCount,7);assert.equal(manifest.runtimeWithheldCount,6);
 for(const source of manifest.modules){
  const path='public/game/homeworld/v78/'+source.id+'.png',bytes=fs.readFileSync(path);
  assert.equal(bytes.length,source.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),source.sha256);
  const metadata=await sharp(bytes).metadata();assert.equal(metadata.width,source.width);assert.equal(metadata.height,source.height);assert(metadata.hasAlpha);
  const active=art.HOMEWORLD_CITY_NATIVE_ART_V78[source.id];assert.equal(source.runtimeIntegration,!!active);
  assert.equal(source.runtimeSrc,active?.src??null);assert.equal(source.runtimeSha256,active?.sha256??null);
  assert.equal(source.publicCopySrc,'/game/homeworld/v78/'+source.id+'.png');
  if(active){assert.deepEqual(source.nativeLandmarks.pivot,active.pivot);assert.deepEqual(source.nativeLandmarks.nativeGroundSupport,active.nativeGroundSupport);}
  else{assert.equal(source.nativeLandmarks,null);assert(source.withheldReason);}
 }
 assert.equal(Object.keys(art.HOMEWORLD_CITY_NATIVE_ART_V78).length,7);
 assert.equal(art.HOMEWORLD_CITY_NATIVE_WITHHELD_V78.length,6);
 assert.equal(urban.HOMEWORLD_CITY_GENERATED_PROPS_V78.length,6);
 assert.equal(urban.HOMEWORLD_CITY_GENERATED_UNPLACED_V78.length,1);
 assert.equal(urban.HOMEWORLD_CITY_GENERATED_UNPLACED_V78[0],'archive-shelf-right');
 assert(urban.HOMEWORLD_CITY_GENERATED_REJECTIONS_V78.length>0);
 assert.equal(urban.HOMEWORLD_CITY_GENERATED_PROPS_V78.filter(p=>p.levelId==='-1A').length,5);
 assert(!urban.HOMEWORLD_CITY_GENERATED_PROPS_V78.some(p=>p.artId==='archive-shelf-right'),'do not hide the rack behind the mausoleum or move it into unrelated logistics to force seven mounts');
 assert.equal(urban.HOMEWORLD_CITY_GENERATED_PROPS_V78.find(p=>p.artId==='port-cargo-sorting-cart').levelId,'0');
});

test('native support centres actually lie on substantial source pixels and scale uniformly with one ground deprojection',async()=>{
 for(const a of Object.values(art.HOMEWORLD_CITY_NATIVE_ART_V78)){
  const {data,info}=await sharp('public'+a.src).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert(a.nativeGroundSupport.length>=3);assert.equal(a.supportTolerancePixels,12);
  for(const p of a.nativeGroundSupport)assert(data[(Math.round(p.y)*info.width+Math.round(p.x))*4+3]>128,a.id+' support point outside substantial painted base');
  const item=urban.HOMEWORLD_CITY_GENERATED_PROPS_V78.find(p=>p.artId===a.id);
  if(!item){assert(urban.HOMEWORLD_CITY_GENERATED_UNPLACED_V78.includes(a.id));continue;}
  const paint=placements.homeworldCityNativePaintV78(item);
  assert(Math.abs(paint.width/a.sourceWidth-paint.height/a.sourceHeight)<1e-12);
  assert.equal(paint.elevation,world.homeworldLevelV77(item.levelId).elevation);
  assert.equal(paint.left+a.pivot.x*paint.scale,item.x);
  assert.equal(paint.top+a.pivot.y*paint.scale,item.y*load('homeworldGeometryV64').HOMEWORLD_GEOMETRY_V64.depthScale-paint.elevation);
 }
});

test('every mounted generated solid shares renderer/SAT geometry and keeps full base support/reservations',()=>{
 for(const item of urban.HOMEWORLD_CITY_GENERATED_PROPS_V78){
  assert.equal(placements.homeworldCityNativeRefusalV78(item,urban.HOMEWORLD_URBAN_RESERVES_V78,urban.HOMEWORLD_URBAN_PROPS_V78,
   urban.HOMEWORLD_CITY_GENERATED_PROPS_V78.filter(p=>p!==item),urban.homeworldUrbanTerrainV78),null);
  assert.equal(urban.homeworldUrbanCollisionV78(item.levelId,item)?.id,item.id);
  assert.equal(placements.homeworldCityNativeTouchesV78(item,item,{halfWidth:0,halfDepth:0}),true);
  assert.equal(placements.homeworldCityNativeTouchesV78(item,{x:item.x+1000,y:item.y+1000},{halfWidth:0,halfDepth:0}),false);
  assert.equal(urban.homeworldUrbanWalkableV78(item.levelId,item),false);
  assert.equal(item.interactive,false);assert.equal(item.solid,true);
  const record=codex.HOMEWORLD_CITY_NATIVE_CODEX_V78.find(r=>r.id===item.id),paint=placements.homeworldCityNativePaintV78(item);
  assert.deepEqual(record.footprint.polygon,paint.polygon);assert.equal(record.position.z,paint.elevation);
  assert.equal(record.door,null);assert.equal(record.asset,art.HOMEWORLD_CITY_NATIVE_ART_V78[item.artId].src);
 }
});

test('real SSR mounts whole native files on their occupied floor and never mounts withheld civilian/connector/architecture sources',()=>{
 const camera={x:0,y:0,viewWidth:8500,viewHeight:6000};
 for(const levelId of['0','-1A']){
  const html=qa.render('app/game/HomeworldWorldSceneV77.tsx',{actor:world.HOMEWORLD_SPACEPORT_V77.spawn,levelId,camera,seconds:0,activeDoorId:null,activePointId:null});
  for(const item of urban.HOMEWORLD_CITY_GENERATED_PROPS_V78){
   const needle='data-homeworld-prop-id="'+item.id+'"';
   assert.equal(html.includes(needle),item.levelId===levelId);
   if(item.levelId===levelId){const a=art.HOMEWORLD_CITY_NATIVE_ART_V78[item.artId],start=html.indexOf(needle),node=html.slice(start,html.indexOf('</span>',start));
    assert(node.includes('data-native-source-rect="0,0,'+a.sourceWidth+','+a.sourceHeight+'"'));
    assert(node.includes('src="'+a.src+'"'));assert.doesNotMatch(node,/rotate\(|scaleX\(-1\)/);
   }
  }
  for(const withheld of art.HOMEWORLD_CITY_NATIVE_WITHHELD_V78)assert(!html.includes('/game/homeworld/v78/'+withheld.id+'.png'));
 }
 assert.match(fs.readFileSync('app/game/HomeworldHub.tsx','utf8'),/\.\.\.HOMEWORLD_CITY_NATIVE_SCENE_SOURCES_V78/);
 assert.equal(art.HOMEWORLD_CITY_NATIVE_SCENE_SOURCES_V78.length,7);
});

test('a full-body route reaches a real observation approach to every currently mounted native prop without teleport',()=>{
 for(const item of urban.HOMEWORLD_CITY_GENERATED_PROPS_V78){
  const polygon=placements.homeworldCityNativePolygonV78(item);
  const spots=[{x:item.x,y:Math.max(...polygon.map(p=>p.y))+50},{x:item.x,y:Math.min(...polygon.map(p=>p.y))-50},
   {x:Math.max(...polygon.map(p=>p.x))+60,y:item.y},{x:Math.min(...polygon.map(p=>p.x))-60,y:item.y}];
  const found=spots.filter(p=>urban.homeworldUrbanWalkableV78(item.levelId,p)).map(point=>({point,route:navigation.homeworldUrbanWorldRouteV78(
   {levelId:'0',point:world.HOMEWORLD_SPACEPORT_V77.spawn},{levelId:item.levelId,point})})).find(r=>r.route.status==='reachable');
  assert(found,item.id+' requires a real reachable viewing approach');
  for(const segment of found.route.segments)if('points' in segment)for(let i=1;i<segment.points.length;i++)
   assert(navigation.homeworldUrbanRouteSegmentV78(segment.levelId,segment.points[i-1],segment.points[i]));
 }
});
