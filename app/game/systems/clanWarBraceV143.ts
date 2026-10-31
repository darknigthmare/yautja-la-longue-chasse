import type {WarRulesV6} from "./clanWarBibleV6";
import type {WarOperationsStateV115,WarOperationsUpdateV115} from "./clanWarOperationsV115";

/**
 * V143 original-game shield line: a physically deployed group near the
 * friendly half can take a two-tick defensive posture for 14 exercise AP.
 * This is not a movie-canonical shield gadget or free healing.
 */
export function commandWarAssaultBraceV143(
 state:WarOperationsStateV115,teamId:string,rules:WarRulesV6,
):WarOperationsUpdateV115 {
 const mission=state.active,arena=mission?.assault;
 const fail=(message:string):WarOperationsUpdateV115=>({state,accepted:false,message});
 if(mission?.mode!=="assault"||!arena||state.sourceSha!==rules.metadata.sha256)
  return fail("Aucun front latéral compatible V6 n'est actif.");
 if(!mission.teamIds.includes(teamId)||!arena.launched.includes(teamId)||
    (arena.extractedIds??[]).includes(teamId))
  return fail("L'ordre défensif exige une vraie formation encore déployée.");
 if((arena.braceUsedIds??[]).includes(teamId))
  return fail("Cette formation a déjà utilisé sa posture défensive.");
 const ally=arena.actors.find(a=>a.side==="ally"&&a.teamId===teamId&&a.hp>0);
 if(!ally||ally.x>40||ally.x<5)
  return fail("Le groupe doit être vivant, présent et proche de sa moitié du champ de bataille.");
 if(!rules.units.some(u=>u.id===ally.unitId&&u.fullMembers>0))
  return fail("Formation ou membres absents de la Bible V6.");
 if(arena.ap<14)return fail("14 AP de simulation requis pour se retrancher.");
 const braceUsedIds=[...(arena.braceUsedIds??[]),teamId];
 const bracedUntil={...(arena.bracedUntil??{}),[teamId]:mission.tick+3};
 return {accepted:true,state:{...state,active:{...mission,assault:{
  ...arena,ap:arena.ap-14,braceUsedIds,bracedUntil,
 }}},message:"Formation "+ally.unitId+
  " retranchée deux échanges adverses : 14 AP, moins un dégât reçu par attaque, aucun soin ni recrue."};
}
