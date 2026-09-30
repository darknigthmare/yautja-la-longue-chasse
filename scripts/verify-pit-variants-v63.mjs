import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';
import { campaignFixture, enterCampaignDeck } from './campaign-browser-helpers.mjs';
import { choosePitFighter, choosePitStage, closePitSelectionOptions, openPitPause, resumePitFight, returnPitSelection } from './pit-selection-browser-helpers.mjs';

const url=process.env.V63_FIGHTERS_QA_URL||'http://127.0.0.1:4182';
const output=process.env.V63_FIGHTERS_QA_OUTPUT||'work-local/v63/fighters/qa';
const version=process.env.V63_FIGHTERS_QA_VERSION||'V63';
const temp=path.resolve('work-local/v63/fighters/browser-temp');
await fs.mkdir(output,{recursive:true});await fs.mkdir(temp,{recursive:true});process.env.TEMP=temp;process.env.TMP=temp;
const additions=JSON.parse(await fs.readFile('app/game/data/pitUserVariantsV63.json','utf8')).variantAdditions;
const registry=JSON.parse(await fs.readFile('app/game/data/pitUserAnimationsV63.json','utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourcePaths=['app/game/systems/pitUserRoster.ts','app/game/data/pitUserVariantsV63.json','app/game/data/pitUserAnimationsV63.json','app/game/pitSpriteSheetRegistry.ts','scripts/verify-pit-variants-v63.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(sourcePaths.map(async f=>[f,sha(await fs.readFile(f))])));
const sourceHashes=await hashes(),checks=[],captures=[],errors=[],badHttp=[];
let browser,context,page,current;
function observe(pages){
  const native=new Map(pages.map(p=>[p.src,p])),sources=new WeakMap(),original=CanvasRenderingContext2D.prototype.drawImage;
  const proof=window.__variantsV63={draws:[],invalid:[],keys:new Set()};
  CanvasRenderingContext2D.prototype.drawImage=function(...args){
    const result=original.apply(this,args),image=args[0];
    const src=image instanceof HTMLImageElement?new URL(image.currentSrc||image.src,location.href).pathname:sources.get(image);
    if(src&&native.has(src))sources.set(this.canvas,src);
    if(!this.canvas.matches?.('canvas[data-pit-fighter-positions]')||!src||!native.has(src)||args.length!==9)return result;
    const rect=args.slice(1,5),dest=args.slice(5),matrix=this.getTransform(),key=src+':'+rect.join(',');
    if(!(matrix.a>0&&matrix.d>0&&dest[2]>0&&dest[3]>0)||Math.abs(dest[2]/rect[2]-dest[3]/rect[3])>.000001)proof.invalid.push({src,rect,matrix:[matrix.a,matrix.d],dest});
    if(!proof.keys.has(key)){proof.keys.add(key);proof.draws.push({src,rect,dest,matrix:[matrix.a,matrix.d]});}return result;
  };
}
const storage=()=>page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort(([a],[b])=>a.localeCompare(b)))));
const frame=()=>page.locator('[data-pit-frame]').getAttribute('data-pit-frame');
async function shot(name){const file=path.join(output,current.fighterId+'-'+name+'.png');await page.screenshot({path:file});captures.push({file:path.basename(file),sha256:sha(await fs.readFile(file)),visualReview:'pending-image-inspection'});}
async function open({mobile=false,reduced=false}={}){
  context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},isMobile:mobile,hasTouch:mobile,reducedMotion:reduced?'reduce':'no-preference'});
  const fixture=structuredClone(await campaignFixture());fixture.save.settings.screenShake=false;
  await context.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),fixture);
  await context.addInitScript(observe,registry.filter(e=>e.fighterId===current.fighterId).flatMap(e=>e.atlas.pages));
  page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)badHttp.push({url:r.url(),status:r.status()});});
  await enterCampaignDeck(page,{url});assert.equal(await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version'),version);
  await page.getByRole('button',{name:'THE PIT · combat',exact:true}).click();await closePitSelectionOptions(page);
  await page.getByRole('radio',{name:/^Versus local/}).click();await closePitSelectionOptions(page);
}
async function choose(slot){
  await choosePitFighter(page,slot===0?current.fighterId:'user-samurai');
  if(slot===0){await page.locator('[data-pit-variant-select]').selectOption(current.variants[0].id);assert.equal(await page.locator('[data-pit-variant-select]').inputValue(),current.variants[0].id);
    await page.locator(`[data-fighter-id="${current.fighterId}"][data-fighter-variant="${current.variants[0].id}"] img[data-art-ready="true"]`).waitFor({state:'visible'});await shot('roster');}
  await page.locator('[data-pit-selection-confirm]').click();await choosePitFighter(page,slot===1?current.fighterId:'user-samurai');
  if(slot===1){await page.locator('[data-pit-variant-select]').selectOption(current.variants[0].id);
    await page.locator(`[data-fighter-id="${current.fighterId}"][data-fighter-variant="${current.variants[0].id}"] img[data-art-ready="true"]`).waitFor({state:'visible'});}
  await page.locator('[data-pit-selection-confirm]').click();await choosePitStage(page,'arena-134-predator-hunting-grounds-overgrowth');
  await page.waitForFunction(()=>document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus==='ready');
  await page.locator('[data-pit-selection-confirm]').click();await page.locator('[data-pit-match-loading]').waitFor({state:'detached'});
  await page.waitForFunction(()=>document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase==='fight');await page.locator('[data-pit-immersive]').focus();
}
try{
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(current of additions){
    await open();const before=await storage();
    for(const slot of[0,1]){
      await choose(slot);await page.waitForTimeout(2300);const evidence=await page.evaluate(()=>({draws:window.__variantsV63.draws,invalid:window.__variantsV63.invalid}));
      const facing=slot===0?'right':'left',entry=registry.find(e=>e.fighterId===current.fighterId&&!e.heldPoseClips),clip=entry.atlas.clips.find(c=>c.facing===facing);
      const src=entry.atlas.pages.find(p=>p.id===clip.frames[0].pageId).src,seen=evidence.draws.filter(d=>d.src===src);
      assert.equal(seen.length,6);assert.deepEqual(evidence.invalid,[]);
      assert.equal(await page.locator(`[data-pit-bitmap-slot="${slot}"]`).getAttribute('data-pit-bitmap-status'),'sprite-sheet-animation');await shot('duel-'+facing);
      await openPitPause(page);const paused=await frame();await page.waitForTimeout(250);assert.equal(await frame(),paused);await resumePitFight(page);
      if(slot===0){await page.keyboard.down('ArrowRight');await page.waitForTimeout(150);assert.equal(await page.locator('[data-pit-bitmap-slot="0"]').getAttribute('data-pit-bitmap-status'),'sprite-sheet-hold');await page.keyboard.up('ArrowRight');}
      assert.equal(await storage(),before);checks.push({fighterId:current.fighterId,variantId:current.variants[0].id,facing,nativeFrames:6,mirrored:false,pauseStable:true,uncoveredMovement:'declared-native-stance',draws:seen});
      console.log(JSON.stringify({passed:true,fighterId:current.fighterId,facing}));
      await returnPitSelection(page);await page.evaluate(()=>{window.__variantsV63.draws=[];window.__variantsV63.keys.clear();});
    }
    await context.close();await open({mobile:true,reduced:true});const mobileStorage=await storage();await choose(1);await page.waitForTimeout(1500);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await shot('mobile-left-reduced');assert.equal(await storage(),mobileStorage);
    checks.push({fighterId:current.fighterId,variantId:current.variants[0].id,mobile:true,viewport:[844,390],reducedMotionRequested:true,noHorizontalOverflow:true});await context.close();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(badHttp,[]);assert.deepEqual(await hashes(),sourceHashes);
  const report={result:'PASS',url,version,checkedAt:new Date().toISOString(),sourceHashes,checks,captures,errors,badHttp,
    limits:['Mobile Chromium landscape emulation, not a physical device.','Only idle cycles are authored; movement/attacks retain a declared native stance.','No complete eighteen-action kit or canonical1:1 certification.']};
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:'PASS',checks:checks.length,captures:captures.length}));
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});
  await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({error:String(error),url,checks,errors,badHttp,body:await page?.locator('body').innerText().catch(()=>null)},null,2));throw error;
}finally{await browser?.close();}
