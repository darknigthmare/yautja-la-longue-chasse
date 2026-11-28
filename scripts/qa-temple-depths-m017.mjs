import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { thresholdsCampaignRoute } from '../tests/helpers/solo-v69-played-route.mjs';
import { formationCampaignRoute } from '../tests/helpers/solo-v90-played-route.mjs';
import { templeCampaignRoute, thresholdsTemple } from '../tests/helpers/solo-v70-played-route.mjs';
import { homeworldSceneSsrV78 } from '../tests/helpers/homeworld-scene-ssr-v78.mjs';

const modules = homeworldSceneSsrV78();
const saves = modules.load('app/game/save.ts');
const { YOUTH_CONTROL_ACTIONS: actions } = modules.load('app/game/systems/youthControls.ts');
const { descent, hunt } = thresholdsTemple.SOLO_V70_DEPTHS_M017;
const legacyGallery = process.argv.includes('--legacy-gallery');
const legacyRoyal = process.argv.includes('--legacy-royal');
const expanded = legacyGallery || legacyRoyal || process.argv.includes('--complete-depths');
const royalEncounter = expanded && !legacyGallery;
const royalAsset = '/game/xeno-prime/berceau-v1/sprites/personnages/059_matriarche_intacte.png';
let loadedRoyalAsset = false;
const posts = thresholdsTemple.SOLO_V70_DEPTH_POSTS_M017;
const galleryAssets = new Set([
  '/game/xeno-prime/berceau-v1/sprites/ruche/026_oeuf_ouvert.png',
  '/game/xeno-prime/berceau-v1/sprites/personnages/058_facehugger.png',
]);
const loadedGalleryAssets = new Set();
const previous = thresholdsCampaignRoute().save;
const origin = { ...previous, prologue: { ...previous.prologue, templeTriadFirstM017: true } };
const waiting = formationCampaignRoute({ origin, stop: 'observe' }).save;
const seed = templeCampaignRoute({ origin: waiting, stop: 'return',
  archiveRoomCount: expanded ? undefined : 11, legacyGallery, legacyRoyal }).save;
seed.settings.masterVolume = 0;
assert.equal(saves.parseSaveImport(saves.exportSave(seed)).failure, null);
const key = saves.SAVE_STORAGE_KEY;
const output = resolve(process.env.M017_OUTPUT ?? 'outputs/qa-temple-depths-m017');
const report = {
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  seed: 'V69, V90 roles and V70 Vanne reached through native reducers. Only Chromium keyboard input acts after the Vanne.',
  route: legacyGallery ? 'historical-gallery' : legacyRoyal ? 'historical-royal' : royalEncounter ? 'rescue' : 'historical-eleven-rooms',
  passed: false, errors: [],
};
const bindings = seed.settings.controlBindings;
const right = bindings[actions.right].at(-1);
const left = bindings[actions.left].at(-1);
const interact = bindings[actions.interact][0];
const jump = bindings[actions.jump][0];
const signal = bindings[actions.blade][0];

await mkdir(output, { recursive: true });
let browser, server;
try {
  server = await createServer({ configFile: resolve('desktop/vite.config.ts'), server: { host: '127.0.0.1', port: 4270, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1340, height: 920 }, reducedMotion: 'reduce' });
  await context.addInitScript(({ key, seed }) => {
    if (sessionStorage.getItem('m017-depths-native')) return;
    sessionStorage.setItem('m017-depths-native', 'yes');
    localStorage.setItem(key, JSON.stringify(seed));
  }, { key, seed });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => {
    const path = new URL(response.url()).pathname;
    if (galleryAssets.has(path) && response.ok()) loadedGalleryAssets.add(path);
    if (path === royalAsset && response.ok()) loadedRoyalAsset = true;
  });
  page.setDefaultTimeout(30000);
  const canvas = page.locator('[data-solo-v70] canvas[data-solo-assets="true"]');
  const live = () => canvas.evaluate(element => JSON.parse(element.dataset.soloState));
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  const shot = name => page.screenshot({ path: resolve(output, name + '.png'), animations: 'disabled' });
  async function boot() {
    await page.locator('[data-campaign-menu]').waitFor({ timeout: 90000 });
    const campaign = page.locator('[data-menu-section="campaign"]');
    if (await campaign.isVisible()) await campaign.click();
    await page.locator('[data-menu-action="continue"]').click();
    await canvas.waitFor({ timeout: 90000 });
    await canvas.focus();
    await page.clock.runFor(180);
  }
  async function approach(target, direction = (target >= 120 ? 1 : -1), tolerance = 10) {
    const horizontal = direction > 0 ? right : left;
    await page.keyboard.down(horizontal);
    for (let i = 0; i < 220 && (target - (await live()).player.x) * direction > tolerance; i++) {
      await page.clock.runFor(65);
    }
    await page.keyboard.up(horizontal);
    await page.clock.runFor(100);
    const state = await live();
    assert(Math.abs(state.player.x - target) < tolerance + 20, JSON.stringify(state.player));
  }
  async function hold(key, time) {
    await page.keyboard.down(key);
    await page.clock.runFor(time);
    await page.keyboard.up(key);
    await page.clock.runFor(120);
  }
  async function leap(target, height) {
    await page.keyboard.down(jump);
    await page.keyboard.down(right);
    for (let i = 0; i < 75 && (await live()).player.x < target - 4; i++) await page.clock.runFor(40);
    await page.keyboard.up(jump);
    await page.keyboard.up(right);
    await page.clock.runFor(480);
    let state = await live();
    for (let i = 0; i < 16 && state.player.vy !== 0; i++) {
      await page.clock.runFor(30);
      state = await live();
    }
    assert.equal(state.player.y, height, JSON.stringify(state.player));
    assert.equal(state.player.vy, 0);
  }
  async function crossTo(room, direction = 1) {
    await approach(direction > 0 ? 1040 : 80, direction);
    await page.clock.runFor(350);
    await hold(interact, 130);
    assert.equal((await saved()).soloV70.checkpoint.room, room, 'Physical portal to ' + room);
  }
  async function observe(post) {
    const ready = state => state.player.y === post.y && state.player.vx === 0 && state.player.vy === 0 &&
      (post.plates ? thresholdsTemple.soloV70DepthAppuisM017(state.companions.map(companion => companion.x), post.plates)
        : thresholdsTemple.soloV70TrioPresent(state));
    for (let i = 0; i < 40 && !ready(await live()); i++) await page.clock.runFor(100);
    assert(ready(await live()), 'Physical actors have not reached ' + post.id);
    await hold(interact, 1050);
    const proof = (await saved()).soloV70.checkpoint.depthsM017.extension.observations[post.id];
    assert(proof, post.id + ': ' + JSON.stringify(await live()));
    return proof;
  }
  await page.clock.install();
  await page.goto('http://127.0.0.1:4270');
  await boot();
  assert.equal((await live()).room, thresholdsTemple.SOLO_V70_QUARANTINE_THRESHOLD.room);
  assert((await saved()).soloV70.checkpoint.riteAdmission.threshold);
  await approach(1040, 1);
  await hold(interact, 120);
  assert.equal((await live()).room, descent.room);
  assert.equal((await saved()).soloV70.checkpoint.room, descent.room);
  await hold(signal, 80);
  assert.equal((await saved()).soloV70.checkpoint.companionMode, 'plates');
  await approach(378, 1, 4);
  await leap(500, 372);
  await leap(descent.x, descent.y);
  await page.clock.runFor(700);
  await shot('01-plaques-et-passerelle');
  await page.keyboard.down(interact);
  for (let i = 0; i < 18 && !(await saved()).soloV70.checkpoint.depthsM017.relay; i++) await page.clock.runFor(100);
  await page.keyboard.up(interact);
  const relay = (await saved()).soloV70.checkpoint.depthsM017.relay;
  assert(relay);
  assert(thresholdsTemple.soloV70DepthPlatesReadyM017(relay.positions.slice(1)));
  await page.clock.runFor(100);
  assert.equal(await page.locator('[data-solo-v70]').getAttribute('data-temple-depth-gate'), 'moving');
  await shot('02-volet-en-mouvement');

  await page.reload();
  await boot();
  const resumed = (await saved()).soloV70.checkpoint;
  assert.equal(resumed.room, descent.room);
  assert.deepEqual(resumed.depthsM017.relay, relay);
  assert.equal(resumed.depthsM017.huntThreshold, null);
  await approach(1040, 1);
  await hold(interact, 120);
  assert.equal((await live()).room, hunt.room);
  assert.equal((await saved()).soloV70.checkpoint.room, hunt.room);
  await approach(hunt.x, 1);
  await page.clock.runFor(350);
  await hold(interact, expanded ? 800 : 920);
  if (expanded) {
    const [eggs, resin, screen, royal, vent] = posts;
    const gallery = () => page.locator('[data-solo-v70]').getAttribute('data-temple-gallery');
    const storedGallery = async () => (await saved()).soloV70.checkpoint.depthsM017.extension.gallery;
    const waitForGallery = async expected => {
      for (let i = 0; i < 20 && await gallery() !== expected; i++) await page.clock.runFor(50);
      assert.equal(await gallery(), expected);
    };
    const crossBeforeContainment = async () => {
      await approach(1040, 1);
      await hold(interact, 130);
      assert.equal((await live()).room, eggs.room);
      assert.equal((await saved()).soloV70.checkpoint.room, eggs.room);
    };
    assert((await saved()).soloV70.checkpoint.depthsM017.extension.observations[eggs.id]);
    assert.equal((await saved()).soloV70.checkpoint.depthsM017.huntThreshold, null);
    assert.equal(await gallery(), 'warning', 'The physical observation must announce the hatching.');
    await shot('03-galerie-des-oeufs');
    await waitForGallery('open');
    await shot('03a-eclosion-et-facehugger');
    await crossBeforeContainment();
    const emerged = await storedGallery();
    assert(Number.isSafeInteger(emerged?.openedAt));
    assert.equal(emerged.screened, null);
    await page.reload();
    await boot();
    await waitForGallery('open');
    assert.deepEqual(await storedGallery(), emerged);
    assert.equal((await live()).room, eggs.room);
    await crossBeforeContainment();

    const healthBefore = (await live()).health;
    await approach(740, -1);
    await page.clock.runFor(350);
    await hold(interact, 300);
    assert.equal(await gallery(), 'open', 'A tap cannot close the physical screen.');
    await hold(interact, 820);
    await waitForGallery('screened');
    const screened = await storedGallery();
    assert.equal(screened?.openedAt, emerged.openedAt);
    assert(Number.isSafeInteger(screened.screened?.tick));
    assert(screened.screened.tick >= emerged.openedAt + 40);
    assert.equal(screened.screened.positions.length, 3);
    assert((await live()).health >= healthBefore - 1);
    assert.equal((await live()).failedAt, null);
    await shot('03b-grille-de-la-galerie-tiree');
    await page.reload();
    await boot();
    await waitForGallery('screened');
    assert.deepEqual(await storedGallery(), screened);
    await crossTo(resin.room);
    assert.deepEqual(await storedGallery(), screened);
    assert.deepEqual([...galleryAssets].filter(path => !loadedGalleryAssets.has(path)), []);
    report.gallery = {
      closedDoorBeforeScreen: true,
      openAndScreenedSurviveReload: true,
      emerged,
      screened,
      nativeAssets: [...galleryAssets],
    };
    await hold(signal, 80);
    await approach(378, 1, 4);
    await leap(500, 372);
    await leap(resin.x, resin.y);
    await observe(resin);
    await shot('04-ancre');

    await crossTo(screen.room);
    await hold(signal, 80);
    await approach(screen.x, 1);
    await observe(screen);
    await shot('05-grille');

    await crossTo(royal.room);
    await approach(321, 1, 4);
    await leap(472, 370);
    await leap(royal.x, royal.y);

    const royalStage = () => page.locator('[data-solo-v70]').getAttribute('data-temple-royal');
    const readRoyal = async () => (await saved()).soloV70.checkpoint.depthsM017.extension.royal;
    const readRoyalLock = async () => (await saved()).soloV70.checkpoint.depthsM017.extension.observations[royal.id];
    const waitRoyal = async expected => {
      for (let i = 0; i < 95 && await royalStage() !== expected; i++) await page.clock.runFor(50);
      assert.equal(await royalStage(), expected);
    };
    if (royalEncounter) {
      await waitRoyal('waiting');
      await hold(interact, 1080);
      assert.equal(await readRoyalLock(), undefined, 'The old console shortcut must require an evasion first.');
      assert.equal(await royalStage(), 'waiting');
      await approach(1040, 1);
      await page.clock.runFor(350);
      await hold(interact, 130);
      assert.equal((await live()).room, royal.room, 'The purge door must stay shut.');
      assert.equal((await saved()).soloV70.checkpoint.room, royal.room);

      await approach(410, -1, 4);
      assert.equal((await live()).player.y, 430);
      await hold(interact, 115);
      await waitRoyal('warning');
      const announced = await readRoyal();
      assert(Number.isSafeInteger(announced?.startedAt));
      assert.equal(announced.evade, null);
      await shot('06a-attaque-annoncee');
      await page.reload();
      await boot();
      await waitRoyal('warning');
      assert.deepEqual(await readRoyal(), announced);

      const health = (await live()).health;
      await waitRoyal('strike');
      await shot('06b-balayage-au-sol');
      await waitRoyal('recover');
      const aftermath = await live();
      assert.equal(aftermath.health, health - 1, 'Missing a ground sweep costs exactly one health point.');
      if (aftermath.failedAt !== null) {
        await page.clock.runFor(Math.max(0, aftermath.failedAt + 90 - aftermath.tick) * 1000 / 60 + 70);
        await canvas.focus();
        await hold(interact, 140);
        const restarted = await live();
        assert.equal(restarted.failedAt, null);
        assert.equal(restarted.attempts, aftermath.attempts + 1);
        assert.equal(restarted.health, 6);
        assert.equal(restarted.player.x, 125);
        assert.deepEqual(await readRoyal(), announced);
        report.royalRetry = { restoredAt: restarted.tick, health: restarted.health,
          attempts: restarted.attempts, retainedAnnouncement: true };
        await approach(305, 1, 4);
        await waitRoyal('recover');
        await approach(410, 1, 4);
      }
      const beforeJump = await live();
      report.royalBeforeJump = {
        health: beforeJump.health, failedAt: beforeJump.failedAt, hurtTimer: beforeJump.hurtTimer,
        armed: beforeJump.inputArmed, player: beforeJump.player,
      };
      assert.equal(beforeJump.failedAt, null);
      assert(beforeJump.inputArmed && beforeJump.health > 0);
      assert.equal(beforeJump.player.y, 430);
      await canvas.focus();
      await leap(445, 370);
      await waitRoyal('evaded');
      const evaded = await readRoyal();
      assert.equal(evaded.startedAt, announced.startedAt);
      assert(Number.isSafeInteger(evaded.evade?.tick));
      assert(evaded.evade.tick > announced.startedAt + 144);
      assert(evaded.evade.y <= 386);
      assert.equal((await live()).health, beforeJump.health, 'The next sweep must be avoided by taking cover.');
      await shot('06c-esquive-en-hauteur');
      await page.reload();
      await boot();
      await waitRoyal('evaded');
      assert.deepEqual(await readRoyal(), evaded);

      await approach(472, 1, 4);
      await leap(royal.x, royal.y);
      await hold(signal, 80);
      const supportsReady = state => state.companionMode === 'plates' &&
        thresholdsTemple.soloV70DepthAppuisM017(state.companions.map(companion => companion.x), [530, 815]);
      for (let i = 0; i < 40 && !supportsReady(await live()); i++) await page.clock.runFor(100);
      assert(supportsReady(await live()), 'Saar and Vek must physically reach their supports.');
      const lock = await observe(royal);
      await waitRoyal('contained');
      assert(thresholdsTemple.soloV70DepthAppuisM017(lock.positions.slice(1), [530, 815]));
      assert(lock.tick >= evaded.evade.tick + royal.holdTicks);
      assert(loadedRoyalAsset, 'The original royal source sprite must load from its tracked URL.');
      await shot('06d-loge-confinee');
      await page.reload();
      await boot();
      await waitRoyal('contained');
      assert.deepEqual(await readRoyal(), evaded);
      assert.deepEqual(await readRoyalLock(), lock);
      report.royal = { announced, evaded, lock, health, missedGroundSweepDamage: 1,
        loadedNativeAsset: royalAsset, gateDeniedBeforeContainment: true, previousShortcutDenied: true,
        warningEvasionAndConfinementSurviveReload: true };
    } else {
      assert.equal(await royalStage(), null);
      assert.equal(await readRoyal(), undefined);
      await observe(royal);
      assert.equal(loadedRoyalAsset, false);
      report.legacyGallery = { originalConsoleWithNoRoyalEncounter: true };
      await shot('06-verrou-royal');
    }

    await crossTo(vent.room);
    const { x, duration } = thresholdsTemple.SOLO_V70_PURGE_M017;
    const rescueStage = () => page.locator('[data-solo-v70]').getAttribute('data-temple-rescue');
    const readRescue = async () => (await saved()).soloV70.checkpoint.depthsM017.extension.rescue;
    if (royalEncounter && !legacyRoyal) {
      const { pickup, relief, carrySpeed } = thresholdsTemple.SOLO_V70_RESCUE_M017;
      assert.equal(await rescueStage(), 'wounded');
      assert.equal((await live()).companions[0].x, pickup.x);
      await shot('07a-saar-blesse');
      await hold(interact, 130);
      assert.equal((await live()).room, vent.room, 'The triad cannot leave the wounded teammate behind.');
      await approach(x, 1);
      await hold(interact, 655);
      assert.equal((await live()).depthsM017.extension.purgeStartedAt, null, 'The upstream valve is gated by the rescue.');

      await approach(pickup.x, 1);
      await page.clock.runFor(650);
      await hold(interact, 850);
      const { pickedUp } = await readRescue();
      assert(pickedUp);
      assert.equal(await rescueStage(), 'carrying');
      assert.equal(await page.getByRole('status').filter({ hasText: 'Vek escorte la triade' }).count(), 1);

      await approach((pickup.x + relief.x) / 2, 1);
      await hold(jump, 250);
      const carried = await live();
      assert.equal(carried.player.y, relief.y, 'The wounded must be carried at ground level.');
      assert(carried.player.x > pickup.x + 60 && carried.player.x < relief.x - 40);
      assert.equal(carried.companions[0].x, thresholdsTemple.soloV70SaarCarryX(carried.player.x));
      await shot('07b-transport-de-saar');
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      const checkpoint = (await saved()).soloV70.checkpoint;
      assert.equal(checkpoint.player.x, carried.player.x);
      assert.deepEqual(checkpoint.depthsM017.extension.rescue, { pickedUp, delivered: null });
      await page.reload();
      await boot();
      const resumed = await live();
      assert.equal(await rescueStage(), 'carrying');
      assert.equal(resumed.player.x, checkpoint.player.x);
      assert.equal(resumed.companions[0].x, checkpoint.companions[0].x);
      assert.deepEqual(await readRescue(), checkpoint.depthsM017.extension.rescue);

      await approach(relief.x, 1);
      await page.clock.runFor(300);
      await hold(interact, 950);
      assert.equal(await rescueStage(), 'safe');
      const { delivered } = await readRescue();
      assert(delivered);
      assert(delivered.positions[0] - pickedUp.positions[0] <= (delivered.tick - pickedUp.tick - relief.holdTicks) * carrySpeed + .01);
      await shot('07c-saar-au-refuge');
      await page.reload();
      await boot();
      assert.equal(await rescueStage(), 'safe');
      assert.deepEqual(await readRescue(), { pickedUp, delivered });
      report.rescue = { pickedUp, delivered, resumedAt: resumed.player.x, exitsAndPurgeBlockedBeforeRescue: true };
    } else {
      assert.equal(await rescueStage(), null);
      assert.equal(await readRescue(), undefined);
    }
    await approach(x, x > (await live()).player.x ? 1 : -1);
    await hold(interact, 655);
    const first = (await saved()).soloV70.checkpoint.depthsM017.extension.purgeStartedAt;
    assert(first);
    await shot('07-conduite-ouverte');
    await page.reload();
    await boot();
    assert.equal((await saved()).soloV70.checkpoint.depthsM017.extension.purgeStartedAt, first);
    await page.clock.runFor((duration + 25) * 1000 / 60);
    assert.equal(await page.locator('[data-solo-v70]').getAttribute('data-temple-purge'), 'closed');
    await hold(interact, 660);
    const second = (await saved()).soloV70.checkpoint.depthsM017.extension.purgeStartedAt;
    assert(second >= first + duration);
    await approach(vent.x, 1);
    await observe(vent);
    assert.equal(await page.locator('[data-solo-v70]').getAttribute('data-temple-purge'), 'purged');
    await approach(thresholdsTemple.SOLO_V70_FINAL_THRESHOLD_M017.x, 1);
    await hold(interact, 1000);
    report.purgeTries = [first, second];
  }
  const threshold = (await saved()).soloV70.checkpoint.depthsM017.huntThreshold;
  assert(threshold);
  assert(threshold.tick >= relay.tick + descent.openingTicks + hunt.holdTicks);
  assert.equal(await page.locator('[data-solo-v70]').getAttribute('data-temple-hunt-threshold'), 'triad-confirmed');
  await shot(expanded ? '08-seuil-de-chasse' : '03-seuil-de-chasse');
  await page.reload();
  await boot();
  assert.deepEqual((await saved()).soloV70.checkpoint.depthsM017.huntThreshold, threshold);
  if (expanded) {
    for (const room of [13, 12, 11, 10]) await crossTo(room, -1);
  }
  await crossTo(descent.room, -1);
  await crossTo(thresholdsTemple.SOLO_V70_QUARANTINE_THRESHOLD.room, -1);
  const backAtVanne = await saved();
  assert.equal(backAtVanne.soloV70.checkpoint.room, thresholdsTemple.SOLO_V70_QUARANTINE_THRESHOLD.room);
  assert.deepEqual(backAtVanne.soloV90, waiting.soloV90);
  assert.deepEqual(backAtVanne.soloV70.checkpoint.depthsM017.huntThreshold, threshold);
  assert.equal(saves.parseSaveImport(saves.exportSave(backAtVanne)).failure, null);
  assert.equal(backAtVanne.quatzaRij, seed.quatzaRij);
  assert.deepEqual(report.errors, []);
  report.relay = relay;
  report.threshold = threshold;
  if (expanded) report.deepObservations = backAtVanne.soloV70.checkpoint.depthsM017.extension.observations;
  if (royalEncounter) {
    assert.deepEqual(backAtVanne.soloV70.checkpoint.depthsM017.extension.royal, report.royal.evaded);
    assert.deepEqual(report.deepObservations['royal-lock'], report.royal.lock);
  }
  if (legacyGallery) assert.equal(backAtVanne.soloV70.checkpoint.depthsM017.extension.royal, undefined);
  if (report.rescue) {
    const { pickedUp, delivered } = backAtVanne.soloV70.checkpoint.depthsM017.extension.rescue;
    assert.deepEqual(pickedUp, report.rescue.pickedUp);
    assert.deepEqual(delivered, report.rescue.delivered);
    assert(delivered.tick < report.purgeTries[0]);
  }
  report.passed = true;
} catch (error) {
  report.errors.push(error.stack);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await server?.close();
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
