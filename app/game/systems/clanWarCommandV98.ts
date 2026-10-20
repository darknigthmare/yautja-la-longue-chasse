import {
  warBudgetV85, warGarrisonV85, warOrderCostV85, warOrderIssueV85, warOrderSlotV85,
  warObjectiveCorridorV96, warSuppliedV85, warTerritoriesForSimulationV96, warUpkeepV85,
  type WarBudgetV85, type WarOrderV85, type WarSimulationV85,
} from "./clanWarV85";
import { warAtlasIntelV95 } from "./clanWarAtlasV95";

const PLAYER = "CON-F01";
const empty = (): WarBudgetV85 => ({ s: 0, m: 0, i: 0 });
const add = (a: WarBudgetV85, b: WarBudgetV85): WarBudgetV85 => ({ s: a.s + b.s, m: a.m + b.m, i: a.i + b.i });
const subtract = (a: WarBudgetV85, b: WarBudgetV85): WarBudgetV85 => ({ s: a.s - b.s, m: a.m - b.m, i: a.i - b.i });
// A convoy transfers stock between player depots; it does not consume it.
const consumed = (order: Pick<WarOrderV85, "kind" | "cargo">) => order.kind === "logistics" ? empty() : warOrderCostV85(order);
export type WarOrderDraftV98 = Omit<WarOrderV85, "id" | "factionId" | "mode">;

/** A read-only command view. Foreign stocks and individual rosters never enter it. */
export function warCommandV98(state: WarSimulationV85) {
  const definitions = warTerritoriesForSimulationV96(state);
  const supplied = warSuppliedV85(state);
  const reservedIds = new Set(state.orders.flatMap(order => order.combatantIds));
  const sites = definitions.filter(site => state.territories[site.id].controller === PLAYER).map(site => {
    const local = state.combatants.filter(actor => actor.factionId === PLAYER && actor.territoryId === site.id);
    const ready = local.filter(actor => actor.status === "fit" && actor.trainingUntilTurn === null);
    const reserved = state.orders.filter(order => order.fromId === site.id).reduce((total, order) => add(total, warOrderCostV85(order)), empty());
    const garrison = warGarrisonV85(state, site.id).length;
    const linked = supplied.has(site.id);
    const intact = state.territories[site.id].installationIntact;
    const frontierIds = site.neighbors.filter(id => state.territories[id].controller === "CON-F02");
    const wounded = local.filter(actor => actor.status === "wounded" && actor.trainingUntilTurn === null).length;
    return {
      id: site.id, name: site.name, region: site.region, neighbors: [...site.neighbors], frontierIds,
      supplied: linked, intact, garrison, ready: ready.length,
      available: ready.filter(actor => !reservedIds.has(actor.id)).length, wounded,
      stock: { ...state.stocks[site.id] }, reserved, availableStock: subtract(state.stocks[site.id], reserved),
      income: linked && intact && garrison > 0 ? { ...site.income } : empty(),
      producing: linked && intact && garrison > 0,
      priority: (!linked ? 8 : 0) + (!intact ? 8 : 0) + (garrison === 0 ? 4 : 0) + (wounded > 0 ? 2 : 0) + (frontierIds.length > 0 ? 1 : 0),
    };
  }).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  const income = sites.reduce((total, site) => add(total, site.income), empty());
  const reserved = state.orders.reduce((total, order) => add(total, warOrderCostV85(order)), empty());
  const regions = [...new Set(definitions.map(site => site.region))].map(name => {
    const ids = definitions.filter(site => site.region === name).map(site => site.id);
    const own = sites.filter(site => ids.includes(site.id));
    return {
      name, total: ids.length, controlled: own.length,
      supplied: own.filter(site => site.supplied).length, intact: own.filter(site => site.intact).length,
      guarded: own.filter(site => site.garrison > 0).length,
      ready: own.filter(site => site.supplied && site.intact && site.garrison > 0).length,
    };
  });
  const corridorIds = state.planetId && state.planetId !== "korthas" ? warObjectiveCorridorV96(state)
    : ["CON-T01", "CON-T08", "CON-T14", "CON-T15", "CON-T21", "CON-T22"];
  const corridor = corridorIds.map(id => {
    const site = sites.find(item => item.id === id);
    return { id, controlled: !!site, supplied: site?.supplied ?? false, intact: site?.intact ?? false, guarded: (site?.garrison ?? 0) > 0,
      ready: !!site && site.supplied && site.intact && site.garrison > 0 };
  });
  const transits = definitions.filter(site => state.territories[site.id].controller === "CON-F03" && (state.territories[site.id].transitUntilTurn ?? -1) >= state.turn)
    .map(site => ({ id: site.id, expires: state.territories[site.id].transitUntilTurn! }));
  return {
    sites, regions, corridor, transits, income, reserved, upkeep: warUpkeepV85(state),
    upkeepAvailable: warBudgetV85(state).s - state.orders.reduce((total, order) => total + consumed(order).s, 0),
    corridorBaseLinked: supplied.has("CON-T02"),
    slots: (["operation", "logistics", "diplomacy"] as const).map(kind => ({ kind, used: state.orders.filter(order => warOrderSlotV85(order.kind) === kind).length, limit: kind === "operation" ? 2 : 1 })),
  };
}
export type WarCommandV98 = ReturnType<typeof warCommandV98>;

/** Validate with the actual resolver; warnings describe known own forces only. */
export function warOrderPreviewV98(state: WarSimulationV85, draft: WarOrderDraftV98) {
  const order: WarOrderV85 = { ...draft, id: "command-preview", factionId: PLAYER, mode: "auto" };
  const issue = warOrderIssueV85(state, order);
  const cost = warOrderCostV85(order);
  const ownOrigin = state.territories[draft.fromId]?.controller === PLAYER;
  const stock = ownOrigin ? { ...state.stocks[draft.fromId] } : null;
  const reserved = ownOrigin ? state.orders.filter(item => item.fromId === draft.fromId).reduce((total, item) => add(total, warOrderCostV85(item)), empty()) : empty();
  const available = stock ? subtract(stock, reserved) : null;
  const warnings: string[] = [];
  const moves = ["move", "attack", "cession", "logistics", "evacuate"].includes(draft.kind);
  const leaving = new Set([...state.orders.filter(item => item.fromId === draft.fromId && ["move", "attack", "cession", "logistics", "evacuate"].includes(item.kind)).flatMap(item => item.combatantIds), ...(moves ? draft.combatantIds : [])]);
  if (ownOrigin && moves && draft.combatantIds.length && warGarrisonV85(state, draft.fromId).length > 0 &&
    warGarrisonV85(state, draft.fromId).every(actor => leaving.has(actor.id))) warnings.push("Tous les gardes du départ sont engagés : si ces déplacements aboutissent, ce site perdra sa production jusqu’à une nouvelle garnison.");
  if (ownOrigin && ["attack", "cession"].includes(draft.kind) && !warSuppliedV85(state).has(draft.fromId)) warnings.push(draft.kind === "attack"
    ? "Le départ est isolé : même un assaut remporté ne validera pas l’occupation sans liaison de ravitaillement."
    : "Le départ est isolé : cette cession ne suffit pas à rétablir une liaison avec votre base.");
  const intel = warAtlasIntelV95(state, draft.targetId);
  if (draft.kind === "attack" && intel.kind === "unknown") warnings.push("Effectif adverse inconnu. Une reconnaissance datée permet d’évaluer le détachement avant l’assaut.");
  if (draft.kind === "attack" && intel.stale) warnings.push("Le dernier renseignement est ancien : l’effectif présent peut avoir changé.");
  if (draft.kind === "logistics" && cost.s + cost.m + cost.i === 0) warnings.push("Ce convoi ne transporte aucun lot ; ses porteurs se déplaceront malgré tout.");
  const totalConsumed = state.orders.reduce((total, item) => total + consumed(item).s, 0);
  const upkeepAvailable = warBudgetV85(state).s - totalConsumed - consumed(order).s;
  if (upkeepAvailable < warUpkeepV85(state)) warnings.push(`Après ces réservations, S${Math.max(0, upkeepAvailable)} reste pour un entretien actuel de S${warUpkeepV85(state)}. Les conquêtes et pertes peuvent modifier ce montant.`);
  return { issue, cost, available, after: available ? subtract(available, cost) : null, warnings, intel };
}
