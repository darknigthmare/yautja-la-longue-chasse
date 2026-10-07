/** Generic reader schema. Corpus content is supplied separately, after approval
 * or by an explicit local file selection. Formulas are never executed here.
 */
export type BibleCellValueV85 = string | number | boolean;
export interface BibleCellV85 { address: string; value: BibleCellValueV85; formula?: string }
export interface BibleRowV85 { number: number; cells: BibleCellV85[] }
export interface BibleSheetV85 { name: string; rows: BibleRowV85[] }
export interface BibleDocumentV85 {
  schemaVersion: number;
  source: { workbook: string; sha256: string; totalWorkbookSheets: number };
  sheets: BibleSheetV85[];
}
export const BIBLE_SOURCE_SHA_V85 = "87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183";
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
export const BIBLE_SOURCE_LIMITS_V85 = { sheets: 139, rowsPerSheet: 20_000, cells: 400_000, textLength: 50_000 } as const;

export function readBibleDocumentV85(value: unknown): BibleDocumentV85 {
  if (!isObject(value)) throw new Error("Le fichier ne contient pas un corpus JSON.");
  const document = value as Partial<BibleDocumentV85>;
  if (document.schemaVersion !== 1 || !isObject(document.source) || document.source.sha256 !== BIBLE_SOURCE_SHA_V85 ||
    document.source.totalWorkbookSheets !== 139 || typeof document.source.workbook !== "string" || !Array.isArray(document.sheets) ||
    document.sheets.length < 1 || document.sheets.length > BIBLE_SOURCE_LIMITS_V85.sheets) {
    throw new Error("Ce lecteur attend l’extraction de la Bible V6 récupérée le 7 octobre.");
  }
  const sheetNames = new Set<string>();
  let cellCount = 0;
  for (const sheet of document.sheets) {
    if (!isObject(sheet) || typeof sheet.name !== "string" || !sheet.name || sheetNames.has(sheet.name) ||
      !Array.isArray(sheet.rows) || sheet.rows.length > BIBLE_SOURCE_LIMITS_V85.rowsPerSheet) throw new Error("Une feuille du corpus est illisible.");
    sheetNames.add(sheet.name);
    const rowNumbers = new Set<number>();
    for (const row of sheet.rows) {
      if (!isObject(row) || typeof row.number !== "number" || !Number.isInteger(row.number) || row.number < 1 || row.number > 1_048_576 ||
        rowNumbers.has(row.number) || !Array.isArray(row.cells)) throw new Error("Une ligne du corpus est illisible.");
      rowNumbers.add(row.number);
      const addresses = new Set<string>();
      for (const cell of row.cells) {
        if (!isObject(cell) || typeof cell.address !== "string" || !/^[A-Z]{1,3}[1-9][0-9]*$/.test(cell.address) ||
          Number(cell.address.replace(/[A-Z]/g, "")) !== row.number || addresses.has(cell.address) ||
          !["string", "number", "boolean"].includes(typeof cell.value) ||
          (typeof cell.value === "number" && !Number.isFinite(cell.value)) ||
          (typeof cell.value === "string" && cell.value.length > BIBLE_SOURCE_LIMITS_V85.textLength) ||
          (cell.formula !== undefined && (typeof cell.formula !== "string" || cell.formula.length > BIBLE_SOURCE_LIMITS_V85.textLength))) throw new Error("Une cellule du corpus est illisible.");
        const column = cell.address.replace(/[0-9]/g, "");
        const columnNumber = [...column].reduce((number, letter) => number * 26 + letter.charCodeAt(0) - 64, 0);
        if (columnNumber > 16_384 || ++cellCount > BIBLE_SOURCE_LIMITS_V85.cells) throw new Error("Le corpus dépasse les limites du lecteur.");
        addresses.add(cell.address);
      }
    }
  }
  return document as BibleDocumentV85;
}

export function bibleCellValueV85(sheet: BibleSheetV85 | undefined, address: string): BibleCellValueV85 | undefined {
  const row = Number(address.replace(/[A-Z]/g, ""));
  return sheet?.rows.find(entry => entry.number === row)?.cells.find(cell => cell.address === address)?.value;
}

export interface BibleShipExerciseSettingsV85 {
  tiers: { level: number; persons: number }[];
  maxPlayers: number;
  occupants: { name: string; player: boolean; role: "hunter" | "medic" | "crew" }[];
}

/** Read only the exact simulator cells, never a hull catalogue by array order. */
export function readBibleShipExerciseSettingsV85(document: BibleDocumentV85): BibleShipExerciseSettingsV85 {
  const settings = document.sheets.find(sheet => sheet.name === "Réglages des simulateurs");
  const manifest = document.sheets.find(sheet => sheet.name === "Manifeste du navire");
  const tiers = [6, 7, 8].flatMap(row => {
    const level = bibleCellValueV85(settings, `D${row}`), persons = bibleCellValueV85(settings, `E${row}`);
    if (typeof level !== "number" || typeof persons !== "number" || !Number.isInteger(level) || !Number.isInteger(persons) || level < 1 || level > 3 || persons < 1 || persons > 100) return [];
    return [{ level, persons }];
  });
  const maxPlayers = bibleCellValueV85(settings, "E11");
  if (tiers.length !== 3 || new Set(tiers.map(tier => tier.level)).size !== 3 || typeof maxPlayers !== "number" ||
    !Number.isInteger(maxPlayers) || maxPlayers < 1 || maxPlayers > 100) throw new Error("Ouvrez bible-ships.json : les réglages du manifeste de clan sont nécessaires.");
  const occupants = (manifest?.rows ?? []).filter(row => row.number >= 14 && row.number <= 32 && bibleCellValueV85(manifest, `D${row.number}`) === 1).flatMap(row => {
    const name = bibleCellValueV85(manifest, `B${row.number}`);
    const player = bibleCellValueV85(manifest, `C${row.number}`) === "Joueur";
    const job = String(bibleCellValueV85(manifest, `E${row.number}`) ?? "").toLocaleLowerCase("fr");
    return typeof name === "string" && name.trim() ? [{ name, player, role: player ? "hunter" as const : job.includes("soin") || job.includes("médic") ? "medic" as const : "crew" as const }] : [];
  });
  return { tiers, maxPlayers, occupants };
}
