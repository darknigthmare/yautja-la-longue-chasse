import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import sharp from "sharp";

import {
  CATALOGUE_ENTRY_BY_ID,
  CATALOGUE_ROSTER,
  CATALOGUE_V14_REFERENCE_BY_ID,
  CATALOGUE_V14_REFERENCE_MANIFEST,
} from "../app/game/catalogueRoster.ts";
import {
  isCatalogueEntryPlayable,
  resolveCatalogueAppearance,
  resolveCatalogueVisual,
} from "../app/game/catalogueAppearance.ts";

const V14_IDS = Object.freeze([
  "Y-162",
  "Y-256",
  "Y-257",
  "Y-258",
  "Y-259",
  "Y-260",
]);
const V14_APPEND_IDS = V14_IDS.slice(1);
const GENERATED_V14_IDS = Object.freeze(["Y-258", "Y-259", "Y-260"]);

function runtimeFilePath(runtimePath) {
  return join(
    process.cwd(),
    "public",
    ...runtimePath.replace(/^\/+/, "").split("/"),
  );
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function readV14Manifest() {
  return JSON.parse(
    await readFile(
      join(process.cwd(), CATALOGUE_V14_REFERENCE_MANIFEST.archivedPath),
      "utf8",
    ),
  );
}

test("V14 roster manifest mirrors the six runtime reference records", async () => {
  const manifest = await readV14Manifest();

  assert.equal(manifest.version, CATALOGUE_V14_REFERENCE_MANIFEST.version);
  assert.equal(manifest.sourceWorkbook.policy, "immutable");
  assert.equal(manifest.referencePolicy.officialReferencesAreRuntimeAssets, false);
  assert.deepEqual(
    manifest.entries.map(({ id }) => id),
    V14_IDS,
  );
  assert.deepEqual(
    manifest.entries.map(({ operation }) => operation),
    ["correction", "append", "append", "append", "append", "append"],
  );

  for (const record of manifest.entries) {
    const entry = CATALOGUE_ENTRY_BY_ID[record.id];
    const runtimeReference = CATALOGUE_V14_REFERENCE_BY_ID[record.id];

    assert.ok(entry, `${record.id}: runtime entry is required`);
    assert.ok(runtimeReference, `${record.id}: V14 reference is required`);
    assert.equal(entry.work, record.work);
    assert.equal(entry.kind, record.kind);
    assert.equal(entry.continuity, record.continuity);
    assert.deepEqual(entry.aliases, record.aliases);
    assert.deepEqual(entry.referenceUrls, record.referenceUrls);
    assert.equal(entry.sourceUrl, record.referenceUrls[0]);
    assert.equal(entry.visualAnchor, record.visualAnchor);
    assert.deepEqual(entry.forbiddenVisualMixes, record.forbiddenVisualMixes);
    assert.equal(entry.visualAssetStatus, record.visualAsset.status);
    assert.deepEqual(entry.presetIds, record.visualAsset.presetIds);
    assert.deepEqual(entry.runtimeAssetPaths, record.visualAsset.runtimePaths);
    assert.equal(runtimeReference.visualAnchor, record.visualAnchor);
    assert.equal(
      record.visualAsset.available,
      GENERATED_V14_IDS.includes(record.id),
    );

    for (const url of record.referenceUrls) {
      assert.equal(new URL(url).protocol, "https:");
    }
  }
});

test("V14 preserves the V6 ID range and appends five stable IDs", () => {
  const workbookEntries = CATALOGUE_ROSTER.slice(0, 255);
  const supplementalEntries = CATALOGUE_ROSTER.slice(255);

  assert.deepEqual(
    workbookEntries.map(({ id }) => id),
    Array.from(
      { length: 255 },
      (_, index) => `Y-${String(index + 1).padStart(3, "0")}`,
    ),
  );
  assert.ok(
    workbookEntries.every(
      ({ source, rosterRevision }) =>
        source.sheet === "Index maître" &&
        rosterRevision !== "v14-supplement",
    ),
  );
  assert.deepEqual(
    supplementalEntries.map(({ id }) => id),
    V14_APPEND_IDS,
  );
  assert.ok(
    supplementalEntries.every(
      ({ source, rosterRevision }) =>
        source.sheet === "V14 roster manifest" &&
        rosterRevision === "v14-supplement",
    ),
  );
});

test("Predator A6718 is corrected to Archie without inheriting arcade visuals", () => {
  const a6718 = CATALOGUE_ENTRY_BY_ID["Y-162"];

  assert.equal(a6718.rosterRevision, "v14-correction");
  assert.match(a6718.work, /^Archie vs\. Predator/);
  assert.doesNotMatch(a6718.work, /arcade|Capcom/i);
  assert.equal(a6718.continuity, "expanded");
  assert.ok(a6718.aliases.includes("Predator-Archie"));
  assert.ok(a6718.forbiddenVisualMixes.includes("Predator Warrior (Arcade)"));
  assert.ok(a6718.forbiddenVisualMixes.includes("Predator Hunter (Arcade)"));
});

test("AVP and AVPR screen works are classified as crossover continuity", () => {
  const avpScreenEntries = CATALOGUE_ROSTER.filter(
    ({ mediaLabel, work }) =>
      mediaLabel.includes("Film / animation") &&
      /^(?:Alien vs\. Predator(?:\s|\(|$)|Aliens vs\. Predator: Requiem)/i.test(
        work,
      ),
  );

  assert.ok(avpScreenEntries.length >= 10);
  assert.ok(
    avpScreenEntries.every(({ continuity }) => continuity === "crossover"),
  );
  assert.equal(CATALOGUE_ENTRY_BY_ID["Y-049"].continuity, "canon");
});

test("planned identities stay explicit approximations until custom art exists", () => {
  for (const id of ["Y-162", "Y-256", "Y-257"]) {
    const entry = CATALOGUE_ENTRY_BY_ID[id];
    const resolution = resolveCatalogueAppearance(entry);

    assert.equal(entry.visualAssetStatus, "planned-custom");
    assert.deepEqual(entry.presetIds, []);
    assert.deepEqual(entry.runtimeAssetPaths, []);
    assert.equal(resolution.presetId, null);
    assert.equal(resolution.provenance.kind, "modular-reconstruction");
    assert.ok(resolution.warning);
  }
});

test("existing V14 custom plates are mapped and present in public runtime", async () => {
  for (const id of GENERATED_V14_IDS) {
    const entry = CATALOGUE_ENTRY_BY_ID[id];

    assert.equal(entry.visualAssetStatus, "existing-custom-plate");
    assert.equal(entry.presetIds.length, 1);
    assert.equal(entry.runtimeAssetPaths.length, 1);
    for (const runtimePath of entry.runtimeAssetPaths) {
      await access(runtimeFilePath(runtimePath));
    }
  }

  assert.equal(isCatalogueEntryPlayable(CATALOGUE_ENTRY_BY_ID["Y-258"]), true);
  assert.equal(isCatalogueEntryPlayable(CATALOGUE_ENTRY_BY_ID["Y-259"]), true);
  assert.equal(isCatalogueEntryPlayable(CATALOGUE_ENTRY_BY_ID["Y-260"]), false);
});

test("individual V14 runtime plates win before the modular appearance fallback", async () => {
  const manifest = await readV14Manifest();

  for (const id of GENERATED_V14_IDS) {
    const record = manifest.entries.find((entry) => entry.id === id);
    const visual = resolveCatalogueVisual(id);

    assert.ok(record, `${id}: manifest record is required`);
    assert.equal(visual.kind, "runtime-plate");
    assert.equal(visual.runtimePath, record.visualAsset.runtimePath);
    assert.equal(visual.appearanceResolution, null);
    assert.deepEqual(record.visualAsset.runtimePaths, [
      record.visualAsset.runtimePath,
    ]);
  }

  const plannedVisual = resolveCatalogueVisual("Y-256");
  assert.equal(plannedVisual.kind, "appearance-fallback");
  assert.equal(plannedVisual.runtimePath, null);
  assert.equal(
    plannedVisual.appearanceResolution.provenance.kind,
    "modular-reconstruction",
  );

  const browserSource = await readFile(
    join(process.cwd(), "app/game/CatalogueHunterBrowser.tsx"),
    "utf8",
  );
  assert.match(browserSource, /src=\{visualResolution\.runtimePath\}/);
  assert.match(
    browserSource,
    /data-catalogue-visual=\{visualResolution\.kind\}/,
  );
});

test("V14 roster masters and alpha WebPs match their archived hashes", async () => {
  const manifest = await readV14Manifest();

  for (const id of GENERATED_V14_IDS) {
    const record = manifest.entries.find((entry) => entry.id === id);
    assert.ok(record, `${id}: manifest record is required`);

    const { visualAsset } = record;
    const masterBuffer = await readFile(
      join(process.cwd(), visualAsset.masterPath),
    );
    const runtimeBuffer = await readFile(
      runtimeFilePath(visualAsset.runtimePath),
    );

    assert.equal(sha256(masterBuffer), visualAsset.masterSha256);
    assert.equal(sha256(runtimeBuffer), visualAsset.sha256);
    assert.equal(visualAsset.hash, `sha256:${visualAsset.sha256}`);

    const metadata = await sharp(runtimeBuffer).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.hasAlpha, true);
    assert.equal(metadata.width, visualAsset.dimensions.width);
    assert.equal(metadata.height, visualAsset.dimensions.height);

    const { data, info } = await sharp(runtimeBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const alphaAt = (x, y) => data[(y * info.width + x) * info.channels + 3];
    assert.equal(alphaAt(0, 0), 0, `${id}: top-left corner must be transparent`);
    assert.equal(
      alphaAt(info.width - 1, 0),
      0,
      `${id}: top-right corner must be transparent`,
    );
    assert.equal(
      alphaAt(0, info.height - 1),
      0,
      `${id}: bottom-left corner must be transparent`,
    );
    assert.equal(
      alphaAt(info.width - 1, info.height - 1),
      0,
      `${id}: bottom-right corner must be transparent`,
    );
  }
});

test("official reference pages remain separated from masters and runtime assets", async () => {
  const manifest = await readV14Manifest();

  assert.equal(manifest.referencePolicy.officialReferencesAreRuntimeAssets, false);

  for (const record of manifest.entries) {
    const { visualAsset } = record;

    for (const referenceUrl of record.referenceUrls) {
      assert.match(referenceUrl, /^https:\/\//);
      assert.notEqual(referenceUrl, visualAsset.runtimePath);
      assert.notEqual(referenceUrl, visualAsset.masterPath);
    }

    if (!visualAsset.available) {
      assert.equal(visualAsset.masterPath, null);
      assert.equal(visualAsset.runtimePath, null);
      assert.equal(visualAsset.hash, null);
      continue;
    }

    assert.match(
      visualAsset.masterPath,
      /^art-source\/v14\/roster\/masters\//,
    );
    assert.match(
      visualAsset.runtimePath,
      /^\/game\/sprites\/v14\/yautja-roster\//,
    );
    assert.doesNotMatch(visualAsset.runtimePath, /^https?:\/\//);
  }
});
