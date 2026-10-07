import workbook from "../clanWarV85Source.json";

export interface ClanWarFieldV85 { column: string; label: string; value: string | number | boolean; cell: string }
export interface ClanWarEntryV85 { id: string; sheet: string; category: string; row: number; title: string | number; fields: ClanWarFieldV85[] }
export const CLAN_WAR_WORKBOOK_V85 = workbook as {
  workbook: string; sha256: string; designedAt: string;
  entries: ClanWarEntryV85[]; parameters: Record<string, number>;
};
export const CLAN_WAR_ENTRIES_V85 = CLAN_WAR_WORKBOOK_V85.entries;
export const CLAN_WAR_SECTIONS_V85 = [...new Set(CLAN_WAR_ENTRIES_V85.map(entry => entry.sheet))];
export const CLAN_WAR_PARAMETERS_V85 = CLAN_WAR_WORKBOOK_V85.parameters;
export function clanWarFieldV85(entry: ClanWarEntryV85, column: string): string | number | boolean {
  return entry.fields.find(field => field.column === column)?.value ?? "";
}
export function clanWarEntryV85(id: string): ClanWarEntryV85 | undefined {
  return CLAN_WAR_ENTRIES_V85.find(entry => entry.id === id);
}
export interface WarTerritoryDefinitionV85 {
  id: string; name: string; region: string; kind: string; neighbors: string[];
  initialController: WarFactionIdV85; terrain: string; sites: string;
  defenses: string; capture: string; effect: string; risk: string;
  income: { s: number; m: number; i: number };
}
export type WarFactionIdV85 = "CON-F01" | "CON-F02" | "CON-F03";
export const WAR_FACTIONS_V85: Record<WarFactionIdV85, string> = {
  "CON-F01": "Expédition des Haltes", "CON-F02": "Coalition des Forges de Korthas", "CON-F03": "Assemblée des Passes",
};
/** All names, neighbors, initial flags and production sites come from the workbook. */
export const WAR_TERRITORIES_V85: WarTerritoryDefinitionV85[] = CLAN_WAR_ENTRIES_V85
  .filter(entry => entry.sheet === "Territoires de Korthas")
  .map(entry => {
    const income = String(clanWarFieldV85(entry, "I"));
    const match = income.match(/^([SMI])\s*\+(\d+)/);
    const controller = String(clanWarFieldV85(entry, "G")).split(" ")[0] as WarFactionIdV85;
    return {
      id: entry.id, name: String(clanWarFieldV85(entry, "D")), region: String(clanWarFieldV85(entry, "C")),
      kind: String(clanWarFieldV85(entry, "E")), neighbors: String(clanWarFieldV85(entry, "F")).match(/CON-T\d{2}/g) ?? [],
      initialController: controller, terrain: String(clanWarFieldV85(entry, "H")), sites: String(clanWarFieldV85(entry, "J")),
      defenses: String(clanWarFieldV85(entry, "K")), capture: String(clanWarFieldV85(entry, "L")),
      effect: String(clanWarFieldV85(entry, "M")), risk: String(clanWarFieldV85(entry, "N")),
      income: { s: match?.[1] === "S" ? Number(match[2]) : 0, m: match?.[1] === "M" ? Number(match[2]) : 0, i: match?.[1] === "I" ? Number(match[2]) : 0 },
    };
  });
export interface WarUnitDefinitionV85 {
  id: string; name: string; category: string; formation: string; equipment: string; role: string;
  behavior: string; counter: string; weakness: string; command: number; materials: number; energy: number;
  range: string; terrain: string; access: string; evolution: string;
}
export const WAR_UNITS_V85: WarUnitDefinitionV85[] = CLAN_WAR_ENTRIES_V85
  .filter(entry => entry.sheet === "Unités RTS")
  .map(entry => ({
    id: entry.id, name: String(entry.title), category: String(clanWarFieldV85(entry, "C")),
    formation: String(clanWarFieldV85(entry, "D")), equipment: String(clanWarFieldV85(entry, "E")), role: String(clanWarFieldV85(entry, "F")),
    behavior: String(clanWarFieldV85(entry, "G")), counter: String(clanWarFieldV85(entry, "H")), weakness: String(clanWarFieldV85(entry, "I")),
    command: Number(clanWarFieldV85(entry, "J")), materials: Number(clanWarFieldV85(entry, "K")), energy: Number(clanWarFieldV85(entry, "L")),
    range: String(clanWarFieldV85(entry, "N")), terrain: String(clanWarFieldV85(entry, "O")), access: String(clanWarFieldV85(entry, "P")), evolution: String(clanWarFieldV85(entry, "Q")),
  }));
export function warUnitV85(id: string): WarUnitDefinitionV85 | undefined { return WAR_UNITS_V85.find(unit => unit.id === id); }
export function warTerritoryV85(id: string): WarTerritoryDefinitionV85 | undefined { return WAR_TERRITORIES_V85.find(territory => territory.id === id); }
export function warCompositionV85(selection: Record<string, number>) {
  const used = WAR_UNITS_V85.reduce((total, unit) => {
    const quantity = Math.max(0, Math.min(12, Math.floor(selection[unit.id] ?? 0)));
    return { command: total.command + quantity * unit.command, materials: total.materials + quantity * unit.materials, energy: total.energy + quantity * unit.energy };
  }, { command: 0, materials: 0, energy: 0 });
  const limits = { command: CLAN_WAR_PARAMETERS_V85.TACT_C, materials: CLAN_WAR_PARAMETERS_V85.TACT_M, energy: CLAN_WAR_PARAMETERS_V85.TACT_E };
  return { used, limits, allowed: used.command > 0 && used.command <= limits.command && used.materials <= limits.materials && used.energy <= limits.energy };
}
