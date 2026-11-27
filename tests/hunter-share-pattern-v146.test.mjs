import test from "node:test";
import assert from "node:assert/strict";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const qa = homeworldSceneSsrV78();
const customization = qa.load("app/game/systems/hunterCustomizationV146.ts");
const saves = qa.load("app/game/save.ts");

const starter = { honor: 0, rankId: "young-blood", trophies: [] };
const chest = { primary: "#123456", secondary: "#334455", accent: null, light: null };
const trophies = (targetKind, count) => Array.from({ length: count }, (_, index) => ({
  definitionId: targetKind + "-" + index, targetName: targetKind + "-" + index, targetKind,
}));

test("V146 a shared skin motif requires the receiver's own campaign progress", () => {
  const proof = [
    ["spots", starter],
    ["stripes", { ...starter, trophies: trophies("beast", 3) }],
    ["marbled", { ...starter, honor: 150 }],
    ["scales", { ...starter, trophies: trophies("human", 5) }],
    ["bands", { ...starter, rankId: "elite" }],
  ];
  for (const [pattern, progress] of proof) {
    const code = customization.encodeOutfitShareCodeV146({
      skinPatternIdV146: pattern, piecesV146: { chest },
    });
    const receive = profile => customization.decodeOutfitShareCodeV146(
      code, saves.normalizeHunterAppearanceV146, customization.earnedCosmeticsV146(profile),
    );
    const newcomer = receive(starter);
    assert(newcomer.ok, pattern);
    assert.deepEqual(newcomer.appearance.piecesV146.chest, chest, pattern);
    assert.equal(newcomer.appearance.skinPatternIdV146, pattern === "spots" ? pattern : null, pattern);
    assert.deepEqual(newcomer.replaced, pattern === "spots" ? [] : ["pattern:" + pattern]);

    const qualified = receive(progress);
    assert(qualified.ok, pattern);
    assert.equal(qualified.appearance.skinPatternIdV146, pattern, pattern);
    assert.deepEqual(qualified.replaced, []);
  }
});

test("V146 new pattern confirmations use the receiver's unlocks and keep historical choices", () => {
  const earned = customization.earnedCosmeticsV146(starter);
  const starterSave = saves.defaultSave("2026-11-21T10:00:00.000Z");
  const appearance = { ...starterSave.appearance, presetId: "custom", skinPatternIdV146: "bands" };
  const customizationV146 = customization.saveOutfitV146(
    customization.emptyCustomizationV146(), 0, "Historique", appearance, starterSave.createdAt,
  );
  const historic = saves.normalizeSave({ ...starterSave, appearance, customizationV146 });
  assert.equal(historic.appearance.skinPatternIdV146, "bands");
  assert.equal(historic.customizationV146.outfits[0].appearance.skinPatternIdV146, "bands");

  const confirmPattern = customization.allowedSkinPatternV146;
  assert.equal(confirmPattern("bands", earned), null);
  assert.equal(confirmPattern("bands", earned, historic.appearance.skinPatternIdV146), "bands");
  assert.equal(confirmPattern("stripes", earned, historic.appearance.skinPatternIdV146), "bands");
  assert.equal(confirmPattern("spots", earned, historic.appearance.skinPatternIdV146), "spots");
  assert.equal(confirmPattern(null, earned, historic.appearance.skinPatternIdV146), null);
});
