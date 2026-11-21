/** R2-M026, physical T09 drainage on the compiled campaign. Admission stages
 * an adult eight-hunt save at the reachable valve in T09. The valve, phases,
 * acknowledgement and native reload are exercised in Chromium. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { homeworldSceneSsrV78 } from '../tests/helpers/homeworld-scene-ssr-v78.mjs';

const origin = new URL(process.env.CRADLE_NURSERY_QA_URL ?? 'http://127.0.0.1:3121/');
assert.equal(origin.protocol, 'http:');
assert.equal(origin.hostname, '127.0.0.1');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (process.env.CRADLE_NURSERY_QA_COMMIT) assert.equal(commit, process.env.CRADLE_NURSERY_QA_COMMIT);
const buildId = (await readFile('.next/BUILD_ID', 'utf8')).trim();
assert.ok(buildId);
const output = resolve(process.env.CRADLE_NURSERY_QA_OUTPUT ?? 'outputs/qa-cradle-nursery-20261121');
await mkdir(output, { recursive: true });

const qa = homeworldSceneSsrV78();
const saves = qa.load('app/game/save.ts');
const campaign = qa.load('app/game/systems/buriedCradleCampaign.ts');
const cradle = qa.load('app/game/systems/buriedCradle.ts');
const snapshots = qa.load('app/game/systems/buriedCradleSnapshot.ts');
const { MISSIONS } = qa.load('app/game/data.ts');
const fleet = { personalShipId: 'classic-predator-spaceship', ownedShipIds: ['classic-predator-spaceship'] };
let save = saves.defaultSave('2026-11-21T11:00:00.000Z');
save.settings.masterVolume = 0;
for (const mission of MISSIONS) {
  save.missionProgress[mission.id] = { ...save.missionProgress[mission.id], status: 'completed', attempts: 1, completions: 1 };
}
function acquire(action) {
  const result = campaign.actBuriedCradleCampaign(save, action, fleet);
  assert.ok(result.accepted, result.message);
  save = { ...save, buriedCradle: result.state, prologue: result.prologue };
}
acquire({ type: 'prepare' });
acquire({ type: 'depart' });
const progress = { ...save.buriedCradle.progress, visitedRoomIds: ['01', '02', '03', '04', '05', '07', '08', '09'] };
const run = cradle.createBuriedCradleRun(progress, campaign.CRADLE_CHECKPOINT_BUDGET[save.buriedCradle.difficultyId]);
run.roomId = '09';
run.player.x = 1408 - run.player.width / 2;
run.player.y = 624 - run.player.height;
acquire({ type: 'checkpoint', progress, snapshot: snapshots.snapshotBuriedCradleRun(run) });
const imported = saves.parseSaveImport(saves.exportSave(save));
assert.ok(imported.save, imported.failure);
assert.equal(imported.save.buriedCradle.snapshot.run.roomId, '09');
assert.equal(imported.save.buriedCradle.progress.drainageOpened, false);
const atlas = JSON.parse(await readFile('app/game/data/buriedCradleArt.json', 'utf8')).assets;
const report = {
  commit, buildId, passed: false, checks: [], errors: [],
  admission: 'Adult eight-hunt fixture at T09, feet (1408,624), closed valve, no crown and no boss victory. The valve action, its hazards and reload run in the compiled application.',
};
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  headless: true,
});
let page;
try {
  page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    storageState: { cookies: [], origins: [{ origin: origin.origin, localStorage: [{
      name: saves.SAVE_STORAGE_KEY, value: JSON.stringify(imported.save),
    }] }] },
  });
  page.setDefaultTimeout(45_000);
  page.on('pageerror', error => report.errors.push(String(error)));
  const scene = page.locator('[data-buried-cradle][data-room="09"]');
  const phaseSelector = '[role="status"][data-cradle-drainage-stage]';
  const disk = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saves.SAVE_STORAGE_KEY);

  async function openNursery() {
    await page.waitForSelector('[data-campaign-menu], [data-campaign-session]');
    if (await page.locator('[data-campaign-menu]').isVisible()) {
      const campaignSection = page.locator('[data-menu-section="campaign"]');
      if (await campaignSection.isVisible()) await campaignSection.click();
      await page.locator('[data-menu-action="continue"]').click();
      await page.locator('[data-campaign-session]').waitFor();
    }
    const play = page.getByRole('button', { name: 'Jouer', exact: true });
    if (await play.isVisible()) await play.click();
    await scene.waitFor();
  }

  function sprite(id) {
    return scene.locator('svg image[href="' + atlas[id].src + '"]');
  }
  async function decodeSprite(id) {
    const { src, width, height, sha256 } = atlas[id];
    await sprite(id).first().waitFor({ state: 'attached' });
    const dimensions = await page.evaluate(async path => {
      const image = new Image();
      image.src = path;
      await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    }, src);
    assert.deepEqual(dimensions, [width, height], src);
    const response = await page.request.get(new URL(src, origin).href);
    assert.ok(response.ok(), src);
    assert.equal(createHash('sha256').update(await response.body()).digest('hex'), sha256, src);
    return { id, src, width, height, sha256 };
  }

  const response = await page.goto(origin.href, { waitUntil: 'domcontentloaded' });
  assert.ok(response?.ok() && (await response.text()).includes(buildId), 'The compiled checkout is being served.');
  await openNursery();
  const full = await decodeSprite('029');
  assert.equal(await sprite('083').count(), 0);
  assert.equal(await scene.locator(phaseSelector).count(), 0);
  await scene.screenshot({ path: join(output, 't09-full-reservoir.png') });

  await scene.evaluate(element => {
    window.__cradleDrainagePhases = [];
    const capture = () => {
      const status = element.querySelector('[role="status"][data-cradle-drainage-stage]');
      if (!status) return;
      const stage = status.getAttribute('data-cradle-drainage-stage');
      if (window.__cradleDrainagePhases.at(-1)?.stage !== stage) {
        window.__cradleDrainagePhases.push({ stage, label: status.textContent.trim() });
      }
    };
    new MutationObserver(capture).observe(element, { attributes: true, attributeFilter: ['data-cradle-drainage-stage'],
      characterData: true, childList: true, subtree: true });
    capture();
  });
  await scene.focus();
  await page.keyboard.press('KeyE');
  await scene.locator(phaseSelector).waitFor();
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).buriedCradle.progress.drainageOpened,
    saves.SAVE_STORAGE_KEY);
  const empty = await decodeSprite('083');
  assert.equal(await sprite('029').count(), 0);
  const drained = (await disk()).buriedCradle;
  assert.equal(drained.status, 'active');
  assert.equal(drained.progress.drainageOpened, true);
  assert.equal(drained.snapshot.run.roomId, '09');
  assert.equal(drained.snapshot.run.progress.drainageOpened, true);
  assert.equal(drained.progress.bossDefeated, false);
  report.checks.push({ kind: 'acknowledged-drainage', full, empty });

  const cycle = ['idle', 'telegraph', 'active', 'idle'];
  const observed = await page.waitForFunction(expected => {
    const phases = window.__cradleDrainagePhases;
    const start = phases.findIndex((_, index) => expected.every((stage, offset) => phases[index + offset]?.stage === stage));
    return start < 0 ? false : phases.slice(start, start + expected.length);
  }, cycle, { timeout: 15_000 });
  assert.deepEqual(await observed.jsonValue(), [
    { stage: 'idle', label: 'Drainage · passage à sec' },
    { stage: 'telegraph', label: 'Drainage · remontée imminente' },
    { stage: 'active', label: 'Drainage · poussée acide' },
    { stage: 'idle', label: 'Drainage · passage à sec' },
  ]);
  report.checks.push({ kind: 'native-drainage-cycle', phases: await observed.jsonValue() });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await openNursery();
  await scene.locator(phaseSelector).waitFor();
  await sprite('083').first().waitFor({ state: 'attached' });
  assert.equal(await sprite('029').count(), 0);
  const reloaded = (await disk()).buriedCradle;
  assert.equal(reloaded.progress.drainageOpened, true);
  assert.equal(reloaded.snapshot.run.roomId, '09');
  assert.deepEqual(reloaded.progress, drained.progress);
  assert.deepEqual(report.errors, []);
  await scene.screenshot({ path: join(output, 't09-drained-reloaded.png') });
  report.checks.push({ kind: 'reload', room: '09', drainageOpened: true });
  report.passed = true;
} catch (error) {
  report.failure = String(error?.stack ?? error);
  await page?.screenshot({ path: join(output, 't09-failure.png') }).catch(() => {});
  throw error;
} finally {
  await browser.close();
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ commit, buildId, passed: report.passed, checks: report.checks.length, failure: report.failure ?? null }));
}
