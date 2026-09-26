import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { campaignFixture, enterCampaignDeck } from './campaign-browser-helpers.mjs';
import { choosePitFighter, choosePitStage, closePitSelectionOptions, returnPitSelection } from './pit-selection-browser-helpers.mjs';

const url = process.env.V53_IDLE_QA_URL || 'http://127.0.0.1:4174';
const output = process.env.V53_IDLE_QA_OUTPUT || 'outputs/qa-commercial-audit/v53/idle-hold-browser-qa';
const appearances = [
  { fighterId: 'city-hunter', variantId: 'city-hunter-avec-casque-12136078fe' },
  { fighterId: 'scar', variantId: 'scar-avec-casque-6a0a69930d' },
  { fighterId: 'jungle-hunter', variantId: 'jungle-hunter-avec-casque-53f4eb349a' },
];
const built = await build({ stdin: { contents: 'export { PIT_SPRITE_SHEET_REGISTRY } from "./app/game/pitSpriteSheetRegistry.ts"; export { getPitUserVariant } from "./app/game/systems/pitUserRoster.ts";', resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const { PIT_SPRITE_SHEET_REGISTRY: registry, getPitUserVariant } = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
for (const appearance of appearances) {
  appearance.definition = registry.find(entry => entry.variantId === appearance.variantId);
  appearance.shuffle = registry.find(entry => entry.variantId === appearance.variantId && entry.atlas.id.endsWith('-forward-shuffle-v53'));
  appearance.staticSrc = getPitUserVariant(appearance.fighterId, appearance.variantId).src;
  assert(appearance.definition);
}
const checks = [], bouts = [], errors = [], httpFailures = [];
let browser, page;
await fs.mkdir(output, { recursive: true });
const state = () => page.evaluate(() => {
  const root = document.querySelector('[data-pit-immersive]'), canvas = root?.querySelector('canvas[data-pit-fighter-positions]');
  return { phase: root?.dataset.pitPresentationPhase, frame: Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame), positions: JSON.parse(canvas?.dataset.pitFighterPositions || '[]'), statuses: [...document.querySelectorAll('[data-pit-bitmap-status]')].map(node => ({ slot: Number(node.dataset.pitBitmapSlot), status: node.dataset.pitBitmapStatus, variantId: node.dataset.pitBitmapVariant })) };
});
const clearDraws = () => page.evaluate(() => { window.__pitV53Draws = []; });
const readDraws = () => page.evaluate(() => window.__pitV53Draws);
function reviewIdle(order, label, current, draws) {
  assert.equal(current.phase, 'fight');
  assert.deepEqual(current.statuses.map(item => item.status), ['sprite-sheet-hold', 'sprite-sheet-hold']);
  assert(current.statuses.every(item => item.variantId === order[item.slot].variantId));
  for (const [slot, facing] of ['right', 'left'].entries()) {
    const appearance = order[slot];
    const clip = appearance.definition.atlas.clips.find(item => item.id === 'pit.presentation.intro' && item.facing === facing);
    const frame = clip.frames.at(-1), src = appearance.definition.atlas.pages.find(item => item.id === frame.pageId).src;
    const actual = draws.filter(draw => draw.phase === 'fight' && draw.src === src && draw.rect && JSON.stringify(draw.rect) === JSON.stringify(frame.rect));
    assert(actual.length > 0, `${appearance.fighterId}/${facing}/${label}: final native intro must really draw`);
    assert(actual.every(draw => draw.transform.a > 0 && draw.transform.d > 0 && draw.transform.b === 0 && draw.transform.c === 0), 'Held native artwork must never be mirrored or deformed');
    assert(!draws.some(draw => draw.phase === 'fight' && draw.src === appearance.staticSrc), 'Still idle must not flash back to its selection portrait');
    checks.push({ fighterId: appearance.fighterId, variantId: appearance.variantId, slot, facing, check: label, result: 'PASS', src, rect: frame.rect, observedDraws: actual.length });
  }
}
async function select(order, fromDeck) {
  if (fromDeck) await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
  await closePitSelectionOptions(page);
  await page.getByRole('radio', { name: /^Versus local/ }).click();
  await closePitSelectionOptions(page);
  for (let slot = 0; slot < 2; slot++) {
    const appearance = order[slot];
    await choosePitFighter(page, appearance.fighterId);
    await page.locator('[data-pit-variant-select]').selectOption(appearance.variantId);
    await page.locator('[data-pit-selection-confirm]').click();
  }
  await choosePitStage(page, 'the-pit');
  await page.waitForFunction(() => document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus === 'ready');
  await clearDraws();
  await page.locator('[data-pit-selection-confirm]').click();
  await page.waitForFunction(() => document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase === 'fight');
  await page.waitForFunction(() => Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame) >= 12);
}
try {
  browser = await chromium.launch({ channel: process.env.V53_QA_BROWSER_CHANNEL || 'chromium', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'no-preference' });
  const fixture = structuredClone(await campaignFixture()); fixture.save.settings.screenShake = false;
  await context.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), fixture);
  // Passive Canvas observer: original draw and all engine/input clocks remain unchanged.
  await context.addInitScript(() => {
    const sources = new WeakMap(), original = CanvasRenderingContext2D.prototype.drawImage;
    window.__pitV53Draws = [];
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      const result = original.apply(this, args), image = args[0];
      const sourceUrl = image instanceof HTMLImageElement ? image.currentSrc || image.src : sources.get(image);
      if (sourceUrl && args.length === 3) sources.set(this.canvas, sourceUrl);
      if (sourceUrl && /\/game\/sprites\/[^/]+\/(?:pit|film-plates|user-hunters)\//.test(sourceUrl) && [5, 9].includes(args.length) && this.canvas.matches?.('canvas[data-pit-fighter-positions]') && window.__pitV53Draws.length < 16000) {
        const root = document.querySelector('[data-pit-immersive]'), matrix = this.getTransform();
        window.__pitV53Draws.push({ src: new URL(sourceUrl, location.href).pathname, rect: args.length === 9 ? args.slice(1, 5) : null, destination: args.slice(args.length === 9 ? 5 : 1), phase: root?.dataset.pitPresentationPhase, frame: Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame), transform: { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d } });
      }
      return result;
    };
  });
  page = await context.newPage(); page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) httpFailures.push({ url: response.url(), status: response.status() }); });
  await enterCampaignDeck(page, { url });
  assert.equal(await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version'), 'V53');
  const storageBefore = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await fs.writeFile(path.join(output, 'storage-before.json'), JSON.stringify(storageBefore, null, 2));
  for (const [index, appearance] of appearances.entries()) {
    const order = [appearance, appearances[(index + 1) % appearances.length]];
    const label = order.map(item => item.fighterId).join('-vs-');
    await select(order, index === 0);
    const initial = await state();
    reviewIdle(order, 'intro-to-combat-native-hold', initial, await readDraws());
    await page.screenshot({ path: path.join(output, `${label}-idle-hold.png`) });
    // Both keyboard players really move forward. City/Scar use the reviewed
    // fighting shuffle; the still-uncovered Jungle appearance stays static.
    await page.keyboard.down('ArrowRight'); await page.keyboard.down('Numpad4');
    const movingStatus = order.map(item => item.shuffle ? 'sprite-sheet-animation' : 'static-bitmap');
    await page.waitForFunction(expected => [...document.querySelectorAll('[data-pit-bitmap-status]')].every(node => node.dataset.pitBitmapStatus === expected[Number(node.dataset.pitBitmapSlot)]), movingStatus);
    await clearDraws();
    const expectedMovingFrames = order.flatMap((item, slot) => {
      const facing = slot === 0 ? 'right' : 'left';
      if (!item.shuffle) return [{ slot, facing, rect: null, src: item.staticSrc }];
      return item.shuffle.atlas.clips.filter(clip => clip.facing === facing).flatMap(clip => clip.frames.map(frame => ({ slot, facing, rect: frame.rect, src: item.shuffle.atlas.pages.find(page => page.id === frame.pageId).src })));
    });
    await page.waitForFunction(expected => expected.every(frame => window.__pitV53Draws.some(draw => draw.phase === 'fight' && draw.src === frame.src && JSON.stringify(draw.rect) === JSON.stringify(frame.rect))), expectedMovingFrames);
    const moving = await state(), moveDraws = await readDraws();
    await page.screenshot({ path: path.join(output, `${label}-forward-movement.png`) });
    await page.keyboard.up('ArrowRight'); await page.keyboard.up('Numpad4');
    assert(moving.positions[0].x > initial.positions[0].x && moving.positions[1].x < initial.positions[1].x, 'Both native players must actually travel from keyboard input');
    assert(moveDraws.every(draw => expectedMovingFrames.some(frame => draw.src === frame.src && JSON.stringify(draw.rect) === JSON.stringify(frame.rect))), 'Motion must use only the reviewed native shuffle or the exact uncovered Jungle bitmap');
    assert(moveDraws.filter(draw => draw.rect).every(draw => draw.transform.a > 0 && draw.transform.d > 0 && draw.transform.b === 0 && draw.transform.c === 0), 'Native shuffle is never mirrored');
    for (const [slot, item] of order.entries()) checks.push({ fighterId: item.fighterId, variantId: item.variantId, slot, check: item.shuffle ? 'authored-native-forward-fighting-shuffle' : 'uncovered-forward-motion-remains-static', result: 'PASS', beforeX: initial.positions[slot].x, movingX: moving.positions[slot].x, observedDraws: moveDraws.filter(draw => expectedMovingFrames.some(frame => frame.slot === slot && frame.src === draw.src && JSON.stringify(frame.rect) === JSON.stringify(draw.rect))).length, authoredFrames: expectedMovingFrames.filter(frame => frame.slot === slot && frame.rect) });
    await page.waitForFunction(() => [...document.querySelectorAll('[data-pit-bitmap-status]')].every(node => node.dataset.pitBitmapStatus === 'sprite-sheet-hold'));
    await clearDraws();
    await page.waitForFunction(() => window.__pitV53Draws.filter(draw => draw.phase === 'fight' && draw.rect).length >= 8);
    const stopped = await state(); reviewIdle(order, 'movement-stop-native-hold', stopped, await readDraws());
    await page.screenshot({ path: path.join(output, `${label}-stopped-hold.png`) });
    bouts.push({ order: order.map(item => ({ fighterId: item.fighterId, variantId: item.variantId })), initial, moving, stopped });
    await returnPitSelection(page);
  }
  const storageAfter = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await fs.writeFile(path.join(output, 'storage-after.json'), JSON.stringify(storageAfter, null, 2));
  assert.deepEqual(storageAfter, storageBefore, 'Artwork and uncompleted keyboard movement bouts cannot mutate saved progression, PIT records or campaign slots');
  assert.equal(checks.length, 18); assert.deepEqual(errors, []); assert.deepEqual(httpFailures, []);
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ status: 'PASS', url, checks, bouts, errors, httpFailures, allLocalStorageBytesUnchanged: true, storageKeys: Object.keys(storageBefore), evidence: 'Real roster selection, keyboard movement and passive native Canvas draws; no engine/HP/clock injection.', limitation: 'Only City/Scar forward fighting shuffle has two new drawings per native side; rejected natural-walk candidates, Jungle movement and other absent actions remain uncovered.' }, null, 2));
  console.log(JSON.stringify({ status: 'PASS', checks: checks.length, bouts: bouts.length, errors, httpFailures, output }));
} catch (error) {
  if (page) await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ message: error.message, stack: error.stack, checks, bouts, errors, httpFailures, state: page ? await state().catch(() => null) : null, lastDraws: page ? (await readDraws().catch(() => [])).slice(-30) : [] }, null, 2));
  throw error;
} finally {
  if (page) { await page.keyboard.up('ArrowRight').catch(() => {}); await page.keyboard.up('Numpad4').catch(() => {}); }
  await browser?.close();
}
