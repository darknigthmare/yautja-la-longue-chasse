/** Explicit model-prepared inspection fixture. These are actual core-engine
 * contacts and victories against passive test partners, never browser wins or
 * source-NPC campaign completion. The browser report must retain this label. */
import assert from 'node:assert/strict';
export function createPitInspectionFixtureV108(api,fighterId,owner){
 let run=api.createPitWorkbookCampaignRunV108(fighterId,owner,'declared-model-inspection-'+fighterId);
 const evidence=[];
 run=api.beginPitWorkbookCampaignStageV108(run);let field=api.createPitWorkbookCampaignFieldV108(run);
 for(let frame=0;frame<800&&!field.complete;frame++){const x=field.combat.fighters[0].x;field=api.stepPitWorkbookCampaignFieldV108(field,{right:x<595,left:x>605,interact:true});}
 assert(field.complete);run=api.advancePitWorkbookCampaignV108(api.applyPitWorkbookCampaignFieldV108(run,field));
 for(let stage=1;stage<=2;stage++){
  run=api.beginPitWorkbookCampaignStageV108(run);const encounter=api.getPitWorkbookCampaignEncounterV108(run);
  let combat=api.preparePitWorkbookCampaignCombatV108(api.createPitCombatState(encounter.leftId,encounter.rightId,{arenaId:encounter.arenaId,normalMoves:encounter.normalMoves}),encounter.workbookCarryV108);
  let contacts=0,releases=0;
  const tick=(left={},right={})=>{combat=api.stepPitCombat(combat,[left,right]);run=api.observePitWorkbookCampaignCombatV108(run,combat);contacts+=combat.events.filter(event=>event.type==='hit').length;releases+=combat.events.filter(event=>event.type==='workbook-device-v107'&&event.fighterId===fighterId&&['placed','launched'].includes(event.event)).length;};
  const walk=distance=>{for(let frame=0;frame<700&&Math.abs(Math.abs(combat.fighters[1].x-combat.fighters[0].x)-distance)>5;frame++){const delta=combat.fighters[1].x-combat.fighters[0].x;tick({right:Math.abs(delta)>distance?delta>0:delta<0,left:Math.abs(delta)>distance?delta<0:delta>0});}};
  if(stage===1){
   walk(50);tick({},{attack:'light'});for(let frame=0;frame<60;frame++)tick();assert(combat.fighters[0].health<api.PIT_FIGHTERS[fighterId].maxHealth);
   walk(220);const cost=fighterId==='scar'?250:350;for(let frame=0;frame<4200&&combat.fighters[0].traque<cost;frame++)tick();assert(combat.fighters[0].traque>=cost);
   tick({workbookAction:fighterId==='scar'?'shuriken':'mine'});for(let frame=0;frame<180;frame++)tick();assert.equal(releases,1);
  }
  for(let frame=0;frame<14000&&combat.phase!=='match-over';frame++){const hero=combat.fighters[0],other=combat.fighters[1],delta=other.x-hero.x;tick(hero.phase==='idle'&&!hero.action?(Math.abs(delta)>80?{right:delta>0,left:delta<0}:{attack:'heavy'}):{});}
  assert.equal(combat.matchWinnerId,fighterId);assert(contacts>8);const result={mode:'cpu',leftId:encounter.leftId,rightId:encounter.rightId,arenaId:encounter.arenaId,winnerId:combat.matchWinnerId,resultId:encounter.id+':model-earned-result'};
  const applied=api.applyPitWorkbookCampaignResultV108(run,result,encounter.id);assert(applied.applied);assert.equal(applied.run.phase,'stage-result');
  evidence.push({stageIndex:stage,encounterId:encounter.id,frame:combat.frame,contacts,releases,result,carry:applied.run.continuityV108.carry});run=api.advancePitWorkbookCampaignV108(applied.run);
 }
 assert.equal(run.stageIndex,3);assert.equal(run.phase,'briefing');assert.equal(run.continuityV108.carry.device.status,'spent');assert.equal(run.continuityV108.inspected,null);
 return {text:api.serializePitWorkbookCampaignV108(run),run,evidence,kind:'model-prepared-inspection-only',description:'Prepared by actual V15 engine contacts and victories against passive model-test partners. Seeded only into a fresh isolated browser context to inspect native EQUIP. These are not browser-earned wins, source NPCs or a fully browser-played route.'};
}
