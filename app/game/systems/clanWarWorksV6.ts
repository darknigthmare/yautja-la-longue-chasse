import {
  DEFAULT_WAR_RULES_V6, applyWarResultV6, createWarTeamV6, estimateWarTeamV6,
  planWarRouteV6, selectWarSpecializationV6, warTeamExperienceV6,
  type WarRulesV6, type WarTeamStateV6,
} from "./clanWarBibleV6";

export interface WarWorkDefinitionV6 {
  id: string; name: string; kind: "rest" | "navigation" | "defense" | "stock" | "repair" | "extraction" | "relay" | "hoist" | "watch" | "platform" | "bridge";
  costRav: number; upkeepRav: number; delayTurns: number; operatorUnitId: string;
  effect: string; limit: string; deployment: string; defensePercent: number;
  sourceRow: number; sourceCells: string[]; capacityRav: number;
}
const supportedWorks = { "W3-S02": "rest", "W3-S05": "navigation", "W3-S07": "defense", "W3-S03": "stock", "W3-S04": "repair", "W3-S16": "extraction", "W3-S12": "relay", "W3-S17": "hoist", "W3-S01": "watch", "W3-S06": "platform", "W3-S08": "bridge" } as const;
const legacyWorkIds = ["W3-S02", "W3-S05", "W3-S07", "W3-S03", "W3-S04"];
const legacyWorksAvailable = (definitions: WarWorkDefinitionV6[]) => legacyWorkIds.every(id => definitions.some(definition => definition.id === id));

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
      || (kind === "stock" && !effect.includes("vingt RAV identifiées"))
      || (kind === "relay" && (operatorUnitId !== "W3-U28" || !effect.includes("Relie deux secteurs") || !limit.includes("Relief et sabotage")))
      || (kind === "watch" && (operatorUnitId !== "W3-U02" || !effect.includes("position haute occupée") || !limit.includes("obstacle opaque")))
      || (kind === "platform" && (operatorUnitId !== "W3-U13" || !effect.includes("abri directionnel") || !limit.includes("Angle mort sous")))
      || (kind === "bridge" && (operatorUnitId !== "W3-U12" || delayTurns !== 3 || !effect.includes("trois ancrages") || !limit.includes("groupe entier")))
      || (kind === "hoist" && (operatorUnitId !== "W3-U20" || rules.units.find(unit => unit.id === operatorUnitId)?.fullMembers !== 2
        || !effect.includes("entre deux plans") || !limit.includes("Deux opérateurs présents")))) return [];
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
export interface WarPatientV88 {
  memberId: string; teamId: string; declaredTerritoryId: string; declaredTurn: number;
  territoryId: string; carrierId: string | null; carrierTeamId: string | null;
  arrival: { workId: string; turn: number } | null;
  steps: { passageId: string; fromId: string; toId: string; turn: number; carrierId: string; carrierTeamId: string; guardTeamId: string; guardTerritoryId: string }[];
}
export interface WarExtractionV88 {
  version: 1; rulesKey: string; patients: WarPatientV88[];
  guards: { teamId: string; passageId: string; territoryId: string }[];
}
export interface WarInfrastructureV88 {
  version: 1; rulesKey: string;
  traversals: { teamId: string; passageId: string; fromId: string; toId: string; turn: number }[];
  groundKits: { workId: string; territoryId: string;
    placement: { kind: "drop"; teamId: string; turn: number } | { kind: "lift"; liftId: string } }[];
  lifts: { id: string; hoistWorkId: string; kitWorkId: string; passageId: string; fromId: string; toId: string;
    turn: number; operatorTeamId: string; memberIds: string[] }[];
  relayReceipts: { id: string; relayWorkId: string; senderTeamId: string; recipientTeamId: string; passageId: string;
    fromId: string; toId: string; turn: number; observations: { territoryId: string; teamId: string; turn: number }[] }[];
}
export type WarTerrainProfileV89 = "low-screen" | "opaque-rock" | "open";
export type WarTerrainTargetV89 = "near-approach" | "far-approach" | "rear-approach" | "under-platform";
export interface WarBridgeTransitV89 {
  id: string; workId: string; teamId: string; fromId: string; toId: string; startedTurn: number;
  memberIds: string[]; operatorTeamId: string; operatorMemberIds: string[];
  steps: { memberId: string; direction: "forward" | "return" }[];
  completed: "arrived" | "returned" | null; resolvedTurn: number | null;
}
/** Shapes, cone and substeps are visible prototype hypotheses, not lore measurements. */
export interface WarTerrainV89 {
  version: 1; rulesKey: string; geometryKey: "local-terrain-v89-1";
  configurations: { workId: string; profile: WarTerrainProfileV89; facing: "east" | "west" }[];
  traversals: WarInfrastructureV88["traversals"];
  anchorCargo: { workId: string; slot: number; teamId: string; loadedTurn: number }[];
  anchors: { workId: string; slot: number; territoryId: string; teamId: string; memberIds: string[]; loadedTurn: number; turn: number }[];
  sightings: { workId: string; teamId: string; memberIds: string[]; targetId: WarTerrainTargetV89;
    profile: WarTerrainProfileV89; facing: "east" | "west"; turn: number }[];
  transits: WarBridgeTransitV89[];
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
  /** Optional explicit exercise extension. Old V87 checkpoints have none and are not rewritten. */
  extraction?: WarExtractionV88;
  /** Explicit relay/hoist exercise. Absent in the six-work checkpoints and never inferred on import. */
  infrastructure?: WarInfrastructureV88;
  /** Added only by an explicit S01/S06/S08 reservation; older carnets stay exact. */
  terrain?: WarTerrainV89;
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
  | { kind: "return-rav"; teamId: string }
  | { kind: "declare-patient"; teamId: string; memberId: string }
  | { kind: "guard-route"; teamId: string; passageId: string }
  | { kind: "load-patient"; teamId: string; memberId: string; carrierId: string }
  | { kind: "put-down-patient"; teamId: string; memberId: string }
  | { kind: "return-patient"; teamId: string; memberId: string; workId: string }
  | { kind: "put-down-kit"; teamId: string; workId: string }
  | { kind: "lift-kit"; teamId: string; workId: string; kitWorkId: string }
  | { kind: "relay-intel"; teamId: string; workId: string; recipientTeamId: string }
  | { kind: "terrain-hypothesis"; workId: string; profile: WarTerrainProfileV89 }
  | { kind: "orient-platform"; workId: string; teamId: string; facing: "east" | "west" }
  | { kind: "scan-terrain"; workId: string; teamId: string; targetId: WarTerrainTargetV89 }
  | { kind: "load-anchor" | "place-anchor"; workId: string; teamId: string }
  | { kind: "begin-bridge"; workId: string; teamId: string }
  | { kind: "cross-bridge" | "return-bridge"; transitId: string; teamId: string; memberId: string }
  | { kind: "cancel-bridge"; transitId: string; teamId: string };
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
const carryingPatient = (state: WarWorksSessionV6, teamId: string) => state.extraction?.patients.find(patient => patient.carrierTeamId === teamId);
export const warWorksGuardV88 = (state: WarWorksSessionV6, teamId: string) => state.extraction?.guards.find(guard => guard.teamId === teamId);
const extractionRulesKey = (rules: WarRulesV6) => JSON.stringify({ sha: rules.metadata.sha256,
  entries: ["W3-S16", "W3-U17", "W3-U07", "W3-S11", "W3-U18", "W3-R15", "W3-R20", "W3-OBJ04"].map(id => rules.entries.find(entry => entry.id === id)) });
const withExtraction = (state: WarWorksSessionV6, rules: WarRulesV6) => state.extraction ?? { version: 1 as const, rulesKey: extractionRulesKey(rules), patients: [], guards: [] };
const infrastructureRulesKey = (rules: WarRulesV6) => JSON.stringify({ sha: rules.metadata.sha256,
  entries: ["W3-S12", "W3-S17", "W3-U28", "W3-U20", "W3-R05", "W3-R09", "W3-R19"].map(id => rules.entries.find(entry => entry.id === id)) });
const withInfrastructure = (state: WarWorksSessionV6, rules: WarRulesV6): WarInfrastructureV88 => state.infrastructure ?? {
  version: 1, rulesKey: infrastructureRulesKey(rules), traversals: [], groundKits: [], lifts: [], relayReceipts: [],
};
export const warKitSiteV88 = (state: WarWorksSessionV6, work: WarWorkOrderV6) => work.phase === "reserved"
  ? state.infrastructure?.groundKits.find(item => item.workId === work.id)?.territoryId ?? state.originId
  : work.phase === "carried" ? state.teams.find(group => group.team.id === work.carrierTeamId)?.territoryId ?? null : work.territoryId;
const linkWork = (definition: WarWorkDefinitionV6) => ["defense", "relay", "hoist", "bridge"].includes(definition.kind);
const passageDirection = (passage: WarRulesV6["passages"][number], fromId: string, toId: string) =>
  (passage.fromId === fromId && passage.toId === toId) || (passage.bidirectional && passage.toId === fromId && passage.fromId === toId);
const oppositeSite = (passage: WarRulesV6["passages"][number], site: string) => passage.fromId === site ? passage.toId : passage.toId === site ? passage.fromId : null;
const reliefPassage = (passage: WarRulesV6["passages"][number], rules: WarRulesV6) =>
  rules.entries.find(entry => entry.sheet === "Passages de Korthas" && entry.id === passage.id)?.fields.find(field => field.column === "E")?.value === "Liaison de relief";
const preparedPassage = (passage: WarRulesV6["passages"][number]) => passage.kind === "Traverse préparée";
const terrainKinds = ["watch", "platform", "bridge"];
const terrainRulesKey = (rules: WarRulesV6) => JSON.stringify({ sha: rules.metadata.sha256,
  entries: ["W3-S01", "W3-S06", "W3-S08", "W3-U02", "W3-U13", "W3-U12", "W3-R05", "W3-R19"].map(id => rules.entries.find(entry => entry.id === id)) });
const withTerrain = (state: WarWorksSessionV6, rules: WarRulesV6): WarTerrainV89 => state.terrain ?? {
  version: 1, rulesKey: terrainRulesKey(rules), geometryKey: "local-terrain-v89-1",
  configurations: [], traversals: [], anchorCargo: [], anchors: [], sightings: [], transits: [],
};
const anchorCargo = (state: WarWorksSessionV6, teamId: string) => state.terrain?.anchorCargo.find(cargo => cargo.teamId === teamId);
export const warBridgeActiveV89 = (state: WarWorksSessionV6) => state.terrain?.transits.find(transit => transit.completed === null);
export function warBridgeMemberSiteV89(transit: WarBridgeTransitV89, memberId: string) {
  const step = transit.steps.filter(step => step.memberId === memberId).at(-1);
  return step?.direction === "forward" ? transit.toId : transit.fromId;
}
/** Fixed drawing units: 100 px/case, a 60-degree arc, one low screen or one
 * opaque rock. These are exercise inputs, not coordinates from Excel. */
export const WAR_TERRAIN_GEOMETRY_V89 = {
  width: 800, height: 340, eye: { watch: { x: 160, y: 140 }, platform: { x: 160, y: 180 }, ground: { x: 160, y: 290 } },
  targets: { "near-approach": { x: 310, y: 225, name: "Approche proche" }, "far-approach": { x: 600, y: 230, name: "Approche derrière l’obstacle" },
    "rear-approach": { x: 65, y: 200, name: "Approche arrière" }, "under-platform": { x: 160, y: 290, name: "Sous la plateforme" } },
  obstacles: { "low-screen": { x: 360, y: 220, width: 65, height: 90 }, "opaque-rock": { x: 360, y: 70, width: 65, height: 240 } },
};
/** Slab intersection includes touching an opaque edge; drawing and rules use the same rectangle. */
export function warTerrainRayBlockedV89(from: { x: number; y: number }, to: { x: number; y: number }, profile: WarTerrainProfileV89) {
  if (profile === "open") return false;
  const obstacle = WAR_TERRAIN_GEOMETRY_V89.obstacles[profile];
  let entry = 0, exit = 1;
  for (const axis of ["x", "y"] as const) {
    const delta = to[axis] - from[axis], low = obstacle[axis], high = low + (axis === "x" ? obstacle.width : obstacle.height);
    if (delta === 0) { if (from[axis] < low || from[axis] > high) return false; }
    else { const a = (low - from[axis]) / delta, b = (high - from[axis]) / delta; entry = Math.max(entry, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b)); }
    if (entry > exit) return false;
  }
  return true;
}
function terrainGeometry(kind: "watch" | "platform", profile: WarTerrainProfileV89, facing: "east" | "west", targetId: WarTerrainTargetV89, range: number) {
  const point = WAR_TERRAIN_GEOMETRY_V89.eye[kind], target = WAR_TERRAIN_GEOMETRY_V89.targets[targetId];
  const dx = target.x - point.x, dy = target.y - point.y, distance = Math.hypot(dx, dy);
  const inRange = distance <= range * 100, blocked = warTerrainRayBlockedV89(point, target, profile);
  const blindBelow = kind === "platform" && target.x >= 130 && target.x <= 210 && target.y >= 240;
  const inArc = kind === "watch" || (facing === "east" ? dx : -dx) > 0 && Math.abs(dy) <= Math.abs(dx) * Math.tan(Math.PI / 6);
  return { point, target, inRange, blocked, blindBelow, inArc, visible: inRange && !blocked && !blindBelow && inArc,
    protectedFromProbe: kind === "platform" && inArc && !blindBelow && inRange && !blocked };
}
export function evaluateWarTerrainV89(state: WarWorksSessionV6, workId: string, targetId: WarTerrainTargetV89, rules: WarRulesV6 = DEFAULT_WAR_RULES_V6) {
  const work = state.works.find(work => work.id === workId), def = warWorksDefinitionsV6(rules).find(def => def.id === work?.structureId);
  const config = state.terrain?.configurations.find(config => config.workId === workId);
  if (!work || !def || !config || !["watch", "platform"].includes(def.kind) || !Object.hasOwn(WAR_TERRAIN_GEOMETRY_V89.targets, targetId)) return null;
  const geometry = terrainGeometry(def.kind as "watch" | "platform", config.profile, config.facing, targetId, unitFor(rules, def.operatorUnitId)?.range ?? 0);
  const occupied = warWorkOccupiedV6(state, work, rules), supplied = suppliedInfrastructureSite(state, work.territoryId, rules);
  return { ...geometry, geometricVisible: geometry.visible, visible: occupied && supplied && geometry.visible,
    protectedFromProbe: occupied && supplied && geometry.protectedFromProbe, occupied, supplied, operational: occupied && supplied, profile: config.profile, facing: config.facing,
    groundBlocked: warTerrainRayBlockedV89(WAR_TERRAIN_GEOMETRY_V89.eye.ground, geometry.target, config.profile) };
}
/** Powered operation requires enough existing local lots for this site's teams
 * and commissioned structures. The normal turn debits them once, not here. */
function suppliedInfrastructureSite(state: WarWorksSessionV6, territoryId: string, rules: WarRulesV6) {
  const stock = state.lots.filter(lot => lot.location === "depot" ? territoryId === state.originId
    : lot.location === "cache" && state.works.some(work => work.id === lot.workId && work.phase === "ready" && work.territoryId === territoryId)).reduce((sum, lot) => sum + lot.rav, 0);
  const teamsNeed = state.teams.filter(group => group.territoryId === territoryId).reduce((sum, group) =>
    sum + Math.max(0, (unitFor(rules, group.team.unitId)?.upkeepRav ?? 0) - warWorksCarriedRavV87(state, group.team.id)), 0);
  const worksNeed = state.works.filter(work => work.phase === "ready" && work.territoryId === territoryId).reduce((sum, work) =>
    sum + (warWorksDefinitionsV6(rules).find(def => def.id === work.structureId)?.upkeepRav ?? 0), 0);
  return state.supplyMode === "local" && stock >= teamsNeed + worksNeed;
}
export function warExtractionAvailableV88(rules: WarRulesV6 = DEFAULT_WAR_RULES_V6) {
  const cell = (id: string, column: string) => rules.entries.find(entry => entry.id === id)?.fields.find(field => field.column === column)?.value;
  return warWorksDefinitionsV6(rules).some(def => def.id === "W3-S16" && def.operatorUnitId === "W3-U17")
    && unitFor(rules, "W3-U17")?.fullMembers === 3 && unitFor(rules, "W3-U07")?.fullMembers === 3
    && cell("W3-S11", "G") === "W3-U18" && ["D", "E", "F"].every(column => Number.isSafeInteger(cell("W3-S11", column)))
    && String(cell("W3-S11", "I")).includes("Consommables") && !!unitFor(rules, "W3-U18")
    && String(cell("W3-S16", "H")).includes("route gardée") && String(cell("W3-S16", "I")).includes("Aucune résurrection")
    && ["W3-R15", "W3-R20", "W3-OBJ04"].every(id => rules.entries.some(entry => entry.id === id));
}
function passageGuard(state: WarWorksSessionV6, passageId: string, rules: WarRulesV6) {
  const passage = rules.passages.find(item => item.id === passageId);
  return passage && state.extraction?.guards.find(guard => guard.passageId === passageId && [passage.fromId, passage.toId].includes(guard.territoryId)
    && state.teams.some(group => group.team.id === guard.teamId && group.team.unitId === "W3-U07" && group.territoryId === guard.territoryId
      && fitMembers(group).length === unitFor(rules, group.team.unitId)?.fullMembers && !group.payloadWorkId && !group.dutyWorkId && !group.route));
}
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
  parameters: rules.parameters, units: rules.units, territories: rules.territories, passages: rules.passages,
  // Preserve the exact published V87 key; all additional effects bind in optional extensions.
  definitions: definitions.filter(definition => legacyWorkIds.includes(definition.id)) });
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
  if (!legacyWorksAvailable(definitions) || !["front", "local"].includes(supplyMode) || !definitions.some(def => def.operatorUnitId === startingUnitId) || !unit
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

/** Strict additive schema and physical history. This rejects impossible
 * geometry, copied parts and whole-team bridge jumps; it is not a signature
 * authenticating a user-editable exercise file or a campaign achievement. */
function validTerrainV89(state: WarWorksSessionV6, rules: WarRulesV6, definitions: WarWorkDefinitionV6[], ids: Set<string>): boolean {
  const extension = state.terrain!;
  const keys = (object: object, fields: string[]) => !!object && Object.keys(object).length === fields.length && Object.keys(object).every(key => fields.includes(key));
  const integer = (value: number, low: number, high: number) => Number.isSafeInteger(value) && value >= low && value <= high;
  const profile = (value: string) => ["low-screen", "opaque-rock", "open"].includes(value);
  const facing = (value: string) => ["east", "west"].includes(value);
  const fullMembers = (group: WarWorksTeamV6 | undefined, memberIds: string[]) => !!group && Array.isArray(memberIds)
    && memberIds.length === unitFor(rules, group.team.unitId)?.fullMembers && new Set(memberIds).size === memberIds.length
    && memberIds.every(id => group.team.members.some(member => member.id === id));
  if (!keys(extension, ["version", "rulesKey", "geometryKey", "configurations", "traversals", "anchorCargo", "anchors", "sightings", "transits"])
    || extension.version !== 1 || extension.geometryKey !== "local-terrain-v89-1" || extension.rulesKey !== terrainRulesKey(rules) || state.supplyMode !== "local"
    || !state.works.some(work => definitions.some(definition => definition.id === work.structureId && terrainKinds.includes(definition.kind)))
    || [extension.configurations, extension.traversals, extension.anchorCargo, extension.anchors, extension.sightings, extension.transits].some(list => !Array.isArray(list) || list.length > 10000)
    || new Set(extension.configurations.map(config => config.workId)).size !== extension.configurations.length) return false;
  let previousTurn = 1;
  const lastSites = new Map<string, string>();
  for (const step of extension.traversals) {
    const passage = rules.passages.find(item => item.id === step.passageId), group = state.teams.find(item => item.team.id === step.teamId);
    if (!keys(step, ["teamId", "passageId", "fromId", "toId", "turn"]) || !passage || !group
      || !passageDirection(passage, step.fromId, step.toId) || !integer(step.turn, previousTurn + 1, state.turn)
      || (lastSites.has(step.teamId) && lastSites.get(step.teamId) !== step.fromId)
      || passage.capacityPc < (unitFor(rules, group.team.unitId)?.commandPoints ?? Infinity)
      || preparedPassage(passage) && !extension.transits.some(transit => transit.teamId === step.teamId && transit.completed === "arrived"
        && transit.fromId === step.fromId && transit.toId === step.toId && transit.resolvedTurn === step.turn
        && state.works.some(work => work.id === transit.workId && work.passageId === passage.id))) return false;
    previousTurn = step.turn; lastSites.set(step.teamId, step.toId);
  }
  if ([...lastSites].some(([teamId, territoryId]) => state.teams.find(group => group.team.id === teamId)?.territoryId !== territoryId)) return false;
  const siteAt = (teamId: string, turn: number) => {
    const route = extension.traversals.filter(step => step.teamId === teamId);
    return route.filter(step => step.turn <= turn).at(-1)?.toId ?? route[0]?.fromId ?? state.teams.find(group => group.team.id === teamId)?.territoryId;
  };
  for (const config of extension.configurations) {
    const work = state.works.find(work => work.id === config.workId), def = definitions.find(def => def.id === work?.structureId);
    if (!keys(config, ["workId", "profile", "facing"]) || !work || !def || !["watch", "platform"].includes(def.kind) || !profile(config.profile) || !facing(config.facing)) return false;
  }
  const slots = new Set<string>(), cargoTeams = new Set<string>();
  for (const cargo of extension.anchorCargo) {
    const work = state.works.find(work => work.id === cargo.workId), group = state.teams.find(group => group.team.id === cargo.teamId);
    const slot = `${cargo.workId}:${cargo.slot}`;
    if (!keys(cargo, ["workId", "slot", "teamId", "loadedTurn"]) || !work || work.structureId !== "W3-S08" || !["delivered", "building"].includes(work.phase)
      || !group || group.team.unitId !== "W3-U12" || fitMembers(group).length !== unitFor(rules, group.team.unitId)?.fullMembers
      || group.dutyWorkId || group.payloadWorkId || carryingPatient(state, group.team.id) || warWorksGuardV88(state, group.team.id)
      || !integer(cargo.slot, 1, 3) || slots.has(slot) || cargoTeams.has(cargo.teamId) || !integer(cargo.loadedTurn, 1, state.turn)
      || siteAt(cargo.teamId, cargo.loadedTurn) !== work.territoryId
      || extension.traversals.some(step => step.teamId === cargo.teamId && step.turn > cargo.loadedTurn
        && !rules.passages.find(passage => passage.id === step.passageId)?.permitsRav)) return false;
    slots.add(slot); cargoTeams.add(cargo.teamId);
  }
  previousTurn = 1;
  const workSlots = new Map<string, number>();
  for (const anchor of extension.anchors) {
    const work = state.works.find(work => work.id === anchor.workId), group = state.teams.find(group => group.team.id === anchor.teamId);
    const passage = rules.passages.find(passage => passage.id === work?.passageId), slot = `${anchor.workId}:${anchor.slot}`;
    const expectedSite = work && (anchor.slot === 3 && passage ? oppositeSite(passage, work.territoryId) : work.territoryId);
    if (!keys(anchor, ["workId", "slot", "territoryId", "teamId", "memberIds", "loadedTurn", "turn"]) || !work || work.structureId !== "W3-S08"
      || !passage || !preparedPassage(passage) || !group || group.team.unitId !== "W3-U12" || !fullMembers(group, anchor.memberIds)
      || !integer(anchor.slot, 1, 3) || anchor.slot !== (workSlots.get(work.id) ?? 0) + 1 || slots.has(slot)
      || !integer(anchor.loadedTurn, 1, anchor.turn - 1) || !integer(anchor.turn, previousTurn + 1, state.turn)
      || anchor.territoryId !== expectedSite || siteAt(anchor.teamId, anchor.loadedTurn) !== work.territoryId
      || siteAt(anchor.teamId, anchor.turn) !== anchor.territoryId
      || extension.traversals.some(step => step.teamId === anchor.teamId && step.turn > anchor.loadedTurn && step.turn <= anchor.turn
        && !rules.passages.find(passage => passage.id === step.passageId)?.permitsRav)
      || !state.observed.some(item => item.territoryId === anchor.territoryId && item.turn <= anchor.turn)) return false;
    slots.add(slot); workSlots.set(work.id, anchor.slot); previousTurn = anchor.turn;
  }
  for (const work of state.works) {
    const def = definitions.find(def => def.id === work.structureId);
    if (["watch", "platform"].includes(def?.kind ?? "") && !extension.configurations.some(config => config.workId === work.id)) return false;
    if (def?.kind === "bridge" && (work.workedTurns !== (workSlots.get(work.id) ?? 0)
      || ["delivered", "building"].includes(work.phase) && work.operatorTeamId !== null
      || work.workedTurns > 0 && !["building", "ready"].includes(work.phase))) return false;
  }
  const sightKeys = new Set<string>();
  previousTurn = 1;
  for (const sight of extension.sightings) {
    const work = state.works.find(work => work.id === sight.workId), def = definitions.find(def => def.id === work?.structureId);
    const group = state.teams.find(group => group.team.id === sight.teamId), key = `${sight.workId}:${sight.targetId}:${sight.profile}:${sight.facing}`;
    if (!keys(sight, ["workId", "teamId", "memberIds", "targetId", "profile", "facing", "turn"]) || !work || work.phase !== "ready"
      || !def || !["watch", "platform"].includes(def.kind) || !group || group.team.unitId !== def.operatorUnitId || !fullMembers(group, sight.memberIds)
      || !Object.hasOwn(WAR_TERRAIN_GEOMETRY_V89.targets, sight.targetId) || !profile(sight.profile) || !facing(sight.facing) || sightKeys.has(key)
      || !integer(sight.turn, previousTurn, state.turn) || siteAt(sight.teamId, sight.turn) !== work.territoryId
      || !terrainGeometry(def.kind as "watch" | "platform", sight.profile, sight.facing, sight.targetId, unitFor(rules, def.operatorUnitId)?.range ?? 0).visible) return false;
    sightKeys.add(key); previousTurn = sight.turn;
  }
  let active = 0, previousResolvedTurn = 1;
  for (const transit of extension.transits) {
    const work = state.works.find(work => work.id === transit.workId), passage = rules.passages.find(passage => passage.id === work?.passageId);
    const group = state.teams.find(group => group.team.id === transit.teamId), operator = state.teams.find(group => group.team.id === transit.operatorTeamId);
    if (!keys(transit, ["id", "workId", "teamId", "fromId", "toId", "startedTurn", "memberIds", "operatorTeamId", "operatorMemberIds", "steps", "completed", "resolvedTurn"])
      || typeof transit.id !== "string" || !/^terrain:\d+$/.test(transit.id) || !integer(Number(transit.id.slice(8)), 2, state.nextIdentity - 1) || ids.has(transit.id)
      || !work || work.structureId !== "W3-S08" || work.phase !== "ready" || !passage || !preparedPassage(passage)
      || !passageDirection(passage, transit.fromId, transit.toId) || !group || !fullMembers(group, transit.memberIds)
      || !operator || operator === group || operator.team.unitId !== "W3-U12" || !fullMembers(operator, transit.operatorMemberIds)
      || !integer(transit.startedTurn, previousResolvedTurn, state.turn) || siteAt(group.team.id, transit.startedTurn) !== transit.fromId
      || siteAt(operator.team.id, transit.startedTurn) !== work.territoryId || !Array.isArray(transit.steps) || transit.steps.length > transit.memberIds.length * 2
      || passage.capacityPc < (unitFor(rules, group.team.unitId)?.commandPoints ?? Infinity) || ![null, "arrived", "returned"].includes(transit.completed)) return false;
    ids.add(transit.id);
    const positions = new Map(transit.memberIds.map(memberId => [memberId, transit.fromId])), passed = new Set<string>();
    let returning = false;
    for (const step of transit.steps) {
      if (!keys(step, ["memberId", "direction"]) || !transit.memberIds.includes(step.memberId)) return false;
      if (step.direction === "forward") {
        if (returning || passed.has(step.memberId) || positions.get(step.memberId) !== transit.fromId) return false;
        positions.set(step.memberId, transit.toId); passed.add(step.memberId);
      } else if (step.direction === "return") {
        if (positions.get(step.memberId) !== transit.toId) return false;
        positions.set(step.memberId, transit.fromId); returning = true;
      } else return false;
    }
    const allArrived = [...positions.values()].every(site => site === transit.toId), allReturned = [...positions.values()].every(site => site === transit.fromId);
    if (transit.completed === null) {
      active++;
      if (transit !== extension.transits.at(-1) || allArrived || allReturned && transit.steps.length > 0 || transit.resolvedTurn !== null || state.turn !== transit.startedTurn
        || group.territoryId !== transit.fromId || group.route || group.dutyWorkId || group.payloadWorkId || carryingRav(state, group) || anchorCargo(state, group.team.id)
        || carryingPatient(state, group.team.id) || warWorksGuardV88(state, group.team.id) || fitMembers(group).length !== transit.memberIds.length
        || work.operatorTeamId !== operator.team.id || !warWorkOccupiedV6(state, work, rules)) return false;
    } else {
      if (transit.completed === "arrived" ? !allArrived || returning : !allReturned || transit.steps.length > 0 && !returning) return false;
      const resolvedTurn = transit.startedTurn + (transit.steps.length ? 1 : 0);
      if (transit.resolvedTurn !== resolvedTurn || !integer(resolvedTurn, 1, state.turn)
        || siteAt(group.team.id, resolvedTurn) !== (transit.completed === "arrived" ? transit.toId : transit.fromId)) return false;
      if (transit.completed === "arrived" && !extension.traversals.some(step => step.teamId === transit.teamId && step.passageId === passage.id
        && step.fromId === transit.fromId && step.toId === transit.toId && step.turn === resolvedTurn)) return false;
      previousResolvedTurn = resolvedTurn;
    }
  }
  return active <= 1;
}
function validSession(state: WarWorksSessionV6, rules: WarRulesV6, definitions: WarWorkDefinitionV6[]): boolean {
  try {
    const fields = ["version", "context", "rulesKey", "sourceSha", "supplyMode", "lots", "transfers", "turn", "nextIdentity", "originId", "startingRav", "ravStock", "teams", "recruits", "works", "observed", "closedPassageIds", "accounts", "lastTurnNeed", "lastTurnPaid", "lastTeamSupply", "reports", "extraction", "infrastructure", "terrain"];
    if (!state || Object.keys(state).some(key => !fields.includes(key))) return false;
    if (state.version !== 2 || state.context !== "free-workshop" || state.sourceSha !== rules.metadata.sha256 || state.rulesKey !== contextKey(rules, definitions)
      || !["front", "local"].includes(state.supplyMode) || !legacyWorksAvailable(definitions) || !Number.isSafeInteger(state.turn) || state.turn < 1 || state.turn >= 10000
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
      if (linkWork(def) ? !rules.passages.some(passage => passage.id === work.passageId && [passage.fromId, passage.toId].includes(work.territoryId)
        && (def.kind !== "hoist" || reliefPassage(passage, rules)) && (def.kind !== "bridge" || preparedPassage(passage))) : work.passageId !== null) return false;
      if (work.phase === "carried" ? !state.teams.some(group => group.team.id === work.carrierTeamId && group.payloadWorkId === work.id) : work.carrierTeamId !== null) return false;
      if (work.operatorTeamId && !state.teams.some(group => group.team.id === work.operatorTeamId && group.dutyWorkId === work.id
        && group.territoryId === work.territoryId && group.team.unitId === def.operatorUnitId)) return false;
      if (def.kind === "extraction" && !state.extraction) return false;
      if (["relay", "hoist"].includes(def.kind) && !state.infrastructure) return false;
      if (terrainKinds.includes(def.kind) && !state.terrain) return false;
    }
    if (state.terrain !== undefined && !validTerrainV89(state, rules, definitions, ids)) return false;
    if (state.infrastructure !== undefined) {
      const extension = state.infrastructure;
      if (!extension || Object.keys(extension).some(key => !["version", "rulesKey", "traversals", "groundKits", "lifts", "relayReceipts"].includes(key))
        || extension.version !== 1 || extension.rulesKey !== infrastructureRulesKey(rules)
        || !definitions.some(def => ["relay", "hoist"].includes(def.kind))
        || [extension.traversals, extension.groundKits, extension.lifts, extension.relayReceipts].some(list => !Array.isArray(list) || list.length > 10000)
        || new Set(extension.groundKits.map(item => item.workId)).size !== extension.groundKits.length) return false;
      let previousTurn = 1;
      const lastSites = new Map<string, string>();
      for (const step of extension.traversals) {
        const passage = rules.passages.find(item => item.id === step.passageId), group = state.teams.find(item => item.team.id === step.teamId);
        if (Object.keys(step).some(key => !["teamId", "passageId", "fromId", "toId", "turn"].includes(key)) || !passage || !group
          || !passageDirection(passage, step.fromId, step.toId) || !Number.isSafeInteger(step.turn) || step.turn < previousTurn || step.turn > state.turn
          || (lastSites.has(step.teamId) && lastSites.get(step.teamId) !== step.fromId)
          || passage.capacityPc < (unitFor(rules, group.team.unitId)?.commandPoints ?? Infinity)) return false;
        previousTurn = step.turn;
        lastSites.set(step.teamId, step.toId);
      }
      if ([...lastSites].some(([teamId, territoryId]) => state.teams.find(group => group.team.id === teamId)?.territoryId !== territoryId)) return false;
      for (const item of extension.groundKits) {
        const kit = state.works.find(work => work.id === item.workId);
        if (Object.keys(item).some(key => !["workId", "territoryId", "placement"].includes(key)) || !kit || kit.phase !== "reserved" || kit.workedTurns !== 0
          || kit.operatorTeamId !== null || !rules.territories.some(zone => zone.id === item.territoryId) || !item.placement) return false;
        if (item.placement.kind === "lift") {
          const placement = item.placement, lift = extension.lifts.find(lift => lift.id === placement.liftId);
          if (Object.keys(placement).some(key => !["kind", "liftId"].includes(key)) || !lift || lift.kitWorkId !== item.workId || lift.toId !== item.territoryId) return false;
        } else if (item.placement.kind === "drop") {
          const placement = item.placement, carrier = state.teams.find(group => group.team.id === placement.teamId);
          const route = extension.traversals.filter(step => step.teamId === placement.teamId), before = route.filter(step => step.turn <= placement.turn).at(-1);
          const site = before?.toId ?? route[0]?.fromId ?? carrier?.territoryId;
          if (Object.keys(placement).some(key => !["kind", "teamId", "turn"].includes(key)) || !carrier || site !== item.territoryId
            || !Number.isSafeInteger(placement.turn) || placement.turn < 1 || placement.turn > state.turn) return false;
        } else return false;
      }
      for (const movement of extension.lifts) {
        const work = state.works.find(item => item.id === movement.hoistWorkId), kit = state.works.find(item => item.id === movement.kitWorkId);
        const passage = rules.passages.find(item => item.id === movement.passageId), group = state.teams.find(item => item.team.id === movement.operatorTeamId);
        if (Object.keys(movement).some(key => !["id", "hoistWorkId", "kitWorkId", "passageId", "fromId", "toId", "turn", "operatorTeamId", "memberIds"].includes(key))
          || typeof movement.id !== "string" || !/^infrastructure:\d+$/.test(movement.id) || Number(movement.id.slice(15)) < 2 || Number(movement.id.slice(15)) >= state.nextIdentity || ids.has(movement.id)
          || !work || work.structureId !== "W3-S17" || work.phase !== "ready" || !kit || kit.id === work.id || !passage || work.passageId !== passage.id
          || !reliefPassage(passage, rules) || !passage.permitsRav || movement.fromId !== work.territoryId || !passageDirection(passage, movement.fromId, movement.toId)
          || !group || group.team.unitId !== "W3-U20" || !Array.isArray(movement.memberIds) || movement.memberIds.length !== 2
          || new Set(movement.memberIds).size !== 2 || movement.memberIds.some(id => !group.team.members.some(member => member.id === id))
          || !Number.isSafeInteger(movement.turn) || movement.turn < 1 || movement.turn > state.turn) return false;
        ids.add(movement.id);
      }
      for (const receipt of extension.relayReceipts) {
        const work = state.works.find(item => item.id === receipt.relayWorkId), sender = state.teams.find(item => item.team.id === receipt.senderTeamId);
        const recipient = state.teams.find(item => item.team.id === receipt.recipientTeamId), passage = rules.passages.find(item => item.id === receipt.passageId);
        if (Object.keys(receipt).some(key => !["id", "relayWorkId", "senderTeamId", "recipientTeamId", "passageId", "fromId", "toId", "turn", "observations"].includes(key))
          || typeof receipt.id !== "string" || !/^infrastructure:\d+$/.test(receipt.id) || Number(receipt.id.slice(15)) < 2 || Number(receipt.id.slice(15)) >= state.nextIdentity || ids.has(receipt.id)
          || !work || work.structureId !== "W3-S12" || work.phase !== "ready" || !sender || sender.team.unitId !== "W3-U28" || !recipient || sender === recipient
          || !passage || work.passageId !== passage.id || receipt.fromId !== work.territoryId || !passageDirection(passage, receipt.fromId, receipt.toId)
          || !Number.isSafeInteger(receipt.turn) || receipt.turn < 1 || receipt.turn > state.turn
          || !extension.traversals.some(step => step.teamId === sender.team.id && step.passageId === passage.id && step.toId === receipt.toId && step.turn <= receipt.turn)
          || !extension.traversals.some(step => step.teamId === sender.team.id && step.passageId === passage.id && step.toId === receipt.fromId && step.turn <= receipt.turn)
          || !Array.isArray(receipt.observations) || receipt.observations.length < 1 || receipt.observations.length > rules.territories.length
          || new Set(receipt.observations.map(item => item.territoryId)).size !== receipt.observations.length
          || receipt.observations.some(item => Object.keys(item).some(key => !["territoryId", "teamId", "turn"].includes(key))
            || item.teamId !== sender.team.id || item.turn > receipt.turn || !state.observed.some(observed => observed.territoryId === item.territoryId && observed.teamId === item.teamId && observed.turn === item.turn))) return false;
        ids.add(receipt.id);
      }
    }
    if (state.extraction !== undefined) {
      const extraction = state.extraction;
      if (!extraction || !warExtractionAvailableV88(rules) || Object.keys(extraction).some(key => !["version", "rulesKey", "patients", "guards"].includes(key))
        || extraction.version !== 1 || extraction.rulesKey !== extractionRulesKey(rules) || !Array.isArray(extraction.patients)
        || extraction.patients.length > members.size || !Array.isArray(extraction.guards) || extraction.guards.length > state.teams.length
        || new Set(extraction.patients.map(patient => patient.memberId)).size !== extraction.patients.length
        || new Set(extraction.guards.map(guard => guard.teamId)).size !== extraction.guards.length) return false;
      for (const guard of extraction.guards) {
        const group = state.teams.find(item => item.team.id === guard.teamId), passage = rules.passages.find(item => item.id === guard.passageId);
        if (Object.keys(guard).some(key => !["teamId", "passageId", "territoryId"].includes(key)) || !group || group.team.unitId !== "W3-U07"
          || !passage || ![passage.fromId, passage.toId].includes(guard.territoryId) || group.territoryId !== guard.territoryId
          || fitMembers(group).length !== unitFor(rules, group.team.unitId)?.fullMembers || group.dutyWorkId || group.payloadWorkId || group.route) return false;
      }
      const carriers = new Set<string>();
      for (const patient of extraction.patients) {
        const owner = state.teams.find(group => group.team.id === patient.teamId), member = owner?.team.members.find(item => item.id === patient.memberId);
        if (Object.keys(patient).some(key => !["memberId", "teamId", "declaredTerritoryId", "declaredTurn", "territoryId", "carrierId", "carrierTeamId", "arrival", "steps"].includes(key))
          || !member || member.status !== "wounded" || !rules.territories.some(zone => zone.id === patient.territoryId)
          || !rules.territories.some(zone => zone.id === patient.declaredTerritoryId) || !Number.isSafeInteger(patient.declaredTurn)
          || patient.declaredTurn < 1 || patient.declaredTurn > state.turn || !Array.isArray(patient.steps) || patient.steps.length > 10000) return false;
        let site = patient.declaredTerritoryId, lastTurn = patient.declaredTurn;
        for (const step of patient.steps) {
          const passage = rules.passages.find(item => item.id === step.passageId), porter = state.teams.find(group => group.team.id === step.carrierTeamId);
          const guard = state.teams.find(group => group.team.id === step.guardTeamId);
          if (Object.keys(step).some(key => !["passageId", "fromId", "toId", "turn", "carrierId", "carrierTeamId", "guardTeamId", "guardTerritoryId"].includes(key))
            || !passage || passage.capacityPc < (unitFor(rules, "W3-U17")?.commandPoints ?? Infinity) || step.fromId !== site || !Number.isSafeInteger(step.turn) || step.turn <= lastTurn || step.turn > state.turn
            || !((passage.fromId === step.fromId && passage.toId === step.toId) || (passage.bidirectional && passage.toId === step.fromId && passage.fromId === step.toId))
            || !porter || porter.team.unitId !== "W3-U17" || !porter.team.members.some(item => item.id === step.carrierId && item.id !== patient.memberId)
            || !guard || guard.team.unitId !== "W3-U07" || ![passage.fromId, passage.toId].includes(step.guardTerritoryId)) return false;
          site = step.toId; lastTurn = step.turn;
        }
        if (site !== patient.territoryId || (patient.carrierId === null) !== (patient.carrierTeamId === null)) return false;
        if (patient.carrierTeamId !== null) {
          const porter = state.teams.find(group => group.team.id === patient.carrierTeamId);
          if (!porter || porter.team.unitId !== "W3-U17" || porter.territoryId !== patient.territoryId || porter.payloadWorkId || porter.dutyWorkId
            || fitMembers(porter).length !== unitFor(rules, porter.team.unitId)?.fullMembers || !fitMembers(porter).some(item => item.id === patient.carrierId)
            || carriers.has(porter.team.id) || patient.arrival) return false;
          carriers.add(porter.team.id);
        }
        if (patient.arrival !== null) {
          const depot = state.works.find(work => work.id === patient.arrival?.workId);
          if (Object.keys(patient.arrival).some(key => !["workId", "turn"].includes(key)) || !depot || depot.structureId !== "W3-S16" || depot.phase !== "ready"
            || depot.territoryId !== patient.territoryId || !Number.isSafeInteger(patient.arrival.turn) || patient.arrival.turn < lastTurn || patient.arrival.turn > state.turn) return false;
        }
      }
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
  const activeBridge = warBridgeActiveV89(state);
  if (activeBridge && !["close-passages", "cross-bridge", "return-bridge", "cancel-bridge"].includes(action.kind))
    return deny("Le passage est en cours, membre par membre. Terminez l’arrivée ou le retour individuel avant un autre ordre du front.");
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
  if (action.kind === "terrain-hypothesis") {
    const config = state.terrain?.configurations.find(config => config.workId === action.workId);
    if (!config || !["low-screen", "opaque-rock", "open"].includes(action.profile)) return deny("Choisissez un obstacle connu du terrain de simulation.");
    if (config.profile === action.profile) return unchanged("Cette hypothèse de terrain est déjà choisie.");
    return report({ ...state, terrain: { ...state.terrain!, configurations: state.terrain!.configurations.map(item =>
      item.workId === action.workId ? { ...item, profile: action.profile } : item) } },
    "Hypothèse locale d’obstacle modifiée. Les relevés déjà datés gardent leur ancienne géométrie ; aucune position réelle ni ressource n’est modifiée.", ["W3-S01", "W3-S06"]);
  }
  if (action.kind === "recruit") {
    const unit = unitFor(rules, action.unitId);
    if (!unit || !definitions.some(def => def.operatorUnitId === unit.id)) return deny("Ce lot accueille seulement les opérateurs des ouvrages effectivement raccordés.");
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
    if (def.kind === "extraction" && (state.supplyMode !== "local" || !warExtractionAvailableV88(rules))) return deny("S16 demande les stocks locaux et ses préconditions sources attestées ; aucun dépôt fictif.");
    if (["relay", "hoist"].includes(def.kind) && state.supplyMode !== "local") return deny("Relais et treuil demandent un exercice en stocks locaux ; aucune alimentation distante fictive.");
    if (terrainKinds.includes(def.kind) && state.supplyMode !== "local") return deny("Veille, plateforme et pont demandent les stocks locaux de l’exercice.");
    const passageId = linkWork(def) ? action.passageId ?? null : null;
    const passage = rules.passages.find(item => item.id === passageId && [item.fromId, item.toId].includes(zone.id));
    if (linkWork(def) && !passage) return deny("L’ouvrage doit cibler un passage documenté adjacent au site.");
    if (def.kind === "bridge" && (!passage || !preparedPassage(passage) || !state.observed.some(item => item.territoryId === oppositeSite(passage, zone.id))))
      return deny("Le pont exige une traverse préparée documentée et ses deux rives réellement reconnues. Il ne répare pas une fermeture.");
    if (def.kind === "hoist" && (!passage || !reliefPassage(passage, rules) || !passage.permitsRav
      || !state.observed.some(item => item.territoryId === oppositeSite(passage, zone.id)))) return deny("Le treuil exige une liaison de relief compatible RAV et ses deux extrémités réellement reconnues.");
    if (state.works.some(work => work.structureId === def.id && work.territoryId === zone.id && work.passageId === passageId)) return unchanged("Cet ouvrage et son kit existent déjà ; aucun second débit.");
    if (warWorksDepotV87(state) < def.costRav) return deny("Le kit manque de moyens au dépôt ; les réserves distantes ne sont pas téléportées.");
    const id = `v6-works-order-${state.nextIdentity}`;
    const paid = transferRav(state, depotLotId, null, def.costRav, "kit");
    return report({ ...paid, nextIdentity: paid.nextIdentity + 1, ...(def.kind === "extraction" ? { extraction: withExtraction(paid, rules) } : {}),
      ...(["relay", "hoist"].includes(def.kind) ? { infrastructure: withInfrastructure(paid, rules) } : {}),
      ...(terrainKinds.includes(def.kind) ? { terrain: { ...withTerrain(paid, rules),
        configurations: [...withTerrain(paid, rules).configurations, ...(["watch", "platform"].includes(def.kind)
          ? [{ workId: id, profile: "low-screen" as const, facing: "east" as const }] : [])] } } : {}),
      works: [...state.works, { id, kitId: `kit:${id}`, structureId: def.id, territoryId: zone.id, passageId, phase: "reserved", costRav: def.costRav,
        workedTurns: 0, carrierTeamId: null, operatorTeamId: null }] },
    `Kit ${id} réservé au départ : ${def.costRav} RAV. Il n’est ni arrivé à ${zone.id}, ni installé.`, [def.id, "W3-R19", "W3-OBJ05", "W3-OBJ07"]);
  }
  const group = state.teams.find(item => item.team.id === action.teamId);
  if (!group) return deny("Cette équipe n’est pas présente dans l’exercice.");
  const unit = unitFor(rules, group.team.unitId)!;
  const patientCarried = carryingPatient(state, group.team.id), routeGuard = warWorksGuardV88(state, group.team.id);
  const cargo = anchorCargo(state, group.team.id);
  if (cargo && !["plan", "advance", "place-anchor", "load-anchor"].includes(action.kind))
    return deny("Cette équipe porte un ancrage identifié. Acheminer ou poser cette pièce avant un autre kit, poste, patient ou observation. Le ravitaillement doit être disponible sur place.");
  if (action.kind === "cross-bridge" || action.kind === "return-bridge" || action.kind === "cancel-bridge") {
    const transit = state.terrain?.transits.find(transit => transit.id === action.transitId);
    if (!transit || transit.teamId !== group.team.id) return deny("Ce passage individuel n’appartient pas à cette équipe.");
    if (action.kind !== "cancel-bridge" && !transit.memberIds.includes(action.memberId)) return deny("Ce membre ne figure pas dans le passage préparé.");
    if (transit.completed !== null) return unchanged("Ce passage individuel est déjà terminé. Aucun déplacement, tour ou débit répété.");
    if (transit !== activeBridge) return deny("Un autre passage individuel occupe le front.");
    const bridge = state.works.find(work => work.id === transit.workId), passage = rules.passages.find(passage => passage.id === bridge?.passageId);
    if (!bridge || !passage || !warWorkOccupiedV6(state, bridge, rules) || !suppliedInfrastructureSite(state, bridge.territoryId, rules))
      return deny("Le pont doit garder ses vrais opérateurs et son entretien local pendant le passage.");
    if (action.kind === "cancel-bridge") {
      if (transit.steps.length) return deny("Des membres ont avancé. Faites revenir chacun physiquement avant de terminer le repli.");
      return report({ ...state, terrain: { ...state.terrain!, transits: state.terrain!.transits.map(item => item.id === transit.id
        ? { ...item, completed: "returned", resolvedTurn: state.turn } : item) } }, "Préparation annulée avant le premier franchissement. Tous les membres restent à leur rive.", ["W3-S08"]);
    }
    if (state.closedPassageIds.includes(passage.id)) return deny("Le passage est fermé. Les membres restent sur leurs rives actuelles ; aucun tour ou débit n’est appliqué.");
    const site = warBridgeMemberSiteV89(transit, action.memberId), returning = transit.steps.some(step => step.direction === "return");
    const direction = action.kind === "cross-bridge" ? "forward" as const : "return" as const;
    if (direction === "forward" && (returning || transit.steps.some(step => step.memberId === action.memberId))) {
      return site === transit.toId ? unchanged("Ce membre est déjà sur l’autre rive ; aucun second passage.") : deny("Le repli a commencé. Faites revenir les autres membres avant de préparer un nouveau passage.");
    }
    if (direction === "return" && site === transit.fromId) return unchanged("Ce membre est déjà à la rive de départ ; aucun retour répété.");
    const nextTransit = { ...transit, steps: [...transit.steps, { memberId: action.memberId, direction }] };
    const destination = direction === "forward" ? transit.toId : transit.fromId;
    const finished = transit.memberIds.every(memberId => warBridgeMemberSiteV89(nextTransit, memberId) === destination);
    const next = { ...state, terrain: { ...state.terrain!, transits: state.terrain!.transits.map(item => item.id === transit.id
      ? { ...nextTransit, completed: finished ? direction === "forward" ? "arrived" as const : "returned" as const : null, resolvedTurn: finished ? state.turn + 1 : null } : item) } };
    if (!finished) return report(next, `${action.memberId} a ${direction === "forward" ? "atteint l’autre rive" : "rejoint la rive de départ"}. Les positions individuelles sont conservées. Le passage global reste en cours.`, ["W3-S08", passage.id]);
    const trace = { teamId: group.team.id, passageId: passage.id, fromId: transit.fromId, toId: transit.toId, turn: state.turn + 1 };
    const arrived = direction === "forward";
    const completed = turn({ ...next,
      ...(arrived && state.infrastructure ? { infrastructure: { ...state.infrastructure, traversals: [...state.infrastructure.traversals, trace] } } : {}),
      terrain: { ...next.terrain, traversals: arrived ? [...next.terrain.traversals, trace] : next.terrain.traversals },
      teams: replaceTeam({ ...group, territoryId: destination, route: null, team: { ...group.team,
        fatigue: Math.min(rules.parameters.fatigue_max, group.team.fatigue + rules.parameters.march_fatigue) } }) });
    return report(completed, `Passage individuel terminé : tous les mêmes membres sont à ${destination}. Un tour global et l’entretien réellement accessible sont comptés, sans kit, lot RAV ou XP transporté.`, ["W3-S08", passage.id, "W3-R09"]);
  }
  if (["declare-patient", "guard-route", "load-patient", "put-down-patient", "return-patient"].includes(action.kind)
    && (state.supplyMode !== "local" || !warExtractionAvailableV88(rules))) return deny("Extraction indisponible : les stocks locaux et fiches sources sont requis.");
  if (action.kind === "declare-patient") {
    const member = group.team.members.find(item => item.id === action.memberId);
    if (state.extraction?.patients.some(patient => patient.memberId === action.memberId)) return unchanged("Ce patient d’exercice est déjà identifié ; aucune nouvelle blessure.");
    if (!member || !["fit", "wounded"].includes(member.status) || group.dutyWorkId || group.payloadWorkId || group.route || routeGuard || patientCarried || carryingRav(state, group))
      return deny("Déclarez une blessure de simulation sur un membre apte, réellement présent et libre. Aucun mort, acteur de campagne ou porteur engagé.");
    const extraction = withExtraction(state, rules);
    return report({ ...state, teams: replaceTeam({ ...group, team: { ...group.team, members: group.team.members.map(item => item.id === member.id ? { ...item, status: "wounded" } : item) } }),
      extraction: { ...extraction, patients: [...extraction.patients, { memberId: member.id, teamId: group.team.id, declaredTerritoryId: group.territoryId,
        declaredTurn: state.turn, territoryId: group.territoryId, carrierId: null, carrierTeamId: null, arrival: null, steps: [] }] } },
    `Blessure explicitement déclarée pour ${member.id} à ${group.territoryId}. Hypothèse de simulation, aucun combat ni perte de campagne : le membre ne suivra plus automatiquement son équipe.`, ["W3-R15", "W3-OBJ04"]);
  }
  if (action.kind === "guard-route") {
    const passage = rules.passages.find(item => item.id === action.passageId);
    if (unit.id !== "W3-U07" || fitMembers(group).length !== unit.fullMembers || !passage || ![passage.fromId, passage.toId].includes(group.territoryId)
      || state.closedPassageIds.includes(passage.id) || group.dutyWorkId || group.payloadWorkId || patientCarried) return deny("Affectez des lanciers complets et libres à un passage ouvert adjacent à leur vraie position.");
    const extraction = withExtraction(state, rules);
    return report({ ...state, teams: replaceTeam({ ...group, route: null }), extraction: { ...extraction, guards: [...extraction.guards.filter(guard => guard.teamId !== group.team.id),
      { teamId: group.team.id, passageId: passage.id, territoryId: group.territoryId }] } },
    `${group.team.id} garde ${passage.id} depuis ${group.territoryId}. Couverture de graphe déclarée pour cet exercice ; aucun ennemi repoussé ou tir simulé.`, ["W3-U07", "W3-S16", "W3-R20"]);
  }
  if (action.kind === "load-patient") {
    const patient = state.extraction?.patients.find(item => item.memberId === action.memberId);
    if (!patient || patient.arrival || patient.carrierId || patient.territoryId !== group.territoryId || unit.id !== "W3-U17"
      || fitMembers(group).length !== unit.fullMembers || !fitMembers(group).some(member => member.id === action.carrierId && member.id !== patient.memberId)
      || group.dutyWorkId || group.payloadWorkId || routeGuard || patientCarried || carryingRav(state, group)) return deny("Un vrai porteur U17 apte et son équipe complète doivent rejoindre le blessé ; un patient maximum par équipe, sans kit ni autre charge (gabarit d’exercice).");
    return report({ ...state, teams: replaceTeam({ ...group, route: null }), extraction: { ...state.extraction!, patients: state.extraction!.patients.map(item => item.memberId === patient.memberId
      ? { ...item, carrierId: action.carrierId, carrierTeamId: group.team.id } : item) } },
    `${patient.memberId} pris par ${action.carrierId} à ${group.territoryId}. Préparez les traversées gardées ; aucune arrivée au dépôt encore validée.`, ["W3-U17", "W3-R15", "W3-R20"]);
  }
  if (action.kind === "put-down-patient") {
    if (!patientCarried || patientCarried.memberId !== action.memberId) return deny("Cette équipe ne porte pas ce patient.");
    return report({ ...state, extraction: { ...state.extraction!, patients: state.extraction!.patients.map(item => item.memberId === action.memberId ? { ...item, carrierId: null, carrierTeamId: null } : item) } },
      `Patient ${action.memberId} déposé à sa position réelle ${group.territoryId}, toujours blessé et non extrait. Ses étapes restent conservées.`, ["W3-R15", "W3-OBJ04"]);
  }
  if (action.kind === "return-patient") {
    const patient = state.extraction?.patients.find(item => item.memberId === action.memberId), depot = state.works.find(item => item.id === action.workId);
    if (patient?.arrival) return unchanged("Ce patient est déjà arrivé ; aucun deuxième résultat, soin, XP ou crédit.");
    const lastStep = patient?.steps.at(-1);
    if (!patientCarried || patientCarried !== patient || !depot || depot.structureId !== "W3-S16" || depot.phase !== "ready" || depot.territoryId !== group.territoryId
      || (lastStep && !passageGuard(state, lastStep.passageId, rules)) || (depot.operatorTeamId && !warWorkOccupiedV6(state, depot, rules)))
      return deny("Le blessé et son porteur doivent atteindre un S16 réellement installé, avec opérateurs présents et dernière traversée encore gardée. Un atelier ou poste de soin ne remplace pas ce dépôt.");
    const occupy = !depot.operatorTeamId;
    return report({ ...state, ...(occupy ? { teams: replaceTeam({ ...group, dutyWorkId: depot.id, route: null }), works: state.works.map(work => work.id === depot.id ? { ...work, operatorTeamId: group.team.id } : work) } : {}),
      extraction: { ...state.extraction!, patients: state.extraction!.patients.map(item => item.memberId === patient.memberId ? { ...item, carrierId: null, carrierTeamId: null, arrival: { workId: depot.id, turn: state.turn } } : item) } },
    `${patient.memberId} réellement arrivé à ${depot.id}, toujours blessé. Les retardataires restent à leur lieu ; aucune guérison, récompense XP, victoire ni ressource de campagne.`, ["W3-S16", "W3-OBJ04", "W3-R20"]);
  }
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
    if (routeGuard) return report({ ...state, extraction: { ...state.extraction!, guards: state.extraction!.guards.filter(guard => guard.teamId !== group.team.id) } }, "Garde libérée ; les prochains transports doivent retrouver une couverture réelle.", ["W3-S16", "W3-R20"]);
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
    if (group.dutyWorkId || routeGuard) return deny("Libérez d’abord les opérateurs de leur ouvrage ou les gardes du passage.");
    const blocked = state.terrain ? [...new Set([...state.closedPassageIds, ...rules.passages.filter(preparedPassage).map(passage => passage.id)])] : state.closedPassageIds;
    const route = planWarRouteV6(group.territoryId, action.destinationId, unit.commandPoints, blocked, rules, group.payloadWorkId || carryingRav(state, group) || cargo ? "rav" : "none");
    return !route ? deny("Aucune route admissible pour cette équipe et son kit.") : !route.passageIds.length ? unchanged("L’équipe est déjà au site demandé.")
      : report({ ...state, teams: replaceTeam({ ...group, route }) }, "Trajet préparé ; ni l’équipe ni le kit ne sont encore arrivés.", ["W3-R04", "W3-R09"]);
  }
  if (action.kind === "advance") {
    const route = group.route, passage = rules.passages.find(item => item.id === route?.passageIds[0]), destination = route?.territoryIds[1];
    if (group.dutyWorkId || routeGuard || !route || route.territoryIds[0] !== group.territoryId || !passage || !destination || state.closedPassageIds.includes(passage.id)
      || passage.capacityPc < unit.commandPoints || (state.terrain && preparedPassage(passage)) || ((group.payloadWorkId || carryingRav(state, group) || cargo) && !passage.permitsRav)
      || !((passage.fromId === group.territoryId && passage.toId === destination) || (passage.bidirectional && passage.toId === group.territoryId && passage.fromId === destination))) return deny("Le prochain passage est fermé, trop étroit ou impropre au kit ; aucune téléportation ni dépense.");
    const guard = patientCarried ? passageGuard(state, passage.id, rules) : null;
    if (patientCarried && !guard) return deny("Le prochain passage n’a plus de garde présente : patient, porteur et stocks restent à leur vraie position. Aucun tour consommé.");
    const remaining = route.passageIds.length > 1 ? { passageIds: route.passageIds.slice(1), territoryIds: route.territoryIds.slice(1), cost: route.cost - passage.movementCost } : null;
    return report(turn({ ...state, ...(state.infrastructure ? { infrastructure: { ...state.infrastructure, traversals: [...state.infrastructure.traversals,
      { teamId: group.team.id, passageId: passage.id, fromId: group.territoryId, toId: destination, turn: state.turn + 1 }] } } : {}),
      ...(state.terrain ? { terrain: { ...state.terrain, traversals: [...state.terrain.traversals,
        { teamId: group.team.id, passageId: passage.id, fromId: group.territoryId, toId: destination, turn: state.turn + 1 }] } } : {}),
      ...(patientCarried ? { extraction: { ...state.extraction!, patients: state.extraction!.patients.map(patient => patient.memberId === patientCarried.memberId
      ? { ...patient, territoryId: destination, steps: [...patient.steps, { passageId: passage.id, fromId: group.territoryId, toId: destination, turn: state.turn + 1,
        carrierId: patient.carrierId!, carrierTeamId: group.team.id, guardTeamId: guard!.teamId, guardTerritoryId: guard!.territoryId }] } : patient) } } : {}),
      lots: state.lots.map(lot => lot.location === "carrier" && lot.teamId === group.team.id && lot.rav > 0
      ? { ...lot, steps: [...lot.steps, { passageId: passage.id, fromId: group.territoryId, toId: destination, turn: state.turn + 1 }] } : lot),
      teams: replaceTeam({ ...group, territoryId: destination, route: remaining,
      team: { ...group.team, fatigue: Math.min(rules.parameters.fatigue_max, group.team.fatigue + rules.parameters.march_fatigue) } }) }),
    `${group.team.id} a franchi ${passage.id} et atteint ${destination}${group.payloadWorkId ? " avec son kit identifié" : ""}. Aucun contrôle territorial acquis.`, [passage.id, "W3-R04", "W3-R09", "W3-R11"]);
  }
  if (action.kind === "observe") {
    if (patientCarried || routeGuard) return deny("Le transport du patient ou la garde du passage occupe cette équipe ; libérez-la avant une reconnaissance.");
    if (state.observed.some(item => item.territoryId === group.territoryId)) return unchanged("Ce renseignement est déjà connu du front d’exercice ; aucun gain répété avec une autre équipe.");
    const result = applyWarResultV6(group.team, { operationId: `works:recon:${group.territoryId}`, resultId: `works:intel:${group.territoryId}`,
      mode: "strategic", objective: "recon", participantIds: fitMembers(group).map(member => member.id), final: true }, rules);
    if (!result.accepted || !result.changed) return deny("Le résultat de reconnaissance est déjà résolu ou invalide.");
    return report(turn({ ...state, teams: replaceTeam({ ...group, team: result.state }), observed: [...state.observed, { territoryId: group.territoryId, teamId: group.team.id, turn: state.turn + 1 }] }),
      `Site ${group.territoryId} reconnu au tour ${state.turn + 1} ; ${rules.parameters.xp_recon} XP aux membres présents, sans annexion.`, ["W3-UP04", "W3-R05"]);
  }
  const work = state.works.find(item => item.id === ("workId" in action ? action.workId : "")), def = definitions.find(item => item.id === work?.structureId);
  if (!work || !def) return deny("Cet ouvrage n’existe pas dans l’exercice.");
  if (patientCarried || routeGuard) return deny("Mains et équipe engagées dans l’extraction ou la garde ; aucun kit, chantier ou repos simultané.");
  const replaceWork = (next: WarWorkOrderV6) => state.works.map(item => item.id === next.id ? next : item);
  if (action.kind === "load-anchor") {
    if (cargo) return cargo.workId === work.id ? unchanged("Cette équipe porte déjà sa pièce d’ancrage ; aucune copie.") : deny("Une autre pièce occupe cette équipe.");
    if (!state.terrain || def.kind !== "bridge" || !["delivered", "building"].includes(work.phase) || group.team.unitId !== def.operatorUnitId
      || group.territoryId !== work.territoryId || group.payloadWorkId || group.dutyWorkId || carryingRav(state, group) || fitMembers(group).length !== unit.fullMembers)
      return deny("Le kit de pont doit être livré. Ses grimpeurs complets chargent un seul ancrage à sa rive de départ.");
    const slot = [1, 2, 3].find(slot => !state.terrain!.anchors.some(anchor => anchor.workId === work.id && anchor.slot === slot)
      && !state.terrain!.anchorCargo.some(piece => piece.workId === work.id && piece.slot === slot));
    if (!slot) return deny("Les trois pièces du même kit sont déjà posées ou transportées. Aucune quatrième pièce.");
    return report({ ...state, teams: replaceTeam({ ...group, route: null }), terrain: { ...state.terrain,
      anchorCargo: [...state.terrain.anchorCargo, { workId: work.id, slot, teamId: group.team.id, loadedTurn: state.turn }] } },
    `${work.kitId}:anchor:${slot} chargé physiquement à ${work.territoryId}. ${slot === 3 ? "Il doit atteindre l’autre rive par une vraie route compatible RAV, avec une cache alimentée pour le travail." : "Il doit être posé sur cette rive."} Aucun nouveau kit ni débit.`, ["W3-S08", "W3-U12", "W3-R19"]);
  }
  if (action.kind === "place-anchor") {
    const passage = rules.passages.find(passage => passage.id === work.passageId), site = cargo?.slot === 3 && passage ? oppositeSite(passage, work.territoryId) : work.territoryId;
    const supply = warWorksSupplyPreviewV87(state, rules).find(supply => supply.teamId === group.team.id);
    if (!state.terrain || def.kind !== "bridge" || !cargo || cargo.workId !== work.id || cargo.slot !== work.workedTurns + 1
      || !["delivered", "building"].includes(work.phase) || group.team.unitId !== def.operatorUnitId || fitMembers(group).length !== unit.fullMembers
      || group.territoryId !== site || !state.observed.some(item => item.territoryId === site) || group.dutyWorkId || group.payloadWorkId
      || !supply || supply.paid < supply.need) return deny("Pose refusée : pièce réelle, ordre des trois appuis, rive reconnue, grimpeurs complets et rations locales requis. U19 doit alimenter une cache sur la rive éloignée.");
    const workedTurns = work.workedTurns + 1;
    return report(turn({ ...state, teams: replaceTeam({ ...group, route: null }), works: replaceWork({ ...work, workedTurns,
      phase: workedTurns === def.delayTurns ? "ready" : "building", operatorTeamId: null }), terrain: { ...state.terrain,
      anchorCargo: state.terrain.anchorCargo.filter(piece => piece !== cargo), anchors: [...state.terrain.anchors,
        { workId: work.id, slot: cargo.slot, territoryId: group.territoryId, teamId: group.team.id, memberIds: fitMembers(group).map(member => member.id),
          loadedTurn: cargo.loadedTurn, turn: state.turn + 1 }] } }),
    `Ancrage ${cargo.slot}/3 posé à ${site} après un vrai tour de travaux. ${workedTurns === 3 ? "Pont installé, encore sans opérateurs à sa rive de départ." : "Les deux prochains appuis restent à acheminer et poser."} Aucun passage réparé, revenu ou XP accordé.`, ["W3-S08", passage!.id, "W3-R19"]);
  }
  if (action.kind === "begin-bridge") {
    const passage = rules.passages.find(passage => passage.id === work.passageId), destination = passage && oppositeSite(passage, group.territoryId);
    const supply = warWorksSupplyPreviewV87(state, rules).find(supply => supply.teamId === group.team.id);
    const operator = state.teams.find(item => item.team.id === work.operatorTeamId);
    if (!state.terrain || def.kind !== "bridge" || !passage || !destination || !preparedPassage(passage)
      || !passageDirection(passage, group.territoryId, destination) || state.closedPassageIds.includes(passage.id) || passage.capacityPc < unit.commandPoints
      || !warWorkOccupiedV6(state, work, rules) || !operator || operator === group || !suppliedInfrastructureSite(state, work.territoryId, rules)
      || group.dutyWorkId || group.payloadWorkId || group.route || carryingRav(state, group) || cargo || fitMembers(group).length !== unit.fullMembers
      || !supply || supply.paid < supply.need) return deny("Le pont exige trois ancrages posés, ses deux opérateurs alimentés, une voie ouverte et une équipe complète libre au départ, sans kit ni lot RAV.");
    const id = `terrain:${state.nextIdentity}`;
    return report({ ...state, nextIdentity: state.nextIdentity + 1, terrain: { ...state.terrain, transits: [...state.terrain.transits,
      { id, workId: work.id, teamId: group.team.id, fromId: group.territoryId, toId: destination, startedTurn: state.turn,
        memberIds: fitMembers(group).map(member => member.id), operatorTeamId: operator.team.id, operatorMemberIds: fitMembers(operator).map(member => member.id),
        steps: [], completed: null, resolvedTurn: null }] } },
    "Passage individuel préparé. Chaque membre doit franchir séparément. Les autres ordres attendent la fin de ce passage ; le tour global sera compté une fois après arrivée ou retour de tous.", ["W3-S08", passage.id]);
  }
  if (action.kind === "orient-platform" || action.kind === "scan-terrain") {
    const config = state.terrain?.configurations.find(config => config.workId === work.id);
    if (!config || !["watch", "platform"].includes(def.kind) || !warWorkOccupiedV6(state, work, rules) || work.operatorTeamId !== group.team.id
      || !suppliedInfrastructureSite(state, work.territoryId, rules)) return deny("Cette lecture exige l’ouvrage installé, ses vrais opérateurs complets et son entretien local.");
    if (action.kind === "orient-platform") {
      if (def.kind !== "platform" || !["east", "west"].includes(action.facing)) return deny("Seule la plateforme oriente son angle d’exercice.");
      if (config.facing === action.facing) return unchanged("Cette orientation est déjà réglée ; aucun tour répété.");
      return report(turn({ ...state, terrain: { ...state.terrain!, configurations: state.terrain!.configurations.map(item =>
        item.workId === work.id ? { ...item, facing: action.facing } : item) } }), "Un tour d’orientation accompli. L’angle de tir et le couvert suivent le côté choisi ; l’angle mort dessous persiste.", ["W3-S06", "W3-U13"]);
    }
    const view = evaluateWarTerrainV89(state, work.id, action.targetId, rules);
    if (!view || !view.visible) return deny("Ce repère d’exercice est occulté, hors portée, hors angle ou sous la plateforme. Aucun relevé ni tour créé.");
    if (state.terrain!.sightings.some(sight => sight.workId === work.id && sight.targetId === action.targetId && sight.profile === config.profile && sight.facing === config.facing))
      return unchanged("Ce même repère dans cette même géométrie est déjà daté. Son âge est conservé ; aucune nouvelle XP ni répétition de tour.");
    return report(turn({ ...state, terrain: { ...state.terrain!, sightings: [...state.terrain!.sightings,
      { workId: work.id, teamId: group.team.id, memberIds: fitMembers(group).map(member => member.id), targetId: action.targetId, profile: config.profile, facing: config.facing, turn: state.turn + 1 }] } }),
    `${view.target.name} relevée au tour ${state.turn + 1} depuis ${work.territoryId}. Repère géométrique du terrain de simulation, sans ennemi révélé, tir, annexion ou XP.`, [def.id, "W3-R05", "W3-R19"]);
  }
  if (action.kind === "put-down-kit") {
    if (!state.infrastructure || work.phase !== "carried" || group.payloadWorkId !== work.id || work.carrierTeamId !== group.team.id || group.dutyWorkId)
      return deny("Déposer exige le kit réellement porté et un carnet relais/treuil actif. Aucune copie de pièce.");
    return report({ ...state, teams: replaceTeam({ ...group, payloadWorkId: null, route: null }),
      works: replaceWork({ ...work, phase: "reserved", carrierTeamId: null }), infrastructure: { ...state.infrastructure,
        groundKits: [...state.infrastructure.groundKits.filter(item => item.workId !== work.id), { workId: work.id, territoryId: group.territoryId,
          placement: { kind: "drop", teamId: group.team.id, turn: state.turn } }] } },
    `${work.kitId} déposé à ${group.territoryId}, sans installation. Un porteur doit réellement le reprendre ici.`, ["W3-S17", "W3-R09", "W3-OBJ05"]);
  }
  if (action.kind === "lift-kit") {
    const kit = state.works.find(item => item.id === action.kitWorkId), passage = rules.passages.find(item => item.id === work.passageId);
    const destination = passage && oppositeSite(passage, work.territoryId);
    if (!state.infrastructure || def.kind !== "hoist" || !warWorkOccupiedV6(state, work, rules) || work.operatorTeamId !== group.team.id
      || !passage || !destination || !passageDirection(passage, work.territoryId, destination) || state.closedPassageIds.includes(passage.id)
      || !passage.permitsRav || !reliefPassage(passage, rules) || !kit || kit.id === work.id || kit.phase !== "reserved"
      || warKitSiteV88(state, kit) !== work.territoryId || !state.observed.some(item => item.territoryId === destination)
      || !suppliedInfrastructureSite(state, work.territoryId, rules)) return deny("Levage refusé : treuil occupé par ses deux artisans, kit au pied, voie ouverte, extrémités reconnues et entretien local requis. Aucune dépense ni mouvement.");
    const id = `infrastructure:${state.nextIdentity}`;
    return report(turn({ ...state, nextIdentity: state.nextIdentity + 1, infrastructure: { ...state.infrastructure,
      groundKits: [...state.infrastructure.groundKits.filter(item => item.workId !== kit.id), { workId: kit.id, territoryId: destination, placement: { kind: "lift", liftId: id } }],
      lifts: [...state.infrastructure.lifts, { id, hoistWorkId: work.id, kitWorkId: kit.id, passageId: passage.id,
        fromId: work.territoryId, toId: destination, turn: state.turn + 1, operatorTeamId: group.team.id, memberIds: fitMembers(group).map(member => member.id) }] } }),
    `${kit.kitId} levé de ${work.territoryId} à ${destination}. Les deux artisans restent au treuil ; le kit n’est pas installé et aucun objet ni XP n’est créé.`, [def.id, "W3-U20", passage.id, "W3-R19"]);
  }
  if (action.kind === "relay-intel") {
    const passage = rules.passages.find(item => item.id === work.passageId), destination = passage && oppositeSite(passage, work.territoryId);
    const recipient = state.teams.find(item => item.team.id === action.recipientTeamId);
    const observations = state.observed.filter(item => item.teamId === group.team.id);
    if (!state.infrastructure || def.kind !== "relay" || !warWorkOccupiedV6(state, work, rules) || work.operatorTeamId !== group.team.id
      || !passage || !destination || !passageDirection(passage, work.territoryId, destination) || state.closedPassageIds.includes(passage.id)
      || !recipient || recipient === group || recipient.territoryId !== destination || !fitMembers(recipient).length || !observations.length
      || !state.infrastructure.traversals.some(step => step.teamId === group.team.id && step.passageId === passage.id && step.toId === destination)
      || !state.infrastructure.traversals.some(step => step.teamId === group.team.id && step.passageId === passage.id && step.toId === work.territoryId)
      || !suppliedInfrastructureSite(state, work.territoryId, rules)) return deny("Transmission refusée : relais occupé et alimenté, destinataire à l’autre extrémité, aller-retour réel du messager et relevés personnels requis. Aucune vue à travers le relief.");
    if (state.infrastructure.relayReceipts.some(receipt => receipt.relayWorkId === work.id && receipt.recipientTeamId === recipient.team.id
      && JSON.stringify(receipt.observations) === JSON.stringify(observations))) return unchanged("Ces mêmes relevés ont déjà été remis à cette équipe ; aucun tour ni second résultat.");
    const id = `infrastructure:${state.nextIdentity}`;
    return report(turn({ ...state, nextIdentity: state.nextIdentity + 1, infrastructure: { ...state.infrastructure, relayReceipts: [...state.infrastructure.relayReceipts,
      { id, relayWorkId: work.id, senderTeamId: group.team.id, recipientTeamId: recipient.team.id, passageId: passage.id,
        fromId: work.territoryId, toId: destination, turn: state.turn + 1, observations: observations.map(item => ({ ...item })) }] } }),
    `${recipient.team.id} reçoit ${observations.length} relevé(s) daté(s) à ${destination}. L’âge et l’observateur d’origine sont conservés ; aucune position cachée, personne, cargaison ou XP transmise.`, [def.id, "W3-U28", "W3-R05", passage.id]);
  }
  if (action.kind === "load") {
    if (work.phase !== "reserved" || group.territoryId !== warKitSiteV88(state, work) || group.payloadWorkId || group.dutyWorkId || carryingRav(state, group)) return deny("Chargez ce kit à son emplacement réel avec une équipe libre sans autre lot ; il ne peut pas être dans deux transports.");
    return report({ ...state, ...(state.infrastructure ? { infrastructure: { ...state.infrastructure, groundKits: state.infrastructure.groundKits.filter(item => item.workId !== work.id) } } : {}),
      teams: replaceTeam({ ...group, payloadWorkId: work.id, route: null }), works: replaceWork({ ...work, phase: "carried", carrierTeamId: group.team.id }) },
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
    if (def.kind === "bridge") return deny("Ce pont se construit par ses trois ancrages physiques. Chargez puis posez chaque pièce sur sa vraie rive ; l’attente et le bouton générique ne remplacent pas ces travaux.");
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
