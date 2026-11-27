/** R2-M036. A guided W3 command sortie whose final report belongs to the clan ledger. */
import { DEFAULT_WAR_RULES_V6 } from './clanWarBibleV6';
import {
  commandWarRtsOverwatchV136, commandWarRtsSquadsV133, createWarRtsSquadsV133,
  evacuateWarRtsSquadV139, launchWarRtsSquadsV133, type WarRtsSquadsStateV133,
} from './clanWarRtsSquadsV133';
import {
  commandWarMapPracticeV128, createWarMapPracticeV128,
  warMapFindPathV128, type WarMapPointV128, type WarMapPracticeV128,
} from './clanWarSourceMapsV128';

const MISSION = 'W3-RTS01';
const MAX_ORDERS = 48;
const DIRECTIONS = [
  { id: 'up', key: 'ArrowUp', label: 'Nord', x: 0, y: -1 },
  { id: 'right', key: 'ArrowRight', label: 'Est', x: 1, y: 0 },
  { id: 'down', key: 'ArrowDown', label: 'Sud', x: 0, y: 1 },
  { id: 'left', key: 'ArrowLeft', label: 'Ouest', x: -1, y: 0 },
] as const;
export const WAR_COMMAND_DIRECTIONS = DIRECTIONS;
type Direction = typeof DIRECTIONS[number]['id'];
type Decision = 'resupply' | 'detour';
type FieldOrder = Direction | 'observe' | 'interact';
export type WarCommandIntroOrder = 'deploy' | 'cover' | 'pull-back' | 'retreat' | 'retry' | Decision |
  'observe' | 'interact' | 'up' | 'right' | 'down' | 'left';
export interface WarCommandIntroRecord {
  orders: Exclude<WarCommandIntroOrder, 'retry'>[];
  rtsIntroductionResolved: boolean;
}
type Option = { id: WarCommandIntroOrder; label: string };
type Step = 'briefing' | 'cover' | 'move' | 'pull-back' | 'decision' | 'field' | 'complete' | 'retreat';
interface Intro {
  step: Step;
  rts: WarRtsSquadsStateV133 | null;
  field: WarMapPracticeV128 | null;
  decision: Decision | null;
  report: string;
}

const EMPTY: Intro = { step: 'briefing', rts: null, field: null, decision: null,
  report: 'Depuis le conseil, prends le poste de commandement de la corniche. Un premier détachement couvrira le passage, un second progressera et le dernier reviendra à la navette.' };
const same = (a: WarMapPointV128, b: WarMapPointV128) => a.x === b.x && a.y === b.y;
const distance = (a: WarMapPointV128, b: WarMapPointV128) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

let battle: WarRtsSquadsStateV133 | undefined;
function deploy() {
  if (battle) return battle;
  const result = launchWarRtsSquadsV133(createWarRtsSquadsV133(MISSION, DEFAULT_WAR_RULES_V6));
  if (!result.accepted || result.state.squads.length !== 3) throw new Error('Un départ W3 à trois formations est requis.');
  battle = result.state;
  return battle;
}

const missions = new Map<Decision, WarMapPracticeV128>();
function descend(decision: Decision, rts: WarRtsSquadsStateV133) {
  const cached = missions.get(decision);
  if (cached) return cached;
  const seed = createWarMapPracticeV128(rts.map.id, DEFAULT_WAR_RULES_V6);
  const path = seed.map.mandatoryPaths[decision === 'resupply' ? 1 : 0];
  const target = path[decision === 'resupply' ? 5 : 7];
  const field = { ...seed, scenarioId: 'R2-M036-' + decision,
    map: { ...seed.map, observation: target, goal: target } };
  missions.set(decision, field);
  return field;
}

function orderAtStep(state: Intro, order: WarCommandIntroOrder): Intro | null {
  if (state.step === 'briefing') {
    return order === 'deploy' ? { ...state, step: 'cover', rts: deploy(),
      report: 'Les trois formations sont à la corniche. Place la première en couverture avant de déplacer la deuxième.' } : null;
  }
  if (state.step === 'complete' || state.step === 'retreat' || !state.rts) return null;
  const rts = state.rts;
  if (state.step === 'field' && state.field) {
    const field = state.field;
    if (!fieldOptions(field).some(option => option.id === order)) return null;
    const pathOrder = order as FieldOrder | 'retreat';
    const result = commandWarMapPracticeV128(field, pathOrder);
    if (!result.accepted) return null;
    const outcome = result.state.report?.outcome;
    const withdrawal = outcome ? commandWarRtsSquadsV133(rts, { kind: 'retreat', squadId: rts.squads[0].id }) : null;
    if (withdrawal && !withdrawal.accepted) return null;
    const returned = outcome === 'victory' && withdrawal?.state.report?.leftBehindSquadIds.length === 0;
    return { ...state, field: result.state, rts: withdrawal?.state ?? rts,
      step: returned ? 'complete' : outcome ? 'retreat' : 'field',
      report: returned
        ? state.decision === 'resupply'
          ? 'Le dépôt est vérifié et son relevé a rejoint les formations revenues à bord.'
          : 'Le passage de contournement est vérifié et son balisage est revenu au commandement.'
        : outcome ? 'L’objectif reste ouvert. Le commandement consigne le repli, avec les formations encore présentes.'
          : result.message };
  }
  if (order === 'retreat') {
    const result = commandWarRtsSquadsV133(rts, { kind: 'retreat', squadId: rts.squads[0].id });
    return result.accepted ? { ...state, step: 'retreat', rts: result.state,
      report: 'Le poste organise le retour des formations présentes au point d’extraction.' } : null;
  }
  if (state.step === 'cover' && order === 'cover') {
    const result = commandWarRtsOverwatchV136(rts, rts.squads[0].id);
    return result.accepted ? { ...state, step: 'move', rts: result.state, report: result.message } : null;
  }
  const direction = DIRECTIONS.find(item => item.id === order);
  if (state.step === 'move' && direction) {
    const result = commandWarRtsSquadsV133(rts, { kind: 'move', squadId: rts.squads[1].id, direction: direction.id });
    return result.accepted ? { ...state, step: 'pull-back', rts: result.state, report: result.message } : null;
  }
  if (state.step === 'pull-back' && order === 'pull-back') {
    const result = evacuateWarRtsSquadV139(rts, rts.squads[2].id);
    return result.accepted ? { ...state, step: 'decision', rts: result.state, report: result.message } : null;
  }
  if (state.step === 'decision' && (order === 'resupply' || order === 'detour')) {
    return { ...state, step: 'field', field: descend(order, rts), decision: order, report: order === 'resupply'
      ? 'Au sol, rejoins le dépôt, observe ses accès puis inspecte les réserves avant de revenir à la navette.'
      : 'Au sol, rejoins l’appui de la corniche, relève son accès et confirme le repère avant de revenir à la navette.' };
  }
  return null;
}

function fieldOptions(field: WarMapPracticeV128): Option[] {
  const { player, map, objectiveDone } = field;
  const target = objectiveDone ? map.extraction : map.goal;
  const options: Option[] = [];
  if (!objectiveDone && same(player, target)) {
    options.push({ id: player.observed ? 'interact' : 'observe',
      label: player.observed ? 'Confirmer le dispositif' : 'Observer les accès' });
  } else {
    const next = warMapFindPathV128(map, player, target, field.enemies.filter(unit => unit.hp > 0))?.[1];
    const direction = next && DIRECTIONS.find(step => next.x - player.x === step.x && next.y - player.y === step.y);
    if (direction) options.push({ id: direction.id, label: 'Marcher vers le ' + direction.label.toLowerCase() });
  }
  if (distance(player, map.extraction) <= 1) options.push({ id: 'retreat', label: 'Regagner la navette en repli' });
  return options;
}

function replay(orders: readonly WarCommandIntroOrder[]) {
  let state = EMPTY;
  for (const order of orders) {
    const next = orderAtStep(state, order);
    if (!next) return null;
    state = next;
  }
  return state;
}

export function warCommandIntroView(record?: WarCommandIntroRecord) {
  const state = replay(record?.orders ?? []) ?? EMPTY;
  let options: Option[] = [];
  switch (state.step) {
    case 'briefing': options = [{ id: 'deploy', label: 'Déployer depuis le poste de commandement' }]; break;
    case 'cover': options = [{ id: 'cover', label: 'Mettre la première formation en couverture' }]; break;
    case 'move': options = DIRECTIONS.filter(direction => orderAtStep(state, direction.id) !== null)
      .map(direction => ({ id: direction.id, label: 'Déplacer la deuxième formation · ' + direction.label })); break;
    case 'pull-back': options = [{ id: 'pull-back', label: 'Évacuer la troisième formation par la sortie' }]; break;
    case 'decision': options = [{ id: 'resupply', label: 'Ravitaillement · vérifier le dépôt' },
      { id: 'detour', label: 'Contournement · vérifier l’appui' }]; break;
    case 'field': options = state.field ? fieldOptions(state.field) : []; break;
    case 'retreat': options = [{ id: 'retry', label: 'Replanifier les ordres' }]; break;
  }
  if (state.rts && ['cover', 'move', 'pull-back', 'decision'].includes(state.step)) options.push({
    id: 'retreat', label: 'Ordonner le repli des formations',
  });
  return { ...state, options };
}

export function inspectWarCommandIntro(raw: unknown): raw is WarCommandIntroRecord {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw) || Reflect.ownKeys(raw).length !== 2) return false;
  const { orders, rtsIntroductionResolved } = raw as Partial<WarCommandIntroRecord>;
  if (!Array.isArray(orders) || orders.length < 1 || orders.length > MAX_ORDERS) return false;
  const state = replay(orders);
  return state !== null && rtsIntroductionResolved === (state.step === 'complete');
}

export function applyWarCommandIntro(record: WarCommandIntroRecord | undefined, order: WarCommandIntroOrder): WarCommandIntroRecord | null {
  const prior = record?.orders ?? [];
  const current = replay(prior);
  if (!current) return null;
  if (order === 'retry') return current.step === 'retreat' ? { orders: ['deploy'], rtsIntroductionResolved: false } : null;
  if (prior.length >= MAX_ORDERS) return null;
  const next = orderAtStep(current, order);
  if (!next) return null;
  return { orders: [...prior, order], rtsIntroductionResolved: next.step === 'complete' };
}
