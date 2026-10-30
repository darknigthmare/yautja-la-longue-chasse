import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const read = p => readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("PHG texture material lookup is applied to rig and Homeworld three layer categories", () => {for(const p of ["app/game/HunterRigPreview.tsx","app/game/HomeworldModularHunter.tsx"]){const s=read(p);for(const k of ["skinMaterialId","dreadMaterialId","outfitMaterialId","maskImage"]) assert.ok(s.includes(k),p+" missing "+k);assert.match(s,/phgMaterialForV113/);}});
