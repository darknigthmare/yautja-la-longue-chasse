import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { campaignFixture, enterCampaignDeck } from './campaign-browser-helpers.mjs';
import { choosePitFighter, choosePitStage, closePitSelectionOptions, returnPitSelection } from './pit-selection-browser-helpers.mjs';

const url = process.env.V58_FERAL_QA_URL || 'http://localhost:4177';
const output = process.env.V58_FERAL_QA_OUTPUT || 'work-local/v58/qa/feral-bolts';
await fs.mkdir(output, { recursive: true });
const bundle = await build({ stdin: { contents: 'export {PIT_FERAL_UNMASKED_VARIANTS, PIT_FERAL_GUIDED_BOLTS} from "./app/game/systems/pitFeralBoltsV58";', resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const model = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const variants = [{ id: 'feral-avec-casque-b99fbf82fe', guided: true }, ...model.PIT_FERAL_UNMASKED_VARIANTS.map(id => ({ id, guided: false }))];
assert.equal(variants.length, 4, 'one reviewed masked costume plus every explicitly reviewed unmasked costume');
const checks = [], captures = [], errors = [], consoleErrors = [], httpFailures = [];
const browser = await chromium.launch({ channel: process.env.V58_FERAL_QA_CHANNEL || 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const fixture = structuredClone(await campaignFixture()); fixture.save.settings.screenShake = false;
await context.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), fixture);
await context.addInitScript(() => {
  // Passive observation of blocked contact rings, not combat-state injection.
  window.__feralV58BlockedRings = [];
  const proto = CanvasRenderingContext2D.prototype;
  const beginPath = proto.beginPath, arc = proto.arc, stroke = proto.stroke, paths = new WeakMap();
  proto.beginPath = function (...args) { paths.delete(this); return beginPath.apply(this, args); };
  proto.arc = function (...args) { paths.set(this, args); return arc.apply(this, args); };
  proto.stroke = function (...args) {
    const shape = paths.get(this);
    if (this.canvas.dataset.pitFighterPositions && this.strokeStyle === '#7cebdd' && this.lineWidth === 5 && shape && shape[2] >= 10 && shape[2] < 55) {
      window.__feralV58BlockedRings.push({ radius: shape[2], frame: Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame) });
    }
    return stroke.apply(this, args);
  };
});
const page = await context.newPage(); page.setDefaultTimeout(45000);
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('response', response => { if (response.status() >= 400) httpFailures.push({ status: response.status(), url: response.url() }); });
const storage = () => page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
const read = () => page.evaluate(() => {
  const root = document.querySelector('[data-pit-immersive]'), canvas = root?.querySelector('canvas[data-pit-technique-entities]');
  return {
    frame: Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame),
    entities: JSON.parse(canvas?.dataset.pitTechniqueEntities || '[]'),
    plasma: Number(canvas?.dataset.pitPlasmaCount),
    positions: JSON.parse(canvas?.dataset.pitFighterPositions || '[]'),
    life: [...root?.querySelectorAll('[role="progressbar"][aria-label^="Vie de"]') || []].map(el => Number(el.getAttribute('aria-valuenow'))),
    statuses: [...root?.querySelectorAll('[aria-label^="États de"]') || []].map(el => el.textContent),
    variants: [...root?.querySelectorAll('[data-pit-bitmap-variant]') || []].map(el => el.dataset.pitBitmapVariant),
    announcement: root?.querySelector('[data-pit-announcement]')?.textContent ?? '',
  };
});
const shot = async name => { await page.screenshot({ path: path.join(output, name + '.png') }); captures.push(name + '.png'); };
const safeState = state => {
  assert.equal(state.plasma, 0, 'physical bolts must not instantiate plasma');
  assert(state.statuses.every(status => !status.includes('IMMOBILISÉ')), 'the removed floor-trap pin status must never appear');
  assert(state.entities.every(entity => entity.techniqueId === model.PIT_FERAL_GUIDED_BOLTS.id && entity.bolt), 'only the new physical-bolt recipe is present');
};
const record = (name, detail) => { checks.push({ name, ...detail }); console.log(JSON.stringify({ passed: true, name })); };
async function select(slot, variantId) {
  for (const [fighterSlot, id] of (slot === 0 ? ['feral-hunter', 'city-hunter'] : ['city-hunter', 'feral-hunter']).entries()) {
    await choosePitFighter(page, id);
    if (fighterSlot === slot) await page.locator('[data-pit-variant-select]').selectOption(variantId);
    await page.locator('[data-pit-selection-confirm]').click();
  }
  await choosePitStage(page, 'the-pit');
  await page.waitForFunction(() => document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus === 'ready');
  await page.locator('[data-pit-selection-confirm]').click();
  await page.waitForFunction(() => document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase === 'fight');
  await page.locator('[data-pit-immersive]').focus();
}
try {
  await enterCampaignDeck(page, { url });
  assert.equal(await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version'), process.env.V58_FERAL_QA_VERSION || 'V58');
  await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
  await closePitSelectionOptions(page);
  await page.getByRole('radio', { name: /^Versus local/ }).click();
  const before = await storage();
  let clockInstalled = false;
  for (const variant of variants) for (const slot of [0, 1]) {
    await select(slot, variant.id);
    if (!clockInstalled) { await page.clock.install(); clockInstalled = true; }
    await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 200));
    // Make flight long enough to observe real acquisition, motion and pause separately.
    await page.keyboard.down('ArrowLeft'); await page.keyboard.down('Numpad6');
    await page.clock.runFor(1800);
    await page.keyboard.up('ArrowLeft'); await page.keyboard.up('Numpad6');
    await page.clock.runFor(32);
    const initial = await read();
    assert.equal(initial.variants[slot], variant.id);
    assert(Math.abs(initial.positions[0].x - initial.positions[1].x) > 650);
    await page.evaluate(() => { window.__feralV58BlockedRings = []; });
    const attack = slot === 0 ? 'KeyU' : 'Numpad7';
    await page.keyboard.down(attack); await page.clock.runFor(32); await page.keyboard.up(attack);
    let launched;
    for (let tick = 0; tick < 120; tick++) {
      await page.clock.runFor(16); launched = await read(); safeState(launched);
      if (launched.entities.length === 3) break;
    }
    assert.equal(launched.entities.length, 3, 'one user input must create three physical bolts');
    assert.deepEqual(launched.entities.map(entity => entity.bolt.index).sort(), [0, 1, 2]);
    assert.equal(new Set(launched.entities.map(entity => entity.bolt.volleyId)).size, 1);
    assert(launched.entities.every(entity => entity.ownerSlot === slot && entity.bolt.guided === variant.guided));
    assert(launched.entities.every(entity => Math.abs(Math.hypot(entity.bolt.velocityX, entity.bolt.velocityY) - model.PIT_FERAL_GUIDED_BOLTS.speed) < .000001));
    if (variant.guided) assert(launched.entities.every(entity => Math.abs(entity.bolt.targetX - initial.positions[1 - slot].x) < .02));
    else assert(launched.entities.every(entity => entity.bolt.velocityY === 0 && Math.sign(entity.bolt.velocityX) === (slot === 0 ? 1 : -1)));
    await shot(`${variant.id}-slot-${slot}-physical-flight`);
    await page.keyboard.press('Escape');
    await page.locator('[data-pit-immersive][data-pit-paused="true"]').waitFor();
    const paused = await read(); await page.clock.runFor(400);
    assert.deepEqual(await read(), paused, 'pause must freeze flight, acquisition, positions and combat frame');
    await page.keyboard.press('Escape');
    await page.locator('[data-pit-immersive][data-pit-paused="false"]').waitFor();
    await page.locator('[data-pit-immersive]').focus();
    // The opposing player moves after acquisition, using their actual controller key.
    const movement = slot === 0 ? 'Numpad4' : 'ArrowRight';
    await page.keyboard.down(movement); await page.clock.runFor(64); await page.keyboard.up(movement);
    const moved = await read(); safeState(moved);
    assert(Math.abs(moved.positions[1 - slot].x - launched.positions[1 - slot].x) > 2, 'target must really move after launch');
    assert.equal(moved.entities.length, 3, 'movement check occurs while all three bolts are still flying');
    for (const entity of moved.entities) {
      const original = launched.entities.find(item => item.id === entity.id);
      assert(original, 'no replacement entity during the same volley');
      assert.deepEqual(entity.bolt, original.bolt, 'the acquired point and velocity must not chase the moving opponent');
      assert.notEqual(entity.x, original.x, 'projectile advances in world space');
    }
    const guard = slot === 0 ? 'Numpad9' : 'KeyI';
    await page.keyboard.down(guard);
    const sampled = [];
    for (let tick = 0; tick < 150; tick++) {
      await page.clock.runFor(16);
      const state = await read(); safeState(state); sampled.push(state);
      if (tick === 16 && state.entities.length === 3) await shot(`${variant.id}-slot-${slot}-mid-flight`);
      if (!state.entities.length) break;
    }
    await page.keyboard.up(guard);
    assert.equal(sampled.at(-1).entities.length, 0, 'bolts resolve or expire normally');
    const blocked = await page.evaluate(() => window.__feralV58BlockedRings);
    assert(blocked.length > 0, 'the held guard must block an actual bolt impact');
    const damage = initial.life[1 - slot] - sampled.at(-1).life[1 - slot];
    assert(damage > 0 && damage < 40, 'only limited residual damage through guard');
    assert.equal(sampled.at(-1).life[slot], initial.life[slot]);
    assert.deepEqual(await storage(), before, 'free-match verification must not write settings or progression');
    record(`${variant.id}-slot-${slot}`, { variant: variant.id, guided: variant.guided, slot, volley: launched.entities,
      movedTarget: moved.positions[1 - slot], pauseFrame: paused.frame, blockedContactFrames: [...new Set(blocked.map(event => event.frame))], residualDamage: damage, samples: sampled.length });
    await page.clock.resume();
    await returnPitSelection(page);
    assert.deepEqual(await storage(), before);
  }
  assert.deepEqual(errors, []); assert.deepEqual(consoleErrors, []); assert.deepEqual(httpFailures, []);
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ status: 'PASS', version: 'V58', versionUiVerified: true, url, checks, captures, errors, consoleErrors, httpFailures,
    scope: 'Eight local versus bouts through the real roster, explicit masked/unmasked variants on both sides, real keyboard inputs, controlled clock, passive Canvas telemetry and blocked-ring observations. No combat-state injection; every localStorage entry unchanged.',
    artLimit: 'Thin temporary metallic vector bolts without glow; no claim of a native isolated lore-certified weapon sprite.', visualInspection: 'pending screenshot review' }, null, 2));
} catch (error) {
  await shot('failure').catch(() => {});
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ url, checks, captures, errors, consoleErrors, httpFailures, error: String(error.stack || error), state: await read().catch(() => null) }, null, 2));
  throw error;
} finally { await browser.close(); }
