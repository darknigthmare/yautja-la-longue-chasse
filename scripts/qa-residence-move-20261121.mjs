/** Native R2-M045 move from a declared pair of already-earned house rights. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { homeworldSceneSsrV78 } from '../tests/helpers/homeworld-scene-ssr-v78.mjs';
import { homeworldRegionNavigatorV68 } from './homeworld-region-navigation-v68.mjs';

const url = new URL(process.env.RESIDENCE_QA_URL ?? 'http://127.0.0.1:3121/');
assert.equal(url.protocol, 'http:');
assert.equal(url.hostname, '127.0.0.1');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (process.env.RESIDENCE_QA_COMMIT) assert.equal(commit, process.env.RESIDENCE_QA_COMMIT);
const buildId = (await readFile('.next/BUILD_ID', 'utf8')).trim();
assert(buildId);
const output = resolve(process.env.RESIDENCE_QA_OUTPUT ?? 'outputs/qa-residence-move');
await mkdir(output, { recursive: true });

const qa = homeworldSceneSsrV78();
const saves = qa.load('app/game/save.ts');
const homes = qa.load('app/game/systems/residenceV149.ts');
const region = qa.load('app/game/systems/homeworldRegionsV68.ts');
const village = qa.load('app/game/systems/homeworldVillageRoutesV70.ts');
const first = 'HOME-CM07', next = 'HOME-CM08', regionId = 'luminous-marshes';
const entry = region.HOMEWORLD_REGION_INTERIOR_V68.entry;
const lamp = homes.CM07_LAMP_ID_V149;
const firstBuilding = homes.houseBuildingIdV149(homes.houseV149(first));
const nextBuilding = homes.houseBuildingIdV149(homes.houseV149(next));
const destination = village.villageDestinationsV70(regionId).find(row => row.id === 'door:' + nextBuilding);
assert(destination);

const save = saves.defaultSave('2026-11-21T16:00:00.000Z');
save.profile = { ...save.profile, rankId: 'blooded', acquiredRankIdV166: 'blooded', honor: 2000 };
save.settings.masterVolume = 0;
const context = atHouseId => ({ rankId: 'blooded', atHouseId, regionAllowed: id => region.canEnterHomeworldRegionV68(save, id).allowed });
let residence = homes.emptyResidenceV149();
const accept = result => { assert(result.ok, result.reason); residence = result.state; };
for (const houseId of [first, next]) accept(homes.acceptHouseMissionV149(residence, houseId, context(houseId)));
for (const index of [1, 2, 3]) for (const action of ['ward', 'recover', 'report', 'track']) {
  residence = homes.recordResidenceFieldEventV149(residence, { regionId, runId: `preexisting-rights-${index}`, action }).state;
}
for (const houseId of [first, next]) accept(homes.chooseHouseRouteV149(residence, houseId, 0, context(houseId)));
accept(homes.activateFirstResidenceV149(residence, first, context(first)));
accept(homes.placeObjectV149(residence, lamp, 'display', context(first)));
const villageAdmission = region.createHomeworldRegionV68(regionId, 'residence-native-move', true);
save.homeworldRegionV68 = { ...villageAdmission, zone: 'interior',
  actor: { ...villageAdmission.actor, ...entry }, buildingId: firstBuilding, visitedBuildings: [firstBuilding] };
save.residenceV149 = residence;
const admitted = saves.parseSaveImport(saves.exportSave(save));
assert(admitted.save, admitted.failure);
assert.equal(admitted.save.homeworldRegionV68.buildingId, firstBuilding);
assert.equal(admitted.save.residenceV149.transfer, null);
const report = { commit, buildId, passed: false, checks: [], errors: [], routes: [],
  admission: 'Existing Blooded adult archive. Both threshold missions, rights, and the displayed lamp are admitted fixtures from the normal residence reducer. The viewport starts at the first house threshold. All preparation, relocation and arrival are native controls.' };

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 950 },
    storageState: { cookies: [], origins: [{ origin: url.origin, localStorage: [{
      name: saves.SAVE_STORAGE_KEY, value: JSON.stringify(admitted.save),
    }] }] },
  });
  page.setDefaultTimeout(40_000);
  page.on('pageerror', error => report.errors.push(error.message));
  await page.clock.install();
  const root = page.locator('section[data-homeworld-region-v68="luminous-marshes"]');
  const ground = homeworldRegionNavigatorV68(page, region);
  const disk = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saves.SAVE_STORAGE_KEY);
  const location = async () => (await disk()).residenceV149.objects.find(object => object.id === lamp).location;
  const source = root.locator('[data-residence-v149="' + first + '"]');
  const threshold = root.locator('[data-residence-open-threshold]');
  const cargo = root.locator('[data-residence-cargo] [data-homeworld-prop-id="residence-cargo"][data-homeworld-art-id="chest"]');
  async function enter() {
    await page.waitForSelector('[data-campaign-menu], [data-campaign-session]');
    if (await page.locator('[data-campaign-menu]').isVisible()) {
      const campaign = page.locator('[data-menu-section="campaign"]');
      if (await campaign.isVisible()) await campaign.click();
      await page.locator('[data-menu-action="continue"]').click();
      await page.locator('[data-campaign-session]').waitFor();
    }
    const play = page.getByRole('button', { name: 'Jouer', exact: true });
    await root.or(play).first().waitFor();
    if (await play.isVisible()) await play.click();
    await root.waitFor();
    await root.locator('[data-region-player]').waitFor();
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 100)));
    await ground.resume();
  }

  const response = await page.goto(url.href, { waitUntil: 'domcontentloaded' });
  assert(response?.ok() && (await response.text()).includes(buildId));
  await enter();
  await threshold.click();
  await root.locator('[data-residence-stay]').click();
  assert.deepEqual((await disk()).residenceV149.lastChoice, { kind: 'stay', houseId: first });
  await ground.resume();

  await ground.walkTo({ x: 380, y: 312 });
  await ground.interact();
  await source.locator('[data-residence-rights]').waitFor();
  assert((await source.locator('[data-residence-rights]').innerText()).includes(homes.houseV149(next).title));
  assert.equal(await source.locator('[data-residence-depart]').count(), 0);
  await source.locator('[data-residence-transfer="' + next + '"]').click();
  await source.locator('[data-residence-unmount="' + lamp + '"]').click();
  assert.deepEqual(await location(), { kind: 'unmounted', returnTo: { houseId: first, slotId: 'display' } });
  await source.locator('[data-residence-pack="' + lamp + '"]').click();
  assert.deepEqual(await location(), { kind: 'transfer', returnTo: { houseId: first, slotId: 'display' } });
  await source.screenshot({ path: join(output, 'packed-original.png') });
  report.checks.push({ kind: 'rights-and-packing', first, next, lamp, stayed: true });

  await ground.resume();
  await ground.walkTo(entry);
  await threshold.click();
  await root.locator('[data-residence-depart]').click();
  assert.equal((await disk()).residenceV149.transfer.stage, 'in-transit');
  assert.equal((await disk()).residenceV149.activeResidenceId, first);
  await ground.resume();
  await ground.interact();
  assert.equal(await root.getAttribute('data-zone'), 'village');
  await cargo.waitFor({ state: 'visible' });
  const crate = await cargo.locator('img').evaluate(async image => {
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  });
  assert.deepEqual(crate, { width: 1254, height: 1254 });

  report.checks.push({ kind: 'departure-and-crate', crate });
  assert.equal((await disk()).homeworldRegionV68.zone, 'village');
  await page.clock.resume();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await enter();
  assert.equal(await root.getAttribute('data-zone'), 'village');
  assert.deepEqual(await location(), { kind: 'transfer', returnTo: { houseId: first, slotId: 'display' } });
  await cargo.waitFor({ state: 'visible' });
  await root.screenshot({ path: join(output, 'village-cargo-reloaded.png') });

  await ground.walkTo(destination);
  await ground.interact();
  assert.equal(await root.getAttribute('data-interior-building'), nextBuilding);
  await threshold.click();
  await root.locator('[data-residence-arrive]').click();
  const settled = (await disk()).residenceV149;
  assert.equal(settled.activeResidenceId, next);
  assert.equal(settled.transfer, null);
  assert.equal(settled.objects.filter(object => object.id === lamp).length, 1);
  assert.deepEqual(await location(), { kind: 'room', houseId: next, slotId: 'arrival' });
  assert.deepEqual(settled.lastChoice, { kind: 'moved', fromHouseId: first, houseId: next, objectIds: [lamp] });
  assert(settled.rights.includes(first));
  assert.equal(await root.locator('[data-residence-cargo]').count(), 0);
  await root.locator('[data-residence-choice="moved"]').screenshot({ path: join(output, 'new-threshold.png') });
  report.checks.push({ kind: 'actual-thresholds-and-reload', crate, final: settled.lastChoice });
  report.routes = ground.routes;
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.failure = String(error?.stack ?? error);
  throw error;
} finally {
  await browser.close();
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ commit, buildId, passed: report.passed, checks: report.checks.length, failure: report.failure ?? null }));
}
