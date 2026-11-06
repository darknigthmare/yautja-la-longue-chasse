import { isShipId, SHIP_IDS, type ShipId } from '../shipCatalogue';
import { normalizePlanetInsertionPlan, shipSupportsSurfaceInsertion, type PlanetInsertionPlan } from './planetInsertion';

/** Original game balance for auxiliary power; never a fuel or hull-acquisition receipt. */
export const SHIP_INSERTION_ENERGY = Object.freeze({ capacity: 100, cloakCost: 30, safetyReserve: 20, rechargeMarks: 20 });
export interface ShipInsertionEnergy {
  version: 1;
  ownerCreatedAt: string;
  hulls: { shipId: ShipId; charge: number }[];
  /** The approach is paid once, before the montage; skipping/resuming cannot charge it again. */
  departures: { runId: string; shipId: ShipId; cost: number }[];
}
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) &&
  Reflect.ownKeys(value).every(key => typeof key === 'string' && Object.getOwnPropertyDescriptor(value, key)?.enumerable &&
    'value' in Object.getOwnPropertyDescriptor(value, key)!);
const exact = (value: Record<string, unknown>, keys: readonly string[]) => Reflect.ownKeys(value).length === keys.length &&
  keys.every(key => Object.hasOwn(value, key));
const identity = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 160 &&
  value.trim() === value && !/[\x00-\x1f\x7f]/.test(value);

export function inspectShipInsertionEnergy(value: unknown, owner: string): {
  status: 'absent' | 'valid' | 'invalid-save' | 'future-version'; state: ShipInsertionEnergy | null;
} {
  if (value === undefined || value === null) return { status: 'absent', state: null };
  if (record(value) && typeof value.version === 'number' && value.version > 1) return { status: 'future-version', state: null };
  const invalid = { status: 'invalid-save' as const, state: null };
  if (!record(value) || !exact(value, ['version', 'ownerCreatedAt', 'hulls', 'departures']) || value.version !== 1 ||
      !identity(owner) || value.ownerCreatedAt !== owner || !Array.isArray(value.hulls) || value.hulls.length > SHIP_IDS.length ||
      !Array.isArray(value.departures) || value.departures.length > 64) return invalid;
  const hulls: ShipInsertionEnergy['hulls'] = [];
  for (const hull of value.hulls) {
    if (!record(hull) || !exact(hull, ['shipId', 'charge']) || !isShipId(hull.shipId) ||
        !shipSupportsSurfaceInsertion(hull.shipId) || !Number.isSafeInteger(hull.charge) ||
        Number(hull.charge) < 0 || Number(hull.charge) > SHIP_INSERTION_ENERGY.capacity ||
        hulls.some(entry => entry.shipId === hull.shipId)) return invalid;
    hulls.push({ shipId: hull.shipId, charge: Number(hull.charge) });
  }
  const departures: ShipInsertionEnergy['departures'] = [];
  for (const receipt of value.departures) {
    if (!record(receipt) || !exact(receipt, ['runId', 'shipId', 'cost']) || !identity(receipt.runId) ||
        !isShipId(receipt.shipId) || !hulls.some(entry => entry.shipId === receipt.shipId) ||
        receipt.cost !== SHIP_INSERTION_ENERGY.cloakCost || departures.some(entry => entry.runId === receipt.runId)) return invalid;
    departures.push({ runId: receipt.runId, shipId: receipt.shipId, cost: receipt.cost });
  }
  return { status: 'valid', state: { version: 1, ownerCreatedAt: owner, hulls, departures } };
}

/** A newly introduced auxiliary budget starts charged; existing hull records never reset on selection. */
export function shipInsertionCharge(value: unknown, owner: string, shipId: ShipId): number | null {
  if (!identity(owner) || !isShipId(shipId) || !shipSupportsSurfaceInsertion(shipId)) return null;
  const inspected = inspectShipInsertionEnergy(value, owner);
  if (inspected.status === 'invalid-save' || inspected.status === 'future-version') return null;
  return inspected.state?.hulls.find(entry => entry.shipId === shipId)?.charge ?? SHIP_INSERTION_ENERGY.capacity;
}

export function hasShipInsertionDebit(value: unknown, owner: string, runId: unknown, shipId: unknown): boolean {
  return identity(runId) && isShipId(shipId) && !!inspectShipInsertionEnergy(value, owner).state?.departures
    .some(receipt => receipt.runId === runId && receipt.shipId === shipId && receipt.cost === SHIP_INSERTION_ENERGY.cloakCost);
}

/** Pure proposal, committed atomically with planetArrival/planetArrivalRun by the campaign writer. */
export function debitShipInsertionCloak(value: unknown, owner: string, shipId: ShipId, runId: string,
  requested: PlanetInsertionPlan): { state: ShipInsertionEnergy; changed: boolean } | null {
  const plan = normalizePlanetInsertionPlan(requested);
  const charge = shipInsertionCharge(value, owner, shipId);
  if (!plan?.shipCloak || plan.method !== 'ship' || !identity(runId) || charge === null) return null;
  const current = inspectShipInsertionEnergy(value, owner).state ?? { version: 1 as const, ownerCreatedAt: owner, hulls: [], departures: [] };
  const previous = current.departures.find(receipt => receipt.runId === runId);
  if (previous) return previous.shipId === shipId ? { state: current, changed: false } : null;
  if (charge - SHIP_INSERTION_ENERGY.cloakCost < SHIP_INSERTION_ENERGY.safetyReserve) return null;
  return { changed: true, state: { ...current,
    hulls: [...current.hulls.filter(hull => hull.shipId !== shipId), { shipId, charge: charge - SHIP_INSERTION_ENERGY.cloakCost }],
    departures: [...current.departures, { runId, shipId, cost: SHIP_INSERTION_ENERGY.cloakCost }].slice(-64),
  } };
}

/** A paid maintenance action. The observed charge prevents stale/double-click purchases. */
export function rechargeShipInsertionEnergy(value: unknown, owner: string, shipId: ShipId, clanMarks: number,
  expectedCharge: number): { state: ShipInsertionEnergy; clanMarks: number; cost: number } | null {
  const charge = shipInsertionCharge(value, owner, shipId);
  if (charge === null || charge !== expectedCharge || charge >= SHIP_INSERTION_ENERGY.capacity ||
      !Number.isSafeInteger(clanMarks) || clanMarks < SHIP_INSERTION_ENERGY.rechargeMarks) return null;
  const current = inspectShipInsertionEnergy(value, owner).state;
  if (!current) return null;
  return { cost: SHIP_INSERTION_ENERGY.rechargeMarks, clanMarks: clanMarks - SHIP_INSERTION_ENERGY.rechargeMarks,
    state: { ...current, hulls: current.hulls.map(hull => hull.shipId === shipId ? { ...hull, charge: SHIP_INSERTION_ENERGY.capacity } : hull) } };
}
