import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import sharp from "sharp";

async function loadSystem(relativePath: string) {
  const bundle = await build({ entryPoints: [fileURLToPath(new URL(relativePath, import.meta.url))],
    bundle: true, format: "esm", platform: "node", target: "es2022", write: false });
  return import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
}
const [city, v21, v22] = await Promise.all([
  loadSystem("../app/game/systems/homeworldCity.ts"), loadSystem("../app/game/shipInteriorKit.ts"),
  loadSystem("../app/game/shipInteriorV22.ts"),
]) as [typeof import("../app/game/systems/homeworldCity"), typeof import("../app/game/shipInteriorKit"),
  typeof import("../app/game/shipInteriorV22")];
const artwork = [v21.SHIP_LEVEL_ART.navigationConsole, v21.SHIP_LEVEL_ART.foregroundRib, ...Object.values(v22.SHIP_LEVEL_ART_V22)];

function close(actual: number, expected: number, label: string): void {
  assert.ok(Math.abs(actual - expected) < 1e-8, `${label}: ${actual} != ${expected}`);
}

test("all eleven city props anchor their actual painted alpha center and bottom, without stretching or cropping", async () => {
  assert.equal(city.HOMEWORLD_PROPS.length, 11);
  const measured = new Map<string, { x: number; y: number; width: number; height: number; sourceWidth: number; sourceHeight: number }>();
  for (const prop of city.HOMEWORLD_PROPS) {
    const art = artwork.find(candidate => candidate.src === prop.asset);
    assert.ok(art, `${prop.id} requires registered transparent bounds`);
    let pixels = measured.get(prop.asset);
    if (!pixels) {
      const source = fileURLToPath(new URL("../public" + prop.asset, import.meta.url));
      const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.equal(info.width, art.sourceWidth);
      assert.equal(info.height, art.sourceHeight);
      let minX: number = info.width;
      let minY: number = info.height;
      let maxX = -1, maxY = -1;
      for (let y = 0; y < info.height; y += 1) {
        for (let x = 0; x < info.width; x += 1) {
          // Same threshold as the published V21/V22 asset audits.
          if (data[(y * info.width + x) * info.channels + 3] <= 8) continue;
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
      }
      assert.ok(maxX >= minX && maxY >= minY, `${prop.id}: empty art`);
      pixels = { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, sourceWidth: info.width, sourceHeight: info.height };
      measured.set(prop.asset, pixels);
      assert.deepEqual({ x: pixels.x, y: pixels.y, width: pixels.width, height: pixels.height }, art.alphaBounds);
    }
    const placement = city.homeworldPropArtPlacement(prop);
    const scaleX = placement.width / pixels.sourceWidth;
    const scaleY = placement.height / pixels.sourceHeight;
    close(scaleX, scaleY, `${prop.id} preserves source aspect`);
    close(placement.left + (pixels.x + pixels.width / 2) * scaleX, prop.x, `${prop.id} painted center`);
    close(placement.top + (pixels.y + pixels.height) * scaleY, prop.y, `${prop.id} painted bottom`);
    assert.ok(pixels.width * scaleX <= prop.width + 1e-8, `${prop.id} fits width`);
    assert.ok(pixels.height * scaleY <= prop.height + 1e-8, `${prop.id} fits height`);
    assert.ok(placement.width >= pixels.width * scaleX && placement.height >= pixels.height * scaleY, `${prop.id} retains the full source`);
  }
  assert.equal(measured.size, 7, "reuse seven independent source modules for eleven placements");
});

test("the gantry regression removes the prior seventy-pixel gap at its unchanged ground anchor", () => {
  const prop = city.HOMEWORLD_PROPS.find(candidate => candidate.id === "training-gantry")!;
  const art = v22.SHIP_LEVEL_ART_V22.gantry;
  const oldScale = Math.min(prop.width / art.sourceWidth, prop.height / art.sourceHeight);
  const oldCenteredTop = prop.y - prop.height + (prop.height - art.sourceHeight * oldScale) / 2;
  const oldPaintedBottom = oldCenteredTop + (art.alphaBounds.y + art.alphaBounds.height) * oldScale;
  assert.ok(prop.y - oldPaintedBottom > 70, "fixture exposes the previously floating gantry");
  const corrected = city.homeworldPropArtPlacement(prop);
  const scale = corrected.height / art.sourceHeight;
  close(corrected.top + (art.alphaBounds.y + art.alphaBounds.height) * scale, 1300, "unchanged gantry ground anchor");
  assert.equal(prop.x, 2650);
});

test("render placement never changes authored colliders, depth planes or foreground fading", () => {
  const before = JSON.stringify(city.HOMEWORLD_PROPS);
  for (const prop of city.HOMEWORLD_PROPS) {
    const frozen = Object.freeze({ ...prop });
    const collision = city.homeworldCollisionAt(frozen, { halfWidth: 0, halfDepth: 0 });
    const faded = city.shouldFadeHomeworldForeground(frozen, frozen);
    const first = city.homeworldPropArtPlacement(frozen);
    const again = city.homeworldPropArtPlacement(frozen);
    assert.deepEqual(first, again);
    assert.deepEqual(city.homeworldCollisionAt(frozen, { halfWidth: 0, halfDepth: 0 }), collision);
    assert.equal(city.shouldFadeHomeworldForeground(frozen, frozen), faded);
    if (prop.plane === "ground") assert.deepEqual(collision, { kind: "prop", id: prop.id });
    if (prop.plane === "front") assert.equal(faded, true);
  }
  assert.equal(JSON.stringify(city.HOMEWORLD_PROPS), before);
});
