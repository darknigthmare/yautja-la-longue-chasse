import {HOMEWORLD_CARGO_V108 as b,HOMEWORLD_CARGO_SOURCE_V108 as source} from './homeworldCargoDefinitionV108';
export interface CargoPointV108{x:number;y:number}
export type CargoIdV108='wide'|'narrow';
export type CargoPhaseV108='choice'|'ready'|'working'|'return'|'interrupted'|'completed';
export interface CargoLotV108 extends CargoPointV108{id:CargoIdV108;ownerId:string;place:'source'|'ground'|'carried'|'rack'|'depot'}
export interface HomeworldCargoV108{
 version:1;ownerCreatedAt:string;revision:number;
 receipt:null|{sceneId:typeof b.sceneId;operationId:typeof b.operationId;sourceSha256:string;sourceCorpusSha256:string;
 phase:CargoPhaseV108;resumePhase:'working'|'return'|null;option:'A'|'B';last:CargoPointV108;walked:number;
 lots:CargoLotV108[];carrier:CargoIdV108|null;ownerConsents:boolean;depositConsent:boolean;firstRackPrepared:boolean;passageTested:boolean;
 pickupWalked:number|null;passageStartWalked:number|null;retryLineReady:boolean;refusals:number;interruptedCount:number};
}
export type HomeworldCargoLedgerV108=HomeworldCargoV108;
const rec=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,k:readonly string[])=>Object.keys(v).length===k.length&&Object.keys(v).every(a=>k.includes(a));
const num=(v:unknown,max=1e9):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
const integer=(v:unknown,max:number):v is number=>num(v,max)&&Number.isSafeInteger(v);
export const cargoPointV108=(v:unknown):v is CargoPointV108=>rec(v)&&keys(v,['x','y'])&&num(v.x,10400)&&num(v.y,6400);
const same=(a:CargoPointV108,c:CargoPointV108)=>Math.hypot(a.x-c.x,a.y-c.y)<.001;
const near=(a:CargoPointV108,c:CargoPointV108,r:number)=>Math.hypot(a.x-c.x,a.y-c.y)<=r;
export function defaultHomeworldCargoV108(ownerCreatedAt:string):HomeworldCargoV108{return{version:1,ownerCreatedAt,revision:0,receipt:null};}
/** Strict optional save receipt: import cannot infer a delivery or consent. */
export function normalizeHomeworldCargoV108(v:unknown):HomeworldCargoV108|null{
 if(!rec(v)||!keys(v,['version','ownerCreatedAt','revision','receipt'])||v.version!==1||typeof v.ownerCreatedAt!=='string'||v.ownerCreatedAt.length>32||!Number.isFinite(Date.parse(v.ownerCreatedAt))||new Date(v.ownerCreatedAt).toISOString()!==v.ownerCreatedAt||!integer(v.revision,1e6))return null;
 if(v.receipt===null)return v.revision===0?structuredClone(v) as unknown as HomeworldCargoV108:null;
 const r=v.receipt;if(!rec(r)||!keys(r,['sceneId','operationId','sourceSha256','sourceCorpusSha256','phase','resumePhase','option','last','walked','lots','carrier','ownerConsents','depositConsent','firstRackPrepared','passageTested','pickupWalked','passageStartWalked','retryLineReady','refusals','interruptedCount'])||!v.revision||r.sceneId!==b.sceneId||r.operationId!==b.operationId||r.sourceSha256!==source.source.sha256||r.sourceCorpusSha256!==source.sourceCorpusSha256||typeof r.phase!=='string'||!['choice','ready','working','return','interrupted','completed'].includes(r.phase)||typeof r.option!=='string'||!['A','B'].includes(r.option)||!cargoPointV108(r.last)||!num(r.walked)||!integer(r.refusals,10000)||!integer(r.interruptedCount,10000))return null;
 for(const k of['ownerConsents','depositConsent','firstRackPrepared','passageTested','retryLineReady'])if(typeof r[k]!=='boolean')return null;
 if(!Array.isArray(r.lots)||r.lots.length!==2)return null;
 let carried:CargoIdV108|null=null;
 for(let i=0;i<2;i++){const l=r.lots[i],d=b.lots[i];if(!rec(l)||!keys(l,['id','ownerId','place','x','y'])||l.id!==d.id||l.ownerId!==d.ownerId||!num(l.x,10400)||!num(l.y,6400)||typeof l.place!=='string'||!['source','ground','carried','rack','depot'].includes(l.place))return null;
  const p={x:l.x,y:l.y};if(l.place==='source'&&!same(p,d.origin)||l.place==='rack'&&(!same(p,b.racks[i])||l.id==='wide'&&r.option!=='A')||l.place==='depot'&&(l.id!=='wide'||r.option!=='B'||!r.depositConsent||!same(p,b.depot)))return null;
  if(l.place==='carried'){if(carried||!same(p,r.last))return null;carried=l.id as CargoIdV108;}
  if(l.place!=='source'&&!r.ownerConsents)return null;
 }
 if(r.carrier!==carried)return null;
 if(carried?(!num(r.pickupWalked)||r.pickupWalked>r.walked):r.pickupWalked!==null)return null;
 if(r.depositConsent&&(r.option!=='B'||!r.ownerConsents))return null;
 const wide=r.lots[0] as unknown as CargoLotV108,narrow=r.lots[1] as unknown as CargoLotV108;
 if(r.firstRackPrepared!==(r.option==='A'?wide.place==='rack':narrow.place==='rack'))return null;
 const placed=(r.option==='A'?wide.place==='rack':wide.place==='depot')&&narrow.place==='rack';
 if(r.lots.some(l=>['rack','depot'].includes((l as CargoLotV108).place))&&r.walked<40||placed&&r.walked<80)return null;
 if(r.passageTested&&(!placed||!num(r.passageStartWalked)||r.walked-r.passageStartWalked<b.passage.minWalk)||r.passageStartWalked!==null&&(!num(r.passageStartWalked)||r.passageStartWalked>r.walked||!placed))return null;
 if(r.retryLineReady&&(!r.firstRackPrepared||(r.option==='A'?narrow.place:wide.place)!=='source'))return null;
 if(r.phase==='interrupted'){if(typeof r.resumePhase!=='string'||!['working','return'].includes(r.resumePhase)||!r.interruptedCount)return null;}else if(r.resumePhase!==null)return null;
 const phase=r.phase==='interrupted'?r.resumePhase:r.phase;
 if(['choice','ready'].includes(String(phase))&&(r.walked!==0||r.ownerConsents||r.depositConsent||r.passageTested||r.passageStartWalked!==null||r.refusals||r.interruptedCount||r.lots.some(l=>(l as CargoLotV108).place!=='source')||!near(r.last,b.post,b.radius)))return null;
 if(['return','completed'].includes(String(phase))&&(!placed||!r.passageTested||r.carrier!==null))return null;
 if(phase==='working'&&r.passageTested||phase==='completed'&&!near(r.last,b.post,b.radius))return null;
 return structuredClone(v) as unknown as HomeworldCargoV108;
}
