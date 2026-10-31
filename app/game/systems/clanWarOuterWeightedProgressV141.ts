import type {WarRulesV6} from "./clanWarBibleV6";
import type {WarOuterMissionV115} from "./clanWarOperationsV115";
import {warOuterRouteProgressV140,type WarOuterRouteProgressV140} from "./clanWarOuterRouteProgressV140";

/** Weighted passage timeline. Uses ONLY public V6 movementCost/condition,
 * never confidential enemy strength or a fictitious server location.
 * It is a duration estimate within the bounded exercise mission. */
export interface WarOuterProgressV141 extends WarOuterRouteProgressV140 {
 currentPassageProgress:number;
 currentMovementCost:number|null;
 completedWeight:number;
 totalWeight:number;
 remainingPassageIds:string[];
}
const weight=(v:number)=>Number.isFinite(v)&&v>0?Math.max(1,v):1;
const fraction=(x:number)=>Math.max(0,Math.min(1,x));
function segment(
 ids:readonly string[],fractionDone:number,rules:WarRulesV6,
){
 const values=ids.map(id=>{
  const passage=rules.passages.find(p=>p.id===id);
  if(!passage)throw new RangeError("V6 source passage absent: "+id);
  return {id,passage,cost:weight(passage.movementCost)};
 });
 const total=values.reduce((sum,v)=>sum+v.cost,0);
 const aim=fraction(fractionDone)*total;
 let consumed=0;
 for(let i=0;i<values.length;i++){
  const v=values[i];
  if(aim<consumed+v.cost||i===values.length-1){
   const local=fraction((aim-consumed)/v.cost);
   return {current:v.id,name:v.passage.name,condition:v.passage.condition,
    cost:v.cost,part:local,complete:values.slice(0,i).map(t=>t.id),
    remaining:values.slice(i+1).map(t=>t.id),consumed,total};
  }
  consumed+=v.cost;
 }
 return {current:null,name:null,condition:null,cost:null,part:0,
  complete:[] as string[],remaining:[] as string[],consumed:0,total:0};
}
export function warOuterWeightedProgressV141(
 order:WarOuterMissionV115,now:number,rules:WarRulesV6,
):WarOuterProgressV141{
 const base=warOuterRouteProgressV140(order,now,rules);
 const full=order.routeIds;
 // On recall, the team reverses only those passages it actually reached,
 // not the entire untraversed advertised outbound itinerary.
 const outbound=order.recall?
  warOuterRouteProgressV140({...order,recall:undefined},
   order.recall.orderedAt,rules):null;
 const prefix=outbound&&full.length?
  segment(full,outbound.legProgress,rules).complete.concat(
   segment(full,outbound.legProgress,rules).current??[]):full;
 const travel=order.recall?[...prefix].reverse():full;
 const valid=segment(travel,base.legProgress,rules);
 if(base.phase==="not-started")return {...base,
  currentPassageId:null,currentPassageName:null,sourceCondition:null,
  visitedPassageIds:[],currentPassageProgress:0,currentMovementCost:null,
  totalWeight:valid.total,completedWeight:0,remainingPassageIds:[...travel]};
 if(base.phase==="arrived")return {...base,
  currentPassageId:null,currentPassageName:null,sourceCondition:null,
  visitedPassageIds:[...travel],currentPassageProgress:1,currentMovementCost:null,
  totalWeight:valid.total,completedWeight:valid.total,remainingPassageIds:[]};
 return {...base,
  currentPassageId:valid.current,currentPassageName:valid.name,
  sourceCondition:valid.condition,visitedPassageIds:valid.complete,
  currentPassageProgress:valid.part,currentMovementCost:valid.cost,
  completedWeight:valid.consumed+valid.part*(valid.cost??0),
  totalWeight:valid.total,remainingPassageIds:valid.remaining};
}
