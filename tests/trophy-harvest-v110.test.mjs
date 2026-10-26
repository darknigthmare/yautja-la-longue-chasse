import assert from "node:assert/strict";
import { build } from "esbuild";
import test from "node:test";

const compiled = await build({
  entryPoints: ["app/game/systems/trophyHarvestV110.ts"],
  bundle: true, write: false, platform: "node", format: "esm", logLevel: "silent",
});
const h = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const source = () => ({
  id: "canopy-guard", archetype: "heavy",
  x: 80, y: -240, width: 40, height: 80,
  health: 0, alive: false, active: true, boss: false,
});
const drop = () => ({
  enemyRuntimeId: "canopy-guard", sourceEnemyId: "heavy", collected: false,
  claim: { sourceEnemyId: "heavy" },
});
const player = () => ({ x: 60, y: -240, width: 40, height: 80, grounded: true, climbing: false });

test("a canopy trophy stays on the actual corpse rather than the world floor", () => {
  const body = source();
  assert.deepEqual(h.trophyHarvestPoint(body), { x: 100, y: -184 });
  body.y += 160;
  assert.deepEqual(h.trophyHarvestPoint(body), { x: 100, y: -24 });
  assert.equal(h.trophyHarvestInReach(player(), h.trophyHarvestPoint(source()), []), true);
  assert.equal(h.trophyHarvestInReach(player(), h.trophyHarvestPoint(body), []), false);
});

test("secondary provenance requires the same defeated active non-boss actor and claim", () => {
  const body = source();
  assert.equal(h.trophyHarvestSourceForDrop(drop(), [body]), body);
  for (const changes of [
    { id: "other" }, { archetype: "other" }, { alive: true },
    { active: false }, { boss: true }, { health: 1 }, { health: -1 },
    { x: Number.NaN }, { height: 0 },
  ]) assert.equal(h.trophyHarvestSourceForDrop(drop(), [{ ...body, ...changes }]), null);
  assert.equal(h.trophyHarvestSourceForDrop({ ...drop(), collected: true }, [body]), null);
  assert.equal(h.trophyHarvestSourceForDrop({ ...drop(), claim: { sourceEnemyId: "other" } }, [body]), null);
  assert.equal(h.trophyHarvestSourceForDrop(drop(), []), null);
  assert.equal(h.trophyHarvestSourceForDrop({ ...drop(), claim: null }, [body]), null);
  assert.equal(h.trophyHarvestSourceForDrop({ ...drop(), collected: undefined }, [body]), null);
});

test("stable footing is required throughout a field rite, including after a fall or climb", () => {
  const target = h.trophyHarvestPoint(source());
  assert.equal(h.trophyHarvestInReach(player(), target, []), true);
  assert.equal(h.trophyHarvestInReach({ ...player(), grounded: false }, target, []), false);
  assert.equal(h.trophyHarvestInReach({ ...player(), climbing: true }, target, []), false);
});

test("a close corpse behind a solid wall cannot be harvested; a one-way ledge is not a wall", () => {
  const target = { x: 160, y: -200 };
  const wall = { x: 110, y: -260, width: 10, height: 100, collision: "solid" };
  assert.equal(h.trophyHarvestInReach(player(), target, []), true);
  assert.equal(h.trophyHarvestInReach(player(), target, [wall]), false);
  assert.equal(h.trophyHarvestInReach(player(), target, [{ ...wall, collision: "one-way" }]), true);
});

test("vertical separation and drift must still satisfy the reach at the final gesture", () => {
  const center = { x: 80, y: -200 };
  assert.equal(h.trophyHarvestInReach(player(), { x: center.x + h.SECONDARY_TROPHY_REACH, y: center.y }, []), true);
  assert.equal(h.trophyHarvestInReach(player(), { x: center.x + h.SECONDARY_TROPHY_REACH + .01, y: center.y }, []), false);
  assert.equal(h.trophyHarvestInReach(player(), { x: center.x, y: center.y + 111 }, []), false);
  assert.equal(h.trophyHarvestInReach(player(), { x: center.x, y: center.y + 120 }, [], h.APEX_TROPHY_REACH), true);
});

test("malformed body, target or reach never grants access", () => {
  for (const changes of [{ width: 0 }, { height: -1 }, { x: Number.POSITIVE_INFINITY }])
    assert.equal(h.trophyHarvestInReach({ ...player(), ...changes }, { x: 80, y: -200 }, []), false);
  for (const target of [{ x: Number.NaN, y: -200 }, { x: 80, y: Number.POSITIVE_INFINITY }])
    assert.equal(h.trophyHarvestInReach(player(), target, []), false);
  for (const reach of [0, -1, Number.NaN])
    assert.equal(h.trophyHarvestInReach(player(), { x: 80, y: -200 }, [], reach), false);
});
