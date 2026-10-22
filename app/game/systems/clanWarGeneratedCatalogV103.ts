import {
  readGeneratedWarCatalogV102, type GeneratedWarCatalogStorageV102,
} from "./clanWarGeneratedCatalogV102";
import { parseWarPlanetRecipeCodeV103 } from "./clanWarProceduralV103";

/** A convenience index, separate from the authoritative per-world archives.
 * V102 shortcuts are read without rewriting their key or upgrading any code. */
export const GENERATED_WAR_CATALOG_KEY_V103 = "yautja.clan-war.v103.generated-catalog";
export const MAX_GENERATED_WAR_CATALOG_V103 = 24;
const MAX_CATALOG_BYTES = 16_384;
export type GeneratedWarCatalogStorageV103 = GeneratedWarCatalogStorageV102;
export interface GeneratedWarCatalogSnapshotV103 {
  ids: string[];
  persisted: boolean;
  issue: string | null;
}
const unavailable = "Catalogue local indisponible. Les mondes restent en mémoire ; conservez leurs codes pour les retrouver.";
const incompatible = "Catalogue V103 incompatible ou illisible, conservé sans modification. Les nouveaux raccourcis restent en mémoire.";
const legacyIssue = "L’ancien catalogue V102 est illisible et a été conservé. Les raccourcis V103 restent disponibles ; un code V102 valide permet toujours de rouvrir son monde.";

function boundedIds(ids: readonly unknown[]): string[] {
  const seen = new Set<string>();
  for (const id of ids) {
    if (typeof id === "string" && parseWarPlanetRecipeCodeV103(id)) seen.add(id);
    if (seen.size >= MAX_GENERATED_WAR_CATALOG_V103) break;
  }
  return [...seen];
}

function decode(raw: string | null): GeneratedWarCatalogSnapshotV103 {
  if (raw === null) return { ids: [], persisted: true, issue: null };
  try {
    if (typeof raw !== "string" || raw.length > MAX_CATALOG_BYTES) throw new Error("Oversized catalog");
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid catalog");
    const data = value as { version?: unknown; ids?: unknown };
    if (data.version !== 103 || !Array.isArray(data.ids) || data.ids.length > MAX_GENERATED_WAR_CATALOG_V103 ||
      !data.ids.every(id => typeof id === "string" && parseWarPlanetRecipeCodeV103(id))) throw new Error("Invalid catalog");
    return { ids: boundedIds(data.ids), persisted: true, issue: null };
  } catch { return { ids: [], persisted: false, issue: incompatible }; }
}

export function readGeneratedWarCatalogV103(storage: GeneratedWarCatalogStorageV103 | null): GeneratedWarCatalogSnapshotV103 {
  try {
    if (!storage) throw new Error("Storage unavailable");
    const current = decode(storage.getItem(GENERATED_WAR_CATALOG_KEY_V103));
    const legacy = readGeneratedWarCatalogV102(storage);
    return {
      ids: boundedIds([...current.ids, ...legacy.ids]), persisted: current.persisted,
      issue: current.issue ?? (legacy.issue ? legacyIssue : null),
    };
  } catch { return { ids: [], persisted: false, issue: unavailable }; }
}

export function rememberGeneratedWarPlanetV103(storage: GeneratedWarCatalogStorageV103 | null,
  id: string, knownIds: readonly string[] = []): GeneratedWarCatalogSnapshotV103 {
  const memory = boundedIds(knownIds.slice(0, MAX_GENERATED_WAR_CATALOG_V103));
  if (typeof id !== "string" || !parseWarPlanetRecipeCodeV103(id)) return { ids: memory, persisted: false, issue: "Code de monde invalide. Aucun raccourci n’a été enregistré." };
  let ids = boundedIds([id, ...memory]);
  try {
    if (!storage) throw new Error("Storage unavailable");
    const before = storage.getItem(GENERATED_WAR_CATALOG_KEY_V103), previous = decode(before);
    const legacy = readGeneratedWarCatalogV102(storage);
    ids = boundedIds([id, ...memory, ...previous.ids, ...legacy.ids]);
    if (previous.issue) return { ids, persisted: false, issue: previous.issue };
    const raw = JSON.stringify({ version: 103, ids });
    if (storage.getItem(GENERATED_WAR_CATALOG_KEY_V103) !== before) return {
      ids, persisted: false, issue: "Catalogue modifié dans une autre session. Rouvrez ce monde pour réessayer son enregistrement.",
    };
    if (before !== raw) {
      try { storage.setItem(GENERATED_WAR_CATALOG_KEY_V103, raw); } catch { /* Verify even when a setter writes then throws. */ }
    }
    if (storage.getItem(GENERATED_WAR_CATALOG_KEY_V103) !== raw) return { ids, persisted: false, issue: "Enregistrement du catalogue non confirmé. Conservez les codes des mondes affichés pour les retrouver." };
    return { ids, persisted: true, issue: legacy.issue ? legacyIssue : null };
  } catch { return { ids, persisted: false, issue: unavailable }; }
}
