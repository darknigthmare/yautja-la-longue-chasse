import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

// Fixture tests inject their own reviewed art; production registry is verified separately.
const registryFixture = { name: "empty-production-registry", setup(bundle) {
  bundle.onResolve({ filter: /pitSpriteSheetRegistry$/ }, () => ({ path: "registry", namespace: "fixture" }));
  bundle.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const PIT_SPRITE_SHEET_REGISTRY = [];", loader: "js" }));
} };
const built = await build({ plugins: [registryFixture], stdin: { contents: `export * from './app/game/pitSpriteSheetAnimation.ts';
  export * from './app/game/pitFeralNativeArtV59.ts';
  export * from './app/game/pitCombatBitmapArt.ts'; export { createPitCombatState, stepPitCombat, serializePitCombat, deserializePitCombat, PIT_FIGHTERS } from './app/game/systems/pitCombat.ts';`,
  resolveDir: fileURLToPath(new URL("..", import.meta.url)) }, bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const { loadPitSpriteSheetAnimations: load, resolvePitSpriteSheetAnimation: resolve,
  getPitFeralNativeArtStatus: feralStatus, getPitSpriteSheetAtlasReadiness: atlasReadiness,
  drawPitSpriteSheetAnimation: draw, drawPitSpriteSheetHold: drawHold, resolvePitSpriteSheetHold: resolveHold, drawPitCombatBitmapFighter: drawWithFallback,
  getPitCombatBitmapFighterArtStatus: status, getPitCombatBitmapArtDefinition: staticDefinition,
  getPitSpriteSheetAnimationVisualBounds: animationBounds, getPitCombatBitmapVisualBounds: combinedBounds,
  createPitCombatState, stepPitCombat, serializePitCombat, deserializePitCombat, PIT_FIGHTERS } = await import("data:text/javascript;base64," + Buffer.from(built.outputFiles[0].text).toString("base64"));

const sourcePath = "/game/sprites/v32/test.png";
const frame = (index, durationTicks = 2) => ({ pageId: "body", rect: [index * 8, 0, 8, 8], pivot: [4, 7], durationTicks });
const clip = (id = "idle", facing = "right", frames = [frame(0), frame(1, 4)], loop = true) =>
  ({ id, facing, status: "validated", loop, ticksPerSecond: 60, frames });
function definition(clips = [clip()], overrides = {}) {
  return { fighterId: "jungle-hunter", bodyHeightPx: 6,
    atlas: { schemaVersion: 1, id: "test-jungle", characterId: "jungle-hunter", variantId: "film", sourceKind: "authored-frames", status: "validated",
      pages: [{ id: "body", src: sourcePath, width: 24, height: 8, status: "validated", transparency: { mode: "alpha" } }], clips }, ...overrides };
}
function browser(mode = "alpha", behavior = {}) {
  const previous = { Image: globalThis.Image, document: globalThis.document };
  const instances = [], requests = [], canvases = [];
  class FakeImage {
    constructor() { if (behavior.constructorThrows) throw Error("unavailable"); instances.push(this); }
    set src(value) {
      this.source = value;
      if (!value) return;
      if (behavior.srcThrows) throw Error("denied");
      requests.push(value); this.naturalWidth = behavior.wrongDimensions ? 23 : 24; this.naturalHeight = 8; this.complete = true;
      if (!behavior.pending) queueMicrotask(() => (behavior.error || value === behavior.errorPath) ? this.onerror?.() : this.onload?.());
    }
    get src() { return this.source; }
  }
  globalThis.Image = FakeImage;
  globalThis.document = { createElement() {
    const canvas = { width: 0, height: 0, getContext() {
      return { clearRect() {}, drawImage() {}, putImageData(data) { canvas.processed = data.data.slice(); }, getImageData() {
        if (mode === "tainted") throw Error("readback denied");
        const pixels = new Uint8ClampedArray(canvas.width * canvas.height * 4);
        if (["opaque", "checker", "magenta"].includes(mode)) for (let p = 0; p < pixels.length; p += 4) {
          const shade = mode === "checker" ? (p / 4 % 2 ? 128 : 220) : 255;
          pixels.set(mode === "magenta" ? [255, 0, 255, 255] : [shade, shade, shade, 255], p);
        }
        if (mode !== "empty") for (let i = 0; i < 3; i++) {
          const p = (3 * canvas.width + i * 8 + 3) * 4;
          pixels.set([mode === "duplicate" ? 50 : 50 + i * 40, 80, 10, 255], p);
        }
        if (mode === "clipped") pixels[3] = 255;
        return { data: pixels };
      } };
    } };
    canvases.push(canvas); return canvas;
  } };
  return { instances, requests, canvases, restore() { Object.assign(globalThis, previous); } };
}
function recordingContext(throwOnDraw = false) {
  const calls = [], saved = [];
  return { calls, globalAlpha: .8, save() { saved.push(this.globalAlpha); calls.push(["save"]); }, restore() { this.globalAlpha = saved.pop(); calls.push(["restore"]); },
    translate(...args) { calls.push(["translate", ...args]); }, scale(...args) { calls.push(["scale", ...args]); },
    drawImage(...args) { calls.push(["drawImage", ...args]); if (throwOnDraw) throw Error("draw denied"); } };
}
function staticBank(sheetBank) {
  const art = staticDefinition("jungle-hunter");
  return { spriteSheets: sheetBank, images: new Map([["jungle-hunter", { complete: true, naturalWidth: art.width, naturalHeight: art.height }]]),
    requestedIds: new Set(["jungle-hunter"]), readyIds: new Set(["jungle-hunter"]), failedIds: new Set(), cancelled: false };
}

test("simulation ticks drive distinct idle drawings, pause holds, seek resets, and facing never mirrors", async () => {
  const env = browser();
  try {
    const bank = await load(["jungle-hunter", "jungle-hunter"], [definition()]);
    assert.equal(bank.readyClipCount, 1); assert.deepEqual(env.requests, [sourcePath]);
    const fighter = createPitCombatState().fighters[0], before = structuredClone(fighter);
    assert.equal(resolve(bank, fighter, { simulationFrame: 100 }).resolved.frame.frameIndex, 0);
    assert.equal(resolve(bank, fighter, { simulationFrame: 102 }).resolved.frame.frameIndex, 1);
    assert.equal(resolve(bank, fighter, { simulationFrame: 102 }).resolved.frame.frameIndex, 1);
    assert.equal(resolve(bank, fighter, { simulationFrame: 106 }).resolved.frame.frameIndex, 0);
    assert.equal(resolve(bank, fighter, { simulationFrame: 2 }).resolved.frame.frameIndex, 0);
    assert.equal(resolve(bank, { ...fighter, facing: -1 }, { simulationFrame: 3 }), null);
    assert.deepEqual(fighter, before);
    const bankWithFallback = staticBank(bank);
    assert.equal(status(bankWithFallback, fighter, { simulationFrame: 4 }), "sprite-sheet-animation");
    assert.equal(status(bankWithFallback, { ...fighter, crouching: true }, { simulationFrame: 5 }), "sprite-sheet-hold");
    assert.equal(drawWithFallback(recordingContext(), bankWithFallback, { ...fighter, crouching: true }, 400, { simulationFrame: 5 }), true);
  } finally { env.restore(); }
});

test("a reviewed independent left clip draws without negative scale and uses the page body reference", async () => {
  const env = browser();
  try {
    const bank = await load(["jungle-hunter"], [definition([clip("idle", "left")], { pageBodyHeightPx: { body: 12 } })]);
    const fighter = createPitCombatState().fighters[0]; Object.assign(fighter, { facing: -1, x: 300, y: 20 });
    const ctx = recordingContext();
    assert.equal(draw(ctx, bank, fighter, 400, { simulationFrame: 3 }), true);
    const drawn = ctx.calls.find(call => call[0] === "drawImage");
    const scale = PIT_FIGHTERS["jungle-hunter"].bodyHeight / 12;
    assert.deepEqual(drawn.slice(2), [0, 0, 8, 8, 300 - 4 * scale, 380 - 7 * scale, 8 * scale, 8 * scale]);
    assert.equal(ctx.calls.some(call => call[0] === "scale"), false);
    assert.equal(ctx.globalAlpha, .8);
  } finally { env.restore(); }
});

test("one drawing per short attack phase is allowed only for a complete attack with three distinct drawings", async () => {
  const clips = [clip("pit.stand.light.startup", "right", [frame(0)], false), clip("pit.stand.light.active", "right", [frame(1)], false), clip("pit.stand.light.recovery", "right", [frame(2)], false)];
  const env = browser();
  try {
    const bank = await load(["jungle-hunter"], [definition(clips)]);
    assert.equal(bank.readyClipCount, 3);
    const fighter = createPitCombatState().fighters[0], timing = PIT_FIGHTERS["jungle-hunter"].attacks.light;
    for (const [phase, tick, index] of [["startup", 0, 0], ["active", timing.startup, 1], ["recovery", timing.startup + timing.active, 2]]) {
      Object.assign(fighter, { phase, action: { kind: "attack", attack: "light", frame: tick, connected: false } });
      assert.equal(resolve(bank, fighter, { simulationFrame: 700 }).resolved.frame.frame.rect[0], index * 8);
    }
    fighter.action.frame = timing.startup + timing.active + timing.recovery;
    assert.equal(resolve(bank, fighter, { simulationFrame: 701 }), null);
    assert.equal((await load(["jungle-hunter"], [definition(clips.slice(0, 2))])).readyClipCount, 0);
    assert.equal((await load(["jungle-hunter"], [definition([clip("idle", "right", [frame(0)])])])).readyClipCount, 0);
  } finally { env.restore(); }
  const duplicates = browser("duplicate");
  try { assert.equal((await load(["jungle-hunter"], [definition(clips)])).readyClipCount, 0); }
  finally { duplicates.restore(); }
});

function feralActionAtlas() {
  const phases = ['startup', 'active', 'recovery'];
  const pages = ['right', 'left'].map(facing => ({ id: facing, src: `/game/sprites/v59/feral-${facing}.png`,
    width: 24, height: 8, status: 'validated', transparency: { mode: 'alpha' } }));
  const clips = ['right', 'left'].flatMap(facing => phases.map((phase, index) => ({
    id: `pit.stand.technique.feral-guided-bolts-v58.${phase}`, facing, status: 'validated', loop: false,
    ticksPerSecond: 60, frames: [{ ...frame(index), pageId: facing }],
  })));
  return { fighterId: 'feral-hunter', bodyHeightPx: 6, atlas: {
    schemaVersion: 1, id: 'feral-actions-v59', characterId: 'feral-hunter', variantId: 'default-feral',
    sourceKind: 'authored-frames', status: 'validated', pages, clips,
  } };
}

test('Feral required native atlas cannot conceal a missing direction behind a ready side or older idle', async () => {
  const env = browser('alpha', { errorPath: '/game/sprites/v59/feral-left.png' });
  try {
    const older = definition();
    older.fighterId = older.atlas.characterId = 'feral-hunter';
    older.atlas.id = 'feral-old-idle';
    const bank = await load(['feral-hunter'], [feralActionAtlas(), older]);
    assert.equal(bank.readyClipCount, 4, 'right attack and older idle decode successfully');
    assert.equal(feralStatus(bank, 'feral-hunter'), 'missing', 'both directions are required before combat');
    assert.equal(atlasReadiness(bank, 'feral-old-idle', 'feral-hunter'), 'ready');
    assert.equal(feralStatus(bank, 'feral-hunter', 'feral-sans-casque-75100c4c5e'), 'not-required');
  } finally { env.restore(); }
});

test('required Feral art validates the exact selected appearance and all declared phases, not its total clip count', async () => {
  const env = browser();
  try {
    const complete = await load(['feral-hunter'], [feralActionAtlas()]);
    assert.equal(feralStatus(complete, 'feral-hunter'), 'ready');
    assert.equal(feralStatus(null, 'feral-hunter'), 'loading');
    assert.equal(feralStatus(complete, 'wolf'), 'not-required');
    assert.equal(feralStatus(complete, 'feral-hunter', 'feral-avec-casque-b99fbf82fe'), 'not-required');
    const stale = await load(['jungle-hunter'], [definition()]);
    assert.equal(feralStatus(stale, 'feral-hunter'), 'loading');
    const incomplete = feralActionAtlas();
    incomplete.atlas.clips.pop();
    assert.equal(feralStatus(await load(['feral-hunter'], [incomplete]), 'feral-hunter'), 'missing');
    const missingExtraPage = feralActionAtlas();
    missingExtraPage.atlas.pages.push({ ...missingExtraPage.atlas.pages[0], id: 'shield', src: '/game/sprites/v59/shield.png' });
    assert.equal(feralStatus(await load(['feral-hunter'], [missingExtraPage]), 'feral-hunter'), 'missing',
      'declared additional native art is required even if a malformed registry never references it');
  } finally { env.restore(); }
});

test('Feral native action frames preserve clocks, independent sides and cancellation without simulation writes', async () => {
  const env = browser();
  try {
    const abort = new AbortController();
    const bank = await load(['feral-hunter'], [feralActionAtlas()], { signal: abort.signal });
    const fighter = createPitCombatState('feral-hunter', 'jungle-hunter').fighters[0];
    const timing = PIT_FIGHTERS['feral-hunter'].attacks.technique;
    for (const facing of [1, -1]) for (const [phase, tick, index] of [
      ['startup', 0, 0], ['active', timing.startup, 1], ['recovery', timing.startup + timing.active, 2],
    ]) {
      Object.assign(fighter, { facing, phase, action: { kind: 'attack', attack: 'technique', frame: tick, connected: false } });
      const before = structuredClone(fighter);
      const options = { simulationFrame: 800, reducedMotion: true };
      const resolved = resolve(bank, fighter, options);
      assert.equal(resolved.resolved.frame.page.id, facing === 1 ? 'right' : 'left');
      assert.equal(resolved.resolved.frame.frame.rect[0], index * 8);
      assert.deepEqual(resolve(bank, fighter, options).resolved.frame.frame, resolved.resolved.frame.frame,
        'a paused simulation keeps the exact attack drawing');
      const ctx = recordingContext();
      assert.equal(draw(ctx, bank, fighter, 400, options), true);
      assert.equal(ctx.calls.some(call => call[0] === 'scale'), false, 'native side does not use negative scale');
      assert.deepEqual(fighter, before);
    }
    abort.abort();
    assert.equal(feralStatus(bank, 'feral-hunter'), 'missing');
    assert.equal(resolve(bank, fighter, { simulationFrame: 800 }), null);
  } finally { env.restore(); }
});

test('historical Feral replays keep their prior firing pose while V59 shield and live launcher remain native', async () => {
  const env = browser();
  try {
    const native = feralActionAtlas();
    native.atlas.clips.push(...native.atlas.clips.map(clip => ({ ...clip,
      id: clip.id.replace('technique.feral-guided-bolts-v58', 'heavy') })));
    const older = definition([clip('idle', 'right'), clip('idle', 'left')]);
    older.fighterId = older.atlas.characterId = 'feral-hunter'; older.atlas.id = 'feral-old-idle';
    const bank = await load(['feral-hunter'], [native, older]);
    const fighter = createPitCombatState('feral-hunter', 'jungle-hunter').fighters[0];
    for (const facing of [1, -1]) {
      Object.assign(fighter, { facing, phase: 'active', action: { kind: 'attack', attack: 'technique',
        frame: PIT_FIGHTERS['feral-hunter'].attacks.technique.startup, connected: false } });
      const before = structuredClone(fighter);
      assert.equal(resolve(bank, fighter).definition.atlas.id, 'feral-actions-v59');
      assert.equal(resolve(bank, fighter, { engineVersion: 10 }).definition.atlas.id, 'feral-actions-v59');
      for (const engineVersion of [4, 5, 6, 7, 8, 9]) {
        const options = { engineVersion, simulationFrame: 200 };
        assert.equal(resolve(bank, fighter, options), null, `V${engineVersion} has no long-barrel firing animation`);
        assert.equal(resolveHold(bank, fighter, options).definition.atlas.id, 'feral-old-idle');
      }
      assert.deepEqual(fighter, before);
      fighter.action.attack = 'heavy'; fighter.action.frame = PIT_FIGHTERS['feral-hunter'].attacks.heavy.startup;
      assert.equal(resolve(bank, fighter, { engineVersion: 9 }).definition.atlas.id, 'feral-actions-v59',
        'the native shield does not depend on projectile geometry');
    }
  } finally { env.restore(); }
});

test('a landing after an airborne Feral shot keeps its legacy pose even when every projectile has already hit', async () => {
  const env=browser();
  try {
    const older=definition([clip('idle','right'),clip('idle','left')]);
    older.fighterId=older.atlas.characterId='feral-hunter';older.atlas.id='feral-old-idle';
    const bank=await load(['feral-hunter'],[feralActionAtlas(),older]);
    for(const facing of [1,-1]) for(const initialY of [45,12]) {
      let s=createPitCombatState('feral-hunter','jungle-hunter',{mode:'training'});
      Object.assign(s.fighters[0],{x:facing===1?250:750,facing,grounded:false,y:initialY});
      s.fighters[1].x=s.fighters[0].x+facing*66;
      for(let i=0;i<10;i++)s=stepPitCombat(s,[i===0?{attack:'technique'}:{},{}]);
      assert.equal(s.techniqueEffects.length,0,'three close contacts have consumed the entire volley');
      s=deserializePitCombat(serializePitCombat(s));
      for(let i=0;i<8;i++) {
        s=stepPitCombat(s,[{},{}]);
        assert.equal(s.fighters[0].grounded,true);
        const options={combat:s,simulationFrame:s.frame,engineVersion:10};
        if(initialY===45) {
          assert.equal(s.fighters[0].action.feralLauncherOrigin,'legacy');
          assert.equal(resolve(bank,s.fighters[0],options),null);
          assert.equal(resolveHold(bank,s.fighters[0],options).definition.atlas.id,'feral-old-idle');
        } else {
          assert.equal(s.fighters[0].action.feralLauncherOrigin,'native');
          assert.equal(resolve(bank,s.fighters[0],options).definition.atlas.id,'feral-actions-v59',
            'landing before the shot still uses the native launcher');
        }
      }
    }
  } finally {env.restore();}
});

test("phase durations fit the real attack clock instead of the rendering clock", async () => {
  const env = browser();
  try {
    const bank = await load(["jungle-hunter"], [definition([clip("pit.stand.light.startup", "right", [frame(0, 1), frame(1, 1)], false)])]);
    const fighter = createPitCombatState().fighters[0];
    Object.assign(fighter, { phase: "startup", action: { kind: "attack", attack: "light", frame: 0, connected: false } });
    assert.equal(resolve(bank, fighter, { simulationFrame: 400 }).resolved.frame.frameIndex, 0);
    fighter.action.frame = PIT_FIGHTERS["jungle-hunter"].attacks.light.startup - 1;
    assert.equal(resolve(bank, fighter, { simulationFrame: 400 }).resolved.frame.frameIndex, 1);
    fighter.phase = "active";
    assert.equal(resolve(bank, fighter, { simulationFrame: 401 }), null, "stale phase/action pair is not presented as valid");
  } finally { env.restore(); }
});

test("alpha inspection rejects opaque/checkerboard/empty/clipped/unreadable pages and duplicate frames", async () => {
  for (const mode of ["opaque", "checker", "empty", "clipped", "tainted", "duplicate"]) {
    const env = browser(mode);
    try {
      const bank = await load(["jungle-hunter"], [definition()]);
      assert.equal(bank.readyClipCount, 0, mode);
      assert.equal(resolve(bank, createPitCombatState().fighters[0]), null, mode);
    } finally { env.restore(); }
  }
});

test("explicit magenta key accepts real cells without changing the source; checkerboard still fails", async () => {
  const entry = definition(); entry.atlas.pages[0].transparency = { mode: "color-key", rgb: [255, 0, 255], tolerance: 8 };
  for (const mode of ["magenta", "checker"]) {
    const env = browser(mode);
    try {
      const bank = await load(["jungle-hunter"], [entry]);
      assert.equal(bank.readyClipCount, mode === "magenta" ? 1 : 0);
      if (mode === "magenta") assert.equal(env.canvases[0].processed[3], 0);
      assert.equal(env.instances[0].src, sourcePath);
    } finally { env.restore(); }
  }
});

test("drafts, mismatched identities, remote paths and invalid scale are rejected before loading", async () => {
  const cases = [definition(), definition(), definition(), definition()];
  cases[0].atlas.status = "draft"; cases[1].atlas.characterId = "wolf";
  cases[2].atlas.pages[0].src = "https://example.test/sprite.png"; cases[3].pageBodyHeightPx = { body: 0 };
  const env = browser();
  try { for (const entry of cases) assert.equal((await load(["jungle-hunter"], [entry])).readyClipCount, 0); assert.deepEqual(env.requests, []); }
  finally { env.restore(); }
});

test("aborted and timed-out loads detach handlers and cannot publish a late page", async () => {
  for (const mode of ["abort", "timeout"]) {
    const env = browser("alpha", { pending: true });
    try {
      const control = new AbortController();
      const pending = load(["jungle-hunter"], [definition()], { signal: control.signal, timeoutMs: mode === "timeout" ? 1 : 1000 });
      const image = env.instances[0], late = image.onload;
      if (mode === "abort") control.abort();
      const bank = await pending;
      assert.equal(bank.readyClipCount, 0); assert.equal(image.onload, null); assert.equal(image.onerror, null);
      assert.equal(image.src, ""); late();
      assert.equal(resolve(bank, createPitCombatState().fighters[0]), null);
    } finally { env.restore(); }
  }
});

test("late abort invalidates loaded animations and broken image APIs settle honestly", async () => {
  const env = browser();
  try {
    const control = new AbortController();
    const bank = await load(["jungle-hunter"], [definition()], { signal: control.signal });
    assert.equal(bank.readyClipCount, 1); control.abort();
    assert.equal(resolve(bank, createPitCombatState().fighters[0]), null);
  } finally { env.restore(); }
  for (const behavior of [{ error: true }, { wrongDimensions: true }, { constructorThrows: true }, { srcThrows: true }]) {
    const broken = browser("alpha", behavior);
    try { assert.equal((await load(["jungle-hunter"], [definition()])).readyClipCount, 0); }
    finally { broken.restore(); }
  }
});

test("draw errors restore context and never mutate simulation or approved source metadata", async () => {
  const env = browser();
  try {
    const original = definition(), bank = await load(["jungle-hunter"], [original]);
    original.atlas.clips[0].frames[0].rect[0] = 999;
    const fighter = createPitCombatState().fighters[0], before = structuredClone(fighter), ctx = recordingContext(true);
    assert.throws(() => draw(ctx, bank, fighter, 400), /draw denied/);
    assert.equal(ctx.calls.at(-1)[0], "restore"); assert.equal(ctx.globalAlpha, .8); assert.deepEqual(fighter, before);
    const forged = { requestedIds: new Set(["jungle-hunter"]), readyClipCount: 1, cancelled: false };
    assert.equal(resolve(forged, fighter), null);
  } finally { env.restore(); }
});

test("a missing page rejects its entire clip while another complete clip remains playable", async () => {
  const secondPath = "/game/sprites/v32/second.png";
  const entry = definition([clip(), clip("walk", "right", [frame(0), { ...frame(1), pageId: "second" }])]);
  entry.atlas.pages.push({ ...entry.atlas.pages[0], id: "second", src: secondPath });
  const env = browser("alpha", { errorPath: secondPath });
  try {
    const bank = await load(["jungle-hunter"], [entry]);
    assert.equal(bank.readyClipCount, 1);
    const fighter = createPitCombatState().fighters[0];
    assert.ok(resolve(bank, fighter, { simulationFrame: 0 }));
    assert.equal(resolve(bank, { ...fighter, velocityX: 4 }, { simulationFrame: 1 }), null);
  } finally { env.restore(); }
});

test("camera metadata contains the full authored cell envelope before loading and ignores absent reverse art", () => {
  const entry = definition();
  entry.atlas.clips[0].frames[1].pivot = [1, 6];
  const fighter = createPitCombatState().fighters[0];
  Object.assign(fighter, { x: 200, y: 10 });
  const scale = PIT_FIGHTERS["jungle-hunter"].bodyHeight / 6;
  const bounds = animationBounds(fighter, 400, [entry]);
  const expected = { x: 200 - 4 * scale, y: 390 - 7 * scale, width: 11 * scale, height: 9 * scale };
  for (const key of Object.keys(expected)) assert.ok(Math.abs(bounds[key] - expected[key]) < 1e-8, key);
  assert.equal(animationBounds({ ...fighter, facing: -1 }, 400, [entry]), null);
  const total = combinedBounds(fighter, 400, [entry]);
  const fixed = combinedBounds(fighter, 400, []);
  assert.ok(total.x <= bounds.x && total.x <= fixed.x);
  assert.ok(total.y <= bounds.y && total.y <= fixed.y);
  assert.ok(total.x + total.width >= bounds.x + bounds.width);
  assert.ok(total.y + total.height >= bounds.y + bounds.height);
});

test("an uncovered motion holds the first reviewed idle drawing without animating it or mirroring a missing side", async () => {
  const env = browser();
  try {
    const bank = await load(["jungle-hunter"], [definition()]);
    const fighter = createPitCombatState().fighters[0]; fighter.crouching = true;
    const before = structuredClone(fighter), bitmap = staticBank(bank);
    assert.equal(status(bitmap, fighter, { simulationFrame: 10 }), "sprite-sheet-hold");
    const first = resolveHold(bank, fighter, { simulationFrame: 10 });
    assert.equal(first.frame.frameIndex, 0);
    assert.equal(resolveHold(bank, fighter, { simulationFrame: 30 }).frame.frameIndex, 0);
    assert.equal(bank.readyClipCount, 1, "holding never expands animation coverage");
    const ctx = recordingContext(); assert.equal(drawHold(ctx, bank, fighter, 400, { simulationFrame: 60 }), true);
    assert.deepEqual(ctx.calls.find(call => call[0] === "drawImage").slice(2, 6), first.frame.frame.rect);
    assert.equal(resolveHold(bank, { ...fighter, facing: -1 }, { simulationFrame: 61 }), null);
    assert.equal(status(bitmap, { ...fighter, facing: -1 }, { simulationFrame: 61 }), "static-bitmap");
    assert.equal(resolveHold(bank, { ...fighter, phase: "active", action: null }, { simulationFrame: 62 }), null);
    assert.deepEqual(fighter, before);
  } finally { env.restore(); }
});


test("historical blockstun prefers its same-facing guard over an unrelated idle fallback", async () => {
  const env = browser();
  try {
    const bank = await load(["jungle-hunter"], [definition([clip(), clip("high-guard", "right", [frame(1), frame(2)], false)])]);
    const fighter = { ...createPitCombatState().fighters[0], phase: "blockstun", guard: "high", stunFrames: 9 };
    const held = resolveHold(bank, fighter);
    assert.equal(held.frame.clip.id, "high-guard"); assert.equal(held.frame.frameIndex, 1);
    assert.equal(held.frame.frame.rect[0], 16);
    const low = resolveHold(bank, { ...fighter, guard: "low", crouching: true });
    assert.equal(low.frame.clip.id, "idle", "missing low guard must not borrow a high guard");
    assert.equal(bank.readyClipCount, 2);
  } finally { env.restore(); }
});


test("reviewed alpha bounds tighten only camera framing, never the draw crop or pivot", async () => {
  const entry = definition();
  entry.visibleFrameBounds = [0, 1].map(index => ({ pageId: "body", rect: frame(index).rect, visibleRect: [index * 8 + 2, 2, 3, 3] }));
  const fighter = createPitCombatState().fighters[0]; Object.assign(fighter, { x: 200, y: 10 });
  const scale = PIT_FIGHTERS["jungle-hunter"].bodyHeight / 6;
  const bounds = animationBounds(fighter, 400, [entry]);
  const expected = { x: 200 - 2 * scale, y: 390 - 5 * scale, width: 3 * scale, height: 3 * scale };
  for (const key of Object.keys(expected)) assert.ok(Math.abs(bounds[key] - expected[key]) < 1e-8, key);
  const env = browser();
  try {
    const bank = await load(["jungle-hunter"], [entry]), ctx = recordingContext();
    assert.equal(bank.readyClipCount, 1);
    assert.equal(draw(ctx, bank, fighter, 400, { simulationFrame: 0 }), true);
    assert.deepEqual(ctx.calls.find(call => call[0] === "drawImage").slice(2),
      [0, 0, 8, 8, 200 - 4 * scale, 390 - 7 * scale, 8 * scale, 8 * scale]);
  } finally { env.restore(); }
});

test("camera-only bounds reject foreign cells, duplicates and invalid containment before loading", async () => {
  const valid = { pageId: "body", rect: [0, 0, 8, 8], visibleRect: [2, 2, 3, 3] };
  const invalid = [
    [{ ...valid, visibleRect: [-1, 2, 3, 3] }],
    [{ ...valid, visibleRect: [6, 2, 3, 3] }],
    [{ ...valid, visibleRect: [2, 2, 0, 3] }],
    [{ ...valid, visibleRect: [2.5, 2, 3, 3] }],
    [{ ...valid, pageId: "foreign" }],
    [{ ...valid, rect: [16, 0, 8, 8] }],
    [valid, valid],
  ];
  const env = browser();
  try {
    for (const visibleFrameBounds of invalid) {
      const entry = definition(undefined, { visibleFrameBounds });
      assert.equal((await load(["jungle-hunter"], [entry])).readyClipCount, 0);
      assert.equal(animationBounds(createPitCombatState().fighters[0], 400, [entry]), null);
    }
    assert.deepEqual(env.requests, []);
  } finally { env.restore(); }
});

test("jump held phases require a complete native non-looping sequence with a genuinely changing rise", async () => {
  const jumps = (facing = "right") => [
    clip("pit.air.jump.rise", facing, [frame(0), frame(1)], false),
    clip("pit.air.jump.apex", facing, [frame(1)], false),
    clip("pit.air.jump.fall", facing, [frame(1)], false),
  ];
  const env = browser();
  try {
    const bank = await load(["jungle-hunter"], [definition(jumps())]);
    assert.equal(bank.readyClipCount, 3, "one prepared tuck may be honestly reused at apex and descent");
    const fighter = { ...createPitCombatState().fighters[0], grounded: false, y: 50, velocityY: 0 };
    assert.equal(resolve(bank, fighter, { simulationFrame: 20 }).resolved.frame.clip.id, "pit.air.jump.apex");
    const falling = { ...fighter, velocityY: -2 };
    assert.equal(resolve(bank, falling, { simulationFrame: 21 }).resolved.frame.frame.rect[0], 8);
    assert.equal(resolve(bank, falling, { simulationFrame: 200 }).resolved.frame.frame.rect[0], 8);
    assert.equal(resolve(bank, { ...falling, facing: -1 }, { simulationFrame: 201 }), null);
    assert.equal((await load(["jungle-hunter"], [definition(jumps().slice(0, 2))])).readyClipCount, 1,
      "an incomplete sequence cannot promote a held apex");
    const looped = jumps(); looped[2].loop = true;
    assert.equal((await load(["jungle-hunter"], [definition(looped)])).readyClipCount, 1);
    const wrongFacing = jumps(); wrongFacing[2].facing = "left";
    assert.equal((await load(["jungle-hunter"], [definition(wrongFacing)])).readyClipCount, 1);
    const staticRise = jumps(); staticRise[0].frames = [frame(0)];
    assert.equal((await load(["jungle-hunter"], [definition(staticRise)])).readyClipCount, 0);
  } finally { env.restore(); }
  const duplicate = browser("duplicate");
  try { assert.equal((await load(["jungle-hunter"], [definition(jumps())])).readyClipCount, 0); }
  finally { duplicate.restore(); }
  const secondPath = "/game/sprites/v50/unavailable.png";
  const missingPage = browser("alpha", { errorPath: secondPath });
  try {
    const entry = definition(jumps()); entry.atlas.pages.push({ ...entry.atlas.pages[0], id: "missing", src: secondPath });
    entry.atlas.clips[1].frames[0] = { ...frame(1), pageId: "missing" };
    assert.equal((await load(["jungle-hunter"], [entry])).readyClipCount, 1,
      "a missing prepared phase blocks group promotion even when the other held phase exists");
  } finally { missingPage.restore(); }
});

test("a declared crouch is an honest held drawing and cannot authorize arbitrary single-frame animations", async () => {
  const poses = [{ id: "crouch", facing: "right" }];
  const clips = [clip("crouch", "right", [frame(0)], false)];
  const env = browser();
  try {
    assert.equal((await load(["jungle-hunter"], [definition(clips)])).readyClipCount, 0);
    const bank = await load(["jungle-hunter"], [definition(clips, { heldPoseClips: poses })]);
    assert.equal(bank.readyClipCount, 1);
    const fighter = { ...createPitCombatState().fighters[0], crouching: true };
    assert.equal(resolve(bank, fighter, { simulationFrame: 1 }).resolved.frame.frameIndex, 0);
    assert.equal(resolve(bank, fighter, { simulationFrame: 300 }).resolved.frame.frameIndex, 0);
    for (const invalid of [[...poses, ...poses], [{ id: "idle", facing: "right" }], [{ id: "walk", facing: "right" }], [{ id: "crouch", facing: "left" }]]) {
      assert.equal((await load(["jungle-hunter"], [definition(clips, { heldPoseClips: invalid })])).readyClipCount, 0);
    }
    assert.equal((await load(["jungle-hunter"], [definition([clip("crouch", "right", [frame(0)], true)], { heldPoseClips: poses })])).readyClipCount, 0);
    assert.equal((await load(["jungle-hunter"], [definition([clip("crouch", "right", [frame(0), frame(1)], false)], { heldPoseClips: poses })])).readyClipCount, 0);
  } finally { env.restore(); }
  const empty = browser("empty");
  try { assert.equal((await load(["jungle-hunter"], [definition(clips, { heldPoseClips: poses })])).readyClipCount, 0); }
  finally { empty.restore(); }
});
