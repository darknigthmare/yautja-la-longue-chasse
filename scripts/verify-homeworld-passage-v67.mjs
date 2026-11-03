import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {campaignFixture} from './campaign-browser-helpers.mjs';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';

const url=process.env.V67_QA_URL??'http://127.0.0.1:4184';
const output=process.env.V67_PASSAGE_QA_OUTPUT??'work-local/v67/qa/passages';
await fs.mkdir(output,{recursive:true});
const api=homeworldQaModelV64(process.cwd(),['homeworldPassageV67.ts','homeworldCity.ts','homeworldSpatialCodex.ts']);
const base=await campaignFixture();
const browser=await chromium.launch({channel:'chrome',headless:true});
let page;const checks=[],captures=[],errors=[],failures=[],routes=[];
const ashReport={expeditionId:'ash-marches',trueTrailInspected:true,falseTrailRejected:true,obstacleMoved:true,convoyRecovered:true,shortcutOpened:true,secretFound:false,ticks:7250};
try{
 for(const regionId of ['ash-marches','glass-desert']){
  const context=await browser.newContext({viewport:{width:1440,height:950}});page=await context.newPage();page.setDefaultTimeout(60000);
  page.on('pageerror',error=>errors.push({regionId,message:error.message}));page.on('response',r=>{if(r.status()>=400)failures.push({regionId,url:r.url(),status:r.status()});});
  const fixture=structuredClone(base);fixture.save.homeworld.evidenceIds=['suspect-trophy'];
  if(regionId==='glass-desert')fixture.save.homeworld.expeditions['ash-marches']=ashReport;
  fixture.save.homeworldPassageV67=api.createHomeworldPassageV67(regionId,'outbound','qa-'+regionId);
  await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(window.__passageRefuse&&k===key)throw new DOMException('Isolated passage QA refusal','QuotaExceededError');return original.call(this,k,v);};},fixture);
  await page.clock.install();await page.goto(url,{waitUntil:'networkidle'});await page.getByRole('button',{name:/^Continuer/}).click();
  const scene=()=>page.locator('[data-homeworld-passage-v67]'),viewport=()=>scene().getByRole('group'),saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),fixture.key);
  const state=()=>scene().evaluate(e=>({x:Number(e.dataset.passageX),y:Number(e.dataset.passageY),tick:Number(e.dataset.passageTick),paused:e.dataset.passagePaused,status:e.dataset.passageStatus}));
  const capture=async name=>{const file=output+'/'+regionId+'-'+name+'.jpg';await page.screenshot({path:file,type:'jpeg',quality:88});captures.push(file);};
  await scene().waitFor();await page.waitForFunction(()=>document.querySelector('[data-homeworld-passage-v67]')?.getAttribute('data-passage-assets')==='true');
  const masks=await scene().locator('svg mask').evaluateAll(elements=>elements.map(e=>({units:e.getAttribute('maskUnits'),width:Number(e.getAttribute('width')),height:Number(e.getAttribute('height'))})));
  assert.equal(masks.length,2);assert(masks.every(m=>m.units==='userSpaceOnUse'&&m.width>=22000&&m.height>=2000),'Masks use explicit world bounds rather than cropping the thick road stroke');
  await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+200)));
  const tick=ms=>page.clock.runFor(ms),held=new Set();
  const keys=async next=>{for(const key of held)if(!next.has(key)){await page.keyboard.up(key);held.delete(key);}for(const key of next)if(!held.has(key)){await page.keyboard.down(key);held.add(key);}};
  const focus=async()=>{await viewport().focus();await tick(48);};
  const start=async()=>{await scene().getByRole('button',{name:/^(Commencer la marche|Reprendre la marche|Réessayer la sauvegarde et reprendre)$/}).click();await tick(64);assert(await viewport().evaluate(e=>e===document.activeElement),'Resuming returns focus to the playable viewport');await focus();};
  await capture('briefing');await start();
  const before=await saved();await keys(new Set(['ArrowRight']));await tick(800);await keys(new Set());await tick(64);assert((await state()).x>500);
  await scene().getByRole('button',{name:'Pause',exact:true}).click({force:true});await tick(64);const paused=await state();await tick(1000);assert.equal((await state()).tick,paused.tick);
  await start();await scene().getByRole('button',{name:'Codex du passage',exact:true}).click();await tick(64);assert.match(await scene().innerText(),/Orthographique, angle de 35°/);await capture('codex');
  await page.setViewportSize({width:393,height:852});await tick(64);
  const focusedBounds=()=>page.evaluate(()=>{const e=document.activeElement,p=e?.closest('[role=dialog]');return{focus:e?.getBoundingClientRect().toJSON(),panel:p?.getBoundingClientRect().toJSON(),text:e?.textContent?.slice(0,40)};});
  const initialPortraitFocus=await focusedBounds();assert(initialPortraitFocus.focus.top>=initialPortraitFocus.panel.top-1&&initialPortraitFocus.focus.bottom<=initialPortraitFocus.panel.bottom+1);
  await page.keyboard.press('Tab');await tick(32);const portraitTabFocus=await focusedBounds();assert(portraitTabFocus.focus.top>=portraitTabFocus.panel.top&&portraitTabFocus.focus.bottom<=portraitTabFocus.panel.bottom,'Portrait Tab target scrolls visibly inside the codex');
  await capture('codex-portrait');await page.keyboard.press('Shift+Tab');await tick(32);const portraitReverseFocus=await focusedBounds();assert(portraitReverseFocus.focus.top>=portraitReverseFocus.panel.top&&portraitReverseFocus.focus.bottom<=portraitReverseFocus.panel.bottom);
  await page.setViewportSize({width:1440,height:950});await tick(64);
  const focusStates=[];for(let n=0;n<8;n++){focusStates.push(await page.evaluate(()=>({tag:document.activeElement?.tagName,text:document.activeElement?.textContent?.slice(0,80),inside:!!document.activeElement?.closest('[role=dialog]')})));await page.keyboard.press('Tab');await tick(32);}
  assert(focusStates.every(s=>s.inside),'Every Tab stays inside the codex');
  await page.keyboard.press('Shift+Tab');assert(await page.evaluate(()=>!!document.activeElement?.closest('[role=dialog]')));
  assert(await scene().locator('header').evaluate(e=>e.inert));assert(await scene().locator('nav').evaluate(e=>e.inert));
  await scene().locator('header button').last().evaluate(e=>e.focus());
  assert(await page.evaluate(()=>!!document.activeElement?.closest('[role=dialog]')),'Underlying Resume cannot receive focus or be keyboard-activated');
  await page.keyboard.press('Escape');await tick(64);assert.equal(await scene().getByRole('dialog',{name:'Codex du passage',exact:true}).count(),0);assert.equal((await state()).paused,'true');
  assert(await page.evaluate(()=>!!document.activeElement?.closest('[role=dialog][aria-label="Passage en pause"]')));
  checks.push({regionId,check:'codex-focus-audit',focusStates,focusContained:true,reverseTabContained:true,backgroundInert:true,escapeClosesOnlyCodex:true,pauseRetained:true,initialPortraitFocus,portraitTabFocus,portraitReverseFocus,masks});
  await scene().getByRole('button',{name:'Réglages',exact:true}).click({force:true});await tick(96);
  const settings=page.getByRole('dialog',{name:'Réglages du biomask',exact:true});await settings.waitFor();
  assert(await settings.evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+35);return !!hit&&e.contains(hit);}),'Settings are actually above the passage');
  await settings.getByRole('button',{name:'Fermer',exact:true}).click();await tick(64);assert.equal((await state()).paused,'true');
  await start();const durable=(await saved()).homeworldPassageV67;await page.evaluate(()=>window.__passageRefuse=true);await keys(new Set(['ArrowRight']));await tick(3400);await keys(new Set());
  assert.deepEqual((await saved()).homeworldPassageV67,durable);assert.match(await scene().innerText(),/Écriture impossible/);const refused=await state();await tick(700);assert.equal((await state()).tick,refused.tick);await capture('quota-refusal');
  await page.evaluate(()=>window.__passageRefuse=false);await start();

  const definition=api.HOMEWORLD_PASSAGES_V67[regionId];
  async function drive(a,b){
   let stagnant=0,last=await state();
   for(let attempt=0;attempt<2000;attempt++){
    const p=await state(),dx=b.x-p.x,dy=b.y-p.y;
    if(Math.abs(dx)<10&&Math.abs(dy)<10){await keys(new Set());await tick(32);return;}
    const direction=Math.sign(b.x-a.x),lookX=Math.max(Math.min(a.x,b.x),Math.min(Math.max(a.x,b.x),p.x+direction*40));
    const desiredY=a.y+(b.y-a.y)*(lookX-a.x)/(b.x-a.x),errorY=desiredY-p.y;
    const next=new Set();if(Math.abs(dx)>=10&&Math.abs(errorY)<48)next.add(dx>0?'ArrowRight':'ArrowLeft');
    const vertical=Math.abs(dx)<25?dy:errorY;if(Math.abs(vertical)>7)next.add(vertical>0?'ArrowDown':'ArrowUp');
    // Slow the physical keyboard pulse near a corner; 80 ms steps can overshoot a 10-unit target forever.
    const pulse=Math.hypot(dx,dy)<100?Math.max(16,Math.min(80,Math.hypot(dx,dy)/660*1000)):80;
    await keys(next);await tick(pulse);
    const after=await state();if(Math.hypot(after.x-last.x,after.y-last.y)<1)stagnant++;else stagnant=0;
    assert(stagnant<30,'Physical route stalled '+JSON.stringify({regionId,a,b,p}));last=after;
   }
   throw Error('Route iteration budget exceeded '+JSON.stringify({regionId,a,b,last:await state()}));
  }
  for(let index=1;index<definition.nodes.length;index++){
   const a=definition.nodes[index-1],b=definition.nodes[index];
   if(index===3){const mid={x:(a.x+b.x)/2,y:a.y};await drive(a,mid);await capture('bridge');
    await scene().getByRole('button',{name:'Pause',exact:true}).click({force:true});await tick(64);const checkpoint=(await saved()).homeworldPassageV67;
    await page.setViewportSize({width:844,height:390});await tick(96);await start();await capture('landscape');
    const layout=await scene().evaluate(e=>({width:innerWidth,height:innerHeight,viewport:e.querySelector('[role=group]').getBoundingClientRect().toJSON(),buttons:[...e.querySelectorAll('[data-passage-move]')].map(b=>b.getBoundingClientRect().toJSON())}));
    assert(layout.viewport.width>=layout.width*.95);assert(layout.viewport.height>=layout.height*.6);assert(layout.buttons.every(b=>b.width>=44&&b.height>=44&&b.right<=layout.width&&b.bottom<=layout.height));
    const left=scene().locator('[data-passage-move=left]'),box=await left.boundingBox(),x=(await state()).x;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await tick(300);await page.mouse.up();await tick(64);assert((await state()).x<x-40);
    await scene().getByRole('button',{name:'Pause',exact:true}).click({force:true});await tick(96);const exact=(await saved()).homeworldPassageV67;
    await page.setViewportSize({width:393,height:852});await tick(64);await capture('portrait-pause');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.clock.resume();await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:/^Continuer/}).click();await scene().waitFor();
    await page.waitForFunction(()=>document.querySelector('[data-homeworld-passage-v67]')?.getAttribute('data-passage-assets')==='true');assert.deepEqual((await saved()).homeworldPassageV67,exact);
    await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+200)));await page.setViewportSize({width:1440,height:950});await tick(96);await start();
    checks.push({regionId,check:'quota-retry-pause-touch-reload',layout,savedTick:checkpoint.tick,reloadedTick:exact.tick});
   }
   await drive(a,b);if(index===4)await capture('road-turn');if(index===6)await capture('bridge-junction');routes.push({regionId,direction:'outbound',node:index,position:await state()});console.log(regionId+' outbound '+index+'/9');
  }
  await keys(new Set());await focus();await page.keyboard.press('KeyE');await tick(150);
  await page.clock.resume();await page.locator('[data-homeworld-expedition="'+regionId+'"]').waitFor();
  assert.equal((await saved()).homeworldPassageV67.status,'at-biome');await capture('biome-reached');
  await page.getByRole('button',{name:'Retour sans rapport',exact:true}).click();await page.getByRole('button',{name:'Abandonner et rentrer',exact:true}).click();await scene().waitFor();
  await page.waitForFunction(()=>document.querySelector('[data-homeworld-passage-v67]')?.getAttribute('data-passage-assets')==='true');
  assert.equal((await saved()).homeworldPassageV67.direction,'return');assert.equal((await saved()).homeworldPassageV67.actor.x,definition.nodes.at(-1).x);
  await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+200)));await start();
  for(let index=definition.nodes.length-2;index>=0;index--){await drive(definition.nodes[index+1],definition.nodes[index]);routes.push({regionId,direction:'return',node:index,position:await state()});console.log(regionId+' return '+index+'/9');}
  await keys(new Set());await focus();await page.keyboard.press('KeyE');await tick(150);await page.clock.resume();
  await page.locator('[data-homeworld-hub]:visible').waitFor();assert.equal((await saved()).homeworldPassageV67,null);
  const actor=await page.locator('[data-homeworld-actor]').evaluate(e=>({x:Number(e.dataset.x),y:Number(e.dataset.y)}));
  const regionPoint=api.HOMEWORLD_POINT_POSITIONS['region-'+regionId];assert(Math.hypot(actor.x-regionPoint.x,actor.y-regionPoint.y)<180);
  const after=await saved();for(const field of ['profile','inventory','trophies','justice','loadout','missionProgress'])assert.deepEqual(after[field],before[field]);assert.deepEqual(after.homeworld.expeditions,before.homeworld.expeditions);
  await capture('city-return');checks.push({regionId,check:'physical-roundtrip',outboundAndReturnNodes:routes.filter(r=>r.regionId===regionId).length,arrival:actor,noAwards:true,biomeVisit:'Entered then explicitly abandoned without claiming completion'});
  await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 await fs.writeFile(output+'/report.json',JSON.stringify({status:'PASS',url,checks,captures,routes,errors,failures,visualReview:'pending',scope:'Two isolated entrance checkpoint fixtures; true keyboard walking of both full outbound and return routes, native scene, quota/retry, reload, touch, actual biome entry and city return. Glass fixture declares prior Ash report; neither biome investigation is claimed completed.'},null,2));
 console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,output}));
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:output+'/failure.jpg',type:'jpeg',quality:88}).catch(()=>{});await fs.writeFile(output+'/report.json',JSON.stringify({status:'FAIL',url,error:error.stack,checks,captures,routes,errors,failures},null,2));throw error;}finally{await browser.close();}
