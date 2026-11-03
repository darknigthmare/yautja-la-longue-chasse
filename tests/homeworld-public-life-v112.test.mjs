import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const api=homeworldQaModelV64(process.cwd(),['homeworldPublicLifeV112.ts','homeworldCivicWorldV80.ts','homeworldWorldV77.ts','homeworldGeometryV64.ts','homeworldUrbanPopulationV78.ts','homeworldResidentVisibilityV100.ts','homeworldCivilianMotionV74.ts']);
const inhabitants=api.HOMEWORLD_PUBLIC_LIFE_V112,body={halfWidth:36,halfDepth:26};
const expectedIds=['causeway-return','causeway-maintenance','causeway-relay','quay-approach','rampart-watch','marsh-watch','reserve-viaduct'].map(id=>'public-life-v112:'+id);
const close=(actual,expected)=>assert(Math.abs(actual-expected)<1e-8,`${actual} differs from ${expected}`);

test('V112 seven short public-link circuits have supported visible full bodies without moving existing citizens or operation sockets',()=>{
 assert.deepEqual(inhabitants.map(r=>r.id),expectedIds);assert.deepEqual(api.HOMEWORLD_PUBLIC_LIFE_REFUSALS_V112,[]);
 assert.equal(api.HOMEWORLD_RESIDENTS_V77.length,98);assert.equal(api.HOMEWORLD_URBAN_EXTRAS_V78.length,16);
 assert.deepEqual(api.HOMEWORLD_PUBLIC_LIFE_BODY_V112,body);
 for(const r of inhabitants)for(let s=1;s<r.path.length;s++){
  const a=r.path[s-1],b=r.path[s],count=Math.ceil(Math.hypot(a.x-b.x,a.y-b.y));
  for(let i=0;i<=count;i++){
   const p={x:a.x+(b.x-a.x)*i/count,y:a.y+(b.y-a.y)*i/count};
   assert(api.homeworldCivicWalkableV80(r.levelId,p,body),r.id+' '+JSON.stringify(p));
   assert.equal(api.homeworldResidentOccludedV100(r.levelId,p),false,r.id+' must not fill a gap behind an opaque facade');
  }
 }
 for(const observation of api.HOMEWORLD_PUBLIC_LIFE_OBSERVATIONS_V112){
  assert(observation.samples>=91);assert(observation.minimumExistingRouteDistance>=250,observation.id);
  assert(observation.minimumProtectedPointDistance>200,observation.id);
 }
});

test('V112 the existing motor can actually traverse each complete circuit in both directions with its unchanged body',()=>{
 for(const r of inhabitants){
  const a=r.path[0],b=r.path.at(-1);
  for(const[start,end]of[[a,b],[b,a]]){
   let actor={...start,vx:0,vy:0,facing:1,grounded:true},travelled=0,steps=0;
   while(Math.hypot(end.x-actor.x,end.y-actor.y)>3&&steps++<1000){
    const dx=end.x-actor.x,dy=end.y-actor.y;
    const input={moveX:dx/260,climb:dy/156,jumpPressed:false};
    const magnitude=Math.max(Math.abs(input.moveX),Math.abs(input.climb),1);
    input.moveX/=magnitude;input.climb/=magnitude;
    const before=actor;actor=api.stepHomeworldCivicActorV80(actor,input,1/30,r.levelId);
    const delta=Math.hypot(actor.x-before.x,actor.y-before.y);assert(delta<10,r.id+' discontinuous movement');travelled+=delta;
    assert(api.homeworldCivicWalkableV80(r.levelId,actor),r.id+' real motor must keep terrain/collision');
   }
   assert(steps<1000,r.id+' stalled');assert(travelled>175,r.id+' did not physically walk its full path');
   const frozen=api.stepHomeworldCivicActorV80(actor,{moveX:1,climb:1,jumpPressed:false},0,r.levelId);assert.equal(frozen,actor);
  }
 }
});

test('V112 placement rejects unsupported routes, existing routes, source operations, bad data and duplicates instead of manufacturing support',()=>{
 const first=inhabitants[0],compile=(path,extra={})=>api.compileHomeworldPublicLifeV112([{...first,path,...extra}]);
 assert.equal(compile([{x:-500,y:-500},{x:-400,y:-500}]).refusals[0].reason,'unsupported-or-obstructed-full-body');
 assert.equal(compile([{x:7520,y:5350},{x:7540,y:5350}]).refusals[0].reason,'protected-approach:archive-v106:supports:1:stand');
 const existing=api.HOMEWORLD_RESIDENTS_V77.find(r=>r.levelId==='0'&&r.path.length>1&&Math.hypot(r.path[0].x-r.path.at(-1).x,r.path[0].y-r.path.at(-1).y)>1);
 const refused=compile(existing.path,{levelId:existing.levelId});assert.equal(refused.accepted.length,0);assert(refused.refusals[0].reason);
 for(const extra of[{speed:0},{speed:Infinity},{civilianRole:'invented-role'},{levelId:'+99'}])assert.equal(compile(first.path,extra).refusals[0].reason,'invalid-route');
 assert.equal(compile([{x:NaN,y:1},{x:2,y:1}]).refusals[0].reason,'invalid-route');
 assert.equal(compile([{x:4350,y:5480},{x:4851,y:5480}]).refusals[0].reason,'invalid-segment-length');
 const duplicate=api.compileHomeworldPublicLifeV112([first,first]);assert.equal(duplicate.accepted.length,1);assert.deepEqual(duplicate.refusals,[{id:first.id,reason:'duplicate-id'}]);
});

test('V112 city-time poses remain continuous and deterministic, holding a real native drawing at both halts',()=>{
 for(const r of inhabitants){
  const before=JSON.stringify(r),phases=new Set(),facings=new Set();let prior;
  for(let seconds=0;seconds<=180;seconds+=.1){
   const pose=api.homeworldPublicLifePoseV112(r,seconds);phases.add(pose.phase);facings.add(pose.facing);
   if(prior)assert(Math.hypot(pose.x-prior.x,pose.y-prior.y)<=r.speed*.1+1e-6,r.id+' teleported at a halt or turn');prior=pose;
   assert.deepEqual(api.homeworldPublicLifePoseV112(r,seconds),pose,r.id+' city pause must be exact');
   if(!pose.moving&&pose.dwellRemainingSeconds>.3){
    const next=api.homeworldPublicLifePaintV112(r,seconds+.2),paint=api.homeworldPublicLifePaintV112(r,seconds);
    assert.deepEqual(next.pose,api.homeworldPublicLifePoseV112(r,seconds+.2));
    assert.equal(next.native.index,paint.native.index);assert.deepEqual(next.foot,paint.foot);
   }
  }
  assert.deepEqual([...phases].sort(),['end-halt','outbound','return','start-halt']);assert.deepEqual([...facings].sort(),[-1,1]);assert.equal(JSON.stringify(r),before);
  assert.deepEqual(api.homeworldPublicLifePoseV112(r,NaN),api.homeworldPublicLifePoseV112(r,0));
 }
});

test('V112 paint uses unchanged real left/right atlas bytes, native foot pivots, uniform scale and the correct floor elevation',()=>{
 const sources=new Map();
 for(const r of inhabitants)for(let seconds=0;seconds<100;seconds+=.7){
  const p=api.homeworldPublicLifePaintV112(r,seconds),f=p.native.frame,s=p.native.source,scale=p.native.scale;
  sources.set(s.src,s);assert(api.HOMEWORLD_CIVILIAN_MOTION_V74.roles[r.civilianRole].clips[p.native.clip].some(frame=>frame.rgbaWindowSha256===f.rgbaWindowSha256));
  assert.equal(p.native.clip,p.pose.facing===1?'right':'left');close(p.width/f.sourceRect.width,p.height/f.sourceRect.height);
  close(p.sourceLeft+f.pivot.x*scale,0);close(p.sourceTop+f.pivot.y*scale,0);
  const projected=api.homeworldProjectGroundV64(p.pose,api.homeworldLevelV77(r.levelId).elevation);assert.deepEqual(p.foot,projected);
  const reduced=api.homeworldPublicLifePaintV112(r,seconds,true);assert.deepEqual(reduced.pose,p.pose);assert.deepEqual(reduced.foot,p.foot);assert.equal(reduced.native.index,0);
 }
 assert.equal(sources.size,3);
 for(const[source,manifest]of sources){const bytes=fs.readFileSync('public'+source);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),manifest.sha256,source);}
});

test('V112 real React layer paints only the active physical floor, complete source pivots and no synthetic mirrors or service controls',()=>{
 const ssr=homeworldSceneSsrV78(),component='app/game/HomeworldPublicLifeV112.tsx';
 const wide={x:0,y:0,viewWidth:10400,viewHeight:6400};
 const ground=ssr.render(component,{levelId:'0',camera:wide,seconds:32});
 assert.equal((ground.match(/data-homeworld-public-life-v112=/g)??[]).length,6);
 assert(!ground.includes('public-life-v112:reserve-viaduct'));assert(!ground.includes('scaleX('));assert(!ground.includes('<button'));assert(!ground.includes('tabindex'));
 for(const r of inhabitants.filter(r=>r.levelId==='0'))assert(ground.includes(`data-homeworld-public-life-v112="${r.id}"`));
 const upper=ssr.render(component,{levelId:'+1',camera:wide,seconds:32});assert.equal((upper.match(/data-homeworld-public-life-v112=/g)??[]).length,1);assert(upper.includes('public-life-v112:reserve-viaduct'));
 assert.equal(ssr.render(component,{levelId:'-1A',camera:wide,seconds:32}),'');
 assert.equal(ssr.render(component,{levelId:'0',camera:{x:-2000,y:-2000,viewWidth:390,viewHeight:400},seconds:32}),'');
 const r=inhabitants[0],p=api.homeworldPublicLifePaintV112(r,32),camera={x:p.bounds.left+p.bounds.width+180,y:p.bounds.top,viewWidth:10,viewHeight:100};
 assert(api.homeworldPublicLifeVisibleV112(p.bounds,camera));assert(!api.homeworldPublicLifeVisibleV112(p.bounds,{...camera,x:camera.x+.1}));
 const transit={connectorId:'council-stair',elapsed:0,reverse:false};
 const crossing=ssr.render(component,{levelId:'0',camera:wide,seconds:32,transit});assert.equal((crossing.match(/data-homeworld-public-life-v112=/g)??[]).length,7);
});
