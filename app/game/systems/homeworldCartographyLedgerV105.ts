import {HOMEWORLD_CARTOGRAPHY_V105 as b} from './homeworldCartographyDefinitionV105';
import {HOMEWORLD_CARTOGRAPHY_SOURCE_V104 as source} from './homeworldCartographyDefinitionV104';
export type CartographyPhaseV105='choice'|'ready'|'walking'|'observing'|'return'|'interrupted'|'completed';
export interface CartographyFootV105 {x:number;y:number;levelId:'0'|'+1'}
export interface HomeworldCartographyLedgerV105 {
 version:1;ownerCreatedAt:string;revision:number;
 receipt:null|{sceneId:typeof b.sceneId;routeId:typeof b.routeId;sourceSha256:string;sourceCorpusSha256:string;
  phase:CartographyPhaseV105;resumePhase:'walking'|'observing'|'return'|null;last:CartographyFootV105;walked:number;
  crossings:{reverse:boolean;source:{x:number;y:number};walked:number;afterObservation:boolean}[];
  highPoint:CartographyFootV105|null;compared:0|1|3;observedAt:string|null;interruptedCount:number;
 };
}
const record=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,allowed:readonly string[])=>Object.keys(v).every(k=>allowed.includes(k));
const distance=(a:{x:number;y:number},c:{x:number;y:number})=>Math.hypot(a.x-c.x,a.y-c.y);
const number=(v:unknown,max=1_000_000_000):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
const integer=(v:unknown,max:number):v is number=>number(v,max)&&Number.isSafeInteger(v);
const iso=(v:unknown):v is string=>typeof v==='string'&&v.length<=32&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const point=(v:unknown):v is {x:number;y:number}=>record(v)&&keys(v,['x','y'])&&number(v.x,10400)&&number(v.y,6400);
export const cartographyFootV105=(v:unknown):v is CartographyFootV105=>record(v)&&keys(v,['x','y','levelId'])&&number(v.x,10400)&&number(v.y,6400)&&['0','+1'].includes(String(v.levelId));
export function defaultHomeworldCartographyV105(ownerCreatedAt:string):HomeworldCartographyLedgerV105{return{version:1,ownerCreatedAt,revision:0,receipt:null};}
/** Pure save schema: importing a ledger must not construct the physical world. */
export function normalizeHomeworldCartographyV105(value:unknown):HomeworldCartographyLedgerV105|null {
 if(!record(value)||!keys(value,['version','ownerCreatedAt','revision','receipt'])||value.version!==1||!iso(value.ownerCreatedAt)||!integer(value.revision,1_000_000))return null;
 if(value.receipt===null)return value.revision===0?structuredClone(value) as unknown as HomeworldCartographyLedgerV105:null;
 const r=value.receipt;
 if(!record(r)||!keys(r,['sceneId','routeId','sourceSha256','sourceCorpusSha256','phase','resumePhase','last','walked','crossings','highPoint','compared','observedAt','interruptedCount'])||value.revision===0
  ||r.sceneId!==b.sceneId||r.routeId!==b.routeId||r.sourceSha256!==source.source.sha256||r.sourceCorpusSha256!==source.sourceCorpusSha256
  ||!['choice','ready','walking','observing','return','interrupted','completed'].includes(String(r.phase))||!cartographyFootV105(r.last)||!number(r.walked)||!integer(r.interruptedCount,10000)
  ||![0,1,3].includes(r.compared as number)||!Array.isArray(r.crossings)||r.crossings.length>128)return null;
 let upper=false,previousWalked=0,dated=false;
 for(const crossing of r.crossings){
  if(!record(crossing)||!keys(crossing,['reverse','source','walked','afterObservation'])||typeof crossing.reverse!=='boolean'||crossing.reverse!==upper||!point(crossing.source)
   ||!number(crossing.walked)||crossing.walked<previousWalked||crossing.walked>r.walked||typeof crossing.afterObservation!=='boolean'||dated&&!crossing.afterObservation
   ||distance(crossing.source,crossing.reverse?b.upper:b.lower)>39)return null;
  upper=!upper;previousWalked=crossing.walked;dated=crossing.afterObservation;
 }
 if(r.last.levelId!==(upper?'+1':'0'))return null;
 if(r.highPoint!==null&&(!cartographyFootV105(r.highPoint)||r.highPoint.levelId!=='+1'||distance(r.highPoint,b.highPoint)>b.radius||!r.crossings.length||r.walked<4500))return null;
 if(r.compared!==0&&!r.highPoint)return null;
 if(r.observedAt!==null&&(!iso(r.observedAt)||r.compared!==3||!r.highPoint))return null;
 if(dated&&r.observedAt===null)return null;
 if(r.phase==='interrupted'){
  if(!['walking','observing','return'].includes(String(r.resumePhase))||r.interruptedCount===0)return null;
 }else if(r.resumePhase!==null)return null;
 const phase=r.phase==='interrupted'?r.resumePhase:r.phase;
 if(['choice','ready'].includes(String(phase))&&(r.walked!==0||r.crossings.length||r.highPoint||r.compared!==0||r.observedAt||distance(r.last,b.post)>100))return null;
 if(phase==='walking'&&(r.highPoint||r.compared!==0||r.observedAt))return null;
 if(phase==='observing'&&(!r.highPoint||r.observedAt))return null;
 if(['return','completed'].includes(String(phase))&&(!r.observedAt||r.compared!==3))return null;
 if(phase==='completed'&&(r.last.levelId!=='0'||distance(r.last,b.post)>100||r.walked<9000||!r.crossings.some(c=>c.reverse&&c.afterObservation)))return null;
 return structuredClone(value) as unknown as HomeworldCartographyLedgerV105;
}
