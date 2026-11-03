import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {enterCampaignDeck} from './campaign-browser-helpers.mjs';
import {selectPitMatch,openPitSelectionOptions,closePitSelectionOptions} from './pit-selection-browser-helpers.mjs';
const url=process.env.V52_JOURNEYS_QA_URL||'http://127.0.0.1:4174';
const output=process.env.V52_JOURNEYS_QA_OUTPUT||'outputs/qa-commercial-audit/v52/stage-journeys/browser';
await fs.mkdir(output,{recursive:true});
const bundle=await build({stdin:{contents:'export {PIT_STAGE_JOURNEY_ROUTES} from "./app/game/systems/pitStageJourney"; export {getPitArenaArtPaths} from "./app/game/pitArenaRendering";',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const routes=api.PIT_STAGE_JOURNEY_ROUTES.filter(r=>r.release==='V52');
const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[],errors=[],responses=[];let page;
const canvas=()=>page.locator('canvas[data-pit-scene-arena-id]');
const saveBytes=()=>page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort(([a],[b])=>a.localeCompare(b)))));
try{
 for(const route of routes){
  const context=await browser.newContext({viewport:{width:1280,height:720}});page=await context.newPage();page.setDefaultTimeout(45000);
  page.on('pageerror',error=>errors.push(error.message));page.on('response',r=>{if(r.status()>=400)responses.push({status:r.status(),url:r.url()});});
  const blockedPath=api.getPitArenaArtPaths(route.destination)[0];assert(blockedPath);
  await page.route('**'+blockedPath,r=>r.abort('failed'));
  await enterCampaignDeck(page,{url});assert.equal(await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version'),'V52');
  await page.getByRole('button',{name:'THE PIT · combat',exact:true}).click();await page.getByRole('radio',{name:/^Versus local/}).click();
  await selectPitMatch(page,{player:'jungle-hunter',opponent:'city-hunter',arena:'the-pit',launch:false});
  await openPitSelectionOptions(page);const picker=page.getByRole('combobox',{name:'Parcours disponibles',exact:true});assert.equal(await picker.inputValue(),'');
  assert.equal(await picker.locator('option').count(),6,'Neutral plus five explicit routes');await picker.selectOption(route.id);
  await page.locator('[data-pit-journey-assets="failed"]').waitFor();assert(await page.locator('[data-pit-selection-confirm]').isDisabled());
  await closePitSelectionOptions(page);assert(await page.locator('[data-pit-selection-notice]').isVisible());
  await page.unroute('**'+blockedPath);await openPitSelectionOptions(page);await page.getByRole('button',{name:'Réessayer les deux scènes',exact:true}).click();
  await page.locator('[data-pit-journey-assets="ready"]').waitFor();await page.screenshot({path:output+'/'+route.id+'-selection.png'});await closePitSelectionOptions(page);
  await page.waitForFunction(()=>document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus==='ready');
  assert(await page.locator('[data-pit-selection-confirm]').isEnabled());checks.push({name:route.id+'-missing-destination-retry',selectedRoute:route.id,blockedPath,defaultNeutral:true,departureBlocked:true,recovered:true});
  await page.locator('[data-pit-selection-confirm]').click();await page.locator('[data-pit-match-loading]').waitFor({state:'detached'});
  await page.waitForFunction(()=>{const root=document.querySelector('[data-pit-presentation-phase]');return root?.dataset.pitPresentationPhase==='fight'&&root.dataset.pitPresentationBlocked==='false'&&Number(root.querySelector('[data-pit-frame]')?.dataset.pitFrame)>3;});
  assert.equal(await canvas().getAttribute('data-pit-stage-sector'),'sas');assert.equal(await canvas().getAttribute('data-pit-scene-arena-id'),route.entry);
  const before=await saveBytes();await page.screenshot({path:output+'/'+route.id+'-entry.png'});
  await page.keyboard.down('ArrowLeft');await page.keyboard.down('Numpad4');
  try{await page.waitForFunction(()=>{const a=JSON.parse(document.querySelector('canvas[data-pit-fighter-positions]')?.dataset.pitFighterPositions||'[]');return a.length===2&&a.every(f=>f.x<140);});}finally{await page.keyboard.up('ArrowLeft');await page.keyboard.up('Numpad4');}
  await page.keyboard.down('NumpadEnter');await page.waitForTimeout(100);await page.keyboard.up('NumpadEnter');await page.locator('canvas[data-pit-stage-sector="court"]').waitFor();
  assert.equal(await canvas().getAttribute('data-pit-arena-id'),route.entry);assert.equal(await canvas().getAttribute('data-pit-scene-arena-id'),route.destination);assert.equal(await canvas().getAttribute('data-pit-arena-art-status'),'bitmap');
  assert.equal(await page.locator('[data-pit-announcement]').innerText(),'PASSAGE CONFIRMÉ · '+route.destinationLabel);assert(await page.locator('[data-pit-announcement]').isVisible());
  const positions=JSON.parse(await canvas().getAttribute('data-pit-fighter-positions'));assert.deepEqual(positions.map(f=>f.x),[300,660]);assert(positions.every(f=>f.y===0));
  assert.equal(await page.locator('[data-pit-match-loading]').count(),0);assert.equal(await saveBytes(),before,'Exhibition must not mutate campaign or statistics');
  await page.screenshot({path:output+'/'+route.id+'-destination.png'});checks.push({name:route.id+'-live-projection',entry:route.entry,destination:route.destination,bothFightersTransferred:true,saveUnchanged:true,transferFrame:Number(await canvas().getAttribute('data-pit-stage-transfer-frame'))});
  await context.close();page=null;
 }
 assert.deepEqual(errors,[]);assert.deepEqual(responses,[]);
 await fs.writeFile(output+'/report.json',JSON.stringify({passed:true,checkedAt:new Date().toISOString(),url,contentVersion:'V52',checks,errors,responses,scope:'Four original exhibition links, existing art, one confirmed throw transfer each; no canonical geography or complete arena claim.'},null,2)+'\n');console.log(JSON.stringify({passed:true,checks:checks.length,output}));
}catch(error){if(page)await page.screenshot({path:output+'/failure.png',fullPage:true}).catch(()=>{});await fs.writeFile(output+'/failure.json',JSON.stringify({error:String(error),checks,errors,responses,body:await page?.locator('body').innerText().catch(()=>null)},null,2));console.error(String(error).slice(0,1000));process.exitCode=1;}
finally{await browser.close();}
