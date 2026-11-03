import type {WarOuterMissionV115} from "./clanWarOperationsV115";
import type {WarRulesV6} from "./clanWarBibleV6";
import {warOuterWeightedProgressV141} from "./clanWarOuterWeightedProgressV141";

/** Source-only travel ledger: one honest pending maneuver, never a fabricated
 * waypoint or remotely observed rival. This fixes V144's missing five-second
 * pause in both UI and V140/V141 physical-progress estimates. */
export function warOuterTravelLedgerV145(
 order:WarOuterMissionV115,now:number,rules:WarRulesV6,
){
 const route=warOuterWeightedProgressV141(order,now,rules);
 const pauses=[
  ...(order.routeDiversion?[{reason:"Recalcul de passage V144",
    at:order.routeDiversion.changedAt,duration:5000}]:[]),
  ...(order.reconHalt?[{reason:"Halte de reconnaissance V137",
    at:order.reconHalt.orderedAt,duration:order.reconHalt.extraMs}]:[]),
  ...(order.routeIncident?.kind==="detour"?[{reason:"Détour du passage V143",
    at:order.routeIncident.orderedAt,duration:10000}]:[]),
 ];
 const activePauses=pauses.filter(p=>now>=p.at&&now<p.at+p.duration);
 const waited=pauses.reduce((sum,p)=>sum+
  Math.max(0,Math.min(p.duration,now-p.at)),0);
 return {
  operationId:order.id,phase:route.phase,
  currentPassageId:route.currentPassageId,
  currentPassageName:route.currentPassageName,
  currentPassageProgress:route.currentPassageProgress,
  elapsedMs:route.elapsedMs,remainingMs:route.remainingMs,
  routeIds:[...order.routeIds],
  pauseReasons:activePauses.map(p=>p.reason),
  pausedMs:waited,workable:route.phase==="outbound"&&activePauses.length===0,
  hiddenEnemiesRevealed:false,
 };
}
