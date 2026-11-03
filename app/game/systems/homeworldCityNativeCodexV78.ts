import type {HomeworldElementRecordV64} from './homeworldElementCodexV64';
import {HOMEWORLD_CITY_GENERATED_PROPS_V78} from './homeworldStreetModulesV78';
import {HOMEWORLD_CITY_NATIVE_ART_V78} from './homeworldCityNativeArtV78';
import {homeworldCityNativePaintV78} from './homeworldCityNativePlacementV78';
import {HOMEWORLD_GEOMETRY_V64} from './homeworldGeometryV64';
const labels={'market-stall-right':'Étal couvert des échanges','forge-workstation-left':'Poste de forge civil',
 'archive-shelf-right':'Rayonnage de relevés techniques','terrace-retaining-front':'Mur de soutènement de cour',
 'port-cargo-sorting-cart':'Chariot de tri du port','clan-common-table-left':'Table commune de la cour basse',
 'civic-water-cistern-right':'Citerne collective'};
export const HOMEWORLD_CITY_NATIVE_CODEX_V78:readonly HomeworldElementRecordV64[]=HOMEWORLD_CITY_GENERATED_PROPS_V78.map(item=>{
 const art=HOMEWORLD_CITY_NATIVE_ART_V78[item.artId],paint=homeworldCityNativePaintV78(item),poly=paint.polygon;
 const footprint={left:Math.min(...poly.map(p=>p.x)),right:Math.max(...poly.map(p=>p.x)),top:Math.min(...poly.map(p=>p.y)),bottom:Math.max(...poly.map(p=>p.y)),polygon:poly};
 const width=footprint.right-footprint.left,depth=footprint.bottom-footprint.top;
 return{id:item.id,label:labels[item.artId],category:'prop',districtId:item.districtId,spaceId:'world',
  position:{x:item.x,y:item.y,z:paint.elevation},dimensions:{width,depth,height:Math.max(0,art.heightWorld-depth*HOMEWORLD_GEOMETRY_V64.depthScale)},
  footprint,door:null,lore:'original-adaptation',asset:art.src,
  source:[{label:'Source OpenAI originale V78',url:art.src,note:'SHA256 '+art.sha256+' ; dimensions '+art.sourceWidth+'×'+art.sourceHeight+'.'}],
  constraints:['Source PNG indépendante entière ; échelle uniforme '+paint.scale+', aucune rotation, miroir, découpe ou modification des pixels.',
   'Appuis visibles relus sur la source ; enveloppe convexe conservatrice. Tolérance de mesure12px déclarée, pas une calibration3D ou une perspective canonique1:1.',
   'Dessin, solide SAT et codex utilisent le même pivot et les mêmes coordonnées de niveau '+item.levelId+'. Support entier contrôlé sur le sol réel.',
   '98routines,14circuits décoratifs,43approches de portes et raccords préservés. Cet élément n’ajoute ni porte ni service, sauvegarde, récompense ou mission.',
   'Stock, nourriture, outils, luminaires et glyphes fusionnés dans ce module sont des adaptations originales ; pas des sous-props indépendants ou des armes canoniques.',
   'Aucune animation native de ce PNG ; chargement exact dimensions/erreur/retry relié au vrai Hub. Réception visuelle navigateur encore requise.']};
});
