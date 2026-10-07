import type {HomeworldElementRecordV64} from './homeworldElementCodexV64';
import {homeworldLevelV77} from './homeworldWorldV77';
import {HOMEWORLD_STREET_DECOR_ART_V84,HOMEWORLD_STREET_DECOR_CANDIDATES_V84,
 homeworldStreetDecorPolygonV84,homeworldStreetDecorUsageV84,homeworldStreetDecorSafetyV84} from './homeworldStreetDecorV84';
import {HOMEWORLD_STREET_DECOR_PROPS_V84,HOMEWORLD_STREET_DECOR_REFUSALS_V84} from './homeworldStreetDecorMountV84';

type StreetRecordV84=HomeworldElementRecordV64&{associatedElementIds:readonly string[]};
const box=(polygon:readonly {x:number;y:number}[])=>({left:Math.min(...polygon.map(p=>p.x)),right:Math.max(...polygon.map(p=>p.x)),top:Math.min(...polygon.map(p=>p.y)),bottom:Math.max(...polygon.map(p=>p.y)),polygon});
const activeIds=new Set(HOMEWORLD_STREET_DECOR_PROPS_V84.map(item=>item.id));

/** Mount is evaluated before these read-only records. Accepted props retain
 * world coordinates and elevation; refused candidates have no world footprint.
 * Append after legacy placement mappers so the Port is not translated twice. */
export const HOMEWORLD_STREET_DECOR_CODEX_V84:readonly StreetRecordV84[]=[
 ...HOMEWORLD_STREET_DECOR_PROPS_V84.map(item=>{
  const art=HOMEWORLD_STREET_DECOR_ART_V84[item.artId],physical=box(homeworldStreetDecorPolygonV84(item)),usage=homeworldStreetDecorUsageV84(item),safety=homeworldStreetDecorSafetyV84(item);
  return{id:item.id,label:item.label,category:'prop' as const,districtId:item.districtId,spaceId:'world',
   position:{x:item.x,y:item.y,z:homeworldLevelV77(item.levelId).elevation},
   dimensions:{width:physical.right-physical.left,depth:physical.bottom-physical.top,height:art.heightWorld*item.scale},
   footprint:physical,door:null,lore:'original-adaptation' as const,asset:art.src,
   associatedElementIds:[`district:${item.districtId}`,...(item.buildingId?[item.buildingId,`assembly-v71:${item.buildingId}`,`door:${item.buildingId}`]:[])],
   source:[{label:'Décor extérieur natif OpenAI V84',url:art.src,note:`SHA256 ${art.sha256} ; source ${art.sourceWidth} × ${art.sourceHeight} ; ${art.metrology}.`}],
   constraints:[item.purpose,
    `Famille ${art.family} ; fonction ${art.function} ; niveau ${item.levelId} ; face peinte ${art.facing}.`,
    `Pivot source ${JSON.stringify(art.pivot)}, hull de contact ${JSON.stringify(art.nativeGroundSupport)}, échelle uniforme ×${item.scale} partagés par rendu, collision et codex.`,
    'Appuis déprojetés une fois ; pixels sources conservés, sans rotation, miroir, déformation ni remplacement des décors historiques.',
    usage?`Bande de travail réservée ${JSON.stringify(usage)} ; intention d’usage sans nouvel opérateur, service ou animation.`:'Aucune face de travail ou interaction ajoutée à ce foyer.',
    safety?`Réserve chaude authored ${art.safetyMargin} u : ${JSON.stringify(safety)}. Elle protège le placement et ne crée pas un mur invisible.`:'Aucune réserve chaude supplémentaire pour cette source.',
    `Marge sociale authored ${art.socialMargin} u, descriptive et non certifiée. Hauteur = silhouette peinte, pas dimension canonique ou métrologie 3D.`,
    'Placement exact sélectionné par la politique runtime après compilation des décors existants ; un candidat refusé ne devient ni solide ni visible.',
    'Un PNG composite reste une seule source indépendante ; accessoires fusionnés et flamme peinte ne constituent pas de sprites ou animations supplémentaires.',
    'Objet environnemental statique et solide, sans nouveau rang, récompense, arme canonique, symbole officiel ou interaction.',
    'V84 implémentée, non vérifiée : aucun test, audit, compilation locale de validation, examen navigateur ou nombre visible certifié.']};
 }),
 ...HOMEWORLD_STREET_DECOR_CANDIDATES_V84.filter(item=>!activeIds.has(item.id)).map(item=>{
  const art=HOMEWORLD_STREET_DECOR_ART_V84[item.artId],refusal=HOMEWORLD_STREET_DECOR_REFUSALS_V84.find(record=>record.id===item.id);
  return{id:'authoring:'+item.id,label:'Candidat non monté · '+item.label,category:'panel' as const,districtId:item.districtId,spaceId:'authoring:street-v84',
   position:{x:item.x,y:item.y,z:homeworldLevelV77(item.levelId).elevation},dimensions:{width:0,depth:0,height:0},footprint:null,door:null,
   lore:'original-adaptation' as const,asset:art.src,associatedElementIds:[`district:${item.districtId}`],
   source:[{label:'Source native V84 conservée, placement non actif',url:art.src,note:'SHA256 '+art.sha256+'.'}],
   constraints:[item.purpose,
    'Candidat authored exact conservé dans le registre ; aucun dessin, bloqueur, nouveau service ou repère de navigation créé par cette fiche.',
    'Décision runtime : '+(refusal?.reason??'placement non initialisé')+'. Ce résultat est une politique du jeu, pas une QA exécutée.',
    'Aucun décalage recherché, réduction d’échelle, téléportation ou déplacement d’un meuble historique pour forcer le montage.',
    'La source peut être utilisée ailleurs et préchargée ; cette fiche ne certifie pas que ce candidat soit visible.']};
 }),
];
