import './homeworldStreetCompositionMountV92';
import {HOMEWORLD_ACTOR,type HomeworldActor,type HomeworldInput} from './homeworldCity';
import {archiveWalkableV106,archiveGroundV106,type ArchiveContextV106} from './homeworldArchiveV106';
import {stepHomeworldCivicActorV80} from './homeworldCivicWorldV80';
import {homeworldRouteSegmentV77} from './homeworldNavigationV77';
import {homeworldResidentOccludedV100} from './homeworldResidentVisibilityV100';
import type {HomeworldLevelV77} from './homeworldWorldV77';
import {HOMEWORLD_ARCHIVE_COMPARISON_V107 as b,HOMEWORLD_ARCHIVE_COMPARISON_SOURCE_V107 as source} from './homeworldArchiveComparisonDefinitionV107';
import {normalizeHomeworldArchiveV106,type ArchivePointV106} from './homeworldArchiveLedgerV106';
import {defaultHomeworldArchiveComparisonV107,normalizeHomeworldArchiveComparisonV107,archiveComparisonWorkingV107,type HomeworldArchiveComparisonV107,type ArchiveComparisonWorkPhaseV107} from './homeworldArchiveComparisonLedgerV107';
export interface ArchiveComparisonContextV107 extends ArchiveContextV106 {legacyArchive?:unknown}
export type ArchiveComparisonActionV107='choose-a'|'reply'|'start'|'discover'|'copy-provenance'|'take'|'deposit'|'observe-a'|'observe-b'|'compare'|'report'|'interrupt'|'resume'|'park';
export interface ArchiveComparisonResultV107 {ok:boolean;changed:boolean;ledger:HomeworldArchiveComparisonV107;message:string;writeRefused?:boolean}
const distance=(a:ArchivePointV106,c:ArchivePointV106)=>Math.hypot(a.x-c.x,a.y-c.y);
const point=(p:ArchivePointV106)=>({x:p.x,y:p.y});
export const archiveComparisonActiveV107=(l:HomeworldArchiveComparisonV107|undefined)=>!!l?.receipt&&l.receipt.phase!=='completed';
export function archiveComparisonBaseReadyV107(raw:unknown,owner:string){const l=normalizeHomeworldArchiveV106(raw);return !!l&&l.ownerCreatedAt===owner&&l.receipt?.phase==='completed'&&l.receipt.cases.every(c=>c.place==='support');}
export const archiveComparisonPostReachedV107=(c:ArchiveComparisonContextV107)=>archiveGroundV106(c)&&archiveComparisonBaseReadyV107(c.legacyArchive,c.ownerCreatedAt)&&c.hostPresent!==false&&distance(c.actor,b.post)<=b.radius&&!homeworldResidentOccludedV100('0',b.host)&&homeworldRouteSegmentV77('0',c.actor,b.host);
export const archiveComparisonTableReachedV107=(c:ArchiveComparisonContextV107)=>archiveGroundV106(c)&&distance(c.actor,b.table.stand)<=36&&homeworldRouteSegmentV77('0',c.actor,b.table.stand);
export function stepHomeworldArchiveComparisonActorV107(actor:HomeworldActor,input:HomeworldInput,seconds:number,level:HomeworldLevelV77){return stepHomeworldCivicActorV80(actor,input,seconds,level);}
export function archiveComparisonNearbyV107(ledger:HomeworldArchiveComparisonV107,c:ArchiveComparisonContextV107):{action:ArchiveComparisonActionV107;label:string}|null {
 const r=ledger.receipt;if(!r||!archiveGroundV106(c)||!archiveComparisonBaseReadyV107(c.legacyArchive,c.ownerCreatedAt)||distance(r.last,c.actor)>2)return null;
 if(r.phase==='search'&&distance(c.actor,r.evidence)<=70&&!homeworldResidentOccludedV100('0',r.evidence)&&homeworldRouteSegmentV77('0',c.actor,r.evidence))return !r.discovery?{action:'discover',label:'Relever le lieu du contenant C'}:!r.provenanceCopied?{action:'copy-provenance',label:'Copier le lieu de découverte'}:{action:'take',label:'Prendre le contenant C avec son relevé'};
 if(r.phase==='carrying'&&archiveComparisonTableReachedV107(c))return {action:'deposit',label:'Déposer C au pupitre de comparaison'};
 if(r.phase==='compare'){
  for(const s of b.references)if(!r.observations.some(o=>o.supportId===s.caseId)&&distance(c.actor,s.stand)<=36&&!homeworldResidentOccludedV100('0',s)&&homeworldRouteSegmentV77('0',c.actor,s.stand))return {action:s.caseId==='A'?'observe-a':'observe-b',label:`Observer le support ${s.caseId} et son dossier`};
  if(r.observations.length===2&&archiveComparisonTableReachedV107(c))return {action:'compare',label:'Comparer C et sa provenance aux deux supports'};
 }return null;
}
export function applyArchiveComparisonV107(raw:unknown,action:ArchiveComparisonActionV107,revision:number,c:ArchiveComparisonContextV107):ArchiveComparisonResultV107 {
 const previous=raw===undefined?defaultHomeworldArchiveComparisonV107(c.ownerCreatedAt):normalizeHomeworldArchiveComparisonV107(raw),fail=(message:string):ArchiveComparisonResultV107=>({ok:false,changed:false,ledger:previous??defaultHomeworldArchiveComparisonV107(c.ownerCreatedAt),message});
 if(!previous||previous.ownerCreatedAt!==c.ownerCreatedAt||c.currentOwnerCreatedAt!==c.ownerCreatedAt)return fail('Cette étude appartient à une autre partie.');
 if(previous.revision!==revision||revision>=999990)return fail('L’étude a changé. Relis son état avant de poursuivre.');
 if(!archiveComparisonBaseReadyV107(c.legacyArchive,c.ownerCreatedAt))return fail('Dépose d’abord les deux dossiers séparément auprès de l’archiviste.');
 if(c.otherOperationActive)return fail('Termine l’autre opération avant cette étude.');
 const ledger=structuredClone(previous),r=ledger.receipt,foot=point(c.actor);
 if(action==='interrupt'){if(!r||!archiveComparisonWorkingV107(r.phase))return {ok:true,changed:false,ledger,message:'Les objets et relevés restent conservés.'};r.resumePhase=r.phase as ArchiveComparisonWorkPhaseV107;r.phase='interrupted';r.interruptedCount++;}
 else if(action==='resume'){if(!r||r.phase!=='interrupted'||!archiveWalkableV106(c)||distance(r.last,c.actor)>4)return fail('Rejoins le dernier point confirmé pour reprendre.');r.phase=r.resumePhase!;r.resumePhase=null;r.last=foot;}
 else if(action==='park'){if(!r||r.phase!=='interrupted'||r.evidence.place!=='carried'||!archiveGroundV106(c)||distance(r.last,c.actor)>2)return fail('Pose la charge au dernier point confirmé, dans un passage visible.');r.evidence={...foot,place:'ground'};r.pickupWalked=null;r.resumePhase='search';}
 else if(action==='choose-a'){
  if(r||!archiveComparisonPostReachedV107(c))return fail('Rejoins l’archiviste pour une nouvelle étude située.');
  ledger.receipt={sceneId:b.sceneId,operationId:b.operationId,sourceSha256:source.source.sha256,sourceCorpusSha256:source.sourceCorpusSha256,phase:'choice',resumePhase:null,last:foot,walked:0,evidence:{...b.evidence.origin,place:'source'},discovery:null,provenanceCopied:false,observations:[],comparison:null,pickupWalked:null,interruptedCount:0};
 }else if(action==='reply'||action==='start'||action==='report'){
  if(!r||!archiveComparisonPostReachedV107(c))return fail('Rejoins l’archiviste pour poursuivre cette conversation.');
  if(action==='reply'){if(r.phase!=='choice')return fail('Annonce d’abord l’approche A.');r.phase='ready';}
  if(action==='start'){if(r.phase!=='ready')return fail('Écoute la réponse avant de partir.');r.phase='search';r.last=foot;}
  if(action==='report'){if(r.phase!=='return'||!r.comparison||distance(r.last,c.actor)>2)return fail('Apporte le constat après comparaison physique.');r.phase='completed';}
 }else{
  if(!r||archiveComparisonNearbyV107(previous,c)?.action!==action)return fail('Rejoins à pied l’objet ou le poste correspondant.');
  if(action==='discover')r.discovery={position:point(b.evidence.origin),observer:foot,levelId:'0'};
  else if(action==='copy-provenance')r.provenanceCopied=true;
  else if(action==='take'){r.evidence={...foot,place:'carried'};r.pickupWalked=r.walked;r.phase='carrying';}
  else if(action==='deposit'){if(r.pickupWalked===null||r.walked-r.pickupWalked<40)return fail('Porte réellement le contenant jusqu’au pupitre.');r.evidence={x:b.table.x,y:b.table.y,place:'table'};r.pickupWalked=null;r.phase='compare';}
  else if(action==='observe-a'||action==='observe-b'){const s=b.references[action==='observe-a'?0:1];r.observations.push({supportId:s.caseId as 'A'|'B',position:point(s),observer:foot});}
  else if(action==='compare'){r.comparison={sourcePosition:point(b.evidence.origin),verdict:'context-kept-link-undetermined'};r.phase='return';}
  else return fail('Action inconnue.');
 }
 ledger.revision++;if(!normalizeHomeworldArchiveComparisonV107(ledger))return fail('L’état de cette étude ne peut pas être conservé.');
 return {ok:true,changed:true,ledger,message:action==='report'?'Objet, lieu de découverte et comparaison sont consignés. Aucun lien de lignée n’est établi.':action==='compare'?'Le lieu reste attribué à l’objet. Les contenants et leurs positions ne suffisent pas à établir une origine commune.':action==='discover'?'Le lieu de découverte est relevé ; copie-le avant de déplacer le contenant.':action==='copy-provenance'?'Le relevé du lieu accompagne désormais C.':action==='resume'?'La marche reprend au dernier point confirmé.':'L’objet et le relevé sont enregistrés.'};
}
export function sampleArchiveComparisonV107(ledger:HomeworldArchiveComparisonV107,before:ArchivePointV106,after:ArchivePointV106,seconds:number,c:ArchiveComparisonContextV107){
 const r=ledger.receipt;if(!r||!archiveComparisonWorkingV107(r.phase))return {ledger,invalid:false};const moved=distance(before,after);if(seconds===0&&moved===0)return {ledger,invalid:false};
 if(ledger.ownerCreatedAt!==c.ownerCreatedAt||c.otherOperationActive||!archiveComparisonBaseReadyV107(c.legacyArchive,c.ownerCreatedAt)||!archiveWalkableV106({...c,actor:after})||distance(r.last,before)>1||!Number.isFinite(seconds)||seconds<=0||seconds>1/30+1e-6||moved>Math.max(HOMEWORLD_ACTOR.walkSpeed,HOMEWORLD_ACTOR.depthSpeed)*seconds*2+.1||!homeworldRouteSegmentV77('0',before,after))return {ledger,invalid:true};
 if(moved<.001)return {ledger,invalid:false};const next=structuredClone(ledger),n=next.receipt!;n.last=point(after);n.walked=Math.min(1e9,n.walked+moved);if(n.evidence.place==='carried')n.evidence={...point(after),place:'carried'};return {ledger:next,invalid:false};
}
export function createArchiveComparisonTransactionV107(read:()=>unknown,context:()=>ArchiveComparisonContextV107,commit:(l:HomeworldArchiveComparisonV107)=>boolean){return(action:ArchiveComparisonActionV107,revision:number)=>{const raw=read(),c=context(),out=applyArchiveComparisonV107(raw,action,revision,c);if(!out.ok||!out.changed)return out;return commit(out.ledger)?out:{ok:false,changed:false,ledger:normalizeHomeworldArchiveComparisonV107(raw)??defaultHomeworldArchiveComparisonV107(c.ownerCreatedAt),writeRefused:true,message:'L’étude n’a pas été enregistrée. Réessaie ici avant de poursuivre.'};};}
/** Measured site relationships, never a lineage or a claim about sealed contents. */
export const archiveComparisonMeasurementsV107=()=>b.references.map(s=>({id:s.caseId,dx:s.x-b.evidence.origin.x,dy:s.y-b.evidence.origin.y,distance:Math.hypot(s.x-b.evidence.origin.x,s.y-b.evidence.origin.y)}));
