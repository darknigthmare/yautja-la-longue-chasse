import { readBibleDocumentV85, type BibleDocumentV85 } from "./bibleSourceV85";

/** A local file cannot always be physically cancelled. Tickets still prevent an
 * obsolete result from replacing a newer import or surviving a closed reader.
 */
export function createBibleLoadGateV85() {
  let generation = 0;
  let active: AbortController | null = null;
  return {
    begin() {
      active?.abort();
      const controller = new AbortController();
      active = controller;
      const ticketGeneration = ++generation;
      return {
        signal: controller.signal,
        isCurrent: () => ticketGeneration === generation && !controller.signal.aborted,
        cancel: () => controller.abort(),
      };
    },
    cancel() { generation++; active?.abort(); active = null; },
  };
}

/** Network validation is part of this asynchronous operation, including URL
 * failures; effects subscribe to its outcome without synchronous state resets.
 */
export async function fetchBibleDocumentsV85(paths: readonly string[], baseUrl: string, signal: AbortSignal,
  fetcher: typeof fetch = fetch): Promise<BibleDocumentV85[]> {
  const base = new URL(baseUrl);
  return Promise.all(paths.map(async path => {
    const url = new URL(path, base);
    if (url.origin !== base.origin) throw new Error("Le corpus public doit être servi par ce site.");
    if (signal.aborted) throw new Error("Chargement annulé.");
    const response = await fetcher(url, { signal, credentials: "same-origin" });
    if (!response.ok) throw new Error("Le corpus approuvé n’est pas disponible à cette adresse.");
    const document = readBibleDocumentV85(await response.json());
    if (signal.aborted) throw new Error("Chargement annulé.");
    return document;
  }));
}
