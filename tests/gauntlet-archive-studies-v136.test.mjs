import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import ts from "typescript";
import {GAUNTLET_CATALOG_V132} from "../app/game/systems/clanWarGauntletCatalogV132.ts";

const root=fileURLToPath(new URL("../",import.meta.url));
const read=(p)=>readFileSync(root+p,"utf8");
const reserved=new Set(["jungle-hunter","city-hunter","wolf","feral","dek"]);
const studies=GAUNTLET_CATALOG_V132.filter(x=>!reserved.has(x.id));
const layers=["01-arm.svg","02-shell.svg","03-interface.svg","04-lid.svg"];

test("49 non-canon individual gauntlet concepts now have 196 independent source layers",()=>{
  assert.equal(studies.length,49);
  assert.equal(new Set(studies.map(x=>x.id)).size,49);
  const signatures=new Set();
  for(const model of studies){
    const src=[];
    for(const layer of layers){
      const path=`public/game/assets/v136/gauntlets/${model.id}/${layer}`;
      assert.ok(existsSync(root+path),`missing ${path}`);
      const xml=read(path);
      assert.match(xml,/viewBox="0 0 540 290"/);
      assert.match(xml,/ORIGINAL concept blockout/);
      assert.match(xml,/NOT a verified 1:1 film prop/);
      assert.ok(!xml.includes("1:1-certified"));
      assert.match(xml,new RegExp(model.id));
      assert.match(xml,/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
      src.push(xml);
    }
    signatures.add(src.join("\n"));
  }
  assert.equal(signatures.size,49);
});
test("the remaining 49 actual source variants render in both live interfaces without duplicating war state",()=>{
  const stage=read("app/game/ClanWarGauntletV131.tsx"),locker=read("app/game/ClanWarGauntletLockerV132.tsx");
  const renderer=read("app/game/GauntletArchiveStudiesV136.tsx");
  assert.match(stage,/GauntletArchiveStudiesV136/);
  assert.match(locker,/GauntletArchiveStudiesV136/);
  assert.match(renderer,/data-fidelity="original-concept-not-film"/);
  assert.match(renderer,/data-cover-position=\{coverOpen\?"open":"closed"\}/);
  assert.match(renderer,/GAUNTLET_ARCHIVE_STUDY_LAYERS_V136/);
  assert.equal((stage.match(/\{children\}/g)||[]).length,1);
  const panel=read("app/game/ClanWarPanelV85.tsx");
  assert.equal((panel.match(/<ClanWarAtlasV95\b/g)||[]).length,1);
});
test("V136 regeneration is deterministic and the CLI declares 0 verified film assets",()=>{
  const cli=read("scripts/build-gauntlet-studies-v136.mjs");
  assert.match(cli,/const candidates=original\.filter/);
  assert.match(cli,/source drift:|Source drift:/);
  assert.match(cli,/artisticallyValidatedOneToOne:0/);
  assert.match(cli,/sharp\(Buffer\.from\(src\)\)/);
  assert.match(cli,/candidates\.length!==49/);
});
test("the original concept renderer and visual QA parse as TSX",()=>{
  for(const path of ["app/game/GauntletArchiveStudiesV136.tsx","app/game/ClanWarGauntletV131.tsx","app/game/ClanWarGauntletLockerV132.tsx","app/gauntlet-qa-v136/page.tsx"]){
    const result=ts.transpileModule(read(path),{fileName:path,reportDiagnostics:true,
      compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
    const errors=(result.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
    assert.deepEqual(errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText,"\n")),[],path);
  }
});
