import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const projectRoot = process.cwd();
const cataloguePath = resolve(projectRoot, "app/game/shipCatalogue.ts");
const v14SourceManifestPath = resolve(
  projectRoot,
  "art-source/v14/ships/ship-reference-sources.json",
);
const v14PromptManifestPath = resolve(
  projectRoot,
  "art-source/v14/ships/ship-generation-prompts.jsonl",
);
const v14AssetManifestPath = resolve(
  projectRoot,
  "art-source/v14/ships/ship-asset-manifest.json",
);

const v14GeneratedIds = [
  "avp-predator-drop-pod",
  "avp-predator-mothership",
  "avpr-scout-ship",
  "feral-spaceship",
  "fugitive-spaceship",
  "game-preserve-ship",
  "upgrade-spaceship",
  "wolf-ship",
].sort();

const v14CanonicalIds = [
  "avp-predator-drop-pod",
  "avp-predator-mothership",
  "avpr-scout-ship",
  "feral-spaceship",
  "fugitive-spaceship",
  "upgrade-spaceship",
  "wolf-ship",
].sort();

const v14ApproximationIds = [
  "game-preserve-ship",
].sort();

const projectOriginalIds = [
  "project-original-avp-predator-drop-pod",
  "project-original-avp-predator-mothership",
  "project-original-avpr-scout-ship",
  "project-original-feral-spaceship",
  "project-original-fugitive-spaceship",
  "project-original-upgrade-spaceship",
  "project-original-wolf-ship",
].sort();

const projectOriginalAssetSources = {
  "project-original-avp-predator-mothership": "avp-predator-mothership",
  "project-original-avpr-scout-ship": "avpr-scout-ship",
  "project-original-wolf-ship": "wolf-ship",
  "project-original-fugitive-spaceship": "fugitive-spaceship",
  "project-original-upgrade-spaceship": "upgrade-spaceship",
  "project-original-feral-spaceship": "feral-spaceship",
  "project-original-avp-predator-drop-pod": "avp-predator-drop-pod",
};

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
  {
    label: "V14 profils guidés par références",
    masterDirectory: resolve(projectRoot, "art-source/v14/ships"),
    runtimeDirectory: resolve(projectRoot, "public/game/ships/v14"),
    masterSuffix: "-profile-chroma-master.png",
    runtimeSuffix: ".webp",
    runtimeExclusions: ["-top.webp"],
    expectedIds: v14GeneratedIds,
  },
  {
    label: "V14 vues zénithales indépendantes",
    masterDirectory: resolve(projectRoot, "art-source/v14/ships"),
    runtimeDirectory: resolve(projectRoot, "public/game/ships/v14"),
    masterSuffix: "-top-chroma-master.png",
    runtimeSuffix: "-top.webp",
    expectedIds: v14GeneratedIds,
  },
];

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function idsFromFiles(files, suffix, exclusions = []) {
  return sorted(
    files
      .filter(
        (file) =>
          file.endsWith(suffix) &&
          exclusions.every((excludedSuffix) => !file.endsWith(excludedSuffix)),
      )
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
  assert.equal(ids.length, 47, "le registre physique V12/V13 doit contenir 47 stems");
  assert.equal(new Set(ids).size, ids.length, "les stems V12/V13 doivent être uniques");

  const exportedProjectOriginalIds = idsFromExportedArray(
    source,
    "PROJECT_ORIGINAL_SHIP_IDS",
  );
  assert.deepEqual(
    exportedProjectOriginalIds,
    projectOriginalIds,
    "les sept créations originales autonomes doivent rester déclarées",
  );

  const mappingStart = source.indexOf(
    "export const PROJECT_ORIGINAL_ASSET_SOURCE_BY_ID",
  );
  const mappingEnd = source.indexOf(
    "const V14_APPROXIMATION_SHIP_ID_SET",
    mappingStart,
  );
  assert.ok(
    mappingStart >= 0 && mappingEnd > mappingStart,
    "mapping création originale → stem physique introuvable",
  );
  const exportedMapping = Object.fromEntries(
    [
      ...source
        .slice(mappingStart, mappingEnd)
        .matchAll(/"([^"]+)":\s*"([^"]+)"/g),
    ].map(([, id, assetSourceId]) => [id, assetSourceId]),
  );
  assert.deepEqual(
    exportedMapping,
    projectOriginalAssetSources,
    "les créations originales doivent réutiliser les sept paires V12/V13",
  );
  assert.equal(
    new Set(Object.values(exportedMapping)).size,
    projectOriginalIds.length,
    "chaque création originale doit pointer vers une paire historique distincte",
  );

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

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function idsFromExportedArray(source, exportName) {
  const start = source.indexOf(`export const ${exportName} = [`);
  const end = source.indexOf("] as const", start);
  assert.ok(start >= 0 && end > start, `${exportName}: export introuvable`);
  return sorted(
    [...source.slice(start, end).matchAll(/"([^"]+)"/g)].map(([, id]) => id),
  );
}

async function auditV14Manifests() {
  const [catalogueSource, sourceText, promptText, assetText, sourceDirectory] =
    await Promise.all([
      readFile(cataloguePath, "utf8"),
      readFile(v14SourceManifestPath, "utf8"),
      readFile(v14PromptManifestPath, "utf8"),
      readFile(v14AssetManifestPath, "utf8"),
      readdir(resolve(projectRoot, "art-source/v14/ships")),
    ]);

  const sourceManifest = JSON.parse(sourceText);
  const assetManifest = JSON.parse(assetText);
  const promptRecords = promptText
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Prompt V14 ligne ${index + 1}: ${error.message}`);
      }
    });
  const templates = new Map(
    promptRecords
      .filter(({ recordType }) => recordType === "template")
      .map((record) => [record.promptTemplateId, record]),
  );
  const assetPrompts = promptRecords.filter(
    ({ recordType }) => recordType === "asset-prompt",
  );
  const promptById = new Map(
    assetPrompts.map((record) => [record.promptId, record]),
  );

  assert.equal(sourceManifest.pipelineVersion, "V14");
  assert.equal(sourceManifest.policy.referenceRequired, true);
  assert.equal(sourceManifest.policy.exactIncarnationRequired, true);
  assert.equal(sourceManifest.policy.crossIncarnationMixingForbidden, true);
  assert.equal(sourceManifest.policy.downloadedReferencesVersioned, false);
  assert.equal(sourceManifest.policy.runtimeUsesOfficialArtwork, false);
  assert.equal(sourceManifest.policy.manualInspectionRequired, true);
  assert.equal(assetManifest.pipelineVersion, "V14");
  assert.deepEqual(assetManifest.runtimePriority, [
    "accepted-v14-canon-replacement",
    "historical-project-original-v12-v13",
    "fallback",
  ]);
  assert.deepEqual(
    sorted(Object.keys(sourceManifest.ships)),
    v14GeneratedIds,
    "V14: registre de sources incomplet",
  );
  assert.deepEqual(
    sorted(Object.keys(assetManifest.ships)),
    v14GeneratedIds,
    "V14: manifeste d’assets incomplet",
  );
  assert.deepEqual(
    idsFromExportedArray(catalogueSource, "V14_CANONICAL_SHIP_IDS"),
    v14CanonicalIds,
    "V14: priorité runtime différente du manifeste",
  );
  assert.equal(templates.size, 2, "V14: deux contrats de vue sont requis");
  assert.match(
    templates.get("v14-top-v1")?.prompt ?? "",
    /STRICT 90-DEGREE ORTHOGRAPHIC DORSAL TOP VIEW/,
  );
  assert.equal(assetPrompts.length, v14GeneratedIds.length * 2);
  assert.equal(promptById.size, assetPrompts.length, "V14: promptId dupliqué");

  const unexpectedReferenceFiles = sourceDirectory.filter(
    (file) =>
      !file.endsWith("-chroma-master.png") &&
      ![
        "README.md",
        "ship-reference-sources.json",
        "ship-generation-prompts.jsonl",
        "ship-asset-manifest.json",
      ].includes(file),
  );
  assert.deepEqual(
    unexpectedReferenceFiles,
    [],
    "V14: une référence téléchargée a été copiée dans art-source",
  );

  for (const id of v14GeneratedIds) {
    const sources = sourceManifest.ships[id];
    const ship = assetManifest.ships[id];
    const isCanonical = v14CanonicalIds.includes(id);
    const isApproximation = v14ApproximationIds.includes(id);

    assert.match(sources.exactIncarnation, /\S/);
    assert.ok(sources.primarySourcePages.length >= 1);
    assert.ok(sources.supportingImageUrls.length >= 1);
    assert.ok(sources.visualLocks.length >= 3);
    for (const url of [
      ...sources.primarySourcePages,
      ...sources.supportingImageUrls,
    ]) {
      assert.match(url, /^https:\/\//, `${id}: URL de référence invalide`);
    }

    assert.equal(ship.available, true, `${id}: paire indisponible`);
    assert.equal(
      ship.canonReplacement,
      isCanonical,
      `${id}: statut de remplacement canonique incorrect`,
    );
    if (isApproximation) {
      assert.match(ship.fidelityTier, /approximation/);
      assert.match(ship.knownDeviation, /\S/);
      assert.equal(ship.manualInspection, "accepted-as-approximation");
      assert.equal(
        ship.viewInspection.profile,
        "insufficient-for-canon-replacement",
      );
      assert.equal(ship.viewInspection.top, "accepted-reference-geometry");
    } else {
      assert.equal(ship.fidelityTier, "reference-locked");
      assert.equal(ship.knownDeviation, null);
      assert.equal(ship.manualInspection, "accepted");
      if (id === "avp-predator-drop-pod") {
        assert.match(ship.viewInspection.profile, /three-emitter/);
        assert.match(ship.viewInspection.top, /three-emitter/);
      }
    }

    for (const view of ["profile", "top"]) {
      const asset = ship[view];
      const prompt = promptById.get(asset.promptId);
      assert.equal(prompt?.shipId, id, `${id} ${view}: prompt mal relié`);
      assert.equal(prompt?.view, view, `${id} ${view}: contrat de vue incorrect`);
      assert.equal(prompt?.generationCallCount, 1);
      assert.match(
        prompt?.outputStatus ?? "",
        isCanonical ? /canon-replacement/ : /approximation/,
      );
      assert.ok(
        templates.has(prompt?.promptTemplateId),
        `${id} ${view}: gabarit de prompt absent`,
      );
      assert.ok(
        typeof prompt?.identityLock === "string" &&
          prompt.identityLock.length >= 60,
        `${id} ${view}: verrou d’identité trop court`,
      );

      const masterPath = resolve(projectRoot, asset.masterPath);
      const runtimePath = resolve(
        projectRoot,
        "public",
        asset.runtimePath.replace(/^\//, ""),
      );
      const [masterContent, runtimeContent, runtimeMetadata] = await Promise.all([
        readFile(masterPath),
        readFile(runtimePath),
        sharp(runtimePath).metadata(),
      ]);
      assert.equal(sha256(masterContent), asset.masterSha256);
      assert.equal(sha256(runtimeContent), asset.runtimeSha256);
      assert.equal(runtimeMetadata.width, asset.width);
      assert.equal(runtimeMetadata.height, asset.height);
    }
    assert.notEqual(ship.profile.promptId, ship.top.promptId);
  }
}

const expectedIds = await catalogueIds();

for (const family of families) {
  const [masterFiles, runtimeFiles] = await Promise.all([
    readdir(family.masterDirectory),
    readdir(family.runtimeDirectory),
  ]);
  const masterIds = idsFromFiles(masterFiles, family.masterSuffix);
  const runtimeIds = idsFromFiles(
    runtimeFiles,
    family.runtimeSuffix,
    family.runtimeExclusions,
  );
  const familyExpectedIds = family.expectedIds ?? expectedIds;
  assert.deepEqual(
    masterIds,
    familyExpectedIds,
    `${family.label}: masters incomplets`,
  );
  assert.deepEqual(
    runtimeIds,
    familyExpectedIds,
    `${family.label}: runtime incomplet`,
  );

  for (const id of familyExpectedIds) {
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

await auditV14Manifests();

console.log(
  `Ship assets OK: ${expectedIds.length + projectOriginalIds.length} entrées, ${expectedIds.length} profils V12 + ${expectedIds.length} vues zénithales V13 réutilisés par ${projectOriginalIds.length} créations originales + ${v14GeneratedIds.length} paires V14 (${v14CanonicalIds.length} remplacements, ${v14ApproximationIds.length} approximations).`,
);
