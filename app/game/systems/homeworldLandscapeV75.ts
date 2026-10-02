import placements from '../data/homeworldLandscapeV75.json';
import {HOMEWORLD_OUTSKIRTS_ART_V71,type HomeworldOutskirtsArtIdV71} from './homeworldOutskirtsArtV71';
import {homeworldOutskirtsFootprintV71,homeworldOutskirtsPaintV71,homeworldOutskirtsVisibleV71,shouldFadeHomeworldOutskirtsV71} from './homeworldOutskirtsV71';
import {HOMEWORLD_GEOMETRY_V64} from './homeworldGeometryV64';
import type {HomeworldElementRecordV64} from './homeworldElementCodexV64';

/** The ten roads lead to distant regions; these are LOCAL plateau ecotones,
 * not ten complete climates sharing one street. No route/collider is added. */
export const HOMEWORLD_LANDSCAPE_GROUND_V75={src:'/game/homeworld/v75/landscape-ground-materials-native.png',sourceWidth:1254,sourceHeight:1254,
  sha256:'b144ee16a08881cce91b7652c8f2d8801e6c51c25e441e6586d407857c7b6307',lore:'original-adaptation',
  projection:'top-down-project-ground-once',nativeStatus:'OpenAI-native-immutable',seamStatus:'native-requested-periodic-visual-check-required'} as const;
const materialIds=['dry-ash','sandy-grit','moss-soil','damp-gravel','mineral-crust','fractured-bedrock'] as const;
export type HomeworldLandscapeMaterialIdV75=typeof materialIds[number];
export const HOMEWORLD_LANDSCAPE_MATERIALS_V75=Object.fromEntries(materialIds.map((id,index)=>[id,{
  ...HOMEWORLD_LANDSCAPE_GROUND_V75,id,sourceRect:{x:index%3*418,y:Math.floor(index/3)*627,width:418,height:627},
  // One source-pixel scale on both ground axes. The native cells are rectangular.
  tileWorldWidth:260,tileWorldDepth:390,
}])) as Record<HomeworldLandscapeMaterialIdV75,typeof HOMEWORLD_LANDSCAPE_GROUND_V75&{
  id:HomeworldLandscapeMaterialIdV75;sourceRect:{x:number;y:number;width:number;height:number};tileWorldWidth:number;tileWorldDepth:number}>;
export interface HomeworldLandscapeModuleV75 {
  id:string;artId:HomeworldOutskirtsArtIdV71;x:number;y:number;scale:number;districtId:string;
  groupId:string;regionId:string|null;formation:'ridge'|'understory'|'drainage'|'geothermal';
}
export interface HomeworldLandscapeGroundPatchV75 {
  id:string;regionId:string|null;materialId:HomeworldLandscapeMaterialIdV75;
  x:number;y:number;radiusX:number;radiusY:number;opacity:number;note:string;
}
export const HOMEWORLD_LANDSCAPE_MODULES_V75=placements.modules as readonly HomeworldLandscapeModuleV75[];
export const HOMEWORLD_LANDSCAPE_PATCHES_V75=placements.patches as readonly HomeworldLandscapeGroundPatchV75[];
export const HOMEWORLD_LANDSCAPE_CLEARANCE_V75=placements.clearanceWorld;
export const HOMEWORLD_LANDSCAPE_RESERVED_MARGIN_V75=placements.reservedMarginWorld;
/** V72's north camera reaches -620 projected px. The old -650 ground-y
 * boundary ended at -373 projected px, exposing a black strip above the belt. */
export const HOMEWORLD_LANDSCAPE_BOUNDS_V75={left:-1700,top:-1700,width:11000,depth:9500} as const;
export function homeworldLandscapeGroundWindowV75(camera:{x:number;y:number;width:number;height:number}){
  const bounds=HOMEWORLD_LANDSCAPE_BOUNDS_V75,tile=240,d=HOMEWORLD_GEOMETRY_V64.depthScale;
  const left=Math.max(bounds.left,Math.floor((camera.x-tile)/tile)*tile),top=Math.max(bounds.top,Math.floor((camera.y-tile)/d/tile)*tile);
  const right=Math.min(bounds.left+bounds.width,Math.ceil((camera.x+camera.width+tile)/tile)*tile),bottom=Math.min(bounds.top+bounds.depth,Math.ceil((camera.y+camera.height+tile)/d/tile)*tile);
  return {left,top,width:Math.max(0,right-left),depth:Math.max(0,bottom-top)};
}
export const homeworldLandscapeFootprintV75=homeworldOutskirtsFootprintV71;
export const homeworldLandscapePaintV75=homeworldOutskirtsPaintV71;
export const homeworldLandscapeVisibleV75=homeworldOutskirtsVisibleV71;
export const shouldFadeHomeworldLandscapeV75=shouldFadeHomeworldOutskirtsV71;
export function homeworldLandscapePatchVisibleV75(patch:HomeworldLandscapeGroundPatchV75,camera:{x:number;y:number;width:number;height:number}){
  const d=HOMEWORLD_GEOMETRY_V64.depthScale;
  return patch.x+patch.radiusX>camera.x&&patch.x-patch.radiusX<camera.x+camera.width
    &&(patch.y+patch.radiusY)*d>camera.y&&(patch.y-patch.radiusY)*d<camera.y+camera.height;
}
const materialNames:Record<HomeworldLandscapeMaterialIdV75,string>={
  'dry-ash':'Cendre fine du plateau','sandy-grit':'Alluvions sèches','moss-soil':'Humus des abris','damp-gravel':'Gravier humide des drains',
  'mineral-crust':'Dépôts géothermiques refroidis','fractured-bedrock':'Dalles de basalte fracturé',
};
const base={spaceId:'world',position:{x:0,y:0,z:0},dimensions:{width:0,depth:0,height:0},footprint:null,door:null,
  lore:'original-adaptation' as const,source:[] as HomeworldElementRecordV64['source'],constraints:[] as string[],asset:null};
export const HOMEWORLD_LANDSCAPE_CODEX_V75:readonly (HomeworldElementRecordV64&{associatedElementIds:readonly string[]})[]=[
  {...base,id:'floor:landscape-v75',label:'Plateau naturel continu · enveloppe V75',category:'floor',districtId:'outskirts',
    position:{x:HOMEWORLD_LANDSCAPE_BOUNDS_V75.left,y:HOMEWORLD_LANDSCAPE_BOUNDS_V75.top,z:0},
    dimensions:{width:HOMEWORLD_LANDSCAPE_BOUNDS_V75.width,depth:HOMEWORLD_LANDSCAPE_BOUNDS_V75.depth,height:0},
    asset:'/game/homeworld/v71/cinder-ground.png',associatedElementIds:['floor:outskirts-v71'],
    constraints:['Enveloppe naturelle prolongée au nord pour couvrir la caméra existante à -620 pixels projetés ; routes et limites physiques inchangées.',
      'Seule une fenêtre de caméra alignée sur 240 unités est montée. Aucun SVG global 11000×9500 pixels ou panorama unique.',
      'Sol à Y=-1700 unités minimum, soit -975 pixels projetés ; échelle verticale du sol appliquée exactement une fois.',
      'Les 162 anciens modules V71 et leurs sources sont conservés ; 212 nouveaux appuis indépendants sont détaillés séparément.']},
  ...HOMEWORLD_LANDSCAPE_PATCHES_V75.map(patch=>{
    const material=HOMEWORLD_LANDSCAPE_MATERIALS_V75[patch.materialId];
    return {...base,id:patch.id,label:materialNames[patch.materialId]+' · '+patch.id,category:'floor' as const,districtId:'outskirts',
      position:{x:patch.x,y:patch.y,z:0},dimensions:{width:patch.radiusX*2,depth:patch.radiusY*2,height:0},asset:material.src,
      associatedElementIds:patch.regionId?[`gateway-v72:${patch.regionId}`]:['floor:outskirts-v71'],
      constraints:[patch.note,'Surface indépendante, limitée au terrain naturel par le masque de TOUS les polygones publics. Aucun support praticable ou droit de passage supplémentaire.',
        `Cellule native ${material.sourceRect.x},${material.sourceRect.y},${material.sourceRect.width}×${material.sourceRect.height} px. Répétition ${material.tileWorldWidth}×${material.tileWorldDepth} unités ; une seule échelle uniforme des pixels avant projection du sol à 35°.`,
        'Lisière alpha progressive sur géométrie SVG ; pixels PNG originaux inchangés. Origine de répétition fixe dans le monde, jamais attachée à la caméra.',
        `SHA256 ${material.sha256}. Périodicité demandée à OpenAI mais non certifiée mathématiquement ; vérifier les raccords dans les captures de jeu.`,
        'Variations locales d’un même plateau volcanique : pas une juxtaposition instantanée des climats complets des dix destinations.']};
  }),
  ...HOMEWORLD_LANDSCAPE_MODULES_V75.map(module=>{
    const art=HOMEWORLD_OUTSKIRTS_ART_V71[module.artId];
    return {...base,id:module.id,label:`${art.label} · formation ${module.groupId}`,category:'prop' as const,districtId:module.districtId,
      position:{x:module.x,y:module.y,z:0},dimensions:{width:art.footprintWorld.width*module.scale,depth:art.footprintWorld.depth*module.scale,
        height:Math.max(0,(art.heightWorld-art.footprintWorld.depth*HOMEWORLD_GEOMETRY_V64.depthScale)*module.scale)},
      footprint:homeworldLandscapeFootprintV75(module),asset:art.src,associatedElementIds:module.regionId?[`gateway-v72:${module.regionId}`]:['floor:outskirts-v71'],
      constraints:[`Groupe ${module.groupId} ; fonction paysagère ${module.formation}.`,
        `Cellule native V71 ${art.sourceRect.x},${art.sourceRect.y},${art.sourceRect.width}×${art.sourceRect.height} px ; pivot local ${art.pivot.x},${art.pivot.y}, échelle uniforme ×${module.scale}.`,
        `Appui naturel hors réseau public, retrait ${HOMEWORLD_LANDSCAPE_CLEARANCE_V75} unités ; retrait ${HOMEWORLD_LANDSCAPE_RESERVED_MARGIN_V75} unités des volumes V71/V72. Aucun nouveau collider, aucune ancienne instance supprimée.`,
        'Profondeur = Y du sol ; culling sur silhouette peinte ; seule la silhouette devant le héros peut être atténuée. Aucun miroir ou rotation CSS de la perspective.',
        'Relief et flore originaux adaptés au jeu. Les sources natives V71 restent conservées byte pour byte.']};
  }),
];
