import { TROPHY_WORKSHOP_RECOVERY_MAX_BYTES_V94 } from "./trophyWorkshopCommitV94";

/** Recovery copies only. This database never writes the campaign or ship
 * sidecar. One pending copy per campaign, no append-only history. */
export const TROPHY_WORKSHOP_RECOVERY_DB_V94 = "yautja.trophy-workshop.v94.recovery";
export const TROPHY_WORKSHOP_RECOVERY_STORE_V94 = "pending";
export interface TrophyWorkshopRecoveryPortV94 {
  read(owner: string): Promise<string | null>;
  replace(owner: string, expected: string | null, next: string | null): Promise<void>;
}
export class TrophyWorkshopRecoveryErrorV94 extends Error {
  constructor(readonly reason: "conflict" | "unavailable" | "incompatible") { super(reason); }
}
const validOwner = (owner: string) => typeof owner === "string" && owner.length <= 128 && Number.isFinite(Date.parse(owner));
const validBytes = (value: unknown): value is string | null => value === null ||
  (typeof value === "string" && value.length <= TROPHY_WORKSHOP_RECOVERY_MAX_BYTES_V94 &&
    new TextEncoder().encode(value).byteLength <= TROPHY_WORKSHOP_RECOVERY_MAX_BYTES_V94);

/** Only transaction completion acknowledges a backup or its cleanup. A stale
 * tab cannot overwrite/delete a different copy; no localStorage fallback. */
export function createTrophyWorkshopRecoveryPortV94(factory?: IDBFactory, timeoutMs = 2500): TrophyWorkshopRecoveryPortV94 {
  const deadline = Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.min(timeoutMs, 10_000) : 2500;
  function execute<T>(owner: string, mode: IDBTransactionMode,
    operation: (raw: string | null, store: IDBObjectStore) => T): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!validOwner(owner)) { reject(new TrophyWorkshopRecoveryErrorV94("incompatible")); return; }
      let finished = false, db: IDBDatabase | undefined, transaction: IDBTransaction | undefined, result: T;
      const fail = (error: unknown = new TrophyWorkshopRecoveryErrorV94("unavailable")) => {
        if (finished) return;
        finished = true; clearTimeout(timer);
        try { transaction?.abort(); } catch { /* A completed transaction cannot be undone; never claim its absence. */ }
        db?.close(); reject(error);
      };
      const timer = setTimeout(() => fail(), deadline);
      try {
        const provider = factory ?? globalThis.indexedDB;
        if (!provider || typeof provider.open !== "function") { fail(); return; }
        const opening = provider.open(TROPHY_WORKSHOP_RECOVERY_DB_V94, 1);
        opening.onblocked = () => fail();
        opening.onerror = () => fail(new TrophyWorkshopRecoveryErrorV94(opening.error?.name === "VersionError" ? "incompatible" : "unavailable"));
        opening.onupgradeneeded = () => {
          if (finished) { opening.transaction?.abort(); return; }
          opening.result.createObjectStore(TROPHY_WORKSHOP_RECOVERY_STORE_V94);
        };
        opening.onsuccess = () => {
          db = opening.result;
          if (finished) { db.close(); return; }
          db.onversionchange = () => fail();
          try {
            if (!db.objectStoreNames.contains(TROPHY_WORKSHOP_RECOVERY_STORE_V94)) throw new TrophyWorkshopRecoveryErrorV94("incompatible");
            transaction = db.transaction(TROPHY_WORKSHOP_RECOVERY_STORE_V94, mode, { durability: "strict" });
            transaction.onerror = () => fail();
            transaction.onabort = () => fail();
            transaction.oncomplete = () => {
              if (finished) return;
              finished = true; clearTimeout(timer); db?.close(); resolve(result);
            };
            const store = transaction.objectStore(TROPHY_WORKSHOP_RECOVERY_STORE_V94), request = store.get(owner);
            request.onerror = () => fail();
            request.onsuccess = () => {
              if (finished) return;
              try {
                const raw: unknown = request.result === undefined ? null : request.result;
                if (!validBytes(raw)) throw new TrophyWorkshopRecoveryErrorV94("incompatible");
                result = operation(raw, store);
              } catch (error) { fail(error); }
            };
          } catch (error) { fail(error); }
        };
      } catch { fail(); }
    });
  }
  return {
    read: owner => execute(owner, "readonly", raw => raw),
    replace(owner, expected, next) {
      if (!validBytes(expected) || !validBytes(next)) return Promise.reject(new TrophyWorkshopRecoveryErrorV94("incompatible"));
      return execute(owner, "readwrite", (raw, store) => {
        if (raw !== expected) throw new TrophyWorkshopRecoveryErrorV94("conflict");
        if (next === raw) return;
        if (next === null) store.delete(owner); else store.put(next, owner);
      });
    },
  };
}

/** Per-mounted-campaign queue. Tasks already requested may finish after that
 * console is removed, but never call its UI or authorize a campaign write. */
export function createTrophyWorkshopRecoveryQueueV94(owner: string, port: TrophyWorkshopRecoveryPortV94) {
  let observed: string | null | undefined;
  let tail: Promise<unknown> = Promise.resolve();
  const enqueue = <T,>(operation: () => Promise<T>): Promise<T> => {
    const task = tail.then(operation); tail = task.catch(() => undefined); return task;
  };
  return {
    read: () => enqueue(async () => {
      const raw = await port.read(owner); observed = raw; return raw;
    }),
    replace: (next: string | null) => enqueue(async () => {
      if (observed === undefined) throw new TrophyWorkshopRecoveryErrorV94("unavailable");
      const before = observed;
      try { await port.replace(owner, before, next); observed = next; }
      catch (error) {
        // A transaction may have committed just before an interrupted response.
        // Read once: acknowledge only our exact requested bytes, not any other copy.
        if (await port.read(owner) === next) { observed = next; return; }
        throw error;
      }
    }),
    whenSettled: () => tail,
  };
}
