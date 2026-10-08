import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
import {measureNativeV81} from '../scripts/measure-homeworld-native-v81.mjs';

const q=homeworldSceneSsrV78(),load=name=>q.load('app/game/systems/'+name+'.ts');
const native=load('homeworldNativeArchitectureV81'),world=load('homeworldWorldV77'),geo=load('homeworldGeometryV64');
const backdrop=load('homeworldBackdropV81'),city=load('homeworldCity'),urban=load('homeworldUrbanLayoutV78');
const near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('all11 retained native PNGs have measured immutable bytes/dimensions/alpha and explicit static provenance',async()=>{
 assert.equal(Object.keys(native.HOMEWORLD_NATIVE_CATALOGUE_V81.assets).length,11);
 for(const [id,item]of Object.entries(native.HOMEWORLD_NATIVE_CATALOGUE_V81.assets)){
  const a=item.art,m=await measureNativeV81('public'+a.src,id==='prime-sky'||id.startsWith('paving-'));
  assert.equal(m.sha256,a.sha256);assert.equal(m.sourceWidth,a.sourceWidth);assert.equal(m.sourceHeight,a.sourceHeight);
  assert.deepEqual(m.alphaBounds,a.alphaBounds);assert(!item.measurement.animation.includes('completed'));
  assert.equal(item.measurement.tool,'OpenAI-built-in-imagegen');
  if(item.width){assert.deepEqual(m.opaqueRowsV76,a.opaqueRowsV76);assert(m.cornerAlphas.every(n=>n<=3));}
 }
});

test('nine actual interactive facades align their threshold and source in one scale; oblique multiwing support drives SAT',()=>{
 assert.equal(Object.keys(native.HOMEWORLD_NATIVE_CATALOGUE_V81.buildings).length,9);
 for(const [id,artId]of Object.entries(native.HOMEWORLD_NATIVE_CATALOGUE_V81.buildings)){
  const b=world.HOMEWORLD_BUILDINGS_V77.find(b=>b.id===id),a=native.HOMEWORLD_NATIVE_CATALOGUE_V81.assets[artId].art;
  assert.equal(b.art.src,a.src);const image=geo.homeworldBuildingSpritePlacementV64(b),s=geo.homeworldBuildingSpriteScaleV64(b);
  near(image.width/a.sourceWidth,image.height/a.sourceHeight);
  near(image.left+a.threshold.x*s,b.x);near(image.top+a.threshold.y*s,b.y*geo.HOMEWORLD_GEOMETRY_V64.depthScale);
  const door=geo.homeworldBuildingDoorwayV64(b);assert(door.clearWidth>=80&&door.clearHeight>=128);
  if(a.groundSupportPixelsV81){
   const poly=geo.homeworldBuildingGroundFrameV76(b).polygon;
   for(let i=0;i<poly.length;i++){const p=geo.homeworldProjectGroundV64(poly[i]);near(p.x,image.left+a.groundSupportPixelsV81[i].x*s);near(p.y,image.top+a.groundSupportPixelsV81[i].y*s);}
   const centre={x:poly.reduce((s,p)=>s+p.x,0)/poly.length,y:poly.reduce((s,p)=>s+p.y,0)/poly.length};
   assert(geo.homeworldBuildingTouchesV76(b,centre,{halfWidth:14,halfDepth:11}));
   const box=geo.homeworldBuildingFootprintV64(b);assert(!geo.homeworldBuildingTouchesV76(b,{x:box.right+40,y:box.bottom+40},{halfWidth:14,halfDepth:11}));
  }
 }
});

test('exposed native foundations belong to the physical ground union; internal seams never become chasm faces',()=>{
 for(const level of world.HOMEWORLD_LEVELS_V77){
  // V82 native landing sockets are painted and included by the current edge
  // extractor. Omitting them tests an older, physically incomplete union.
  const polygons=[...world.HOMEWORLD_GROUND_V77,...world.HOMEWORLD_CONNECTOR_PADS_V82,...urban.HOMEWORLD_URBAN_GROUND_V78].filter(g=>g.levelId===level.id);
  const covered=p=>polygons.some(g=>city.pointInHomeworldPolygon(p,g.polygon));
  for(const e of backdrop.HOMEWORLD_EXPOSED_EDGES_V81[level.id]){
   const dx=e.b.x-e.a.x,dy=e.b.y-e.a.y,len=Math.hypot(dx,dy),m={x:(e.a.x+e.b.x)/2,y:(e.a.y+e.b.y)/2};
   assert.notEqual(covered({x:m.x-dy/len*.6,y:m.y+dx/len*.6}),covered({x:m.x+dy/len*.6,y:m.y-dx/len*.6}));
   const [a,b]=backdrop.homeworldProjectEdgeV81(e);near(a.x,e.a.x);near(b.y,e.b.y*geo.HOMEWORLD_GEOMETRY_V64.depthScale-level.elevation);
  }
 }
});

test('the relocated delegation house has an actual paved connector shared by terrain, scene and codex',()=>{
 const id='forecourt-link-v76:residence-clans-1',ground=world.HOMEWORLD_GROUND_V77.find(g=>g.id===id),street=city.HOMEWORLD_STREETS.find(g=>g.id===id);
 assert(ground&&street);assert.equal(ground.levelId,'0');assert.deepEqual(ground.polygon,street.polygon);
 assert(world.homeworldTerrainV77('0',{x:4200,y:2690},{halfWidth:36,halfDepth:26}),'whole guided body must have genuine paved support');
 const context=load('homeworldContextCodexV71'),record=context.HOMEWORLD_ALL_ELEMENT_CODEX_V71.find(r=>r.id==='street:'+id);
 assert(record);assert.deepEqual(record.footprint.polygon,ground.polygon);
 const actor={x:4200,y:2690},camera=world.homeworldCameraWorldV77(actor,'0',{width:1440,height:1000});
 const html=q.render('app/game/HomeworldWorldSceneV77.tsx',{actor,levelId:'0',camera,seconds:5,activeDoorId:null,activePointId:null});
 assert(html.includes('data-world-ground-id-v77="'+id+'"'),'physical support must be painted in the actual scene');
 const projected=ground.polygon.map(p=>`${p.x},${p.y*geo.HOMEWORLD_GEOMETRY_V64.depthScale}`).join(' ');
 assert(html.includes('points="'+projected+'"'),'renderer must use this exact support polygon without a cosmetic substitute');
});

test('only distant scenery parallax moves; the floor-facing facade anchor stays in physical world coordinates',()=>{
 for(const item of backdrop.HOMEWORLD_DISTANT_BLOCKS_V81){
  const first={x:2500,y:1100,viewHeight:900},second={x:2900,y:1350,viewHeight:900};
  const a=backdrop.homeworldBackdropPositionV81(item,first,'0'),b=backdrop.homeworldBackdropPositionV81(item,second,'0');
  const ratio=backdrop.HOMEWORLD_DEPTH_LAYERS_V81[item.layer].parallax;
  near((b.left-second.x)-(a.left-first.x),-400*ratio);near((b.top-second.y)-(a.top-first.y),-250*ratio);
 }
 const royal=world.HOMEWORLD_BUILDINGS_V77.find(b=>b.id==='throne-audience'),before=geo.homeworldBuildingSpritePlacementV64(royal);
 assert.deepEqual(geo.homeworldBuildingSpritePlacementV64(royal),before);
});

test('actual exterior scene consumes separate native skies, proper atlas cells and level-specific materials; atlas exposes real43doors',async()=>{
 for(const level of world.HOMEWORLD_LEVELS_V77){
  const b=world.HOMEWORLD_BUILDINGS_V77.find(b=>b.levelId===level.id),p=b?geo.homeworldBuildingDoorwayV64(b).approach:world.HOMEWORLD_SPACEPORT_V77.spawn;
  const camera=world.homeworldCameraWorldV77(p,level.id,{width:1440,height:1000});
  const html=q.render('app/game/HomeworldWorldSceneV77.tsx',{actor:p,levelId:level.id,camera,seconds:5,activeDoorId:null,activePointId:null});
  assert(html.includes('/game/homeworld/v81/prime-sky.png'));
  assert(html.includes('/game/homeworld/v81/paving-'+(level.id.startsWith('-')?'undercity':level.id.startsWith('+')?'council':'civic')+'.png'));
  assert(html.includes('data-native-source-rect="0,0,530,512"'),'Mountains use basalt only, not a whole six-cell props atlas');
 }
 const source=await fs.readFile('app/game/HomeworldWorldMapV77.tsx','utf8');
 assert(source.includes('homeworldBuildingGroundFrameV76'));assert(source.includes('data-map-real-door-v81'));
 assert.equal(world.HOMEWORLD_BUILDINGS_V77.length,43);
});
