import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(
  projectRoot,
  "public",
  "game",
  "assets",
  "v2",
  "manifest.json",
);

function assetPaths(value) {
  if (typeof value === "string") {
    return value.startsWith("/game/assets/v2/") ? [value] : [];
  }
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(assetPaths);
}

test("v2 modular hunter and jungle manifest references healthy WebP assets", async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(manifest.version, 2);
  assert.deepEqual(Object.keys(manifest.hunter.masks).sort(), [
    "elder",
    "jungle",
    "scarred",
  ]);
  assert.deepEqual(Object.keys(manifest.hunter.dreads).sort(), [
    "braided",
    "classic",
    "elder",
  ]);
  assert.deepEqual(Object.keys(manifest.hunter.armor).sort(), [
    "berserker",
    "hunter",
    "scout",
  ]);
  assert.ok(manifest.hunter.equipment.gauntletClosed);
  assert.ok(manifest.hunter.equipment.gauntletOpen);
  assert.ok(manifest.hunter.equipment.wristbladesRetracted);
  assert.ok(manifest.hunter.equipment.wristbladesExtended);
  assert.ok(manifest.jungle.layers.far);
  assert.ok(manifest.jungle.climbables.treeTrunk);

  const references = [...new Set(assetPaths(manifest))];
  assert.ok(references.length >= 20);

  for (const reference of references) {
    const filePath = path.join(projectRoot, "public", reference.replace(/^\//, ""));
    const metadata = await stat(filePath);
    assert.ok(metadata.size > 4_096, `${reference} should not be a placeholder`);
    const header = await readFile(filePath);
    assert.equal(header.subarray(0, 4).toString("ascii"), "RIFF", reference);
    assert.equal(header.subarray(8, 12).toString("ascii"), "WEBP", reference);
  }
});
