import assert from "node:assert/strict";
import test from "node:test";

import {
  CATALOGUE_APPEARANCE_MODULE_IDS,
  CATALOGUE_PLAYABLE_INDIVIDUALS,
  CATALOGUE_RECONSTRUCTION_WARNING,
  catalogueReferenceUrlsForEntry,
  catalogueSelectionForEntry,
  filterCatalogueEntries,
  isCatalogueEntryPlayable,
  paginateCatalogueEntries,
  referencePresetForCatalogueEntry,
  resolveCatalogueAppearance,
  resolveCatalogueVisual,
} from "../app/game/catalogueAppearance.ts";
import {
  CATALOGUE_ENTRY_BY_ID,
  CATALOGUE_ROSTER,
} from "../app/game/catalogueRoster.ts";
import {
  HUNTER_PRESETS,
  appearanceForPreset,
} from "../app/game/hunterLore.ts";

test("catalogue preset entries resolve to their mapped production appearance", () => {
  const presetIds = new Set(HUNTER_PRESETS.map(({ id }) => id));

  for (const entry of CATALOGUE_ROSTER) {
    for (const presetId of entry.presetIds) {
      assert.ok(presetIds.has(presetId), `${entry.id}: preset must exist`);
      const resolution = resolveCatalogueAppearance(entry, presetId);

      assert.equal(resolution.presetId, presetId);
      assert.deepEqual(resolution.appearance, appearanceForPreset(presetId));
      assert.equal(resolution.provenance.kind, "mapped-preset");
      assert.equal(resolution.warning, null);
      assert.equal(catalogueSelectionForEntry(entry, presetId), presetId);
    }
  }

  assert.equal(resolveCatalogueAppearance("Y-076").presetId, "emissary-one");
  assert.equal(
    resolveCatalogueAppearance("Y-076", "emissary-two").presetId,
    "emissary-two",
  );
});

test("associated preset plates never masquerade as individual runtime plates", () => {
  for (const id of ["Y-039", "Y-097", "Y-103", "Y-206"]) {
    const entry = CATALOGUE_ENTRY_BY_ID[id];
    const visual = resolveCatalogueVisual(entry);

    assert.equal(entry.visualAssetStatus, "associated-preset-plate");
    assert.ok(entry.runtimeAssetPaths.length > 0);
    assert.equal(visual.kind, "appearance-fallback");
    assert.equal(visual.runtimePath, null);
    assert.equal(visual.appearanceResolution.provenance.kind, "mapped-preset");
  }

  assert.deepEqual(
    CATALOGUE_ROSTER.filter(
      (entry) => resolveCatalogueVisual(entry).kind === "runtime-plate",
    ).map(({ id }) => id),
    ["Y-258", "Y-259", "Y-260"],
  );
});

test("unmapped appearances use one coherent source-guided production family", () => {
  const available = {
    bodyMorphId: new Set(HUNTER_PRESETS.map((preset) => preset.bodyMorphId)),
    skinId: new Set(HUNTER_PRESETS.map((preset) => preset.skinId)),
    biomaskId: new Set(HUNTER_PRESETS.map((preset) => preset.biomaskId)),
    dreadStyleId: new Set(HUNTER_PRESETS.map((preset) => preset.dreadStyleId)),
    dreadTintId: new Set(HUNTER_PRESETS.map((preset) => preset.dreadTintId)),
    armorStyleId: new Set(HUNTER_PRESETS.map((preset) => preset.armorStyleId)),
    armorTintId: new Set(HUNTER_PRESETS.map((preset) => preset.armorTintId)),
    trophyAdornmentId: new Set(
      HUNTER_PRESETS.map((preset) => preset.trophyAdornmentId),
    ),
  };

  for (const entry of CATALOGUE_ROSTER.filter(
    ({ presetIds }) => presetIds.length === 0,
  )) {
    const first = resolveCatalogueAppearance(entry);
    const second = resolveCatalogueAppearance(entry.id);

    assert.deepEqual(first, second, `${entry.id}: reconstruction must be stable`);
    assert.notEqual(first.appearance, second.appearance);
    assert.equal(first.presetId, null);
    assert.equal(first.appearance.presetId, "custom");
    assert.equal(first.provenance.kind, "modular-reconstruction");
    const referencePresetId = referencePresetForCatalogueEntry(entry);
    assert.equal(first.provenance.referencePresetId, referencePresetId);
    assert.deepEqual(
      { ...first.appearance, presetId: referencePresetId },
      appearanceForPreset(referencePresetId),
      `${entry.id}: reconstruction modules must come from one coherent reference preset`,
    );
    assert.equal(first.warning, CATALOGUE_RECONSTRUCTION_WARNING);
    assert.ok(available.bodyMorphId.has(first.appearance.bodyMorphId));
    assert.ok(available.skinId.has(first.appearance.skinId));
    assert.ok(available.biomaskId.has(first.appearance.biomaskId));
    assert.ok(available.dreadStyleId.has(first.appearance.dreadStyleId));
    assert.ok(available.dreadTintId.has(first.appearance.dreadTintId));
    assert.ok(available.armorStyleId.has(first.appearance.armorStyleId));
    assert.ok(available.armorTintId.has(first.appearance.armorTintId));
    assert.ok(
      available.trophyAdornmentId.has(first.appearance.trophyAdornmentId),
    );
  }

  assert.deepEqual(
    new Set(CATALOGUE_APPEARANCE_MODULE_IDS.bodyMorphIds),
    available.bodyMorphId,
  );
  assert.deepEqual(
    new Set(CATALOGUE_APPEARANCE_MODULE_IDS.biomaskIds),
    available.biomaskId,
  );
});

test("all 214 individual entries expose a playable selection", () => {
  assert.equal(CATALOGUE_PLAYABLE_INDIVIDUALS.length, 214);

  for (const entry of CATALOGUE_PLAYABLE_INDIVIDUALS) {
    assert.equal(isCatalogueEntryPlayable(entry), true);
    const selection = catalogueSelectionForEntry(entry);

    if (entry.presetIds.length > 0) {
      assert.equal(selection, entry.presetIds[0]);
    } else {
      assert.equal(typeof selection, "object");
      assert.equal(selection.presetId, "custom");
    }
  }

  assert.equal(isCatalogueEntryPlayable(CATALOGUE_ENTRY_BY_ID["Y-020"]), false);
  assert.equal(isCatalogueEntryPlayable(CATALOGUE_ENTRY_BY_ID["Y-135"]), false);
});

test("search, filters and pagination keep the full catalogue reachable", () => {
  assert.equal(
    filterCatalogueEntries(CATALOGUE_ROSTER, { kind: "individual" }).length,
    214,
  );
  assert.deepEqual(
    filterCatalogueEntries(CATALOGUE_ROSTER, { query: "greyback" }).map(
      ({ id }) => id,
    ),
    ["Y-097", "Y-103", "Y-258"],
  );
  assert.ok(
    filterCatalogueEntries(CATALOGUE_ROSTER, {
      media: "Film / animation",
      continuity: "canon",
    }).every(
      (entry) =>
        entry.media.includes("Film / animation") &&
        entry.continuity === "canon",
    ),
  );

  const visited = [];
  const firstPage = paginateCatalogueEntries(CATALOGUE_ROSTER, 1, 24);
  for (let page = 1; page <= firstPage.pageCount; page += 1) {
    visited.push(...paginateCatalogueEntries(CATALOGUE_ROSTER, page, 24).items);
  }
  assert.deepEqual(visited, CATALOGUE_ROSTER);
  assert.equal(new Set(visited.map(({ id }) => id)).size, 260);
  assert.equal(paginateCatalogueEntries(CATALOGUE_ROSTER, 999, 24).page, 11);
});

test("catalogue references separate the entry source from its visual basis", () => {
  const exact = catalogueReferenceUrlsForEntry(CATALOGUE_ENTRY_BY_ID["Y-004"]);
  assert.ok(exact.length >= 2);
  assert.equal(exact[0], CATALOGUE_ENTRY_BY_ID["Y-004"].sourceUrl);

  const reconstruction = catalogueReferenceUrlsForEntry(
    CATALOGUE_ENTRY_BY_ID["Y-001"],
  );
  assert.ok(reconstruction.length >= 2);
  assert.equal(reconstruction[0], CATALOGUE_ENTRY_BY_ID["Y-001"].sourceUrl);
  assert.equal(new Set(reconstruction).size, reconstruction.length);
});
