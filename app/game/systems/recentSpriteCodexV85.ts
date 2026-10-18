import {RECENT_SPRITE_ASSETS_V85,normalizeRecentSpriteTextV85,type RecentSpriteSourceV85} from './recentSpriteLibraryV85';

export interface RecentSpriteCodexRecordV85 {
 readonly id:string;readonly label:string;readonly identityId:string;readonly source:RecentSpriteSourceV85;
 readonly historicalVariants:readonly string[];readonly constraints:readonly string[];
}
/** Reference catalogue for the V85 source viewer. Pixels have no implicit
 * body footprint, canonical map position, gameplay action or saved visit. */
const identityMembersV85=new Map<string,string[]>();
for(const asset of RECENT_SPRITE_ASSETS_V85){const members=identityMembersV85.get(asset.identityId)??[];members.push(asset.id);identityMembersV85.set(asset.identityId,members);}
export const RECENT_SPRITE_CODEX_V85:readonly RecentSpriteCodexRecordV85[]=RECENT_SPRITE_ASSETS_V85.map(asset=>({
 id:'sprite-source-v85:'+asset.id,label:asset.label,identityId:asset.identityId,source:asset,
 historicalVariants:(identityMembersV85.get(asset.identityId)??[]).filter(id=>id!==asset.id),
 constraints:[asset.sourceNote,
  ...(asset.sourceLimits??[]),
  `Groupe documenté ${asset.groupLabel} ; fonction ${asset.roleLabel} ; version ${asset.version}.`,
  `Pose source ${asset.pose} ; fichier ${asset.width} × ${asset.height}. Aucun cycle d’animation constitué par cette seule pose.`,
  ...(asset.fullBody===false&&['fauna','flora','synthetic','equipment'].includes(asset.kind)?['Portion de source à raccorder à un décor ; aucune créature, plante entière ou attache physique validée déduite de ce fragment.']:[]),
  ...(asset.kind==='equipment'?['Équipement isolé : cette image ne devient pas un nouveau personnage complet, rang ou objet gratuitement obtenu.']:[]),
  ...(asset.kind==='reference'?['Illustration ou planche historique : aucun corps de PNJ, sol praticable, collision ou cycle animé déduit de cette image.']:[]),
  ...(asset.nativeNature==='texture-source-reconstruction'?['Matériau reconstruit fourni : aucune extraction originale, correspondance UV, raccord sans couture, jeu PBR ou collection complète de variantes officielles certifiée.']:[]),
  ...(asset.bodyComposition==='rider-and-mount'||['chevaucheur','chevaucheurs'].includes(normalizeRecentSpriteTextV85(asset.role))?['Cavalier et monture assemblés dans le même PNG : leurs anatomies et leurs équipements restent distincts ; aucune séparation, échelle au sol ou marche individuelle validée déduite.']:[]),
  ...(asset.canonicalSubject?[`Sujet déclaré par le producteur : ${asset.canonicalSubject}${asset.canonicalState?' ; état '+asset.canonicalState:''}. Cette désignation conserve sa portée documentaire, sans certification 1:1.`]:[]),
  ...(asset.supersedesIdentityId?[`Correction documentaire de ${asset.supersedesIdentityId} ; le fichier précédent reste conservé.`]:[]),
  ...(asset.supersededByIdentityId?[`Version conservée, corrigée par ${asset.supersededByIdentityId}.`]:[]),
  'PNG natif conservé sans modification. Les versions antérieures restent accessibles, même si une version plus récente est préférée pour cette identité.',
  'Rôle, costume, âge, espèce et morphologie ne sont pas interchangeables ; une référence statique ne remplace pas les cellules natives de marche.',
  'Bibliothèque de références : un contrôle d’intégrité ou d’affichage ne certifie ni une animation, ni la fidélité canonique 1:1, ni un rôle physique dans la scène.',
 ],
}));
