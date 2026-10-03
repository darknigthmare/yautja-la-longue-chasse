import test from 'node:test';import assert from 'node:assert/strict';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
const api=homeworldQaModelV64(process.cwd(),['homeworldWorldV77.ts','homeworldNavigationV77.ts','homeworldGeometryV64.ts']);const world=api,nav=api,geo=api;
test('seven real multi-level routes from the east port, sampled against full body collision',()=>{
 const from={levelId:'0',point:world.HOMEWORLD_SPACEPORT_V77.spawn},report=[];
 for(const c of world.HOMEWORLD_CONNECTORS_V77){const result=nav.homeworldWorldRouteV77(from,c.to);report.push({id:c.id,status:result.status,segments:result.segments.map(s=>s.connectorId?{connector:s.connectorId,reverse:s.reverse}:{level:s.levelId,distance:s.distance,points:s.points.length})});
  if(result.status==='reachable')for(const s of result.segments)if(s.points)for(let i=1;i<s.points.length;i++)assert(nav.homeworldRouteSegmentV77(s.levelId,s.points[i-1],s.points[i]));
 }assert.deepEqual(report.filter(r=>r.status!=='reachable'),[]);
});
test('all preserved doors and ten existing region return routes reachable without floor teleport',()=>{
 const from={levelId:'0',point:world.HOMEWORLD_SPACEPORT_V77.spawn},report=[];
 for(const b of world.HOMEWORLD_BUILDINGS_V77){const target={levelId:b.levelId,point:geo.homeworldBuildingDoorwayV64(b).approach},result=nav.homeworldWorldRouteV77(from,target);report.push({id:b.id,level:b.levelId,status:result.status});}
 for(const p of world.HOMEWORLD_POINTS_V77.filter(p=>p.regionId)){const arrival=world.homeworldWorldArrivalV77(p.regionId),result=nav.homeworldWorldRouteV77(from,{levelId:arrival.levelId,point:arrival.actor});report.push({id:p.regionId,level:arrival.levelId,status:result.status});}
 assert.deepEqual(report.filter(r=>r.status!=='reachable'),[]);
});
