import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = await mkdtemp(join(tmpdir(), "yautja-pit-replay-storage-"));
const replayOutputDirectory = join(outputDirectory, "replay");
const storageOutputDirectory = join(outputDirectory, "storage");

await build({
  configFile: false,
  publicDir: false,
  logLevel: "silent",
  build: {
    emptyOutDir: true,
    outDir: replayOutputDirectory,
    ssr: resolve(projectRoot, "app/game/systems/pitReplay.ts"),
    rollupOptions: {
      output: { entryFileNames: "pit-replay.mjs" },
    },
  },
});

await build({
  configFile: false,
  publicDir: false,
  logLevel: "silent",
  build: {
    emptyOutDir: true,
    outDir: storageOutputDirectory,
    ssr: resolve(projectRoot, "app/game/systems/pitReplayStorage.ts"),
    rollupOptions: {
      output: { entryFileNames: "pit-replay-storage.mjs" },
    },
  },
});

const replayApi = await import(
  pathToFileURL(join(replayOutputDirectory, "pit-replay.mjs")).href
);
const storageApi = await import(
  pathToFileURL(join(storageOutputDirectory, "pit-replay-storage.mjs")).href
);

after(async () => {
  await rm(outputDirectory, { force: true, recursive: true });
});

const OWNER = "2026-09-04T12:00:00.000Z";
const OTHER_OWNER = "2026-09-05T12:00:00.000Z";
const UPDATED = "2026-09-04T12:01:00.000Z";

function memoryStorage(entries = []) {
  const values = new Map(entries);
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
    values,
  };
}

function sampleReplay(seed = 7) {
  const recorder = replayApi.createPitReplayRecorder({ seed });
  for (let tick = 0; tick < 36; tick += 1) {
    recorder.append([
      tick < 18 ? { right: true } : tick === 24 ? { attack: "light" } : {},
      tick < 18 ? { left: true } : {},
    ]);
  }
  return recorder.finish();
}

function archiveWithReplay(seed = 7) {
  return storageApi.withLatestPitReplay(
    storageApi.createPitReplayArchive(OWNER),
    sampleReplay(seed),
    UPDATED,
  );
}

test("a campaign-owned latest replay round-trips through an exact readback", () => {
  const storage = memoryStorage();
  const archive = archiveWithReplay();
  const key = storageApi.pitReplayStorageKey(OWNER);
  const written = storageApi.writePitReplayArchive(archive, {
    ownerSaveCreatedAt: OWNER,
    storage,
  });
  assert.equal(written.persisted, true);
  assert.equal(written.failure, null);
  assert.equal(storage.values.has(key), true);

  const loaded = storageApi.loadPitReplayArchive({
    ownerSaveCreatedAt: OWNER,
    storage,
  });
  assert.equal(loaded.loaded, true);
  assert.equal(loaded.failure, null);
  assert.deepEqual(loaded.archive, archive);
  assert.notEqual(loaded.archive, archive);
  assert.deepEqual(
    replayApi.normalizePitReplay(loaded.archive.latestReplay),
    archive.latestReplay,
  );
});

test("owner namespaces cannot be read, written or cleared through another key", () => {
  const storage = memoryStorage();
  const archive = archiveWithReplay();
  const ownerKey = storageApi.pitReplayStorageKey(OWNER);
  const otherKey = storageApi.pitReplayStorageKey(OTHER_OWNER);
  assert.notEqual(ownerKey, otherKey);

  assert.equal(
    storageApi.writePitReplayArchive(archive, {
      ownerSaveCreatedAt: OTHER_OWNER,
      storage,
    }).failure,
    "owner-conflict",
  );
  assert.equal(
    storageApi.loadPitReplayArchive({
      ownerSaveCreatedAt: OWNER,
      key: otherKey,
      storage,
    }).failure,
    "owner-conflict",
  );

  const foreignLegacyArchive = JSON.stringify({
    ...archive,
    ownerSaveCreatedAt: OTHER_OWNER,
    latestReplay: {
      ...archive.latestReplay,
      engineVersion: archive.latestReplay.engineVersion - 1,
    },
  });
  storage.setItem(ownerKey, foreignLegacyArchive);
  assert.equal(storageApi.loadPitReplayArchive({
    ownerSaveCreatedAt: OWNER,
    storage,
  }).failure, "owner-conflict");
  assert.equal(
    storageApi.writePitReplayArchive(archive, {
      ownerSaveCreatedAt: OWNER,
      storage,
    }).failure,
    "owner-conflict",
  );
  assert.equal(storage.getItem(ownerKey), foreignLegacyArchive);

  const cleared = storageApi.clearPitReplayArchive({
    ownerSaveCreatedAt: OWNER,
    storage,
  });
  assert.equal(cleared.cleared, false);
  assert.equal(cleared.failure, "owner-conflict");
  assert.notEqual(storage.getItem(ownerKey), null);
});

test("writes reject stale revisions and accept a monotone replacement", () => {
  const storage = memoryStorage();
  const first = archiveWithReplay(1);
  assert.equal(storageApi.writePitReplayArchive(first, {
    ownerSaveCreatedAt: OWNER,
    storage,
  }).persisted, true);

  const stale = storageApi.writePitReplayArchive(first, {
    ownerSaveCreatedAt: OWNER,
    storage,
  });
  assert.equal(stale.persisted, false);
  assert.equal(stale.failure, "stale-revision");

  const second = storageApi.withLatestPitReplay(first, sampleReplay(2), UPDATED);
  assert.equal(second.revision, first.revision + 1);
  assert.equal(storageApi.writePitReplayArchive(second, {
    ownerSaveCreatedAt: OWNER,
    storage,
  }).persisted, true);
  assert.deepEqual(storageApi.loadPitReplayArchive({
    ownerSaveCreatedAt: OWNER,
    storage,
  }).archive, second);
});

test("corrupt, oversized and future archives have distinct safe failures", () => {
  const key = storageApi.pitReplayStorageKey(OWNER);
  const storage = memoryStorage([[key, "{broken"]]);
  assert.equal(storageApi.loadPitReplayArchive({
    ownerSaveCreatedAt: OWNER,
    storage,
  }).failure, "corrupt-save");

  storage.setItem(key, JSON.stringify({
    ...storageApi.createPitReplayArchive(OWNER),
    version: storageApi.PIT_REPLAY_STORAGE_VERSION + 1,
  }));
  assert.equal(storageApi.loadPitReplayArchive({
    ownerSaveCreatedAt: OWNER,
    storage,
  }).failure, "future-version");

  const replay = sampleReplay();
  storage.setItem(key, JSON.stringify({
    ...archiveWithReplay(),
    latestReplay: { ...replay, version: replayApi.PIT_REPLAY_VERSION + 1 },
  }));
  assert.equal(storageApi.loadPitReplayArchive({
    ownerSaveCreatedAt: OWNER,
    storage,
  }).failure, "future-version");

  storage.setItem(key, JSON.stringify({
    ...archiveWithReplay(),
    latestReplay: { ...replay, engineVersion: replay.engineVersion + 1 },
  }));
  assert.equal(storageApi.loadPitReplayArchive({
    ownerSaveCreatedAt: OWNER,
    storage,
  }).failure, "future-version");

  const incompatibleArchive = JSON.stringify({
    ...archiveWithReplay(),
    latestReplay: { ...replay, engineVersion: 3 },
  });
  storage.setItem(key, incompatibleArchive);
  assert.equal(storageApi.loadPitReplayArchive({
    ownerSaveCreatedAt: OWNER,
    storage,
  }).failure, "incompatible-engine");
  assert.equal(
    storageApi.writePitReplayArchive(archiveWithReplay(), {
      ownerSaveCreatedAt: OWNER,
      storage,
    }).failure,
    "incompatible-engine",
  );
  assert.equal(storage.getItem(key), incompatibleArchive);

  storage.setItem(key, JSON.stringify({
    ...archiveWithReplay(),
    latestReplay: { ...replay, engineVersion: "next" },
  }));
  assert.equal(storageApi.loadPitReplayArchive({
    ownerSaveCreatedAt: OWNER,
    storage,
  }).failure, "corrupt-save");
  storage.setItem(
    key,
    "x".repeat(storageApi.PIT_REPLAY_STORAGE_MAX_SERIALIZED_BYTES + 1),
  );
  assert.equal(storageApi.loadPitReplayArchive({
    ownerSaveCreatedAt: OWNER,
    storage,
  }).failure, "corrupt-save");
});

test("storage, quota and silent-drop failures are never reported as persisted", () => {
  const archive = archiveWithReplay();
  assert.equal(storageApi.loadPitReplayArchive({
    ownerSaveCreatedAt: OWNER,
    storage: null,
  }).failure, "storage-unavailable");
  assert.equal(storageApi.writePitReplayArchive(archive, {
    ownerSaveCreatedAt: OWNER,
    storage: null,
  }).failure, "storage-unavailable");

  const unreadable = {
    getItem(key) { if (key === "yautja-long-hunt.archive-transfer") return null; throw new Error("denied"); },
    setItem() {},
  };
  assert.equal(storageApi.loadPitReplayArchive({
    ownerSaveCreatedAt: OWNER,
    storage: unreadable,
  }).failure, "read-failed");
  assert.equal(storageApi.writePitReplayArchive(archive, {
    ownerSaveCreatedAt: OWNER,
    storage: unreadable,
  }).failure, "read-failed");

  const quota = {
    getItem() { return null; },
    setItem() {
      const error = new Error("full");
      error.name = "QuotaExceededError";
      throw error;
    },
  };
  assert.equal(storageApi.writePitReplayArchive(archive, {
    ownerSaveCreatedAt: OWNER,
    storage: quota,
  }).failure, "quota-exceeded");

  const silentDrop = {
    getItem() { return null; },
    setItem() {},
  };
  assert.equal(storageApi.writePitReplayArchive(archive, {
    ownerSaveCreatedAt: OWNER,
    storage: silentDrop,
  }).failure, "write-denied");
  const deleteDenied = {
    getItem() { return "corrupt"; },
    setItem() {},
    removeItem() { throw new Error("denied"); },
  };
  assert.equal(storageApi.clearPitReplayArchive({
    ownerSaveCreatedAt: OWNER,
    storage: deleteDenied,
  }).failure, "write-denied");
});

test("clear removes only the confirmed owner namespace, including corrupt data", () => {
  const key = storageApi.pitReplayStorageKey(OWNER);
  const otherKey = storageApi.pitReplayStorageKey(OTHER_OWNER);
  const storage = memoryStorage([
    [key, "corrupt"],
    [otherKey, "keep-me"],
  ]);
  const cleared = storageApi.clearPitReplayArchive({
    ownerSaveCreatedAt: OWNER,
    storage,
  });
  assert.deepEqual(cleared, { cleared: true, failure: null });
  assert.equal(storage.getItem(key), null);
  assert.equal(storage.getItem(otherKey), "keep-me");

  assert.deepEqual(storageApi.clearPitReplayArchive({
    ownerSaveCreatedAt: OWNER,
    storage,
  }), { cleared: true, failure: null });
});


test("published V4 replay bytes remain owned, readable and exportable without a V5 rewrite", async () => {
  const { readFile } = await import("node:fs/promises");
  const historical = JSON.parse(await readFile(new URL("./fixtures/pit-replay-v4-throw.json", import.meta.url), "utf8"));
  const archive = storageApi.withLatestPitReplay(storageApi.createPitReplayArchive(OWNER), historical.replay, UPDATED);
  const storage = memoryStorage();
  const written = storageApi.writePitReplayArchive(archive, { ownerSaveCreatedAt: OWNER, storage });
  assert.equal(written.persisted, true);
  const before = [...storage.values.entries()];
  const loaded = storageApi.loadPitReplayArchive({ ownerSaveCreatedAt: OWNER, storage });
  assert.equal(loaded.loaded, true);
  assert.equal(loaded.archive.latestReplay.engineVersion, 4);
  assert.equal(replayApi.serializePitReplay(loaded.archive.latestReplay), JSON.stringify(historical.replay));
  assert.deepEqual([...storage.values.entries()], before);
});
