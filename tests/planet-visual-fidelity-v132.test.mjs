import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const ledger = JSON.parse(await readFile("app/game/data/planetVisualFidelityV132.json","utf8"));
const dir = await mkdtemp(join(tmpdir(),"planet-fidelity-v132-"));
const bundle = await build({ stdin:{
  contents:[
    'export { WAR_SHAPE_TEMPLATES_V115 } from "./app/game/systems/clanWarShapeAtlasV115";',
    'export { WAR_PLANET_TEXTURES_V130 } from "./app/game/systems/clanWarTextureLibraryV130";',
  ].join("\n"), resolveDir:process.cwd(),loader:"ts"
},bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const file=join(dir,"catalogues.mjs");await writeFile(file,bundle.outputFiles[0].text);
const api=await import(pathToFileURL(file));await rm(dir,{recursive:true,force:true});
test("fidelity register covers all 120 real shapes and 48 selectable source materials",()=>{
  assert.equal(ledger.version,132);
  assert.equal(ledger.shapes.length,120);
  assert.equal(ledger.materials.length,48);
  const shapeIds=Object.values(api.WAR_SHAPE_TEMPLATES_V115).flat().map(item=>item.id).sort();
  assert.deepEqual(ledger.shapes.map(item=>item.id).sort(),shapeIds);
  assert.deepEqual(ledger.materials.map(item=>item.id).sort(),api.WAR_PLANET_TEXTURES_V130.map(item=>item.id).sort());
});
test("no generator placeholder is misrepresented as a certified film asset",()=>{
  for(const item of [...ledger.shapes,...ledger.materials]){
    assert.equal(item.approved1to1,false,item.id);
    assert.equal(item.canonStatus,"unverified",item.id);
    assert.equal(item.referenceId,null,item.id);
    assert(item.origin.startsWith("original-"),item.id);
  }
  assert.equal(ledger.certification,"none");
  assert(ledger.requirementsForApproval.includes("game-capture-and-difference-report-reviewed"));
});
test("official production sources are evidence candidates, not copyrighted assets",()=>{
  assert(ledger.references.length>=3);
  assert(ledger.references.every(ref=>ref.url.startsWith("https://")));
  assert(ledger.references.every(ref=>!ref.url.includes("data:image")));
});
