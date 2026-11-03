import type {HomeworldFurnitureArtIdV72} from './homeworldFurnitureV72';
import {homeworldBuildingDoorwayV64,homeworldBuildingGroundFrameV76,type HomeworldGeometryBuildingV64} from './homeworldGeometryV64';
export type Arrangement={artId:HomeworldFurnitureArtIdV72;side:-1|1;scale:number;purpose:string};
const a=(artId:HomeworldFurnitureArtIdV72,side:-1|1,scale:number,purpose:string):Arrangement=>({artId,side,scale,purpose});
export const HOMEWORLD_CIVIC_FRONTAGE_RECIPES_V76:Readonly<Record<string,readonly Arrangement[]>>={
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

/** Domestic oblique façades need the same physical furnishings as their
 * renderer. Keep the fallback here so collision never omits a visible module. */
export function homeworldFrontageRecipeV76(buildingId:string,variant:'civic'|'rest'|'meal'|'storage'):readonly Arrangement[]{
 return HOMEWORLD_CIVIC_FRONTAGE_RECIPES_V76[buildingId]??[variant==='storage'
  ?a('convoy-crates',1,.38,'Réserves fermées devant le logement')
  :variant==='meal'?a('sealed-jars',-1,.45,'Contenants fermés du foyer')
  :a('stone-bench',1,.32,'Banc bas à l’abri de la façade')];
}


/** Legacy modules remain on their measured masonry bay. Angled façades move
 * their two old fixtures onto separate physical forecourts outside the opening.
 * This pure recipe is shared by the renderer, collision and codex. */
export function homeworldFrontagePlacementV76(building:HomeworldGeometryBuildingV64,arrangement:Arrangement){
 // The dock's left register leaves the western public passage open, while the
 // right delivery crate avoids the neighboring house. Kesh's authored route at
 // x265, source scales and the complete useful doorway stay intact.
 let ratio=.36;
 if(building.art?.groundFrame&&building.id==='dock-control')ratio=arrangement.side===-1?.28:.44;
 // Leave a genuine eastward route from the former Three Winds sign, rather
 // than trapping its approach between the native wall and an entry lantern.
 if(building.art?.groundFrame&&building.id==='rite-sanctum'&&arrangement.side===1)ratio=.48;
 const door=homeworldBuildingDoorwayV64(building),u=arrangement.side*(building.footprint?.width??building.width)*ratio;
 if(!building.art?.groundFrame)return {x:building.x+u,y:building.y+door.frontOffset};
 const frame=homeworldBuildingGroundFrameV76(building);
 let frontDistance=100;
 if(building.id==='dock-control'&&arrangement.side===-1)frontDistance=80;
 if(building.id==='rite-sanctum'&&arrangement.side===1)frontDistance=140;
 // The workshop's delivery crates occupy a second row ahead of the original
 // civic chest; their complete physical bases must never overlap.
 if(building.id==='convoy-workshop'&&arrangement.side===1)frontDistance=160;
 const v=door.frontOffset+frontDistance;
 return {x:building.x+frame.tangent.x*u+frame.normal.x*v,y:building.y+frame.tangent.y*u+frame.normal.y*v};
}

/** Ground-native beacon anchors. These preserve the whole 48×45 footprint,
 * clear the native opening and leave the dock's western escape lane open.
 * Distances are world units along the measured foundation, never CSS offsets. */
export const HOMEWORLD_BEACON_GROUND_PLACEMENTS_V76:Readonly<Record<string,{u:number;frontDistance:number}>>={
 'dock-control':{u:270,frontDistance:145},
 'trophy-mausoleum':{u:-100,frontDistance:150},
 'rite-sanctum':{u:110,frontDistance:145},
 'convoy-workshop':{u:100,frontDistance:140},
 'convoy-store':{u:160,frontDistance:80},
 'rampart-watch':{u:100,frontDistance:135},
};

export function homeworldBeaconPlacementV76(building:HomeworldGeometryBuildingV64){
 const placement=HOMEWORLD_BEACON_GROUND_PLACEMENTS_V76[building.id];
 if(!building.art?.groundFrame||!placement)return {x:building.x+(building.id==='trophy-mausoleum'?-155:155),y:building.y+110};
 const frame=homeworldBuildingGroundFrameV76(building),v=frame.vFront+placement.frontDistance;
 return {x:building.x+frame.tangent.x*placement.u+frame.normal.x*v,
  y:building.y+frame.tangent.y*placement.u+frame.normal.y*v};
}

/** The original mausoleum bench occupies its native eastern waiting bay, so
 * the western paving can meet the Ash gateway aperture. Keep its original
 * 150×40 ground volume and preserve every other historical bench anchor. */
export function homeworldBenchPlacementV76(building:HomeworldGeometryBuildingV64){
 if(building.id==='trophy-mausoleum'&&building.art?.groundFrame){
  const frame=homeworldBuildingGroundFrameV76(building),u=100,v=frame.vFront+180;
  return {x:building.x+frame.tangent.x*u+frame.normal.x*v,
   y:building.y+frame.tangent.y*u+frame.normal.y*v};
 }
 return {x:building.x+(building.id==='training-hall'?360:-185),
  y:building.y+(building.id==='training-hall'?102:150)};
}
