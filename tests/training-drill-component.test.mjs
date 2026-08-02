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
  const source = await readFile(
    resolve(projectRoot, "app/game/TrainingDrill.tsx"),
    "utf8",
  );

  assert.match(source, /window\.requestAnimationFrame\(animate\)/);
  assert.match(source, /event\.stopPropagation\(\)/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /keyboardAction\(event\.key\)/);
  assert.match(source, /onPointerDown=/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /aria-live="assertive"/);
  assert.match(source, /onComplete\(score\)/);
  assert.match(source, /onClick=\{onCancel\}/);
});

test("ShipHub opens the drill instead of synthesizing a score and records only completed results", async () => {
  const source = await readFile(
    resolve(projectRoot, "app/game/ShipHub.tsx"),
    "utf8",
  );

  assert.match(source, /if \(!onTrainingRequested\)/);
  assert.match(source, /setTrainingSession\(\{/);
  assert.match(source, /<TrainingDrill/);
  assert.match(
    source,
    /recordCompletedTraining\(trainingSession\.disciplineId, score\)/,
  );
  assert.match(source, /épreuve abandonnée, aucun score consigné/);
  assert.match(source, /await onTrainingRequested\(disciplineId\)/);
  assert.doesNotMatch(source, /save\.statistics\.totalScans \* 2/);
  assert.doesNotMatch(source, /currentHuntStreak \* 4/);
  assert.doesNotMatch(source, /: 45 \+/);
});
