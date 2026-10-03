import envelopes from '../data/homeworldInteriorEnvelopesV64.json';
import { HOMEWORLD_PROP_ART_V64 } from './homeworldArtV64';
import {homeworldFunctionalInteriorV72,homeworldInteriorPartitionBlocksV72,type HomeworldInteriorPartitionV72,type HomeworldInteriorZoneV72} from './homeworldFunctionalInteriorsV72';
import {homeworldFurnitureTouchesV72,type HomeworldFurnitureInstanceV72} from './homeworldFurnitureV72';
import {homeworldSecondaryInteriorV74,type HomeworldSecondaryLayoutV74} from './homeworldSecondaryInteriorsV74';
import {homeworldDecoratedInteriorV76,homeworldInteriorDecorTouchesV76,type HomeworldInteriorDecorInstanceV76} from './homeworldInteriorDecorV76';
import {homeworldCntlipInteriorV77,homeworldCntlipHostTouchesV77} from './homeworldCntlipPhysicalV77';

/** Original civic/domestic interiors for this game; not a canonical map of Yautja Prime.
 * Coordinates are on the unprojected ground plane. The renderer alone applies
 * x, y*sin(35deg)-z; collision and proximity never use screen coordinates. */
export interface InteriorGroundPointV64 { x: number; y: number }
export interface HomeworldInteriorPointV64 extends InteriorGroundPointV64 { pointId: string }
export interface HomeworldInteriorPropV64 extends InteriorGroundPointV64 {
  id: string;
  kind: "console" | "rack" | "forge" | "archive" | "medbay" | "bench" | "cargo" | "rest-cot" | "meal-table" | "storage-locker";
  width: number;
  height: number;
  halfWidth: number;
  halfDepth: number;
}
export interface HomeworldInteriorV64 {
  buildingId: string;
  kind: 'civic' | 'domestic';
  variant: 'civic' | 'rest' | 'meal' | 'storage';
  title: string;
  description: string;
  width: number;
  depth: number;
  spawn: InteriorGroundPointV64;
  exit: InteriorGroundPointV64;
  points: readonly HomeworldInteriorPointV64[];
  props: readonly HomeworldInteriorPropV64[];
  partitions?:readonly HomeworldInteriorPartitionV72[];
  zones?:readonly HomeworldInteriorZoneV72[];
  furniture?:readonly HomeworldFurnitureInstanceV72[];
  /** Public placement contract for the 37 secondary rooms; no new gameplay actions. */
  secondaryLayoutV74?:HomeworldSecondaryLayoutV74;
  /** Independent native oriented scenery, preserving every older fixture/action. */
  orientedDecorV76?:readonly HomeworldInteriorDecorInstanceV76[];
}

// Keep every original narrative/service ID. Entering a room grants no rank,
// evidence, equipment or greeting: those still go through the existing action.
export const HOMEWORLD_INTERIOR_BINDINGS_V64: Readonly<Record<string, readonly string[]>> = {
  "dock-control": ["dock-officer-point", "suspect-trophy-point"],
  "market-armory": ["market-service"],
  "market-canopy": [],
  "deep-forge": ["forge-service"],
  "undercity-refuge": ["witness-point"],
  "trophy-mausoleum": ["trophy-service", "mausoleum-service"],
  "training-hall": ["training-service"],
  "clan-lodge": ["medbay-service"],
  "enforcer-bastion": ["enforcer-point"],
  "memory-vault": ["memory-register-point", "memory-service"],
  "pit-gate": ["pit-service"],
  "rite-sanctum": ["temple-point"],
  "throne-audience": ["audience-point"],
  "convoy-workshop": [],
  "convoy-store": [],
  "convoy-south-shelter": [],
  "rampart-north-lodge": [],
  "rampart-watch": [],
  "rampart-south-lodge": [],
};

export const HOMEWORLD_INTERIOR_POINT_IDS_V64 = new Set(Object.values(HOMEWORLD_INTERIOR_BINDINGS_V64).flat());
const roomInfo: Readonly<Record<string, readonly [string, string, HomeworldInteriorPropV64["kind"]]>> = {
  "dock-control": ["Contrôle d’amarrage", "L’officier et la pièce du convoi attendent dans le bureau des quais.", "console"],
  "market-armory": ["Échoppe d’équipement", "Présentoirs d’armes et poste de l’artisan. L’équipement reste soumis à ta progression.", "rack"],
  "market-canopy": ["Halle des échanges", "Une halte couverte pour les délégations et leurs chargements.", "cargo"],
  "deep-forge": ["Atelier des parures", "Le foyer de travail reste séparé de la circulation des visiteurs.", "forge"],
  "undercity-refuge": ["Refuge des galeries", "Le témoin t’attend à l’abri de la rue.", "bench"],
  "trophy-mausoleum": ["Mausolée public", "Présentation des prises et accès aux archives des Grandes Chasses.", "archive"],
  "training-hall": ["Salle des maîtres", "Le maître reçoit les jeunes chasseurs avant leurs exercices.", "rack"],
  "clan-lodge": ["Maison des délégations", "Un espace de repos et de soins, distinct des ateliers.", "medbay"],
  "enforcer-bastion": ["Salle des preuves", "Le capitaine conserve les dossiers et écoute les dépositions.", "archive"],
  "memory-vault": ["Registre des marques", "Le gardien et les archives permettent de comparer les pièces du dossier.", "archive"],
  "pit-gate": ["Vestibule des arènes", "L’intendant contrôle l’accès au service THE PIT ; visiter cette salle ne gagne aucun combat.", "bench"],
  "rite-sanctum": ["Sanctuaire des rites", "La gardienne reçoit les visiteurs sans leur attribuer un nouveau rang.", "archive"],
  "throne-audience": ["Salle d’audience", "Présente les preuves au représentant de cette cité et de ses clans alliés.", "archive"],
  "convoy-workshop": ["Atelier des convois", "Poste de maintenance local. Aucun véhicule ni voyage n’est accordé en entrant.", "forge"],
  "convoy-store": ["Dépôt des convois", "Cargaisons rangées à l’écart du couloir de circulation.", "cargo"],
  "convoy-south-shelter": ["Abri de la cour sud", "Un relais couvert pour attendre le départ des convois.", "bench"],
  "rampart-north-lodge": ["Relais haut", "Abri de patrouille relié à la promenade des remparts.", "bench"],
  "rampart-watch": ["Poste des remparts", "Console d’observation civique. Cette salle n’ouvre aucune expédition.", "console"],
  "rampart-south-lodge": ["Relais bas", "Halte de repos pour les voyageurs de la galerie basse.", "bench"],
};

const civicRooms: HomeworldInteriorV64[] = Object.entries(HOMEWORLD_INTERIOR_BINDINGS_V64).map(([buildingId, pointIds]) => {
  const [title, description, kind] = roomInfo[buildingId];
  const envelope = envelopes.find(item => item.buildingId === buildingId)!;
  const width = envelope.width - 32, depth = envelope.depth - 32;
  return {
    buildingId, kind: 'civic', variant: 'civic', title, description, width, depth,
    // Separate these anchors so a held interaction never immediately exits.
    spawn: { x: width / 2, y: depth - 72 },
    exit: { x: width / 2, y: depth - 24 },
    points: pointIds.map((pointId, i) => ({ pointId, x: width * (pointIds.length === 1 ? .5 : i === 0 ? .3 : .7), y: depth * .3 })),
    props: [
      { id: `${buildingId}-west`, kind, x: 60, y: 66, width: 80, height: 70, halfWidth: 25, halfDepth: 15 },
      { id: `${buildingId}-east`, kind, x: width - 60, y: 66, width: 80, height: 70, halfWidth: 25, halfDepth: 15 },
    ],
  };
});

// Preserve the original room variants and fallback data. V74 adds authored
// secondary layouts below, without changing their envelope or gameplay actions.
const domesticRooms: HomeworldInteriorV64[] = envelopes.filter(item => item.kind === 'domestic').map(envelope => {
  const width = envelope.width - 32, depth = envelope.depth - 32;
  const variant = envelope.variant as 'rest' | 'meal' | 'storage';
  const prop = (id: string, kind: HomeworldInteriorPropV64['kind'], x: number, y: number, w: number, h: number,
    halfWidth: number, halfDepth: number): HomeworldInteriorPropV64 => ({ id: `${envelope.buildingId}-${id}`, kind, x, y, width: w, height: h, halfWidth, halfDepth });
  const props = variant === 'rest' ? [
    prop('cot', 'rest-cot', 76, depth * .5, 102, 60, 38, 18),
    prop('locker', 'storage-locker', width - 52, 62, 62, 100, 22, 16),
  ] : variant === 'meal' ? [
    prop('table', 'meal-table', width / 2, depth * .32, 104, 54, 36, 20),
    prop('cot-west', 'rest-cot', 65, depth * .6, 88, 54, 30, 18),
    prop('locker-east', 'storage-locker', width - 54, 70, 62, 100, 22, 16),
  ] : [
    prop('locker-west', 'storage-locker', 54, 55, 62, 100, 22, 16),
    prop('locker-east', 'storage-locker', width - 54, 55, 62, 100, 22, 16),
    prop('cot', 'rest-cot', 62, depth * .65, 82, 50, 28, 15),
  ];
  return { buildingId: envelope.buildingId, kind: 'domestic', variant,
    title: variant === 'rest' ? 'Maison · alcôve de repos' : variant === 'meal' ? 'Maison · salle commune' : 'Maison · réserve domestique',
    description: 'Habitat original conçu pour cette cité. Mobilier et organisation ne sont pas une description canonique des foyers yautja.',
    width, depth, spawn: { x: width / 2, y: depth - 72 }, exit: { x: width / 2, y: depth - 24 }, points: [], props };
});

/** The pivot of each native prop is its front ground edge, not its centre. */
export function homeworldInteriorPropArtIdV64(kind: HomeworldInteriorPropV64['kind']): keyof typeof HOMEWORLD_PROP_ART_V64 {
  const ids = { console: 'console', rack: 'locker', forge: 'workshop', archive: 'locker',
    medbay: 'cot', bench: 'bench', cargo: 'chest', 'rest-cot': 'cot',
    'meal-table': 'table', 'storage-locker': 'locker' } as const;
  return ids[kind];
}

export const HOMEWORLD_INTERIORS_V64: readonly HomeworldInteriorV64[] = [...civicRooms, ...domesticRooms].map(homeworldFunctionalInteriorV72).map(homeworldSecondaryInteriorV74).map(room => ({
  ...room,
  props: room.props.map(prop => {
    const art = HOMEWORLD_PROP_ART_V64[homeworldInteriorPropArtIdV64(prop.kind)];
    const nativeWidth = art.alphaBounds.width / art.alphaBounds.height * art.heightWorld;
    // Match the layout's maximum width AND height without distorting wide benches.
    // Keep the full ground footprint inside the room even at a shallow north socket.
    const availableWidth = Math.min(prop.width, (prop.x - 10) * 2, (room.width - prop.x - 10) * 2);
    const ratio = Math.min(prop.height / art.heightWorld, availableWidth / nativeWidth,
      (prop.y - 10) / art.footprintWorld.depth);
    return { ...prop, height: art.heightWorld * ratio, width: nativeWidth * ratio,
      halfWidth: art.footprintWorld.width * ratio / 2,
      halfDepth: art.footprintWorld.depth * ratio / 2 };
  }),
})).map(homeworldDecoratedInteriorV76).map(homeworldCntlipInteriorV77);

export const homeworldInteriorForBuildingV64 = (id: string) => HOMEWORLD_INTERIORS_V64.find(room => room.buildingId === id) ?? null;
export const homeworldInteriorForPointV64 = (id: string) => HOMEWORLD_INTERIORS_V64.find(room => room.points.some(point => point.pointId === id)) ?? null;

/** Only these three existing room points are objects instead of inhabitants.
 * The evidence's ground footprint is a conservative authored estimate; the
 * console support and footprint come from the native atlas measurements. */
export function homeworldInteriorPointPropV64(point: HomeworldInteriorPointV64) {
  if (point.pointId === 'suspect-trophy-point') return { id: `point-${point.pointId}`, artId: null,
    x: point.x, y: point.y, width: 40, height: 42, halfWidth: 20, halfDepth: 10, measurement: 'authored-evidence-footprint' };
  if (!['memory-service', 'mausoleum-service'].includes(point.pointId)) return null;
  const art = HOMEWORLD_PROP_ART_V64.console;
  return { id: `point-${point.pointId}`, artId: 'console' as const, x: point.x, y: point.y,
    width: art.alphaBounds.width / art.alphaBounds.height * art.heightWorld, height: art.heightWorld,
    halfWidth: art.footprintWorld.width / 2, halfDepth: art.footprintWorld.depth / 2, measurement: 'native-atlas' };
}

/** Eight display sockets, not eight granted trophies. Claims remain save-owned. */
export function homeworldInteriorTrophySlotsV64(room: HomeworldInteriorV64) {
  return room.buildingId === 'trophy-mausoleum' ? Array.from({ length: 8 }, (_, i) => ({
    id: `mausoleum-north-trophy-${i + 1}`, x: (i + 1) * room.width / 9,
    y: 0, elevation: 100, width: 40, height: 54,
  })) : [];
}

export function isHomeworldInteriorWalkableV64(room: HomeworldInteriorV64, point: InteriorGroundPointV64,
  footprint = { halfWidth: 24, halfDepth: 14 }): boolean {
  if (![point.x, point.y, footprint.halfWidth, footprint.halfDepth].every(Number.isFinite)
    || footprint.halfWidth < 0 || footprint.halfDepth < 0) return false;
  if (point.x - footprint.halfWidth < 10 || point.x + footprint.halfWidth > room.width - 10
    || point.y - footprint.halfDepth < 10 || point.y + footprint.halfDepth > room.depth - 10) return false;
  if(homeworldInteriorPartitionBlocksV72(room,point,footprint))return false;
  if(homeworldCntlipHostTouchesV77(room,point,footprint))return false;
  if((room.furniture??[]).some(item=>homeworldFurnitureTouchesV72(item,point,footprint)))return false;
  if((room.orientedDecorV76??[]).some(item=>homeworldInteriorDecorTouchesV76(item,point,footprint)))return false;
  for (const prop of room.props) if (Math.abs(point.x - prop.x) < prop.halfWidth + footprint.halfWidth
    && point.y + footprint.halfDepth > prop.y - prop.halfDepth * 2
    && point.y - footprint.halfDepth < prop.y) return false;
  for (const target of room.points) {
    const prop = homeworldInteriorPointPropV64(target);
    if (prop) {
      if (Math.abs(point.x - prop.x) < prop.halfWidth + footprint.halfWidth
        && point.y + footprint.halfDepth > prop.y - prop.halfDepth * 2
        && point.y - footprint.halfDepth < prop.y) return false;
    } else if (((point.x - target.x) / (16 + footprint.halfWidth)) ** 2
      + ((point.y - target.y) / (10 + footprint.halfDepth)) ** 2 < 1) return false;
  }
  return true;
}

export function nearestHomeworldInteriorTargetV64(room: HomeworldInteriorV64, actor: InteriorGroundPointV64):
  { kind: "exit"; position: InteriorGroundPointV64 } | { kind: "point"; pointId: string; position: InteriorGroundPointV64 } | null {
  if (![actor.x, actor.y].every(Number.isFinite)) return null;
  const distance = (point: InteriorGroundPointV64) => Math.hypot(actor.x - point.x, actor.y - point.y);
  if (distance(room.exit) < 22) return { kind: "exit", position: room.exit };
  let chosen: HomeworldInteriorPointV64 | null = null, minimum = 64;
  for (const point of room.points) {
    const next = distance(point);
    if (next < minimum) { minimum = next; chosen = point; }
  }
  return chosen ? { kind: "point", pointId: chosen.pointId, position: chosen } : null;
}
