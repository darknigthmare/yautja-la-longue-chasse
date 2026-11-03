import type {HomeworldLevelV77} from './homeworldWorldV77';
import {HOMEWORLD_AUTHORED_COURTS_V81} from './homeworldAuthoredLotsV81';
import {HOMEWORLD_URBAN_FACADE_PLANS_V83} from './homeworldUrbanFacadePlansV83';

export interface HomeworldUrbanPointV78 {readonly x:number;readonly y:number}
export interface HomeworldUrbanStreetV78 {
 readonly id:string;readonly levelId:HomeworldLevelV77;readonly label:string;
 readonly nodes:readonly HomeworldUrbanPointV78[];readonly clearWidth:number;
}
export interface HomeworldUrbanLotV78 {
 readonly id:string;readonly levelId:HomeworldLevelV77;readonly label:string;
 readonly bounds:{readonly left:number;readonly top:number;readonly right:number;readonly bottom:number};
 readonly use:'shelter'|'work'|'exchange'|'rest'|'logistics';
 readonly artStatus:'MEASURED_NATIVE_OBLIQUE_REUSE_V83';readonly interactive:false;
}
const p=(x:number,y:number):HomeworldUrbanPointV78=>({x,y});
export const HOMEWORLD_URBAN_STREETS_V78:readonly HomeworldUrbanStreetV78[]=[
 {id:'urban-v78:lower-main',levelId:'-1A',label:'Rue des cours basses',clearWidth:160,
 nodes:[p(2960,4840),p(3030,4540),p(3320,4480),p(3290,4170),p(3740,4140),p(3980,3940)]},
 {id:'urban-v78:lower-gallery',levelId:'-1A',label:'Traversée vers les galeries',clearWidth:160,
 nodes:[p(3980,3940),p(4415,3905),p(4860,3810)]},
 {id:'urban-v78:lower-loop',levelId:'-1A',label:'Boucle des ateliers et haltes',clearWidth:144,
 nodes:[p(3290,4170),p(3320,3600),p(3820,3565),p(4360,3600),p(4415,3905)]},
];
/** V83 reuses eight different source drawings and recomposes the actual lots
 * around their adult-sized contact hulls. A lot remains a planning reserve,
 * not a separate invisible wall or a fabricated service/visitable room. */
export const HOMEWORLD_URBAN_LOTS_V78:readonly HomeworldUrbanLotV78[]=HOMEWORLD_URBAN_FACADE_PLANS_V83.map(plan=>({
 id:plan.id,levelId:'-1A',label:plan.label,bounds:plan.bounds,use:plan.use,artStatus:plan.nativeStatus,interactive:false,
}));
export function homeworldUrbanHullV78(points:readonly HomeworldUrbanPointV78[]):readonly HomeworldUrbanPointV78[]{
 const rows=[...points].sort((a,b)=>a.x-b.x||a.y-b.y).filter((p,i,a)=>!i||p.x!==a[i-1].x||p.y!==a[i-1].y);
 if(rows.length<3)return rows;
 const cross=(o:HomeworldUrbanPointV78,a:HomeworldUrbanPointV78,b:HomeworldUrbanPointV78)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);
 const lower:HomeworldUrbanPointV78[]=[],upper:HomeworldUrbanPointV78[]=[];
 for(const point of rows){while(lower.length>=2&&cross(lower[lower.length-2],lower[lower.length-1],point)<=0)lower.pop();lower.push(point);}
 for(const point of [...rows].reverse()){while(upper.length>=2&&cross(upper[upper.length-2],upper[upper.length-1],point)<=0)upper.pop();upper.push(point);}
 return [...lower.slice(0,-1),...upper.slice(0,-1)];
}
/** Exact Minkowski corridor for an axis-aligned actor along a segment.
 * Every step is protected, not just a sparse set of waypoints. */
export function homeworldUrbanCorridorV78(a:HomeworldUrbanPointV78,b:HomeworldUrbanPointV78,halfWidth=48,halfDepth=38){
 return homeworldUrbanHullV78([a,b].flatMap(point=>[-1,1].flatMap(x=>[-1,1].map(y=>p(point.x+x*halfWidth,point.y+y*halfDepth)))));
}
export function homeworldUrbanRectV78(left:number,top:number,right:number,bottom:number):readonly HomeworldUrbanPointV78[]{
 return[p(left,top),p(right,top),p(right,bottom),p(left,bottom)];
}
export function homeworldUrbanOverlapV78(a:readonly HomeworldUrbanPointV78[],b:readonly HomeworldUrbanPointV78[]):boolean{
 if(a.length<3||b.length<3)throw Error('A measured convex footprint requires at least three vertices');
 const axes=[...a,...b].map((_,i)=>{const poly=i<a.length?a:b,j=i<a.length?i:i-a.length;return{x:-(poly[(j+1)%poly.length].y-poly[j].y),y:poly[(j+1)%poly.length].x-poly[j].x};});
 return axes.every(axis=>{const pa=a.map(p=>p.x*axis.x+p.y*axis.y),pb=b.map(p=>p.x*axis.x+p.y*axis.y);return Math.max(...pa)>Math.min(...pb)&&Math.max(...pb)>Math.min(...pa);});
}
export const HOMEWORLD_URBAN_STREET_GROUND_V78=HOMEWORLD_URBAN_STREETS_V78.flatMap(street=>street.nodes.slice(1).map((b,i)=>({
 id:street.id+':'+i,label:street.label,levelId:street.levelId,kind:'passage' as const,accent:'#9e8060',
 polygon:homeworldUrbanCorridorV78(street.nodes[i],b,street.clearWidth/2,street.clearWidth/2),
})));
/** Small side courts along the already supported eastern causeway. These
 * rectangles add support; none remove old streets or enlarge an invisible
 * collision. Props on them use the identical measured polygon in rendering,
 * collision and the codex, mounted together by the V78 scene integration. */
export const HOMEWORLD_URBAN_PORT_COURTS_V78=HOMEWORLD_AUTHORED_COURTS_V81.filter(c=>c.levelId==='0').map((court,i)=>({
 id:'urban-v78:port-court:'+i,label:court.label,levelId:'0' as const,kind:'plaza' as const,accent:'#ad8a5c',
 polygon:court.polygon,
}));
export const HOMEWORLD_URBAN_GROUND_V78=[...HOMEWORLD_URBAN_STREET_GROUND_V78,...HOMEWORLD_URBAN_PORT_COURTS_V78];
export const HOMEWORLD_URBAN_LAYOUT_LIMITS_V78=[
 'Additive civic adaptation: the supplied concept maps are not a canonical 1:1 map of Yautja Prime.',
 'Eight different measured native oblique sources replace the former frontal scenery placeholders; these closed facades do not add visitable rooms.',
 'V83 source/lot authoring has no new gameplay or visual QA; dedicated district variations, complete city density and cliff layers remain unfinished.',
 'No interaction, service, reward, account synchronization or save ID is added by this geometry module.',
] as const;
