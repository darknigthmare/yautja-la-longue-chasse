import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.V33_QA_URL || 'http://localhost:4173';
const arenaId = process.env.V33_QA_ARENA || 'the-pit';
const output = process.env.V33_QA_OUTPUT || 'work/v33/fullapp-qa/' + arenaId;
const production = JSON.parse(await fs.readFile('art-source/v33/pit-arenas/production-manifest.json', 'utf8'));
const arena = production.stages.find(stage => stage.legacyRuntimeArenaId === arenaId || stage.catalogueId === arenaId);
assert(arena?.runtimeEnabled, 'Selected arena must have a reviewed runtime kit.');
const assets = arena.planes.flatMap(plane => plane.assets);
const framePaths = new Set(assets.flatMap(asset => asset.frames).filter(frame => ['reviewed', 'integrated'].includes(frame.status)).map(frame => frame.path));
assert(framePaths.size > 0);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [], failedRequests = [], loadedImages = new Set(), checks = [];
let page;
try {
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400) failedRequests.push({ url: response.url(), status: response.status() });
    const pathname = new URL(response.url()).pathname;
    if (response.status() === 200 && framePaths.has(pathname)) loadedImages.add(pathname);
  });
  await page.goto(base, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForFunction(() => document.querySelector('[data-game-content-version="V33"]'));
  await page.getByRole('button', { name: 'Jouer', exact: true }).click();
  await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
  await page.getByRole('radio', { name: /Entraînement/ }).click();
  await page.getByRole('combobox', { name: 'Combattant joueur', exact: true }).selectOption('jungle-hunter');
  await page.getByRole('combobox', { name: 'Adversaire', exact: true }).selectOption('city-hunter');
  await page.getByRole('combobox', { name: 'Arène', exact: true }).selectOption(arenaId);
  await page.screenshot({ path: output + '/selection.png', fullPage: true });
  await page.getByRole('button', { name: /^ENTRER DANS L’ARÈNE/ }).click();
  await page.waitForFunction(() => document.querySelector('canvas[data-pit-arena-art-status="bitmap"][data-pit-arena-art-source="openai-v33-independent"][data-pit-arena-planes="P0,P1,P2,P3,P4,P5"]'), {}, { timeout: 60000 });
  await page.getByRole('button', { name: 'Laboratoire', exact: true }).click();
  await page.getByRole('combobox', { name: 'Comportement du mannequin', exact: true }).selectOption('idle');
  await page.waitForFunction(() => document.querySelectorAll('[data-pit-bitmap-status="sprite-sheet-animation"]').length === 2);
  const canvas = page.locator('canvas[data-pit-arena-id]');
  const data = await canvas.evaluate(element => ({ ...element.dataset }));
  assert.equal(data.pitArenaId, arenaId);
  assert.equal(data.pitArenaMissingAssets, '0');
  assert.equal(Number(data.pitArenaLoadedImages), framePaths.size);
  assert.equal(Number(data.pitArenaSubplans), assets.length);
  assert.deepEqual([...loadedImages].sort(), [...framePaths].sort());
  checks.push({ name: 'live-match', arena: data.pitArenaId, planes: data.pitArenaPlanes, source: data.pitArenaArtSource, loadedImages: framePaths.size, subplans: assets.length, missing: 0 });
  await canvas.screenshot({ path: output + '/arena-live.png' });
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(650); await page.keyboard.up('ArrowLeft');
  await canvas.screenshot({ path: output + '/leftward-live.png' });
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(850); await page.keyboard.up('ArrowRight');
  await canvas.screenshot({ path: output + '/rightward-live.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: output + '/mobile.png', fullPage: true });
  assert.deepEqual(errors, []); assert.deepEqual(failedRequests, []);
  const result = { passed: true, checkedAt: new Date().toISOString(), surface: 'full-application-play-pit-training', verifiedContentVersion: 'V33', url: base, checks, loadedImageFiles: [...loadedImages].sort(), mobileNoOverflow: true, errors, failedRequests };
  await fs.writeFile(output + '/browser-qa.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} catch (error) {
  if (page) {
    await page.screenshot({ path: output + '/failure.png', fullPage: true });
    const detail = { error: String(error), errors, failedRequests, loadedImages: [...loadedImages], canvas: await page.locator('canvas').evaluateAll(elements => elements.map(element => ({ ...element.dataset }))), body: (await page.locator('body').innerText()).slice(-5000) };
    await fs.writeFile(output + '/failure.json', JSON.stringify(detail, null, 2)); console.log(JSON.stringify(detail));
  }
  throw error;
} finally { await browser.close(); }
