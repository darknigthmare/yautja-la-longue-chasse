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
 ids:readonly string[],fractionDone:number,rules:WarRulesV6,firstStart=0,
){
 const values=ids.map((id,index)=>{
  const passage=rules.passages.find(p=>p.id===id);
  if(!passage)throw new RangeError("V6 source passage absent: "+id);
  const cost=weight(passage.movementCost),start=index===0?firstStart:0;
  return {id,passage,cost,start,travelWeight:cost*(1-start)};
 });
 const total=values.reduce((sum,v)=>sum+v.travelWeight,0);
 const aim=fraction(fractionDone)*total;
 let consumed=0;
 for(let i=0;i<values.length;i++){
  const v=values[i];
  if(aim<consumed+v.travelWeight||i===values.length-1){
   const local=fraction(v.start+(aim-consumed)/v.cost);
   return {current:v.id,name:v.passage.name,condition:v.passage.condition,
    cost:v.cost,part:local,complete:values.slice(0,i).map(t=>t.id),
    remaining:values.slice(i+1).map(t=>t.id),completed:aim,total};
  }
  consumed+=v.travelWeight;
 }
 return {current:null,name:null,condition:null,cost:null,part:0,
  complete:[] as string[],remaining:[] as string[],completed:0,total:0};
}
export function warOuterWeightedProgressV141(
 order:WarOuterMissionV115,now:number,rules:WarRulesV6,
):WarOuterProgressV141{
 // Reading an earlier instant must not move a recalled team backwards before
 // its actual recall order. Neither the stored order nor its deadline changes.
 if(order.recall&&now<order.recall.orderedAt)return warOuterWeightedProgressV141(
  {...order,recall:undefined,dueAt:order.recall.originalDueAt},now,rules);
 const base=warOuterRouteProgressV140(order,now,rules);
 const full=order.routeIds;
 // On recall, the team reverses only those passages it actually reached,
 // not the entire untraversed advertised outbound itinerary.
 const outbound=order.recall?
  warOuterRouteProgressV140({...order,recall:undefined,
   dueAt:order.recall.originalDueAt},
   order.recall.orderedAt,rules):null;
 const reached=outbound?segment(full,outbound.legProgress,rules):null;
 // A turn inside a passage starts at that same physical point, viewed from
 // the reverse direction. Retrace only the reached fraction of that first
 // return leg. At a junction, the next untouched passage is never included.
 const prefix=reached?reached.complete.concat(
  reached.current&&reached.part>0?[reached.current]:[]):full;
 const travel=order.recall?[...prefix].reverse():full;
 const firstStart=reached&&reached.part>0?1-reached.part:0;
 const valid=segment(travel,base.legProgress,rules,firstStart);
 if(base.phase==="not-started")return {...base,
  currentPassageId:null,currentPassageName:null,sourceCondition:null,
  visitedPassageIds:[],currentPassageProgress:0,currentMovementCost:null,
  totalWeight:valid.total,completedWeight:0,remainingPassageIds:[...travel]};
 if(base.phase==="arrived")return {...base,
  totalPassages:travel.length,
  currentPassageId:null,currentPassageName:null,sourceCondition:null,
  visitedPassageIds:[...travel],currentPassageProgress:1,currentMovementCost:null,
  totalWeight:valid.total,completedWeight:valid.total,remainingPassageIds:[]};
 return {...base,
  totalPassages:travel.length,
  currentPassageId:valid.current,currentPassageName:valid.name,
  sourceCondition:valid.condition,visitedPassageIds:valid.complete,
  currentPassageProgress:valid.part,currentMovementCost:valid.cost,
  completedWeight:valid.completed,
  totalWeight:valid.total,remainingPassageIds:valid.remaining};
}
