import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import sharp from "sharp";

const built = await build({
  stdin: { contents: "export * from './app/game/pitCombatBitmapArt.ts'; export { createPitCombatState, PIT_FIGHTERS } from './app/game/systems/pitCombat.ts';", resolveDir: fileURLToPath(new URL("..", import.meta.url)) },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
});
const {
  PIT_COMBAT_BITMAP_FIGHTER_IDS: ids, getPitCombatBitmapArtDefinition: definitionFor,
  loadPitCombatBitmapArt: load, getPitCombatBitmapArtStatus: status,
  drawPitCombatBitmapFighter: draw, createPitCombatState, PIT_FIGHTERS,
} = await import("data:text/javascript;base64," + Buffer.from(built.outputFiles[0].text).toString("base64"));

test("nine exact-ID alpha plates exist with their expected dimensions and constant support bounds", async () => {
  assert.deepEqual(ids, ["jungle-hunter", "city-hunter", "scar", "celtic", "wolf", "feral-hunter", "berserker", "falconer", "kok-warlord"]);
  for (const id of ids) {
    const definition = definitionFor(id);
    assert.equal(definition.kind, "static-bitmap");
    assert.equal(definition.src, "/game/sprites/v5/film-plates/" + id + ".png");
    const local = fileURLToPath(new URL("../public" + definition.src, import.meta.url));
    const metadata = await sharp(local).metadata();
    assert.equal(metadata.width, definition.width, id);
    assert.equal(metadata.height, definition.height, id);
    assert.equal(metadata.hasAlpha, true, id);
    const { data, info } = await sharp(local).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let bottom = -1;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * 4 + 3];
      if (alpha > 16) bottom = y;
      if (x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1) assert.ok(alpha <= 8, id + " clipped outer edge");
    }
    assert.equal(definition.pivot[1], bottom + 1, id + " support");
    assert.ok(definition.pivot[0] > 0 && definition.pivot[0] < definition.width);
    assert.ok(definition.bodyTopY >= 0 && definition.bodyTopY < definition.pivot[1]);
    assert.ok(Object.isFrozen(definition) && Object.isFrozen(definition.pivot));
  }
  for (const id of ["scarface", "valkyrie", "witch", "enforcer", "stone-heart"]) assert.equal(definitionFor(id), null);
});

function fakeBrowser(behavior = {}) {
  const previousImage = globalThis.Image, previousDocument = globalThis.document;
  const instances = [], requested = [];
  class FakeImage {
    constructor() {
      if (behavior.constructorThrows) throw new Error("Image unavailable");
      this.complete = true; this.naturalWidth = 0; this.naturalHeight = 0; instances.push(this);
    }
    set src(value) {
      this.source = value;
      if (!value) return;
      if (behavior.srcThrows) throw new Error("request denied");
      requested.push(value);
      this.id = value.split("/").at(-1).replace(".png", "");
      const definition = definitionFor(this.id);
      const entry = behavior[this.id] ?? {};
      this.mode = entry.mode;
      this.naturalWidth = definition.width + (entry.wrongDimensions ? 1 : 0);
      this.naturalHeight = definition.height;
      if (entry.pending) return;
      queueMicrotask(() => { if (entry.error) this.onerror?.(); else this.onload?.(); });
    }
    get src() { return this.source; }
  }
  globalThis.Image = FakeImage;
  globalThis.document = {
    createElement(type) {
      assert.equal(type, "canvas");
      let drawn;
      return {
        width: 0, height: 0,
        getContext() {
          return {
            drawImage(image) { drawn = image; },
            getImageData() {
              if (drawn.mode === "tainted") throw new Error("readback denied");
              const width = drawn.naturalWidth, height = drawn.naturalHeight;
              const pixels = new Uint8ClampedArray(width * height * 4);
              if (drawn.mode === "opaque") for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;
              else if (drawn.mode !== "empty") pixels[(Math.floor(height / 2) * width + Math.floor(width / 2)) * 4 + 3] = 255;
              if (drawn.mode === "clipped") pixels[3] = 255;
              return { data: pixels };
            },
          };
        },
      };
    },
  };
  return { instances, requested, restore() { globalThis.Image = previousImage; globalThis.document = previousDocument; } };
}

test("the loader requests only the chosen unique IDs and exposes missing art honestly", async () => {
  const browser = fakeBrowser();
  try {
    assert.equal(status(null, "wolf"), "loading");
    assert.equal(status(null, "enforcer"), "missing");
    assert.equal(draw({}, null, createPitCombatState().fighters[0], 500), false);
    const bank = await load(["wolf", "wolf", "enforcer"]);
    assert.deepEqual(browser.requested, [definitionFor("wolf").src]);
    assert.deepEqual([...bank.readyIds], ["wolf"]);
    assert.deepEqual([...bank.failedIds], ["enforcer"]);
    assert.equal(status(bank, "wolf"), "static-bitmap");
    assert.equal(status(bank, "enforcer"), "missing");
    assert.equal(status(bank, "city-hunter"), "loading", "another selected pair can still be loading");
  } finally { browser.restore(); }
});

test("wrong dimensions, opaque/empty/clipped pixels and unreadable alpha fail atomically", async () => {
  for (const config of [{ wrongDimensions: true }, { mode: "opaque" }, { mode: "empty" }, { mode: "clipped" }, { mode: "tainted" }, { error: true }]) {
    const browser = fakeBrowser({ wolf: config });
    try {
      const bank = await load(["wolf"]);
      assert.equal(bank.images.size, 0);
      assert.equal(status(bank, "wolf"), "missing");
      assert.deepEqual([...bank.failedIds], ["wolf"]);
    } finally { browser.restore(); }
  }
});

test("SSR, a pre-aborted signal and browser constructor/src errors settle without a rejected promise", async () => {
  const noBrowser = await load(["wolf"]);
  assert.equal(status(noBrowser, "wolf"), "missing");
  for (const behavior of [{ constructorThrows: true }, { srcThrows: true }]) {
    const browser = fakeBrowser(behavior);
    try { assert.equal(status(await load(["wolf"]), "wolf"), "missing"); }
    finally { browser.restore(); }
  }
  const browser = fakeBrowser();
  try {
    const controller = new AbortController(); controller.abort();
    const bank = await load(["wolf"], { signal: controller.signal });
    assert.equal(bank.cancelled, true); assert.equal(bank.images.size, 0);
    assert.deepEqual(browser.requested, []);
  } finally { browser.restore(); }
});

test("timeout detaches handlers and a captured late callback cannot publish an image", async () => {
  const browser = fakeBrowser({ wolf: { pending: true } });
  try {
    const pending = load(["wolf"], { timeoutMs: 1 });
    const image = browser.instances[0], late = image.onload;
    const bank = await pending;
    assert.equal(status(bank, "wolf"), "missing");
    assert.equal(image.onload, null); assert.equal(image.onerror, null); assert.equal(image.src, "");
    late();
    assert.equal(bank.images.size, 0); assert.equal(bank.readyIds.size, 0);
  } finally { browser.restore(); }
});

test("aborting a pair discards already loaded art and ignores the remaining late callback", async () => {
  const browser = fakeBrowser({ "city-hunter": { pending: true } });
  try {
    const controller = new AbortController();
    const pending = load(["wolf", "city-hunter"], { signal: controller.signal });
    const city = browser.instances.find(image => image.id === "city-hunter"), late = city.onload;
    await Promise.resolve();
    controller.abort();
    const bank = await pending;
    assert.equal(bank.cancelled, true); assert.equal(bank.images.size, 0); assert.equal(bank.readyIds.size, 0);
    assert.deepEqual(new Set(bank.failedIds), new Set(["wolf", "city-hunter"]));
    late();
    assert.equal(bank.images.size, 0);
  } finally { browser.restore(); }
});

function readyBank(id) {
  const definition = definitionFor(id);
  const image = { complete: true, naturalWidth: definition.width, naturalHeight: definition.height };
  return { images: new Map([[id, image]]), requestedIds: new Set([id]), readyIds: new Set([id]), failedIds: new Set(), cancelled: false };
}
function recordingContext(throwOnDraw = false) {
  const calls = [];
  return {
    calls, globalAlpha: .8,
    save() { calls.push(["save"]); this.saved = { alpha: this.globalAlpha }; },
    restore() { calls.push(["restore"]); this.globalAlpha = this.saved.alpha; },
    translate(...args) { calls.push(["translate", ...args]); },
    scale(...args) { calls.push(["scale", ...args]); },
    drawImage(...args) { calls.push(["drawImage", ...args]); if (throwOnDraw) throw new Error("draw refused"); },
  };
}

test("fixed rendering anchors the feet, preserves proportions and does not stretch for crouch or attack", () => {
  const fighter = createPitCombatState("scar", "wolf").fighters[0];
  fighter.x = 412; fighter.y = 27; fighter.crouching = true; fighter.facing = -1;
  fighter.phase = "active"; fighter.action = { kind: "attack", attack: "heavy", frame: 14, connected: false };
  const before = structuredClone(fighter), context = recordingContext(), bank = readyBank("scar"), art = definitionFor("scar");
  assert.equal(draw(context, bank, fighter, 500), true);
  assert.deepEqual(fighter, before);
  assert.deepEqual(context.calls[1], ["translate", 412, 473]);
  const factor = PIT_FIGHTERS.scar.bodyHeight / (art.pivot[1] - art.bodyTopY);
  assert.deepEqual(context.calls[2], ["scale", -factor, factor]);
  assert.deepEqual(context.calls[3].slice(2), [-art.pivot[0], -art.pivot[1], art.width, art.height]);
  assert.equal(context.calls.filter(call => call[0] === "drawImage").length, 1);
  assert.equal(context.calls.at(-1)[0], "restore");
});

test("frontal plates retain authored orientation; cloak and contrast are presentation effects only", () => {
  const fighter = createPitCombatState("feral-hunter", "wolf").fighters[0];
  fighter.facing = -1; fighter.cloakPhase = "active";
  const context = recordingContext();
  assert.equal(draw(context, readyBank("feral-hunter"), fighter, 500, { highContrast: true, accent: "#ffffff" }), true);
  const scale = context.calls.find(call => call[0] === "scale");
  assert.equal(scale[1], scale[2]);
  assert.equal(context.shadowColor, "#ffffff");
  assert.ok(context.shadowBlur > 0);
  assert.equal(context.globalAlpha, .8, "caller opacity restored");
  assert.equal(definitionFor("kok-warlord").nativeFacing, "neutral");
});

test("missing/cancelled/invalid art does not touch Canvas; draw exceptions still restore its state", () => {
  const fighter = createPitCombatState("wolf", "jungle-hunter").fighters[0];
  const untouched = new Proxy({}, { get() { throw new Error("should not draw"); } });
  assert.equal(draw(untouched, null, fighter, 500), false);
  assert.equal(draw(untouched, { ...readyBank("wolf"), cancelled: true }, fighter, 500), false);
  assert.equal(draw(untouched, readyBank("wolf"), { ...fighter, x: NaN }, 500), false);
  const context = recordingContext(true);
  assert.throws(() => draw(context, readyBank("wolf"), fighter, 500), /draw refused/);
  assert.equal(context.calls.at(-1)[0], "restore");
});

test("the static adapter neither imports the rig nor approves draft sprite sheets", async () => {
  const source = await readFile(new URL("../app/game/pitCombatBitmapArt.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /from ["'][^"']*(?:save|hunterRig|hunterSpriteAtlas|hunterSpriteMotion|pitFighterAnimation)/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|validated|v28/);
});
