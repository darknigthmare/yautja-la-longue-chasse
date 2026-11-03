import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright-core";
import { campaignFixture, enterCampaignDeck } from "./campaign-browser-helpers.mjs";
import { selectPitMatch, openPitPause, resumePitFight } from "./pit-selection-browser-helpers.mjs";
const url=process.env.V49_RESULTS_QA_URL||"http://127.0.0.1:4174";
const output=process.env.V49_RESULTS_QA_OUTPUT||"outputs/qa-commercial-audit/v49/results-browser-qa";
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:"chrome",headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}});page.setDefaultTimeout(60000);
const errors=[],responses=[],checks=[];
page.on("pageerror",error=>errors.push(error.message));page.on("response",response=>{if(response.status()>=400)responses.push({url:response.url(),status:response.status()});});
const frame=()=>page.locator('[data-pit-frame]').getAttribute('data-pit-frame').then(Number);
const hudState=()=>page.locator('[data-pit-hud]').evaluate(hud=>({meters:[...hud.querySelectorAll('[role=progressbar]')].map(el=>({label:el.getAttribute('aria-label'),value:Number(el.getAttribute('aria-valuenow'))})),rounds:[...hud.querySelectorAll('[aria-label$="manche gagnée"]')].map(el=>el.getAttribute('aria-label'))}));
try {
 const fixture=structuredClone(await campaignFixture());fixture.save.settings.screenShake=false;
 await page.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),fixture);
 await enterCampaignDeck(page,{url});await page.getByRole('button',{name:'THE PIT · combat',exact:true}).click();
 await page.getByRole('radio',{name:/^Versus local/}).click();
 await selectPitMatch(page,{player:'jungle-hunter',opponent:'city-hunter',arena:'the-pit'});
 await page.locator('[data-pit-match-loading]').waitFor({state:'detached'});
 await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Combat THE PIT'&&Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame)>3);
 const result=page.locator('[aria-labelledby="pit-result"]');
 // Win both real rounds against an idle second local player. No state or time injection.
 await page.keyboard.down('ArrowRight');
 try {for(let presses=0;presses<120&&!(await result.isVisible());presses++){await page.keyboard.press('KeyL',{delay:80});await page.waitForTimeout(520);}}
 finally{await page.keyboard.up('ArrowRight');}
 await result.waitFor({state:'visible'});
 assert.match(await result.innerText(),/Jungle Hunter/i);
 for(let i=0;i<10;i++){await page.keyboard.press('Tab');assert(await page.evaluate(()=>Boolean(document.activeElement.closest('[aria-labelledby="pit-result"]'))));}
 const resultBounds=await result.boundingBox();assert.deepEqual(resultBounds,{x:0,y:0,width:1280,height:720});
 const endFrame=await frame();await page.waitForTimeout(300);assert.equal(await frame(),endFrame);
 const finalHud=await hudState();assert.equal(finalHud.meters.find(m=>m.label==='Vie de City Hunter').value,0);assert.deepEqual(finalHud.rounds,['2 manche gagnée','0 manche gagnée']);
 await page.screenshot({path:output+'/match-result.png'});
 checks.push({name:'two-actual-rounds-result-and-focus',endFrame,finalHud,resultBounds,keyboardOnly:true});
 await page.waitForTimeout(500);
 const saveBefore=await page.evaluate(key=>localStorage.getItem(key),fixture.key);
 await page.getByRole('button',{name:'Revoir le duel',exact:true}).click();
 await page.waitForFunction(()=>Number(document.querySelector('[data-pit-frame]').dataset.pitFrame)>5);
 await openPitPause(page);const pausedAt=await frame();await page.waitForTimeout(300);assert.equal(await frame(),pausedAt);
 await resumePitFight(page);
 await result.waitFor({state:'visible',timeout:120000});
 assert.match(await result.innerText(),/Archive restituée/i);
 assert.equal(await frame(),endFrame,'recorded replay ends on the same simulation frame');
 assert.deepEqual(await hudState(),finalHud,'replay restores identical health, resource and rounds');
 await page.waitForTimeout(300); // allow the cosmetic health-bar transition to settle before the evidence image
 const saveAfter=await page.evaluate(key=>localStorage.getItem(key),fixture.key);assert.equal(saveAfter,saveBefore,'watching replay cannot award another match or mutate progression');
 await page.screenshot({path:output+'/replay-result.png'});
 checks.push({name:'full-replay-pause-and-identical-result',pausedAt,endFrame,finalHud,saveUnchanged:true});
 assert.deepEqual(errors,[]);assert.deepEqual(responses,[]);
 const report={passed:true,checkedAt:new Date().toISOString(),url,checks,errors,responses,limits:['Local versus against an idle second player exercises two real wins, terminal HUD and replay; this is not a difficulty or competitive balance test.']};await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(error){await page.screenshot({path:output+'/failure.png',fullPage:true}).catch(()=>{});await fs.writeFile(output+'/failure.json',JSON.stringify({error:String(error),checks,errors,responses,body:await page.locator('body').innerText().catch(()=>null)},null,2));throw error;}
finally{await browser.close();}
