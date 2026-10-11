import {HOMEWORLD_NATURAL_MODULES_V80} from './homeworldNaturalPlacementsV80';
import {homeworldOutskirtsFootprintV71,type HomeworldOutskirtsModuleV71} from './homeworldOutskirtsV71';
import {HOMEWORLD_GROUND_V77,HOMEWORLD_CONNECTOR_PADS_V82} from './homeworldWorldV77';
import {HOMEWORLD_URBAN_GROUND_V78,homeworldUrbanHullV78} from './homeworldUrbanLayoutV78';

export const HOMEWORLD_NATURAL_PUBLIC_GROUND_V85=[...HOMEWORLD_GROUND_V77,...HOMEWORLD_CONNECTOR_PADS_V82,...HOMEWORLD_URBAN_GROUND_V78].filter(ground=>ground.levelId==='0');
type NaturalPoint={x:number;y:number};
/** Existing V85 render-only shoulders, now shared with the V90 ecotone pass.
 * Every source formation joins an existing public edge. No polygon enters
 * terrain, collision, save state or route permission. Placement is unchanged. */
function naturalSupportTerracesV85(){
 const groups=new Map<string,HomeworldOutskirtsModuleV71[]>();
 for(const item of HOMEWORLD_NATURAL_MODULES_V80){
  const authored=item as HomeworldOutskirtsModuleV71&{groupId?:string;formation?:string};
  const formation=item.id.startsWith('landscape-v75-')?'v75:'+authored.groupId:item.id.startsWith('port-shoulder-v80:')?'v80:'+authored.formation:'v71:'+item.districtId;
  const group=groups.get(formation)??[];group.push(item);groups.set(formation,group);
 }
 return [...groups].map(([id,items])=>{
  const points=items.flatMap(item=>{const b=homeworldOutskirtsFootprintV71(item);return[{x:b.left-22,y:b.top-22},{x:b.right+22,y:b.top-22},{x:b.right+22,y:b.bottom+22},{x:b.left-22,y:b.bottom+22}];});
  let nearest:{distance:number;point:NaturalPoint;a:NaturalPoint;b:NaturalPoint;groundId:string}|null=null;
  for(const point of points)for(const ground of HOMEWORLD_NATURAL_PUBLIC_GROUND_V85)for(let i=0;i<ground.polygon.length;i++){
   const a=ground.polygon[i],b=ground.polygon[(i+1)%ground.polygon.length],dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;
   if(l2<1)continue;
   const t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/l2)),p={x:a.x+t*dx,y:a.y+t*dy},distance=Math.hypot(p.x-point.x,p.y-point.y);
   if(!nearest||distance<nearest.distance){const half=Math.min(.5,80/Math.sqrt(l2)),lo=Math.max(0,t-half),hi=Math.min(1,t+half);nearest={distance,point:p,a:{x:a.x+lo*dx,y:a.y+lo*dy},b:{x:a.x+hi*dx,y:a.y+hi*dy},groundId:ground.id};}
  }
  if(!nearest)throw Error('Natural formation without a source ground edge: '+id);
  return{id,ids:items.map(item=>item.id),anchor:nearest.point,anchorEdge:[nearest.a,nearest.b],groundId:nearest.groundId,polygon:homeworldUrbanHullV78([...points,nearest.a,nearest.b])};
 });
}
export const HOMEWORLD_NATURAL_SUPPORT_TERRACES_V85=naturalSupportTerracesV85();
