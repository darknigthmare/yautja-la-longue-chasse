import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';
import { campaignFixture, enterCampaignDeck } from './campaign-browser-helpers.mjs';
import { choosePitFighter, choosePitStage, closePitSelectionOptions, openPitPause, resumePitFight, returnPitSelection } from './pit-selection-browser-helpers.mjs';

const url = process.env.V62_FIGHTERS_QA_URL || 'http://127.0.0.1:4182';
const output = process.env.V62_FIGHTERS_QA_OUTPUT || 'work-local/v62/qa/fighters';
const version = process.env.V62_FIGHTERS_QA_VERSION || 'V62';
const temp = path.resolve('work-local/v62/browser-temp');
await fs.mkdir(output, { recursive: true }); await fs.mkdir(temp, { recursive: true });
process.env.TEMP = temp; process.env.TMP = temp;
const fighter = JSON.parse(await fs.readFile('app/game/data/pitUserHuntersV62.json', 'utf8')).fighters[0];
const registry = JSON.parse(await fs.readFile('app/game/data/pitUserAnimationsV62.json', 'utf8'));
const atlas = registry[0].atlas;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourcePaths = ['app/game/systems/pitUserRoster.ts','app/game/systems/pitRosterIdentityV62.ts','app/game/pitRosterIcons.ts',
  'app/game/data/pitUserHuntersV62.json','app/game/data/pitUserAnimationsV62.json','app/game/pitSpriteSheetRegistry.ts','scripts/verify-pit-emissary-v62.mjs'];
const hashes = async () => Object.fromEntries(await Promise.all(sourcePaths.map(async file => [file, sha(await fs.readFile(file))])));
const sourceHashes = await hashes(), checks = [], captures = [], errors = [], badHttp = [];
let browser, context, page;
function observe(pages) {
  const native = new Map(pages.map(p => [p.src,p])), sources = new WeakMap();
  const original = CanvasRenderingContext2D.prototype.drawImage;
  const proof = window.__emissaryV62 = { draws: [], invalid: [], keys: new Set() };
  CanvasRenderingContext2D.prototype.drawImage = function(...args) {
    const result = original.apply(this,args), image = args[0];
    const src = image instanceof HTMLImageElement ? new URL(image.currentSrc || image.src,location.href).pathname : sources.get(image);
    if (src && native.has(src)) sources.set(this.canvas,src);
    if (!this.canvas.matches?.('canvas[data-pit-fighter-positions]') || !src || !native.has(src) || args.length !== 9) return result;
    const rect = args.slice(1,5), dest = args.slice(5), matrix = this.getTransform();
    const key = src + ':' + rect.join(',');
    const frame = Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame);
    if (!(matrix.a > 0 && matrix.d > 0 && dest[2] > 0 && dest[3] > 0) || Math.abs(dest[2]/rect[2]-dest[3]/rect[3]) > .000001) proof.invalid.push({src,rect,matrix:[matrix.a,matrix.d],dest});
    if (!proof.keys.has(key)) { proof.keys.add(key); proof.draws.push({src,rect,dest,frame,matrix:[matrix.a,matrix.d]}); }
    return result;
  };
}
const record = (name, detail = {}) => { checks.push({name,...detail}); console.log(JSON.stringify({passed:true,name})); };
const storage = () => page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort(([a],[b])=>a.localeCompare(b)))));
const frame = () => page.locator('[data-pit-frame]').getAttribute('data-pit-frame');
async function shot(name) { const file=path.join(output,name+'.png'); await page.screenshot({path:file}); captures.push({file:path.basename(file),sha256:sha(await fs.readFile(file)),visualReview:'pending-image-inspection'}); }
async function open({mobile=false,reduced=false}={}) {
  context = await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},isMobile:mobile,hasTouch:mobile,reducedMotion:reduced?'reduce':'no-preference'});
  const fixture=structuredClone(await campaignFixture()); fixture.save.settings.screenShake=false;
  await context.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),fixture);
  await context.addInitScript(observe,atlas.pages);
  page=await context.newPage();page.setDefaultTimeout(60000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)badHttp.push({url:r.url(),status:r.status()});});
  await enterCampaignDeck(page,{url});
  assert.equal(await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version'),version);
  await page.getByRole('button',{name:'THE PIT · combat',exact:true}).click();
  await closePitSelectionOptions(page);await page.getByRole('radio',{name:/^Versus local/}).click();await closePitSelectionOptions(page);
}
async function choose(slot=0) {
  await choosePitFighter(page,slot===0?fighter.id:'user-samurai');
  if(slot===0){await page.locator(`[data-pit-roster-icon="${fighter.id}"]`).evaluate(image=>image.decode());assert.equal(await page.locator('[data-pit-variant-select]').inputValue(),fighter.variants[0].id);await shot('roster-emissary');}
  await page.locator('[data-pit-selection-confirm]').click();
  await choosePitFighter(page,slot===0?'user-samurai':fighter.id);await page.locator('[data-pit-selection-confirm]').click();
  await choosePitStage(page,'arena-134-predator-hunting-grounds-overgrowth');
  await page.waitForFunction(()=>document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus==='ready');
  await page.locator('[data-pit-selection-confirm]').click();
  await page.locator('[data-pit-match-loading]').waitFor({state:'detached'});
  await page.waitForFunction(()=>document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase==='fight');
  await page.locator('[data-pit-immersive]').focus();
}
try {
  browser=await chromium.launch({channel:'chrome',headless:true});
  await open();const before=await storage();
  for(const slot of [0,1]) {
    await choose(slot);await page.waitForTimeout(2200);
    const evidence=await page.evaluate(()=>({draws:window.__emissaryV62.draws,invalid:window.__emissaryV62.invalid}));
    const wanted=atlas.clips.find(c=>c.facing===(slot===0?'right':'left'));
    const src=atlas.pages.find(p=>p.id===wanted.frames[0].pageId).src;
    const seen=evidence.draws.filter(d=>d.src===src);
    assert.equal(seen.length,6,'All six actual native idle rectangles must reach the duel canvas.');
    assert.deepEqual(evidence.invalid,[]);
    assert.equal(await page.locator(`[data-pit-bitmap-slot="${slot}"]`).getAttribute('data-pit-bitmap-status'),'sprite-sheet-animation');
    await shot(slot===0?'duel-native-right':'duel-native-left');
    await openPitPause(page);const paused=await frame();await page.waitForTimeout(250);assert.equal(await frame(),paused);
    await resumePitFight(page);
    if(slot===0){await page.keyboard.down('ArrowRight');await page.waitForTimeout(150);assert.equal(await page.locator('[data-pit-bitmap-slot="0"]').getAttribute('data-pit-bitmap-status'),'sprite-sheet-hold');await page.keyboard.up('ArrowRight');}
    assert.equal(await storage(),before);
    record('native-facing-'+wanted.facing,{nativeFrames:seen.length,mirrored:false,pauseStable:true,uncoveredMovement:'declared-native-stance',draws:seen});
    await returnPitSelection(page);await page.evaluate(()=>{window.__emissaryV62.draws=[];window.__emissaryV62.keys.clear();});
  }
  await context.close();
  await open({mobile:true,reduced:true});const mobileStorage=await storage();await choose(1);await page.waitForTimeout(1500);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await shot('mobile-left-reduced-motion');assert.equal(await storage(),mobileStorage);
  record('mobile-selection-and-duel',{viewport:[844,390],reducedMotionRequested:true,noHorizontalOverflow:true});
  assert.deepEqual(errors,[]);assert.deepEqual(badHttp,[]);assert.deepEqual(await hashes(),sourceHashes);
  const report={result:'PASS',url,version,checkedAt:new Date().toISOString(),fighterId:fighter.id,sourceHashes,checks,captures,errors,badHttp,
    limits:['Mobile Chromium emulation, not a physical device.','Idle only: movement/attacks retain a declared native stance.','No complete18-action kit or canon1:1 certification.']};
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:'PASS',checks:checks.length,captures:captures.length}));
} catch(error) {
  if(page&&!page.isClosed())await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});
  await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({error:String(error),url,checks,errors,badHttp,body:await page?.locator('body').innerText().catch(()=>null)},null,2));throw error;
} finally {await browser?.close();}
