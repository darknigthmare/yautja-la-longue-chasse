import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "vite";

import { V6_MASK_VISUAL_BY_ID } from "../app/game/v6Visuals.ts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = await mkdtemp(join(tmpdir(), "yautja-hunter-kit-v14-"));

await build({
  configFile: false,
  publicDir: false,
  logLevel: "silent",
  build: {
    emptyOutDir: true,
    outDir: outputDirectory,
    ssr: resolve(projectRoot, "app/game/hunterKitRegistry.ts"),
    rollupOptions: {
      output: { entryFileNames: "hunter-kit-registry.mjs" },
    },
  },
});

await build({
  configFile: false,
  publicDir: false,
  logLevel: "silent",
  build: {
    emptyOutDir: false,
    outDir: outputDirectory,
    ssr: resolve(projectRoot, "app/game/hunterVisuals.ts"),
    rollupOptions: {
      output: { entryFileNames: "hunter-visuals.mjs" },
    },
  },
});

const {
  HUNTER_KIT_ASSETS,
  HUNTER_KIT_MANIFEST_SUMMARY,
  HUNTER_KIT_PRIORITY,
  getHunterKitAsset,
  listHunterKitAssets,
  resolveHunterKitAsset,
  resolveHunterKitAssetForConsumer,
} = await import(
  pathToFileURL(join(outputDirectory, "hunter-kit-registry.mjs")).href
);
const {
  HUNTER_ASSET_ROOT_V3,
  hunterMaskRigPath,
  hunterMaskThumbnailPath,
} = await import(
  pathToFileURL(join(outputDirectory, "hunter-visuals.mjs")).href
);
const gameClientSource = await readFile(
  resolve(projectRoot, "app/game/GameClient.tsx"),
  "utf8",
);
const hunterRigPreviewSource = await readFile(
  resolve(projectRoot, "app/game/HunterRigPreview.tsx"),
  "utf8",
);
const huntCanvasSource = await readFile(
  resolve(projectRoot, "app/game/HuntCanvas.tsx"),
  "utf8",
);

after(async () => {
  await rm(outputDirectory, { force: true, recursive: true });
});

test("hunter kit V14 exposes eleven available, planned and distinct exact assets", () => {
  assert.deepEqual(HUNTER_KIT_PRIORITY, [
    "exact-override",
    "family",
    "approximation",
    "generic",
  ]);
  assert.equal(HUNTER_KIT_MANIFEST_SUMMARY.packVersion, 14);
  assert.equal(HUNTER_KIT_MANIFEST_SUMMARY.planned, 11);
  assert.equal(HUNTER_KIT_MANIFEST_SUMMARY.available, 11);
  assert.equal(HUNTER_KIT_MANIFEST_SUMMARY.complete, true);
  assert.equal(HUNTER_KIT_ASSETS.length, 11);
  assert.equal(new Set(HUNTER_KIT_ASSETS.map((asset) => asset.id)).size, 11);
  assert.equal(
    new Set(HUNTER_KIT_ASSETS.map((asset) => asset.metadata.sha256)).size,
    11,
  );
  assert.equal(listHunterKitAssets({ status: "available" }).length, 11);
  assert.equal(listHunterKitAssets({ status: "planned" }).length, 0);
  assert.equal(listHunterKitAssets({ kind: "mask" }).length, 4);
  assert.equal(listHunterKitAssets({ kind: "trophy" }).length, 6);
  assert.equal(getHunterKitAsset("mask-boar")?.available, true);
  assert.equal(getHunterKitAsset("missing"), null);
});

test("resolver honors exact override, family and approximation without an arbitrary mask generic", () => {
  const exact = resolveHunterKitAsset({
    kind: "mask",
    presetId: "snake",
    familyId: "lost-tribe",
    approximationId: "mask-metal",
    genericId: "mask-generic",
  });
  assert.equal(exact?.asset.id, "mask-snake");
  assert.equal(exact?.matchedTier, "exact-override");
  assert.equal(exact?.status, "available");

  const family = resolveHunterKitAsset({
    kind: "mask",
    presetId: "not-yet-produced",
    familyId: "lost-tribe",
    approximationId: "mask-angular",
    genericId: "mask-generic",
  });
  assert.equal(family?.asset.id, "mask-boar");
  assert.equal(family?.matchedTier, "family");

  const approximation = resolveHunterKitAsset({
    kind: "mask",
    approximationId: "mask-angular",
    genericId: "mask-generic",
  });
  assert.equal(approximation?.asset.id, "mask-falconer");
  assert.equal(approximation?.matchedTier, "approximation");

  const generic = resolveHunterKitAsset({
    kind: "mask",
    genericId: "mask-generic",
  });
  assert.equal(generic, null);
  for (const biomaskId of ["boar", "snake", "falconer"]) {
    assert.ok(
      V6_MASK_VISUAL_BY_ID[biomaskId],
      `${biomaskId}: V6 fallback must remain available`,
    );
  }
});

test("kind-scoped aliases avoid mask and equipment collisions", () => {
  const mask = resolveHunterKitAsset({
    kind: "mask",
    presetId: "feral-hunter",
  });
  const weapon = resolveHunterKitAsset({
    kind: "weapon",
    presetId: "feral-hunter",
  });
  assert.equal(mask?.asset.id, "mask-feral-screen");
  assert.equal(weapon?.asset.id, "feral-speargun");

  const trophy = resolveHunterKitAsset({
    kind: "trophy",
    assetId: "trophy-xenomorph-skull-p2",
  });
  assert.equal(trophy?.asset.id, "trophy-xenomorph-skull-p2");
  assert.equal(trophy?.matchedTier, "exact-override");
});

test("thumbnail and rig can later share the same registry asset", () => {
  const request = {
    kind: "mask",
    presetId: "boar",
    genericId: "mask-generic",
  };
  const thumbnail = resolveHunterKitAssetForConsumer(request, "thumbnail");
  const rig = resolveHunterKitAssetForConsumer(request, "rig");
  assert.equal(thumbnail?.asset.id, "mask-boar");
  assert.equal(rig?.asset.id, thumbnail?.asset.id);
  assert.equal(rig?.asset.runtimeUrl, thumbnail?.asset.runtimeUrl);
});

test("GameClient separates V62 reference masks, preserved originals and V16 archive", () => {
  assert.match(
    gameClientSource,
    /const V14_ORIGINAL_MASK_ASSETS = listHunterKitAssets\(\{[\s\S]*?kind: "mask",[\s\S]*?status: "available",[\s\S]*?\}\);/,
  );
  assert.match(
    gameClientSource,
    /const V14_FERAL_SPEARGUN = getHunterKitAsset\("feral-speargun"\);/,
  );
  assert.match(gameClientSource, /className="armory-exact-kit"/);
  assert.match(
    gameClientSource,
    /\.\.\.REFERENCE_BIOMASKS_V62\.map[\s\S]*?V14_FERAL_SPEARGUN\?\.available[\s\S]*?\[V14_FERAL_SPEARGUN\]/,
  );
  assert.match(gameClientSource, /src=\{asset\.runtimeUrl\}/);
  assert.match(
    gameClientSource,
    /FRANCHISE_TROPHY_ARCHIVE_ASSETS\.map\(\(asset\)[\s\S]*?className="trophy-card trophy-reference-card"[\s\S]*?src=\{asset\.runtimeUrl\}/,
  );
  assert.match(
    gameClientSource,
    /<details className="franchise-trophy-archive">[\s\S]*?FRANCHISE_TROPHY_ARCHIVE_ASSETS\.map/,
  );
  assert.match(
    gameClientSource,
    /trophyWallVisualForDefinitionId\(\s*trophy\.definitionId,\s*\)/,
  );
});

test("GameClient selects native mask images and exposes preserved clan designs", () => {
  assert.match(gameClientSource, /REFERENCE_BIOMASKS_V62\.map/);
  assert.match(gameClientSource, /PRESERVED_BIOMASKS_V62\.map/);
  assert.match(gameClientSource, /image: hunterMaskThumbnailPath\(mask\.id\), preferImage: true/);
  assert.doesNotMatch(gameClientSource, /V14_(FERAL|BOAR|SNAKE|FALCONER)_MASK_URL/);
  assert.match(gameClientSource, /option\.id === null \|\| option\.preferImage[\s\S]*?: V6_MASK_VISUAL_BY_ID\[option\.id\]/);
});

test("standalone V14 originals remain preserved while canonical slots use new V62 cutouts", () => {
  for (const [id, assetId] of Object.entries({feral: "mask-feral-screen", boar: "mask-boar", snake: "mask-snake", falconer: "mask-falconer"})) {
    const asset = getHunterKitAsset(assetId);
    assert.equal(asset.available, true);
    assert.equal(asset.runtimeUrl, "/game/assets/v14/hunter-kit/masks/" + assetId + ".webp");
    assert.match(asset.name, /création originale/);
    assert.match(asset.work, /non canonique/);
    assert.equal(hunterMaskThumbnailPath(id), "/game/sprites/v62/masks/" + id + ".png");
    assert.equal(hunterMaskRigPath(id), hunterMaskThumbnailPath(id));
  }
  assert.equal(hunterMaskRigPath("clan-voile-argent"), HUNTER_ASSET_ROOT_V3 + "/masks/registered/jungle.webp");
  assert.equal(hunterMaskThumbnailPath("clan-voile-argent"), HUNTER_ASSET_ROOT_V3 + "/masks/jungle.webp");
  for (const trophy of listHunterKitAssets({kind: "trophy"})) {
    assert.deepEqual(trophy.futureConsumers, ["thumbnail"]);
    assert.equal(resolveHunterKitAssetForConsumer({kind: "trophy", assetId: trophy.id}, "rig"), null);
  }
});

test("HunterRigPreview and HuntCanvas only consume registered rig mask paths", () => {
  assert.match(
    hunterRigPreviewSource,
    /hunterMaskRigPath\(appearance\.biomaskId\)/,
  );
  assert.match(
    huntCanvasSource,
    /queueImage\(hunterMaskRigPath\(appearance\.biomaskId\)/,
  );
  for (const source of [hunterRigPreviewSource, huntCanvasSource]) {
    assert.doesNotMatch(source, /\bhunterMaskThumbnailPath\b/);
    assert.doesNotMatch(source, /\/game\/assets\/v14\/hunter-kit\/masks\//);
  }
});
