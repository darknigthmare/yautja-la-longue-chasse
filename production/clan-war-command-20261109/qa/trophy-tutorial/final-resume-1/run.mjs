/** Current-build smoke, resuming the actual partial checkpoint earned by the
 * previous full journey. No new eighteen-gesture run or synthesized result. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const base = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(base, '../../../../..');
const url = 'http://127.0.0.1:3153', expectedBuildId = 'nItYejsE7HSH4L0ykJM5K';
const sha = data => createHash('sha256').update(data).digest('hex');
await fs.writeFile(path.join(base, 'run.lock'), new Date().toISOString() + '\n', { flag: 'wx' });
const previous = path.resolve(base, '../native-attempt-2');
const previousReceipt = JSON.parse(await fs.readFile(path.join(previous, 'final-receipt.json'), 'utf8'));
const inputPath = path.join(previous, '07-face-before-reload.json'), inputBytes = await fs.readFile(inputPath), input = JSON.parse(inputBytes);
const originalPin = previousReceipt.files.find(row => row.path === path.relative(root, inputPath));
assert.ok(originalPin); assert.equal(sha(inputBytes), originalPin.sha256);
assert.equal(input.save.trophyTutorialV6.completedSteps, 8); assert.equal(input.save.trophyTutorialV6.revision, 9);
assert.deepEqual(input.save.trophyTutorialV6.events.at(-1).values, { view: 'face' });
const targetSources = ['app/game/TrophyTutorialBay.tsx', 'app/game/TrophyTutorialBay.module.css', 'app/game/systems/trophyTutorialV6.ts',
  'app/game/GameClient.tsx', 'app/game/save.ts', 'app/game/types.ts'];
const snapshot = () => Promise.all(targetSources.map(async name => ({ path: name, sha256: sha(await fs.readFile(path.join(root, name))) })));
const build = async () => ({ buildId: (await fs.readFile(path.join(root, '.next/BUILD_ID'), 'utf8')).trim(), manifestSha256: sha(await fs.readFile(path.join(root, '.next/build-manifest.json'))) });
const sourceBefore = await snapshot();
for (const row of sourceBefore.slice(0, 3)) assert.equal(row.sha256, previousReceipt.files.find(pin => pin.path === row.path).sha256);
const oldClient = execFileSync('git', ['show', `${previousReceipt.sourceCommit}:app/game/GameClient.tsx`], { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024 });
const currentClient = await fs.readFile(path.join(root, 'app/game/GameClient.tsx'), 'utf8');
const checkpointBody = text => {
  const start = text.indexOf('  const commitTrophyTutorialCheckpoint = useCallback('), end = text.indexOf('  const commitCompanionResidence = useCallback(', start);
  assert.ok(start >= 0 && end > start); return text.slice(start, end);
};
assert.equal(checkpointBody(currentClient), checkpointBody(oldClient));
const report = { schemaVersion: 1, startedAt: new Date().toISOString(), scope: 'Current-build complementary smoke from genuinely earned partial face checkpoint. Full18-gesture journey remains dated on former build; no fresh nursery/rite or full campaign qualification.',
  input: { path: path.relative(root, inputPath), bytes: inputBytes.length, sha256: sha(inputBytes), sourceBuildId: previousReceipt.buildId },
  sourceBefore, buildBefore: await build(), unchangedLessonFilesComparedToFullJourney: 3,
  checkpointCallbackSha256: sha(checkpointBody(currentClient)), checkpointCallbackIdenticalToPrevious: true,
  broaderGameClientChanged: sha(currentClient) !== sha(oldClient), approvedNonLessonChanges: ['MOB autosave-skip handling', 'Operations chat presence', 'Incident focus'],
  checks: [], screenshots: [], documents: [], servedScripts: [], errors: [], consoleErrors: [], requestFailures: [], httpErrors: [],
  currentNurseryOrYoungBloodRiteQualified: false, physicalControllerTested: false, humanArtApproved: false };
assert.equal(report.buildBefore.buildId, expectedBuildId);
const checks = (name, condition, detail) => { report.checks.push({ name, passed: Boolean(condition), ...(detail === undefined ? {} : { detail }) }); assert.ok(condition, name); console.log('PASS', name); };
let browser, page; const pendingScripts = [];
async function stored() { return page.evaluate(() => JSON.parse(localStorage.getItem('yautja-long-hunt.save'))); }
async function capture(filename) { const data = await page.screenshot({ path: path.join(base, filename), fullPage: true }); report.screenshots.push({ filename, bytes: data.length, sha256: sha(data) }); }
async function saveSnapshot(filename) { const data = await stored(); await fs.writeFile(path.join(base, filename), JSON.stringify(data, null, 2) + '\n'); return data; }
async function enter() {
  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 }); assert.ok(response && response.status() === 200);
  const html = await response.text(); report.documents.push({ buildId: expectedBuildId, found: html.includes(expectedBuildId), sha256: sha(html) }); assert.ok(html.includes(expectedBuildId));
  if (await page.locator('[data-menu-section="campaign"]').isVisible()) await page.locator('[data-menu-section="campaign"]').click();
  await page.locator('[data-menu-action="continue"]').click();
  await page.locator('[data-homeworld-hub][data-homeworld-interior-id="trophy-mausoleum"][data-homeworld-motion-ready="true"]').waitFor({ timeout: 120000 });
  await page.bringToFront(); await page.locator('[data-homeworld-viewport]').focus(); await page.keyboard.press('KeyE');
  await page.getByRole('button', { name: 'Accéder au service', exact: true }).click();
  await page.locator('[data-trophy-tutorial-open]').click();
  await page.locator('[data-trophy-tutorial-v6]').waitFor(); await page.bringToFront();
}
try {
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
  // Restore all exact stored families from the actual earned checkpoint once,
  // before the real menu. Subsequent Continue/reload use native persistence.
  await context.addInitScript(storage => { if (localStorage.getItem('yautja-long-hunt.save') === null) for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value); }, input.storage);
  page = await context.newPage(); page.setDefaultTimeout(35000);
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
  page.on('requestfailed', request => report.requestFailures.push({ url: request.url(), error: request.failure() }));
  page.on('response', response => {
    const pathname = new URL(response.url()).pathname;
    if (response.status() >= 400) report.httpErrors.push({ pathname, status: response.status() });
    if (response.request().resourceType() === 'script' && pathname.startsWith('/_next/static/')) pendingScripts.push((async () => {
      const bytes = await response.body(), file = '.next/' + pathname.slice('/_next/'.length), compiled = await fs.readFile(path.join(root, file));
      report.servedScripts.push({ path: file, bytes: bytes.length, sha256: sha(bytes), compiledSha256: sha(compiled), matched: sha(bytes) === sha(compiled) });
    })().catch(error => report.errors.push(error.message)));
  });
  await enter();
  const first = await saveSnapshot('01-resumed-face-save.json');
  checks('Actual current GameClient resumes the exact earned partial face checkpoint via the physical service', JSON.stringify(first.trophyTutorialV6) === JSON.stringify(input.save.trophyTutorialV6));
  checks('Face-only re-entry names the correct remaining observations', (await page.locator('[data-trophy-tutorial-notice]').innerText()).includes('Reprenons le profil puis le revers'));
  await capture('01-resumed-face.png');
  const panel = page.locator('[data-trophy-tutorial-manipulation="9"]');
  await panel.waitFor();
  await panel.getByRole('button', { name: 'Profil', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-trophy-tutorial-v6]')?.getAttribute('data-trophy-tutorial-revision') === '10');
  await panel.getByRole('button', { name: 'Revers', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-trophy-tutorial-v6]')?.getAttribute('data-trophy-tutorial-revision') === '11');
  await page.locator('[data-trophy-tutorial-confirm]').click();
  await page.waitForFunction(() => document.querySelector('[data-trophy-tutorial-v6]')?.getAttribute('data-trophy-tutorial-step') === '9');
  const confirmed = await saveSnapshot('02-confirmed-view-gesture-save.json');
  checks('One remaining whole gesture commits its two views and result through the current campaign writer', confirmed.trophyTutorialV6.completedSteps === 9 && confirmed.trophyTutorialV6.revision === 12 && confirmed.trophyTutorialV6.events.length === 12);
  checks('Previously earned object and journal prefix are retained exactly', confirmed.trophyTutorialV6.objectId === input.save.trophyTutorialV6.objectId && JSON.stringify(confirmed.trophyTutorialV6.events.slice(0, 9)) === JSON.stringify(input.save.trophyTutorialV6.events));
  await capture('02-gesture9-confirmed.png');
  await enter();
  const reloaded = await saveSnapshot('03-reloaded-confirmed-save.json');
  checks('Real reload restores the exact newly confirmed object, pose and journal without repeating gesture9', JSON.stringify(reloaded.trophyTutorialV6) === JSON.stringify(confirmed.trophyTutorialV6));
  checks('Profile, real trophies and mission progress are unchanged', JSON.stringify(reloaded.profile) === JSON.stringify(first.profile) && JSON.stringify(reloaded.trophies) === JSON.stringify(first.trophies) && JSON.stringify(reloaded.missionProgress) === JSON.stringify(first.missionProgress));
  await capture('03-reloaded-gesture10.png');
  await page.getByRole('button', { name: 'Revenir au poste', exact: true }).click();
  await page.locator('[data-trophy-tutorial-open]').waitFor();
  await page.locator('[aria-labelledby="trophies-title"] .back-button').click();
  await page.locator('[data-homeworld-hub][data-homeworld-interior-id="trophy-mausoleum"]').waitFor();
  checks('Closing returns to the actual physical Mausoleum service on the current build', true);
  await capture('04-physical-post-return.png');
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = error.stack ?? String(error);
  if (page) { await capture('failure.png').catch(() => undefined); await saveSnapshot('failure-save.json').catch(() => undefined); }
} finally {
  await Promise.allSettled(pendingScripts);
  report.sourceAfter = await snapshot(); report.buildAfter = await build();
  report.sourceBeforeAfterEqual = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  report.buildBeforeAfterEqual = JSON.stringify(report.buildBefore) === JSON.stringify(report.buildAfter);
  report.passed = report.passed === true && report.sourceBeforeAfterEqual && report.buildBeforeAfterEqual && !report.errors.length && !report.consoleErrors.length && !report.httpErrors.length && !report.requestFailures.length && report.servedScripts.length > 0 && report.servedScripts.every(row => row.matched);
  report.checksPassed = report.checks.filter(row => row.passed).length; report.checksFailed = report.checks.filter(row => !row.passed).length;
  report.finishedAt = new Date().toISOString(); report.browserVersion = browser?.version();
  await fs.writeFile(path.join(base, 'report.browser-run.json'), JSON.stringify(report, null, 2) + '\n');
  await fs.copyFile(fileURLToPath(import.meta.url), path.join(base, 'recipe-used.mjs'));
  await browser?.close();
}
console.log(JSON.stringify({ passed: report.passed, checksPassed: report.checksPassed, checksFailed: report.checksFailed, base, failure: report.failure })); if (!report.passed) process.exitCode = 1;
