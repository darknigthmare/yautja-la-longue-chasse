import source from '../data/spaceRoutesSourceV159.json';
import { GALAXY_SYSTEM_REGISTRY } from '../galaxyRegistry';
import { isShipId, type ShipId } from '../shipCatalogue';
import type { SaveGame } from '../types';
import { shipAcquisitionEligibleV89, shipAcquisitionOwnedHullV89 } from './shipAcquisitionV89';

/**
 * V159 — routes spatiales typées et incidents V6 entre systèmes.
 *
 * Sourcé (classeur V6, empreinte dans `spaceRoutesSourceV159.json`) :
 * - 36 incidents « Incidents des routes » SPACE-E01 → E36 : titre, déclencheur,
 *   lieu (SPACE-BASE-xx), action, deux choix « A ou B », entrée, conséquence.
 * - « Les dix bases spatiales » SPACE-BASE-01 → 10 (titres affichés au lieu).
 * - « V5 États communs » STATE5-17 personalShipOwned, STATE5-18
 *   personalShipLocation, STATE5-19 currentWorldId, STATE5-20 travelManifest.
 * Bible (Espace : carte galactique et exploration) : routes entre systèmes,
 * trajet qui consomme du temps, incident tiré parmi les 36 selon le type de
 * route. Les quatre types et la fréquence y sont eux-mêmes marqués « proposés ».
 *
 * Proposé ici (aucune source ne le fixe) : le réseau de routes entre les
 * systèmes existants du jeu, le type de chaque route, le nombre d’étapes,
 * la répartition des 36 incidents par type, la fréquence de la route humaine,
 * et l’étape ajoutée par chaque choix (`PROPOSED_*` ci-dessous).
 */

export const SPACE_ROUTES_V159_VERSION = 1 as const;
export const SPACE_ROUTES_SOURCE_V159 = source;
const LOG_LIMIT = 64;

type SourceRow = { number: number; cells: { address: string; value: unknown }[] };
const sheet = (name: string) => source.sheets.find(item => item.name === name)!.rows as SourceRow[];
const cell = (row: SourceRow, column: string) =>
  String(row.cells.find(item => item.address === column + row.number)?.value ?? '');

export type SpaceRouteTypeV159 = 'clan' | 'humaine' | 'sauvage' | 'interdite';
export type SpaceIncidentIdV159 = `SPACE-E${string}`;

export interface SpaceBaseV159 { id: string; title: string; clan: string; nature: string; address: string }
export const SPACE_BASES_V159: readonly SpaceBaseV159[] = Object.freeze(sheet('Les dix bases spatiales')
  .filter(row => cell(row, 'A').startsWith('SPACE-BASE-')).map(row => Object.freeze({
    id: cell(row, 'A'), title: cell(row, 'B'), clan: cell(row, 'C'), nature: cell(row, 'D'),
    address: `Les dix bases spatiales!A${row.number}:D${row.number}`,
  })));

export interface SpaceIncidentV159 {
  id: SpaceIncidentIdV159; title: string; trigger: string; baseId: string; action: string;
  choices: readonly [string, string]; entry: string; consequence: string; failure: string; address: string;
}
export const SPACE_INCIDENTS_V159: readonly SpaceIncidentV159[] = Object.freeze(sheet('Incidents des routes')
  .filter(row => cell(row, 'A').startsWith('SPACE-E')).map(row => {
    const [first, second] = cell(row, 'F').split(' ou ');
    return Object.freeze({
      id: cell(row, 'A') as SpaceIncidentIdV159, title: cell(row, 'B'), trigger: cell(row, 'C'),
      baseId: cell(row, 'D'), action: cell(row, 'E'),
      choices: Object.freeze([first, second]) as readonly [string, string],
      entry: cell(row, 'G'), consequence: cell(row, 'I'), failure: cell(row, 'J'),
      address: `Incidents des routes!A${row.number}:L${row.number}`,
    });
  }));

export interface SpaceStateRuleV159 { id: string; key: string; values: string; write: string; invariant: string; address: string }
export const SPACE_STATE_RULES_V159: readonly SpaceStateRuleV159[] = Object.freeze(sheet('V5 États communs')
  .filter(row => cell(row, 'A').startsWith('STATE5-')).map(row => Object.freeze({
    id: cell(row, 'A'), key: cell(row, 'B'), values: cell(row, 'D'), write: cell(row, 'E'), invariant: cell(row, 'F'),
    address: `V5 États communs!A${row.number}:F${row.number}`,
  })));
const atlas = sheet('Atlas des mondes').find(row => cell(row, 'A') === 'PLAN02')!;
/** Atlas des mondes, colonne « Accès » (identique pour PLAN02 → PLAN24). */
export const SPACE_WORLD_ACCESS_V159 = Object.freeze({ text: cell(atlas, 'H'), address: `Atlas des mondes!H${atlas.number}` });

/** Bible : libellés et risques des types de route (le tableau y est « proposé »). */
export const SPACE_ROUTE_TYPES_V159: Readonly<Record<SpaceRouteTypeV159, {
  label: string; risk: string; typical: string; incidentEvery: number; frequencySource: 'bible-proposee' | 'propose-v159';
}>> = Object.freeze({
  clan: { label: 'Route de clan', risk: 'faible', typical: 'contrôles, escortes, messages de clan, convois de guerre', incidentEvery: 2, frequencySource: 'bible-proposee' },
  humaine: { label: 'Route humaine (commerce, colonies)', risk: 'moyen', typical: 'cargos Weyland-Yutani, patrouilles, épaves récentes, équipes de chasseurs humains', incidentEvery: 2, frequencySource: 'propose-v159' },
  sauvage: { label: 'Route sauvage', risk: 'élevé', typical: 'ceintures de débris, faune spatiale, vaisseaux contaminés par des Xénomorphes', incidentEvery: 1, frequencySource: 'bible-proposee' },
  interdite: { label: 'Route interdite', risk: 'très élevé', typical: 'anomalies, Rogue Space Tribe, Bad Bloods, échos du Warp', incidentEvery: 1, frequencySource: 'bible-proposee' },
});

/** Proposé : étapes de trajet par type de route (la bible dit seulement qu’un trajet consomme du temps). */
export const PROPOSED_ROUTE_LEGS_V159: Readonly<Record<SpaceRouteTypeV159, number>> =
  Object.freeze({ clan: 2, humaine: 3, sauvage: 3, interdite: 4 });

/**
 * Proposé : chaque incident dans un seul type de route, d’après son déclencheur
 * et les contenus typiques de la bible ; et, pour chacun des deux choix sourcés,
 * le nombre d’étapes ajoutées au trajet (la conséquence V6 « modifie le temps
 * de jeu écoulé, la route, une ressource consommée ou une relation »).
 */
export const PROPOSED_INCIDENT_PROFILE_V159: Readonly<Record<string, {
  type: SpaceRouteTypeV159; delayLegs: readonly [number, number];
}>> = Object.freeze({
  'SPACE-E01': { type: 'clan', delayLegs: [0, 1] }, 'SPACE-E02': { type: 'sauvage', delayLegs: [1, 0] },
  'SPACE-E03': { type: 'humaine', delayLegs: [1, 0] }, 'SPACE-E04': { type: 'clan', delayLegs: [1, 0] },
  'SPACE-E05': { type: 'humaine', delayLegs: [0, 1] }, 'SPACE-E06': { type: 'sauvage', delayLegs: [0, 1] },
  'SPACE-E07': { type: 'clan', delayLegs: [0, 1] }, 'SPACE-E08': { type: 'clan', delayLegs: [1, 0] },
  'SPACE-E09': { type: 'clan', delayLegs: [0, 1] }, 'SPACE-E10': { type: 'clan', delayLegs: [0, 1] },
  'SPACE-E11': { type: 'clan', delayLegs: [0, 1] }, 'SPACE-E12': { type: 'interdite', delayLegs: [0, 1] },
  'SPACE-E13': { type: 'sauvage', delayLegs: [1, 0] }, 'SPACE-E14': { type: 'clan', delayLegs: [0, 1] },
  'SPACE-E15': { type: 'clan', delayLegs: [1, 1] }, 'SPACE-E16': { type: 'sauvage', delayLegs: [0, 1] },
  'SPACE-E17': { type: 'clan', delayLegs: [1, 0] }, 'SPACE-E18': { type: 'humaine', delayLegs: [1, 1] },
  'SPACE-E19': { type: 'humaine', delayLegs: [1, 0] }, 'SPACE-E20': { type: 'sauvage', delayLegs: [1, 0] },
  'SPACE-E21': { type: 'clan', delayLegs: [1, 0] }, 'SPACE-E22': { type: 'clan', delayLegs: [0, 1] },
  'SPACE-E23': { type: 'humaine', delayLegs: [1, 0] }, 'SPACE-E24': { type: 'sauvage', delayLegs: [1, 1] },
  'SPACE-E25': { type: 'interdite', delayLegs: [1, 0] }, 'SPACE-E26': { type: 'humaine', delayLegs: [1, 0] },
  'SPACE-E27': { type: 'clan', delayLegs: [0, 1] }, 'SPACE-E28': { type: 'clan', delayLegs: [0, 0] },
  'SPACE-E29': { type: 'interdite', delayLegs: [0, 0] }, 'SPACE-E30': { type: 'interdite', delayLegs: [0, 1] },
  'SPACE-E31': { type: 'clan', delayLegs: [0, 0] }, 'SPACE-E32': { type: 'clan', delayLegs: [0, 0] },
  'SPACE-E33': { type: 'clan', delayLegs: [0, 1] }, 'SPACE-E34': { type: 'interdite', delayLegs: [0, 1] },
  'SPACE-E35': { type: 'sauvage', delayLegs: [0, 1] }, 'SPACE-E36': { type: 'interdite', delayLegs: [0, 1] },
});

export const SPACE_INCIDENT_POOLS_V159: Readonly<Record<SpaceRouteTypeV159, readonly SpaceIncidentIdV159[]>> = Object.freeze(
  Object.fromEntries((Object.keys(SPACE_ROUTE_TYPES_V159) as SpaceRouteTypeV159[]).map(type => [type, Object.freeze(
    SPACE_INCIDENTS_V159.filter(incident => PROPOSED_INCIDENT_PROFILE_V159[incident.id]?.type === type).map(incident => incident.id))]),
  ) as Record<SpaceRouteTypeV159, readonly SpaceIncidentIdV159[]>);

export interface SpaceRouteV159 { id: string; type: SpaceRouteTypeV159; systems: readonly [string, string]; legs: number }
const route = (a: string, b: string, type: SpaceRouteTypeV159): SpaceRouteV159 => Object.freeze({
  id: `route-${a.replace('system-', '')}-${b.replace('system-', '')}`, type,
  systems: Object.freeze([a, b]) as readonly [string, string], legs: PROPOSED_ROUTE_LEGS_V159[type],
});
/** Proposé : réseau tracé entre les 12 systèmes déjà présents (`galaxyRegistry.ts`). */
export const SPACE_ROUTES_V159: readonly SpaceRouteV159[] = Object.freeze([
  route('system-oseris', 'system-nivalis', 'clan'),
  route('system-nivalis', 'system-cinder', 'clan'),
  route('system-oseris', 'system-cinder', 'humaine'),
  route('system-oseris', 'system-kaail', 'clan'),
  route('system-kaail', 'system-acheron', 'humaine'),
  route('system-kaail', 'system-vardos', 'humaine'),
  route('system-acheron', 'system-vardos', 'humaine'),
  route('system-naraka', 'system-serekh', 'clan'),
  route('system-nivalis', 'system-naraka', 'sauvage'),
  route('system-cinder', 'system-pelagos', 'sauvage'),
  route('system-pelagos', 'system-mycora', 'sauvage'),
  route('system-mycora', 'system-naraka', 'sauvage'),
  route('system-vardos', 'system-umbra', 'interdite'),
  route('system-umbra', 'system-tempest', 'interdite'),
  route('system-pelagos', 'system-tempest', 'interdite'),
]);
/** Proposé : système de départ d’une ancienne sauvegarde (celui de la première chasse, Oseris-IV). */
export const PROPOSED_DEFAULT_SYSTEM_V159 = 'system-oseris';

const SYSTEM_NAMES = new Map(GALAXY_SYSTEM_REGISTRY.map(system => [system.id, system.name] as const));
export const spaceSystemNameV159 = (id: string) => SYSTEM_NAMES.get(id) ?? id;
export const spaceRouteV159 = (id: unknown) => SPACE_ROUTES_V159.find(entry => entry.id === id) ?? null;
export const spaceIncidentV159 = (id: unknown) => SPACE_INCIDENTS_V159.find(entry => entry.id === id) ?? null;
export const spaceBaseV159 = (id: unknown) => SPACE_BASES_V159.find(entry => entry.id === id) ?? null;
export const spaceRoutesFromV159 = (systemId: string) => SPACE_ROUTES_V159.filter(entry => entry.systems.includes(systemId));
const otherEnd = (entry: SpaceRouteV159, from: string) => entry.systems[0] === from ? entry.systems[1] : entry.systems[0];

// ---------------------------------------------------------------- state

export type SpaceShipLocationV159 =
  | { kind: 'system'; systemId: string }
  | { kind: 'route'; routeId: string; fromSystemId: string; toSystemId: string };
export interface SpaceTripIncidentV159 { incidentId: SpaceIncidentIdV159; atLeg: number; option: 0 | 1 | null }
export interface SpaceTripV159 {
  tripId: string; routeId: string; fromSystemId: string; toSystemId: string;
  /** STATE5-20 travelManifest, limité ici à l’appareil embarqué. */
  manifest: { shipId: ShipId };
  legsTotal: number; legsDone: number; incident: SpaceTripIncidentV159 | null;
}
export interface SpaceIncidentRecordV159 { tripId: string; incidentId: SpaceIncidentIdV159; option: 0 | 1; delayLegs: number }
export interface SpaceArrivalRecordV159 { tripId: string; routeId: string; fromSystemId: string; toSystemId: string; legs: number }
export interface SpaceRoutesStateV159 {
  version: 1; ownerCreatedAt: string; tripSequence: number;
  /** STATE5-18 personalShipLocation. */
  location: SpaceShipLocationV159;
  /** STATE5-19 currentWorldId — identifiant de système du jeu, pas PLANxx. */
  currentSystemId: string;
  trip: SpaceTripV159 | null;
  incidentLog: SpaceIncidentRecordV159[];
  arrivals: SpaceArrivalRecordV159[];
}

export function createSpaceRoutesV159(ownerCreatedAt: string): SpaceRoutesStateV159 {
  return {
    version: 1, ownerCreatedAt, tripSequence: 0,
    location: { kind: 'system', systemId: PROPOSED_DEFAULT_SYSTEM_V159 },
    currentSystemId: PROPOSED_DEFAULT_SYSTEM_V159, trip: null, incidentLog: [], arrivals: [],
  };
}

/** FNV-1a 32 bits : tirage reproductible, sans hasard caché. */
export function spaceRouteHashV159(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Incident du voyage : déterminé par l’identifiant de voyage et la route seuls. */
export function drawSpaceIncidentV159(tripId: string, routeId: string): { incidentId: SpaceIncidentIdV159; atLeg: number } | null {
  const entry = spaceRouteV159(routeId);
  if (!entry) return null;
  const hash = spaceRouteHashV159(`${tripId}|${routeId}`);
  if (hash % SPACE_ROUTE_TYPES_V159[entry.type].incidentEvery !== 0) return null;
  const pool = SPACE_INCIDENT_POOLS_V159[entry.type];
  return { incidentId: pool[(hash >>> 4) % pool.length], atLeg: 1 + ((hash >>> 12) % entry.legs) };
}
export const spaceTripIdV159 = (sequence: number) => `voyage-v159-${sequence}`;

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
const exact = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const count = (value: unknown, max = 10_000): value is number => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= max;
const knownSystem = (value: unknown): value is string => typeof value === 'string' && SYSTEM_NAMES.has(value);
const delayOf = (incidentId: string, option: 0 | 1) => PROPOSED_INCIDENT_PROFILE_V159[incidentId]?.delayLegs[option] ?? 0;

export function inspectSpaceRoutesV159(raw: unknown, ownerCreatedAt: string): {
  status: 'absent' | 'valid' | 'future-version' | 'invalid-save'; state: SpaceRoutesStateV159 | null;
} {
  if (raw === undefined || raw === null) return { status: 'absent', state: null };
  if (record(raw) && typeof raw.version === 'number' && raw.version > SPACE_ROUTES_V159_VERSION) return { status: 'future-version', state: null };
  const invalid = { status: 'invalid-save' as const, state: null };
  if (!record(raw) || !exact(raw, ['version', 'ownerCreatedAt', 'tripSequence', 'location', 'currentSystemId', 'trip', 'incidentLog', 'arrivals']) ||
      raw.version !== 1 || typeof ownerCreatedAt !== 'string' || raw.ownerCreatedAt !== ownerCreatedAt ||
      !count(raw.tripSequence) || !knownSystem(raw.currentSystemId) ||
      !Array.isArray(raw.incidentLog) || raw.incidentLog.length > LOG_LIMIT ||
      !Array.isArray(raw.arrivals) || raw.arrivals.length > LOG_LIMIT) return invalid;
  const sequence = Number(raw.tripSequence);
  const tripIdValid = (id: unknown): id is string => typeof id === 'string' &&
    /^voyage-v159-[1-9][0-9]*$/.test(id) && Number(id.slice('voyage-v159-'.length)) <= sequence;
  // Trip
  let trip: SpaceTripV159 | null = null;
  if (raw.trip !== null) {
    const t = raw.trip;
    if (!record(t) || !exact(t, ['tripId', 'routeId', 'fromSystemId', 'toSystemId', 'manifest', 'legsTotal', 'legsDone', 'incident']) ||
        t.tripId !== spaceTripIdV159(sequence) || sequence === 0) return invalid;
    const entry = spaceRouteV159(t.routeId);
    if (!entry || !knownSystem(t.fromSystemId) || !entry.systems.includes(t.fromSystemId) ||
        t.toSystemId !== otherEnd(entry, t.fromSystemId) || t.fromSystemId !== raw.currentSystemId) return invalid;
    if (!record(t.manifest) || !exact(t.manifest, ['shipId']) || !isShipId(t.manifest.shipId)) return invalid;
    const drawn = drawSpaceIncidentV159(t.tripId, entry.id);
    let incident: SpaceTripIncidentV159 | null = null;
    let delay = 0;
    if (drawn) {
      const i = t.incident;
      if (!record(i) || !exact(i, ['incidentId', 'atLeg', 'option']) || i.incidentId !== drawn.incidentId ||
          i.atLeg !== drawn.atLeg || !(i.option === null || i.option === 0 || i.option === 1)) return invalid;
      incident = { incidentId: drawn.incidentId, atLeg: drawn.atLeg, option: i.option };
      if (i.option !== null) delay = delayOf(drawn.incidentId, i.option);
    } else if (t.incident !== null) return invalid;
    if (t.legsTotal !== entry.legs + delay || !count(t.legsDone, Number(t.legsTotal))) return invalid;
    // Incident pending: the trip cannot have gone past its leg; final leg means arrival already happened.
    if (incident && incident.option === null && Number(t.legsDone) > incident.atLeg) return invalid;
    // The last leg is only held open by the incident met on it (answered or not); otherwise arrival happened.
    if (Number(t.legsDone) === Number(t.legsTotal) && incident?.atLeg !== Number(t.legsDone)) return invalid;
    trip = { tripId: t.tripId, routeId: entry.id, fromSystemId: t.fromSystemId, toSystemId: t.toSystemId,
      manifest: { shipId: t.manifest.shipId }, legsTotal: Number(t.legsTotal), legsDone: Number(t.legsDone), incident };
  }
  // Location (STATE5-18) must agree with the trip.
  const l = raw.location;
  let location: SpaceShipLocationV159;
  if (record(l) && l.kind === 'system' && exact(l, ['kind', 'systemId'])) {
    if (trip || l.systemId !== raw.currentSystemId) return invalid;
    location = { kind: 'system', systemId: l.systemId };
  } else if (record(l) && l.kind === 'route' && exact(l, ['kind', 'routeId', 'fromSystemId', 'toSystemId'])) {
    if (!trip || l.routeId !== trip.routeId || l.fromSystemId !== trip.fromSystemId || l.toSystemId !== trip.toSystemId) return invalid;
    location = { kind: 'route', routeId: trip.routeId, fromSystemId: trip.fromSystemId, toSystemId: trip.toSystemId };
  } else return invalid;
  const incidentLog: SpaceIncidentRecordV159[] = [];
  for (const entry of raw.incidentLog) {
    if (!record(entry) || !exact(entry, ['tripId', 'incidentId', 'option', 'delayLegs']) || !tripIdValid(entry.tripId) ||
        !spaceIncidentV159(entry.incidentId) || (entry.option !== 0 && entry.option !== 1) ||
        entry.delayLegs !== delayOf(String(entry.incidentId), entry.option) ||
        incidentLog.some(item => item.tripId === entry.tripId)) return invalid;
    incidentLog.push({ tripId: entry.tripId, incidentId: entry.incidentId as SpaceIncidentIdV159, option: entry.option, delayLegs: Number(entry.delayLegs) });
  }
  const arrivals: SpaceArrivalRecordV159[] = [];
  for (const entry of raw.arrivals) {
    const known = record(entry) ? spaceRouteV159(entry.routeId) : null;
    if (!record(entry) || !exact(entry, ['tripId', 'routeId', 'fromSystemId', 'toSystemId', 'legs']) || !known ||
        !tripIdValid(entry.tripId) || entry.tripId === trip?.tripId || !knownSystem(entry.fromSystemId) ||
        !known.systems.includes(entry.fromSystemId) || entry.toSystemId !== otherEnd(known, entry.fromSystemId) ||
        !count(entry.legs, 64) || arrivals.some(item => item.tripId === entry.tripId)) return invalid;
    arrivals.push({ tripId: entry.tripId, routeId: known.id, fromSystemId: entry.fromSystemId, toSystemId: entry.toSystemId, legs: Number(entry.legs) });
  }
  // A resolved incident of the active trip is logged exactly once.
  if (trip?.incident?.option !== null && trip?.incident && !incidentLog.some(item =>
    item.tripId === trip!.tripId && item.incidentId === trip!.incident!.incidentId && item.option === trip!.incident!.option)) return invalid;
  if (trip && (trip.incident?.option ?? null) === null && incidentLog.some(item => item.tripId === trip!.tripId)) return invalid;
  return { status: 'valid', state: {
    version: 1, ownerCreatedAt, tripSequence: sequence, location, currentSystemId: raw.currentSystemId,
    trip, incidentLog, arrivals,
  } };
}
export const normalizeSpaceRoutesV159 = (raw: unknown, ownerCreatedAt: string) =>
  inspectSpaceRoutesV159(raw, ownerCreatedAt).state;

// ---------------------------------------------------------------- ownership (STATE5-17)

export interface SpaceRoutesFleetV159 { selectedShipId: ShipId; unlockedShipIds: readonly ShipId[] }
export interface SpacePersonalShipV159 {
  owned: boolean; shipId: ShipId | null;
  source: 'recu-chantier-v89' | 'flotte-existante' | null; reason: string | null;
}
/**
 * STATE5-17 : un voyage exige un vaisseau personnel possédé.
 * 1. reçu d’acquisition du chantier V89, s’il existe ;
 * 2. sinon la règle déjà appliquée par le jeu au vaisseau personnel :
 *    rang Blooded réellement acquis et coque sélectionnée parmi les coques débloquées.
 * Un vaisseau amarré au Clan Ship n’est pas disponible pour une route.
 */
export function spacePersonalShipV159(
  save: Pick<SaveGame, 'createdAt' | 'profile' | 'prologue' | 'shipAcquisitionV89' | 'clanShipDocking'>,
  fleet: SpaceRoutesFleetV159 | null,
): SpacePersonalShipV159 {
  const refuse = (reason: string): SpacePersonalShipV159 => ({ owned: false, shipId: null, source: null, reason });
  if (save.clanShipDocking && save.clanShipDocking.status !== 'free-flight')
    return refuse('Le vaisseau personnel est amarré au Clan Ship : désamarre-le avant de prendre une route.');
  const receipt = shipAcquisitionOwnedHullV89(save.shipAcquisitionV89, save.createdAt);
  if (receipt && isShipId(receipt.shipId)) return { owned: true, shipId: receipt.shipId, source: 'recu-chantier-v89', reason: null };
  if (!shipAcquisitionEligibleV89(save))
    return refuse('Aucun vaisseau personnel possédé : le rang Blooded doit être réellement acquis (Atlas des mondes, Accès).');
  if (!fleet || !isShipId(fleet.selectedShipId) || !fleet.unlockedShipIds.includes(fleet.selectedShipId))
    return refuse('Aucune coque débloquée n’est sélectionnée comme vaisseau personnel.');
  return { owned: true, shipId: fleet.selectedShipId, source: 'flotte-existante', reason: null };
}

// ---------------------------------------------------------------- actions

export type SpaceRoutesActionV159 =
  | { kind: 'engage'; routeId: string }
  | { kind: 'advance' }
  | { kind: 'choose'; option: 0 | 1 };
export interface SpaceRoutesResultV159 {
  accepted: boolean; changed: boolean; state: SpaceRoutesStateV159 | null; message: string;
  arrivedAt?: string; incidentTriggered?: SpaceIncidentIdV159;
}
export interface SpaceRoutesContextV159 { ownerCreatedAt: string; ship: SpacePersonalShipV159 }

/** L’incident attend une réponse à cette étape : le trajet ne peut pas continuer. */
export function pendingSpaceIncidentV159(state: SpaceRoutesStateV159 | null): SpaceIncidentV159 | null {
  const incident = state?.trip?.incident;
  if (!incident || incident.option !== null || state!.trip!.legsDone < incident.atLeg) return null;
  return spaceIncidentV159(incident.incidentId);
}

export function actSpaceRoutesV159(raw: unknown, action: SpaceRoutesActionV159, context: SpaceRoutesContextV159): SpaceRoutesResultV159 {
  const inspected = inspectSpaceRoutesV159(raw, context.ownerCreatedAt);
  const deny = (message: string): SpaceRoutesResultV159 => ({ accepted: false, changed: false, state: inspected.state, message });
  if (inspected.status === 'future-version') return deny('Carnet de route d’une version future : il est conservé sans modification.');
  if (inspected.status === 'invalid-save') return deny('Carnet de route illisible : il est conservé sans modification.');
  const state = structuredClone(inspected.state ?? createSpaceRoutesV159(context.ownerCreatedAt));

  if (action.kind === 'engage') {
    if (!context.ship.owned || !context.ship.shipId) return deny(context.ship.reason ?? 'Aucun vaisseau personnel possédé.');
    if (state.trip) return deny('Un voyage est déjà engagé : il doit arriver avant d’en commencer un autre.');
    const entry = spaceRouteV159(action.routeId);
    if (!entry || !entry.systems.includes(state.currentSystemId)) return deny('Cette route ne part pas du système où se trouve le vaisseau.');
    state.tripSequence += 1;
    const tripId = spaceTripIdV159(state.tripSequence);
    const drawn = drawSpaceIncidentV159(tripId, entry.id);
    const toSystemId = otherEnd(entry, state.currentSystemId);
    state.trip = { tripId, routeId: entry.id, fromSystemId: state.currentSystemId, toSystemId,
      manifest: { shipId: context.ship.shipId }, legsTotal: entry.legs, legsDone: 0,
      incident: drawn ? { ...drawn, option: null } : null };
    state.location = { kind: 'route', routeId: entry.id, fromSystemId: state.currentSystemId, toSystemId };
    return { accepted: true, changed: true, state,
      message: `${SPACE_ROUTE_TYPES_V159[entry.type].label} engagée vers ${spaceSystemNameV159(toSystemId)} : ${entry.legs} étapes.` };
  }

  const trip = state.trip;
  if (!trip) return deny('Aucun voyage engagé.');

  if (action.kind === 'choose') {
    const incident = pendingSpaceIncidentV159(state);
    if (!incident || !trip.incident) return deny('Aucun incident n’attend de réponse à cette étape.');
    if (action.option !== 0 && action.option !== 1) return deny('Choix inconnu.');
    if (state.incidentLog.some(item => item.tripId === trip.tripId)) return deny('Ce choix est déjà enregistré pour ce voyage.');
    const delayLegs = delayOf(incident.id, action.option);
    trip.incident.option = action.option;
    trip.legsTotal += delayLegs;
    state.incidentLog = [...state.incidentLog, { tripId: trip.tripId, incidentId: incident.id, option: action.option, delayLegs }].slice(-LOG_LIMIT);
    return { accepted: true, changed: true, state,
      message: `${incident.id} — « ${incident.choices[action.option]} » enregistré.${delayLegs ? ` Le trajet compte ${delayLegs} étape de plus.` : ''}` };
  }

  // advance
  if (!context.ship.owned || context.ship.shipId !== trip.manifest.shipId)
    return deny(context.ship.reason ?? 'Le vaisseau embarqué au départ doit rester le vaisseau personnel pour poursuivre ce voyage.');
  if (pendingSpaceIncidentV159(state)) return deny('Un incident attend ton choix avant de poursuivre la route.');
  if (trip.legsDone < trip.legsTotal) trip.legsDone += 1;
  if (trip.incident && trip.incident.option === null && trip.legsDone === trip.incident.atLeg) {
    return { accepted: true, changed: true, state, incidentTriggered: trip.incident.incidentId,
      message: `Étape ${trip.legsDone}/${trip.legsTotal} : incident ${trip.incident.incidentId}.` };
  }
  if (trip.legsDone < trip.legsTotal) {
    return { accepted: true, changed: true, state, message: `Étape ${trip.legsDone}/${trip.legsTotal} parcourue.` };
  }
  state.arrivals = [...state.arrivals, { tripId: trip.tripId, routeId: trip.routeId, fromSystemId: trip.fromSystemId,
    toSystemId: trip.toSystemId, legs: trip.legsTotal }].slice(-LOG_LIMIT);
  state.currentSystemId = trip.toSystemId;
  state.location = { kind: 'system', systemId: trip.toSystemId };
  state.trip = null;
  return { accepted: true, changed: true, state, arrivedAt: trip.toSystemId,
    message: `Arrivée : ${spaceSystemNameV159(trip.toSystemId)}.` };
}
