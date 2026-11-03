import {
  isTraversalCellPassableV154,
  type PlanetTraversalGridV154, type PlanetTraversalSessionV154,
  type PlanetTraversalCellV154,
} from "./clanWarPlanetTraverseV154";

export interface PlanetTraverseSectionNodeV155 {
  x:number;y:number;
  distanceFromStartKm:number;
  elevationMeters:number;
  gradePercent:number;
  longitude:number;latitude:number;
  visited:boolean;
}
export interface PlanetTraverseSectionV155 {
  format:"yautja-planet-traversal-section";
  version:155;worldCode:string;
  nodes:readonly PlanetTraverseSectionNodeV155[];
  currentNodeIndex:number;
  totalDistanceKm:number;
  ascentMeters:number;
  descentMeters:number;
  minElevationMeters:number;
  maxElevationMeters:number;
  notes:readonly string[];
}
const RAD=Math.PI/180;
function stepKm(a:PlanetTraversalCellV154,b:PlanetTraversalCellV154,radiusKm:number):number{
  const lon=((b.longitude-a.longitude+540)%360)-180;
  const lat=b.latitude-a.latitude;
  return Math.hypot(lon*RAD*Math.cos((a.latitude+b.latitude)*RAD/2),lat*RAD)*radiusKm;
}
/** Uses exactly the already planned and walked V154 coordinates. No smoothed
 * imaginary mountain, no gameplay elevation change, no generated shortcuts. */
export function analyzePlanetTraverseSectionV155(
  grid:PlanetTraversalGridV154,session:PlanetTraversalSessionV154,
):PlanetTraverseSectionV155{
  if(grid.worldCode!==session.worldCode||grid.version!==154||session.version!==154)
    throw new RangeError("Profil de relief étranger à cette planète.");
  const points=[...session.walked,...session.queued];
  if((session.position===null)!==(session.walked.length===0)||
    (session.position!==null && session.walked.length>0 &&
    (session.position.x!==session.walked.at(-1)!.x||
     session.position.y!==session.walked.at(-1)!.y)))
    throw new RangeError("Position de l'explorateur incohérente.");
  let cumulative=0,ascent=0,descent=0,min=Infinity,max=-Infinity;
  const nodes:PlanetTraverseSectionNodeV155[]=[];
  let previous:PlanetTraversalCellV154|null=null;
  for(const [i,point] of points.entries()){
    if(!Number.isInteger(point.x)||!Number.isInteger(point.y)||
      point.x<0||point.x>=grid.width||point.y<0||point.y>=grid.height)
      throw new RangeError("Trace de déplacement hors de la carte.");
    const cell=grid.cells[point.y*grid.width+point.x];
    if(!cell||!isTraversalCellPassableV154(cell,session.unitTypeId))
      throw new RangeError("Trace de déplacement sur un obstacle.");
    if(previous){
      const dx=Math.abs(cell.x-previous.x),dy=Math.abs(cell.y-previous.y);
      if(dx+dy!==1)throw new RangeError("Le profil ne peut pas relier des cases non adjacentes.");
      const h=cell.elevationMeters-previous.elevationMeters;
      if(h>=0)ascent+=h;else descent-=h;
      cumulative+=stepKm(previous,cell,grid.radiusKm);
    }
    min=Math.min(min,cell.elevationMeters);max=Math.max(max,cell.elevationMeters);
    nodes.push({
      x:cell.x,y:cell.y,distanceFromStartKm:Number(cumulative.toFixed(2)),
      elevationMeters:cell.elevationMeters,gradePercent:cell.gradePercent,
      longitude:cell.longitude,latitude:cell.latitude,
      visited:i<session.walked.length,
    });
    previous=cell;
  }
  return {
    format:"yautja-planet-traversal-section",version:155,worldCode:grid.worldCode,
    nodes,currentNodeIndex:session.position?session.walked.length-1:-1,
    totalDistanceKm:Number(cumulative.toFixed(2)),ascentMeters:ascent,descentMeters:descent,
    minElevationMeters:nodes.length?min:0,maxElevationMeters:nodes.length?max:0,
    notes:[
      "This is the true V150 sampled elevation along a V154 cartographic exercise, not a new terrain source.",
      "Vertical exaggeration in the drawn section is for readability; heights in JSON remain metres.",
      "A 512x256 planet tile can span tens of kilometres: it is not tactical walk animation, collision, erosion or a mount physics simulator.",
      "No war order, mission, roster, territory, stock, canon location or save file is changed.",
    ],
  };
}
