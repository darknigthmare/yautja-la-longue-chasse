import type {WarRulesV6} from "./clanWarBibleV6";
import type {
  WarOperationsStateV115, WarOperationsUpdateV115, OuterFocusV115,
} from "./clanWarOperationsV115";

/**
 * V135: four gameplay modes advance independently, sharing the same V6
 * identities and budgets without mutating any V85 or main-campaign save.
 * These are GAME-AUTHORED prototype tactics, not film-canonical technology.
 */
const reject=(state:WarOperationsStateV115,message:string):WarOperationsUpdateV115=>
 ({state,accepted:false,message});
const accept=(state:WarOperationsStateV115,message:string):WarOperationsUpdateV115=>
 ({state,accepted:true,message});

/** Costed, one-time repair of the friendly assault line.
 * A fit, deployed squad must still be positioned near its OWN bastion.
 * No extra troops, external healing or stock is ever created.
 */
export function reinforceWarAssaultLineV135(
 state:WarOperationsStateV115,teamId:string,rules:WarRulesV6,
):WarOperationsUpdateV115 {
 const battle=state.active,arena=battle?.assault;
 if(state.sourceSha!==rules.metadata.sha256||
    battle?.mode!=="assault"||!arena)return reject(state,"Aucun assaut V6 compatible en cours.");
 if(!battle.teamIds.includes(teamId)||!arena.launched.includes(teamId))
  return reject(state,"Détachement non engagé dans ce front.");
 if((arena.fortifiedIds??[]).includes(teamId))
  return reject(state,"Cette équipe a déjà renforcé la ligne pendant ce mandat.");
 const actor=arena.actors.find(a=>a.teamId===teamId&&a.side==="ally"&&a.hp>0);
 if(!actor||actor.x>18)return reject(state,"Renfort refusé : l'équipe doit être présente près du bastion allié.");
 const unit=rules.units.find(u=>u.id===actor.unitId);
 if(!unit)return reject(state,"Source d'unité absente des règles V6.");
 if(arena.ap<18)return reject(state,"La protection de ligne demande 18 AP de simulation.");
 const protection=Math.min(80-arena.ownBase,Math.max(2,Math.min(8,Math.ceil(unit.defense/2))));
 if(protection<=0)return reject(state,"Bastion intact : aucun renfort de protection nécessaire.");
 const updated={...arena,ownBase:arena.ownBase+protection,ap:arena.ap-18,
  fortifiedIds:[...(arena.fortifiedIds??[]),teamId]};
 return accept({...state,active:{...battle,assault:updated}},
  "Ligne alliée consolidée de "+protection+" points : 18 AP engagés, une intervention par équipe.");
}

/**
 * Retask an Outer Ops order BEFORE midpoint, once only.
 * It preserves the real participants, route, upstream upkeep and dueAt;
 * enemies, rewards and result remain unknown until the scheduled return.
 */
export function redirectWarOuterOpsV135(
 state:WarOperationsStateV115,operationId:string,focus:OuterFocusV115,
 now:number,rules:WarRulesV6,
):WarOperationsUpdateV115 {
 if(state.sourceSha!==rules.metadata.sha256||!Number.isSafeInteger(now)||now<0)
  return reject(state,"Source V6 ou horodatage de réorientation invalide.");
 if(!["recon","escort","intercept"].includes(focus))
  return reject(state,"Consigne de réorientation inconnue.");
 const order=state.outer.find(m=>m.id===operationId);
 if(!order||order.recall)return reject(state,"Mandat clôturé ou rappel en cours.");
 if(order.retask)return reject(state,"Une seule réorientation autorisée pour ce mandat.");
 if(focus===order.focus)return reject(state,"La consigne choisie est déjà active.");
 if(now<order.startedAt||now>=order.dueAt||
   2*(now-order.startedAt)>=(order.dueAt-order.startedAt))
  return reject(state,"Réorientation possible uniquement durant la première moitié du trajet.");
 if(state.assignments===null||order.teamIds.some(id=>state.assignments[id]!==operationId||
   !state.teams.some(team=>team.id===id)))
  return reject(state,"Identités de détachements engagés incompatibles.");
 const modified={...order,focus,retask:{oldFocus:order.focus,changedAt:now}};
 return accept({...state,outer:state.outer.map(m=>m.id===operationId?modified:m)},
  "Mandat réorienté vers "+focus+" ; échéance et RAV déjà dépensés conservés, résultat inconnu.");
}
