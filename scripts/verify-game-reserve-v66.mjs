import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {campaignFixture,enterCampaignDeck} from './campaign-browser-helpers.mjs';

const url=process.env.V66_QA_URL??'http://localhost:4184';
const output=process.env.V66_RESERVE_QA_OUTPUT??'work-local/v66/qa/game-reserve';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:950}});
page.setDefaultTimeout(60000);
const checks=[],captures=[],errors=[],failures=[],events=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400)failures.push({url:response.url(),status:response.status()});});
page.on('console',message=>{if(/Fast Refresh|HMR/i.test(message.text()))events.push(message.text());});
const fixture=await campaignFixture();
const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),fixture.key);
const screen=()=>page.locator('[data-game-reserve-v66]');
const canvas=()=>screen().locator('canvas');
const drawState=()=>canvas().evaluate(e=>({...e.dataset}));
const tick=ms=>page.clock.runFor(ms);
const capture=async name=>{const file=output+'/'+name+'.jpg';await page.screenshot({path:file,type:'jpeg',quality:87});captures.push(file);};
const stepButton=async name=>{await screen().getByRole('button',{name,exact:true}).click({force:true});await tick(80);};
const focus=async()=>{await canvas().focus();await tick(48);};
const hold=async(key,ms)=>{await page.keyboard.down(key);await tick(ms);await page.keyboard.up(key);await tick(48);};
const waitClockedArt=async()=>{for(let n=0;n<100;n++){await tick(80);if(await canvas().getAttribute('data-reserve-assets')==='true')return;await page.waitForTimeout(100);}throw Error('Native art did not become ready under the controlled clock');};
try{
 await page.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){
   if(window.__reserveRefuseSave&&key==='yautja-long-hunt.save')throw new DOMException('Isolated Game Reserve QA write refusal','QuotaExceededError');
   return original.call(this,key,value);
 };});
 await page.clock.install();
 await enterCampaignDeck(page,{url});await page.getByRole('button',{name:'Dossier de campagne',exact:true}).click();
 await page.getByRole('button',{name:'Mondes et réserves',exact:true}).click();
 const before=await saved();assert.equal(before.gameReserveV66??null,null);
 await page.locator('[data-game-reserve-start]').click();await screen().waitFor();
 await page.waitForFunction(()=>document.querySelector('[data-game-reserve-v66] canvas')?.getAttribute('data-reserve-assets')==='true');
 await page.clock.pauseAt(new Date(Date.now()+1000));await tick(48);
 assert.equal((await drawState()).reserveTick,'0');await capture('01-expedition-briefing');
 await stepButton('Commencer l’expédition');await focus();await hold('ArrowRight',1600);
 const moved=await drawState();assert(Number(moved.reserveX)>300);assert(Number(moved.reserveTick)>50);
 await capture('02-first-tracks-native-art');
 await stepButton('Pause');const paused=await drawState();await tick(1800);assert.equal((await drawState()).reserveTick,paused.reserveTick);
 checks.push('Briefing waits for native assets and Start; keyboard movement advances the world; pause freezes player and both AI groups.');

 await stepButton('Reprendre la chasse');await focus();const beforeRefusal=(await saved()).gameReserveV66;
 await page.evaluate(()=>window.__reserveRefuseSave=true);await hold('ArrowRight',2300);
 await screen().getByRole('button',{name:'Réessayer la sauvegarde et reprendre',exact:true}).waitFor();
 assert.deepEqual((await saved()).gameReserveV66,beforeRefusal);const refused=await drawState();await tick(1200);assert.equal((await drawState()).reserveTick,refused.reserveTick);
 await capture('03-storage-refusal-retained-state');
 await page.evaluate(()=>window.__reserveRefuseSave=false);await stepButton('Réessayer la sauvegarde et reprendre');await focus();await tick(150);
 assert(Number((await drawState()).reserveTick)>=Number(refused.reserveTick));assert((await saved()).gameReserveV66.tick>=Number(refused.reserveTick));
 await stepButton('Pause');const durable=(await saved()).gameReserveV66;
 checks.push('Quota refusal never advances the durable checkpoint; simulation stops, retains the physical state and retries successfully.');

 await page.setViewportSize({width:393,height:852});await tick(100);await capture('04-mobile-pause');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No mobile page overflow');
 await stepButton('Sauvegarder et revenir au dossier');
 await page.getByRole('button',{name:'Mondes et réserves',exact:true}).click({force:true});await tick(64);
 await page.locator('[data-game-reserve-new]').click({force:true});await tick(64);
 const beforeCancel=(await saved()).gameReserveV66;
 await page.getByRole('button',{name:'Conserver l’expédition',exact:true}).click({force:true});await tick(64);
 assert.deepEqual((await saved()).gameReserveV66,beforeCancel);assert.equal(await page.locator('[data-game-reserve-confirm]').count(),0);
 await page.locator('[data-game-reserve-start]').click({force:true});await tick(96);assert.equal((await drawState()).reserveTick,String(durable.tick));
 await capture('05-mobile-resumed-checkpoint');
 checks.push('Mobile menu fits; cancelling New expedition preserves the entire active checkpoint; reopen restores its exact tick and position.');

 await page.setViewportSize({width:1440,height:950});await tick(64);
 // Let React's post-navigation Suspense timers run naturally while the loaded expedition is paused.
 await page.clock.resume();await page.reload({waitUntil:'networkidle'});
 await page.getByRole('button',{name:/^Continuer/}).click();
 await page.waitForFunction(()=>document.querySelector('[data-game-reserve-v66]')||[...document.querySelectorAll('button')].some(b=>b.textContent?.trim()==='Dossier de campagne'));
 if(!await screen().count()){
   await page.locator('[data-campaign-session]').waitFor();await page.getByRole('button',{name:'Dossier de campagne',exact:true}).click({force:true});await tick(64);
   await page.getByRole('button',{name:'Mondes et réserves',exact:true}).click({force:true});await tick(64);await page.locator('[data-game-reserve-start]').click({force:true});await tick(150);
 }
 await screen().waitFor();await page.waitForFunction(()=>document.querySelector('[data-game-reserve-v66] canvas')?.getAttribute('data-reserve-assets')==='true');
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+200)));await waitClockedArt();await tick(64);
 assert.deepEqual((await saved()).gameReserveV66,durable,'Page reload preserves the last acknowledged snapshot');
 await stepButton('Reprendre la chasse');await focus();
 for(let n=0;n<35;n++){const data=await drawState();if(Number(data.reserveX)<152)break;await hold('ArrowLeft',140);}
 const atReturn=await drawState();assert(Number(atReturn.reserveX)<170,'Actual keyboard journey back to extraction');
 await hold('KeyE',1250);assert.equal((await drawState()).reserveStatus,'returned');await capture('06-physical-extraction-result');
 const complete=await saved();assert.equal(complete.gameReserveV66.status,'returned');
 for(const key of ['createdAt','profile','inventory','loadout','trophies','codex','missionProgress','statistics'])assert.deepEqual(complete[key],before[key],key+' never awarded by this mode');
 await stepButton('Retour au dossier');await page.getByRole('button',{name:'Mondes et réserves',exact:true}).click({force:true});await tick(64);await capture('07-durable-dossier-summary');
 checks.push('Real page reload, keyboard return and exposed extraction produce a persisted result without any profile, equipment, mission or trophy award.');
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);assert.deepEqual(events,[],'Stable target required, no HMR during the recorded run');
 await fs.writeFile(output+'/report.json',JSON.stringify({status:'PASS',url,checks,captures,errors,failures,events,visualReview:'pending',scope:'Isolated adult legacy fixture; actual UI/keyboard traversal, storage refusal/retry, pause, mobile, replacement cancellation, reload and physical return. Two complete AI escapes are engine-tested separately; 100 human artworks, ten reserves and complete new player animations are not claimed.'},null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,output}));
}catch(error){await capture('failure').catch(()=>{});await fs.writeFile(output+'/report.json',JSON.stringify({status:'FAIL',url,error:error.stack,checks,captures,errors,failures,events},null,2)+'\n');throw error;}
finally{await browser.close();}
