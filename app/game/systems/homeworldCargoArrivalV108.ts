import {resolveHomeworldLocationV77} from './homeworldLocationV77';
import {normalizeHomeworldCheckpointV77} from './homeworldCheckpointV77';
import {createHomeworldWorldActorV77} from './homeworldWorldV77';
import {homeworldCivicWalkableV80,homeworldCivicCollisionV80} from './homeworldCivicWorldV80';
import {homeworldUrbanTerrainV78} from './homeworldStreetModulesV78';
import {cargoCaseCollisionV108} from './homeworldCargoV108';
import {cargoFixedCollisionV108} from './homeworldCargoSolidsV108';
import {normalizeHomeworldCargoV108} from './homeworldCargoLedgerV108';
import {normalizeHomeworldCartographyV104} from './homeworldCartographyLedgerV104';
import {normalizeHomeworldCartographyV105} from './homeworldCartographyLedgerV105';
import {normalizeHomeworldArchiveV106} from './homeworldArchiveLedgerV106';
import {normalizeHomeworldArchiveComparisonV107} from './homeworldArchiveComparisonLedgerV107';
type Point={x:number;y:number};
type LegacyKey='cartographyV104'|'cartographyV105'|'archiveV106'|'archiveComparisonV107';
export type CargoLegacyLedgersV108=Partial<Record<LegacyKey,unknown>>;
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const record=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const normalizers={cartographyV104:normalizeHomeworldCartographyV104,cartographyV105:normalizeHomeworldCartographyV105,archiveV106:normalizeHomeworldArchiveV106,archiveComparisonV107:normalizeHomeworldArchiveComparisonV107};
const blocked=(p:Point)=>!!cargoFixedCollisionV108('0',p)||!!cargoCaseCollisionV108(undefined,p);
const safe=(p:Point)=>homeworldCivicWalkableV80('0',p)&&!cargoCaseCollisionV108(undefined,p);
/** Ignore only the new fixed staging when checking the old physical ground. */
const historicFree=(p:Point)=>{const hit=homeworldCivicCollisionV80('0',p);return homeworldUrbanTerrainV78('0',p)&&(!hit||hit.id===cargoFixedCollisionV108('0',p));};
function nearestSafe(p:Point,anchor?:Point):Point|null{
 for(let radius=8;radius<=96;radius+=8)for(let i=0;i<48;i++){
  const angle=i*Math.PI/24,q={x:p.x+Math.cos(angle)*radius,y:p.y+Math.sin(angle)*radius};
  if(anchor&&distance(q,anchor)>96||!safe(q))continue;
  const count=Math.max(1,Math.ceil(radius/4));let clear=true;
  for(let j=0;j<=count;j++)if(!historicFree({x:p.x+(q.x-p.x)*j/count,y:p.y+(q.y-p.y)*j/count})){clear=false;break;}
  if(clear)return q;
 }return null;
}
export interface CargoArrivalBackupV108{version:1;ownerCreatedAt:string;originalCheckpoint:unknown;originalLedgers:CargoLegacyLedgersV108;from:Point;to:Point;migratedFields:LegacyKey[]}
/** One explicit geometry migration before play. No elapsed walk, observation,
 * provenance, destination, reward or source result is invented. Old receipts
 * and the original checkpoint are returned for backup before an atomic save. */
export function resolveCargoArrivalV108(checkpoint:unknown,ownerCreatedAt:string,cargo:unknown,legacy:CargoLegacyLedgersV108={}){
 const previous=resolveHomeworldLocationV77(checkpoint,ownerCreatedAt),own=normalizeHomeworldCargoV108(cargo);
 const unchanged={...previous,cargoRecoveryMessage:'',migratedLedgers:{} as CargoLegacyLedgersV108,migrationBackup:null as CargoArrivalBackupV108|null,migrationBackupKey:''};
 if(cargo!==undefined&&!own||own?.receipt)return unchanged;
 const source=normalizeHomeworldCheckpointV77(checkpoint);
 if(!source||source.ownerCreatedAt!==ownerCreatedAt||source.levelId!=='0'||source.interiorId||!historicFree(source.exterior)||!blocked(source.exterior))return unchanged;
 const from={...source.exterior};
 // Coupled V104 endpoints also constrain the unmeasured trail break to96u.
 const old104=normalizeHomeworldCartographyV104(legacy.cartographyV104),anchor=old104?.receipt&&distance(old104.receipt.last,from)<=.001?old104.receipt.trail.at(-1):undefined;
 const to=nearestSafe(from,anchor);if(!to)return unchanged;
 const migratedLedgers:CargoLegacyLedgersV108={},migratedFields:LegacyKey[]=[];
 for(const key of Object.keys(normalizers) as LegacyKey[]){
  const raw=legacy[key];if(raw===undefined)continue;
  const normalized=normalizers[key](raw);
  if(!normalized||normalized.ownerCreatedAt!==ownerCreatedAt)return unchanged;
  if(!normalized.receipt||normalized.receipt.phase==='completed')continue;
  const next=structuredClone(normalized),r=next.receipt as unknown as Record<string,unknown>,last=r.last as Point&{levelId?:string};
  // An interrupted person may already have walked elsewhere empty-handed.
  // Their last confirmed operation point remains a separate historical fact.
  if(last.levelId&&last.levelId!=='0'||distance(last,from)>.001)continue;
  if(next.revision>=999990||Number(r.interruptedCount)>=9999)return unchanged;
  if(!['choice','ready'].includes(String(r.phase))){
   if(r.phase!=='interrupted'&&key!=='cartographyV104')r.resumePhase=r.phase;
   r.phase='interrupted';r.interruptedCount=Number(r.interruptedCount)+1;
  }
  r.last={...last,...to};
  if(key==='cartographyV104'){
   const trail=r.trail as Point[],breaks=r.trailBreaks as number[];
   if(distance(trail.at(-1)!,to)>32){
    if(trail.length>=512){
     const index=trail.findIndex((_,i)=>i>0&&i<trail.length-1&&!breaks.includes(i)&&!breaks.includes(i+1)&&distance(trail[i-1],trail[i+1])<=72);
     if(index<0)return unchanged;
     trail.splice(index,1);r.trailBreaks=breaks.map(n=>n>index?n-1:n);r.trimmedCount=Number(r.trimmedCount)+1;
    }
    (r.trailBreaks as number[]).push(trail.length);trail.push({...to});
   }
  }
  if(key==='archiveV106')for(const item of r.cases as Record<string,unknown>[])if(item.place==='carried'){item.x=to.x;item.y=to.y;}
  if(key==='archiveComparisonV107'&&record(r.evidence)&&r.evidence.place==='carried'){r.evidence.x=to.x;r.evidence.y=to.y;}
  next.revision++;const checked=normalizers[key](next);if(!checked)return unchanged;
  migratedLedgers[key]=checked;migratedFields.push(key);
 }
 const actor={...createHomeworldWorldActorV77(),...to},migrationBackup:CargoArrivalBackupV108={version:1,ownerCreatedAt,originalCheckpoint:structuredClone(checkpoint),originalLedgers:structuredClone(legacy),from,to,migratedFields};
 const bytes=JSON.stringify(migrationBackup);let hash=2166136261;for(const c of bytes)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
 return{actor,exterior:actor,levelId:'0' as const,interiorId:null,restored:false,migratedLedgers,migrationBackup,migrationBackupKey:`yautja.homeworld-cargo-arrival.v108.${ownerCreatedAt}.${hash.toString(16)}`,cargoRecoveryMessage:'De nouvelles charges occupent ton ancien point. Le point libre le plus proche et les éventuelles charges portées sont déplacés ensemble. La marche, les résultats et les propriétaires sont conservés ; reprends ensuite volontairement ton opération.'};
}
