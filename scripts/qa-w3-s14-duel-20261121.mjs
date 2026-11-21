import assert from 'node:assert/strict';
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {chromium} from 'playwright-core';
import {createWarW3S14DuelServer, loadWarW3S14DuelRules} from './serve-clan-war-w3-s14-duel.mjs';
import {createLegacySupplyDriverV109} from '../tests/helpers/clan-supply-route-v109-fixture.mjs';

const game = await loadWarW3S14DuelRules();
const tokens = ['A'.repeat(43), 'B'.repeat(43)];
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
  scope: 'Chromium et service HTTP W3-S14 local, deux contextes séparés et carnet V109 préparé par les commandes V108.',
  passed: false,
  checks: [],
  screenshots: [],
};
const errors = [];
let server, browser, origin, leader;
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
  server = createWarW3S14DuelServer(game, {tokens, databasePath: join(directory, 'duel.sqlite'), checkpoint});
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
  if (server?.listening) await new Promise((done, reject) => server.close(error => error ? reject(error) : done()));
  await rm(directory, {recursive: true, force: true});
}
