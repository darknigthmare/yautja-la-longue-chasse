import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {homeworldSceneSsrV78} from '../tests/helpers/homeworld-scene-ssr-v78.mjs';
import {qaContractV80,snapshotSourcesV80,requireVersionV80,hardErrorsV80,outputWithinQaV80,hashV80} from './public-qa-contract-v80.mjs';
const base=process.env.V80_QA_BASE||'http://localhost:4204';
const output=path.resolve(process.env.V80_QA_OUTPUT||'work-local/v80/qa/chronicle-ui-final-local');
outputWithinQaV80(output);const contract=qaContractV80(base,output);fs.mkdirSync(output,{recursive:true});
const model=homeworldSceneSsrV78(),C=model.load('app/game/systems/pitCharacterChroniclesV79.ts'),S=model.load('app/game/save.ts');
const owner='2026-10-03T19:00:00.000Z';const save=S.defaultSave(owner);save.settings.screenShake=false;
const sourceFiles=['app/globals.css','app/game/buildInfo.ts','app/game/PitExperienceV79.tsx','app/game/PitExperienceV79.module.css','app/game/systems/pitCharacterChroniclesV79.ts','app/game/systems/pitCharacterChronicleDataV80.ts','app/game/data/pitChronicleSeedsV80.ts','app/game/PitCanvas.tsx','app/game/save.ts','app/game/systems/pitRosterExpansion.ts'];
const report={...contract,base,sourceFiles,fixtures:['Fresh incognito contexts only; isolated defaultSave fixture opens the real GameClient deck.','Legacy progress is a model-generated V79 checkpoint fixture, not an actual user save.','Ending fixtures use eight explicitly synthetic reducer receipts to inspect real ending/gallery UI. They are not browser wins.','This recipe never injects combat HP, frame, phase, clock or result into a running match. Real match QA is a separate report.'],checks:[],captures:[],contexts:[],errors:[]};
report.sourceBefore=snapshotSourcesV80(sourceFiles,contract);
const persist=()=>fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
const check=(name,detail={})=>{report.checks.push({name,detail,at:new Date().toISOString()});persist();console.log('PASS '+name);};
const key=run=>C.pitCharacterChronicleStorageKeyV79(owner,run.contentVersion)+'.'+run.fighterId;
const legacy=C.advancePitCharacterChronicleV79(C.createPitCharacterChronicleRunV79('greyback',owner,'fixture-legacy-v80-review',1));
function ending(id){
 let run=C.createPitCharacterChronicleRunV79(id,owner,'fixture-eight-synthetic-'+id,2);
 for(let i=0;i<8;i++){
  while(['intro','post','defeat'].includes(run.phase))run=C.advancePitCharacterChronicleV79(run);
  assert.equal(run.phase,'pre');run=C.advancePitCharacterChronicleV79(run);const e=C.getPitCharacterChronicleEncounterV79(run);
  run=C.applyPitCharacterChronicleResultV79(run,{mode:'cpu',runId:run.runId,resultId:'fixture-synthetic-receipt-'+i,encounterId:e.id,leftId:e.leftId,rightId:e.rightId,arenaId:e.arenaId,winnerId:e.leftId}).run;
 }
 run=C.advancePitCharacterChronicleV79(run);assert.equal(run.phase,'outro');return run;
}
const browser=await chromium.connectOverCDP('http://127.0.0.1:58677');const contexts=[];let activePage;
async function owned(label,mobile,completed){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});contexts.push(context);
 const storage={[S.SAVE_STORAGE_KEY]:JSON.stringify(save),[key(legacy)]:C.serializePitCharacterChronicleRunV79(legacy)};
 if(completed)storage[key(completed)]=C.serializePitCharacterChronicleRunV79(completed);
 await context.addInitScript(entries=>{for(const [k,v] of Object.entries(entries))localStorage.setItem(k,v);},storage);
 const page=await context.newPage();activePage=page;page.setDefaultTimeout(60000);const errors=[];report.contexts.push({label,errors});
 page.on('pageerror',e=>errors.push({kind:'pageerror',text:e.message}));page.on('console',m=>{if(m.type()==='error')errors.push({kind:'console',text:m.text()});});
 page.on('requestfailed',r=>errors.push({kind:'requestfailed',url:r.url(),error:r.failure()?.errorText}));page.on('response',r=>{if(r.status()>=400)errors.push({kind:'http',url:r.url(),status:r.status()});});
 await page.goto(base,{waitUntil:'networkidle',timeout:120000});await page.getByRole('button',{name:/^Continuer/}).click();
 await page.locator('[data-campaign-session][data-campaign-location="deck"]').waitFor();await requireVersionV80(page,report,label+' GameClient');
 await page.getByRole('button',{name:'THE PIT · combat',exact:true}).click();
 await page.waitForLoadState('networkidle');
 await page.locator('[data-pit-character-chronicle-open]').click();
 return {page,context};
}
async function select(page,name){
 const search=page.getByRole('searchbox');if(!await search.isVisible())await page.getByRole('button',{name:'Choisir un autre chasseur',exact:true}).click();
 await search.fill(name);await page.getByRole('navigation',{name:'Chroniques jouables'}).getByRole('button').first().click();
}
async function ready(page){await page.waitForFunction(()=>document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus==='ready');}
async function capture(page,label){
 await ready(page);await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('[data-native-chronicle-portrait] img,img[data-native-chronicle-portrait]')].map(i=>i.decode()));await document.fonts.ready;});
 const filename=String(report.captures.length+1).padStart(2,'0')+'-'+label+'.png',filepath=path.join(output,filename);
 const detail=await page.evaluate(()=>{const root=document.querySelector('[data-pit-character-chronicles]'),scene=document.querySelector('[data-chronicle-scene]'),rect=scene?.getBoundingClientRect();return {contentVersion:document.querySelector('[data-game-content-version]')?.dataset.gameContentVersion,phase:root?.dataset.chroniclePhase,fighter:root?.dataset.chronicleFighter,scene:scene?.dataset.chronicleScene,body:scene?.querySelector('p')?.textContent,viewport:[innerWidth,innerHeight],documentWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,sceneRect:rect&&{x:rect.x,y:rect.y,width:rect.width,height:rect.height},activeCombatRoots:document.querySelectorAll('[data-pit-immersive]').length,storage:Object.fromEntries(Object.keys(localStorage).filter(k=>k.includes('chronicle')).map(k=>[k,localStorage.getItem(k)]))};});
 assert.equal(detail.contentVersion,'V80');assert.equal(detail.scrollWidth,detail.documentWidth);assert.equal(detail.activeCombatRoots,0);
 await page.screenshot({path:filepath,fullPage:true});report.captures.push({label,filename,filepath,capturedAt:new Date().toISOString(),sha256:hashV80(fs.readFileSync(filepath)),detail});persist();console.log('CAPTURE '+filename);
}
try{
 for(const mobile of [false,true]){
  const {page,context}=await owned(mobile?'mobile-catalogue-intro':'desktop-catalogue-intro',mobile);const prefix=mobile?'mobile':'desktop';
  const catalogue=page.getByRole('navigation',{name:'Chroniques jouables'});assert.equal(await catalogue.getByRole('button').count(),mobile?6:24);
  await capture(page,prefix+'-catalogue');await page.getByRole('button',{name:'Page suivante',exact:true}).click();await select(page,'Greyback');
  await page.getByRole('button',{name:/^Parcours V79 conservé/}).click();await page.waitForFunction(()=>document.querySelector('[data-pit-character-chronicles]')?.dataset.chroniclePhase==='intro');
  await capture(page,prefix+'-legacy-checkpoint-preserved');const legacyBefore=await page.evaluate(k=>localStorage.getItem(k),key(legacy));
  await page.getByRole('button',{name:'Chronique V80 · 8 duels',exact:true}).click();await page.getByRole('button',{name:'Commencer la chronique',exact:true}).click();
  for(let i=0;i<3;i++){await capture(page,prefix+'-intro-'+i);if(i<2)await page.locator('[data-chronicle-primary]').click();}
  assert.equal(await page.getByRole('button',{name:/Galerie · fin verrouillée/}).isEnabled(),false);await page.locator('[data-chronicle-primary]').click();await capture(page,prefix+'-eight-duel-first-brief');
  const campaignBefore=await page.evaluate(k=>localStorage.getItem(k),S.SAVE_STORAGE_KEY);
  await page.getByRole('button',{name:'Recommencer',exact:true}).click();await page.getByRole('alertdialog').waitFor();await page.keyboard.press('Escape');assert.equal(await page.getByRole('alertdialog').count(),0);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),key(legacy)),legacyBefore);assert.equal(await page.evaluate(k=>localStorage.getItem(k),S.SAVE_STORAGE_KEY),campaignBefore);
  check(prefix+' catalogue/search/pagination, legacy edition preserved, three intro panels and locked ending, restart cancel',{mobile,pageSize:mobile?6:24});await context.close();
 }
 for(const [id,name,mobile] of [['jungle-hunter','Jungle Hunter',false],['theta','Theta',true]]){
  const completed=ending(id),{page,context}=await owned('synthetic-ending-'+id,mobile,completed);await select(page,name);await page.waitForFunction(()=>document.querySelector('[data-pit-character-chronicles]')?.dataset.chroniclePhase==='outro');
  const before=await page.evaluate(k=>localStorage.getItem(k),key(completed));
  for(let i=0;i<3;i++){await capture(page,id+'-synthetic-ending-'+i);if(i<2)await page.locator('[data-chronicle-primary]').click();}
  const galleryBefore=await page.evaluate(k=>localStorage.getItem(k),key(completed));
  assert.notEqual(galleryBefore,before,'normal story page navigation stores its own checkpoint');
  await page.getByRole('button',{name:'Galerie · fin gagnée',exact:true}).click();await capture(page,id+'-read-only-ending-gallery');
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),key(completed)),galleryBefore,'gallery itself must not mutate already-read checkpoint');
  check(id+' three ending tableaux and read-only earned gallery',{syntheticReducerReceipts:8,browserWins:0});await context.close();
 }
 report.hardErrors=hardErrorsV80(report.contexts.flatMap(c=>c.errors));assert.deepEqual(report.hardErrors,[]);
 assert.deepEqual(snapshotSourcesV80(sourceFiles,contract),report.sourceBefore);report.status='PASS_CHRONICLE_UI_V80_PENDING_VISUAL_REVIEW';
}catch(error){report.status='FAIL';report.errors.push({text:error.stack,at:new Date().toISOString()});console.error(error);if(activePage&&!activePage.isClosed())await activePage.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});}
finally{report.sourceAfter=snapshotSourcesV80(sourceFiles,contract);report.completedAt=new Date().toISOString();persist();for(const context of contexts)await context.close().catch(()=>{});console.log(JSON.stringify({status:report.status,captures:report.captures.length,checks:report.checks.length,output}));process.exit(report.status==='FAIL'?1:0);}
