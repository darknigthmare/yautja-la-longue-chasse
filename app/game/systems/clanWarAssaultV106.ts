import {
  queueWarOrderV85, warGarrisonV85, warHeadquartersV103, warSuppliedV85, warOrderRevisionIssueV106,
  warTerritoryForSimulationV96, type WarSimulationV85,
} from './clanWarV85';
import { warOrderPreviewV98, type WarOrderDraftV98 } from './clanWarCommandV98';
import { warAtlasIntelV95 } from './clanWarAtlasV95';
import { warBattleModelV106 } from './clanWarBattleModelV106';

export const WAR_ASSAULT_CONTRACT_V106 = {
  workbook: 'Yautja_V3_Guerres_de_Clans_Trois_Modes.xlsx',
  sha256: '3ef3712c9ffa865f918133bee7667155c1bb320f060b4a19cc58ff650ffd0dfa',
  sheet: 'Règles de conquête',
  sources: [
    { id: 'CON-R09', cells: 'C14:H14' },
    { id: 'CON-R12', cells: 'C17:H17' },
    { id: 'CON-R14', cells: 'C19:H19' },
  ],
  scope: 'Dated intelligence, conditional free-front scenarios and explicit immutable preparation; no new structure or tactical RTS simulation.',
} as const;

const PLAYER = 'CON-F01';
// An opaque in-memory attachment prevents a replacement archive with matching
// visible facts/revision from inheriting somebody else's review. It serializes
// no front identity, hidden roster, seed or hash into the public plan.
const preparedFronts = new WeakMap<WarAssaultPlanV106, WarSimulationV85>();
const copyDraft = (draft: WarOrderDraftV98): WarOrderDraftV98 => ({
  kind: draft.kind, fromId: draft.fromId, targetId: draft.targetId,
  combatantIds: [...draft.combatantIds], cargo: { ...draft.cargo },
});

/** Only the player's own column and public dated reports may inform an estimate.
 * Even a recent report describes its observation turn, not a live enemy roster. */
export function warAssaultViewV106(state: WarSimulationV85, draft: WarOrderDraftV98) {
  const preview = warOrderPreviewV98(state, draft);
  const people = draft.combatantIds.map(id => state.combatants.find(actor =>
    actor.id === id && actor.factionId === PLAYER && actor.territoryId === draft.fromId))
    .filter((actor): actor is NonNullable<typeof actor> => !!actor)
    .map(actor => ({ id: actor.id, unitTypeId: actor.unitTypeId, status: actor.status, garrison: actor.garrison, trainingUntilTurn: actor.trainingUntilTurn }));
  const intel = preview.intel;
  const assumptions = intel.kind === 'observed' && intel.lower !== null && intel.upper !== null
    ? { lower: intel.lower, upper: intel.upper, observedTurn: intel.turn!, stale: intel.stale }
    : null;
  const cases = assumptions ? Array.from({ length: Math.min(301, assumptions.upper - assumptions.lower + 1) }, (_, index) => assumptions.lower + index)
    .flatMap(defenders => [0, 1, 2].map(roll => warBattleModelV106(people.length, defenders, roll))) : [];
  const losses = cases.length ? {
    lower: Math.min(...cases.map(item => item.losses)), upper: Math.max(...cases.map(item => item.losses)),
    wins: cases.filter(item => item.won).length, cases: cases.length,
  } : null;
  const leaving = new Set([...state.orders.filter(order => order.fromId === draft.fromId && ['move', 'attack', 'cession', 'logistics', 'evacuate'].includes(order.kind)).flatMap(order => order.combatantIds), ...draft.combatantIds]);
  const guards = state.territories[draft.fromId]?.controller === PLAYER ? warGarrisonV85(state, draft.fromId) : [];
  return {
    issue: draft.kind === 'attack' ? warOrderRevisionIssueV106(state, draft.kind) ?? preview.issue : 'Cette préparation est réservée à un assaut.',
    planetId: state.planetId ?? 'korthas', turn: state.turn, revision: state.revision,
    fromId: draft.fromId, targetId: draft.targetId, people,
    intel: { ...intel }, assumptions, losses,
    // A report never bounds the current opposing force. Keep this separate from
    // the narrower, explicitly conditional model calculated above.
    currentLossExposure: { lower: 0, upper: people.length },
    cost: { ...preview.cost }, available: preview.available ? { ...preview.available } : null,
    after: preview.after ? { ...preview.after } : null, warnings: [...preview.warnings],
    suppliedOrigin: state.territories[draft.fromId]?.controller === PLAYER && warSuppliedV85(state).has(draft.fromId),
    guardsRemainingIfAllDepart: guards.filter(actor => !leaving.has(actor.id)).map(actor => actor.id),
  };
}

export type WarAssaultViewV106 = ReturnType<typeof warAssaultViewV106>;
export interface WarAssaultPlanV106 {
  version: 1;
  draft: WarOrderDraftV98;
  /** Bounded, inspectable facts; deliberately excludes seed and foreign state. */
  view: WarAssaultViewV106;
}

export function prepareWarAssaultV106(state: WarSimulationV85, draft: WarOrderDraftV98): WarAssaultPlanV106 | null {
  const view = warAssaultViewV106(state, draft);
  if (view.issue) return null;
  const plan: WarAssaultPlanV106 = { version: 1, draft: copyDraft(draft), view };
  preparedFronts.set(plan, state);
  return plan;
}

export function warAssaultPlanIssueV106(state: WarSimulationV85, draft: WarOrderDraftV98, plan: WarAssaultPlanV106 | null): string | null {
  if (!plan || plan.version !== 1) return 'Étudiez cet assaut avant de le réserver.';
  if (preparedFronts.get(plan) !== state) return 'Le front a été remplacé ou modifié : étudiez un nouvel aperçu avant de réserver.';
  const current = warAssaultViewV106(state, draft);
  if (current.issue) return current.issue;
  if (JSON.stringify(plan.draft) !== JSON.stringify(copyDraft(draft)) || JSON.stringify(plan.view) !== JSON.stringify(current)) {
    return 'La préparation a changé : relisez un nouvel aperçu avant de réserver.';
  }
  return null;
}

/** The real order and existing storage transaction remain authoritative. */
export function queuePreparedWarAssaultV106(state: WarSimulationV85, draft: WarOrderDraftV98, plan: WarAssaultPlanV106 | null) {
  const issue = warAssaultPlanIssueV106(state, draft, plan);
  return issue ? { state, accepted: false, message: issue } : queueWarOrderV85(state, copyDraft(draft));
}

/** A visible network path, not a new cargo right or an invented remote stock. */
export function warSupplyPathV106(state: WarSimulationV85, targetId: string): string[] | null {
  if (state.territories[targetId]?.controller !== PLAYER) return null;
  const origin = warHeadquartersV103(state);
  const accessible = (id: string) => state.territories[id]?.controller === PLAYER ||
    state.territories[id]?.controller === 'CON-F03' && (state.territories[id]?.transitUntilTurn ?? -1) >= state.turn;
  if (!origin || !state.territories[origin]?.installationIntact || !accessible(origin)) return null;
  const queue: string[][] = [[origin]], visited = new Set([origin]);
  while (queue.length) {
    const path = queue.shift()!, last = path.at(-1)!;
    if (last === targetId) return path;
    for (const id of warTerritoryForSimulationV96(state, last)?.neighbors ?? []) {
      if (!visited.has(id) && accessible(id)) { visited.add(id); queue.push([...path, id]); }
    }
  }
  return null;
}

export function warIntelMarkerV106(state: WarSimulationV85, id: string) {
  const intel = warAtlasIntelV95(state, id);
  return { kind: intel.kind, stale: intel.stale, label: intel.label,
    short: intel.kind === 'own' ? `${intel.count} aptes` : intel.kind === 'observed' ? `${intel.lower}–${intel.upper} · T${intel.turn}` : '?' };
}
