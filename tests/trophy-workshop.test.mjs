import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = await mkdtemp(
  join(tmpdir(), "yautja-trophy-workshop-"),
);

await build({
  configFile: false,
  publicDir: false,
  logLevel: "silent",
  build: {
    emptyOutDir: true,
    outDir: outputDirectory,
    ssr: resolve(projectRoot, "app/game/systems/trophyWorkshop.ts"),
    rollupOptions: {
      output: { entryFileNames: "trophy-workshop.mjs" },
    },
  },
});

const {
  TROPHY_WORKSHOP_ACTIONS,
  TROPHY_WORKSHOP_TIMING,
  createTrophyWorkshopGame,
  createTrophyWorkshopSequence,
  startTrophyWorkshopGame,
  stepTrophyWorkshopGame,
  trophyWorkshopProgress,
  trophyWorkshopResult,
} = await import(
  pathToFileURL(join(outputDirectory, "trophy-workshop.mjs")).href
);

after(async () => {
  await rm(outputDirectory, { force: true, recursive: true });
});

test("all four workshop actions require multi-input deterministic sequences", () => {
  assert.deepEqual(Object.keys(TROPHY_WORKSHOP_ACTIONS), [
    "clean",
    "prepare",
    "display",
    "rite",
  ]);

  for (const action of Object.keys(TROPHY_WORKSHOP_ACTIONS)) {
    const first = createTrophyWorkshopSequence(action, "trophy-vey");
    const replay = createTrophyWorkshopSequence(action, "trophy-vey");
    assert.deepEqual(first, replay);
    assert.equal(first.length, TROPHY_WORKSHOP_ACTIONS[action].cueCount);
    assert.ok(first.length >= 5);
    for (let index = 1; index < first.length; index += 1) {
      assert.notEqual(first[index], first[index - 1]);
    }
  }
});

test("a perfect sequence is the only path to a completion result", () => {
  let state = createTrophyWorkshopGame("clean", "claim-001", [
    "left",
    "up",
    "right",
  ]);
  assert.equal(trophyWorkshopResult(state), null);

  state = startTrophyWorkshopGame(state);
  state = stepTrophyWorkshopGame(
    state,
    TROPHY_WORKSHOP_TIMING.readyDurationSeconds,
  ).state;
  assert.equal(state.phase, "cue");

  for (const input of state.sequence) {
    const step = stepTrophyWorkshopGame(
      state,
      TROPHY_WORKSHOP_TIMING.perfectHitSeconds,
      input,
    );
    assert.equal(step.accepted, true);
    state = step.state;
  }

  assert.equal(state.status, "success");
  assert.equal(trophyWorkshopProgress(state), 1);
  assert.deepEqual(trophyWorkshopResult(state), {
    action: "clean",
    score: 300,
    accuracy: 1,
    mistakes: 0,
    elapsedSeconds:
      TROPHY_WORKSHOP_TIMING.readyDurationSeconds +
      TROPHY_WORKSHOP_TIMING.perfectHitSeconds * 3,
    grade: "flawless",
  });
});

test("the opening ready phase cannot create an automatic first-cue fault", () => {
  let state = createTrophyWorkshopGame("clean", "claim-readable", [
    "left",
    "up",
    "right",
  ]);

  let step = stepTrophyWorkshopGame(state, 60);
  assert.equal(step.state, state);
  assert.equal(step.state.phase, "ready");
  assert.equal(step.state.mistakes, 0);

  state = startTrophyWorkshopGame(state);
  step = stepTrophyWorkshopGame(
    state,
    TROPHY_WORKSHOP_TIMING.readyDurationSeconds - 0.01,
  );
  assert.equal(step.state.phase, "countdown");
  assert.equal(step.state.cueElapsedSeconds, 0);
  assert.equal(step.state.mistakes, 0);
  assert.equal(step.mistakeAdded, false);
  state = step.state;

  step = stepTrophyWorkshopGame(state, 0.01);
  assert.equal(step.state.phase, "cue");
  assert.equal(step.state.cueElapsedSeconds, 0);
  assert.equal(step.state.mistakes, 0);
});

test("early, wrong and expired cues add mistakes without advancing the rite", () => {
  let state = createTrophyWorkshopGame("prepare", "claim-002", [
    "left",
    "confirm",
    "up",
  ]);
  state = startTrophyWorkshopGame(state);
  state = stepTrophyWorkshopGame(
    state,
    TROPHY_WORKSHOP_TIMING.readyDurationSeconds,
  ).state;

  let step = stepTrophyWorkshopGame(state, 0.05, "left");
  assert.equal(step.mistakeAdded, true);
  assert.equal(step.state.feedback, "early");
  assert.equal(step.state.cueIndex, 0);
  state = step.state;

  step = stepTrophyWorkshopGame(state, 0.66, "right");
  assert.equal(step.state.feedback, "wrong");
  assert.equal(step.state.cueIndex, 0);
  state = step.state;

  step = stepTrophyWorkshopGame(
    state,
    TROPHY_WORKSHOP_TIMING.cueTimeoutSeconds + 0.01,
  );
  assert.equal(step.state.feedback, "missed");
  assert.equal(step.state.status, "failed");
  assert.equal(trophyWorkshopResult(step.state), null);
});

test("component exposes keyboard, gamepad, touch and accessible live feedback", async () => {
  const source = await readFile(
    resolve(projectRoot, "app/game/TrophyWorkshop.tsx"),
    "utf8",
  );

  assert.match(source, /onKeyDown={handleKeyDown}/);
  assert.match(source, /navigator\.getGamepads/);
  assert.match(source, /onPointerDown/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /role="progressbar"/);
  assert.match(source, /onComplete\(result\)/);
  assert.match(source, /game\.status === "failed"/);
  assert.match(source, /game\.phase === "ready"/);
  assert.match(source, /trophyWorkshopReadyRemaining/);
  assert.match(source, /Commencer la séquence · Entrée/);
  assert.match(source, /startTrophyWorkshopGame/);
  assert.match(source, /Espace ou E seulement lorsque/);
});

test("ShipHub routes every trophy action through the playable workshop", async () => {
  const source = await readFile(
    resolve(projectRoot, "app/game/ShipHub.tsx"),
    "utf8",
  );

  assert.match(source, /run: onOpenTrophies/);
  assert.match(source, /resolveMedbayTreatment/);
  assert.doesNotMatch(source, /startTrophyCleaning/);
  assert.doesNotMatch(source, /startTrophyMounting/);
  assert.doesNotMatch(source, /placeTrophyOnDisplay/);
  assert.doesNotMatch(source, /advanceShipProgression/);
});
