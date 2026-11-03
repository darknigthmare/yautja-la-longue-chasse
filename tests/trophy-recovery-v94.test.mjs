import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
const compiled = await build({stdin:{contents:`export * from './app/game/systems/trophyWorkshopCommitV94'; export * from './app/game/systems/trophyWorkshopRecoveryV94'; export * from './app/game/save';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const a = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const owner='2026-10-16T00:00:00.000Z', date='2026-10-16T12:00:00.000Z', key='trophy-recovery-test';
function setup(action='clean') {
 const values=new Map(),writes=[],fault={drop:false,quota:false,readback:false,read:false,blocked:false};
 const storage={getItem(k){if(k===key&&fault.read){fault.read=false;throw Error('read');}return values.get(k)??null;},setItem(k,v){if(k===key){writes.push(v);if(fault.quota)throw Error('quota');if(fault.drop)return;}values.set(k,v);if(k===key&&fault.readback){fault.readback=false;fault.read=true;}},removeItem(k){values.delete(k);}};
 const seed=a.defaultSave(owner);seed.trophies=[{id:'claim-v94',definitionId:'trophy-vey',targetName:'Prise',targetKind:'human',partId:'insignia',condition:'pristine',quality:'elite',missionId:'jungle-vey',difficultyId:'elite',score:200,claimedAt:owner}];
 if(action!=='clean')seed.trophies[0].workshop={completedActions:['clean','prepare','display'].slice(0,['clean','prepare','display','rite'].indexOf(action)),bestScore:500,lastCompletedAt:owner};
 const base=a.writeSaveWithStatus(seed,storage,key).save;
 const target={trophyId:'claim-v94',trophyName:'Prise',action},result={action,score:450,accuracy:.9,mistakes:0,elapsedSeconds:10,grade:'elite'};
 const io={write:s=>a.writeSaveWithStatus(s,storage,key),reconcile:(r,o)=>a.reconcileSaveWrite(r,o,storage,key),readForRecovery:()=>{const raw=storage.getItem(key);const save=raw===null?null:a.parseSaveImport(raw).save;return{save,failure:save?null:'save-conflict'};},recoveryAllowed:()=>!fault.blocked};
 const receipt=a.createTrophyWorkshopCommitV94(base,target,result,io,date);writes.length=0;
 return {values,writes,fault,storage,base,target,result,io,receipt,load:()=>a.loadSaveWithStatus(storage,key).save};
}
const rawOf=s=>JSON.stringify(s.receipt.recoveryCopy());
for(const action of ['clean','prepare','display','rite'])for(const fault of ['drop','quota'])test(`${action}/${fault}: restart restores one rite with its original date, then confirms once`,()=>{
 const s=setup(action);s.fault[fault]=true;assert.equal(s.receipt.run(s.base,true).status,'pending');const raw=rawOf(s);s.fault[fault]=false;
 const current=s.load(),r=a.restoreTrophyWorkshopCommitV94(raw,current,s.io);assert.ok(r);const n=s.writes.length;
 assert.deepEqual(current,s.base);assert.equal(s.writes.length,n,'restoration is read-only');
 const outcome=r.run(current,true);assert.equal(outcome.status,'confirmed');assert.equal(s.writes.length,n+1);
 assert.equal(outcome.save.trophies[0].workshop.lastCompletedAt,date);assert.equal(outcome.save.trophies[0].workshop.completedActions.filter(x=>x===action).length,1);
 assert.equal(r.run(outcome.save,true).status,'ignored');assert.equal(r.recoveryCopy(),null);
});
test('a write-before-readback failure is acknowledged after reload without a second primary write',()=>{
 const s=setup();s.fault.readback=true;assert.equal(s.receipt.run(s.base,true).status,'pending');const raw=rawOf(s);const current=s.load();
 const restored=a.restoreTrophyWorkshopCommitV94(raw,current,s.io);assert.ok(restored);const n=s.writes.length;
 const result=restored.run(current,true);assert.equal(result.status,'confirmed');assert.equal(s.writes.length,n);assert.deepEqual(result.save,current);
});
test('stale backup remaining after a subsequent successful retry is reconciled, not replayed',()=>{
 const s=setup();s.fault.drop=true;s.receipt.run(s.base,true);const raw=rawOf(s);s.fault.drop=false;
 const saved=s.receipt.run(s.base,true);assert.equal(saved.status,'confirmed');const restored=a.restoreTrophyWorkshopCommitV94(raw,s.load(),s.io),n=s.writes.length;
 assert.equal(restored.run(s.load(),true).status,'confirmed');assert.equal(s.writes.length,n);
});
for(const kind of ['owner','future','corrupt','changed','absent'])test(`${kind}: recovery preserves different on-disk campaign bytes`,()=>{
 const s=setup();s.fault.drop=true;s.receipt.run(s.base,true);const restored=a.restoreTrophyWorkshopCommitV94(rawOf(s),s.base,s.io);s.fault.drop=false;
 const raw=kind==='future'?'{"version":999}':kind==='corrupt'?'broken':kind==='absent'?null:JSON.stringify({...s.base,...(kind==='owner'?{createdAt:date}:{statistics:{...s.base.statistics,totalScans:567}})});
 if(raw===null)s.values.delete(key);else s.values.set(key,raw);const n=s.writes.length;
 assert.equal(restored.run(s.base,true).status,'pending');assert.equal(s.values.get(key)??null,raw);assert.equal(s.writes.length,n);
});
test('a restored rite cannot overwrite unrelated in-memory progress',()=>{const s=setup();s.fault.drop=true;s.receipt.run(s.base,true);const r=a.restoreTrophyWorkshopCommitV94(rawOf(s),s.base,s.io),n=s.writes.length;const current={...s.base,statistics:{...s.base.statistics,totalScans:42}};assert.equal(r.run(current,true).failure,'save-conflict');assert.equal(s.writes.length,n);});
test('a restored rite defers under transfer protection and temporary suspension',()=>{const s=setup();s.fault.drop=true;s.receipt.run(s.base,true);const r=a.restoreTrophyWorkshopCommitV94(rawOf(s),s.base,s.io),n=s.writes.length;s.fault.drop=false;s.fault.blocked=true;assert.equal(r.run(s.base,true).status,'pending');s.fault.blocked=false;assert.equal(r.run(s.base,false).status,'pending');assert.equal(s.writes.length,n);assert.equal(r.run(s.base,true).status,'confirmed');});
test('read failure during restored validation is retryable, never an invented receipt',()=>{const s=setup();s.fault.drop=true;s.receipt.run(s.base,true);const r=a.restoreTrophyWorkshopCommitV94(rawOf(s),s.base,s.io),n=s.writes.length;s.fault.drop=false;s.fault.read=true;assert.equal(r.run(s.base,true).status,'pending');assert.equal(s.writes.length,n);assert.equal(r.run(s.base,true).status,'confirmed');});
test('custom writer uncertainty survives serialization and is never automatically retried',()=>{const s=setup();let n=0;const io={...s.io,write(){n++;throw Error('unknown');}};const r=a.createTrophyWorkshopCommitV94(s.base,s.target,s.result,io,date);r.run(s.base,true);const restored=a.restoreTrophyWorkshopCommitV94(JSON.stringify(r.recoveryCopy()),s.base,io);assert.ok(restored);assert.equal(restored.run(s.base,true).status,'pending');assert.equal(n,1);});
test('the serialized copy and caller data cannot mutate an in-flight rite',()=>{const s=setup();const v=s.receipt.recoveryCopy();v.result.score=0;JSON.parse(v.base).trophies.length=0;s.result.score=0;s.target.trophyId='foreign';assert.equal(s.receipt.recoveryCopy().result.score,450);assert.equal(s.receipt.run(s.base,true).status,'confirmed');});
for(const [name,edit] of [
 ['format',v=>v.format='other'],['version',v=>v.version=100],['owner',v=>v.owner=date],['id',v=>v.id='not-uuid'],
 ['base corruption',v=>v.base='{}'],['future base',v=>v.base=JSON.stringify({...JSON.parse(v.base),version:999})],
 ['action',v=>v.target.action='unknown'],['missing trophy',v=>v.target.trophyId='missing'],['score',v=>v.result.score=-1],
 ['mistakes',v=>v.result.mistakes=3],['time',v=>v.completedAt='broken'],['uncertainty',v=>v.uncertainException='yes'],
 ['attempted different progression',v=>v.attempted={...JSON.parse(v.base),statistics:{...JSON.parse(v.base).statistics,totalScans:99}}],
 ['attempted future',v=>v.attempted={...JSON.parse(v.base),version:999}],
 ['result action mismatch',v=>v.result.action='rite'],
])test(`invalid recovery ${name} is rejected without IO`,()=>{const s=setup(),v=s.receipt.recoveryCopy();edit(v);const denied=()=>{throw Error('unexpected IO');};assert.equal(a.restoreTrophyWorkshopCommitV94(JSON.stringify(v),s.base,{write:denied,reconcile:denied,readForRecovery:denied,recoveryAllowed:denied}),null);});
test('oversized recovery bytes cannot be restored',()=>{const s=setup();assert.equal(a.restoreTrophyWorkshopCommitV94('x'.repeat(a.TROPHY_WORKSHOP_RECOVERY_MAX_BYTES_V94+1),s.base,s.io),null);});
function memoryPort(){let raw=null;return {read:async()=>raw,replace:async(_o,expected,next)=>{if(raw!==expected)throw new a.TrophyWorkshopRecoveryErrorV94('conflict');raw=next;},raw:()=>raw};}
test('two stale recovery queues cannot overwrite or erase one another',async()=>{const port=memoryPort(),first=a.createTrophyWorkshopRecoveryQueueV94(owner,port),second=a.createTrophyWorkshopRecoveryQueueV94(owner,port);await Promise.all([first.read(),second.read()]);await first.replace('first');await assert.rejects(second.replace('second'));await assert.rejects(second.replace(null));assert.equal(port.raw(),'first');});
test('queueing backup followed by cleanup keeps this order even after UI removal',async()=>{const port=memoryPort(),q=a.createTrophyWorkshopRecoveryQueueV94(owner,port);await q.read();await Promise.all([q.replace('backup'),q.replace(null)]);await q.whenSettled();assert.equal(port.raw(),null);});
test('failed journal hydration never invents an empty preimage',async()=>{let writes=0;const q=a.createTrophyWorkshopRecoveryQueueV94(owner,{read:async()=>{throw Error('denied');},replace:async()=>{writes++;}});await assert.rejects(q.read());await assert.rejects(q.replace('next'));assert.equal(writes,0);});
test('native trophy journal refuses invalid owner and excessive payload before opening',async()=>{let opens=0;const p=a.createTrophyWorkshopRecoveryPortV94({open(){opens++;throw Error('not reached');}});await assert.rejects(p.read('broken'));await assert.rejects(p.replace(owner,null,'x'.repeat(a.TROPHY_WORKSHOP_RECOVERY_MAX_BYTES_V94+1)));assert.equal(opens,0);});
test('native stalled IndexedDB open is bounded without writing the primary save',async()=>{const p=a.createTrophyWorkshopRecoveryPortV94({open(){return{};}},15);await assert.rejects(p.read(owner));});

test('a refused recovery inspection cannot rebase the normal writer onto a foreign update',()=>{const s=setup();s.fault.drop=true;s.receipt.run(s.base,true);const r=a.restoreTrophyWorkshopCommitV94(rawOf(s),s.base,s.io);s.fault.drop=false;const foreign=JSON.stringify({...s.base,statistics:{...s.base.statistics,totalScans:882}});s.values.set(key,foreign);assert.equal(r.run(s.base,true).status,'pending');assert.equal(a.writeSaveWithStatus(s.base,s.storage,key).failure,'save-conflict');assert.equal(s.values.get(key),foreign);});

test('restored retry stays recoverable after two failed writes and a timestamp-only reload',()=>{
 const s=setup();s.fault.drop=true;s.receipt.run(s.base,true);const raw=rawOf(s);
 const changedClock={...s.base,updatedAt:'2026-10-16T18:00:00.000Z'};
 s.values.set(key,JSON.stringify(changedClock));const current=s.load();
 const restored=a.restoreTrophyWorkshopCommitV94(raw,current,s.io);assert.ok(restored);
 assert.equal(restored.run(current,true).status,'pending');
 assert.equal(restored.run(current,true).failure,'write-failed','timestamp normalization must not turn later retries into a conflict');
 s.fault.drop=false;const result=restored.run(current,true);
 assert.equal(result.status,'confirmed');assert.equal(result.save.trophies[0].workshop.lastCompletedAt,date);
});
