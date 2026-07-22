import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = await mkdtemp(join(tmpdir(), "yautja-galaxy-flight-"));

await build({
  configFile: false,
  publicDir: false,
  logLevel: "silent",
  build: {
    emptyOutDir: true,
    outDir: outputDirectory,
    ssr: resolve(projectRoot, "app/game/galaxyFlight.ts"),
    rollupOptions: {
      output: { entryFileNames: "galaxy-flight.mjs" },
    },
  },
});

const {
  DEFAULT_GALAXY_FLIGHT_CONFIG,
  cancelGalaxyAutopilot,
  clampGalaxyFlightPosition,
  createGalaxyFlightState,
  engageGalaxyAutopilot,
  galaxyFlightDistance,
  galaxyFlightPointFromMapPosition,
  galaxyFlightReturnAnchorId,
  hasGalaxyFlightArrived,
  isGalaxyFlightNear,
  normalizeGalaxyFlightInput,
  stepGalaxyFlight,
} = await import(pathToFileURL(join(outputDirectory, "galaxy-flight.mjs")).href);

after(async () => {
  await rm(outputDirectory, { force: true, recursive: true });
});

function advance(state, input, frameCount, frameMs, target = null, config) {
  let next = state;
  for (let frame = 0; frame < frameCount; frame += 1) {
    next = stepGalaxyFlight(next, input, frameMs, target, config);
  }
  return next;
}

function assertFiniteState(state) {
  assert.ok(Number.isFinite(state.position.x));
  assert.ok(Number.isFinite(state.position.y));
  assert.ok(Number.isFinite(state.velocity.x));
  assert.ok(Number.isFinite(state.velocity.y));
  assert.ok(Number.isFinite(state.heading));
}

test("normalizes diagonal, oversized and invalid control vectors", () => {
  const diagonal = normalizeGalaxyFlightInput({ x: 1, y: 1 });
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-12);
  assert.ok(Math.abs(diagonal.x - Math.SQRT1_2) < 1e-12);
  assert.deepEqual(normalizeGalaxyFlightInput({ x: 0.25, y: -0.5 }), {
    x: 0.25,
    y: -0.5,
  });
  assert.deepEqual(normalizeGalaxyFlightInput({ x: Number.NaN, y: Infinity }), {
    x: 0,
    y: 0,
  });
});

test("manual integration is reasonably frame-rate independent", () => {
  const initial = createGalaxyFlightState({ position: { x: 15, y: 50 } });
  const at60Fps = advance(initial, { x: 1, y: 0 }, 60, 1000 / 60);
  const at30Fps = advance(initial, { x: 1, y: 0 }, 30, 1000 / 30);

  assert.ok(Math.abs(at60Fps.position.x - at30Fps.position.x) < 0.02);
  assert.ok(Math.abs(at60Fps.velocity.x - at30Fps.velocity.x) < 0.02);
  assert.ok(Math.hypot(at60Fps.velocity.x, at60Fps.velocity.y) <= 24 + 1e-9);
  assert.equal(at60Fps.heading, 0);
});

test("ship stays inside 0..100 and loses outward velocity on an edge", () => {
  const clamped = clampGalaxyFlightPosition({ x: -42, y: 140 });
  assert.deepEqual(clamped, { x: 0, y: 100 });

  const initial = createGalaxyFlightState({
    position: { x: 99.5, y: 50 },
    velocity: { x: 20, y: 0 },
  });
  const edge = advance(initial, { x: 1, y: 0 }, 90, 1000 / 60);
  assert.equal(edge.position.x, 100);
  assert.equal(edge.velocity.x, 0);
  assert.equal(edge.position.y, 50);
});

test("wide-screen map coordinates respect aspect-scaled bounds", () => {
  const bounds = { minX: 10, maxX: 240, minY: 8, maxY: 82 };
  const initial = createGalaxyFlightState({
    position: { x: 238, y: 80 },
    velocity: { x: 18, y: 18 },
    bounds,
  });
  const edge = advance(initial, { x: 1, y: 1 }, 90, 1000 / 60, null, {
    bounds,
  });

  assert.deepEqual(edge.position, { x: 240, y: 82 });
  assert.deepEqual(edge.velocity, { x: 0, y: 0 });
  assertFiniteState(edge);
});

test("drag brings an unpowered ship to a deterministic stop", () => {
  let state = createGalaxyFlightState({ position: { x: 10, y: 40 } });
  state = advance(state, { x: 1, y: 0 }, 60, 1000 / 60);
  assert.ok(state.velocity.x > 10);

  state = advance(state, { x: 0, y: 0 }, 240, 1000 / 60);
  assert.deepEqual(state.velocity, { x: 0, y: 0 });
  const stoppedAt = { ...state.position };
  state = advance(state, { x: 0, y: 0 }, 30, 1000 / 60);
  assert.deepEqual(state.position, stoppedAt);
});

test("autopilot brakes, reaches its exact target and cannot overshoot", () => {
  const target = { id: "system-nivalis", position: { x: 34, y: 28 } };
  let state = engageGalaxyAutopilot(
    createGalaxyFlightState({ position: { x: 8, y: 12 } }),
    target.id,
  );
  let closestDistance = galaxyFlightDistance(state.position, target.position);

  for (let frame = 0; frame < 600 && state.mode === "autopilot"; frame += 1) {
    state = stepGalaxyFlight(state, { x: 0, y: 0 }, 1000 / 60, target);
    const distance = galaxyFlightDistance(state.position, target.position);
    assert.ok(distance <= closestDistance + 1e-8);
    closestDistance = distance;
  }

  assert.equal(state.mode, "manual");
  assert.equal(state.targetId, null);
  assert.deepEqual(state.position, target.position);
  assert.deepEqual(state.velocity, { x: 0, y: 0 });
  assert.equal(hasGalaxyFlightArrived(state.position, target.position), true);
});

test("manual input cancels autopilot in the same simulation step", () => {
  const target = { id: "system-cinder", position: { x: 85, y: 20 } };
  const autopilot = engageGalaxyAutopilot(
    createGalaxyFlightState({ position: { x: 20, y: 20 } }),
    target.id,
  );
  const manual = stepGalaxyFlight(
    autopilot,
    { x: 0, y: 1 },
    1000 / 60,
    target,
  );

  assert.equal(manual.mode, "manual");
  assert.equal(manual.targetId, null);
  assert.ok(manual.velocity.y > 0);
  assert.equal(cancelGalaxyAutopilot(manual), manual);
});

test("interaction proximity defaults to five map units", () => {
  assert.equal(DEFAULT_GALAXY_FLIGHT_CONFIG.interactionRadius, 5);
  assert.equal(isGalaxyFlightNear({ x: 5, y: 5 }, { x: 8, y: 9 }), true);
  assert.equal(isGalaxyFlightNear({ x: 5, y: 5 }, { x: 8.1, y: 9.1 }), false);
  assert.equal(galaxyFlightDistance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
});

test("maps visual node coordinates into aspect-correct flight coordinates", () => {
  assert.deepEqual(
    galaxyFlightPointFromMapPosition({ x: 27, y: 38 }, 2.5),
    { x: 67.5, y: 38 },
  );
  assert.deepEqual(
    galaxyFlightPointFromMapPosition({ x: Number.NaN, y: Infinity }, 0),
    { x: 50, y: 50 },
  );
});

test("return anchors preserve the exact node exited at every flight level", () => {
  const planetPath = {
    level: "planet",
    sectorId: "sector-osiris",
    systemId: "system-osiris",
    planetId: "planet-osiris-iv",
  };
  assert.equal(galaxyFlightReturnAnchorId(planetPath, "system"), "planet-osiris-iv");
  assert.equal(galaxyFlightReturnAnchorId(planetPath, "sector"), "system-osiris");
  assert.equal(galaxyFlightReturnAnchorId(planetPath, "galaxy"), "sector-osiris");

  const systemPath = { ...planetPath, level: "system", planetId: null };
  assert.equal(galaxyFlightReturnAnchorId(systemPath, "sector"), "system-osiris");
  assert.equal(galaxyFlightReturnAnchorId(systemPath, "galaxy"), "sector-osiris");
  assert.equal(galaxyFlightReturnAnchorId(systemPath, "system"), null);

  const sectorPath = { ...systemPath, level: "sector", systemId: null };
  assert.equal(galaxyFlightReturnAnchorId(sectorPath, "galaxy"), "sector-osiris");
  assert.equal(galaxyFlightReturnAnchorId(sectorPath, "sector"), null);
});

test("autopilot arrival waits for an explicit activation before entering", async () => {
  const source = await readFile(
    resolve(projectRoot, "app/game/GalaxyMapPanel.tsx"),
    "utf8",
  );
  const arrivalStart = source.indexOf(
    'if (target && current.mode === "autopilot"',
  );
  const arrivalEnd = source.indexOf("\n        }", arrivalStart) + 10;
  const arrivalBlock = source.slice(arrivalStart, arrivalEnd);

  assert.ok(arrivalStart >= 0);
  assert.match(arrivalBlock, /setFlightMessage/);
  assert.doesNotMatch(arrivalBlock, /openItem/);

  const activationStart = source.indexOf("const launchActive = useCallback");
  const activationEnd = source.indexOf("\n\n  useEffect", activationStart);
  const activationBlock = source.slice(activationStart, activationEnd);
  assert.match(activationBlock, /isGalaxyFlightNear/);
  assert.match(activationBlock, /openItem\(activeItem\)/);
});

test("corrupt state, input, timing and tuning never produce NaN", () => {
  const corrupt = {
    position: { x: Number.NaN, y: Infinity },
    velocity: { x: -Infinity, y: Number.NaN },
    heading: Number.NaN,
    mode: "autopilot",
    targetId: "missing-target",
  };
  const state = stepGalaxyFlight(
    corrupt,
    { x: Infinity, y: Number.NaN },
    Infinity,
    null,
    {
      acceleration: Number.NaN,
      drag: Infinity,
      bounds: { minX: Number.NaN, maxY: Infinity },
    },
  );

  assertFiniteState(state);
  assert.deepEqual(state.position, { x: 50, y: 50 });
  assert.deepEqual(state.velocity, { x: 0, y: 0 });
  assert.equal(state.mode, "manual");
  assert.equal(state.targetId, null);
});
