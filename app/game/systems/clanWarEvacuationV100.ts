import type { WarCombatantV85, WarOrderV85, WarSimulationV85 } from "./clanWarV85";
import { warPlanetV96 } from "./clanWarPlanetsV96";

/** Exercise balance, not a numeric value imported from EVOL-R14. */
export const WAR_EVACUATION_ESCORTS_V100 = 2;
export const WAR_EVACUATION_COST_V100 = { s: 1, m: 0, i: 0 } as const;
type EvacuationOrder = Pick<WarOrderV85, "fromId" | "targetId" | "combatantIds" | "cargo">;

/** Both groups are the existing local roster. A wounded passenger never becomes
 * an able-bodied column member, even though the same order reserves both. */
export function warEvacuationManifestV100(state: WarSimulationV85, order: EvacuationOrder) {
  const people = order.combatantIds.map(id => state.combatants.find(actor => actor.id === id));
  const escorts = people.filter((actor): actor is WarCombatantV85 => actor?.status === "fit");
  const patients = people.filter((actor): actor is WarCombatantV85 => actor?.status === "wounded");
  return { escorts, patients, capacity: Math.floor(escorts.length / WAR_EVACUATION_ESCORTS_V100) };
}

/** Reused at reservation, archive import and immediately before expenditure.
 * No extra saved field, campaign identity or counter can stand in for a person. */
export function warEvacuationIssueV100(state: WarSimulationV85, order: EvacuationOrder): string | null {
  const source = warPlanetV96(state.planetId)?.definitions.find(site => site.id === order.fromId);
  if (!source || !source.neighbors.includes(order.targetId)) return "L’évacuation exige une route voisine du départ.";
  if (state.territories[order.fromId]?.controller !== "CON-F01" || state.territories[order.targetId]?.controller !== "CON-F01") return "Le départ et l’accueil des blessés doivent rester sous votre contrôle.";
  if (order.cargo.s !== 0 || order.cargo.m !== 0 || order.cargo.i !== 0) return "L’évacuation réserve les mains aux blessés ; aucun lot de fret ne peut être chargé.";
  if (new Set(order.combatantIds).size !== order.combatantIds.length || order.combatantIds.length > 8) return "L’évacuation compte au plus huit personnes distinctes, patients et escortes réunis.";
  const people = order.combatantIds.map(id => state.combatants.find(actor => actor.id === id));
  if (people.some(actor => !actor || actor.factionId !== "CON-F01" || actor.territoryId !== order.fromId || actor.trainingUntilTurn !== null || actor.status !== "fit" && actor.status !== "wounded")) return "Chaque escorte ou patient doit être présent, vivant et hors soins ou formation au départ.";
  const manifest = warEvacuationManifestV100(state, order);
  if (!manifest.patients.length) return "Affectez au moins un blessé réellement présent à évacuer.";
  if (manifest.patients.length > manifest.capacity) return "Chaque blessé demande deux escortes aptes ; complétez le détachement ou réduisez les patients.";
  return null;
}

/** A usable suggestion leaves existing guards in place. Manual selection can
 * engage them, with the same departure warning as other movements. */
export function warEvacuationSelectionV100(state: WarSimulationV85, territoryId: string): string[] {
  const reserved = new Set(state.orders.flatMap(order => order.combatantIds));
  const local = state.combatants.filter(actor => actor.factionId === "CON-F01" && actor.territoryId === territoryId && actor.trainingUntilTurn === null && !reserved.has(actor.id));
  const escorts = local.filter(actor => actor.status === "fit" && !actor.garrison);
  const patients = local.filter(actor => actor.status === "wounded").slice(0, Math.min(2, Math.floor(escorts.length / WAR_EVACUATION_ESCORTS_V100)));
  return [...escorts.slice(0, patients.length * WAR_EVACUATION_ESCORTS_V100), ...patients].map(actor => actor.id);
}

export function warEvacuationLeavesUnguardedV100(state: WarSimulationV85, order: EvacuationOrder): boolean {
  const guards = state.combatants.filter(actor => actor.factionId === "CON-F01" && actor.territoryId === order.fromId && actor.status === "fit" && actor.trainingUntilTurn === null && actor.garrison);
  const moving = new Set([...order.combatantIds, ...state.orders.filter(item => item.fromId === order.fromId && ["move", "attack", "cession", "logistics", "evacuate"].includes(item.kind)).flatMap(item => item.combatantIds)]);
  return guards.length > 0 && guards.every(actor => moving.has(actor.id));
}
