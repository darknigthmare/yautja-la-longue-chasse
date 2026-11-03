/** Real React hook + native PNG decoding; generated one-pixel fixtures only.
 * No original game art or remote account is accessed. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { chromium } from 'playwright-core';
const root = fileURLToPath(new URL('../', import.meta.url));
await fs.mkdir(path.join(root, 'work-local'), { recursive: true });
const directory = await fs.mkdtemp(path.join(root, 'work-local', 'native-assets-browser-v94-'));
await fs.writeFile(path.join(directory, 'index.html'), '<!doctype html><html><title>Native hook fixture</title><body><div id="root"></div><script type="module" src="/tests/browser/native-assets-v94.fixture.tsx"></script></body></html>');
const results = [], errors = [];
let server, browser;
try {
  server = await createServer({ root, configFile: false, publicDir: false, plugins: [react()], server: { host: '127.0.0.1', port: 0 }, optimizeDeps: { include: ['react', 'react-dom/client'] } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch(process.env.AUDIT_CHROME_CHANNEL ? { channel: process.env.AUDIT_CHROME_CHANNEL } : {});
  const context = await browser.newContext();
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  let refuse = false;
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort('blockedbyclient');
    if (!url.pathname.startsWith('/__audit_native/')) return route.continue();
    if (url.pathname.endsWith('/slow.png')) await new Promise(resolve => setTimeout(resolve, 250));
    return route.fulfill({ status: refuse ? 503 : 200, contentType: 'image/png', body: pixel });
  });
  await context.addInitScript(() => {
    window.__nativeDecodeCountV94 = 0;
    window.Image = new Proxy(window.Image, { construct(target, args) {
      const image = Reflect.construct(target, args), decode = image.decode.bind(image);
      image.decode = () => { window.__nativeDecodeCountV94++; return decode(); };
      return image;
    } });
  });
  const page = await context.newPage(); page.setDefaultTimeout(5000);
  page.on('pageerror', error => errors.push(error.message));
  const url = origin + '/' + path.relative(root, directory).split(path.sep).join('/') + '/';
  await page.goto(url);
  const ready = () => page.waitForFunction(() => document.querySelector('[data-native-assets]')?.getAttribute('data-ready') === 'true');
  const decodeCount = () => page.evaluate(() => window.__nativeDecodeCountV94);
  const set = (name, width = 1) => page.evaluate(({name,width}) => window.__nativeAssetsAuditV94.setSources([{ src: '/__audit_native/' + name + '.png', sourceWidth: width, sourceHeight: 1 }]), {name,width});
  async function check(name, run) {
    try { await run(); results.push({name,status:'PASS'}); console.log('PASS ' + name); }
    catch (error) { results.push({name,status:'FAIL',error:error.message}); console.error('FAIL ' + name + ': ' + error.message); }
  }
  await check('fresh equivalent arrays reach ready under StrictMode without a render loop', async () => { await ready(); await page.waitForTimeout(100); assert.equal(errors.length, 0, errors.join('\n')); });
  await check('ordinary rerenders do not redownload or redecode the same image', async () => {
    const before = await decodeCount();
    for(let i=0;i<12;i++) await page.evaluate(() => window.__nativeAssetsAuditV94.rerender());
    await page.waitForTimeout(150); await ready(); assert.equal(await decodeCount(), before);
  });
  await check('new source is unready on its first committed render then decodes', async () => {
    await page.evaluate(() => { window.__nativeAssetsAuditV94.observations = []; });
    await set('b'); await ready();
    const observations = await page.evaluate(() => window.__nativeAssetsAuditV94.observations.filter(row => row.source.endsWith('/b.png')));
    assert.equal(observations[0].ready, false); assert.equal(observations.at(-1).ready, true);
  });
  await check('dimension changes reject the real PNG and corrected metadata recovers', async () => {
    await set('b', 2); await page.waitForFunction(() => document.querySelector('[data-native-assets]')?.getAttribute('data-error')?.startsWith('Dimensions '));
    assert.equal(await page.locator('[data-native-assets]').getAttribute('data-ready'), 'false');
    await set('b'); await ready();
  });
  await check('a late image from a cancelled source cannot replace the current result', async () => {
    await set('slow'); await page.waitForTimeout(25); await set('c'); await ready();
    await page.waitForTimeout(300); await ready();
    assert.equal(await page.locator('[data-native-assets]').getAttribute('data-error'), '');
  });
  await check('explicit retry rejects a failed refresh instead of trusting cached pixels', async () => {
    refuse = true; await page.evaluate(() => window.__nativeAssetsAuditV94.retry());
    await page.waitForFunction(() => !!document.querySelector('[data-native-assets]')?.getAttribute('data-error'));
    assert.equal(await page.locator('[data-native-assets]').getAttribute('data-ready'), 'false');
    refuse = false; await page.evaluate(() => window.__nativeAssetsAuditV94.retry()); await ready();
  });
  await check('empty source lists settle as ready', async () => {
    await page.evaluate(() => window.__nativeAssetsAuditV94.setSources([])); await ready();
    assert.equal(await page.locator('[data-native-assets]').getAttribute('data-total'), '0');
  });
  await check('unmount abandons a pending decode without publishing late progress', async () => {
    await set('slow'); await page.waitForTimeout(25); await page.evaluate(() => window.__nativeAssetsAuditV94.show(false));
    await page.locator('[data-unmounted]').waitFor();
    const before = await page.evaluate(() => window.__nativeAssetsAuditV94.observations.length);
    await page.waitForTimeout(300); assert.equal(await page.evaluate(() => window.__nativeAssetsAuditV94.observations.length), before);
  });
  results.push({name:'No uncaught browser exceptions',status:errors.length?'FAIL':'PASS',errors});
  const report = {scope:'Real React image hook and native decoder, generated 1x1 PNGs, not Homeworld art/performance QA',browser:browser.version(),results};
  await fs.mkdir(path.join(root,'outputs','qa-audit-v94'),{recursive:true});
  await fs.writeFile(path.join(root,'outputs','qa-audit-v94','native-assets-browser.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  if(results.some(row=>row.status!=='PASS'))process.exitCode=1;
} finally { await browser?.close(); await server?.close(); await fs.rm(directory,{recursive:true,force:true}); }
