import type {WarRulesV6} from "./clanWarBibleV6";
import type {WarOperationsStateV115,WarOperationsUpdateV115} from "./clanWarOperationsV115";

/** V144 original Outer Ops logistics: a one-time forced pace before 25%
 * journey progress. Pays 3 genuine RAV, reduces true return dueAt by 8s
 * and adds +2 resistance (fatigue/risk) to the eventual THREE exchanges.
 * No teleport, hidden opponent information, added troop or instant report.
 */
export function commandWarOuterPaceV144(
 state:WarOperationsStateV115,operationId:string,now:number,rules:WarRulesV6,
):WarOperationsUpdateV115 {
 const fail=(message:string):WarOperationsUpdateV115=>({state,accepted:false,message});
 if(state.sourceSha!==rules.metadata.sha256||!Number.isSafeInteger(now)||now<0)
  return fail("Règles V6 ou horodatage d'opération invalide.");
 const order=state.outer.find(o=>o.id===operationId);
 if(!order||order.recall||order.forcedPace||order.reconHalt||
    order.routeIncident||order.routeDiversion||order.fieldSignal)
  return fail("Marche forcée impossible après rappel, détour, halte ou seconde accélération.");
 if(order.startedAt>now||now>=order.dueAt||
   4*(now-order.startedAt)>order.dueAt-order.startedAt)
  return fail("L'accélération doit être ordonnée durant le premier quart du trajet.");
 if(state.rav<3)return fail("Trois RAV réels sont nécessaires au rythme forcé.");
 if(order.dueAt-8000<=now+2000)
  return fail("Le rapport ne peut être ramené à une échéance déjà dépassée.");
 if(order.teamIds.length===0||order.teamIds.some(id=>
   state.assignments[id]!==operationId||
   !state.teams.some(t=>t.id===id&&t.members.some(m=>m.status==="fit"))))
  return fail("Le convoi doit conserver au moins une personne apte réellement affectée.");
 const dueAt=order.dueAt-8000;
 const forcedPace={orderedAt:now,originalDueAt:order.dueAt,paidRav:3 as const,savedMs:8000 as const};
 return {accepted:true,state:{...state,rav:state.rav-3,
  outer:state.outer.map(o=>o.id===order.id?{...o,dueAt,forcedPace}:o)},
  message:"Marche forcée validée : 3 RAV dépensés, rapport avancé de 8 secondes mais résistance d'exercice +2. Aucune victoire anticipée."};
}
