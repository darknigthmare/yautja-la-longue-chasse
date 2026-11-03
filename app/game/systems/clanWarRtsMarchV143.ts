import type {WarRtsSquadsStateV133,WarRtsSquadsUpdateV133} from "./clanWarRtsSquadsV133";
import {commandWarRtsWaypointV142,
 type WarRtsWaypointV142} from "./clanWarRtsWaypointV142";

/** Deliberate, non-autonomous order of up to THREE physical moves.
 * Each movement is individually delegated to V142 (which advances a
 * normal enemy/weather tick); stops on surprise contact, casualty,
 * completed phase or blocked tiles. No fog, objective or RAV bypass.
 */
export function commandWarRtsMarchV143(
 original:WarRtsSquadsStateV133,squadId:string,
 goal:WarRtsWaypointV142,maximumSteps:1|2|3=3,
):WarRtsSquadsUpdateV133 {
 const fail=(msg:string):WarRtsSquadsUpdateV133=>({state:original,accepted:false,message:msg});
 if(original.phase!=="active"||original.report||![1,2,3].includes(maximumSteps))
  return fail("Aucune marche RTS active ou limite de déplacement invalide.");
 const initial=original.squads.find(u=>u.id===squadId&&u.status==="active"&&u.hp>0);
 if(!initial)return fail("Le détachement doit être physiquement actif pour marcher.");
 let state=original,steps=0,contact=false;
 for(let i=0;i<maximumSteps;i++){
  if(state.phase!=="active"||state.report)break;
  const before=state.squads.find(u=>u.id===squadId);
  if(!before||before.status!=="active"||before.hp<=0)break;
  const result=commandWarRtsWaypointV142(state,squadId,goal);
  if(!result.accepted)break;
  state=result.state;
  // Count actual physical movement instead of assuming a hidden obstacle.
  const after=state.squads.find(u=>u.id===squadId);
  const moved=after&&Math.abs(after.x-before.x)+Math.abs(after.y-before.y)===1;
  if(moved)steps++;
  else {contact=true;break;} // V142 may spend one wait turn on surprise
  if(!after||after.hp<before.hp||after.status!=="active")break; // under fire: stop on contact
 }
 if(state===original)return fail("Aucun chemin d'une case disponible vers l'objectif.");
 const delta=state.turn-original.turn;
 return {accepted:true,state,message:
  "Marche V143 : "+steps+" case(s) réellement franchie(s) et "+delta+
  " tour(s) adverse(s) exécuté(s),"+(contact?" progression interrompue par contact ou obstacle.":" arrêt contrôlé.")+
  " Aucun objectif automatique ni ressource gratuite."};
}
