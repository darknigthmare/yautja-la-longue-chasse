import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const bundle = await build({ stdin: { contents: `
 export * from './app/game/systems/homeworldContractsV68';
 export {HOMEWORLD_REGIONS_V68,HOMEWORLD_REGION_TRACES_V68} from './app/game/systems/homeworldRegionsV68';
 export {homeworldInteriorForBuildingV64} from './app/game/systems/homeworldInteriorsV64';
 export {default as Panel,HomeworldContractsJournalV68 as Journal} from './app/game/HomeworldContractsV68';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', external: ['react','react/jsx-runtime'], loader: { '.css':'empty' }, outfile:'contracts-chains-v69-test.cjs', logLevel:'silent' });
const evaluated={exports:{}};
new Function('require','module','exports',bundle.outputFiles.find(item=>item.path.endsWith('.cjs')).text)(createRequire(import.meta.url),evaluated,evaluated.exports);
const api=evaluated.exports;
const definition=id=>api.HOMEWORLD_ALL_CONTRACTS_V69.find(item=>item.id===id);
const where=id=>{const d=definition(id),room=api.homeworldInteriorForBuildingV64(d.buildingId),point=room.points.find(item=>item.pointId===d.pointId);return {eligible:true,interiorId:room.buildingId,pointId:d.pointId,npcId:d.giverNpcId,actor:{x:point.x,y:point.y+45}};};
const act=(state,id,kind='accept',context=where(id))=>api.applyHomeworldContractV68(state,{kind,contractId:id},context);
// Declared reducer-model fixtures, not browser play evidence. The physical
// scene validator still verifies coordinates, counters, site and distance.
const event=(regionId,action,runId,tick=1500)=>({version:1,regionId,action,runId,tick,walked:2300,trailCount:3,evaded:2,armed:false,observedTicks:90,touches:3,interventions:2,
 actor:action==='survey'?{x:api.HOMEWORLD_REGION_TRACES_V68[2].x,y:api.HOMEWORLD_REGION_TRACES_V68[2].y}:action==='recover'?{x:7720,y:2220}:action==='report'?{x:api.HOMEWORLD_REGIONS_V68[regionId].residents[0].x,y:api.HOMEWORLD_REGIONS_V68[regionId].residents[0].y+45}:{x:7450,y:2050},
 siteId:`${regionId}-${action==='survey'?'trail-3':action==='recover'?'cache':action==='report'?'guide':action}`,
 targetId:`${regionId}-${action==='survey'?'trail':action==='report'?'guide':action==='track'||action==='challenge'?'fauna':'relay'}`});
const record=(state,e)=>api.recordContractsFieldEventV68(state,e,{regionId:e.regionId,runId:e.runId});
function stage(state,id,index){const o=definition(id).objectives[index],run=`${id}-stage-${index}`;state=api.bindContractsVillageRunV68(state,o.regionId,run).state;state=record(state,event(o.regionId,o.action,run)).state;return record(state,event(o.regionId,'report',run,1800)).state;}
function ready(state,id){for(let i=0;i<definition(id).objectives.length;i++)state=stage(state,id,i);return state;}
function complete(state,id){state=act(state,id).state;state=ready(state,id);const delivered=act(state,id,'deliver');assert(delivered.changed,id);return delivered.state;}
function through(id){let state;for(const d of api.HOMEWORLD_CHAIN_CONTRACTS_V69){state=complete(state,d.id);if(d.id===id)return state;}throw Error(id);}

test('published V68 catalog and mixed active/completed checkpoints remain unchanged and version 1',async()=>{
 const baseline=JSON.parse(await readFile(new URL('./fixtures/homeworld-contracts-v68-published.json',import.meta.url),'utf8'));
 assert.deepEqual(api.HOMEWORLD_CONTRACTS_V68,baseline.definitions);assert.equal(api.HOMEWORLD_CONTRACTS_V68.length,24);
 let state=complete(undefined,'ash-marches-track');state=act(state,'npc-forge-relay-cases').state;state=stage(state,'npc-forge-relay-cases',0);
 const bytes=JSON.stringify(state);assert.equal(state.version,1);assert.equal(JSON.stringify(api.normalizeHomeworldContractsV68(JSON.parse(bytes))),bytes);
 const extended=act(state,'v69-return-1').state;assert.equal(extended.version,2);assert.deepEqual(extended.entries.slice(0,2),state.entries);
});
test('eight circuits use existing physical people, all five action types and eighteen ordered biome stages',()=>{
 assert.equal(api.HOMEWORLD_ALL_CONTRACTS_V69.length,32);assert.equal(api.HOMEWORLD_CHAIN_CONTRACTS_V69.length,8);
 assert.equal(api.HOMEWORLD_CHAIN_CONTRACTS_V69.flatMap(d=>d.objectives).length,18);
 assert.deepEqual(new Set(api.HOMEWORLD_CHAIN_CONTRACTS_V69.flatMap(d=>d.objectives.map(o=>o.action))),new Set(['survey','track','ward','recover','challenge']));
 for(const d of api.HOMEWORLD_CHAIN_CONTRACTS_V69){assert(d.sequential);assert.equal(d.chain.total,4);assert.equal(new Set(d.objectives.map(o=>o.regionId)).size,d.objectives.length);assert.equal(api.canMeetContractGiverV68(d,where(d.id)),true);
  for(const o of d.objectives)assert(api.HOMEWORLD_BOARD_CONTRACTS_V68.some(original=>original.objectives.some(real=>real.regionId===o.regionId&&real.action===o.action)),`Only actions physically emitted in ${o.regionId}: ${o.action}`);
 }
});
test('a briefing, field completion and guide reports cannot unlock the next giver before actual delivery',()=>{
 const initial=act(undefined,'v69-return-1').state;
 for(const state of [undefined,initial,ready(initial,'v69-return-1')]){const outcome=act(state,'v69-return-2');assert(!outcome.changed);assert(!outcome.ok);assert.match(outcome.message,/Remets d’abord/);}
 const delivered=complete(undefined,'v69-return-1');assert(api.contractRequirementsV69(delivered,'v69-return-2').met);assert(act(delivered,'v69-return-2').changed);
 const forgedAction={kind:'accept',contractId:'v69-return-2',completedPrevious:true,prerequisites:[]};assert(!api.applyHomeworldContractV68(undefined,forgedAction,where('v69-return-2')).changed);
});
test('forged prerequisite status, missing evidence, removed predecessor and reversed acceptance serial are rejected',()=>{
 const valid=act(through('v69-return-1'),'v69-return-2').state;
 const bad=[{...valid,entries:valid.entries.slice(1)},structuredClone(valid),structuredClone(valid),structuredClone(valid),{...valid,version:1}];
 bad[1].entries[0].status='active';bad[2].entries[0].stages[0].proof=null;bad[3].entries[0].acceptanceSerial=2;bad[3].entries[1].acceptanceSerial=1;
 for(const state of bad){assert(!api.isHomeworldContractsV68(state));assert(!act(state,'v69-return-2','resume').changed);assert.equal(api.contractMarksV68(state),0);}
});
test('later biome departures and their physical receipts cannot credit an ordered stage before the preceding guide return',()=>{
 let state=act(undefined,'v69-return-1').state;const later=definition('v69-return-1').objectives[1];
 const skipped=api.bindContractsVillageRunV68(state,later.regionId,'too-early');assert(!skipped.changed);assert.equal(skipped.state.entries[0].stages[1].runId,null);
 assert(!record(state,event(later.regionId,later.action,'too-early')).changed);
 state=stage(state,'v69-return-1',0);assert(api.bindContractsVillageRunV68(state,later.regionId,'now-authorized').changed);
 const forged=structuredClone(act(undefined,'v69-return-1').state);forged.entries[0].stages[1].runId='too-early';assert(!api.isHomeworldContractsV68(forged));
});
test('original two-biome commissions still permit their previous parallel stage ordering',()=>{
 const state=act(undefined,'npc-forge-relay-cases').state;
 const second=api.bindContractsVillageRunV68(state,'glass-desert','legacy-second-first');assert(second.changed);assert.equal(second.state.entries[0].stages[1].runId,'legacy-second-first');assert(api.isHomeworldContractsV68(second.state));
});
test('all eight chapters finish through distinct field receipts and guide returns, pay once and preserve no automatic rank or rite',()=>{
 let state;let total=0;
 for(const d of api.HOMEWORLD_CHAIN_CONTRACTS_V69){state=act(state,d.id).state;assert.equal(api.contractMarksV68(state),total);state=ready(state,d.id);assert.equal(api.contractMarksV68(state),total);
  const result=act(state,d.id,'deliver');assert(result.changed);assert.equal(result.rewardMarks,d.rewardMarks);state=result.state;total+=d.rewardMarks;
  assert.equal(api.contractMarksV68(state),total);for(const kind of ['deliver','resume','accept'])assert(!act(state,d.id,kind).changed);
  assert.deepEqual(Object.keys(state).sort(),['entries','serial','version']);assert(api.isHomeworldContractsV68(state));
 }
 assert.equal(total,474);assert(api.homeworldContractsJournalV68(state).chains.every(c=>c.completed===4&&!c.next));
});
test('abandon/restart clears only the current chapter attempt, keeping completed predecessors and V68 entries',()=>{
 let state=through('v69-return-1');state=act(state,'ash-marches-track').state;state=act(state,'v69-return-2').state;state=stage(state,'v69-return-2',0);
 const before=structuredClone(state.entries.slice(0,2));state=act(state,'v69-return-2','abandon').state;state=act(state,'v69-return-2','resume').state;
 assert.deepEqual(state.entries.slice(0,2),before);assert(state.entries[2].stages.every(s=>!s.runId&&!s.proof&&s.reportTick===null));
});
test('new checkpoint round trips preserve ordered evidence and future schema 3 never authorizes a save',()=>{
 let state=act(undefined,'v69-return-1').state;state=stage(state,'v69-return-1',0);
 assert.deepEqual(api.normalizeHomeworldContractsV68(JSON.parse(JSON.stringify(state))),state);
 const future={...state,version:3};assert(!api.isHomeworldContractsV68(future));assert(!act(future,'ash-marches-track').changed);assert(!api.bindContractsVillageRunV68(future,'thermal-caves','future').changed);
});
test('the journal distinguishes departure, performed action, guide confirmation, giver delivery and the next relationship',()=>{
 let state=act(undefined,'v69-return-1').state;let item=api.homeworldContractsJournalV68(state).active[0];assert.equal(item.nextAction,'Partir vers le village');assert.equal(item.destination.kind,'region');assert.equal(item.route[1].status,'later');
 state=api.bindContractsVillageRunV68(state,'ash-marches','journal-run').state;item=api.homeworldContractsJournalV68(state).active[0];assert.equal(item.nextAction,'Effectuer l’action de terrain');
 state=record(state,event('ash-marches','track','journal-run')).state;item=api.homeworldContractsJournalV68(state).active[0];assert.equal(item.destination.kind,'guide');assert.match(item.relation,/Soigneuse/);
 state=ready(state,'v69-return-1');item=api.homeworldContractsJournalV68(state).active[0];assert.equal(item.destination.kind,'giver');assert(item.ready);
 state=act(state,'v69-return-1','deliver').state;assert.equal(api.homeworldContractsJournalV68(state).chains[0].next.giverName,'Soigneuse des délégations');
});
test('eligibility, suspension, wrong giver and remote position still refuse the new chapter even with a forged profile rank',()=>{
 for(const change of [{eligible:false,rankId:'ancient',trainingCompleted:true},{suspended:true},{npcId:'dock-officer'},{actor:{x:9999,y:9999}}]){
  const result=act(undefined,'v69-return-1','accept',{...where('v69-return-1'),...change});assert(!result.changed);assert(!result.ok);assert.equal(result.state.version,1);
 }
});
test('NPC offers clearly show the locked chain, physical prerequisite and ordered route; journal shows destination and relation',()=>{
 const markup=renderToStaticMarkup(React.createElement(api.Panel,{npcId:'clan-healer',eligible:true,disabled:false,reducedMotion:true,onAction(){}}));
 assert.match(markup,/data-contract-id="v69-return-2" data-contract-phase="locked"/);assert.match(markup,/Lire les deux souffles/);assert.match(markup,/Artisane du marché/);assert.match(markup,/Itinéraire dans l’ordre/);assert.match(markup,/disabled="" data-contract-action="accept"/);
 const journal=renderToStaticMarkup(React.createElement(api.Journal,{value:act(undefined,'v69-return-1').state}));assert.match(journal,/Destination/);assert.match(journal,/Marches de Cendre/);assert.match(journal,/Soigneuse/);assert.doesNotMatch(markup,/data-contract-action="deliver"/);
});
