import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({
  stdin: { contents: `
export {withArchiveTransferLock} from "./app/game/systems/archiveTransaction";
export {prepareCampaignSlotImport,importCampaignSlot,campaignSlotStorageKey} from "./app/game/systems/campaignSlots";
export {defaultSave,exportSave,SAVE_STORAGE_KEY} from "./app/game/save";
`, resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent",
});
const api = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const lockName = "yautja-full-archive-transfer";
const nativeShape = Object.create(Object.defineProperties({}, {
  name: { get: () => lockName }, mode: { get: () => "exclusive" },
}));
const tick = () => new Promise(resolve => setImmediate(resolve));

async function withManager(manager, operation, ...abortOverride) {
  const abortController = abortOverride.length ? abortOverride[0] : globalThis.AbortController;
  const navigatorBefore = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const abortBefore = Object.getOwnPropertyDescriptor(globalThis, "AbortController");
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: manager === undefined ? undefined : { locks: manager } });
  Object.defineProperty(globalThis, "AbortController", { configurable: true, value: abortController });
  try { return await operation(); }
  finally {
    if (navigatorBefore) Object.defineProperty(globalThis, "navigator", navigatorBefore); else delete globalThis.navigator;
    if (abortBefore) Object.defineProperty(globalThis, "AbortController", abortBefore); else delete globalThis.AbortController;
  }
}

function queuedManager({ ignoreAbort = false } = {}) {
  let held = true;
  const queue = [], calls = [];
  let cancelled = 0;
  function drain() {
    if (held || queue.length === 0) return;
    const entry = queue.shift(); held = true;
    setImmediate(async () => {
      try { entry.resolve(await entry.callback(nativeShape)); }
      catch (error) { entry.reject(error); }
      finally { entry.signal.removeEventListener("abort", entry.abort); held = false; drain(); }
    });
  }
  return {
    calls, queue,
    get cancelled() { return cancelled; },
    release() { held = false; drain(); },
    request(name, options, callback) {
      assert.equal(name, lockName);
      assert.deepEqual(Object.keys(options), ["signal"], "no ifAvailable, steal or unsafe extra option");
      assert(options.signal instanceof AbortSignal);
      calls.push({ name, options });
      return new Promise((resolve, reject) => {
        const entry = { signal: options.signal, callback, resolve, reject, abort: null };
        entry.abort = () => {
          cancelled++;
          if (ignoreAbort) return;
          const index = queue.indexOf(entry);
          if (index >= 0) queue.splice(index, 1);
          reject(new DOMException("Cancelled", "AbortError"));
        };
        options.signal.addEventListener("abort", entry.abort, { once: true });
        queue.push(entry); drain();
      });
    },
  };
}

test("an asynchronous native-shaped grant returns a falsy value intact and does not inspect unrelated locks", async () => {
  let queryCalls = 0, writes = 0;
  const manager = {
    request(name, options, callback) {
      assert.equal(name, lockName); assert.deepEqual(Object.keys(options), ["signal"]);
      return new Promise((resolve, reject) => setImmediate(() => {
        try { resolve(callback(nativeShape)); } catch (error) { reject(error); }
      }));
    },
    query() { queryCalls++; throw Error("a successful grant must not query locks"); },
  };
  await withManager(manager, async () => {
    const result = await api.withArchiveTransferLock(() => { writes++; return 0; });
    assert.deepEqual(result, { acquired: true, value: 0 });
    assert.equal(writes, 1); assert.equal(queryCalls, 0);
  });
});

test("a short legitimate holder releases queued archive operations in order and each runs exactly once", async () => {
  const manager = queuedManager(), executed = [];
  await withManager(manager, async () => {
    const first = api.withArchiveTransferLock(() => { executed.push("first"); return "first"; }, 1000);
    const second = api.withArchiveTransferLock(() => { executed.push("second"); return "second"; }, 1000);
    assert.deepEqual(executed, []); assert.equal(manager.queue.length, 2);
    manager.release();
    assert.deepEqual(await Promise.all([first, second]), [{ acquired: true, value: "first" }, { acquired: true, value: "second" }]);
    assert.deepEqual(executed, ["first", "second"]); assert.equal(manager.cancelled, 0);
  });
});

test("a granted synchronous write stays acknowledged when the native release promise resolves after the acquisition deadline", async () => {
  let writes = 0, aborted = false;
  const manager = {
    request(_name, options, callback) {
      options.signal.addEventListener("abort", () => { aborted = true; });
      const result = callback(nativeShape);
      return new Promise(resolve => setTimeout(() => resolve(result), 30));
    },
  };
  await withManager(manager, async () => {
    const result = await api.withArchiveTransferLock(() => ++writes, 5);
    assert.deepEqual(result, { acquired: true, value: 1 });
    assert.equal(writes, 1); assert.equal(aborted, false);
  });
});

test("a long-held native queue is aborted at the bound and cannot write after its holder releases", async () => {
  const manager = queuedManager(); let writes = 0;
  await withManager(manager, async () => {
    const result = await api.withArchiveTransferLock(() => ++writes, 15);
    assert.equal(result.acquired, false); assert.match(result.reason, /expiré/);
    assert.equal(manager.calls[0].options.signal.aborted, true);
    assert.equal(manager.cancelled, 1); assert.equal(manager.queue.length, 0);
    manager.release(); await tick(); assert.equal(writes, 0);
  });
});

test("even a browser ignoring abort cannot execute a late callback after timeout", async () => {
  const manager = queuedManager({ ignoreAbort: true }); let writes = 0;
  await withManager(manager, async () => {
    const result = await api.withArchiveTransferLock(() => ++writes, 15);
    assert.equal(result.acquired, false); assert.match(result.reason, /expiré/);
    assert.equal(manager.queue.length, 1); assert.equal(manager.calls[0].options.signal.aborted, true);
    manager.release(); await tick(); await tick(); assert.equal(writes, 0);
    assert.equal(manager.queue.length, 0);
  });
});

test("an unexpected null grant diagnoses only the held archive name without disclosing client IDs or other names", async () => {
  let writes = 0, queries = 0;
  const manager = {
    request: async (_name, _options, callback) => callback(null),
    query: async () => { queries++; return { held: [{ name: lockName, clientId: "private-owner", mode: "shared" }, { name: "private-other-name", clientId: "private-other-owner" }], pending: [] }; },
  };
  await withManager(manager, async () => {
    const result = await api.withArchiveTransferLock(() => ++writes);
    assert.equal(result.acquired, false); assert.match(result.reason, /Au moment du diagnostic.*utilise les archives/);
    assert.match(result.reason, /Attendez la fin/); assert.doesNotMatch(result.reason, /private-|yautja-full/);
    assert.equal(writes, 0); assert.equal(queries, 1);
  });
});

test("a same-name pending request is qualified as a later snapshot rather than an identified active holder", async () => {
  let writes = 0;
  await withManager({ request: async (_name, _options, callback) => callback(null), query: async () => ({ held: [], pending: [{ name: lockName, clientId: "private-pending-owner" }] }) }, async () => {
    const result = await api.withArchiveTransferLock(() => ++writes);
    assert.equal(result.acquired, false); assert.match(result.reason, /Au moment du diagnostic.*en attente/);
    assert.doesNotMatch(result.reason, /private-|utilise les archives/); assert.equal(writes, 0);
  });
});

test("unrelated held and pending names never imply archive contention or reveal their identities", async () => {
  let writes = 0;
  await withManager({ request: async (_name, _options, callback) => callback(null), query: async () => ({ held: [{ name: "secret-lock-a", clientId: "secret-client-a" }], pending: [{ name: "secret-lock-b", clientId: "secret-client-b" }] }) }, async () => {
    const result = await api.withArchiveTransferLock(() => ++writes);
    assert.equal(result.acquired, false); assert.match(result.reason, /Aucun verrou d’archives actif ou en attente.*au moment du diagnostic/);
    assert.match(result.reason, /Rechargez cet onglet/); assert.doesNotMatch(result.reason, /secret-/); assert.equal(writes, 0);
  });
});

test("missing or rejected query stays conservative and never attempts another acquisition or operation", async () => {
  for (const query of [undefined, async () => { throw new DOMException("private-context", "SecurityError"); }]) {
    let writes = 0, requests = 0;
    await withManager({ request: async (_name, _options, callback) => { requests++; return callback(null); }, query }, async () => {
      const result = await api.withArchiveTransferLock(() => ++writes);
      assert.equal(result.acquired, false); assert.match(result.reason, /état n’a pas pu être vérifié/);
      assert.doesNotMatch(result.reason, /private-context|SecurityError/); assert.equal(writes, 0); assert.equal(requests, 1);
    });
  }
});

test("a hung null diagnostic shares the acquisition timeout and its late query cannot authorize writes", async () => {
  let resolveQuery, signal, writes = 0;
  await withManager({ request: (_name, options, callback) => { signal = options.signal; return Promise.resolve(callback(null)); }, query: () => new Promise(resolve => { resolveQuery = resolve; }) }, async () => {
    const result = await api.withArchiveTransferLock(() => ++writes, 15);
    assert.equal(result.acquired, false); assert.match(result.reason, /expiré/); assert.equal(signal.aborted, true);
    resolveQuery({ held: [], pending: [] }); await tick(); assert.equal(writes, 0);
  });
});

test("missing API or cancellation support, synchronous throws and rejected requests all refuse without writes", async () => {
  let writes = 0, requests = 0;
  const request = () => { requests++; throw new DOMException("private-error", "SecurityError"); };
  for (const manager of [undefined, {}, { request }, { request: () => { requests++; return Promise.reject(new DOMException("private-error", "SecurityError")); } }]) {
    await withManager(manager, async () => {
      const result = await api.withArchiveTransferLock(() => ++writes);
      assert.equal(result.acquired, false); assert.doesNotMatch(result.reason, /private-error|SecurityError/);
    });
  }
  const before = requests;
  await withManager({ request }, async () => {
    const result = await api.withArchiveTransferLock(() => ++writes);
    assert.equal(result.acquired, false); assert.match(result.reason, /annuler une attente/);
  }, undefined);
  assert.equal(writes, 0); assert.equal(requests, before);
});

test("a queued real campaign import revalidates its pinned workspace owner before writing any archive", async () => {
  const values = new Map(), writes = [];
  const storage = { getItem: key => values.get(key) ?? null, setItem(key, value) { writes.push(key); values.set(key, value); }, removeItem(key) { writes.push(key); values.delete(key); } };
  const source = api.defaultSave("2026-10-11T10:00:00.000Z");
  const prepared = api.prepareCampaignSlotImport(1, api.exportSave(source), storage);
  assert.equal(prepared.ok, true, prepared.message);
  const manager = queuedManager();
  await withManager(manager, async () => {
    const pending = api.importCampaignSlot(prepared.preview, storage);
    assert.equal(manager.queue.length, 1); assert.deepEqual(writes, []);
    const foreign = JSON.stringify(api.defaultSave("2026-10-11T11:00:00.000Z"));
    values.set(api.SAVE_STORAGE_KEY, foreign);
    manager.release(); const result = await pending;
    assert.equal(result.ok, false); assert.equal(result.failure, "save-conflict");
    assert.deepEqual(writes, []); assert.equal(values.get(api.SAVE_STORAGE_KEY), foreign);
    assert.equal(values.has(api.campaignSlotStorageKey(1)), false);
  });
});
