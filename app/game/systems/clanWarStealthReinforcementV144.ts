import {warTerrainCellBlockedV116,type WarMissionTerrainV116} from "./clanWarMissionTerrainV116";
import {warStealthDecoyPatrolV141,type WarStealthDecoyPointV141} from "./clanWarStealthDecoyV141";
import type {WarStealthPatrolPositionV140} from "./clanWarStealthPatrolV140";
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>
 Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const id=(p:WarStealthPatrolPositionV140)=>p.guardX+","+p.guardY;

/** A second LOCAL guard may join only after a genuine visual or sabotage
 * alert. This is an authored gameplay patrol, not a canonical new Yautja
 * species and never a remote radar of hidden enemies. */
export function warStealthReinforcementV144(
 terrain:WarMissionTerrainV116,
 first:WarStealthPatrolPositionV140,player:{x:number;y:number},
):WarStealthPatrolPositionV140|null{
 const choices=[] as {x:number;y:number}[];
 for(let y=1;y<=3;y++)for(let x=4;x<=7;x++){
  if(warTerrainCellBlockedV116(terrain,x,y)||
     x===first.guardX&&y===first.guardY||
     distance({x,y},player)<3)continue;
  choices.push({x,y});
 }
 choices.sort((a,b)=>distance(b,{x:first.guardX,y:first.guardY})-
   distance(a,{x:first.guardX,y:first.guardY})||
   a.y-b.y||a.x-b.x);
 const point=choices[0];
 return point?{guardX:point.x,guardY:point.y,guardDirection:-1}:null;
}
/** Both guards use the same physical terrain and cannot occupy a single
 * square after an update. No extra patrol movement or teleport per tick. */
export function warStealthSecondGuardStepV144(
 terrain:WarMissionTerrainV116,
 first:WarStealthPatrolPositionV140,
 second:WarStealthPatrolPositionV140,
 decoy:WarStealthDecoyPointV141|null,
):WarStealthPatrolPositionV140{
 const candidate=warStealthDecoyPatrolV141(terrain,second,decoy);
 return id(candidate)===id(first)?second:candidate;
}
