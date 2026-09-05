import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../app/game/GameClient.tsx", import.meta.url),
  "utf8",
);
const ast = ts.createSourceFile(
  "GameClient.tsx",
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

function findVariable(name) {
  let match = null;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) {
      match = node;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(match, `${name} should exist`);
  return match;
}

function findFunction(name) {
  let match = null;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
      match = node;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(match, `${name} should exist`);
  return match;
}

const hydrationDeclaration = findFunction("hydratePitReplayForOwner");
const compiledHydration = ts.transpileModule(
  hydrationDeclaration.getText(ast),
  {
    compilerOptions: {
      module: ts.ModuleKind.None,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;

function hydrateWith(loadResult, clearResult = { cleared: true, failure: null }) {
  let clearCalls = 0;
  const factory = new Function(
    "loadPitReplayArchive",
    "clearPitReplayArchive",
    `${compiledHydration}\nreturn hydratePitReplayForOwner;`,
  );
  const hydrate = factory(
    () => loadResult,
    () => {
      clearCalls += 1;
      return clearResult;
    },
  );
  return { result: hydrate(OWNER), clearCalls };
}

const recordDeclaration = findVariable("recordPitMatch");
assert.ok(ts.isCallExpression(recordDeclaration.initializer));
const recordCallback = recordDeclaration.initializer.arguments[0];
assert.ok(ts.isArrowFunction(recordCallback));
const lockDeclaration = findFunction("withPitWriteLock");
const compiledWriteLock = ts.transpileModule(
  lockDeclaration.getText(ast),
  {
    compilerOptions: {
      module: ts.ModuleKind.None,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;

const compiledRecordCallback = ts.transpileModule(
  `const callback = ${recordCallback.getText(ast)};`,
  {
    compilerOptions: {
      module: ts.ModuleKind.None,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;

const OWNER = "2026-09-04T12:00:00.000Z";

function createHarness(overrides = {}) {
  const calls = {
    replayMemory: [],
    replayLoads: 0,
    replayWrites: 0,
    replayClears: 0,
    replayCreates: 0,
    statWrites: 0,
    cosmeticUpdates: [],
    toasts: [],
  };
  const saveRef = { current: { createdAt: OWNER } };
  const environment = {
    saveRef,
    navigator: {},
    window: undefined,
    pitSaveStorageKey: (owner) => `pit:${owner}`,
    normalizePitReplay: (value) => value,
    setLastPitReplay: (value) => calls.replayMemory.push(value),
    loadPitSave: () => ({ save: null, loaded: false, failure: null }),
    createPitSave: (ownerSaveCreatedAt, createdAt) => ({
      ownerSaveCreatedAt,
      createdAt,
      unlockedCosmeticIds: [],
    }),
    applyPitResult: (save) => ({
      applied: true,
      save: { ...save, revision: 1 },
    }),
    writePitSave: (save) => {
      calls.statWrites += 1;
      return { persisted: true, failure: null, save };
    },
    loadPitReplayArchive: () => {
      calls.replayLoads += 1;
      return { archive: null, loaded: false, failure: null };
    },
    createPitReplayArchive: (ownerSaveCreatedAt, createdAt) => {
      calls.replayCreates += 1;
      return {
        ownerSaveCreatedAt,
        createdAt,
        revision: 0,
      };
    },
    clearPitReplayArchive: () => {
      calls.replayClears += 1;
      return { cleared: true, failure: null };
    },
    withLatestPitReplay: (archive, replay, updatedAt) => ({
      ...archive,
      latestReplay: replay,
      updatedAt,
      revision: archive.revision + 1,
    }),
    writePitReplayArchive: () => {
      calls.replayWrites += 1;
      return { persisted: true, failure: null };
    },
    setToast: (message) => calls.toasts.push(message),
    setPitUnlockedCosmeticIds: (ids) => calls.cosmeticUpdates.push([...ids]),
    createHuntRunId: () => "test-lock",
    ...overrides,
  };
  const lockNames = Object.keys(environment);
  const lockFactory = new Function(
    ...lockNames,
    compiledWriteLock + "\nreturn withPitWriteLock;",
  );
  environment.withPitWriteLock = lockFactory(
    ...lockNames.map((name) => environment[name]),
  );
  const names = Object.keys(environment);
  const factory = new Function(
    ...names,
    `${compiledRecordCallback}\nreturn callback;`,
  );
  return {
    callback: factory(...names.map((name) => environment[name])),
    calls,
    saveRef,
  };
}

function completedResult(replay = { version: 1, metadata: { checksum: "feedbeef" } }) {
  return {
    resultId: "pit-test-result",
    mode: "cpu",
    winnerId: "jungle-hunter",
    leftId: "jungle-hunter",
    rightId: "berserker",
    arenaId: "the-pit",
    round: 2,
    leftRoundsWon: 2,
    rightRoundsWon: 0,
    roundsDrawn: 0,
    replay,
  };
}

test("a completed PIT match retains its replay before locked storage and retries stale archives", () => {
  let replayWrite = 0;
  const harness = createHarness({
    writePitReplayArchive: () => {
      harness.calls.replayWrites += 1;
      replayWrite += 1;
      return replayWrite === 1
        ? { persisted: false, failure: "stale-revision" }
        : { persisted: true, failure: null };
    },
  });
  const result = completedResult();
  harness.callback(result);
  assert.deepEqual(harness.calls.replayMemory, [result.replay]);
  assert.equal(harness.calls.statWrites, 1);
  assert.equal(harness.calls.replayLoads, 2);
  assert.equal(harness.calls.replayWrites, 2);
});

test("a replay storage failure keeps the normalized replay in session memory", () => {
  const harness = createHarness({
    loadPitReplayArchive: () => {
      harness.calls.replayLoads += 1;
      return { archive: null, loaded: false, failure: "storage-unavailable" };
    },
  });
  const result = completedResult();
  harness.callback(result);
  assert.deepEqual(harness.calls.replayMemory, [result.replay]);
  assert.equal(harness.calls.replayWrites, 0);
  assert.ok(harness.calls.toasts.some((message) => message.includes("conservé en mémoire")));
});

test("a delayed browser lock cannot resurrect an archive after its campaign owner changes", async () => {
  let lockedOperation = null;
  const harness = createHarness({
    window: {},
    navigator: {
      locks: {
        request(_key, operation) {
          lockedOperation = operation;
          return Promise.resolve();
        },
      },
    },
  });
  let promiseSettled = false;
  const acknowledgementPromise = harness.callback(completedResult());
  acknowledgementPromise.then(() => {
    promiseSettled = true;
  });
  await Promise.resolve();
  assert.equal(typeof lockedOperation, "function");
  assert.equal(promiseSettled, false);
  harness.saveRef.current = { createdAt: "2026-09-05T12:00:00.000Z" };
  await lockedOperation();
  const acknowledgement = await acknowledgementPromise;
  assert.deepEqual(acknowledgement, {
    persisted: false,
    message: "La campagne active a changé : résultat THE PIT non enregistré.",
  });
  assert.equal(harness.calls.statWrites, 0);
  assert.equal(harness.calls.replayWrites, 0);
});

test("a failed Arcade write returns a retryable acknowledgement and the same result can succeed", async () => {
  let writeAttempt = 0;
  const appliedIds = [];
  const harness = createHarness({
    applyPitResult: (save, result) => {
      appliedIds.push(result.id);
      return {
        applied: true,
        save: {
          ...save,
          revision: (save.revision ?? 0) + 1,
          unlockedCosmeticIds: result.cosmeticRewardIds ?? [],
        },
      };
    },
    writePitSave: (save) => {
      harness.calls.statWrites += 1;
      writeAttempt += 1;
      return writeAttempt === 1
        ? { persisted: false, failure: "write-failed", save: null }
        : { persisted: true, failure: null, save };
    },
  });
  const result = {
    ...completedResult(null),
    mode: "arcade",
    arcadeEncounterIndex: 7,
    arcadeCompleted: true,
    cosmeticRewardIds: ["pit-palette-jungle-hunter-judgment"],
  };

  const first = await harness.callback(result);
  assert.equal(first.persisted, false);
  assert.match(first.message, /non confirmé/);
  const second = await harness.callback(result);
  assert.deepEqual(second, { persisted: true });
  assert.deepEqual(appliedIds, [result.resultId, result.resultId]);
  assert.deepEqual(harness.calls.cosmeticUpdates.at(-1), result.cosmeticRewardIds);
});

test("an idempotent duplicate is acknowledged as persisted and refreshes cosmetics", async () => {
  const unlockedCosmeticIds = ["pit-palette-jungle-hunter-judgment"];
  const confirmedSave = { ownerSaveCreatedAt: OWNER, unlockedCosmeticIds };
  const harness = createHarness({
    loadPitSave: () => ({ save: confirmedSave, loaded: true, failure: null }),
    applyPitResult: () => ({ applied: false, save: confirmedSave }),
  });

  const acknowledgement = await harness.callback(completedResult(null));
  assert.deepEqual(acknowledgement, { persisted: true });
  assert.equal(harness.calls.statWrites, 0);
  assert.deepEqual(harness.calls.cosmeticUpdates, [unlockedCosmeticIds]);
});

test("hydration, confirmed replacement and PitCanvas all stay bound to the campaign owner", () => {
  assert.match(
    source,
    /hydratePitReplayForOwner\(loadedSave\.createdAt\)[\s\S]*?setLastPitReplay\(replayHydration\.replay\)[\s\S]*?setToast\(replayHydration\.diagnostic\)/,
  );
  assert.match(source, /<PitCanvas[\s\S]*?lastReplay=\{lastPitReplay\}/);

  const resetStart = source.indexOf("const resetProgress");
  const importStart = source.indexOf("const confirmImport");
  const resetSource = source.slice(resetStart, importStart);
  assert.ok(resetSource.indexOf("if (!written.persisted)") < resetSource.indexOf("clearPitReplayArchive"));
  assert.match(resetSource, /clearPitReplayArchive\(\{\s*ownerSaveCreatedAt: previousOwnerSaveCreatedAt/);
  assert.match(resetSource, /setLastPitReplay\(null\)/);

  const importSource = source.slice(importStart, source.indexOf("const menuBack", importStart));
  assert.ok(importSource.indexOf("if (!result.persisted") < importSource.indexOf("loadPitSave"));
  assert.match(importSource, /expectedOwnerSaveCreatedAt: result\.save\.createdAt/);
  assert.match(importSource, /hydratePitReplayForOwner\(result\.save\.createdAt\)/);
  assert.match(importSource, /setLastPitReplay\(importedReplay\.replay\)/);
  assert.match(importSource, /setPitCircuitRuns\(importedPitSnapshots\?\.circuitRuns \?\? \{\}\)/);
  assert.match(importSource, /setPitDescentRuns\(importedPitSnapshots\?\.descentRuns \?\? \{\}\)/);
  assert.doesNotMatch(importSource, /clearPitSave|clearPitReplayArchive|pitOwnersToClear/);
  assert.match(importSource, /données THE PIT locales liées à cette campagne ont été conservées et rechargées/);
});

test("hydration diagnoses replay failures without deleting any archive", () => {
  const replay = { version: 1, metadata: { checksum: "c0ffee00" } };
  const healthy = hydrateWith({
    archive: { latestReplay: replay },
    loaded: true,
    failure: null,
  });
  assert.deepEqual(healthy.result, { replay, diagnostic: null });
  assert.equal(healthy.clearCalls, 0);

  const corrupted = hydrateWith({
    archive: null,
    loaded: false,
    failure: "corrupt-save",
  });
  assert.equal(corrupted.result.replay, null);
  assert.match(corrupted.result.diagnostic, /corrompue détectée/);
  assert.match(corrupted.result.diagnostic, /réparée sous verrou au prochain match/);
  assert.equal(corrupted.clearCalls, 0);

  const incompatible = hydrateWith({
    archive: null,
    loaded: false,
    failure: "incompatible-engine",
  });
  assert.equal(incompatible.result.replay, null);
  assert.match(incompatible.result.diagnostic, /ancien moteur/);
  assert.match(incompatible.result.diagnostic, /ne sera pas relue/);
  assert.equal(incompatible.clearCalls, 0);

  for (const failure of ["future-version", "owner-conflict"]) {
    const protectedArchive = hydrateWith({
      archive: null,
      loaded: false,
      failure,
    });
    assert.equal(protectedArchive.result.replay, null);
    assert.match(protectedArchive.result.diagnostic, /préservée/);
    assert.equal(protectedArchive.clearCalls, 0);
  }
});

test("a corrupt or engine-incompatible replay is safely replaced during the locked write", () => {
  for (const failure of ["corrupt-save", "incompatible-engine"]) {
    const harness = createHarness({
      loadPitReplayArchive: () => {
        harness.calls.replayLoads += 1;
        return { archive: null, loaded: false, failure };
      },
    });
    harness.callback(completedResult());
    assert.equal(harness.calls.replayLoads, 1);
    assert.equal(harness.calls.replayClears, 1);
    assert.equal(harness.calls.replayCreates, 1);
    assert.equal(harness.calls.replayWrites, 1);
  }
});

test("write-time repair never clears future or foreign-owner replay archives", () => {
  for (const failure of ["future-version", "owner-conflict"]) {
    const harness = createHarness({
      loadPitReplayArchive: () => {
        harness.calls.replayLoads += 1;
        return { archive: null, loaded: false, failure };
      },
    });
    const result = completedResult();
    harness.callback(result);
    assert.deepEqual(harness.calls.replayMemory, [result.replay]);
    assert.equal(harness.calls.replayClears, 0);
    assert.equal(harness.calls.replayCreates, 0);
    assert.equal(harness.calls.replayWrites, 0);
  }
});

test("results and route transitions share the same browser lock and fallback lease", () => {
  const transitionDeclaration = findVariable("recordPitRunTransition");
  assert.ok(ts.isCallExpression(transitionDeclaration.initializer));
  const transitionCallback = transitionDeclaration.initializer.arguments[0];
  assert.ok(ts.isArrowFunction(transitionCallback));

  const matchSource = recordCallback.getText(ast);
  const transitionSource = transitionCallback.getText(ast);
  assert.match(matchSource, /withPitWriteLock\(\{/);
  assert.match(transitionSource, /withPitWriteLock\(\{/);
  assert.match(matchSource, /operation: persistSafely/);
  assert.match(transitionSource, /operation: persistTransition/);
  assert.match(compiledWriteLock, /\.write-lock/);
  assert.match(compiledWriteLock, /stabilized\?\.token !== token/);
});

test("fallback lease waits for stabilization and retries when another claimant wins", async () => {
  const values = new Map();
  const timers = [];
  const fakeWindow = {
    localStorage: {
      getItem(key) {
        return values.get(key) ?? null;
      },
      setItem(key, value) {
        values.set(key, value);
      },
      removeItem(key) {
        values.delete(key);
      },
    },
    setTimeout(callback, delay) {
      timers.push({ callback, delay });
      return timers.length;
    },
  };
  const harness = createHarness({ navigator: {}, window: fakeWindow });
  const lockKey = `pit:${OWNER}.write-lock`;
  const acknowledgementPromise = harness.callback(completedResult());

  assert.equal(harness.calls.statWrites, 0);
  assert.equal(harness.calls.replayWrites, 0);
  assert.equal(timers.length, 1);
  assert.equal(timers[0].delay, 25);

  values.set(lockKey, JSON.stringify({
    token: "competing-tab",
    expiresAt: Date.now() + 10_000,
  }));
  timers.shift().callback();
  assert.equal(harness.calls.statWrites, 0);
  assert.equal(harness.calls.replayWrites, 0);
  assert.equal(timers.length, 1);
  assert.equal(timers[0].delay, 50);

  values.delete(lockKey);
  timers.shift().callback();
  assert.equal(timers.length, 1);
  assert.equal(timers[0].delay, 25);
  assert.equal(harness.calls.statWrites, 0);

  timers.shift().callback();
  assert.equal(harness.calls.statWrites, 1);
  assert.equal(harness.calls.replayWrites, 1);
  assert.equal(values.has(lockKey), false);
  assert.deepEqual(await acknowledgementPromise, { persisted: true });
});

test("the replay path never invokes campaign persistence or campaign rewards", () => {
  const callbackSource = recordCallback.getText(ast);
  const replayStart = callbackSource.indexOf("const persistReplay");
  const replayEnd = callbackSource.indexOf("const persistSafely", replayStart);
  const replayPersistence = callbackSource.slice(replayStart, replayEnd);
  assert.match(replayPersistence, /withLatestPitReplay/);
  assert.match(replayPersistence, /writePitReplayArchive/);
  assert.doesNotMatch(replayPersistence, /\bpersist\(|honor|troph|reward|missionProgress/i);
});
