import authored from '../data/homeworldStreetCompositionsV92.json';
import type {HomeworldElementRecordV64} from './homeworldElementCodexV64';
import {homeworldLevelV77} from './homeworldWorldV77';
import {HOMEWORLD_STREET_COMPOSITION_ART_V92,homeworldStreetCompositionPolygonV92,homeworldStreetCompositionUsageV92,homeworldStreetCompositionSafetyV92} from './homeworldStreetCompositionV92';
import {HOMEWORLD_STREET_COMPOSITION_PROPS_V92,HOMEWORLD_STREET_COMPOSITION_REFUSALS_V92} from './homeworldStreetCompositionMountV92';

type RecordV92=HomeworldElementRecordV64&{associatedElementIds:readonly string[]};
const base={districtId:'authoring',spaceId:'world',position:{x:0,y:0,z:0},dimensions:{width:0,depth:0,height:0},footprint:null,door:null,
 lore:'original-adaptation' as const,source:[],constraints:[],asset:null,associatedElementIds:[]};
/** The UI reads these actual admitted placements. Composition panels describe
 * related objects, never a new rectangular floor, collider, service or unlock. */
export const HOMEWORLD_STREET_COMPOSITION_CODEX_V92:readonly RecordV92[]=[
 ...authored.compositions.flatMap(composition=>{
  const members=HOMEWORLD_STREET_COMPOSITION_PROPS_V92.filter(item=>item.compositionId===composition.id);if(!members.length)return[];
  const anchor=members[0],buildingIds=[...new Set(members.flatMap(item=>item.buildingId?[item.buildingId]:[]))];
  return[{...base,id:'composition-v92:'+composition.id,label:composition.label,category:'panel' as const,districtId:anchor.districtId,
   position:{x:anchor.x,y:anchor.y,z:homeworldLevelV77(anchor.levelId).elevation},
   associatedElementIds:[...members.map(item=>item.id),...buildingIds,`district:${anchor.districtId}`],
   constraints:[composition.detail,
    `Composition ${composition.id}, niveau ${anchor.levelId} ; ${members.length} objet(s) indépendant(s), associés à leurs véritables empreintes.`,
    'La position de cette fiche est un repère documentaire sur un meuble, pas un point d’arrivée joueur. Aucune superficie ou collision de groupe fictive.',
    'Mobilier civil du jeu et végétation cultivée originaux, sans institution, espèce ou architecture canonique affirmée.',
    'Corps, portes, rues, accès régionaux et sauvegardes existants conservés. Les suites de modèle ne constituent pas un audit esthétique ou une visite publique.']}];
 }),
 ...HOMEWORLD_STREET_COMPOSITION_PROPS_V92.map(item=>{
  const art=HOMEWORLD_STREET_COMPOSITION_ART_V92[item.artId],polygon=homeworldStreetCompositionPolygonV92(item);
  const left=Math.min(...polygon.map(p=>p.x)),right=Math.max(...polygon.map(p=>p.x)),top=Math.min(...polygon.map(p=>p.y)),bottom=Math.max(...polygon.map(p=>p.y));
  const usage=homeworldStreetCompositionUsageV92(item),safety=homeworldStreetCompositionSafetyV92(item);
  return{...base,id:item.id,label:item.label,category:'prop' as const,districtId:item.districtId,
   position:{x:item.x,y:item.y,z:homeworldLevelV77(item.levelId).elevation},
   dimensions:{width:right-left,depth:bottom-top,height:art.heightWorld*item.scale},footprint:{left,right,top,bottom,polygon},asset:art.src,
   associatedElementIds:['composition-v92:'+item.compositionId,...(item.buildingId?[item.buildingId,'door:'+item.buildingId]:[])],
   source:[{label:'PNG individuel original V83/V84 réutilisé',url:art.src,note:`SHA256 ${art.sha256} ; ${art.metrology}.`}],
   constraints:[item.purpose,`Face native ${art.facing}, pivot (${art.pivot.x},${art.pivot.y}), échelle uniforme ×${item.scale}.`,
    'Le vrai hull de contact déprojeté une fois est partagé par collision, rendu et codex ; aucun miroir ou rotation CSS ne fabrique un nouvel angle.',
    usage?'Face de travail laissée ouverte : '+JSON.stringify(usage)+'. Réserve de placement, sans opérateur ou interaction inventé.':'Décor sans nouvelle face de travail.',
    safety?'Réserve chaude non solide : '+JSON.stringify(safety)+'.':'Aucune réserve chaude.',
    'Sources, compositions V81/V83/V84, seuils, pad, navette, spawns et parcours PNJ préservés ; une façade qui cache le meuble entraîne son refus.',
    'Objet statique original compatible avec le plateau volcanique du jeu ; ni fidélité canonique 1:1, ni animation ou nouveau service certifiés.']};
 }),
 ...HOMEWORLD_STREET_COMPOSITION_REFUSALS_V92.map(refusal=>({...base,id:'authoring:'+refusal.id,label:'Placement non monté · '+refusal.id,category:'panel' as const,spaceId:'authoring:composition-v92',constraints:['Refus runtime : '+refusal.reason+'. Aucun solide ou dessin créé.']})),
];
