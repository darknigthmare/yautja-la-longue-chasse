import test from 'node:test';
import assert from 'node:assert/strict';
import {mobilitySourceLoader} from './mobility/load-source.mjs';
const load=mobilitySourceLoader();
const m=load('app/game/systems/mobility/ledger.ts');
const c=load('app/game/systems/mobility/course.ts');
const d=load('app/game/systems/mobility/catalogue.ts');
const OWNER='2026-11-08T10:00:00.000Z';
const INPUT={throttle:0,steer:0,brake:false,boost:false,interact:false};
function fixture(){return {createdAt:OWNER,prologue:null,profile:{clanMarks:10000,rankId:'blooded',honor:300},mobilityV1:m.createMobilityLedger(OWNER)};}
function order(save,command,ok=true){const before=JSON.stringify(save),r=m.actMobility(save,{ownerCreatedAt:save.createdAt,expectedRevision:save.mobilityV1?.revision??0,...command});assert.equal(r.accepted,ok,r.message);assert.equal(JSON.stringify(save),before,'pure reducer');return r.accepted?{...save,mobilityV1:r.state,profile:{...save.profile,clanMarks:r.clanMarks}}:save;}
function licensed(){const s=fixture();s.mobilityV1.circulationPermit=true;return s;}
function bought(){return order(licensed(),{type:'buy',modelId:'clan_hoverbike',expectedCost:420});}
export function drivePermit(save=fixture()){
 let s=order(save,{type:'start',modelId:'scout_grav_sled',loaned:true});
 let stage=0, batch=[];let physics=s.mobilityV1.active.course;
 const points=[{x:820,y:490},{x:820,y:130},{x:820,y:30},{x:140,y:30},{x:140,y:130},{x:140,y:490}];
 for(let n=0;n<16000;n++){
  const target=points[stage],distance=Math.hypot(target.x-physics.x,target.y-physics.y);
  const angle=Math.atan2(target.y-physics.y,target.x-physics.x),error=Math.atan2(Math.sin(angle-physics.heading),Math.cos(angle-physics.heading));
  let input={...INPUT,throttle:Math.abs(error)<.6?1:0,steer:Math.abs(error)>.025?Math.sign(error):0};
  if(stage===1&&distance<40||stage===5&&distance<35){input={...INPUT,brake:true};if(Math.abs(physics.speed)<5){input.interact=true;if(stage===1)stage++;}}
  else if(![1,5].includes(stage)&&distance<20)stage++;
  physics=c.stepMobilityCourse(physics,input,'scout_grav_sled',d.emptyMobilityLevels());batch.push(input);
  const done=stage===5&&c.mobilityCoursePassed(physics);
  if(batch.length===60||done){s=order(s,{type:'drive',runId:s.mobilityV1.active.id,inputs:batch});batch=[];assert.deepEqual(s.mobilityV1.active.course,physics);}
  if(done)return order(s,{type:'return',runId:s.mobilityV1.active.id});
 }
 throw new Error('Course route did not finish '+JSON.stringify(physics));
}
test('catalogue retains exactly the fifty bible identities and all acquisition text',()=>{
 assert.equal(d.MOBILITY_CATALOGUE.length,50);assert.equal(new Set(d.MOBILITY_CATALOGUE.map(v=>v.id)).size,50);
 assert.deepEqual(d.MOBILITY_CATALOGUE.filter(v=>v.shopEnabled).map(v=>v.id),['clan_hoverbike']);
 assert(d.MOBILITY_CATALOGUE.every(v=>v.acquisition&&v.source_class&&!v.artValidated&&!v.canonValidated));
});
test('legacy absent register grants no vehicle or permit',()=>{assert.equal(m.inspectMobilityLedger(undefined,OWNER).status,'absent');assert.equal(m.inspectMobilityLedger(null,OWNER).status,'absent');assert.deepEqual(m.createMobilityLedger(OWNER).owned,[]);});
for(const item of d.MOBILITY_CATALOGUE.filter(v=>v.id!=='clan_hoverbike'))test('non-sale acquisition is protected: '+item.id,()=>{order(licensed(),{type:'buy',modelId:item.id,expectedCost:0},false);});
test('purchase requires permit, adequate rank and exact price',()=>{
 order(fixture(),{type:'buy',modelId:'clan_hoverbike',expectedCost:420},false);
 const low=licensed();low.profile.rankId='young-blood';order(low,{type:'buy',modelId:'clan_hoverbike',expectedCost:420},false);
 for(const price of [0,419,421,-420,NaN,'420'])order(licensed(),{type:'buy',modelId:'clan_hoverbike',expectedCost:price},false);
 const poor=licensed();poor.profile.clanMarks=419;order(poor,{type:'buy',modelId:'clan_hoverbike',expectedCost:420},false);
 const s=bought();assert.equal(s.profile.clanMarks,9580);assert.equal(s.profile.honor,300);assert.equal(s.mobilityV1.owned.length,1);order(s,{type:'buy',modelId:'clan_hoverbike',expectedCost:420},false);
});
for(const upgrade of d.MOBILITY_MODULES)test('upgrade cap and exact geometric cost: '+upgrade.id,()=>{
 let s=bought();for(let level=0;level<3;level++){const cost=m.mobilityServiceQuote(s.mobilityV1,'clan_hoverbike','upgrade',upgrade.id);assert.equal(cost,upgrade.price*2**level);s=order(s,{type:'upgrade',modelId:'clan_hoverbike',module:upgrade.id,expectedCost:cost});assert.equal(s.mobilityV1.owned[0].upgrades[upgrade.id],level+1);}
 assert.equal(m.mobilityServiceQuote(s.mobilityV1,'clan_hoverbike','upgrade',upgrade.id),null);order(s,{type:'upgrade',modelId:'clan_hoverbike',module:upgrade.id,expectedCost:0},false);
});
test('repair and charge are independent; no cost/no-op exploit',()=>{
 let s=bought();s.mobilityV1.owned[0].condition=50;s.mobilityV1.owned[0].energy=25;
 const cost=m.mobilityServiceQuote(s.mobilityV1,'clan_hoverbike','repair');s=order(s,{type:'repair',modelId:'clan_hoverbike',expectedCost:cost});assert.equal(s.mobilityV1.owned[0].energy,25);assert.equal(s.mobilityV1.repairCount,1);
 assert.equal(m.mobilityServiceQuote(s.mobilityV1,'clan_hoverbike','repair'),null);order(s,{type:'repair',modelId:'clan_hoverbike',expectedCost:0},false);
 s=order(s,{type:'recharge',modelId:'clan_hoverbike',expectedCost:30});assert.equal(s.mobilityV1.owned[0].energy,100);order(s,{type:'care',modelId:'clan_hoverbike',expectedCost:1},false);
});
test('stale revision, foreign owner and changed quote cannot spend marks',()=>{
 const s=licensed();order(s,{type:'buy',modelId:'clan_hoverbike',expectedCost:420,expectedRevision:99},false);order(s,{type:'buy',modelId:'clan_hoverbike',expectedCost:420,ownerCreatedAt:'other'},false);
});
const invalidMutations=[v=>v.version=2,v=>v.ownerCreatedAt='elsewhere',v=>v.revision=-1,v=>v.revision=1.5,v=>v.owned.push({...v.owned[0]}),v=>v.owned[0].condition=Infinity,v=>v.owned[0].energy=-1,v=>v.owned[0].upgrades.drive=4,v=>v.owned[0].upgrades.secret=1,v=>v.owned[0].id='enforcer_prison_skiff',v=>v.extra=1,v=>v.nextRunId=0,v=>v.spentMarks=NaN];
invalidMutations.forEach((mutate,i)=>test('invalid/future ledger rejected without normalization loss '+i,()=>{const s=bought();mutate(s.mobilityV1);assert.notEqual(m.inspectMobilityLedger(s.mobilityV1,OWNER).status,'valid');}));
test('machine upgrades have actual tradeoffs and cargo mass affects handling',()=>{
 const a=d.mobilityStats('clan_hoverbike'),fast=d.mobilityStats('clan_hoverbike',{...d.emptyMobilityLevels(),drive:3}),heavy=d.mobilityStats('clan_hoverbike',{...d.emptyMobilityLevels(),armor:3}),loaded=d.mobilityStats('clan_hoverbike',d.emptyMobilityLevels(),100,100);
 assert(fast.speed>a.speed&&fast.energyUse>a.energyUse);assert(heavy.speed<a.speed&&heavy.collisionResistance>a.collisionResistance);assert(loaded.turn<a.turn&&loaded.acceleration<a.acceleration);
});
test('loaner tutorial is actually driven: gates, physical cargo, stop, permit only',()=>{
 const s=drivePermit();assert.equal(s.mobilityV1.circulationPermit,true);assert.equal(s.mobilityV1.owned.length,0);assert.equal(s.profile.clanMarks,10000);assert.equal(s.profile.honor,300);assert.equal(s.mobilityV1.lastReport.result,'passed');assert(s.mobilityV1.lastReport.distance>1500);
});
test('parking at start or recovery never grants permit',()=>{for(const type of ['return','recover']){let s=order(fixture(),{type:'start',modelId:'scout_grav_sled',loaned:true});s=order(s,{type,runId:s.mobilityV1.active.id});assert.equal(s.mobilityV1.circulationPermit,false);}});
test('own driving consumes energy, persists damage, blocks garage transactions',()=>{
 let s=order(bought(),{type:'start',modelId:'clan_hoverbike',loaned:false});
 order(s,{type:'repair',modelId:'clan_hoverbike',expectedCost:0},false);
 for(let i=0;i<12;i++)s=order(s,{type:'drive',runId:s.mobilityV1.active.id,inputs:Array.from({length:60},()=>({...INPUT,throttle:1,boost:true}))});
 assert(s.mobilityV1.owned[0].energy<100);assert(s.mobilityV1.owned[0].condition<100);assert(s.mobilityV1.active.course.impacts>0);
 const before={...s.mobilityV1.owned[0]};s=order(s,{type:'recover',runId:s.mobilityV1.active.id});assert.deepEqual(s.mobilityV1.owned[0],before);
});
test('course serialization is lossless and input counts cannot fast-forward',()=>{
 const s=order(fixture(),{type:'start',modelId:'scout_grav_sled',loaned:true});assert.deepEqual(m.inspectMobilityLedger(JSON.parse(JSON.stringify(s.mobilityV1)),OWNER).state,s.mobilityV1);
 for(const inputs of [[],Array(61).fill(INPUT),[{...INPUT,throttle:2}],[{...INPUT,dt:10000}],null])order(s,{type:'drive',runId:1,inputs},false);
 order(s,{type:'drive',runId:999,inputs:[INPUT]},false);
});
test('fixed timestep clamps motion before obstacles and never tunnels through',()=>{
 let s={...c.createMobilityCourse(),x:290,y:300,heading:0,speed:200};for(let i=0;i<600;i++)s=c.stepMobilityCourse(s,{...INPUT,throttle:1,boost:true},'clan_hoverbike',d.emptyMobilityLevels());assert(s.x<=312);assert(s.condition<100);assert(c.validMobilityCourse(s));
});
test('overheat suppresses boost and power exhaustion does not teleport',()=>{
 let s={...c.createMobilityCourse(),heat:100,energy:0};const after=c.stepMobilityCourse(s,{...INPUT,throttle:1,boost:true},'scout_grav_sled',d.emptyMobilityLevels());assert.equal(after.x,s.x);assert.equal(after.speed,0);assert(after.overheated);assert(after.heat<100);
});
test('NPC logistics remains in its lane and actually yields to nearby driver',()=>{
 let s={...c.createMobilityCourse(),x:400,y:130};const first=[...s.npcTicks];for(let i=0;i<60;i++)s=c.stepMobilityCourse(s,INPUT,'scout_grav_sled',d.emptyMobilityLevels());assert.equal(s.npcTicks[0],first[0]);assert(s.npcTicks[1]>first[1]);
 for(const npc of c.mobilityYardNpcs(s.npcTicks,s)){assert(npc.x>=400&&npc.x<=640&&npc.y>=80&&npc.y<=180);assert.equal(npc.modelId,'trophy_carrier');}
});
