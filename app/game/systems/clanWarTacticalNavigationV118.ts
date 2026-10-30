import {
  warTerrainCellBlockedV116, warTerrainPathLengthV116,
  type WarMissionTerrainV116,
} from "./clanWarMissionTerrainV116";

export interface WarRtsPointV118 { x:number; y:number }
const key=(p:WarRtsPointV118)=>p.x+","+p.y;

/**
 * A bounded deterministic path step for a 9 x 6 W3 territory.
 * - Uses only the actual regional obstacle cells and identified occupants.
 * - Never teleports across blockers or into another living actor's position.
 * - Does not infer a hidden enemy or identify a cinematic location.
 * - Stops when no valid route can be found; never crosses a wall as fallback.
 *
 * The goal may contain the target combatant. Occupancy still prevents stepping
 * onto their exact tile, but path distance can be measured up to that tile.
 */
export function warRtsNextPathStepV118(
  terrain:WarMissionTerrainV116,
  from:WarRtsPointV118,
  to:WarRtsPointV118,
  occupied:readonly string[]=[],
):WarRtsPointV118|null {
  if(warTerrainCellBlockedV116(terrain,from.x,from.y)||warTerrainCellBlockedV116(terrain,to.x,to.y))
    return null;
  const occupiedSet=new Set(occupied);
  occupiedSet.delete(key(from));
  const initial=warTerrainPathLengthV116(terrain,from,to,[...occupiedSet]);
  if(initial===null||initial===0)return null;
  // Stable ties make saved and replayed decisions consistent across machines.
  const neighbors=[
    {x:from.x,y:from.y-1},{x:from.x-1,y:from.y},
    {x:from.x+1,y:from.y},{x:from.x,y:from.y+1},
  ];
  let best:WarRtsPointV118|null=null;
  let bestDistance=initial;
  for(const candidate of neighbors){
    if(warTerrainCellBlockedV116(terrain,candidate.x,candidate.y)||occupiedSet.has(key(candidate)))continue;
    const remaining=warTerrainPathLengthV116(terrain,candidate,to,[...occupiedSet]);
    if(remaining!==null&&remaining<bestDistance){
      bestDistance=remaining;
      best=candidate;
    }
  }
  return best;
}
