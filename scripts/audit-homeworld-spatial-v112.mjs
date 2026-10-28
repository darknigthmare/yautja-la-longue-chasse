import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {homeworldSceneSsrV78} from '../tests/helpers/homeworld-scene-ssr-v78.mjs';

/** Read-only scan of the actual compiled TypeScript model. The before view
 * removes only V112 plinth polygons; it does not move or replace a facade. */
export function auditHomeworldSpatialV112(root=process.cwd()) {
  const qa=homeworldSceneSsrV78(root),load=name=>qa.load('app/game/systems/'+name+'.ts');
  const world=load('homeworldWorldV77'),geometry=load('homeworldGeometryV64');
  const urban=load('homeworldUrbanLayoutV78'),city=load('homeworldCity');
  const facades=load('homeworldUrbanFacadesV78'),places=load('homeworldPublicPlacesV112');
  load('homeworldPublicPlacesMountV112');
  const support=load('homeworldFoundationSupportsV112');
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
  return {
    schemaVersion:1,release:'V112',method:'Actual retained facade contacts sampled every four world units; before excludes only foundation-v112 polygons. Geometry/model evidence, not pixel or browser QA.',
    buildings:buildings.length,interactiveBuildings:world.HOMEWORLD_BUILDINGS_V77.length,closedFacades:facades.HOMEWORLD_URBAN_FACADES_V78.length,
    edgeSamples:samples,unsupportedBefore:before,unsupportedAfter:after,
    foundationOverlaps:overlaps,addedPlinths:plinths.map(item=>({id:item.id,buildingId:item.buildingId,levelId:item.levelId,polygon:item.polygon})),
    addedPlinthOverlapsWithOtherBuildings:plinthOverlaps,
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
  if (result.unsupportedAfter.length||result.foundationOverlaps.length||result.addedPlinthOverlapsWithOtherBuildings.length||result.naturalPlacementFollowup.intersectionsAfter) process.exitCode=1;
}
