import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
const b=await build({stdin:{contents:`export * from './app/game/systems/shipTrainingReceiptV94'; export * from './app/game/systems/progression'; export * from './app/game/save'; export * from './app/game/systems/archiveTransferGuard';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const a=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const date='2026-10-16T12:00:00.000Z',owner='2026-10-16T00:00:00.000Z',key=a.SHIP_PROGRESSION_STORAGE_KEY;
function fixture(discipline='targeting',score=80){
 const save=a.defaultSave(owner),base=a.createDefaultShipProgression(save,owner),data=new Map([[a.SAVE_STORAGE_KEY,JSON.stringify(save)],[key,JSON.stringify(base)]]);
 const writes=[],fault={quota:false,drop:false,read:false,readback:false,throwAfter:false};
 const storage={getItem(k){if(fault.read&&k===key){fault.read=false;throw Error('read');}return data.get(k)??null;},setItem(k,v){writes.push([k,v]);if(fault.quota)throw Error('quota');if(fault.drop)return;data.set(k,v);if(fault.readback){fault.readback=false;fault.read=true;}if(fault.throwAfter)throw Error('after');},removeItem(k){data.delete(k);}};
 const io={storage:()=>storage,write:(s,v,d)=>a.writeShipProgressionWithStatus(s,v,d)};
 const receipt=a.createShipTrainingReceiptV94(save,base,discipline,score,io,date);assert.ok(receipt);
 return{save,base,data,writes,storage,io,receipt,fault,run:(...args)=>receipt.attempt(...(args.length?args:[save,base]))};
}
for(const discipline of Object.keys(a.TRAINING_LABELS))test(`${discipline}: confirmed once, authored score and date preserved`,()=>{
 const f=fixture(discipline),original=JSON.stringify(f.base),campaign=f.data.get(a.SAVE_STORAGE_KEY),r=f.run();assert.equal(r.status,'confirmed');assert.equal(r.state.training[discipline].attempts,1);assert.equal(r.state.training[discipline].lastScore,80);assert.equal(r.state.training[discipline].lastCompletedAt,date);assert.equal(f.run().status,'ignored');assert.equal(f.writes.length,1);assert.equal(JSON.stringify(f.base),original);assert.equal(f.data.get(a.SAVE_STORAGE_KEY),campaign);
});
for(const kind of ['drop','quota'])test(`${kind}: retry records one attempt, no gesture replay and same completion date`,()=>{
 const f=fixture();f.fault[kind]=true;assert.equal(f.run().status,'pending');assert.equal(f.base.training.targeting.attempts,0);f.fault[kind]=false;const r=f.run();assert.equal(r.status,'confirmed');assert.equal(r.state.training.targeting.attempts,1);assert.equal(r.state.training.targeting.lastCompletedAt,date);
});
for(const kind of ['readback','throwAfter'])test(`${kind}: ambiguous persisted bytes reconcile without another write`,()=>{
 const f=fixture();f.fault[kind]=true;assert.equal(f.run().status,'pending');assert.equal(f.writes.length,1);assert.equal(f.run().status,'confirmed');assert.equal(f.writes.length,1);
});
test('read unavailable at first attempt does not create an unknown preimage or write',()=>{const f=fixture();f.fault.read=true;assert.equal(f.run().status,'pending');assert.equal(f.writes.length,0);assert.equal(f.run().status,'confirmed');});
test('missing storage can recover but never writes a memory success',()=>{const f=fixture();let available=false;const r=a.createShipTrainingReceiptV94(f.save,f.base,'targeting',70,{...f.io,storage:()=>available?f.storage:null},date);assert.equal(r.attempt(f.save,f.base).status,'pending');assert.equal(f.writes.length,0);available=true;assert.equal(r.attempt(f.save,f.base).status,'confirmed');});
for(const kind of ['foreign','future','corrupt','changed','removed'])test(`${kind} sidecar is never overwritten by a pending score`,()=>{
 const f=fixture();f.fault.drop=true;f.run();f.fault.drop=false;let raw;
 if(kind==='foreign')raw=JSON.stringify({...f.base,ownerSaveCreatedAt:'2026-01-01T00:00:00Z'});
 if(kind==='future')raw=JSON.stringify({...f.base,version:999});
 if(kind==='corrupt')raw='{broken';
 if(kind==='changed')raw=JSON.stringify(a.recordTrainingResult(f.base,'mobility',95,date));
 if(kind==='removed')f.data.delete(key);else f.data.set(key,raw);
 const before=f.data.get(key),n=f.writes.length;assert.equal(f.run().status,'pending');assert.equal(f.data.get(key),before);assert.equal(f.writes.length,n);
});
for(const kind of ['owner','progress'])test(`changed live ${kind} refuses an old attempt`,()=>{const f=fixture(),state=kind==='owner'?{...f.base,ownerSaveCreatedAt:date}:a.recordTrainingResult(f.base,'mobility',90,date);assert.equal(f.run(f.save,state).status,'pending');assert.equal(f.writes.length,0);});
for(const kind of ['future','foreign'])test(`a ${kind} main campaign cannot receive a reconciled score`,()=>{const f=fixture();f.fault.readback=true;f.run();f.data.set(a.SAVE_STORAGE_KEY,kind==='future'?' {"version":999}':JSON.stringify({...f.save,createdAt:date}));assert.equal(f.run().status,'pending');assert.equal(f.writes.length,1);});
test('pending archive transfer performs no sidecar mutation',()=>{const f=fixture();f.data.set(a.ARCHIVE_TRANSFER_JOURNAL_KEY,'pending');assert.equal(f.run().status,'pending');assert.equal(f.writes.length,0);f.data.delete(a.ARCHIVE_TRANSFER_JOURNAL_KEY);assert.equal(f.run().status,'confirmed');});
test('suspension defers writing and a fixed UI clock does not count as progress change',()=>{const f=fixture();assert.equal(f.run(f.save,f.base,false).status,'pending');assert.equal(f.writes.length,0);assert.equal(f.run(f.save,{...f.base,updatedAt:date},true).status,'confirmed');});
test('zero score is a completed attempt, not a missing result',()=>{const f=fixture('mobility',0),r=f.run();assert.equal(r.status,'confirmed');assert.equal(r.state.training.mobility.attempts,1);assert.equal(r.state.training.mobility.lastScore,0);});
test('a previously absent sidecar is written only from the matching default state',()=>{const f=fixture();f.data.delete(key);assert.equal(f.run().status,'confirmed');const g=fixture();g.data.delete(key);g.base.training.mobility.attempts=5;const r=a.createShipTrainingReceiptV94(g.save,g.base,'targeting',80,g.io,date);assert.equal(r.attempt(g.save,g.base).status,'pending');assert.equal(g.writes.length,0);});
test('invalid score, discipline or owner does not create a receipt',()=>{const f=fixture();for(const v of [NaN,Infinity,-1,101,1.5])assert.equal(a.createShipTrainingReceiptV94(f.save,f.base,'targeting',v,f.io,date),null);assert.equal(a.createShipTrainingReceiptV94(f.save,f.base,'unknown',99,f.io,date),null);assert.equal(a.createShipTrainingReceiptV94(f.save,{...f.base,ownerSaveCreatedAt:date},'targeting',99,f.io,date),null);assert.equal(f.writes.length,0);});
test('reentrant writer cannot count another attempt',()=>{const f=fixture();let r;r=a.createShipTrainingReceiptV94(f.save,f.base,'targeting',80,{...f.io,write(...args){assert.equal(r.attempt(f.save,f.base).status,'ignored');return f.io.write(...args);}},date);assert.equal(r.attempt(f.save,f.base).status,'confirmed');assert.equal(f.writes.length,1);});
test('unacknowledged custom exception is never replayed automatically',()=>{const f=fixture();let calls=0;const r=a.createShipTrainingReceiptV94(f.save,f.base,'targeting',80,{...f.io,write(){calls++;throw Error('unknown');}},date);assert.equal(r.attempt(f.save,f.base).status,'pending');assert.equal(r.attempt(f.save,f.base).status,'pending');assert.equal(calls,1);});
