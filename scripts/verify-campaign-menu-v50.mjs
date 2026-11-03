import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.V50_QA_URL || 'http://127.0.0.1:4174';
const out = process.env.V50_MENU_QA_OUTPUT || 'outputs/qa-commercial-audit/v50/campaign-menu-browser-qa';
await fs.mkdir(out, { recursive: true });
const checks = [], errors = [], failures = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let page;
function watch(target) {
  target.setDefaultTimeout(45000);
  target.on('pageerror', error => errors.push(error.message));
  target.on('response', response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
}
async function open(options = {}) {
  page = await browser.newPage({ viewport: { width: 1280, height: 720 }, ...options });
  watch(page);
  await page.goto(base, { waitUntil: 'networkidle', timeout: 120000 });
  await page.locator('[data-campaign-menu="main"]').waitFor();
  await page.locator('[data-campaign-scenery]').evaluate(image => image.decode());
  return page;
}
async function frame(target) {
  const measured = await target.evaluate(() => {
    const root = document.querySelector('[data-campaign-menu]'), bounds = root.getBoundingClientRect();
    return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, viewportWidth: innerWidth, viewportHeight: innerHeight, documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight, contentWidth: root.scrollWidth, contentHeight: root.scrollHeight };
  });
  assert(Math.abs(measured.x) < 1 && Math.abs(measured.y) < 1);
  assert(Math.abs(measured.width - measured.viewportWidth) < 1 && Math.abs(measured.height - measured.viewportHeight) < 1);
  assert(measured.documentWidth <= measured.viewportWidth && measured.contentWidth <= measured.viewportWidth, `Menu must not scroll horizontally: ${JSON.stringify(measured)}`);
  assert(measured.documentHeight <= measured.viewportHeight + 1, 'Archive scrolling stays inside the game screen');
  return measured;
}
async function create(target, id, name) {
  await target.getByRole('button', { name: /^Nouvelle partie/ }).click();
  await target.locator(`[data-campaign-slot="${id}"]`).click();
  await target.getByLabel('Nom du chasseur', { exact: true }).fill(name);
  await target.getByRole('button', { name: /^Créer la partie/ }).click();
  await target.locator('[data-nursery-prologue]').waitFor();
  assert.equal(await target.locator('[data-campaign-session]').getAttribute('data-campaign-session'), String(id));
}
async function main(target) {
  await target.getByRole('button', { name: 'Pause et commandes', exact: true }).click();
  await target.getByRole('button', { name: 'Enregistrer et revenir au menu', exact: true }).click();
  await target.locator('[data-campaign-menu="main"]').waitFor();
}
const slotBytes = (target, id) => target.evaluate(id => localStorage.getItem(`yautja-long-hunt.campaign-slot.${id}`), id);
try {
  await open();
  assert(await page.getByRole('button', { name: /^Continuer/ }).isDisabled());
  assert(await page.getByRole('button', { name: /^Charger une partie/ }).isDisabled());
  assert(await page.getByRole('button', { name: /^Nouvelle partie/ }).evaluate(button => document.activeElement === button));
  const desktopFrame = await frame(page);
  assert(desktopFrame.contentHeight <= desktopFrame.height + 1, 'Desktop landing choices fit without scrolling');
  await page.screenshot({ path: path.join(out, 'main-desktop-1280.png') });
  checks.push({ name: 'immersive-desktop-main-menu', frame: desktopFrame, realVillagePng: true, newGameFocused: true });

  await page.keyboard.press('Enter');
  await page.locator('[data-campaign-menu="new"]').waitFor();
  assert.equal(await page.locator('[data-campaign-slot]').count(), 5);
  await page.locator('[data-campaign-slot="5"]').click();
  await page.getByLabel('Nom du chasseur', { exact: true }).fill('QA V50 Cinq');
  await page.locator('figure img').evaluate(image => image.decode());
  await page.screenshot({ path: path.join(out, 'new-campaign-desktop.png') });
  await page.getByLabel('Nom du chasseur', { exact: true }).press('Enter');
  await page.locator('[data-nursery-prologue]').waitFor();
  assert.equal(await page.locator('[data-campaign-session]').getAttribute('data-campaign-session'), '5');
  const ownerFive = await page.locator('[data-campaign-owner]').getAttribute('data-campaign-owner');
  assert.equal(await page.locator('.physical-deck-screen').count(), 0);
  checks.push({ name: 'keyboard-form-creates-slot-five-in-nursery', fiveSlots: true, actualPrologue: true, noPersonalShip: true });

  await main(page);
  assert.match(await page.locator('aside').innerText(), /Nurserie/);
  const preservedFive = await slotBytes(page, 5);
  await create(page, 1, 'QA V50 Un');
  assert.notEqual(await page.locator('[data-campaign-owner]').getAttribute('data-campaign-owner'), ownerFive);
  assert.equal(await slotBytes(page, 5), preservedFive);
  await main(page);
  checks.push({ name: 'independent-campaign-owner-and-accurate-resume-summary', otherSlotBytesPreserved: true, distinctOwners: true });

  await page.getByRole('button', { name: /^Charger une partie/ }).click();
  await page.locator('[data-campaign-slot="5"]').click();
  assert.equal(await page.locator('[data-checkpoint-id]').count(), 12);
  assert.equal(await page.locator('[data-checkpoint-id^="manual-"]').count(), 10);
  assert.equal(await page.locator('[data-checkpoint-id^="auto-"]').count(), 2);
  const checkpoint = page.locator('[data-checkpoint-id]:not(:disabled)').first();
  await checkpoint.click();
  const dialog = page.getByRole('dialog', { name: 'Charger ce checkpoint ?' });
  await dialog.waitFor();
  const actions = dialog.getByRole('button');
  await actions.last().focus(); await page.keyboard.press('Tab');
  assert(await actions.first().evaluate(button => document.activeElement === button));
  await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
  assert(await checkpoint.evaluate(button => document.activeElement === button));
  await page.screenshot({ path: path.join(out, 'load-checkpoints-desktop.png') });
  await checkpoint.click();
  await page.getByRole('button', { name: 'Confirmer le chargement', exact: true }).click();
  await page.locator('[data-nursery-prologue]').waitFor();
  assert.equal(await page.locator('[data-campaign-owner]').getAttribute('data-campaign-owner'), ownerFive);
  checks.push({ name: 'twelve-checkpoints-dialog-and-real-load', manual: 10, auto: 2, focusTrap: true, cancelRestoresFocus: true, correctOwnerResumed: true });
  await page.close();

  await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const portrait = await frame(page);
  await page.screenshot({ path: path.join(out, 'main-touch-390.png') });
  await page.getByRole('button', { name: /^Nouvelle partie/ }).tap();
  await page.locator('[data-campaign-slot="5"]').tap();
  const input = page.getByLabel('Nom du chasseur', { exact: true });
  await input.fill('QA tactile');
  const start = page.getByRole('button', { name: /^Créer la partie 5/ });
  await start.scrollIntoViewIfNeeded();
  assert((await start.boundingBox()).height >= 44);
  assert(await start.evaluate(button => { const r = button.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('button') === button; }));
  await frame(page);
  await page.screenshot({ path: path.join(out, 'new-campaign-touch-390.png') });
  checks.push({ name: 'touch-390-slot-five-form', portrait, reachableStart: true, minimum44px: true, noHorizontalOverflow: true });
  await page.setViewportSize({ width: 640, height: 280 });
  await start.scrollIntoViewIfNeeded();
  const landscape = await frame(page);
  assert(await start.isVisible());
  await page.screenshot({ path: path.join(out, 'new-campaign-landscape-640.png') });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addStyleTag({ content: '[data-campaign-menu] button,[data-campaign-menu] input,[data-campaign-menu] p,[data-campaign-menu] label{font-size:200% !important}' });
  await start.scrollIntoViewIfNeeded();
  const enlarged = await frame(page);
  assert(await start.isVisible());
  assert(await start.evaluate(button => { const r = button.getBoundingClientRect(); return r.y >= 0 && r.bottom <= innerHeight && document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('button') === button; }));
  // Resize + nested scrolling can leave a stale paint tile for one frame in mobile emulation.
  // Observe the completed layout/declared button transition before capturing; do not force focus or repaint.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await start.evaluate(button => Promise.all(button.getAnimations().map(animation => animation.finished.catch(() => {}))));
  await page.screenshot({ path: path.join(out, 'new-campaign-text-200.png') });
  checks.push({ name: 'short-landscape-and-large-text', landscape, enlarged, createStillReachable: true });
  await page.close();

  page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); watch(page);
  await page.addInitScript(() => localStorage.setItem('yautja-long-hunt.campaign-slot.1', '{"version":999,"future":"retain-v50"}'));
  await page.goto(base, { waitUntil: 'networkidle', timeout: 120000 });
  await page.getByRole('button', { name: /^Nouvelle partie/ }).click();
  await page.locator('[data-campaign-slot="1"]').click();
  assert(await page.getByRole('button', { name: /^Créer la partie 1/ }).isDisabled());
  assert.equal(await slotBytes(page, 1), '{"version":999,"future":"retain-v50"}');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Charger une partie/ }).click();
  assert.match(await page.locator('[data-campaign-menu]').innerText(), /version plus récente/);
  checks.push({ name: 'future-archive-protected-in-both-views', bytesPreserved: true, noReplacement: true });
  await page.close();

  page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); watch(page);
  await page.addInitScript(() => {
    window.__menuPad = { id: 'V50 virtual standard pad', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.__menuPad] });
  });
  await page.goto(base, { waitUntil: 'networkidle', timeout: 120000 });
  await page.getByRole('button', { name: /^Nouvelle partie/ }).waitFor();
  const tap = async index => {
    await page.waitForTimeout(100);
    await page.evaluate(index => { window.__menuPad.buttons[index] = { pressed: true, touched: true, value: 1 }; }, index);
    await page.waitForTimeout(150);
    await page.evaluate(index => { window.__menuPad.buttons[index] = { pressed: false, touched: false, value: 0 }; }, index);
    await page.waitForTimeout(100);
  };
  await tap(0); await page.locator('[data-campaign-menu="new"]').waitFor();
  await tap(1); await page.locator('[data-campaign-menu="main"]').waitFor();
  await page.getByRole('button', { name: /^Nouvelle partie/ }).focus();
  await page.keyboard.press('Enter'); await page.locator('[data-campaign-menu="new"]').waitFor();
  await page.keyboard.press('Escape'); await page.locator('[data-campaign-menu="main"]').waitFor();
  checks.push({ name: 'keyboard-and-virtual-gamepad', aConfirm: true, bBack: true, enter: true, escape: true, physicalControllerTested: false });
  await page.close();
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify({ passed: true, base, at: new Date().toISOString(), checks, errors, failures, limitation: 'Virtual standard gamepad and browser touch profile; no physical hardware certification.' }, null, 2));
  console.log(JSON.stringify({ passed: true, checks: checks.length, out }));
} catch (error) {
  if (page && !page.isClosed()) await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify({ passed: false, base, checks, errors, failures, error: String(error) }, null, 2));
  throw error;
} finally { await browser.close(); }
