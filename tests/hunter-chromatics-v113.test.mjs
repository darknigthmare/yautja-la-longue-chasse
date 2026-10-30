import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  DEFAULT_CHROMATICS_V113, PHG_CHROMATIC_MATERIALS_V113,
  normalizeHunterChromaticsV113, getChromaticMaterialV113,
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
test("every activated material resolves to committed real PNG", () => {
  for (const material of PHG_CHROMATIC_MATERIALS_V113) {
    if (material.status !== "integrated") {assert.equal(material.src,null);continue;}
    assert.ok(material.src?.startsWith("/game/assets/v113/phg/"));
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
