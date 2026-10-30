import type { WarRulesV6 } from "./clanWarBibleV6";
import type { WarRtsActorV115 } from "./clanWarOperationsV115";
import { warMissionTerrainV116, warTerrainCellBlockedV116, warTerrainLineOfSightV116, type WarMissionTerrainV116 } from "./clanWarMissionTerrainV116";

/**
 * W3-RTS01–05: five SMALL objective exercises from authored W3-MAP01/02/03 briefs.
 * The existing battlefield is 9 x 6, not the 32 x 24 full authored scene.
 * The other 19 RTS sources are still dossiers, not pretend playable missions.
 */
export type WarSourceRtsScenarioIdV119 = "W3-RTS01" | "W3-RTS02" | "W3-RTS03" | "W3-RTS04" | "W3-RTS05";
export interface WarSourceRtsScenarioDefinitionV119 {
  id: WarSourceRtsScenarioIdV119;
  title: string;
  sourceMapId: "W3-MAP01" | "W3-MAP02" | "W3-MAP03";
  sourceCells: string[];
  situation: string;
  tactics: string;
  enemyPlan: string;
  completion: string;
  supportedRegionId: "W3-KR01" | "W3-KR02" | "W3-KR03";
  objectiveKind: "cargo-escort" | "guard-relief" | "filter-repair" | "circuit-defense" | "beacon-intercept";
  playability: "objective-exercise";
}
export type WarRtsScriptedObjectiveV119 =
 | { scenarioId:"W3-RTS01"; kind:"cargo-escort"; sourceMapId:"W3-MAP01";
     scouted:boolean; cargo:{id:string; carrierTeamId:string|null; x:number; y:number};
     exit:{x:7;y:4} }
 | { scenarioId:"W3-RTS02"; kind:"guard-relief"; sourceMapId:"W3-MAP01";
     reliefProgress:number; requiredTurns:3; guardPoint:{x:7;y:3} }
 | { scenarioId:"W3-RTS03"; kind:"filter-repair"; sourceMapId:"W3-MAP02";
     cargo:{id:string; carrierTeamId:string|null; x:number; y:number};
     filterSite:{x:7;y:3}; delivered:boolean; workProgress:number; requiredTurns:2 }
 | { scenarioId:"W3-RTS04"; kind:"circuit-defense"; sourceMapId:"W3-MAP02";
     leverPoint:{x:7;y:3}; heldTurns:number; requiredTurns:4;
     integrity:number; maxIntegrity:3; pressurePhase:number }
 | { scenarioId:"W3-RTS05"; kind:"beacon-intercept"; sourceMapId:"W3-MAP03";
     beacon:{id:string; enemyCarrierId:string|null; allyCarrierTeamId:string|null; x:number; y:number};
     observed:boolean; decoy:{x:5;y:5;recognized:boolean};
     extraction:{x:1;y:4} };

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
  if(!["W3-RTS01","W3-RTS02","W3-RTS03","W3-RTS04","W3-RTS05"].includes(id))return null;
  const entry=rules.entries.find(item=>item.sheet==="Scénarios RTS"&&item.id===id);
  if(!entry)return null;
  const v=(column:string)=>String(entry.fields.find(field=>field.column===column)?.value??"").trim();
  const mapId=id==="W3-RTS05"?"W3-MAP03":id==="W3-RTS03"||id==="W3-RTS04"?"W3-MAP02":"W3-MAP01";
  if(v("C")!==mapId || !rules.entries.some(item=>item.sheet==="Cartes des escarmouches"&&item.id===mapId))
    return null;
  return {
    id,title:String(entry.title),sourceMapId:mapId,
    sourceCells:["C","D","E","F","G","H","I","J","K","L","M","N","O"]
      .map(column=>entry.fields.find(field=>field.column===column)?.cell).filter((cell):cell is string=>!!cell),
    situation:v("E"),tactics:v("I"),enemyPlan:v("J"),completion:v("L"),
    supportedRegionId:id==="W3-RTS05"?"W3-KR03":id==="W3-RTS03"||id==="W3-RTS04"?"W3-KR02":"W3-KR01",
    objectiveKind:id==="W3-RTS01"?"cargo-escort":id==="W3-RTS02"?"guard-relief":
      id==="W3-RTS03"?"filter-repair":id==="W3-RTS04"?"circuit-defense":"beacon-intercept",
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
    return "Cette reconstitution "+brief.sourceMapId+" nécessite un site de la région "+brief.supportedRegionId+".";
  if(brief.id==="W3-RTS01"&&(!unitIds.some(unit=>PORTER_UNITS.has(unit))||!unitIds.some(unit=>SCOUT_UNITS.has(unit))))
    return "L'escorte W3-RTS01 exige un véritable porteur W3-U17/U19 et un éclaireur W3-U01/U02/U05/U06.";
  if(brief.id==="W3-RTS02"&&!unitIds.includes(GUARD_UNIT))
    return "La relève W3-RTS02 exige une équipe W3-U07 réellement présente pour garder le sommet.";
  if(brief.id==="W3-RTS03"&&(!unitIds.includes("W3-U19")||!unitIds.includes("W3-U20")))
    return "W3-RTS03 exige un récupérateur de charges W3-U19 et de vrais artisans W3-U20, recrutés et présents.";
  if(brief.id==="W3-RTS04"&&!unitIds.includes("W3-U07"))
    return "W3-RTS04 exige des lanciers de seuil W3-U07 pour défendre réellement le levier.";
  if(brief.id==="W3-RTS05"&&(!unitIds.includes("W3-U01")||!unitIds.some(u=>["W3-U04","W3-U21"].includes(u))))
    return "W3-RTS05 exige W3-U01 pour reconnaître la balise et W3-U04/U21 pour la récupérer et rejoindre la coque.";
  return null;
}
export function createWarRtsScriptedObjectiveV119(
  id:WarSourceRtsScenarioIdV119,operationId:string,actors:readonly WarRtsActorV115[],
):WarRtsScriptedObjectiveV119|null {
  if(id==="W3-RTS02")return {
    scenarioId:id,kind:"guard-relief",sourceMapId:"W3-MAP01",
    reliefProgress:0,requiredTurns:3,guardPoint:{x:7,y:3},
  };
  if(id==="W3-RTS04")return {
    scenarioId:id,kind:"circuit-defense",sourceMapId:"W3-MAP02",
    leverPoint:{x:7,y:3},heldTurns:0,requiredTurns:4,
    integrity:3,maxIntegrity:3,pressurePhase:0,
  };
  if(id==="W3-RTS05"){
    const scout=actors.find(actor=>actor.side==="ally"&&actor.unitId==="W3-U01");
    const tracker=actors.find(actor=>actor.side==="ally"&&["W3-U04","W3-U21"].includes(actor.unitId));
    const enemy=actors.find(actor=>actor.side==="rival"&&actor.id==="rival-0");
    if(!scout||!tracker||!enemy)return null;
    return {scenarioId:id,kind:"beacon-intercept",sourceMapId:"W3-MAP03",observed:false,
      beacon:{id:operationId+"-beacon",enemyCarrierId:enemy.id,allyCarrierTeamId:null,x:enemy.x,y:enemy.y},
      decoy:{x:5,y:5,recognized:false},extraction:{x:1,y:4}};
  }
    if(id==="W3-RTS03"){
    const porter=actors.find(actor=>actor.side==="ally"&&actor.teamId&&actor.unitId==="W3-U19");
    if(!porter)return null;
    return {scenarioId:id,kind:"filter-repair",sourceMapId:"W3-MAP02",
      cargo:{id:operationId+"-cargo",carrierTeamId:porter.teamId,x:porter.x,y:porter.y},
      filterSite:{x:7,y:3},delivered:false,workProgress:0,requiredTurns:2};
  }
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
  if(objective.kind==="circuit-defense"){
    const guard=own.some(actor=>actor.unitId===GUARD_UNIT&&DIST(actor,objective.leverPoint)<=1);
    const attackers=hostile.filter(actor=>DIST(actor,objective.leverPoint)<=1);
    const phase=(objective.pressurePhase+1)%3;
    // Vapor cycling is announced, but hazards do not fabricate new casualties.
    // An unguarded lever under physical assault loses one local integrity point.
    const integrity=Math.max(0,objective.integrity-(!guard&&attackers.length?1:0));
    const held=guard&&!attackers.length?
      Math.min(objective.requiredTurns,objective.heldTurns+1):0;
    const next={...objective,heldTurns:held,integrity,pressurePhase:phase};
    const complete=held>=objective.requiredTurns&&integrity>0;
    const lost=integrity<=0||!own.some(actor=>actor.unitId===GUARD_UNIT);
    const hazard=phase===1?"montée de vapeur annoncée":phase===2?"cycle de vapeur visible":"pression relâchée";
    return {objective:next,outcome:complete?"victory":lost?"defeat":null,
      message:complete?"Circuit encore ouvert : les lanciers ont tenu le levier jusqu'à la relève.":
        "Levier W3-MAP02 : "+held+"/"+objective.requiredTurns+
        " tours tenus, intégrité "+integrity+"/"+objective.maxIntegrity+
        ", "+hazard+" ; garde "+(guard?"présente":"absente")+
        ", ennemis au levier "+attackers.length+"."};
  }
  if(objective.kind==="beacon-intercept"){
    let beacon={...objective.beacon};
    if(beacon.enemyCarrierId){
      const bearer=actors.find(actor=>actor.side==="rival"&&actor.id===beacon.enemyCarrierId);
      if(bearer&&bearer.hp>0)beacon={...beacon,x:bearer.x,y:bearer.y};
      else beacon={...beacon,enemyCarrierId:null,x:bearer?.x??beacon.x,y:bearer?.y??beacon.y};
    }
    if(beacon.allyCarrierTeamId){
      const bearer=actors.find(actor=>actor.side==="ally"&&actor.teamId===beacon.allyCarrierTeamId);
      if(bearer&&bearer.hp>0)beacon={...beacon,x:bearer.x,y:bearer.y};
      else beacon={...beacon,allyCarrierTeamId:null,x:bearer?.x??beacon.x,y:bearer?.y??beacon.y};
    }
    const scoutPresent=own.some(actor=>actor.unitId==="W3-U01");
    const observed=objective.observed||own.some(actor=>actor.unitId==="W3-U01"&&
      DIST(actor,beacon)<=4&&warTerrainLineOfSightV116(terrain,actor,beacon));
    const decoyRecognized=objective.decoy.recognized||own.some(actor=>actor.unitId==="W3-U01"&&
      DIST(actor,objective.decoy)<=1&&
      warTerrainLineOfSightV116(terrain,actor,objective.decoy));
    // Real beacon stays on its original carrier or on the ground until the
    // rightful scout has actually identified it. A decoy never becomes loot.
    if(observed&&!beacon.enemyCarrierId&&!beacon.allyCarrierTeamId){
      const recovery=own.filter(actor=>actor.teamId&&["W3-U04","W3-U21"].includes(actor.unitId)&&
        actor.x===beacon.x&&actor.y===beacon.y)
        .sort((a,b)=>a.id.localeCompare(b.id))[0];
      if(recovery)beacon={...beacon,allyCarrierTeamId:recovery.teamId};
    }
    const allyBearer=beacon.allyCarrierTeamId?own.find(actor=>actor.teamId===beacon.allyCarrierTeamId):null;
    const delivered=Boolean(observed&&allyBearer&&beacon.x===objective.extraction.x&&
      beacon.y===objective.extraction.y);
    const canRecover=own.some(actor=>["W3-U04","W3-U21"].includes(actor.unitId));
    const canObserve=observed||scoutPresent;
    const next={...objective,observed,beacon,decoy:{...objective.decoy,recognized:decoyRecognized}};
    const outcome=delivered?"victory":canRecover&&canObserve?null:"defeat";
    return {objective:next,outcome,message:delivered?
      "La véritable balise a été reconnue, interceptée et ramenée physiquement à la coque.":
      "Balise "+(observed?"identifiée":"non confirmée")+
      " · objet "+(beacon.allyCarrierTeamId?"récupéré":"encore en poursuite")+
      " · leurre "+(decoyRecognized?"identifié":"non vérifié")+
      " · retour en "+objective.extraction.x+","+objective.extraction.y+"."};
  }
  if(objective.kind==="filter-repair"){
    let cargo={...objective.cargo};
    if(!objective.delivered){
      if(cargo.carrierTeamId){
        const carrier=actors.find(actor=>actor.teamId===cargo.carrierTeamId);
        if(carrier&&carrier.hp>0){cargo={...cargo,x:carrier.x,y:carrier.y};}
        else cargo={...cargo,carrierTeamId:null,x:carrier?.x??cargo.x,y:carrier?.y??cargo.y};
      }
      if(!cargo.carrierTeamId){
        const replacement=own.filter(actor=>actor.unitId==="W3-U19"&&actor.teamId&&
          actor.x===cargo.x&&actor.y===cargo.y)
          .sort((a,b)=>a.id.localeCompare(b.id))[0];
        if(replacement)cargo={...cargo,carrierTeamId:replacement.teamId};
      }
    }
    const newlyDelivered=!objective.delivered&&Boolean(cargo.carrierTeamId&&
      cargo.x===objective.filterSite.x&&cargo.y===objective.filterSite.y);
    const delivered=objective.delivered||newlyDelivered;
    if(newlyDelivered)cargo={...cargo,carrierTeamId:null,x:7,y:3};
    const engineer=own.some(actor=>actor.unitId==="W3-U20"&&DIST(actor,objective.filterSite)<=1);
    const frontClear=!hostile.some(actor=>DIST(actor,objective.filterSite)<=1);
    // A full turn of work occurs only AFTER a previously completed delivery.
    // A mere arrival at the same tick cannot instantly finish the repair.
    const progress=objective.delivered&&engineer&&frontClear?
      Math.min(objective.requiredTurns,objective.workProgress+1):objective.workProgress;
    const stillPossible=own.some(actor=>actor.unitId==="W3-U20")&&
      (delivered||own.some(actor=>actor.unitId==="W3-U19"));
    const next={...objective,cargo,delivered,workProgress:progress};
    return {objective:next,outcome:progress>=objective.requiredTurns?"victory":stillPossible?null:"defeat",
      message:progress>=objective.requiredTurns?"Régulateur livré, filtre rétabli par les artisans présents pendant deux tours.":
        "Filtre W3-MAP02 : régulateur "+(delivered?"livré":"en transit")+
        ", travail "+progress+"/"+objective.requiredTurns+
        " · artisans "+(engineer?"au poste":"absents du poste")+
        " · accès "+(frontClear?"libre":"contesté")+"."};
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
/**
 * V120 : a small role-aware rival director derived from W3-RTS01/02/03.
 * Priority applies ONLY to opponents actually visible through local terrain.
 * Unobserved teams retain the existing nearest-target fallback from V115;
 * this is not a full stealth/fog-of-war memory simulation.
 * No hidden V85 roster, faction diplomacy, or canonical film identity read.
 */

/** The W3-MAP02 steam burst is announced by the previous tick's phase.
 * It temporarily hides a central conduit lane but is not a solid wall.
 * Neither side gets an omniscient shot through the plume. */
export function warRtsSourceSightV120(
  objective:WarRtsScriptedObjectiveV119|undefined,
  from:{x:number;y:number},to:{x:number;y:number},
  terrain:WarMissionTerrainV116,
):boolean {
  if(!warTerrainLineOfSightV116(terrain,from,to))return false;
  if(objective?.kind!=="circuit-defense"||objective.pressurePhase!==2)return true;
  let x=from.x,y=from.y;
  const dx=Math.abs(to.x-from.x),dy=Math.abs(to.y-from.y);
  const stepX=from.x<to.x?1:-1,stepY=from.y<to.y?1:-1;
  let err=dx-dy;
  while(x!==to.x||y!==to.y){
    const double=2*err;
    if(double>-dy){err-=dy;x+=stepX;}
    if(double<dx){err+=dx;y+=stepY;}
    if((x!==from.x||y!==from.y)&&(x!==to.x||y!==to.y)&&x>=4&&x<=6&&y>=1&&y<=3)return false;
  }
  return true;
}

export function warRtsRivalTargetV120(
  objective:WarRtsScriptedObjectiveV119|undefined,
  rival:WarRtsActorV115,
  candidates:readonly WarRtsActorV115[],
  terrain:WarMissionTerrainV116,
):WarRtsActorV115|null {
  const living=candidates.filter(actor=>actor.side==="ally"&&actor.hp>0);
  if(!living.length)return null;
  const byDistance=(a:WarRtsActorV115,b:WarRtsActorV115)=>
    DIST(rival,a)-DIST(rival,b)||a.id.localeCompare(b.id);
  const visible=living.filter(actor=>warRtsSourceSightV120(objective,rival,actor,terrain)).sort(byDistance);
  const priority=objective?.kind==="cargo-escort"?
    (actor:WarRtsActorV115)=>actor.teamId===objective.cargo.carrierTeamId&&PORTER_UNITS.has(actor.unitId):
    objective?.kind==="guard-relief"?
      (actor:WarRtsActorV115)=>actor.unitId===GUARD_UNIT:
      objective?.kind==="filter-repair"?
        (actor:WarRtsActorV115)=>objective.delivered?
          actor.unitId==="W3-U20":actor.teamId===objective.cargo.carrierTeamId&&actor.unitId==="W3-U19":
        objective?.kind==="circuit-defense"?
          (actor:WarRtsActorV115)=>actor.unitId===GUARD_UNIT&&DIST(actor,objective.leverPoint)<=2:
          objective?.kind==="beacon-intercept"?
            (actor:WarRtsActorV115)=>actor.unitId==="W3-U01":
            (_actor:WarRtsActorV115)=>false;
  const selected=visible.find(priority);
  return selected??(visible[0]??[...living].sort(byDistance)[0]);
}

export function validWarRtsScriptedObjectiveV119(
  value:unknown,operationId:string,actorTeamIds:readonly string[],actors:readonly WarRtsActorV115[],
  targetId:string,rules:WarRulesV6,unitIds:readonly string[],
):value is WarRtsScriptedObjectiveV119 {
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  const v=value as Partial<WarRtsScriptedObjectiveV119>;
  if(!v.scenarioId||warRtsScriptedEligibilityV119(v.scenarioId,rules,targetId,unitIds)!==null||
    v.sourceMapId!==(v.scenarioId==="W3-RTS05"?"W3-MAP03":v.scenarioId==="W3-RTS03"||v.scenarioId==="W3-RTS04"?"W3-MAP02":"W3-MAP01"))return false;
  const terrain=warMissionTerrainV116(targetId,rules);
  if(v.scenarioId==="W3-RTS02"){
    const stage=v as Partial<Extract<WarRtsScriptedObjectiveV119,{kind:"guard-relief"}>>;
    return stage.kind==="guard-relief"&&stage.requiredTurns===3&&
      !!stage.guardPoint&&stage.guardPoint.x===7&&stage.guardPoint.y===3&&
      Number.isInteger(stage.reliefProgress)&&(stage.reliefProgress as number)>=0&&(stage.reliefProgress as number)<=3;
  }
  if(v.scenarioId==="W3-RTS05"){
    const stage=v as Partial<Extract<WarRtsScriptedObjectiveV119,{kind:"beacon-intercept"}>>;
    if(stage.kind!=="beacon-intercept"||typeof stage.observed!=="boolean"||!stage.beacon||
      !stage.decoy||stage.decoy.x!==5||stage.decoy.y!==5||
      typeof stage.decoy.recognized!=="boolean"||!stage.extraction||
      stage.extraction.x!==1||stage.extraction.y!==4)return false;
    const beacon=stage.beacon;
    if(beacon.id!==operationId+"-beacon"||!Number.isInteger(beacon.x)||!Number.isInteger(beacon.y)||
      warTerrainCellBlockedV116(terrain,beacon.x,beacon.y)||
      (beacon.enemyCarrierId!==null&&beacon.allyCarrierTeamId!==null))return false;
    if(beacon.enemyCarrierId!==null){
      if(beacon.enemyCarrierId!=="rival-0"||
        !actors.some(actor=>actor.id===beacon.enemyCarrierId&&actor.side==="rival"&&actor.hp>0&&
          actor.x===beacon.x&&actor.y===beacon.y))return false;
    }
    if(beacon.allyCarrierTeamId!==null){
      if(!stage.observed||typeof beacon.allyCarrierTeamId!=="string"||
        !actorTeamIds.includes(beacon.allyCarrierTeamId)||
        !actors.some(actor=>actor.teamId===beacon.allyCarrierTeamId&&actor.side==="ally"&&
          ["W3-U04","W3-U21"].includes(actor.unitId)&&actor.hp>0&&actor.x===beacon.x&&actor.y===beacon.y))return false;
    }
    return true;
  }
  if(v.scenarioId==="W3-RTS04"){
    const stage=v as Partial<Extract<WarRtsScriptedObjectiveV119,{kind:"circuit-defense"}>>;
    return stage.kind==="circuit-defense"&&!!stage.leverPoint&&
      stage.leverPoint.x===7&&stage.leverPoint.y===3&&stage.requiredTurns===4&&
      stage.maxIntegrity===3&&Number.isInteger(stage.heldTurns)&&
      (stage.heldTurns as number)>=0&&(stage.heldTurns as number)<=4&&
      Number.isInteger(stage.integrity)&&(stage.integrity as number)>=1&&(stage.integrity as number)<=3&&
      Number.isInteger(stage.pressurePhase)&&(stage.pressurePhase as number)>=0&&
      (stage.pressurePhase as number)<=2;
  }
  if(v.scenarioId==="W3-RTS03"){
    const stage=v as Partial<Extract<WarRtsScriptedObjectiveV119,{kind:"filter-repair"}>>;
    if(stage.kind!=="filter-repair"||!stage.filterSite||
      stage.filterSite.x!==7||stage.filterSite.y!==3||
      stage.requiredTurns!==2||!Number.isInteger(stage.workProgress)||
      (stage.workProgress as number)<0||(stage.workProgress as number)>2||
      typeof stage.delivered!=="boolean"||!stage.cargo)return false;
    const cargo=stage.cargo;
    if(cargo.id!==operationId+"-cargo"||!Number.isInteger(cargo.x)||!Number.isInteger(cargo.y)||
      warTerrainCellBlockedV116(terrain,cargo.x,cargo.y))return false;
    if(stage.delivered)return cargo.carrierTeamId===null&&cargo.x===7&&cargo.y===3;
    return cargo.carrierTeamId===null||
      (typeof cargo.carrierTeamId==="string"&&actorTeamIds.includes(cargo.carrierTeamId)&&
        actors.some(actor=>actor.side==="ally"&&actor.teamId===cargo.carrierTeamId&&actor.unitId==="W3-U19"&&
          actor.hp>0&&actor.x===cargo.x&&actor.y===cargo.y));
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
