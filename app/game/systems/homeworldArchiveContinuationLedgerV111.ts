import {HOMEWORLD_ARCHIVE_CONTINUATION_V111 as definition,archiveContinuationOpeningLinesV111} from './homeworldArchiveContinuationDefinitionV111';
import {normalizeHomeworldArchivePlaqueV109,type HomeworldArchivePlaqueV109} from './homeworldArchivePlaqueLedgerV109';

export interface HomeworldArchiveContinuationV111 {
  version:1;ownerCreatedAt:string;revision:number;
  receipt:null|{
    operationId:typeof definition.operationId;
    /** Exact original B JSON, including its source lines, counters and objects. */
    baseLedgerJson:string;
    phase:'offer'|'choice'|'ready'|'active';
    ownerConsent:boolean;
    /** Lines actually heard in this later A episode; B stays in baseLedgerJson. */
    lineIds:string[];
    study:HomeworldArchivePlaqueV109|null;
  };
}
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const exact=(value:Record<string,unknown>,keys:string[])=>Object.keys(value).length===keys.length&&Object.keys(value).every(key=>keys.includes(key));
const integer=(value:unknown,maximum:number)=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=maximum;
const same=(left:unknown,right:unknown)=>JSON.stringify(left)===JSON.stringify(right);
export function archiveContinuationBaseV111(raw:unknown):HomeworldArchivePlaqueV109|null {
  const base=normalizeHomeworldArchivePlaqueV109(raw);
  return base?.receipt?.phase==='completed'&&base.receipt.option==='B'?base:null;
}
export function defaultHomeworldArchiveContinuationV111(ownerCreatedAt:string):HomeworldArchiveContinuationV111 {
  return {version:1,ownerCreatedAt,revision:0,receipt:null};
}
/** No coercion, unreviewed future fields, changed B or substitute objects can
 * enter the continuation. The old document is independently validated too. */
export function normalizeHomeworldArchiveContinuationV111(raw:unknown,liveBase?:unknown):HomeworldArchiveContinuationV111|null {
  if(!record(raw)||!exact(raw,['version','ownerCreatedAt','revision','receipt'])||raw.version!==1
    ||typeof raw.ownerCreatedAt!=='string'||raw.ownerCreatedAt.length>32||!Number.isFinite(Date.parse(raw.ownerCreatedAt))
    ||new Date(raw.ownerCreatedAt).toISOString()!==raw.ownerCreatedAt||!integer(raw.revision,1000000))return null;
  if(raw.receipt===null)return raw.revision===0?structuredClone(raw) as unknown as HomeworldArchiveContinuationV111:null;
  const receipt=raw.receipt;
  if(!record(receipt)||!exact(receipt,['operationId','baseLedgerJson','phase','ownerConsent','lineIds','study'])||raw.revision===0
    ||receipt.operationId!==definition.operationId||typeof receipt.baseLedgerJson!=='string'
    ||receipt.baseLedgerJson.length>definition.maximumBaseBytes||typeof receipt.phase!=='string'
    ||!['offer','choice','ready','active'].includes(receipt.phase)||typeof receipt.ownerConsent!=='boolean'
    ||!Array.isArray(receipt.lineIds)||receipt.lineIds.some(line=>typeof line!=='string')||receipt.lineIds.length>6)return null;
  let parsed:unknown;try{parsed=JSON.parse(receipt.baseLedgerJson);}catch{return null;}
  const base=archiveContinuationBaseV111(parsed);
  if(!base||base.ownerCreatedAt!==raw.ownerCreatedAt||JSON.stringify(base)!==receipt.baseLedgerJson)return null;
  if(arguments.length>=2){const expected=archiveContinuationBaseV111(liveBase);if(!expected||JSON.stringify(expected)!==receipt.baseLedgerJson)return null;}
  if(receipt.phase!=='active'){
    if(receipt.study!==null||receipt.phase!=='ready'&&receipt.ownerConsent
      ||Number(raw.revision)<(receipt.phase==='offer'?1:receipt.phase==='choice'?2:receipt.ownerConsent?4:3)
      ||!same(receipt.lineIds,archiveContinuationOpeningLinesV111(receipt.phase as 'offer'|'choice'|'ready')))return null;
  }else{
    const study=normalizeHomeworldArchivePlaqueV109(receipt.study),before=base.receipt!,after=study?.receipt;
    if(!study||study.ownerCreatedAt!==raw.ownerCreatedAt||!after||after.option!=='A'||!receipt.ownerConsent
      ||Number(raw.revision)<5||study.revision>Number(raw.revision)-4
      ||!['working','return','interrupted','completed'].includes(after.phase)||after.walked<before.walked
      ||after.phase==='interrupted'&&after.resumePhase!=='working'&&after.resumePhase!=='return'
      ||!same(after.objects.slice(0,2),before.objects.slice(0,2))
      ||!same(after.observations.slice(0,before.observations.length),before.observations)
      ||!same(after.provenances.slice(0,before.provenances.length),before.provenances)
      ||!same(receipt.lineIds,after.lineIds))return null;
  }
  return structuredClone(raw) as unknown as HomeworldArchiveContinuationV111;
}
/** Read-only physical/rendering view. It must never be saved as archivePlaqueV109. */
export function archiveContinuationViewV111(ledger:HomeworldArchiveContinuationV111):HomeworldArchivePlaqueV109|null {
  const current=normalizeHomeworldArchiveContinuationV111(ledger);if(!current?.receipt)return null;
  return current.receipt.study??archiveContinuationBaseV111(JSON.parse(current.receipt.baseLedgerJson));
}
export const archiveContinuationActiveV111=(ledger:HomeworldArchiveContinuationV111|undefined)=>!!ledger?.receipt
  &&ledger.receipt.phase!=='offer'&&(ledger.receipt.phase!=='active'||ledger.receipt.study?.receipt?.phase!=='completed');
export const archiveContinuationStudyPhaseV111=(ledger:HomeworldArchiveContinuationV111)=>ledger.receipt?.phase==='active'
  ?ledger.receipt.study?.receipt?.phase:ledger.receipt?.phase;
export function archiveContinuationWalkedV111(ledger:HomeworldArchiveContinuationV111):number {
  const current=normalizeHomeworldArchiveContinuationV111(ledger);if(!current?.receipt?.study)return 0;
  const base=archiveContinuationBaseV111(JSON.parse(current.receipt.baseLedgerJson));
  return Math.max(0,current.receipt.study.receipt!.walked-base!.receipt!.walked);
}
