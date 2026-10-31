/** V134 : ateliers d'archives sur Homeworld. Les preuves viennent UNIQUEMENT
 * des parties réelles (mission, trophée et atelier), jamais du mode guerre libre.
 * Ces créations sont des RECONSTITUTIONS cosmétiques : aucun objet de film n'est
 * prétendument trouvé sur une autre planète. */
import { GAUNTLET_CATALOG_V132,gauntletByIdV132,gauntletUnlockedV132,
  DEFAULT_GAUNTLET_ID_V132,type HunterRankV132 } from "./clanWarGauntletCatalogV132.ts";
/** Structural read-only shape deliberately avoids importing the whole SaveGame graph
 * into the lightweight gauntlet UI checks and Node strip-types tests. */
export type GauntletMissionIdV134 =
  | "jungle-vey" | "ice-cryostalker" | "volcano-bad-blood" | "swamp-hydra"
  | "desert-sandmaw" | "ocean-leviathan" | "fungal-hivemind" | "ruins-ancient-guardian";

const MISSIONS: readonly GauntletMissionIdV134[]=[
  "jungle-vey","ice-cryostalker","volcano-bad-blood","swamp-hydra",
  "desert-sandmaw","ocean-leviathan","fungal-hivemind","ruins-ancient-guardian",
];
const QUALITY=["worthy","blooded","elite","flawless"] as const;
type TrophyQuality=typeof QUALITY[number];
export interface GauntletStudyV134 {
  id:string; name:string; missionId:GauntletMissionIdV134; completions:number;
  quality:TrophyQuality; minimumScans:number; workshop:boolean; rank:HunterRankV132;
  archiveContext:string;
}
export interface GauntletCampaignV134 {
  version:1;
  ownerCreatedAt:string;
  equippedId:string;
  /** Research completed only after verifying a real hunt + claiming at the armory. */
  claimedStudies:string[];
}
export interface GauntletCampaignEvidenceV134 {
  readonly createdAt:string;
  readonly profile:{readonly rankId:HunterRankV132};
  readonly missionProgress:Partial<Record<GauntletMissionIdV134,{readonly completions:number}>>;
  readonly trophies:readonly {readonly missionId:string;readonly quality:TrophyQuality;
    readonly workshop?:{readonly completedActions:readonly string[]}}[];
  readonly statistics:{readonly totalScans:number};
}
export type GauntletStudyResultV134={ok:boolean; missing:string[]; label:string; study:GauntletStudyV134|null};

function fingerprint(id:string):number{
  let value=2166136261;
  for(let i=0;i<id.length;i++) value=Math.imul(value^id.charCodeAt(i),16777619);
  return value>>>0;
}
function requiredRank(grade:number):HunterRankV132{
  return (["blooded","blooded","elite","elder"] as const)[grade];
}
export const GAUNTLET_STUDIES_V134:readonly GauntletStudyV134[]=Object.freeze(
  GAUNTLET_CATALOG_V132.filter(item=>item.unlock.startsWith("challenge:")).map(item=>{
    const h=fingerprint(item.id);
    const grade=h%4;
    return {
      id:item.id,name:item.name,missionId:MISSIONS[Math.floor(h/4)%MISSIONS.length],
      completions:grade>=3?2:1,
      quality:QUALITY[grade],minimumScans:(grade+1)*5,
      workshop:grade>=2,rank:requiredRank(grade),
      archiveContext:"Étude d'atelier Yautja sur Homeworld : reconstitution d'une identité visuelle, pas acquisition d'un véritable accessoire de film.",
    };
  })
);
const STUDY_BY_ID=new Map(GAUNTLET_STUDIES_V134.map(study=>[study.id,study]));
const RANK_INDEX:Readonly<Record<HunterRankV132,number>>={
  "young-blood":0,blooded:1,elite:2,elder:3,
};
export function gauntletStudyV134(id:string):GauntletStudyV134|undefined{return STUDY_BY_ID.get(id);}

export function evaluateGauntletStudyV134(save:GauntletCampaignEvidenceV134,id:string):GauntletStudyResultV134{
  const study=gauntletStudyV134(id);
  if(!study) return {ok:false,missing:["Aucun dossier de recherche correspondant."],label:"Dossier inconnu",study:null};
  const missing:string[]=[];
  const rank=save.profile.rankId;
  if(RANK_INDEX[rank]<RANK_INDEX[study.rank]) missing.push(`Rang ${study.rank} requis`);
  const progress=save.missionProgress[study.missionId];
  if(!progress||progress.completions<study.completions)
    missing.push(`${study.completions} mission(s) validée(s) : ${study.missionId}`);
  if(save.statistics.totalScans<study.minimumScans)
    missing.push(`Lectures de terrain : ${save.statistics.totalScans}/${study.minimumScans} scans`);
  const minimalQuality=QUALITY.indexOf(study.quality);
  const actualTrophies=save.trophies.filter(t=>t.missionId===study.missionId &&
    QUALITY.indexOf(t.quality)>=minimalQuality);
  if(!actualTrophies.length)missing.push(`Trophée de ${study.missionId} de qualité ${study.quality} ou supérieure`);
  if(study.workshop && !actualTrophies.some(t=>t.workshop?.completedActions?.includes("rite")))
    missing.push("Rite d'atelier accompli sur ce trophée, avec archive confirmée");
  return {ok:missing.length===0,missing,label:missing.length===0?"Étude admissible à l'armurerie":"Éléments encore à réunir",study};
}
export function emptyGauntletCampaignV134(ownerCreatedAt:string):GauntletCampaignV134{
  return {version:1,ownerCreatedAt,equippedId:DEFAULT_GAUNTLET_ID_V132,claimedStudies:[]};
}
export function normalizeGauntletCampaignV134(raw:unknown,ownerCreatedAt:string):GauntletCampaignV134|null{
  if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
  const v=raw as Record<string,unknown>;
  if(v.version!==1||v.ownerCreatedAt!==ownerCreatedAt
    ||typeof v.equippedId!=="string"||!gauntletByIdV132(v.equippedId)
    ||!Array.isArray(v.claimedStudies)||v.claimedStudies.length>GAUNTLET_STUDIES_V134.length)return null;
  const ids=new Set<string>();
  for(const id of v.claimedStudies){
    if(typeof id!=="string"||!STUDY_BY_ID.has(id)||ids.has(id))return null;
    ids.add(id);
  }
  return {version:1,ownerCreatedAt,equippedId:v.equippedId,claimedStudies:[...ids]};
}
export function gauntletCampaignEquipV134(save:GauntletCampaignEvidenceV134 & {gauntletV134?:GauntletCampaignV134|null},id:string):
  {ok:boolean;reason:string;archive:GauntletCampaignV134|null} {
  const archived=save.gauntletV134??emptyGauntletCampaignV134(save.createdAt);
  if(archived.ownerCreatedAt!==save.createdAt)return {ok:false,reason:"Archive d'un autre chasseur.",archive:null};
  if(!gauntletUnlockedV132(id,save.profile.rankId,archived.claimedStudies))
    return {ok:false,reason:"Gauntlet non débloqué par ce chasseur.",archive:null};
  return {ok:true,reason:"Gauntlet équipé (cosmétique seulement).",archive:{...archived,equippedId:id}};
}
export function gauntletCampaignClaimV134(save:GauntletCampaignEvidenceV134 & {gauntletV134?:GauntletCampaignV134|null},id:string):
  {ok:boolean;reason:string;archive:GauntletCampaignV134|null} {
  const archived=save.gauntletV134??emptyGauntletCampaignV134(save.createdAt);
  if(archived.ownerCreatedAt!==save.createdAt)return {ok:false,reason:"Archive d'un autre chasseur.",archive:null};
  if(archived.claimedStudies.includes(id)) return {ok:false,reason:"Dossier déjà validé : aucune deuxième récompense.",archive:null};
  const proof=evaluateGauntletStudyV134(save,id);
  if(!proof.ok)return {ok:false,reason:proof.missing.join(" · "),archive:null};
  return {ok:true,reason:"Reconstitution étudiée et ajoutée à l'armurerie.",archive:{
    ...archived,claimedStudies:[...archived.claimedStudies,id],
  }};
}
