#!/usr/bin/env node
/** The Isles V1 · the whole archipelago in Chromium: menu, the real-scale world streamed around the
 * hunter, a walk, the map, and a ship travel to five islands of different climates.
 * WebGL runs on SwiftShader (software): frame rates here are not a player's. */
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
const out = path.resolve(root, option('--output', 'production/qa/evidence/isles-archipel-v1-20261128'));
const publicRoots = [path.join(root, 'public'), ...(option('--public', '') ? [path.resolve(option('--public'))] : [])];
await mkdir(out, {recursive: true});
const entry = `import {createRoot} from "react-dom/client";import CampaignFrontEnd from "./app/game/CampaignFrontEnd";import "./app/globals.css";
createRoot(document.getElementById("root")).render(<CampaignFrontEnd SessionComponent={() => null}/>);`;
const bundle = await build({stdin: {contents: entry, resolveDir: root, loader: 'tsx'}, bundle: true, write: false, format: 'esm',
  platform: 'browser', jsx: 'automatic', outfile: 'isles.js', logLevel: 'silent', external: ['/game/*'], loader: {'.module.css': 'local-css'},
  define: {'process.env.NODE_ENV': '"production"', 'process.env.NEXT_PUBLIC_ISLES_V1_QA': '"1"'}, plugins: [{name: 'globals', setup(builder) {
    builder.onLoad({filter: /\/app\/globals\.css$/}, async args => ({loader: 'css', resolveDir: path.dirname(args.path),
      contents: (await postcss([tailwind({base: root})]).process(await readFile(args.path, 'utf8'), {from: args.path})).css}));
  }}]});
const js = bundle.outputFiles.find(file => file.path.endsWith('.js')).contents;
const css = bundle.outputFiles.find(file => file.path.endsWith('.css')).contents;
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://x');
  if (url.pathname === '/') { response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}); response.end('<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Yautja</title><link rel="stylesheet" href="/isles.css"><body><div id="root"></div><script type="module" src="/isles.js"></script>'); return; }
  if (url.pathname === '/isles.js') { response.writeHead(200, {'Content-Type': 'text/javascript'}); response.end(js); return; }
  if (url.pathname === '/isles.css') { response.writeHead(200, {'Content-Type': 'text/css'}); response.end(css); return; }
  for (const base of publicRoots) {
    const file = path.join(base, path.normalize(decodeURIComponent(url.pathname)));
    if (!file.startsWith(base)) break;
    try { const bytes = await readFile(file); response.writeHead(200); response.end(bytes); return; } catch { /* next root */ }
  }
  response.writeHead(404); response.end();
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const base = 'http://127.0.0.1:' + server.address().port;
const report = {schema: 1, date: '2026-11-28', renderer: 'Chromium headless, WebGL2 via SwiftShader (software)', steps: [], metrics: {}, captures: []};
const browser = await chromium.launch({executablePath: option('--chromium', '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'),
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const step = (name, data = {}) => { report.steps.push({step: name, ...data}); process.stdout.write('✓ ' + name + '\n'); };
const page = await (await browser.newContext({viewport: {width: 1280, height: 720}})).newPage();
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource/.test(message.text())) errors.push(message.text()); });
const shot = async name => { const buffer = await page.screenshot(); await writeFile(path.join(out, name + '.png'), buffer);
  report.captures.push({file: name + '.png', sha256: createHash('sha256').update(buffer).digest('hex')}); };
const hook = (body, arg) => page.evaluate(([source, value]) => new Function('isles', 'arg', 'return (' + source + ')(isles, arg)')(window.__islesV1, value), [body.toString(), arg]);

try {
  await page.goto(base + '/');
  await page.locator('[data-menu-section=modes]').click();
  await page.locator('[data-menu-action=the-isles]').click();
  await page.locator('[data-isles-start=world]').click();
  await page.waitForFunction(() => window.__islesV1?.kind === 'world', null, {timeout: 60000});
  await page.locator('[data-isles-place]').waitFor({timeout: 60000});
  await page.waitForTimeout(2500);
  const size = await hook(isles => isles.archipelago());
  assert.equal(size.width, 24000);
  report.metrics.world = {tilesWide: size.width, tilesDeep: size.depth, sites: size.sites.length};
  assert.match(await page.locator('[data-isles-place]').innerText(), /Verdant/);
  assert.match(await page.locator('[data-isles-position]').innerText(), /48 × 49 km/);
  report.metrics.start = await hook(isles => ({...isles.stats(), cached: isles.archipelago().cached}));
  await shot('01-verdant-autel');
  step('l’archipel de 48 × 49 km s’ouvre sur Verdant, sans carte stockée', report.metrics.start);

  const before = await hook(isles => isles.actor());
  await page.keyboard.down('ShiftLeft'); await page.keyboard.down('KeyD');
  await page.waitForFunction(([x, z]) => { const a = window.__islesV1.actor(); return Math.hypot(a.x - x, a.z - z) > 25; }, [before.x, before.z], {timeout: 90000});
  await page.keyboard.up('KeyD'); await page.keyboard.up('ShiftLeft');
  step('le chasseur court sur le monde chargé en continu');

  await page.keyboard.press('KeyM');
  await page.locator('[data-isles-map=open]').waitFor();
  await page.waitForTimeout(2500);
  await shot('02-carte-de-l-archipel');
  step('carte de tout l’archipel (touche M)');
  // Travel by clicking Calder on the map.
  const calder = size.sites.find(site => site.id === '4.1');
  const frame = await page.locator('[data-isles-map-frame]').boundingBox();
  await page.mouse.click(frame.x + calder.x / (size.width * 2) * frame.width, frame.y + calder.z / (size.width * 2) * frame.height);
  await page.waitForFunction(() => /Calder/.test(document.querySelector('[data-isles-place]')?.textContent ?? ''), null, {timeout: 30000});
  await page.keyboard.press('KeyV');
  await page.waitForTimeout(4000);
  await shot('03-calder-downtown');
  step('voyage en vaisseau par un clic sur la carte : Calder, Downtown');

  const visits = [['13.3', 'Frost Isle', '04-frost-isle-glacier'], ['3.1', 'Ember', '05-ember-volcan'], ['1S.1', 'Redmesa', '06-redmesa-desert'],
    ['10.2', 'The Shallows', '07-shallows-atoll'], ['2.2', 'Hollowpine', '08-hollowpine-montagne'], ['12.1', 'Saltmarsh', '09-saltmarsh-bayous']];
  for (const [id, name, file] of visits) {
    const site = size.sites.find(item => item.id === id);
    await hook((isles, at) => isles.travel(at.x, at.z), {x: site.x, z: site.z});
    await page.waitForFunction(expected => (document.querySelector('[data-isles-place]')?.textContent ?? '').includes(expected), name, {timeout: 30000});
    await page.waitForTimeout(4000);
    await shot(file);
    step('voyage : ' + name + ' · ' + site.label);
  }
  report.metrics.end = await hook(isles => ({...isles.stats(), cached: isles.archipelago().cached}));
  assert.ok(report.metrics.end.cached <= 900, 'cache borné : ' + report.metrics.end.cached);
  assert.ok(report.metrics.end.zones <= 81, 'zones affichées bornées : ' + report.metrics.end.zones);
  step('après sept voyages, le monde en mémoire reste borné', report.metrics.end);
  assert.deepEqual(errors, []);
} finally {
  report.errors = errors;
  await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  server.close();
}
