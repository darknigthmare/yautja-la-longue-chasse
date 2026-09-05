import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const bundle = await build({
  stdin: {
    contents: 'export * from "./app/game/systems/expansionExplorationRegions"; export * from "./app/game/systems/explorationProgress"; export * from "./app/game/systems/explorationRegions"; export * from "./app/game/systems/platformCollision"; export * from "./app/game/systems/worldBlueprints"; export {JUMP_VELOCITY} from "./app/game/systems/jumpAssist"; export {ExpansionExplorationMap} from "./app/game/ExpansionExplorationMap";',
    resolveDir: process.cwd(), loader: "ts",
  },
  bundle: true, write: false, format: "cjs", platform: "node",
  jsx: "automatic", external: ["react", "react-dom"],
});
const compiled = { exports: {} };
runInNewContext(bundle.outputFiles[0].text, {
  module: compiled, exports: compiled.exports, require: createRequire(import.meta.url),
});
const api = compiled.exports;
const specs = Object.values(api.EXPANSION_EXPLORATION_SPECS);
const missionIds = ["jungle-vey", "ice-cryostalker", ...specs.map(spec => spec.missionId)];
const GRAVITY = 1850;
const DT = 1 / 120;
const SPEED = 300;
const feet = body => body.y + body.height;
const bodyAt = (x, floor = 624) => ({
  x, y: floor - 116, width: 72, height: 116,
  velocityX: 0, velocityY: 0, grounded: true,
});
const initial = () => api.mergeExplorationProgress(api.defaultExplorationProgress(), { abilityIds: ["aerial-boost"] });
const worldFor = (id, progress) => api.applyExplorationWorld(api.worldBlueprintFor(id), progress);
const atFloor = (body, floor) => body.grounded && feet(body) >= floor - 24 && feet(body) <= floor + 0.01;
const plain = value => JSON.parse(JSON.stringify(value));

function tick(body, world, direction = 0, impulse = false) {
  const velocityX = direction * SPEED;
  const velocityY = (impulse ? api.JUMP_VELOCITY : body.velocityY) + GRAVITY * DT;
  const next = { ...body, ...api.resolvePlatformMotion(
    { ...body, velocityX, velocityY },
    { x: body.x + velocityX * DT, y: body.y + velocityY * DT },
    world.platforms, world.floorY,
  ) };
  assert.equal(api.overlapsSolidPlatform(next, world.platforms), false, world.missionId + " embedded hunter");
  return next;
}
function travel(body, world, targetX, { jump = false, boost = false, frames = 240 } = {}) {
  const trace = [];
  for (let frame = 0; frame < frames; frame += 1) {
    const direction = Math.abs(body.x - targetX) < SPEED * DT ? 0 : Math.sign(targetX - body.x);
    body = tick(body, world, direction, (jump && frame === 0) || (boost && frame === 46));
    trace.push(body);
  }
  return { body, trace };
}
function unlockFromModule(spec) {
  let progress = initial();
  const gained = api.interactWithExpansionRegion(spec.missionId, progress,
    bodyAt(spec.layout.module.x - 64, spec.layout.moduleFloorY));
  assert.equal(gained?.event, "ability", spec.missionId + " module");
  progress = gained.progress;
  const opened = api.interactWithExpansionRegion(spec.missionId, progress,
    bodyAt(spec.layout.gate.x - 72, spec.layout.moduleFloorY));
  assert.equal(opened?.event, "gate", spec.missionId + " gate");
  return opened.progress;
}

test("V25 trajectory trials use the live jump impulse and gravity", () => {
  assert.equal(api.JUMP_VELOCITY, -720);
  assert.match(readFileSync("app/game/HuntCanvas.tsx", "utf8"), /const GRAVITY = 1_850;/);
});

test("a boosted jump from below cannot enter or discover any vault behind a closed gate", () => {
  for (const spec of specs) {
    const progress = initial();
    const world = worldFor(spec.missionId, progress);
    let body = bodyAt(spec.layout.vaultFloor.x - 76);
    let discovered = progress;
    for (let frame = 0; frame < 220; frame += 1) {
      const direction = feet(body) <= spec.layout.vaultFloorY && body.x < spec.layout.vaultFloor.x + 20 ? 1 : 0;
      body = tick(body, world, direction, frame === 0 || frame === 46);
      discovered = api.discoverExplorationRooms(spec.missionId, discovered, body);
      assert.equal(
        body.grounded && feet(body) <= spec.layout.vaultFloorY && body.x + body.width > spec.layout.vaultFloor.x,
        false, spec.missionId + " vault bypass",
      );
    }
    assert.equal(discovered.discoveredRoomIds.includes(spec.prefix + "-vault"), false, spec.missionId + " vault reveal through its floor");
    assert.ok(world.platforms.some(platform => platform.id === spec.gateId));
  }
});

test("six module approaches genuinely require the jungle boost, then admit the intended trajectory", () => {
  for (const spec of specs) {
    const world = worldFor(spec.missionId, initial());
    const start = bodyAt(spec.layout.starter.x + 40, spec.layout.starter.y);
    const targetX = spec.layout.module.x - 62;
    const normal = travel(start, world, targetX, { jump: true });
    assert.equal(normal.trace.some(body => atFloor(body, spec.layout.moduleFloorY)), false,
      spec.missionId + " ordinary jump unexpectedly reaches upgrade");
    const boosted = travel(start, world, targetX, { jump: true, boost: true });
    assert.ok(atFloor(boosted.body, spec.layout.moduleFloorY), spec.missionId + " boost must reach module");
    const acquisition = api.interactWithExpansionRegion(spec.missionId, initial(), boosted.body);
    assert.equal(acquisition?.event, "ability", spec.missionId + " upgrade can be acquired from the physical landing");
  }
});

test("every opened branch reaches its trophy and permits retreat before the later shortcut ability", () => {
  for (const spec of specs) {
    let progress = unlockFromModule(spec);
    let world = worldFor(spec.missionId, progress);
    let body = bodyAt(spec.layout.gate.x - 72, spec.layout.moduleFloorY);
    body = travel(body, world, spec.layout.secret.x - 60).body;
    assert.ok(atFloor(body, spec.layout.vaultFloorY), spec.missionId + " vault landing");
    const recovered = api.interactWithExpansionRegion(spec.missionId, progress, body);
    assert.equal(recovered?.event, "secret", spec.missionId + " reachable trophy");
    progress = recovered.progress;
    assert.equal(progress.openedGateIds.includes(spec.shortcutId), false);
    world = worldFor(spec.missionId, progress);
    // Move to the near vault edge before rising onto the bridge; the boost is
    // already owned, while the cross-mission shortcut upgrade is not.
    body = travel(body, world, spec.layout.vaultFloor.x + 8, { frames: 100 }).body;
    body = travel(body, world, spec.layout.module.x - 62, { jump: true, boost: true }).body;
    assert.ok(atFloor(body, spec.layout.moduleFloorY), spec.missionId + " return to upper corridor");
    body = travel(body, world, spec.layout.replacementSpan.minX - 100, { frames: 360 }).body;
    assert.ok(atFloor(body, 624), spec.missionId + " return to story floor without future ability");
    assert.ok(body.x < spec.layout.replacementSpan.minX);
  }
});

test("the main route remains continuously traversable to extraction in all eight hunts", () => {
  const complete = api.mergeExplorationProgress(initial(), {
    abilityIds: specs.map(spec => spec.abilityId),
    openedGateIds: ["jungle-resonance-seal", "jungle-canopy-hatch", "ice-mine-relay", "ice-return-hatch",
      ...specs.flatMap(spec => [spec.gateId, spec.shortcutId])],
  });
  for (const id of missionIds) {
    for (const progress of [api.defaultExplorationProgress(), complete]) {
      const world = worldFor(id, progress);
      const start = bodyAt(world.spawn.x);
      const result = travel(start, world, world.extraction.x, { frames: 3600 });
      assert.ok(result.body.x >= world.extraction.x - SPEED * DT, id + " story-floor obstruction");
      assert.ok(atFloor(result.body, world.floorY));
      assert.deepEqual(plain(api.validateWorldBlueprint(world)), []);
    }
  }
});

test("completed map objectives and neutralized danger agree with saved world state", () => {
  for (const spec of specs) {
    const noBoost = api.expansionRegionMapSnapshot(spec.missionId, api.defaultExplorationProgress(), 500, 500);
    assert.equal(noBoost.entry.opened, false);
    assert.match(noBoost.objective, /impulsion aérienne de la jungle/);
    let progress = unlockFromModule(spec);
    progress = api.mergeExplorationProgress(progress, {
      secretIds: [spec.secretId], discoveredRoomIds: spec.rooms.map(room => room.id),
    });
    const partial = api.expansionRegionMapSnapshot(spec.missionId, progress, 500, 500);
    assert.match(partial.danger, /^Neutralisé/);
    assert.equal(api.expansionRegionHazards(spec.missionId, progress).length, 0);
    if (!progress.abilityIds.includes(spec.shortcutRequirement)) {
      assert.match(partial.objective, /Reprendre la chasse ; revenir/);
    }
    progress = api.mergeExplorationProgress(progress, {
      abilityIds: [spec.shortcutRequirement], openedGateIds: [spec.shortcutId],
    });
    const completed = api.expansionRegionMapSnapshot(spec.missionId, progress, 500, 500);
    assert.match(completed.objective, /Branche explorée/);
    assert.notEqual(completed.objective, spec.copy.shortcutLabel);
  }
});

test("the local map distinguishes boosted ascent, biome gate, future shortcut and always-open story road", () => {
  const spec = specs[0];
  const progress = api.mergeExplorationProgress(initial(), {
    discoveredRoomIds: spec.rooms.map(room => room.id),
  });
  const html = renderToStaticMarkup(createElement(api.ExpansionExplorationMap, {
    missionId: spec.missionId, progress, playerX: 500, playerY: 500,
  }));
  const connection = access => html.match(new RegExp('data-access="' + access + '" data-opened="([^"]+)"'))?.[1];
  assert.equal(connection("entry"), "true");
  assert.equal(connection("gate"), "false");
  assert.equal(connection("shortcut"), "false");
  assert.equal(connection("free"), "true");
  assert.ok(html.includes("Chemin principal — ouvert"));
  assert.ok(html.includes("Impulsion aérienne de la jungle"));
});

test("world changes stay idempotent and rebuilding a saved unlocked branch preserves access", () => {
  for (const spec of specs) {
    const progress = api.mergeExplorationProgress(unlockFromModule(spec), {
      openedGateIds: [spec.shortcutId], abilityIds: [spec.shortcutRequirement],
    });
    const once = worldFor(spec.missionId, progress);
    const restored = worldFor(spec.missionId, JSON.parse(JSON.stringify(progress)));
    assert.deepEqual(plain(restored), plain(once));
    assert.deepEqual(plain(api.applyExplorationWorld(once, progress)), plain(once));
    assert.equal(once.platforms.filter(platform => platform.id === spec.prefix + "-vault-underfloor").length, 1);
    assert.ok(!once.platforms.some(platform => platform.id === spec.gateId || platform.id === spec.shortcutId));
  }
});
