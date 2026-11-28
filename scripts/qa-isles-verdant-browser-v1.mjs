#!/usr/bin/env node
/** The Isles V1 · Verdant free hunt in Chromium: real CampaignFrontEnd menu, the generated
 * 2 km island streamed by zones, the Meshy models, the altar contracts, a kill and its trophy
 * delivered at the lair, the map, an alert, a moonless night and the saved profile after a reload.
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
const out = path.resolve(root, option('--output', 'production/qa/evidence/isles-verdant-v1-20261128'));
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
const types = {'.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.json': 'application/json', '.glb': 'model/gltf-binary'};
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://x');
  if (url.pathname === '/') { response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}); response.end('<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Yautja</title><link rel="stylesheet" href="/isles.css"><body><div id="root"></div><script type="module" src="/isles.js"></script>'); return; }
  if (url.pathname === '/isles.js') { response.writeHead(200, {'Content-Type': 'text/javascript'}); response.end(js); return; }
  if (url.pathname === '/isles.css') { response.writeHead(200, {'Content-Type': 'text/css'}); response.end(css); return; }
  for (const base of publicRoots) {
    const file = path.join(base, path.normalize(decodeURIComponent(url.pathname)));
    if (!file.startsWith(base)) break;
    try { const bytes = await readFile(file); response.writeHead(200, {'Content-Type': types[path.extname(file)] ?? 'application/octet-stream'}); response.end(bytes); return; } catch { /* next root */ }
  }
  response.writeHead(404); response.end();
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const base = 'http://127.0.0.1:' + server.address().port;
const report = {schema: 1, date: '2026-11-28', renderer: 'Chromium headless, WebGL2 via SwiftShader (software)',
  scope: 'Real CampaignFrontEnd menu and IslesModeV1 bundled with esbuild and the game stylesheet; not the Next build.', steps: [], metrics: {}, captures: []};
const browser = await chromium.launch({executablePath: option('--chromium', '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'),
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const step = (name, data = {}) => { report.steps.push({step: name, ...data}); process.stdout.write('✓ ' + name + '\n'); };
const context = await browser.newContext({viewport: {width: 1280, height: 720}});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource/.test(message.text())) errors.push(message.text()); });
const shot = async name => {
  const buffer = await page.screenshot();
  await writeFile(path.join(out, name + '.png'), buffer);
  report.captures.push({file: name + '.png', sha256: createHash('sha256').update(buffer).digest('hex')});
};
const hook = (body, arg) => page.evaluate(([source, value]) => new Function('isles', 'arg', 'return (' + source + ')(isles, arg)')(window.__islesV1, value), [body.toString(), arg]);
const openVerdant = async () => {
  await page.goto(base + '/');
  await page.locator('[data-menu-section=modes]').click();
  await page.locator('[data-menu-action=the-isles]').click();
  await page.locator('[data-isles-hub-v1]').waitFor();
};

try {
  await openVerdant();
  await page.evaluate(() => localStorage.removeItem('yautja.isles.profile.v1'));
  await page.reload();
  await openVerdant();
  await shot('01-hub');
  await page.locator('[data-isles-start=free]').click();
  await page.waitForFunction(() => window.__islesV1?.kind === 'free', null, {timeout: 60000});
  await page.locator('[data-isles-clock]').waitFor({timeout: 60000});
  report.metrics.world = await hook(isles => { const w = isles.world(); return {tiles: w.map.width, sites: w.sites.length}; });
  await page.waitForFunction(() => window.__islesV1.stats().modelsReady >= 1, null, {timeout: 60000});
  await page.waitForTimeout(1500);
  report.metrics.atAltar = await hook(isles => isles.stats());
  assert.equal(report.metrics.world.tiles, 1000);
  await shot('02-autel-et-soeur-de-pierre');
  step('Verdant généré (1000 × 1000 tuiles) et chargé par zones autour de l’autel', report.metrics.atAltar);

  await page.keyboard.press('KeyG');
  await page.waitForFunction(() => window.__islesV1.free().profile.contracts.accepted.length === 3, null, {timeout: 20000});
  await page.waitForTimeout(600);
  await shot('03-contrats-de-l-autel');
  step('contrats de l’autel lus à la touche G');

  // The poachers' camp, seen from 60 m: Meshy models walking.
  await hook(isles => { const camp = isles.world().sites.find(s => s.id === 'camp'); isles.place(camp.x + 50, camp.z + 10, 0); });
  await page.waitForFunction(() => window.__islesV1.free().npcs.filter(n => n.type === 'braconnier' && n.cell).length >= 4, null, {timeout: 30000});
  await page.waitForFunction(() => window.__islesV1.stats().modelsReady >= 3, null, {timeout: 60000});
  await hook(isles => { const camp = isles.world().sites.find(s => s.id === 'camp'); isles.place(camp.x + 6, camp.z + 8, 0); });
  await page.keyboard.press('KeyV');
  await page.waitForTimeout(2500);
  await shot('04-camp-des-braconniers');
  await page.keyboard.press('KeyV'); await page.keyboard.press('KeyV');
  step('le camp se peuple de braconniers (modèles Meshy animés)');

  // A kill at the blade, then the trophy held with T.
  const target = await hook(isles => {
    const f = isles.free();
    const n = f.npcs.find(x => x.type === 'braconnier' && x.cell && x.state !== 'dead');
    f.npcs.forEach(x => { if (x !== n && x.role === 'human') { x.x += 400; x.z += 400; } });
    Object.assign(n, {fireTimer: 999, timer: 999, state: 'patrol'});
    isles.place(n.x, n.z - 1.5, 0);
    f.player.actor = {...f.player.actor, facing: 0};
    return n.id;
  });
  for (let i = 0; i < 6; i++) {
    const dead = await hook((isles, id) => isles.free().npcs.find(n => n.id === id)?.state === 'dead', target);
    if (dead) break;
    await hook((isles, id) => { const f = isles.free(); const n = f.npcs.find(x => x.id === id); isles.place(n.x, n.z - 1.5, 0); f.player.actor = {...f.player.actor, facing: 0}; n.fireTimer = 999; }, target);
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(1500);
  }
  assert.ok(await hook((isles, id) => isles.free().npcs.find(n => n.id === id)?.state === 'dead', target));
  await page.keyboard.down('KeyT');
  await page.waitForTimeout(2500);
  await shot('05-trophee-preleve');
  await page.waitForFunction(() => window.__islesV1.free().carried.length === 1, null, {timeout: 60000});
  await page.keyboard.up('KeyT');
  step('braconnier armé abattu à la lame, trophée pris à la touche T');

  await page.keyboard.press('KeyM');
  await page.locator('[data-isles-map=open]').waitFor();
  await page.waitForTimeout(500);
  await shot('06-carte-de-verdant');
  await page.keyboard.press('KeyM');
  step('carte de l’île (touche M)');

  await hook(isles => { const [x, z] = isles.world().map.markers.repaireEntry[0]; isles.place(x * 2 + 1, z * 2 + 1, 0); });
  await page.waitForFunction(() => window.__islesV1.free().profile.trophies.length === 1, null, {timeout: 30000});
  await page.waitForTimeout(1500);
  await shot('07-repaire-trophee-rapporte');
  step('trophée rapporté au repaire derrière les chutes (+ 20 %)');

  // Alert: visible to an armed poacher for more than 3 s.
  await hook(isles => {
    const f = isles.free(); const n = f.npcs.find(x => x.type === 'braconnier' && x.state !== 'dead');
    const [x, z] = isles.world().map.markers.altarFront[0];
    isles.place(x * 2 + 1, z * 2 + 1, 0);
    Object.assign(n, {x: x * 2 + 1, z: z * 2 + 9, goalX: x * 2 + 1, goalZ: z * 2 + 9, facing: Math.PI, state: 'patrol', fireTimer: 999, timer: 999, path: [], pathKey: 'qa'});
  });
  await page.waitForFunction(() => window.__islesV1.free().alert.level >= 1, null, {timeout: 60000});
  await page.waitForTimeout(800);
  await shot('08-alerte');
  step('un braconnier donne l’alerte : marques et renforts');

  // A moonless night near the legendary's territory.
  await hook(isles => {
    const f = isles.free(); f.alert.level = 0; f.npcs = f.npcs.filter(n => n.unique !== 'responder');
    f.time = (24 * 2 + 22 - 6) * 60;
    const [x, z] = isles.world().map.markers.legendary[0]; isles.place(x * 2 + 1, z * 2 + 1, 0);
  });
  await page.waitForFunction(() => window.__islesV1.free().npcs.some(n => n.unique === 'legendary'), null, {timeout: 30000});
  await hook(isles => { const f = isles.free(); const k = f.npcs.find(n => n.unique === 'legendary'); isles.place(k.x + 6, k.z + 6, 0); k.timer = 999; k.state = 'patrol'; });
  await page.waitForFunction(() => window.__islesV1.stats().modelsReady >= 4, null, {timeout: 60000});
  await page.waitForTimeout(2000);
  await shot('09-roi-de-verdant-nuit-sans-lune');
  step('le Roi-de-Verdant apparaît une nuit sans lune');

  await hook(isles => isles.save());
  await page.getByRole('button', {name: 'Quitter'}).click();
  await page.reload();
  await openVerdant();
  await page.locator('[data-isles-profile]').filter({hasText: '1 trophée(s) au repaire'}).waitFor({timeout: 10000});
  await shot('10-hub-progression-gardee');
  step('progression des Îles gardée après rechargement (profil séparé)');
  const keys = await page.evaluate(() => Object.keys(localStorage).filter(key => key.includes('isles')));
  assert.deepEqual(keys, ['yautja.isles.profile.v1']);
  report.metrics.fps = await page.evaluate(() => null);
  assert.deepEqual(errors, []);
} finally {
  report.errors = errors;
  await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  server.close();
}
