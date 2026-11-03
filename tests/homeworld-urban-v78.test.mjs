import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
const api=homeworldQaModelV64(process.cwd(),['homeworldWorldV77.ts','homeworldGeometryV64.ts','homeworldIdentityV72.ts','homeworldUrbanLayoutV78.ts','homeworldStreetModulesV78.ts','homeworldUrbanPopulationV78.ts','homeworldUrbanNavigationV78.ts','homeworldUrbanFacadesV78.ts','homeworldUrbanCodexV78.ts','homeworldAuthoredLotsV81.ts','homeworldCity.ts']);
const body={halfWidth:24,halfDepth:14};
const npcAdditions=JSON.parse(readFileSync('app/game/data/homeworldNpcAdditionsV84.json','utf8'));
test('authored V81 court density preserves whole native assets and every refused candidate',()=>{
 assert.equal(api.HOMEWORLD_BUILDINGS_V77.length,43);assert.equal(api.HOMEWORLD_RESIDENTS_V77.length,98);
 assert.equal(api.HOMEWORLD_URBAN_PROP_CANDIDATES_V78.length,api.HOMEWORLD_AUTHORED_COURTS_V81.reduce((n,c)=>n+c.props.length,0));
 assert(api.HOMEWORLD_URBAN_PROPS_V78.length>14);assert(api.HOMEWORLD_URBAN_PROP_REJECTIONS_V78.length>0);
 const acceptedIds=new Set(api.HOMEWORLD_URBAN_PROPS_V78.map(p=>p.id)),refusedIds=new Set(api.HOMEWORLD_URBAN_PROP_REJECTIONS_V78.map(p=>p.id));
 assert.equal(acceptedIds.size+refusedIds.size,api.HOMEWORLD_URBAN_PROP_CANDIDATES_V78.length);
 for(const p of api.HOMEWORLD_URBAN_PROP_CANDIDATES_V78)assert(acceptedIds.has(p.id)!==refusedIds.has(p.id),p.id);
 assert(new Set(api.HOMEWORLD_AUTHORED_COURTS_V81.map(c=>c.composition)).size>=10);
 for(const p of api.HOMEWORLD_URBAN_PROPS_V78){
  const original=api.HOMEWORLD_URBAN_PROP_CANDIDATES_V78.find(c=>c.id===p.id);
  const historical=api.HOMEWORLD_URBAN_LEGACY_PROPS_V78.find(c=>c.id===p.id);
  assert.equal(historical.scale,original.scale,'the original V78 source/size remains preserved');
  assert.equal(p.x,historical.x);assert.equal(p.y,historical.y);assert.equal(p.levelId,historical.levelId);
  const revision=api.HOMEWORLD_COURT_REVISIONS_V80.find(r=>r.id===p.id);
  if(revision){assert.equal(p.artId,revision.toArtId);assert.equal(historical.artId,revision.fromArtId);assert.equal(p.scale,1,'new source uses its complete authored native scale');}
  else{assert.equal(p.artId,historical.artId);assert.equal(p.scale,historical.scale);}
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
test('all 18 original courtyard and V84 attendant candidates retain their personas, with 16 safe routines and both explicit refusals',()=>{
 assert.equal(npcAdditions.urban.length,4);
 assert.equal(api.HOMEWORLD_URBAN_EXTRA_CANDIDATES_V78.filter(r=>r.id.startsWith('urban-v78:extra:')).length,14);
 assert.equal(api.HOMEWORLD_URBAN_EXTRA_CANDIDATES_V78.length,14+npcAdditions.urban.length);
 assert.equal(api.HOMEWORLD_URBAN_EXTRAS_V78.length,16);
 assert.deepEqual(api.HOMEWORLD_URBAN_EXTRA_REJECTIONS_V78,[
  {id:'urban-v78:extra:lower-1',reason:'urban-v78:lower-work-north:pending-facade'},
  {id:'urban-v78:extra:lower-4',reason:'urban-v78:lower-halt-west:pending-facade'},
 ]);
 const admitted=new Set(api.HOMEWORLD_URBAN_EXTRAS_V78.map(r=>r.id)),refused=new Set(api.HOMEWORLD_URBAN_EXTRA_REJECTIONS_V78.map(r=>r.id));
 assert.equal(admitted.size+refused.size,api.HOMEWORLD_URBAN_EXTRA_CANDIDATES_V78.length);
 for(const candidate of api.HOMEWORLD_URBAN_EXTRA_CANDIDATES_V78)assert(admitted.has(candidate.id)!==refused.has(candidate.id),candidate.id+' must be admitted or explicitly refused');
 for(const rejection of api.HOMEWORLD_URBAN_EXTRA_REJECTIONS_V78){
  const candidate=api.HOMEWORLD_URBAN_EXTRA_CANDIDATES_V78.find(r=>r.id===rejection.id),reserve=api.HOMEWORLD_URBAN_RESERVES_V78.find(r=>r.id===rejection.reason);
  assert(candidate&&reserve);assert.equal(candidate.levelId,reserve.levelId);
  assert(api.homeworldUrbanOverlapV78(api.homeworldUrbanCorridorV78(candidate.path[0],candidate.path.at(-1),36,26),reserve.polygon),rejection.id+' refusal protects its actual occupied native parcel');
 }
 for(const seed of npcAdditions.urban){
  const resident=api.HOMEWORLD_URBAN_EXTRAS_V78.find(r=>r.id===seed.id);
  assert(resident,seed.id+' source attendant remains present');
  assert.equal(resident.levelId,seed.levelId);assert.deepEqual(resident.path,seed.path);
  assert.equal(api.homeworldUrbanExtraRoleV78(resident),seed.fallbackRole);
 }
 const oldIds=new Set(api.HOMEWORLD_RESIDENTS_V77.map(r=>r.id));
 for(const r of api.HOMEWORLD_URBAN_EXTRAS_V78){
  assert(oldIds.has(r.sourceResidentId));assert(!oldIds.has(r.id));
  assert.equal(r.interactive,false);assert.equal(r.saveVisit,false);assert.equal(r.solid,false);
  const source=api.HOMEWORLD_RESIDENTS_V77.find(s=>s.id===r.sourceResidentId);
  assert.equal(api.homeworldUrbanExtraRoleV78(r),api.homeworldResidentRoleV72(source));
  for(let t=0;t<=60;t+=.25){const p=api.homeworldResidentPoseV77(r,t);assert(api.homeworldUrbanWalkableV78(r.levelId,p,{halfWidth:36,halfDepth:26}));}
 }
 assert.equal(api.HOMEWORLD_RESIDENTS_V77.length,98);
 assert.equal(new Set(api.HOMEWORLD_URBAN_EXTRA_CANDIDATES_V78.filter(r=>r.levelId==='-1A').map(r=>api.homeworldUrbanExtraRoleV78(r))).size,5);
 for(const r of api.HOMEWORLD_RESIDENTS_V77)assert.equal(api.homeworldUrbanExtraRoleV78(r),api.homeworldResidentRoleV72(r));
});
test('eight measured native oblique facades fit their lots and an adult; no fake interactive door is added',()=>{
 assert.equal(api.HOMEWORLD_URBAN_LOTS_V78.length,8);
 assert.equal(api.HOMEWORLD_URBAN_FACADES_V78.length,8);
 for(const [i,lot] of api.HOMEWORLD_URBAN_LOTS_V78.entries()){
  assert.equal(lot.interactive,false);assert.equal(lot.artStatus,'MEASURED_NATIVE_OBLIQUE_REUSE_V83');
  const facade=api.HOMEWORLD_URBAN_FACADES_V78[i],placement=api.homeworldUrbanFacadePlacementV78(facade);
  assert.equal(facade.interactive,false);assert.equal(facade.nativeStatus,'MEASURED_NATIVE_OBLIQUE_REUSE_V83');
  assert.equal(facade.targetNativeStatus,'DEDICATED_DISTRICT_VARIANTS_STILL_REQUIRED');
  assert.equal(facade.provenance,'LORE_COMPATIBLE_ORIGINAL');assert(facade.art.groundFrame,'measured oblique source required');
  assert(placement.paintedDoorHeight>=128);assert(placement.paintedDoorWidth>=80);
  assert(Math.abs(placement.width/placement.sourceWidth-placement.height/placement.sourceHeight)<1e-12);
  assert(placement.footprint.every(p=>p.x>=lot.bounds.left&&p.x<=lot.bounds.right&&p.y>=lot.bounds.top&&p.y<=lot.bounds.bottom));
  for(let side=0;side<placement.footprint.length;side++){
   const from=placement.footprint[side],to=placement.footprint[(side+1)%placement.footprint.length],samples=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/8));
   for(let i=0;i<=samples;i++)assert(api.homeworldUrbanTerrainV78(facade.levelId,{x:from.x+(to.x-from.x)*i/samples,y:from.y+(to.y-from.y)*i/samples},{halfWidth:0,halfDepth:0}),facade.id+' full native foundation edge stays supported on its floor');
  }
  for(let x=lot.bounds.left;x<=lot.bounds.right;x+=16)for(let y=lot.bounds.top;y<=lot.bounds.bottom;y+=16){
   const point={x,y};if(api.pointInHomeworldPolygon(point,placement.footprint))assert(api.homeworldUrbanTerrainV78(facade.levelId,point,{halfWidth:0,halfDepth:0}),facade.id+' full foundation interior stays supported');
  }
  const point={x:placement.footprint.reduce((sum,p)=>sum+p.x,0)/placement.footprint.length,y:placement.footprint.reduce((sum,p)=>sum+p.y,0)/placement.footprint.length};
  assert.equal(api.homeworldUrbanCollisionV78(lot.levelId,point,body)?.id,facade.id);
  assert.equal(api.nearestHomeworldDoorV77(lot.levelId,point),null);
  for(const reserve of api.HOMEWORLD_URBAN_RESERVES_V78.filter(r=>r.levelId===facade.levelId&&!r.id.endsWith(':pending-facade')))
   assert.equal(api.homeworldUrbanOverlapV78(placement.footprint,reserve.polygon),false,facade.id+' overlaps '+reserve.id);
  for(const other of api.HOMEWORLD_URBAN_FACADES_V78.filter(f=>f!==facade))assert.equal(api.homeworldUrbanOverlapV78(placement.footprint,api.homeworldUrbanFacadePlacementV78(other).footprint),false);
 }
});
test('urban codex records cover every actual floor, measured solid and honestly pending dedicated art',()=>{
 const records=api.HOMEWORLD_URBAN_CODEX_V78;
 assert(records.length>60);assert.equal(new Set(records.map(r=>r.id)).size,records.length);
 for(const facade of api.HOMEWORLD_URBAN_FACADES_V78){
  const record=records.find(r=>r.id===facade.id),paint=api.homeworldUrbanFacadePlacementV78(facade);
  assert.equal(record.category,'building');assert.equal(record.door,null);assert.equal(record.asset,facade.art.src);
  assert.deepEqual(record.footprint.polygon,paint.footprint);assert.equal(record.position.z,paint.elevation);
  assert.equal(record.dimensions.width,facade.footprint.width);assert.equal(record.dimensions.depth,facade.footprint.depth);
  assert.equal(record.dimensions.height,facade.wallHeight);assert(record.source[0].note.includes(facade.art.sha256));
  assert(record.source[0].note.includes(facade.sourceBuildingId));
  assert(record.constraints.some(c=>c.includes('aucune reproduction canonique1:1 ou variante dédiée produite affirmée')));
  assert(record.constraints.some(c=>c.includes('non vérifié')));
 }
 for(const lot of api.HOMEWORLD_URBAN_LOTS_V78){
  const record=records.find(r=>r.id===lot.id);
  assert.equal(record.asset,null);assert.equal(record.footprint,null);assert.equal(record.category,'panel');
  assert(record.constraints.some(c=>c.includes(lot.id+':facade')));
  assert(record.constraints.some(c=>c.includes('variantes de district dédiées restent à produire')));
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
