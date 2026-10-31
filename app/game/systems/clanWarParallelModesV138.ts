import type {WarRulesV6} from "./clanWarBibleV6";
import type {
 WarOperationsStateV115,WarOperationsUpdateV115,WarOuterMissionV115,WarStealthV115,
} from "./clanWarOperationsV115";
import {
 warTerrainLineOfSightV116,type WarMissionTerrainV116,
} from "./clanWarMissionTerrainV116";

/**
 * V138 — gameplay tactics based on the V6 game's actual teams and routes.
 * The model never edits the V85/main campaign, invents a Predator film
 * technology or grants experience/territory before a final mission receipt.
 */
const deny=(state:WarOperationsStateV115,message:string):WarOperationsUpdateV115=>
 ({state,accepted:false,message});
const accept=(state:WarOperationsStateV115,message:string):WarOperationsUpdateV115=>
 ({state,accepted:true,message});

export function commandWarAssaultSurgeV138(
 state:WarOperationsStateV115,teamId:string,rules:WarRulesV6,
):WarOperationsUpdateV115 {
 const mission=state.active,arena=mission?.assault;
 if(state.sourceSha!==rules.metadata.sha256||mission?.mode!=="assault"||!arena)
  return deny(state,"Front d'assaut V6 absent ou source invalide.");
 if(!mission.teamIds.includes(teamId)||!arena.launched.includes(teamId)||
   (arena.extractedIds??[]).includes(teamId))
  return deny(state,"Seule une vraie équipe engagée et non extraite peut percer le front.");
 if((arena.surgeIssuedIds??[]).includes(teamId))
  return deny(state,"Chaque détachement peut tenter une seule percée tactique.");
 const unit=arena.actors.find(a=>a.side==="ally"&&a.teamId===teamId&&a.hp>0);
 if(!unit)return deny(state,"Le détachement sélectionné est neutralisé ou absent.");
 if((arena.heldUntil?.[teamId]??0)>mission.tick)
  return deny(state,"Ce groupe est encore engagé dans un ordre physique de tenue de ligne.");
 const source=rules.units.find(u=>u.id===unit.unitId);
 if(!source)return deny(state,"Formation absente de la Bible V6.");
 if(arena.ap<12)return deny(state,"Une percée tactique exige 12 AP, jamais des RAV fictifs.");
 const stride=Math.min(5,Math.max(2,Math.ceil(source.mobility/2)+1));
 const enemyAhead=arena.actors
  .filter(a=>a.side==="rival"&&a.hp>0&&a.x>=unit.x&&a.x<=unit.x+stride)
  .sort((a,b)=>a.x-b.x)[0];
 const destination=Math.min(93,unit.x+stride,
  enemyAhead?Math.max(unit.x,enemyAhead.x-1):93);
 if(destination<=unit.x)
  return deny(state,"Opposition physiquement au contact : aucune percée gratuite ni traversée.");
 const actors=arena.actors.map(a=>a.id===unit.id?{...a,x:destination}:{...a});
 return accept({...state,active:{...mission,assault:{
  ...arena,actors,ap:arena.ap-12,
  surgeIssuedIds:[...(arena.surgeIssuedIds??[]),teamId],
 }}},
 "Percée tactique : "+unit.unitId+" progresse de "+(destination-unit.x)+
 " unités latérales pour 12 AP, sans traverser un adversaire.");
}

export type WarOuterSignalAssessmentV138="voie-stable"|"terrain-expose"|"transit-complexe";

/** This is a MID-ROUTE situation packet, not knowledge of a hidden garrison. */
export interface WarOuterSignalV138 {
 transmittedAt:number;
 assessment:WarOuterSignalAssessmentV138;
 passages:number;
 fitMembers:number;
}

/**
 * A field check only after half of the ORIGINAL dispatch journey.
 * It reads the published V6 ground/route and actual current fitness of the
 * deployed people. It does NOT call the deterministic battle resolver, leak
 * enemy plans, shorten deadlines, release a member or settle the mandate.
 */
export function requestWarOuterSignalV138(
 state:WarOperationsStateV115,operationId:string,now:number,
 rules:WarRulesV6,
):WarOperationsUpdateV115 {
 if(state.sourceSha!==rules.metadata.sha256||!Number.isSafeInteger(now)||now<0)
  return deny(state,"Horodatage ou règles V6 incompatibles.");
 const order=state.outer.find(m=>m.id===operationId);
 if(!order||order.recall||order.fieldSignal)
  return deny(state,"Rapport de terrain déjà émis, mandat clos ou rappel en cours.");
 const baseDueAt=order.reconHalt?.originalDueAt??order.dueAt;
 if(now<order.startedAt+Math.ceil((baseDueAt-order.startedAt)/2)||
    now>=order.dueAt)
  return deny(state,"Transmission terrain autorisée seulement après la mi-parcours réelle, avant le retour.");
 const territory=rules.territories.find(t=>t.id===order.targetId);
 if(!territory)return deny(state,"Territoire du mandat absent de la Bible V6.");
 const assigned=order.teamIds.map(teamId=>state.teams.find(team=>
   team.id===teamId&&state.assignments[team.id]===order.id));
 if(!assigned.length||assigned.some(t=>!t))
  return deny(state,"Détachements actifs introuvables ou réassignés.");
 const fitMembers=assigned.reduce((n,t)=>n+(t?.members.filter(p=>p.status==="fit").length??0),0);
 if(fitMembers===0)return deny(state,"Aucun membre apte à transmettre depuis cet itinéraire.");
 const assessment:WarOuterSignalAssessmentV138=
  order.routeIds.length>=4?"transit-complexe":
  territory.terrainDefense>=12?"terrain-expose":"voie-stable";
 const fieldSignal:WarOuterSignalV138={
  transmittedAt:now,assessment,passages:order.routeIds.length,fitMembers,
 };
 const outer:WarOuterMissionV115[]=state.outer.map(m=>m.id===order.id?
  {...m,fieldSignal}:m);
 return accept({...state,outer},
  "Transmission terrain : "+assessment+" ; "+fieldSignal.passages+
  " passages et "+fitMembers+" membre(s) aptes observés. Issue du combat non connue.");
}


/** The UI may display a guard precisely only when the hunter can really see it.
 * Hearing gives a direction, NEVER x/y or an enemy identity through fog.
 */
export function warStealthGuardVisibleV138(
 stealth:WarStealthV115,terrain:WarMissionTerrainV116,
):boolean {
 const distance=Math.abs(stealth.x-stealth.guardX)+Math.abs(stealth.y-2);
 return distance<=4&&warTerrainLineOfSightV116(terrain,
  {x:stealth.x,y:stealth.y},{x:stealth.guardX,y:2});
}
export function warStealthSoundBearingV138(
 stealth:WarStealthV115,missionTick:number,
):"est"|"ouest"|"proche"|null {
 if(!Number.isInteger(missionTick)||missionTick<0||
   stealth.heardBearing===undefined||
   !Number.isInteger(stealth.heardAtTick)||
   missionTick<stealth.heardAtTick||
   missionTick>stealth.heardAtTick+2)return null;
 return stealth.heardBearing;
}
