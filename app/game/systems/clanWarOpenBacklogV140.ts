import type {WarRulesV6} from "./clanWarBibleV6";
import type {WarOuterMissionV115} from "./clanWarOperationsV115";

/**
 * V140: source-bound opposition waves and route incidents for the ORIGINAL
 * clan-war exercise. The V6 territory/garrison budgets and real passage IDs
 * are authoritative; none of these numbers claim Predator-film canon.
 */
export interface WarAssaultWaveV140 {
 turn:number;id:string;unitId:string;unitRole:string;commandPoints:number;
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
 const region=Number(territory.region.replace(/^\D+/,"").replace(/^KR/,""))||
  Array.from(territory.region).reduce((n,c)=>n+c.charCodeAt(0),0);
 const territorySeed=territory.column*7+territory.row*11+region*13;
 const planned:WarAssaultWaveV140[]=[];
 let committed=0;
 for(let turn=8;turn<=88;turn+=8){
  const remaining=budget-committed;
  const available=pool.filter(u=>u.commandPoints<=remaining);
  if(!available.length)break;
  // Rotation changes the locally deployed SOURCE UNIT roles instead of
  // inserting an arbitrary global roster at every eighth tick.
  const index=(territorySeed+planned.length*3+Math.floor(turn/8))%available.length;
  const unit=available[index];
  planned.push({turn,id:"V140-"+targetId+"-W"+turn,unitId:unit.id,
   unitRole:unit.role,commandPoints:unit.commandPoints,
   sourceTerritoryId:territory.id,sourceRegionId:territory.region});
  committed+=unit.commandPoints;
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
