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
const scenario = process.env.CRADLE_RETURN_QA_SCENARIO ?? 'mentor';
assert(['mentor', 'acid'].includes(scenario), 'Choose CRADLE_RETURN_QA_SCENARIO=mentor or acid.');
const acid = scenario === 'acid';
const output = resolve(process.env.CRADLE_RETURN_QA_OUTPUT ?? (acid ? 'outputs/qa-cradle-return-acid' : 'outputs/qa-cradle-return-mentor'));
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
let run = cradle.createBuriedCradleRun(acid ? { ...save.buriedCradle.progress,
  bossDefeated: true, rootRingCut: true, visitedRoomIds: [...cradle.CRADLE_ROOM_IDS],
} : save.buriedCradle.progress, 1);
if (acid) {
  // Bounded admission: the queen is already defeated. Collect the actual
  // fragment through room 12's interaction, then stage the carrier before the
  // first active pool of room 08. Exposure starts inside Chromium.
  run.roomId = '12';
  run.player.x = 1620;
  const pickup = cradle.stepBuriedCradle(run, { interactPressed: true }, 1 / 60);
  assert(pickup.events.some(event => event.type === 'crown-claimed'));
  run = pickup.run;
  run.roomId = '08';
  run.player.x = 420;
  assert.equal(cradle.getCradleCrownCondition(run.progress), 'intact');
  acquire({ type: 'checkpoint', progress: run.progress, snapshot: snapshots.snapshotBuriedCradleRun(run) });
} else {
  run.player.x = 156;
  run = cradle.stepBuriedCradle(run, { interactPressed: true }, 1 / 60).run;
  assert(run.extracted);
  acquire({ type: 'extract', progress: run.progress, snapshot: snapshots.snapshotBuriedCradleRun(run) });
}
const parsed = saves.parseSaveImport(saves.exportSave(save));
assert(parsed.save, parsed.failure);
if (acid) assert.equal(parsed.save.buriedCradle.snapshot.run.roomId, '08');
else assert.equal(parsed.save.buriedCradle.returnVisit.revision, 0);

const report = { commit, buildId, scenario, passed: false, checks: [], errors: [],
  admission: acid ? 'Canonical active save with eight prerequisite chases and a defeated queen. The model picks up the fragment in room 12 and the fixture places the carrier at x=420 on the floor of room 08 before any exposure. Movement, acid, extraction, treatment, examination and debrief use the compiled game controls.' :
    'Canonical export/import from a declared eight-chase prerequisite fixture and a real first-room retreat. No crown seeded. All checks start from the personal ship.' };
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

  async function openCampaign() {
    await page.waitForSelector('[data-campaign-menu], [data-campaign-session]');
    if (await page.locator('[data-campaign-menu]').isVisible()) {
      const campaignSection = page.locator('[data-menu-section="campaign"]');
      if (await campaignSection.isVisible()) await campaignSection.click();
      await page.locator('[data-menu-action="continue"]').click();
      await page.locator('[data-campaign-session]').waitFor();
    }
    const play = page.getByRole('button', { name: 'Jouer', exact: true });
    if (await play.isVisible()) await play.click();
  }
  async function openShip() {
    await openCampaign();
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
  if (acid) {
    await openCampaign();
    const sceneSelector = '[data-buried-cradle]';
    const scene = page.locator(sceneSelector);
    await page.locator(sceneSelector + '[data-room="08"][data-crown-condition="intact"]').waitFor();
    await scene.focus();
    async function decodeCrown(file) {
      const source = scene.locator('svg image[href$="' + file + '"]');
      const url = await source.getAttribute('href');
      const sprite = await page.evaluate(async path => {
        const image = new Image();
        image.src = path;
        await image.decode();
        return { path, width: image.naturalWidth, height: image.naturalHeight };
      }, url);
      assert.equal(sprite.width, 1254);
      assert.equal(sprite.height, 1254);
      return sprite;
    }
    async function advanceRight(targetX) {
      await page.keyboard.down('KeyD');
      try {
        await page.waitForFunction(({ selector, targetX }) => Number(document.querySelector(selector)?.getAttribute('data-player-x')) >= targetX,
          { selector: sceneSelector, targetX }, { timeout: 12_000 });
      } finally {
        await page.keyboard.up('KeyD');
      }
    }
    const intact = await decodeCrown('A011_054_crete_arrimee_transport.png');
    await advanceRight(550);
    await page.locator(sceneSelector + '[data-crown-condition="marked"]').waitFor();
    await scene.getByRole('button', { name: 'Pause', exact: true }).click();
    const marked = await decodeCrown('A012_054_crete_endommagee.png');
    const atMark = await diskSave();
    assert.equal(cradle.getCradleCrownCondition(atMark.buriedCradle.progress), 'marked');
    await scene.screenshot({ path: join(output, 'marked-part-fragment.png') });
    await scene.getByRole('button', { name: 'Reprendre la chasse', exact: true }).click();
    await page.locator(sceneSelector + '[data-crown-condition="lost"][data-crown="false"]').waitFor();
    assert.equal(await scene.locator('svg image[href$="A012_054_crete_endommagee.png"]').count(), 0);
    const destroyed = await diskSave();
    assert.equal(destroyed.buriedCradle.progress.crownTransport.acidSeconds, cradle.CRADLE_CROWN_ACID_SECONDS.lost);
    report.checks.push({ kind: 'native-crown-exposure', intact, marked, lostSeconds: destroyed.buriedCradle.progress.crownTransport.acidSeconds });
    await scene.screenshot({ path: join(output, 'lost-fragment.png') });

    // Take the normal low route to the emergency beacon in room 11.
    for (const [targetX, room] of [[1660, '10'], [1660, '11']]) {
      await advanceRight(targetX);
      await page.keyboard.press('KeyE');
      await page.locator(sceneSelector + '[data-room="' + room + '"]').waitFor();
    }
    await advanceRight(156);
    await page.keyboard.press('KeyE');
    await scene.getByRole('button', { name: 'Rejoindre le débrief à bord', exact: true }).click();
    const returned = await diskSave();
    assert.equal(returned.buriedCradle.outcome, 'victory-without-crown');
    assert.equal(returned.buriedCradle.snapshot.run.roomId, '11');
    assert.equal(returned.buriedCradle.crownDelivered, false);
    await page.getByRole('button', { name: 'Rejoindre les soins et le débrief à bord', exact: true }).click();
    await panel.waitFor();
    await panel.getByText('L’acide a détruit la crête pendant le transport.', { exact: false }).waitFor();
    report.checks.push({ kind: 'physical-acid-extraction', outcome: returned.buriedCradle.outcome, exit: returned.buriedCradle.snapshot.run.roomId });
  } else {
    await openShip();
  }
  assert.equal(await mentor.count(), 0);
  await guide('medical-bay');
  const cleaning = ship.locator('[data-ship-actor] [data-cradle-return-cleaning]');
  assert.equal(await cleaning.count(), 0);
  await panel.locator('[data-cradle-return-action="treat-return"]').click();
  await cleaning.waitFor({ state: 'attached' });
  await ship.locator('[data-cradle-return-panel][data-return-revision="1"]').waitFor();
  report.checks.push({ kind: 'physical-acid-cleaning', room: 'medical-bay', onHunterArmor: true });
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
  let receipt = examined.buriedCradle.returnVisit;
  if (acid) {
    await panel.getByText('Les relevés d’expédition sont installés. Le support de trophée reste vide.', { exact: true }).waitFor();
    const absentCrown = panel.locator('img[src$="100_trophee_couronne_socle.png"], img[src$="A012_054_crete_endommagee.png"]');
    assert.equal(await absentCrown.count(), 0);
    await panel.locator('[data-cradle-return-action="analyze-workshop"]').click();
    await ship.locator('[data-cradle-return-panel][data-return-revision="3"]').waitFor();
    const reported = await diskSave();
    assert.equal(reported.buriedCradle.status, 'reported');
    assert.equal(reported.buriedCradle.outcome, 'victory-without-crown');
    assert.equal(reported.buriedCradle.crownDelivered, false);
    assert.deepEqual(reported.trophies, examined.trophies);
    receipt = reported.buriedCradle.returnVisit;
    report.checks.push({ kind: 'lost-crown-debrief', emptyStand: true, receipt });
  }

  await page.reload({ waitUntil: 'domcontentloaded' });
  await openShip();
  await panel.locator('[data-cradle-return-witness]').waitFor();
  const afterReload = await diskSave();
  assert.deepEqual(afterReload.buriedCradle.returnVisit, receipt);
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
