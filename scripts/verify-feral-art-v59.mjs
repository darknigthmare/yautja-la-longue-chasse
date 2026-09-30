import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { campaignFixture, enterCampaignDeck } from './campaign-browser-helpers.mjs';
import { choosePitFighter, choosePitStage, closePitSelectionOptions, returnPitSelection } from './pit-selection-browser-helpers.mjs';

const url = process.env.V59_FERAL_ART_QA_URL || 'http://localhost:4177';
const output = process.env.V59_FERAL_ART_QA_OUTPUT || 'work-local/v59/qa/feral-art';
const metadata = JSON.parse(await fs.readFile('app/game/data/pitFeralArtV59.json', 'utf8'));
const atlasId = 'feral-actions-v59';
const actions = ['launcher', 'shield'];
const actionClip = action => action === 'launcher' ? 'pit.stand.technique.feral-guided-bolts-v58' : 'pit.stand.heavy';
const actionKey = (action, slot) => action === 'launcher' ? (slot ? 'Numpad7' : 'KeyU') : (slot ? 'Numpad5' : 'KeyL');
const variants = ['feral-avec-casque-b99fbf82fe', 'feral-sans-casque-75100c4c5e',
  'feral-bear-blood-sans-casque-2eb5851afc', 'feral-camo-reveal-sans-casque-8b307ed73e'];
for (const action of actions) for (const facing of ['right', 'left']) {
  const record = metadata.records.find(record => record.action === action && record.facing === facing);
  assert(record, `missing declared ${action}/${facing} native art`);
  assert.equal(record.frames.length, 4, 'the reviewed contract is four native drawings per action/facing');
}
assert.equal(metadata.records.length, 4);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.V59_FERAL_ART_QA_CHANNEL || 'chrome', headless: true });
const checks = [], captures = [], errors = [], httpFailures = [];
let context, page, clockInstalled = false;
const storage = () => page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
const shot = async name => { await page.screenshot({ path: path.join(output, `${name}.png`) }); captures.push(`${name}.png`); };
const read = () => page.evaluate(() => {
  const root = document.querySelector('[data-pit-immersive]');
  const canvas = root?.querySelector('canvas[data-pit-technique-entities]');
  const native = document.querySelector('[data-pit-feral-native-art]');
  return {
    frame: Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame),
    engineVersion: root?.dataset.pitEngineVersion ?? canvas?.dataset.pitEngineVersion ?? null,
    presentation: root?.dataset.pitPresentationPhase,
    nativeStatus: native?.dataset.pitFeralNativeArt,
    entities: JSON.parse(canvas?.dataset.pitTechniqueEntities || '[]'),
    positions: JSON.parse(canvas?.dataset.pitFighterPositions || '[]'),
    variants: [...root?.querySelectorAll('[data-pit-bitmap-variant]') || []].map(el => el.dataset.pitBitmapVariant),
    life: [...root?.querySelectorAll('[role="progressbar"][aria-label^="Vie de"]') || []].map(el => Number(el.getAttribute('aria-valuenow'))),
    plasma: Number(canvas?.dataset.pitPlasmaCount),
  };
});
const draws = () => page.evaluate(() => window.__feralArtV59.draws);
const clearDraws = () => page.evaluate(() => { window.__feralArtV59.draws = []; window.__feralArtV59.genericCues = []; });
function record(name, detail = {}) { checks.push({ name, ...detail }); console.log(JSON.stringify({ passed: true, name })); }

async function createContext(reducedMotion = 'no-preference', blockedPath = null) {
  context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion });
  clockInstalled = false;
  const fixture = structuredClone(await campaignFixture());
  fixture.save.settings.screenShake = false;
  await context.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), fixture);
  await context.addInitScript(records => {
    // The game validates PNGs into offscreen canvases. Track their source URL
    // through drawImage without changing pixels, input, simulation or storage.
    const sources = new WeakMap(), original = CanvasRenderingContext2D.prototype.drawImage;
    window.__feralArtV59 = { draws: [], blocks: [], genericCues: [] };
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      const result = original.apply(this, args);
      const source = args[0];
      const src = source instanceof HTMLImageElement
        ? new URL(source.currentSrc || source.src, location.href).pathname : sources.get(source);
      const art = records.find(record => record.src === src);
      if (art) {
        const combatCanvas = this.canvas.matches('canvas[data-pit-technique-entities]');
        const labCanvas = this.canvas.closest('[data-pit-production-lab]');
        if (!combatCanvas && !labCanvas) sources.set(this.canvas, src);
        if ((combatCanvas || labCanvas) && args.length === 9 && window.__feralArtV59.draws.length < 20000) {
          const rect = args.slice(1, 5), m = this.getTransform();
          const frameIndex = art.frames.findIndex(frame => frame.rect.every((value, index) => value === rect[index]));
          window.__feralArtV59.draws.push({ src, action: art.action, facing: art.facing, frameIndex, rect,
            destination: args.slice(5), matrix: [m.a, m.b, m.c, m.d],
            frame: Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame),
            lab: Boolean(labCanvas), entities: JSON.parse(this.canvas.dataset.pitTechniqueEntities || '[]'),
            positions: JSON.parse(this.canvas.dataset.pitFighterPositions || '[]') });
        }
      }
      return result;
    };
    const proto = CanvasRenderingContext2D.prototype;
    const beginPath = proto.beginPath, arc = proto.arc, stroke = proto.stroke, paths = new WeakMap();
    proto.beginPath = function (...args) { paths.delete(this); return beginPath.apply(this, args); };
    proto.arc = function (...args) { paths.set(this, args); return arc.apply(this, args); };
    proto.stroke = function (...args) {
      const shape = paths.get(this);
      if (this.canvas.dataset.pitFighterPositions &&
        ((this.strokeStyle === '#fff2bf' && this.lineWidth === 4) ||
          (this.strokeStyle === '#f7ce79' && this.lineWidth === 2))) {
        window.__feralArtV59.genericCues.push({ color: this.strokeStyle, frame: Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame) });
      }
      if (this.canvas.dataset.pitFighterPositions && this.strokeStyle === '#7cebdd' && this.lineWidth === 5 && shape && shape[2] >= 10 && shape[2] < 55) {
        window.__feralArtV59.blocks.push({ radius: shape[2], frame: Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame) });
      }
      return stroke.apply(this, args);
    };
  }, metadata.records);
  page = await context.newPage(); page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !(blockedPath && message.text().includes('503'))) errors.push(message.text());
  });
  page.on('response', response => {
    if (response.status() >= 400 && !(response.status() === 503 && new URL(response.url()).pathname === blockedPath)) {
      httpFailures.push({ status: response.status(), url: response.url() });
    }
  });
}
async function openSelection() {
  await enterCampaignDeck(page, { url });
  assert.equal(await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version'), 'V59');
  await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
  await closePitSelectionOptions(page);
  await page.getByRole('radio', { name: /^Versus local/ }).click();
}
async function select(slot, variant = '', waitForFight = true) {
  for (const [fighterSlot, id] of (slot === 0 ? ['feral-hunter', 'city-hunter'] : ['city-hunter', 'feral-hunter']).entries()) {
    await choosePitFighter(page, id);
    if (fighterSlot === slot) await page.locator('[data-pit-variant-select]').selectOption(variant);
    await page.locator('[data-pit-selection-confirm]').click();
  }
  await choosePitStage(page, 'the-pit');
  await page.waitForFunction(() => document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus === 'ready');
  await page.locator('[data-pit-selection-confirm]').click();
  if (waitForFight) {
    await page.waitForFunction(() => document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase === 'fight');
    await page.locator('[data-pit-immersive]').focus();
  }
}
async function controlClock() {
  if (!clockInstalled) { await page.clock.install(); clockInstalled = true; }
  await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 200));
}
async function separateFighters() {
  const initial = await read();
  await page.keyboard.down('ArrowLeft'); await page.keyboard.down('Numpad6');
  try {
    // A newly mounted React simulation may schedule its first rAF after a large
    // fake-clock advance has already ended. Yield between bounded small steps
    // and observe real world positions instead of assuming 1400 ms was played.
    for (let step = 0; step < 100; step++) {
      await page.clock.runFor(32);
      const current = await read();
      if (Math.abs(current.positions[0].x - current.positions[1].x) > 650) break;
    }
  } finally {
    await page.keyboard.up('ArrowLeft'); await page.keyboard.up('Numpad6');
  }
  await page.clock.runFor(32);
  const state = await read();
  assert(state.frame > initial.frame, 'actual combat frames advance during separation');
  assert(Math.abs(state.positions[0].x - state.positions[1].x) > 600, 'native actions are observed away from an interrupting opponent');
}
async function press(key) { await page.keyboard.down(key); await page.clock.runFor(32); await page.keyboard.up(key); }
function verifyNativeMuzzle(observed, slot) {
  const record = metadata.records.find(record => record.action === 'launcher' && record.facing === (slot ? 'left' : 'right'));
  assert(record.muzzle, 'the native muzzle is explicitly measured in the source metadata');
  const frame = record.frames[record.muzzle.frameIndex];
  const scale = 119 / record.bodyHeight;
  const samples = observed.filter(draw => draw.frameIndex === record.muzzle.frameIndex &&
    draw.entities.some(entity => entity.ownerSlot === slot && entity.bolt?.index === 1));
  assert(samples.length > 0, 'an active native launcher frame must be observed with its central physical bolt');
  const results = samples.map(draw => {
    const entity = draw.entities.find(entity => entity.ownerSlot === slot && entity.bolt?.index === 1);
    const owner = draw.positions[slot];
    const expected = { x: owner.x + (record.muzzle.point[0] - frame.pivot[0]) * scale,
      y: owner.y + (frame.pivot[1] - record.muzzle.point[1]) * scale };
    assert(Math.abs(draw.destination[2] / draw.rect[2] - scale) < .000001 &&
      Math.abs(draw.destination[3] / draw.rect[3] - scale) < .000001,
    'native body rendering uses the same measured 119/bodyHeight scale');
    // Entity age is public telemetry, not a guessed wall-clock delay. Allow one
    // simulation tick around the spawn/advance render boundary, but never enough
    // tolerance to pass the old torso origin (>100 units behind this muzzle).
    const candidates = [-1, 0, 1].map(offset => {
      const ticks = Math.max(0, entity.age + offset);
      const reconstructed = { x: entity.x + 11 - entity.bolt.velocityX * ticks,
        y: entity.y + 2.5 - entity.bolt.velocityY * ticks };
      return { ticks, reconstructed, distance: Math.hypot(reconstructed.x - expected.x, reconstructed.y - expected.y) };
    }).sort((a, b) => a.distance - b.distance);
    assert(candidates[0].distance < .04, `physical bolt origin must meet the native launcher muzzle (${candidates[0].distance})`);
    return { frame: draw.frame, entityAge: entity.age, expected, ...candidates[0] };
  });
  return { facing: record.facing, source: record.src, muzzlePoint: record.muzzle.point, scale,
    samples: results.length, first: results[0], maximumOriginError: Math.max(...results.map(result => result.distance)) };
}
async function verifyNativeAction(action, slot, suffix) {
  await page.clock.runFor(1100);
  await clearDraws();
  await press(actionKey(action, slot));
  const observedIndices = new Set();
  let pauseChecked = false, sawPhysicalVolley = false;
  for (let tick = 0; tick < 100; tick++) {
    await page.clock.runFor(16);
    const observed = (await draws()).filter(draw => !draw.lab && draw.action === action);
    for (const drawing of observed) {
      if (!observedIndices.has(drawing.frameIndex)) {
        observedIndices.add(drawing.frameIndex);
        await shot(`${suffix}-${action}-drawing-${drawing.frameIndex}`);
      }
      if (action === 'launcher' && drawing.entities.some(entity => entity.bolt)) sawPhysicalVolley = true;
    }
    if (!pauseChecked && observed.length) {
      await page.keyboard.press('Escape');
      await page.locator('[data-pit-immersive][data-pit-paused="true"]').waitFor();
      const paused = await read();
      await page.clock.runFor(300);
      assert.deepEqual(await read(), paused, 'pause freezes action frame, body positions and physical projectiles');
      await page.keyboard.press('Escape');
      await page.locator('[data-pit-immersive][data-pit-paused="false"]').waitFor();
      await page.locator('[data-pit-immersive]').focus();
      pauseChecked = true;
    }
  }
  const observed = (await draws()).filter(draw => !draw.lab && draw.action === action);
  assert.deepEqual([...observedIndices].sort(), [0, 1, 2, 3], `${action} must actually render all four native drawings`);
  assert(pauseChecked);
  assert(observed.every(draw => draw.facing === (slot ? 'left' : 'right')), 'each slot uses its independently drawn facing');
  assert(observed.every(draw => draw.matrix[0] > 0 && draw.matrix[3] > 0 && draw.matrix[1] === 0 && draw.matrix[2] === 0), 'no runtime mirror or weapon/body rotation');
  assert(observed.every(draw => draw.frameIndex >= 0), 'every crop corresponds to a reviewed native frame');
  assert.deepEqual(await page.evaluate(() => window.__feralArtV59.genericCues), [],
    'native attacks must not draw a second procedural slash or anticipation marker over the supplied action');
  assert.equal((await read()).plasma, 0);
  if (action === 'launcher') assert(sawPhysicalVolley, 'launcher artwork accompanies real physical projectiles');
  const muzzle = action === 'launcher' ? verifyNativeMuzzle(observed, slot) : null;
  const state = await read();
  if (state.engineVersion !== null) assert.equal(Number(state.engineVersion), 10, 'the served native muzzle recipe is engine V10');
  record(`${suffix}-${action}`, { slot, drawings: [...observedIndices], nativeSources: [...new Set(observed.map(draw => draw.src))], samples: observed.length, pauseChecked, sawPhysicalVolley, muzzle, engineVersion: state.engineVersion });
}
async function verifyPointBlankGuard(slot, suffix) {
  await page.clock.runFor(1100);
  await page.keyboard.down('ArrowRight'); await page.keyboard.down('Numpad4');
  await page.clock.runFor(1500);
  await page.keyboard.up('ArrowRight'); await page.keyboard.up('Numpad4');
  const guardKey = slot ? 'KeyI' : 'Numpad9';
  await page.keyboard.down(guardKey); await page.clock.runFor(48);
  const before = await read();
  const gap = Math.abs(before.positions[slot].x - before.positions[1 - slot].x);
  assert(gap > 0 && gap < 80, 'actual movement puts the defender closer than the long native muzzle');
  await page.evaluate(() => { window.__feralArtV59.blocks = []; });
  await press(actionKey('launcher', slot));
  let capturedContact = false;
  for (let tick = 0; tick < 60; tick++) {
    await page.clock.runFor(16);
    if (!capturedContact && await page.evaluate(() => window.__feralArtV59.blocks.length > 0)) {
      await shot(`${suffix}-point-blank-guard`); capturedContact = true;
    }
  }
  await page.keyboard.up(guardKey);
  const after = await read(), blocks = await page.evaluate(() => window.__feralArtV59.blocks);
  const damage = before.life[1 - slot] - after.life[1 - slot];
  assert(blocks.length > 0, 'the point-blank guard must block real launch contact even when the muzzle extends past the defender');
  assert(damage > 0 && damage < 40, 'point-blank guard receives only bounded residual damage');
  assert.equal(after.life[slot], before.life[slot]);
  assert.equal(after.plasma, 0);
  record(`${suffix}-point-blank-guard`, { slot, initialGap: gap, blockedContactFrames: [...new Set(blocks.map(block => block.frame))], residualDamage: damage });
}

try {
  await createContext();
  await page.goto(url + '/pit-lab', { waitUntil: 'networkidle' });
  await page.getByLabel('Combattant', { exact: true }).selectOption('feral-hunter');
  await page.getByLabel('Atlas validé', { exact: true }).selectOption(atlasId);
  for (const facing of ['right', 'left']) for (const action of actions) {
    await page.getByLabel('Orientation', { exact: true }).selectOption(facing);
    const seen = new Set();
    for (const phase of ['startup', 'active', 'recovery']) {
      await clearDraws();
      await page.getByLabel('Clip / phase', { exact: true }).selectOption(`${actionClip(action)}.${phase}`);
      await page.waitForFunction(() => document.querySelector('[data-pit-production-lab]')?.dataset.renderStatus === 'ready');
      await page.getByRole('button', { name: 'Début', exact: true }).click();
      await page.waitForTimeout(80);
      const increment = page.getByRole('button', { name: '+1 dessin', exact: true });
      while (!(await increment.isDisabled())) { await increment.click(); await page.waitForTimeout(80); }
      const observed = (await draws()).filter(draw => draw.lab);
      assert(observed.length > 0 && observed.every(draw => draw.action === action && draw.facing === facing && draw.frameIndex >= 0));
      observed.forEach(draw => seen.add(draw.frameIndex));
      assert.equal(await page.locator('[data-pit-production-lab]').getAttribute('data-held-stance'), 'false');
      await shot(`lab-${facing}-${action}-${phase}`);
    }
    assert.deepEqual([...seen].sort(), [0, 1, 2, 3]);
    record(`lab-${action}-${facing}`, { drawings: [...seen] });
  }
  await context.close(); context = null; page = null;

  for (const reducedMotion of ['no-preference', 'reduce']) {
    await createContext(reducedMotion);
    await openSelection();
    const before = await storage();
    for (const slot of [0, 1]) {
      await select(slot);
      assert.equal((await read()).nativeStatus, 'ready');
      assert.equal((await read()).variants[slot], 'default');
      await controlClock();
      await separateFighters();
      for (const action of actions) await verifyNativeAction(action, slot, `combat-${reducedMotion}-slot-${slot}`);
      await verifyPointBlankGuard(slot, `combat-${reducedMotion}-slot-${slot}`);
      assert.deepEqual(await storage(), before, 'local versus does not mutate settings or progression');
      await page.clock.resume();
      await returnPitSelection(page);
    }
    await context.close(); context = null; page = null;
  }

  // Supplied masked/unmasked costumes must retain their own identity. Native
  // drawings of the default Feral must never silently replace those costumes.
  await createContext();
  await openSelection();
  const beforeVariants = await storage();
  for (const variant of variants) for (const slot of [0, 1]) {
    await select(slot, variant);
    assert.equal((await read()).variants[slot], variant);
    assert.equal((await read()).nativeStatus, 'not-required');
    await controlClock(); await separateFighters(); await clearDraws();
    for (const action of actions) {
      await press(actionKey(action, slot)); await page.clock.runFor(1100);
    }
    assert.deepEqual(await draws(), [], 'no default-body V59 frame is drawn for a supplied costume');
    assert.deepEqual(await storage(), beforeVariants);
    await shot(`costume-preserved-${variant}-slot-${slot}`);
    record(`costume-preserved-${variant}-slot-${slot}`, { variant, slot });
    await page.clock.resume(); await returnPitSelection(page);
  }
  await context.close(); context = null; page = null;

  // Fail an opposite-facing sheet for each action in a cold context. The gate
  // must require the complete declared atlas, not only the visible side.
  for (const [action, slot] of [['launcher', 0], ['shield', 1]]) {
    const missingFacing = slot ? 'right' : 'left';
    const blockedPath = metadata.records.find(record => record.action === action && record.facing === missingFacing).src;
    await createContext('no-preference', blockedPath);
    let intentionalFailures = 0;
    const fail = async route => { intentionalFailures++; await route.fulfill({ status: 503, contentType: 'text/plain', body: 'Intentional V59 native Feral QA failure' }); };
    await context.route('**' + blockedPath, fail);
    await openSelection();
    const before = await storage();
    await select(slot, '', false);
    await page.locator('[data-pit-feral-art-retry]').waitFor();
    assert.equal((await read()).nativeStatus, 'missing');
    assert(intentionalFailures > 0);
    await controlClock();
    const blocked = await read();
    await press(actionKey(action, slot)); await page.clock.runFor(500);
    assert.deepEqual(await read(), blocked, 'an unavailable declared native page freezes introduction and combat');
    assert.equal(blocked.entities.length, 0);
    await shot(`missing-${action}-${missingFacing}`);
    await context.unroute('**' + blockedPath, fail);
    await page.clock.resume();
    await page.locator('[data-pit-feral-art-retry]').click();
    await page.waitForFunction(() => document.querySelector('[data-pit-feral-native-art]')?.dataset.pitFeralNativeArt === 'ready'
      && document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase === 'fight');
    assert.equal(await page.locator('[data-pit-match-loading]').count(), 0);
    await page.locator('[data-pit-immersive]').focus();
    await controlClock(); await separateFighters();
    await verifyNativeAction(action, slot, `recovered-${action}-${missingFacing}`);
    assert.deepEqual(await storage(), before);
    record(`retry-${action}-${missingFacing}`, { blockedPath, intentionalFailures, blockedFrame: blocked.frame, recovered: true });
    await context.close(); context = null; page = null;
  }
  assert.deepEqual(errors, []); assert.deepEqual(httpFailures, []);
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ status: 'PASS', version: 'V59', url, checks, captures, errors, httpFailures,
    scope: 'Native Feral launcher and shield: all four drawings in both facings, lab and real keyboard combat, both slots, reduced motion, pause, measured muzzle/physical projectile alignment, point-blank standing guard, eight supplied-costume exclusions and two cold-context missing-page retries. Passive Canvas provenance only; no combat-state injection. All localStorage entries preserved.',
    visualInspection: 'Pending independent screenshot review; passing runtime evidence does not certify 1:1 lore fidelity.' }, null, 2));
} catch (error) {
  if (page) await shot('failure').catch(() => {});
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ status: 'FAIL', url, checks, captures, errors, httpFailures,
    error: String(error.stack || error), state: page ? await read().catch(() => null) : null,
    draws: page ? (await draws().catch(() => []))?.slice(-30) : null }, null, 2));
  throw error;
} finally {
  await context?.close().catch(() => {});
  await browser.close();
}
