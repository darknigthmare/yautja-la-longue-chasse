import type { HomeworldInteriorV64 } from './homeworldInteriorsV64';
import type { HomeworldInteriorZoneV72, HomeworldInteriorPartitionV72 } from './homeworldFunctionalInteriorsV72';
import type { HomeworldFurnitureInstanceV72 } from './homeworldFurnitureV72';
import type { HomeworldInteriorDecorInstanceV76 } from './homeworldInteriorDecorV76';
import { HOMEWORLD_STREET_DECOR_ART_V83, homeworldStreetDecorPolygonV83, homeworldStreetDecorUsageV83, type HomeworldStreetDecorPropV83 } from './homeworldStreetDecorV83';
import { HOMEWORLD_STREET_DECOR_ART_V84, homeworldStreetDecorPolygonV84, homeworldStreetDecorUsageV84 } from './homeworldStreetDecorV84';
import { homeworldInteriorNativePolygonTouchesV83 } from './homeworldCivicPublicComplexV83';

export interface HomeworldPortNativePropV84 extends HomeworldStreetDecorPropV83 { readonly sourceVersion: 'V83' | 'V84' }
export interface HomeworldPortPublicComplexV84 {
  version: 'V84'; kind: 'dock' | 'workshop' | 'store'; purpose: string;
  nativeProps: readonly HomeworldPortNativePropV84[];
  passages: readonly { id: string; x: number; y: number; width: number; orientation: 'horizontal' | 'vertical' }[];
  activities: readonly { id: string; label: string; zoneId: string; status: 'scenery-existing-services-only' }[];
  validation: 'implemented-not-verified'; lore: 'original-public-complex-in-preserved-envelope';
}
type Pose = readonly [number, number];

export const homeworldPortNativePropArtV84 = (item: HomeworldPortNativePropV84) => item.sourceVersion === 'V84'
  ? HOMEWORLD_STREET_DECOR_ART_V84[item.artId] : HOMEWORLD_STREET_DECOR_ART_V83[item.artId];
export const homeworldPortNativePolygonV84 = (item: HomeworldPortNativePropV84) => item.sourceVersion === 'V84'
  ? homeworldStreetDecorPolygonV84(item) : homeworldStreetDecorPolygonV83(item);
export const homeworldPortNativeUsageV84 = (item: HomeworldPortNativePropV84) => item.sourceVersion === 'V84'
  ? homeworldStreetDecorUsageV84(item) : homeworldStreetDecorUsageV83(item);
export function homeworldPortNativeTouchesV84(room: HomeworldInteriorV64, point: { x: number; y: number }, body: { halfWidth: number; halfDepth: number }): boolean {
  return (room.portComplexV84?.nativeProps ?? []).some(item => homeworldInteriorNativePolygonTouchesV83(homeworldPortNativePolygonV84(item), point, body));
}

/** Three port/convoy public plans, not a new vehicle or logistics system.
 * Older fixture, partition, zone and passage IDs remain; services/evidence,
 * spawn/exit, room envelope and progression are never altered here. */
export function homeworldPortPublicComplexV84(room: HomeworldInteriorV64): HomeworldInteriorV64 {
  if (!['dock-control', 'convoy-workshop', 'convoy-store'].includes(room.buildingId)) return room;
  const prefix = room.buildingId, addedFurniture: HomeworldFurnitureInstanceV72[] = [], addedDecor: HomeworldInteriorDecorInstanceV76[] = [];
  const nativeProps: HomeworldPortNativePropV84[] = [];
  const furnish = (suffix: string, artId: HomeworldFurnitureInstanceV72['artId'], x: number, y: number, scale: number) =>
    addedFurniture.push({ id: `${prefix}-v84-${suffix}`, artId, x, y, scale });
  const oriented = (suffix: string, artId: HomeworldInteriorDecorInstanceV76['artId'], x: number, y: number, scale: number, purpose: string) =>
    addedDecor.push({ id: `${prefix}-v84-${suffix}`, artId, x, y, scale, solid: true, purpose,
      placement: 'v84-authored-public-complex-implemented-not-verified' });
  const native = (suffix: string, artId: string, x: number, y: number, scale: number, label: string, purpose: string, sourceVersion: HomeworldPortNativePropV84['sourceVersion'] = 'V83') =>
    nativeProps.push({ id: `${prefix}-v84-${suffix}`, artId, x, y, scale, label, purpose,
      sourceVersion, levelId: '0', districtId: prefix === 'dock-control' ? 'port' : 'convoy-works', buildingId: prefix, interactive: false, solid: true });
  const zone = (index: number, suffix: string, label: string, x: number, y: number, width: number, depth: number): HomeworldInteriorZoneV72 => ({
    id: room.zones?.[index]?.id ?? `${prefix}-v84-zone-${suffix}`, label, x, y, width, depth });
  const wall = (index: number, suffix: string, x: number, y: number, width: number, depth: number): HomeworldInteriorPartitionV72 => ({
    id: room.partitions?.[index]?.id ?? `${prefix}-v84-wall-${suffix}`, x, y, width, depth,
    orientation: width > depth ? 'horizontal' : 'vertical', cutawayHeight: 36 });
  const passage = (index: number, suffix: string, x: number, y: number, width: number, orientation: 'horizontal' | 'vertical' = 'horizontal') => ({
    id: room.secondaryLayoutV74?.passages[index]?.id ?? `${prefix}-v84-passage-${suffix}`, x, y, width, orientation });
  let kind: HomeworldPortPublicComplexV84['kind'], title: string, purpose: string;
  let zones: HomeworldInteriorZoneV72[], partitions: HomeworldInteriorPartitionV72[], passages: HomeworldPortPublicComplexV84['passages'];
  let furniturePoses: Readonly<Record<string, Pose>>, decorPoses: Readonly<Record<string, Pose>>;
  if (prefix === 'dock-control') {
    kind = 'dock'; title = 'Quais · contrôle, inspection et relève';
    purpose = 'Bureau des amarrages, attente des délégations, réserve fermée et inspection du convoi sont distincts autour de la traverse publique. L’officier et la preuve existante restent aux mêmes points ; aucun nouveau transport ou dossier d’enquête.';
    zones = [zone(0, 'control', 'Bureau des amarrages', 20, 20, 170, 146),
      zone(1, 'inspection', 'Inspection du convoi et expédition', 354, 110, 164, 178),
      zone(2, 'reserve', 'Réserve fermée des pièces', 354, 20, 164, 82),
      zone(3, 'waiting', 'Attente et préparation des délégations', 20, 186, 170, 102),
      zone(4, 'traverse', 'Traverse publique des quais', 192, 20, 162, 268)];
    partitions = [wall(0, 'control-screen', 180, 20, 12, 76), wall(1, 'lower-screen', 354, 256, 12, 32),
      wall(2, 'reserve-screen', 354, 20, 12, 52)];
    furniturePoses = { registre: [108, 80], cargaison: [402, 72], contenants: [492, 227], veille: [44, 160] };
    decorPoses = { '0': [44, 230], '1': [512, 264], '2': [472, 56], '3': [503, 178] };
    furnish('delegation-parures', 'clothing-rack', 132, 274, .5);
    furnish('control-standard', 'clan-banner', 172, 116, .35);
    furnish('inspection-containers', 'sealed-jars', 420, 226, .45);
    furnish('departure-lot', 'convoy-crates', 388, 282, .55);
    furnish('inspection-register', 'register-desk', 442, 116, .4);
    oriented('inspection-case', 'chest-diagonal', 371, 116, .5, 'Contenant fermé de l’inspection ; aucune nouvelle preuve ou prise disponible.');
    oriented('departure-case', 'chest-diagonal', 446, 296, .42, 'Rangement du départ distinct de la pièce du convoi déjà produite, sans butin.');
    passages = [passage(0, 'control-branch', 192, 174, 144, 'vertical'), passage(1, 'inspection-branch', 354, 189, 160, 'vertical'),
      passage(2, 'south-traverse', 269, 236, 162)];
  } else if (prefix === 'convoy-workshop') {
    kind = 'workshop'; title = 'Convois · maintenance et préparation des pièces';
    purpose = 'Deux postes historiques de maintenance restent séparés du stock et de la manutention ; une allée axiale relie la préparation au seuil. Les outils et lots restent du décor, sans véhicule inventé, fabrication gratuite ou nouvelle mission.';
    zones = [zone(0, 'maintenance', 'Maintenance et inspection', 20, 20, 180, 114),
      zone(1, 'preparation', 'Préparation des montages', 354, 20, 164, 124),
      zone(2, 'stock', 'Stock des pièces de relève', 20, 160, 180, 128),
      zone(3, 'handling', 'Manutention et préparation des lots', 354, 174, 164, 114),
      zone(4, 'traverse', 'Allée axiale de maintenance', 200, 20, 154, 268)];
    partitions = [wall(0, 'west-screen', 20, 142, 80, 12), wall(1, 'east-screen', 468, 142, 50, 12)];
    furniturePoses = { 'travail-ouest': [120, 100], 'travail-est': [418, 100], caisse: [88, 276], parures: [450, 260], veille: [506, 146] };
    decorPoses = { '1': [512, 196], '2': [374, 192] };
    native('preparation-console', 'maintenance-console-right', 134, 190, 1, 'Console de préparation des pièces',
      'Console native avec face opérateur sud-est dans la préparation des pièces ; décor non interactif, sans service ou transport supplémentaire disponible.', 'V84');
    furnish('closed-materials', 'sealed-jars', 174, 282, .45);
    furnish('work-standard', 'clan-banner', 178, 130, .35);
    furnish('dispatch-register', 'register-desk', 388, 296, .4);
    furnish('small-containers', 'sealed-jars', 514, 278, .28);
    furnish('preparation-veille', 'resin-lantern', 382, 134, .4);
    oriented('stock-rack', 'rack-lateral', 38, 188, .7, 'Rangement latéral des petites pièces et parures, fermé et non collectable.');
    oriented('assembly-case', 'chest-diagonal', 444, 130, .4, 'Lot fermé du poste de préparation ; aucun modèle de véhicule canonique n’est créé.');
    passages = [passage(0, 'public-traverse', 277, 154, 154), passage(1, 'maintenance-branch', 172, 154, 144),
      passage(2, 'handling-branch', 420, 224, 148)];
  } else {
    kind = 'store'; title = 'Convois · tri, réserve et expédition';
    purpose = 'Trois travées distinguent le tri, la réserve scellée et l’expédition ; une large galerie traverse leur façade intérieure avant la réception des lots. Toutes les cargaisons sont environnementales, sans inventaire ou nouvelle récompense.';
    zones = [zone(0, 'sorting', 'Tri des retours', 20, 20, 156, 132), zone(1, 'reserve', 'Réserve scellée', 200, 20, 138, 132),
      zone(2, 'dispatch', 'Expédition et préparation', 362, 20, 156, 132), zone(3, 'aisle', 'Galerie de manutention', 20, 160, 498, 64),
      zone(4, 'receiving', 'Réception des lots fermés', 20, 236, 498, 52)];
    partitions = [wall(0, 'sorting-screen', 176, 20, 12, 82), wall(1, 'dispatch-screen', 350, 20, 12, 82)];
    furniturePoses = { pieces: [90, 80], contenants: [269, 95], chargements: [442, 80], veille: [498, 206] };
    decorPoses = { '1': [512, 264] };
    native('sorting-rack', 'cargo-rack-right', 115, 130, .66, 'Rack natif de tri', 'Rack orienté de tri des retours, sans pièce d’artisanat à récupérer.');
    native('dispatch-counter', 'merchant-counter-left', 428, 134, .66, 'Comptoir natif d’expédition', 'Surface latérale de préparation des lots, sans nouvel achat ou départ de vaisseau.');
    furnish('receiving-register', 'register-desk', 110, 283, .4);
    furnish('receiving-lot', 'convoy-crates', 172, 281, .5);
    furnish('dispatch-containers', 'sealed-jars', 449, 281, .5);
    furnish('dispatch-parures', 'clothing-rack', 386, 281, .45);
    furnish('reserve-standard', 'clan-banner', 303, 125, .35);
    furnish('dispatch-veille', 'resin-lantern', 492, 118, .4);
    oriented('closed-dispatch-case', 'chest-diagonal', 487, 295, .4, 'Lot fermé à l’écart de l’ancre de sortie, sans objet récupérable.');
    oriented('receiving-rack', 'rack-lateral', 38, 286, .5, 'Rangement latéral du registre de réception, sans dossier de quête inventé.');
    passages = [passage(0, 'sorting-branch', 104, 166, 156), passage(1, 'reserve-branch', 269, 166, 144),
      passage(2, 'dispatch-branch', 440, 166, 156), passage(3, 'receiving-traverse', 269, 236, 160)];
  }
  const furniture = (room.furniture ?? []).map(item => {
    const pose = furniturePoses[item.id.replace(`${prefix}-v74-`, '')]; return pose ? { ...item, x: pose[0], y: pose[1] } : item;
  });
  const orientedDecorV76 = (room.orientedDecorV76 ?? []).map(item => {
    const pose = decorPoses[item.id.replace(`${prefix}-v76-`, '')];
    return !pose ? item : { ...item, x: pose[0], y: pose[1],
      purpose: `${title} · ${item.purpose.slice(item.purpose.indexOf(' · ') + 3)}`, placement: 'v84-authored-public-complex-implemented-not-verified' };
  });
  return { ...room, title, description: `${purpose} Cinq espaces publics composés dans l’enveloppe existante ; lot implémenté, non vérifié.`,
    furniture: [...furniture, ...addedFurniture], orientedDecorV76: [...orientedDecorV76, ...addedDecor], zones, partitions,
    secondaryLayoutV74: room.secondaryLayoutV74 ? { ...room.secondaryLayoutV74, purpose, archetype: `v84-${kind}-public-complex`, passages } : undefined,
    portComplexV84: { version: 'V84', kind, purpose, nativeProps, passages,
      activities: zones.map(item => ({ id: `${item.id}-activity`, label: item.label, zoneId: item.id, status: 'scenery-existing-services-only' })),
      validation: 'implemented-not-verified', lore: 'original-public-complex-in-preserved-envelope' } };
}
