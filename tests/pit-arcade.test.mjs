import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const bundle = await build({
  entryPoints: [fileURLToPath(new URL("../app/game/systems/pitArcade.ts", import.meta.url))],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "es2022",
  write: false,
});
const pit = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);

test("every first-edition fighter receives an individual deterministic eight-fight arcade", () => {
  assert.equal(pit.PIT_FIRST_EDITION_FIGHTER_IDS.length, 12);
  assert.equal(Object.keys(pit.PIT_ARCADE_LADDERS).length, 12);
  const opponentSequences = new Set();

  for (const fighterId of pit.PIT_FIRST_EDITION_FIGHTER_IDS) {
    const fighter = pit.PIT_FIRST_EDITION_FIGHTERS[fighterId];
    const ladder = pit.PIT_ARCADE_LADDERS[fighterId];
    assert.equal(ladder.version, pit.PIT_ARCADE_LADDER_VERSION);
    assert.equal(ladder.fighterId, fighterId);
    assert.equal(ladder.encounters.length, pit.PIT_ARCADE_ENCOUNTER_COUNT);
    assert.equal(ladder.intro, fighter.arcadeIntro);
    assert.equal(ladder.ending, fighter.arcadeEnding);
    assert.ok(ladder.intro.length > 30 && ladder.ending.length > 30);
    assert.deepEqual(ladder.encounters.map((encounter) => encounter.index), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal(new Set(ladder.encounters.map((encounter) => encounter.id)).size, 8);
    assert.equal(new Set(ladder.encounters.map((encounter) => encounter.arenaId)).size, 8);
    assert.equal(ladder.encounters.some((encounter) => encounter.opponentId === fighterId), false);
    assert.equal(ladder.encounters[6].kind, "rival");
    assert.equal(ladder.encounters[6].opponentId, fighter.rivalId);
    assert.equal(ladder.encounters[7].kind, "boss");
    assert.equal(ladder.encounters[7].opponentId, "kok-warlord");
    assert.ok(ladder.encounters.every((encounter) => encounter.bestOf === 3));
    assert.ok(ladder.encounters.every((encounter) => !("modifierIds" in encounter)));
    assert.match(ladder.cosmeticRewardId, new RegExp(`^pit-palette-${fighterId}-`));
    const cosmetic = pit.PIT_ARCADE_COSMETICS[fighterId];
    assert.equal(cosmetic.id, ladder.cosmeticRewardId);
    assert.equal(cosmetic.fighterId, fighterId);
    assert.match(cosmetic.label, /Armure du Jugement/);
    assert.notDeepEqual(cosmetic.palette, fighter.palette);
    assert.ok(Object.values(cosmetic.palette).every((color) => /^#[0-9a-f]{6}$/i.test(color)));
    opponentSequences.add(ladder.encounters.map((encounter) => encounter.opponentId).join("|"));
  }
  assert.equal(opponentSequences.size, 12);
});

test("arcade progression is pure, idempotent and unlocks one PIT cosmetic after Warlord", () => {
  const initial = pit.createPitArcadeRun("wolf");
  let run = initial;
  assert.equal(initial.phase, "active");
  assert.equal(initial.continuesRemaining, 2);

  for (let encounterIndex = 0; encounterIndex < 8; encounterIndex += 1) {
    const result = { id: `wolf-result-${encounterIndex}`, encounterIndex, outcome: "victory" };
    const application = pit.applyPitArcadeEncounterResult(run, result);
    assert.equal(application.applied, true);
    run = application.run;
    assert.equal(run.encounterIndex, encounterIndex + 1);
    assert.equal(initial.encounterIndex, 0, "the reducer must not mutate its input");
  }

  assert.equal(run.phase, "completed");
  assert.equal(run.victories, 8);
  assert.deepEqual(run.cosmeticRewardIds, [pit.PIT_ARCADE_LADDERS.wolf.cosmeticRewardId]);
  const duplicate = pit.applyPitArcadeEncounterResult(run, {
    id: "wolf-result-7",
    encounterIndex: 7,
    outcome: "victory",
  });
  assert.equal(duplicate.applied, false);
  assert.deepEqual(duplicate.run, run);
  assert.deepEqual(JSON.parse(pit.serializePitArcadeRun(run)), run);
});

test("arcade continues fail on the third loss without advancing the ladder", () => {
  let run = pit.createPitArcadeRun("scar");
  for (let loss = 0; loss < 3; loss += 1) {
    run = pit.applyPitArcadeEncounterResult(run, {
      id: `scar-loss-${loss}`,
      encounterIndex: 0,
      outcome: "defeat",
    }).run;
  }
  assert.equal(run.phase, "failed");
  assert.equal(run.encounterIndex, 0);
  assert.equal(run.victories, 0);
  assert.equal(run.defeats, 3);
  assert.equal(run.continuesRemaining, 0);
  assert.deepEqual(run.cosmeticRewardIds, []);
});

test("arcade normalization rejects future, forged and structurally inconsistent runs", () => {
  const run = pit.createPitArcadeRun("valkyrie");
  assert.deepEqual(pit.normalizePitArcadeRun(run), run);
  assert.equal(pit.normalizePitArcadeRun({ ...run, version: 2 }), null);
  assert.equal(pit.normalizePitArcadeRun({ ...run, fighterId: "kok-warlord" }), null);
  assert.equal(pit.normalizePitArcadeRun({ ...run, ladderId: "forged" }), null);
  assert.equal(pit.normalizePitArcadeRun({ ...run, victories: 1 }), null);
  const exhausted = {
    ...run,
    phase: "active",
    defeats: pit.PIT_ARCADE_STARTING_CONTINUES + 1,
    continuesRemaining: 0,
    appliedResultIds: ["loss-1", "loss-2", "loss-3"],
  };
  assert.equal(pit.normalizePitArcadeRun(exhausted), null);
  assert.equal(pit.normalizePitArcadeRun({
    ...exhausted,
    phase: "failed",
    encounterIndex: 8,
    victories: 8,
    appliedResultIds: [
      "win-1", "win-2", "win-3", "win-4", "win-5", "win-6", "win-7", "win-8",
      "loss-1", "loss-2", "loss-3",
    ],
  }), null);
  assert.equal(pit.normalizePitArcadeRun({
    ...exhausted,
    phase: "completed",
    encounterIndex: 8,
    victories: 8,
    appliedResultIds: [
      "win-1", "win-2", "win-3", "win-4", "win-5", "win-6", "win-7", "win-8",
      "loss-1", "loss-2", "loss-3",
    ],
    cosmeticRewardIds: [pit.PIT_ARCADE_LADDERS.valkyrie.cosmeticRewardId],
  }), null);
  assert.equal(pit.normalizePitArcadeRun({ ...run, cosmeticRewardIds: ["campaign-reward"] }), null);
  assert.throws(() => pit.applyPitArcadeEncounterResult(run, {
    id: "wrong-index",
    encounterIndex: 2,
    outcome: "victory",
  }));
});

test("Descent plans have eight deterministic floors, real branches and Chronicle boss choices", () => {
  const first = pit.createPitDescentPlan("jungle-hunter", 0x12345678);
  const repeated = pit.createPitDescentPlan("jungle-hunter", 0x12345678);
  const otherSeed = pit.createPitDescentPlan("jungle-hunter", 0x12345679);
  assert.deepEqual(first, repeated);
  assert.notDeepEqual(first, otherSeed);
  assert.equal(first.floors.length, pit.PIT_DESCENT_FLOOR_COUNT);
  assert.deepEqual(first.floors.map((floor) => floor.index), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(first.floors[0].options.length, 1);
  assert.ok(first.floors.slice(1).every((floor) => floor.options.length === 2));
  assert.deepEqual(first.floors[2].options.map((node) => node.kind), ["relic", "recovery"]);
  assert.deepEqual(first.floors[5].options.map((node) => node.kind), ["relic", "recovery"]);
  assert.deepEqual(first.floors[7].options.map((node) => node.kind), ["boss", "boss"]);
  assert.deepEqual(first.floors[7].options.map((node) => node.opponentId), ["kok-warlord", "stone-heart"]);
  assert.equal(new Set(first.floors.map((floor) => floor.options[0].arenaId)).size, 8);

  for (const floor of first.floors) {
    for (const node of floor.options) {
      assert.equal(node.floor, floor.index);
      if (node.kind === "fight" || node.kind === "boss") {
        assert.ok(node.opponentId);
        assert.notEqual(node.opponentId, "jungle-hunter");
        if (node.floor > 1) assert.ok(node.modifierIds.length > 0);
      } else {
        assert.equal(node.opponentId, null);
        assert.deepEqual(node.modifierIds, []);
      }
      if (node.kind === "relic") {
        assert.ok(node.relicId);
        assert.equal(pit.PIT_DESCENT_RELICS[node.relicId].scope, "descent-run-only");
      }
      if (node.kind === "recovery") {
        assert.equal(node.recoveryHealth, pit.PIT_DESCENT_RECOVERY_HEALTH);
      }
    }
  }
});

test("a Descent route carries health and temporary relics but expires them at completion", () => {
  let run = pit.createPitDescentRun("enforcer", 72);
  const initial = run;
  const healthByCombatFloor = new Map([[1, 860], [2, 700], [4, 590], [5, 430], [7, 310], [8, 170]]);

  for (let floorIndex = 0; floorIndex < 8; floorIndex += 1) {
    const floor = pit.createPitDescentPlan(run.fighterId, run.seed).floors[floorIndex];
    const preferredKind = floorIndex === 2 ? "relic" : floorIndex === 5 ? "recovery" : null;
    const node = preferredKind
      ? floor.options.find((candidate) => candidate.kind === preferredKind)
      : floor.options[0];
    run = pit.selectPitDescentNode(run, node.id);
    const resolution = {
      id: `descent-resolution-${floorIndex}`,
      nodeId: node.id,
      ...((node.kind === "fight" || node.kind === "boss")
        ? {
            victory: true,
            remainingHealth: healthByCombatFloor.get(floorIndex + 1),
            roundsWon: 2,
            roundsLost: floorIndex % 2,
            roundsDrawn: 0,
          }
        : {}),
    };
    run = pit.applyPitDescentResolution(run, resolution).run;
    if (floorIndex === 2) assert.equal(run.temporaryRelicIds.length, 1);
    if (floorIndex === 5) {
      assert.equal(run.health, 690);
      assert.equal(run.recoveriesRemaining, 1);
    }
  }

  assert.equal(initial.completedFloors, 0, "the reducer must not mutate its input");
  assert.equal(run.phase, "completed");
  assert.equal(run.completedFloors, 8);
  assert.equal(pit.normalizePitDescentRun({ ...run, health: 0 }), null);
  assert.deepEqual(run.temporaryRelicIds, [], "relics expire with the run");
  assert.deepEqual(run.cosmeticRewardIds, ["pit-banner-descent-survivor"]);
  assert.deepEqual(JSON.parse(pit.serializePitDescentRun(run)), run);
  const duplicate = pit.applyPitDescentResolution(run, {
    id: "descent-resolution-7",
    nodeId: run.resolvedNodeIds[7],
    victory: true,
    remainingHealth: 170,
    roundsWon: 2,
    roundsLost: 1,
    roundsDrawn: 0,
  });
  assert.equal(duplicate.applied, false);
});

test("Descent branch and result validation stop skips, forged state and dead-run rewards", () => {
  const initial = pit.createPitDescentRun("feral-hunter", 9);
  const plan = pit.createPitDescentPlan("feral-hunter", 9);
  assert.throws(() => pit.selectPitDescentNode(initial, plan.floors[1].options[0].id));

  let run = pit.selectPitDescentNode(initial, plan.floors[0].options[0].id);
  assert.throws(() => pit.applyPitDescentResolution(run, {
    id: "forged-node",
    nodeId: "descent-1-2",
    victory: true,
    remainingHealth: 900,
  }));
  run = pit.applyPitDescentResolution(run, {
    id: "first-defeat",
    nodeId: plan.floors[0].options[0].id,
    victory: false,
    remainingHealth: 0,
    roundsWon: 0,
    roundsLost: 2,
    roundsDrawn: 0,
  }).run;
  assert.equal(run.phase, "failed");
  assert.equal(run.health, 0);
  assert.deepEqual(run.cosmeticRewardIds, []);
  assert.equal(pit.normalizePitDescentRun({ ...run, health: 1 }), null);
  assert.equal(pit.normalizePitDescentRun({ ...run, version: 99 }), null);
  assert.equal(pit.normalizePitDescentRun({ ...run, cosmeticRewardIds: ["pit-banner-descent-survivor"] }), null);

  const untouched = pit.createPitDescentRun("feral-hunter", 9);
  assert.equal(pit.normalizePitDescentRun({
    ...untouched,
    temporaryRelicIds: [pit.PIT_DESCENT_RELIC_IDS[0]],
  }), null, "a snapshot cannot inject an unearned temporary relic");
  assert.equal(pit.normalizePitDescentRun({
    ...untouched,
    recoveriesRemaining: pit.PIT_DESCENT_MAX_RECOVERIES - 1,
  }), null, "a snapshot cannot spend or restore recovery outside resolved nodes");
  assert.equal(pit.normalizePitDescentRun({
    ...untouched,
    phase: "failed",
    health: 0,
  }), null, "an empty run cannot be forged as failed");

  const recoveryRoute = {
    ...untouched,
    phase: "failed",
    completedFloors: 3,
    health: 0,
    recoveriesRemaining: 1,
    resolvedNodeIds: [
      plan.floors[0].options[0].id,
      plan.floors[1].options[0].id,
      plan.floors[2].options.find((node) => node.kind === "recovery").id,
    ],
    appliedResolutionIds: ["route-1", "route-2", "route-3"],
  };
  assert.equal(
    pit.normalizePitDescentRun(recoveryRoute),
    null,
    "a relic or recovery node cannot be forged as the cause of failure",
  );
});

test("Descent V2 replays health, rounds and node history instead of trusting summary fields", () => {
  const plan = pit.createPitDescentPlan("wolf", 44);
  let run = pit.createPitDescentRun("wolf", 44);
  run = pit.selectPitDescentNode(run, plan.floors[0].options[0].id);
  run = pit.applyPitDescentResolution(run, {
    id: "wolf-descent-v2-1",
    nodeId: plan.floors[0].options[0].id,
    victory: true,
    remainingHealth: 810,
    roundsWon: 1,
    roundsLost: 0,
    roundsDrawn: 0,
  }).run;

  assert.equal(run.version, 2);
  assert.deepEqual(run.resolutionHistory[0], {
    id: "wolf-descent-v2-1",
    nodeId: plan.floors[0].options[0].id,
    healthBefore: pit.PIT_DESCENT_MAX_HEALTH,
    healthAfter: 810,
    victory: true,
    roundsWon: 1,
    roundsLost: 0,
    roundsDrawn: 0,
  });
  assert.equal(pit.normalizePitDescentRun({
    ...run,
    health: 900,
  }), null);
  assert.equal(pit.normalizePitDescentRun({
    ...run,
    resolutionHistory: [{ ...run.resolutionHistory[0], healthBefore: 999 }],
  }), null);
  assert.equal(pit.normalizePitDescentRun({
    ...run,
    resolutionHistory: [{ ...run.resolutionHistory[0], healthAfter: 900 }],
  }), null);
  assert.equal(pit.normalizePitDescentRun({
    ...run,
    resolutionHistory: [{ ...run.resolutionHistory[0], roundsLost: 1 }],
  }), null);
  assert.throws(() => pit.applyPitDescentResolution(run, {
    id: "wolf-descent-v2-1",
    nodeId: plan.floors[0].options[0].id,
    victory: true,
    remainingHealth: 700,
    roundsWon: 2,
    roundsLost: 1,
  }), /Conflicting/);
});

test("Descent V2 non-combat nodes cannot forge matches and legacy V1 routes migrate", () => {
  const plan = pit.createPitDescentPlan("enforcer", 72);
  let run = pit.createPitDescentRun("enforcer", 72);
  for (let floorIndex = 0; floorIndex < 3; floorIndex += 1) {
    const floor = plan.floors[floorIndex];
    const node = floorIndex === 2
      ? floor.options.find((candidate) => candidate.kind === "recovery")
      : floor.options[0];
    run = pit.selectPitDescentNode(run, node.id);
    if (node.kind === "fight" || node.kind === "boss") {
      run = pit.applyPitDescentResolution(run, {
        id: "legacy-route-" + floorIndex,
        nodeId: node.id,
        victory: true,
        remainingHealth: floorIndex === 0 ? 780 : 620,
        roundsWon: 2,
        roundsLost: floorIndex,
        roundsDrawn: 0,
      }).run;
    } else {
      assert.throws(() => pit.applyPitDescentResolution(run, {
        id: "forged-recovery-match",
        nodeId: node.id,
        victory: true,
        remainingHealth: 900,
        roundsWon: 2,
        roundsLost: 0,
      }), /non-combat/);
      run = pit.applyPitDescentResolution(run, {
        id: "legacy-route-" + floorIndex,
        nodeId: node.id,
      }).run;
    }
  }

  const legacy = {
    ...run,
    version: pit.PIT_DESCENT_LEGACY_RUN_VERSION,
  };
  delete legacy.resolutionHistory;
  const migrated = pit.normalizePitDescentRun(legacy);
  assert.ok(migrated);
  assert.equal(migrated.version, pit.PIT_DESCENT_RUN_VERSION);
  assert.equal(migrated.health, run.health);
  assert.deepEqual(migrated.resolvedNodeIds, run.resolvedNodeIds);
  assert.equal(migrated.resolutionHistory.length, 3);

  assert.equal(pit.normalizePitDescentRun({
    ...legacy,
    health: 100,
  }), null, "an impossible post-recovery V1 health cannot become trusted history");
});
test("PIT-05 progression source contains no campaign reward or random runtime coupling", async () => {
  const source = await readFile(new URL("../app/game/systems/pitArcade.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Math\.random|Date\.now|localStorage|sessionStorage/);
  assert.doesNotMatch(source, /honor|clanMarks|missionProgress|inventoryIds/i);
  assert.match(source, /cosmeticRewardIds/);
  assert.match(source, /descent-run-only/);
});
