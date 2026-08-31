import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { sweptProjectileImpactTime, stepSmartDiscFlight, calculateLineOfSightOcclusion, resolveHunterSplashDamage } from "../app/game/systems/huntSystems.ts";

const source = await readFile(new URL("../app/game/HuntCanvas.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("HuntCanvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function runtimeFunction(name, dependencies) {
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration);
  const code = ts.transpileModule(declaration.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  return runInNewContext(`${code}\n${name};`, dependencies);
}
const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const cover = (id, x, overrides = {}) => ({ id, x, y: 0, width: 4, height: 100, protection: 1, destructible: false, ...overrides });
const enemy = (id, x, overrides = {}) => ({ id, x, y: 40, width: 8, height: 20, active: true, alive: true, health: 100, ...overrides });
function fixture(overrides = {}) {
  const projectile = { x: 0, y: 50, velocityX: 6000, velocityY: 0, radius: 2, life: 1, damage: 25, hostile: false, coverGraceSeconds: 0, weaponId: "yautja-bow", recovery: "none", maxTargetHits: 1, ...overrides };
  const state = { projectiles: [projectile], world: { width: 1000, floorY: 100, covers: [] }, brokenPillarIds: new Set(), screenShakeEnabled: false, enemies: [], boss: enemy("boss", 900, { active: false }), player: { x: 500, y: 40, width: 40, height: 50 } };
  const hits = [], playerHits = [], recovered = [];
  const dependencies = { sweptProjectileImpactTime, stepSmartDiscFlight, calculateLineOfSightOcclusion, resolveHunterSplashDamage, overlaps, VIEW_HEIGHT: 720,
    distance: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
    damageEnemy: (_state, _mission, target, amount) => { hits.push([target.id, amount]); target.health -= amount; if (target.health <= 0) target.alive = false; },
    hurtPlayer: (_state, amount) => playerHits.push(amount),
    restoreProjectileAmmo: (_state, shot) => recovered.push(shot),
    recordPlasmaRestraintViolation() {},
    settleRecoverableProjectile: runtimeFunction("settleRecoverableProjectile", { clamp: (n, low, high) => Math.max(low, Math.min(high, n)) }),
  };
  const update = runtimeFunction("updateProjectiles", dependencies);
  return { projectile, state, hits, playerHits, recovered, step: () => update(state, {}, 1 / 60) };
}

test("sweep catches a thin obstacle crossed between two frames", () => {
  assert.equal(sweptProjectileImpactTime({ x: 0, y: 50 }, { x: 100, y: 50 }, 2, cover("wall", 40)), 0.38);
  assert.equal(sweptProjectileImpactTime({ x: 100, y: 50 }, { x: 0, y: 50 }, 2, cover("wall", 40)), 0.54);
});

test("sweep avoids diagonal broad-phase false positives and rejects invalid input", () => {
  assert.equal(sweptProjectileImpactTime({ x: 0, y: 0 }, { x: 100, y: 100 }, 2, { x: 60, y: 10, width: 4, height: 4 }), null);
  assert.equal(sweptProjectileImpactTime({ x: 42, y: 50 }, { x: 42, y: 50 }, 2, cover("wall", 40)), 0);
  assert.equal(sweptProjectileImpactTime({ x: NaN, y: 0 }, { x: 100, y: 0 }, 2, cover("wall", 40)), null);
  assert.equal(sweptProjectileImpactTime({ x: 0, y: 0 }, { x: 100, y: 0 }, -1, cover("wall", 40)), null);
});

test("nearest cover stops a shot before a farther enemy regardless of array ordering", () => {
  const f = fixture({ damage: 100 });
  f.state.world.covers = [cover("far", 80, { destructible: true }), cover("near", 40, { destructible: true })];
  f.state.enemies = [enemy("behind-wall", 70)];
  f.step();
  assert.equal(f.state.projectiles.length, 0);
  assert.deepEqual([...f.state.brokenPillarIds], ["near"]);
  assert.equal(f.projectile.x, 38);
  assert.deepEqual(f.hits, []);
});

test("a prey before cover is hit at contact rather than losing the shot to the wall behind it", () => {
  const f = fixture();
  f.state.world.covers = [cover("wall", 80)];
  f.state.enemies = [enemy("near", 20)];
  f.step();
  assert.deepEqual(f.hits, [["near", 25]]);
  assert.equal(f.projectile.x, 18);
  assert.equal(f.state.projectiles.length, 0);
});

test("piercing hit limits follow spatial order and never reach through intact cover", () => {
  const f = fixture({ maxTargetHits: 3 });
  f.state.world.covers = [cover("wall", 60)];
  f.state.enemies = [enemy("behind", 80), enemy("middle", 40), enemy("near", 20)];
  f.step();
  assert.deepEqual(f.hits.map(hit => hit[0]), ["near", "middle"]);
  assert.deepEqual(Array.from(f.projectile.hitEnemyIds), ["near", "middle"]);
  assert.equal(f.state.projectiles.length, 0);
});

test("hostile shots use the same sweep and cover protects the hunter", () => {
  const exposed = fixture({ hostile: true }); exposed.state.player.x = 30; exposed.step();
  assert.deepEqual(exposed.playerHits, [25]);
  const protectedHunter = fixture({ hostile: true });
  protectedHunter.state.player.x = 50; protectedHunter.state.world.covers = [cover("wall", 30)];
  protectedHunter.step(); assert.deepEqual(protectedHunter.playerHits, []);
});

test("recoverable weapons settle at the obstacle rather than teleporting through it", () => {
  const f = fixture({ recovery: "pickup" }); f.state.world.covers = [cover("wall", 40)]; f.step();
  assert.equal(f.state.projectiles.length, 1);
  assert.equal(f.projectile.x, 38);
  assert.equal(f.projectile.spentPickup, true);
  assert.equal(f.projectile.damage, 0);
});

test("a returning weapon stops its outbound step at its final allowed hit", () => {
  const f = fixture({ recovery: "return", maxTargetHits: 1 });
  f.state.enemies = [enemy("near", 20)]; f.state.world.covers = [cover("wall", 70)]; f.step();
  assert.equal(f.projectile.returning, true);
  assert.equal(f.projectile.x, 18);
  assert.equal(f.state.projectiles.length, 1);
  assert.deepEqual(f.hits, [["near", 25]]);
});

test("destroyed cover and inactive enemies never absorb the trajectory", () => {
  const f = fixture(); f.state.world.covers = [cover("destroyed", 20)]; f.state.brokenPillarIds.add("destroyed");
  f.state.enemies = [enemy("inactive", 30, { active: false }), enemy("live", 70)]; f.step();
  assert.deepEqual(f.hits, [["live", 25]]);
});


test("solid gallery floor blocks an ascending hostile shot but one-way ledges remain permeable", () => {
  for (const collision of ["solid", "one-way"]) {
    const f = fixture({ hostile: true, x: 50, y: 100, velocityX: 0, velocityY: -6000 });
    f.state.player = { x: 30, y: 0, width: 40, height: 20 };
    f.state.world.platforms = [{ id: "gallery", x: 0, y: 45, width: 200, height: 4, collision }];
    f.step();
    assert.equal(f.playerHits.length, collision === "solid" ? 0 : 1);
    assert.equal(f.state.brokenPillarIds.size, 0, "structural walls cannot be destroyed by projectiles");
  }
});
