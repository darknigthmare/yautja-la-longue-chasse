import assert from 'node:assert/strict';
import {homeworldNavigatorV66} from './homeworld-navigation-browser-v66.mjs';

/** Reads real DOM coordinates and drives public keyboard input. There is no
 * React state setter, scene teleport, runtime replacement or progression grant. */
export function homeworldNavigatorV77(page,api,options={}){
 const base=homeworldNavigatorV66(page,{...api,HOMEWORLD_BUILDINGS:api.HOMEWORLD_BUILDINGS_V77},options),routes=[];
 const floor=()=>page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-level-v77');
 const elevation=async()=>Number(await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-elevation-v77'));
 const room=()=>page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-interior-id');
 async function connect(connectorId,reverse=false,{onSample}={}){
  const c=api.HOMEWORLD_CONNECTORS_V77.find(c=>c.id===connectorId);assert(c,'Existing physical connector');
  const a=reverse?c.to:c.from,b=reverse?c.from:c.to;
  assert.equal(await floor(),a.levelId);assert(!await room());
  const p=await base.position();assert(Math.hypot(p.x-a.point.x,p.y-a.point.y)<12,'Actor has walked to the actual flat landing');
  await base.release();await page.keyboard.press('KeyE');await base.tick(80);
  assert.equal(await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-transit-v77'),c.id,'Public interact started this connector');
  const samples=[];
  for(let t=0;t<c.duration*1000+160;t+=80){await base.tick(80);const sample={point:await base.position(),levelId:await floor(),elevation:await elevation(),elapsed:(t+80)/1000};samples.push(sample);if(onSample)await onSample(sample);if(!await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-transit-v77'))break;}
  assert.equal(await floor(),b.levelId);assert(Math.hypot((await base.position()).x-b.point.x,(await base.position()).y-b.point.y)<3);
  assert.equal(await elevation(),api.homeworldLevelV77(b.levelId).elevation);
  for(let i=1;i<samples.length;i++)assert(Math.hypot(samples[i].point.x-samples[i-1].point.x,samples[i].point.y-samples[i-1].point.y)<20,'Continuous movement, not a floor teleport');
  const result={kind:'physical-connector',connectorId,reverse,from:a,to:b,samples};routes.push(result);await base.focus();return result;
 }
 async function route(target){return api.homeworldWorldRouteV77({levelId:await floor(),point:await base.position()},target);}
 async function reach(target){
  if(await room())await base.exitRoom();await base.focus();const plan=await route(target);assert.equal(plan.status,'reachable','Actual multi-floor full-model route');
  for(const segment of plan.segments)if(segment.points){assert.equal(await floor(),segment.levelId);await base.follow(segment.points);}else await connect(segment.connectorId,segment.reverse);
  assert.equal(await floor(),target.levelId);assert(Math.hypot((await base.position()).x-target.point.x,(await base.position()).y-target.point.y)<12);
  routes.push({kind:'walk-route',target,segments:plan.segments.map(s=>s.connectorId?{connectorId:s.connectorId,reverse:s.reverse}:{levelId:s.levelId,distance:s.distance})});return plan;
 }
 async function enter(buildingId){
  const building=api.HOMEWORLD_BUILDINGS_V77.find(b=>b.id===buildingId);assert(building);
  await reach({levelId:building.levelId,point:api.homeworldBuildingDoorwayV64(building).approach});
  assert.equal(api.nearestHomeworldDoorV77(await floor(),await base.position())?.id,buildingId);
  await base.release();await page.keyboard.press('KeyE');await base.tick(96);assert.equal(await room(),buildingId);await base.focus();
 }
 async function openPoint(pointId){const interior=api.homeworldInteriorForPointV64(pointId);assert(interior,'Known local interior service');if(await room()!==interior.buildingId)await enter(interior.buildingId);await base.openPoint(pointId);}
 return{...base,position:base.position,floor,elevation,room,route,reach,connect,enter,openPoint,routes};
}
