import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createServer} from 'node:http';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {extname, resolve, sep} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {homeworldSceneSsrV78} from '../tests/helpers/homeworld-scene-ssr-v78.mjs';
import {playShipAcquisitionV161} from '../tests/helpers/ship-receipt-v161.mjs';

const app = await build({
  stdin: {
    loader: 'tsx', sourcefile: 'space-itinerary-v159.fixture.tsx', resolveDir: process.cwd(),
    contents: `
      import {useState} from 'react';
      import {createRoot} from 'react-dom/client';
      import GalaxyMapPanel from './app/game/GalaxyMapPanel';
      import SpaceRoutesPanelV159 from './app/game/SpaceRoutesPanelV159';
      import {DEFAULT_SHIP_ID} from './app/game/shipCatalogue';
      import {loadSaveWithStatus, SAVE_STORAGE_KEY, writeSaveWithStatus} from './app/game/save';
      import {actSpaceRoutesV159, spacePersonalShipV159, type SpaceRoutesActionV159} from './app/game/systems/spaceRoutesV159';

      function Fixture() {
        const [save, setSave] = useState(() => {
          const result = loadSaveWithStatus(localStorage, SAVE_STORAGE_KEY);
          if (!result.loaded || !result.save) throw new Error('Sauvegarde de recette refusée.');
          return result.save;
        });
        const ship = spacePersonalShipV159(save);
        const onAction = (action: SpaceRoutesActionV159) => {
          const result = actSpaceRoutesV159(save.spaceRoutesV159, action, {ownerCreatedAt: save.createdAt, ship});
          if (!result.accepted || !result.changed) return result;
          const next = {...save, spaceRoutesV159: result.state};
          if (!writeSaveWithStatus(next, localStorage, SAVE_STORAGE_KEY).persisted) {
            return {accepted: false, changed: false, state: save.spaceRoutesV159 ?? null, message: 'Écriture refusée.'};
          }
          setSave(next);
          return result;
        };
        return <GalaxyMapPanel missionProgress={save.missionProgress} selectedShipId={DEFAULT_SHIP_ID}
          initialState={{level: 'sector', sectorId: 'sector-tempest-veil', systemId: null, planetId: null, missionId: null, cursorIndex: 0}}
          onBack={() => {}} onChooseMission={() => {}}
          routesPanel={<SpaceRoutesPanelV159 ownerCreatedAt={save.createdAt}
            state={save.spaceRoutesV159 ?? null} ship={ship} onAction={onAction}/>}
        />;
      }
      createRoot(document.getElementById('root')!).render(<Fixture/>);
    `,
  },
  outdir: 'fixture-dist', write: false, bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
  define: {'process.env.NODE_ENV': '"production"'}, logLevel: 'warning',
});
const scripts = app.outputFiles.find(file => file.path.endsWith('.js')).contents;
const modules = app.outputFiles.find(file => file.path.endsWith('.css')).text;
const globals = (await readFile('app/globals.css', 'utf8')).replace('@import "tailwindcss";', '');
const publicDir = resolve('public');
const contentTypes = {'.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.wav': 'audio/wav'};
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://127.0.0.1').pathname;
  if (path === '/') {
    response.setHeader('content-type', 'text/html; charset=utf-8');
    response.end('<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width"><title>Itinéraire V159</title><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script src="/fixture.js"></script></html>');
  } else if (path === '/fixture.js' || path === '/fixture.css') {
    response.setHeader('content-type', path.endsWith('.js') ? 'text/javascript' : 'text/css');
    response.end(path.endsWith('.js') ? scripts : globals + modules);
  } else if (path === '/favicon.ico') {
    response.writeHead(204).end();
  } else {
    try {
      const file = resolve(publicDir, '.' + decodeURIComponent(path));
      if (!file.startsWith(publicDir + sep)) { response.writeHead(404).end(); return; }
      const body = await readFile(file);
      response.setHeader('content-type', contentTypes[extname(file)] ?? 'application/octet-stream');
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  }
});

const qa = homeworldSceneSsrV78();
const saves = qa.load('app/game/save.ts');
const routes = qa.load('app/game/systems/spaceRoutesV159.ts');
const plain = saves.defaultSave('2026-11-21T10:00:00.000Z');
plain.profile.honor = 250;
plain.profile.rankId = 'blooded';
const owned = playShipAcquisitionV161(qa, structuredClone(plain));
const ship = routes.spacePersonalShipV159(owned);
assert(ship.owned && ship.shipId);
const output = resolve(process.env.YAUTJA_ITINERARY_QA_OUTPUT ?? 'outputs/qa-space-itinerary-v159');

await mkdir(output, {recursive: true});
const checks = [], errors = [];
function record(name) { checks.push(name); console.log(name); }
let browser;
try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch(process.env.CHROMIUM_EXECUTABLE_PATH
    ? {executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox']}
    : {channel: 'chrome', args: ['--no-sandbox']});
  async function open(save) {
    const context = await browser.newContext({locale: 'fr-FR', viewport: {width: 1280, height: 900}, reducedMotion: 'reduce'});
    await context.addInitScript(({key, data}) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, data);
    }, {key: saves.SAVE_STORAGE_KEY, data: JSON.stringify(save)});
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    return {context, page};
  }
  const itinerary = page => page.locator('[data-space-itinerary]');
  const destination = page => itinerary(page).getByLabel('Destination de l’itinéraire');
  const engage = page => itinerary(page).getByRole('button', {name: 'Engager la première liaison'});
  const campaign = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saves.SAVE_STORAGE_KEY);
  const system = (page, name) => page.getByRole('navigation', {name: 'Destinations du niveau sector'})
    .getByRole('button', {name: new RegExp('Système ' + name)});
  const routeIds = page => itinerary(page).locator('[data-itinerary-route]')
    .evaluateAll(elements => elements.map(element => element.dataset.itineraryRoute));

  const refused = await open(plain);
  const noShip = refused.page;
  await system(noShip, 'Tempest').click();
  assert.equal(await destination(noShip).inputValue(), 'system-tempest');
  assert.equal(await engage(noShip).isDisabled(), true);
  assert.equal((await campaign(noShip)).spaceRoutesV159, undefined);
  record('La carte remplit l’itinéraire et le départ est verrouillé sans le reçu V161.');
  await refused.context.close();

  const player = await open(owned);
  const page = player.page;
  await destination(page).selectOption('system-oseris');
  await itinerary(page).getByRole('status').getByText('Le vaisseau est déjà dans ce système.').waitFor();
  assert.equal(await engage(page).count(), 0);
  await system(page, 'Tempest').click();
  assert.equal(await destination(page).inputValue(), 'system-tempest');
  assert.equal(await itinerary(page).getAttribute('data-itinerary-from'), 'system-oseris');
  assert.deepEqual(await routeIds(page), ['route-oseris-cinder', 'route-cinder-pelagos', 'route-pelagos-tempest']);
  await itinerary(page).getByRole('status').getByText(/10 étapes de base, hors incidents/).waitFor();
  assert.equal((await campaign(page)).spaceRoutesV159, undefined);
  record('Oseris → Tempest prévoit trois liaisons et 10 étapes de base, sans avancer le voyage.');
  await itinerary(page).screenshot({path: resolve(output, '01-itineraire.png')});

  await engage(page).click();
  await page.locator('[data-trip-id]').waitFor();
  let saved = (await campaign(page)).spaceRoutesV159;
  assert.equal(saved.trip.routeId, 'route-oseris-cinder');
  assert.equal(saved.trip.manifest.shipId, ship.shipId);
  assert.equal(saved.tripSequence, 1);
  assert.equal(await engage(page).count(), 0);
  assert.equal(await itinerary(page).getAttribute('data-itinerary-from'), 'system-cinder');
  assert.deepEqual(await routeIds(page), ['route-cinder-pelagos', 'route-pelagos-tempest']);
  record('Le départ écrit uniquement la première liaison et l’appareil issu du reçu dans le manifeste.');

  await page.reload();
  assert.equal(await page.locator('[data-trip-ship-id]').getAttribute('data-trip-ship-id'), ship.shipId);
  await system(page, 'Tempest').click();
  const post = page.locator('[data-space-routes-v159]');
  for (let action = 0; action < 7 && saved.trip; action++) {
    const incident = post.locator('[data-incident-id]');
    const button = await incident.count()
      ? incident.locator('button[data-choice="0"]')
      : post.getByRole('button', {name: /Parcourir l’étape suivante|Achever le trajet/});
    await button.click();
    saved = (await campaign(page)).spaceRoutesV159;
  }
  assert.equal(saved.trip, null);
  assert.equal(saved.tripSequence, 1);
  assert.equal(saved.currentSystemId, 'system-cinder');
  assert.equal(saved.arrivals.length, 1);
  assert.deepEqual(await routeIds(page), ['route-cinder-pelagos', 'route-pelagos-tempest']);
  assert.equal(await engage(page).isEnabled(), true);
  record('Après rechargement, l’arrivée à Cinder est persistée et la suite attend un départ explicite.');
  await itinerary(page).screenshot({path: resolve(output, '02-escale.png')});
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, 'recette.json'), JSON.stringify({checks, errors, saved}, null, 2) + '\n');
} finally {
  await browser?.close();
  server.close();
}
