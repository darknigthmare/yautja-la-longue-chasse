import type { SaveGame } from '../types';
import type { OriginStateV151 } from './originsV151';
import type { HomeworldRegionStateV68 } from './homeworldRegionsV68';
import { TRAINING_YARD_ORDERS_O6, TRAINING_YARD_POSTS_O6, trainingYardViewO6 } from './originTrainingYardO6';
import { houseV149, type ResidenceContextV149 } from './residenceV149';
import { PRACTICE_POSTS_O6, isPracticeOrderO6, normalizePracticeO6, practiceViewO6, type PracticeOrderO6 } from './originPracticeO6';

const support = TRAINING_YARD_POSTS_O6.support;
const aisle = TRAINING_YARD_POSTS_O6.aisle;
const rack = TRAINING_YARD_POSTS_O6.rack;
const threshold = TRAINING_YARD_POSTS_O6.threshold;

export const CONTINUATION_POSTS_O6 = {
  invite: { ...support, label: 'Proposer à Yena de reprendre le filet', report: 'Tu déposes une invitation pour le filet. Le reste de son atelier lui appartient.' },
  welcome: { ...threshold, label: 'Accueillir Yena au seuil', report: '« Je viens pour le filet et je retourne à mon atelier. Tiens l’appui, je reprendrai les cordes. »' },
  anchor: { ...support, label: 'Tenir l’appui pendant que Yena règle les cordes', report: 'L’appui tient. Yena ajuste le côté gauche comme devant la barrière de la cour.' },
  lift: { ...rack, label: 'Lever le filet sur le râtelier', report: 'Le filet se lève sans tirer sur la corde que Yena tient.' },
  stow: { ...aisle, label: 'Dégager l’allée avec Yena', report: 'Vous repliez les cordes et laissez l’allée libre. Yena emporte sa méthode à l’atelier.' },
  farewell: { ...threshold, label: 'Raccompagner Yena au seuil', report: 'Yena retourne à son atelier. Vous gardez le filet prêt pour la prochaine visite.' },
  teaching: { ...support, label: 'Essayer l’appui de la cour d’enseignement', report: 'L’appui est à bonne hauteur. Le banc et le passage laissent la place à un élève.' },
  circle: { ...aisle, label: 'Vérifier le passage du cercle de chasse', report: 'Le passage central permet au cercle de sortir avec ses outils sans condamner l’accès au banc.' },
  transmission: { ...rack, label: 'Réserver un emplacement pour le coffre de transmission', report: 'Une place est matérialisée près du râtelier. L’ouverture du coffre dépendra de la voie retenue.' },
  'open-rack': { ...rack, label: 'Ouvrir le râtelier de la première leçon', report: 'Les outils d’exercice sont accessibles. La leçon attend encore un élève volontaire.' },
} as const;

type PreparationOrderO6 = keyof typeof CONTINUATION_POSTS_O6;
export type ContinuationOrderO6 = PreparationOrderO6 | PracticeOrderO6;

const visit = ['invite', 'welcome', 'anchor', 'lift', 'stow', 'farewell'] as const;
const plans = ['teaching', 'circle', 'transmission'] as const;

export function continuationOrdersO6(helpedYena: boolean, teachingChosen: boolean): readonly PreparationOrderO6[] {
  return [...(helpedYena ? visit : []), ...plans, ...(teachingChosen ? ['open-rack' as const] : [])];
}

export interface ContinuationRecordO6 {
  version: 1;
  ownerCreatedAt: string;
  houseId: string;
  helpedYena: boolean;
  orders: PreparationOrderO6[];
  practice?: PracticeOrderO6[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export function normalizeContinuationO6(raw: unknown): ContinuationRecordO6 | null {
  if (!isRecord(raw)) return null;
  const practicing = Object.hasOwn(raw, 'practice');
  if (Object.keys(raw).length !== (practicing ? 6 : 5)) return null;
  const { version, ownerCreatedAt, houseId, helpedYena, orders } = raw;
  if (version !== 1 || typeof ownerCreatedAt !== 'string' || !Number.isFinite(Date.parse(ownerCreatedAt)) ||
      typeof houseId !== 'string' || !houseV149(houseId) || typeof helpedYena !== 'boolean' || !Array.isArray(orders)) return null;
  const route = continuationOrdersO6(helpedYena, true);
  if (!orders.length || orders.length > route.length ||
      !Array.from(orders).every((order, index) => order === route[index])) return null;
  const record: ContinuationRecordO6 = { version: 1, ownerCreatedAt, houseId, helpedYena, orders: [...orders] };
  if (practicing) {
    const practice = normalizePracticeO6(raw.practice);
    if (!practice || !orders.includes('open-rack')) return null;
    record.practice = practice;
  }
  return record;
}

type ContinuationSaveO6 = Pick<SaveGame, 'createdAt' | 'originV151' | 'prologue' | 'eliteRecognitionV174' | 'residenceV149'>;

function eliteWitnessed(save: ContinuationSaveO6) {
  return save.prologue?.status === 'completed' &&
    save.prologue.chronicle.rites.some(rite => rite.id === 'elite-recognition') &&
    save.eliteRecognitionV174?.recognized === true && save.eliteRecognitionV174.ownerCreatedAt === save.createdAt;
}

function helpedYenaInCourtyard(save: ContinuationSaveO6) {
  const cohort = save.prologue?.checkpoint.cohortV172;
  return cohort?.steps === 7 && cohort.choice === 'help';
}

function teachingChosen(origin: OriginStateV151) {
  return origin.ending?.endingChoiceConfirmed === true && origin.ending.originEndingId === 'O6-E1' &&
    origin.consumed.includes('O6-M29:confirmed');
}

export function continuationMatchesSaveO6(save: ContinuationSaveO6): boolean {
  const origin = save.originV151;
  const record = origin?.continuationO6;
  if (!record) return true;
  return !!origin && origin.originId === 'O6' && record.ownerCreatedAt === save.createdAt &&
    eliteWitnessed(save) && record.helpedYena === helpedYenaInCourtyard(save) &&
    save.residenceV149?.rights.includes(record.houseId) === true &&
    origin.trainingYardO6?.houses[record.houseId]?.length === TRAINING_YARD_ORDERS_O6.length &&
    (!record.orders.includes('open-rack') || teachingChosen(origin));
}

export function keepsContinuationO6(previous: ContinuationRecordO6 | undefined, next: ContinuationRecordO6 | undefined): boolean {
  if (!previous) return !next || (next.orders.length === 1 && !next.practice);
  if (!next || next.ownerCreatedAt !== previous.ownerCreatedAt || next.houseId !== previous.houseId ||
      next.helpedYena !== previous.helpedYena) return false;
  const beforePractice = previous.practice ?? [];
  const afterPractice = next.practice ?? [];
  const prepared = next.orders.length - previous.orders.length;
  const practiced = afterPractice.length - beforePractice.length;
  return prepared >= 0 && practiced >= 0 && prepared + practiced <= 1 &&
    previous.orders.every((order, index) => order === next.orders[index]) &&
    beforePractice.every((order, index) => order === afterPractice[index]);
}

export function continuationViewO6(
  save: ContinuationSaveO6, origin: OriginStateV151, region: HomeworldRegionStateV68,
  context: Pick<ResidenceContextV149, 'rankId' | 'regionAllowed'>,
  yard = trainingYardViewO6(origin, save.residenceV149, region, context),
) {
  if (!eliteWitnessed(save)) return null;
  if (!yard || yard.next || (origin.continuationO6 && origin.continuationO6.houseId !== yard.houseId)) return null;
  const helpedYena = helpedYenaInCourtyard(save);
  const orders = origin.continuationO6?.orders ?? [];
  const next = continuationOrdersO6(helpedYena, teachingChosen(origin))[orders.length] ?? null;
  const post = next ? CONTINUATION_POSTS_O6[next] : null;
  const near = !!post && region.actor.grounded && Math.hypot(region.actor.x - post.x, region.actor.y - post.y) <= 39;
  const visitor = helpedYena && orders.includes('invite') && !orders.includes('farewell') ? (
    next === 'welcome' || next === 'farewell' ? { x: 425, y: 534 }
      : next === 'anchor' ? { x: 223, y: 407 }
        : next === 'lift' ? { x: 543, y: 401 }
          : { x: 432, y: 425 }
  ) : null;
  const rackOpen = orders.includes('open-rack');
  const practice = rackOpen ? practiceViewO6(origin.continuationO6?.practice ?? [], region) : null;
  return { houseId: yard.houseId, helpedYena, orders, next, post, near, visitor, rackOpen, practice };
}

export function applyContinuationO6(
  save: ContinuationSaveO6, origin: OriginStateV151, region: HomeworldRegionStateV68,
  context: Pick<ResidenceContextV149, 'rankId' | 'regionAllowed'>, order: ContinuationOrderO6,
): { origin: OriginStateV151; report: string } | null {
  const view = continuationViewO6(save, origin, region, context);
  if (isPracticeOrderO6(order)) {
    const record = origin.continuationO6;
    if (!record || !view?.practice?.near || view.practice.next !== order) return null;
    return {
      origin: { ...origin, continuationO6: { ...record, practice: [...(record.practice ?? []), order] } },
      report: PRACTICE_POSTS_O6[order].report,
    };
  }
  if (!view?.near || view.next !== order) return null;
  return {
    origin: { ...origin, continuationO6: { version: 1, ownerCreatedAt: save.createdAt,
      houseId: view.houseId, helpedYena: view.helpedYena, orders: [...view.orders, order] } },
    report: CONTINUATION_POSTS_O6[order].report,
  };
}

export function isContinuationOrderO6(action: string): action is ContinuationOrderO6 {
  return Object.hasOwn(CONTINUATION_POSTS_O6, action) || isPracticeOrderO6(action);
}
