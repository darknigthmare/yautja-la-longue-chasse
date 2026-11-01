import assert from "node:assert/strict";
import test, {after} from "node:test";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {build} from "esbuild";

const dir=await mkdtemp(join(tmpdir(),"planet-shapes-v137-"));
after(()=>rm(dir,{recursive:true,force:true}));
const bundle=await build({stdin:{contents:[
  'export { planetShapeLibraryPageV137 } from "./app/game/systems/clanWarShapeLibraryV137";',
  'export { WAR_SHAPE_TEMPLATES_V115 } from "./app/game/systems/clanWarShapeAtlasV115";',
].join("\n"),resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const filename=join(dir,"library.mjs");await writeFile(filename,bundle.outputFiles[0].text);
const api=await import(pathToFileURL(filename));

test("all 120 V115 shapes remain searchable and paginated without creating duplicates",()=>{
  const all=new Set();
  for(const group of ["island","continent","region"])for(let page=0;page<5;page++){
    const result=api.planetShapeLibraryPageV137(group,"","all",page,8);
    assert.equal(result.total,40);
    assert.equal(result.pages,5);
    assert.equal(result.shapes.length,8);
    for(const shape of result.shapes){all.add(shape.id);assert.equal(shape.category,group);}
  }
  assert.equal(all.size,120);
});
test("search handles French accents and produces the matching true V115 indices",()=>{
  const tridents=api.planetShapeLibraryPageV137("continent","trident","all",0);
  assert.equal(tridents.total,4);
  assert.deepEqual(tridents.shapes.map(shape=>shape.index),[28,29,30,31]);
  const scales=api.planetShapeLibraryPageV137("continent","trident","immense",0);
  assert.equal(scales.total,1);
  assert.equal(scales.shapes[0].index,31);
  const scales2=api.planetShapeLibraryPageV137("island","ecaille","all",0);
  assert.equal(scales2.total,4);
  assert.equal(api.planetShapeLibraryPageV137("region","not a motif","all",0).total,0);
});
test("pages cannot escape the actual library and invalid controls are rejected",()=>{
  const last=api.planetShapeLibraryPageV137("island","","all",99,8);
  assert.equal(last.page,4);assert.equal(last.shapes.length,8);
  assert.throws(()=>api.planetShapeLibraryPageV137("island","","all",-1),/invalides/);
  assert.throws(()=>api.planetShapeLibraryPageV137("island","","unknown"),/invalides/);
  assert.throws(()=>api.planetShapeLibraryPageV137("island","","all",0,40),/invalides/);
});
