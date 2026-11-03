import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";

const projectRoot = resolve(import.meta.dirname, "..");
const expectedMissionIds = [
  "jungle-vey",
  "ice-cryostalker",
  "volcano-bad-blood",
  "swamp-hydra",
  "desert-sandmaw",
  "ocean-leviathan",
  "fungal-hivemind",
  "ruins-ancient-guardian",
];
const expansionMissionIds = expectedMissionIds.slice(3);

let buildDirectory;
let honor;

before(async () => {
  buildDirectory = await mkdtemp(join(tmpdir(), "mission-honor-rules-"));

  await build({
    configFile: false,
    publicDir: false,
    logLevel: "silent",
    build: {
      emptyOutDir: true,
      outDir: buildDirectory,
      ssr: resolve(projectRoot, "tests/fixtures/honor-rules-entry.ts"),
      rollupOptions: {
        output: {
          entryFileNames: "honor-rules.mjs",
        },
      },
    },
  });

  honor = await import(
    pathToFileURL(join(buildDirectory, "honor-rules.mjs")).href
  );
});

after(async () => {
  if (buildDirectory) {
    await rm(buildDirectory, { recursive: true, force: true });
  }
});

function missionById(id) {
  const mission = honor.MISSIONS.find((entry) => entry.id === id);
  assert.ok(mission, `mission inconnue: ${id}`);
  return mission;
}

function emptyFacts() {
  return {
    completedObjectiveIds: new Set(),
    targetScannedBeforeStrike: false,
    plasmaUsedOnRegularPrey: false,
    environmentalArmorBreaks: 0,
    duelViolated: false,
    purgeStopped: false,
    secondWindUsed: false,
  };
}

function objectiveId(mission, kind) {
  const objective = mission.objectives.find((entry) => entry.kind === kind);
  assert.ok(
    objective,
    `${mission.id} doit posséder un objectif de type ${kind}`,
  );
  return objective.id;
}

function factsForCondition(mission, condition, honored) {
  const facts = emptyFacts();

  switch (condition) {
    case "target-scanned-before-strike":
      facts.targetScannedBeforeStrike = honored;
      break;
    case "scan-objective-complete":
      facts.completedObjectiveIds = honored
        ? new Set([objectiveId(mission, "scan")])
        : new Set();
      break;
    case "recover-objective-complete":
      facts.completedObjectiveIds = honored
        ? new Set([objectiveId(mission, "recover")])
        : new Set();
      break;
    case "no-plasma-on-regular-prey":
      facts.plasmaUsedOnRegularPrey = !honored;
      break;
    case "environmental-armor-break":
      facts.environmentalArmorBreaks = honored ? 1 : 0;
      break;
    case "duel-kept":
      facts.duelViolated = !honored;
      break;
    case "purge-stopped":
      facts.purgeStopped = honored;
      break;
    case "no-second-wind":
      facts.secondWindUsed = !honored;
      break;
    default:
      assert.fail(`condition d'honneur inconnue: ${condition}`);
  }

  return facts;
}

function resolutionFor(mission, ruleId, facts) {
  const resolution = honor
    .evaluateMissionHonorRules(mission, facts)
    .find((entry) => entry.ruleId === ruleId);
  assert.ok(resolution, `résolution absente: ${mission.id}/${ruleId}`);
  return resolution;
}

test("les huit missions ont des règles résolubles avec les valeurs exactes", () => {
  assert.deepEqual(
    honor.MISSIONS.map((mission) => mission.id),
    expectedMissionIds,
  );

  for (const mission of honor.MISSIONS) {
    assert.ok(mission.honorRules.length > 0, `${mission.id} sans règle`);

    for (const rule of mission.honorRules) {
      assert.equal(typeof rule.condition, "string");

      const success = resolutionFor(
        mission,
        rule.id,
        factsForCondition(mission, rule.condition, true),
      );
      assert.equal(success.honored, true);
      assert.equal(success.value, rule.bonus);
      assert.equal(success.label, rule.label);

      const failure = resolutionFor(
        mission,
        rule.id,
        factsForCondition(mission, rule.condition, false),
      );
      assert.equal(failure.honored, false);
      assert.equal(failure.value, -rule.violationPenalty);
      assert.equal(failure.label, rule.label);
    }
  }
});

test("Vey doit être scannée avant la frappe et sa technologie récupérée", () => {
  const mission = missionById("jungle-vey");
  const scanRule = mission.honorRules.find(
    (rule) => rule.condition === "target-scanned-before-strike",
  );
  const recoverRule = mission.honorRules.find(
    (rule) => rule.condition === "recover-objective-complete",
  );
  assert.ok(scanRule);
  assert.ok(recoverRule);

  assert.equal(
    resolutionFor(mission, scanRule.id, emptyFacts()).honored,
    false,
  );
  assert.equal(
    resolutionFor(
      mission,
      scanRule.id,
      factsForCondition(mission, scanRule.condition, true),
    ).value,
    scanRule.bonus,
  );

  const recovered = emptyFacts();
  recovered.completedObjectiveIds = new Set([
    objectiveId(mission, "recover"),
  ]);
  assert.equal(
    resolutionFor(mission, recoverRule.id, recovered).honored,
    true,
  );
});

test("la chasse de glace exige les scans et une plaque brisée par l'environnement", () => {
  const mission = missionById("ice-cryostalker");
  const scanRule = mission.honorRules.find(
    (rule) => rule.condition === "scan-objective-complete",
  );
  const armorRule = mission.honorRules.find(
    (rule) => rule.condition === "environmental-armor-break",
  );
  assert.ok(scanRule);
  assert.ok(armorRule);

  const failed = emptyFacts();
  assert.equal(resolutionFor(mission, scanRule.id, failed).honored, false);
  assert.equal(resolutionFor(mission, armorRule.id, failed).honored, false);

  const honored = emptyFacts();
  honored.completedObjectiveIds = new Set([objectiveId(mission, "scan")]);
  honored.environmentalArmorBreaks = 1;
  assert.equal(resolutionFor(mission, scanRule.id, honored).honored, true);
  assert.equal(resolutionFor(mission, armorRule.id, honored).honored, true);
});

test("le Bad Blood sanctionne le duel rompu et la purge non stoppée", () => {
  const mission = missionById("volcano-bad-blood");
  const duelRule = mission.honorRules.find(
    (rule) => rule.condition === "duel-kept",
  );
  const purgeRule = mission.honorRules.find(
    (rule) => rule.condition === "purge-stopped",
  );
  assert.ok(duelRule);
  assert.ok(purgeRule);

  const violation = emptyFacts();
  violation.duelViolated = true;
  assert.equal(
    resolutionFor(mission, duelRule.id, violation).value,
    -duelRule.violationPenalty,
  );
  assert.equal(
    resolutionFor(mission, purgeRule.id, violation).value,
    -purgeRule.violationPenalty,
  );

  const honored = emptyFacts();
  honored.purgeStopped = true;
  assert.equal(
    resolutionFor(mission, duelRule.id, honored).value,
    duelRule.bonus,
  );
  assert.equal(
    resolutionFor(mission, purgeRule.id, honored).value,
    purgeRule.bonus,
  );
});

test("les cinq extensions imposent scan, retenue plasma et absence de Second Wind", () => {
  for (const missionId of expansionMissionIds) {
    const mission = missionById(missionId);
    assert.deepEqual(
      mission.honorRules.map((rule) => rule.condition),
      [
        "scan-objective-complete",
        "no-plasma-on-regular-prey",
        "no-second-wind",
      ],
    );

    const violations = emptyFacts();
    violations.completedObjectiveIds = new Set([
      objectiveId(mission, "scan"),
    ]);
    violations.plasmaUsedOnRegularPrey = true;
    violations.secondWindUsed = true;
    const resolutions = honor.evaluateMissionHonorRules(
      mission,
      violations,
    );

    assert.equal(resolutions[0].honored, true);
    assert.equal(resolutions[1].honored, false);
    assert.equal(resolutions[2].honored, false);
  }
});

test("les identifiants d'événement sont stables et uniques", () => {
  const eventIds = honor.MISSIONS.flatMap((mission) =>
    mission.honorRules.map((rule) => honor.honorRuleEventId(rule)),
  );
  const expectedEventIds = [
    "honor-rule:study-vey",
    "honor-rule:protect-tech",
    "honor-rule:restrained-caster",
    "honor-rule:study-alpha",
    "honor-rule:break-armor-cleanly",
    "honor-rule:no-second-wind-ice",
    "honor-rule:honor-fallen",
    "honor-rule:accept-final-duel",
    "honor-rule:stop-purge",
    ...expansionMissionIds.flatMap((missionId) => [
      `honor-rule:${missionId}-study`,
      `honor-rule:${missionId}-restraint`,
      `honor-rule:${missionId}-survive`,
    ]),
  ];

  assert.deepEqual(eventIds, expectedEventIds);
  assert.equal(new Set(eventIds).size, eventIds.length);

  for (const mission of honor.MISSIONS) {
    for (const rule of mission.honorRules) {
      assert.equal(
        honor.honorRuleEventId(rule),
        honor.honorRuleEventId({ id: rule.id }),
      );
    }
  }
});

test("l'évaluation ne modifie ni les faits ni les données de mission", () => {
  const completedObjectiveIds = honor.MISSIONS.flatMap((mission) =>
    mission.objectives
      .filter((objective) =>
        objective.kind === "scan" || objective.kind === "recover",
      )
      .map((objective) => objective.id),
  );
  const facts = {
    completedObjectiveIds: new Set(completedObjectiveIds),
    targetScannedBeforeStrike: true,
    plasmaUsedOnRegularPrey: false,
    environmentalArmorBreaks: 2,
    duelViolated: false,
    purgeStopped: true,
    secondWindUsed: false,
  };
  const factsBefore = structuredClone(facts);
  const missionsBefore = structuredClone(honor.MISSIONS);

  for (const mission of honor.MISSIONS) {
    honor.evaluateMissionHonorRules(mission, facts);
  }

  assert.deepEqual(facts, factsBefore);
  assert.deepEqual(honor.MISSIONS, missionsBefore);
});
