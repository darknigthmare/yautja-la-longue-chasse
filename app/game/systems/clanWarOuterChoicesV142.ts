import {planWarRouteV6,type WarRulesV6} from "./clanWarBibleV6";

/** V142: alternative itineraries are recomputed from the real directed V6
 * passage graph, using the exact deployed PC capacity. No inferred links,
 * enemy locations, instantaneous teleport or fictional planet. */
export interface WarOuterRouteChoiceV142{
 id:string;passageIds:string[];territoryIds:string[];cost:number;
 conditionLabels:string[];isPrimary:boolean;
}
export function warOuterRouteChoicesV142(
 fromId:string,toId:string,commandPoints:number,rules:WarRulesV6,
):WarOuterRouteChoiceV142[]{
 const first=planWarRouteV6(fromId,toId,commandPoints,[],rules);
 if(!first)return [];
 const pool=[first];
 const tried=new Set<string>([first.passageIds.join("|")]);
 const excluded=new Set<string>(first.passageIds);
 for(const id of excluded){
  const alt=planWarRouteV6(fromId,toId,commandPoints,[id],rules);
  if(!alt)continue;
  const key=alt.passageIds.join("|");
  if(tried.has(key))continue;
  tried.add(key);pool.push(alt);
 }
 // Choose up to three distinct *actually navigable* paths, sorting by
 // source weight. No route may be forged from unconstrained UI strings.
 const result=pool
  .sort((a,b)=>a.cost-b.cost||a.passageIds.join("|").localeCompare(b.passageIds.join("|")))
  .slice(0,3);
 return result.map((route,i)=>({
  id:"W142-PATH-"+(i+1),
  passageIds:[...route.passageIds],
  territoryIds:[...route.territoryIds],
  cost:route.cost,
  conditionLabels:route.passageIds.map(pid=>{
   const p=rules.passages.find(a=>a.id===pid);
   return p?.condition??"passage-source-inconnu";
  }),
  isPrimary:route.passageIds.join("|")===first.passageIds.join("|"),
 }));
}
export function warOuterRouteIsAuthorizedV142(
 fromId:string,toId:string,commandPoints:number,
 routeIds:readonly string[],rules:WarRulesV6,
):boolean{
 if(!Array.isArray(routeIds)||!routeIds.length||routeIds.length>100||
   routeIds.some(id=>typeof id!=="string"))return false;
 const canonical=routeIds.join("|");
 return warOuterRouteChoicesV142(fromId,toId,commandPoints,rules)
  .some(p=>p.passageIds.join("|")===canonical);
}
