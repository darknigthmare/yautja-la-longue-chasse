import { DEFAULT_WAR_RULES_V6, applyWarResultV6, createWarTeamV6, estimateWarTeamV6, planWarRouteV6, selectWarSpecializationV6, warTeamExperienceV6, type WarRulesV6, type WarTeamStateV6 } from "./clanWarBibleV6";

export interface WarExerciseV6 {
  version: 1;
  context: "free";
  sourceSha: string;
  turn: number;
  originId: string;
  territoryId: string;
  team: WarTeamStateV6;
  ravStock: number;
  startingRav: number;
  traversedIds: string[];
  observations: { territoryId: string; turn: number; sourceId: string }[];
  route: ReturnType<typeof planWarRouteV6>;
  closedPassageIds: string[];
  reports: { turn: number; text: string; sourceIds: string[] }[];
}
export type WarExerciseActionV6 =
  | { kind: "plan"; destinationId: string }
  | { kind: "advance" }
  | { kind: "cancel" }
  | { kind: "observe" }
  | { kind: "rest" }
  | { kind: "specialize"; branch: "A" | "B" }
  | { kind: "close-passages"; ids: string[] };
export interface WarExerciseTransitionV6 { state: WarExerciseV6; accepted: boolean; changed: boolean; message: string }

/** Finite training budget selected by the player, never a canonical campaign starting stock. */
export function createWarExerciseV6(unitId: string, startingRav = 12, rules: WarRulesV6 = DEFAULT_WAR_RULES_V6): WarExerciseV6 | null {
  const team = createWarTeamV6(unitId, "v6-recon-exercise", rules);
  const origin = rules.territories.find(zone => zone.id === "W3-K01");
  const unit = rules.units.find(item => item.id === unitId);
  if (!team || !origin || !unit || unit.commandPoints > rules.parameters.pc_cap_1 || !Number.isSafeInteger(startingRav) || startingRav < 0 || startingRav > rules.parameters.rav_cap) return null;
  return { version: 1, context: "free", sourceSha: rules.metadata.sha256, turn: 1, originId: origin.id, territoryId: origin.id, team, ravStock: startingRav, startingRav, traversedIds: [origin.id], observations: [], route: null, closedPassageIds: [], reports: [{ turn: 1, text: "Exercice de reconnaissance : présence au point de départ, aucune annexion ni récompense de campagne.", sourceIds: ["W3-METH05", "W3-R04", "W3-R05"] }] };
}

export function estimateWarExerciseV6(state: WarExerciseV6, rules: WarRulesV6 = DEFAULT_WAR_RULES_V6) {
  const unit = rules.units.find(item => item.id === state.team.unitId);
  const territory = rules.territories.find(zone => zone.id === state.territoryId);
  return estimateWarTeamV6({ unitId: state.team.unitId, xp: warTeamExperienceV6(state.team), fatigue: state.team.fatigue, deployableMembers: state.team.members.filter(member => member.status === "fit" && member.assignmentId === state.team.id).length, availableRav: state.ravStock, frontNeedRav: unit?.upkeepRav ?? 0, terrainBonus: territory?.terrainDefense ?? 0, nextObjectiveXp: 0 }, rules);
}

/** Every passage, observation and equipped rest consumes one exercise turn. This cadence is a prototype choice. */
export function applyWarExerciseV6(state: WarExerciseV6, action: WarExerciseActionV6, rules: WarRulesV6 = DEFAULT_WAR_RULES_V6): WarExerciseTransitionV6 {
  const deny = (message: string): WarExerciseTransitionV6 => ({ state, accepted: false, changed: false, message });
  const unchanged = (message: string): WarExerciseTransitionV6 => ({ state, accepted: true, changed: false, message });
  const unit = rules.units.find(item => item.id === state.team.unitId);
  if (state.version !== 1 || state.context !== "free" || state.team.context !== "free" || state.sourceSha !== rules.metadata.sha256 || !unit || !rules.territories.some(zone => zone.id === state.territoryId) || !Number.isSafeInteger(state.turn) || state.turn < 1 || state.turn >= 10000 || !Number.isSafeInteger(state.ravStock) || state.ravStock < 0 || state.ravStock > rules.parameters.rav_cap || !Number.isSafeInteger(unit.upkeepRav) || unit.commandPoints > rules.parameters.pc_cap_1 || !Number.isFinite(state.team.fatigue) || state.team.fatigue < 0 || state.team.fatigue > rules.parameters.fatigue_max || new Set(state.team.members.map(member => member.id)).size !== state.team.members.length || state.team.members.filter(member => member.status !== "dead").length > unit.fullMembers || state.team.members.some(member => !Number.isFinite(member.xp) || member.xp < 0 || member.xp > rules.parameters.xp_max)) return deny("Cet état ne correspond pas à l’exercice V6 en cours.");
  const presentIds = state.team.members.filter(member => member.status === "fit" && member.assignmentId === state.team.id).map(member => member.id);
  const report = (next: WarExerciseV6, text: string, sourceIds: string[]): WarExerciseTransitionV6 => ({ state: { ...next, reports: [...state.reports, { turn: next.turn, text, sourceIds }].slice(-100) }, accepted: true, changed: true, message: text });
  const spendTurn = (next: WarExerciseV6): WarExerciseV6 => ({ ...next, turn: state.turn + 1, ravStock: Math.max(0, state.ravStock - unit.upkeepRav) });
  if (action.kind === "close-passages") {
    if (!Array.isArray(action.ids) || action.ids.length > rules.passages.length || new Set(action.ids).size !== action.ids.length || action.ids.some(id => !rules.passages.some(passage => passage.id === id))) return deny("La fermeture doit concerner des passages V6 existants.");
    return report({ ...state, closedPassageIds: [...action.ids] }, "Hypothèse d’ouvrages mise à jour ; aucun déplacement n’a été exécuté.", ["W3-R09"]);
  }
  if (action.kind === "cancel") return state.route ? report({ ...state, route: null }, "Ordre préparé annulé ; les membres restent à leur position actuelle.", ["W3-R29"]) : unchanged("Aucun trajet en préparation.");
  if (action.kind === "specialize") {
    const team = selectWarSpecializationV6(state.team, action.branch, rules);
    return team === state.team ? deny("Le seuil de spécialisation n’est pas atteint, ou la branche est déjà verrouillée.") : report({ ...state, team }, `Branche ${action.branch} choisie pour cette équipe ; son identité et sa contrepartie sont conservées.`, ["W3-R14", "W3-R17"]);
  }
  if (action.kind === "rest") {
    if (state.territoryId !== state.originId) return deny("Le repos équipé de cet exercice n’est installé qu’au point de départ.");
    if (state.team.fatigue === 0) return unchanged("L’équipe est déjà reposée ; aucun tour ni RAV consommé.");
    return report(spendTurn({ ...state, team: { ...state.team, fatigue: Math.max(0, state.team.fatigue - rules.parameters.rest_fatigue_reduction) } }), "Repos équipé au point de départ ; la fatigue baisse sans soin automatique ni retour d’un membre perdu.", ["W3-R11", "W3-R15"]);
  }
  if (!presentIds.length) return deny("Aucun membre valide n’est présent pour exécuter cet ordre.");
  if (action.kind === "plan") {
    const route = planWarRouteV6(state.territoryId, action.destinationId, unit.commandPoints, state.closedPassageIds, rules);
    if (!route) return deny("Aucune route ouverte ne peut accueillir cette équipe.");
    if (!route.passageIds.length) return unchanged("L’équipe est déjà à cette destination.");
    return report({ ...state, route }, "Trajet préparé. Chaque passage reste à exécuter ; la destination n’est pas encore traversée.", ["W3-METH06", "W3-R04"]);
  }
  if (action.kind === "advance") {
    const route = state.route;
    if (!route || !route.passageIds.length || route.territoryIds[0] !== state.territoryId) return deny("Préparez un trajet depuis la position réelle de l’équipe.");
    const passage = rules.passages.find(item => item.id === route.passageIds[0]);
    const destination = route.territoryIds[1];
    if (!passage || state.closedPassageIds.includes(passage.id) || passage.capacityPc < unit.commandPoints || !((passage.fromId === state.territoryId && passage.toId === destination) || (passage.bidirectional && passage.toId === state.territoryId && passage.fromId === destination))) return deny("Le prochain passage n’est plus admissible. Replanifiez ou rouvrez l’ouvrage.");
    const remaining = route.passageIds.length > 1 ? { passageIds: route.passageIds.slice(1), territoryIds: route.territoryIds.slice(1), cost: route.cost - passage.movementCost } : null;
    const next = spendTurn({ ...state, territoryId: destination, route: remaining, traversedIds: state.traversedIds.includes(destination) ? state.traversedIds : [...state.traversedIds, destination], team: { ...state.team, fatigue: Math.min(rules.parameters.fatigue_max, state.team.fatigue + rules.parameters.march_fatigue) } });
    return report(next, `Passage ${passage.id} exécuté ; arrivée à ${destination}. Besoin d’entretien ${unit.upkeepRav} RAV, consommé ${Math.min(state.ravStock, unit.upkeepRav)}${state.ravStock < unit.upkeepRav ? " (rationnement)" : ""} ; fatigue +${rules.parameters.march_fatigue}. Aucun contrôle de territoire attribué.`, ["W3-R04", "W3-R05", "W3-R10", "W3-R11"]);
  }
  if (action.kind === "observe") {
    if (state.observations.some(observation => observation.territoryId === state.territoryId)) return unchanged("Ce renseignement est déjà validé ; revenir ne donne pas une deuxième récompense.");
    const result = applyWarResultV6(state.team, { operationId: `exercise:recon:${state.territoryId}`, resultId: `exercise:intel:${state.territoryId}`, mode: "strategic", objective: "recon", participantIds: presentIds, final: true }, rules);
    if (!result.accepted || !result.changed) return deny("Ce résultat ne peut pas être validé à nouveau.");
    return report(spendTurn({ ...state, team: result.state, observations: [...state.observations, { territoryId: state.territoryId, turn: state.turn + 1, sourceId: "W3-UP04" }] }), `Observation nouvelle à ${state.territoryId} : ${rules.parameters.xp_recon} XP aux ${presentIds.length} membres présents. La reconnaissance n’accorde ni accord local ni annexion.`, ["W3-UP04", "W3-R05", "W3-R06", "W3-R13"]);
  }
  return deny("Ordre d’exercice inconnu.");
}
