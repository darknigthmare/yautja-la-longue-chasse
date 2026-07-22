import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { build } from "vite";

async function importTypeScriptModule(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: relativePath,
    reportDiagnostics: true,
  });
  const errors = (transpiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(errors, []);
  return import(
    `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`
  );
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const worldOutputDirectory = await mkdtemp(join(tmpdir(), "yautja-world-blueprints-"));

await build({
  configFile: false,
  publicDir: false,
  logLevel: "silent",
  build: {
    emptyOutDir: true,
    outDir: worldOutputDirectory,
    ssr: resolve(projectRoot, "tests/fixtures/world-runtime-entry.ts"),
    rollupOptions: { output: { entryFileNames: "world-blueprints.mjs" } },
  },
});

const worldPromise = import(
  pathToFileURL(join(worldOutputDirectory, "world-blueprints.mjs")).href
);
const huntPromise = importTypeScriptModule(
  "../app/game/systems/huntSystems.ts",
);
const huntCanvasPromise = readFile(
  new URL("../app/game/HuntCanvas.tsx", import.meta.url),
  "utf8",
);

after(async () => {
  await rm(worldOutputDirectory, { force: true, recursive: true });
});

function bossInput(overrides = {}) {
  return {
    deltaSeconds: 0.1,
    elapsedSeconds: 1,
    healthRatio: 1,
    distanceToPlayer: 300,
    lineOfSight: true,
    playerCloaked: false,
    playerOnHighGround: false,
    playerUsedRangedWeapon: false,
    playerUsedEnergyWeapon: false,
    bossHitPillar: false,
    disabledConsoleId: null,
    activeSupportCount: 0,
    ...overrides,
  };
}

const expansionBossEffects = {
  "swamp-hydra": "hydra-tidal-surge",
  "desert-sandmaw": "sandmaw-burrow",
  "ocean-leviathan": "leviathan-rogue-wave",
  "fungal-hivemind": "hivemind-spore-pulse",
  "ruins-ancient-guardian": "guardian-adaptive-field",
};

test("the eight world blueprints are internally valid and offer three routes", async () => {
  const world = await worldPromise;
  const blueprints = Object.values(world.WORLD_BLUEPRINTS_BY_MISSION);
  assert.equal(blueprints.length, 8);
  for (const blueprint of blueprints) {
    assert.deepEqual(world.validateWorldBlueprint(blueprint), []);
    assert.equal(blueprint.width, 8_400);
    assert.ok(blueprint.extraction.x > 7_000);
    assert.equal(blueprint.routes.length, 3);
    assert.ok(blueprint.climbables.length >= 6);
    assert.ok(blueprint.hazards.length >= 3);
    assert.ok(blueprint.trapSockets.length >= 4);

    const playableGeometry = [
      ...blueprint.platforms,
      ...blueprint.climbables,
      ...blueprint.hazards,
      ...blueprint.covers,
      ...blueprint.surfaces,
    ];
    const materializedFeatures = playableGeometry.filter((entry) =>
      entry.id.startsWith("feature-"),
    );
    const expectedFeatureIds = world.WORLD_SCREENS_BY_MISSION[
      blueprint.missionId
    ].screens.flatMap((screen) =>
      screen.features.map((entry) => `feature-${entry.id}`),
    );
    assert.deepEqual(
      [...materializedFeatures.map((entry) => entry.id)].sort(),
      [...expectedFeatureIds].sort(),
    );
    assert.ok(
      blueprint.platforms.some((entry) => entry.id.startsWith("feature-")),
    );
    assert.ok(
      blueprint.climbables.some((entry) => entry.id.startsWith("feature-")),
    );
    for (let index = 0; index < blueprint.hazards.length; index += 1) {
      const left = blueprint.hazards[index];
      assert.ok(
        left.x + left.width <= blueprint.extraction.x - 80 ||
          left.x >= blueprint.extraction.x + 80,
        `${blueprint.missionId}: ${left.id} must leave a safe extraction lane`,
      );
      for (let otherIndex = index + 1; otherIndex < blueprint.hazards.length; otherIndex += 1) {
        const right = blueprint.hazards[otherIndex];
        if (left.kind !== right.kind) continue;
        const overlaps =
          left.x < right.x + right.width &&
          left.x + left.width > right.x &&
          left.y < right.y + right.height &&
          left.y + left.height > right.y;
        assert.equal(
          overlaps,
          false,
          `${blueprint.missionId}: ${left.id} and ${right.id} must not stack damage`,
        );
      }
    }
    assert.equal(
      Math.max(...blueprint.surfaces.map((surface) => surface.x + surface.width)),
      8_400,
    );
  }
  assert.ok(
    world.WORLD_BLUEPRINTS_BY_MISSION["ice-cryostalker"].climbables.some(
      (entry) => entry.kind === "ice-wall",
    ),
  );
  assert.ok(
    world.WORLD_BLUEPRINTS_BY_MISSION["volcano-bad-blood"].climbables.some(
      (entry) => entry.kind === "chain",
    ),
  );
});

test("wind, scent, tracks, mud and traps remain deterministic", async () => {
  const hunt = await huntPromise;
  const world = await worldPromise;
  const blueprint = world.WORLD_BLUEPRINTS_BY_MISSION["jungle-vey"];
  assert.deepEqual(
    hunt.sampleWind(blueprint.wind, 14.5, 2_400),
    hunt.sampleWind(blueprint.wind, 14.5, 2_400),
  );

  const dry = hunt.stepMudState(
    {
      coating: 0,
      wetness: 0,
      thermalVisibility: 1,
      cloakShimmer: 0,
      footprintMultiplier: 0.15,
      scentMultiplier: 1,
    },
    {
      deltaSeconds: 2,
      mudDepth: 1,
      inWater: false,
      heatIntensity: 0,
      speedRatio: 0.7,
    },
  );
  assert.ok(dry.coating > 0.4);
  assert.ok(dry.thermalVisibility < 0.8);
  assert.ok(dry.footprintMultiplier > 0.6);

  const trap = hunt.createHuntTrap({
    id: "snare-01",
    ownerId: "hunter",
    kind: "snare",
    position: { x: 500, y: 610 },
    facing: 1,
    concealment: 0.8,
  });
  const result = hunt.stepHuntTrap(
    trap,
    [
      {
        id: "prey",
        kind: "human",
        x: 510,
        y: 610,
        alive: true,
        speed: 120,
        trapResistance: 0.2,
      },
    ],
    0.016,
    4,
  );
  assert.equal(result.restrainedTargetId, "prey");
  assert.equal(result.trap.armed, false);
  assert.ok(result.restraintSeconds > 3);
});

test("AI progresses through suspicion, search, coordination, cover and flight", async () => {
  const hunt = await huntPromise;
  const baseObservation = {
    deltaSeconds: 1,
    elapsedSeconds: 1,
    self: { x: 0, y: 0 },
    target: { x: 300, y: 0 },
    healthRatio: 1,
    visualContact: 0,
    thermalContact: 0,
    heardNoise: {
      eventId: "noise",
      strength: 0.8,
      direction: 1,
      estimatedPosition: { x: 280, y: 0 },
    },
    scentStrength: 0,
    trackStrength: 0,
    underRangedThreat: false,
    alliesInRange: [],
    alliesEngaged: 0,
    nearbyCovers: [],
  };
  let brain = hunt.createAiBrain("soldier-01", "human");
  let step = hunt.stepAiBrain(brain, baseObservation);
  assert.equal(step.brain.mode, "suspicion");
  brain = step.brain;
  step = hunt.stepAiBrain(brain, {
    ...baseObservation,
    elapsedSeconds: 2,
  });
  assert.equal(step.brain.mode, "search");

  step = hunt.stepAiBrain(step.brain, {
    ...baseObservation,
    elapsedSeconds: 3,
    visualContact: 1,
    heardNoise: null,
    alliesInRange: ["soldier-02", "soldier-03"],
  });
  assert.equal(step.brain.mode, "coordinate");
  assert.equal(step.raisedAlert, true);

  step = hunt.stepAiBrain(
    hunt.createAiBrain("soldier-cover", "human"),
    {
      ...baseObservation,
      visualContact: 1,
      heardNoise: null,
      underRangedThreat: true,
      nearbyCovers: [
        {
          id: "cover-01",
          position: { x: 80, y: 0 },
          protection: 0.9,
          distance: 80,
          occupied: false,
        },
      ],
    },
  );
  assert.equal(step.brain.mode, "cover");
  assert.equal(step.intent.targetCoverId, "cover-01");

  step = hunt.stepAiBrain(
    hunt.createAiBrain("soldier-flee", "human"),
    { ...baseObservation, healthRatio: 0.04 },
  );
  assert.equal(step.brain.mode, "flee");
  assert.equal(step.intent.action, "retreat");
});

test("boss mechanics expose their mission-specific deterministic loops", async () => {
  const hunt = await huntPromise;

  const vey = {
    ...hunt.createBossMechanicState("jungle-vey"),
    attackCooldownSeconds: 0,
  };
  const veyStep = hunt.stepBossMechanics(
    vey,
    bossInput({ healthRatio: 0.6, playerCloaked: true }),
  );
  assert.equal(veyStep.decision.phaseId, "vey-reinforcements");
  assert.equal(veyStep.decision.attackId, "vey-flare");
  assert.ok(
    veyStep.effects.some((effect) => effect.kind === "spawn-support"),
  );
  assert.ok(
    veyStep.effects.some((effect) => effect.kind === "reveal-cloak"),
  );

  let cryo = hunt.createBossMechanicState("ice-cryostalker");
  let cryoStep = hunt.stepBossMechanics(
    cryo,
    bossInput({ healthRatio: 0.8, bossHitPillar: true }),
  );
  assert.equal(cryoStep.state.armorPlates, 2);
  assert.ok(
    cryoStep.effects.some((effect) => effect.kind === "armor-plate-broken"),
  );
  cryo = cryoStep.state;
  cryoStep = hunt.stepBossMechanics(
    cryo,
    bossInput({ healthRatio: 0.8, bossHitPillar: true }),
  );
  assert.equal(cryoStep.state.armorPlates, 2, "held collision is edge-triggered");

  let badBlood = hunt.createBossMechanicState("volcano-bad-blood");
  let badStep = hunt.stepBossMechanics(
    badBlood,
    bossInput({ healthRatio: 0.17 }),
  );
  assert.equal(badStep.decision.trophyAtRisk, true);
  assert.ok(
    badStep.effects.some((effect) => effect.kind === "purge-started"),
  );
  badBlood = badStep.state;
  for (const consoleId of ["purge-a", "purge-b", "purge-c"]) {
    badStep = hunt.stepBossMechanics(
      badBlood,
      bossInput({
        healthRatio: 0.17,
        disabledConsoleId: consoleId,
      }),
    );
    badBlood = badStep.state;
  }
  assert.equal(badStep.state.purgeResolved, true);
  assert.equal(badStep.decision.trophyAtRisk, false);
  assert.ok(
    badStep.effects.some((effect) => effect.kind === "purge-cancelled"),
  );

  for (const [missionId, effectKind] of Object.entries(expansionBossEffects)) {
    const expansion = {
      ...hunt.createBossMechanicState(missionId),
      attackCooldownSeconds: 0,
    };
    const phaseTwoStep = hunt.stepBossMechanics(
      expansion,
      bossInput({ healthRatio: 0.55 }),
    );
    assert.equal(phaseTwoStep.decision.phaseId, `${missionId}-phase-2`);
    assert.ok(phaseTwoStep.decision.attackId);
    assert.equal(phaseTwoStep.state.missionId, missionId);
    assert.deepEqual(
      phaseTwoStep.effects.map(({ kind }) => kind),
      [effectKind],
      `${missionId}: phase two signature`,
    );

    const steadyPhaseStep = hunt.stepBossMechanics(
      phaseTwoStep.state,
      bossInput({ healthRatio: 0.55 }),
    );
    assert.deepEqual(
      steadyPhaseStep.effects,
      [],
      `${missionId}: signature must be edge-triggered`,
    );

    const phaseThreeStep = hunt.stepBossMechanics(
      steadyPhaseStep.state,
      bossInput({ healthRatio: 0.2 }),
    );
    assert.equal(phaseThreeStep.decision.phaseId, `${missionId}-phase-3`);
    assert.deepEqual(
      phaseThreeStep.effects.map(({ kind }) => kind),
      [effectKind],
      `${missionId}: phase three signature`,
    );
  }
});

test("HuntCanvas wires every biome, hunt signal, AI brain, boss loop and V4 prey sprite", async () => {
  const source = await huntCanvasPromise;
  for (const marker of [
    "worldBlueprintFor(mission.id)",
    "state.world.platforms",
    "state.world.climbables",
    "state.world.surfaces",
    "state.world.hazards",
    "updateHuntSignals(state, mission, delta)",
    "activateArsenalGearSlot(state.arsenal",
    "stepHuntTrap(",
    "state.arsenal = tickArsenalRuntime(state.arsenal, delta)",
    "updateMissionCheckpoint(state)",
    "restoreCheckpoint(game, game.lastCheckpoint)",
    "filter: highContrastVision",
    "stepAiBrain(previousBrain",
    "stepBossMechanics(state.bossMechanics",
    "feature-i-nest-pillar",
    "assets.enemyV4[spriteId]",
    "/game/sprites/v4/${spriteId}.png",
  ]) {
    assert.ok(source.includes(marker), `missing runtime integration: ${marker}`);
  }
  for (const effectKind of Object.values(expansionBossEffects)) {
    assert.ok(
      source.includes(`case "${effectKind}"`),
      `missing expansion boss effect consumer: ${effectKind}`,
    );
  }
  for (const spriteId of [
    "scout",
    "rifle-soldier",
    "heavy",
    "cryostalker-runner",
    "cryostalker-brute",
    "bad-blood-initiate",
  ]) {
    assert.ok(source.includes(`"${spriteId}"`), `missing V4 sprite ${spriteId}`);
  }
  assert.doesNotMatch(source, /const PLATFORMS\b/);
  assert.doesNotMatch(source, /JUNGLE_CLIMB_ZONES/);
});
