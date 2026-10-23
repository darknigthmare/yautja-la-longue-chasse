import native from '../data/homeworldNativeDecorV80.json';
import {HOMEWORLD_GEOMETRY_V64} from './homeworldGeometryV64';
import {HOMEWORLD_ARCHIVE_V106} from './homeworldArchiveDefinitionV106';
type Point={x:number;y:number};
const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function hull(points:readonly Point[]){
  const sorted=[...points].sort((a,b)=>a.x-b.x||a.y-b.y),lower:Point[]=[],upper:Point[]=[];
  for(const p of sorted){while(lower.length>1&&cross(lower.at(-2)!,lower.at(-1)!,p)<=0)lower.pop();lower.push(p);}
  for(const p of sorted.reverse()){while(upper.length>1&&cross(upper.at(-2)!,upper.at(-1)!,p)<=0)upper.pop();upper.push(p);}
  return [...lower.slice(0,-1),...upper.slice(0,-1)];
}
const art=native.assets['clan-lectern-right'],scale=art.heightWorld/art.alphaBounds.height;
export const HOMEWORLD_ARCHIVE_SOLIDS_V106=HOMEWORLD_ARCHIVE_V106.supports.map(s=>({id:s.id,levelId:'0',polygon:hull(art.nativeGroundSupport).map(p=>({
  x:s.x+(p.x-art.pivot.x)*scale,y:s.y+(p.y-art.pivot.y)*scale/HOMEWORLD_GEOMETRY_V64.depthScale,
}))}));
function overlaps(a:readonly Point[],b:readonly Point[]){
  for(const poly of [a,b])for(let i=0;i<poly.length;i++){
    const p=poly[i],q=poly[(i+1)%poly.length],axis={x:q.y-p.y,y:p.x-q.x};
    const av=a.map(v=>v.x*axis.x+v.y*axis.y),bv=b.map(v=>v.x*axis.x+v.y*axis.y);
    if(Math.max(...av)<Math.min(...bv)||Math.max(...bv)<Math.min(...av))return false;
  }return true;
}
/** Shared by the real city motor, navigation grids and route worker through
 * the civic collision layer. Historical prop registries are not mutated. */
export function homeworldArchiveCollisionV106(level:string,p:Point,body={halfWidth:24,halfDepth:14}){
  if(level!=='0')return null;
  const box=[{x:p.x-body.halfWidth,y:p.y-body.halfDepth},{x:p.x+body.halfWidth,y:p.y-body.halfDepth},{x:p.x+body.halfWidth,y:p.y+body.halfDepth},{x:p.x-body.halfWidth,y:p.y+body.halfDepth}];
  return HOMEWORLD_ARCHIVE_SOLIDS_V106.find(s=>overlaps(s.polygon,box))?.id??null;
}
