import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import {build} from 'esbuild';
import {getHistoricalExcelContextV107} from '../scripts/historical-excel-context-v107.mjs';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

async function load(file){const out=await build({entryPoints:[file],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});return import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0].text).toString('base64'));}
const api=await load('app/game/systems/gameReserveV66.ts');
const clone=structuredClone, valid=state=>assert.deepEqual(api.normalizeGameReserveV66(state),state);
function ticks(state,count,input={}){for(let i=0;i<count;i++)state=api.stepGameReserveV66(state,input);return state;}
function quiet(){const state=api.createGameReserveV107(107);for(const human of state.humans){human.status='down';human.hp=0;human.downAt=0;}valid(state);return api.stepGameReserveV66(state);}
function walk(state,x){const move=x>state.player.x?1:-1;for(let i=0;i<7000&&(x-state.player.x)*move>0;i++){state=api.stepGameReserveV66(state,{move});assert.equal(state.status,'active');if(i%150===0)valid(state);}assert(Math.abs(state.player.x-x)<4,`${state.player.x} reaches ${x}`);valid(state);return state;}
function jumpTo(state,x,y){state=api.stepGameReserveV66(state,{move:1,jump:true});assert(state.player.vy<0);for(let i=0;i<90;i++){state=api.stepGameReserveV66(state,{move:1});if(state.player.x>=x&&state.player.y===y&&state.player.vy===0){valid(state);return state;}}assert.fail(`no physical landing at ${x}/${y}; got ${state.player.x}/${state.player.y}`);}
function jumpHere(state,y){state=api.stepGameReserveV66(state,{jump:true});assert(state.player.vy<0);state=ticks(state,60);assert.equal(state.player.y,y);valid(state);return state;}
function record(state,index){assert.equal(api.gameReserveV66Interaction(state).target,index);const before=clone(state);state=ticks(state,119,{interact:true});assert.equal(state.routeV107.siteRecords[index].recordedAt,null);assert.equal(api.stepGameReserveV66(state,{interact:true},true),state);state=api.stepGameReserveV66(state,{interact:true});assert.equal(state.routeV107.siteRecords[index].recordedAt,state.tick);assert.equal(state.routeV107.siteRecords[index].hunterX,state.player.x);assert.equal(state.routeV107.siteRecords[index].hunterY,state.player.y);assert(api.canAdvanceGameReserveV66(before,state));valid(state);return state;}
function reachFirst(){let state=walk(quiet(),4620);state=jumpHere(state,360);state=jumpTo(walk(state,4830),4920,300);state=jumpTo(walk(state,5190),5280,345);state=jumpTo(walk(state,5550),5640,280);return walk(state,5840);}

test('V107 is explicitly selected with eight contiguous sectors, sixteen adults and four physical escape groups',()=>{
 const state=api.createGameReserveV107(107);valid(state);assert.equal(state.version,3);assert.equal(state.reserveId,'vharuun-transect-expedition');assert.equal(api.gameReserveV66World(state).width,12800);
 const sectors=api.gameReserveV66Sectors(state);assert.equal(sectors.length,8);assert.equal(new Set(sectors.map(s=>s.id)).size,8);sectors.forEach((sector,index)=>{assert.equal(sector.left,index*1600);assert.equal(sector.right,(index+1)*1600);});
 assert.equal(state.humans.length,16);assert.equal(new Set(state.humans.map(h=>h.id)).size,16);assert.equal(state.ships.length,4);assert.equal(state.supplies.length,16);assert.equal(api.gameReserveV66MaterialTotal(state),32);assert.deepEqual(state.humans.map(h=>h.team),[0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3]);
 const people=api.gameReserveV66People(state),profiles=people.slice(8).map(person=>JSON.stringify(person.tactics));assert.equal(new Set(profiles).size,8);assert.equal(new Set(people.map(person=>person.art)).size,3);assert(state.humans.every(h=>!h.id.startsWith('H')));
 assert.equal(state.routeV107.siteRecords.length,4);assert.deepEqual(api.createGameReserveV107(107),state);assert.notDeepEqual(api.createGameReserveV107(108).humans,state.humans);
});

test('V1 and V2 factories and deterministic played traces remain byte-identical to the frozen V106 source',async()=>{
 const context=await getHistoricalExcelContextV107(),historical=await load(path.join(context.root,'app/game/systems/gameReserveV66.ts'));
 for(const factory of ['createGameReserveV66','createGameReserveV104'])for(const seed of [0,37,4294967295]){
  let old=historical[factory](seed),current=api[factory](seed);assert.equal(JSON.stringify(current),JSON.stringify(old));
  for(let i=0;i<900;i++){const input={move:i%300<200?1:-1,jump:i%67===0,attack:i%91===0,cloak:i%173===0,scan:i%83<13,interact:i%101>90};old=historical.stepGameReserveV66(old,i===0?{}:input);current=api.stepGameReserveV66(current,i===0?{}:input);if(i%90===0)assert.equal(JSON.stringify(current),JSON.stringify(old),factory+' seed'+seed+' tick'+i);}
  assert.equal(JSON.stringify(current),JSON.stringify(old));
 }
});

test('all four posts and eight sectors are reached with native walking and jumps, then physically returned',()=>{
 // Declared geometry fixture: all sixteen adults are already down. This tests
 // real terrain, channels and continuity, not a claimed played combat victory.
 let state=record(reachFirst(),0);state=record(walk(state,7410),1);
 state=jumpHere(walk(state,8170),365);state=jumpTo(walk(state,8370),8490,294);state=jumpTo(walk(state,8735),8830,226);state=record(walk(state,8990),2);
 state=jumpHere(walk(state,9790),350);state=jumpTo(walk(state,9970),10070,270);state=jumpTo(walk(state,10335),10430,325);state=jumpTo(walk(state,10735),10830,365);
 state=jumpHere(walk(state,12030),365);state=jumpTo(walk(state,12235),12330,290);state=record(walk(state,12420),3);
 assert.deepEqual(state.visited,[0,1,2,3,4,5,6,7]);const recorded=clone(state.routeV107);const outbound=clone(state);state=ticks(walk(state,115),60,{interact:true});assert.equal(state.status,'returned');assert.deepEqual(state.routeV107,recorded);assert(api.canAdvanceGameReserveV66(outbound,state));assert.equal(api.stepGameReserveV66(state,{move:1}),state);valid(state);
});

test('root platforms provide a distinct physical upper route and do not replace the walkable ground',()=>{
 let state=jumpHere(walk(quiet(),6550),370);state=jumpTo(walk(state,6705),6790,302);state=jumpTo(walk(state,7030),7150,350);state=jumpTo(walk(state,7445),7540,365);assert(state.player.x>=7540);assert.equal(api.gameReserveV66Sector(state.player.x,state).id,'root-basin');valid(state);
});

test('V3 channels require their real post, exact duration, exposure and an independent record for each site',()=>{
 const ready=walk(quiet(),7410);let interrupted=ticks(ready,70,{interact:true});interrupted=api.stepGameReserveV66(interrupted,{move:1,interact:true});assert.equal(interrupted.channel.kind,'none');assert.equal(interrupted.routeV107.siteRecords[1].recordedAt,null);
 const shot=ticks(ready,119,{interact:true});shot.projectiles.push({x:shot.player.x,y:385,vx:0,vy:0,owner:'human',life:3});const damaged=api.stepGameReserveV66(shot,{interact:true});assert.equal(damaged.player.hp,92);assert.equal(damaged.channel.kind,'none');assert.equal(damaged.routeV107.siteRecords[1].recordedAt,null);
 const recorded=record(ready,1);assert(recorded.routeV107.siteRecords.every((site,index)=>index===1?site.recordedAt!==null:site.recordedAt===null));const away=clone(ready);away.player.y=370;assert.notEqual(api.gameReserveV66Interaction(away).kind,'survey');valid(recorded);
});

test('V3 normalization rejects malformed routes, mixed versions, forged positions and array bounds',()=>{
 const original=api.createGameReserveV107(107);const bad=[];const alter=run=>{const state=clone(original);run(state);bad.push(state);};
 alter(s=>s.inventory={claimedReward:true});alter(s=>s.humans[8].role='technician');alter(s=>s.ships[3].freeParts=100);alter(s=>s.routeV107.siteRecords.pop());alter(s=>s.routeV107.extra=true);alter(s=>s.routeV107.siteRecords[0].extra=true);alter(s=>s.routeV107.siteRecords[0].hunterX=5840);alter(s=>s.routeV107.siteRecords[0]={recordedAt:120,hunterX:5840,hunterY:280});alter(s=>s.routeV107.siteRecords[0]={recordedAt:0,hunterX:0,hunterY:438});alter(s=>s.lookout={recordedAt:null,hunterX:null,hunterY:null});alter(s=>s.humans[15].team=4);alter(s=>s.humans[15].targetSupply=16);alter(s=>s.humans[15].id=s.humans[14].id);alter(s=>s.ships.pop());alter(s=>s.supplies.pop());alter(s=>s.visited.push(8));alter(s=>s.reserveId='vharuun-lookout-expedition');alter(s=>s.version=4);
 bad.forEach(state=>assert.equal(api.normalizeGameReserveV66(state),null));
 for(const factory of ['createGameReserveV66','createGameReserveV104']){const old=api[factory](107);old.routeV107=clone(original.routeV107);assert.equal(api.normalizeGameReserveV66(old),null);assert.equal(api.canAdvanceGameReserveV66(original,api[factory](107)),false);}
});

test('recorded posts, wounds, visits and material cannot regress or be backdated in a V3 checkpoint',()=>{
 const ready=walk(quiet(),7410),done=record(ready,1);for(const mutate of [s=>s.routeV107.siteRecords[1]={recordedAt:null,hunterX:null,hunterY:null},s=>s.routeV107.siteRecords[1].hunterX+=1,s=>s.visited.pop(),s=>s.supplies[15]--]){const bad=clone(done);bad.tick++;mutate(bad);assert.equal(api.canAdvanceGameReserveV66(done,bad),false);}
 const backdated=clone(ready);backdated.tick++;backdated.routeV107.siteRecords[1]={recordedAt:ready.tick,hunterX:ready.player.x,hunterY:438};assert.equal(api.canAdvanceGameReserveV66(ready,backdated),false);const wounded=clone(done);wounded.player.hp=70;const healed=clone(wounded);healed.tick++;healed.player.hp=80;assert.equal(api.canAdvanceGameReserveV66(wounded,healed),false);
});

test('the four groups actually transport conserved components, repair and board their own physical aircraft',()=>{
 let state=api.stepGameReserveV66(api.createGameReserveV107(107));let previous=clone(state);const carried=new Set(),boarded=new Set();
 for(let i=0;i<18000;i++){state=api.stepGameReserveV66(state);state.humans.forEach(h=>{if(h.carrying)carried.add(h.team);if(h.status==='boarded'||h.status==='escaped')boarded.add(h.team);});if(i%150===0){valid(state);assert(api.canAdvanceGameReserveV66(previous,state));assert.equal(api.gameReserveV66MaterialTotal(state),32);previous=clone(state);}}
 assert.equal(carried.size,4);assert.equal(boarded.size,4);assert(state.ships.every(ship=>ship.departedAt!==null));assert(state.humans.some(h=>h.team===2&&h.status==='escaped'));assert(state.humans.some(h=>h.team===3&&h.status==='escaped'));
 for(const human of state.humans.filter(h=>h.status==='escaped'))assert(Math.abs(human.x-api.gameReserveV66Ships(state)[human.team].x)<26);valid(state);
});

test('new sight and witness profiles affect actual simulation while the field notebook conceals unseen people',()=>{
 const fixture=index=>{const state=quiet();const human=state.humans[index];human.status='active';human.hp=70;human.downAt=null;human.x=10000;human.facing=1;human.alertUntil=0;human.lastSeenX=null;state.player.x=10420;state.visited=[0,1,2,3,4,5,6];return state;};
 const long=api.stepGameReserveV66(fixture(10)),short=api.stepGameReserveV66(fixture(9));assert.equal(long.humans[10].lastSeenX,long.player.x);assert.equal(short.humans[9].lastSeenX,null);
 const qa=homeworldSceneSsrV78(),tactical=qa.load('app/game/systems/gameReserveTacticalV98.ts').gameReserveTacticalV98;const initial=api.createGameReserveV107(107),unknown=tactical(initial);assert.equal(unknown.contacts.length,0);assert.equal(unknown.ships.length,4);assert(unknown.ships.every(ship=>ship.phase==='unknown'&&ship.parts===null&&ship.aboard===null));assert.equal(unknown.caches.length,16);assert(unknown.caches.every(cache=>cache.remaining===null));
 const html=qa.render('app/game/GameReserveTacticalV98.tsx',{state:initial});assert(html.includes('0/16 rôles identifiés'));assert(html.includes('Relevés de la traversée'));assert(!html.includes('Ilye'));assert(!html.includes('Sava'));assert.equal((html.match(/data-reserve-route-site=/g)||[]).length,4);
});
