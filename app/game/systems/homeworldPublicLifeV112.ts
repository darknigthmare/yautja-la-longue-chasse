import authored from '../data/homeworldPublicLifeV112.json';
import {HOMEWORLD_RESIDENTS_V77,HOMEWORLD_BUILDINGS_V77,HOMEWORLD_POINTS_V77,HOMEWORLD_CONNECTORS_V77,homeworldLevelV77,type HomeworldLevelV77} from './homeworldWorldV77';
import {HOMEWORLD_URBAN_EXTRAS_V78} from './homeworldUrbanPopulationV78';
import {homeworldCivicWalkableV80} from './homeworldCivicWorldV80';
import {homeworldResidentOccludedV100} from './homeworldResidentVisibilityV100';
import {homeworldBuildingDoorwayV64,homeworldProjectGroundV64} from './homeworldGeometryV64';
import {homeworldCivilianPoseV84} from './homeworldCivilianRoutinesV84';
import {homeworldCivilianMotionFrameV74} from './homeworldCivilianMotionV74';
import {HOMEWORLD_ARCHIVE_V106} from './homeworldArchiveDefinitionV106';
import {HOMEWORLD_ARCHIVE_COMPARISON_V107} from './homeworldArchiveComparisonDefinitionV107';
import {HOMEWORLD_CARGO_V108} from './homeworldCargoDefinitionV108';
import {HOMEWORLD_ARCHIVE_PLAQUE_V109} from './homeworldArchivePlaqueDefinitionV109';
import {HOMEWORLD_CIVILIAN_ROLES_V72,type HomeworldCivilianRoleV72} from './homeworldIdentityV72';

type Point={readonly x:number;readonly y:number};
export interface HomeworldPublicInhabitantV112 {
 readonly id:string;readonly label:string;readonly districtId:string;readonly levelId:HomeworldLevelV77;
 readonly civilianRole:HomeworldCivilianRoleV72;readonly path:readonly Point[];
 readonly speed:number;readonly dwellSeconds:number;readonly phaseSeconds:number;
}
export const HOMEWORLD_PUBLIC_LIFE_CANDIDATES_V112=authored.inhabitants as readonly HomeworldPublicInhabitantV112[];
const originalResidents=[...HOMEWORLD_RESIDENTS_V77,...HOMEWORLD_URBAN_EXTRAS_V78];
export const HOMEWORLD_PUBLIC_LIFE_BODY_V112={halfWidth:36,halfDepth:26} as const;
const segmentDistance=(p:Point,a:Point,b:Point)=>{
 const x=b.x-a.x,y=b.y-a.y,squared=x*x+y*y,t=squared?Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/squared)):0;
 return Math.hypot(p.x-a.x-t*x,p.y-a.y-t*y);
};
function definitionPoints(value:unknown,levelId:HomeworldLevelV77,id:string):{point:Point;levelId:HomeworldLevelV77;id:string}[]{
 if(!value||typeof value!=='object')return[];
 const record=value as Record<string,unknown>,result:{point:Point;levelId:HomeworldLevelV77;id:string}[]=[];
 if(typeof record.x==='number'&&typeof record.y==='number'&&Number.isFinite(record.x)&&Number.isFinite(record.y))result.push({point:{x:record.x,y:record.y},levelId,id});
 for(const[key,item]of Object.entries(record))result.push(...definitionPoints(item,levelId,`${id}:${key}`));
 return result;
}
/** Every current operation socket remains available. The read-only definition
 * walk includes physical pieces and supports as well as dialogue stands. */
const protectedPoints=[
 ...HOMEWORLD_POINTS_V77.map(p=>({id:p.id,levelId:p.levelId,point:p})),
 ...HOMEWORLD_BUILDINGS_V77.map(b=>({id:`door:${b.id}`,levelId:b.levelId,point:homeworldBuildingDoorwayV64(b).approach})),
 ...HOMEWORLD_CONNECTORS_V77.flatMap(c=>[c.from,c.to].map(s=>({id:`connector:${c.id}`,levelId:s.levelId,point:s.point}))),
 ...definitionPoints(HOMEWORLD_ARCHIVE_V106,'0','archive-v106'),
 ...definitionPoints(HOMEWORLD_ARCHIVE_COMPARISON_V107,'0','comparison-v107'),
 ...definitionPoints(HOMEWORLD_CARGO_V108,'0','cargo-v108'),
 ...definitionPoints(HOMEWORLD_ARCHIVE_PLAQUE_V109,'0','plaque-v109'),
];

/** Hand-authored short patrols are checked against the complete current fixed
 * city, rather than granting pavement or shrinking a body to fill an image.
 * Rejected candidates are retained. This does not certify movable cargo or a
 * new building/animation/service; all seven inhabitants are passive scenery. */
export function compileHomeworldPublicLifeV112(candidates:readonly HomeworldPublicInhabitantV112[]=HOMEWORLD_PUBLIC_LIFE_CANDIDATES_V112){
 const accepted:HomeworldPublicInhabitantV112[]=[],refusals:{id:string;reason:string}[]=[],observations:{id:string;samples:number;minimumExistingRouteDistance:number;minimumProtectedPointDistance:number}[]=[];
 const seen=new Set<string>();
 for(const inhabitant of candidates){
  let reason:string|null=null,samples=0,minimumExistingRouteDistance=Infinity,minimumProtectedPointDistance=Infinity;
  if(seen.has(inhabitant.id))reason='duplicate-id';seen.add(inhabitant.id);
  if(!reason&&(!homeworldLevelV77(inhabitant.levelId)||!HOMEWORLD_CIVILIAN_ROLES_V72.includes(inhabitant.civilianRole)||inhabitant.path.length<2||inhabitant.path.some(p=>![p.x,p.y].every(Number.isFinite))||![inhabitant.speed,inhabitant.dwellSeconds,inhabitant.phaseSeconds].every(Number.isFinite)||inhabitant.speed<=0||inhabitant.dwellSeconds<0))reason='invalid-route';
  for(let s=1;!reason&&s<inhabitant.path.length;s++){
   const a=inhabitant.path[s-1],b=inhabitant.path[s],length=Math.hypot(a.x-b.x,a.y-b.y);
   if(length<1||length>400){reason='invalid-segment-length';break;}
   const count=Math.ceil(length/2);
   for(let i=0;!reason&&i<=count;i++){
    const point={x:a.x+(b.x-a.x)*i/count,y:a.y+(b.y-a.y)*i/count};samples++;
    if(!homeworldCivicWalkableV80(inhabitant.levelId,point,HOMEWORLD_PUBLIC_LIFE_BODY_V112)){reason='unsupported-or-obstructed-full-body';break;}
    if(homeworldResidentOccludedV100(inhabitant.levelId,point)){reason='hidden-by-native-facade';break;}
    for(const protectedPoint of protectedPoints){if(protectedPoint.levelId!==inhabitant.levelId)continue;
     const distance=Math.hypot(point.x-protectedPoint.point.x,point.y-protectedPoint.point.y);minimumProtectedPointDistance=Math.min(minimumProtectedPointDistance,distance);
     if(distance<140){reason=`protected-approach:${protectedPoint.id}`;break;}
    }
    for(const resident of originalResidents){if(resident.levelId!==inhabitant.levelId)continue;
     for(let k=1;k<resident.path.length;k++)minimumExistingRouteDistance=Math.min(minimumExistingRouteDistance,segmentDistance(point,resident.path[k-1],resident.path[k]));
    }
    if(!reason&&minimumExistingRouteDistance<100)reason='existing-resident-route';
    for(const prior of accepted){if(prior.levelId!==inhabitant.levelId)continue;
     for(let k=1;k<prior.path.length;k++)if(segmentDistance(point,prior.path[k-1],prior.path[k])<100)reason=`accepted-resident-route:${prior.id}`;
    }
   }
  }
  if(reason)refusals.push({id:inhabitant.id,reason});
  else{accepted.push(inhabitant);observations.push({id:inhabitant.id,samples,minimumExistingRouteDistance,minimumProtectedPointDistance});}
 }
 return{accepted,refusals,observations};
}
const compiled=compileHomeworldPublicLifeV112();
export const HOMEWORLD_PUBLIC_LIFE_V112=compiled.accepted;
export const HOMEWORLD_PUBLIC_LIFE_REFUSALS_V112=compiled.refusals;
export const HOMEWORLD_PUBLIC_LIFE_OBSERVATIONS_V112=compiled.observations;

export function homeworldPublicLifePoseV112(inhabitant:HomeworldPublicInhabitantV112,seconds:number){
 return homeworldCivilianPoseV84({...inhabitant,role:inhabitant.label,morphId:'classic',path:inhabitant.path.map(p=>({...p}))},seconds);
}
/** Complete native left/right walking drawings are also held at the real
 * route halt. No mirrored idle, new social clip, bobbing or independent clock. */
export function homeworldPublicLifePaintV112(inhabitant:HomeworldPublicInhabitantV112,seconds:number,reducedMotion=false){
 const pose=homeworldPublicLifePoseV112(inhabitant,seconds),elevation=homeworldLevelV77(inhabitant.levelId).elevation;
 const foot=homeworldProjectGroundV64(pose,elevation),native=homeworldCivilianMotionFrameV74(inhabitant.civilianRole,reducedMotion?0:pose.motionSeconds,pose.facing,100,inhabitant.speed);
 const{frame,source,scale}=native;
 return{pose,foot,native,bounds:{left:foot.x+(frame.alphaBounds.x-frame.pivot.x)*scale,top:foot.y+(frame.alphaBounds.y-frame.pivot.y)*scale,width:frame.alphaBounds.width*scale,height:frame.alphaBounds.height*scale},
  sourceLeft:-frame.pivot.x*scale,sourceTop:-frame.pivot.y*scale,
  width:frame.sourceRect.width*scale,height:frame.sourceRect.height*scale,
  backgroundSize:`${source.sourceWidth*scale}px ${source.sourceHeight*scale}px`,backgroundPosition:`${-frame.sourceRect.x*scale}px ${-frame.sourceRect.y*scale}px`};
}
export function homeworldPublicLifeVisibleV112(bounds:{left:number;top:number;width:number;height:number},camera:{x:number;y:number;viewWidth:number;viewHeight:number}){
 const margin=180;
 return bounds.left+bounds.width>=camera.x-margin&&bounds.left<=camera.x+camera.viewWidth+margin&&bounds.top+bounds.height>=camera.y-margin&&bounds.top<=camera.y+camera.viewHeight+margin;
}
