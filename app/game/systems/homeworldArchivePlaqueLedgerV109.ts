import {HOMEWORLD_ARCHIVE_PLAQUE_V109 as b,HOMEWORLD_ARCHIVE_PLAQUE_SOURCE_V109 as source,HOMEWORLD_ARCHIVE_PLAQUE_ART_V109 as art,archivePlaqueSourceLineV109,type ArchivePlaqueIdV109} from './homeworldArchivePlaqueDefinitionV109';
export interface ArchivePlaquePointV109 {x:number;y:number}
export type ArchivePlaquePhaseV109='offer'|'choice'|'ready'|'working'|'return'|'interrupted'|'completed';
export interface ArchivePlaqueObjectV109 extends ArchivePlaquePointV109 {id:ArchivePlaqueIdV109;place:'source'|'ground'|'carried'|'support'}
export interface HomeworldArchivePlaqueV109 {
  version:1;ownerCreatedAt:string;revision:number;
  receipt:null|{
    sceneId:typeof b.sceneId;operationId:typeof b.operationId;sourceSha256:string;sourceCorpusSha256:string;artSha256:string;
    phase:ArchivePlaquePhaseV109;resumePhase:'working'|'return'|null;option:'A'|'B'|null;
    last:ArchivePlaquePointV109;walked:number;objects:ArchivePlaqueObjectV109[];carrier:ArchivePlaqueIdV109|null;pickupWalked:number|null;
    observations:ArchivePlaqueIdV109[];provenances:ArchivePlaqueIdV109[];ownerConsent:boolean;
    edgeObserved:boolean;mismatchObserved:boolean;failureSpoken:boolean;resumeSpoken:boolean;fragmentCompared:boolean;
    interruptedCount:number;lineIds:string[];
  };
}
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v:Record<string,unknown>,keys:readonly string[])=>Object.keys(v).length===keys.length&&Object.keys(v).every(k=>keys.includes(k));
const integer=(v:unknown,max=1e9):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=max;
const number=(v:unknown,max=1e9):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
export const archivePlaquePointV109=(v:unknown):v is ArchivePlaquePointV109=>record(v)&&exact(v,['x','y'])&&number(v.x,10400)&&number(v.y,6400);
const same=(a:ArchivePlaquePointV109,c:ArchivePlaquePointV109)=>Math.hypot(a.x-c.x,a.y-c.y)<.001;
const ids=['plaque','trace','fragment'] as const;
const list=(v:unknown):v is ArchivePlaqueIdV109[]=>Array.isArray(v)&&v.length<=3&&new Set(v).size===v.length&&v.every(x=>ids.includes(x));
export const archivePlaqueWorkingV109=(phase:string)=>phase==='working'||phase==='return';
export function defaultHomeworldArchivePlaqueV109(ownerCreatedAt:string):HomeworldArchivePlaqueV109{return{version:1,ownerCreatedAt,revision:0,receipt:null};}
/** The optional receipt preserves identities and all separation. No import can
 * claim a repaired plaque, an author of the impression or a lineage reward. */
export function normalizeHomeworldArchivePlaqueV109(value:unknown):HomeworldArchivePlaqueV109|null {
  if(!record(value)||!exact(value,['version','ownerCreatedAt','revision','receipt'])||value.version!==1||typeof value.ownerCreatedAt!=='string'||value.ownerCreatedAt.length>32||!Number.isFinite(Date.parse(value.ownerCreatedAt))||new Date(value.ownerCreatedAt).toISOString()!==value.ownerCreatedAt||!integer(value.revision,1e6))return null;
  if(value.receipt===null)return value.revision===0?structuredClone(value) as unknown as HomeworldArchivePlaqueV109:null;
  const r=value.receipt;
  if(!record(r)||!exact(r,['sceneId','operationId','sourceSha256','sourceCorpusSha256','artSha256','phase','resumePhase','option','last','walked','objects','carrier','pickupWalked','observations','provenances','ownerConsent','edgeObserved','mismatchObserved','failureSpoken','resumeSpoken','fragmentCompared','interruptedCount','lineIds'])||!value.revision||r.sceneId!==b.sceneId||r.operationId!==b.operationId||r.sourceSha256!==source.source.sha256||r.sourceCorpusSha256!==source.sourceCorpusSha256||r.artSha256!==art.sha256||typeof r.phase!=='string'||!['offer','choice','ready','working','return','interrupted','completed'].includes(r.phase)||(r.option!==null&&r.option!=='A'&&r.option!=='B')||!archivePlaquePointV109(r.last)||!number(r.walked)||!integer(r.interruptedCount,10000)||!list(r.observations)||!list(r.provenances))return null;
  const observations=r.observations as ArchivePlaqueIdV109[],provenances=r.provenances as ArchivePlaqueIdV109[];
  if(provenances.some(id=>!observations.includes(id)))return null;
  for(const key of ['ownerConsent','edgeObserved','mismatchObserved','failureSpoken','resumeSpoken','fragmentCompared'])if(typeof r[key]!=='boolean')return null;
  if(!Array.isArray(r.objects)||r.objects.length!==3)return null;
  let carrier:ArchivePlaqueIdV109|null=null;
  for(let index=0;index<3;index++){
    const o=r.objects[index],d=b.objects[index],s=b.supports[index];
    if(!record(o)||!exact(o,['id','place','x','y'])||o.id!==d.id||typeof o.place!=='string'||!['source','ground','carried','support'].includes(o.place)||!number(o.x,10400)||!number(o.y,6400))return null;
    const p={x:o.x,y:o.y};
    if(o.place==='source'&&!same(p,d.origin)||o.place==='support'&&!same(p,s))return null;
    if(o.place!=='source'&&(!r.ownerConsent||!r.provenances.includes(d.id)))return null;
    if(o.place==='carried'){if(carrier||!same(p,r.last))return null;carrier=d.id;}
  }
  if(r.carrier!==carrier||(carrier?(!number(r.pickupWalked)||r.pickupWalked>r.walked):r.pickupWalked!==null))return null;
  if(r.phase==='interrupted'){if(!archivePlaqueWorkingV109(String(r.resumePhase))||!r.interruptedCount)return null;}else if(r.resumePhase!==null)return null;
  const phase=r.phase==='interrupted'?r.resumePhase:r.phase;
  const objects=r.objects as unknown as ArchivePlaqueObjectV109[],separated=objects[0].place==='support'&&objects[1].place==='support';
  if(r.walked<objects.filter(o=>o.place==='support').length*40)return null;
  if(phase==='offer'?(r.option!==null):(r.option!=='A'&&r.option!=='B'))return null;
  if(['offer','choice','ready'].includes(String(phase))&&(r.walked!==0||r.objects.some(o=>(o as ArchivePlaqueObjectV109).place!=='source')||r.observations.length||r.provenances.length||r.edgeObserved||r.mismatchObserved||r.failureSpoken||r.resumeSpoken||r.fragmentCompared||r.interruptedCount||Math.hypot(r.last.x-b.post.x,r.last.y-b.post.y)>b.radius))return null;
  if(phase==='offer'&&r.ownerConsent||phase==='choice'&&r.ownerConsent)return null;
  if(['working','return','completed'].includes(String(phase))&&!r.ownerConsent)return null;
  if(r.edgeObserved&&(!r.observations.includes('plaque')||objects[0].place!=='support')||r.mismatchObserved&&(!r.edgeObserved||!separated||r.option!=='A')||r.failureSpoken&&!r.mismatchObserved||r.resumeSpoken&&(!r.failureSpoken||!r.interruptedCount)||r.fragmentCompared&&(!r.resumeSpoken||objects[2].place!=='support'||!r.observations.includes('fragment')))return null;
  if(r.option==='B'&&(r.edgeObserved||r.mismatchObserved||r.failureSpoken||r.resumeSpoken||r.fragmentCompared||objects[2].place!=='source'||observations.includes('fragment')||provenances.includes('fragment')))return null;
  if((observations.includes('fragment')||provenances.includes('fragment')||objects[2].place!=='source')&&!r.resumeSpoken)return null;
  if(['return','completed'].includes(String(phase))&&(!separated||carrier||r.option==='A'&&!r.fragmentCompared))return null;
  if(phase==='completed'&&Math.hypot(r.last.x-b.post.x,r.last.y-b.post.y)>b.radius)return null;
  const expectedLines=[archivePlaqueSourceLineV109('OUV').id,...(r.option?[archivePlaqueSourceLineV109('CHOIX',r.option).id]:[]),...(['ready','working','return','completed'].includes(String(phase))?[archivePlaqueSourceLineV109('REPONSE',r.option).id]:[]),...(r.failureSpoken?[archivePlaqueSourceLineV109('ECHEC').id]:[]),...(r.resumeSpoken?[archivePlaqueSourceLineV109('REPRISE').id]:[]),...(phase==='completed'?[archivePlaqueSourceLineV109('SUCCES').id]:[])];
  if(JSON.stringify(r.lineIds)!==JSON.stringify(expectedLines))return null;
  return structuredClone(value) as unknown as HomeworldArchivePlaqueV109;
}
