import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import {
  CATALOGUE_ENTRIES_WITHOUT_PRESET,
  CATALOGUE_ENTRY_BY_ID,
  CATALOGUE_ENTRY_IDS_BY_PRESET_ID,
  CATALOGUE_PRESET_IDS_BY_ENTRY_ID,
  CATALOGUE_PRESETS_WITHOUT_CATALOGUE_ENTRY,
  CATALOGUE_PRESETS_WITHOUT_WORKBOOK_ENTRY,
  CATALOGUE_ROSTER,
  CATALOGUE_ROSTER_COUNTS,
  CATALOGUE_SOURCE_WORKBOOK,
  CATALOGUE_V14_REFERENCE_MANIFEST,
} from "../app/game/catalogueRoster.ts";
import { HUNTER_PRESETS } from "../app/game/hunterLore.ts";

test("catalogue extraction is pinned to the exact supplied workbook", async () => {
  const workbook = await readFile(CATALOGUE_SOURCE_WORKBOOK.archivedPath);
  assert.equal(workbook.byteLength, CATALOGUE_SOURCE_WORKBOOK.byteLength);
  assert.equal(
    createHash("sha256").update(workbook).digest("hex"),
    CATALOGUE_SOURCE_WORKBOOK.sha256,
  );
  assert.equal(CATALOGUE_SOURCE_WORKBOOK.sheet, "Index maître");
});

test("catalogue roster preserves every master-index row and stable ID", () => {
  assert.equal(CATALOGUE_ROSTER.length, 260);
  assert.equal(new Set(CATALOGUE_ROSTER.map(({ id }) => id)).size, 260);

  for (const [index, entry] of CATALOGUE_ROSTER.entries()) {
    const ordinal = index + 1;
    assert.equal(entry.id, `Y-${String(ordinal).padStart(3, "0")}`);
    if (ordinal <= 255) {
      assert.deepEqual(entry.source, {
        sheet: "Index maître",
        row: ordinal + 1,
      });
    } else {
      assert.deepEqual(entry.source, {
        sheet: "V14 roster manifest",
        row: ordinal - 255,
      });
    }
    assert.equal(CATALOGUE_ENTRY_BY_ID[entry.id], entry);
    assert.ok(entry.name.length > 0, `${entry.id}: name is required`);
    assert.ok(entry.media.length > 0, `${entry.id}: media is required`);
    assert.ok(entry.work.length > 0, `${entry.id}: work is required`);
    assert.equal(entry.sourceUrl, entry.referenceUrls[0] ?? null);
    if (entry.sourceUrl !== null) {
      assert.equal(new URL(entry.sourceUrl).protocol, "https:");
    }
    for (const referenceUrl of entry.referenceUrls) {
      assert.equal(new URL(referenceUrl).protocol, "https:");
    }
    assert.ok(
      entry.year === null || Number.isInteger(entry.year),
      `${entry.id}: year must stay nullable and numeric`,
    );
  }
});

test("catalogue normalization retains source labels, notes and classifications", () => {
  assert.deepEqual(CATALOGUE_ROSTER_COUNTS, {
    total: 260,
    byContinuity: {
      expanded: 201,
      fan: 4,
      crossover: 10,
      canon: 45,
    },
    byKind: {
      individual: 214,
      alias: 21,
      rank: 7,
      group: 18,
    },
    withExplicitYear: 75,
    withoutExplicitYear: 185,
    withSourceUrl: 258,
    withoutSourceUrl: 2,
    mappedEntries: 71,
    unmappedEntries: 189,
    mappedPresets: 53,
    unmappedPresets: 0,
  });

  assert.equal(CATALOGUE_ENTRY_BY_ID["Y-001"].name, "'Aseigan");
  assert.equal(CATALOGUE_ENTRY_BY_ID["Y-001"].year, null);
  assert.equal(CATALOGUE_ENTRY_BY_ID["Y-049"].year, 1990);
  assert.equal(CATALOGUE_ENTRY_BY_ID["Y-049"].continuity, "canon");
  assert.equal(CATALOGUE_ENTRY_BY_ID["Y-076"].continuity, "expanded");
  assert.equal(CATALOGUE_ENTRY_BY_ID["Y-064"].continuity, "fan");
  assert.equal(CATALOGUE_ENTRY_BY_ID["Y-020"].kind, "rank");
  assert.equal(CATALOGUE_ENTRY_BY_ID["Y-135"].kind, "group");
  assert.equal(CATALOGUE_ENTRY_BY_ID["Y-141"].kind, "alias");
  assert.match(
    CATALOGUE_ENTRY_BY_ID["Y-076"].notes,
    /Deux Emissaries avaient été tournés/,
  );
  assert.match(
    CATALOGUE_ENTRY_BY_ID["Y-102"].notes,
    /Warlord Predator/,
  );
  assert.equal(CATALOGUE_ENTRY_BY_ID["Y-163"].sourceUrl, null);
  assert.equal(CATALOGUE_ENTRY_BY_ID["Y-164"].sourceUrl, null);
});

test("catalogue mappings are bidirectional and reference production presets", () => {
  const productionPresetIds = new Set(HUNTER_PRESETS.map(({ id }) => id));

  for (const entry of CATALOGUE_ROSTER) {
    assert.deepEqual(
      CATALOGUE_PRESET_IDS_BY_ENTRY_ID[entry.id],
      entry.presetIds,
    );
    for (const presetId of entry.presetIds) {
      assert.ok(
        productionPresetIds.has(presetId),
        `${entry.id}: unknown preset ${presetId}`,
      );
      assert.ok(CATALOGUE_ENTRY_IDS_BY_PRESET_ID[presetId].includes(entry.id));
    }
  }

  assert.deepEqual(CATALOGUE_ENTRY_BY_ID["Y-012"].presetIds, [
    "ancient-warrior",
  ]);
  assert.deepEqual(CATALOGUE_ENTRY_BY_ID["Y-076"].presetIds, [
    "emissary-one",
    "emissary-two",
  ]);
  assert.deepEqual(CATALOGUE_ENTRY_BY_ID["Y-102"].presetIds, ["kok-warlord"]);
  assert.deepEqual(CATALOGUE_ENTRY_BY_ID["Y-258"].presetIds, ["avp-elder"]);
  assert.deepEqual(CATALOGUE_ENTRY_BY_ID["Y-259"].presetIds, ["kok-captive"]);
  assert.deepEqual(CATALOGUE_ENTRY_BY_ID["Y-260"].presetIds, [
    "kok-arena-guard",
  ]);
  assert.deepEqual(CATALOGUE_ENTRY_BY_ID["Y-244"].presetIds, []);
  assert.deepEqual(CATALOGUE_ENTRY_IDS_BY_PRESET_ID["bad-blood-comic"], [
    "Y-021",
  ]);
  assert.equal(CATALOGUE_ENTRIES_WITHOUT_PRESET.length, 189);
  assert.deepEqual(CATALOGUE_PRESETS_WITHOUT_CATALOGUE_ENTRY, []);
  assert.deepEqual(CATALOGUE_PRESETS_WITHOUT_WORKBOOK_ENTRY, []);
  assert.equal(
    CATALOGUE_V14_REFERENCE_MANIFEST.archivedPath,
    "art-source/v14/roster/manifest.json",
  );
});

test("the catalogue UI states direct profiles and reconstructions separately", () => {
  const browserSource = readFileSync(
    join(process.cwd(), "app/game/CatalogueHunterBrowser.tsx"),
    "utf8",
  );

  assert.match(browserSource, /profils directs/);
  assert.match(browserSource, /reconstructions signalées/);
  assert.match(browserSource, /jamais\s+présentée comme une reproduction individuelle exacte/);
  assert.match(
    browserSource,
    /Plaque de preset associée · approximation/,
  );
});
