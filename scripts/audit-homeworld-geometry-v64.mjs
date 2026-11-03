import fs from 'node:fs';
import {createHash} from 'node:crypto';
import { build } from 'esbuild';
const load = async p => { const r = await build({entryPoints:[p],bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}); return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64')); };
const readHashes=()=>Object.fromEntries(['homeworldCity.ts','homeworldGeometryV64.ts','homeworldSpatialCodex.ts','homeworldArtV64.ts','homeworldInteriorsV64.ts'].map(file=>[file,createHash('sha256').update(fs.readFileSync('app/game/systems/'+file)).digest('hex')]));
const sourceHashes=readHashes();
const city = await load('app/game/systems/homeworldCity.ts'), atlas = await load('app/game/systems/homeworldSpatialCodex.ts');
const start = city.createHomeworldActor();
const goals = [...city.HOMEWORLD_BUILDINGS.map(b=>({id:b.id,kind:'door',...city.homeworldBuildingDoorPosition(b)})),
  ...Object.entries(city.HOMEWORLD_POINT_POSITIONS).filter(([id])=>id.startsWith('region-')).map(([id,p])=>({id,kind:'region',x:p.x,y:p.y+80})),
  {...city.HOMEWORLD_SPACEPORT_V64.terminal,id:'personal-ship',kind:'terminal',y:city.HOMEWORLD_SPACEPORT_V64.terminal.y+70}];
function walkRoute(route){
  if(route.status!=='reachable')return {passed:false,ticks:0};
  let actor={...start},ticks=0;
  for(let i=1;i<route.points.length;i++){
    const a=route.points[i-1],b=route.points[i],count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/24));
    for(let j=1;j<=count;j++){
      const goal={x:a.x+(b.x-a.x)*j/count,y:a.y+(b.y-a.y)*j/count};let reached=false;
      for(let tick=0;tick<160;tick++){
        const dx=goal.x-actor.x,dy=goal.y-actor.y;
        if(Math.hypot(dx,dy)<10){reached=true;break;}
        actor=city.stepHomeworldActor(actor,{moveX:Math.abs(dx)>4?Math.sign(dx):0,climb:Math.abs(dy)>4?Math.sign(dy):0,jumpPressed:false},1/60);ticks++;
        if(!city.isHomeworldWalkable(actor))return {passed:false,ticks,reason:'left-walkable-floor',actor};
      }
      if(!reached)return {passed:false,ticks,reason:'movement-stuck',goal,actor};
    }
  }
  const goal=route.points.at(-1),distance=Math.hypot(actor.x-goal.x,actor.y-goal.y);
  return {passed:distance<15,ticks,distance,final:{x:actor.x,y:actor.y}};
}
const routes = goals.map(goal => {
  const route=atlas.homeworldSpatialRoute(start,goal);
  const segmentsValid=route.points.slice(1).every((p,i)=>atlas.isHomeworldRouteSegmentWalkable(route.points[i],p));
  const result={...goal,walkable:city.isHomeworldWalkable(goal),status:route.status,segmentsValid,movement:walkRoute(route),distance:route.distance,points:route.points};
  console.log(JSON.stringify({id:goal.id,status:route.status,walkable:result.walkable})); return result;
});
const overlaps = (a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
const footprints=city.HOMEWORLD_BUILDINGS.map(b=>({id:b.id,...city.homeworldBuildingFootprintV64(b)}));
const intersections=[]; for(let i=0;i<footprints.length;i++)for(let j=i+1;j<footprints.length;j++)if(overlaps(footprints[i],footprints[j]))intersections.push([footprints[i].id,footprints[j].id]);
const propAudit=city.HOMEWORLD_PROPS.map(p=>{ const r={left:p.x-p.footprint.halfWidth,right:p.x+p.footprint.halfWidth,top:p.y-p.footprint.halfDepth*2,bottom:p.y}; return {id:p.id,footprint:r,buildingOverlaps:footprints.filter(f=>overlaps(r,f)).map(f=>f.id),onTerrain:city.isHomeworldTerrainWalkable({x:p.x,y:p.y-p.footprint.halfDepth},p.footprint)}; });
const sourceStable=JSON.stringify(sourceHashes)===JSON.stringify(readHashes());
const report={version:'V64',checkedAt:new Date().toISOString(),sourceHashes,sourceStable,method:'Actual A* routes on32-unit grid; every simplified segment samples the full actor footprint every4units, with12unit extra clearance away from endpoints. All54 routes also traverse using the real60fps digital movement integrator,24unit waypoint spacing, no position teleport.',status:sourceStable&&routes.every(r=>r.status==='reachable'&&r.walkable&&r.segmentsValid&&r.movement.passed)&&!intersections.length&&propAudit.every(p=>p.onTerrain&&!p.buildingOverlaps.length)?'PASS':'FAIL',world:city.HOMEWORLD_WORLD,projection:city.HOMEWORLD_GEOMETRY_V64,start,routes,footprints,intersections,props:propAudit};
fs.writeFileSync('docs/v64-homeworld-geometry-qa.json',JSON.stringify(report,null,2)+'\n'); console.log(JSON.stringify({result:report.status,failed:routes.filter(r=>r.status!=='reachable').map(r=>r.id),props:propAudit.filter(p=>!p.onTerrain||p.buildingOverlaps.length),intersections}));
process.exitCode=report.status==='PASS'?0:1;
