import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {campaignFixture, enterCampaignDeck} from './campaign-browser-helpers.mjs';

const url = process.env.MAUSOLEUM_QA_URL || 'http://127.0.0.1:4174';
const output = process.env.MAUSOLEUM_QA_OUTPUT || 'work-local/v56/qa/mausoleum-browser';
await fs.mkdir(output, {recursive:true});
const bundle = await build({stdin:{contents:'export {HOMEWORLD_POINTS} from "./app/game/systems/homeworld.ts"; export {homeworldSpatialRoute} from "./app/game/systems/homeworldSpatialCodex.ts"; export {MAUSOLEUM_CHRONICLES} from "./app/game/systems/mausoleum.ts";',resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent'});
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const checks=[], errors=[], failures=[], captures=[];
const report={passed:false,url,checkedAt:new Date().toISOString(),checks,errors,failures,captures,scope:'Isolated synthetic campaign prerequisite; real UI and keyboard time, no actor/engine/time manipulation. Preview must preserve every storage byte. No DLC campaign or full-body mask animation is claimed.'};
const browser = await chromium.launch({channel:'chrome',headless:true});
let context,page;
const check=(name,details={})=>{checks.push({name,...details});console.log(JSON.stringify({check:name,passed:true}));};
const allStorage=()=>page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).sort(([a],[b])=>a.localeCompare(b))));
const saved=async()=>JSON.parse((await allStorage())['yautja-long-hunt.save']);
const shot=async name=>{await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});captures.push(name+'.png');};
async function newContext(){
  context=await browser.newContext({viewport:{width:1280,height:900}});page=await context.newPage();page.setDefaultTimeout(25000);
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
}
async function decoded(){
  const images=await page.locator('[data-mausoleum] img').evaluateAll(async list=>{await Promise.all(list.map(img=>img.decode()));return list.map(img=>({src:img.getAttribute('src'),width:img.naturalWidth,height:img.naturalHeight}));});
  assert(images.length>=5&&images.every(img=>img.width>0&&img.height>0));return images;
}
async function approach(id){
  await page.locator(`[data-mausoleum-dlc="${id}"]`).click();
  await page.getByRole('button',{name:new RegExp('· Examiner '+api.MAUSOLEUM_CHRONICLES.find(x=>x.id===id).title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')}).waitFor();
  // Approaching only shows the prompt; opening the dossier is a separate action.
  await page.getByRole('button',{name:/· Examiner /}).click();
  await page.getByRole('dialog').waitFor();
}
async function walkTo(target){
  const actor=()=>page.locator('[data-homeworld-actor]').evaluate(el=>({x:Number(el.dataset.x),y:Number(el.dataset.y)}));
  const start=await actor(),route=api.homeworldSpatialRoute(start,target);assert.equal(route.status,'reachable');
  const viewport=page.getByRole('group',{name:'Cité jouable en perspective 2.5D',exact:true});await viewport.focus();
  let anchor=start,inputs=0;
  for(const endpoint of route.points.slice(1)){
    const count=Math.max(1,Math.ceil(Math.hypot(endpoint.x-anchor.x,endpoint.y-anchor.y)/24)),segment=anchor;
    for(let i=1;i<=count;i++){
      const goal={x:segment.x+(endpoint.x-segment.x)*i/count,y:segment.y+(endpoint.y-segment.y)*i/count};
      for(let attempt=0;attempt<25;attempt++){
        const actual=await actor(),dx=goal.x-actual.x,dy=goal.y-actual.y;if(Math.hypot(dx,dy)<10)break;
        const keys=[];if(Math.abs(dx)>4)keys.push(dx>0?'ArrowRight':'ArrowLeft');if(Math.abs(dy)>4)keys.push(dy>0?'ArrowDown':'ArrowUp');
        const duration=Math.max(18,Math.min(65,Math.max(Math.abs(dx)/330,Math.abs(dy)/260)*1000*(keys.length===2?1.2:1)));
        for(const key of keys)await page.keyboard.down(key);await page.waitForTimeout(duration);for(const key of keys)await page.keyboard.up(key);await page.waitForTimeout(20);inputs++;
        if(attempt===24)throw Error('Blocked keyboard route: '+JSON.stringify({actual,goal}));
      }
    }anchor=endpoint;
  }
  const actual=await actor();assert(Math.hypot(actual.x-target.x,actual.y-target.y)<25);return {start,target,actual,inputs};
}
try{
  await newContext();await page.goto(url,{waitUntil:'networkidle',timeout:120000});
  const entry=page.getByRole('button',{name:/DLC \/ Chroniques de chasse/});await entry.waitFor();await page.waitForFunction(()=>{const b=[...document.querySelectorAll('button')].find(n=>n.textContent.includes('DLC / Chroniques'));return b&&!b.disabled;});
  const previewStorage=await allStorage();await entry.click();await page.locator('[data-mausoleum-source="menu"]').waitFor();
  const seen=new Set();
  for(const gallery of ['Premières galeries','Grandes Chasses','Galerie interdite']){
    await page.getByRole('button',{name:gallery,exact:true}).click();
    for(let i=0;i<3;i++){
      for(const id of await page.locator('[data-mausoleum-dlc]').evaluateAll(nodes=>nodes.map(n=>n.dataset.mausoleumDlc)))seen.add(id);
      await decoded();const next=page.getByRole('button',{name:'Alcôves →',exact:true});if(await next.isDisabled())break;await next.click();
    }
  }
  assert.deepEqual([...seen].sort(),api.MAUSOLEUM_CHRONICLES.map(e=>e.id).sort());check('menu-catalogue-nine-chronicles',{ids:[...seen]});
  await page.getByRole('button',{name:'Premières galeries',exact:true}).click();await approach('prey');
  assert(await page.getByRole('button',{name:'Revêtir une reproduction d’étude',exact:true}).isDisabled());assert(await page.getByRole('button',{name:'Lancer la chronique · non installée',exact:true}).isDisabled());
  await shot('01-menu-dossier-prey');
  const dialog=page.getByRole('dialog');await dialog.focus();await page.keyboard.press('Shift+Tab');assert(await dialog.evaluate(el=>el.contains(document.activeElement)));
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});await shot('02-menu-hall');
  for(const viewport of [{width:390,height:844},{width:844,height:390}]){
    await page.setViewportSize(viewport);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await decoded();await shot('03-menu-'+viewport.width);
  }
  await page.keyboard.press('Escape');await entry.waitFor();assert.deepEqual(await allStorage(),previewStorage);check('menu-preview-responsive-no-save-mutation',{viewports:[[390,844],[844,390]],ritualDisabled:true});
  await context.close();

  await newContext();const fixture=structuredClone(await campaignFixture());fixture.save.profile.rankId='elite';fixture.save.profile.honor=650;
  await context.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),fixture);
  await enterCampaignDeck(page,{url});await page.getByRole('button',{name:'Yautja Prime · monde natal',exact:true}).click();await page.locator('[data-homeworld-hub]').waitFor();
  const point=api.HOMEWORLD_POINTS.find(p=>p.id==='mausoleum-service');assert(point);const route=await walkTo(point);
  await page.getByRole('button',{name:'Interagir avec le point proche',exact:true}).click();
  await page.getByRole('button',{name:'Accéder au service',exact:true}).click();await page.locator('[data-mausoleum-source="homeworld"]').waitFor();check('physical-homeworld-entry',{route});
  const cityPosition=await page.locator('[data-homeworld-actor]').evaluate(el=>({x:el.dataset.x,y:el.dataset.y})),baseline=await saved();
  await decoded();await shot('04-homeworld-hall');
  await approach('predator');assert(await page.getByRole('button',{name:'Revêtir une reproduction d’étude',exact:true}).isEnabled());
  await page.evaluate(()=>{window.__mausoleumQaPhases=[];const root=document.querySelector('[data-mausoleum]');window.__mausoleumQaObserver=new MutationObserver(()=>window.__mausoleumQaPhases.push(root.dataset.mausoleumPhase));window.__mausoleumQaObserver.observe(root,{attributes:true,attributeFilter:['data-mausoleum-phase']});});
  await page.getByRole('button',{name:'Revêtir une reproduction d’étude',exact:true}).click();
  await page.locator('[data-mausoleum-phase="archive"]').waitFor();await shot('05-study-archive');
  assert.equal(await page.locator('[data-pit-immersive]').count(),0);assert.deepEqual((await saved()).trophies,baseline.trophies);
  await page.getByRole('button',{name:'Retirer le masque et revenir',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  const phases=await page.evaluate(()=>window.__mausoleumQaPhases);for(const phase of ['take','inspect','wear','boot','archive','remove','replace'])assert(phases.includes(phase),'Unobserved phase '+phase);
  assert((await saved()).homeworld.mausoleum.consultedIds.includes('predator'));check('study-sequence-and-durable-record',{phases,fullBodyAnimation:false,campaignLaunched:false});
  await page.getByRole('button',{name:'Galerie interdite',exact:true}).click();await approach('predators');
  await page.getByRole('button',{name:'Tracker',exact:true}).click();assert(await page.getByRole('button',{name:'Revêtir une reproduction d’étude',exact:true}).isDisabled());await shot('06-tracker-missing-representation');await page.keyboard.press('Escape');
  await page.getByRole('button',{name:/Retour à la cité/}).click();await page.locator('[data-mausoleum]').waitFor({state:'hidden'});assert.deepEqual(await page.locator('[data-homeworld-actor]').evaluate(el=>({x:el.dataset.x,y:el.dataset.y})),cityPosition);
  const after=await saved();for(const key of ['profile','trophies','prologue','loadout','youthTraining'])assert.deepEqual(after[key],baseline[key],key+' changed by study');
  const beforeWorld=structuredClone(baseline.homeworld),afterWorld=structuredClone(after.homeworld);delete beforeWorld.mausoleum;delete afterWorld.mausoleum;assert.deepEqual(afterWorld,beforeWorld);
  check('exact-return-and-campaign-progress-isolation');
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);report.passed=true;
}catch(error){report.error=String(error.stack||error);await shot('failure').catch(()=>{});process.exitCode=1;console.error(error);}
finally{await context?.close().catch(()=>{});await browser.close();await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,checks:checks.length,output}));}
