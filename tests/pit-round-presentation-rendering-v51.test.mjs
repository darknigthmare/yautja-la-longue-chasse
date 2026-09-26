import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

// Explicit synthetic pixels test the real readback/loader; production PNGs are
// audited separately. No production art is replaced by these fixtures.
const registryFixture = { name: "empty-presentation-production-registry", setup(bundle) {
  bundle.onResolve({ filter: /pitSpriteSheetRegistry$/ }, () => ({ path: "registry", namespace: "fixture" }));
  bundle.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const PIT_SPRITE_SHEET_REGISTRY = [];", loader: "js" }));
} };
const built = await build({ plugins: [registryFixture], stdin: { contents: `
  export * from './app/game/pitSpriteSheetAnimation.ts';
  export * from './app/game/pitCombatBitmapArt.ts';
  export { createPitCombatState } from './app/game/systems/pitCombat.ts';
`, resolveDir: fileURLToPath(new URL("..", import.meta.url)) }, bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const {
  loadPitSpriteSheetAnimations: load,
  resolvePitSpriteSheetAnimation: resolveGameplay,
  resolvePitSpriteSheetPresentation: resolvePresentation,
  drawPitSpriteSheetPresentation: drawPresentation,
  drawPitCombatBitmapFighter: drawWithFallback,
  getPitFighterPresentationVisualStatus: presentationStatus,
  getPitCombatBitmapArtDefinition: bitmapDefinition,
  createPitCombatState,
} = await import("data:text/javascript;base64," + Buffer.from(built.outputFiles[0].text).toString("base64"));

const sourcePath = "/game/sprites/v51/test-presentation.png";
const ahabMasked = "ahab-avec-casque-0c8ceb1c95";
const ahabUnmasked = "ahab-sans-casque-91544a7fb2";
const frame = (index, durationTicks = 2) => ({ pageId: "body", rect: [index * 8, 0, 8, 8], pivot: [4, 7], durationTicks });
const clip = (id = "idle", facing = "right", frames = [frame(0), frame(1, 4)], loop = id === "idle") =>
  ({ id, facing, status: "validated", loop, ticksPerSecond: 60, frames });
function definition(clips = [clip()], { fighterId = "jungle-hunter", variantId, atlasId = "presentation-test" } = {}) {
  return { fighterId, ...(variantId ? { variantId } : {}), bodyHeightPx: 6,
    atlas: { schemaVersion: 1, id: atlasId, characterId: fighterId, variantId: variantId ?? "fixture-film",
      sourceKind: "authored-frames", status: "validated",
      pages: [{ id: "body", src: sourcePath, width: 24, height: 8, status: "validated", transparency: { mode: "alpha" } }], clips } };
}
function browser(mode = "alpha") {
  const previous = { Image: globalThis.Image, document: globalThis.document };
  const requests = [];
  globalThis.Image = class {
    set src(value) {
      this.source = value;
      if (!value) return;
      requests.push(value); this.complete = true; this.naturalWidth = 24; this.naturalHeight = 8;
      queueMicrotask(() => this.onload?.());
    }
    get src() { return this.source; }
  };
  globalThis.document = { createElement() {
    const canvas = { width: 0, height: 0, getContext() { return {
      clearRect() {}, drawImage() {}, putImageData() {}, getImageData() {
        if (mode === "tainted") throw Error("readback denied");
        const pixels = new Uint8ClampedArray(canvas.width * canvas.height * 4);
        if (mode === "hidden-rgb-duplicate") for (let i = 0; i < pixels.length; i += 4) pixels.set([i % 251, 73, 12, 0], i);
        if (mode !== "empty") for (let cell = 0; cell < 3; cell++) {
          pixels.set([mode.includes("duplicate") ? 50 : 50 + cell * 40, 80, 10, 255], (3 * canvas.width + cell * 8 + 3) * 4);
          if (mode === "alpha-noise-duplicate") pixels.set([cell * 71, 27, 9, 1], (2 * canvas.width + cell * 8 + 2) * 4);
        }
        if (mode === "clipped") pixels[3] = 255;
        return { data: pixels };
      },
    }; } };
    return canvas;
  } };
  return { requests, restore() { Object.assign(globalThis, previous); } };
}
function view(patch = {}) {
  return { phase: "intro-left", elapsedMs: 0, durationMs: 1000, round: 1, fighterSlot: 0,
    winnerSlot: null, blocksSimulation: true, resultVisible: false, ...patch };
}
function result(winnerSlot, elapsedMs = 0, phase = "round-result") {
  return view({ phase, elapsedMs, winnerSlot, resultVisible: true });
}
function stateForSlot(slot = 0) {
  return createPitCombatState(slot === 0 ? "jungle-hunter" : "berserker", slot === 1 ? "jungle-hunter" : "berserker");
}
function freeze(value) {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function bitmapBank(fighter, spriteSheets, includeImage = true) {
  const art = bitmapDefinition(fighter.definitionId, fighter.variantId);
  const key = JSON.stringify([fighter.definitionId, fighter.variantId ?? null]);
  const image = { complete: true, naturalWidth: art.width, naturalHeight: art.height, source: art.src };
  return { spriteSheets, images: new Map(includeImage ? [[fighter.definitionId, image]] : []),
    appearanceImages: new Map(includeImage ? [[key, image]] : []), selectionKeys: new Set([key]),
    variants: new Map([[fighter.definitionId, fighter.variantId ?? null]]), requestedIds: new Set([fighter.definitionId]),
    readyIds: new Set(includeImage ? [fighter.definitionId] : []), failedIds: new Set(), cancelled: false };
}
function recordingContext(throwOnDraw = false) {
  const calls = [], stack = [];
  const keys = ["globalAlpha", "filter", "shadowColor", "shadowBlur", "imageSmoothingEnabled"];
  return { calls, globalAlpha: .8, filter: "sepia(.2)", shadowColor: "#123456", shadowBlur: 3, imageSmoothingEnabled: true,
    save() { stack.push(Object.fromEntries(keys.map(key => [key, this[key]]))); calls.push(["save"]); },
    restore() { Object.assign(this, stack.pop()); calls.push(["restore"]); },
    translate(...args) { calls.push(["translate", ...args]); }, scale(...args) { calls.push(["scale", ...args]); }, rotate(...args) { calls.push(["rotate", ...args]); },
    drawImage(...args) { calls.push(["drawImage", ...args]); if (throwOnDraw) throw Error("draw denied"); } };
}
const contextState = context => [context.globalAlpha, context.filter, context.shadowColor, context.shadowBlur, context.imageSmoothingEnabled];

for (const kind of ["intro", "victory", "defeat"]) test(`dedicated ${kind} wins over earlier fallback art and advances while the simulation is frozen`, async () => {
  const env = browser();
  try {
    const idle = definition([clip()], { atlasId: "idle-first" });
    const dedicated = definition([clip("pit.presentation." + kind, "right", [frame(1), frame(2, 4)], false)], { atlasId: "dedicated-second" });
    const bank = await load(["jungle-hunter"], [idle, dedicated]);
    const state = freeze(createPitCombatState()), fighter = state.fighters[0], before = JSON.stringify(state);
    const makeView = elapsedMs => freeze(kind === "intro" ? view({ elapsedMs }) : result(kind === "victory" ? 0 : 1, elapsedMs));
    const first = resolvePresentation(bank, fighter, { combat: state, simulationFrame: 0, presentation: makeView(0) });
    const next = resolvePresentation(bank, fighter, { combat: state, simulationFrame: 0, presentation: makeView(50) });
    assert.equal(first.status, "dedicated-animation"); assert.equal(first.cue.kind, kind);
    assert.equal(first.definition.atlas.id, "dedicated-second");
    assert.equal(first.frame.clip.id, "pit.presentation." + kind); assert.equal(first.frame.frameIndex, 0);
    assert.equal(next.frame.frameIndex, 1); assert.ok(next.cue.elapsedTicks > first.cue.elapsedTicks);
    assert.equal(presentationStatus(bitmapBank(fighter, bank), fighter, { presentation: makeView(50) }), "dedicated-animation");
    assert.equal(JSON.stringify(state), before); assert.equal(state.frame, 0);
    const repeated = resolvePresentation(bank, fighter, { simulationFrame: 0, presentation: makeView(50) });
    assert.deepEqual(repeated.frame, next.frame, "An unchanged lifecycle view must stay visually stable");
  } finally { env.restore(); }
});

test("presentation clocks do not reset or advance the gameplay animation cursor", async () => {
  const env = browser();
  try {
    const bank = await load(["jungle-hunter"], [definition([clip(), clip("pit.presentation.intro")])]);
    const fighter = freeze(createPitCombatState().fighters[0]);
    assert.equal(resolveGameplay(bank, fighter, { simulationFrame: 100 }).resolved.frame.frameIndex, 0);
    assert.equal(resolveGameplay(bank, fighter, { simulationFrame: 102 }).resolved.frame.frameIndex, 1);
    for (const elapsedMs of [0, 33, 200, 800]) resolvePresentation(bank, fighter, { simulationFrame: 102, presentation: freeze(view({ elapsedMs })) });
    assert.equal(resolveGameplay(bank, fighter, { simulationFrame: 103 }).resolved.frame.frameIndex, 1);
    assert.equal(resolveGameplay(bank, fighter, { simulationFrame: 106 }).resolved.frame.frameIndex, 0);
  } finally { env.restore(); }
});

test("reviewed exact intro holds its first pose while waiting and its last pose while ready, without moving gameplay", async () => {
  const env = browser();
  try {
    const entry = definition([
      clip("idle", "right", [frame(0), frame(1), frame(2)]),
      clip("idle", "left", [frame(0), frame(1), frame(2)]),
      clip("pit.presentation.intro", "right", [frame(1), frame(0), frame(2)], false),
      clip("pit.presentation.intro", "left", [frame(2), frame(0), frame(1)], false),
    ], { fighterId: "user-ahab", variantId: ahabMasked });
    const bank = await load(["user-ahab"], [entry], { variants: [ahabMasked] });
    for (const slot of [0, 1]) {
      const state = freeze(createPitCombatState(slot === 0 ? "user-ahab" : "wolf", slot === 1 ? "user-ahab" : "wolf",
        { variants: slot === 0 ? [ahabMasked, null] : [null, ahabMasked] }));
      const fighter = state.fighters[slot], before = JSON.stringify(state);
      const facing = slot === 0 ? "right" : "left";
      const intro = entry.atlas.clips.find(candidate => candidate.id === "pit.presentation.intro" && candidate.facing === facing);
      assert.equal(resolveGameplay(bank, fighter, { simulationFrame: 100 }).resolved.frame.frameIndex, 0);
      for (const reducedMotion of [false, true]) for (const elapsedMs of [0, 50, 900]) {
        for (const presentation of [view({ phase: "intro-right", fighterSlot: slot === 0 ? 1 : 0, elapsedMs }), view({ phase: "countdown", elapsedMs })]) {
          const held = resolvePresentation(bank, fighter, { presentation, reducedMotion });
          assert.equal(held.cue.kind, "ready"); assert.equal(held.status, "staged-held-pose");
          assert.equal(held.frame.clip.id, "pit.presentation.intro"); assert.equal(held.frame.frameIndex, 2);
          assert.deepEqual(held.frame.frame, intro.frames[2]);
        }
        const waiting = resolvePresentation(bank, fighter, { presentation: view({ phase: "intro-left", fighterSlot: slot === 0 ? 1 : 0, elapsedMs }), reducedMotion });
        assert.equal(waiting.cue.kind, "waiting"); assert.equal(waiting.status, "staged-held-pose");
        assert.equal(waiting.frame.clip.id, "pit.presentation.intro"); assert.equal(waiting.frame.frameIndex, 0);
        assert.deepEqual(waiting.frame.frame, intro.frames[0]);
      }
      assert.equal(JSON.stringify(state), before);
      assert.equal(resolveGameplay(bank, fighter, { simulationFrame: 103 }).resolved.frame.frameIndex, 1,
        "Held presentation poses do not reset or advance the gameplay cursor");
    }
  } finally { env.restore(); }
});

test("held entrance poses reject looped, draft and one-drawing intros and preserve native exact-costume fallbacks", async () => {
  const env = browser();
  try {
    const fighter = createPitCombatState("user-ahab", "wolf", { variants: [ahabMasked, null] }).fighters[0];
    for (const rejected of [
      clip("pit.presentation.intro", "right", [frame(1), frame(2)], true),
      { ...clip("pit.presentation.intro", "right", [frame(1), frame(2)], false), status: "draft" },
      clip("pit.presentation.intro", "right", [frame(1)], false),
      clip("pit.presentation.intro", "left", [frame(1), frame(2)], false),
    ]) {
      const bank = await load(["user-ahab"], [definition([clip(), rejected], { fighterId: "user-ahab", variantId: ahabMasked })], { variants: [ahabMasked] });
      for (const phase of ["countdown", "intro-left"]) {
        const held = resolvePresentation(bank, fighter, { presentation: view({ phase, fighterSlot: 1, elapsedMs: 900 }) });
        assert.equal(held.status, "staged-held-pose"); assert.equal(held.frame.clip.id, "idle"); assert.equal(held.frame.frameIndex, 0);
      }
      assert.equal(resolvePresentation(bank, { ...fighter, variantId: ahabUnmasked }, { presentation: view({ phase: "countdown" }) }), null);
    }
    const bank = await load(["user-ahab"], [definition([clip("pit.presentation.intro")], { fighterId: "user-ahab", variantId: ahabMasked })], { variants: [ahabMasked] });
    assert.equal(resolvePresentation(bank, { ...fighter, facing: -1 }, { presentation: view({ phase: "countdown" }) }), null,
      "A held pose must never mirror or borrow its opposite-facing intro");
  } finally { env.restore(); }
});

test("native facing and exact supplied costume are mandatory for dedicated and reused presentation art", async () => {
  const env = browser();
  try {
    const entry = definition([clip("pit.presentation.intro"), clip()], { fighterId: "user-ahab", variantId: ahabMasked });
    const bank = await load(["user-ahab"], [entry], { variants: [ahabMasked] });
    const fighter = createPitCombatState("user-ahab", "wolf", { variants: [ahabMasked, null] }).fighters[0];
    assert.equal(resolvePresentation(bank, fighter, { presentation: view() }).status, "dedicated-animation");
    assert.equal(resolvePresentation(bank, { ...fighter, facing: -1 }, { presentation: view() }), null);
    assert.equal(resolvePresentation(bank, { ...fighter, variantId: ahabUnmasked }, { presentation: view() }), null);
    assert.equal(resolvePresentation(bank, { ...fighter, definitionId: "wolf" }, { presentation: view() }), null);
    const left = definition([clip("pit.presentation.intro", "left")], { atlasId: "left-authored" });
    const leftBank = await load(["jungle-hunter"], [left]);
    const leftFighter = stateForSlot(1).fighters[1], ctx = recordingContext();
    assert.equal(drawPresentation(ctx, leftBank, leftFighter, 400, { presentation: view({ phase: "intro-right", fighterSlot: 1 }) }), true);
    assert.equal(ctx.calls.some(call => call[0] === "scale" && (call[1] < 0 || call[2] < 0)), false);
  } finally { env.restore(); }
});

test("forged banks, drafts, empty/noisy duplicate cells and revoked evidence cannot authorize a dedicated presentation", async () => {
  const fighter = createPitCombatState().fighters[0], presentation = view();
  assert.equal(resolvePresentation({ requestedIds: new Set(["jungle-hunter"]), readyClipCount: 1, cancelled: false }, fighter, { presentation }), null);
  for (const mode of ["empty", "clipped", "tainted", "duplicate", "hidden-rgb-duplicate", "alpha-noise-duplicate"]) {
    const env = browser(mode);
    try {
      const entry = definition([clip("pit.presentation.intro")]);
      if (mode === "alpha-noise-duplicate") entry.atlas.pages[0].transparency.noiseFloor = 1;
      const bank = await load(["jungle-hunter"], [entry]);
      assert.equal(bank.readyClipCount, 0, mode);
      assert.equal(resolvePresentation(bank, fighter, { presentation }), null, mode);
    } finally { env.restore(); }
  }
  const env = browser();
  try {
    const draft = definition([clip("pit.presentation.intro")]); draft.atlas.status = "draft";
    assert.equal((await load(["jungle-hunter"], [draft])).readyClipCount, 0); assert.deepEqual(env.requests, []);
    const single = await load(["jungle-hunter"], [definition([clip("pit.presentation.intro", "right", [frame(0)], false)])]);
    assert.equal(resolvePresentation(single, fighter, { presentation }), null, "One still drawing is not a dedicated animation");
    const control = new AbortController();
    const revoked = await load(["jungle-hunter"], [definition([clip("pit.presentation.intro")])], { signal: control.signal });
    control.abort(); assert.equal(resolvePresentation(revoked, fighter, { presentation }), null);
  } finally { env.restore(); }
});

test("idle reuse, waiting holds, draws and dedicated presentations report their actual visual coverage", async () => {
  const env = browser();
  try {
    const bank = await load(["jungle-hunter"], [definition([clip()])]);
    const fighter = createPitCombatState().fighters[0];
    for (const presentation of [view({ elapsedMs: 50 }), result(0, 50), result(null, 50)]) {
      const chosen = resolvePresentation(bank, fighter, { presentation });
      assert.equal(chosen.status, "reused-idle-animation"); assert.equal(chosen.frame.clip.id, "idle"); assert.equal(chosen.frame.frameIndex, 1);
      assert.equal(presentationStatus(bitmapBank(fighter, bank), fighter, { presentation }), "reused-idle-animation");
    }
    for (const [presentation, kind] of [
      [view({ phase: "intro-right", fighterSlot: 1, elapsedMs: 50 }), "ready"],
      [view({ phase: "countdown", elapsedMs: 50 }), "ready"],
    ]) {
      const chosen = resolvePresentation(bank, fighter, { presentation });
      assert.equal(chosen.cue.kind, kind); assert.equal(chosen.status, "staged-held-pose"); assert.equal(chosen.frame.frameIndex, 0);
    }
    const leftFighter = stateForSlot(1).fighters[1];
    const leftBank = await load(["jungle-hunter"], [definition([clip("idle", "left")])]);
    const waiting = resolvePresentation(leftBank, leftFighter, { presentation: view({ elapsedMs: 50 }) });
    assert.equal(waiting.cue.kind, "waiting"); assert.equal(waiting.status, "staged-held-pose"); assert.equal(waiting.frame.frameIndex, 0);
    for (const phase of ["fight", "idle"]) {
      assert.equal(resolvePresentation(bank, fighter, { presentation: view({ phase, blocksSimulation: false }) }), null);
      assert.equal(presentationStatus(bitmapBank(fighter, bank), fighter, { presentation: view({ phase, blocksSimulation: false }) }), "none");
    }
    assert.equal(resolvePresentation(bank, fighter), null);
  } finally { env.restore(); }
});

test("defeat holds the final crouch or idle drawing and never borrows victory or hitstun art", async () => {
  const env = browser();
  try {
    const fighter = createPitCombatState().fighters[0];
    const unrelated = [clip("pit.presentation.victory"), clip("pit.stand.hitstun", "right", [frame(1), frame(2)], false)];
    for (const preferred of ["crouch", "idle"]) {
      const bank = await load(["jungle-hunter"], [definition([...unrelated, clip(), ...(preferred === "crouch" ? [clip("crouch", "right", [frame(1), frame(2)], false)] : [])])]);
      for (const elapsedMs of [0, 50, 900]) {
        const defeat = resolvePresentation(bank, fighter, { presentation: result(1, elapsedMs, "match-result") });
        assert.equal(defeat.cue.kind, "defeat"); assert.equal(defeat.status, "staged-held-pose");
        assert.equal(defeat.frame.clip.id, preferred); assert.equal(defeat.frame.frameIndex, 1);
      }
    }
    const none = await load(["jungle-hunter"], [definition(unrelated)]);
    assert.equal(resolvePresentation(none, fighter, { presentation: result(1, 50) }), null);
  } finally { env.restore(); }
});

test("supplied static fallback retains the exact costume and stays a staged bitmap rather than an invented animation", async () => {
  const env = browser();
  try {
    const fighter = createPitCombatState("user-ahab", "wolf", { variants: [ahabMasked, null] }).fighters[0];
    const before = structuredClone(fighter), bank = bitmapBank(fighter, await load(["user-ahab"], [], { variants: [ahabMasked] }));
    const presentation = freeze(view({ elapsedMs: 500 }));
    assert.equal(presentationStatus(bank, fighter, { presentation }), "staged-bitmap");
    assert.equal(presentationStatus(bank, { ...fighter, variantId: ahabUnmasked }, { presentation }), "none");
    assert.equal(presentationStatus(bitmapBank(fighter, null, false), fighter, { presentation }), "none");
    assert.equal(presentationStatus({ ...bank, cancelled: true }, fighter, { presentation }), "none");
    const ctx = recordingContext(), baseline = contextState(ctx);
    assert.equal(drawWithFallback(ctx, bank, fighter, 400, { presentation }), true);
    assert.equal(ctx.calls.find(call => call[0] === "drawImage")[1].source, bitmapDefinition("user-ahab", ahabMasked).src);
    assert.ok(ctx.calls.filter(call => call[0] === "scale").every(call => Math.abs(call[1]) === Math.abs(call[2])), "Staging must not stretch body parts or either axis");
    assert.deepEqual(contextState(ctx), baseline); assert.deepEqual(fighter, before);
  } finally { env.restore(); }
});

test("presentation drawing restores Canvas state after success or failure without writing simulation or source metadata", async () => {
  const env = browser();
  try {
    const entry = definition([clip("pit.presentation.intro")]);
    const bank = await load(["jungle-hunter"], [entry]);
    const state = freeze(createPitCombatState()), before = JSON.stringify(state);
    const presentation = freeze(view({ elapsedMs: 50 }));
    entry.atlas.clips[0].frames[1].rect[0] = 999;
    for (const throws of [false, true]) {
      const ctx = recordingContext(throws), baseline = contextState(ctx);
      if (throws) assert.throws(() => drawPresentation(ctx, bank, state.fighters[0], 400, { combat: state, presentation }), /draw denied/);
      else assert.equal(drawPresentation(ctx, bank, state.fighters[0], 400, { combat: state, presentation }), true);
      assert.equal(ctx.calls.at(-1)[0], "restore"); assert.deepEqual(contextState(ctx), baseline);
      assert.equal(ctx.calls.find(call => call[0] === "drawImage")[2], 8, "The loader keeps immutable reviewed metadata");
      assert.equal(JSON.stringify(state), before);
    }
  } finally { env.restore(); }
});

test("reduced motion holds the dedicated ending or reused idle opening and removes staging interpolation", async () => {
  const env = browser();
  try {
    const fighter = freeze(createPitCombatState().fighters[0]);
    const dedicated = await load(["jungle-hunter"], [definition([clip("pit.presentation.intro")])]);
    const idle = await load(["jungle-hunter"], [definition([clip()])]);
    const staticArt = bitmapBank(fighter, await load(["jungle-hunter"], []));
    const transforms = [];
    for (const elapsedMs of [0, 50, 900]) {
      const options = { presentation: freeze(view({ elapsedMs })), reducedMotion: true };
      const authored = resolvePresentation(dedicated, fighter, options);
      const reused = resolvePresentation(idle, fighter, options);
      assert.equal(authored.frame.frameIndex, 1); assert.equal(authored.cue.reducedMotion, true);
      assert.equal(reused.frame.frameIndex, 0); assert.equal(reused.cue.reducedMotion, true);
      const ctx = recordingContext();
      assert.equal(drawWithFallback(ctx, staticArt, fighter, 400, options), true);
      transforms.push(ctx.calls.filter(call => ["translate", "scale"].includes(call[0])));
    }
    assert.deepEqual(transforms[0], transforms[1]); assert.deepEqual(transforms[1], transforms[2]);
  } finally { env.restore(); }
});

test("an airborne final combat snapshot is staged on the floor without moving its simulation body", async () => {
  const env = browser();
  try {
    const fighter = freeze({ ...createPitCombatState().fighters[0], y: 75, grounded: false, velocityY: -3, health: 0 });
    const before = JSON.stringify(fighter), groundY = 400, options = { presentation: freeze(result(1, 500)) };
    const bank = await load(["jungle-hunter"], [definition([clip("crouch", "right", [frame(1), frame(2)], false)])]);
    const held = resolvePresentation(bank, fighter, options);
    const ctx = recordingContext(); assert.equal(drawPresentation(ctx, bank, fighter, groundY, options), true);
    const drawn = ctx.calls.find(call => call[0] === "drawImage");
    const [,, sourceWidth, sourceHeight] = held.frame.frame.rect;
    assert.equal(drawn[8] / sourceWidth, drawn[9] / sourceHeight, "A held source remains uniformly scaled");
    assert.equal(drawn[7] + held.frame.frame.pivot[1] * drawn[9] / sourceHeight, groundY);
    const staticCtx = recordingContext();
    assert.equal(drawWithFallback(staticCtx, bitmapBank(fighter, null), fighter, groundY, options), true);
    assert.deepEqual(staticCtx.calls.find(call => call[0] === "translate"), ["translate", fighter.x, groundY]);
    assert.equal(JSON.stringify(fighter), before);
  } finally { env.restore(); }
});

test("invalid presentation clocks refuse theatrical art rather than inventing a valid elapsed time", async () => {
  const env = browser();
  try {
    const fighter = createPitCombatState().fighters[0];
    const bank = await load(["jungle-hunter"], [definition([clip("pit.presentation.intro"), clip()])]);
    for (const patch of [{ elapsedMs: -1 }, { elapsedMs: NaN }, { durationMs: 0 }, { durationMs: Infinity }]) {
      assert.equal(resolvePresentation(bank, fighter, { presentation: view(patch) }), null);
      assert.equal(presentationStatus(bitmapBank(fighter, bank), fighter, { presentation: view(patch) }), "none");
    }
  } finally { env.restore(); }
});
