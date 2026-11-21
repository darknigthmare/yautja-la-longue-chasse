/** Play R2-M040 through the compiled campaign with an adult Blooded admission. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { homeworldSceneSsrV78 } from '../tests/helpers/homeworld-scene-ssr-v78.mjs';
import { openCampaignDossier } from './qa-elder-mentoring-v168.mjs';

const origin = new URL(process.env.ELITE_MASTERY_QA_URL ?? 'http://127.0.0.1:3121/');
assert.equal(origin.protocol, 'http:');
assert.equal(origin.hostname, '127.0.0.1');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (process.env.ELITE_MASTERY_QA_COMMIT) assert.equal(commit, process.env.ELITE_MASTERY_QA_COMMIT);
const buildId = (await readFile('.next/BUILD_ID', 'utf8')).trim();
assert.ok(buildId);
const output = resolve(process.env.ELITE_MASTERY_QA_OUTPUT ?? 'outputs/qa-elite-mastery-v170');
await mkdir(output, { recursive: true });

const report = {
  commit, buildId, passed: false, errors: [],
  admission: 'Adult Blooded campaign via the official import parser. Tracking, traversal and profile choices are performed in Chromium through the campaign dossier.',
};
const qa = homeworldSceneSsrV78();
const saves = qa.load('app/game/save.ts');
const honor = qa.load('app/game/systems/honorProgressionV166.ts');
const candidate = saves.defaultSave('2026-11-21T04:00:00.000Z');
candidate.profile.honor = honor.HONOR_RANK_THRESHOLDS_V166.blooded;
candidate.profile.rankId = 'blooded';
candidate.profile.acquiredRankIdV166 = 'blooded';
candidate.settings.masterVolume = 0;
const admission = saves.parseSaveImport(saves.exportSave(candidate));
assert.ok(admission.save, admission.failure);
assert.equal(admission.save.profile.rankId, 'blooded');
assert.equal(admission.save.prologue, null);
assert.ok(admission.save.eliteMasteryV170 == null);

const sceneSelector = '[data-elite-mastery-v170]';
const openLabel = 'Ouvrir le terrain de maîtrise';
const button = (scope, name) => scope.getByRole('button', { name, exact: true });
let browser;
let page;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
  });
  page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    storageState: {
      cookies: [],
      origins: [{ origin: origin.origin, localStorage: [{ name: saves.SAVE_STORAGE_KEY, value: JSON.stringify(admission.save) }] }],
    },
  });
  page.setDefaultTimeout(30_000);
  page.on('pageerror', error => report.errors.push(error.message));
  const scene = page.locator(sceneSelector);
  const disk = () => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), saves.SAVE_STORAGE_KEY);
  const board = scene.locator('[data-mastery-board]');
  const position = scene.locator('[data-mastery-position]');
  const recorded = scene.locator('[data-mastery-recorded]');
  const expectPosition = async (column, row) => {
    const label = 'Case ' + (column + 1) + ', ligne ' + (row + 1);
    await position.filter({ hasText: label }).waitFor();
    assert.ok((await position.innerText()).includes(label));
  };
  const checkpoint = async (revision, track, mobility, profile = null) => {
    const save = await disk();
    assert.equal(save.createdAt, admission.save.createdAt);
    assert.equal(save.prologue, null);
    assert.equal(save.profile.rankId, 'blooded');
    assert.deepEqual(save.eliteMasteryV170, {
      version: 1, ownerCreatedAt: admission.save.createdAt, revision,
      stages: { track, mobility, trap: 0, duel: 0 }, profile,
    });
    return save.eliteMasteryV170;
  };
  const move = async (...directions) => {
    for (const direction of directions) await button(scene, direction).click();
  };
  const open = async () => {
    await openCampaignDossier(page);
    await button(page, openLabel).click();
    await scene.waitFor();
  };

  await page.goto(origin.href, { waitUntil: 'domcontentloaded' });
  await open();
  await board.waitFor();
  await expectPosition(4, 5);
  await move('Nord', 'Nord', 'Ouest', 'Ouest', 'Ouest');
  await button(scene, 'Relever l’empreinte fraîche').click();
  await move('Nord', 'Nord');
  await button(scene, 'Identifier la proie depuis le couvert').click();
  await move('Sud', 'Sud', 'Est', 'Est', 'Est', 'Est', 'Est', 'Nord', 'Nord');
  await button(scene, 'Franchir la brèche').click();
  await expectPosition(8, 1);
  report.upperCheckpoint = await checkpoint(3, 2, 1);
  await scene.screenshot({ path: join(output, 'upper-checkpoint.png') });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await open();
  await board.waitFor();
  await expectPosition(8, 1);
  assert.deepEqual(await checkpoint(3, 2, 1), report.upperCheckpoint);
  report.reopenedAtUpperCheckpoint = true;
  await button(scene, 'Descendre par la liane').click();
  await expectPosition(8, 3);
  report.lowerCheckpoint = await checkpoint(4, 2, 2);
  await move('Ouest', 'Ouest', 'Ouest', 'Ouest', 'Sud', 'Sud');
  await expectPosition(4, 5);
  await scene.getByLabel('Discipline principale', { exact: true }).selectOption('track');
  await scene.getByLabel('Discipline associée', { exact: true }).selectOption('mobility');
  await button(scene, 'Consigner le profil').click();
  await recorded.waitFor();
  const choice = { primary: 'track', secondary: 'mobility' };
  report.profile = await checkpoint(5, 2, 2, choice);
  await scene.screenshot({ path: join(output, 'profile.png') });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await open();
  await recorded.waitFor();
  assert.deepEqual(await checkpoint(5, 2, 2, choice), report.profile);
  report.profileSurvivesReload = true;
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.failure = error.stack ?? String(error);
  if (page) await page.screenshot({ path: join(output, 'failure.png') }).catch(() => {});
  throw error;
} finally {
  await browser?.close();
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
