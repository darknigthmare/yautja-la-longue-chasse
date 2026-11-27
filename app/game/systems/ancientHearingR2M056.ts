import { getChronicleRank } from './clanChronicle';
import type { ClanShipRoomId } from './clanShipDocking';
import { MEMORY_ROOMS, MEMORY_TRACKS, inspectLongMemory, type MemoryTrack } from './longMemoryR2M055';

export type AncientHearingAudience = 'local' | 'intimate';
export type AncientHearingOrder = 'open-register' | 'read-hunt' | 'read-workshop' | 'hear-armorer' | 'read-teaching'
  | 'choose-local' | 'choose-intimate' | 'reserve-post'
  | typeof ANCIENT_DEBT_POSTS[number]['order'] | typeof ANCIENT_SERVICE_POSTS[number]['order'] | 'recognize';
export interface AncientHearingRecord { orders: AncientHearingOrder[] }

type AncientHearingOption = { order: AncientHearingOrder; room: ClanShipRoomId };
export const ANCIENT_HEARING_AUDIENCE = {
  local: { label: 'Présence locale au conseil', room: 'conseil' },
  intimate: { label: 'Rencontre intime aux archives', room: 'archives' },
} as const;

export const ANCIENT_DEBT_POSTS = [
  { order: 'recover-debt', room: 'archives', label: 'Ouvrir le registre de l’ancien passage d’Oseris-IV' },
  { order: 'prepare-aid', room: 'armurerie', label: 'Préparer les appuis de relève avec le registre d’atelier' },
  { order: 'deliver-aid', room: 'hangar', label: 'Remettre les appuis et le plan à la garde du passage' },
] as const;

export const ANCIENT_SERVICE_POSTS = [
  { order: 'first-relief', room: 'conseil', years: 100, label: 'Revenir à la première relève' },
  { order: 'review-crossing', room: 'hangar', years: 0, label: 'Contrôler la fiche de passage tenue par la garde' },
  { order: 'second-relief', room: 'archives', years: 125, label: 'Ouvrir le registre de la deuxième relève' },
  { order: 'review-teaching', room: 'armurerie', years: 0, label: 'Contrôler ce que la relève a transmis à son tour' },
  { order: 'third-relief', room: 'conseil', years: 100, label: 'Entendre la dernière relève' },
] as const;

export function hasElderChronicleRank(chronicle: unknown): boolean {
  const rank = getChronicleRank(chronicle);
  return rank === 'elder' || rank === 'ancient';
}

const TRACE_ORDERS = {
  hunt: ['read-hunt'], collective: ['read-workshop', 'hear-armorer'], teaching: ['read-teaching'],
} as const satisfies Record<MemoryTrack, readonly AncientHearingOrder[]>;

const canShow = (orders: readonly AncientHearingOrder[], track: MemoryTrack) =>
  TRACE_ORDERS[track].some(order => orders.includes(order));

export function hasLongMemoryHandover(raw: unknown): boolean {
  return inspectLongMemory(raw) && raw.longMemorySuccess;
}

export function ancientHearingView(orders: readonly AncientHearingOrder[], armorerPresent: boolean, narrativeElder = false) {
  const collected = MEMORY_TRACKS.filter(track => canShow(orders, track));
  const audience: AncientHearingAudience | null = orders.includes('choose-local') ? 'local'
    : orders.includes('choose-intimate') ? 'intimate' : null;
  const ready = orders.includes('reserve-post');
  const debtSettled = orders.includes('deliver-aid');
  const years = ANCIENT_SERVICE_POSTS.filter(post => orders.includes(post.order)).reduce((total, post) => total + post.years, 0);
  const recognized = orders.at(-1) === 'recognize';
  let options: AncientHearingOption[] = [];
  if (!orders.length) options = [{ order: 'open-register', room: 'archives' }];
  else if (collected.length < MEMORY_TRACKS.length) {
    options = MEMORY_TRACKS.filter(track => !collected.includes(track)).flatMap(track =>
      TRACE_ORDERS[track].filter(order => order !== 'hear-armorer' || armorerPresent)
        .map(order => ({ order, room: MEMORY_ROOMS[track] })));
  } else if (!audience) {
    options = [{ order: 'choose-local', room: 'archives' }, { order: 'choose-intimate', room: 'archives' }];
  } else if (!ready) {
    options = [{ order: 'reserve-post', room: ANCIENT_HEARING_AUDIENCE[audience].room }];
  }
  if (ready && !recognized) {
    const debt = ANCIENT_DEBT_POSTS.find(post => !orders.includes(post.order));
    const relief = ANCIENT_SERVICE_POSTS.find(post => !orders.includes(post.order));
    if (debt) options = [{ order: debt.order, room: debt.room }];
    else if (narrativeElder && relief) options = [{ order: relief.order, room: relief.room }];
    else if (narrativeElder && audience) options = [{ order: 'recognize', room: ANCIENT_HEARING_AUDIENCE[audience].room }];
  }
  return { collected, audience, ready, debtSettled, years, recognized, heardArmorer: orders.includes('hear-armorer'), options };
}

export function inspectAncientHearing(raw: unknown): raw is AncientHearingRecord {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw) || Reflect.ownKeys(raw).length !== 1) return false;
  const { orders } = raw as Partial<AncientHearingRecord>;
  if (!Array.isArray(orders) || orders.length < 1 || orders.length > 7 + ANCIENT_DEBT_POSTS.length + ANCIENT_SERVICE_POSTS.length) return false;
  const checked: AncientHearingOrder[] = [];
  for (const order of orders) {
    // An established voice remains in the register if the armorer moves later.
    if (!ancientHearingView(checked, true, true).options.some(option => option.order === order)) return false;
    checked.push(order);
  }
  return true;
}

export function applyAncientHearing(
  current: AncientHearingRecord | undefined, order: AncientHearingOrder,
  room: ClanShipRoomId, armorerPresent: boolean, narrativeElder = false,
): AncientHearingRecord | null {
  const orders = current?.orders ?? [];
  if (!ancientHearingView(orders, armorerPresent, narrativeElder).options.some(option => option.order === order && option.room === room)) return null;
  return { orders: [...orders, order] };
}

export function ancientHearingRecognized(record: AncientHearingRecord | null | undefined): boolean {
  return inspectAncientHearing(record) && record.orders.at(-1) === 'recognize';
}

export function ancientHearingNeedsNarrativeElder(record: AncientHearingRecord): boolean {
  return record.orders.includes('first-relief');
}

export function ancientHearingSaveSuccessor(previous: AncientHearingRecord | undefined, next: AncientHearingRecord | undefined): boolean {
  const before = previous?.orders ?? [];
  const after = next?.orders ?? [];
  return (after.length === before.length || after.length === before.length + 1) &&
    before.every((order, index) => after[index] === order);
}
