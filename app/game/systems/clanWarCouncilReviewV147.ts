import type {WarRulesV6} from "./clanWarBibleV6";
import type {
 WarOperationsStateV115,WarMissionModeV115,WarMissionReportV115,
} from "./clanWarOperationsV115";
import {readWarOperationsV115} from "./clanWarOperationsV115";
import type {
 WarRtsSquadsStateV133,WarRtsSquadsReceiptV133,
} from "./clanWarRtsSquadsV133";
import {createWarRtsMissionStateV129} from "./clanWarRtsSourceMissionsV129";

/**
 * V147 — a single, READ-ONLY evidence envelope across all four Clan War
 * gamemodes. This is the intended audit/handoff boundary for future V85
 * integration, NOT a V85 write or a promise of canonical film events.
 * Never fabricate positions, results, combatants, planet coordinates, or
 * missing physical proof from a completed training report.
 */
export type WarCouncilModeV147 = WarMissionModeV115;
export interface WarCouncilDossierV147 {
 id:string;operationId:string;mode:WarCouncilModeV147;
 outcome:"victory"|"defeat"|"retreat";
 targetId:string;territoryName:string;planetId:string|null;
 sourceSha:string;sourceType:"V115-exercise"|"W133-source-study";
 sourceIds:string[];teamIds:string[];unitIds:string[];
 casualtyIds:string[];woundedCount:number;completedTaskIds:string[];
 routePassageIds:string[]|null;
 escortExtracted:boolean|null;
 remainingRav:number|null;
 summary:string;engagementLog:string[];
 provenFacts:string[];missingEvidence:string[];
 status:"source-checked"|"partial-evidence";
 /** No tool consumer may interpret this output as permission to modify V85. */
 campaignMutation:false;readyForCampaign:false;
}
export interface WarCouncilAuditV147 {
 dossiers:WarCouncilDossierV147[];issues:string[];
 total:number;byMode:Record<WarCouncilModeV147,number>;
 sourceSha:string;campaignMutation:false;
}
const unique=(values:string[])=>[...new Set(values)];
const sameStrings=(a:string[],b:string[])=>a.length===b.length&&a.every((v,i)=>v===b[i]);
// Authored mission data is immutable in W133; compare structure without
// depending on JavaScript property insertion order after serialization.
function sameSourceValue(a:unknown,b:unknown):boolean {
 if(a===b)return true;
 if(!a||!b||typeof a!=="object"||typeof b!=="object")return false;
 if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&
  a.length===b.length&&a.every((value,i)=>sameSourceValue(value,b[i]));
 const left=a as Record<string,unknown>,right=b as Record<string,unknown>;
 const keys=Object.keys(left).filter(key=>left[key]!==undefined).sort();
 const other=Object.keys(right).filter(key=>right[key]!==undefined).sort();
 return sameStrings(keys,other)&&keys.every(key=>sameSourceValue(left[key],right[key]));
}
/** Consistency with the local V6 catalog, not authentication of a client save. */
function hasKnownRtsSource(state:WarRtsSquadsStateV133,rules:WarRulesV6):boolean {
 try {
  const source=createWarRtsMissionStateV129(state.mission.id,rules);
  const mission=source.mission,map=source.base.map;
  return (state.phase==="victory"||state.phase==="defeat"||state.phase==="retreat")&&
   sameSourceValue(state.mission,mission)&&
   state.mission.mapId===mission.mapId&&state.mission.planetId===mission.planetId&&
   state.map.id===map.id&&state.map.planetId===map.planetId&&
   sameSourceValue(state.map,map)&&hasSourceRtsRoster(state,rules)&&
   state.initialRav===mission.initialRav&&Number.isSafeInteger(state.ravRemaining)&&
   state.ravRemaining>=0&&state.ravRemaining<=state.initialRav&&
   Number.isSafeInteger(state.turn)&&state.turn>=0&&
   (source.tracked?Boolean(state.tracked&&state.tracked.id===source.tracked.id&&
    state.tracked.kind===source.tracked.kind&&state.tracked.isNeutral===source.tracked.isNeutral):state.tracked===null)&&
   sameStrings(state.mission.sourceCells,mission.sourceCells)&&
   sameStrings(state.map.sourceCells,map.sourceCells)&&
   sameStrings(state.mission.tasks.map(t=>t.id),mission.tasks.map(t=>t.id))&&
   state.completedTaskIds.every((id,i)=>id===mission.tasks[i]?.id)&&
   (state.phase!=="victory"||(state.completedTaskIds.length===mission.tasks.length&&
    (!mission.escortKind||Boolean(state.tracked?.extracted))))&&
   state.squads.length>=2&&state.squads.length<=4&&
   state.squads.every(s=>rules.units.some(u=>u.id===s.unitId&&u.fullMembers>0&&u.commandPoints>0));
 } catch {
  return false;
 }
}
/**
 * Local V6 budget and roster consistency. No combatant identity or combat
 * history is authenticated here; this rejects impossible saved formations,
 * inflated statistics and fictional command-point allowances.
 */
function hasSourceRtsRoster(state:WarRtsSquadsStateV133,rules:WarRulesV6):boolean {
 if(state.pcMaximum!==state.mission.pcMaximum||
    !Number.isSafeInteger(state.pcCommitted)||
    !Number.isSafeInteger(state.nextSquadNumber)||
    state.nextSquadNumber<3)return false;
 const prefix="W133-"+state.mission.id+"-ALLY-";
 const seen=new Set<string>();
 let spent=0;
 for(const squad of state.squads){
  const suffix=squad.id.startsWith(prefix)?squad.id.slice(prefix.length):"";
  const number=Number(suffix);
  const unit=rules.units.find(u=>u.id===squad.unitId&&u.fullMembers>0&&u.commandPoints>0);
  if(!unit||!/^[1-9][0-9]*$/.test(suffix)||!Number.isSafeInteger(number)||
     number>=state.nextSquadNumber||seen.has(squad.id))return false;
  seen.add(squad.id);
  const hpCap=Math.max(7,Math.min(28,5+Math.ceil(unit.defense/3)+unit.fullMembers));
  const range=Math.max(1,Math.min(4,unit.range));
  if(squad.unitName!==unit.name||squad.memberCount!==unit.fullMembers||
     squad.maxHp!==hpCap||!Number.isSafeInteger(squad.hp)||
     squad.hp<0||squad.hp>hpCap||
     squad.attack!==unit.attack||squad.defense!==unit.defense||
     squad.range!==range||squad.mobility!==unit.mobility||
     squad.commandPoints!==unit.commandPoints||squad.upkeepRav!==unit.upkeepRav||
     squad.status==="ready")return false;
  spent+=unit.commandPoints;
 }
 return spent===state.pcCommitted&&spent<=state.pcMaximum;
}
const staticMissing:Record<WarCouncilModeV147,string[]>={
 assault:["Chronologie spatiale des touches non archivée dans le rapport V115",
  "Validation de continuité filmique et de conquête V85 absente"],
 outer:["Liste de tous les passages réellement franchis non archivée à la clôture V115",
  "Persistance et décision de campagne V85 absentes"],
 stealth:["Trajectoire finale des gardes et preuve du sabotage non archivées par tour",
  "Reconstitution de niveau filmique 1:1 non certifiée"],
 rts:["Identité des positions de chaque escouade au moment de l'extraction V115 manquante",
  "Accord du moteur de campagne V85 non établi"],
};
function territory(rules:WarRulesV6,id:string){
 const source=rules.territories.find(x=>x.id===id);
 return {territoryName:source?.name??id,planetId:null};
}
function dossierV115(report:WarMissionReportV115,ops:WarOperationsStateV115,
 rules:WarRulesV6):WarCouncilDossierV147 {
 const id="V115:"+report.id;
 const teamIds=unique(report.teamIds);
 const unitIds=unique(teamIds.flatMap(tid=>{
  const t=ops.teams.find(t=>t.id===tid);
  return t?[t.unitId]:[];
 }));
 return {
  id,operationId:report.id,mode:report.mode,outcome:report.outcome,
  targetId:report.targetId,...territory(rules,report.targetId),
  sourceSha:rules.metadata.sha256,sourceType:"V115-exercise",
  sourceIds:unique(report.sourceIds),teamIds,unitIds,
  casualtyIds:unique(report.woundedIds),woundedCount:report.woundedIds.length,
  completedTaskIds:[],routePassageIds:null,escortExtracted:null,
  remainingRav:null,summary:report.summary,
  engagementLog:(report.engagementLog??[]).slice(0,12),
  provenFacts:[
   "Rapport V115 rattaché au catalogue V6 : "+report.id,
   "Issue enregistrée : "+report.outcome,
   "Détachements identifiés : "+teamIds.length,
   ...(report.mode==="outer"&&report.focus?
      ["Mandat délégué réellement enregistré : "+report.focus]:[]),
   ...(report.mode==="stealth"?
      ["L'issue du parcours d'infiltration est consignée, sans télémétrie inventée"]:[]),
   ...(report.mode==="assault"?
      ["Le résultat latéral inclut les blessés V6 effectivement identifiés"]:[]),
  ],missingEvidence:[...staticMissing[report.mode]],
  status:"partial-evidence",campaignMutation:false,readyForCampaign:false,
 };
}
function dossierRts(report:WarRtsSquadsReceiptV133,state:WarRtsSquadsStateV133,
 rules:WarRulesV6):WarCouncilDossierV147 {
 const sourceIds=unique(report.sourceCells);
 const completedTaskIds=unique(report.completedTaskIds);
 const teamIds=unique(report.squadIds);
 const unitIds=unique(state.squads.filter(u=>teamIds.includes(u.id)).map(u=>u.unitId));
 const complete=report.outcome==="victory"&&
   state.mission.tasks.every(t=>completedTaskIds.includes(t.id))&&
   (!state.tracked||report.escortExtracted);
 const missing=[
   ...(report.outcome==="victory"&&!complete?
       ["Preuves des trois objectifs ou escorte finale incomplètes"]:[]),
   "Simulation libre W3 : progression et terrain V85 non fusionnés",
  "Archive locale non authentifiée : la cohérence source ne prouve pas le déroulement réel",
   "Validation 1:1 des scènes, armes et décors non réalisée",
 ];
 return {
  id:"W133:"+report.id,operationId:report.id,mode:"rts",
  outcome:report.outcome,targetId:report.missionId,
  territoryName:state.mission.id,planetId:report.planetId,
  sourceSha:rules.metadata.sha256,sourceType:"W133-source-study",
  sourceIds,teamIds,unitIds,
  casualtyIds:unique(report.downSquadIds),woundedCount:report.downSquadIds.length,
  completedTaskIds,routePassageIds:null,escortExtracted:report.escortExtracted,
  remainingRav:report.remainingRav,
  summary:"Bataille tactique W3 "+report.missionId+": "+report.outcome+
   " ; "+completedTaskIds.length+"/"+state.mission.tasks.length+" preuves.",
  engagementLog:state.log.slice(-12),
  provenFacts:[
   "Carte W3 physique : "+report.mapId,
   "Planète source du scénario W3 : "+report.planetId,
   "Escouades identifiées : "+teamIds.length,
   "Objectifs source validés : "+completedTaskIds.length+"/"+state.mission.tasks.length,
   "Évacuées vivantes : "+(report.evacuatedSquadIds??[]).length,
  ],missingEvidence:missing,
  status:complete?"source-checked":"partial-evidence",
  campaignMutation:false,readyForCampaign:false,
 };
}
export function buildWarCouncilAuditV147(
 ops:WarOperationsStateV115|null,rts:WarRtsSquadsStateV133|null,
 rules:WarRulesV6,
):WarCouncilAuditV147 {
 const issues:string[]=[];
 const dossiers:WarCouncilDossierV147[]=[];
 if(ops){
  if(ops.sourceSha!==rules.metadata.sha256||
   !readWarOperationsV115(JSON.stringify(ops),rules)){
   issues.push("Archive V115 illisible ou source V6 non conforme : aucun dossier V115 importé.");
  }else{
   for(const report of ops.reports){
    if(!rules.territories.some(t=>t.id===report.targetId)){
     issues.push("Site V115 absent de la Bible : "+report.id);continue;
    }
    dossiers.push(dossierV115(report,ops,rules));
   }
  }
 }
 if(rts?.report){
  const report=rts.report;
  const correct=hasKnownRtsSource(rts,rules)&&rts.sourceSha===rules.metadata.sha256&&
   rts.mode==="free-exercise"&&report.source==="V6-W3-original-field-study"&&
   report.campaignMutation===false&&report.missionId===rts.mission.id&&
   report.mapId===rts.map.id&&report.planetId===rts.map.planetId&&
   report.outcome===rts.phase&&
   report.id==="W133-"+rts.mission.id+"-"+report.outcome+"-"+rts.turn&&
   report.turn===rts.turn&&report.remainingRav===rts.ravRemaining&&
   report.squadIds.join(":")===rts.squads.map(u=>u.id).join(":")&&
   report.downSquadIds.join(":")===rts.squads.filter(u=>u.status==="down").map(u=>u.id).join(":")&&
   report.leftBehindSquadIds.join(":")===(report.outcome==="retreat"?
    rts.squads.filter(u=>u.status==="active"&&u.hp>0&&
     Math.abs(u.x-rts.map.extraction.x)+Math.abs(u.y-rts.map.extraction.y)>2).map(u=>u.id):[]).join(":")&&
   (report.evacuatedSquadIds??[]).join(":")===rts.squads.filter(u=>u.status==="evacuated").map(u=>u.id).join(":")&&
   report.escortExtracted===Boolean(rts.tracked?.extracted)&&
   report.completedTaskIds.join(":")===rts.completedTaskIds.join(":")&&
   report.sourceCells.join(":")===
    [...rts.mission.sourceCells,...rts.map.sourceCells].join(":")&&
   report.squadIds.length===new Set(report.squadIds).size&&
   report.squadIds.every(id=>rts.squads.some(s=>s.id===id))&&
   report.completedTaskIds.every(id=>rts.mission.tasks.some(t=>t.id===id))&&
   report.sourceCells.every(c=>rts.mission.sourceCells.includes(c)||
      rts.map.sourceCells.includes(c));
  if(!correct)issues.push("Reçu tactique W133 incompatible : aucune preuve fabriquée.");
  else dossiers.push(dossierRts(report,rts,rules));
 }
 const uniqueDossiers=new Map<string,WarCouncilDossierV147>();
 for(const dossier of dossiers){
  if(uniqueDossiers.has(dossier.id)){
   issues.push("Rapport de mission doublonné et ignoré : "+dossier.id);continue;
  }
  uniqueDossiers.set(dossier.id,dossier);
 }
 const final=[...uniqueDossiers.values()];
 return {dossiers:final,issues,total:final.length,sourceSha:rules.metadata.sha256,
  byMode:{assault:final.filter(x=>x.mode==="assault").length,
   outer:final.filter(x=>x.mode==="outer").length,
   stealth:final.filter(x=>x.mode==="stealth").length,
   rts:final.filter(x=>x.mode==="rts").length},
  campaignMutation:false};
}


/**
 * Source-consistency acceptance only: a local save is NOT authenticated by
 * this test, and no military or campaign write follows from a positive result.
 * Reuses the hardened mission+map+roster+receipt checks from the sibling
 * Council V146 branch rather than interpreting client flags as authority.
 */
export function isWarRtsSourceConsistentV147(
  state:WarRtsSquadsStateV133,rules:WarRulesV6,
):boolean {
 const audit=buildWarCouncilAuditV147(null,state,rules);
 return audit.issues.length===0&&audit.dossiers.length===1&&
  audit.dossiers[0].sourceType==="W133-source-study"&&
  audit.dossiers[0].campaignMutation===false&&
  audit.dossiers[0].readyForCampaign===false;
}
