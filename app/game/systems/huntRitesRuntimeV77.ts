import type { WorldBlueprint } from "./worldBlueprints";
import { anatomyPartsV112, anatomyIntegrityV112, anatomyBodyMassV112, specimenQualityV112, makeAnatomySpecimenV112 } from "./anatomyHarvestV112";
import { CARCASS_HANG_DROP_V112, carcassFitsSocketV112 } from "./carcassSupportsV112";
import type { FieldSpecimenV112 } from "./harvestInventoryV112";
import type { RiteSupportV77 } from "./ritesOfHuntV77";
import {createRitesOfHuntV77,normalizeRitesOfHuntV77,nearestRiteCorpseV77,RITE_DURATIONS_V77,
  type RitesOfHuntV77,type RitePreyProofV77,type RiteLiveContextV77,type HuntRiteActionV77} from './ritesOfHuntV77';

/** Physical runtime adapters only. No quest, honor, trophy, inventory or rank
 * is granted. Legacy dead actors without the new death proof are not backfilled. */
export interface RiteRuntimeActorV77 {
  id:string;archetype:string;kind:'human'|'beast'|'yautja';x:number;y:number;width:number;height:number;
  health:number;maxHealth:number;alive:boolean;active:boolean;boss:boolean;
  riteDefeatedAt?:number;riteFallVelocity?:number;riteIntegrityLossV112?:number;
  riteInvestigate?:{x:number;y:number;until:number};
}
export interface RiteRuntimeOptionsV111 {
  readonly flayingToolOwned:boolean; readonly world?:WorldBlueprint; readonly supports?:readonly RiteSupportV77[];
  readonly maximumSpecimens?:number; readonly toolWorkMultiplier?:number; readonly acceptSpecimen?:(item:FieldSpecimenV112)=>boolean;
}
const DEFAULT_RITE_RUNTIME_OPTIONS_V111:RiteRuntimeOptionsV111={flayingToolOwned:false};
export const huntRitesRunIdV77=(missionId:string,encounterRun:string|number)=>`${missionId}:${encounterRun}`;
export function ritePreyProofsV77(actors:readonly RiteRuntimeActorV77[],label:(id:string)=>string):RitePreyProofV77[]{
  return actors.filter(a=>!a.boss&&!a.alive&&a.active&&a.health===0&&Number.isFinite(a.riteDefeatedAt)&&a.riteDefeatedAt!>=0)
    .map(a=>({id:a.id,sourceEnemyId:a.archetype,label:label(a.archetype),kind:a.kind,
      x:a.x+a.width/2,y:a.y+a.height,health:0,defeated:true,active:true,
      worthy:a.maxHealth>0,protectedPrey:false,defeatedAt:a.riteDefeatedAt!,integrity:anatomyIntegrityV112(a.riteIntegrityLossV112),massKg:anatomyBodyMassV112(a.archetype,a.width,a.height)}));
}
export function riteRuntimeContextV77(state:RitesOfHuntV77,player:{x:number;y:number;width:number;height:number;health:number;grounded?:boolean;climbing?:boolean},
  actors:readonly RiteRuntimeActorV77[],label:(id:string)=>string,suspended:boolean,
  options:RiteRuntimeOptionsV111=DEFAULT_RITE_RUNTIME_OPTIONS_V111):RiteLiveContextV77{
  return {runId:state.runId,missionId:state.missionId,actor:{x:player.x+player.width/2,y:player.y+player.height},
    health:player.health,suspended,flayingToolOwned:options.flayingToolOwned===true,grounded:player.grounded,climbing:player.climbing,toolWorkMultiplier:options.toolWorkMultiplier,acceptSpecimen:options.acceptSpecimen,supports:options.supports??[],prey:ritePreyProofsV77(actors,label)};
}
/** A resumed body must be the exact real defeated actor in this checkpoint.
 * Foreign owners, invented corpses/tool actions/witnesses, altered source or
 * coordinates fail the hunt restore. No corpse is inferred from an old save. */
export function restoreRitesRuntimeV77(raw:unknown,runId:string,missionId:string,
  actors:readonly RiteRuntimeActorV77[],elapsed:number,label:(id:string)=>string,
  options:RiteRuntimeOptionsV111=DEFAULT_RITE_RUNTIME_OPTIONS_V111):RitesOfHuntV77|null{
  if(!Number.isFinite(elapsed)||elapsed<0)return null;
  const state=normalizeRitesOfHuntV77(raw,runId,missionId);if(!state)return null;
  if(raw===undefined)return state;
  if(state.elapsed>elapsed+1e-6||state.honorDelta!==0)return null;
  const proofs=ritePreyProofsV77(actors,label),seenActors=new Set<string>();
  for(const actor of actors){
    if(seenActors.has(actor.id))return null;seenActors.add(actor.id);
    if(actor.riteDefeatedAt!==undefined&&(!Number.isFinite(actor.riteDefeatedAt)||actor.riteDefeatedAt<0||actor.riteDefeatedAt>elapsed))return null;
    if(actor.riteIntegrityLossV112!==undefined&&(!Number.isFinite(actor.riteIntegrityLossV112)||actor.riteIntegrityLossV112<0||actor.riteIntegrityLossV112>100))return null;
    if(actor.riteFallVelocity!==undefined&&(!Number.isFinite(actor.riteFallVelocity)||actor.riteFallVelocity<0||actor.riteFallVelocity>2000))return null;
    const point=actor.riteInvestigate;if(point&&(![point.x,point.y,point.until].every(Number.isFinite)||point.until<0||point.until>elapsed+6.01))return null;
  }
  for(const corpse of state.corpses){const proof=proofs.find(p=>p.id===corpse.id);
    if(!proof||corpse.sourceEnemyId!==proof.sourceEnemyId||corpse.kind!==proof.kind||corpse.label!==proof.label
      ||Math.abs(corpse.x-proof.x)>1e-6||Math.abs(corpse.y-proof.y)>1e-6||corpse.defeatedAt!==proof.defeatedAt
      ||corpse.worthy!==proof.worthy||corpse.protectedPrey!==proof.protectedPrey||corpse.flayed&&options.flayingToolOwned!==true||corpse.integrity!==undefined&&corpse.integrity!==proof.integrity||corpse.massKg!==undefined&&corpse.massKg!==proof.massKg)return null;
    if(corpse.integrity===undefined||corpse.massKg===undefined){
      if((state.specimensV112??[]).some(item=>item.sourceId===state.runId+':'+corpse.id))return null;
      // V111 traces did not record anatomy. Derive physical facts from the
      // actual saved actor rather than assuming every old body weighs 70 kg.
      corpse.integrity=proof.integrity;corpse.massKg=proof.massKg;
    }
    if(corpse.supportId){
      const support=options.supports?.find(s=>s.id===corpse.supportId);
      if(!support?.suitable||support.maximumMass<(corpse.massKg??70)||!corpse.hangingAt||options.world&&!carcassFitsSocketV112(actors.find(a=>a.id===corpse.id)!,support,options.world)||
        corpse.hangingAt.x!==support.x||corpse.hangingAt.y!==support.y||
        corpse.x!==support.x||corpse.y!==support.y+CARCASS_HANG_DROP_V112||
        state.corpses.some(c=>c.id!==corpse.id&&c.supportId===support.id))return null;
    }
    if(corpse.witnesses.length&&!corpse.marked&&!corpse.flayed&&!corpse.hung)return null;
    for(const id of corpse.witnesses){const actor=actors.find(a=>a.id===id);if(!actor||!actor.active||actor.boss||actor.kind==='beast'||id===corpse.id)return null;}
  }
  const witnessedFear=state.corpses.reduce((total,c)=>total+(c.witnessFear??c.witnesses.map(()=>8)).reduce((sum,value)=>sum+value,0),0);
  if(state.fear!==Math.min(100,witnessedFear)||state.awareness!==Math.min(100,state.corpses.reduce((sum,c)=>sum+(c.witnessFear??c.witnesses.map(()=>8)).reduce((n,f)=>n+(f===35?20:8),0),0)))return null;
  if(state.operation&&((state.operation.action==='flay'||state.operation.action.startsWith('harvest-'))&&options.flayingToolOwned!==true||
    state.operation.action==='hang'&&(!options.supports?.some(s=>s.id===state.operation?.supportId&&s.suitable)||state.carryingCorpseId!==state.operation.corpseId)))return null;
  if((state.specimensV112??[]).length&&options.flayingToolOwned!==true)return null;
  if((state.specimensV112??[]).length>Math.min(64,options.maximumSpecimens??64))return null;
  return state;
}
/** Landing moves the real dead actor first. The ledger follows this same anchor,
 * so visual persistence never manufactures a second position/collision body. */
export function followRiteCorpseAnchorsV77(state:RitesOfHuntV77,actors:readonly RiteRuntimeActorV77[]):RitesOfHuntV77{
  let changed=false;const corpses=state.corpses.map(c=>{const a=actors.find(a=>a.id===c.id);
    if(!a||a.alive||!a.active||a.health!==0||a.archetype!==c.sourceEnemyId)return c;
    const x=a.x+a.width/2,y=a.y+a.height;if(x===c.x&&y===c.y)return c;changed=true;return {...c,x,y};});
  return changed?{...state,corpses}:state;
}
/** Full occluder intersection. One-way walkable ledges are not sight walls. */
export function riteLineOfSightV77(a:{x:number;y:number},b:{x:number;y:number},
  walls:readonly {x:number;y:number;width:number;height:number;collision?:string}[]):boolean{
  for(const wall of walls){if(wall.collision&&wall.collision!=='solid')continue;
    let start=0,end=1;const dx=b.x-a.x,dy=b.y-a.y;
    const clips=[[-dx,a.x-wall.x],[dx,wall.x+wall.width-a.x],[-dy,a.y-wall.y],[dy,wall.y+wall.height-a.y]];
    let blocked=true;for(const [p,q] of clips){if(p===0){if(q<0){blocked=false;break;}}
      else{const t=q/p;if(p<0)start=Math.max(start,t);else end=Math.min(end,t);if(start>end){blocked=false;break;}}}
    if(blocked&&end>1e-6&&start<1-1e-6)return false;
  }return true;
}
export function riteWitnessCanSeeV77(witness:RiteRuntimeActorV77&{facing:-1|1},corpse:{x:number;y:number},
  walls:Parameters<typeof riteLineOfSightV77>[2],coverOcclusion:number):boolean{
  const at={x:witness.x+witness.width/2,y:witness.y+witness.height/2},distance=Math.hypot(at.x-corpse.x,at.y-corpse.y);
  return witness.alive&&witness.active&&!witness.boss&&witness.kind!=='beast'&&distance<=480
    &&(distance<=90||(corpse.x>=at.x?1:-1)===witness.facing)&&coverOcclusion<=.15&&riteLineOfSightV77(at,corpse,walls);
}
export function reactToRiteWitnessV77<T extends {mode:string;suspicion:number;morale:number;timeInMode:number}>(brain:T):T{
  return {...brain,suspicion:Math.min(1,brain.suspicion+.16),morale:Math.max(0,brain.morale-.08),
    mode:brain.mode==='patrol'?'suspicion':brain.mode,timeInMode:brain.mode==='patrol'?0:brain.timeInMode};
}
export interface HuntRiteMenuSnapshotV77 {
  corpseId:string;label:string;analyzed:boolean;marked:boolean;flayed:boolean;canFlay:boolean;flayLockedReason:string|null;open:boolean;
  operation:{action:HuntRiteActionV77;progress:number}|null;witnessCount:number;
  integrity:number;massKg:number;carrying:boolean;canCarry:boolean;canHang:boolean;hangSupportId:string|null;hangReason:string;
  parts:{action:HuntRiteActionV77;label:string;quality:number;seconds:number;available:boolean;reason:string}[];
}
export function huntRiteMenuSnapshotV77(state:RitesOfHuntV77,actor:{x:number;y:number},selectedId:string|null,available:boolean,
  options:RiteRuntimeOptionsV111=DEFAULT_RITE_RUNTIME_OPTIONS_V111):HuntRiteMenuSnapshotV77|null{
  if(!available)return null;const corpse=nearestRiteCorpseV77(state,actor);if(!corpse)return null;
  const flayLockedReason=corpse.flayed?'Dépeçage déjà terminé.':options.flayingToolOwned!==true?'Acheter le Flaying Tool à l’armurerie.':
    corpse.protectedPrey||!corpse.worthy?'Le Code protège cette proie.':null;
  const carrying=state.carryingCorpseId===corpse.id;
  const support=(options.supports??[]).filter(s=>s.suitable&&s.maximumMass>=(corpse.massKg??70)&&
    Math.hypot(s.x-actor.x,s.y-actor.y)<=180&&corpse.y-s.y>=90&&!state.corpses.some(c=>c.id!==corpse.id&&c.supportId===s.id))
    .sort((a,b)=>Math.hypot(a.x-actor.x,a.y-actor.y)-Math.hypot(b.x-actor.x,b.y-actor.y))[0];
  const canHang=carrying&&corpse.flayed&&!corpse.supportId&&!!support;
  const parts=anatomyPartsV112(corpse.sourceEnemyId).map(part=>{
    const item=makeAnatomySpecimenV112(state.runId,corpse.id,corpse.sourceEnemyId,part.action,corpse.integrity??100,corpse.analyzed)!;
    const reason=state.completedEventIds.includes(part.action+':'+corpse.id)?'Déjà prélevé.':!options.flayingToolOwned?'Flaying Tool requis.':
      part.requiresFlay&&!corpse.flayed?'Dépecer d’abord.':state.carryingCorpseId?'Déposer la carcasse.':options.acceptSpecimen?.(item)!==true?'Emport ou dépôt plein.':'';
    return {action:part.action,label:part.label,quality:specimenQualityV112(corpse.integrity??100,part,corpse.analyzed),
      seconds:part.seconds*(options.toolWorkMultiplier??1),available:reason==='',reason};
  });
  return {integrity:corpse.integrity??100,massKg:corpse.massKg??70,carrying,canCarry:!state.carryingCorpseId&&corpse.flayed&&!corpse.supportId&&(corpse.massKg??70)<=170,
    canHang,hangSupportId:canHang?support!.id:null,hangReason:corpse.supportId?'Corps déjà suspendu.':!carrying?'Dépecer puis porter la carcasse jusqu’au crochet.':!support?'Pas de crochet libre et assez solide à portée.':'',
    parts,corpseId:corpse.id,label:corpse.label,analyzed:corpse.analyzed,marked:corpse.marked,flayed:corpse.flayed,canFlay:flayLockedReason===null,flayLockedReason,open:selectedId===corpse.id,
    operation:state.operation?.corpseId===corpse.id?{action:state.operation.action,progress:Math.min(1,state.operation.elapsed/RITE_DURATIONS_V77[state.operation.action])}:null,
    witnessCount:corpse.witnesses.length};
}
export {createRitesOfHuntV77};
