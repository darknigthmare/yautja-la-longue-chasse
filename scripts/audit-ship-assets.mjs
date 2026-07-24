import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const projectRoot = process.cwd();
const cataloguePath = resolve(projectRoot, "app/game/shipCatalogue.ts");

const families = [
  {
    label: "V12 profils",
    masterDirectory: resolve(projectRoot, "art-source/v12/ships"),
    runtimeDirectory: resolve(projectRoot, "public/game/ships/v12"),
    masterSuffix: "-chroma-master.png",
    runtimeSuffix: ".webp",
  },
  {
    label: "V13 vues zénithales",
    masterDirectory: resolve(projectRoot, "art-source/v13/ships-top"),
    runtimeDirectory: resolve(projectRoot, "public/game/ships/v13"),
    masterSuffix: "-top-chroma-master.png",
    runtimeSuffix: "-top.webp",
  },
];

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function idsFromFiles(files, suffix) {
  return sorted(
    files
      .filter((file) => file.endsWith(suffix))
      .map((file) => file.slice(0, -suffix.length)),
  );
}

function greenEnough(red, green, blue) {
  return red < 90 && green > 145 && blue < 100 && green > red * 1.8;
}

async function catalogueIds() {
  const source = await readFile(cataloguePath, "utf8");
  const rosterStart = source.indexOf("const SHIP_ROSTER = [");
  const rosterEnd = source.indexOf("const AUXILIARY_SHIP_IDS", rosterStart);
  assert.ok(rosterStart >= 0 && rosterEnd > rosterStart, "SHIP_ROSTER introuvable");
  const rosterSource = source.slice(rosterStart, rosterEnd);
  const ids = [...rosterSource.matchAll(/\{\s*id:\s*"([^"]+)"/g)].map(
    ([, id]) => id,
  );
  assert.equal(ids.length, 47, "le catalogue doit contenir 47 coques");
  assert.equal(new Set(ids).size, ids.length, "les identifiants doivent être uniques");
  return sorted(ids);
}

async function assertMaster(masterPath, label) {
  const image = sharp(masterPath);
  const metadata = await image.metadata();
  assert.equal(metadata.format, "png", `${label}: le master doit être un PNG`);
  assert.equal(metadata.hasAlpha, false, `${label}: le master chroma ne doit pas avoir d’alpha`);

  const { data, info } = await image.removeAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const cornerOffsets = [
    0,
    (info.width - 1) * info.channels,
    (info.width * (info.height - 1)) * info.channels,
    (info.width * info.height - 1) * info.channels,
  ];
  for (const offset of cornerOffsets) {
    assert.ok(
      greenEnough(data[offset], data[offset + 1], data[offset + 2]),
      `${label}: un coin du master n’est pas chroma vert`,
    );
  }
  return metadata;
}

async function assertRuntime(runtimePath, label, masterMetadata) {
  const image = sharp(runtimePath);
  const metadata = await image.metadata();
  assert.equal(metadata.format, "webp", `${label}: l’asset runtime doit être un WebP`);
  assert.equal(metadata.hasAlpha, true, `${label}: le runtime doit être transparent`);
  assert.equal(metadata.width, masterMetadata.width, `${label}: largeur altérée`);
  assert.equal(metadata.height, masterMetadata.height, `${label}: hauteur altérée`);

  const { data, info } = await image.ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const alphaChannel = info.channels - 1;
  const cornerOffsets = [
    alphaChannel,
    (info.width - 1) * info.channels + alphaChannel,
    (info.width * (info.height - 1)) * info.channels + alphaChannel,
    (info.width * info.height - 1) * info.channels + alphaChannel,
  ];
  for (const offset of cornerOffsets) {
    assert.equal(data[offset], 0, `${label}: un coin runtime n’est pas transparent`);
  }

  let transparentPixels = 0;
  let greenHaloPixels = 0;
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const pixelOffset = (y * info.width + x) * info.channels;
      const red = data[pixelOffset];
      const green = data[pixelOffset + 1];
      const blue = data[pixelOffset + 2];
      const alpha = data[pixelOffset + alphaChannel];
      if (alpha < 8) {
        transparentPixels += 1;
      }
      if (
        alpha >= 8 &&
        alpha < 248 &&
        green > 100 &&
        green > red * 1.4 &&
        green > blue * 1.4
      ) {
        greenHaloPixels += 1;
      }
      if (alpha > 24) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  assert.ok(maxX >= minX && maxY >= minY, `${label}: coque invisible`);
  assert.ok(
    minX >= 2 && minY >= 2 && maxX <= info.width - 3 && maxY <= info.height - 3,
    `${label}: coque coupée par le cadre`,
  );
  assert.ok(
    transparentPixels / (info.width * info.height) > 0.05,
    `${label}: transparence insuffisante`,
  );
  assert.equal(
    greenHaloPixels,
    0,
    `${label}: halo chroma semi-transparent résiduel`,
  );
}

const expectedIds = await catalogueIds();

for (const family of families) {
  const [masterFiles, runtimeFiles] = await Promise.all([
    readdir(family.masterDirectory),
    readdir(family.runtimeDirectory),
  ]);
  const masterIds = idsFromFiles(masterFiles, family.masterSuffix);
  const runtimeIds = idsFromFiles(runtimeFiles, family.runtimeSuffix);
  assert.deepEqual(masterIds, expectedIds, `${family.label}: masters incomplets`);
  assert.deepEqual(runtimeIds, expectedIds, `${family.label}: runtime incomplet`);

  for (const id of expectedIds) {
    const masterPath = resolve(
      family.masterDirectory,
      `${id}${family.masterSuffix}`,
    );
    const runtimePath = resolve(
      family.runtimeDirectory,
      `${id}${family.runtimeSuffix}`,
    );
    const masterMetadata = await assertMaster(masterPath, `${family.label} · ${id}`);
    await assertRuntime(runtimePath, `${family.label} · ${id}`, masterMetadata);
  }
}

console.log(
  `Ship assets OK: ${expectedIds.length} profils V12 + ${expectedIds.length} vues zénithales V13.`,
);
