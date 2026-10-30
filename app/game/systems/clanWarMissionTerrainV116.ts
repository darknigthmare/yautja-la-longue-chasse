import type { WarRulesV6 } from "./clanWarBibleV6";

/**
 * Six distinguishable tactical exercises grounded in the six W3-KR regions of
 * the game's V6 workbook, NOT canonical maps from a Predator film or comic.
 * All cells are public. No enemy identities or V85 hidden state are inspected.
 */
export interface WarMissionTerrainV116 {
  targetId: string;
  regionId: string;
  title: string;
  ground: string;
  wallLabel: string;
  coverLabel: string;
  walls: string[];
  cover: string[];
  extraction: { x: number; y: number };
  relay: { x: number; y: number };
  objective: { x: number; y: number };
  width: 9;
  height: 6;
}
interface TerrainPreset {
  title: string; ground: string; wallLabel: string; coverLabel: string;
  walls: readonly string[]; cover: readonly string[];
}
const REGIONS: Record<string, TerrainPreset> = {
  "W3-KR01": {
    title: "Hauteurs et escaliers", ground: "pierre de corniche", wallLabel: "paroi escarpée", coverLabel: "bloc rocheux",
    walls: ["3,2","3,3","5,3","6,4"], cover: ["3,1","4,3","5,4","6,2"],
  },
  "W3-KR02": {
    title: "Citernes et conduites", ground: "fond de bassin", wallLabel: "conduite et réservoir", coverLabel: "muret de citerne",
    walls: ["2,2","3,2","4,2","5,4","6,4"], cover: ["2,3","4,4","5,1","6,3"],
  },
  "W3-KR03": {
    title: "Piliers et racines", ground: "sol de canopée", wallLabel: "pilier et racine", coverLabel: "tronc et socle",
    walls: ["2,2","3,3","4,3","5,2","6,4"], cover: ["2,1","4,2","5,4","6,3"],
  },
  "W3-KR04": {
    title: "Pontons et chenaux", ground: "rive et ponton", wallLabel: "eau infranchissable", coverLabel: "pile de quai",
    walls: ["2,3","3,3","4,4","5,2","6,2"], cover: ["3,2","4,1","6,4","7,4"],
  },
  "W3-KR05": {
    title: "Forges et rails", ground: "plateforme industrielle", wallLabel: "machine et barrière", coverLabel: "caisse et ancrage",
    walls: ["3,1","3,2","5,3","5,4","6,4"], cover: ["2,2","4,2","6,3","7,4"],
  },
  "W3-KR06": {
    title: "Plaines et colonnes", ground: "piste des ombres", wallLabel: "colonne renversée", coverLabel: "dalle effondrée",
    walls: ["2,2","4,1","4,2","4,3","6,4"], cover: ["2,3","3,1","5,3","6,2"],
  },
};
const EXTRA: readonly string[] = ["2,4","4,4","5,1","3,4","6,3","4,1","5,2","3,2","6,1"];
const RESERVED = new Set(["1,1","1,2","1,3","1,4","7,1","7,2","7,3"]);
const parse = (s:string) => s.split(",").map(Number);
const tile = (x:number,y:number) => x+","+y;
function reachable(walls:Set<string>,from:string,to:string): boolean {
  if(walls.has(from)||walls.has(to))return false;
  const seen=new Set([from]),queue=[from];
  for(let i=0;i<queue.length;i++){
    const [x,y]=parse(queue[i]);
    for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nx=x+dx,ny=y+dy,id=tile(nx,ny);
      if(nx<0||ny<0||nx>8||ny>5||walls.has(id)||seen.has(id))continue;
      if(id===to)return true;
      seen.add(id);queue.push(id);
    }
  }
  return from===to;
}
function safe(walls:Set<string>):boolean {
  return reachable(walls,"1,4","7,1")&&reachable(walls,"1,1","7,3");
}
export function warMissionTerrainV116(targetId:string,rules:WarRulesV6): WarMissionTerrainV116 {
  const target=rules.territories.find(item=>item.id===targetId);
  if(!target)throw new RangeError("Territoire inconnu dans la Bible V6.");
  const preset=REGIONS[target.region]??REGIONS["W3-KR01"];
  const walls=new Set(preset.walls);
  // Source-prototype K02 retains the original canyon study for old checkpoints.
  if(target.id!=="W3-K02") {
    const salt=Array.from(target.id).reduce((v,c)=>Math.imul(v^c.charCodeAt(0),16777619)>>>0,2166136261);
    for(let attempt=0;attempt<EXTRA.length&&walls.size<preset.walls.length+2;attempt++){
      const candidate=EXTRA[(salt+attempt*5)%EXTRA.length];
      if(walls.has(candidate)||RESERVED.has(candidate)||preset.cover.includes(candidate))continue;
      const next=new Set([...walls,candidate]);
      if(safe(next))walls.add(candidate);
    }
  }
  const cover=preset.cover.filter(pos=>!walls.has(pos));
  if(!safe(walls))throw new Error("Profil terrain V116 : accès tactique interrompu.");
  return {
    targetId:target.id,regionId:target.region,title:preset.title,ground:preset.ground,
    wallLabel:preset.wallLabel,coverLabel:preset.coverLabel,
    walls:[...walls].sort(),cover:[...cover].sort(),
    extraction:{x:1,y:4},relay:{x:7,y:1},objective:{x:7,y:3},
    width:9,height:6,
  };
}
export function warTerrainCellBlockedV116(terrain:WarMissionTerrainV116,x:number,y:number):boolean {
  if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=terrain.width||y>=terrain.height)return true;
  return terrain.walls.includes(tile(x,y));
}
export function warTerrainPathLengthV116(
  terrain:WarMissionTerrainV116,
  from:{x:number;y:number},to:{x:number;y:number},
  occupied:readonly string[]=[],
):number|null {
  const walls=new Set([...terrain.walls,...occupied]);
  const origin=tile(from.x,from.y),goal=tile(to.x,to.y);
  if(warTerrainCellBlockedV116(terrain,from.x,from.y)||warTerrainCellBlockedV116(terrain,to.x,to.y))return null;
  walls.delete(origin);walls.delete(goal);
  const queue:[number,number,number][]=[[from.x,from.y,0]],seen=new Set([origin]);
  for(let i=0;i<queue.length;i++){
    const [x,y,dist]=queue[i];
    if(x===to.x&&y===to.y)return dist;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx=x+dx,ny=y+dy,id=tile(nx,ny);
      if(nx<0||nx>=9||ny<0||ny>=6||walls.has(id)||seen.has(id))continue;
      seen.add(id);queue.push([nx,ny,dist+1]);
    }
  }
  return null;
}

/** Grid ray test: a solid wall between two actors prevents a ranged hit or
 * surveillance reading. The actual start/end cells are excluded. */
export function warTerrainLineOfSightV116(
  terrain:WarMissionTerrainV116,from:{x:number;y:number},to:{x:number;y:number},
):boolean {
  if(warTerrainCellBlockedV116(terrain,from.x,from.y)||warTerrainCellBlockedV116(terrain,to.x,to.y))return false;
  let x=from.x,y=from.y;
  const dx=Math.abs(to.x-from.x),dy=Math.abs(to.y-from.y);
  const sx=from.x<to.x?1:-1,sy=from.y<to.y?1:-1;
  let error=dx-dy;
  while(x!==to.x||y!==to.y){
    const twice=2*error;
    if(twice>-dy){error-=dy;x+=sx;}
    if(twice<dx){error+=dx;y+=sy;}
    if((x!==to.x||y!==to.y)&&warTerrainCellBlockedV116(terrain,x,y))return false;
  }
  return true;
}
