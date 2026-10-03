import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
const qa=homeworldSceneSsrV78(),load=id=>qa.load('app/game/systems/'+id+'.ts');
const world=load('homeworldWorldV77'),urban=load('homeworldStreetModulesV78'),dress=load('homeworldCourtArtV80'),nature=load('homeworldPortShouldersV80');
const extra=load('homeworldUrbanPopulationV78'),geo=load('homeworldGeometryV64');
test('seven port halts now have different real native silhouettes, while rejected substitutions keep original visible solids',()=>{
 assert.equal(urban.HOMEWORLD_URBAN_LEGACY_PROPS_V78.length,52);assert.equal(urban.HOMEWORLD_URBAN_PROPS_V78.length,52);
 assert.equal(urban.HOMEWORLD_COURT_REVISIONS_V80.length,22);assert.equal(urban.HOMEWORLD_COURT_REFUSALS_V80.length,6);
 const signatures=[];
 for(let i=0;i<7;i++){
  const props=urban.HOMEWORLD_URBAN_PROPS_V78.filter(p=>p.groupId==='urban-v78:port-court-'+i);assert.equal(props.length,4);
  signatures.push(props.map(p=>dress.HOMEWORLD_COURT_ART_V80[p.artId].src).join('|'));
  for(const p of props){
   assert.equal(p.interactive,false);assert.equal(p.solid,true);
   const old=urban.HOMEWORLD_URBAN_LEGACY_PROPS_V78.find(o=>o.id===p.id),revised=urban.HOMEWORLD_COURT_REVISIONS_V80.some(r=>r.id===p.id);
   assert.equal(p.x,old.x);assert.equal(p.y,old.y);
   if(!revised)assert.equal(p,old,'refused substitute must be the old visible and collidable object, not a concealed clone');
   const poly=dress.homeworldCourtPolygonV80(p),c={x:poly.reduce((s,v)=>s+v.x,0)/poly.length,y:poly.reduce((s,v)=>s+v.y,0)/poly.length};
   assert.equal(urban.homeworldUrbanCollisionV78(p.levelId,c,{halfWidth:0,halfDepth:0})?.id,p.id);
   assert.equal(urban.homeworldUrbanPlacementRefusalV78(p,urban.HOMEWORLD_URBAN_PROPS_V78.filter(o=>o!==p)),null);
  }
 }
 assert.equal(new Set(signatures).size,7,'seven copies of the same four sources are not a varied city');
 assert.equal(new Set(urban.HOMEWORLD_URBAN_PROPS_V78.filter(p=>p.artId.startsWith('court-native-v80:')).map(p=>p.artId)).size,7,'wall substitutions remain refused; its eighth source is used on other real frontages');
 assert(urban.HOMEWORLD_COURT_REFUSALS_V80.every(r=>r.reason==='port-main-throughfare'),'never reduce new furniture to pass through the reserved main road');
 for(const r of extra.HOMEWORLD_URBAN_EXTRAS_V78)for(let t=0;t<=60;t+=.25)assert(urban.homeworldUrbanWalkableV78(r.levelId,world.homeworldResidentPoseV77(r,t),{halfWidth:36,halfDepth:26}));
});
test('port shoulders keep full measured natural supports outside public ground and never grant invisible access',()=>{
 assert(nature.HOMEWORLD_PORT_SHOULDERS_V80.length>=15);assert(nature.HOMEWORLD_PORT_SHOULDER_REFUSALS_V80.length>0);
 assert.equal(nature.HOMEWORLD_PORT_SHOULDERS_V80.length+nature.HOMEWORLD_PORT_SHOULDER_REFUSALS_V80.length,nature.HOMEWORLD_PORT_SHOULDER_CANDIDATES_V80.length);
 const art=load('homeworldOutskirtsArtV71'),outskirts=load('homeworldOutskirtsV71');
 for(const p of nature.HOMEWORLD_PORT_SHOULDERS_V80){
  assert.equal(nature.homeworldPortShoulderRefusalV80(p,nature.HOMEWORLD_PORT_SHOULDERS_V80.filter(other=>other!==p)),null,p.id);
  assert.equal(p.interactive,false);assert.equal(p.solid,false);assert.equal(p.levelId,'0');
  const b=outskirts.homeworldOutskirtsFootprintV71(p);
  for(let x=b.left-80;x<=b.right+80;x+=10)for(let y=b.top-80;y<=b.bottom+80;y+=10)assert.equal(urban.homeworldUrbanTerrainV78('0',{x,y},{halfWidth:0,halfDepth:0}),false,p.id+' paints over public support');
  assert.equal(urban.homeworldUrbanWalkableV78('0',p),false,'scenery is not a new walkable plot');
  const record=nature.HOMEWORLD_PORT_SHOULDER_CODEX_V80.find(r=>r.id===p.id);assert.equal(record.door,null);assert.equal(record.footprint,null);assert.equal(record.asset,art.HOMEWORLD_OUTSKIRTS_ART_V71[p.artId].src);
 }
});
test('actual scene SSR mounts varied court provider and separate natural cells with unchanged uniform projection',()=>{
 const camera={x:-1000,y:-3000,viewWidth:15000,viewHeight:14000};
 const html=qa.render('app/game/HomeworldWorldSceneV77.tsx',{actor:world.HOMEWORLD_SPACEPORT_V77.spawn,levelId:'0',camera,seconds:0,activeDoorId:null,activePointId:null});
 for(const p of urban.HOMEWORLD_URBAN_PROPS_V78.filter(p=>p.levelId==='0')){
  const needle='data-homeworld-prop-id="'+p.id+'"',start=html.indexOf(needle);assert(start>=0);
  const node=html.slice(start,html.indexOf('</span>',start)),art=dress.HOMEWORLD_COURT_ART_V80[p.artId],paint=urban.homeworldUrbanNativePlacementV78(p);
  assert(node.includes('src="'+art.src+'"'));assert(node.includes('data-homeworld-art-id="'+p.artId+'"'));assert.doesNotMatch(node,/rotate\(|scaleX\(-1\)/);
  assert(Math.abs(paint.scale-art.heightWorld*p.scale/art.alphaBounds.height)<1e-12);assert.equal(paint.elevation,0);
 }
 for(const p of nature.HOMEWORLD_PORT_SHOULDERS_V80){assert(html.includes('data-homeworld-prop-id="'+p.id+'"'));const art=load('homeworldOutskirtsArtV71').HOMEWORLD_OUTSKIRTS_ART_V71[p.artId];
  assert(html.includes('data-native-source-rect="'+[art.sourceRect.x,art.sourceRect.y,art.sourceRect.width,art.sourceRect.height].join(',')+'"'));
  const point=geo.homeworldProjectGroundV64(p);assert.equal(point.y,p.y*geo.HOMEWORLD_GEOMETRY_V64.depthScale);
 }
 const lower=qa.render('app/game/HomeworldWorldSceneV77.tsx',{actor:{x:3980,y:3940},levelId:'-1A',camera,seconds:0,activeDoorId:null,activePointId:null});
 assert(!lower.includes('port-shoulder-v80:'));
});
