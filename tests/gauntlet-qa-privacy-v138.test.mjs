import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import ts from "typescript";

const root=fileURLToPath(new URL("../",import.meta.url));
const read=(path)=>readFileSync(root+path,"utf8");

test("Both art laboratories use a server-only deny-by-default route",()=>{
  for (const id of ["v135","v136"]){
    const route=read(`app/gauntlet-qa-${id}/page.tsx`);
    const client=read(`app/gauntlet-qa-${id}/client.tsx`);
    assert.doesNotMatch(route,/"use client"/);
    assert.match(route,/import \{ notFound \} from "next\/navigation"/);
    assert.match(route,/process\.env\.YAUTJA_LOCAL_VISUAL_QA_V90 !== "1"/);
    assert.match(route,/process\.env\.VERCEL === "1"/);
    assert.match(route,/notFound\(\)/);
    assert.match(route,/robots:\s*\{ index: false, follow: false \}/);
    assert.match(route,/dynamic = "force-dynamic"/);
    assert.match(route,/from "\.\/client"/);
    assert.match(client,/^"use client";/);
    assert.doesNotMatch(route,/searchParams|cookies\(|localStorage|navigator|URLSearchParams|\.query/);
    const parsed=ts.transpileModule(route,{fileName:"page.tsx",reportDiagnostics:true,
      compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
    assert.deepEqual((parsed.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
      .map(d=>ts.flattenDiagnosticMessageText(d.messageText,"\n")),[]);
  }
});

test("The early proxy blocks both QA routes without altering gameplay or SVG asset paths",()=>{
  const proxy=read("proxy.ts");
  assert.match(proxy,/YAUTJA_LOCAL_VISUAL_QA_V90==='1'/);
  assert.match(proxy,/VERCEL!=='1'/);
  assert.match(proxy,/status:404/);
  assert.match(proxy,/noindex, nofollow/);
  assert.match(proxy,/private, no-store/);
  for(const id of ["v135","v136"]){
    assert.ok(proxy.includes(`'/gauntlet-qa-${id}/:path*'`));
  }
  assert.ok(!proxy.includes("'/game/:path*'"));
  assert.ok(!proxy.includes("'/api/:path*'"));
  assert.ok(!proxy.includes("'/game/assets/:path*'"));
});

test("Browser previews still import the read-only client, not the server route",()=>{
  const fixture=read("tests/browser/gauntlet-v136.fixture.tsx");
  assert.match(fixture,/from "\.\.\/\.\.\/app\/gauntlet-qa-v136\/client"/);
  assert.doesNotMatch(fixture,/from "\.\.\/\.\.\/app\/gauntlet-qa-v136\/page"/);
  const smoke=read("scripts/qa-next-production-v94.mjs");
  for(const id of ["v135","v136"]){
    assert.ok(smoke.includes(`'/gauntlet-qa-${id}'`));
  }
  const client=read("app/gauntlet-qa-v136/client.tsx");
  assert.match(client,/data-testid="gauntlet-visual-qa-v136"/);
  assert.doesNotMatch(client,/writeSaveWithStatus\(|advanceWarTurnV85\(/);
});
