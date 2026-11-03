import {warTerrainCellBlockedV116,type WarMissionTerrainV116} from "./clanWarMissionTerrainV116";
import {warStealthPatrolStepV140,type WarStealthPatrolPositionV140} from "./clanWarStealthPatrolV140";

/** V141: The authored decoy is a physical POINT, not merely a column.
 * The guard may approach it by at most one step per decision and can only
 * travel over its real patrol cells, even in an alien environment.
 * This is original game AI, not a film-canonical tracking capability. */
export interface WarStealthDecoyPointV141{x:number;y:number;}
const directions:readonly [number,number][]=[[1,0],[-1,0],[0,1],[0,-1]];
const valid=(t:WarMissionTerrainV116,x:number,y:number)=>
 x>=4&&x<=7&&y>=1&&y<=3&&!warTerrainCellBlockedV116(t,x,y);
const key=(x:number,y:number)=>x+","+y;
const manhattan=(a:{x:number;y:number},b:{x:number;y:number})=>
 Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export function warStealthDecoyPatrolV141(
 terrain:WarMissionTerrainV116,
 guard:WarStealthPatrolPositionV140,
 decoy:WarStealthDecoyPointV141|null,
):WarStealthPatrolPositionV140{
 if(!decoy)return warStealthPatrolStepV140(terrain,guard);
 if(!Number.isInteger(decoy.x)||!Number.isInteger(decoy.y)||
    decoy.x<0||decoy.x>=terrain.width||decoy.y<0||decoy.y>=terrain.height)
  return warStealthPatrolStepV140(terrain,guard);
 const start={x:guard.guardX,y:guard.guardY};
 if(!valid(terrain,start.x,start.y))
  return warStealthPatrolStepV140(terrain,guard,decoy.x);
 const queue=[start],from=new Map<string,string|null>([[key(start.x,start.y),null]]);
 for(let i=0;i<queue.length;i++){
  const p=queue[i];
  for(const [dx,dy] of directions){
   const x=p.x+dx,y=p.y+dy,k=key(x,y);
   if(!valid(terrain,x,y)||from.has(k))continue;
   from.set(k,key(p.x,p.y));queue.push({x,y});
  }
 }
 // Nearest physically reachable patrol tile to the emitted location.
 // Equal distances favor shorter actual walking distance from the guard.
 const distFromStart=new Map<string,number>([[key(start.x,start.y),0]]);
 for(const p of queue){
  const id=key(p.x,p.y),pred=from.get(id);
  if(pred!==undefined&&pred!==null)distFromStart.set(id,(distFromStart.get(pred)??0)+1);
 }
 const choices=queue.slice().sort((a,b)=>
  manhattan(a,decoy)-manhattan(b,decoy)||
  (distFromStart.get(key(a.x,a.y))??100)-(distFromStart.get(key(b.x,b.y))??100)||
  a.y-b.y||a.x-b.x);
 const target=choices[0];
 if(!target||key(target.x,target.y)===key(start.x,start.y))return guard;
 let step=key(target.x,target.y);
 while(from.get(step)!==key(start.x,start.y)){
  const previous=from.get(step);
  if(previous===undefined||previous===null)return guard;
  step=previous;
 }
 const [guardX,guardY]=step.split(",").map(Number);
 return {guardX,guardY,
  guardDirection:guardX>guard.guardX?1:guardX<guard.guardX?-1:guard.guardDirection};
}
