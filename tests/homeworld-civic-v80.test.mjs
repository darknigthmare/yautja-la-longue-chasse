import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';

const api=homeworldQaModelV64(process.cwd(),[
 'homeworldCivicDecorV80.ts','homeworldCivicWorldV80.ts','homeworldCivicNeighborhoodsV80.ts',
 'homeworldWorldV77.ts','homeworldGeometryV64.ts','homeworldStreetModulesV78.ts',
 'homeworldUrbanPopulationV78.ts','homeworldUrbanNavigationV78.ts','homeworldLocationV77.ts',
 'homeworldInteriorsV64.ts','homeworldContextCodexV71.ts','homeworldCivicArchitectureV80.ts',
]);
const manifest=JSON.parse(fs.readFileSync('app/game/data/homeworldNativeDecorV80.json','utf8'));
const body={halfWidth:24,halfDepth:14};
const props=api.HOMEWORLD_CIVIC_PROPS_V80;
const center=polygon=>({x:polygon.reduce((sum,p)=>sum+p.x,0)/polygon.length,y:polygon.reduce((sum,p)=>sum+p.y,0)/polygon.length});

test('V80 new PNGs are independent unchanged alpha sources with painted native contacts and actual consumers',async()=>{
 assert.equal(manifest.schema,1);assert.equal(manifest.projection.yawDegrees,0);assert.equal(manifest.projection.pitchDegrees,35);
 assert.deepEqual(Object.keys(manifest.assets).sort(),['bench-left','corner-wall-left','maintenance-rack','clan-lectern-right','mineral-basin-right','amber-lamp-post','sealed-cargo-case-left','clan-banner-standard'].sort());
 for(const [id,a] of Object.entries(manifest.assets)){
  const bytes=fs.readFileSync('public'+a.src),hash=crypto.createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash,a.sha256,id);assert.equal(a.status,'MEASURED_NATIVE');
  assert.equal(a.measurementStatus,'VISUAL_NATIVE_SUPPORT_CONSERVATIVE_HULL_NOT_CANON_METROLOGY');
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,a.sourceWidth);assert.equal(info.height,a.sourceHeight);
  assert.deepEqual(a.sourceRect,{x:0,y:0,width:info.width,height:info.height});
  let left=info.width,top=info.height,right=-1,bottom=-1,transparent=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
   const alpha=data[(y*info.width+x)*4+3];if(alpha===0)transparent++;
   if(alpha>=128){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  }
  assert(transparent>info.width*info.height*.1,id+' is not an isolated alpha source');
  assert.deepEqual(a.alphaBounds,{x:left,y:top,width:right-left+1,height:bottom-top+1},id+' alpha metadata drift');
  assert(a.nativeGroundSupport.length>=3);assert(a.heightWorld>0&&a.heightWorld<=160);
  for(const p of a.nativeGroundSupport){
   assert(p.x>=0&&p.y>=0&&p.x<info.width&&p.y<info.height);
   let contact=false;
   // These painted supports are an explicit conservative visual estimate.
   // Accept only the existing 12-source-pixel measurement tolerance, never a
   // distant shadow/transparent rectangle or a newly invented physical base.
   for(let dy=-12;dy<=12&&!contact;dy++)for(let dx=-12;dx<=12;dx++){
    if(Math.hypot(dx,dy)>12)continue;const x=Math.round(p.x)+dx,y=Math.round(p.y)+dy;
    if(x>=0&&y>=0&&x<info.width&&y<info.height&&data[(y*info.width+x)*4+3]>=128){contact=true;break;}
   }
   assert(contact,id+' ground landmark is farther than 12px from substantial painted base');
  }
  assert([...props,...api.HOMEWORLD_URBAN_PROPS_V78].some(p=>p.artId===id||p.artId==='court-native-v80:'+id),id+' installed but never mounted in an actual civic/court consumer');
 }
});

test('V80 whole native solids partition the candidate set, keep all refusals and share paint/collision/codex geometry',()=>{
 const candidates=api.HOMEWORLD_CIVIC_CANDIDATES_V80,refusals=api.HOMEWORLD_CIVIC_REFUSALS_V80;
 const acceptedIds=new Set(props.map(p=>p.id)),refusedIds=new Set(refusals.map(p=>p.id));
 assert(props.length>=10);assert(refusals.length>0);assert.equal(acceptedIds.size,props.length);assert.equal(refusedIds.size,refusals.length);
 assert.equal(props.length+refusals.length,candidates.length);
 for(const c of candidates)assert(acceptedIds.has(c.id)!==refusedIds.has(c.id),c.id+' is lost or counted twice');
 assert(refusals.some(r=>r.reason.startsWith('reserved:')));assert(refusals.some(r=>r.reason.startsWith('old-volume:')));
 for(const p of props){
  assert.equal(candidates.find(c=>c.id===p.id),p,'do not resize or move rejected geometry to force a mount');
  assert.equal(p.interactive,false);assert.equal(p.solid,true);
  assert.equal(api.homeworldCivicRefusalV80(p,props.filter(other=>other!==p)),null,p.id);
  assert.equal(api.homeworldCivicFacadeObstructionV80(p),null,p.id+' is hidden behind an unrelated facade');
  const a=api.HOMEWORLD_CIVIC_ART_V80[p.artId],paint=api.homeworldCivicPaintV80(p),poly=paint.polygon;
  assert.equal(paint.width/a.sourceWidth,paint.height/a.sourceHeight);
  assert(Math.abs(paint.left+a.pivot.x*paint.scale-p.x)<1e-9);
  assert(Math.abs(paint.top+a.pivot.y*paint.scale-(p.y*manifest.projection.depthScale-api.homeworldLevelV77(p.levelId).elevation))<1e-9);
  const native=a.nativeGroundSupport.map(v=>({x:p.x+(v.x-a.pivot.x)*paint.scale,y:p.y+(v.y-a.pivot.y)*paint.scale/manifest.projection.depthScale}));
  for(const v of poly)assert(native.some(n=>Math.hypot(n.x-v.x,n.y-v.y)<1e-9),'hull corner must be a real native contact');
  for(let i=0;i<poly.length;i++){
   const a=poly[i],b=poly[(i+1)%poly.length];
   for(const contact of native)assert((b.x-a.x)*(contact.y-a.y)-(b.y-a.y)*(contact.x-a.x)>=-1e-8,'hull must enclose every contact, not cut through feet');
  }
  const c=center(poly);assert.equal(api.homeworldCivicCollisionV80(p.levelId,c,{halfWidth:0,halfDepth:0})?.id,p.id);
  assert(api.homeworldCivicCollisionV80(p.levelId,c,body));
  assert.equal(api.homeworldCivicWalkableV80(p.levelId,c,body),false);
  assert.equal(api.homeworldCivicTouchesV80(p,{x:c.x+1000,y:c.y+1000},body),false);
  const all=api.HOMEWORLD_ALL_ELEMENT_CODEX_V71.filter(r=>r.id===p.id);assert.equal(all.length,1);
  const record=all[0];assert.equal(record.asset,a.src);assert.deepEqual(record.footprint.polygon,poly);
  assert.equal(record.position.z,paint.elevation);assert.equal(record.door,null);assert.equal(record.lore,'original-adaptation');
  assert(record.source.some(s=>s.note.includes(a.sha256)));
 }
 assert.equal(api.HOMEWORLD_BUILDINGS_V77.length,43);assert.equal(api.HOMEWORLD_RESIDENTS_V77.length,98);
 assert.equal(api.HOMEWORLD_CONNECTORS_V77.length,7);assert.equal(api.HOMEWORLD_LEVELS_V77.length,6);
 assert.equal(new Set(api.HOMEWORLD_ALL_ELEMENT_CODEX_V71.map(r=>r.id)).size,api.HOMEWORLD_ALL_ELEMENT_CODEX_V71.length);
});

test('all 98 old full-body paths, 14 additional resident circuits, 43 door approaches and 14 connector landings stay clear of new solids',()=>{
 const failures=[];
 for(const r of [...api.HOMEWORLD_RESIDENTS_V77,...api.HOMEWORLD_URBAN_EXTRAS_V78])for(let s=1;s<r.path.length;s++){
  const a=r.path[s-1],b=r.path[s],count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)));
  const actualBody=r.interactive===false?{halfWidth:36,halfDepth:26}:body;
  for(let i=0;i<=count;i++){
   const point={x:a.x+(b.x-a.x)*i/count,y:a.y+(b.y-a.y)*i/count};
   if(!api.homeworldCivicWalkableV80(r.levelId,point,actualBody)){failures.push({id:r.id,point,collision:api.homeworldCivicCollisionV80(r.levelId,point,actualBody)});break;}
  }
 }
 for(const b of api.HOMEWORLD_BUILDINGS_V77){const p=api.homeworldBuildingDoorwayV64(b).approach;if(!api.homeworldCivicWalkableV80(b.levelId,p,body))failures.push({id:b.id,point:p});}
 for(const c of api.HOMEWORLD_CONNECTORS_V77)for(const side of[c.from,c.to])if(!api.homeworldCivicWalkableV80(side.levelId,side.point,body))failures.push({id:c.id,side});
 assert.deepEqual(failures,[]);
});

test('actual legacy motor stops against a V80 native solid and zero elapsed time preserves the exact actor',()=>{
 let observed=null;
 for(const p of props){const poly=api.homeworldCivicPolygonV80(p),c=center(poly),right=Math.max(...poly.map(v=>v.x));
  const start={...api.createHomeworldWorldActorV77(),x:right+body.halfWidth+30,y:c.y};
  if(!api.homeworldCivicWalkableV80(p.levelId,start))continue;
  const stopped=api.stepHomeworldCivicActorV80(start,{moveX:-1,climb:0,jumpPressed:false},0,p.levelId);assert.equal(stopped,start);
  let actor=start;for(let i=0;i<90;i++){const previous=actor;actor=api.stepHomeworldCivicActorV80(actor,{moveX:-1,climb:0,jumpPressed:false},1/60,p.levelId);assert.equal(actor.y,start.y);assert(Math.abs(actor.x-previous.x)<=330/60+1e-8);assert(api.homeworldCivicWalkableV80(p.levelId,actor));}
  if(actor.x>c.x&&actor.x<start.x-10){observed={p,actor};break;}
 }
 assert(observed,'motor must really move then stop, not start blocked or teleport');
 assert.equal(api.homeworldCivicCollisionV80(observed.p.levelId,observed.actor),null);
});

test('owner-scoped checkpoint contract stays version1/revision1 and a newly obstructed old exterior falls back without mutating the save',()=>{
 const p=props[0],point=center(api.homeworldCivicPolygonV80(p));assert(api.homeworldUrbanWalkableV78(p.levelId,point));
 const actor={...api.createHomeworldWorldActorV77(),...point},checkpoint=api.createHomeworldCheckpointV77('qa-owner',p.levelId,actor,null,actor),before=JSON.stringify(checkpoint);
 assert.equal(checkpoint.version,1);assert.equal(checkpoint.layoutRevision,1);
 const blocked=api.resolveHomeworldLocationV77(checkpoint,'qa-owner');assert.equal(blocked.restored,false);
 assert.deepEqual({x:blocked.actor.x,y:blocked.actor.y},api.HOMEWORLD_SPACEPORT_V77.spawn);
 assert.equal(JSON.stringify(checkpoint),before);assert.equal(api.resolveHomeworldLocationV77(checkpoint,'foreign-owner').restored,false);
 for(const b of api.HOMEWORLD_BUILDINGS_V77){
  const room=api.homeworldInteriorForBuildingV64(b.id),outside={...actor,...api.homeworldBuildingDoorwayV64(b).approach},inside={...actor,...room.spawn};
  const saved=api.createHomeworldCheckpointV77('qa-owner',b.levelId,inside,b.id,outside),raw=JSON.stringify(saved),restored=api.resolveHomeworldLocationV77(saved,'qa-owner');
  assert(restored.restored,b.id);assert.equal(restored.interiorId,b.id);assert.equal(JSON.stringify(saved),raw);
 }
});

test('every new native prop has a full-body reachable observation side from the real port, not a fixture teleport',()=>{
 const from={levelId:'0',point:api.HOMEWORLD_SPACEPORT_V77.spawn},failures=[];
 for(const p of props){const poly=api.homeworldCivicPolygonV80(p),c=center(poly);
  const spots=[{x:c.x,y:Math.max(...poly.map(v=>v.y))+60},{x:c.x,y:Math.min(...poly.map(v=>v.y))-60},
   {x:Math.max(...poly.map(v=>v.x))+70,y:c.y},{x:Math.min(...poly.map(v=>v.x))-70,y:c.y},
   ...[-120,0,120].flatMap(dx=>[-100,100].map(dy=>({x:c.x+dx,y:c.y+dy})))];
  const found=spots.filter(point=>api.homeworldCivicWalkableV80(p.levelId,point)).map(point=>api.homeworldUrbanWorldRouteV78(from,{levelId:p.levelId,point})).find(route=>route.status==='reachable');
  if(!found){failures.push(p.id);continue;}
  for(const segment of found.segments)if('points'in segment)for(let i=1;i<segment.points.length;i++)assert(api.homeworldUrbanRouteSegmentV78(segment.levelId,segment.points[i-1],segment.points[i]),p.id);
 }
 assert.deepEqual(failures,[]);
});

test('local neighborhood captions depend on the true floor and do not add campaign discovery or fake service IDs',()=>{
 for(const n of api.HOMEWORLD_CIVIC_NEIGHBORHOODS_V80){const caption=api.homeworldCivicNeighborhoodV80(n.levelId,n);assert.equal(caption.id,n.id);assert.equal(caption.label,n.label);assert(!('visitId'in caption));}
 assert.equal(api.homeworldCivicNeighborhoodV80('+2',{x:7340,y:5220}).id,'floor:+2');
});

test('43 architectural notes bind each real exterior threshold to its actual unchanged room and honestly distinguish frontal art',()=>{
 assert.equal(api.HOMEWORLD_CIVIC_ARCHITECTURE_V80.length,43);
 for(const plan of api.HOMEWORLD_CIVIC_ARCHITECTURE_V80){
  const building=api.HOMEWORLD_BUILDINGS_V77.find(b=>b.id===plan.buildingId),room=api.homeworldInteriorForBuildingV64(plan.buildingId);
  assert(building&&room);assert.equal(plan.levelId,building.levelId);assert.deepEqual(plan.doorway,api.homeworldBuildingDoorwayV64(building));
  assert.equal(plan.interior.width,room.width);assert.equal(plan.interior.depth,room.depth);assert.deepEqual(plan.interior.spawn,room.spawn);assert.deepEqual(plan.interior.exit,room.exit);
  assert.deepEqual(plan.civicFrontageIds,props.filter(p=>p.buildingId===building.id).map(p=>p.id));
  assert.equal(plan.nativeView,building.art.groundFrame?'MEASURED_NATIVE_OBLIQUE':'EXISTING_NATIVE_FRONTAL');
  const records=api.HOMEWORLD_ALL_ELEMENT_CODEX_V71.filter(r=>r.id==='civic-v80:building-context:'+building.id);assert.equal(records.length,1);
  assert.equal(records[0].door,null);assert.equal(records[0].asset,building.art.src);assert.equal(records[0].position.z,api.homeworldLevelV77(building.levelId).elevation);
  if(building.id==='throne-audience')assert(records[0].constraints.some(c=>c.includes('Palais monumental natif V81')&&c.includes('suites privées complètes')));
 }
});
