import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {homeworldSceneSsrV78} from '../tests/helpers/homeworld-scene-ssr-v78.mjs';

/** Bounded flood fill of the actual floor union. Enclosed unsupported
 * components are measured independently of the authored replacement joints;
 * outer edge-connected relief is never a candidate for automatic filling. */
export function scanHomeworldGroundJointsV112(grounds,contains,bounds) {
  const {left,right,top,bottom,step}=bounds,width=(right-left)/step,height=(bottom-top)/step;
  const regions=grounds.filter(g=>g.levelId==='0').map(g=>({...g,
    left:Math.min(...g.polygon.map(p=>p.x)),right:Math.max(...g.polygon.map(p=>p.x)),
    top:Math.min(...g.polygon.map(p=>p.y)),bottom:Math.max(...g.polygon.map(p=>p.y)),
  })).filter(g=>g.right>=left&&g.left<=right&&g.bottom>=top&&g.top<=bottom);
  const mask=new Uint8Array(width*height);
  for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
    const p={x:left+(x+.5)*step,y:top+(y+.5)*step};
    if(regions.some(g=>p.x>=g.left&&p.x<=g.right&&p.y>=g.top&&p.y<=g.bottom&&contains(p,g.polygon)))mask[y*width+x]=1;
  }
  const enclosed=[];let exteriorSamples=0;
  for (let index=0;index<mask.length;index++) if(mask[index]===0) {
    let samples=0,minX=width,maxX=0,minY=height,maxY=0,exterior=false;
    const queue=[index];mask[index]=2;
    for(let n=0;n<queue.length;n++){
      const id=queue[n],x=id%width,y=Math.floor(id/width);samples++;
      minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      if(x===0||x===width-1||y===0||y===height-1)exterior=true;
      for(const [nx,ny]of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
        const next=ny*width+nx;
        if(nx>=0&&nx<width&&ny>=0&&ny<height&&mask[next]===0){mask[next]=2;queue.push(next);}
      }
    }
    if(exterior)exteriorSamples+=samples;
    else enclosed.push({samples,area:samples*step*step,left:left+minX*step,right:left+(maxX+1)*step,top:top+minY*step,bottom:top+(maxY+1)*step});
  }
  return{enclosed,exteriorSamples};
}

/** Read-only scan of the actual compiled TypeScript model. The before view
 * removes only V112 plinth polygons; it does not move or replace a facade. */
export function auditHomeworldSpatialV112(root=process.cwd()) {
  const qa=homeworldSceneSsrV78(root),load=name=>qa.load('app/game/systems/'+name+'.ts');
  const world=load('homeworldWorldV77'),geometry=load('homeworldGeometryV64');
  const urban=load('homeworldUrbanLayoutV78'),city=load('homeworldCity');
  const facades=load('homeworldUrbanFacadesV78'),places=load('homeworldPublicPlacesV112');
  load('homeworldPublicPlacesMountV112');
  const support=load('homeworldFoundationSupportsV112');
  const joins=load('homeworldGroundJointsV112');
  const buildings=[...world.HOMEWORLD_BUILDINGS_V77,...facades.HOMEWORLD_URBAN_FACADES_V78];
  const grounds=[...world.HOMEWORLD_GROUND_V77,...world.HOMEWORLD_CONNECTOR_PADS_V82,...urban.HOMEWORLD_URBAN_GROUND_V78];
  const prior=grounds.filter(ground=>!ground.id.startsWith('foundation-v112:'));
  const supported=(items,levelId,point)=>items.some(ground=>ground.levelId===levelId&&city.pointInHomeworldPolygon(point,ground.polygon));
  let samples=0;
  const before=[],after=[],overlaps=[],plinthOverlaps=[];
  for (const building of buildings) {
    const polygon=geometry.homeworldBuildingGroundFrameV76(building).polygon;
    const missingBefore=[],missingAfter=[];
    for (let i=0;i<polygon.length;i++) {
      const a=polygon[i],b=polygon[(i+1)%polygon.length],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/4));
      for (let step=0;step<=steps;step++) {
        const point={x:a.x+(b.x-a.x)*step/steps,y:a.y+(b.y-a.y)*step/steps};
        samples++;
        if (!supported(prior,building.levelId,point)) missingBefore.push(point);
        if (!supported(grounds,building.levelId,point)) missingAfter.push(point);
      }
    }
    if (missingBefore.length) before.push({id:building.id,levelId:building.levelId,unsupportedSamples:missingBefore.length,first:missingBefore[0]});
    if (missingAfter.length) after.push({id:building.id,levelId:building.levelId,unsupportedSamples:missingAfter.length,first:missingAfter[0]});
    for (const other of buildings) {
      if (other===building) break;
      if (building.levelId===other.levelId&&urban.homeworldUrbanOverlapV78(polygon,geometry.homeworldBuildingGroundFrameV76(other).polygon)) overlaps.push([building.id,other.id]);
    }
  }
  const plinths=support.homeworldFoundationSupportsV112(world.HOMEWORLD_BUILDINGS_V77);
  for (const plinth of plinths) for (const building of buildings) {
    if (building.id!==plinth.buildingId&&building.levelId===plinth.levelId&&urban.homeworldUrbanOverlapV78(plinth.polygon,geometry.homeworldBuildingGroundFrameV76(building).polygon)) plinthOverlaps.push([plinth.id,building.id]);
  }
  const natural=load('homeworldNaturalPlacementsV80'),activeNatural=load('homeworldNaturalPlacementsV112'),outskirts=load('homeworldOutskirtsV71');
  const naturalPublicOverlap=natural.HOMEWORLD_NATURAL_MODULES_V80.flatMap(item=>{
    const box=outskirts.homeworldOutskirtsFootprintV71(item),polygon=urban.homeworldUrbanRectV78(box.left,box.top,box.right,box.bottom);
    const conflicts=grounds.filter(ground=>ground.levelId==='0'&&urban.homeworldUrbanOverlapV78(polygon,ground.polygon));
    return conflicts.length?[{id:item.id,artId:item.artId,x:item.x,y:item.y,groundIds:conflicts.map(ground=>ground.id)}]:[];
  });
  const activeNaturalOverlap=activeNatural.HOMEWORLD_NATURAL_MODULES_V112.flatMap(item=>{
    const box=outskirts.homeworldOutskirtsFootprintV71(item),polygon=urban.homeworldUrbanRectV78(box.left,box.top,box.right,box.bottom);
    const conflicts=grounds.filter(ground=>ground.levelId==='0'&&urban.homeworldUrbanOverlapV78(polygon,ground.polygon));
    return conflicts.length?[{id:item.id,groundIds:conflicts.map(ground=>ground.id)}]:[];
  });
  const jointIds=new Set(joins.HOMEWORLD_GROUND_JOINTS_V112.map(g=>g.id));
  const beforeJoints=grounds.filter(g=>!jointIds.has(g.id));
  const localBefore=scanHomeworldGroundJointsV112(beforeJoints,city.pointInHomeworldPolygon,joins.HOMEWORLD_GROUND_JOINT_SCAN_V112);
  const localAfter=scanHomeworldGroundJointsV112(grounds,city.pointInHomeworldPolygon,joins.HOMEWORLD_GROUND_JOINT_SCAN_V112);
  const area=polygon=>Math.abs(polygon.reduce((sum,p,i)=>{const b=polygon[(i+1)%polygon.length];return sum+p.x*b.y-b.x*p.y;},0))/2;
  return {
    schemaVersion:1,release:'V112',method:'Actual retained facade contacts sampled every four world units; before excludes only foundation-v112 polygons. Geometry/model evidence, not pixel or browser QA.',
    buildings:buildings.length,interactiveBuildings:world.HOMEWORLD_BUILDINGS_V77.length,closedFacades:facades.HOMEWORLD_URBAN_FACADES_V78.length,
    edgeSamples:samples,unsupportedBefore:before,unsupportedAfter:after,
    foundationOverlaps:overlaps,addedPlinths:plinths.map(item=>({id:item.id,buildingId:item.buildingId,levelId:item.levelId,polygon:item.polygon})),
    addedPlinthOverlapsWithOtherBuildings:plinthOverlaps,
    groundJoints:{method:'Unit grid of all immediate mausoleum/promenade floor contacts. Before removes only the two V112 joints; exterior edge-connected relief is preserved.',
      bounds:joins.HOMEWORLD_GROUND_JOINT_SCAN_V112,before:localBefore,after:localAfter,
      added:joins.HOMEWORLD_GROUND_JOINTS_V112.map(g=>({id:g.id,levelId:g.levelId,sourceIds:g.sourceIds,witness:g.witness,polygon:g.polygon,area:area(g.polygon),
        witnessBefore:supported(beforeJoints,g.levelId,g.witness),witnessAfter:supported(grounds,g.levelId,g.witness)}))},
    furniture:{candidates:places.HOMEWORLD_PUBLIC_PLACE_CANDIDATES_V112.length,
      admitted:places.HOMEWORLD_PUBLIC_PLACES_V112.map(item=>({id:item.id,artId:item.artId,levelId:item.levelId,x:item.x,y:item.y})),
      refused:places.HOMEWORLD_PUBLIC_PLACE_REFUSALS_V112,
      newNativeImages:0,services:0},
    naturalPlacementFollowup:{status:'VALIDE_CIBLE_MODELE',method:'Conservative authored V71 source ground-support rectangle intersects current public paving. Refused instances remain unchanged in the historical registry, not automatically relocated or shrunk. Native civic planters belong to separate solid providers.',
      historicalInstances:natural.HOMEWORLD_NATURAL_MODULES_V80.length,intersectionsBefore:naturalPublicOverlap.length,
      admittedInstances:activeNatural.HOMEWORLD_NATURAL_MODULES_V112.length,refusedInstances:activeNatural.HOMEWORLD_NATURAL_PLACEMENT_REFUSALS_V112.length,
      formations:activeNatural.HOMEWORLD_NATURAL_SUPPORT_TERRACES_V112.length,intersectionsAfter:activeNaturalOverlap.length,
      itemsBefore:naturalPublicOverlap,itemsAfter:activeNaturalOverlap},
  };
}

if (process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const result=auditHomeworldSpatialV112();
  const output=process.argv.indexOf('--output');
  if (output!==-1) {
    const target=process.argv[output+1];
    if (!target) throw new Error('Missing --output path');
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');
  }
  console.log(JSON.stringify(result,null,2));
  if (result.unsupportedAfter.length||result.foundationOverlaps.length||result.addedPlinthOverlapsWithOtherBuildings.length||result.naturalPlacementFollowup.intersectionsAfter||result.groundJoints.after.enclosed.length||result.groundJoints.before.exteriorSamples!==result.groundJoints.after.exteriorSamples) process.exitCode=1;
}
