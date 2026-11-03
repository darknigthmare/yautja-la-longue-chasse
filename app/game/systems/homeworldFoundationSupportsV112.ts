import type {HomeworldBuildingModule} from './homeworldCity';
import {homeworldBuildingGroundFrameV76} from './homeworldGeometryV64';
import type {HomeworldLevelV77} from './homeworldWorldV77';

type Point = {readonly x:number;readonly y:number};
type Building = HomeworldBuildingModule & {readonly levelId:HomeworldLevelV77};

/** These retained foundations protruded beyond their floor's paving. The
 * revision adds a structural plinth under their complete measured hull;
 * thresholds, source pixels, solid volumes and saved positions do not move. */
export const HOMEWORLD_FOUNDATION_BUILDING_IDS_V112 = [
  'trophy-mausoleum', 'residence-forges-1', 'residence-esplanade-2',
  'residence-clans-1', 'residence-arenas-1', 'residence-terraces-3',
] as const;
export const HOMEWORLD_FOUNDATION_LIP_V112 = 16;
/** The existing neighbouring terrace house is less than sixteen units away.
 * Its narrow structural joint keeps both native foundations separate. */
export const HOMEWORLD_FOUNDATION_JOINT_LIP_V112:Readonly<Record<string,number>>={
  'residence-terraces-3':4,
};

function convexHull(points:readonly Point[]):readonly Point[] {
  const ordered = [...points].sort((a,b)=>a.x-b.x || a.y-b.y);
  const cross = (a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const half = (rows:readonly Point[])=>{
    const result:Point[]=[];
    for (const point of rows) {
      while (result.length>1 && cross(result[result.length-2],result[result.length-1],point)<=0) result.pop();
      result.push(point);
    }
    return result;
  };
  return [...half(ordered).slice(0,-1),...half(ordered.reverse()).slice(0,-1)];
}

/** Pure late-layout input. Importing this helper never reads World registries
 * while they are initializing. Ground, renderer and exposed cliff extraction
 * receive the returned polygons together through HOMEWORLD_GROUND_V77. */
export function homeworldFoundationSupportsV112(buildings:readonly Building[]) {
  return HOMEWORLD_FOUNDATION_BUILDING_IDS_V112.map(id=>{
    const building=buildings.find(candidate=>candidate.id===id);
    if (!building) throw new Error('Missing retained foundation '+id);
    const contact=homeworldBuildingGroundFrameV76(building).polygon;
    const lip=HOMEWORLD_FOUNDATION_JOINT_LIP_V112[id]??HOMEWORLD_FOUNDATION_LIP_V112;
    const polygon=convexHull(contact.flatMap(point=>[-1,1].flatMap(x=>[-1,1].map(y=>({
      x:point.x+x*lip,
      y:point.y+y*lip,
    })))));
    return {
      id:'foundation-v112:'+id, buildingId:id, label:'Socle continu · '+building.label,
      levelId:building.levelId, kind:'plaza' as const, accent:'#a18c70', lip, polygon,
    };
  });
}
