import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("in-hunt layered sprite uses cached masked PHG composites for skin dread and outfit",()=>{
  const s=read("app/game/HuntCanvas.tsx");for(const a of ["phgMaterialForV113","skinMaterialId","dreadMaterialId","outfitMaterialId","source-atop","hunterMaterialBitmapV113","outfitImage","queueImage(material.src"])assert.ok(s.includes(a),a);
  assert.match(s,/WeakMap<HTMLImageElement/);
});
