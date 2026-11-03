/** Public local-versus V104 normal-recipe journeys. Canvas observation is passive: no actor,
 * action, campaign, input binding or sprite registry is changed by this recipe. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { choosePitFighter, choosePitStage, closePitSelectionOptions, openPitSelectionOptions } from './pit-selection-browser-helpers.mjs';

const baseUrl = process.env.YAUTJA_QA_BASE_URL ?? 'http://127.0.0.1:3000';
const output = path.resolve(process.env.YAUTJA_PIT_NORMALS_QA_OUTPUT ?? 'outputs/qa-v104/pit-normals');
const domains = new Set((process.env.YAUTJA_PIT_NORMALS_QA_DOMAINS ?? 'native,costumes,mixed').split(','));
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(baseUrl).hostname), 'Local QA target required');
await fs.mkdir(output, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const bundle = await build({ stdin: { contents: `export { PIT_WORKBOOK_ADMISSIONS_V100, PIT_WORKBOOK_PLAN_V100 } from './app/game/pitWorkbookAnimationV100'; export { PIT_WORKBOOK_NORMALS_V104 } from './app/game/systems/pitWorkbookNormalsV104'; export { PIT_WORKBOOK_NORMAL_REGISTRY_V104 } from './app/game/pitWorkbookNormalRegistryV104'; export { PIT_FIGHTERS, PIT_ARENAS } from './app/game/systems/pitCombat'; export { processHunterSpriteTransparency } from './app/game/hunterSpriteAtlas'; export { measureSpriteContact } from './app/game/spriteContact';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'node', target: 'es2022', logLevel: 'silent' });
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const roster = JSON.parse(await fs.readFile('app/game/data/pitUserHuntersV44.json', 'utf8'));
const entries = api.PIT_WORKBOOK_NORMALS_V104.map(move => {
  const admitted = api.PIT_WORKBOOK_ADMISSIONS_V100.find(entry => entry.fighterId === move.fighterId && entry.actionId === move.actionId);
  const definition = api.PIT_WORKBOOK_NORMAL_REGISTRY_V104.find(entry => entry.fighterId === move.fighterId && entry.atlas.clips.some(clip => clip.id.includes('.' + move.key + '.')));
  return {...admitted, definition, atlasId: definition.atlas.id, combatClipIds: [...new Set(definition.atlas.clips.map(clip => clip.id))]};
});
assert.ok(entries.length > 0, 'At least one newly linked native action is required');
const phases = ['startup', 'active', 'recovery'];
const variants = Object.fromEntries(['feral-hunter', 'scar'].map(id => [id, roster.fighters.find(fighter => fighter.id === id).variants]));
const pages = [...new Map(entries.flatMap(entry => entry.definition.atlas.pages).map(page => [page.src, page])).values()];
const nativeSources = new Set(pages.map(page => page.src));
// Read-only measurement of the exact native alpha after the runtime transparency
// contract. The renderer registers at most 2%-cell support padding; raised poses
// retain their authored pivot. This does not edit or emit any image.
const measuredPages = new Map(), contactOffsets = new Map();
for (const page of pages) {
  const {data, info} = await sharp(path.join('public', page.src)).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  const processed = api.processHunterSpriteTransparency(new Uint8ClampedArray(data), info.width, info.height, page.transparency);
  measuredPages.set(page.src, {pixels: processed.pixels, width: info.width});
}
function contactOffset(src, rect, pivotY) {
  const key = JSON.stringify([src, rect, pivotY]);
  if (!contactOffsets.has(key)) {
    const page = measuredPages.get(src), [x, y, w, h] = rect, crop = new Uint8ClampedArray(w * h * 4);
    for (let row = 0; row < h; row++) crop.set(page.pixels.subarray(((y + row) * page.width + x) * 4, ((y + row) * page.width + x + w) * 4), row * w * 4);
    contactOffsets.set(key, api.measureSpriteContact(crop, w, h, pivotY)?.offsetY ?? 0);
  }
  return contactOffsets.get(key);
}

const inputs = [{ light: 'KeyJ', medium: 'KeyK', heavy: 'KeyL', down: 'ArrowDown', jump: 'Space' }, { light: 'Numpad1', medium: 'Numpad3', heavy: 'Numpad5', down: 'Numpad2', jump: 'Numpad8' }];
const files = [...new Set(['app/game/buildInfo.ts', 'app/game/PitCanvas.tsx', 'app/game/PitSelectionFlow.tsx', 'app/game/pitWorkbookAnimationV100.ts', 'app/game/pitWorkbookCombatRegistryV100.ts', 'app/game/pitSpriteSheetRegistry.ts', 'app/game/pitSpriteSheetAnimation.ts', 'app/game/hunterSpriteMotion.ts', 'app/game/systems/pitCombat.ts', 'app/game/systems/controlBindings.ts', 'app/game/data/pitWorkbookAnimationsV100.json', 'app/game/data/pitUserHuntersV44.json', 'app/game/systems/pitWorkbookNormalsV104.ts', 'app/game/pitWorkbookNormalRegistryV104.ts', 'app/game/systems/pitReplay.ts', 'app/game/systems/pitTraining.ts', ...pages.map(page => path.join('public', page.src)), ...Object.values(variants).flat().map(variant => path.join('public', variant.src))])];
const snapshot = () => Promise.all(files.map(async file => ({ file, sha256: sha(await fs.readFile(file)) })));
const before = await snapshot();
const checks = [], captures = [], observations = [], movements = [], served = [], errors = [], fixtures = [];
function check(name, condition, detail) { checks.push({ name, status: condition ? 'PASS' : 'FAIL', ...(detail ? { detail } : {}) }); assert.ok(condition, name); }
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ?? '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
let page, context, failure;
const read = () => page.evaluate(() => {
  const root = document.querySelector('[data-pit-immersive]'), canvas = root?.querySelector('canvas[data-pit-technique-entities]');
  return { frame: Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame), presentation: root?.dataset.pitPresentationPhase,
    paused: root?.dataset.pitPaused, blocked: root?.dataset.pitSimulationBlocked, recipe: root?.dataset.pitNormalRecipe, normalMoves: JSON.parse(root?.dataset.pitNormalMoves || '[]'),
    positions: JSON.parse(canvas?.dataset.pitFighterPositions || '[]'),
    variants: [...root?.querySelectorAll('[data-pit-bitmap-variant]') || []].map(node => node.dataset.pitBitmapVariant),
    life: [...root?.querySelectorAll('[role="progressbar"][aria-label^="Vie de"]') || []].map(node => Number(node.getAttribute('aria-valuenow'))) };
});
const storage = () => page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
const draws = () => page.evaluate(() => window.__pitCombatQaV100.draws);
const clear = () => page.evaluate(() => { window.__pitCombatQaV100.draws = []; });
async function shot(file, target = page) { await target.screenshot({ path: path.join(output, file), timeout: 15000 }); captures.push({ file, viewport: page.viewportSize(), state: await read() }); }
async function openMatch(identities, appearances, label) {
  context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
  await context.addInitScript(({ native, supplied }) => {
    const wanted = new Set([...native, ...supplied]), sources = new WeakMap(), original = CanvasRenderingContext2D.prototype.drawImage;
    window.__pitCombatQaV100 = { draws: [] };
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      const result = original.apply(this, args), source = args[0];
      const src = source instanceof HTMLImageElement ? new URL(source.currentSrc || source.src, location.href).pathname : sources.get(source);
      const combat = this.canvas.matches('canvas[data-pit-technique-entities]');
      if (!combat && src) sources.set(this.canvas, src);
      if (combat && wanted.has(src) && window.__pitCombatQaV100.draws.length < 30000) {
        const matrix = this.getTransform();
        window.__pitCombatQaV100.draws.push({ src, rect: args.length === 9 ? args.slice(1, 5) : null, destination: args.length === 9 ? args.slice(5) : args.slice(1),
          matrix: [matrix.a, matrix.b, matrix.c, matrix.d], frame: Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame),
          positions: JSON.parse(this.canvas.dataset.pitFighterPositions || '[]'), actions: JSON.parse(this.canvas.dataset.pitFighterActions || '[]') });
      }
      return result;
    };
  }, { native: [...nativeSources], supplied: Object.values(variants).flat().map(variant => variant.src) });
  page = await context.newPage(); page.setDefaultTimeout(40000);
  page.on('pageerror', error => errors.push({ label, type: 'pageerror', message: error.message }));
  page.on('console', message => { if (message.type() === 'error') errors.push({ label, type: 'console.error', message: message.text() }); });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('[data-campaign-menu="main"]').waitFor();
  await page.getByRole('button', { name: /^The Pit/ }).click();
  await page.getByRole('button', { name: 'Accéder malgré les spoilers', exact: true }).click();
  await page.getByRole('button', { name: 'Entrer dans The Pit', exact: true }).click();
  await page.locator('[data-pit-selection-step="fighters"]').waitFor();
  await closePitSelectionOptions(page);
  await page.getByRole('radio', { name: /^Versus local/ }).click();
  for (const [slot, fighter] of identities.entries()) {
    await choosePitFighter(page, fighter);
    await page.locator('[data-pit-variant-select]').selectOption(appearances[slot] ?? '');
    await page.locator('[data-pit-selection-confirm]').click();
  }
  await openPitSelectionOptions(page);
  const picker = page.locator('[data-pit-workbook-normals-v104]');
  const eligibleBody = appearances.some(appearance => !appearance);
  if (eligibleBody) {
    check(`${label}: source normals require a visible explicit choice`, await picker.count() === 1 && !(await picker.isChecked()));
    await picker.check();
    const optionsText = await page.locator('[data-pit-selection-options]').innerText();
    check(`${label}: source tables belong only to the selected BODY fighters`, identities.every((identity, slot) => optionsText.includes(api.PIT_FIGHTERS[identity].name + ' · apparence BODY') === !appearances[slot]));
    await shot(`${label}-source-options.png`);
  } else check(`${label}: supplied costumes have no BODY normal opt-in`, await picker.count() === 0);
  await closePitSelectionOptions(page);
  await choosePitStage(page, 'the-pit');
  await page.waitForFunction(() => document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus === 'ready');
  await page.locator('[data-pit-selection-confirm]').click();
  await page.waitForFunction(() => { const root = document.querySelector('[data-pit-immersive]'); return root?.dataset.pitPresentationPhase === 'fight' && root.dataset.pitSimulationBlocked === 'false' && root.dataset.pitPresentationBlocked === 'false'; }, null, { timeout: 90000 });
  await page.locator('[data-pit-immersive]').focus();
  await page.clock.install(); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  const first = await read();
  check(`${label}: live match records the selected recipe`, first.recipe === (eligibleBody ? 'workbook-v104' : 'historical'));
  check(`${label}: the public local-versus launch keeps both requested appearances`, JSON.stringify(first.variants) === JSON.stringify(appearances.map(appearance => appearance || 'default')));
  await page.keyboard.down('ArrowLeft'); await page.keyboard.down('Numpad6');
  try { for (let step = 0; step < 120; step++) { await page.clock.runFor(32); const state = await read(); if (Math.abs(state.positions[0].x - state.positions[1].x) > 650) break; } }
  finally { await page.keyboard.up('ArrowLeft'); await page.keyboard.up('Numpad6'); }
  await page.clock.runFor(48); const separated = await read();
  check(`${label}: actual keyboard walking separates both real actors`, separated.frame > first.frame && separated.positions[0].x < first.positions[0].x - 50 && separated.positions[1].x > first.positions[1].x + 50 && separated.positions[1].x - separated.positions[0].x > 600, { first, separated });
  movements.push({ label, inputs: ['ArrowLeft', 'Numpad6'], first, separated });
  fixtures.push({ label, mode: 'Public Versus local, fresh browser storage; no campaign or actor fixture', identities, appearances });
  return storage();
}
async function closeMatch() { await context.close(); context = null; page = null; }
async function enterAction(entry, slot) {
  const match = /^pit\.(stand|crouch|air)\.workbook-v104\.([52j][LMH])\.(startup|active|recovery)$/.exec(entry.combatClipIds[0]);
  assert.ok(match, `Public keyboard mapping required for ${entry.actionId}`);
  await page.locator('[data-pit-immersive]').focus();
  if (match[1] === 'crouch') { await page.keyboard.down(inputs[slot].down); await page.clock.runFor(48); }
  if (match[1] === 'air') { await page.keyboard.down(inputs[slot].jump); await page.clock.runFor(48); await page.keyboard.up(inputs[slot].jump); }
  const attack = ({L: 'light', M: 'medium', H: 'heavy'})[match[2][1]];
  const key = inputs[slot][attack]; await page.keyboard.down(key); await page.clock.runFor(32); await page.keyboard.up(key);
  return { key, down: match[1] === 'crouch' ? inputs[slot].down : null };
}
async function nativeAction(entry, slot, label) {
  const facing = slot === 0 ? 'right' : 'left', definition = entry.definition;
  const expected = entry.combatClipIds.flatMap(id => {
    const clip = definition.atlas.clips.find(clip => clip.id === id && clip.facing === facing); assert.ok(clip, `${entry.actionId}/${id}/${facing}`);
    return clip.frames.map((frame, index) => { const src = definition.atlas.pages.find(page => page.id === frame.pageId).src; return { clipId: id, phase: id.split('.').at(-1), index, ...frame, src, contactOffsetY: contactOffset(src, frame.rect, frame.pivot[1]) }; });
  });
  await page.clock.runFor(700); await clear(); const starting = await read();
  const command = await enterAction(entry, slot), captured = new Set();
  let pauseChecked = false;
  for (let step = 0; step < 90; step++) {
    const observed = (await draws()).filter(draw => expected.some(frame => frame.src === draw.src));
    const latest = observed.at(-1), frame = latest && expected.find(frame => frame.src === latest.src && JSON.stringify(frame.rect) === JSON.stringify(latest.rect) && frame.phase === latest.actions[slot]?.phase && latest.actions[slot]?.normalMove === entry.actionId.split('_').at(-1));
    if (frame && !captured.has(frame.phase)) {
      captured.add(frame.phase);
      if (frame.phase === 'active') await shot(`${label}-${entry.actionId}-${facing}-${frame.phase}.png`, page.locator('canvas[data-pit-technique-entities]'));
      if (!pauseChecked) {
        await page.keyboard.press('Escape'); await page.locator('[data-pit-immersive][data-pit-paused="true"]').waitFor();
        const frozen = await read(); await page.clock.runFor(300);
        check(`${label}/${entry.actionId}: public pause holds the real duel frame and both actors`, JSON.stringify(await read()) === JSON.stringify(frozen));
        await page.keyboard.press('Escape'); await page.locator('[data-pit-immersive][data-pit-paused="false"]').waitFor();
        await page.locator('[data-pit-immersive]').focus(); pauseChecked = true;
        if (command.down) await page.keyboard.down(command.down);
      }
    }
    await page.clock.runFor(16);
  }
  if (command.down) { await page.keyboard.up(command.down); await page.clock.runFor(48); }
  const observed = (await draws()).filter(draw => expected.some(frame => frame.src === draw.src));
  const match = draw => expected.filter(frame => frame.src === draw.src && JSON.stringify(frame.rect) === JSON.stringify(draw.rect) && frame.phase === draw.actions[slot]?.phase && draw.actions[slot]?.normalMove === entry.actionId.split('_').at(-1));
  check(`${label}/${entry.actionId}/${facing}: public input draws every exact admitted combat crop`, expected.every(frame => observed.some(draw => frame.src === draw.src && JSON.stringify(frame.rect) === JSON.stringify(draw.rect) && frame.phase === draw.actions[slot]?.phase)) && observed.every(draw => match(draw).length > 0), { sourceFrames: expected.length, observedDraws: observed.length });
  const firstPhase = phases.map(phase => observed.findIndex(draw => match(draw).some(frame => frame.phase === phase)));
  check(`${label}/${entry.actionId}/${facing}: startup, active and recovery run in order`, firstPhase[0] >= 0 && firstPhase[1] > firstPhase[0] && firstPhase[2] > firstPhase[1] && pauseChecked && (await read()).frame > starting.frame, { firstPhase, command });
  check(`${label}/${entry.actionId}/${facing}: independent native orientation and BODY scale remain exact`, observed.length > 0 && observed.every(draw => {
    const frame = match(draw)[0], body = definition.pageBodyHeightPx?.[frame.pageId] ?? definition.bodyHeightPx, scale = api.PIT_FIGHTERS[entry.fighterId].bodyHeight / body;
    return draw.matrix[0] > 0 && draw.matrix[3] > 0 && draw.matrix[1] === 0 && draw.matrix[2] === 0 && Math.abs(draw.destination[2] / frame.rect[2] - scale) < 1e-8 && Math.abs(draw.destination[3] / frame.rect[3] - scale) < 1e-8 && Math.abs(draw.destination[0] - (draw.positions[slot].x - frame.pivot[0] * scale)) < .02;
  }));
  if (entry.combatClipIds[0].startsWith('pit.air.')) check(`${label}/${entry.actionId}/${facing}: latched air phases follow the real actor through flight or landing and retain the native pivot`, observed.length > 0 && observed.every(draw => {
    const frame = match(draw)[0], body = definition.pageBodyHeightPx?.[frame.pageId] ?? definition.bodyHeightPx, scale = api.PIT_FIGHTERS[entry.fighterId].bodyHeight / body;
    return Math.abs(draw.destination[1] - (api.PIT_ARENAS['the-pit'].groundY - draw.positions[slot].y - (frame.pivot[1] - frame.contactOffsetY) * scale)) < .02;
  }));
  observations.push({ kind: 'native-combat', label, fighterId: entry.fighterId, actionId: entry.actionId, facing, slot, expected, command, firstPhase, draws: observed });
}
try {
  for (const entry of entries) {
    check(`${entry.actionId}: reviewed default BODY phases are actually in the duel registry`, entry.appearanceId === 'runtime-default' && entry.definition.variantId === undefined && api.PIT_WORKBOOK_NORMAL_REGISTRY_V104.some(definition => definition.fighterId === entry.fighterId && definition.atlas.id === entry.atlasId && entry.combatClipIds.every(id => definition.atlas.clips.some(clip => clip.id === id))));
    const reviewed = entry.review.sourceHashes ?? Object.fromEntries(entry.definition.atlas.pages.map(page => [page.src, entry.review.sourceSha256]));
    for (const page of entry.definition.atlas.pages) {
      const bytes = await fs.readFile(path.join('public', page.src));
      check(`${entry.actionId}: admitted PNG hash is still the reviewed original`, typeof reviewed[page.src] === 'string' && sha(bytes) === reviewed[page.src]);
    }
  }
  if (domains.has('native')) for (const [index, identities] of [['feral-hunter', 'scar'], ['scar', 'feral-hunter']].entries()) {
    const label = `body-match-${index + 1}`, stored = await openMatch(identities, ['', ''], label);
    for (const [slot, identity] of identities.entries()) for (const entry of entries.filter(entry => entry.fighterId === identity)) await nativeAction(entry, slot, label);
    check(`${label}: real local-versus actions leave stored progression and settings unchanged`, JSON.stringify(await storage()) === JSON.stringify(stored));
    if (index === 0) {
      await page.keyboard.press('Escape'); await page.locator('[data-pit-immersive][data-pit-paused="true"]').waitFor();
      await page.setViewportSize({ width: 390, height: 844 });
      check('Native local duel fits a 390px viewport', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await shot('native-duel-mobile-pause.png');
      await page.keyboard.press('Escape'); await page.locator('[data-pit-immersive][data-pit-paused="false"]').waitFor();
      await page.locator('[data-pit-immersive]').focus(); await page.clock.runFor(64);
      const mobileCanvas = page.locator('canvas[data-pit-technique-entities]');
      check('Mobile native duel exposes the real Canvas without a pause overlay', await mobileCanvas.evaluate(element => {
        const rect = element.getBoundingClientRect(), hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight && hit === element;
      }));
      const mobileEntry = entries.find(entry => entry.fighterId === identities[0]);
      const mobileCommand = await enterAction(mobileEntry, 0);
      await shot('native-duel-mobile.png');
      if (mobileCommand.down) await page.keyboard.up(mobileCommand.down);
    }
    for (const pageRecord of pages) if (!served.some(item => item.src === pageRecord.src)) {
      const response = await page.request.get(new URL(pageRecord.src, baseUrl).href), bytes = await response.body();
      check(`Actual server supplies the admitted native PNG: ${pageRecord.src}`, response.ok() && sha(bytes) === sha(await fs.readFile(path.join('public', pageRecord.src))));
      served.push({ src: pageRecord.src, status: response.status(), sha256: sha(bytes), bytes: bytes.length });
    }
    await closeMatch();
  }
  if (domains.has('costumes')) for (let index = 0; index < 1; index++) for (const identities of [['feral-hunter', 'scar'], ['scar', 'feral-hunter']]) {
    const appearances = identities.map(identity => variants[identity][index % variants[identity].length]), label = `supplied-${index + 1}-${identities[0]}`;
    const stored = await openMatch(identities, appearances.map(variant => variant.id), label);
    await clear();
    for (const [slot, identity] of identities.entries()) for (const entry of entries.filter(entry => entry.fighterId === identity)) {
      const command = await enterAction(entry, slot); await page.clock.runFor(700);
      if (command.down) { await page.keyboard.up(command.down); await page.clock.runFor(48); }
    }
    const observed = await draws();
    check(`${label}: supplied costumes never borrow any new default BODY page`, observed.every(draw => !nativeSources.has(draw.src)));
    for (const [slot, variant] of appearances.entries()) {
      check(`${label}/${variant.id}: exact supplied pixels and selected identity survive the real input sequence`, (await read()).variants[slot] === variant.id && observed.some(draw => draw.src === variant.src), { slot, source: variant.src });
      observations.push({ kind: 'supplied-costume-exclusion', label, fighterId: identities[slot], variantId: variant.id, slot, facing: slot === 0 ? 'right' : 'left', source: variant.src, sourceDraws: observed.filter(draw => draw.src === variant.src).length, defaultBodyDraws: observed.filter(draw => nativeSources.has(draw.src)).length });
    }
    check(`${label}: local-versus costume checks preserve stored progression and settings`, JSON.stringify(await storage()) === JSON.stringify(stored));
    await shot(`${label}.png`, page.locator('canvas[data-pit-technique-entities]'));
    await closeMatch();
  }
  if (domains.has('mixed')) for (const bodySlot of [0, 1]) {
    const identities = ['feral-hunter', 'scar'], costumeSlot = 1 - bodySlot;
    const costume = variants[identities[costumeSlot]][0];
    const appearances = ['', '']; appearances[costumeSlot] = costume.id;
    const label = `mixed-body-${bodySlot + 1}-costume-${costumeSlot + 1}`;
    const stored = await openMatch(identities, appearances, label);
    const bodyEntry = entries.find(entry => entry.fighterId === identities[bodySlot] && entry.actionId.endsWith('_5L'));
    await nativeAction(bodyEntry, bodySlot, label);
    await clear();
    for (const entry of entries.filter(entry => entry.fighterId === identities[costumeSlot])) {
      await page.clock.runFor(700);
      const command = await enterAction(entry, costumeSlot);
      check(`${label}/${entry.actionId}: the supplied actor never receives a source-normal action key`, (await read()).normalMoves[costumeSlot] === null);
      await page.clock.runFor(900);
      if (command.down) { await page.keyboard.up(command.down); await page.clock.runFor(48); }
    }
    const observed = await draws();
    const forbidden = new Set(api.PIT_WORKBOOK_NORMAL_REGISTRY_V104.filter(definition => definition.fighterId === identities[costumeSlot]).flatMap(definition => definition.atlas.pages.map(page => page.src)));
    check(`${label}: an actually enabled V104 bank never supplies BODY pixels to the selected costume`, observed.every(draw => !forbidden.has(draw.src)));
    check(`${label}: public mixed-duel commands keep the exact supplied costume pixels and identity`, (await read()).recipe === 'workbook-v104' && (await read()).variants[costumeSlot] === costume.id && observed.some(draw => draw.src === costume.src));
    check(`${label}: mixed source-normal play preserves stored progression and settings`, JSON.stringify(await storage()) === JSON.stringify(stored));
    observations.push({kind: 'mixed-opt-in-costume-exclusion', label, fighterId: identities[costumeSlot], variantId: costume.id, slot: costumeSlot, facing: costumeSlot === 0 ? 'right' : 'left', source: costume.src, sourceDraws: observed.filter(draw => draw.src === costume.src).length, defaultBodyDraws: observed.filter(draw => forbidden.has(draw.src)).length});
    await shot(`${label}.png`, page.locator('canvas[data-pit-technique-entities]'));
    await closeMatch();
  }
  check('Every native combat and supplied costume journey has no browser error', errors.length === 0, errors);
} catch (error) {
  failure = error;
  if (checks.at(-1)?.status !== 'FAIL') checks.push({ name: error.message, status: 'FAIL' });
  if (page) await shot('failure.png').catch(() => {});
} finally {
  const after = await snapshot(), unchanged = JSON.stringify(before) === JSON.stringify(after);
  if (!unchanged && process.env.YAUTJA_QA_REQUIRE_FROZEN !== '0') { failure ??= Error('Runtime or native art changed during combat QA'); checks.push({ name: 'Runtime and native art stay unchanged', status: 'FAIL' }); }
  const report = { status: failure ? 'FAIL' : 'PASS', baseUrl, domains: [...domains], scope: `All ${entries.length} opt-in V104 normal gestures, ${entries.length * 2} requested native orientations. Genuine public local-versus controls and Canvas source provenance; no campaign save or actor injection. Costume exclusion observes exact supplied image identity after public inputs; it does not certify new animation for those static costumes. Two mixed BODY/costume fights additionally exercise the actually enabled V104 bank on opposite sides. One supplied appearance per fighter is observed in both directions; other supplied appearances are excluded by the model. Spécials, throws, entities and other workbook mechanics remain outside this recipe.`, checks, coverage: { linkedActions: entries.map(entry => ({ fighterId: entry.fighterId, actionId: entry.actionId, atlasId: entry.atlasId })), nativeOrientations: new Set(observations.filter(item => item.kind === 'native-combat').map(item => `${item.actionId}/${item.facing}`)).size, mixedOptInFights: observations.filter(item => item.kind === 'mixed-opt-in-costume-exclusion').length, suppliedAppearances: Object.values(variants).flat().length, testedCostumeOrientations: [...new Set(observations.filter(item => item.kind === 'supplied-costume-exclusion').map(item => `${item.variantId}/${item.facing}`))].length }, fixtures, captures, movements, observations, served, errors, sourceBefore: before, sourceAfter: after, sourceUnchanged: unchanged, visualInspection: 'Pending screenshot inspection; runtime evidence does not certify lore fidelity.', failure: failure ? String(failure.stack ?? failure) : null, completedAt: new Date().toISOString() };
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  await context?.close(); await browser.close();
  console.log(JSON.stringify({ status: report.status, passed: checks.filter(check => check.status === 'PASS').length, nativeOrientations: report.coverage.nativeOrientations, suppliedAppearances: report.coverage.suppliedAppearances, testedCostumeOrientations: report.coverage.testedCostumeOrientations, captures: captures.length, errors: errors.length, sourceUnchanged: unchanged, output }));
}
if (failure) throw failure;
