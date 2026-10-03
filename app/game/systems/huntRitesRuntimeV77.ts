import {createRitesOfHuntV77,normalizeRitesOfHuntV77,nearestRiteCorpseV77,RITE_DURATIONS_V77,
  type RitesOfHuntV77,type RitePreyProofV77,type RiteLiveContextV77,type HuntRiteActionV77} from './ritesOfHuntV77';

/** Physical runtime adapters only. No quest, honor, trophy, inventory or rank
 * is granted. Legacy dead actors without the new death proof are not backfilled. */
export interface RiteRuntimeActorV77 {
  id:string;archetype:string;kind:'human'|'beast'|'yautja';x:number;y:number;width:number;height:number;
  health:number;maxHealth:number;alive:boolean;active:boolean;boss:boolean;
  riteDefeatedAt?:number;riteFallVelocity?:number;
  riteInvestigate?:{x:number;y:number;until:number};
}
export const huntRitesRunIdV77=(missionId:string,encounterRun:string|number)=>`${missionId}:${encounterRun}`;
export function ritePreyProofsV77(actors:readonly RiteRuntimeActorV77[],label:(id:string)=>string):RitePreyProofV77[]{
  return actors.filter(a=>!a.boss&&!a.alive&&a.active&&a.health===0&&Number.isFinite(a.riteDefeatedAt)&&a.riteDefeatedAt!>=0)
    .map(a=>({id:a.id,sourceEnemyId:a.archetype,label:label(a.archetype),kind:a.kind,
      x:a.x+a.width/2,y:a.y+a.height,health:0,defeated:true,active:true,
      worthy:a.maxHealth>0,protectedPrey:false,defeatedAt:a.riteDefeatedAt!}));
}
export function riteRuntimeContextV77(state:RitesOfHuntV77,player:{x:number;y:number;width:number;height:number;health:number},
  actors:readonly RiteRuntimeActorV77[],label:(id:string)=>string,suspended:boolean):RiteLiveContextV77{
  return {runId:state.runId,missionId:state.missionId,actor:{x:player.x+player.width/2,y:player.y+player.height},
    health:player.health,suspended,flayingToolOwned:false,supports:[],prey:ritePreyProofsV77(actors,label)};
}
/** A resumed body must be the exact real defeated actor in this checkpoint.
 * Foreign owners, invented corpses/tool actions/witnesses, altered source or
 * coordinates fail the hunt restore. No corpse is inferred from an old save. */
export function restoreRitesRuntimeV77(raw:unknown,runId:string,missionId:string,
  actors:readonly RiteRuntimeActorV77[],elapsed:number,label:(id:string)=>string):RitesOfHuntV77|null{
  if(!Number.isFinite(elapsed)||elapsed<0)return null;
  const state=normalizeRitesOfHuntV77(raw,runId,missionId);if(!state)return null;
  if(raw===undefined)return state;
  if(state.elapsed>elapsed+1e-6||state.honorDelta!==0)return null;
  const proofs=ritePreyProofsV77(actors,label),seenActors=new Set<string>();
  for(const actor of actors){
    if(seenActors.has(actor.id))return null;seenActors.add(actor.id);
    if(actor.riteDefeatedAt!==undefined&&(!Number.isFinite(actor.riteDefeatedAt)||actor.riteDefeatedAt<0||actor.riteDefeatedAt>elapsed))return null;
    if(actor.riteFallVelocity!==undefined&&(!Number.isFinite(actor.riteFallVelocity)||actor.riteFallVelocity<0||actor.riteFallVelocity>2000))return null;
    const point=actor.riteInvestigate;if(point&&(![point.x,point.y,point.until].every(Number.isFinite)||point.until<0||point.until>elapsed+6.01))return null;
  }
  for(const corpse of state.corpses){const proof=proofs.find(p=>p.id===corpse.id);
    if(!proof||corpse.sourceEnemyId!==proof.sourceEnemyId||corpse.kind!==proof.kind||corpse.label!==proof.label
      ||Math.abs(corpse.x-proof.x)>1e-6||Math.abs(corpse.y-proof.y)>1e-6||corpse.defeatedAt!==proof.defeatedAt
      ||corpse.worthy!==proof.worthy||corpse.protectedPrey!==proof.protectedPrey||corpse.flayed||corpse.supportId!==null||corpse.hangingAt!==null)return null;
    if(corpse.witnesses.length&&!corpse.marked)return null;
    for(const id of corpse.witnesses){const actor=actors.find(a=>a.id===id);if(!actor||!actor.active||actor.boss||actor.kind==='beast'||id===corpse.id)return null;}
  }
  const discoveries=state.corpses.reduce((count,c)=>count+c.witnesses.length,0);
  if(state.fear!==Math.min(100,discoveries*8)||state.awareness!==Math.min(100,discoveries*8))return null;
  if(state.operation&&(state.operation.action==='flay'||state.operation.action==='hang'))return null;
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
  corpseId:string;label:string;analyzed:boolean;marked:boolean;open:boolean;
  operation:{action:HuntRiteActionV77;progress:number}|null;witnessCount:number;
}
export function huntRiteMenuSnapshotV77(state:RitesOfHuntV77,actor:{x:number;y:number},selectedId:string|null,available:boolean):HuntRiteMenuSnapshotV77|null{
  if(!available)return null;const corpse=nearestRiteCorpseV77(state,actor);if(!corpse)return null;
  return {corpseId:corpse.id,label:corpse.label,analyzed:corpse.analyzed,marked:corpse.marked,open:selectedId===corpse.id,
    operation:state.operation?.corpseId===corpse.id?{action:state.operation.action,progress:Math.min(1,state.operation.elapsed/RITE_DURATIONS_V77[state.operation.action])}:null,
    witnessCount:corpse.witnesses.length};
}
export {createRitesOfHuntV77};
