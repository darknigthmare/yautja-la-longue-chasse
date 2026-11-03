import type {WarRtsSquadsStateV133,WarRtsSquadsUpdateV133} from "./clanWarRtsSquadsV133";
import {commandWarRtsSquadsV133,visibleWarRtsEnemiesV133,
 warRtsEnvironmentalWindowV140} from "./clanWarRtsSquadsV133";
import {warMapFindPathV128,warMapWalkableV128,type WarMapPointV128} from "./clanWarSourceMapsV128";

/** V142 automatic guidance is one SOURCE-map square per order, not an
 * autonomous completion of an objective or an unseen enemy radar. */
export type WarRtsWaypointV142="observation"|"objective"|"extraction";
export interface WarRtsWaypointPlanV142{
 squadId:string;goal:WarRtsWaypointV142;
 target:WarMapPointV128;from:WarMapPointV128;to:WarMapPointV128;
 direction:"up"|"down"|"left"|"right";
 remainingCells:number;
}
const at=(p:WarMapPointV128)=>p.x+","+p.y;
const d=(a:WarMapPointV128,b:WarMapPointV128)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const dirs:{dx:number;dy:number;direction:WarRtsWaypointPlanV142["direction"]}[]=[
 {dx:0,dy:-1,direction:"up"},{dx:1,dy:0,direction:"right"},
 {dx:0,dy:1,direction:"down"},{dx:-1,dy:0,direction:"left"},
];
export function planWarRtsWaypointV142(
 s:WarRtsSquadsStateV133,squadId:string,goal:WarRtsWaypointV142,
):WarRtsWaypointPlanV142|null{
 if(s.phase!=="active"||s.report||!["observation","objective","extraction"].includes(goal))
  return null;
 const ally=s.squads.find(u=>u.id===squadId&&u.status==="active"&&u.hp>0);
 if(!ally)return null;
 const task=s.mission.tasks[s.completedTaskIds.length];
 if(goal==="objective"&&(!s.observed||!task))return null;
 const target=goal==="observation"?s.map.observation:
  goal==="extraction"?s.map.extraction:task.location;
 const from={x:ally.x,y:ally.y};
 if(d(from,target)<=1)return null;
 const window=warRtsEnvironmentalWindowV140(s);
 const forbidden=[
  ...s.squads.filter(u=>u.id!==ally.id&&u.status==="active"),
  ...visibleWarRtsEnemiesV133(s),
  ...(!s.power?s.map.poweredDoors:[]),
  ...(window.activeNextTurn?s.map.hazards:[]),
 ];
 const forbiddenIds=new Set(forbidden.map(at));
 const candidates=[
  target,...dirs.map(m=>({x:target.x+m.dx,y:target.y+m.dy}))
 ].filter(p=>warMapWalkableV128(s.map,p)&&!forbiddenIds.has(at(p))&&
   !(!s.power&&s.map.poweredDoors.some(q=>at(q)===at(p))));
 let best:{path:WarMapPointV128[];target:WarMapPointV128}|null=null;
 for(const candidate of candidates){
  const path=warMapFindPathV128(s.map,from,candidate,forbidden);
  if(!path||path.length<2)continue;
  if(!best||path.length<best.path.length||
    path.length===best.path.length&&d(candidate,target)<d(best.target,target))
   best={path,target:candidate};
 }
 if(!best)return null;
 const to=best.path[1];
 if(d(from,to)!==1||forbiddenIds.has(at(to)))return null;
 const direction=dirs.find(m=>to.x-from.x===m.dx&&to.y-from.y===m.dy)?.direction;
 if(!direction)return null;
 return {squadId,goal,target:{...target},from,to,direction,
  remainingCells:best.path.length-2};
}
export function commandWarRtsWaypointV142(
 s:WarRtsSquadsStateV133,squadId:string,goal:WarRtsWaypointV142,
):WarRtsSquadsUpdateV133{
 const plan=planWarRtsWaypointV142(s,squadId,goal);
 if(!plan)return {state:s,accepted:false,message:
  "Aucun itinéraire d'une case accessible ; vérifiez la reconnaissance, les portes, le danger et le poste occupé."};
 // Enemy positions outside current line of sight never enter the planner.
 // Unexpected adjacent occupancy is resolved on the real tactical tick, no
 // remote coordinates or rival identity are exposed by this fallback.
 if(s.enemies.some(e=>e.hp>0&&at(e)===at(plan.to))){
  const collision=commandWarRtsSquadsV133(s,{kind:"wait",squadId});
  return collision.accepted?{...collision,message:
   "Progression momentanément interrompue au contact du terrain. Une réaction ennemie s'est écoulée."}:collision;
 }
 const result=commandWarRtsSquadsV133(s,{kind:"move",squadId,direction:plan.direction});
 return result.accepted?{...result,message:
  "Navigation tactique "+goal+" : une case physique vers "+at(plan.target)+
  ", "+plan.remainingCells+" cases restantes. "+result.message}:result;
}
