import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {fileURLToPath} from "node:url";
import ts from "typescript";
import {
  GAUNTLET_CATALOG_V132,
} from "../app/game/systems/clanWarGauntletCatalogV132.ts";
import {
  gauntletRigSpriteV139,GAUNTLET_RIG_REGISTRATION_V139,
} from "../app/game/systems/gauntletRigSpritesV139.ts";

const root=fileURLToPath(new URL("../",import.meta.url));
const read=relative=>readFileSync(root+relative,"utf8");

test("every one of 54 roster identities has its OWN 256x384 arm-registered shell and lid",()=>{
  assert.equal(GAUNTLET_CATALOG_V132.length,54);
  assert.deepEqual(GAUNTLET_RIG_REGISTRATION_V139,
    {canvasWidth:256,canvasHeight:384,hingeX:51,hingeY:202});
  const bases=new Set(),lids=new Set();
  for(const g of GAUNTLET_CATALOG_V132){
    for(const part of ["base","lid"]){
      const path=gauntletRigSpriteV139(g.id,part).slice(1);
      assert.ok(existsSync(root+"public/"+path),"Missing "+path);
      const svg=read("public/"+path);
      assert.match(svg,/<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
      assert.match(svg,/viewBox="0 0 256 384"/);
      assert.match(svg,/width="256" height="384"/);
      assert.match(svg,/data-anchor="back-lower-arm"/);
      assert.match(svg,/ORIGINAL blockout/);
      assert.match(svg,/NOT cinema-verified 1:1/);
      assert.match(svg,new RegExp(`character:${g.id} theme:${g.theme} part:${part}`));
      (part==="base"?bases:lids).add(svg);
    }
  }
  assert.equal(bases.size,54);
  assert.equal(lids.size,54);
});
test("unknown or malicious model path falls back to a registered Jungle Hunter source",()=>{
  assert.equal(gauntletRigSpriteV139("unknown","base"),"/game/assets/v139/rig-gauntlets/jungle-hunter/base.svg");
  assert.equal(gauntletRigSpriteV139("../../fake","lid"),"/game/assets/v139/rig-gauntlets/jungle-hunter/lid.svg");
  assert.equal(gauntletRigSpriteV139("wolf","lid"),"/game/assets/v139/rig-gauntlets/wolf/lid.svg");
});
test("live actor rig uses 54 authored sprites for left gauntlet and preserves wristblades on the opposite arm",()=>{
  const rig=read("app/game/HunterRigPreview.tsx");
  assert.match(rig,/gauntletRigSpriteV139\(rigGauntletId, "base"\)/);
  assert.match(rig,/gauntletRigSpriteV139\(rigGauntletId, "lid"\)/);
  assert.match(rig,/boneMatrix\("armBackLower"\)/);
  assert.match(rig,/boneMatrix\("armFrontLower"\)/);
  assert.match(rig,/HUNTER_GAUNTLET_HINGE\.x/);
  assert.match(rig,/HUNTER_GAUNTLET_HINGE\.y/);
  assert.match(rig,/data-gauntlet-visual-validation="individual-v139-rig-blockout-not-film-approved"/);
  assert.match(rig,/data-gauntlet-rig-registration="back-lower-arm-256x384"/);
  assert.ok(!rig.includes("gauntletMaterialFilter"),"No shared generic filtered gauntlet remains");
  assert.ok(rig.includes('HUNTER_EQUIPMENT_V3.wristblades.housing'));
  const tsResult=ts.transpileModule(rig,{fileName:"HunterRigPreview.tsx",reportDiagnostics:true,
    compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});
  assert.deepEqual((tsResult.diagnostics??[]).filter(x=>x.category===ts.DiagnosticCategory.Error)
    .map(x=>ts.flattenDiagnosticMessageText(x.messageText,"\n")),[]);
});
test("script can reproduce rig art exactly; no film accuracy or combat stat claims",()=>{
  const script=read("scripts/build-gauntlet-rig-v139.mjs");
  assert.match(script,/existing!==source/);
  assert.match(script,/Source drift:/);
  assert.match(script,/oneToOneApproved:0/);
  assert.match(script,/const catalog=JSON.parse/);
  assert.ok(!script.includes("damageModifier"));
  assert.ok(!script.includes("warBudgetV85"));
});

test("local visual QA compares authentic rig attachment paths, not a decorative replacement",()=>{
  const client=read("app/gauntlet-qa-v136/client.tsx");
  const inspector=read("app/game/GauntletRigInspectionV139.tsx");
  assert.match(client,/GauntletRigInspectionV139/);
  assert.match(client,/Inspecter le poignet du chasseur/);
  assert.match(inspector,/data-testid="gauntlet-rig-inspection-v139"/);
  assert.match(inspector,/gauntletRigSpriteV139\(selectedId,"base"\)/);
  assert.match(inspector,/gauntletRigSpriteV139\(selectedId,"lid"\)/);
  assert.match(inspector,/rotate\(-64 51 202\)/);
  assert.match(inspector,/data-rig-art-status="individual-vector-blockout-not-film-certified"/);
  assert.ok(!inspector.includes("queueWarOrderV85("));
});
