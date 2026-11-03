import { cancelWarOrderV85, queueWarOrderV85, readWarSimulationV85, warOrderIssueV85, warTerritoriesForSimulationV96, type WarBudgetV85, type WarOrderV85, type WarSimulationV85, type WarUpdateV85 } from "./clanWarV85";
import type { WarConvoyRouteV105 } from "./clanWarConvoyStateV105";

export const WAR_CONVOY_ROUTE_CONTRACT_V105 = {
  id: "CONVOY-ROUTE-V105", workbook: "Yautja_V3_Guerres_de_Clans_Trois_Modes.xlsx",
  sha256: "3ef3712c9ffa865f918133bee7667155c1bb320f060b4a19cc58ff650ffd0dfa",
  sources: [{ id: "CON-R04", sheet: "Règles de conquête", cells: "C9:H9" }, { id: "CON-R10", sheet: "Règles de conquête", cells: "C15:H15" }, { id: "CON-R11", sheet: "Règles de conquête", cells: "C16:H16" }],
  rules: ["one-real-neighbor-per-turn", "same-one-to-eight-present-porters", "one-existing-logistics-slot", "local-stock-reserved-before-each-leg", "deliver-to-controlled-depot", "pause-on-broken-control-stock-or-roster", "no-automatic-reroute-or-next-order", "atomic-delivery-checkpoint", "free-front-version-two-opt-in", "front-export-import-and-reload"],
  adaptation: "Chaque étape réutilise le convoi terrestre de l’exercice libre : dépôt contrôlé obligatoire, lots déposés dans le stock local et soumis à l’entretien. Le plan ne crée ni véhicule, ni budget, ni droit de transit, ni protection des caisses. Les six ouvrages historiques non intégrés restent ouverts.",
} as const;

export interface WarConvoyDraftV105 { territoryIds: string[]; combatantIds: string[]; cargo: WarBudgetV85 }
const clone = (state: WarSimulationV85): WarSimulationV85 => structuredClone(state);

/** Find the shortest currently controlled road path; never inspect hostile
 * stores, secret people or non-playable geography. Ties follow atlas roads. */
export function warConvoyPathV105(state: WarSimulationV85, fromId: string, targetId: string): string[] | null {
  const definitions = warTerritoriesForSimulationV96(state);
  if (state.territories[fromId]?.controller !== "CON-F01" || state.territories[targetId]?.controller !== "CON-F01" || fromId === targetId) return null;
  const byId = new Map(definitions.map(site => [site.id, site]));
  const queue = [[fromId]], seen = new Set([fromId]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const path = queue[cursor], current = path[path.length - 1];
    for (const id of byId.get(current)?.neighbors ?? []) {
      if (seen.has(id) || state.territories[id]?.controller !== "CON-F01") continue;
      const next = [...path, id];
      if (id === targetId) return next;
      seen.add(id); queue.push(next);
    }
  }
  return null;
}

export function warConvoyLegDraftV105(route: WarConvoyRouteV105): Omit<WarOrderV85, "id" | "factionId" | "mode"> | null {
  const step = route.completedOrderIds.length;
  if (step >= route.territoryIds.length - 1) return null;
  return { kind: "logistics", fromId: route.territoryIds[step], targetId: route.territoryIds[step + 1], combatantIds: [...route.combatantIds], cargo: { ...route.cargo } };
}

export function warConvoyRouteIssueV105(state: WarSimulationV85, route = state.convoyRouteV105): string | null {
  if (!route) return "Préparez un trajet avec ses porteurs et ses lots.";
  if (route.completedOrderIds.length === route.territoryIds.length - 1) return null;
  const definitions = warTerritoriesForSimulationV96(state);
  for (let index = route.completedOrderIds.length; index < route.territoryIds.length; index++) {
    const id = route.territoryIds[index];
    if (!state.territories[id] || state.territories[id].controller !== "CON-F01") return `Trajet interrompu à ${id.replace("CON-", "")} : le dépôt n’est plus sous votre contrôle. Les étapes déjà livrées restent acquises.`;
    if (index > route.completedOrderIds.length && !definitions.find(site => site.id === route.territoryIds[index - 1])?.neighbors.includes(id)) return `Liaison absente vers ${id.replace("CON-", "")} : aucun raccourci autorisé.`;
  }
  const draft = warConvoyLegDraftV105(route)!;
  // An existing reservation is checked without counting its own slot/people twice.
  const available = route.pendingOrderId ? { ...state, orders: state.orders.filter(order => order.id !== route.pendingOrderId) } : state;
  return warOrderIssueV85(available, { ...draft, id: route.pendingOrderId ?? "convoy-preview-v105", factionId: "CON-F01", mode: "auto" });
}

export function planWarConvoyV105(state: WarSimulationV85, draft: WarConvoyDraftV105): WarUpdateV85 {
  const legs = draft.territoryIds.length - 1;
  if (state.revision + 1 + 2 * legs + 1 > 1000000 || state.turn + legs > 5000) return { state, accepted: false, message: "Cette archive ne laisse plus assez de tours ou de révisions pour préparer, terminer et retirer ce trajet." };
  if (state.convoyRouteV105) return { state, accepted: false, message: "Terminez ou retirez le trajet enregistré avant d’en préparer un autre." };
  const route: WarConvoyRouteV105 = { id: `convoy-v105-${state.seed}-r${state.revision + 1}`, territoryIds: [...draft.territoryIds], combatantIds: [...draft.combatantIds], cargo: { ...draft.cargo }, completedOrderIds: [], pendingOrderId: null };
  const next = clone(state); next.version = 2; next.convoyRouteV105 = route; next.revision++;
  if (!readWarSimulationV85(next)) return { state, accepted: false, message: "Trajet invalide : choisissez des dépôts voisins distincts, un lot non vide et un à huit porteurs réels." };
  const issue = warConvoyRouteIssueV105(next);
  if (issue) return { state, accepted: false, message: issue };
  return { state: next, accepted: true, message: "Trajet enregistré. Réservez sa première étape ; les lots restent au dépôt jusqu’à la résolution du tour." };
}

export function queueWarConvoyLegV105(state: WarSimulationV85): WarUpdateV85 {
  if (state.revision >= 999998 || state.turn >= 5000) return { state, accepted: false, message: "Cette archive ne laisse plus la marge nécessaire pour réserver, résoudre puis retirer une étape." };
  const route = state.convoyRouteV105;
  if (!route) return { state, accepted: false, message: "Aucun trajet enregistré." };
  if (state.revision + 2 * (route.territoryIds.length - 1 - route.completedOrderIds.length) + 1 > 1000000) return { state, accepted: false, message: "La marge de révision ne permet plus de terminer et retirer ce trajet. Retirez le plan avant de préparer un trajet plus court." };
  if (route.pendingOrderId) return { state, accepted: false, message: "Cette étape est déjà réservée. Confirmez le tour pour la résoudre." };
  const draft = warConvoyLegDraftV105(route);
  if (!draft) return { state, accepted: false, message: "La dernière étape du trajet est livrée." };
  const issue = warConvoyRouteIssueV105(state);
  if (issue) return { state, accepted: false, message: issue };
  const result = queueWarOrderV85(state, draft);
  if (!result.accepted) return result;
  result.state.convoyRouteV105!.pendingOrderId = result.state.orders[result.state.orders.length - 1].id;
  return { ...result, message: `Étape ${route.completedOrderIds.length + 1}/${route.territoryIds.length - 1} réservée. Un seul lien sera franchi à la résolution.` };
}

export function removeWarConvoyV105(state: WarSimulationV85): WarUpdateV85 {
  if (!state.convoyRouteV105 || state.revision >= 1000000) return { state, accepted: false, message: "Aucun trajet modifiable." };
  const next = state.convoyRouteV105.pendingOrderId ? cancelWarOrderV85(state, state.convoyRouteV105.pendingOrderId) : { ...clone(state), revision: state.revision + 1 };
  next.convoyRouteV105 = null;
  return { state: next, accepted: true, message: "Trajet retiré et prochaine réservation libérée. Les livraisons, dépenses et positions déjà résolues sont conservées." };
}

export const WAR_FRONT_ARCHIVE_FORMAT_V105 = "yautja-free-war-front";
const MAX_FRONT_BYTES = 4 * 1024 * 1024;
export function exportWarFrontV105(state: WarSimulationV85): string {
  if (!readWarSimulationV85(state)) throw new Error("Front invalide : export refusé.");
  const raw = JSON.stringify({ format: WAR_FRONT_ARCHIVE_FORMAT_V105, version: 1, planetId: state.planetId ?? "korthas", simulation: state }, null, 2);
  if (new TextEncoder().encode(raw).byteLength > MAX_FRONT_BYTES) throw new Error("Le front dépasse la limite de 4 Mio pour cet export.");
  return raw;
}
export function readWarFrontV105(raw: string, expectedPlanetId: string): { state: WarSimulationV85 | null; message: string } {
  const bad = (message: string) => ({ state: null, message });
  if (typeof raw !== "string" || new TextEncoder().encode(raw).byteLength > MAX_FRONT_BYTES) return bad("Fichier trop volumineux : limite de 4 Mio.");
  let value: unknown;
  try { value = JSON.parse(raw.replace(/^\uFEFF/, "")); } catch { return bad("Fichier JSON illisible. Le front courant est conservé."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) return bad("Archive de front libre attendue.");
  const archive = value as { format?: unknown; version?: unknown; planetId?: unknown; simulation?: unknown };
  if (archive.format !== WAR_FRONT_ARCHIVE_FORMAT_V105 || archive.version !== 1) return bad("Format ou version de front incompatible. Aucun remplacement.");
  if (archive.planetId !== expectedPlanetId) return bad("Ce front appartient à une autre planète. Ouvrez sa planète avant de l’importer.");
  const state = readWarSimulationV85(archive.simulation);
  if (!state || (state.planetId ?? "korthas") !== expectedPlanetId) return bad("Front corrompu ou version plus récente. Aucun remplacement.");
  return { state, message: `Front vérifié : tour ${state.turn}, ${state.orders.length} ordre(s) réservé(s). ${state.convoyRouteV105 ? `${state.convoyRouteV105.completedOrderIds.length}/${state.convoyRouteV105.territoryIds.length - 1} étapes livrées.` : "Aucun trajet de convoi enregistré."}` };
}
