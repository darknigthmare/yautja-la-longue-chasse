import './homeworldStreetCompositionMountV92';
import {HOMEWORLD_ACTOR,stepHomeworldActorOnFloor,type HomeworldActor,type HomeworldInput,type HomeworldFootprint} from './homeworldCity';
import {homeworldCivicWalkableV80,stepHomeworldCivicActorV80} from './homeworldCivicWorldV80';
import {homeworldRouteSegmentV77} from './homeworldNavigationV77';
import {homeworldResidentOccludedV100} from './homeworldResidentVisibilityV100';
import type {HomeworldLevelV77} from './homeworldWorldV77';
import type {ArchiveContextV106} from './homeworldArchiveV106';
import {HOMEWORLD_CARGO_V108 as b,HOMEWORLD_CARGO_SOURCE_V108 as source} from './homeworldCargoDefinitionV108';
import {defaultHomeworldCargoV108,normalizeHomeworldCargoV108,type CargoPointV108,type CargoLotV108,type HomeworldCargoV108} from './homeworldCargoLedgerV108';
import {HOMEWORLD_COURT_ART_V80} from './homeworldCourtArtV80';
import {HOMEWORLD_GEOMETRY_V64} from './homeworldGeometryV64';
export interface CargoContextV108 extends ArchiveContextV106{guardianPresent?:boolean;ownerPresent?:boolean;ownerConsenting?:boolean;ownerConsentAvailable?:boolean;depotConsentAvailable?:boolean}
export type CargoActionV108='choose-a'|'choose-b'|'reply'|'start'|'consent-owner'|'consent-depot'|'take-wide'|'take-narrow'|'deposit-rack-wide'|'deposit-rack-narrow'|'deposit-depot'|'check-passage'|'report'|'interrupt'|'resume'|'park'|'refuse';
export interface CargoResultV108{ok:boolean;changed:boolean;ledger:HomeworldCargoV108;message:string;writeRefused?:boolean}
const distance=(a:CargoPointV108,c:CargoPointV108)=>Math.hypot(a.x-c.x,a.y-c.y);
const working=(p:string)=>['working','return'].includes(p);
export const cargoActiveV108=(l:HomeworldCargoV108|undefined)=>!!l?.receipt&&l.receipt.phase!=='completed';
export function cargoLotsV108(l:HomeworldCargoV108|undefined):CargoLotV108[]{return l?.receipt?.lots??b.lots.map(d=>({id:d.id,ownerId:d.ownerId,...d.origin,place:'source'}));}
/** Loads remain solid wherever they were put. They are independent pixels,
 * not an invisible flag claiming the painted cargo cart has been emptied. */
export function cargoCaseCollisionV108(l:HomeworldCargoV108|undefined,p:CargoPointV108,body:HomeworldFootprint=HOMEWORLD_ACTOR){
 for(const lot of cargoLotsV108(l)){if(lot.place==='carried')continue;const d=b.lots.find(a=>a.id===lot.id)!;
  const art=HOMEWORLD_COURT_ART_V80[b.caseArtId],scale=d.height/art.alphaBounds.height,a=art.nativeGroundSupport!.map(v=>({x:lot.x+(v.x-art.pivot.x)*scale,y:lot.y+(v.y-art.pivot.y)*scale/HOMEWORLD_GEOMETRY_V64.depthScale}));
  const box=[{x:p.x-body.halfWidth,y:p.y-body.halfDepth},{x:p.x+body.halfWidth,y:p.y-body.halfDepth},{x:p.x+body.halfWidth,y:p.y+body.halfDepth},{x:p.x-body.halfWidth,y:p.y+body.halfDepth}];
  let hit=true;for(const poly of[a,box])for(let i=0;i<poly.length;i++){const u=poly[i],v=poly[(i+1)%poly.length],ax=v.y-u.y,ay=u.x-v.x,av=a.map(q=>q.x*ax+q.y*ay),bv=box.map(q=>q.x*ax+q.y*ay);if(Math.max(...av)<Math.min(...bv)||Math.max(...bv)<Math.min(...av))hit=false;}
  if(hit)return 'cargo-lot-'+lot.id+'-v108';
 }return null;
}
const walkable=(l:HomeworldCargoV108|undefined,p:CargoPointV108,body:HomeworldFootprint=HOMEWORLD_ACTOR)=>homeworldCivicWalkableV80('0',p,body)&&!cargoCaseCollisionV108(l,p,body);
const segment=(l:HomeworldCargoV108|undefined,a:CargoPointV108,c:CargoPointV108,body:HomeworldFootprint=HOMEWORLD_ACTOR)=>{
 const count=Math.max(1,Math.ceil(distance(a,c)/3));for(let i=0;i<=count;i++)if(!walkable(l,{x:a.x+(c.x-a.x)*i/count,y:a.y+(c.y-a.y)*i/count},body))return false;return true;
};
export function stepHomeworldCargoActorV108(actor:HomeworldActor,input:HomeworldInput,seconds:number,level:HomeworldLevelV77,ledger?:HomeworldCargoV108){
 if(level!=='0')return stepHomeworldCivicActorV80(actor,input,seconds,level);
 return stepHomeworldActorOnFloor(actor,input,seconds,p=>walkable(ledger,p),()=>({...actor,vx:0,vy:0}));
}
export const cargoWalkableV108=(l:HomeworldCargoV108|undefined,c:CargoContextV108)=>c.ownerCreatedAt===c.currentOwnerCreatedAt&&c.active&&c.levelId==='0'&&!c.interiorId&&!c.inTransit&&c.visitedDistrictIds.includes('port')&&[c.actor.x,c.actor.y].every(Number.isFinite)&&walkable(l,c.actor);
const ground=(l:HomeworldCargoV108|undefined,c:CargoContextV108)=>cargoWalkableV108(l,c)&&!homeworldResidentOccludedV100('0',c.actor);
export const cargoPostReachedV108=(c:CargoContextV108,l?:HomeworldCargoV108)=>ground(l,c)&&c.hostPresent!==false&&distance(c.actor,b.post)<=b.radius&&!homeworldResidentOccludedV100('0',b.host)&&homeworldRouteSegmentV77('0',c.actor,b.host)&&segment(l,c.actor,b.host);
export const cargoGuardianReachedV108=(c:CargoContextV108,l?:HomeworldCargoV108)=>ground(l,c)&&c.guardianPresent!==false&&distance(c.actor,b.guardian.post)<=b.guardian.radius&&!homeworldResidentOccludedV100('0',b.guardian.host)&&homeworldRouteSegmentV77('0',c.actor,b.guardian.host)&&segment(l,c.actor,b.guardian.host);
const at=(l:HomeworldCargoV108,c:CargoContextV108,p:CargoPointV108,r=36)=>ground(l,c)&&distance(c.actor,p)<=r&&segment(l,c.actor,p);
export function cargoPlacedV108(l:HomeworldCargoV108){const r=l.receipt;return !!r&&(r.option==='A'?r.lots[0].place==='rack':r.lots[0].place==='depot')&&r.lots[1].place==='rack';}
export function cargoPassageClearV108(l:HomeworldCargoV108){return segment(l,b.passage.start,b.passage.end,{halfWidth:24,halfDepth:b.passage.halfDepth});}
export function cargoNearbyV108(l:HomeworldCargoV108|undefined,c:CargoContextV108):{action:CargoActionV108;label:string}|null{
 const r=l?.receipt;if(!l||!r||r.phase!=='working'||!ground(l,c)||distance(r.last,c.actor)>2)return null;
 if(!r.ownerConsents&&cargoPostReachedV108(c,l))return{action:'consent-owner',label:'Recevoir l’accord de manutention des lots identifiés'};
 if(r.option==='B'&&r.ownerConsents&&!r.depositConsent&&cargoGuardianReachedV108(c,l))return{action:'consent-depot',label:'Demander l’emplacement au gardien du dépôt'};
 if(r.carrier){const i=r.carrier==='wide'?0:1,d=b.racks[i];if(at(l,c,d.stand))return{action:i===0?'deposit-rack-wide':'deposit-rack-narrow',label:'Placer le lot dans le '+d.label.toLowerCase()};if(r.option==='B'&&r.carrier==='wide'&&at(l,c,b.depot.stand))return{action:'deposit-depot',label:'Déposer le lot large à la place autorisée'};return null;}
 if(r.ownerConsents)for(let i=0;i<2;i++){const lot=r.lots[i],d=b.lots[i];if(!['source','ground'].includes(lot.place))continue;const stand=lot.place==='source'?d.stand:{x:lot.x,y:lot.y+60};if(at(l,c,stand,40)&&distance(c.actor,lot)<=100&&!homeworldResidentOccludedV100('0',lot))return{action:i===0?'take-wide':'take-narrow',label:'Prendre le '+d.label.toLowerCase()};}
 if(cargoPlacedV108(l)&&r.passageStartWalked===null&&at(l,c,b.passage.start))return{action:'check-passage',label:'Éprouver à pied la traverse vers le sas'};
 return null;
}
export function applyCargoActionV108(raw:unknown,action:CargoActionV108,expectedRevision:number,c:CargoContextV108):CargoResultV108{
 const previous=raw===undefined?defaultHomeworldCargoV108(c.ownerCreatedAt):normalizeHomeworldCargoV108(raw);
 const fail=(message:string):CargoResultV108=>({ok:false,changed:false,ledger:previous??defaultHomeworldCargoV108(c.ownerCreatedAt),message});
 if(!previous||previous.ownerCreatedAt!==c.ownerCreatedAt||c.currentOwnerCreatedAt!==c.ownerCreatedAt)return fail('Ces lots appartiennent à une autre partie.');
 if(previous.revision!==expectedRevision||previous.revision>=999990)return fail('Le registre a changé. Relis les emplacements avant de poursuivre.');
 if(c.otherOperationActive)return fail('Termine l’autre opération du Homeworld avant de prendre une charge.');
 const l=structuredClone(previous),r=l.receipt,foot={...c.actor};
 if(action==='interrupt'){
  if(!r||!working(r.phase))return{ok:true,changed:false,ledger:l,message:'Les lots restent à leur place.'};r.resumePhase=r.phase as 'working'|'return';r.phase='interrupted';r.interruptedCount++;r.retryLineReady=r.firstRackPrepared&&(r.option==='A'?r.lots[1]:r.lots[0]).place==='source';
 }else if(action==='resume'){
  if(!r||r.phase!=='interrupted'||!cargoWalkableV108(l,c)||distance(r.last,foot)>4)return fail('Rejoins le dernier point confirmé pour reprendre la manutention.');r.phase=r.resumePhase!;r.resumePhase=null;r.last=foot;
 }else if(action==='park'){
  if(!r||r.phase!=='interrupted'||!r.carrier||!ground(l,c)||distance(r.last,foot)>2)return fail('La charge ne peut être posée qu’au dernier point confirmé.');
  // Put the load just behind the carrier, preserving a safe standing socket.
  const point={x:foot.x,y:foot.y-60};if(!homeworldCivicWalkableV80('0',point,{halfWidth:42,halfDepth:30})||cargoCaseCollisionV108(l,point,{halfWidth:42,halfDepth:30}))return fail('Le sol derrière toi ne permet pas de poser cette charge.');
  const lot=r.lots.find(v=>v.id===r.carrier)!;lot.place='ground';lot.x=point.x;lot.y=point.y;r.carrier=null;r.pickupWalked=null;
 }else if(action==='choose-a'||action==='choose-b'){
  if(r||!cargoPostReachedV108(c,l))return fail('Rejoins l’intendante du quai pour ouvrir une nouvelle opération.');
  l.receipt={sceneId:b.sceneId,operationId:b.operationId,sourceSha256:source.source.sha256,sourceCorpusSha256:source.sourceCorpusSha256,phase:'choice',resumePhase:null,option:action==='choose-a'?'A':'B',last:foot,walked:0,lots:cargoLotsV108(undefined),carrier:null,ownerConsents:false,depositConsent:false,firstRackPrepared:false,passageTested:false,pickupWalked:null,passageStartWalked:null,retryLineReady:false,refusals:0,interruptedCount:0};
 }else if(action==='reply'||action==='start'){
  if(!r||!cargoPostReachedV108(c,l)||r.phase!==(action==='reply'?'choice':'ready'))return fail('Écoute la réponse au poste avant de déplacer les lots.');r.phase=action==='reply'?'ready':'working';r.last=foot;
 }else if(action==='report'){
  if(!r||r.phase!=='return'||!cargoPlacedV108(l)||!r.passageTested||!cargoPostReachedV108(c,l)||distance(r.last,foot)>2)return fail('Range les lots, éprouve la traverse puis rapporte le constat à pied.');r.phase='completed';
 }else if(action==='refuse'){
  if(!r||r.phase!=='working'||!cargoPostReachedV108(c,l)||r.carrier||r.passageTested||r.refusals>0)return fail('Ce constat de passage encombré est conservé ; une nouvelle parole attend un autre revers.');
  if(cargoPassageClearV108(l))return fail('La traverse est dégagée ; aucun échec d’encombrement n’est constaté.');r.refusals++;
 }else{
  if(!r||r.phase!=='working'||!ground(l,c)||distance(r.last,foot)>2)return fail('Reprends la manutention depuis le dernier point confirmé.');
  if(action==='consent-owner'){
   if(r.ownerConsents||!cargoPostReachedV108(c,l)||c.ownerPresent===false||c.ownerConsenting===false||c.ownerConsentAvailable===false)return fail('L’accord de la responsable présente est nécessaire.');r.ownerConsents=true;
  }else if(action==='consent-depot'){
   if(r.option!=='B'||!r.ownerConsents||r.depositConsent||!cargoGuardianReachedV108(c,l)||c.depotConsentAvailable===false)return fail('Le gardien présent doit autoriser un emplacement avant le dépôt.');r.depositConsent=true;
  }else if(action==='take-wide'||action==='take-narrow'){
   if(cargoNearbyV108(previous,c)?.action!==action)return fail('Rejoins à pied le lot identifié après l’accord de sa responsable.');const id=action==='take-wide'?'wide':'narrow',lot=r.lots.find(v=>v.id===id)!;if(id==='wide'&&r.option==='B'&&!r.depositConsent)return fail('Vérifie d’abord l’emplacement avec le gardien du dépôt.');lot.place='carried';lot.x=foot.x;lot.y=foot.y;r.carrier=id;r.pickupWalked=r.walked;r.retryLineReady=false;r.passageStartWalked=null;
  }else if(action==='deposit-rack-wide'||action==='deposit-rack-narrow'||action==='deposit-depot'){
   if(!r.carrier||r.pickupWalked===null||r.walked-r.pickupWalked<40)return fail('Porte un seul lot à pied jusqu’à son emplacement.');
   const lot=r.lots.find(v=>v.id===r.carrier)!,d=b.lots.find(v=>v.id===r.carrier)!;
   if(action==='deposit-depot'){
    if(r.option!=='B'||lot.id!=='wide'||!r.depositConsent||!at(l,c,b.depot.stand))return fail('Ce dépôt exige le lot large et l’accord du gardien présent.');lot.place='depot';lot.x=b.depot.x;lot.y=b.depot.y;
   }else{const target=b.racks[action==='deposit-rack-wide'?0:1];if(!at(l,c,target.stand)||target.capacity<d.width||target.id!==lot.id||r.option==='B'&&lot.id==='wide')return fail('Largeur incompatible : le lot garde sa position et son propriétaire.');lot.place='rack';lot.x=target.x;lot.y=target.y;}
   r.carrier=null;r.pickupWalked=null;r.firstRackPrepared=r.option==='A'?r.lots[0].place==='rack':r.lots[1].place==='rack';
  }else if(action==='check-passage'){
   if(!cargoPlacedV108(l)||!at(l,c,b.passage.start)||!cargoPassageClearV108(l)||r.passageStartWalked!==null)return fail('Le lot est encore dans la traverse, ou le départ du test n’est pas rejoint.');r.passageStartWalked=r.walked;
  }else return fail('Action inconnue.');
 }
 l.revision++;if(!normalizeHomeworldCargoV108(l))return fail('Les emplacements ne peuvent pas être enregistrés dans cet état.');
 return{ok:true,changed:true,ledger:l,message:action==='report'?'Chaque charge garde son emplacement et son propriétaire. La traverse a été parcourue.':action==='refuse'?'La charge obstrue encore la traverse. Ses coordonnées sont conservées.':action==='interrupt'?'Charges et dernier point conservés. La reprise reste volontaire.':action==='check-passage'?'Parcours la traverse balisée vers son extrémité orientale.':'Le registre des charges est enregistré.'};
}
export function sampleCargoWalkV108(l:HomeworldCargoV108,before:CargoPointV108,after:CargoPointV108,seconds:number,c:CargoContextV108){
 const r=l.receipt;if(!r||!working(r.phase))return{ledger:l,invalid:false};const moved=distance(before,after);if(seconds===0&&moved===0)return{ledger:l,invalid:false};
 if(l.ownerCreatedAt!==c.ownerCreatedAt||c.otherOperationActive||!cargoWalkableV108(l,{...c,actor:after})||distance(r.last,before)>1||!Number.isFinite(seconds)||seconds<=0||seconds>1/30+1e-6||moved>Math.max(HOMEWORLD_ACTOR.walkSpeed,HOMEWORLD_ACTOR.depthSpeed)*seconds*2+.1||!segment(l,before,after))return{ledger:l,invalid:true};
 if(moved<.001)return{ledger:l,invalid:false};const next=structuredClone(l),n=next.receipt!;n.last={x:after.x,y:after.y};n.walked=Math.min(1e9,n.walked+moved);if(n.carrier){const lot=n.lots.find(v=>v.id===n.carrier)!;lot.x=after.x;lot.y=after.y;}
 if(n.passageStartWalked!==null&&!n.passageTested){if(Math.abs(after.y-b.passage.start.y)>b.passage.halfDepth||after.x<b.passage.start.x-40||after.x>b.passage.end.x+40)n.passageStartWalked=null;
  else if(distance(after,b.passage.end)<=24&&n.walked-n.passageStartWalked>=b.passage.minWalk&&cargoPassageClearV108(next)){n.passageTested=true;n.phase='return';}}
 return{ledger:next,invalid:false};
}
export function createCargoTransactionV108(read:()=>HomeworldCargoV108,context:()=>CargoContextV108,write:(l:HomeworldCargoV108)=>boolean){return(action:CargoActionV108,revision:number):CargoResultV108=>{const previous=read(),out=applyCargoActionV108(previous,action,revision,context());if(!out.ok||!out.changed)return out;if(!write(out.ledger))return{ok:false,changed:false,ledger:previous,writeRefused:true,message:'Le registre n’a pas été enregistré. Les charges restent au dernier état confirmé ; réessaie ici.'};return out;};}
