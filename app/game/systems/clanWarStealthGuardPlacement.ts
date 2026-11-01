import {warTerrainCellBlockedV116,type WarMissionTerrainV116} from "./clanWarMissionTerrainV116";

/** PR #57's deterministic local placement: walkable, separate from both actors. */
export function chooseStealthSupportGuard(terrain:WarMissionTerrainV116,
 first:{x:number;y:number},player:{x:number;y:number}):{x:number;y:number;direction:-1}|undefined{
 const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
 const choices:{x:number;y:number}[]=[];
 for(let y=1;y<=3;y++)for(let x=4;x<=7;x++){
  const p={x,y};
  if(warTerrainCellBlockedV116(terrain,x,y)||distance(p,first)===0||distance(p,player)<3)continue;
  choices.push(p);
 }
 choices.sort((a,b)=>distance(b,first)-distance(a,first)||a.y-b.y||a.x-b.x);
 return choices[0]?{...choices[0],direction:-1}:undefined;
}
