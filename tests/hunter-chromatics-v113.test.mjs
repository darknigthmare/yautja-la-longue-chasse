import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  DEFAULT_CHROMATICS_V113, PHG_CHROMATIC_MATERIALS_V113,
  normalizeHunterChromaticsV113, normalizeChromaticHexV113, getChromaticMaterialV113,
  CHROMATIC_PALETTE_PRESETS_V115, CHROMATIC_CHANNELS_V113,
  chromaticOverlayStyleV113, hasCustomChromaticsV113,
} from "../app/game/hunterChromaticsV113.ts";

test("migration: old appearance without chromatics remains neutral", () => {
  assert.deepEqual(normalizeHunterChromaticsV113(undefined), DEFAULT_CHROMATICS_V113);
  assert.equal(hasCustomChromaticsV113(undefined), false);
});
test("colors are canonical hexadecimal strings; invalid values cannot enter CSS", () => {
  const normalized = normalizeHunterChromaticsV113({skinHex:"#Ab12CC", dreadHex:"url(javascript:x)", outfitHex:"#ff00aa",armorHex:"#fff"});
  assert.equal(normalized.skinHex,"#ab12cc");
  assert.equal(normalized.dreadHex,null);
  assert.equal(normalized.outfitHex,"#ff00aa");
  assert.equal(normalized.armorHex,null);
});
test("unregistered IDs, wrong channels and drive-only materials never resolve", () => {
  assert.equal(getChromaticMaterialV113("skin","../../../secret"),null);
  assert.equal(getChromaticMaterialV113("outfit","phg-samurai-red-lacquer"),null);
  assert.equal(getChromaticMaterialV113("dreads","phg-anubis-dreads"),null);
  assert.equal(normalizeHunterChromaticsV113({skinMaterialId:"phg-anubis-dreads"}).skinMaterialId,null);
});
test("every activated material resolves to committed real PNG or V125 atlas WebP", () => {
  for (const material of PHG_CHROMATIC_MATERIALS_V113) {
    if (material.status !== "integrated") {assert.equal(material.src,null);continue;}
    assert.ok(
      material.src?.startsWith("/game/assets/v113/phg/") ||
      material.src?.startsWith("/game/imports/v85/drive-latest/") ||
      material.src === "/game/assets/v125/phg-studies/atlas.webp",
      "registered only in project-owned native material roots"
    );
    const filename = path.join(process.cwd(),"public", material.src.slice(1));
    assert.equal(existsSync(filename),true,filename);
  }
});
test("masked overlay keeps inherited sprite silhouette and does not fabricate one", () => {
  assert.equal(chromaticOverlayStyleV113({}, "skin", "/rig/head.webp"),null);
  const style = chromaticOverlayStyleV113({skinHex:"#00aa44"}, "skin", "/rig/head.webp");
  assert.equal(style?.backgroundColor,"#00aa44");
  assert.equal(style?.maskImage,'url("/rig/head.webp")');
  assert.equal(style?.WebkitMaskImage,style?.maskImage);
});
test("selected texture is whitelisted, never interpolated from save data", () => {
  const expected = getChromaticMaterialV113("outfit","phg-fine-net");
  assert.ok(expected);
  const style = chromaticOverlayStyleV113({outfitMaterialId:"phg-fine-net"}, "outfit", "/rig/net.webp");
  assert.equal(style?.backgroundImage,'url("' + expected.src + '")');
  const malicious = chromaticOverlayStyleV113({outfitMaterialId:"https://example.test/anything.png"}, "outfit", "/rig/net.webp");
  assert.equal(malicious,null);
});

test("V115 has five unique, accessible preset colors for each lore-friendly workshop", () => {
  const ids = new Set();
  const counts = new Map();
  for (const entry of CHROMATIC_PALETTE_PRESETS_V115) {
    assert.ok(CHROMATIC_CHANNELS_V113.some(channel => channel.id === entry.channel));
    assert.equal(normalizeChromaticHexV113(entry.hex), entry.hex);
    assert.ok(entry.label.length >= 5);
    const identity = entry.channel + "/" + entry.hex;
    assert.ok(!ids.has(identity), "duplicate preset " + identity);
    ids.add(identity);
    counts.set(entry.channel, (counts.get(entry.channel) ?? 0) + 1);
  }
  assert.equal(CHROMATIC_PALETTE_PRESETS_V115.length, 20);
  for (const channel of CHROMATIC_CHANNELS_V113) assert.equal(counts.get(channel.id), 5);
});

test("V115 choosing a preset only changes its cosmetic channel; no PHG material is invented", () => {
  const firstSkin = CHROMATIC_PALETTE_PRESETS_V115.find(item => item.channel === "skin");
  assert.ok(firstSkin);
  const original = normalizeHunterChromaticsV113({dreadHex:"#212121", armorMaterialId:"phg-samurai-red-lacquer"});
  const updated = normalizeHunterChromaticsV113({ ...original, skinHex:firstSkin.hex });
  assert.equal(updated.skinHex, firstSkin.hex);
  assert.equal(updated.dreadHex, "#212121");
  assert.equal(updated.armorMaterialId, "phg-samurai-red-lacquer");
  assert.equal(updated.skinMaterialId, null);
});
