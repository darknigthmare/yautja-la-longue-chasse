import type {WarRulesV6,WarTerritoryV6} from "./clanWarBibleV6";
import type {WarOperationsStateV115,WarMissionReportV115} from "./clanWarOperationsV115";
import {readWarOperationsV115} from "./clanWarOperationsV115";
import type {WarSimulationV85} from "./clanWarV85";
import {readWarSimulationV85,warTerritoriesForSimulationV96} from "./clanWarV85";
import {auditWarOperationsDebriefsV144} from "./clanWarDebriefV144";
import {reviewWarProofSyncV145} from "./clanWarProofSyncV145";

/**
 * V146 source comparison is an AUDIT, not authority to modify an army.
 * Names, region tags and even matching IDs may be homonyms, not a proven
 * geographic/character link. Never auto-map W3-Kxx to CON-Txx by number.
 */
export interface WarSourceTerritoryAuditV146 {
 sourceId:string;sourceName:string;sourceRegion:string;
 sourceCell:{column:number;row:number};
 destinationId:string|null;destinationName:string|null;
 status:"unmapped"|"same-id-needs-evidence"|"conflicting-metadata";
 militaryLinkAuthorized:false;
}
export interface WarSourceRosterAuditV146 {
 sourceTeamCount:number;sourcePersonCount:number;
 strategyCombatantCount:number;
 exactPersonIdCollisions:string[];
 status:"separate-rosters";
 soldierTransferAuthorized:false;
}
export interface WarSourceProofV146 {
 receiptKey:string;mode:"assault"|"outer"|"stealth"|"rts";
 outcome:"victory"|"defeat"|"retreat";
 sourceTerritoryId:string;sourceTeamIds:string[];
 sourceFingerprint:string;
 sourceVersion:"V115";sourceSha:string;
 destinationTerritoryId:null;
 sourceTeamMappedToV85:false;
 documentaryOnly:true;
 documentaryAlreadyImported:boolean;
 documentaryCanImport:boolean;
 needsGeographicEvidence:true;
 needsIdentityEvidence:true;
}
export interface WarSourceAuditV146 {
 status:"source-unavailable"|"world-rejected"|"ready-documentary-only";
 message:string;
 territories:WarSourceTerritoryAuditV146[];
 roster:WarSourceRosterAuditV146;
 proofs:WarSourceProofV146[];
 rejectedIds:string[];
 allowTerritoryMutation:false;
 allowCasualtyMutation:false;
 allowXpOrStockMutation:false;
}
const clean=(s:string)=>s.normalize("NFKC").trim().toLocaleLowerCase("fr");
const hash=(value:string,seed:number)=>{
 let n=seed>>>0;
 for(let i=0;i<value.length;i++)n=Math.imul(n^value.charCodeAt(i),16777619)>>>0;
 return n.toString(16).padStart(8,"0");
};
/** Stable local comparison token, NOT a cryptographic signature or a
 * server-authorized statement about a canon event. */
export function warSourceReceiptFingerprintV146(
 report:WarMissionReportV115,sourceSha:string,
):string {
 const data=JSON.stringify([
  "V146-EVIDENCE",sourceSha,report.id,report.mode,report.focus,
  report.targetId,report.outcome,report.clock,report.teamIds,
  report.woundedIds,report.sourceIds,report.summary,report.engagementLog??[],
 ]);
 return [2166136261,0x9e3779b9,0x85ebca6b,0xc2b2ae35].map(seed=>hash(data,seed)).join("");
}
const emptyRoster:WarSourceRosterAuditV146={
 sourceTeamCount:0,sourcePersonCount:0,strategyCombatantCount:0,
 exactPersonIdCollisions:[],status:"separate-rosters",
 soldierTransferAuthorized:false,
};
export function auditWarTerritorySourcesV146(
 rules:WarRulesV6,war:WarSimulationV85,
):WarSourceTerritoryAuditV146[] {
 const destinations=warTerritoriesForSimulationV96(war);
 return rules.territories.map((source:WarTerritoryV6)=>{
  const matching=destinations.find(t=>t.id===source.id);
  const sameMetadata=matching&&clean(source.name)===clean(matching.name)&&
   clean(source.region)===clean(matching.region);
  return {
   sourceId:source.id,sourceName:source.name,sourceRegion:source.region,
   sourceCell:{column:source.column,row:source.row},
   destinationId:matching?.id??null,destinationName:matching?.name??null,
   status:!matching?"unmapped":
     sameMetadata?"same-id-needs-evidence":"conflicting-metadata",
   militaryLinkAuthorized:false,
  };
 });
}
export function auditWarRosterSourcesV146(
 operations:WarOperationsStateV115,war:WarSimulationV85,
):WarSourceRosterAuditV146 {
 const people=operations.teams.flatMap(team=>team.members.map(member=>member.id));
 const ids=new Set(war.combatants.map(actor=>actor.id));
 return {sourceTeamCount:operations.teams.length,
  sourcePersonCount:people.length,strategyCombatantCount:war.combatants.length,
  exactPersonIdCollisions:[...new Set(people.filter(id=>ids.has(id)))].sort(),
  status:"separate-rosters",soldierTransferAuthorized:false};
}
export function inspectWarSourcesV146(
 raw:string,war:WarSimulationV85,rules:WarRulesV6,
):WarSourceAuditV146 {
 const skeleton=(status:WarSourceAuditV146["status"],message:string):WarSourceAuditV146=>({
  status,message,territories:[],roster:emptyRoster,proofs:[],
  rejectedIds:[],allowTerritoryMutation:false,allowCasualtyMutation:false,
  allowXpOrStockMutation:false,
 });
 if(!readWarSimulationV85(war))return skeleton("world-rejected","Archive V85 invalide, aucune liaison possible.");
 if((war.planetId??"korthas")!=="korthas")
  return skeleton("world-rejected","Les rapports Korthas ne sont pas des rapports d'une autre planète.");
 if(typeof raw!=="string"||!raw||raw.length>450000)
  return skeleton("source-unavailable","Archive V115 absente ou trop volumineuse.");
 const ops=readWarOperationsV115(raw,rules);
 if(!ops)return skeleton("source-unavailable","Archive V115 étrangère, future ou corrompue.");
 const review=reviewWarProofSyncV145(raw,war,rules);
 if(review.reason)return skeleton("source-unavailable",review.reason);
 const audited=auditWarOperationsDebriefsV144(ops,rules);
 const known=new Map(ops.reports.map(report=>["V115:"+report.id,report] as const));
 const proofs:WarSourceProofV146[]=[];
 const rejectedIds=[...review.rejectedIds];
 for(const offer of review.eligible){
  const source=known.get(offer.receiptKey);
  if(!source){rejectedIds.push(offer.receiptKey);continue;}
  // Every mode remains an original GAME exercise; historical matches in
  // a text-only journal do not grant the right to command Korthas troops.
  proofs.push({
   receiptKey:offer.receiptKey,mode:offer.mode,outcome:offer.outcome,
   sourceTerritoryId:offer.territoryId,
   sourceTeamIds:[...offer.teamIds],
   sourceFingerprint:warSourceReceiptFingerprintV146(source,ops.sourceSha),
   sourceVersion:"V115",sourceSha:ops.sourceSha,
   destinationTerritoryId:null,sourceTeamMappedToV85:false,
   documentaryOnly:true,documentaryAlreadyImported:offer.alreadyImported,
   documentaryCanImport:!offer.alreadyImported,
   needsGeographicEvidence:true,needsIdentityEvidence:true,
  });
 }
 return {status:"ready-documentary-only",
  message:"Analyse des quatre modes terminée : journal documentaire possible, sans autorité militaire V85.",
  territories:auditWarTerritorySourcesV146(rules,war),
  roster:auditWarRosterSourcesV146(ops,war),
  proofs,rejectedIds:[
   ...new Set([...rejectedIds,...audited.rejectedIds]),
  ],allowTerritoryMutation:false,allowCasualtyMutation:false,
  allowXpOrStockMutation:false};
}
