import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import ts from "typescript";
const root=fileURLToPath(new URL("../",import.meta.url));
const read=p=>readFileSync(root+p,"utf8");

test("visual QA route uses real source layers for all five models, not decorative mockups",()=>{
 const page=read("app/gauntlet-qa-v135/client.tsx");
 assert.match(page,/JungleHunterLayeredV134/);
 assert.match(page,/GauntletKnownHuntersV135/);
 assert.match(page,/isKnownHunterGauntletV135/);
 assert.match(page,/data-testid="gauntlet-visual-qa-v135"/);
 assert.match(page,/data-art-model=\{selected\}/);
 assert.match(page,/Comparer les 5 modèles/);
 assert.match(page,/onChange=\{e=>setZoom\(Number\(e.currentTarget.value\)\)\}/);
 assert.ok(!page.includes("saveGame("));
 assert.ok(!page.includes("localStorage.setItem("));
});
test("QA route supports keyboard/accessibility and doesn't claim 1:1 finished",()=>{
 const page=read("app/gauntlet-qa-v135/client.tsx");
 const css=read("app/gauntlet-qa-v135/GauntletVisualQaV135.module.css");
 assert.match(page,/aria-pressed=\{selected===x.id\}/);
 assert.match(page,/aria-pressed=\{open\}/);
 assert.match(read("app/game/GauntletKnownHuntersV135.tsx"),/role="img"/, "An inline source renderer must retain role img");
 assert.match(page,/NON/);
 assert.match(css,/focus-visible/);
 assert.match(css,/prefers-reduced-motion/);
 const parsed=ts.transpileModule(page,{fileName:"page.tsx",reportDiagnostics:true,compilerOptions:{
  jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
 assert.equal((parsed.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);
});
