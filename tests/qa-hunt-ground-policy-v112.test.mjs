import assert from "node:assert/strict";
import test from "node:test";
import {decideGroundApexTrophyInputV112,decideHuntCampaignInputV112,groundTrophyGuardV112,observeGroundTrophyDamageV112} from "../scripts/lib/qa-hunt-ground-policy-v112.mjs";
import {chooseGroundHarvestV112,exactVolumeCandidatesV112,groundHarvestMenuActionV112,nearestGroundHarvestThreatV112,observeGroundHarvestV112} from "../scripts/lib/qa-hunt-ground-harvest-v112.mjs";
import {decideLoadedCanopyRouteV112,loadedCanopyRouteV112} from "../scripts/lib/qa-hunt-full-canopy-route-v112.mjs";

import {decideHuntCampaignInputV112 as decideBrowserHunt} from "../scripts/lib/qa-hunt-campaign-input-v112.mjs";

const brain=()=>({target:null,pending:null,deferred:new Map(),events:[]});
const corpse=(id,action,requiresFlay=false,projectedRatio=.25)=>({
  key:action+":"+id,corpse:{id},part:{action,requiresFlay},distance:25,workSeconds:3,projectedRatio,
});
const player={x:6042,y:508,width:50,height:116,grounded:true,health:26,maxHealth:100,medicomps:0,
  energy:0,stamina:100,activeWeaponSlot:0,melee:{phase:"idle"}};
const survivor={id:"survivor",active:true,alive:true,x:6030,y:240,width:65,height:90,telegraph:0};
const ocean={phase:"trophy",bossMechanics:{missionId:"ocean-leviathan"},scanNodes:[],recoveryNodes:[],
  boss:{id:"leviathan",x:6067,y:444,width:160,height:180,alive:false,active:true},
  world:{width:8200,platforms:[]},player,enemies:[survivor],cameraX:0};

test("the browser pilot walks off the Glace ledge, under the gate and fully beyond it",()=>{
  const gate={id:"ice-region-thermal-return-gate",x:2090,y:0,width:28,height:328,collision:"solid"};
  const game={...ocean,phase:"tracking",bossMechanics:{missionId:"ice-cryostalker"},
    player:{...player,x:2018,y:314,width:72,scanCooldown:1},
    scanNodes:[{x:3108,y:588,scanned:false}],enemies:[],world:{floorY:624,platforms:[gate]}};
  const memory={previousX:2018,stuckTicks:20,jumpUntil:600};
  const west=decideBrowserHunt(game,1,memory);
  assert.deepEqual(west.held,["left"]);
  assert.deepEqual(west.pressed,[]);
  assert.equal(decideBrowserHunt({...game,player:{...game.player,x:1870,y:321}},2,memory).held[0],"left");
  const under=decideBrowserHunt({...game,player:{...game.player,x:1840,y:404}},3,memory);
  assert.deepEqual(under.held,["right"]);
  assert.deepEqual(under.pressed,[]);
  assert.equal(decideBrowserHunt({...game,player:{...game.player,x:2100,y:404}},4,memory).reason,under.reason);
  assert.equal(decideBrowserHunt({...game,player:{...game.player,x:2118,y:404}},5,memory).reason,"trace");
  assert.equal(memory.iceLowerPass,undefined);
  assert.equal(decideBrowserHunt({...game,world:{...game.world,platforms:[]}},6,memory).reason,"trace");
});

test("the harvest preference reserves a legal part without overriding a previous reservation",()=>{
  const near=corpse("near","harvest-bone",false,.2);
  const hide={...corpse("far","harvest-hide",true,.15),distance:95};
  const preferred=new Set([hide.key]);
  const memory=brain();
  assert.equal(chooseGroundHarvestV112([near,hide],0,memory,0,1,undefined,preferred),hide);
  assert.equal(chooseGroundHarvestV112([near,hide],1,memory,0,1,undefined),hide);
  assert.equal(chooseGroundHarvestV112([near],2,brain(),0,1,undefined,preferred),near);
});

test("ground trophy does not yield a reachable corpse to distant-height combat",()=>{
  const shared=decideHuntCampaignInputV112(ocean,1,{previousX:player.x,stuckTicks:0,jumpUntil:-1});
  assert.equal(shared.reason,"combat:survivor");
  assert.deepEqual(shared.pressed,[]);
  const point={x:6147,y:572};
  const route=decideGroundApexTrophyInputV112(ocean,1,{},point,true);
  assert.deepEqual(route.held,[]);
  assert.deepEqual(route.pressed,["interact"]);
  assert.equal(decideGroundApexTrophyInputV112(ocean,1,{},point,false).held[0],"right");
});

test("ground trophy follows a ledge edge before returning toward the exact body",()=>{
  const memory={};
  const point={x:6120,y:572};
  const onLedge={...ocean,player:{...player,y:300},world:{...ocean.world,platforms:[{x:6000,y:416,width:300,height:25}]}};
  const descent=decideGroundApexTrophyInputV112(onLedge,10,memory,point,false);
  assert.deepEqual(descent.held,["left"]);
  assert.deepEqual(descent.pressed,[]);
  const below={...onLedge,player:{...onLedge.player,x:5950,y:314,grounded:false}};
  const approach=decideGroundApexTrophyInputV112(below,30,memory,point,false);
  assert.deepEqual(approach.held,["right"]);
  assert.deepEqual(approach.pressed,[]);
});

test("a blocked trophy approach tries a standard jump without changing the target",()=>{
  const point={x:6350,y:572};
  const memory={};
  let route;
  for(let tick=0;tick<20;tick++)route=decideGroundApexTrophyInputV112(ocean,tick,memory,point,false);
  assert.equal(route.held.includes("right"),true);
  assert.equal(route.held.includes("jump"),true);
  assert.equal(route.held.includes("up"),false);
  assert.equal(route.pressed.includes("interact"),false);
});

test("menu dispatch harvests an eligible bone directly and prepares only a hide",()=>{
  const bone=corpse("first","harvest-bone");
  const hide=corpse("first","harvest-hide",true);
  const menu={corpseId:"first",open:true,flayed:false,canFlay:true,
    parts:[{action:"harvest-bone",available:true},{action:"harvest-hide",available:false}]};
  assert.equal(groundHarvestMenuActionV112(menu,bone),"harvest-bone");
  assert.equal(groundHarvestMenuActionV112(menu,hide),"flay");
  assert.equal(groundHarvestMenuActionV112({...menu,canFlay:false},hide),null);
  assert.equal(groundHarvestMenuActionV112({...menu,open:false},bone),"open");
  assert.equal(groundHarvestMenuActionV112({...menu,corpseId:"other",nextCorpseId:"first"},bone),"next-corpse");
});

test("stall and interruption release a reservation and bound attempts for the next body",()=>{
  const memory=brain();
  const first=corpse("first","harvest-bone");
  const second=corpse("second","harvest-tissue",false,.1);
  assert.equal(chooseGroundHarvestV112([first,second],0,memory,0,1),first);
  const closer={...first,distance:19};
  assert.equal(chooseGroundHarvestV112([closer,second],120,memory,0,1),closer);
  assert.equal(chooseGroundHarvestV112([closer,second],256,memory,0,1),second);
  memory.pending={action:second.part.action,target:second};
  observeGroundHarvestV112({completedEventIds:[],operation:null},259,memory);
  assert.equal(chooseGroundHarvestV112([first,second],260,memory,0,1),null);
  assert.equal(chooseGroundHarvestV112([first,second],497,memory,0,1),first);
  memory.pending={action:first.part.action,target:first};
  observeGroundHarvestV112({completedEventIds:[],operation:null},500,memory);
  assert.equal(chooseGroundHarvestV112([first],1000,memory,0,1),null);
  assert.deepEqual(memory.events.filter(event=>event.reason==="geste interrompu").map(event=>event.corpseId),["second","first"]);
});

test("a successful preparatory action retains its source until the native receipt arrives",()=>{
  const memory=brain(),hide=corpse("body","harvest-hide",true);
  assert.equal(chooseGroundHarvestV112([hide],0,memory,0,1),hide);
  memory.pending={action:"flay",target:hide};
  observeGroundHarvestV112({completedEventIds:["flay:body"],operation:null},200,memory);
  assert.equal(chooseGroundHarvestV112([hide],201,memory,0,1),hide);
  memory.pending={action:"harvest-hide",target:hide};
  observeGroundHarvestV112({completedEventIds:["flay:body","harvest-hide:body"],operation:null},450,memory);
  assert.equal(memory.target,null);
  assert.equal(memory.events.at(-1).reason,"prise récoltée");
});

test("threat distance accounts for both body footprints and height",()=>{
  assert.equal(nearestGroundHarvestThreatV112(player,[]),Infinity);
  assert.equal(nearestGroundHarvestThreatV112(player,[{...survivor,x:player.x,y:player.y,width:player.width,height:player.height}]),0);
  const below={...player,y:1000};
  assert.ok(nearestGroundHarvestThreatV112(below,[survivor])>650);
});

test("trophy defense opens only after damage interrupts a real rite",()=>{
  const memory={};
  const guard={...survivor,id:"floor-guard",x:6140,y:525,height:99};
  const game={...ocean,enemies:[survivor,guard],damageTaken:27,trophyExtracting:false};
  assert.equal(groundTrophyGuardV112(game,0,memory,()=>false),null);
  assert.equal(observeGroundTrophyDamageV112(game,10,memory,false,0),false);
  assert.equal(observeGroundTrophyDamageV112(game,10,memory,true,27),false);
  assert.equal(observeGroundTrophyDamageV112({...game,phase:"extraction"},10,memory,true,0),false);
  assert.equal(observeGroundTrophyDamageV112(game,10,memory,true,0),true);
  assert.equal(groundTrophyGuardV112(game,11,memory,()=>false),guard);
  assert.equal(groundTrophyGuardV112(game,11,memory,()=>true),null);
  assert.equal(groundTrophyGuardV112({...game,enemies:[survivor]},11,memory,()=>false),null);
  assert.equal(groundTrophyGuardV112(game,250,memory,()=>false),null);
});

test("the sweep avoids a 17-of-18 dead end when two genuine bones can fill the bag",()=>{
  const bone={...corpse("bone-1","harvest-bone",false,16/18),part:{action:"harvest-bone",massKg:1.2,volumeUnits:2},workSeconds:10};
  const hide={...corpse("hide-1","harvest-hide",true,17/18),part:{action:"harvest-hide",massKg:3.8,volumeUnits:3},workSeconds:2};
  const liveBone={key:"harvest-bone:bone-2",massKg:1.2,volumeUnits:2};
  const load={massKg:8,capacityMassKg:24,volumeUnits:14,capacityVolumeUnits:18};
  const packing={load,pool:[{...bone.part,key:bone.key},{...hide.part,key:hide.key},liveBone]};
  assert.deepEqual(exactVolumeCandidatesV112([bone,hide],packing),[bone]);
  assert.equal(chooseGroundHarvestV112([bone,hide],0,brain(),14/18,1,packing),bone);
  assert.equal(chooseGroundHarvestV112([bone,hide],0,brain(),14/18,1),hide);
});

test("exact volume also checks mass and cannot count the same corpse part twice",()=>{
  const bone={...corpse("bone-1","harvest-bone"),part:{action:"harvest-bone",massKg:1.2,volumeUnits:2}};
  const load={massKg:23,capacityMassKg:24,volumeUnits:16,capacityVolumeUnits:18};
  const packing={load,pool:[{...bone.part,key:bone.key}]};
  assert.deepEqual(exactVolumeCandidatesV112([bone],packing),[]);
  assert.deepEqual(exactVolumeCandidatesV112([bone],{
    ...packing,load:{...load,massKg:8,volumeUnits:14},
  }),[]);
});

test("the last legal piece can saturate volume without an extra source",()=>{
  const bone={...corpse("bone-1","harvest-bone"),part:{action:"harvest-bone",massKg:1.2,volumeUnits:2}};
  const load={massKg:22.8,capacityMassKg:24,volumeUnits:16,capacityVolumeUnits:18};
  assert.deepEqual(exactVolumeCandidatesV112([bone],{load,pool:[]}),[bone]);
});

test("the full canopy pilot names real authored supports and waits for ground exit",()=>{
  const world={floorY:624,platforms:[],climbables:[]};
  assert.equal(loadedCanopyRouteV112(world,"jungle-vey",0),null);
  for(let index=0;index<6;index++){
    const id="v112-canopy-jungle-vey-0-"+index;
    world.platforms.push({id:id+"-rest",x:100+index*180,y:270,width:130});
    world.climbables.push({id:id+"-grip",x:141+index*180,y:40,width:48});
  }
  const route=loadedCanopyRouteV112(world,"jungle-vey",0);
  const game={world,player:{x:140,y:508,width:50,height:116,grounded:true,stamina:100,maxStamina:100}};
  const memory={route,stage:"approach",startedTick:0,events:[]};
  const decide=(tick,reachable=()=>false)=>decideLoadedCanopyRouteV112(game,tick,memory,reachable);
  assert.deepEqual(decide(10).held,["up"]);
  assert.equal(memory.stage,"climb-entry");
  game.player.climbZoneId=route.entry.id;game.player.y=130;
  assert.deepEqual(decide(20).held,["right"]);
  assert.equal(memory.stage,"land-first-rest");
  memory.stage="catch-second-vine";game.player.climbReattachSeconds=0;
  assert.deepEqual(decide(30,support=>support===route.secondVine).held,["right","up"]);
  game.player.climbZoneId=route.secondVine.id;game.player.climbing=true;
  assert.deepEqual(decide(32).held,["right"]);
  assert.deepEqual(decide(34).pressed,["jump"]);
  game.player.grounded=false;
  assert.deepEqual(decide(50).held,["right"]);
  game.player.grounded=true;game.player.y=508;
  assert.deepEqual(decide(60).held,[]);
  assert.equal(memory.stage,"grounded-exit");
  assert.equal(memory.events.find(e=>e.stage==="leave-second-vine").supportId,route.secondVine.id);
});

for(const [label,decide] of [["browser",decideBrowserHunt],["native ground",decideHuntCampaignInputV112]])test("the "+label+" pilot turns toward an Apex behind it before swinging in contact",()=>{
  // Desert lot 7 trace: hunter at x 6241 above the arena floor, facing right, Apex pinned at its left patrol bound.
  const hunter={...player,x:6241,y:508,width:72,height:116,facing:1,health:163,maxHealth:192,medicomps:0,
    energy:120,stamina:80,scanCooldown:1,healCooldown:0,melee:{phase:"idle"}};
  const apex={id:"mission-boss",x:6120,y:482,width:157,height:142,alive:true,active:true,scanned:true,telegraph:0,boss:true};
  const game={...ocean,phase:"target",bossMechanics:{missionId:"desert-sandmaw"},energyWeaponsLocked:false,
    player:hunter,boss:apex,enemies:[],world:{floorY:624,platforms:[]}};
  const memory={previousX:hunter.x,stuckTicks:0,jumpUntil:-1,nextJump:Infinity};
  const turn=decide(game,1,memory);
  assert.equal(turn.reason,"combat:mission-boss");
  assert.ok(turn.held.includes("left"),"the hunter must face the Apex before the next swing");
  assert.ok(!turn.pressed.includes("melee"),"a swing facing away cannot reach the Apex");
  const facing=decide({...game,player:{...hunter,facing:-1}},2,memory);
  assert.ok(facing.pressed.includes("melee"));
  assert.ok(!facing.held.includes("left")&&!facing.held.includes("right"));
  const busy=decide({...game,player:{...hunter,melee:{phase:"recovery"}}},3,memory);
  assert.ok(!busy.held.includes("left"),"facing only changes while the native melee is idle");
});
