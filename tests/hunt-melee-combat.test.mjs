import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
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


test("advanced hunt techniques expose authored risk, target locks and contextual gates", async () => {
  const melee = await meleePromise;

  const heavy = melee.requestHuntMeleeTechniqueAttack(
    melee.createHuntMeleeState(),
    profile,
    1,
    "heavy",
    { grounded: true },
  );
  assert.equal(heavy.accepted, true);
  assert.equal(heavy.state.actionKind, "heavy");
  assert.equal(melee.currentHuntMeleeAttack(heavy.state).damage, profile.damage * 1.82);
  assert.equal(melee.isHuntMeleeBufferWindowOpen(heavy.state), false);
  assert.equal(
    melee.requestHuntMeleeTechniqueAttack(
      melee.createHuntMeleeState(),
      profile,
      1,
      "heavy",
      { grounded: false },
    ).accepted,
    false,
  );

  const aerial = melee.requestHuntMeleeTechniqueAttack(
    melee.createHuntMeleeState(),
    profile,
    -1,
    "aerial",
    { grounded: false },
  );
  assert.equal(aerial.accepted, true);
  assert.equal(melee.currentHuntMeleeAttack(aerial.state).kind, "aerial");
  assert.equal(
    melee.requestHuntMeleeTechniqueAttack(
      melee.createHuntMeleeState(),
      profile,
      1,
      "aerial",
      { grounded: true },
    ).accepted,
    false,
  );

  const guardContext = {
    grounded: true,
    targetId: "guard-a",
    targetHealthRatio: 0.7,
    targetInRange: true,
    targetTelegraphing: true,
    targetIsBoss: false,
  };
  const guardBreak = melee.requestHuntMeleeTechniqueAttack(
    melee.createHuntMeleeState(),
    profile,
    1,
    "guard-break",
    guardContext,
  );
  assert.equal(guardBreak.accepted, true);
  assert.equal(guardBreak.state.lockedTargetId, "guard-a");
  assert.equal(melee.currentHuntMeleeAttack(guardBreak.state).breaksGuard, true);
  let guardActive = advanceToActive(melee, guardBreak.state);
  assert.equal(melee.canHuntMeleeHitTarget(guardActive, "guard-a"), true);
  assert.equal(melee.canHuntMeleeHitTarget(guardActive, "guard-b"), false);
  assert.equal(
    melee.requestHuntMeleeTechniqueAttack(
      melee.createHuntMeleeState(),
      profile,
      1,
      "guard-break",
      { ...guardContext, targetTelegraphing: false },
    ).accepted,
    false,
  );
});

test("an accepted locked technique leaves its target untouched until the active hit", async () => {
  const melee = await meleePromise;
  const source = await readFile(
    new URL("../app/game/HuntCanvas.tsx", import.meta.url),
    "utf8",
  );
  const sourceFile = ts.createSourceFile(
    "HuntCanvas.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const declaration = sourceFile.statements.find(
    (statement) =>
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === "playerMeleeTechnique",
  );
  assert.ok(declaration, "playerMeleeTechnique must remain independently testable");
  const transpiled = ts.transpileModule(
    `${declaration.getText(sourceFile)}\nexport { playerMeleeTechnique };`,
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
      fileName: "HuntCanvas-technique.ts",
      reportDiagnostics: true,
    },
  );
  const errors = (transpiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(errors, []);

  const compiled = { exports: {} };
  runInNewContext(transpiled.outputText, {
    module: compiled,
    exports: compiled.exports,
    equippedWeapon: () => ({ id: "wristblades" }),
    effectiveWeaponStats: () => ({}),
    resolveHunterWeaponAttack: () => ({
      staminaCost: 8,
      damage: profile.damage,
      cooldownSeconds: profile.cooldownSeconds,
      meleeReachPx: profile.reachPx,
      maxTargetHits: profile.maxTargetHits,
      noiseLoudness: profile.noiseLoudness,
      noiseRadius: profile.noiseRadius,
    }),
    effectiveArmorStats: () => ({ meleeDamageMultiplier: 1 }),
    huntMeleeStaminaMultiplier: melee.huntMeleeStaminaMultiplier,
    requestHuntMeleeTechniqueAttack: melee.requestHuntMeleeTechniqueAttack,
    forceDecloak: (state) => {
      state.player.cloaked = false;
    },
    announce: () => undefined,
  });

  const target = {
    id: "prey-a",
    health: 10,
    maxHealth: 100,
    boss: false,
    telegraph: 0.19,
    pendingAttackId: "regular-melee",
    hitStunSeconds: 0,
    knockbackVelocityX: 75,
    velocityX: -110,
  };
  const targetBeforeRequest = structuredClone(target);
  const state = {
    phase: "active",
    player: {
      activeWeaponSlot: 0,
      weaponAmmo: [-1, -1],
      stamina: 100,
      melee: melee.createHuntMeleeState(),
      facing: 1,
      grounded: true,
      climbing: false,
      climbZoneId: null,
      cloaked: true,
    },
  };
  const loadout = {
    weaponIds: ["wristblades", "combistick"],
    armorId: "test",
  };
  const inventory = {
    weaponUpgrades: { wristblades: 0 },
    armorUpgrades: { test: 0 },
  };

  compiled.exports.playerMeleeTechnique(
    state,
    loadout,
    inventory,
    "execution",
    target,
  );

  assert.equal(
    state.player.melee.phase,
    "startup",
    "the technique request was accepted",
  );
  assert.ok(
    state.player.stamina < 100,
    "an accepted request pays its stamina cost",
  );
  assert.deepEqual(
    target,
    targetBeforeRequest,
    "startup must not cancel a telegraph, stop movement or grant hit stun",
  );
});

test("projection and execution reject bosses or invalid ranges and lock one vulnerable prey", async () => {
  const melee = await meleePromise;
  const base = {
    grounded: true,
    targetId: "prey-a",
    targetHealthRatio: 0.2,
    targetInRange: true,
    targetTelegraphing: false,
    targetIsBoss: false,
  };
  const thrown = melee.requestHuntMeleeTechniqueAttack(
    melee.createHuntMeleeState(),
    profile,
    1,
    "throw",
    base,
  );
  assert.equal(thrown.accepted, true);
  assert.equal(melee.currentHuntMeleeAttack(thrown.state).isThrow, true);
  assert.equal(melee.currentHuntMeleeAttack(thrown.state).maxTargetHits, 1);
  assert.equal(
    melee.requestHuntMeleeTechniqueAttack(
      melee.createHuntMeleeState(),
      profile,
      1,
      "throw",
      { ...base, targetIsBoss: true },
    ).accepted,
    false,
  );
  assert.equal(
    melee.requestHuntMeleeTechniqueAttack(
      melee.createHuntMeleeState(),
      profile,
      1,
      "throw",
      { ...base, targetInRange: false },
    ).accepted,
    false,
  );

  const execution = melee.requestHuntMeleeTechniqueAttack(
    melee.createHuntMeleeState(),
    profile,
    -1,
    "execution",
    base,
  );
  assert.equal(execution.accepted, true);
  assert.equal(melee.currentHuntMeleeAttack(execution.state).isExecution, true);
  assert.equal(execution.state.lockedTargetId, "prey-a");
  assert.equal(
    melee.requestHuntMeleeTechniqueAttack(
      melee.createHuntMeleeState(),
      profile,
      1,
      "execution",
      { ...base, targetHealthRatio: melee.HUNT_MELEE_EXECUTION_HEALTH_RATIO + 0.001 },
    ).accepted,
    false,
  );
  assert.equal(
    melee.requestHuntMeleeTechniqueAttack(
      melee.createHuntMeleeState(),
      profile,
      1,
      "execution",
      { ...base, targetHealthRatio: 0 },
    ).accepted,
    false,
  );
});

test("vertical projection launches once and lands exactly on its captured floor", async () => {
  const melee = await meleePromise;
  let reaction = melee.stepHuntMeleeVerticalReaction(
    { y: 500, velocityY: -250, restY: 500 },
    1 / 60,
  );
  assert.equal(reaction.active, true);
  assert.ok(reaction.state.y < 500);
  assert.ok(reaction.state.velocityY < 0);

  for (let frame = 0; frame < 120 && reaction.active; frame += 1) {
    reaction = melee.stepHuntMeleeVerticalReaction(reaction.state, 1 / 60);
  }
  assert.deepEqual(reaction, {
    state: { y: 500, velocityY: 0, restY: 500 },
    active: false,
  });

  const floorClamp = melee.stepHuntMeleeVerticalReaction(
    { y: 500, velocityY: 260, restY: 500 },
    1 / 60,
  );
  assert.deepEqual(floorClamp, {
    state: { y: 500, velocityY: 0, restY: 500 },
    active: false,
  });
});

test("parry has one early active window and a deterministic cooldown", async () => {
  const melee = await meleePromise;
  const requested = melee.requestHuntMeleeParry(melee.createHuntMeleeState());
  assert.equal(requested.accepted, true);
  assert.equal(requested.state.defensePhase, "parry");
  assert.equal(melee.canHuntMeleeParry(requested.state), true);
  assert.equal(melee.requestHuntMeleeParry(requested.state).accepted, false);
  const late = melee.stepHuntMeleeCombat(
    requested.state,
    melee.HUNT_MELEE_PARRY_ACTIVE_SECONDS + 0.01,
  ).state;
  assert.equal(melee.canHuntMeleeParry(late), false);

  const consumed = melee.consumeHuntMeleeParry(requested.state);
  assert.equal(consumed.defensePhase, "neutral");
  assert.equal(melee.canHuntMeleeParry(consumed), false);
  assert.equal(melee.requestHuntMeleeParry(consumed).accepted, false);
  const cooled = melee.stepHuntMeleeCombat(consumed, 0.6).state;
  assert.equal(melee.requestHuntMeleeParry(cooled).accepted, true);
});

test("dodge exposes only an opening invulnerability window and directional movement", async () => {
  const melee = await meleePromise;
  const requested = melee.requestHuntMeleeDodge(melee.createHuntMeleeState(), -1);
  assert.equal(requested.accepted, true);
  assert.equal(requested.state.defensePhase, "dodge");
  assert.equal(melee.isHuntMeleeDodgeInvulnerable(requested.state), true);
  assert.ok(melee.huntMeleeDodgeVelocity(requested.state) < 0);
  assert.equal(melee.requestHuntMeleeAttack(requested.state, profile, 1).accepted, false);

  const late = melee.stepHuntMeleeCombat(
    requested.state,
    melee.HUNT_MELEE_DODGE_INVULNERABILITY_SECONDS + 0.01,
  ).state;
  assert.equal(melee.isHuntMeleeDodgeInvulnerable(late), false);
  assert.ok(melee.huntMeleeDodgeVelocity(late) < 0);

  const recovered = melee.stepHuntMeleeCombat(late, 0.5).state;
  assert.equal(recovered.defensePhase, "neutral");
  assert.equal(melee.huntMeleeDodgeVelocity(recovered), 0);
  assert.equal(melee.requestHuntMeleeDodge(recovered, 1).accepted, true);
});

test("V1 saves migrate to light combat and malformed locked techniques fail closed", async () => {
  const melee = await meleePromise;
  const v1 = startAttack(melee);
  const { actionKind, lockedTargetId, defensePhase, defenseRemainingSeconds,
    defenseCooldownSeconds, dodgeDirection, parryConsumed, ...legacy } = v1;
  void actionKind;
  void lockedTargetId;
  void defensePhase;
  void defenseRemainingSeconds;
  void defenseCooldownSeconds;
  void dodgeDirection;
  void parryConsumed;
  const migrated = melee.normalizeHuntMeleeState(legacy);
  assert.equal(migrated.actionKind, "light");
  assert.equal(migrated.defensePhase, "neutral");

  const malformed = melee.normalizeHuntMeleeState({
    ...v1,
    actionKind: "execution",
    lockedTargetId: null,
  });
  assert.equal(malformed.phase, "idle");

  const run = () => {
    let state = melee.createHuntMeleeState();
    state = melee.requestHuntMeleeDodge(state, 1).state;
    for (let frame = 0; frame < 80; frame += 1) {
      state = melee.stepHuntMeleeCombat(state, 1 / 60).state;
      if (frame === 35) {
        state = melee.requestHuntMeleeTechniqueAttack(
          state,
          profile,
          1,
          "heavy",
          { grounded: true },
        ).state;
      }
    }
    return state;
  };
  assert.deepEqual(run(), run());
});

test("HuntCanvas wires every advanced technique to contextual controls and hit resolution", async () => {
  const source = await readFile(
    new URL("../app/game/HuntCanvas.tsx", import.meta.url),
    "utf8",
  );
  for (const marker of [
    "requestHuntMeleeTechniqueAttack(",
    "requestHuntMeleeParry(",
    "requestHuntMeleeDodge(",
    "resolvePlayerMeleeParry(state, enemy)",
    "resolvePlayerMeleeParry(state, boss)",
    "stepHuntMeleeVerticalReaction(",
    "enemy.knockbackVelocityY =",
    '"aerial",',
    '"guard-break",',
    '"throw",',
    '"execution",',
    "HUNT_MELEE_EXECUTION_HEALTH_RATIO",
    "lourde, brise-garde ou exécution contextuelle",
    "projection rapprochée",
  ]) {
    assert.ok(source.includes(marker), `missing advanced hunt integration: ${marker}`);
  }
});
