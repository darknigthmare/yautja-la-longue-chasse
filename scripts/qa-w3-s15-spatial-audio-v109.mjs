import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {createServer} from 'node:http';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {createLegacySupplyDriverV109} from '../tests/helpers/clan-supply-route-v109-fixture.mjs';
import {homeworldSceneSsrV78} from '../tests/helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const logistics = qa.load('app/game/systems/clanLogisticsV108.ts');
const {CLAN_SUPPLY_KEY_V109} = qa.load('app/game/systems/clanSupplyRouteV109.ts');
const fixture = createLegacySupplyDriverV109(logistics);
const listener = 'operator:W3-S15';
fixture.send({kind: 'hire', actor: 'carrier'});
fixture.send({kind: 'hire', actor: listener});
fixture.wait(3);
for (const [actor, amount] of [['carrier', 20], [listener, 6]]) {
  fixture.home(actor);
  fixture.send({kind: 'rav-load', actor, location: 'depot', amount});
}
fixture.build('W3-S15');
const initial = logistics.exportLogisticsV108(fixture.state);
assert(initial);

const assets = new Map();
for (const source of logistics.CLAN_LOGISTICS_AUDIO_V108) {
  const bytes = await readFile('public' + source.src);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256);
  assets.set(source.src, bytes);
}
const bundle = await build({
  stdin: {loader: 'tsx', sourcefile: 'w3-s15.fixture.tsx', resolveDir: process.cwd(), contents: `
    import {createRoot} from 'react-dom/client';
    import ClanSupplyRouteV109 from './app/game/ClanSupplyRouteV109';
    import {DEFAULT_WAR_RULES_V6} from './app/game/systems/clanWarBibleV6';
    createRoot(document.getElementById('root')!).render(<ClanSupplyRouteV109 rules={DEFAULT_WAR_RULES_V6}/>);
  `},
  outdir: 'fixture-dist', write: false, bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
  define: {'process.env.NODE_ENV': '"production"'}, logLevel: 'warning',
});
const js = bundle.outputFiles.find(file => file.path.endsWith('.js')).contents;
const css = bundle.outputFiles.find(file => file.path.endsWith('.css')).contents;
const html = '<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width"><title>Écoute W3-S15</title><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/client.js"></script></html>';
const files = new Map([['/', ['text/html; charset=utf-8', html]], ['/client.js', ['text/javascript', js]], ['/style.css', ['text/css', css]]]);
for (const [path, bytes] of assets) files.set(path, ['audio/wav', bytes]);
const server = createServer((request, response) => {
  const path = new URL(request.url, 'http://127.0.0.1').pathname;
  const file = files.get(path);
  if (!file) { response.writeHead(404).end(); return; }
  response.setHeader('content-type', file[0]);
  response.end(file[1]);
});

const output = resolve(process.env.YAUTJA_W3_S15_QA_OUTPUT ?? 'outputs/qa-w3-s15-spatial-audio-v109');
await mkdir(output, {recursive: true});
const checks = [], errors = [];
const record = name => { checks.push(name); console.log(name); };
let browser;
try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch(process.env.CHROMIUM_EXECUTABLE_PATH
    ? {executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox']}
    : {channel: 'chrome', args: ['--no-sandbox']});
  const context = await browser.newContext({locale: 'fr-FR', viewport: {width: 1360, height: 900}});
  await context.addInitScript(({key, initial}) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, initial);
    // Attach meters to the real post-panner signal. The original connection
    // still goes to AudioDestinationNode, and no media or DSP node is replaced.
    const sources = new WeakMap(), outputs = new WeakMap();
    const meters = new Map();
    const connectMedia = MediaElementAudioSourceNode.prototype.connect;
    MediaElementAudioSourceNode.prototype.connect = function(destination, ...ports) {
      if (destination instanceof GainNode) sources.set(destination, this.mediaElement);
      return connectMedia.call(this, destination, ...ports);
    };
    const connectGain = GainNode.prototype.connect;
    GainNode.prototype.connect = function(destination, ...ports) {
      if (destination instanceof StereoPannerNode && sources.has(this))
        outputs.set(destination, {media: sources.get(this), gain: this});
      return connectGain.call(this, destination, ...ports);
    };
    const connectPan = StereoPannerNode.prototype.connect;
    StereoPannerNode.prototype.connect = function(destination, ...ports) {
      const channel = outputs.get(this);
      if (channel && destination === this.context.destination) {
        const splitter = this.context.createChannelSplitter(2);
        const readers = [this.context.createAnalyser(), this.context.createAnalyser()];
        connectPan.call(this, splitter);
        readers.forEach((reader, index) => {
          reader.fftSize = 1024;
          splitter.connect(reader, index);
        });
        meters.set(new URL(channel.media.src).pathname, {panner: this, gain: channel.gain, readers});
      }
      return connectPan.call(this, destination, ...ports);
    };
    window.measureW3Audio = path => {
      const meter = meters.get(path);
      if (!meter) return null;
      const rms = meter.readers.map(reader => {
        const samples = new Float32Array(reader.fftSize);
        reader.getFloatTimeDomainData(samples);
        return Math.sqrt(samples.reduce((total, value) => total + value * value, 0) / samples.length);
      });
      return {rms, gain: meter.gain.gain.value, pan: meter.panner.pan.value, audioContext: meter.panner.context.state};
    };
  }, {key: CLAN_SUPPLY_KEY_V109, initial});
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const responses = new Map();
  page.on('response', response => {
    const path = new URL(response.url()).pathname;
    if (assets.has(path)) responses.set(path, response.status());
  });
  await page.goto(origin);
  const root = page.locator('[data-logistics-v109]');
  const view = id => root.locator('[data-logistics-audio="' + id + '"]');
  const take = id => view(id).getByRole('button', {name: 'Conserver la prise ' + id});
  const source = id => logistics.CLAN_LOGISTICS_AUDIO_V108.find(entry => entry.id === id).src;
  const state = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)).convoy, CLAN_SUPPLY_KEY_V109);
  async function walk(x, y) {
    const terrain = root.getByRole('group', {name: 'Terrain logistique jouable'});
    await terrain.scrollIntoViewIfNeeded();
    const position = await terrain.evaluate((svg, point) => {
      const target = svg.createSVGPoint();
      target.x = point.x;
      target.y = point.y;
      const screen = target.matrixTransform(svg.getScreenCTM()), bounds = svg.getBoundingClientRect();
      return {x: screen.x - bounds.left, y: screen.y - bounds.top};
    }, {x, y});
    await terrain.click({position});
    await page.waitForFunction(({listener, x, y}) => {
      const actor = document.querySelector('[data-logistics-actor="' + listener + '"]');
      return actor && Math.hypot(Number(actor.dataset.x) - x, Number(actor.dataset.y) - y) < 3.5;
    }, {listener, x, y});
    await root.getByRole('button', {name: 'Stopper le déplacement', exact: true}).click();
  }
  async function play(id) {
    // Loop the original clip in the recipe to keep measuring while the actor
    // walks. Production playback uses the native control duration.
    await view(id).locator('audio').evaluate(async media => {media.loop = true; await media.play();});
  }
  async function waitMeasured(id, sign) {
    await page.waitForFunction(({path, sign}) => {
      const measured = window.measureW3Audio(path);
      if (!measured || measured.audioContext !== 'running' || measured.pan * sign < .65) return false;
      const [main, side] = sign < 0 ? measured.rms : [...measured.rms].reverse();
      return main > .0001 && main > side * 1.5;
    }, {path: source(id), sign});
    return page.evaluate(path => window.measureW3Audio(path), source(id));
  }

  await root.getByRole('button', {name: /^W3-S15 ·/}).click();
  await root.getByRole('combobox', {name: /^Équipe contrôlée/}).selectOption(listener);
  await walk(730, 50);
  await walk(640, 70);
  await play('ship');
  const left = await waitMeasured('ship', -1);
  await walk(560, 70);
  const right = await waitMeasured('ship', 1);
  assert(right.gain > left.gain);
  record('Les deux canaux de la machinerie s’inversent et le niveau augmente en approchant du même fichier.');
  await root.getByRole('button', {name: 'Conserver la prise ship'}).click();
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).convoy.recordings.length === 1, CLAN_SUPPLY_KEY_V109);

  await walk(750, 70);
  assert.equal(await view('ship').getAttribute('data-availability'), 'range');
  assert.equal(await view('ship').locator('audio').evaluate(media => media.paused), true);
  assert.equal(await take('ship').isDisabled(), true);
  record('La sortie de portée coupe le lecteur et invalide l’écoute restante.');
  await walk(820, 70);
  await walk(820, 145);
  await play('scan');
  await waitMeasured('scan', 1);
  await walk(820, 110);
  assert.equal(await view('scan').getAttribute('data-availability'), 'occluded');
  assert.equal(await view('scan').locator('audio').evaluate(media => media.paused), true);
  assert.equal(await take('scan').isDisabled(), true);
  await page.waitForFunction(path => window.measureW3Audio(path).gain < .001, source('scan'));
  const occluded = await page.evaluate(path => window.measureW3Audio(path), source('scan'));
  record('Un obstacle à moins de 150 unités met le gain à zéro et empêche une prise.');
  await view('scan').screenshot({path: resolve(output, '01-occultation.png')});

  await walk(820, 145);
  assert.equal(await view('scan').locator('audio').evaluate(media => media.paused), true);
  assert.equal(await take('scan').isDisabled(), true);
  await play('scan');
  await waitMeasured('scan', 1);
  await page.waitForFunction(()=>!document.querySelector('[data-logistics-audio="scan"] button').disabled);
  await root.evaluate(node => node.setAttribute('inert', ''));
  await page.waitForFunction(()=>document.querySelector('[data-logistics-audio="scan"] audio').paused);
  await root.evaluate(node => node.removeAttribute('inert'));
  assert.equal(await take('scan').isDisabled(), true);
  record('Le panneau masqué coupe la lecture et la reprise demande une nouvelle écoute.');
  await play('scan');
  await take('scan').click();
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).convoy.recordings.length === 2, CLAN_SUPPLY_KEY_V109);
  await walk(820, 100);
  await walk(776, 100);
  const service = root.getByRole('button', {name: 'Prendre le service', exact: true});
  if (await service.count()) await service.click();
  await root.getByRole('button', {name: 'Comparer les prises à la station', exact: true}).click();
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).convoy.compared === true, CLAN_SUPPLY_KEY_V109);
  const beforeReload = await state();
  assert.deepEqual(beforeReload.recordings.map(recording => recording.sourceId), ['ship', 'scan']);
  await page.reload();
  assert.deepEqual(await state(), beforeReload);
  record('Les deux prises de la scène sont comparées au poste et rechargées depuis le carnet.');
  assert.deepEqual([...responses.keys()].sort(), [...assets.keys()].sort());
  assert([...responses.values()].every(status => status === 200));
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, 'rapport.json'), JSON.stringify({checks, signals: {left, right, occluded}, sources: [...responses], errors}, null, 2) + '\n');
} finally {
  await browser?.close();
  server.close();
}
