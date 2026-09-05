import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import type {
  HunterSpriteAtlas, HunterSpriteAtlasPage, HunterSpriteAtlasRequirement,
  HunterSpriteAtlasPreparedPage, HunterSpriteFacing,
} from "../app/game/hunterSpriteAtlas";

const bundle = await build({
  entryPoints: [fileURLToPath(new URL("../app/game/hunterSpriteAtlas.ts", import.meta.url))],
  bundle: true, format: "esm", platform: "node", target: "es2022", write: false,
});
const api = await import("data:text/javascript;base64," +
  Buffer.from(bundle.outputFiles[0].text).toString("base64")) as typeof import("../app/game/hunterSpriteAtlas");

function draft(): HunterSpriteAtlas {
  return api.createHunterLocomotionDefenseAtlas({
    id: "jungle-test-right", characterId: "jungle-hunter", variantId: "1987-masked",
    facing: "right", src: "/test-only/right.png", width: 64, height: 64,
    durationTicks: 6, pivot: [4, 7],
  });
}
function review(atlas: HunterSpriteAtlas = draft()): HunterSpriteAtlas {
  return { ...atlas, status: "validated",
    pages: atlas.pages.map(page => ({ ...page, status: "validated" })),
    clips: atlas.clips.map(clip => ({ ...clip, status: "validated" })) };
}
function requirement(facing: HunterSpriteFacing = "right", minimumDistinctFrames = 8): HunterSpriteAtlasRequirement {
  return { characterId: "jungle-hunter", variantId: "1987-masked",
    clipId: "idle", facing, minimumDistinctFrames };
}
function fixture(page: HunterSpriteAtlasPage, duplicatePixels = false) {
  const sourcePixels = new Uint8ClampedArray(page.width * page.height * 4);
  if (page.transparency.mode === "color-key") {
    for (let offset = 0; offset < sourcePixels.length; offset += 4) {
      sourcePixels.set([...page.transparency.rgb, 255], offset);
    }
  }
  const columns = page.grid?.columns ?? 8;
  const rows = page.grid?.rows ?? 8;
  const cellWidth = page.width / columns;
  const cellHeight = page.height / rows;
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const x = column * cellWidth + 2;
    const y = row * cellHeight + 2;
    sourcePixels.set([duplicatePixels ? 40 : 20 + row * columns + column, 90, 60, 255],
      (y * page.width + x) * 4);
  }
  let outputPixels: Uint8ClampedArray | null = null;
  let readSource: unknown;
  const canvas = { width: 0, height: 0, getContext: () => ({
    clearRect() {},
    drawImage(image: unknown) { readSource = image; },
    getImageData: () => ({ data: new Uint8ClampedArray(sourcePixels), width: page.width, height: page.height }),
    putImageData(data: ImageData) { outputPixels = new Uint8ClampedArray(data.data); },
  }) } as unknown as HTMLCanvasElement;
  const image = { naturalWidth: page.width, naturalHeight: page.height, complete: true } as HTMLImageElement;
  return { image, canvas, sourcePixels, createCanvas: () => canvas,
    output: () => outputPixels, readSource: () => readSource };
}
function prepare(atlas: HunterSpriteAtlas, duplicatePixels = false): HunterSpriteAtlasPreparedPage {
  const sample = fixture(atlas.pages[0], duplicatePixels);
  const page = api.prepareHunterSpriteAtlasPage(atlas, atlas.pages[0].id, sample.image, sample.createCanvas);
  assert.ok(page);
  return page;
}
const neverDraw = new Proxy({} as CanvasRenderingContext2D, {
  get() { throw new Error("Invalid or unprepared assets must not touch the drawing context."); },
});

test("eight by eight import is a draft with exact observed dimensions and row names", () => {
  const atlas = draft();
  assert.equal(api.validateHunterSpriteAtlas(atlas).valid, true);
  assert.equal(atlas.status, "draft");
  assert.deepEqual(atlas.clips.map(clip => clip.id), [
    "idle", "walk", "run", "crouch-transition", "jump", "high-guard", "low-guard", "backstep",
  ]);
  assert.equal(atlas.clips.every(clip => clip.frames.length === 8 && clip.facing === "right" && clip.status === "draft"), true);
  assert.deepEqual(atlas.clips[7].frames[7].rect, [56, 56, 8, 8]);
  assert.throws(() => api.createHunterLocomotionDefenseAtlas({
    id: "bad", characterId: "jungle", variantId: "test", facing: "right", src: "/bad.png",
    width: 1254, height: 1254,
  }), RangeError);
});

test("four by two RGB color-key clip imports without pretending its source has alpha", () => {
  const atlas = api.createHunterSpriteGridAtlas({
    id: "clip", characterId: "jungle", variantId: "test", facing: "left", src: "/opaque.png",
    width: 32, height: 16, columns: 4, rows: 2,
    transparency: { mode: "color-key", rgb: [255, 0, 255], tolerance: 12 },
    clips: [{ id: "idle", startCell: 0, frameCount: 8, loop: true, durationTicks: 6 }],
  });
  assert.equal(atlas.status, "draft");
  assert.deepEqual(atlas.clips[0].frames[7].rect, [24, 8, 8, 8]);
  assert.equal(atlas.pages[0].transparency.mode, "color-key");
  assert.throws(() => api.createHunterSpriteGridAtlas({
    id: "bad", characterId: "jungle", variantId: "test", facing: "right", src: "/bad.png",
    width: 32, height: 16, columns: 4, rows: 2, transparency: { mode: "alpha" },
    clips: [{ id: "idle", startCell: 1, frameCount: 8, loop: true, durationTicks: 6 }],
  }), RangeError);
});

test("frame intervals are half-open, loops wrap exactly, and one-shots hold the last cell", () => {
  const atlas = review();
  for (const [tick, expected] of [[0, 0], [5.999, 0], [6, 1], [47.999, 7], [48, 0], [96, 0]]) {
    assert.equal(api.resolveHunterSpriteAtlasFrame(atlas, "idle", "right", tick)?.frameIndex, expected);
  }
  assert.equal(api.resolveHunterSpriteAtlasFrame(atlas, "jump", "right", 48)?.frameIndex, 7);
  assert.equal(api.resolveHunterSpriteAtlasFrame(atlas, "jump", "right", 10000)?.frameIndex, 7);
  for (const tick of [-1, NaN, Infinity, -Infinity]) {
    assert.equal(api.resolveHunterSpriteAtlasFrame(atlas, "idle", "right", tick), null);
  }
});

test("no opposite-facing lookup, guessed clip or automatic mirror exists", () => {
  const atlas = review();
  assert.equal(api.resolveHunterSpriteAtlasFrame(atlas, "idle", "left", 0), null);
  assert.equal(api.resolveHunterSpriteAtlasFrame(atlas, "unknown", "right", 0), null);
  const coverage = api.countHunterSpriteAtlasCoverage([atlas], [requirement("left")], [prepare(atlas)]);
  assert.equal(coverage.entries[0].missingReason, "missing-orientation");
  assert.equal(coverage.coveredCount, 0);
});

test("atlas, page and clip approvals are each required and a later unreviewed page rejects the whole clip", () => {
  const atlas = review();
  const unvalidated: HunterSpriteAtlas[] = [
    draft(), { ...atlas, status: "rejected" },
    { ...atlas, pages: [{ ...atlas.pages[0], status: "draft" }] },
    { ...atlas, clips: [{ ...atlas.clips[0], status: "rejected" }] },
    { ...atlas, pages: [...atlas.pages, { ...atlas.pages[0], id: "later", status: "draft" }],
      clips: [{ ...atlas.clips[0], frames: [...atlas.clips[0].frames,
        { ...atlas.clips[0].frames[0], pageId: "later" }] }] },
  ];
  for (const candidate of unvalidated) {
    assert.equal(api.resolveHunterSpriteAtlasFrame(candidate, "idle", "right", 0), null);
    assert.equal(api.drawHunterSpriteAtlasFrame(neverDraw, candidate, [], {
      clipId: "idle", facing: "right", elapsedTicks: 0, x: 0, y: 0,
    }), null);
  }
});

test("malformed JSON, page grids, frame bounds, durations and pivots fail validation", () => {
  const atlas = review();
  const page = atlas.pages[0];
  const clip = atlas.clips[0];
  const frame = clip.frames[0];
  const badFrame = (patch: object) => ({ ...atlas, clips: [{ ...clip, frames: [{ ...frame, ...patch }] }] });
  const candidates: unknown[] = [
    null, {}, { ...atlas, schemaVersion: 2 }, { ...atlas, sourceKind: "rig" },
    { ...atlas, pages: [{ ...page, width: 65 }] },
    { ...atlas, pages: [{ ...page, grid: { rows: 8, columns: 0 } }] },
    { ...atlas, pages: [page, page] }, { ...atlas, clips: [clip, clip] },
    badFrame({ pageId: "missing" }), badFrame({ rect: [64, 0, 8, 8] }),
    badFrame({ rect: [1, 0, 8, 8] }), badFrame({ rect: [0, 0, 16, 8] }),
    badFrame({ rect: [-1, 0, 8, 8] }), badFrame({ durationTicks: 0 }),
    badFrame({ durationTicks: 0.5 }), badFrame({ pivot: [NaN, 0] }),
    { ...atlas, pages: [{ ...page, transparency: { mode: "color-key", rgb: [255, 0, 255], tolerance: 255 } }] },
  ];
  for (const candidate of candidates) assert.equal(api.validateHunterSpriteAtlas(candidate).valid, false);
  // Packed/free rectangles need not fit a regular grid.
  const free = { ...atlas, pages: [{ ...page, grid: undefined }],
    clips: [{ ...clip, frames: [{ ...frame, rect: [1, 1, 6, 6] as const }] }] };
  assert.equal(api.validateHunterSpriteAtlas(free).valid, true);
});

test("decoded dimensions, image readiness, alpha borders and visible cell content are enforced", () => {
  const atlas = review();
  const sample = fixture(atlas.pages[0]);
  assert.equal(api.prepareHunterSpriteAtlasPage(atlas, atlas.pages[0].id,
    { ...sample.image, naturalWidth: 63 } as HTMLImageElement, sample.createCanvas), null);
  assert.equal(api.prepareHunterSpriteAtlasPage(atlas, atlas.pages[0].id,
    { ...sample.image, complete: false } as HTMLImageElement, sample.createCanvas), null);
  sample.sourcePixels[3] = 255;
  assert.equal(api.prepareHunterSpriteAtlasPage(atlas, atlas.pages[0].id, sample.image, sample.createCanvas), null);
  sample.sourcePixels.fill(0);
  assert.equal(api.prepareHunterSpriteAtlasPage(atlas, atlas.pages[0].id, sample.image, sample.createCanvas), null);
  sample.sourcePixels.fill(255);
  assert.equal(api.prepareHunterSpriteAtlasPage(atlas, atlas.pages[0].id, sample.image, sample.createCanvas), null);
});

test("tainted canvas readback and unavailable SSR canvas fail closed", () => {
  const atlas = review();
  const sample = fixture(atlas.pages[0]);
  assert.equal(api.prepareHunterSpriteAtlasPage(atlas, atlas.pages[0].id, sample.image,
    () => { throw new Error("SecurityError"); }), null);
  assert.equal(api.prepareHunterSpriteAtlasPage(atlas, atlas.pages[0].id, sample.image), null);
});

test("color-key removes only colors inside the explicit tolerance in private memory", () => {
  const atlas = review({ ...draft(), pages: [{ ...draft().pages[0],
    transparency: { mode: "color-key", rgb: [255, 0, 255], tolerance: 12 } }] });
  const sample = fixture(atlas.pages[0]);
  // Near-magenta border is removable; a color outside tolerance inside the cell survives.
  sample.sourcePixels.set([245, 10, 245, 255], 0);
  sample.sourcePixels.set([242, 0, 255, 255], (3 * 64 + 3) * 4);
  const before = new Uint8ClampedArray(sample.sourcePixels);
  assert.ok(api.prepareHunterSpriteAtlasPage(atlas, atlas.pages[0].id, sample.image, sample.createCanvas));
  const output = sample.output();
  assert.ok(output);
  assert.equal(output[3], 0);
  assert.equal(output[(3 * 64 + 3) * 4 + 3], 255);
  assert.deepEqual(sample.sourcePixels, before, "source pixels/file are not edited");
  assert.equal(sample.readSource(), sample.image);
});

test("a baked checkerboard is rejected even when color-key is explicitly selected", () => {
  const atlas = review({ ...draft(), pages: [{ ...draft().pages[0],
    transparency: { mode: "color-key", rgb: [255, 0, 255], tolerance: 12 } }] });
  const sample = fixture(atlas.pages[0]);
  sample.sourcePixels.set([160, 160, 160, 255], 0);
  assert.equal(api.prepareHunterSpriteAtlasPage(atlas, atlas.pages[0].id, sample.image, sample.createCanvas), null);
});

test("draw requires authentic readback evidence, uses one exact cell and preserves context state", () => {
  const atlas = review();
  const prepared = prepare(atlas);
  const calls: unknown[][] = [];
  const context = {
    globalAlpha: 0.2, globalCompositeOperation: "multiply", filter: "blur(2px)",
    save() { calls.push(["save"]); },
    restore() { calls.push(["restore"]); },
    drawImage(this: { globalAlpha: number; globalCompositeOperation: string; filter: string }, ...args: unknown[]) {
      assert.equal(this.globalAlpha, 1);
      assert.equal(this.globalCompositeOperation, "source-over");
      assert.equal(this.filter, "none");
      calls.push(["draw", ...args]);
    },
  } as unknown as CanvasRenderingContext2D;
  const request = { clipId: "idle", facing: "right" as const, elapsedTicks: 6, x: 20, y: 30, scale: 2 };
  assert.equal(api.drawHunterSpriteAtlasFrame(neverDraw, atlas, [], request), null);
  assert.equal(api.drawHunterSpriteAtlasFrame(neverDraw, atlas, [{ ...prepared }], request), null);
  assert.equal(api.drawHunterSpriteAtlasFrame(neverDraw, atlas, [prepared], { ...request, scale: -1 }), null);
  assert.equal(api.drawHunterSpriteAtlasFrame(context, atlas, [prepared], request)?.frameIndex, 1);
  assert.deepEqual(calls.map(call => call[0]), ["save", "draw", "restore"]);
  assert.deepEqual(calls[1].slice(2), [8, 0, 8, 8, 12, 16, 16, 16]);
  const changedSource = { ...atlas, pages: [{ ...atlas.pages[0], src: "/other.png" }] };
  assert.equal(api.drawHunterSpriteAtlasFrame(neverDraw, changedSource, [prepared], request), null);
});

test("coverage never counts drafts, unprepared metadata, duplicated cells or identical decoded drawings as eight poses", () => {
  const atlas = review();
  assert.equal(api.countHunterSpriteAtlasCoverage([draft()], [requirement()]).coveredCount, 0);
  const metadata = api.countHunterSpriteAtlasCoverage([atlas], [requirement()]);
  assert.equal(metadata.entries[0].missingReason, "unprepared-page");
  const duplicatedPixels = api.countHunterSpriteAtlasCoverage([atlas], [requirement()], [prepare(atlas, true)]);
  assert.equal(duplicatedPixels.entries[0].distinctFrames, 1);
  assert.equal(duplicatedPixels.entries[0].missingReason, "insufficient-distinct-frames");
  const repeated = { ...atlas, clips: [{ ...atlas.clips[0],
    frames: Array.from({ length: 8 }, () => atlas.clips[0].frames[0]) }] };
  assert.equal(api.countHunterSpriteAtlasCoverage([repeated], [requirement()], [prepare(repeated)]).entries[0].distinctFrames, 1);
  const actual = api.countHunterSpriteAtlasCoverage([atlas], [requirement(), requirement("left")], [prepare(atlas)]);
  assert.equal(actual.scope, "supplied-requirements-only");
  assert.equal(actual.requiredCount, 2);
  assert.equal(actual.coveredCount, 1);
  assert.equal(actual.missingCount, 1);
  assert.equal(actual.entries[0].distinctFrames, 8);
});

test("lookup and coverage do not mutate even a deeply frozen manifest", () => {
  const atlas = review();
  const serialized = JSON.stringify(atlas);
  const freeze = (value: unknown): void => {
    if (value && typeof value === "object") {
      for (const entry of Object.values(value)) freeze(entry);
      Object.freeze(value);
    }
  };
  freeze(atlas);
  for (let tick = 0; tick < 100; tick++) {
    assert.deepEqual(api.resolveHunterSpriteAtlasFrame(atlas, "idle", "right", tick),
      api.resolveHunterSpriteAtlasFrame(atlas, "idle", "right", tick));
  }
  api.countHunterSpriteAtlasCoverage([atlas], [requirement()]);
  assert.equal(JSON.stringify(atlas), serialized);
});


const fringeConfig = {
  mode: "color-key", rgb: [255, 0, 255], tolerance: 48,
  fringe: { mode: "connected-magenta", radius: 2, minExcess: 24, strength: 1 },
} as const;
function pixelFixture(width = 16, height = 16) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) pixels.set([255, 0, 255, 255], i);
  const set = (x: number, y: number, rgba: readonly number[]) => pixels.set(rgba, (y * width + x) * 4);
  const get = (data: Uint8ClampedArray, x: number, y: number) => [...data.slice((y * width + x) * 4, (y * width + x + 1) * 4)];
  return { width, height, pixels, set, get };
}

test("optional fringe despill is bounded, non-destructive and preserves thin opaque dreads", () => {
  const sample = pixelFixture();
  for (let y = 3; y <= 12; y++) for (let x = 3; x <= 12; x++) sample.set(x, y, [30, 55, 40, 255]);
  // Actual Wolf fringe colors on two directly connected rows.
  for (let x = 5; x <= 10; x++) {
    sample.set(x, 3, [195, 10, 176, 255]);
    sample.set(x, 4, [143, 14, 125, 255]);
    sample.set(x, 5, [171, 24, 153, 255]);
  }
  sample.set(8, 8, [150, 20, 180, 255]); // Intentional interior purple.
  for (let y = 3; y <= 12; y++) sample.set(1, y, [20, 15, 17, 255]); // One-pixel dread.
  const before = new Uint8ClampedArray(sample.pixels);
  const result = api.processHunterSpriteTransparency(sample.pixels, sample.width, sample.height, fringeConfig);
  assert.deepEqual(sample.pixels, before);
  assert.deepEqual(sample.get(result.pixels, 8, 3), [29, 10, 10, 255]);
  assert.deepEqual(sample.get(result.pixels, 8, 4), [32, 14, 14, 255]);
  assert.deepEqual(sample.get(result.pixels, 8, 5), [171, 24, 153, 255], "third contaminated row is outside radius two");
  assert.deepEqual(sample.get(result.pixels, 8, 8), [150, 20, 180, 255]);
  for (let y = 3; y <= 12; y++) assert.deepEqual(sample.get(result.pixels, 1, y), [20, 15, 17, 255]);
  assert.ok(result.fringePixels > 0);
  for (let i = 0; i < before.length; i += 4) {
    if (!(before[i] >= 207 && before[i + 1] <= 48 && before[i + 2] >= 207)) {
      assert.equal(result.pixels[i + 3], before[i + 3], "despill never erodes alpha outside the reserved key");
    }
  }
});

test("enclosed key islands cannot seed interior despill and diagonals cannot bypass a thin contour", () => {
  const sample = pixelFixture(7, 7);
  for (let y = 1; y < 6; y++) for (let x = 1; x < 6; x++) sample.set(x, y, [30, 55, 40, 255]);
  sample.set(3, 3, [255, 0, 255, 255]); // Base key policy still applies to reserved magenta.
  sample.set(3, 4, [150, 20, 180, 255]);
  const result = api.processHunterSpriteTransparency(sample.pixels, 7, 7, fringeConfig);
  assert.equal(sample.get(result.pixels, 3, 3)[3], 0);
  assert.deepEqual(sample.get(result.pixels, 3, 4), [150, 20, 180, 255]);
  const diagonal = pixelFixture(3, 3);
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) diagonal.set(x, y, [30, 55, 40, 255]);
  diagonal.set(0, 0, [255, 0, 255, 255]);
  diagonal.set(1, 1, [150, 20, 180, 255]);
  const untouched = api.processHunterSpriteTransparency(diagonal.pixels, 3, 3, fringeConfig);
  assert.deepEqual(diagonal.get(untouched.pixels, 1, 1), [150, 20, 180, 255]);
  assert.equal(untouched.fringePixels, 0);
});

test("legacy color-key and alpha mode remain unchanged unless explicit bounded fringe is requested", () => {
  const sample = pixelFixture(3, 3);
  sample.set(1, 1, [195, 10, 176, 128]);
  const original = new Uint8ClampedArray(sample.pixels);
  const legacy = api.processHunterSpriteTransparency(sample.pixels, 3, 3, {
    mode: "color-key", rgb: [255, 0, 255], tolerance: 48,
  });
  assert.deepEqual(sample.get(legacy.pixels, 1, 1), [195, 10, 176, 128]);
  assert.equal(legacy.fringePixels, 0);
  const half = api.processHunterSpriteTransparency(sample.pixels, 3, 3, {
    ...fringeConfig, fringe: { ...fringeConfig.fringe, strength: 0.5 },
  });
  assert.deepEqual(sample.get(half.pixels, 1, 1), [112, 10, 93, 128]);
  const alpha = api.processHunterSpriteTransparency(sample.pixels, 3, 3, { mode: "alpha" });
  assert.deepEqual(alpha.pixels, original);
  assert.notEqual(alpha.pixels, sample.pixels);
});

test("invalid or broad fringe configurations fail validation and never approve a draft", () => {
  const reviewed = review();
  for (const bad of [
    { ...fringeConfig, fringe: { ...fringeConfig.fringe, radius: 4 } },
    { ...fringeConfig, fringe: { ...fringeConfig.fringe, minExcess: 0 } },
    { ...fringeConfig, fringe: { ...fringeConfig.fringe, strength: 2 } },
    { ...fringeConfig, rgb: [0, 255, 0] },
  ]) {
    const invalid = { ...reviewed, pages: [{ ...reviewed.pages[0], transparency: bad }] };
    assert.equal(api.validateHunterSpriteAtlas(invalid).valid, false);
    assert.throws(() => api.processHunterSpriteTransparency(new Uint8ClampedArray(16), 2, 2,
      bad as unknown as Parameters<typeof api.processHunterSpriteTransparency>[3]), RangeError);
  }
  assert.throws(() => api.processHunterSpriteTransparency(new Uint8ClampedArray(15), 2, 2, fringeConfig), RangeError);
  const unreviewed = { ...draft(), pages: [{ ...draft().pages[0], transparency: fringeConfig }] };
  const sample = fixture(unreviewed.pages[0]);
  assert.equal(api.prepareHunterSpriteAtlasPage(unreviewed, unreviewed.pages[0].id, sample.image, sample.createCanvas), null);
  assert.equal(api.countHunterSpriteAtlasCoverage([unreviewed], [requirement()]).coveredCount, 0);
});

test("real V26 Wolf/Feral fringe improves in memory while original pixels and all non-key alpha are preserved", async () => {
  for (const name of ["wolf-high-guard", "feral-shield-guard"]) {
    const path = new URL("../art-source/v26/known-yautja/sources/" + name + ".png", import.meta.url);
    const source = await readFile(path);
    const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const pixels = new Uint8ClampedArray(data);
    const original = new Uint8ClampedArray(pixels);
    const result = api.processHunterSpriteTransparency(pixels, info.width, info.height, fringeConfig);
    assert.ok(result.fringePixels > 1000, name + " must exercise real contaminated edges");
    let changed = 0;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      if (result.pixels[offset] !== original[offset] || result.pixels[offset + 2] !== original[offset + 2]) {
        changed++;
        assert.ok(result.pixels[offset] <= original[offset]);
        assert.ok(result.pixels[offset + 2] <= original[offset + 2]);
        assert.equal(result.pixels[offset + 1], original[offset + 1]);
        assert.equal(result.pixels[offset + 3], original[offset + 3], "color-corrected thin contours retain coverage");
      }
      if (!(original[offset] >= 207 && original[offset + 1] <= 48 && original[offset + 2] >= 207)) {
        assert.equal(result.pixels[offset + 3], original[offset + 3]);
      }
    }
    assert.equal(changed, result.fringePixels);
    assert.deepEqual(pixels, original);
    assert.deepEqual(await readFile(path), source, "PNG source remains byte-for-byte intact");
  }
});
