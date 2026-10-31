import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PHG_REFERENCE_CATALOG_V130,phgMaterialReferenceV130} from "../app/game/phgReferenceCatalogV130.ts";
import {getChromaticMaterialV113} from "../app/game/hunterChromaticsV113.ts";
test("V130 evidence links are explicit whitelisted references, never claimed original 1:1",()=>{
 assert.equal(PHG_REFERENCE_CATALOG_V130.length,27);
 assert.equal(new Set(PHG_REFERENCE_CATALOG_V130.map(x=>x.materialId)).size,27);
 const domains=new Set(["forum.predator.illfonic.com","store.playstation.com","steamdb.info"]);
 for(const e of PHG_REFERENCE_CATALOG_V130){
  assert.equal(e.exactTextureVerified,false);
  assert.equal(e.directUvAvailable,false);
  assert.ok(domains.has(new URL(e.url).hostname),e.url);
  assert.ok(e.caveat.length>20);
  const item=getChromaticMaterialV113("skin",e.materialId)
    ??getChromaticMaterialV113("dreads",e.materialId)
    ??getChromaticMaterialV113("outfit",e.materialId)
    ??getChromaticMaterialV113("armor",e.materialId);
  assert.ok(item,"Missing whitelisted material "+e.materialId);
  assert.equal(phgMaterialReferenceV130(e.materialId)?.materialId,e.materialId);
 }
 assert.equal(phgMaterialReferenceV130("../../../secrets"),null);
 assert.equal(phgMaterialReferenceV130("phg-unknown"),null);
});
test("V130 distinguishes Exiled highlighted menu from authentic equip and Ogre mask from armor",()=>{
 const ex=phgMaterialReferenceV130("phg-study-v128-exiled-marbled-bronze");
 assert.equal(ex.kind,"menu-highlight");
 assert.match(ex.caveat,/Elder/);
 assert.equal(phgMaterialReferenceV130("phg-study-v129-alpha_ogre_biomask_tint"),null);
 const m=phgMaterialReferenceV130("phg-study-v129-mottle_dread_skin");
 assert.equal(m.kind,"named-patch");
});
test("V130 studio offers a real external reference instead of inventing a matching image",()=>{
 const ui=readFileSync(new URL("../app/game/HunterChromaticForgeV113.tsx",import.meta.url),"utf8");
 assert.match(ui,/phgMaterialReferenceV130/);
 assert.match(ui,/sourceReference\.url/);
 assert.match(ui,/target="_blank"/);
 assert.match(ui,/rel="noopener noreferrer"/);
});
