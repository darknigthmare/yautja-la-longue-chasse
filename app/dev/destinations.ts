import { ARMORS, GEAR, MISSIONS, WEAPONS } from '../game/data';
import { defaultSave, RANK_THRESHOLDS } from '../game/save';
import { DEFAULT_SHIP_ID } from '../game/shipCatalogue';
import type { MissionId, SaveGame } from '../game/types';
import { createClanShipDockingState, type ClanShipRoomId } from '../game/systems/clanShipDocking';
import { CLAN_SHIP_INTERIOR_ROOM_ORDER, CLAN_SHIP_INTERIOR_ROOMS } from '../game/systems/clanShipInterior';
import { homeworldBuildingDoorwayV64 } from '../game/systems/homeworldGeometryV64';
import { createHomeworldCheckpointV77 } from '../game/systems/homeworldLocationV77';
import { homeworldExteriorArrivalAllowedV110 } from '../game/systems/homeworldTransitionsV110';
import {
  HOMEWORLD_BUILDINGS_V77, HOMEWORLD_SPACEPORT_V77, createHomeworldWorldActorV77,
  type HomeworldLevelV77,
} from '../game/systems/homeworldWorldV77';
import {
  HOMEWORLD_REGION_IDS_V68, HOMEWORLD_REGIONS_V68, createHomeworldRegionV68,
  type HomeworldRegionIdV68,
} from '../game/systems/homeworldRegionsV68';

export type DevDestinationCategory = 'hubs' | 'clan' | 'homeworld' | 'missions';

interface DevDestinationDetails {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly category: DevDestinationCategory;
}

export type DevDestination = DevDestinationDetails & (
  | { readonly kind: 'ship' }
  | { readonly kind: 'clan'; readonly roomId: ClanShipRoomId; readonly status: 'free-flight' | 'aboard' }
  | { readonly kind: 'homeworld'; readonly levelId: HomeworldLevelV77; readonly point: { readonly x: number; readonly y: number } }
  | { readonly kind: 'region'; readonly regionId: HomeworldRegionIdV68 }
  | { readonly kind: 'mission'; readonly missionId: MissionId }
);

/** The public doorway remains the source of truth when a building is moved. */
function cityDoorway(id: string, label: string, description: string, buildingId: string): DevDestination {
  const building = HOMEWORLD_BUILDINGS_V77.find(entry => entry.id === buildingId);
  if (!building) throw new Error(`Lieu de développement introuvable : ${buildingId}.`);
  return {
    id, label, description, category: 'homeworld', kind: 'homeworld',
    levelId: building.levelId, point: homeworldBuildingDoorwayV64(building).approach,
  };
}

/** Only scenes present on the current main branch are offered. Planned art or
 * unmerged destinations never become a launch button by appearing in a sheet. */
export const DEV_DESTINATIONS: readonly DevDestination[] = [
  {
    id: 'ship', label: 'Mon vaisseau', category: 'hubs', kind: 'ship',
    description: 'Intérieur parcourable du vaisseau personnel : huit salles reliées sur deux ponts.',
  },
  {
    id: 'clan-docking', label: 'Clan Ship · approche et amarrage', category: 'clan', kind: 'clan',
    status: 'free-flight', roomId: 'hangar',
    description: 'Tester toute la liaison : approche du vaisseau-mère AVP, amarrage, entrée et retour.',
  },
  ...CLAN_SHIP_INTERIOR_ROOM_ORDER.map((roomId): DevDestination => ({
    id: `clan-${roomId}`, label: `Clan Ship · ${CLAN_SHIP_INTERIOR_ROOMS[roomId].label}`,
    category: 'clan', kind: 'clan', status: 'aboard', roomId,
    description: `Arrivée directe dans la salle. ${CLAN_SHIP_INTERIOR_ROOMS[roomId].subtitle}.`,
  })),
  {
    id: 'homeworld-port', label: 'Homeworld · Port des Chasses', category: 'homeworld', kind: 'homeworld',
    levelId: '0', point: { ...HOMEWORLD_SPACEPORT_V77.spawn },
    description: 'Départ au spatioport, près de la navette et des quais de la cité.',
  },
  cityDoorway('homeworld-market', 'Homeworld · Marché des Clans',
    'Départ devant la halle des échanges pour parcourir le marché et entrer dans ses bâtiments.', 'market-canopy'),
  {
    id: 'homeworld-kennels', label: 'Homeworld · Personnel du chenil', category: 'homeworld', kind: 'homeworld',
    levelId: '0', point: { x: 7450, y: 5520 },
    description: 'Poste extérieur du maître du chenil et de la soigneuse des chiens de chasse.',
  },
  cityDoorway('homeworld-citadel', 'Homeworld · Citadelle du Trône',
    'Départ au seuil de la salle d’audience, sur le niveau supérieur de la cité.', 'throne-audience'),
  cityDoorway('homeworld-slums', 'Homeworld · Sous-Cité',
    'Départ devant le refuge des galeries pour explorer les bas-quartiers et leurs intérieurs.', 'undercity-refuge'),
  ...HOMEWORLD_REGION_IDS_V68.filter(regionId => regionId !== 'forbidden-reserve').map((regionId): DevDestination => ({
    id: `region-${regionId}`, label: HOMEWORLD_REGIONS_V68[regionId].name,
    category: 'homeworld', kind: 'region', regionId,
    description: `Arrivée au village « ${HOMEWORLD_REGIONS_V68[regionId].village} », avec accès au terrain et au chemin du retour.`,
  })),
  ...MISSIONS.map((mission): DevDestination => ({
    id: `mission-${mission.id}`, label: mission.planetName, category: 'missions', kind: 'mission', missionId: mission.id,
    description: `${mission.title} · Tester directement la chasse et son terrain.`,
  })),
];

export function resolveDevDestination(id: string | null | undefined): DevDestination | undefined {
  return typeof id === 'string' ? DEV_DESTINATIONS.find(destination => destination.id === id) : undefined;
}

/** A deterministic synthetic owner is constructed, never loaded from storage.
 * Each call owns all its nested objects, including settings and appearance.
 * Equipment and rank are test configuration; no mission result is invented. */
export function createDevSave(destination: DevDestination): SaveGame {
  const index = DEV_DESTINATIONS.findIndex(entry => entry.id === destination.id);
  if (index < 0) throw new Error('Destination de développement inconnue.');
  const canonical = DEV_DESTINATIONS[index];
  const owner = new Date(Date.UTC(2000, 0, 1, 0, 0, 0, index)).toISOString();
  const save = structuredClone(defaultSave(owner));
  save.profile = { ...save.profile, hunterName: 'Chasseur de test', rankId: 'elite', honor: RANK_THRESHOLDS.elite, clanMarks: 1000 };
  save.inventory = {
    ...save.inventory,
    unlockedWeaponIds: WEAPONS.map(weapon => weapon.id),
    unlockedGearIds: GEAR.map(gear => gear.id),
    unlockedArmorIds: ARMORS.map(armor => armor.id),
    fieldToolIds: ['flaying-tool'],
  };

  if (canonical.kind === 'clan') {
    save.clanShipDocking = {
      ...createClanShipDockingState(owner, DEFAULT_SHIP_ID),
      status: canonical.status, roomId: canonical.roomId,
    };
  }
  if (canonical.kind === 'homeworld') {
    if (!homeworldExteriorArrivalAllowedV110(canonical.levelId, canonical.point)) {
      throw new Error(`Le point d’arrivée de ${canonical.label} est occupé ou hors du sol praticable.`);
    }
    const actor = { ...createHomeworldWorldActorV77(), ...canonical.point };
    save.homeworld.locationV77 = createHomeworldCheckpointV77(owner, canonical.levelId, actor, null, actor);
  }
  if (canonical.kind === 'region') {
    save.homeworldRegionV68 = createHomeworldRegionV68(canonical.regionId, `dev-${canonical.regionId}`, true);
  }
  return save;
}

/** Host-owned backup port for controlled scenes. It neither reads a browser
 * store nor replaces Storage.prototype; clearing it affects this instance only. */
export function createMemoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() { return entries.size; },
    clear() { entries.clear(); },
    getItem(key: string) { return entries.get(String(key)) ?? null; },
    key(index: number) { return Number.isInteger(index) && index >= 0 ? [...entries.keys()][index] ?? null : null; },
    removeItem(key: string) { entries.delete(String(key)); },
    setItem(key: string, value: string) { entries.set(String(key), String(value)); },
  };
}
