import {DEFAULT_WAR_RULES_V6, type WarRulesV6} from './clanWarBibleV6';
import {applyLogisticsV108, CLAN_LOGISTICS_DEPOT_V108, CLAN_LOGISTICS_KEY_V108,
  CLAN_LOGISTICS_SITES_V108, createLogisticsV108, exportLogisticsV108, importLogisticsV108,
  logisticsActorV108, logisticsCommandV108, logisticsConservationV108, logisticsReadyV108,
  type LogisticsActionV108, type LogisticsStateV108} from './clanLogisticsV108';
import type {SpecializedIdV107} from './clanWarSpecializedV107';

/** The same key and Web Lock deliberately fence an already mounted V108 tab.
 * The former archive is retained exactly inside the one atomic new envelope. */
export const CLAN_SUPPLY_KEY_V109 = CLAN_LOGISTICS_KEY_V108;
export const CLAN_SUPPLY_LOCK_V109 = 'yautja-clan-logistics-v108';
export const CLAN_SUPPLY_CONTEXT_V109 = 'physical-supply-route-v109';
export const CLAN_SUPPLY_MAX_BYTES_V109 = 4 * 1024 * 1024;
export const CLAN_MOUNT_PARKING_V109 = [{x:680,y:545},{x:760,y:545}] as const;
export const CLAN_MOUNT_CLEARANCE_V109 = 56;
export type SupplyLocationV109 = 'depot' | 'boat' | SpecializedIdV107;
export interface SupplyStopV109 {workId:SpecializedIdV107;amount:number}
export interface SupplyRouteV109 {
  id:string; source:'depot'|'boat'; allowance:number; stops:SupplyStopV109[]; cursor:number;
  phase:'reserved'|'active'|'paused'|'returning'|'completed'|'cancelled';
  resumePhase:'reserved'|'active'|'returning'|null;
  holder:'depot'|'boat'|'carrier'|'shuttle'|null; heldAmount:number; loaded:boolean;
  carrierMembers:string[]; boatId:string; returnReason:'delivered'|'aborted'|null;
  deliveries:{workId:SpecializedIdV107;amount:number;turn:number;baseRevision:number}[];
  finishedAtRevision:number|null;
}
export interface SupplyStateV109 {
  version:2; context:typeof CLAN_SUPPLY_CONTEXT_V109; revision:number; rulesKey:string;
  originalV108Archive:string|null; convoy:LogisticsStateV108; route:SupplyRouteV109|null;
  completedRoutes:{id:string;deliveredStops:number;deliveredRav:number;result:'delivered'|'aborted'}[];
  history:SupplyCommandV109[];
}
export type SupplyActionV109 = LogisticsActionV108
  | {kind:'supply-plan';source:'depot'|'boat';allowance:number;stops:SupplyStopV109[]}
  | {kind:'supply-load'|'supply-deliver'|'supply-pause'|'supply-resume'|'supply-return'|'supply-close'|'supply-cancel'}
  | {kind:'supply-provision';location:SupplyLocationV109;amount:number};
export type SupplyCommandV109 = SupplyActionV109 & {operationId:string};
export interface SupplyResultV109 {state:SupplyStateV109;accepted:boolean;message:string}
const trusted = new WeakSet<object>();
const clone = <T,>(value:T):T => JSON.parse(JSON.stringify(value));
function seal<T>(value:T):T {if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))seal(child);Object.freeze(value);}return value;}
function finish(state:SupplyStateV109){trusted.add(state);return seal(state);}
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
const locationKnown=(value:unknown):value is SupplyLocationV109=>value==='depot'||value==='boat'||typeof value==='string'&&Object.hasOwn(CLAN_LOGISTICS_SITES_V108,value);
const count=(value:unknown,min:number,max:number):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=min&&value<=max;
const exact=(value:object,keys:string[])=>Object.keys(value).sort().join('|')===[...keys].sort().join('|');
const activeRoute=(route:SupplyRouteV109|null)=>route!==null&&!['completed','cancelled'].includes(route.phase);
const key=(convoy:LogisticsStateV108)=>JSON.stringify({protocol:'v109-supply-r1',legacy:convoy.rulesKey,mountClearance:CLAN_MOUNT_CLEARANCE_V109,parking:CLAN_MOUNT_PARKING_V109});

export function createSupplyV109(originalV108Archive:string|null=null,rules=DEFAULT_WAR_RULES_V6):SupplyStateV109|null {
  const convoy=originalV108Archive===null?createLogisticsV108(rules):importLogisticsV108(originalV108Archive,rules).state;
  return convoy?finish({version:2,context:CLAN_SUPPLY_CONTEXT_V109,revision:0,rulesKey:key(convoy),originalV108Archive,
    convoy,route:null,completedRoutes:[],history:[]}):null;
}
export function supplyCommandV109(state:SupplyStateV109,action:SupplyActionV109):SupplyCommandV109 {
  return {...action,operationId:`v109:${state.revision+1}`};
}
export function supplyReservationV109(route:SupplyRouteV109|null):number {
  return activeRoute(route)?route!.heldAmount+(route!.loaded?0:route!.allowance):0;
}
export function supplyBackingV109(state:SupplyStateV109):number {
  const route=state.route;if(!route?.holder)return 0;
  return route.holder==='depot'?state.convoy.depot:route.holder==='carrier'?logisticsActorV108(state.convoy,'carrier')!.rav:state.convoy[route.holder].cargo;
}
export function supplyConservationV109(state:SupplyStateV109):boolean {
  return logisticsConservationV108(state.convoy)&&supplyBackingV109(state)>=supplyReservationV109(state.route);
}
function validSupplyAction(action:SupplyCommandV109):boolean {
  if(!action||typeof action!=='object'||Array.isArray(action)||typeof action.operationId!=='string'||typeof action.kind!=='string')return false;
  if(!action.kind.startsWith('supply-'))return true; // The unchanged legacy reducer validates its complete native action schema.
  if(action.kind==='supply-plan')return exact(action,['kind','operationId','source','allowance','stops'])&&['depot','boat'].includes(action.source)&&count(action.allowance,0,6)&&Array.isArray(action.stops)&&action.stops.length>=2&&action.stops.length<=6&&new Set(action.stops.map(s=>s?.workId)).size===action.stops.length&&action.stops.every(stop=>stop&&typeof stop==='object'&&exact(stop,['workId','amount'])&&Object.hasOwn(CLAN_LOGISTICS_SITES_V108,stop.workId)&&count(stop.amount,1,20))&&action.stops.reduce((sum,stop)=>sum+stop.amount,action.allowance)<=20;
  if(action.kind==='supply-provision')return exact(action,['kind','operationId','location','amount'])&&locationKnown(action.location)&&count(action.amount,1,6);
  return ['supply-load','supply-deliver','supply-pause','supply-resume','supply-return','supply-close','supply-cancel'].includes(action.kind)&&exact(action,['kind','operationId']);
}

/** A legacy overlap is never silently moved. A led animal may only increase
 * its separation until clear; a newly introduced overlap is always refused. */
export function supplyMountMoveAllowedV109(convoy:LogisticsStateV108,action:LogisticsActionV108):boolean {
  if(action.kind==='unlead'||action.kind==='care'){
    const target=convoy.mounts.find(m=>m.id===action.mount);
    if(target&&convoy.mounts.some(other=>other.id!==target.id&&distance(target,other)<CLAN_MOUNT_CLEARANCE_V109))return false;
  }
  const mount=action.kind==='lead'?convoy.mounts.find(m=>m.id===action.mount):action.kind==='move'?convoy.mounts.find(m=>m.leader===action.actor):undefined;
  if(!mount)return true;
  const actor=logisticsActorV108(convoy,action.kind==='move'?action.actor:'operator:W3-S10');if(!actor)return false;
  if(action.kind==='lead'&&distance(actor,mount)>12)return false;
  const destination=action.kind==='move'?{x:actor.x+action.dx,y:actor.y+action.dy}:actor;
  for(const other of convoy.mounts.filter(candidate=>candidate.id!==mount!.id)){
    const initial=distance(mount,other),dx=destination.x-mount.x,dy=destination.y-mount.y;
    const lengthSquared=dx*dx+dy*dy,dot=(mount.x-other.x)*dx+(mount.y-other.y)*dy;
    if(initial<CLAN_MOUNT_CLEARANCE_V109){
      // Squared separation has increasing derivative along a straight step.
      // A nonnegative initial derivative therefore proves continuous egress.
      if(dot < -1e-8||action.kind==='move'&&distance(destination,other)<=initial+1e-8)return false;
    }else{
      const t=lengthSquared?Math.max(0,Math.min(1,-dot/lengthSquared)):0;
      if(distance({x:mount.x+t*dx,y:mount.y+t*dy},other)+1e-8<CLAN_MOUNT_CLEARANCE_V109)return false;
    }
  }
  return true;
}

export function applySupplyV109(current:SupplyStateV109,action:SupplyCommandV109,rules=DEFAULT_WAR_RULES_V6):SupplyResultV109 {
  const no=(message:string):SupplyResultV109=>({state:current,accepted:false,message});
  if(!trusted.has(current)||current.rulesKey!==key(current.convoy)||!validSupplyAction(action)||current.history.length>=5000)return no('Carnet, source ou intention de tournée incompatible.');
  const previous=current.history.find(command=>command.operationId===action.operationId);
  if(previous)return JSON.stringify(previous)===JSON.stringify(action)?{state:current,accepted:true,message:'Geste déjà confirmé ; aucun transfert répété.'}:no('Cet identifiant a déjà servi à une autre intention.');
  if(action.operationId!==`v109:${current.revision+1}`)return no('Intention périmée ; reprenez le carnet confirmé.');
  if(action.kind.startsWith('supply-')&&current.convoy.rulesKey!==createLogisticsV108(rules)?.rulesKey)return no('Les règles source de cette tournée ont changé ; carnet confirmé conservé.');
  let convoy=current.convoy,route=current.route?clone(current.route):null,message='';const completedRoutes=[...current.completedRoutes];
  const carrier=()=>logisticsActorV108(convoy,'carrier')!;
  const atDepot=()=>logisticsReadyV108(convoy,carrier())&&carrier().layer==='surface'&&distance(carrier(),CLAN_LOGISTICS_DEPOT_V108)<=48;
  const onDuty=()=>logisticsReadyV108(convoy,carrier())&&carrier().supplied&&carrier().until>=convoy.turn;
  const native=(intent:LogisticsActionV108):boolean=>{
    const result=applyLogisticsV108(convoy,logisticsCommandV108(convoy,intent),rules);
    message=result.message;if(!result.accepted)return false;convoy=result.state;return true;
  };
  if(action.kind==='supply-plan'){
    if(activeRoute(route)||completedRoutes.length>=16||!atDepot()||!onDuty()||carrier().rav||convoy.cargo.item||convoy.cargo.work)return no('Porteurs sous contrat, ravitaillés, intégrés et sans charge au dépôt requis ; terminez la tournée précédente.');
    if(action.stops.some(stop=>convoy.works.find(work=>work.id===stop.workId)?.phase!=='ready'))return no('La tournée ravitaille des ouvrages réellement terminés.');
    const total=action.stops.reduce((sum,stop)=>sum+stop.amount,0),stock=action.source==='depot'?convoy.depot:convoy.boat.cargo;
    if(stock<total+action.allowance||action.source==='boat'&&!['west','east'].includes(convoy.boat.phase))return no('Le stock choisi doit être arrivé et contenir le lot et ses vivres.');
    route={id:`tour-v109-${current.revision+1}`,source:action.source,allowance:action.allowance,stops:clone(action.stops),cursor:0,phase:'reserved',resumePhase:null,holder:action.source,heldAmount:total,loaded:false,carrierMembers:[...carrier().members],boatId:convoy.boat.id,returnReason:null,deliveries:[],finishedAtRevision:null};
    message=`${total} RAV et ${action.allowance} vivres réservés dans le stock existant, sans seconde réserve.`;
  }else if(action.kind.startsWith('supply-')){
    if(!activeRoute(route))return no('Préparez une tournée avant cette intention.');
    const tour=route!;
    if(action.kind==='supply-pause'){
      if(!['reserved','active','returning'].includes(tour.phase))return no('Tournée déjà interrompue.');
      tour.resumePhase=tour.phase as 'reserved'|'active'|'returning';tour.phase='paused';message='Tournée interrompue ; même lot, mêmes positions et étapes conservés.';
    }else if(action.kind==='supply-resume'){
      if(tour.phase!=='paused'||!tour.resumePhase)return no('Aucune tournée interrompue à reprendre.');
      tour.phase=tour.resumePhase;tour.resumePhase=null;message='Tournée reprise au dernier point confirmé, sans nouveau stock.';
    }else if(action.kind==='supply-cancel'){
      if(tour.loaded||tour.cursor||!(tour.phase==='reserved'||tour.phase==='paused'&&tour.resumePhase==='reserved'))return no('Un lot déjà chargé doit revenir physiquement au dépôt.');
      tour.phase='cancelled';tour.heldAmount=0;tour.holder=null;tour.resumePhase=null;tour.finishedAtRevision=current.revision+1;message='Réservation non chargée libérée ; aucun remboursement ni débit ajouté.';
    }else if(action.kind==='supply-return'){
      if(tour.phase==='paused')return no('Reprenez la tournée avant d’engager le retour.');
      if(!tour.loaded)return no('La réservation non chargée peut être annulée.');
      tour.phase='returning';tour.returnReason=tour.cursor===tour.stops.length?'delivered':'aborted';message='Retour engagé avec le reliquat réel ; étapes déjà livrées conservées.';
    }else if(action.kind==='supply-load'){
      if(!['reserved','active','returning'].includes(tour.phase)||!['depot','boat'].includes(tour.holder??'')||carrier().rav)return no('Rejoignez le stock contenant ce lot avec les mêmes porteurs libres, sans autre charge.');
      if(tour.phase!=='returning'&&!onDuty())return no('Le contrat et le ravitaillement des porteurs doivent rester valides ; le retour du matériel reste possible.');
      const location=tour.holder as 'depot'|'boat',amount=tour.heldAmount+tour.allowance;
      if(!amount||!native({kind:'rav-load',actor:'carrier',location,amount}))return no(message||'Aucun lot restant à charger.');
      tour.holder='carrier';tour.loaded=true;if(tour.phase==='reserved')tour.phase='active';message='Même lot et vivres chargés au lieu réel ; quantité déduite du stock confirmé.';
    }else if(action.kind==='supply-provision'){
      if(tour.phase==='paused'||tour.holder!=='carrier'||!tour.loaded||tour.phase!=='returning'&&!onDuty())return no('Reprenez la tournée avec le lot réellement porté et les porteurs sous contrat avant de compléter les vivres.');
      const provision=action as Extract<SupplyActionV109,{kind:'supply-provision'}>;
      if(!native({kind:'rav-load',actor:'carrier',location:provision.location,amount:provision.amount}))return no(message);
      message='Vivres supplémentaires prélevés dans le stock rejoint ; aucun RAV créé.';
    }else if(action.kind==='supply-deliver'){
      if(tour.phase!=='active'||tour.holder!=='carrier'||tour.cursor>=tour.stops.length||!onDuty())return no('Le prochain dépôt attend son lot porté, des porteurs sous contrat et une tournée active.');
      const stop=tour.stops[tour.cursor];
      if(!native({kind:'rav-deposit',actor:'carrier',location:stop.workId,amount:stop.amount}))return no(message);
      tour.heldAmount-=stop.amount;tour.deliveries.push({...stop,turn:convoy.turn,baseRevision:convoy.revision});tour.cursor++;
      if(tour.cursor===tour.stops.length){tour.phase='returning';tour.returnReason='delivered';}
      message=`Étape ${tour.cursor}/${tour.stops.length} déposée au vrai casier ; ${tour.heldAmount} RAV de tournée encore présents.`;
    }else if(action.kind==='supply-close'){
      if(tour.phase!=='returning'||!atDepot()||convoy.cargo.item||convoy.cargo.work||tour.heldAmount>0&&tour.holder!=='carrier')return no('Les mêmes porteurs et le reliquat doivent revenir physiquement au dépôt.');
      if(carrier().rav&&!native({kind:'rav-deposit',actor:'carrier',location:'depot',amount:carrier().rav}))return no(message);
      tour.heldAmount=0;tour.holder=null;tour.phase=tour.returnReason==='delivered'?'completed':'cancelled';tour.finishedAtRevision=current.revision+1;
      completedRoutes.push({id:tour.id,deliveredStops:tour.cursor,deliveredRav:tour.deliveries.reduce((sum,delivery)=>sum+delivery.amount,0),result:tour.returnReason==='delivered'?'delivered':'aborted'});
      message='Tournée close au dépôt ; personnes, reliquat et consommations conservés, sans récompense de campagne.';
    }else return no('Intention de tournée inconnue.');
  }else{
    const intent=action as LogisticsActionV108;
    if(!supplyMountMoveAllowedV109(convoy,intent))return no('Approchez la longe à 12 unités et gardez deux gabarits distincts ; une ancienne superposition ne peut que s’écarter.');
    if(activeRoute(route)){
      if((intent.kind==='rav-load'||intent.kind==='rav-deposit')&&intent.actor==='carrier')return no('Utilisez les gestes de tournée pour ce lot réservé ; les autres stocks restent à leur place.');
      if(intent.kind==='release'&&intent.actor==='carrier')return no('Ramenez et clôturez la tournée avant de rendre les mêmes porteurs à la réserve.');
      if(intent.kind==='boat-depart'&&route!.holder==='boat'&&route!.heldAmount>0&&convoy.boat.passenger!=='carrier')return no('Les mêmes U19 doivent accompagner le lot réservé dans le skiff.');
    }
    if(!native(intent))return no(message);
    if(activeRoute(route)&&route!.loaded&&route!.heldAmount>0){
      if(intent.kind==='boat-board'&&route!.holder==='carrier')route!.holder='boat';
      if(intent.kind==='shuttle-board'&&route!.holder==='carrier')route!.holder='shuttle';
      if(intent.kind==='shuttle-land'&&route!.holder==='shuttle')route!.holder='carrier';
    }
  }
  const next:SupplyStateV109={...current,revision:current.revision+1,convoy,route,completedRoutes,history:[...current.history,clone(action)]};
  if(activeRoute(route)&&(route!.boatId!==convoy.boat.id||JSON.stringify(route!.carrierMembers)!==JSON.stringify(carrier().members)))return no('Identité de la coque ou des porteurs différente ; carnet conservé.');
  if(!supplyConservationV109(next))return no('Ce geste entamerait les RAV réservés. Complétez les vivres, chargez le lot ou libérez sa réservation.');
  return {state:finish(next),accepted:true,message};
}
export function exportSupplyV109(state:SupplyStateV109):string|null {return trusted.has(state)?JSON.stringify(state):null;}
export function importSupplyV109(text:string,rules=DEFAULT_WAR_RULES_V6):{state:SupplyStateV109|null;error:string|null}{
  try{
    if(new TextEncoder().encode(text).length>CLAN_SUPPLY_MAX_BYTES_V109)throw Error('Carnet supérieur à 4 Mo.');
    const raw=JSON.parse(text);
    if(!raw||raw.version!==2||raw.context!==CLAN_SUPPLY_CONTEXT_V109||!exact(raw,['version','context','revision','rulesKey','originalV108Archive','convoy','route','completedRoutes','history'])||!(raw.originalV108Archive===null||typeof raw.originalV108Archive==='string')||!Array.isArray(raw.history)||raw.history.length>5000)throw Error('Version ou contexte de tournée incompatible.');
    let state=createSupplyV109(raw.originalV108Archive,rules);if(!state)throw Error('Archive V108 originale invalide.');
    for(const command of raw.history){const result=applySupplyV109(state,command,rules);if(!result.accepted)throw Error('Historique de tournée impossible.');state=result.state;}
    if(JSON.stringify(state)!==JSON.stringify(raw))throw Error('Checkpoint différent de son historique réel.');
    return {state,error:null};
  }catch(error){return {state:null,error:error instanceof Error?error.message:'Carnet illisible.'};}
}
export function migrateSupplyArchiveV109(text:string,rules:WarRulesV6=DEFAULT_WAR_RULES_V6){
  const current=importSupplyV109(text,rules);if(current.state)return current;
  const legacy=importLogisticsV108(text,rules);return legacy.state?{state:createSupplyV109(text,rules),error:null}:current;
}
export const supplyLegacyArchiveV109=(state:SupplyStateV109)=>exportLogisticsV108(state.convoy);
