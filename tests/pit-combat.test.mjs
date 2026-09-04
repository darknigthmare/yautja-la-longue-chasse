import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

async function importTypeScriptModule(relativePath) {
  const bundle = await build({
    entryPoints: [fileURLToPath(new URL(relativePath, import.meta.url))],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "es2022",
    write: false,
  });
  return import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
}

const pitPromise = importTypeScriptModule("../app/game/systems/pitCombat.ts");

function placeInRange(state, distance = 82) {
  const copy = JSON.parse(JSON.stringify(state));
  copy.fighters[0].x = 480 - distance / 2;
  copy.fighters[1].x = 480 + distance / 2;
  copy.fighters[0].facing = 1;
  copy.fighters[1].facing = -1;
  copy.fighters[0].velocityX = 0;
  copy.fighters[1].velocityX = 0;
  return copy;
}

function advance(pit, state, frames, inputs = [{}, {}]) {
  let next = state;
  for (let frame = 0; frame < frames; frame += 1) {
    next = pit.stepPitCombat(next, inputs);
  }
  return next;
}

function performAttack(pit, state, attack, defenderInput = {}) {
  let next = pit.stepPitCombat(placeInRange(state), [{ attack }, defenderInput]);
  const move = pit.PIT_FIGHTERS["jungle-hunter"].attacks[attack];
  next = advance(pit, next, move.startup, [{}, defenderInput]);
  return next;
}

test("fixed-step replay and JSON restoration are deterministic", async () => {
  const pit = await pitPromise;
  const inputs = Array.from({ length: 180 }, (_, frame) => [
    {
      right: frame < 35,
      jump: frame === 40,
      attack: frame === 70 ? "medium" : frame === 120 ? "technique" : undefined,
    },
    {
      left: frame < 25,
      guardHigh: frame >= 65 && frame < 90,
      attack: frame === 115 ? "heavy" : undefined,
    },
  ]);
  const run = () => inputs.reduce((state, frameInput) => pit.stepPitCombat(state, frameInput), pit.createPitCombatState());
  const first = run();
  const second = run();
  assert.equal(pit.serializePitCombat(first), pit.serializePitCombat(second));
  assert.deepEqual(pit.deserializePitCombat(pit.serializePitCombat(first)), first);
  assert.equal(first.frame, 180);
  assert.equal(first.tickRate, 60);
  assert.equal(first.roundFramesRemaining, 99 * 60 - 180);
});

test("prototype keys cannot masquerade as registered fighters or arenas", async () => {
  const pit = await pitPromise;
  assert.throws(() => pit.createPitCombatState("toString", "berserker"));
  assert.throws(() => pit.createPitCombatState("constructor", "berserker"));
  assert.throws(() => pit.createPitCombatState("jungle-hunter", "berserker", {
    arenaId: "toString",
  }));
  const snapshot = JSON.parse(pit.serializePitCombat(pit.createPitCombatState()));
  snapshot.fighters[0].definitionId = "constructor";
  assert.throws(() => pit.deserializePitCombat(JSON.stringify(snapshot)));
});

test("movement, jump, crouch boxes and an unblockable throw remain canvas-ready", async () => {
  const pit = await pitPromise;
  let state = pit.createPitCombatState();
  const startX = state.fighters[0].x;
  state = pit.stepPitCombat(state, [{ right: true }, { down: true }]);
  assert.ok(state.fighters[0].x > startX);
  assert.equal(state.fighters[1].crouching, true);
  assert.equal(
    pit.getPitFighterBoxes(state.fighters[1]).hurtbox.height,
    pit.PIT_FIGHTERS.berserker.crouchHeight,
  );
  state = pit.stepPitCombat(state, [{ jump: true }, {}]);
  assert.equal(state.fighters[0].grounded, false);
  assert.ok(state.fighters[0].y > 0);

  state = placeInRange(pit.createPitCombatState(), 66);
  const initialHealth = state.fighters[1].health;
  state = pit.stepPitCombat(state, [{ throw: true }, { guardHigh: true }]);
  state = advance(pit, state, 7, [{}, { guardHigh: true }]);
  assert.ok(state.fighters[1].health < initialHealth);
  assert.equal(state.fighters[1].phase, "knockdown");
  assert.equal(state.events[0].type, "hit");
  assert.equal(state.events[0].attack, "throw");
});

test("declared startup, active and recovery frames gate a light hit", async () => {
  const pit = await pitPromise;
  const move = pit.PIT_FIGHTERS["jungle-hunter"].attacks.light;
  let state = placeInRange(pit.createPitCombatState(), 74);
  const initialHealth = state.fighters[1].health;
  state = pit.stepPitCombat(state, [{ attack: "light" }, {}]);
  assert.equal(state.fighters[0].phase, "startup");
  state = advance(pit, state, move.startup - 1);
  assert.equal(state.fighters[1].health, initialHealth);
  state = pit.stepPitCombat(state, [{}, {}]);
  assert.equal(state.fighters[0].phase, "active");
  assert.ok(state.fighters[1].health < initialHealth);
  assert.equal(state.events.filter((event) => event.type === "hit").length, 1);
  state = advance(pit, state, move.active);
  assert.equal(state.fighters[0].phase, "recovery");
});

test("high and low guard obey hit levels and produce blockstun", async () => {
  const pit = await pitPromise;
  const base = pit.createPitCombatState();
  const maxHealth = base.fighters[1].health;

  const lowBlock = performAttack(pit, base, "technique", { guardLow: true, down: true });
  assert.equal(lowBlock.fighters[1].phase, "blockstun");
  assert.equal(
    maxHealth - lowBlock.fighters[1].health,
    pit.PIT_FIGHTERS["jungle-hunter"].attacks.technique.chipDamage,
  );
  assert.equal(lowBlock.events[0].type, "block");

  const wrongGuard = performAttack(pit, base, "technique", { guardHigh: true });
  assert.equal(wrongGuard.fighters[1].phase, "knockdown");
  assert.ok(maxHealth - wrongGuard.fighters[1].health > 50);
  assert.equal(wrongGuard.events[0].type, "hit");
});

test("same-frame attacks trade fairly before hitstun and KO resolution", async () => {
  const pit = await pitPromise;
  let state = placeInRange(pit.createPitCombatState(), 72);
  state.fighters[0].health = 40;
  state.fighters[1].health = 40;
  state = pit.stepPitCombat(state, [{ attack: "light" }, { attack: "light" }]);
  state = advance(pit, state, pit.PIT_FIGHTERS["jungle-hunter"].attacks.light.startup);
  assert.equal(state.fighters[0].health, 0);
  assert.equal(state.fighters[1].health, 0);
  assert.equal(state.events.filter((event) => event.type === "hit").length, 2);
  assert.equal(state.phase, "round-over");
  assert.equal(state.lastRoundResult.reason, "double-ko");
});

test("linked attacks scale combo damage and the hit cap forces a protected knockdown", async () => {
  const pit = await pitPromise;
  const move = pit.PIT_FIGHTERS["jungle-hunter"].attacks.light;
  let state = pit.createPitCombatState();
  const defenderMaxX = pit.PIT_ARENA.rightWall - pit.PIT_FIGHTERS.berserker.bodyWidth / 2;
  state.fighters[1].x = defenderMaxX;
  state.fighters[0].x = defenderMaxX -
    (pit.PIT_FIGHTERS["jungle-hunter"].bodyWidth + pit.PIT_FIGHTERS.berserker.bodyWidth) / 2;
  const damages = [];
  let comboBreakObserved = false;

  state = pit.stepPitCombat(state, [{ attack: "light" }, {}]);
  state = advance(pit, state, move.startup);
  damages.push(state.events.find((event) => event.type === "hit").damage);

  for (let hit = 1; hit < pit.PIT_MAX_COMBO_HITS; hit += 1) {
    state = pit.stepPitCombat(state, [{ attack: "light" }, {}]);
    assert.equal(state.fighters[0].action.frame, 0, "connected attack should link into new startup");
    state = advance(pit, state, move.startup);
    const hitEvent = state.events.find((event) => event.type === "hit");
    assert.ok(hitEvent, `linked combo hit ${hit + 1} should connect`);
    damages.push(hitEvent.damage);
    comboBreakObserved ||= state.events.some((event) => event.type === "combo-break");
  }

  assert.ok(damages[1] < damages[0]);
  assert.ok(damages.at(-1) <= damages[1]);
  assert.equal(state.fighters[1].phase, "knockdown");
  assert.ok(state.fighters[1].wakeInvulnerabilityFrames > 0);
  assert.equal(comboBreakObserved, true);
});

test("separate neutral hits restart the combo and damage scaling", async () => {
  const pit = await pitPromise;
  const move = pit.PIT_FIGHTERS["jungle-hunter"].attacks.light;
  let state = performAttack(pit, pit.createPitCombatState(), "light");
  const first = state.events.find((event) => event.type === "hit");
  state = advance(pit, state, move.active + move.recovery + move.hitstun + 1);
  assert.equal(state.fighters[1].phase, "idle");
  assert.equal(state.fighters[1].comboHitsReceived, 0);
  state = performAttack(pit, state, "light");
  const second = state.events.find((event) => event.type === "hit");
  assert.equal(first.combo, 1);
  assert.equal(second.combo, 1);
  assert.equal(second.damage, first.damage);
});
test("two round wins end the match and rematch returns a clean 99 second round", async () => {
  const pit = await pitPromise;
  let state = pit.createPitCombatState();
  for (let round = 1; round <= 2; round += 1) {
    state = placeInRange(state, 72);
    state.fighters[1].health = 1;
    state = performAttack(pit, state, "light");
    assert.equal(state.lastRoundResult.winnerId, "jungle-hunter");
    if (round === 1) {
      assert.equal(state.phase, "round-over");
      state.transitionFramesRemaining = 1;
      state = pit.stepPitCombat(state, [{}, {}]);
      assert.equal(state.round, 2);
      assert.equal(state.phase, "round");
      assert.equal(state.fighters[0].roundsWon, 1);
    }
  }
  assert.equal(state.phase, "match-over");
  assert.equal(state.matchWinnerId, "jungle-hunter");
  assert.equal(state.fighters[0].roundsWon, 2);

  const rematch = pit.rematchPitCombat(state);
  assert.equal(rematch.phase, "round");
  assert.equal(rematch.round, 1);
  assert.equal(rematch.roundFramesRemaining, 99 * 60);
  assert.deepEqual(rematch.fighters.map((fighter) => fighter.roundsWon), [0, 0]);
});




test("match-over becomes eventless and stable after its terminal tick", async () => {
  const pit = await pitPromise;
  let state = pit.createPitCombatState();
  state.fighters[0].roundsWon = 1;
  state.fighters[1].health = 1;
  state = performAttack(pit, state, "light");
  assert.equal(state.phase, "match-over");
  assert.ok(state.events.some((event) => event.type === "match-end"));
  const terminalFrame = state.frame;
  const settled = pit.stepPitCombat(state, [{ attack: "light" }, {}]);
  assert.equal(settled.frame, terminalFrame);
  assert.deepEqual(settled.events, []);
  const stable = pit.stepPitCombat(settled, [{ attack: "heavy" }, {}]);
  assert.equal(stable, settled);
});

test("pushboxes remain separated and wholly inside either arena wall", async () => {
  const pit = await pitPromise;
  for (const corner of ["left", "right"]) {
    let state = pit.createPitCombatState();
    const leftHalf = pit.PIT_FIGHTERS["jungle-hunter"].bodyWidth / 2;
    const rightHalf = pit.PIT_FIGHTERS.berserker.bodyWidth / 2;
    if (corner === "left") {
      state.fighters[0].x = pit.PIT_ARENA.leftWall + leftHalf;
      state.fighters[1].x = state.fighters[0].x + 10;
    } else {
      state.fighters[1].x = pit.PIT_ARENA.rightWall - rightHalf;
      state.fighters[0].x = state.fighters[1].x - 10;
    }
    state = pit.stepPitCombat(state, [{}, {}]);
    const boxes = state.fighters.map((fighter) => pit.getPitFighterBoxes(fighter).pushbox);
    assert.ok(boxes.every((box) => box.x >= pit.PIT_ARENA.leftWall - 1e-9));
    assert.ok(boxes.every((box) => box.x + box.width <= pit.PIT_ARENA.rightWall + 1e-9));
    assert.ok(boxes[0].x + boxes[0].width <= boxes[1].x + 1e-9);
  }
});

test("held edge-triggered inputs must return to neutral after an inter-round transition", async () => {
  const pit = await pitPromise;
  let state = pit.createPitCombatState();
  state.fighters[1].health = 1;
  state = performAttack(pit, state, "light");
  assert.equal(state.phase, "round-over");
  state.transitionFramesRemaining = 1;
  state = pit.stepPitCombat(state, [{ attack: "light", jump: true }, {}]);
  assert.equal(state.phase, "round");
  assert.equal(state.round, 2);
  state = pit.stepPitCombat(state, [{ attack: "light", jump: true }, {}]);
  assert.equal(state.fighters[0].action, null);
  assert.equal(state.fighters[0].grounded, true);
  state = pit.stepPitCombat(state, [{}, {}]);
  state = pit.stepPitCombat(state, [{ attack: "light" }, {}]);
  assert.equal(state.fighters[0].action.attack, "light");
});

test("deserialization rejects malformed or internally inconsistent combat states", async () => {
  const pit = await pitPromise;
  const valid = JSON.parse(pit.serializePitCombat(pit.createPitCombatState()));
  const malformed = [
    "not-json",
    JSON.stringify({ ...valid, phase: "victory" }),
    JSON.stringify({ ...valid, roundFramesRemaining: -1 }),
    JSON.stringify({ ...valid, fighters: [{ ...valid.fighters[0], health: "full" }, valid.fighters[1]] }),
    JSON.stringify({ ...valid, fighters: [valid.fighters[0], { ...valid.fighters[1], definitionId: valid.fighters[0].definitionId }] }),
    JSON.stringify({ ...valid, fighters: [{ ...valid.fighters[0], x: pit.PIT_ARENA.leftWall }, valid.fighters[1]] }),
    JSON.stringify({ ...valid, events: [{ type: "hit", frame: 0, damage: -5 }] }),
  ];
  for (const serialized of malformed) {
    assert.throws(() => pit.deserializePitCombat(serialized), /Invalid or incompatible/);
  }
});

test("heavy attacks expose a deterministic anti-air launch reaction", async () => {
  const pit = await pitPromise;
  let state = placeInRange(pit.createPitCombatState(), 72);
  state.fighters[1].grounded = false;
  state.fighters[1].y = 100;
  state.fighters[1].velocityY = 0;
  state = pit.stepPitCombat(state, [{ attack: "heavy" }, {}]);
  state = advance(pit, state, pit.PIT_FIGHTERS["jungle-hunter"].attacks.heavy.startup);
  const hit = state.events.find((event) => event.type === "hit");
  assert.ok(hit);
  assert.equal(hit.antiAir, true);
  assert.equal(state.fighters[1].phase, "knockdown");
  assert.equal(state.fighters[1].grounded, false);
  assert.ok(state.fighters[1].velocityY > 0);
});
test("training rules freeze the timer, never terminate, serialize and survive rematch", async () => {
  const pit = await pitPromise;
  const match = pit.createPitCombatState();
  assert.deepEqual(match.rules, { mode: "match" });

  let training = pit.createPitCombatState("jungle-hunter", "berserker", { mode: "training" });
  assert.deepEqual(training.rules, { mode: "training" });
  training = advance(pit, training, pit.PIT_ROUND_FRAMES + 120);
  assert.equal(training.roundFramesRemaining, pit.PIT_ROUND_FRAMES);
  assert.equal(training.phase, "round");
  assert.equal(training.lastRoundResult, null);
  assert.equal(training.matchWinnerId, null);

  const restored = pit.deserializePitCombat(pit.serializePitCombat(training));
  assert.deepEqual(restored, training);
  const rematch = pit.rematchPitCombat(restored);
  assert.deepEqual(rematch.rules, { mode: "training" });
  assert.equal(rematch.roundFramesRemaining, pit.PIT_ROUND_FRAMES);
  assert.equal(rematch.phase, "round");
});

test("training knockout recovers the dummy to a clean spawn without ending the session", async () => {
  const pit = await pitPromise;
  let state = pit.createPitCombatState("jungle-hunter", "berserker", { mode: "training" });
  state.fighters[1].health = 1;
  state = performAttack(pit, state, "light");
  assert.equal(state.fighters[1].health, 0);
  assert.equal(state.fighters[1].phase, "knockdown");
  assert.equal(state.phase, "round");
  assert.equal(state.lastRoundResult, null);

  state = advance(pit, state, state.fighters[1].knockdownFrames - 1);
  assert.equal(state.fighters[1].health, 0);
  assert.equal(state.fighters[1].phase, "knockdown");
  state = pit.stepPitCombat(state, [{}, {}]);
  const dummy = state.fighters[1];
  assert.equal(dummy.health, pit.PIT_FIGHTERS.berserker.maxHealth);
  assert.equal(dummy.x, pit.PIT_ARENA.spawnX[1]);
  assert.equal(dummy.y, 0);
  assert.equal(dummy.phase, "idle");
  assert.equal(dummy.action, null);
  assert.equal(dummy.comboHitsReceived, 0);
  assert.equal(dummy.wakeInvulnerabilityFrames, 0);
  assert.equal(state.roundFramesRemaining, pit.PIT_ROUND_FRAMES);
  assert.equal(state.phase, "round");
  assert.equal(state.matchWinnerId, null);
});

test("training rules reject malformed modes and impossible terminal snapshots", async () => {
  const pit = await pitPromise;
  assert.throws(
    () => pit.createPitCombatState("jungle-hunter", "berserker", { mode: "arcade" }),
    /valid combat mode/,
  );
  const training = JSON.parse(pit.serializePitCombat(
    pit.createPitCombatState("jungle-hunter", "berserker", { mode: "training" }),
  ));
  const invalidStates = [
    { ...training, rules: { mode: "arcade" } },
    { ...training, rules: undefined },
    { ...training, roundFramesRemaining: training.roundFramesRemaining - 1 },
    { ...training, phase: "round-over", transitionFramesRemaining: 60 },
    { ...training, matchWinnerId: "jungle-hunter" },
  ];
  for (const candidate of invalidStates) {
    assert.throws(
      () => pit.deserializePitCombat(JSON.stringify(candidate)),
      /Invalid or incompatible/,
    );
  }
});

test("Traque rewards confirmed life damage and guarded pressure, never a whiff", async () => {
  const pit = await pitPromise;

  let whiff = pit.createPitCombatState();
  whiff.fighters[0].x = 120;
  whiff.fighters[1].x = 840;
  whiff = pit.stepPitCombat(whiff, [{ attack: "light" }, {}]);
  whiff = advance(pit, whiff, pit.PIT_FIGHTERS["jungle-hunter"].attacks.light.startup);
  assert.deepEqual(whiff.fighters.map((fighter) => fighter.traque), [0, 0]);
  assert.equal(whiff.events.some((event) => event.type === "traque-gain"), false);

  let actualDamage = pit.createPitCombatState();
  actualDamage.fighters[1].health = 10;
  actualDamage = performAttack(pit, actualDamage, "light");
  const lethalHit = actualDamage.events.find((event) => event.type === "hit");
  assert.equal(lethalHit.damage, 10);
  assert.equal(actualDamage.fighters[0].traque, 10);
  assert.equal(actualDamage.fighters[1].traque, 5);

  const lightBlock = performAttack(
    pit,
    pit.createPitCombatState(),
    "light",
    { guardHigh: true },
  );
  assert.equal(lightBlock.fighters[0].traque, 0);
  assert.equal(lightBlock.fighters[1].traque, 6);

  const heavyBlock = performAttack(
    pit,
    pit.createPitCombatState(),
    "heavy",
    { guardHigh: true },
  );
  const expectedChip = pit.PIT_FIGHTERS["jungle-hunter"].attacks.heavy.chipDamage;
  assert.equal(heavyBlock.fighters[0].traque, expectedChip);
  assert.equal(heavyBlock.fighters[1].traque, 12 + Math.ceil(expectedChip / 2));
});

test("spacing pressure grants one Traque every twelve consecutive eligible frames", async () => {
  const pit = await pitPromise;
  let state = pit.createPitCombatState();
  state.fighters[0].x = 380;
  state.fighters[1].x = 580;

  state = advance(pit, state, pit.PIT_PRESSURE_GAIN_INTERVAL - 1);
  assert.deepEqual(state.fighters.map((fighter) => fighter.traque), [0, 0]);
  assert.deepEqual(
    state.fighters.map((fighter) => fighter.pressureFrames),
    [pit.PIT_PRESSURE_GAIN_INTERVAL - 1, pit.PIT_PRESSURE_GAIN_INTERVAL - 1],
  );
  state = pit.stepPitCombat(state, [{}, {}]);
  assert.deepEqual(state.fighters.map((fighter) => fighter.traque), [1, 1]);
  assert.deepEqual(state.fighters.map((fighter) => fighter.pressureFrames), [0, 0]);

  state.fighters[0].x = 120;
  state.fighters[1].x = 840;
  state = pit.stepPitCombat(state, [{}, {}]);
  assert.deepEqual(state.fighters.map((fighter) => fighter.pressureFrames), [0, 0]);

  state.fighters[0].x = 380;
  state.fighters[1].x = 580;
  state = advance(pit, state, pit.PIT_PRESSURE_GAIN_INTERVAL);
  assert.deepEqual(state.fighters.map((fighter) => fighter.traque), [2, 2]);
});

test("only five hundred Traque carries into the next round", async () => {
  const pit = await pitPromise;
  let state = pit.createPitCombatState();
  state.fighters[0].traque = 800;
  state.fighters[1].traque = 400;
  state.fighters[1].health = 0;
  state = pit.stepPitCombat(state, [{}, {}]);
  assert.equal(state.phase, "round-over");
  state.transitionFramesRemaining = 1;
  state = pit.stepPitCombat(state, [{}, {}]);
  assert.equal(state.round, 2);
  assert.deepEqual(state.fighters.map((fighter) => fighter.traque), [500, 400]);
  assert.deepEqual(state.fighters.map((fighter) => fighter.ruptureUsedThisRound), [false, false]);
  assert.deepEqual(state.fighters.map((fighter) => fighter.survivalTriggeredThisRound), [false, false]);
});

test("Survival Instinct triggers after a nonlethal threshold hit and protects only later damage", async () => {
  const pit = await pitPromise;
  let state = pit.createPitCombatState();
  state.fighters[1].health = 300;

  state = performAttack(pit, state, "light");
  const triggeringHit = state.events.find((event) => event.type === "hit");
  assert.equal(triggeringHit.damage, 55);
  assert.equal(state.fighters[1].health, 245);
  assert.equal(state.fighters[1].survivalTriggeredThisRound, true);
  assert.equal(state.fighters[1].survivalInstinctFrames, pit.PIT_INSTINCT_FRAMES);
  assert.equal(state.fighters[1].traque, 228);
  assert.equal(state.events.some((event) => event.type === "survival-instinct"), true);
  assert.deepEqual(pit.deserializePitCombat(pit.serializePitCombat(state)), state);

  const light = pit.PIT_FIGHTERS["jungle-hunter"].attacks.light;
  state = advance(pit, state, light.active + light.recovery + light.hitstun + 1);
  state = performAttack(pit, state, "light");
  const protectedHit = state.events.find((event) => event.type === "hit");
  assert.equal(protectedHit.damage, Math.ceil(55 * 0.9));

  let timer = pit.createPitCombatState();
  timer.fighters[0].x = 120;
  timer.fighters[1].x = 840;
  timer.fighters[0].survivalTriggeredThisRound = true;
  timer.fighters[0].survivalInstinctFrames = 1;
  const boostedX = timer.fighters[0].x;
  timer = pit.stepPitCombat(timer, [{ right: true }, {}]);
  assert.ok(
    Math.abs(timer.fighters[0].x - boostedX - pit.PIT_FIGHTERS["jungle-hunter"].walkSpeed * 1.08) < 1e-9,
  );
  assert.equal(timer.fighters[0].survivalInstinctFrames, 0);
  const normalX = timer.fighters[0].x;
  timer = pit.stepPitCombat(timer, [{ right: true }, {}]);
  assert.ok(
    Math.abs(timer.fighters[0].x - normalX - pit.PIT_FIGHTERS["jungle-hunter"].walkSpeed) < 1e-9,
  );
});

test("camouflage has readable startup, active reveal, recovery and unchanged collision", async () => {
  const pit = await pitPromise;
  let state = pit.createPitCombatState();
  state.fighters[0].x = 120;
  state.fighters[1].x = 840;
  state.fighters[0].traque = pit.PIT_CLOAK_COST;
  const startX = state.fighters[0].x;
  const hurtboxBefore = pit.getPitFighterBoxes(state.fighters[0]).hurtbox;

  state = pit.stepPitCombat(state, [{ resource: true, right: true }, {}]);
  assert.equal(state.fighters[0].traque, 0);
  assert.equal(state.fighters[0].cloakPhase, "startup");
  assert.equal(state.fighters[0].cloakFramesRemaining, pit.PIT_CLOAK_STARTUP_FRAMES);
  assert.ok(
    Math.abs(state.fighters[0].x - startX - pit.PIT_FIGHTERS["jungle-hunter"].walkSpeed * 0.5) < 1e-9,
  );
  assert.equal(state.events.some((event) => event.type === "cloak-start"), true);

  state = pit.stepPitCombat(state, [{ attack: "heavy", resource: true }, {}]);
  assert.equal(state.fighters[0].action, null, "startup must reject actions");
  state = pit.stepPitCombat(state, [{}, {}]);
  while (state.fighters[0].cloakPhase === "startup") {
    state = pit.stepPitCombat(state, [{}, {}]);
  }
  assert.equal(state.fighters[0].cloakPhase, "active");
  assert.deepEqual(pit.getPitFighterBoxes(state.fighters[0]).hurtbox, {
    ...hurtboxBefore,
    x: state.fighters[0].x - pit.PIT_FIGHTERS["jungle-hunter"].bodyWidth / 2,
  });
  assert.equal(state.fighters[0].wakeInvulnerabilityFrames, 0);

  const activeX = state.fighters[0].x;
  state = pit.stepPitCombat(state, [{ right: true }, {}]);
  assert.ok(
    Math.abs(state.fighters[0].x - activeX - pit.PIT_FIGHTERS["jungle-hunter"].walkSpeed * 1.12) < 1e-9,
  );
  state = pit.stepPitCombat(state, [{}, {}]);
  state = pit.stepPitCombat(state, [{ attack: "light" }, {}]);
  assert.equal(state.fighters[0].cloakPhase, "recovery");
  assert.equal(state.fighters[0].cloakFramesRemaining, pit.PIT_CLOAK_RECOVERY_FRAMES);
  assert.equal(state.fighters[0].action.attack, "light");
  assert.deepEqual(
    state.events.map((event) => event.type),
    ["cloak-end", "attack-start"],
    "the silhouette must reveal before the attack begins",
  );
  assert.deepEqual(pit.deserializePitCombat(pit.serializePitCombat(state)), state);

  let expiry = pit.createPitCombatState();
  expiry.fighters[0].cloakPhase = "active";
  expiry.fighters[0].cloakFramesRemaining = 1;
  expiry = pit.stepPitCombat(expiry, [{}, {}]);
  assert.equal(expiry.fighters[0].cloakPhase, "recovery");
  assert.equal(expiry.fighters[0].cloakFramesRemaining, pit.PIT_CLOAK_RECOVERY_FRAMES);
  expiry = advance(pit, expiry, pit.PIT_CLOAK_RECOVERY_FRAMES);
  assert.equal(expiry.fighters[0].cloakPhase, "inactive");
  assert.equal(expiry.fighters[0].cloakCooldownFrames, pit.PIT_CLOAK_COOLDOWN_FRAMES);
});

test("a confirmed hit cuts camouflage without granting hidden invulnerability", async () => {
  const pit = await pitPromise;
  let state = placeInRange(pit.createPitCombatState(), 74);
  state.fighters[1].cloakPhase = "active";
  state.fighters[1].cloakFramesRemaining = 100;
  const healthBefore = state.fighters[1].health;

  state = pit.stepPitCombat(state, [{ attack: "light" }, {}]);
  state = advance(pit, state, pit.PIT_FIGHTERS["jungle-hunter"].attacks.light.startup);
  assert.ok(state.fighters[1].health < healthBefore);
  assert.equal(state.fighters[1].cloakPhase, "inactive");
  assert.equal(state.fighters[1].cloakCooldownFrames, pit.PIT_CLOAK_COOLDOWN_FRAMES);
  const cloakEnd = state.events.find((event) => event.type === "cloak-end");
  assert.equal(cloakEnd.reason, "hit");
});

test("Rupture is a rising-edge once-per-round cancel with invulnerability and punish", async () => {
  const pit = await pitPromise;
  let state = placeInRange(pit.createPitCombatState(), 70);
  const defender = state.fighters[0];
  const attacker = state.fighters[1];
  defender.phase = "hitstun";
  defender.stunFrames = 20;
  defender.comboHitsReceived = 2;
  defender.comboLastHitFrame = state.frame;
  defender.traque = pit.PIT_MAX_TRAQUE;
  attacker.phase = "startup";
  attacker.action = { kind: "attack", attack: "light", frame: 4, connected: false };
  attacker.facing = -1;
  const defenderHealth = defender.health;
  const attackerX = attacker.x;

  state = pit.stepPitCombat(state, [{ resource: true }, {}]);
  assert.equal(state.fighters[0].health, defenderHealth);
  assert.equal(state.fighters[0].traque, 0);
  assert.equal(state.fighters[0].ruptureUsedThisRound, true);
  assert.equal(state.fighters[0].phase, "idle");
  assert.equal(state.fighters[0].wakeInvulnerabilityFrames, pit.PIT_RUPTURE_INVULNERABILITY_FRAMES);
  assert.equal(state.fighters[1].phase, "blockstun");
  assert.equal(state.fighters[1].stunFrames, pit.PIT_RUPTURE_BLOCKSTUN_FRAMES);
  assert.equal(state.fighters[1].action, null);
  assert.ok(state.fighters[1].x >= attackerX + pit.PIT_RUPTURE_PUSHBACK - 1e-9);
  assert.equal(state.events.filter((event) => event.type === "rupture").length, 1);
  assert.equal(state.events.some((event) => event.type === "hit"), false);
  assert.deepEqual(pit.deserializePitCombat(pit.serializePitCombat(state)), state);

  state.fighters[0].wakeInvulnerabilityFrames = 0;
  state.fighters[0].phase = "hitstun";
  state.fighters[0].stunFrames = 20;
  state.fighters[0].comboHitsReceived = 2;
  state.fighters[0].comboLastHitFrame = state.frame;
  state.fighters[0].traque = pit.PIT_MAX_TRAQUE;
  state = pit.stepPitCombat(state, [{ resource: false }, {}]);
  state = pit.stepPitCombat(state, [{ resource: true }, {}]);
  assert.equal(state.fighters[0].traque, pit.PIT_MAX_TRAQUE);
  assert.equal(state.events.some((event) => event.type === "rupture"), false);
});

test("Rupture never shortens a longer knockdown already affecting the attacker", async () => {
  const pit = await pitPromise;
  let state = placeInRange(pit.createPitCombatState(), 70);
  state.fighters[0].phase = "hitstun";
  state.fighters[0].stunFrames = 20;
  state.fighters[0].comboHitsReceived = 2;
  state.fighters[0].comboLastHitFrame = state.frame;
  state.fighters[0].traque = pit.PIT_MAX_TRAQUE;
  state.fighters[1].phase = "knockdown";
  state.fighters[1].knockdownFrames = 60;

  state = pit.stepPitCombat(state, [{ resource: true }, {}]);
  assert.equal(state.fighters[1].phase, "knockdown");
  assert.equal(state.fighters[1].knockdownFrames, 59);
  assert.equal(state.fighters[1].stunFrames, 0);
});

test("same-frame double Rupture resolves from one snapshot deterministically", async () => {
  const pit = await pitPromise;
  const base = pit.createPitCombatState();
  base.fighters[0].x = 400;
  base.fighters[1].x = 560;
  for (const fighter of base.fighters) {
    fighter.phase = "hitstun";
    fighter.stunFrames = 20;
    fighter.comboHitsReceived = 2;
    fighter.comboLastHitFrame = base.frame;
    fighter.traque = pit.PIT_MAX_TRAQUE;
  }

  const run = () => pit.stepPitCombat(
    JSON.parse(JSON.stringify(base)),
    [{ resource: true }, { resource: true }],
  );
  const first = run();
  const second = run();
  assert.equal(pit.serializePitCombat(first), pit.serializePitCombat(second));
  assert.deepEqual(first.fighters.map((fighter) => fighter.traque), [0, 0]);
  assert.deepEqual(first.fighters.map((fighter) => fighter.phase), ["blockstun", "blockstun"]);
  assert.deepEqual(
    first.fighters.map((fighter) => fighter.stunFrames),
    [pit.PIT_RUPTURE_BLOCKSTUN_FRAMES, pit.PIT_RUPTURE_BLOCKSTUN_FRAMES],
  );
  assert.deepEqual(
    first.fighters.map((fighter) => fighter.wakeInvulnerabilityFrames),
    [pit.PIT_RUPTURE_INVULNERABILITY_FRAMES, pit.PIT_RUPTURE_INVULNERABILITY_FRAMES],
  );
  assert.equal(first.events.filter((event) => event.type === "rupture").length, 2);
  assert.ok(first.fighters[0].x < 400);
  assert.ok(first.fighters[1].x > 560);
});

test("V1 combat snapshots migrate safely while malformed V2 resource states are rejected", async () => {
  const pit = await pitPromise;
  const legacy = JSON.parse(pit.serializePitCombat(pit.createPitCombatState()));
  legacy.version = 1;
  for (const fighter of legacy.fighters) {
    delete fighter.traque;
    delete fighter.pressureFrames;
    delete fighter.ruptureUsedThisRound;
    delete fighter.survivalTriggeredThisRound;
    delete fighter.survivalInstinctFrames;
    delete fighter.cloakPhase;
    delete fighter.cloakFramesRemaining;
    delete fighter.cloakCooldownFrames;
    delete fighter.inputLatch.resource;
  }

  const migrated = pit.deserializePitCombat(JSON.stringify(legacy));
  assert.equal(migrated.version, pit.PIT_STATE_VERSION);
  assert.deepEqual(migrated.fighters.map((fighter) => fighter.traque), [0, 0]);
  assert.deepEqual(migrated.fighters.map((fighter) => fighter.cloakPhase), ["inactive", "inactive"]);
  assert.deepEqual(migrated.fighters.map((fighter) => fighter.inputLatch.resource), [false, false]);

  const valid = JSON.parse(pit.serializePitCombat(pit.createPitCombatState()));
  const invalid = [
    { ...valid, fighters: [{ ...valid.fighters[0], traque: pit.PIT_MAX_TRAQUE + 1 }, valid.fighters[1]] },
    { ...valid, fighters: [{ ...valid.fighters[0], survivalInstinctFrames: 1 }, valid.fighters[1]] },
    { ...valid, fighters: [{ ...valid.fighters[0], cloakPhase: "active", cloakFramesRemaining: 0 }, valid.fighters[1]] },
    { ...valid, fighters: [{ ...valid.fighters[0], cloakPhase: "active", cloakFramesRemaining: 10, guard: "high" }, valid.fighters[1]] },
    { ...valid, fighters: [{ ...valid.fighters[0], cloakCooldownFrames: pit.PIT_CLOAK_COOLDOWN_FRAMES + 1 }, valid.fighters[1]] },
  ];
  for (const candidate of invalid) {
    assert.throws(
      () => pit.deserializePitCombat(JSON.stringify(candidate)),
      /Invalid or incompatible/,
    );
  }
});

test("all twelve selectable hunters spawn their authored technique recipe in the engine", async () => {
  const pit = await pitPromise;
  for (const fighterId of pit.PIT_PLAYABLE_FIGHTER_IDS) {
    const opponentId = fighterId === "berserker" ? "jungle-hunter" : "berserker";
    let state = pit.createPitCombatState(fighterId, opponentId);
    state.fighters[0].x = 120;
    state.fighters[1].x = 840;
    state = pit.stepPitCombat(state, [{ attack: "technique" }, {}]);
    state = advance(pit, state, pit.PIT_FIGHTERS[fighterId].attacks.technique.startup);
    assert.equal(state.techniqueEffects.length, 1, fighterId + " must create one world effect");
    const [effect] = state.techniqueEffects;
    assert.equal(effect.ownerSlot, 0);
    assert.equal(effect.techniqueId, pit.PIT_FIGHTERS[fighterId].technique.id);
    assert.ok(effect.age >= 1);
    assert.deepEqual(
      pit.deserializePitCombat(pit.serializePitCombat(state)),
      state,
      fighterId + " active technique must serialize canonically",
    );
  }
});

test("returning disc reverses deterministically and keeps one bounded serialized entity", async () => {
  const pit = await pitPromise;
  let state = pit.createPitCombatState("jungle-hunter", "berserker");
  state.fighters[0].x = 120;
  state.fighters[1].x = 840;
  state = pit.stepPitCombat(state, [{ attack: "technique" }, {}]);
  state = advance(pit, state, pit.PIT_FIGHTERS["jungle-hunter"].attacks.technique.startup);
  const recipe = pit.PIT_FIGHTERS["jungle-hunter"].technique;
  assert.equal(state.techniqueEffects[0].phase, "active");
  state = advance(pit, state, recipe.returnFrame - state.techniqueEffects[0].age - 1);
  const outboundX = state.techniqueEffects[0].x;
  state = pit.stepPitCombat(state, [{}, {}]);
  assert.equal(state.techniqueEffects[0].phase, "returning");
  assert.ok(state.techniqueEffects[0].x < outboundX);
  assert.ok(state.techniqueEffects.length <= pit.PIT_MAX_TECHNIQUE_EFFECTS);
});

test("capture net applies a real movement, jump and camouflage lock that expires", async () => {
  const pit = await pitPromise;
  let state = placeInRange(
    pit.createPitCombatState("city-hunter", "berserker"),
    82,
  );
  state = pit.stepPitCombat(state, [{ attack: "technique" }, {}]);
  state = advance(pit, state, pit.PIT_FIGHTERS["city-hunter"].attacks.technique.startup);
  const recipe = pit.PIT_FIGHTERS["city-hunter"].technique;
  assert.deepEqual(state.fighters[1].techniqueStatus, {
    kind: "netted",
    sourceFighterId: "city-hunter",
    framesRemaining: recipe.statusFrames,
  });
  assert.equal(state.fighters[1].phase, "hitstun");
  state = advance(pit, state, state.fighters[1].stunFrames + 1);
  state.fighters[1].traque = pit.PIT_CLOAK_COST;
  const before = state.fighters[1].x;
  state = pit.stepPitCombat(state, [{}, { right: true, jump: true, resource: true }]);
  assert.equal(state.fighters[1].grounded, true);
  assert.equal(state.fighters[1].cloakPhase, "inactive");
  assert.ok(
    Math.abs(
      state.fighters[1].x -
      before -
      pit.PIT_FIGHTERS.berserker.walkSpeed * recipe.movementScale,
    ) < 1e-9,
  );
  state = advance(pit, state, state.fighters[1].techniqueStatus.framesRemaining);
  assert.equal(state.fighters[1].techniqueStatus, null);
});

test("plasma and ground shock pierce guard while ordinary disc pressure remains blockable", async () => {
  const pit = await pitPromise;
  const guardedTechnique = (attackerId) => {
    const defenderId = attackerId === "berserker" ? "jungle-hunter" : "berserker";
    let state = placeInRange(pit.createPitCombatState(attackerId, defenderId), 82);
    state = pit.stepPitCombat(state, [
      { attack: "technique" },
      { guardLow: true, down: true },
    ]);
    return advance(
      pit,
      state,
      pit.PIT_FIGHTERS[attackerId].attacks.technique.startup,
      [{}, { guardLow: true, down: true }],
    );
  };
  const disc = guardedTechnique("jungle-hunter");
  assert.equal(disc.events.some((event) => event.type === "block"), true);
  for (const fighterId of ["scar", "berserker"]) {
    const state = guardedTechnique(fighterId);
    assert.equal(state.events.some((event) => event.type === "block"), false);
    assert.equal(state.events.some((event) => event.type === "hit"), true);
  }
});

test("the Feral bolt trap arms before contact and Witch bow-snare pins on arrival", async () => {
  const pit = await pitPromise;
  let trap = placeInRange(
    pit.createPitCombatState("feral-hunter", "berserker"),
    100,
  );
  trap = pit.stepPitCombat(trap, [{ attack: "technique" }, {}]);
  trap = advance(pit, trap, pit.PIT_FIGHTERS["feral-hunter"].attacks.technique.startup);
  assert.equal(trap.techniqueEffects[0].phase, "arming");
  assert.equal(trap.fighters[1].techniqueStatus, null);
  const armFrames = pit.PIT_FIGHTERS["feral-hunter"].technique.armFrames;
  trap = advance(pit, trap, armFrames - trap.techniqueEffects[0].age - 1);
  assert.equal(trap.fighters[1].techniqueStatus, null);
  trap = pit.stepPitCombat(trap, [{}, {}]);
  assert.equal(trap.fighters[1].techniqueStatus.kind, "pinned");

  let bow = placeInRange(pit.createPitCombatState("witch", "berserker"), 120);
  bow = pit.stepPitCombat(bow, [{ attack: "technique" }, {}]);
  bow = advance(pit, bow, pit.PIT_FIGHTERS.witch.attacks.technique.startup + 4);
  assert.equal(bow.fighters[1].techniqueStatus.kind, "pinned");
  assert.equal(bow.fighters[1].techniqueStatus.sourceFighterId, "witch");
});

test("Falconer drone homes after arming and marks camouflage as unavailable", async () => {
  const pit = await pitPromise;
  let state = pit.createPitCombatState("falconer", "berserker");
  state.fighters[0].x = 220;
  state.fighters[1].x = 700;
  state = pit.stepPitCombat(state, [{ attack: "technique" }, {}]);
  state = advance(pit, state, pit.PIT_FIGHTERS.falconer.attacks.technique.startup);
  const spawnX = state.techniqueEffects[0].x;
  let guard = 0;
  while (!state.fighters[1].techniqueStatus && guard < 100) {
    state = pit.stepPitCombat(state, [{}, {}]);
    guard += 1;
  }
  assert.ok(state.fighters[1].techniqueStatus, "homing drone should eventually connect");
  assert.equal(state.fighters[1].techniqueStatus.kind, "tracked");
  assert.ok(guard > 0);
  assert.ok(spawnX < state.fighters[1].x);
  state.fighters[1].traque = pit.PIT_CLOAK_COST;
  state = advance(pit, state, state.fighters[1].stunFrames + 1);
  state = pit.stepPitCombat(state, [{}, { resource: true }]);
  assert.equal(state.fighters[1].cloakPhase, "inactive");
});

test("whip pulls, spear dashes and counter recipes intercept a same-frame strike", async () => {
  const pit = await pitPromise;

  let whip = placeInRange(pit.createPitCombatState("wolf", "berserker"), 120);
  const defenderX = whip.fighters[1].x;
  whip = pit.stepPitCombat(whip, [{ attack: "technique" }, {}]);
  whip = advance(pit, whip, pit.PIT_FIGHTERS.wolf.attacks.technique.startup);
  assert.ok(whip.fighters[1].x < defenderX, "negative pushback must pull toward Wolf");

  let spear = pit.createPitCombatState("valkyrie", "berserker");
  spear.fighters[0].x = 120;
  spear.fighters[1].x = 840;
  const spearStart = spear.fighters[0].x;
  spear = pit.stepPitCombat(spear, [{ attack: "technique" }, {}]);
  spear = advance(pit, spear, pit.PIT_FIGHTERS.valkyrie.attacks.technique.startup);
  assert.ok(spear.fighters[0].x > spearStart);

  let counter = placeInRange(
    pit.createPitCombatState("scarface", "berserker"),
    72,
  );
  counter = pit.stepPitCombat(counter, [{ attack: "technique" }, {}]);
  counter = advance(pit, counter, 3);
  counter = pit.stepPitCombat(counter, [{}, { attack: "light" }]);
  const scarfaceHealth = counter.fighters[0].health;
  counter = advance(pit, counter, 5);
  assert.equal(counter.fighters[0].health, scarfaceHealth);
  assert.ok(counter.fighters[1].health < pit.PIT_FIGHTERS.berserker.maxHealth);
  assert.equal(counter.events.some((event) => event.type === "hit"), true);

  let whiff = placeInRange(
    pit.createPitCombatState("scarface", "berserker"),
    120,
  );
  whiff = pit.stepPitCombat(whiff, [{ attack: "technique" }, {}]);
  whiff = advance(pit, whiff, 3);
  whiff = pit.stepPitCombat(whiff, [{}, { attack: "light" }]);
  const whiffHealth = whiff.fighters.map((fighter) => fighter.health);
  whiff = advance(pit, whiff, 5);
  assert.deepEqual(
    whiff.fighters.map((fighter) => fighter.health),
    whiffHealth,
    "a counter volume cannot punish an active strike whose real hitbox misses",
  );
  assert.equal(whiff.events.some((event) => event.type === "hit"), false);
});

test("technique state stays PIT-only, bounded, migratable and rejects forged entities", async () => {
  const pit = await pitPromise;
  const legacy = JSON.parse(pit.serializePitCombat(pit.createPitCombatState()));
  delete legacy.techniqueEffects;
  delete legacy.nextTechniqueEffectId;
  for (const fighter of legacy.fighters) delete fighter.techniqueStatus;
  const migrated = pit.deserializePitCombat(JSON.stringify(legacy));
  assert.deepEqual(migrated.techniqueEffects, []);
  assert.equal(migrated.nextTechniqueEffectId, 1);
  assert.deepEqual(migrated.fighters.map((fighter) => fighter.techniqueStatus), [null, null]);

  let active = pit.createPitCombatState("falconer", "berserker");
  active.fighters[0].x = 120;
  active.fighters[1].x = 840;
  active = pit.stepPitCombat(active, [{ attack: "technique" }, {}]);
  active = advance(pit, active, pit.PIT_FIGHTERS.falconer.attacks.technique.startup);
  const serialized = pit.serializePitCombat(active);
  assert.doesNotMatch(serialized, /campaign|reward|honou?r|troph(?:y|ee)/i);
  assert.deepEqual(pit.deserializePitCombat(serialized), active);

  const forged = JSON.parse(serialized);
  forged.techniqueEffects[0].techniqueId = "campaign-reward";
  assert.throws(
    () => pit.deserializePitCombat(JSON.stringify(forged)),
    /Invalid or incompatible/,
  );
});

test("four stacked bolt traps resolve as a sequential, scaled and restorable combo", async () => {
  const pit = await pitPromise;
  const move = pit.PIT_FIGHTERS["feral-hunter"].attacks.technique;
  const deployTrap = (current) => {
    let next = pit.stepPitCombat(current, [{ attack: "technique" }, {}]);
    next = advance(pit, next, move.startup);
    return advance(pit, next, move.active + move.recovery);
  };

  let state = pit.createPitCombatState("feral-hunter", "berserker");
  state.fighters[0].x = 220;
  state.fighters[1].x = 800;
  for (let trap = 0; trap < 4; trap += 1) state = deployTrap(state);
  assert.equal(state.techniqueEffects.length, 4);
  assert.deepEqual(pit.deserializePitCombat(pit.serializePitCombat(state)), state);

  state.fighters[0].x = 120;
  state.fighters[1].x = state.techniqueEffects[0].x + 40;
  state = pit.stepPitCombat(state, [{}, {}]);

  const hits = state.events.filter((event) => event.type === "hit");
  assert.deepEqual(hits.map((event) => event.combo), [1, 2, 3, 4]);
  assert.ok(hits.every((event) => event.damage > 0));
  assert.ok(hits.every((event, index) => index === 0 || event.damage < hits[index - 1].damage));
  assert.equal(state.fighters[1].comboHitsReceived, 4);
  assert.equal(state.techniqueEffects.length, 0);
  assert.deepEqual(pit.deserializePitCombat(pit.serializePitCombat(state)), state);
});

test("stacked persistent effects stop emitting hits after the first knockout", async () => {
  const pit = await pitPromise;
  const move = pit.PIT_FIGHTERS["feral-hunter"].attacks.technique;
  const deployTrap = (current) => {
    let next = pit.stepPitCombat(current, [{ attack: "technique" }, {}]);
    next = advance(pit, next, move.startup);
    return advance(pit, next, move.active + move.recovery);
  };

  let state = pit.createPitCombatState("feral-hunter", "berserker");
  state.fighters[0].x = 220;
  state.fighters[1].x = 800;
  for (let trap = 0; trap < 4; trap += 1) state = deployTrap(state);
  state.fighters[0].x = 120;
  state.fighters[1].x = state.techniqueEffects[0].x + 40;
  state.fighters[1].health = 20;
  state = pit.stepPitCombat(state, [{}, {}]);

  const hits = state.events.filter((event) => event.type === "hit");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].damage, 20);
  assert.equal(hits[0].combo, 1);
  assert.equal(state.events.some((event) => event.type === "hit" && event.damage === 0), false);
  assert.equal(state.phase, "round-over");
  assert.deepEqual(pit.deserializePitCombat(pit.serializePitCombat(state)), state);
});

test("both Chronicle bosses execute their authored world techniques deterministically", async () => {
  const pit = await pitPromise;
  for (const bossId of ["kok-warlord", "stone-heart"]) {
    let state = pit.createPitCombatState(bossId, "jungle-hunter");
    state.fighters[0].x = 120;
    state.fighters[1].x = 840;
    state = pit.stepPitCombat(state, [{ attack: "technique" }, {}]);
    state = advance(pit, state, pit.PIT_FIGHTERS[bossId].attacks.technique.startup);
    assert.equal(state.techniqueEffects.length, 1, bossId);
    assert.equal(state.techniqueEffects[0].techniqueId, pit.PIT_FIGHTERS[bossId].technique.id);
    assert.deepEqual(pit.deserializePitCombat(pit.serializePitCombat(state)), state);
  }
});
