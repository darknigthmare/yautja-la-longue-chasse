import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { campaignFixture } from './campaign-browser-helpers.mjs';
import { homeworldQaModelV64 } from './homeworld-qa-model-v64.mjs';
import { homeworldRegionNavigatorV68 } from './homeworld-region-navigation-v68.mjs';

const url = process.env.V70_QA_URL ?? 'http://127.0.0.1:4187', output = process.env.V70_VILLAGE_QA_OUTPUT ?? 'work-local/v70/qa/village-activities';
await fs.mkdir(output, { recursive: true });
const api = homeworldQaModelV64(process.cwd(), ['homeworldRegionsV68.ts', 'homeworldVillageActivitiesV70.ts', 'homeworldVillageRoutesV70.ts']);
const selected = process.env.V70_VILLAGE_REGIONS?.split(',') ?? ['ash-marches', 'pillar-jungle', 'cold-crown'];
assert(selected.length && selected.every(id => api.HOMEWORLD_REGION_IDS_V68.includes(id)));
const base = await campaignFixture(), browser = await chromium.launch({ channel: 'chrome', headless: true }), checks = [], captures = [], errors = [], failures = [];
let page;
async function capture(name) { const path = output + '/' + name + '.jpg'; await page.screenshot({ path, type: 'jpeg', quality: 88 }); captures.push(path); }
try {
  for (const id of selected) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, reducedMotion: 'reduce' });
    page = await context.newPage(); page.setDefaultTimeout(60000);
    page.on('pageerror', e => errors.push(e.message)); page.on('response', r => { if (r.status() >= 400) failures.push({ url: r.url(), status: r.status() }); });
    const fixture = structuredClone(base); fixture.save.homeworldRegionV68 = api.createHomeworldRegionV68(id, 'v70-services-' + id, true);
    if (id === 'forbidden-reserve') {
      fixture.save.homeworld.expeditions['ash-marches'] = { expeditionId: 'ash-marches', trueTrailInspected: true, falseTrailRejected: true, obstacleMoved: true, convoyRecovered: true, shortcutOpened: true, secretFound: false, ticks: 7250 };
      fixture.save.homeworld.expeditions['glass-desert'] = { expeditionId: 'glass-desert', terrainSurveyed: true, transportLogRecovered: true, diversionCorroborated: true, safePassageOpened: true, crossingRoute: 'stepping-stones', beaconDisposition: 'preserve', secretFound: false, ticks: 9000 };
    }
    await page.addInitScript(({ key, save }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save)); }, fixture);
    await page.clock.install(); await page.goto(url, { waitUntil: 'networkidle' }); await page.getByRole('button', { name: /^Continuer/ }).click();
    const root = page.locator('[data-homeworld-region-v68]'); await root.waitFor(); await page.locator('[data-region-resume]').waitFor();
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 150)); const nav = homeworldRegionNavigatorV68(page, api); await nav.resume();
    const durableBefore = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), fixture.key);
    const beforeAtlas = await nav.position(); await page.locator('[data-village-open-atlas-v70]').click();
    assert.equal(await page.locator('[data-village-destination-v70]').count(), 18);
    const atlasTick = Number(await root.getAttribute('data-state-tick')); await nav.tick(1500);
    assert.equal(Number(await root.getAttribute('data-state-tick')), atlasTick, 'Atlas stops the village clock');
    assert.deepEqual(await nav.position(), beforeAtlas, 'Opening the plan never teleports'); await capture(id + '-atlas');
    await page.locator('[data-village-destination-v70="activity:' + id + '-scene-1"]').click();
    assert.deepEqual(await nav.position(), beforeAtlas, 'Choosing an approach draws a path without moving the player');
    assert.equal(await page.locator('[data-village-route-v70]').getAttribute('data-village-route-v70'), 'activity:' + id + '-scene-1');
    const completed = [];
    for (const activity of api.HOMEWORLD_VILLAGE_ACTIVITIES_V70[id]) {
      await nav.walkTo(activity.approach); await capture(activity.id + '-native-station'); await nav.interact();
      const service = page.locator('[data-village-service-v70="' + activity.id + '"]'); await service.waitFor();
      assert.equal(Number(await service.getAttribute('data-service-progress')), 0);
      const pausedTick = Number(await root.getAttribute('data-state-tick')); await nav.tick(2300);
      assert.equal(Number(await root.getAttribute('data-state-tick')), pausedTick, 'Service choices stop all routines and signal phases');
      await page.locator('[data-village-activity-choice-v70="' + ((activity.sequence[0] + 1) % 3) + '"]').click();
      assert.equal(Number(await service.getAttribute('data-service-progress')), 0, 'Incorrect choice cannot advance');
      for (const choice of activity.sequence) await page.locator('[data-village-activity-choice-v70="' + choice + '"]').click();
      assert.equal(Number(await service.getAttribute('data-service-progress')), 3); assert.equal(await page.locator('[data-village-activity-choice-v70]').count(), 0);
      await capture(activity.id + '-completed'); await nav.resume(); completed.push(activity.id);
      const persisted = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), fixture.key);
      assert.deepEqual(persisted.homeworldRegionV68.eventReceipts, []); assert.deepEqual(persisted.homeworldRegionV68.greeted, []);
      assert.deepEqual(persisted.homeworld.contractsV68, durableBefore.homeworld.contractsV68, 'The entire contract ledger and its derived wallet remain unchanged');
      assert(!('activitySession' in persisted.homeworldRegionV68), 'Civilian practices are not inserted into a legacy checkpoint');
      assert.deepEqual(persisted.appearance, fixture.save.appearance, 'A local service cannot rewrite the selected hunter');
    }
    await page.locator('[data-village-open-atlas-v70]').click(); await page.locator('[data-village-destination-v70="door:hall"]').click();
    const hall = api.HOMEWORLD_REGIONS_V68[id].buildings.find(b => b.id === 'hall'); await nav.walkTo({ x: hall.x, y: hall.y + 70 }); await nav.interact();
    assert.equal(await root.getAttribute('data-zone'), 'interior'); await nav.walkTo({ x: 380, y: 310 }); await nav.interact();
    assert.equal(await page.locator('[data-village-interior-service-v70]').getAttribute('data-village-interior-service-v70'), 'hall');
    await capture(id + '-common-house-service'); await nav.resume(); await nav.walkTo(api.HOMEWORLD_REGION_INTERIOR_V68.entry); await nav.interact();
    // Fault injection changes storage behaviour only, never actor coordinates,
    // field counters, local progress or rewards.
    await page.evaluate(key => {
      window.__v70StorageSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, value) { if (k === key) throw new DOMException('QA quota refusal', 'QuotaExceededError'); return window.__v70StorageSetItem.call(this, k, value); };
    }, fixture.key);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    assert(await page.getByRole('heading', { name: 'Reprise conservée' }).isVisible());
    const quotaTick = Number(await root.getAttribute('data-state-tick')); await nav.tick(1500); assert.equal(Number(await root.getAttribute('data-state-tick')), quotaTick);
    assert.equal(await page.locator('[data-village-activity-choice-v70]').count(), 0, 'Quota refusal exposes no executable service choices');
    await page.evaluate(() => { Storage.prototype.setItem = window.__v70StorageSetItem; delete window.__v70StorageSetItem; }); await nav.resume();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.clock.resume(); await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('button', { name: /^Continuer/ }).click();
    await page.locator('[data-region-resume]').waitFor(); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 150));
    const reloadNav = homeworldRegionNavigatorV68(page, api); await reloadNav.resume();
    await reloadNav.walkTo(api.HOMEWORLD_VILLAGE_ACTIVITIES_V70[id][0].approach); await reloadNav.interact();
    assert.equal(Number(await page.locator('[data-village-service-v70]').getAttribute('data-service-progress')), 0, 'Cold reload starts a fresh local practice without a duplicate reward');
    await capture(id + '-cold-reload');
    checks.push({ id, status: 'PASS', completed, atlasDestinations: 18, manualRoutes: nav.routes, quotaFrozen: true, reloadFresh: true }); await context.close();
    await fs.writeFile(output + '/progress.json', JSON.stringify({ status: 'RUNNING', url, completedVillages: checks.length, selectedVillages: selected.length, checks, captures, errors, failures }, null, 2));
    console.log(JSON.stringify({ region: id, status: 'PASS', activities: 4, coldReload: true, completedVillages: checks.length }));
  }
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  await fs.writeFile(output + '/report.json', JSON.stringify({ status: 'PASS', url, checks, captures, errors, failures, scope: 'Independent explicit village checkpoint fixtures; four services each reached by keyboard, atlas guidance without movement, incorrect/correct gestures, physical common-house service/exit, quota refusal and cold reload. No connector, youth campaign, field objective or contract completion is claimed by this recipe.' }, null, 2));
  console.log(JSON.stringify({ status: 'PASS', villages: checks.length, activities: checks.length * 4, captures: captures.length, output }));
} catch (error) { await capture('failure').catch(() => {}); await fs.writeFile(output + '/report.json', JSON.stringify({ status: 'FAIL', url, error: String(error), checks, captures, errors, failures }, null, 2)); throw error; }
finally { await browser.close(); }
