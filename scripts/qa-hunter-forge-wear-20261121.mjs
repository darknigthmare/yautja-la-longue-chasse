/** Repair actual V146 wear with the native workbench and campaign writer. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { homeworldSceneSsrV78 } from '../tests/helpers/homeworld-scene-ssr-v78.mjs';

const origin = new URL(process.env.HUNTER_FORGE_QA_URL ?? 'http://127.0.0.1:3121/');
assert.equal(origin.protocol, 'http:');
assert.equal(origin.hostname, '127.0.0.1');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (process.env.HUNTER_FORGE_QA_COMMIT) assert.equal(commit, process.env.HUNTER_FORGE_QA_COMMIT);
const buildId = (await readFile('.next/BUILD_ID', 'utf8')).trim();
assert(buildId);
const output = resolve(process.env.HUNTER_FORGE_QA_OUTPUT ?? 'outputs/qa-hunter-forge-wear');
await mkdir(output, { recursive: true });

const qa = homeworldSceneSsrV78();
const saves = qa.load('app/game/save.ts');
const { MISSION_BY_ID } = qa.load('app/game/data.ts');
const tools = qa.load('app/game/systems/fieldToolsV111.ts');
const anatomies = qa.load('app/game/systems/anatomyHarvestV112.ts');
const harvest = qa.load('app/game/systems/harvestInventoryV112.ts');
const customization = qa.load('app/game/systems/hunterCustomizationV146.ts');
const motion = qa.load('app/game/systems/shipInterior25d.ts');
const key = saves.SAVE_STORAGE_KEY;
const owner = '2026-11-21T21:00:00.000Z';
const species = 'oseris-iv--jungle-xeno-scout';
const mission = MISSION_BY_ID['jungle-vey'];

function fixture() {
  let save = saves.defaultSave(owner);
  save.profile.hunterName = 'QA forge · plastron';
  save.profile.clanMarks = 200;
  save.settings.masterVolume = 0;
  const purchased = tools.purchaseFieldToolV111(save, 'flaying-tool');
  assert(purchased.ok);
  save = purchased.save;

  const encounter = save.missionProgress[mission.id].attempts;
  const runId = mission.id + ':' + encounter;
  const corpses = ['forge-fixture-01', 'forge-fixture-02', 'forge-fixture-03'];
  const specimens = corpses.map(id => anatomies.makeAnatomySpecimenV112(runId, id, species, 'harvest-bone', 82, true));
  assert(specimens.every(item => item?.partId === 'bone' && item.quality === 90));
  const used = corpses.map(id => runId + ':harvest-bone:' + id);
  const delivery = harvest.deliverHarvestV112(save, specimens, used, true, mission.id, encounter);
  assert(delivery.ok, delivery.reason);

  const cracked = customization.heavyHitPieceV146(25, 100, 0);
  assert.equal(cracked, 'chest');
  const result = {
    missionId: mission.id, difficultyId: save.settings.difficultyId, outcome: 'success', score: 80,
    elapsedSeconds: 240, completedObjectiveIds: mission.objectives.filter(item => item.required || item.kind === 'extract').map(item => item.id),
    honorEvents: [], trophyQuality: 'elite', trophyClaims: [{
      id: mission.id + '-forge-admission', definitionId: mission.trophy.id, targetName: mission.targetName,
      targetKind: mission.targetKind, partId: mission.trophy.partId, condition: 'pristine', quality: 'elite',
    }],
    kills: 3, scans: 3, secondWindUsed: false, completedAt: '2026-11-21T21:04:00.000Z',
    specimensV112: specimens, toolUseIdsV112: used, harvestEncounterRunV112: encounter,
    wearV146: { heavyPieces: [cracked] },
  };
  const settled = saves.applyMissionResult(save, result);
  assert.equal(settled.missionProgress[mission.id].attempts, encounter + 1);
  assert.equal(settled.missionProgress[mission.id].status, 'completed');
  assert.deepEqual(settled.customizationV146.heavyWear, { chest: 1 });
  assert.deepEqual(settled.inventory.harvestV112, delivery.inventory.harvestV112);
  save = settled;
  for (const specimen of specimens) {
    for (const step of harvest.CONSERVATION_STEPS_V112) {
      const started = harvest.startConservationV112(save, specimen.id);
      assert(started.ok, started.message);
      save = started.save;
      for (let unit = 0; unit < step.units; unit++) {
        const worked = harvest.workConservationV112(save, specimen.id + ':' + step.to);
        assert(worked.ok, worked.message);
        save = worked.save;
      }
    }
    const archived = harvest.archiveMountedSpecimenV112(save, specimen.id);
    assert(archived.ok, archived.message);
    save = archived.save;
  }
  const admitted = saves.parseSaveImport(saves.exportSave(save));
  assert(admitted.save, admitted.failure);
  const depot = admitted.save.inventory.harvestV112;
  assert.equal(depot.specimens.length, 0);
  assert.equal(depot.jobs.length, 0);
  assert.equal(depot.archive.length, 1);
  assert.equal(depot.archive[0].count, 3);
  assert.equal(depot.archive[0].qualityTotal, 270);
  return admitted.save;
}

const report = {
  commit, buildId, passed: false, captures: [], routes: [], errors: [],
  admission: 'A declared adult Jungle run and one severe chest hit are historical fixture inputs. The actual V111 tool purchase, anatomy, terminal return, mission settlement, paid conservation work and archival reducers produce the starting save. Chromium plays navigation to the physical forge and the repair through the normal controls.',
};
let browser;
try {
  const seed = fixture();
  const start = seed.inventory.harvestV112.archive[0];
  report.initial = { wear: seed.customizationV146.heavyWear, stock: start, marks: seed.profile.clanMarks };
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce',
    storageState: { cookies: [], origins: [{ origin: origin.origin, localStorage: [{ name: key, value: JSON.stringify(seed) }] }] },
  });
  page.setDefaultTimeout(45_000);
  page.on('pageerror', error => report.errors.push(error.message));
  const boardSelector = '[data-ship-interior="2.5d"][data-suspended="false"]';
  const board = page.locator(boardSelector);
  const forge = page.locator('[data-hunter-pieces-v146]');
  const rig = page.locator('.customization-rig-stage [data-hunter-rig]');
  const wear = rig.locator('[data-piece-wear="chest"]');
  const chest = rig.locator('img[data-rig-slot^="armor-chest"]').first();
  const disk = () => page.evaluate(saveKey => JSON.parse(localStorage.getItem(saveKey)), key);
  const confirm = () => forge.locator('[data-forge-repair-piece="chest"]');

  async function openForge() {
    await page.waitForSelector('[data-campaign-menu], [data-campaign-session]');
    if (await page.locator('[data-campaign-menu]').isVisible()) {
      const campaign = page.locator('[data-menu-section="campaign"]');
      if (await campaign.isVisible()) await campaign.click();
      await page.locator('[data-menu-action="continue"]').click();
      await page.locator('[data-campaign-session]').waitFor({ timeout: 90_000 });
    }
    const play = page.getByRole('button', { name: 'Jouer', exact: true });
    if (await play.isVisible()) await play.click();
    await board.waitFor();
    const target = 'appearance-forge';
    const from = await board.getAttribute('data-ship-room');
    const route = motion.shipInterior25dRoomRoute(from, target);
    assert(route.length > 0);
    await board.locator('[data-ship-plan-toggle]').click();
    await board.locator('[data-ship-guide="' + target + '"]').click();
    for (let index = 1; index < route.length; index++) {
      const next = route[index];
      const door = motion.SHIP_INTERIOR_25D_ROOMS[route[index - 1]].doors.find(item => item.targetRoomId === next);
      assert(door);
      await board.locator('[data-ship-door="' + door.id + '"][data-door-ready="true"]').waitFor({ state: 'attached' });
      await board.locator('[data-ship-interact]').click();
      await page.locator(boardSelector + '[data-ship-room="' + next + '"]').waitFor();
    }
    await page.locator(boardSelector + '[data-ship-room="' + target + '"][data-ship-nearby="' + target + '"]').waitFor();
    await board.locator('[data-ship-interact]').click();
    await forge.waitFor();
    await forge.getByRole('tab', { name: 'Réparations', exact: true }).click();
    report.routes.push(route);
  }

  async function capture(name) {
    const file = name + '.png';
    const bytes = await rig.screenshot({ path: join(output, file), animations: 'disabled' });
    report.captures.push({ file, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  async function plate() {
    return chest.evaluate(async image => {
      await image.decode();
      return { src: image.currentSrc || image.src, width: image.naturalWidth, height: image.naturalHeight };
    });
  }

  const response = await page.goto(origin.href, { waitUntil: 'domcontentloaded' });
  assert(response?.ok() && (await response.text()).includes(buildId), 'The exact compiled build must be served.');
  await openForge();
  assert.equal(await rig.locator('[data-piece-wear]').count(), 1, 'Only the actually damaged part receives wear.');
  await wear.waitFor();
  const nativePlate = await plate();
  assert(nativePlate.width > 0 && nativePlate.height > 0);
  report.nativePlate = nativePlate;
  await rig.locator('canvas[data-piece-wear="chest"][data-wear-level="1"][data-wear-ready="true"]').waitFor();
  const painted = await wear.evaluate(canvas => {
    const { width, height } = canvas;
    const pixels = canvas.getContext('2d').getImageData(0, 0, width, height).data;
    let visiblePixels = 0;
    let maxAlpha = 0;
    for (let index = 3; index < pixels.length; index += 4) {
      const alpha = pixels[index];
      if (alpha > 0) visiblePixels++;
      if (alpha > maxAlpha) maxAlpha = alpha;
    }
    const box = canvas.getBoundingClientRect();
    return { width, height, visiblePixels, maxAlpha, displayWidth: box.width, displayHeight: box.height };
  });
  assert.equal(painted.width, 256);
  assert.equal(painted.height, 384);
  assert(painted.displayWidth > 0 && painted.displayHeight > 0);
  assert(painted.visiblePixels > 0 && painted.visiblePixels < painted.width * painted.height, 'The damage must be drawn as a localized visible overlay.');
  assert(painted.maxAlpha > 0);
  report.wearLayer = painted;
  assert.match(await confirm().innerText(), /2 matériaux/);
  await capture('chest-worn');

  await confirm().click();
  await page.waitForFunction(saveKey => {
    const save = JSON.parse(localStorage.getItem(saveKey));
    return save?.inventory.harvestV112.archive[0]?.count === 1 && !save.customizationV146?.heavyWear.chest;
  }, key);
  await wear.waitFor({ state: 'detached' });
  assert.equal(await rig.locator('[data-piece-wear]').count(), 0);
  assert.equal(await confirm().count(), 0);
  const repaired = await disk();
  assert.deepEqual(repaired.inventory.harvestV112.archive, [{ ...start, count: 1, qualityTotal: 90 }]);
  assert.equal(repaired.profile.clanMarks, seed.profile.clanMarks);
  assert.deepEqual(repaired.customizationV146.heavyWear, {});
  const canonical = saves.parseSaveImport(saves.exportSave(repaired));
  assert(canonical.save, canonical.failure);
  assert.deepEqual(canonical.save.inventory.harvestV112.archive, repaired.inventory.harvestV112.archive);
  assert.deepEqual(canonical.save.customizationV146.heavyWear, {});
  assert.deepEqual(await plate(), nativePlate);
  await capture('same-chest-repaired');
  assert.notEqual(report.captures[0].sha256, report.captures[1].sha256, 'Repair must change the rendered rig.');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await openForge();
  await plate();
  assert.equal(await rig.locator('[data-piece-wear]').count(), 0);
  assert.equal(await confirm().count(), 0);
  const restored = await disk();
  assert.deepEqual(restored.inventory.harvestV112.archive, repaired.inventory.harvestV112.archive);
  assert.deepEqual(restored.customizationV146.heavyWear, {});
  await capture('repair-restored');
  assert.deepEqual(report.errors, []);
  report.result = { remaining: restored.inventory.harvestV112.archive[0], wear: restored.customizationV146.heavyWear, marks: restored.profile.clanMarks };
  report.passed = true;
} catch (error) {
  report.failure = String(error.stack ?? error);
  throw error;
} finally {
  await browser?.close();
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ commit, buildId, passed: report.passed, failure: report.failure ?? null }));
}
