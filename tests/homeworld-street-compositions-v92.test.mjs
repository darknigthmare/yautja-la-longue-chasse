import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78(),load=id=>qa.load('app/game/systems/'+id+'.ts');
const mount=load('homeworldStreetCompositionMountV92'),native=load('homeworldStreetCompositionV92');
const world=load('homeworldWorldV77'),civic=load('homeworldCivicWorldV80'),geo=load('homeworldGeometryV64');
const nav=load('homeworldNavigationV77'),old84=load('homeworldStreetDecorMountV84'),codex=load('homeworldStreetCompositionCodexV92');
const root=process.cwd(),body={halfWidth:28,halfDepth:18};
const props=native.HOMEWORLD_STREET_COMPOSITION_PROPS_V92;
const center=polygon=>({x:polygon.reduce((sum,p)=>sum+p.x,0)/polygon.length,y:polygon.reduce((sum,p)=>sum+p.y,0)/polygon.length});
const sourceIds=[...new Set(props.map(p=>p.artId))];

test('V92 admits 23 exact instances on all six floors, excludes an isolated working face, and leaves V84 ownership/refusals intact',()=>{
 assert.equal(props.length,23);assert.deepEqual(native.HOMEWORLD_STREET_COMPOSITION_REFUSALS_V92,[]);
 assert.equal(new Set(props.map(p=>p.id)).size,23);assert.equal(new Set(props.map(p=>p.compositionId)).size,16);
 assert(!props.some(item=>item.id==='street-v92:memory-rest:clan-waymarker-right'),'authoring must not restore the locally clear but isolated work face');
 assert.deepEqual(new Set(props.map(p=>p.levelId)),new Set(world.HOMEWORLD_LEVELS_V77.map(l=>l.id)));
 const repeat=native.compileHomeworldStreetCompositionV92(mount.HOMEWORLD_STREET_COMPOSITION_INPUT_V92);
 assert.deepEqual(repeat.accepted,props);assert.deepEqual(repeat.refusals,[],'repeat compilation must not collide with its own newly mounted props');
 assert.equal(old84.HOMEWORLD_STREET_DECOR_PROPS_V84.length,10);
 assert.deepEqual(old84.HOMEWORLD_STREET_DECOR_REFUSALS_V84,[{id:'street-v84:master-practice-rack',reason:'reserved:building:residence-terraces-1'},{id:'street-v84:memory-ritual-brazier',reason:'reserved:building:residence-esplanade-2'}]);
});

test('actual HUD, renderer and codex entry orders all mount the same 23 props and preserve every prior civic admission',()=>{
 for(const order of [
  ['app/game/systems/homeworldCivicNeighborhoodsV80.ts','app/game/HomeworldWorldSceneV77.tsx','app/game/systems/homeworldContextCodexV71.ts'],
  ['app/game/HomeworldWorldSceneV77.tsx','app/game/systems/homeworldContextCodexV71.ts','app/game/systems/homeworldCivicNeighborhoodsV80.ts'],
  ['app/game/systems/homeworldContextCodexV71.ts','app/game/systems/homeworldCivicNeighborhoodsV80.ts','app/game/HomeworldWorldSceneV77.tsx'],
 ]){
  const runtime=homeworldSceneSsrV78();for(const entry of order){runtime.load(entry);
   const live=runtime.load('app/game/systems/homeworldStreetCompositionV92.ts');assert.equal(live.HOMEWORLD_STREET_COMPOSITION_PROPS_V92.length,23,entry);
   assert.equal(new Set(live.HOMEWORLD_STREET_COMPOSITION_PROPS_V92.map(p=>p.compositionId)).size,16,entry);
  }
  const old=runtime.load('app/game/systems/homeworldCivicDecorV80.ts');
  for(const item of old.HOMEWORLD_CIVIC_PROPS_V80)assert.equal(old.homeworldCivicRefusalV80(item,old.HOMEWORLD_CIVIC_PROPS_V80.filter(p=>p!==item)),null,item.id+' earlier native/contact margin must not be blocked');
 }
 const care=props.find(p=>p.id==='street-v92:gallery-care:care-cabinet-left');assert.equal(care.x,5020);assert.equal(care.y,3540);
});

test('the seven consumed PNG sources retain their real dimensions, bytes and authored pivots/facing',()=>{
 assert.equal(sourceIds.length,7,'instances are not new images');
 for(const id of sourceIds){const art=native.HOMEWORLD_STREET_COMPOSITION_ART_V92[id],bytes=fs.readFileSync(path.join(root,'public',art.src));
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16),art.sourceWidth);assert.equal(bytes.readUInt32BE(20),art.sourceHeight);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),art.sha256);
  assert(art.pivot.x>0&&art.pivot.x<art.sourceWidth&&art.pivot.y>0&&art.pivot.y<art.sourceHeight);
  assert(art.facing.startsWith('OBSERVED_'));assert.equal(art.provenance,'LORE_COMPATIBLE_ORIGINAL');
 }
});

test('actual contacts are supported, solid only on their own floor, and their working faces remain walkable',()=>{
 for(const item of props){
  const polygon=native.homeworldStreetCompositionPolygonV92(item),at=center(polygon);
  assert(polygon.length>=3&&polygon.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
  for(let i=0;i<polygon.length;i++){
   const a=polygon[i],b=polygon[(i+1)%polygon.length],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/4));
   for(let s=0;s<=steps;s++)assert(mount.HOMEWORLD_STREET_COMPOSITION_INPUT_V92.terrain(item.levelId,{x:a.x+(b.x-a.x)*s/steps,y:a.y+(b.y-a.y)*s/steps},{halfWidth:0,halfDepth:0}),item.id+' support');
  }
  assert.equal(native.homeworldStreetCompositionCollisionV92(item.levelId,at,{halfWidth:0,halfDepth:0}),item.id);
  assert.equal(world.homeworldCollisionV77(item.levelId,at,{halfWidth:0,halfDepth:0})?.id,item.id);
  assert.equal(civic.homeworldCivicWalkableV80(item.levelId,at),false,'a visible native object cannot be traversed');
  for(const level of world.HOMEWORLD_LEVELS_V77.filter(l=>l.id!==item.levelId))assert.notEqual(native.homeworldStreetCompositionCollisionV92(level.id,at,{halfWidth:0,halfDepth:0}),item.id);
  const usage=native.homeworldStreetCompositionUsageV92(item);
  if(usage)assert(civic.homeworldCivicWalkableV80(item.levelId,center(usage),body),item.id+' operator full body/margin');
  assert.equal(mount.homeworldStreetCompositionFacadeObstructionV92(item),null,item.id+' hidden behind facade');
 }
});

test('every preserved door, regional arrival and vertical connector remains reachable after the actual V92 mount',()=>{
 const from={levelId:'0',point:world.HOMEWORLD_SPACEPORT_V77.spawn};
 const targets=[...world.HOMEWORLD_BUILDINGS_V77.map(b=>({id:'door:'+b.id,levelId:b.levelId,point:geo.homeworldBuildingDoorwayV64(b).approach})),
  ...world.HOMEWORLD_POINTS_V77.filter(p=>p.regionId).map(p=>{const arrival=world.homeworldWorldArrivalV77(p.regionId);return{id:'region:'+p.regionId,levelId:arrival.levelId,point:arrival.actor};}),
  ...world.HOMEWORLD_CONNECTORS_V77.map(c=>({id:'connector:'+c.id,...c.to}))];
 assert.equal(targets.length,60);
 for(const target of targets){const route=nav.homeworldWorldRouteV77(from,target);assert.equal(route.status,'reachable',target.id);
  for(const segment of route.segments)if(segment.points)for(let i=1;i<segment.points.length;i++)assert(nav.homeworldRouteSegmentV77(segment.levelId,segment.points[i-1],segment.points[i]),target.id+' route edge');
 }
});

test('new operator faces are reached from the public port with the real routing consumer',()=>{
 const from={levelId:'0',point:world.HOMEWORLD_SPACEPORT_V77.spawn};
 for(const item of props){const usage=native.homeworldStreetCompositionUsageV92(item);if(!usage)continue;
  const route=nav.homeworldWorldRouteV77(from,{levelId:item.levelId,point:center(usage)});
  assert.equal(route.status,'reachable',item.id+' isolated work face');
 }
});

test('the repaired Trois Vents corridor is actual supported terrain around retained buildings in both City and multi-floor World',()=>{
 const connectionApi=load('homeworldRegionConnectionsV72'),city=load('homeworldCity'),spatial=load('homeworldSpatialCodex');
 const connection=connectionApi.HOMEWORLD_REGION_CONNECTIONS_V72.find(item=>item.regionId==='storm-chain'),current=world.HOMEWORLD_CONNECTIONS_V77.find(item=>item.regionId==='storm-chain');
 assert.equal(connection.clearWidth,180);assert.deepEqual(connection.threshold,{x:4140,y:90});assert.deepEqual(connection.arrival,{x:4140,y:160});
 assert.deepEqual(connection.nodes,[{x:2900,y:250},{x:3020,y:210},{x:3260,y:210},{x:3340,y:120},{x:3880,y:120},{x:4140,y:200},{x:4140,y:160}]);
 assert.equal(city.homeworldCollisionAt({x:3960,y:500})?.id,'rite-sanctum','old corridor must not be rescued by a collider exemption');
 assert.equal(city.homeworldCollisionAt({x:3940,y:300})?.id,'throne-audience','native audience volume remains solid');
 const clearance={halfWidth:36,halfDepth:26};
 for(let segment=1;segment<connection.nodes.length;segment++){
  const from=connection.nodes[segment-1],to=connection.nodes[segment],count=Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/4);
  assert(spatial.isHomeworldRouteSegmentWalkable(from,to),'real City guidance edge '+segment);
  for(let step=0;step<=count;step++){const point={x:from.x+(to.x-from.x)*step/count,y:from.y+(to.y-from.y)*step/count};
   assert(city.isHomeworldWalkable(point,clearance),'City full actor+12 '+segment+' '+step);
   assert(civic.homeworldCivicWalkableV80(current.levelId,point,clearance),'World actual floor/body '+segment+' '+step);
  }
 }
 const councilJunction=[{x:4600,y:500},{x:4600,y:120},{x:4200,y:120},{x:4140,y:160}];
 assert.equal(current.levelId,'+1');
 assert.equal(world.HOMEWORLD_GROUND_V77.filter(ground=>ground.id.startsWith('council-storm-rejoin:')&&ground.levelId==='+1').length,3);
 for(let segment=1;segment<councilJunction.length;segment++){
  const from=councilJunction[segment-1],to=councilJunction[segment],count=Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/4);
  for(let step=0;step<=count;step++)assert(civic.homeworldCivicWalkableV80('+1',{x:from.x+(to.x-from.x)*step/count,y:from.y+(to.y-from.y)*step/count},clearance),'Council rejoin full actor on its true floor '+segment+' '+step);
 }
 const route=spatial.homeworldSpatialRoute(city.createHomeworldActor(),connection.arrival);assert.equal(route.status,'reachable');assert.deepEqual(route.points.at(-1),connection.arrival);
 for(let index=1;index<route.points.length;index++)assert(spatial.isHomeworldRouteSegmentWalkable(route.points[index-1],route.points[index]));
 const portRoute=nav.homeworldWorldRouteV77({levelId:'0',point:world.HOMEWORLD_SPACEPORT_V77.spawn},{levelId:current.levelId,point:connection.arrival});
 assert.equal(portRoute.status,'reachable','a supported cornice must also connect to the true floor network from the public port');
 for(const segment of portRoute.segments)if(segment.points)for(let index=1;index<segment.points.length;index++)assert(nav.homeworldRouteSegmentV77(segment.levelId,segment.points[index-1],segment.points[index]));
});

test('all 110 resident/extra trajectories retain their real body clearance and V92 respects a further four-unit margin',()=>{
 const population=load('homeworldUrbanPopulationV78'),residents=[...world.HOMEWORLD_RESIDENTS_V77,...population.HOMEWORLD_URBAN_EXTRAS_V78];
 assert.equal(world.HOMEWORLD_RESIDENTS_V77.length,98);assert.equal(population.HOMEWORLD_URBAN_EXTRAS_V78.length,12);assert.equal(residents.length,110);
 for(const resident of residents)for(let index=0;index<resident.path.length;index++){
  const a=resident.path[index],b=resident.path[index+1]??a,steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)));
  for(let step=0;step<=steps;step++){const point={x:a.x+(b.x-a.x)*step/steps,y:a.y+(b.y-a.y)*step/steps};
   assert(civic.homeworldCivicWalkableV80(resident.levelId,point),resident.id+' real body '+index+' '+step);
   assert.equal(native.homeworldStreetCompositionCollisionV92(resident.levelId,point,body),null,resident.id+' V92 additional margin '+index+' '+step);
  }
 }
});

test('real SSR mounts each instance exactly once on its floor, using native scale, depth and behind-actor fade',()=>{
 const camera={x:-2000,y:-5000,viewWidth:18000,viewHeight:18000},layers=load('homeworldVisualLayersV78');
 const tags=html=>[...html.matchAll(/<[^>]+data-homeworld-prop-id="([^"]*)"[^>]*>/g)].filter(match=>match[1].startsWith('street-v92:'));
 for(const floor of world.HOMEWORLD_LEVELS_V77){const html=qa.render('app/game/HomeworldWorldSceneV77.tsx',{actor:world.HOMEWORLD_SPACEPORT_V77.spawn,levelId:floor.id,camera,seconds:0,activeDoorId:null,activePointId:null});
  const actual=tags(html),expected=props.filter(p=>p.levelId===floor.id);assert.deepEqual(new Set(actual.map(m=>m[1])),new Set(expected.map(p=>p.id)));assert.equal(actual.length,expected.length);
  for(const item of expected){const tag=actual.find(m=>m[1]===item.id)[0],art=native.HOMEWORLD_STREET_COMPOSITION_ART_V92[item.artId],s=art.heightWorld*item.scale/art.alphaBounds.height;
   const style=Object.fromEntries(/style="([^"]*)"/.exec(tag)[1].split(';').filter(Boolean).map(row=>{const index=row.indexOf(':');return[row.slice(0,index),row.slice(index+1)];}));
   assert.equal(parseFloat(style.width),art.sourceRect.width*s);assert.equal(parseFloat(style.height),art.sourceRect.height*s);
   assert.equal(Number(style['z-index']),layers.homeworldSceneDepthV78(item.y,floor.elevation));
   const start=html.indexOf(tag),node=html.slice(start,html.indexOf('</span>',start));assert(node.includes('src="'+art.src+'"'));assert.doesNotMatch(node,/rotate\(|scaleX\(-1\)/);
  }
 }
 const item=props.find(p=>p.levelId==='-1B'),behind={x:item.x,y:item.y-60};
 assert.equal(native.homeworldStreetCompositionOpacityV92(item,behind,item.levelId),.28);assert.equal(native.homeworldStreetCompositionOpacityV92(item,behind,'+2'),1);
 const html=qa.render('app/game/HomeworldWorldSceneV77.tsx',{actor:behind,levelId:item.levelId,camera,seconds:0,activeDoorId:null,activePointId:null});assert(tags(html).find(m=>m[1]===item.id)[0].includes('opacity:0.28'));
});

test('the live codex and neighbourhood HUD use actual admitted objects without inventing arrival points or floor areas',()=>{
 const all=load('homeworldContextCodexV71').HOMEWORLD_ALL_ELEMENT_CODEX_V71,ids=new Set(all.map(r=>r.id)),hud=load('homeworldCivicNeighborhoodsV80');
 assert.equal(codex.HOMEWORLD_STREET_COMPOSITION_CODEX_V92.length,39);
 for(const record of codex.HOMEWORLD_STREET_COMPOSITION_CODEX_V92){assert(ids.has(record.id));for(const linked of record.associatedElementIds)assert(ids.has(linked),record.id+' unresolved '+linked);
  if(record.category==='panel'){assert.equal(record.footprint,null);assert.deepEqual(record.dimensions,{width:0,depth:0,height:0});}
  else{const item=props.find(p=>p.id===record.id);assert.deepEqual(record.footprint.polygon,native.homeworldStreetCompositionPolygonV92(item));}
 }
 for(const historical of hud.HOMEWORLD_CIVIC_NEIGHBORHOODS_V80){const current=hud.homeworldCivicNeighborhoodV80(historical.levelId,historical);
  assert.equal(current.id,historical.id,'furniture must not rename the existing district');assert.equal(current.label,historical.label);
 }
 for(const item of props){const current=hud.homeworldCivicNeighborhoodV80(item.levelId,item),composition=native.homeworldStreetCompositionNeighborhoodV92(item.levelId,item);
  assert.equal(composition.id,'composition-v92:'+item.compositionId);assert(current.detail.includes(composition.detail));assert(!('visitId'in current));
  const other=native.homeworldStreetCompositionNeighborhoodV92(world.HOMEWORLD_LEVELS_V77.find(l=>l.id!==item.levelId).id,item);assert.notEqual(other?.id,composition.id);
 }
});

test('the real rear market witness keeps its ground pivot/depth and clears the native canopy tangency without moving the QA observer',()=>{
 const population=load('homeworldUrbanPopulationV78'),modules=load('homeworldStreetModulesV78'),artApi=load('homeworldCityNativeArtV78'),layers=load('homeworldVisualLayersV78');
 const resident=population.HOMEWORLD_URBAN_EXTRAS_V78.find(item=>item.id==='urban-v78:extra:lower-0'),pose=world.homeworldResidentPoseV77(resident,0);
 const stall=modules.HOMEWORLD_CITY_GENERATED_PROPS_V78.find(item=>item.id==='city-native-v78:market-stall-right'),art=artApi.HOMEWORLD_CITY_NATIVE_ART_V78[stall.artId];
 assert.equal(pose.x,3127.6477729656285);assert.equal(pose.y,3132.3522270343715);assert.equal(stall.x,3050);assert.equal(stall.y,3340);
 assert.equal(art.sha256,'c98a90d777cf85e921681feb36c738216d8a99a945669e670234c65b65897796');
 assert.deepEqual(art.pivot,{x:659.3333333333334,y:859.6666666666666});
 const level=world.homeworldLevelV77('-1A'),foot=geo.homeworldProjectGroundV64(pose,level.elevation),scale=art.heightWorld/art.alphaBounds.height;
 // Reread from the captured scene: the physical foot meets source (1073,224),
 // the rear roof, even though the ground depth already puts the NPC behind it.
 assert(Math.abs(art.pivot.x+(pose.x-stall.x)/scale-1073.4547891500188)<1e-9);
 assert(Math.abs(art.pivot.y+(pose.y-stall.y)*geo.HOMEWORLD_GEOMETRY_V64.depthScale/scale-224.4566952861011)<1e-9);
 assert.equal(layers.homeworldSceneDepthV78(pose.y,level.elevation),3760);assert.equal(layers.homeworldSceneDepthV78(stall.y,level.elevation),3968);
 const occupant={...pose,levelId:resident.levelId};assert.equal(native.homeworldCityFurnitureOpacityV92(stall,art,[occupant]),.28);
 assert.equal(native.homeworldCityFurnitureOpacityV92(stall,art,[{...occupant,levelId:'+2'}]),1);
 assert.equal(native.homeworldCityFurnitureOpacityV92(stall,art,[{...occupant,y:stall.y+100}]),1);
 assert.equal(native.homeworldCityFurnitureOpacityV92(stall,art,[{...occupant,x:5000}]),1);
 const actor={x:3060.0612696465646,y:3448.4231086212326},camera={x:2400,y:1400,viewWidth:1600,viewHeight:1400};
 assert.equal(native.homeworldCityFurnitureOpacityV92(stall,art,[{...actor,levelId:'-1A'}]),1,'the QA observer is in front and must not trigger the fix');
 const html=qa.render('app/game/HomeworldWorldSceneV77.tsx',{actor,levelId:'-1A',camera,seconds:0,reducedMotion:true,activeDoorId:null,activePointId:null});
 const standTag=[...html.matchAll(/<[^>]+data-homeworld-prop-id="([^"]*)"[^>]*>/g)].find(m=>m[1]===stall.id)[0];assert(standTag.includes('opacity:0.28'));
 const witnessTag=[...html.matchAll(/<[^>]+data-homeworld-resident="([^"]*)"[^>]*>/g)].find(m=>m[1]===resident.id)[0];
 assert(witnessTag.includes('left:'+foot.x+'px;top:'+foot.y+'px'));assert(witnessTag.includes('z-index:3760'));
 assert(html.includes('data-homeworld-ground-contact-v92="'+resident.id+'"'));assert.doesNotMatch(html,/data-homeworld-player/,'this QA scene paints real population, not a player at the observer point');
});
