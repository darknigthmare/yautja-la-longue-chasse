import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright-core';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';
import {homeworldNavigatorV66} from './homeworld-navigation-browser-v66.mjs';
import {campaignFixture,enterCampaignDeck} from './campaign-browser-helpers.mjs';

const url=process.env.V66_QA_URL??'http://localhost:4184';
const output=process.env.V66_NPC_QA_OUTPUT??'work-local/v66/qa/npc-missions';
await fs.mkdir(output,{recursive:true});
const api=homeworldQaModelV64(process.cwd(),['homeworldCity.ts','homeworldSpatialCodex.ts','homeworldInteriorsV64.ts','homeworldNpcMissionsV66.ts']);
const base=await campaignFixture();
const ash={expeditionId:'ash-marches',trueTrailInspected:true,falseTrailRejected:true,obstacleMoved:true,convoyRecovered:true,shortcutOpened:true,secretFound:false,ticks:7250};
const glass={expeditionId:'glass-desert',terrainSurveyed:true,transportLogRecovered:true,diversionCorroborated:true,safePassageOpened:true,crossingRoute:'stepping-stones',beaconDisposition:'preserve',secretFound:false,ticks:11200};
const room=api.homeworldInteriorForBuildingV64('clan-lodge'),socket=room.points.find(p=>p.pointId==='medbay-service');
const modelContext={autonomousHunter:true,interiorId:room.buildingId,pointId:socket.pointId,npcId:'clan-healer',actor:{x:socket.x,y:socket.y+45}};
const initial=api.defaultNpcMissionsV66();
const ashAccepted=api.applyNpcMissionsV66(initial,{kind:'accept',missionId:'return-paths-ash'},modelContext).state;
const ashReported=api.recordNpcMissionReportV66(ashAccepted,ash).state;
const ashDelivered=api.applyNpcMissionsV66(ashReported,{kind:'debrief',missionId:'return-paths-ash',answer:'shortcut-confirmed'},modelContext).state;
const glassAccepted=api.applyNpcMissionsV66(ashDelivered,{kind:'accept',missionId:'return-paths-glass'},modelContext).state;
const glassReported=api.recordNpcMissionReportV66(glassAccepted,glass).state;
const scenarios=[{id:'empty-acceptance',state:initial,missionId:'return-paths-ash',answer:null},
 {id:'ash-report-fixture',state:ashReported,missionId:'return-paths-ash',answer:'Un raccourci vers la navette a été ouvert et le retour effectué.'},
 {id:'glass-report-fixture',state:glassReported,missionId:'return-paths-glass',answer:'Les corniches rocheuses, en relevant le cairn.'}];
const browser=await chromium.launch({channel:'chrome',headless:true});let page;
const checks=[],captures=[],routes=[],errors=[],events=[];
try{
 for(const scenario of scenarios){
  assert(api.isNpcMissionsV66(scenario.state));const context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();
  page.on('pageerror',error=>errors.push({scenario:scenario.id,message:error.message}));
  page.on('console',message=>{if(/Fast Refresh|HMR|reload/i.test(message.text()))events.push({scenario:scenario.id,message:message.text()});});
  const fixture=structuredClone(base);fixture.save.homeworld.npcMissionsV66=scenario.state;
  await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));
   const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(window.__v66RefuseSave&&k===key)throw new DOMException('Isolated QA refusal','QuotaExceededError');return original.call(this,k,v);};
  },fixture);
  await enterCampaignDeck(page,{url});assert.equal(await page.locator('main[data-game-content-version]').getAttribute('data-game-content-version'),'V66');await page.getByRole('button',{name:'Yautja Prime · monde natal',exact:true}).click();
  await page.locator('[data-homeworld-actor]').waitFor({state:'attached'});
  // Public assets can finish after the actor anchor mounts. Do not freeze the
  // clock until the image decode handlers and the live frame loop have settled.
  await page.locator('[data-homeworld-hub] img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
  const nav=homeworldNavigatorV66(page,api);await nav.focus();const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),fixture.key);
  const panel=()=>page.locator('[data-npc-missions-v66]');
  const capture=async(suffix)=>{const target=path.join(output,scenario.id+'-'+suffix+'.jpg');await page.screenshot({path:target,type:'jpeg',quality:86});captures.push(target);};
  console.log('NPC '+scenario.id+' walking to clan-lodge');await nav.openPoint('medbay-service');await capture('offer');
  const before=await saved();
  if(scenario.answer){
   await panel().getByRole('button',{name:'Toutes les Marches sont désormais sans danger.',exact:true}).or(panel().getByRole('button',{name:'Le verre est devenu sans danger pour tous les voyageurs.',exact:true})).click({force:true});await nav.tick(96);
   assert.deepEqual((await saved()).homeworld.npcMissionsV66,before.homeworld.npcMissionsV66);await capture('wrong-answer');
  }
  const action=scenario.answer?panel().getByRole('button',{name:scenario.answer,exact:true}):panel().locator('[data-npc-mission-action="accept"]');
  await page.evaluate(()=>window.__v66RefuseSave=true);await action.click({force:true});await nav.tick(96);
  assert.deepEqual((await saved()).homeworld.npcMissionsV66,before.homeworld.npcMissionsV66);
  assert.match(await page.locator('[data-homeworld-hub]').getByRole('dialog').innerText(),/Écriture non confirmée/);
  await page.evaluate(()=>window.__v66RefuseSave=false);await action.click({force:true});await nav.tick(96);
  const finished=await saved();assert.equal(scenario.answer?finished.homeworld.npcMissionsV66[scenario.missionId==='return-paths-ash'?'ash':'glass'].delivered:finished.homeworld.npcMissionsV66.ash.accepted,true);
  for(const key of ['profile','inventory','trophies','justice','loadout','missionProgress'])assert.deepEqual(finished[key],before[key]);
  assert.deepEqual(finished.homeworld.sideStoryV66,before.homeworld.sideStoryV66);
  await page.setViewportSize({width:393,height:852});await nav.tick(100);await capture('mobile-confirmed');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  routes.push({scenario:scenario.id,records:nav.routes});
  await page.clock.resume();await page.reload({waitUntil:'networkidle'});
  assert.deepEqual((await saved()).homeworld.npcMissionsV66,finished.homeworld.npcMissionsV66);
  checks.push({scenario:scenario.id,status:'PASS',reportProvenance:scenario.answer?'Explicit valid report fixture; expedition NOT played by this recipe':'Empty request, accepted in actual UI',
   verifies:['walked city route and real door','walked giver proximity','wrong deduction refused if report present','quota refusal and retry','persistent acceptance or debrief','reload','no material reward or side-story mutation','mobile overflow']});
  await context.close();
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify({status:'PASS',url,checks,captures,routes,errors,events,
  scope:'NPC conversation and physical return QA. Two return scenarios use declared proof fixtures, not completed browser expeditions.',visualReview:'pending'},null,2));
 console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,output}));
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:path.join(output,'failure.jpg'),type:'jpeg',quality:86}).catch(()=>{});
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify({status:'FAIL',url,error:error.stack,checks,captures,routes,errors,events},null,2));throw error;
}finally{await browser.close();}
