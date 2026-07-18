import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const manifestPath = path.join(
  projectRoot,
  "public",
  "game",
  "assets",
  "v3",
  "manifest.json",
);

const expectedBodyIds = [
  "classic",
  "elder",
  "feral",
  "huntress",
  "super",
  "young",
];
const expectedParts = [
  "foot-back",
  "foot-front",
  "hand-back",
  "hand-front",
  "head",
  "lower-arm-back",
  "lower-arm-front",
  "pelvis",
  "shin-back",
  "shin-front",
  "thigh-back",
  "thigh-front",
  "torso",
  "upper-arm-back",
  "upper-arm-front",
];
const expectedWeaponIds = [
  "arrow",
  "combistick",
  "combistick-folded",
  "smart-disc",
  "yautja-bow",
];
const expectedGearIds = [
  "audio-decoy",
  "motion-sensor",
  "netgun",
  "snare",
];
const expectedTrophyIds = [
  "trophy-bindings",
  "trophy-skull",
  "trophy-spine",
];

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesBelow(entryPath)));
    else files.push(entryPath);
  }
  return files;
}

function descriptors(value) {
  if (!value || typeof value !== "object") return [];
  if (
    typeof value.path === "string" &&
    typeof value.registeredPath === "string" &&
    value.sourceSize &&
    value.sourceRect &&
    value.pivot &&
    value.pivotMaster &&
    typeof value.attachTo === "string"
  ) {
    return [value];
  }
  return Object.values(value).flatMap(descriptors);
}

function webpDimensions(buffer) {
  assert.equal(buffer.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(buffer.subarray(8, 12).toString("ascii"), "WEBP");
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const kind = buffer.subarray(offset, offset + 4).toString("ascii");
    const length = buffer.readUInt32LE(offset + 4);
    const payload = offset + 8;
    if (kind === "VP8L") {
      assert.equal(buffer[payload], 0x2f, "invalid VP8L signature");
      const bits = buffer.readUInt32LE(payload + 1);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >>> 14) & 0x3fff) + 1,
        lossless: true,
      };
    }
    if (kind === "VP8X") {
      const width =
        1 +
        buffer[payload + 4] +
        (buffer[payload + 5] << 8) +
        (buffer[payload + 6] << 16);
      const height =
        1 +
        buffer[payload + 7] +
        (buffer[payload + 8] << 8) +
        (buffer[payload + 9] << 16);
      return { width, height, lossless: false };
    }
    offset = payload + length + (length % 2);
  }
  throw new Error("WebP dimensions chunk not found");
}

test("V3 pack exposes complete registered modular hunter assets", async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(manifest.version, 3);
  assert.deepEqual(manifest.canvas, {
    width: 256,
    height: 384,
    baseline: 366,
    facing: "right",
    coordinateSpace: "pixels",
  });
  assert.equal(manifest.format.lossless, true);
  assert.deepEqual(Object.keys(manifest.hunter.bodies).sort(), expectedBodyIds);
  assert.equal(Object.keys(manifest.hunter.masks).length, 12);
  assert.equal(Object.keys(manifest.hunter.equipment).length, 12);
  assert.equal(Object.keys(manifest.hunter.armor).length, 12);
  assert.equal(Object.keys(manifest.hunter.dreads).length, 8);
  assert.deepEqual(
    Object.keys(manifest.hunter.weapons).sort(),
    expectedWeaponIds,
  );
  assert.deepEqual(Object.keys(manifest.hunter.gear).sort(), expectedGearIds);
  assert.deepEqual(
    Object.keys(manifest.hunter.trophies).sort(),
    expectedTrophyIds,
  );
  assert.equal(manifest.counts.weapons, 5);
  assert.equal(manifest.counts.gear, 4);
  assert.equal(manifest.counts.trophies, 3);
  assert.equal(
    manifest.sources.loadoutTrophy.path,
    "art-source/v3/alpha/openai-loadout-trophy-atlas.png",
  );

  for (const weapon of Object.values(manifest.hunter.weapons)) {
    assert.ok(["handGrip", "handFront"].includes(weapon.attachTo));
  }
  for (const gear of Object.values(manifest.hunter.gear)) {
    assert.ok(["belt", "pelvis"].includes(gear.attachTo));
  }
  for (const trophy of Object.values(manifest.hunter.trophies)) {
    assert.ok(["belt", "pelvis"].includes(trophy.attachTo));
  }

  for (const body of Object.values(manifest.hunter.bodies)) {
    assert.deepEqual(Object.keys(body.parts).sort(), expectedParts);
    assert.ok(body.net.full.path.endsWith("/net/full.webp"));
    assert.ok(Object.keys(body.net.parts).length >= 12);
    assert.equal(body.normalization.baseline, 366);
  }

  const assets = descriptors(manifest.hunter);
  assert.ok(assets.length >= 220);
  const references = new Map();
  for (const asset of assets) {
    assert.deepEqual(asset.sourceSize, { width: 256, height: 384 });
    assert.equal(
      asset.pivotMaster.x,
      asset.sourceRect.x + asset.pivot.x,
      asset.path,
    );
    assert.equal(
      asset.pivotMaster.y,
      asset.sourceRect.y + asset.pivot.y,
      asset.path,
    );
    references.set(asset.path, {
      width: asset.sourceRect.width,
      height: asset.sourceRect.height,
    });
    references.set(asset.registeredPath, { width: 256, height: 384 });
  }

  assert.ok(references.size >= 250);
  for (const [reference, expected] of references) {
    assert.ok(reference.startsWith("/game/assets/v3/"), reference);
    const filePath = path.join(
      projectRoot,
      "public",
      reference.replace(/^\//, ""),
    );
    const metadata = await stat(filePath);
    assert.ok(metadata.size > 40, `${reference} should contain real artwork`);
    const buffer = await readFile(filePath);
    const dimensions = webpDimensions(buffer);
    assert.equal(dimensions.width, expected.width, reference);
    assert.equal(dimensions.height, expected.height, reference);
    assert.equal(dimensions.lossless, true, `${reference} must use VP8L`);
  }

  const assetRoot = path.join(
    projectRoot,
    "public",
    "game",
    "assets",
    "v3",
  );
  const actualWebpReferences = (await filesBelow(assetRoot))
    .filter((filePath) => filePath.endsWith(".webp"))
    .map(
      (filePath) =>
        `/${path.relative(path.join(projectRoot, "public"), filePath).replaceAll(path.sep, "/")}`,
    )
    .sort();
  assert.deepEqual(
    actualWebpReferences,
    [...references.keys()].sort(),
    "every generated WebP must be referenced exactly once by the manifest",
  );
});
