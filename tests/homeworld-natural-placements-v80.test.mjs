import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
const qa=homeworldSceneSsrV78(),load=id=>qa.load('app/game/systems/'+id+'.ts');
const natural=load('homeworldNaturalPlacementsV80'),old=load('homeworldOutskirtsV71'),land=load('homeworldLandscapeV75'),world=load('homeworldWorldV77'),civic=load('homeworldCivicDecorV80'),shoulders=load('homeworldPortShouldersV80');
const box=r=>({...r,right:r.left+r.width,bottom:r.top+r.height}),overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;

test('eleven same-ID natural revisions preserve all 374 source origins and never replace native cells or scales',()=>{
 const origins=[...old.HOMEWORLD_OUTSKIRTS_MODULES_V71,...land.HOMEWORLD_LANDSCAPE_MODULES_V75];
 assert.equal(origins.length,374);assert.deepEqual(natural.HOMEWORLD_NATURAL_ORIGINS_V80,origins);
 assert.equal(natural.HOMEWORLD_NATURAL_REVISIONS_V80.length,11);
 assert.equal(shoulders.HOMEWORLD_PORT_SHOULDERS_V80.length,18);
 assert.equal(natural.HOMEWORLD_NATURAL_MODULES_V80.length,origins.length+shoulders.HOMEWORLD_PORT_SHOULDERS_V80.length);
 assert.deepEqual(natural.HOMEWORLD_NATURAL_MODULES_V80.slice(origins.length),shoulders.HOMEWORLD_PORT_SHOULDERS_V80,'only accepted current shoulders extend the immutable source set');
 const shoulderIds=new Set(shoulders.HOMEWORLD_PORT_SHOULDERS_V80.map(p=>p.id)),refusedIds=new Set(shoulders.HOMEWORLD_PORT_SHOULDER_REFUSALS_V80.map(p=>p.id));
 assert.equal(shoulderIds.size+refusedIds.size,shoulders.HOMEWORLD_PORT_SHOULDER_CANDIDATES_V80.length);
 for(const p of shoulders.HOMEWORLD_PORT_SHOULDER_CANDIDATES_V80)assert(shoulderIds.has(p.id)!==refusedIds.has(p.id),p.id+' is either mounted or explicitly refused');
 for(const origin of origins){
  const active=natural.HOMEWORLD_NATURAL_MODULES_V80.find(p=>p.id===origin.id),revision=natural.HOMEWORLD_NATURAL_REVISIONS_V80.find(r=>r.id===origin.id);
  assert(active);if(!revision){assert.equal(active,origin);continue;}
  assert.equal(revision.origin,origin);assert.notEqual(active,origin);
  assert.deepEqual({...active,x:origin.x,y:origin.y},origin,'world-anchor revision must not change ID, source, scale or role');
  assert.equal(natural.homeworldNaturalRevisionRefusalV80(active),null,origin.id);
 }
});
test('every current natural silhouette stays off the actual pad/shuttle paint; moved supports are outside full public ground',()=>{
 for(const item of natural.HOMEWORLD_NATURAL_MODULES_V80){const paint=box(old.homeworldOutskirtsPaintV71(item));
  assert(!overlap(paint,natural.HOMEWORLD_NATURAL_PAD_PAINT_V80),item.id+' over painted pad');
  assert(!overlap(paint,natural.HOMEWORLD_NATURAL_SHIP_PAINT_V80),item.id+' over painted shuttle');
 }
 const urban=load('homeworldStreetModulesV78');
 for(const r of natural.HOMEWORLD_NATURAL_REVISIONS_V80){const b=old.homeworldOutskirtsFootprintV71(r.active);
  for(let x=b.left-80;x<=b.right+80;x+=10)for(let y=b.top-80;y<=b.bottom+80;y+=10)assert(!urban.homeworldUrbanTerrainV78('0',{x,y},{halfWidth:0,halfDepth:0}),r.id);
  assert(!urban.homeworldUrbanWalkableV78('0',r.active),'relocated scenery does not grant an invisible new plot');
 }
});
test('actual scene and aggregate codex consume the same natural anchors, preserving old reference IDs',()=>{
 const records=load('homeworldContextCodexV71').HOMEWORLD_ALL_ELEMENT_CODEX_V71;
 const html=qa.render('app/game/HomeworldWorldSceneV77.tsx',{actor:world.HOMEWORLD_SPACEPORT_V77.spawn,levelId:'0',camera:{x:-1000,y:-1000,viewWidth:14000,viewHeight:12000},seconds:0,activeDoorId:null,activePointId:null});
 const art=load('homeworldOutskirtsArtV71').HOMEWORLD_OUTSKIRTS_ART_V71,geo=load('homeworldGeometryV64');
 for(const r of natural.HOMEWORLD_NATURAL_REVISIONS_V80){
  const matches=records.filter(record=>record.id===(r.id.startsWith('outskirts')?'prop:'+r.id:r.id));assert.equal(matches.length,1);
  assert.deepEqual(matches[0].position,{x:r.active.x,y:r.active.y,z:0});assert.deepEqual(matches[0].footprint,old.homeworldOutskirtsFootprintV71(r.active));
  const start=html.indexOf('data-homeworld-prop-id="'+r.id+'"');assert(start>=0);const node=html.slice(start,html.indexOf('</span>',start));
  const a=art[r.active.artId],s=a.heightWorld*r.active.scale/a.alphaBounds.height,p=geo.homeworldProjectGroundV64(r.active);
  assert(node.includes('left:'+(p.x-a.pivot.x*s)+'px'));assert(node.includes('top:'+(p.y-a.pivot.y*s)+'px'));assert(node.includes('src="'+a.src+'"'));assert.doesNotMatch(node,/rotate\(|scaleX\(-1\)/);
 }
});
test('all current natural sprites remain level-zero decoration and rendering never changes active terrain or creates a natural collider',()=>{
 const urban=load('homeworldStreetModulesV78'),movement=load('homeworldCivicWorldV80'),ids=new Set(natural.HOMEWORLD_NATURAL_MODULES_V80.map(p=>p.id));
 const points=natural.HOMEWORLD_NATURAL_MODULES_V80.flatMap(item=>{const r=old.homeworldOutskirtsFootprintV71(item);return[item,{x:r.left,y:r.top},{x:r.right,y:r.top},{x:r.right,y:r.bottom},{x:r.left,y:r.bottom}];});
 const snapshot=()=>world.HOMEWORLD_LEVELS_V77.flatMap(level=>points.map(point=>{
  const terrain=urban.homeworldUrbanTerrainV78(level.id,point),collision=movement.homeworldCivicCollisionV80(level.id,point);
  assert(!ids.has(collision?.id),'render-only natural sprite must never become a solid on '+level.id);
  if(!terrain)assert.equal(movement.homeworldCivicWalkableV80(level.id,point),false,'painted scenery cannot grant unsupported access on '+level.id);
  return[terrain,collision?.id??null];
 }));
 const before=snapshot();
 for(const level of world.HOMEWORLD_LEVELS_V77){
  const html=qa.render('app/game/HomeworldWorldSceneV77.tsx',{actor:world.HOMEWORLD_SPACEPORT_V77.spawn,levelId:level.id,camera:{x:-3000,y:-3000,viewWidth:18000,viewHeight:16000},seconds:0,activeDoorId:null,activePointId:null});
  const rendered=[...html.matchAll(/data-homeworld-prop-id="([^"]+)"/g)].map(match=>match[1]).filter(id=>ids.has(id));
  assert.deepEqual(rendered.slice().sort(),level.id==='0'?[...ids].sort():[],'all natural source instances render exactly once on their own plane');
 }
 assert.deepEqual(snapshot(),before,'drawing natural silhouettes does not expand terrain or change collision');
});
test('the authored consultation lectern has a supported unobscured frontage and preserves the archived V80 placement revision',()=>{
 assert.deepEqual(civic.HOMEWORLD_CIVIC_POSITION_REVISIONS_V80,[{id:'civic-v80:trophy-mausoleum:left:0',x:180,y:2000,reason:'Native thicket071 obscured the only consultation lectern.'}]);
 const id='civic-v81:trophy-mausoleum:0',origin=civic.HOMEWORLD_CIVIC_ORIGINAL_CANDIDATES_V80.find(p=>p.id===id),active=civic.HOMEWORLD_CIVIC_PROPS_V80.find(p=>p.id===id);
 assert(origin&&active);assert.equal(active,origin,'authored V81 frontage is not moved or resized to force acceptance');
 assert.equal(active.artId,'clan-lectern-right');assert.equal(active.scale,1);assert.equal(active.levelId,'0');assert.equal(active.buildingId,'trophy-mausoleum');
 const plan=load('homeworldAuthoredLotsV81').HOMEWORLD_FRONTAGE_PLANS_V81['trophy-mausoleum'][0],building=world.HOMEWORLD_BUILDINGS_V77.find(p=>p.id==='trophy-mausoleum'),frame=load('homeworldGeometryV64').homeworldBuildingGroundFrameV76(building);
 assert.equal(active.x,building.x+frame.tangent.x*plan.u+frame.normal.x*(frame.vFront+plan.v));
 assert.equal(active.y,building.y+frame.tangent.y*plan.u+frame.normal.y*(frame.vFront+plan.v));
 assert.equal(civic.homeworldCivicRefusalV80(active,civic.HOMEWORLD_CIVIC_PROPS_V80.filter(p=>p!==active)),null);
 const p=civic.homeworldCivicPaintV80(active),a=civic.HOMEWORLD_CIVIC_ART_V80[active.artId];
 const alpha={left:p.left+a.alphaBounds.x*p.scale,right:p.left+(a.alphaBounds.x+a.alphaBounds.width)*p.scale,top:p.top+a.alphaBounds.y*p.scale,bottom:p.top+(a.alphaBounds.y+a.alphaBounds.height)*p.scale};
 // The archived V80 correction owns this exact root-clearance assertion. The
 // V81 authored frontage has its own measured support and unchanged native
 // painting; an overlapping non-solid root must not be called a collider.
 const archive={...active,x:180,y:2000},hull=civic.homeworldCivicPolygonV80(archive),support={left:Math.min(...hull.map(p=>p.x))-8,right:Math.max(...hull.map(p=>p.x))+8,top:Math.min(...hull.map(p=>p.y))-8,bottom:Math.max(...hull.map(p=>p.y))+8};
 for(const tree of natural.HOMEWORLD_NATURAL_MODULES_V80){assert(!overlap(old.homeworldOutskirtsFootprintV71(tree),support));if(tree.y>active.y)assert(!overlap(box(old.homeworldOutskirtsPaintV71(tree)),alpha),tree.id+' hides the lectern');}
 assert.equal(civic.HOMEWORLD_CIVIC_PROPS_V80.length,19);assert.equal(civic.HOMEWORLD_CIVIC_REFUSALS_V80.length,24);
 assert.equal(civic.HOMEWORLD_CIVIC_PROPS_V80.length+civic.HOMEWORLD_CIVIC_REFUSALS_V80.length,civic.HOMEWORLD_CIVIC_CANDIDATES_V80.length);
});
test('port arrival caption follows supported actual pad/approach, not another level or eastern halt',()=>{
 const caption=load('homeworldCivicNeighborhoodsV80').homeworldCivicNeighborhoodV80;
 assert.equal(caption('0',world.HOMEWORLD_SPACEPORT_V77.spawn).label,'Port des Chasses');
 const pad=world.HOMEWORLD_SPACEPORT_V77.pad,points=[];
 for(let x=pad.x-pad.width/2;x<=pad.x+pad.width/2;x+=40)for(let y=pad.y-pad.depth/2;y<=pad.y+pad.depth/2;y+=40)points.push({x,y});
 const supported=points.find(p=>world.homeworldTerrainV77('0',p,{halfWidth:0,halfDepth:0}));assert(supported,'a real supported part of the pad is required');
 assert.equal(caption('0',supported).id,'port-arrival');
 assert.notEqual(caption('+1',world.HOMEWORLD_SPACEPORT_V77.spawn).id,'port-arrival');
 const court=load('homeworldAuthoredLotsV81').HOMEWORLD_AUTHORED_COURTS_V81.find(p=>p.id==='port-6');
 assert.equal(caption('0',{x:7340,y:5075}).label,court.label);assert.equal(court.label,'Quai du retour des chasses');
 assert.notEqual(caption('0',{x:world.HOMEWORLD_SPACEPORT_V77.spawn.x+450,y:world.HOMEWORLD_SPACEPORT_V77.spawn.y}).id,'port-arrival');
});
