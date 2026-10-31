"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import {
  DEFAULT_GAUNTLET_ID_V132, gauntletStorageKeyV132,
  gauntletUnlockedV132, normalizeGauntletV132, parseGauntletPreferenceV132,
  serializeGauntletPreferenceV132, type HunterRankV132,
} from "./clanWarGauntletCatalogV132";

/**
 * Shared between the ship's armory, the player's rig and clan-war screens.
 * This remains a per-hunter LOCAL cosmetic preference pending a versioned
 * campaign-save migration. Never use it as an award or battle stat.
 */
export const HUNTER_GAUNTLET_EVENT_V133 = "yautja:hunter-gauntlet-v133";
const localFallback = new Map<string,string>();

export function readHunterGauntletV133(
  storage: Pick<Storage,"getItem"> | null, hunter: string, rank: HunterRankV132,
  fallback: ReadonlyMap<string,string> = localFallback,
): string {
  const key = gauntletStorageKeyV132(hunter);
  if (fallback.has(key)) return normalizeGauntletV132(fallback.get(key),rank);
  if (storage) {
    try {
      return parseGauntletPreferenceV132(storage.getItem(key),hunter,rank);
    } catch { /* Storage permission might have been revoked. */ }
  }
  return normalizeGauntletV132(fallback.get(key),rank);
}

export function useHunterGauntletV133(hunter: string, rank: HunterRankV132) {
  const key = gauntletStorageKeyV132(hunter);
  const [storageWarning,setStorageWarning] = useState<string | null>(null);

  const snapshot = useCallback((): string => {
    if (typeof window === "undefined") return DEFAULT_GAUNTLET_ID_V132;
    let storage: Storage | null = null;
    try { storage=window.localStorage; } catch { /* Browser storage denied. */ }
    return readHunterGauntletV133(storage,hunter,rank);
  },[hunter,rank]);

  const subscribe=useCallback((notify:()=>void):(()=>void)=>{
    if (typeof window === "undefined") return () => {};
    const onStorage=(event:StorageEvent)=>{
      if (event.key===key || event.key===null) {
        // Another tab's write must supersede a former in-memory fallback.
        localFallback.delete(key);
        notify();
      }
    };
    const onLocalChange=(event:Event)=>{
      if ((event as CustomEvent<{key?:string}>).detail?.key===key) notify();
    };
    window.addEventListener("storage",onStorage);
    window.addEventListener(HUNTER_GAUNTLET_EVENT_V133,onLocalChange);
    return ()=>{
      window.removeEventListener("storage",onStorage);
      window.removeEventListener(HUNTER_GAUNTLET_EVENT_V133,onLocalChange);
    };
  },[key]);

  const equippedId=useSyncExternalStore(subscribe,snapshot,()=>DEFAULT_GAUNTLET_ID_V132);

  const equip=useCallback((id:string):boolean=>{
    if (!gauntletUnlockedV132(id,rank) || typeof window==="undefined") return false;
    const payload=serializeGauntletPreferenceV132(hunter,id,rank);
    try {
      window.localStorage.setItem(key,payload);
      localFallback.delete(key);
      setStorageWarning(null);
    } catch {
      localFallback.set(key,id);
      setStorageWarning("Préférence du gauntlet active en mémoire uniquement : stockage local refusé. L'archive de campagne reste intacte.");
    }
    window.dispatchEvent(new CustomEvent(HUNTER_GAUNTLET_EVENT_V133,{detail:{key}}));
    return true;
  },[hunter,key,rank]);

  return {equippedId,equip,storageWarning};
}
