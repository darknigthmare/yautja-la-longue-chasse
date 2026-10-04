import type { HomeworldConnectorV77, HomeworldTransitV77 } from './homeworldWorldV77';
import { homeworldTransitFractionsV82 } from './homeworldTransitJourneyV82';

type LiftDockV83 = 0 | 1;
export interface HomeworldLiftJourneyV83 {
  kind: 'empty-call' | 'passenger';
  from: number;
  to: LiftDockV83;
  elapsed: number;
  duration: number;
}
/** Position is canonical: zero is connector.from, one is connector.to. It is
 * independent of the player's floor, checkpoint and campaign progression. */
export interface HomeworldLiftStationV83 {
  version: 1;
  ownerCreatedAt: string;
  connectorId: 'clan-lift';
  position: number;
  journey: HomeworldLiftJourneyV83 | null;
}

const stations = new Map<string, HomeworldLiftStationV83>();
const persistedSteps = new Map<string, string>();
const protectedStorage = new Set<string>();
const stationKey = (owner: string) => `yautja.homeworld.lift.v83.${encodeURIComponent(owner)}`;
const bounded = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

export function createHomeworldLiftStationV83(ownerCreatedAt: string): HomeworldLiftStationV83 {
  return { version: 1, ownerCreatedAt, connectorId: 'clan-lift', position: 0, journey: null };
}

function decodeStation(value: unknown, owner: string): HomeworldLiftStationV83 | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (data.version !== 1 || data.ownerCreatedAt !== owner || data.connectorId !== 'clan-lift' || !bounded(data.position)) return null;
  if (data.journey === null) {
    return data.position === 0 || data.position === 1 ? { ...createHomeworldLiftStationV83(owner), position: data.position } : null;
  }
  if (!data.journey || typeof data.journey !== 'object') return null;
  const journey = data.journey as Record<string, unknown>;
  if ((journey.kind !== 'empty-call' && journey.kind !== 'passenger') || !bounded(journey.from) ||
      (journey.to !== 0 && journey.to !== 1) || typeof journey.duration !== 'number' || !Number.isFinite(journey.duration) ||
      journey.duration <= 0 || journey.duration > 5 || typeof journey.elapsed !== 'number' ||
      !Number.isFinite(journey.elapsed) || journey.elapsed < 0 || journey.elapsed > journey.duration) return null;
  return { ...createHomeworldLiftStationV83(owner), position: data.position,
    journey: { kind: journey.kind, from: journey.from, to: journey.to, elapsed: journey.elapsed, duration: journey.duration } };
}

/** Browser-only session state. Refused/corrupt/future storage is preserved;
 * memory still works, and no campaign save key or progression callback is used. */
export function rememberHomeworldLiftStationV83(state: HomeworldLiftStationV83, force = false): void {
  if (typeof window === 'undefined') return;
  stations.set(state.ownerCreatedAt, state);
  if (protectedStorage.has(state.ownerCreatedAt)) return;
  const signature = state.journey ? `${state.journey.kind}:${state.journey.to}:${Math.floor(state.journey.elapsed * 4)}` : `dock:${state.position}`;
  if (!force && persistedSteps.get(state.ownerCreatedAt) === signature) return;
  try {
    window.sessionStorage.setItem(stationKey(state.ownerCreatedAt), JSON.stringify(state));
    persistedSteps.set(state.ownerCreatedAt, signature);
  } catch { protectedStorage.add(state.ownerCreatedAt); }
}

/** Called on a Hub mount/identity change, never on an ordinary progress update.
 * If the previous Hub disappeared mid-ride, its cabin finishes empty instead
 * of inventing a saved passenger/checkpoint or snapping to another station. */
export function restoreHomeworldLiftStationV83(owner: string): HomeworldLiftStationV83 {
  let state = stations.get(owner);
  if (!state && typeof window !== 'undefined') {
    try {
      const raw = window.sessionStorage.getItem(stationKey(owner));
      if (raw !== null) {
        state = decodeStation(JSON.parse(raw), owner) ?? undefined;
        if (!state) protectedStorage.add(owner);
      }
    } catch { protectedStorage.add(owner); }
  }
  state ??= createHomeworldLiftStationV83(owner);
  if (state.journey?.kind === 'passenger') {
    const target = state.journey.to;
    state = { ...state, journey: state.position === target ? null : {
      kind: 'empty-call', from: state.position, to: target, elapsed: 0,
      duration: Math.max(.1, Math.abs(target - state.position) * 5),
    } };
  }
  rememberHomeworldLiftStationV83(state, true);
  return state;
}

export function homeworldLiftAtSocketV83(state: HomeworldLiftStationV83, connectorId: string, reverse: boolean): boolean {
  return state.connectorId === connectorId && state.journey === null && state.position === (reverse ? 1 : 0);
}

export function callHomeworldLiftV83(state: HomeworldLiftStationV83, connector: HomeworldConnectorV77, reverse: boolean): HomeworldLiftStationV83 {
  if (connector.kind !== 'lift' || state.connectorId !== connector.id || state.journey) return state;
  const target = reverse ? 1 : 0;
  if (state.position === target) return state;
  return { ...state, journey: { kind: 'empty-call', from: state.position, to: target,
    elapsed: 0, duration: Math.max(.1, Math.abs(target - state.position) * connector.duration) } };
}

/** Only the active Homeworld simulation clock calls this. There is no wall
 * clock catch-up: menus, dialogue, focus loss and tab suspension freeze it. */
export function stepHomeworldLiftCallV83(state: HomeworldLiftStationV83, seconds: number): { state: HomeworldLiftStationV83; arrived: boolean } {
  const journey = state.journey;
  if (!journey || journey.kind !== 'empty-call' || !Number.isFinite(seconds) || seconds <= 0) return { state, arrived: false };
  const elapsed = Math.min(journey.duration, journey.elapsed + Math.min(seconds, .1));
  const t = elapsed / journey.duration;
  const position = journey.from + (journey.to - journey.from) * t;
  return { state: { ...state, position, journey: t === 1 ? null : { ...journey, elapsed } }, arrived: t === 1 };
}

/** Passenger timing uses the unchanged V82 boarding/travel split. Rendering
 * and the actor therefore share one elapsed value, not two independent clocks. */
export function homeworldLiftPassengerV83(state: HomeworldLiftStationV83, transit: HomeworldTransitV77,
  connector: HomeworldConnectorV77, completed = false): HomeworldLiftStationV83 {
  if (connector.kind !== 'lift' || connector.id !== state.connectorId || transit.connectorId !== connector.id) return state;
  const to = transit.reverse ? 0 : 1, from = transit.reverse ? 1 : 0;
  const travel = completed ? 1 : homeworldTransitFractionsV82('lift', transit.elapsed, connector.duration).travel;
  return { ...state, position: from + (to - from) * travel,
    journey: completed ? null : { kind: 'passenger', from, to, elapsed: transit.elapsed, duration: connector.duration } };
}

/** A refused arrival leaves the real cabin at the far socket and calls it
 * back empty. Returning the actor to safety must not teleport the machinery. */
export function returnHomeworldLiftAfterRefusalV83(state: HomeworldLiftStationV83, transit: HomeworldTransitV77,
  connector: HomeworldConnectorV77): HomeworldLiftStationV83 {
  const arrived = homeworldLiftPassengerV83(state, transit, connector, true);
  return callHomeworldLiftV83(arrived, connector, transit.reverse);
}
