"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  GENERATED_WAR_CATALOG_KEY_V102, MAX_GENERATED_WAR_CATALOG_V102,
  readGeneratedWarCatalogV102, rememberGeneratedWarPlanetV102,
  type GeneratedWarCatalogSnapshotV102, type GeneratedWarCatalogStorageV102,
} from "./systems/clanWarGeneratedCatalogV102";

const changed = "yautja-generated-world-catalog-v102";
const serverSnapshot = JSON.stringify({ ids: [], persisted: false, issue: null });
// Session-only fallbacks are bounded like the persisted shortcuts. The world
// code remains sufficient to restore a front even when its shortcut is absent.
let memoryIds: string[] = [];
let memoryIssue: string | null = null;

function storage(): GeneratedWarCatalogStorageV102 | null {
  try { return typeof window === "undefined" ? null : window.localStorage; }
  catch { return null; }
}

function snapshot(): string {
  const current = readGeneratedWarCatalogV102(storage());
  const ids = [...new Set([...memoryIds, ...current.ids])].slice(0, MAX_GENERATED_WAR_CATALOG_V102);
  const persisted = current.persisted && memoryIds.every(id => current.ids.includes(id));
  return JSON.stringify({ ids, persisted, issue: persisted ? null : memoryIssue ?? current.issue });
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === null || event.key === GENERATED_WAR_CATALOG_KEY_V102) listener(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener(changed, listener);
  return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(changed, listener); };
}

export function rememberGeneratedWorldV102(id: string): GeneratedWarCatalogSnapshotV102 {
  const result = rememberGeneratedWarPlanetV102(storage(), id, memoryIds);
  memoryIds = result.persisted ? [] : result.ids;
  memoryIssue = result.persisted ? null : result.issue;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(changed));
  return result;
}

export function useGeneratedWarCatalogV102(): GeneratedWarCatalogSnapshotV102 {
  const value = useSyncExternalStore(subscribe, snapshot, () => serverSnapshot);
  return useMemo(() => JSON.parse(value) as GeneratedWarCatalogSnapshotV102, [value]);
}
