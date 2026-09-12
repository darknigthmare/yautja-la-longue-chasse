import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='https://yautja-la-longue-chasse.vercel.app';
const output='tmp/pit-public-v32-qa';await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],failedRequests=[],checks=[];
let page;try{
 page=await browser.newPage({viewport:{width:1280,height:900}});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failedRequests.push({url:r.url(),status:r.status()});});
 await page.goto(base,{waitUntil:'networkidle'});
 assert.equal(await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version'),'V32');
 await page.getByRole('button',{name:'Jouer',exact:true}).click();
 await page.getByRole('button',{name:'THE PIT · combat',exact:true}).click();
 await page.getByRole('radio',{name:/Entraînement/}).click();
 await page.getByRole('combobox',{name:'Combattant joueur',exact:true}).selectOption('jungle-hunter');
 await page.getByRole('combobox',{name:'Adversaire',exact:true}).selectOption('city-hunter');
 await page.getByRole('combobox',{name:'Arène',exact:true}).selectOption('trophy-hall');
 await page.screenshot({path:output+'/selection.png',fullPage:true});
 await page.getByRole('button',{name:/^ENTRER DANS L’ARÈNE/}).click();
 await page.waitForFunction(()=>document.querySelector('canvas[data-pit-arena-art-status="bitmap"][data-pit-arena-planes="P0,P1,P2,P3,P4,P5"]'));
 await page.getByRole('button',{name:'Laboratoire',exact:true}).click();
 await page.getByRole('combobox',{name:'Comportement du mannequin',exact:true}).selectOption('idle');
 await page.waitForFunction(()=>document.querySelectorAll('[data-pit-bitmap-status="sprite-sheet-animation"]').length===2);
 const canvas=page.locator('canvas[data-pit-arena-id]');
 checks.push({name:'live-match',arena:await canvas.getAttribute('data-pit-arena-id'),planes:await canvas.getAttribute('data-pit-arena-planes'),missing:await canvas.getAttribute('data-pit-arena-missing-assets'),statuses:await page.locator('[data-pit-bitmap-status]').evaluateAll(ns=>ns.map(n=>({fighter:n.dataset.pitBitmapId,status:n.dataset.pitBitmapStatus})))});
 assert.equal(checks[0].missing,'0');
 await canvas.screenshot({path:output+'/jungle-city-live.png'});
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:output+'/mobile.png',fullPage:true});
 for(const name of ['jungle-hunter-idle','jungle-hunter-light','city-hunter-idle','city-hunter-light']){
  const response=await page.request.get(base+'/game/sprites/v32/pit/'+name+'.png');
  assert.equal(response.status(),200);assert((await response.body()).length>10000);checks.push({name,HTTP:response.status()});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);
 const result={passed:true,checkedAt:new Date().toISOString(),url:base,contentVersion:'V32',checks,mobileNoOverflow:true,errors,failedRequests};
 await fs.writeFile(output+'/browser-qa.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(error){
 await page.screenshot({path:output+'/failure.png',fullPage:true});
 const diagnostic={error:String(error),errors,failedRequests,statuses:await page.locator('[data-pit-bitmap-status]').evaluateAll(ns=>ns.map(n=>n.outerHTML)),canvas:await page.locator('canvas').evaluateAll(ns=>ns.map(n=>n.outerHTML)),body:(await page.locator('body').innerText()).slice(-7000)};
 await fs.writeFile(output+'/failure.json',JSON.stringify(diagnostic,null,2));console.log(JSON.stringify(diagnostic));throw error;
}finally{await browser.close();}
