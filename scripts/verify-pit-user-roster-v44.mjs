import { returnPitSelection } from "./pit-selection-browser-helpers.mjs";
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {enterCampaignDeck} from './campaign-browser-helpers.mjs';
import {choosePitFighter} from './pit-selection-browser-helpers.mjs';
const base=process.env.V44_QA_URL||'http://127.0.0.1:4174';
const output=process.env.V44_QA_OUTPUT||'work/v44/browser-qa';
await fs.mkdir(output,{recursive:true});
const catalogue=JSON.parse(await fs.readFile('app/game/data/pitUserHuntersV44.json','utf8'));
const city=catalogue.fighters.find(f=>f.id==='city-hunter');
const cityVariant=city.variants.find(v=>/sans (casque|masque)/i.test(v.label))??city.variants[1];
const imported=catalogue.fighters.find(f=>f.id==='user-ahab')??catalogue.fighters.find(f=>f.id.startsWith('user-')&&f.variants.length>1);
const rivalVariant=imported.variants[1];
const other=catalogue.fighters.find(f=>f.id==='user-big-red')??catalogue.fighters.find(f=>f.id.startsWith('user-')&&f.id!==imported.id);
const errors=[],checks=[],responses=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
let page;
const confirm=()=>page.locator('[data-pit-selection-confirm]').click();
const ready=()=>page.locator('[data-pit-stage-preview][data-preview-status="ready"]').waitFor();
const storage=()=>page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort(([a],[b])=>a.localeCompare(b)))));
async function enter(){await enterCampaignDeck(page,{url:base});await page.getByRole('button',{name:'THE PIT · combat',exact:true}).click();await page.locator('[data-pit-roster-total]').waitFor();}
function watch(){page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)responses.push({url:r.url(),status:r.status()});});}
async function imageReady(side,variant){const card=page.locator(`[data-selection-side="${side}"] [data-fighter-variant="${variant}"]`);await card.waitFor();await card.locator('img').evaluate(img=>img.decode());}
try{
 page=await browser.newPage({viewport:{width:1280,height:900}});watch();
 await page.addInitScript(()=>{window.__v44Pad={id:'V44 virtual standard pad',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__v44Pad,null,null,null]});});
 await enter();
 const saved=await storage();
 await page.getByRole('radio',{name:/^Versus local/}).click();
 const roster=page.locator('[data-pit-roster-total]');const total=Number(await roster.getAttribute('data-pit-roster-total'));
 assert(total>100);assert((await roster.getByRole('option').count())<=24);
 assert.equal(await roster.locator('[data-choice-id="city-hunter"]').count(),1);
 await choosePitFighter(page,'city-hunter');
 await page.locator('[data-pit-variant-select]').selectOption(cityVariant.id);
 await imageReady('player',cityVariant.id);
 await page.locator('[data-choice-id="city-hunter"]').focus();await page.keyboard.press('e');
 assert.notEqual(await page.locator('[data-pit-variant-select]').inputValue(),cityVariant.id);await page.keyboard.press('q');
 assert.equal(await page.locator('[data-pit-variant-select]').inputValue(),cityVariant.id);
 const tapPad=async index=>{await page.waitForTimeout(120);await page.evaluate(index=>window.__v44Pad.buttons[index]={pressed:true,touched:true,value:1},index);await page.waitForTimeout(150);await page.evaluate(index=>window.__v44Pad.buttons[index]={pressed:false,touched:false,value:0},index);await page.waitForTimeout(120);};
 await tapPad(7);assert.notEqual(await page.locator('[data-pit-variant-select]').inputValue(),cityVariant.id);
 await tapPad(6);assert.equal(await page.locator('[data-pit-variant-select]').inputValue(),cityVariant.id);
 checks.push({name:'variant-keyboard-and-gamepad',keys:'Q/E',triggers:'LT/RT',physicalControllerCertified:false});
 await page.locator('[data-choice-id="city-hunter"]').click();
 assert.equal(await page.locator('[data-pit-variant-select]').inputValue(),cityVariant.id,'same identity must keep selected mask');
 await confirm();await page.locator('[data-pit-selection-slot="opponent"]').waitFor();
 await choosePitFighter(page,imported.id);
 await page.locator('[data-pit-variant-select]').selectOption(rivalVariant.id);
 await imageReady('opponent',rivalVariant.id);
 await page.screenshot({path:output+'/variants-desktop.png'});
 assert.equal(await storage(),saved,'selection never writes campaign progression');
 checks.push({name:'grouped-roster',total,maximumMountedTiles:24,cityVariants:city.variants.length,oneTilePerIdentity:true,selectedVariants:[cityVariant.id,rivalVariant.id]});
 await confirm();await ready();await confirm();await page.locator('[data-pit-match-loading]').waitFor({state:'detached'});
 for(const [slot,id,v] of [[0,'city-hunter',cityVariant],[1,imported.id,rivalVariant]]){
   const status=page.locator(`[data-pit-bitmap-slot="${slot}"]`);assert.equal(await status.getAttribute('data-pit-bitmap-id'),id);assert.equal(await status.getAttribute('data-pit-bitmap-variant'),v.id);assert.equal(await status.getAttribute('data-pit-bitmap-status'),'static-bitmap');
 }
 const frame=Number(await page.locator('[data-pit-frame]').getAttribute('data-pit-frame'));await page.waitForTimeout(300);assert(Number(await page.locator('[data-pit-frame]').getAttribute('data-pit-frame'))>frame);
 await page.locator('canvas[data-pit-arena-id]').screenshot({path:output+'/supplied-duel.png'});
 checks.push({name:'actual-duel-render',imagesMatchSelection:true,simulationAdvances:true,animationStatus:'static-bitmap'});
 await returnPitSelection(page);
 assert.equal(await page.locator('[data-selection-side="player"] [data-fighter-variant]').getAttribute('data-fighter-variant'),cityVariant.id);
 await page.locator('[data-pit-roster-search]').fill('no-hunter-matches-v44');assert.equal(await page.locator('[data-pit-roster-total] [role="option"]').count(),0);
 await page.locator('[data-pit-roster-search]').fill('');
 await page.locator('[data-pit-roster-page-next]').click();assert.equal(await roster.getAttribute('data-pit-roster-page'),'2');
 await choosePitFighter(page,other.id);
 assert(await page.getByRole('radio',{name:/^Arcade individuel/}).isDisabled());
 checks.push({name:'search-pages-mode-safety',emptyQuerySafe:true,secondPageAccessible:true,unwrittenChroniclesUnavailable:true});
 // A failed supplied PNG must never silently become a CSS silhouette or start the timer.
 const failVariant=other.variants.at(-1);
 await page.route('**'+failVariant.src,route=>route.abort('failed'));
 await page.locator('[data-pit-variant-select]').selectOption(failVariant.id);
 await confirm();await choosePitFighter(page,'jungle-hunter');await confirm();await ready();await confirm();
 await page.getByRole('button',{name:'Réessayer les chasseurs',exact:true}).waitFor();
 const stopped=await page.locator('[data-pit-frame]').getAttribute('data-pit-frame');await page.waitForTimeout(250);assert.equal(await page.locator('[data-pit-frame]').getAttribute('data-pit-frame'),stopped);
 await page.screenshot({path:output+'/missing-image-paused.png'});
 await page.unroute('**'+failVariant.src);await page.getByRole('button',{name:'Réessayer les chasseurs',exact:true}).click();await page.locator('[data-pit-match-loading]').waitFor({state:'detached'});
 assert.equal(await page.locator('[data-pit-bitmap-slot="0"]').getAttribute('data-pit-bitmap-variant'),failVariant.id);
 assert.equal(await page.locator('[data-pit-bitmap-slot="0"]').getAttribute('data-pit-bitmap-status'),'static-bitmap');
 checks.push({name:'supplied-image-failure-retry',pausedFrame:stopped,noGenericReplacement:true,recovered:true});
 await page.close();
 page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});watch();await enter();await choosePitFighter(page,imported.id);await page.locator('[data-pit-variant-select]').selectOption(rivalVariant.id);await imageReady('player',rivalVariant.id);
 await page.locator('[data-pit-variant-select]').scrollIntoViewIfNeeded();await page.screenshot({path:output+'/variants-mobile.png'});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert(await page.locator('[data-pit-selection-step]').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
 await confirm();await choosePitFighter(page,'city-hunter');await confirm();await ready();
 checks.push({name:'mobile-selection',width:390,variantSelect:true,noHorizontalOverflow:true,stageReached:true});
 assert.deepEqual(errors,[]);assert.deepEqual(responses,[]);
 const report={passed:true,checkedAt:new Date().toISOString(),url:base,checks,errors,responses};await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(error){if(page&&!page.isClosed()){await page.screenshot({path:output+'/failure.png',fullPage:true}).catch(()=>{});await fs.writeFile(output+'/failure.json',JSON.stringify({error:String(error),checks,errors,responses,body:await page.locator('body').innerText().catch(()=>null)},null,2));}throw error;}finally{await browser.close();}
