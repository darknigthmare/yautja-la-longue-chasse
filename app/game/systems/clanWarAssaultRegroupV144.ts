import type {WarRulesV6} from "./clanWarBibleV6";
import type {WarOperationsStateV115,WarOperationsUpdateV115} from "./clanWarOperationsV115";

/**
 * V144: physically regroup ONE already deployed V6 squad around another
 * living squad of the same army. This is a tactical AP order, not a free
 * turn, troop spawn, film-canonical gadget or permanent morale modifier.
 */
export function regroupWarAssaultV144(
 state:WarOperationsStateV115,supportId:string,leaderId:string,
 rules:WarRulesV6,
):WarOperationsUpdateV115 {
 const battle=state.active,field=battle?.assault;
 const fail=(message:string):WarOperationsUpdateV115=>({state,accepted:false,message});
 if(state.sourceSha!==rules.metadata.sha256||battle?.mode!=="assault"||!field)
  return fail("L'ordre de regroupement exige un assaut V6 actif.");
 if(supportId===leaderId||!battle.teamIds.includes(supportId)||
    !battle.teamIds.includes(leaderId)||
    !field.launched.includes(supportId)||!field.launched.includes(leaderId)||
    (field.regroupUsedIds??[]).includes(supportId))
  return fail("Deux équipes alliées réellement déployées sont nécessaires, une seule relève par soutien.");
 const supporter=field.actors.find(a=>a.teamId===supportId&&a.side==="ally"&&a.hp>0);
 const leader=field.actors.find(a=>a.teamId===leaderId&&a.side==="ally"&&a.hp>0);
 if(!supporter||!leader||leader.x>35||leader.x<5||supporter.x>50||
    Math.abs(supporter.x-leader.x)<=1||Math.abs(supporter.x-leader.x)>14)
  return fail("Le rassemblement exige deux groupes vivants et réellement proches de leur ligne.");
 if((field.heldUntil?.[supportId]??0)>battle.tick||
    (field.bracedUntil?.[supportId]??0)>battle.tick)
  return fail("Le soutien doit terminer son ordre défensif avant de se regrouper.");
 if(field.ap<10)return fail("Le regroupement coûte dix AP d'exercice.");
 const dir=leader.x>supporter.x?1:-1;
 const desired=supporter.x+dir*Math.min(3,Math.abs(leader.x-supporter.x)-1);
 // Never traverse or overlap *any* living formation, on either side.
 const obstacles=field.actors.filter(a=>a.hp>0&&a.id!==supporter.id);
 const blocked=obstacles.filter(a=>
   (a.x-supporter.x)*dir>0&&(a.x-desired)*dir<=0);
 let destination=desired;
 if(blocked.length){
  const closest=blocked.sort((a,b)=>Math.abs(a.x-supporter.x)-
     Math.abs(b.x-supporter.x))[0];
  destination=closest.x-dir;
 }
 if((destination-supporter.x)*dir<=0||
    obstacles.some(a=>Math.abs(a.x-destination)<.5))
  return fail("Un combattant occupe réellement le couloir, aucun regroupement à travers un front.");
 const moved=field.actors.map(a=>a.id===supporter.id?{...a,x:destination}:a);
 const next={...state,active:{...battle,assault:{...field,
  actors:moved,ap:field.ap-10,
  regroupUsedIds:[...(field.regroupUsedIds??[]),supportId]}}};
 return {state:next,accepted:true,message:
  "Regroupement physique de "+supporter.unitId+" derrière "+leader.unitId+
  " : "+Math.abs(destination-supporter.x)+" unité(s) et dix AP engagés."};
}
