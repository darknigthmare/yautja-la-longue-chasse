import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle = await build({stdin:{contents:`export * from './app/game/systems/clanWarSessionV85'; export * from './app/game/systems/clanWarV85'; export * from './app/game/systems/clanWarCanyonV85';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const a = await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
// Deterministic lock scheduler for unit tests only. Browser tests use native Web Locks.
const lock = async operation => ({acquired:true,value:operation()});
function disk(entries=[]) {const data=new Map(entries),writes=[];return {data,writes,getItem:k=>data.get(k)??null,setItem(k,v){writes.push([k,v]);data.set(k,v);}};}
function mount(d,gate=lock) {const s=a.createWarSessionV85(()=>d,gate);s.subscribe(()=>{});return s;}
const settled = async s => {await s.whenSettled?.();};
const domains = [
 ['simulation',a.WAR_STORAGE_KEY_V85,'writableWar','persistedWar',a.createWarSimulationV85,v=>({...v,turn:v.turn+1}),'setSimulation'],
 ['canyon',a.CANYON_STORAGE_KEY_V85,'writableCanyon','persistedCanyon',a.createCanyonV85,v=>({...v,seconds:v.seconds+1}),'setCanyon'],
 ['selection',a.COMPOSITION_STORAGE_KEY_V85,'writableComposition','persistedComposition',()=>({'RTS-U01':1}),v=>({...v,'RTS-U01':2}),'setSelection'],
];
for(const [domain,key,writable,persisted,create,change,set] of domains){
 const encode=v=>JSON.stringify(domain==='selection'?{version:1,context:'free',selection:v}:v);
 test(`${domain}: silently dropped writes remain unconfirmed, memory survives`,async()=>{
  const before=encode(create()),d=disk([[key,before]]),s=mount(d);d.setItem=()=>{};
  s[set](change(s.getSnapshot()[domain]));await settled(s);
  assert.equal(s.getSnapshot()[writable],false);assert.equal(s.getSnapshot()[persisted],false);assert.equal(d.getItem(key),before);assert.match(s.getSnapshot().storageMessage,/confirm|mémoire/);
 });
 test(`${domain}: stale sessions cannot overwrite a changed archive`,async()=>{
  const d=disk([[key,encode(create())]]),s=mount(d),foreign=encode({...create(),...(domain==='selection'?{'RTS-U01':9}:{version:999})});
  d.data.set(key,foreign);s[set](change(s.getSnapshot()[domain]));await settled(s);
  assert.equal(d.getItem(key),foreign);assert.equal(d.writes.length,0);assert.equal(s.getSnapshot()[writable],false);
 });
 test(`${domain}: failed readback is not a confirmed save`,async()=>{
  const d=disk([[key,encode(create())]]),s=mount(d),read=d.getItem;let denied=false;
  d.setItem=(k,v)=>{d.data.set(k,v);denied=true;};d.getItem=k=>{if(denied&&k===key)throw Error('readback denied');return read(k);};
  s[set](change(s.getSnapshot()[domain]));await settled(s);assert.equal(s.getSnapshot()[persisted],false);assert.equal(s.getSnapshot()[writable],false);
 });
}
test('a denied key does not discard the other readable exercises during hydration',()=>{
 const state={...a.createWarSimulationV85(),turn:8},d=disk([[a.WAR_STORAGE_KEY_V85,JSON.stringify(state)]]),read=d.getItem;
 d.getItem=k=>{if(k===a.CANYON_STORAGE_KEY_V85)throw Error('denied');return read(k);};const s=mount(d);
 assert.equal(s.getSnapshot().simulation.turn,8);assert.equal(s.getSnapshot().writableWar,true);assert.equal(s.getSnapshot().writableCanyon,false);
});

test('a write persisted before setItem throws is confirmed only by readback',async()=>{
 const d=disk(),s=mount(d);d.setItem=(k,v)=>{d.data.set(k,v);throw Error('after write');};
 s.setSimulation(v=>({...v,turn:2}));await settled(s);
 assert.equal(s.getSnapshot().persistedWar,true);assert.equal(s.getSnapshot().writableWar,true);assert.equal(s.getSnapshot().storageMessage,'');
});
test('explicit retry persists the newest memory state after quota recovery without resetting the exercise',async()=>{
 const before=JSON.stringify(a.createWarSimulationV85()),d=disk([[a.WAR_STORAGE_KEY_V85,before]]),s=mount(d),write=d.setItem;
 d.setItem=()=>{throw Error('quota');};s.setSimulation(v=>({...v,turn:2}));await settled(s);
 s.setSimulation(v=>({...v,turn:3}));assert.equal(s.getSnapshot().canRetryPersistence,true);
 d.setItem=write;s.retryPersistence();await settled(s);
 assert.equal(JSON.parse(d.getItem(a.WAR_STORAGE_KEY_V85)).turn,3);assert.equal(s.getSnapshot().persistedWar,true);assert.equal(s.getSnapshot().canRetryPersistence,false);
});
test('readback recovery acknowledges its exact attempted bytes without replaying the write',async()=>{
 const d=disk(),s=mount(d),read=d.getItem,write=d.setItem;let denied=false;
 d.setItem=(k,v)=>{write.call(d,k,v);denied=true;};d.getItem=k=>{if(denied)throw Error('readback');return read(k);};
 s.setSimulation(v=>({...v,turn:2}));await settled(s);assert.equal(s.getSnapshot().persistedWar,false);
 denied=false;d.setItem=write;s.retryPersistence();await settled(s);
 assert.equal(s.getSnapshot().persistedWar,true);assert.equal(d.writes.length,1);
});
test('retry refuses a concurrent writer even after our own unconfirmed write',async()=>{
 const d=disk(),s=mount(d),read=d.getItem;let denied=false;
 d.setItem=(k,v)=>{d.data.set(k,v);denied=true;};d.getItem=k=>{if(denied)throw Error('readback');return read(k);};
 s.setSimulation(v=>({...v,turn:2}));await settled(s);denied=false;
 const foreign=JSON.stringify({...a.createWarSimulationV85(),turn:44});d.data.set(a.WAR_STORAGE_KEY_V85,foreign);
 s.retryPersistence();await settled(s);assert.equal(d.getItem(a.WAR_STORAGE_KEY_V85),foreign);assert.match(s.getSnapshot().storageMessage,/autre session/);
});
test('updates made while a retry awaits its lock are included in the confirmed newest state',async()=>{
 let grant;const gate=operation=>new Promise(resolve=>{grant=()=>resolve({acquired:true,value:operation()});});
 const d=disk(),s=mount(d,gate);d.setItem=()=>{throw Error('quota');};
 s.setSimulation(v=>({...v,turn:2}));await Promise.resolve();grant();await settled(s);
 d.setItem=(k,v)=>d.data.set(k,v);s.retryPersistence();await Promise.resolve();
 s.setSimulation(v=>({...v,turn:3}));grant();await settled(s);
 assert.equal(JSON.parse(d.getItem(a.WAR_STORAGE_KEY_V85)).turn,3);assert.equal(s.getSnapshot().persistedWar,true);
});
test('cooperative sessions serialize their compare/write/readback and reject the stale contender',async()=>{
 let tail=Promise.resolve();const serial=operation=>{const next=tail.then(()=>({acquired:true,value:operation()}));tail=next.then(()=>{});return next;};
 const d=disk(),one=mount(d,serial),two=mount(d,serial);
 one.setSimulation(v=>({...v,turn:2}));two.setSimulation(v=>({...v,turn:3}));await Promise.all([settled(one),settled(two)]);
 assert.equal(JSON.parse(d.getItem(a.WAR_STORAGE_KEY_V85)).turn,2);assert.equal(two.getSnapshot().writableWar,false);assert.equal(d.writes.length,1);
});
test('explicit reset cannot clobber an archive changed after the panel opened',async()=>{
 const d=disk([[a.WAR_STORAGE_KEY_V85,'{broken']]),s=mount(d),foreign=JSON.stringify({...a.createWarSimulationV85(),turn:30});
 d.data.set(a.WAR_STORAGE_KEY_V85,foreign);s.setSimulation(a.createWarSimulationV85());s.unlockWarAfterExplicitReset();await settled(s);
 assert.equal(d.getItem(a.WAR_STORAGE_KEY_V85),foreign);assert.equal(d.writes.length,0);
});
test('a protected future document cannot be downgraded by ordinary retry',async()=>{
 const raw=JSON.stringify({...a.createWarSimulationV85(),version:99}),d=disk([[a.WAR_STORAGE_KEY_V85,raw]]),s=mount(d);
 s.setSimulation(a.createWarSimulationV85());s.retryPersistence();await settled(s);
 assert.equal(d.getItem(a.WAR_STORAGE_KEY_V85),raw);assert.equal(s.getSnapshot().canRetryPersistence,false);
});
test('a missing or refused native lock never falls back to unlocked writes',async()=>{
 const d=disk(),s=mount(d,async()=>({acquired:false,reason:'denied'}));s.setSimulation(v=>({...v,turn:2}));await settled(s);
 assert.equal(d.writes.length,0);assert.equal(s.getSnapshot().pendingWrites,0);assert.equal(s.getSnapshot().canRetryPersistence,true);
});
test('equivalent updates coalesce without repeated disk writes',async()=>{
 const d=disk(),s=mount(d);s.setSimulation(v=>({...v,turn:2}));s.setSimulation(v=>({...v,turn:2}));await settled(s);
 assert.equal(d.writes.length,1);assert.equal(s.getSnapshot().persistedWar,true);assert.equal(s.getSnapshot().pendingWrites,0);
});
test('invalid outgoing state never replaces the last readable memory or disk snapshot',async()=>{
 const d=disk(),s=mount(d),before=s.getSnapshot().simulation;
 s.setSimulation({...before,turn:NaN});await settled(s);assert.equal(s.getSnapshot().simulation,before);assert.equal(d.writes.length,0);assert.match(s.getSnapshot().storageMessage,/invalide/);
});
test('a single failed domain does not stop other queued exercise writes',async()=>{
 const d=disk(),s=mount(d),write=d.setItem;d.setItem=(k,v)=>{if(k===a.WAR_STORAGE_KEY_V85)throw Error('quota');write.call(d,k,v);};
 s.setSimulation(v=>({...v,turn:2}));s.setSelection({'RTS-U01':3});await settled(s);
 assert.equal(s.getSnapshot().writableWar,false);assert.equal(s.getSnapshot().persistedComposition,true);assert.equal(JSON.parse(d.getItem(a.COMPOSITION_STORAGE_KEY_V85)).selection['RTS-U01'],3);
});
