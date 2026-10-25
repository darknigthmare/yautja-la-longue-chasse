import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
const built=await build({stdin:{contents:"export * from './app/game/systems/gameReserveV66';export * from './app/game/systems/gameReserveExpeditionV108';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const clone=structuredClone,sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const valid=state=>assert.deepEqual(api.normalizeGameReserveV66(state),state);
function ticks(state,count,input={}){for(let i=0;i<count;i++)state=api.stepGameReserveV66(state,input);return state;}
function quiet(){const state=api.createGameReserveV108(108);for(const h of state.humans){h.status='down';h.hp=0;h.downAt=0;}valid(state);return api.stepGameReserveV66(state);}
function walk(state,x){const move=x>state.player.x?1:-1;for(let i=0;i<7000&&(x-state.player.x)*move>0;i++){state=api.stepGameReserveV66(state,{move});assert.equal(state.status,'active');if(i%180===0)valid(state);}assert(Math.abs(state.player.x-x)<4);valid(state);return state;}
function jumpHere(state,y){state=api.stepGameReserveV66(state,{jump:true});assert(state.player.vy<0);state=ticks(state,60);assert.equal(state.player.y,y);valid(state);return state;}
function jumpTo(state,x,y){state=api.stepGameReserveV66(state,{move:1,jump:true});for(let i=0;i<90;i++){state=api.stepGameReserveV66(state,{move:1});if(state.player.x>=x&&state.player.y===y&&state.player.vy===0){valid(state);return state;}}assert.fail(`No physical landing at ${x}/${y}; got ${state.player.x}/${state.player.y}`);}
function record(state,index){assert.deepEqual(api.gameReserveV66Interaction(state),{kind:'survey',target:index,ticks:0});const before=clone(state);state=ticks(state,119,{interact:true});assert.equal(state.routeV108.siteRecords[index].recordedAt,null);assert.equal(api.stepGameReserveV66(state,{interact:true},true),state);state=api.stepGameReserveV66(state,{interact:true});assert.deepEqual(state.routeV108.siteRecords[index],{recordedAt:state.tick,hunterX:state.player.x,hunterY:state.player.y});assert(api.canAdvanceGameReserveV66(before,state));valid(state);return state;}
function firstSite(){let s=walk(quiet(),1700);s=jumpHere(s,360);s=jumpTo(walk(s,1900),2030,286);s=jumpTo(walk(s,2275),2410,220);return walk(s,2550);}

test('V4 is a second eight-sector reserve with sixteen distinct adults and four physical groups; Vharuun is deduplicated',()=>{
 const state=api.createGameReserveV108(108);valid(state);assert.equal(state.version,4);assert.equal(state.reserveId,'kesh-watch-expedition');assert.equal(api.gameReserveV66World(state).width,12800);assert.equal(state.humans.length,16);assert.equal(state.ships.length,4);assert.equal(state.supplies.length,16);assert.equal(api.gameReserveV66MaterialTotal(state),32);
 const sectors=api.gameReserveV66Sectors(state);assert.equal(sectors.length,8);sectors.forEach((sector,i)=>{assert.equal(sector.left,i*1600);assert.equal(sector.right,(i+1)*1600);});
 const previous=api.createGameReserveV107(107);assert.equal(new Set([...api.gameReserveV66Sectors(previous),...sectors].map(s=>s.id)).size,16);assert.equal(new Set([...previous.humans,...state.humans].map(h=>h.id)).size,32);
 assert.deepEqual(state.humans.map(h=>h.team),[0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3]);assert.equal(new Set(api.gameReserveV66People(state).map(p=>JSON.stringify(p.tactics))).size,16);assert.equal(new Set(api.gameReserveV66People(state).map(p=>p.art)).size,3);assert(state.humans.every(h=>!/^H\d/.test(h.id)));
 assert.deepEqual(api.createGameReserveV108(108),state);assert.notDeepEqual(api.createGameReserveV108(109).humans,state.humans);
 const shapes=sectors.map(s=>JSON.stringify(api.gameReserveV66Platforms(state).filter(p=>p.x>=s.left&&p.x<s.right).map(p=>[p.x-s.left,p.y,p.w])));assert.equal(new Set(shapes).size,8);
});

test('all V1/V2/V3 factory bytes and played traces retain the V107 hashes captured before V108 editing',async()=>{
 const bytes=await fs.readFile('tests/fixtures/game-reserve-v107-traces-v108.json');assert.equal(sha(bytes),'8225b1da69256409b5b9c2091893c4d864965f74d1c420d96f1dd4bce18f7f40');
 for(const row of JSON.parse(bytes).rows){let state=api[row.factory](row.seed);const hashes=[sha(JSON.stringify(state))];for(let i=0;i<900;i++){const input={move:i%300<200?1:-1,jump:i%67===0,attack:i%91===0,cloak:i%173===0,scan:i%83<13,interact:i%101>90};state=api.stepGameReserveV66(state,i===0?{}:input);if(i%90===0||i===899)hashes.push(sha(JSON.stringify(state)));}assert.deepEqual(hashes,row.hashes,row.factory+' '+row.seed);valid(state);}
});

test('the four high posts, eight different sectors and return require actual walking and landing geometry',()=>{
 // Explicit geometry fixture: sixteen adults were already down at tick0.
 // No combat victory is claimed by this terrain test.
 let s=record(firstSite(),0);s=jumpHere(walk(s,4910),365);s=jumpTo(walk(s,5125),5250,295);s=jumpTo(walk(s,5500),5650,230);s=record(walk(s,5790),1);
 s=jumpHere(walk(s,8140),365);s=jumpTo(walk(s,8330),8470,290);s=jumpTo(walk(s,8735),8880,225);s=record(walk(s,9010),2);
 s=jumpHere(walk(s,12040),355);s=jumpTo(walk(s,12245),12370,280);s=record(walk(s,12480),3);assert.deepEqual(s.visited,[0,1,2,3,4,5,6,7]);
 const before=clone(s),notes=clone(s.routeV108);s=ticks(walk(s,115),60,{interact:true});assert.equal(s.status,'returned');assert.deepEqual(s.routeV108,notes);assert(api.canAdvanceGameReserveV66(before,s));assert.equal(api.stepGameReserveV66(s,{move:1}),s);assert.equal(api.gameReserveV66MaterialTotal(s),32);valid(s);
});

test('V4 observation channels interrupt on movement or real injury and notes cannot regress or be backdated',()=>{
 const ready=firstSite();let interrupted=ticks(ready,70,{interact:true});interrupted=api.stepGameReserveV66(interrupted,{move:1,interact:true});assert.equal(interrupted.channel.kind,'none');assert.equal(interrupted.routeV108.siteRecords[0].recordedAt,null);
 const shot=ticks(ready,119,{interact:true});shot.projectiles.push({x:shot.player.x,y:shot.player.y-53,vx:0,vy:0,owner:'human',life:3});const damaged=api.stepGameReserveV66(shot,{interact:true});assert.equal(damaged.player.hp,92);assert.equal(damaged.channel.kind,'none');assert.equal(damaged.routeV108.siteRecords[0].recordedAt,null);valid(damaged);
 const done=record(ready,0);for(const alter of[s=>s.routeV108.siteRecords[0].recordedAt=null,s=>s.routeV108.siteRecords[0].hunterX++,s=>s.visited.pop(),s=>s.player.hp=101]){const bad=clone(done);bad.tick++;alter(bad);assert.equal(api.canAdvanceGameReserveV66(done,bad),false);}
 const back=clone(ready);back.tick++;back.routeV108.siteRecords[0]={recordedAt:ready.tick,hunterX:ready.player.x,hunterY:ready.player.y};assert.equal(api.canAdvanceGameReserveV66(ready,back),false);
});

test('V4 normalization rejects mixed identities, hidden authority, inventory creation, invalid geometry and future versions',()=>{
 const original=api.createGameReserveV108(108);const alterations=[s=>s.version=5,s=>s.reserveId='vharuun-transect-expedition',s=>s.routeV107=s.routeV108,s=>s.lookout={},s=>s.inventory={reward:true},s=>s.player.invulnerable=true,s=>s.humans.pop(),s=>s.humans[0].id='H001',s=>s.humans[15].team=4,s=>s.humans[2].behavior='teleport',s=>s.channel.complete=true,s=>s.previous.replay=true,s=>s.log[0].reward=100,s=>s.ships[0].parts++,s=>s.ships.pop(),s=>s.supplies.pop(),s=>s.routeV108.siteRecords.pop(),s=>s.routeV108.extra=true,s=>s.routeV108.siteRecords[0].extra=true,s=>s.visited.push(8),s=>s.player.x=12801,s=>s.routeV108.siteRecords[0]={recordedAt:0,hunterX:2550,hunterY:220}];
 for(const alter of alterations){const bad=clone(original);alter(bad);assert.equal(api.normalizeGameReserveV66(bad),null);}
 for(const factory of['createGameReserveV66','createGameReserveV104','createGameReserveV107']){const old=api[factory](108);old.routeV108=clone(original.routeV108);assert.equal(api.normalizeGameReserveV66(old),null);assert.equal(api.canAdvanceGameReserveV66(original,api[factory](108)),false);}
});

test('escorts actually follow nearby visible carriers instead of collecting; unseen or threatened partners do not guide them',()=>{
 let s=api.stepGameReserveV66(api.createGameReserveV108(108));s.humans[0].x=800;s.humans[1].x=1050;s.humans[1].carrying=true;s.supplies[1]--;valid(s);
 const assignment=api.gameReserveV108Behavior(s,0);assert.deepEqual(assignment,{kind:'carrier-escort',destination:975,partnerId:'kesh-branek'});const next=api.stepGameReserveV66(s);assert(next.humans[0].x>s.humans[0].x);assert(api.gameReserveV66Supplies(s)[s.humans[0].targetSupply]<s.humans[0].x);assert.equal(next.humans[0].carrying,false);valid(next);
 const far=clone(s);far.humans[1].x=3000;assert.equal(api.gameReserveV108Behavior(far,0),null);const blocked=clone(s);blocked.humans[0].x=400;blocked.humans[1].x=600;assert.equal(api.gameReserveV108Behavior(blocked,0),null);
 const threatened=clone(s);threatened.humans[0].lastSeenX=900;threatened.humans[0].alertUntil=200;assert.equal(api.gameReserveV108Behavior(threatened,0),null);
});

test('ramp defenders and cover observers take different physical posts, release them for boarding and repair alone',()=>{
 let s=api.stepGameReserveV66(api.createGameReserveV108(108));s.ships[0].parts=1;s.supplies[0]--;s.humans[3].x=2300;s.humans[2].x=2500;valid(s);
 assert.deepEqual(api.gameReserveV108Behavior(s,3),{kind:'ramp-defender',destination:2585});assert.deepEqual(api.gameReserveV108Behavior(s,2),{kind:'cover-observer',destination:2660});let next=api.stepGameReserveV66(s);assert(next.humans[3].x>s.humans[3].x);assert(next.humans[2].x>s.humans[2].x);valid(next);
 for(const index of[2,3]){const alone=clone(s);for(let n=0;n<4;n++)if(n!==index){alone.humans[n].status='down';alone.humans[n].hp=0;alone.humans[n].downAt=0;}assert.equal(api.gameReserveV108Behavior(alone,index),null);next=api.stepGameReserveV66(alone);assert(next.humans[index].x<alone.humans[index].x);valid(next);}
 const launch=clone(s);launch.tick=100;launch.ships[0]={...launch.ships[0],parts:3,repair:3600,launch:100};launch.supplies[1]=0;assert.equal(api.gameReserveV108Behavior(launch,2),null);assert.equal(api.gameReserveV108Behavior(launch,3),null);valid(launch);
});

test('cover observers cannot see through vegetation or leak distant contacts to the notebook',()=>{
 const s=quiet();s.humans[2]={...s.humans[2],status:'active',hp:70,downAt:null,x:2660,facing:1};s.player.x=2820;s.visited=[0,1];const next=api.stepGameReserveV66(s);assert.equal(next.humans[2].lastSeenX,null);valid(next);
 const qa=homeworldSceneSsrV78(),initial=api.createGameReserveV108(108),tactical=qa.load('app/game/systems/gameReserveTacticalV98.ts').gameReserveTacticalV98(initial);assert.equal(tactical.contacts.length,0);assert(tactical.ships.every(ship=>ship.phase==='unknown'&&ship.parts===null&&ship.aboard===null));assert(tactical.caches.every(cache=>cache.remaining===null));
 const html=qa.render('app/game/GameReserveTacticalV98.tsx',{state:initial});assert(html.includes('Relevés d’Avar’Kesh'));assert(html.includes('Objectif secondaire'));assert(!html.includes('Aysen'));assert.equal((html.match(/data-reserve-route-site=/g)||[]).length,4);
});

test('four living teams genuinely use all three behaviors, carry conserved materials, repair, walk aboard and depart',()=>{
 let s=api.stepGameReserveV66(api.createGameReserveV108(108)),previous=clone(s);const decisions=new Set(),carried=new Set(),boarded=new Set();
 for(let i=0;i<10000;i++){for(let index=0;index<s.humans.length;index++){const a=api.gameReserveV108Behavior(s,index);if(a)decisions.add(a.kind);}s=api.stepGameReserveV66(s);s.humans.forEach(h=>{if(h.carrying)carried.add(h.team);if(h.status==='boarded'||h.status==='escaped')boarded.add(h.team);});if(i%180===0){valid(s);assert(api.canAdvanceGameReserveV66(previous,s));assert.equal(api.gameReserveV66MaterialTotal(s),32);previous=clone(s);}}
 assert.deepEqual([...decisions].sort(),['carrier-escort','cover-observer','ramp-defender']);assert.equal(carried.size,4);assert.equal(boarded.size,4);assert(s.ships.every(ship=>ship.departedAt!==null));assert(s.humans.every(h=>h.status==='escaped'));for(const h of s.humans)assert(Math.abs(h.x-api.gameReserveV66Ships(s)[h.team].x)<26);valid(s);
});

test('a naturally prepared V4 launch is physically interrupted at its ramp and passengers exit without free material or healing',()=>{
 let s=api.stepGameReserveV66(api.createGameReserveV108(108));for(let i=0;i<7000&&s.ships[0].launch===null;i++)s=api.stepGameReserveV66(s);assert.notEqual(s.ships[0].launch,null);s=ticks(s,40);assert(s.humans.some(h=>h.team===0&&h.status==='boarded'));
 // Declared unit interaction fixture: only the hunter starts at the real ramp.
 // All ship preparation and passengers above came from the living simulation.
 s.player.x=2700;s.visited=[0,1];valid(s);const before=clone(s),launchTick=s.ships[0].launch;s=ticks(s,89,{interact:true});assert.equal(s.ships[0].interception,undefined);s=api.stepGameReserveV66(s,{interact:true});assert.deepEqual(s.ships[0].interception,{tick:s.tick,launchTick,hunterX:2700});assert.equal(s.ships[0].launch,null);assert.equal(s.ships[0].departedAt,null);assert.equal(api.gameReserveV66MaterialTotal(s),32);assert(api.canAdvanceGameReserveV66(before,s));for(const h of s.humans.filter(h=>h.team===0&&h.disembarkation)){assert.equal(h.status,'active');assert(Math.abs(h.x-2700)<26);assert.equal(h.disembarkation.tick,s.tick);}valid(s);
 const qa=homeworldSceneSsrV78(),html=qa.render('app/game/GameReserveTacticalV98.tsx',{state:s});assert(html.includes('Départs réellement interrompus : 1'));assert(html.includes('Rejoins encore physiquement l’extraction'));
});


test('an observer whose aircraft departed walks towards the observation post of the actual replacement team',()=>{
 const state=api.stepGameReserveV66(api.createGameReserveV108(108));state.tick=1000;state.visited=[0,1];state.ships[0]={...state.ships[0],parts:3,repair:3600,launch:100,departedAt:1000};state.supplies[0]=0;state.supplies[1]=1;state.ships[1].parts=1;state.supplies[4]=1;state.humans[2].x=3000;valid(state);
 const next=api.stepGameReserveV66(state);assert.equal(next.humans[2].team,1);assert.deepEqual(api.gameReserveV108Behavior(next,2),{kind:'cover-observer',destination:5845});assert(next.humans[2].x>state.humans[2].x);assert.equal(api.gameReserveV66MaterialTotal(next),32);valid(next);
});
