import './homeworldStreetCompositionMountV92';
import type { HomeworldVec2 } from './homeworldCity';
import type { HomeworldProgress } from './homeworld';
import { normalizeHomeworldCargoV108, type HomeworldCargoV108 } from './homeworldCargoLedgerV108';
import { homeworldRouteSegmentV109 } from './homeworldNavigationV109';
import { homeworldResidentPlacesV75 } from './homeworldResidentConversationsV75';
import { homeworldResidentOccludedV100 } from './homeworldResidentVisibilityV100';
import { HOMEWORLD_RESIDENTS_V77, HOMEWORLD_WORLD_V77, homeworldResidentPoseV77, type HomeworldLevelV77 } from './homeworldWorldV77';

/** These are the same 98 residents and native routines already drawn by V77.
 * No person, permission, saved visit or quest consequence is created here. */
export type HomeworldResidentContactV110 = typeof HOMEWORLD_RESIDENTS_V77[number];
export interface HomeworldResidentDialogueV110 { id: string; owner: string }
export interface HomeworldResidentContactContextV110 {
  ownerCreatedAt: string;
  currentOwnerCreatedAt: string;
  actor: HomeworldVec2;
  levelId: HomeworldLevelV77;
  seconds: number;
  active: boolean;
  interiorId?: string | null;
  inTransit?: boolean;
  cargo?: HomeworldCargoV108;
}
type KnownPlaces = Pick<HomeworldProgress, 'visitedDistrictIds'>;
const byId = new Map(HOMEWORLD_RESIDENTS_V77.map(resident => [resident.id, resident]));
export const HOMEWORLD_RESIDENT_CONTACT_RADIUS_V110 = 100;

function currentContext(context: HomeworldResidentContactContextV110): boolean {
  return context.active === true && !context.interiorId && !context.inTransit
    && typeof context.ownerCreatedAt === 'string' && context.ownerCreatedAt.length > 0
    && context.ownerCreatedAt === context.currentOwnerCreatedAt
    && [context.actor.x, context.actor.y, context.seconds].every(Number.isFinite)
    && context.seconds >= 0 && context.actor.x >= 0 && context.actor.y >= 0
    && context.actor.x <= HOMEWORLD_WORLD_V77.width && context.actor.y <= HOMEWORLD_WORLD_V77.height;
}

/** Re-evaluate the painted pose, entire physical approach and present cargo
 * for the input event. A nearby hidden body cannot steal a visible prompt. */
export function homeworldResidentContactReachedV110(id: unknown, context: HomeworldResidentContactContextV110): HomeworldResidentContactV110 | null {
  const resident = typeof id === 'string' ? byId.get(id) : undefined;
  if (!resident || !currentContext(context) || resident.levelId !== context.levelId) return null;
  const pose = homeworldResidentPoseV77(resident, context.seconds);
  if (Math.hypot(pose.x - context.actor.x, pose.y - context.actor.y) >= HOMEWORLD_RESIDENT_CONTACT_RADIUS_V110
    || homeworldResidentOccludedV100(resident.levelId, pose)) return null;
  if (context.cargo && (context.cargo.ownerCreatedAt !== context.currentOwnerCreatedAt || !normalizeHomeworldCargoV108(context.cargo))) return null;
  return homeworldRouteSegmentV109(resident.levelId, context.actor, pose, context.cargo) ? resident : null;
}

export function nearestHomeworldResidentContactV110(context: HomeworldResidentContactContextV110): HomeworldResidentContactV110 | null {
  if (!currentContext(context)) return null;
  let best: HomeworldResidentContactV110 | null = null, distance = HOMEWORLD_RESIDENT_CONTACT_RADIUS_V110;
  for (const resident of HOMEWORLD_RESIDENTS_V77) {
    if (resident.levelId !== context.levelId) continue;
    const pose = homeworldResidentPoseV77(resident, context.seconds), next = Math.hypot(pose.x - context.actor.x, pose.y - context.actor.y);
    if (next < distance && homeworldResidentContactReachedV110(resident.id, context)) { best = resident; distance = next; }
  }
  return best;
}

/** Dialogue identity belongs to the save that physically opened it. */
export function homeworldResidentDialogueContactV110(dialogue: HomeworldResidentDialogueV110 | null | undefined, context: HomeworldResidentContactContextV110): HomeworldResidentContactV110 | null {
  return dialogue?.owner === context.ownerCreatedAt ? homeworldResidentContactReachedV110(dialogue.id, context) : null;
}

export function homeworldResidentContactPlacesV110(contact: HomeworldResidentContactV110, progress: KnownPlaces) {
  const resident = byId.get(contact.id);
  return resident && Array.isArray(progress.visitedDistrictIds) && progress.visitedDistrictIds.includes(resident.districtId)
    ? homeworldResidentPlacesV75(resident) : [];
}

/** Only the still-present speaker may recommend one of their known public
 * buildings. Atlas navigation is read-only; no rank, object or access is given. */
export function requestHomeworldResidentLandmarkV110(dialogue: HomeworldResidentDialogueV110 | null | undefined, id: unknown,
  context: HomeworldResidentContactContextV110, progress: KnownPlaces, onLandmark: (id: string) => void): boolean {
  const contact = homeworldResidentDialogueContactV110(dialogue, context);
  if (!contact || typeof id !== 'string' || !homeworldResidentContactPlacesV110(contact, progress).some(place => place.id === id)) return false;
  onLandmark(id);
  return true;
}

/** Bind the opened dialogue object, while keeping live context getters: an
 * old control cannot act on a replacement conversation, even with the same ID.
 * A valid click reads current owner, actor, clock, cargo and discoveries. */
export function createHomeworldResidentLandmarkRequestV110(source: {
  readDialogue(): HomeworldResidentDialogueV110 | null | undefined;
  readContext(): HomeworldResidentContactContextV110;
  readProgress(): KnownPlaces;
  onLandmark(id: string): void;
}) {
  const expected = source.readDialogue();
  return (id: unknown): boolean => expected && source.readDialogue() === expected
    ? requestHomeworldResidentLandmarkV110(expected, id, source.readContext(), source.readProgress(), source.onLandmark) : false;
}
