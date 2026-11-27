/** R2-M055. The witness uses three places of this campaign to teach one method. */
import type { ClanShipRoomId } from './clanShipDocking';
import { inspectElderWorkshopV172 } from './elderWorkshopRecordV172';
import { inspectOserisReturn, oserisReturnView, type OserisReturnRecord } from './oserisReturnR2M053';
import { inspectSuccessorTrial, successorTrialView, type SuccessorTrialRecord } from './successorTrialR2M054';

export const MEMORY_TRACKS = ['hunt', 'collective', 'teaching'] as const;
export type MemoryTrack = typeof MEMORY_TRACKS[number];
export type LongMemoryOrder = 'begin' | 'handover' | 'prepare' | 'compare-hunt' | 'compare-collective' |
  'compare-teaching' | 'choose-hunt' | 'choose-collective' | 'choose-teaching';
export interface LongMemoryRecord {
  orders: LongMemoryOrder[];
  longMemorySuccess: boolean;
}

export const MEMORY_ROOMS: Record<MemoryTrack, ClanShipRoomId> = {
  hunt: 'hangar',
  collective: 'armurerie',
  teaching: 'archives',
};

export const MEMORY_LABELS: Record<MemoryTrack, string> = {
  hunt: 'Trace de chasse',
  collective: 'Lieu collectif',
  teaching: 'Enseignement',
};

type MemoryComparison = { past: string; consequence: string; preparation: string; handover: string };
export type LongMemoryEvidence = Record<MemoryTrack, MemoryComparison>;

export function longMemoryEvidence(owner: string, workshop: unknown,
  legacy?: OserisReturnRecord, successor?: SuccessorTrialRecord): LongMemoryEvidence | null {
  const fitted = inspectElderWorkshopV172(workshop, owner).view;
  if (fitted.phase !== 'complete' || !legacy?.returnedWorldCompared || !inspectOserisReturn(legacy) ||
      !successor?.transmissionTrialObserved || !inspectSuccessorTrial(successor)) return null;
  const bank = oserisReturnView(legacy.orders).choice === 'maintain';
  const lesson = successorTrialView(successor, successor.orders).outcome;
  return {
    hunt: {
      past: 'Le relevé de la première chasse signalait un trajet bas, avant la dernière crue.',
      consequence: bank ? 'Les deux jalons que tu as fixés sont encore lisibles sur le relevé de retour. La navette garde le passage de rive.'
        : 'Ton relevé de retour situe l’appui de la canopée. La navigation de la navette écarte le trajet bas.',
      preparation: bank ? 'Annoter le calque à hauteur des deux jalons' : 'Annoter le calque à hauteur de l’appui de la ramure',
      handover: 'Remettre le calque annoté au volontaire',
    },
    collective: {
      past: 'L’armurerie t’a demandé de corriger le défaut d’un outil avant de le rendre à Griffe de Fer.',
      consequence: fitted.method === 'repair' ? 'L’outil réparé est revenu à l’établi. La fiche du poste conserve les trois crans d’alignement.'
        : 'Griffe de Fer a repris le nouvel alignement. La fiche du poste conserve les deux crans de sa méthode.',
      preparation: fitted.method === 'repair' ? 'Reporter les trois crans de la méthode réparée' : 'Reporter les deux crans de la nouvelle méthode',
      handover: 'Transmettre la méthode de réglage au volontaire',
    },
    teaching: {
      past: 'Pendant le mentorat, le novice lisait encore les traces sous ton regard.',
      consequence: lesson === 'intervened' ? 'Les archives conservent son plan d’extraction et le point où tu as pris la manœuvre au danger.'
        : lesson === 'advised' ? 'Les archives conservent son plan d’extraction avec la ligne de secours qu’il a posée.'
        : 'Les archives conservent son propre relevé de délestage et d’extraction.',
      preparation: lesson === 'intervened' ? 'Marquer le point précis de l’intervention'
        : lesson === 'advised' ? 'Marquer le point de décision de la ligne de secours' : 'Marquer la place laissée au successeur',
      handover: 'Présenter la méthode d’observation au volontaire',
    },
  };
}

type Choice = { id: LongMemoryOrder; room: ClanShipRoomId; track?: MemoryTrack };
const COMPARE: Record<MemoryTrack, LongMemoryOrder> = {
  hunt: 'compare-hunt', collective: 'compare-collective', teaching: 'compare-teaching',
};
const CHOOSE: Record<MemoryTrack, LongMemoryOrder> = {
  hunt: 'choose-hunt', collective: 'choose-collective', teaching: 'choose-teaching',
};

export function longMemoryView(orders: readonly LongMemoryOrder[]) {
  const comparisons = MEMORY_TRACKS.filter(id => orders.includes(COMPARE[id]));
  const choice = MEMORY_TRACKS.find(id => orders.includes(CHOOSE[id]));
  const complete = orders.at(-1) === 'handover';
  let options: Choice[] = [];
  if (!orders.length) options = [{ id: 'begin', room: 'archives' }];
  else if (comparisons.length < MEMORY_TRACKS.length) {
    options = MEMORY_TRACKS.filter(id => !comparisons.includes(id)).map(track =>
      ({ id: COMPARE[track], room: MEMORY_ROOMS[track], track }));
  } else if (!choice) {
    options = MEMORY_TRACKS.map(track => ({ id: CHOOSE[track], room: MEMORY_ROOMS[track], track }));
  } else if (!complete) {
    options = [{ id: orders.at(-1) === 'prepare' ? 'handover' : 'prepare', room: MEMORY_ROOMS[choice], track: choice }];
  }
  return { comparisons, choice, complete, options };
}

export function inspectLongMemory(raw: unknown): raw is LongMemoryRecord {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw) || Reflect.ownKeys(raw).length !== 2) return false;
  const { orders, longMemorySuccess } = raw as Partial<LongMemoryRecord>;
  if (!Array.isArray(orders) || orders.length < 1 || orders.length > 7) return false;
  const checked: LongMemoryOrder[] = [];
  for (const order of orders) {
    const next = longMemoryView(checked).options.find(option => option.id === order);
    if (!next) return false;
    checked.push(next.id);
  }
  return longMemorySuccess === longMemoryView(checked).complete;
}

export function applyLongMemory(
  current: LongMemoryRecord | undefined, order: LongMemoryOrder, room: ClanShipRoomId,
): LongMemoryRecord | null {
  const orders = current?.orders ?? [];
  if (!longMemoryView(orders).options.some(option => option.id === order && option.room === room)) return null;
  return { orders: [...orders, order], longMemorySuccess: order === 'handover' };
}
