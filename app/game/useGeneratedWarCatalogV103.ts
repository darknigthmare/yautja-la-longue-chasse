"use client";

import { useMemo, useSyncExternalStore } from "react";
import { GENERATED_WAR_CATALOG_KEY_V102 } from "./systems/clanWarGeneratedCatalogV102";
import {
  GENERATED_WAR_CATALOG_KEY_V103, MAX_GENERATED_WAR_CATALOG_V103,
  readGeneratedWarCatalogV103, rememberGeneratedWarPlanetV103,
  type GeneratedWarCatalogSnapshotV103, type GeneratedWarCatalogStorageV103,
} from "./systems/clanWarGeneratedCatalogV103";

const changed = "yautja-generated-world-catalog-v103";
const legacyChanged = "yautja-generated-world-catalog-v102";
const serverSnapshot = JSON.stringify({ ids: [], persisted: false, issue: null });
let memoryIds: string[] = [];
let memoryIssue: string | null = null;

function storage(): GeneratedWarCatalogStorageV103 | null {
  try { return typeof window === "undefined" ? null : window.localStorage; }
  catch { return null; }
}

function snapshot(): string {
  const current = readGeneratedWarCatalogV103(storage());
  const ids = [...new Set([...memoryIds, ...current.ids])].slice(0, MAX_GENERATED_WAR_CATALOG_V103);
  const persisted = current.persisted && memoryIds.every(id => current.ids.includes(id));
  return JSON.stringify({ ids, persisted, issue: persisted ? current.issue : memoryIssue ?? current.issue });
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === GENERATED_WAR_CATALOG_KEY_V103 || event.key === GENERATED_WAR_CATALOG_KEY_V102) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(changed, listener);
  window.addEventListener(legacyChanged, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(changed, listener);
    window.removeEventListener(legacyChanged, listener);
  };
}

export function rememberGeneratedWorldV103(id: string): GeneratedWarCatalogSnapshotV103 {
  const result = rememberGeneratedWarPlanetV103(storage(), id, memoryIds);
  memoryIds = result.persisted ? [] : result.ids;
  memoryIssue = result.persisted ? null : result.issue;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(changed));
  return result;
}

export function useGeneratedWarCatalogV103(): GeneratedWarCatalogSnapshotV103 {
  const value = useSyncExternalStore(subscribe, snapshot, () => serverSnapshot);
  return useMemo(() => JSON.parse(value) as GeneratedWarCatalogSnapshotV103, [value]);
}
