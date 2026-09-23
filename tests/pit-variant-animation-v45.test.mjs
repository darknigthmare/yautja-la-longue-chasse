import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const supplied = (id) => ({ id, label: id, src: `/game/sprites/v44/${id}.png`, width: 8, height: 12,
  pivot: [4, 11], bodyTopY: 1, nativeFacing: "right", sha256: "a".repeat(64), sourceArchive: "fixture.zip", sourceEntry: id + ".png" });
const fixture = { schemaVersion: 1, fighters: [
  { id: "user-animation-test", name: "Test hunter", sourceLabel: "User fixture", variants: [supplied("masked"), supplied("unmasked")] },
  { id: "user-other-test", name: "Other hunter", sourceLabel: "User fixture", variants: [supplied("other-masked")] },
], exclusions: [] };
const built = await build({ stdin: { contents: [
  "export * from './app/game/pitSpriteSheetAnimation';",
  "export * from './app/game/pitCombatBitmapArt';",
  "export * from './app/game/systems/pitCombat';",
  "export * from './app/pit-lab/pitLabProduction';",
].join("\n"), loader: "ts", resolveDir: process.cwd() }, plugins: [{ name: "animation-fixtures", setup(b) {
  b.onResolve({ filter: /pitUserHuntersV44\.json$/ }, () => ({ path: "roster", namespace: "fixture" }));
  b.onResolve({ filter: /pitSpriteSheetRegistry$/ }, () => ({ path: "registry", namespace: "fixture" }));
  b.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => path === "registry"
    ? { contents: "export const PIT_SPRITE_SHEET_REGISTRY = " + JSON.stringify([definition(), definition("jungle-hunter", null)]) + ";", loader: "js" }
    : { contents: JSON.stringify(fixture), loader: "json" });
} }], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const p = await import("data:text/javascript;base64," + Buffer.from(built.outputFiles[0].text).toString("base64"));

function definition(fighterId = "user-animation-test", variantId = "masked") {
  const id = `${fighterId}-${variantId ?? "legacy"}`;
  return { fighterId, ...(variantId ? { variantId } : {}), bodyHeightPx: 6,
    atlas: { schemaVersion: 1, id, characterId: fighterId, variantId: variantId ?? "legacy-authored",
      sourceKind: "authored-frames", status: "validated",
      pages: [{ id: "body", src: `/game/sprites/v45/${id}.png`, width: 16, height: 8, status: "validated", transparency: { mode: "alpha" } }],
      clips: [{ id: "idle", facing: "right", status: "validated", loop: true, ticksPerSecond: 60,
        frames: [0, 1].map(index => ({ pageId: "body", rect: [index * 8, 0, 8, 8], pivot: [4, 7], durationTicks: 2 })) }] } };
}
function browser(errorPaths = []) {
  const previous = { Image: globalThis.Image, document: globalThis.document }, requests = [];
  const rejected = new Set(errorPaths);
  globalThis.Image = class {
    set src(value) {
      this.source = value;
      if (!value) return;
      requests.push(value);
      [this.naturalWidth, this.naturalHeight] = value.includes("/v45/") ? [16, 8] : [8, 12];
      this.complete = true;
      queueMicrotask(() => rejected.has(value) ? this.onerror?.() : this.onload?.());
    }
    get src() { return this.source; }
  };
  globalThis.document = { createElement() {
    const canvas = { width: 0, height: 0, getContext() { return {
      clearRect() {}, drawImage() {}, putImageData(data) { canvas.processed = data.data.slice(); },
      getImageData() {
        const data = new Uint8ClampedArray(canvas.width * canvas.height * 4);
        for (let x = 3; x < canvas.width; x += 8) data.set([40 + x, 70, 90, 255], (3 * canvas.width + x) * 4);
        return { data };
      },
    }; } };
    return canvas;
  } };
  return { requests, restore() { Object.assign(globalThis, previous); } };
}
function context() {
  const calls = [];
  return { calls, globalAlpha: 1, save() {}, restore() {},
    translate(...args) { calls.push(["translate", ...args]); }, scale(...args) { calls.push(["scale", ...args]); },
    drawImage(...args) { calls.push(["drawImage", ...args]); } };
}
const create = () => p.createPitCombatState("user-animation-test", "user-other-test", { variants: ["masked", "other-masked"] });

test("variant loading decodes only the selected appearances and retains legacy atlases", async () => {
  const env = browser();
  try {
    const masked = definition(), unmasked = definition("user-animation-test", "unmasked");
    const legacy = definition("jungle-hunter", null), other = definition("user-other-test", "other-masked");
    const bank = await p.loadPitSpriteSheetAnimations(["user-animation-test", "jungle-hunter"],
      [masked, unmasked, legacy, other], { variants: ["masked", null] });
    assert.equal(bank.readyClipCount, 2);
    assert.deepEqual(new Set(env.requests), new Set([masked.atlas.pages[0].src, legacy.atlas.pages[0].src]));
    assert.ok(p.resolvePitSpriteSheetAnimation(bank, create().fighters[0]));
    assert.equal(p.resolvePitSpriteSheetAnimation(bank, { ...create().fighters[0], variantId: "unmasked" }), null);
    assert.ok(p.resolvePitSpriteSheetAnimation(bank, p.createPitCombatState().fighters[0]));
  } finally { env.restore(); }
});

test("a foreign owner or mismatched atlas appearance is rejected before requesting pixels", async () => {
  const env = browser();
  try {
    const wrongOwner = definition("user-other-test", "masked");
    const wrongAtlas = definition(); wrongAtlas.atlas.variantId = "unmasked";
    for (const entry of [wrongOwner, wrongAtlas]) {
      const bank = await p.loadPitSpriteSheetAnimations([entry.fighterId], [entry], { variants: [entry.variantId] });
      assert.equal(bank.readyClipCount, 0);
      assert.deepEqual(bank.failedAtlasIds, [entry.atlas.id]);
    }
    assert.deepEqual(env.requests, []);
  } finally { env.restore(); }
});

test("a covered variant animates real drawings; an uncovered action returns to its own original plate", async () => {
  const env = browser();
  try {
    const bank = await p.loadPitCombatBitmapArt(["user-animation-test", "user-other-test"],
      { variants: ["masked", "other-masked"], spriteSheetRegistry: [definition(), definition("user-animation-test", "unmasked")] });
    assert.equal(env.requests.length, 3, "one selected atlas and two selected static plates");
    assert.equal(env.requests.some(src => src.includes("unmasked")), false);
    const fighter = create().fighters[0];
    assert.equal(p.getPitCombatBitmapFighterArtStatus(bank, fighter, { simulationFrame: 20 }), "sprite-sheet-animation");
    assert.equal(p.resolvePitSpriteSheetAnimation(bank.spriteSheets, fighter, { simulationFrame: 22 }).resolved.frame.frameIndex, 1);
    const animated = context(); assert(p.drawPitCombatBitmapFighter(animated, bank, fighter, 400, { simulationFrame: 22 }));
    assert.equal(animated.calls.some(call => call[0] === "scale"), false, "authored animation is not mirrored");
    const walking = { ...fighter, velocityX: 4 };
    assert.equal(p.resolvePitSpriteSheetHold(bank.spriteSheets, walking), null);
    assert.equal(p.getPitCombatBitmapFighterArtStatus(bank, walking, { simulationFrame: 23 }), "static-bitmap");
    const fixed = context(); assert(p.drawPitCombatBitmapFighter(fixed, bank, walking, 400, { simulationFrame: 23 }));
    assert.equal(fixed.calls.find(call => call[0] === "drawImage")[1].src, "/game/sprites/v44/masked.png");
    assert.equal(p.drawPitCombatBitmapFighter(context(), bank, { ...fighter, variantId: "unmasked" }, 400), false);
  } finally { env.restore(); }
});

test("failed variant pages leave the correct static costume usable and never borrow historical art", async () => {
  const authored = definition(), env = browser([authored.atlas.pages[0].src]);
  try {
    const historical = structuredClone(authored); delete historical.variantId;
    historical.atlas.id = "historical"; historical.atlas.variantId = "legacy";
    historical.atlas.pages[0].src = "/game/sprites/v45/historical.png";
    const bank = await p.loadPitCombatBitmapArt(["user-animation-test"],
      { variants: ["masked"], spriteSheetRegistry: [authored, historical] });
    assert.deepEqual(bank.spriteSheets.failedAtlasIds, [authored.atlas.id]);
    assert.equal(env.requests.includes(historical.atlas.pages[0].src), false);
    const fighter = create().fighters[0];
    assert.equal(p.getPitCombatBitmapFighterArtStatus(bank, fighter), "static-bitmap");
    const ctx = context(); assert(p.drawPitCombatBitmapFighter(ctx, bank, fighter, 400));
    assert.equal(ctx.calls.find(call => call[0] === "drawImage")[1].src, "/game/sprites/v44/masked.png");
  } finally { env.restore(); }
});

test("camera envelope includes only the selected costume and independently drawn facing", () => {
  const owned = definition(), foreign = definition("user-animation-test", "unmasked");
  foreign.bodyHeightPx = .01;
  const fighter = create().fighters[0];
  const ownedBounds = p.getPitSpriteSheetAnimationVisualBounds(fighter, 400, [owned]);
  assert.deepEqual(p.getPitSpriteSheetAnimationVisualBounds(fighter, 400, [foreign, owned]), ownedBounds);
  assert.equal(p.getPitSpriteSheetAnimationVisualBounds({ ...fighter, facing: -1 }, 400, [owned]), null);
  const combined = p.getPitCombatBitmapVisualBounds(fighter, 400, [owned]);
  assert.ok(combined.x <= ownedBounds.x && combined.y <= ownedBounds.y);
  assert.ok(combined.x + combined.width >= ownedBounds.x + ownedBounds.width);
  assert.ok(combined.y + combined.height >= ownedBounds.y + ownedBounds.height);
});

test("appearance changes reset the observed animation clock even within one prepared bank", async () => {
  const env = browser();
  try {
    const bank = await p.loadPitSpriteSheetAnimations(["user-animation-test", "user-animation-test"],
      [definition(), definition("user-animation-test", "unmasked")], { variants: ["masked", "unmasked"] });
    const fighter = create().fighters[0], bare = { ...fighter, variantId: "unmasked" };
    assert.equal(p.resolvePitSpriteSheetAnimation(bank, fighter, { simulationFrame: 10 }).resolved.frame.frameIndex, 0);
    assert.equal(p.resolvePitSpriteSheetAnimation(bank, fighter, { simulationFrame: 12 }).resolved.frame.frameIndex, 1);
    assert.equal(p.resolvePitSpriteSheetAnimation(bank, bare, { simulationFrame: 12 }).resolved.frame.frameIndex, 0);
    assert.equal(p.resolvePitSpriteSheetAnimation(bank, bare, { simulationFrame: 14 }).resolved.frame.frameIndex, 1);
    assert.equal(p.resolvePitSpriteSheetAnimation(bank, fighter, { simulationFrame: 14 }).resolved.frame.frameIndex, 0);
  } finally { env.restore(); }
});
test("the production lab scopes metadata, coverage and isolated samples to the selected appearance", async () => {
  assert.deepEqual(p.getPitLabAppearances("user-animation-test").map(appearance => appearance.id), ["masked", "unmasked"]);
  assert.equal(p.getPitLabAppearances("jungle-hunter")[0].id, null);
  assert.equal(p.getPitLabSelectedVariant("user-animation-test"), "masked");
  assert.equal(p.getPitLabCoverage("user-animation-test", "masked").clips, 1);
  assert.equal(p.getPitLabCoverage("user-animation-test", "unmasked").clips, 0);
  assert.equal(p.getPitLabCoverage("user-animation-test", "unmasked").sourcePages, 0);
  assert.deepEqual(p.getPitLabDefinitions("user-animation-test", "unmasked"), []);
  assert.throws(() => p.getPitLabDefinitions("user-other-test", "masked"), /Apparence/);
  const entry = p.getPitLabDefinitions("user-animation-test", "masked")[0];
  const sample = p.createPitLabFrame("user-animation-test", entry.atlas.clips[0], 1, "masked");
  assert.equal(sample.fighter.variantId, "masked");
  const env = browser();
  try {
    const bank = await p.loadPitSpriteSheetAnimations(["user-animation-test"], [entry], { variants: ["masked"] });
    const baseline = p.createPitLabFrame("user-animation-test", entry.atlas.clips[0], 0, "masked");
    p.resolvePitSpriteSheetAnimation(bank, baseline.fighter, { simulationFrame: baseline.tick, combat: baseline.combat });
    assert.equal(p.resolvePitSpriteSheetAnimation(bank, sample.fighter, { simulationFrame: sample.tick, combat: sample.combat }).resolved.frame.frameIndex, 1);
  } finally { env.restore(); }
});