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
  "ruins-ancient-guardian": "guardian-adaptive-warning",
};

function isOutsideEveryHazard(blueprint, x, margin) {
  return blueprint.hazards.every(
    (hazard) =>
      x < hazard.x - margin ||
      x > hazard.x + hazard.width + margin,
  );
}

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

test("safe ground resolution is nearest, bounded and deterministic on all eight worlds", async () => {
  const world = await worldPromise;
  const margin = 72;

  for (const blueprint of Object.values(world.WORLD_BLUEPRINTS_BY_MISSION)) {
    const bounds = {
      minX: blueprint.spawn.x,
      maxX: blueprint.bossArena.x - 0.001,
    };
    const intersectingHazard = blueprint.hazards.find(
      (hazard) =>
        hazard.x + hazard.width >= bounds.minX &&
        hazard.x <= bounds.maxX,
    );
    assert.ok(
      intersectingHazard,
      `${blueprint.missionId}: expected a hazard inside the hunt corridor`,
    );
    const desiredX =
      intersectingHazard.x + intersectingHazard.width / 2;
    const resolved = world.resolveNearestSafeGroundX(
      blueprint,
      desiredX,
      bounds,
      margin,
    );
    assert.notEqual(
      resolved,
      null,
      `${blueprint.missionId}: expected safe ground`,
    );
    assert.ok(resolved >= bounds.minX && resolved <= bounds.maxX);
    assert.equal(
      isOutsideEveryHazard(blueprint, resolved, margin),
      true,
      `${blueprint.missionId}: resolver violated its hazard margin`,
    );
    assert.equal(
      world.resolveNearestSafeGroundX(
        blueprint,
        desiredX,
        bounds,
        margin,
      ),
      resolved,
      `${blueprint.missionId}: resolver must be deterministic`,
    );

    const clampedTarget = Math.max(
      bounds.minX,
      Math.min(bounds.maxX, desiredX),
    );
    for (
      let candidate = Math.ceil(bounds.minX);
      candidate <= Math.floor(bounds.maxX);
      candidate += 1
    ) {
      if (!isOutsideEveryHazard(blueprint, candidate, margin)) {
        continue;
      }
      assert.ok(
        Math.abs(resolved - clampedTarget) <=
          Math.abs(candidate - clampedTarget) + 0.002,
        `${blueprint.missionId}: ${resolved} was not the nearest safe X`,
      );
    }
  }
});

test("safe checkpoints stay ordered between insertion and arena for every hazard cycle", async () => {
  const world = await worldPromise;
  const margin = 72;

  for (const blueprint of Object.values(world.WORLD_BLUEPRINTS_BY_MISSION)) {
    const minX = Math.max(
      blueprint.spawn.x,
      blueprint.spawn.x + 720,
      blueprint.width * 0.22,
    );
    const maxX = blueprint.bossArena.x - 320;

    for (const checkpointCount of [1, 2]) {
      const positions = world.safeCheckpointPositions(
        blueprint,
        checkpointCount,
        { hazardMargin: margin },
      );
      assert.equal(positions.length, checkpointCount);
      assert.deepEqual(
        world.safeCheckpointPositions(blueprint, checkpointCount, {
          hazardMargin: margin,
        }),
        positions,
        `${blueprint.missionId}: checkpoint placement must be deterministic`,
      );

      positions.forEach((position, index) => {
        assert.ok(
          position >= minX && position <= maxX,
          `${blueprint.missionId}: checkpoint ${index + 1} escaped its bounds`,
        );
        assert.ok(
          position >= blueprint.spawn.x &&
            position < blueprint.bossArena.x,
          `${blueprint.missionId}: checkpoint ${index + 1} left the hunt corridor`,
        );
        if (index > 0) {
          assert.ok(
            position > positions[index - 1],
            `${blueprint.missionId}: checkpoints must remain ordered`,
          );
        }
        assert.equal(
          isOutsideEveryHazard(blueprint, position, margin),
          true,
          `${blueprint.missionId}: checkpoint ${index + 1} is not cycle-safe`,
        );
        for (let elapsed = 0; elapsed <= 30; elapsed += 0.25) {
          const activeHazards = blueprint.hazards.filter((hazard) =>
            world.isHazardActive(hazard, elapsed),
          );
          assert.equal(
            activeHazards.every(
              (hazard) =>
                position < hazard.x - margin ||
                position > hazard.x + hazard.width + margin,
            ),
            true,
            `${blueprint.missionId}: checkpoint ${index + 1} became dangerous at ${elapsed}s`,
          );
        }
      });
    }
  }
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

test("Acheron vacuum, cover occlusion and alert leashes respect level logic", async () => {
  const hunt = await huntPromise;
  const world = await worldPromise;
  const acheron =
    world.WORLD_BLUEPRINTS_BY_MISSION["ruins-ancient-guardian"];
  const vacuumWind = hunt.sampleWind(acheron.wind, 19, 4_500);
  assert.deepEqual(vacuumWind, {
    x: 0,
    y: 0,
    magnitude: 0,
    gust: 0,
  });

  assert.equal(
    hunt.calculateLineOfSightOcclusion(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      [
        { x: 42, y: -12, width: 18, height: 24, protection: 0.84 },
        { x: 42, y: 40, width: 18, height: 24, protection: 1 },
      ],
    ),
    0.84,
  );
  assert.equal(
    hunt.calculateLineOfSightOcclusion(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      [{ x: 42, y: 40, width: 18, height: 24, protection: 1 }],
    ),
    0,
  );

  assert.deepEqual(
    hunt.resolveAiMovementLeash("patrol", 600, 900, 8_400, 80),
    { left: 600, right: 900 },
  );
  assert.deepEqual(
    hunt.resolveAiMovementLeash("engage", 600, 900, 8_400, 80),
    { left: 40, right: 1_620 },
  );
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

test("a relayed AI alert immediately turns an isolated patrol into a real search", async () => {
  const hunt = await huntPromise;
  const patrol = hunt.createAiBrain("soldier-02", "human");
  const relayedTarget = { x: 640, y: 600 };
  const alerted = hunt.receiveAiAlert(patrol, relayedTarget, [
    "soldier-03",
    "soldier-02",
    "soldier-01",
    "soldier-03",
  ]);

  assert.equal(patrol.mode, "patrol");
  assert.equal(alerted.mode, "search");
  assert.equal(alerted.timeInMode, 0);
  assert.equal(alerted.lostContactSeconds, 0);
  assert.ok(alerted.suspicion >= 0.56);
  assert.deepEqual(alerted.lastKnownTarget, relayedTarget);
  assert.notEqual(alerted.lastKnownTarget, relayedTarget);
  assert.deepEqual(alerted.alertedAllyIds, ["soldier-01", "soldier-03"]);

  const nextStep = hunt.stepAiBrain(alerted, {
    deltaSeconds: 1 / 60,
    elapsedSeconds: 3,
    self: { x: 100, y: 600 },
    target: { x: 0, y: 600 },
    healthRatio: 1,
    visualContact: 0,
    thermalContact: 0,
    heardNoise: null,
    scentStrength: 0,
    scentDirection: 0,
    trackStrength: 0,
    trackPosition: null,
    underRangedThreat: false,
    alliesInRange: [],
    alliesEngaged: 0,
    nearbyCovers: [],
  });
  assert.equal(nextStep.brain.mode, "search");
  assert.equal(nextStep.intent.moveX, 1);
});

test("AI coordination factions group only plausible allies", async () => {
  const hunt = await huntPromise;
  const faction = (group, archetype, missionId = "jungle-vey") =>
    hunt.resolveAiCoordinationFaction({ group, archetype, missionId });

  assert.equal(
    faction("human", "rifle-soldier"),
    faction("human", "heavy"),
  );
  assert.equal(
    faction("bad-blood", "bad-blood-initiate"),
    faction("bad-blood", "bad-blood-enforcer"),
  );
  assert.equal(
    faction("xeno", "xeno-drone"),
    faction("xeno", "xeno-warrior"),
  );
  assert.notEqual(
    faction("automaton", "security-synth", "jungle-vey"),
    faction("automaton", "security-synth", "ice-cryostalker"),
  );
  assert.equal(
    faction("fauna", "cryostalker-runner"),
    faction("fauna", "cryostalker-runner"),
  );
  assert.notEqual(
    faction("fauna", "cryostalker-runner"),
    faction("fauna", "river-stalker"),
  );
  assert.notEqual(
    faction("flora", "sentinel-orchid"),
    faction("flora", "acid-bloom"),
  );
});

test("regular attacks start a deterministic immobilizing telegraph instead of executing immediately", async () => {
  const hunt = await huntPromise;
  const step = hunt.stepRegularAttackTelegraph(
    {
      cooldownSeconds: 0,
      telegraphSeconds: 0,
      pendingAttackId: null,
    },
    {
      deltaSeconds: 1 / 60,
      request: {
        attackId: "regular-ranged",
        telegraphSeconds: 0.55,
        cooldownSeconds: 1.4,
      },
    },
  );

  assert.equal(step.startedAttackId, "regular-ranged");
  assert.equal(step.executedAttackId, null);
  assert.equal(step.state.pendingAttackId, "regular-ranged");
  assert.equal(step.state.telegraphSeconds, 0.55);
  assert.equal(step.state.cooldownSeconds, 1.4);
  assert.equal(step.immobilized, true);
});

test("regular attacks execute only after expiry and retain cooldown after a dodge", async () => {
  const hunt = await huntPromise;
  const pending = {
    cooldownSeconds: 1.4,
    telegraphSeconds: 0.55,
    pendingAttackId: "regular-melee",
  };
  const warning = hunt.stepRegularAttackTelegraph(pending, {
    deltaSeconds: 0.5,
    request: null,
  });
  assert.equal(warning.executedAttackId, null);
  assert.ok(warning.state.telegraphSeconds > 0);
  assert.equal(warning.immobilized, true);

  const expired = hunt.stepRegularAttackTelegraph(warning.state, {
    deltaSeconds: 0.06,
    request: null,
  });
  assert.equal(expired.executedAttackId, "regular-melee");
  assert.equal(expired.state.pendingAttackId, null);
  assert.equal(expired.state.telegraphSeconds, 0);
  assert.ok(expired.state.cooldownSeconds > 0.8);

  const dodgedCooldown = hunt.stepRegularAttackTelegraph(expired.state, {
    deltaSeconds: 0.2,
    request: {
      attackId: "regular-melee",
      telegraphSeconds: 0.42,
      cooldownSeconds: 1.05,
    },
  });
  assert.equal(dodgedCooldown.startedAttackId, null);
  assert.equal(dodgedCooldown.state.pendingAttackId, null);
  assert.ok(dodgedCooldown.state.cooldownSeconds > 0);
});

test("restraint cancels a pending regular attack without erasing its cooldown", async () => {
  const hunt = await huntPromise;
  const cancelled = hunt.stepRegularAttackTelegraph(
    {
      cooldownSeconds: 1.2,
      telegraphSeconds: 0.3,
      pendingAttackId: "regular-melee",
    },
    {
      deltaSeconds: 0.1,
      request: null,
      cancelled: true,
    },
  );

  assert.equal(cancelled.executedAttackId, null);
  assert.equal(cancelled.state.pendingAttackId, null);
  assert.equal(cancelled.state.telegraphSeconds, 0);
  assert.ok(Math.abs(cancelled.state.cooldownSeconds - 1.1) < 0.000_001);
});

test("the five hunter weapons resolve to deterministic and distinct runtime identities", async () => {
  const hunt = await huntPromise;
  const base = {
    damage: 30,
    heavyDamage: 68,
    cooldownSeconds: 0.43,
    rangePx: 550,
    projectileSpeedPx: 760,
    staminaCost: 12,
    energyCost: 0,
    ammo: 1,
  };
  const ids = [
    "wristblades",
    "combistick",
    "plasma-caster",
    "yautja-bow",
    "smart-disc",
  ];
  const attacks = ids.map((id) =>
    hunt.resolveHunterWeaponAttack(
      id,
      {
        ...base,
        ammo:
          id === "wristblades" || id === "plasma-caster" ? null : 1,
      },
      0,
    ),
  );

  assert.equal(new Set(attacks.map((attack) => attack.family)).size, 5);
  assert.deepEqual(
    attacks.map(({ recovery }) => recovery),
    ["none", "pickup", "none", "pickup", "return"],
  );
  assert.deepEqual(
    attacks.map(({ maxTargetHits }) => maxTargetHits),
    [2, 1, 1, 1, 4],
  );
  assert.equal(attacks[0].ammoCost, 0);
  assert.equal(attacks[1].staminaCost, 12);
  assert.deepEqual(
    hunt.resolveHunterWeaponAttack("combistick", base, 0),
    hunt.resolveHunterWeaponAttack("combistick", base, 0),
  );
});

test("Plasmacaster and bow charge alter damage and resources coherently", async () => {
  const hunt = await huntPromise;
  const plasmaBase = {
    damage: 34,
    heavyDamage: 95,
    cooldownSeconds: 0.65,
    rangePx: 820,
    projectileSpeedPx: 900,
    staminaCost: 0,
    energyCost: 22,
    ammo: null,
  };
  const plasmaTap = hunt.resolveHunterWeaponAttack(
    "plasma-caster",
    plasmaBase,
    0,
  );
  const plasmaCharged = hunt.resolveHunterWeaponAttack(
    "plasma-caster",
    plasmaBase,
    9,
  );
  assert.equal(plasmaTap.damage, 34);
  assert.equal(plasmaCharged.chargeRatio, 1);
  assert.equal(plasmaCharged.damage, 95);
  assert.ok(plasmaCharged.energyCost > plasmaTap.energyCost);
  assert.ok(plasmaCharged.cooldownSeconds > plasmaTap.cooldownSeconds);
  assert.ok(plasmaCharged.projectileRadius > plasmaTap.projectileRadius);
  assert.ok(plasmaCharged.splashRadius > plasmaTap.splashRadius);
  assert.equal(plasmaCharged.ammoCost, 0);

  const bowBase = {
    damage: 20,
    heavyDamage: 65,
    cooldownSeconds: 0.52,
    rangePx: 920,
    projectileSpeedPx: 980,
    staminaCost: 4,
    energyCost: 0,
    ammo: 8,
  };
  const bowTap = hunt.resolveHunterWeaponAttack("yautja-bow", bowBase, 0);
  const bowCharged = hunt.resolveHunterWeaponAttack(
    "yautja-bow",
    bowBase,
    0.9,
  );
  assert.equal(bowTap.damage, 14.4);
  assert.equal(bowCharged.damage, 65);
  assert.ok(bowCharged.rangePx > bowTap.rangePx);
  assert.ok(bowCharged.projectileSpeedPx > bowTap.projectileSpeedPx);
  assert.ok(bowCharged.cooldownSeconds > bowTap.cooldownSeconds);
  assert.equal(bowTap.maxTargetHits, 1);
  assert.equal(bowCharged.maxTargetHits, 2);
  assert.equal(bowCharged.recovery, "pickup");
  assert.equal(bowCharged.ammoCost, 1);
  assert.equal(hunt.hunterWeaponChargeRatio("yautja-bow", Number.NaN), 0);
});

test("Smart Disc flight switches to guidance and cannot overshoot its hunter", async () => {
  const hunt = await huntPromise;
  const returnStep = hunt.stepSmartDiscFlight(
    {
      x: 0,
      y: 0,
      velocityX: 100,
      velocityY: 0,
      outboundSeconds: 0.1,
      returning: false,
    },
    {
      deltaSeconds: 0.11,
      hunterPosition: { x: -200, y: 0 },
      speedPxPerSecond: 100,
      catchRadius: 10,
    },
  );
  assert.equal(returnStep.startedReturn, true);
  assert.equal(returnStep.state.returning, true);
  assert.ok(returnStep.state.velocityX < 0);
  assert.equal(returnStep.caught, false);

  const caught = hunt.stepSmartDiscFlight(
    {
      ...returnStep.state,
      x: -185,
      y: 0,
    },
    {
      deltaSeconds: 0.1,
      hunterPosition: { x: -200, y: 0 },
      speedPxPerSecond: 100,
      catchRadius: 6,
    },
  );
  assert.equal(caught.caught, true);
  assert.deepEqual(
    { x: caught.state.x, y: caught.state.y },
    { x: -200, y: 0 },
  );
});

test("hunter splash damage is finite and strongly attenuated by cover", async () => {
  const hunt = await huntPromise;
  assert.equal(hunt.resolveHunterSplashDamage(100, 0), 45);
  assert.equal(hunt.resolveHunterSplashDamage(100, 1), 2.25);
  assert.equal(hunt.resolveHunterSplashDamage(100, 0.5), 23.625);
  assert.equal(hunt.resolveHunterSplashDamage(Number.NaN, 0), 0);
  assert.equal(hunt.resolveHunterSplashDamage(100, Number.NaN), 45);
});

test("AI investigates track and scent evidence instead of knowing the live target", async () => {
  const hunt = await huntPromise;
  const observation = {
    deltaSeconds: 1,
    elapsedSeconds: 1,
    self: { x: 500, y: 600 },
    target: { x: 1_400, y: 600 },
    healthRatio: 1,
    visualContact: 0,
    thermalContact: 0,
    heardNoise: null,
    scentStrength: 0,
    scentDirection: 0,
    trackStrength: 0.9,
    trackPosition: { x: 260, y: 600 },
    underRangedThreat: false,
    alliesInRange: [],
    alliesEngaged: 0,
    nearbyCovers: [],
  };
  let step = hunt.stepAiBrain(
    hunt.createAiBrain("tracker", "beast"),
    observation,
  );
  assert.equal(step.brain.mode, "suspicion");
  assert.deepEqual(step.brain.lastKnownTarget, observation.trackPosition);
  assert.equal(step.intent.moveX, -1);

  step = hunt.stepAiBrain(
    hunt.createAiBrain("scent-hunter", "beast"),
    {
      ...observation,
      scentStrength: 0.9,
      scentDirection: 1,
      trackStrength: 0,
      trackPosition: null,
    },
  );
  assert.notDeepEqual(step.brain.lastKnownTarget, observation.target);
  assert.ok(step.brain.lastKnownTarget.x > observation.self.x);
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
    if (missionId === "ruins-ancient-guardian") {
      assert.equal(phaseTwoStep.decision.attackId, null, "the warning leaves an escape window");
    } else {
      assert.ok(phaseTwoStep.decision.attackId);
    }
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
      missionId === "ruins-ancient-guardian" ? [] : [effectKind],
      `${missionId}: phase three does not restart an existing Guardian warning`,
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
    "stepRegularAttackTelegraph(",
    "resolveHunterWeaponAttack(",
    "stepSmartDiscFlight(",
    "settleRecoverableProjectile(",
    "projectile.splashRadius",
    "recordPlasmaRestraintViolation(",
    "resolveHunterSplashDamage(",
    "weaponChargeSeconds",
    "attackStep.immobilized",
    "attackStep.executedAttackId === REGULAR_MELEE_ATTACK_ID",
    "receiveAiAlert(",
    "ally.active &&",
    "ally.factionId === enemy.factionId",
    "discoveredEnemyIds:",
    "state.boss.scanned ? [state.boss.archetype] : []",
    "calculateLineOfSightOcclusion(",
    "resolveAiMovementLeash(",
    "spawnExtractionThreat(state, mission)",
    "projectile.coverGraceSeconds",
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
