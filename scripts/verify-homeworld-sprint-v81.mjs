import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { homeworldSceneSsrV78 } from '../tests/helpers/homeworld-scene-ssr-v78.mjs';
import { qaContractV81, snapshotSourcesV81, requireVersionV81, hardErrorsV81, outputWithinQaV81 } from './public-qa-contract-v81.mjs';

// Actual compiled GameClient. The shared gate requires exact commit and real
// observed READY receipts before any public navigation or browser connection.
const base = process.env.V81_QA_BASE || process.env.V81_SPRINT_QA_BASE || 'http://localhost:4204';
const cdp = process.env.V81_SPRINT_CDP || 'http://127.0.0.1:58677';
const cdpUrl = new URL(cdp);
assert(cdpUrl.protocol === 'http:' && cdpUrl.hostname === '127.0.0.1', 'Only local isolated QA Chrome is allowed');
const output = path.resolve(process.env.V81_QA_OUTPUT || process.env.V81_SPRINT_QA_OUTPUT || 'work-local/v81/qa/sprint-local');
outputWithinQaV81(output);
const contract = qaContractV81(base, output);
fs.mkdirSync(output, { recursive: true });
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceFiles = ['app/game/HomeworldHub.tsx', 'app/game/HomeworldSprintV81.module.css', 'app/game/systems/homeworldCity.ts', 'app/game/systems/homeworldInput.ts', 'app/game/systems/controlBindings.ts', 'app/game/buildInfo.ts', 'scripts/verify-homeworld-sprint-v81.mjs', 'scripts/public-qa-contract-v81.mjs', 'app/game/save.ts'];
const sources = () => snapshotSourcesV81(sourceFiles, contract);
const report = { ...contract, base, sourceBefore: sources(), status: 'RUNNING', observations: [], captures: [], errors: [],
  fixture: 'Fresh isolated legacy defaultSave; ordinary title continuation and physical ship button open Homeworld. No actor position, React setter, clock or gameplay state injection.',
  limits: [contract.isPublic ? 'Publication identity is separately checked against the preserved exact commit and provider READY receipts.' : 'Local compiled gameplay evidence, not publication or exact deployed SHA verification.', 'Native V74 walking drawings are paced by real movement; this does not prove a new authored run animation.', 'Keyboard and native touch events exercised here; L3 context safety is also covered by the separate live RAF input tests.'] };
const persist = () => fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
const qa = homeworldSceneSsrV78();
const saveApi = qa.load('app/game/save.ts');
const browser = await chromium.connectOverCDP(cdp);
const contexts = [];
let currentPage;

async function start(label, mobile = false, remap = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, hasTouch: mobile, isMobile: mobile });
  contexts.push(context);
  const page = await context.newPage(); currentPage = page; page.setDefaultTimeout(90000);
  page.on('pageerror', error => report.errors.push({ label, kind: 'pageerror', text: error.message }));
  page.on('console', message => { if (message.type() === 'error') report.errors.push({ label, kind: 'console', text: message.text() }); });
  page.on('response', response => { if (response.status() >= 400) report.errors.push({ label, kind: 'http', url: response.url(), status: response.status() }); });
  page.on('requestfailed', request => report.errors.push({ label, kind: 'requestfailed', url: request.url(), error: request.failure()?.errorText }));
  const save = saveApi.defaultSave('2026-10-04T08:00:00.000Z'); save.settings.screenShake = false;
  if (remap) save.settings.controlBindings = { ...save.settings.controlBindings, 'hunt.aim': ['KeyT'] };
  await context.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), { key: saveApi.SAVE_STORAGE_KEY, save });
  await page.goto(base, { waitUntil: 'networkidle', timeout: 120000 });
  await page.getByRole('button', { name: /^Continuer/ }).click();
  await page.locator('.physical-ship-deck[data-suspended="false"]').waitFor();
  await requireVersionV81(page, report, label + ' actual GameClient after the unversioned campaign menu');
  await page.getByRole('button', { name: 'Yautja Prime · monde natal', exact: true }).click();
  await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor();
  await page.locator('[data-homeworld-hub] img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  await page.locator('[data-homeworld-viewport]').focus();
  await page.waitForTimeout(150);
  return { page, context };
}

async function sample(page) {
  return page.locator('[data-homeworld-viewport]').evaluate(viewport => {
    const actor = viewport.querySelector('[data-homeworld-actor]');
    const youth = actor.querySelector('[data-motion-version="74"]');
    return { x: Number(actor.dataset.x), y: Number(actor.dataset.y), moving: actor.dataset.moving === 'true', running: actor.dataset.homeworldRunningV81 === 'true', seconds: Number(viewport.dataset.citySeconds), gaitDistance: Number(actor.dataset.youthDistanceV74 || 0), nativePose: youth?.dataset.nativePose ?? null };
  });
}

async function capture(page, label) {
  const file = path.join(output, label + '.jpg');
  await page.screenshot({ path: file, type: 'jpeg', quality: 92, fullPage: true });
  const geometry = await page.locator('[data-homeworld-run-toggle-v81]').evaluate(button => {
    const rect = button.getBoundingClientRect();
    return { label: button.textContent, pressed: button.getAttribute('aria-pressed'), rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, viewport: { width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth } };
  });
  assert(geometry.rect.x >= 0 && geometry.rect.x + geometry.rect.width <= geometry.viewport.width, 'Course control stays within viewport');
  assert(geometry.viewport.documentWidth <= geometry.viewport.width, 'No horizontal page overflow');
  const contentVersion = await requireVersionV81(page, report, label + ' actual Homeworld capture');
  report.captures.push({ label, file, capturedAt: new Date().toISOString(), sha256: sha(fs.readFileSync(file)), geometry, data: { contentVersion } });
  persist();
}

async function movement(page, label, sprintKey = null) {
  if (sprintKey) await page.keyboard.down(sprintKey);
  await page.keyboard.down('ArrowDown');
  await page.waitForFunction(() => document.querySelector('[data-homeworld-actor]')?.dataset.moving === 'true');
  const before = await sample(page); await page.waitForTimeout(350); const after = await sample(page);
  await capture(page, label);
  await page.keyboard.up('ArrowDown'); if (sprintKey) await page.keyboard.up(sprintKey);
  await page.waitForFunction(() => document.querySelector('[data-homeworld-actor]')?.dataset.moving === 'false');
  const elapsed = after.seconds - before.seconds, travelled = after.y - before.y;
  assert(elapsed > .08 && travelled > 10, 'Real motion and city simulation clock advance');
  const speed = travelled / elapsed;
  report.observations.push({ label, before, after, speed, elapsed, travelled }); persist();
  return { speed, before, after };
}

try {
  const { page: walkPage } = await start('desktop-walk'); const walk = await movement(walkPage, 'desktop-walk');
  const { page: runPage } = await start('desktop-shift'); const run = await movement(runPage, 'desktop-shift-run', 'Shift');
  const ratio = run.speed / walk.speed; assert(ratio > 1.6 && ratio < 2.0, 'The rendered actor really runs approximately 1.8 times faster');
  assert.equal(run.after.running, true); assert.equal(walk.after.running, false);
  report.observations.push({ label: 'desktop-run-ratio', ratio, expected: 1.8 });
  await runPage.getByRole('button', { name: 'Pause', exact: true }).click();
  const paused = await sample(runPage); await runPage.keyboard.down('Shift'); await runPage.keyboard.down('ArrowDown'); await runPage.waitForTimeout(180);
  assert.deepEqual(await sample(runPage), paused, 'Pause freezes location and native motion clock even with held run');
  await runPage.keyboard.up('ArrowDown'); await runPage.keyboard.up('Shift'); await capture(runPage, 'desktop-pause-freezes-run');
  const { page: remappedPage } = await start('desktop-remap', false, true);
  const remapped = await movement(remappedPage, 'desktop-remapped-run', 't');
  assert(remapped.speed / walk.speed > 1.6 && remapped.speed / walk.speed < 2.0, 'Saved remap reaches the actual motor');

  const { page: mobilePage, context: mobileContext } = await start('mobile-touch', true);
  const course = mobilePage.locator('[data-homeworld-run-toggle-v81]');
  await course.tap(); assert.equal(await course.getAttribute('aria-pressed'), 'true');
  const still = await sample(mobilePage); await mobilePage.waitForTimeout(150);
  assert.equal((await sample(mobilePage)).y, still.y, 'Course toggled without direction does not move');
  const down = mobilePage.getByRole('button', { name: 'Marcher vers l’avant', exact: true }); const box = await down.boundingBox(); assert(box);
  const touch = await mobileContext.newCDPSession(mobilePage);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: box.x + box.width / 2, y: box.y + box.height / 2, radiusX: 2, radiusY: 2, force: 1 }] });
  await mobilePage.waitForFunction(() => document.querySelector('[data-homeworld-actor]')?.dataset.moving === 'true');
  const touchBefore = await sample(mobilePage); await mobilePage.waitForTimeout(350); const touchAfter = await sample(mobilePage);
  await capture(mobilePage, 'mobile-touch-run');
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await mobilePage.waitForFunction(() => document.querySelector('[data-homeworld-actor]')?.dataset.moving === 'false');
  const touchSpeed = (touchAfter.y - touchBefore.y) / (touchAfter.seconds - touchBefore.seconds);
  assert(touchSpeed / walk.speed > 1.6 && touchSpeed / walk.speed < 2.0); assert.equal(touchAfter.running, true);
  await course.tap(); assert.equal(await course.getAttribute('aria-pressed'), 'false');
  await capture(mobilePage, 'mobile-course-disabled');
  report.observations.push({ label: 'native-mobile-touch-run', before: touchBefore, after: touchAfter, speed: touchSpeed, ratio: touchSpeed / walk.speed });
  for (const context of contexts) {
    const page = context.pages()[0];
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), saveApi.SAVE_STORAGE_KEY);
    assert.equal(Object.hasOwn(saved.homeworld.locationV77 || {}, 'sprinting'), false, 'Transient movement mode is not persisted into checkpoint schema');
    assert.equal(saved.createdAt, '2026-10-04T08:00:00.000Z');
  }
  report.sourceAfter = sources();
  assert.deepEqual(report.sourceAfter, report.sourceBefore, 'The candidate sources stayed unchanged during browser QA');
  report.hardErrors = hardErrorsV81(report.errors);
  assert.equal(report.hardErrors.length, 0, 'No browser error, failed asset or HTTP failure is ignored');
  report.status = contract.isPublic ? 'PASS_PUBLIC_COMPILED' : 'PASS_LOCAL_COMPILED';
} catch (error) {
  report.status = 'FAIL'; report.failure = error.stack || String(error);
  if (currentPage && !currentPage.isClosed()) await currentPage.screenshot({ path: path.join(output, 'failure.jpg'), type: 'jpeg', quality: 90 }).catch(() => {});
  console.error(error);
} finally {
  report.sourceAfter ||= sources(); report.hardErrors ||= hardErrorsV81(report.errors);
  report.completedAt = new Date().toISOString(); persist();
  await Promise.all(contexts.map(context => context.close())); await browser.close();
}
console.log(JSON.stringify({ status: report.status, output, screenshots: report.captures.length, observations: report.observations.length, errors: report.errors.length }));
if (!report.status.startsWith('PASS_')) process.exitCode = 1;
