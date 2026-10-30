import test from "node:test";
import assert from "node:assert/strict";
import {PHG_RECENT_CANDIDATES_V126,PHG_RECENT_UPDATES_V126}
  from "../app/game/phgRecentMaterialsV126.ts";
import {getChromaticMaterialV113} from "../app/game/hunterChromaticsV113.ts";
test("V126 four new material studies, distinct channels and save-safe IDs",()=>{
 assert.equal(PHG_RECENT_CANDIDATES_V126.length,4);
 assert.deepEqual(PHG_RECENT_CANDIDATES_V126.map(x=>x.channel),["armor","skin","armor","outfit"]);
 assert.equal(new Set(PHG_RECENT_CANDIDATES_V126.map(x=>x.id)).size,4);
 for(const m of PHG_RECENT_CANDIDATES_V126){
   assert.equal(m.evidence,"provisional");
   assert.deepEqual([m.atlas?.columns,m.atlas?.rows],[2,2]);
   assert.match(m.note,/1:1 non certifiées/);
   if(m.status==="drive-only"){
     assert.equal(m.src,null);
     assert.equal(getChromaticMaterialV113(m.channel,m.id),null);
   }
 }
});
test("V126 2026 sword release does not invent skin pattern",()=>{
 const sword=PHG_RECENT_UPDATES_V126.find(x=>x.date==="2026-07-28");
 assert.equal(sword.skinAdded,false);
 assert.match(sword.title,/niveau 105/);
});
