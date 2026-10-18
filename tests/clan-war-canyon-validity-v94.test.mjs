import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:`export * from './app/game/systems/clanWarCanyonV85';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const a=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
function ready(){let c=a.createCanyonV85();for(const action of ['corniche','maintenance','preserve','poste'])c=a.canyonPreparationV85(c,action);return a.engageCanyonV85(c,a.CANYON_PRESET_V85);}
const full=c=>({...c,messages:Array.from({length:100},(_,n)=>`Historical entry ${n}`)});
for(const battery of ['preserve','borrow'])test(`full journal: withdraw and commit (${battery}) remain reloadable with newest result`,()=>{
 const c=full({...ready(),battery});const before=JSON.stringify(c);const withdrawn=a.withdrawCanyonV85(c),committed=a.commitCanyonV85(withdrawn);
 assert.equal(JSON.stringify(c),before);assert.ok(a.readCanyonV85(withdrawn));assert.ok(a.readCanyonV85(committed));assert.equal(committed.messages.length,100);assert.equal(committed.committed,true);assert.equal(a.commitCanyonV85(committed),committed);
});
test('preparation and engagement also retain the existing journal size contract',()=>{
 const started=a.canyonPreparationV85(full(a.createCanyonV85()),'fond');assert.ok(a.readCanyonV85(started));
 let c=started;for(const action of ['preserve','poste'])c=a.canyonPreparationV85(c,action);c=a.engageCanyonV85(full(c),a.CANYON_PRESET_V85);assert.ok(a.readCanyonV85(c));assert.equal(c.messages.length,100);
});
for(const seconds of [0,-1,NaN,Infinity,-Infinity])test(`invalid or zero timestep ${seconds} cannot mutate a canyon`,()=>{
 const c=ready();assert.equal(a.stepCanyonV85(c,seconds),c);
});
for(const x of [NaN,Infinity,-Infinity])test(`nonfinite command position ${x} is rejected before making a corrupt snapshot`,()=>{
 const c=ready(),r=a.orderCanyonFormationV85(c,c.formations[0].id,'move',x,0);assert.equal(r.state,c);assert.ok(a.readCanyonV85(r.state));
});
