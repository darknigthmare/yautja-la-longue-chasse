import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78(),load=name=>qa.load('app/game/systems/'+name+'.ts');
const eco=load('homeworldEcotonesV112'),land=load('homeworldLandscapeV75'),world=load('homeworldWorldV77'),supports=load('homeworldNaturalPlacementsV112');
const geo=load('homeworldGeometryV64'),city=load('homeworldCity'),natural=load('homeworldNaturalPlacementsV80');
const candidates=eco.HOMEWORLD_ECOTONE_CANDIDATES_V112,mounted=eco.HOMEWORLD_ECOTONES_V112,refused=eco.HOMEWORLD_ECOTONE_REFUSALS_V112;
const d=geo.HOMEWORLD_GEOMETRY_V64.depthScale,sourceBefore=JSON.stringify(land.HOMEWORLD_LANDSCAPE_PATCHES_V75);
const nativeBefore=JSON.stringify(natural.HOMEWORLD_NATURAL_MODULES_V80);
const scene='app/game/HomeworldWorldSceneV77.tsx';
const wide={x:-1800,y:-2500,viewWidth:15000,viewHeight:11000};
const props={actor:world.HOMEWORLD_SPACEPORT_V77.spawn,levelId:'0',camera:wide,seconds:0,activeDoorId:null,activePointId:null};
const tags=(html,attribute)=>[...html.matchAll(new RegExp('<[^>]+\\b'+attribute+'="([^"]*)"[^>]*>','g'))];
const tagFor=(html,attribute,id)=>tags(html,attribute).find(match=>match[1]===id)?.[0];
const inside=(p,polygon)=>city.pointInHomeworldPolygon(p,polygon);

test('all14 source patches are retained, seven regional/4plateau patches mounted and three unsupported upper levels explicitly refused',()=>{
 assert.equal(candidates.length,14);assert.equal(mounted.length,11);assert.equal(refused.length,3);
 assert.deepEqual(new Set(candidates.map(p=>p.id)),new Set(land.HOMEWORLD_LANDSCAPE_PATCHES_V75.map(p=>p.id)));
 assert.deepEqual(refused.map(p=>[p.regionId,p.levelId,p.refusal]),[
  ['storm-chain','+1','NO_NATURAL_SHOULDER_ON_LEVEL'],['cold-crown','+2','NO_NATURAL_SHOULDER_ON_LEVEL'],['forbidden-reserve','+1','NO_NATURAL_SHOULDER_ON_LEVEL'],
 ]);
 for(const patch of candidates){
  assert.equal(patch.origin,land.HOMEWORLD_LANDSCAPE_PATCHES_V75.find(p=>p.id===patch.id));
  for(const key of ['id','regionId','materialId','radiusX','radiusY','opacity','note'])assert.equal(patch[key],patch.origin[key],patch.id+' immutable authored property '+key);
  assert.equal(patch.solid,false);assert.equal(patch.interactive,false);
  if(patch.status==='REFUSED'){assert.equal(patch.exposedSampleCount,0);assert.deepEqual(patch.formationIds,[]);}
  else{assert.equal(patch.levelId,'0');assert(patch.exposedSampleCount>=16);assert(patch.formationIds.length>0);}
 }
});

test('regional anchors follow the real translated port and redesigned coast/lava docks, with genuinely supported arrivals',()=>{
 for(const patch of candidates.filter(p=>p.regionId)){
  const gateway=world.HOMEWORLD_CONNECTIONS_V77.find(g=>g.regionId===patch.regionId),dock=world.HOMEWORLD_REGIONAL_DOCKS_V77.find(g=>g.regionId===patch.regionId);
  assert(gateway||dock);assert.deepEqual({x:patch.x,y:patch.y},gateway?.threshold??dock.point);
  assert.equal(patch.levelId,gateway?.levelId??dock.levelId);
  assert.deepEqual(patch.arrival,gateway?.arrival??dock.point);
  assert(world.homeworldWalkableV77(patch.levelId,patch.arrival),patch.id+' unchanged full-body arrival');
 }
 const byRegion=id=>candidates.find(p=>p.regionId===id);
 assert.deepEqual({x:byRegion('ash-marches').origin.x,y:byRegion('ash-marches').origin.y},{x:500,y:2290});
 assert.deepEqual({x:byRegion('ash-marches').x,y:byRegion('ash-marches').y},{x:7000,y:2290});
 assert.deepEqual({x:byRegion('leviathan-coast').x,y:byRegion('leviathan-coast').y},{x:260,y:2230});
 assert.deepEqual({x:byRegion('thermal-caves').x,y:byRegion('thermal-caves').y},{x:460,y:3600});
});

test('every mounted patch exposes a substantial retained natural surface in real desktop and mobile arrival cameras',()=>{
 for(const patch of mounted)for(const viewport of [{width:1440,height:850},{width:410,height:640}]){
  const camera=world.homeworldCameraWorldV77(patch.arrival,patch.levelId,viewport);assert(eco.homeworldEcotoneVisibleV112(patch,camera));
  const html=qa.render(scene,{...props,actor:patch.arrival,camera}),tag=tagFor(html,'data-homeworld-ecotone-v112',patch.id);assert(tag,patch.id+' actual scene culling');
  let exposed=0;
  for(let x=camera.x+8;x<camera.x+camera.viewWidth;x+=16)for(let sy=camera.y+8;sy<camera.y+camera.viewHeight;sy+=16){
   const point={x,y:sy/d};if(!eco.homeworldEcotoneExposedV112(patch,point))continue;
   assert(supports.HOMEWORLD_NATURAL_SUPPORT_TERRACES_V112.some(f=>patch.formationIds.includes(f.id)&&inside(point,f.polygon)),'sample has no retained rock support');
   assert(!supports.HOMEWORLD_NATURAL_PUBLIC_GROUND_V112.some(g=>inside(point,g.polygon)),'natural material painted on public paving');
   assert(Math.hypot((x-patch.x)/patch.radiusX,(point.y-patch.y)/patch.radiusY)<1);
   exposed++;
  }
  assert(exposed>=24,patch.id+' merely mounted but unexposed at '+viewport.width+'px: '+exposed);
 }
});

test('the scene restores all six immutable material windows with uniform pixel scale then exactly one35degree ground projection',()=>{
 const source=land.HOMEWORLD_LANDSCAPE_GROUND_V75,bytes=fs.readFileSync('public'+source.src);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),source.sha256);
 assert.equal(bytes.readUInt32BE(16),source.sourceWidth);assert.equal(bytes.readUInt32BE(20),source.sourceHeight);
 const html=qa.render(scene,props),materials=Object.values(land.HOMEWORLD_LANDSCAPE_MATERIALS_V75);
 assert.equal(tags(html,'data-homeworld-ecotone-native-material-v112').length,6);
 assert.deepEqual(new Set(mounted.map(p=>p.materialId)),new Set(materials.map(m=>m.id)));
 for(const material of materials){
  const r=material.sourceRect,tag=tagFor(html,'data-homeworld-ecotone-native-material-v112',material.id);assert(tag);
  assert(tag.includes('href="'+material.src+'"'));assert(tag.includes('data-native-sha256="'+source.sha256+'"'));
  assert(tag.includes('data-native-source-rect="'+[r.x,r.y,r.width,r.height].join(',')+'"'));
  assert.equal(material.tileWorldWidth/r.width,material.tileWorldDepth/r.height,'source rectangle was stretched before projection');
  assert(r.x>=0&&r.y>=0&&r.x+r.width<=source.sourceWidth&&r.y+r.height<=source.sourceHeight);
  const pattern=/<pattern\b[^>]*>[\s\S]*?<\/pattern>/g;
  const node=[...html.matchAll(pattern)].map(m=>m[0]).find(m=>m.includes('data-homeworld-ecotone-native-material-v112="'+material.id+'"'));
  assert(node.includes('width="'+material.tileWorldWidth+'"'));assert(node.includes('height="'+material.tileWorldDepth*d+'"'));
  assert(node.includes('x="0" y="0"'),'texture origin must not follow camera');assert(node.includes('patternUnits="userSpaceOnUse"'));
  assert(node.includes('preserveAspectRatio="none"'),'rectangular source cell projects once with the ground');
  assert.equal((node.match(/<image\b/g)??[]).length,1,'not a resampled or substituted bitmap');
 }
});

test('actual JSX clips ellipses to all existing formations and excludes every active public polygon plus native pad/shuttle paint',()=>{
 const html=qa.render(scene,props),svg=qa.render('app/game/HomeworldEcotonesV112.tsx',{camera:wide});
 // Data-bearing tags are unique to this layer; inspecting the entire scene
 // also catches a missing mount or a duplicated pass from the Hub consumer.
 assert.equal(tags(html,'data-homeworld-ecotone-v112').length,11);
 assert(html.includes('data-natural-support-solid-v112="false"'));assert(svg.includes('z-index:-11001'));
 assert.equal(tags(html,'data-ecotone-formation-v112').length,supports.HOMEWORLD_NATURAL_SUPPORT_TERRACES_V112.length);
 for(const formation of supports.HOMEWORLD_NATURAL_SUPPORT_TERRACES_V112){const tag=tagFor(html,'data-ecotone-formation-v112',formation.id);assert(tag.includes('points="'+formation.polygon.map(p=>`${p.x},${p.y*d}`).join(' ')+'"'));}
 assert.equal(tags(html,'data-ecotone-public-exclusion-v112').length,supports.HOMEWORLD_NATURAL_PUBLIC_GROUND_V112.length);
 for(const ground of supports.HOMEWORLD_NATURAL_PUBLIC_GROUND_V112){const tag=tagFor(html,'data-ecotone-public-exclusion-v112',ground.id);assert(tag.includes('fill="black"'));assert(tag.includes('points="'+ground.polygon.map(p=>`${p.x},${p.y*d}`).join(' ')+'"'));}
 for(const [id,paint] of [['pad',natural.HOMEWORLD_NATURAL_PAD_PAINT_V80],['shuttle',natural.HOMEWORLD_NATURAL_SHIP_PAINT_V80]]){
  const tag=tagFor(html,'data-ecotone-port-exclusion-v112',id);assert(tag);for(const [key,value] of Object.entries({x:paint.left,y:paint.top,width:paint.width,height:paint.height}))assert(tag.includes(key+'="'+value+'"'));
  const point={x:(paint.left+paint.right)/2,y:(paint.top+paint.bottom)/2/d};assert(mounted.every(p=>!eco.homeworldEcotoneExposedV112(p,point)));
 }
 for(const patch of mounted){const tag=tagFor(html,'data-homeworld-ecotone-v112',patch.id),p=eco.homeworldEcotoneProjectedV112(patch);
  assert(tag.startsWith('<ellipse '),'no solid rectangle masquerading as a whole natural world');
  for(const [key,value] of Object.entries({cx:p.cx,cy:p.cy,rx:p.rx,ry:p.ry,opacity:patch.opacity}))assert(tag.includes(key+'="'+value+'"'));
  assert(tag.includes('mask="url(#'));assert(tag.includes('data-ecotone-anchor-v112="'+patch.anchorElementId+'"'));
 }
 assert(svg.includes('<g clip-path="url(#'));assert(svg.includes('<g mask="url(#'));
 assert.doesNotMatch(svg,/scaleY\(|rotate\(|scaleX\(-1\)|backgrounds\//);
 assert.equal(JSON.stringify(land.HOMEWORLD_LANDSCAPE_PATCHES_V75),sourceBefore);
 assert.equal(JSON.stringify(natural.HOMEWORLD_NATURAL_MODULES_V80),nativeBefore);
});

test('culling and per-floor rendering never paint a refused upper-floor ecotone or a distant natural layer',()=>{
 const far={x:90000,y:90000,viewWidth:410,viewHeight:640};
 assert(!qa.render(scene,{...props,camera:far}).includes('data-homeworld-ecotones-v112='));
 for(const levelId of ['+1','+2','-1A','-1B','-1C'])assert(!qa.render(scene,{...props,levelId}).includes('data-homeworld-ecotone-v112='));
 const html=qa.render(scene,props);
 for(const patch of refused){assert(!tagFor(html,'data-homeworld-ecotone-v112',patch.id));assert(!eco.homeworldEcotoneVisibleV112(patch,wide));assert(!eco.homeworldEcotoneExposedV112(patch,{x:patch.x,y:patch.y}));}
});

test('the real aggregate codex resolves every relocated anchor and marks refused candidates as documentary, without changing source records',()=>{
 const records=load('homeworldContextCodexV71').HOMEWORLD_ALL_ELEMENT_CODEX_V71;
 for(const id of ['floor:landscape-v75','floor:outskirts-v71']){
  const record=records.find(r=>r.id===id);assert(record);assert.equal(record.spaceId,'authoring:natural-envelope-v75');
  assert(record.constraints.some(c=>c.includes('renderer historique HomeworldOutskirtsV71')));
 }
 for(const patch of candidates){
  const matches=records.filter(r=>r.id===patch.id);assert.equal(matches.length,1,patch.id);const record=matches[0];
  assert.deepEqual(record.position,{x:patch.x,y:patch.y,z:world.homeworldLevelV77(patch.levelId).elevation});
  assert.equal(record.spaceId,patch.status==='MOUNTED'?'world':'authoring:ecotones-v112');assert.equal(record.asset,land.HOMEWORLD_LANDSCAPE_GROUND_V75.src);
  assert.equal(record.lore,'original-adaptation');assert.deepEqual(record.associatedElementIds,[patch.anchorElementId]);
  assert(records.some(r=>r.id===patch.anchorElementId),patch.id+' unresolved codex relation '+patch.anchorElementId);
  assert(record.constraints.some(c=>c.includes('Révision V112')));
  if(patch.refusal)assert(record.constraints.some(c=>c.includes('REFUS '+patch.refusal)));
  const source=land.HOMEWORLD_LANDSCAPE_CODEX_V75.find(r=>r.id===patch.id);assert(source);
  assert.deepEqual(source.position,{x:patch.origin.x,y:patch.origin.y,z:0});assert.equal(source.spaceId,'world');
 }
});
