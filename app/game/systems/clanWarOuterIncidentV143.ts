import type {WarRulesV6} from "./clanWarBibleV6";
import type {WarOperationsStateV115,WarOperationsUpdateV115,WarOuterMissionV115} from "./clanWarOperationsV115";
import {warOuterWeightedProgressV141} from "./clanWarOuterWeightedProgressV141";

/** Incident strings are PUBLIC and copied from the exact V6 passage.
 * Never guess enemy counts, create off-world cities or leak a hidden
 * opponent's position. */
export interface WarOuterIncidentVisibleV143 {
 operationId:string;passageId:string;passageName:string;incident:string;
 choices:readonly ["secure","detour"];
}
export type WarOuterIncidentDecisionV143="secure"|"detour";

export function warOuterIncidentV143(
 order:WarOuterMissionV115,now:number,rules:WarRulesV6,
):WarOuterIncidentVisibleV143|null {
 if(order.recall||order.forcedPace||order.routeIncident||!Number.isSafeInteger(now)||
    now<=order.startedAt||now>=order.dueAt)return null;
 const progress=warOuterWeightedProgressV141(order,now,rules);
 if(progress.phase!=="outbound"||!progress.currentPassageId)return null;
 const passage=rules.passages.find(p=>p.id===progress.currentPassageId&&
   order.routeIds.includes(p.id));
 if(!passage)return null;
 const incident=(passage.incident?.trim()||passage.condition?.trim()||"").slice(0,240);
 if(!incident)return null;
 return {operationId:order.id,passageId:passage.id,
  passageName:passage.name,incident,choices:["secure","detour"]};
}

/** A single physically current incident can be handled two ways:
 * secure -> spend exactly 2 existing RAV, +3 exercise resistance;
 * detour -> spend no RAV, add 10 s to the actual deadline, +2 resistance.
 * Both leave route/people unchanged and final result unresolved. */
export function commandWarOuterIncidentV143(
 state:WarOperationsStateV115,operationId:string,
 decision:WarOuterIncidentDecisionV143,now:number,rules:WarRulesV6,
):WarOperationsUpdateV115 {
 const fail=(message:string):WarOperationsUpdateV115=>({state,accepted:false,message});
 if(state.sourceSha!==rules.metadata.sha256||!["secure","detour"].includes(decision))
  return fail("Source V6 ou décision d'incident invalide.");
 const order=state.outer.find(m=>m.id===operationId);
 if(!order||order.recall||order.forcedPace||order.routeIncident)
  return fail("Mandat indisponible, rappel en cours ou incident déjà traité.");
 const publicIncident=warOuterIncidentV143(order,now,rules);
 if(!publicIncident)return fail("Aucun incident public traversé par cette équipe à cette heure.");
 if(order.teamIds.some(id=>state.assignments[id]!==order.id||
   !state.teams.some(t=>t.id===id&&t.members.some(m=>m.status==="fit"))))
  return fail("Détachement physiquement engagé et apte requis.");
 const rav=decision==="secure"?2:0,extra=decision==="detour"?10000:0;
 if(state.rav<rav)return fail("Deux RAV réels sont nécessaires pour sécuriser cet incident.");
 if(!Number.isSafeInteger(order.dueAt+extra)||
   order.dueAt+extra-order.startedAt>86400000)
  return fail("Le détour dépasserait la durée maximale d'opération.");
 const routeIncident={
  passageId:publicIncident.passageId,sourceIncident:publicIncident.incident,
  kind:decision,orderedAt:now,originalDueAt:order.dueAt,
  paidRav:rav as 0|2,
 };
 const outer=state.outer.map(m=>m.id===order.id?{...m,routeIncident,dueAt:m.dueAt+extra}:m);
 return {accepted:true,state:{...state,rav:state.rav-rav,outer},
  message:"Incident sur "+publicIncident.passageId+" : "+
   (decision==="secure"?"2 RAV engagés pour sécuriser les troupes.":
     "détour physique de 10 secondes, sans RAV supplémentaires.")+
   " Le rapport reste attendu à l'échéance réelle."};
}
