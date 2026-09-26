import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { campaignFixture, enterCampaignDeck } from './campaign-browser-helpers.mjs';
import { choosePitFighter, choosePitStage, closePitSelectionOptions, openPitPause, returnPitSelection, selectPitMatch } from './pit-selection-browser-helpers.mjs';

const url = process.env.V51_ART_QA_URL || 'http://127.0.0.1:4174';
const output = process.env.V51_ART_QA_OUTPUT || 'outputs/qa-commercial-audit/v51/presentation-art-browser-qa';
const browserChannel = process.env.V51_QA_BROWSER_CHANNEL || 'chrome';
const variantId = 'jungle-hunter-avec-casque-53f4eb349a';
const bundle = await build({ stdin: { contents: 'export {PIT_SPRITE_SHEET_REGISTRY} from "./app/game/pitSpriteSheetRegistry.ts";', resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const { PIT_SPRITE_SHEET_REGISTRY } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const definition = PIT_SPRITE_SHEET_REGISTRY.find(item => item.variantId === variantId && item.atlas.id.endsWith('-v51'));
assert(definition); await fs.mkdir(output, { recursive: true });
let browser, page;
const checks = [], motionChecks = [], bouts = [], errors = [], responses = [];
let mobilePresentationProof = null;
function readState() {
  const root = document.querySelector('[data-pit-immersive]');
  return root && { phase: root.dataset.pitPresentationPhase, elapsed: Number(root.dataset.pitPresentationElapsedMs), round: Number(root.dataset.pitPresentationRound), winner: Number(root.dataset.pitPresentationWinnerSlot), terminalReady: root.dataset.pitPresentationTerminalReady === 'true', frame: Number(root.querySelector('[data-pit-frame]')?.dataset.pitFrame) };
}
const read = () => page.evaluate(readState);
const release = async () => { for (const key of ['ArrowRight', 'KeyL', 'Numpad4', 'Numpad5']) await page.keyboard.up(key); };
try {
  browser = await chromium.launch({ ...(browserChannel === 'headless-shell' ? {} : { channel: browserChannel }), headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'no-preference' });
  const fixture = structuredClone(await campaignFixture()); fixture.save.settings.screenShake = false;
  await context.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), fixture);
  // Passive draw observer: invoke the original renderer unchanged, then record source metadata.
  await context.addInitScript(() => {
    const canvasSources = new WeakMap(), original = CanvasRenderingContext2D.prototype.drawImage;
    window.__pitV51Draws = [];
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      const result = original.apply(this, args), source = args[0];
      const sourceUrl = source instanceof HTMLImageElement ? source.currentSrc || source.src : canvasSources.get(source);
      if (sourceUrl && args.length === 3) canvasSources.set(this.canvas, sourceUrl);
      if (sourceUrl?.includes('/game/sprites/v51/') && args.length === 9 && this.canvas.matches?.('canvas[data-pit-fighter-positions]') && window.__pitV51Draws.length < 15000) {
        const root = document.querySelector('[data-pit-immersive]'), matrix = this.getTransform();
        window.__pitV51Draws.push({ src: new URL(sourceUrl, location.href).pathname, rect: args.slice(1, 5), destination: args.slice(5, 9), phase: root?.dataset.pitPresentationPhase, elapsed: Number(root?.dataset.pitPresentationElapsedMs), combatEffects: this.canvas.dataset.pitCombatEffects, cameraMode: this.canvas.dataset.pitCameraMode, frame: Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame), round: Number(root?.dataset.pitPresentationRound), transform: { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d } });
      }
      return result;
    };
  });
  page = await context.newPage(); page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) responses.push({ url: response.url(), status: response.status() }); });
  await enterCampaignDeck(page, { url });
  assert.equal(await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version'), 'V51');
  for (const [slot, winner] of [[0, 0], [0, 1], [1, 1], [1, 0]]) {
    const facing = slot === 0 ? 'right' : 'left', outcome = slot === winner ? 'victory' : 'defeat', label = `${facing}-${outcome}`;
    await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
    await closePitSelectionOptions(page); await page.getByRole('radio', { name: /^Versus local/ }).click(); await closePitSelectionOptions(page);
    await choosePitFighter(page, slot === 0 ? 'jungle-hunter' : 'city-hunter');
    if (slot === 0) await page.locator('[data-pit-variant-select]').selectOption(variantId);
    await page.locator('[data-pit-selection-confirm]').click();
    await choosePitFighter(page, slot === 1 ? 'jungle-hunter' : 'city-hunter');
    if (slot === 1) await page.locator('[data-pit-variant-select]').selectOption(variantId);
    await page.locator('[data-pit-selection-confirm]').click(); await choosePitStage(page, 'the-pit');
    await page.waitForFunction(() => document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus === 'ready');
    await page.evaluate(() => { window.__pitV51Draws = []; });
    await page.locator('[data-pit-selection-confirm]').click();
    const bitmap = page.locator(`[data-pit-bitmap-slot="${slot}"]`);
    assert.equal(await bitmap.getAttribute('data-pit-bitmap-variant'), variantId);
    const introPhase = slot === 0 ? 'intro-left' : 'intro-right';
    await page.waitForFunction(phase => document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase === phase && Number(document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationElapsedMs) >= 850, introPhase);
    await page.screenshot({ path: path.join(output, `${label}-intro.png`) });
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
    const draws = await page.evaluate(() => window.__pitV51Draws);
    assert(draws.length > 0 && draws.length < 15000);
    for (const clip of definition.atlas.clips.filter(item => item.facing === facing && ['pit.presentation.intro', `pit.presentation.${outcome}`].includes(item.id))) {
      const phases = clip.id.endsWith('.intro') ? [introPhase] : ['round-result', 'match-result'];
      const actual = draws.filter(draw => phases.includes(draw.phase));
      assert(actual.every(draw => draw.combatEffects === 'false'), 'Combat VFX must be suppressed throughout presentation drawings');
      const frames = clip.frames.map((frame, index) => {
        const src = definition.atlas.pages.find(item => item.id === frame.pageId).src;
        const rendered = actual.filter(draw => draw.src === src && JSON.stringify(draw.rect) === JSON.stringify(frame.rect));
        assert(rendered.length > 0, `${clip.id}/${facing} frame ${index} must really be drawn`);
        assert(rendered.every(draw => draw.transform.a > 0 && draw.transform.d > 0 && draw.transform.b === 0 && draw.transform.c === 0), 'Native facing must not be mirrored');
        return { index, src, rect: frame.rect, observedDraws: rendered.length };
      });
      const id = `${clip.id}/${facing}`;
      if (!checks.some(check => check.id === id)) checks.push({ id, frames });
    }
    bouts.push({ slot, winner, outcome, facing, finalFrame: end.frame, actualDraws: draws.length });
    await fs.writeFile(path.join(output, `${label}-draws.json`), JSON.stringify(draws, null, 2));
    console.log(JSON.stringify({ passed: true, bout: label, actualDraws: draws.length }));
    await page.getByRole('button', { name: 'Retour au vaisseau', exact: true }).click();
    await page.locator('[data-campaign-location="deck"]').waitFor();
  }
  async function startMaskedIntro(fromDeck) {
    if (fromDeck) await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
    await closePitSelectionOptions(page); await page.getByRole('radio', { name: /^Versus local/ }).click();
    await choosePitFighter(page, 'jungle-hunter'); await page.locator('[data-pit-variant-select]').selectOption(variantId);
    await page.locator('[data-pit-selection-confirm]').click(); await choosePitFighter(page, 'city-hunter');
    await page.locator('[data-pit-selection-confirm]').click(); await choosePitStage(page, 'the-pit');
    await page.waitForFunction(() => document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus === 'ready');
    await page.evaluate(() => { window.__pitV51Draws = []; }); await page.locator('[data-pit-selection-confirm]').click();
    await page.waitForFunction(() => document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase === 'intro-left');
  }
  await startMaskedIntro(true); await openPitPause(page);
  await page.locator('[data-pit-camera-control]').click();
  assert.match(await page.locator('[data-pit-camera-control]').innerText(), /Caméra fixe/i);
  await returnPitSelection(page); await startMaskedIntro(false);
  await page.waitForFunction(() => document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase === 'intro-left' && Number(document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationElapsedMs) >= 950);
  await page.screenshot({ path: path.join(output, 'fixed-camera-animated-intro.png') });
  const fixedDraws = (await page.evaluate(() => window.__pitV51Draws)).filter(draw => draw.phase === 'intro-left');
  const intro = definition.atlas.clips.find(clip => clip.id === 'pit.presentation.intro' && clip.facing === 'right');
  for (const frame of intro.frames) assert(fixedDraws.some(draw => JSON.stringify(draw.rect) === JSON.stringify(frame.rect)), 'Fixed camera must still draw all three authored intro poses');
  assert(fixedDraws.every(draw => draw.cameraMode === 'fixed' && draw.combatEffects === 'false'));
  motionChecks.push({ name: 'fixed-camera-preserves-three-authored-intro-poses', frames: 3, observedDraws: fixedDraws.length });
  await returnPitSelection(page); await page.emulateMedia({ reducedMotion: 'reduce' });
  await startMaskedIntro(false);
  await page.waitForFunction(() => document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase === 'intro-left' && Number(document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationElapsedMs) >= 950);
  await page.screenshot({ path: path.join(output, 'system-reduced-motion-held-intro.png') });
  const reducedDraws = (await page.evaluate(() => window.__pitV51Draws)).filter(draw => draw.phase === 'intro-left');
  assert(reducedDraws.length > 0);
  assert(reducedDraws.every(draw => draw.cameraMode === 'fixed' && draw.combatEffects === 'false' && JSON.stringify(draw.rect) === JSON.stringify(intro.frames.at(-1).rect)), 'System reduced motion must hold the final authored intro pose without cycling');
  motionChecks.push({ name: 'system-reduced-motion-holds-reviewed-final-pose', frames: 1, observedDraws: reducedDraws.length, preferenceEmulated: true });
  await fs.writeFile(path.join(output, 'camera-motion-draws.json'), JSON.stringify({ fixedDraws, reducedDraws }, null, 2));
  await context.close();
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  await mobileContext.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), fixture);
  page = await mobileContext.newPage(); page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) responses.push({ url: response.url(), status: response.status() }); });
  await enterCampaignDeck(page, { url }); await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
  await closePitSelectionOptions(page); await page.getByRole('radio', { name: /^Versus local/ }).click();
  await selectPitMatch(page, { player: 'jungle-hunter', opponent: 'city-hunter', arena: 'the-pit' });
  await page.waitForFunction(() => document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase === 'countdown' && Number(document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationElapsedMs) >= 300);
  mobilePresentationProof = await page.locator('[data-pit-round-presentation]').evaluate(node => {
    const panel = node.firstElementChild, digit = panel.querySelector('strong'), style = getComputedStyle(panel);
    return { phase: node.dataset.phase, className: panel.className, digit: digit.textContent, digitFontSize: getComputedStyle(digit).fontSize, panelBorderLeft: style.borderLeftWidth, panelBorderRight: style.borderRightWidth, overflowX: document.documentElement.scrollWidth > innerWidth, overflowY: document.documentElement.scrollHeight > innerHeight + 1 };
  });
  await fs.writeFile(path.join(output, 'mobile-countdown-style.json'), JSON.stringify(mobilePresentationProof, null, 2));
  await page.screenshot({ path: path.join(output, 'mobile-countdown-stable.png') });
  assert.equal(mobilePresentationProof.phase, 'countdown');
  assert(Number.parseFloat(mobilePresentationProof.digitFontSize) >= 48, 'The mobile countdown must use a large, legible digit');
  assert.equal(mobilePresentationProof.panelBorderLeft, '0px'); assert.equal(mobilePresentationProof.panelBorderRight, '0px');
  assert.equal(mobilePresentationProof.overflowX, false); assert.equal(mobilePresentationProof.overflowY, false);
  await mobileContext.close();
  assert.equal(checks.length, 6); assert.deepEqual(errors, []); assert.deepEqual(responses, []);
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ passed: true, checkedAt: new Date().toISOString(), url, contentVersion: 'V51', browserChannel, fighter: 'jungle-hunter', variantId, checks, motionChecks, mobilePresentationProof, bouts, errors, responses, limits: ['Four real local keyboard bouts against an idle opponent, no combat or clock injection.', 'Only the provided masked Jungle Hunter appearance is certified by this rendering check.', 'Six clips with three frame uses each; two neutral frame drawings are reused for defeat.', 'Native orientation and source rectangles verified; canon 1:1 and fine anatomy are not certified.'] }, null, 2));
  console.log(JSON.stringify({ passed: true, clips: checks.length, motionChecks: motionChecks.length, mobileLayoutChecks: 1, bouts: bouts.length, output }));
} catch (error) {
  if (page && !page.isClosed()) await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ passed: false, checkedAt: new Date().toISOString(), error: String(error), stack: error?.stack, checks, motionChecks, mobilePresentationProof, bouts, errors, responses }, null, 2));
  throw error;
} finally { await browser?.close(); }
