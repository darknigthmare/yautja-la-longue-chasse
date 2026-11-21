import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {join, resolve, sep} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {createWarW3S14DuelServer, loadWarW3S14DuelRules} from './serve-clan-war-w3-s14-duel.mjs';
import {createLegacySupplyDriverV109} from '../tests/helpers/clan-supply-route-v109-fixture.mjs';

const game = await loadWarW3S14DuelRules();
const tokens = ['A'.repeat(43), 'B'.repeat(43)];
const {publicKey, privateKey} = generateKeyPairSync('ed25519');
const trustedKey = publicKey.export({type: 'spki', format: 'der'}).toString('base64url');
const issuance = {
  privateKey: privateKey.export({type: 'pkcs8', format: 'pem'}),
  owners: ['2026-11-21T09:00:00.000Z', '2026-11-21T12:00:00.000Z'],
};
const operator = 'operator:W3-S14';
const fixture = createLegacySupplyDriverV109(game);
for (const actor of ['carrier', operator, 'rival']) fixture.send({kind: 'hire', actor});
fixture.wait(3);
for (const actor of [operator, 'rival']) {
  fixture.home(actor);
  fixture.send({kind: 'rav-load', actor, location: 'depot', amount: 6});
}
fixture.send({kind: 'rav-load', actor: 'carrier', location: 'depot', amount: 20});
fixture.build('W3-S14');
fixture.east('rival', 815, 320);
fixture.walk('carrier', 800, 405);
assert.equal(game.logisticsFunctionalV108(fixture.state, 'W3-S14'), true);
assert.deepEqual(fixture.state.duel.signatures, []);
const legacy = game.exportLogisticsV108(fixture.state);
assert.ok(legacy);
const migrated = game.migrateSupplyArchiveV109(legacy);
assert.ok(migrated.state, migrated.error);
const checkpoint = game.exportSupplyV109(migrated.state);
assert.ok(checkpoint);

const out = resolve(process.env.YAUTJA_W3_S14_QA_OUTPUT ?? 'outputs/qa-w3-s14-duel-20261121');
await mkdir(out, {recursive: true});
const directory = await mkdtemp(join(tmpdir(), 'yautja-w3-s14-browser-'));
const report = {
  scope: 'Chromium et service W3-S14 local, deux accès, carnet V109 préparé par les commandes V108, dossier natif de la Bible V6 avec deux créneaux déclarés.',
  passed: false,
  checks: [],
  screenshots: [],
};
const errors = [];
let server, dossierServer, browser, origin, leader;
const arena = page => page.locator('#duel-arena');
const figure = (page, role) => page.locator('[data-duel-participant="' + role + '"]');
const receipt = page => page.locator('[data-duel-receipt]');
function record(message) {
  report.checks.push(message);
  console.log(message);
}

async function checkRevision(page, revision) {
  await page.waitForFunction(expected => {
    const panel = document.getElementById('duel-arena');
    return panel && !panel.hidden && Number(panel.dataset.revision) >= expected;
  }, revision);
}

async function identify(page, token, role) {
  await arena(page).waitFor({state: 'attached'});
  if (!await arena(page).isVisible()) {
    await page.locator('#duel-token').fill(token);
    await page.getByRole('button', {name: 'Rejoindre le duel', exact: true}).click();
  }
  await arena(page).waitFor({state: 'visible'});
  assert.equal(await arena(page).getAttribute('data-role'), role);
}

async function refresh(page, revision) {
  await page.locator('#duel-refresh').click();
  await checkRevision(page, revision);
}

async function command(page, kind, direction) {
  const selector = '[data-command="' + kind + '"]' + (direction ? '[data-direction="' + direction + '"]' : '');
  const [response] = await Promise.all([
    page.waitForResponse(response => response.url() === origin + '/order' && response.request().method() === 'POST'),
    page.locator(selector).click(),
  ]);
  const payload = await response.json();
  assert.equal(response.status(), 200, kind + ' ' + JSON.stringify(payload));
  assert.ok(payload.state);
  await checkRevision(page, payload.state.revision);
  return payload.state;
}

async function checkX(page, role, x) {
  await page.waitForFunction(({role, x}) => {
    const participant = document.querySelector('[data-duel-participant="' + role + '"]');
    return participant?.getAttribute('data-x') === String(x);
  }, {role, x});
}

async function snapshot(page, token) {
  const response = await page.request.get(origin + '/state', {
    headers: {authorization: 'Bearer ' + token},
  });
  assert.equal(response.status(), 200, await response.text());
  return response.json();
}

try {
  server = createWarW3S14DuelServer(game, {tokens, databasePath: join(directory, 'duel.sqlite'), checkpoint, issuance});
  await new Promise((ready, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', ready);
  });
  origin = 'http://127.0.0.1:' + server.address().port;
  const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH ?? process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  browser = await chromium.launch(executablePath ? {executablePath, args: ['--no-sandbox']} : {channel: 'chrome', args: ['--no-sandbox']});
  const challengerContext = await browser.newContext({locale: 'fr-FR', viewport: {width: 1280, height: 900}});
  const rivalContext = await browser.newContext({locale: 'fr-FR', viewport: {width: 1280, height: 900}});
  leader = await challengerContext.newPage();
  const rival = await rivalContext.newPage();
  for (const page of [leader, rival]) {
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin, {waitUntil: 'domcontentloaded'});
    assert.equal(await arena(page).isVisible(), false);
  }
  await identify(leader, tokens[0], 'challenger');
  await identify(rival, tokens[1], 'rival');
  assert.equal(await arena(leader).getAttribute('data-phase'), 'unsigned');
  assert.equal(await arena(rival).getAttribute('data-phase'), 'unsigned');
  for (const page of [leader, rival]) {
    await checkX(page, 'challenger', 800);
    await checkX(page, 'rival', 815);
  }
  assert.equal(await figure(leader, 'challenger').getAttribute('data-y'), '320');
  record('Les deux navigateurs voient les mêmes positions avec deux rôles distincts.');

  const signed = await command(leader, 'sign');
  assert.equal(signed.duel.signatures.length, 1);
  await refresh(rival, signed.revision);
  const pair = await command(rival, 'sign');
  assert.equal(pair.duel.signatures.length, 2);
  assert.equal(pair.duel.phase, 'accepted');
  await refresh(leader, pair.revision);
  const started = await command(leader, 'start');
  await refresh(rival, started.revision);
  assert.equal(await arena(rival).getAttribute('data-phase'), 'active');
  record('Deux clics acceptent le duel avant que le challenger puisse le démarrer.');

  let won;
  for (let hit = 1; hit <= 3; hit++) {
    const strike = await command(leader, 'strike');
    assert.equal(strike.duel.rival, 3 - hit);
    if (hit === 3) {
      won = strike;
      break;
    }
    const dodge = await command(leader, 'move', 'west');
    await checkX(leader, 'challenger', 776);
    await checkX(leader, 'rival', 815);
    await refresh(rival, dodge.revision);
    await checkX(rival, 'challenger', 776);
    const reply = await command(rival, 'strike');
    assert.equal(reply.duel.player, 3);
    assert.equal(reply.duel.round, hit * 2);
    if (hit === 1) {
      await leader.reload({waitUntil: 'domcontentloaded'});
      await identify(leader, tokens[0], 'challenger');
      await checkRevision(leader, reply.revision);
      await checkX(leader, 'challenger', 776);
      assert.equal(await arena(leader).getAttribute('data-tick'), String(reply.tick));
      record('Après rechargement, le challenger retrouve le même tour et la position de son esquive.');
    } else {
      await refresh(leader, reply.revision);
    }
    await command(leader, 'move', 'east');
    await checkX(leader, 'challenger', 800);
  }
  assert.equal(won.duel.phase, 'won');
  assert.equal(won.receipt.outcome, 'won');
  assert.equal(won.duel.chestHolder, 'site');
  assert.equal(won.receipt.winner, won.participants.find(actor => actor.role === 'challenger').memberId);
  await refresh(rival, won.revision);
  await receipt(leader).waitFor({state: 'visible'});
  await receipt(rival).waitFor({state: 'visible'});
  record('Trois touches au contact et deux esquives à distance aboutissent au même reçu sur les deux vues.');

  const claimed = await command(leader, 'claim');
  assert.equal(claimed.duel.chestHolder, won.receipt.winner);
  assert.deepEqual(claimed.receipt, won.receipt);
  await refresh(rival, claimed.revision);
  await leader.reload({waitUntil: 'domcontentloaded'});
  await identify(leader, tokens[0], 'challenger');
  await receipt(leader).waitFor({state: 'visible'});
  const observed = await snapshot(leader, tokens[0]);
  assert.equal(observed.duel.chestHolder, won.receipt.winner);
  assert.deepEqual(observed.receipt, won.receipt);
  assert.deepEqual((await snapshot(rival, tokens[1])).receipt, won.receipt);
  assert.deepEqual(errors, []);
  for (const [page, filename] of [[leader, 'vainqueur-w3-s14.png'], [rival, 'rival-w3-s14.png']]) {
    await arena(page).screenshot({path: join(out, filename)});
    report.screenshots.push(filename);
  }
  record('Le coffre revient au vainqueur et reste attribué après reconnexion.');
  await proveDossier(leader, won.attestation);
  report.passed = true;
} catch (error) {
  report.error = error.message;
  if (leader) {
    await leader.screenshot({path: join(out, 'echec-w3-s14.png')}).then(() => {
      report.screenshots.push('echec-w3-s14.png');
    }, () => {});
  }
  throw error;
} finally {
  report.browserErrors = errors;
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  for (const listener of [server, dossierServer]) {
    if (listener?.listening) await new Promise((done, reject) => listener.close(error => error ? reject(error) : done()));
  }
  await rm(directory, {recursive: true, force: true});
}

async function proveDossier(challengerPage, expected) {
  const [download] = await Promise.all([
    challengerPage.waitForEvent('download'),
    challengerPage.getByRole('button', {name: 'Télécharger mon reçu signé', exact: true}).click(),
  ]);
  const signedFile = await readFile(await download.path());
  assert.deepEqual(JSON.parse(signedFile), expected);
  assert.doesNotMatch(signedFile.toString(), new RegExp(tokens.join('|')));
  record('Le téléchargement authentifié contient le reçu Ed25519 inscrit par SQLite, sans jeton.');

  const result = await build({entryPoints: ['tests/browser/clan-w3-s14-receipt-dossier.fixture.tsx'],
    outdir: directory, write: false, bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
    define: {'process.env.NODE_ENV': '"production"', 'process.env.NEXT_PUBLIC_YAUTJA_W3_S14_VERIFY_KEY': JSON.stringify(trustedKey)}});
  const js = result.outputFiles.find(file => file.path.endsWith('.js')).contents;
  const css = result.outputFiles.find(file => file.path.endsWith('.css')).contents;
  const publicDir = resolve('public');
  dossierServer = createServer(async (request, response) => {
    try {
      const path = new URL(request.url, 'http://127.0.0.1').pathname;
      if (path === '/') {
        response.setHeader('content-type', 'text/html; charset=utf-8');
        response.end('<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width"><title>Dossier W3-S14</title><link rel="stylesheet" href="/dossier.css"><div id="root"></div><script src="/dossier.js"></script></html>');
      } else if (path === '/dossier.js' || path === '/dossier.css') {
        response.setHeader('content-type', path.endsWith('.js') ? 'text/javascript' : 'text/css');
        response.end(path.endsWith('.js') ? js : css);
      } else if (path === '/favicon.ico') {
        response.writeHead(204).end();
      } else {
        const file = resolve(publicDir, '.' + decodeURIComponent(path));
        if (!file.startsWith(publicDir + sep)) {response.writeHead(404).end();return;}
        response.end(await readFile(file));
      }
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((ready, reject) => {
    dossierServer.once('error', reject);
    dossierServer.listen(0, '127.0.0.1', ready);
  });
  const target = 'http://127.0.0.1:' + dossierServer.address().port;
  const page = await challengerPage.context().newPage();
  page.on('pageerror', error => errors.push(error.message));
  const dossier = page.locator('[data-w3-s14-receipt-dossier]');
  const entries = dossier.locator('[data-w3-s14-receipt]');
  const upload = dossier.getByLabel('Importer mon reçu signé');
  const send = bytes => upload.setInputFiles({name: 'recu-w3-s14.json', mimeType: 'application/json', buffer: bytes});
  async function open(slot = 'challenger') {
    await page.goto(target + '/?slot=' + slot);
    await page.locator('button[data-war-tool-group="forces"]').click();
    await page.getByRole('button', {name: 'Convoi des six ouvrages', exact: true}).click();
    await page.getByRole('button', {name: /^W3-S14 ·/}).click();
    await dossier.locator('summary').click();
  }
  const stored = () => page.evaluate(() => Object.fromEntries(Object.entries(localStorage)
    .filter(([key]) => key.startsWith('yautja:w3-s14:dossier-v1:'))));

  await open();
  const forged = structuredClone(expected);
  forged.body.checkpointSha = 'a'.repeat(64);
  await send(Buffer.from(JSON.stringify(forged)));
  await dossier.getByText(/^Reçu refusé/).waitFor();
  assert.deepEqual(await stored(), {});
  await send(signedFile);
  await dossier.getByText('Reçu signé vérifié et classé.', {exact: true}).waitFor();
  assert.equal(await entries.count(), 1);
  const before = await stored();
  assert.equal(Object.keys(before).length, 1);
  await send(signedFile);
  await dossier.getByText('Ce reçu est déjà classé.', {exact: true}).waitFor();
  assert.deepEqual(await stored(), before);
  record('Le dossier refuse un faux résultat, classe le reçu signé et rend son import répétable sans doublon.');

  await open();
  await entries.waitFor();
  assert.equal(await entries.getAttribute('data-w3-s14-receipt'), expected.body.roomId);
  await dossier.screenshot({path: join(out, 'dossier-w3-s14-verifie.png')});
  report.screenshots.push('dossier-w3-s14-verifie.png');
  await open('rival');
  assert.equal(await entries.count(), 0);
  await send(signedFile);
  await dossier.getByText(/^Reçu refusé/).waitFor();
  assert.deepEqual(await stored(), before);
  assert.doesNotMatch(JSON.stringify(before), new RegExp(tokens.join('|')));
  assert.deepEqual(errors, []);
  record('Le même créneau retrouve son reçu après rechargement. Un autre créneau ne peut ni le voir ni l’importer.');
  await page.close();
}
