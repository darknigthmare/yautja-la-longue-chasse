import type {WarRulesV6} from "./clanWarBibleV6";
import type {WarOperationsStateV115,WarOperationsUpdateV115} from "./clanWarOperationsV115";

/**
 * Original V137 gameplay features. They operate only on the separate V115
 * free exercise; never confer ownership, campaign XP or film-canon equipment.
 */
const reject=(state:WarOperationsStateV115,message:string):WarOperationsUpdateV115=>({state,accepted:false,message});
const accept=(state:WarOperationsStateV115,message:string):WarOperationsUpdateV115=>({state,accepted:true,message});

/**
 * Recover an EXISTING assault team alive and within its own extraction lane.
 * A recovered squad cannot be dispatched twice into the same battle; its
 * launched ID remains locked and the extraction receipt costs 10 AP.
 * It never silently heals a casualty or teleports a distant formation.
 */
export function withdrawWarAssaultSquadV137(
 state:WarOperationsStateV115,teamId:string,rules:WarRulesV6,
):WarOperationsUpdateV115 {
 const mission=state.active,assault=mission?.assault;
 if(state.sourceSha!==rules.metadata.sha256||mission?.mode!=="assault"||!assault)
  return reject(state,"Bataille latérale et source V6 nécessaires.");
 if(!mission.teamIds.includes(teamId)||!assault.launched.includes(teamId)||
   (assault.extractedIds??[]).includes(teamId))
  return reject(state,"Seule une formation encore engagée et non retirée peut se replier.");
 const actor=assault.actors.find(a=>a.side==="ally"&&a.teamId===teamId&&a.hp>0);
 if(!actor||actor.x>18||actor.x<0)
  return reject(state,"Repli refusé : détachement vivant à ramener physiquement près de son bastion.");
 if(assault.ap<10)return reject(state,"Le couloir de repli exige 10 AP de simulation.");
 const next={...assault,ap:assault.ap-10,
  actors:assault.actors.filter(a=>a.id!==actor.id),
  extractedIds:[...(assault.extractedIds??[]),teamId]};
 return accept({...state,active:{...mission,assault:next}},
  "Détachement "+teamId+" retiré vivant du bastion : 10 AP engagés. Retour sans recrutement ni annexion.");
}

/**
 * Risk/reward alternative to a paid supply order: a recon/escort team stops
 * for a real 15-second route study. Same members/passage IDs and no new RAV,
 * but its report cannot arrive at the original deadline. Only one halt.
 */
export function orderWarOuterReconHaltV137(
 state:WarOperationsStateV115,id:string,now:number,rules:WarRulesV6,
):WarOperationsUpdateV115 {
 if(state.sourceSha!==rules.metadata.sha256||!Number.isSafeInteger(now)||now<0)
  return reject(state,"Horloge ou source V6 incompatible.");
 const order=state.outer.find(m=>m.id===id);
 if(!order||order.recall||order.reconHalt)
  return reject(state,"Mandat absent, déjà arrêté ou en retour.");
 if(order.focus!=="recon"&&order.focus!=="escort")
  return reject(state,"Une halte d'étude n'est admise que pour reconnaissance ou escorte.");
 const originalDueAt=order.dueAt;
 if(now<order.startedAt||now>=originalDueAt||
   2*(now-order.startedAt)>=originalDueAt-order.startedAt)
  return reject(state,"Halte refusée : la formation a dépassé la première moitié de sa route.");
 if(!Number.isSafeInteger(originalDueAt+15000)||
   originalDueAt+15000-order.startedAt>86400000)
  return reject(state,"La nouvelle échéance dépasserait la limite d'opération.");
 if(order.teamIds.length===0||order.teamIds.some(teamId=>
    state.assignments[teamId]!==order.id||
    !state.teams.some(t=>t.id===teamId&&t.members.some(p=>p.status==="fit"))))
  return reject(state,"La halte requiert des personnes effectivement présentes et aptes.");
 const next={...order,dueAt:originalDueAt+15000,
   reconHalt:{orderedAt:now,originalDueAt,extraMs:15000 as const}};
 return accept({...state,outer:state.outer.map(m=>m.id===id?next:m)},
  "Halte de terrain confirmée : +15 s de trajet, mêmes équipes et RAV, rapport remis à l'échéance réelle.");
}
