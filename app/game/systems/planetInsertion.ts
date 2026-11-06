import { isShipId, shipForId, type ShipId } from '../shipCatalogue';
import type { HunterAppearance, Loadout, MissionId } from '../types';
import type { HuntInsertionOutcome } from './huntInsertion';

/** Frozen at departure and carried into the actual hunt, including a skipped montage. */
export interface PlanetInsertionPlan {
  version: 1;
  method: 'pod' | 'ship';
  team: 'solo' | 'triad';
  /** Optional on earlier archives; an optical approach never silences the engines. */
  shipCloak?: boolean;
}

export const DEFAULT_PLAN: Readonly<PlanetInsertionPlan> = Object.freeze({ version: 1, method: 'pod', team: 'solo' });
export const TRIO_MEMBERS = [
  { id: 'karhek', name: 'Ka’rhek', role: 'Éclaireur', color: '#9bb89c', invitation: 'Je lirai la piste avec toi. Donne le signal pour avancer ou tenir la position.' },
  { id: 'saketh', name: 'Sa’keth', role: 'Garde de la triade', color: '#b9a782', invitation: 'Je couvrirai notre avancée. Nous préparerons aussi le retour des trois chasseurs.' },
] as const;
export type ExpeditionMemberId = typeof TRIO_MEMBERS[number]['id'];
/** Shared final positions: cinematic and simulation meet at the same world coordinates. */
export const TRIO_INSERTION_OFFSETS = Object.freeze({ karhek: 160, saketh: 320 });
export const EXPEDITION_MEMBER_SIZE = Object.freeze({ width: 64, height: 112 });
export const EXPEDITION_MEMBER_HEALTH: Readonly<Record<ExpeditionMemberId, number>> = Object.freeze({ karhek: 100, saketh: 120 });
export const EXPEDITION_CARE_COST = Object.freeze({ recovering: 20, missing: 60 });

/** Original campaign characters use existing modular parts, never a named film likeness. */
export function expeditionMemberAppearance(id: ExpeditionMemberId): HunterAppearance {
  return { presetId: 'custom', bodyMorphId: 'classic', headStyleId: 'legacy-clan',
    skinId: id === 'karhek' ? 'ashen-mottle' : 'ochre-mottle', biomaskId: 'jungle',
    dreadStyleId: id === 'karhek' ? 'braided' : 'ringed', dreadTintId: 'obsidian',
    armorStyleId: 'classic', armorTintId: id === 'karhek' ? 'gunmetal' : 'bronze',
    trophyAdornmentId: 'none', laserColorId: id === 'karhek' ? 'cyan' : 'amber' };
}

export function expeditionMemberLoadout(id: ExpeditionMemberId): Loadout {
  return { armorId: id === 'karhek' ? 'scout' : 'hunter', weaponIds: ['combistick', 'wristblades'],
    gearIds: id === 'karhek' ? ['motion-sensor', 'audio-decoy'] : ['snare', 'motion-sensor'] };
}

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) &&
  Reflect.ownKeys(value).every(key => typeof key === 'string' && Object.getOwnPropertyDescriptor(value, key)?.enumerable &&
    'value' in Object.getOwnPropertyDescriptor(value, key)!);
const exact = (value: Record<string, unknown>, keys: readonly string[]) => Reflect.ownKeys(value).length === keys.length &&
  keys.every(key => Object.hasOwn(value, key));

export function normalizePlanetInsertionPlan(value: unknown): PlanetInsertionPlan | null {
  if (value === undefined) return { ...DEFAULT_PLAN };
  if (!record(value) || !(exact(value, ['version', 'method', 'team']) ||
      exact(value, ['version', 'method', 'team', 'shipCloak'])) || value.version !== 1 ||
      (value.method !== 'pod' && value.method !== 'ship') || (value.team !== 'solo' && value.team !== 'triad') ||
      (Object.hasOwn(value, 'shipCloak') && typeof value.shipCloak !== 'boolean') ||
      (value.shipCloak === true && value.method !== 'ship')) return null;
  return { version: 1, method: value.method as PlanetInsertionPlan['method'], team: value.team as PlanetInsertionPlan['team'],
    ...(value.shipCloak === true ? { shipCloak: true } : {}) };
}

export function samePlanetInsertion(left: unknown, right: unknown): boolean {
  const a = normalizePlanetInsertionPlan(left), b = normalizePlanetInsertionPlan(right);
  return !!a && !!b && a.method === b.method && a.team === b.team && !!a.shipCloak === !!b.shipCloak;
}

/** Balance rules for this game, not claims about the dimensions of film spacecraft. */
export function planetInsertionPressure(plan: PlanetInsertionPlan) {
  const triad = plan.team === 'triad';
  if (plan.method === 'ship' && plan.shipCloak) {
    return { initialSuspicion: triad ? .40 : .32, extraPatrols: triad ? 2 : 1, searchSeconds: 18 };
  }
  return plan.method === 'ship'
    ? { initialSuspicion: triad ? .72 : .64, extraPatrols: triad ? 4 : 3, searchSeconds: 35 }
    : { initialSuspicion: triad ? .18 : 0, extraPatrols: triad ? 1 : 0, searchSeconds: triad ? 10 : 0 };
}

export function shipSupportsSurfaceInsertion(shipId: ShipId): boolean {
  return !['avp-predator-drop-pod', 'project-original-avp-predator-drop-pod'].includes(shipId) &&
    !['mothership', 'carrier', 'fleet', 'escape-pod'].includes(shipForId(shipId).role);
}

export function triadRecommendedForMission(missionId: MissionId): boolean {
  return ['fungal-hivemind', 'ruins-ancient-guardian', 'volcano-bad-blood'].includes(missionId);
}

export const EXPEDITION_ROSTER_VERSION = 2 as const;

/** Recruitment and hull assignment are independent; null assignment means reserve. */
export interface ExpeditionRoster {
  version: typeof EXPEDITION_ROSTER_VERSION;
  ownerCreatedAt: string;
  members: { id: ExpeditionMemberId; assignedShipId: ShipId | null; availability: 'ready' | 'recovering' | 'missing' }[];
  /** A repeated completion cannot heal, lose or debit the same hunters twice. */
  settledRunIds: string[];
}

/** Preserve v1 agreements and assignments; never infer recruitment from a catalogue. */
export function inspectExpeditionRoster(value: unknown, owner: string): {
  status: 'absent' | 'valid' | 'invalid-save' | 'future-version'; state: ExpeditionRoster | null;
} {
  if (value === undefined || value === null) return { status: 'absent', state: null };
  if (record(value) && typeof value.version === 'number' && value.version > EXPEDITION_ROSTER_VERSION) return { status: 'future-version', state: null };
  const invalid = { status: 'invalid-save' as const, state: null };
  if (!record(value) || !exact(value, ['version', 'ownerCreatedAt', 'members', 'settledRunIds']) ||
      (value.version !== 1 && value.version !== EXPEDITION_ROSTER_VERSION) ||
      value.ownerCreatedAt !== owner || !owner || !Array.isArray(value.members) || value.members.length > 2 ||
      !Array.isArray(value.settledRunIds) || value.settledRunIds.length > 64 ||
      value.settledRunIds.some(id => typeof id !== 'string' || !id || id.length > 160 || /[\x00-\x1f\x7f]/.test(id)) ||
      new Set(value.settledRunIds).size !== value.settledRunIds.length) return invalid;
  const members: ExpeditionRoster['members'] = [];
  for (const raw of value.members) {
    if (!record(raw) || !exact(raw, ['id', 'assignedShipId', 'availability']) || !TRIO_MEMBERS.some(member => member.id === raw.id) ||
        (!isShipId(raw.assignedShipId) && !(value.version === EXPEDITION_ROSTER_VERSION && raw.assignedShipId === null)) ||
        !['ready', 'recovering', 'missing'].includes(raw.availability as string) ||
        members.some(member => member.id === raw.id)) return invalid;
    members.push({ id: raw.id as ExpeditionMemberId, assignedShipId: raw.assignedShipId as ShipId | null,
      availability: raw.availability as ExpeditionRoster['members'][number]['availability'] });
  }
  return { status: 'valid', state: { version: EXPEDITION_ROSTER_VERSION, ownerCreatedAt: owner, members, settledRunIds: [...value.settledRunIds] as string[] } };
}

/** Accept an explicit agreement without creating an occupant aboard any hull. */
export function recruitExpeditionMember(roster: ExpeditionRoster | null | undefined, owner: string, id: ExpeditionMemberId): ExpeditionRoster {
  if (!owner || !TRIO_MEMBERS.some(member => member.id === id)) throw new TypeError('Recrutement de triade invalide.');
  const current = inspectExpeditionRoster(roster, owner);
  if (current.status === 'invalid-save' || current.status === 'future-version') throw new TypeError('Registre de triade incompatible.');
  if (current.state?.members.some(member => member.id === id)) return current.state;
  return { version: EXPEDITION_ROSTER_VERSION, ownerCreatedAt: owner, settledRunIds: current.state?.settledRunIds ?? [], members: [
    ...(current.state?.members ?? []), { id, assignedShipId: null, availability: 'ready' as const },
  ].sort((a, b) => a.id.localeCompare(b.id)) };
}

/** Assign only an already recruited hunter; moving hull never changes availability. */
export function assignExpeditionMember(roster: ExpeditionRoster | null | undefined, owner: string, shipId: ShipId, id: ExpeditionMemberId): ExpeditionRoster {
  if (!owner || !isShipId(shipId) || !TRIO_MEMBERS.some(member => member.id === id)) throw new TypeError('Affectation de triade invalide.');
  const current = inspectExpeditionRoster(roster, owner).state;
  if (!current?.members.some(member => member.id === id)) throw new TypeError('Un compagnon recruté est requis avant son affectation.');
  return { ...current, members: current.members.map(member => member.id === id ? { ...member, assignedShipId: shipId } : member) };
}

/** Voluntary reserve keeps the agreement and all care/rescue debts, without a hull. */
export function reserveExpeditionMember(roster: ExpeditionRoster | null | undefined, owner: string, id: ExpeditionMemberId): ExpeditionRoster {
  const current = inspectExpeditionRoster(roster, owner).state;
  if (!current?.members.some(member => member.id === id)) throw new TypeError('Un compagnon recruté est requis pour la mise en réserve.');
  return { ...current, members: current.members.map(member => member.id === id ? { ...member, assignedShipId: null } : member) };
}

export function expeditionTrioReady(roster: ExpeditionRoster | null | undefined, owner: string, shipId: ShipId): boolean {
  const state = inspectExpeditionRoster(roster, owner).state;
  return !!state && TRIO_MEMBERS.every(member => state.members.some(entry => entry.id === member.id &&
    entry.assignedShipId === shipId && entry.availability === 'ready'));
}

/** Campaign consequences are applied in the same transaction as the mission result. */
export function settleExpeditionOutcome(roster: ExpeditionRoster | null | undefined, owner: string,
  expectedRunId: string, expectedPlan: PlanetInsertionPlan, shipId: ShipId, outcome: HuntInsertionOutcome | undefined): ExpeditionRoster | null {
  const current = inspectExpeditionRoster(roster, owner).state;
  if (!current || !record(outcome) || outcome.version !== 1 || outcome.runId !== expectedRunId || expectedPlan.team !== 'triad' ||
      !samePlanetInsertion(outcome.plan, expectedPlan) || current.settledRunIds.includes(expectedRunId)) return null;
  if (!expeditionTrioReady(current, owner, shipId) || !Array.isArray(outcome.members) || outcome.members.length !== 2 ||
      !Array.isArray(outcome.extracted) || !Array.isArray(outcome.leftBehind) || !Array.isArray(outcome.injured)) return null;
  if (outcome.members.some(member => !record(member) || !TRIO_MEMBERS.some(entry => entry.id === member.id) ||
      !['extracted', 'left-behind'].includes(member.status) || !Number.isFinite(member.health) ||
      member.maxHealth !== EXPEDITION_MEMBER_HEALTH[member.id] ||
      member.health < 0 || member.health > member.maxHealth || (member.status === 'extracted' && member.health === 0)) ||
      new Set(outcome.members.map(member => member.id)).size !== 2) return null;
  const matches = (actual: ExpeditionMemberId[], expected: ExpeditionMemberId[]) => actual.length === expected.length &&
    new Set(actual).size === actual.length && actual.every(id => expected.includes(id));
  if (!matches(outcome.extracted, outcome.members.filter(member => member.status === 'extracted').map(member => member.id)) ||
      !matches(outcome.leftBehind, outcome.members.filter(member => member.status === 'left-behind').map(member => member.id)) ||
      !matches(outcome.injured, outcome.members.filter(member => member.status === 'extracted' && member.health < member.maxHealth).map(member => member.id))) return null;
  return { ...current, settledRunIds: [...current.settledRunIds, expectedRunId].slice(-64), members: current.members.map(member => ({
    ...member, availability: outcome.leftBehind.includes(member.id) ? 'missing' : outcome.injured.includes(member.id) ? 'recovering' : 'ready',
  })) };
}

/** Explicit paid clan services; no combat victory, rite or player rescue is fabricated. */
export function careForExpeditionMember(roster: ExpeditionRoster | null | undefined, owner: string,
  id: ExpeditionMemberId, clanMarks: number, expectedAvailability: 'recovering' | 'missing'): { roster: ExpeditionRoster; clanMarks: number; cost: number } | null {
  const current = inspectExpeditionRoster(roster, owner).state;
  const member = current?.members.find(entry => entry.id === id);
  if (!current || !member || member.availability === 'ready' || member.availability !== expectedAvailability || !Number.isSafeInteger(clanMarks)) return null;
  const cost = EXPEDITION_CARE_COST[member.availability];
  if (clanMarks < cost) return null;
  return { cost, clanMarks: clanMarks - cost, roster: { ...current, members: current.members.map(entry => entry.id === id
    ? { ...entry, availability: member.availability === 'missing' ? 'recovering' : 'ready' } : entry) } };
}
