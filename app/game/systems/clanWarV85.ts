import { CLAN_WAR_PARAMETERS_V85 as P, type WarFactionIdV85, type WarTerritoryDefinitionV85 } from "./clanWarV85Data";
import { WAR_PLANETS_V96, warPlanetV96 } from "./clanWarPlanetsV96";
import { parseWarPlanetRecipeCodeV103 } from "./clanWarProceduralV103";
import { warDeploymentV103 } from "./clanWarDeploymentV103";
import { WAR_EVACUATION_COST_V100, warEvacuationIssueV100, warEvacuationManifestV100 } from "./clanWarEvacuationV100";

export interface WarBudgetV85 { s: number; m: number; i: number }
export interface WarCombatantV85 {
  id: string; unitTypeId: string; factionId: WarFactionIdV85; territoryId: string;
  status: "fit" | "wounded" | "dead"; xp: number; garrison: boolean; trainingUntilTurn: number | null;
}
export interface WarTerritoryStateV85 { controller: WarFactionIdV85; installationIntact: boolean; transitUntilTurn: number | null }
export type WarOrderKindV85 = "move" | "attack" | "recon" | "cession" | "transit" | "logistics" | "heal" | "evacuate";
export interface WarOrderV85 {
  id: string; kind: WarOrderKindV85; fromId: string; targetId: string; combatantIds: string[];
  cargo: WarBudgetV85; mode: "auto"; factionId: WarFactionIdV85;
}
export interface WarObservationV85 { territoryId: string; turn: number; lower: number; upper: number; sourceId: string }
export interface WarReportV85 { id: string; turn: number; text: string; sourceIds: string[] }
export interface WarSimulationV85 {
  version: 1; context: "free"; planetId?: string; turn: number; seed: number; revision: number;
  combatants: WarCombatantV85[]; territories: Record<string, WarTerritoryStateV85>;
  stocks: Record<string, WarBudgetV85>; orders: WarOrderV85[]; observations: WarObservationV85[];
  appliedResultIds: string[]; reports: WarReportV85[]; totalStability: number; regionStability: number;
  corridorStability: number; completedObjectives: string[];
  stableRegionId: string | null;
  heldStocks: { territoryId: string; owner: WarFactionIdV85; budget: WarBudgetV85 }[];
}
export interface WarUpdateV85 { state: WarSimulationV85; accepted: boolean; message: string }
export const WAR_STORAGE_KEY_V85 = "yautja.clan-war.v85.free.v1";
/** Missing IDs are the original Korthas archive; every other theatre owns its own graph. */
export function warTerritoriesForSimulationV96(state: Pick<WarSimulationV85, "planetId">): WarTerritoryDefinitionV85[] {
  return warPlanetV96(state.planetId)?.definitions ?? [];
}
export function warTerritoryForSimulationV96(state: Pick<WarSimulationV85, "planetId">, id: string): WarTerritoryDefinitionV85 | undefined {
  return warTerritoriesForSimulationV96(state).find(territory => territory.id === id);
}
export function warPlanetStorageKeyV96(planetId = "korthas"): string {
  if (!warPlanetV96(planetId)) throw new RangeError("Unknown war planet");
  return planetId === "korthas" ? WAR_STORAGE_KEY_V85 : `yautja.clan-war.v96.planet.${planetId}.free.v1`;
}
export const WAR_PLANET_STORAGE_KEYS_V96: readonly string[] = Object.freeze(WAR_PLANETS_V96.map(planet => warPlanetStorageKeyV96(planet.id)));
export function warPlanetIdForStorageKeyV96(key: string): string | undefined {
  const index = WAR_PLANET_STORAGE_KEYS_V96.indexOf(key);
  if (index >= 0) return WAR_PLANETS_V96[index].id;
  const prefix = "yautja.clan-war.v96.planet.", suffix = ".free.v1";
  if (typeof key !== "string" || key.length > 200 || !key.startsWith(prefix) || !key.endsWith(suffix)) return undefined;
  const id = key.slice(prefix.length, -suffix.length);
  // The compact recipe is the identity. Validate canonical syntax without
  // generating a world while inspecting an arbitrary storage key.
  return parseWarPlanetRecipeCodeV103(id) ? id : undefined;
}
/** Validation reads without changing or serializing a backup's original bytes. */
export function validWarPlanetArchiveRawV96(raw: string, planetId: string): boolean {
  if (!warPlanetV96(planetId)) return false;
  try {
    const simulation = readWarSimulationV85(JSON.parse(raw));
    return simulation !== null && (simulation.planetId ?? "korthas") === planetId;
  } catch { return false; }
}
const PLAYER: WarFactionIdV85 = "CON-F01";
const ENEMY: WarFactionIdV85 = "CON-F02";
const NEUTRAL: WarFactionIdV85 = "CON-F03";
const emptyBudget = (): WarBudgetV85 => ({ s: 0, m: 0, i: 0 });
const copy = (state: WarSimulationV85): WarSimulationV85 => JSON.parse(JSON.stringify(state)) as WarSimulationV85;
const integer = (value: unknown, maximum = 1000000): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= maximum;
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const validBudget = (value: unknown): value is WarBudgetV85 => record(value) && integer(value.s) && integer(value.m) && integer(value.i);
const factions: WarFactionIdV85[] = [PLAYER, ENEMY, NEUTRAL];
function sum(a: WarBudgetV85, b: WarBudgetV85): WarBudgetV85 { return { s: a.s + b.s, m: a.m + b.m, i: a.i + b.i }; }
function fits(available: WarBudgetV85, cost: WarBudgetV85): boolean { return available.s >= cost.s && available.m >= cost.m && available.i >= cost.i; }
function debit(available: WarBudgetV85, cost: WarBudgetV85): void { available.s -= cost.s; available.m -= cost.m; available.i -= cost.i; }
export function warBudgetV85(state: WarSimulationV85, factionId: WarFactionIdV85 = PLAYER): WarBudgetV85 {
  return warTerritoriesForSimulationV96(state).filter(territory => state.territories[territory.id].controller === factionId)
    .reduce((budget, territory) => sum(budget, state.stocks[territory.id]), emptyBudget());
}
export function warFitCombatantsV85(state: WarSimulationV85, factionId: WarFactionIdV85 = PLAYER): WarCombatantV85[] {
  return state.combatants.filter(actor => actor.factionId === factionId && actor.status === "fit" && actor.trainingUntilTurn === null);
}
export function warGarrisonV85(state: WarSimulationV85, territoryId: string): WarCombatantV85[] {
  return state.combatants.filter(actor => actor.territoryId === territoryId && actor.factionId === state.territories[territoryId].controller && actor.status === "fit" && actor.garrison && actor.trainingUntilTurn === null);
}
export interface WarGarrisonDraftV99 {
  territoryId: string; combatantId: string; garrison: boolean; confirmLastGuard?: boolean;
}
/** A local reassignment consumes the same person, never a second roster slot.
 * Orders already sealed for this preparation own their people until cancelled. */
export function warGarrisonIssueV99(state: WarSimulationV85, draft: WarGarrisonDraftV99): string | null {
  if (!warPlanetV96(state.planetId) || !warTerritoryForSimulationV96(state, draft.territoryId)) return "Site absent du théâtre.";
  if (typeof draft.garrison !== "boolean" || draft.confirmLastGuard !== undefined && typeof draft.confirmLastGuard !== "boolean") return "Affectation de garde invalide.";
  if (state.territories[draft.territoryId]?.controller !== PLAYER) return "La relève exige un site sous votre commandement.";
  const actor = state.combatants.find(person => person.id === draft.combatantId);
  if (!actor || actor.factionId !== PLAYER || actor.territoryId !== draft.territoryId) return "Cette personne n’est pas présente dans votre détachement sur ce site.";
  if (actor.status !== "fit" || actor.trainingUntilTurn !== null) return "La garde exige une personne apte, hors soins ou formation.";
  if (state.orders.some(order => order.combatantIds.includes(actor.id))) return "Cette personne possède déjà un ordre réservé. Retirez cet ordre avant une relève.";
  if (actor.garrison === draft.garrison) return draft.garrison ? "Cette personne assure déjà la garde." : "Cette personne fait déjà partie des mobiles.";
  if (state.revision >= 1000000 || state.reports.length >= 100000) return "La limite de cette archive est atteinte. Aucune relève ajoutée.";
  if (!draft.garrison && warGarrisonV85(state, draft.territoryId).length === 1 && !draft.confirmLastGuard) return "Ce retrait laisse le site sans garde apte. Confirmez le retrait du dernier garde.";
  return null;
}
/** CON-R08/R12: reassign an identified person on site. Stocks, time, objectives
 * and income remain untouched; production is still evaluated at turn change. */
export function changeWarGarrisonV99(state: WarSimulationV85, draft: WarGarrisonDraftV99): WarUpdateV85 {
  const issue = warGarrisonIssueV99(state, draft);
  if (issue) return { state, accepted: false, message: issue };
  const next = copy(state), actor = next.combatants.find(person => person.id === draft.combatantId)!;
  actor.garrison = draft.garrison; next.revision++;
  const message = `${actor.id} · ${draft.territoryId} : ${draft.garrison ? "affecté à la garde sur place" : "remis dans le détachement mobile sur place"}. Aucun déplacement ni revenu immédiat.`;
  report(next, message, ["CON-R08", "CON-R12"], `garrison-${next.seed}-t${next.turn}-r${next.revision}`);
  return { state: next, accepted: true, message };
}
/** Supply roots are part of V103 world strategy; older fronts retain their bases. */
export function warHeadquartersV103(state: Pick<WarSimulationV85, "planetId">, factionId: WarFactionIdV85 = PLAYER): string | undefined {
  if (factionId !== "CON-F01" && factionId !== "CON-F02") return undefined;
  const procedural = warPlanetV96(state.planetId)?.procedural;
  return procedural && "strategy" in procedural ? procedural.strategy.headquarters[factionId] : factionId === PLAYER ? "CON-T01" : "CON-T25";
}
/** Transit is an access right. It never changes the sovereign flag or pays its income. */
export function warSuppliedV85(state: WarSimulationV85, factionId: WarFactionIdV85 = PLAYER): Set<string> {
  const headquarters = warHeadquartersV103(state, factionId), roots = headquarters ? [headquarters] : [];
  const accessible = (id: string) => !!state.territories[id] && (state.territories[id].controller === factionId ||
    (factionId === PLAYER && state.territories[id].controller === NEUTRAL && (state.territories[id].transitUntilTurn ?? -1) >= state.turn));
  const reached = new Set(roots.filter(id => accessible(id) && state.territories[id].installationIntact));
  const frontier = [...reached];
  while (frontier.length) {
    const id = frontier.shift()!;
    for (const neighbor of warTerritoryForSimulationV96(state, id)!.neighbors) {
      if (!reached.has(neighbor) && accessible(neighbor)) { reached.add(neighbor); frontier.push(neighbor); }
    }
  }
  return reached;
}
export function warUpkeepV85(state: WarSimulationV85, factionId: WarFactionIdV85 = PLAYER): number {
  const controlled = Object.values(state.territories).filter(territory => territory.controller === factionId).length;
  return Math.ceil(controlled / P.MAINT_C) + Math.ceil(warFitCombatantsV85(state, factionId).length / P.MAINT_A);
}
function report(state: WarSimulationV85, text: string, sourceIds: string[], id = `turn-${state.turn}-report-${state.reports.length + 1}`) {
  state.reports.push({ id, turn: state.turn, text, sourceIds });
}
function production(state: WarSimulationV85) {
  for (const factionId of [PLAYER, ENEMY]) {
    const supplied = warSuppliedV85(state, factionId);
    const income = emptyBudget();
    for (const definition of warTerritoriesForSimulationV96(state)) {
      const territory = state.territories[definition.id];
      if (territory.controller !== factionId || !territory.installationIntact || !supplied.has(definition.id) || warGarrisonV85(state, definition.id).length === 0) continue;
      state.stocks[definition.id] = sum(state.stocks[definition.id], definition.income);
      Object.assign(income, sum(income, definition.income));
    }
    report(state, `${factionId} · recettes localisées : S+${income.s}, M+${income.m}, I+${income.i}.`, ["CON-R12"]);
  }
}
/** Independent training scenario. The Pxx positions follow CON-TURN01; generated F/N identities are exercise actors. */
export function createWarSimulationV85(seed?: number, planetId?: string): WarSimulationV85 {
  const planet = warPlanetV96(planetId);
  if (!planet) throw new RangeError("Unknown war planet");
  const simulationSeed = seed ?? (planet.id === "korthas" ? 8507 : planet.seed);
  const state: WarSimulationV85 = {
    version: 1, context: "free", ...(planet.id === "korthas" ? {} : { planetId: planet.id }), turn: 1, seed: simulationSeed, revision: 0,
    combatants: [], territories: {}, stocks: {}, orders: [], observations: [], appliedResultIds: [], reports: [],
    totalStability: 0, regionStability: 0, corridorStability: 0, completedObjectives: [], stableRegionId: null, heldStocks: [],
  };
  for (const territory of warTerritoriesForSimulationV96(state)) {
    state.territories[territory.id] = { controller: territory.initialController, installationIntact: true, transitUntilTurn: null };
    state.stocks[territory.id] = emptyBudget();
  }
  if (planet.procedural && "strategy" in planet.procedural) {
    const deployment = warDeploymentV103({ ...planet, procedural: planet.procedural });
    state.combatants = deployment.combatants;
    Object.assign(state.stocks, deployment.stocks);
    report(state, `Exercice autonome de ${planet.name} · ${planet.territories.length} territoires, ${planet.regions.length} régions. ${deployment.forceCount} personnes par force principale, réparties sur des positions reliées à leur base. Les effectifs et réserves sont adaptés à ce format ; ce sont des acteurs de l’exercice, sans recrutement dans votre campagne.`, ["WAR-GEN103"]);
    production(state);
    return state;
  }
  for (let index = 1; index <= P.START_A; index++) {
    const territoryId = index <= 6 ? `CON-T0${index}` : index <= 17 ? "CON-T02" : index <= 23 ? "CON-T03" : "CON-T01";
    state.combatants.push({ id: `P${String(index).padStart(2, "0")}`, unitTypeId: index === 8 ? "RTS-U02" : index === 9 ? "RTS-U13" : index === 10 ? "RTS-U15" : index === 11 ? "RTS-U18" : "RTS-U01", factionId: PLAYER, territoryId, status: "fit", xp: index === 8 ? 90 : 0, garrison: index <= 6, trainingUntilTurn: null });
  }
  const enemyCounts: Record<string, number> = { "CON-T08": 4, "CON-T10": 2, "CON-T13": 4, "CON-T14": 4, "CON-T15": 3, "CON-T16": 3, "CON-T17": 2, "CON-T18": 2, "CON-T25": 1, "CON-T26": 1, "CON-T27": 2, "CON-T28": 1, "CON-T29": 1, "CON-T30": 2 };
  let enemyNumber = 0;
  for (const [territoryId, count] of Object.entries(enemyCounts)) {
    for (let index = 0; index < count; index++) state.combatants.push({ id: `F${String(++enemyNumber).padStart(2, "0")}`, unitTypeId: "RTS-U01", factionId: ENEMY, territoryId, status: "fit", xp: 0, garrison: index === 0, trainingUntilTurn: null });
  }
  for (const territory of warTerritoriesForSimulationV96(state).filter(item => item.initialController === NEUTRAL)) {
    state.combatants.push({ id: `N-${territory.id}`, unitTypeId: "RTS-U01", factionId: NEUTRAL, territoryId: territory.id, status: "fit", xp: 0, garrison: true, trainingUntilTurn: null });
  }
  // Initial allocations are a declared implementation choice, not additional workbook numbers.
  state.stocks["CON-T01"] = { s: 8, m: 4, i: 2 };
  state.stocks["CON-T02"] = { s: 8, m: 4, i: 3 };
  state.stocks["CON-T03"] = { s: 8, m: 4, i: 3 };
  state.stocks["CON-T08"] = { s: 16, m: 4, i: 2 };
  state.stocks["CON-T14"] = { s: 12, m: 3, i: 1 };
  state.stocks["CON-T25"] = { s: 12, m: 3, i: 1 };
  report(state, planet.id === "korthas"
    ? "Exercice autonome de Korthas. Les 24 Pxx suivent les positions de la feuille Récit des douze tours ; ils ne sont pas des recrues de votre campagne."
    : `Exercice autonome de ${planet.name}. Les 24 Pxx sont des acteurs de ce théâtre ; ils ne sont pas des recrues de votre campagne.`, ["CON-TURN01", "WAR-R02"]);
  production(state);
  return state;
}
export function warXpGainV85(input: { roleActions: string[]; objectives: string[]; extracted: boolean; rescued: string[]; threats: string[] }): number {
  const unique = (ids: string[]) => new Set(ids).size;
  return Math.min(P.XP_TOTAL_CAP,
    Math.min(P.XP_ROLE_CAP, unique(input.roleActions) * P.XP_ROLE) +
    Math.min(P.XP_OBJ_CAP, unique(input.objectives) * P.XP_OBJ) +
    (input.extracted ? P.XP_EXIT : 0) + Math.min(P.XP_RESCUE_CAP, unique(input.rescued) * P.XP_RESCUE) +
    Math.min(P.XP_THREAT_CAP, unique(input.threats) * P.XP_THREAT));
}
export function warVeterancyV85(xp: number): { level: number; label: string; next: number | null } {
  const tiers = [{ xp: 0, label: "Débutant" }, { xp: 100, label: "Aguerri" }, { xp: 250, label: "Confirmé" }, { xp: 450, label: "Vétéran" }, { xp: 700, label: "Référent" }];
  const level = tiers.reduce((current, tier, index) => xp >= tier.xp ? index : current, 0);
  return { level, label: tiers[level].label, next: tiers[level + 1]?.xp ?? null };
}
export function warOrderCostV85(order: Pick<WarOrderV85, "kind" | "cargo">): WarBudgetV85 {
  if (order.kind === "attack") return { s: 3, m: 1, i: 0 };
  if (order.kind === "cession") return { s: 0, m: 0, i: 3 };
  if (order.kind === "transit") return { s: 0, m: 0, i: 1 };
  if (order.kind === "heal") return { s: 1, m: 0, i: 0 };
  if (order.kind === "evacuate") return { ...WAR_EVACUATION_COST_V100 };
  if (order.kind === "logistics") return order.cargo;
  return emptyBudget();
}
export function warOrderSlotV85(kind: WarOrderKindV85): "operation" | "logistics" | "diplomacy" {
  return kind === "logistics" || kind === "heal" || kind === "evacuate" ? "logistics" : kind === "cession" || kind === "transit" ? "diplomacy" : "operation";
}
export function warOrderIssueV85(state: WarSimulationV85, order: WarOrderV85): string | null {
  if (order.factionId !== PLAYER || order.mode !== "auto") return "Cet exercice attend un ordre de l’Expédition des Haltes.";
  const origin = warTerritoryForSimulationV96(state, order.fromId), target = warTerritoryForSimulationV96(state, order.targetId);
  if (!origin || !target || !state.territories[order.fromId] || !state.territories[order.targetId]) return "Territoire absent du théâtre.";
  if (!validBudget(order.cargo)) return "Chargement invalide.";
  if (state.territories[order.fromId].controller !== PLAYER) return "Le départ exige un site sous votre commandement.";
  const sameSite = order.fromId === order.targetId;
  if (order.kind !== "heal" && !origin.neighbors.includes(order.targetId)) return "Une colonne ne franchit qu’une route voisine par tour.";
  if (order.kind === "heal" && !sameSite) return "Le soin est réservé au site où la personne se trouve.";
  const slot = warOrderSlotV85(order.kind);
  if (state.orders.filter(item => warOrderSlotV85(item.kind) === slot).length >= (slot === "operation" ? 2 : 1)) return `Créneaux ${slot === "operation" ? "opérationnels" : slot === "logistics" ? "logistiques" : "diplomatiques"} déjà réservés.`;
  if (new Set(order.combatantIds).size !== order.combatantIds.length || order.combatantIds.length > 8) return "La colonne doit contenir au plus huit personnes distinctes.";
  const actors = order.combatantIds.map(id => state.combatants.find(actor => actor.id === id));
  if (order.kind === "evacuate") {
    const issue = warEvacuationIssueV100(state, order);
    if (issue) return issue;
  } else if (actors.some(actor => !actor || actor.factionId !== PLAYER || actor.territoryId !== order.fromId || actor.status !== (order.kind === "heal" ? "wounded" : "fit") || actor.trainingUntilTurn !== null)) return "Une personne n’est pas disponible à ce point de départ.";
  if (state.orders.some(item => item.combatantIds.some(id => order.combatantIds.includes(id)))) return "Une personne possède déjà un ordre pour ce tour.";
  if (["move", "attack", "recon", "cession", "heal"].includes(order.kind) && actors.length === 0) return "Affectez une personne présente.";
  if (order.kind === "attack" && state.territories[order.targetId].controller !== ENEMY) return "Cet exercice réserve l’assaut aux positions de F02 ; F03 conserve ses possibilités de négociation.";
  if (order.kind === "cession" && state.territories[order.targetId].controller !== NEUTRAL) return "La cession exige une communauté F03 encore indépendante.";
  if (order.kind === "transit" && state.territories[order.targetId].controller !== NEUTRAL) return "Le transit négocié porte sur une communauté F03 indépendante.";
  if (["move", "logistics"].includes(order.kind) && state.territories[order.targetId].controller !== PLAYER && (state.territories[order.targetId].transitUntilTurn ?? -1) < state.turn) return "La destination exige votre contrôle ou un transit en vigueur.";
  if (order.kind === "logistics" && state.territories[order.targetId].controller !== PLAYER) return "Le dépôt de cet exercice doit être sous votre contrôle ; le transit seul ne donne pas propriété d’un magasin voisin.";
  if (order.kind === "logistics" && actors.length === 0) return "Le chargement demande des porteurs présents ; une caisse ne se déplace pas seule.";
  const reserved = state.orders.filter(item => item.fromId === order.fromId).reduce((total, item) => sum(total, warOrderCostV85(item)), emptyBudget());
  if (!fits(state.stocks[order.fromId], sum(reserved, warOrderCostV85(order)))) return "Le stock local ne couvre pas les ordres réservés. Un convoi doit apporter le matériel avant l’offensive.";
  return null;
}
export function queueWarOrderV85(state: WarSimulationV85, draft: Omit<WarOrderV85, "id" | "factionId" | "mode">): WarUpdateV85 {
  if (state.revision >= 1000000 || draft.kind === "evacuate" && state.revision >= 999999) return { state, accepted: false, message: "La limite de révision de cette archive ne laisse plus la marge nécessaire à cet ordre. Aucun ordre ajouté." };
  const order: WarOrderV85 = { ...draft, combatantIds: [...draft.combatantIds], cargo: { ...draft.cargo }, id: `free-${state.seed}-t${state.turn}-r${state.revision + 1}`, factionId: PLAYER, mode: "auto" };
  const issue = warOrderIssueV85(state, order);
  if (issue) return { state, accepted: false, message: issue };
  const next = copy(state); next.orders.push(order); next.revision++;
  return { state: next, accepted: true, message: "Ordre réservé. Le temps avancera lors de la validation du tour." };
}
export function cancelWarOrderV85(state: WarSimulationV85, id: string): WarSimulationV85 {
  if (state.revision >= 1000000) return state;
  const next = copy(state); next.orders = next.orders.filter(order => order.id !== id); next.revision++; return next;
}
function hash(value: string, seed: number): number { let result = seed >>> 0; for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619) >>> 0; return result; }
function currentActors(state: WarSimulationV85, order: WarOrderV85) { return state.combatants.filter(actor => order.combatantIds.includes(actor.id) && actor.status === "fit" && actor.territoryId === order.fromId && actor.trainingUntilTurn === null); }
function factionCharge(state: WarSimulationV85, faction: WarFactionIdV85, cost: WarBudgetV85): boolean {
  if (!fits(warBudgetV85(state, faction), cost)) return false;
  for (const resource of ["s", "m", "i"] as const) {
    let remaining = cost[resource];
    for (const territory of warTerritoriesForSimulationV96(state).filter(item => state.territories[item.id].controller === faction)) {
      const amount = Math.min(remaining, state.stocks[territory.id][resource]); state.stocks[territory.id][resource] -= amount; remaining -= amount;
    }
  }
  return true;
}
/** A small deterministic exercise resolver, declared in the dossier; these balance equations are not workbook results. */
function battle(state: WarSimulationV85, order: WarOrderV85, defendersOverride?: WarCombatantV85[]) {
  const attackers = currentActors(state, order);
  const defenders = defendersOverride ?? state.combatants.filter(actor => actor.factionId === state.territories[order.targetId].controller && actor.territoryId === order.targetId && actor.status === "fit" && actor.trainingUntilTurn === null);
  const roll = hash(order.id, state.seed) % 3;
  const won = attackers.length >= Math.max(1, defenders.length + (roll === 0 ? 1 : 0));
  const losses = won ? Math.min(attackers.length - 1, Math.floor(defenders.length / 3)) : Math.min(attackers.length, Math.max(1, Math.floor(defenders.length / 3)));
  for (const [index, actor] of attackers.slice(-losses || attackers.length).entries()) {
    if (losses === 0) break;
    actor.status = index === 0 && !won && roll === 0 ? "dead" : "wounded"; actor.garrison = false;
  }
  for (const actor of attackers.filter(item => item.status === "fit")) actor.xp += warXpGainV85({ roleActions: [`${order.id}-engagement`], objectives: won ? [order.targetId] : [], extracted: true, rescued: [], threats: won && defenders.length ? [`${order.id}-threat`] : [] });
  if (won && !defendersOverride) {
    const retreatId = warTerritoryForSimulationV96(state, order.targetId)!.neighbors.find(id => id !== order.fromId && state.territories[id].controller === state.territories[order.targetId].controller);
    defenders.forEach((actor, index) => {
      if (index === 0 || !retreatId) { actor.status = "wounded"; actor.garrison = false; }
      else { actor.territoryId = retreatId; actor.garrison = false; }
    });
    const survivors = attackers.filter(actor => actor.status === "fit");
    for (const actor of survivors) { actor.territoryId = order.targetId; actor.garrison = false; }
    if (survivors.length && warSuppliedV85(state, order.factionId).has(order.fromId)) {
      const previousOwner = state.territories[order.targetId].controller;
      const previousStock = state.stocks[order.targetId];
      if (previousStock.s + previousStock.m + previousStock.i > 0) {
        state.heldStocks.push({ territoryId: order.targetId, owner: previousOwner, budget: { ...previousStock } });
        state.stocks[order.targetId] = emptyBudget();
      }
      state.territories[order.targetId].controller = order.factionId; survivors[0].garrison = true;
      report(state, `${order.targetId} : ${order.factionId} prend le contrôle, ${survivors[0].id} reste en garnison. ${losses} personne(s) indisponible(s). Aucun revenu de capture immédiat.`, ["CON-R15", "CON-R08", "EVOL-R03"], order.id);
    } else report(state, `${order.targetId} : objectif tactique atteint, occupation non validée faute de liaison.`, ["CON-R15"], order.id);
  } else {
    if (won && defendersOverride) {
      const opposingLosses = Math.min(defenders.length, Math.max(1, Math.floor(attackers.length / 3)));
      defenders.slice(-opposingLosses).forEach(actor => { actor.status = "wounded"; actor.garrison = false; });
    }
    report(state, `${order.targetId} : ${won ? "rencontre de route remportée" : "repli"}, ${losses} personne(s) indisponible(s). Les individus gardent leur état et leur identité.`, ["CON-R19", "WAR-R14"], order.id);
  }
}
function planEnemy(state: WarSimulationV85): WarOrderV85[] {
  const result: WarOrderV85[] = [];
  const origins = warTerritoriesForSimulationV96(state).filter(item => state.territories[item.id].controller === ENEMY)
    .sort((a, b) => hash(a.id + state.turn, state.seed) - hash(b.id + state.turn, state.seed));
  for (const origin of origins) {
    const target = origin.neighbors.find(id => state.territories[id].controller === PLAYER);
    const actors = state.combatants.filter(actor => actor.factionId === ENEMY && actor.territoryId === origin.id && actor.status === "fit" && !actor.garrison && actor.trainingUntilTurn === null).slice(0, 8);
    const cost = { s: 3, m: 1, i: 0 };
    if (!target || !actors.length || !fits(state.stocks[origin.id], cost)) continue;
    result.push({ id: `free-${state.seed}-enemy-t${state.turn}-${result.length}`, kind: "attack", fromId: origin.id, targetId: target, combatantIds: actors.map(actor => actor.id), cargo: emptyBudget(), factionId: ENEMY, mode: "auto" });
    if (result.length === 2) break;
  }
  return result;
}
function applyOrder(state: WarSimulationV85, order: WarOrderV85) {
  if (state.appliedResultIds.includes(order.id)) return;
  const cost = warOrderCostV85(order);
  if (state.territories[order.fromId].controller !== order.factionId || !fits(state.stocks[order.fromId], cost)) {
    report(state, `${order.id} : ordre annulé après rupture du départ ou du stock ; aucun renfort créé.`, ["CON-R07"]);
    state.appliedResultIds.push(order.id); return;
  }
  if (order.kind === "evacuate") {
    const issue = warEvacuationIssueV100(state, order);
    if (issue) {
      report(state, `${order.id} : évacuation annulée avant dépense : ${issue} Les personnes restent sur place.`, ["CON-R08", "EVOL-R14"], order.id);
      state.appliedResultIds.push(order.id); return;
    }
  }
  debit(state.stocks[order.fromId], cost);
  const actors = currentActors(state, order);
  if (order.kind === "attack") battle(state, order);
  else if (order.kind === "evacuate") {
    const manifest = warEvacuationManifestV100(state, order);
    for (const person of [...manifest.escorts, ...manifest.patients]) { person.territoryId = order.targetId; person.garrison = false; }
    report(state, `${order.fromId} → ${order.targetId} : ${manifest.patients.map(person => person.id).join(", ")} évacué(s), avec ${manifest.escorts.map(person => person.id).join(", ")} en escorte. Les blessés restent blessés ; les soins demandent un autre ordre et un autre créneau.`, ["CON-R08", "CON-R10", "EVOL-R14", "EVOL-R15"], order.id);
  }
  else if (order.kind === "recon") {
    const count = state.combatants.filter(actor => actor.territoryId === order.targetId && actor.status === "fit" && actor.factionId === state.territories[order.targetId].controller).length;
    state.observations = state.observations.filter(item => item.territoryId !== order.targetId);
    state.observations.push({ territoryId: order.targetId, turn: state.turn, lower: Math.max(0, count - 1), upper: count + 1, sourceId: actors[0]?.id ?? "" });
    actors.forEach(actor => { actor.xp += warXpGainV85({ roleActions: [order.id], objectives: [], extracted: false, rescued: [], threats: [] }); });
    report(state, `${order.targetId} : observation locale datée, intervalle ${Math.max(0, count - 1)}–${count + 1}.`, ["CON-R09", "EVOL-R03"], order.id);
  } else if (order.kind === "cession") {
    if (actors.length && state.territories[order.targetId].controller === NEUTRAL) {
      const previousStock = state.stocks[order.targetId];
      if (previousStock.s + previousStock.m + previousStock.i > 0) { state.heldStocks.push({ territoryId: order.targetId, owner: NEUTRAL, budget: { ...previousStock } }); state.stocks[order.targetId] = emptyBudget(); }
      state.territories[order.targetId].controller = PLAYER;
      actors.forEach(actor => { actor.territoryId = order.targetId; actor.garrison = false; }); actors[0].garrison = true;
      // The local inhabitants/guards retain their neutral identities; they are not added to the player's roster.
      report(state, `${order.targetId} : cession limitée dans l’exercice, ${actors[0].id} devient garde. La communauté F03 conserve ses personnes.`, ["CON-E02", "CON-R16"], order.id);
    }
  } else if (order.kind === "transit") {
    state.territories[order.targetId].transitUntilTurn = state.turn + 2;
    report(state, `${order.targetId} : passage ouvert pour deux tours, souveraineté F03 et revenus locaux conservés.`, ["DIP-01", "WAR-R11"], order.id);
  } else if (order.kind === "heal") {
    state.combatants.filter(actor => order.combatantIds.includes(actor.id) && actor.status === "wounded" && actor.territoryId === order.fromId).forEach(actor => { actor.trainingUntilTurn = state.turn + 1; });
    report(state, `${order.fromId} : ${order.combatantIds.length} blessé(s) en soins légers pour un tour. Les morts restent dans le registre.`, ["EVOL-R14", "EVOL-R15"], order.id);
  } else {
    actors.forEach(actor => { actor.territoryId = order.targetId; actor.garrison = false; });
    if (order.kind === "logistics") state.stocks[order.targetId] = sum(state.stocks[order.targetId], order.cargo);
    if (state.territories[order.targetId].controller === order.factionId && warGarrisonV85(state, order.targetId).length === 0 && actors[0]) actors[0].garrison = true;
    report(state, `${order.fromId} → ${order.targetId} : ${actors.length} personne(s) déplacée(s)${order.kind === "logistics" ? `, livraison S${order.cargo.s}/M${order.cargo.m}/I${order.cargo.i}` : ""}.`, ["CON-R04", "CON-R10"], order.id);
  }
  state.appliedResultIds.push(order.id);
}
/** On new theatres the corridor objective follows real roads between the two bases. */
export function warObjectiveCorridorV96(state: Pick<WarSimulationV85, "planetId">): string[] {
  const procedural = warPlanetV96(state.planetId)?.procedural;
  if (procedural && "strategy" in procedural) return [...procedural.strategy.objectiveCorridor];
  const queue: string[][] = [["CON-T01"]], reached = new Set(["CON-T01"]);
  while (queue.length) {
    const route = queue.shift()!;
    const id = route[route.length - 1];
    if (id === "CON-T25") return route;
    for (const neighbor of warTerritoryForSimulationV96(state, id)?.neighbors ?? []) {
      if (!reached.has(neighbor)) { reached.add(neighbor); queue.push([...route, neighbor]); }
    }
  }
  return [];
}
function evaluateObjectives(state: WarSimulationV85, upkeepPaid: boolean) {
  const supplied = warSuppliedV85(state);
  const ready = (id: string) => state.territories[id].controller === PLAYER && supplied.has(id) && warGarrisonV85(state, id).length > 0 && state.territories[id].installationIntact;
  const definitions = warTerritoriesForSimulationV96(state);
  const regions = [...new Set(definitions.map(territory => territory.region))];
  // V96 balances the free exercise with regional occupation: the original 24
  // people can secure 36 connected sites with one fit garrison per region.
  // The imported V3 design proposal remains unchanged in the source dossier;
  // this creates no recruits and waives neither supply, intact sites nor upkeep.
  const total = definitions.every(territory => state.territories[territory.id].controller === PLAYER && supplied.has(territory.id) && state.territories[territory.id].installationIntact) &&
    regions.every(regionId => definitions.some(territory => territory.region === regionId && warGarrisonV85(state, territory.id).length > 0));
  const region = regions.find(id => warTerritoriesForSimulationV96(state).filter(territory => territory.region === id).every(territory => ready(territory.id))) ?? null;
  const corridorIds = state.planetId && state.planetId !== "korthas"
    ? warObjectiveCorridorV96(state) : ["CON-T01", "CON-T08", "CON-T14", "CON-T15", "CON-T21", "CON-T22"];
  const corridor = corridorIds.length > 1 && corridorIds.every(ready) &&
    (state.planetId && state.planetId !== "korthas" ? corridorIds : ["CON-T01", "CON-T02", "CON-T08", "CON-T14", "CON-T15", "CON-T21", "CON-T22"]).every(id => supplied.has(id)) &&
    warTerritoriesForSimulationV96(state).some(territory => state.territories[territory.id].controller === NEUTRAL && (state.territories[territory.id].transitUntilTurn ?? -1) >= state.turn);
  state.totalStability = total && upkeepPaid ? state.totalStability + 1 : 0;
  state.regionStability = region && upkeepPaid ? region === state.stableRegionId ? state.regionStability + 1 : 1 : 0;
  state.stableRegionId = region && upkeepPaid ? region : null;
  state.corridorStability = corridor && upkeepPaid ? state.corridorStability + 1 : 0;
  for (const [id, stability] of [["CON-O01", state.totalStability], ["CON-O02", state.regionStability], ["CON-O03", state.corridorStability]] as const) {
    if (stability >= P.TARGET_T && !state.completedObjectives.includes(id)) { state.completedObjectives.push(id); report(state, `${id} atteint dans l’exercice après deux fins de tour valides.`, [id]); }
  }
}
/** Seals both sides before revealing any report. One immutable snapshot is returned for one storage write. */
export function advanceWarTurnV85(state: WarSimulationV85): WarUpdateV85 {
  if (!warPlanetV96(state.planetId)) return { state, accepted: false, message: "Planète absente du catalogue de cet exercice." };
  if (state.revision >= 1000000) return { state, accepted: false, message: "La limite de révision de cette archive est atteinte. Aucun tour résolu." };
  if (state.turn >= 5000) return { state, accepted: false, message: "La limite de cette archive d’exercice est atteinte." };
  const next = copy(state);
  const enemyOrders = planEnemy(state);
  const processed = new Set<string>();
  for (const order of [...state.orders, ...enemyOrders]) {
    if (processed.has(order.id)) continue;
    const crossing = order.kind === "attack" ? [...state.orders, ...enemyOrders].find(other => other.factionId !== order.factionId && other.kind === "attack" && other.fromId === order.targetId && other.targetId === order.fromId && !processed.has(other.id)) : undefined;
    if (crossing) {
      const opponents = currentActors(next, crossing);
      const firstCost = warOrderCostV85(order), secondCost = warOrderCostV85(crossing);
      if (fits(next.stocks[order.fromId], firstCost) && fits(next.stocks[crossing.fromId], secondCost)) {
        debit(next.stocks[order.fromId], firstCost); debit(next.stocks[crossing.fromId], secondCost);
        battle(next, order, opponents);
        report(next, `${order.fromId} ↔ ${order.targetId} : rencontre sur la route ; les deux offensives sont consommées sans double capture.`, ["CON-R05"]);
      }
      processed.add(crossing.id); next.appliedResultIds.push(crossing.id);
      processed.add(order.id); next.appliedResultIds.push(order.id);
    } else { applyOrder(next, order); processed.add(order.id); }
  }
  let paid = false;
  for (const faction of [PLAYER, ENEMY]) {
    const due = warUpkeepV85(next, faction);
    const accepted = factionCharge(next, faction, { s: due, m: 0, i: 0 });
    if (faction === PLAYER) paid = accepted;
    report(next, `${faction} : entretien S${due} ${accepted ? "acquitté" : "non couvert ; objectifs suspendus, repli ou réduction à prévoir"}.`, ["CON-R13"]);
  }
  evaluateObjectives(next, paid);
  next.turn++; next.revision++; next.orders = [];
  for (const actor of next.combatants) if (actor.status === "wounded" && actor.trainingUntilTurn !== null && actor.trainingUntilTurn < next.turn) { actor.status = "fit"; actor.trainingUntilTurn = null; actor.garrison = false; }
  production(next);
  // Keep the whole previous snapshot if a full resolution would overflow its
  // journal, XP or resource bounds. Never publish a result the archive refuses.
  if (!readWarSimulationV85(next)) return { state, accepted: false, message: "La résolution dépasserait les limites de cette archive. Aucun tour, dépense ou déplacement appliqué." };
  return { state: next, accepted: true, message: `Tour ${next.turn} ouvert. Les nouveaux revenus proviennent des sites contrôlés à la fin du tour précédent.` };
}
/** Reject future/corrupt archives. The caller preserves their bytes and disables writes until an explicit new exercise. */
export function readWarSimulationV85(value: unknown): WarSimulationV85 | null {
  if (!record(value) || value.version !== 1 || value.context !== "free" || !integer(value.turn, 5000) || value.turn < 1 || !integer(value.seed, 0xffffffff) || !integer(value.revision) || !record(value.territories) || !record(value.stocks) || !Array.isArray(value.combatants) || value.combatants.length > 300 || !Array.isArray(value.orders) || value.orders.length > 4 || !Array.isArray(value.observations) || !Array.isArray(value.reports) || value.reports.length > 100000 || !Array.isArray(value.appliedResultIds) || !Array.isArray(value.completedObjectives) || !integer(value.totalStability) || !integer(value.regionStability) || !integer(value.corridorStability)) return null;
  if (!(value.planetId === undefined || typeof value.planetId === "string")) return null;
  const planet = warPlanetV96(value.planetId);
  if (!planet) return null;
  const definitions = planet.definitions;
  const territoryById = (id: string) => definitions.find(territory => territory.id === id);
  const territoryIds = new Set(definitions.map(territory => territory.id));
  if (Object.keys(value.territories).some(id => !territoryIds.has(id)) || Object.keys(value.stocks).some(id => !territoryIds.has(id))) return null;
  for (const territory of definitions) {
    const item = value.territories[territory.id];
    if (!record(item) || !factions.includes(item.controller as WarFactionIdV85) || typeof item.installationIntact !== "boolean" || !(item.transitUntilTurn === null || integer(item.transitUntilTurn)) || !validBudget(value.stocks[territory.id])) return null;
  }
  const ids = new Set<string>();
  for (const actor of value.combatants) {
    if (!record(actor) || typeof actor.id !== "string" || actor.id.length > 80 || ids.has(actor.id) || typeof actor.unitTypeId !== "string" || !/^RTS-U\d{2}$/.test(actor.unitTypeId) || !factions.includes(actor.factionId as WarFactionIdV85) || !territoryById(String(actor.territoryId)) || !["fit", "wounded", "dead"].includes(String(actor.status)) || !integer(actor.xp) || typeof actor.garrison !== "boolean" || !(actor.trainingUntilTurn === null || integer(actor.trainingUntilTurn))) return null;
    ids.add(actor.id);
  }
  if (!value.appliedResultIds.every(id => typeof id === "string" && id.length < 180) || !value.completedObjectives.every(id => ["CON-O01", "CON-O02", "CON-O03"].includes(String(id)))) return null;
  if (!value.reports.every(item => record(item) && typeof item.id === "string" && integer(item.turn) && typeof item.text === "string" && item.text.length < 4000 && Array.isArray(item.sourceIds) && item.sourceIds.every(id => typeof id === "string")) || !value.observations.every(item => record(item) && typeof item.sourceId === "string" && territoryById(String(item.territoryId)) && integer(item.turn) && integer(item.lower, 300) && integer(item.upper, 300) && Number(item.lower) <= Number(item.upper))) return null;
  for (const order of value.orders) {
    if (!record(order) || typeof order.id !== "string" || order.id.length > 180 || !["move", "attack", "recon", "cession", "transit", "logistics", "heal", "evacuate"].includes(String(order.kind)) || !territoryById(String(order.fromId)) || !territoryById(String(order.targetId)) || order.factionId !== PLAYER || order.mode !== "auto" || !validBudget(order.cargo) || !Array.isArray(order.combatantIds) || order.combatantIds.length > 8 || !order.combatantIds.every(id => typeof id === "string" && ids.has(id))) return null;
  }
  if (!(value.stableRegionId === undefined || value.stableRegionId === null || typeof value.stableRegionId === "string" && definitions.some(territory => territory.region === value.stableRegionId)) || !(value.heldStocks === undefined || Array.isArray(value.heldStocks) && value.heldStocks.length <= 10000 && value.heldStocks.every(item => record(item) && territoryById(String(item.territoryId)) && factions.includes(item.owner as WarFactionIdV85) && validBudget(item.budget)))) return null;
  const result = copy(value as unknown as WarSimulationV85);
  result.stableRegionId ??= null; result.heldStocks ??= [];
  // An archive cannot smuggle a route from another world's graph or bypass
  // reservations by storing orders the live command path would refuse.
  const orders = result.orders;
  result.orders = [];
  for (const order of orders) {
    if (warOrderIssueV85(result, order)) return null;
    result.orders.push(order);
  }
  return result;
}
