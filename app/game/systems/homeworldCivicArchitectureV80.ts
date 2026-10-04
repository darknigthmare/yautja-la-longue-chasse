import {HOMEWORLD_BUILDINGS_V77,homeworldLevelV77} from './homeworldWorldV77';
import {homeworldInteriorForBuildingV64,HOMEWORLD_INTERIOR_BINDINGS_V64} from './homeworldInteriorsV64';
import {homeworldBuildingGroundFrameV76,homeworldBuildingDoorwayV64,homeworldBuildingFootprintV64} from './homeworldGeometryV64';
import {HOMEWORLD_CIVIC_PROPS_V80} from './homeworldCivicDecorV80';
import type {HomeworldElementRecordV64} from './homeworldElementCodexV64';

/** Relates each true doorway to the existing interior and native foundation.
 * This is an inspection contract, not a new floor, room or campaign service.
 * In particular, the audience room is its public wing, not a complete palace. */
export const HOMEWORLD_CIVIC_ARCHITECTURE_V80=HOMEWORLD_BUILDINGS_V77.map(building=>{
 const room=homeworldInteriorForBuildingV64(building.id)!;
 return{buildingId:building.id,levelId:building.levelId,exterior:{width:building.footprint.width,depth:building.footprint.depth,height:building.wallHeight},
  foundation:homeworldBuildingFootprintV64(building),groundFrame:homeworldBuildingGroundFrameV76(building),doorway:homeworldBuildingDoorwayV64(building),
  nativeView:building.art.groundFrame?'MEASURED_NATIVE_OBLIQUE' as const:'EXISTING_NATIVE_FRONTAL' as const,
  interior:{title:room.title,width:room.width,depth:room.depth,spawn:room.spawn,exit:room.exit,
   zones:(room.zones??[]).map(z=>z.label),services:HOMEWORLD_INTERIOR_BINDINGS_V64[building.id]??[],
   fixtures:[...room.props.map(p=>p.id),...(room.furniture??[]).map(p=>p.id),...(room.orientedDecorV76??[]).map(p=>p.id)]},
  civicFrontageIds:HOMEWORLD_CIVIC_PROPS_V80.filter(p=>p.buildingId===building.id).map(p=>p.id),
 };
});
export const HOMEWORLD_CIVIC_ARCHITECTURE_CODEX_V80:readonly HomeworldElementRecordV64[]=HOMEWORLD_CIVIC_ARCHITECTURE_V80.map(plan=>{
 const building=HOMEWORLD_BUILDINGS_V77.find(b=>b.id===plan.buildingId)!,room=plan.interior;
 return{id:'civic-v80:building-context:'+building.id,label:'Gabarit · '+building.label,category:'panel',districtId:building.districtId,spaceId:'world',
  position:{x:building.x,y:building.y,z:homeworldLevelV77(building.levelId).elevation},dimensions:plan.exterior,footprint:null,door:null,
  lore:'original-adaptation',asset:building.art.src,source:[{label:'Façade et intérieur réellement montés',url:building.art.src,note:'Plan local original ; correspondance de porte conservée, pas de carte canonique.'}],
  constraints:[`Enveloppe ${plan.exterior.width}×${plan.exterior.depth}; intérieur ${room.width}×${room.depth}; niveau ${plan.levelId}.`,
   `Vue ${plan.nativeView}; seuil réel (${plan.doorway.threshold.x},${plan.doorway.threshold.y}); approche (${plan.doorway.approach.x},${plan.doorway.approach.y}).`,
   `Espaces existants: ${room.zones.join(' / ')||room.title}; ${room.fixtures.length} éléments intérieurs conservés.`,
   `${plan.civicFrontageIds.length} objets V80 de devanture; sols, empreintes et trajectoires restent contrôlés séparément.`,
   'Ce panneau ne crée aucun accès, service, gain ni intérieur supplémentaire.',
   building.id==='throne-audience'?'Palais monumental natif V81 et aile publique visitable ; suites privées complètes et cinématiques royales non produites.':building.id==='rite-sanctum'?'Conseil monumental natif V81 et galerie publique visitable ; seules les zones effectivement montées sont décrites.':'Le plan décrit uniquement la pièce ou les zones actuellement visitables.',
   plan.nativeView==='EXISTING_NATIVE_FRONTAL'?'Façade frontale conservée ; aucune nouvelle vue oblique ou architecture achevée affirmée.':'Angle dessiné nativement et appuis mesurés ; aucune rotation CSS.']};
});
