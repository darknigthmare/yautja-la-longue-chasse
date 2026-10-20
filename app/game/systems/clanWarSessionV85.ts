import { CANYON_PRESET_V85, CANYON_STORAGE_KEY_V85, createCanyonV85, readCanyonV85, type CanyonSimulationV85 } from "./clanWarCanyonV85";
import { WAR_STORAGE_KEY_V85, createWarSimulationV85, readWarSimulationV85, warPlanetStorageKeyV96, type WarSimulationV85 } from "./clanWarV85";
import { warUnitV85 } from "./clanWarV85Data";
import { warPlanetV96 } from "./clanWarPlanetsV96";
import { withArchiveTransferLock } from "./archiveTransaction";
import { createWarFencePortV94, WarFenceErrorV94, type WarFencePortV94, type WarFenceRecordV94 } from "./clanWarFenceV94";

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
export type WarSessionWriteLockV85 = (operation: () => void | Promise<void>) => Promise<{ acquired: true; value: void | Promise<void> } | { acquired: false; reason: string }>;
const defaultDomains = {
  simulation: { key: WAR_STORAGE_KEY_V85, writable: "writableWar", persisted: "persistedWar", label: "Korthas" },
  canyon: { key: CANYON_STORAGE_KEY_V85, writable: "writableCanyon", persisted: "persistedCanyon", label: "Le canyon" },
  selection: { key: COMPOSITION_STORAGE_KEY_V85, writable: "writableComposition", persisted: "persistedComposition", label: "La composition" },
} as const;
const allKinds: readonly Kind[] = ["simulation", "canyon", "selection"];
function selectionFrom(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as { version?: unknown; context?: unknown; selection?: unknown };
  if (v.version !== 1 || v.context !== "free" || !v.selection || typeof v.selection !== "object" || Array.isArray(v.selection)) return null;
  if (!Object.entries(v.selection).every(([id, count]) => warUnitV85(id) && typeof count === "number" && Number.isSafeInteger(count) && count >= 0 && count <= 12)) return null;
  return { ...v.selection as Record<string, number> };
}
function decode(kind: Kind, raw: string, planetId: string) {
  const value: unknown = JSON.parse(raw);
  if (kind === "simulation") {
    const simulation = readWarSimulationV85(value);
    return simulation && (simulation.planetId ?? "korthas") === planetId ? simulation : null;
  }
  return kind === "canyon" ? readCanyonV85(value) : selectionFrom(value);
}
function serialize(kind: Kind, value: WarSessionSnapshotV85[Kind]): string {
  return JSON.stringify(kind === "selection" ? { version: 1, context: "free", selection: value } : value);
}

export interface WarSessionOptionsV96 { planetId?: string }

/** Browser sessions pin a transactional fence before comparing/writing their
 * legacy LS mirror. A stale renderer cannot overwrite another fenced session.
 * Null fences are for server/coherent injected test storage, never a browser
 * fallback after IDB denial. Older non-cooperating clients remain unsupported. */
export function createWarSessionV85(getStorage: () => WarSessionStorageV85 | null,
  lock: WarSessionWriteLockV85 = operation => withArchiveTransferLock(operation),
  fence: WarFencePortV94 | null = typeof window === "undefined" ? null : createWarFencePortV94(),
  options: WarSessionOptionsV96 = {}) {
  const planet = warPlanetV96(options.planetId);
  if (!planet) throw new RangeError("Unknown war planet");
  const planetId = planet.id;
  // The canyon and formation are shared exercises. Only Korthas owns them;
  // switching planets cannot hydrate a stale copy and later overwrite them.
  const sharedExercises = planetId === "korthas";
  const kinds: readonly Kind[] = sharedExercises ? allKinds : ["simulation"];
  const domains = { ...defaultDomains, simulation: {
    ...defaultDomains.simulation, key: warPlanetStorageKeyV96(planetId), label: planet.name,
  } };
  const initial: WarSessionSnapshotV85 = {
    simulation: createWarSimulationV85(undefined, planetId), canyon: createCanyonV85(), selection: { ...CANYON_PRESET_V85 },
    loaded: false, writableWar: true, writableCanyon: sharedExercises, writableComposition: sharedExercises, storageMessage: "",
    persistedWar: false, persistedCanyon: false, persistedComposition: false, pendingWrites: 0, canRetryPersistence: false,
  };
  let snapshot = initial, storage: WarSessionStorageV85 | null = null, tail: Promise<void> = Promise.resolve(), hydrating = false;
  const listeners = new Set<() => void>();
  const unconfirmed = new Map<Kind, string>();
  const observed = new Map<Kind, string | null>();
  const fences = new Map<Kind, WarFenceRecordV94 | null>();
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
  const conflict = (kind: Kind) => block(kind, "conflict", "archive modifiée dans une autre session. Aucune écriture ; fermez puis rouvrez le panneau pour la relire.");
  const unacknowledged = (kind: Kind) => block(kind, "write", "sauvegarde non confirmée. L’exercice continue en mémoire ; vous pouvez réessayer sans recommencer.");
  function hydrate() {
    if (snapshot.loaded || hydrating) return;
    hydrating = true;
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
        const parsed = decode(kind, raw, planetId);
        if (!parsed) throw new Error("Incompatible archive");
        snapshot = { ...snapshot, [kind]: parsed, [domains[kind].persisted]: !fence };
      } catch { block(kind, "incompatible", "archive incompatible ou illisible, conservée sans modification. L’exercice reste temporaire."); }
    }
    const finish = () => { hydrating = false; snapshot = { ...snapshot, loaded: true }; emit(); };
    if (!fence) { finish(); return; }
    tail = tail.then(async () => {
      for (const kind of kinds) {
        if (!observed.has(kind)) continue;
        try {
          const record = await fence.read(domains[kind].key);
          fences.set(kind, record);
          const raw = observed.get(kind)!;
          if (!record) {
            if (!failures.has(kind)) snapshot = { ...snapshot, [domains[kind].persisted]: raw !== null };
            continue;
          }
          if (raw !== record.before && raw !== record.after) { conflict(kind); continue; }
          const parsed = decode(kind, record.after, planetId);
          if (!parsed) throw new WarFenceErrorV94("incompatible");
          // A durable intent survives a crash between IDB and the LS mirror.
          // Recover it read-only, then offer explicit repair; never run a default
          // exercise over the newer intended state or silently discard it.
          snapshot = { ...snapshot, [kind]: parsed };
          failures.delete(kind); notices.delete(kind);
          if (raw !== record.after || record.phase !== "confirmed") {
            unconfirmed.set(kind, record.after); unacknowledged(kind);
          } else snapshot = { ...snapshot, [domains[kind].writable]: true, [domains[kind].persisted]: true };
          summarize();
        } catch {
          block(kind, "unreadable", "vérification transactionnelle indisponible ou incompatible. Archives conservées ; l’exercice reste en mémoire. Fermez puis rouvrez le panneau pour réessayer.");
        }
      }
    }).finally(finish);
  }
  function mayWrite(kind: Kind, reset: boolean, retry: boolean): boolean {
    const reason = failures.get(kind);
    return !reason || (reset && reason === "incompatible") || ((reset || retry) && (reason === "write" || reason === "lock"));
  }
  function preflight(kind: Kind, retry: boolean) {
    if (!storage || !observed.has(kind)) throw new Error("Unobserved archive");
    const current = storage.getItem(domains[kind].key);
    if (current !== observed.get(kind) && !(retry && current === unconfirmed.get(kind))) throw new WarFenceErrorV94("conflict");
    return { current, raw: serialize(kind, snapshot[kind]) };
  }
  function writeMirror(kind: Kind, current: string | null, raw: string) {
    if (!storage || storage.getItem(domains[kind].key) !== current) throw new WarFenceErrorV94("conflict");
    unconfirmed.set(kind, raw);
    if (raw !== current) {
      try { storage.setItem(domains[kind].key, raw); } catch { /* Setter may persist before throwing: verify. */ }
      if (storage.getItem(domains[kind].key) !== raw) throw new Error("Unconfirmed write");
    }
  }
  function acknowledge(kind: Kind, raw: string) {
    observed.set(kind, raw); unconfirmed.delete(kind); failures.delete(kind); notices.delete(kind);
    snapshot = { ...snapshot, [domains[kind].writable]: true, [domains[kind].persisted]: serialize(kind, snapshot[kind]) === raw }; summarize();
  }
  function handleError(kind: Kind, error: unknown) {
    if (error instanceof WarFenceErrorV94 && error.reason === "conflict") conflict(kind);
    else if (error instanceof WarFenceErrorV94 && error.reason === "incompatible") block(kind, "unreadable", "registre transactionnel incompatible, conservé sans modification. L’exercice reste en mémoire.");
    else unacknowledged(kind);
  }
  function enqueue(kind: Kind, reset = false, retry = false) {
    if (!kinds.includes(kind)) return;
    if (!mayWrite(kind, reset, retry)) return;
    snapshot = { ...snapshot, pendingWrites: snapshot.pendingWrites + 1 };
    tail = tail.then(async () => {
      if (!mayWrite(kind, reset, retry)) return;
      const result = await lock(() => {
        if (!mayWrite(kind, reset, retry)) return;
        if (fence) return (async () => {
          try {
            if (!fences.has(kind)) throw new WarFenceErrorV94("unavailable");
            const { current, raw } = preflight(kind, retry);
            const reserved = await fence.reserve(domains[kind].key, fences.get(kind)!, current, raw);
            fences.set(kind, reserved); unconfirmed.set(kind, raw);
            writeMirror(kind, current, raw);
            fences.set(kind, await fence.confirm(domains[kind].key, reserved));
            acknowledge(kind, raw);
          } catch (error) { handleError(kind, error); }
        })();
        try { const { current, raw } = preflight(kind, retry); writeMirror(kind, current, raw); acknowledge(kind, raw); }
        catch (error) { handleError(kind, error); }
      });
      if (!result.acquired) block(kind, "lock", "verrou de sauvegarde indisponible. Aucune réussite annoncée ; l’exercice reste en mémoire et peut être réessayé.");
      else await result.value;
    }).catch(() => {
      block(kind, "lock", "verrou de sauvegarde indisponible. Aucune réussite annoncée ; l’exercice reste en mémoire.");
    }).finally(() => { snapshot = { ...snapshot, pendingWrites: snapshot.pendingWrites - 1 }; emit(); });
  }
  function update<K extends Kind>(kind: K, value: Update<WarSessionSnapshotV85[K]>) {
    if (!kinds.includes(kind)) return;
    hydrate();
    if (!snapshot.loaded) { tail = tail.then(() => { update(kind, value); }); return; }
    const next = typeof value === "function" ? (value as (current: WarSessionSnapshotV85[K]) => WarSessionSnapshotV85[K])(snapshot[kind]) : value;
    if (next === snapshot[kind]) return;
    let raw: string;
    try { raw = serialize(kind, next); if (!decode(kind, raw, planetId)) throw new Error("Invalid exercise"); }
    catch { notices.set(kind, `${domains[kind].label} : état invalide refusé, l’exercice précédent est conservé.`); summarize(); emit(); return; }
    snapshot = { ...snapshot, [kind]: next, [domains[kind].persisted]: false };
    enqueue(kind); emit();
  }
  function unlock(kind: "simulation" | "canyon") {
    if (!kinds.includes(kind)) return;
    hydrate();
    if (!snapshot.loaded) { tail = tail.then(() => { unlock(kind); }); return; }
    enqueue(kind, true); emit();
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
      const retry = () => { for (const kind of kinds) if (["write", "lock"].includes(failures.get(kind) ?? "")) enqueue(kind, false, true); emit(); };
      if (!snapshot.loaded) tail = tail.then(retry); else retry();
    },
    whenSettled: async () => { let pending; do { pending = tail; await pending; } while (pending !== tail); },
  };
}
