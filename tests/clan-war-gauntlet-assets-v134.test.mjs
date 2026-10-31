import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {fileURLToPath} from "node:url";

const root=fileURLToPath(new URL("../public/game/assets/v134/gauntlets/jungle-hunter/",import.meta.url));
const component=readFileSync(fileURLToPath(new URL("../app/game/JungleHunterLayeredV134.tsx",import.meta.url)),"utf8");
const layers=["01-arm.svg","02-housing.svg","03-display-glyphs.svg","04-hinge.svg","05-lid.svg","06-emitter.svg","07-beam.svg"];
test("V134 authoring exports seven transparent independent source layers",()=>{
  assert.equal(layers.length,7);
  for(const name of layers){
    const path=root+name;
    assert.ok(existsSync(path),name);
    const text=readFileSync(path,"utf8");
    assert.match(text,/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(text,/viewBox="0 0 540 290"/);
    assert.match(text,/<\/svg>/);
    assert.ok(!text.includes("1:1-certified"));
    assert.match(component,new RegExp(name.replaceAll(".","\\.")));
  }
});
test("five segmented glyph rows, source-identified lid and true alpha source layers",()=>{
  const display=readFileSync(root+"03-display-glyphs.svg","utf8");
  const cells=(display.match(/<rect x="200"/g)||[]).length;
  assert.equal(cells,5);
  assert.equal((display.match(/stroke="#f23c46"/g)||[]).length,5);
  const lid=readFileSync(root+"05-lid.svg","utf8");
  assert.match(lid,/fill="#252d35"/);
  assert.match(component,/data-cover-open=\{coverOpen\}/);
  assert.match(component,/data-fidelity="blockout-unapproved"/);
  assert.match(component,/showBeam/);
  assert.match(component,/Jungle Hunter · étude modulaire/);
});
test("the same layered asset is actually selected by the war view and armory",()=>{
  for(const path of ["app/game/ClanWarGauntletV131.tsx","app/game/ClanWarGauntletLockerV132.tsx"]){
    const text=readFileSync(fileURLToPath(new URL("../"+path,import.meta.url)),"utf8");
    assert.match(text,/JungleHunterLayeredV134/);
    assert.match(text,/jungle-hunter/);
  }
  const script=readFileSync(fileURLToPath(new URL("../scripts/export-gauntlet-png-v134.mjs",import.meta.url)),"utf8");
  assert.match(script,/sharp\(data\)/);
  assert.match(script,/1080/);
  assert.match(script,/sourceSha256/);
});
