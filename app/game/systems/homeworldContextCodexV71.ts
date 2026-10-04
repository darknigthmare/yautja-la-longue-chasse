/** Context relationships are derived from live city/interior models, not a
 * second approximate plan. No new canonical settlement or institution is asserted. */
import { HOMEWORLD_BUILDINGS, HOMEWORLD_STREETS } from './homeworldCity';
import { HOMEWORLD_ELEMENT_CODEX_V64, type HomeworldElementRecordV64 } from './homeworldElementCodexV64';
import {HOMEWORLD_FAUNA_CODEX_V77} from './homeworldFaunaV77';
import {HOMEWORLD_CONCEPT_CODEX_V77} from './homeworldConceptRefsV77';
import {HOMEWORLD_WORLD_CODEX_V77,homeworldRecordPlacementV77} from './homeworldWorldCodexV77';
import {HOMEWORLD_LAVA_CODEX_V77} from './homeworldLavaPlacementV77';
import {HOMEWORLD_URBAN_CODEX_V78} from './homeworldUrbanCodexV78';
import {HOMEWORLD_CITY_NATIVE_CODEX_V78} from './homeworldCityNativeCodexV78';
import {HOMEWORLD_CIVIC_CODEX_V80} from './homeworldCivicDecorV80';
import {HOMEWORLD_CIVIC_ARCHITECTURE_CODEX_V80} from './homeworldCivicArchitectureV80';
import {HOMEWORLD_PORT_SHOULDER_CODEX_V80} from './homeworldPortShouldersV80';
import {homeworldNaturalRecordPlacementV80} from './homeworldNaturalPlacementsV80';
import { HOMEWORLD_GEOMETRY_V64, homeworldBuildingDoorwayV64, homeworldBuildingFootprintV64 } from './homeworldGeometryV64';
import { HOMEWORLD_IDENTITY_CODEX_V72 } from './homeworldIdentityCodexV72';
import { HOMEWORLD_CONNECTION_CODEX_V72 } from './homeworldConnectionCodexV72';
import { HOMEWORLD_SECONDARY_INTERIOR_CODEX_V74 } from './homeworldSecondaryInteriorCodexV74';
import { HOMEWORLD_MONUMENT_INTERIOR_CODEX_V81 } from './homeworldMonumentInteriorCodexV81';
import { HOMEWORLD_NATIVE_ARCHITECTURE_CODEX_V81 } from './homeworldNativeArchitectureCodexV81';
import { homeworldBuildingIdentityV81 } from './homeworldNativeArchitectureV81';
import { HOMEWORLD_POPULATION_CODEX_V74 } from './homeworldPopulationCodexV74';
import { HOMEWORLD_CIVILIAN_MOTION_CODEX_V74 } from './homeworldCivilianMotionCodexV74';
import { HOMEWORLD_CONVERSATION_CODEX_V75 } from './homeworldResidentConversationsV75';
import { HOMEWORLD_ARCHITECTURE_CODEX_V75 } from './homeworldArchitectureV75';
import { HOMEWORLD_LANDSCAPE_CODEX_V75, HOMEWORLD_LANDSCAPE_BOUNDS_V75 } from './homeworldLandscapeV75';
import { HOMEWORLD_INTERIORS_V64, homeworldInteriorForBuildingV64, homeworldInteriorPropArtIdV64 } from './homeworldInteriorsV64';
import {homeworldInteriorDecorCodexV76,HOMEWORLD_INTERIOR_DECOR_ART_V76} from './homeworldInteriorDecorV76';
import {HOMEWORLD_EXTERIOR_CODEX_V76,HOMEWORLD_EXTERIOR_MODULES_V76} from './homeworldExteriorDecorV76';
import {HOMEWORLD_ARCHITECTURE_IDENTITIES_V76} from './homeworldArchitectureArtV76';
import { HOMEWORLD_OUTSKIRTS_ART_V71, HOMEWORLD_OUTSKIRTS_GROUND_V71 } from './homeworldOutskirtsArtV71';
import { HOMEWORLD_OUTSKIRTS_MODULES_V71,
  HOMEWORLD_OUTSKIRTS_CLEARANCE_V71, HOMEWORLD_BUILDING_APPROACHES_V71, homeworldOutskirtsFootprintV71 } from './homeworldOutskirtsV71';
export { HOMEWORLD_BUILDING_APPROACHES_V71 } from './homeworldOutskirtsV71';
export interface HomeworldContextRecordV71 extends HomeworldElementRecordV64 { associatedElementIds: readonly string[] }
const base={spaceId:'world',position:{x:0,y:0,z:0},dimensions:{width:0,depth:0,height:0},footprint:null,door:null,
  lore:'original-adaptation' as const,source:[],constraints:[],asset:null,associatedElementIds:[]};
const interiorDecorRecordsV76:HomeworldContextRecordV71[]=HOMEWORLD_INTERIORS_V64.flatMap(room=>homeworldInteriorDecorCodexV76(room).map(item=>{
  const bounds=item.groundBounds,art=Object.values(HOMEWORLD_INTERIOR_DECOR_ART_V76).find(a=>a.src===item.src)!;
  return {...base,id:item.id,label:item.label,category:'prop',spaceId:room.buildingId,districtId:HOMEWORLD_BUILDINGS.find(b=>b.id===room.buildingId)!.districtId,
    position:{...item.anchor,z:0},dimensions:{width:bounds.right-bounds.left,depth:bounds.bottom-bounds.top,
      height:Math.max(0,art.heightWorld*item.scale-(bounds.bottom-bounds.top)*HOMEWORLD_GEOMETRY_V64.depthScale)},
    footprint:item.solid?bounds:null,asset:item.src,associatedElementIds:[`interior:${room.buildingId}`,`exit:${room.buildingId}`],
    source:[{label:'PNG natif OpenAI et métrologie locale',url:item.src,note:`SHA256 ${item.sha256}. ${item.measurement}`}],
    constraints:[`Usage : ${item.purpose}. Orientation native ${item.orientation}, sans rotation ni miroir CSS.`,
      `Pivot source ${item.pivotPixels.x} ; ${item.pivotPixels.y}. Échelle uniforme ${item.uniformScaleWorldPerPixel} u/px.`,
      'Rectangle de collision conservateur autour des appuis natifs, asymétrique par rapport au pivot. Le meuble reste dessiné sous son vrai angle ; sa hauteur ne comprime pas la perspective.',
      'Zones, stations, sortie et passages existants contrôlés avec le corps entier et quatre unités de marge.',
      'Décor indépendant : aucun service, soin, récompense ou objet récupérable ajouté.',
      'Mobilier civil original compatible avec la ville du jeu ; aucune pièce officielle reproduite 1:1.']};
}));
const exteriorDecorRecordsV76:HomeworldContextRecordV71[]=HOMEWORLD_EXTERIOR_CODEX_V76.map(record=>{
  const item=HOMEWORLD_EXTERIOR_MODULES_V76.find(i=>i.id===record.id)!;
  return {...record,associatedElementIds:item.associatedBuildingId
    ?[item.associatedBuildingId,`door:${item.associatedBuildingId}`,`interior:${item.associatedBuildingId}`]
    :[`district:${item.districtId}`]};
});
const angledArchitectureRecordsV76:HomeworldContextRecordV71[]=Object.entries(HOMEWORLD_ARCHITECTURE_IDENTITIES_V76).map(([id,identity])=>{
  const building=HOMEWORLD_BUILDINGS.find(b=>b.id===id)!,frame=identity.art.groundFrame!;
  if(homeworldBuildingIdentityV81(id))return {...base,id:`v76-facade:${id}`,label:`Archive V76 · ${identity.title}`,category:'building',districtId:building.districtId,spaceId:`archive:architecture-v76:${id}`,
    position:{x:0,y:0,z:0},dimensions:{width:570,depth:340,height:identity.art.wallHeightWorld},footprint:null,door:null,asset:identity.art.src,
    associatedElementIds:[id,`v81-facade:${id}`],source:[{label:'PNG V76 archivé, non utilisé par la façade active',url:identity.art.src,note:`SHA256 ${identity.art.sha256}; référence précédente ${identity.measurement.sourceReference}.`}],
    constraints:['Ancienne façade conservée comme archive visuelle ; cette fiche ne décrit aucun volume runtime ni porte active.',
      'Les dimensions indiquées appartiennent au modèle V76 historique, pas au Conseil monumental V81.',
      `La façade, le hull réel et les seuils actuels sont décrits uniquement dans la fiche v81-facade:${id}.`,
      'Pixels et métrologie historiques préservés ; aucun nouveau gain ou usage canonique déduit.']};
  return {...base,id:`v76-facade:${id}`,label:`Vue oblique · ${identity.title}`,category:'building',districtId:building.districtId,
    position:{x:building.x,y:building.y,z:0},dimensions:{...building.footprint,height:building.wallHeight},
    footprint:homeworldBuildingFootprintV64(building),door:homeworldBuildingDoorwayV64(building),asset:identity.art.src,
    associatedElementIds:[id,`door:${id}`,`interior:${id}`,`approach-v71:${id}`,`street:forecourt-v76:${id}`,`v75-facade:${id}`],
    source:[{label:'Vue native OpenAI mesurée et façade précédente conservée',url:identity.art.src,note:`SHA256 ${identity.art.sha256}. Référence : ${identity.measurement.sourceReference}.`}],
    constraints:[`Orientation du bâtiment mesurée ${frame.yawDegrees.toFixed(2)}° ; caméra fixe yaw0/pitch35. PNG natif sans rotation, miroir ou étirement.`,
      'Seuil peint, segment de fondation et largeur utile entre jambages mesurés séparément dans la source.',
      `Volume solide orienté de ${building.footprint.width} × ${building.footprint.depth} ; ouverture de porte et parvis suivent la normale réelle. Les coins vides du rectangle englobant restent ouverts.`,
      'Le tri de cette façade suit son segment avant à l’abscisse du héros ; il ne traite pas les deux coins obliques comme une seule ligne horizontale. L’atténuation ne retire aucun obstacle.',
      'Identifiants persistants conservés. Cinq implantations sont ajustées et six parvis sont dallés pour dégager les anciens parcours, sans réduire la vraie collision. Aucun nouveau service ni gain de progression.',
      'L’ancienne vue de face V75 reste archivée avec son image et ses mesures ; elle n’est pas effacée.',
      'Architecture civique originale du jeu, pas copie1:1 d’une cité officielle.']};
});
const architectureRecordsV75:HomeworldContextRecordV71[]=HOMEWORLD_ARCHITECTURE_CODEX_V75.map(record=>{
  const buildingId=record.id.split(':')[1];
  if(homeworldBuildingIdentityV81(buildingId))return {...record,label:'Archive V75 · '+record.label,spaceId:`archive:architecture-v75:${buildingId}`,position:{x:0,y:0,z:0},footprint:null,door:null,
    constraints:[...record.constraints,'Façade historique archivée, non montée dans le renderer actif et sans volume runtime. La géométrie actuelle relève de v81-facade:'+buildingId+'.'],
    associatedElementIds:[buildingId,`v81-facade:${buildingId}`]};
  return {...record,associatedElementIds:[buildingId,`door:${buildingId}`,`interior:${buildingId}`]};
});
const nativeArchitectureRecordsV81:HomeworldContextRecordV71[]=HOMEWORLD_NATIVE_ARCHITECTURE_CODEX_V81.map(record=>{
  const id=record.id.slice('v81-facade:'.length);
  return {...record,associatedElementIds:[id,`door:${id}`,`interior:${id}`,`approach-v71:${id}`,`assembly-v71:${id}`]};
});
const contexts:HomeworldContextRecordV71[]=HOMEWORLD_BUILDINGS.map(building=>{
  const room=homeworldInteriorForBuildingV64(building.id)!,door=homeworldBuildingDoorwayV64(building),footprint=homeworldBuildingFootprintV64(building);
  const components=[...HOMEWORLD_ELEMENT_CODEX_V64,...HOMEWORLD_IDENTITY_CODEX_V72,...HOMEWORLD_SECONDARY_INTERIOR_CODEX_V74,...HOMEWORLD_MONUMENT_INTERIOR_CODEX_V81,...architectureRecordsV75,...angledArchitectureRecordsV76,...nativeArchitectureRecordsV81,...interiorDecorRecordsV76].filter(record=>record.id===building.id||record.id===`door:${building.id}`||record.spaceId===building.id||record.id===`v75-facade:${building.id}`||record.id===`v76-facade:${building.id}`||record.id===`v81-facade:${building.id}`);
  const exteriorFurniture=[...HOMEWORLD_ELEMENT_CODEX_V64,...architectureRecordsV75,...exteriorDecorRecordsV76].filter(record=>record.category==='prop'&&record.spaceId==='world'
    &&record.districtId===building.districtId&&Math.hypot(record.position.x-building.x,record.position.y-building.y)<building.width);
  const streets=HOMEWORLD_STREETS.filter(street=>street.polygon.some(p=>Math.hypot(p.x-door.approach.x,p.y-door.approach.y)<800));
  return {...base,id:`assembly-v71:${building.id}`,label:`Ensemble · ${building.label}`,category:'building',districtId:building.districtId,
    position:{x:building.x,y:building.y,z:0},dimensions:{...building.footprint,height:building.wallHeight},footprint,door,asset:building.art.src,
    associatedElementIds:[...components,...exteriorFurniture].map(record=>record.id).concat(`approach-v71:${building.id}`),
    constraints:[
      'Ensemble réel : façade native → seuil peint → devanture au sol → passage public → intérieur du même bâtiment.',
      `Devanture indépendante : ${Math.round(door.clearWidth)} unités de largeur, 106 de profondeur suivant la normale de la porte. Texture du dallage natif, projetée une fois ; aucun obstacle ajouté.`,
      `Volume extérieur ${building.footprint.width} × ${building.footprint.depth} ; intérieur utile ${room.width} × ${room.depth}. Les murs occupent la différence : aucun intérieur plus grand que son enveloppe.`,
      `Fonction de la pièce : ${room.description}`,
      `Mobilier intérieur réel : ${room.props.map(prop=>`${prop.id} (${homeworldInteriorPropArtIdV64(prop.kind)}, ${Math.round(prop.width)} × ${Math.round(prop.height)} peints)`).join(' ; ')}. Les modules natifs et les zones de ce lieu sont détaillés dans les fiches associées.`,
      `${room.orientedDecorV76?.length??0} modules orientés V76, avec appuis, usages et volumes individuels dans leurs fiches associées.`,
      ...(room.monumentLayoutV81?[`${room.monumentDecorV81?.length??0} modules natifs supplémentaires et ${room.monumentInhabitantsV81?.length??0} habitants stationnaires non interactifs du complexe public V81, détaillés dans leurs fiches associées.`]:[]),
      `Voies proches : ${streets.map(street=>street.label).join(' ; ')||'cour du quartier'}. Les trajets accessibles demeurent calculés par les collisions existantes.`,
      `${exteriorFurniture.length} mobilier(s) extérieur(s) voisin(s) répertorié(s). Les liens ne donnent aucune nouvelle interaction.`,
      'Barrières : seules les façades, volumes et meubles solides déjà présents bloquent le passage. Aucun faux grillage inaccessible ne coupe la rue.',
      'Maison du clan : architecture et proportions originales du jeu, pas reproduction 1:1 d’un bâtiment officiel.',
    ]};
});
const approaches:HomeworldContextRecordV71[]=HOMEWORLD_BUILDING_APPROACHES_V71.map(path=>({...base,id:path.id,label:`Devanture · ${HOMEWORLD_BUILDINGS.find(b=>b.id===path.buildingId)!.label}`,
  category:'floor',districtId:path.districtId,position:{x:path.x,y:path.y,z:0},dimensions:{width:path.width,depth:path.depth,height:0},
  footprint:path.polygon?{left:path.x,right:path.x+path.width,top:path.y,bottom:path.y+path.depth,polygon:path.polygon}:null,
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
  ...HOMEWORLD_MONUMENT_INTERIOR_CODEX_V81.map(record=>({...record,associatedElementIds:[`interior:${record.spaceId}`,`exit:${record.spaceId}`]})),
  ...HOMEWORLD_CIVILIAN_MOTION_CODEX_V74.map(record=>({...record,associatedElementIds:[]})),
  ...HOMEWORLD_POPULATION_CODEX_V74,...HOMEWORLD_CONVERSATION_CODEX_V75,...architectureRecordsV75,...angledArchitectureRecordsV76,...nativeArchitectureRecordsV81,...interiorDecorRecordsV76,...exteriorDecorRecordsV76,...HOMEWORLD_LANDSCAPE_CODEX_V75,...HOMEWORLD_CONNECTION_CODEX_V72,{...base,id:'floor:outskirts-v71',label:'Sol naturel · base de cendre et ceinture V75',category:'floor',districtId:'outskirts',
    position:{x:HOMEWORLD_LANDSCAPE_BOUNDS_V75.left,y:HOMEWORLD_LANDSCAPE_BOUNDS_V75.top,z:0},
    dimensions:{width:HOMEWORLD_LANDSCAPE_BOUNDS_V75.width,depth:HOMEWORLD_LANDSCAPE_BOUNDS_V75.depth,height:0},asset:HOMEWORLD_OUTSKIRTS_GROUND_V71.src,
    constraints:['Texture de terrain native répétée en modules de 240 unités. Ce matériau ne contient ni cité ni panorama peint.',
      'Enveloppe V75 prolongée au nord pour couvrir la caméra réelle ; le matériau de base V71 et ses anciens modules sont conservés. Les variations de sol et relief sont détaillées dans les fiches V75 associées.',
      'Chaque polygone public est exclu séparément : les recouvrements de rues restent publics, sans trou produit par un masque pair/impair.',
      'Sol projeté une fois à 35°. Roches, murs et végétaux au-dessus gardent leur échelle uniforme.',
      'Le prolongement visuel ne permet pas de sortir des limites de déplacement ; les dix chemins V72 mènent à leurs seuils physiques et gardent les permissions de progression.']}];
export const HOMEWORLD_ALL_ELEMENT_CODEX_V71:readonly (HomeworldElementRecordV64&{associatedElementIds?:readonly string[]})[]=[
  ...[...HOMEWORLD_ELEMENT_CODEX_V64,...HOMEWORLD_CONTEXT_CODEX_V71].map(homeworldRecordPlacementV77).filter((record):record is NonNullable<typeof record>=>record!==null).map(homeworldNaturalRecordPlacementV80),
  ...HOMEWORLD_WORLD_CODEX_V77,...HOMEWORLD_LAVA_CODEX_V77,...HOMEWORLD_FAUNA_CODEX_V77,...HOMEWORLD_CONCEPT_CODEX_V77,
  // V78 records already own world coordinates and elevation. Never apply the
  // legacy port relocation to them a second time.
  ...HOMEWORLD_URBAN_CODEX_V78,
  ...HOMEWORLD_CITY_NATIVE_CODEX_V78,
  ...HOMEWORLD_CIVIC_CODEX_V80,
  ...HOMEWORLD_CIVIC_ARCHITECTURE_CODEX_V80,
  ...HOMEWORLD_PORT_SHOULDER_CODEX_V80,
];
