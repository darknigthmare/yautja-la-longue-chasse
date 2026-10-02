import { HOMEWORLD_REGION_CONNECTIONS_V72, HOMEWORLD_GATEWAY_ART_V72, HOMEWORLD_CONNECTION_FURNITURE_V72,
  HOMEWORLD_CONNECTION_DIRECTION_SIGNS_V72, HOMEWORLD_CONNECTION_STREETS_V72,
  homeworldGatewayScaleV72, homeworldGatewayFootprintsV72, homeworldConnectionLengthV72 } from './homeworldRegionConnectionsV72';
import { HOMEWORLD_FURNITURE_ART_V72, homeworldFurnitureFootprintV72 } from './homeworldFurnitureV72';
import { HOMEWORLD_PROP_ART_V64, HOMEWORLD_GROUND_ART_V64 } from './homeworldArtV64';
import { HOMEWORLD_GEOMETRY_V64 } from './homeworldGeometryV64';
import type { HomeworldElementRecordV64 } from './homeworldElementCodexV64';

export interface HomeworldConnectionRecordV72 extends HomeworldElementRecordV64 {associatedElementIds:readonly string[]}
const sources=[
  {label:'Tiled · objets et collisions',url:'https://doc.mapeditor.org/en/stable/manual/objects/',
    note:'Principe de conception : origine des objets et collision au sol sont distinctes du cadre visible. Aucun lore ni dimension yautja n’en est déduit.'},
  {label:'Unity · tri individuel des sprites',url:'https://docs.unity.com/en-us/engine/6000.7/manual/unity2d/tilemaps/isometric-tilemap/create-isometric-tilemap',
    note:'Principe transféré au moteur du jeu : objets indépendants triés suivant leur ancrage Y ; la projection oblique existante n’est pas remplacée par une caméra isométrique.'},
];
const record=(value:Pick<HomeworldConnectionRecordV72,'id'|'label'|'category'>&Partial<HomeworldConnectionRecordV72>):HomeworldConnectionRecordV72=>({
  spaceId:'world',districtId:'connections-v72',position:{x:0,y:0,z:0},dimensions:{width:0,depth:0,height:0},footprint:null,
  door:null,lore:'original-adaptation',source:sources,constraints:[],asset:null,associatedElementIds:[],...value,
});
const names:Readonly<Record<keyof typeof HOMEWORLD_FURNITURE_ART_V72,string>>={
  'ceremonial-seat':'Siège cérémoniel','register-desk':'Poste des registres','artisan-bench':'Établi de calibration',
  'treatment-couch':'Couche de soins','training-gong':'Gong du dojo','clothing-rack':'Support de parures',
  'sealed-jars':'Réserves scellées','resin-lantern':'Veilleuse de résine','meal-table':'Table commune',
  'convoy-crates':'Caisses du convoi','clan-banner':'Marque de maison','stone-bench':'Banc de halte',
};
const gates=HOMEWORLD_REGION_CONNECTIONS_V72.flatMap(item=>{
  const art=HOMEWORLD_GATEWAY_ART_V72[item.artId],scale=homeworldGatewayScaleV72(item),feet=homeworldGatewayFootprintsV72(item);
  const common={districtId:`connection:${item.regionId}`,position:{...item.threshold,z:0},asset:art.src,
    door:{threshold:{...item.threshold},approach:{...item.arrival},clearWidth:item.clearWidth,
      clearHeight:(art.opening.bottom-art.opening.top)*scale,paintedSocket:{...art.opening,pivot:art.pivot,sourceRect:art.sourceRect,scale}},
    constraints:[item.note,
      `Cellule ${item.artId} : ${art.sourceRect.x}, ${art.sourceRect.y}, ${art.sourceRect.width} × ${art.sourceRect.height} px ; pivot local ${art.pivot.x}, ${art.pivot.y}.`,
      `Largeur du passage ${item.clearWidth} u ; échelle uniforme ${scale.toFixed(5)}. Les deux bases latérales ont une profondeur au sol estimée de 90 u.`,
      'Portique original OpenAI, pas une reproduction 1:1 d’un monument officiel. Les source PNG et leur alpha restent inchangés.',
      'Le repère urbain est directionnel. Le vrai départ se trouve sous ce portique, relié physiquement aux rues.',
      'Aucune nouvelle autorisation : formation, Premières Pistes et rapport de Verre pour la Réserve restent requis par les actions existantes. Les enquêtes Ash/Glass gardent leurs autorisations distinctes.',
      'Interagir au seuil ouvre les actions existantes. Le codex, les sols, les lumières et les meubles ne téléportent pas et ne récompensent pas.',
    ]};
  return [record({...common,id:`gateway-v72:${item.regionId}`,label:`Portique · ${item.name}`,category:'building',
    dimensions:{width:art.alphaBounds.width*scale,depth:90,height:Math.max(0,art.alphaBounds.height*scale-90*HOMEWORLD_GEOMETRY_V64.depthScale)},
    associatedElementIds:[`connection-door-v72:${item.regionId}`,`connection-floor-v72:${item.regionId}`,`direction-v72:${item.regionId}`,...feet.map(f=>f.id)]}),
  record({...common,id:`connection-door-v72:${item.regionId}`,label:`Départ · ${item.name}`,category:'door',
    dimensions:{width:item.clearWidth,depth:195,height:(art.opening.bottom-art.opening.top)*scale},
    associatedElementIds:[`gateway-v72:${item.regionId}`,`point:region-${item.regionId}`]}),
  ...feet.map(foot=>record({...common,id:foot.id,label:`Appui ${foot.id.endsWith('left')?'gauche':'droit'} · ${item.name}`,category:'prop',door:null,
    position:{x:(foot.left+foot.right)/2,y:foot.bottom,z:0},footprint:foot,
    dimensions:{width:foot.right-foot.left,depth:foot.bottom-foot.top,height:Math.max(0,art.alphaBounds.height*scale-90*HOMEWORLD_GEOMETRY_V64.depthScale)},
    associatedElementIds:[`gateway-v72:${item.regionId}`],constraints:[...common.constraints,
      'Volume latéral solide ; ne jamais bloquer le passage central avec une borne. Ancrage au bord avant de l’appui natif.']}))];
});
const floors=HOMEWORLD_REGION_CONNECTIONS_V72.map(item=>{
  const segments=HOMEWORLD_CONNECTION_STREETS_V72.filter(s=>s.id.startsWith(`connection-v72:${item.regionId}:`));
  const points=segments.flatMap(s=>s.polygon),left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x));
  const top=Math.min(...points.map(p=>p.y)),bottom=Math.max(...points.map(p=>p.y));
  return record({id:`connection-floor-v72:${item.regionId}`,label:`Raccord au sol · ${item.name}`,category:'floor',districtId:`connection:${item.regionId}`,
    position:{x:left,y:top,z:0},dimensions:{width:right-left,depth:bottom-top,height:0},asset:HOMEWORLD_GROUND_ART_V64.src,
    associatedElementIds:[`gateway-v72:${item.regionId}`,...segments.map(s=>`street:${s.id}`)],
    constraints:[`Chemin de ${Math.round(homeworldConnectionLengthV72(item))} u soit ${(homeworldConnectionLengthV72(item)*.023).toFixed(1)} m selon la convention du jeu ; largeur ${item.clearWidth} u.`,
      'Dimensions : boîte englobante du réseau, pas un rectangle entièrement praticable. Chaque capsule de segment et le parvis sont les vrais polygones du terrain.',
      `Support projeté une fois à 35°, matériau ${item.material}. Les appuis verticaux gardent leur échelle uniforme.`,
      'Le raccord rejoint un point praticable de la cité ; tout le chemin jusqu’à l’arrivée se marche avec le volume entier du héros.',
      'La corniche se poursuit dans le trajet régional déjà jouable. Aucun pont ne flotte sur une rue et aucun ravin fictif n’est posé sous la cité.',
      `Polygones : ${segments.map(s=>`${s.id} [${s.polygon.map(p=>`${p.x.toFixed(1)};${p.y.toFixed(1)}`).join(' / ')}]`).join(' | ')}.`,
    ]});
});
const furniture=HOMEWORLD_CONNECTION_FURNITURE_V72.map(item=>{
  const art=HOMEWORLD_FURNITURE_ART_V72[item.artId],scale=item.scale??1;
  return record({id:item.id,label:`${names[item.artId]} · ${item.regionId}`,category:'prop',districtId:`connection:${item.regionId}`,
    position:{x:item.x,y:item.y,z:0},footprint:homeworldFurnitureFootprintV72(item),asset:art.src,
    dimensions:{width:art.footprintWorld.width*scale,depth:art.footprintWorld.depth*scale,
      height:Math.max(0,(art.heightWorld-art.footprintWorld.depth*HOMEWORLD_GEOMETRY_V64.depthScale)*scale)},
    associatedElementIds:[`gateway-v72:${item.regionId}`,`connection-floor-v72:${item.regionId}`],
    constraints:[art.lore,`Cellule ${item.artId} : ${art.sourceRect.x}, ${art.sourceRect.y}, ${art.sourceRect.width} × ${art.sourceRect.height} px ; pivot ${art.pivot.x}, ${art.pivot.y}.`,
      `Échelle uniforme ${scale}. Empreinte mesurée pour le support du jeu, non métrique canonique. Les bases s’étendent derrière le pivot avant Y.`,
      'Meuble d’épaule réellement séparé du portique ; volume solide commun au rendu et à la physique, hors circulation.',
      'Aucune prime, collecte, guérison, commerce ou permission nouvelle. Aucun obstacle ajouté dans une maçonnerie existante.',
      'Native PNG transparent conservé ; tri par Y et atténuation seulement quand la silhouette masque le héros.']});
});
const signs=HOMEWORLD_CONNECTION_DIRECTION_SIGNS_V72.map(sign=>{
  const art=HOMEWORLD_PROP_ART_V64.beacon;
  return record({id:sign.id,label:`Panneau de direction · ${sign.label}`,category:'prop',districtId:`connection:${sign.regionId}`,
    position:{x:sign.x,y:sign.y,z:0},asset:art.src,
    dimensions:{...art.footprintWorld,height:art.heightWorld-art.footprintWorld.depth*HOMEWORLD_GEOMETRY_V64.depthScale},
    footprint:{left:sign.x-art.footprintWorld.width/2,right:sign.x+art.footprintWorld.width/2,top:sign.y-art.footprintWorld.depth,bottom:sign.y},
    associatedElementIds:[`gateway-v72:${sign.regionId}`,`connection-door-v72:${sign.regionId}`],
    constraints:['Ancienne borne native conservée au même ancrage. Ce panneau indique le départ physique extérieur et n’offre aucune interaction de voyage.',
      'Appui solide propre à la borne, distinct de l’ouverture centrale du nouveau portique. Aucun téléporteur urbain.',
      'Le texte est un repère d’interface humain ; les motifs natifs ne sont pas déclarés comme alphabet yautja canonique.']});
});
export const HOMEWORLD_CONNECTION_CODEX_V72:readonly HomeworldConnectionRecordV72[]=[...gates,...floors,...furniture,...signs];
