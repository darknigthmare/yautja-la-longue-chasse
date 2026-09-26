import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { campaignFixture, enterCampaignDeck } from './campaign-browser-helpers.mjs';
import { choosePitFighter, choosePitStage, closePitSelectionOptions, openPitPause, returnPitSelection } from './pit-selection-browser-helpers.mjs';

const url = process.env.V52_ART_QA_URL || 'http://127.0.0.1:4174';
const output = process.env.V52_ART_QA_OUTPUT || 'outputs/qa-commercial-audit/v52/presentation-art-browser-qa';
const browserChannel = process.env.V52_QA_BROWSER_CHANNEL || 'chromium';
const appearances = [
  { fighterId: 'city-hunter', variantId: 'city-hunter-avec-casque-12136078fe' },
  { fighterId: 'scar', variantId: 'scar-avec-casque-6a0a69930d' },
];
const bundle = await build({ stdin: { contents: 'export {PIT_SPRITE_SHEET_REGISTRY} from "./app/game/pitSpriteSheetRegistry.ts";', resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const { PIT_SPRITE_SHEET_REGISTRY } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
for (const appearance of appearances) {
  appearance.definition = PIT_SPRITE_SHEET_REGISTRY.find(item => item.variantId === appearance.variantId && item.atlas.id.endsWith('-v52'));
  assert(appearance.definition, appearance.variantId + ' must own a reviewed V52 atlas');
}
await fs.mkdir(output, { recursive: true });
let browser, page;
const checks = [], heldPoseChecks = [], motionChecks = [], introObservations = [], bouts = [], errors = [], responses = [];
const read = () => page.evaluate(() => {
  const root = document.querySelector('[data-pit-immersive]');
  return root && { phase: root.dataset.pitPresentationPhase, elapsed: Number(root.dataset.pitPresentationElapsedMs), round: Number(root.dataset.pitPresentationRound), winner: Number(root.dataset.pitPresentationWinnerSlot), frame: Number(root.querySelector('[data-pit-frame]')?.dataset.pitFrame) };
});
const release = async () => { for (const key of ['ArrowRight', 'KeyL', 'Numpad4', 'Numpad5']) await page.keyboard.up(key); };
const clipSource = (appearance, frame) => appearance.definition.atlas.pages.find(item => item.id === frame.pageId).src;
function reviewClip(appearance, clip, actual) {
  assert(actual.length > 0, appearance.fighterId + ' ' + clip.id + ' must be observed');
  assert(actual.every(draw => draw.combatEffects === 'false'), 'Combat VFX must stay suppressed throughout presentation drawings');
  return clip.frames.map((frame, index) => {
    const src = clipSource(appearance, frame);
    const rendered = actual.filter(draw => draw.src === src && JSON.stringify(draw.rect) === JSON.stringify(frame.rect));
    assert(rendered.length > 0, `${appearance.variantId}/${clip.id}/${clip.facing} frame ${index} must really be drawn`);
    assert(rendered.every(draw => draw.transform.a > 0 && draw.transform.d > 0 && draw.transform.b === 0 && draw.transform.c === 0), 'Native facing must not be mirrored');
    return { index, src, rect: frame.rect, observedDraws: rendered.length };
  });
}
function reviewHeldIntro(appearance, facing, phase, mode, draws) {
  const clip = appearance.definition.atlas.clips.find(item => item.id === 'pit.presentation.intro' && item.facing === facing);
  const frame = mode === 'first' ? clip.frames[0] : clip.frames.at(-1), src = clipSource(appearance, frame);
  const ownedSources = new Set(appearance.definition.atlas.pages.map(page => page.src));
  const actual = draws.filter(draw => draw.phase === phase && ownedSources.has(draw.src));
  assert(actual.length > 0, `${appearance.variantId}/${facing}/${phase} must draw the held intro pose`);
  assert(actual.every(draw => draw.src === src && JSON.stringify(draw.rect) === JSON.stringify(frame.rect)),
    `${appearance.variantId}/${facing}/${phase} must keep the ${mode} intro drawing without returning to another stance`);
  assert(actual.every(draw => draw.combatEffects === 'false' && draw.transform.a > 0 && draw.transform.d > 0 && draw.transform.b === 0 && draw.transform.c === 0));
  const id = `${appearance.variantId}/${facing}/${phase}`;
  if (!heldPoseChecks.some(check => check.id === id)) heldPoseChecks.push({ id, phase, mode, src, rect: frame.rect, observedDraws: actual.length });
}
async function selectMatch(order, fromDeck = true) {
  if (fromDeck) await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
  await closePitSelectionOptions(page);
  await page.getByRole('radio', { name: /^Versus local/ }).click();
  await closePitSelectionOptions(page);
  for (const appearance of order) {
    await choosePitFighter(page, appearance.fighterId);
    await page.locator('[data-pit-variant-select]').selectOption(appearance.variantId);
    await page.locator('[data-pit-selection-confirm]').click();
  }
  await choosePitStage(page, 'the-pit');
  await page.waitForFunction(() => document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus === 'ready');
  await page.evaluate(() => { window.__pitV52Draws = []; });
  await page.locator('[data-pit-selection-confirm]').click();
  for (let slot = 0; slot < order.length; slot++) assert.equal(await page.locator(`[data-pit-bitmap-slot="${slot}"]`).getAttribute('data-pit-bitmap-variant'), order[slot].variantId);
}
async function observeIntros(label) {
  for (const phase of ['intro-left', 'intro-right']) {
    // PNG capture/encoding can outlast the next short live intro window on a busy
    // machine. Require actual recorded draws, not a lucky later DOM poll. Every
    // authored crop is still mandatory in reviewClip; no clock is changed here.
    await page.waitForFunction(expected => window.__pitV52Draws.some(draw => draw.phase === expected && draw.elapsed >= 850), phase);
    const before = await read();
    const captured = before.phase === phase;
    if (captured) await page.screenshot({ path: path.join(output, `${label}-${phase}.png`) });
    introObservations.push({ label, phase, observedDrawAtOrAfterMs: 850, captured, stateBeforeCapture: before, stateAfterCapture: await read() });
  }
}
try {
  browser = await chromium.launch({ ...(browserChannel === 'headless-shell' ? {} : { channel: browserChannel }), headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'no-preference' });
  const fixture = structuredClone(await campaignFixture()); fixture.save.settings.screenShake = false;
  await context.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), fixture);
  // This observer invokes the original draw unchanged and records only source/DOM metadata.
  await context.addInitScript(() => {
    const canvasSources = new WeakMap(), original = CanvasRenderingContext2D.prototype.drawImage;
    window.__pitV52Draws = [];
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      const result = original.apply(this, args), source = args[0];
      const sourceUrl = source instanceof HTMLImageElement ? source.currentSrc || source.src : canvasSources.get(source);
      if (sourceUrl && args.length === 3) canvasSources.set(this.canvas, sourceUrl);
      if (sourceUrl?.includes('/game/sprites/v52/') && args.length === 9 && this.canvas.matches?.('canvas[data-pit-fighter-positions]') && window.__pitV52Draws.length < 20000) {
        const root = document.querySelector('[data-pit-immersive]'), matrix = this.getTransform();
        window.__pitV52Draws.push({ src: new URL(sourceUrl, location.href).pathname, rect: args.slice(1, 5), destination: args.slice(5, 9), phase: root?.dataset.pitPresentationPhase, elapsed: Number(root?.dataset.pitPresentationElapsedMs), combatEffects: this.canvas.dataset.pitCombatEffects, cameraMode: this.canvas.dataset.pitCameraMode, frame: Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame), round: Number(root?.dataset.pitPresentationRound), transform: { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d } });
      }
      return result;
    };
  });
  page = await context.newPage(); page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) responses.push({ url: response.url(), status: response.status() }); });
  await enterCampaignDeck(page, { url });
  assert.equal(await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version'), 'V52');
  for (const [reverse, winner] of [[false, 0], [false, 1], [true, 0], [true, 1]]) {
    const order = reverse ? [...appearances].reverse() : appearances;
    const label = `${order[0].fighterId}-vs-${order[1].fighterId}-winner-${winner}`;
    await selectMatch(order); await observeIntros(label);
    const deadline = Date.now() + 180000, move = winner === 0 ? 'ArrowRight' : 'Numpad4', attack = winner === 0 ? 'KeyL' : 'Numpad5';
    let reviewedRound = 0;
    while (Date.now() < deadline) {
      const state = await read();
      if (state.phase === 'match-result') break;
      if (state.phase !== 'fight') {
        await release();
        if (state.phase === 'round-result' && reviewedRound !== state.round && state.elapsed >= 1400) {
          reviewedRound = state.round; assert.equal(state.winner, winner);
          await page.screenshot({ path: path.join(output, `${label}-round-${state.round}.png`) });
        }
        await page.waitForTimeout(45); continue;
      }
      await page.keyboard.down(move); await page.keyboard.press(attack, { delay: 70 }); await page.waitForTimeout(440);
    }
    await release(); const end = await read(); assert.equal(end.phase, 'match-result'); assert.equal(end.winner, winner);
    await page.waitForFunction(() => Number(document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationElapsedMs) >= 1450);
    await page.screenshot({ path: path.join(output, `${label}-match-result.png`) });
    await page.locator('[aria-labelledby="pit-result"]').waitFor({ state: 'visible' });
    const draws = await page.evaluate(() => window.__pitV52Draws);
    assert(draws.length > 0 && draws.length < 20000);
    for (let slot = 0; slot < order.length; slot++) {
      const appearance = order[slot], facing = slot === 0 ? 'right' : 'left';
      const outcome = slot === winner ? 'victory' : 'defeat';
      for (const clip of appearance.definition.atlas.clips.filter(item => item.facing === facing && ['pit.presentation.intro', `pit.presentation.${outcome}`].includes(item.id))) {
        const phases = clip.id.endsWith('.intro') ? [slot === 0 ? 'intro-left' : 'intro-right'] : ['round-result', 'match-result'];
        const actual = draws.filter(draw => phases.includes(draw.phase));
        const frames = reviewClip(appearance, clip, actual), id = `${appearance.variantId}/${clip.id}/${facing}`;
        if (!checks.some(check => check.id === id)) checks.push({ id, fighterId: appearance.fighterId, variantId: appearance.variantId, frames });
      }
      reviewHeldIntro(appearance, facing, slot === 0 ? 'intro-right' : 'intro-left', slot === 0 ? 'last' : 'first', draws);
      reviewHeldIntro(appearance, facing, 'countdown', 'last', draws);
    }
    bouts.push({ order: order.map(item => item.variantId), winner, finalFrame: end.frame, actualDraws: draws.length });
    await fs.writeFile(path.join(output, `${label}-draws.json`), JSON.stringify(draws, null, 2));
    console.log(JSON.stringify({ passed: true, bout: label, actualDraws: draws.length }));
    await page.getByRole('button', { name: 'Retour au vaisseau', exact: true }).click();
    await page.locator('[data-campaign-location="deck"]').waitFor();
  }
  await selectMatch(appearances); await openPitPause(page);
  await page.locator('[data-pit-camera-control]').click();
  assert.match(await page.locator('[data-pit-camera-control]').innerText(), /Caméra fixe/i);
  await returnPitSelection(page); await selectMatch(appearances, false); await observeIntros('fixed-camera');
  const fixedDraws = await page.evaluate(() => window.__pitV52Draws);
  for (let slot = 0; slot < appearances.length; slot++) {
    const appearance = appearances[slot], phase = slot === 0 ? 'intro-left' : 'intro-right';
    const clip = appearance.definition.atlas.clips.find(item => item.id === 'pit.presentation.intro' && item.facing === (slot === 0 ? 'right' : 'left'));
    const actual = fixedDraws.filter(draw => draw.phase === phase);
    const frames = reviewClip(appearance, clip, actual);
    assert(actual.every(draw => draw.cameraMode === 'fixed'));
    motionChecks.push({ name: 'fixed-camera-preserves-authored-intro', variantId: appearance.variantId, frames, observedDraws: actual.length });
  }
  await returnPitSelection(page); await page.emulateMedia({ reducedMotion: 'reduce' });
  await selectMatch(appearances, false); await observeIntros('system-reduced-motion');
  const reducedDraws = await page.evaluate(() => window.__pitV52Draws);
  for (let slot = 0; slot < appearances.length; slot++) {
    const appearance = appearances[slot], phase = slot === 0 ? 'intro-left' : 'intro-right';
    const clip = appearance.definition.atlas.clips.find(item => item.id === 'pit.presentation.intro' && item.facing === (slot === 0 ? 'right' : 'left'));
    const frame = clip.frames.at(-1), src = clipSource(appearance, frame);
    const actual = reducedDraws.filter(draw => draw.phase === phase && draw.src === src);
    assert(actual.length > 0);
    assert(actual.every(draw => draw.cameraMode === 'fixed' && draw.combatEffects === 'false' && JSON.stringify(draw.rect) === JSON.stringify(frame.rect)), 'System reduced motion must hold the final reviewed pose');
    motionChecks.push({ name: 'system-reduced-motion-holds-final-intro', variantId: appearance.variantId, frames: 1, observedDraws: actual.length, preferenceEmulated: true });
  }
  await fs.writeFile(path.join(output, 'camera-motion-draws.json'), JSON.stringify({ fixedDraws, reducedDraws }, null, 2));
  assert.equal(checks.length, 12); assert.equal(heldPoseChecks.length, 8); assert.equal(motionChecks.length, 4); assert.deepEqual(errors, []); assert.deepEqual(responses, []);
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ passed: true, checkedAt: new Date().toISOString(), url, contentVersion: 'V52', browserChannel, appearances: appearances.map(({ fighterId, variantId }) => ({ fighterId, variantId })), checks, heldPoseChecks, motionChecks, introObservations, bouts, errors, responses, limits: ['Four real local keyboard bouts against an idle opponent; no combat, HP or clock injection.', 'Only the exact supplied masked City Hunter and Scar appearances are checked.', 'Native orientations, original PNG crops and three distinct frame uses per clip are observed.', 'Waiting and ready are held intro drawings, not additional animation clips or drawings.', 'Screenshots are opportunistic after a required passive draw observation; late capture windows are explicitly recorded, never substituted with a fight capture.', 'Canon 1:1, fine anatomy and complete gameplay movesets are not certified.', 'Reduced-motion preference is browser-emulated, not physical-device certification.'] }, null, 2));
  console.log(JSON.stringify({ passed: true, clips: checks.length, heldPoseChecks: heldPoseChecks.length, motionChecks: motionChecks.length, bouts: bouts.length, output }));
} catch (error) {
  if (page && !page.isClosed()) {
    await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    const observation = await page.evaluate(() => ({ phase: document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase, draws: window.__pitV52Draws })).catch(() => null);
    await fs.writeFile(path.join(output, 'failure-observation.json'), JSON.stringify(observation, null, 2));
  }
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ passed: false, checkedAt: new Date().toISOString(), error: String(error), stack: error?.stack, checks, heldPoseChecks, motionChecks, introObservations, bouts, errors, responses }, null, 2));
  throw error;
} finally { await browser?.close(); }
