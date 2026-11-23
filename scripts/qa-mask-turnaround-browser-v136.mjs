#!/usr/bin/env node
/** B136 browser proof: the real MaskTurnaroundV136 armory insert for each V133 concept mask,
 * with the published V133 sprite as the face view and the pending profile/back state. Captures retained. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {createServer} from 'node:http';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';

const root = fileURLToPath(new URL('../', import.meta.url));
const argv = process.argv.slice(2);
const option = (name, fallback) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : fallback; };
const out = path.resolve(root, option('--output', 'production/qa/evidence/b136-mask-turnaround-20261123'));
await mkdir(out, {recursive: true});
const masks = ['requiem', 'nova', 'instinct', 'glypic', 'tyrant', 'warlord', 'paroxysm'];
const entry = `import {createRoot} from "react-dom/client";import T from "./app/game/MaskTurnaroundV136";
const id=new URLSearchParams(location.search).get("mask");createRoot(document.getElementById("root")).render(<div style={{padding:16}}><T maskId={id}/></div>);`;
const bundle = await build({stdin: {contents: entry, resolveDir: root, loader: 'tsx'}, bundle: true, write: false, format: 'iife',
  platform: 'browser', jsx: 'automatic', outfile: 't.js', logLevel: 'silent', loader: {'.module.css': 'local-css'},
  define: {'process.env.NODE_ENV': '"production"'}});
const js = bundle.outputFiles.find(file => file.path.endsWith('.js')).contents;
const css = bundle.outputFiles.find(file => file.path.endsWith('.css')).contents;
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://x');
  if (url.pathname === '/') { response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}); response.end('<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/t.css"><body style="margin:0;background:#0b1210;font-family:system-ui,sans-serif"><div id="root"></div><script src="/t.js"></script>'); return; }
  if (url.pathname === '/t.js') { response.writeHead(200, {'Content-Type': 'text/javascript'}); response.end(js); return; }
  if (url.pathname === '/t.css') { response.writeHead(200, {'Content-Type': 'text/css'}); response.end(css); return; }
  if (/^\/game\/assets\/v133\/concept-masks\/[a-z]+\.webp$/.test(url.pathname)) {
    response.writeHead(200, {'Content-Type': 'image/webp'}); response.end(await readFile(path.join(root, 'public', url.pathname))); return;
  }
  response.writeHead(404); response.end();
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const base = 'http://127.0.0.1:' + server.address().port;
const report = {schema: 1, scope: 'Real MaskTurnaroundV136 insert alone in Chromium (not the whole armory screen). The V133 sprite is the face; profile and back stay pending until the B136 art is delivered.', masks: []};
const browser = await chromium.launch({executablePath: option('--chromium', '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'), args: ['--no-sandbox']});
try {
  for (const [label, viewport] of [['wide', {width: 820, height: 600}], ['phone', {width: 390, height: 700}]]) {
    const page = await (await browser.newContext({viewport, deviceScaleFactor: 2})).newPage();
    for (const mask of label === 'wide' ? masks : ['requiem']) {
      await page.goto(base + '/?mask=concept-v133-' + mask);
      const insert = page.locator('[data-mask-turnaround-v136]');
      await insert.waitFor();
      const profile = insert.locator('[data-view=face] img');
      await profile.evaluate(img => img.complete ? null : new Promise(resolve => img.addEventListener('load', resolve, {once: true})));
      const natural = await profile.evaluate(img => [img.naturalWidth, img.naturalHeight]);
      assert.deepEqual(natural, [256, 384], 'published V133 sprite loaded as the face view');
      assert.equal(await insert.locator('[data-pending=true]').count(), 2, 'profile and back are marked pending');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 0);
      const buffer = await insert.screenshot();
      const file = label + '-' + mask + '.png';
      await writeFile(path.join(out, file), buffer);
      report.masks.push({mask, viewport: label, file, sha256: createHash('sha256').update(buffer).digest('hex'), face: natural, pending: ['profile', 'back']});
    }
  }
  await (await browser.newContext()).newPage().then(async page => {
    await page.goto(base + '/?mask=jungle');
    await page.waitForTimeout(300);
    assert.equal(await page.locator('[data-mask-turnaround-v136]').count(), 0, 'non-concept masks show no insert');
  });
  report.result = 'PASS';
} finally {
  await browser.close(); server.close();
  await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({result: report.result ?? 'FAIL', captures: report.masks.length}));
