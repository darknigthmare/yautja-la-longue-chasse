export type HuntAnnouncementPriorityV78 = "routine" | "narrative" | "tactical";

export interface HuntAnnouncementV78 {
  text: string;
  priority: HuntAnnouncementPriorityV78;
  remaining: number;
  expiresAt: number;
}

export interface HuntAnnouncementQueueV78 {
  at: number;
  active: HuntAnnouncementV78 | null;
  pending: HuntAnnouncementV78[];
}

const MAX_PENDING = 2;
const NARRATIVE_LIFETIME = 12;
const rank = { routine: 0, narrative: 1, tactical: 2 } as const;

/** Ephemeral presentation data. Never put this queue into a game checkpoint. */
export function createHuntAnnouncementQueueV78(at = 0): HuntAnnouncementQueueV78 {
  return { at, active: null, pending: [] };
}

/** Read the simulation clock; paused hunts/briefings do not age their messages. */
export function advanceHuntAnnouncementQueueV78(
  queue: HuntAnnouncementQueueV78,
  at: number,
): HuntAnnouncementQueueV78 {
  if (!Number.isFinite(at) || at < queue.at) return createHuntAnnouncementQueueV78(Number.isFinite(at) ? at : 0);
  let cursor = queue.at;
  let active = queue.active ? { ...queue.active } : null;
  let pending = queue.pending.map(item => ({ ...item }));
  while (true) {
    pending = pending.filter(item => item.expiresAt > cursor);
    if (!active) active = pending.shift() ?? null;
    if (!active) return { at, active: null, pending: [] };
    const endsAt = Math.min(cursor + active.remaining, active.expiresAt);
    if (at < endsAt) {
      active.remaining -= at - cursor;
      return { at, active, pending: pending.filter(item => item.expiresAt > at) };
    }
    cursor = Math.max(cursor, endsAt);
    active = null;
  }
}

/**
 * Tactical alerts preempt immediately and never wait in a backlog. Narrative
 * beats retain a short FIFO; routine tool feedback cannot displace either.
 */
export function enqueueHuntAnnouncementV78(
  queue: HuntAnnouncementQueueV78,
  text: string,
  seconds: number,
  priority: HuntAnnouncementPriorityV78,
  at: number,
): HuntAnnouncementQueueV78 {
  const current = advanceHuntAnnouncementQueueV78(queue, at);
  if (!text || !Number.isFinite(seconds) || seconds <= 0) return current;
  if (current.active?.text === text || current.pending.some(item => item.text === text)) return current;
  const item: HuntAnnouncementV78 = {
    text,
    priority,
    remaining: Math.min(6, seconds),
    expiresAt: at + (priority === "narrative" ? NARRATIVE_LIFETIME : Math.min(6, seconds)),
  };
  const active = current.active;
  if (!active) return { ...current, active: item };
  if (priority === "routine") {
    return active.priority === "routine" ? { ...current, active: item } : current;
  }
  if (rank[priority] > rank[active.priority] || priority === "tactical") {
    const interrupted = active.priority === "narrative" && active.expiresAt > at ? [active] : [];
    return { ...current, active: item, pending: [...interrupted, ...current.pending].slice(0, MAX_PENDING) };
  }
  const pending = [...current.pending, item];
  return { ...current, pending: pending.slice(-MAX_PENDING) };
}
