import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {createHash} from "node:crypto";
import {
  PHG_CHROMATIC_MATERIALS_V113, PHG_DRIVE_CANDIDATES_V120,
  PHG_DRIVE_ACCESSORIES_V120, getChromaticMaterialV113,
} from "../app/game/hunterChromaticsV113.ts";

const catalog=JSON.parse(readFileSync(new URL("../app/game/data/phgDriveV120Catalog.json",import.meta.url),"utf8"));
const registry=JSON.parse(readFileSync(new URL("../app/game/data/phgDriveV120Installed.json",import.meta.url),"utf8"));
const byId=new Map(catalog.assets.map(x=>[x.id,x]));

test("V120: 156 source names, categories and local-only paths are unique",()=>{
  assert.equal(catalog.assets.length,156);
  assert.equal(byId.size,156);
  const counts=new Map();
  for(const item of catalog.assets){
    assert.match(item.id,/^[a-z0-9_]+$/);
    assert.match(item.sourceSha256,/^[a-f0-9]{64}$/);
    assert.match(item.sourcePath,/^textures\/(peau|dreadlocks|anneaux|armure)\/[a-z0-9_]+\.png$/);
    assert.ok(item.runtimePath.startsWith("/game/assets/v120/phg-drive/"));
    assert.ok(item.previewPath.startsWith("/game/assets/v120/phg-drive/previews/"));
    assert.match(item.runtimePath,/\.webp$/);
    assert.match(item.previewPath,/\.webp$/);
    assert.equal(item.reviewStatus,"reconstructed-unreviewed");
    counts.set(item.sourceCategory,(counts.get(item.sourceCategory)??0)+1);
  }
  assert.deepEqual(Object.fromEntries(counts),{Peau:80,Dreads:15,Anneaux:6,Armure:55});
});
test("V120: 7 ring/mask accessories are never assigned as generic cosmetic surfaces",()=>{
  assert.equal(PHG_DRIVE_ACCESSORIES_V120.length,7);
  assert.equal(PHG_DRIVE_ACCESSORIES_V120.filter(x=>x.sourceCategory==="Anneaux").length,6);
  assert.ok(PHG_DRIVE_ACCESSORIES_V120.some(x=>x.id==="armor_classe_feral_os_masque_2024"));
  assert.equal(PHG_DRIVE_CANDIDATES_V120.length,149);
});
test("V120: uninstalled sources never become a save-valid texture URL",()=>{
  for(const candidate of PHG_DRIVE_CANDIDATES_V120){
    const selected=registry.installed.includes(candidate.id.slice("phg-drive-".length));
    if(!selected){
      assert.equal(candidate.status,"drive-only");
      assert.equal(candidate.src,null);
      assert.equal(getChromaticMaterialV113(candidate.channel,candidate.id),null);
    }
  }
  assert.ok(PHG_CHROMATIC_MATERIALS_V113.filter(x=>x.id.startsWith("phg-drive-")).length<=149);
});
test("V120: every activated runtime WebP must exist as a local hashable source",()=>{
  assert.equal(new Set(registry.installed).size,registry.installed.length);
  for(const id of registry.installed){
    const asset=byId.get(id);
    assert.ok(asset?.candidateChannel,"invalid accessory "+id);
    for(const field of ["runtimePath","previewPath"]){
      const file="public"+asset[field];
      assert.ok(existsSync(file),file);
      const bytes=readFileSync(file);
      assert.equal(bytes.toString("ascii",0,4),"RIFF",file);
      assert.equal(bytes.toString("ascii",8,12),"WEBP",file);
      assert.equal(createHash("sha256").update(bytes).digest("hex").length,64);
    }
    const registered=getChromaticMaterialV113(asset.candidateChannel,"phg-drive-"+id);
    assert.equal(registered?.src,asset.runtimePath);
    assert.equal(registered?.evidence,"provisional");
  }
});
