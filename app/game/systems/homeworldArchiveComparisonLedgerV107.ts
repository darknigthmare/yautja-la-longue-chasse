import {HOMEWORLD_ARCHIVE_COMPARISON_V107 as b,HOMEWORLD_ARCHIVE_COMPARISON_SOURCE_V107 as source} from './homeworldArchiveComparisonDefinitionV107';
import {archivePointV106,type ArchivePointV106} from './homeworldArchiveLedgerV106';
export type ArchiveComparisonPhaseV107='choice'|'ready'|'search'|'carrying'|'compare'|'return'|'interrupted'|'completed';
export type ArchiveComparisonWorkPhaseV107='search'|'carrying'|'compare'|'return';
export interface HomeworldArchiveComparisonV107 {
  version:1;ownerCreatedAt:string;revision:number;
  receipt:null|{sceneId:typeof b.sceneId;operationId:typeof b.operationId;sourceSha256:string;sourceCorpusSha256:string;
    phase:ArchiveComparisonPhaseV107;resumePhase:ArchiveComparisonWorkPhaseV107|null;last:ArchivePointV106;walked:number;
    evidence:ArchivePointV106&{place:'source'|'ground'|'carried'|'table'};
    discovery:null|{position:ArchivePointV106;observer:ArchivePointV106;levelId:'0'};provenanceCopied:boolean;
    observations:{supportId:'A'|'B';position:ArchivePointV106;observer:ArchivePointV106}[];
    comparison:null|{sourcePosition:ArchivePointV106;verdict:'context-kept-link-undetermined'};
    pickupWalked:number|null;interruptedCount:number;
  };
}
const record=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,allowed:readonly string[])=>Object.keys(v).length===allowed.length&&Object.keys(v).every(k=>allowed.includes(k));
const finite=(v:unknown,max=1e9):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
const integer=(v:unknown,max:number):v is number=>finite(v,max)&&Number.isSafeInteger(v);
const iso=(v:unknown):v is string=>typeof v==='string'&&v.length<=32&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const distance=(a:ArchivePointV106,c:ArchivePointV106)=>Math.hypot(a.x-c.x,a.y-c.y);
const same=(a:ArchivePointV106,c:ArchivePointV106)=>distance(a,c)<.001;
export const archiveComparisonWorkingV107=(phase:string)=>['search','carrying','compare','return'].includes(phase);
export function defaultHomeworldArchiveComparisonV107(ownerCreatedAt:string):HomeworldArchiveComparisonV107{return {version:1,ownerCreatedAt,revision:0,receipt:null};}
/** Pure strict optional import schema. No city mount or action runs on import. */
export function normalizeHomeworldArchiveComparisonV107(raw:unknown):HomeworldArchiveComparisonV107|null {
  if(!record(raw)||!keys(raw,['version','ownerCreatedAt','revision','receipt'])||raw.version!==1||!iso(raw.ownerCreatedAt)||!integer(raw.revision,1e6))return null;
  if(raw.receipt===null)return raw.revision===0?structuredClone(raw) as unknown as HomeworldArchiveComparisonV107:null;
  const r=raw.receipt;if(!record(r)||!keys(r,['sceneId','operationId','sourceSha256','sourceCorpusSha256','phase','resumePhase','last','walked','evidence','discovery','provenanceCopied','observations','comparison','pickupWalked','interruptedCount'])||raw.revision===0
    ||r.sceneId!==b.sceneId||r.operationId!==b.operationId||r.sourceSha256!==source.source.sha256||r.sourceCorpusSha256!==source.sourceCorpusSha256||typeof r.phase!=='string'||!['choice','ready','search','carrying','compare','return','interrupted','completed'].includes(r.phase)
    ||!archivePointV106(r.last)||!finite(r.walked)||!integer(r.interruptedCount,10000)||typeof r.provenanceCopied!=='boolean')return null;
  const e=r.evidence;if(!record(e)||!keys(e,['place','x','y'])||!finite(e.x,10400)||!finite(e.y,6400)||typeof e.place!=='string'||!['source','ground','carried','table'].includes(e.place))return null;
  const ep={x:e.x,y:e.y};if(e.place==='source'&&!same(ep,b.evidence.origin)||e.place==='table'&&!same(ep,b.table)||e.place==='carried'&&!same(ep,r.last))return null;
  const d=r.discovery;if(d!==null&&(!record(d)||!keys(d,['position','observer','levelId'])||!archivePointV106(d.position)||!archivePointV106(d.observer)||d.levelId!=='0'||!same(d.position,b.evidence.origin)||distance(d.observer,b.evidence.origin)>75))return null;
  if(r.provenanceCopied&&!d||e.place!=='source'&&(!d||!r.provenanceCopied))return null;
  if(!Array.isArray(r.observations)||r.observations.length>2)return null;
  const seen=new Set<string>();for(const o of r.observations){if(!record(o)||!keys(o,['supportId','position','observer'])||typeof o.supportId!=='string'||!['A','B'].includes(o.supportId)||seen.has(String(o.supportId))||!archivePointV106(o.position)||!archivePointV106(o.observer))return null;const s=b.references[o.supportId==='A'?0:1];if(!same(o.position,s)||distance(o.observer,s.stand)>40)return null;seen.add(String(o.supportId));}
  if(r.comparison!==null&&(!record(r.comparison)||!keys(r.comparison,['sourcePosition','verdict'])||!archivePointV106(r.comparison.sourcePosition)||!same(r.comparison.sourcePosition,b.evidence.origin)||r.comparison.verdict!=='context-kept-link-undetermined'||r.observations.length!==2||e.place!=='table'||!r.provenanceCopied))return null;
  if(r.phase==='interrupted'){if(typeof r.resumePhase!=='string'||!archiveComparisonWorkingV107(r.resumePhase)||r.interruptedCount===0)return null;}else if(r.resumePhase!==null)return null;
  const phase=r.phase==='interrupted'?r.resumePhase:r.phase;
  if(['choice','ready'].includes(String(phase))&&(e.place!=='source'||d!==null||r.provenanceCopied||r.observations.length||r.comparison!==null||r.walked!==0||distance(r.last,b.post)>b.radius))return null;
  if(phase==='search'&&!['source','ground'].includes(String(e.place))||phase==='carrying'&&e.place!=='carried'||['compare','return','completed'].includes(String(phase))&&e.place!=='table')return null;
  if(e.place==='carried'?(!finite(r.pickupWalked)||r.pickupWalked>r.walked):r.pickupWalked!==null)return null;
  if(r.observations.length&&e.place!=='table'||phase==='compare'&&r.comparison!==null||['return','completed'].includes(String(phase))&&r.comparison===null)return null;
  if(phase==='completed'&&distance(r.last,b.post)>b.radius)return null;
  return structuredClone(raw) as unknown as HomeworldArchiveComparisonV107;
}
