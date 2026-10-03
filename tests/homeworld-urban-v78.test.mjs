import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
const api=homeworldQaModelV64(process.cwd(),['homeworldWorldV77.ts','homeworldGeometryV64.ts','homeworldIdentityV72.ts','homeworldUrbanLayoutV78.ts','homeworldStreetModulesV78.ts','homeworldUrbanPopulationV78.ts','homeworldUrbanNavigationV78.ts','homeworldUrbanFacadesV78.ts','homeworldUrbanCodexV78.ts']);
const body={halfWidth:24,halfDepth:14};
test('V78 density is measured, additive and keeps four rejected candidates instead of silently shrinking solids',()=>{
 assert.equal(api.HOMEWORLD_BUILDINGS_V77.length,43);assert.equal(api.HOMEWORLD_RESIDENTS_V77.length,98);
 assert.equal(api.HOMEWORLD_URBAN_PROP_CANDIDATES_V78.length,56);assert.equal(api.HOMEWORLD_URBAN_PROPS_V78.length,52);
 assert.equal(api.HOMEWORLD_URBAN_PROPS_V78.filter(p=>p.levelId==='-1A').length,24);
 assert.equal(api.HOMEWORLD_URBAN_PROPS_V78.filter(p=>p.levelId==='0').length,28);
 assert.deepEqual(api.HOMEWORLD_URBAN_PROP_REJECTIONS_V78.map(p=>p.id),[
  'urban-v78:lower-halt-west:covered-work','urban-v78:lower-halt-west:mineral-bed',
  'urban-v78:lower-middle-halt:covered-work','urban-v78:lower-middle-halt:mineral-bed']);
 for(const p of api.HOMEWORLD_URBAN_PROPS_V78){
  assert.equal(p.scale,api.HOMEWORLD_URBAN_PROP_CANDIDATES_V78.find(c=>c.id===p.id).scale);
  assert.equal(p.interactive,false);assert.equal(p.solid,true);
  assert.equal(api.homeworldUrbanPlacementRefusalV78(p,api.HOMEWORLD_URBAN_PROPS_V78.filter(q=>q!==p)),null);
  const placement=api.homeworldUrbanNativePlacementV78(p);assert(placement.sha256&&placement.sourceWidth>0);
  assert(Math.abs(placement.width/placement.sourceWidth-placement.height/placement.sourceHeight)<1e-12);
  assert.equal(placement.elevation,api.homeworldLevelV77(p.levelId).elevation);
  const poly=placement.polygon,center={x:poly.reduce((s,v)=>s+v.x,0)/poly.length,y:poly.reduce((s,v)=>s+v.y,0)/poly.length};
  assert.equal(api.homeworldUrbanCollisionV78(p.levelId,center,body)?.id,p.id);
 }
});
test('all 98 original whole-body routines and all 43 old door approaches remain collision-free',()=>{
 const fails=[];
 for(const r of api.HOMEWORLD_RESIDENTS_V77)for(let s=1;s<r.path.length;s++){
  const a=r.path[s-1],b=r.path[s],n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)));
  for(let i=0;i<=n;i++){const p={x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n};if(!api.homeworldUrbanWalkableV78(r.levelId,p,body))fails.push({id:r.id,p});}
 }
 for(const b of api.HOMEWORLD_BUILDINGS_V77){const p=api.homeworldBuildingDoorwayV64(b).approach;if(!api.homeworldUrbanWalkableV78(b.levelId,p,body))fails.push({id:b.id,p});}
 assert.deepEqual(fails,[]);
 for(const c of api.HOMEWORLD_CONNECTORS_V77)for(const s of[c.from,c.to])assert(api.homeworldUrbanWalkableV78(s.levelId,s.point,body));
});
test('same legacy motor walks continuously into genuinely added port court support and freezes on zero time',()=>{
 let actor={x:4140,y:5400,vx:0,vy:0,grounded:true,facing:1};
 assert(api.homeworldWalkableV77('0',actor));
 for(let i=0;i<75;i++){const previous=actor;actor=api.stepHomeworldUrbanActorV78(actor,{moveX:0,climb:-1,jumpPressed:false},1/60,'0');assert.equal(actor.x,4140);assert(Math.abs(actor.y-previous.y)<=260/60+1e-8);assert(api.homeworldUrbanWalkableV78('0',actor));}
 assert(actor.y<5240);assert.equal(api.homeworldTerrainV77('0',actor,body),false);
 assert.equal(api.homeworldUrbanTerrainV78('0',actor,body),true);
 const stopped=api.stepHomeworldUrbanActorV78(actor,{moveX:1,climb:1,jumpPressed:false},0,'0');assert.equal(stopped,actor);
});
test('14 decorative residents use old personas, preserve all old IDs and never become services or saved visits',()=>{
 assert.equal(api.HOMEWORLD_URBAN_EXTRAS_V78.length,14);assert.deepEqual(api.HOMEWORLD_URBAN_EXTRA_REJECTIONS_V78,[]);
 const oldIds=new Set(api.HOMEWORLD_RESIDENTS_V77.map(r=>r.id));
 for(const r of api.HOMEWORLD_URBAN_EXTRAS_V78){
  assert(oldIds.has(r.sourceResidentId));assert(!oldIds.has(r.id));
  assert.equal(r.interactive,false);assert.equal(r.saveVisit,false);assert.equal(r.solid,false);
  const source=api.HOMEWORLD_RESIDENTS_V77.find(s=>s.id===r.sourceResidentId);
  assert.equal(api.homeworldUrbanExtraRoleV78(r),api.homeworldResidentRoleV72(source));
  for(let t=0;t<=60;t+=.25){const p=api.homeworldResidentPoseV77(r,t);assert(api.homeworldUrbanWalkableV78(r.levelId,p,{halfWidth:36,halfDepth:26}));}
 }
 assert.equal(api.HOMEWORLD_RESIDENTS_V77.length,98);
 assert.equal(new Set(api.HOMEWORLD_URBAN_EXTRAS_V78.filter(r=>r.levelId==='-1A').map(r=>api.homeworldUrbanExtraRoleV78(r))).size,5);
 for(const r of api.HOMEWORLD_RESIDENTS_V77)assert.equal(api.homeworldUrbanExtraRoleV78(r),api.homeworldResidentRoleV72(r));
});
test('eight original native facade placeholders fit their lots and an adult; no fake interactive door is added',()=>{
 assert.equal(api.HOMEWORLD_URBAN_LOTS_V78.length,8);
 assert.equal(api.HOMEWORLD_URBAN_FACADES_V78.length,8);
 for(const [i,lot] of api.HOMEWORLD_URBAN_LOTS_V78.entries()){
  assert.equal(lot.interactive,false);assert.equal(lot.artStatus,'NATIVE_LAYOUT_REQUIRED');
  const facade=api.HOMEWORLD_URBAN_FACADES_V78[i],placement=api.homeworldUrbanFacadePlacementV78(facade);
  assert.equal(facade.interactive,false);assert.equal(facade.nativeStatus,'EXISTING_FRONTAL_NATIVE_PLACEHOLDER');
  assert(placement.paintedDoorHeight>=128);assert(placement.paintedDoorWidth>=80);
  assert(Math.abs(placement.width/placement.sourceWidth-placement.height/placement.sourceHeight)<1e-12);
  assert(placement.footprint.every(p=>p.x>=lot.bounds.left&&p.x<=lot.bounds.right&&p.y>=lot.bounds.top&&p.y<=lot.bounds.bottom));
  const point={x:facade.x,y:facade.y-facade.footprint.depth/2};
  assert.equal(api.homeworldUrbanCollisionV78(lot.levelId,point,body)?.id,facade.id);
  assert.equal(api.nearestHomeworldDoorV77(lot.levelId,point),null);
  for(const reserve of api.HOMEWORLD_URBAN_RESERVES_V78.filter(r=>r.levelId===facade.levelId&&!r.id.endsWith(':pending-facade')))
   assert.equal(api.homeworldUrbanOverlapV78(placement.footprint,reserve.polygon),false,facade.id+' overlaps '+reserve.id);
  for(const other of api.HOMEWORLD_URBAN_FACADES_V78.filter(f=>f!==facade))assert.equal(api.homeworldUrbanOverlapV78(placement.footprint,api.homeworldUrbanFacadePlacementV78(other).footprint),false);
 }
});
test('all 101 urban codex records describe the actual floor, measured solids and honestly pending dedicated art',()=>{
 const records=api.HOMEWORLD_URBAN_CODEX_V78;
 assert.equal(records.length,101);assert.equal(new Set(records.map(r=>r.id)).size,101);
 for(const facade of api.HOMEWORLD_URBAN_FACADES_V78){
  const record=records.find(r=>r.id===facade.id),paint=api.homeworldUrbanFacadePlacementV78(facade);
  assert.equal(record.category,'building');assert.equal(record.door,null);assert.equal(record.asset,facade.art.src);
  assert.deepEqual(record.footprint.polygon,paint.footprint);assert.equal(record.position.z,paint.elevation);
  assert.equal(record.dimensions.width,facade.footprint.width);assert.equal(record.dimensions.depth,facade.footprint.depth);
  assert.equal(record.dimensions.height,facade.wallHeight);assert(record.source[0].note.includes(facade.art.sha256));
  assert(record.constraints.some(c=>c.includes('encore requise')));
 }
 for(const lot of api.HOMEWORLD_URBAN_LOTS_V78){
  const record=records.find(r=>r.id===lot.id);
  assert.equal(record.asset,null);assert.equal(record.footprint,null);assert.equal(record.category,'panel');
  assert(record.constraints.some(c=>c.includes(lot.id+':facade')));
 }
 for(const item of api.HOMEWORLD_URBAN_PROPS_V78){
  const record=records.find(r=>r.id===item.id),paint=api.homeworldUrbanNativePlacementV78(item);
  assert.deepEqual(record.footprint.polygon,paint.polygon);assert.equal(record.asset,paint.src);assert.equal(record.position.z,paint.elevation);
 }
 for(const r of records){assert.equal(r.lore,'original-adaptation');assert.equal(r.spaceId,'world');assert.equal(r.door,null);}
});
test('new static navigation reaches seven connectors, every real building door and every old regional approach from actual port spawn',()=>{
 const from={levelId:'0',point:{x:7780,y:4480}},targets=[
  ...api.HOMEWORLD_CONNECTORS_V77.map(c=>({...c.from,id:'connector:'+c.id})),
  ...api.HOMEWORLD_BUILDINGS_V77.map(b=>({levelId:b.levelId,point:api.homeworldBuildingDoorwayV64(b).approach,id:'door:'+b.id})),
  ...api.HOMEWORLD_POINTS_V77.filter(p=>p.regionId).map(p=>({levelId:p.levelId,point:{x:p.x,y:p.y+100},id:'region:'+p.regionId})),
  {id:'court:new-native-support',levelId:'0',point:{x:4140,y:5075}},
 ];
 const failures=[];
 for(const target of targets){
  // Existing regional returns use their real supported arrival rather than an
  // arbitrary100u point when its body lies outside the old valid ground.
  let point=target.point;
  if(target.id.startsWith('region:')){const arrival=api.homeworldWorldArrivalV77(target.id.slice(7));assert(arrival);point=arrival.actor;}
  const plan=api.homeworldUrbanWorldRouteV78(from,{levelId:target.levelId,point});
  if(plan.status!=='reachable'){failures.push(target.id);continue;}
  for(const segment of plan.segments.filter(s=>s.points))for(let i=1;i<segment.points.length;i++)assert(api.homeworldUrbanRouteSegmentV78(segment.levelId,segment.points[i-1],segment.points[i]),target.id);
 }
 assert.deepEqual(failures,[]);
});
