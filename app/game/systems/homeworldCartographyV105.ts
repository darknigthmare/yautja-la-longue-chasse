import './homeworldStreetCompositionMountV92';
import {HOMEWORLD_ACTOR} from './homeworldCity';
import {homeworldCivicWalkableV80} from './homeworldCivicWorldV80';
import {homeworldRouteSegmentV77} from './homeworldNavigationV77';
import {HOMEWORLD_CONNECTORS_V77,type HomeworldTransitV77} from './homeworldWorldV77';
import {HOMEWORLD_CARTOGRAPHY_V105 as b} from './homeworldCartographyDefinitionV105';
import {HOMEWORLD_CARTOGRAPHY_SOURCE_V104 as source} from './homeworldCartographyDefinitionV104';
import {cartographyPostReachedV104,cartographyServicePresentV104,type CartographyContextV104} from './homeworldCartographyV104';
import {cartographyFootV105,defaultHomeworldCartographyV105,normalizeHomeworldCartographyV105,type CartographyFootV105,type HomeworldCartographyLedgerV105} from './homeworldCartographyLedgerV105';
export interface CartographyContextV105 extends CartographyContextV104 {otherOperationActive?:boolean;now?:string}
const distance=(a:{x:number;y:number},c:{x:number;y:number})=>Math.hypot(a.x-c.x,a.y-c.y);
export const cartographyActiveV105=(ledger:HomeworldCartographyLedgerV105|undefined)=>!!ledger?.receipt&&ledger.receipt.phase!=='completed';
export function cartographyGroundContextV105(context:CartographyContextV105){
 return context.ownerCreatedAt===context.currentOwnerCreatedAt&&context.active&&!context.interiorId&&!context.inTransit
  &&context.visitedDistrictIds.includes('port')&&cartographyFootV105({x:context.actor.x,y:context.actor.y,levelId:context.levelId})
  &&homeworldCivicWalkableV80(context.levelId as '0'|'+1',context.actor)&&cartographyServicePresentV104();
}
export function cartographyHighPointReachedV105(context:CartographyContextV105){return cartographyGroundContextV105(context)&&context.levelId===b.highLevel&&distance(context.actor,b.highPoint)<=b.radius;}
export type CartographyActionV105='choose-a'|'reply'|'start'|'compare-first'|'compare-second'|'date'|'interrupt'|'resume'|'report';
export interface CartographyResultV105 {ok:boolean;changed:boolean;ledger:HomeworldCartographyLedgerV105;message:string;writeRefused?:boolean}
export function applyCartographyActionV105(raw:unknown,action:CartographyActionV105,revision:number,context:CartographyContextV105):CartographyResultV105{
 const previous=raw===undefined?defaultHomeworldCartographyV105(context.ownerCreatedAt):normalizeHomeworldCartographyV105(raw);
 const fail=(message:string):CartographyResultV105=>({ok:false,changed:false,ledger:previous??defaultHomeworldCartographyV105(context.ownerCreatedAt),message});
 if(!previous||previous.ownerCreatedAt!==context.ownerCreatedAt||context.currentOwnerCreatedAt!==context.ownerCreatedAt)return fail('Ce relevé appartient à une autre partie.');
 if(previous.revision!==revision)return fail('Le relevé a changé. Relis son état avant de poursuivre.');
 if(context.otherOperationActive)return fail('Termine la liaison du port avant d’ouvrir un nouveau relevé.');
 const ledger=structuredClone(previous),r=ledger.receipt;
 const foot={x:context.actor.x,y:context.actor.y,levelId:context.levelId} as CartographyFootV105;
 if(action==='interrupt'){
  if(!r||!['walking','observing','return'].includes(r.phase))return{ok:true,changed:false,ledger,message:'Le relevé reste conservé.'};
  r.resumePhase=r.phase as 'walking'|'observing'|'return';r.phase='interrupted';r.interruptedCount++;
 }else if(action==='resume'){
  if(!r||r.phase!=='interrupted'||!cartographyGroundContextV105(context)||r.last.levelId!==context.levelId||distance(r.last,context.actor)>64)return fail('Rejoins à pied le dernier point enregistré, au même étage, pour reprendre.');
  r.phase=r.resumePhase!;r.resumePhase=null;r.last=foot;
 }else if(['compare-first','compare-second','date'].includes(action)){
  if(!r||r.phase!=='observing'||!cartographyHighPointReachedV105(context)||r.last.levelId!==context.levelId||distance(r.last,context.actor)>2)return fail('Rejoins le point d’observation du viaduc par l’escalier du Conseil.');
  if(action==='compare-first'){if(r.compared!==0)return fail('Ce premier repère est déjà comparé.');r.compared=1;}
  if(action==='compare-second'){if(r.compared!==1)return fail('Compare d’abord le bac de basalte.');r.compared=3;}
  if(action==='date'){
   if(r.compared!==3)return fail('Compare les deux repères avant de dater le relevé.');
   const now=context.now??new Date().toISOString();if(!Number.isFinite(Date.parse(now))||new Date(now).toISOString()!==now)return fail('L’heure d’observation n’est pas disponible.');
   r.observedAt=now;r.phase='return';
  }
 }else{
  if(!cartographyPostReachedV104(context))return fail('Rejoins le cartographe au pupitre du registre du port.');
  if(action==='choose-a'){
   if(r)return fail('Reprends le relevé existant sans remplacer son observation.');
   ledger.receipt={sceneId:b.sceneId,routeId:b.routeId,sourceSha256:source.source.sha256,sourceCorpusSha256:source.sourceCorpusSha256,phase:'choice',resumePhase:null,last:foot,walked:0,crossings:[],highPoint:null,compared:0,observedAt:null,interruptedCount:0};
  }else if(action==='reply'){if(!r||r.phase!=='choice')return fail('Choisis d’abord le relevé depuis le point haut.');r.phase='ready';}
  else if(action==='start'){if(!r||r.phase!=='ready')return fail('Écoute le cartographe avant le départ.');r.phase='walking';r.last=foot;}
  else if(action==='report'){
   if(!r||r.phase!=='return'||!r.observedAt||distance(r.last,context.actor)>2||!r.crossings.some(c=>c.reverse&&c.afterObservation))return fail('Date le relevé au viaduc, puis redescends et reviens à pied au pupitre.');
   r.phase='completed';
  }else return fail('Action inconnue.');
 }
 ledger.revision++;if(!normalizeHomeworldCartographyV105(ledger))return fail('Le relevé ne peut pas être conservé dans cet état.');
 return{ok:true,changed:true,ledger,message:action==='date'?'Observation datée. Reviens à pied au pupitre par l’escalier du Conseil.':action==='report'?'Le relevé observé et daté est consigné. Les zones non vues restent inconnues.':action==='interrupt'?'Marche interrompue : le dernier point confirmé est conservé.':action==='resume'?'Le relevé reprend au dernier point confirmé.':'Le relevé est enregistré.'};
}
export function sampleCartographyWalkV105(ledger:HomeworldCartographyLedgerV105,before:{x:number;y:number},after:{x:number;y:number},seconds:number,context:CartographyContextV105){
 const r=ledger.receipt;if(!r||!['walking','observing','return'].includes(r.phase))return{ledger,checkpoint:false,invalid:false};
 const moved=distance(before,after);if(seconds===0&&moved===0)return{ledger,checkpoint:false,invalid:false};
 if(ledger.ownerCreatedAt!==context.ownerCreatedAt||context.otherOperationActive||!cartographyGroundContextV105({...context,actor:after})||r.last.levelId!==context.levelId||distance(r.last,before)>1||!Number.isFinite(seconds)||seconds<=0||seconds>1/30+1e-6
  ||moved>Math.max(HOMEWORLD_ACTOR.walkSpeed,HOMEWORLD_ACTOR.depthSpeed)*seconds*2+.1||!homeworldRouteSegmentV77(context.levelId as '0'|'+1',before,after))return{ledger,checkpoint:false,invalid:true};
 if(moved<.001)return{ledger,checkpoint:false,invalid:false};
 const next=structuredClone(ledger),n=next.receipt!;n.last={x:after.x,y:after.y,levelId:context.levelId as '0'|'+1'};n.walked=Math.min(1_000_000_000,n.walked+moved);
 if(n.phase==='walking'&&n.crossings.length&&n.walked>=4500&&cartographyHighPointReachedV105({...context,actor:after})){n.highPoint={...n.last};n.phase='observing';return{ledger:next,checkpoint:true,invalid:false};}
 return{ledger:next,checkpoint:false,invalid:false};
}
/** Called only when the real connector integrator reports its final frame.
 * A point on another floor, route planning or pressing Interact cannot earn it. */
export function sampleCartographyTransitV105(ledger:HomeworldCartographyLedgerV105,transit:HomeworldTransitV77,after:CartographyFootV105,seconds:number,context:CartographyContextV105){
 const r=ledger.receipt;if(!r||!['walking','observing','return'].includes(r.phase))return{ledger,checkpoint:false,invalid:false};
 const connector=HOMEWORLD_CONNECTORS_V77.find(c=>c.id===b.connectorId)!;
 const from=transit.reverse?connector.to:connector.from,to=transit.reverse?connector.from:connector.to;
 if(context.otherOperationActive||!cartographyGroundContextV105(context)||context.levelId!==after.levelId||distance(context.actor,after)>1||ledger.ownerCreatedAt!==context.ownerCreatedAt||transit.connectorId!==b.connectorId||transit.sourceLevel!==from.levelId
  ||r.last.levelId!==from.levelId||distance(r.last,transit.source)>1||distance(transit.source,from.point)>38||after.levelId!==to.levelId||distance(after,to.point)>.01
  ||!Number.isFinite(seconds)||seconds<=0||seconds>1/30+1e-6||transit.elapsed<connector.duration-seconds-1e-6||transit.elapsed>=connector.duration||r.crossings.length>=128
  ||!homeworldCivicWalkableV80(to.levelId,to.point))return{ledger,checkpoint:false,invalid:true};
 const next=structuredClone(ledger),n=next.receipt!;n.last={x:after.x,y:after.y,levelId:after.levelId};n.crossings.push({reverse:transit.reverse,source:{x:transit.source.x,y:transit.source.y},walked:n.walked,afterObservation:!!n.observedAt});
 return{ledger:next,checkpoint:true,invalid:false};
}
export function createCartographyTransactionV105(read:()=>unknown,getContext:()=>CartographyContextV105,commit:(ledger:HomeworldCartographyLedgerV105)=>boolean){
 return(action:CartographyActionV105,revision:number):CartographyResultV105=>{
  const raw=read(),context=getContext(),result=applyCartographyActionV105(raw,action,revision,context);
  if(!result.ok||!result.changed)return result;
  if(!commit(result.ledger))return{ok:false,changed:false,ledger:normalizeHomeworldCartographyV105(raw)??defaultHomeworldCartographyV105(context.ownerCreatedAt),writeRefused:true,message:'Le relevé du point haut n’a pas été enregistré. Réessaie ici avant de poursuivre.'};
  return result;
 };
}
