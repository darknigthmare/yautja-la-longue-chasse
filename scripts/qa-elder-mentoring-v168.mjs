/** R2-M049 on compiled Next, with a declared adult campaign admission.
 * All terrain movement, mentoring choices, observations and witness reporting
 * use the real campaign UI. Import the helper or run this file directly. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { homeworldSceneSsrV78 } from '../tests/helpers/homeworld-scene-ssr-v78.mjs';

const SAVE_KEY = 'yautja-long-hunt.save';
const OPEN = 'Ouvrir le terrain du novice';
const RECORDED = 'Le témoin a consigné la décision et la réussite du novice.';
const RESULT = 'Piste repérée en autonomie.';

function button(scope, name) {
  return scope.getByRole('button', { name, exact: true });
}

async function readCampaign(page) {
  const save = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), SAVE_KEY);
  assert.ok(save?.createdAt, 'The active campaign must exist in browser storage');
  return save;
}

function expectedReceipt(ownerCreatedAt) {
  return {
    version: 1, ownerCreatedAt, revision: 6, supports: ['west', 'east'],
    attempt: { choice: 'alone', observed: 2 }, resolved: true,
  };
}

/** Complete the novice's hunt from the open adult campaign dossier. */
export async function completeElderMentoring(page) {
  const initial = await readCampaign(page);
  assert.ok(initial.elderMentoringV168 == null, 'Begin without mentoring proof');
  await button(page, OPEN).click();
  const scene = page.locator('[data-elder-mentoring]');
  const terrain = page.getByRole('region', { name: 'Terrain d’exercice', exact: true });
  const move = async (...directions) => {
    for (const direction of directions) await button(scene, direction).click();
  };
  await terrain.waitFor();
  await terrain.press('ArrowUp');
  await move('Ouest', 'Ouest', 'Nord');
  await button(scene, 'Préparer l’appui ouest').click();
  await move('Est', 'Est', 'Est', 'Est');
  await button(scene, 'Préparer l’appui est').click();
  await move('Ouest', 'Ouest', 'Sud');
  await button(scene, 'Laisser le novice tenter seul').click();
  await button(scene, 'Observer son choix').click();
  await scene.getByText('Le novice a choisi l’appui ouest.', { exact: true }).waitFor();
  await move('Nord', 'Ouest', 'Ouest', 'Ouest');
  await button(scene, 'Observer l’approche').click();
  await scene.getByText('Le novice a repéré la proie depuis le couvert. Rends compte au témoin.', { exact: true }).waitFor();
  await move('Est', 'Est', 'Est', 'Est', 'Sud', 'Sud');
  await button(scene, 'Consigner la chasse').click();
  await scene.getByText(RECORDED, { exact: true }).waitFor();
  await scene.getByText(RESULT, { exact: true }).waitFor();
  const receipt = (await readCampaign(page)).elderMentoringV168;
  assert.deepEqual(receipt, expectedReceipt(initial.createdAt));
  return receipt;
}

export async function openCampaignDossier(page) {
  await page.waitForSelector('[data-campaign-menu], [data-campaign-session]');
  if (await page.locator('[data-campaign-menu]').isVisible()) {
    const campaign = page.locator('[data-menu-section="campaign"]');
    if (await campaign.isVisible()) await campaign.click();
    await page.locator('[data-menu-action="continue"]').click();
    await page.locator('[data-campaign-session]').waitFor();
  }
  const play = button(page, 'Jouer');
  const dossier = button(page, 'Dossier de campagne');
  await play.or(dossier).first().waitFor();
  if (await play.isVisible()) await play.click();
  await dossier.click();
  await button(page, 'Parcours et rites').click();
}

/** Admit the canonical adult campaign at the mentor's rank and honor threshold. */
export function adultElderTrialAdmission(qa) {
  const saves = qa.load('app/game/save.ts');
  const { canMentorElderNovice } = qa.load('app/game/systems/elderMentoringV168.ts');
  const { youthCampaignMatchesSave } = qa.load('app/game/systems/youthCampaign.ts');
  const owner = '2026-11-21T02:49:00.000Z';
  const save = saves.defaultSave(owner);
  save.profile.honor = 8000;
  save.profile.rankId = 'elite';
  save.profile.acquiredRankIdV166 = 'elite';
  save.settings.masterVolume = 0;
  // The save parser accepts the adult campaign without a prologue and
  // derives career Elder at 8000 honor. Narrative rites need their own chapters.
  assert.equal(save.prologue, null);
  assert.ok(youthCampaignMatchesSave(save), 'Admission must satisfy the youth archive contract');
  const admitted = saves.parseSaveImport(JSON.stringify(save));
  assert.ok(admitted.save, 'Adult campaign parse failed: ' + admitted.failure);
  const imported = saves.parseSaveImport(saves.exportSave(admitted.save));
  assert.ok(imported.save, 'Adult campaign round trip failed: ' + imported.failure);
  assert.equal(imported.save.prologue, null);
  assert.equal(imported.save.profile.rankId, 'elder');
  assert.equal(imported.save.profile.honor, 8000);
  assert.equal(saves.SAVE_STORAGE_KEY, SAVE_KEY);
  assert.ok(canMentorElderNovice(imported.save), 'Adult campaign must qualify for mentoring');
  assert.ok(imported.save.elderMentoringV168 == null);
  return imported.save;
}

async function run() {
  const origin = new URL(process.env.ELDER_MENTORING_QA_URL ?? 'http://127.0.0.1:3121/');
  assert.equal(origin.protocol, 'http:');
  assert.equal(origin.hostname, '127.0.0.1');
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (process.env.ELDER_MENTORING_QA_COMMIT) assert.equal(commit, process.env.ELDER_MENTORING_QA_COMMIT);
  const buildId = (await readFile('.next/BUILD_ID', 'utf8')).trim();
  assert.ok(buildId);
  const output = resolve(process.env.ELDER_MENTORING_QA_OUTPUT ?? 'outputs/qa-elder-mentoring-v168');
  await mkdir(output, { recursive: true });
  const report = {
    commit, buildId, passed: false, errors: [],
    scope: 'R2-M049. Canonical adult career admission supplies 8000 honor, which the save parser normalizes to the Elder career rank. The mentoring proof begins absent; Chromium plays the terrain and verifies that the witnessed outcome survives reload.',
  };
  let browser;
  let page;
  try {
    const qa = homeworldSceneSsrV78();
    const save = adultElderTrialAdmission(qa);
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_EXECUTABLE || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      headless: true,
    });
    page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      storageState: {
        cookies: [],
        origins: [{ origin: origin.origin, localStorage: [{ name: SAVE_KEY, value: JSON.stringify(save) }] }],
      },
    });
    page.setDefaultTimeout(30_000);
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(origin.href, { waitUntil: 'domcontentloaded' });
    await openCampaignDossier(page);
    report.receipt = await completeElderMentoring(page);
    const scene = page.locator('[data-elder-mentoring]');
    await scene.screenshot({ path: join(output, 'witness.png') });
    await button(scene, 'Fermer le terrain du novice').click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await openCampaignDossier(page);
    const reloaded = await readCampaign(page);
    assert.equal(reloaded.createdAt, save.createdAt);
    assert.equal(reloaded.prologue, null);
    assert.equal(reloaded.profile.rankId, 'elder');
    assert.equal(reloaded.profile.honor, 8000);
    assert.deepEqual(reloaded.elderMentoringV168, report.receipt);
    await button(page, OPEN).click();
    await scene.getByText(RECORDED, { exact: true }).waitFor();
    await scene.getByText(RESULT, { exact: true }).waitFor();
    await scene.screenshot({ path: join(output, 'reloaded.png') });
    assert.deepEqual(report.errors, []);
    report.reloadVerified = true;
    report.passed = true;
  } catch (error) {
    report.failure = error.stack ?? String(error);
    if (page) await page.screenshot({ path: join(output, 'failure.png') }).catch(() => {});
    throw error;
  } finally {
    await browser?.close();
    await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await run();
