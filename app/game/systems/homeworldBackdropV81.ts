import {HOMEWORLD_GROUND_V77,HOMEWORLD_CONNECTOR_PADS_V82,homeworldLevelV77,type HomeworldLevelV77} from './homeworldWorldV77';
import {HOMEWORLD_URBAN_GROUND_V78} from './homeworldUrbanLayoutV78';
import {pointInHomeworldPolygon} from './homeworldCity';
import {HOMEWORLD_GEOMETRY_V64} from './homeworldGeometryV64';

type Point={x:number;y:number};
type Edge={id:string;levelId:HomeworldLevelV77;a:Point;b:Point};
const grounds=[...HOMEWORLD_GROUND_V77,...HOMEWORLD_CONNECTOR_PADS_V82,...HOMEWORLD_URBAN_GROUND_V78];
const cross=(a:Point,b:Point)=>a.x*b.y-a.y*b.x;
const minus=(a:Point,b:Point)=>({x:a.x-b.x,y:a.y-b.y});
function cuts(a:Point,b:Point,c:Point,d:Point):number[]{
  const r=minus(b,a),s=minus(d,c),den=cross(r,s),ca=minus(c,a);
  if(Math.abs(den)>1e-8){const t=cross(ca,s)/den,u=cross(ca,r)/den;return t>0&&t<1&&u>=0&&u<=1?[t]:[];}
  if(Math.abs(cross(ca,r))>1e-7)return[];
  const l=r.x*r.x+r.y*r.y;
  return[c,d].map(p=>((p.x-a.x)*r.x+(p.y-a.y)*r.y)/l).filter(t=>t>0&&t<1);
}
/** Extract the REAL exposed front faces of the union, not a border around each
 * overlapping old rectangle. Ground remains unchanged. The ledges descend
 * beneath the exact projected floor edge and cannot become invisible solids. */
export function homeworldExposedEdgesV81(level:HomeworldLevelV77):readonly Edge[]{
  const polygons=grounds.filter(g=>g.levelId===level),all=polygons.flatMap(g=>g.polygon.map((a,i)=>({id:g.id+':'+i,a,b:g.polygon[(i+1)%g.polygon.length]})));
  const result:Edge[]=[];
  for(const edge of all){
    const dx=edge.b.x-edge.a.x,dy=edge.b.y-edge.a.y,len=Math.hypot(dx,dy);if(len<1)continue;
    const ts=[0,1,...all.flatMap(other=>cuts(edge.a,edge.b,other.a,other.b))].sort((a,b)=>a-b).filter((t,i,a)=>!i||t-a[i-1]>1e-6);
    for(let i=1;i<ts.length;i++){
      const at=(t:number)=>({x:edge.a.x+dx*t,y:edge.a.y+dy*t}),a=at(ts[i-1]),b=at(ts[i]);if(Math.hypot(b.x-a.x,b.y-a.y)<2)continue;
      const m=at((ts[i-1]+ts[i])/2),normal={x:-dy/len,y:dx/len};
      const covered=(sign:number)=>polygons.some(p=>pointInHomeworldPolygon({x:m.x+normal.x*sign*.6,y:m.y+normal.y*sign*.6},p.polygon));
      const plus=covered(1),negative=covered(-1);if(plus===negative)continue;
      const out=plus?{x:-normal.x,y:-normal.y}:normal;
      if(out.y<.1)continue; // Rear faces cannot be seen from this camera.
      result.push({id:edge.id+':'+i,levelId:level,a,b});
    }
  }
  return result;
}
export const HOMEWORLD_EXPOSED_EDGES_V81=Object.fromEntries(['0','+1','+2','-1A','-1B','-1C'].map(level=>[level,homeworldExposedEdgesV81(level as HomeworldLevelV77)])) as Record<HomeworldLevelV77,readonly Edge[]>;
export const HOMEWORLD_DEPTH_LAYERS_V81=[
  {id:0,role:'foreground-edges',parallax:1},
  {id:1,role:'physical-floor-actors',parallax:1},
  {id:2,role:'immediate-native-architecture',parallax:1},
  {id:3,role:'secondary-district',parallax:.7},
  {id:4,role:'distant-city',parallax:.35},
  {id:5,role:'distant-cliffs',parallax:.2},
  {id:6,role:'mountain-silhouettes',parallax:.12},
  {id:7,role:'sky-and-far-traffic',parallax:.04},
] as const;
/** Authored, unequal skyline rhythms. Instances of a single distant module
 * are explicitly scenery, not twenty-four newly visitable houses per image. */
export const HOMEWORLD_DISTANT_BLOCKS_V81=[
  {id:'west-coastal-old-city',x:-420,y:110,width:1170,layer:4},
  {id:'west-ceremonial-ridge',x:1160,y:80,width:1410,layer:4},
  {id:'royal-foundation-city',x:3050,y:-30,width:1810,layer:4},
  {id:'east-clan-ridge',x:5480,y:150,width:1350,layer:4},
  {id:'far-port-city',x:7140,y:100,width:1530,layer:4},
  {id:'outer-marches-city',x:9330,y:190,width:1200,layer:4},
  {id:'secondary-west-habitat',x:110,y:510,width:1530,layer:3},
  {id:'secondary-central-quarter',x:2790,y:560,width:1830,layer:3},
  {id:'secondary-east-logistics',x:6450,y:600,width:1950,layer:3},
  {id:'outer-east-complex',x:10010,y:430,width:1470,layer:3},
] as const;
export function homeworldBackdropPositionV81(item:{x:number;y:number;layer:3|4},camera:{x:number;y:number;viewHeight:number},level:HomeworldLevelV77){
  const ratio=HOMEWORLD_DEPTH_LAYERS_V81[item.layer].parallax;
  // Elevation shifts the distant horizon gradually during physical transit.
  const lift=homeworldLevelV77(level).elevation*.09;
  return{left:item.x+camera.x*(1-ratio),top:item.y+camera.y*(1-ratio)-lift};
}
export const homeworldFoundationDepthV81=(level:HomeworldLevelV77)=>Math.max(220,Math.abs(homeworldLevelV77(level).elevation)/2+300);
export const homeworldProjectEdgeV81=(edge:Edge)=>[edge.a,edge.b].map(p=>({x:p.x,y:p.y*HOMEWORLD_GEOMETRY_V64.depthScale-homeworldLevelV77(edge.levelId).elevation}));
