#!/usr/bin/env node
/** V174 browser proof: the real CampaignFrontEnd with the launch intro (forced by ?intro=1),
 * studio card, author card, title screen, then the real main menu after a key press. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {createServer} from 'node:http';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const root = fileURLToPath(new URL('../', import.meta.url));
const argv = process.argv.slice(2);
const option = (name, fallback) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : fallback; };
const out = path.resolve(root, option('--output', 'production/qa/evidence/studio-intro-v174-20261123'));
await mkdir(out, {recursive: true});
const entry = `import {createRoot} from "react-dom/client";import CampaignFrontEnd from "./app/game/CampaignFrontEnd";import "./app/globals.css";
createRoot(document.getElementById("root")).render(<CampaignFrontEnd SessionComponent={() => null}/>);`;
const bundle = await build({stdin: {contents: entry, resolveDir: root, loader: 'tsx'}, bundle: true, write: false, format: 'iife',
  platform: 'browser', jsx: 'automatic', outfile: 'intro.js', logLevel: 'silent', external: ['/game/*'], loader: {'.module.css': 'local-css'},
  define: {'process.env.NODE_ENV': '"production"'}, plugins: [{name: 'globals', setup(builder) {
    builder.onLoad({filter: /\/app\/globals\.css$/}, async args => ({loader: 'css', resolveDir: path.dirname(args.path),
      contents: (await postcss([tailwind({base: root})]).process(await readFile(args.path, 'utf8'), {from: args.path})).css}));
  }}]});
const js = bundle.outputFiles.find(file => file.path.endsWith('.js')).contents;
const css = bundle.outputFiles.find(file => file.path.endsWith('.css')).contents;
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://x');
  if (url.pathname === '/') { response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}); response.end('<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Yautja</title><link rel="stylesheet" href="/intro.css"><body><div id="root"></div><script src="/intro.js"></script>'); return; }
  if (url.pathname === '/intro.js') { response.writeHead(200, {'Content-Type': 'text/javascript'}); response.end(js); return; }
  if (url.pathname === '/intro.css') { response.writeHead(200, {'Content-Type': 'text/css'}); response.end(css); return; }
  try {
    const file = path.join(root, 'public', path.normalize(url.pathname));
    assert.ok(file.startsWith(path.join(root, 'public')));
    const type = {'.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.json': 'application/json'}[path.extname(file)] ?? 'application/octet-stream';
    const bytes = await readFile(file);
    response.writeHead(200, {'Content-Type': type}); response.end(bytes);
  } catch { response.writeHead(404); response.end(); }
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const base = 'http://127.0.0.1:' + server.address().port;
const report = {schema: 1, scope: 'Real CampaignFrontEnd and StudioIntroV174 in Chromium with the game stylesheet; not the Next build.', steps: [], captures: []};
const browser = await chromium.launch({executablePath: option('--chromium', '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'), args: ['--no-sandbox']});
try {
  for (const [label, viewport] of [['desktop', {width: 1280, height: 720}], ['phone', {width: 390, height: 844}]]) {
    const page = await (await browser.newContext({viewport, deviceScaleFactor: 2})).newPage();
    const errors = []; page.on('pageerror', error => errors.push(String(error)));
    const shot = async name => { const buffer = await page.screenshot(); const file = label + '-' + name + '.png';
      await writeFile(path.join(out, file), buffer); report.captures.push({file, sha256: createHash('sha256').update(buffer).digest('hex')}); };
    await page.goto(base + '/?intro=1');
    const intro = page.locator('[data-studio-intro-v174]');
    await page.getByText('A Darknigthmare Kingdoms Games production', {exact: true}).waitFor();
    await page.waitForTimeout(900); await shot('01-studio');
    await page.getByText('by Darknigthmare', {exact: true}).waitFor({timeout: 6000});
    report.steps.push({viewport: label, step: 'studio card then author card on time'});
    await page.waitForTimeout(700); await shot('02-author');
    await intro.and(page.locator('[data-studio-intro-v174=title]')).waitFor({timeout: 5000});
    await page.getByText('— Appuyez sur une touche —').waitFor();
    await page.waitForTimeout(1500); await shot('03-title');
    assert.equal(await page.locator('[data-studio-intro-v174]').count(), 1, 'the title screen waits for the player');
    await page.keyboard.press('Enter');
    await intro.waitFor({state: 'detached', timeout: 5000});
    await page.getByRole('heading', {level: 1}).filter({hasText: 'Yautja'}).first().waitFor();
    report.steps.push({viewport: label, step: 'a key on the title screen opens the main menu'});
    await shot('04-main-menu');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 0, 'no horizontal scroll');
    assert.deepEqual(errors, []);
  }
  const skip = await (await browser.newContext({viewport: {width: 1280, height: 720}})).newPage();
  await skip.goto(base + '/?intro=1');
  await skip.getByText('A Darknigthmare Kingdoms Games production', {exact: true}).waitFor();
  await skip.keyboard.press('Space');
  await skip.locator('[data-studio-intro-v174=title]').waitFor({timeout: 2000});
  report.steps.push({step: 'a key during the studio card skips to the title screen'});
  const automated = await (await browser.newContext()).newPage();
  await automated.goto(base + '/');
  await automated.waitForTimeout(800);
  assert.equal(await automated.locator('[data-studio-intro-v174]').count(), 0, 'automation reaches the menu directly');
  report.steps.push({step: 'without ?intro=1 under automation the menu opens directly'});
  report.result = 'PASS';
} finally {
  await browser.close(); server.close();
  await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({result: report.result ?? 'FAIL', captures: report.captures.length}));
