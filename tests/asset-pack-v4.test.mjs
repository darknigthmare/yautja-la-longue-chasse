import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const backgrounds = [
  "jungle-depth-v4.webp",
  "ice-depth-v4.webp",
  "volcanic-depth-v4.webp",
  "ship-hub-v4.webp",
];

const enemies = [
  "rifle-soldier.png",
  "scout.png",
  "heavy.png",
  "cryostalker-runner.png",
  "cryostalker-brute.png",
  "bad-blood-initiate.png",
  "commandante-vey.png",
];

const jungleProps = [
  "tree-trunk.png",
  "root-platform.png",
  "ruin-platform.png",
  "crown-platform.png",
  "expedition-platform.png",
  "foreground-ferns.png",
];

function pngMetadata(buffer) {
  assert.deepEqual(
    [...buffer.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10],
  );
  assert.equal(buffer.subarray(12, 16).toString("ascii"), "IHDR");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer[24],
    colorType: buffer[25],
  };
}

test("V4 OpenAI environment exports are production-size WebP images", async () => {
  for (const filename of backgrounds) {
    const filePath = path.join(
      projectRoot,
      "public",
      "game",
      "backgrounds",
      filename,
    );
    const metadata = await stat(filePath);
    assert.ok(metadata.size > 250_000, `${filename} is not production artwork`);
    const buffer = await readFile(filePath);
    assert.equal(buffer.subarray(0, 4).toString("ascii"), "RIFF", filename);
    assert.equal(buffer.subarray(8, 12).toString("ascii"), "WEBP", filename);
  }
});

test("V4 enemy variants keep full-resolution RGBA transparency", async () => {
  for (const filename of enemies) {
    const filePath = path.join(
      projectRoot,
      "public",
      "game",
      "sprites",
      "v4",
      filename,
    );
    const metadata = await stat(filePath);
    assert.ok(metadata.size > 250_000, `${filename} is not production artwork`);
    const image = pngMetadata(await readFile(filePath));
    assert.ok(image.width >= 900, `${filename} width`);
    assert.ok(image.height >= 900, `${filename} height`);
    assert.equal(image.bitDepth, 8, `${filename} bit depth`);
    assert.equal(image.colorType, 6, `${filename} must be RGBA`);
  }
});

test("V4 jungle props are independent transparent gameplay sprites", async () => {
  for (const filename of jungleProps) {
    const filePath = path.join(
      projectRoot,
      "public",
      "game",
      "props",
      "v4",
      filename,
    );
    const metadata = await stat(filePath);
    assert.ok(metadata.size > 80_000, `${filename} is not production artwork`);
    const image = pngMetadata(await readFile(filePath));
    assert.ok(image.width >= 380, `${filename} width`);
    assert.ok(image.height >= 180, `${filename} height`);
    assert.equal(image.bitDepth, 8, `${filename} bit depth`);
    assert.equal(image.colorType, 6, `${filename} must be RGBA`);
  }
});

test("V4 art sources retain prompt-by-prompt provenance", async () => {
  const environmentReadme = await readFile(
    path.join(projectRoot, "art-source", "v4", "README.md"),
    "utf8",
  );
  const enemyReadme = await readFile(
    path.join(projectRoot, "art-source", "v4", "enemies", "README.md"),
    "utf8",
  );

  assert.match(environmentReadme, /Prompts finaux/);
  assert.match(environmentReadme, /Osiris/);
  assert.match(environmentReadme, /Nivalis/);
  assert.match(environmentReadme, /Cinder/);
  assert.match(environmentReadme, /Vaisseau de chasse/);
  assert.match(environmentReadme, /Accessoires jungle modulaires/);
  assert.match(enemyReadme, /un par archétype/);

  for (const filename of enemies) {
    assert.match(enemyReadme, new RegExp(filename.replace(".", "\\.")));
  }
  for (const filename of jungleProps) {
    assert.match(environmentReadme, new RegExp(filename.replace(".", "\\.")));
  }
});
