import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

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

const meleePromise = importTypeScriptModule(
  "../app/game/systems/huntMeleeCombat.ts",
);

const profile = {
  weaponId: "wristblades",
  damage: 30,
  cooldownSeconds: 0.26,
  reachPx: 112,
  maxTargetHits: 2,
  noiseLoudness: 0.5,
  noiseRadius: 280,
};

function startAttack(melee, facing = 1) {
  const request = melee.requestHuntMeleeAttack(
    melee.createHuntMeleeState(),
    profile,
    facing,
  );
  assert.equal(request.accepted, true);
  assert.equal(request.started, true);
  return request.state;
}

function advanceToActive(melee, state) {
  const attack = melee.currentHuntMeleeAttack(state);
  const step = melee.stepHuntMeleeCombat(
    state,
    state.phase === "startup" ? state.phaseRemainingSeconds : attack.startupSeconds,
  );
  assert.equal(step.state.phase, "active");
  return step.state;
}

test("a campaign strike has deterministic startup, active and recovery", async () => {
  const melee = await meleePromise;
  let state = startAttack(melee);
  const attack = melee.currentHuntMeleeAttack(state);
  assert.equal(state.phase, "startup");
  assert.equal(attack.damage, profile.damage);

  state = melee.stepHuntMeleeCombat(
    state,
    attack.startupSeconds - 0.001,
  ).state;
  assert.equal(state.phase, "startup");
  const active = melee.stepHuntMeleeCombat(state, 0.001);
  state = active.state;
  assert.equal(state.phase, "active");
  assert.deepEqual(active.enteredActiveActionIds, [state.actionSequence]);

  state = melee.stepHuntMeleeCombat(state, attack.activeSeconds).state;
  assert.equal(state.phase, "recovery");
  state = melee.stepHuntMeleeCombat(state, attack.recoverySeconds).state;
  assert.equal(state.phase, "idle");
});

test("hitboxes and target registration exist only during active frames", async () => {
  const melee = await meleePromise;
  const actor = { x: 200, y: 300, width: 72, height: 116, facing: 1 };
  let rightState = startAttack(melee, 1);
  assert.equal(melee.resolveHuntMeleeHitbox(rightState, actor), null);
  assert.equal(melee.canHuntMeleeHitTarget(rightState, "prey-a"), false);
  assert.deepEqual(
    melee.registerHuntMeleeTargetHit(rightState, "prey-a").hitTargetIds,
    [],
  );

  rightState = advanceToActive(melee, rightState);
  const leftState = advanceToActive(melee, startAttack(melee, -1));
  const right = melee.resolveHuntMeleeHitbox(rightState, actor);
  const left = melee.resolveHuntMeleeHitbox(leftState, actor);
  assert.ok(right.x >= actor.x + actor.width / 2);
  assert.ok(left.x + left.width <= actor.x + actor.width / 2);
  assert.equal(
    melee.huntMeleeHitboxOverlaps(right, {
      x: actor.x + actor.width,
      y: actor.y + 20,
      width: 50,
      height: 80,
    }),
    true,
  );
  assert.equal(
    melee.huntMeleeHitboxOverlaps(right, {
      x: actor.x - 70,
      y: actor.y + 20,
      width: 50,
      height: 80,
    }),
    false,
  );

  const attack = melee.currentHuntMeleeAttack(rightState);
  const recovery = melee.stepHuntMeleeCombat(
    rightState,
    rightState.phaseRemainingSeconds,
  ).state;
  assert.equal(recovery.phase, "recovery");
  assert.equal(melee.resolveHuntMeleeHitbox(recovery, actor), null);
  assert.equal(melee.canHuntMeleeHitTarget(recovery, "prey-a"), false);
  assert.equal(attack.activeSeconds > 0, true);
});

test("one active action hits each target once and respects its authored cap", async () => {
  const melee = await meleePromise;
  let state = advanceToActive(melee, startAttack(melee));
  assert.equal(melee.canHuntMeleeHitTarget(state, "prey-a"), true);
  state = melee.registerHuntMeleeTargetHit(state, "prey-a");
  assert.equal(melee.canHuntMeleeHitTarget(state, "prey-a"), false);
  assert.deepEqual(
    melee.registerHuntMeleeTargetHit(state, "prey-a").hitTargetIds,
    ["prey-a"],
  );
  state = melee.registerHuntMeleeTargetHit(state, "prey-b");
  assert.equal(melee.canHuntMeleeHitTarget(state, "prey-c"), false);
  assert.deepEqual(state.hitTargetIds, ["prey-a", "prey-b"]);
});

test("buffer rejects early presses and accepts only the late active or recovery window", async () => {
  const melee = await meleePromise;
  let state = startAttack(melee);
  const startupSnapshot = structuredClone(state);
  let request = melee.requestHuntMeleeAttack(state, profile, 1);
  assert.equal(request.accepted, false, "startup mash must not spend a queued attack");
  assert.deepEqual(request.state, startupSnapshot);

  state = advanceToActive(melee, state);
  request = melee.requestHuntMeleeAttack(state, profile, 1);
  assert.equal(request.accepted, false, "early active press remains outside the buffer");

  state = melee.stepHuntMeleeCombat(state, 0.031).state;
  assert.equal(melee.isHuntMeleeBufferWindowOpen(state), true);
  request = melee.requestHuntMeleeAttack(state, profile, 1);
  assert.equal(request.accepted, true);
  assert.equal(request.started, false);
  state = request.state;

  let attack = melee.currentHuntMeleeAttack(state);
  let step = melee.stepHuntMeleeCombat(
    state,
    state.phaseRemainingSeconds + attack.recoverySeconds,
  );
  state = step.state;
  assert.equal(state.phase, "startup");
  assert.equal(state.comboIndex, 1);
  assert.deepEqual(step.startedComboIndexes, [1]);
  assert.ok(melee.currentHuntMeleeAttack(state).damage > attack.damage);

  state = advanceToActive(melee, state);
  attack = melee.currentHuntMeleeAttack(state);
  state = melee.stepHuntMeleeCombat(state, state.phaseRemainingSeconds).state;
  assert.equal(state.phase, "recovery");
  request = melee.requestHuntMeleeAttack(state, profile, 1);
  assert.equal(request.accepted, false, "early recovery remains outside the buffer");

  state = melee.stepHuntMeleeCombat(state, 0.02).state;
  assert.equal(melee.isHuntMeleeBufferWindowOpen(state), true);
  request = melee.requestHuntMeleeAttack(state, profile, 1);
  assert.equal(request.accepted, true);
  state = request.state;
  step = melee.stepHuntMeleeCombat(state, state.phaseRemainingSeconds);
  state = step.state;
  assert.equal(state.phase, "startup");
  assert.equal(state.comboIndex, 2);
  assert.equal(melee.currentHuntMeleeAttack(state).damage, profile.damage * 1.38);
  assert.equal(melee.requestHuntMeleeAttack(state, profile, 1).accepted, false);
});


test("the same timed input stream always produces the same melee state", async () => {
  const melee = await meleePromise;
  const run = () => {
    let state = melee.createHuntMeleeState();
    for (let frame = 0; frame < 90; frame += 1) {
      if (frame === 0 || frame === 8 || frame === 24) {
        state = melee.requestHuntMeleeAttack(state, profile, 1).state;
      }
      state = melee.stepHuntMeleeCombat(state, 1 / 60).state;
    }
    return state;
  };
  assert.deepEqual(run(), run());
});

test("legacy or malformed saved melee state recovers safely to idle", async () => {
  const melee = await meleePromise;
  assert.deepEqual(
    melee.normalizeHuntMeleeState(undefined),
    melee.createHuntMeleeState(),
  );
  assert.equal(
    melee.normalizeHuntMeleeState({
      phase: "active",
      profile: { weaponId: "wristblades", damage: "fatal" },
    }).phase,
    "idle",
  );
});

test("HuntCanvas consumes the pure melee phases and applies real hit reactions", async () => {
  const source = await readFile(
    new URL("../app/game/HuntCanvas.tsx", import.meta.url),
    "utf8",
  );
  for (const marker of [
    'from "./systems/huntMeleeCombat"',
    "stepHuntMeleeCombat(player.melee, delta)",
    "resolveHuntMeleeHitbox(player.melee, player)",
    "huntMeleeHitboxOverlaps(hitbox, enemy)",
    "registerHuntMeleeTargetHit(player.melee, enemy.id)",
    "enemy.hitStunSeconds",
    "enemy.knockbackVelocityX",
    "stepEnemyMeleeHitReaction(",
  ]) {
    assert.ok(source.includes(marker), `missing live melee integration: ${marker}`);
  }
  assert.doesNotMatch(
    source,
    /\.filter\(\(entry\) => entry\.separation <= meleeAttack\.meleeReachPx\)/,
  );

  const meleeRequestGate = source.indexOf("if (!request.accepted) return;");
  const staminaPayment = source.indexOf(
    "player.stamina = Math.max(0, player.stamina - meleeAttack.staminaCost);",
    meleeRequestGate,
  );
  assert.ok(
    meleeRequestGate >= 0 && staminaPayment > meleeRequestGate,
    "a rejected early buffer press must return before stamina is spent",
  );

  const bossUpdate = source.indexOf("function updateBoss(");
  const bossReaction = source.indexOf("const bossReacting =", bossUpdate);
  const bossMechanics = source.indexOf(
    "stepBossMechanics(state.bossMechanics",
    bossUpdate,
  );
  assert.ok(
    bossReaction > bossUpdate && bossReaction < bossMechanics,
    "boss melee reaction must resolve before any boss mechanic decision",
  );
  for (const persistentEffect of [
    "purge-detonated",
    "guardian-adaptive-warning",
    "guardian-adaptive-field",
  ]) {
    assert.ok(
      source.includes(`  "${persistentEffect}",`),
      `missing explicit hitstun-safe passive: ${persistentEffect}`,
    );
  }
});
