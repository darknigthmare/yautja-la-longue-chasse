import {normalizeHomeworldCheckpointV77,type HomeworldCheckpointV77} from './homeworldCheckpointV77';
import {HOMEWORLD_BUILDINGS_V77,createHomeworldWorldActorV77,homeworldWalkableV77,type HomeworldLevelV77} from './homeworldWorldV77';
import {homeworldInteriorForBuildingV64,isHomeworldInteriorWalkableV64} from './homeworldInteriorsV64';
import {homeworldBuildingDoorwayV64} from './homeworldGeometryV64';
import type {HomeworldActor} from './homeworldCity';
/** Invalid/foreign or physically obstructed checkpoints fall back to the real
 * port. Loading grants no visit, greeting, evidence, region or rank. */
export function resolveHomeworldLocationV77(value:unknown,ownerCreatedAt:string){
 const fallback={actor:createHomeworldWorldActorV77(),levelId:'0' as HomeworldLevelV77,interiorId:null as string|null,exterior:createHomeworldWorldActorV77(),restored:false};
 const checkpoint=normalizeHomeworldCheckpointV77(value);
 if(!checkpoint||checkpoint.ownerCreatedAt!==ownerCreatedAt||!homeworldWalkableV77(checkpoint.levelId,checkpoint.exterior))return fallback;
 const exterior={...fallback.actor,...checkpoint.exterior};
 if(!checkpoint.interiorId)return{actor:exterior,exterior,levelId:checkpoint.levelId,interiorId:null,restored:true};
 const building=HOMEWORLD_BUILDINGS_V77.find(b=>b.id===checkpoint.interiorId),room=homeworldInteriorForBuildingV64(checkpoint.interiorId);
 if(!building||building.levelId!==checkpoint.levelId||!room||!checkpoint.local||!isHomeworldInteriorWalkableV64(room,checkpoint.local))return fallback;
 const approach=homeworldBuildingDoorwayV64(building).approach;
 if(Math.hypot(exterior.x-approach.x,exterior.y-approach.y)>32)return fallback;
 return{actor:{...fallback.actor,...checkpoint.local},exterior,levelId:checkpoint.levelId,interiorId:room.buildingId,restored:true};
}
export function createHomeworldCheckpointV77(ownerCreatedAt:string,levelId:HomeworldLevelV77,actor:HomeworldActor,interiorId:string|null,exterior:HomeworldActor):HomeworldCheckpointV77{
 return{version:1,layoutRevision:1,ownerCreatedAt,levelId,exterior:{x:(interiorId?exterior:actor).x,y:(interiorId?exterior:actor).y},interiorId,local:interiorId?{x:actor.x,y:actor.y}:null};
}
