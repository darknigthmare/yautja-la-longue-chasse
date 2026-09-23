import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import sharp from "sharp";
import path from "node:path";
const bundle = await build({ stdin: { contents: `export * from "./app/game/nurseryRendering"; export * from "./app/game/systems/nurseryControls"; export * from "./app/game/systems/controlBindings"; export * from "./app/game/nurseryAudio"; export * from "./app/game/nurseryArtManifest";`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", target: "es2022" });
const api = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
function fixture() {
  const images = new Map();
  const src = name => { const value = `/game/prologue/v47/${name}.png`; images.set(value, { width: 256, height: 480, id: name }); return value; };
  const actor = id => Object.fromEntries(["left", "right"].map(direction => [direction, {
    src: src(`${id}-${direction}`), bodyHeight: 80,
    clips: Object.fromEntries(api.NURSERY_ART_POSES.map((pose, index) => [pose, { loop: ["idle", "walk", "ready"].includes(pose),
      frames: [0, 1].map(frame => ({ rect: [((index * 2 + frame) % 4) * 64, Math.floor((index * 2 + frame) / 4) * 96, 64, 96], pivot: [32, 90], handAnchor: [48, 45], durationTicks: 10 })) }]))
  }]));
  const manifest = { version: 1, actorKind: "youngling", scenes: { arena: { src: src("arena") }, village: { src: src("village") }, redMoon: { src: src("red-moon") } }, blade: { src: src("blade") }, actors: { player: actor("player"), rival: actor("rival") } };
  return { manifest, images };
}
function context() { const draws = []; return { draws, save() {}, restore() {}, translate() {}, rotate() {}, clearRect() {}, fillRect() {}, drawImage(...args) { draws.push(args); } }; }
function presentation() { return { phase: "duel", hud: false, vision: "natural-red-orange-yellow", controlEnabled: true, readyGestureProgress: 0, showStartPrompt: false, showReadyPrompt: false, camera: { shot: "arena", progress: 0, blur: 0 }, showTitle: false, title: "Yautja: The Long Hunt", awaitingNextChapter: false,
  groundBlade: { visible: true, x: 454, y: 414 }, actors: [
    { id: "player", actorKind: "youngling", x: 326, y: 414, facing: 1, pose: "idle", poseTick: 0, holdsDetachedBlade: false },
    { id: "rival", actorKind: "youngling", x: 634, y: 414, facing: -1, pose: "idle", poseTick: 0, holdsDetachedBlade: false },
  ] }; }

test("eight decoded PNGs plus every native youngling clip are required before readiness", () => {
  const bank = fixture(); assert.equal(api.nurseryArtSources(bank.manifest).length, 8); assert.deepEqual(api.validateNurseryArt(bank.manifest, bank.images), []);
  bank.images.delete(bank.manifest.actors.player.left.src);
  assert.match(api.validateNurseryArt(bank.manifest, bank.images).join(" "), /non décodée/);
});
test("missing poses, adult sources and same-file mirrored directions are rejected", () => {
  for (const mutate of [bank => { delete bank.manifest.actors.rival.left.clips.thrown; }, bank => { bank.manifest.actors.player.left.src = bank.manifest.actors.player.right.src; }, bank => { bank.manifest.actors.player.right.src = "/game/sprites/adult.png"; }]) {
    const bank = fixture(); mutate(bank); assert.ok(api.validateNurseryArt(bank.manifest, bank.images).length > 0);
  }
});
test("out-of-bounds cells, missing hand anchors and repeated static drawings do not pass as animation", () => {
  const mutations = [clip => { clip.frames[1].rect = clip.frames[0].rect; }, clip => { clip.frames[1].rect[0] = 999; }, clip => { clip.frames[1].handAnchor[1] = 97; }, clip => { clip.frames[0].durationTicks = NaN; }, clip => { clip.frames = [clip.frames[0]]; }];
  for (const mutate of mutations) { const bank = fixture(); mutate(bank.manifest.actors.player.left.clips.walk); assert.ok(api.validateNurseryArt(bank.manifest, bank.images).length > 0); }
});
test("combat actions hold their authored final drawing while walking loops", () => {
  const bank = fixture(), atlas = bank.manifest.actors.player.right;
  assert.equal(api.nurseryClipFrame(atlas.clips.jab, 999), atlas.clips.jab.frames[1]);
  assert.equal(api.nurseryClipFrame(atlas.clips.walk, 20), atlas.clips.walk.frames[0]);
  atlas.clips.jab.loop = true; assert.match(api.validateNurseryArt(bank.manifest, bank.images).join(" "), /non bouclable/);
});
test("renderer chooses the right native PNG for each actor without canvas mirroring", () => {
  const bank = fixture(), ctx = context(), model = presentation();
  api.drawNurseryScene(ctx, model, bank, false);
  assert.deepEqual(ctx.draws.map(draw => draw[0].id), ["arena", "blade", "player-right", "rival-left"]);
  model.actors[0].facing = -1; model.actors[1].facing = 1;
  const crossed = context(); api.drawNurseryScene(crossed, model, bank, false);
  assert.deepEqual(crossed.draws.map(draw => draw[0].id), ["arena", "blade", "player-left", "rival-right"]);
});
test("detached blade is drawn exactly once on ground or hand, including during a throw", () => {
  const bank = fixture(), model = presentation();
  for (const owner of [null, "player", "rival"]) {
    model.groundBlade.visible = owner === null;
    for (const actor of model.actors) { actor.holdsDetachedBlade = actor.id === owner; actor.pose = "throw"; actor.poseTick = 14; }
    const ctx = context(); api.drawNurseryScene(ctx, model, bank, false);
    assert.equal(ctx.draws.filter(draw => draw[0].id === "blade").length, 1);
  }
});
test("black/loading screens never draw substitute geometry or adults; reduced-motion village is static", () => {
  const bank = fixture(), model = presentation();
  const empty = context(); api.drawNurseryScene(empty, model, null, false); assert.equal(empty.draws.length, 0);
  model.camera.shot = "black"; api.drawNurseryScene(empty, model, bank, false); assert.equal(empty.draws.length, 0);
  model.camera.shot = "village"; model.camera.progress = 0.4;
  const first = context(); api.drawNurseryScene(first, model, bank, true);
  model.camera.progress = 0.9; const second = context(); api.drawNurseryScene(second, model, bank, true);
  assert.deepEqual(first.draws, second.draws);
});
test("prologue uses the player's remapped combat keys and never adds old defaults", () => {
  const bindings = { ...api.DEFAULT_CONTROL_BINDINGS, "pit.p1AttackLight": ["KeyX"] };
  const sample = codes => api.sampleNurseryControls(new Set(codes), new Set(), bindings, null);
  assert.equal(sample(["KeyJ"]).actions.light, false); assert.equal(sample(["KeyX"]).actions.light, true);
  assert.equal(sample(["ArrowLeft", "ArrowRight"]).actions.move, 0); assert.equal(sample(["ArrowLeft", "ArrowRight"]).neutral, false);
  assert.equal(sample([]).neutral, true);
});
test("standard pad, touch and release gates share explicit non-overlapping combat actions", () => {
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false }));
  const pad = { connected: true, mapping: "standard", axes: [-0.7], buttons };
  buttons[5].pressed = true;
  let sample = api.sampleNurseryControls(new Set(), new Set(), api.DEFAULT_CONTROL_BINDINGS, pad);
  assert.equal(sample.actions.move, -1); assert.equal(sample.actions.throw, true); assert.equal(sample.actions.blade, false); assert.equal(sample.neutral, false);
  sample = api.sampleNurseryControls(new Set(), new Set(["ready"]), api.DEFAULT_CONTROL_BINDINGS, null);
  assert.equal(sample.actions.ready, true); assert.equal(sample.neutral, false);
  sample = api.sampleNurseryControls(new Set(), new Set(), api.DEFAULT_CONTROL_BINDINGS, { ...pad, connected: false });
  assert.equal(sample.neutral, true);
});
test("any gameplay key can confirm the initial black screen without forcing ready", () => {
  const sample = api.sampleNurseryControls(new Set(["KeyZ"]), new Set(), api.DEFAULT_CONTROL_BINDINGS, null, true);
  assert.equal(sample.actions.confirm, true); assert.equal(sample.actions.ready, false);
});

test("ready gesture follows its actual hold duration rather than the global animation clock", () => {
  const bank = fixture(), model = presentation();
  model.actors[0].pose = "ready"; model.actors[0].poseTick = 9999;
  model.readyGestureProgress = 0.02;
  const beginning = context(); api.drawNurseryScene(beginning, model, bank, false);
  assert.deepEqual(beginning.draws.find(draw => draw[0].id === "player-right").slice(1, 5), bank.manifest.actors.player.right.clips.ready.frames[0].rect);
  bank.manifest.actors.player.right.clips.ready.loop = false; model.readyGestureProgress = 0.9;
  const ending = context(); api.drawNurseryScene(ending, model, bank, false);
  assert.deepEqual(ending.draws.find(draw => draw[0].id === "player-right").slice(1, 5), bank.manifest.actors.player.right.clips.ready.frames[1].rect);
});
test("arrival sound remains silent until unlocked, and mute/dispose stop every procedural voice", async () => {
  const previousWindow = globalThis.window;
  const sources = [], outputs = [];
  const parameter = () => ({ value: 0, setValueAtTime(value) { this.value = value; }, linearRampToValueAtTime() {} });
  class FakeAudioContext {
    state = "running"; currentTime = 0; sampleRate = 100; destination = {};
    createGain() { const result = { gain: parameter(), connect() {}, disconnect() {} }; outputs.push(result); return result; }
    createBuffer(_channels, length) { return { getChannelData: () => new Float32Array(length) }; }
    createBufferSource() { const source = { buffer: null, onended: null, stopped: 0, connect() {}, disconnect() {}, start() {}, stop() { this.stopped++; } }; sources.push(source); return source; }
    createBiquadFilter() { return { frequency: parameter(), Q: parameter(), connect() {}, disconnect() {} }; }
    async resume() { this.state = "running"; }
    async close() { this.state = "closed"; }
  }
  try {
    globalThis.window = { AudioContext: FakeAudioContext };
    const audio = new api.NurseryCrowdAudio(); audio.arrival(); assert.equal(sources.length, 0);
    await audio.unlock(); audio.arrival(); assert.equal(sources.length, 6);
    audio.setEnabled(false); assert.ok(sources.every(source => source.stopped >= 2)); assert.equal(outputs[0].gain.value, 0);
    audio.arrival(); assert.equal(sources.length, 6);
    audio.setEnabled(true); audio.arrival(); assert.equal(sources.length, 12);
    audio.dispose(); assert.ok(sources.every(source => source.stopped >= 2)); audio.arrival(); assert.equal(sources.length, 12);
  } finally { globalThis.window = previousWindow; }
});

test("actual delivered PNG dimensions and forty authored clips satisfy readiness", async () => {
  const manifest = api.NURSERY_ART_MANIFEST;
  const images = new Map();
  for (const src of api.nurseryArtSources(manifest)) {
    const metadata = await sharp(path.join(process.cwd(), "public", src)).metadata();
    assert.equal(metadata.format, "png");
    images.set(src, { width: metadata.width, height: metadata.height });
  }
  assert.deepEqual(api.validateNurseryArt(manifest, images), []);
  assert.equal(Object.values(manifest.actors).flatMap(actor => Object.values(actor)).reduce((sum, atlas) => sum + Object.keys(atlas.clips).length, 0), 40);
});

test("held blade aligns the actual handle to the measured hand rather than gripping its cutting edge", () => {
  const bank = fixture(), model = presentation(), ctx = context();
  model.groundBlade.visible = false; model.actors[0].holdsDetachedBlade = true;
  api.drawNurseryScene(ctx, model, bank, false);
  const frame = bank.manifest.actors.player.right.clips.idle.frames[0];
  const handY = model.actors[0].y + (frame.handAnchor[1] - frame.pivot[1]) * 88 / 80;
  const bladeDraw = ctx.draws.find(draw => draw[0].id === "blade");
  assert.ok(Math.abs(bladeDraw[2] + bladeDraw[4] * 0.92 - handY) < 1e-8);
});
