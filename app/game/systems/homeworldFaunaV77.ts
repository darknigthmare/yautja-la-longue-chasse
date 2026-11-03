/** Original scenic placement of supplied static references. This module does not
 * identify canonical species, replace combat enemies, or store gameplay state. */
import manifest from '../data/homeworldFaunaArtV77.json';
import type {HomeworldNativeSpriteCellV64} from '../HomeworldNativePropV64';
import type {HomeworldElementRecordV64} from './homeworldElementCodexV64';
import type {HomeworldRegionIdV68} from './homeworldRegionsV68';
import {HOMEWORLD_FAUNA_HABITAT_ART_V77,HOMEWORLD_FAUNA_HABITAT_CODEX_V77} from './homeworldFaunaHabitatV77';

export interface HomeworldFaunaArtV77 extends HomeworldNativeSpriteCellV64 {
  id:string;label:string;speciesId?:string;variant?:string;held?:boolean;referenceOnly?:boolean;
  format:'held'|'reference-board';nativePoses:number;nativeAnimationClips:number;
  sha256:string;sourceShare:string;sourceTurn:number;fileId:string;sourceStatus:string;
  bytes:number;hasAlpha:boolean;alphaThreshold:number;borderPixels:number;
  canonicalFidelity:string;supportMeasurement:string;limitations:readonly string[];
}
export const HOMEWORLD_FAUNA_ART_V77:readonly HomeworldFaunaArtV77[]=manifest.assets as HomeworldFaunaArtV77[];
export const HOMEWORLD_FAUNA_HELD_V77=HOMEWORLD_FAUNA_ART_V77.filter(a=>a.format==='held');
export const HOMEWORLD_FAUNA_LATEST_V77=HOMEWORLD_FAUNA_HELD_V77.filter(a=>!a.sourceStatus.startsWith('SUPERSEDED'));
export const HOMEWORLD_FAUNA_REFERENCE_BOARDS_V77=HOMEWORLD_FAUNA_ART_V77.filter(a=>a.format==='reference-board');
export const homeworldFaunaArtV77=(id:string)=>HOMEWORLD_FAUNA_ART_V77.find(a=>a.id===id);
export const homeworldFaunaVariantsV77=(speciesId:string)=>HOMEWORLD_FAUNA_HELD_V77.filter(a=>a.speciesId===speciesId);

/** A static drawing may receive a bounded placement offset. It never acquires
 * invented frames, anatomical articulation, a mirrored side, or combat AI. */
export interface HomeworldFaunaDisplayV77 {
  id:string;artId:string;regionId:HomeworldRegionIdV68;x:number;y:number;
  habitat:string;placementMotion:'still'|'hover-held';altitude:number;
  ground:{width:number;depth:number};
}
export const HOMEWORLD_FAUNA_DISPLAY_V77:readonly HomeworldFaunaDisplayV77[]=[
  {id:'fauna-display-v77:ash-titan',artId:'armored-rhinoceros-titan',regionId:'ash-marches',x:2260,y:1200,
    habitat:'Îlot rocheux de cendre au nord de la route',placementMotion:'still',altitude:0,ground:{width:350,depth:170}},
  {id:'fauna-display-v77:jungle-turquoise',artId:'winged-insect-turquoise',regionId:'pillar-jungle',x:1920,y:1560,
    habitat:'Lisière végétalisée des piliers au nord de la route',placementMotion:'hover-held',altitude:24,ground:{width:330,depth:170}},
  {id:'fauna-display-v77:marsh-tusks',artId:'crustacean-restored-tusks-final',regionId:'luminous-marshes',x:2140,y:1200,
    habitat:'Îlot ferme du marais au nord de la route',placementMotion:'still',altitude:0,ground:{width:350,depth:170}},
  {id:'fauna-display-v77:thermal-amber',artId:'volcanic-insect-amber',regionId:'thermal-caves',x:2100,y:1200,
    habitat:'Ressaut minéral des cavernes thermales au nord de la route',placementMotion:'hover-held',altitude:28,ground:{width:340,depth:170}},
];
export const homeworldFaunaForRegionV77=(id:HomeworldRegionIdV68)=>HOMEWORLD_FAUNA_DISPLAY_V77.filter(d=>d.regionId===id);
export function homeworldFaunaPlacementV77(display:HomeworldFaunaDisplayV77,tick:number,reducedMotion=false){
  const safeTick=Number.isFinite(tick)?Math.max(0,tick):0;
  const offset=display.placementMotion==='hover-held'&&!reducedMotion?Math.sin(safeTick/90)*2:0;
  return {x:display.x,y:display.y,elevation:display.altitude+offset,nativeFrame:0 as const};
}
export const homeworldFaunaSourceUrlsV77=(id:HomeworldRegionIdV68)=>homeworldFaunaForRegionV77(id).length
  ?[HOMEWORLD_FAUNA_HABITAT_ART_V77.src,...homeworldFaunaForRegionV77(id).map(d=>homeworldFaunaArtV77(d.artId)!.src)]:[];
/** Known sources require exact dimensions. Absolute browser URLs are accepted.
 * Legacy sources retain their existing loader contract rather than being reassigned. */
export function homeworldFaunaDimensionsV77(src:string,width:number,height:number){
  let pathname=src;try{pathname=new URL(src,'https://local.invalid').pathname;}catch{return false;}
  const art=HOMEWORLD_FAUNA_ART_V77.find(a=>a.src===pathname)??(pathname===HOMEWORLD_FAUNA_HABITAT_ART_V77.src?HOMEWORLD_FAUNA_HABITAT_ART_V77:null);
  return art?width===art.sourceWidth&&height===art.sourceHeight:width>0;
}
const source=(a:HomeworldFaunaArtV77)=>[{label:'Sprite fourni · conversation du 3 octobre 2026',url:a.sourceShare,
  note:`Tour ${a.sourceTurn}; SHA256 ${a.sha256}. Référence source et identité canonique non certifiées 1:1.`}];
const base=(a:HomeworldFaunaArtV77):HomeworldElementRecordV64=>({
  id:`fauna-art-v77:${a.id}`,label:a.label,category:'panel',districtId:'fauna-reference',spaceId:'reference:fauna-v77',
  position:{x:0,y:0,z:0},dimensions:{width:a.sourceWidth,depth:0,height:a.sourceHeight},footprint:null,door:null,
  lore:'original-adaptation',source:source(a),asset:a.src,constraints:[
    `Format ${a.format}; ${a.nativePoses} pose native; ${a.nativeAnimationClips} clip animé natif.`,
    'Dimensions de la fiche en pixels source, pas des dimensions biologiques ou une collision.',
    `Rect source ${JSON.stringify(a.sourceRect)}; pivot visuel ${JSON.stringify(a.pivot)}; alpha ${JSON.stringify(a.alphaBounds)}.`,
    'Image source entière conservée : aucune coupe en six cases, rotation, étirement ou face opposée inventée.',
    ...a.limitations,...(a.id==='yautja-horse-corrected'?['Référence de statuette Fewture/Sideshow selon une source secondaire : aucune monture jouable ajoutée.']:[])]});
export const HOMEWORLD_FAUNA_CODEX_V77:readonly (HomeworldElementRecordV64&{associatedElementIds?:readonly string[]})[]=[
  HOMEWORLD_FAUNA_HABITAT_CODEX_V77,
  ...HOMEWORLD_FAUNA_ART_V77.map(base),
  ...HOMEWORLD_FAUNA_DISPLAY_V77.map(display=>{const art=homeworldFaunaArtV77(display.artId)!;return{
    ...base(art),id:display.id,label:`Observation · ${art.label}`,category:'prop' as const,
    districtId:display.regionId,spaceId:`region:${display.regionId}:passage`,position:{x:display.x,y:display.y,z:display.altitude},
    dimensions:{width:art.alphaBounds.width*art.heightWorld/art.alphaBounds.height,depth:0,height:art.heightWorld},
    associatedElementIds:[`fauna-art-v77:${art.id}`,HOMEWORLD_FAUNA_HABITAT_ART_V77.id],constraints:[
      display.habitat,'Îlot de décor hors du couloir praticable existant, sans extension de ses collisions.',
      'Adaptation de placement originale ; aucune identité ennemie, découverte, récompense, IA ou sauvegarde remplacée.',
      `Hauteur peinte ${art.heightWorld} unités; échelle uniforme et pivot inférieur mesuré sur la silhouette.`,
      display.placementMotion==='hover-held'?'Une pose fixe déplacée au maximum de 2 unités verticales par code ; aucun battement d’aile dessiné.':'Une pose fixe, pieds au pivot visuel ; aucune marche ou animation native prétendue.',
      'La pause fige le tick ; la préférence de mouvement réduit supprime la microtranslation.',
      ...base(art).constraints]};}),
];
