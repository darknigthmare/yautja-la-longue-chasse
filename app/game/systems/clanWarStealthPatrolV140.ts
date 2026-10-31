import {warTerrainCellBlockedV116,type WarMissionTerrainV116} from "./clanWarMissionTerrainV116";

/** V140 author's patrol constrained to the six physical W3 9×6 maps.
 * No hidden-enemy omniscience, teleport, through-wall path or new canon AI. */
export interface WarStealthPatrolPositionV140{
 guardX:number;guardY:number;guardDirection:-1|1;
}
export function warStealthPatrolSpawnV140(terrain:WarMissionTerrainV116):WarStealthPatrolPositionV140{
 const x=[6,7,5,4].find(x=>!warTerrainCellBlockedV116(terrain,x,2));
 if(x===undefined)throw new Error("Source terrain has no traversable guard entrance.");
 return {guardX:x,guardY:2,guardDirection:-1};
}
const cell=(x:number,y:number)=>x+","+y;
const directions:[[number,number],[number,number],[number,number],[number,number]]=[
 [1,0],[-1,0],[0,1],[0,-1],
];
const walkable=(terrain:WarMissionTerrainV116,x:number,y:number)=>
 x>=4&&x<=7&&y>=1&&y<=3&&!warTerrainCellBlockedV116(terrain,x,y);

/** One **orthogonal** unit step every action. Routes go around the real
 * obstructions, even when a legacy V115 save places its original guard
 * inside a now-recognized solid wall. The old checkpoint is not deleted. */
export function warStealthPatrolStepV140(
 terrain:WarMissionTerrainV116,
 current:WarStealthPatrolPositionV140,
 decoyX?:number,
):WarStealthPatrolPositionV140{
 const from={x:current.guardX,y:current.guardY};
 if(!Number.isInteger(from.x)||!Number.isInteger(from.y)||
   ![-1,1].includes(current.guardDirection))return current;
 let direction=current.guardDirection;
 const row2=[4,5,6,7].filter(x=>walkable(terrain,x,2));
 if(!row2.length)return current;
 const left=row2[0],right=row2[row2.length-1];
 const retreat=decoyX===undefined?(direction===1?right:left):
  row2.slice().sort((a,b)=>Math.abs(a-decoyX)-Math.abs(b-decoyX)||a-b)[0];
 if(decoyX===undefined&&from.y===2&&from.x===retreat){
  direction=direction===1?-1:1;
 }
 const target=decoyX!==undefined?retreat:direction===1?right:left;
 if(!walkable(terrain,from.x,from.y)){
  const legal=directions.map(([dx,dy])=>({x:from.x+dx,y:from.y+dy}))
   .filter(p=>walkable(terrain,p.x,p.y))
   .sort((a,b)=>Math.abs(target-a.x)-Math.abs(target-b.x)||
      Math.abs(2-a.y)-Math.abs(2-b.y)||a.y-b.y||a.x-b.x);
  const step=legal[0];return step?
   {guardX:step.x,guardY:step.y,guardDirection:direction}:
   {...current,guardDirection:direction};
 }
 const goals=[cell(target,2)];
 const queue=[from],prev=new Map<string,string|null>([[cell(from.x,from.y),null]]);
 let found:string|null=null;
 for(let i=0;i<queue.length;i++){
  const p=queue[i],key=cell(p.x,p.y);
  if(goals.includes(key)){found=key;break;}
  for(const [dx,dy] of directions){
   const x=p.x+dx,y=p.y+dy,k=cell(x,y);
   if(!walkable(terrain,x,y)||prev.has(k))continue;
   prev.set(k,key);queue.push({x,y});
  }
 }
 if(found===null||found===cell(from.x,from.y))
  return {...current,guardDirection:direction};
 let step=found;
 while(prev.get(step)!==cell(from.x,from.y)){
  const p=prev.get(step);
  if(p===undefined||p===null)return {...current,guardDirection:direction};
  step=p;
 }
 const [guardX,guardY]=step.split(",").map(Number);
 return {guardX,guardY,guardDirection:direction};
}
