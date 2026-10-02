import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import sharp from "sharp";
import path from "node:path";

const bundle = await build({ stdin: { contents: `export * from "./app/game/nurseryRendering"; export * from "./app/game/nurseryArtManifest"; export * from "./app/game/systems/nurseryPrologue"; export * from "./app/game/systems/nurseryVictoryCompositionV71";`,
  resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", target: "es2022" });
const api = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const active = { assetsReady: true, pageVisible: true, paused: false, nextChapterReady: false };
function playedVictory() {
  let state = api.createNurseryPrologue({ readyMode: "press" });
  state = api.stepNurseryPrologue(state, {}, active).state;
  state = api.stepNurseryPrologue(state, {}, active).state;
  state = api.stepNurseryPrologue(state, { confirm: true }, active).state;
  for (let i = 0; i < api.NURSERY_TIMING.arrivalTicks + 1; i++) state = api.stepNurseryPrologue(state, {}, active).state;
  state = api.stepNurseryPrologue(state, { ready: true }, active).state;
  state = api.stepNurseryPrologue(state, {}, active).state;
  // Actual fixed-step movement and repeated jabs, no forged phase, winner or hit points.
  let punchAt = -100;
  for (let i = 0; i < 6000 && state.phase === "duel"; i++) {
    const delta = state.rival.x - state.player.x;
    const canPunch = Math.abs(delta) <= 72 && state.player.action === "idle" && state.tick - punchAt >= 27;
    const input = { move: Math.abs(delta) > 44 ? delta > 0 ? 1 : -1 : 0, light: canPunch };
    if (canPunch) punchAt = state.tick;
    state = api.stepNurseryPrologue(state, input, active).state;
  }
  assert.equal(state.phase, "ko"); assert.equal(state.winner, "player");
  while (state.phase === "ko") state = api.stepNurseryPrologue(state, {}, active).state;
  assert.equal(state.phase, "village-reveal");
  return state;
}
const victory = playedVictory();
async function nativeBank() {
  const manifest = api.NURSERY_ART_MANIFEST, images = new Map();
  for (const src of api.nurseryArtSources(manifest)) {
    const metadata = await sharp(path.join(process.cwd(), "public", src)).metadata();
    images.set(src, { width: metadata.width, height: metadata.height, src });
  }
  return { manifest, images };
}
function context() {
  const draws = [], shadows = [];
  return { draws, shadows, globalAlpha: 1, save() {}, restore() {}, clearRect() {}, fillRect() {}, beginPath() {}, fill() {},
    ellipse(...values) { shadows.push(values); }, drawImage(...values) { draws.push(values); } };
}
const rendering = state => api.getNurseryPresentation(state);

test("a legitimately won non-lethal duel supplies the wide-shot celebration without changing its receipt or physics", () => {
  assert.ok(api.normalizeNurseryCheckpoint(victory));
  const before = JSON.stringify(victory), model = rendering(victory);
  assert.equal(api.nurseryVictoryDrawingTicksV71(model, false), 0);
  assert.equal(JSON.stringify(victory), before);
  for (const phase of ["duel", "defeat", "ko", "moon-title", "complete"]) {
    assert.equal(api.nurseryVictoryDrawingTicksV71({ ...model, phase }, false), null);
  }
  assert.equal(api.nurseryVictoryDrawingTicksV71({ ...model, actors: model.actors.map(actor => ({ ...actor, pose: "idle" })) }, false), null);
});

test("actual renderer overlays two independent Youngling sheets with arm-up and prone drawings on the sandy ring", async () => {
  const bank = await nativeBank(), model = rendering(victory);
  model.camera.progress = 0.6;
  const ctx = context(); api.drawNurseryScene(ctx, model, bank, false);
  assert.equal(ctx.draws.length, 3);
  assert.equal(ctx.draws[0][0].src, bank.manifest.scenes.village.src);
  const [player, rival] = ctx.draws.slice(1);
  assert.equal(player[0].src, bank.manifest.actors.player.right.src);
  assert.deepEqual(player.slice(1, 5), bank.manifest.actors.player.right.clips.ready.frames[1].rect);
  assert.equal(rival[0].src, bank.manifest.actors.rival.left.src);
  assert.deepEqual(rival.slice(1, 5), bank.manifest.actors.rival.left.clips.ko.frames[1].rect);
  assert.equal(ctx.draws.filter(draw => draw[0].src === bank.manifest.blade.src).length, 0, "victory raises an empty hand, no floating detached weapon");
});

test("the widening camera preserves source floor anchors and actor scale rather than sliding sprites over a screen overlay", async () => {
  const bank = await nativeBank(), model = rendering(victory), composition = api.NURSERY_VICTORY_COMPOSITION_V71;
  const image = bank.images.get(bank.manifest.scenes.village.src);
  for (const progress of [0.2, 0.5, 0.99]) {
    model.camera.progress = progress;
    const ctx = context(); api.drawNurseryScene(ctx, model, bank, false);
    const background = ctx.draws[0], cameraScale = background[3] / image.width;
    for (const [index, id] of ["player", "rival"].entries()) {
      const draw = ctx.draws[index + 1], atlas = bank.manifest.actors[id][composition[id].direction];
      const clip = atlas.clips[composition[id].clip], frame = clip.frames.find(frame => frame.rect.every((value, index) => value === draw[index + 1]));
      assert.ok(frame);
      const scale = draw[7] / frame.rect[2];
      assert.ok(Math.abs(draw[5] + frame.pivot[0] * scale - (background[1] + image.width * composition[id].x * cameraScale)) < 1e-8);
      assert.ok(Math.abs(draw[6] + frame.pivot[1] * scale - (background[2] + image.height * composition[id].supportY * cameraScale)) < 1e-8);
      assert.ok(Math.abs(scale * atlas.bodyHeight / cameraScale - image.height * composition.bodyHeightFraction) < 1e-8);
      assert.ok(ctx.shadows.some(shadow => Math.abs(shadow[1] - (draw[6] + frame.pivot[1] * scale + 1)) < 1e-8));
    }
  }
});

test("the arm uses two existing bitmap drawings after the transition; it holds raised while the defeated rival stays prone", async () => {
  const bank = await nativeBank(), model = rendering(victory);
  model.camera.progress = 0.16; const first = context(); api.drawNurseryScene(first, model, bank, false);
  model.camera.progress = 0.35; const raised = context(); api.drawNurseryScene(raised, model, bank, false);
  assert.notDeepEqual(first.draws[1].slice(1, 5), raised.draws[1].slice(1, 5));
  assert.deepEqual(first.draws[2].slice(1, 5), raised.draws[2].slice(1, 5));
  assert.deepEqual(first.draws[1].slice(1, 5), bank.manifest.actors.player.right.clips.ready.frames[0].rect);
  assert.deepEqual(raised.draws[1].slice(1, 5), bank.manifest.actors.player.right.clips.ready.frames[1].rect);
});

test("pause freezes the celebration's actual scene clock and reduced motion uses a static held victory pose", async () => {
  let state = victory;
  for (let i = 0; i < 80; i++) state = api.stepNurseryPrologue(state, {}, active).state;
  const bank = await nativeBank(), before = context(); api.drawNurseryScene(before, rendering(state), bank, false);
  for (let i = 0; i < 600; i++) state = api.stepNurseryPrologue(state, {}, { ...active, paused: true }).state;
  const paused = context(); api.drawNurseryScene(paused, rendering(state), bank, false);
  assert.deepEqual(before.draws, paused.draws);
  const model = rendering(victory); model.camera.progress = 0.2;
  const reducedFirst = context(); api.drawNurseryScene(reducedFirst, model, bank, true);
  model.camera.progress = 0.9; const reducedLast = context(); api.drawNurseryScene(reducedLast, model, bank, true);
  assert.deepEqual(reducedFirst.draws, reducedLast.draws);
});

test("reviewed native foot padding stays below one screen pixel and both supports remain inside the actual arena floor", async () => {
  const bank = await nativeBank(), composition = api.NURSERY_VICTORY_COMPOSITION_V71;
  for (const id of ["player", "rival"]) {
    const anchor = composition[id], atlas = bank.manifest.actors[id][anchor.direction], frame = atlas.clips[anchor.clip].frames[1];
    const [left, top, width, height] = frame.rect;
    const { data } = await sharp(path.join(process.cwd(), "public", atlas.src)).extract({ left, top, width, height }).raw().toBuffer({ resolveWithObject: true });
    let supportY = -1;
    for (let y = height - 1; y >= 0 && supportY < 0; y--) {
      let opaque = 0;
      for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] >= 128) opaque++;
      if (opaque >= 2) supportY = y + 1;
    }
    assert.ok(supportY > 0);
    const screenScale = 540 * composition.bodyHeightFraction / atlas.bodyHeight;
    assert.ok(Math.abs(frame.pivot[1] - supportY) * screenScale < 1);
    assert.ok(anchor.x > 0.35 && anchor.x < 0.64 && anchor.supportY > 0.79 && anchor.supportY < 0.90);
  }
});
