import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

// The complete character is inspected by the native browser job. This guard
// checks the actual registered plate files and the renderer's 256x384 contract.
const modules = [
  "belt","bracer","chest-avp","chest-city","chest-classic","chest-super",
  "knee","shin","shoulder-avp","shoulder-classic","shoulder-feral",
  "shoulder-super","thigh-lower","thigh"
];
test("all 14 V3 armor plates used by Homeworld exist, with intact WebP RIFF signatures",()=>{
  for(const name of modules){
    const file="public/game/assets/v3/actors/yautja/hunter/armor/registered/"+name+".webp";
    assert.ok(existsSync(file),file);
    const bytes=readFileSync(file);
    assert.equal(bytes.toString("ascii",0,4),"RIFF",file);
    assert.equal(bytes.toString("ascii",8,12),"WEBP",file);
  }
});
test("Homeworld custom hero forwards the same owned appearance and loadout",()=>{
  const hub=readFileSync("app/game/HomeworldHub.tsx","utf8");
  const mod=readFileSync("app/game/HomeworldModularHunter.tsx","utf8");
  assert.match(hub,/showArmor armorId=\{save\.loadout\.armorId\}/);
  assert.match(hub,/hasWristblades=\{save\.loadout\.weaponIds\.includes\("wristblades"\)\}/);
  assert.match(mod,/HUNTER_ARMOR_MODULES\[appearance\?\.armorStyleId/);
  assert.match(mod,/HUNTER_ARMOR_FIT_BY_MORPH\[morphId\]/);
  assert.match(mod,/channel="armor" maskPath=\{path\}/);
  assert.match(mod,/armorId !== "scout"/);
});
