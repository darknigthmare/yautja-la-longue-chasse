import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const bundle = await build({
  stdin: {
    contents: `
      export * from "./app/game/systems/expansionExplorationRegions";
      export * from "./app/game/systems/explorationProgress";
      export * from "./app/game/systems/explorationRegions";
      export * from "./app/game/systems/platformCollision";
      export { worldBlueprintFor, validateWorldBlueprint } from "./app/game/systems/worldBlueprints";
      export { defaultSave, normalizeSave } from "./app/game/save";
      export {
        ICE_THERMAL_RETURN_BRIDGE,
        ICE_THERMAL_RETURN_GATE,
        ICE_THERMAL_RETURN_GATE_ID,
        ICE_THERMAL_RETURN_ROUTE_ID,
      } from "./app/game/systems/iceExplorationRegion";
    `,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "cjs",
  platform: "node",
});
const compiled = { exports: {} };
runInNewContext(bundle.outputFiles[0].text, {
  module: compiled,
  exports: compiled.exports,
});
const api = compiled.exports;
const mapBundle = await build({
  stdin: {
    contents: 'export { ExpansionExplorationMap } from "./app/game/ExpansionExplorationMap";',
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "cjs",
  platform: "node",
  jsx: "automatic",
  external: ["react", "react-dom"],
});
const compiledMap = { exports: {} };
runInNewContext(mapBundle.outputFiles[0].text, {
  module: compiledMap,
  exports: compiledMap.exports,
  require: createRequire(import.meta.url),
});
const { ExpansionExplorationMap } = compiledMap.exports;

const plain = (value) => JSON.parse(JSON.stringify(value));
const specs = Object.values(api.EXPANSION_EXPLORATION_SPECS);

const bodyOnFloor = (target, floorY, side = "left") => ({
  x: side === "left" ? target.x - 72 : target.x + target.width,
  y: floorY - 116,
  width: 72,
  height: 116,
});

function overlaps(left, right) {
  return left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y;
}

function initialProgress() {
  return api.mergeExplorationProgress(api.defaultExplorationProgress(), {
    abilityIds: ["aerial-boost"],
  });
}

function acquireAndOpen(spec) {
  const moduleBody = bodyOnFloor(spec.layout.module, spec.layout.moduleFloorY);
  const acquired = api.interactWithExpansionRegion(spec.missionId, initialProgress(), moduleBody);
  assert.equal(acquired?.event, "ability", `${spec.missionId}: ability event`);
  assert.ok(acquired.progress.abilityIds.includes(spec.abilityId));
  const gateBody = bodyOnFloor(spec.layout.gate, spec.layout.moduleFloorY);
  const opened = api.interactWithExpansionRegion(spec.missionId, acquired.progress, gateBody);
  assert.equal(opened?.event, "gate", `${spec.missionId}: gate event`);
  assert.ok(opened.progress.openedGateIds.includes(spec.gateId));
  return opened.progress;
}

test("six authored regions have distinct abilities, verbs and physical signatures", () => {
  assert.equal(specs.length, 6);
  assert.equal(new Set(specs.map((spec) => spec.abilityId)).size, 6);
  assert.equal(new Set(specs.map((spec) => spec.gateId)).size, 6);
  assert.equal(new Set(specs.map((spec) => spec.secretId)).size, 6);
  assert.equal(new Set(specs.map((spec) => spec.hazardKind)).size, 6);
  assert.equal(new Set(specs.map((spec) => spec.routeId)).size, 6);
  assert.equal(new Set(specs.map((spec) => spec.copy.gateMessage)).size, 6);
  assert.equal(new Set(specs.map((spec) => [
    spec.layout.moduleFloorY,
    spec.layout.vaultFloorY,
    spec.layout.bridge.width,
    spec.layout.hazard.x,
    spec.layout.hazard.width,
    spec.climbableKind,
  ].join(":"))).size, 6);
});

test("every optional branch leaves the campaign floor open and blocks its upper gate physically", () => {
  for (const spec of specs) {
    const world = api.applyExplorationWorld(
      api.worldBlueprintFor(spec.missionId),
      initialProgress(),
    );
    const gate = world.platforms.find((entry) => entry.id === spec.gateId);
    assert.ok(gate, `${spec.missionId}: closed gate exists`);
    assert.equal(gate.collision, "solid");
    const upperBody = {
      x: gate.x - 10,
      y: Math.max(0, spec.layout.moduleFloorY - 116),
      width: 72,
      height: 116,
    };
    assert.equal(api.overlapsSolidPlatform(upperBody, [gate]), true);
    for (
      let x = spec.layout.replacementSpan.minX;
      x < spec.layout.replacementSpan.maxX;
      x += 24
    ) {
      const groundBody = { x, y: 624 - 116, width: 72, height: 116 };
      assert.equal(api.overlapsSolidPlatform(groundBody, world.platforms), false,
        `${spec.missionId}: no solid branch geometry blocks the story floor at ${x}`);
      assert.equal(world.hazards.some((hazard) => overlaps(groundBody, hazard)), false,
        `${spec.missionId}: the optional danger never leaks onto the story floor at ${x}`);
    }
  }
});

test("each biome ability neutralizes its own danger, opens a route and reveals one unique trophy", () => {
  for (const spec of specs) {
    const before = api.applyExplorationWorld(
      api.worldBlueprintFor(spec.missionId),
      initialProgress(),
    );
    const abilityHazard = before.hazards.find(
      (entry) => entry.id === `${spec.prefix}-ability-hazard`,
    );
    assert.ok(abilityHazard);
    assert.equal(abilityHazard.y + abilityHazard.height, spec.layout.moduleFloorY);
    assert.ok(before.platforms.some((entry) => entry.id === spec.gateId));
    assert.ok(!before.platforms.some((entry) => entry.id === `${spec.prefix}-deployed-route`));

    const opened = acquireAndOpen(spec);
    const after = api.applyExplorationWorld(api.worldBlueprintFor(spec.missionId), opened);
    assert.ok(!after.hazards.some((entry) => entry.id === `${spec.prefix}-ability-hazard`));
    assert.ok(!after.platforms.some((entry) => entry.id === spec.gateId));
    assert.ok(after.platforms.some((entry) => entry.id === `${spec.prefix}-deployed-route`));

    const secretBody = bodyOnFloor(spec.layout.secret, spec.layout.vaultFloorY);
    const claimed = api.interactWithExpansionRegion(spec.missionId, opened, secretBody);
    assert.equal(claimed?.event, "secret", `${spec.missionId}: secret event`);
    assert.ok(claimed.progress.secretIds.includes(spec.secretId));
    assert.equal(api.explorationBonuses(claimed.progress).maxEnergy, 5);
    const repeated = api.interactWithExpansionRegion(spec.missionId, claimed.progress, secretBody);
    assert.equal(repeated?.changed, false);
    assert.equal(api.explorationBonuses(repeated.progress).maxEnergy, 5);
  }
});

test("thermal resistance reopens a physical route in the earlier ice hunt", () => {
  const beforeProgress = initialProgress();
  const before = api.applyExplorationWorld(
    api.worldBlueprintFor("ice-cryostalker"),
    beforeProgress,
  );
  assert.ok(before.platforms.some((entry) => entry.id === api.ICE_THERMAL_RETURN_GATE_ID));
  assert.ok(!before.platforms.some((entry) => entry.id === api.ICE_THERMAL_RETURN_ROUTE_ID));
  const upperBody = bodyOnFloor(api.ICE_THERMAL_RETURN_GATE, api.ICE_THERMAL_RETURN_BRIDGE.y);
  assert.match(
    api.explorationRegionHint("ice-cryostalker", beforeProgress, upperBody),
    /volcan requise/i,
  );

  const returnedProgress = api.mergeExplorationProgress(beforeProgress, {
    abilityIds: ["thermal-resistance"],
  });
  const after = api.applyExplorationWorld(
    api.worldBlueprintFor("ice-cryostalker"),
    returnedProgress,
  );
  assert.ok(!after.platforms.some((entry) => entry.id === api.ICE_THERMAL_RETURN_GATE_ID));
  assert.ok(after.platforms.some((entry) => entry.id === api.ICE_THERMAL_RETURN_ROUTE_ID));
  assert.match(
    api.explorationRegionHint("ice-cryostalker", returnedProgress, upperBody),
    /route supérieure/i,
  );
  assert.deepEqual(plain(api.validateWorldBlueprint(after)), []);
});

test("later hunt abilities open persistent return routes in earlier regions", () => {
  const expected = [
    ["volcano-bad-blood", "acid-protection", "swamp-hydra"],
    ["swamp-hydra", "cutting-blade", "desert-sandmaw"],
    ["desert-sandmaw", "aquatic-respirator", "ocean-leviathan"],
    ["ocean-leviathan", "spore-vision", "fungal-hivemind"],
    ["fungal-hivemind", "ancient-tech-detection", "ruins-ancient-guardian"],
  ];
  for (const [missionId, abilityId, originMissionId] of expected) {
    const spec = api.EXPANSION_EXPLORATION_SPECS[missionId];
    assert.equal(spec.shortcutRequirement, abilityId);
    assert.equal(spec.shortcutOriginMissionId, originMissionId);
    let progress = acquireAndOpen(spec);
    const hatchBody = bodyOnFloor(spec.layout.hatch, spec.layout.vaultFloorY);
    const secretBody = bodyOnFloor(spec.layout.secret, spec.layout.vaultFloorY);
    progress = api.interactWithExpansionRegion(missionId, progress, secretBody).progress;
    const early = api.interactWithExpansionRegion(missionId, progress, hatchBody);
    assert.equal(early?.changed, false);
    assert.match(early.message, /verrouill/i);
    progress = api.mergeExplorationProgress(progress, { abilityIds: [abilityId] });
    const revisited = api.interactWithExpansionRegion(missionId, progress, hatchBody);
    assert.equal(revisited?.event, "gate");
    assert.ok(revisited.progress.openedGateIds.includes(spec.shortcutId));
    const world = api.applyExplorationWorld(api.worldBlueprintFor(missionId), revisited.progress);
    assert.ok(!world.platforms.some((entry) => entry.id === spec.shortcutId));
    assert.ok(world.climbables.some((entry) => entry.id.startsWith(`${spec.prefix}-return-`)));
  }
});

test("the final ruins ability opens its own gravity return without another campaign dependency", () => {
  const spec = api.EXPANSION_EXPLORATION_SPECS["ruins-ancient-guardian"];
  let opened = acquireAndOpen(spec);
  opened = api.interactWithExpansionRegion(
    spec.missionId,
    opened,
    bodyOnFloor(spec.layout.secret, spec.layout.vaultFloorY),
  ).progress;
  const hatchBody = bodyOnFloor(spec.layout.hatch, spec.layout.vaultFloorY);
  const shortcut = api.interactWithExpansionRegion(spec.missionId, opened, hatchBody);
  assert.equal(shortcut?.event, "gate");
  assert.ok(shortcut.progress.openedGateIds.includes(spec.shortcutId));
});

test("mission-scoped persistence rejects foreign abilities, locks, trophies and rooms", () => {
  const forged = {
    abilityIds: specs.map((spec) => spec.abilityId),
    openedGateIds: specs.flatMap((spec) => [spec.gateId, spec.shortcutId]),
    secretIds: specs.map((spec) => spec.secretId),
    discoveredRoomIds: specs.flatMap((spec) => spec.rooms.map((room) => room.id)),
  };
  for (const spec of specs) {
    const local = api.explorationForMission(spec.missionId, forged);
    assert.deepEqual(plain(local.abilityIds), [spec.abilityId]);
    assert.deepEqual(plain(local.openedGateIds), [spec.gateId, spec.shortcutId]);
    assert.deepEqual(plain(local.secretIds), [spec.secretId]);
    assert.deepEqual(plain(local.discoveredRoomIds), plain(spec.rooms.map((room) => room.id)));
  }
  const normalized = api.normalizeExplorationProgress({
    ...forged,
    abilityIds: [...forged.abilityIds, "god-mode"],
    openedGateIds: [...forged.openedGateIds, "foreign-gate"],
    secretIds: [...forged.secretIds, "foreign-secret"],
    discoveredRoomIds: [...forged.discoveredRoomIds, "foreign-room"],
  });
  assert.equal(normalized.abilityIds.length, 6);
  assert.ok(!normalized.openedGateIds.includes("foreign-gate"));
  assert.ok(!normalized.secretIds.includes("foreign-secret"));
  assert.ok(!normalized.discoveredRoomIds.includes("foreign-room"));
});

test("the real save normalizer round-trips all six regional acquisitions", () => {
  const save = api.defaultSave("2026-09-04T12:00:00.000Z");
  save.exploration = {
    abilityIds: ["aerial-boost", ...specs.map((spec) => spec.abilityId)],
    openedGateIds: specs.flatMap((spec) => [spec.gateId, spec.shortcutId]),
    secretIds: specs.map((spec) => spec.secretId),
    discoveredRoomIds: specs.flatMap((spec) => spec.rooms.map((room) => room.id)),
  };
  const restored = api.normalizeSave(JSON.parse(JSON.stringify(save)));
  assert.deepEqual(plain(restored.exploration), plain(save.exploration));
  assert.equal(api.explorationBonuses(restored.exploration).maxEnergy, 30);
});

test("room discovery is spatial, idempotent and isolated per biome", () => {
  for (const spec of specs) {
    const room = spec.rooms[1];
    const body = {
      x: room.x + 10,
      y: Math.max(0, Math.min(room.height - 20, spec.layout.moduleFloorY - 116)),
      width: 40,
      height: 40,
    };
    const once = api.discoverExpansionRegionRooms(spec.missionId, initialProgress(), body);
    assert.ok(once.discoveredRoomIds.includes(room.id));
    const twice = api.discoverExpansionRegionRooms(spec.missionId, once, body);
    assert.deepEqual(plain(twice.discoveredRoomIds), plain(once.discoveredRoomIds));
    const foreign = specs.find((candidate) => candidate.missionId !== spec.missionId).rooms[1].id;
    assert.ok(!twice.discoveredRoomIds.includes(foreign));
  }
});

test("local map snapshots hide unknown labels and expose locks, dangers, objectives and Apex traces", () => {
  for (const spec of specs) {
    const hidden = api.expansionRegionMapSnapshot(
      spec.missionId,
      initialProgress(),
      spec.rooms[0].x + 20,
      520,
    );
    assert.equal(hidden.rooms.every((room) => room.label === null), true);
    assert.equal(hidden.secret.label, null);
    assert.equal(hidden.apexTrace, null);
    assert.equal(hidden.locks.length, 2);
    assert.equal(hidden.danger, spec.copy.hazardLabel);
    assert.equal(hidden.reminder, spec.copy.abilityLabel);

    let progress = acquireAndOpen(spec);
    const gated = api.expansionRegionMapSnapshot(
      spec.missionId,
      progress,
      spec.rooms[2].x + 20,
      200,
    );
    assert.equal(gated.locks[0].opened, true);
    assert.equal(gated.secret.label, null);
    assert.equal(gated.apexTrace, null);
    assert.match(gated.objective, /explorer la chambre/i);

    progress = api.discoverExpansionRegionRooms(
      spec.missionId,
      progress,
      {
        x: spec.rooms[2].x + 10,
        y: Math.max(
          0,
          Math.min(spec.rooms[2].height - 20, spec.layout.vaultFloorY - 116),
        ),
        width: 40,
        height: 40,
      },
    );
    const revealed = api.expansionRegionMapSnapshot(
      spec.missionId,
      progress,
      spec.rooms[2].x + 20,
      200,
    );
    assert.equal(revealed.locks[0].originMissionId, spec.missionId);
    assert.equal(revealed.locks[1].originMissionId, spec.shortcutOriginMissionId);
    assert.equal(revealed.secret.label, spec.copy.secretLabel);
    assert.equal(revealed.apexTrace, spec.copy.apexTrace);
  }
});

test("the accessible local map renders objectives, lock origins, shortcuts, dangers and earned Apex traces", () => {
  for (const spec of specs) {
    const firstRoom = spec.rooms[0];
    const hiddenProgress = api.mergeExplorationProgress(initialProgress(), {
      discoveredRoomIds: [firstRoom.id],
    });
    const hidden = renderToStaticMarkup(createElement(ExpansionExplorationMap, {
      missionId: spec.missionId,
      progress: hiddenProgress,
      playerX: firstRoom.x + 20,
      playerY: 520,
    }));
    assert.ok(hidden.includes(spec.copy.regionLabel));
    assert.ok(hidden.includes(firstRoom.label));
    assert.ok(hidden.includes(spec.copy.hazardLabel));
    assert.ok(!hidden.includes(spec.copy.secretLabel));
    assert.ok(!hidden.includes(spec.copy.apexTrace));
    assert.doesNotMatch(hidden, /<button|<a /);

    let complete = acquireAndOpen(spec);
    complete = api.mergeExplorationProgress(complete, {
      abilityIds: [spec.shortcutRequirement],
      openedGateIds: [spec.shortcutId],
      secretIds: [spec.secretId],
      discoveredRoomIds: spec.rooms.map((room) => room.id),
    });
    const revealed = renderToStaticMarkup(createElement(ExpansionExplorationMap, {
      missionId: spec.missionId,
      progress: complete,
      playerX: spec.rooms[2].x + 20,
      playerY: 200,
    }));
    assert.ok(revealed.includes(spec.copy.secretLabel));
    assert.ok(revealed.includes(spec.copy.apexTrace));
    assert.ok(revealed.includes("origine"));
    assert.ok(revealed.includes("récupéré"));
    assert.ok(revealed.includes(spec.routeId));
    assert.match(revealed, /aria-current="location"/);
  }
});

test("all six transformed worlds remain valid, route-linked and idempotent", () => {
  for (const spec of specs) {
    const progress = api.mergeExplorationProgress(acquireAndOpen(spec), {
      abilityIds: [spec.shortcutRequirement],
      openedGateIds: [spec.shortcutId],
      secretIds: [spec.secretId],
    });
    const once = api.applyExplorationWorld(api.worldBlueprintFor(spec.missionId), progress);
    const twice = api.applyExplorationWorld(once, progress);
    assert.deepEqual(plain(api.validateWorldBlueprint(once)), []);
    assert.deepEqual(plain(api.validateWorldBlueprint(twice)), []);
    const ids = [
      ...twice.platforms.map((entry) => entry.id),
      ...twice.climbables.map((entry) => entry.id),
      ...twice.hazards.map((entry) => entry.id),
      ...twice.covers.map((entry) => entry.id),
    ];
    assert.equal(new Set(ids).size, ids.length);
    const route = twice.routes.find((entry) => entry.id === spec.routeId);
    assert.ok(route.waypointIds.some((id) => id.startsWith(`${spec.prefix}-`)));
  }
});

test("HuntCanvas mounts the specialized map for every expansion mission", async () => {
  const source = await readFile(
    new URL("../app/game/HuntCanvas.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(source.includes("import { ExpansionExplorationMap } from \"./ExpansionExplorationMap\";"));
  assert.ok(source.includes("isExpansionExplorationMission(mission.id)"));
  assert.ok(source.includes("<ExpansionExplorationMap"));
  assert.ok(source.includes("missionId={mission.id}"));
  assert.ok(source.includes("progress={ui.exploration}"));
});
