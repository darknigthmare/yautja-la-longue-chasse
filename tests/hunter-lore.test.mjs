import assert from "node:assert/strict";
import test from "node:test";

import {
  HUNTER_PRESET_BY_ID,
  HUNTER_PRESETS,
  appearanceForPreset,
} from "../app/game/hunterLore.ts";
import { ARMOR_BY_ID, GEAR_BY_ID, WEAPON_BY_ID } from "../app/game/data.ts";

const EXPECTED_PRESET_IDS = [
  "jungle-hunter",
  "city-hunter",
  "greyback",
  "shaman",
  "lost-borg",
  "snake",
  "warrior",
  "scar",
  "celtic",
  "chopper",
  "avp-elder",
  "wolf",
  "berserker",
  "falconer",
  "tracker",
  "fugitive",
  "assassin",
  "feral-hunter",
  "kok-jotun",
  "kok-oni",
  "kok-warlord",
  "dek",
  "scarface",
  "stone-heart",
  "alpha",
  "samurai",
  "valkyrie",
  "cleopatra",
  "bionic",
  "witch",
  "broken-tusk",
  "ahab",
  "big-mama",
  "enforcer",
  "bad-blood-comic",
  "hashori",
];

test("hunter lore exposes exactly the 36 production presets", () => {
  const ids = HUNTER_PRESETS.map(({ id }) => id);

  assert.equal(ids.length, 36);
  assert.equal(new Set(ids).size, 36, "preset IDs must be unique");
  assert.deepEqual(ids, EXPECTED_PRESET_IDS);
  assert.deepEqual(Object.keys(HUNTER_PRESET_BY_ID), EXPECTED_PRESET_IDS);
  assert.ok(!ids.includes("custom"), "`custom` is not a lore preset");
});

test("every lore preset resolves to valid gameplay registries and sources", () => {
  for (const preset of HUNTER_PRESETS) {
    assert.equal(
      HUNTER_PRESET_BY_ID[preset.id],
      preset,
      `${preset.id}: index must resolve the canonical object`,
    );
    assert.ok(
      ARMOR_BY_ID[preset.recommendedArmorId],
      `${preset.id}: recommended armor must exist`,
    );
    assert.ok(
      preset.signatureWeaponIds.length > 0,
      `${preset.id}: at least one signature weapon is required`,
    );
    assert.ok(
      preset.signatureGearIds.length > 0,
      `${preset.id}: at least one signature gear item is required`,
    );

    for (const weaponId of preset.signatureWeaponIds) {
      assert.ok(
        WEAPON_BY_ID[weaponId],
        `${preset.id}: unknown signature weapon ${weaponId}`,
      );
    }
    for (const gearId of preset.signatureGearIds) {
      assert.ok(
        GEAR_BY_ID[gearId],
        `${preset.id}: unknown signature gear ${gearId}`,
      );
    }

    assert.ok(
      preset.sourceUrls.length > 0,
      `${preset.id}: at least one source is required`,
    );
    for (const sourceUrl of preset.sourceUrls) {
      const parsedUrl = new URL(sourceUrl);
      assert.equal(
        parsedUrl.protocol,
        "https:",
        `${preset.id}: source URLs must use HTTPS`,
      );
    }
  }
});

test("appearanceForPreset returns a complete independent save appearance", () => {
  for (const preset of HUNTER_PRESETS) {
    const appearance = appearanceForPreset(preset.id);
    const secondAppearance = appearanceForPreset(preset.id);

    assert.deepEqual(appearance, {
      presetId: preset.id,
      bodyMorphId: preset.bodyMorphId,
      skinId: preset.skinId,
      biomaskId: preset.biomaskId,
      dreadStyleId: preset.dreadStyleId,
      dreadTintId: preset.dreadTintId,
      armorStyleId: preset.armorStyleId,
      armorTintId: preset.armorTintId,
      trophyAdornmentId: preset.trophyAdornmentId,
    });
    assert.notEqual(
      appearance,
      secondAppearance,
      `${preset.id}: callers must receive fresh save objects`,
    );
  }
});

test("Hashori is explicitly marked as a prose-only visual interpretation", () => {
  const interpreted = HUNTER_PRESETS.filter(
    ({ textInterpretation }) => textInterpretation,
  );

  assert.deepEqual(
    interpreted.map(({ id }) => id),
    ["hashori"],
  );
  assert.match(
    HUNTER_PRESET_BY_ID.hashori.fidelityNote,
    /interprétation originale explicitement non canonique/i,
  );
});
