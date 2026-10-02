/** Context relationships are derived from live city/interior models, not a
 * second approximate plan. No new canonical settlement or institution is asserted. */
import { HOMEWORLD_BUILDINGS, HOMEWORLD_STREETS } from './homeworldCity';
import { HOMEWORLD_ELEMENT_CODEX_V64, type HomeworldElementRecordV64 } from './homeworldElementCodexV64';
import { HOMEWORLD_GEOMETRY_V64, homeworldBuildingDoorwayV64, homeworldBuildingFootprintV64 } from './homeworldGeometryV64';
import { HOMEWORLD_IDENTITY_CODEX_V72 } from './homeworldIdentityCodexV72';
import { HOMEWORLD_CONNECTION_CODEX_V72 } from './homeworldConnectionCodexV72';
import { HOMEWORLD_SECONDARY_INTERIOR_CODEX_V74 } from './homeworldSecondaryInteriorCodexV74';
import { HOMEWORLD_POPULATION_CODEX_V74 } from './homeworldPopulationCodexV74';
import { HOMEWORLD_CIVILIAN_MOTION_CODEX_V74 } from './homeworldCivilianMotionCodexV74';
import { homeworldInteriorForBuildingV64, homeworldInteriorPropArtIdV64 } from './homeworldInteriorsV64';
import { HOMEWORLD_OUTSKIRTS_ART_V71, HOMEWORLD_OUTSKIRTS_GROUND_V71 } from './homeworldOutskirtsArtV71';
import { HOMEWORLD_OUTSKIRTS_MODULES_V71, HOMEWORLD_OUTSKIRTS_BOUNDS_V71,
  HOMEWORLD_OUTSKIRTS_CLEARANCE_V71, HOMEWORLD_BUILDING_APPROACHES_V71, homeworldOutskirtsFootprintV71 } from './homeworldOutskirtsV71';
export { HOMEWORLD_BUILDING_APPROACHES_V71 } from './homeworldOutskirtsV71';
export interface HomeworldContextRecordV71 extends HomeworldElementRecordV64 { associatedElementIds: readonly string[] }
const base={spaceId:'world',position:{x:0,y:0,z:0},dimensions:{width:0,depth:0,height:0},footprint:null,door:null,
  lore:'original-adaptation' as const,source:[],constraints:[],asset:null,associatedElementIds:[]};
const contexts:HomeworldContextRecordV71[]=HOMEWORLD_BUILDINGS.map(building=>{
  const room=homeworldInteriorForBuildingV64(building.id)!,door=homeworldBuildingDoorwayV64(building),footprint=homeworldBuildingFootprintV64(building);
  const components=[...HOMEWORLD_ELEMENT_CODEX_V64,...HOMEWORLD_IDENTITY_CODEX_V72,...HOMEWORLD_SECONDARY_INTERIOR_CODEX_V74].filter(record=>record.id===building.id||record.id===`door:${building.id}`||record.spaceId===building.id);
  const exteriorFurniture=HOMEWORLD_ELEMENT_CODEX_V64.filter(record=>record.category==='prop'&&record.spaceId==='world'
    &&record.districtId===building.districtId&&Math.hypot(record.position.x-building.x,record.position.y-building.y)<building.width);
  const streets=HOMEWORLD_STREETS.filter(street=>street.polygon.some(p=>Math.hypot(p.x-door.approach.x,p.y-door.approach.y)<800));
  return {...base,id:`assembly-v71:${building.id}`,label:`Ensemble · ${building.label}`,category:'building',districtId:building.districtId,
    position:{x:building.x,y:building.y,z:0},dimensions:{...building.footprint,height:building.wallHeight},footprint,door,asset:building.art.src,
    associatedElementIds:[...components,...exteriorFurniture].map(record=>record.id).concat(`approach-v71:${building.id}`),
    constraints:[
      'Ensemble réel : façade native → seuil peint → devanture au sol → passage public → intérieur du même bâtiment.',
      `Devanture indépendante : ${Math.round(door.clearWidth)} unités de largeur, ${Math.round(door.approach.y-building.y+36)} de profondeur. Texture du dallage natif, projetée une fois ; aucun obstacle ajouté.`,
      `Volume extérieur ${building.footprint.width} × ${building.footprint.depth} ; intérieur utile ${room.width} × ${room.depth}. Les murs occupent la différence : aucun intérieur plus grand que son enveloppe.`,
      `Fonction de la pièce : ${room.description}`,
      `Mobilier intérieur réel : ${room.props.map(prop=>`${prop.id} (${homeworldInteriorPropArtIdV64(prop.kind)}, ${Math.round(prop.width)} × ${Math.round(prop.height)} peints)`).join(' ; ')}. Les modules natifs et les zones de ce lieu sont détaillés dans les fiches associées.`,
      `Voies proches : ${streets.map(street=>street.label).join(' ; ')||'cour du quartier'}. Les trajets accessibles demeurent calculés par les collisions existantes.`,
      `${exteriorFurniture.length} mobilier(s) extérieur(s) voisin(s) répertorié(s). Les liens ne donnent aucune nouvelle interaction.`,
      'Barrières : seules les façades, volumes et meubles solides déjà présents bloquent le passage. Aucun faux grillage inaccessible ne coupe la rue.',
      'Maison du clan : architecture et proportions originales du jeu, pas reproduction 1:1 d’un bâtiment officiel.',
    ]};
});
const approaches:HomeworldContextRecordV71[]=HOMEWORLD_BUILDING_APPROACHES_V71.map(path=>({...base,id:path.id,label:`Devanture · ${HOMEWORLD_BUILDINGS.find(b=>b.id===path.buildingId)!.label}`,
  category:'floor',districtId:path.districtId,position:{x:path.x,y:path.y,z:0},dimensions:{width:path.width,depth:path.depth,height:0},
  asset:path.src,associatedElementIds:[path.buildingId,`door:${path.buildingId}`,`interior:${path.buildingId}`],
  constraints:['Module de sol séparé de la façade. Les côtés ne constituent aucune barrière.',
    'Le masque des terrains publics limite la texture à leur support réel ; aucune plateforme fictive ne rend les terrains extérieurs praticables.',
    `Seuil ${path.threshold.x} ; ${path.threshold.y} → approche ${path.approach.x} ; ${path.approach.y}.`,
    'La bordure et le rythme du dallage distinguent la devanture du chemin principal, sans panneaux textuels flottants.']}));
const outdoors:HomeworldContextRecordV71[]=HOMEWORLD_OUTSKIRTS_MODULES_V71.map(module=>{
  const art=HOMEWORLD_OUTSKIRTS_ART_V71[module.artId],footprint=homeworldOutskirtsFootprintV71(module);
  return {...base,id:`prop:${module.id}`,label:`${art.label} · ${module.id.split('-').at(-1)}`,category:'prop',districtId:module.districtId,
    position:{x:module.x,y:module.y,z:0},dimensions:{width:art.footprintWorld.width*module.scale,depth:art.footprintWorld.depth*module.scale,
      height:Math.max(0,(art.heightWorld-art.footprintWorld.depth*HOMEWORLD_GEOMETRY_V64.depthScale)*module.scale)},footprint,asset:art.src,
    associatedElementIds:[`district:${module.districtId}`,'floor:outskirts-v71'],
    constraints:[`Cellule native ${module.artId} : ${art.sourceRect.x}, ${art.sourceRect.y}, ${art.sourceRect.width} × ${art.sourceRect.height} px. Pivot local mesuré ${art.pivot.x} ; ${art.pivot.y}.`,
      `Échelle uniforme × ${module.scale}. Hauteur physique estimée distincte de la silhouette comprenant la profondeur peinte.`,
      `Support sur terrain extérieur non praticable, avec retrait de ${HOMEWORLD_OUTSKIRTS_CLEARANCE_V71} unités minimum du réseau public. Aucun nouveau bloqueur de déplacement.`,
      'Bords de cité : relief basaltique, végétation coriace, évents près des secteurs industriels et vestiges érodés. Pas de statue de personnage inventée comme canon.',
      'Tri par profondeur sol Y ; atténuation seulement si la silhouette passe devant le héros. Les objets hors caméra ne sont pas montés.',
      'Création OpenAI originale adaptée au monde du jeu. Les anciennes images restent conservées.']};
});
export const HOMEWORLD_CONTEXT_CODEX_V71:readonly HomeworldContextRecordV71[]=[
  ...contexts,...approaches,...outdoors,...HOMEWORLD_IDENTITY_CODEX_V72.map(record=>({...record,associatedElementIds:[`interior:${record.spaceId}`]})),
  ...HOMEWORLD_SECONDARY_INTERIOR_CODEX_V74.map(record=>({...record,associatedElementIds:[`interior:${record.spaceId}`]})),
  ...HOMEWORLD_CIVILIAN_MOTION_CODEX_V74.map(record=>({...record,associatedElementIds:[]})),
  ...HOMEWORLD_POPULATION_CODEX_V74,...HOMEWORLD_CONNECTION_CODEX_V72,{...base,id:'floor:outskirts-v71',label:'Sol naturel · ceinture de la cité',category:'floor',districtId:'outskirts',
    position:{x:HOMEWORLD_OUTSKIRTS_BOUNDS_V71.left,y:HOMEWORLD_OUTSKIRTS_BOUNDS_V71.top,z:0},
    dimensions:{width:HOMEWORLD_OUTSKIRTS_BOUNDS_V71.width,depth:HOMEWORLD_OUTSKIRTS_BOUNDS_V71.depth,height:0},asset:HOMEWORLD_OUTSKIRTS_GROUND_V71.src,
    constraints:['Texture de terrain native répétée en modules de 240 unités. Ce matériau ne contient ni cité ni panorama peint.',
      'Chaque polygone public est exclu séparément : les recouvrements de rues restent publics, sans trou produit par un masque pair/impair.',
      'Sol projeté une fois à 35°. Roches, murs et végétaux au-dessus gardent leur échelle uniforme.',
      'Le prolongement visuel ne permet pas de sortir des limites de déplacement ; les dix chemins V72 mènent à leurs seuils physiques et gardent les permissions de progression.']}];
export const HOMEWORLD_ALL_ELEMENT_CODEX_V71:readonly (HomeworldElementRecordV64&{associatedElementIds?:readonly string[]})[]=[...HOMEWORLD_ELEMENT_CODEX_V64,...HOMEWORLD_CONTEXT_CODEX_V71];
