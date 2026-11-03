import type {WarRulesV6} from "./clanWarBibleV6";
import type {WarOperationsStateV115,WarOperationsUpdateV115} from "./clanWarOperationsV115";

/**
 * V142: paid fire control over an EXISTING, physically seen rival.
 * One order per identified V6 team and per source V115 assault, consumed
 * by one permitted shot. No magical through-unit ranged fire or free XP.
 */
export function issueWarAssaultFocusV142(
 state:WarOperationsStateV115,teamId:string,rivalActorId:string,
 rules:WarRulesV6,
):WarOperationsUpdateV115{
 const mission=state.active,arena=mission?.assault;
 const fail=(message:string):WarOperationsUpdateV115=>
  ({state,accepted:false,message});
 if(mission?.mode!=="assault"||!arena||state.sourceSha!==rules.metadata.sha256)
  return fail("Le contrôle du tir réclame un assaut actif avec les vraies données V6.");
 if(!mission.teamIds.includes(teamId)||!arena.launched.includes(teamId)||
  (arena.extractedIds??[]).includes(teamId)||
  (arena.focusUsedIds??[]).includes(teamId))
  return fail("Une équipe réellement engagée ne peut recevoir qu'un ordre de tir prioritaire.");
 if(arena.ap<12)return fail("La priorité de tir coûte 12 AP réels d'exercice.");
 const actor=arena.actors.find(u=>u.teamId===teamId&&u.side==="ally"&&u.hp>0);
 const target=arena.actors.find(u=>u.id===rivalActorId&&u.side==="rival"&&u.hp>0);
 if(!actor||!target||actor.id===target.id)
  return fail("La cible et le détachement doivent être réellement présents et vivants.");
 const unit=rules.units.find(u=>u.id===actor.unitId);
 if(!unit) return fail("Le détachement est absent de la Bible V6.");
 const range=Math.max(5,Math.min(22,unit.range*2+3));
 const distance=Math.abs(actor.x-target.x);
 if(distance>range)return fail("Cet adversaire est physiquement hors de la portée V6.");
 if(arena.actors.some(u=>u.side==="rival"&&u.hp>0&&u.id!==target.id&&
   Math.abs(u.x-actor.x)<distance))
  return fail("Une autre formation adverse fait obstacle à cette cible.");
 const focusOrders={...(arena.focusOrders??{}),
  [teamId]:{targetId:target.id,expiresAtTick:mission.tick+2}};
 const active={...mission,assault:{...arena,ap:arena.ap-12,focusOrders,
   focusUsedIds:[...(arena.focusUsedIds??[]),teamId]}};
 return {state:{...state,active},accepted:true,message:
  "Priorité de tir de "+unit.id+" sur "+target.unitId+
  " : 12 AP engagés, +1 dégât seulement si le tir physique se produit avant 2 tours."};
}
