/** Native PNG decoding and gallery interactions; no asset pixels are written. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const publicRoot = path.join(root, 'public/game/p0-sprites-20261113');
const output = process.env.P0_SPRITE_QA_OUTPUT || path.join(root, 'production/p0-sprites-20261113/qa/browser');
const origin = process.env.P0_SPRITE_QA_ORIGIN || 'http://127.0.0.1:8765';
const manifestBytes = await fs.readFile(path.join(publicRoot, 'manifest.json'));
const manifestSha256 = createHash('sha256').update(manifestBytes).digest('hex');
const manifest = JSON.parse(manifestBytes.toString('utf8'));
const checks = [], pageErrors = [], failedRequests = [];
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
const context = await browser.newContext({viewport:{width:1440,height:1100}, deviceScaleFactor:1});
const page = await context.newPage();
page.on('pageerror', error => pageErrors.push(error.message));
page.on('response', response => { if (response.status() >= 400) failedRequests.push({url:response.url(),status:response.status()}); });
page.setDefaultTimeout(15000);
async function check(name, action) {
  try { const detail = await action(); checks.push({name,passed:true,...(detail || {})}); }
  catch (error) { checks.push({name,passed:false,error:error.message}); }
}
async function rendered() {
  await page.waitForFunction(() => [...document.querySelectorAll('#grid canvas')].filter(c => c.getBoundingClientRect().top < innerHeight+350 && c.getBoundingClientRect().bottom > -350).every(c => c.dataset.rendered === 'true'));
}
async function category(name) {
  await page.locator('#categories button[data-category="'+name+'"]').click();
  await rendered();
}
try {
  await page.goto(origin+'/game/p0-sprites-20261113/review.html', {waitUntil:'networkidle'});
  await check('Native catalogue and gallery agree', async () => {
    const embedded = await page.locator('#pack-data').textContent();
    assert.deepEqual(JSON.parse(embedded), manifest);
    assert.equal(await page.locator('#grid article').count(), manifest.assets.length);
    return {assets:manifest.assets.length,nativeFiles:manifest.nativeFiles.length,designIdentities:manifest.counts.designIdentities};
  });
  await check('Every native source rectangle decodes; opaque backgrounds are distinguished from sprites', async () => {
    const cards = page.locator('#grid article');
    const measurements = [];
    for (let i=0;i<manifest.assets.length;i++) {
      await cards.nth(i).scrollIntoViewIfNeeded();
      const canvas = cards.nth(i).locator('canvas');
      await page.waitForFunction(id => document.querySelector('canvas[data-asset-id="'+id+'"]')?.dataset.rendered === 'true', manifest.assets[i].id);
      const result = await canvas.evaluate(c => {
        const pixels = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
        let transparent=0,solid=0;
        for(let p=3;p<pixels.length;p+=4) { if(pixels[p]===0) transparent++; if(pixels[p]>=240) solid++; }
        return {id:c.dataset.assetId,transparent,solid,rendered:c.dataset.rendered};
      });
      assert.ok(result.solid > 100, result.id+' has no solid subject');
      if(manifest.assets[i].assetKind !== 'background') assert.ok(result.transparent > 100, result.id+' has no transparent surround');
      result.assetKind = manifest.assets[i].assetKind || 'sprite';
      measurements.push(result);
    }
    return {rendered:measurements.length,measurements};
  });
  await page.evaluate(() => scrollTo(0,0));
  await check('Family filters, alpha and pivot controls and compositing backgrounds', async () => {
    for(const name of Object.keys(manifest.counts.byCategory)) {
      await category(name);
      assert.equal(await page.locator('#grid article').count(), manifest.counts.byCategory[name]);
    }
    await category('props');
    for(const background of ['checker','dark','game']) {
      await page.locator('#background').selectOption(background);
      assert.equal(await page.locator('body').getAttribute('data-background'),background);
    }
    await page.locator('#show-bounds').check();
    await page.locator('#show-pivots').check();
    await rendered();
    await page.screenshot({path:path.join(output,'props-terrain-pivots.png')});
    await page.locator('#show-bounds').uncheck();
    await page.locator('#show-pivots').uncheck();
    await page.locator('#background').selectOption('checker');
  });
  await check('Search resolves identity, empty results and native opposite views', async () => {
    await category('all');
    await page.locator('#search').fill('no-such-sprite-xyz');
    assert.equal(await page.locator('#grid article').count(),0);
    assert.ok(await page.locator('#empty').isVisible());
    await page.locator('#search').fill('W3-U01');
    assert.equal(await page.locator('#grid article').count(),manifest.assets.filter(a=>a.sourceDesignId==='W3-U01').length);
    await rendered();
    await page.screenshot({path:path.join(output,'unit-opposite-views.png')});
    await page.locator('#search').fill('');
  });
  await check('Keyboard dialogue opens, preserves native atlas and restores focus', async () => {
    await category('units');
    const button = page.locator('#grid article').first().getByRole('button');
    await button.focus(); await page.keyboard.press('Enter');
    assert.ok(await page.locator('#details').isVisible());
    await page.waitForFunction(() => document.querySelector('#details img')?.complete && document.querySelector('#details img').naturalWidth>0);
    assert.deepEqual(await page.locator('#details img').evaluate(i=>[i.naturalWidth,i.naturalHeight]),[1536,1024]);
    await page.screenshot({path:path.join(output,'native-atlas-dialogue.png')});
    await page.keyboard.press('Escape');
    assert.ok(!(await page.locator('#details').isVisible()));
    assert.ok(await button.evaluate(b=>b===document.activeElement));
  });
  for (const name of ['homeworld','masks','structures']) {
    await category(name); await page.evaluate(()=>scrollTo(0,0)); await rendered();
    await page.screenshot({path:path.join(output,name+'-checkerboard.png')});
  }
  await check('Representative native rectangles remain visible at 128 and 256 pixels', async () => {
    const samples = await page.evaluate(async () => {
      const pack = JSON.parse(document.querySelector('#pack-data').textContent);
      const ids = ['W3-U01','W3-U01-left','W3-U07','W3-S01','HWA160-001','alpha-front'];
      const panel = document.createElement('section');
      panel.id = 'native-scale-review';
      panel.style.cssText = 'position:fixed;inset:0;z-index:100;background:#0b1510;overflow:auto;padding:24px';
      const title = document.createElement('h1'); title.textContent = 'Revue native : 128 px / 256 px'; panel.append(title);
      const grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px'; panel.append(grid);
      const results = [];
      for(const asset of pack.assets.filter(a=>ids.includes(a.id))) {
        const img = new Image(); img.src = asset.src; await img.decode();
        const figure = document.createElement('figure'); figure.style.cssText = 'margin:0';
        const label = document.createElement('figcaption'); label.textContent = asset.id; figure.append(label);
        for(const size of [128,256]) {
          const canvas = document.createElement('canvas'); canvas.width=size; canvas.height=size;
          canvas.style.cssText='display:inline-block;width:'+size+'px;height:'+size+'px;background:#526448;border:1px solid #8c9d8d';
          const c = canvas.getContext('2d'); const r=asset.sourceRect;
          const scale=Math.min((size-8)/r[2],(size-8)/r[3]);
          c.drawImage(img,...r,(size-r[2]*scale)/2,(size-r[3]*scale)/2,r[2]*scale,r[3]*scale);
          const pixels=c.getImageData(0,0,size,size).data; let solid=0,transparent=0;
          for(let p=3;p<pixels.length;p+=4) { if(pixels[p]===0) transparent++; if(pixels[p]>=240) solid++; }
          results.push({id:asset.id,size,solid,transparent}); figure.append(canvas);
        }
        grid.append(figure);
      }
      document.body.append(panel); return results;
    });
    for(const sample of samples) { assert.ok(sample.solid>25,sample.id+' is empty at '+sample.size); assert.ok(sample.transparent>25); }
    await page.screenshot({path:path.join(output,'native-scales-128-256.png')});
    await page.locator('#native-scale-review').evaluate(panel=>panel.remove());
    return {samples};
  });
  await check('Responsive controls and dialogue fit 320 and 390 pixel viewports', async () => {
    for (const width of [320,390]) {
      await page.setViewportSize({width,height:844});
      await category('masks'); await page.evaluate(()=>scrollTo(0,0)); await rendered();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth), 'horizontal page overflow at '+width);
      const button = page.locator('#grid article').first().getByRole('button');
      await button.click();
      assert.ok(await page.locator('#details').evaluate(d=>d.getBoundingClientRect().right<=innerWidth && d.getBoundingClientRect().left>=0));
      await page.keyboard.press('Escape'); await page.evaluate(()=>scrollTo(0,0));
      await page.screenshot({path:path.join(output,'mobile-'+width+'.png'),fullPage:true});
    }
  });
  await check('No browser exceptions, failed asset loads or game storage writes', async () => {
    assert.deepEqual(pageErrors,[]); assert.deepEqual(failedRequests,[]);
    const stats = await page.evaluate(()=>window.__P0_SPRITE_REVIEW__.getStats());
    assert.equal(stats.errors,0);
    assert.deepEqual(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length})),{local:0,session:0});
    return {stats};
  });
} finally {
  const report = {scope:'Native static candidate gallery only; no runtime, canonical, human art or animation certification',browser:browser.version(),origin,manifestSha256,manifestCounts:manifest.counts,passed:checks.length>=8 && checks.every(c=>c.passed),checks,pageErrors,failedRequests};
  await fs.writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();
  console.log(JSON.stringify({passed:report.passed,checks:checks.map(c=>({name:c.name,passed:c.passed,...(c.error?{error:c.error}:{})})),output},null,2));
  if(!report.passed) process.exitCode=1;
}
