import test,{after} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';import {build} from 'esbuild';
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'pit-v108-campaign-'));after(()=>fs.rm(directory,{recursive:true,force:true}));await build({stdin:{contents:["export * from './app/game/systems/pitWorkbookCampaignV108';","export * from './app/game/systems/pitCombat';","export * from './app/game/systems/pitWorkbookMovesV105';","export * from './app/game/pitWorkbookEquipmentInspectionV108';"].join('\n'),resolveDir:process.cwd()},bundle:true,outfile:path.join(directory,'campaign.mjs'),platform:'node',format:'esm',logLevel:'silent'});const p=await import(pathToFileURL(path.join(directory,'campaign.mjs')));const clone=x=>JSON.parse(JSON.stringify(x));
const owner='2026-10-23-profile';
const applyResult=(run,result,observedEncounterId=p.getPitWorkbookCampaignEncounterV108(run)?.id??'')=>p.applyPitWorkbookCampaignResultV108(run,result,observedEncounterId);
function start(id='scar'){return p.createPitWorkbookCampaignRunV108(id,owner,'route-'+id);}
function fieldDone(run){let field=p.createPitWorkbookCampaignFieldV108(run);for(let tick=0;tick<600&&!field.complete;tick++){const x=field.combat.fighters[0].x,target=field.goal==='face-off'?field.targetX-100:field.targetX;field=p.stepPitWorkbookCampaignFieldV108(field,{right:x<target-5,left:x>target+5,interact:true,guard:field.goal==='face-off'&&Math.abs(x-target)<10});}assert.ok(field.complete,field.goal);return field;}
function actualWin(initialRun,release=false){let run=initialRun;const e=p.getPitWorkbookCampaignEncounterV108(run);assert.ok(e);let combat=p.preparePitWorkbookCampaignCombatV108(p.createPitCombatState(e.leftId,e.rightId,{normalMoves:e.normalMoves,arenaId:e.arenaId}),e.workbookCarryV108);const hitFrames=[];
 const tick=(left={},right={})=>{combat=p.stepPitCombat(combat,[left,right]);run=p.observePitWorkbookCampaignCombatV108(run,combat);hitFrames.push(...combat.events.filter(event=>event.type==='hit'));};
 const gap=distance=>{for(let n=0;n<500&&Math.abs(Math.abs(combat.fighters[1].x-combat.fighters[0].x)-distance)>5;n++){const delta=combat.fighters[1].x-combat.fighters[0].x;tick({right:Math.abs(delta)>distance?delta>0:delta<0,left:Math.abs(delta)>distance?delta<0:delta>0});}};
 if(release){gap(50);tick({},{attack:'light'});for(let n=0;n<60;n++)tick();assert.ok(combat.fighters[0].health<p.PIT_FIGHTERS[run.fighterId].maxHealth,'the carried injury comes from a real enemy contact');gap(220);const cost=run.fighterId==='scar'?250:350;for(let n=0;n<4200&&combat.fighters[0].traque<cost;n++)tick();assert.ok(combat.fighters[0].traque>=cost);tick({workbookAction:run.fighterId==='scar'?'shuriken':'mine'});for(let n=0;n<180;n++)tick();assert.equal(run.continuityV108.observation.released,true);}
 if(run.stageIndex===5){for(let count=0;count<3;count++){gap(220);const cost=run.fighterId==='scar'?100:150;for(let n=0;n<2400&&combat.fighters[0].traque<cost;n++)tick();assert.ok(combat.fighters[0].traque>=cost,'gauge earned through actual neutral pressure');gap(90);
  const action=run.fighterId==='scar'?'counter':'shield';tick({workbookAction:action},run.fighterId==='scar'?{attack:'light'}:{});for(let frame=1;frame<65;frame++)tick({},run.fighterId==='feral-hunter'&&frame===4?{attack:'light'}:{});assert.equal(run.counters,count+1,run.fighterId+' actual source counter');}}
 for(let n=0;n<14000&&combat.phase!=='match-over';n++){const actor=combat.fighters[0],enemy=combat.fighters[1];let input={};if(combat.phase==='round'&&actor.phase==='idle'&&!actor.action){const d=enemy.x-actor.x;input=Math.abs(d)>80?{right:d>0,left:d<0}:{attack:'heavy'};}tick(input);}
 assert.equal(combat.phase,'match-over');assert.equal(combat.matchWinnerId,run.fighterId);assert.ok(hitFrames.length>8);const result={mode:'cpu',leftId:e.leftId,rightId:e.rightId,arenaId:e.arenaId,winnerId:combat.matchWinnerId,resultId:e.id+':earned-result'};return {run,result,combat};}

test('both heroes keep the same physically released device spent across two real decisive duels and reload',()=>{
 for(const fighter of ['feral-hunter','scar']){
  let run=p.beginPitWorkbookCampaignStageV108(start(fighter));run=p.applyPitWorkbookCampaignFieldV108(run,fieldDone(run));run=p.beginPitWorkbookCampaignStageV108(p.advancePitWorkbookCampaignV108(run));
  const first=actualWin(run,true),applied=applyResult(first.run,first.result);assert.equal(applied.applied,true);run=applied.run;
  assert.equal(first.combat.round,1);assert.equal(run.continuityV108.carry.health,first.combat.fighters[0].health);assert.equal(run.continuityV108.carry.traque,first.combat.fighters[0].traque);assert.equal(run.continuityV108.carry.device.status,'spent');
  assert.deepEqual(p.deserializePitWorkbookCampaignV108(p.serializePitWorkbookCampaignV108(run),owner),run);
  run=p.beginPitWorkbookCampaignStageV108(p.advancePitWorkbookCampaignV108(run));const encounter=p.getPitWorkbookCampaignEncounterV108(run),combat=p.preparePitWorkbookCampaignCombatV108(p.createPitCombatState(encounter.leftId,encounter.rightId,{arenaId:encounter.arenaId,normalMoves:encounter.normalMoves}),encounter.workbookCarryV108);
  assert.equal(combat.fighters[0].workbookDeviceV107.status,'spent');assert.equal(combat.fighters[0].health,run.continuityV108.carry.health);assert.equal(combat.fighters[0].traque,run.continuityV108.carry.traque);
  const denied=p.stepPitCombat(combat,[{workbookAction:fighter==='scar'?'shuriken':'mine'},{}]);assert.equal(denied.fighters[0].action,null,'spent device cannot be requested in next duel');
  const second=actualWin(run);run=applyResult(second.run,second.result).run;assert.equal(run.continuityV108.carry.device.id,first.run.continuityV108.carry.device.id);assert.equal(run.continuityV108.carry.device.status,'spent');assert.equal(run.continuityV108.victories.length,2);
  assert.deepEqual(p.deserializePitWorkbookCampaignV108(p.serializePitWorkbookCampaignV108(run),owner),run);
 }
});
test('an unused object survives V107 round cleanup and an observed defeat retries with the entry kit',()=>{
 let run=p.beginPitWorkbookCampaignStageV108(start());run=p.applyPitWorkbookCampaignFieldV108(run,fieldDone(run));run=p.beginPitWorkbookCampaignStageV108(p.advancePitWorkbookCampaignV108(run));
 const first=actualWin(run);run=applyResult(first.run,first.result).run;assert.equal(first.combat.fighters[0].workbookDeviceV107.status,'spent','engine cleanup is not ownership evidence');assert.equal(run.continuityV108.carry.device.status,'ready');
 run=p.beginPitWorkbookCampaignStageV108(p.advancePitWorkbookCampaignV108(run));const entry=clone(run.continuityV108.carry),e=p.getPitWorkbookCampaignEncounterV108(run);let combat=p.preparePitWorkbookCampaignCombatV108(p.createPitCombatState(e.leftId,e.rightId,{arenaId:e.arenaId,normalMoves:e.normalMoves}),entry);
 for(let n=0;n<15000&&combat.phase!=='match-over';n++){const actor=combat.fighters[1],hero=combat.fighters[0],d=hero.x-actor.x,input=actor.phase==='idle'&&!actor.action?(Math.abs(d)>80?{right:d>0,left:d<0}:{attack:'heavy'}):{};combat=p.stepPitCombat(combat,[{},input]);run=p.observePitWorkbookCampaignCombatV108(run,combat);}
 assert.equal(combat.matchWinnerId,e.rightId);const result={mode:'cpu',leftId:e.leftId,rightId:e.rightId,arenaId:e.arenaId,winnerId:e.rightId,resultId:e.id+':real-defeat'};run=applyResult(run,result).run;assert.equal(run.phase,'retry');assert.deepEqual(run.continuityV108.carry,entry);
 const restored=p.deserializePitWorkbookCampaignV108(p.serializePitWorkbookCampaignV108(run),owner);assert.deepEqual(restored,run);assert.deepEqual(p.beginPitWorkbookCampaignStageV108(restored).continuityV108.carry,entry);
});
test('native equipment inspection has six unchanged drawings and40ticks in each facing, without replenishing the kit',()=>{
 for(const fighter of ['feral-hunter','scar']){
  const definition=p.PIT_WORKBOOK_EQUIPMENT_INSPECTION_REGISTRY_V108.find(entry=>entry.fighterId===fighter);assert.ok(definition);
  for(const facing of ['left','right']){const clip=definition.atlas.clips.find(entry=>entry.facing===facing);assert.equal(clip.frames.length,6);assert.equal(clip.frames.reduce((n,frame)=>n+frame.durationTicks,0),40);assert.equal(clip.loop,false);}
  let run=start(fighter);for(let stage=0;stage<3;stage++){run=p.beginPitWorkbookCampaignStageV108(run);if(run.phase==='field')run=p.applyPitWorkbookCampaignFieldV108(run,fieldDone(run));else{const actual=actualWin(run,stage===1);run=applyResult(actual.run,actual.result).run;}run=p.advancePitWorkbookCampaignV108(run);}
  const carry=clone(run.continuityV108.carry);run=p.beginPitWorkbookCampaignStageV108(run);let field=p.createPitWorkbookCampaignFieldV108(run);
  for(let n=0;n<20;n++)field=p.stepPitWorkbookCampaignFieldV108(field,{right:true,interact:true});assert.equal(field.holdTicks,0);
  field=fieldDone(run);run=p.applyPitWorkbookCampaignFieldV108(run,field);assert.deepEqual(run.continuityV108.carry,carry);assert.equal(run.continuityV108.inspected.nativeTicks,40);assert.equal(run.continuityV108.inspected.actionId,fighter==='scar'?'M_F003_EQUIP':'M_F006_EQUIP');assert.deepEqual(p.deserializePitWorkbookCampaignV108(p.serializePitWorkbookCampaignV108(run),owner),run);
 }
});
test('a result without its observed terminal frame, foreign kit IDs, gauge overflow and resurrection are refused',()=>{
 let run=p.beginPitWorkbookCampaignStageV108(start());run=p.applyPitWorkbookCampaignFieldV108(run,fieldDone(run));run=p.beginPitWorkbookCampaignStageV108(p.advancePitWorkbookCampaignV108(run));const e=p.getPitWorkbookCampaignEncounterV108(run),result={mode:'cpu',leftId:e.leftId,rightId:e.rightId,arenaId:e.arenaId,winnerId:e.leftId,resultId:'invented'};assert.equal(applyResult(run,result).applied,false);
 const actual=actualWin(run,true);run=applyResult(actual.run,actual.result).run;
 for(const change of [r=>r.continuityV108.carry.device.id='other-kit',r=>r.continuityV108.carry.traque=1001,r=>r.continuityV108.carry.device.status='ready',r=>r.continuityV108.victories=[],r=>r.continuityV108.victories=[null]]){const invalid=clone(run);change(invalid);assert.equal(p.deserializePitWorkbookCampaignV108(JSON.stringify(invalid),owner),null);}
 assert.equal(p.deserializePitWorkbookCampaignV108(p.serializePitWorkbookCampaignV108(run),'other-owner'),null);
});
test('both full alternative routes earn three real counters and preserve all four victory carries',()=>{
 for(const fighter of ['feral-hunter','scar']){
  let run=start(fighter);
  for(let stage=0;stage<8;stage++){
   run=p.beginPitWorkbookCampaignStageV108(run);
   if(run.phase==='field'){const field=fieldDone(run);if(stage===3){assert.equal(field.inspectionV108.nativeTicks,40);const fake=clone(field);fake.inspectionV108.nativeTicks=39;assert.equal(p.applyPitWorkbookCampaignFieldV108(run,fake),run);}run=p.applyPitWorkbookCampaignFieldV108(run,field);}
   else{const actual=actualWin(run,stage===1);run=applyResult(actual.run,actual.result).run;}
   assert.equal(run.phase,'stage-result',fighter+' stage'+stage);assert.deepEqual(p.deserializePitWorkbookCampaignV108(p.serializePitWorkbookCampaignV108(run),owner),run);run=p.advancePitWorkbookCampaignV108(run);
  }
  assert.equal(run.phase,'complete');assert.equal(run.continuityV108.victories.length,4);assert.equal(run.receipts.filter(receipt=>receipt.counterEvidence).length,3);assert.equal(run.continuityV108.carry.device.status,'spent');assert.equal(run.objects.beacon.state,'secured');
 }
});
test('voluntary replay rescinds the latest victory and later field progress, restoring only its real entry kit',()=>{
 for(const fighter of ['feral-hunter','scar']){
  let run=start(fighter);for(let stage=0;stage<4;stage++){run=p.beginPitWorkbookCampaignStageV108(run);if(run.phase==='field')run=p.applyPitWorkbookCampaignFieldV108(run,fieldDone(run));else{const actual=actualWin(run,true);run=applyResult(actual.run,actual.result).run;}if(stage<3)run=p.advancePitWorkbookCampaignV108(run);}
  assert.equal(run.continuityV108.victories.length,2);const entry=clone(run.continuityV108.victories[0].carry),last=clone(run.continuityV108.victories[1]),oldAttempt=run.attempt;
  run=p.replayPitWorkbookCampaignVictoryV108(run);assert.equal(run.stageIndex,2);assert.equal(run.phase,'briefing');assert.deepEqual(run.completedStages,[0,1]);assert.deepEqual(run.continuityV108.carry,entry);assert.equal(run.continuityV108.inspected,null);assert.equal(run.continuityV108.victories.length,1);assert.equal(run.receipts.some(receipt=>receipt.stageIndex>=2),false);assert.equal(run.continuityV108.replays.at(-1).discardedResultId,last.resultId);assert.deepEqual(p.deserializePitWorkbookCampaignV108(p.serializePitWorkbookCampaignV108(run),owner),run);
  const active=p.beginPitWorkbookCampaignStageV108(run),e=p.getPitWorkbookCampaignEncounterV108(active);assert.equal(active.attempt,oldAttempt+1);assert.ok(e.id.endsWith('attempt-'+active.attempt));assert.equal(active.counters,0);assert.equal(active.shieldBlock,null);assert.equal(p.applyPitWorkbookCampaignResultV108(active,{mode:'cpu',leftId:e.leftId,rightId:e.rightId,arenaId:e.arenaId,winnerId:e.leftId,resultId:last.resultId},last.resultId.replace(':earned-result','')).applied,false);
  assert.equal(p.replayPitWorkbookCampaignVictoryV108(active),active,'no rollback during a live duel');
 }
});
test('replaying the first victory restores its existing ready device but removes the victory before it can be used again',()=>{
 let run=p.beginPitWorkbookCampaignStageV108(start());run=p.applyPitWorkbookCampaignFieldV108(run,fieldDone(run));run=p.beginPitWorkbookCampaignStageV108(p.advancePitWorkbookCampaignV108(run));const initial=clone(run.continuityV108.carry),actual=actualWin(run,true);run=applyResult(actual.run,actual.result).run;assert.equal(run.continuityV108.carry.device.status,'spent');run=p.replayPitWorkbookCampaignVictoryV108(run);assert.deepEqual(run.continuityV108.carry,initial);assert.equal(run.continuityV108.victories.length,0);assert.deepEqual(run.completedStages,[0]);assert.equal(run.receipts.some(receipt=>receipt.kind==='victory'),false);assert.deepEqual(p.deserializePitWorkbookCampaignV108(p.serializePitWorkbookCampaignV108(run),owner),run);const closed={...run,objects:{...run.objects,beacon:{...run.objects.beacon,state:'secured'}},phase:'complete'};assert.equal(p.replayPitWorkbookCampaignVictoryV108(closed),closed);
});
test('replaying the passage removes its counter proofs while replaying the rival preserves all three earned passage counters',()=>{
 for(const target of [5,6]){
  let run=start();for(let stage=0;stage<=target;stage++){run=p.beginPitWorkbookCampaignStageV108(run);if(run.phase==='field')run=p.applyPitWorkbookCampaignFieldV108(run,fieldDone(run));else{const actual=actualWin(run);run=applyResult(actual.run,actual.result).run;}if(stage<target)run=p.advancePitWorkbookCampaignV108(run);}
  const beacon=clone(run.objects.beacon),proofs=clone(run.receipts.filter(receipt=>receipt.counterEvidence));assert.equal(proofs.length,3);run=p.replayPitWorkbookCampaignVictoryV108(run);assert.equal(run.stageIndex,target);assert.equal(run.counters,target===6?3:0);assert.equal(run.shieldBlock,null);assert.deepEqual(run.objects.beacon,beacon);assert.equal(run.continuityV108.inspected.nativeTicks,40);
  if(target===5)assert.equal(run.receipts.some(receipt=>receipt.counterEvidence),false);else assert.deepEqual(run.receipts.filter(receipt=>receipt.counterEvidence),proofs);
  assert.deepEqual(p.deserializePitWorkbookCampaignV108(p.serializePitWorkbookCampaignV108(run),owner),run);
  run=p.beginPitWorkbookCampaignStageV108(run);assert.equal(run.counters,target===6?3:0);assert.equal(run.receipts.filter(receipt=>receipt.counterEvidence).length,target===6?3:0);assert.deepEqual(p.deserializePitWorkbookCampaignV108(p.serializePitWorkbookCampaignV108(run),owner),p.checkpointPitWorkbookCampaignV108(run));
 }
});

