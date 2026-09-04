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
  return import(`data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`);
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