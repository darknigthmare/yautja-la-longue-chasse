import {HOMEWORLD_ARCHITECTURE_IDENTITIES_V76} from './homeworldArchitectureArtV76';
import {HOMEWORLD_NATIVE_CATALOGUE_V81} from './homeworldNativeArchitectureV81';
import {HOMEWORLD_GEOMETRY_V64,homeworldBuildingGroundFrameV76,homeworldBuildingSpriteScaleV64,type HomeworldNativeBuildingArtV64} from './homeworldGeometryV64';

/** Eight separate native source drawings, no CSS reorientation or visitable
 * room invented. Parcels are recomposed for the complete adult-sized drawings;
 * a small old rectangle never forces the painted door to become miniature.
 * V83 authoring is unverified, and none of these locally authored institutions
 * or symbols is a canon-direct reproduction of Yautja Prime. */
const definitions=[
 {id:'lower-shelter-west',label:'Logement du clan des galeries',sourceBuildingId:'residence-clans-1',nativeId:'clan-residence-left',use:'shelter',variant:'hall',x:3025,y:3850,width:370,depth:278,purpose:'Façade habitée à l’ouest de la boucle ; front vers la halte et revers rocheux.'},
 {id:'lower-exchange-north',label:'Relais des registres des échanges',sourceBuildingId:'dock-control',nativeId:null,use:'exchange',variant:'archive',x:3660,y:3340,width:440,depth:262,purpose:'Contrôle des échanges au revers nord ; guichet de référence fermé, pas un nouveau service.'},
 {id:'lower-work-north',label:'Atelier de réglage des galeries',sourceBuildingId:'convoy-workshop',nativeId:null,use:'work',variant:'forge',x:4435,y:3355,width:460,depth:275,purpose:'Aile artisan entre maintenance et passage ; façade oblique vers la boucle des ateliers.'},
 {id:'lower-shelter-east',label:'Logement des artisans de relève',sourceBuildingId:'residence-forges-1',nativeId:'industrial-residence-right',use:'shelter',variant:'hall',x:4710,y:3615,width:400,depth:283,purpose:'Façade industrielle latérale au-dessus de la traversée, distincte du logement clanique.'},
 {id:'lower-halt-west',label:'Halte rituelle du refuge',sourceBuildingId:'rite-sanctum',nativeId:null,use:'rest',variant:'hall',x:3700,y:3925,width:390,depth:233,purpose:'Petit pavillon rituel fermé dans la poche entre boucle et traversée ; centre de la halte libre.'},
 {id:'lower-stock-east',label:'Dépôt des galeries orientales',sourceBuildingId:'convoy-store',nativeId:null,use:'logistics',variant:'gate',x:4680,y:4280,width:430,depth:257,purpose:'Stockage sur le revers oriental après la traversée, avant les citernes ; face logistique identifiable.'},
 {id:'lower-work-south',label:'Vigie technique des ateliers bas',sourceBuildingId:'rampart-watch',nativeId:null,use:'work',variant:'tower',x:3610,y:4520,width:390,depth:233,purpose:'Tour de veille technique au-dessus du travail chaud ; silhouette verticale au lieu d’une autre maison identique.'},
 {id:'lower-rest-south',label:'Mémorial de la cour commune',sourceBuildingId:'trophy-mausoleum',nativeId:null,use:'rest',variant:'archive',x:4050,y:4520,width:470,depth:280,purpose:'Pavillon de mémoire au revers de la cour commune ; axe social et allée de fret distincts.'},
] as const;

export const HOMEWORLD_URBAN_FACADE_PLANS_V83=definitions.map(plan=>{
 const art=(plan.nativeId?HOMEWORLD_NATIVE_CATALOGUE_V81.assets[plan.nativeId].art:HOMEWORLD_ARCHITECTURE_IDENTITIES_V76[plan.sourceBuildingId as keyof typeof HOMEWORLD_ARCHITECTURE_IDENTITIES_V76].art) as HomeworldNativeBuildingArtV64;
 const frame=art.groundFrame!,nativeWidth=Math.hypot(frame.frontRight.x-frame.frontLeft.x,(frame.frontRight.y-frame.frontLeft.y)/HOMEWORLD_GEOMETRY_V64.depthScale);
 const openingWidth=Math.hypot(frame.doorRight.x-frame.doorLeft.x,(frame.doorRight.y-frame.doorLeft.y)/HOMEWORLD_GEOMETRY_V64.depthScale);
 const adultScale=Math.max(128/frame.doorClearHeightPixels,80/openingWidth);
 const width=Math.max(plan.width,nativeWidth*adultScale),footprint={width,depth:plan.depth*width/plan.width};
 const building={id:'urban-v78:'+plan.id+':facade',x:plan.x,y:plan.y,width,height:0,footprint,art};
 const polygon=homeworldBuildingGroundFrameV76(building).polygon,scale=homeworldBuildingSpriteScaleV64(building);
 return{...plan,id:'urban-v78:'+plan.id,art,footprint,scale,polygon,
  bounds:{left:Math.min(...polygon.map(p=>p.x))-18,right:Math.max(...polygon.map(p=>p.x))+18,top:Math.min(...polygon.map(p=>p.y))-18,bottom:Math.max(...polygon.map(p=>p.y))+18},
  provenance:'LORE_COMPATIBLE_ORIGINAL' as const,sourceReuse:'EXISTING_NATIVE_SOURCE_REAUTHORED_LOT' as const,
  nativeStatus:'MEASURED_NATIVE_OBLIQUE_REUSE_V83' as const,
 };
});
