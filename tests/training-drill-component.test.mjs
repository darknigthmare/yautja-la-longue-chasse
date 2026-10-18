import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
test("TrainingDrill declares an autonomous accessible keyboard and touch challenge", async () => {
  const [component, system, css] = await Promise.all([
    readFile(resolve(projectRoot, "app/game/TrainingDrill.tsx"), "utf8"),
    readFile(
      resolve(projectRoot, "app/game/systems/trainingDrill.ts"),
      "utf8",
    ),
    readFile(resolve(projectRoot, "app/globals.css"), "utf8"),
  ]);

  assert.match(component, /role="dialog"/);
  assert.match(component, /aria-modal="true"/);
  assert.match(component, /Commencer l’épreuve/);
  assert.match(component, /role="progressbar"/);
  assert.match(component, /role="status"/);
  assert.match(component, /aria-label="Commandes tactiles"/);
  assert.match(system, /Acquisition biomask/);
  assert.match(system, /Corriger à gauche/);
  assert.match(system, /Corriger à droite/);
  assert.match(system, /Verrouiller/);
  assert.match(system, /Écarter/);
  assert.doesNotMatch(component, /outline: "none"/);
  assert.match(css, /\.training-drill-panel:focus-visible/);
});

test("TrainingDrill source provides timing, key isolation, live feedback, touch input, and abandon", async () => {
  const [source, runtime] = await Promise.all([
    readFile(resolve(projectRoot, "app/game/TrainingDrill.tsx"), "utf8"),
    readFile(resolve(projectRoot, "app/game/useTrainingDrillRuntimeV94.ts"), "utf8"),
  ]);

  assert.match(source, /useTrainingDrillRuntimeV94\(\{/);
  assert.match(runtime, /window\.requestAnimationFrame\(tick\)/);
  assert.match(source, /event\.stopPropagation\(\)/);
  assert.match(source, /matchingControlActions\([\s\S]*"training"/);
  assert.match(source, /actions\.includes\("training\.cancel"\)/);
  assert.match(source, /actions\.includes\("training\.primary"\)/);
  assert.match(source, /onPointerDown=/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /aria-live="assertive"/);
  assert.match(source, /onClick=\{recordResult\}/);
  assert.match(runtime, /gameRef\.current\.status !== "complete"/);
  assert.match(runtime, /callbacks\.current\.onComplete\(trainingDrillScore\(gameRef\.current\)\)/);
  assert.match(source, /onClick=\{cancel\}/);
  assert.match(runtime, /callbacks\.current\.onCancel\(\)/);
});

test("ShipHub opens the drill instead of synthesizing a score and records only completed results", async () => {
  const [source, training] = await Promise.all([
    readFile(resolve(projectRoot, "app/game/ShipHub.tsx"), "utf8"),
    readFile(resolve(projectRoot, "app/game/useShipTrainingV94.ts"), "utf8"),
  ]);

  assert.match(source, /useShipTrainingV94\(\{/);
  assert.match(training, /if \(!o\.onTrainingRequested\) return/);
  assert.match(training, /setTrainingSession\(active\)/);
  assert.match(source, /<TrainingDrill/);
  assert.match(
    training,
    /if \(trainingSession && !trainingSession\.external\) acceptScore\(trainingSession\.id, score\)/,
  );
  assert.match(source, /onComplete=\{completeAutonomousTraining\}/);
  assert.match(training, /createShipTrainingReceiptV94\(o\.save, o\.progression, active\.disciplineId, score\)/);
  assert.match(training, /Épreuve abandonnée ; aucun score consigné\./);
  assert.match(training, /await o\.onTrainingRequested\(disciplineId\)/);
  assert.doesNotMatch(source + training, /save\.statistics\.totalScans \* 2/);
  assert.doesNotMatch(source + training, /currentHuntStreak \* 4/);
  assert.doesNotMatch(source + training, /: 45 \+/);
});
