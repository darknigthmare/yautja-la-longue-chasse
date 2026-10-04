import type {HomeworldElementRecordV64} from './homeworldElementCodexV64';
import {homeworldLevelV77} from './homeworldWorldV77';
import {HOMEWORLD_STREET_DECOR_ART_V83,HOMEWORLD_STREET_DECOR_PROPS_V83,HOMEWORLD_STREET_DECOR_CANDIDATES_V83,
 HOMEWORLD_STREET_DECOR_REFUSALS_V83,homeworldStreetDecorPolygonV83,homeworldStreetDecorUsageV83} from './homeworldStreetDecorV83';

/** Already placed world records must be appended AFTER the legacy placement
 * mapper. Rejected authoring candidates are separate non-world panels: no
 * invisible solid, service, navigation marker or fake mounted prop is added. */
const box=(polygon:readonly {x:number;y:number}[])=>({left:Math.min(...polygon.map(p=>p.x)),right:Math.max(...polygon.map(p=>p.x)),top:Math.min(...polygon.map(p=>p.y)),bottom:Math.max(...polygon.map(p=>p.y)),polygon});
const activeIds=new Set(HOMEWORLD_STREET_DECOR_PROPS_V83.map(p=>p.id));
export const HOMEWORLD_STREET_DECOR_CODEX_V83:readonly HomeworldElementRecordV64[]=[
 ...HOMEWORLD_STREET_DECOR_PROPS_V83.map(item=>{
  const art=HOMEWORLD_STREET_DECOR_ART_V83[item.artId],physical=box(homeworldStreetDecorPolygonV83(item)),usage=homeworldStreetDecorUsageV83(item);
  return{id:item.id,label:item.label,category:'prop' as const,districtId:item.districtId,spaceId:'world',
   position:{x:item.x,y:item.y,z:homeworldLevelV77(item.levelId).elevation},
   dimensions:{width:physical.right-physical.left,depth:physical.bottom-physical.top,height:art.heightWorld*item.scale},
   footprint:physical,door:null,lore:'original-adaptation' as const,asset:art.src,
   source:[{label:'Décor extérieur natif OpenAI V83',url:art.src,note:'SHA256 '+art.sha256+' ; '+art.metrology+'.'}],
   constraints:[item.purpose,
    'Famille '+art.family+' ; fonction '+art.function+' ; niveau '+item.levelId+' ; dessin observé '+art.facing+'.',
    'Contacts source, pivot et une échelle uniforme '+item.scale+' partagés par rendu/collision/codex ; aucune rotation ni miroir CSS.',
    usage?'Face d’usage native réservée : '+JSON.stringify(usage)+'.':'Décor de repos sans face de travail ; volume d’appui conservé.',
    'Marge sociale authored '+art.socialMargin+'u ; valeur descriptive non certifiée par QA. Hauteur indiquée = silhouette peinte, pas une mesure 3D canonique.',
    'Placement exact filtré à l’initialisation contre voies, portes, routines, autres volumes et appuis. Ce filtre runtime ne constitue pas un audit exécuté.',
    'Un dessin composite reste un seul sprite source ; les récipients/console/feu intégrés ne sont pas des sources séparées ni des animations.',
    'Objet décoratif solide, sans interaction, nouveau marchand, récompense, biome canonique ou symbole de clan officiel.',
    'V83 non vérifiée : accessibilité, densité visible, esthétique et lore1:1 non certifiés.']};
 }),
 ...HOMEWORLD_STREET_DECOR_CANDIDATES_V83.filter(item=>!activeIds.has(item.id)).map(item=>{
  const art=HOMEWORLD_STREET_DECOR_ART_V83[item.artId],refusal=HOMEWORLD_STREET_DECOR_REFUSALS_V83.find(r=>r.id===item.id);
  return{id:'authoring:'+item.id,label:'Candidat non monté · '+item.label,category:'panel' as const,districtId:item.districtId,spaceId:'authoring:street-v83',
   position:{x:item.x,y:item.y,z:homeworldLevelV77(item.levelId).elevation},dimensions:{width:0,depth:0,height:0},footprint:null,door:null,
   lore:'original-adaptation' as const,asset:art.src,source:[{label:'Source native conservée, placement non actif',url:art.src,note:'SHA256 '+art.sha256+'.'}],
   constraints:[item.purpose,'Candidat authored exact non rendu/non solide ; aucune recherche d’offset, réduction ou téléportation implicite.',
    'Décision runtime : '+(refusal?.reason??'placement non initialisé')+'. Cette fiche n’est pas une preuve QA ni un nouvel élément du monde.',
    'La source reste préchargée pour ses autres usages ; ce panneau ne prouve pas que ce candidat soit visible.']};
 }),
];
