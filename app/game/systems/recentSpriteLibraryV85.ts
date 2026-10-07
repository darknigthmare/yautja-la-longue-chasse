import source from '../data/recentSpriteLibraryV85.json';
import driveLatest from '../data/driveLatestSpritesV85.json';
import badlandsLatest from '../data/badlandsLatestSpritesV85.json';
import approvedHunters from '../data/recentApprovedHuntersV85.json';
import npcMetadata from '../data/recentNpcSourceMetadataV85.json';

export type RecentSpriteKindV85='npc'|'fauna'|'flora'|'synthetic'|'texture'|'ship'|'equipment';
export interface RecentSpriteSourceV85 {
 readonly id:string;readonly identityId:string;readonly label:string;readonly packId:string;readonly packLabel:string;
 readonly version:string;readonly priority:number;readonly preferredVersion:boolean;readonly kind:RecentSpriteKindV85;
 readonly groupId:string;readonly groupLabel:string;readonly role:string;readonly roleLabel:string;readonly lifeStage:string;
 readonly regionId:string;readonly morphotypeId:string;readonly masked:string;readonly src:string;
 readonly width:number;readonly height:number;readonly bytes:number;readonly sha256:string;readonly sourceArchive:string;
 readonly insideArchive:string|null;readonly sourcePath:string;readonly sourceStatus:string;readonly producerStatus:string;
 readonly pose:string;readonly motionStatus:'single-pose-static';readonly canonicalFidelity:'not-certified-1-to-1';readonly sourceNote:string;
 readonly supersedesIdentityId:string;readonly supersededByIdentityId:string;
 readonly canonicalSubject?:string|null;readonly canonicalState?:string|null;readonly fullBody?:boolean|null;
}
/** Original imported pixels and their historical versions. This registry never
 * starts a pack script, grants a reward, swaps a costume or synthesizes frames. */
export interface DriveLatestSpriteEntryV85 {
 readonly id:string;readonly label:string;readonly src:string;readonly width:number;readonly height:number;readonly sha256:string;readonly bytes:number;
 readonly kind:RecentSpriteKindV85;readonly groupId:string;readonly groupLabel?:string;readonly role?:string;
 readonly sourceArchive:string;readonly sourcePath:string;readonly sourceStatus:string;readonly producerStatus?:string;
 readonly sourceNote?:string;readonly preferredVersion?:boolean;
 readonly identityId?:string;readonly packId?:string;readonly packLabel?:string;readonly version?:string;readonly priority?:number;
 readonly pose?:string;readonly supersedesIdentityId?:string;readonly supersededByIdentityId?:string;
 readonly canonicalSubject?:string|null;readonly canonicalState?:string|null;readonly fullBody?:boolean|null;
}
const normalizeDriveEntryV85=(asset:DriveLatestSpriteEntryV85):RecentSpriteSourceV85=>({
 ...asset,identityId:asset.identityId??asset.id,packId:asset.packId??'drive-latest',packLabel:asset.packLabel??'Derniers fichiers Drive · 7 octobre',version:asset.version??'2026-10-07',priority:asset.priority??85,
 preferredVersion:!/reject|attempt|provis|pending|essai|brouillon/i.test(`${asset.sourceStatus} ${asset.producerStatus??''}`)&&(asset.preferredVersion??true),
 groupLabel:asset.groupLabel??asset.groupId,role:asset.role??'',roleLabel:asset.role??'',lifeStage:'',regionId:'',morphotypeId:'',masked:'',insideArchive:null,
 producerStatus:asset.producerStatus??'',pose:asset.pose??'Source native statique',motionStatus:'single-pose-static',canonicalFidelity:'not-certified-1-to-1',
 sourceNote:asset.sourceNote??'Fichier fourni récent ; statut de la source conservé et fidélité 1:1 non certifiée.',supersedesIdentityId:asset.supersedesIdentityId??'',supersededByIdentityId:asset.supersededByIdentityId??'',
});
const driveEntriesV85=(driveLatest.assets as readonly DriveLatestSpriteEntryV85[]).map(normalizeDriveEntryV85);
const badlandsEntriesV85=(badlandsLatest.assets as readonly DriveLatestSpriteEntryV85[]).map(normalizeDriveEntryV85);
const approvedHunterEntriesV85=(approvedHunters.assets as readonly DriveLatestSpriteEntryV85[]).map(normalizeDriveEntryV85);
const supersededBadlandsV85=new Map<string,string>();
for(const asset of badlandsEntriesV85)if(asset.supersedesIdentityId)supersededBadlandsV85.set(asset.supersedesIdentityId,asset.identityId);
for(const note of badlandsLatest.sourceCorrectionNotes as readonly {id:number;fields?:{superseded_by_asset_id?:number;morphology_corrected_by_asset_id?:number}}[]){
 const replacement=note.fields?.superseded_by_asset_id??note.fields?.morphology_corrected_by_asset_id;
 if(replacement)supersededBadlandsV85.set('badlands-'+note.id,'badlands-'+replacement);
}
/** Corrections change only reference preference. Superseded files retain their
 * source ID, pixels and catalogue entry, without a body or animation override. */
export const RECENT_SPRITE_ASSETS_V85:readonly RecentSpriteSourceV85[]=[...source.assets as readonly RecentSpriteSourceV85[],...driveEntriesV85,...badlandsEntriesV85,...approvedHunterEntriesV85].map(asset=>{
 const replacement=supersededBadlandsV85.get(asset.identityId);return replacement?{...asset,preferredVersion:false,supersededByIdentityId:replacement}:asset;
});
export const RECENT_SPRITE_LIBRARY_V85={...source,assets:RECENT_SPRITE_ASSETS_V85,
 packs:[...source.packs,{id:'drive-latest',label:'Derniers fichiers Drive · 7 octobre',version:'2026-10-07',priority:85,archive:'Fichiers Drive reçus individuellement',insideArchive:null,sha256:'',pngEntriesImported:driveEntriesV85.length,recordEntries:0,status:'source-import-authored-no-qa'},
  {id:'badlands-latest',label:'Badlands · ajouts V8 à V13',version:'V8–V13',priority:93,archive:'Six lots d’ajouts Drive',insideArchive:null,sha256:'',pngEntriesImported:badlandsEntriesV85.length,recordEntries:6,status:'source-import-authored-no-qa'},
  {id:'approved-hunters',label:'Portraits Yautja · sources récentes',version:'V14 / Wolf V1 profil V2',priority:94,archive:'Drive · dossier images validées PHG',insideArchive:null,sha256:'',pngEntriesImported:approvedHunterEntriesV85.length,recordEntries:7,status:'source-import-authored-no-qa'}]};
export const RECENT_SPRITE_PREFERRED_V85=RECENT_SPRITE_ASSETS_V85.filter(asset=>asset.preferredVersion);
export const RECENT_SPRITE_GROUPS_V85=source.groups;
export const RECENT_NPC_SOURCE_METADATA_V85=npcMetadata;
export const RECENT_NPC_SOURCE_ROLES_V85=npcMetadata.sourceRoles;
/** A producer metadata record does not prove its referenced PNG is installed.
 * The missing V84 pixels stay distinct from the imported native asset registry. */
export function documentedRecentNpcVariantV85(role:string,slot:number){
 const variant=npcMetadata.sourceVariants.find(item=>item.role===role&&item.slot===slot);
 return variant?{variant,sourceArchive:npcMetadata.sourceArchive,status:'metadata-only-pixels-not-in-archive' as const,availableForRender:false as const}:null;
}
export const RECENT_SPRITE_KINDS_V85:readonly {id:RecentSpriteKindV85;label:string}[]=[
 {id:'npc',label:'Personnages et cavaliers'},{id:'fauna',label:'Faune'},{id:'flora',label:'Flore'},
 {id:'synthetic',label:'Synthétiques'},{id:'texture',label:'Matériaux Hunting Grounds'},
 {id:'ship',label:'Coques et vaisseaux'},
 {id:'equipment',label:'Équipements et portions isolées'},
];
export const recentSpriteByIdV85=(id:string)=>RECENT_SPRITE_ASSETS_V85.find(asset=>asset.id===id)??null;
export const recentSpriteVariantsV85=(identityId:string)=>RECENT_SPRITE_ASSETS_V85.filter(asset=>asset.identityId===identityId);
export const normalizeRecentSpriteTextV85=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').replace(/[^a-z0-9]+/g,' ').trim();

const aliases:Readonly<Record<string,readonly string[]>>={
 patrouille:['patrouille','patrouilleur'],
 pisteur:['pisteur','traqueur','tracker'],
 tireur:['tireur','sniper','gunner','artilleur'],
 sapeur:['sapeur','sapper','demolisseur','demolition'],
 soigneur:['soigneur','soigneuse','soin','soins','healer','medic'],
 porteur:['porteur','porteuse','porter','convoyeur','convoyeuse','ravitailleur','ravitaillement','transport'],
};
export interface ImportedYautjaArtV85 {
 readonly portraitUrl:string;readonly spriteUrl:string;readonly assetId:string;readonly source:string;
 readonly label:string;readonly groupId:string;readonly role:string;readonly match:'documented-name'|'documented-role'|'documented-clan';
 readonly motionStatus:'single-pose-static';
}

/** Match only catalogue identities. A named person needs their documented name;
 * a requested role needs a documented role/occupation in the same exact clan.
 * If absent, return null rather than assign an unrelated portrait or lineage. */
export interface ImportedYautjaArtQueryV85 {readonly clanName?:string;readonly role?:string;readonly name?:string;readonly identityId?:string;readonly assetId?:string;readonly includeHistorical?:boolean}
/** Historical choices remain explicit: no older PNG is deleted and a chosen
 * identity can never fall back to another costume, clan or named person. */
export function importedYautjaArtVariantsV85({clanName,role,name,identityId,assetId,includeHistorical=false}:ImportedYautjaArtQueryV85):readonly RecentSpriteSourceV85[]{
 const clan=clanName?normalizeRecentSpriteTextV85(clanName):'',person=name?normalizeRecentSpriteTextV85(name):'',requested=role?normalizeRecentSpriteTextV85(role):'';
 if(!clan&&!person&&!requested&&!identityId&&!assetId)return[];
 const roleTerms=aliases[requested]??(requested?[requested]:[]);
 const candidates=RECENT_SPRITE_ASSETS_V85.filter(asset=>asset.kind==='npc'&&(includeHistorical||asset.preferredVersion)
  &&(!identityId||asset.identityId===identityId)&&(!assetId||asset.id===assetId)
  &&(!clan||normalizeRecentSpriteTextV85(asset.groupLabel)===clan||normalizeRecentSpriteTextV85(asset.groupId)===clan)
  &&(!person||normalizeRecentSpriteTextV85(asset.label)===person));
 const scored=candidates.map(asset=>{
  // A clan's name or a display label never establishes a person's job.
  // Whole normalized words also prevent a partial term borrowing another role.
  const text=` ${normalizeRecentSpriteTextV85(`${asset.role} ${asset.roleLabel}`)} `,score=roleTerms.reduce((best,term)=>Math.max(best,text.includes(` ${normalizeRecentSpriteTextV85(term)} `)?term===requested?3:2:0),0);
  return{asset,score};
 }).filter(row=>!requested||row.score>0).sort((a,b)=>b.score-a.score||b.asset.priority-a.asset.priority||a.asset.id.localeCompare(b.asset.id));
 return scored.map(row=>row.asset);
}
export function findImportedYautjaArtV85(query:ImportedYautjaArtQueryV85):ImportedYautjaArtV85|null{
 const asset=importedYautjaArtVariantsV85(query)[0];if(!asset)return null;
 return{portraitUrl:asset.src,spriteUrl:asset.src,assetId:asset.id,source:`${asset.sourceArchive}${asset.insideArchive?' → '+asset.insideArchive:''} · ${asset.sourcePath}`,
  label:asset.label,groupId:asset.groupId,role:asset.role,match:query.name||query.identityId||query.assetId?'documented-name':query.role?'documented-role':'documented-clan',motionStatus:'single-pose-static'};
}

/** Exact known Badlands catalogue labels provide additional static references.
 * An adult, juvenile and a different costume stay separate source identities.
 * No combat collider, spawn, companion ability or animation is changed here. */
const faunaNames:Readonly<Record<string,readonly string[]>>={
 kalisk:['kalisk adulte'],bud:['bud juvenile'], 'bone-bison':['bone bison'],vulture:['vulture volant'],
 'luna-bug':['luna bug'], 'spray-snake':['spray snake'],'exploding-worm':['exploding worm'],squirt:['squirt'],
};
export function recentFaunaVariantsV85(speciesId:string):readonly RecentSpriteSourceV85[]{
 const names=faunaNames[speciesId];if(!names)return[];
 return RECENT_SPRITE_ASSETS_V85.filter(asset=>asset.packId.startsWith('badlands')&&asset.kind==='fauna'
  &&names.some(name=>normalizeRecentSpriteTextV85(asset.label).startsWith(name)));
}
