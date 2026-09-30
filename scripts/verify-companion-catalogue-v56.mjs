import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
import {enterCampaignDeck} from './campaign-browser-helpers.mjs';

// Dedicated, temporary context with the existing synthetic QA fixture only.
// The browsing phase must not change even one localStorage byte.
const url = process.env.COMPANION_QA_URL || 'http://127.0.0.1:4175';
const output = process.env.COMPANION_QA_OUTPUT || 'work-local/v56/qa/companion-catalogue';
const catalogue = JSON.parse(await fs.readFile('app/game/data/companionCatalogueV56.json', 'utf8'));
await fs.mkdir(output, {recursive:true});
const report = {
  passed:false, url, checkedAt:new Date().toISOString(),
  scope:'11 static companion portraits in the read-only clan register; no recruitment, native animation, or playable creature is claimed.',
  checks:[], captures:[], errors:[], failures:[],
};
const browser = await chromium.launch({channel:'chrome', headless:true});
const context = await browser.newContext({viewport:{width:1280,height:900}});
const page = await context.newPage();
page.setDefaultTimeout(30000);
page.on('pageerror', error => report.errors.push(error.message));
page.on('response', response => {
  if (response.status() >= 400) report.failures.push({url:response.url(),status:response.status()});
});
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const storage = () => page.evaluate(() => Object.fromEntries(Object.entries(localStorage).sort(([a],[b]) => a.localeCompare(b))));
const check = (name, details={}) => {
  report.checks.push({name,...details});
  console.log(JSON.stringify({check:name,passed:true}));
};
const shot = async name => {
  const file = path.join(output, name+'.png');
  await page.screenshot({path:file,fullPage:true});
  report.captures.push(file);
};

try {
  await enterCampaignDeck(page, {url});
  await page.waitForLoadState('networkidle');
  const before = await storage();
  const beforeFingerprint = sha256(JSON.stringify(before));
  await page.getByRole('button',{name:'Dossier de campagne',exact:true}).click();
  await page.getByRole('button',{name:'Compagnons · registre',exact:true}).click();
  const register = page.locator('[data-companion-catalogue="v56"]');
  await register.waitFor();
  assert.equal(await register.getAttribute('data-companion-write-policy'), 'read-only');
  assert.equal(await register.locator('[data-companion-id]').count(),11);
  assert.equal(catalogue.entries.length,11);
  const hero = register.locator('figure img');
  const sourceLink = register.getByRole('link',{name:'Télécharger l’original fourni',exact:true});
  const checkedAssets = [];

  for (const entry of catalogue.entries) {
    await register.locator(`[data-companion-id="${entry.id}"]`).click();
    await register.getByRole('heading',{name:entry.name,exact:true}).waitFor();
    const dimensions = await hero.evaluate(async img => {
      await img.decode();
      return {width:img.naturalWidth,height:img.naturalHeight,src:img.getAttribute('src')};
    });
    assert.deepEqual(dimensions,{width:entry.width,height:entry.height,src:entry.imagePath});
    assert.equal(await sourceLink.getAttribute('href'),encodeURI(entry.sourcePath));
    assert.equal(await sourceLink.getAttribute('download'),entry.sourceName);
    assert.equal(await register.locator('[aria-pressed="true"][data-companion-id]').getAttribute('data-companion-id'),entry.id);
    const facts = await register.locator('dl').innerText();
    assert.match(facts,/1 pose fixe détourée/);
    assert.match(facts,/Aucune produite/);
    assert.match(facts,/Mission à produire/);
    assert.match(facts,/Non autorisée · aucune affectation validée/);
    // Exercise the actual download href and bitmap bytes without touching any user download directory.
    const original = await context.request.get(new URL(await sourceLink.getAttribute('href'),url).href);
    assert.equal(original.status(),200,entry.sourceName);
    const originalBytes = await original.body();
    assert.equal(sha256(originalBytes),entry.sourceSHA256,entry.sourceName+' source mismatch');
    const cutout = await context.request.get(new URL(entry.imagePath,url).href);
    assert.equal(cutout.status(),200,entry.imagePath);
    assert.equal(sha256(await cutout.body()),entry.cutoutSHA256,entry.imagePath+' bitmap mismatch');
    checkedAssets.push({id:entry.id,source:entry.sourceName,dimensions,originalSHA256:entry.sourceSHA256,sourceHTTP:200,cutoutHTTP:200});
  }
  check('desktop-all-eleven-images-and-original-byte-identity',{entries:checkedAssets});
  await shot('01-desktop-preddog');

  // Verify native keyboard activation and a single announced selection.
  const first = register.locator(`[data-companion-id="${catalogue.entries[0].id}"]`);
  await first.focus();
  await page.keyboard.press('Enter');
  assert.equal(await first.getAttribute('aria-pressed'),'true');
  await hero.evaluate(img=>img.decode());
  assert(await first.evaluate(el=>el===document.activeElement));
  check('keyboard-selection-and-visible-focus');
  await shot('02-desktop-first-companion');

  const responsive = [];
  for (const viewport of [{width:390,height:844},{width:844,height:390}]) {
    await page.setViewportSize(viewport);
    for (const entry of catalogue.entries) {
      await register.locator(`[data-companion-id="${entry.id}"]`).click();
      await register.getByRole('heading',{name:entry.name,exact:true}).waitFor();
      await hero.evaluate(img=>img.decode());
      assert.equal(await sourceLink.getAttribute('download'),entry.sourceName);
    }
    const layout = await page.evaluate(()=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth}));
    assert(layout.documentWidth <= viewport.width+1,JSON.stringify({viewport,layout}));
    const cardBounds = await register.locator('[data-companion-id]').evaluateAll(nodes=>nodes.map(n=>{
      const b=n.getBoundingClientRect();return {id:n.dataset.companionId,width:b.width,height:b.height};
    }));
    assert(cardBounds.every(b=>b.width>=44&&b.height>=44));
    responsive.push({viewport,layout,cards:cardBounds,selectedEach:11});
    await shot('03-responsive-'+viewport.width);
  }
  check('responsive-eleven-cards-and-no-horizontal-overflow',{responsive});
  await page.setViewportSize({width:1280,height:900});
  await page.getByRole('button',{name:'Retour',exact:true}).click();
  await page.locator('[data-campaign-session][data-campaign-location="deck"]').waitFor();
  assert.deepEqual(await storage(),before);
  check('all-local-storage-byte-identical-before-after',{fingerprint:beforeFingerprint,keys:Object.keys(before),scope:'After synthetic campaign entry; includes opening and closing dossier, all selections, downloads and responsive views.'});
  assert.deepEqual(report.errors,[]);
  assert.deepEqual(report.failures,[]);
  report.passed = true;
} catch (error) {
  report.error = String(error.stack || error);
  await shot('failure').catch(()=>{});
  console.error(error);
  process.exitCode = 1;
} finally {
  await context.close().catch(()=>{});
  await browser.close();
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,output}));
}
