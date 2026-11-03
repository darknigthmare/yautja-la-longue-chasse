import {normalizeHomeworldCheckpointV77,type HomeworldCheckpointV77} from './homeworldCheckpointV77';
import {normalizeHomeworldCartographyV104} from './homeworldCartographyLedgerV104';
import {normalizeHomeworldCartographyV105} from './homeworldCartographyLedgerV105';
import {normalizeHomeworldArchiveV106} from './homeworldArchiveLedgerV106';
import {normalizeHomeworldArchiveComparisonV107} from './homeworldArchiveComparisonLedgerV107';
import {normalizeHomeworldCargoV108,type HomeworldCargoV108} from './homeworldCargoLedgerV108';
import {normalizeHomeworldArchivePlaqueV109} from './homeworldArchivePlaqueLedgerV109';
import {normalizeHomeworldArchiveContinuationV111} from './homeworldArchiveContinuationLedgerV111';

export const HOMEWORLD_ARRIVAL_RECOVERY_OPERATION_V111='homeworld-confirmed-exterior-restore-v111' as const;
export const HOMEWORLD_ARRIVAL_RECOVERY_MAX_SNAPSHOT_BYTES_V111=512*1024;
export const HOMEWORLD_ARRIVAL_RECOVERY_LEDGER_KEYS_V111=[
  'cartographyV104','cartographyV105','archiveV106','archiveComparisonV107',
  'cargoV108','archivePlaqueV109','archiveContinuationV111',
] as const;
export type HomeworldArrivalRecoveryLedgerKeyV111=typeof HOMEWORLD_ARRIVAL_RECOVERY_LEDGER_KEYS_V111[number];
export type HomeworldArrivalRecoveryLedgersV111=Partial<Record<HomeworldArrivalRecoveryLedgerKeyV111,unknown>>;
export interface HomeworldArrivalRecoveryPointV111{x:number;y:number}
export interface HomeworldArrivalRecoveryV111 {
  version:1;ownerCreatedAt:string;revision:0|1;
  receipt:null|{
    operationId:typeof HOMEWORLD_ARRIVAL_RECOVERY_OPERATION_V111;
    buildingId:string;source:'cargoV108:last';sourceRevision:number;
    /** The prior saved values are retained as JSON, not rewritten as new history. */
    originalCheckpointJson:string;originalLedgersJson:string;
    exitLocal:HomeworldArrivalRecoveryPointV111;restoredCheckpoint:HomeworldCheckpointV77;
  };
}
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const exact=(value:Record<string,unknown>,keys:readonly string[])=>Object.keys(value).length===keys.length&&Object.keys(value).every(key=>keys.includes(key));
const iso=(value:unknown):value is string=>typeof value==='string'&&value.length<=32&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
const point=(value:unknown,max=2400):value is HomeworldArrivalRecoveryPointV111=>record(value)&&exact(value,['x','y'])
  &&typeof value.x==='number'&&typeof value.y==='number'&&Number.isFinite(value.x)&&Number.isFinite(value.y)
  &&value.x>=-480&&value.x<=max&&value.y>=-1600&&value.y<=max;
const same=(left:{x:number;y:number},right:{x:number;y:number})=>left.x===right.x&&left.y===right.y;
const encodedWithin=(value:unknown,maximum:number):value is string=>typeof value==='string'&&value.length<=maximum&&new TextEncoder().encode(value).byteLength<=maximum;

/** Select the operation documents only. Undefined optional values stay absent;
 * no gameplay document, counter, owner or object is normalized into a new one. */
export function homeworldArrivalRecoveryLedgersV111(progress:HomeworldArrivalRecoveryLedgersV111):HomeworldArrivalRecoveryLedgersV111 {
  const selected:HomeworldArrivalRecoveryLedgersV111={};
  for(const key of HOMEWORLD_ARRIVAL_RECOVERY_LEDGER_KEYS_V111)if(progress[key]!==undefined)selected[key]=progress[key];
  return selected;
}

/** The backup has the same strict source documents as the ordinary save.
 * No active carried object can silently travel with a restored checkpoint. */
export function inspectHomeworldArrivalRecoveryLedgersV111(value:unknown,ownerCreatedAt:string):{ledgers:HomeworldArrivalRecoveryLedgersV111;cargo:HomeworldCargoV108}|null {
  if(!record(value)||Object.keys(value).some(key=>!HOMEWORLD_ARRIVAL_RECOVERY_LEDGER_KEYS_V111.includes(key as HomeworldArrivalRecoveryLedgerKeyV111)))return null;
  const validators={cartographyV104:normalizeHomeworldCartographyV104,cartographyV105:normalizeHomeworldCartographyV105,
    archiveV106:normalizeHomeworldArchiveV106,archiveComparisonV107:normalizeHomeworldArchiveComparisonV107,
    cargoV108:normalizeHomeworldCargoV108,archivePlaqueV109:normalizeHomeworldArchivePlaqueV109};
  for(const key of HOMEWORLD_ARRIVAL_RECOVERY_LEDGER_KEYS_V111){
    if(!Object.hasOwn(value,key))continue;
    const raw=value[key];
    const normalized=key==='archiveContinuationV111'?normalizeHomeworldArchiveContinuationV111(raw,value.archivePlaqueV109):validators[key](raw);
    if(!normalized||normalized.ownerCreatedAt!==ownerCreatedAt)return null;
    const receipt=normalized.receipt;
    if(!receipt)continue;
    const active=key==='archiveContinuationV111'&&'study' in receipt?receipt.study?.receipt:receipt;
    if(active&&('carrier' in active&&active.carrier!==null||'evidence' in active&&active.evidence.place==='carried'))return null;
    if(active&&typeof active.phase!=='string')return null;
    if(active&&['working','walking','search','carrying','compare','return'].includes(active.phase))return null;
  }
  const cargo=normalizeHomeworldCargoV108(value.cargoV108);
  if(!cargo||cargo.ownerCreatedAt!==ownerCreatedAt||cargo.receipt?.phase!=='interrupted'||cargo.receipt.carrier!==null)return null;
  return {ledgers:structuredClone(value) as HomeworldArrivalRecoveryLedgersV111,cargo};
}

export function defaultHomeworldArrivalRecoveryV111(ownerCreatedAt:string):HomeworldArrivalRecoveryV111 {
  return {version:1,ownerCreatedAt,revision:0,receipt:null};
}

/** Shape/source validation only: loading an audit receipt grants no move.
 * The actual door, full-body floor and current load checks live in the runtime
 * planner and are repeated at the explicit confirmation event. */
export function normalizeHomeworldArrivalRecoveryV111(value:unknown):HomeworldArrivalRecoveryV111|null {
  if(!record(value)||!exact(value,['version','ownerCreatedAt','revision','receipt'])||value.version!==1||!iso(value.ownerCreatedAt)
    ||value.revision!==0&&value.revision!==1)return null;
  if(value.receipt===null)return value.revision===0?structuredClone(value) as unknown as HomeworldArrivalRecoveryV111:null;
  const receipt=value.receipt;
  if(value.revision!==1||!record(receipt)||!exact(receipt,['operationId','buildingId','source','sourceRevision','originalCheckpointJson','originalLedgersJson','exitLocal','restoredCheckpoint'])
    ||receipt.operationId!==HOMEWORLD_ARRIVAL_RECOVERY_OPERATION_V111||receipt.source!=='cargoV108:last'
    ||typeof receipt.buildingId!=='string'||!receipt.buildingId.length||receipt.buildingId.length>=100
    ||typeof receipt.sourceRevision!=='number'||!Number.isSafeInteger(receipt.sourceRevision)||receipt.sourceRevision<1||receipt.sourceRevision>1e6
    ||!encodedWithin(receipt.originalCheckpointJson,8192)||!encodedWithin(receipt.originalLedgersJson,HOMEWORLD_ARRIVAL_RECOVERY_MAX_SNAPSHOT_BYTES_V111)
    ||!point(receipt.exitLocal))return null;
  let original:unknown,documents:unknown;
  try{original=JSON.parse(receipt.originalCheckpointJson);documents=JSON.parse(receipt.originalLedgersJson);}catch{return null;}
  if(!record(receipt.restoredCheckpoint)||!exact(receipt.restoredCheckpoint,['version','layoutRevision','ownerCreatedAt','levelId','exterior','interiorId','local'])
    ||!point(receipt.restoredCheckpoint.exterior,10400))return null;
  const checkpoint=normalizeHomeworldCheckpointV77(original),restored=normalizeHomeworldCheckpointV77(receipt.restoredCheckpoint);
  const source=inspectHomeworldArrivalRecoveryLedgersV111(documents,value.ownerCreatedAt);
  if(!checkpoint||typeof checkpoint.levelId!=='string'||checkpoint.levelId!=='0'||checkpoint.ownerCreatedAt!==value.ownerCreatedAt
    ||checkpoint.interiorId!==receipt.buildingId||!checkpoint.local||!restored||restored.ownerCreatedAt!==value.ownerCreatedAt
    ||restored.levelId!=='0'||restored.interiorId!==null||restored.local!==null||!source
    ||source.cargo.revision!==receipt.sourceRevision||!same(restored.exterior,source.cargo.receipt!.last)
    ||Math.hypot(restored.exterior.x-checkpoint.exterior.x,restored.exterior.y-checkpoint.exterior.y)>128)return null;
  return structuredClone(value) as unknown as HomeworldArrivalRecoveryV111;
}
