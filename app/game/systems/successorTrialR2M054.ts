/** R2-M054. The novice rehearses the crossing and carries the extraction plan. */
import { inspectElderAssembly } from './elderAssemblyV168';
import { inspectElderMentoring, mentoringNoviceSide } from './elderMentoringV168';
import { inspectElderPassageJudgment, samePassagePoint, type PassagePoint } from './elderPassageJudgmentV168';
import { inspectOserisReturn, oserisReturnView, type OserisReturnRecord } from './oserisReturnR2M053';

export interface SuccessorCampaign {
  createdAt: string;
  elderAssemblyV168?: unknown;
  elderMentoringV168?: unknown;
  elderPassageJudgmentV168?: unknown;
}

export interface SuccessorTrialPlan {
  side: 'west' | 'east';
  route: 'bank' | 'canopy';
}

export interface SuccessorTrialRecord extends SuccessorTrialPlan {
  orders: SuccessorTrialOrder[];
  transmissionTrialObserved: boolean;
}

export const SUCCESSOR_TERRAIN = [
  '####...####',
  '#.........#',
  '#.##.#.##.#',
  '#.........#',
  '###.....###',
  '##.......##',
  '####...####',
] as const;

export const SUCCESSOR_LANDING = { column: 5, row: 6 };
const EXTRACTION = { column: 5, row: 0 };
export const SUCCESSOR_DIRECTIONS = [
  { key: 'ArrowUp', label: 'Nord', symbol: '↑', column: 0, row: -1 },
  { key: 'ArrowLeft', label: 'Ouest', symbol: '←', column: -1, row: 0 },
  { key: 'ArrowDown', label: 'Sud', symbol: '↓', column: 0, row: 1 },
  { key: 'ArrowRight', label: 'Est', symbol: '→', column: 1, row: 0 },
] as const;

export function isSuccessorTerrain(value: unknown): value is PassagePoint {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const { column, row } = value as Partial<PassagePoint>;
  return typeof column === 'number' && typeof row === 'number' &&
    Number.isInteger(column) && Number.isInteger(row) && SUCCESSOR_TERRAIN[row]?.[column] === '.';
}

export function nextSuccessorStep(start: PassagePoint, target: PassagePoint): PassagePoint {
  if (samePassagePoint(start, target)) return target;
  const queue = [{ position: start, next: start }];
  const visited = new Set([start.row * SUCCESSOR_TERRAIN[0].length + start.column]);
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    for (const direction of SUCCESSOR_DIRECTIONS) {
      const position = { column: current.position.column + direction.column, row: current.position.row + direction.row };
      const key = position.row * SUCCESSOR_TERRAIN[0].length + position.column;
      if (!isSuccessorTerrain(position) || visited.has(key)) continue;
      const next = index === 0 ? position : current.next;
      if (samePassagePoint(position, target)) return next;
      queue.push({ position, next });
      visited.add(key);
    }
  }
  return start;
}

export function successorTrialPlan(campaign: SuccessorCampaign, legacy?: OserisReturnRecord): SuccessorTrialPlan | null {
  if (!legacy?.returnedWorldCompared || !inspectOserisReturn(legacy)) return null;
  const owner = campaign.createdAt;
  const assembly = inspectElderAssembly(campaign.elderAssemblyV168, owner).state;
  const mentoring = inspectElderMentoring(campaign.elderMentoringV168, owner).state;
  const judgment = inspectElderPassageJudgment(campaign.elderPassageJudgmentV168, owner).state;
  if (!assembly?.responsibility || !mentoring?.resolved || !judgment?.resolved) return null;
  return {
    side: mentoringNoviceSide(mentoring),
    route: oserisReturnView(legacy.orders).choice === 'maintain' ? 'bank' : 'canopy',
  };
}

export function successorTrialSites(plan: SuccessorTrialPlan) {
  const place = (column: number, row: number): PassagePoint => ({
    column: plan.side === 'west' ? column : SUCCESSOR_TERRAIN[0].length - 1 - column, row,
  });
  const bank = plan.route === 'bank';
  return {
    post: place(3, 5),
    fork: place(4, 4),
    approach: bank ? place(1, 3) : place(4, 2),
    snag: bank ? place(2, 3) : place(4, 1),
    rescue: bank ? place(3, 3) : place(5, 1),
    extraction: EXTRACTION,
  };
}

const LABELS = {
  deploy: 'Débarquer avec le successeur',
  'observe-posts': 'Examiner ses deux postes',
  delegate: 'Lui laisser la conduite',
  advise: 'Conseiller une ligne de secours',
  'observe-approach': 'Observer son approche',
  'give-space': 'Lui laisser libérer le chargement',
  intervene: 'Reprendre la manœuvre au point de sécurité',
  'observe-extraction': 'Observer l’extraction',
  report: 'Consigner la décision au point de retour',
} as const;

export type SuccessorTrialOrder = keyof typeof LABELS;
export type SuccessorTrialOutcome = 'delegated' | 'advised' | 'intervened';
type Option = { id: SuccessorTrialOrder; label: string; point: PassagePoint };
type View = {
  options: Option[];
  checkpoint: PassagePoint;
  successor: PassagePoint | null;
  danger: boolean;
  complete: boolean;
  instruction: string;
  outcome: SuccessorTrialOutcome | null;
};

export function successorTrialView(plan: SuccessorTrialPlan, orders: readonly SuccessorTrialOrder[]): View {
  const sites = successorTrialSites(plan);
  const last = orders.at(-1);
  const option = (id: SuccessorTrialOrder, point: PassagePoint): Option => ({ id, point, label: LABELS[id] });
  const turn = (checkpoint: PassagePoint, successor: PassagePoint | null, instruction: string, options: Option[],
    danger = false): View => ({ checkpoint, successor, instruction, options, danger, complete: false, outcome: null });
  const advised = orders.includes('advise');
  const outcome = orders.includes('intervene') ? 'intervened' : advised ? 'advised' : 'delegated';
  const decisionPoint = last === 'intervene' ? sites.rescue : sites.approach;
  const extraction = (checkpoint: PassagePoint) => turn(checkpoint, sites.extraction,
    'Le successeur suit son itinéraire jusqu’au point d’extraction. Rejoins-le pour observer le départ du chargement.',
    [option('observe-extraction', sites.extraction)]);

  switch (last) {
    case undefined:
      return turn(SUCCESSOR_LANDING, null,
        'Le novice formé revient à Oseris-IV. Il a prévu deux postes, une approche et un point d’extraction.',
        [option('deploy', SUCCESSOR_LANDING)]);
    case 'deploy':
      return turn(SUCCESSOR_LANDING, sites.post, 'Rejoins le premier poste que le successeur vient de poser.', [
        option('observe-posts', sites.post),
      ]);
    case 'observe-posts':
      return turn(sites.post, sites.fork, plan.route === 'bank'
        ? 'Le successeur a choisi une approche le long de la rive, à partir du nouveau relevé.'
        : 'Le successeur a choisi une approche par les appuis de la canopée, à partir du nouveau relevé.', [
        option('delegate', sites.fork), option('advise', sites.fork),
      ]);
    case 'delegate':
    case 'advise':
      return turn(sites.fork, sites.approach, advised
        ? 'Il retient ton conseil et pose sa propre ligne de secours. Rejoins le point d’observation.'
        : 'Il engage son approche. Rejoins le point d’observation et laisse-lui la conduite.', [
        option('observe-approach', sites.approach),
      ]);
    case 'observe-approach':
      return advised ? extraction(sites.approach) : turn(sites.approach, sites.snag,
        'La sangle cède et retient le chargement au bord du vide. Le successeur peut le délester. Le point de sécurité permet de reprendre la manœuvre.', [
        option('give-space', sites.approach), option('intervene', sites.rescue),
      ], true);
    case 'give-space':
    case 'intervene':
      return extraction(decisionPoint);
    case 'observe-extraction':
      return turn(sites.extraction, sites.extraction, 'Le chargement a quitté le terrain. Reviens au point de retour pour consigner sa décision.', [
        option('report', SUCCESSOR_LANDING),
      ]);
    case 'report':
      return { ...turn(SUCCESSOR_LANDING, null, 'Le dossier du clan conserve le déroulé et la décision du successeur.', []),
        complete: true, outcome };
  }
}

export const SUCCESSOR_OUTCOMES: Record<SuccessorTrialOutcome, string> = {
  delegated: 'Le successeur a mené l’opération et délivré le chargement.',
  advised: 'Le successeur a conduit l’extraction avec une ligne de secours.',
  intervened: 'L’Elder a repris la manœuvre au danger, puis le successeur a mené l’extraction.',
};

export function inspectSuccessorTrial(raw: unknown): raw is SuccessorTrialRecord {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const { side, route, orders, transmissionTrialObserved } = raw as Partial<SuccessorTrialRecord>;
  if (Reflect.ownKeys(raw).length !== 4 || (side !== 'west' && side !== 'east') ||
      (route !== 'bank' && route !== 'canopy') || !Array.isArray(orders) || orders.length < 1 || orders.length > 7) return false;
  const checked: SuccessorTrialOrder[] = [];
  for (const order of orders) {
    const next = successorTrialView({ side, route }, checked).options.find(item => item.id === order);
    if (!next) return false;
    checked.push(next.id);
  }
  return transmissionTrialObserved === successorTrialView({ side, route }, checked).complete;
}

export function applySuccessorTrial(
  current: SuccessorTrialRecord | undefined,
  plan: SuccessorTrialPlan,
  order: SuccessorTrialOrder,
  position: PassagePoint,
): SuccessorTrialRecord | null {
  if (!isSuccessorTerrain(position) || (current && (current.side !== plan.side || current.route !== plan.route))) return null;
  const orders = current?.orders ?? [];
  const option = successorTrialView(plan, orders).options.find(entry => entry.id === order);
  if (!option || !samePassagePoint(position, option.point)) return null;
  return { ...plan, orders: [...orders, order], transmissionTrialObserved: order === 'report' };
}
