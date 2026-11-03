import type {WarRulesV6} from "./clanWarBibleV6";
import type {WarOperationsStateV115} from "./clanWarOperationsV115";
import {readWarOperationsV115} from "./clanWarOperationsV115";
import type {WarRtsSquadsStateV133} from "./clanWarRtsSquadsV133";
import type {WarSimulationV85} from "./clanWarV85";
import {readWarSimulationV85,warTerritoriesForSimulationV96} from "./clanWarV85";
import {buildWarCouncilAuditV146,type WarCouncilModeV146} from "./clanWarCouncilAuditV146";

/**
 * V152 — read-only reconciliation gate for the latest V151 four-mode branch.
 * Source and game data are not film-canonical geographic coordinates or
 * server-authenticated match histories. The V85 army and world are NEVER
 * changed by this function; it grants no authority to write them.
 */
export type WarGeographyStatusV152=
 "no-id-match"|"id-conflict-unverified"|"id-name-region-match-unverified";
export interface WarTerritoryProvenanceV152 {
 sourceId:string;sourceName:string;sourceRegion:string;
 sourceGrid:{column:number;row:number};
 strategicId:string|null;strategicName:string|null;
 status:WarGeographyStatusV152;
 verifiedCoordinates:false;mayConquer:false;
}
export interface WarRosterProvenanceV152 {
 v115Teams:number;v115Members:number;v85Combatants:number;
 duplicateIdentifiers:string[];
 matchedPersons:0;mayTransferInjuries:false;mayTransferXp:false;
}
export interface WarDossierProvenanceV152 {
 receiptId:string;mode:WarCouncilModeV146;
 sourceType:"V115-exercise"|"W133-source-study";
 outcome:"victory"|"defeat"|"retreat";
 sourceTargetId:string;sourcePlanetId:string|null;
 sourceSha:string;
 sourceUnitIds:string[];casualtyCount:number;
 completedTaskIds:string[];
 auditStatus:"catalogue-consistent"|"partial-local-evidence";
 blockerCodes:string[];
 mayModifyV85:false;
 mayClaimFilmFidelity:false;
}
export interface WarProvenanceGateV152 {
 version:152;
 status:"no-source"|"source-invalid"|"world-incompatible"|"local-evidence-only";
 message:string;
 dossierCounts:Record<WarCouncilModeV146,number>;
 dossiers:WarDossierProvenanceV152[];
 territoryChecks:WarTerritoryProvenanceV152[];
 roster:WarRosterProvenanceV152;
 issues:string[];
 /** These flags are *always false* until a different, authorized backend
  * implements a signed mapping and serializable transaction. */
 canConquer:false;canTransferTroops:false;canAwardXp:false;
 canUpdateWounds:false;serverAuthenticated:false;
}
const blankRoster:WarRosterProvenanceV152={
 v115Teams:0,v115Members:0,v85Combatants:0,
 duplicateIdentifiers:[],matchedPersons:0,
 mayTransferInjuries:false,mayTransferXp:false,
};
const norm=(value:string)=>value.normalize("NFKC").trim().toLowerCase();
const emptyCounts=():Record<WarCouncilModeV146,number>=>({
 assault:0,outer:0,stealth:0,rts:0,
});
const empty=(status:WarProvenanceGateV152["status"],message:string):WarProvenanceGateV152=>({
 version:152,status,message,dossierCounts:emptyCounts(),
 dossiers:[],territoryChecks:[],roster:{...blankRoster,duplicateIdentifiers:[]},
 issues:[],canConquer:false,canTransferTroops:false,canAwardXp:false,
 canUpdateWounds:false,serverAuthenticated:false,
});
export function compareWarTerritoriesV152(
 rules:WarRulesV6,world:WarSimulationV85,
):WarTerritoryProvenanceV152[] {
 const destinations=warTerritoriesForSimulationV96(world);
 return rules.territories.map(source=>{
  // Never normalize W3-Kxx into CON-Txx or join by numeric suffix.
  const destination=destinations.find(t=>t.id===source.id);
  const namesMatch=destination&&norm(destination.name)===norm(source.name);
  const regionsMatch=destination&&norm(destination.region)===norm(source.region);
  const status:WarGeographyStatusV152=!destination?"no-id-match":
    namesMatch&&regionsMatch?"id-name-region-match-unverified":"id-conflict-unverified";
  return {sourceId:source.id,sourceName:source.name,sourceRegion:source.region,
   sourceGrid:{column:source.column,row:source.row},
   strategicId:destination?.id??null,strategicName:destination?.name??null,
   status,verifiedCoordinates:false,mayConquer:false};
 });
}
export function compareWarPersonIdentitiesV152(
 operations:WarOperationsStateV115|null,world:WarSimulationV85,
):WarRosterProvenanceV152 {
 const members=operations?.teams.flatMap(t=>t.members.map(m=>m.id))??[];
 const v85=new Set(world.combatants.map(a=>a.id));
 return {v115Teams:operations?.teams.length??0,
  v115Members:members.length,v85Combatants:world.combatants.length,
  duplicateIdentifiers:[...new Set(members.filter(id=>v85.has(id)))].sort(),
  matchedPersons:0,mayTransferInjuries:false,mayTransferXp:false};
}
export function reviewWarProvenanceV152(
 rawV115:string|null,
 world:WarSimulationV85,
 rules:WarRulesV6,
 w133:WarRtsSquadsStateV133|null=null,
):WarProvenanceGateV152 {
 if(!readWarSimulationV85(world))
  return empty("world-incompatible","V85 ne peut pas être relu : aucune correspondance permise.");
 if((world.planetId??"korthas")!=="korthas")
  return empty("world-incompatible","Les exercices W3 de Korthas ne peuvent attribuer un autre monde.");
 if((rawV115?.length??0)>450000)
  return empty("source-invalid","Archive source V115 trop volumineuse ; aucune lecture.");
 let ops:WarOperationsStateV115|null=null;
 if(rawV115){
  ops=readWarOperationsV115(rawV115,rules);
  if(!ops)return empty("source-invalid","Archive V115 incompatible avec la source V6 ; aucun dossier.");
 }
 if(!ops&&!w133)
  return empty("no-source","Aucune archive V115 ou étude RTS W133 à examiner.");
 const checked=buildWarCouncilAuditV146(ops,w133,rules);
 const results:WarDossierProvenanceV152[]=checked.dossiers.map(d=>{
  const blockers=[
   "NO_SIGNED_SERVER_MATCH",
   "NO_VERIFIED_GEOGRAPHIC_MAPPING",
   "NO_VALIDATED_CHARACTER_IDENTITY",
   "NO_FILM_ART_ASSET_QA",
   ...d.missingEvidence.map((_,i)=>"SOURCE_EVIDENCE_GAP_"+(i+1)),
  ];
  return {receiptId:d.id,mode:d.mode,sourceType:d.sourceType,
   outcome:d.outcome,sourceTargetId:d.targetId,sourcePlanetId:d.planetId,
   sourceSha:d.sourceSha,sourceUnitIds:[...d.unitIds],
   casualtyCount:d.casualtyIds.length,completedTaskIds:[...d.completedTaskIds],
   auditStatus:d.status==="source-checked"?"catalogue-consistent":"partial-local-evidence",
   blockerCodes:blockers,mayModifyV85:false,mayClaimFilmFidelity:false};
 });
 const issues=[...checked.issues];
 const counts=emptyCounts();
 for(const result of results)counts[result.mode]++;
 return {version:152,status:results.length?"local-evidence-only":"source-invalid",
  message:results.length?
   "Dossiers cohérents avec les sources locales. Aucune authenticité serveur ni conquête V85 démontrée.":
   "Aucun reçu qualifié par le Conseil : sources à corriger avant toute suite.",
  dossierCounts:counts,dossiers:results,
  territoryChecks:compareWarTerritoriesV152(rules,world),
  roster:compareWarPersonIdentitiesV152(ops,world),
  issues,canConquer:false,canTransferTroops:false,canAwardXp:false,
  canUpdateWounds:false,serverAuthenticated:false};
}
