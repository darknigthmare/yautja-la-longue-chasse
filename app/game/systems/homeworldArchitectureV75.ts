import {HOMEWORLD_BUILDINGS} from './homeworldCity';
import {HOMEWORLD_INTERIORS_V64} from './homeworldInteriorsV64';
import {HOMEWORLD_FURNITURE_ART_V72,homeworldFurnitureFootprintV72,type HomeworldFurnitureArtIdV72} from './homeworldFurnitureV72';
import {homeworldBuildingDoorwayV64,homeworldBuildingFootprintV64} from './homeworldGeometryV64';
import {HOMEWORLD_ARCHITECTURE_IDENTITIES_V75,homeworldBuildingIdentityV75} from './homeworldArchitectureArtV75';
import type {HomeworldElementRecordV64} from './homeworldElementCodexV64';
import {HOMEWORLD_CIVIC_FRONTAGE_RECIPES_V76,homeworldFrontagePlacementV76,type Arrangement} from './homeworldFrontagePlacementsV76';
const a=(artId:HomeworldFurnitureArtIdV72,side:-1|1,scale:number,purpose:string):Arrangement=>({artId,side,scale,purpose});

export interface HomeworldFrontageItemV75 {
  id:string; buildingId:string; artId:HomeworldFurnitureArtIdV72;
  x:number;y:number;scale:number;purpose:string;
}
/** Original side-bay fittings keep their IDs and source pixels. The six V76
 * angled hosts use measured forecourts with independent physical volumes. */
export const HOMEWORLD_FRONTAGE_ITEMS_V75:readonly HomeworldFrontageItemV75[]=HOMEWORLD_BUILDINGS.flatMap(building=>{
 const room=HOMEWORLD_INTERIORS_V64.find(candidate=>candidate.buildingId===building.id)!;
 const arrangements=HOMEWORLD_CIVIC_FRONTAGE_RECIPES_V76[building.id]??[room.variant==='storage'
  ?a('convoy-crates',1,.38,'Réserves fermées devant le logement')
  :room.variant==='meal'?a('sealed-jars',-1,.45,'Contenants fermés du foyer')
  :a('stone-bench',1,.32,'Banc bas à l’abri de la façade')];
 return arrangements.map((arrangement,index)=>({id:`v75-frontage:${building.id}:${index+1}`,buildingId:building.id,
  artId:arrangement.artId,scale:arrangement.scale,purpose:arrangement.purpose,
  ...homeworldFrontagePlacementV76(building,arrangement)}));
});

const sources=[
 {label:'RPG Maker · concevoir une ville',url:'https://www.rpgmakerweb.com/blog/mapping-towns',note:'Identité fonctionnelle, accès lisibles et matériaux cohérents ; aucune architecture yautja canonique n’est déduite.'},
 {label:'Unity · tri des sprites 2D',url:'https://docs.unity3d.com/2021.1/Documentation/Manual/2DSorting.html',note:'Tri au pivot de sol ; la projection à35° reste la convention de notre projet.'},
];
export const HOMEWORLD_ARCHITECTURE_CODEX_V75:readonly HomeworldElementRecordV64[]=[
 ...Object.keys(HOMEWORLD_ARCHITECTURE_IDENTITIES_V75).map(id=>{
  const building=HOMEWORLD_BUILDINGS.find(candidate=>candidate.id===id)!,identity=homeworldBuildingIdentityV75(id)!;
  const historical={...building,art:identity.art};
  return {id:'v75-facade:'+id,label:(building.art.groundFrame?'Ancienne vue conservée · ':'')+identity.title,category:'building' as const,districtId:building.districtId,spaceId:'world',
   position:{x:building.x,y:building.y,z:0},dimensions:{...building.footprint,height:identity.art.wallHeightWorld},
   footprint:homeworldBuildingFootprintV64(historical),door:homeworldBuildingDoorwayV64(historical),asset:identity.art.src,
   lore:'original-adaptation' as const,source:sources,constraints:[
    'Façade native dédiée à la fonction '+identity.role+'. Toutes les sources historiques sont conservées.',
    building.art.groundFrame?'Fiche historique de la vue V75 ; la fiche V76 liée décrit la façade oblique actuellement utilisée.':'Vue V75 utilisée dans la cité actuelle.',
    'Cité originale : ni carte canonique1:1 ni institution universelle de l’espèce.',
    'Enveloppe570×340 et identifiants de porte conservés. Implantation dérivée du plan courant ; aucun nouveau service ou gain de progression.',
    `Source ${identity.art.sourceWidth}×${identity.art.sourceHeight}, alpha mesurée au seuil200, SHA256 ${identity.art.sha256}.`,
    `Seuil peint ${JSON.stringify(identity.art.threshold)} au bord avant du sol de porte ; fondation séparée ${JSON.stringify(identity.art.foundationFront)}. Aucun override logique.`,
    'La largeur de porte mesure le passage des pieds entre les jambages. Les portails se rétrécissent plus haut ; le linteau n’est pas présenté comme cette largeur.',
   ]};
 }),
 ...HOMEWORLD_FRONTAGE_ITEMS_V75.map(item=>{
  const building=HOMEWORLD_BUILDINGS.find(candidate=>candidate.id===item.buildingId)!,art=HOMEWORLD_FURNITURE_ART_V72[item.artId];
  return {id:item.id,label:item.purpose,category:'prop' as const,districtId:building.districtId,spaceId:'world',
   position:{x:item.x,y:item.y,z:0},dimensions:{width:art.footprintWorld.width*item.scale,depth:art.footprintWorld.depth*item.scale,height:art.heightWorld*item.scale},
   footprint:homeworldFurnitureFootprintV72(item),door:null,asset:art.src,lore:'original-adaptation' as const,source:sources,
   constraints:[art.lore,`Module natif ${item.artId}, échelle uniforme ${item.scale}; cellule ${JSON.stringify(art.sourceRect)}, pivot ${JSON.stringify(art.pivot)}; SHA256 ${art.sha256}.`,
    building.art.groundFrame ? 'Module historique réimplanté dans une travée de parvis V76, avec volume physique indépendant hors du passage oblique.' : 'Pieds sur le bord avant réel de la fondation ; projection appliquée une fois et tri à cette profondeur.',
    building.art.groundFrame ? 'Le même contrat pur détermine position native, collision et codex. Porte, côtés et murs n’accordent aucun passage caché.' : 'Emprise entièrement dans le volume latéral déjà solide du bâtiment ; aucune extension sur la voie publique et aucune exemption de collision.',
    'Porte et approche libres avec la marge corporelle complète. Contenant décoratif fermé, ni prise ni objet récupérable ni service implicite.']};
 }),
];
