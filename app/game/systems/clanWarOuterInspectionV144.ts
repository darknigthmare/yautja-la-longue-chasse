import type {WarRulesV6} from "./clanWarBibleV6";
import type {WarOperationsStateV115,WarOperationsUpdateV115} from "./clanWarOperationsV115";
import {warOuterWeightedProgressV141} from "./clanWarOuterWeightedProgressV141";
import {warOuterTravelLedgerV145} from "./clanWarTravelLedgerV145";

/**
 * V144: a V6 source passage can be inspected while physically traversed.
 * Dispatch personnel stay assigned; one paid RAV purchases a small, bounded
 * exercise readiness benefit in the final 3-round report, not instant intel.
 * A public condition is never a hidden enemy position.
 */
export function inspectWarOuterPassageV144(
 state:WarOperationsStateV115,operationId:string,now:number,
 rules:WarRulesV6,
):WarOperationsUpdateV115{
 const fail=(message:string):WarOperationsUpdateV115=>({state,accepted:false,message});
 if(state.sourceSha!==rules.metadata.sha256||!Number.isSafeInteger(now)||now<0)
  return fail("Règles V6 ou heure du poste de contrôle incompatibles.");
 const order=state.outer.find(o=>o.id===operationId);
 if(!order||order.recall||order.passageCheck)
  return fail("Mandat extérieur absent, déjà en rappel ou inspection déjà réalisée.");
 if(state.rav<1)return fail("Le contrôle physique du passage exige un RAV existant.");
 if(now<=order.startedAt||now>=order.dueAt)
  return fail("Inspection impossible en dehors de l'intervalle réel du convoi.");
 if(!warOuterTravelLedgerV145(order,now,rules).workable)
  return fail("Le convoi est à l'arrêt : attendre la fin de la manœuvre.");
 if(!order.teamIds.length||order.teamIds.some(id=>
    state.assignments[id]!==order.id||
    !state.teams.some(t=>t.id===id&&t.members.some(m=>m.status==="fit"))))
  return fail("Le contrôle exige un véritable détachement engagé et apte.");
 const progress=warOuterWeightedProgressV141(order,now,rules);
 const passage=rules.passages.find(p=>p.id===progress.currentPassageId&&
    order.routeIds.includes(p.id));
 if(!passage||progress.phase!=="outbound")
  return fail("Le convoi doit physiquement traverser un passage V6 identifiable.");
 const condition=String(passage.condition??"").slice(0,240);
 const passageCheck={passageId:passage.id,sourceCondition:condition,
   checkedAt:now,paidRav:1 as const};
 const outer=state.outer.map(o=>o.id===order.id?{...o,passageCheck}:o);
 return {accepted:true,state:{...state,rav:state.rav-1,outer},message:
  "Contrôle sur "+passage.name+" : 1 RAV débité ; condition publique «"+
  (condition||"aucune indication")+"». +2 préparation d'exercice au rapport final, sans résultat anticipé."};
}
