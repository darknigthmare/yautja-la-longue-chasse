import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { build } from "esbuild";
import sharp from "sharp";

const output = await build({
  stdin: {
    contents: 'export * from "./app/game/expansionExplorationRendering"; export * from "./app/game/systems/expansionExplorationRegions"; export * from "./app/game/systems/explorationProgress";',
    resolveDir: process.cwd(), loader: "ts",
  },
  bundle: true, format: "esm", platform: "node", write: false,
});
const api = await import("data:text/javascript;base64," + Buffer.from(output.outputFiles[0].text).toString("base64"));
const specs = Object.values(api.EXPANSION_EXPLORATION_SPECS);
const progressFor = spec => api.mergeExplorationProgress(api.defaultExplorationProgress(), {
  abilityIds: ["aerial-boost", spec.abilityId],
  openedGateIds: [spec.gateId],
  discoveredRoomIds: [spec.prefix + "-vault"],
});
function contextRecorder() {
  const images = [], labels = [], panels = [];
  return {
    images, labels, panels,
    context: {
      save() {}, restore() {}, beginPath() {}, arc() {}, fill() {},
      fillRect(...args) { panels.push(args); }, strokeRect() {},
      drawImage(...args) { images.push(args); },
      measureText(text) { return { width: text.length * 5 }; },
      fillText(text) { labels.push(text); },
    },
  };
}

test("the two reused device textures are real alpha assets, not new or fictitious trophy art", async () => {
  for (const path of Object.values(api.EXPANSION_DEVICE_TEXTURE_PATHS)) {
    assert.ok(existsSync("public" + path), path);
    const info = await sharp("public" + path).metadata();
    assert.equal(info.hasAlpha, true, path);
    assert.ok(info.width > 0 && info.height > 0);
  }
});

test("six installation devices use exact authored bounds and do not reveal unseen trophy identities", () => {
  for (const spec of specs) {
    const hidden = api.expansionDeviceVisuals(spec.missionId, api.defaultExplorationProgress());
    const moduleDevice = hidden.find(device => device.kind === "module");
    assert.deepEqual(moduleDevice.bounds, spec.layout.module);
    assert.equal(moduleDevice.state, "blocked");
    assert.equal(hidden.some(device => device.kind === "trophy"), false);
    assert.equal(hidden.some(device => device.detail === spec.copy.secretLabel), false);
    const acquired = api.expansionDeviceVisuals(spec.missionId, progressFor(spec));
    assert.equal(acquired.find(device => device.kind === "module").state, "complete");
    assert.equal(acquired.find(device => device.kind === "gate").state, "complete");
    const trophy = acquired.find(device => device.kind === "trophy");
    assert.deepEqual(trophy.bounds, spec.layout.secret);
    assert.equal(trophy.texture, "bindings");
    assert.equal(trophy.state, "available");
  }
});

test("collecting a trophy removes its separate pickup image and opening a shortcut updates its control", () => {
  for (const spec of specs) {
    const before = progressFor(spec);
    const completed = api.mergeExplorationProgress(before, {
      secretIds: [spec.secretId], abilityIds: [spec.shortcutRequirement],
      openedGateIds: [spec.shortcutId],
    });
    const images = {
      module: { id: "reader", naturalWidth: 72, naturalHeight: 90 },
      bindings: { id: "bindings", naturalWidth: 74, naturalHeight: 100 },
    };
    const player = { x: spec.layout.secret.x, y: spec.layout.secret.y, width: 72, height: 116 };
    const first = contextRecorder(), second = contextRecorder();
    api.drawExpansionRegionDevices(first.context, spec.missionId, before, images, player);
    api.drawExpansionRegionDevices(second.context, spec.missionId, completed, images, player);
    assert.equal(first.images.filter(args => args[0] === images.bindings).length, 1);
    assert.equal(second.images.filter(args => args[0] === images.bindings).length, 0);
    assert.equal(second.images.filter(args => args[0] === images.module).length, 1);
    assert.equal(api.expansionDeviceVisuals(spec.missionId, completed).find(device => device.kind === "shortcut").state, "complete");
    for (const args of first.images) {
      assert.ok(args.slice(1).every(Number.isFinite));
      assert.ok(Math.abs(args[3] / args[4] - args[0].naturalWidth / args[0].naturalHeight) < 1e-8, "preserve image aspect ratio");
    }
  }
});

test("devices remain readable during image failure and have no side effect on progression", () => {
  const spec = specs[0], progress = progressFor(spec);
  const serialized = JSON.stringify(progress);
  const calls = contextRecorder();
  api.drawExpansionRegionDevices(calls.context, spec.missionId, progress,
    { module: null, bindings: null },
    { x: spec.layout.module.x, y: spec.layout.module.y, width: 72, height: 116 });
  assert.equal(calls.images.length, 0);
  assert.ok(calls.panels.length > 0);
  assert.ok(calls.labels.some(label => label.includes(spec.copy.abilityLabel)));
  assert.equal(JSON.stringify(progress), serialized);
  assert.deepEqual(api.expansionDeviceVisuals("jungle-vey", progress), []);
});

test("the real hunt loads the reused bitmaps and draws devices before actors", () => {
  const source = readFileSync("app/game/HuntCanvas.tsx", "utf8");
  assert.match(source, /queueImage\(EXPANSION_DEVICE_TEXTURE_PATHS\[key\]/);
  assert.match(source, /drawExpansionRegionDevices\(context, mission\.id, state\.exploration, assets\.expansionDeviceTextures, state\.player\)/);
  assert.match(source, /expansionDeviceTextures: \{ module: null, bindings: null \}/);
});
