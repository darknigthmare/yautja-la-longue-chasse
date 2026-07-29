import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";

const projectRoot = resolve(import.meta.dirname, "..");
let buildDirectory;
let mastery;

before(async () => {
  buildDirectory = await mkdtemp(join(tmpdir(), "mission-mastery-"));

  await build({
    configFile: false,
    publicDir: false,
    logLevel: "silent",
    build: {
      emptyOutDir: true,
      outDir: buildDirectory,
      ssr: resolve(
        projectRoot,
        "tests/fixtures/mission-mastery-entry.ts",
      ),
      rollupOptions: {
        output: {
          entryFileNames: "mission-mastery.mjs",
        },
      },
    },
  });

  mastery = await import(
    pathToFileURL(join(buildDirectory, "mission-mastery.mjs")).href
  );
});

after(async () => {
  if (buildDirectory) {
    await rm(buildDirectory, { recursive: true, force: true });
  }
});

function createProgress(overrides = {}) {
  return {
    status: "available",
    attempts: 0,
    completions: 0,
    bestScore: 0,
    bestTimeSeconds: null,
    bestDifficultyId: null,
    completedObjectiveIds: [],
    lastPlayedAt: null,
    ...overrides,
  };
}

function getMission() {
  return Object.values(mastery.MISSION_BY_ID)[0];
}

function requiredObjectiveIds(mission) {
  return mission.objectives
    .filter((objective) => objective.required)
    .map((objective) => objective.id);
}

test("une progression vide ne déverrouille aucun sceau", () => {
  const result = mastery.calculateMissionMastery(
    getMission(),
    createProgress(),
  );

  assert.deepEqual(
    result.seals.map(({ id, earned }) => ({ id, earned })),
    [
      { id: "hunt-completed", earned: false },
      { id: "required-objectives", earned: false },
      { id: "grade-a", earned: false },
      { id: "under-par", earned: false },
      { id: "elite-difficulty", earned: false },
    ],
  );
  assert.equal(result.count, 0);
  assert.equal(result.total, 5);
  assert.equal(result.ratio, 0);
  assert.equal(result.mastered, false);
});

test("les sceaux progressent dans leur ordre cumulatif", () => {
  const mission = getMission();
  const result = mastery.calculateMissionMastery(
    mission,
    createProgress({
      status: "completed",
      completions: 1,
      bestScore: 79,
      bestTimeSeconds: mission.parTimeSeconds - 1,
      bestDifficultyId: "elder",
      completedObjectiveIds: requiredObjectiveIds(mission),
    }),
  );

  assert.deepEqual(
    result.seals.map((seal) => seal.earned),
    [true, true, false, false, false],
  );
  assert.equal(result.count, 2);
  assert.equal(result.ratio, 2 / 5);
  assert.equal(result.mastered, false);
});

test("une chasse Elite complète atteint la maîtrise", () => {
  const mission = getMission();
  const result = mastery.calculateMissionMastery(
    mission,
    createProgress({
      status: "completed",
      attempts: 2,
      completions: 1,
      bestScore: 80,
      bestTimeSeconds: mission.parTimeSeconds,
      bestDifficultyId: "elite",
      completedObjectiveIds: requiredObjectiveIds(mission),
    }),
  );

  assert.deepEqual(
    result.seals.map((seal) => seal.earned),
    [true, true, true, true, true],
  );
  assert.equal(result.count, 5);
  assert.equal(result.total, 5);
  assert.equal(result.ratio, 1);
  assert.equal(result.mastered, true);
});

test("la difficulté Elder valide également le dernier sceau", () => {
  const mission = getMission();
  const result = mastery.calculateMissionMastery(
    mission,
    createProgress({
      status: "completed",
      completions: 1,
      bestScore: 100,
      bestTimeSeconds: mission.parTimeSeconds - 10,
      bestDifficultyId: "elder",
      completedObjectiveIds: requiredObjectiveIds(mission),
    }),
  );

  assert.equal(result.seals.at(-1).earned, true);
  assert.equal(result.mastered, true);
});

test("un temps nul bloque le sceau du par et les suivants", () => {
  const mission = getMission();
  const result = mastery.calculateMissionMastery(
    mission,
    createProgress({
      status: "completed",
      completions: 1,
      bestScore: 95,
      bestTimeSeconds: null,
      bestDifficultyId: "elder",
      completedObjectiveIds: requiredObjectiveIds(mission),
    }),
  );

  assert.deepEqual(
    result.seals.map((seal) => seal.earned),
    [true, true, true, false, false],
  );
  assert.equal(result.count, 3);
  assert.equal(result.mastered, false);
});

test("les objectifs inconnus sont ignorés sans remplacer les objectifs requis", () => {
  const mission = getMission();
  const base = {
    status: "completed",
    completions: 1,
    bestScore: 100,
    bestTimeSeconds: mission.parTimeSeconds - 1,
    bestDifficultyId: "elite",
  };

  const unknownOnly = mastery.calculateMissionMastery(
    mission,
    createProgress({
      ...base,
      completedObjectiveIds: ["objective-that-does-not-exist"],
    }),
  );
  assert.deepEqual(
    unknownOnly.seals.map((seal) => seal.earned),
    [true, false, false, false, false],
  );

  const withRequired = mastery.calculateMissionMastery(
    mission,
    createProgress({
      ...base,
      completedObjectiveIds: [
        ...requiredObjectiveIds(mission),
        "objective-that-does-not-exist",
      ],
    }),
  );
  assert.equal(withRequired.mastered, true);
});

test("le calcul ne modifie ni la mission ni la progression", () => {
  const mission = getMission();
  const progress = createProgress({
    status: "completed",
    completions: 1,
    bestScore: 88,
    bestTimeSeconds: mission.parTimeSeconds - 5,
    bestDifficultyId: "elite",
    completedObjectiveIds: requiredObjectiveIds(mission),
  });
  const missionBefore = structuredClone(mission);
  const progressBefore = structuredClone(progress);

  mastery.calculateMissionMastery(mission, progress);

  assert.deepEqual(mission, missionBefore);
  assert.deepEqual(progress, progressBefore);
});
