import { isShipId, type ShipId } from '../shipCatalogue';

/** The clan destination is a separate entity, never the selected personal hull. */
export const CLAN_SHIP_ID = 'avp-clan-mothership' as const;
export const CLAN_SHIP_DOCKING_VERSION = 1 as const;
export const CLAN_SHIP_ROOM_IDS = [
  'hangar', 'conseil', 'armurerie', 'trophees', 'soins', 'archives', 'entrainement',
] as const;

export type ClanShipRoomId = (typeof CLAN_SHIP_ROOM_IDS)[number];
export type ClanShipDockingStatus = 'free-flight' | 'approach' | 'docked' | 'aboard';

/** Save DTO only. It grants no hull ownership, service reward or mission access. */
export interface ClanShipDockingState {
  version: 1;
  ownerCreatedAt: string;
  clanShipId: typeof CLAN_SHIP_ID;
  personalShipId: ShipId;
  status: ClanShipDockingStatus;
  /** Aboard: the occupied room. Otherwise: the next entry point, always hangar. */
  roomId: ClanShipRoomId;
}

export interface ClanShipDockingInspection {
  status: 'absent' | 'valid' | 'future-version' | 'invalid-save';
  state: ClanShipDockingState | null;
  reason: string | null;
}

export type ClanShipDockingAction =
  | { type: 'approach' }
  | { type: 'cancel-approach' }
  | { type: 'dock' }
  | { type: 'board' }
  | { type: 'return-to-personal' }
  | { type: 'undock' }
  | { type: 'move-room'; roomId: ClanShipRoomId }
  | { type: 'select-personal-ship'; personalShipId: ShipId };

export interface ClanShipDockingContext {
  ownerCreatedAt: string;
  /** Read from the current, owner-validated personal fleet by the caller. */
  personalShipId: ShipId;
}

export type ClanShipDockingRefusal =
  | 'invalid-state'
  | 'future-version'
  | 'invalid-context'
  | 'owner-mismatch'
  | 'personal-ship-mismatch'
  | 'invalid-action'
  | 'invalid-transition'
  | 'personal-ship-locked'
  | 'already-there';

export interface ClanShipDockingResult {
  accepted: boolean;
  changed: boolean;
  state: ClanShipDockingState;
  reason: ClanShipDockingRefusal | null;
  message: string;
}

const STATE_KEYS = ['version', 'ownerCreatedAt', 'clanShipId', 'personalShipId', 'status', 'roomId'] as const;
const STATUSES: readonly ClanShipDockingStatus[] = ['free-flight', 'approach', 'docked', 'aboard'];

function record(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function identity(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 160 &&
    value.trim() === value && !/[\x00-\x1f\x7f]/.test(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

export function isClanShipRoomId(value: unknown): value is ClanShipRoomId {
  return typeof value === 'string' && CLAN_SHIP_ROOM_IDS.some(id => id === value);
}

/** Call only with the campaign owner and a known personal catalogue identity. */
export function createClanShipDockingState(ownerCreatedAt: string, personalShipId: ShipId): ClanShipDockingState {
  if (!identity(ownerCreatedAt) || !isShipId(personalShipId)) {
    throw new TypeError('Une identité de campagne et une coque personnelle connues sont requises.');
  }
  return {
    version: CLAN_SHIP_DOCKING_VERSION,
    ownerCreatedAt,
    clanShipId: CLAN_SHIP_ID,
    personalShipId,
    status: 'free-flight',
    roomId: 'hangar',
  };
}

/**
 * Inspect before normalizing at the save boundary. Unsupported or malformed
 * data is never converted to a fresh visit: the caller must keep/reject its
 * original save bytes. A future version is reported even if its new fields
 * cannot be understood by this build.
 */
export function inspectClanShipDocking(raw: unknown, ownerCreatedAt: string): ClanShipDockingInspection {
  const invalid = (reason: string): ClanShipDockingInspection => ({ status: 'invalid-save', state: null, reason });
  if (raw === undefined || raw === null) {
    return identity(ownerCreatedAt) ? { status: 'absent', state: null, reason: null } : invalid('invalid-owner');
  }
  if (!record(raw)) return invalid('invalid-record');
  if (typeof raw.version === 'number' && Number.isSafeInteger(raw.version) && raw.version > CLAN_SHIP_DOCKING_VERSION) {
    return { status: 'future-version', state: null, reason: 'unsupported-version' };
  }
  if (raw.version !== CLAN_SHIP_DOCKING_VERSION) return invalid('invalid-version');
  if (!exactKeys(raw, STATE_KEYS)) return invalid('invalid-fields');
  if (!identity(ownerCreatedAt) || !identity(raw.ownerCreatedAt)) return invalid('invalid-owner');
  if (raw.ownerCreatedAt !== ownerCreatedAt) return invalid('owner-mismatch');
  if (raw.clanShipId !== CLAN_SHIP_ID) return invalid('invalid-clan-ship');
  if (!isShipId(raw.personalShipId)) return invalid('invalid-personal-ship');
  if (!STATUSES.some(status => status === raw.status)) return invalid('invalid-status');
  if (!isClanShipRoomId(raw.roomId)) return invalid('invalid-room');
  if (raw.status !== 'aboard' && raw.roomId !== 'hangar') return invalid('room-outside-clan-ship');
  return {
    status: 'valid',
    state: {
      version: CLAN_SHIP_DOCKING_VERSION,
      ownerCreatedAt: raw.ownerCreatedAt,
      clanShipId: CLAN_SHIP_ID,
      personalShipId: raw.personalShipId,
      status: raw.status as ClanShipDockingStatus,
      roomId: raw.roomId,
    },
    reason: null,
  };
}

/**
 * Old saves with no visit (or explicit null) start in their personal ship.
 * A valid visit keeps its exact location and hull; this does not read the fleet.
 * Never use `normalize(...) ?? create(...)` when loading a persisted field:
 * inspect its diagnostic first so incompatible saves stay protected.
 */
export function normalizeClanShipDocking(
  raw: unknown,
  ownerCreatedAt: string,
  personalShipId: ShipId,
): ClanShipDockingState | null {
  const inspected = inspectClanShipDocking(raw, ownerCreatedAt);
  if (inspected.status === 'valid') return inspected.state;
  if (inspected.status !== 'absent' || !isShipId(personalShipId)) return null;
  return createClanShipDockingState(ownerCreatedAt, personalShipId);
}

/** Changing hull is locked throughout approach and the whole docking visit. */
export function canSelectPersonalShip(state: ClanShipDockingState): boolean {
  return inspectClanShipDocking(state, state?.ownerCreatedAt).status === 'valid' && state.status === 'free-flight';
}

function validAction(value: unknown): value is ClanShipDockingAction {
  if (!record(value) || typeof value.type !== 'string') return false;
  if (value.type === 'move-room') return exactKeys(value, ['type', 'roomId']) && isClanShipRoomId(value.roomId);
  if (value.type === 'select-personal-ship') {
    return exactKeys(value, ['type', 'personalShipId']) && isShipId(value.personalShipId);
  }
  return exactKeys(value, ['type']) && ['approach', 'cancel-approach', 'dock', 'board', 'return-to-personal', 'undock'].includes(value.type);
}

/**
 * One command changes at most one stage. Repeated commands cannot skip the
 * airlock or undock while the hunter is aboard the clan ship. The integration
 * still owns input edge detection, durable writes and personal hull unlocks.
 */
export function actClanShipDocking(
  state: ClanShipDockingState,
  action: ClanShipDockingAction,
  context: ClanShipDockingContext,
): ClanShipDockingResult {
  const refused = (reason: ClanShipDockingRefusal, message: string): ClanShipDockingResult => ({
    accepted: false, changed: false, state, reason, message,
  });
  if (!record(context) || !identity(context.ownerCreatedAt) || !isShipId(context.personalShipId)) {
    return refused('invalid-context', 'La campagne ou la coque personnelle courante est invalide.');
  }
  const inspected = inspectClanShipDocking(state, context.ownerCreatedAt);
  if (inspected.status === 'future-version') return refused('future-version', 'Cette visite appartient à une version plus récente.');
  if (inspected.reason === 'owner-mismatch') return refused('owner-mismatch', 'Cette visite appartient à une autre campagne.');
  if (inspected.status !== 'valid') return refused('invalid-state', 'La visite enregistrée ne peut pas être modifiée.');
  if (!validAction(action)) return refused('invalid-action', 'Cette commande de visite est invalide.');
  if (state.status !== 'free-flight' && state.personalShipId !== context.personalShipId) {
    return refused('personal-ship-mismatch', 'La coque personnelle ne correspond pas au vaisseau engagé dans cette visite.');
  }
  const changed = (patch: Partial<ClanShipDockingState>, message: string): ClanShipDockingResult => ({
    accepted: true,
    changed: true,
    // A fleet may have changed while flying freely. Bind its current hull when
    // starting a new approach, without changing a hull already engaged.
    state: { ...state, personalShipId: context.personalShipId, ...patch },
    reason: null,
    message,
  });
  switch (action.type) {
    case 'approach':
      if (state.status === 'free-flight') return changed({ status: 'approach' }, 'Approche du grand vaisseau de clan AVP.');
      break;
    case 'cancel-approach':
      if (state.status === 'approach') return changed({ status: 'free-flight' }, 'Approche annulée ; vol libre dans le vaisseau personnel.');
      break;
    case 'dock':
      if (state.status === 'approach') return changed({ status: 'docked' }, 'Vaisseau personnel amarré au Clan Ship.');
      break;
    case 'board':
      if (state.status === 'docked') return changed({ status: 'aboard', roomId: 'hangar' }, 'Entrée dans le hangar du Clan Ship.');
      break;
    case 'return-to-personal':
      if (state.status === 'aboard') return changed({ status: 'docked', roomId: 'hangar' }, 'Retour dans le vaisseau personnel ; amarrage maintenu.');
      break;
    case 'undock':
      if (state.status === 'docked') return changed({ status: 'free-flight', roomId: 'hangar' }, 'Désamarrage effectué depuis le vaisseau personnel.');
      break;
    case 'move-room':
      if (state.status !== 'aboard') break;
      if (state.roomId === action.roomId) return refused('already-there', 'Le chasseur se trouve déjà dans cette salle.');
      return changed({ roomId: action.roomId }, 'Déplacement dans le Clan Ship.');
    case 'select-personal-ship':
      if (state.status !== 'free-flight') {
        return refused('personal-ship-locked', 'Désamarrer ou annuler l’approche avant de changer de coque personnelle.');
      }
      if (state.personalShipId === action.personalShipId && context.personalShipId === action.personalShipId) {
        return refused('already-there', 'Cette coque personnelle est déjà sélectionnée.');
      }
      return changed({ personalShipId: action.personalShipId }, 'Coque personnelle synchronisée pour la prochaine approche.');
  }
  return refused('invalid-transition', state.status === 'aboard' && action.type === 'undock'
    ? 'Revenir dans le vaisseau personnel avant de désamarrer.'
    : 'Cette manœuvre ne correspond pas à la position actuelle du chasseur.');
}
