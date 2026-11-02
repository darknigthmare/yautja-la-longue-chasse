import type {WarRulesV6} from "./clanWarBibleV6";
import type {WarOperationsStateV115,WarOperationsUpdateV115} from "./clanWarOperationsV115";

/** V145 — one-time, paid protective interposition, not a new Predator
 * shield weapon or automatic reinforcement. A living rear-guard may absorb
 * exactly one point of an actual hit on a nearby leading squad for the next
 * two combat exchanges. Damage is transferred, not erased. */
export function commandWarAssaultInterposeV145(
 state:WarOperationsStateV115,guardianTeamId:string,protectedTeamId:string,
 rules:WarRulesV6,
):WarOperationsUpdateV115{
 const reject=(message:string):WarOperationsUpdateV115=>({state,accepted:false,message});
 const mission=state.active,arena=mission?.assault;
 if(state.sourceSha!==rules.metadata.sha256||mission?.mode!=="assault"||!arena)
  return reject("La manœuvre exige un assaut en cours et des règles V6 vérifiées.");
 if(!guardianTeamId||!protectedTeamId||guardianTeamId===protectedTeamId||
   !mission.teamIds.includes(guardianTeamId)||!mission.teamIds.includes(protectedTeamId))
  return reject("Deux formations engagées et distinctes doivent être désignées.");
 const live=arena.actors.filter(a=>a.side==="ally"&&a.hp>0);
 const guardian=live.find(a=>a.teamId===guardianTeamId);
 const target=live.find(a=>a.teamId===protectedTeamId);
 if(!guardian||!target||!arena.launched.includes(guardianTeamId)||
  !arena.launched.includes(protectedTeamId))
  return reject("Les deux formations doivent être vivantes et réellement sur la ligne.");
 if((arena.extractedIds??[]).includes(guardianTeamId)||
   (arena.extractedIds??[]).includes(protectedTeamId)||
   (arena.interposeUsedIds??[]).includes(guardianTeamId)||
   (arena.interposeOrders??{})[protectedTeamId])
  return reject("Protecteur déjà utilisé, groupe extrait ou poste déjà couvert.");
 if(guardian.x>target.x||target.x-guardian.x>6)
  return reject("Le protecteur doit rester physiquement derrière son allié, à six unités maximum.");
 if(!rules.units.some(u=>u.id===guardian.unitId&&u.fullMembers>0)||
   !rules.units.some(u=>u.id===target.unitId&&u.fullMembers>0))
  return reject("Les deux véritables types de formation V6 sont requis.");
 if(arena.ap<10)return reject("L'interposition défensive coûte 10 AP réels.");
 return {accepted:true,state:{...state,active:{...mission,assault:{
  ...arena,ap:arena.ap-10,
  interposeUsedIds:[...(arena.interposeUsedIds??[]),guardianTeamId],
  interposeOrders:{...(arena.interposeOrders??{}),[protectedTeamId]:{
   guardianTeamId,expiresAtTick:mission.tick+3,
  }},
 }}},message:"Écran de protection engagé entre deux groupes existants (10 AP). "+
  "Une blessure par attaque sera transférée au protecteur pendant deux échanges, sans santé gratuite."};
}
