import source from "../clanWarBibleV6Source.json";
import type { ClanWarEntryV85 } from "./clanWarV85Data";

/** Latest supplied Bible. Its W3/W5 identifiers are intentionally not aliased to the older RTS-U/CON-T design. */
export interface WarWorkbookV6 { workbook: string; sha256: string; designedAt: string; entries: ClanWarEntryV85[] }
export const WAR_BIBLE_V6 = source as WarWorkbookV6;
export const WAR_BIBLE_ENTRIES_V6 = WAR_BIBLE_V6.entries;
export const WAR_BIBLE_SECTIONS_V6 = [...new Set(WAR_BIBLE_ENTRIES_V6.map(entry => entry.sheet))];
const field = (entry: ClanWarEntryV85, column: string) => entry.fields.find(item => item.column === column)?.value ?? "";
const parametersFromV6 = (entries: ClanWarEntryV85[]): Record<string, number> => Object.fromEntries(entries.filter(entry => entry.sheet === "Paramètres de guerre").map(entry => [String(field(entry, "C")), Number(field(entry, "D"))]));
export const WAR_PARAMETERS_V6 = parametersFromV6(WAR_BIBLE_ENTRIES_V6);
export interface WarUnitDefinitionV6 {
  id: string; name: string; role: string; fullMembers: number; commandPoints: number;
  recruitmentRav: number; upkeepRav: number; delayTurns: number; attack: number; defense: number;
  range: number; mobility: number; counter: string; weakness: string;
}
const unitsFromV6 = (entries: ClanWarEntryV85[]): WarUnitDefinitionV6[] => entries.filter(entry => entry.sheet === "Unités de guerre").map(entry => ({
  id: entry.id, name: String(entry.title), role: String(field(entry, "C")), fullMembers: Number(field(entry, "D")), commandPoints: Number(field(entry, "E")), recruitmentRav: Number(field(entry, "F")), upkeepRav: Number(field(entry, "G")), delayTurns: Number(field(entry, "H")), attack: Number(field(entry, "I")), defense: Number(field(entry, "J")), range: Number(field(entry, "K")), mobility: Number(field(entry, "L")), counter: String(field(entry, "M")), weakness: String(field(entry, "N")),
}));
export const WAR_UNITS_V6 = unitsFromV6(WAR_BIBLE_ENTRIES_V6);
export interface WarSpecializationV6 { id: string; unitId: string; threshold: number; nameA: string; effectA: string; nameB: string; effectB: string; exclusivity: string; mastery: string }
const specializationsFromV6 = (entries: ClanWarEntryV85[]): WarSpecializationV6[] => entries.filter(entry => entry.sheet === "V5 Spécialisations des unités").map(entry => ({ id: entry.id, unitId: String(field(entry, "C")), threshold: Number(field(entry, "D")), nameA: String(field(entry, "E")), effectA: String(field(entry, "F")), nameB: String(field(entry, "G")), effectB: String(field(entry, "H")), exclusivity: String(field(entry, "I")), mastery: String(field(entry, "J")) }));
export const WAR_SPECIALIZATIONS_V6 = specializationsFromV6(WAR_BIBLE_ENTRIES_V6);
export interface WarTeamHypothesisV6 { unitId: string; xp: number; fatigue: number; deployableMembers: number; availableRav: number; frontNeedRav: number; terrainBonus: number; nextObjectiveXp: number }
export function estimateWarTeamV6(input: WarTeamHypothesisV6, rules: WarRulesV6 = DEFAULT_WAR_RULES_V6) {
  const parameters = rules.parameters;
  const unit = rules.units.find(item => item.id === input.unitId);
  if (!unit) return { status: "Identifiant inconnu", valid: false, attack: null, defense: null, xpAfter: input.xp, multiplier: 0, fatigueFactor: 0, supplyFactor: 0, memberFactor: 0, unit: null };
  const values = [input.xp, input.fatigue, input.deployableMembers, input.availableRav, input.frontNeedRav, input.terrainBonus, input.nextObjectiveXp];
  const validNumbers = values.every(Number.isFinite) && values.every(value => value >= 0) && Number.isInteger(input.deployableMembers) && input.xp <= parameters.xp_max && input.fatigue <= parameters.fatigue_max && input.availableRav <= parameters.rav_cap && input.nextObjectiveXp <= parameters.xp_transaction_cap;
  const validMembers = input.deployableMembers <= unit.fullMembers;
  const validNeed = input.deployableMembers === 0 || input.frontNeedRav >= unit.upkeepRav;
  const multiplier = input.xp >= parameters.xp_tier_3 ? parameters.xp_mult_3 : input.xp >= parameters.xp_tier_2 ? parameters.xp_mult_2 : parameters.xp_mult_1;
  const fatigueFactor = Math.max(parameters.fatigue_floor, 1 - input.fatigue / parameters.fatigue_divisor);
  const supplyFactor = !validNeed ? 0 : input.availableRav >= input.frontNeedRav ? parameters.supply_factor_full : parameters.supply_factor_low;
  const memberFactor = input.deployableMembers / unit.fullMembers;
  const valid = validNumbers && validMembers && validNeed;
  const attack = valid ? Math.floor(unit.attack * multiplier * fatigueFactor * supplyFactor * memberFactor) : null;
  const defense = valid ? Math.floor(unit.defense * multiplier * fatigueFactor * supplyFactor * memberFactor * (1 + Math.min(parameters.terrain_bonus_cap, input.terrainBonus) / 100)) : null;
  const xpAfter = valid && input.deployableMembers > 0 ? Math.min(parameters.xp_max, input.xp + input.nextObjectiveXp) : input.xp;
  const status = !validNumbers ? "Valeur hors limites" : !validMembers ? "Effectif invalide" : !validNeed ? "Besoin de front incohérent" : input.deployableMembers === 0 ? "Équipe sans membre déployable" : "Estimation calculée";
  return { status, valid, attack, defense, xpAfter, multiplier, fatigueFactor, supplyFactor, memberFactor, unit };
}
export function warTeamTierV6(xp: number, rules: WarRulesV6 = DEFAULT_WAR_RULES_V6): "Novice" | "Vétéran" | "Maître" { return xp >= rules.parameters.xp_tier_3 ? "Maître" : xp >= rules.parameters.xp_tier_2 ? "Vétéran" : "Novice"; }
export interface WarPersonV6 { id: string; name: string; xp: number; status: "fit" | "wounded" | "dead"; assignmentId: string }
export interface WarTeamStateV6 { version: 1; id: string; context: "free"; unitId: string; members: WarPersonV6[]; fatigue: number; specialization: "A" | "B" | null; resultReceipts: string[] }
export interface WarResultReceiptV6 { operationId: string; resultId: string; mode: "hero" | "rts" | "strategic"; objective: "recon" | "hero" | "battle" | "retreat" | "campaign"; participantIds: string[]; final: true }
export function createWarTeamV6(unitId: string, id = "free-v6-team", rules: WarRulesV6 = DEFAULT_WAR_RULES_V6): WarTeamStateV6 | null {
  const unit = rules.units.find(item => item.id === unitId); if (!unit) return null;
  return { version: 1, id, context: "free", unitId, members: Array.from({ length: unit.fullMembers }, (_, index) => ({ id: `${id}-member-${index + 1}`, name: `Membre d’exercice ${index + 1}`, xp: 0, status: "fit", assignmentId: id })), fatigue: 0, specialization: null, resultReceipts: [] };
}
/** Group mastery follows living members; a deceased person's XP cannot be cloned into their replacement. */
export function warTeamExperienceV6(team: WarTeamStateV6): number {
  const living = team.members.filter(member => member.status !== "dead");
  return living.length ? Math.floor(living.reduce((xp, member) => xp + member.xp, 0) / living.length) : 0;
}
/** Trusted completed scenario integration. An operation is credited once across hero, RTS and strategic views. */
export function applyWarResultV6(team: WarTeamStateV6, receipt: WarResultReceiptV6, rules: WarRulesV6 = DEFAULT_WAR_RULES_V6): { state: WarTeamStateV6; accepted: boolean; changed: boolean } {
  if (team.context !== "free" || !receipt.final || !/^[a-zA-Z0-9:_-]{1,150}$/.test(receipt.operationId) || !/^[a-zA-Z0-9:_-]{1,150}$/.test(receipt.resultId) || !["hero", "rts", "strategic"].includes(receipt.mode) || !["recon", "hero", "battle", "retreat", "campaign"].includes(receipt.objective) || receipt.participantIds.length === 0 || new Set(receipt.participantIds).size !== receipt.participantIds.length || receipt.participantIds.some(id => !team.members.some(member => member.id === id && member.status === "fit" && member.assignmentId === team.id))) return { state: team, accepted: false, changed: false };
  if (team.resultReceipts.includes(receipt.operationId)) return { state: team, accepted: true, changed: false };
  const xp = Math.min(rules.parameters.xp_transaction_cap, rules.parameters[`xp_${receipt.objective}`]);
  if (!Number.isFinite(xp)) return { state: team, accepted: false, changed: false };
  const battleFatigue = ["hero", "battle", "retreat", "campaign"].includes(receipt.objective) ? rules.parameters.battle_fatigue : 0;
  return { state: { ...team, members: team.members.map(member => receipt.participantIds.includes(member.id) ? { ...member, xp: Math.min(rules.parameters.xp_max, member.xp + xp) } : { ...member }), fatigue: Math.min(rules.parameters.fatigue_max, team.fatigue + battleFatigue), resultReceipts: [...team.resultReceipts, receipt.operationId] }, accepted: true, changed: true };
}
export function selectWarSpecializationV6(team: WarTeamStateV6, branch: "A" | "B", rules: WarRulesV6 = DEFAULT_WAR_RULES_V6): WarTeamStateV6 {
  const definition = rules.specializations.find(item => item.unitId === team.unitId);
  if (!definition || team.specialization !== null || warTeamExperienceV6(team) < definition.threshold || (branch !== "A" && branch !== "B")) return team;
  return { ...team, specialization: branch };
}
export interface WarTerritoryV6 { id: string; name: string; region: string; column: number; row: number; initialController: string; incomeRav: number; garrisonPc: number; terrainDefense: number; objective: string; reconnaissance: string; control: string; life: string; retreat: string }
const territoriesFromV6 = (entries: ClanWarEntryV85[]): WarTerritoryV6[] => entries.filter(entry => entry.sheet === "Territoires de Korthas").map(entry => ({ id: entry.id, name: String(entry.title), region: String(field(entry, "C")), column: Number(field(entry, "D")), row: Number(field(entry, "E")), initialController: String(field(entry, "F")), incomeRav: Number(field(entry, "G")), garrisonPc: Number(field(entry, "H")), terrainDefense: Number(field(entry, "I")), objective: String(field(entry, "J")), reconnaissance: String(field(entry, "K")), control: String(field(entry, "L")), life: String(field(entry, "M")), retreat: String(field(entry, "N")) }));
export const WAR_TERRITORIES_V6 = territoriesFromV6(WAR_BIBLE_ENTRIES_V6);
export interface WarPassageV6 { id: string; name: string; fromId: string; toId: string; kind: string; movementCost: number; bidirectional: boolean; capacityPc: number; condition: string; permitsRav: boolean; incident: string }
const passagesFromV6 = (entries: ClanWarEntryV85[]): WarPassageV6[] => entries.filter(entry => entry.sheet === "Passages de Korthas").map(entry => ({ id: entry.id, name: String(entry.title), fromId: String(field(entry, "C")), toId: String(field(entry, "D")), kind: String(field(entry, "E")), movementCost: Number(field(entry, "F")), bidirectional: Boolean(field(entry, "G")), capacityPc: Number(field(entry, "H")), condition: String(field(entry, "I")), permitsRav: Boolean(field(entry, "J")), incident: String(field(entry, "K")) }));
export const WAR_PASSAGES_V6 = passagesFromV6(WAR_BIBLE_ENTRIES_V6);
export interface WarRulesV6 {
  metadata: Omit<WarWorkbookV6, "entries">;
  entries: ClanWarEntryV85[];
  sections: string[];
  parameters: Record<string, number>;
  units: WarUnitDefinitionV6[];
  specializations: WarSpecializationV6[];
  territories: WarTerritoryV6[];
  passages: WarPassageV6[];
}
/** A rules context belongs to its caller. Importing a workbook never changes the bundled defaults. */
export function createWarRulesV6(workbook: WarWorkbookV6): WarRulesV6 {
  const entries = workbook.entries.map(entry => ({ ...entry, fields: entry.fields.map(item => ({ ...item })) }));
  return {
    metadata: { workbook: workbook.workbook, sha256: workbook.sha256, designedAt: workbook.designedAt },
    entries, sections: [...new Set(entries.map(entry => entry.sheet))], parameters: parametersFromV6(entries),
    units: unitsFromV6(entries), specializations: specializationsFromV6(entries),
    territories: territoriesFromV6(entries), passages: passagesFromV6(entries),
  };
}
export const DEFAULT_WAR_RULES_V6 = createWarRulesV6(WAR_BIBLE_V6);
export const WAR_PRIVATE_IMPORT_MAX_BYTES_V6 = 40 * 1024 * 1024;
export const WAR_BIBLE_SOURCE_SHA_V6 = "87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183";
const requiredParameterKeysV6 = [
  "xp_min", "xp_max", "xp_tier_1", "xp_tier_2", "xp_tier_3", "xp_mult_1", "xp_mult_2", "xp_mult_3",
  "pc_cap_1", "pc_cap_2", "pc_cap_3", "rav_cap", "supply_factor_full", "supply_factor_low",
  "fatigue_max", "fatigue_divisor", "fatigue_floor", "terrain_bonus_cap", "xp_recon", "xp_hero",
  "xp_battle", "xp_retreat", "xp_campaign", "xp_transaction_cap", "garrison_min_pc",
  "recruit_delay_standard", "recruit_delay_expert", "build_delay_min", "rest_fatigue_reduction", "march_fatigue", "battle_fatigue",
];
/** Validates data, not executable content. The SHA is the declared original XLSX hash, not a signature of this JSON. */
export function parsePrivateWarRulesV6(value: unknown): { rules: WarRulesV6 | null; error: string | null } {
  const object = (item: unknown): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item);
  const text = (item: unknown, limit: number): item is string => typeof item === "string" && item.length > 0 && item.length <= limit;
  const bounded = (item: unknown, min = 0, max = 1000000): item is number => typeof item === "number" && Number.isFinite(item) && item >= min && item <= max;
  function fail(message: string): never { throw new Error(message); }
  try {
    if (!object(value) || value.workbook !== "Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx" || value.designedAt !== "2026-10-07" || value.sha256 !== WAR_BIBLE_SOURCE_SHA_V6) fail("La provenance déclarée ne correspond pas à la Bible V6 du 7 octobre 2026.");
    if (!Array.isArray(value.entries) || value.entries.length < 197 || value.entries.length > 10000) fail("Le fichier doit contenir les fiches de guerre V6, avec leurs feuilles et cellules sources.");
    const seen = new Set<string>();
    const entries: ClanWarEntryV85[] = value.entries.map((item: unknown) => {
      if (!object(item) || !text(item.id, 100) || !text(item.sheet, 150) || !text(item.category, 150) || !bounded(item.row, 6, 100000) || !Number.isInteger(item.row) || !(text(item.title, 20000) || bounded(item.title))) fail("Une fiche a un identifiant, un titre ou une ligne source invalide.");
      const key = `${item.sheet}\u0000${item.id}`;
      if (seen.has(key)) fail(`Fiche en double : ${item.sheet} / ${item.id}.`);
      seen.add(key);
      if (!Array.isArray(item.fields) || item.fields.length > 50 || item.fields.length === 0) fail(`Champs invalides dans ${item.id}.`);
      const columns = new Set<string>();
      const fields = item.fields.map((cell: unknown) => {
        if (!object(cell) || !text(cell.column, 2) || !/^[A-Z]{1,2}$/.test(cell.column) || !text(cell.label, 500) || cell.cell !== `${cell.column}${item.row}`) fail(`Référence de cellule invalide dans ${item.id}.`);
        if (columns.has(cell.column)) fail(`Colonne répétée dans ${item.id}.`);
        columns.add(cell.column);
        if (!(typeof cell.value === "boolean" || bounded(cell.value, -1000000) || typeof cell.value === "string" && cell.value.length <= 50000)) fail(`Valeur de cellule invalide dans ${item.id}.`);
        return { column: cell.column, label: cell.label, cell: cell.cell as string, value: cell.value as string | number | boolean };
      });
      return { id: item.id, sheet: item.sheet, category: item.category, row: item.row, title: item.title as string | number, fields };
    });
    const rows = (sheet: string) => entries.filter(entry => entry.sheet === sheet);
    const requireIds = (sheet: string, prefix: string, count: number) => {
      const selected = rows(sheet);
      if (selected.length !== count || Array.from({ length: count }, (_, index) => `${prefix}${String(index + 1).padStart(2, "0")}`).some(id => !selected.some(entry => entry.id === id))) fail(`La feuille « ${sheet} » doit contenir ses ${count} fiches attendues.`);
      return selected;
    };
    const numeric = (selected: ClanWarEntryV85[], columns: string[]) => {
      for (const entry of selected) for (const column of columns) if (!bounded(field(entry, column))) fail(`Nombre invalide dans ${entry.sheet}, cellule ${column}${entry.row}. Les formules ne sont pas exécutées.`);
    };
    const parameters = requireIds("Paramètres de guerre", "W3-PAR", 31);
    if (parameters.some(entry => !requiredParameterKeysV6.includes(String(field(entry, "C")))) || new Set(parameters.map(entry => field(entry, "C"))).size !== 31) fail("Les clés des paramètres V6 sont incomplètes ou répétées.");
    numeric(parameters, ["D"]);
    const units = requireIds("Unités de guerre", "W3-U", 30);
    numeric(units, ["D", "E", "F", "G", "H", "I", "J", "K", "L"]);
    if (units.some(entry => !Number.isInteger(field(entry, "D")) || Number(field(entry, "D")) < 1 || Number(field(entry, "D")) > 100 || !Number.isInteger(field(entry, "E")) || Number(field(entry, "E")) < 1)) fail("Effectifs ou points de commandement invalides.");
    const specialties = requireIds("V5 Spécialisations des unités", "W5-SP", 30);
    numeric(specialties, ["D"]);
    if (specialties.some(entry => !units.some(unit => unit.id === field(entry, "C"))) || new Set(specialties.map(entry => field(entry, "C"))).size !== 30) fail("Une spécialisation ne correspond pas à une équipe V6 unique.");
    const territories = requireIds("Territoires de Korthas", "W3-K", 36);
    numeric(territories, ["D", "E", "G", "H", "I"]);
    if (territories.some(entry => ["D", "E"].some(column => !Number.isInteger(field(entry, column)) || Number(field(entry, column)) < 1 || Number(field(entry, column)) > 6)) || new Set(territories.map(entry => `${field(entry, "D")}:${field(entry, "E")}`)).size !== 36) fail("Les coordonnées de Korthas doivent former une carte de 6 × 6 zones distinctes.");
    const passages = requireIds("Passages de Korthas", "W3-L", 70);
    numeric(passages, ["F", "H"]);
    if (passages.some(entry => !territories.some(zone => zone.id === field(entry, "C")) || !territories.some(zone => zone.id === field(entry, "D")) || Number(field(entry, "F")) <= 0 || !Number.isInteger(field(entry, "H")) || Number(field(entry, "H")) < 1 || typeof field(entry, "G") !== "boolean" || typeof field(entry, "J") !== "boolean")) fail("Un passage a une extrémité, un coût, une capacité ou un sens invalide.");
    const rules = createWarRulesV6({ workbook: value.workbook, sha256: value.sha256, designedAt: value.designedAt, entries });
    const p = rules.parameters;
    if (p.xp_min !== 0 || p.xp_tier_1 !== p.xp_min || p.xp_max <= p.xp_tier_3 || p.xp_tier_3 <= p.xp_tier_2 || p.xp_tier_2 <= p.xp_tier_1 || p.xp_mult_1 <= 0 || p.xp_mult_2 < p.xp_mult_1 || p.xp_mult_3 < p.xp_mult_2 || p.fatigue_divisor <= 0 || p.fatigue_max <= 0 || p.fatigue_floor <= 0 || p.fatigue_floor > 1 || p.supply_factor_low <= 0 || p.supply_factor_low > p.supply_factor_full || p.supply_factor_full > 1 || p.pc_cap_1 < 1 || p.pc_cap_2 < p.pc_cap_1 || p.pc_cap_3 < p.pc_cap_2 || ![p.pc_cap_1, p.pc_cap_2, p.pc_cap_3].every(Number.isInteger) || p.rav_cap <= 0 || p.xp_transaction_cap <= 0 || p.terrain_bonus_cap > 100 || specialties.some(entry => Number(field(entry, "D")) > p.xp_max) || [p.xp_recon, p.xp_hero, p.xp_battle, p.xp_retreat, p.xp_campaign].some(xp => xp > p.xp_transaction_cap)) fail("Les bornes ou coefficients du calcul V6 sont incohérents.");
    return { rules, error: null };
  } catch (error) {
    return { rules: null, error: error instanceof Error ? error.message : "Le fichier de règles V6 est illisible." };
  }
}
/** Route planning uses the documented directed graph, passage capacity and closures. It grants no campaign position. */
export function planWarRouteV6(fromId: string, toId: string, commandPoints: number, closedPassageIds: string[] = [], rules: WarRulesV6 = DEFAULT_WAR_RULES_V6): { passageIds: string[]; territoryIds: string[]; cost: number } | null {
  if (!rules.territories.some(item => item.id === fromId) || !rules.territories.some(item => item.id === toId) || !Number.isSafeInteger(commandPoints) || commandPoints < 1 || commandPoints > rules.parameters.pc_cap_3) return null;
  const distances = new Map<string, number>([[fromId, 0]]), previous = new Map<string, { id: string; passageId: string }>();
  const pending = new Set(rules.territories.map(item => item.id));
  while (pending.size) {
    const current = [...pending].sort((a, b) => (distances.get(a) ?? Infinity) - (distances.get(b) ?? Infinity))[0];
    const cost = distances.get(current); if (cost === undefined) break; pending.delete(current); if (current === toId) break;
    for (const passage of rules.passages.filter(item => !closedPassageIds.includes(item.id) && item.capacityPc >= commandPoints && (item.fromId === current || item.bidirectional && item.toId === current))) {
      const destination = passage.fromId === current ? passage.toId : passage.fromId;
      const nextCost = cost + passage.movementCost;
      if (pending.has(destination) && nextCost < (distances.get(destination) ?? Infinity)) { distances.set(destination, nextCost); previous.set(destination, { id: current, passageId: passage.id }); }
    }
  }
  if (!distances.has(toId)) return null;
  const territoryIds = [toId], passageIds: string[] = []; let current = toId;
  while (current !== fromId) { const edge = previous.get(current); if (!edge) return null; passageIds.unshift(edge.passageId); territoryIds.unshift(edge.id); current = edge.id; }
  return { territoryIds, passageIds, cost: distances.get(toId)! };
}
