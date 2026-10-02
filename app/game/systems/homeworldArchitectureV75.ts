import {HOMEWORLD_BUILDINGS} from './homeworldCity';
import {HOMEWORLD_INTERIORS_V64} from './homeworldInteriorsV64';
import {HOMEWORLD_FURNITURE_ART_V72,homeworldFurnitureFootprintV72,type HomeworldFurnitureArtIdV72} from './homeworldFurnitureV72';
import {homeworldBuildingDoorwayV64,homeworldBuildingFootprintV64} from './homeworldGeometryV64';
import {HOMEWORLD_ARCHITECTURE_IDENTITIES_V75,homeworldBuildingIdentityV75} from './homeworldArchitectureArtV75';
import type {HomeworldElementRecordV64} from './homeworldElementCodexV64';

export interface HomeworldFrontageItemV75 {
  id:string; buildingId:string; artId:HomeworldFurnitureArtIdV72;
  x:number;y:number;scale:number;purpose:string;
}
type Arrangement={artId:HomeworldFurnitureArtIdV72;side:-1|1;scale:number;purpose:string};
const a=(artId:HomeworldFurnitureArtIdV72,side:-1|1,scale:number,purpose:string):Arrangement=>({artId,side,scale,purpose});
const civic:Readonly<Record<string,readonly Arrangement[]>>={
 'throne-audience':[a('clan-banner',-1,.6,'Marque de la délégation locale'),a('stone-bench',1,.55,'Attente avant audience')],
 'training-hall':[a('training-gong',-1,.55,'Instrument du dojo'),a('clothing-rack',1,.5,'Parures déposées à l’entrée')],
 'memory-vault':[a('register-desk',-1,.5,'Registres confiés aux archives'),a('stone-bench',1,.5,'Attente de consultation')],
 'deep-forge':[a('artisan-bench',-1,.55,'Poste de finition sous l’auvent'),a('sealed-jars',1,.6,'Réserves scellées de l’atelier')],
 'clan-lodge':[a('stone-bench',-1,.5,'Attente des visiteurs'),a('resin-lantern',1,.7,'Veilleuse d’accueil')],
 'market-armory':[a('clothing-rack',-1,.55,'Présentation des parures'),a('convoy-crates',1,.6,'Livraisons fermées du comptoir')],
 'dock-control':[a('register-desk',-1,.55,'Documents de convoyage'),a('convoy-crates',1,.55,'Colis en attente de contrôle')],
 'market-canopy':[a('sealed-jars',-1,.7,'Contenants du marché'),a('clothing-rack',1,.6,'Parures sous l’auvent')],
 'undercity-refuge':[a('stone-bench',-1,.5,'Halte à couvert'),a('resin-lantern',1,.6,'Repère lumineux du refuge')],
 'trophy-mausoleum':[a('resin-lantern',-1,.65,'Veilleuse de la salle des prises'),a('stone-bench',1,.5,'Attente des visiteurs')],
 'enforcer-bastion':[a('clan-banner',-1,.6,'Insigne du poste local'),a('convoy-crates',1,.55,'Réserves fermées du poste')],
 'pit-gate':[a('training-gong',-1,.6,'Instrument d’annonce'),a('stone-bench',1,.55,'Attente des spectateurs')],
 'rite-sanctum':[a('clan-banner',-1,.6,'Tenture du sanctuaire local'),a('resin-lantern',1,.7,'Veilleuse d’accueil')],
 'convoy-workshop':[a('artisan-bench',-1,.6,'Réglage sous le porche latéral'),a('convoy-crates',1,.6,'Pièces de convoyage scellées')],
 'convoy-store':[a('convoy-crates',-1,.65,'Contenants en transit'),a('sealed-jars',1,.7,'Réserves scellées')],
 'convoy-south-shelter':[a('stone-bench',-1,.55,'Repos des convoyeurs'),a('resin-lantern',1,.7,'Veilleuse du relais')],
 'rampart-north-lodge':[a('register-desk',-1,.5,'Relève et registre du poste'),a('stone-bench',1,.55,'Attente de relève')],
 'rampart-watch':[a('clan-banner',-1,.6,'Marque de la vigie locale'),a('sealed-jars',1,.6,'Réserves scellées de la vigie')],
 'rampart-south-lodge':[a('stone-bench',-1,.55,'Halte des patrouilles'),a('resin-lantern',1,.7,'Veilleuse du relais')],
};

/** Every independent raster fixture occupies an already-solid lateral frontage.
 * Its full volume stays in the building envelope, outside the door channel;
 * no new invisible outdoor colliders or route exceptions are introduced. */
export const HOMEWORLD_FRONTAGE_ITEMS_V75:readonly HomeworldFrontageItemV75[]=HOMEWORLD_BUILDINGS.flatMap(building=>{
 const room=HOMEWORLD_INTERIORS_V64.find(candidate=>candidate.buildingId===building.id)!;
 const arrangements=civic[building.id]??[room.variant==='storage'
  ?a('convoy-crates',1,.38,'Réserves fermées devant le logement')
  :room.variant==='meal'?a('sealed-jars',-1,.45,'Contenants fermés du foyer')
  :a('stone-bench',1,.32,'Banc bas à l’abri de la façade')];
 const door=homeworldBuildingDoorwayV64(building),width=building.footprint.width;
 return arrangements.map((arrangement,index)=>({id:`v75-frontage:${building.id}:${index+1}`,buildingId:building.id,
  artId:arrangement.artId,scale:arrangement.scale,purpose:arrangement.purpose,
  x:building.x+arrangement.side*width*.36,y:building.y+door.frontOffset}));
});

const sources=[
 {label:'RPG Maker · concevoir une ville',url:'https://www.rpgmakerweb.com/blog/mapping-towns',note:'Identité fonctionnelle, accès lisibles et matériaux cohérents ; aucune architecture yautja canonique n’est déduite.'},
 {label:'Unity · tri des sprites 2D',url:'https://docs.unity3d.com/2021.1/Documentation/Manual/2DSorting.html',note:'Tri au pivot de sol ; la projection à35° reste la convention de notre projet.'},
];
export const HOMEWORLD_ARCHITECTURE_CODEX_V75:readonly HomeworldElementRecordV64[]=[
 ...Object.keys(HOMEWORLD_ARCHITECTURE_IDENTITIES_V75).map(id=>{
  const building=HOMEWORLD_BUILDINGS.find(candidate=>candidate.id===id)!,identity=homeworldBuildingIdentityV75(id)!;
  return {id:'v75-facade:'+id,label:identity.title,category:'building' as const,districtId:building.districtId,spaceId:'world',
   position:{x:building.x,y:building.y,z:0},dimensions:{...building.footprint,height:building.wallHeight},
   footprint:homeworldBuildingFootprintV64(building),door:homeworldBuildingDoorwayV64(building),asset:identity.art.src,
   lore:'original-adaptation' as const,source:sources,constraints:[
    'Façade native dédiée à la fonction '+identity.role+'. Toutes les sources historiques sont conservées.',
    'Cité originale : ni carte canonique1:1 ni institution universelle de l’espèce.',
    'Enveloppe570×340 et coordonnées de porte existantes conservées. Aucun nouveau service ou gain de progression.',
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
    'Pieds sur le bord avant réel de la fondation ; projection appliquée une fois et tri à cette profondeur.',
    'Emprise entièrement dans le volume latéral déjà solide du bâtiment ; aucune extension sur la voie publique et aucune exemption de collision.',
    'Porte et approche libres avec la marge corporelle complète. Contenant décoratif fermé, ni prise ni objet récupérable ni service implicite.']};
 }),
];
