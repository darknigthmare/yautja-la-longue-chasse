import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { drawMudFootstep, drawWorldHazard } from "../app/game/worldHazardRendering.ts";

const compiled = await build({
  entryPoints: ["app/game/systems/worldBlueprints.ts"],
  bundle: true, write: false, platform: "node", format: "esm",
});
const { WORLD_BLUEPRINTS_BY_MISSION, hazardPhaseAt, isHazardActive } = await import(
  'data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString("base64")
);
const hazards = new Map(Object.values(WORLD_BLUEPRINTS_BY_MISSION)
  .flatMap(world => world.hazards).map(hazard => [hazard.kind, hazard]));

function observe() {
  const commands = [];
  const ctx = new Proxy({}, {
    get(_target, property) {
      if (property === "createLinearGradient") {
        return (...args) => {
          commands.push([property, ...args]);
          return { addColorStop(...stop) { commands.push(["stop", ...stop]); } };
        };
      }
      return (...args) => commands.push([property, ...args]);
    },
    set(_target, property, value) {
      commands.push([property, value]);
      return true;
    },
  });
  return { ctx, commands };
}

function paint(hazard, time, reducedMotion = false, windX = 0) {
  const { ctx, commands } = observe();
  drawWorldHazard(ctx, hazard, hazardPhaseAt(hazard, time), time, reducedMotion, windX);
  return commands;
}

test("all 22 authored world kinds paint inside the simulated geometry", () => {
  assert.equal(hazards.size, 22);
  for (const [kind, hazard] of hazards) {
    const elapsed = hazard.cycle ? -hazard.cycle.phaseSeconds + 0.05 : 1;
    assert.equal(isHazardActive(hazard, elapsed), true, kind);
    const commands = paint(hazard, elapsed);
    assert.deepEqual(commands.slice(0, 5), [
      ["save"], ["translate", hazard.x, hazard.y], ["beginPath"],
      ["rect", 0, 0, hazard.width, hazard.height], ["clip"],
    ], kind);
    assert.deepEqual(commands.at(-1), ["restore"], kind);
    assert.ok(commands.some(([name]) => name === "fill" || name === "stroke"));
  }
});

test("warning geometry differs from active contact and inactive hazards issue no effect commands", () => {
  for (const [kind, hazard] of hazards) {
    if (!hazard.cycle) continue;
    const { periodSeconds, phaseSeconds, activeSeconds } = hazard.cycle;
    const warning = periodSeconds - phaseSeconds - hazard.telegraphSeconds / 2;
    const active = periodSeconds - phaseSeconds + activeSeconds / 2;
    const inactive = (periodSeconds - hazard.telegraphSeconds + activeSeconds) / 2 - phaseSeconds;
    assert.equal(hazardPhaseAt(hazard, warning), "telegraph", kind);
    assert.equal(isHazardActive(hazard, warning), false, kind);
    assert.equal(isHazardActive(hazard, active), true, kind);
    const before = paint(hazard, warning);
    const after = paint(hazard, active);
    assert.ok(before.some(([cmd, dash]) => cmd === "setLineDash" && dash.length === 2), kind);
    assert.ok(after.some(([cmd, dash]) => cmd === "setLineDash" && dash.length === 0), kind);
    assert.notDeepEqual(before, after, kind);
    assert.deepEqual(paint(hazard, inactive), [], kind);
  }
});

test("reduced motion fixes effect geometry while snow responds to live wind in standard mode", () => {
  for (const [kind, hazard] of hazards) {
    if (!hazard.cycle) continue;
    const start = hazard.cycle.periodSeconds - hazard.cycle.phaseSeconds;
    const seconds = hazard.telegraphSeconds;
    assert.deepEqual(paint(hazard, start - seconds * 0.9, true, -50),
      paint(hazard, start - seconds * 0.1, true, 50), kind);
    assert.notDeepEqual(paint(hazard, start - seconds * 0.1, true),
      paint(hazard, start + 0.1, true), kind);
  }
  const whiteout = hazards.get("whiteout");
  const now = whiteout.cycle.periodSeconds - whiteout.cycle.phaseSeconds + 0.2;
  assert.notDeepEqual(paint(whiteout, now, false, -50), paint(whiteout, now, false, 50));
});

test("mud sprays draw six droplets only during the native footprint window", () => {
  const { ctx, commands } = observe();
  drawMudFootstep(ctx, 40, 70, 1, -0.01);
  drawMudFootstep(ctx, 40, 70, 1, 0.36);
  assert.deepEqual(commands, []);
  drawMudFootstep(ctx, 40, 70, 1, 0.1);
  assert.equal(commands.filter(([command]) => command === "arc").length, 6);
  assert.deepEqual(commands.at(-1), ["restore"]);
});
