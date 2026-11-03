import { warPlanetIdForStorageKeyV96 } from "./clanWarV85";

/** A transactional write-ahead fence for free planetary fronts and shared exercises.
 * localStorage stays the readable legacy mirror. No campaign/slot is migrated.
 * Web Locks alone do not guarantee visibility of another renderer's LS cache.
 * An IDB compare-and-swap commits before a mirror write can be attempted. */
export const WAR_FENCE_DATABASE_V94 = "yautja.clan-war.v94.fences";
export const WAR_FENCE_STORE_V94 = "intents";
const allowedKeys = new Set([
  "yautja.clan-war.v85.free.v1",
  "yautja.clan-war.v85.canyon.free.v1",
  "yautja.clan-war.v85.composition.free.v1",
]);
export interface WarFenceRecordV94 {
  version: 1; token: string; before: string | null; after: string; phase: "intent" | "confirmed";
}
export interface WarFencePortV94 {
  read: (key: string) => Promise<WarFenceRecordV94 | null>;
  reserve: (key: string, expected: WarFenceRecordV94 | null, before: string | null, after: string) => Promise<WarFenceRecordV94>;
  confirm: (key: string, expected: WarFenceRecordV94) => Promise<WarFenceRecordV94>;
}
export class WarFenceErrorV94 extends Error {
  constructor(readonly reason: "conflict" | "unavailable" | "incompatible") { super(reason); }
}
export function validWarFenceV94(value: unknown): value is WarFenceRecordV94 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as WarFenceRecordV94;
  return v.version === 1 && typeof v.token === "string" && v.token.length > 0 && v.token.length <= 128 &&
    (v.before === null || typeof v.before === "string") && typeof v.after === "string" &&
    v.after.length <= 2_000_000 && (v.before?.length ?? 0) <= 2_000_000 &&
    (v.phase === "intent" || v.phase === "confirmed");
}
const same = (a: WarFenceRecordV94 | null, b: WarFenceRecordV94 | null) =>
  a === null || b === null ? a === b : a.version === b.version && a.token === b.token &&
    a.before === b.before && a.after === b.after && a.phase === b.phase;

/** Explicit injection is for tests; a browser missing IDB fails closed. Each
 * request uses a short-lived connection: no blocked-upgrade connection leak. */
export function createWarFencePortV94(factory?: IDBFactory, timeoutMs = 2500): WarFencePortV94 {
  const deadline = Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.min(timeoutMs, 10_000) : 2500;
  function execute<T>(key: string, mode: IDBTransactionMode,
    operation: (current: WarFenceRecordV94 | null, store: IDBObjectStore) => T): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!allowedKeys.has(key) && !warPlanetIdForStorageKeyV96(key)) { reject(new WarFenceErrorV94("incompatible")); return; }
      let done = false, db: IDBDatabase | undefined, tx: IDBTransaction | undefined, result: T;
      const fail = (error: unknown = new WarFenceErrorV94("unavailable")) => {
        if (done) return;
        done = true; clearTimeout(timer);
        try { tx?.abort(); } catch { /* Already completed or aborted. Never authorize a mirror write. */ }
        db?.close(); reject(error);
      };
      const timer = setTimeout(() => fail(), deadline);
      try {
        const provider = factory ?? globalThis.indexedDB;
        if (!provider || typeof provider.open !== "function") { fail(); return; }
        const opening = provider.open(WAR_FENCE_DATABASE_V94, 1);
        opening.onblocked = () => fail();
        opening.onerror = () => fail(new WarFenceErrorV94(opening.error?.name === "VersionError" ? "incompatible" : "unavailable"));
        opening.onupgradeneeded = () => {
          if (done) { opening.transaction?.abort(); return; }
          opening.result.createObjectStore(WAR_FENCE_STORE_V94);
        };
        opening.onsuccess = () => {
          db = opening.result;
          if (done) { db.close(); return; }
          db.onversionchange = () => fail();
          try {
            if (!db.objectStoreNames.contains(WAR_FENCE_STORE_V94)) throw new WarFenceErrorV94("incompatible");
            tx = db.transaction(WAR_FENCE_STORE_V94, mode);
            tx.onabort = () => fail();
            tx.onerror = () => fail();
            tx.oncomplete = () => {
              if (done) return;
              done = true; clearTimeout(timer); db?.close(); resolve(result);
            };
            const store = tx.objectStore(WAR_FENCE_STORE_V94), request = store.get(key);
            request.onerror = () => fail();
            request.onsuccess = () => {
              if (done) return;
              try {
                const current: unknown = request.result;
                if (current !== undefined && !validWarFenceV94(current)) throw new WarFenceErrorV94("incompatible");
                result = operation(current === undefined ? null : current as WarFenceRecordV94, store);
              } catch (error) { fail(error); }
            };
          } catch (error) { fail(error); }
        };
      } catch { fail(); }
    });
  }
  return {
    read: key => execute(key, "readonly", current => current),
    reserve: (key, expected, before, after) => execute(key, "readwrite", (current, store) => {
      if (!same(current, expected)) throw new WarFenceErrorV94("conflict");
      const next: WarFenceRecordV94 = { version: 1, token: globalThis.crypto.randomUUID(), before, after, phase: "intent" };
      if (!validWarFenceV94(next)) throw new WarFenceErrorV94("incompatible");
      store.put(next, key); return next;
    }),
    confirm: (key, expected) => execute(key, "readwrite", (current, store) => {
      if (!same(current, expected)) throw new WarFenceErrorV94("conflict");
      const next: WarFenceRecordV94 = { ...expected, phase: "confirmed" };
      store.put(next, key); return next;
    }),
  };
}
