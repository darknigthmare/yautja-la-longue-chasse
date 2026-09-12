import assert from "node:assert/strict";
import test from "node:test";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const bundled = await build({ stdin: { contents: 'export * from "./app/game/pitArenaRendering"; export { createPitCombatState, PIT_ARENAS, stepPitCombat, serializePitCombat } from "./app/game/systems/pitCombat";', loader: "ts", resolveDir: root }, bundle: true, write: false, format: "esm", platform: "node" });
const api = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const stateFor = arenaId => api.createPitCombatState("jungle-hunter", "city-hunter", { mode: "training", arenaId });

const cameraFor = state => ({ arenaId: state.arenaId, centerX: 480, centerY: 270, zoom: 1.35, targetZoom: 1.35, mode: "follow", frame: 0 });

function contextRecorder() {
  const calls = [];
  const target = { globalAlpha: 1, imageSmoothingEnabled: true, calls };
  return new Proxy(target, { get(object, key) {
    if (key in object) return object[key];
    return (...args) => calls.push({ method: key, args });
  } });
}
async function bankFor(arenaId) {
  const images = new Map();
  for (const src of api.getPitArenaArtPaths(arenaId)) {
    const metadata = await sharp(root + "public" + src).metadata();
    images.set(src, { src, naturalWidth: metadata.width, naturalHeight: metadata.height });
  }
  return { arenaId, images, requestedPaths: new Set(images.keys()), failedPaths: new Set(), cancelled: false };
}

test("every playable arena references real bitmap assets and alpha modules in six distinct passes", async () => {
  assert.deepEqual(Object.keys(api.PIT_ARENA_ART_DEFINITIONS).sort(), Object.keys(api.PIT_ARENAS).sort());
  const allPaths = new Set();
  for (const [arenaId, art] of Object.entries(api.PIT_ARENA_ART_DEFINITIONS)) {
    assert.equal(art.arenaId, arenaId);
    for (const src of api.getPitArenaArtPaths(arenaId)) {
      assert.match(src, /^\/game\/.+\.(png|webp)$/);
      await access(root + "public" + src);
      allPaths.add(src);
    }
    for (const [plane, props] of Object.entries(art.planes)) {
      assert.ok(props.length > 0, arenaId + " " + plane);
      for (const item of props) {
        assert.notEqual(item.src, art.backdrop, "the panorama cannot pretend to be an independent plane");
        assert.equal((await sharp(root + "public" + item.src).metadata()).hasAlpha, true, item.src);
        assert.ok(Number.isFinite(item.x) && Number.isFinite(item.bottom) && item.height > 0);
      }
    }
    const floor = await sharp(root + "public" + art.floor.src).metadata();
    const [x, y, width, height] = art.floor.crop;
    assert.ok(x >= 0 && y >= 0 && x + width <= floor.width && y + height <= floor.height);
    assert.equal(floor.hasAlpha, true);
  }
  assert.ok(allPaths.size >= 35, "the arenas must use separate authored modules, not one generic picture");
});

test("P4 floor stays exactly registered to gameplay through pans and zooms", () => {
  for (const arenaId of Object.keys(api.PIT_ARENAS)) {
    const arena = api.PIT_ARENAS[arenaId];
    for (const centerX of [100, 480, 850]) for (const centerY of [140, 270, 390]) for (const zoom of [.8, .9, 1.95]) {
      const camera = { arenaId, centerX, centerY, zoom };
      const transform = api.getPitArenaLayerTransform(arenaId, "P4", camera);
      assert.equal(transform.scale, zoom);
      const projectedY = arena.groundY * zoom + transform.translateY;
      assert.ok(Math.abs(projectedY - (arena.height / 2 + (arena.groundY - centerY) * zoom)) < 1e-9);
      assert.ok(Math.abs(500 * zoom + transform.translateX - (arena.width / 2 + (500 - centerX) * zoom)) < 1e-9);
    }
  }
});

test("depth layers move independently, while reduced motion removes relative drift", () => {
  const camera = { arenaId: "the-pit", centerX: 600, centerY: 220, zoom: 1.4 };
  const transforms = api.PIT_ARENA_BITMAP_PLANES.map(plane => api.getPitArenaLayerTransform("the-pit", plane, camera));
  assert.equal(new Set(transforms.map(item => item.translateX)).size, 6);
  const fixed = api.PIT_ARENA_BITMAP_PLANES.map(plane => api.getPitArenaLayerTransform("the-pit", plane, camera, true));
  assert.ok(fixed.every(transform => JSON.stringify(transform) === JSON.stringify(fixed[0])));
  assert.equal(api.PIT_ARENA_PARALLAX.P4, 1);
});

test("foreground near either fighter fades without hiding remote props", () => {
  const state = stateFor("the-pit");
  const camera = { arenaId: "the-pit", centerX: 480, centerY: 270, zoom: 1 };
  for (const fighter of state.fighters) {
    assert.equal(api.getPitArenaForegroundOpacity({ x: fighter.x - 15, y: 315, width: 30, height: 95 }, state, camera), .08);
  }
  assert.equal(api.getPitArenaForegroundOpacity({ x: -250, y: 315, width: 30, height: 95 }, state, camera), .78);
});

test("all eight stages draw real images in six passes without changing combat, camera or replay", async () => {
  for (const arenaId of Object.keys(api.PIT_ARENAS)) {
    const state = stateFor(arenaId);
    const camera = cameraFor(state);
    const before = api.serializePitCombat(state);
    const cameraBefore = structuredClone(camera);
    const bank = await bankFor(arenaId);
    const context = contextRecorder();
    const back = api.drawPitArenaBackdrop(context, state, camera, bank);
    const front = api.drawPitArenaForeground(context, state, camera, bank);
    assert.deepEqual([...back.drawnPlanes, ...front.drawnPlanes], api.PIT_ARENA_BITMAP_PLANES);
    assert.deepEqual(back.missingPaths, []);
    assert.ok(context.calls.filter(call => call.method === "drawImage").length >= 10);
    assert.equal(api.serializePitCombat(state), before);
    assert.deepEqual(camera, cameraBefore);
    assert.equal(context.calls.filter(call => call.method === "save").length, context.calls.filter(call => call.method === "restore").length);
  }
});

test("floor tiling covers every visible screen edge at camera extrema without gaps", async () => {
  const arenaId = "the-pit";
  const bank = await bankFor(arenaId);
  const state = stateFor(arenaId);
  for (const centerX of [-100, 100, 480, 850, 1060]) for (const zoom of [.8, .9, 1.95]) {
    const context = contextRecorder();
    api.drawPitArenaBackdrop(context, state, { arenaId, centerX, centerY: 270, zoom }, bank);
    const tiles = context.calls.filter(call => call.method === "drawImage" && call.args[0].src === api.PIT_ARENA_ART_DEFINITIONS[arenaId].floor.src);
    assert.ok(tiles[0].args[5] <= 0);
    assert.ok(tiles.at(-1).args[5] + tiles.at(-1).args[7] >= 960);
    for (let i = 1; i < tiles.length; i++) assert.ok(tiles[i].args[5] <= tiles[i - 1].args[5] + tiles[i - 1].args[7]);
  }
});

test("missing or cancelled art never substitutes unrelated arena images", async () => {
  const state = stateFor("frost-chamber");
  const camera = cameraFor(state);
  const wrong = await bankFor("the-pit");
  const context = contextRecorder();
  const report = api.drawPitArenaBackdrop(context, state, camera, wrong);
  assert.equal(context.calls.filter(call => call.method === "drawImage").length, 0);
  assert.ok(report.missingPaths.length > 0);
  assert.deepEqual(api.drawPitArenaForeground(context, state, camera, wrong).drawnPlanes, []);
  const controller = new AbortController(); controller.abort();
  const aborted = await api.loadPitArenaArt("the-pit", { signal: controller.signal });
  assert.equal(aborted.cancelled, true); assert.equal(aborted.images.size, 0);
  assert.equal(aborted.failedPaths.size, aborted.requestedPaths.size);
});
