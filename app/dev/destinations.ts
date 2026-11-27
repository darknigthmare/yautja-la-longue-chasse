import { ARMORS, GEAR, MISSIONS, WEAPONS } from '../game/data';
import { defaultSave, RANK_THRESHOLDS } from '../game/save';
import { DEFAULT_SHIP_ID } from '../game/shipCatalogue';
import type { MissionId, SaveGame } from '../game/types';
import type { CradleCheckpointId } from '../game/systems/buriedCradle';
import { createClanShipDockingState, type ClanShipRoomId } from '../game/systems/clanShipDocking';
import { CLAN_SHIP_INTERIOR_ROOM_ORDER, CLAN_SHIP_INTERIOR_ROOMS } from '../game/systems/clanShipInterior';
import type { JsonObject } from '../game/systems/activeHuntSave';
import { captureHuntGauntletV142 } from '../game/systems/huntGauntletIdentityV142';
import {
  createPlanetArrival, inspectPlanetArrival, type PlanetArrivalState,
} from '../game/systems/planetArrival';
import { inspectPlanetArrivalRun, type PlanetArrivalRun } from '../game/systems/planetArrivalRun';
import { assignExpeditionMember, recruitExpeditionMember, type PlanetInsertionPlan } from '../game/systems/planetInsertion';
import { debitShipInsertionCloak, hasShipInsertionDebit } from '../game/systems/shipInsertionEnergy';
import {
  WOLF_CASTLE_ROOMS, createWolfCastleVisit, inspectWolfCastleVisit, wolfCastleEntryPoint,
  type WolfCastleRoomId,
} from '../game/systems/wolfCastle';
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

export type DevDestinationCategory = 'hubs' | 'clan' | 'homeworld' | 'missions' | 'wolf' | 'arrivals';

interface DevDestinationDetails {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly category: DevDestinationCategory;
}

export type DevDestination = DevDestinationDetails & (
  | { readonly kind: 'ship' }
  | { readonly kind: 'warp' }
  | { readonly kind: 'cradle'; readonly checkpointId: CradleCheckpointId }
  | { readonly kind: 'clan'; readonly roomId: ClanShipRoomId; readonly status: 'free-flight' | 'aboard' }
  | { readonly kind: 'homeworld'; readonly levelId: HomeworldLevelV77; readonly point: { readonly x: number; readonly y: number } }
  | { readonly kind: 'region'; readonly regionId: HomeworldRegionIdV68 }
  | { readonly kind: 'mission'; readonly missionId: MissionId }
  | { readonly kind: 'wolf'; readonly roomId: WolfCastleRoomId; readonly status: 'approach' | 'aboard' }
  | { readonly kind: 'arrival'; readonly missionId: MissionId; readonly insertion?: Readonly<PlanetInsertionPlan> }
);

export interface DevArrivalFixture {
  state: PlanetArrivalState;
  run: PlanetArrivalRun;
}

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
  { id: 'warp-module', label: 'WARP · Baie expérimentale', category: 'hubs', kind: 'warp',
    description: 'Parcourir les salles du module pilote, manipuler le sas et approcher les consoles dans une session temporaire.' },
  { id: 'cradle-entry', label: 'Xeno Prime · Lisière du Berceau', category: 'missions', kind: 'cradle', checkpointId: '01',
    description: 'Parcourir les douze tableaux du Berceau depuis XP-Z11, avec les vrais contrôles et interactions.' },
  { id: 'cradle-descent', label: 'Xeno Prime · Faille', category: 'missions', kind: 'cradle', checkpointId: '07',
    description: 'Tester la descente, le réservoir, les racines et les raccourcis du Berceau.' },
  { id: 'cradle-basin', label: 'Xeno Prime · Avant la Matriarche', category: 'missions', kind: 'cradle', checkpointId: '11',
    description: 'Entrer physiquement dans l’arène, éviter les attaques, prélever la crête et rejoindre l’extraction.' },
  {
    id: 'ship', label: 'Mon vaisseau', category: 'hubs', kind: 'ship',
    description: 'Intérieur en 2,5D du vaisseau personnel : circulation en profondeur, huit salles et deux ponts.',
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
  {
    id: 'wolf-approach', label: 'Château Wolf · approche orbitale', category: 'wolf', kind: 'wolf',
    status: 'approach', roomId: 'royal-berth',
    description: 'Approcher la forteresse royale, entrer dans la baie et retrouver son vaisseau personnel.',
  },
  ...WOLF_CASTLE_ROOMS.map((room): DevDestination => ({
    id: `wolf-${room.id}`, label: `Château Wolf · ${room.name}`, category: 'wolf', kind: 'wolf',
    status: 'aboard', roomId: room.id,
    description: `Arrivée directe dans la salle, avec une invitation de test. ${room.subtitle}`,
  })),
  ...MISSIONS.map((mission): DevDestination => ({
    id: `arrival-${mission.id}`, label: `Arrivée · ${mission.planetName}`, category: 'arrivals', kind: 'arrival',
    missionId: mission.id,
    description: `${mission.title} · Jouer la cinématique d’insertion, puis rejoindre la même chasse de test.`,
  })),
  {
    id: 'arrival-ship-jungle-vey', label: 'Arrivée · posé du vaisseau en solo', category: 'arrivals', kind: 'arrival',
    missionId: 'jungle-vey', insertion: { version: 1, method: 'ship', team: 'solo' },
    description: 'Poser le vaisseau personnel sur Vey, puis rejoindre la chasse avec la pression de cette insertion.',
  },
  {
    id: 'arrival-triad-jungle-vey', label: 'Arrivée · capsules de la triade', category: 'arrivals', kind: 'arrival',
    missionId: 'jungle-vey', insertion: { version: 1, method: 'pod', team: 'triad' },
    description: 'Rejoindre Vey avec Ka’rhek et Sa’keth, puis retrouver les trois chasseurs dans la même simulation.',
  },
  {
    id: 'arrival-ship-triad-jungle-vey', label: 'Arrivée · vaisseau et triade', category: 'arrivals', kind: 'arrival',
    missionId: 'jungle-vey', insertion: { version: 1, method: 'ship', team: 'triad' },
    description: 'Poser le vaisseau et faire sortir la triade avant de rejoindre la chasse et ses patrouilles alertées.',
  },
  {
    id: 'arrival-ship-cloaked-triad-jungle-vey', label: 'Arrivée · vaisseau camouflé et triade', category: 'arrivals', kind: 'arrival',
    missionId: 'jungle-vey', insertion: { version: 1, method: 'ship', team: 'triad', shipCloak: true },
    description: 'Approcher sous camouflage, retrouver la coque visible avant le posé et commencer avec une pression réduite et 70 unités d’énergie.',
  },
];

export function resolveDevDestination(id: string | null | undefined): DevDestination | undefined {
  return typeof id === 'string' ? DEV_DESTINATIONS.find(destination => destination.id === id) : undefined;
}

function devDestinationSeed(id: string) {
  const canonical = resolveDevDestination(id);
  if (!canonical) throw new Error('Destination de développement inconnue.');
  const index = DEV_DESTINATIONS.indexOf(canonical);
  const owner = new Date(Date.UTC(2000, 0, 1, 0, 0, 0, index)).toISOString();
  return { canonical, owner };
}

/** A deterministic synthetic owner is constructed, never loaded from storage.
 * Each call owns all its nested objects, including settings and appearance.
 * Equipment and rank are test configuration; no mission result is invented. */
export function createDevSave(destination: DevDestination): SaveGame {
  const { canonical, owner } = devDestinationSeed(destination.id);
  const save = structuredClone(defaultSave(owner));
  save.profile = { ...save.profile, hunterName: 'Chasseur de test', rankId: 'elite', honor: RANK_THRESHOLDS.elite, clanMarks: 1000 };
  save.inventory = {
    ...save.inventory,
    unlockedWeaponIds: WEAPONS.map(weapon => weapon.id),
    unlockedGearIds: GEAR.map(gear => gear.id),
    unlockedArmorIds: ARMORS.map(armor => armor.id),
    fieldToolIds: ['flaying-tool'],
  };

  if (canonical.kind === 'arrival' && canonical.insertion?.team === 'triad') {
    for (const id of ['karhek', 'saketh'] as const) {
      save.expeditionRoster = recruitExpeditionMember(save.expeditionRoster, owner, id);
      save.expeditionRoster = assignExpeditionMember(save.expeditionRoster, owner, DEFAULT_SHIP_ID, id);
    }
  }
  if (canonical.kind === 'arrival' && canonical.insertion?.shipCloak) {
    const debit = debitShipInsertionCloak(save.shipInsertionEnergy, owner, DEFAULT_SHIP_ID,
      `dev-arrival:${canonical.missionId}:${owner}`, canonical.insertion);
    if (!debit) throw new Error('Le départ camouflé de test ne dispose pas de son énergie.');
    save.shipInsertionEnergy = debit.state;
  }

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
  if (canonical.kind === 'wolf') {
    const visit = {
      ...createWolfCastleVisit(owner, DEFAULT_SHIP_ID, {
        mode: 'audience', invitationId: `dev-wolf:${canonical.id}:${owner}`,
      }),
      status: canonical.status, roomId: canonical.roomId,
      visitedRooms: [...new Set<WolfCastleRoomId>(['royal-berth', canonical.roomId])],
      position: { ...wolfCastleEntryPoint(canonical.roomId, null), facing: 1 as const },
    };
    const inspected = inspectWolfCastleVisit(visit, owner);
    if (inspected.status !== 'valid' || !inspected.state) {
      throw new Error(`Le point d’arrivée de ${canonical.label} ne permet pas une visite valide.`);
    }
    save.wolfCastle = inspected.state;
  }
  return save;
}

/** The native montage and its frozen run stay outside the campaign document:
 * the campaign parser rightly locks later missions until their prerequisites
 * are completed. A developer arrival must never invent those completions. */
export function createDevArrival(
  destination: Extract<DevDestination, { kind: 'arrival' }>,
  save: SaveGame,
): DevArrivalFixture {
  const { canonical, owner } = devDestinationSeed(destination.id);
  if (canonical.kind !== 'arrival') throw new Error('Destination d’arrivée de développement inconnue.');
  if (save.createdAt !== owner) throw new Error('Le contexte d’arrivée appartient à une autre session de test.');
  const runtime = structuredClone(save);
  const insertion = canonical.insertion ? structuredClone(canonical.insertion) : undefined;
  const runId = `dev-arrival:${canonical.missionId}:${owner}`;
  if (insertion?.shipCloak && !hasShipInsertionDebit(runtime.shipInsertionEnergy, owner, runId, DEFAULT_SHIP_ID)) {
    throw new Error('Le contexte d’arrivée camouflée ne possède pas de débit d’énergie valide.');
  }
  const state = createPlanetArrival({
    ownerCreatedAt: owner, runId, missionId: canonical.missionId, encounterRun: 1,
    personalShipId: DEFAULT_SHIP_ID, hunterPresetId: runtime.appearance.presetId,
    ...(insertion ? { insertion } : {}),
  });
  const run: PlanetArrivalRun = {
    version: 1, ownerCreatedAt: owner, runId, startedAt: owner, difficultyId: runtime.settings.difficultyId,
    configuration: {
      inventory: runtime.inventory as unknown as JsonObject,
      loadout: runtime.loadout as unknown as JsonObject,
      appearance: runtime.appearance as unknown as JsonObject,
      gauntletVariantId: captureHuntGauntletV142(runtime.gauntletV134?.equippedId,
        runtime.profile.rankId, runtime.gauntletV134?.claimedStudies ?? []),
      visualOptions: {
        screenShake: runtime.settings.screenShake, reducedGore: runtime.settings.reducedGore,
        highContrastVision: runtime.settings.highContrastVision,
        huntAccessibility: runtime.settings.huntAccessibility as unknown as JsonObject,
      },
      elapsedSeconds: 0,
      ...(insertion ? { insertion: structuredClone(insertion) as unknown as JsonObject, insertionShipId: DEFAULT_SHIP_ID } : {}),
      ...(insertion?.shipCloak ? { insertionEnergyRunId: runId } : {}),
    },
  };
  const inspectedState = inspectPlanetArrival(state, owner, runId);
  const inspectedRun = inspectPlanetArrivalRun(run, inspectedState.state);
  if (inspectedState.status !== 'valid' || !inspectedState.state ||
      inspectedRun.status !== 'valid' || !inspectedRun.state) {
    throw new Error('Le contexte natif de cette arrivée de test est invalide.');
  }
  return { state: inspectedState.state, run: inspectedRun.state };
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
