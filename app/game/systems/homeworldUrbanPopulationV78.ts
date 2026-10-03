import {HOMEWORLD_RESIDENTS_V77,homeworldResidentPoseV77,type HomeworldLevelV77} from './homeworldWorldV77';
import type {HomeworldResidentV69} from './homeworldLifeV69';
import type {HomeworldFootprint} from './homeworldCity';
import {HOMEWORLD_ACTOR} from './homeworldCity';
import {HOMEWORLD_URBAN_PROPS_V78,HOMEWORLD_URBAN_RESERVES_V78,homeworldUrbanWalkableV78} from './homeworldStreetModulesV78';
import {homeworldCourtPolygonV80 as homeworldExteriorPolygonV76} from './homeworldCourtArtV80';
import {homeworldUrbanCorridorV78,homeworldUrbanOverlapV78,type HomeworldUrbanPointV78} from './homeworldUrbanLayoutV78';
import {homeworldResidentRoleV72,type HomeworldCivilianRoleV72} from './homeworldIdentityV72';
export interface HomeworldUrbanExtraV78 extends HomeworldResidentV69 {
 readonly levelId:HomeworldLevelV77;readonly sourceResidentId:string;readonly interactive:false;readonly saveVisit:false;readonly solid:false;
 readonly civilianRole:HomeworldCivilianRoleV72;
}
const quayRoles:readonly HomeworldCivilianRoleV72[]=['dock-officer','courier','artisan','courier','dock-officer','courier','artisan'];
const lowerRoles:readonly HomeworldCivilianRoleV72[]=['witness','artisan','forge-master','witness','courier','artisan','healer'];
const seeds=[
 ...[3500,4140,4780,5420,6060,6700,7340].map((x,i)=>({id:'quay-'+i,levelId:'0' as const,districtId:'port',x,y:5220,civilianRole:quayRoles[i]})),
 ...[{x:3070,y:4150},{x:3150,y:3130},{x:4150,y:3020},{x:4840,y:4540},{x:3730,y:4050},{x:3600,y:4800},{x:4210,y:4840}].map((p,i)=>({...p,id:'lower-'+i,levelId:'-1A' as const,districtId:'undercity',civilianRole:lowerRoles[i]})),
];
export const HOMEWORLD_URBAN_EXTRA_CANDIDATES_V78:readonly HomeworldUrbanExtraV78[]=seeds.map((seed,i)=>{
 const source=HOMEWORLD_RESIDENTS_V77.find(r=>r.morphId!=='young'&&homeworldResidentRoleV72(r)===seed.civilianRole);
 if(!source)throw Error('Missing original persona for measured courtyard costume: '+seed.civilianRole);
 return{...source,id:'urban-v78:extra:'+seed.id,name:undefined,activity:undefined,districtId:seed.districtId,
 levelId:seed.levelId,sourceResidentId:source.id,path:[{x:seed.x-24,y:seed.y},{x:seed.x+24,y:seed.y}],
 phaseSeconds:i*2.75,civilianRole:seed.civilianRole,interactive:false,saveVisit:false,solid:false};
});
/** The explicit native costume follows the actual original persona rather than
 * re-hashing its new courtyard ID/district into an unrelated occupation. */
export function homeworldUrbanExtraRoleV78(resident:HomeworldResidentV69|HomeworldUrbanExtraV78):HomeworldCivilianRoleV72{
 return 'civilianRole' in resident?resident.civilianRole:homeworldResidentRoleV72(resident);
}
function refusal(extra:HomeworldUrbanExtraV78):string|null{
 const a=extra.path[0],b=extra.path.at(-1)!,path=homeworldUrbanCorridorV78(a,b,36,26);
 const reserve=HOMEWORLD_URBAN_RESERVES_V78.find(r=>r.levelId===extra.levelId&&homeworldUrbanOverlapV78(path,r.polygon));if(reserve)return reserve.id;
 const prop=HOMEWORLD_URBAN_PROPS_V78.find(p=>p.levelId===extra.levelId&&homeworldUrbanOverlapV78(path,homeworldExteriorPolygonV76(p)));if(prop)return prop.id;
 const count=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/2));
 for(let i=0;i<=count;i++)if(!homeworldUrbanWalkableV78(extra.levelId,{x:a.x+(b.x-a.x)*i/count,y:a.y+(b.y-a.y)*i/count},{halfWidth:36,halfDepth:26}))return 'Unsupported/obstructed true full-body route';
 return null;
}
const compiled=HOMEWORLD_URBAN_EXTRA_CANDIDATES_V78.map(extra=>({extra,reason:refusal(extra)}));
export const HOMEWORLD_URBAN_EXTRAS_V78:readonly HomeworldUrbanExtraV78[]=compiled.filter(r=>!r.reason).map(r=>r.extra);
export const HOMEWORLD_URBAN_EXTRA_REJECTIONS_V78=compiled.filter(r=>r.reason).map(r=>({id:r.extra.id,reason:r.reason}));
/** Root must draw these via the existing native civilian pose renderer and pass
 * the exact paused city clock here. Extras are never appended to saved visits,
 * nearest-dialogue searches, contracts or service/quest definitions. */
export function homeworldUrbanExtraOccupancyV78(level:HomeworldLevelV77,point:HomeworldUrbanPointV78,seconds:number,body:HomeworldFootprint=HOMEWORLD_ACTOR){
 for(const extra of HOMEWORLD_URBAN_EXTRAS_V78){if(extra.levelId!==level)continue;const p=homeworldResidentPoseV77(extra,seconds);
  if(Math.abs(point.x-p.x)<body.halfWidth+24&&Math.abs(point.y-p.y)<body.halfDepth+14)return{kind:'npc' as const,id:extra.id};
 }return null;
}
