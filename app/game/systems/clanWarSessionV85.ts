import { CANYON_PRESET_V85, CANYON_STORAGE_KEY_V85, createCanyonV85, readCanyonV85, type CanyonSimulationV85 } from "./clanWarCanyonV85";
import { WAR_STORAGE_KEY_V85, createWarSimulationV85, readWarSimulationV85, type WarSimulationV85 } from "./clanWarV85";
import { warUnitV85 } from "./clanWarV85Data";
import { withArchiveTransferLock } from "./archiveTransaction";

export const COMPOSITION_STORAGE_KEY_V85 = "yautja.clan-war.v85.composition.free.v1";
export interface WarSessionStorageV85 { getItem(key: string): string | null; setItem(key: string, value: string): void }
export interface WarSessionSnapshotV85 {
  simulation: WarSimulationV85; canyon: CanyonSimulationV85; selection: Record<string, number>;
  loaded: boolean; writableWar: boolean; writableCanyon: boolean; writableComposition: boolean; storageMessage: string;
  persistedWar: boolean; persistedCanyon: boolean; persistedComposition: boolean;
  pendingWrites: number; canRetryPersistence: boolean;
}
type Update<T> = T | ((current: T) => T);
type Kind = "simulation" | "canyon" | "selection";
type Failure = "unreadable" | "incompatible" | "conflict" | "write" | "lock";
export type WarSessionWriteLockV85 = (operation: () => void) => Promise<{ acquired: true; value: void } | { acquired: false; reason: string }>;
const domains = {
  simulation: { key: WAR_STORAGE_KEY_V85, writable: "writableWar", persisted: "persistedWar", label: "Korthas" },
  canyon: { key: CANYON_STORAGE_KEY_V85, writable: "writableCanyon", persisted: "persistedCanyon", label: "Le canyon" },
  selection: { key: COMPOSITION_STORAGE_KEY_V85, writable: "writableComposition", persisted: "persistedComposition", label: "La composition" },
} as const;
const kinds: readonly Kind[] = ["simulation", "canyon", "selection"];
function selectionFrom(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as { version?: unknown; context?: unknown; selection?: unknown };
  if (v.version !== 1 || v.context !== "free" || !v.selection || typeof v.selection !== "object" || Array.isArray(v.selection)) return null;
  if (!Object.entries(v.selection).every(([id, count]) => warUnitV85(id) && typeof count === "number" && Number.isSafeInteger(count) && count >= 0 && count <= 12)) return null;
  return { ...v.selection as Record<string, number> };
}
function decode(kind: Kind, raw: string) {
  const value: unknown = JSON.parse(raw);
  return kind === "simulation" ? readWarSimulationV85(value) : kind === "canyon" ? readCanyonV85(value) : selectionFrom(value);
}
function serialize(kind: Kind, value: WarSessionSnapshotV85[Kind]): string {
  return JSON.stringify(kind === "selection" ? { version: 1, context: "free", selection: value } : value);
}

/** Per-panel memory, per-domain confirmed preimages. Browser writes share the
 * native archive lock: compare, write and readback happen in its sync callback.
 * No campaign key is written. A test may inject a deterministic lock scheduler.
 * Older, non-cooperating clients cannot be made transactional by this store. */
export function createWarSessionV85(getStorage: () => WarSessionStorageV85 | null,
  lock: WarSessionWriteLockV85 = operation => withArchiveTransferLock(operation)) {
  const initial: WarSessionSnapshotV85 = {
    simulation: createWarSimulationV85(), canyon: createCanyonV85(), selection: { ...CANYON_PRESET_V85 },
    loaded: false, writableWar: true, writableCanyon: true, writableComposition: true, storageMessage: "",
    persistedWar: false, persistedCanyon: false, persistedComposition: false, pendingWrites: 0, canRetryPersistence: false,
  };
  let snapshot = initial, storage: WarSessionStorageV85 | null = null, tail: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();
  const unconfirmed = new Map<Kind, string>();
  const observed = new Map<Kind, string | null>(); // missing means never successfully read
  const failures = new Map<Kind, Failure>(), notices = new Map<Kind, string>();
  const emit = () => { for (const listener of listeners) listener(); };
  const summarize = () => {
    snapshot = { ...snapshot, storageMessage: [...notices.values()].join(" "),
      canRetryPersistence: [...failures.values()].some(reason => reason === "write" || reason === "lock") };
  };
  function block(kind: Kind, failure: Failure, message: string) {
    failures.set(kind, failure); notices.set(kind, `${domains[kind].label} : ${message}`);
    snapshot = { ...snapshot, [domains[kind].writable]: false, [domains[kind].persisted]: false }; summarize();
  }
  function hydrate() {
    if (snapshot.loaded) return;
    try { storage = getStorage(); } catch { storage = null; }
    for (const kind of kinds) {
      let raw: string | null;
      try {
        if (!storage) throw new Error("Storage unavailable");
        raw = storage.getItem(domains[kind].key); observed.set(kind, raw);
      } catch {
        block(kind, "unreadable", "stockage local indisponible. Cette partie de l’exercice reste en mémoire."); continue;
      }
      if (raw === null) continue;
      try {
        const parsed = decode(kind, raw);
        if (!parsed) throw new Error("Incompatible archive");
        snapshot = { ...snapshot, [kind]: parsed, [domains[kind].persisted]: true };
      } catch { block(kind, "incompatible", "archive incompatible ou illisible, conservée sans modification. L’exercice reste temporaire."); }
    }
    snapshot = { ...snapshot, loaded: true }; emit();
  }
  function mayWrite(kind: Kind, reset: boolean, retry: boolean): boolean {
    const reason = failures.get(kind);
    return !reason || (reset && reason === "incompatible") || ((reset || retry) && (reason === "write" || reason === "lock"));
  }
  function enqueue(kind: Kind, reset = false, retry = false) {
    if (!mayWrite(kind, reset, retry)) return;
    snapshot = { ...snapshot, pendingWrites: snapshot.pendingWrites + 1 };
    tail = tail.then(async () => {
      if (!mayWrite(kind, reset, retry)) return;
      const result = await lock(() => {
        if (!mayWrite(kind, reset, retry)) return;
        const definition = domains[kind];
        try {
          if (!storage || !observed.has(kind)) throw new Error("Unobserved archive");
          // Confirmation/reset never grants permission to replace a different
          // archive that appeared since this panel read its original bytes.
          const current = storage.getItem(definition.key);
          if (current !== observed.get(kind) && !(retry && current === unconfirmed.get(kind))) {
            block(kind, "conflict", "archive modifiée dans une autre session. Aucune écriture ; fermez puis rouvrez le panneau pour la relire."); return;
          }
          // Coalesce queued updates to the latest validated in-memory state.
          // An explicit retry must not strand changes made while it waited.
          const raw = serialize(kind, snapshot[kind]);
          if (raw !== current) {
            unconfirmed.set(kind, raw);
            try { storage.setItem(definition.key, raw); } catch { /* A setter may have persisted before throwing: verify, never guess. */ }
            if (storage.getItem(definition.key) !== raw) throw new Error("Unconfirmed write");
          }
          observed.set(kind, raw); unconfirmed.delete(kind); failures.delete(kind); notices.delete(kind);
          snapshot = { ...snapshot, [definition.writable]: true,
            [definition.persisted]: serialize(kind, snapshot[kind]) === raw }; summarize();
        } catch { block(kind, "write", "sauvegarde non confirmée. L’exercice continue en mémoire ; vous pouvez réessayer sans recommencer."); }
      });
      if (!result.acquired) block(kind, "lock", "verrou de sauvegarde indisponible. Aucune écriture ; l’exercice reste en mémoire et peut être réessayé.");
    }).catch(() => {
      block(kind, "lock", "verrou de sauvegarde indisponible. Aucune réussite annoncée ; l’exercice reste en mémoire.");
    }).finally(() => { snapshot = { ...snapshot, pendingWrites: snapshot.pendingWrites - 1 }; emit(); });
  }
  function update<K extends Kind>(kind: K, value: Update<WarSessionSnapshotV85[K]>) {
    hydrate();
    const next = typeof value === "function" ? (value as (current: WarSessionSnapshotV85[K]) => WarSessionSnapshotV85[K])(snapshot[kind]) : value;
    if (next === snapshot[kind]) return;
    let raw: string;
    try { raw = serialize(kind, next); if (!decode(kind, raw)) throw new Error("Invalid exercise"); }
    catch { notices.set(kind, `${domains[kind].label} : état invalide refusé, l’exercice précédent est conservé.`); summarize(); emit(); return; }
    snapshot = { ...snapshot, [kind]: next, [domains[kind].persisted]: false };
    enqueue(kind); emit();
  }
  function unlock(kind: "simulation" | "canyon") {
    hydrate(); enqueue(kind, true); emit();
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
    retryPersistence: () => {
      hydrate();
      for (const kind of kinds) if (["write", "lock"].includes(failures.get(kind) ?? "")) enqueue(kind, false, true);
      emit();
    },
    whenSettled: () => tail,
  };
}
