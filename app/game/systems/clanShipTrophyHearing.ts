import type { SaveGame } from '../types';
import type { ClanShipRoomId } from './clanShipDocking';
import type { ClanShipIncidentObservation, ClanShipIncidentTarget } from './clanShipIncidents';
import { CLAN_SHIP_INTERIOR_METRICS, CLAN_SHIP_INTERIOR_ROOMS, isClanShipInteriorWalkable } from './clanShipInterior';
import { CLAN_SHIP_RECRUITS, evaluateClanShipRecruit, inspectClanShipOperations, type ClanShipNpcId } from './clanShipOperations';
import { availableClanResidenceCrew, companionResidencePresence, companionUsesLegacyClanPost, type CompanionCampaign } from './companionResidence';
import { clanShipTrophyConclusion, type ClanShipTrophyVerdict } from './clanShipTrophyCase';

/** Optional C-37 meeting ledger. The V1/V2 maintenance journals keep their
 * original format and old, sequential witness receipts keep their meaning. */
export const CLAN_SHIP_TROPHY_HEARING_VERSION = 1 as const;
export const CLAN_SHIP_TROPHY_WITNESSES = ['ash-scar', 'cold-trace'] as const;
export type ClanShipTrophyWitnessId = typeof CLAN_SHIP_TROPHY_WITNESSES[number];
export const CLAN_SHIP_TROPHY_TELEMETRY = [
  { id: 'hunt-mark', title: 'Avant le portage · B-17', source: 'C-37/01 · relevé de chasse', stage: 0,
    description: 'La base C-37 porte déjà la strie B-17 de Balafre. Aucune ligature T-04 n’est encore présente.', huntMark: true, transferSeal: false },
  { id: 'transfer-seal', title: 'Après le prélèvement · T-04', source: 'C-37/02 · relevé de transfert', stage: 1,
    description: 'Trace fixe la ligature T-04 autour du même C-37 pour le transport. La strie B-17 demeure sous cette attache.', huntMark: true, transferSeal: true },
  { id: 'return-match', title: 'Au retour · deux traces, un objet', source: 'C-37 · comparaison des deux relevés', stage: 2,
    description: 'Le retour identifie le même support C-37 : B-17 décrit le prélèvement ; T-04 décrit son portage ultérieur.', huntMark: true, transferSeal: true },
] as const;
export type ClanShipTrophySampleId = typeof CLAN_SHIP_TROPHY_TELEMETRY[number]['id'];
export const CLAN_SHIP_TROPHY_HEARING_TARGET: ClanShipIncidentTarget = {
  id: 'trophy-support', roomId: 'trophees', x: 830, y: 650, label: 'Restitution commune du dossier C-37',
};
export type ClanShipTrophyHearingCampaign = CompanionCampaign & Pick<SaveGame, 'clanShipIncidents' | 'clanShipTrophyHearing'>;
export type ClanShipTrophyHearingCommand = { type: 'invite'; witnessId: ClanShipTrophyWitnessId } |
  { type: 'record-sample'; sampleId: ClanShipTrophySampleId };
export type ClanShipTrophyHearingAction = ClanShipTrophyHearingCommand & { ownerCreatedAt: string; expectedRevision: number };
interface HearingEventBase { revision: number; incidentRevision: number; observation: ClanShipIncidentObservation }
export type ClanShipTrophyHearingEvent = HearingEventBase & (ClanShipTrophyHearingCommand |
  { type: 'conclude' | 'acknowledge'; conclusion: ClanShipTrophyVerdict; witnessIds: [ClanShipTrophyWitnessId, ClanShipTrophyWitnessId] });
export interface ClanShipTrophyHearingState {
  version: typeof CLAN_SHIP_TROPHY_HEARING_VERSION; ownerCreatedAt: string; revision: number; events: ClanShipTrophyHearingEvent[];
}
export interface ClanShipTrophyHearingView {
  invitedWitnessIds: ClanShipTrophyWitnessId[]; recordedSampleIds: ClanShipTrophySampleId[];
  gathered: boolean; ready: boolean; concluded: boolean; completed: boolean; conclusion: ClanShipTrophyVerdict | null;
}
export interface ClanShipTrophyHearingResult {
  accepted: boolean; changed: boolean; state: ClanShipTrophyHearingState | null; message: string;
}
const plain = (raw: unknown): raw is Record<string, unknown> => !!raw && typeof raw === 'object' && !Array.isArray(raw) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(raw)) && Reflect.ownKeys(raw).every(key => typeof key === 'string' &&
    Object.getOwnPropertyDescriptor(raw, key)?.enumerable && 'value' in Object.getOwnPropertyDescriptor(raw, key)!);
const exact = (raw: Record<string, unknown>, keys: readonly string[]) => Reflect.ownKeys(raw).length === keys.length && keys.every(key => Object.hasOwn(raw, key));
const integer = (raw: unknown): raw is number => Number.isSafeInteger(raw) && Number(raw) >= 0 && Number(raw) < Number.MAX_SAFE_INTEGER;
const identity = (raw: unknown): raw is string => typeof raw === 'string' && raw.length > 0 && raw.length <= 160 && raw.trim() === raw && !/[\x00-\x1f\x7f]/.test(raw);
const witness = (raw: unknown): raw is ClanShipTrophyWitnessId => CLAN_SHIP_TROPHY_WITNESSES.includes(raw as ClanShipTrophyWitnessId);
const sample = (raw: unknown): raw is ClanShipTrophySampleId => CLAN_SHIP_TROPHY_TELEMETRY.some(entry => entry.id === raw);
const sameWitnesses = (raw: unknown) => Array.isArray(raw) && raw.length === 2 && raw.every((id, index) => id === CLAN_SHIP_TROPHY_WITNESSES[index]);

export function clanShipTrophyHearingView(state: ClanShipTrophyHearingState | null | undefined): ClanShipTrophyHearingView {
  const events = state?.events ?? [];
  const invitedWitnessIds = events.flatMap(event => event.type === 'invite' ? [event.witnessId] : []);
  const recordedSampleIds = events.flatMap(event => event.type === 'record-sample' ? [event.sampleId] : []);
  const conclusion = events.find(event => event.type === 'conclude');
  return { invitedWitnessIds, recordedSampleIds, gathered: invitedWitnessIds.length === 2,
    ready: recordedSampleIds.length === 3, concluded: !!conclusion,
    completed: events.some(event => event.type === 'acknowledge'),
    conclusion: conclusion?.type === 'conclude' ? conclusion.conclusion : null };
}

export function clanShipTrophyHearingInReach(observation: ClanShipIncidentObservation | null, target = CLAN_SHIP_TROPHY_HEARING_TARGET): boolean {
  return !!observation && observation.roomId === target.roomId && Number.isFinite(observation.x) && Number.isFinite(observation.y) &&
    isClanShipInteriorWalkable(target.roomId, observation) && Math.hypot(observation.x - target.x, observation.y - target.y) <= CLAN_SHIP_INTERIOR_METRICS.interactionReach;
}

/** Only recorded meeting facts are checked here. Current residence cannot erase
 * a real invitation or a past testimony after the member changes assignment. */
export function inspectClanShipTrophyHearing(raw: unknown, ownerCreatedAt: string): {
  status: 'absent' | 'valid' | 'future-version' | 'invalid-save'; state: ClanShipTrophyHearingState | null;
} {
  if (raw === null || raw === undefined) return { status: 'absent', state: null };
  if (plain(raw) && integer(raw.version) && raw.version > CLAN_SHIP_TROPHY_HEARING_VERSION) return { status: 'future-version', state: null };
  const invalid = { status: 'invalid-save' as const, state: null };
  if (!plain(raw) || !exact(raw, ['version', 'ownerCreatedAt', 'revision', 'events']) || raw.version !== CLAN_SHIP_TROPHY_HEARING_VERSION ||
      !identity(ownerCreatedAt) || raw.ownerCreatedAt !== ownerCreatedAt || !integer(raw.revision) || raw.revision < 1 || raw.revision > 7 ||
      !Array.isArray(raw.events) || raw.events.length !== raw.revision) return invalid;
  const state: ClanShipTrophyHearingState = { version: CLAN_SHIP_TROPHY_HEARING_VERSION, ownerCreatedAt, revision: raw.revision, events: [] };
  let incidentRevision = 0;
  for (const event of raw.events) {
    if (!plain(event)) return invalid;
    const final = event.type === 'conclude' || event.type === 'acknowledge';
    if (!['invite', 'record-sample', 'conclude', 'acknowledge'].includes(String(event.type)) ||
        !exact(event, ['revision', 'incidentRevision', 'observation', 'type', ...(event.type === 'invite' ? ['witnessId'] : event.type === 'record-sample' ? ['sampleId'] : ['conclusion', 'witnessIds'])]) ||
        event.revision !== state.events.length + 1 || !integer(event.incidentRevision) || event.incidentRevision < 1 ||
        event.incidentRevision < incidentRevision || final && event.incidentRevision <= incidentRevision ||
        !plain(event.observation) || !exact(event.observation, ['roomId', 'x', 'y'])) return invalid;
    const view = clanShipTrophyHearingView(state), observation = event.observation as unknown as ClanShipIncidentObservation;
    if (event.type === 'invite') {
      if (!witness(event.witnessId) || view.gathered || event.witnessId !== CLAN_SHIP_TROPHY_WITNESSES[view.invitedWitnessIds.length] ||
          typeof observation.roomId !== 'string' || !Object.hasOwn(CLAN_SHIP_INTERIOR_ROOMS, observation.roomId)) return invalid;
      const room = CLAN_SHIP_INTERIOR_ROOMS[observation.roomId];
      if (!clanShipTrophyHearingInReach(observation, { ...CLAN_SHIP_TROPHY_HEARING_TARGET, roomId: room.id, ...room.servicePoint })) return invalid;
    } else {
      if (!view.gathered || !clanShipTrophyHearingInReach(observation) || view.completed) return invalid;
      if (event.type === 'record-sample') {
        if (!sample(event.sampleId) || view.concluded || event.sampleId !== CLAN_SHIP_TROPHY_TELEMETRY[view.recordedSampleIds.length]?.id) return invalid;
      } else {
        const choice = clanShipTrophyConclusion(event.conclusion);
        if (!view.ready || !sameWitnesses(event.witnessIds) || !choice || !('plaque' in choice) ||
            event.type === 'conclude' && view.concluded || event.type === 'acknowledge' && (!view.concluded || view.conclusion !== event.conclusion)) return invalid;
      }
    }
    incidentRevision = event.incidentRevision;
    state.events.push(JSON.parse(JSON.stringify(event)) as ClanShipTrophyHearingEvent);
  }
  return { status: 'valid', state };
}

/** Shared by the historical incident route and the meeting. An eligible
 * interview is not a recruitment, and a managed resident must really be aboard. */
export function clanShipTrophyWitnessPost(save: ClanShipTrophyHearingCampaign, npcId: ClanShipNpcId): ClanShipRoomId | null {
  const operations = inspectClanShipOperations(save.clanShipOperations, save.createdAt).state;
  if (!operations) return null;
  const npc = CLAN_SHIP_RECRUITS.find(entry => entry.id === npcId);
  if (!npc) return null;
  if (companionUsesLegacyClanPost(save, npcId)) return operations.recruitedNpcIds.includes(npcId)
    ? availableClanResidenceCrew(save).includes(npcId) ? npc.roomId : null
    : evaluateClanShipRecruit(operations, npcId).allowed ? npc.roomId : null;
  const resident = companionResidencePresence(save, { kind: 'clan', shipId: 'avp-predator-mothership' })
    .find(entry => entry.id === npcId && entry.avatarVisible && entry.serviceAvailable);
  return resident && Object.hasOwn(CLAN_SHIP_INTERIOR_ROOMS, resident.avatarRoomId) ? resident.avatarRoomId as ClanShipRoomId : null;
}

export function clanShipTrophyHearingPresence(save: ClanShipTrophyHearingCampaign): { allowed: boolean; reason: string } {
  const absent = CLAN_SHIP_TROPHY_WITNESSES.filter(id => !clanShipTrophyWitnessPost(save, id));
  return absent.length ? { allowed: false, reason: `${absent.map(id => CLAN_SHIP_RECRUITS.find(npc => npc.id === id)!.name).join(' et ')} doit être présent et disponible au Clan Ship. Une réserve, des soins ou une autre affectation ne valent pas un témoignage.` }
    : { allowed: true, reason: 'Balafre de Cendre et Trace Froide sont disponibles pour la restitution commune.' };
}

/** A promised meeting uses a disclosed scene ellipse, not a simulated walk.
 * Quarters remain installed; the presentation layer hides only duplicate actors. */
export function isClanShipTrophyWitnessGathered(save: ClanShipTrophyHearingCampaign, npcId: string): boolean {
  if (!witness(npcId)) return false;
  const state = inspectClanShipTrophyHearing(save.clanShipTrophyHearing, save.createdAt).state;
  const view = clanShipTrophyHearingView(state);
  return view.gathered && !view.completed && !!clanShipTrophyWitnessPost(save, npcId);
}

export function clanShipTrophyHearingTarget(save: ClanShipTrophyHearingCampaign, command: ClanShipTrophyHearingCommand): ClanShipIncidentTarget {
  if (command.type === 'record-sample') return CLAN_SHIP_TROPHY_HEARING_TARGET;
  const npc = CLAN_SHIP_RECRUITS.find(entry => entry.id === command.witnessId)!;
  const roomId = clanShipTrophyWitnessPost(save, command.witnessId) ?? npc.roomId;
  return { id: command.witnessId === 'ash-scar' ? 'trophy-veteran' : 'trophy-briefing', roomId,
    ...CLAN_SHIP_INTERIOR_ROOMS[roomId].servicePoint, label: `Inviter ${npc.name} à la galerie` };
}

/** Presentation hint only. The action wrapper validates the complete incident
 * replay before the reducer can record any of these steps. */
export function clanShipTrophyHearingNext(save: ClanShipTrophyHearingCampaign): {
  command: ClanShipTrophyHearingCommand; label: string; target: ClanShipIncidentTarget;
} | null {
  const inspected = inspectClanShipTrophyHearing(save.clanShipTrophyHearing, save.createdAt);
  if (inspected.status === 'future-version' || inspected.status === 'invalid-save') return null;
  const view = clanShipTrophyHearingView(inspected.state);
  const events = save.clanShipIncidents?.incidents.find(run => run.id === 'contested-trophy')?.events ?? [];
  if (view.completed || events.some(event => event.type === 'acknowledge-provenance') ||
      !['examine-trophy', 'read-hunt-report', 'read-transfer-record', 'hear-veteran'].every(type => events.some(event => event.type === type))) return null;
  if (!inspected.state && events.some(event => event.type === 'conclude-provenance' && event.conclusion &&
      ['hunt-attribution', 'paired-roles'].includes(event.conclusion))) return null;
  let reviewRequired: 'read-hunt-report' | 'read-transfer-record' | null = null;
  for (const event of events) {
    const choice = event.type === 'conclude-provenance' ? clanShipTrophyConclusion(event.conclusion) : null;
    if (choice && 'review' in choice) reviewRequired = choice.review === 'hunt-report' ? 'read-hunt-report' : 'read-transfer-record';
    else if (event.type === reviewRequired) reviewRequired = null;
  }
  if (reviewRequired) return null;
  const command: ClanShipTrophyHearingCommand | null = !view.gathered ? { type: 'invite', witnessId: CLAN_SHIP_TROPHY_WITNESSES[view.invitedWitnessIds.length] }
    : !view.ready ? { type: 'record-sample', sampleId: CLAN_SHIP_TROPHY_TELEMETRY[view.recordedSampleIds.length].id } : null;
  if (!command) return null;
  const target = clanShipTrophyHearingTarget(save, command);
  return { command, target, label: command.type === 'invite' ? target.label
    : `Consigner : ${CLAN_SHIP_TROPHY_TELEMETRY.find(entry => entry.id === command.sampleId)!.title}` };
}

/** Called only after the incident adapter validates its own V1/V2 ledger. */
export function reduceClanShipTrophyHearing(action: ClanShipTrophyHearingAction, context: {
  save: ClanShipTrophyHearingCampaign; active: boolean; observation: ClanShipIncidentObservation | null;
  incidentRevision: number; evidenceReady: boolean; caseConcluded: boolean; caseCompleted: boolean;
}): ClanShipTrophyHearingResult {
  const { save, observation } = context, inspected = inspectClanShipTrophyHearing(save.clanShipTrophyHearing, save.createdAt), state = inspected.state;
  const refuse = (message: string): ClanShipTrophyHearingResult => ({ accepted: false, changed: false, state, message });
  if (inspected.status === 'invalid-save' || inspected.status === 'future-version') return refuse('Le journal de la restitution doit être récupéré avant de poursuivre.');
  if (!plain(action) || !exact(action, ['type', 'ownerCreatedAt', 'expectedRevision', ...(action.type === 'invite' ? ['witnessId'] : ['sampleId'])]) ||
      !['invite', 'record-sample'].includes(action.type) || !identity(action.ownerCreatedAt) || action.ownerCreatedAt !== save.createdAt ||
      !integer(action.expectedRevision) || action.expectedRevision !== (state?.revision ?? 0) ||
      action.type === 'invite' && !witness(action.witnessId) || action.type === 'record-sample' && !sample(action.sampleId))
    return refuse('La restitution ou sa révision a changé. Relis le dossier avant de confirmer.');
  const docking = save.clanShipDocking;
  if (!context.active || !docking || docking.status !== 'aboard' || docking.ownerCreatedAt !== save.createdAt ||
      docking.roomId !== observation?.roomId || save.clanShipOperations?.spaceEncounter?.status === 'active') return refuse('Rejoins le Clan Ship actif et termine l’engagement avant cette restitution.');
  if (!context.evidenceReady) return refuse('Examine C-37, compare les deux relevés et écoute Balafre avant de préparer la restitution.');
  if (context.caseCompleted || !state && context.caseConcluded) return refuse('La décision historique est conservée. Elle n’est pas réécrite comme une nouvelle audience.');
  const view = clanShipTrophyHearingView(state), target = clanShipTrophyHearingTarget(save, action);
  if (!clanShipTrophyHearingInReach(observation, target)) return refuse('Approche physiquement le témoin ou le support C-37 dans la salle indiquée.');
  if (action.type === 'invite') {
    if (!clanShipTrophyWitnessPost(save, action.witnessId)) return refuse('Ce témoin doit être présent et disponible à son poste réel du Clan Ship.');
    if (view.invitedWitnessIds.includes(action.witnessId)) return { accepted: true, changed: false, state, message: 'Cette invitation est déjà consignée.' };
    if (action.witnessId !== CLAN_SHIP_TROPHY_WITNESSES[view.invitedWitnessIds.length]) return refuse('Propose d’abord la réunion à Balafre, puis confirme son rendez-vous avec Trace Froide.');
  } else {
    if (!view.gathered) return refuse('Les deux invitations physiques sont nécessaires avant de comparer les échantillons ensemble.');
    const presence = clanShipTrophyHearingPresence(save);
    if (!presence.allowed) return refuse(presence.reason);
    if (view.recordedSampleIds.includes(action.sampleId)) return { accepted: true, changed: false, state, message: 'Cet échantillon enregistré est déjà consigné au dossier.' };
    if (view.concluded || action.sampleId !== CLAN_SHIP_TROPHY_TELEMETRY[view.recordedSampleIds.length]?.id)
      return refuse('Compare les échantillons dans leur ordre : prélèvement, portage, puis identité au retour.');
  }
  const event: ClanShipTrophyHearingEvent = { ...(action.type === 'invite' ? { type: action.type, witnessId: action.witnessId }
    : { type: action.type, sampleId: action.sampleId }), revision: (state?.revision ?? 0) + 1,
    incidentRevision: context.incidentRevision, observation: { ...observation! } };
  const next: ClanShipTrophyHearingState = { version: CLAN_SHIP_TROPHY_HEARING_VERSION, ownerCreatedAt: save.createdAt,
    revision: event.revision, events: [...(state?.events ?? []), event] };
  return { accepted: true, changed: true, state: next, message: action.type === 'invite'
    ? action.witnessId === 'ash-scar' ? 'Balafre accepte le rendez-vous. Va confirmer cette restitution avec Trace Froide à son poste.'
      : 'Trace confirme. Ils achèvent leurs préparatifs et t’attendent devant C-37 dans la galerie.'
    : `${CLAN_SHIP_TROPHY_TELEMETRY.find(entry => entry.id === action.sampleId)!.title} : comparaison enregistrée en présence des deux témoins.` };
}

/** The incident conclusion and this attendance receipt are persisted together
 * by the existing campaign transaction; there is no second reward owner. */
export function recordClanShipTrophyHearingDecision(state: ClanShipTrophyHearingState, type: 'conclude' | 'acknowledge',
  conclusion: ClanShipTrophyVerdict, incidentRevision: number, observation: ClanShipIncidentObservation): ClanShipTrophyHearingState {
  const next = { ...state, revision: state.revision + 1, events: [...state.events, { type, conclusion,
    witnessIds: [...CLAN_SHIP_TROPHY_WITNESSES] as [ClanShipTrophyWitnessId, ClanShipTrophyWitnessId],
    revision: state.revision + 1, incidentRevision, observation: { ...observation } }] };
  return next;
}
