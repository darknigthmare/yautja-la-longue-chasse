import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
const api=homeworldQaModelV64(process.cwd(),['homeworldAssetCatalogueV81.ts','homeworldContextCodexV71.ts']);

test('354 exact target assets cover all22 requested families and do not call a related source a finished variant',()=>{
 const catalogue=api.auditHomeworldAssetCatalogueV81(api.HOMEWORLD_ALL_ELEMENT_CODEX_V71);
 assert.equal(catalogue.length,354);assert.equal(new Set(catalogue.map(e=>e.id)).size,354);
 assert.deepEqual([...new Set(catalogue.map(e=>e.section))],Array.from({length:22},(_,i)=>55+i));
 assert(catalogue.every(e=>e.label&&e.family&&e.lore==='LORE_COMPATIBLE_ORIGINAL'));
 assert(catalogue.every(e=>e.status!=='EXISTING_GOOD'));
 for(const label of ['ascenseur','porte énergétique','nourrisseur','harnais','selle']){
  const entry=catalogue.find(e=>e.label.toLowerCase()===label);assert(entry);
  assert.equal(entry.status,'MISSING',label+' cannot borrow unrelated bridges, creature pictures or furniture');
 }
 const bench=catalogue.find(e=>e.label==='Banc massif');assert(bench.sourceCandidates.some(s=>s.includes('bench')));
 assert.equal(bench.status,'EXISTING_NEEDS_VARIANT');
 const forge=catalogue.find(e=>e.label==='Forge active');assert.equal(forge.status,'MISSING_ANIMATION');
});

test('an installed source alone is recorded without fabricating a runtime consumer',()=>{
 const entry=api.auditHomeworldAssetCatalogueV81([],['/game/homeworld/future/elevator-native.png']).find(e=>e.label==='ascenseur');
 assert.equal(entry.consumerCount,0);assert.deepEqual(entry.consumerIds,[]);
 assert.deepEqual(entry.installedOnlyCandidates,['/game/homeworld/future/elevator-native.png']);
 assert.equal(entry.status,'EXISTING_NEEDS_VARIANT');
});

test('an equipment job cannot supply a prop sprite while explicit equipment and guard sources retain their provenance',()=>{
 const attendant={id:'urban-v84:stable-harness',label:'Palefrenier des montures',category:'npc',asset:'/game/homeworld/v72/civilian-roles-atlas.png'};
 const guard={id:'npc:royal-guard',label:'Garde',category:'npc',asset:'/game/homeworld/v84/npcs/guard/01.png'};
 const harness={id:'prop:mount-harness',label:'Harnais',category:'prop',asset:'/game/homeworld/future/harness-native.png'};
 const missing=api.auditHomeworldAssetCatalogueV81([attendant,guard]).find(e=>e.label==='harnais');
 assert.equal(missing.status,'MISSING');assert.equal(missing.consumerCount,0);assert.deepEqual(missing.sourceCandidates,[]);
 const supplied=api.auditHomeworldAssetCatalogueV81([attendant,guard,harness]);
 const equipment=supplied.find(e=>e.label==='harnais');
 assert.equal(equipment.status,'EXISTING_NEEDS_VARIANT');assert.deepEqual(equipment.consumerIds,[harness.id]);assert.deepEqual(equipment.sourceCandidates,[harness.asset]);
 const person=supplied.find(e=>e.label==='garde');
 assert.equal(person.status,'EXISTING_NEEDS_VARIANT');assert.deepEqual(person.consumerIds,[guard.id]);assert.deepEqual(person.sourceCandidates,[guard.asset]);
});
