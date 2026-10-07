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

export function readBibleDocumentV85(value: unknown): BibleDocumentV85 {
  if (!value || typeof value !== "object") throw new Error("Le fichier ne contient pas un corpus JSON.");
  const document = value as Partial<BibleDocumentV85>;
  if (document.schemaVersion !== 1 || document.source?.sha256 !== BIBLE_SOURCE_SHA_V85 || !Array.isArray(document.sheets)) {
    throw new Error("Ce lecteur attend l’extraction de la Bible V6 récupérée le 7 octobre.");
  }
  for (const sheet of document.sheets) {
    if (typeof sheet.name !== "string" || !Array.isArray(sheet.rows)) throw new Error("Une feuille du corpus est illisible.");
    for (const row of sheet.rows) {
      if (!Number.isInteger(row.number) || !Array.isArray(row.cells)) throw new Error("Une ligne du corpus est illisible.");
      for (const cell of row.cells) {
        if (typeof cell.address !== "string" || !/^[A-Z]+[1-9][0-9]*$/.test(cell.address) ||
          !["string", "number", "boolean"].includes(typeof cell.value) ||
          (cell.formula !== undefined && typeof cell.formula !== "string")) throw new Error("Une cellule du corpus est illisible.");
      }
    }
  }
  return document as BibleDocumentV85;
}

export function bibleCellValueV85(sheet: BibleSheetV85 | undefined, address: string): BibleCellValueV85 | undefined {
  const row = Number(address.replace(/[A-Z]/g, ""));
  return sheet?.rows.find(entry => entry.number === row)?.cells.find(cell => cell.address === address)?.value;
}
