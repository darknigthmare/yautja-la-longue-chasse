/** Public V105 journeys. The observer records actual Canvas sources and DOM
 * clocks; only public selection, keyboard and command buttons drive the duel. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import sharp from 'sharp';
import {choosePitFighter, choosePitStage, closePitSelectionOptions, openPitSelectionOptions} from './pit-selection-browser-helpers.mjs';

const baseUrl = process.env.YAUTJA_QA_BASE_URL ?? 'http://127.0.0.1:3000';
const expectedBuildId = process.env.YAUTJA_QA_BUILD_ID ?? null;
const mode = process.env.YAUTJA_PIT_WORKBOOK_QA_MODE ?? (expectedBuildId ? 'production' : 'development');
const output = path.resolve(process.env.YAUTJA_PIT_WORKBOOK_QA_OUTPUT ?? 'outputs/qa-v105/pit-workbook');
const domains = new Set((process.env.YAUTJA_PIT_WORKBOOK_QA_DOMAINS ?? 'native,presentations,costumes,legacy').split(','));
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(baseUrl).hostname));
await fs.mkdir(output, {recursive: true});
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const bundle = await build({stdin: {contents: [
  "export * from './app/game/pitWorkbookRegistryV105';",
  "export * from './app/game/pitWorkbookNormalRegistryV104';",
  "export * from './app/game/pitWorkbookAnimationV100';",
  "export { PIT_FIGHTERS, PIT_ARENAS } from './app/game/systems/pitCombat';",
  "export { processHunterSpriteTransparency } from './app/game/hunterSpriteAtlas';",
  "export { measureSpriteContact } from './app/game/spriteContact';",
].join('\n'), resolveDir: process.cwd(), loader: 'ts'}, bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent'});
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const moves = api.PIT_WORKBOOK_BODY_MOVES_V105.map((move, index) => ({...move, definition: api.PIT_WORKBOOK_MOVE_REGISTRY_V105[index]}));
const presentations = api.PIT_WORKBOOK_BODY_PRESENTATIONS_V105.map((scene, index) => ({...scene, definition: api.PIT_WORKBOOK_PRESENTATION_REGISTRY_V105[index]}));
const definitions = [...moves, ...presentations].map(item => item.definition);
const pages = [...new Map(definitions.flatMap(definition => definition.atlas.pages).map(page => [page.src, page])).values()];
const nativeSources = new Set(pages.map(page => page.src));
// Read-only contact measurement applies exactly the runtime alpha contract.
// Source images, rectangles and pivots are never rewritten or emitted.
const measuredPages = new Map(), contactOffsets = new Map();
for (const page of pages) {
  const {data, info} = await sharp(path.join('public', page.src)).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  const processed = api.processHunterSpriteTransparency(new Uint8ClampedArray(data), info.width, info.height, page.transparency);
  measuredPages.set(page.src, {pixels: processed.pixels, width: info.width});
}
function contactOffset(src, rect, pivotY) {
  const key = JSON.stringify([src, rect, pivotY]);
  if (!contactOffsets.has(key)) {
    const page = measuredPages.get(src), [x, y, width, height] = rect, crop = new Uint8ClampedArray(width * height * 4);
    for (let row = 0; row < height; row++) crop.set(page.pixels.subarray(((y + row) * page.width + x) * 4, ((y + row) * page.width + x + width) * 4), row * width * 4);
    contactOffsets.set(key, api.measureSpriteContact(crop, width, height, pivotY)?.offsetY ?? 0);
  }
  return contactOffsets.get(key);
}
const roster = JSON.parse(await fs.readFile('app/game/data/pitUserHuntersV44.json', 'utf8'));
const variants = Object.fromEntries(['feral-hunter', 'scar'].map(id => [id, roster.fighters.find(fighter => fighter.id === id).variants]));
const files = [...new Set(['app/game/buildInfo.ts', 'app/game/PitCanvas.tsx', 'app/game/PitCanvas.module.css', 'app/game/hunterSpriteMotion.ts', 'app/game/pitSpriteSheetAnimation.ts',
  'app/game/pitWorkbookRegistryV105.ts', 'app/game/pitCombatBitmapArt.ts', 'app/game/systems/pitCombat.ts',
  'app/game/pitFighterPresentation.ts', 'app/game/pitSpriteSheetRegistry.ts', 'app/game/hunterSpriteAtlas.ts', 'app/game/spriteContact.ts',
  'app/game/pitWorkbookAnimationV100.ts', 'app/game/pitWorkbookNormalRegistryV104.ts', 'app/game/systems/pitWorkbookNormalsV104.ts',
  'app/game/systems/pitWorkbookCombatV105.ts', 'app/game/systems/pitWorkbookMovesV105.ts',
  'app/game/data/pitWorkbookAnimationsV100.json', 'app/game/data/pitWorkbookAnimationPlanV100.json',
  'app/game/systems/pitRoundPresentation.ts', 'app/game/systems/pitWorkbookPresentationClockV105.ts',
  'scripts/qa-pit-workbook-v105.mjs', 'scripts/pit-selection-browser-helpers.mjs',
  ...pages.map(page => path.join('public', page.src)), ...Object.values(variants).map(appearances => path.join('public', appearances[0].src))])];
const snapshot = () => Promise.all(files.map(async file => ({file, sha256: sha(await fs.readFile(file))})));
const before = await snapshot(), checks = [], observations = [], captures = [], errors = [], served = [], servedBuilds = [];
const check = (name, condition, detail) => {checks.push({name, status: condition ? 'PASS' : 'FAIL', ...(detail ? {detail} : {})}); assert.ok(condition, name);};
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ?? '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
let context, page, failure;
const read = () => page.evaluate(() => {
  const root = document.querySelector('[data-pit-immersive]'), canvas = root?.querySelector('canvas[data-pit-technique-entities]');
  const json = (value, fallback = []) => JSON.parse(value || JSON.stringify(fallback));
  return {frame: Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame), phase: root?.dataset.pitPresentationPhase,
    elapsedMs: Number(root?.dataset.pitPresentationElapsedMs), durationMs: Number(root?.dataset.pitPresentationDurationMs),
    paused: root?.dataset.pitPaused, blocked: root?.dataset.pitSimulationBlocked, recipe: root?.dataset.pitNormalRecipe,
    tauntVariants: json(root?.dataset.pitTauntVariants), taunts: root?.dataset.pitTauntAvailable,
    positions: json(canvas?.dataset.pitFighterPositions), actions: json(canvas?.dataset.pitFighterActions),
    variants: [...root?.querySelectorAll('[data-pit-bitmap-variant]') || []].map(node => node.dataset.pitBitmapVariant),
    life: [...root?.querySelectorAll('[role="progressbar"][aria-label^="Vie de"]') || []].map(node => Number(node.getAttribute('aria-valuenow'))),
    meter: [...root?.querySelectorAll('[role="progressbar"][aria-label^="Traque de"]') || []].map(node => Number(node.getAttribute('aria-valuenow')))};
});
const draws = () => page.evaluate(() => window.__pitWorkbookQaV105.draws);
const clear = () => page.evaluate(() => {window.__pitWorkbookQaV105.draws = [];});
async function shot(file, canvas = true) {
  await (canvas ? page.locator('canvas[data-pit-technique-entities]') : page).screenshot({path: path.join(output, file)});
  captures.push({file, sha256: sha(await fs.readFile(path.join(output, file))), state: await read()});
}
async function driveUntil(predicate, label, limitMs = 60000, stepMs = 32) {
  for (let elapsed = 0; elapsed <= limitMs; elapsed += stepMs) {
    const state = await read(); if (predicate(state)) return state;
    await page.clock.runFor(stepMs);
  }
  throw new Error('Public journey timed out: ' + label + ' ' + JSON.stringify(await read()));
}
async function openMatch(identities, appearances, recipe, label) {
  console.log(JSON.stringify({journey: label, stage: 'selection', recipe}));
  context = await browser.newContext({viewport: {width: 1440, height: 1050}, reducedMotion: 'no-preference'});
  await context.addInitScript(({native, supplied, normals}) => {
    const wanted = new Set([...native, ...supplied, ...normals]), sources = new WeakMap(), original = CanvasRenderingContext2D.prototype.drawImage;
    window.__pitWorkbookQaV105 = {draws: []};
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      const result = original.apply(this, args), source = args[0];
      const src = source instanceof HTMLImageElement ? new URL(source.currentSrc || source.src, location.href).pathname : sources.get(source);
      const combat = this.canvas.matches('canvas[data-pit-technique-entities]');
      if (!combat && src) sources.set(this.canvas, src);
      if (combat && wanted.has(src) && window.__pitWorkbookQaV105.draws.length < 150000) {
        const root = document.querySelector('[data-pit-immersive]'), matrix = this.getTransform();
        window.__pitWorkbookQaV105.draws.push({src, rect: args.length === 9 ? args.slice(1, 5) : null,
          destination: args.length === 9 ? args.slice(5) : args.slice(1), matrix: [matrix.a, matrix.b, matrix.c, matrix.d],
          frame: Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame), phase: root?.dataset.pitPresentationPhase,
          elapsedMs: Number(root?.dataset.pitPresentationElapsedMs), durationMs: Number(root?.dataset.pitPresentationDurationMs),
          fighterElapsedMs: JSON.parse(root?.dataset.pitFighterPresentationElapsedMs || '[]'),
          fighterDurationMs: JSON.parse(root?.dataset.pitFighterPresentationDurationMs || '[]'),
          tauntVariants: JSON.parse(root?.dataset.pitTauntVariants || '[]'),
          positions: JSON.parse(this.canvas.dataset.pitFighterPositions || '[]'), actions: JSON.parse(this.canvas.dataset.pitFighterActions || '[]')});
      }
      return result;
    };
  }, {native: [...nativeSources], supplied: Object.values(variants).flat().map(variant => variant.src),
    normals: api.PIT_WORKBOOK_NORMAL_REGISTRY_V104.flatMap(definition => definition.atlas.pages.map(page => page.src))});
  page = await context.newPage(); page.setDefaultTimeout(40000);
  page.on('pageerror', error => errors.push({label, message: error.message}));
  page.on('console', message => {if (message.type() === 'error') errors.push({label, message: message.text()});});
  const response = await page.goto(baseUrl, {waitUntil: 'domcontentloaded', timeout: 120000});
  check(`${label}: campaign menu is served by a real successful HTML response`, response?.ok());
  const html = await response.text(), htmlFile = `${label}-served.html`;
  await fs.writeFile(path.join(output, htmlFile), html);
  const foundInHtml = expectedBuildId ? html.includes(expectedBuildId) : null;
  servedBuilds.push({url: response.url(), status: response.status(), expectedBuildId, foundInHtml,
    htmlFile, htmlSha256: sha(Buffer.from(html)), bytes: Buffer.byteLength(html), contentType: response.headers()['content-type'] ?? null});
  if (expectedBuildId) check(`${label}: actual served HTML carries the expected frozen production build ID`, foundInHtml);
  await page.locator('[data-campaign-menu="main"]').waitFor();
  await page.getByRole('button', {name: /^The Pit/}).click();
  await page.getByRole('button', {name: 'Accéder malgré les spoilers', exact: true}).click();
  await page.getByRole('button', {name: 'Entrer dans The Pit', exact: true}).click();
  await page.locator('[data-pit-selection-step="fighters"]').waitFor(); await closePitSelectionOptions(page);
  await page.getByRole('radio', {name: /^Versus local/}).click();
  for (const [slot, identity] of identities.entries()) {
    await choosePitFighter(page, identity); await page.locator('[data-pit-variant-select]').selectOption(appearances[slot] ?? '');
    await page.locator('[data-pit-selection-confirm]').click();
  }
  await openPitSelectionOptions(page);
  const extended = page.locator('[data-pit-workbook-combat-v105]'), normal = page.locator('[data-pit-workbook-normals-v104]');
  if (recipe !== 'historical') {
    const choice = recipe === 'workbook-v105' ? extended : normal;
    check(`${label}: source recipe requires explicit public opt-in`, await choice.count() === 1 && !await choice.isChecked());
    await choice.check(); await shot(`${label}-source-options.png`, false);
  } else if (await extended.count()) check(`${label}: historical recipe stays unchecked`, !await extended.isChecked() && !await normal.isChecked());
  await closePitSelectionOptions(page); await choosePitStage(page, 'the-pit');
  await page.waitForFunction(() => document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus === 'ready');
  await page.clock.install(); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.locator('[data-pit-selection-confirm]').click();
  console.log(JSON.stringify({journey: label, stage: 'native-theatre'}));
  await driveUntil(state => state.phase === 'fight' && state.blocked === 'false', label + '/initial theatre', 120000, 100);
  check(`${label}: launched recipe and exact selected appearances are retained`, (await read()).recipe === recipe &&
    JSON.stringify((await read()).variants) === JSON.stringify(appearances.map(value => value || 'default')));
  await page.locator('[data-pit-immersive]').focus();
  console.log(JSON.stringify({journey: label, stage: 'fight-ready'}));
}
async function closeMatch() {await context.close(); context = null; page = null;}
const walkKeys = [{toward: 'ArrowRight', away: 'ArrowLeft', heavy: 'KeyL', medium: 'KeyK', light: 'KeyJ'},
  {toward: 'Numpad4', away: 'Numpad6', heavy: 'Numpad5', medium: 'Numpad3', light: 'Numpad1'}];
async function approach(distance = 220, slot = 0) {
  await page.locator('[data-pit-immersive]').focus(); await page.keyboard.down(walkKeys[slot].toward);
  try {await driveUntil(state => Math.abs(state.positions[1].x - state.positions[0].x) <= distance, 'walk into range', 12000);}
  finally {await page.keyboard.up(walkKeys[slot].toward);}
  await page.clock.runFor(32);
}
async function separate() {
  await page.locator('[data-pit-immersive]').focus(); await page.keyboard.down('ArrowLeft'); await page.keyboard.down('Numpad6');
  try {await driveUntil(state => state.positions[1].x - state.positions[0].x >= 650, 'separate actors', 12000);}
  finally {await page.keyboard.up('ArrowLeft'); await page.keyboard.up('Numpad6');}
  await page.clock.runFor(48);
}
async function command(move, slot) {
  if (move.key === '6M') {
    await page.locator('[data-pit-immersive]').focus(); await page.keyboard.down(walkKeys[slot].toward); await page.keyboard.down(walkKeys[slot].medium);
    await page.clock.runFor(32); await page.keyboard.up(walkKeys[slot].medium); await page.keyboard.up(walkKeys[slot].toward);
  } else {
    await page.locator(`[data-pit-workbook-controls="${slot}"] [data-pit-workbook-action="${move.key === 'EQUIP' ? 'equipment' : move.key === 'S4' ? 'counter' : 'contact'}"]`).click();
    await page.clock.runFor(16);
  }
}
async function observeAction(move, slot, label) {
  const facing = slot === 0 ? 'right' : 'left', definition = move.definition;
  const expected = definition.atlas.clips.filter(clip => clip.facing === facing).flatMap(clip => clip.frames.map(frame =>
    ({...frame, phase: clip.id.split('.').at(-1), src: definition.atlas.pages.find(page => page.id === frame.pageId).src})));
  await page.clock.runFor(800); await clear(); await command(move, slot);
  let paused = false;
  for (let tick = 0; tick < move.startup + move.active + move.recovery + 12; tick++) {
    const state = await read();
    if (!paused && state.actions[slot]?.workbookMove === move.key) {
      await page.keyboard.press('Escape'); await page.locator('[data-pit-immersive][data-pit-paused="true"]').waitFor();
      const frozen = await read(); await page.clock.runFor(200);
      check(`${label}/${move.actionId}: pause freezes simulation and theatre clocks`, JSON.stringify(await read()) === JSON.stringify(frozen));
      await page.keyboard.press('Escape'); await page.locator('[data-pit-immersive][data-pit-paused="false"]').waitFor();
      await page.locator('[data-pit-immersive]').focus(); paused = true;
    }
    if (state.actions[slot]?.workbookMove === move.key && state.actions[slot]?.phase === (move.active ? 'active' : 'recovery') && tick % 3 === 0 && !captures.some(item => item.file === `${label}-${move.actionId}.png`)) await shot(`${label}-${move.actionId}.png`);
    await page.clock.runFor(16);
  }
  const observed = (await draws()).filter(draw => expected.some(frame => frame.src === draw.src) && draw.actions[slot]?.workbookMove === move.key);
  const matches = (frame, draw) => frame.src === draw.src && JSON.stringify(frame.rect) === JSON.stringify(draw.rect) && frame.phase === draw.actions[slot]?.phase;
  check(`${label}/${move.actionId}/${facing}: every admitted native phase crop is reached through public input`, expected.every(frame => observed.some(draw => matches(frame, draw))) && observed.every(draw => expected.some(frame => matches(frame, draw))), {expected: expected.length, observed: observed.length});
  check(`${label}/${move.actionId}/${facing}: native orientation, fixed body reference and feet anchor remain exact`, observed.length > 0 && observed.every(draw => {
    const frame = expected.find(frame => matches(frame, draw)), body = definition.pageBodyHeightPx?.[frame.pageId] ?? definition.bodyHeightPx;
    const scale = api.PIT_FIGHTERS[move.fighterId].bodyHeight / body;
    return draw.matrix[0] > 0 && draw.matrix[3] > 0 && draw.matrix[1] === 0 && draw.matrix[2] === 0 &&
      Math.abs(draw.destination[2] / frame.rect[2] - scale) < 1e-8 && Math.abs(draw.destination[3] / frame.rect[3] - scale) < 1e-8 &&
      Math.abs(draw.destination[0] - (draw.positions[slot].x - frame.pivot[0] * scale)) < .02 &&
      Math.abs(draw.destination[1] - (api.PIT_ARENAS['the-pit'].groundY - draw.positions[slot].y - (frame.pivot[1] - contactOffset(frame.src, frame.rect, frame.pivot[1])) * scale)) < .02;
  }));
  const phaseOrder = ['startup', ...(move.active ? ['active'] : []), 'recovery'].map(phase => observed.findIndex(draw => draw.actions[slot]?.phase === phase));
  check(`${label}/${move.actionId}: source phases stay ordered without inventing EQUIP active ticks`, phaseOrder.every((index, offset) => index >= 0 && (!offset || index > phaseOrder[offset - 1])) && paused);
  observations.push({kind: 'native-action', label, actionId: move.actionId, fighterId: move.fighterId, slot, facing, phaseOrder, draws: observed});
  console.log(JSON.stringify({journey: label, actionId: move.actionId, facing, stage: 'native-action-verified'}));
}
async function taunts(identities, label) {
  for (const [slot, identity] of identities.entries()) for (const variant of [1, 2]) {
    const scene = presentations.find(scene => scene.fighterId === identity && scene.key === 'TAUNT_' + variant);
    await page.locator(`[data-pit-taunt="${slot}"]`).click(); await page.clock.runFor(32);
    check(`${label}/${identity}: public taunts alternate the two source choices`, (await read()).tauntVariants[slot] === variant);
    await page.clock.runFor(450); await shot(`${label}-${identity}-taunt-${variant}.png`); await page.clock.runFor(650);
    observations.push({kind: 'taunt-command', label, actionId: scene.actionId, slot, variant});
  }
}
async function finishDuel(winnerSlot, label) {
  for (let attempt = 0; attempt < 320; attempt++) {
    const state = await read();
    if (state.phase === 'match-result' && state.elapsedMs >= state.durationMs) {await shot(`${label}-result.png`); return;}
    if (state.phase !== 'fight' || state.blocked === 'true') {await page.clock.runFor(250); continue;}
    if (Math.abs(state.positions[1].x - state.positions[0].x) > 58) await approach(58, winnerSlot);
    await page.locator('[data-pit-immersive]').focus(); await page.keyboard.down(walkKeys[winnerSlot].heavy);
    await page.clock.runFor(32); await page.keyboard.up(walkKeys[winnerSlot].heavy); await page.clock.runFor(900);
  }
  throw new Error('Public attacks did not complete the local duel: ' + JSON.stringify(await read()));
}
function inspectPresentations(observed, identities, label) {
  for (const [slot, identity] of identities.entries()) for (const scene of presentations.filter(scene => scene.fighterId === identity)) {
    const facing = slot === 0 ? 'right' : 'left', definition = scene.definition;
    const clip = definition.atlas.clips.find(clip => clip.facing === facing), totalTicks = clip.frames.reduce((sum, frame) => sum + frame.durationTicks, 0);
    const expected = clip.frames.map(frame => ({...frame, src: definition.atlas.pages.find(page => page.id === frame.pageId).src}));
    const seen = observed.filter(draw => expected.some(frame => frame.src === draw.src));
    if (!seen.length) continue; // Opposite outcome is covered by the second genuine result.
    check(`${label}/${scene.actionId}/${facing}: source presentation reaches every native drawing`, expected.every(frame => seen.some(draw => frame.src === draw.src && JSON.stringify(frame.rect) === JSON.stringify(draw.rect))));
    if (scene.key === 'VICTOIRE' || scene.key === 'DEFAITE') for (const resultPhase of ['round-result', 'match-result']) {
      const result = seen.filter(draw => draw.phase === resultPhase);
      if (!result.length) continue;
      check(`${label}/${scene.actionId}/${facing}/${resultPhase}: this outcome independently completes every source drawing`, expected.every(frame => result.some(draw => frame.src === draw.src && JSON.stringify(frame.rect) === JSON.stringify(draw.rect))), {draws: result.length});
    }
    const nativeDurationMs = totalTicks * 1000 / clip.ticksPerSecond;
    check(`${label}/${scene.actionId}/${facing}: the complete source duration is exposed by the live theatre`, seen.some(draw => Math.abs((draw.fighterDurationMs[slot] ?? draw.durationMs) - nativeDurationMs) < .001), {nativeDurationMs, seenDurations: [...new Set(seen.map(draw => draw.fighterDurationMs[slot] ?? draw.durationMs))]});
    check(`${label}/${scene.actionId}/${facing}: source drawings retain independent orientation`, seen.every(draw => draw.matrix[0] > 0 && draw.matrix[3] > 0 && draw.matrix[1] === 0 && draw.matrix[2] === 0));
    check(`${label}/${scene.actionId}/${facing}: source theatre keeps its fixed BODY scale and floor contact`, seen.every(draw => {
      const frame = expected.find(frame => frame.src === draw.src && JSON.stringify(frame.rect) === JSON.stringify(draw.rect));
      if (!frame) return false;
      const body = definition.pageBodyHeightPx?.[frame.pageId] ?? definition.bodyHeightPx, scale = api.PIT_FIGHTERS[scene.fighterId].bodyHeight / body;
      return Math.abs(draw.destination[2] / frame.rect[2] - scale) < 1e-8 && Math.abs(draw.destination[3] / frame.rect[3] - scale) < 1e-8 &&
        Math.abs(draw.destination[0] - (draw.positions[slot].x - frame.pivot[0] * scale)) < .02 &&
        Math.abs(draw.destination[1] - (api.PIT_ARENAS['the-pit'].groundY - (frame.pivot[1] - contactOffset(frame.src, frame.rect, frame.pivot[1])) * scale)) < .02;
    }));
    observations.push({kind: 'native-presentation', label, actionId: scene.actionId, slot, facing, nativeDurationMs, drawings: expected.length, draws: seen});
  }
}
try {
  for (const item of [...moves, ...presentations]) {
    const admission = api.PIT_WORKBOOK_ADMISSIONS_V100.find(admission => admission.fighterId === item.fighterId && admission.actionId === item.actionId);
    const reviewed = admission.review.sourceHashes ?? Object.fromEntries(item.definition.atlas.pages.map(page => [page.src, admission.review.sourceSha256]));
    for (const page of item.definition.atlas.pages) check(`${item.actionId}: source PNG remains byte-identical to its reviewed SHA`, sha(await fs.readFile(path.join('public', page.src))) === reviewed[page.src]);
  }
  if (domains.has('native') || domains.has('presentations')) for (const [index, identities] of [
    ['feral-hunter', 'scar'], ['scar', 'feral-hunter'], ['feral-hunter', 'scar'], ['scar', 'feral-hunter'],
  ].entries()) {
    if (index >= 2 && !domains.has('presentations')) break;
    const label = `body-${index + 1}`; await openMatch(identities, ['', ''], 'workbook-v105', label);
    const theatre = await draws();
    if (index < 2) {
      await approach(220); const start = await read(); await page.clock.runFor(22000);
      check(`${label}: source costs are earned through real neutral pressure`, (await read()).meter.every(value => value >= 100) && (await read()).frame > start.frame);
      await separate();
      if (domains.has('native')) for (const [slot, identity] of identities.entries()) for (const move of moves.filter(move => move.fighterId === identity)) await observeAction(move, slot, label);
      if (domains.has('presentations')) {await clear(); await taunts(identities, label); theatre.push(...await draws());}
    }
    if (domains.has('presentations')) {await clear(); await finishDuel(index < 2 ? 0 : 1, label); theatre.push(...await draws()); inspectPresentations(theatre, identities, label);}
    for (const native of pages) if (!served.some(page => page.src === native.src)) {
      const response = await page.request.get(new URL(native.src, baseUrl).href), bytes = await response.body();
      check(`Server supplies reviewed PNG: ${native.src}`, response.ok() && sha(bytes) === sha(await fs.readFile(path.join('public', native.src))));
      served.push({src: native.src, status: response.status(), sha256: sha(bytes), bytes: bytes.length});
    }
    await closeMatch();
  }
  if (domains.has('costumes')) for (const costumeSlot of [0, 1]) {
    const identities = ['feral-hunter', 'scar'], variant = variants[identities[costumeSlot]][0], appearances = ['', '']; appearances[costumeSlot] = variant.id;
    const label = `mixed-costume-${costumeSlot}`; await openMatch(identities, appearances, 'workbook-v105', label);
    await clear(); await page.locator('[data-pit-immersive]').focus();
    for (const key of ['light', 'medium', 'heavy']) {await page.keyboard.down(walkKeys[costumeSlot][key]); await page.clock.runFor(32); await page.keyboard.up(walkKeys[costumeSlot][key]); await page.clock.runFor(1000);}
    const seen = await draws(), forbidden = new Set(definitions.filter(definition => definition.fighterId === identities[costumeSlot]).flatMap(definition => definition.atlas.pages.map(page => page.src)));
    check(`${label}: opt-in V105 never lends default BODY source pixels to the supplied costume`, !seen.some(draw => forbidden.has(draw.src)) && seen.some(draw => draw.src === variant.src) && (await read()).variants[costumeSlot] === variant.id);
    check(`${label}: supplied costume has no V105 command buttons`, await page.locator(`[data-pit-workbook-controls="${costumeSlot}"]`).count() === 0);
    observations.push({kind: 'costume-exclusion', label, variantId: variant.id, slot: costumeSlot, source: variant.src}); await shot(`${label}.png`); await closeMatch();
  }
  if (domains.has('legacy')) for (const recipe of ['historical', 'workbook-v104']) {
    const label = `legacy-${recipe}`; await openMatch(['feral-hunter', 'scar'], ['', ''], recipe, label); await clear();
    await page.keyboard.down('KeyJ'); await page.clock.runFor(32); await page.keyboard.up('KeyJ'); await page.clock.runFor(900);
    const seen = await draws(); check(`${label}: historical selection never draws V105 action or presentation sources`, !seen.some(draw => nativeSources.has(draw.src)));
    check(`${label}: V105 controls remain absent`, await page.locator('[data-pit-workbook-controls]').count() === 0);
    if (recipe === 'workbook-v104') {
      const expected = api.PIT_WORKBOOK_NORMAL_REGISTRY_V104.find(definition => definition.fighterId === 'feral-hunter' && definition.atlas.clips.some(clip => clip.id === 'pit.stand.workbook-v104.5L.startup'));
      check(`${label}: V12 normal still draws its unchanged native crop`, expected.atlas.clips.flatMap(clip => clip.frames).some(frame => seen.some(draw => expected.atlas.pages.find(page => page.id === frame.pageId).src === draw.src && JSON.stringify(frame.rect) === JSON.stringify(draw.rect))));
    }
    observations.push({kind: 'legacy-exclusion', label, recipe, draws: seen}); await shot(`${label}.png`); await closeMatch();
  }
  if (domains.has('native')) check('All seven source actions are observed in both independently authored orientations', new Set(observations.filter(item => item.kind === 'native-action').map(item => item.actionId + '/' + item.facing)).size === moves.length * 2);
  if (domains.has('presentations')) check('All ten safe source presentations are observed in both independently authored orientations', new Set(observations.filter(item => item.kind === 'native-presentation').map(item => item.actionId + '/' + item.facing)).size === presentations.length * 2);
  check('Public journeys have no browser error', errors.length === 0, errors);
} catch (error) {failure = error; if (checks.at(-1)?.status !== 'FAIL') checks.push({name: error.message, status: 'FAIL'}); if (page) await shot('failure.png', false).catch(() => {});}
finally {
  const after = await snapshot(), unchanged = JSON.stringify(before) === JSON.stringify(after);
  if (!unchanged && process.env.YAUTJA_QA_REQUIRE_FROZEN !== '0') {failure ??= Error('Runtime or source art changed during browser QA'); checks.push({name: 'Frozen source/runtime hashes', status: 'FAIL'});}
  const report = {status: failure ? 'FAIL' : 'PASS', baseUrl, mode, buildId: expectedBuildId, servedBuilds, domains: [...domains],
    scope: 'Public local duels, explicit source recipe, real pressure costs, public commands/taunts and genuine outcomes. Canvas and DOM observers are passive. Seven new BODY actions, ten safe presentations; painted-partner throws/finishers and entity specials remain studies. Historical V11/V12 and supplied costumes are independently excluded.',
    checks, observations, captures, served, errors, sourceBefore: before, sourceAfter: after, sourceUnchanged: unchanged,
    coverage: {actionOrientations: new Set(observations.filter(item => item.kind === 'native-action').map(item => item.actionId + '/' + item.facing)).size,
      presentationOrientations: new Set(observations.filter(item => item.kind === 'native-presentation').map(item => item.actionId + '/' + item.facing)).size},
    visualInspection: 'Pending screenshot review; source/runtime evidence alone does not certify lore fidelity.', failure: failure ? String(failure.stack ?? failure) : null, completedAt: new Date().toISOString()};
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  await context?.close(); await browser.close(); console.log(JSON.stringify({status: report.status, checks: checks.length, coverage: report.coverage, captures: captures.length, errors: errors.length, sourceUnchanged: unchanged, output}));
}
if (failure) throw failure;
