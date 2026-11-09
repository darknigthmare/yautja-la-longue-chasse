import type { SaveGame } from '../types';
import type { ClanShipDockingState, ClanShipRoomId } from './clanShipDocking';
import { actClanShipDocking } from './clanShipDocking';
import { evaluateClanShipAccess, inspectClanShipOperations } from './clanShipOperations';
import { clanShipTrophyWitnessPost } from './clanShipTrophyHearing';
import {
  CLAN_SHIP_INTERIOR_METRICS as METRICS, CLAN_SHIP_INTERIOR_ROOMS as ROOMS,
  canClanShipInteriorTransition, clanShipInteriorSpawn, isClanShipInteriorWalkable,
  planClanShipInteriorPath, stepClanShipInteriorPath,
  type ClanShipInteriorActor,
} from './clanShipInterior';

/** OPS-B04: a separate, optional return-control dossier. The two temporary
 * returnees are not recruited companions and have no inferred wounds or loot. */
export const CLAN_SHIP_RETURN_ESCORT_VERSION = 1 as const;
export const CLAN_SHIP_RETURN_ESCORT_ACTOR_IDS = ['return-alpha', 'return-beta'] as const;
export type ClanShipReturnEscortActorId = typeof CLAN_SHIP_RETURN_ESCORT_ACTOR_IDS[number];
export type ClanShipReturnEscortPost = 'medical-bed' | 'medical-terminal';
export type ClanShipReturnEscortPhase = 'accepted' | 'prepared' | 'escorting' | 'at-medical' | 'reported';
export interface ClanShipReturnEscortObservation { roomId: ClanShipRoomId; x: number; y: number }
export interface ClanShipReturnEscortActor extends ClanShipInteriorActor {
  id: ClanShipReturnEscortActorId; roomId: ClanShipRoomId;
}
export interface ClanShipReturnEscortState {
  version: typeof CLAN_SHIP_RETURN_ESCORT_VERSION;
  ownerCreatedAt: string; revision: number; sourceRecoveryRevision: number;
  phase: ClanShipReturnEscortPhase; post: ClanShipReturnEscortPost | null;
  actors: ClanShipReturnEscortActor[]; simulatedSeconds: number;
}
export interface ClanShipReturnEscortFrame { seconds: number; leader: ClanShipReturnEscortObservation }
export type ClanShipReturnEscortCommand = { type: 'accept' | 'start' | 'confirm-medical' | 'report' } |
  { type: 'prepare-route'; post: ClanShipReturnEscortPost } |
  { type: 'advance'; frames: ClanShipReturnEscortFrame[] } |
  { type: 'transfer-room'; roomId: ClanShipRoomId };
export type ClanShipReturnEscortAction = ClanShipReturnEscortCommand & { ownerCreatedAt: string; expectedRevision: number };
export type ClanShipReturnEscortCampaign = Pick<SaveGame, 'createdAt' | 'prologue' | 'missionProgress' | 'profile' |
  'expeditionRoster' | 'clanShipOperations' | 'clanShipDocking' | 'planetArrival' | 'companionResidence' | 'clanShipReturnEscort'>;
export interface ClanShipReturnEscortContext {
  save: ClanShipReturnEscortCampaign; active: boolean; observation: ClanShipReturnEscortObservation | null;
}
export interface ClanShipReturnEscortResult {
  accepted: boolean; changed: boolean; state: ClanShipReturnEscortState | null; message: string;
  /** A successful door passage MUST be committed in the same campaign write. */
  dockingState?: ClanShipDockingState;
}
export interface ClanShipReturnEscortTarget extends ClanShipReturnEscortObservation { label: string }
export const CLAN_SHIP_RETURN_ESCORT_POSTS: Readonly<Record<ClanShipReturnEscortPost, ClanShipReturnEscortTarget>> = {
  'medical-bed': { roomId: 'soins', x: 740, y: 655, label: 'Poste de contrôle médical' },
  'medical-terminal': { roomId: 'soins', x: 1030, y: 620, label: 'Poste de diagnostic du retour' },
};
const phases: readonly ClanShipReturnEscortPhase[] = ['accepted', 'prepared', 'escorting', 'at-medical', 'reported'];
const plain = (raw: unknown): raw is Record<string, unknown> => !!raw && typeof raw === 'object' && !Array.isArray(raw) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(raw)) && Reflect.ownKeys(raw).every(key => typeof key === 'string' &&
    Object.getOwnPropertyDescriptor(raw, key)?.enumerable && 'value' in Object.getOwnPropertyDescriptor(raw, key)!);
const exact = (raw: Record<string, unknown>, keys: readonly string[]) => Reflect.ownKeys(raw).length === keys.length && keys.every(key => Object.hasOwn(raw, key));
const integer = (raw: unknown): raw is number => Number.isSafeInteger(raw) && Number(raw) >= 0 && Number(raw) < Number.MAX_SAFE_INTEGER;
const identity = (raw: unknown): raw is string => typeof raw === 'string' && raw.length > 0 && raw.length <= 160 && raw.trim() === raw && !/[\x00-\x1f\x7f]/.test(raw);
const post = (raw: unknown): raw is ClanShipReturnEscortPost => raw === 'medical-bed' || raw === 'medical-terminal';
const room = (raw: unknown): raw is ClanShipRoomId => typeof raw === 'string' && Object.hasOwn(ROOMS, raw);
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const copy = (state: ClanShipReturnEscortState): ClanShipReturnEscortState => ({ ...state, actors: state.actors.map(actor => ({ ...actor })) });
const initialActors = (): ClanShipReturnEscortActor[] => [
  { id: 'return-alpha', roomId: 'hangar', x: 870, y: 625, facing: -1 },
  { id: 'return-beta', roomId: 'hangar', x: 900, y: 665, facing: -1 },
];
function validObservation(raw: unknown): raw is ClanShipReturnEscortObservation {
  return plain(raw) && exact(raw, ['roomId', 'x', 'y']) && room(raw.roomId) && Number.isFinite(raw.x) && Number.isFinite(raw.y) &&
    isClanShipInteriorWalkable(raw.roomId, raw as unknown as ClanShipReturnEscortObservation);
}
export function clanShipReturnEscortInReach(observation: ClanShipReturnEscortObservation | null, target: ClanShipReturnEscortTarget): boolean {
  return validObservation(observation) && observation.roomId === target.roomId && distance(observation, target) <= METRICS.interactionReach;
}
const allAtPost = (state: ClanShipReturnEscortState) => !!state.post && state.actors.every(actor =>
  actor.roomId === 'soins' && distance(actor, CLAN_SHIP_RETURN_ESCORT_POSTS[state.post!]) <= METRICS.interactionReach);

export function inspectClanShipReturnEscort(raw: unknown, ownerCreatedAt: string): {
  status: 'absent' | 'valid' | 'invalid-save' | 'future-version'; state: ClanShipReturnEscortState | null;
} {
  if (raw == null) return { status: 'absent', state: null };
  if (plain(raw) && integer(raw.version) && raw.version > CLAN_SHIP_RETURN_ESCORT_VERSION) return { status: 'future-version', state: null };
  const invalid = { status: 'invalid-save' as const, state: null };
  if (!plain(raw) || !exact(raw, ['version', 'ownerCreatedAt', 'revision', 'sourceRecoveryRevision', 'phase', 'post', 'actors', 'simulatedSeconds']) ||
      raw.version !== 1 || !identity(ownerCreatedAt) || raw.ownerCreatedAt !== ownerCreatedAt || !integer(raw.revision) ||
      !phases.includes(raw.phase as ClanShipReturnEscortPhase) || raw.revision < phases.indexOf(raw.phase as ClanShipReturnEscortPhase) + 1 ||
      !integer(raw.sourceRecoveryRevision) || raw.sourceRecoveryRevision < 1 ||
      !Number.isFinite(raw.simulatedSeconds) || Number(raw.simulatedSeconds) < 0 || Number(raw.simulatedSeconds) > 1e9 ||
      (raw.phase === 'accepted' ? raw.post !== null : !post(raw.post)) || !Array.isArray(raw.actors) || raw.actors.length !== 2) return invalid;
  const actors: ClanShipReturnEscortActor[] = [];
  for (let index = 0; index < raw.actors.length; index++) {
    const actor = raw.actors[index];
    if (!plain(actor) || !exact(actor, ['id', 'roomId', 'x', 'y', 'facing']) || actor.id !== CLAN_SHIP_RETURN_ESCORT_ACTOR_IDS[index] ||
        (actor.roomId !== 'hangar' && actor.roomId !== 'soins') || !Number.isFinite(actor.x) || !Number.isFinite(actor.y) ||
        (actor.facing !== -1 && actor.facing !== 1) || !isClanShipInteriorWalkable(actor.roomId, actor as unknown as ClanShipReturnEscortActor)) return invalid;
    actors.push({ ...actor } as unknown as ClanShipReturnEscortActor);
  }
  if (actors[0].roomId !== actors[1].roomId) return invalid;
  // A snapshot cannot claim movement sooner than the native controller could
  // physically cover it. Crossing the authored doorway maps to its paired
  // spawn; it does not provide free movement through either room.
  const initial = initialActors(), door = ROOMS.hangar.doors.find(entry => entry.targetRoomId === 'soins')!;
  const spawn = clanShipInteriorSpawn('soins', 'hangar');
  const minimumSeconds = Math.max(...actors.map((actor, index) => {
    if (actor.roomId === 'hangar') return distance(initial[index], actor) / METRICS.speed;
    const paired = { x: spawn.x + (index === 0 ? 20 : 45), y: spawn.y + (index === 0 ? -20 : 20) };
    return (Math.max(0, distance(initial[index], door) - METRICS.interactionReach) + distance(paired, actor)) / METRICS.speed;
  }));
  if (Number(raw.simulatedSeconds) + 1e-6 < minimumSeconds) return invalid;
  const state = { ...raw, actors } as unknown as ClanShipReturnEscortState;
  if (['accepted', 'prepared'].includes(state.phase) && (state.simulatedSeconds !== 0 || actors.some((actor, index) => Object.entries(initialActors()[index]).some(([key, value]) => actor[key as keyof ClanShipReturnEscortActor] !== value)))) return invalid;
  if (['at-medical', 'reported'].includes(state.phase) && !allAtPost(state)) return invalid;
  return { status: 'valid', state };
}
function recovery(save: ClanShipReturnEscortCampaign) {
  const operations = inspectClanShipOperations(save.clanShipOperations, save.createdAt).state;
  return operations?.completedContracts.find(receipt => receipt.contractId === 'space-recovery' && receipt.proof.kind === 'space' &&
    receipt.proof.encounter.kind === 'recovery' && receipt.proof.encounter.status === 'victory');
}
export function evaluateClanShipReturnEscortCampaign(state: ClanShipReturnEscortState, save: ClanShipReturnEscortCampaign): { allowed: boolean; reason: string } {
  if (inspectClanShipReturnEscort(state, save.createdAt).status !== 'valid' || !evaluateClanShipAccess(save).allowed)
    return { allowed: false, reason: 'Le dossier de retour et le rite Blooded doivent appartenir à cette campagne.' };
  const receipt = recovery(save);
  return receipt?.completedRevision === state.sourceRecoveryRevision ? { allowed: true, reason: 'Le retour correspond à la récupération confirmée.' }
    : { allowed: false, reason: 'Le reçu de récupération spatiale ne correspond pas à cette équipe de retour.' };
}
function presence(save: ClanShipReturnEscortCampaign) {
  return ['threshold-guard', 'black-suture'].every(id => clanShipTrophyWitnessPost(save, id as 'threshold-guard' | 'black-suture'));
}
export function evaluateClanShipReturnEscortOffer(save: ClanShipReturnEscortCampaign): { allowed: boolean; reason: string } {
  if (!evaluateClanShipAccess(save).allowed) return { allowed: false, reason: 'Le rite Blooded doit être reconnu.' };
  if (!recovery(save)) return { allowed: false, reason: 'Termine la récupération « Ramener le signal » avant de préparer ce retour.' };
  return presence(save) ? { allowed: true, reason: 'Garde du Seuil et Suture Noire sont disponibles pour préparer le contrôle du retour.' }
    : { allowed: false, reason: 'Garde du Seuil et Suture Noire doivent être disponibles au Clan Ship. Leurs affectations et accords restent nécessaires.' };
}
export function clanShipReturnEscortTarget(save: ClanShipReturnEscortCampaign, command: ClanShipReturnEscortCommand): ClanShipReturnEscortTarget {
  if (command.type === 'accept') {
    const roomId = clanShipTrophyWitnessPost(save, 'threshold-guard') ?? 'hangar';
    return { roomId, ...ROOMS[roomId].servicePoint, label: 'Préparer le retour avec Garde du Seuil' };
  }
  if (command.type === 'prepare-route') return { roomId: 'hangar', x: 128, y: 635, label: 'Contrôler la voie vers les soins' };
  if (command.type === 'report') return { roomId: 'conseil', ...ROOMS.conseil.servicePoint, label: 'Présenter le relevé du retour' };
  if (command.type === 'confirm-medical') return CLAN_SHIP_RETURN_ESCORT_POSTS[save.clanShipReturnEscort?.post ?? 'medical-bed'];
  if (command.type === 'transfer-room') {
    const from = save.clanShipReturnEscort?.actors[0]?.roomId ?? 'hangar';
    const door = ROOMS[from].doors.find(candidate => candidate.targetRoomId === command.roomId);
    return { roomId: from, ...(door ?? ROOMS[from].servicePoint), label: 'Accompagner toute l’équipe au seuil' };
  }
  return { roomId: 'hangar', ...ROOMS.hangar.servicePoint, label: 'Accompagner l’équipe vers les soins' };
}

/** Same motion and collision solver as the hunter. No wall clock, rewards,
 * recruitment or damage. A long/resumed frame advances at most 50 ms. */
export function stepClanShipReturnEscort(state: ClanShipReturnEscortState, leader: ClanShipReturnEscortObservation,
  seconds: number, active = true): ClanShipReturnEscortState {
  if (!active || state.phase !== 'escorting' || !validObservation(leader) || !Number.isFinite(seconds) || seconds <= 0 ||
      !state.actors.every(actor => actor.roomId === leader.roomId)) return state;
  const dt = Math.min(seconds, METRICS.maxFrameSeconds), next = copy(state);
  next.simulatedSeconds += dt;
  for (let index = 0; index < next.actors.length; index++) {
    const actor = next.actors[index], span = distance(actor, leader);
    if (span > 360) continue; // The player can return to the safely waiting group.
    // Distinct flanks preserve readable feet around the leader. Both are
    // inside the native 64-unit interaction reach at the authored thresholds.
    const target = { x: leader.x + (index === 0 ? -40 : 40), y: leader.y - 40 };
    const destination = isClanShipInteriorWalkable(actor.roomId, target) ? target : leader;
    if (distance(actor, destination) < 1) continue;
    const path = planClanShipInteriorPath(actor.roomId, actor, destination);
    if (!path) continue;
    const stepped = stepClanShipInteriorPath(actor.roomId, actor, path.points.slice(1), dt).actor;
    next.actors[index] = { ...actor, ...stepped };
  }
  return next;
}
function validCommand(action: unknown): action is ClanShipReturnEscortAction {
  if (!plain(action) || !identity(action.ownerCreatedAt) || !integer(action.expectedRevision)) return false;
  const extras = action.type === 'prepare-route' ? ['post'] : action.type === 'advance' ? ['frames'] : action.type === 'transfer-room' ? ['roomId'] : [];
  if (!exact(action, ['type', 'ownerCreatedAt', 'expectedRevision', ...extras])) return false;
  if (['accept', 'start', 'confirm-medical', 'report'].includes(String(action.type))) return true;
  if (action.type === 'prepare-route') return post(action.post);
  if (action.type === 'transfer-room') return room(action.roomId);
  return action.type === 'advance' && Array.isArray(action.frames) && action.frames.length > 0 && action.frames.length <= 120 && action.frames.every(frame =>
    plain(frame) && exact(frame, ['seconds', 'leader']) && Number.isFinite(frame.seconds) && Number(frame.seconds) > 0 &&
    Number(frame.seconds) <= METRICS.maxFrameSeconds && validObservation(frame.leader));
}
export function actClanShipReturnEscort(action: ClanShipReturnEscortAction, context: ClanShipReturnEscortContext): ClanShipReturnEscortResult {
  const { save, observation } = context, inspected = inspectClanShipReturnEscort(save.clanShipReturnEscort, save.createdAt), current = inspected.state;
  const refuse = (message: string): ClanShipReturnEscortResult => ({ accepted: false, changed: false, state: current, message });
  if (inspected.status === 'invalid-save' || inspected.status === 'future-version') return refuse('Le dossier de retour doit être récupéré avant de poursuivre.');
  if (!validCommand(action) || !context.active || action.ownerCreatedAt !== save.createdAt) return refuse('Cette commande exige la scène active de sa propre campagne.');
  if (action.expectedRevision !== (current?.revision ?? 0)) return refuse('Le dossier a changé. Reprends les positions confirmées avant cette action.');
  const docking = save.clanShipDocking;
  if (!docking || docking.ownerCreatedAt !== save.createdAt || docking.status !== 'aboard' || !validObservation(observation) ||
      docking.roomId !== observation.roomId || save.clanShipOperations?.spaceEncounter?.status === 'active') return refuse('Cette action exige ta présence physique à bord, hors engagement spatial.');
  if (current && !evaluateClanShipReturnEscortCampaign(current, save).allowed) return refuse('La récupération d’origine ne correspond plus au retour.');
  if (current?.phase === 'reported') return { accepted: true, changed: false, state: current, message: 'Ce relevé est déjà confirmé, sans nouvelle gratification.' };
  if (!current) {
    if (action.type !== 'accept') return refuse('Prépare d’abord ce retour avec Garde du Seuil.');
    const offer = evaluateClanShipReturnEscortOffer(save);
    if (!offer.allowed) return refuse(offer.reason);
    if (!clanShipReturnEscortInReach(observation, clanShipReturnEscortTarget(save, action))) return refuse('Rejoins Garde du Seuil au poste indiqué.');
    return { accepted: true, changed: true, state: { version: 1, ownerCreatedAt: save.createdAt, revision: 1,
      sourceRecoveryRevision: recovery(save)!.completedRevision, phase: 'accepted', post: null, actors: initialActors(), simulatedSeconds: 0 },
    message: 'L’équipe attend au hangar pour un contrôle de retour, sans blessure déduite du bilan spatial.' };
  }
  if (current.revision >= Number.MAX_SAFE_INTEGER - 1) return refuse('Conserve ce dossier pour récupération avant une nouvelle action.');
  let next = copy(current), dockingState: ClanShipDockingState | undefined;
  if (action.type === 'advance') {
    if (current.phase !== 'escorting' || !current.actors.every(actor => actor.roomId === docking.roomId) ||
        action.frames.some(frame => frame.leader.roomId !== docking.roomId)) return refuse('Rejoins l’équipe avant de reprendre son accompagnement.');
    for (const frame of action.frames) next = stepClanShipReturnEscort(next, frame.leader, frame.seconds);
  } else {
    if (!clanShipReturnEscortInReach(observation, clanShipReturnEscortTarget(save, action))) return refuse('Approche physiquement du poste ou du seuil indiqué.');
    switch (action.type) {
      case 'accept': return { accepted: true, changed: false, state: current, message: 'Le retour est déjà préparé dans ce dossier.' };
      case 'prepare-route':
        if (current.phase !== 'accepted') return refuse('La voie et le poste ont déjà été choisis.');
        if (!current.actors.every(actor => !!planClanShipInteriorPath('hangar', actor, { x: 128, y: 635 }))) return refuse('La voie doit rester réellement praticable.');
        next.phase = 'prepared'; next.post = action.post; break;
      case 'start':
        if (current.phase !== 'prepared' || !presence(save)) return refuse('La voie, le poste et les responsables du retour doivent être disponibles.');
        next.phase = 'escorting'; break;
      case 'transfer-room': {
        if (current.phase !== 'escorting' || current.actors[0].roomId !== 'hangar' || action.roomId !== 'soins' ||
            !canClanShipInteriorTransition(docking.roomId, action.roomId, observation) ||
            !current.actors.every(actor => canClanShipInteriorTransition(actor.roomId, action.roomId, actor)))
          return refuse('Attends toute l’équipe au seuil de la voie vers les soins.');
        const moved = actClanShipDocking(docking, { type: 'move-room', roomId: action.roomId },
          { ownerCreatedAt: save.createdAt, personalShipId: docking.personalShipId });
        if (!moved.accepted) return refuse('Le passage du pont ne peut pas être confirmé.');
        dockingState = moved.state;
        const spawn = clanShipInteriorSpawn('soins', 'hangar');
        next.actors = current.actors.map((actor, index) => ({ ...actor, roomId: 'soins',
          x: spawn.x + (index === 0 ? 20 : 45), y: spawn.y + (index === 0 ? -20 : 20), facing: spawn.facing }));
        break;
      }
      case 'confirm-medical':
        if (current.phase !== 'escorting' || !allAtPost(current) || !presence(save)) return refuse('Accompagne toute l’équipe au poste choisi avec les responsables disponibles.');
        if (clanShipTrophyWitnessPost(save, 'black-suture') !== 'soins') return refuse('Suture Noire doit être présente dans la baie médicale pour confirmer ce contrôle. Le groupe attend sans perdre sa position.');
        next.phase = 'at-medical'; break;
      case 'report':
        if (current.phase !== 'at-medical') return refuse('Le contrôle du groupe doit être confirmé avant le relevé.');
        next.phase = 'reported'; break;
    }
  }
  next.revision = current.revision + 1;
  if (inspectClanShipReturnEscort(next, save.createdAt).status !== 'valid') return refuse('Les positions ne permettent pas de confirmer une reprise sûre.');
  return { accepted: true, changed: true, state: next, ...(dockingState ? { dockingState } : {}),
    message: next.phase === 'reported' ? 'Relevé du retour confirmé au conseil. Aucun soin, rang ou gain supplémentaire attribué.'
      : next.phase === 'at-medical' ? 'L’équipe est arrivée au poste de contrôle. Présente son relevé au conseil.' : 'Positions et prochaine étape du retour enregistrées.' };
}
