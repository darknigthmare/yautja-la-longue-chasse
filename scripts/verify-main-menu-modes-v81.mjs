import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { homeworldSceneSsrV78 } from '../tests/helpers/homeworld-scene-ssr-v78.mjs';
import { hashV81 as hash, hardErrorsV81, outputWithinQaV81, qaContractV81, requireVersionV81, snapshotSourcesV81 } from './public-qa-contract-v81.mjs';

// The public contract must pass before connecting Chrome or navigating HTTPS.
// Local and published runs retain distinct output and commit/READY authority.
const base = process.env.V81_QA_BASE || process.env.V81_MODES_QA_BASE || 'http://localhost:4204';
const cdp = process.env.V81_MODES_CDP || 'http://127.0.0.1:58677';
const cdpUrl = new URL(cdp);
assert(cdpUrl.protocol === 'http:' && cdpUrl.hostname === '127.0.0.1', 'Local QA CDP only');
const output = path.resolve(process.env.V81_QA_OUTPUT || process.env.V81_MODES_QA_OUTPUT || 'work-local/v81/qa/main-menu-modes-local');
outputWithinQaV81(output);
const contract = qaContractV81(base, output);
const files = ['app/game/CampaignFrontEnd.tsx', 'app/game/CampaignMainMenu.tsx', 'app/game/CampaignMainMenu.module.css',
  'app/game/GameClient.tsx', 'app/game/MainMenuBonusModesV81.tsx', 'app/game/MainMenuBonusModesV81.module.css',
  'app/game/PitExperienceV79.tsx', 'app/game/systems/mainMenuModesV81.ts', 'app/game/GameReserveEntryV66.tsx', 'app/game/buildInfo.ts',
  'app/game/save.ts', 'app/game/systems/clanChronicle.ts', 'app/game/systems/progression.ts',
  'tests/helpers/homeworld-scene-ssr-v78.mjs', 'scripts/public-qa-contract-v81.mjs', 'scripts/verify-main-menu-modes-v81.mjs'];
const sources = () => snapshotSourcesV81(files, contract);
// Commit-bound text comparison (with distinct raw disk/Git hashes) also
// completes before a public browser connection. It is never a local-only SHA.
const sourceBefore = sources();
fs.mkdirSync(output, { recursive: true });
const report = { ...contract, version: 'V81', base, status: 'RUNNING', sourceBefore, checks: [], captures: [], contexts: [], errors: [],
  isolation: { ...contract.isolation, cdpEndpoint: cdp },
  fixture: 'Fresh empty title profiles, plus isolated legacy defaultSave fixtures for already-unlocked adult access. No mission receipts, actor position, gameplay phase, fake clock or React state is injected.',
  limits: [contract.isPublic ? 'The exact published SHA/READY/provider receipts are preserved by the public preflight; this recipe does not certify the whole published game.' : 'Local compiled integration is separate from publication and exact deployed commit verification.', 'Screenshots require human pixel review after this recipe. This does not certify whole-game quality or lore 1:1.', 'This recipe exercises keyboard, focus cancellation, actual reserve movement, a local free chronicle checkpoint and ordinary unlocked-mode entry; it does not claim a completed combat or a campaign rite.'],
  errorPolicy: 'All raw errors are retained. Only the contract-documented aborted navigation of the root game document may be excluded from hard errors; no missing asset, console error or gameplay request is excluded.' };
const persist = () => fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
const check = (name, detail = {}) => { report.checks.push({ name, detail, at: new Date().toISOString() }); persist(); console.log('PASS ' + name); };
const qa = homeworldSceneSsrV78(), S = qa.load('app/game/save.ts'), M = qa.load('app/game/systems/mainMenuModesV81.ts');
let browser;
const contexts = [];
let activePage;
async function start(label, mobile = false, legacy = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
  contexts.push(context); const page = await context.newPage(); activePage = page; page.setDefaultTimeout(90000);
  const entry = { label, errors: [] }; report.contexts.push(entry);
  page.on('pageerror', error => entry.errors.push({ kind: 'pageerror', text: error.message }));
  page.on('console', message => { if (message.type() === 'error') entry.errors.push({ kind: 'console', text: message.text() }); });
  page.on('requestfailed', request => entry.errors.push({ kind: 'requestfailed', url: request.url(), error: request.failure()?.errorText }));
  page.on('response', response => { if (response.status() >= 400) entry.errors.push({ kind: 'http', url: response.url(), status: response.status() }); });
  if (legacy) {
    const save = S.defaultSave('2026-10-04T08:30:00.000Z'); save.settings.screenShake = false;
    await context.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), { key: S.SAVE_STORAGE_KEY, save });
  }
  await page.goto(base, { waitUntil: 'networkidle', timeout: 120000 });
  await titleReady(page); return { context, page };
}
async function titleReady(page) {
  await page.locator('[data-campaign-menu="main"][aria-busy="false"]').waitFor();
  await requireVersionV81(page, report, 'actual principal menu');
  await page.waitForLoadState('networkidle');
}
async function snapshot(page) {
  return page.evaluate(prefix => Object.fromEntries(Object.keys(localStorage).filter(key => !key.startsWith(prefix)).sort().map(key => [key, localStorage.getItem(key)])), M.MAIN_MENU_BONUS_PREFIX_V81);
}
async function capture(page, label) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.querySelectorAll('img')].filter(image => image.getClientRects().length > 0).map(image => image.decode())); });
  const contentVersion = await requireVersionV81(page, report, label);
  const geometry = await page.evaluate(() => ({ viewport: [innerWidth, innerHeight], documentWidth: document.documentElement.scrollWidth,
    body: document.body.innerText, focus: document.activeElement?.textContent?.trim(),
    dialog: (() => { const element = document.querySelector('[data-main-menu-spoiler]'); if (!element) return null; const box = element.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height }; })() }));
  assert(geometry.documentWidth <= geometry.viewport[0], 'No horizontal page overflow');
  if (geometry.dialog) assert(geometry.dialog.x >= 0 && geometry.dialog.y >= 0 && geometry.dialog.x + geometry.dialog.width <= geometry.viewport[0] && geometry.dialog.y + geometry.dialog.height <= geometry.viewport[1], 'Spoiler dialog fits the viewport');
  const file = path.join(output, `${String(report.captures.length + 1).padStart(2, '0')}-${label}.png`);
  await page.screenshot({ path: file, fullPage: true });
  report.captures.push({ label, file, sha256: hash(fs.readFileSync(file)), geometry, detail: { contentVersion }, capturedAt: new Date().toISOString() }); persist();
}
async function openBonus(page, mode, prefix) {
  await page.locator(`[data-main-menu-mode="${mode}"]`).click();
  await page.locator(`[data-main-menu-spoiler="${mode}"]`).waitFor();
  assert.equal(await page.locator('[data-spoiler-cancel]').evaluate(element => document.activeElement === element), true, 'Spoiler warning initially focuses cancel');
  await capture(page, prefix + '-' + mode + '-spoiler');
  await page.keyboard.press('Tab'); assert.equal(await page.locator('[data-spoiler-confirm]').evaluate(element => document.activeElement === element), true);
  await page.keyboard.press('Tab'); assert.equal(await page.locator('[data-spoiler-cancel]').evaluate(element => document.activeElement === element), true);
  await page.keyboard.press('Shift+Tab'); assert.equal(await page.locator('[data-spoiler-confirm]').evaluate(element => document.activeElement === element), true);
  await page.keyboard.press('Escape'); assert.equal(await page.locator('[data-main-menu-spoiler]').count(), 0);
  assert.equal(await page.locator(`[data-main-menu-mode="${mode}"]`).evaluate(element => document.activeElement === element), true, 'Cancel returns to originating game-mode button');
  await page.locator(`[data-main-menu-mode="${mode}"]`).click(); await page.locator('[data-spoiler-confirm]').click();
  await page.locator(`[data-main-menu-bonus-entry="${mode}"]`).waitFor();
  await page.locator('[data-bonus-start]:not(:disabled)').waitFor(); await capture(page, prefix + '-' + mode + '-free-briefing');
  assert.equal(await page.locator('[data-campaign-session]').count(), 0, 'Early access never mounts a campaign session');
}
async function chronicleReady(page) {
  await page.waitForFunction(() => document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus === 'ready');
  await page.waitForFunction(() => {
    const portraits = [...document.querySelectorAll('[data-native-chronicle-portrait]')];
    return portraits.length > 0 && portraits.every(element => {
    if (element instanceof HTMLImageElement) return element.complete && element.naturalWidth > 0;
    const canvas = element.querySelector('canvas[data-pit-extension-portrait="authored-idle-pose"]');
    if (!canvas || canvas.getBoundingClientRect().width <= 0 || getComputedStyle(canvas).visibility === 'hidden') return false;
    const context = canvas.getContext('2d');
    if (!context) return false;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let alpha = 3; alpha < pixels.length; alpha += 4) if (pixels[alpha] > 0) return true;
    return false;
    });
  });
}
try {
  browser = await chromium.connectOverCDP(cdp);
  for (const mobile of [false, true]) {
    const prefix = mobile ? 'mobile' : 'desktop', { page } = await start(prefix + '-free', mobile);
    const before = await snapshot(page); await capture(page, prefix + '-title-two-modes');
    assert.equal(await page.locator('[data-main-menu-mode]').count(), 2);
    await openBonus(page, 'the-pit', prefix); await page.locator('[data-bonus-start]').click();
    await page.locator('[data-pit-selection-screen="immersive"]').waitFor(); await capture(page, prefix + '-free-pit-roster');
    await page.locator('[data-pit-character-chronicle-open]').click(); await chronicleReady(page);
    await page.getByRole('button', { name: 'Commencer la chronique', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[data-pit-character-chronicles]')?.dataset.chroniclePhase === 'intro');
    await chronicleReady(page); await capture(page, prefix + '-free-pit-chronicle-intro');
    assert.deepEqual(await snapshot(page), before, 'Chronicle checkpoint cannot touch story, slots, sidecars or account');
    const freeKeys = await page.evaluate(prefix => Object.keys(localStorage).filter(key => key.startsWith(prefix)), M.MAIN_MENU_BONUS_PREFIX_V81);
    assert(freeKeys.some(key => key.includes('chronicle')), 'A real free chronicle checkpoint was stored in its separate namespace');
    await page.getByRole('button', { name: 'Retour au roster', exact: true }).click();
    await page.waitForLoadState('networkidle'); await page.getByRole('button', { name: 'Retour au menu principal', exact: true }).click(); await titleReady(page);
    assert.deepEqual(await snapshot(page), before);
    await openBonus(page, 'game-reserve', prefix); await page.locator('[data-bonus-start]').click();
    await page.locator('[data-game-reserve-v66]').waitFor();
    await page.getByRole('button', { name: 'Commencer l’expédition', exact: true }).waitFor({ state: 'visible' });
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Commencer l’expédition' && !button.disabled));
    await capture(page, prefix + '-free-reserve-ready'); await page.getByRole('button', { name: 'Commencer l’expédition', exact: true }).click();
    await page.locator('[data-game-reserve-v66] canvas').focus(); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(400); await page.keyboard.up('ArrowRight');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    const played = await page.evaluate(prefix => JSON.parse(localStorage.getItem(prefix + 'reserve')), M.MAIN_MENU_BONUS_PREFIX_V81);
    assert(played.state.tick > 0 && played.state.player.x > 130, 'Real directional controls advance and persist the free reserve actor');
    await capture(page, prefix + '-free-reserve-played-pause');
    await page.getByRole('button', { name: 'Sauvegarder et revenir au dossier', exact: true }).click();
    await page.locator('[data-main-menu-bonus-entry="game-reserve"]').waitFor();
    await page.getByRole('button', { name: 'Retour au menu principal', exact: true }).click(); await titleReady(page);
    assert.deepEqual(await snapshot(page), before);
    check(prefix + ' spoiler cancellation/focus trap, isolated Pit chronicle, real Reserve movement and safe title returns', { freeKeys, reserveTick: played.state.tick, reserveX: played.state.player.x });
  }
  for (const mode of ['the-pit', 'game-reserve']) {
    const { page } = await start('legacy-unlocked-' + mode, false, true);
    const before = JSON.parse((await snapshot(page))[S.SAVE_STORAGE_KEY]);
    assert.equal(await page.locator(`[data-main-menu-mode="${mode}"]`).getAttribute('data-story-unlocked'), 'true');
    await page.locator(`[data-main-menu-mode="${mode}"]`).click(); await page.locator('[data-campaign-session]').waitFor();
    assert.equal(await page.locator('[data-main-menu-spoiler]').count(), 0);
    assert.equal(await page.locator('[data-bonus-campaign-independent]').count(), 0);
    if (mode === 'the-pit') {
      await page.locator('[data-pit-selection-screen="immersive"]').waitFor(); await capture(page, 'legacy-pit-normal-roster');
      await page.getByRole('button', { name: 'Retour au menu principal', exact: true }).click();
    } else {
      await page.locator('[data-game-reserve-campaign] [data-game-reserve-v66]').waitFor();
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Commencer l’expédition' && !button.disabled));
      await capture(page, 'legacy-reserve-normal-ready');
      await page.getByRole('button', { name: 'Sauvegarder et revenir au dossier', exact: true }).click();
    }
    await titleReady(page); const after = JSON.parse((await snapshot(page))[S.SAVE_STORAGE_KEY]);
    for (const field of ['createdAt', 'profile', 'inventory', 'missionProgress', 'prologue']) assert.deepEqual(after[field], before[field], 'Shortcut does not award story gains: ' + field);
    assert.equal(await page.evaluate(prefix => Object.keys(localStorage).some(key => key.startsWith(prefix)), M.MAIN_MENU_BONUS_PREFIX_V81), false, 'Unlocked mode uses its ordinary owner, not the free profile');
    check(mode + ' existing adult campaign enters normally and safely returns to title');
  }
  report.hardErrors = hardErrorsV81(report.contexts.flatMap(context => context.errors));
  assert.deepEqual(report.hardErrors, []); assert.deepEqual(sources(), report.sourceBefore);
  report.status = contract.isPublic ? 'PASS_PUBLIC_MAIN_MENU_MODES_V81_PENDING_PIXEL_REVIEW' : 'PASS_LOCAL_MAIN_MENU_MODES_V81_PENDING_PIXEL_REVIEW';
} catch (error) {
  report.status = 'FAIL'; report.errors.push({ text: error.stack, at: new Date().toISOString() }); console.error(error);
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
} finally {
  report.sourceAfter = sources(); report.completedAt = new Date().toISOString(); persist();
  for (const context of contexts) await context.close().catch(() => {});
  console.log(JSON.stringify({ status: report.status, captures: report.captures.length, checks: report.checks.length, output }));
  process.exit(report.status === 'FAIL' ? 1 : 0);
}
