import type {WarRulesV6} from "./clanWarBibleV6";
import {readWarOperationsV115} from "./clanWarOperationsV115";
import {auditWarOperationsDebriefsV144,type WarDebriefV144} from "./clanWarDebriefV144";
import {readWarSimulationV85,warTerritoryForSimulationV96,
 type WarSimulationV85,type WarUpdateV85} from "./clanWarV85";

/** V145 is a deliberately limited, opt-in local evidence register.
 * V115 and V85 are DIFFERENT free exercise rosters. No character identity
 * mapping, campaign conquest, XP, supplies, wounds or live server is implied.
 */
export const WAR_PROOF_MARKER_PREFIX_V145="clan-proof-v145:";
export interface WarProofOfferV145 {
 receiptKey:string;marker:string;
 mode:"assault"|"outer"|"stealth"|"rts";
 outcome:"victory"|"defeat"|"retreat";
 territoryId:string;territoryName:string;
 teamIds:string[];woundedCount:number;proofCount:number;
 alreadyImported:boolean;
}
export interface WarProofReviewV145 {
 eligible:WarProofOfferV145[];
 rejectedIds:string[];
 reason:string|null;
 sourceReportCount:number;
}
/** Raw bytes come from the existing V115 local archive; never deserialize
 * foreign storage as an unverified V85 game state.
 * Each exact report ID is reread by V144 before offering it.
 */
export function reviewWarProofSyncV145(
 raw:string,war:WarSimulationV85,rules:WarRulesV6,
):WarProofReviewV145{
 const empty=(reason:string):WarProofReviewV145=>({
  eligible:[],rejectedIds:[],reason,sourceReportCount:0,
 });
 if(typeof raw!=="string"||raw.length===0||raw.length>450000)
  return empty("Archive V115 absente ou trop volumineuse.");
 const operations=readWarOperationsV115(raw,rules);
 if(!operations)return empty("Archive V115 incompatible ; aucun reçu importé.");
 if(!readWarSimulationV85(war))
  return empty("Archive stratégique V85 invalide ; import interdit.");
 if((war.planetId??"korthas")!=="korthas")
  return empty("Un rapport Korthas V115 ne doit jamais être attribué à une autre planète.");
 const audit=auditWarOperationsDebriefsV144(operations,rules);
 const eligible:WarProofOfferV145[]=[],rejectedIds=[...audit.rejectedIds];
 for(const proof of audit.debriefs){
  if(proof.source!=="V115-EXERCISE"||!proof.campaignCandidateTerritoryId||
    typeof proof.territoryId!=="string"||
    proof.campaignCandidateTerritoryId!==proof.territoryId||
    proof.planetId!==null||proof.mapId!==null||
    proof.sourceSha!==rules.metadata.sha256||
    !warTerritoryForSimulationV96(war,proof.territoryId)||
    !war.territories[proof.territoryId]){
   rejectedIds.push(proof.receiptKey);continue;
  }
  const marker=WAR_PROOF_MARKER_PREFIX_V145+proof.receiptKey;
  if(marker.length>=180){rejectedIds.push(proof.receiptKey);continue;}
  eligible.push({
   receiptKey:proof.receiptKey,marker,mode:proof.mode,
   outcome:proof.outcome,
   territoryId:proof.territoryId,territoryName:proof.territoryName??proof.territoryId,
   teamIds:[...proof.teamIds],woundedCount:proof.casualtyIds.length,
   proofCount:proof.proofCount,
   alreadyImported:war.appliedResultIds.includes(marker)||
    war.reports.some(r=>r.id===marker),
  });
 }
 return {eligible,rejectedIds,reason:null,sourceReportCount:operations.reports.length};
}
const safeText=(text:string)=>text.replace(/\s+/g," ").trim().slice(0,220);

/**
 * Explicit selection, optimistic revision compare and idempotent V85 receipt.
 * CALLER must persist through createWarSessionV85.setSimulation with existing
 * archive fence; NEVER direct-write to localStorage here.
 */
export function importWarProofV145(
 war:WarSimulationV85,raw:string,receiptKey:string,
 expectedRevision:number,rules:WarRulesV6,
):WarUpdateV85 {
 const reject=(message:string):WarUpdateV85=>({state:war,accepted:false,message});
 if(!Number.isSafeInteger(expectedRevision)||war.revision!==expectedRevision)
  return reject("Révision V85 modifiée ; relisez le dossier avant l'import.");
 if(typeof receiptKey!=="string"||!/^V115:[A-Za-z0-9:_-]{1,150}$/.test(receiptKey))
  return reject("Identifiant de mission V115 non autorisé.");
 const review=reviewWarProofSyncV145(raw,war,rules);
 if(review.reason)return reject(review.reason);
 const offer=review.eligible.find(o=>o.receiptKey===receiptKey);
 if(!offer)return reject("Reçu non vérifié, monde incorrect ou source non appariée.");
 if(offer.alreadyImported)return reject("Reçu déjà archivé dans V85 : aucune deuxième récompense ni écriture.");
 if(war.revision>=1000000||war.reports.length>=99999||
   war.appliedResultIds.length>=99999)return reject("Limite du registre V85 atteinte.");
 const operations=readWarOperationsV115(raw,rules);
 if(!operations)return reject("L'archive V115 a changé avant confirmation.");
 const source:WarDebriefV144|undefined=auditWarOperationsDebriefsV144(operations,rules)
  .debriefs.find(p=>p.receiptKey===receiptKey);
 if(!source)return reject("Preuve de mission perdue avant confirmation.");
 const summary="Dossier libre V115 "+source.mode+" / "+source.outcome+
  " · "+source.territoryId+" · "+safeText(source.narrative)+
  " · "+source.teamIds.length+" formation(s), "+source.casualtyIds.length+
  " blessé(s) dans l'exercice d'origine. Aucune conquête ni XP attribuée.";
 const next:WarSimulationV85={
  ...war,revision:war.revision+1,
  appliedResultIds:[...war.appliedResultIds,offer.marker],
  reports:[...war.reports,{
   id:offer.marker,turn:war.turn,text:summary,
   sourceIds:["V115-EXERCISE","V144-DEBRIEF","V145-PROOF",
    source.sourceSha.slice(0,16),...source.teamIds.slice(0,4)],
  }],
 };
 if(!readWarSimulationV85(next))
  return reject("La sauvegarde V85 refuserait ce registre : aucune écriture effectuée.");
 return {state:next,accepted:true,message:
  "Preuve "+receiptKey+" archivée UNE fois dans le journal V85. "+
  "Aucun territoire, soldat, PV, stock, XP ni résultat de conquête modifié."};
}
