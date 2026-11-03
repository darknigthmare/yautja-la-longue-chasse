import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PHG_CHROMATIC_MATERIALS_V113} from "../app/game/hunterChromaticsV113.ts";
const source=JSON.parse(readFileSync(new URL("../app/game/data/phgVisualFidelityQueueV122.json",import.meta.url),"utf8"));
test("V122 preserves all 34 unresolved fidelity cases",()=>{
 assert.equal(source.unresolved,34);assert.equal(source.records.length,34);
 assert.deepEqual(source.sourceCounts,{mapping_candidate:6,missing_visual_reference:28});
 assert.equal(source.allowsOfficial1to1Claim,false);
 assert.equal(new Set(source.records.map(x=>x.id)).size,34);
 for(const item of source.records){
   assert.equal(item.visualStatus,"unresolved-pixel-match");
   assert.equal(item.canEnterOfficial1to1Catalog,false);
   assert.ok(Array.isArray(item.evidenceUrls));
 }
});
test("four generative studies are traceable but never registered as authentic PHG pixels",()=>{
 const present=source.records.filter(x=>x.study);
 assert.equal(present.length,4); assert.equal(source.studiesCreated,4);
 assert.deepEqual(present.map(x=>x.id).sort(),["skin_mottle_ash","skin_mottle_grape","skin_raptor_putrid","skin_shatter_bleak"]);
 for(const rec of present){
  assert.match(rec.study.pngSha256,/^[a-f0-9]{64}$/);
  assert.match(rec.study.webpSha256,/^[a-f0-9]{64}$/);
  assert.equal(PHG_CHROMATIC_MATERIALS_V113.some(x=>x.id===rec.study.studyId),false);
 }
});
