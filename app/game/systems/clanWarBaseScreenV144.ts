import type {WarRulesV6} from "./clanWarBibleV6";
import type {WarOperationsStateV115,WarOperationsUpdateV115} from "./clanWarOperationsV115";

/** V144. A physically present, living V6 formation screens its OWN base
 * for at most three combat ticks. No healing, soldier creation or film-canon
 * barrier tech: this is an original order reducing one true base strike. */
export function commandWarAssaultBaseScreenV144(
 state:WarOperationsStateV115,teamId:string,rules:WarRulesV6,
):WarOperationsUpdateV115{
 const mission=state.active,arena=mission?.assault;
 const fail=(message:string):WarOperationsUpdateV115=>({state,accepted:false,message});
 if(state.sourceSha!==rules.metadata.sha256||mission?.mode!=="assault"||!arena)
  return fail("Une bataille latérale de la Bible V6 est requise.");
 if(!mission.teamIds.includes(teamId)||!arena.launched.includes(teamId)||
   (arena.extractedIds??[]).includes(teamId)||(arena.baseScreenUsedIds??[]).includes(teamId))
  return fail("Une formation existante ne peut protéger son bastion qu'une seule fois.");
 if(arena.baseScreen)return fail("Une formation protège déjà ce bastion.");
 if(arena.ap<16)return fail("L'écran de défense réclame 16 AP de simulation.");
 const squad=arena.actors.find(actor=>actor.side==="ally"&&
   actor.teamId===teamId&&actor.hp>0&&actor.x>=0&&actor.x<=18);
 if(!squad||!rules.units.some(u=>u.id===squad.unitId&&u.fullMembers>0))
  return fail("Un défenseur vivant doit être physiquement revenu près du bastion.");
 const baseScreen={teamId,expiresAtTick:mission.tick+3};
 return {accepted:true,state:{...state,active:{...mission,assault:{
  ...arena,ap:arena.ap-16,baseScreen,
  baseScreenUsedIds:[...(arena.baseScreenUsedIds??[]),teamId],
 }}},message:"Défense V144 : "+squad.unitId+
  " protégera jusqu'à 6 PV du prochain choc réel sur le bastion durant trois échanges. 16 AP engagés."};
}
