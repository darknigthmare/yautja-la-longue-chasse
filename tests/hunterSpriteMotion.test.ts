import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import type { HunterSpriteAtlas, HunterSpriteFacing } from "../app/game/hunterSpriteAtlas";
import type { PitFighterState, PitFighterId, PitAttackKind } from "../app/game/systems/pitCombat";
import type { PitHunterSpriteCursor } from "../app/game/hunterSpriteMotion";

async function load(relativePath: string): Promise<unknown> {
  const output = await build({
    entryPoints: [fileURLToPath(new URL(relativePath, import.meta.url))],
    bundle: true, format: "esm", platform: "node", target: "es2022", write: false,
  });
  return import("data:text/javascript;base64," + Buffer.from(output.outputFiles[0].text).toString("base64"));
}
const api = await load("../app/game/hunterSpriteMotion.ts") as typeof import("../app/game/hunterSpriteMotion");
const pit = await load("../app/game/systems/pitCombat.ts") as typeof import("../app/game/systems/pitCombat");

function fighter(patch: Partial<PitFighterState> = {}, id: PitFighterId = "jungle-hunter"): PitFighterState {
  return { ...pit.createPitCombatState(id, id === "berserker" ? "jungle-hunter" : "berserker").fighters[0], ...patch };
}
function atlas(clipId: string, facing: HunterSpriteFacing = "right",
  options: { loop?: boolean; ticksPerSecond?: number; characterId?: string } = {}): HunterSpriteAtlas {
  return {
    schemaVersion: 1, id: "test-authored-cells", characterId: options.characterId ?? "jungle-hunter",
    variantId: "test-only", sourceKind: "authored-frames", status: "validated",
    pages: [{ id: "page", src: "/test-only.png", width: 32, height: 8, status: "validated",
      transparency: { mode: "alpha" }, grid: { columns: 4, rows: 1 } }],
    clips: [{ id: clipId, facing, status: "validated", loop: options.loop ?? false,
      ticksPerSecond: options.ticksPerSecond ?? 60,
      frames: Array.from({ length: 4 }, (_, index) => ({
        pageId: "page", rect: [index * 8, 0, 8, 8], pivot: [4, 7], durationTicks: 1,
      })) }],
  };
}
function actionAt(frame: number): PitFighterState {
  return fighter({
    phase: frame < 5 ? "startup" : frame < 8 ? "active" : "recovery",
    action: { kind: "attack", attack: "light", frame, connected: false },
  });
}
function freeze(value: unknown): void {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
}

test("live Jungle light boundaries use 5/3/10 simulation ticks, not the global render frame", () => {
  const expected = [
    [0, "startup", 0, 5], [4, "startup", 4, 5],
    [5, "active", 0, 3], [7, "active", 2, 3],
    [8, "recovery", 0, 10], [17, "recovery", 9, 10],
  ] as const;
  let state = pit.createPitCombatState();
  state.fighters[0].x = 320;
  state.fighters[1].x = 850;
  const observed = new Map<number, ReturnType<typeof api.describePitHunterSpriteMotion>>();
  for (let step = 0; step < 20; step++) {
    state = pit.stepPitCombat(state, [step === 0 ? { attack: "light" } : {}, {}]);
    if (state.fighters[0].action) observed.set(state.fighters[0].action.frame,
      api.describePitHunterSpriteMotion(state.fighters[0], state.frame));
  }
  for (const [frame, phase, elapsed, duration] of expected) {
    const motion = observed.get(frame);
    assert.ok(motion);
    assert.equal(motion.clipId, "pit.stand.light." + phase);
    assert.equal(motion.phase, phase);
    assert.equal(motion.elapsedTicks, elapsed);
    assert.equal(motion.durationTicks, duration);
    assert.equal(motion.clock, "action-phase");
  }
  const first = api.describePitHunterSpriteMotion(actionAt(5), 9000)!;
  assert.equal(first.elapsedTicks, 0, "starting at a late world tick must not skip anticipation/contact");
  assert.equal(api.describePitHunterSpriteMotion(actionAt(18), 9000), null);
});

test("phase clips use authored weights within the simulation window without tweening or changing timing", () => {
  const start = atlas("pit.stand.light.startup");
  const frames = Array.from({ length: 5 }, (_, tick) =>
    api.resolvePitHunterSpriteFrame(start, api.describePitHunterSpriteMotion(actionAt(tick), 200 + tick))?.frame.frameIndex);
  assert.deepEqual(frames, [0, 0, 1, 2, 3]);
  const active = atlas("pit.stand.light.active", "right", { ticksPerSecond: 24 });
  assert.deepEqual([5, 6, 7].map(tick =>
    api.resolvePitHunterSpriteFrame(active, api.describePitHunterSpriteMotion(actionAt(tick), 400 + tick))?.frame.frameIndex), [0, 1, 2]);
  assert.equal(api.resolvePitHunterSpriteFrame(start,
    api.describePitHunterSpriteMotion(actionAt(5), 405)), null, "startup art never fills a missing active phase");
  const loopedContact = atlas("pit.stand.light.active", "right", { loop: true });
  assert.equal(api.resolvePitHunterSpriteFrame(loopedContact,
    api.describePitHunterSpriteMotion(actionAt(5), 405)), null);
});

test("action mapping distinguishes standing, crouched, aerial and both explicitly authored orientations", () => {
  const patches: readonly [Partial<PitFighterState>, string][] = [
    [{ grounded: true, crouching: false }, "stand"],
    [{ grounded: true, crouching: true }, "crouch"],
    [{ grounded: false, crouching: false, velocityY: 3 }, "air"],
  ];
  for (const [patch, posture] of patches) for (const facing of [-1, 1] as const) {
    const motion = api.describePitHunterSpriteMotion({ ...actionAt(5), ...patch, facing }, 105)!;
    assert.equal(motion.clipId, "pit." + posture + ".light.active");
    assert.equal(motion.posture, posture);
    assert.equal(motion.facing, facing === 1 ? "right" : "left");
    assert.equal(api.resolvePitHunterSpriteFrame(atlas(motion.clipId,
      facing === 1 ? "left" : "right"), motion), null);
    assert.ok(api.resolvePitHunterSpriteFrame(atlas(motion.clipId, motion.facing), motion));
  }
});

test("all 14 combatants retain their actual dedicated technique identity", () => {
  for (const id of Object.keys(pit.PIT_FIGHTERS) as PitFighterId[]) {
    const definition = pit.PIT_FIGHTERS[id];
    const state = fighter({ phase: "active",
      action: { kind: "attack", attack: "technique", frame: definition.attacks.technique.startup, connected: false } }, id);
    const motion = api.describePitHunterSpriteMotion(state, 100)!;
    assert.equal(motion.techniqueId, definition.technique.id);
    assert.equal(motion.clipId, "pit.stand.technique." + definition.technique.id + ".active");
    assert.equal(motion.durationTicks, definition.attacks.technique.active);
  }
  assert.equal(api.describePitHunterSpriteMotion(fighter({ phase: "active",
    action: { kind: "attack", attack: "technique", frame: 11, connected: false } }), 111)?.techniqueId, "jungle-disc-return");
  assert.equal(api.describePitHunterSpriteMotion(fighter({ phase: "active",
    action: { kind: "attack", attack: "technique", frame: 12, connected: false } }, "berserker"), 112)?.techniqueId, "berserker-ground-shock");
});

test("historical V4 throws retain 7/2/21 while V5 whiffs retain that timing", () => {
  for (const [stepper, connected] of [
    [pit.stepPitCombatV4Compatibility, false], [pit.stepPitCombatV4Compatibility, true],
    [pit.stepPitCombat, false],
  ] as const) {
    let state = pit.createPitCombatState();
    state.fighters[0].x = 400;
    state.fighters[1].x = connected ? 450 : 850;
    const seen = new Map<number, NonNullable<ReturnType<typeof api.describePitHunterSpriteMotion>>>();
    for (let step = 0; step < 33; step++) {
      state = stepper(state, [step === 0 ? { throw: true } : {}, {}]);
      if (state.fighters[0].action) {
        const motion = api.describePitHunterSpriteMotion(state.fighters[0], state.frame);
        assert.ok(motion);
        seen.set(state.fighters[0].action.frame, motion);
      }
    }
    assert.equal(seen.get(6)?.phase, "startup");
    assert.equal(seen.get(7)?.phase, "active");
    assert.equal(seen.get(8)?.phase, "active");
    assert.equal(seen.get(9)?.phase, "recovery");
    assert.equal(seen.get(9)?.elapsedTicks, 0);
    assert.equal(seen.get(29)?.elapsedTicks, 20);
    assert.equal(seen.get(30), undefined);
    assert.equal(seen.get(9)?.throwOutcome, connected ? "connected" : "whiff");
    assert.equal(seen.get(9)?.clipId, "pit.stand.throw.recovery." + (connected ? "connected" : "whiff"));
  }
});

test("V5 capture uses both roles and its eight-tick clock without substituting generic art", () => {
  let state = pit.createPitCombatState();
  state.fighters[0].x = 400; state.fighters[1].x = 450;
  for (let step = 0; !state.pendingThrow && step < 12; step++)
    state = pit.stepPitCombat(state, [step === 0 ? { throw: true } : {}, {}]);
  assert.ok(state.pendingThrow);
  const health = state.fighters.map(fighter => fighter.health);
  for (let elapsed = 0; elapsed < pit.PIT_THROW_TECH_WINDOW_FRAMES; elapsed++) {
    assert.ok(state.pendingThrow);
    const before = pit.serializePitCombat(state); freeze(state);
    for (const slot of [0, 1] as const) {
      const motion = api.describePitCombatHunterSpriteMotion(state, slot)!;
      assert.ok(motion);
      assert.equal(motion.clipId, "pit.stand.throw.capture." + (slot === 0 ? "attacker" : "defender"));
      assert.equal(motion.phase, "capture"); assert.equal(motion.elapsedTicks, elapsed);
      assert.equal(motion.durationTicks, 8); assert.equal(motion.clock, "throw-phase");
      assert.equal(api.resolvePitHunterSpriteFrame(atlas("pit.stand.blockstun.high", motion.facing), motion), null);
      assert.equal(api.resolvePitHunterSpriteFrame(atlas("pit.stand.throw.active", motion.facing), motion), null);
    }
    assert.deepEqual(state.fighters.map(fighter => fighter.health), health);
    assert.equal(pit.serializePitCombat(state), before);
    state = pit.stepPitCombat(state, [{}, {}]);
  }
  assert.equal(state.pendingThrow, null); assert.ok(state.fighters[1].health < health[1]);
  let cursor: PitHunterSpriteCursor | null = null;
  for (let elapsed = 0; elapsed < 21; elapsed++) {
    const motion: NonNullable<ReturnType<typeof api.describePitCombatHunterSpriteMotion>> = api.describePitCombatHunterSpriteMotion(state, 0, cursor)!;
    assert.ok(motion);
    assert.equal(motion.clipId, "pit.stand.throw.recovery.connected");
    assert.equal(motion.elapsedTicks, elapsed); assert.equal(motion.durationTicks, 21);
    assert.equal(motion.throwOutcome, "connected"); cursor = motion.cursor;
    assert.equal(api.describePitCombatHunterSpriteMotion(state, 1)?.phase, "knockdown");
    if (elapsed > 0) assert.equal(api.describePitCombatHunterSpriteMotion(state, 0), null,
      "an arbitrary recovery seek must not guess a block or throw");
    state = pit.stepPitCombat(state, [{}, {}]);
  }
  assert.equal(api.describePitCombatHunterSpriteMotion(state, 0, cursor)?.clipId, "idle");
});

test("V5 tech uses the real twelve-tick recovery and cannot mutate replay state or hitboxes", () => {
  let state = pit.createPitCombatState();
  state.fighters[0].x = 400; state.fighters[1].x = 450;
  for (let step = 0; !state.pendingThrow && step < 12; step++)
    state = pit.stepPitCombat(state, [step === 0 ? { throw: true } : {}, {}]);
  assert.ok(state.pendingThrow);
  const health = state.fighters.map(fighter => fighter.health);
  state = pit.stepPitCombat(state, [{}, { throw: true }]);
  assert.ok(state.events.some(event => event.type === "throw-tech"));
  const cursors: (PitHunterSpriteCursor | null)[] = [null, null];
  for (let elapsed = 0; elapsed < pit.PIT_THROW_TECH_RECOVERY_FRAMES; elapsed++) {
    const bytes = pit.serializePitCombat(state);
    const boxes = state.fighters.map(pit.getPitFighterBoxes); freeze(state);
    for (const slot of [0, 1] as const) {
      const motion = api.describePitCombatHunterSpriteMotion(state, slot, cursors[slot])!;
      assert.ok(motion);
      assert.equal(motion.clipId, "pit.stand.throw.recovery.teched");
      assert.equal(motion.phase, "recovery"); assert.equal(motion.throwOutcome, "teched");
      assert.equal(motion.elapsedTicks, elapsed); assert.equal(motion.durationTicks, 12);
      assert.equal(api.resolvePitHunterSpriteFrame(atlas("pit.stand.blockstun.high", motion.facing), motion), null);
      cursors[slot] = motion.cursor;
    }
    assert.equal(pit.serializePitCombat(state), bytes);
    assert.deepEqual(state.fighters.map(pit.getPitFighterBoxes), boxes);
    assert.deepEqual(state.fighters.map(fighter => fighter.health), health);
    state = pit.stepPitCombat(state, [{}, {}]);
  }
  assert.equal(api.describePitCombatHunterSpriteMotion(state, 0, cursors[0])?.clipId, "idle");
  assert.equal(api.describePitCombatHunterSpriteMotion(state, 1, cursors[1])?.clipId, "idle");
});

test("locomotion uses facing-relative travel, never a run or discrete backstep substitute", () => {
  for (const facing of [-1, 1] as const) {
    assert.equal(api.describePitHunterSpriteMotion(fighter({ velocityX: 5 * facing, facing }), 20)?.clipId, "walk");
    const backward = api.describePitHunterSpriteMotion(fighter({ velocityX: -5 * facing, facing }), 20)!;
    assert.equal(backward.clipId, "walk-backward");
    assert.equal(api.resolvePitHunterSpriteFrame(atlas("backstep", backward.facing), backward), null);
    assert.equal(api.describePitHunterSpriteMotion(fighter({ velocityX: 2 * facing, facing, crouching: true }), 20)?.clipId, "crouch-walk-forward");
    assert.equal(api.describePitHunterSpriteMotion(fighter({ velocityX: -2 * facing, facing, crouching: true }), 20)?.clipId, "crouch-walk-backward");
  }
  assert.equal(api.describePitHunterSpriteMotion(fighter({ crouching: true }), 20)?.clipId, "crouch");
  assert.equal(api.describePitHunterSpriteMotion(fighter(), 20)?.clipId, "idle");
});

test("PIT positive vertical velocity rises, zero is apex, negative falls", () => {
  for (const [velocityY, part] of [[5, "rise"], [0, "apex"], [-5, "fall"]] as const) {
    const motion = api.describePitHunterSpriteMotion(fighter({ grounded: false, velocityY }), 45)!;
    assert.equal(motion.clipId, "pit.air.jump." + part);
    assert.equal(api.resolvePitHunterSpriteFrame(atlas("jump"), motion), null,
      "an undivided jump sheet is not silently treated as a phase-specific clip");
  }
});

test("guard entry cursor starts at observation zero, advances deterministically and survives an orientation change", () => {
  const first = api.describePitHunterSpriteMotion(fighter({ guard: "high" }), 600)!;
  assert.equal(first.clipId, "high-guard");
  assert.equal(first.elapsedTicks, 0);
  const next = api.describePitHunterSpriteMotion(fighter({ guard: "high", facing: -1 }), 606, first.cursor)!;
  assert.equal(next.elapsedTicks, 6);
  assert.equal(next.facing, "left");
  assert.equal(api.describePitHunterSpriteMotion(fighter({ guard: "high", facing: -1 }), 606, next.cursor)?.elapsedTicks, 6);
  assert.equal(api.describePitHunterSpriteMotion(fighter({ guard: "low" }), 607, next.cursor)?.elapsedTicks, 0);
  assert.equal(api.describePitHunterSpriteMotion(fighter({ guard: "high" }), 590, next.cursor)?.elapsedTicks, 0,
    "a backward seek resets presentation instead of using a future origin");
});

test("natural playback converts 60 Hz PIT ticks into the authored clip timebase", () => {
  const start = api.describePitHunterSpriteMotion(fighter(), 100)!;
  const sheet = atlas("idle", "right", { loop: true, ticksPerSecond: 24 });
  assert.equal(api.resolvePitHunterSpriteFrame(sheet,
    api.describePitHunterSpriteMotion(fighter(), 102, start.cursor))?.frame.frameIndex, 0);
  assert.equal(api.resolvePitHunterSpriteFrame(sheet,
    api.describePitHunterSpriteMotion(fighter(), 103, start.cursor))?.frame.frameIndex, 1);
  assert.equal(api.resolvePitHunterSpriteFrame(sheet,
    api.describePitHunterSpriteMotion(fighter(), 110, start.cursor))?.frame.frameIndex, 0);
});

test("reactions use real remaining counters and reset on another impact without trusting combo time as an onset", () => {
  const first = api.describePitHunterSpriteMotion(fighter({
    phase: "blockstun", guard: "low", stunFrames: 12, comboLastHitFrame: 454,
  }), 500)!;
  assert.equal(first.clipId, "pit.crouch.blockstun.low");
  assert.equal(first.elapsedTicks, 0);
  assert.equal(first.durationTicks, 12);
  const next = api.describePitHunterSpriteMotion(fighter({
    phase: "blockstun", guard: "low", stunFrames: 9, comboLastHitFrame: 454,
  }), 503, first.cursor)!;
  assert.equal(next.elapsedTicks, 3);
  assert.equal(next.durationTicks, 12);
  const another = api.describePitHunterSpriteMotion(fighter({
    phase: "blockstun", guard: "low", stunFrames: 9, comboLastHitFrame: 458,
  }), 504, next.cursor)!;
  assert.equal(another.elapsedTicks, 0);
  assert.equal(another.durationTicks, 9);
  assert.equal(api.describePitHunterSpriteMotion(fighter({
    phase: "hitstun", stunFrames: 8, grounded: false, velocityY: 2,
  }), 20)?.clipId, "pit.air.hitstun");
  assert.equal(api.describePitHunterSpriteMotion(fighter({
    phase: "knockdown", knockdownFrames: 30,
  }), 20)?.clipId, "pit.stand.knockdown");
  assert.equal(api.describePitHunterSpriteMotion(fighter({ health: 0 }), 20)?.clipId, "pit.stand.ko");
});

test("cloak uses its real startup/recovery countdown while concurrent effects never replace attack art", () => {
  const entering = api.describePitHunterSpriteMotion(fighter({
    cloakPhase: "startup", cloakFramesRemaining: 8,
  }), 100)!;
  assert.equal(entering.clipId, "pit.stand.cloak.startup.idle");
  assert.equal(entering.durationTicks, 8);
  assert.equal(entering.elapsedTicks, 0);
  const ending = api.describePitHunterSpriteMotion(fighter({
    cloakPhase: "recovery", cloakFramesRemaining: 4,
  }), 108)!;
  assert.equal(ending.elapsedTicks, 6);
  assert.equal(ending.durationTicks, 10);
  const attacking = api.describePitHunterSpriteMotion({
    ...actionAt(5), cloakPhase: "recovery", cloakFramesRemaining: 4,
    survivalInstinctFrames: 200, techniqueStatus: { kind: "tracked", sourceFighterId: "falconer", framesRemaining: 90 },
  }, 108)!;
  assert.equal(attacking.clipId, "pit.stand.light.active");
  assert.equal(attacking.effects.cloakProgress, 0.6);
  assert.equal(attacking.effects.survivalInstinctActive, true);
  assert.equal(attacking.effects.techniqueStatus, "tracked");
});

test("missing, unreviewed, wrong-character and stale-phase inputs remain explicit nulls", () => {
  const motion = api.describePitHunterSpriteMotion(actionAt(0), 20)!;
  const valid = atlas(motion.clipId);
  assert.equal(api.resolvePitHunterSpriteFrame({ ...valid, status: "draft" }, motion), null);
  assert.equal(api.resolvePitHunterSpriteFrame({ ...valid, characterId: "berserker" }, motion), null);
  assert.equal(api.resolvePitHunterSpriteFrame(atlas("pit.stand.heavy.startup"), motion), null);
  assert.equal(api.resolvePitHunterSpriteFrame(valid, null), null);
  assert.equal(api.describePitHunterSpriteMotion({ ...actionAt(5), phase: "startup" }, 20), null);
  for (const frame of [-1, NaN, Infinity, 1.5]) assert.equal(api.describePitHunterSpriteMotion(fighter(), frame), null);
});

test("observing real fights cannot mutate simulation/replay serialization or hitboxes", () => {
  let state = pit.createPitCombatState();
  let cursor: PitHunterSpriteCursor | null = null;
  for (let tick = 0; tick < 180; tick++) {
    const attack: PitAttackKind | undefined = tick === 40 ? "light" : tick === 70 ? "heavy" : undefined;
    state = pit.stepPitCombat(state, [
      { right: tick < 20, jump: tick === 25, attack },
      { left: tick < 20, guardHigh: tick > 35 && tick < 60 },
    ]);
    const before = pit.serializePitCombat(state);
    const boxes = state.fighters.map(pit.getPitFighterBoxes);
    freeze(state);
    const current = api.describePitHunterSpriteMotion(state.fighters[0], state.frame, cursor);
    assert.ok(current);
    assert.deepEqual(current, api.describePitHunterSpriteMotion(state.fighters[0], state.frame, cursor));
    cursor = current.cursor;
    api.resolvePitHunterSpriteFrame(atlas(current.clipId, current.facing), current);
    assert.equal(pit.serializePitCombat(state), before);
    assert.deepEqual(state.fighters.map(pit.getPitFighterBoxes), boxes);
    assert.equal(state.version, pit.PIT_STATE_VERSION);
  }
});

test("adapter source is independent of Canvas, skeletal posing and hidden wall clocks", async () => {
  const source = await readFile(new URL("../app/game/hunterSpriteMotion.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /from ["'][^"']*(?:hunterRig|pitFighterAnimation|pitFighterRendering|PitCanvas)/);
  assert.doesNotMatch(source, /Date\.now|performance\.now|requestAnimationFrame|solveHunterRig|drawImage|Math\.random/);
});
