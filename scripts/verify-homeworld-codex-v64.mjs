import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {campaignFixture,enterCampaignDeck} from './campaign-browser-helpers.mjs';
const url=process.env.V64_QA_URL??'http://127.0.0.1:4182';
const output=process.env.V64_CODEX_QA_OUTPUT??'work-local/v64/qa/codex';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],checks=[];
let activePage;
try{
  for(const viewport of [{width:1440,height:1000},{width:393,height:852},{width:844,height:390}]){
    const page=await browser.newPage({viewport,reducedMotion:'reduce'});
    activePage=page;
    page.on('pageerror',error=>errors.push(error.message));
    const fixture=await campaignFixture();
    await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));},fixture);
    await enterCampaignDeck(page,{url});
    await page.getByRole('button',{name:'Yautja Prime · monde natal',exact:true}).click();
    const city=page.getByRole('group',{name:'Cité jouable en perspective 2.5D',exact:true});
    await city.waitFor();
    const paintedHero=page.locator('[data-homeworld-actor]').locator('[data-modular-homeworld-character],[data-whole-character-plate]').first();
    await paintedHero.waitFor({state:'attached'});
    const paintedRect=await paintedHero.boundingBox();
    const actorPainted=!!paintedRect&&paintedRect.width>10&&paintedRect.height>50;
    await page.locator('.toast').waitFor({state:'hidden',timeout:5000});
    await page.screenshot({path:`${output}/city-${viewport.width}x${viewport.height}.png`});
    await page.getByRole('button',{name:/Atlas de la cité/}).click();
    const dialog=page.getByRole('dialog',{name:'Atlas de la cité',exact:true});
    await dialog.getByRole('button',{name:'Codex des éléments',exact:true}).click();
    const codex=dialog.locator('[data-homeworld-element-codex="v64"]');
    const entries=codex.locator('[data-homeworld-element-id]');
    const count=await entries.count();assert(count>=150,'the catalogue must include buildings, doors, rooms and public geometry');
    const all=await entries.evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.homeworldElementId,label:node.textContent})));
    assert.equal(new Set(all.map(item=>item.id)).size,count);
    await codex.getByLabel('Famille',{exact:true}).selectOption('building');
    assert.equal(await entries.count(),43);
    await codex.getByLabel('Famille',{exact:true}).selectOption('interior');
    assert.equal(await entries.count(),43);
    await codex.getByLabel('Famille',{exact:true}).selectOption('floor');
    assert.equal(await entries.count(),43);
    await codex.getByLabel('Famille',{exact:true}).selectOption('panel');
    assert.equal(await entries.count(),286);
    await codex.getByLabel('Famille',{exact:true}).selectOption('door');
    assert.equal(await entries.count(),86,'43 exterior thresholds and 43 interior exits');
    const target=await entries.first().getAttribute('data-homeworld-element-id');
    await entries.first().click();
    const detail=codex.locator('[data-homeworld-element-detail]');
    assert.equal(await detail.getAttribute('data-homeworld-element-detail'),target);
    const description=await detail.innerText();assert.match(description,/Seuil \/ approche/i);assert.match(description,/Passage libre/i);assert(!/undefined|NaN/.test(description));
    const actor=page.locator('[data-homeworld-actor]');
    const position=()=>actor.evaluate(node=>({x:node.dataset.x,y:node.dataset.y}));
    const before=await position();
    const search=codex.getByLabel('Rechercher',{exact:true});
    await search.fill(target);await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(200);assert.deepEqual(await position(),before,'typing in the codex cannot move the hunter');
    assert.equal(await entries.count(),1);
    await search.fill('aucun-element-ne-porte-ce-nom-87452');assert.equal(await entries.count(),0);
    await search.fill('');await codex.getByLabel('Famille',{exact:true}).selectOption('all');
    assert.equal(await entries.count(),count);
    await page.screenshot({path:`${output}/${viewport.width}x${viewport.height}.png`});
    const geometry=await dialog.evaluate(node=>{const rect=node.getBoundingClientRect();return {dialogWidth:rect.width,dialogTop:rect.top,dialogBottom:rect.bottom,viewportWidth:window.innerWidth,viewportHeight:window.innerHeight,scrollWidth:document.documentElement.scrollWidth};});
    assert(geometry.dialogWidth<=geometry.viewportWidth);assert(geometry.scrollWidth<=geometry.viewportWidth+1);
    assert(geometry.dialogTop>=0&&geometry.dialogBottom<=geometry.viewportHeight+1,'the atlas must fit vertically on the game screen');
    await search.focus();await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
    checks.push({viewport,count,exteriorThresholds:43,interiorExits:43,buildings:43,interiors:43,target,geometry,actorPainted,paintedRect});
    await page.close();
  }
  assert.deepEqual(errors,[]);
  assert(checks.every(check=>check.actorPainted),'the painted actor must have a real visible extent in every viewport, independently of its zero-size foot anchor');
  await fs.writeFile(`${output}/report.json`,JSON.stringify({status:'PASS',url,checks,errors,scope:'Actual in-game read-only element codex, filtering, geometry details, keyboard isolation and responsive layouts. Does not certify every artwork pixel or every route.'},null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',checks:checks.length,output}));
}catch(error){
  if(activePage&&!activePage.isClosed()){
    await activePage.screenshot({path:`${output}/failure.png`}).catch(()=>{});
    const diagnostics=await activePage.evaluate(()=>{
      const nodes=[document.querySelector('[data-homeworld-actor]'),document.querySelector('[aria-label="Cité jouable en perspective 2.5D"]')].filter(Boolean);
      return nodes.map(node=>{const chain=[];for(let e=node;e&&chain.length<8;e=e.parentElement){const css=getComputedStyle(e),r=e.getBoundingClientRect();chain.push({tag:e.tagName,className:e.className,style:e.getAttribute('style'),rect:{x:r.x,y:r.y,width:r.width,height:r.height},display:css.display,visibility:css.visibility,opacity:css.opacity,transform:css.transform});}return chain;});
    });
    await fs.writeFile(`${output}/failure.json`,JSON.stringify({error:String(error),errors,checks,diagnostics},null,2));
  }
  throw error;
}finally{await browser.close();}
