import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {prepareLegacySupplyFixtureV109} from './helpers/clan-supply-route-v109-fixture.mjs';
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'supply-v109-'));after(()=>fs.rm(temporary,{recursive:true,force:true}));
const result=await build({stdin:{contents:"export * from './app/game/systems/clanSupplyRouteV109';export * from './app/game/systems/clanSupplySessionV109';export * from './app/game/systems/clanLogisticsV108';export * from './app/game/systems/clanLogisticsSessionV108';export {DEFAULT_WAR_RULES_V6} from './app/game/systems/clanWarBibleV6';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'silent'});
const modulePath=path.join(temporary,'core.mjs');await fs.writeFile(modulePath,result.outputFiles[0].text);const api=await import(pathToFileURL(modulePath));
const prepared=prepareLegacySupplyFixtureV109(api),overlap=prepareLegacySupplyFixtureV109(api,{overlappedMounts:true});
function driver(origin=prepared.archive){
 let state=api.createSupplyV109(origin);assert.ok(state);
 const d={get state(){return state;},get base(){return state.convoy;},
  send(action){const result=api.applySupplyV109(state,api.supplyCommandV109(state,action));assert.equal(result.accepted,true,JSON.stringify(action)+' '+result.message);state=result.state;assert.equal(api.supplyConservationV109(state),true);return state;},
  deny(action){const before=state,result=api.applySupplyV109(state,api.supplyCommandV109(state,action));assert.equal(result.accepted,false,JSON.stringify(action)+' unexpectedly accepted');assert.equal(result.state,before);},
  walk(id,x,y){let actor=api.logisticsActorV108(state.convoy,id);for(let guard=0;Math.hypot(actor.x-x,actor.y-y)>.05;guard++){assert.ok(guard<200);const dx=x-actor.x,dy=y-actor.y,n=Math.hypot(dx,dy),step=Math.min(n,24);d.send({kind:'move',actor:id,dx:dx/n*step,dy:dy/n*step});actor=api.logisticsActorV108(state.convoy,id);}},
  east(id,x,y){const a=api.logisticsActorV108(state.convoy,id);if(a.x<430){d.walk(id,390,450);d.walk(id,570,450);d.walk(id,570,390);d.walk(id,660,390);}else if(a.x<640){d.walk(id,570,390);d.walk(id,660,390);}else{d.walk(id,a.x,390);d.walk(id,660,390);}d.walk(id,660,y);d.walk(id,x,y);},
  home(id){const a=api.logisticsActorV108(state.convoy,id);if(a.x>540){if(a.x<640){d.walk(id,570,a.y);d.walk(id,570,390);}else{d.walk(id,a.x,390);d.walk(id,660,390);d.walk(id,570,390);}d.walk(id,570,450);d.walk(id,390,450);}d.walk(id,100,500);},
  wait(n){for(let i=0;i<n;i++)d.send({kind:'wait'});},
 };
 return d;
}
const stops=['W3-S09','W3-S10','W3-S13','W3-S14','W3-S15','W3-S18'].map(workId=>({workId,amount:2}));

test('all six planned deliveries use one finite source, the original U19, real skiff and physical depot return',()=>{
 const d=driver(),members=d.base.actors[0].members,boat=d.base.boat.id;
 d.send({kind:'supply-plan',source:'boat',allowance:4,stops});assert.equal(api.supplyReservationV109(d.state.route),16);assert.equal(d.base.boat.cargo,prepared.state.boat.cargo);
 d.deny({kind:'supply-load'});d.walk('carrier',390,300);const before=d.base.boat.cargo;d.send({kind:'supply-load'});assert.equal(d.base.boat.cargo,before-16);assert.equal(d.base.actors[0].rav,16);
 d.send({kind:'supply-deliver'});d.send({kind:'boat-board'});assert.equal(d.state.route.holder,'boat');
 while(d.base.turn%4>1)d.send({kind:'wait'});d.send({kind:'boat-depart'});for(let n=0;n<12;n++)d.send({kind:'boat-step'});d.send({kind:'boat-land'});
 d.deny({kind:'supply-deliver'});d.send({kind:'supply-load'});assert.equal(d.state.route.holder,'carrier');
 for(const stop of stops.slice(1)){const p=api.CLAN_LOGISTICS_SITES_V108[stop.workId];d.east('carrier',p.x,p.y);const bin=d.base.works.find(w=>w.id===stop.workId).bin;d.send({kind:'supply-deliver'});assert.equal(d.base.works.find(w=>w.id===stop.workId).bin,bin+2);}
 assert.equal(d.state.route.phase,'returning');assert.equal(d.state.route.deliveries.length,6);assert.equal(d.state.route.heldAmount,0);d.deny({kind:'supply-close'});d.home('carrier');d.send({kind:'supply-close'});
 assert.equal(d.state.route.phase,'completed');assert.equal(d.state.completedRoutes[0].deliveredRav,12);assert.equal(d.base.boat.id,boat);assert.deepEqual(d.base.actors[0].members,members);assert.equal(d.base.actors[0].rav,0);assert.equal(api.logisticsConservationV108(d.base),true);
});

test('reservation, pause, replay and native transport never clone the held RAV',()=>{
 const d=driver(),source=d.base.boat.cargo;
 d.send({kind:'supply-plan',source:'boat',allowance:4,stops:stops.slice(0,2)});d.send({kind:'supply-pause'});const paused=d.state;d.deny({kind:'supply-load'});d.deny({kind:'supply-plan',source:'boat',allowance:0,stops:stops.slice(0,2)});
 assert.deepEqual(api.importSupplyV109(api.exportSupplyV109(paused)).state,paused);assert.equal(d.base.boat.cargo,source);d.send({kind:'supply-resume'});d.walk('carrier',390,300);d.send({kind:'supply-load'});
 const command=api.supplyCommandV109(d.state,{kind:'supply-deliver'});const result=api.applySupplyV109(d.state,command);assert.equal(result.accepted,true);assert.equal(api.applySupplyV109(result.state,command).state,result.state);assert.equal(api.applySupplyV109(result.state,{...command,kind:'supply-pause'}).accepted,false);
});

test('the same reserved lot follows the actual shuttle through an orbital reload and return with finite provisions',()=>{
 const d=driver();d.send({kind:'contract',actor:'operator:W3-S18'});d.send({kind:'rav-load',actor:'operator:W3-S18',location:'depot',amount:6});d.wait(1);d.east('operator:W3-S18',900,480);d.send({kind:'staff',work:'W3-S18'});
 d.walk('carrier',390,300);d.send({kind:'rav-load',actor:'carrier',location:'boat',amount:20});d.east('carrier',900,480);d.send({kind:'rav-deposit',actor:'carrier',location:'W3-S18',amount:20});d.wait(1);while(d.base.works.find(w=>w.id==='W3-S18').bin<32){d.home('carrier');d.walk('carrier',390,300);const amount=Math.min(20,40-d.base.works.find(w=>w.id==='W3-S18').bin);d.send({kind:'rav-load',actor:'carrier',location:'boat',amount});d.east('carrier',900,480);d.send({kind:'rav-deposit',actor:'carrier',location:'W3-S18',amount});}d.send({kind:'recon'});d.send({kind:'authorize'});d.home('carrier');
 d.send({kind:'supply-plan',source:'boat',allowance:4,stops:[stops[0],stops[5]]});d.walk('carrier',390,300);d.send({kind:'supply-load'});d.send({kind:'supply-deliver'});d.send({kind:'supply-provision',location:'boat',amount:6});d.east('carrier',900,480);d.send({kind:'shuttle-board'});d.send({kind:'shuttle-depart'});for(let i=0;i<7;i++)d.send({kind:'shuttle-step'});
 assert.equal(d.state.route.holder,'shuttle');assert.equal(d.state.route.heldAmount,2);assert.deepEqual(api.importSupplyV109(api.exportSupplyV109(d.state)).state,d.state);
 for(let i=7;i<16;i++)d.send({kind:'shuttle-step'});d.send({kind:'shuttle-land'});assert.equal(d.state.route.holder,'carrier');assert.equal(d.base.actors[0].layer,'orbit');d.send({kind:'shuttle-board'});d.send({kind:'shuttle-depart'});for(let i=0;i<16;i++)d.send({kind:'shuttle-step'});d.send({kind:'shuttle-land'});d.send({kind:'supply-deliver'});d.home('carrier');d.send({kind:'supply-close'});
 assert.equal(d.base.shuttle.fuel,2);assert.equal(d.base.receipts.filter(id=>id.startsWith('shuttle:')).length,2);assert.equal(d.state.completedRoutes[0].deliveredRav,4);assert.equal(d.state.route.phase,'completed');
});

test('route quantities, built destinations, capacity and actual next arrival remain mandatory',()=>{
 const d=driver();for(const list of [stops.slice(0,1),[stops[0],stops[0]],[{workId:'W3-S09',amount:20},{workId:'W3-S10',amount:1}],stops.map(s=>({...s,amount:0}))])d.deny({kind:'supply-plan',source:'boat',allowance:0,stops:list});
 d.send({kind:'supply-plan',source:'boat',allowance:4,stops:stops.slice(1,3)});d.walk('carrier',390,300);d.send({kind:'supply-load'});d.deny({kind:'supply-deliver'});d.deny({kind:'rav-deposit',actor:'carrier',location:'W3-S09',amount:2});d.deny({kind:'release',actor:'carrier'});
});

test('a changed source ruleset cannot accept even a planning intention',()=>{
 const d=driver(),rules=structuredClone(api.DEFAULT_WAR_RULES_V6);rules.parameters.pc_cap_1++;
 const result=api.applySupplyV109(d.state,api.supplyCommandV109(d.state,{kind:'supply-plan',source:'boat',allowance:4,stops:stops.slice(0,2)}),rules);
 assert.equal(result.accepted,false);assert.equal(result.state,d.state);
});

test('reserved payload cannot be eaten by upkeep; real extra provisions and an unfinished return are possible',()=>{
 const d=driver();d.send({kind:'supply-plan',source:'boat',allowance:0,stops:stops.slice(0,2)});d.walk('carrier',390,300);d.send({kind:'supply-load'});const before=d.state;d.deny({kind:'wait'});assert.equal(d.state,before);
 d.send({kind:'supply-provision',location:'boat',amount:2});d.send({kind:'wait'});assert.equal(d.base.actors[0].rav,4);d.send({kind:'supply-return'});d.home('carrier');const depot=d.base.depot;d.send({kind:'supply-close'});assert.equal(d.base.depot,depot+4);assert.equal(d.state.completedRoutes[0].result,'aborted');assert.equal(d.state.route.deliveries.length,0);
});

test('new mounted overlap is refused by the actual footprint, with real distinct parking places',()=>{
 const d=driver(null);d.send({kind:'hire',actor:'operator:W3-S10'});d.wait(3);d.east('operator:W3-S10',570,90);d.send({kind:'lead',mount:'mount-v108-1'});d.send({kind:'move',actor:'operator:W3-S10',dx:24,dy:0});d.deny({kind:'move',actor:'operator:W3-S10',dx:1,dy:0});
 // Both endpoints of this almost-tangent step are clear; its interior clips.
 d.deny({kind:'move',actor:'operator:W3-S10',dx:.02,dy:3});d.send({kind:'move',actor:'operator:W3-S10',dx:0,dy:3});assert.equal(d.base.mounts[0].x,594);assert.equal(d.base.mounts[0].y,93);assert.equal(d.base.mounts[1].x,650);assert.ok(Math.hypot(api.CLAN_MOUNT_PARKING_V109[0].x-api.CLAN_MOUNT_PARKING_V109[1].x,api.CLAN_MOUNT_PARKING_V109[0].y-api.CLAN_MOUNT_PARKING_V109[1].y)>api.CLAN_MOUNT_CLEARANCE_V109);
});

test('a preserved legacy overlap must be separated through monotone real movement, never relocation on load',()=>{
 const d=driver(overlap.archive);assert.deepEqual(d.base.mounts.map(m=>[m.x,m.y]),[[720,530],[720,530]]);assert.equal(d.state.originalV108Archive,overlap.archive);
 d.send({kind:'contract',actor:'operator:W3-S10'});d.wait(1);d.east('operator:W3-S10',720,530);d.send({kind:'lead',mount:'mount-v108-1'});d.send({kind:'move',actor:'operator:W3-S10',dx:18,dy:0});d.deny({kind:'move',actor:'operator:W3-S10',dx:-1,dy:0});d.deny({kind:'unlead',mount:'mount-v108-1'});d.send({kind:'move',actor:'operator:W3-S10',dx:24,dy:0});d.send({kind:'move',actor:'operator:W3-S10',dx:18,dy:0});d.send({kind:'unlead',mount:'mount-v108-1'});assert.equal(d.base.mounts[1].x,720);assert.equal(d.base.mounts[0].x,780);assert.equal(d.base.water.consumed,4);
});

test('future, inflated and contradictory route checkpoints reject without admitting fabricated people or stocks',()=>{
 const d=driver();d.send({kind:'supply-plan',source:'boat',allowance:4,stops:stops.slice(0,2)});const raw=api.exportSupplyV109(d.state);
 for(const mutate of [v=>v.version++,v=>v.convoy.depot++,v=>v.route.heldAmount++,v=>v.route.cursor++,v=>v.route.carrierMembers.push('new-person'),v=>v.extra=true,v=>v.history[0].stops[0].extra=true]){const value=JSON.parse(raw);mutate(value);assert.equal(api.importSupplyV109(JSON.stringify(value)).state,null);}
 assert.equal(api.exportSupplyV109({...d.state}),null);
});

test('one atomic migration retains the exact original text, confirms readback and fences an old V108 session',async()=>{
 const original='\n '+api.exportLogisticsV108(api.createLogisticsV108())+'\n',data=new Map([[api.CLAN_SUPPLY_KEY_V109,original]]),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},lock=async fn=>fn();
 const old=api.createLogisticsSessionV108(storage,lock);old.hydrate();const current=api.createSupplySessionV109(storage,lock);current.hydrate();assert.equal(current.getSnapshot().migrationPending,true);assert.equal(data.get(api.CLAN_SUPPLY_KEY_V109),original);await current.whenSettled();
 assert.equal(current.getSnapshot().migrationPending,false);assert.equal(JSON.parse(data.get(api.CLAN_SUPPLY_KEY_V109)).originalV108Archive,original);const bytes=data.get(api.CLAN_SUPPLY_KEY_V109);await old.act({kind:'hire',actor:'carrier'});assert.equal(old.getSnapshot().blocked,true);assert.equal(data.get(api.CLAN_SUPPLY_KEY_V109),bytes);assert.deepEqual([...data.keys()],[api.CLAN_SUPPLY_KEY_V109]);
});

test('quota and unconfirmed migration preserve all old bytes and prohibit buffered movement until real Retry',async()=>{
 const original=api.exportLogisticsV108(api.createLogisticsV108());let raw=original,fail=true;const storage={getItem:()=>raw,setItem:(_,value)=>{if(fail)throw Error('quota');raw=value;}},lock=async fn=>fn();const current=api.createSupplySessionV109(storage,lock);current.hydrate();await current.whenSettled();assert.equal(raw,original);assert.equal(current.getSnapshot().migrationPending,true);await current.act({kind:'hire',actor:'carrier'});assert.equal(raw,original);fail=false;await current.retryMigration();assert.equal(current.getSnapshot().migrationPending,false);assert.equal(JSON.parse(raw).originalV108Archive,original);
});

test('a foreign write arriving before the migration lock is held is never overwritten',async()=>{
 const original=api.exportLogisticsV108(api.createLogisticsV108());let raw=original,release;const gate=new Promise(resolve=>{release=resolve;}),storage={getItem:()=>raw,setItem:(_,value)=>{raw=value;}},lock=async fn=>{await gate;return fn();};const current=api.createSupplySessionV109(storage,lock);current.hydrate();raw='foreign-protected-bytes';release();await current.whenSettled();assert.equal(raw,'foreign-protected-bytes');assert.equal(current.getSnapshot().blocked,true);
});

test('two simultaneous migrations share one FIFO lock and only the first may replace the original bytes',async()=>{
 const original=api.exportLogisticsV108(api.createLogisticsV108());let raw=original,writes=0,serial=Promise.resolve();const storage={getItem:()=>raw,setItem:(_,value)=>{writes++;raw=value;}},lock=fn=>{const task=serial.then(fn);serial=task.catch(()=>{});return task;};
 const first=api.createSupplySessionV109(storage,lock),second=api.createSupplySessionV109(storage,lock);first.hydrate();second.hydrate();await Promise.all([first.whenSettled(),second.whenSettled()]);
 assert.equal(writes,1);assert.equal(first.getSnapshot().migrationPending,false);assert.equal(second.getSnapshot().blocked,true);assert.equal(JSON.parse(raw).originalV108Archive,original);const confirmed=raw;await second.act({kind:'hire',actor:'carrier'});assert.equal(raw,confirmed);
});

test('migration size limits preserve an otherwise valid legacy archive instead of dropping its original',async()=>{
 const base=api.exportLogisticsV108(api.createLogisticsV108()),original=' '.repeat(api.CLAN_SUPPLY_MAX_BYTES_V109-new TextEncoder().encode(base).length-4)+base;assert.ok(api.importLogisticsV108(original).state);let raw=original;const storage={getItem:()=>raw,setItem:(_,value)=>{raw=value;}},current=api.createSupplySessionV109(storage,async fn=>fn());current.hydrate();await current.whenSettled();assert.equal(raw,original);assert.equal(current.getSnapshot().migrationPending,true);assert.match(current.getSnapshot().message,/4 Mo/);
});
