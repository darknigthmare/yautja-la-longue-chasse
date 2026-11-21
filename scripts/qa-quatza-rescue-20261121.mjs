/** Reaches an authentic Quatza casualty, then carries the same hunter to the witness. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { homeworldSceneSsrV78 } from '../tests/helpers/homeworld-scene-ssr-v78.mjs';
import { formationCampaignRoute } from '../tests/helpers/solo-v90-played-route.mjs';
import { playQuatzaAbsence, playQuatzaRescue } from '../tests/helpers/quatza-triage-route.mjs';

const origin = new URL(process.env.QUATZA_QA_URL ?? 'http://127.0.0.1:3121/');
assert.equal(origin.protocol, 'http:');
assert.equal(origin.hostname, '127.0.0.1');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (process.env.QUATZA_QA_COMMIT) assert.equal(commit, process.env.QUATZA_QA_COMMIT);
const buildId = (await readFile('.next/BUILD_ID', 'utf8')).trim();
assert(buildId);
const output = resolve(process.env.QUATZA_QA_OUTPUT ?? 'outputs/qa-quatza-rescue');
await mkdir(output, { recursive: true });
const qa = homeworldSceneSsrV78();
const saves = qa.load('app/game/save.ts');
const engine = qa.load('app/game/systems/quatzaRij.ts');
const { QUATZA_INPUT: I } = engine;
const key = saves.SAVE_STORAGE_KEY;
const mode = 'triad';
const keys = { [I.left]: 'ArrowLeft', [I.right]: 'ArrowRight', [I.jump]: 'Space',
  [I.strike]: 'KeyJ', [I.interact]: 'KeyE', [I.signal]: 'KeyV' };

const report = { commit, buildId, passed: false, errors: [],
  admission: 'Canonical played prologue, Temple and V90. The browser starts with no Quatza attempt or rescue. Only normal navigation, keyboard and animation frames are used.',
};
let browser, page;
try {
  const { save } = formationCampaignRoute();
  save.settings.masterVolume = 0;
  const imported = saves.parseSaveImport(saves.exportSave(save));
  assert(imported.save, imported.failure);
  assert(engine.canEnterQuatza(imported.save, mode));
  assert(!imported.save.quatzaRij?.expeditions.triad);
  const expected = playQuatzaAbsence(engine);
  const expectedRescue = playQuatzaRescue(engine, expected.frame);
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
  });
  page = await browser.newPage({
    viewport: { width: 1380, height: 950 },
    storageState: { cookies: [], origins: [{ origin: origin.origin, localStorage: [
      { name: key, value: JSON.stringify(imported.save) },
    ] }] },
  });
  page.setDefaultTimeout(40_000);
  page.on('pageerror', error => report.errors.push(error.message));
  const root = page.locator('[data-quatza-campaign]');
  const expedition = root.locator('[data-quatza-expedition="triad"]');
  const recovery = root.locator('[data-quatza-rescue]');
  const begin = root.locator('[data-quatza-begin="triad"]');
  const disk = () => page.evaluate(saveKey => JSON.parse(localStorage.getItem(saveKey)), key);
  const attempt = checkpoint => checkpoint.quatzaRij.expeditions.triad.attempts.at(-1);
  async function navigate() {
    await page.locator('[data-campaign-menu], [data-campaign-session]').first().waitFor();
    if (await page.locator('[data-campaign-menu]').isVisible()) {
      const campaign = page.locator('[data-menu-section="campaign"]');
      if (await campaign.isVisible()) await campaign.click();
      await page.locator('[data-menu-action="continue"]').click();
    }
    await page.locator('[data-campaign-location="homeworld"]').waitFor();
    await page.getByRole('button', { name: 'Navigation', exact: true }).click();
    await page.locator('[data-open-quatza-homeworld]').click();
    const dossier = page.locator('[data-clan-chronicle]');
    await dossier.getByRole('button', { name: 'Parcours et rites', exact: true }).click();
    await dossier.locator('[data-quatza-open="triad"]').click();
    await root.waitFor();
  }
  async function play(surface, resumeText, log, first = 0, end = log.length) {
    await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 1000);
    await surface.getByRole('button', { name: resumeText, exact: true }).click();
    const tick = async () => Number(await surface.getAttribute('data-tick'));
    assert.equal(await tick(), first);
    let pressed = new Set();
    for (let start = first; start < end;) {
      const code = log[start];
      let boundary = start + 1;
      while (boundary < end && log[boundary] === code) boundary++;
      const wanted = new Set(Object.entries(keys).filter(([bit]) => code & Number(bit)).map(([, binding]) => binding));
      for (const binding of pressed) if (!wanted.has(binding)) await page.keyboard.up(binding);
      for (const binding of wanted) if (!pressed.has(binding)) await page.keyboard.down(binding);
      pressed = wanted;
      for (let count = 0; ; count++) {
        const observed = await tick();
        assert(observed <= boundary, 'fixed-clock step crossed an input boundary');
        if (observed === boundary) break;
        assert(count < 200, 'native animation stalled at ' + observed);
        await page.clock.runFor(16 * Math.min(24, Math.max(1, boundary - observed - 2)));
      }
      start = boundary;
    }
    for (const binding of pressed) await page.keyboard.up(binding);
  }
  const response = await page.goto(origin.href, { waitUntil: 'domcontentloaded' });
  assert(response?.ok() && (await response.text()).includes(buildId));
  await navigate();
  assert.equal(await root.locator('[data-quatza-open-rescue]').count(), 0);
  await begin.click();
  await expedition.waitFor();
  await page.clock.install({ time: Date.now() });
  await play(expedition, 'Reprendre la chasse', expected.input);
  await page.clock.resume();
  assert.equal(await expedition.getAttribute('data-phase'), 'retreated');
  const missing = root.locator('[data-quatza-absence="saar"]');
  await missing.waitFor();
  assert.equal(await begin.count(), 0);
  assert.equal(await root.locator('[data-quatza-present]').count(), 0);
  const loss = await disk();
  assert.deepEqual(attempt(loss).input, expected.input);
  assert.deepEqual(engine.replayQuatzaAttempt(mode, attempt(loss).input), expected.frame);
  await root.screenshot({ path: join(output, '01-absence.png') });
  await root.locator('[data-quatza-open-rescue]').click();
  await recovery.waitFor();
  const receiptId = await recovery.getAttribute('data-quatza-rescue');
  assert(receiptId);
  await play(recovery, 'Reprendre le secours', expectedRescue.input, 0, expectedRescue.carryTick);
  assert.equal(await recovery.getAttribute('data-phase'), 'carry');
  assert.equal(await recovery.locator('[data-quatza-recovery-patient="saar"]').getAttribute('data-carried'), 'true');
  const carrying = attempt(await disk()).rescue;
  assert.equal(carrying.phase, 'carry');
  assert.equal(carrying.id, receiptId);
  assert.deepEqual(carrying.input, expectedRescue.input.slice(0, expectedRescue.carryTick));
  await recovery.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.clock.resume();
  await root.screenshot({ path: join(output, '02-carry-before-reload.png') });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await navigate();
  assert.equal(await recovery.getAttribute('data-phase'), 'carry');
  assert.equal(await recovery.getAttribute('data-quatza-rescue'), receiptId);
  assert.deepEqual(attempt(await disk()).rescue, carrying);
  await play(recovery, 'Reprendre le secours', expectedRescue.input, expectedRescue.carryTick);
  await page.clock.resume();
  assert.equal(await recovery.getAttribute('data-phase'), 'reunited');
  assert.equal(await recovery.locator('[data-quatza-recovery-patient="saar"]').getAttribute('data-carried'), 'false');
  await begin.waitFor();
  const final = await disk();
  const saved = attempt(final);
  assert.deepEqual(saved.rescue.input, expectedRescue.input);
  assert.equal(saved.rescue.id, receiptId);
  assert.deepEqual(engine.replayQuatzaRescue(expected.frame, saved.rescue.input), expectedRescue.frame);
  assert.deepEqual(saved.input, attempt(loss).input);
  assert.equal(saved.phase, 'retreated');
  assert.equal(engine.hasQuatzaReturn(final.quatzaRij, final.createdAt, mode), false);
  for (const property of ['profile', 'prologue', 'trophies', 'inventory'])
    assert.deepEqual(final[property], loss[property]);
  const exported = saves.parseSaveImport(saves.exportSave(final));
  assert(exported.save, exported.failure);
  assert.deepEqual(attempt(exported.save).rescue, saved.rescue);
  await root.screenshot({ path: join(output, '03-reunited.png') });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await navigate();
  assert.equal(await recovery.getAttribute('data-phase'), 'reunited');
  assert.deepEqual(attempt(await disk()).rescue, saved.rescue);
  assert.deepEqual(report.errors, []);
  report.result = { huntTicks: expected.frame.tick, hunterHealth: expected.frame.player.health,
    companion: expectedRescue.frame.patient, lastSeenX: expectedRescue.frame.lastSeenX,
    rescueId: receiptId, carryReloadTick: expectedRescue.carryTick, rescueTicks: expectedRescue.frame.tick,
    phase: saved.rescue.phase, huntPhase: saved.phase, rankChanged: false, lootGranted: false };
  report.passed = true;
} catch (error) {
  report.failure = String(error.stack ?? error);
  if (page) {
    report.failurePage = await page.evaluate(saveKey => ({
      url: location.href, location: document.querySelector('[data-campaign-location]')?.dataset.campaignLocation,
      phase: document.querySelector('[data-quatza-rescue], [data-quatza-expedition]')?.dataset.phase,
      tick: document.querySelector('[data-quatza-rescue], [data-quatza-expedition]')?.dataset.tick,
      activeSavePresent: localStorage.getItem(saveKey) !== null,
      text: document.body.innerText.slice(0, 1200),
    }), key).catch(() => null);
    await page.screenshot({ path: join(output, 'failure.png'), timeout: 5000 }).catch(() => {});
  }
  throw error;
} finally {
  await browser?.close();
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ commit, buildId, passed: report.passed, failure: report.failure ?? null,
    state: report.failurePage ?? null, result: report.result ?? null }));
}
