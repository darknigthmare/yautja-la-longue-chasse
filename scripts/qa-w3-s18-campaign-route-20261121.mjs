/** Native component QA with the real V109 store, V161 ship receipt, and V159 writer. */
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createServer} from 'node:http';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {extname, resolve, sep} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {createLegacySupplyDriverV109} from '../tests/helpers/clan-supply-route-v109-fixture.mjs';
import {homeworldSceneSsrV78} from '../tests/helpers/homeworld-scene-ssr-v78.mjs';
import {playShipAcquisitionV161} from '../tests/helpers/ship-receipt-v161.mjs';

const qa = homeworldSceneSsrV78();
const saves = qa.load('app/game/save.ts');
const routes = qa.load('app/game/systems/spaceRoutesV159.ts');
const logistics = qa.load('app/game/systems/clanLogisticsV108.ts');
const {CLAN_SUPPLY_KEY_V109} = qa.load('app/game/systems/clanSupplyRouteV109.ts');
const out = resolve(process.env.YAUTJA_W3_S18_QA_OUTPUT ?? 'outputs/qa-w3-s18-campaign-route-20261121');
const fixture = createLegacySupplyDriverV109(logistics);
fixture.send({kind: 'hire', actor: 'carrier'});
fixture.send({kind: 'hire', actor: 'operator:W3-S18'});
fixture.wait(3);
for (const [actor, amount] of [['carrier', 20], ['operator:W3-S18', 6]]) {
  fixture.home(actor);
  fixture.send({kind: 'rav-load', actor, location: 'depot', amount});
}
fixture.build('W3-S18');
assert(logistics.logisticsFunctionalV108(fixture.state, 'W3-S18'));
const supply = logistics.exportLogisticsV108(fixture.state);
assert(supply);
const owner = '2026-11-21T00:00:00.000Z';
const plain = saves.defaultSave(owner);
plain.profile.honor = 250;
plain.profile.rankId = 'blooded';
const owned = playShipAcquisitionV161(qa, structuredClone(plain));
const ship = routes.spacePersonalShipV159(owned);
assert(ship.shipId && ship.owned);
assert.equal(routes.spacePersonalShipV159(plain).owned, false);

const bundled = await build({entryPoints: ['tests/browser/clan-w3-s18-campaign-route.fixture.tsx'],
  outdir: out, write: false, bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
  define: {'process.env.NODE_ENV': '"production"'}, logLevel: 'warning'});
const scripts = bundled.outputFiles.find(file => file.path.endsWith('.js')).contents;
const styles = bundled.outputFiles.find(file => file.path.endsWith('.css')).contents;
const publicDir = resolve('public');
const types = {'.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml', '.webp': 'image/webp'};
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://127.0.0.1').pathname;
    if (path === '/') {
      response.setHeader('content-type', 'text/html; charset=utf-8');
      response.end('<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width"><title>Routes W3</title><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/client.js"></script></html>');
    } else if (path === '/client.js' || path === '/style.css') {
      response.setHeader('content-type', path === '/client.js' ? 'text/javascript' : 'text/css');
      response.end(path === '/client.js' ? scripts : styles);
    } else if (path === '/favicon.ico') {
      response.writeHead(204).end();
    } else {
      const file = resolve(publicDir, '.' + decodeURIComponent(path));
      if (!file.startsWith(publicDir + sep)) { response.writeHead(404).end(); return; }
      const data = await readFile(file);
      response.setHeader('content-type', types[extname(file)] ?? 'application/octet-stream');
      response.end(data);
    }
  } catch {
    response.writeHead(404).end();
  }
});

await mkdir(out, {recursive: true});
const checks = [], errors = [];
const record = name => {checks.push(name);console.log(name);};
let browser;
try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch(process.env.CHROMIUM_EXECUTABLE_PATH
    ? {executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox']}
    : {channel: 'chrome', args: ['--no-sandbox']});
  async function open(save, blockMigration = false) {
    const context = await browser.newContext({locale: 'fr-FR', viewport: {width: 1280, height: 900}});
    await context.addInitScript(({supply, supplyKey, save, saveKey, blockMigration}) => {
      if (!localStorage.getItem(supplyKey)) localStorage.setItem(supplyKey, supply);
      if (!localStorage.getItem(saveKey)) localStorage.setItem(saveKey, save);
      if (blockMigration) {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) {
          if (this === localStorage && key === supplyKey && !sessionStorage.getItem('permit-v109-qa')) {
            throw new DOMException('Quota V109 de la recette.', 'QuotaExceededError');
          }
          return original.call(this, key, value);
        };
      }
    }, {supply, supplyKey: CLAN_SUPPLY_KEY_V109, save: JSON.stringify(save), saveKey: saves.SAVE_STORAGE_KEY, blockMigration});
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    return {context, page};
  }
  async function convoi(page) {
    await page.locator('button[data-war-tool-group="forces"]').click();
    await page.getByRole('button', {name: 'Convoi des six ouvrages', exact: true}).click();
    const supplyPanel = page.locator('[data-logistics-v109]');
    await supplyPanel.waitFor();
    return supplyPanel;
  }
  const work = page => page.getByRole('region', {name: 'Routes de campagne depuis W3-S18', exact: true});
  const pick = page => page.getByRole('button', {name: /^W3-S18 ·/}).click();
  const loadCampaign = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saves.SAVE_STORAGE_KEY);
  const readSupply = page => page.evaluate(key => localStorage.getItem(key), CLAN_SUPPLY_KEY_V109);
  const firstRoute = page => work(page).locator('[data-route-id="route-oseris-nivalis"]');
  const join = page => firstRoute(page).getByRole('button', {name: 'Engager la route'});
  const agreement = page => firstRoute(page).getByRole('button', {name: 'Demander l’accord de passage'});

  const preview = await open(plain);
  const supplyPanel = await convoi(preview.page);
  assert.equal(await work(preview.page).count(), 0);
  await pick(preview.page);
  assert.equal(await work(preview.page).locator('[data-ship-owned]').getAttribute('data-ship-owned'), 'false');
  assert.equal(await agreement(preview.page).isDisabled(), true);
  assert.equal(await join(preview.page).isDisabled(), true);
  assert.equal((await loadCampaign(preview.page)).spaceRoutesV159, undefined);
  record('Le quai actif refuse tout départ de campagne avant acquisition V161.');
  await supplyPanel.getByRole('button', {name: 'Quitter le service', exact: true}).click();
  await work(preview.page).getByText(/affectez son opérateur/).waitFor();
  assert.equal(await work(preview.page).locator('[data-space-routes-v159]').count(), 0);
  record('Le service W3-S18 doit rester tenu et ravitaillé pour ouvrir le poste.');
  await preview.context.close();

  const blocked = await open(owned, true);
  const blockedPanel = await convoi(blocked.page);
  await pick(blocked.page);
  await work(blocked.page).getByText(/Confirmez le carnet du convoi/).waitFor();
  assert.equal(await work(blocked.page).locator('[data-space-routes-v159]').count(), 0);
  assert.equal(await readSupply(blocked.page), supply);
  assert.equal((await loadCampaign(blocked.page)).spaceRoutesV159, undefined);
  await blocked.page.evaluate(() => sessionStorage.setItem('permit-v109-qa', 'yes'));
  await blockedPanel.getByRole('button', {name: 'Réessayer la reprise du carnet V108', exact: true}).click();
  await join(blocked.page).waitFor();
  assert.notEqual(await readSupply(blocked.page), supply);
  assert.equal((await loadCampaign(blocked.page)).spaceRoutesV159, undefined);
  record('Un carnet V109 refusé bloque le poste et sa reprise confirmée l’ouvre sans départ implicite.');
  await blocked.context.close();

  const acquired = await open(owned);
  const page = acquired.page;
  const acquiredPanel = await convoi(page);
  await pick(page);
  assert.equal(await work(page).locator('[data-ship-owned]').getAttribute('data-ship-owned'), 'true');
  assert.equal(await join(page).isDisabled(), true);
  await agreement(page).click();
  await work(page).getByText(/Reconnaissez l’escale à pied et maintenez son opérateur/).waitFor();
  assert.equal((await loadCampaign(page)).spaceRoutesV159, undefined);
  await acquiredPanel.getByRole('button', {name: 'Reconnaître l’escale à pied', exact: true}).click();
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.convoy.shuttle.recon === true, CLAN_SUPPLY_KEY_V109);
  const exerciseBytes = await readSupply(page);
  assert.equal(JSON.parse(exerciseBytes).convoy.shuttle.authorized, false);
  await agreement(page).click();
  await work(page).locator('[data-w3-s18-passage="route-oseris-nivalis"]').waitFor();
  const authorized = (await loadCampaign(page)).spaceRoutesV159;
  assert.equal(authorized.trip, null);
  assert.equal(authorized.tripSequence, 0);
  assert.equal(authorized.w3S18Passage.shipId, ship.shipId);
  assert.equal(authorized.w3S18Passage.supplyRevision, JSON.parse(exerciseBytes).revision);
  assert.equal(await readSupply(page), exerciseBytes);
  record('La reconnaissance est jouée au poste ; l’accord de campagne s’enregistre pour la coque et la liaison, indépendamment de la navette prêtée.');

  await page.reload({waitUntil: 'domcontentloaded'});
  await convoi(page);await pick(page);
  assert.equal(await join(page).isEnabled(), true);
  const other = work(page).locator('[data-route-id="route-oseris-cinder"]').getByRole('button', {name: 'Engager la route'});
  assert.equal(await other.isDisabled(), true);
  await join(page).click();
  await work(page).locator('[data-trip-id]').waitFor();
  const embarked = (await loadCampaign(page)).spaceRoutesV159;
  assert.equal(embarked.w3S18Passage, undefined);
  assert.equal(embarked.trip.manifest.shipId, ship.shipId);
  assert.deepEqual(embarked.trip.manifest.w3S18Passage, authorized.w3S18Passage);
  record('Après rechargement, seule la liaison autorisée embarque l’accord au manifeste une fois.');
  const next = () => work(page).getByRole('button', {name: /Parcourir l’étape suivante|Achever le trajet/}).click();
  await next();
  const running = (await loadCampaign(page)).spaceRoutesV159;
  assert.equal(running.trip.legsDone, 1);
  await page.reload({waitUntil: 'domcontentloaded'});
  await convoi(page);await pick(page);
  assert.equal(await work(page).locator('[data-trip-id]').getAttribute('data-trip-id'), embarked.trip.tripId);
  assert.equal(await work(page).locator('[data-trip-id]').getAttribute('data-legs-done'), '1');
  assert.equal((await loadCampaign(page)).spaceRoutesV159.trip.manifest.shipId, ship.shipId);
  record('Le même voyage de la coque du reçu se recharge et reprend depuis le poste.');
  await next();
  const incident = work(page).locator('[data-incident-id="SPACE-E33"]');
  await incident.getByRole('button').first().click();
  await next();
  const arrived = (await loadCampaign(page)).spaceRoutesV159;
  assert.equal(arrived.currentSystemId, 'system-nivalis');
  assert.equal(arrived.trip, null);
  assert.equal(arrived.arrivals.length, 1);
  assert.equal(arrived.arrivals[0].tripId, embarked.trip.tripId);
  assert.deepEqual(arrived.arrivals[0].w3S18Passage, embarked.trip.manifest.w3S18Passage);
  assert.equal(await readSupply(page), exerciseBytes);
  assert.deepEqual(errors, []);
  await work(page).locator('[data-space-routes-v159]').screenshot({path: resolve(out, 'arrivee-w3-s18.png')});
  record('L’arrivée V159 est écrite une fois et ne modifie ni la navette prêtée ni les stocks V109.');
} finally {
  await writeFile(resolve(out, 'report.json'), JSON.stringify({scope: 'native components; prepared V108 construction and V161 receipt', checks, errors}, null, 2) + '\n');
  await browser?.close();
  await new Promise(ok => server.close(ok));
}
