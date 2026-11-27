import type { HomeworldRegionStateV68 } from './homeworldRegionsV68';
import { TRAINING_YARD_POSTS_O6 as yardPosts } from './originTrainingYardO6';

export const PRACTICE_POSTS_O6 = {
  'listen-novice': { ...yardPosts.threshold, label: 'Écouter la demande du novice',
    report: '« Je voudrais essayer un exercice. Si je perds mon appui, je te le dirai. »' },
  'present-tools': { ...yardPosts.rack, label: 'Présenter les outils au novice',
    report: 'Le novice écarte la corde et prend le bâton court. « Je préfère d’abord sentir le poids. »' },
  'show-footing': { ...yardPosts.aisle, label: 'Montrer le premier appui dans l’allée',
    report: 'Le novice place ses pieds à côté des tiens. Avance avec lui jusqu’au banc.' },
  'steady-novice': { ...yardPosts.support, label: 'Tenir l’appui à l’arrivée du novice',
    report: 'Le novice traverse à ton rythme, pose le bâton un instant sur l’appui et reprend son équilibre.' },
  'return-staff': { ...yardPosts.rack, label: 'Raccompagner le novice pour ranger le bâton',
    report: 'Le novice rend le bâton au râtelier. « Je veux reprendre le même appui la prochaine fois. »' },
} as const;

export type PracticeOrderO6 = keyof typeof PRACTICE_POSTS_O6;
const practiceSteps = Object.keys(PRACTICE_POSTS_O6) as PracticeOrderO6[];

export function isPracticeOrderO6(value: string): value is PracticeOrderO6 {
  return Object.hasOwn(PRACTICE_POSTS_O6, value);
}

export function normalizePracticeO6(value: unknown): PracticeOrderO6[] | null {
  if (!Array.isArray(value) || !value.length || value.length > practiceSteps.length ||
      !Array.from(value).every((order, index) => order === practiceSteps[index])) return null;
  return [...value];
}

const studentStart = { x: 424, y: 413 };
const studentEnd = { x: 223, y: 407 };
const studentAtRack = { x: 522, y: 415 };

export function practiceViewO6(orders: readonly PracticeOrderO6[], region: HomeworldRegionStateV68) {
  const next = practiceSteps[orders.length] ?? null;
  const post = next ? PRACTICE_POSTS_O6[next] : null;
  const actor = region.actor;
  const progress = Math.min(1, Math.max(0, (yardPosts.aisle.x - actor.x) / (yardPosts.aisle.x - yardPosts.support.x)));
  const near = !!post && actor.grounded && Math.hypot(actor.x - post.x, actor.y - post.y) <= 39 &&
    (next !== 'steady-novice' || progress >= .83);
  let student: { x: number; y: number } | null = null;
  if (next === 'listen-novice') student = { x: 433, y: 540 };
  if (next === 'present-tools' || next === 'return-staff') student = studentAtRack;
  if (next === 'show-footing') student = studentStart;
  if (next === 'steady-novice') student = {
    x: studentStart.x + (studentEnd.x - studentStart.x) * progress,
    y: studentStart.y + (studentEnd.y - studentStart.y) * progress,
  };
  return { next, post, near, student, walking: next === 'steady-novice' && actor.grounded && progress > 0 && progress < 1 && Math.abs(actor.vx) > .05,
    hasStaff: orders.includes('present-tools') && !orders.includes('return-staff') };
}
