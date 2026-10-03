import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
const qa=homeworldSceneSsrV78(),load=id=>qa.load('app/game/systems/'+id+'.ts');
const natural=load('homeworldNaturalPlacementsV80'),old=load('homeworldOutskirtsV71'),land=load('homeworldLandscapeV75'),world=load('homeworldWorldV77'),civic=load('homeworldCivicDecorV80');
const box=r=>({...r,right:r.left+r.width,bottom:r.top+r.height}),overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;

test('eleven same-ID natural revisions preserve all 374 source origins and never replace native cells or scales',()=>{
 const origins=[...old.HOMEWORLD_OUTSKIRTS_MODULES_V71,...land.HOMEWORLD_LANDSCAPE_MODULES_V75];
 assert.equal(origins.length,374);assert.deepEqual(natural.HOMEWORLD_NATURAL_ORIGINS_V80,origins);
 assert.equal(natural.HOMEWORLD_NATURAL_REVISIONS_V80.length,11);assert.equal(natural.HOMEWORLD_NATURAL_MODULES_V80.length,394);
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
test('the same consultation lectern now has a supported unobscured frontage while retaining its generated original candidate',()=>{
 const id='civic-v80:trophy-mausoleum:left:0',origin=civic.HOMEWORLD_CIVIC_ORIGINAL_CANDIDATES_V80.find(p=>p.id===id),active=civic.HOMEWORLD_CIVIC_PROPS_V80.find(p=>p.id===id);
 assert(origin&&active);assert.equal(origin.x,276.11371377604064);assert.equal(origin.y,2012.8747327243022);
 assert.equal(active.x,180);assert.equal(active.y,2000);assert.deepEqual({...active,x:origin.x,y:origin.y},origin);
 assert.equal(civic.homeworldCivicRefusalV80(active,civic.HOMEWORLD_CIVIC_PROPS_V80.filter(p=>p!==active)),null);
 const p=civic.homeworldCivicPaintV80(active),a=civic.HOMEWORLD_CIVIC_ART_V80[active.artId];
 const alpha={left:p.left+a.alphaBounds.x*p.scale,right:p.left+(a.alphaBounds.x+a.alphaBounds.width)*p.scale,top:p.top+a.alphaBounds.y*p.scale,bottom:p.top+(a.alphaBounds.y+a.alphaBounds.height)*p.scale};
 const hull=civic.homeworldCivicPolygonV80(active),support={left:Math.min(...hull.map(p=>p.x))-8,right:Math.max(...hull.map(p=>p.x))+8,top:Math.min(...hull.map(p=>p.y))-8,bottom:Math.max(...hull.map(p=>p.y))+8};
 for(const tree of natural.HOMEWORLD_NATURAL_MODULES_V80){assert(!overlap(old.homeworldOutskirtsFootprintV71(tree),support));if(tree.y>active.y)assert(!overlap(box(old.homeworldOutskirtsPaintV71(tree)),alpha),tree.id+' hides the lectern');}
 assert.equal(civic.HOMEWORLD_CIVIC_PROPS_V80.length,113);assert.equal(civic.HOMEWORLD_CIVIC_REFUSALS_V80.length,343);
});
test('port arrival caption follows supported actual pad/approach, not another level or eastern halt',()=>{
 const caption=load('homeworldCivicNeighborhoodsV80').homeworldCivicNeighborhoodV80;
 assert.equal(caption('0',world.HOMEWORLD_SPACEPORT_V77.spawn).label,'Port des Chasses');
 const pad=world.HOMEWORLD_SPACEPORT_V77.pad,points=[];
 for(let x=pad.x-pad.width/2;x<=pad.x+pad.width/2;x+=40)for(let y=pad.y-pad.depth/2;y<=pad.y+pad.depth/2;y+=40)points.push({x,y});
 const supported=points.find(p=>world.homeworldTerrainV77('0',p,{halfWidth:0,halfDepth:0}));assert(supported,'a real supported part of the pad is required');
 assert.equal(caption('0',supported).id,'port-arrival');
 assert.notEqual(caption('+1',world.HOMEWORLD_SPACEPORT_V77.spawn).id,'port-arrival');
 assert.equal(caption('0',{x:7340,y:5075}).label,'Halte du quai oriental');
 assert.notEqual(caption('0',{x:world.HOMEWORLD_SPACEPORT_V77.spawn.x+450,y:world.HOMEWORLD_SPACEPORT_V77.spawn.y}).id,'port-arrival');
});
