import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import {
  drawEnvironmentProp,
  environmentPropDrawPlan,
} from "../app/game/environmentPropDrawing.ts";

const close = (actual, expected, label = "values differ") => {
  assert.ok(Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * 1e-10, `${label}: ${actual} vs ${expected}`);
};
const bounds = { x: 120, y: 460, width: 1050, height: 36 };

function assertUniform(plan) {
  assert.ok(plan);
  for (const tile of plan.tiles) {
    close(tile.width / plan.source.width, tile.height / plan.source.height, "source pixels must not stretch");
    assert.ok([tile.x, tile.y, tile.width, tile.height].every(Number.isFinite));
    assert.ok(tile.width > 0 && tile.height > 0);
  }
}

function assertContinuous(plan, area) {
  assertUniform(plan);
  const right = area.x + area.width;
  close(plan.clip.x, area.x);
  close(plan.clip.width, area.width);
  close(plan.tiles[0].x, area.x);
  for (const [index, tile] of plan.tiles.entries()) {
    assert.ok(tile.x < right, "no entirely clipped tile after the right edge");
    assert.ok(tile.x + tile.width > area.x);
    close(tile.y + tile.height, area.y + area.height, "bottom anchor");
    if (index > 0) close(tile.x, plan.tiles[index - 1].x + plan.tiles[index - 1].width, "adjacent modules must touch");
  }
  const last = plan.tiles.at(-1);
  assert.ok(last.x + last.width >= right - 1e-8, "repeated span must reach the right edge");
}

test("volcano floors and long lava repeat without deformation or gaps in module bounds", () => {
  for (const [role, w, h] of [["surface", 768, 288], ["surface", 768, 336], ["hazard", 768, 204]]) {
    const area = { ...bounds, width: 2775 };
    const plan = environmentPropDrawPlan(w, h, role, area);
    assertContinuous(plan, area);
    assert.ok(plan.tiles.length > 1);
    assert.ok(plan.tiles.every(tile => tile.height <= 132));
    assert.deepEqual(plan.source, { x: 24, y: 24, width: w - 48, height: h - 48 });
  }
});

test("exact multiples do not create a redundant floor tile", () => {
  // Cropped source is 720×240, so a 48px-high module spans exactly144px.
  for (const count of [1, 2, 7, 30]) {
    const area = { ...bounds, width: 144 * count };
    const plan = environmentPropDrawPlan(768, 288, "surface", area);
    assertContinuous(plan, area);
    assert.equal(plan.tiles.length, count);
  }
});

test("upright steam and square heat emitters remain small, centred and evenly spaced", () => {
  for (const [w, h] of [[539, 768], [768, 757]]) {
    for (const width of [24, 360, 361, 1050]) {
      const area = { ...bounds, width };
      const plan = environmentPropDrawPlan(w, h, "hazard", area);
      assertUniform(plan);
      assert.equal(plan.tiles.length, Math.ceil(width / 360));
      const cell = width / plan.tiles.length;
      for (const [index, tile] of plan.tiles.entries()) {
        assert.ok(tile.height <= 132);
        assert.ok(tile.x >= area.x - 1e-8 && tile.x + tile.width <= area.x + width + 1e-8);
        close(tile.x + tile.width / 2, area.x + (index + 0.5) * cell);
        close(tile.y + tile.height, area.y + area.height);
      }
      assert.ok(cell <= 360);
    }
  }
});

test("standing and fallen covers fit uniformly and keep their foot at the collider bottom", () => {
  const area = { x: 280, y: 290, width: 118, height: 202 };
  for (const [w, h] of [[768, 667], [330, 768], [768, 240]]) {
    const plan = environmentPropDrawPlan(w, h, "cover", area);
    assertUniform(plan);
    assert.equal(plan.tiles.length, 1);
    const [tile] = plan.tiles;
    assert.ok(tile.width <= area.width * 1.5 + 1e-8);
    assert.ok(tile.height <= area.height * 1.18 + 1e-8);
    close(tile.x + tile.width / 2, area.x + area.width / 2);
    close(tile.y + tile.height, area.y + area.height);
  }
});

test("platforms preserve their top alignment and climbables their full vertical reach", () => {
  const platform = environmentPropDrawPlan(768, 300, "platform", bounds);
  assertUniform(platform);
  assert.deepEqual(platform.source, { x: 24, y: 24, width: 720, height: 252 });
  close(platform.clip.width, bounds.width * 1.06);
  close(platform.clip.x, bounds.x - bounds.width * 0.03);
  close(platform.tiles[0].x, platform.clip.x);
  close(platform.tiles[0].y, bounds.y - 4);
  assert.ok(platform.tiles.every(tile => tile.height <= 144));
  assert.ok(platform.tiles.at(-1).x + platform.tiles.at(-1).width >= platform.clip.x + platform.clip.width);
  const ladder = environmentPropDrawPlan(160, 768, "climbable", bounds);
  assertUniform(ladder);
  assert.deepEqual(ladder.source, { x: 24, y: 24, width: 112, height: 720 });
  close(ladder.tiles[0].width, bounds.height * 112 / 720);
  close(ladder.tiles[0].x, bounds.x + (bounds.width - bounds.height * 112 / 720) / 2);
  close(ladder.tiles[0].y, bounds.y);
  close(ladder.tiles[0].height, bounds.height);
});

test("proportions hold across aspect ratios and geometry sizes for every role", () => {
  for (const role of ["cover", "surface", "hazard", "platform", "climbable", "decoration"]) {
    for (const [w, h] of [[768, 288], [539, 768], [768, 757], [768, 768], [320, 768]]) {
      for (const width of [11, 37, 170, 600, 3000]) {
        for (const height of [6, 38, 132, 500]) {
          const area = { x: -70, y: 380, width, height };
          const plan = environmentPropDrawPlan(w, h, role, area);
          assertUniform(plan);
          if (role === "surface") assertContinuous(plan, area);
        }
      }
    }
  }
});

test("unloaded, nonfinite or unbounded geometry cannot issue drawing work", () => {
  for (const [w, h] of [[0, 0], [48, 100], [100, 48], [NaN, 768], [Infinity, 300]]) {
    assert.equal(environmentPropDrawPlan(w, h, "surface", bounds), null);
  }
  for (const invalid of [{ width: 0 }, { height: -1 }, { x: NaN }, { y: Infinity }, { width: Infinity }]) {
    assert.equal(environmentPropDrawPlan(768, 288, "surface", { ...bounds, ...invalid }), null);
  }
  assert.equal(environmentPropDrawPlan(49, 768, "surface", { ...bounds, width: 1e10 }), null);
});

test("canvas crops only known padding, clips repeated spans, and restores render state", () => {
  const image = { naturalWidth: 768, naturalHeight: 288 };
  const events = [];
  const context = {
    globalAlpha: 0.7,
    imageSmoothingEnabled: true,
    save() { this.saved = [this.globalAlpha, this.imageSmoothingEnabled]; events.push("save"); },
    beginPath() { events.push("beginPath"); },
    rect(...args) { events.push(["rect", ...args]); },
    clip() { events.push("clip"); },
    drawImage(...args) { events.push(["draw", ...args]); assert.equal(this.globalAlpha, 0.76); assert.equal(this.imageSmoothingEnabled, false); },
    restore() { [this.globalAlpha, this.imageSmoothingEnabled] = this.saved; events.push("restore"); },
  };
  drawEnvironmentProp(context, image, "surface", bounds, 0.76);
  const draws = events.filter(event => Array.isArray(event) && event[0] === "draw");
  assert.ok(draws.length > 1);
  assert.ok(events.indexOf("clip") < events.findIndex(event => Array.isArray(event) && event[0] === "draw"));
  for (const draw of draws) {
    assert.equal(draw.length, 10);
    assert.equal(draw[1], image);
    assert.deepEqual(draw.slice(2, 6), [24, 24, 720, 240]);
    close(draw[8] / 720, draw[9] / 240);
  }
  assert.equal(context.globalAlpha, 0.7);
  assert.equal(context.imageSmoothingEnabled, true);
  assert.equal(events.at(-1), "restore");
  const before = events.length;
  drawEnvironmentProp(context, image, "surface", bounds, NaN);
  drawEnvironmentProp(context, { naturalWidth: 0, naturalHeight: 0 }, "surface", bounds);
  assert.equal(events.length, before);
});

test("real V19 platform and climbable painted bounds meet collision sockets without transparent offsets", async () => {
  const cases = [
    ["platform", "jungle/plt/plt-expedition-deck-01-low-wide.webp", { x: 400, y: 310, width: 1000, height: 28 }],
    ["climbable", "jungle/clm/clm-field-ladder-01-straight.webp", { x: 240, y: 100, width: 50, height: 500 }],
  ];
  for (const [role, relativePath, area] of cases) {
    const imagePath = fileURLToPath(new URL("../public/game/assets/v19/biome-decor/" + relativePath, import.meta.url));
    const { data, info } = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const plan = environmentPropDrawPlan(info.width, info.height, role, area);
    assertUniform(plan);
    let top = info.height;
    let bottom = -1;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] <= 16) continue;
      assert.ok(x >= 24 && x < info.width - 24 && y >= 24 && y < info.height - 24, "draw crop preserves all visible source pixels");
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
    const tile = plan.tiles[0];
    const scale = tile.height / plan.source.height;
    const paintedTop = tile.y + (top - plan.source.y) * scale;
    const expectedTop = role === "platform" ? area.y - 4 : area.y;
    assert.ok(Math.abs(paintedTop - expectedTop) <= scale, "no padding-sized air gap above painted platform or climb");
    if (role === "climbable") {
      const paintedBottom = tile.y + (bottom + 1 - plan.source.y) * scale;
      assert.ok(Math.abs(paintedBottom - area.y - area.height) <= scale, "the painted ladder reaches both collision endpoints");
    }
  }
});


test("the real narrow ruin platform repeats within the ledge instead of becoming a world-height pillar", async () => {
  const imagePath = fileURLToPath(new URL("../public/game/assets/v19/biome-decor/jungle/plt/plt-mossy-ruin-slab-02-high-narrow.webp", import.meta.url));
  const meta = await sharp(imagePath).metadata();
  const area = { x: 2500, y: 382, width: 450, height: 24 };
  const plan = environmentPropDrawPlan(meta.width, meta.height, "platform", area);
  assertUniform(plan);
  assert.ok(plan.tiles.length > 1, "a tall silhouette is tiled across a wide ledge");
  assert.ok(plan.tiles.every(tile => tile.height <= 96 && tile.y === area.y - 4));
  assert.equal(plan.clip.width, 477);
  assert.equal(plan.clip.x, area.x - 13.5);
  for (let i = 1; i < plan.tiles.length; i++) close(plan.tiles[i].x, plan.tiles[i - 1].x + plan.tiles[i - 1].width);
  const final = plan.tiles.at(-1);
  assert.ok(final.x < plan.clip.x + plan.clip.width);
  assert.ok(final.x + final.width >= plan.clip.x + plan.clip.width);
});
