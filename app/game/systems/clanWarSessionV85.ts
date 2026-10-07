import { CANYON_PRESET_V85, CANYON_STORAGE_KEY_V85, createCanyonV85, readCanyonV85, type CanyonSimulationV85 } from "./clanWarCanyonV85";
import { WAR_STORAGE_KEY_V85, createWarSimulationV85, readWarSimulationV85, type WarSimulationV85 } from "./clanWarV85";
import { warUnitV85 } from "./clanWarV85Data";

export const COMPOSITION_STORAGE_KEY_V85 = "yautja.clan-war.v85.composition.free.v1";
export interface WarSessionStorageV85 { getItem(key: string): string | null; setItem(key: string, value: string): void }
export interface WarSessionSnapshotV85 {
  simulation: WarSimulationV85; canyon: CanyonSimulationV85; selection: Record<string, number>;
  loaded: boolean; writableWar: boolean; writableCanyon: boolean; writableComposition: boolean; storageMessage: string;
}
type Update<T> = T | ((current: T) => T);
/** Per-panel external store: hydrate once on subscription, then write only explicit event/timer transitions. */
export function createWarSessionV85(getStorage: () => WarSessionStorageV85 | null) {
  const initial: WarSessionSnapshotV85 = { simulation: createWarSimulationV85(), canyon: createCanyonV85(), selection: { ...CANYON_PRESET_V85 }, loaded: false, writableWar: true, writableCanyon: true, writableComposition: true, storageMessage: "" };
  let snapshot = initial, storage: WarSessionStorageV85 | null = null;
  const listeners = new Set<() => void>();
  const notices: Partial<Record<"war" | "canyon" | "composition" | "storage", string>> = {};
  const emit = () => { for (const listener of listeners) listener(); };
  const warn = (domain: keyof typeof notices, text: string) => { if (text) notices[domain] = text; else delete notices[domain]; snapshot = { ...snapshot, storageMessage: Object.values(notices).join(" ") }; };
  function hydrate() {
    if (snapshot.loaded) return;
    try {
      storage = getStorage();
      if (!storage) throw new Error("Storage unavailable");
      const rawWar = storage.getItem(WAR_STORAGE_KEY_V85), rawCanyon = storage.getItem(CANYON_STORAGE_KEY_V85), rawComposition = storage.getItem(COMPOSITION_STORAGE_KEY_V85);
      if (rawWar !== null) {
        let parsed: WarSimulationV85 | null = null; try { parsed = readWarSimulationV85(JSON.parse(rawWar)); } catch { /* Preserve incompatible bytes. */ }
        if (parsed) snapshot = { ...snapshot, simulation: parsed };
        else { snapshot = { ...snapshot, writableWar: false }; warn("war", "L’archive de Korthas est incompatible ou illisible. Ses données sont conservées ; cet exercice reste temporaire."); }
      }
      if (rawCanyon !== null) {
        let parsed: CanyonSimulationV85 | null = null; try { parsed = readCanyonV85(JSON.parse(rawCanyon)); } catch { /* Preserve incompatible bytes. */ }
        if (parsed) snapshot = { ...snapshot, canyon: parsed };
        else { snapshot = { ...snapshot, writableCanyon: false }; warn("canyon", "L’archive du canyon est incompatible ou illisible. Ses données sont conservées ; cet exercice reste temporaire."); }
      }
      if (rawComposition !== null) {
        try {
          const parsed = JSON.parse(rawComposition) as { version?: unknown; context?: unknown; selection?: unknown };
          if (!parsed || parsed.version !== 1 || parsed.context !== "free" || !parsed.selection || typeof parsed.selection !== "object" || Array.isArray(parsed.selection) || !Object.entries(parsed.selection).every(([id, quantity]) => warUnitV85(id) && typeof quantity === "number" && Number.isSafeInteger(quantity) && quantity >= 0 && quantity <= 12)) throw new Error("Incompatible free composition");
          snapshot = { ...snapshot, selection: { ...parsed.selection as Record<string, number> } };
        } catch { snapshot = { ...snapshot, writableComposition: false }; warn("composition", "La configuration de détachement est incompatible. Elle est conservée et le compositeur reste temporaire."); }
      }
    } catch {
      storage = null;
      snapshot = { ...snapshot, writableWar: false, writableCanyon: false, writableComposition: false };
      warn("storage", "Le stockage local est indisponible. Les exercices restent utilisables pendant cette visite.");
    }
    snapshot = { ...snapshot, loaded: true }; emit();
  }
  function persist(kind: "simulation" | "canyon" | "selection") {
    const writable = kind === "simulation" ? "writableWar" : kind === "canyon" ? "writableCanyon" : "writableComposition";
    const domain = kind === "simulation" ? "war" : kind === "canyon" ? "canyon" : "composition";
    if (!snapshot.loaded || !snapshot[writable]) return;
    try {
      storage ??= getStorage();
      if (!storage) throw new Error("Storage unavailable");
      const key = kind === "simulation" ? WAR_STORAGE_KEY_V85 : kind === "canyon" ? CANYON_STORAGE_KEY_V85 : COMPOSITION_STORAGE_KEY_V85;
      const value = kind === "selection" ? { version: 1, context: "free", selection: snapshot.selection } : snapshot[kind];
      storage.setItem(key, JSON.stringify(value));
      warn(domain, "");
    } catch {
      snapshot = { ...snapshot, [writable]: false };
      warn(domain, kind === "simulation" ? "Korthas continue en mémoire : sa sauvegarde locale n’a pas pu être écrite." : kind === "canyon" ? "Le canyon continue en mémoire : sa sauvegarde locale n’a pas pu être écrite." : "La composition continue en mémoire : sa configuration n’a pas pu être sauvegardée.");
    }
  }
  function update<K extends "simulation" | "canyon" | "selection">(kind: K, value: Update<WarSessionSnapshotV85[K]>) {
    hydrate();
    const next = typeof value === "function" ? (value as (current: WarSessionSnapshotV85[K]) => WarSessionSnapshotV85[K])(snapshot[kind]) : value;
    if (next === snapshot[kind]) return;
    snapshot = { ...snapshot, [kind]: next }; persist(kind); emit();
  }
  function unlock(kind: "simulation" | "canyon") {
    hydrate();
    snapshot = { ...snapshot, [kind === "simulation" ? "writableWar" : "writableCanyon"]: true }; persist(kind); emit();
  }
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    subscribe: (listener: () => void) => { listeners.add(listener); hydrate(); return () => { listeners.delete(listener); }; },
    setSimulation: (value: Update<WarSimulationV85>) => update("simulation", value),
    setCanyon: (value: Update<CanyonSimulationV85>) => update("canyon", value),
    setSelection: (value: Update<Record<string, number>>) => update("selection", value),
    unlockWarAfterExplicitReset: () => unlock("simulation"),
    unlockCanyonAfterExplicitReset: () => unlock("canyon"),
  };
}
