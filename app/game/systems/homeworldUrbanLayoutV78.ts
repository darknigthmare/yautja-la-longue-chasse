import type {HomeworldLevelV77} from './homeworldWorldV77';

export interface HomeworldUrbanPointV78 {readonly x:number;readonly y:number}
export interface HomeworldUrbanStreetV78 {
 readonly id:string;readonly levelId:HomeworldLevelV77;readonly label:string;
 readonly nodes:readonly HomeworldUrbanPointV78[];readonly clearWidth:number;
}
export interface HomeworldUrbanLotV78 {
 readonly id:string;readonly levelId:HomeworldLevelV77;readonly label:string;
 readonly bounds:{readonly left:number;readonly top:number;readonly right:number;readonly bottom:number};
 readonly use:'shelter'|'work'|'exchange'|'rest'|'logistics';
 readonly artStatus:'NATIVE_LAYOUT_REQUIRED';readonly interactive:false;
}
const p=(x:number,y:number):HomeworldUrbanPointV78=>({x,y});
export const HOMEWORLD_URBAN_STREETS_V78:readonly HomeworldUrbanStreetV78[]=[
 {id:'urban-v78:lower-main',levelId:'-1A',label:'Rue des cours basses',clearWidth:160,
 nodes:[p(2960,4840),p(2960,4600),p(3320,4600),p(3320,4200),p(3980,4200),p(3980,3940)]},
 {id:'urban-v78:lower-gallery',levelId:'-1A',label:'Traversée vers les galeries',clearWidth:160,
 nodes:[p(3980,3940),p(4360,3940),p(4360,3810),p(4860,3810)]},
 {id:'urban-v78:lower-loop',levelId:'-1A',label:'Boucle des ateliers et haltes',clearWidth:144,
 nodes:[p(3320,4200),p(3320,3600),p(3980,3600),p(4360,3600),p(4360,3940)]},
];
const lot=(id:string,left:number,top:number,right:number,bottom:number,use:HomeworldUrbanLotV78['use'],label:string):HomeworldUrbanLotV78=>({
 id:'urban-v78:'+id,levelId:'-1A',label,bounds:{left,top,right,bottom},use,artStatus:'NATIVE_LAYOUT_REQUIRED',interactive:false,
});
/** Independent, additive blocks. Measured original frontal facades fit these
 * lots; dedicated oblique V78 artwork remains pending. The lots themselves are
 * not walls or fake visitable doors, canonical institutions or new services. */
export const HOMEWORLD_URBAN_LOTS_V78:readonly HomeworldUrbanLotV78[]=[
 lot('lower-shelter-west',2810,3650,3220,3990,'shelter','Façade habitée occidentale'),
 lot('lower-exchange-north',3440,3120,3920,3470,'exchange','Travée des échanges bas'),
 lot('lower-work-north',3988,3150,4304,3470,'work','Cour de maintenance'),
 lot('lower-shelter-east',4490,3290,4890,3630,'shelter','Façade habitée orientale'),
 lot('lower-halt-west',3500,3660,3814,3940,'rest','Halte abritée des cours'),
 lot('lower-stock-east',4420,3980,4890,4330,'logistics','Desserte des galeries'),
 lot('lower-work-south',3430,4260,3840,4580,'work','Atelier de la rue basse'),
 lot('lower-rest-south',4060,4310,4450,4660,'rest','Cour commune basse'),
];
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
export const HOMEWORLD_URBAN_PORT_COURTS_V78=[3500,4140,4780,5420,6060,6700,7340].map((x,i)=>({
 id:'urban-v78:port-court:'+i,label:'Cour de desserte '+(i+1),levelId:'0' as const,kind:'plaza' as const,accent:'#ad8a5c',
 polygon:homeworldUrbanRectV78(x-250,4970,x+250,5320),
}));
export const HOMEWORLD_URBAN_GROUND_V78=[...HOMEWORLD_URBAN_STREET_GROUND_V78,...HOMEWORLD_URBAN_PORT_COURTS_V78];
export const HOMEWORLD_URBAN_LAYOUT_LIMITS_V78=[
 'Additive civic adaptation: the supplied concept maps are not a canonical 1:1 map of Yautja Prime.',
 'Eight measured original frontal native facades are scenery replacements; dedicated oblique V78 architecture remains missing.',
 'Six connector native illustrations, bespoke palace/Council and complete urban cliff layers remain incomplete.',
 'No interaction, service, reward, account synchronization or save ID is added by this geometry module.',
] as const;
