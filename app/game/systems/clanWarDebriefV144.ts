import type {WarRulesV6} from "./clanWarBibleV6";
import type {WarOperationsStateV115,WarMissionReportV115} from "./clanWarOperationsV115";
import type {WarRtsSquadsStateV133} from "./clanWarRtsSquadsV133";
import {WAR_TERRITORIES_V85} from "./clanWarV85Data";

/** V144 strictly read-only four-mode debrief contract.
 * A source-linked territory is NOT a V85 conquest or persistence write.
 * The actions, costs, missions, technology and timelines here remain original
 * game systems, never claims about canonical film/comic chronology. */
export interface WarDebriefV144 {
 version:144;
 receiptKey:string;
 source:"V115-EXERCISE"|"V133-W3-EXERCISE";
 mode:"assault"|"outer"|"stealth"|"rts";
 sourceSha:string;
 missionId:string;
 outcome:"victory"|"defeat"|"retreat";
 territoryId:string|null;
 territoryName:string|null;
 planetId:string|null;
 mapId:string|null;
 teamIds:string[];
 casualtyIds:string[];
 completedObjectiveIds:string[];
 proofCount:number;
 narrative:string;
 timeline:number;
 /** Exact foreign-key candidate only; applying to campaign is forbidden. */
 campaignCandidateTerritoryId:string|null;
 campaignMutation:false;
 requiresAuthorizedCampaignBridge:true;
}
export interface WarDebriefAuditV144 {
 debriefs:WarDebriefV144[];
 rejectedIds:string[];
}
const validId=(value:unknown):value is string=>
 typeof value==="string"&&/^[A-Za-z0-9:_-]{1,150}$/.test(value);
const unique=(items:readonly string[])=>new Set(items).size===items.length;

function validReportV115(
 report:WarMissionReportV115,state:WarOperationsStateV115,rules:WarRulesV6,
):boolean {
 if(!validId(report.id)||!validId(report.targetId)||
   !["assault","outer","stealth","rts"].includes(report.mode)||
   !["victory","defeat","retreat"].includes(report.outcome)||
   !Number.isSafeInteger(report.clock)||report.clock<0||
   !Array.isArray(report.teamIds)||report.teamIds.length<1||
   report.teamIds.length>4||!unique(report.teamIds)||
   report.teamIds.some(id=>!validId(id)||!state.teams.some(t=>t.id===id))||
   !Array.isArray(report.woundedIds)||!unique(report.woundedIds)||
   report.woundedIds.some(id=>!validId(id)||
     !state.teams.some(t=>t.members.some(m=>m.id===id)))||
   !rules.territories.some(t=>t.id===report.targetId)||
   typeof report.summary!=="string"||
   report.summary.length>1000)return false;
 return true;
}
export function auditWarOperationsDebriefsV144(
 state:WarOperationsStateV115,rules:WarRulesV6,
):WarDebriefAuditV144 {
 if(state.version!==1||state.context!=="free"||
    state.sourceSha!==rules.metadata.sha256)return {
   debriefs:[],rejectedIds:["SOURCE_SHA_MISMATCH"],
 };
 const debriefs:WarDebriefV144[]=[],rejectedIds:string[]=[];
 const processed=new Set<string>();
 for(const report of state.reports){
  const key="V115:"+String(report.id);
  if(processed.has(key)||!validReportV115(report,state,rules)){
   rejectedIds.push(key);continue;
  }
  processed.add(key);
  const territory=rules.territories.find(t=>t.id===report.targetId)!;
  const exactV85=WAR_TERRITORIES_V85.some(t=>t.id===report.targetId);
  const proofCount=report.engagementLog?.length??0;
  debriefs.push({
   version:144,receiptKey:key,source:"V115-EXERCISE",mode:report.mode,
   sourceSha:state.sourceSha,missionId:report.id,outcome:report.outcome,
   territoryId:report.targetId,territoryName:territory.name,
   planetId:null,mapId:null,teamIds:[...report.teamIds],
   casualtyIds:[...report.woundedIds],completedObjectiveIds:[],
   proofCount,narrative:report.summary,timeline:report.clock,
   campaignCandidateTerritoryId:exactV85?report.targetId:null,
   campaignMutation:false,requiresAuthorizedCampaignBridge:true,
  });
 }
 return {debriefs,rejectedIds};
}
export function auditWarRtsDebriefV144(
 state:WarRtsSquadsStateV133,rules:WarRulesV6,
):WarDebriefAuditV144 {
 if(state.sourceSha!==rules.metadata.sha256)return {
  debriefs:[],rejectedIds:["SOURCE_SHA_MISMATCH"],
 };
 const report=state.report;
 if(!report)return {debriefs:[],rejectedIds:[]};
 const key="V133:"+String(report.id);
 if(!validId(report.id)||!validId(report.missionId)||
   report.missionId!==state.mission.id||
   report.mapId!==state.map.id||
   report.planetId!==state.map.planetId||
   report.campaignMutation!==false||
   !["victory","defeat","retreat"].includes(report.outcome)||
   !Number.isInteger(report.turn)||report.turn<0||
   !Array.isArray(report.squadIds)||!unique(report.squadIds)||
   !Array.isArray(report.downSquadIds)||!unique(report.downSquadIds)||
   !Array.isArray(report.completedTaskIds)||!unique(report.completedTaskIds)||
   report.squadIds.some(id=>!validId(id)||!state.squads.some(u=>u.id===id))||
   report.downSquadIds.some(id=>!report.squadIds.includes(id))||
   report.completedTaskIds.some(id=>!state.mission.tasks.some(t=>t.id===id))||
   report.completedTaskIds.length>state.mission.tasks.length)return {
    debriefs:[],rejectedIds:[key],
   };
 const debrief:WarDebriefV144={
  version:144,receiptKey:key,source:"V133-W3-EXERCISE",mode:"rts",
  sourceSha:state.sourceSha,missionId:report.missionId,
  outcome:report.outcome,
  territoryId:null,territoryName:null,
  planetId:report.planetId,mapId:report.mapId,
  teamIds:[...report.squadIds],casualtyIds:[...report.downSquadIds],
  completedObjectiveIds:[...report.completedTaskIds],
  proofCount:report.completedTaskIds.length,
  narrative:"Reçu de terrain W3 : "+report.completedTaskIds.length+
    " objectif(s) constaté(s), "+report.downSquadIds.length+
    " formation(s) neutralisée(s) ; aucun effet de campagne V85.",
  timeline:report.turn,campaignCandidateTerritoryId:null,
  campaignMutation:false,requiresAuthorizedCampaignBridge:true,
 };
 return {debriefs:[debrief],rejectedIds:[]};
}
/** Combined, de-duplicated read model usable by both game screens.
 * Deterministic ordering is for readability, not a cross-game time clock. */
export function collectWarDebriefsV144(
 operations:WarOperationsStateV115,
 rts:WarRtsSquadsStateV133|null,
 rules:WarRulesV6,
):WarDebriefAuditV144 {
 const first=auditWarOperationsDebriefsV144(operations,rules);
 const second=rts?auditWarRtsDebriefV144(rts,rules):{debriefs:[],rejectedIds:[]};
 const debriefs=[...first.debriefs,...second.debriefs];
 const seen=new Set<string>();
 const merged:WarDebriefV144[]=[];
 const rejects=[...first.rejectedIds,...second.rejectedIds];
 for(const report of debriefs){
  if(seen.has(report.receiptKey)){rejects.push(report.receiptKey);continue;}
  seen.add(report.receiptKey);merged.push(report);
 }
 return {debriefs:merged,rejectedIds:rejects};
}
