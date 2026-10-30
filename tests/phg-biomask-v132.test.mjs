import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PHG_BIOMASK_V132_CANDIDATES,maskClassForAppearanceV132,maskMaterialAllowedV132}
  from "../app/game/phgBiomaskStudiesV132.ts";
import {normalizeHunterChromaticsV113,getChromaticMaterialV113,
  maskChromaticsForAppearanceV131} from "../app/game/hunterChromaticsV113.ts";
const read=p=>JSON.parse(readFileSync(new URL("../"+p,import.meta.url),"utf8"));
const catalog=read("app/game/data/phgBiomaskV132Catalog.json");
const installed=read("app/game/data/phgBiomaskV132Installed.json");
test("V132 exact seven patch-2.19 named studies, no official-color claim",()=>{
 assert.equal(catalog.certified1to1,false);
 assert.equal(catalog.items.length,7);
 assert.equal(new Set(catalog.items.map(x=>x.id)).size,7);
 assert.deepEqual(catalog.items.filter(x=>x.classes.includes("samurai")).map(x=>x.id),
   ["requiem","nova"]);
 assert.equal(PHG_BIOMASK_V132_CANDIDATES.length,7);
 for(const item of PHG_BIOMASK_V132_CANDIDATES){
  assert.equal(item.channel,"biomask");
  assert.equal(item.evidence,"provisional");
  assert.deepEqual([item.atlas.columns,item.atlas.rows],[4,2]);
  assert.match(item.note,/non certifiés/);
  if(!installed.installed.includes(item.id.slice("phg-study-v132-".length))){
    assert.equal(item.status,"drive-only");
    assert.equal(item.src,null);
    assert.equal(getChromaticMaterialV113("biomask",item.id),null);
  }
  assert.equal(getChromaticMaterialV113("armor",item.id),null);
 }
});
test("V132 only Alpha/Samurai face geometry and stable custom lineage",()=>{
 const alpha={presetId:"alpha",biomaskId:"feral"};
 const samurai={presetId:"samurai",biomaskId:"celtic"};
 assert.equal(maskClassForAppearanceV132(alpha),"alpha");
 assert.equal(maskClassForAppearanceV132(samurai),"samurai");
 for(const item of catalog.items){
  const id="phg-study-v132-"+item.id;
  assert.equal(maskMaterialAllowedV132(alpha,id),true);
  assert.equal(maskMaterialAllowedV132(samurai,id),item.classes.includes("samurai"));
 }
 const custom={presetId:"custom",biomaskId:"celtic",
   chromaticsV113:{maskOriginId:"samurai",maskMaterialId:"phg-study-v132-requiem"}};
 assert.equal(maskClassForAppearanceV132(custom),"samurai");
 assert.equal(maskMaterialAllowedV132(custom,"phg-study-v132-requiem"),true);
 assert.equal(maskMaterialAllowedV132({...custom,biomaskId:"city"},"phg-study-v132-requiem"),false);
 assert.equal(normalizeHunterChromaticsV113({maskOriginId:"samurai"}).maskOriginId,"samurai");
 assert.equal(maskChromaticsForAppearanceV131({...custom,biomaskId:"city"}).maskMaterialId,null);
});
