import {homeworldArchiveComparisonCollisionV107} from './homeworldArchiveComparisonSolidsV107';
import {HOMEWORLD_ACTOR,stepHomeworldActorOnFloor,type HomeworldActor,type HomeworldInput,type HomeworldFootprint,type HomeworldVec2} from './homeworldCity';
import {HOMEWORLD_SPACEPORT_V77,HOMEWORLD_CONNECTORS_V77,type HomeworldLevelV77} from './homeworldWorldV77';
import {homeworldUrbanTerrainV78,homeworldUrbanCollisionV78} from './homeworldStreetModulesV78';
import {HOMEWORLD_CIVIC_PROPS_V80,homeworldCivicTouchesV80} from './homeworldCivicDecorV80';
import {homeworldArchiveCollisionV106} from './homeworldArchiveSolidsV106';
import {cargoFixedCollisionV108} from './homeworldCargoSolidsV108';
import './homeworldPublicPlacesMountV112';

/** Presentation and movement read the same new measured solids. Terrain,
 * speed, body, floor IDs and checkpoint schema are inherited unchanged. */
export function homeworldCivicCollisionV80(level:HomeworldLevelV77,point:HomeworldVec2,body:HomeworldFootprint=HOMEWORLD_ACTOR){
 const old=homeworldUrbanCollisionV78(level,point,body);if(old)return old;
 const item=HOMEWORLD_CIVIC_PROPS_V80.find(p=>p.levelId===level&&homeworldCivicTouchesV80(p,point,body));
 if(item)return {kind:'prop' as const,id:item.id};
 const archive=homeworldArchiveCollisionV106(level,point,body);
 if(archive)return {kind:'prop' as const,id:archive};
 const comparison=homeworldArchiveComparisonCollisionV107(level,point,body);if(comparison)return{kind:'prop' as const,id:comparison};
 const cargo=cargoFixedCollisionV108(level,point,body);return cargo?{kind:'prop' as const,id:cargo}:null;
}
export const homeworldCivicWalkableV80=(level:HomeworldLevelV77,point:HomeworldVec2,body:HomeworldFootprint=HOMEWORLD_ACTOR)=>
 homeworldUrbanTerrainV78(level,point,body)&&!homeworldCivicCollisionV80(level,point,body);
export function stepHomeworldCivicActorV80(actor:HomeworldActor,input:HomeworldInput,seconds:number,level:HomeworldLevelV77):HomeworldActor{
 const landing=level==='0'?HOMEWORLD_SPACEPORT_V77.spawn:HOMEWORLD_CONNECTORS_V77.flatMap(c=>[c.from,c.to]).find(s=>s.levelId===level&&homeworldCivicWalkableV80(level,s.point))?.point;
 if(!landing)throw Error('No supported civic landing for '+level);
 return stepHomeworldActorOnFloor(actor,input,seconds,p=>homeworldCivicWalkableV80(level,p),()=>({...actor,...landing,vx:0,vy:0}));
}
