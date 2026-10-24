import native from '../data/homeworldNativeDecorV80.json';
import {HOMEWORLD_GEOMETRY_V64} from './homeworldGeometryV64';
import {HOMEWORLD_ARCHIVE_COMPARISON_V107 as b} from './homeworldArchiveComparisonDefinitionV107';
type Point={x:number;y:number};
const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const art=native.assets['clan-lectern-right'],scale=art.heightWorld/art.alphaBounds.height;
const sorted=[...art.nativeGroundSupport].sort((a,b)=>a.x-b.x||a.y-b.y),lower:Point[]=[],upper:Point[]=[];
for(const p of sorted){while(lower.length>1&&cross(lower.at(-2)!,lower.at(-1)!,p)<=0)lower.pop();lower.push(p);}
for(const p of [...sorted].reverse()){while(upper.length>1&&cross(upper.at(-2)!,upper.at(-1)!,p)<=0)upper.pop();upper.push(p);}
export const HOMEWORLD_ARCHIVE_COMPARISON_SOLID_V107={id:b.table.id,levelId:'0',polygon:[...lower.slice(0,-1),...upper.slice(0,-1)].map(p=>({x:b.table.x+(p.x-art.pivot.x)*scale,y:b.table.y+(p.y-art.pivot.y)*scale/HOMEWORLD_GEOMETRY_V64.depthScale}))};
/** Same native support/pivot/scale as the actual third lectern renderer. Pure
 * layer mounted by civic physics and both route planners, including workers. */
export function homeworldArchiveComparisonCollisionV107(level:string,p:Point,body={halfWidth:24,halfDepth:14}){
 if(level!=='0')return null;const a=HOMEWORLD_ARCHIVE_COMPARISON_SOLID_V107.polygon,box=[{x:p.x-body.halfWidth,y:p.y-body.halfDepth},{x:p.x+body.halfWidth,y:p.y-body.halfDepth},{x:p.x+body.halfWidth,y:p.y+body.halfDepth},{x:p.x-body.halfWidth,y:p.y+body.halfDepth}];
 for(const poly of[a,box])for(let i=0;i<poly.length;i++){const x=poly[i],y=poly[(i+1)%poly.length],axis={x:y.y-x.y,y:x.x-y.x},av=a.map(q=>q.x*axis.x+q.y*axis.y),bv=box.map(q=>q.x*axis.x+q.y*axis.y);if(Math.max(...av)<Math.min(...bv)||Math.max(...bv)<Math.min(...av))return null;}return b.table.id;
}
