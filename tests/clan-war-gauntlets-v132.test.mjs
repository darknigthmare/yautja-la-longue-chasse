import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {
  GAUNTLET_CATALOG_V132, GAUNTLET_PALETTES_V132,
  gauntletCatalogIntegrityV132, gauntletByIdV132,
  gauntletUnlockedV132,gauntletUnlockLabelV132,
  gauntletStorageKeyV132,normalizeGauntletV132,
  parseGauntletPreferenceV132,serializeGauntletPreferenceV132,
} from "../app/game/systems/clanWarGauntletCatalogV132.ts";

const read=(relative)=>readFileSync(fileURLToPath(new URL("../"+relative,import.meta.url)),"utf8");
test("54 catalogued identities, individually traceable sources and no invented 1:1 certifications",()=>{
  assert.equal(GAUNTLET_CATALOG_V132.length,54);
  assert.deepEqual(gauntletCatalogIntegrityV132(),[]);
  assert.equal(new Set(GAUNTLET_CATALOG_V132.map(g=>g.id)).size,54);
  assert.equal(gauntletByIdV132("jungle-hunter")?.evidence,"hero-closeup");
  assert.equal(gauntletByIdV132("dek")?.evidence,"design-studio");
  assert.equal(gauntletByIdV132("phg-jotun")?.evidence,"licensed-class");
  assert.ok(GAUNTLET_CATALOG_V132.every(g=>g.sourceUrl.startsWith("https://")));
  assert.ok(GAUNTLET_CATALOG_V132.every(g=>GAUNTLET_PALETTES_V132[g.theme]));
  assert.ok(GAUNTLET_CATALOG_V132.every(g=>g.version==="planned"));
});
test("true ranks unlock only configured models, challenge models never auto-awarded",()=>{
  assert.ok(gauntletUnlockedV132("jungle-hunter","young-blood"));
  assert.ok(!gauntletUnlockedV132("city-hunter","young-blood"));
  assert.ok(gauntletUnlockedV132("city-hunter","blooded"));
  assert.ok(gauntletUnlockedV132("wolf","elite"));
  assert.ok(!gauntletUnlockedV132("wolf","blooded"));
  assert.ok(gauntletUnlockedV132("dek","elder"));
  assert.ok(!gauntletUnlockedV132("dek","elite"));
  assert.ok(!gauntletUnlockedV132("phg-witch","elder"));
  assert.ok(gauntletUnlockedV132("phg-witch","elder",["phg-witch"]));
  assert.ok(!gauntletUnlockedV132("not-a-real-gauntlet","elder",["not-a-real-gauntlet"]));
  assert.match(gauntletUnlockLabelV132(gauntletByIdV132("phg-witch"),"elder"),/non encore branché/);
});
test("preference isolated per hunter; malformed, cross-owner or locked choices safely fall back",()=>{
  const keyA=gauntletStorageKeyV132("hunter-A"),keyB=gauntletStorageKeyV132("hunter-B");
  assert.notEqual(keyA,keyB);
  assert.equal(parseGauntletPreferenceV132(null,"hunter-A","elder"),"jungle-hunter");
  assert.equal(parseGauntletPreferenceV132("bogus","hunter-A","elder"),"jungle-hunter");
  assert.equal(parseGauntletPreferenceV132(JSON.stringify({schema:1,hunter:"hunter-B",equipped:"wolf"}),"hunter-A","elite"),"jungle-hunter");
  const raw=serializeGauntletPreferenceV132("hunter-A","wolf","elite");
  assert.equal(parseGauntletPreferenceV132(raw,"hunter-A","elite"),"wolf");
  assert.equal(parseGauntletPreferenceV132(raw,"hunter-A","young-blood"),"jungle-hunter");
  assert.equal(normalizeGauntletV132("phg-exalted","elder"),"jungle-hunter");
  assert.ok(!keyA.includes("hunter-B"));
});
test("single live atlas, no combat patch, no duplicate campaign session and correct equip wiring",()=>{
  const panel=read("app/game/ClanWarPanelV85.tsx");
  const stage=read("app/game/ClanWarGauntletV131.tsx");
  const vector=read("app/game/HunterGauntletArtV132.tsx");
  const locker=read("app/game/ClanWarGauntletLockerV132.tsx");
  assert.equal((panel.match(/<ClanWarAtlasV95\b/g)||[]).length,1);
  assert.equal((panel.match(/<ClanWarGauntletLockerV132\b/g)||[]).length,1);
  assert.match(panel,/gauntletStorageKeyV132\(save.createdAt\)/);
  assert.match(panel,/gauntletUnlockedV132\(id,save.profile.rankId\)/);
  assert.match(stage,/data-gauntlet-model=\{equipped.id\}/);
  assert.match(stage,/gauntletId: string;/);
  assert.match(vector,/data-art-validation="blockout-awaiting-source-review"/);
  assert.match(vector,/profile==="feral"/);
  assert.match(vector,/profile==="badlands"/);
  assert.match(locker,/disabled=\{!available\|\|equippedId===item.id\}/);
  for(const p of ["app/game/HunterGauntletArtV132.tsx","app/game/ClanWarGauntletLockerV132.tsx"]) {
    assert.ok(!read(p).includes("advanceWarTurnV85("));
    assert.ok(!read(p).includes("queueWarOrderV85("));
  }
});
