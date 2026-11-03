import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
const bundled = await build({stdin:{contents:`export * from './app/game/systems/clanWarSessionV85';export * from './app/game/systems/clanWarV85';export * from './app/game/systems/clanWarCanyonV85';export * from './app/game/systems/clanWarFenceV94';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const a = await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const lock = async op => ({acquired:true,value:await op()});
function fixture(){
 const data=new Map(), records=new Map(), writes=[]; let seq=0;
 const storage={getItem:key=>data.get(key)??null,setItem(key,value){writes.push([key,value]);data.set(key,value);}};
 const fence={
  async read(key){return structuredClone(records.get(key)??null);},
  async reserve(key,expected,before,after){
   if(JSON.stringify(records.get(key)??null)!==JSON.stringify(expected))throw new a.WarFenceErrorV94('conflict');
   const record={version:1,token:String(++seq),before,after,phase:'intent'};records.set(key,record);return structuredClone(record);
  },
  async confirm(key,expected){
   if(JSON.stringify(records.get(key))!==JSON.stringify(expected))throw new a.WarFenceErrorV94('conflict');
   const record={...expected,phase:'confirmed'};records.set(key,record);return structuredClone(record);
  },
 };
 const mount=async(s=storage,f=fence)=>{const session=a.createWarSessionV85(()=>s,lock,f);session.subscribe(()=>{});await session.whenSettled();return session;};
 return {data,records,writes,storage,fence,mount};
}
const domains=[
 ['simulation',a.WAR_STORAGE_KEY_V85,'setSimulation','persistedWar',v=>({...v,turn:v.turn+1})],
 ['canyon',a.CANYON_STORAGE_KEY_V85,'setCanyon','persistedCanyon',v=>({...v,seconds:v.seconds+1})],
 ['selection',a.COMPOSITION_STORAGE_KEY_V85,'setSelection','persistedComposition',v=>({...v,'RTS-U01':(v['RTS-U01']??0)+1})],
];
for(const [kind,key,set,persisted,change]of domains){
 test(`${kind}: stale localStorage cache cannot bypass transactional compare-and-swap`,async()=>{
  const f=fixture();const stale={getItem:()=>null,setItem:f.storage.setItem};
  const one=await f.mount(),two=await f.mount(stale);
  one[set](change);await one.whenSettled();two[set](change);await two.whenSettled();
  assert.equal(one.getSnapshot()[persisted],true);assert.equal(two.getSnapshot()[persisted],false);assert.equal(f.writes.length,1);assert.match(two.getSnapshot().storageMessage,/autre session/);
 });
 test(`${kind}: interrupted mirror recovers the durable intent read-only, then explicitly repairs`,async()=>{
  const f=fixture(),s=await f.mount();f.storage.setItem=()=>{};s[set](change);await s.whenSettled();
  const intended=structuredClone(s.getSnapshot()[kind]);assert.equal(s.getSnapshot()[persisted],false);assert.equal(f.records.get(key).phase,'intent');assert.equal(f.data.get(key),undefined);
  f.storage.setItem=(k,v)=>{f.writes.push([k,v]);f.data.set(k,v);};const reopened=await f.mount();
  assert.deepEqual(reopened.getSnapshot()[kind],intended);assert.equal(f.writes.length,0);assert.equal(reopened.getSnapshot().canRetryPersistence,true);
  reopened.retryPersistence();await reopened.whenSettled();assert.equal(reopened.getSnapshot()[persisted],true);assert.equal(f.writes.length,1);assert.equal(f.records.get(key).phase,'confirmed');
 });
 test(`${kind}: unconfirmed final fence keeps the mirror but cannot announce persisted`,async()=>{
  const f=fixture(),s=await f.mount(),confirm=f.fence.confirm;f.fence.confirm=async()=>{throw Error('transaction aborted');};
  s[set](change);await s.whenSettled();assert.equal(s.getSnapshot()[persisted],false);assert.equal(f.writes.length,1);f.fence.confirm=confirm;
  const reopened=await f.mount();assert.equal(reopened.getSnapshot()[persisted],false);reopened.retryPersistence();await reopened.whenSettled();assert.equal(reopened.getSnapshot()[persisted],true);assert.equal(f.writes.length,1);
 });
 test(`${kind}: divergent raw bytes and a future document survive reopening and retry`,async()=>{
  const f=fixture(),s=await f.mount();s[set](change);await s.whenSettled();const foreign='{"version":999,"protected":true}';f.data.set(key,foreign);
  const reopened=await f.mount();reopened[set](change);reopened.retryPersistence();await reopened.whenSettled();assert.equal(f.data.get(key),foreign);assert.equal(f.writes.length,1);assert.equal(reopened.getSnapshot()[persisted],false);
 });
}
test('commands arriving during native hydration apply to recovered state rather than defaults',async()=>{
 const f=fixture();f.data.set(a.WAR_STORAGE_KEY_V85,JSON.stringify({...a.createWarSimulationV85(),turn:8}));
 let release;const read=f.fence.read;f.fence.read=async key=>{if(key===a.WAR_STORAGE_KEY_V85)await new Promise(r=>release=r);return read(key);};
 const s=a.createWarSessionV85(()=>f.storage,lock,f.fence);s.subscribe(()=>{});s.setSimulation(v=>({...v,turn:v.turn+1}));s.setSimulation(v=>({...v,turn:v.turn+1}));await Promise.resolve();assert.equal(s.getSnapshot().loaded,false);release();await s.whenSettled();assert.equal(s.getSnapshot().simulation.turn,10);assert.equal(JSON.parse(f.data.get(a.WAR_STORAGE_KEY_V85)).turn,10);
});
test('fence unavailable at hydration is memory-only, with no unsafe localStorage fallback',async()=>{
 const f=fixture();f.fence.read=async()=>{throw Error('denied');};const s=await f.mount();s.setSimulation(v=>({...v,turn:3}));s.retryPersistence();await s.whenSettled();assert.equal(s.getSnapshot().simulation.turn,3);assert.equal(s.getSnapshot().persistedWar,false);assert.equal(f.writes.length,0);
});
test('failed reservation does not write any mirror bytes',async()=>{
 const f=fixture(),s=await f.mount();f.fence.reserve=async()=>{throw Error('quota');};s.setSimulation(v=>({...v,turn:3}));await s.whenSettled();assert.equal(f.writes.length,0);assert.equal(s.getSnapshot().persistedWar,false);
});
test('foreign write during asynchronous reservation is rechecked before mirror mutation',async()=>{
 const f=fixture(),s=await f.mount(),reserve=f.fence.reserve;f.fence.reserve=async(...args)=>{const r=await reserve(...args);f.data.set(args[0],'foreign');return r;};s.setSimulation(v=>({...v,turn:3}));await s.whenSettled();assert.equal(f.data.get(a.WAR_STORAGE_KEY_V85),'foreign');assert.equal(f.writes.length,0);
});
test('later in-memory updates while a reservation awaits are eventually persisted without changing the reserved bytes',async()=>{
 const f=fixture(),s=await f.mount(),reserve=f.fence.reserve;let release;
 f.fence.reserve=async(...args)=>{const r=await reserve(...args);if(!release)await new Promise(resolve=>release=resolve);return r;};
 s.setSimulation(v=>({...v,turn:2}));while(!release)await Promise.resolve();s.setSimulation(v=>({...v,turn:3}));release();await s.whenSettled();assert.equal(JSON.parse(f.data.get(a.WAR_STORAGE_KEY_V85)).turn,3);assert.equal(s.getSnapshot().persistedWar,true);assert.equal(s.getSnapshot().pendingWrites,0);
});
test('new fence token prevents ABA even when the archive returns to identical bytes',async()=>{
 const f=fixture(),s=await f.mount();s.setSimulation(v=>({...v,turn:2}));await s.whenSettled();const old=await f.mount();
 const previous=f.records.get(a.WAR_STORAGE_KEY_V85);f.records.set(a.WAR_STORAGE_KEY_V85,{...previous,token:'another-writer'});
 old.setSimulation(v=>({...v,turn:3}));await old.whenSettled();assert.equal(JSON.parse(f.data.get(a.WAR_STORAGE_KEY_V85)).turn,2);assert.equal(old.getSnapshot().persistedWar,false);
});
test('native adapter refuses non-exercise keys without opening a database',async()=>{
 const port=a.createWarFencePortV94({open(){throw Error('must not open');}});await assert.rejects(port.read('yautja-long-hunt.save'),e=>e.reason==='incompatible');
});
test('native adapter denied, throwing and stalled opens settle without a mirror permit',async()=>{
 for(const provider of [{open(){throw Error('denied');}},{open(){return {};}}])await assert.rejects(a.createWarFencePortV94(provider,10).read(a.WAR_STORAGE_KEY_V85));
});
test('fence envelope rejects future versions, invalid phases and excessive payloads',()=>{
 const base={version:1,token:'one',before:null,after:'{}',phase:'intent'};assert.equal(a.validWarFenceV94(base),true);
 for(const change of [{version:2},{token:''},{before:4},{after:'x'.repeat(2_000_001)},{phase:'maybe'}])assert.equal(a.validWarFenceV94({...base,...change}),false);
});
