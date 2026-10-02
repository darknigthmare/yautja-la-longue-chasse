import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';
const api=homeworldQaModelV64(process.cwd(),['homeworldCity.ts','homeworldLifeV69.ts','homeworldInteriorsV64.ts','homeworldElementCodexV64.ts','homeworldResidentConversationsV75.ts']);

test('V75 every civilian district recommends actual visitable local buildings, not fictional services',()=>{
  assert.equal(api.HOMEWORLD_CONVERSATION_CODEX_V75.length,14);
  for(const resident of api.HOMEWORLD_RESIDENTS_V69){
    const places=api.homeworldResidentPlacesV75(resident);
    assert.ok(places.length>0,resident.id);
    for(const place of places){
      const building=api.HOMEWORLD_BUILDINGS.find(b=>b.id===place.buildingId);
      assert.equal(building.districtId,resident.districtId);
      assert.equal(place.id,`building:${building.id}`);
      assert.ok(api.homeworldInteriorForBuildingV64(building.id));
      assert.ok(place.description.length>20);
    }
  }
  for(const record of api.HOMEWORLD_CONVERSATION_CODEX_V75){
    for(const id of record.associatedElementIds)assert.ok(api.HOMEWORLD_BUILDINGS.some(b=>b.id===id));
    assert.equal(record.lore,'original-adaptation');
    assert.equal(record.footprint,null);
  }
});
test('V75 three civilian topics remain distinct, deterministic and read-only for all98 residents',()=>{
  assert.equal(api.HOMEWORLD_RESIDENTS_V69.length,98);
  const before=JSON.stringify(api.HOMEWORLD_RESIDENTS_V69);
  for(const resident of api.HOMEWORLD_RESIDENTS_V69){
    const texts=api.HOMEWORLD_RESIDENT_TOPICS_V75.map(t=>api.homeworldResidentConversationV75(resident,t.id,30));
    assert.equal(new Set(texts).size,3,resident.id);
    for(const text of texts)assert.ok(text.length>90);
    const first=api.homeworldResidentConversationV75(resident,'daily',0);
    assert.equal(first,api.homeworldResidentConversationV75(resident,'daily',0));
    assert.notEqual(first,api.homeworldResidentConversationV75(resident,'daily',60));
    assert.equal(api.homeworldResidentConversationV75(resident,'customs',0),api.homeworldResidentConversationV75(resident,'customs',180));
  }
  assert.equal(JSON.stringify(api.HOMEWORLD_RESIDENTS_V69),before,'no route, phase, inventory or identity writes');
});
