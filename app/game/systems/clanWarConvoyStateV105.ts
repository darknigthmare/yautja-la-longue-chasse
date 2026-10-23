import type { WarBudgetV85, WarOrderV85, WarSimulationV85 } from "./clanWarV85";
import type { WarTerritoryDefinitionV85 } from "./clanWarV85Data";

/** A plan is a sequence of depot deliveries, not a second, invisible stock. */
export interface WarConvoyRouteV105 {
  id: string;
  territoryIds: string[];
  combatantIds: string[];
  cargo: WarBudgetV85;
  completedOrderIds: string[];
  pendingOrderId: string | null;
}

export function matchesWarConvoyLegV105(route: WarConvoyRouteV105, order: WarOrderV85): boolean {
  const step = route.completedOrderIds.length;
  return order.id === route.pendingOrderId && order.kind === "logistics" && order.factionId === "CON-F01" &&
    order.fromId === route.territoryIds[step] && order.targetId === route.territoryIds[step + 1] &&
    order.combatantIds.length === route.combatantIds.length && order.combatantIds.every((id, index) => id === route.combatantIds[index]) &&
    (["s", "m", "i"] as const).every(key => order.cargo[key] === route.cargo[key]);
}

/** Called inside the same immutable turn transaction as the actual delivery. */
export function completeWarConvoyLegV105(state: WarSimulationV85, order: WarOrderV85): void {
  const route = state.convoyRouteV105;
  if (route && matchesWarConvoyLegV105(route, order)) {
    route.completedOrderIds.push(order.id);
    route.pendingOrderId = null;
  }
}

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const bounded = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 1000000;

/** This validator allows a blocked plan to survive a capture or a wounded
 * porter; it never turns that plan into permission to execute an order. */
export function validWarConvoyStateV105(state: WarSimulationV85, definitions: WarTerritoryDefinitionV85[]): boolean {
  if (state.version === 1) return !Object.hasOwn(state, "convoyRouteV105");
  if (state.version !== 2 || !Object.hasOwn(state, "convoyRouteV105")) return false;
  const value: unknown = state.convoyRouteV105;
  if (value === null) return true;
  if (state.revision >= 1000000) return false; // Every retained plan must remain removable.
  if (!record(value) || Object.keys(value).sort().join() !== "cargo,combatantIds,completedOrderIds,id,pendingOrderId,territoryIds" ||
    typeof value.id !== "string" || !/^convoy-v105-\d+-r\d+$/.test(value.id) || value.id.length > 100 ||
    !Array.isArray(value.territoryIds) || value.territoryIds.length < 2 || value.territoryIds.length > definitions.length ||
    !value.territoryIds.every(id => typeof id === "string" && definitions.some(site => site.id === id)) || new Set(value.territoryIds).size !== value.territoryIds.length ||
    !Array.isArray(value.combatantIds) || value.combatantIds.length < 1 || value.combatantIds.length > 8 || new Set(value.combatantIds).size !== value.combatantIds.length ||
    !value.combatantIds.every(id => typeof id === "string" && state.combatants.some(person => person.id === id && person.factionId === "CON-F01")) ||
    !record(value.cargo) || !bounded(value.cargo.s) || !bounded(value.cargo.m) || !bounded(value.cargo.i) || value.cargo.s + value.cargo.m + value.cargo.i === 0 ||
    !Array.isArray(value.completedOrderIds) || value.completedOrderIds.length >= value.territoryIds.length || new Set(value.completedOrderIds).size !== value.completedOrderIds.length ||
    !value.completedOrderIds.every(id => typeof id === "string" && state.appliedResultIds.includes(id) && state.reports.some(report => report.id === id && report.sourceIds.includes("CON-R10"))) ||
    !(value.pendingOrderId === null || typeof value.pendingOrderId === "string")) return false;
  const route = value as unknown as WarConvoyRouteV105;
  if (!route.territoryIds.every((id, index) => index === 0 || definitions.find(site => site.id === route.territoryIds[index - 1])!.neighbors.includes(id))) return false;
  if (route.pendingOrderId !== null && (state.revision >= 999999 || state.turn >= 5000 || state.appliedResultIds.includes(route.pendingOrderId) || !state.orders.some(order => matchesWarConvoyLegV105(route, order)))) return false;
  return true;
}
