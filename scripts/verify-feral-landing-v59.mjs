import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { campaignFixture, enterCampaignDeck } from './campaign-browser-helpers.mjs';
import { choosePitFighter, choosePitStage, closePitSelectionOptions } from './pit-selection-browser-helpers.mjs';

const url = process.env.V59_FERAL_LANDING_QA_URL || 'http://localhost:4178';
const output = process.env.V59_FERAL_LANDING_QA_OUTPUT || 'work-local/v59/qa/feral-landing';
const metadata = JSON.parse(await fs.readFile('app/game/data/pitFeralArtV59.json', 'utf8'));
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.V59_FERAL_LANDING_QA_CHANNEL || 'chrome', headless: true });
const checks = [], captures = [], errors = [], httpFailures = [];
let context, page, diagnostic = null;
const read = () => page.evaluate(() => {
  const root = document.querySelector('[data-pit-immersive]');
  const canvas = root?.querySelector('canvas[data-pit-technique-entities]');
  return { frame: Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame),
    positions: JSON.parse(canvas?.dataset.pitFighterPositions || '[]'),
    entities: JSON.parse(canvas?.dataset.pitTechniqueEntities || '[]') };
});
const draws = () => page.evaluate(() => window.__feralLandingV59);
const storage = () => page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
const shot = async name => { await page.screenshot({ path: path.join(output, `${name}.png`) }); captures.push(`${name}.png`); };
async function nextFrame() {
  const before = await read();
  for (let attempt = 0; attempt < 12; attempt++) {
    await page.clock.runFor(17);
    const current = await read();
    if (current.frame > before.frame) return current;
  }
  assert.fail(`simulation did not advance after frame ${before.frame}`);
}
async function press(key) {
  await page.keyboard.down(key);
  try { return await nextFrame(); } finally { await page.keyboard.up(key); }
}
async function openFight(slot) {
  context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const fixture = structuredClone(await campaignFixture());
  fixture.save.settings.screenShake = false;
  await context.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), fixture);
  await context.addInitScript(() => {
    const sources = new WeakMap(), original = CanvasRenderingContext2D.prototype.drawImage;
    window.__feralLandingV59 = [];
    // Observe the validated PNG -> offscreen canvas -> combat canvas chain.
    // No game state, pixels, keyboard input or stored data is replaced.
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      const result = original.apply(this, args), source = args[0];
      const src = source instanceof HTMLImageElement
        ? new URL(source.currentSrc || source.src, location.href).pathname : sources.get(source);
      const feral = src && (/\/feral-hunter\//.test(src) || /\/v59\/pit\/feral\//.test(src));
      if (feral) {
        if (!this.canvas.matches('canvas[data-pit-technique-entities]')) sources.set(this.canvas, src);
        else if (args.length === 9 && window.__feralLandingV59.length < 20000) {
          window.__feralLandingV59.push({ src, rect: args.slice(1, 5), destination: args.slice(5),
            frame: Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame),
            positions: JSON.parse(this.canvas.dataset.pitFighterPositions || '[]'),
            entities: JSON.parse(this.canvas.dataset.pitTechniqueEntities || '[]') });
        }
      }
      return result;
    };
  });
  page = await context.newPage(); page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) httpFailures.push({ status: response.status(), url: response.url() }); });
  await enterCampaignDeck(page, { url });
  assert.equal(await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version'), 'V59');
  await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
  await closePitSelectionOptions(page);
  await page.getByRole('radio', { name: /^Versus local/ }).click();
  for (const id of (slot ? ['city-hunter', 'feral-hunter'] : ['feral-hunter', 'city-hunter'])) {
    await choosePitFighter(page, id);
    await page.locator('[data-pit-selection-confirm]').click();
  }
  await choosePitStage(page, 'the-pit');
  await page.waitForFunction(() => document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus === 'ready');
  await page.locator('[data-pit-selection-confirm]').click();
  await page.waitForFunction(() => document.querySelector('[data-pit-feral-native-art]')?.dataset.pitFeralNativeArt === 'ready'
    && document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase === 'fight');
  await page.locator('[data-pit-immersive]').focus();
  await page.clock.install();
  await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 200));
  await page.keyboard.down('ArrowLeft'); await page.keyboard.down('Numpad6');
  try {
    for (let step = 0; step < 100; step++) {
      const current = await nextFrame();
      if (Math.abs(current.positions[0].x - current.positions[1].x) > 650) break;
    }
  } finally { await page.keyboard.up('ArrowLeft'); await page.keyboard.up('Numpad6'); }
  const separated = await nextFrame();
  assert(Math.abs(separated.positions[0].x - separated.positions[1].x) > 600);
}
function isNativeLauncher(draw) { return /\/v59\/pit\/feral\/launcher-(left|right)\.png$/.test(draw.src); }
function validateMuzzle(observed, slot) {
  const record = metadata.records.find(record => record.action === 'launcher' && record.facing === (slot ? 'left' : 'right'));
  const frame = record.frames[record.muzzle.frameIndex], scale = 119 / record.bodyHeight;
  const active = observed.filter(draw => isNativeLauncher(draw) && draw.rect.every((value, i) => value === frame.rect[i])
    && draw.entities.some(entity => entity.ownerSlot === slot && entity.bolt?.index === 1));
  assert(active.length, 'landing before release must draw the active native launcher with a physical bolt');
  const distances = active.map(draw => {
    const owner = draw.positions[slot], bolt = draw.entities.find(entity => entity.ownerSlot === slot && entity.bolt?.index === 1);
    const expected = { x: owner.x + (record.muzzle.point[0] - frame.pivot[0]) * scale,
      y: owner.y + (frame.pivot[1] - record.muzzle.point[1]) * scale };
    return Math.min(...[-1, 0, 1].map(offset => {
      const age = Math.max(0, bolt.age + offset);
      return Math.hypot(bolt.x + 11 - bolt.bolt.velocityX * age - expected.x, bolt.y + 2.5 - bolt.bolt.velocityY * age - expected.y);
    }));
  });
  assert(Math.max(...distances) < .04, 'late release uses the measured native muzzle');
  return { samples: active.length, maximumOriginError: Math.max(...distances) };
}
try {
  for (const slot of [0, 1]) for (const mode of ['fire-before-landing', 'land-before-fire']) {
    const name = `${mode}-slot-${slot}`;
    await openFight(slot);
    const beforeStorage = await storage();
    await page.evaluate(() => { window.__feralLandingV59 = []; });
    let state = await press(slot ? 'Numpad8' : 'Space');
    let peak = state.positions[slot].y, previousY = peak;
    // Trigger during descent by observed altitude, never by guessed wall time.
    // Around 102 units: the nine-tick startup releases just before landing.
    // Around 30 units: the fighter lands well before startup ends.
    const threshold = mode === 'fire-before-landing' ? 102 : 30;
    let trigger = null;
    for (let step = 0; step < 100; step++) {
      state = await nextFrame();
      const y = state.positions[slot].y;
      peak = Math.max(peak, y);
      if (peak > 90 && y > 0 && y < previousY && y <= threshold) { trigger = state; break; }
      previousY = y;
    }
    assert(trigger, 'a real descending jump reaches the requested airborne trigger altitude');
    await page.evaluate(() => { window.__feralLandingV59 = []; });
    const states = [trigger];
    state = await press(slot ? 'Numpad7' : 'KeyU'); states.push(state);
    let firstVolley = null, landed = null;
    for (let step = 0; step < 55; step++) {
      state = await nextFrame(); states.push(state);
      if (!firstVolley && state.entities.some(entity => entity.ownerSlot === slot && entity.bolt)) {
        firstVolley = state;
        await shot(`${name}-release`);
      }
      if (!landed && state.positions[slot].y === 0) {
        landed = state;
        await shot(`${name}-landed`);
      }
    }
    const observed = await draws(), native = observed.filter(isNativeLauncher);
    diagnostic = { name, peak, trigger, firstVolley, landed, states, draws: observed };
    await fs.writeFile(path.join(output, `${name}-trace.json`), JSON.stringify(diagnostic, null, 2));
    assert(firstVolley, 'the keyboard technique really fired physical bolts');
    assert(landed, 'the fighter really landed during the observation');
    const releaseY = firstVolley.positions[slot].y;
    let muzzle = null;
    if (mode === 'fire-before-landing') {
      assert(releaseY > 0, 'the targeted salvo is fired while still airborne');
      assert(landed.frame > firstVolley.frame && landed.frame - firstVolley.frame <= 4,
        'landing occurs during the active firing phase, not after the action');
      assert.equal(native.length, 0, 'a salvo fired from the air must never switch to the native standing launcher after landing');
      assert(observed.some(draw => draw.frame >= landed.frame && draw.frame <= landed.frame + 4
        && /\/v34\/pit\/feral-hunter\//.test(draw.src)),
        'the grounded recovery still draws a real historical Feral bitmap');
    } else {
      assert.equal(releaseY, 0, 'the targeted salvo is released after grounding');
      assert(landed.frame < firstVolley.frame, 'landing occurs before release');
      muzzle = validateMuzzle(observed, slot);
    }
    assert.deepEqual(await storage(), beforeStorage, 'all pre-existing storage entries remain untouched');
    checks.push({ name, slot, peak, triggerY: trigger.positions[slot].y, releaseY,
      releaseFrame: firstVolley.frame, landedFrame: landed.frame, nativeDrawCount: native.length, muzzle, storageUnchanged: true });
    console.log(JSON.stringify({ passed: true, name }));
    await context.close(); context = null; page = null;
  }
  assert.deepEqual(errors, []); assert.deepEqual(httpFailures, []);
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ status: 'PASS', version: 'V59', url, checks, captures, errors, httpFailures,
    scope: 'Four real keyboard jumps and shots: both facings, release before landing versus landing before release. Passive Canvas provenance, physical bolt origins and unchanged storage; no injected combat state.',
    visualInspection: 'Pending independent capture inspection.' }, null, 2));
} catch (error) {
  if (page) await shot('failure').catch(() => {});
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ status: 'FAIL', url, checks, captures, errors, httpFailures,
    error: String(error.stack || error), diagnostic, state: page ? await read().catch(() => null) : null }, null, 2));
  throw error;
} finally {
  await context?.close().catch(() => {});
  await browser.close();
}
