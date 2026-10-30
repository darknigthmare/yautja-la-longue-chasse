import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { PHG_MATERIALS_V113 } from "../app/game/hunterMaterialsV113.ts";
import {
  PHG_CHROMATIC_MATERIALS_V113,
  getChromaticMaterialV113,
  normalizeHunterChromaticsV113,
  chromaticOverlayStyleV113,
} from "../app/game/hunterChromaticsV113.ts";

test("V114 reuses 44 tracked PNGs without copying the old V85 artwork", () => {
  assert.equal(PHG_MATERIALS_V113.length, 44);
  for (const item of PHG_MATERIALS_V113) {
    assert.ok(item.src.startsWith("/game/imports/v85/drive-latest/"));
    assert.equal(existsSync("public" + item.src), true, item.id);
    assert.match(item.gitBlobSha, /^[0-9a-f]{40}$/);
  }
});

test("39 historical materials, three V113 IDs and V125/V126 studies coexist", () => {
  const legacy = PHG_CHROMATIC_MATERIALS_V113.filter(item =>
    !item.id.startsWith("phg-study-v125-") && !item.id.startsWith("phg-study-v126-"));
  const studies = PHG_CHROMATIC_MATERIALS_V113.filter(item => item.id.startsWith("phg-study-v125-"));
  const recent = PHG_CHROMATIC_MATERIALS_V113.filter(item => item.id.startsWith("phg-study-v126-"));
  assert.equal(legacy.length, 42);
  assert.equal(studies.length, 12);
  assert.equal(recent.length, 4);
  assert.equal(PHG_CHROMATIC_MATERIALS_V113.length, 58);
  const ids = PHG_CHROMATIC_MATERIALS_V113.map(item => item.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(PHG_CHROMATIC_MATERIALS_V113.filter(item => item.status === "integrated").length, 58);
  assert.equal(getChromaticMaterialV113("skin", "phg-shatter-demon-study")?.src,
    "/game/assets/v113/phg/skin_shatter_demon_provisoire.png");
  assert.ok(getChromaticMaterialV113("outfit", "phg-fine-net"));
  assert.ok(getChromaticMaterialV113("armor", "phg-samurai-red-lacquer"));
});

test("previously waiting materials are now selectable under verifiable native IDs", () => {
  assert.ok(getChromaticMaterialV113("skin", "phg-skin_classe_viking_base_observee"));
  assert.ok(getChromaticMaterialV113("dreads", "phg-dread_anubis_gris_motif_ecaille"));
  assert.ok(getChromaticMaterialV113("dreads", "phg-dread_exalted_noir_annele_fin"));
  assert.ok(getChromaticMaterialV113("outfit", "phg-armor_classe_wolf_tablier_gris_brun"));
  assert.equal(getChromaticMaterialV113("armor", "phg-armor_classe_wolf_tablier_gris_brun"), null);
});

test("ring accessory, biomask paint and archived Shatter are not falsely presented as full-body textures", () => {
  assert.equal(getChromaticMaterialV113("dreads","phg-anneau_ligature_fil_rouge_observe_2022"), null);
  assert.equal(getChromaticMaterialV113("outfit","phg-armor_classe_father_masque_beige_strie"), null);
  assert.equal(getChromaticMaterialV113("skin","phg-skin_shatter_demon_provisoire"), null);
  assert.ok(PHG_MATERIALS_V113.some(item => item.id === "skin_shatter_demon_provisoire" && item.archived));
});

test("exact saved canonical material ID is validated and resolved to a local URL", () => {
  const normalized = normalizeHunterChromaticsV113({
    skinMaterialId: "phg-skin_shatter_demon_revision_mrblack",
    dreadMaterialId: "phg-dread_anubis_gris_motif_ecaille",
    outfitMaterialId: "phg-armor_classe_anubis_etoffe_claire",
    armorMaterialId: "phg-samurai-red-lacquer",
  });
  assert.equal(normalized.skinMaterialId, "phg-skin_shatter_demon_revision_mrblack");
  assert.equal(normalized.dreadMaterialId, "phg-dread_anubis_gris_motif_ecaille");
  assert.equal(normalized.outfitMaterialId, "phg-armor_classe_anubis_etoffe_claire");
  assert.equal(normalized.armorMaterialId, "phg-samurai-red-lacquer");
  assert.equal(chromaticOverlayStyleV113(normalized,"skin","/game/assets/v3/rig.webp")?.backgroundImage,
    'url("/game/imports/v85/drive-latest/skin_shatter_demon_revision_mrblack.png")');
  assert.equal(normalizeHunterChromaticsV113({skinMaterialId:"/../../foo.png"}).skinMaterialId,null);
});
