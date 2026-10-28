import type {HomeworldElementRecordV64} from './homeworldElementCodexV64';
import {HOMEWORLD_BUILDINGS_V77,HOMEWORLD_GROUND_V77,homeworldLevelV77} from './homeworldWorldV77';
import {HOMEWORLD_PUBLIC_PLACES_V112,HOMEWORLD_PUBLIC_PLACE_REFUSALS_V112} from './homeworldPublicPlacesMountV112';
import {HOMEWORLD_PUBLIC_PLACE_ART_V112,HOMEWORLD_PUBLIC_PLACE_COMPOSITIONS_V112,
  homeworldPublicPlacePolygonV112,homeworldPublicPlaceUsageV112} from './homeworldPublicPlacesV112';
import {HOMEWORLD_FOUNDATION_JOINT_LIP_V112,HOMEWORLD_FOUNDATION_LIP_V112} from './homeworldFoundationSupportsV112';

type RecordV112=HomeworldElementRecordV64&{associatedElementIds:readonly string[]};
const base={spaceId:'world',districtId:'authoring',position:{x:0,y:0,z:0},dimensions:{width:0,depth:0,height:0},
  footprint:null,door:null,lore:'original-adaptation' as const,source:[],constraints:[],asset:null,associatedElementIds:[]};
const bounds=(polygon:readonly {x:number;y:number}[])=>({
  left:Math.min(...polygon.map(point=>point.x)),right:Math.max(...polygon.map(point=>point.x)),
  top:Math.min(...polygon.map(point=>point.y)),bottom:Math.max(...polygon.map(point=>point.y)),polygon,
});

/** Actual support and admitted furniture, including explicit unmounted author
 * proposals. A record never creates a floor, service or campaign destination. */
export const HOMEWORLD_SPATIAL_CODEX_V112:readonly RecordV112[]=[
  ...HOMEWORLD_GROUND_V77.filter(ground=>ground.id.startsWith('foundation-v112:')).map(ground=>{
    const building=HOMEWORLD_BUILDINGS_V77.find(item=>'foundation-v112:'+item.id===ground.id)!;
    const box=bounds(ground.polygon);
    return {...base,id:ground.id,label:'Socle continu · '+building.label,category:'street' as const,districtId:building.districtId,
      position:{x:building.x,y:building.y,z:homeworldLevelV77(ground.levelId).elevation},
      dimensions:{width:box.right-box.left,depth:box.bottom-box.top,height:0},footprint:box,
      associatedElementIds:[building.id,'door:'+building.id],
      constraints:[`Socle sous l’empreinte native entière et sa lèvre de ${HOMEWORLD_FOUNDATION_JOINT_LIP_V112[building.id]??HOMEWORLD_FOUNDATION_LIP_V112} unités ; même polygone pour le sol, le pavement et les faces exposées.`,
        'La façade, son volume solide, son seuil et les positions sauvegardées ne sont pas déplacés.',
        'Adaptation maçonnée originale, sans nouveau dessin natif, pièce ou accès régional.']};
  }),
  ...HOMEWORLD_PUBLIC_PLACE_COMPOSITIONS_V112.flatMap(composition=>{
    const members=HOMEWORLD_PUBLIC_PLACES_V112.filter(item=>item.compositionId===composition.id);
    if (!members.length) return [];
    const anchor=members[0];
    return [{...base,id:'public-place-group-v112:'+composition.id,label:composition.label,category:'panel' as const,
      districtId:anchor.districtId,position:{x:anchor.x,y:anchor.y,z:homeworldLevelV77(anchor.levelId).elevation},
      associatedElementIds:members.map(item=>item.id),constraints:[composition.detail,
        'Composition de mobilier sur le pavement existant ; ce repère documentaire ne crée pas de point d’arrivée ou de service.']}];
  }),
  ...HOMEWORLD_PUBLIC_PLACES_V112.map(item=>{
    const art=HOMEWORLD_PUBLIC_PLACE_ART_V112[item.artId],box=bounds(homeworldPublicPlacePolygonV112(item));
    const usage=homeworldPublicPlaceUsageV112(item);
    return {...base,id:item.id,label:item.label,category:'prop' as const,districtId:item.districtId,
      position:{x:item.x,y:item.y,z:homeworldLevelV77(item.levelId).elevation},
      dimensions:{width:box.right-box.left,depth:box.bottom-box.top,height:art.heightWorld*item.scale},
      footprint:box,asset:art.src,associatedElementIds:['public-place-group-v112:'+item.compositionId],
      source:[{label:'Source native V83/V84 préservée',url:art.src,note:'SHA256 '+art.sha256}],
      constraints:[item.purpose,'Source, pivot, orientation et échelle uniforme conservés. Le contact est partagé par collision, dessin et fiche.',
        usage?'Face d’usage réservée, non solide : '+JSON.stringify(usage):'Décor sans nouvelle face d’usage.',
        'Aucun service, objet d’inventaire, récompense ou nouveau dessin livré par cette réutilisation.']};
  }),
  ...HOMEWORLD_PUBLIC_PLACE_REFUSALS_V112.map(item=>({...base,id:'authoring:'+item.id,label:'Placement non monté · '+item.id,
    category:'panel' as const,spaceId:'authoring:public-places-v112',constraints:['Refus runtime : '+item.reason+'. Aucun dessin ou volume ajouté.']})),
];
