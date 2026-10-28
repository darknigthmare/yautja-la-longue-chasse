import { anatomyPartV112, makeAnatomySpecimenV112 } from "./anatomyHarvestV112.ts";
import type { FieldSpecimenV112 } from "./harvestInventoryV112";
import { CARCASS_HANG_DROP_V112 } from "./carcassSupportsV112.ts";
/** Original gameplay rules based on the user's Rites of the Hunt brief.
 * Numeric durations, fear, honor and eligibility are game adaptation, not canon.
 * The caller supplies real defeated actors, supports, line of sight and clock.
 * No inventory, rank, trophy or account state is granted by this module. */
export const HUNT_RITE_ACTIONS_V77 = ['analyze','mark','flay','hang','carry','drop','harvest-hide','harvest-tissue','harvest-bone','leave','erase'] as const;
export type HuntRiteActionV77 = typeof HUNT_RITE_ACTIONS_V77[number];
export interface RitePointV77 { readonly x:number; readonly y:number }
export interface RitePreyProofV77 extends RitePointV77 {
  readonly id:string; readonly sourceEnemyId:string; readonly label:string;
  readonly defeated:boolean; readonly active:boolean; readonly health:number;
  readonly kind:'human'|'beast'|'yautja'; readonly worthy:boolean;
  readonly protectedPrey:boolean; readonly defeatedAt:number;
  readonly integrity?:number; readonly massKg?:number;
}
export interface RiteSupportV77 extends RitePointV77 {
  readonly id:string; readonly suitable:boolean; readonly maximumMass:number;
}
/** Mutable physical anchor follows its one real dead actor. Proofs remain readonly. */
export interface RiteCorpseV77 {
  x:number; y:number;
  id:string; sourceEnemyId:string; label:string; kind:RitePreyProofV77['kind'];
  worthy:boolean; protectedPrey:boolean; defeatedAt:number;
  analyzed:boolean; marked:boolean; flayed:boolean; erased:boolean;
  supportId:string|null; hangingAt:RitePointV77|null;
  witnesses:string[];
  /** Fear at the actual discovery time; older runtime traces only caused eight. */
  witnessFear?:number[];
  integrity?:number; massKg?:number; hung?:boolean;
}
export interface RiteOperationV77 {
  corpseId:string; action:HuntRiteActionV77; elapsed:number;
  startHealth:number; supportId:string|null; confirmedDishonor:boolean;
}
export interface RitesOfHuntV77 {
  version:1; runId:string; missionId:string; elapsed:number;
  corpses:RiteCorpseV77[]; operation:RiteOperationV77|null;
  honorDelta:number; awareness:number; fear:number;
  completedEventIds:string[];
  carryingCorpseId?:string|null; specimensV112?:FieldSpecimenV112[];
}
export interface RiteLiveContextV77 {
  readonly runId:string; readonly missionId:string; readonly actor:RitePointV77;
  readonly health:number; readonly suspended:boolean; readonly flayingToolOwned:boolean;
  readonly prey:readonly RitePreyProofV77[]; readonly supports:readonly RiteSupportV77[];
  readonly grounded?:boolean; readonly climbing?:boolean; readonly toolWorkMultiplier?:number;
  readonly acceptSpecimen?:(item:FieldSpecimenV112)=>boolean;
}
export interface RiteResultV77 { state:RitesOfHuntV77; accepted:boolean; message:string }
export const RITE_DURATIONS_V77:Readonly<Record<HuntRiteActionV77,number>>={analyze:1.4,mark:1,flay:3.2,hang:2.5,carry:0,drop:0,'harvest-hide':3.8,'harvest-tissue':2.6,'harvest-bone':3.4,leave:0,erase:1.8};
const idValid=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=128&&!/[\u0000-\u001f]/.test(v);
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<1e8;
const point=(v:unknown):v is RitePointV77=>!!v&&typeof v==='object'&&finite((v as RitePointV77).x)&&finite((v as RitePointV77).y);
const distance=(a:RitePointV77,b:RitePointV77)=>Math.hypot(a.x-b.x,a.y-b.y);
const result=(state:RitesOfHuntV77,accepted:boolean,message:string):RiteResultV77=>({state,accepted,message});
export function createRitesOfHuntV77(runId:string,missionId:string):RitesOfHuntV77 {
  if(!idValid(runId)||!idValid(missionId))throw new Error('Identité de chasse rituellement invalide.');
  return {version:1,runId,missionId,elapsed:0,corpses:[],operation:null,honorDelta:0,awareness:0,fear:0,completedEventIds:[],carryingCorpseId:null,specimensV112:[]};
}
function owned(state:RitesOfHuntV77,context:RiteLiveContextV77){
  return state.runId===context.runId&&state.missionId===context.missionId&&point(context.actor)&&finite(context.health)&&context.health>0&&!context.suspended;
}
/** Materialise a corpse only from the actual defeated actor. Repeat callbacks
 * preserve all work and witnesses, rather than creating another reward source. */
export function registerRitePreyV77(state:RitesOfHuntV77,proof:RitePreyProofV77,context:RiteLiveContextV77):RiteResultV77 {
  if(!owned(state,context)||!proof.defeated||!proof.active||proof.health!==0||!point(proof)||!idValid(proof.id)||!idValid(proof.sourceEnemyId)
    ||!idValid(proof.label)||!finite(proof.defeatedAt)||proof.defeatedAt<0||!context.prey.some(p=>p===proof))
    return result(state,false,'Seule une proie réellement vaincue dans cette chasse laisse une trace.');
  if(state.corpses.some(c=>c.id===proof.id))return result(state,false,'Cette proie est déjà conservée.');
  if(state.corpses.length>=128)return result(state,false,'Le registre de cette chasse est plein ; aucune prise n’est effacée.');
  const corpse:RiteCorpseV77={id:proof.id,sourceEnemyId:proof.sourceEnemyId,label:proof.label,kind:proof.kind,x:proof.x,y:proof.y,
    worthy:proof.worthy,protectedPrey:proof.protectedPrey,defeatedAt:proof.defeatedAt,analyzed:false,marked:false,flayed:false,erased:false,supportId:null,hangingAt:null,witnesses:[],witnessFear:[],integrity:proof.integrity??100,massKg:proof.massKg??70,hung:false};
  return result({...state,elapsed:Math.max(state.elapsed,proof.defeatedAt),corpses:[...state.corpses,corpse]},true,'Trace de chasse conservée ; aucun trophée encore prélevé.');
}
export function nearestRiteCorpseV77(state:RitesOfHuntV77,actor:RitePointV77):RiteCorpseV77|null {
  if(!point(actor))return null;
  return state.corpses.filter(c=>!c.erased&&distance(c,actor)<=88).sort((a,b)=>distance(a,actor)-distance(b,actor))[0]??null;
}
export function startHuntRiteV77(state:RitesOfHuntV77,corpseId:string,action:HuntRiteActionV77,context:RiteLiveContextV77,
  options:{supportId?:string;confirmDishonor?:boolean}={}):RiteResultV77 {
  const corpse=state.corpses.find(c=>c.id===corpseId),proof=context.prey.find(p=>p.id===corpseId);
  if(!owned(state,context)||state.operation||!HUNT_RITE_ACTIONS_V77.includes(action)||!corpse||corpse.erased||!proof?.defeated||proof.health!==0
    ||distance(corpse,context.actor)>88)return result(state,false,'Approche la proie vaincue et termine le geste précédent.');
  if(corpse.supportId&&['hang','carry','flay'].includes(action))return result(state,false,'La proie est suspendue ; aucun second corps ne peut être créé.');
  if(action==='drop'){
    if(state.carryingCorpseId!==corpse.id)return result(state,false,'Aucune carcasse portée.');
    return result({...state,carryingCorpseId:null},true,'Carcasse déposée ; elle reprend sa chute sur le terrain réel.');
  }
  if(action==='carry'){
    if(state.carryingCorpseId||!corpse.flayed||context.grounded===false||context.climbing===true||(corpse.massKg??70)>170)
      return result(state,false,'Dépecer, garder les mains libres et un appui : un corps de 170 kg au maximum.');
    return result({...state,carryingCorpseId:corpse.id},true,'Carcasse saisie. Marche au sol jusqu’au crochet ; dépose-la avant combat ou escalade.');
  }
  if(action==='leave')return result(state.carryingCorpseId===corpse.id?{...state,carryingCorpseId:null}:state,true,'La proie reste sur place ; aucune récompense ajoutée.');
  if(action==='analyze'&&(state.specimensV112??[]).some(item=>item.sourceId===state.runId+':'+corpse.id))return result(state,false,'Analyse à effectuer avant tout prélèvement irréversible.');
  if(action==='analyze'&&corpse.analyzed||action==='mark'&&corpse.marked||action==='flay'&&corpse.flayed)
    return result(state,false,'Ce geste est déjà inscrit pour cette proie.');
  if(action==='flay'&&!context.flayingToolOwned)return result(state,false,'Le Flaying Tool acquis est nécessaire ; les lames de poignet ne le remplacent pas.');
  if((action==='flay'||action==='hang')&&(corpse.protectedPrey||!corpse.worthy)&&!options.confirmDishonor)
    return result(state,false,'Proie indigne ou protégée : confirme explicitement la violation du Code.');
  const part=anatomyPartV112(corpse.sourceEnemyId,action);
  if(action.startsWith('harvest-')&&(!part||!context.flayingToolOwned||part.requiresFlay&&!corpse.flayed||
    state.carryingCorpseId||context.grounded===false||context.climbing===true||state.completedEventIds.includes(action+':'+corpse.id)))
    return result(state,false,'Partie absente, déjà prélevée ou geste indisponible : outil, appui et préparation nécessaires.');
  const specimen=part?makeAnatomySpecimenV112(state.runId,corpse.id,corpse.sourceEnemyId,action,corpse.integrity??100,corpse.analyzed):null;
  if(specimen&&context.acceptSpecimen?.(specimen)!==true)return result(state,false,'Emport plein ; la partie reste sur le corps. Dépose une prise avant de recommencer.');
  const support=options.supportId?context.supports.find(s=>s.id===options.supportId):null;
  if(action==='hang'&&(!corpse.flayed||state.carryingCorpseId!==corpse.id||!support?.suitable||support.maximumMass<(corpse.massKg??70)||state.corpses.some(c=>c.id!==corpse.id&&c.supportId===support.id)||distance(support,context.actor)>180||corpse.y-support.y<90||context.grounded===false||context.climbing===true))
    return result(state,false,'La suspension exige un rite terminé et un véritable appui élevé à portée.');
  return result({...state,operation:{corpseId,action,elapsed:0,startHealth:context.health,supportId:action==='hang'?support!.id:null,
    confirmedDishonor:options.confirmDishonor===true}},true,'Le geste prend du temps ; la chasse continue autour de toi.');
}
/** Pausing preserves exact identity and elapsed time. Damage, lost owner,
 * departure or altered support abort the operation without its completion. */
export function stepHuntRiteV77(state:RitesOfHuntV77,delta:number,context:RiteLiveContextV77):RiteResultV77 {
  if(context.suspended)return result(state,false,'Chasse suspendue.');
  if(!finite(delta)||delta<0||delta>0.1||!owned(state,context))return result(state,false,'Temps ou propriétaire de chasse invalide.');
  const next={...state,elapsed:state.elapsed+delta};
  if(!state.operation)return result(next,false,'Aucun geste en cours.');
  const operation=state.operation,corpse=state.corpses.find(c=>c.id===operation.corpseId),proof=context.prey.find(p=>p.id===operation.corpseId);
  const support=operation.supportId?context.supports.find(s=>s.id===operation.supportId):null;
  if(!corpse||corpse.erased||!proof?.defeated||proof.health!==0||context.health<operation.startHealth||distance(corpse,context.actor)>88
    ||(['flay','hang'].includes(operation.action)||operation.action.startsWith('harvest-'))&&(context.grounded===false||context.climbing===true)
    ||(operation.action==='flay'||operation.action.startsWith('harvest-'))&&!context.flayingToolOwned
    ||operation.action==='hang'&&(!support?.suitable||support.maximumMass<(corpse.massKg??70)||state.carryingCorpseId!==corpse.id||
      distance(support,context.actor)>180||state.corpses.some(c=>c.id!==corpse.id&&c.supportId===support.id)))
    return result({...next,operation:null},false,'Rite interrompu : aucune completion, aucune récompense.');
  const workMultiplier=(operation.action==='flay'||operation.action.startsWith('harvest-'))?Math.max(1,Math.min(1.65,context.toolWorkMultiplier??1)):1;
  const elapsed=operation.elapsed+delta/workMultiplier;
  if(elapsed+1e-9<RITE_DURATIONS_V77[operation.action])return result({...next,operation:{...operation,elapsed}},false,'Geste en cours.');
  const eventId=operation.action+':'+corpse.id;
  if(state.completedEventIds.includes(eventId))return result({...next,operation:null},false,'Geste déjà confirmé.');
  const changed={...corpse,witnesses:[...corpse.witnesses],witnessFear:[...(corpse.witnessFear??corpse.witnesses.map(()=>8))]};
  if(operation.action==='analyze')changed.analyzed=true;
  if(operation.action==='mark')changed.marked=true;
  if(operation.action==='flay')changed.flayed=true;
  if(operation.action==='erase')changed.erased=true;
  if(operation.action==='hang'){changed.supportId=support!.id;changed.hangingAt={x:support!.x,y:support!.y};changed.x=support!.x;changed.y=support!.y+CARCASS_HANG_DROP_V112;changed.hung=true;}
  const part=anatomyPartV112(corpse.sourceEnemyId,operation.action);
  const specimen=part?makeAnatomySpecimenV112(state.runId,corpse.id,corpse.sourceEnemyId,operation.action,corpse.integrity??100,corpse.analyzed):null;
  if(operation.action.startsWith('harvest-')&&(!specimen||context.acceptSpecimen?.(specimen)!==true))
    return result({...next,operation:null},false,'Emport changé : partie conservée sur la carcasse, aucun coût ni prélèvement.');
  const specimensV112=specimen?[...(state.specimensV112??[]),specimen]:(state.specimensV112??[]);
  const violation=(operation.action==='flay'||operation.action==='hang')&&(corpse.protectedPrey||!corpse.worthy);
  const honorDelta=state.honorDelta+(violation?-15:0);
  return result({...next,operation:null,honorDelta,specimensV112,carryingCorpseId:operation.action==='hang'||operation.action==='erase'&&state.carryingCorpseId===corpse.id?null:state.carryingCorpseId??null,corpses:state.corpses.map(c=>c.id===changed.id?changed:c),completedEventIds:[...state.completedEventIds,eventId]},true,
    violation?'Violation du Code enregistrée ; aucun rang ou butin accordé.':'Geste inscrit dans la trace de cette chasse.');
}
export function discoverHuntRiteV77(state:RitesOfHuntV77,corpseId:string,witness:{id:string;kind:RitePreyProofV77['kind'];position:RitePointV77;alive:boolean;lineOfSight:boolean},
  context:RiteLiveContextV77):RiteResultV77 {
  const corpse=state.corpses.find(c=>c.id===corpseId),at=corpse?.hangingAt??corpse;
  if(!owned(state,context)||!corpse||corpse.erased||!at||!idValid(witness.id)||!witness.alive||witness.kind==='beast'||!witness.lineOfSight
    ||!point(witness.position)||distance(at,witness.position)>480||corpse.witnesses.includes(witness.id)||corpse.witnesses.length>=64
    ||(!corpse.marked&&!corpse.flayed&&!corpse.supportId))return result(state,false,'Aucune découverte nouvelle de mise en scène.');
  const fear=corpse.supportId?35:corpse.flayed?20:8;
  return result({...state,fear:Math.min(100,state.fear+fear),awareness:Math.min(100,state.awareness+(corpse.supportId?20:8)),
    corpses:state.corpses.map(c=>c.id===corpseId?{...c,witnesses:[...c.witnesses,witness.id],witnessFear:[...(c.witnessFear??c.witnesses.map(()=>8)),fear]}:c)},true,
    'La mise en scène a été découverte : terreur et vigilance augmentent ensemble.');
}
/** Legacy absence creates no historic corpses. Malformed/future payloads fail
 * closed; cross-check against real saved defeated actors belongs to the caller. */
export function normalizeRitesOfHuntV77(raw:unknown,runId:string,missionId:string):RitesOfHuntV77|null {
  if(raw===undefined)return createRitesOfHuntV77(runId,missionId);
  if(!raw||typeof raw!=='object')return null;
  const s=raw as RitesOfHuntV77;
  if(s.version!==1||s.runId!==runId||s.missionId!==missionId||!finite(s.elapsed)||s.elapsed<0||!finite(s.honorDelta)||s.honorDelta>0
    ||!finite(s.awareness)||s.awareness<0||s.awareness>100||!finite(s.fear)||s.fear<0||s.fear>100||!Array.isArray(s.corpses)||s.corpses.length>128
    ||!Array.isArray(s.completedEventIds)||s.completedEventIds.length>1024||s.completedEventIds.some(id=>typeof id!=='string'||id.length>256)
    ||new Set(s.completedEventIds).size!==s.completedEventIds.length)return null;
  for(const c of s.corpses){if(!c||!point(c)||!idValid(c.id)||!idValid(c.sourceEnemyId)||!idValid(c.label)||!['human','beast','yautja'].includes(c.kind)
    ||!finite(c.defeatedAt)||c.defeatedAt<0||c.defeatedAt>s.elapsed||['worthy','protectedPrey','analyzed','marked','flayed','erased'].some(k=>typeof c[k as keyof RiteCorpseV77]!=='boolean')
    ||!Array.isArray(c.witnesses)||c.witnesses.length>64||c.witnesses.some(id=>!idValid(id))||new Set(c.witnesses).size!==c.witnesses.length
    ||c.witnessFear!==undefined&&(!Array.isArray(c.witnessFear)||c.witnessFear.length!==c.witnesses.length||c.witnessFear.some(value=>value!==8&&value!==20&&value!==35||value===20&&!c.flayed||value===35&&!c.supportId&&!c.hung))
    ||c.integrity!==undefined&&(!finite(c.integrity)||c.integrity<0||c.integrity>100)||c.massKg!==undefined&&(!finite(c.massKg)||c.massKg<12||c.massKg>300)||c.hung!==undefined&&typeof c.hung!=='boolean'
    ||c.supportId!==null&&!idValid(c.supportId)||c.hangingAt!==null&&!point(c.hangingAt)||!!c.supportId!==!!c.hangingAt||c.supportId&&!c.flayed)return null;}
  if(new Set(s.corpses.map(c=>c.id)).size!==s.corpses.length)return null;
  if(s.specimensV112!==undefined&&(!Array.isArray(s.specimensV112)||s.specimensV112.length>384||s.specimensV112.some(i=>!i||typeof i!=='object'||!idValid(i.id))||new Set(s.specimensV112.map(i=>i.id)).size!==s.specimensV112.length))return null;
  const expectedEvents=s.corpses.flatMap(c=>[
    ...(c.analyzed?['analyze:'+c.id]:[]),...(c.marked?['mark:'+c.id]:[]),
    ...(c.flayed?['flay:'+c.id]:[]),...(c.hung||c.supportId?['hang:'+c.id]:[]),...(c.erased?['erase:'+c.id]:[]),
    ...(s.specimensV112??[]).filter(item=>item.sourceId===s.runId+':'+c.id).map(item=>'harvest-'+item.partId+':'+c.id),
  ]).sort();
  if(expectedEvents.length!==s.completedEventIds.length||expectedEvents.some((id,index)=>id!==[...s.completedEventIds].sort()[index]))return null;
  if(s.carryingCorpseId!==undefined&&s.carryingCorpseId!==null&&(!idValid(s.carryingCorpseId)||!s.corpses.some(c=>c.id===s.carryingCorpseId&&!c.erased&&!c.supportId&&c.flayed&&(c.massKg??70)<=170)))return null;
  for(const item of s.specimensV112??[]){
    const corpse=s.corpses.find(c=>s.runId+':'+c.id===item.sourceId);
    const part=corpse?anatomyPartV112(corpse.sourceEnemyId,'harvest-'+item.partId):null;
    const expected=corpse&&part?makeAnatomySpecimenV112(s.runId,corpse.id,corpse.sourceEnemyId,part.action,corpse.integrity??100,corpse.analyzed):null;
    if(!expected||Object.keys(expected).some(key=>item[key as keyof FieldSpecimenV112]!==expected[key as keyof FieldSpecimenV112])||part?.requiresFlay&&!corpse?.flayed)return null;
  }
  if(s.operation!==null){const o=s.operation;if(!o||!idValid(o.corpseId)||!s.corpses.some(c=>c.id===o.corpseId)||!HUNT_RITE_ACTIONS_V77.includes(o.action)
    ||['leave','carry','drop'].includes(o.action)||!finite(o.elapsed)||o.elapsed<0||o.elapsed>=RITE_DURATIONS_V77[o.action]||!finite(o.startHealth)||o.startHealth<=0
    ||typeof o.confirmedDishonor!=='boolean'||o.supportId!==null&&!idValid(o.supportId)||o.action==='hang'&&!o.supportId||o.action!=='hang'&&o.supportId!==null)return null;}
  return JSON.parse(JSON.stringify(s)) as RitesOfHuntV77;
}
