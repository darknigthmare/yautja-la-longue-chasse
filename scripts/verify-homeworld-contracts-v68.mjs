import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { campaignFixture, enterCampaignDeck } from './campaign-browser-helpers.mjs';
import { homeworldQaModelV64 } from './homeworld-qa-model-v64.mjs';
import { homeworldNavigatorV66 } from './homeworld-navigation-browser-v66.mjs';

const url = process.env.V68_QA_URL ?? 'http://127.0.0.1:4186';
const output = process.env.V68_CONTRACT_QA_OUTPUT ?? 'work-local/v68/qa/contracts';
await fs.mkdir(output, { recursive: true });
const api = homeworldQaModelV64(process.cwd(), ['homeworld.ts', 'homeworldCity.ts', 'homeworldSpatialCodex.ts', 'homeworldInteriorsV64.ts', 'homeworldRegionsV68.ts', 'homeworldContractsV68.ts']);
const fixture = await campaignFixture();
const { homeworldRegionNavigatorV68 } = await import('./homeworld-region-navigation-browser-v68.mjs');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const checks = [], captures = [], errors = [], network = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) network.push({ status: response.status(), url: response.url() }); });
const capture = async name => {
  const file = path.join(output, name + '.jpg'); await page.screenshot({ path: file, type: 'jpeg', quality: 88 }); captures.push(file);
};
const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), fixture.key);
try {
  await page.addInitScript(({ key, save }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save));
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (window.__contractRefuseSave && name === key) throw new DOMException('Isolated QA refusal', 'QuotaExceededError');
      return original.call(this, name, value);
    };
  }, fixture);
  await enterCampaignDeck(page, { url });
  assert.equal(await page.locator('main[data-game-content-version]').getAttribute('data-game-content-version'), 'V68');
  await page.getByRole('button', { name: 'Yautja Prime · monde natal', exact: true }).click();
  await page.locator('[data-homeworld-actor]').waitFor({ state: 'attached' });
  await page.locator('[data-homeworld-hub] img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 1000));
  const city = homeworldNavigatorV66(page, api);
  await city.focus(); await city.openPoint('market-service');
  const board = page.locator('[data-contracts-v68]');
  assert.equal(await board.locator('[data-contract-id]').count(), 20);
  assert.equal(await board.locator('img[src="/game/homeworld/v68/hunt-board.png"]').evaluate(image => image.complete && image.naturalWidth > 0), true);
  await capture('01-tableau-native');
  const before = await saved();
  const accept = id => board.locator(`[data-contract-id="${id}"] [data-contract-action="accept"]`);
  await page.evaluate(() => { window.__contractRefuseSave = true; });
  await accept('ash-marches-track').click(); await city.tick(96);
  assert.deepEqual((await saved()).homeworld.contractsV68, before.homeworld.contractsV68);
  assert.match(await page.locator('[data-homeworld-hub]').getByRole('dialog').innerText(), /n’a pas été sauvegardé/);
  await page.evaluate(() => { window.__contractRefuseSave = false; });
  for (const id of ['ash-marches-track', 'ash-marches-challenge']) { await accept(id).click(); await city.tick(96); }
  const accepted = await saved();
  assert.equal(accepted.homeworld.contractsV68.entries.filter(entry => entry.status === 'active').length, 2);
  assert.equal(api.contractMarksV68(accepted.homeworld.contractsV68), 0);
  await capture('02-demandes-acceptees');
  checks.push({ check: 'physical-board-acceptance', status: 'PASS', refusesStorageFailure: true, noHistoricalProof: true });

  await city.exitRoom(); await city.focus();
  const entry = api.HOMEWORLD_POINTS.find(point => point.id === 'region-ash-marches');
  const route = api.homeworldSpatialRoute(await city.position(), { x: entry.x, y: entry.y + 42 });
  assert.equal(route.status, 'reachable'); await city.follow(route.points);
  assert.equal(api.nearestHomeworldPoint(await city.position())?.id, entry.id);
  await page.keyboard.press('KeyE'); await city.tick(96);
  await page.locator('[data-homeworld-hub]').getByRole('dialog').getByRole('button', { name: 'Suivre le sentier vers le village', exact: true }).click();
  const scene = page.locator('section[data-homeworld-region-v68="ash-marches"]');
  await scene.waitFor({ state: 'visible' });
  const region = homeworldRegionNavigatorV68(page, api, { saveKey: fixture.key, controlledClock: true });
  await region.resume(); await region.walkOutbound(); await capture('03-village-et-population');
  await region.readTrails(); await region.observeFauna(); await capture('04-piste-observee');
  const observed = await saved();
  assert(observed.homeworld.contractsV68.entries.find(entry => entry.id === 'ash-marches-track').stages[0].proof);
  assert.equal(api.contractMarksV68(observed.homeworld.contractsV68), 0);
  await region.challengeFauna(); await capture('05-defi-retrait-vivant');
  await region.reportToGuide();
  const reported = await saved();
  assert(reported.homeworld.contractsV68.entries.every(entry => entry.stages[0].reportTick !== null));
  assert.equal(api.contractMarksV68(reported.homeworld.contractsV68), 0);
  assert.equal(reported.homeworldRegionV68.fauna.phase, 'retreated');
  await capture('06-rapport-guide');
  await region.walkReturn(); await scene.waitFor({ state: 'hidden' });
  await city.tick(96); await page.locator('[data-homeworld-actor]').waitFor({ state: 'attached' });
  assert.equal((await saved()).homeworldRegionV68, null);
  await city.focus(); await city.openPoint('market-service');
  checks.push({ check: 'played-field-route', status: 'PASS', provenance: 'Real keyboard movement through the connector, guide, three ordered traces, timed observation, two avoided charges, three recovery touches, guide return and the entire reverse connector.',
    field: { tick: reported.homeworldRegionV68.tick, walked: reported.homeworldRegionV68.walked, observedTicks: reported.homeworldRegionV68.observedTicks, chargesAvoided: reported.homeworldRegionV68.fauna.evaded, touches: reported.homeworldRegionV68.fauna.touches } });

  const ready = await saved();
  const deliver = id => board.locator(`[data-contract-id="${id}"] [data-contract-action="deliver"]`);
  await page.evaluate(() => { window.__contractRefuseSave = true; });
  await deliver('ash-marches-track').click(); await city.tick(96);
  assert.deepEqual((await saved()).homeworld.contractsV68, ready.homeworld.contractsV68);
  await page.evaluate(() => { window.__contractRefuseSave = false; });
  for (const id of ['ash-marches-track', 'ash-marches-challenge']) { await deliver(id).click(); await city.tick(96); }
  const finished = await saved();
  assert.equal(api.contractMarksV68(finished.homeworld.contractsV68), 48);
  assert(finished.homeworld.contractsV68.entries.every(entry => entry.status === 'completed'));
  assert.equal(await board.locator('[data-contract-action="deliver"]').count(), 0);
  for (const field of ['inventory', 'trophies', 'missionProgress', 'justice', 'loadout']) assert.deepEqual(finished[field], before[field]);
  for (const field of ['rankId', 'honor']) assert.equal(finished.profile[field], before.profile[field]);
  assert.equal(finished.profile.clanMarks, before.profile.clanMarks + 48);
  const showBoardHeader = async () => {
    await board.evaluate(node => { const dialog = node.closest('[role="dialog"]'); if (dialog) dialog.scrollTop = 0; });
    await city.tick(32);
    const heading = await board.getByRole('heading', { name: 'Tableau des chasses', exact: true }).boundingBox();
    assert(heading && heading.y >= 0 && heading.y + heading.height <= page.viewportSize().height);
  };
  await showBoardHeader();
  await capture('07-remises-uniques');
  await page.setViewportSize({ width: 393, height: 852 }); await city.tick(100);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  // The first native combobox is the category filter. A wrapped label also
  // contains its option text, so an exact getByLabel match is unsuitable here.
  const categoryFilter = board.getByRole('combobox').first();
  await categoryFilter.selectOption('protection');
  assert.equal(await board.locator('[data-contract-id]').count(), 3);
  await categoryFilter.selectOption('all');
  await board.getByRole('button', { name: 'Mes demandes', exact: true }).click();
  assert.equal(await board.locator('[data-contract-id]').count(), 2);
  await board.getByRole('button', { name: 'Voir toutes les demandes', exact: true }).click();
  assert.equal(await board.locator('[data-contract-id]').count(), 20);
  assert.deepEqual((await saved()).homeworld.contractsV68, finished.homeworld.contractsV68);
  await showBoardHeader();
  await capture('08-tableau-mobile');
  await page.clock.resume(); await page.reload({ waitUntil: 'networkidle' });
  assert.deepEqual((await saved()).homeworld.contractsV68, finished.homeworld.contractsV68);
  assert.equal(api.contractMarksV68((await saved()).homeworld.contractsV68), 48);
  assert.equal((await saved()).profile.clanMarks, before.profile.clanMarks + 48);
  checks.push({ check: 'physical-delivery-and-reload', status: 'PASS', marks: 48, storageFailureAndRetry: true, noRepeatedReward: true, unrelatedProgressPreserved: true, mobileOverflow: false, mobileFiltersAndJournal: true });
  assert.deepEqual(errors, []); assert.deepEqual(network, []);
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ status: 'PASS', url, checks, captures, cityRoutes: city.routes,
    regionRoutes: region.routes, errors, network, fixture: 'Isolated declared legacy adult save with no contracts or field reports. Nothing is injected after entry; all movement and proof actions use the public game controls.', visualReview: 'pending' }, null, 2));
  console.log(JSON.stringify({ status: 'PASS', checks: checks.length, captures: captures.length, output }));
} catch (error) {
  if (!page.isClosed()) await page.screenshot({ path: path.join(output, 'failure.jpg'), type: 'jpeg', quality: 88 }).catch(() => {});
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ status: 'FAIL', url, error: error.stack, checks, captures, errors, network }, null, 2));
  throw error;
} finally { await browser.close(); }
