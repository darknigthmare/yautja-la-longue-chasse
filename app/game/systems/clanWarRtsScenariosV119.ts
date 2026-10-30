import type { WarRulesV6 } from "./clanWarBibleV6";
import type { WarRtsActorV115 } from "./clanWarOperationsV115";
import { warMissionTerrainV116, warTerrainCellBlockedV116, warTerrainLineOfSightV116, type WarMissionTerrainV116 } from "./clanWarMissionTerrainV116";

/**
 * W3-RTS01/02: two SMALL functional exercises from authored W3-MAP01 briefs.
 * The existing battlefield is 9 x 6, not the 32 x 24 full authored scene.
 * The other 22 RTS sources are still dossiers, not pretend playable missions.
 */
export type WarSourceRtsScenarioIdV119 = "W3-RTS01" | "W3-RTS02";
export interface WarSourceRtsScenarioDefinitionV119 {
  id: WarSourceRtsScenarioIdV119;
  title: string;
  sourceMapId: "W3-MAP01";
  sourceCells: string[];
  situation: string;
  tactics: string;
  enemyPlan: string;
  completion: string;
  supportedRegionId: "W3-KR01";
  objectiveKind: "cargo-escort" | "guard-relief";
  playability: "objective-exercise";
}
export type WarRtsScriptedObjectiveV119 =
 | { scenarioId:"W3-RTS01"; kind:"cargo-escort"; sourceMapId:"W3-MAP01";
     scouted:boolean; cargo:{id:string; carrierTeamId:string|null; x:number; y:number};
     exit:{x:7;y:4} }
 | { scenarioId:"W3-RTS02"; kind:"guard-relief"; sourceMapId:"W3-MAP01";
     reliefProgress:number; requiredTurns:3; guardPoint:{x:7;y:3} };

export interface WarRtsScriptedResultV119 {
  objective: WarRtsScriptedObjectiveV119;
  outcome: "victory" | "defeat" | null;
  message: string;
}
const PORTER_UNITS=new Set(["W3-U17","W3-U19"]);
const SCOUT_UNITS=new Set(["W3-U01","W3-U02","W3-U05","W3-U06"]);
const GUARD_UNIT="W3-U07";
const DIST=(a:{x:number;y:number},c:{x:number;y:number})=>Math.abs(a.x-c.x)+Math.abs(a.y-c.y);

export function warSourceRtsScenarioV119(id:string,rules:WarRulesV6): WarSourceRtsScenarioDefinitionV119|null {
  if(id!=="W3-RTS01"&&id!=="W3-RTS02")return null;
  const entry=rules.entries.find(item=>item.sheet==="Scénarios RTS"&&item.id===id);
  if(!entry)return null;
  const v=(column:string)=>String(entry.fields.find(field=>field.column===column)?.value??"").trim();
  if(v("C")!=="W3-MAP01" || !rules.entries.some(item=>item.sheet==="Cartes des escarmouches"&&item.id==="W3-MAP01"))
    return null;
  return {
    id,title:String(entry.title),sourceMapId:"W3-MAP01",
    sourceCells:["C","D","E","F","G","H","I","J","K","L","M","N","O"]
      .map(column=>entry.fields.find(field=>field.column===column)?.cell).filter((cell):cell is string=>!!cell),
    situation:v("E"),tactics:v("I"),enemyPlan:v("J"),completion:v("L"),
    supportedRegionId:"W3-KR01",
    objectiveKind:id==="W3-RTS01"?"cargo-escort":"guard-relief",
    playability:"objective-exercise",
  };
}
export function warRtsScriptedEligibilityV119(
  id:string|null,rules:WarRulesV6,targetId:string,unitIds:readonly string[],
):string|null {
  if(id===null)return null; // unmodified free RTS mission
  const brief=warSourceRtsScenarioV119(id,rules);
  if(!brief)return "Scénario W3 inconnu ou cellule de carte source incompatible.";
  const territory=rules.territories.find(item=>item.id===targetId);
  if(!territory||territory.region!==brief.supportedRegionId)
    return "Cette reconstitution W3-MAP01 nécessite un site de la région W3-KR01.";
  if(brief.id==="W3-RTS01"&&(!unitIds.some(unit=>PORTER_UNITS.has(unit))||!unitIds.some(unit=>SCOUT_UNITS.has(unit))))
    return "L'escorte W3-RTS01 exige un véritable porteur W3-U17/U19 et un éclaireur W3-U01/U02/U05/U06.";
  if(brief.id==="W3-RTS02"&&!unitIds.includes(GUARD_UNIT))
    return "La relève W3-RTS02 exige une équipe W3-U07 réellement présente pour garder le sommet.";
  return null;
}
export function createWarRtsScriptedObjectiveV119(
  id:WarSourceRtsScenarioIdV119,operationId:string,actors:readonly WarRtsActorV115[],
):WarRtsScriptedObjectiveV119|null {
  if(id==="W3-RTS02")return {
    scenarioId:id,kind:"guard-relief",sourceMapId:"W3-MAP01",
    reliefProgress:0,requiredTurns:3,guardPoint:{x:7,y:3},
  };
  const porter=actors.find(actor=>actor.side==="ally"&&actor.teamId&&PORTER_UNITS.has(actor.unitId));
  if(!porter)return null;
  return {
    scenarioId:id,kind:"cargo-escort",sourceMapId:"W3-MAP01",scouted:false,
    cargo:{id:operationId+"-cargo",carrierTeamId:porter.teamId,x:porter.x,y:porter.y},
    exit:{x:7,y:4},
  };
}
export function resolveWarRtsScriptedTickV119(
  objective:WarRtsScriptedObjectiveV119,actors:readonly WarRtsActorV115[],terrain:WarMissionTerrainV116,
):WarRtsScriptedResultV119 {
  const own=actors.filter(actor=>actor.side==="ally"&&actor.hp>0);
  const hostile=actors.filter(actor=>actor.side==="rival"&&actor.hp>0);
  if(objective.kind==="guard-relief"){
    const guarded=own.some(actor=>actor.unitId===GUARD_UNIT&&DIST(actor,objective.guardPoint)===0);
    const contested=hostile.some(actor=>DIST(actor,objective.guardPoint)<=1);
    const progress=guarded&&!contested?Math.min(objective.requiredTurns,objective.reliefProgress+1):0;
    const next={...objective,reliefProgress:progress};
    return {objective:next,outcome:progress>=objective.requiredTurns?"victory":
      (!own.some(actor=>actor.unitId===GUARD_UNIT)?"defeat":null),
      message:progress>=objective.requiredTurns?"La relève a réellement tenu le sommet pendant trois tours.":
      "Relève de guet : "+progress+"/"+objective.requiredTurns+" tours tenus par les W3-U07."};
  }
  const sawWatch=own.some(actor=>SCOUT_UNITS.has(actor.unitId)&&actor.x>=4&&actor.y<=2 &&
    warTerrainLineOfSightV116(terrain,actor,{x:7,y:1}));
  const scouted=objective.scouted||sawWatch;
  let cargo={...objective.cargo};
  if(cargo.carrierTeamId){
    const carrier=actors.find(actor=>actor.teamId===cargo.carrierTeamId);
    if(carrier&&carrier.hp>0){cargo={...cargo,x:carrier.x,y:carrier.y};}
    else{
      // The cargo physically remains where the last carrier fell.
      // No teleport back to base or into a replacement's inventory.
      cargo={...cargo,carrierTeamId:null,x:carrier?.x??cargo.x,y:carrier?.y??cargo.y};
    }
  }
  if(!cargo.carrierTeamId){
    const nextBearer=own.filter(actor=>actor.teamId&&PORTER_UNITS.has(actor.unitId)&&
      actor.x===cargo.x&&actor.y===cargo.y)
      .sort((a,b)=>a.id.localeCompare(b.id))[0];
    if(nextBearer)cargo={...cargo,carrierTeamId:nextBearer.teamId};
  }
  const bearer=cargo.carrierTeamId?own.find(actor=>actor.teamId===cargo.carrierTeamId):null;
  const delivered=Boolean(bearer&&cargo.x===objective.exit.x&&cargo.y===objective.exit.y&&scouted);
  const stillPossible=own.some(actor=>PORTER_UNITS.has(actor.unitId))&&
    (scouted||own.some(actor=>SCOUT_UNITS.has(actor.unitId)));
  return {
    objective:{...objective,scouted,cargo},
    outcome:delivered?"victory":stillPossible?null:"defeat",
    message:delivered?"Guet observé, charge et porteur atteints à la sortie : extraction réelle.":
      "Porteur "+(cargo.carrierTeamId??"absent")+
      " · guet "+(scouted?"observé":"inconnu")+
      " · charge en "+cargo.x+","+cargo.y+".",
  };
}
export function validWarRtsScriptedObjectiveV119(
  value:unknown,operationId:string,actorTeamIds:readonly string[],actors:readonly WarRtsActorV115[],
  targetId:string,rules:WarRulesV6,unitIds:readonly string[],
):value is WarRtsScriptedObjectiveV119 {
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  const v=value as Partial<WarRtsScriptedObjectiveV119>;
  if(!v.scenarioId||warRtsScriptedEligibilityV119(v.scenarioId,rules,targetId,unitIds)!==null||
    v.sourceMapId!=="W3-MAP01")return false;
  const terrain=warMissionTerrainV116(targetId,rules);
  if(v.scenarioId==="W3-RTS02"){
    const stage=v as Partial<Extract<WarRtsScriptedObjectiveV119,{kind:"guard-relief"}>>;
    return stage.kind==="guard-relief"&&stage.requiredTurns===3&&
      !!stage.guardPoint&&stage.guardPoint.x===7&&stage.guardPoint.y===3&&
      Number.isInteger(stage.reliefProgress)&&(stage.reliefProgress as number)>=0&&(stage.reliefProgress as number)<=3;
  }
  const stage=v as Partial<Extract<WarRtsScriptedObjectiveV119,{kind:"cargo-escort"}>>;
  if(stage.kind!=="cargo-escort"||typeof stage.scouted!=="boolean"||
    !stage.exit||stage.exit.x!==7||stage.exit.y!==4||!stage.cargo)return false;
  const cargo=stage.cargo;
  if(cargo.id!==operationId+"-cargo"||
    !Number.isInteger(cargo.x)||!Number.isInteger(cargo.y)||
    warTerrainCellBlockedV116(terrain,cargo.x,cargo.y))return false;
  return cargo.carrierTeamId===null||
    (typeof cargo.carrierTeamId==="string"&&actorTeamIds.includes(cargo.carrierTeamId)&&
      actors.some(actor=>actor.side==="ally"&&actor.teamId===cargo.carrierTeamId&&PORTER_UNITS.has(actor.unitId)&&actor.hp>0&&actor.x===cargo.x&&actor.y===cargo.y));
}
