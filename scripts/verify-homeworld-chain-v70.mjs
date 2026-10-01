import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright-core';
import {campaignFixture,enterCampaignDeck} from './campaign-browser-helpers.mjs';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';
import {homeworldNavigatorV66} from './homeworld-navigation-browser-v66.mjs';
import {homeworldContractRegionNavigatorV70} from './homeworld-region-contract-actions-v70.mjs';
import {writeHomeworldContractStorageCheckpointV70} from './homeworld-contract-storage-checkpoint-v70.mjs';

const url=process.env.V70_QA_URL??'http://127.0.0.1:4188';
const output=process.env.V70_CHAIN_QA_OUTPUT??'work-local/v70/qa/contracts';
const api=homeworldQaModelV64(process.cwd(),['homeworld.ts','homeworldCity.ts','homeworldSpatialCodex.ts','homeworldInteriorsV64.ts','homeworldRegionsV68.ts','homeworldContractsV68.ts','homeworldContractNarrativeV70.ts','homeworldPassageV67.ts','homeworldExpedition.ts','glassDesert.ts']);
const chainIds=process.env.V70_CONTRACT_CHAIN?[process.env.V70_CONTRACT_CHAIN]:['return-line','hunter-measure'];
const chapterLimit=process.env.V70_CONTRACT_CHAPTER_LIMIT??'4';
assert(['1','4'].includes(chapterLimit),'V70_CONTRACT_CHAPTER_LIMIT must be exactly 1 or 4');
assert(chainIds.every(id=>['return-line','hunter-measure'].includes(id)));await fs.mkdir(output,{recursive:true});

async function playChain(chainId){
 const folder=path.join(output,chainId);await fs.mkdir(folder,{recursive:true});
 const fixture=await campaignFixture(),browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
 const checks=[],captures=[],errors=[],network=[],regionRoutes=[],cityRoutes=[],sensitivePrerequisites=[];
 const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),fixture.key);
 const snapshot=async()=>{const save=await saved();await fs.writeFile(path.join(folder,'storage-snapshot.json'),JSON.stringify({key:fixture.key,save,url,chainId,
  provenance:'Exact SaveGame read from this isolated played browser campaign, never reconstructed from a report. The separate storage-full-snapshot.json retains every localStorage key.',capturedAt:new Date().toISOString()},null,2));
  await writeHomeworldContractStorageCheckpointV70(page,{folder,saveKey:fixture.key,chainId,url});};
 const capture=async name=>{const file=path.join(folder,name+'.jpg');await page.screenshot({path:file,type:'jpeg',quality:88});captures.push(file);};
 page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)network.push({status:response.status(),url:response.url()});});
 try{
  await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));const original=Storage.prototype.setItem;
   Storage.prototype.setItem=function(name,value){if(window.__contractRefuseSaveV70&&name===key)throw new DOMException('Isolated QA quota refusal','QuotaExceededError');return original.call(this,name,value);};},fixture);
  await enterCampaignDeck(page,{url});assert.equal(await page.locator('main[data-game-content-version]').getAttribute('data-game-content-version'),'V70');
  await page.getByRole('button',{name:'Yautja Prime · monde natal',exact:true}).click();await page.locator('[data-homeworld-actor]').waitFor({state:'attached'});
  await page.locator('[data-homeworld-hub] img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
  const city=homeworldNavigatorV66(page,api),baseline=await saved();let marks=0;
  const readNarrative=async card=>{const voice=card.locator('[data-contract-narrative-v70]'),skip=voice.getByRole('button',{name:'Lire immédiatement',exact:true});
   if(await skip.isVisible())await skip.click();await city.tick(2800);
   assert.equal(await voice.locator('[data-yautja-translation-v67]').getAttribute('data-translation-complete'),'true','The chapter voice must be readable');
   await voice.scrollIntoViewIfNeeded();};
  assert.equal(api.normalizeHomeworldContractsV68(baseline.homeworld.contractsV68).entries.length,0,'The isolated fixture must not contain accepted or completed contracts');
  assert.equal(baseline.homeworld.expeditions['glass-desert'],null,'Reserve access must come from the glass journey actually played in this circuit');
  const completeDefinitions=api.HOMEWORLD_CHAIN_CONTRACTS_V69.filter(d=>d.chain.id===chainId);assert.equal(completeDefinitions.length,4);
  const definitions=completeDefinitions.slice(0,Number(chapterLimit));
  for(const [chapter,d] of definitions.entries()){
   if(d.id==='v69-measure-3'){
    const before=await saved(),{homeworldSensitiveExpeditionsV70}=await import('./homeworld-sensitive-expeditions-v70.mjs');
    const sensitive=homeworldSensitiveExpeditionsV70(page,api,{city,saveKey:fixture.key,controlledClock:true,capture,checkpoint:async name=>writeHomeworldContractStorageCheckpointV70(page,{folder,saveKey:fixture.key,chainId,url,checkpoint:name})});
    await sensitive.ensureReserveAccess();const after=await saved();
    assert(after.homeworld.expeditions['ash-marches']&&after.homeworld.expeditions['glass-desert'],'The two sensitive investigations must be actually reported before the Reserve');
    assert.deepEqual(after.homeworld.contractsV68,before.homeworld.contractsV68,'Separate investigations cannot credit a contract action');
    assert.equal(after.profile.clanMarks,baseline.profile.clanMarks+marks);
    sensitivePrerequisites.push({status:'PASS',physicalKeyboardRoute:true,ash:after.homeworld.expeditions['ash-marches'],glass:after.homeworld.expeditions['glass-desert'],routes:sensitive.routes});
    await snapshot();
   }
   await city.focus();await city.openPoint(d.pointId);const card=page.locator(`[data-contract-id="${d.id}"]`);
   if(d.giverNpcId==='market-artisan')await page.locator('[data-contracts-v68]').getByRole('combobox').first().selectOption('chain');
   assert.equal(await card.getAttribute('data-contract-phase'),'offer');assert.equal(await card.locator('[data-contract-narrative-v70]').getAttribute('data-contract-narrative-v70'),'briefing');
   if(chapter===0){const before=await saved();await page.evaluate(()=>{window.__contractRefuseSaveV70=true;});await card.locator('[data-contract-action="accept"]').click();await city.tick(96);
    assert.deepEqual((await saved()).homeworld.contractsV68,before.homeworld.contractsV68);await page.evaluate(()=>{window.__contractRefuseSaveV70=false;});}
   await card.locator('[data-contract-action="accept"]').click();await city.tick(96);const accepted=await saved(),entry=accepted.homeworld.contractsV68.entries.find(e=>e.id===d.id);
   assert.equal(entry.status,'active');assert(entry.stages.every(s=>!s.runId&&!s.proof&&s.reportTick===null));assert.equal(accepted.profile.clanMarks,baseline.profile.clanMarks+marks);
   await readNarrative(card);await capture(`${chapter+1}-briefing`);await city.exitRoom();
   for(const [stageIndex,o] of d.objectives.entries()){
    await city.focus();const gate=api.HOMEWORLD_POINTS.find(p=>p.id===`region-${o.regionId}`),route=api.homeworldSpatialRoute(await city.position(),{x:gate.x,y:gate.y+42});
    assert.equal(route.status,'reachable');await city.follow(route.points);assert.equal(api.nearestHomeworldPoint(await city.position())?.id,gate.id);
    await page.keyboard.press('KeyE');await city.tick(96);await page.locator('[data-homeworld-hub]').getByRole('dialog').getByRole('button',{name:'Suivre le sentier vers le village',exact:true}).click();
    const scene=page.locator(`section[data-homeworld-region-v68="${o.regionId}"]`);await scene.waitFor({state:'visible'});
    const region=homeworldContractRegionNavigatorV70(page,api,{controlledClock:true});await region.resume();await region.walkOutbound();await region.perform(o.action);
    const performed=await saved(),stage=performed.homeworld.contractsV68.entries.find(e=>e.id===d.id).stages[stageIndex];
    assert(stage.proof,`${d.id}/${o.regionId}: performed action must be durably credited`);assert.equal(stage.proof.action,o.action);assert.equal(stage.reportTick,null);
    assert.equal(performed.profile.clanMarks,baseline.profile.clanMarks+marks);assert.equal(api.contractChapterNarrativeV70(performed.homeworld.contractsV68,d.id).phase,'guide');
    if(stageIndex+1<d.objectives.length)assert.equal(performed.homeworld.contractsV68.entries.find(e=>e.id===d.id).stages[stageIndex+1].runId,null);
    await capture(`${chapter+1}-${stageIndex+1}-${o.regionId}-${o.action}`);await region.reportToGuide();const reported=await saved();
    const confirmation=reported.homeworld.contractsV68.entries.find(e=>e.id===d.id).stages[stageIndex];assert(confirmation.reportTick>confirmation.proof.tick);
    const next=completeDefinitions[chapter+1];if(next)assert(!api.contractRequirementsV69(reported.homeworld.contractsV68,next.id).met);
    await capture(`${chapter+1}-${stageIndex+1}-${o.regionId}-guide`);await region.walkReturn();await scene.waitFor({state:'hidden'});await city.tick(96);assert.equal((await saved()).homeworldRegionV68,null);
    regionRoutes.push(...region.routes);checks.push({chapter:d.id,regionId:o.regionId,action:o.action,status:'PASS',proof:stage.proof,reportTick:confirmation.reportTick,physicalKeyboardRoute:true});
    await fs.writeFile(path.join(folder,'progress.json'),JSON.stringify({url,chainId,checks,captures,marks,scope:'Live partial progress; not a final PASS report.'},null,2));
    await snapshot();
   }
   await city.focus();await city.openPoint(d.pointId);if(d.giverNpcId==='market-artisan')await page.locator('[data-contracts-v68]').getByRole('combobox').first().selectOption('chain');
   assert.equal(await card.getAttribute('data-contract-phase'),'return');assert.equal(await card.locator('[data-contract-narrative-v70]').getAttribute('data-contract-narrative-v70'),'delivery');
   const ready=await saved();if(chapter===0){await page.evaluate(()=>{window.__contractRefuseSaveV70=true;});await card.locator('[data-contract-action="deliver"]').click();await city.tick(96);
    assert.deepEqual((await saved()).homeworld.contractsV68,ready.homeworld.contractsV68);assert.equal((await saved()).profile.clanMarks,baseline.profile.clanMarks+marks);await page.evaluate(()=>{window.__contractRefuseSaveV70=false;});}
   await card.locator('[data-contract-action="deliver"]').click();await city.tick(96);marks+=d.rewardMarks;const delivered=await saved();
   assert.equal(delivered.profile.clanMarks,baseline.profile.clanMarks+marks);assert.equal(api.contractMarksV68(delivered.homeworld.contractsV68),marks);
   assert.equal(delivered.homeworld.contractsV68.entries.find(e=>e.id===d.id).status,'completed');assert.equal(await card.locator('[data-contract-action="deliver"]').count(),0);
   assert.equal(await card.locator('[data-contract-narrative-v70]').getAttribute('data-contract-narrative-v70'),'thanks');await readNarrative(card);await capture(`${chapter+1}-thanks`);
   await page.setViewportSize({width:393,height:852});await city.tick(96);await card.locator('[data-contract-narrative-v70]').scrollIntoViewIfNeeded();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await capture(`${chapter+1}-mobile-thanks`);await page.setViewportSize({width:1440,height:1000});await city.tick(96);
   for(const key of ['inventory','trophies','missionProgress','justice','loadout'])assert.deepEqual(delivered[key],baseline[key]);for(const key of ['rankId','honor'])assert.equal(delivered.profile[key],baseline.profile[key]);
   checks.push({chapter:d.id,status:'PASS',delivery:true,rewardMarks:d.rewardMarks,wallet:marks,mobile:true,thanks:true,readableNarrative:true,noUnrelatedGrants:true});await snapshot();await city.exitRoom();
  }
  const final=await saved();await page.clock.resume();await page.reload({waitUntil:'networkidle'});assert.deepEqual((await saved()).homeworld.contractsV68,final.homeworld.contractsV68);assert.equal((await saved()).profile.clanMarks,baseline.profile.clanMarks+marks);
  assert.deepEqual(errors,[]);assert.deepEqual(network,[]);cityRoutes.push(...city.routes);
  const report={status:'PASS',url,chainId,checks,captures,cityRoutes,regionRoutes,sensitivePrerequisites,errors,network,walletDelta:marks,actions:definitions.flatMap(d=>d.objectives).length,
   fixture:'Independent isolated legacy campaign with no accepted contract/proof. Every played chapter is accepted and delivered at its real giver; every excursion is public walking and actual gameplay. No completed prerequisite, coordinate or receipt is injected.',chapterLimit:Number(chapterLimit),chapters:definitions.length,totalChaptersInCircuit:4,
   limits:Number(chapterLimit)===1?'Only the first chapter of this circuit is played here. The other three chapters are not claimed as browser-played by this report.':'All four chapters of this circuit are played here; this remains an isolated legacy campaign, not a full new-player campaign playthrough.',visualReview:'pending'};
  await fs.writeFile(path.join(folder,'report.json'),JSON.stringify(report,null,2));return report;
 }catch(error){await snapshot().catch(snapshotError=>errors.push(`Snapshot failed: ${snapshotError.message}`));await page.screenshot({path:path.join(folder,'failure.jpg'),type:'jpeg',quality:88}).catch(()=>{});
  await fs.writeFile(path.join(folder,'report.json'),JSON.stringify({status:'FAIL',url,chainId,error:error.stack,checks,captures,errors,network},null,2));throw error;
 }finally{await browser.close();}
}
const results=await Promise.allSettled(chainIds.map(playChain));
const reports=results.map((r,index)=>r.status==='fulfilled'?r.value:{status:'FAIL',chainId:chainIds[index],error:String(r.reason)});
const summary={status:results.every(r=>r.status==='fulfilled')?'PASS':'FAIL',url,reports,chapterLimit:Number(chapterLimit),chaptersPlayed:reports.reduce((n,r)=>n+(r.chapters??0),0),totalAvailableChapters:8,
 limits:Number(chapterLimit)===1?'Public verification is deliberately bounded to chapter 1 in each selected circuit. No complete eight-chapter public playthrough is claimed.':'Complete local verification of the selected circuits; unselected circuits are not claimed as played by this report.',
 scope:'Each circuit is played in its own independent campaign; cumulative deltas are not a claim that both wallets belong to one campaign.',visualReview:'pending'};
await fs.writeFile(path.join(output,'report.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({status:summary.status,chapters:reports.reduce((n,r)=>n+(r.chapters??0),0),actions:reports.reduce((n,r)=>n+(r.actions??0),0),output}));
if(summary.status!=='PASS')process.exitCode=1;
