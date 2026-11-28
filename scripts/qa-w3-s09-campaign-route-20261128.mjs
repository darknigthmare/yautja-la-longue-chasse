import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { homeworldQaModelV64 } from './homeworld-qa-model-v64.mjs';
import { homeworldNavigatorV77 } from './homeworld-navigation-browser-v77.mjs';
import { firstTracksCompleted, p } from '../tests/helpers/solo-v67-campaign-route.mjs';

const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (process.env.W3_S09_COMMIT) assert.equal(commit, process.env.W3_S09_COMMIT);
const buildId = (await readFile('.next/BUILD_ID', 'utf8')).trim();
const output = resolve(process.env.W3_S09_OUTPUT ?? 'outputs/qa-w3-s09');
const url = new URL(process.env.W3_S09_URL ?? 'http://127.0.0.1:3121/');
assert.equal(url.hostname, '127.0.0.1');
await mkdir(output, { recursive: true });

const api = homeworldQaModelV64(process.cwd(), ['homeworldWorldV77.ts', 'homeworldNavigationV77.ts',
  'homeworldLocationV77.ts', 'homeworldRegionsV68.ts', 'homeworldSkiffProofW3S09.ts']);
const seed = firstTracksCompleted();
const dock = api.HOMEWORLD_LAVA_DOCK_V77;
const anchor = [120, 135, 150, 165].flatMap(distance => [
  { x: dock.x + distance, y: dock.y }, { x: dock.x, y: dock.y - distance },
]).find(point => api.homeworldWalkableV77('0', point) &&
  api.homeworldWorldRouteV77({ levelId: '0', point }, { levelId: '0', point: dock }).status === 'reachable');
assert(anchor, 'a nearby walkable checkpoint must connect to the dock');
const actor = { ...api.createHomeworldWorldActorV77(), ...anchor };
seed.homeworld.locationV77 = api.createHomeworldCheckpointV77(seed.createdAt, '0', actor, null, actor);
seed.settings.masterVolume = 0;
assert(api.canEnterHomeworldRegionV68(seed, 'thermal-caves').allowed);
assert(!seed.homeworldRegionV68);
const report = { commit, buildId, passed: false, errors: [], admission: 'Compétences antérieures jouées par le moteur, point de départ indiqué à pied près de l’embarcadère. Le quai, le départ, les 12 secondes de traversée et la reprise de la rive sont joués dans Chromium.' };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined, headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 990 },
  storageState: { cookies: [], origins: [{ origin: url.origin, localStorage: [{ name: p.SAVE_STORAGE_KEY, value: JSON.stringify(seed) }] }] },
});
page.setDefaultTimeout(45_000);
page.on('pageerror', error => report.errors.push(error.message));
const disk = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), p.SAVE_STORAGE_KEY);
const hub = page.locator('[data-homeworld-hub]');
const region = page.locator('section[data-homeworld-region-v68="thermal-caves"]');
const capture = name => page.screenshot({ path: join(output, name + '.png') });

async function open() {
  const response = await page.goto(url.href, { waitUntil: 'domcontentloaded' });
  assert(response?.ok() && (await response.text()).includes(buildId));
  await page.locator('[data-campaign-menu], [data-campaign-session]').first().waitFor();
  if (await page.locator('[data-campaign-menu]').isVisible()) {
    const campaign = page.locator('[data-menu-section="campaign"]');
    if (await campaign.isVisible()) await campaign.click();
    await page.locator('[data-menu-action="continue"]').click();
  }
}

try {
  await page.clock.install();
  await open();
  await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor();
  await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 1000);
  const nav = homeworldNavigatorV77(page, api);
  await nav.reach({ levelId: '0', point: dock });
  await nav.release();
  await page.keyboard.press('KeyE');
  await nav.tick(96);
  const board = page.locator('button[data-homeworld-region-v68="thermal-caves"]');
  assert(await board.isEnabled());
  const before = await disk();
  assert(!before.homeworldRegionV68);
  assert(await page.locator('[data-homeworld-ferryman-v77]').count());
  await board.click();
  await nav.tick(96);
  assert.equal(await hub.getAttribute('data-homeworld-skiff-v77'), 'thermal-caves');
  const positions = [];
  for (let n = 0; n < 154; n++) {
    await nav.tick(80);
    if (await hub.count() === 0 || await hub.getAttribute('data-homeworld-skiff-v77') !== 'thermal-caves') break;
    const point = await nav.position();
    assert(api.homeworldSkiffFootOnDeckV77(point, point));
    if (positions.length) assert(Math.hypot(point.x - positions.at(-1).x, point.y - positions.at(-1).y) < 20);
    positions.push(point);
    if (n === 50) {
      assert(!(await disk()).homeworldRegionV68, 'mid-channel has no durable shore admission');
      await capture('01-skiff-traversant');
    }
  }
  assert(positions.length >= 120);
  await page.clock.resume();
  await region.waitFor();
  const after = await disk();
  const receipt = after.homeworldRegionV68.skiffArrivalW3S09;
  assert.deepEqual(receipt, { ...api.HOMEWORLD_SKIFF_W3_S09, runId: after.homeworldRegionV68.runId });
  assert.equal(await region.locator('[data-w3-s09-arrival]').getAttribute('data-w3-s09-arrival'), receipt.runId);
  for (const key of ['createdAt', 'profile', 'inventory', 'trophies']) assert.deepEqual(after[key], before[key]);
  await capture('02-rive-et-recu');

  await open();
  await region.waitFor();
  assert.deepEqual((await disk()).homeworldRegionV68.skiffArrivalW3S09, receipt);
  assert.equal(await region.locator('[data-w3-s09-arrival]').getAttribute('data-w3-s09-vessel'), receipt.vessel);
  await capture('03-reprise-meme-recu');
  assert.deepEqual(report.errors, []);
  report.result = { receipt, observedFrames: positions.length, sameCampaignOnReload: true };
  report.passed = true;
} catch (error) {
  report.failure = String(error.stack ?? error);
  await capture('failure').catch(() => {});
  throw error;
} finally {
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  await browser.close();
}
