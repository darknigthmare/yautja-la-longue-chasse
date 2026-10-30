import assert from "node:assert/strict";
import test from "node:test";
import {
  CLAN_WAR_VARIANTS_V120 as rows, auditClanWarVariantsV120,
  exportClanWarVariantsCsvV120, exportClanWarVariantsJsonV120,
  searchClanWarVariantsV120, countClanWarVariantsV120,
} from "../app/game/systems/clanWarVariantsV120.ts";

test("no-dependency V120 contract: exactly 12 groups of 100",()=>{
  const a=auditClanWarVariantsV120();
  assert.equal(a.total,1200);
  assert.deepEqual(a.problems,[]);
  assert.equal(a.uniqueSites,1200);
  assert.equal(a.homageAnchors,100);
  const counts=countClanWarVariantsV120();
  for(const x of Object.values(counts))for(const n of Object.values(x))assert.equal(n,100);
});

test("fast export smoke proves JSON and CSV both contain same 1200 source records",()=>{
  const json=JSON.parse(exportClanWarVariantsJsonV120());
  const csv=exportClanWarVariantsCsvV120();
  assert.equal(json.missions.length,1200);
  assert.equal(csv.slice(1).trimEnd().split("\r\n").length,1201);
  assert.equal(json.missions[0].id,rows[0].id);
  assert.equal(json.missions[1199].id,rows[1199].id);
  assert.equal(searchClanWarVariantsV120("","all","homage").length,400);
  assert.equal(new Set(rows.map(x=>x.site)).size,1200);
});
