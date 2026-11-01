import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {hunterBodyPartColorV62} from "../app/game/hunterHeadArtV62.ts";

const home=readFileSync("app/game/HomeworldModularHunter.tsx","utf8");
const preview=readFileSync("app/game/HunterRigPreview.tsx","utf8");
const hunt=readFileSync("app/game/HuntCanvas.tsx","utf8");

test("V140 Homeworld grades only anatomical bitmap, never the parent with decals",()=>{
  assert.match(home,/data-homeworld-layer="body" style=\{\{ \.\.\.imageStyle, zIndex: 10 \}\}/);
  assert.doesNotMatch(home,/data-homeworld-layer="body" style=\{\{[^}]*filter:/);
  assert.match(home,/const gradedFilter = hunterBodyPartColorV62\(morphId, partId,/);
  assert.match(home,/objectFit: "fill", zIndex: 1,\s*filter: gradedFilter/);
  assert.match(home,/\{ \.\.\.imageStyle, filter: gradedFilter, clipPath:/);
  assert.match(home,/<DecalSurfaceV133[\s\S]*?zone=\{partId === "head" \? "face" : "body"\}/);
  assert.match(home,/<ChromaticSurfaceV113 appearance=\{appearance\} channel="skin"/);
});
test("V140 native alpha morph grading is retained in all source bitmap layers",()=>{
  const filter="sepia(.3) contrast(1.06)";
  assert.equal(hunterBodyPartColorV62("classic","head",filter),filter);
  assert.match(hunterBodyPartColorV62("super","torso",filter),/grayscale\(\.9\)/);
  assert.match(hunterBodyPartColorV62("feral","torso",filter),/sepia\(\.55\)/);
  assert.match(hunterBodyPartColorV62("huntress","torso",filter),/sepia\(\.3\)/);
  assert.match(preview,/hunterBodyPartColorV62\(appearance.bodyMorphId, partId, HUNTER_SKIN_FILTERS_V114\[appearance.skinId\]\)/);
  assert.match(hunt,/hunterBodyPartColorV62\(appearance.bodyMorphId, partId, bodyFilter\(appearance\)\)/);
});
test("V140 original cloth, net, dreads and armor retain their existing independent filters",()=>{
  assert.match(home,/data-homeworld-layer="clothing"/);
  assert.match(home,/hunterBodyPartColorV62\(morphId, "torso", HUNTER_SKIN_FILTERS_V114/);
  assert.match(home,/data-homeworld-layer="dread"/);
  assert.match(home,/filter: HUNTER_DREAD_FILTERS_V114/);
  assert.match(home,/data-homeworld-layer="armor"/);
  assert.match(home,/filter: HUNTER_ARMOR_FILTERS_V114/);
  assert.match(home,/data-homeworld-biomask-pigment-v131/);
});
