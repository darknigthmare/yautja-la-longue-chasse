import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:`export * from './app/game/systems/shipTrainingReceiptV94';export * from './app/game/systems/shipTrainingRecoveryV94';export * from './app/game/systems/progression';export * from './app/game/save';export * from './app/game/systems/archiveTransferGuard';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const a=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const owner='2026-10-16T00:00:00.000Z',date='2026-10-17T01:00:00.000Z',key=a.SHIP_PROGRESSION_STORAGE_KEY;
function fixture(discipline='targeting',score=82){
 const save=a.defaultSave(owner),base=a.createDefaultShipProgression(save,owner),data=new Map([[a.SAVE_STORAGE_KEY,JSON.stringify(save)],[key,JSON.stringify(base)]]),writes=[];
 const fault={drop:false,readback:false,read:false};
 const storage={getItem(k){if(k===key&&fault.read){fault.read=false;throw Error('read unavailable');}return data.get(k)??null;},setItem(k,v){writes.push([k,v]);if(!fault.drop)data.set(k,v);if(fault.readback){fault.readback=false;fault.read=true;}},removeItem:k=>data.delete(k)};
 const io={storage:()=>storage,write:(s,v,d)=>a.writeShipProgressionWithStatus(s,v,d)};
 const receipt=a.createShipTrainingReceiptV94(save,base,discipline,score,io,date);
 const raw=()=>JSON.stringify(receipt.recoveryCopy());
 return{save,base,data,writes,storage,io,receipt,fault,raw,restore:r=>a.restoreShipTrainingReceiptV94(r??raw(),save,io)};
}
for(const id of Object.keys(a.TRAINING_LABELS))test(`${id}: an interrupted score survives JSON roundtrip and counts once on explicit retry`,()=>{
 const f=fixture(id);f.fault.drop=true;assert.equal(f.receipt.attempt(f.save,f.base).status,'pending');const raw=f.raw(),before=f.data.get(key);f.fault.drop=false;
 const recovered=f.restore(raw);assert.ok(recovered);assert.equal(f.data.get(key),before,'restoring performs no writes');assert.equal(f.writes.length,1);
 const current=a.loadShipProgression(f.save,f.storage),result=recovered.attempt(f.save,current);assert.equal(result.status,'confirmed');assert.equal(result.state.training[id].attempts,1);assert.equal(result.state.training[id].lastCompletedAt,date);assert.equal(recovered.attempt(f.save,current).status,'ignored');assert.equal(recovered.recoveryCopy(),null);
});
test('zero is recovered as a completed zero-score attempt',()=>{const f=fixture('mobility',0);const r=f.restore();assert.equal(r.attempt(f.save,f.base).state.training.mobility.lastScore,0);assert.equal(f.writes.length,1);});
test('a written score with failed readback is reconciled after reload with no second write',()=>{
 const f=fixture();f.fault.readback=true;assert.equal(f.receipt.attempt(f.save,f.base).status,'pending');const r=f.restore();assert.ok(r);
 const current=a.loadShipProgression(f.save,f.storage);assert.equal(current.training.targeting.attempts,1);assert.equal(r.attempt(f.save,current).status,'confirmed');assert.equal(f.writes.length,1);
});
test('a stale recovery copy after a later successful retry cannot increment the same attempt again',()=>{
 const f=fixture();f.fault.drop=true;f.receipt.attempt(f.save,f.base);const old=f.raw();f.fault.drop=false;
 assert.equal(f.receipt.attempt(f.save,f.base).status,'confirmed');const r=f.restore(old);assert.ok(r);const n=f.writes.length;
 assert.equal(r.attempt(f.save,a.loadShipProgression(f.save,f.storage)).status,'confirmed');assert.equal(f.writes.length,n);
});
test('changed live or stored progression is retained rather than overwritten by recovery',()=>{
 const f=fixture();f.fault.drop=true;f.receipt.attempt(f.save,f.base);const raw=f.raw();f.fault.drop=false;
 const newer=a.recordTrainingResult(f.base,'mobility',99,date);f.data.set(key,JSON.stringify(newer));const r=f.restore(raw);assert.ok(r);
 assert.equal(r.attempt(f.save,newer).status,'pending');assert.equal(f.data.get(key),JSON.stringify(newer));assert.equal(f.writes.length,1);
});
for(const kind of ['foreign','future','corrupt','absent'])test(`${kind} sidecar cannot receive a restored old score`,()=>{
 const f=fixture();f.fault.drop=true;f.receipt.attempt(f.save,f.base);const r=f.restore();f.fault.drop=false;
 const raw=kind==='absent'?null:kind==='corrupt'?'{broken':JSON.stringify({...f.base,...(kind==='foreign'?{ownerSaveCreatedAt:date}:{version:99})});
 if(raw===null)f.data.delete(key);else f.data.set(key,raw);
 assert.equal(r.attempt(f.save,f.base).status,'pending');assert.equal(f.storage.getItem(key),raw);assert.equal(f.writes.length,1);
});
test('a foreign campaign or archive transfer cannot acknowledge an already-written restored score',()=>{
 const f=fixture();f.fault.readback=true;f.receipt.attempt(f.save,f.base);const r=f.restore(),current=a.loadShipProgression(f.save,f.storage);
 f.data.set(a.SAVE_STORAGE_KEY,JSON.stringify(a.defaultSave(date)));assert.equal(r.attempt(f.save,current).status,'pending');
 f.data.set(a.SAVE_STORAGE_KEY,JSON.stringify(f.save));f.data.set(a.ARCHIVE_TRANSFER_JOURNAL_KEY,'protected');assert.equal(r.attempt(f.save,current).status,'pending');assert.equal(f.writes.length,1);
});
test('a restored ambiguous custom writer exception stays blocked, never converted into an automatic retry',()=>{
 const f=fixture();const original=a.createShipTrainingReceiptV94(f.save,f.base,'targeting',82,{...f.io,write(){throw Error('unknown');}},date);
 original.attempt(f.save,f.base);const r=f.restore(JSON.stringify(original.recoveryCopy()));assert.ok(r);assert.equal(r.attempt(f.save,f.base).status,'pending');assert.equal(f.writes.length,0);
});
test('recovery copy cannot mutate the live receipt',()=>{const f=fixture(),v=f.receipt.recoveryCopy();v.score=99;v.baseline='{}';assert.equal(f.receipt.attempt(f.save,f.base).state.training.targeting.lastScore,82);});
for(const [label,mutate] of [
 ['future version',v=>v.version=99],['wrong owner',v=>v.owner=date],['invalid id',v=>v.id='invented'],
 ['noninteger score',v=>v.score=1.5],['unknown discipline',v=>v.disciplineId='fake'],['invalid date',v=>v.completedAt='not-a-date'],
 ['invalid clock',v=>v.clock='not-a-date'],['broken baseline',v=>v.baseline='{broken'],['malformed before',v=>{v.observed=true;v.before='{broken';}],
 ['unobserved before',v=>v.before='{}'],['impossible attempted result',v=>{v.observed=true;v.attempted={};}],
 ['nonboolean uncertainty',v=>v.unknownWrite='no']])test(`${label}: incompatible recovery rejected before any IO`,()=>{
 const f=fixture(),v=f.receipt.recoveryCopy();mutate(v);assert.equal(f.restore(JSON.stringify(v)),null);assert.equal(f.writes.length,0);
});
test('oversized UTF-8 recovery copies are refused',()=>{const f=fixture(),v=f.receipt.recoveryCopy();v.padding='🦴'.repeat(510_000);assert.equal(f.restore(JSON.stringify(v)),null);assert.equal(f.writes.length,0);});

function portFixture(){let raw=null;const writes=[];return{writes,get raw(){return raw;},set raw(v){raw=v;},port:{read:async()=>raw,replace:async(owner,before,next)=>{if(raw!==before)throw new a.ShipTrainingRecoveryErrorV94('conflict');writes.push({owner,before,next});raw=next;}}};}
test('a backup is never written without a known preimage',async()=>{const p=portFixture(),q=a.createShipTrainingRecoveryQueueV94(owner,p.port);await assert.rejects(q.replace('score'));assert.equal(p.writes.length,0);});
test('queued backup and cleanup preserve their order even when the panel has closed',async()=>{
 const p=portFixture(),q=a.createShipTrainingRecoveryQueueV94(owner,p.port);await q.read();const tasks=[q.replace('first'),q.replace('last'),q.replace(null)];await Promise.all(tasks);assert.equal(p.raw,null);assert.deepEqual(p.writes.map(w=>w.next),['first','last',null]);
});
test('two stale queues cannot overwrite each other or delete the other score',async()=>{
 const p=portFixture(),q=a.createShipTrainingRecoveryQueueV94(owner,p.port),r=a.createShipTrainingRecoveryQueueV94(owner,p.port);await Promise.all([q.read(),r.read()]);
 const results=await Promise.allSettled([q.replace('one'),r.replace('two')]);assert.equal(results.filter(v=>v.status==='fulfilled').length,1);assert.equal(p.raw,'one');await assert.rejects(r.replace(null));assert.equal(p.raw,'one');
});
test('commit-before-response failure is reconciled without rewriting the backup',async()=>{
 const p=portFixture(),write=p.port.replace;p.port.replace=async(...args)=>{await write(...args);throw Error('response lost');};const q=a.createShipTrainingRecoveryQueueV94(owner,p.port);await q.read();await q.replace('score');assert.equal(p.writes.length,1);assert.equal(p.raw,'score');
});
test('a failed backup preserves its preimage and permits an explicit subsequent save',async()=>{
 const p=portFixture(),write=p.port.replace;let refused=true;p.port.replace=(...args)=>refused?Promise.reject(Error('quota')):write(...args);const q=a.createShipTrainingRecoveryQueueV94(owner,p.port);await q.read();await assert.rejects(q.replace('score'));assert.equal(p.raw,null);refused=false;await q.replace('score');assert.equal(p.raw,'score');
});
test('a changed recovery copy is never deleted after a different result was confirmed',async()=>{
 const p=portFixture(),q=a.createShipTrainingRecoveryQueueV94(owner,p.port);await q.read();await q.replace('one');p.raw='other copy';await assert.rejects(q.replace(null));assert.equal(p.raw,'other copy');
});
test('failed hydration never invents a missing backup to overwrite',async()=>{
 const p=portFixture();p.raw='protected';p.port.read=async()=>{throw Error('denied');};const q=a.createShipTrainingRecoveryQueueV94(owner,p.port);await assert.rejects(q.read());await assert.rejects(q.replace('mine'));assert.equal(p.raw,'protected');assert.equal(p.writes.length,0);
});
test('native port refuses invalid owner and oversized data before opening IndexedDB',async()=>{let opens=0;const p=a.createShipTrainingRecoveryPortV94({open(){opens++;throw Error('must not open');}});await assert.rejects(p.read('not-an-owner'));await assert.rejects(p.replace(owner,null,'x'.repeat(a.SHIP_TRAINING_RECOVERY_MAX_BYTES_V94+1)));assert.equal(opens,0);});
test('missing and throwing IndexedDB refuse without legacy-storage fallback',async()=>{await assert.rejects(a.createShipTrainingRecoveryPortV94().read(owner));await assert.rejects(a.createShipTrainingRecoveryPortV94({open(){throw Error('denied');}}).read(owner));});
test('an IndexedDB open that never resolves is bounded',async()=>{await assert.rejects(a.createShipTrainingRecoveryPortV94({open(){return{};}},5).read(owner));});
