import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({
  stdin: {
    contents: [
      'export * from "./app/game/systems/pitDescentCombat";',
      'export * from "./app/game/systems/pitArcade";',
      'export { createPitCombatState, deserializePitCombat, PIT_ARENAS, PIT_CLOAK_COOLDOWN_FRAMES, PIT_FIGHTERS, serializePitCombat, stepPitCombat } from "./app/game/systems/pitCombat";',
    ].join("\n"),
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});
const pit = await import(
  "data:text/javascript;base64," +
    Buffer.from(bundle.outputFiles[0].text).toString("base64"),
);

function resolveSelectedNode(run, node, id) {
  const selected = pit.selectPitDescentNode(run, node.id);
  if (node.kind === "fight" || node.kind === "boss") {
    return pit.applyPitDescentResolution(selected, {
      id,
      nodeId: node.id,
      victory: true,
      remainingHealth: selected.health,
      roundsWon: 2,
      roundsLost: 0,
      roundsDrawn: 0,
    }).run;
  }
  return pit.applyPitDescentResolution(selected, {
    id,
    nodeId: node.id,
  }).run;
}

function advanceRunToFloor(run, floor) {
  const plan = pit.createPitDescentPlan(run.fighterId, run.seed);
  let next = run;
  while (next.completedFloors < floor - 1) {
    const currentFloor = plan.floors[next.completedFloors];
    const node =
      currentFloor.options.find((candidate) => candidate.kind === "recovery") ??
      currentFloor.options[0];
    next = resolveSelectedNode(
      next,
      node,
      "fixture-" + next.seed + "-" + currentFloor.index,
    );
  }
  return next;
}

function routeForModifier(modifierId) {
  for (let seed = 0; seed < 2_000; seed += 1) {
    const run = pit.createPitDescentRun("jungle-hunter", seed);
    const plan = pit.createPitDescentPlan(run.fighterId, seed);
    for (const floor of plan.floors) {
      const node = floor.options.find(
        (candidate) =>
          (candidate.kind === "fight" || candidate.kind === "boss") &&
          candidate.modifierIds.length === 1 &&
          candidate.modifierIds[0] === modifierId,
      );
      if (!node) continue;
      const progressed = advanceRunToFloor(run, floor.index);
      return {
        run: pit.selectPitDescentNode(progressed, node.id),
        node,
      };
    }
  }
  throw new Error("Unable to find modifier route: " + modifierId);
}

function routeWithRelic(relicId) {
  for (let seed = 0; seed < 4_000; seed += 1) {
    let run = pit.createPitDescentRun("jungle-hunter", seed);
    const plan = pit.createPitDescentPlan(run.fighterId, seed);
    const relicNode = plan.floors[2].options.find(
      (candidate) => candidate.kind === "relic" && candidate.relicId === relicId,
    );
    if (!relicNode) continue;
    run = advanceRunToFloor(run, 3);
    run = resolveSelectedNode(run, relicNode, "relic-" + relicId + "-" + seed);
    const combatNode = plan.floors[3].options[0];
    return {
      run: pit.selectPitDescentNode(run, combatNode.id),
      node: combatNode,
    };
  }
  throw new Error("Unable to find relic route: " + relicId);
}

function combatState(run, node, distance = 360) {
  const state = pit.createPitCombatState(
    run.fighterId,
    node.opponentId,
    { arenaId: node.arenaId },
  );
  state.fighters[0].x = 480 - distance / 2;
  state.fighters[1].x = 480 + distance / 2;
  state.fighters[0].facing = 1;
  state.fighters[1].facing = -1;
  return state;
}

function prepare(route, distance = 360) {
  return pit.preparePitDescentCombat(
    combatState(route.run, route.node, distance),
    route.run,
    route.node,
  );
}

function descentStep(frame, inputs = [{}, {}]) {
  return pit.stepPitDescentCombat(frame.state, inputs, frame.context);
}

function advanceDescent(frame, frames, inputs = [{}, {}]) {
  let next = frame;
  for (let index = 0; index < frames; index += 1) {
    next = descentStep(next, inputs);
  }
  return next;
}

function advanceRaw(state, frames, inputs = [{}, {}]) {
  let next = state;
  for (let index = 0; index < frames; index += 1) {
    next = pit.stepPitCombat(next, inputs);
  }
  return next;
}

function assertRestorable(state) {
  assert.deepEqual(
    pit.deserializePitCombat(pit.serializePitCombat(state)),
    state,
  );
}

test("thin-air reduces only the deterministic initial jump impulse", () => {
  const route = routeForModifier("thin-air");
  const frame = prepare(route);
  const raw = pit.stepPitCombat(frame.state, [{ jump: true }, {}]);
  const wrapped = descentStep(frame, [{ jump: true }, {}]);
  assert.equal(raw.fighters[0].grounded, false);
  assert.equal(wrapped.state.fighters[0].grounded, false);
  assert.equal(
    wrapped.state.fighters[0].velocityY,
    Math.round(
      raw.fighters[0].velocityY *
        pit.PIT_DESCENT_THIN_AIR_JUMP_SCALE *
        1_000_000,
    ) / 1_000_000,
  );
  assert.equal(wrapped.state.fighters[1].velocityY, raw.fighters[1].velocityY);
  assertRestorable(wrapped.state);
});

test("shattered-guard adds bounded blockstun to a real successful guard", () => {
  const route = routeForModifier("shattered-guard");
  const initial = prepare(route, 82);
  const startup =
    pit.PIT_FIGHTERS[route.node.opponentId].attacks.light.startup;
  const inputs = [{ guardHigh: true }, { attack: "light" }];
  let raw = pit.stepPitCombat(initial.state, inputs);
  let wrapped = descentStep(initial, inputs);
  raw = advanceRaw(raw, startup, [{ guardHigh: true }, {}]);
  wrapped = advanceDescent(
    wrapped,
    startup,
    [{ guardHigh: true }, {}],
  );
  assert.equal(raw.events.some((event) => event.type === "block"), true);
  assert.equal(wrapped.state.events.some((event) => event.type === "block"), true);
  assert.equal(
    wrapped.state.fighters[0].stunFrames,
    raw.fighters[0].stunFrames +
      pit.PIT_DESCENT_SHATTERED_GUARD_BONUS_FRAMES,
  );
  assert.ok(wrapped.state.fighters[0].stunFrames <= 120);
  assertRestorable(wrapped.state);
});

test("predator-tempo accelerates every bounded Traque pressure gain for both camps", () => {
  const route = routeForModifier("predator-tempo");
  const initial = prepare(route);
  const raw = advanceRaw(initial.state, 12);
  const wrapped = advanceDescent(initial, 12);
  assert.deepEqual(raw.fighters.map((fighter) => fighter.traque), [1, 1]);
  assert.deepEqual(
    wrapped.state.fighters.map((fighter) => fighter.traque),
    [2, 2],
  );
  assert.deepEqual(
    wrapped.state.events
      .filter((event) => event.type === "traque-gain")
      .map((event) => event.amount),
    [2, 2],
  );
  assertRestorable(wrapped.state);
});

test("unstable-floor extends confirmed pushback toward the arena limits", () => {
  const route = routeForModifier("unstable-floor");
  const initial = prepare(route, 82);
  const startup = pit.PIT_FIGHTERS["jungle-hunter"].attacks.light.startup;
  let raw = pit.stepPitCombat(initial.state, [{ attack: "light" }, {}]);
  let wrapped = descentStep(initial, [{ attack: "light" }, {}]);
  raw = advanceRaw(raw, startup);
  wrapped = advanceDescent(wrapped, startup);
  assert.equal(raw.events.some((event) => event.type === "hit"), true);
  assert.equal(wrapped.state.events.some((event) => event.type === "hit"), true);
  assert.ok(wrapped.state.fighters[1].x > raw.fighters[1].x);
  assert.ok(
    wrapped.state.fighters[1].x <=
      pit.PIT_ARENAS[route.node.arenaId].rightWall -
        pit.PIT_FIGHTERS[route.node.opponentId].bodyWidth / 2,
  );
  assertRestorable(wrapped.state);
});

test("black-mist exposes a clamped long-range visual strength without mutating combat", () => {
  const route = routeForModifier("black-mist");
  const far = prepare(route, 560);
  assert.equal(far.presentation.blackMistLongRange, true);
  assert.equal(
    far.presentation.blackMistStrength,
    pit.PIT_DESCENT_BLACK_MIST_MAX_STRENGTH,
  );
  const near = prepare(route, 100);
  assert.equal(near.presentation.blackMistLongRange, false);
  assert.equal(near.presentation.blackMistStrength, 0);
  assert.deepEqual(
    pit.getPitDescentCombatPresentation(far.state, far.context),
    far.presentation,
  );
});

test("silent-crowd exposes the shortened resource feedback window", () => {
  const silent = prepare(routeForModifier("silent-crowd"));
  const ordinary = prepare(routeForModifier("thin-air"));
  assert.equal(
    silent.presentation.resourceFeedbackFrames,
    pit.PIT_DESCENT_SILENT_CROWD_FEEDBACK_FRAMES,
  );
  assert.equal(
    ordinary.presentation.resourceFeedbackFrames,
    pit.PIT_DESCENT_RESOURCE_FEEDBACK_FRAMES,
  );
});

test("prepare maps persistent route health proportionally to each fighter", () => {
  const plan = pit.createPitDescentPlan("jungle-hunter", 33);
  let run = pit.createPitDescentRun("jungle-hunter", 33);
  const firstNode = plan.floors[0].options[0];
  run = pit.selectPitDescentNode(run, firstNode.id);
  run = pit.applyPitDescentResolution(run, {
    id: "descent-health-fixture",
    nodeId: firstNode.id,
    victory: true,
    remainingHealth: 500,
    roundsWon: 1,
    roundsLost: 0,
    roundsDrawn: 0,
  }).run;
  const nextNode = plan.floors[1].options[0];
  assert.ok(nextNode.opponentId);
  run = pit.selectPitDescentNode(run, nextNode.id);
  const state = combatState(run, nextNode);
  const maximumHealth = pit.PIT_FIGHTERS[run.fighterId].maxHealth;
  const prepared = pit.preparePitDescentCombat(state, run, nextNode);

  assert.equal(prepared.state.fighters[0].health, Math.round(maximumHealth / 2));
  assert.equal(state.fighters[0].health, maximumHealth, "prepare remains pure");
  assertRestorable(prepared.state);
});

test("elder-knot grants a duel-only Traque floor while preserving a larger amount", () => {
  const route = routeWithRelic("elder-knot");
  const lowState = combatState(route.run, route.node);
  lowState.fighters[0].traque = 75;
  const low = pit.preparePitDescentCombat(lowState, route.run, route.node);
  assert.equal(
    low.state.fighters[0].traque,
    pit.PIT_DESCENT_ELDER_KNOT_TRAQUE,
  );
  assert.equal(lowState.fighters[0].traque, 75, "prepare remains pure");

  const highState = combatState(route.run, route.node);
  highState.fighters[0].traque = 450;
  const high = pit.preparePitDescentCombat(highState, route.run, route.node);
  assert.equal(high.state.fighters[0].traque, 450);
  assert.equal(high.context.run.temporaryRelicIds.includes("elder-knot"), true);
  assertRestorable(high.state);
});

test("tempered-mesh reduces and reports the first confirmed damage only", () => {
  const route = routeWithRelic("tempered-mesh");
  const initial = prepare(route, 82);
  const startup =
    pit.PIT_FIGHTERS[route.node.opponentId].attacks.light.startup;
  const openingInputs = [{}, { attack: "light" }];
  let raw = pit.stepPitCombat(initial.state, openingInputs);
  let wrapped = descentStep(initial, openingInputs);
  raw = advanceRaw(raw, startup);
  wrapped = advanceDescent(wrapped, startup);

  const rawHit = raw.events.find(
    (event) =>
      (event.type === "hit" || event.type === "block") &&
      event.defenderId === "jungle-hunter",
  );
  const wrappedHit = wrapped.state.events.find(
    (event) =>
      (event.type === "hit" || event.type === "block") &&
      event.defenderId === "jungle-hunter",
  );
  assert.ok(rawHit && wrappedHit);
  const reduction = Math.min(
    rawHit.damage - 1,
    Math.ceil(
      rawHit.damage *
        pit.PIT_DESCENT_TEMPERED_MESH_DAMAGE_REDUCTION,
    ),
  );
  assert.equal(wrappedHit.damage, rawHit.damage - reduction);
  assert.equal(
    wrapped.state.fighters[0].health - raw.fighters[0].health,
    reduction,
  );
  assert.equal(wrapped.context.temperedMeshAvailable, false);
  assertRestorable(wrapped.state);
});

test("hunter-rhythm grants a brief, bounded movement boost after a guard", () => {
  const route = routeWithRelic("hunter-rhythm");
  let frame = prepare(route, 82);
  const startup =
    pit.PIT_FIGHTERS[route.node.opponentId].attacks.light.startup;
  frame = descentStep(frame, [
    { guardHigh: true },
    { attack: "light" },
  ]);
  frame = advanceDescent(
    frame,
    startup,
    [{ guardHigh: true }, {}],
  );
  assert.equal(
    frame.context.hunterRhythmFramesRemaining,
    pit.PIT_DESCENT_HUNTER_RHYTHM_FRAMES,
  );
  assert.equal(frame.presentation.hunterRhythmActive, true);

  while (
    frame.state.fighters[0].phase !== "idle" &&
    frame.context.hunterRhythmFramesRemaining > 0
  ) {
    frame = descentStep(frame);
  }
  assert.ok(frame.context.hunterRhythmFramesRemaining > 0);
  const raw = pit.stepPitCombat(frame.state, [{ left: true }, {}]);
  const boosted = descentStep(frame, [{ left: true }, {}]);
  assert.ok(
    frame.state.fighters[0].x - boosted.state.fighters[0].x >
      frame.state.fighters[0].x - raw.fighters[0].x,
  );
  assertRestorable(boosted.state);
});

test("sealed-capacitor halves one real camouflage cooldown and is then spent", () => {
  const route = routeWithRelic("sealed-capacitor");
  let frame = prepare(route);
  frame.state.fighters[0].cloakCooldownFrames = 10;
  const raw = pit.stepPitCombat(frame.state);
  frame = descentStep(frame);
  assert.equal(raw.fighters[0].cloakCooldownFrames, 9);
  assert.equal(frame.state.fighters[0].cloakCooldownFrames, 8);
  assert.equal(
    pit.getPitDescentCooldownRecoveryFrames(frame.context),
    Math.ceil(pit.PIT_CLOAK_COOLDOWN_FRAMES / 2),
  );

  while (frame.state.fighters[0].cloakCooldownFrames > 0) {
    frame = descentStep(frame);
  }
  assert.equal(frame.context.sealedCapacitorSpent, true);
  assert.equal(
    pit.getPitDescentCooldownRecoveryFrames(frame.context),
    pit.PIT_CLOAK_COOLDOWN_FRAMES,
  );

  frame.state.fighters[0].cloakCooldownFrames = 10;
  frame = descentStep(frame);
  assert.equal(frame.state.fighters[0].cloakCooldownFrames, 9);
  assertRestorable(frame.state);
});

test("the wrapper preserves simultaneous trades, terminal phases and determinism", () => {
  const route = routeForModifier("unstable-floor");
  const initial = prepare(route, 82);
  const customState = pit.deserializePitCombat(
    pit.serializePitCombat(initial.state),
  );
  for (const fighter of customState.fighters) {
    const startup = pit.PIT_FIGHTERS[fighter.definitionId].attacks.light.startup;
    fighter.health = 20;
    fighter.phase = "startup";
    fighter.action = {
      kind: "attack",
      attack: "light",
      frame: startup - 1,
      connected: false,
    };
  }

  const left = pit.stepPitDescentCombat(
    customState,
    [{}, {}],
    initial.context,
  );
  const right = pit.stepPitDescentCombat(
    customState,
    [{}, {}],
    initial.context,
  );
  assert.deepEqual(left, right);
  assert.equal(left.state.events.filter((event) => event.type === "hit").length, 2);
  assert.deepEqual(left.state.fighters.map((fighter) => fighter.health), [0, 0]);
  assert.equal(left.state.phase, "round-over");
  assert.equal(left.state.lastRoundResult.reason, "double-ko");
  assert.deepEqual(customState.fighters.map((fighter) => fighter.health), [20, 20]);
  assertRestorable(left.state);
});

test("prepare and step reject non-canonical nodes, forged relics and stale contexts", () => {
  const route = routeForModifier("thin-air");
  const state = combatState(route.run, route.node);
  assert.throws(
    () =>
      pit.preparePitDescentCombat(
        state,
        route.run,
        { ...route.node, modifierIds: ["black-mist"] },
      ),
    /canonical combat node/,
  );
  const frame = pit.preparePitDescentCombat(state, route.run, route.node);
  assert.throws(
    () =>
      pit.stepPitDescentCombat(frame.state, [{}, {}], {
        ...frame.context,
        combatFrame: frame.context.combatFrame + 1,
      }),
    /combat context/,
  );
  assert.throws(
    () =>
      pit.stepPitDescentCombat(frame.state, [{}, {}], {
        ...frame.context,
        temperedMeshAvailable: true,
      }),
    /combat context/,
  );
});
