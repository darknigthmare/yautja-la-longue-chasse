import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

const projectRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
const outputDirectory = await mkdtemp(
  join(tmpdir(), "yautja-training-drill-"),
);

await build({
  configFile: false,
  publicDir: false,
  logLevel: "silent",
  build: {
    emptyOutDir: true,
    outDir: outputDirectory,
    ssr: resolve(
      projectRoot,
      "app/game/systems/trainingDrill.ts",
    ),
    rollupOptions: {
      output: { entryFileNames: "training-drill.mjs" },
    },
  },
});

const {
  TRAINING_DRILL_ACTIONS,
  TRAINING_DRILL_CONFIGS,
  createTrainingDrill,
  startTrainingDrill,
  stepTrainingDrill,
  submitTrainingDrillAction,
  trainingDrillAccuracy,
  trainingDrillCueRemaining,
  trainingDrillProgress,
  trainingDrillScore,
} = await import(
  pathToFileURL(join(outputDirectory, "training-drill.mjs")).href
);

after(async () => {
  await rm(outputDirectory, { force: true, recursive: true });
});

test("training sequences are deterministic, varied, and avoid duplicate adjacent cues", () => {
  const first = createTrainingDrill("targeting", 7);
  const replay = createTrainingDrill("targeting", 7);
  const nextAttempt = createTrainingDrill("targeting", 8);
  const otherDiscipline = createTrainingDrill("mobility", 7);

  assert.deepEqual(first.sequence, replay.sequence);
  assert.notDeepEqual(first.sequence, nextAttempt.sequence);
  assert.notDeepEqual(first.sequence, otherDiscipline.sequence);
  assert.equal(
    first.sequence.length,
    TRAINING_DRILL_CONFIGS.targeting.cueCount,
  );
  assert.ok(
    first.sequence.every(
      (action, index) =>
        TRAINING_DRILL_ACTIONS.includes(action) &&
        (index === 0 || action !== first.sequence[index - 1]),
    ),
  );
});

test("the pure clock advances missed cues and preserves excess elapsed time", () => {
  let state = startTrainingDrill(
    createTrainingDrill("cloaking", 2),
  );
  const duration =
    TRAINING_DRILL_CONFIGS.cloaking.cueDurationSeconds;

  state = stepTrainingDrill(state, duration * 2 + 0.2);
  assert.equal(state.cueIndex, 2);
  assert.equal(state.missedCues, 2);
  assert.ok(Math.abs(state.cueElapsedSeconds - 0.2) < 0.000_001);
  assert.equal(state.feedback, "missed");
  assert.ok(trainingDrillProgress(state) > 0);
  assert.ok(trainingDrillCueRemaining(state) < 1);

  const unchanged = stepTrainingDrill(state, Number.NaN);
  assert.equal(unchanged, state);
});

test("correct, slow, and wrong inputs produce real accuracy and reaction scoring", () => {
  let state = startTrainingDrill(
    createTrainingDrill("wristblades", 4),
  );
  const firstCue = state.sequence[state.cueIndex];
  let result = submitTrainingDrillAction(state, firstCue);
  assert.equal(result.outcome, "perfect");
  assert.equal(result.state.hits, 1);

  state = result.state;
  const duration =
    TRAINING_DRILL_CONFIGS.wristblades.cueDurationSeconds;
  state = stepTrainingDrill(state, duration * 0.75);
  result = submitTrainingDrillAction(
    state,
    state.sequence[state.cueIndex],
  );
  assert.equal(result.outcome, "correct");
  assert.equal(result.state.hits, 2);
  assert.ok(result.state.totalReactionSeconds > 0);

  state = result.state;
  const expected = state.sequence[state.cueIndex];
  const wrongAction = TRAINING_DRILL_ACTIONS.find(
    (action) => action !== expected,
  );
  result = submitTrainingDrillAction(state, wrongAction);
  assert.equal(result.outcome, "wrong");
  assert.equal(result.state.wrongInputs, 1);
  assert.equal(result.state.cueIndex, 3);
  assert.ok(trainingDrillAccuracy(result.state) < 1);
  assert.ok(trainingDrillScore(result.state) < 100);
});

test("a completed perfect drill scores 100 while an expired drill scores 0", () => {
  let perfect = startTrainingDrill(
    createTrainingDrill("honor-duel", 11),
  );
  while (perfect.status === "playing") {
    perfect = submitTrainingDrillAction(
      perfect,
      perfect.sequence[perfect.cueIndex],
    ).state;
  }

  assert.equal(perfect.status, "complete");
  assert.equal(perfect.hits, perfect.sequence.length);
  assert.equal(trainingDrillProgress(perfect), 1);
  assert.equal(trainingDrillAccuracy(perfect), 1);
  assert.equal(trainingDrillScore(perfect), 100);

  let expired = startTrainingDrill(
    createTrainingDrill("targeting", 11),
  );
  expired = stepTrainingDrill(
    expired,
    TRAINING_DRILL_CONFIGS.targeting.cueDurationSeconds *
      expired.sequence.length,
  );
  assert.equal(expired.status, "complete");
  assert.equal(expired.missedCues, expired.sequence.length);
  assert.equal(trainingDrillScore(expired), 0);
});
