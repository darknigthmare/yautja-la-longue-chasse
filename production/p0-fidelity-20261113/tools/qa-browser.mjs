/** Inspect native candidates and comparison controls; never export asset pixels. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
const root = fileURLToPath(new URL('../../../',import.meta.url));
const output = path.join(root,'production/p0-fidelity-20261113/qa/browser');
const raw = await fs.readFile(path.join(root,'public/game/p0-fidelity-20261113/manifest.json'));
const manifest = JSON.parse(raw.toString('utf8'));
const checks=[], errors=[], failed=[];
await fs.mkdir(output,{recursive:true});
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page = await browser.newPage({viewport:{width:1440,height:1100}});
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
page.setDefaultTimeout(15000);
async function check(name,action) { try { checks.push({name,passed:true,...(await action() || {})}); } catch(e) { checks.push({name,passed:false,error:e.message}); } }
async function ready() { await page.waitForFunction(()=>[...document.querySelectorAll('#groups canvas')].every(c=>c.dataset.rendered==='true')); }
async function canvasHash(locator) { return locator.evaluate(c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=2166136261;for(const v of a)h=Math.imul(h^v,16777619);return h>>>0;}); }
try {
  await page.goto((process.env.P0_SPRITE_QA_ORIGIN || 'http://127.0.0.1:8765')+'/game/p0-fidelity-20261113/review.html',{waitUntil:'networkidle'});
  await ready();
  await check('The embedded catalogue and every native component render',async()=>{
    assert.deepEqual(JSON.parse(await page.locator('#pack-data').textContent()),manifest);
    assert.equal(await page.locator('[data-testid="asset-card"]').count(),manifest.assets.length);
    const stats=await page.evaluate(()=>window.__P0_FIDELITY_REVIEW__.getStats());
    assert.equal(stats.renderedAssets,manifest.assets.length);assert.equal(stats.renderedGroups,manifest.groups.length);assert.equal(stats.errors,0);
    return {stats};
  });
  await check('The source panes are labelled as original project art or previous mask candidates',async()=>{
    for(const group of manifest.groups) {
      const article=page.locator('[data-group-id="'+group.id+'"][data-testid="comparison-group"]');
      const text=await article.locator('.notice').textContent();
      assert.ok(text.includes(group.kind==='mask-correction'?'candidat antérieur':'référence originale du projet'));
    }
  });
  await check('Layer visibility, opacity, placement and reset affect the real composition',async()=>{
    const group=manifest.groups.find(g=>g.assetIds.length===2);
    assert.ok(group,'Expected the pylon/emission comparison');
    await page.locator('#group-filter').selectOption(group.id);await ready();
    const article=page.locator('[data-testid="comparison-group"]');
    const canvas=article.locator('[data-testid="composition-canvas"]');
    const before=await canvasHash(canvas);
    const effect=manifest.assets.find(a=>group.assetIds.includes(a.id)&&a.assetKind==='effect');assert.ok(effect);
    const initial=await page.evaluate(id=>window.__P0_FIDELITY_REVIEW__.getGroupState(id),group.id);
    const visible=article.locator('input[data-control="visible"][data-asset-id="'+effect.id+'"]');
    await visible.uncheck();
    await page.waitForFunction(({groupId,assetId})=>window.__P0_FIDELITY_REVIEW__.getGroupState(groupId).find(s=>s.assetId===assetId).visible===false,{groupId:group.id,assetId:effect.id});
    assert.notEqual(await canvasHash(canvas),before);
    await visible.check();
    await article.locator('input[data-control="opacity"][data-asset-id="'+effect.id+'"]').evaluate(input=>{input.value='0.25';input.dispatchEvent(new Event('input',{bubbles:true}));});
    await article.locator('input[data-control="x"][data-asset-id="'+effect.id+'"]').fill('25');
    await article.locator('input[data-control="scale"][data-asset-id="'+effect.id+'"]').fill('0.9');
    const changed=await page.evaluate(id=>window.__P0_FIDELITY_REVIEW__.getGroupState(id),group.id);
    assert.equal(changed.find(s=>s.assetId===effect.id).opacity,0.25);assert.equal(changed.find(s=>s.assetId===effect.id).x,25);
    await article.locator('[data-testid="reset-group"]').focus();await page.keyboard.press('Enter');await ready();
    assert.deepEqual(await page.evaluate(id=>window.__P0_FIDELITY_REVIEW__.getGroupState(id),group.id),initial);
    assert.equal(await canvasHash(page.locator('[data-testid="composition-canvas"]')),before);
    assert.equal(await page.evaluate(()=>document.activeElement?.dataset.testid),'reset-group');
  });
  await check('Filters, empty results, backgrounds and visible metadata work',async()=>{
    await page.locator('#search').fill('no-such-component-xyz');assert.equal(await page.locator('[data-testid="comparison-group"]').count(),0);assert.ok(await page.locator('#empty').isVisible());
    await page.locator('#search').fill('');
    for(const group of manifest.groups) {
      await page.locator('#group-filter').selectOption(group.id);await ready();
      assert.equal(await page.locator('[data-testid="comparison-group"]').count(),1);
      await page.locator('details').first().locator('summary').click();assert.ok(await page.locator('details').first().getAttribute('open')!==null);
      await page.locator('#show-bounds').check();await page.locator('#show-pivots').check();
      for(const bg of ['checker','dark','terrain']) { await page.locator('#background').selectOption(bg);assert.equal(await page.locator('body').getAttribute('data-background'),bg); }
      await page.locator('#show-bounds').uncheck();await page.locator('#show-pivots').uncheck();await page.locator('#background').selectOption('checker');
      await page.evaluate(()=>scrollTo(0,0));await ready();
      await page.screenshot({path:path.join(output,group.id+'.png'),fullPage:true});
    }
  });
  await check('320 and 390 pixel layouts retain source and control access without horizontal overflow',async()=>{
    for(const width of [320,390]) {
      await page.setViewportSize({width,height:844});await page.locator('#group-filter').selectOption(manifest.groups[0].id);await ready();await page.evaluate(()=>scrollTo(0,0));
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow at '+width);
      await page.screenshot({path:path.join(output,'mobile-'+width+'.png'),fullPage:true});
    }
  });
  await check('No page errors, missing rasters or game storage writes',async()=>{
    assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
    assert.equal((await page.evaluate(()=>window.__P0_FIDELITY_REVIEW__.getStats())).errors,0);
    assert.deepEqual(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length})),{local:0,session:0});
  });
} finally {
  const report={scope:'Static addendum gallery, native decoding and in-memory comparison controls; no art, canon, gameplay or animation approval',manifestSha256:createHash('sha256').update(raw).digest('hex'),browser:browser.version(),counts:manifest.counts,passed:checks.length===6&&checks.every(c=>c.passed),checks,errors,failedRequests:failed};
  await fs.writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');await browser.close();console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
}
