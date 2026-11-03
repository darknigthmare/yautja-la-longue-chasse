import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture, deferred, acknowledgementClock } from './helpers/ship-service-harness-v94.mjs';
const drain=async f=>{for(let i=0;i<4;i++){await Promise.resolve();f.flush();}};
const candidate=f=>f.a.startMedbayTreatment(f.options.progression,'minor-wounds',30);
const shipWrites=f=>f.writes.filter(([key])=>key===f.a.SHIP_PROGRESSION_STORAGE_KEY);
function external(extra={}){
 const clock=acknowledgementClock(),pending=deferred(),calls=[];
 const f=fixture({controlled:true,receive:s=>{calls.push(s);return pending.promise;},...extra},clock);
 return {f,clock,pending,calls};
}

test('a native treatment is published only after its real write confirmation',()=>{
 const f=fixture(),next=candidate(f);f.current.commit(next,'Soins');
 assert.equal(shipWrites(f).length,1);assert.equal(f.confirmed.length,1);
 assert.match(f.messages.at(-1),/sauvegarde confirmée/);f.flush();assert.equal(f.current.hasPending(),false);
});
test('same-render duplicate service input cannot write twice or reuse its old source',()=>{
 const f=fixture(),next=candidate(f);f.current.commit(next,'Soins');f.current.commit(next,'Autres soins');
 assert.equal(shipWrites(f).length,1);f.flush();assert.equal(f.current.hasPending(),false);
});
test('native dropped write preserves the displayed state and permits an explicit retry',()=>{
 const f=fixture(),base=f.options.progression,next=candidate(f);f.fault.drop=true;f.start(next);
 assert.equal(f.options.progression,base);assert.equal(f.confirmed.length,0);assert.match(f.current.issue,/non confirmée/);
 f.fault.drop=false;f.start(next);assert.equal(f.confirmed.length,1);assert.equal(f.current.issue,null);
});
test('throw after a custom write remains uncertain with no blind replay',()=>{
 const f=fixture({write:()=>{throw Error('unknown write outcome');}});f.start(candidate(f));
 assert.equal(f.current.hasPending(),true);f.current.commit(candidate(f));assert.equal(shipWrites(f).length,0);
});
for(const blocked of ['suspended','training','hidden','focus','inert'])test(`${blocked} prevents service writes`,()=>{
 const f=fixture();if(blocked==='suspended')f.update({suspended:true});if(blocked==='training')f.update({blocked:()=>true});
 if(blocked==='hidden')f.document.visibilityState='hidden';if(blocked==='focus')f.document.focused=false;if(blocked==='inert')f.root.blocked=true;
 f.start(candidate(f));assert.equal(shipWrites(f).length,0);assert.equal(f.confirmed.length,0);
});
test('foreign campaign candidates cannot mutate the current ship',()=>{
 const f=fixture();f.start({...candidate(f),ownerSaveCreatedAt:'2000-01-01T00:00:00.000Z'});
 assert.equal(shipWrites(f).length,0);assert.match(f.messages.at(-1),/Autre campagne/);
});
test('native display observers throwing after a confirmed save do not relabel it as a storage failure',()=>{
 const f=fixture({onNativeConfirmed:()=>{throw Error('render observer');}});f.start(candidate(f),'Soins');
 assert.equal(shipWrites(f).length,1);assert.match(f.messages.at(-1),/sauvegardé, mais affichage/);assert.equal(f.current.issue,null);
});
test('a notification observer cannot escape or cancel a confirmed operation',()=>{
 const f=fixture({notify:()=>{throw Error('toast');}});assert.doesNotThrow(()=>f.start(candidate(f)));
 assert.equal(shipWrites(f).length,1);assert.equal(f.confirmed.length,1);
});
test('controlled service waits for a matching delayed acknowledgement; no local fallback',async()=>{
 const {f,pending,calls,clock}=external();f.start(candidate(f),'Traitement');
 assert.equal(calls.length,1);assert.equal(f.current.hasPending(),true);assert.equal(shipWrites(f).length,0);
 assert.equal(f.messages.some(x=>x.includes('confirmée')),false);
 f.current.commit(candidate(f),'Second');assert.equal(calls.length,1);
 f.update({progression:calls[0]});pending.resolve({persisted:true,failure:null,state:calls[0]});await drain(f);
 assert.equal(f.current.hasPending(),false);assert.equal(clock.pending,0);assert.match(f.messages.at(-1),/confirmée par le gestionnaire/);
});
for(const mode of ['reject','mismatch','foreign','failed','mutated'])test(`controlled ${mode} cannot claim success or submit twice`,async()=>{
 const {f,pending,calls}=external();f.start(candidate(f));let state=structuredClone(calls[0]);
 if(mode==='mismatch')state.training.targeting.attempts++;
 if(mode==='foreign')state.ownerSaveCreatedAt='2000-01-01T00:00:00.000Z';
 if(mode==='mutated'){calls[0].training.targeting.attempts++;state=calls[0];}
 if(mode==='reject')pending.reject(Error('unknown'));else pending.resolve({persisted:mode!=='failed',failure:mode==='failed'?'write-failed':null,state});
 await drain(f);assert.match(f.current.issue,/transmission externe non confirmée/);f.start(candidate(f));
 assert.equal(calls.length,1);assert.equal(shipWrites(f).length,0);assert.equal(f.current.hasPending(),true);
});
test('legacy void service observers remain delivery-only and do not publish fleet selection',async()=>{
 let selected=0;const {f,pending}=external({onControlledConfirmed:()=>selected++});f.start(candidate(f));pending.resolve();await drain(f);
 assert.match(f.messages.at(-1),/sauvegarde non vérifiée/);assert.equal(selected,0);assert.equal(f.current.hasPending(),false);
});
for(const response of ['confirm','reject'])test(`silent service warns, then handles late ${response} without replay`,async()=>{
 const {f,pending,calls,clock}=external();f.start(candidate(f),'Soins');clock.advance(15000);f.flush();
 assert.match(f.current.issue,/ne répond pas/);f.start(candidate(f));assert.equal(calls.length,1);
 if(response==='confirm'){f.update({progression:calls[0]});pending.resolve({persisted:true,failure:null,state:calls[0]});}else pending.reject(Error('late'));
 await drain(f);assert.equal(shipWrites(f).length,0);assert.equal(f.current.hasPending(),response==='reject');
});
for(const action of ['unmount','owner','mode'])test(`${action} retires a service observer and its timer`,async()=>{
 const {f,pending,calls,clock}=external();f.start(candidate(f));const count=f.messages.length;
 if(action==='unmount')f.unmount();else if(action==='mode')f.update({controlled:false});else f.update({save:f.a.defaultSave('2026-10-17T00:00:00.000Z')});
 assert.equal(clock.pending,0);clock.advance(15000);pending.resolve({persisted:true,failure:null,state:calls[0]});await drain(f);
 assert.equal(f.messages.length,count);assert.equal(shipWrites(f).length,0);if(action!=='unmount')assert.equal(f.current.issue,null);
});
test('ordinary parent renders never reset a pending deadline',()=>{
 const {f,clock}=external();f.start(candidate(f));clock.advance(14000);f.update({notify:m=>f.messages.push(m)});clock.advance(1000);f.flush();assert.match(f.current.issue,/ne répond pas/);
});
test('a synchronous host can acknowledge an exact service without starting a deadline',()=>{
 const clock=acknowledgementClock();const f=fixture({controlled:true,receive:state=>({persisted:true,failure:null,state})},clock);
 f.start(candidate(f));assert.equal(clock.pending,0);assert.match(f.messages.at(-1),/confirmée par le gestionnaire/);
});
test('reentrant host input cannot dispatch a second service',async()=>{
 const calls=[],pending=deferred();let f;f=fixture({controlled:true,receive:s=>{calls.push(s);f.current.commit(candidate(f));return pending.promise;}});
 f.start(candidate(f));assert.equal(calls.length,1);pending.reject(Error('refused'));await drain(f);assert.equal(f.current.hasPending(),true);
});
test('a host that unmounts during dispatch leaves no timer and consumes late rejection',async()=>{
 const clock=acknowledgementClock(),pending=deferred();let f;f=fixture({controlled:true,receive:()=>{f.unmount();return pending.promise;}},clock);
 f.start(candidate(f));assert.equal(clock.pending,0);pending.reject(Error('late'));await drain(f);assert.equal(shipWrites(f).length,0);
});

test('observer rejections are consumed without invoking a storage fallback',async()=>{
 const f=fixture();let calls=0;
 assert.doesNotThrow(()=>f.a.observeShipNotificationV94(()=>{calls++;throw Error('sync observer');}));
 f.a.observeShipNotificationV94(()=>{calls++;return Promise.reject(Error('async observer'));});
 await drain(f);assert.equal(calls,2);assert.equal(shipWrites(f).length,0);
});

for (const controlled of [false, true]) test(`${controlled ? 'controlled' : 'native'} async publication observer cannot escape after confirmation`, async () => {
  const f = fixture({
    controlled,
    ...(controlled ? {
      receive: state => ({ persisted: true, failure: null, state }),
      onControlledConfirmed: () => Promise.reject(Error('async selection view failed')),
    } : {
      onNativeConfirmed: () => Promise.reject(Error('async native view failed')),
    }),
  });
  f.start(candidate(f), 'Soins');
  await drain(f);
  assert.equal(shipWrites(f).length, controlled ? 0 : 1);
  assert.equal(f.current.issue, null, 'a view failure cannot reclassify an acknowledged write');
  await new Promise(resolve => setImmediate(resolve));
});

test('async service notification errors are consumed without relabelling storage', async () => {
  const f = fixture({ notify: () => Promise.reject(Error('asynchronous toast')) });
  f.start(candidate(f)); await drain(f);
  assert.equal(shipWrites(f).length, 1); assert.equal(f.current.issue, null);
  await new Promise(resolve => setImmediate(resolve));
});
