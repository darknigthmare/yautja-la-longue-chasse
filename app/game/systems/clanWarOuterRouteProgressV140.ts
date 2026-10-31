import type {WarRulesV6} from "./clanWarBibleV6";
import type {WarOuterMissionV115} from "./clanWarOperationsV115";

/** V140 segment timeline. This is a simulation estimate across REAL V6
 * passage IDs, not GPS, hidden enemy sightings or a server-side clock. */
export interface WarOuterRouteProgressV140 {
 operationId:string;
 phase:"not-started"|"outbound"|"returning"|"arrived";
 currentPassageId:string|null;
 currentPassageName:string|null;
 sourceCondition:string|null;
 visitedPassageIds:string[];
 totalPassages:number;
 legProgress:number; // 0...1
 elapsedMs:number;remainingMs:number;
}
const fraction=(n:number)=>Math.min(1,Math.max(0,n));
const safe=(v:number)=>Number.isFinite(v)?Math.max(0,v):0;

function outboundFraction(order:WarOuterMissionV115,now:number):number {
 const original=order.reconHalt?.originalDueAt??order.recall?.originalDueAt??order.dueAt;
 const total=Math.max(1,original-order.startedAt);
 // A V137 halt truly consumes 15 seconds without moving along a passage.
 const paused=order.reconHalt&&now>order.reconHalt.orderedAt?
  Math.min(order.reconHalt.extraMs,now-order.reconHalt.orderedAt):0;
 return fraction((now-order.startedAt-paused)/total);
}
export function warOuterRouteProgressV140(
 order:WarOuterMissionV115,now:number,rules:WarRulesV6,
):WarOuterRouteProgressV140 {
 const route=order.routeIds;
 const invalid=!Number.isSafeInteger(now)||now<0||!Array.isArray(route);
 if(invalid)throw new RangeError("Horloge ou parcours de mandat extérieur invalide.");
 const before=now<order.startedAt;
 const done=now>=order.dueAt;
 let phase:WarOuterRouteProgressV140["phase"]=before?"not-started":
  done?"arrived":order.recall?"returning":"outbound";
 let travelled:string[]=[];
 let passageId:string|null=null;
 let legProgress=0;
 if(phase==="outbound"){
  legProgress=outboundFraction(order,now);
  const index=Math.min(route.length-1,Math.floor(legProgress*route.length));
  passageId=route[index]??null;
  travelled=route.slice(0,Math.max(0,index));
 }else if(phase==="returning"){
  const reversed=route.slice(0,Math.max(1,Math.ceil(
   outboundFraction(order,order.recall!.orderedAt)*route.length))).reverse();
  legProgress=fraction((now-order.recall!.orderedAt)/
   Math.max(1,order.dueAt-order.recall!.orderedAt));
  const index=Math.min(reversed.length-1,Math.floor(legProgress*reversed.length));
  passageId=reversed[index]??null;
  travelled=reversed.slice(0,Math.max(0,index));
 }else if(phase==="arrived"){
  legProgress=1;travelled=order.recall?[...route].reverse():[...route];
 }
 const passage=passageId?rules.passages.find(p=>p.id===passageId):undefined;
 return {operationId:order.id,phase,currentPassageId:passageId,
  currentPassageName:passage?.name??null,
  sourceCondition:passage?.condition??null,
  visitedPassageIds:travelled,
  totalPassages:route.length,legProgress,
  elapsedMs:safe(now-order.startedAt),remainingMs:safe(order.dueAt-now)};
}
