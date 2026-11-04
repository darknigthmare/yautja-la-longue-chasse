import { isShipId, type ShipId } from '../shipCatalogue';
import { abandonWolfCastleCombat, advanceWolfCastleCombatEncounter, createWolfCastleCombat, inspectWolfCastleCombat,
  wolfCastleCombatPending, type WolfCastleCombatState } from './wolfCastleCombat';
import { createWolfCastleDungeon, inspectWolfCastleDungeon, wolfCastleDungeonObjectivesComplete,
  wolfCastleDungeonObjective, wolfCastleDungeonReceipt, wolfCastleDungeonRewardDelta, type WolfCastleDungeonState } from './wolfCastleDungeon';
export { wolfCastleActiveCombat, wolfCastleDungeonObjective, wolfCastleDungeonRewardDelta } from './wolfCastleDungeon';

/** A separate destination. This identity never denotes a Clan Ship or a hull. */
export const WOLF_CASTLE_LOCATION_ID = 'wolf-orbital-castle' as const;
export const WOLF_CASTLE_VERSION = 3 as const;
export const WOLF_CASTLE_ROOM_IDS = [
  'royal-berth', 'royal-airlock', 'royal-vestibule', 'royal-gallery',
  'royal-audience', 'royal-council', 'royal-archives', 'royal-court', 'royal-service-pass',
] as const;
export type WolfCastleRoomId = (typeof WOLF_CASTLE_ROOM_IDS)[number];
export type WolfCastleMode = 'hub' | 'audience' | 'trial';
export type WolfCastleAudienceDecision = 'unheard' | 'pending' | 'accepted' | 'deferred';
export const WOLF_CASTLE_SEALS = ['threshold', 'zenith', 'return'] as const;
export type WolfCastleSealId = (typeof WOLF_CASTLE_SEALS)[number];

export interface WolfCastlePosition { x: number; y: number; facing: -1 | 1 }
/** Campaign-owned DTO. V1/V2 visits migrate without accepting a mandate or touching the training dossier. */
export interface WolfCastleVisit {
  version: 3;
  ownerCreatedAt: string;
  locationId: typeof WOLF_CASTLE_LOCATION_ID;
  personalShipId: ShipId;
  invitationId: string | null;
  mode: WolfCastleMode;
  status: 'approach' | 'aboard' | 'departed';
  roomId: WolfCastleRoomId;
  entryFrom: WolfCastleRoomId | null;
  visitedRooms: WolfCastleRoomId[];
  audience: WolfCastleAudienceDecision;
  archiveRead: boolean;
  trial: { status: 'idle' | 'active' | 'complete'; progress: number; attempts: number };
  revision: number;
  position: WolfCastlePosition;
  combat: WolfCastleCombatState | null;
  dungeon: WolfCastleDungeonState | null;
}

export interface WolfCastleCheckpoint {
  ownerCreatedAt: string;
  personalShipId: ShipId;
  roomId: WolfCastleRoomId;
  expectedRevision: number;
  position: WolfCastlePosition;
  combat: WolfCastleCombatState | null;
  /** Omitted by old callers: preserves the mandate. No objective or receipt crosses this boundary. */
  dungeonCombat?: WolfCastleCombatState | null;
}

export interface WolfCastleContext { ownerCreatedAt: string; personalShipId: ShipId }
export interface WolfCastleInspection {
  status: 'absent' | 'valid' | 'future-version' | 'invalid-save';
  state: WolfCastleVisit | null;
  reason: string | null;
}
export type WolfCastleAction =
  | { type: 'board' }
  | { type: 'depart' }
  | { type: 'approach' }
  | { type: 'move-room'; roomId: WolfCastleRoomId }
  | { type: 'hear-audience' }
  | { type: 'decide-audience'; decision: 'accepted' | 'deferred' }
  | { type: 'read-archive' }
  | { type: 'start-trial' }
  | { type: 'activate-seal'; sealId: WolfCastleSealId }
  | { type: 'finish-trial' }
  | { type: 'cancel-trial' }
  | { type: 'start-combat' }
  | { type: 'next-combat' }
  | { type: 'abandon-combat' }
  | { type: 'accept-dungeon' }
  | { type: 'inspect-dungeon-archive' }
  | { type: 'inspect-dungeon-gallery' }
  | { type: 'inspect-dungeon-council' }
  | { type: 'start-dungeon-combat' }
  | { type: 'next-dungeon-phase' }
  | { type: 'retry-dungeon' }
  | { type: 'abandon-dungeon' }
  | { type: 'extract-dungeon' };
export interface WolfCastleResult {
  accepted: boolean;
  changed: boolean;
  state: WolfCastleVisit;
  reason: string | null;
  message: string;
  clanMarksReward?: number;
}

export interface WolfCastlePoint { x: number; y: number }
export interface WolfCastleRect extends WolfCastlePoint { width: number; height: number }
export interface WolfCastleProp {
  id: string;
  asset: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Shared stage depth for a seated character and the prop beneath it. */
  depthY?: number;
  /** Ground footprint only. Tall painted pixels do not create a wall. */
  solid?: WolfCastleRect;
}
export interface WolfCastleStation extends WolfCastlePoint {
  id: string;
  label: string;
  kind: 'door' | 'departure' | 'invitation' | 'audience' | 'council' | 'archive' | 'trial' | 'seal' | 'gallery' | 'combat';
  targetRoom?: WolfCastleRoomId;
  sealId?: WolfCastleSealId;
}
export interface WolfCastleRoom {
  id: WolfCastleRoomId;
  name: string;
  subtitle: string;
  background: string;
  stations: readonly WolfCastleStation[];
  props: readonly WolfCastleProp[];
}

export const WOLF_CASTLE_WORLD = Object.freeze({
  width: 1600,
  height: 720,
  floor: Object.freeze({ x: 48, y: 486, width: 1504, height: 182 }),
  actorRadius: 19,
  actorSpeed: 270,
  interactionRadius: 94,
});
export const WOLF_CASTLE_ART_ROOT = '/game/wolf-castle/v1/';

const door = (targetRoom: WolfCastleRoomId, label: string, x: number, y = 596): WolfCastleStation =>
  ({ id: `door:${targetRoom}`, kind: 'door', targetRoom, label, x, y });
const prop = (id: string, asset: string, x: number, y: number, width: number, height: number, solid?: WolfCastleRect): WolfCastleProp =>
  ({ id, asset: `${WOLF_CASTLE_ART_ROOT}${asset}.png`, x, y, width, height, ...(solid ? { solid } : {}) });
const column = (id: string, x: number): WolfCastleProp => prop(id, 'column', x, 521, 108, 348, { x: x - 26, y: 494, width: 52, height: 37 });

/** Authored adaptation for gameplay. Unshown rooms are not asserted as comic canon. */
export const WOLF_CASTLE_ROOMS: readonly WolfCastleRoom[] = [
  {
    id: 'royal-berth', name: 'Baie royale', subtitle: 'Ton vaisseau personnel demeure amarré ici.', background: 'berth-wall',
    stations: [
      { id: 'personal-ship', kind: 'departure', label: 'Rejoindre mon vaisseau', x: 380, y: 602 },
      door('royal-airlock', 'Sas royal', 1468),
    ],
    props: [prop('anchor-west', 'bay-anchor', 205, 526, 132, 148, { x: 172, y: 505, width: 66, height: 35 }), prop('anchor-east', 'bay-anchor', 1188, 526, 132, 148, { x: 1155, y: 505, width: 66, height: 35 })],
  },
  {
    id: 'royal-airlock', name: 'Sas royal', subtitle: 'Le contrôle d’accès précède la grande galerie.', background: 'service-wall',
    stations: [door('royal-berth', 'Baie royale', 132), door('royal-vestibule', 'Vestibule', 1468), { id: 'invitation', kind: 'invitation', label: 'Consulter le protocole d’accès', x: 800, y: 602 }],
    props: [prop('access-console', 'archive-console', 800, 538, 162, 186, { x: 748, y: 499, width: 104, height: 40 }), prop('access-beacon', 'access-beacon', 1040, 520, 64, 96)],
  },
  {
    id: 'royal-vestibule', name: 'Vestibule', subtitle: 'L’axe cérémoniel mène à l’audience. Le passage latéral rejoint la cour.', background: 'gallery-wall',
    stations: [door('royal-airlock', 'Sas royal', 132), door('royal-gallery', 'Galerie des trophées', 1468), door('royal-service-pass', 'Passage latéral', 800, 534)],
    props: [column('vestibule-west', 402), column('vestibule-east', 1198)],
  },
  {
    id: 'royal-gallery', name: 'Galerie des trophées', subtitle: 'Une voie centrale libre relie les archives à la salle d’audience.', background: 'gallery-wall',
    stations: [door('royal-vestibule', 'Vestibule', 132), door('royal-audience', 'Salle d’audience', 1468), door('royal-archives', 'Archives royales', 800, 534), { id: 'gallery', kind: 'gallery', label: 'Examiner les socles', x: 1150, y: 608 }],
    props: [prop('plinth-west', 'trophy-plinth', 450, 530, 150, 160, { x: 398, y: 499, width: 104, height: 40 }), prop('plinth-east', 'trophy-plinth', 1150, 530, 150, 160, { x: 1098, y: 499, width: 104, height: 40 })],
  },
  {
    id: 'royal-audience', name: 'Salle d’audience', subtitle: 'Présente ton invitation au pied de l’estrade.', background: 'audience-wall',
    stations: [door('royal-gallery', 'Galerie des trophées', 132), door('royal-council', 'Conseil royal', 1468), { id: 'audience', kind: 'audience', label: 'Présenter l’invitation', x: 800, y: 616 }],
    props: [prop('royal-dais', 'dais', 800, 534, 454, 142, { x: 616, y: 490, width: 368, height: 64 }),
      { ...prop('royal-throne', 'throne', 800, 475, 218, 304), depthY: 534 },
      { ...prop('predator-king', 'predator-king-seated', 800, 463, 200, 260), depthY: 534 },
      prop('guard-west', 'royal-guard', 500, 531, 132, 214, { x: 480, y: 512, width: 40, height: 30 }),
      prop('guard-east', 'royal-guard', 1100, 531, 132, 214, { x: 1080, y: 512, width: 40, height: 30 }),
      column('audience-west', 360), column('audience-east', 1240)],
  },
  {
    id: 'royal-council', name: 'Conseil royal', subtitle: 'L’ordre d’audience se décide à la table tactique.', background: 'audience-wall',
    stations: [door('royal-audience', 'Salle d’audience', 132), door('royal-service-pass', 'Passage latéral', 1468), { id: 'council', kind: 'council', label: 'Consulter l’ordre royal', x: 800, y: 622 }],
    props: [prop('council-table', 'council-table', 800, 549, 368, 244, { x: 646, y: 494, width: 308, height: 61 }), column('council-west', 360), column('council-east', 1240)],
  },
  {
    id: 'royal-archives', name: 'Archives royales', subtitle: 'Le terminal conserve les repères de cette escale.', background: 'gallery-wall',
    stations: [door('royal-gallery', 'Galerie des trophées', 132), { id: 'archive', kind: 'archive', label: 'Consulter les archives', x: 800, y: 608 }],
    props: [prop('archive-console', 'archive-console', 800, 538, 196, 238, { x: 734, y: 500, width: 132, height: 42 }), column('archive-west', 400), column('archive-east', 1200)],
  },
  {
    id: 'royal-court', name: 'Cour d’épreuve', subtitle: 'Les sceaux éprouvent ta mémoire. Les trois gardes éprouvent ton combat.', background: 'court-wall',
    stations: [door('royal-service-pass', 'Passage latéral', 132), { id: 'trial', kind: 'trial', label: 'Pupitre de l’épreuve', x: 800, y: 644 },
      { id: 'combat', kind: 'combat', label: 'Épreuve des trois gardes', x: 1060, y: 640 },
      { id: 'seal:threshold', kind: 'seal', sealId: 'threshold', label: 'Sceau du Seuil', x: 416, y: 562 },
      { id: 'seal:zenith', kind: 'seal', sealId: 'zenith', label: 'Sceau du Zénith', x: 1210, y: 562 },
      { id: 'seal:return', kind: 'seal', sealId: 'return', label: 'Sceau du Retour', x: 800, y: 526 }],
    props: [prop('threshold-beacon', 'access-beacon', 416, 523, 76, 122), prop('zenith-beacon', 'access-beacon', 1210, 523, 76, 122), prop('return-beacon', 'access-beacon', 800, 487, 76, 122)],
  },
  {
    id: 'royal-service-pass', name: 'Passage latéral', subtitle: 'La liaison de service rejoint le vestibule et la cour d’épreuve.', background: 'service-wall',
    stations: [door('royal-vestibule', 'Vestibule', 132), door('royal-council', 'Conseil royal', 1468), door('royal-court', 'Cour d’épreuve', 800, 534)],
    props: [prop('passage-beacon-west', 'access-beacon', 430, 520, 54, 86), prop('passage-beacon-east', 'access-beacon', 1170, 520, 54, 86)],
  },
];

export function isWolfCastleRoomId(value: unknown): value is WolfCastleRoomId {
  return typeof value === 'string' && WOLF_CASTLE_ROOM_IDS.some(id => id === value);
}
export function wolfCastleRoom(id: WolfCastleRoomId): WolfCastleRoom {
  const room = WOLF_CASTLE_ROOMS.find(entry => entry.id === id);
  if (!room) throw new TypeError('Salle royale inconnue.');
  return room;
}
export function wolfCastleNeighbours(id: WolfCastleRoomId): WolfCastleRoomId[] {
  return wolfCastleRoom(id).stations.flatMap(station => station.targetRoom ? [station.targetRoom] : []);
}

function record(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function identity(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 160 && value.trim() === value && !/[\x00-\x1f\x7f]/.test(value);
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
const VISIT_V1_KEYS = ['version', 'ownerCreatedAt', 'locationId', 'personalShipId', 'invitationId', 'mode', 'status', 'roomId', 'entryFrom', 'visitedRooms', 'audience', 'archiveRead', 'trial'] as const;
const VISIT_V2_KEYS = [...VISIT_V1_KEYS, 'revision', 'position', 'combat'] as const;
const VISIT_KEYS = [...VISIT_V2_KEYS, 'dungeon'] as const;

export function createWolfCastleVisit(
  ownerCreatedAt: string,
  personalShipId: ShipId,
  options: { mode?: WolfCastleMode; invitationId?: string | null } = {},
): WolfCastleVisit {
  const mode = options.mode ?? 'hub';
  const invitationId = options.invitationId ?? null;
  if (!identity(ownerCreatedAt) || !isShipId(personalShipId) || !['hub', 'audience', 'trial'].includes(mode) ||
      (invitationId !== null && !identity(invitationId)) || (mode === 'audience' && invitationId === null)) {
    throw new TypeError('La campagne, la coque et le motif de visite doivent être valides.');
  }
  return {
    version: WOLF_CASTLE_VERSION, ownerCreatedAt, locationId: WOLF_CASTLE_LOCATION_ID, personalShipId,
    invitationId, mode, status: 'approach', roomId: 'royal-berth', entryFrom: null,
    visitedRooms: ['royal-berth'], audience: 'unheard', archiveRead: false,
    trial: { status: 'idle', progress: 0, attempts: 0 },
    revision: 0, position: { ...wolfCastleEntryPoint('royal-berth', null), facing: 1 }, combat: null, dungeon: null,
  };
}

/** Future and malformed data remain distinguishable from an old absent field. */
export function inspectWolfCastleVisit(raw: unknown, ownerCreatedAt: string): WolfCastleInspection {
  const invalid = (reason: string): WolfCastleInspection => ({ status: 'invalid-save', state: null, reason });
  if (raw === undefined || raw === null) return identity(ownerCreatedAt)
    ? { status: 'absent', state: null, reason: null } : invalid('invalid-owner');
  if (!record(raw)) return invalid('invalid-record');
  if (typeof raw.version === 'number' && Number.isSafeInteger(raw.version) && raw.version > WOLF_CASTLE_VERSION) {
    return { status: 'future-version', state: null, reason: 'unsupported-version' };
  }
  const legacy = raw.version === 1;
  const legacyV2 = raw.version === 2;
  if ((!legacy && !legacyV2 && raw.version !== WOLF_CASTLE_VERSION) || !exactKeys(raw, legacy ? VISIT_V1_KEYS : legacyV2 ? VISIT_V2_KEYS : VISIT_KEYS)) return invalid('invalid-fields');
  if (!identity(ownerCreatedAt) || !identity(raw.ownerCreatedAt)) return invalid('invalid-owner');
  if (raw.ownerCreatedAt !== ownerCreatedAt) return invalid('owner-mismatch');
  if (raw.locationId !== WOLF_CASTLE_LOCATION_ID) return invalid('invalid-location');
  if (!isShipId(raw.personalShipId)) return invalid('invalid-personal-ship');
  if (raw.invitationId !== null && !identity(raw.invitationId)) return invalid('invalid-invitation');
  if (!['hub', 'audience', 'trial'].includes(raw.mode as string) || (raw.mode === 'audience' && raw.invitationId === null)) return invalid('invalid-mode');
  if (!['approach', 'aboard', 'departed'].includes(raw.status as string)) return invalid('invalid-status');
  if (!isWolfCastleRoomId(raw.roomId) || (raw.entryFrom !== null && !isWolfCastleRoomId(raw.entryFrom))) return invalid('invalid-room');
  if (raw.status !== 'aboard' && (raw.roomId !== 'royal-berth' || raw.entryFrom !== null)) return invalid('room-outside-castle');
  if (raw.entryFrom !== null && !wolfCastleNeighbours(raw.roomId).includes(raw.entryFrom)) return invalid('invalid-entry');
  if (!Array.isArray(raw.visitedRooms) || raw.visitedRooms.length < 1 || raw.visitedRooms.length > WOLF_CASTLE_ROOM_IDS.length ||
      !raw.visitedRooms.every(isWolfCastleRoomId) || new Set(raw.visitedRooms).size !== raw.visitedRooms.length ||
      !raw.visitedRooms.includes('royal-berth') || !raw.visitedRooms.includes(raw.roomId) ||
      (raw.entryFrom !== null && !raw.visitedRooms.includes(raw.entryFrom))) return invalid('invalid-visited-rooms');
  if (!['unheard', 'pending', 'accepted', 'deferred'].includes(raw.audience as string) ||
      (raw.audience !== 'unheard' && (raw.invitationId === null || !raw.visitedRooms.includes('royal-audience'))) ||
      (['accepted', 'deferred'].includes(raw.audience as string) && !raw.visitedRooms.includes('royal-council'))) return invalid('invalid-audience');
  if (typeof raw.archiveRead !== 'boolean' || (raw.archiveRead && !raw.visitedRooms.includes('royal-archives'))) return invalid('invalid-archive');
  if (!record(raw.trial) || !exactKeys(raw.trial, ['status', 'progress', 'attempts']) ||
      !['idle', 'active', 'complete'].includes(raw.trial.status as string) ||
      !Number.isSafeInteger(raw.trial.progress) || (raw.trial.progress as number) < 0 || (raw.trial.progress as number) > 3 ||
      !Number.isSafeInteger(raw.trial.attempts) || (raw.trial.attempts as number) < 0 || (raw.trial.attempts as number) > 9999 ||
      (raw.trial.status === 'idle' && raw.trial.progress !== 0) ||
      (raw.trial.status === 'complete' && raw.trial.progress !== 3) ||
      (raw.trial.status !== 'idle' && raw.trial.attempts === 0) ||
      ((raw.trial.attempts as number) > 0 && !raw.visitedRooms.includes('royal-court'))) return invalid('invalid-trial');
  const position = legacy ? { ...wolfCastleEntryPoint(raw.roomId, raw.entryFrom as WolfCastleRoomId | null), facing: 1 as const } : raw.position;
  if (!isWolfCastlePosition(raw.roomId, position)) return invalid('invalid-position');
  if (!legacy && (!Number.isSafeInteger(raw.revision) || (raw.revision as number) < 0 || (raw.revision as number) > Number.MAX_SAFE_INTEGER - 1)) return invalid('invalid-revision');
  const combat = inspectWolfCastleCombat(legacy ? null : raw.combat);
  if (combat.status === 'future-version') return { status: 'future-version', state: null, reason: combat.reason };
  if (combat.status === 'invalid-save') return invalid(combat.reason ?? 'invalid-combat');
  if (combat.state && combat.state.scenario !== 'training') return invalid('combat-scenario');
  if (combat.state && !raw.visitedRooms.includes('royal-court')) return invalid('combat-without-court');
  if (wolfCastleCombatPending(combat.state) && (raw.status !== 'aboard' || raw.roomId !== 'royal-court' || raw.trial.status === 'active')) return invalid('combat-outside-court');
  if (wolfCastleCombatPending(combat.state) && combat.state &&
    (position.x !== combat.state.player.x || position.y !== combat.state.player.y || position.facing !== combat.state.player.facing)) return invalid('combat-position-mismatch');
  const dungeon = inspectWolfCastleDungeon(legacy || legacyV2 ? null : raw.dungeon, ownerCreatedAt);
  if (dungeon.status === 'future-version') return { status: 'future-version', state: null, reason: dungeon.reason };
  if (dungeon.status === 'invalid-save') return invalid(dungeon.reason ?? 'invalid-dungeon');
  if (dungeon.state) {
    if (raw.invitationId === null || raw.audience !== 'accepted' || !raw.visitedRooms.includes('royal-audience')) return invalid('dungeon-without-audience');
    for (const [objective, room] of [['archives', 'royal-archives'], ['gallery', 'royal-gallery'], ['council', 'royal-council']] as const) {
      if (dungeon.state.objectives[objective] && !raw.visitedRooms.includes(room)) return invalid('dungeon-without-room');
    }
    if (dungeon.state.combat && !raw.visitedRooms.includes('royal-court')) return invalid('dungeon-without-court');
    if (wolfCastleCombatPending(dungeon.state.combat)) {
      if (raw.status !== 'aboard' || raw.roomId !== 'royal-court' || raw.trial.status === 'active' || wolfCastleCombatPending(combat.state)) return invalid('dungeon-outside-court');
      if (position.x !== dungeon.state.combat!.player.x || position.y !== dungeon.state.combat!.player.y || position.facing !== dungeon.state.combat!.player.facing) return invalid('dungeon-position-mismatch');
    }
  }
  const state: WolfCastleVisit = {
    version: WOLF_CASTLE_VERSION, ownerCreatedAt: raw.ownerCreatedAt,
    locationId: WOLF_CASTLE_LOCATION_ID, personalShipId: raw.personalShipId,
    invitationId: raw.invitationId as string | null, mode: raw.mode as WolfCastleMode,
    status: raw.status as WolfCastleVisit['status'], roomId: raw.roomId,
    entryFrom: raw.entryFrom as WolfCastleRoomId | null, visitedRooms: [...raw.visitedRooms] as WolfCastleRoomId[],
    audience: raw.audience as WolfCastleAudienceDecision, archiveRead: raw.archiveRead,
    trial: { status: raw.trial.status as WolfCastleVisit['trial']['status'], progress: raw.trial.progress as number, attempts: raw.trial.attempts as number },
    revision: legacy ? 0 : raw.revision as number, position: { ...position }, combat: combat.state, dungeon: dungeon.state,
  };
  return { status: 'valid', state, reason: null };
}

function validAction(raw: unknown): raw is WolfCastleAction {
  if (!record(raw) || typeof raw.type !== 'string') return false;
  if (raw.type === 'move-room') return exactKeys(raw, ['type', 'roomId']) && isWolfCastleRoomId(raw.roomId);
  if (raw.type === 'decide-audience') return exactKeys(raw, ['type', 'decision']) && ['accepted', 'deferred'].includes(raw.decision as string);
  if (raw.type === 'activate-seal') return exactKeys(raw, ['type', 'sealId']) && WOLF_CASTLE_SEALS.some(id => id === raw.sealId);
  return exactKeys(raw, ['type']) && ['board', 'depart', 'approach', 'hear-audience', 'read-archive', 'start-trial', 'finish-trial', 'cancel-trial', 'start-combat', 'next-combat', 'abandon-combat',
    'accept-dungeon', 'inspect-dungeon-archive', 'inspect-dungeon-gallery', 'inspect-dungeon-council', 'start-dungeon-combat', 'next-dungeon-phase', 'retry-dungeon', 'abandon-dungeon', 'extract-dungeon'].includes(raw.type);
}

/** Pure transitions. Extraction reports the sole profile delta; the caller persists it with this state atomically. */
export function actWolfCastle(state: WolfCastleVisit, action: WolfCastleAction, context: WolfCastleContext): WolfCastleResult {
  const refused = (reason: string, message: string): WolfCastleResult => ({ accepted: false, changed: false, state, reason, message });
  const unchanged = (message: string): WolfCastleResult => ({ accepted: true, changed: false, state, reason: null, message });
  const changed = (patch: Partial<WolfCastleVisit>, message: string): WolfCastleResult => ({ accepted: true, changed: true, state: { ...state, ...patch, revision: state.revision + 1 }, reason: null, message });
  if (!record(context) || !identity(context.ownerCreatedAt) || !isShipId(context.personalShipId)) return refused('invalid-context', 'Campagne ou vaisseau courant invalide.');
  const inspection = inspectWolfCastleVisit(state, context.ownerCreatedAt);
  if (inspection.status !== 'valid') return refused(inspection.reason ?? 'invalid-state', 'Cette visite ne peut pas être modifiée.');
  // Public readers may still supply a legacy DTO before its next durable write.
  if ((state.version !== WOLF_CASTLE_VERSION || (state.combat && !Object.hasOwn(state.combat, 'scenario'))) && inspection.state) state = inspection.state;
  if (state.status !== 'departed' && state.personalShipId !== context.personalShipId) return refused('personal-ship-mismatch', 'La coque courante ne correspond pas au vaisseau engagé dans cette escale.');
  if (!validAction(action)) return refused('invalid-action', 'Commande royale inconnue.');
  if (state.revision >= Number.MAX_SAFE_INTEGER - 1) return refused('revision-limit', 'Le registre de cette escale est complet.');
  if (action.type === 'approach') {
    if (state.status !== 'departed') return refused('invalid-transition', 'L’approche est déjà engagée.');
    return changed({ status: 'approach', personalShipId: context.personalShipId }, 'Approche du château orbital dans le système Wolf.');
  }
  if (action.type === 'board') {
    if (state.status !== 'approach') return refused('invalid-transition', 'Rejoins d’abord la baie depuis l’orbite.');
    return changed({ status: 'aboard' }, 'Ton vaisseau est amarré. Entrée dans la baie royale.');
  }
  if (action.type === 'depart') {
    if (state.status === 'departed') return unchanged('Tu as déjà rejoint ton vaisseau.');
    if (state.status === 'aboard' && state.roomId !== 'royal-berth') return refused('return-to-berth', 'Rejoins la baie royale avant de repartir.');
    return changed({ status: 'departed', roomId: 'royal-berth', entryFrom: null, position: { ...wolfCastleEntryPoint('royal-berth', null), facing: 1 } }, 'Retour dans ton vaisseau personnel.');
  }
  if (state.status !== 'aboard') return refused('not-aboard', 'Entre dans le château pour utiliser ses installations.');
  if (action.type === 'abandon-dungeon') {
    const dungeon = state.dungeon;
    if (!dungeon || dungeon.status === 'abandoned') return unchanged('Aucun mandat en cours à abandonner.');
    if (dungeon.status === 'completed') return unchanged('Ce mandat est déjà remis. Sa récompense reste consignée.');
    if (dungeon.status === 'victory') return refused('dungeon-awaiting-extraction', 'La sentinelle est maîtrisée. Rapporte le mandat à l’audience.');
    return changed({ dungeon: { ...dungeon, status: 'abandoned', combat: dungeon.combat ? abandonWolfCastleCombat(dungeon.combat) : null } },
      'Mandat abandonné, sans récompense. Les repères sont conservés pour une reprise à l’audience.');
  }
  if (action.type === 'next-dungeon-phase') {
    if (state.roomId !== 'royal-court' || state.dungeon?.status !== 'active' || state.dungeon.combat?.status !== 'intermission') return refused('dungeon-not-between-phases', 'Maîtrise la posture actuelle avant d’engager la suivante.');
    const combat = advanceWolfCastleCombatEncounter(state.dungeon.combat);
    return changed({ dungeon: { ...state.dungeon, combat }, position: { x: combat.player.x, y: combat.player.y, facing: combat.player.facing } },
      `La sentinelle engage sa phase ${combat.encounterIndex + 1}. La santé conservée est celle de la phase précédente.`);
  }
  if (wolfCastleCombatPending(state.dungeon?.combat ?? null)) return refused('dungeon-active', 'Termine la phase du mandat ou abandonne avant de quitter la cour.');
  if (action.type === 'abandon-combat') {
    if (!state.combat || !wolfCastleCombatPending(state.combat)) return unchanged('Aucune épreuve de combat en cours.');
    return changed({ combat: abandonWolfCastleCombat(state.combat) }, 'L’épreuve est interrompue. La sortie est libre.');
  }
  if (action.type === 'next-combat') {
    if (state.roomId !== 'royal-court' || state.combat?.status !== 'intermission') return refused('combat-not-between-rounds', 'La prochaine garde attend la fin de cette rencontre.');
    const combat = advanceWolfCastleCombatEncounter(state.combat);
    return changed({ combat, position: { x: combat.player.x, y: combat.player.y, facing: combat.player.facing } }, 'La prochaine garde entre dans la cour.');
  }
  if (wolfCastleCombatPending(state.combat)) return refused('combat-active', 'Termine ou interromps l’épreuve avant de quitter la cour.');
  const atStation = (kind: WolfCastleStation['kind']) => wolfCastleRoom(state.roomId).stations.some(station => station.kind === kind &&
    Math.hypot(state.position.x - station.x, state.position.y - station.y) <= WOLF_CASTLE_WORLD.interactionRadius);
  if (action.type === 'accept-dungeon') {
    if (state.roomId !== 'royal-audience') return refused('wrong-room', 'Le mandat se reçoit dans la salle d’audience.');
    if (!atStation('audience')) return refused('station-too-far', 'Approche de l’estrade pour recevoir le mandat.');
    if (state.invitationId === null) return refused('invitation-required', 'Une invitation de campagne est nécessaire pour recevoir ce mandat.');
    if (state.audience !== 'accepted') return refused('audience-agreement-required', 'Écoute l’audience, accepte l’ordre au conseil, puis reviens recevoir le mandat.');
    if (state.dungeon?.status === 'completed') return unchanged('Le mandat est déjà accompli et sa récompense est consignée.');
    if (state.dungeon && state.dungeon.status !== 'abandoned') return unchanged('Le mandat est déjà accepté. Reprends ses objectifs.');
    const dungeon = state.dungeon ? { ...state.dungeon, status: wolfCastleDungeonObjectivesComplete(state.dungeon) ? 'ready' as const : 'accepted' as const } : createWolfCastleDungeon();
    return changed({ dungeon }, 'Mandat accepté : relève trois repères dans les archives, la galerie et le conseil, puis maîtrise la sentinelle de la cour.');
  }
  if (['inspect-dungeon-archive', 'inspect-dungeon-gallery', 'inspect-dungeon-council'].includes(action.type)) {
    const objective = action.type === 'inspect-dungeon-archive' ? 'archives' : action.type === 'inspect-dungeon-gallery' ? 'gallery' : 'council';
    const room = objective === 'archives' ? 'royal-archives' : objective === 'gallery' ? 'royal-gallery' : 'royal-council';
    const station = objective === 'archives' ? 'archive' : objective;
    if (state.roomId !== room) return refused('wrong-room', 'Rejoins la salle du repère à relever.');
    if (!atStation(station)) return refused('station-too-far', 'Approche du repère pour le relever.');
    const dungeon = state.dungeon;
    if (!dungeon || dungeon.status === 'abandoned') return refused('dungeon-not-accepted', 'Accepte ou reprends le mandat à l’audience.');
    if (dungeon.objectives[objective]) return unchanged('Ce repère du mandat est déjà relevé.');
    if (dungeon.status !== 'accepted') return refused('dungeon-objectives-closed', 'Les repères de ce mandat ne peuvent plus être modifiés.');
    const next = { ...dungeon, objectives: { ...dungeon.objectives, [objective]: true } };
    if (wolfCastleDungeonObjectivesComplete(next)) next.status = 'ready';
    return changed({ dungeon: next }, next.status === 'ready' ? 'Les trois repères concordent. La sentinelle t’attend dans la cour.' : 'Repère du mandat relevé. Poursuis l’exploration des salles.');
  }
  if (action.type === 'start-dungeon-combat' || action.type === 'retry-dungeon') {
    if (state.roomId !== 'royal-court') return refused('wrong-room', 'La sentinelle du mandat attend dans la cour.');
    if (action.type === 'start-dungeon-combat' && !atStation('combat')) return refused('station-too-far', 'Approche du cercle de combat pour affronter la sentinelle.');
    if (state.trial.status === 'active') return refused('seals-active', 'Termine ou interromps les sceaux avant d’engager le mandat.');
    const dungeon = state.dungeon;
    if (!dungeon || dungeon.status !== (action.type === 'retry-dungeon' ? 'failed' : 'ready')) return refused('dungeon-not-ready', 'Relève les trois repères du mandat avant d’engager un nouvel affrontement.');
    if (dungeon.attempts >= 9999) return refused('dungeon-limit', 'Le registre des tentatives du mandat est complet.');
    const combat = createWolfCastleCombat(dungeon.combat, 'dungeon');
    return changed({ dungeon: { ...dungeon, status: 'active', attempts: combat.attempt, combat }, position: { x: combat.player.x, y: combat.player.y, facing: combat.player.facing } },
      'La sentinelle engage la garde du seuil. Trois postures, une seule remise de mandat.');
  }
  if (action.type === 'extract-dungeon') {
    const dungeon = state.dungeon;
    if (dungeon?.status === 'completed') return unchanged('Le mandat est déjà remis. Aucune nouvelle marque n’est accordée.');
    if (state.roomId !== 'royal-audience') return refused('wrong-room', 'Retourne à l’audience pour remettre le mandat.');
    if (!atStation('audience')) return refused('station-too-far', 'Approche de l’estrade pour remettre le mandat.');
    if (dungeon?.status !== 'victory') return refused('dungeon-not-victorious', 'Maîtrise les trois postures de la sentinelle avant la remise du mandat.');
    const result = changed({ dungeon: { ...dungeon, status: 'completed', reward: { claimed: true, receipt: wolfCastleDungeonReceipt(state.ownerCreatedAt) } } },
      'Mandat remis. Deux marques de clan sont accordées une seule fois à cette campagne.');
    return { ...result, clanMarksReward: wolfCastleDungeonRewardDelta(state, result.state) };
  }
  if (action.type === 'start-combat') {
    if (state.roomId !== 'royal-court') return refused('wrong-room', 'Rejoins la cour pour affronter les trois gardes.');
    if (state.dungeon?.status === 'failed' || state.dungeon?.status === 'victory') return refused('dungeon-unresolved',
      state.dungeon.status === 'failed' ? 'Reprends ou abandonne le mandat avant de commencer un entraînement.' : 'Remets le mandat à l’audience avant de commencer un entraînement.');
    if (state.trial.status === 'active') return refused('seals-active', 'Termine ou interromps les sceaux avant de combattre.');
    if (state.combat && state.combat.attempt >= 9999) return refused('combat-limit', 'Le registre des épreuves est complet.');
    const combat = createWolfCastleCombat(state.combat);
    return changed({ combat, position: { x: combat.player.x, y: combat.player.y, facing: combat.player.facing } }, 'Épreuve de combat engagée. Observe le premier estoc.');
  }
  if (action.type === 'move-room') {
    if (state.roomId === action.roomId) return unchanged('Tu es déjà dans cette salle.');
    if (!wolfCastleNeighbours(state.roomId).includes(action.roomId)) return refused('not-connected', 'Aucune porte directe ne relie ces deux salles.');
    return changed({ roomId: action.roomId, entryFrom: state.roomId,
      position: { ...wolfCastleEntryPoint(action.roomId, state.roomId), facing: 1 },
      visitedRooms: state.visitedRooms.includes(action.roomId) ? state.visitedRooms : [...state.visitedRooms, action.roomId] }, wolfCastleRoom(action.roomId).name);
  }
  if (action.type === 'hear-audience') {
    if (state.roomId !== 'royal-audience') return refused('wrong-room', 'Présente-toi au pied de l’estrade.');
    if (state.invitationId === null) return refused('invitation-required', 'Une invitation de campagne est nécessaire pour cette audience.');
    if (state.audience !== 'unheard') return unchanged('L’audience est déjà consignée. Le conseil conserve ta décision.');
    return changed({ audience: 'pending' }, 'Audience consignée. Rejoins le conseil pour prendre ta décision.');
  }
  if (action.type === 'decide-audience') {
    if (state.roomId !== 'royal-council') return refused('wrong-room', 'La décision se prend à la table du conseil.');
    if (state.audience === 'unheard') return refused('audience-required', 'Présente d’abord ton invitation dans la salle d’audience.');
    if (state.audience === action.decision) return unchanged('Cette décision est déjà consignée.');
    if (state.audience === 'accepted') return refused('decision-final', 'L’ordre accepté reste consigné dans cette campagne.');
    return changed({ audience: action.decision }, action.decision === 'accepted' ? 'L’ordre est accepté. Retourne à l’audience pour recevoir le mandat du château.' : 'L’ordre est différé. Tu peux revenir au conseil quand tu le souhaites.');
  }
  if (action.type === 'read-archive') {
    if (state.roomId !== 'royal-archives') return refused('wrong-room', 'Les archives se consultent à leur terminal.');
    return state.archiveRead ? unchanged('Les repères de cette escale sont déjà consultés.') : changed({ archiveRead: true }, 'Consultation des archives consignée.');
  }
  if (action.type === 'cancel-trial') {
    if (state.trial.status !== 'active') return unchanged('Aucune épreuve en cours.');
    return changed({ trial: { ...state.trial, status: 'idle', progress: 0 } }, 'Épreuve interrompue. Le parcours reste ouvert.');
  }
  if (state.roomId !== 'royal-court') return refused('wrong-room', 'Rejoins la cour pour utiliser les sceaux de l’épreuve.');
  if (action.type === 'start-trial') {
    if (state.trial.status === 'active') return unchanged('L’épreuve est déjà en cours.');
    if (state.trial.attempts >= 9999) return refused('trial-limit', 'Le registre des tentatives est complet.');
    return changed({ trial: { status: 'active', progress: 0, attempts: state.trial.attempts + 1 } }, 'Épreuve ouverte : Seuil, Zénith, Retour. Reviens ensuite au pupitre.');
  }
  if (action.type === 'finish-trial' && state.trial.status === 'complete') return unchanged('Cette épreuve est déjà accomplie.');
  if (state.trial.status !== 'active') return refused('trial-not-active', 'Active l’épreuve au pupitre central.');
  if (action.type === 'activate-seal') {
    const sealIndex = WOLF_CASTLE_SEALS.indexOf(action.sealId);
    if (sealIndex < state.trial.progress) return unchanged('Ce sceau est déjà activé.');
    if (sealIndex !== state.trial.progress) return state.trial.progress === 0
      ? unchanged('La séquence commence par le sceau du Seuil.')
      : changed({ trial: { ...state.trial, progress: 0 } }, 'L’ordre des sceaux est rompu. Recommence au Seuil.');
    return changed({ trial: { ...state.trial, progress: state.trial.progress + 1 } }, state.trial.progress === 2 ? 'Les trois sceaux sont liés. Reviens au pupitre.' : 'Sceau lié. Rejoins le suivant.');
  }
  if (state.trial.progress !== 3) return refused('seals-incomplete', 'Les trois sceaux doivent être activés avant de sceller l’épreuve.');
  return changed({ trial: { ...state.trial, status: 'complete' } }, 'Épreuve des trois sceaux accomplie. La sortie reste ouverte.');
}

export function wolfCastleRoute(from: WolfCastleRoomId, to: WolfCastleRoomId): WolfCastleRoomId[] {
  if (from === to) return [from];
  const queue: WolfCastleRoomId[][] = [[from]];
  const seen = new Set<WolfCastleRoomId>([from]);
  while (queue.length) {
    const path = queue.shift()!;
    for (const next of wolfCastleNeighbours(path[path.length - 1])) {
      if (seen.has(next)) continue;
      const candidate = [...path, next];
      if (next === to) return candidate;
      seen.add(next);
      queue.push(candidate);
    }
  }
  return [];
}

export function wolfCastleEntryPoint(roomId: WolfCastleRoomId, entryFrom: WolfCastleRoomId | null): WolfCastlePoint {
  const entry = wolfCastleRoom(roomId).stations.find(station => station.targetRoom === entryFrom);
  if (!entry) return { x: 380, y: 612 };
  return { x: entry.x < 300 ? entry.x + 118 : entry.x > 1300 ? entry.x - 118 : entry.x, y: entry.y < 570 ? entry.y + 104 : 612 };
}

export function isWolfCastlePointWalkable(roomId: WolfCastleRoomId, point: WolfCastlePoint): boolean {
  const { floor, actorRadius: radius } = WOLF_CASTLE_WORLD;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < floor.x + radius || point.x > floor.x + floor.width - radius ||
      point.y < floor.y + radius || point.y > floor.y + floor.height - radius) return false;
  return !wolfCastleRoom(roomId).props.some(({ solid }) => solid && point.x > solid.x - radius && point.x < solid.x + solid.width + radius && point.y > solid.y - radius && point.y < solid.y + solid.height + radius);
}

export function isWolfCastlePosition(roomId: WolfCastleRoomId, raw: unknown): raw is WolfCastlePosition {
  return record(raw) && exactKeys(raw, ['x', 'y', 'facing']) && (raw.facing === -1 || raw.facing === 1) &&
    typeof raw.x === 'number' && typeof raw.y === 'number' && isWolfCastlePointWalkable(roomId, { x: raw.x, y: raw.y });
}

function combatCheckpointReason(previous: WolfCastleCombatState | null, next: WolfCastleCombatState | null): string | null {
  if (Boolean(previous) !== Boolean(next)) return 'combat-lifecycle';
  if (!previous || !next) return null;
  if (previous.status !== 'active') return JSON.stringify(previous) === JSON.stringify(next) ? null : 'combat-lifecycle';
  if (next.scenario !== previous.scenario || next.attempt !== previous.attempt || next.encounterIndex !== previous.encounterIndex || next.status === 'abandoned' ||
    next.elapsedMs < previous.elapsedMs || next.enemy.sequence < previous.enemy.sequence || next.stats.hits < previous.stats.hits ||
    next.stats.parries < previous.stats.parries || next.stats.evades < previous.stats.evades || next.stats.damageTaken < previous.stats.damageTaken ||
    next.player.health > previous.player.health || next.enemy.health > previous.enemy.health || next.event.sequence < previous.event.sequence ||
    previous.enemy.health - next.enemy.health > (next.stats.hits - previous.stats.hits) * 24 ||
    previous.player.health - next.player.health !== next.stats.damageTaken - previous.stats.damageTaken) return 'combat-regression';
  if (next.status === 'victory') {
    if (next.dossier.victories !== previous.dossier.victories + 1 ||
      next.dossier.bestTimeMs !== Math.min(previous.dossier.bestTimeMs ?? Infinity, next.elapsedMs) ||
      next.dossier.bestDamageTaken !== Math.min(previous.dossier.bestDamageTaken ?? Infinity, next.stats.damageTaken)) return 'combat-dossier';
  } else if (JSON.stringify(previous.dossier) !== JSON.stringify(next.dossier)) return 'combat-dossier';
  return null;
}

/** A synchronous boundary checkpoint. Only an already-started simulation may advance here. */
export function applyWolfCastleCheckpoint(state: WolfCastleVisit, checkpoint: WolfCastleCheckpoint, context: WolfCastleContext): WolfCastleResult {
  const refused = (reason: string): WolfCastleResult => ({ accepted: false, changed: false, state, reason, message: 'Le point de reprise ne correspond plus à cette visite.' });
  if (!record(context) || !identity(context.ownerCreatedAt) || !isShipId(context.personalShipId)) return refused('invalid-context');
  const inspected = inspectWolfCastleVisit(state, context.ownerCreatedAt);
  if (inspected.status !== 'valid' || !inspected.state) return refused(inspected.reason ?? 'invalid-state');
  if (state.version !== WOLF_CASTLE_VERSION || (state.combat && !Object.hasOwn(state.combat, 'scenario'))) state = inspected.state;
  const checkpointKeys = ['ownerCreatedAt', 'personalShipId', 'roomId', 'expectedRevision', 'position', 'combat'];
  if (!record(checkpoint) || !exactKeys(checkpoint, Object.hasOwn(checkpoint, 'dungeonCombat') ? [...checkpointKeys, 'dungeonCombat'] : checkpointKeys)) return refused('invalid-checkpoint');
  if (checkpoint.ownerCreatedAt !== context.ownerCreatedAt || checkpoint.ownerCreatedAt !== state.ownerCreatedAt) return refused('owner-mismatch');
  if (state.personalShipId !== context.personalShipId || checkpoint.personalShipId !== state.personalShipId) return refused('personal-ship-mismatch');
  if (state.status !== 'aboard' || checkpoint.roomId !== state.roomId) return refused('stale-room');
  if (checkpoint.expectedRevision !== state.revision) return refused('stale-revision');
  if (state.revision >= Number.MAX_SAFE_INTEGER - 1) return refused('revision-limit');
  if (!isWolfCastlePosition(state.roomId, checkpoint.position)) return refused('invalid-position');
  const combat = inspectWolfCastleCombat(checkpoint.combat);
  if (combat.status === 'invalid-save' || combat.status === 'future-version') return refused(combat.reason ?? 'invalid-combat');
  const next = combat.state;
  const trainingReason = combatCheckpointReason(state.combat, next);
  if (trainingReason) return refused(trainingReason);
  const dungeonCombat = Object.hasOwn(checkpoint, 'dungeonCombat') ? inspectWolfCastleCombat(checkpoint.dungeonCombat) : inspectWolfCastleCombat(state.dungeon?.combat ?? null);
  if (dungeonCombat.status === 'invalid-save' || dungeonCombat.status === 'future-version') return refused(dungeonCombat.reason ?? 'invalid-dungeon-combat');
  const dungeonReason = combatCheckpointReason(state.dungeon?.combat ?? null, dungeonCombat.state);
  if (dungeonReason) return refused(`dungeon-${dungeonReason}`);
  let dungeon = state.dungeon;
  if (dungeon && dungeonCombat.state) {
    const status = dungeon.status === 'active' ? dungeonCombat.state.status === 'victory' ? 'victory' : dungeonCombat.state.status === 'defeat' ? 'failed' : 'active' : dungeon.status;
    dungeon = { ...dungeon, status, combat: dungeonCombat.state };
  }
  const candidate: WolfCastleVisit = { ...state, position: { ...checkpoint.position }, combat: next, dungeon };
  const valid = inspectWolfCastleVisit(candidate, context.ownerCreatedAt);
  if (valid.status !== 'valid') return refused(valid.reason ?? 'invalid-checkpoint');
  if (JSON.stringify(candidate.position) === JSON.stringify(state.position) && JSON.stringify(next) === JSON.stringify(state.combat) && JSON.stringify(dungeon) === JSON.stringify(state.dungeon)) {
    return { accepted: true, changed: false, state, reason: null, message: 'Point de reprise conservé.' };
  }
  return { accepted: true, changed: true, state: { ...candidate, revision: state.revision + 1 }, reason: null, message: 'Position et épreuve enregistrées.' };
}

/** Bounded delta, normalized diagonal input, substeps, and axis sliding avoid tunneling. */
export function stepWolfCastleActor(roomId: WolfCastleRoomId, point: WolfCastlePoint, input: WolfCastlePoint, deltaMs: number): WolfCastlePoint {
  if (!isWolfCastlePointWalkable(roomId, point) || !Number.isFinite(deltaMs) || deltaMs <= 0 || !Number.isFinite(input.x) || !Number.isFinite(input.y)) return point;
  const magnitude = Math.hypot(input.x, input.y);
  if (magnitude < .01) return point;
  const distance = WOLF_CASTLE_WORLD.actorSpeed * Math.min(deltaMs, 50) / 1000;
  const factor = distance / Math.max(1, magnitude);
  const dx = input.x * factor, dy = input.y * factor;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (WOLF_CASTLE_WORLD.actorRadius / 2)));
  let next = point;
  for (let index = 0; index < steps; index++) {
    const horizontal = { x: next.x + dx / steps, y: next.y };
    if (isWolfCastlePointWalkable(roomId, horizontal)) next = horizontal;
    const vertical = { x: next.x, y: next.y + dy / steps };
    if (isWolfCastlePointWalkable(roomId, vertical)) next = vertical;
  }
  return next;
}

export function wolfCastleNearestStation(roomId: WolfCastleRoomId, point: WolfCastlePoint): WolfCastleStation | null {
  let nearest: WolfCastleStation | null = null;
  let distance: number = WOLF_CASTLE_WORLD.interactionRadius;
  for (const station of wolfCastleRoom(roomId).stations) {
    const candidate = Math.hypot(point.x - station.x, point.y - station.y);
    if (candidate <= distance) { distance = candidate; nearest = station; }
  }
  return nearest;
}

/** Small deterministic visibility graph used by pointer navigation; no teleport. */
export function wolfCastleWalkPath(roomId: WolfCastleRoomId, from: WolfCastlePoint, target: WolfCastlePoint): WolfCastlePoint[] {
  if (!isWolfCastlePointWalkable(roomId, from) || !isWolfCastlePointWalkable(roomId, target)) return [];
  const visible = (a: WolfCastlePoint, b: WolfCastlePoint) => {
    const samples = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 8));
    for (let index = 1; index <= samples; index++) {
      if (!isWolfCastlePointWalkable(roomId, { x: a.x + (b.x - a.x) * index / samples, y: a.y + (b.y - a.y) * index / samples })) return false;
    }
    return true;
  };
  if (visible(from, target)) return [target];
  const margin = WOLF_CASTLE_WORLD.actorRadius + 4;
  const corners = wolfCastleRoom(roomId).props.flatMap(({ solid }) => solid ? [
    { x: solid.x - margin, y: solid.y - margin }, { x: solid.x + solid.width + margin, y: solid.y - margin },
    { x: solid.x - margin, y: solid.y + solid.height + margin }, { x: solid.x + solid.width + margin, y: solid.y + solid.height + margin },
  ] : []).filter(point => isWolfCastlePointWalkable(roomId, point));
  const nodes = [from, target, ...corners], distances = nodes.map(() => Infinity), previous = nodes.map(() => -1), open = new Set(nodes.map((_, index) => index));
  distances[0] = 0;
  while (open.size) {
    let current = -1;
    for (const index of open) if (current === -1 || distances[index] < distances[current]) current = index;
    if (current === -1 || distances[current] === Infinity) return [];
    if (current === 1) {
      const route: WolfCastlePoint[] = [];
      for (let cursor = 1; cursor !== 0; cursor = previous[cursor]) route.unshift(nodes[cursor]);
      return route;
    }
    open.delete(current);
    for (const index of open) {
      if (!visible(nodes[current], nodes[index])) continue;
      const candidate = distances[current] + Math.hypot(nodes[index].x - nodes[current].x, nodes[index].y - nodes[current].y);
      if (candidate < distances[index]) { distances[index] = candidate; previous[index] = current; }
    }
  }
  return [];
}

export function wolfCastleObjective(visit: WolfCastleVisit): string {
  if (visit.status === 'approach') return 'Amarre ton vaisseau à la baie royale.';
  if (visit.status === 'departed') return 'Ton vaisseau personnel est prêt à repartir.';
  if (visit.combat?.status === 'active') return `Épreuve des trois gardes · Rencontre ${visit.combat.encounterIndex + 1} / 3. Lis l’attaque, défends-toi, puis contre-attaque.`;
  if (visit.combat?.status === 'intermission') return 'La cour te laisse un répit. Poursuis l’épreuve ou interromps-la.';
  const dungeonObjective = wolfCastleDungeonObjective(visit);
  if (dungeonObjective && visit.dungeon?.status !== 'completed' && visit.dungeon?.status !== 'abandoned') return dungeonObjective;
  if (visit.trial.status === 'active') return visit.trial.progress === 3 ? 'Reviens au pupitre pour sceller l’épreuve.' : `Épreuve : active le sceau ${['du Seuil', 'du Zénith', 'du Retour'][visit.trial.progress]}.`;
  if (visit.invitationId !== null && visit.audience === 'unheard') return 'Présente ton invitation dans la salle d’audience.';
  if (visit.audience === 'pending') return 'Rejoins le conseil royal et prends ta décision.';
  if (visit.mode === 'trial' && visit.trial.status === 'idle') return 'Rejoins la cour et active l’épreuve au pupitre.';
  if (visit.audience === 'accepted') return visit.dungeon ? wolfCastleDungeonObjective(visit)! : 'Ordre accepté. Retourne à l’audience pour recevoir le mandat du château.';
  return 'Explore les salles. La baie reste accessible pour repartir.';
}
