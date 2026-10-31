import type {WarRulesV6} from "./clanWarBibleV6";
import type {WarOuterMissionV115} from "./clanWarOperationsV115";

/**
 * V140: source-bound opposition waves and route incidents for the ORIGINAL
 * clan-war exercise. The V6 territory/garrison budgets and real passage IDs
 * are authoritative; none of these numbers claim Predator-film canon.
 */
export interface WarAssaultWaveV140 {
 turn:number;id:string;unitId:string;unitRole:string;commandPoints:number;
 fullUnitCommandPoints:number;effectiveMembers:number;sourceFullMembers:number;
 sourceTerritoryId:string;sourceRegionId:string;
}
export function planWarAssaultWavesV140(
 targetId:string,rules:WarRulesV6,
):WarAssaultWaveV140[] {
 const territory=rules.territories.find(t=>t.id===targetId);
 if(!territory)throw new RangeError("Territoire V6 absent : pas de renfort inventé.");
 const budget=Math.max(0,Math.floor(territory.garrisonPc));
 if(!budget)return [];
 const pool=rules.units.filter(u=>u.fullMembers>0&&u.commandPoints>0&&
  u.upkeepRav>=0).sort((a,b)=>a.id.localeCompare(b.id));
 if(!pool.length)return [];
 const region=Number(territory.region.match(/KR(\d+)/)?.[1]??"0")||
  Array.from(territory.region).reduce((n,c)=>n+c.charCodeAt(0),0);
 const territorySeed=territory.column*7+territory.row*11+region*13;
 const planned:WarAssaultWaveV140[]=[];
 let committed=0;
 for(let turn=8;turn<=88;turn+=8){
  const remaining=budget-committed;
  if(remaining<1)break;
  // Some V6 garrisons have fewer PC than the cheapest FULL W3 formation.
  // Use source-unit partial detachments whose member count and hit points
  // are scaled down by the paid PC slice; never mint a full squad for free.
  const index=(territorySeed+planned.length*3+Math.floor(turn/8))%pool.length;
  const unit=pool[index];
  const allowance=Math.max(1,Math.ceil(budget/4));
  const commandPoints=Math.min(remaining,allowance,unit.commandPoints);
  const effectiveMembers=Math.max(1,Math.min(unit.fullMembers,
   Math.floor(unit.fullMembers*commandPoints/unit.commandPoints)));
  planned.push({turn,id:"V140-"+targetId+"-W"+turn,unitId:unit.id,
   unitRole:unit.role,commandPoints,
   fullUnitCommandPoints:unit.commandPoints,
   effectiveMembers,sourceFullMembers:unit.fullMembers,
   sourceTerritoryId:territory.id,sourceRegionId:territory.region});
  committed+=commandPoints;
 }
 return planned;
}
export interface WarOuterIncidentV140 {
 passageId:string;passageName:string;sourceNote:string;severity:1|2;
}
export function planWarOuterIncidentsV140(
 order:Pick<WarOuterMissionV115,"id"|"routeIds">,rules:WarRulesV6,
):{incidents:WarOuterIncidentV140[];extraThreat:number} {
 const incidents:WarOuterIncidentV140[]=[];
 // A route may have many stages; at most three source passages can contribute
 // a bounded exercise penalty, never hidden garrison data or a premature loss.
 for(const id of order.routeIds){
  const passage=rules.passages.find(p=>p.id===id);
  if(!passage)throw new RangeError("Passage V6 inconnu : "+id);
  const note=passage.incident.trim();
  if(!note||/^(aucun|sans incident|néant|none)$/i.test(note))continue;
  if(incidents.length===3)break;
  incidents.push({passageId:id,passageName:passage.name,
   sourceNote:note.slice(0,150),
   severity:passage.movementCost>=4?2:1});
 }
 return {incidents,extraThreat:Math.min(4,
  incidents.reduce((n,i)=>n+i.severity,0))};
}
