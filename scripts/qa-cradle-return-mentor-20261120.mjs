/** Physical post-extraction mentor in the ordinary compiled campaign.
 * Admission uses the actual save and expedition reducers. Everything after
 * boarding is performed through the ordinary room and return-panel controls. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { homeworldSceneSsrV78 } from '../tests/helpers/homeworld-scene-ssr-v78.mjs';

const origin = new URL(process.env.CRADLE_RETURN_QA_URL ?? 'http://127.0.0.1:3121/');
assert.equal(origin.protocol, 'http:');
assert.equal(origin.hostname, '127.0.0.1');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (process.env.CRADLE_RETURN_QA_COMMIT) assert.equal(commit, process.env.CRADLE_RETURN_QA_COMMIT);
const buildId = (await readFile('.next/BUILD_ID', 'utf8')).trim();
assert.ok(buildId);
const output = resolve(process.env.CRADLE_RETURN_QA_OUTPUT ?? 'outputs/qa-cradle-return-mentor');
await mkdir(output, { recursive: true });
const qa = homeworldSceneSsrV78();
const campaign = qa.load('app/game/systems/buriedCradleCampaign.ts');
const cradle = qa.load('app/game/systems/buriedCradle.ts');
const snapshots = qa.load('app/game/systems/buriedCradleSnapshot.ts');
const saves = qa.load('app/game/save.ts');
const motion = qa.load('app/game/systems/shipInterior25d.ts');
const { MISSIONS } = qa.load('app/game/data.ts');
const context = { personalShipId: 'classic-predator-spaceship', ownedShipIds: ['classic-predator-spaceship'] };
const owner = '2026-11-20T02:00:00.000Z';
let save = saves.defaultSave(owner);
save.settings.masterVolume = 0;
for (const mission of MISSIONS) {
  save.missionProgress[mission.id] = { ...save.missionProgress[mission.id], status: 'completed', attempts: 1, completions: 1 };
}
function acquire(action) {
  const result = campaign.actBuriedCradleCampaign(save, action, context);
  assert(result.accepted, result.message);
  save = { ...save, buriedCradle: result.state, prologue: result.prologue };
}
acquire({ type: 'prepare' });
acquire({ type: 'depart' });
let run = cradle.createBuriedCradleRun(save.buriedCradle.progress, 1);
run.player.x = 156;
run.player.y = 508;
run = cradle.stepBuriedCradle(run, { interactPressed: true }, 1 / 60).run;
assert(run.extracted);
acquire({ type: 'extract', progress: run.progress, snapshot: snapshots.snapshotBuriedCradleRun(run) });
const parsed = saves.parseSaveImport(saves.exportSave(save));
assert(parsed.save, parsed.failure);
assert.equal(parsed.save.buriedCradle.returnVisit.revision, 0);

const report = { commit, buildId, passed: false, checks: [], errors: [],
  admission: 'Canonical export/import from a declared eight-chase prerequisite fixture and a real first-room retreat. No crown seeded. All checks start from the personal ship.' };
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    storageState: { cookies: [], origins: [{ origin: origin.origin, localStorage: [{
      name: saves.SAVE_STORAGE_KEY, value: JSON.stringify(parsed.save),
    }] }] },
  });
  page.setDefaultTimeout(45_000);
  page.on('pageerror', error => report.errors.push(error.message));

  const shipSelector = '[data-ship-interior="2.5d"]:not([inert])';
  const ship = page.locator(shipSelector);
  const panel = ship.locator('[data-cradle-return-panel]');
  const mentor = ship.locator('[data-cradle-return-mentor="return-mentor"]');
  const diskSave = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saves.SAVE_STORAGE_KEY);

  async function openShip() {
    await page.waitForSelector('[data-campaign-menu], [data-campaign-session]');
    if (await page.locator('[data-campaign-menu]').isVisible()) {
      const campaignSection = page.locator('[data-menu-section="campaign"]');
      if (await campaignSection.isVisible()) await campaignSection.click();
      await page.locator('[data-menu-action="continue"]').click();
      await page.locator('[data-campaign-session]').waitFor();
    }
    const play = page.getByRole('button', { name: 'Jouer', exact: true });
    if (await play.isVisible()) await play.click();
    await panel.waitFor();
  }
  async function guide(target) {
    const from = await ship.getAttribute('data-ship-room');
    const route = motion.shipInterior25dRoomRoute(from, target);
    assert.ok(route.length);
    await panel.locator('[data-cradle-return-guide="' + target + '"]').click();
    for (let index = 1; index < route.length; index++) {
      const room = route[index - 1], next = route[index];
      const door = motion.SHIP_INTERIOR_25D_ROOMS[room].doors.find(candidate => candidate.targetRoomId === next);
      assert.ok(door);
      // The native door pivot is deliberately zero-sized. Its live ready
      // attribute proves reachability; the visible interaction button commits.
      await ship.locator('[data-ship-door="' + door.id + '"][data-door-ready="true"]').waitFor({ state: 'attached' });
      await ship.locator('[data-ship-interact]').click();
      await page.locator(shipSelector + '[data-ship-room="' + next + '"]').waitFor();
    }
    await page.locator(shipSelector + '[data-ship-room="' + target + '"][data-ship-nearby="' + target + '"]').waitFor();
    report.checks.push({ kind: 'physical-route', target, route });
  }

  const response = await page.goto(origin.href, { waitUntil: 'domcontentloaded' });
  assert.ok(response?.ok() && (await response.text()).includes(buildId), 'The compiled source is being served.');
  await openShip();
  assert.equal(await mentor.count(), 0);
  await guide('medical-bay');
  await panel.locator('[data-cradle-return-action="treat-return"]').click();
  await ship.locator('[data-cradle-return-panel][data-return-revision="1"]').waitFor();
  assert.equal(await mentor.count(), 0);
  const beforeExamination = await diskSave();
  assert.equal(beforeExamination.buriedCradle.returnVisit.events[0].witness, undefined);
  await guide('trophy-hall');
  await mentor.waitFor({ state: 'attached' });
  const mentorAction = mentor.locator('[data-cradle-return-mentor-action]');
  await mentorAction.waitFor();
  const sprites = await mentor.locator('img').evaluateAll(async images => {
    await Promise.all(images.map(async image => {
      try { await image.decode(); }
      catch { throw Error('Unable to decode the mentor’s original layer: ' + (image.currentSrc || image.src)); }
    }));
    return images.map(image => ({ url: image.currentSrc, width: image.naturalWidth, height: image.naturalHeight }));
  });
  assert(sprites.length > 0 && sprites.every(sprite => sprite.width > 0 && sprite.height > 0));
  await ship.locator('[data-ship-viewport]').screenshot({ path: join(output, 'mentor-before-examination.png') });
  await mentorAction.click();
  await page.waitForFunction(() => document.activeElement?.getAttribute('data-cradle-return-action') === 'inspect-return');
  await panel.locator('[data-cradle-return-action="inspect-return"]').click();
  await ship.locator('[data-cradle-return-panel][data-return-revision="2"] [data-cradle-return-witness]').waitFor();
  assert.equal(await mentor.count(), 0);
  const examined = await diskSave();
  assert.equal(examined.buriedCradle.returnVisit.events[1].witness, 'return-mentor');
  assert.equal(examined.buriedCradle.crownDelivered, false);
  assert.deepEqual(examined.buriedCradle.snapshot, beforeExamination.buriedCradle.snapshot);
  assert.equal(examined.profile.rankId, beforeExamination.profile.rankId);
  assert.deepEqual(examined.trophies, beforeExamination.trophies);
  report.checks.push({ kind: 'native-mentor-examination', sprites, receipt: examined.buriedCradle.returnVisit.events[1] });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await openShip();
  await panel.locator('[data-cradle-return-witness]').waitFor();
  const afterReload = await diskSave();
  assert.deepEqual(afterReload.buriedCradle.returnVisit, examined.buriedCradle.returnVisit);
  assert.deepEqual(report.errors, []);
  report.checks.push({ kind: 'durable-reload', originalSnapshotUnchanged: true, noTrophyOrRankAwarded: true });
  await panel.screenshot({ path: join(output, 'mentor-receipt-reloaded.png') });
  report.passed = true;
} catch (error) {
  report.failure = String(error?.stack ?? error);
  throw error;
} finally {
  await browser.close();
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ commit, buildId, passed: report.passed, checks: report.checks.length, failure: report.failure ?? null }));
}
