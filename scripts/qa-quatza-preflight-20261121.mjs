/** Native proof of M041 using the compiled campaign and the normal dossier. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { homeworldSceneSsrV78 } from '../tests/helpers/homeworld-scene-ssr-v78.mjs';
import { playShipAcquisitionV161 } from '../tests/helpers/ship-receipt-v161.mjs';
import { openCampaignDossier } from './qa-elder-mentoring-v168.mjs';

const origin = new URL(process.env.QUATZA_QA_URL ?? 'http://127.0.0.1:3121/');
assert.equal(origin.protocol, 'http:');
assert.equal(origin.hostname, '127.0.0.1');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (process.env.QUATZA_QA_COMMIT) assert.equal(commit, process.env.QUATZA_QA_COMMIT);
const buildId = (await readFile('.next/BUILD_ID', 'utf8')).trim();
assert.ok(buildId);
const output = resolve(process.env.QUATZA_QA_OUTPUT ?? 'outputs/qa-quatza-preflight');
await mkdir(output, { recursive: true });

const qa = homeworldSceneSsrV78();
const saves = qa.load('app/game/save.ts');
const engine = qa.load('app/game/systems/quatzaRij.ts');
const { MISSIONS } = qa.load('app/game/data.ts');
const historical = saves.defaultSave('2026-11-21T12:00:00.000Z');
historical.profile = { ...historical.profile, honor: 2000, rankId: 'blooded', acquiredRankIdV166: 'blooded' };
historical.settings.masterVolume = 0;
MISSIONS.forEach(mission => {
  historical.missionProgress[mission.id] = {
    ...historical.missionProgress[mission.id], status: 'completed', attempts: 1, completions: 1,
  };
});
const owned = playShipAcquisitionV161(qa, historical);
const imported = saves.parseSaveImport(saves.exportSave(owned));
assert(imported.save, imported.failure);
assert(engine.canEnterQuatza(imported.save, 'solo'));
const report = { commit, buildId, passed: false, errors: [], checks: [],
  admission: 'Canonical adult Blooded with eight completed missions. The fixture plays V89 at the actual workshop to receive and enter the hull; no Quatza actions or trophies are seeded.' };
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1380, height: 950 },
    storageState: { cookies: [], origins: [{ origin: origin.origin, localStorage: [{
      name: saves.SAVE_STORAGE_KEY, value: JSON.stringify(imported.save),
    }] }] },
  });
  page.setDefaultTimeout(35_000);
  page.on('pageerror', error => report.errors.push(error.message));
  const root = page.locator('[data-quatza-campaign]');
  const expedition = root.locator('[data-quatza-expedition="solo"]');
  const frame = expedition.locator('[tabindex="0"]').first();
  const disk = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saves.SAVE_STORAGE_KEY);
  const checkpoint = async () => {
    const save = await disk();
    const attempt = save.quatzaRij.expeditions.solo.attempts.at(-1);
    return { save, attempt, frame: engine.replayQuatzaAttempt('solo', attempt.input) };
  };
  async function navigate() {
    await openCampaignDossier(page);
    await page.locator('[data-quatza-open="solo"]').click();
    await root.waitFor();
  }
  async function walk(x) {
    const value = Number(await expedition.getAttribute('data-x'));
    if (Math.abs(value - x) < 6) return;
    const direction = value < x ? 1 : -1;
    const key = direction === 1 ? 'ArrowRight' : 'ArrowLeft';
    await frame.focus();
    await page.keyboard.down(key);
    try {
      await page.waitForFunction(({ x, direction }) => {
        const node = document.querySelector('[data-quatza-expedition="solo"]');
        return node && (Number(node.dataset.x) - x) * direction >= 0;
      }, { x, direction }, { timeout: 9_000 });
    } finally { await page.keyboard.up(key); }
    assert(Math.abs(Number(await expedition.getAttribute('data-x')) - x) <= 40);
  }
  async function post(x) {
    await walk(x);
    await page.keyboard.down('KeyE');
    try { await page.waitForTimeout(70); }
    finally { await page.keyboard.up('KeyE'); }
    await page.waitForTimeout(35);
  }

  const response = await page.goto(origin.href, { waitUntil: 'domcontentloaded' });
  assert(response?.ok() && (await response.text()).includes(buildId));
  await navigate();
  await root.locator('[data-quatza-begin="solo"]').click();
  await expedition.getByRole('button', { name: 'Reprendre la chasse', exact: true }).click();
  await post(engine.QUATZA_POSTS.map);
  assert.equal((await checkpoint()).frame.route, false);
  await post(engine.QUATZA_POSTS.rack);
  assert.equal((await checkpoint()).frame.checked, true);
  await post(engine.QUATZA_POSTS.map);
  assert.equal((await checkpoint()).frame.route, true);
  await post(engine.QUATZA_POSTS.mobility);
  assert.equal(await expedition.getAttribute('data-kit'), 'mobility');
  await post(engine.QUATZA_POSTS.care);
  assert.equal(await expedition.getAttribute('data-kit'), 'mobility');
  await expedition.getByRole('button', { name: 'Pause', exact: true }).click();
  const chosen = await checkpoint();
  assert.equal(chosen.frame.kit, 'mobility');
  assert.equal(chosen.frame.phase, 'preparation');
  assert.equal(chosen.frame.hide, false);
  report.checks.push({ kind: 'physical-preflight', kit: chosen.frame.kit, ticks: chosen.frame.tick, checked: chosen.frame.checked, route: chosen.frame.route });
  await root.screenshot({ path: join(output, 'preflight-mobility.png') });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await navigate();
  await expedition.waitFor();
  assert.equal(await expedition.getAttribute('data-kit'), 'mobility');
  assert.equal(Number(await expedition.getAttribute('data-x')), chosen.frame.player.x);
  assert.deepEqual((await checkpoint()).attempt, chosen.attempt);
  await expedition.getByRole('button', { name: 'Reprendre la chasse', exact: true }).click();
  await post(engine.QUATZA_POSTS.departure);
  assert.equal((await checkpoint()).frame.phase, 'field');
  await post(engine.QUATZA_POSTS.trail);
  await page.waitForSelector('[data-quatza-sprite]');
  const native = await page.evaluate(async () => {
    const actor = document.querySelector('[data-quatza-sprite]');
    const image = new Image();
    image.src = getComputedStyle(actor).backgroundImage.slice(5, -2);
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  });
  assert.deepEqual(native, { width: 1104, height: 336 });
  assert.equal((await checkpoint()).frame.kit, 'mobility');
  assert.equal((await checkpoint()).frame.beast.health, 8);
  report.checks.push({ kind: 'reload-and-depart', native, noVictorySeeded: true });
  await root.screenshot({ path: join(output, 'quatza-territory.png') });
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
