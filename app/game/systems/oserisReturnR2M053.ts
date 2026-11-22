import type { SaveGame } from '../types';
import { getChronicleRank } from './clanChronicle';
import { elderAssemblyProofs, inspectElderAssembly } from './elderAssemblyV168';
import { worldBlueprintFor } from './worldBlueprints';

const missionId = 'jungle-vey';
const world = worldBlueprintFor(missionId);
const trench = world.hazards.find(item => item.id === 'j-flood-pulse')!;
const canopy = world.platforms.find(item => item.id === 'j-crown-03')!;
const escape = world.platforms.find(item => item.id === 'j-flood-exit')!;
const vine = world.climbables.find(item => item.id === 'j-vine-east')!;

export const OSERIS_RETURN_TERRAIN_R2_M053 = {
  viewStart: trench.x - 300, viewEnd: escape.x + escape.width + 70, height: world.height,
  floorY: world.floorY, trench, canopy, escape, vine, background: '/game/backgrounds/jungle-depth-v4.webp',
};

const PLACES = {
  landing: { x: trench.x - 225, y: world.floorY, label: 'Débarquement ouest' },
  trench: { x: trench.x - 45, y: world.floorY, label: 'Rive de la tranchée' },
  ladder: { x: canopy.x + 25, y: canopy.y, label: 'Appui de la ramure' },
  canopy: { x: vine.dismounts[1].x, y: canopy.y, label: 'Couronne est' },
  east: { x: escape.x + escape.width - 35, y: world.floorY, label: 'Rive est' },
} as const;
type OserisReturnPlace = keyof typeof PLACES;

const ARRIVAL = [
  ['land', 'Débarquer à Oseris-IV'],
  ['approach', 'Longer l’ancien camp jusqu’à la tranchée'],
  ['compare', 'Comparer le relevé d’origine au terrain'],
] as const;
const CHOICES = [
  ['maintain', 'Entretenir le passage de rive'],
  ['adapt', 'Adopter la voie de la canopée'],
] as const;
const MAINTAIN = [
  ['place-markers', 'Fixer les jalons sur les appuis de rive'],
  ['cross-river', 'Tester le passage entre les jalons'],
] as const;
const ADAPT = [
  ['climb-bank', 'Monter par l’appui dégagé'],
  ['follow-canopy', 'Traverser la couronne est'],
  ['descend-east', 'Descendre sur la rive est'],
] as const;
const RETURN = ['return', 'Déposer le nouveau relevé au hangar'] as const;

export type OserisReturnOrder =
  | typeof ARRIVAL[number][0] | typeof CHOICES[number][0] | typeof MAINTAIN[number][0] | typeof ADAPT[number][0] | typeof RETURN[0];
type OserisOption = readonly [OserisReturnOrder, string];
export interface OserisReturnRecord {
  priorCompletions: number;
  orders: OserisReturnOrder[];
  returnedWorldCompared: boolean;
}
type HuntProgress = SaveGame['missionProgress'];
export interface OserisReturnCampaign extends Pick<SaveGame,
  'createdAt' | 'elderAssemblyV168' | 'elderMentoringV168' | 'elderPassageJudgmentV168'> {
  prologue?: { status?: string; chronicle: unknown } | null;
  missionProgress: unknown;
}

export function oserisReturnPriorHunts(progress: unknown): number {
  if (!progress || typeof progress !== 'object' || !Object.hasOwn(progress, missionId)) return 0;
  const hunt = (progress as HuntProgress)[missionId];
  return hunt?.status === 'completed' && Number.isSafeInteger(hunt.completions) && hunt.completions > 0 ? hunt.completions : 0;
}

export function oserisReturnAvailable(save: OserisReturnCampaign): boolean {
  if (oserisReturnPriorHunts(save.missionProgress) < 1 ||
      (save.prologue && save.prologue.status !== 'completed')) return false;
  const rank = save.prologue ? getChronicleRank(save.prologue.chronicle) : null;
  if (rank === 'elder' || rank === 'ancient') return true;
  const assembly = inspectElderAssembly(save.elderAssemblyV168, save.createdAt).state;
  if (!assembly?.responsibility) return false;
  const witnesses = elderAssemblyProofs(save);
  return witnesses.mentoring && witnesses.judgment;
}

const FIELDS: Partial<Record<OserisReturnOrder, OserisReturnPlace>> = {
  land: 'landing', approach: 'trench', compare: 'trench', maintain: 'trench', adapt: 'trench',
  'place-markers': 'trench', 'cross-river': 'east', 'climb-bank': 'ladder', 'follow-canopy': 'canopy',
  'descend-east': 'east', return: 'east',
};
const NOTES: Partial<Record<OserisReturnOrder, string>> = {
  land: 'L’ancien camp de Vey est vide. Depuis les dernières pluies, la tranchée ne se vide plus entre les crues.',
  approach: 'Le trajet bas du premier relevé passe sous l’eau. La couronne est reste au-dessus du courant.',
  compare: 'Le trait discontinu montre le trajet du premier relevé. Tu peux baliser les appuis de rive qui émergent ou relever le passage établi dans la canopée.',
  maintain: 'Les dalles près de la rive portent encore. Les jalons permettront de les retrouver sous les embruns.',
  adapt: 'Une liane dégagée par le courant donne accès à la couronne. La tranchée reste évitée.',
  'place-markers': 'Les deux jalons sont fixés. Traverse le passage de rive avant de le déclarer praticable.',
  'cross-river': 'Les deux appuis tiennent. Les jalons resteront visibles depuis la rive.',
  'climb-bank': 'L’appui de la ramure donne accès à la couronne est.',
  'follow-canopy': 'La couronne porte jusqu’à la lèvre rocheuse. La dernière descente mène au-dessus du courant.',
  'descend-east': 'La rive est est accessible par la canopée. Le nouveau relevé note l’accès et la descente.',
  return: 'Les deux relevés ont été consignés au hangar.',
};

export function oserisReturnView(orders: readonly OserisReturnOrder[]) {
  const last = orders.at(-1);
  const choice = orders[ARRIVAL.length] as typeof CHOICES[number][0] | undefined;
  const route = choice === 'maintain' ? MAINTAIN : ADAPT;
  const branchStep = orders.length - ARRIVAL.length - 1;
  const complete = last === RETURN[0];
  const options: readonly OserisOption[] = complete ? [] :
    orders.length < ARRIVAL.length ? [ARRIVAL[orders.length]] :
    !choice ? CHOICES : branchStep < route.length ? [route[branchStep]] : [RETURN];
  const position = last ? PLACES[FIELDS[last] ?? 'landing'] : null;
  return { options, choice, complete, position,
    note: last ? NOTES[last] : 'Tes archives d’Oseris-IV contiennent une chasse terminée. Reviens au bord de la tranchée inondée avec le relevé de l’époque.',
  };
}

export function inspectOserisReturn(raw: unknown): raw is OserisReturnRecord {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const record = raw as Record<string, unknown>;
  if (Reflect.ownKeys(record).length !== 3 || !Object.hasOwn(record, 'priorCompletions') ||
      !Object.hasOwn(record, 'returnedWorldCompared') || !Object.hasOwn(record, 'orders') ||
      typeof record.priorCompletions !== 'number' || !Number.isSafeInteger(record.priorCompletions) ||
      record.priorCompletions < 1 || !Array.isArray(record.orders) || record.orders.length < 1 ||
      record.orders.length > ARRIVAL.length + 1 + ADAPT.length + 1) return false;
  const orders: OserisReturnOrder[] = [];
  for (const id of record.orders) {
    const next = oserisReturnView(orders).options.find(option => option[0] === id);
    if (!next) return false;
    orders.push(next[0]);
  }
  return record.returnedWorldCompared === oserisReturnView(orders).complete;
}

export function applyOserisReturn(
  current: OserisReturnRecord | undefined,
  order: OserisReturnOrder,
  priorCompletions: number,
): OserisReturnRecord | null {
  const orders = current?.orders ?? [];
  if (!oserisReturnView(orders).options.some(option => option[0] === order)) return null;
  return {
    priorCompletions: current?.priorCompletions ?? priorCompletions,
    orders: [...orders, order],
    returnedWorldCompared: order === RETURN[0],
  };
}
