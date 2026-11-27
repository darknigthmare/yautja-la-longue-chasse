import type { ClanShipRoomId } from './clanShipDocking';
import { MEMORY_ROOMS, MEMORY_TRACKS, inspectLongMemory, type MemoryTrack } from './longMemoryR2M055';

export type AncientHearingAudience = 'local' | 'intimate';
export type AncientHearingOrder = 'open-register' | 'read-hunt' | 'read-workshop' | 'hear-armorer' | 'read-teaching'
  | 'choose-local' | 'choose-intimate' | 'reserve-post';
export interface AncientHearingRecord { orders: AncientHearingOrder[] }

type AncientHearingOption = { order: AncientHearingOrder; room: ClanShipRoomId };
export const ANCIENT_HEARING_AUDIENCE = {
  local: { label: 'Présence locale au conseil', room: 'conseil' },
  intimate: { label: 'Rencontre intime aux archives', room: 'archives' },
} as const;

const TRACE_ORDERS = {
  hunt: ['read-hunt'], collective: ['read-workshop', 'hear-armorer'], teaching: ['read-teaching'],
} as const satisfies Record<MemoryTrack, readonly AncientHearingOrder[]>;

const canShow = (orders: readonly AncientHearingOrder[], track: MemoryTrack) =>
  TRACE_ORDERS[track].some(order => orders.includes(order));

export function hasLongMemoryHandover(raw: unknown): boolean {
  return inspectLongMemory(raw) && raw.longMemorySuccess;
}

export function ancientHearingView(orders: readonly AncientHearingOrder[], armorerPresent: boolean) {
  const collected = MEMORY_TRACKS.filter(track => canShow(orders, track));
  const audience: AncientHearingAudience | null = orders.includes('choose-local') ? 'local'
    : orders.includes('choose-intimate') ? 'intimate' : null;
  const ready = orders.at(-1) === 'reserve-post';
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
  return { collected, audience, ready, heardArmorer: orders.includes('hear-armorer'), options };
}

export function inspectAncientHearing(raw: unknown): raw is AncientHearingRecord {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw) || Reflect.ownKeys(raw).length !== 1) return false;
  const { orders } = raw as Partial<AncientHearingRecord>;
  if (!Array.isArray(orders) || orders.length < 1 || orders.length > 6) return false;
  const checked: AncientHearingOrder[] = [];
  for (const order of orders) {
    // An established voice remains in the register if the armorer moves later.
    if (!ancientHearingView(checked, true).options.some(option => option.order === order)) return false;
    checked.push(order);
  }
  return true;
}

export function applyAncientHearing(
  current: AncientHearingRecord | undefined, order: AncientHearingOrder,
  room: ClanShipRoomId, armorerPresent: boolean,
): AncientHearingRecord | null {
  const orders = current?.orders ?? [];
  if (!ancientHearingView(orders, armorerPresent).options.some(option => option.order === order && option.room === room)) return null;
  return { orders: [...orders, order] };
}
