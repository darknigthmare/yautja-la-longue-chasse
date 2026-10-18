import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import sharp from 'sharp';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
import {inspectHomeworldArchitecturePngV75} from '../scripts/measure-homeworld-architecture-v75.mjs';

const api=homeworldQaModelV64(process.cwd(),['homeworldCity.ts','homeworldArchitectureArtV75.ts','homeworldArchitectureArtV76.ts','homeworldArchitectureV75.ts','homeworldFurnitureV72.ts','homeworldGeometryV64.ts','homeworldIdentityV72.ts','homeworldInteriorsV64.ts','homeworldNativeArchitectureV81.ts','homeworldWorldV77.ts']);
const identities=Object.entries(api.HOMEWORLD_ARCHITECTURE_IDENTITIES_V75);
test('thirteen preserved secondary sources coexist with the measured V81 replacements and twenty-four dwelling IDs',()=>{
 assert.equal(identities.length,13);assert.equal(new Set(identities.map(([,i])=>i.art.src)).size,13);
 for(const building of api.HOMEWORLD_BUILDINGS){
  const current=api.homeworldBuildingIdentityV75(building.id),native=api.homeworldBuildingIdentityV81(building.id);
  if(native){assert.equal(building.art.src,native.art.src);assert.equal(building.footprint.width,native.width);assert.equal(building.footprint.depth,native.depth);}
  else if(current){assert.equal(building.art.src,(api.homeworldBuildingIdentityV76(building.id)??current).art.src);assert.equal(building.footprint.width,570);assert.equal(building.footprint.depth,340);}
  else if(api.homeworldBuildingIdentityV72(building.id))assert.equal(building.art.src,api.homeworldBuildingIdentityV72(building.id).art.src);
  else assert(building.art.src.startsWith('/game/homeworld/v64/house-'));
 }
 assert.equal(api.HOMEWORLD_BUILDINGS.length,43);assert.equal(api.HOMEWORLD_INTERIORS_V64.filter(room=>room.secondaryLayoutV74).length,36);
 assert.equal(api.HOMEWORLD_INTERIORS_V64.filter(room=>room.monumentLayoutV81).length,2);
 assert.equal(api.homeworldBuildingIdentityV75('memory-vault'),null);assert.equal(api.homeworldBuildingIdentityV75('not-a-building'),null);
});
for(const [id,identity]of identities)test('native metrology, source SHA, uniform scale and physical painted entrance · '+id,async()=>{
 const source=await inspectHomeworldArchitecturePngV75('public'+identity.art.src),art=identity.art;
 assert.equal(source.sha256,art.sha256);assert.equal(source.sourceWidth,art.sourceWidth);assert.equal(source.sourceHeight,art.sourceHeight);
 assert.deepEqual(source.alphaBounds,art.alphaBounds);assert.deepEqual(source.corners,[0,0,0,0]);assert(source.transparentPixelRatio>.1);
 const {info,data}=await sharp('public'+art.src).raw().toBuffer({resolveWithObject:true});
 // A civic opening leads into a shaded room, not through the vertical sprite
 // onto the exterior road. Gateway arches have a different transparent contract.
 for(const fraction of [.25,.5,.75])for(const dx of [-24,0,24]){
  const x=Math.round(art.threshold.x+dx),y=Math.round(art.doorway.y+art.doorway.height*fraction),pixel=(y*info.width+x)*4;
  assert(data[pixel+3]>=245,id+' has a see-through street in its interior doorway at '+x+','+y);
  assert(Math.max(data[pixel],data[pixel+1],data[pixel+2])<75,id+' interior must remain a recessed dark cavity');
 }
 assert.equal(identity.measurement.logicalOverride,null,'metrology cannot hide a logical override');
 assert.equal(art.foundationFront.y,source.alphaBounds.y+source.alphaBounds.height-1);
 assert(art.threshold.y<=art.foundationFront.y&&art.threshold.y>art.doorway.y);
 assert(art.threshold.x>=art.doorway.x&&art.threshold.x<=art.doorway.x+art.doorway.width);
 // Historical PNGs retain their complete original metrology even where a V76
 // angled view now runs. Check their source contract, not the new view's scale.
 const current=api.HOMEWORLD_BUILDINGS.find(b=>b.id===id),building={...current,art},position=api.homeworldBuildingSpritePlacementV64(building),scale=position.width/art.sourceWidth;
 assert(Math.abs(scale-position.height/art.sourceHeight)<1e-12);
 const projected=api.homeworldProjectGroundV64(building);
 assert(Math.abs(position.left+art.threshold.x*scale-projected.x)<1e-8);assert(Math.abs(position.top+art.threshold.y*scale-projected.y)<1e-8);
 const door=api.homeworldBuildingDoorwayV64(building);
 assert(door.clearWidth>=80,'native foot aperture too narrow');assert(door.clearHeight>=128,'native opening too low for the adult reference');
 assert(Math.abs(door.frontOffset-Math.max(0,(art.foundationFront.y-art.threshold.y)*scale/api.HOMEWORLD_GEOMETRY_V64.depthScale))<1e-12);
 assert(door.frontOffset<=11,'no long unpainted threshold or invented platform');
 const activeDoor=api.homeworldBuildingDoorwayV64(current);
 assert(api.isHomeworldWalkable(activeDoor.approach));assert.equal(api.nearestHomeworldDoor(activeDoor.approach)?.id,id);
});
test('all sixty-two original frontage fittings remain physical, including seven newly oblique domestic fixtures',()=>{
 assert.equal(api.HOMEWORLD_FRONTAGE_ITEMS_V75.length,62);assert.equal(new Set(api.HOMEWORLD_FRONTAGE_ITEMS_V75.map(i=>i.id)).size,62);
 for(const item of api.HOMEWORLD_FRONTAGE_ITEMS_V75){
  const building=api.HOMEWORLD_BUILDINGS.find(b=>b.id===item.buildingId),buildingBox=api.homeworldBuildingFootprintV64(building),box=api.homeworldFurnitureFootprintV72(item),door=api.homeworldBuildingDoorwayV64(building);
  if(building.art.groundFrame){
   const frame=api.homeworldBuildingGroundFrameV76(building),p=frame.local(item);
   const depth=building.id==='dock-control'&&item.artId==='register-desk'?80:
    building.id==='rite-sanctum'&&item.artId==='resin-lantern'?140:
    building.id==='convoy-workshop'&&item.artId==='convoy-crates'?160:100;
   assert(Math.abs(p.v-(door.frontOffset+depth))<1e-8,'actual measured forecourt depth');
   assert(api.HOMEWORLD_ANGLED_FRONTAGE_ITEMS_V76.some(c=>c.id===item.id&&c.x===item.x&&c.y===item.y),'renderer and collider share exact position');
  }else{
   assert(box.left>=buildingBox.left&&box.right<=buildingBox.right&&box.top>=buildingBox.top&&box.bottom<=buildingBox.bottom,item.id+' extends onto street');
   assert(box.right<=buildingBox.doorLeft-24||box.left>=buildingBox.doorRight+24,item.id+' narrows passage');
   assert.equal(item.y,building.y+door.frontOffset,'native feet must rest on real front foundation edge');
  }
  for(let y=box.top;y<=box.bottom;y+=5)for(let x=box.left;x<=box.right;x+=5)
   assert(!api.isHomeworldWalkable({x,y}),item.id+' can be walked through; existing masonry must own full volume');
  // V77 separates the Council/Acropolis from the street level and V82 moves
  // their working faces. Validate the actual world door, not a flattened map.
  const active=api.HOMEWORLD_BUILDINGS_V77.find(candidate=>candidate.id===building.id);
  assert(api.homeworldWalkableV77(active.levelId,api.homeworldBuildingDoorwayV64(active).approach),building.id+' current-world approach');
 }
 assert.equal(api.HOMEWORLD_ANGLED_FRONTAGE_ITEMS_V76.length,19);
 assert.equal(api.HOMEWORLD_ANGLED_FRONTAGE_ITEMS_V76.filter(item=>!item.id.startsWith('v75-frontage:residence-')).length,12,'all twelve historical civic modules remain');
 assert.equal(new Set(api.HOMEWORLD_FRONTAGE_ITEMS_V75.map(i=>i.artId)).size,9,'multiple native functional furnishings, not repeated identical facade stamps');
});

test('seven oblique dwelling recipes share their complete collider volume and all43 current-world door approaches remain usable',()=>{
 const domestic=api.HOMEWORLD_FRONTAGE_ITEMS_V75.filter(item=>item.buildingId.startsWith('residence-')&&api.HOMEWORLD_BUILDINGS.find(building=>building.id===item.buildingId).art.groundFrame);
 assert.equal(domestic.length,7);
 for(const item of domestic){
  const collider=api.HOMEWORLD_ANGLED_FRONTAGE_ITEMS_V76.find(candidate=>candidate.id===item.id);
  assert(collider,item.id+' has no physical collider');
  assert.deepEqual(api.homeworldFurnitureFootprintV72(collider),api.homeworldFurnitureFootprintV72(item));
  const current=api.HOMEWORLD_FRONTAGE_V77.find(candidate=>candidate.id===item.id),box=api.homeworldFurnitureFootprintV72(current);
  for(let y=box.top;y<=box.bottom;y+=5)for(let x=box.left;x<=box.right;x+=5)
   assert(!api.homeworldWalkableV77(current.levelId,{x,y}),item.id+' is traversable by the complete current-world actor');
 }
 for(const building of api.HOMEWORLD_BUILDINGS_V77){
  const door=api.homeworldBuildingDoorwayV64(building);
  assert(api.homeworldWalkableV77(building.levelId,door.approach),building.id+' current-world threshold is blocked');
 }
});
test('architecture codex reflects the actual model and contains only original non-rewarding fittings with unique IDs',async()=>{
 const entries=api.HOMEWORLD_ARCHITECTURE_CODEX_V75;assert.equal(entries.length,75);assert.equal(new Set(entries.map(r=>r.id)).size,75);
 for(const record of entries){
  assert.equal(record.lore,'original-adaptation');assert.equal(record.spaceId,'world');assert(record.asset);await fs.access('public'+record.asset);
  for(const value of Object.values(record.position))assert(Number.isFinite(value));
  for(const value of Object.values(record.dimensions))assert(Number.isFinite(value)&&value>=0);
  assert(record.constraints.some(text=>/aucun|ni prise|Aucun/.test(text)));assert(record.source.every(source=>source.url.startsWith('https://')));
 }
});
test('real JSX mounts native independent frontage cells at a single ground projection, without new labels, fake rewards or stretched art',async()=>{
 const result=await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import View from './app/game/HomeworldArchitectureV75.tsx';export const html=renderToStaticMarkup(React.createElement(View,{actor:{x:1200,y:1300}}));`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'cjs',platform:'node',logLevel:'silent',external:['react','react-dom/server'],plugins:[{name:'native-css',setup(build){build.onLoad({filter:/\.module\.css$/},()=>({contents:'export default {};',loader:'js'}));}}]});
 const loaded={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),loaded,loaded.exports);
 const html=loaded.exports.html;assert.equal((html.match(/data-homeworld-art-id="furniture-v72:/g)??[]).length,62);
 for(const item of api.HOMEWORLD_FRONTAGE_ITEMS_V75)assert(html.includes('data-homeworld-prop-id="'+item.id+'"'));
 assert(html.includes('/game/homeworld/v72/civic-furniture-kit.png'));assert(html.includes('data-native-source-rect='));
 assert(!html.includes('<svg'));assert(!html.includes('scaleY('));assert(!html.includes('<button'));assert(!html.includes('<span>'));assert(!html.includes('data-trophy-claim-id'));
});
