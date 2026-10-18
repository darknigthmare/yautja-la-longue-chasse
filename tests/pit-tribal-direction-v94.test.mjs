import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
const built=await build({stdin:{contents:"export * from './app/game/systems/pitTribalDirectionV94';export {PIT_FIGHTERS} from './app/game/systems/pitCombat';export {PIT_PRESENTATION_CATALOG_V93} from './app/game/systems/pitPresentationPlansV93';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const p=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
test('all201 identities and437 exact costumes retain six bounded directions without admitting artwork',()=>{
 const queue=p.getPitTribalProductionQueueV94();assert.equal(queue.length,437*6);
 assert.deepEqual([...new Set(queue.map(item=>item.fighterId))].sort(),Object.keys(p.PIT_FIGHTERS).sort());
 assert.equal(new Set(queue.map(item=>[item.fighterId,item.appearanceId,item.category].join(':'))).size,queue.length);
 for(const item of queue){assert.equal(item.nativeCycleComplete,false);assert.equal(item.oneToOneCertified,false);assert.equal(item.documentedGesture,false);
  assert.equal(item.frameDurations.length,item.targetDistinctDrawingsPerFacing);assert(item.frameDurations.every(n=>Number.isInteger(n)&&n>0));
  assert.equal(item.frameDurations.reduce((a,b)=>a+b,0),item.durationTicks);assert.equal(item.durationTicks,item.category==='intro'?72:item.category==='taunt'?90:120);
 }
});
test('alien tribal direction never silently transfers to humans, Amengi or174 unverified identities',()=>{
 for(const item of p.getPitTribalProductionQueueV94())assert.equal(item.tribalYautjaAdaptation,item.species==='yautja');
 assert.match(p.getPitTribalDirectionV94('machiko-noguchi','idle').language,/Anatomie humaine/);
 assert.match(p.getPitTribalDirectionV94('theta','intro').language,/Anatomie humaine/);
 assert.equal(p.getPitTribalDirectionV94('guest-amengi-female','taunt').tribalYautjaAdaptation,false);
 assert.equal(p.PIT_PRESENTATION_CATALOG_V93.entries.filter(e=>e.species==='unverified').length,174);
});
test('exact appearance ownership, source constraints and undefined identity are preserved',()=>{
 assert.equal(p.getPitTribalDirectionV94('wolf','intro','scar-avec-casque-028c28748d'),null);
 assert.equal(p.getPitTribalDirectionV94('not-real','intro'),null);
 assert.equal(p.getPitTribalDirectionV94('wolf','not-a-family'),null);
 const masked=p.getPitTribalDirectionV94('wolf','intro','wolf-avec-casque-4261aca172');assert(masked);
 assert(masked.referenceSprites.length);assert.equal(masked.targetDistinctDrawingsPerFacing,12);
 assert.notEqual(masked.appearanceId,p.getPitTribalDirectionV94('wolf','intro',null).appearanceId);
 assert(p.PIT_TRIBAL_RULES_V94.some(rule=>rule.includes('sans miroir')));
 assert(p.PIT_TRIBAL_RULES_V94.some(rule=>rule.includes('figurant')));
});
