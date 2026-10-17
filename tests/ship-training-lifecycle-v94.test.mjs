import assert from 'node:assert/strict';
import test from 'node:test';
import {runInNewContext} from 'node:vm';
import {build} from 'esbuild';
import {webcrypto} from 'node:crypto';
const b=await build({stdin:{contents:`export * from './app/game/useShipTrainingV94'; export * from './app/game/systems/progression'; export * from './app/game/save';`,resolveDir:process.cwd()},bundle:true,write:false,format:'cjs',platform:'node',external:['react'],logLevel:'silent'});
const code=b.outputFiles[0].text;
function fixture(extra={}){
 const slots=[],effects=[],pending=[];let cursor=0,dirty=false,out;
 const eq=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
 const react={
  useRef(initial){const n=cursor++;return slots[n]??=( {current:initial} );},
  useState(initial){const n=cursor++;if(!(n in slots))slots[n]=typeof initial==='function'?initial():initial;return[slots[n],v=>{const next=typeof v==='function'?v(slots[n]):v;if(!Object.is(next,slots[n])){slots[n]=next;dirty=true;}}];},
  useCallback(fn,deps){const n=cursor++;if(!slots[n]||!eq(slots[n].deps,deps))slots[n]={deps,fn};return slots[n].fn;},
  useEffect(fn,deps){const n=cursor++;if(!effects[n]||!eq(effects[n].deps,deps))pending.push({n,fn,deps});},
 };
 const data=new Map(),writes=[],confirmed=[],messages=[],fault={drop:false};
 const storage={getItem:k=>data.get(k)??null,setItem(k,v){writes.push([k,v]);if(!fault.drop)data.set(k,v);},removeItem:k=>data.delete(k)};
 const document={visibilityState:'visible',focused:true,hasFocus(){return this.focused;}},root={blocked:false,closest(){return this.blocked?this:null;}};
 const module={exports:{}};runInNewContext(code,{module,exports:module.exports,require:name=>{assert.equal(name,'react');return react;},window:{localStorage:storage},document,TextEncoder,TextDecoder,Date,console,crypto:webcrypto,setTimeout,clearTimeout});
 const a=module.exports,save=a.defaultSave('2026-10-16T00:00:00.000Z'),base=a.createDefaultShipProgression(save,save.updatedAt);
 data.set(a.SAVE_STORAGE_KEY,JSON.stringify(save));data.set(a.SHIP_PROGRESSION_STORAGE_KEY,JSON.stringify(base));
 let options={save,progression:base,controlled:false,suspended:false,rootRef:{current:root},onConfirmed:s=>{confirmed.push(s);options={...options,progression:s};dirty=true;},notify:m=>messages.push(m),...extra};
 function render(){cursor=0;dirty=false;out=a.useShipTrainingV94({...options});while(pending.length){const e=pending.shift();effects[e.n]?.cleanup?.();effects[e.n]={...e,cleanup:e.fn()};}}
 function flush(){let budget=30;do{render();assert.ok(--budget,'render loop');}while(dirty);}
 function update(values){options={...options,...values};flush();}
 function unmount(){for(const e of effects)e?.cleanup?.();}
 async function start(id='targeting'){const promise=out.requestTraining(id);flush();await promise;flush();}
 flush();return{a,data,writes,confirmed,messages,fault,document,root,flush,update,unmount,start,get current(){return out;},get options(){return options;},replay(){for(const e of effects)if(e){e.cleanup?.();e.cleanup=e.fn();}flush();}};
}
const deferred=()=>{let resolve,reject;return{promise:new Promise((r,j)=>{resolve=r;reject=j;}),resolve:v=>resolve(v),reject:e=>reject(e)};};
for(const discipline of ['targeting','wristblades','cloaking','mobility','honor-duel'])test(`${discipline}: one native result writes exactly one attempt`,async()=>{const f=fixture();await f.start(discipline);f.current.completeAutonomousTraining(85);f.current.completeAutonomousTraining(85);f.flush();assert.equal(f.confirmed.length,1);assert.equal(f.confirmed[0].training[discipline].attempts,1);assert.equal(f.current.trainingSession,null);assert.equal(f.current.saveIssue,null);assert.equal(f.writes.length,1);});
test('dropped score leaves the drill and a recoverable receipt without claiming saved',async()=>{const f=fixture();await f.start();f.fault.drop=true;f.current.completeAutonomousTraining(82);f.flush();assert.ok(f.current.trainingSession);assert.ok(f.current.saveIssue);assert.equal(f.current.canRetryTraining,true);assert.equal(f.confirmed.length,0);assert.ok(f.current.hasPendingResult());f.fault.drop=false;f.current.retryTrainingSave();f.flush();assert.equal(f.confirmed.length,1);assert.equal(f.confirmed[0].training.targeting.attempts,1);});
test('closing a completed drill preserves its pending score and permits explicit retry',async()=>{const f=fixture();await f.start();f.fault.drop=true;f.current.completeAutonomousTraining(82);f.flush();f.current.cancelAutonomousTraining();f.flush();assert.equal(f.current.trainingSession,null);assert.ok(f.current.hasPendingResult());await f.start('mobility');assert.equal(f.current.trainingSession,null);f.fault.drop=false;f.current.retryTrainingSave();f.flush();assert.equal(f.confirmed.length,1);});
test('an old completion callback cannot complete a replacement drill',async()=>{const f=fixture();await f.start();const old=f.current.completeAutonomousTraining;f.current.cancelAutonomousTraining();f.flush();await f.start('mobility');old(100);f.flush();assert.equal(f.writes.length,0);f.current.completeAutonomousTraining(90);f.flush();assert.equal(f.confirmed[0].training.mobility.attempts,1);assert.equal(f.confirmed[0].training.targeting.attempts,0);});
test('external double requests are serialized immediately, before a render',async()=>{const d=deferred();let n=0;const f=fixture({onTrainingRequested:()=>{n++;return d.promise;}});const one=f.current.requestTraining('targeting'),two=f.current.requestTraining('mobility');f.flush();assert.equal(n,1);d.resolve(88);await Promise.all([one,two]);f.flush();assert.equal(f.writes.length,1);assert.equal(f.confirmed[0].training.targeting.lastScore,88);});
for(const finish of ['resolve','reject'])test(`late external ${finish} after unmount is inert`,async()=>{const d=deferred(),f=fixture({onTrainingRequested:()=>d.promise});const p=f.current.requestTraining('targeting');f.flush();f.unmount();const count=f.messages.length;d[finish](finish==='resolve'?99:Error('late'));await p;assert.equal(f.writes.length,0);assert.equal(f.messages.length,count);});
for(const finish of ['resolve','reject'])test(`cancelled external ${finish} cannot disturb the next drill`,async()=>{const d=deferred(),f=fixture({onTrainingRequested:()=>d.promise});const p=f.current.requestTraining('targeting');f.flush();f.current.cancelAutonomousTraining();f.flush();f.update({onTrainingRequested:undefined});await f.start('mobility');const count=f.messages.length;d[finish](finish==='resolve'?99:Error('late'));await p;f.flush();assert.equal(f.writes.length,0);assert.equal(f.current.trainingSession.disciplineId,'mobility');assert.equal(f.messages.length,count);});
test('a late external result is refused after a campaign owner change',async()=>{const d=deferred(),f=fixture({onTrainingRequested:()=>d.promise});const p=f.current.requestTraining('targeting');f.flush();f.update({save:{...f.options.save,createdAt:'2026-10-17T00:00:00.000Z'}});d.resolve(99);await p;assert.equal(f.writes.length,0);assert.equal(f.confirmed.length,0);});
test('external completion uses the current progression instead of an old captured render',async()=>{const d=deferred(),f=fixture({onTrainingRequested:()=>d.promise});const p=f.current.requestTraining('targeting');f.flush();const updated=f.a.recordTrainingResult(f.options.progression,'mobility',95);f.data.set(f.a.SHIP_PROGRESSION_STORAGE_KEY,JSON.stringify(updated));f.update({progression:updated});d.resolve(75);await p;f.flush();assert.equal(f.confirmed[0].training.mobility.attempts,1);assert.equal(f.confirmed[0].training.targeting.attempts,1);});
test('suspended external completion remains pending until explicit resumed retry',async()=>{const d=deferred(),f=fixture({onTrainingRequested:()=>d.promise});const p=f.current.requestTraining('targeting');f.flush();f.update({suspended:true});d.resolve(75);await p;f.flush();assert.equal(f.writes.length,0);assert.ok(f.current.hasPendingResult());f.update({suspended:false});f.current.retryTrainingSave();f.flush();assert.equal(f.writes.length,1);});
test('controlled progression delegates once without a local save claim or fallback write',async()=>{const delegated=[],f=fixture({controlled:true,onDelegated:s=>delegated.push(s)});await f.start();f.current.completeAutonomousTraining(84);f.current.completeAutonomousTraining(84);f.flush();assert.equal(delegated.length,1);assert.equal(f.writes.length,0);assert.match(f.messages.at(-1),/sauvegarde non vérifiée/);});
test('throwing controlled receiver is never automatically retried',async()=>{let calls=0;const f=fixture({controlled:true,onDelegated:()=>{calls++;throw Error('unknown');}});await f.start();f.current.completeAutonomousTraining(84);f.flush();f.current.retryTrainingSave();f.current.completeAutonomousTraining(84);f.flush();assert.equal(calls,1);assert.equal(f.writes.length,0);assert.ok(f.current.saveIssue);assert.equal(f.current.canRetryTraining,false);});
test('reentrant success notification cannot start a second score request',async()=>{const f=fixture();f.update({onConfirmed:()=>{void f.current.requestTraining('mobility');}});await f.start();f.current.completeAutonomousTraining(80);f.flush();assert.equal(f.current.trainingSession,null);assert.equal(f.writes.length,1);});
for(const score of [undefined,NaN,101,-1,1.5])test(`invalid external result ${score} is not recorded`,async()=>{const f=fixture({onTrainingRequested:()=>score});await f.start();assert.equal(f.writes.length,0);assert.equal(f.current.trainingSession,null);});
test('disabled page or overlay cannot start a drill',async()=>{const f=fixture();f.root.blocked=true;await f.start();f.root.blocked=false;f.document.focused=false;await f.start();assert.equal(f.current.trainingSession,null);assert.equal(f.writes.length,0);});

test('a presentation error at opening cannot strand the real external request',async()=>{
 let calls=0;const f=fixture({onTrainingRequested:()=>{calls++;return 82;},notify:()=>{throw Error('HUD unavailable');}});
 await f.start();assert.equal(calls,1);assert.equal(f.confirmed.length,1);assert.equal(f.writes.length,1);assert.equal(f.current.trainingSession,null);
});
test('cancelling from the opening notification must not invoke an abandoned provider',async()=>{
 let calls=0;const f=fixture({onTrainingRequested:()=>{calls++;return 99;}});
 f.update({notify:()=>{f.current.cancelAutonomousTraining();}});await f.start();
 assert.equal(calls,0);assert.equal(f.writes.length,0);assert.equal(f.current.trainingSession,null);
});
test('unmounting from the opening notification must not invoke the provider',async()=>{
 let calls=0;const f=fixture({onTrainingRequested:()=>{calls++;return 99;}});
 f.update({notify:()=>f.unmount()});await f.current.requestTraining('targeting');
 assert.equal(calls,0);assert.equal(f.writes.length,0);
});
test('a throwing success notification cannot turn a confirmed score into failure',async()=>{
 const f=fixture();await f.start();f.update({notify:()=>{throw Error('HUD unavailable');}});
 assert.doesNotThrow(()=>f.current.completeAutonomousTraining(80));f.flush();
 assert.equal(f.confirmed.length,1);assert.equal(f.writes.length,1);assert.equal(f.current.trainingSession,null);assert.equal(f.current.hasPendingResult(),false);
});
test('a throwing save-warning observer keeps a retryable receipt without escaping',async()=>{
 const f=fixture();await f.start();f.fault.drop=true;f.update({notify:()=>{throw Error('HUD unavailable');}});
 assert.doesNotThrow(()=>f.current.completeAutonomousTraining(80));f.flush();assert.ok(f.current.hasPendingResult());assert.ok(f.current.canRetryTraining);
 f.fault.drop=false;assert.doesNotThrow(()=>f.current.retryTrainingSave());f.flush();assert.equal(f.confirmed.length,1);
});
test('a throwing cancellation observer cannot wedge the next drill',async()=>{
 const f=fixture();await f.start();f.update({notify:()=>{throw Error('HUD unavailable');}});
 assert.doesNotThrow(()=>f.current.cancelAutonomousTraining());f.flush();await f.start('mobility');assert.equal(f.current.trainingSession.disciplineId,'mobility');
});
test('a throwing rejection observer does not create an unhandled provider rejection',async()=>{
 const d=deferred(),f=fixture({onTrainingRequested:()=>d.promise});const request=f.current.requestTraining('targeting');f.flush();
 f.update({notify:()=>{throw Error('HUD unavailable');}});d.reject(Error('provider unavailable'));await assert.doesNotReject(request);f.flush();assert.equal(f.current.trainingSession,null);assert.equal(f.writes.length,0);
});
test('a controlled result stays transmitted when only its success notification throws',async()=>{
 let calls=0;const f=fixture({controlled:true,onDelegated:()=>{calls++;}});await f.start();f.update({notify:()=>{throw Error('HUD unavailable');}});
 f.current.completeAutonomousTraining(80);f.flush();assert.equal(calls,1);assert.equal(f.current.hasPendingResult(),false);assert.equal(f.current.saveIssue,null);assert.equal(f.current.trainingSession,null);
});
