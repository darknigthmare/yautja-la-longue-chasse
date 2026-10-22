import { parseWarPlanetV102 } from "./clanWarPlanetGeneratorV102";

/** A bounded list of shortcuts, never the authoritative world or front data.
 * A code can recreate an evicted world; its separate war archive is untouched. */
export const GENERATED_WAR_CATALOG_KEY_V102 = "yautja.clan-war.v102.generated-catalog";
export const MAX_GENERATED_WAR_CATALOG_V102 = 24;
const MAX_CATALOG_BYTES = 16_384;

export interface GeneratedWarCatalogStorageV102 {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface GeneratedWarCatalogSnapshotV102 {
  ids: string[];
  persisted: boolean;
  issue: string | null;
}
const unavailable = "Catalogue local indisponible. Les mondes restent en mémoire ; conservez leurs codes pour les retrouver.";
const incompatible = "Catalogue de mondes incompatible ou illisible, conservé sans modification. Les nouveaux raccourcis restent en mémoire.";
const unconfirmed = "Enregistrement du catalogue non confirmé. Les mondes restent en mémoire ; conservez leurs codes pour les retrouver.";

function boundedIds(ids: readonly unknown[]): string[] {
  const seen = new Set<string>();
  for (const id of ids) {
    if (typeof id === "string" && parseWarPlanetV102(id)) seen.add(id);
    if (seen.size >= MAX_GENERATED_WAR_CATALOG_V102) break;
  }
  return [...seen];
}

function decode(raw: string | null): GeneratedWarCatalogSnapshotV102 {
  if (raw === null) return { ids: [], persisted: true, issue: null };
  try {
    if (typeof raw !== "string" || raw.length > MAX_CATALOG_BYTES) throw new Error("Oversized catalog");
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid catalog");
    const data = value as { version?: unknown; ids?: unknown };
    if (data.version !== 102 || !Array.isArray(data.ids) || data.ids.length > MAX_GENERATED_WAR_CATALOG_V102 ||
      !data.ids.every(id => typeof id === "string" && parseWarPlanetV102(id))) throw new Error("Invalid catalog");
    return { ids: boundedIds(data.ids), persisted: true, issue: null };
  } catch { return { ids: [], persisted: false, issue: incompatible }; }
}

/** Read only: future or damaged catalogs are never silently repaired. */
export function readGeneratedWarCatalogV102(storage: GeneratedWarCatalogStorageV102 | null): GeneratedWarCatalogSnapshotV102 {
  try {
    if (!storage) throw new Error("Storage unavailable");
    return decode(storage.getItem(GENERATED_WAR_CATALOG_KEY_V102));
  } catch { return { ids: [], persisted: false, issue: unavailable }; }
}

/** Remember the most recently opened code. The caller may pass unsaved in-memory
 * codes so a denied storage write does not hide other worlds from this session.
 * Storage errors never claim persistence and never delete any planetary save. */
export function rememberGeneratedWarPlanetV102(storage: GeneratedWarCatalogStorageV102 | null,
  id: string, knownIds: readonly string[] = []): GeneratedWarCatalogSnapshotV102 {
  const memory = boundedIds(knownIds.slice(0, MAX_GENERATED_WAR_CATALOG_V102));
  if (typeof id !== "string" || !parseWarPlanetV102(id)) return { ids: memory, persisted: false, issue: "Code de monde invalide. Aucun raccourci n’a été enregistré." };
  let ids = boundedIds([id, ...memory]);
  try {
    if (!storage) throw new Error("Storage unavailable");
    const before = storage.getItem(GENERATED_WAR_CATALOG_KEY_V102);
    const previous = decode(before);
    ids = boundedIds([id, ...memory, ...previous.ids]);
    if (previous.issue) return { ids, persisted: false, issue: previous.issue };
    const raw = JSON.stringify({ version: 102, ids });
    // This list is a convenience index, not the transactional front archive.
    // Refuse an already-observed concurrent edit instead of discarding it.
    if (storage.getItem(GENERATED_WAR_CATALOG_KEY_V102) !== before) return {
      ids, persisted: false, issue: "Catalogue modifié dans une autre session. Rouvrez ce monde pour réessayer son enregistrement.",
    };
    if (before !== raw) {
      try { storage.setItem(GENERATED_WAR_CATALOG_KEY_V102, raw); } catch { /* A setter may persist before throwing: verify below. */ }
    }
    if (storage.getItem(GENERATED_WAR_CATALOG_KEY_V102) !== raw) return { ids, persisted: false, issue: unconfirmed };
    return { ids, persisted: true, issue: null };
  } catch { return { ids, persisted: false, issue: unavailable }; }
}
