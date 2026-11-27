import type { HomeworldVec2 } from './homeworldCity';
import { homeworldBuildingDoorwayV64 } from './homeworldGeometryV64';
import { HOMEWORLD_REGIONS_V68, isHomeworldRegionWalkableV68, type HomeworldRegionStateV68 } from './homeworldRegionsV68';
import { TRAINING_YARD_POSTS_O6 as yard } from './originTrainingYardO6';
import { houseBuildingIdV149, houseV149, type ResidenceHouseV149 } from './residenceV149';

export const O6_DEPARTURE_ID = 'STORY5-TR-O6-06';
const CROSSING_TICKS = 42;
const thresholdSide = { x: 325, y: yard.threshold.y };
const insideStudent = { x: 423, y: 540 };

const dialogue = {
  'departure-listen': { label: 'Écouter le novice au seuil',
    line: '« J’aimerais faire le premier pas moi-même. Je me souviens de notre premier appui. »' },
  'departure-advise': { label: 'Donner un conseil au banc',
    line: '« Cherche un appui stable avant de regarder plus loin. Tu peux revenir si le terrain change. »' },
  'departure-defer': { label: 'Lui demander s’il préfère attendre',
    line: '« Je préfère remettre mon départ. Je garde ton conseil. »' },
  'departure-resume': { label: 'Écouter sa décision de reprendre',
    line: '« Je suis prêt aujourd’hui. J’aimerais toujours sortir le premier. »' },
  'departure-let-pass': { label: 'Se mettre de côté et laisser le novice sortir',
    line: 'Le novice franchit le seuil en premier. Suis-le jusqu’au croisement ou reste près du banc pour les suivants.' },
  'departure-stay': { label: 'Rester au banc pour accueillir les suivants',
    line: 'Le novice poursuit son chemin. Tu restes au banc pour accueillir les prochains élèves.' },
  'departure-escort': { label: 'Saluer le novice au croisement',
    line: '« Je poursuis à partir d’ici. Si je ne trouve plus d’appui, je saurai revenir. »' },
} as const;

export type DepartureOrderO6 = keyof typeof dialogue;
export interface DepartureJournalO6 {
  version: 1;
  houseId: string;
  events: DepartureOrderO6[];
  crossing?: { runId: string; tick: number };
}
type DeparturePointO6 = HomeworldVec2 & { order: DepartureOrderO6; label: string; near: boolean };

export function isDepartureOrderO6(order: string): order is DepartureOrderO6 {
  return Object.hasOwn(dialogue, order);
}

export function departureProgressO6(events: readonly DepartureOrderO6[] = []) {
  const last = events.at(-1);
  switch (last) {
    case 'departure-listen': return { stage: 'heard', next: ['departure-advise'] } as const;
    case 'departure-advise': return { stage: 'ready', next: ['departure-let-pass', 'departure-defer'] } as const;
    case 'departure-defer': return { stage: 'deferred', next: ['departure-resume'] } as const;
    case 'departure-resume': return { stage: 'ready', next: ['departure-let-pass'] } as const;
    case 'departure-let-pass': return { stage: 'crossed', next: ['departure-escort', 'departure-stay'] } as const;
    case 'departure-escort': return { stage: 'escorted', next: [] } as const;
    case 'departure-stay': return { stage: 'stayed', next: [] } as const;
    default: return { stage: 'waiting', next: ['departure-listen'] } as const;
  }
}

const record = (raw: unknown): raw is Record<string, unknown> => !!raw && typeof raw === 'object' && !Array.isArray(raw);

export function normalizeDepartureO6(raw: unknown): DepartureJournalO6 | null {
  if (!record(raw) || raw.version !== 1 || typeof raw.houseId !== 'string' || !houseV149(raw.houseId) ||
      !Array.isArray(raw.events) || !raw.events.length || raw.events.length > 6) return null;
  const events: DepartureOrderO6[] = [];
  for (const order of raw.events) {
    if (typeof order !== 'string' || !isDepartureOrderO6(order) ||
        !departureProgressO6(events).next.some(next => next === order)) return null;
    events.push(order);
  }
  if (!events.includes('departure-let-pass')) {
    return Object.keys(raw).length === 3 ? { version: 1, houseId: raw.houseId, events } : null;
  }
  const crossing = raw.crossing;
  if (Object.keys(raw).length !== 4 || !record(crossing) || Object.keys(crossing).length !== 2 ||
      typeof crossing.runId !== 'string' || !crossing.runId.length || crossing.runId.length > 160 ||
      typeof crossing.tick !== 'number' || !Number.isSafeInteger(crossing.tick) || crossing.tick < 0) return null;
  return { version: 1, houseId: raw.houseId, events, crossing: { runId: crossing.runId, tick: crossing.tick } };
}

export function departureOutsideO6(house: ResidenceHouseV149) {
  const building = HOMEWORLD_REGIONS_V68[house.regionId as HomeworldRegionStateV68['regionId']]?.buildings
    .find(candidate => candidate.id === houseBuildingIdV149(house));
  if (!building) return null;
  const door = homeworldBuildingDoorwayV64(building).approach;
  const crossing = [200, 150, 250].map(offset => ({ x: door.x, y: door.y + offset }))
    .find(post => [door, { x: door.x, y: (door.y + post.y) / 2 }, post]
      .every(point => isHomeworldRegionWalkableV68(house.regionId as HomeworldRegionStateV68['regionId'], 'village', point)));
  return crossing ? { door, crossing } : null;
}

export function departureViewO6(house: ResidenceHouseV149, region: HomeworldRegionStateV68,
  log: DepartureJournalO6 | undefined) {
  if (region.regionId !== house.regionId || region.status !== 'walking' || region.pendingFieldEvent || region.zone === 'passage' ||
      (region.zone === 'interior' && region.buildingId !== houseBuildingIdV149(house))) return null;
  const outside = departureOutsideO6(house);
  if (!outside) return null;
  const progress = departureProgressO6(log?.events);
  const resolved = progress.stage === 'escorted' || progress.stage === 'stayed';
  const doorDistance = Math.hypot(region.actor.x - outside.door.x, region.actor.y - outside.door.y);
  if (region.zone === 'village' && ((!resolved && progress.stage !== 'crossed') || doorDistance > 460)) return null;
  const elapsed = log?.crossing?.runId === region.runId ? Math.max(0, region.tick - log.crossing.tick) : CROSSING_TICKS;
  const stillPassing = progress.stage === 'crossed' && elapsed < CROSSING_TICKS;
  const passing = stillPassing && region.zone === 'interior';
  const fledglingProgress = Math.min(1, Math.max(0.24,
    (region.actor.y - outside.door.y + 66) / (outside.crossing.y - outside.door.y)));
  const posts: Record<DepartureOrderO6, HomeworldVec2> = {
    'departure-listen': yard.threshold, 'departure-advise': yard.support,
    'departure-defer': thresholdSide, 'departure-resume': yard.threshold,
    'departure-let-pass': thresholdSide, 'departure-stay': yard.support,
    'departure-escort': outside.crossing,
  };
  const actions: DeparturePointO6[] = progress.next
    .filter(order => order === 'departure-escort' ? region.zone === 'village' : region.zone === 'interior')
    .map(order => {
      const post = posts[order];
      const reach = order === 'departure-escort' ? 48 : 34;
      return { ...post, order, label: dialogue[order].label, near: !stillPassing && region.actor.grounded &&
        Math.hypot(region.actor.x - post.x, region.actor.y - post.y) <= reach };
    });
  let student: HomeworldVec2 | null = null;
  if (passing) {
    const t = elapsed / CROSSING_TICKS;
    student = { x: insideStudent.x + (380 - insideStudent.x) * t, y: insideStudent.y + (641 - insideStudent.y) * t };
  } else if (progress.stage === 'crossed' && region.zone === 'village' &&
      doorDistance < 460) {
    student = { x: outside.door.x + 26 * (1 - fledglingProgress),
      y: outside.door.y + (outside.crossing.y - outside.door.y) * fledglingProgress };
  } else if (!resolved && progress.stage !== 'crossed' && region.zone === 'interior') {
    student = progress.stage === 'heard' ? { x: 228, y: 408 } : insideStudent;
  }
  const last = log?.events.at(-1);
  return { ...progress, resolved, success: resolved, passing, actions, student, walking: passing ||
    (progress.stage === 'crossed' && region.zone === 'village' && fledglingProgress < 1 && Math.abs(region.actor.vy) > .05),
    line: last ? dialogue[last].line : 'Un novice attend au seuil de la demeure.' };
}

export function advanceDepartureO6(house: ResidenceHouseV149, region: HomeworldRegionStateV68,
  before: DepartureJournalO6 | undefined, order: DepartureOrderO6): DepartureJournalO6 | null {
  const view = departureViewO6(house, region, before);
  if (!view?.actions.some(action => action.order === order && action.near)) return null;
  return {
    version: 1, houseId: house.id, events: [...(before?.events ?? []), order],
    ...(order === 'departure-let-pass' ? { crossing: { runId: region.runId, tick: region.tick } } :
      before?.crossing ? { crossing: before.crossing } : {}),
  };
}
