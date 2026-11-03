import type {WarRulesV6} from "./clanWarBibleV6";
import type {WarOperationsStateV115,WarOperationsUpdateV115} from "./clanWarOperationsV115";

/** Original V139 tactical fallback; modifies only V115 free-exercise state.
 * No teleport, free troop, canon claim, RAV budget substitution or V85 capture.
 */
export function fallbackWarAssaultV139(
 state:WarOperationsStateV115,teamId:string,rules:WarRulesV6,
):WarOperationsUpdateV115 {
 const mission=state.active,arena=mission?.assault;
 const reject=(message:string):WarOperationsUpdateV115=>({state,accepted:false,message});
 if(mission?.mode!=="assault"||!arena||state.sourceSha!==rules.metadata.sha256)
  return reject("Aucune bataille latérale compatible avec la Bible V6.");
 if(!mission.teamIds.includes(teamId)||!arena.launched.includes(teamId)||
   (arena.extractedIds??[]).includes(teamId))
  return reject("Ce groupe n'est pas physiquement engagé dans le couloir de retour.");
 const actor=arena.actors.find(a=>a.side==="ally"&&a.teamId===teamId&&a.hp>0);
 if(!actor||actor.x<=5)
  return reject("L'équipe doit être vivante et déjà éloignée de son bastion.");
 if((arena.heldUntil?.[teamId]??0)>mission.tick)
  return reject("L'équipe maintient encore un poste et ne peut simultanément se replier.");
 const previous=arena.fallbackCounts?.[teamId]??0;
 if(!Number.isInteger(previous)||previous<0||previous>=20)
  return reject("Plafond de vingt ordres de repli atteint pour ce détachement.");
 if(arena.ap<8)return reject("Un pas de repli tactique nécessite 8 AP.");
 const unit=rules.units.find(u=>u.id===actor.unitId);
 if(!unit)return reject("Formation manquante de la Bible V6.");
 const stride=Math.max(2,Math.min(5,Math.ceil(unit.mobility/2)+1));
 const nearestRear=arena.actors
  .filter(u=>u.side==="rival"&&u.hp>0&&u.x<=actor.x&&u.x>=actor.x-stride)
  .sort((a,b)=>b.x-a.x)[0];
 const destination=Math.max(5,actor.x-stride,nearestRear?nearestRear.x+1:5);
 if(destination>=actor.x)
  return reject("Un combattant adverse occupe le couloir arrière : aucun passage à travers une unité.");
 const actors=arena.actors.map(a=>a.id===actor.id?{...a,x:destination}:a);
 return {accepted:true,state:{...state,active:{...mission,assault:{
  ...arena,actors,ap:arena.ap-8,
  fallbackCounts:{...(arena.fallbackCounts??{}),[teamId]:previous+1},
 }}},message:"Repli contrôlé de "+unit.id+" : "+
 (actor.x-destination)+" unités physiques parcourues vers le bastion (8 AP)."};
}
