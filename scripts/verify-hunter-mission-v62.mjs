import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {campaignFixture,enterCampaignDeck} from './campaign-browser-helpers.mjs';
const url=process.env.V62_HEAD_MISSION_QA_URL??'http://127.0.0.1:4182';
const output=process.env.V62_HEAD_MISSION_QA_OUTPUT??'work-local/v62/qa/head-mission';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const checks=[],errors=[],failures=[];let page;
try{
for(const morph of ['classic','feral']){
 const context=await browser.newContext({viewport:{width:1366,height:900}});page=await context.newPage();page.setDefaultTimeout(30000);
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
 const fixture=structuredClone(await campaignFixture());fixture.save.appearance.bodyMorphId=morph;fixture.save.appearance.biomaskId=morph==='feral'?'feral':'jungle';
 await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));window.__headDraws=[];
 const original=CanvasRenderingContext2D.prototype.drawImage;
 CanvasRenderingContext2D.prototype.drawImage=function(...args){const src=args[0]?.src??'';
 if(this.canvas.matches('canvas.hunt-canvas')&&/\/game\/sprites\/v62\/(heads|masks)\//.test(src)){
 const t=this.getTransform();window.__headDraws.push({src:new URL(src).pathname,destination:args.slice(1),matrix:[t.a,t.b,t.c,t.d,t.e,t.f],time:performance.now()});if(window.__headDraws.length>1000)window.__headDraws.shift();}
 return original.apply(this,args);};},fixture);
 await enterCampaignDeck(page,{url});
 assert.equal(await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version'),'V62');
 await page.getByRole('button',{name:'Accès rapide aux installations',exact:true}).click();
 await page.getByText('Accès direct aux interfaces · sans déplacement du chasseur',{exact:true}).click();
 await page.getByRole('button',{name:/^DÉPART Ouvrir l’interface$/}).click();
 // Select the first available route through the actual navigation UI.
 for(let depth=0;depth<3;depth++){
   await page.getByRole('button',{name:'Tracer la route',exact:true}).first().click();
   await page.getByRole('button',{name:'Entrer dans la destination',exact:true}).click();
 }
 if(!await page.getByRole('button',{name:'Préparer la chasse',exact:true}).isVisible())
   await page.getByRole('navigation',{name:'Signaux orbitaux',exact:true}).getByRole('button').first().click();
 await page.getByRole('button',{name:'Préparer la chasse',exact:true}).click();
 await page.getByRole('button',{name:'Départ rapide',exact:true}).click();
 const canvas=page.locator('canvas.hunt-canvas');await canvas.waitFor({timeout:120000});
 await page.waitForFunction(()=>window.__headDraws.some(d=>d.src.includes('/heads/'))&&window.__headDraws.some(d=>d.src.includes('/masks/')),{timeout:30000});
 await page.screenshot({path:output+'/'+morph+'-masked.png'});
 await canvas.focus();await page.keyboard.down('ArrowRight');await page.waitForTimeout(500);await page.keyboard.up('ArrowRight');
 await page.keyboard.press('KeyM');
 await page.getByText('Masque RETIRÉ',{exact:true}).waitFor();
 await page.waitForTimeout(100);await page.evaluate(()=>window.__headDraws=[]);await page.waitForTimeout(250);
 const bare=await page.evaluate(()=>window.__headDraws);assert(bare.some(d=>d.src.includes('/heads/')));assert(!bare.some(d=>d.src.includes('/masks/')));
 await page.screenshot({path:output+'/'+morph+'-bare.png'});
 await canvas.focus();await page.keyboard.press('KeyM');await page.waitForFunction(()=>window.__headDraws.some(d=>d.src.includes('/masks/')));
 const all=await page.evaluate(()=>window.__headDraws);
 for(const d of all){assert.equal(d.destination.length,4);assert(d.destination.every(Number.isFinite));assert(d.destination[2]<130&&d.destination[3]<140,'native cutout cannot occupy whole body canvas');}
 checks.push({morph,mask:fixture.save.appearance.biomaskId,headDraws:all.filter(d=>d.src.includes('/heads/')).length,maskDraws:all.filter(d=>d.src.includes('/masks/')).length,bareHeadDraws:bare.length,registeredDestination:all[0].destination,keyboardMovement:true,maskToggleObserved:true,fixture:'Isolated legacy campaign with selected appearance; not a full new-game/prologue test'});
 await context.close();
}
assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
await fs.writeFile(output+'/report.json',JSON.stringify({status:'PASS',url,checks,errors,failures},null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks}));
}catch(error){await page?.screenshot({path:output+'/failure.png'}).catch(()=>{});await fs.writeFile(output+'/report.json',JSON.stringify({status:'FAIL',url,checks,errors,failures,error:String(error)},null,2));throw error;}finally{await browser.close();}
