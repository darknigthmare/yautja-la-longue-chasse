import {
  DEFAULT_WAR_RULES_V6, applyWarResultV6, createWarTeamV6, estimateWarTeamV6,
  planWarRouteV6, selectWarSpecializationV6, warTeamExperienceV6,
  type WarRulesV6, type WarTeamStateV6,
} from "./clanWarBibleV6";

export interface WarWorkDefinitionV6 {
  id: string; name: string; kind: "rest" | "navigation" | "defense" | "stock" | "repair";
  costRav: number; upkeepRav: number; delayTurns: number; operatorUnitId: string;
  effect: string; limit: string; deployment: string; defensePercent: number;
  sourceRow: number; sourceCells: string[]; capacityRav: number;
}
const supportedWorks = { "W3-S02": "rest", "W3-S05": "navigation", "W3-S07": "defense", "W3-S03": "stock", "W3-S04": "repair" } as const;

/** Source cells remain data. Missing or malformed construction rows never get
 * substitute prices, operators or effects from the historical V3 rules. */
export function warWorksDefinitionsV6(rules: WarRulesV6 = DEFAULT_WAR_RULES_V6): WarWorkDefinitionV6[] {
  return Object.entries(supportedWorks).flatMap(([id, kind]) => {
    const row = rules.entries.find(entry => entry.sheet === "Structures de guerre" && entry.id === id);
    if (!row) return [];
    const value = (label: string) => row.fields.find(cell => cell.label === label)?.value;
    const costRav = value("Coût RAV"), upkeepRav = value("Entretien RAV"), delayTurns = value("Délai (tours)");
    const operatorUnitId = value("Operateur ref"), effect = value("Effet"), limit = value("Limite"), deployment = value("Deploiement");
    if (typeof costRav !== "number" || !Number.isSafeInteger(costRav) || costRav < 1 || costRav > rules.parameters.rav_cap
      || typeof upkeepRav !== "number" || !Number.isSafeInteger(upkeepRav) || upkeepRav < 0 || upkeepRav > rules.parameters.rav_cap
      || typeof delayTurns !== "number" || !Number.isSafeInteger(delayTurns) || delayTurns < rules.parameters.build_delay_min || delayTurns > 20
      || typeof operatorUnitId !== "string" || !rules.units.some(unit => unit.id === operatorUnitId)
      || typeof effect !== "string" || typeof limit !== "string" || typeof deployment !== "string"
      || (kind === "defense" && !effect.includes("quinze pour cent"))
      || (kind === "stock" && !effect.includes("vingt RAV identifiées"))) return [];
    return [{ id, name: String(row.title), kind, costRav, upkeepRav, delayTurns, operatorUnitId, effect, limit, deployment,
      // W3-S07 expresses its 15% in prose, not in an additional numeric cell.
      defensePercent: kind === "defense" ? 15 : 0, capacityRav: kind === "stock" ? 20 : 0,
      sourceRow: row.row, sourceCells: row.fields.map(cell => cell.cell) }];
  });
}

export interface WarWorksTeamV6 {
  team: WarTeamStateV6; territoryId: string;
  route: ReturnType<typeof planWarRouteV6>; payloadWorkId: string | null; dutyWorkId: string | null;
}
export interface WarWorkOrderV6 {
  id: string; kitId: string; structureId: string; territoryId: string; passageId: string | null;
  phase: "reserved" | "carried" | "delivered" | "building" | "ready";
  costRav: number; workedTurns: number; carrierTeamId: string | null; operatorTeamId: string | null;
}
export interface WarRecruitOrderV6 {
  id: string; teamId: string; unitId: string; costRav: number; orderedTurn: number; readyTurn: number;
  status: "pending" | "arrived";
}
export interface WarRavLotV87 {
  id: string; location: "depot" | "carrier" | "cache"; rav: number;
  teamId: string | null; workId: string | null;
  steps: { passageId: string; fromId: string; toId: string; turn: number }[];
}
export interface WarRavTransferV87 {
  id: string; fromId: string; toId: string | null; rav: number; turn: number;
  purpose: "load" | "deposit" | "withdraw" | "return" | "recruitment" | "kit" | "upkeep";
  steps: WarRavLotV87["steps"];
}
export interface WarWorksSessionV6 {
  version: 2; context: "free-workshop"; rulesKey: string; sourceSha: string;
  supplyMode: "front" | "local"; lots: WarRavLotV87[]; transfers: WarRavTransferV87[];
  turn: number; nextIdentity: number; originId: string; startingRav: number; ravStock: number;
  teams: WarWorksTeamV6[]; recruits: WarRecruitOrderV6[]; works: WarWorkOrderV6[];
  observed: { territoryId: string; turn: number; teamId: string }[]; closedPassageIds: string[];
  accounts: { recruitmentReserved: number; kitsReserved: number; upkeepConsumed: number };
  lastTurnNeed: number; lastTurnPaid: number;
  lastTeamSupply: { teamId: string; territoryId: string; need: number; paid: number }[];
  reports: { turn: number; text: string; sourceIds: string[] }[];
}
export type WarWorksActionV6 =
  | { kind: "recruit"; unitId: string }
  | { kind: "wait" }
  | { kind: "plan"; teamId: string; destinationId: string }
  | { kind: "advance"; teamId: string }
  | { kind: "observe"; teamId: string }
  | { kind: "reserve-kit"; structureId: string; territoryId: string; passageId?: string }
  | { kind: "load" | "unload" | "work" | "assign" | "rest"; workId: string; teamId: string }
  | { kind: "release"; teamId: string }
  | { kind: "specialize"; teamId: string; branch: "A" | "B" }
  | { kind: "close-passages"; ids: string[] }
  | { kind: "load-rav"; teamId: string; rav: number }
  | { kind: "deposit-rav"; teamId: string; workId: string }
  | { kind: "withdraw-rav"; teamId: string; workId: string; rav: number }
  | { kind: "return-rav"; teamId: string };
export interface WarWorksTransitionV6 { state: WarWorksSessionV6; accepted: boolean; changed: boolean; message: string }
const unitFor = (rules: WarRulesV6, id: string) => rules.units.find(unit => unit.id === id);
const fitMembers = (group: WarWorksTeamV6) => group.team.members.filter(member => member.status === "fit" && member.assignmentId === group.team.id);
const depotLotId = "rav:v87:depot";
/** 20 RAV per carrier is a declared exercise envelope, not mass or an Excel
 * carrying capacity. The cache's separate 20-RAV capacity is sourced in H8. */
export const WAR_RAV_CARRIER_LIMIT_V87 = 20;
export const warWorksDepotV87 = (state: WarWorksSessionV6) => state.lots.find(lot => lot.id === depotLotId)?.rav ?? 0;
export const warWorksCarriedRavV87 = (state: WarWorksSessionV6, teamId: string) => state.lots.find(lot => lot.location === "carrier" && lot.teamId === teamId)?.rav ?? 0;
export const warWorksCacheRavV87 = (state: WarWorksSessionV6, workId: string) => state.lots.find(lot => lot.location === "cache" && lot.workId === workId)?.rav ?? 0;
const carryingRav = (state: WarWorksSessionV6, group: WarWorksTeamV6) => warWorksCarriedRavV87(state, group.team.id) > 0;
function transferRav(state: WarWorksSessionV6, fromId: string, destination: WarRavLotV87 | null, rav: number,
  purpose: WarRavTransferV87["purpose"]): WarWorksSessionV6 {
  const existing = destination && state.lots.find(lot => lot.id === destination.id);
  const lots = state.lots.map(lot => lot.id === fromId ? { ...lot, rav: lot.rav - rav }
    : lot.id === destination?.id ? { ...destination, rav: lot.rav + rav } : lot);
  if (destination && !existing) lots.push({ ...destination, rav });
  const field = purpose === "recruitment" ? "recruitmentReserved" : purpose === "kit" ? "kitsReserved" : "upkeepConsumed";
  return { ...state, lots, nextIdentity: state.nextIdentity + 1,
    ravStock: destination ? state.ravStock : state.ravStock - rav,
    accounts: destination ? state.accounts : { ...state.accounts, [field]: state.accounts[field] + rav },
    transfers: [...state.transfers, { id: `rav-tx:${state.nextIdentity}`, fromId, toId: destination?.id ?? null, rav, purpose, turn: state.turn,
      steps: state.lots.find(lot => lot.id === fromId)?.steps.map(step => ({ ...step })) ?? [] }] };
}
/** Local upkeep follows the actual moved position and never pulls remote depot
 * stock over a closed link. Payment order is visible: teams, then structures. */
function supplyTurn(state: WarWorksSessionV6, next: WarWorksSessionV6, rules: WarRulesV6, writeTransfers = true) {
  const defs = warWorksDefinitionsV6(rules);
  let paidState = next;
  const atSite = (territoryId: string) => paidState.lots.filter(lot => lot.location === "depot" ? territoryId === state.originId
    : lot.location === "cache" && state.works.some(work => work.id === lot.workId && work.phase === "ready" && work.territoryId === territoryId));
  const pay = (need: number, territoryId: string, teamId: string | null) => {
    const candidates = state.supplyMode === "front" ? [paidState.lots.find(lot => lot.id === depotLotId)!]
      : [...paidState.lots.filter(lot => lot.location === "carrier" && lot.teamId === teamId), ...atSite(territoryId)];
    let paid = 0;
    for (const lot of candidates) {
      const remaining = paidState.lots.find(current => current.id === lot.id)!.rav, debit = Math.min(need - paid, remaining);
      if (debit > 0) {
        paidState = writeTransfers ? transferRav(paidState, lot.id, null, debit, "upkeep")
          : { ...paidState, lots: paidState.lots.map(current => current.id === lot.id ? { ...current, rav: current.rav - debit } : current) };
        paid += debit;
      }
      if (paid === need) break;
    }
    return paid;
  };
  const lastTeamSupply = state.teams.map(previous => {
    const group = next.teams.find(item => item.team.id === previous.team.id)!;
    const need = unitFor(rules, group.team.unitId)!.upkeepRav;
    return { teamId: group.team.id, territoryId: group.territoryId, need, paid: pay(need, group.territoryId, group.team.id) };
  });
  let structuresPaid = 0;
  for (const work of state.works.filter(item => item.phase === "ready")) structuresPaid += pay(defs.find(def => def.id === work.structureId)!.upkeepRav, work.territoryId, null);
  return { ...paidState, lastTeamSupply, lastTurnNeed: warWorksUpkeepV6(state, rules), lastTurnPaid: structuresPaid + lastTeamSupply.reduce((sum, item) => sum + item.paid, 0) };
}
export function warWorksSupplyPreviewV87(state: WarWorksSessionV6, rules: WarRulesV6 = DEFAULT_WAR_RULES_V6) {
  return supplyTurn(state, state, rules, false).lastTeamSupply;
}
const contextKey = (rules: WarRulesV6, definitions = warWorksDefinitionsV6(rules)) => JSON.stringify({ sha: rules.metadata.sha256,
  parameters: rules.parameters, units: rules.units, territories: rules.territories, passages: rules.passages, definitions });
export const warWorksCommandPointsV6 = (state: WarWorksSessionV6, rules: WarRulesV6 = DEFAULT_WAR_RULES_V6) =>
  state.teams.reduce((total, group) => total + (unitFor(rules, group.team.unitId)?.commandPoints ?? 0), 0)
  + state.recruits.filter(order => order.status === "pending").reduce((total, order) => total + (unitFor(rules, order.unitId)?.commandPoints ?? 0), 0);
export const warWorksUpkeepV6 = (state: WarWorksSessionV6, rules: WarRulesV6 = DEFAULT_WAR_RULES_V6) =>
  state.teams.reduce((total, group) => total + (unitFor(rules, group.team.unitId)?.upkeepRav ?? 0), 0)
  + state.works.filter(work => work.phase === "ready").reduce((total, work) => total + (warWorksDefinitionsV6(rules).find(def => def.id === work.structureId)?.upkeepRav ?? 0), 0);

/** One equipped novice operator and a player-chosen finite front budget are
 * declared exercise hypotheses. They never allocate real campaign recruits. */
export function createWarWorksV6(startingRav = 80, startingUnitId = "W3-U17", rules: WarRulesV6 = DEFAULT_WAR_RULES_V6, supplyMode: "front" | "local" = "front"): WarWorksSessionV6 | null {
  const definitions = warWorksDefinitionsV6(rules), unit = unitFor(rules, startingUnitId);
  if (definitions.length !== 5 || !["front", "local"].includes(supplyMode) || !definitions.some(def => def.operatorUnitId === startingUnitId) || !unit
    || !Number.isSafeInteger(startingRav) || startingRav < 0 || startingRav > rules.parameters.rav_cap
    || !rules.territories.some(zone => zone.id === "W3-K01") || unit.commandPoints > rules.parameters.pc_cap_1) return null;
  const team = createWarTeamV6(startingUnitId, "v6-works-team-1", rules);
  if (!team) return null;
  return { version: 2, context: "free-workshop", rulesKey: contextKey(rules, definitions), sourceSha: rules.metadata.sha256,
    supplyMode, lots: [{ id: depotLotId, location: "depot", rav: startingRav, teamId: null, workId: null, steps: [] }], transfers: [],
    turn: 1, nextIdentity: 2, originId: "W3-K01", startingRav, ravStock: startingRav,
    teams: [{ team, territoryId: "W3-K01", route: null, payloadWorkId: null, dutyWorkId: null }], recruits: [], works: [], observed: [], closedPassageIds: [],
    accounts: { recruitmentReserved: 0, kitsReserved: 0, upkeepConsumed: 0 }, lastTurnNeed: 0, lastTurnPaid: 0, lastTeamSupply: [],
    reports: [{ turn: 1, text: "Exercice d’ouvrages : équipe équipée et budget choisis, sans territoire acquis, revenu automatique ou lien à la campagne.", sourceIds: ["W3-R01", "W3-R07", "W3-R19"] }] };
}

function validSession(state: WarWorksSessionV6, rules: WarRulesV6, definitions: WarWorkDefinitionV6[]): boolean {
  try {
    const fields = ["version", "context", "rulesKey", "sourceSha", "supplyMode", "lots", "transfers", "turn", "nextIdentity", "originId", "startingRav", "ravStock", "teams", "recruits", "works", "observed", "closedPassageIds", "accounts", "lastTurnNeed", "lastTurnPaid", "lastTeamSupply", "reports"];
    if (!state || Object.keys(state).some(key => !fields.includes(key))) return false;
    if (state.version !== 2 || state.context !== "free-workshop" || state.sourceSha !== rules.metadata.sha256 || state.rulesKey !== contextKey(rules, definitions)
      || !["front", "local"].includes(state.supplyMode) || definitions.length !== 5 || !Number.isSafeInteger(state.turn) || state.turn < 1 || state.turn >= 10000
      || !Number.isSafeInteger(state.nextIdentity) || state.nextIdentity < 2 || state.nextIdentity > 200000
      || !Number.isSafeInteger(state.startingRav) || state.startingRav < 0 || state.startingRav > rules.parameters.rav_cap
      || !Number.isSafeInteger(state.ravStock) || state.ravStock < 0 || state.ravStock > state.startingRav
      || state.originId !== "W3-K01" || state.teams.length < 1 || state.teams.length > 12 || state.works.length > 108
      || warWorksCommandPointsV6(state, rules) > rules.parameters.pc_cap_1) return false;
    const ids = new Set<string>(), members = new Set<string>();
    for (const group of state.teams) {
      const unit = unitFor(rules, group.team.unitId);
      if (!unit || !definitions.some(def => def.operatorUnitId === unit.id) || group.team.version !== 1 || group.team.context !== "free"
        || typeof group.team.id !== "string" || !group.team.id || group.team.id.length > 160
        || ids.has(group.team.id) || !rules.territories.some(zone => zone.id === group.territoryId)
        || !Number.isFinite(group.team.fatigue) || group.team.fatigue < 0 || group.team.fatigue > rules.parameters.fatigue_max
        || group.team.members.length !== unit.fullMembers || ![null, "A", "B"].includes(group.team.specialization)
        || !Array.isArray(group.team.resultReceipts) || new Set(group.team.resultReceipts).size !== group.team.resultReceipts.length
        || group.team.resultReceipts.length > 1000 || group.team.resultReceipts.some(id => typeof id !== "string" || !/^[a-zA-Z0-9:_-]{1,150}$/.test(id))
        || (group.team.resolvedResultIds !== undefined && (!Array.isArray(group.team.resolvedResultIds)
          || new Set(group.team.resolvedResultIds).size !== group.team.resolvedResultIds.length || group.team.resolvedResultIds.length > 1000
          || group.team.resolvedResultIds.some(id => typeof id !== "string" || !/^[a-zA-Z0-9:_-]{1,150}$/.test(id))))) return false;
      ids.add(group.team.id);
      for (const member of group.team.members) {
        if (typeof member.id !== "string" || !member.id || member.id.length > 180 || typeof member.name !== "string" || member.name.length > 180
          || members.has(member.id) || member.assignmentId !== group.team.id || !["fit", "wounded", "dead"].includes(member.status)
          || !Number.isFinite(member.xp) || member.xp < 0 || member.xp > rules.parameters.xp_max) return false;
        members.add(member.id);
      }
      if (group.route !== null) {
        const route = group.route;
        if (!route || !Array.isArray(route.passageIds) || !Array.isArray(route.territoryIds) || route.passageIds.length < 1
          || route.passageIds.length > rules.territories.length || route.territoryIds.length !== route.passageIds.length + 1
          || route.territoryIds[0] !== group.territoryId || !Number.isSafeInteger(route.cost) || route.cost < 1
          || route.passageIds.some((id, index) => !rules.passages.some(passage => passage.id === id && passage.capacityPc >= unit.commandPoints
            && ((passage.fromId === route.territoryIds[index] && passage.toId === route.territoryIds[index + 1])
              || (passage.bidirectional && passage.toId === route.territoryIds[index] && passage.fromId === route.territoryIds[index + 1]))))
          || route.cost !== route.passageIds.reduce((sum, id) => sum + rules.passages.find(passage => passage.id === id)!.movementCost, 0)) return false;
      }
      if (group.payloadWorkId && !state.works.some(work => work.id === group.payloadWorkId && work.phase === "carried" && work.carrierTeamId === group.team.id)) return false;
      if (group.dutyWorkId && !state.works.some(work => work.id === group.dutyWorkId && work.operatorTeamId === group.team.id
        && work.territoryId === group.territoryId && ["building", "ready"].includes(work.phase))) return false;
    }
    const locations = new Set<string>();
    for (const work of state.works) {
      const def = definitions.find(item => item.id === work.structureId), key = `${work.structureId}:${work.territoryId}:${work.passageId ?? ""}`;
      if (!def || ids.has(work.id) || ids.has(work.kitId) || locations.has(key) || !rules.territories.some(zone => zone.id === work.territoryId)
        || work.costRav !== def.costRav || !Number.isInteger(work.workedTurns) || work.workedTurns < 0 || work.workedTurns > def.delayTurns
        || !["reserved", "carried", "delivered", "building", "ready"].includes(work.phase)
        || (work.phase === "ready") !== (work.workedTurns === def.delayTurns)) return false;
      ids.add(work.id); ids.add(work.kitId); locations.add(key);
      if (def.kind === "defense" ? !rules.passages.some(passage => passage.id === work.passageId && [passage.fromId, passage.toId].includes(work.territoryId)) : work.passageId !== null) return false;
      if (work.phase === "carried" ? !state.teams.some(group => group.team.id === work.carrierTeamId && group.payloadWorkId === work.id) : work.carrierTeamId !== null) return false;
      if (work.operatorTeamId && !state.teams.some(group => group.team.id === work.operatorTeamId && group.dutyWorkId === work.id
        && group.territoryId === work.territoryId && group.team.unitId === def.operatorUnitId)) return false;
    }
    for (const order of state.recruits) {
      const unit = unitFor(rules, order.unitId);
      if (!unit || !definitions.some(def => def.operatorUnitId === order.unitId) || ids.has(order.id) || order.costRav !== unit.recruitmentRav
        || !Number.isInteger(order.orderedTurn) || order.orderedTurn < 1 || order.orderedTurn > state.turn
        || order.readyTurn !== order.orderedTurn + unit.delayTurns || !["pending", "arrived"].includes(order.status)
        || (order.status === "pending" ? order.readyTurn <= state.turn || state.teams.some(group => group.team.id === order.teamId)
          : order.readyTurn > state.turn || !state.teams.some(group => group.team.id === order.teamId && group.team.unitId === order.unitId))) return false;
      ids.add(order.id);
    }
    if (new Set(state.recruits.map(order => order.teamId)).size !== state.recruits.length
      || new Set(state.observed.map(item => item.territoryId)).size !== state.observed.length
      || state.observed.some(item => !rules.territories.some(zone => zone.id === item.territoryId) || !state.teams.some(group => group.team.id === item.teamId)
        || !Number.isInteger(item.turn) || item.turn < 1 || item.turn > state.turn)
      || new Set(state.closedPassageIds).size !== state.closedPassageIds.length || state.closedPassageIds.some(id => !rules.passages.some(passage => passage.id === id))) return false;
    if (!Array.isArray(state.reports) || state.reports.length > 100 || state.reports.some(item => !item || !Number.isSafeInteger(item.turn)
      || item.turn < 1 || item.turn > state.turn || typeof item.text !== "string" || item.text.length > 4000 || !Array.isArray(item.sourceIds)
      || item.sourceIds.length > 20 || item.sourceIds.some(id => typeof id !== "string" || id.length > 100))) return false;
    if (!Array.isArray(state.lots) || state.lots.length < 1 || state.lots.length > 121 || !Array.isArray(state.transfers) || state.transfers.length > 50000
      || new Set(state.lots.map(lot => lot.id)).size !== state.lots.length || !state.lots.some(lot => lot.id === depotLotId && lot.location === "depot")
      || state.lots.some(lot => !Number.isSafeInteger(lot.rav) || lot.rav < 0 || lot.rav > state.startingRav
        || !Array.isArray(lot.steps) || lot.steps.length > 10000 || lot.steps.some(step => !Number.isSafeInteger(step.turn) || step.turn < 1 || step.turn > state.turn
          || !rules.passages.some(passage => passage.id === step.passageId && passage.permitsRav &&
            ((passage.fromId === step.fromId && passage.toId === step.toId) || (passage.bidirectional && passage.toId === step.fromId && passage.fromId === step.toId))))
        || (lot.location === "depot" ? lot.id !== depotLotId || lot.teamId !== null || lot.workId !== null || lot.steps.length !== 0
          : lot.location === "carrier" ? lot.id !== `rav:carrier:${lot.teamId}` || lot.workId !== null || lot.rav > WAR_RAV_CARRIER_LIMIT_V87
            || !state.teams.some(group => group.team.id === lot.teamId && group.team.unitId === "W3-U19" && (!lot.rav || !group.payloadWorkId))
          : lot.location === "cache" ? lot.id !== `rav:cache:${lot.workId}` || lot.teamId !== null || lot.rav > 20 || lot.steps.length !== 0
            || !state.works.some(work => work.id === lot.workId && work.structureId === "W3-S03" && work.phase === "ready") : true))
      || (state.supplyMode === "front" && state.lots.length !== 1)) return false;
    const balances = new Map(state.lots.map(lot => [lot.id, lot.id === depotLotId ? state.startingRav : 0]));
    const spending = { recruitment: 0, kit: 0, upkeep: 0 }, transferIds = new Set<string>();
    let lastTransferTurn = 1;
    for (const tx of state.transfers) {
      const from = state.lots.find(lot => lot.id === tx.fromId), to = state.lots.find(lot => lot.id === tx.toId);
      if (!from || transferIds.has(tx.id) || !/^rav-tx:\d+$/.test(tx.id) || Number(tx.id.slice(7)) < 2 || Number(tx.id.slice(7)) >= state.nextIdentity
        || !Number.isSafeInteger(tx.rav) || tx.rav < 1
        || !Number.isSafeInteger(tx.turn) || tx.turn < lastTransferTurn || tx.turn > state.turn || (balances.get(tx.fromId) ?? 0) < tx.rav
        || !Array.isArray(tx.steps) || tx.steps.length > 10000 || tx.steps.some(step => !Number.isSafeInteger(step.turn) || step.turn > tx.turn || step.turn < 1
          || !rules.passages.some(passage => passage.id === step.passageId && passage.permitsRav &&
            ((passage.fromId === step.fromId && passage.toId === step.toId) || (passage.bidirectional && passage.toId === step.fromId && passage.fromId === step.toId))))) return false;
      lastTransferTurn = tx.turn; transferIds.add(tx.id);
      if (tx.toId === null) {
        if (!["recruitment", "kit", "upkeep"].includes(tx.purpose) || (tx.purpose !== "upkeep" && from.location !== "depot")) return false;
        spending[tx.purpose as keyof typeof spending] += tx.rav;
      } else {
        if (!to || to.id === from.id || state.supplyMode !== "local" ||
          (tx.purpose === "load" ? from.location !== "depot" || to.location !== "carrier"
            : tx.purpose === "deposit" ? from.location !== "carrier" || to.location !== "cache"
            : tx.purpose === "withdraw" ? from.location !== "cache" || to.location !== "carrier"
            : tx.purpose === "return" ? from.location !== "carrier" || to.location !== "depot" : true)) return false;
        balances.set(to.id, balances.get(to.id)! + tx.rav);
      }
      balances.set(from.id, balances.get(from.id)! - tx.rav);
    }
    if (state.lots.some(lot => balances.get(lot.id) !== lot.rav) || state.lots.reduce((sum, lot) => sum + lot.rav, 0) !== state.ravStock
      || new Set(state.lastTeamSupply.map(item => item.teamId)).size !== state.lastTeamSupply.length
      || state.lastTeamSupply.some(item => !state.teams.some(group => group.team.id === item.teamId && unitFor(rules, group.team.unitId)?.upkeepRav === item.need) || !rules.territories.some(zone => zone.id === item.territoryId)
        || !Number.isSafeInteger(item.need) || item.need < 0 || !Number.isSafeInteger(item.paid) || item.paid < 0 || item.paid > item.need)) return false;
    const { recruitmentReserved, kitsReserved, upkeepConsumed } = state.accounts;
    return [recruitmentReserved, kitsReserved, upkeepConsumed, state.lastTurnNeed, state.lastTurnPaid].every(value => Number.isSafeInteger(value) && value >= 0)
      && state.lastTurnPaid <= state.lastTurnNeed && recruitmentReserved === state.recruits.reduce((sum, order) => sum + order.costRav, 0)
      && kitsReserved === state.works.reduce((sum, work) => sum + work.costRav, 0)
      && spending.recruitment === recruitmentReserved && spending.kit === kitsReserved && spending.upkeep === upkeepConsumed
      && state.ravStock === state.startingRav - recruitmentReserved - kitsReserved - upkeepConsumed;
  } catch { return false; }
}

/** Budget cadence is an explicitly separate exercise: wait, passage,
 * observation, work or rest advances one front turn. Upkeep is debited once
 * for each existing team and commissioned structure, never for the same
 * operator again as a garrison. New arrivals/works start upkeep next turn. */
export function applyWarWorksV6(state: WarWorksSessionV6, action: WarWorksActionV6, rules: WarRulesV6 = DEFAULT_WAR_RULES_V6): WarWorksTransitionV6 {
  const definitions = warWorksDefinitionsV6(rules);
  const deny = (message: string): WarWorksTransitionV6 => ({ state, accepted: false, changed: false, message });
  const unchanged = (message: string): WarWorksTransitionV6 => ({ state, accepted: true, changed: false, message });
  if (!validSession(state, rules, definitions)) return deny("État incompatible, identité copiée ou compte RAV incohérent ; aucun ordre appliqué.");
  const report = (next: WarWorksSessionV6, message: string, sourceIds: string[]): WarWorksTransitionV6 => ({
    state: { ...next, reports: [...state.reports, { turn: next.turn, text: message, sourceIds }].slice(-100) }, accepted: true, changed: true, message });
  const replaceTeam = (group: WarWorksTeamV6) => state.teams.map(item => item.team.id === group.team.id ? group : item);
  const turn = (next: WarWorksSessionV6): WarWorksSessionV6 => {
    const nextTurn = state.turn + 1, supplied = supplyTurn(state, { ...next, turn: nextTurn }, rules);
    const arriving = next.recruits.filter(order => order.status === "pending" && order.readyTurn <= nextTurn);
    return { ...supplied, turn: nextTurn,
      recruits: next.recruits.map(order => arriving.includes(order) ? { ...order, status: "arrived" } : order),
      teams: [...next.teams, ...arriving.map(order => ({ team: createWarTeamV6(order.unitId, order.teamId, rules)!, territoryId: state.originId, route: null, payloadWorkId: null, dutyWorkId: null }))] };
  };
  if (action.kind === "close-passages") {
    if (!Array.isArray(action.ids) || new Set(action.ids).size !== action.ids.length || action.ids.some(id => !rules.passages.some(passage => passage.id === id))) return deny("Choisissez seulement des passages V6 existants.");
    return report({ ...state, closedPassageIds: [...action.ids] }, "Hypothèse de passages mise à jour ; les kits restent à leur emplacement réel.", ["W3-R09"]);
  }
  if (action.kind === "wait") return report(turn(state), "Un tour écoulé ; entretien et arrivées comptés, aucun chantier achevé par attente seule.", ["W3-R10", "W3-R18", "W3-R19"]);
  if (action.kind === "recruit") {
    const unit = unitFor(rules, action.unitId);
    if (!unit || !definitions.some(def => def.operatorUnitId === unit.id)) return deny("Ce lot accueille seulement les opérateurs des cinq ouvrages raccordés.");
    if (warWorksDepotV87(state) < unit.recruitmentRav) return deny("RAV insuffisants au dépôt : les lots distants ne paient pas une formation au départ.");
    if (warWorksCommandPointsV6(state, rules) + unit.commandPoints > rules.parameters.pc_cap_1) return deny("Le plafond PC inclut déjà les volontaires en formation.");
    const id = `v6-works-recruit-${state.nextIdentity}`, teamId = `v6-works-team-${state.nextIdentity}`;
    const paid = transferRav(state, depotLotId, null, unit.recruitmentRav, "recruitment");
    return report({ ...paid, nextIdentity: paid.nextIdentity + 1,
      recruits: [...state.recruits, { id, teamId, unitId: unit.id, costRav: unit.recruitmentRav, orderedTurn: state.turn, readyTurn: state.turn + unit.delayTurns, status: "pending" }] },
    `Matériel et formation réservés : ${unit.recruitmentRav} RAV. Volontaires attendus au départ au tour ${state.turn + unit.delayTurns}, pas encore déployés.`, [unit.id, "W3-R18"]);
  }
  if (action.kind === "reserve-kit") {
    const def = definitions.find(item => item.id === action.structureId), zone = rules.territories.find(item => item.id === action.territoryId);
    if (!def || !zone || !state.observed.some(item => item.territoryId === zone.id)) return deny("Reconnaissez réellement le site avant de préparer un ouvrage.");
    const passageId = def.kind === "defense" ? action.passageId ?? null : null;
    if (def.kind === "defense" && !rules.passages.some(passage => passage.id === passageId && [passage.fromId, passage.toId].includes(zone.id))) return deny("Le seuil doit protéger un passage documenté adjacent au site.");
    if (state.works.some(work => work.structureId === def.id && work.territoryId === zone.id && work.passageId === passageId)) return unchanged("Cet ouvrage et son kit existent déjà ; aucun second débit.");
    if (warWorksDepotV87(state) < def.costRav) return deny("Le kit manque de moyens au dépôt ; les réserves distantes ne sont pas téléportées.");
    const id = `v6-works-order-${state.nextIdentity}`;
    const paid = transferRav(state, depotLotId, null, def.costRav, "kit");
    return report({ ...paid, nextIdentity: paid.nextIdentity + 1,
      works: [...state.works, { id, kitId: `kit:${id}`, structureId: def.id, territoryId: zone.id, passageId, phase: "reserved", costRav: def.costRav,
        workedTurns: 0, carrierTeamId: null, operatorTeamId: null }] },
    `Kit ${id} réservé au départ : ${def.costRav} RAV. Il n’est ni arrivé à ${zone.id}, ni installé.`, [def.id, "W3-R19", "W3-OBJ05", "W3-OBJ07"]);
  }
  const group = state.teams.find(item => item.team.id === action.teamId);
  if (!group) return deny("Cette équipe n’est pas présente dans l’exercice.");
  const unit = unitFor(rules, group.team.unitId)!;
  if (action.kind === "load-rav") {
    if (state.supplyMode !== "local" || unit.id !== "W3-U19" || fitMembers(group).length !== unit.fullMembers
      || group.territoryId !== state.originId || group.dutyWorkId || group.payloadWorkId || carryingRav(state, group)
      || !Number.isSafeInteger(action.rav) || action.rav < 1 || action.rav > WAR_RAV_CARRIER_LIMIT_V87 || action.rav > warWorksDepotV87(state))
      return deny("Chargez 1 à 20 RAV présents au dépôt avec des récupérateurs complets et libres. Le gabarit de portage de l’exercice n’est pas un tonnage canonique.");
    const lot: WarRavLotV87 = { id: `rav:carrier:${group.team.id}`, location: "carrier", rav: 0, teamId: group.team.id, workId: null, steps: [] };
    return report(transferRav({ ...state, teams: replaceTeam({ ...group, route: null }) }, depotLotId, lot, action.rav, "load"),
      `${action.rav} RAV retirés du dépôt et chargés dans ${lot.id} ; aucune livraison distante.`, ["W3-U19", "W3-R08", "W3-OBJ05"]);
  }
  if (action.kind === "return-rav") {
    const lot = state.lots.find(item => item.location === "carrier" && item.teamId === group.team.id);
    if (state.supplyMode !== "local" || group.territoryId !== state.originId || !fitMembers(group).length) return deny("Le transport doit revenir physiquement au dépôt avec un porteur apte pour y restituer son reliquat.");
    if (!lot?.rav) return unchanged("Aucun reliquat RAV à restituer ; aucun crédit répété.");
    return report(transferRav(state, lot.id, state.lots.find(item => item.id === depotLotId)!, lot.rav, "return"), "Reliquat déchargé au dépôt réel, sans revenu ni remboursement de ressources déjà consommées.", ["W3-R08", "W3-OBJ05"]);
  }
  if (action.kind === "deposit-rav" || action.kind === "withdraw-rav") {
    const lot = state.lots.find(item => item.location === "carrier" && item.teamId === group.team.id), cache = state.works.find(item => item.id === action.workId);
    if (state.supplyMode !== "local" || !cache || cache.structureId !== "W3-S03" || cache.phase !== "ready" || group.territoryId !== cache.territoryId
      || unit.id !== "W3-U19" || fitMembers(group).length !== unit.fullMembers) return deny("Le vrai porteur doit atteindre une cache installée avec son équipe complète ; le stock ne traverse pas la carte.");
    if (action.kind === "withdraw-rav") {
      if (group.dutyWorkId || group.payloadWorkId || carryingRav(state, group) || !Number.isSafeInteger(action.rav)
        || action.rav < 1 || action.rav > WAR_RAV_CARRIER_LIMIT_V87 || action.rav > warWorksCacheRavV87(state, cache.id))
        return deny("Prélevez seulement les RAV présents dans cette cache avec des récupérateurs libres, sans autre charge.");
      const destination: WarRavLotV87 = { id: `rav:carrier:${group.team.id}`, location: "carrier", rav: 0, teamId: group.team.id, workId: null, steps: [] };
      return report(transferRav({ ...state, teams: replaceTeam({ ...group, route: null }) }, `rav:cache:${cache.id}`, destination, action.rav, "withdraw"),
        `${action.rav} RAV retirés de ${cache.id} et portés par ${group.team.id}. Le dépôt n’est pas encore crédité.`, ["W3-S03", "W3-U19", "W3-R08", "W3-OBJ05"]);
    }
    if (!lot?.rav) return unchanged("Ce porteur n’a plus de RAV à livrer ; aucun crédit répété.");
    const amount = Math.min(lot.rav, 20 - warWorksCacheRavV87(state, cache.id));
    if (amount === 0) return unchanged("Cache pleine : le surplus reste identifié sur le transport, sans perte ni remboursement.");
    const destination: WarRavLotV87 = { id: `rav:cache:${cache.id}`, location: "cache", rav: 0, teamId: null, workId: cache.id, steps: [] };
    return report(transferRav(state, lot.id, destination, amount, "deposit"),
      `${amount} RAV livrés dans ${cache.id} au site ${cache.territoryId}. Reliquat transporté : ${lot.rav - amount} RAV.`, ["W3-S03", "W3-R08", "W3-OBJ05"]);
  }
  if (action.kind === "release") {
    if (!group.dutyWorkId) return unchanged("Cette équipe n’est affectée à aucun ouvrage.");
    return report({ ...state, teams: replaceTeam({ ...group, dutyWorkId: null }), works: state.works.map(work => work.id === group.dutyWorkId ? { ...work, operatorTeamId: null } : work) },
      "Opérateurs libérés ; le chantier garde son avancement et l’ouvrage perd ses effets occupés.", ["W3-R01", "W3-R19"]);
  }
  if (action.kind === "specialize") {
    const team = selectWarSpecializationV6(group.team, action.branch, rules);
    return team === group.team ? deny("Seuil non atteint ou spécialisation déjà verrouillée.") : report({ ...state, teams: replaceTeam({ ...group, team }) }, "Spécialisation confirmée pour les mêmes membres ; pas de copie d’équipe.", ["W3-R14"]);
  }
  if (!fitMembers(group).length) return deny("Aucun membre apte et affecté à cette équipe ne peut agir.");
  if (action.kind === "plan") {
    if (group.dutyWorkId) return deny("Libérez d’abord les opérateurs de leur ouvrage.");
    const route = planWarRouteV6(group.territoryId, action.destinationId, unit.commandPoints, state.closedPassageIds, rules, group.payloadWorkId || carryingRav(state, group) ? "rav" : "none");
    return !route ? deny("Aucune route admissible pour cette équipe et son kit.") : !route.passageIds.length ? unchanged("L’équipe est déjà au site demandé.")
      : report({ ...state, teams: replaceTeam({ ...group, route }) }, "Trajet préparé ; ni l’équipe ni le kit ne sont encore arrivés.", ["W3-R04", "W3-R09"]);
  }
  if (action.kind === "advance") {
    const route = group.route, passage = rules.passages.find(item => item.id === route?.passageIds[0]), destination = route?.territoryIds[1];
    if (group.dutyWorkId || !route || route.territoryIds[0] !== group.territoryId || !passage || !destination || state.closedPassageIds.includes(passage.id)
      || passage.capacityPc < unit.commandPoints || ((group.payloadWorkId || carryingRav(state, group)) && !passage.permitsRav)
      || !((passage.fromId === group.territoryId && passage.toId === destination) || (passage.bidirectional && passage.toId === group.territoryId && passage.fromId === destination))) return deny("Le prochain passage est fermé, trop étroit ou impropre au kit ; aucune téléportation ni dépense.");
    const remaining = route.passageIds.length > 1 ? { passageIds: route.passageIds.slice(1), territoryIds: route.territoryIds.slice(1), cost: route.cost - passage.movementCost } : null;
    return report(turn({ ...state, lots: state.lots.map(lot => lot.location === "carrier" && lot.teamId === group.team.id && lot.rav > 0
      ? { ...lot, steps: [...lot.steps, { passageId: passage.id, fromId: group.territoryId, toId: destination, turn: state.turn + 1 }] } : lot),
      teams: replaceTeam({ ...group, territoryId: destination, route: remaining,
      team: { ...group.team, fatigue: Math.min(rules.parameters.fatigue_max, group.team.fatigue + rules.parameters.march_fatigue) } }) }),
    `${group.team.id} a franchi ${passage.id} et atteint ${destination}${group.payloadWorkId ? " avec son kit identifié" : ""}. Aucun contrôle territorial acquis.`, [passage.id, "W3-R04", "W3-R09", "W3-R11"]);
  }
  if (action.kind === "observe") {
    if (state.observed.some(item => item.territoryId === group.territoryId)) return unchanged("Ce renseignement est déjà connu du front d’exercice ; aucun gain répété avec une autre équipe.");
    const result = applyWarResultV6(group.team, { operationId: `works:recon:${group.territoryId}`, resultId: `works:intel:${group.territoryId}`,
      mode: "strategic", objective: "recon", participantIds: fitMembers(group).map(member => member.id), final: true }, rules);
    if (!result.accepted || !result.changed) return deny("Le résultat de reconnaissance est déjà résolu ou invalide.");
    return report(turn({ ...state, teams: replaceTeam({ ...group, team: result.state }), observed: [...state.observed, { territoryId: group.territoryId, teamId: group.team.id, turn: state.turn + 1 }] }),
      `Site ${group.territoryId} reconnu au tour ${state.turn + 1} ; ${rules.parameters.xp_recon} XP aux membres présents, sans annexion.`, ["W3-UP04", "W3-R05"]);
  }
  const work = state.works.find(item => item.id === action.workId), def = definitions.find(item => item.id === work?.structureId);
  if (!work || !def) return deny("Cet ouvrage n’existe pas dans l’exercice.");
  const replaceWork = (next: WarWorkOrderV6) => state.works.map(item => item.id === next.id ? next : item);
  if (action.kind === "load") {
    if (work.phase !== "reserved" || group.territoryId !== state.originId || group.payloadWorkId || group.dutyWorkId || carryingRav(state, group)) return deny("Chargez ce kit au départ avec une équipe libre sans autre lot ; il ne peut pas être dans deux transports.");
    return report({ ...state, teams: replaceTeam({ ...group, payloadWorkId: work.id, route: null }), works: replaceWork({ ...work, phase: "carried", carrierTeamId: group.team.id }) },
      `${work.kitId} chargé par ${group.team.id}. Préparez un trajet compatible RAV.`, ["W3-R08", "W3-R09", "W3-OBJ05"]);
  }
  if (action.kind === "unload") {
    if (work.phase !== "carried" || work.carrierTeamId !== group.team.id || group.payloadWorkId !== work.id || group.territoryId !== work.territoryId) return deny("Le bon kit doit atteindre son site réel avant livraison.");
    return report({ ...state, teams: replaceTeam({ ...group, payloadWorkId: null }), works: replaceWork({ ...work, phase: "delivered", carrierTeamId: null }) },
      `${work.kitId} livré au site ${work.territoryId}. La livraison ne termine pas les ${def.delayTurns} tours de travaux.`, [def.id, "W3-OBJ05", "W3-OBJ07"]);
  }
  if (action.kind === "rest") {
    const operator = state.teams.find(item => item.team.id === work.operatorTeamId);
    if (def.kind !== "rest" || work.phase !== "ready" || group.territoryId !== work.territoryId || !operator
      || operator.territoryId !== work.territoryId || fitMembers(operator).length !== unitFor(rules, def.operatorUnitId)?.fullMembers) return deny("Le repos exige un abri installé et ses opérateurs présents au même site.");
    if (!group.team.fatigue) return unchanged("L’équipe est déjà reposée ; aucun tour gratuit consommé.");
    return report(turn({ ...state, teams: replaceTeam({ ...group, team: { ...group.team, fatigue: Math.max(0, group.team.fatigue - rules.parameters.rest_fatigue_reduction) } }) }),
      "Un tour équipé de repos accompli : fatigue réduite, aucune guérison ou résurrection.", [def.id, "W3-R11", "W3-R15"]);
  }
  if (group.team.unitId !== def.operatorUnitId || group.territoryId !== work.territoryId || group.payloadWorkId
    || fitMembers(group).length !== unit.fullMembers || (group.dutyWorkId && group.dutyWorkId !== work.id)
    || (work.operatorTeamId && work.operatorTeamId !== group.team.id)) return deny("Cet ouvrage exige son équipe d’opérateurs complète, présente et disponible.");
  if (action.kind === "assign") {
    if (work.phase !== "ready") return deny("La mise en service doit être terminée avant affectation.");
    if (group.dutyWorkId === work.id) return unchanged("Cette équipe occupe déjà ce poste.");
    return report({ ...state, teams: replaceTeam({ ...group, dutyWorkId: work.id, route: null }), works: replaceWork({ ...work, operatorTeamId: group.team.id }) }, "Opérateurs affectés à leur ouvrage réel, sans copie de garnison.", [def.id, "W3-R19"]);
  }
  if (action.kind === "work") {
    if (work.phase === "ready") return unchanged("Cet ouvrage est déjà en service ; ni chantier ni récompense répétés.");
    if (!["delivered", "building"].includes(work.phase)) return deny("Les pièces ne sont pas encore livrées sur ce site.");
    const workedTurns = work.workedTurns + 1, ready = workedTurns === def.delayTurns;
    return report(turn({ ...state, teams: replaceTeam({ ...group, dutyWorkId: work.id, route: null }),
      works: replaceWork({ ...work, workedTurns, phase: ready ? "ready" : "building", operatorTeamId: group.team.id }) }),
    `${def.name} : ${workedTurns}/${def.delayTurns} tours réellement travaillés${ready ? ", mise en service accomplie" : ", opérateurs immobilisés"}. Aucune XP de construction inventée.`, [def.id, "W3-R19", "W3-OBJ07"]);
  }
  return deny("Ordre d’ouvrages inconnu.");
}

export function warWorkOccupiedV6(state: WarWorksSessionV6, work: WarWorkOrderV6, rules: WarRulesV6 = DEFAULT_WAR_RULES_V6): boolean {
  const def = warWorksDefinitionsV6(rules).find(item => item.id === work.structureId), group = state.teams.find(item => item.team.id === work.operatorTeamId);
  return !!def && work.phase === "ready" && !!group && group.dutyWorkId === work.id && group.territoryId === work.territoryId
    && group.team.unitId === def.operatorUnitId && fitMembers(group).length === unitFor(rules, def.operatorUnitId)?.fullMembers;
}
export function estimateWarWorksTeamV6(state: WarWorksSessionV6, teamId: string, passageId: string | null = null, rules: WarRulesV6 = DEFAULT_WAR_RULES_V6) {
  const group = state.teams.find(item => item.team.id === teamId);
  if (!group) return null;
  const zone = rules.territories.find(item => item.id === group.territoryId);
  const supply = state.supplyMode === "local" ? warWorksSupplyPreviewV87(state, rules).find(item => item.teamId === teamId) : null;
  const base = estimateWarTeamV6({ unitId: group.team.unitId, xp: warTeamExperienceV6(group.team), fatigue: group.team.fatigue,
    deployableMembers: fitMembers(group).length, availableRav: supply?.paid ?? state.ravStock, frontNeedRav: supply?.need ?? warWorksUpkeepV6(state, rules), terrainBonus: zone?.terrainDefense ?? 0, nextObjectiveXp: 0 }, rules);
  const occupied = state.works.find(work => work.structureId === "W3-S07" && work.territoryId === group.territoryId && work.passageId === passageId && warWorkOccupiedV6(state, work, rules));
  const defensePercent = occupied ? warWorksDefinitionsV6(rules).find(item => item.id === occupied.structureId)?.defensePercent ?? 0 : 0;
  return { ...base, defensePercent, protectedDefense: base.defense === null ? null : Math.floor(base.defense * (1 + defensePercent / 100)) };
}

/** Standalone checkpoint only. No SaveGame, roster or cloud field is accepted.
 * Version 1 was memory-only and has no transfer proof, so it is not guessed. */
export function exportWarWorksV87(state: WarWorksSessionV6, rules: WarRulesV6 = DEFAULT_WAR_RULES_V6): string | null {
  if (!validSession(state, rules, warWorksDefinitionsV6(rules))) return null;
  const text = JSON.stringify({ format: "yautja-clan-works-v87", version: 2, exercise: state }, null, 2);
  return text.length <= 12000000 ? text : null;
}
export function importWarWorksV87(text: string, rules: WarRulesV6 = DEFAULT_WAR_RULES_V6): { state: WarWorksSessionV6 | null; message: string } {
  if (typeof text !== "string" || text.length > 12000000) return { state: null, message: "Point de reprise absent ou trop volumineux." };
  try {
    const file = JSON.parse(text);
    if (!file || file.format !== "yautja-clan-works-v87" || file.version !== 2 || !validSession(file.exercise, rules, warWorksDefinitionsV6(rules)))
      return { state: null, message: "Reprise incompatible : version, contexte, source, identités ou comptes des lots incorrects. L’exercice présent est conservé." };
    return { state: file.exercise, message: "Exercice repris avec ses personnes, kits, routes, stocks locaux et transferts. Aucun gain de campagne." };
  } catch { return { state: null, message: "Fichier de reprise illisible ; l’exercice présent est conservé." }; }
}
