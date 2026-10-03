import references from '../data/homeworldConceptRefsV77.json';
import type {HomeworldElementRecordV64} from './homeworldElementCodexV64';

/** Concept maps are evidence of the user's layout, never a world backdrop. */
export const HOMEWORLD_CONCEPT_REFS_V77=references;
export const HOMEWORLD_CONCEPT_CODEX_V77:readonly HomeworldElementRecordV64[]=references.map(reference=>({
  id:'concept-v77:'+reference.id,label:reference.label,category:'panel',districtId:'reference-city-world',
  spaceId:'reference:city-world-v77',position:{x:0,y:0,z:0},dimensions:{width:reference.width,depth:0,height:reference.height},
  footprint:null,door:null,lore:'original-adaptation',asset:reference.src,
  source:[{label:'Plan fourni · conversation source',url:reference.sourceShare,
    note:reference.sourceTurn+' ; SHA256 '+reference.sha256+' ; '+reference.status}],
  constraints:[
    'Carte conceptuelle originale du projet ; ni géographie officielle ni preuve d’une monarchie universelle Yautja.',
    'Dimensions en pixels source, pas une collision ni des dimensions physiques de la planète.',
    'Image conservée octet pour octet ; le jeu assemble des sols, bâtiments, supports et passages séparés.',
    'Cette carte n’est jamais utilisée comme fond monolithique du niveau ; les parcours utilisent la vraie topologie jouable.',
  ],
}));
