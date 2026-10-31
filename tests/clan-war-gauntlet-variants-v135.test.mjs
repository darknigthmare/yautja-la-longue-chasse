import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {fileURLToPath} from "node:url";
import ts from "typescript";
const ROOT=fileURLToPath(new URL("../",import.meta.url));
const families=["city-hunter","wolf","feral","dek"];
const layers=["01-forearm.svg","02-shell.svg","03-panel.svg","04-cover.svg"];
const read=p=>readFileSync(ROOT+p,"utf8");

test("V135 contains 16 physical independent SVG source layers, four families",()=>{
  for(const family of families){
    for(const name of layers){
      const path=`public/game/assets/v135/gauntlets/${family}/${name}`;
      assert.ok(existsSync(ROOT+path),path);
      const xml=read(path);
      assert.match(xml,/viewBox="0 0 540 290"/);
      assert.match(xml,/NOT a certified 1:1/);
      assert.ok(!xml.includes("1:1-validated"));
    }
  }
});
test("film-inspired controls do not accidentally reuse the Jungle Hunter five-row display",()=>{
  const panel=family=>read(`public/game/assets/v135/gauntlets/${family}/03-panel.svg`);
  assert.equal((panel("city-hunter").match(/<rect x="/g)||[]).length-1,4);
  assert.equal((panel("wolf").match(/<rect x="/g)||[]).length,5);
  assert.match(panel("feral"),/stroke="#664b31"/);
  assert.match(panel("dek"),/<circle cx="287" cy="151" r="39"/);
  assert.notEqual(panel("city-hunter"),panel("wolf"));
  assert.notEqual(panel("wolf"),panel("feral"));
});
test("live war and armory both reference same layered V135 renderer, retaining original fallback",()=>{
  const stage=read("app/game/ClanWarGauntletV131.tsx");
  const locker=read("app/game/ClanWarGauntletLockerV132.tsx");
  const renderer=read("app/game/GauntletKnownHuntersV135.tsx");
  const stylesheet=read("app/game/GauntletKnownHuntersV135.module.css");
  for(const s of [stage,locker]){
    assert.match(s,/isKnownHunterGauntletV135/);
    assert.match(s,/GauntletKnownHuntersV135/);
    assert.match(s,/JungleHunterLayeredV134/);
    assert.match(s,/HunterGauntletArtV132/);
  }
  assert.match(renderer,/data-fidelity="unapproved"/);
  assert.match(renderer,/role="img"/);
  assert.match(renderer,/data-cover-position=\{coverOpen\?"open":"closed"\}/);
  assert.match(stylesheet,/prefers-reduced-motion/);
  for(const path of ["app/game/GauntletKnownHuntersV135.tsx","app/game/ClanWarGauntletV131.tsx","app/game/ClanWarGauntletLockerV132.tsx"]){
    const result=ts.transpileModule(read(path),{fileName:path,reportDiagnostics:true,
      compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
    assert.deepEqual((result.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error)
      .map(x=>ts.flattenDiagnosticMessageText(x.messageText,"\n")),[],path);
  }
});
test("a real Sharp PNG export script maintains traceability for all 16 layers",()=>{
  const script=read("scripts/export-gauntlet-variants-v135.mjs");
  assert.match(script,/await sharp\(Buffer.from\(item.source\)\)/);
  assert.match(script,/sourceSha256/);
  assert.match(script,/oneToOneCertified:0/);
  assert.match(script,/composite/);
});
