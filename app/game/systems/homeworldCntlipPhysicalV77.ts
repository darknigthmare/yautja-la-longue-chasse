import type { SaveGame } from '../types';
import type { HomeworldInteriorV64, InteriorGroundPointV64 } from './homeworldInteriorsV64';
import type { HomeworldFurnitureInstanceV72 } from './homeworldFurnitureV72';
import {homeworldCivilianArtV72,type HomeworldCivilianRoleV72} from './homeworldIdentityV72';
import { getChronicleRank } from './clanChronicle';
import type { CntlipContextV77, CntlipRankV77, CntlipSiteIdV77 } from './cntlipV77';

/** Original reception inhabitants. No existing service NPC is moved or cloned.
 * Locations use the same unprojected ground plane as movement and collision. */
export const HOMEWORLD_CNTLIP_HOSTS_V77 = [
  { id:'clan-table-healer', siteId:'clan-common', buildingId:'clan-lodge', name:'Soigneuse de relève', role:'healer', x:330, y:130,
    tableId:'clan-lodge-v72-role-east', approach:{x:404,y:130} },
  { id:'market-table-artisan', siteId:'market-halt', buildingId:'market-canopy', name:'Artisane des délégations', role:'artisan', x:350, y:154,
    tableId:'market-canopy-v74-table', approach:{x:269,y:168} },
  { id:'pit-table-attendant', siteId:'pit-rest', buildingId:'pit-gate', name:'Préposé à la halte des Chroniques', role:'arena-steward', x:300, y:188,
    tableId:'pit-gate-v77-cntlip-table', approach:{x:245,y:225} },
  { id:'court-table-herald', siteId:'council-gathering', buildingId:'throne-audience', name:'Porte-parole de la cour locale', role:'herald', x:330, y:170,
    tableId:'throne-audience-v77-cntlip-table', approach:{x:410,y:183} },
] as const satisfies readonly {id:string;siteId:CntlipSiteIdV77;buildingId:string;name:string;role:HomeworldCivilianRoleV72;x:number;y:number;tableId:string;approach:InteriorGroundPointV64}[];
export const HOMEWORLD_CNTLIP_HOST_ASSETS_V77=[...new Map(HOMEWORLD_CNTLIP_HOSTS_V77.map(host=>{
  const art=homeworldCivilianArtV72(host.role);return [art.src,{src:art.src,sourceWidth:art.sourceWidth,sourceHeight:art.sourceHeight,kind:'scene' as const}];
})).values()];

const addedTables:Readonly<Record<string,HomeworldFurnitureInstanceV72>>={
  'pit-gate':{id:'pit-gate-v77-cntlip-table',artId:'meal-table',x:185,y:225,scale:.40},
  'throne-audience':{id:'throne-audience-v77-cntlip-table',artId:'meal-table',x:410,y:141,scale:.62},
};
export function homeworldCntlipInteriorV77(room:HomeworldInteriorV64):HomeworldInteriorV64 {
  const table=addedTables[room.buildingId];
  return !table || room.furniture?.some(item=>item.id===table.id) ? room : {...room,furniture:[...(room.furniture??[]),table]};
}
export function homeworldCntlipHostV77(room:HomeworldInteriorV64|null) {
  if(!room)return null;
  const host=HOMEWORLD_CNTLIP_HOSTS_V77.find(item=>item.buildingId===room.buildingId);
  // A venue is not available when its measured native table is missing.
  return host&&room.furniture?.some(table=>table.id===host.tableId&&table.artId==='meal-table')?host:null;
}
export function homeworldCntlipHostTouchesV77(room:HomeworldInteriorV64,point:InteriorGroundPointV64,footprint={halfWidth:24,halfDepth:14}) {
  const host=homeworldCntlipHostV77(room);
  return !!host && Math.abs(point.x-host.x)<16+footprint.halfWidth && Math.abs(point.y-host.y)<10+footprint.halfDepth;
}
export function homeworldCntlipReachedV77(room:HomeworldInteriorV64|null,actor:InteriorGroundPointV64) {
  const host=homeworldCntlipHostV77(room);
  if(!host||!room)return null;
  const table=room.furniture!.find(item=>item.id===host.tableId)!;
  const distance=Math.hypot(actor.x-table.x,actor.y-table.y);
  return Number.isFinite(distance)&&distance<=70&&Math.hypot(actor.x-host.x,actor.y-host.y)<=140?host:null;
}
export function homeworldCntlipEligibleV77(save:Pick<SaveGame,'profile'|'prologue'|'homeworld'>) {
  if(!save.prologue)return true; // Preserved autonomous adult legacy campaign.
  const rank=getChronicleRank(save.prologue.chronicle);
  return save.prologue.status==='completed' && save.homeworld.greetedNpcIds.includes('hunt-king') &&
    ['young-blood','blooded','elite','elder','ancient'].includes(rank??'');
}
/** Context is rebuilt from current physical refs for every action. Neither
 * actions nor UI can assert that a remote NPC, table or adult rite is present. */
export function homeworldCntlipContextV77(input:{save:SaveGame;room:HomeworldInteriorV64|null;actor:InteriorGroundPointV64&{vx:number;vy:number;grounded:boolean};sceneActive:boolean;seatedSiteId:CntlipSiteIdV77|null;servingStock:number}):CntlipContextV77 {
  const host=homeworldCntlipReachedV77(input.room,input.actor);
  const table=host&&input.room?.furniture?.find(item=>item.id===host.tableId);
  const rank=(input.save.prologue?getChronicleRank(input.save.prologue.chronicle):input.save.profile.rankId)??'youngling';
  return {place:'homeworld',siteId:host?.siteId??null,buildingId:input.room?.buildingId??null,
    siteDistance:table?Math.hypot(input.actor.x-table.x,input.actor.y-table.y):Number.POSITIVE_INFINITY,
    actorStationary:Math.hypot(input.actor.vx,input.actor.vy)<1&&input.actor.grounded,
    seated:!!host&&input.seatedSiteId===host.siteId,safe:!!host&&homeworldCntlipEligibleV77(input.save),
    inCombat:false,sceneActive:input.sceneActive,rank:rank as CntlipRankV77,
    participants:host&&table?[{id:host.id,siteId:host.siteId,distanceToSite:Math.hypot(host.x-table.x,host.y-table.y),availableForConversation:true}]:[],
    servingStock:input.servingStock,ownsShipMess:false,ownsBeverageStock:false,audienceAlreadyGranted:!!input.save.homeworld.audienceOutcome};
}
