#!/usr/bin/env node
/** The Isles V1 browser proof: the real CampaignFrontEnd menu opens the mode, then the view
 * prototype (run, climb, rotate, zoom, cloak, swim, cut-away), the reverse hunt on Verdant to its
 * outcome, and the earlier standalone HTML prototypes. Chromium renders WebGL with SwiftShader,
 * so frame rates here are not those of a player's machine. */
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
const out = path.resolve(root, option('--output', '.artifacts/isles-v1'));
const publicRoot = path.resolve(option('--public', path.join(root, 'public')));
await mkdir(out, {recursive: true});
const entry = `import {createRoot} from "react-dom/client";import CampaignFrontEnd from "./app/game/CampaignFrontEnd";import "./app/globals.css";
createRoot(document.getElementById("root")).render(<CampaignFrontEnd SessionComponent={() => null}/>);`;
const bundle = await build({stdin: {contents: entry, resolveDir: root, loader: 'tsx'}, bundle: true, write: false, format: 'esm', splitting: false,
  platform: 'browser', jsx: 'automatic', outfile: 'isles.js', logLevel: 'silent', external: ['/game/*'], loader: {'.module.css': 'local-css'},
  define: {'process.env.NODE_ENV': '"production"', 'process.env.NEXT_PUBLIC_ISLES_V1_QA': '"1"'}, plugins: [{name: 'globals', setup(builder) {
    builder.onLoad({filter: /\/app\/globals\.css$/}, async args => ({loader: 'css', resolveDir: path.dirname(args.path),
      contents: (await postcss([tailwind({base: root})]).process(await readFile(args.path, 'utf8'), {from: args.path})).css}));
  }}]});
const js = bundle.outputFiles.find(file => file.path.endsWith('.js')).contents;
const css = bundle.outputFiles.find(file => file.path.endsWith('.css')).contents;
const prototypePaths = [
  'docs/prototypes/TERRE_PROTOTYPE_OKAVANGO_20261122.html',
  'docs/prototypes/ISLES_PROTOTYPE_ISOMETRIQUE_20261122.html',
];
const browserFiles = new Set([...prototypePaths, 'node_modules/three/build/three.module.js', 'node_modules/three/build/three.core.js']);
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://x');
  if (url.pathname === '/') { response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}); response.end('<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Yautja</title><link rel="stylesheet" href="/isles.css"><body><div id="root"></div><script type="module" src="/isles.js"></script>'); return; }
  if (url.pathname === '/isles.js') { response.writeHead(200, {'Content-Type': 'text/javascript'}); response.end(js); return; }
  if (url.pathname === '/isles.css') { response.writeHead(200, {'Content-Type': 'text/css'}); response.end(css); return; }
  try {
    const source = url.pathname.slice(1);
    const file = browserFiles.has(source) ? path.join(root, source) : path.resolve(publicRoot, '.' + url.pathname);
    assert.ok(browserFiles.has(source) || file.startsWith(publicRoot + path.sep));
    const type = {'.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.json': 'application/json', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript'}[path.extname(file)] ?? 'application/octet-stream';
    const bytes = await readFile(file);
    response.writeHead(200, {'Content-Type': type}); response.end(bytes);
  } catch { response.writeHead(404); response.end(); }
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const base = 'http://127.0.0.1:' + server.address().port;

const report = {schema: 1, date: new Date().toISOString(), renderer: 'Chromium headless, WebGL2 via SwiftShader (software)',
  scope: 'CampaignFrontEnd and IslesModeV1 through esbuild with the game stylesheet, with QA-only placement and time acceleration for scenarios.', steps: [], metrics: {}, captures: []};
const browser = await chromium.launch({executablePath: option('--chromium', chromium.executablePath()),
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const step = (name, data = {}) => { report.steps.push({step: name, ...data}); process.stdout.write('✓ ' + name + '\n'); };
const settle = page => page.waitForTimeout(1200);

async function openPage(viewport = {width: 1280, height: 720}, scale = 1) {
  const page = await (await browser.newContext({viewport, deviceScaleFactor: scale})).newPage();
  const errors = [], externalRequests = [];
  page.on('request', request => { if (!request.url().startsWith(base + '/')) externalRequests.push(request.url()); });
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource/.test(message.text())) errors.push(message.text()); });
  return {page, errors, externalRequests};
}
async function shot(page, name) {
  const buffer = await page.screenshot();
  await writeFile(path.join(out, name + '.png'), buffer);
  report.captures.push({file: name + '.png', sha256: createHash('sha256').update(buffer).digest('hex')});
}
const hook = (page, body, arg) => page.evaluate(([source, value]) => new Function('isles', 'arg', 'return (' + source + ')(isles, arg)')(window.__islesV1, value), [body.toString(), arg]);
/** Mean colour difference of two renders around a screen point. */
async function regionDiff(page, cx, cy, half) {
  return page.evaluate(([x, y, h]) => {
    const source = document.querySelector('canvas');
    const scale = source.width / source.clientWidth;
    const copy = document.createElement('canvas'); copy.width = source.width; copy.height = source.height;
    const ctx = copy.getContext('2d'); ctx.drawImage(source, 0, 0);
    const data = ctx.getImageData(Math.round((x - h) * scale), Math.round((y - 2 * h) * scale), Math.round(2 * h * scale), Math.round(3 * h * scale)).data;
    return Array.from(data);
  }, [cx, cy, half]);
}

try {
  // 1. Menu → Modes de jeu → The Isles.
  const {page, errors, externalRequests} = await openPage({width: 1280, height: 720}, 1);
  await page.goto(base + '/');
  await page.locator('[data-menu-section=modes]').click();
  const islesButton = page.locator('[data-menu-action=the-isles]');
  await islesButton.waitFor();
  const priorStorage = await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
  const modeActions = page.locator('[data-menu-action=the-pit], [data-menu-action=game-reserve], [data-menu-action=clan-war], [data-menu-action=the-isles]');
  assert.deepEqual(await modeActions.evaluateAll(nodes => nodes.map(node => node.dataset.menuAction)),
    ['the-pit', 'game-reserve', 'clan-war', 'the-isles']);
  await shot(page, '01-menu-modes');
  await islesButton.click();
  await page.locator('[data-isles-hub-v1]').waitFor();
  assert.equal(await page.locator('[data-isles-start]').count(), 3, 'vue, Chasse inversée et chasse libre de Verdant');
  assert.equal(await page.getByLabel('Serveur').count(), 0);
  await shot(page, '02-hub');
  step('le menu Modes de jeu ouvre The Isles');

  // 2. View prototype.
  await page.locator('[data-isles-start=view]').click();
  await page.locator('[data-isles-play-v1=view]').waitFor();
  await page.waitForFunction(() => window.__islesV1?.kind === 'view');
  await page.waitForTimeout(1200);
  const canvas = page.locator('canvas[aria-label="Île de test, vue isométrique"]');
  assert.equal(await canvas.evaluate(element => document.activeElement === element), true);
  await page.keyboard.press('Tab');
  assert.equal(await page.getByRole('button', {name: 'Quitter'}).evaluate(element => document.activeElement === element), true);
  await canvas.focus();
  step('le clavier rejoint les commandes du mode avec Tab');
  const stats = await hook(page, isles => isles.stats());
  report.metrics.testIsland = stats;
  assert.ok(stats.zones >= 4 && stats.instances > 40, JSON.stringify(stats));
  await shot(page, '03-view-start');
  const start = await hook(page, isles => isles.actor());
  await page.keyboard.down('ShiftLeft'); await page.keyboard.down('KeyD');
  await page.waitForFunction(([x, z]) => { const a = window.__islesV1.actor(); return Math.hypot(a.x - x, a.z - z) > 4; }, [start.x, start.z], {timeout: 20000});
  const running = await hook(page, isles => isles.actor());
  await shot(page, '04-view-run-lead');
  await page.keyboard.up('KeyD'); await page.keyboard.up('ShiftLeft');
  assert.ok(Math.hypot(running.x - start.x, running.z - start.z) > 3, 'la course déplace le chasseur');
  step('course : le chasseur avance et la caméra anticipe', {metres: +Math.hypot(running.x - start.x, running.z - start.z).toFixed(2)});

  // Climb the rock plateau (3 m) from its west face.
  await hook(page, isles => isles.place(55, 31, 0));
  const climbStart = Date.now();
  // In the N-E view, east (toward the cliff) is screen right + down.
  await page.keyboard.down('KeyS'); await page.keyboard.down('KeyD');
  await page.waitForFunction(() => window.__islesV1.actor().climbing, null, {timeout: 20000}).catch(() => undefined);
  await page.waitForTimeout(250);
  await shot(page, '05-view-climb');
  await page.waitForFunction(() => { const a = window.__islesV1.actor(); return a.y >= 2.9 && a.grounded; }, null, {timeout: 40000});
  await page.keyboard.up('KeyS'); await page.keyboard.up('KeyD');
  await page.waitForTimeout(300);
  await shot(page, '06-view-plateau');
  step('escalade de la falaise jusqu’au plateau de 3 m', {seconds: (Date.now() - climbStart) / 1000});

  // Rotations and zooms.
  const labels = [];
  for (let i = 0; i < 4; i++) {
    labels.push(await page.locator('[data-isles-camera]').innerText());
    await page.keyboard.press('KeyR'); await page.waitForTimeout(900);
  }
  assert.equal(new Set(labels).size, 4, labels.join(' / '));
  await page.keyboard.press('KeyV'); await settle(page);
  await shot(page, '07-view-zoom-far');
  await page.keyboard.press('KeyV'); await page.keyboard.press('KeyV'); await settle(page);
  step('4 rotations et 3 zooms', {labels});

  // Cloak, then swim reveals it.
  await hook(page, isles => isles.place(48, 66, 0));
  await page.keyboard.press('KeyC'); await page.waitForTimeout(1200);
  assert.equal((await hook(page, isles => isles.actor())).cloaked, true);
  await shot(page, '08-view-cloak-outline');
  await page.keyboard.down('KeyS'); await page.keyboard.down('KeyA');
  await page.waitForFunction(() => window.__islesV1.actor().swimming, null, {timeout: 40000});
  await page.keyboard.up('KeyS'); await page.keyboard.up('KeyA');
  const swimmer = await hook(page, isles => isles.actor());
  assert.equal(swimmer.cloaked, false);
  await shot(page, '09-view-swim-revealed');
  step('camouflage avec contour, la nage le coupe');

  // Cut-away: behind the 10 m pillar, compare with the cut-away off.
  await page.keyboard.press('KeyV'); await page.keyboard.press('KeyV'); // back to the close zoom
  while ((await page.locator('[data-isles-camera]').innerText()).indexOf('N-E') < 0) { await page.keyboard.press('KeyR'); await page.waitForTimeout(200); }
  await hook(page, isles => isles.place(53.2, 51.2, 0));
  await page.waitForTimeout(900);
  const chest = await hook(page, isles => { const a = isles.actor(); return isles.project(a.x, a.y + 1.2, a.z); });
  await shot(page, '10-view-cutaway-on');
  const on = await regionDiff(page, chest.x, chest.y, 24);
  await hook(page, isles => isles.cutaway(false)); await page.waitForTimeout(400);
  await shot(page, '11-view-cutaway-off');
  const off = await regionDiff(page, chest.x, chest.y, 24);
  await hook(page, isles => isles.cutaway(true));
  let diff = 0;
  for (let i = 0; i < on.length; i += 4) diff += Math.abs(on[i] - off[i]) + Math.abs(on[i + 1] - off[i + 1]) + Math.abs(on[i + 2] - off[i + 2]);
  const meanDiff = diff / (on.length / 4) / 3;
  report.metrics.cutawayMeanDiff = +meanDiff.toFixed(2);
  assert.ok(meanDiff > 6, 'la découpe change ce qu’on voit devant le chasseur (' + meanDiff + ')');
  step('découpe : derrière le pilier, le décor s’ouvre devant le chasseur', {meanColourDiff: report.metrics.cutawayMeanDiff});
  report.metrics.viewFps = await page.evaluate(() => new Promise(done => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else done(Math.round(n / 2)); }; requestAnimationFrame(f); }));
  await page.getByRole('button', {name: 'Quitter'}).click();
  await page.locator('[data-isles-hub-v1]').waitFor();

  // 3. Reverse hunt on Verdant.
  await page.getByLabel('Graine de la partie').fill('5');
  await page.locator('[data-isles-start=reverse]').click();
  await page.waitForFunction(() => window.__islesV1?.kind === 'reverse');
  await page.waitForTimeout(1500);
  report.metrics.verdant = await hook(page, isles => isles.stats());
  await shot(page, '12-reverse-start');
  await page.keyboard.press('KeyX'); await page.waitForTimeout(500);
  await shot(page, '13-reverse-thermal');
  await page.keyboard.press('KeyX');
  // Watch the team from above the camp road while the clock runs.
  await hook(page, isles => { isles.advance(60); const h = isles.match().humans[0]; isles.place(h.x + 6, h.z - 6, 0); });
  await page.waitForTimeout(800);
  await shot(page, '14-reverse-team-search');
  const mid = await hook(page, isles => { const m = isles.match(); return {time: m.time, found: m.pieces.filter(p => p.found).length, log: m.log.map(l => l.text)}; });
  step('Chasse inversée : l’équipe débarque et cherche les pièces', {simSeconds: Math.round(mid.time), piecesFound: mid.found});
  // Down one human in front of the hunter and take his trophy with the keys.
  const target = await hook(page, isles => {
    const m = isles.match(); const h = m.humans.find(item => item.status === 'active');
    h.surrenderDecided = true;
    // The rest of the team is sent back to the landing beach so nobody revives him during the proof.
    m.humans.filter(o => o !== h).forEach((o, i) => { o.x = 88 + i * 2; o.z = 176; o.path = []; o.pathTarget = ''; });
    isles.place(h.x, h.z - 1.5, 0); m.yautja.actor.facing = 0; return h.id;
  });
  for (let i = 0; i < 6; i++) {
    const status = await hook(page, (isles, id) => isles.match().humans.find(h => h.id === id).status, target);
    if (status !== 'active') break;
    await hook(page, (isles, id) => { const m = isles.match(); const h = m.humans.find(x => x.id === id); isles.place(h.x, h.z - 1.5, 0); m.yautja.actor.facing = 0; }, target);
    await page.keyboard.press('KeyE'); await page.waitForTimeout(1500);
  }
  assert.equal(await hook(page, (isles, id) => isles.match().humans.find(h => h.id === id).status, target), 'downed');
  await page.keyboard.down('KeyT'); await page.waitForTimeout(2500);
  await shot(page, '15-reverse-trophy');
  await page.waitForFunction(id => window.__islesV1.match().humans.find(h => h.id === id).status === 'trophy', target, {timeout: 90000});
  await page.keyboard.up('KeyT');
  step('frappe, humain à terre, trophée prélevé à la touche T');
  // Leave them alone until the outcome.
  await hook(page, isles => { isles.place(141, 37, 6.5); for (let i = 0; i < 20 && !isles.match().outcome; i++) isles.advance(60); });
  await page.locator('[data-isles-outcome]').waitFor({timeout: 5000});
  const outcome = await hook(page, isles => isles.match().outcome);
  report.metrics.reverseOutcome = outcome;
  await shot(page, '16-reverse-outcome');
  step('la Chasse inversée atteint son issue', outcome);
  await page.getByRole('button', {name: 'Retour aux Îles'}).click();
  await page.getByRole('button', {name: 'Retour au menu'}).click();
  await islesButton.waitFor();
  assert.equal(await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort())), priorStorage);
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, []);
  step('le retour conserve les sauvegardes et l’ordre des modes');

  for (const [index, file] of prototypePaths.entries()) {
    const prototype = await openPage();
    await prototype.page.goto(base + '/' + file);
    await prototype.page.locator('#start').click();
    await prototype.page.locator('#overlay').waitFor({state: 'hidden'});
    await prototype.page.locator('canvas').first().waitFor();
    assert.deepEqual(prototype.errors, []);
    assert.deepEqual(prototype.externalRequests, []);
    await shot(prototype.page, index === 0 ? '17-okavango-html' : '18-verdant-html');
    await prototype.page.context().close();
    step('prototype HTML démarré en local', {file});
  }
} finally {
  await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  server.close();
}
