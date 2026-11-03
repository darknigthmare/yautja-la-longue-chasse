import {HOMEWORLD_ARCHIVE_V106 as b,HOMEWORLD_ARCHIVE_SOURCE_V106 as source} from './homeworldArchiveDefinitionV106';
export type ArchiveCaseIdV106='A'|'B';
export type ArchivePhaseV106='choice'|'ready'|'working'|'return'|'interrupted'|'completed';
export interface ArchivePointV106 {x:number;y:number}
export interface ArchiveCaseV106 extends ArchivePointV106 {id:ArchiveCaseIdV106;place:'ground'|'carried'|'support'}
export interface HomeworldArchiveLedgerV106 {
  version:1;ownerCreatedAt:string;revision:number;
  receipt:null|{sceneId:typeof b.sceneId;operationId:typeof b.operationId;sourceSha256:string;sourceCorpusSha256:string;
    phase:ArchivePhaseV106;resumePhase:'working'|'return'|null;last:ArchivePointV106;walked:number;
    cases:[ArchiveCaseV106,ArchiveCaseV106];carrier:ArchiveCaseIdV106|null;pickupWalked:number|null;interruptedCount:number;uncertaintyRecorded:boolean;
  };
}
const record=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,allowed:readonly string[])=>Object.keys(v).length===allowed.length&&Object.keys(v).every(k=>allowed.includes(k));
const number=(v:unknown,max=1_000_000_000):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
const integer=(v:unknown,max:number):v is number=>number(v,max)&&Number.isSafeInteger(v);
const iso=(v:unknown):v is string=>typeof v==='string'&&v.length<=32&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
export const archivePointV106=(v:unknown):v is ArchivePointV106=>record(v)&&keys(v,['x','y'])&&number(v.x,10400)&&number(v.y,6400);
const distance=(a:ArchivePointV106,c:ArchivePointV106)=>Math.hypot(a.x-c.x,a.y-c.y);
export function defaultHomeworldArchiveV106(ownerCreatedAt:string):HomeworldArchiveLedgerV106{return {version:1,ownerCreatedAt,revision:0,receipt:null};}
/** Pure bounded import schema: no geometry mount or runtime action occurs. */
export function normalizeHomeworldArchiveV106(value:unknown):HomeworldArchiveLedgerV106|null {
  if(!record(value)||!keys(value,['version','ownerCreatedAt','revision','receipt'])||value.version!==1||!iso(value.ownerCreatedAt)||!integer(value.revision,1_000_000))return null;
  if(value.receipt===null)return value.revision===0?structuredClone(value) as unknown as HomeworldArchiveLedgerV106:null;
  const r=value.receipt;
  if(!record(r)||!keys(r,['sceneId','operationId','sourceSha256','sourceCorpusSha256','phase','resumePhase','last','walked','cases','carrier','pickupWalked','interruptedCount','uncertaintyRecorded'])||value.revision===0
    ||r.sceneId!==b.sceneId||r.operationId!==b.operationId||r.sourceSha256!==source.source.sha256||r.sourceCorpusSha256!==source.sourceCorpusSha256
    ||!['choice','ready','working','return','interrupted','completed'].includes(String(r.phase))||!archivePointV106(r.last)||!number(r.walked)||!integer(r.interruptedCount,10000)
    ||!(r.carrier===null||r.carrier==='A'||r.carrier==='B')||typeof r.uncertaintyRecorded!=='boolean'||!Array.isArray(r.cases)||r.cases.length!==2)return null;
  let carried=0,supported=0;
  for(let i=0;i<2;i++){
    const c=r.cases[i],definition=b.cases[i],support=b.supports[i];
    if(!record(c)||!keys(c,['id','x','y','place'])||c.id!==definition.id||!number(c.x,10400)||!number(c.y,6400)||!['ground','carried','support'].includes(String(c.place)))return null;
    if(c.place==='carried'){carried++;if(r.carrier!==c.id||distance(c as unknown as ArchivePointV106,r.last)>.001)return null;}
    if(c.place==='support'){supported++;if(c.x!==support.x||c.y!==support.y)return null;}
    if(['choice','ready'].includes(String(r.phase))&&(c.place!=='ground'||c.x!==definition.origin.x||c.y!==definition.origin.y))return null;
  }
  if(carried!==(r.carrier?1:0)||carried>1)return null;
  if(r.carrier?(!number(r.pickupWalked)||r.pickupWalked>r.walked):r.pickupWalked!==null)return null;
  if(r.phase==='interrupted'){
    if(!['working','return'].includes(String(r.resumePhase))||r.interruptedCount===0)return null;
  }else if(r.resumePhase!==null)return null;
  const phase=r.phase==='interrupted'?r.resumePhase:r.phase;
  if(['choice','ready'].includes(String(phase))&&(r.walked!==0||r.carrier||r.uncertaintyRecorded||distance(r.last,b.post)>b.radius))return null;
  if(phase==='working'&&(supported===2||r.uncertaintyRecorded))return null;
  if(['return','completed'].includes(String(phase))&&(supported!==2||r.carrier))return null;
  if((phase==='completed')!==r.uncertaintyRecorded)return null;
  if(phase==='completed'&&distance(r.last,b.post)>b.radius)return null;
  return structuredClone(value) as unknown as HomeworldArchiveLedgerV106;
}
