import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const result = await build({ stdin: { contents: 'export * from "./app/game/pitArenaProduction"; export * from "./app/game/pitArenaRendering"; export { createPitCombatState, serializePitCombat, PIT_ARENAS } from "./app/game/systems/pitCombat";', loader: "ts", resolveDir: process.cwd() }, bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const api = await import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64"));

function reviewedFixture() {
  const manifest = structuredClone(api.PIT_ARENA_PRODUCTION_MANIFEST);
  const stage = manifest.stages[0];
  stage.runtimeEnabled = true;
  for (const plane of stage.planes) for (const asset of plane.assets) {
    delete asset.sourceCrop;
    for (const [index, frame] of asset.frames.entries()) {
    frame.status = "reviewed";
    frame.generation = { generator: "openai-imagegen", source: "test-fixture-only.json", sha256: String(index).repeat(64), width: 1200, height: 1800, hasAlpha: asset.alphaRequired, contentBounds: { x: 200, y: 100, width: 400, height: 1500 } };
    frame.review = { evidence: "test-fixture-only.md", coherence: true, layout: true, alpha: true };
    frame.integration = null;
  }
  }
  return manifest;
}
function recorder() {
  const calls = [], stack = [];
  const state = { globalAlpha: 1, imageSmoothingEnabled: true };
  return new Proxy({ calls, ...state }, { get(target, key) {
    if (key in target) return target[key];
    if (key === "save") return () => { stack.push({ globalAlpha: target.globalAlpha }); calls.push({ name: "save", args: [] }); };
    if (key === "restore") return () => { Object.assign(target, stack.pop()); calls.push({ name: "restore", args: [] }); };
    return (...args) => calls.push({ name: key, args, alpha: target.globalAlpha });
  } });
}
function fakeImageClass(fail = () => false, pending = false) {
  return class {
    naturalWidth = 1200;
    naturalHeight = 1800;
    static requested = [];
    set src(value) {
      this.value = value;
      if (!value) return;
      this.constructor.requested.push(value);
      if (pending) return;
      queueMicrotask(() => fail(value) ? this.onerror?.() : this.onload?.());
    }
    get src() { return this.value; }
  };
}
async function withImages(implementation, callback) {
  const old = globalThis.Image;
  globalThis.Image = implementation;
  try { return await callback(); } finally { if (old === undefined) delete globalThis.Image; else globalThis.Image = old; }
}

test("100 production entries preserve 8 legacy arenas plus 12 explicit duel extensions", () => {
  const summary = api.summarizePitArenaProduction();
  assert.equal(summary.stages, 100);
  assert.equal(summary.primaryPlaneTargets, 600);
  assert.equal(summary.legacyPlayable, 8);
  assert.equal(summary.concepts, 80);
  assert.equal(summary.runtimePlayable, 20);
  assert.equal(new Set(api.PIT_ARENA_PRODUCTION_MANIFEST.stages.map(stage => stage.catalogueId)).size, 100);
  for (const stage of api.PIT_ARENA_PRODUCTION_MANIFEST.stages) assert.deepEqual(stage.planes.map(plane => plane.id), ["P0", "P1", "P2", "P3", "P4", "P5"]);
  const fixture = reviewedFixture();
  fixture.stages[0].legacyRuntimeStatus = "concept";
  assert.equal(api.resolvePitArenaProductionKit("the-pit", fixture), null);
});

test("unreviewed or inconsistent art cannot replace the existing six-plane runtime", () => {
  const fixture = reviewedFixture();
  assert(api.resolvePitArenaProductionKit("the-pit", fixture));
  const frame = fixture.stages[0].planes[1].assets[0].frames[0];
  frame.generation.hasAlpha = false;
  assert.equal(api.resolvePitArenaProductionKit("the-pit", fixture), null);
  frame.generation.hasAlpha = true;
  frame.generation.contentBounds.width = 2000;
  assert.equal(api.resolvePitArenaProductionKit("the-pit", fixture), null);
  frame.generation.contentBounds.width = 400;
  frame.review = null;
  assert.equal(api.resolvePitArenaProductionKit("the-pit", fixture), null);
  frame.review = { evidence: "test", coherence: true, layout: true, alpha: true };
  frame.path = "/game/sprites/v33/pit-arenas/another-arena/borrowed.png";
  assert.equal(api.resolvePitArenaProductionKit("the-pit", fixture), null);
});

test("an incomplete loop only requests its first reviewed drawing and is held", () => {
  const fixture = reviewedFixture();
  const flame = fixture.stages[0].planes[3].assets.find(asset => asset.animation);
  flame.frames[2].status = "planned";
  flame.frames[2].generation = null;
  flame.frames[2].review = null;
  const kit = api.resolvePitArenaProductionKit("the-pit", fixture);
  assert(kit);
  const runtimeFlame = kit.planes[3].assets.find(asset => asset.animation);
  assert.equal(runtimeFlame.frames.length, 1);
  assert(kit.paths.includes(flame.frames[0].path));
  assert(!kit.paths.includes(flame.frames[1].path));
});

test("the stage loader selects only its independent kit, and restores all legacy images after a required failure", async () => {
  const fixture = reviewedFixture();
  const Image = fakeImageClass();
  await withImages(Image, async () => {
    const bank = await api.loadPitArenaArt("the-pit", { productionManifest: fixture });
    assert(bank.productionKit);
    assert.equal(bank.failedPaths.size, 0);
    assert(Image.requested.every(src => src.startsWith("/game/sprites/v33/pit-arenas/the-pit/")));
  });
  const FailureImage = fakeImageClass(src => src.endsWith("p2-a-ritual-pillar-left.png"));
  await withImages(FailureImage, async () => {
    const bank = await api.loadPitArenaArt("the-pit", { productionManifest: fixture });
    assert.equal(bank.productionKit, undefined);
    assert(bank.failedPaths.has("/game/sprites/v33/pit-arenas/the-pit/p2-a-ritual-pillar-left.png"));
    const art = api.PIT_ARENA_ART_DEFINITIONS["the-pit"];
    for (const src of [art.backdrop, art.floor.src, ...Object.values(art.planes).flatMap(plane => plane.map(asset => asset.src))]) assert(bank.images.has(src), src);
  });
});

test("cancellation abandons the kit without requesting a fallback or retaining late images", async () => {
  const fixture = reviewedFixture();
  const Image = fakeImageClass(() => false, true);
  const controller = new AbortController();
  await withImages(Image, async () => {
    const loading = api.loadPitArenaArt("the-pit", { productionManifest: fixture, signal: controller.signal, timeoutMs: 500 });
    controller.abort();
    const bank = await loading;
    assert.equal(bank.cancelled, true);
    assert.equal(bank.images.size, 0);
    assert.equal(bank.failedPaths.size, bank.requestedPaths.size);
    assert(Image.requested.every(src => src.startsWith("/game/sprites/v33/pit-arenas/the-pit/")));
  });
});

test("cropped sub-plans retain aspect ratio, six independent passes and world-locked floors at camera extrema", async () => {
  await withImages(fakeImageClass(), async () => {
    const bank = await api.loadPitArenaArt("the-pit", { productionManifest: reviewedFixture() });
    const state = api.createPitCombatState("jungle-hunter", "city-hunter", { mode: "training", arenaId: "the-pit" });
    const snapshot = api.serializePitCombat(state);
    const pillar = bank.productionKit.planes[2].assets[0];
    const tile = bank.productionKit.planes[4].assets.find(asset => asset.mode === "repeat-x");
    for (const centerX of [-100, 480, 1060]) for (const zoom of [.8, 1, 1.95]) for (const reducedMotion of [false, true]) {
      const context = recorder();
      const camera = { arenaId: "the-pit", centerX, centerY: 270, zoom };
      const frozenCamera = structuredClone(camera);
      const back = api.drawPitArenaBackdrop(context, state, camera, bank, { reducedMotion });
      const front = api.drawPitArenaForeground(context, state, camera, bank, { reducedMotion });
      assert.deepEqual([...back.drawnPlanes, ...front.drawnPlanes], ["P0", "P1", "P2", "P3", "P4", "P5"]);
      assert.deepEqual(back.missingPaths, []);
      const drawing = context.calls.find(call => call.name === "drawImage" && call.args[0].src === pillar.frames[0].path);
      assert.deepEqual(drawing.args.slice(1, 5), [200, 100, 400, 1500]);
      assert(Math.abs(drawing.args[7] / drawing.args[8] - 400 / 1500) < 1e-9);
      const floorDraws = context.calls.filter(call => call.name === "drawImage" && call.args[0].src === tile.frames[0].path);
      assert(floorDraws[0].args[5] <= 0);
      assert(floorDraws.at(-1).args[5] + floorDraws.at(-1).args[7] >= 960);
      assert(floorDraws.every(call => Math.abs(call.args[6] - (270 + (430 - camera.centerY) * zoom)) < 1e-9));
      for (let i = 1; i < floorDraws.length; i++) assert(floorDraws[i].args[5] <= floorDraws[i - 1].args[5] + floorDraws[i - 1].args[7]);
      assert.equal(api.serializePitCombat(state), snapshot);
      assert.deepEqual(camera, frozenCamera);
      assert.equal(context.calls.filter(call => call.name === "save").length, context.calls.filter(call => call.name === "restore").length);
    }
  });
});

test("only complete loaded drawings animate, while reduced motion holds the reference frame", async () => {
  await withImages(fakeImageClass(), async () => {
    const bank = await api.loadPitArenaArt("the-pit", { productionManifest: reviewedFixture() });
    const state = api.createPitCombatState("jungle-hunter", "city-hunter", { mode: "training", arenaId: "the-pit" });
    const camera = { arenaId: "the-pit", centerX: 480, centerY: 270, zoom: 1 };
    const flame = bank.productionKit.planes[3].assets.find(asset => asset.animation);
    const framesSeen = new Set();
    for (const frame of [0, 8, 16, 24, 32, 40]) {
      state.frame = frame;
      const context = recorder();
      api.drawPitArenaBackdrop(context, state, camera, bank);
      for (const call of context.calls.filter(call => call.name === "drawImage" && call.args[0].src.includes("brazier-flame"))) framesSeen.add(call.args[0].src);
    }
    assert.equal(framesSeen.size, 6);
    const reduced = recorder();
    api.drawPitArenaBackdrop(reduced, state, camera, bank, { reducedMotion: true });
    assert(reduced.calls.filter(call => call.name === "drawImage" && call.args[0].src.includes("brazier-flame")).every(call => call.args[0].src === flame.frames[0].path));
    bank.images.delete(flame.frames[3].path);
    const partial = recorder();
    api.drawPitArenaBackdrop(partial, state, camera, bank);
    assert(partial.calls.filter(call => call.name === "drawImage" && call.args[0].src.includes("brazier-flame")).every(call => call.args[0].src === flame.frames[0].path));
  });
});

test("the Hall uses fourteen new image files, with no borrowed THE PIT image or unlock of a concept", () => {
  const hall = api.resolvePitArenaProductionKit("trophy-hall");
  assert(hall);
  assert.equal(hall.paths.length, 14);
  assert(hall.paths.every(path => path.startsWith("/game/sprites/v33/pit-arenas/trophy-hall/")));
  const previousHashes = new Set(api.PIT_ARENA_PRODUCTION_MANIFEST.stages[0].planes.flatMap(plane => plane.assets.flatMap(asset => asset.frames.map(frame => frame.generation.sha256))));
  const hallHashes = hall.planes.flatMap(plane => plane.assets.flatMap(asset => asset.frames.map(frame => frame.generation.sha256)));
  assert.equal(new Set(hallHashes).size, 14);
  assert(hallHashes.every(hash => !previousHashes.has(hash)));
  assert(api.PIT_ARENA_PRODUCTION_MANIFEST.stages.filter(stage => stage.legacyRuntimeStatus === "concept" && !stage.runtimeExtension).every(stage => !stage.runtimeEnabled));
});

test("separate Hall trophies remain inside their display cases through actual draw projections", () => {
  const kit = api.resolvePitArenaProductionKit("trophy-hall");
  const images = new Map(kit.planes.flatMap(plane => plane.assets.flatMap(asset => asset.frames.map(frame => [frame.path, { src: frame.path, naturalWidth: frame.generation.width, naturalHeight: frame.generation.height }]))));
  const bank = { arenaId: "trophy-hall", productionKit: kit, images, requestedPaths: new Set(kit.paths), failedPaths: new Set(), cancelled: false };
  const state = api.createPitCombatState("jungle-hunter", "city-hunter", { mode: "training", arenaId: "trophy-hall" });
  for (const centerX of [180, 480, 780]) for (const centerY of [170, 270, 360]) for (const zoom of [.8, 1, 1.95]) for (const reducedMotion of [false, true]) {
    const context = recorder();
    api.drawPitArenaBackdrop(context, state, { arenaId: "trophy-hall", centerX, centerY, zoom }, bank, { reducedMotion });
    const bounds = filename => {
      const drawing = context.calls.find(call => call.name === "drawImage" && call.args[0].src.endsWith(filename + ".png"));
      assert(drawing, filename);
      const [x, y, width, height] = drawing.args.slice(5);
      return { x, y, width, height };
    };
    for (const [caseId, trophyId] of [["p2-b-display-case-left", "p3-a-trophy-crowned-skull"], ["p2-c-display-case-right", "p3-b-trophy-armored-jaw"]]) {
      const cabinet = bounds(caseId), trophy = bounds(trophyId);
      const floor = bounds("p4-a-gallery-floor-tile");
      assert(Math.abs(cabinet.y + cabinet.height - floor.y) < 5, caseId + " floats or sinks relative to the real contact floor");
      assert(trophy.x >= cabinet.x + cabinet.width * .07, trophyId + " exits left of its case");
      assert(trophy.x + trophy.width <= cabinet.x + cabinet.width * .93, trophyId + " exits right of its case");
      assert(trophy.y >= cabinet.y + cabinet.height * .09, trophyId + " exits through case header");
      assert(trophy.y + trophy.height <= cabinet.y + cabinet.height * .74, trophyId + " exits its display window");
    }
  }
});

const v34ArenaIds = ["canopy-causeway", "frost-chamber", "ash-courtyard", "glass-terrace", "abyssal-bridge", "ruins-tribunal"];

test("six V34 playable kits each own fourteen unique drawings without borrowing earlier art", () => {
  const previous = new Set(["the-pit", "trophy-hall"].flatMap(id => api.resolvePitArenaProductionKit(id).planes.flatMap(p => p.assets.flatMap(a => a.frames.map(f => f.generation.sha256)))));
  const hashes = new Set();
  for (const id of v34ArenaIds) {
    const kit = api.resolvePitArenaProductionKit(id);
    assert(kit, id);
    assert.equal(kit.paths.length, 14);
    assert.equal(kit.planes.length, 6);
    assert.equal(kit.planes.flatMap(p => p.assets).length, 14);
    for (const plane of kit.planes) for (const asset of plane.assets) {
      assert.equal(asset.animation, null, "Fixed drawings cannot claim new animation coverage");
      if (plane.id === "P4") assert.equal(asset.parallax, 1);
      for (const frame of asset.frames) {
        assert(frame.path.startsWith(`/game/sprites/v34/pit-arenas/${id}/`));
        assert(!previous.has(frame.generation.sha256));
        assert(!hashes.has(frame.generation.sha256));
        hashes.add(frame.generation.sha256);
      }
    }
  }
  assert.equal(hashes.size, 84);
  assert.equal(api.summarizePitArenaProduction().legacyPlayable, 8);
});

test("V34 grounded objects keep their feet on P4 and suspended modules remain attached to their top anchors", () => {
  for (const id of v34ArenaIds) {
    const kit = api.resolvePitArenaProductionKit(id);
    const images = new Map(kit.planes.flatMap(p => p.assets.flatMap(a => a.frames.map(f => [f.path, { src: f.path, naturalWidth: f.generation.width, naturalHeight: f.generation.height }]))));
    const bank = { arenaId: id, productionKit: kit, images, requestedPaths: new Set(kit.paths), failedPaths: new Set(), cancelled: false };
    const state = api.createPitCombatState("jungle-hunter", "city-hunter", { mode: "training", arenaId: id });
    for (const centerX of [100, 480, 860]) for (const centerY of [180, 360]) for (const zoom of [.8, 1.95]) for (const reducedMotion of [false, true]) {
      const camera = { arenaId: id, centerX, centerY, zoom };
      const context = recorder();
      api.drawPitArenaBackdrop(context, state, camera, bank, { reducedMotion });
      api.drawPitArenaForeground(context, state, camera, bank, { reducedMotion });
      const drawings = context.calls.filter(call => call.name === "drawImage");
      const floor = drawings.find(call => call.args[0].src.endsWith("/p4-a-contact-floor.png"));
      assert(floor);
      for (const plane of kit.planes) for (const asset of plane.assets.filter(a => a.mode === "module")) {
        const drawing = drawings.find(call => call.args[0].src === asset.frames[0].path);
        assert(drawing, id + " " + asset.id);
        const [sx, sy, sw, sh, dx, dy, dw, dh] = drawing.args.slice(1);
        assert(sx >= 0 && sy >= 0 && Number.isFinite(dx));
        assert(Math.abs(dw / dh - sw / sh) < 1e-9, asset.id + " distorted");
        if (asset.anchorToGround) assert(Math.abs(dy + dh - floor.args[6]) < 5, id + " " + asset.id + " floats above the floor");
        if (asset.verticalAlign === "top") {
          const transform = api.getPitArenaSubplanTransform(id, asset.parallax, camera, reducedMotion);
          assert(Math.abs(dy - (asset.placements[0].y * transform.scale + transform.translateY)) < 1e-9, asset.id + " detached from top anchor");
        }
      }
    }
  }
});

test("a required image failure in any V34 kit selects its own complete legacy fallback", async () => {
  for (const id of v34ArenaIds) {
    await withImages(fakeImageClass(src => src.endsWith("/p3-c-light-left.png")), async () => {
      const bank = await api.loadPitArenaArt(id);
      assert.equal(bank.productionKit, undefined, id);
      assert(bank.failedPaths.has(`/game/sprites/v34/pit-arenas/${id}/p3-c-light-left.png`));
      const old = api.PIT_ARENA_ART_DEFINITIONS[id];
      for (const src of [old.backdrop, old.floor.src, ...Object.values(old.planes).flatMap(p => p.map(a => a.src))]) assert(bank.images.has(src));
    });
  }
});
