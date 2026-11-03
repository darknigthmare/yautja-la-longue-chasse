import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {
  DEFAULT_GAUNTLET_ID_V132,GAUNTLET_CATALOG_V132,
  parseGauntletPreferenceV132,serializeGauntletPreferenceV132,
  gauntletUnlockedV132,
} from "../app/game/systems/clanWarGauntletCatalogV132.ts";
import {
  readHunterGauntletV133,
} from "../app/game/systems/useHunterGauntletV133.ts";
import {
  emptyGauntletCampaignV134,GAUNTLET_STUDIES_V134,
} from "../app/game/systems/gauntletCampaignV134.ts";
const read=p=>readFileSync(fileURLToPath(new URL("../"+p,import.meta.url)),"utf8");
const HUNTER="2026-10-31T22:44:00.000Z";
test("V144 locally remembered challenge keeps its exact cosmetic after a legitimate campaign claim",()=>{
  const study=GAUNTLET_STUDIES_V134[0];
  const claims=[study.id];
  assert.equal(gauntletUnlockedV132(study.id,"blooded",claims),true);
  const serialized=serializeGauntletPreferenceV132(HUNTER,study.id,"blooded",claims);
  const parsed=JSON.parse(serialized);
  assert.equal(parsed.equipped,study.id);
  assert.equal(parsed.schema,1);
  assert.equal(parsed.hunter,HUNTER);
  assert.ok(!("claimedStudies" in parsed),"Local preference must NEVER grant study rights");
  assert.equal(parseGauntletPreferenceV132(serialized,HUNTER,"blooded",claims),study.id);
  assert.equal(parseGauntletPreferenceV132(serialized,HUNTER,"blooded",[]),DEFAULT_GAUNTLET_ID_V132);
  assert.equal(parseGauntletPreferenceV132(serialized,"other-hunter","elder",claims),DEFAULT_GAUNTLET_ID_V132);
});
test("V144 all 44 granted studies serialize and parse without rewriting the reward as Jungle Hunter",()=>{
  assert.equal(GAUNTLET_STUDIES_V134.length,44);
  assert.equal(GAUNTLET_CATALOG_V132.length,54);
  for(const study of GAUNTLET_STUDIES_V134){
    const raw=serializeGauntletPreferenceV132(HUNTER,study.id,"elder",[study.id]);
    assert.equal(JSON.parse(raw).equipped,study.id,study.id);
    assert.equal(parseGauntletPreferenceV132(raw,HUNTER,"elder",[study.id]),study.id,study.id);
    assert.equal(parseGauntletPreferenceV132(raw,HUNTER,"elder",[]),DEFAULT_GAUNTLET_ID_V132);
  }
});
test("V144 archive ownership and rank remain authoritative over forged localStorage values",()=>{
  const study=GAUNTLET_STUDIES_V134[0];
  const payload=JSON.stringify({schema:1,hunter:HUNTER,equipped:study.id});
  const storage={getItem:()=>payload};
  assert.equal(readHunterGauntletV133(storage,HUNTER,"elder",new Map()),DEFAULT_GAUNTLET_ID_V132);
  const real={...emptyGauntletCampaignV134(HUNTER),equippedId:study.id,claimedStudies:[study.id]};
  assert.equal(readHunterGauntletV133(storage,HUNTER,"elder",new Map(),real),study.id);
  assert.equal(readHunterGauntletV133(storage,HUNTER,"elder",new Map(),{
    ...real,ownerCreatedAt:"wrong-owner",
  }),DEFAULT_GAUNTLET_ID_V132);
  assert.equal(readHunterGauntletV133(storage,HUNTER,"elder",new Map(),{
    ...real,claimedStudies:[],
  }),DEFAULT_GAUNTLET_ID_V132);
});
test("V144 hook passes legitimate claim list into V132 local preference codec",()=>{
  const hook=read("app/game/systems/useHunterGauntletV133.ts");
  assert.match(hook,/parseGauntletPreferenceV132\(storage\.getItem\(key\),hunter,rank\)/);
  assert.match(hook,/if \(archive\.ownerCreatedAt !== hunter\) return DEFAULT_GAUNTLET_ID_V132;/);
  assert.match(hook,/serializeGauntletPreferenceV132\(hunter,id,rank,archive\?\.claimedStudies \?\? \[\]\)/);
  const panel=read("app/game/ClanWarPanelV85.tsx");
  assert.match(panel,/onClaimStudy=\{onClaimGauntletStudy\}/);
  assert.match(panel,/claimedStudies=\{save\.gauntletV134\?\.claimedStudies\?\?\[\]\}/);
  assert.equal((panel.match(/<ClanWarAtlasV95\b/g)||[]).length,1);
});
