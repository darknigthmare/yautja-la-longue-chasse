import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import ts from "typescript";
const root=fileURLToPath(new URL("../",import.meta.url));
const read=p=>readFileSync(root+p,"utf8");
test("V148 V115 destructive reset verifies current version BEFORE and AFTER confirmation",()=>{
  const component=read("app/game/ClanWarOperationsV115.tsx");
  assert.match(component,/function verifyOwnV115ArchiveV148\(\):boolean/);
  assert.match(component,/getItem\(WAR_OPERATIONS_STORAGE_V115\)===knownArchiveBytesRef\.current/);
  const reset=component.slice(component.indexOf("  function reset() {"),component.indexOf("  if(!hydrated) return"));
  assert.match(reset,/if\(!hydrated\|\|blocked\|\|!active\|\|!verifyOwnV115ArchiveV148\(\)\)return;/);
  assert.match(reset,/window\.confirm\(/);
  assert.match(reset,/if\(!verifyOwnV115ArchiveV148\(\)\)return;/);
  assert.ok(reset.indexOf("if(!verifyOwnV115ArchiveV148())return;")<
    reset.indexOf("window.localStorage.setItem(WAR_OPERATIONS_STORAGE_V115,encoded)"));
  assert.ok(reset.indexOf("window.localStorage.setItem(WAR_OPERATIONS_STORAGE_V115,encoded)")<
    reset.indexOf("worldRef.current=next;setWorld(next)"));
  assert.match(component,/disabled=\{blocked\|\|!hydrated\|\|!active\} onClick=\{reset\}/);
  assert.doesNotMatch(reset,/setBlocked\(false\).*?verifyOwnV115ArchiveV148/s);
});
test("V148 operations guard re-checks local bytes on focus and visibility and ignores nonlocal storage events",()=>{
  const component=read("app/game/ClanWarOperationsV115.tsx");
  assert.match(component,/event\.storageArea!==window\.localStorage/);
  assert.match(component,/window\.addEventListener\("focus",verifyOnReturn\)/);
  assert.match(component,/document\.addEventListener\("visibilitychange",verifyOnReturn\)/);
  assert.match(component,/document\.visibilityState!=="visible"/);
  assert.match(component,/if\(blocked\|\|!hydrated\|\|!active\|\|!verifyOwnV115ArchiveV148\(\)\)return;/);
  assert.match(component,/if\(!update\.accepted\)\{setMessage\(update\.message\);return;\}/);
  assert.doesNotMatch(component,/localStorage\.setItem\("yautja-long-hunt\./);
  const result=ts.transpileModule(component,{fileName:"ClanWarOperationsV115.tsx",
    reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
  const errors=(result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
  assert.deepEqual(errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,"\n")),[]);
});
test("V148 two-tab Chrome QA uses real V115 panels, refuses stale reset and reopens authoritative state",()=>{
  const src=read("scripts/qa-clan-war-v115-multitab-v148.mjs");
  assert.match(src,/entryPoints:\["tests\/browser\/clan-war-v147-four-modes\.fixture\.tsx"\]/);
  assert.match(src,/const a=await ctx\.newPage\(\),b=await ctx\.newPage\(\)/);
  assert.match(src,/await selectTeamAndLaunch\(a,"outer"\)/);
  assert.match(src,/await reset\(b\)\.isDisabled\(\)/);
  assert.match(src,/await reset\(a\)\.click\(\)/);
  assert.match(src,/await b\.reload\(/);
  assert.match(src,/await selectTeamAndLaunch\(b,"stealth"\)/);
  assert.match(src,/await reset\(a\)\.isDisabled\(\)/);
  assert.match(src,/preventedStaleReset:true/);
  assert.match(src,/campaignUnchanged:true/);
  assert.doesNotMatch(src,/localStorage\.setItem\(key,JSON\.stringify\(/);
});
