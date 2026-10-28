import './homeworldStreetCompositionMountV92';
import type {HomeworldCheckpointV77} from './homeworldCheckpointV77';
import {normalizeHomeworldCheckpointV77} from './homeworldCheckpointV77';
import {HOMEWORLD_BUILDINGS_V77,type HomeworldLevelV77} from './homeworldWorldV77';
import {homeworldBuildingDoorwayV64} from './homeworldGeometryV64';
import {homeworldInteriorForBuildingV64,isHomeworldInteriorWalkableV64,nearestHomeworldInteriorTargetV64} from './homeworldInteriorsV64';
import {resolveHomeworldLocationV77} from './homeworldLocationV77';
import {cargoCaseCollisionV108} from './homeworldCargoV108';
import {homeworldExteriorArrivalAllowedV110} from './homeworldTransitionsV110';
import {
  HOMEWORLD_ARRIVAL_RECOVERY_OPERATION_V111,HOMEWORLD_ARRIVAL_RECOVERY_MAX_SNAPSHOT_BYTES_V111,
  HOMEWORLD_ARRIVAL_RECOVERY_LEDGER_KEYS_V111,type HomeworldArrivalRecoveryLedgerKeyV111,
  defaultHomeworldArrivalRecoveryV111,normalizeHomeworldArrivalRecoveryV111,homeworldArrivalRecoveryLedgersV111,
  inspectHomeworldArrivalRecoveryLedgersV111,type HomeworldArrivalRecoveryV111,type HomeworldArrivalRecoveryLedgersV111,
} from './homeworldArrivalRecoveryLedgerV111';

export const HOMEWORLD_ARRIVAL_RECOVERY_RADIUS_V111=96;
export interface HomeworldArrivalRecoveryContextV111 {
  ownerCreatedAt:string;currentOwnerCreatedAt:string;
  checkpoint:unknown;ledgers:HomeworldArrivalRecoveryLedgersV111;
  actor:{x:number;y:number};levelId:HomeworldLevelV77;interiorId:string|null;
  active:boolean;inTransit?:boolean;
}
export interface HomeworldArrivalRecoveryPlanV111 {
  /** Exact current values, not a collision-prone digest or an opening-time permission. */
  key:string;ownerCreatedAt:string;buildingId:string;source:'cargoV108:last';
  from:{x:number;y:number};to:{x:number;y:number};
  checkpoint:HomeworldCheckpointV77;ledger:HomeworldArrivalRecoveryV111;
}
export interface HomeworldArrivalRecoveryInspectionV111 {ok:boolean;reason:string;plan:HomeworldArrivalRecoveryPlanV111|null}
export interface HomeworldArrivalRecoveryResultV111 {
  ok:boolean;changed:boolean;ledger:HomeworldArrivalRecoveryV111;message:string;
  checkpoint?:HomeworldCheckpointV77;writeRefused?:boolean;stale?:boolean;
}
const refusal=(reason:string):HomeworldArrivalRecoveryInspectionV111=>({ok:false,reason,plan:null});

/** Restore one nearby recorded exterior checkpoint; do not invent a walk out
 * through the occupied door. A cargo source is the durable last foot position
 * of an interrupted, empty-handed operation, not a guessed radial offset. */
export function planHomeworldArrivalRecoveryV111(ledger:HomeworldArrivalRecoveryV111,context:HomeworldArrivalRecoveryContextV111):HomeworldArrivalRecoveryInspectionV111 {
  const current=normalizeHomeworldArrivalRecoveryV111(ledger);
  if(!current||current.ownerCreatedAt!==context.ownerCreatedAt||context.currentOwnerCreatedAt!==context.ownerCreatedAt)
    return refusal('La partie ou le registre de restauration a changé.');
  if(current.receipt)return refusal('Le point extérieur déjà restauré est conservé dans le registre.');
  if(!context.active||context.inTransit||!context.interiorId||context.levelId!=='0'
    ||![context.actor.x,context.actor.y].every(Number.isFinite))return refusal('Rejoins la sortie de cet intérieur et reprends le jeu pour consulter les points conservés.');
  const checkpoint=normalizeHomeworldCheckpointV77(context.checkpoint);
  if(!checkpoint||typeof checkpoint.levelId!=='string'||checkpoint.ownerCreatedAt!==context.ownerCreatedAt
    ||checkpoint.levelId!=='0'||checkpoint.interiorId!==context.interiorId)return refusal('Aucun ancien point intérieur de cette partie ne peut être restauré ici.');
  const building=HOMEWORLD_BUILDINGS_V77.find(entry=>entry.id===context.interiorId&&entry.levelId==='0');
  const room=building&&homeworldInteriorForBuildingV64(building.id),restored=resolveHomeworldLocationV77(checkpoint,context.ownerCreatedAt);
  if(!building||!room||!restored.restored||restored.interiorId!==room.buildingId
    ||!isHomeworldInteriorWalkableV64(room,context.actor)||nearestHomeworldInteriorTargetV64(room,context.actor)?.kind!=='exit')
    return refusal('La restauration se demande au vrai seuil intérieur de cette porte.');
  if(!context.ledgers||typeof context.ledgers!=='object'||Array.isArray(context.ledgers)
    ||Object.keys(context.ledgers).some(key=>!HOMEWORLD_ARRIVAL_RECOVERY_LEDGER_KEYS_V111.includes(key as HomeworldArrivalRecoveryLedgerKeyV111)))
    return refusal('Un document inconnu empêche de conserver les relevés sans modification.');
  let originalCheckpointJson:string,originalLedgersJson:string;
  try{
    originalCheckpointJson=JSON.stringify(context.checkpoint);
    originalLedgersJson=JSON.stringify(homeworldArrivalRecoveryLedgersV111(context.ledgers));
  }catch{return refusal('Les documents actuels ne peuvent pas être conservés sans modification.');}
  if(new TextEncoder().encode(originalCheckpointJson).byteLength>8192
    ||new TextEncoder().encode(originalLedgersJson).byteLength>HOMEWORLD_ARRIVAL_RECOVERY_MAX_SNAPSHOT_BYTES_V111)
    return refusal('Les documents dépassent la taille admise pour une restauration conservée.');
  const documents=inspectHomeworldArrivalRecoveryLedgersV111(JSON.parse(originalLedgersJson),context.ownerCreatedAt);
  if(!documents)return refusal('Aucun relevé extérieur interrompu, sans charge portée et du même propriétaire ne peut être utilisé.');
  const cargo=documents.cargo,source=cargo.receipt!;
  if(!cargoCaseCollisionV108(cargo,checkpoint.exterior))return refusal('L’ancien ancrage est libre : utilise la sortie ordinaire.');
  const approach=homeworldBuildingDoorwayV64(building).approach;
  if(Math.hypot(source.last.x-approach.x,source.last.y-approach.y)>HOMEWORLD_ARRIVAL_RECOVERY_RADIUS_V111)
    return refusal('Le dernier point extérieur conservé est trop éloigné de cette porte.');
  if(!homeworldExteriorArrivalAllowedV110('0',source.last,cargo,context.ownerCreatedAt))
    return refusal('Le dernier point extérieur conservé n’est plus libre pour ton corps entier.');
  const nextCheckpoint:HomeworldCheckpointV77={version:1,layoutRevision:1,ownerCreatedAt:context.ownerCreatedAt,levelId:'0',exterior:{...source.last},interiorId:null,local:null};
  const next:HomeworldArrivalRecoveryV111={version:1,ownerCreatedAt:context.ownerCreatedAt,revision:1,receipt:{
    operationId:HOMEWORLD_ARRIVAL_RECOVERY_OPERATION_V111,buildingId:building.id,source:'cargoV108:last',sourceRevision:cargo.revision,
    originalCheckpointJson,originalLedgersJson,exitLocal:{x:context.actor.x,y:context.actor.y},restoredCheckpoint:nextCheckpoint,
  }};
  if(!normalizeHomeworldArrivalRecoveryV111(next))return refusal('La restauration ne conserve pas les documents attendus.');
  const key=JSON.stringify([context.ownerCreatedAt,current.revision,originalCheckpointJson,originalLedgersJson,context.actor.x,context.actor.y]);
  return {ok:true,reason:'Ce point extérieur avait déjà été enregistré. Le restaurer conserve l’ancien point intérieur et tous les relevés, sans déplacer les charges ni compter de marche.',
    plan:{key,ownerCreatedAt:context.ownerCreatedAt,buildingId:building.id,source:'cargoV108:last',from:{...checkpoint.exterior},to:{...source.last},checkpoint:nextCheckpoint,ledger:next}};
}

/** The host commits checkpoint + audit backup with one durable save. On quota,
 * conflict or replaced context, it must retain/roll back its live actor refs;
 * this function never mutates them or announces success before acknowledgement. */
export function createHomeworldArrivalRecoveryTransactionV111(
  readLedger:()=>HomeworldArrivalRecoveryV111,
  readContext:()=>HomeworldArrivalRecoveryContextV111,
  persistAtomic:(proposal:{checkpoint:HomeworldCheckpointV77;ledger:HomeworldArrivalRecoveryV111})=>boolean,
) {
  return (expectedPlanKey:string):HomeworldArrivalRecoveryResultV111=>{
    const before=readLedger(),inspection=planHomeworldArrivalRecoveryV111(before,readContext());
    if(!inspection.plan)return {ok:false,changed:false,ledger:before,message:inspection.reason};
    if(typeof expectedPlanKey!=='string'||inspection.plan.key!==expectedPlanKey)
      return {ok:false,changed:false,ledger:before,message:'Le lieu, les charges ou les relevés ont changé. Consulte de nouveau le point conservé.',stale:true};
    const plan=inspection.plan;
    let acknowledged=false;
    try{acknowledged=persistAtomic({checkpoint:structuredClone(plan.checkpoint),ledger:structuredClone(plan.ledger)})===true;}catch{acknowledged=false;}
    if(!acknowledged)return {ok:false,changed:false,ledger:before,message:'La restauration n’a pas été enregistrée. Tu conserves ton point intérieur et tes relevés ; réessaie ici.',writeRefused:true};
    return {ok:true,changed:true,ledger:plan.ledger,checkpoint:plan.checkpoint,message:'Dernier point extérieur restauré. L’ancien point intérieur et les relevés sont conservés ; aucune charge ni progression n’a changé.'};
  };
}

export {defaultHomeworldArrivalRecoveryV111};
