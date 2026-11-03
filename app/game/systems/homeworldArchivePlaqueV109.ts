import './homeworldStreetCompositionMountV92';
import {HOMEWORLD_ACTOR} from './homeworldCity';
import {homeworldCivicWalkableV80} from './homeworldCivicWorldV80';
import {cargoCaseCollisionV108,type CargoContextV108} from './homeworldCargoV108';
import type {HomeworldCargoV108} from './homeworldCargoLedgerV108';
import {homeworldResidentOccludedV100} from './homeworldResidentVisibilityV100';
import {HOMEWORLD_ARCHIVE_PLAQUE_V109 as b,HOMEWORLD_ARCHIVE_PLAQUE_SOURCE_V109 as source,HOMEWORLD_ARCHIVE_PLAQUE_ART_V109 as art,archivePlaqueSourceLineV109,type ArchivePlaqueIdV109} from './homeworldArchivePlaqueDefinitionV109';
import {defaultHomeworldArchivePlaqueV109,normalizeHomeworldArchivePlaqueV109,archivePlaqueWorkingV109,type ArchivePlaquePointV109,type HomeworldArchivePlaqueV109} from './homeworldArchivePlaqueLedgerV109';
export interface ArchivePlaqueContextV109 extends CargoContextV108 {artAvailable:boolean;cargo?:HomeworldCargoV108;hostConsenting?:boolean}
export type ArchivePlaqueActionV109='open'|'choose-a'|'choose-b'|'reply'|'authorize'|'start'|'observe-plaque'|'observe-trace'|'observe-fragment'|'copy-plaque'|'copy-trace'|'copy-fragment'|'take-plaque'|'take-trace'|'take-fragment'|'deposit'|'inspect-edge'|'compare-supports'|'report-mismatch'|'compare-fragment'|'conclude'|'report'|'interrupt'|'resume'|'park';
export interface ArchivePlaqueResultV109{ok:boolean;changed:boolean;ledger:HomeworldArchivePlaqueV109;message:string;writeRefused?:boolean}
const distance=(a:ArchivePlaquePointV109,c:ArchivePlaquePointV109)=>Math.hypot(a.x-c.x,a.y-c.y);
const point=(p:ArchivePlaquePointV109)=>({x:p.x,y:p.y});
export const archivePlaqueActiveV109=(ledger:HomeworldArchivePlaqueV109|undefined)=>!!ledger?.receipt&&ledger.receipt.phase!=='completed'&&ledger.receipt.phase!=='offer';
const walkable=(c:ArchivePlaqueContextV109,p:ArchivePlaquePointV109)=>homeworldCivicWalkableV80('0',p)&&!cargoCaseCollisionV108(c.cargo,p);
export function archivePlaqueSegmentV109(c:ArchivePlaqueContextV109,a:ArchivePlaquePointV109,z:ArchivePlaquePointV109){const n=Math.max(1,Math.ceil(distance(a,z)/3));for(let i=0;i<=n;i++)if(!walkable(c,{x:a.x+(z.x-a.x)*i/n,y:a.y+(z.y-a.y)*i/n}))return false;return true;}
export const archivePlaqueGroundV109=(c:ArchivePlaqueContextV109)=>c.artAvailable&&c.active&&c.ownerCreatedAt===c.currentOwnerCreatedAt&&c.levelId==='0'&&!c.interiorId&&!c.inTransit&&c.visitedDistrictIds.includes('port')&&walkable(c,c.actor)&&!homeworldResidentOccludedV100('0',c.actor);
export const archivePlaquePostReachedV109=(c:ArchivePlaqueContextV109)=>archivePlaqueGroundV109(c)&&c.hostPresent!==false&&distance(c.actor,b.post)<=b.radius&&archivePlaqueSegmentV109(c,c.actor,b.post);
const at=(c:ArchivePlaqueContextV109,p:ArchivePlaquePointV109)=>archivePlaqueGroundV109(c)&&distance(c.actor,p)<=36&&archivePlaqueSegmentV109(c,c.actor,p);
export function archivePlaqueNearbyV109(ledger:HomeworldArchivePlaqueV109,c:ArchivePlaqueContextV109):{action:ArchivePlaqueActionV109;label:string}|null {
 const r=ledger.receipt;if(!r||r.phase!=='working'||!archivePlaqueGroundV109(c)||distance(r.last,c.actor)>2)return null;
 if(r.carrier){const s=b.supports.find(o=>o.id===r.carrier)!;return at(c,s.stand)?{action:'deposit',label:'Déposer séparément : '+b.objects.find(o=>o.id===r.carrier)!.label}:null;}
 for(const id of ['plaque','trace','fragment'] as const){
  if(id==='fragment'&&(r.option!=='A'||!r.resumeSpoken))continue;
  const o=r.objects.find(v=>v.id===id)!,d=b.objects.find(v=>v.id===id)!;
  if(!['source','ground'].includes(o.place))continue;
  const stand=o.place==='source'?d.stand:{x:o.x,y:o.y+60};if(!at(c,stand))continue;
  return !r.observations.includes(id)?{action:`observe-${id}`,label:'Observer sur place : '+d.label}:!r.provenances.includes(id)?{action:`copy-${id}`,label:'Copier le lieu de découverte : '+d.label}:{action:`take-${id}`,label:'Prendre avec son relevé : '+d.label};
 }
 const separated=r.objects[0].place==='support'&&r.objects[1].place==='support';
 if(at(c,b.supports[0].stand)&&separated){
  if(r.option==='A'&&!r.edgeObserved)return{action:'inspect-edge',label:'Observer le bord manquant de la plaque'};
  if(r.option==='A'&&!r.mismatchObserved)return{action:'compare-supports',label:'Comparer les deux appuis sans forcer les pièces'};
  if(r.option==='A'&&r.resumeSpoken&&r.objects[2].place==='support'&&!r.fragmentCompared)return{action:'compare-fragment',label:'Examiner le fragment candidat sans le fusionner'};
  if(r.option==='B'||r.fragmentCompared)return{action:'conclude',label:'Conserver le constat et revenir à l’archiviste'};
 }
 return null;
}
export function applyArchivePlaqueV109(raw:unknown,action:ArchivePlaqueActionV109,revision:number,c:ArchivePlaqueContextV109):ArchivePlaqueResultV109 {
 const previous=raw===undefined?defaultHomeworldArchivePlaqueV109(c.ownerCreatedAt):normalizeHomeworldArchivePlaqueV109(raw);
 const fail=(message:string):ArchivePlaqueResultV109=>({ok:false,changed:false,ledger:previous??defaultHomeworldArchivePlaqueV109(c.ownerCreatedAt),message});
 if(!previous||previous.ownerCreatedAt!==c.ownerCreatedAt||c.currentOwnerCreatedAt!==c.ownerCreatedAt)return fail('Cette étude appartient à une autre partie.');
 if(previous.revision!==revision||revision>=999990)return fail('Le constat a changé. Relis le dernier point confirmé.');
 if(c.otherOperationActive)return fail('Termine l’autre opération avant de manipuler les pièces K-17.');
 const ledger=structuredClone(previous),r=ledger.receipt,foot=point(c.actor);
 const line=(kind:string,option?:string|null)=>{const id=archivePlaqueSourceLineV109(kind,option).id;if(!ledger.receipt!.lineIds.includes(id))ledger.receipt!.lineIds.push(id);};
 if(action==='open'){
  if(r||!archivePlaquePostReachedV109(c)||c.hostConsenting===false)return fail('Rejoins l’archiviste disponible au poste K-17.');
  ledger.receipt={sceneId:b.sceneId,operationId:b.operationId,sourceSha256:source.source.sha256,sourceCorpusSha256:source.sourceCorpusSha256,artSha256:art.sha256,phase:'offer',resumePhase:null,option:null,last:foot,walked:0,objects:b.objects.map(o=>({id:o.id,...o.origin,place:'source'})),carrier:null,pickupWalked:null,observations:[],provenances:[],ownerConsent:false,edgeObserved:false,mismatchObserved:false,failureSpoken:false,resumeSpoken:false,fragmentCompared:false,interruptedCount:0,lineIds:[]};line('OUV');
 }else if(action==='interrupt'){
  if(!r||!archivePlaqueWorkingV109(r.phase))return{ok:true,changed:false,ledger,message:'Les pièces restent séparées à leur dernière place.'};r.resumePhase=r.phase as 'working'|'return';r.phase='interrupted';r.interruptedCount++;
 }else if(action==='resume'){
  if(!r||r.phase!=='interrupted'||!archivePlaqueGroundV109(c))return fail('Reprends au dernier point confirmé, avec les mêmes pièces.');
  const sourceReprise=r.failureSpoken&&!r.resumeSpoken;
  if(sourceReprise){
   if(r.carrier||!archivePlaquePostReachedV109(c)||c.hostConsenting===false)return fail('Rejoins l’archiviste pour reprendre l’étude du bord manquant.');
   // Both original objects already rest on their own surfaces. Returning to
   // the post during a pause does not credit study walking or move an object.
   r.last=foot;
  }else if(distance(r.last,foot)>4)return fail('Reprends au dernier point confirmé, avec les mêmes pièces.');
  r.phase=r.resumePhase!;r.resumePhase=null;
  if(sourceReprise){r.resumeSpoken=true;line('REPRISE');}
 }else if(action==='park'){
  if(!r||r.phase!=='interrupted'||!r.carrier||!archivePlaqueGroundV109(c)||distance(r.last,foot)>2)return fail('Pose la pièce au dernier point confirmé.');
  const p={x:foot.x,y:foot.y-60};if(!walkable(c,p))return fail('Le dallage ne permet pas de conserver cette pièce ici.');const o=r.objects.find(o=>o.id===r.carrier)!;Object.assign(o,p,{place:'ground'});r.carrier=null;r.pickupWalked=null;
 }else if(['choose-a','choose-b','reply','authorize','start','report-mismatch','report'].includes(action)){
  if(!r||!archivePlaquePostReachedV109(c)||c.hostConsenting===false||(archivePlaqueWorkingV109(r.phase)&&distance(r.last,foot)>2))return fail('Rejoins l’archiviste présent pour cet échange.');
  if(['offer','choice','ready'].includes(r.phase))r.last=foot;
  if(action==='choose-a'||action==='choose-b'){if(r.phase!=='offer')return fail('L’approche a déjà été retenue.');r.option=action==='choose-a'?'A':'B';r.phase='choice';line('CHOIX',r.option);}
  else if(action==='reply'){if(r.phase!=='choice')return fail('Choisis d’abord une approche.');r.phase='ready';line('REPONSE',r.option);}
  else if(action==='authorize'){if(r.phase!=='ready'||r.ownerConsent)return fail('L’accord de travail est déjà conservé, ou l’approche reste à écouter.');r.ownerConsent=true;}
  else if(action==='start'){if(r.phase!=='ready'||!r.ownerConsent)return fail('Reçois l’accord avant de déplacer les pièces.');r.phase='working';}
  else if(action==='report-mismatch'){if(r.phase!=='working'||!r.mismatchObserved||r.failureSpoken)return fail('Rapporte un écart réellement observé une seule fois.');r.failureSpoken=true;line('ECHEC');}
  else {if(r.phase!=='return')return fail('Conserve d’abord les pièces sur leurs surfaces séparées.');r.phase='completed';line('SUCCES');}
 }else{
  if(!r||archivePlaqueNearbyV109(previous,c)?.action!==action)return fail('Rejoins à pied la pièce ou la surface correspondante.');
  if(action.startsWith('observe-'))r.observations.push(action.slice(8) as ArchivePlaqueIdV109);
  else if(action.startsWith('copy-'))r.provenances.push(action.slice(5) as ArchivePlaqueIdV109);
  else if(action.startsWith('take-')){const id=action.slice(5) as ArchivePlaqueIdV109,o=r.objects.find(o=>o.id===id)!;Object.assign(o,foot,{place:'carried'});r.carrier=id;r.pickupWalked=r.walked;}
  else if(action==='deposit'){if(!r.carrier||r.pickupWalked===null||r.walked-r.pickupWalked<40)return fail('Porte réellement la pièce jusqu’à sa surface.');const o=r.objects.find(o=>o.id===r.carrier)!,s=b.supports.find(s=>s.id===r.carrier)!;Object.assign(o,{x:s.x,y:s.y,place:'support'});r.carrier=null;r.pickupWalked=null;}
  else if(action==='inspect-edge')r.edgeObserved=true;
  else if(action==='compare-supports')r.mismatchObserved=true;
  else if(action==='compare-fragment')r.fragmentCompared=true;
  else if(action==='conclude')r.phase='return';
  else return fail('Action inconnue.');
 }
 ledger.revision++;
 if(!normalizeHomeworldArchivePlaqueV109(ledger))return fail('Le constat ne peut pas être enregistré dans cet état.');
 return{ok:true,changed:true,ledger,message:action==='compare-supports'?'Les marques n’établissent pas une attribution commune. La plaque et l’empreinte restent sur deux surfaces distinctes.':action==='compare-fragment'?'Le fragment reste un candidat séparé. Le bord de la plaque n’est ni réparé ni déclaré complet.':action==='report'?'Pièces, lieux et incertitudes sont consignés. Aucun auteur de l’empreinte ni lien de lignée n’est attribué.':'Le dernier point et les pièces séparées sont enregistrés.'};
}
export function sampleArchivePlaqueWalkV109(ledger:HomeworldArchivePlaqueV109,before:ArchivePlaquePointV109,after:ArchivePlaquePointV109,seconds:number,c:ArchivePlaqueContextV109){
 const r=ledger.receipt;if(!r||!archivePlaqueWorkingV109(r.phase))return{ledger,invalid:false};const moved=distance(before,after);if(seconds===0&&moved===0)return{ledger,invalid:false};
 if(c.ownerCreatedAt!==ledger.ownerCreatedAt||c.otherOperationActive||!archivePlaqueGroundV109({...c,actor:after})||distance(r.last,before)>1||!Number.isFinite(seconds)||seconds<=0||seconds>1/30+1e-6||moved>Math.max(HOMEWORLD_ACTOR.walkSpeed,HOMEWORLD_ACTOR.depthSpeed)*seconds*2+.1||!archivePlaqueSegmentV109(c,before,after))return{ledger,invalid:true};
 if(moved<.001)return{ledger,invalid:false};const next=structuredClone(ledger),n=next.receipt!;n.last=point(after);n.walked=Math.min(1e9,n.walked+moved);if(n.carrier)Object.assign(n.objects.find(o=>o.id===n.carrier)!,point(after));return{ledger:next,invalid:false};
}
export function createArchivePlaqueTransactionV109(read:()=>unknown,context:()=>ArchivePlaqueContextV109,commit:(ledger:HomeworldArchivePlaqueV109)=>boolean){return(action:ArchivePlaqueActionV109,revision:number)=>{const raw=read(),c=context(),out=applyArchivePlaqueV109(raw,action,revision,c);if(!out.ok||!out.changed)return out;return commit(out.ledger)?out:{ok:false,changed:false,ledger:normalizeHomeworldArchivePlaqueV109(raw)??defaultHomeworldArchivePlaqueV109(c.ownerCreatedAt),writeRefused:true,message:'Le constat n’a pas été enregistré. Les pièces restent au dernier point confirmé ; réessaie ici.'};};}
