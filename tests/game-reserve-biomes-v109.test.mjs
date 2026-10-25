import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
const built=await build({stdin:{contents:"export * from './app/game/systems/gameReserveV66';export * from './app/game/systems/gameReserveExpeditionV109';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const clone=structuredClone,sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const valid=state=>assert.deepEqual(api.normalizeGameReserveV66(state),state);
const ticks=(state,count,input={})=>{for(let i=0;i<count;i++)state=api.stepGameReserveV66(state,input);return state;};
function quiet(id){const s=api.createGameReserveV109(109,id);for(const h of s.humans){h.status='down';h.hp=0;h.downAt=0;}valid(s);return api.stepGameReserveV66(s);}
function walk(s,x){const move=x>s.player.x?1:-1;for(let i=0;i<7000&&(x-s.player.x)*move>0;i++){s=api.stepGameReserveV66(s,{move});assert.equal(s.status,'active');if(i%180===0)valid(s);}assert(Math.abs(s.player.x-x)<4,`walk ${x}: ${s.player.x}`);valid(s);return s;}
function jumpHere(s,y){s=api.stepGameReserveV66(s,{jump:true});assert(s.player.vy<0);s=ticks(s,60);assert.equal(s.player.y,y);valid(s);return s;}
function jumpTo(s,x,y){s=api.stepGameReserveV66(s,{move:1,jump:true});for(let i=0;i<90;i++){s=api.stepGameReserveV66(s,{move:1});valid(s);if(s.player.x>=x&&s.player.y===y&&s.player.vy===0)return s;}assert.fail(`No physical landing at ${x}/${y}; got ${s.player.x}/${s.player.y}`);}
function record(s,index){assert.deepEqual(api.gameReserveV66Interaction(s),{kind:'survey',target:index,ticks:0});const before=clone(s);s=ticks(s,119,{interact:true});assert.equal(s.routeV109.siteRecords[index].recordedAt,null);assert.equal(api.stepGameReserveV66(s,{interact:true},true),s);s=api.stepGameReserveV66(s,{interact:true});assert.deepEqual(s.routeV109.siteRecords[index],{recordedAt:s.tick,hunterX:s.player.x,hunterY:s.player.y});assert(api.canAdvanceGameReserveV66(before,s));valid(s);return s;}
function firstSite(id){let s=quiet(id);if(id===api.GAME_RESERVE_V109_IDS[0]){s=jumpHere(walk(s,1750),378);s=jumpTo(walk(s,1965),2090,308);s=jumpTo(walk(s,2335),2460,248);return walk(s,2600);}s=jumpHere(walk(s,1750),350);s=jumpTo(walk(s,2015),2140,275);s=jumpTo(walk(s,2415),2540,205);return walk(s,2685);}

test('two actual biome reserves add16 distinct sectors and32 original adults, without counting old expedition variants twice',()=>{
 const all=[api.createGameReserveV107(109),api.createGameReserveV108(109),...api.GAME_RESERVE_V109_IDS.map(id=>api.createGameReserveV109(109,id))];
 assert.equal(new Set(all.flatMap(api.gameReserveV66Sectors).map(s=>s.id)).size,32);assert.equal(new Set(all.flatMap(s=>s.humans.map(h=>h.id))).size,64);
 for(const [index,id] of api.GAME_RESERVE_V109_IDS.entries()){const s=all[index+2];valid(s);assert.equal(s.version,5);assert.equal(s.reserveId,id);assert.equal(s.humans.length,16);assert.equal(s.ships.length,4);assert.equal(api.gameReserveV66MaterialTotal(s),32);assert.equal(new Set(api.gameReserveV66People(s).map(p=>JSON.stringify(p.tactics))).size,16);assert.equal(new Set(api.gameReserveV66People(s).map(p=>p.art)).size,3);assert.equal(new Set(api.gameReserveV66Sectors(s).map(sector=>JSON.stringify(api.gameReserveV66Platforms(s).filter(p=>p.x>=sector.left&&p.x<sector.right).map(p=>[p.x-sector.left,p.y,p.w])))).size,8);assert.deepEqual(api.createGameReserveV109(109,id),s);assert.notDeepEqual(api.createGameReserveV109(110,id).humans,s.humans);}
 assert.notDeepEqual(api.gameReserveV66Platforms(all[2]),api.gameReserveV66Platforms(all[3]));
 assert.equal(new Set(api.GAME_RESERVE_CATALOGUE_V109.flatMap(d=>Object.values(d.art))).size,8);
});

test('all V1–V4 original factory bytes and900-tick traces remain exactly those captured before V109 edits',async()=>{
 const bytes=await fs.readFile('tests/fixtures/game-reserve-v108-traces-v109.json');assert.equal(sha(bytes),'9bb2565b33f05fd163ba4d4ac60e1de3e2d7edd1312a09a7f3200c8ef9ae8919');
 for(const row of JSON.parse(bytes).rows){let s=api[row.factory](row.seed);const hashes=[sha(JSON.stringify(s))];for(let i=0;i<900;i++){s=api.stepGameReserveV66(s,i===0?{}:{move:i%300<200?1:-1,jump:i%67===0,attack:i%91===0,cloak:i%173===0,scan:i%83<13,interact:i%101>90});if(i%90===0||i===899)hashes.push(sha(JSON.stringify(s)));}assert.deepEqual(hashes,row.hashes,row.factory+' '+row.seed);valid(s);}
});

for(const id of api.GAME_RESERVE_V109_IDS)test(id+': four posts and eight sectors require physical jumps, channels and a walked return',()=>{
 // Explicit geometry fixture: sixteen adults already down. This is not a full combat victory.
 let s=record(firstSite(id),0);
 if(id===api.GAME_RESERVE_V109_IDS[0]){s=jumpHere(walk(s,4940),370);s=jumpTo(walk(s,5155),5290,310);s=jumpTo(walk(s,5575),5700,240);s=record(walk(s,5840),1);s=jumpHere(walk(s,8160),378);s=jumpTo(walk(s,8335),8470,305);s=jumpTo(walk(s,8715),8860,235);s=record(walk(s,9000),2);s=jumpHere(walk(s,12150),355);s=jumpTo(walk(s,12345),12410,270);s=record(walk(s,12525),3);}
 else{s=jumpHere(walk(s,4920),370);s=jumpTo(walk(s,5172),5310,300);s=jumpTo(walk(s,5580),5710,285);s=record(walk(s,5830),1);s=jumpHere(walk(s,8160),365);s=jumpTo(walk(s,8405),8550,290);s=jumpTo(walk(s,8805),8940,215);s=record(walk(s,9070),2);s=jumpHere(walk(s,11350),365);s=jumpTo(walk(s,11575),11720,290);s=jumpTo(walk(s,11965),12110,230);s=record(walk(s,12260),3);}
 assert.deepEqual(s.visited,[0,1,2,3,4,5,6,7]);const before=clone(s),route=clone(s.routeV109);s=ticks(walk(s,115),60,{interact:true});assert.equal(s.status,'returned');assert.deepEqual(s.routeV109,route);assert(api.canAdvanceGameReserveV66(before,s));assert.equal(api.gameReserveV66MaterialTotal(s),32);assert.equal(api.stepGameReserveV66(s,{move:1}),s);valid(s);
});

test('V5 real upper-platform jump apices and human sightings remain valid without relaxing legacy terrain bounds',()=>{
 let s=firstSite(api.GAME_RESERVE_V109_IDS[1]);s.humans[0]={...s.humans[0],status:'active',hp:70,downAt:null,x:s.player.x+80,facing:-1};let low=438,lowestObserved=395;s=api.stepGameReserveV66(s,{jump:true});for(let i=0;i<45;i++){s=api.stepGameReserveV66(s);low=Math.min(low,s.player.y);if(s.humans[0].lastSeenX!==null)lowestObserved=Math.min(lowestObserved,s.humans[0].lastSeenY);valid(s);}assert(low<120);assert(lowestObserved<60);const old=api.createGameReserveV108(109);old.player.y=90;assert.equal(api.normalizeGameReserveV66(old),null);
});

test('V5 records interrupt on movement and the last-frame real projectile, and cannot regress or be backdated',()=>{
 for(const id of api.GAME_RESERVE_V109_IDS){const ready=firstSite(id);let moving=ticks(ready,80,{interact:true});moving=api.stepGameReserveV66(moving,{interact:true,move:1});assert.equal(moving.channel.kind,'none');assert.equal(moving.routeV109.siteRecords[0].recordedAt,null);const shot=ticks(ready,119,{interact:true});shot.projectiles.push({x:shot.player.x,y:shot.player.y-53,vx:0,vy:0,owner:'human',life:3});const hit=api.stepGameReserveV66(shot,{interact:true});assert.equal(hit.player.hp,92);assert.equal(hit.channel.kind,'none');assert.equal(hit.routeV109.siteRecords[0].recordedAt,null);valid(hit);const done=record(ready,0);for(const mutate of[s=>s.routeV109.siteRecords[0].recordedAt=null,s=>s.routeV109.siteRecords[0].hunterX++,s=>s.visited.pop()]){const bad=clone(done);bad.tick++;mutate(bad);assert.equal(api.canAdvanceGameReserveV66(done,bad),false);}const back=clone(ready);back.tick++;back.routeV109.siteRecords[0]={recordedAt:ready.tick,hunterX:ready.player.x,hunterY:ready.player.y};assert.equal(api.canAdvanceGameReserveV66(ready,back),false);}
});

test('Khar-Duun goals require a real interruptible denial at each different known depot, not a cumulative arbitrary count',()=>{
 let s=quiet(api.GAME_RESERVE_V109_IDS[0]);for(const index of api.GAME_RESERVE_KHAR_DUUN_V109.cacheObjectives){s=walk(s,api.gameReserveV66Supplies(s)[index]);const old=s.supplies[index],before=clone(s);s=ticks(s,119,{interact:true});assert.equal(s.supplies[index],old);s=api.stepGameReserveV66(s,{interact:true});assert.equal(s.supplies[index],old-1);assert.equal(s.deniedSupplies[index],1);assert(api.canAdvanceGameReserveV66(before,s));assert.equal(api.gameReserveV66MaterialTotal(s),32);valid(s);}assert.equal(api.gameReserveV109Objectives(s).completed,true);s=ticks(walk(s,115),60,{interact:true});assert.equal(api.gameReserveV109Objectives(s).returned,true);const bad=clone(s);bad.deniedSupplies[1]=0;assert.equal(api.canAdvanceGameReserveV66(s,bad),false);
});

test('Iskhel mechanic observations come from actual sight lines and identify two independent adults',()=>{
 let s=quiet(api.GAME_RESERVE_V109_IDS[1]);for(const index of[1,5]){const h=s.humans[index];h.status='active';h.hp=70;h.downAt=null;h.x=900+index*300;h.facing=1;s.player.x=h.x-180;s.visited=[0,1];valid(s);let blocked=clone(s);const c=api.gameReserveV66Cover(s).find(c=>c.x>40&&c.x<3000);blocked.player.x=c.x-25;blocked.humans[index].x=c.x+c.w+25;blocked=ticks(blocked,90,{scan:true});assert.equal(blocked.humans[index].identified,false);s=ticks(s,90,{scan:true});assert.equal(s.humans[index].identified,true);valid(s);}const goals=api.gameReserveV109Objectives(s);assert.equal(goals.mechanics,2);assert.equal(goals.completed,false);assert.equal(goals.interceptions,0);
});

test('new biome work decisions use actual co-workers, release at launch and fall back when alone or threatened',()=>{
 const khar=api.stepGameReserveV66(api.createGameReserveV109(109,api.GAME_RESERVE_V109_IDS[0]));assert.deepEqual(api.gameReserveV109Behavior(khar,3),{kind:'cache-guard',destination:1475});const next=api.stepGameReserveV66(khar);assert(next.humans[3].x<khar.humans[3].x);const noCache=clone(khar);noCache.supplies[2]=0;noCache.deniedSupplies=Array(16).fill(0);noCache.deniedSupplies[2]=2;valid(noCache);assert.equal(api.gameReserveV109Behavior(noCache,3),null);
 const ice=api.stepGameReserveV66(api.createGameReserveV109(109,api.GAME_RESERVE_V109_IDS[1]));ice.ships[0].parts=3;ice.supplies[0]=0;ice.supplies[1]=1;ice.humans[1].x=2730;ice.humans[3].x=2300;valid(ice);assert.deepEqual(api.gameReserveV109Behavior(ice,3),{kind:'repair-cover',destination:2595,partnerId:ice.humans[1].id});assert(api.stepGameReserveV66(ice).humans[3].x>2300);const away=clone(ice);away.humans[1].x=2400;assert.equal(api.gameReserveV109Behavior(away,3),null);
 for(const start of[khar,ice]){const threatened=clone(start);threatened.humans[3].lastSeenX=1900;threatened.humans[3].alertUntil=300;assert.equal(api.gameReserveV109Behavior(threatened,3),null);const alone=clone(start);for(let i=0;i<3;i++){alone.humans[i].hp=0;alone.humans[i].status='down';alone.humans[i].downAt=0;}assert.equal(api.gameReserveV109Behavior(alone,3),null);const launched=clone(start);launched.tick=100;launched.ships[0]={...launched.ships[0],parts:3,repair:3600,launch:100};assert.equal(api.gameReserveV109Behavior(launched,3),null);}
});

for(const id of api.GAME_RESERVE_V109_IDS)test(id+': living teams carry finite components, repair, release posts and physically board all four aircraft',()=>{
 let s=api.stepGameReserveV66(api.createGameReserveV109(109,id)),before=clone(s);const carried=new Set(),boarded=new Set(),decisions=new Set(),occupied=new Set();for(let i=0;i<12000;i++){for(let n=0;n<16;n++){const decision=api.gameReserveV109Behavior(s,n);if(decision){decisions.add(decision.kind);const h=s.humans[n];if(Math.abs(h.x-decision.destination)<=12&&!h.moving&&h.work===0)occupied.add(decision.kind);}}s=api.stepGameReserveV66(s);for(const h of s.humans){if(h.carrying)carried.add(h.team);if(h.status==='boarded'||h.status==='escaped')boarded.add(h.team);}if(i%300===0){valid(s);assert(api.canAdvanceGameReserveV66(before,s));assert.equal(api.gameReserveV66MaterialTotal(s),32);before=clone(s);}}assert.equal(carried.size,4);assert.equal(boarded.size,4);assert(s.humans.every(h=>h.status==='escaped'));assert(s.ships.every(ship=>ship.departedAt!==null));assert(decisions.has(id===api.GAME_RESERVE_V109_IDS[0]?'cache-guard':'repair-cover'));assert(occupied.has(id===api.GAME_RESERVE_V109_IDS[0]?'cache-guard':'repair-cover'));valid(s);
});

test('Iskhel only counts a launch interrupted at its real ramp after naturally carried parts, repairs and boarding',()=>{
 let s=api.stepGameReserveV66(api.createGameReserveV109(109,api.GAME_RESERVE_V109_IDS[1]));
 for(let i=0;i<9000&&!(s.ships[0].launch!==null&&s.humans.filter(h=>h.team===0&&h.status==='boarded').length===4);i++)s=api.stepGameReserveV66(s);
 assert.notEqual(s.ships[0].launch,null);assert.equal(s.ships[0].departedAt,null);assert.equal(s.humans.filter(h=>h.team===0&&h.status==='boarded').length,4);assert.equal(api.gameReserveV109Objectives(s).interceptions,0);
 // Only interaction position is a declared unit fixture; all aircraft preparation above was simulated.
 const x=api.gameReserveV66Ships(s)[0].x;s.player.x=x;s.visited=[0,1];valid(s);const before=clone(s),launchTick=s.ships[0].launch;s=ticks(s,89,{interact:true});assert.equal(s.ships[0].interception,undefined);s=api.stepGameReserveV66(s,{interact:true});assert.deepEqual(s.ships[0].interception,{tick:s.tick,launchTick,hunterX:x});assert.equal(s.ships[0].launch,null);assert.equal(s.ships[0].departedAt,null);assert.equal(api.gameReserveV109Objectives(s).interceptions,1);assert.equal(api.gameReserveV109Objectives(s).completed,false);assert.equal(api.gameReserveV66MaterialTotal(s),32);assert(api.canAdvanceGameReserveV66(before,s));assert.equal(s.humans.filter(h=>h.team===0&&h.disembarkation?.tick===s.tick&&h.status==='active').length,4);valid(s);
});

test('V5 rejects cross-reserve swaps, hidden authority, invented materials and future identities, and keeps unobserved contacts private',()=>{
 for(const id of api.GAME_RESERVE_V109_IDS){const original=api.createGameReserveV109(109,id);for(const mutate of[s=>s.version=6,s=>s.reserveId=api.GAME_RESERVE_V109_IDS.find(other=>other!==id),s=>s.routeV108=s.routeV109,s=>s.routeV109.complete=true,s=>s.routeV109.siteRecords[0].reward=100,s=>s.objectives={completed:true},s=>s.humans[0].id='H001',s=>s.humans[1].behavior='teleport',s=>s.ships[0].parts++,s=>s.player.y=-1,s=>s.supplies.pop()]){const bad=clone(original);mutate(bad);assert.equal(api.normalizeGameReserveV66(bad),null);}const qa=homeworldSceneSsrV78(),tactical=qa.load('app/game/systems/gameReserveTacticalV98.ts').gameReserveTacticalV98(original);assert.equal(tactical.contacts.length,0);assert(tactical.ships.every(ship=>ship.phase==='unknown'&&ship.parts===null&&ship.aboard===null));const html=qa.render('app/game/GameReserveTacticalV98.tsx',{state:original});assert(html.includes(api.gameReserveV66Name(original)));assert.equal((html.match(/data-reserve-route-site=/g)||[]).length,4);assert(html.includes('Bilan')||html.includes('bilan'));assert.equal((html.match(/data-reserve-objectives-v109=/g)||[]).length,1);}
 const a=api.createGameReserveV109(109,api.GAME_RESERVE_V109_IDS[0]),b=api.createGameReserveV109(109,api.GAME_RESERVE_V109_IDS[1]);assert.equal(api.canAdvanceGameReserveV66(a,b),false);
});
