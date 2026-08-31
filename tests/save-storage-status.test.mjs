import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test, { after } from "node:test";
import { build } from "vite";

const projectRoot = resolve(import.meta.dirname, "..");
const outputDirectory = await mkdtemp(join(tmpdir(), "yautja-save-storage-"));

after(async () => {
  await rm(outputDirectory, { recursive: true, force: true });
});

await build({
  configFile: false,
  logLevel: "silent",
  publicDir: false,
  build: {
    emptyOutDir: true,
    outDir: outputDirectory,
    ssr: resolve(projectRoot, "app/game/save.ts"),
    rollupOptions: { output: { entryFileNames: "save.mjs" } },
  },
});

const { defaultSave, loadSave, writeSave, writeSaveWithStatus } = await import(
  pathToFileURL(join(outputDirectory, "save.mjs")).href
);

test("save writes report durable persistence", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  };

  const result = writeSaveWithStatus(defaultSave(), storage, "test-save");

  assert.equal(result.persisted, true);
  assert.equal(result.failure, null);
  assert.deepEqual(JSON.parse(values.get("test-save")), result.save);
});

test("a fresh hunt owner stays stable after its bootstrap write and reload", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const fresh = defaultSave();

  assert.equal(storage.getItem("fresh-hunt-owner"), null);
  const ownerWrite = writeSaveWithStatus(
    fresh,
    storage,
    "fresh-hunt-owner",
  );
  const reloaded = loadSave(storage, "fresh-hunt-owner");

  assert.equal(ownerWrite.persisted, true);
  assert.equal(reloaded.createdAt, ownerWrite.save.createdAt);
  assert.deepEqual(reloaded.missionProgress, ownerWrite.save.missionProgress);
});

test("save writes distinguish unavailable storage and quota failures", () => {
  const unavailable = writeSaveWithStatus(defaultSave(), null);
  assert.equal(unavailable.persisted, false);
  assert.equal(unavailable.failure, "storage-unavailable");

  const blockedStorage = {
    getItem() { return null; },
    setItem() {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    },
  };
  const blocked = writeSaveWithStatus(defaultSave(), blockedStorage);
  assert.equal(blocked.persisted, false);
  assert.equal(blocked.failure, "write-failed");
});

test("legacy writeSave callers keep receiving an in-memory snapshot", () => {
  const snapshot = writeSave(defaultSave(), null);

  assert.equal(snapshot.version > 0, true);
  assert.equal(typeof snapshot.updatedAt, "string");
});

test("the game shell reports autosave failures instead of promising persistence", async () => {
  const [client, css] = await Promise.all([
    readFile(resolve(projectRoot, "app/game/GameClient.tsx"), "utf8"),
    readFile(resolve(projectRoot, "app/globals.css"), "utf8"),
  ]);

  assert.match(client, /writeSaveWithStatus\(next\)/);
  assert.match(client, /setSaveFailure\(result\.failure\)/);
  assert.match(client, /className="save-warning" role="alert"/);
  assert.match(client, /Progression temporaire : sauvegarde locale indisponible/);
  assert.match(client, /previousMasterVolumeRef\.current/);
  assert.doesNotMatch(client, /masterVolume: checked \? 0\.8 : 0/);
  assert.match(css, /\.save-warning\s*\{/);
});
