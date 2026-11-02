import type {WarRulesV6} from "./clanWarBibleV6";
import type {WarOperationsStateV115,WarOperationsUpdateV115} from "./clanWarOperationsV115";
import {warOuterRouteChoicesV142} from "./clanWarOuterChoicesV142";
import {warOuterWeightedProgressV141} from "./clanWarOuterWeightedProgressV141";

/** V144 route change is an actual EARLY correction to a dispatched mission,
 * not a teleport between planets. One source-legal alternative, +5 real
 * seconds and 1 existing RAV, with the same signed team assignments. */
export function commandWarOuterRerouteV144(
 state:WarOperationsStateV115,id:string,
 selectedPassageIds:readonly string[],now:number,rules:WarRulesV6,
):WarOperationsUpdateV115{
 const fail=(message:string):WarOperationsUpdateV115=>({state,accepted:false,message});
 if(state.sourceSha!==rules.metadata.sha256||!Number.isSafeInteger(now)||now<0)
  return fail("Horloge ou Bible V6 incompatible.");
 const order=state.outer.find(o=>o.id===id);
 if(!order||order.recall||order.forcedPace||order.routeDiversion||order.routeIncident||
    order.reconHalt||order.fieldSignal)
  return fail("Le trajet n'est plus modifiable, a déjà été corrigé ou est en retour.");
 if(state.rav<1)return fail("Une vraie unité RAV est nécessaire pour modifier l'ordre.");
 if(!Array.isArray(selectedPassageIds)||!selectedPassageIds.length||
   selectedPassageIds.some(x=>typeof x!=="string"))
  return fail("Choisissez une alternative V6 entièrement connue.");
 const total=Math.max(1,order.dueAt-order.startedAt);
 if(now<order.startedAt||now>=order.dueAt||
    now-order.startedAt>Math.min(5000,total*.15))
  return fail("Réorientation possible uniquement dans les premières secondes du départ.");
 if(order.teamIds.length===0||order.teamIds.some(team=>
    state.assignments[team]!==id||
    !state.teams.some(t=>t.id===team&&t.members.some(m=>m.status==="fit"))))
  return fail("Détachements réels indisponibles ou non affectés.");
 const pc=order.teamIds.reduce((sum,team)=>{
  const own=state.teams.find(t=>t.id===team);
  return sum+(rules.units.find(u=>u.id===own?.unitId)?.commandPoints??0);
 },0);
 const options=warOuterRouteChoicesV142(state.baseId,order.targetId,pc,rules);
 const choice=options.find(v=>v.passageIds.join("|")===selectedPassageIds.join("|"));
 if(!choice||choice.passageIds.join("|")===order.routeIds.join("|"))
  return fail("Cet itinéraire n'est pas une alternative source légalement navigable.");
 const progress=warOuterWeightedProgressV141(order,now,rules);
 if(progress.phase!=="outbound"||
  progress.visitedPassageIds.length!==0||
  (choice.passageIds[0]!==order.routeIds[0]&&
    progress.currentPassageProgress>.05))
  return fail("La formation a déjà franchi le carrefour nécessaire à ce détour.");
 if(!Number.isSafeInteger(order.dueAt+5000)||
    order.dueAt+5000-order.startedAt>86400000)
  return fail("La nouvelle échéance dépasserait la durée maximale d'opération.");
 const routeDiversion={fromPassageIds:[...order.routeIds],
  originalDueAt:order.dueAt,changedAt:now,paidRav:1 as const};
 const outer=state.outer.map(o=>o.id===id?{...o,
  routeIds:[...choice.passageIds],routeChoiceId:choice.id,
  dueAt:o.dueAt+5000,routeDiversion}:o);
 return {accepted:true,state:{...state,rav:state.rav-1,outer},
  message:"Itinéraire révisé sur les passages V6 légaux : 1 RAV engagé, "+
    "5 secondes de manœuvre ; mêmes détachements, résultat toujours inconnu."};
}
