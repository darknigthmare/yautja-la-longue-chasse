import type { SaveGame, HunterBodyMorphId, DreadStyleId } from '../types';
import { getChronicleRank } from './clanChronicle';
import { HOMEWORLD_ACTOR, pointInHomeworldPolygon, stepHomeworldActorOnFloor, type HomeworldActor, type HomeworldVec2 } from './homeworldCity';
import { HOMEWORLD_BUILDING_ART_V64, HOMEWORLD_PROP_ART_V64 } from './homeworldArtV64';
import { homeworldBuildingFootprintV64, homeworldBuildingDoorwayV64, HOMEWORLD_GEOMETRY_V64 } from './homeworldGeometryV64';
import { HOMEWORLD_PASSAGE_BRIDGE_V67, homeworldPassageBridgeDepthV67 } from './homeworldPassageV67';

export const HOMEWORLD_REGION_IDS_V68 = ['ash-marches', 'glass-desert', 'pillar-jungle', 'luminous-marshes', 'storm-chain', 'leviathan-coast', 'thermal-caves', 'cold-crown', 'first-city-ruins', 'forbidden-reserve'] as const;
export type HomeworldRegionIdV68 = typeof HOMEWORLD_REGION_IDS_V68[number];
export type RegionFieldActionV68 = 'survey' | 'recover' | 'track' | 'challenge' | 'ward' | 'report';
export interface RegionFieldEventV68 {
  version: 1; regionId: HomeworldRegionIdV68; runId: string; tick: number;
  action: RegionFieldActionV68; siteId: string; targetId: string;
  walked: number; actor: HomeworldVec2; trailCount: number; evaded: number; armed: false;
  observedTicks: number; touches: number; interventions: number;
}
export interface HomeworldRegionStateV68 {
  version: 1; regionId: HomeworldRegionIdV68; runId: string; tick: number; walked: number;
  zone: 'passage' | 'village' | 'interior'; direction: 'outbound' | 'return'; actor: HomeworldActor;
  routeVisited: number[]; villageEntered: boolean; buildingId: string | null;
  visitedBuildings: string[]; greeted: string[]; traces: string[];
  recovered: boolean; reported: boolean; evaded: number; hazardArmed: boolean;
  observedTicks: number; protectedPosts: string[];
  fauna: { x: number; y: number; phase: 'quiet' | 'warning' | 'charge' | 'recovery' | 'retreated'; ticks: number; targetY: number; evaded: number; touches: number; touchedThisRecovery: boolean; hitThisCharge: boolean };
  pendingFieldEvent: RegionFieldEventV68 | null; eventReceipts: RegionFieldActionV68[];
  status: 'walking' | 'at-city';
}
export interface RegionBuildingV68 {
  id: string; label: string; x: number; y: number; width: number; height: number;
  artId: keyof typeof HOMEWORLD_BUILDING_ART_V64; art: typeof HOMEWORLD_BUILDING_ART_V64[keyof typeof HOMEWORLD_BUILDING_ART_V64];
  footprint: { width: number; depth: number }; role: 'hall' | 'forge' | 'clinic' | 'archive' | 'residence';
}
export interface RegionResidentV68 extends HomeworldVec2 {
  id: string; name: string; role: string; greeting: string; morphId: HunterBodyMorphId; dreadStyleId: DreadStyleId;
  route: readonly HomeworldVec2[]; speed: number;
}
export interface RegionDefinitionV68 {
  id: HomeworldRegionIdV68; name: string; village: string; clan: string; routeTitle: string;
  panorama: string; accent: string; groundColor: string; hazard: string; guideName: string;
  introduction: string; traceNotes: readonly [string, string, string]; cacheNote: string;
  route: readonly (HomeworldVec2 & { name: string })[];
  buildings: readonly RegionBuildingV68[]; residents: readonly RegionResidentV68[];
  props: readonly (HomeworldVec2 & { id: string; artId: keyof typeof HOMEWORLD_PROP_ART_V64 })[];
}

const specifications = [
  ['ash-marches', 'Marches de Cendre', 'Halte des Porte-Cendres', 'Maisons des Braises', 'Corniche des convoyeurs', '/game/homeworld/v67/ash-causeway-vista.png', '#da9a60', '#443830', 'Souffle de cendres', 'Rha’tek', 'Les familles abritent les porteurs derrière des murs de basalte. Les ateliers entretiennent les balises de la corniche ; les prises restent enregistrées au nom de leur chasseur.', ['Une ornière récente coupe les traces anciennes du convoi.', 'La cendre protégée par le rocher conserve une marque de traîneau.', 'La balise porte le sceau de la halte : elle ne constitue pas un trophée.'], 'Relever le module de signalisation avant que les cendres ne recouvrent son socle.'],
  ['glass-desert', 'Désert de Verre', 'Village des Citernes', 'Peuple des Citernes', 'Arches du Départ', '/game/homeworld/v67/glass-processional-vista.png', '#dbb979', '#514537', 'Salve de poussière de verre', 'Vek’shan', 'L’eau circule sous la place, jamais dans les demeures. Vek’shan enseigne les traces que le vent protège ; Isha’ren conserve aussi les noms de ceux qui ne sont pas revenus.', ['Une trace persiste du côté abrité de la dalle.', 'Trois encoches indiquent une halte de porteurs, pas une proie.', 'Le conduit en contrebas relie les réserves à la citerne.'], 'Ramener le relevé de débit scellé aux artisans des citernes.'],
  ['pillar-jungle', 'Jungle des Piliers', 'Terrasses des Hautes Branches', 'Gardiens des Hautes Branches', 'Passerelles des Piliers', '/game/assets/v37/tribes/v2/homeworld-forest-v2--8fdc633789dcd9c0.webp', '#83ba79', '#354437', 'Rafale dans les branchages', 'Sha’ra', 'Le village repose sur une terrasse minérale. Les charges utilisent des treuils ; les demeures ont des accès larges, tandis que les postes de veille dominent les piliers.', ['Une entaille distingue le passage d’un treuil d’une griffe.', 'Le câble déplacé a laissé une empreinte sur la racine.', 'Le dernier ancrage vibre jusque dans le poste de veille.'], 'Récupérer le calibre d’ancrage prêté par les ateliers.'],
  ['luminous-marshes', 'Marais Luminescents', 'Veillée des Racines', 'Veilleurs des Eaux Calmes', 'Chaussée des Racines', '/game/backgrounds/swamp-depth-v8.png', '#6cd3b3', '#29483e', 'Montée soudaine de l’eau', 'Nesh’ra', 'Les planchers sont au-dessus des eaux et les socles se rejoignent par une chaussée. Les veilleuses suivent les rides de l’eau sans attribuer chaque disparition à une créature.', ['Les rides s’écartent d’un conduit bouché.', 'La mousse est sèche au-dessus d’une ancienne hauteur d’eau.', 'Le résonateur du poste aval a été déplacé par la crue.'], 'Sauver le relevé des hauteurs d’eau du poste aval.'],
  ['storm-chain', 'Chaîne des Orages', 'Refuge des Trois Vents', 'Veilleurs des Crêtes', 'Ponts des Trois Vents', '/game/backgrounds/ice-depth-v4.webp', '#a7b9d2', '#38414b', 'Rafale de crête', 'Vhar’ko', 'Les maisons tournent le dos aux vents dominants. Des abris jalonnent les ponts ; aucune sortie ne suppose qu’un jeune puisse traverser seul les ravins.', ['La corde tendue indique un vent venant de l’est.', 'Le lest déplacé a raclé la roche du refuge.', 'La girouette cassée est encore reliée au carnet du poste.'], 'Ramener le carnet météorologique sans courir pendant la rafale.'],
  ['leviathan-coast', 'Côte des Léviathans', 'Port des Marées Longues', 'Maisons du Rivage', 'Corniche des Marées', '/game/backgrounds/ocean-depth-v8.png', '#68b5cb', '#344b51', 'Déferlante', 'Tor’na', 'Les embarcadères restent séparés des rues. Les demeures sont installées sur le plateau ; les sorties vers les grottes suivent les marques de marée sur la pierre.', ['Une algue sèche marque la dernière marée haute.', 'Le câble du poste côtier s’est rompu côté falaise.', 'Le coffret est resté sur son socle, au-dessus du ressac.'], 'Récupérer les horaires de marée du poste côtier.'],
  ['thermal-caves', 'Grottes Thermiques', 'Enclave des Forges Basses', 'Artisans de la Roche Chaude', 'Galerie des Fumerolles', '/game/assets/v37/tribes/v2/homeworld-lava-v2--ecd85e06796799d2.webp', '#ed9562', '#4a3532', 'Jet de vapeur', 'Kha’ru', 'Les foyers et les conduites ont leurs propres galeries. Les logements occupent les poches fraîches ; les signatures thermiques ne remplacent pas l’observation des dépôts.', ['Le dépôt blanc indique une fuite ancienne.', 'Une vibration parcourt le conduit derrière la paroi.', 'Le manomètre repose près d’un évent qui souffle par cycles.'], 'Récupérer le manomètre pendant l’accalmie de l’évent.'],
  ['cold-crown', 'Couronne Froide', 'Halte des Hautes Neiges', 'Maisons du Givre', 'Viaduc de la Couronne', '/game/backgrounds/ice-depth-v4.webp', '#b5dae0', '#455760', 'Chute de neige durcie', 'Ish’ta', 'Les portes sont protégées par des vestibules et les réserves restent sous abri. Les carnivores isolés thermiquement se lisent dans la neige ; le village privilégie la préparation.', ['Des pas lourds ont tassé la neige sous la corniche.', 'La corde d’une ancienne expédition est prise dans la glace.', 'Une plaque de route subsiste derrière le pare-neige.'], 'Ramener la plaque du poste avant la chute suivante.'],
  ['first-city-ruins', 'Ruines de la Première Cité', 'Camp des Archives Scellées', 'Conservateurs des Anciennes Pierres', 'Voie des Stèles', '/game/backgrounds/ruins-depth-v8.png', '#c2aa7d', '#474035', 'Balayage d’une sentinelle', 'Osh’ren', 'Ce camp ne bâtit pas sur les tombes. Les habitants conservent les archives sur des socles séparés ; les mécanismes anciens sont consignés avant toute intervention.', ['Un câble récent contourne la maçonnerie ancienne.', 'Le sceau extérieur ne correspond pas aux marques du monument.', 'Une sentinelle balaie le coffret déplacé sans identifier son contenu.'], 'Récupérer le registre de maintenance laissé hors du monument.'],
  ['forbidden-reserve', 'Réserve Interdite', 'Poste des Gardiens de Réserve', 'Gardiens du Confinement', 'Galerie des Observateurs', '/game/assets/v37/tribes/v2/homeworld-darkjungle-v2--fbc392bc9618642d.webp', '#bd78b6', '#3d3547', 'Balayage de confinement', 'Tha’vek', 'Les logements du poste sont hors des enclos. Les créatures importées restent confinées ; les xénomorphes éventuels ne deviennent jamais la faune ordinaire du monde natal.', ['Une empreinte de chariot s’arrête devant le sas extérieur.', 'Le câble neuf court vers le poste d’observation.', 'Le journal de confinement est tombé à l’extérieur de l’enclos.'], 'Rapporter le journal sans ouvrir le sas de confinement.'],
] as const;

function makeBuildings(index: number): RegionBuildingV68[] {
  // Every foundation faces south in the same yaw 0°, pitch 35° camera. No rotated native facades.
  const dy = index % 2 ? 100 : 0;
  const layout = index === 2 || index === 3 || index === 9 ? 'terraces' : index === 4 || index === 5 ? 'shore' : index === 6 || index === 7 ? 'sheltered' : 'court';
  const terraces: Record<string, HomeworldVec2> = { hall: { x: 1850, y: 960 }, forge: { x: 3150, y: 1570 }, clinic: { x: 950, y: 2310 }, archive: { x: 3060, y: 2830 }, 'house-n-0': { x: 570, y: 700 }, 'house-n-1': { x: 1250, y: 660 }, 'house-n-2': { x: 2580, y: 600 }, 'house-n-3': { x: 3650, y: 700 } };
  const shore: Record<string, HomeworldVec2> = { hall: { x: 1100, y: 1130 }, forge: { x: 2760, y: 1100 }, clinic: { x: 1100, y: 2460 }, archive: { x: 2760, y: 2490 }, 'house-n-0': { x: 450, y: 540 }, 'house-n-1': { x: 1750, y: 540 }, 'house-n-2': { x: 2400, y: 540 }, 'house-n-3': { x: 3750, y: 540 }, 'house-s-0': { x: 450, y: 3480 }, 'house-s-1': { x: 1750, y: 3480 }, 'house-s-2': { x: 2400, y: 3480 }, 'house-s-3': { x: 3750, y: 3480 } };
  const sheltered: Record<string, HomeworldVec2> = { hall: { x: 2000, y: 1070 }, forge: { x: 3020, y: 1420 }, clinic: { x: 1100, y: 2300 }, archive: { x: 3020, y: 2590 }, 'house-n-0': { x: 750, y: 720 }, 'house-n-1': { x: 1430, y: 650 }, 'house-n-2': { x: 2740, y: 650 }, 'house-n-3': { x: 3620, y: 850 }, 'house-s-0': { x: 480, y: 1840 }, 'house-s-1': { x: 1550, y: 3380 }, 'house-s-2': { x: 2580, y: 3380 }, 'house-s-3': { x: 3750, y: 3050 } };
  return [
    ['hall', 'Maison commune', 1900, 1180 + dy, 'civic-hall', 'hall'],
    ['forge', 'Atelier des balises', 3150, 1220 + dy, 'civic-forge', 'forge'],
    ['clinic', 'Maison des soins', 950, 2380 + dy, 'house-b', 'clinic'],
    ['archive', 'Galerie des récits', 3120, 2460 + dy, 'house-b', 'archive'],
    ...[650, 1200, 2500, 3600].map((x, n) => [`house-n-${n}`, `Demeure ${n + 1}`, x, 630 + dy, n % 2 ? 'house-c' : 'house-a', 'residence']),
    ...[650, 1600, 2500, 3650].map((x, n) => [`house-s-${n}`, `Demeure ${n + 5}`, x, 3420 + dy, n % 2 ? 'house-a' : 'house-c', 'residence']),
  ].map(([id, label, x, y, artId, role]) => {
    const art = HOMEWORLD_BUILDING_ART_V64[artId as keyof typeof HOMEWORLD_BUILDING_ART_V64];
    const position = (layout === 'terraces' ? terraces : layout === 'shore' ? shore : layout === 'sheltered' ? sheltered : {})[String(id)] ?? { x: Number(x), y: Number(y) };
    return { id: String(id), label: String(label), ...position, width: art.footprintWorld.width, height: art.wallHeightWorld, artId: artId as keyof typeof HOMEWORLD_BUILDING_ART_V64, art, footprint: { ...art.footprintWorld }, role: role as RegionBuildingV68['role'] };
  });
}
function makeResidents(guideName: string, index: number): RegionResidentV68[] {
  const dy = index % 2 ? 100 : 0;
  const roles = [
    ['guide', guideName, 'Pisteur du clan', 1900, 1450 + dy, 'elder', 'elder', 'Lis les trois relevés du territoire. Le coffret de balise n’est pas une prise : rapporte-le après une traversée prudente.'],
    ['artisan', `Ka’resh ${index + 1}`, 'Artisane des balises', 3200, 1500 + dy, 'huntress', 'huntress', 'Nous réparons ce qui permet à d’autres de rentrer. Une marque de propriété demeure celle de son auteur.'],
    ['healer', `Na’ra ${index + 1}`, 'Soigneuse', 1000, 2640 + dy, 'huntress', 'huntress', 'Une sortie interrompue vaut mieux qu’une blessure cachée. Reste hors de la zone signalée lorsque le terrain s’agite.'],
    ['keeper', index === 1 ? 'Isha’ren' : `Osh’ka ${index + 1}`, 'Gardienne des récits', 3190, 2740 + dy, 'elder', 'elder', 'Nous gardons les noms des disparus et les engagements tenus. Rapporter un outil ne donne pas le trophée d’un autre.'],
    ['porter-a', `Tor’esh ${index + 1}`, 'Porteur', 1350, 1850, 'classic', 'classic', 'Les charges suivent la place, pas les logements. Laisse le passage libre près des ateliers.'],
    ['porter-b', `Vel’ra ${index + 1}`, 'Convoyeuse', 2400, 2150, 'huntress', 'huntress', 'Le poste extérieur change à chaque accalmie. Les trois relevés te diront où chercher.'],
    ['hunter-a', `Khe’ron ${index + 1}`, 'Chasseur de retour', 570, 1500, 'classic', 'classic', 'Observe les traces, la pierre et le vent avant de chercher une cible.'],
    ['hunter-b', `Sha’vek ${index + 1}`, 'Chasseuse', 3650, 2900, 'huntress', 'huntress', 'Une chasse appartient à celui qui la mène ; nos balises sont une responsabilité commune.'],
    ['apprentice-a', `Or’ta ${index + 1}`, 'Apprenti accompagné', 1600, 3080, 'young', 'classic', 'Notre maître vérifie les relevés avant de nous laisser suivre la piste.'],
    ['apprentice-b', `Vesh’ra ${index + 1}`, 'Apprentie accompagnée', 2050, 3080, 'young', 'classic', 'Nous répétons le trajet sur la place. Les territoires dangereux attendront.'],
    ['watcher-a', `Rha’ko ${index + 1}`, 'Veilleur', 4200, 2270, 'super', 'veteran', 'Le poste extérieur est à l’est. Observe l’avertissement, écarte-toi puis reprends pendant l’accalmie.'],
    ['watcher-b', `Tek’na ${index + 1}`, 'Veilleuse', 450, 2850, 'classic', 'classic', 'La corniche revient à la cité. La traversée se fait à pied, dans les deux sens.'],
  ] as const;
  const buildings = makeBuildings(index);
  return roles.map(([id, name, role, x, y, morphId, dreadStyleId, greeting], n) => ({
    id, name, role, ...(n < 4 ? { x: buildings[n].x + (n % 2 ? 50 : 0), y: buildings[n].y + 270 } : { x, y }), morphId, dreadStyleId, greeting,
    route: n === 4 ? [{ x: 1300, y: 1850 }, { x: 2750, y: 1850 }] : n === 5 ? [{ x: 2600, y: 2200 }, { x: 3550, y: 2200 }] : n === 8 || n === 9 ? [{ x, y }, { x: x + 240, y }] : [{ x, y }],
    speed: n === 4 || n === 5 ? 38 : 18,
  }));
}
const routeNames = ['Parvis extérieur', 'Corniche du clan', 'Premier ouvrage', 'Balcon du territoire', 'Second ouvrage', 'Lisière du village'];
const animalTraceNotes: Partial<Record<HomeworldRegionIdV68, readonly [string, string, string]>> = {
  'ash-marches': ['Deux empreintes lourdes suivent la bordure du convoi ; elles ne viennent pas du traîneau.', 'Une roche frottée porte la poussière laissée par une carapace vivante.', 'Le brouteur occupe le poste extérieur. Observe-le sans t’attribuer une prise.'],
  'glass-desert': ['Une rainure serpente sous la poussière à l’abri de la dalle.', 'Le sable s’est soulevé devant l’ancien conduit des citernes.', 'Le fouisseur se montre au-delà du poste. Ses traces doivent être comparées à l’animal vivant.'],
  'pillar-jungle': ['Des griffes récentes coupent l’ancienne marque du câble.', 'L’écorce a été déplacée entre deux racines près du poste.', 'Le traqueur s’arrête à la lisière. Observe sa silhouette avant de conclure sur sa piste.'],
  'luminous-marshes': ['Une empreinte de carapace interrompt les rides de l’eau.', 'La mousse pressée indique un passage au-dessus de la crue.', 'L’animal se repose près du poste aval. Reste hors de sa portée pendant le relevé.'],
  'storm-chain': ['Des griffes ont raclé la roche sous le premier perchoir.', 'Une plume rigide a été déposée à l’abri du vent.', 'Le planeur est visible au-dessus du poste. Sa présence complète les indices de la crête.'],
  'leviathan-coast': ['Deux traces de carapace remontent au-dessus de la dernière marée.', 'Une algue écrasée marque le passage entre le socle et la falaise.', 'Une carapace du rivage occupe le poste ; ce relevé ne décrit pas un grand Léviathan.'],
  'cold-crown': ['Des pas de carnivore tassent la neige à l’abri de la corniche.', 'Des poils sont pris dans la corde d’une ancienne expédition.', 'L’animal demeure près du pare-neige. Les indices physiques confirment son passage.'],
};
export const HOMEWORLD_REGIONS_V68: Readonly<Record<HomeworldRegionIdV68, RegionDefinitionV68>> = Object.fromEntries(specifications.map((spec, index) => {
  const [id, name, village, clan, routeTitle, panorama, accent, groundColor, hazard, guideName, introduction, traceNotes, cacheNote] = spec;
  const routeY = 1500 + (index % 3) * 180;
  const route = [{ x: 360, y: routeY }, { x: 3100, y: routeY }, { x: 4600, y: routeY - 520 }, { x: 8800, y: routeY - 520 }, { x: 11800, y: routeY + 300 }, { x: 16200, y: routeY + 300 }, { x: 18200, y: routeY }].map((point, n) => ({ ...point, name: routeNames[Math.min(n, routeNames.length - 1)] }));
  const props: RegionDefinitionV68['props'] = [
    { id: 'place-table', artId: 'table', x: 1940, y: 2060 }, { id: 'place-bench-a', artId: 'bench', x: 1630, y: 2000 },
    { id: 'place-bench-b', artId: 'bench', x: 2250, y: 2000 }, { id: 'workshop', artId: 'workshop', x: 3530, y: 1670 },
    { id: 'storage', artId: 'chest', x: 3650, y: 2420 }, { id: 'entry-beacon', artId: 'beacon', x: 650, y: 2910 },
    { id: 'field-beacon', artId: 'beacon', x: 4270, y: 2450 }, { id: 'garden-a', artId: 'rock-plant', x: 650, y: 2220 },
    { id: 'garden-b', artId: 'rock-plant', x: 2870, y: 3040 }, { id: 'cache', artId: 'chest', x: 7830, y: 2130 },
  ];
  return [id, { id, name, village, clan, routeTitle, panorama, accent, groundColor, hazard, guideName, introduction, traceNotes: animalTraceNotes[id] ?? traceNotes, cacheNote, route, buildings: makeBuildings(index), residents: makeResidents(guideName, index), props }];
})) as unknown as Readonly<Record<HomeworldRegionIdV68, RegionDefinitionV68>>;

export const HOMEWORLD_VILLAGE_WORLD_V68 = { width: 8600, depth: 4000 } as const;
/** Irregular basalt terrace, shared by rendering and whole-body collision. Foundations remain fully supported. */
export const HOMEWORLD_VILLAGE_PERIMETER_V68: readonly HomeworldVec2[] = [
  { x: 200, y: 170 }, { x: 1300, y: 170 }, { x: 1480, y: 270 }, { x: 2530, y: 170 },
  { x: 4230, y: 170 }, { x: 4350, y: 820 }, { x: 4240, y: 1230 }, { x: 4350, y: 1690 },
  { x: 4350, y: 2770 }, { x: 4210, y: 3000 }, { x: 4310, y: 3910 }, { x: 3180, y: 3910 },
  { x: 2950, y: 3800 }, { x: 1800, y: 3910 }, { x: 1440, y: 3800 }, { x: 200, y: 3910 },
  { x: 200, y: 3060 }, { x: 280, y: 2740 }, { x: 200, y: 2270 },
];
export const HOMEWORLD_REGION_TRAIL_V68 = [{ x: 3900, y: 2300 }, { x: 4800, y: 1800 }, { x: 5700, y: 2850 }, { x: 6600, y: 1800 }, { x: 7800, y: 2100 }] as const;
export const HOMEWORLD_REGION_FIELD_PERIMETER_V68: readonly HomeworldVec2[] = [{ x: 6780, y: 1710 }, { x: 6990, y: 1500 }, { x: 8040, y: 1500 }, { x: 8200, y: 1660 }, { x: 8200, y: 2500 }, { x: 8030, y: 2650 }, { x: 6980, y: 2650 }, { x: 6780, y: 2460 }];
export const HOMEWORLD_REGION_TRACES_V68 = HOMEWORLD_REGION_TRAIL_V68.slice(1, 4).map((point, i) => ({ ...point, id: `trail-${i + 1}`, label: `Relevé ${i + 1}` }));
export const HOMEWORLD_REGION_HAZARD_V68 = { x: 7650, y: 2080, warningTicks: 80, activeTicks: 75, calmTicks: 205, radius: 340 } as const;
export const HOMEWORLD_REGION_INTERIOR_V68 = { width: 760, depth: 700, entry: { x: 380, y: 620 }, service: { x: 380, y: 220 } } as const;
/** Native furniture sockets are the sole authority for both its feet volume and its image. */
export function homeworldRegionInteriorPropsV68(buildingId: string | null = null): readonly (HomeworldVec2 & { id: string; artId: keyof typeof HOMEWORLD_PROP_ART_V64 })[] {
  return [
    { id: 'interior-bench', artId: 'bench', x: 145, y: 390 },
    { id: 'interior-cot', artId: 'cot', x: 630, y: 390 },
    { id: 'interior-station', artId: buildingId === 'forge' ? 'workshop' : buildingId === 'archive' ? 'console' : 'table', x: 380, y: 230 },
  ];
}
export const REGION_TRACK_IDS_V68: readonly HomeworldRegionIdV68[] = ['ash-marches', 'glass-desert', 'pillar-jungle', 'luminous-marshes', 'storm-chain', 'leviathan-coast', 'cold-crown'];
export const REGION_CHALLENGE_IDS_V68: readonly HomeworldRegionIdV68[] = ['ash-marches', 'glass-desert', 'leviathan-coast'];
export const REGION_WARD_IDS_V68: readonly HomeworldRegionIdV68[] = ['pillar-jungle', 'luminous-marshes', 'storm-chain'];
export const REGION_WARD_POSTS_V68 = [{ id: 'ward-1', x: 6990, y: 1780 }, { id: 'ward-2', x: 7890, y: 2340 }] as const;
export const REGION_FAUNA_ART_V68: Partial<Record<HomeworldRegionIdV68, { src: string; name: string; altitude: number }>> = {
  'ash-marches': { src: '/game/sprites/v8/ecology/cinder-12/basalt-ram-sheet.png', name: 'Brouteur cuirassé', altitude: 0 },
  'glass-desert': { src: '/game/sprites/v8/ecology/serekh-9/burrow-snake-sheet.png', name: 'Fouisseur du verre', altitude: 0 },
  'pillar-jungle': { src: '/game/sprites/v8/ecology/oseris-iv/amber-jaw-stalker-sheet.png', name: 'Traqueur des piliers', altitude: 0 },
  'luminous-marshes': { src: '/game/sprites/v8/ecology/naraka-delta/mire-shell-sheet.png', name: 'Carapace des marais', altitude: 0 },
  'storm-chain': { src: '/game/sprites/v8/ecology/cinder-12/smoke-wyvern-sheet.png', name: 'Planeur des crêtes', altitude: 90 },
  'leviathan-coast': { src: '/game/sprites/v8/ecology/pelagos-m/shellback-sheet.png', name: 'Carapace du rivage', altitude: 0 },
  'cold-crown': { src: '/game/sprites/v8/ecology/nivalis-k/snow-prowler-sheet.png', name: 'Pisteur des neiges', altitude: 0 },
};
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export const isHomeworldRegionIdV68 = (id: unknown): id is HomeworldRegionIdV68 => typeof id === 'string' && (HOMEWORLD_REGION_IDS_V68 as readonly string[]).includes(id);
export function canEnterHomeworldRegionV68(save: Pick<SaveGame, 'prologue' | 'homeworld'>, id: unknown) {
  if (!isHomeworldRegionIdV68(id)) return { allowed: false, reason: 'Ce territoire ne fait pas partie des routes du clan.' };
  if (save.prologue && !['blooded', 'elite', 'elder', 'ancient'].includes(getChronicleRank(save.prologue.chronicle) ?? '')) return { allowed: false, reason: 'Ta formation continue avec ton maître. Les départs autonomes attendent la reconnaissance Blooded.' };
  if (id === 'forbidden-reserve' && !save.homeworld.expeditions['glass-desert']) return { allowed: false, reason: 'Le rapport du Désert de Verre est requis pour approcher le poste de confinement.' };
  return { allowed: true, reason: '' };
}
function segmentDistance(point: HomeworldVec2, a: HomeworldVec2, b: HomeworldVec2) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - a.x - dx * t, point.y - a.y - dy * t);
}
export function regionBridgesV68(id: HomeworldRegionIdV68) {
  const nodes = HOMEWORLD_REGIONS_V68[id].route;
  return [2, 4].map(n => ({ x: nodes[n].x + 360, y: nodes[n].y, modules: n === 2 ? 2 : 3 }));
}
export function regionPassageFloorV68(id: HomeworldRegionIdV68, point: HomeworldVec2) {
  const bridge = regionBridgesV68(id).find(b => point.x >= b.x && point.x <= b.x + b.modules * HOMEWORLD_PASSAGE_BRIDGE_V67.width);
  if (bridge) return Math.abs(point.y - bridge.y) <= homeworldPassageBridgeDepthV67() / 2;
  const nodes = HOMEWORLD_REGIONS_V68[id].route;
  return nodes.slice(1).some((node, n) => segmentDistance(point, nodes[n], node) <= 160);
}
export function regionVillageFloorV68(point: HomeworldVec2) {
  return pointInHomeworldPolygon(point, HOMEWORLD_VILLAGE_PERIMETER_V68)
    || pointInHomeworldPolygon(point, HOMEWORLD_REGION_FIELD_PERIMETER_V68)
    || HOMEWORLD_REGION_TRAIL_V68.slice(1).some((p, n) => segmentDistance(point, HOMEWORLD_REGION_TRAIL_V68[n], p) <= 190);
}
export function regionResidentPositionV68(resident: RegionResidentV68, tick: number): HomeworldVec2 {
  if (resident.route.length < 2) return resident;
  const [a, b] = resident.route, length = Math.hypot(b.x - a.x, b.y - a.y), phase = (tick / 60 * resident.speed) % (length * 2);
  const t = Math.min(phase, length * 2 - phase) / length;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
export function regionCollisionV68(id: HomeworldRegionIdV68, point: HomeworldVec2, tick = 0): string | null {
  const definition = HOMEWORLD_REGIONS_V68[id];
  for (const building of definition.buildings) {
    const f = homeworldBuildingFootprintV64(building);
    if (point.x + 24 > f.left && point.x - 24 < f.right && point.y + 14 > f.top && point.y - 14 < f.bottom) return building.id;
  }
  for (const prop of definition.props) {
    const art = HOMEWORLD_PROP_ART_V64[prop.artId], f = art.footprintWorld;
    if (Math.abs(point.x - prop.x) < f.width / 2 + 24 && point.y + 14 > prop.y - f.depth && point.y - 14 < prop.y) return prop.id;
  }
  if (REGION_WARD_IDS_V68.includes(id)) for (const post of REGION_WARD_POSTS_V68) {
    const f = HOMEWORLD_PROP_ART_V64.beacon.footprintWorld;
    if (Math.abs(point.x - post.x) < f.width / 2 + 24 && point.y + 14 > post.y - f.depth && point.y - 14 < post.y) return post.id;
  }
  for (const npc of definition.residents) {
    const p = regionResidentPositionV68(npc, tick);
    // Moving residents yield to the hunter; fixed service NPCs have physical feet.
    if (npc.route.length === 1 && Math.abs(point.x - p.x) < 40 && Math.abs(point.y - p.y) < 28) return npc.id;
  }
  return null;
}
export function isHomeworldRegionWalkableV68(id: HomeworldRegionIdV68, zone: HomeworldRegionStateV68['zone'], point: HomeworldVec2, tick = 0, buildingId: string | null = null) {
  if (![point.x, point.y].every(Number.isFinite)) return false;
  if (zone === 'interior') return point.x >= 55 && point.x <= 705 && point.y >= 75 && point.y <= 660 && !homeworldRegionInteriorPropsV68(buildingId).some(prop => {
    const f = HOMEWORLD_PROP_ART_V64[prop.artId].footprintWorld;
    return point.x + 24 > prop.x - f.width / 2 && point.x - 24 < prop.x + f.width / 2 && point.y + 14 > prop.y - f.depth && point.y - 14 < prop.y;
  });
  const floor = zone === 'passage' ? (p: HomeworldVec2) => regionPassageFloorV68(id, p) : regionVillageFloorV68;
  return [[-24, -14], [-24, 14], [24, -14], [24, 14]].every(([x, y]) => floor({ x: point.x + x, y: point.y + y }))
    && (zone === 'passage' || regionCollisionV68(id, point, tick) === null);
}
const actorAt = (point: HomeworldVec2, facing: -1 | 1 = 1): HomeworldActor => ({ ...point, vx: 0, vy: 0, grounded: true, facing });
export function createHomeworldRegionV68(regionId: HomeworldRegionIdV68, runId = `${regionId}-journey`, startAtVillage = false): HomeworldRegionStateV68 {
  const definition = HOMEWORLD_REGIONS_V68[regionId];
  return { version: 1, regionId, runId, tick: 0, walked: 0, zone: startAtVillage ? 'village' : 'passage', direction: 'outbound', actor: actorAt(startAtVillage ? { x: 520, y: 2800 } : definition.route[0]), routeVisited: startAtVillage ? definition.route.map((_, n) => n) : [0], villageEntered: startAtVillage, buildingId: null, visitedBuildings: [], greeted: [], traces: [], recovered: false, reported: false, evaded: 0, hazardArmed: false, observedTicks: 0, protectedPosts: [], fauna: { x: 7450, y: 1940, phase: 'quiet', ticks: 0, targetY: 1940, evaded: 0, touches: 0, touchedThisRecovery: false, hitThisCharge: false }, pendingFieldEvent: null, eventReceipts: [], status: 'walking' };
}
export function regionHazardPhaseV68(tick: number) {
  const h = HOMEWORLD_REGION_HAZARD_V68, phase = tick % (h.warningTicks + h.activeTicks + h.calmTicks);
  return phase < h.warningTicks ? 'warning' : phase < h.warningTicks + h.activeTicks ? 'active' : 'calm';
}
export interface RegionInteractionV68 { kind: 'village' | 'city' | 'departure' | 'door' | 'exit-interior' | 'resident' | 'trace' | 'cache' | 'service' | 'fauna' | 'ward'; id: string; label: string }
export function homeworldRegionInteractionV68(state: HomeworldRegionStateV68): RegionInteractionV68 | null {
  const a = state.actor, definition = HOMEWORLD_REGIONS_V68[state.regionId], near = (p: HomeworldVec2, d: number) => Math.hypot(a.x - p.x, a.y - p.y) <= d;
  if (state.zone === 'passage') {
    if (near(definition.route[0], 95) && (state.direction === 'outbound' || state.routeVisited.length === definition.route.length)) return { kind: 'city', id: 'city', label: 'Revenir à la cité' };
    if (state.direction === 'outbound' && state.routeVisited.length === definition.route.length && near(definition.route.at(-1)!, 95)) return { kind: 'village', id: 'village', label: `Entrer : ${definition.village}` };
    return null;
  }
  if (state.zone === 'interior') {
    if (near(HOMEWORLD_REGION_INTERIOR_V68.entry, 80)) return { kind: 'exit-interior', id: state.buildingId!, label: 'Sortir sur la place' };
    if (near(HOMEWORLD_REGION_INTERIOR_V68.service, 115)) return { kind: 'service', id: state.buildingId!, label: 'Consulter le lieu' };
    return null;
  }
  if (near({ x: 520, y: 2800 }, 100)) return { kind: 'departure', id: 'departure', label: 'Reprendre la corniche vers la cité' };
  for (const building of definition.buildings) {
    const door = homeworldBuildingDoorwayV64(building);
    if (Math.abs(a.x - building.x) < door.clearWidth / 2 - 20 && a.y > building.y + 14 && a.y < door.approach.y + 60) return { kind: 'door', id: building.id, label: `Entrer : ${building.label}` };
  }
  for (const npc of definition.residents) if (near(regionResidentPositionV68(npc, state.tick), 130)) return { kind: 'resident', id: npc.id, label: `Parler : ${npc.name}` };
  const trace = HOMEWORLD_REGION_TRACES_V68[state.traces.length];
  if (trace && near(trace, 100)) return { kind: 'trace', id: trace.id, label: `Inspecter : ${trace.label}` };
  if (REGION_WARD_IDS_V68.includes(state.regionId)) for (const post of REGION_WARD_POSTS_V68) if (near(post, 110)) return { kind: 'ward', id: post.id, label: state.protectedPosts.includes(post.id) ? 'Balise fixée' : 'Fixer la balise avant le danger' };
  if (REGION_TRACK_IDS_V68.includes(state.regionId) && state.traces.length === 3 && (!state.eventReceipts.includes('track') || REGION_CHALLENGE_IDS_V68.includes(state.regionId) && state.fauna.phase !== 'retreated') && near(state.fauna, state.fauna.phase === 'recovery' ? 160 : 550)) return { kind: 'fauna', id: 'fauna', label: !state.eventReceipts.includes('track') ? 'Consigner la piste et l’observation' : state.fauna.phase === 'quiet' ? 'Commencer l’épreuve de maîtrise' : state.fauna.phase === 'recovery' ? 'Toucher pendant l’ouverture' : 'S’écarter de la charge' };
  if (near({ x: 7720, y: 2220 }, 140)) return { kind: 'cache', id: 'cache', label: state.recovered ? 'Coffret déjà relevé' : 'Récupérer le relevé du poste' };
  return null;
}
function fieldEvent(state: HomeworldRegionStateV68, action: RegionFieldActionV68): RegionFieldEventV68 {
  return { version: 1, regionId: state.regionId, runId: state.runId, tick: state.tick, action, siteId: `${state.regionId}-${action === 'survey' ? 'trail-3' : action === 'recover' ? 'cache' : action === 'report' ? 'guide' : action}`, targetId: `${state.regionId}-${action === 'survey' ? 'trail' : action === 'track' || action === 'challenge' ? 'fauna' : action === 'report' ? 'guide' : 'relay'}`, walked: state.walked, actor: { x: state.actor.x, y: state.actor.y }, trailCount: state.traces.length, evaded: action === 'challenge' ? state.fauna.evaded : state.evaded, armed: false, observedTicks: state.observedTicks, touches: state.fauna.touches, interventions: state.protectedPosts.length };
}
export function acknowledgeHomeworldRegionEventV68(state: HomeworldRegionStateV68): HomeworldRegionStateV68 {
  if (!state.pendingFieldEvent) return state;
  return { ...state, pendingFieldEvent: null, eventReceipts: [...new Set([...state.eventReceipts, state.pendingFieldEvent.action])] };
}
export function stepHomeworldRegionV68(state: HomeworldRegionStateV68, input: { x?: number; y?: number; interact?: boolean } = {}, paused = false): HomeworldRegionStateV68 {
  if (paused || state.pendingFieldEvent || state.status !== 'walking') return state;
  const next = structuredClone(state);
  next.actor = stepHomeworldActorOnFloor(state.actor, { moveX: input.x ?? 0, climb: input.y ?? 0, jumpPressed: false }, 1 / 60, point => isHomeworldRegionWalkableV68(state.regionId, state.zone, point, state.tick, state.buildingId), () => state.actor);
  next.tick++; next.walked += Math.hypot(next.actor.x - state.actor.x, next.actor.y - state.actor.y);
  const definition = HOMEWORLD_REGIONS_V68[state.regionId];
  if (next.zone === 'passage') {
    const target = next.routeVisited.at(-1)! + (next.direction === 'outbound' ? 1 : -1);
    if (definition.route[target] && Math.hypot(next.actor.x - definition.route[target].x, next.actor.y - definition.route[target].y) < 175) next.routeVisited.push(target);
  }
  if (next.zone === 'village') {
    const nearHazard = Math.hypot(next.actor.x - HOMEWORLD_REGION_HAZARD_V68.x, next.actor.y - HOMEWORLD_REGION_HAZARD_V68.y) < HOMEWORLD_REGION_HAZARD_V68.radius;
    const phase = regionHazardPhaseV68(next.tick), previousPhase = regionHazardPhaseV68(state.tick);
    if (phase === 'warning' && nearHazard) next.hazardArmed = true;
    if (phase === 'active' && previousPhase === 'warning') {
      if (state.hazardArmed && !nearHazard) next.evaded++;
      next.hazardArmed = false;
    }
    const f = next.fauna, distance = Math.hypot(next.actor.x - f.x, next.actor.y - f.y);
    if (REGION_TRACK_IDS_V68.includes(next.regionId) && next.traces.length === 3 && f.phase === 'quiet' && distance >= 210 && distance <= 550) next.observedTicks = Math.min(3600, next.observedTicks + 1);
    if (f.phase !== 'quiet' && f.phase !== 'retreated') {
      f.ticks++;
      if (f.phase === 'warning' && f.ticks >= 70) { f.phase = 'charge'; f.ticks = 0; f.hitThisCharge = false; }
      else if (f.phase === 'charge') {
        f.x = Math.max(6890, f.x - 7);
        if (Math.abs(next.actor.y - f.targetY) < 78 && Math.abs(next.actor.x - f.x) < 95) f.hitThisCharge = true;
        if (f.ticks >= 85) { if (!f.hitThisCharge) f.evaded++; f.phase = 'recovery'; f.ticks = 0; f.touchedThisRecovery = false; }
      } else if (f.phase === 'recovery' && f.ticks >= 160) {
        if (f.evaded >= 2 && f.touches >= 3) f.phase = 'retreated';
        else { f.phase = 'warning'; f.x = 7450; f.y = Math.max(1650, Math.min(2500, next.actor.y)); f.targetY = f.y; f.ticks = 0; }
      }
    }
  }
  if (!next.pendingFieldEvent && REGION_WARD_IDS_V68.includes(next.regionId) && next.protectedPosts.length === 2 && next.evaded >= 1 && !next.eventReceipts.includes('ward')) next.pendingFieldEvent = fieldEvent(next, 'ward');
  if (next.pendingFieldEvent) return next;
  const interaction = input.interact ? homeworldRegionInteractionV68(next) : null;
  if (!interaction) return next;
  switch (interaction.kind) {
    case 'city': next.status = 'at-city'; break;
    case 'village': next.zone = 'village'; next.villageEntered = true; next.actor = actorAt({ x: 520, y: 2800 }); break;
    case 'departure': next.zone = 'passage'; next.direction = 'return'; next.routeVisited = [definition.route.length - 1]; next.actor = actorAt(definition.route.at(-1)!, -1); break;
    case 'door': next.zone = 'interior'; next.buildingId = interaction.id; next.visitedBuildings = [...new Set([...next.visitedBuildings, interaction.id])]; next.actor = actorAt(HOMEWORLD_REGION_INTERIOR_V68.entry); break;
    case 'exit-interior': { const b = definition.buildings.find(b => b.id === state.buildingId)!; next.zone = 'village'; next.actor = actorAt(homeworldBuildingDoorwayV64(b).approach); next.buildingId = null; break; }
    case 'resident':
      next.greeted = [...new Set([...next.greeted, interaction.id])];
      if (interaction.id === 'guide' && next.traces.length === 3 && next.eventReceipts.some(r => ['survey', 'track', 'recover', 'challenge', 'ward'].includes(r))) { next.reported = true; next.pendingFieldEvent = fieldEvent(next, 'report'); }
      break;
    case 'trace':
      if (next.greeted.includes('guide')) { next.traces.push(interaction.id); if (next.traces.length === 3 && !REGION_TRACK_IDS_V68.includes(next.regionId)) next.pendingFieldEvent = fieldEvent(next, 'survey'); }
      break;
    case 'fauna':
      if (next.observedTicks >= 90 && !next.eventReceipts.includes('track')) next.pendingFieldEvent = fieldEvent(next, 'track');
      else if (next.eventReceipts.includes('track') && REGION_CHALLENGE_IDS_V68.includes(next.regionId)) {
        if (next.fauna.phase === 'quiet') { next.fauna.phase = 'warning'; next.fauna.ticks = 0; next.fauna.y = Math.max(1650, Math.min(2500, next.actor.y)); next.fauna.targetY = next.fauna.y; }
        else if (next.fauna.phase === 'recovery' && !next.fauna.touchedThisRecovery) { next.fauna.touches++; next.fauna.touchedThisRecovery = true; if (next.fauna.evaded >= 2 && next.fauna.touches >= 3) { next.fauna.phase = 'retreated'; next.pendingFieldEvent = fieldEvent(next, 'challenge'); } }
      }
      break;
    case 'ward':
      if (next.traces.length === 3 && regionHazardPhaseV68(next.tick) === 'warning' && !next.protectedPosts.includes(interaction.id)) { next.protectedPosts.push(interaction.id); if (next.protectedPosts.length === 2 && next.evaded >= 1) next.pendingFieldEvent = fieldEvent(next, 'ward'); }
      break;
    case 'cache':
      if (next.traces.length === 3 && next.evaded >= 1 && regionHazardPhaseV68(next.tick) === 'calm' && !next.recovered) { next.recovered = true; next.pendingFieldEvent = fieldEvent(next, 'recover'); }
      break;
  }
  if (!next.pendingFieldEvent && REGION_WARD_IDS_V68.includes(next.regionId) && next.protectedPosts.length === 2 && next.evaded >= 1 && !next.eventReceipts.includes('ward')) next.pendingFieldEvent = fieldEvent(next, 'ward');
  next.actor.vx = 0; next.actor.vy = 0;
  return next;
}
export function regionInteractionDialogueV68(state: HomeworldRegionStateV68, interaction: RegionInteractionV68) {
  const d = HOMEWORLD_REGIONS_V68[state.regionId];
  if (interaction.kind === 'resident') {
    if (interaction.id === 'guide' && state.reported) return 'Le relevé est reçu. Les balises du territoire seront rétablies ; personne ne transforme cet engagement tenu en trophée de chasse.';
    return d.residents.find(n => n.id === interaction.id)?.greeting ?? '';
  }
  if (interaction.kind === 'trace') return !state.greeted.includes('guide') ? `Écoute d’abord ${d.guideName} sur la place pour savoir quels relevés comparer.` : d.traceNotes[Number(interaction.id.at(-1)) - 1];
  if (interaction.kind === 'cache') return state.recovered ? 'Le relevé est rangé. Retourne voir le pisteur sur la place pour rendre ton rapport.' : state.traces.length < 3 ? 'Il faut comparer les trois relevés avant d’ouvrir ce coffret.' : state.evaded < 1 ? `Observe ${d.hazard.toLowerCase()} : entre dans la zone lors de l’avertissement puis écarte-toi avant son déclenchement.` : regionHazardPhaseV68(state.tick) !== 'calm' ? 'Attends l’accalmie avant de relever le coffret.' : d.cacheNote;
  if (interaction.kind === 'fauna') return state.observedTicks < 90 ? 'Reste à distance entre deux et cinq longueurs de corps. Observe sans attaquer, puis consigne la piste.' : state.fauna.phase === 'quiet' ? 'L’observation est inscrite. Pour l’épreuve de maîtrise, sors de l’axe avant chaque charge et touche seulement pendant la récupération. L’animal se retirera vivant.' : state.fauna.phase === 'recovery' ? 'Une seule touche est reconnue à chaque récupération. Repositionne-toi avant la charge suivante.' : 'La charge est annoncée par la ligne au sol. Quitte son axe ; aucun trophée de mise à mort n’est promis.';
  if (interaction.kind === 'ward') return state.traces.length < 3 ? 'Compare les trois relevés avant d’intervenir.' : state.protectedPosts.includes(interaction.id) ? 'Cette balise est fixée. La seconde doit également être protégée.' : 'Fixe la balise pendant l’avertissement, puis quitte la zone avant le déclenchement.';
  if (interaction.kind === 'service') {
    const b = d.buildings.find(b => b.id === interaction.id)!;
    return b.role === 'hall' ? d.introduction : b.role === 'forge' ? 'Les outils sont conservés sur des supports séparés. Les habitants réparent les ancrages et les balises avant chaque nouveau départ.' : b.role === 'clinic' ? 'Les couchages et les réserves de soins restent accessibles aux chasseurs accueillis. Une blessure ne justifie pas de s’attribuer une prise étrangère.' : b.role === 'archive' ? `Les récits de ${d.clan} mentionnent les retours, les disparus et les obligations du clan. Les archives de la cité ne parlent pas pour tous les Yautja.` : 'Cette demeure est celle d’une famille du clan. Ses objets et son foyer ne sont pas du butin.';
  }
  return '';
}
export function regionObjectiveV68(state: HomeworldRegionStateV68) {
  const d = HOMEWORLD_REGIONS_V68[state.regionId];
  if (state.zone === 'passage') return state.direction === 'return' ? 'Revenir à la cité par la corniche' : `Rejoindre ${d.village}`;
  if (!state.greeted.includes('guide')) return `Écouter ${d.guideName} devant la maison commune`;
  if (state.traces.length < 3) return `Relevés du territoire : ${state.traces.length}/3 — suivre les bornes à l’est`;
  if (REGION_TRACK_IDS_V68.includes(state.regionId) && !state.eventReceipts.includes('track')) return `Observer la faune sans attaquer : ${Math.min(90, state.observedTicks)}/90 — consigner près du poste`;
  if (REGION_CHALLENGE_IDS_V68.includes(state.regionId) && !state.eventReceipts.includes('challenge')) return `Maîtrise : ${state.fauna.evaded}/2 charges évitées · ${state.fauna.touches}/3 touches en récupération`;
  if (REGION_WARD_IDS_V68.includes(state.regionId) && !state.eventReceipts.includes('ward')) return `Protéger les balises : ${state.protectedPosts.length}/2 · ${state.evaded}/1 danger évité`;
  if (!state.recovered && !state.eventReceipts.includes('challenge') && !state.eventReceipts.includes('ward')) return state.evaded < 1 ? 'Observer le danger, s’écarter puis relever le coffret' : 'Récupérer le coffret pendant l’accalmie';
  return state.reported ? 'Rapport remis — visiter le clan ou reprendre la corniche' : `Rapporter le relevé à ${d.guideName}`;
}
export function normalizeRegionFieldEventV68(value: unknown): RegionFieldEventV68 | null {
  if (!record(value) || value.version !== 1 || !isHomeworldRegionIdV68(value.regionId) || typeof value.runId !== 'string' || !/^[\w:-]{1,100}$/.test(value.runId) || !Number.isSafeInteger(value.tick) || (value.tick as number) < 1 || !['survey', 'recover', 'track', 'challenge', 'ward', 'report'].includes(String(value.action)) || typeof value.siteId !== 'string' || typeof value.targetId !== 'string' || !finite(value.walked) || value.walked < 400 || !record(value.actor) || ![value.actor.x, value.actor.y].every(finite) || value.trailCount !== 3 || ![value.evaded, value.observedTicks, value.touches, value.interventions].every(n => Number.isSafeInteger(n) && (n as number) >= 0) || value.armed !== false) return null;
  const action = value.action as RegionFieldActionV68, region = value.regionId;
  if (value.siteId !== `${region}-${action === 'survey' ? 'trail-3' : action === 'recover' ? 'cache' : action === 'report' ? 'guide' : action}` || value.targetId !== `${region}-${action === 'survey' ? 'trail' : action === 'track' || action === 'challenge' ? 'fauna' : action === 'report' ? 'guide' : 'relay'}`) return null;
  if (action === 'track' && (!REGION_TRACK_IDS_V68.includes(region) || (value.observedTicks as number) < 90) || action === 'challenge' && (!REGION_CHALLENGE_IDS_V68.includes(region) || (value.evaded as number) < 2 || (value.touches as number) < 3) || action === 'ward' && (!REGION_WARD_IDS_V68.includes(region) || (value.evaded as number) < 1 || value.interventions !== 2) || action === 'recover' && (value.evaded as number) < 1) return null;
  const expected = action === 'survey' ? HOMEWORLD_REGION_TRACES_V68[2] : action === 'recover' ? { x: 7720, y: 2220 } : action === 'report' ? HOMEWORLD_REGIONS_V68[region].residents[0] : { x: 7450, y: 2050 };
  if (Math.hypot((value.actor.x as number) - expected.x, (value.actor.y as number) - expected.y) > (action === 'survey' ? 110 : action === 'track' || action === 'challenge' || action === 'ward' ? 1100 : 150) || value.walked > (value.tick as number) * HOMEWORLD_ACTOR.walkSpeed / 60 + .1 || !isHomeworldRegionWalkableV68(region, 'village', value.actor as unknown as HomeworldVec2, value.tick as number)) return null;
  return structuredClone(value) as unknown as RegionFieldEventV68;
}
export function normalizeHomeworldRegionV68(value: unknown): HomeworldRegionStateV68 | null {
  if (!record(value) || value.version !== 1 || !isHomeworldRegionIdV68(value.regionId) || typeof value.runId !== 'string' || !/^[\w:-]{1,100}$/.test(value.runId) || !Number.isSafeInteger(value.tick) || (value.tick as number) < 0 || !finite(value.walked) || value.walked < 0 || value.walked > (value.tick as number) * HOMEWORLD_ACTOR.walkSpeed / 60 + .1 || !['passage', 'village', 'interior'].includes(String(value.zone)) || !['outbound', 'return'].includes(String(value.direction)) || !['walking', 'at-city'].includes(String(value.status)) || !record(value.actor)) return null;
  const a = value.actor, id = value.regionId, definition = HOMEWORLD_REGIONS_V68[id];
  if (![a.x, a.y, a.vx, a.vy].every(finite) || a.grounded !== true || (a.facing !== 1 && a.facing !== -1) || Math.abs(a.vx as number) > HOMEWORLD_ACTOR.walkSpeed + .1 || Math.abs(a.vy as number) > HOMEWORLD_ACTOR.depthSpeed + .1 || !isHomeworldRegionWalkableV68(id, value.zone as HomeworldRegionStateV68['zone'], a as unknown as HomeworldVec2, value.tick as number, typeof value.buildingId === 'string' ? value.buildingId : null)) return null;
  if (![value.routeVisited, value.visitedBuildings, value.greeted, value.traces, value.eventReceipts, value.protectedPosts].every(Array.isArray) || typeof value.villageEntered !== 'boolean' || typeof value.recovered !== 'boolean' || typeof value.reported !== 'boolean' || typeof value.hazardArmed !== 'boolean' || !Number.isSafeInteger(value.evaded) || (value.evaded as number) < 0 || (value.evaded as number) > (value.tick as number) / 360 + 1 || !Number.isSafeInteger(value.observedTicks) || (value.observedTicks as number) < 0 || (value.observedTicks as number) > Math.min(3600, value.tick as number) || !record(value.fauna)) return null;
  const route = value.routeVisited as unknown[];
  if (route.length < 1 || route.length > definition.route.length || !route.every((n, i) => n === (value.direction === 'outbound' ? i : definition.route.length - 1 - i))) return null;
  const uniqueMembers = (members: unknown[], valid: readonly string[]) => members.length <= valid.length && new Set(members).size === members.length && members.every(n => typeof n === 'string' && valid.includes(n));
  if (!uniqueMembers(value.visitedBuildings as unknown[], definition.buildings.map(b => b.id)) || !uniqueMembers(value.greeted as unknown[], definition.residents.map(n => n.id)) || !uniqueMembers(value.eventReceipts as unknown[], ['survey', 'recover', 'track', 'challenge', 'ward', 'report']) || !uniqueMembers(value.protectedPosts as unknown[], ['ward-1', 'ward-2'])) return null;
  const traces = value.traces as unknown[];
  const f = value.fauna;
  if (![f.x, f.y, f.targetY].every(finite) || (f.x as number) < 6780 || (f.x as number) > 8200 || (f.y as number) < 1500 || (f.y as number) > 2650 || (f.targetY as number) < 1500 || (f.targetY as number) > 2650 || !['quiet', 'warning', 'charge', 'recovery', 'retreated'].includes(String(f.phase)) || ![f.ticks, f.evaded, f.touches].every(n => Number.isSafeInteger(n) && (n as number) >= 0) || (f.ticks as number) > 160 || (f.touches as number) > 3 || (f.evaded as number) > (value.tick as number) / 300 + 1 || typeof f.touchedThisRecovery !== 'boolean' || typeof f.hitThisCharge !== 'boolean') return null;
  const receipts = value.eventReceipts as string[];
  if ((f.touches as number) > 0 && (f.phase === 'quiet' || traces.length !== 3 || !receipts.includes('track')) || (f.evaded as number) > 0 && f.phase === 'quiet' || f.phase !== 'quiet' && (!REGION_CHALLENGE_IDS_V68.includes(id) || !receipts.includes('track') || traces.length !== 3)) return null;
  if (receipts.includes('track') && (value.observedTicks as number) < 90 || receipts.includes('challenge') && ((f.evaded as number) < 2 || (f.touches as number) < 3 || f.phase !== 'retreated') || receipts.includes('ward') && ((value.protectedPosts as string[]).length !== 2 || (value.evaded as number) < 1) || receipts.includes('recover') && !value.recovered || receipts.includes('survey') && traces.length !== 3 || receipts.includes('report') && !value.reported) return null;
  if (traces.length > 3 || !traces.every((n, i) => n === `trail-${i + 1}`) || traces.length > 0 && !(value.greeted as string[]).includes('guide') || value.recovered && (traces.length !== 3 || (value.evaded as number) < 1) || value.reported && !receipts.some(r => ['survey', 'track', 'recover', 'challenge', 'ward'].includes(r))) return null;
  if (value.zone === 'interior' ? typeof value.buildingId !== 'string' || !definition.buildings.some(b => b.id === value.buildingId) || !(value.visitedBuildings as string[]).includes(value.buildingId) : value.buildingId !== null) return null;
  if (value.zone !== 'passage' && !value.villageEntered || value.direction === 'return' && !value.villageEntered) return null;
  if (value.zone !== 'passage' && value.direction === 'outbound' && route.length !== definition.route.length) return null;
  if (value.status === 'at-city' && (value.zone !== 'passage' || Math.hypot((a.x as number) - definition.route[0].x, (a.y as number) - definition.route[0].y) > 100 || value.direction === 'return' && route.length !== definition.route.length)) return null;
  if (value.pendingFieldEvent !== null) {
    const event = normalizeRegionFieldEventV68(value.pendingFieldEvent);
    if (!event || event.regionId !== id || event.runId !== value.runId || event.tick !== value.tick || event.walked !== value.walked || event.actor.x !== a.x || event.actor.y !== a.y || event.trailCount !== traces.length || event.evaded !== (event.action === 'challenge' ? f.evaded : value.evaded) || event.observedTicks !== value.observedTicks || event.touches !== f.touches || event.interventions !== (value.protectedPosts as string[]).length || event.action !== 'report' && receipts.includes(event.action)) return null;
  }
  return structuredClone(value) as unknown as HomeworldRegionStateV68;
}
/** Save ownership is enforced by GameClient; this guard protects movement/evidence against stale callbacks. */
export function canAdvanceHomeworldRegionV68(previous: unknown, next: unknown): boolean {
  const b = normalizeHomeworldRegionV68(next); if (!b) return false;
  if (previous == null) return b.tick === 0 && b.walked === 0 && !b.traces.length && !b.recovered && !b.reported;
  const a = normalizeHomeworldRegionV68(previous); if (!a || a.regionId !== b.regionId || a.runId !== b.runId || b.tick < a.tick || b.walked < a.walked || a.recovered && !b.recovered || a.reported && !b.reported || b.evaded < a.evaded || b.traces.length < a.traces.length || a.greeted.some(n => !b.greeted.includes(n)) || a.visitedBuildings.some(n => !b.visitedBuildings.includes(n)) || a.eventReceipts.some(n => !b.eventReceipts.includes(n))) return false;
  if (a.status === 'at-city') return JSON.stringify(a) === JSON.stringify(b);
  const maximum = (b.tick - a.tick) * HOMEWORLD_ACTOR.walkSpeed / 60 + .1;
  if (b.walked - a.walked > maximum || b.evaded - a.evaded > Math.ceil((b.tick - a.tick) / 360)) return false;
  if (a.zone === b.zone && a.buildingId === b.buildingId && a.direction === b.direction && Math.hypot(b.actor.x - a.actor.x, b.actor.y - a.actor.y) > maximum) return false;
  if (a.zone !== b.zone || a.buildingId !== b.buildingId || a.direction !== b.direction) {
    // Handoffs have authored thresholds, never arbitrary spawn coordinates.
    if (a.zone === 'passage' && b.zone === 'village') { if (b.direction !== 'outbound' || b.actor.x !== 520 || b.actor.y !== 2800 || !b.villageEntered || b.routeVisited.length !== HOMEWORLD_REGIONS_V68[b.regionId].route.length) return false; }
    else if (a.zone === 'village' && b.zone === 'passage') { const end = HOMEWORLD_REGIONS_V68[b.regionId].route.at(-1)!; if (b.direction !== 'return' || b.actor.x !== end.x || b.actor.y !== end.y || b.routeVisited.length !== 1) return false; }
    else if (a.zone === 'village' && b.zone === 'interior') { if (b.actor.x !== 380 || b.actor.y !== 620 || !b.visitedBuildings.includes(b.buildingId!)) return false; }
    else if (a.zone === 'interior' && b.zone === 'village') { const door = homeworldBuildingDoorwayV64(HOMEWORLD_REGIONS_V68[b.regionId].buildings.find(n => n.id === a.buildingId)!); if (b.actor.x !== door.approach.x || b.actor.y !== door.approach.y) return false; }
    else return false;
  }
  if (a.pendingFieldEvent && !b.pendingFieldEvent && !b.eventReceipts.includes(a.pendingFieldEvent.action)) return false;
  return true;
}
export function homeworldRegionRouteMetresV68(id: HomeworldRegionIdV68) {
  const nodes = HOMEWORLD_REGIONS_V68[id].route;
  return nodes.slice(1).reduce((n, p, i) => n + Math.hypot(p.x - nodes[i].x, p.y - nodes[i].y), 0) * HOMEWORLD_GEOMETRY_V64.adultMetres / HOMEWORLD_GEOMETRY_V64.adultHeight;
}
