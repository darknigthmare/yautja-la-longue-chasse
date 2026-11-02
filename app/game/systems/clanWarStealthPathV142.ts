import type {WarRulesV6} from "./clanWarBibleV6";
import type {WarOperationsStateV115,WarOperationsUpdateV115,StealthCommandV115} from "./clanWarOperationsV115";
import {commandStealthV115} from "./clanWarOperationsV115";
import {warMissionTerrainV116,warTerrainPathLengthV116,
 warTerrainCellBlockedV116,type WarMissionTerrainV116} from "./clanWarMissionTerrainV116";

export type WarStealthGoalV142="relay"|"extraction";
export interface WarStealthStepV142{
 goal:WarStealthGoalV142;from:{x:number;y:number};to:{x:number;y:number};
 remainingCells:number;direction:"up"|"down"|"left"|"right";
}
const dirs=[
 {direction:"right" as const,dx:1,dy:0},
 {direction:"down" as const,dx:0,dy:1},
 {direction:"left" as const,dx:-1,dy:0},
 {direction:"up" as const,dx:0,dy:-1},
];
export function planWarStealthStepV142(
 s:WarOperationsStateV115,goal:WarStealthGoalV142,rules:WarRulesV6,
):WarStealthStepV142|null {
 const mission=s.active,actor=mission?.stealth;
 if(mission?.mode!=="stealth"||!actor||
    s.sourceSha!==rules.metadata.sha256||
    (goal!=="relay"&&goal!=="extraction"))return null;
 const map:WarMissionTerrainV116=warMissionTerrainV116(mission.targetId,rules);
 const target=goal==="relay"?map.relay:map.extraction;
 const from={x:actor.x,y:actor.y};
 const length=warTerrainPathLengthV116(map,from,target);
 if(length===null||length<=0)return null;
 // Knowledge is PUBLIC terrain only. Do not read guardX/guardY here:
 // path hints must never leak a hidden patrol position through decisions.
 for(const dir of dirs){
  const to={x:from.x+dir.dx,y:from.y+dir.dy};
  if(warTerrainCellBlockedV116(map,to.x,to.y))continue;
  const rest=warTerrainPathLengthV116(map,to,target);
  if(rest===length-1)
   return {goal,from,to,remainingCells:rest,direction:dir.direction};
 }
 return null;
}
/** One physical tile and ONE patrol reaction; no path auto-finish, no free
 * sabotage and no stealth bonus invented beyond the V115 command. */
export function commandWarStealthStepV142(
 s:WarOperationsStateV115,goal:WarStealthGoalV142,rules:WarRulesV6,
):WarOperationsUpdateV115 {
 const step=planWarStealthStepV142(s,goal,rules);
 if(!step)return {state:s,accepted:false,message:
  "Aucun pas légal : cible déjà atteinte, passage bloqué ou mission terminée."};
 const sent=commandStealthV115(s,step.direction as StealthCommandV115,rules);
 return sent.accepted?{...sent,message:
  "Progression guidée "+step.direction+" : une case, un seul tour de patrouille. "+
  sent.message}:sent;
}
