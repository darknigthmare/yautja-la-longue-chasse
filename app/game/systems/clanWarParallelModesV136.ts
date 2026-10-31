import type {WarRulesV6} from "./clanWarBibleV6";
import type {WarOperationsStateV115,WarOperationsUpdateV115} from "./clanWarOperationsV115";

/**
 * V136 — original game-prototype tactics, not declarations about the canon.
 * Each order changes the same V115 exercise state and NEVER the V85 campaign.
 */
const reject=(state:WarOperationsStateV115,message:string):WarOperationsUpdateV115=>
 ({state,accepted:false,message});
const accept=(state:WarOperationsStateV115,message:string):WarOperationsUpdateV115=>
 ({state,accepted:true,message});

/**
 * Hold one deployed V6 detachment near its own side of the assault lane for
 * exactly three SIMULATION ticks. During the hold it may fire within the
 * existing V6 range but cannot automatically rush the enemy bastion.
 * The command spends 15 AP, grants zero troops and can be issued once per
 * genuine deployed team during one mission.
 */
export function orderWarAssaultHoldV136(
 state:WarOperationsStateV115,teamId:string,rules:WarRulesV6,
):WarOperationsUpdateV115{
 const mission=state.active,arena=mission?.assault;
 if(mission?.mode!=="assault"||!arena||state.sourceSha!==rules.metadata.sha256)
  return reject(state,"Assaut V6 incompatible ou inexistant.");
 if(!mission.teamIds.includes(teamId)||!arena.launched.includes(teamId))
  return reject(state,"Seule une équipe réellement déployée peut protéger la ligne.");
 const actor=arena.actors.find(unit=>unit.teamId===teamId&&unit.side==="ally"&&unit.hp>0);
 if(!actor||actor.x>25)return reject(state,"L'équipe doit être encore en vie près de son bastion.");
 if((arena.holdIssuedIds??[]).includes(teamId))
  return reject(state,"Cet ordre de tenue a déjà été consommé par cette équipe.");
 if(arena.ap<15)return reject(state,"15 AP de simulation requis, sans emprunter aux RAV V6.");
 const updated={...arena,ap:arena.ap-15,
  holdIssuedIds:[...(arena.holdIssuedIds??[]),teamId],
  heldUntil:{...(arena.heldUntil??{}),[teamId]:mission.tick+4}};
 return accept({...state,active:{...mission,assault:updated}},
  "Tenue du bastion engagée : "+teamId+" garde sa position durant trois tours tactiques. 15 AP engagés.");
}

/**
 * Outer Ops on-route support: one 2-RAV supply allocation before the midpoint.
 * Real existing members and V6 passage IDs remain assigned. Dispatch and
 * report timestamps are unchanged. A modest +4 exercise-strength is applied
 * only when the mission settles; a loss can still occur.
 */
export function supplyWarOuterMissionV136(
 state:WarOperationsStateV115,id:string,now:number,rules:WarRulesV6,
):WarOperationsUpdateV115{
 if(state.sourceSha!==rules.metadata.sha256||!Number.isSafeInteger(now)||now<0)
  return reject(state,"Source V6 ou date du ravitaillement invalide.");
 const order=state.outer.find(item=>item.id===id);
 if(!order||order.recall)return reject(state,"Mandat absent, clos ou déjà en rappel.");
 if(order.fieldSupport)return reject(state,"Ce mandat a déjà reçu son ravitaillement complémentaire.");
 if(now<order.startedAt||now>=order.dueAt||
    2*(now-order.startedAt)>=order.dueAt-order.startedAt)
  return reject(state,"Le ravitaillement doit précéder la mi-parcours, sans retour anticipé.");
 if(order.teamIds.length===0||order.teamIds.some(teamId=>
   state.assignments[teamId]!==id||
   !state.teams.some(team=>team.id===teamId&&team.members.some(member=>member.status==="fit"))))
  return reject(state,"Aucune équipe effectivement engagée et apte sur cet itinéraire.");
 if(state.rav<2)return reject(state,"Deux RAV V6 nécessaires ; aucun stock fictif n'est créé.");
 const updated={...order,fieldSupport:{allocatedAt:now,paidRav:2 as const}};
 return accept({...state,rav:state.rav-2,
  outer:state.outer.map(item=>item.id===id?updated:item)},
  "Ravitaillement réellement engagé (2 RAV) : même route, mêmes équipes, même échéance. Issue encore inconnue.");
}
