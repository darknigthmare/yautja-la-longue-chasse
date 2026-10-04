import type {SaveGame} from '../types';
import {HOMEWORLD_BUILDINGS_V77,HOMEWORLD_POINTS_V77,HOMEWORLD_DISTRICTS_V77,HOMEWORLD_CONNECTORS_V77,type HomeworldLevelV77} from './homeworldWorldV77';
import {homeworldBuildingDoorwayV64} from './homeworldGeometryV64';
import {homeworldInteriorForPointV64,homeworldInteriorForBuildingV64} from './homeworldInteriorsV64';
import {homeworldWayfindingDestinationsV75} from './homeworldWayfindingV75';

export interface HomeworldAtlasLandmarkV83 {
 readonly id:string;readonly label:string;readonly detail:string;readonly levelId:HomeworldLevelV77;
 readonly district:string;readonly category:'building'|'service'|'person'|'region'|'transport'|'evidence';
 readonly buildingId:string|null;readonly pointId:string|null;readonly regionId:string|null;
 readonly position:{readonly x:number;readonly y:number};readonly access:'open'|'restricted'|'locked';
 readonly reason:string;readonly keywords:readonly string[];
}

/** V75 supplies narrative visibility/descriptions ONLY. Every physical point
 * comes from the real multi-floor world and current interior bindings. The
 * old single-floor routes/port coordinates are never requested by this atlas. */
export function homeworldAtlasLandmarksV83(save?:SaveGame):readonly HomeworldAtlasLandmarkV83[]{
 const metadata=new Map(save?homeworldWayfindingDestinationsV75(save).map(record=>[record.id,record] as const):[]);
 const district=(id:string)=>HOMEWORLD_DISTRICTS_V77.find(d=>d.id===id)?.name??'Cité';
 const buildings=HOMEWORLD_BUILDINGS_V77.map(building=>{
  const id='building:'+building.id,meta=metadata.get(id),room=homeworldInteriorForBuildingV64(building.id);
  return{id,label:meta?.label??building.label,detail:room?.title??building.label,levelId:building.levelId,
   district:district(building.districtId),category:'building' as const,buildingId:building.id,pointId:null,regionId:null,
   position:homeworldBuildingDoorwayV64(building).approach,access:meta?.access??'open',
   reason:meta?.reason??'Porte physique visitable. Les activités intérieures conservent les conditions de ta partie.',keywords:meta?.keywords??[]};
 });
 const points=HOMEWORLD_POINTS_V77.flatMap(point=>{
  const region=point.kind==='region'&&point.regionId?point.regionId:null;
  const id=region?'region:'+region:'point:'+point.id,meta=metadata.get(id);
  // An ordinary closed departure remains visible with its real restriction.
  // A sensitive reserve remains absent until its narrative authority reveals it.
  if(region==='forbidden-reserve'&&(!save||!meta))return[];
  const room=homeworldInteriorForPointV64(point.id),building=room?HOMEWORLD_BUILDINGS_V77.find(b=>b.id===room.buildingId):null;
  const category:HomeworldAtlasLandmarkV83['category']=region?'region':point.kind==='service'?'service'
   :point.kind==='ship'?'transport':point.kind==='evidence'?'evidence':'person';
  return[{id,label:meta?.label??point.label,detail:meta?.detail??room?.title??point.label,
   levelId:building?.levelId??point.levelId,district:district(building?.districtId??point.districtId),category,
   buildingId:building?.id??null,pointId:point.id,regionId:region,
   position:building?homeworldBuildingDoorwayV64(building).approach:{x:point.x,y:point.y},
   access:meta?.access??(region?'locked':'open'),reason:meta?.reason??(region?'Consulte les conditions de ce départ sur place.':'Rejoins le lieu et interagis ; consulter ce repère ne valide aucune action.'),
   keywords:meta?.keywords??[]}];
 });
 return[...points,...buildings];
}

/** Accept IDs from old NPC advice, direct points and the current register.
 * Aliases resolve to live records; no approximate coordinate is stored. */
export function homeworldAtlasTargetV83(records:readonly HomeworldAtlasLandmarkV83[],requested?:string|null){
 if(!requested)return null;
 return records.find(record=>record.id===requested||record.pointId===requested||record.buildingId===requested||record.regionId===requested)??null;
}
const clean=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').replace(/[’']/g,' ');
export function homeworldAtlasSearchV83(records:readonly HomeworldAtlasLandmarkV83[],query:string){
 const tokens=clean(query).trim().split(/\s+/).filter(Boolean);
 return records.filter(record=>tokens.every(token=>clean([record.label,record.detail,record.district,record.levelId,...record.keywords].join(' ')).includes(token)));
}

/** A topology hint, not a verified shortest/walkable route. The hunter still
 * reaches real blue landing markers and interacts physically. Calling this
 * function neither starts a transit nor moves the cabin or grants access. */
export function homeworldAtlasFloorLinksV83(from:HomeworldLevelV77,to:HomeworldLevelV77){
 const queue=[{level:from,links:[] as {id:string;name:string;from:HomeworldLevelV77;to:HomeworldLevelV77}[]}],seen=new Set<HomeworldLevelV77>([from]);
 for(let i=0;i<queue.length;i++){
  const state=queue[i];if(state.level===to)return state.links;
  for(const connector of HOMEWORLD_CONNECTORS_V77){
   const endpoint=connector.from.levelId===state.level?connector.to:connector.to.levelId===state.level?connector.from:null;
   if(!endpoint||seen.has(endpoint.levelId))continue;seen.add(endpoint.levelId);
   queue.push({level:endpoint.levelId,links:[...state.links,{id:connector.id,name:connector.name,from:state.level,to:endpoint.levelId}]});
  }
 }return null;
}
