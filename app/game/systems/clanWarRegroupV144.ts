import type {WarRulesV6} from "./clanWarBibleV6";
import type {WarOperationsStateV115,WarOperationsUpdateV115} from "./clanWarOperationsV115";

/** V144 original-game two-team fallback: two EXISTING deployed groups on
 * their own half of the lane pay exactly 16 AP and each moves at most
 * three real lateral units back. It is a paid AP order like V137 fallback.
 * It does not duplicate troops, heal, skip the enemy tick or mutate V85. */
export function commandWarAssaultRegroupV144(
 state:WarOperationsStateV115,teamA:string,teamB:string,rules:WarRulesV6,
):WarOperationsUpdateV115{
 const fail=(message:string):WarOperationsUpdateV115=>({state,accepted:false,message});
 const mission=state.active,arena=mission?.assault;
 if(state.sourceSha!==rules.metadata.sha256||mission?.mode!=="assault"||!arena)
  return fail("Assaut et règles V6 d'origine nécessaires.");
 if(teamA===teamB||!teamA||!teamB||arena.ap<16)
  return fail("Deux formations différentes et 16 AP sont nécessaires.");
 const ids=[teamA,teamB];
 const actors=ids.map(team=>arena.actors.find(a=>a.teamId===team&&a.side==="ally"&&a.hp>0));
 if(actors.some(a=>!a)||ids.some(team=>!mission.teamIds.includes(team)||
   !arena.launched.includes(team)||(arena.extractedIds??[]).includes(team)||
   (arena.regroupUsedIds??[]).includes(team)||
   (arena.heldUntil?.[team]??0)>mission.tick||
   (arena.bracedUntil?.[team]??0)>mission.tick))
  return fail("Seules deux vraies équipes vivantes, disponibles et non retirées peuvent manœuvrer.");
 const [a,b]=actors as [NonNullable<typeof actors[number]>,NonNullable<typeof actors[number]>];
 if(a.x<=8||b.x<=8||a.x>55||b.x>55||Math.abs(a.x-b.x)>10)
  return fail("Les deux équipes doivent se trouver ensemble à portée de leur propre bastion.");
 const moves=new Map<string,number>();
 for(const ally of [a,b]){
  const units=rules.units.find(u=>u.id===ally.unitId);
  if(!units)return fail("Unité de la Bible V6 introuvable.");
  const stride=Math.min(3,Math.max(1,Math.ceil(units.mobility/3)));
  const rivals=arena.actors.filter(u=>u.side==="rival"&&u.hp>0&&
    u.x<ally.x&&u.x>=ally.x-stride).sort((x,y)=>y.x-x.x);
  let target=Math.max(6,ally.x-stride,rivals.length?rivals[0].x+1:6);
  if(target>=ally.x)return fail("Le couloir arrière est physiquement occupé.");
  // Prevent both allied groups landing at the same coordinate.
  while([...moves.values()].some(p=>Math.abs(p-target)<.5)&&target<ally.x)target+=.5;
  if(target>=ally.x)return fail("Le repli coordonné ne peut pas superposer les équipes.");
  moves.set(ally.id,target);
 }
 const regroupUsedIds=[...(arena.regroupUsedIds??[]),...ids];
 const repositioned={...state,active:{...mission,assault:{
  ...arena,ap:arena.ap-16,regroupUsedIds,
  actors:arena.actors.map(u=>moves.has(u.id)?{...u,x:moves.get(u.id)!}:u),
 }}};
 return {state:repositioned,accepted:true,message:"Repli coordonné de "+ids.length+
  " formations réelles (16 AP), sans traversée d'ennemi. La prochaine cadence"+
  " de combat déclenchera normalement les ripostes des adversaires."};
}
