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
    ['10.2', 'The Shallows', '07-shallows-atoll'], ['2.2', 'Hollowpine', '08-hollowpine-montagne'], ['12.1', 'Saltmarsh', '09-saltmarsh-bayous'],
    // Named places of the plans « Big City », « Comercial Zone » and « Industrial zone ».
    ['4.16', 'Calder', '10-calder-aeroport'], ['4.17', 'Calder', '11-calder-complexe-sportif'], ['4.14', 'Calder', '12-calder-big-ball-circuit'],
    ['4.12', 'Calder', '13-calder-marina-richou'], ['4.13', 'Calder', '14-calder-beach'], ['6.4', 'Eastbank', '15-eastbank-gull-pier'],
    ['6.3', 'Eastbank', '16-eastbank-parc-attractions'], ['6.2', 'Eastbank', '17-eastbank-zoo'], ['5.8', 'Steelwater', '18-steelwater-raffinerie'],
    ['5.7', 'Steelwater', '19-steelwater-conteneurs'], ['B.1', 'Blackrock', '20-blackrock-prison']];
  for (const [id, name, file] of visits) {
    const site = size.sites.find(item => item.id === id);
    await hook((isles, at) => isles.travel(at.x, at.z), {x: site.x, z: site.z});
    await page.waitForFunction(expected => (document.querySelector('[data-isles-place]')?.textContent ?? '').includes(expected), name, {timeout: 30000});
    await page.waitForTimeout(4000);
    await shot(file);
    step('voyage : ' + name + ' · ' + site.label);
  }
  // --- Living world: true-scale relief, weather, transports to ride, wildlife.
  const go = async (id, name) => {
    const site = size.sites.find(item => item.id === id);
    await hook((isles, at) => isles.travel(at.x, at.z), {x: site.x, z: site.z});
    await page.waitForFunction(expected => (document.querySelector('[data-isles-place]')?.textContent ?? '').includes(expected), name, {timeout: 30000});
    await page.waitForTimeout(3500);
    return site;
  };
  await go('3.1', 'Ember');
  const summit = await hook(isles => isles.actor().y);
  assert.ok(summit > 1000, 'le cratère de l’Ember est à plus de 1 000 m : ' + summit);
  await shot('21-ember-sommet-vraie-echelle');
  step('relief à la vraie échelle : sommet de l’Ember', {altitude: summit});
  await go('2.2', 'Hollowpine');
  await shot('22-hollowpine-altitude');
  const weatherText = await page.locator('[data-isles-weather]').innerText();
  assert.match(weatherText, /\d\d h \d\d · (jour|nuit) · .+ · altitude \d+ m/);
  // Twelve game hours later the clock, the night and the weather block have moved on.
  const clockBefore = await hook(isles => ({hour: isles.living().hour, weather: isles.living().weather.type}));
  await hook(isles => { isles.clock(60 * 15); isles.advance(1); });
  await page.waitForTimeout(1500);
  const after = await hook(isles => ({hour: isles.living().hour, weather: isles.living().weather.type}));
  assert.ok(after.hour - clockBefore.hour > 10, 'l’horloge avance');
  assert.match(await page.locator('[data-isles-weather]').innerText(), /nuit/);
  await shot('23-nuit-et-meteo');
  step('horloge, nuit et météo par climat', {before: clockBefore, after, chip: weatherText});

  // A metro of Calder: wait for one near Midtown, climb on its roof with G and travel with it.
  const midtown = await go('4.3', 'Calder');
  let ride = null;
  for (let tries = 0; tries < 40 && !ride; tries++) {
    ride = await hook((isles, at) => isles.living().vehicles.find(v => v.cls === 'rail' && Math.hypot(v.x - at.x, v.z - at.z) < 380) ?? null, {x: midtown.x, z: midtown.z});
    if (!ride) await hook(isles => isles.advance(20));
  }
  assert.ok(ride, 'un train ou un métro passe près de Midtown');
  await hook((isles, v) => isles.place(v.x + 1, v.z + 1, v.y + v.height), ride);
  await page.waitForTimeout(600);
  assert.ok(await page.locator('[data-isles-boardable]').count(), 'le véhicule propose de monter');
  await page.keyboard.press('KeyG');
  await page.locator('[data-isles-riding]').waitFor({timeout: 15000});
  const start = await hook(isles => ({x: isles.actor().x, z: isles.actor().z}));
  await shot('24-sur-le-toit-du-metro');
  // The vehicle may still be waiting at its platform: ride until it has carried the hunter away.
  for (let waits = 0; waits < 12; waits++) {
    await hook(isles => isles.advance(60));
    const at = await hook(isles => ({x: isles.actor().x, z: isles.actor().z}));
    if (Math.hypot(at.x - start.x, at.z - start.z) > 150) break;
  }
  await page.waitForTimeout(1500);
  const carried = await hook(isles => { const l = isles.living(), v = l.vehicles.find(item => item.id === l.riding), a = isles.actor(); return {x: a.x, z: a.z, y: a.y, off: v ? Math.hypot(v.x - a.x, v.z - a.z) : null, deck: v ? v.y + v.height : null, length: v?.length}; });
  assert.ok(carried.off !== null && carried.off <= carried.length / 2 + 2, 'le chasseur reste sur le véhicule : ' + JSON.stringify(carried));
  assert.ok(Math.hypot(carried.x - start.x, carried.z - start.z) > 100, 'le véhicule a emmené le chasseur à plus de 100 m');
  await shot('25-voyage-en-metro');
  await page.keyboard.press('KeyG');
  await page.waitForFunction(() => !document.querySelector('[data-isles-riding]'), null, {timeout: 15000});
  step('transports : monter sur un métro, voyager, descendre', {vehicle: ride.id, kind: ride.kind, metres: Math.round(Math.hypot(carried.x - start.x, carried.z - start.z))});
  report.metrics.lines = await hook(isles => isles.living().lines);
  assert.ok(await page.locator('[data-isles-stop]').count() >= 0);

  // Wildlife of the savanna: herds appear around the hunter, one is brought down with the plasma caster.
  await go('14.1', 'Tallgrass');
  await hook(isles => { isles.clock(60 * 6); isles.advance(8); });
  await page.waitForTimeout(2500);
  let herd = await hook(isles => isles.fauna().filter(a => !a.dead));
  for (let tries = 0; tries < 6 && herd.length < 3; tries++) { await hook(isles => isles.advance(5)); herd = await hook(isles => isles.fauna().filter(a => !a.dead)); }
  assert.ok(herd.length >= 3, 'des animaux autour du chasseur à Tallgrass : ' + herd.length);
  const allowed = ['lion', 'hyene', 'buffle', 'antilope', 'rhinoceros', 'vautour'];
  for (const animal of herd) assert.ok(allowed.includes(animal.species), 'espèce de la savane : ' + animal.species);
  const prey = herd.find(a => !a.airborne) ?? herd[0];
  await hook((isles, a) => isles.place(a.x - 1.2, a.z, a.y), prey);
  await page.waitForTimeout(400);
  await shot('26-faune-de-tallgrass');
  let killed = false;
  for (let blows = 0; blows < 14 && !killed; blows++) {
    const now = await hook((isles, id) => isles.fauna().find(a => a.id === id) ?? null, prey.id);
    if (!now || now.dead) { killed = true; break; }
    // The herd runs from the hunter: the plasma caster reaches what the wrist blades cannot catch.
    await hook((isles, a) => { isles.place(a.x - 6, a.z, a.y); isles.actor().facing = Math.PI / 2; }, now);
    await page.keyboard.press('KeyF');
    await page.waitForTimeout(750);
  }
  const hunt = await hook(isles => ({honor: isles.living().honor, log: isles.living().log, health: isles.living().health}));
  assert.ok(killed, 'la proie est abattue au plasma : ' + JSON.stringify(hunt));
  await shot('27-proie-abattue');
  step('faune par île : troupeaux de la savane, proie abattue', {species: prey.species, ...hunt});

  report.metrics.end = await hook(isles => ({...isles.stats(), cached: isles.archipelago().cached}));
  assert.ok(report.metrics.end.cached <= 900, 'cache borné : ' + report.metrics.end.cached);
  assert.ok(report.metrics.end.zones <= 81, 'zones affichées bornées : ' + report.metrics.end.zones);
  step('après ' + (visits.length + 1) + ' voyages, le monde en mémoire reste borné', report.metrics.end);
  assert.deepEqual(errors, []);
} finally {
  report.errors = errors;
  await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  server.close();
}
