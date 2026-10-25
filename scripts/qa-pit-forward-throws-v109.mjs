/** Public opt-in V16 duels. Only the existing first-tracks menu profile is
 * declared. Every distance, capture, hit, tech and victory is actually played;
 * no combat state, stock, winner or animation selection is injected. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import sharp from 'sharp';
import {firstTracksCompleted} from '../tests/helpers/solo-v67-campaign-route.mjs';
import {choosePitFighter, choosePitStage, openPitSelectionOptions, closePitSelectionOptions} from './pit-selection-browser-helpers.mjs';

const baseUrl = process.env.YAUTJA_QA_BASE_URL ?? 'http://127.0.0.1:3101';
const mode = process.env.YAUTJA_QA_MODE ?? 'compiled-app';
const buildId = process.env.YAUTJA_QA_BUILD_ID ?? null, runtimeCommit = process.env.YAUTJA_QA_RUNTIME_COMMIT ?? null;
assert(['localhost', '127.0.0.1'].includes(new URL(baseUrl).hostname));
assert(['compiled-app', 'development'].includes(mode));
if (mode === 'compiled-app') {assert(buildId); assert.match(runtimeCommit ?? '', /^[a-f0-9]{40}$/);}
const output = path.resolve(process.env.YAUTJA_PIT_FORWARD_THROW_V109_OUTPUT ?? 'outputs/qa-v109/pit-forward-throws');
await fs.mkdir(output, {recursive: true});
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const bundle = await build({stdin: {contents: [
  "export * from './app/game/pitWorkbookRegistryV109';",
  "export * from './app/game/systems/pitCombat';",
  "export * from './app/game/systems/pitReplay';",
  "export * from './app/game/systems/pitWorkbookCombatV109';",
].join('\n'), resolveDir: process.cwd()}, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent'});
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const facts = api.getPitForwardThrowWorkbookFactsV109();
assert(api.PIT_FORWARD_THROW_NATIVE_PAIR_READY_V109, 'Native independent attacker AND victim art must be admitted before this public recipe');
assert.equal(facts.nativeBodyDrawings, 48);
assert.deepEqual(facts.boundActionIds, ['M_F006_TH_F', 'M_F003_TH_F']);
const admissions = api.PIT_FORWARD_THROW_NATIVE_ADMISSIONS_V109;
const nativeManifest = JSON.parse(await fs.readFile('app/game/data/pitWorkbookThrowsV109.json', 'utf8'));
const nativePaths = [...new Set(admissions.flatMap(row => row.sources.map(source => source.path.slice(6))))];
const files = [...new Set([
  'scripts/qa-pit-forward-throws-v109.mjs', 'scripts/pit-selection-browser-helpers.mjs',
  'tests/helpers/solo-v67-campaign-route.mjs', 'app/game/buildInfo.ts', 'app/game/PitCanvas.tsx',
  'app/game/PitExperienceV79.tsx', 'app/game/hunterSpriteMotion.ts', 'app/game/hunterSpriteAtlas.ts',
  'app/game/pitSpriteSheetAnimation.ts', 'app/game/pitCombatBitmapArt.ts', 'app/game/spriteContact.ts',
  'app/game/pitWorkbookRegistryV109.ts', 'app/game/data/pitWorkbookThrowsV109.json',
  'app/game/pitWorkbookDeviceRenderingV107.ts', 'app/game/systems/pitCombat.ts', 'app/game/systems/pitReplay.ts',
  'app/game/systems/pitWorkbookCombatV109.ts', 'app/game/systems/pitForwardThrowControlsV109.ts',
  'app/game/systems/controlBindings.ts', 'app/game/systems/pitWorkbookPresentationClockV105.ts',
  ...['sourceDeliveryPath', 'sourceReviewPath', 'correctionDeliveryPath', 'correctionReviewPath', 'nativeUvReviewPath'].map(key => nativeManifest[key]).filter(Boolean),
  'docs/suivi-production/v109-pit-forward/native-ground-calibration.json',
  ...api.PIT_WORKBOOK_AND_LEGACY_REGISTRY_V109.filter(row => ['feral-hunter', 'scar'].includes(row.fighterId) && !row.variantId).flatMap(row => row.atlas.pages.map(page => 'public' + page.src)),
  ...admissions.flatMap(row => row.sources.map(source => source.receiptPath)),
])];
const snapshot = () => Promise.all(files.map(async file => {const bytes = await fs.readFile(file); return {file, sha256: sha(bytes), bytes: bytes.length};}));
const sourceBefore = await snapshot(), checks = [], captures = [], observations = [], servedBuilds = [], errors = [], contexts = [];
const pixelDrawings = new Set();
for (const admission of admissions) {
  for (const source of admission.sources) {
    const actual = sourceBefore.find(row => row.file === source.path);
    assert.equal(actual.sha256, source.sha256); assert.equal(actual.bytes, source.bytes);
  }
  for (const frame of admission.definition.atlas.clips[0].frames) {
    const page = admission.definition.atlas.pages.find(page => page.id === frame.pageId);
    const [left, top, width, height] = frame.rect;
    const pixels = await sharp('public' + page.src).extract({left, top, width, height}).ensureAlpha().raw().toBuffer();
    for (let offset = 0; offset < pixels.length; offset += 4) if (pixels[offset + 3] === 0) pixels.fill(0, offset, offset + 4);
    const hash = sha(pixels); assert(!pixelDrawings.has(hash), 'The actual pixels must contain48 independently distinct drawings'); pixelDrawings.add(hash);
  }
}
assert.equal(pixelDrawings.size, 48);
const check = (name, condition, detail) => {checks.push({name, status: condition ? 'PASS' : 'FAIL', ...(detail === undefined ? {} : {detail})}); console.log(condition ? 'PASS' : 'FAIL', name); assert(condition, name);};
const profile = firstTracksCompleted(); profile.settings.masterVolume = 0; profile.settings.reducedGore = true;
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ?? '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio']});
let page, context, failure;
const canvas = () => page.locator('canvas[data-pit-technique-entities]');
const read = () => page.evaluate(() => {
  const root = document.querySelector('[data-pit-immersive]'), c = root?.querySelector('canvas[data-pit-technique-entities]');
  const parse = (value, fallback = []) => {try {return JSON.parse(value ?? JSON.stringify(fallback));} catch {return fallback;}};
  return {frame: Number(c?.dataset.pitSimulationFrameV109), phase: root?.dataset.pitPresentationPhase,
    combatPhase: root?.dataset.pitCombatPhase, terminal: root?.dataset.pitPresentationTerminalReady,
    blocked: root?.dataset.pitSimulationBlocked, recipe: root?.dataset.pitNormalRecipe,
    throw: parse(c?.dataset.pitForwardThrowV109, null), positions: parse(c?.dataset.pitFighterPositions),
    actions: parse(c?.dataset.pitFighterActions), life: parse(c?.dataset.pitFighterHealthV109),
    meter: parse(c?.dataset.pitFighterMeterV109), inventory: parse(c?.dataset.pitWorkbookInventoryV107)};
});
async function until(predicate, label, ticks = 3000, ms = 16) {
  for (let index = 0; index < ticks; index++) {const state = await read(); if (predicate(state)) return state; await page.clock.runFor(ms); if (index % 40 === 0) await new Promise(resolve => setTimeout(resolve, 8));}
  throw Error('Public V109 journey timed out: ' + label + ' ' + JSON.stringify(await read()));
}
const draws = () => page.evaluate(() => window.__pitForwardThrowQaV109.draws);
async function capture(file) {await canvas().screenshot({path: path.join(output, file)}); const bytes = await fs.readFile(path.join(output, file)); const state = await read(); captures.push({file, sha256: sha(bytes), bytes: bytes.length, state}); return state;}
async function press(code, ms = 17) {await page.locator('[data-pit-immersive]').focus(); await page.keyboard.down(code); await page.clock.runFor(ms); await page.keyboard.up(code);}
async function openMatch(ids, label) {
  context = await browser.newContext({viewport: {width: 1440, height: 1050}, reducedMotion: 'no-preference'}); contexts.push(context);
  await context.addInitScript(({profile, nativePaths}) => {
    localStorage.setItem('yautja-long-hunt.save', JSON.stringify(profile));
    const pads = [0, 1].map(index => ({connected: true, id: 'declared-V109-input-' + index, index, axes: [0, 0], buttons: Array.from({length: 16}, () => ({pressed: false, value: 0, touched: false}))}));
    window.__pitForwardThrowQaV109 = {draws: [], pads};
    Object.defineProperty(navigator, 'getGamepads', {configurable: true, value: () => pads});
    const sources = new WeakMap(), native = CanvasRenderingContext2D.prototype.drawImage, selected = new Set(nativePaths);
    CanvasRenderingContext2D.prototype.drawImage = function(...args) {
      const result = native.apply(this, args), object = args[0];
      const src = object instanceof HTMLImageElement ? new URL(object.currentSrc || object.src, location.href).pathname : sources.get(object);
      if (!this.canvas.matches('canvas[data-pit-technique-entities]')) {if (src) sources.set(this.canvas, src); return result;}
      if (selected.has(src) && window.__pitForwardThrowQaV109.draws.length < 200000) {
        const matrix = this.getTransform();
        window.__pitForwardThrowQaV109.draws.push({src, rect: args.length === 9 ? args.slice(1, 5) : null,
          destination: args.length === 9 ? args.slice(5) : null,
          matrix: [matrix.a, matrix.b, matrix.c, matrix.d], frame: Number(this.canvas.dataset.pitSimulationFrameV109),
          capture: JSON.parse(this.canvas.dataset.pitForwardThrowV109 ?? 'null'),
          actions: JSON.parse(this.canvas.dataset.pitFighterActions ?? '[]'),
          positions: JSON.parse(this.canvas.dataset.pitFighterPositions ?? '[]')});
      }
      return result;
    };
  }, {profile, nativePaths});
  page = await context.newPage(); page.setDefaultTimeout(40000);
  page.on('pageerror', error => errors.push({label, kind: 'pageerror', message: error.message, location: null}));
  page.on('console', message => {if (message.type() === 'error') errors.push({label, kind: 'console.error', message: message.text(), location: message.location()});});
  const response = await page.goto(baseUrl, {waitUntil: 'domcontentloaded', timeout: 120000}); assert(response); const html = await response.text();
  servedBuilds.push({label, status: response.status(), buildId, foundInHtml: buildId ? html.includes(buildId) : null, sha256: sha(Buffer.from(html))});
  check(label + ': local app serves the declared build', response.status() === 200 && (!buildId || html.includes(buildId)));
  await page.locator('[data-campaign-menu="main"]').waitFor(); await page.getByRole('button', {name: /^The Pit/}).click();
  await page.getByRole('button', {name: 'Accéder malgré les spoilers', exact: true}).click(); await page.getByRole('button', {name: 'Entrer dans The Pit', exact: true}).click();
  await page.locator('[data-pit-selection-step="fighters"]').waitFor(); await closePitSelectionOptions(page); await page.getByRole('radio', {name: /^Versus local/}).click();
  for (const id of ids) {await choosePitFighter(page, id); await page.locator('[data-pit-variant-select]').selectOption(''); await page.locator('[data-pit-selection-confirm]').click();}
  await openPitSelectionOptions(page); await page.locator('[data-pit-workbook-combat-v109]').check(); await closePitSelectionOptions(page);
  await choosePitStage(page, 'the-pit'); await page.waitForFunction(() => document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus === 'ready');
  await page.clock.install(); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000)); await page.locator('[data-pit-selection-confirm]').click();
  await until(state => state.phase === 'fight' && state.blocked === 'false', 'complete native theatre', 1800, 100);
  check(label + ': public option enters the separate V16 source recipe', (await read()).recipe === 'workbook-v109');
  await page.locator('[data-pit-immersive]').focus(); await page.clock.runFor(32);
}
async function approach(slot = 0, distance = 58) {
  const state = await read(), delta = state.positions[1 - slot].x - state.positions[slot].x;
  const key = slot === 0 ? delta > 0 ? 'ArrowRight' : 'ArrowLeft' : delta > 0 ? 'Numpad6' : 'Numpad4';
  await page.locator('[data-pit-immersive]').focus(); await page.keyboard.down(key);
  try {await until(s => Math.abs(s.positions[1].x - s.positions[0].x) <= distance, 'walk into actual throw reach', 1000);} finally {await page.keyboard.up(key);}
  await page.clock.runFor(17);
}
async function launch(slot, input = 'button') {
  if (input === 'button') {await page.locator(`[data-pit-forward-throw-button-v109="${slot}"]`).click(); await page.clock.runFor(17);}
  else if (input === 'pad') {
    await page.evaluate(slot => {for (const index of [2, 3]) window.__pitForwardThrowQaV109.pads[slot].buttons[index] = {pressed: true, value: 1, touched: true};}, slot);
    await page.clock.runFor(17);
    await page.evaluate(slot => {for (const index of [2, 3]) window.__pitForwardThrowQaV109.pads[slot].buttons[index] = {pressed: false, value: 0, touched: false};}, slot);
  } else {
    const keys = slot === 0 ? ['KeyJ', 'KeyK'] : ['Numpad1', 'Numpad3']; await page.locator('[data-pit-immersive]').focus();
    for (const key of keys) await page.keyboard.down(key); await page.clock.runFor(17); for (const key of keys) await page.keyboard.up(key);
  }
}
async function connected(slot, label, input, ids) {
  await approach(slot); const before = await read(); await launch(slot, input);
  const caught = await until(s => Boolean(s.throw), label + ' real capture');
  check(label + ': the independent target is caught with its actual source ID', caught.throw.attackerSlot === slot && caught.actions[slot].workbookMove === 'TH_F' && caught.life[1 - slot] === before.life[1 - slot]);
  const captureState = await capture(label + '-capture.png');
  check(label + ': capture PNG remains inside the real capture phase', captureState.throw?.attackerSlot === slot && captureState.throw.age < 8);
  const samples = [caught];
  let airborne, landed;
  const observe = s => {if (s.throw) {samples.push(s); if (s.positions[1 - slot].y > 40) airborne ??= s; if (s.throw.age >= 19) landed ??= s;}};
  await until(s => {observe(s); return s.throw && s.throw.age >= 12 && s.throw.age < 19;}, label + ' native flight drawing near tick12', 1200, 1);
  check(label + ': the expired tech notice becomes a projection notice during flight', await page.locator('[data-pit-announcement]').innerText() === 'PROJECTION EN COURS');
  const flightState = await capture(label + '-flight.png');
  check(label + ': flight PNG remains in the actual airborne native phase', flightState.throw?.attackerSlot === slot && flightState.throw.age >= 10 && flightState.throw.age < 19 && flightState.positions[1-slot].y > 0);
  await until(s => {observe(s); return s.throw && s.throw.age >= 19 && s.throw.age < 43;}, label + ' native impact drawing after tick19', 1200, 1);
  const impactState = await capture(label + '-landing.png');
  check(label + ': impact PNG shows the real landing pose on the ground', impactState.throw?.attackerSlot === slot && impactState.throw.age >= 19 && impactState.throw.age < 43 && impactState.positions[1-slot].y === 0);
  await until(s => {observe(s); return !s.throw && !s.actions[slot].workbookMove;}, label + ' actual landing and recovery', 240);
  const after = await read();
  const actualDraws = (await draws()).filter(draw => draw.capture?.capturedFrame === caught.throw.capturedFrame && draw.capture.attackerSlot === slot);
  const byPaintedFrame = new Map(), inconsistentDrawFrames = [];
  for (const draw of actualDraws) {
    const sample = {frame: draw.frame, throw: draw.capture, positions: draw.positions};
    const prior = byPaintedFrame.get(draw.frame);
    if (prior && JSON.stringify(prior) !== JSON.stringify(sample)) inconsistentDrawFrames.push({prior, current: sample});
    else byPaintedFrame.set(draw.frame, sample);
  }
  const paintedSamples = [...byPaintedFrame.values()].sort((a, b) => a.frame - b.frame);
  const pollingAges = new Set(samples.map(sample => sample.throw.age));
  const missingPollingAges = Array.from({length: 61}, (_, age) => age).filter(age => !pollingAges.has(age));
  // The raw polling snapshots are retained. Strict continuity uses the actual
  // native drawImage observations; no frame or intermediate position is invented.
  observations.push({kind: 'played-connected-throw', label, slot, input, before, caught, airborne, landed, after,
    samples, sampleScope: 'Polling may miss frames. Every actual painted frame0–60 is required below.',
    actualDraws, paintedSamples, inconsistentDrawFrames, missingPollingAges});
  check(label + ': real flight lands once for110 base damage, without replacing identity or stock', Boolean(airborne && landed) && after.life[1 - slot] === before.life[1 - slot] - 110 && JSON.stringify(after.inventory) === JSON.stringify(before.inventory));
  check(label + ': every painted capture/flight/landing tick0–60 is observed without a gap or conflicting duplicate',
    inconsistentDrawFrames.length === 0 && paintedSamples.length === 61 && paintedSamples.every((sample, age) =>
      sample.throw.age === age && sample.frame === caught.throw.capturedFrame + age),
    {paintedCount: paintedSamples.length, inconsistentDrawFrames, missingPollingAges});
  const victimFacing = caught.throw.defenderFacing === 1 ? 'right' : 'left';
  const victimAdmission = admissions.find(row => row.fighterId === ids[1 - slot] && row.role === 'victim' && row.facing === victimFacing);
  check(label + ': every age paints the exact independent victim PNG and native pose without reflection or deformation', paintedSamples.every(sample => {
    const expected = victimAdmission.definition.atlas.clips[0].frames[api.getPitWorkbookThrowVictimFrameV109(sample.throw.age)];
    const src = victimAdmission.definition.atlas.pages.find(page => page.id === expected.pageId).src;
    return actualDraws.some(draw => draw.frame === sample.frame && draw.capture.age === sample.throw.age &&
      draw.src === src && JSON.stringify(draw.rect) === JSON.stringify(expected.rect) &&
      JSON.stringify(draw.positions) === JSON.stringify(sample.positions) &&
      draw.destination?.[2] > 0 && draw.destination?.[3] > 0 &&
      Math.abs(draw.destination[2] / expected.rect[2] - draw.destination[3] / expected.rect[3]) < 1e-9 &&
      draw.matrix[0] > 0 && draw.matrix[3] > 0 && draw.matrix[1] === 0 && draw.matrix[2] === 0 &&
      Math.abs(draw.matrix[0] - draw.matrix[3]) < 1e-9);
  }));
  const roundingTolerance = .005000001, target = 1 - slot, spec = api.PIT_WORKBOOK_FORWARD_THROW_V109;
  check(label + ': every painted target coordinate follows the bounded real trajectory with rounding tolerance only', paintedSamples.every(sample => {
    const expected = api.getPitWorkbookThrowPositionV109(sample.throw), point = sample.positions[target], attacker = sample.positions[slot];
    return Math.abs(point.x - expected.x) <= roundingTolerance && Math.abs(point.y - expected.y) <= roundingTolerance &&
      Math.abs(attacker.x - sample.throw.attackerX) <= roundingTolerance && Math.abs(attacker.y) <= roundingTolerance &&
      Math.abs(sample.throw.destinationX - sample.throw.defenderX) <= spec.distance &&
      (sample.throw.destinationX - sample.throw.defenderX) * sample.throw.direction >= 0 &&
      point.y >= -roundingTolerance && point.y <= spec.height + roundingTolerance &&
      point.x >= Math.min(sample.throw.defenderX, sample.throw.destinationX) - roundingTolerance &&
      point.x <= Math.max(sample.throw.defenderX, sample.throw.destinationX) + roundingTolerance;
  }));
  check(label + ': adjacent actually painted target positions are continuous without a jump', paintedSamples.every((sample, index) => !index ||
    Math.hypot(sample.positions[target].x - paintedSamples[index - 1].positions[target].x,
      sample.positions[target].y - paintedSamples[index - 1].positions[target].y) < 23));
  await capture(label + '-recovered.png');
}
async function tech(slot, label, ids) {
  await approach(slot); const before = await read(); await launch(slot); const caught = await until(s => Boolean(s.throw), label + ' caught');
  await page.locator(`[data-pit-forward-throw-button-v109="${1 - slot}"]`).click(); await page.clock.runFor(17);
  const escaped = await until(s => !s.throw, label + ' fresh actual tech', 12);
  check(label + ': accessible fresh Projection escapes without HP or free Traque', JSON.stringify(escaped.life) === JSON.stringify(before.life) && JSON.stringify(escaped.meter) === JSON.stringify(caught.meter));
  const rendered = await draws();
  for (const participant of [0, 1]) {
    const facing = participant === 0 ? 'right' : 'left';
    const admission = admissions.find(row => row.fighterId === ids[participant] && row.role === 'attacker' && row.facing === facing);
    const pose = admission.definition.atlas.clips[0].frames[5], src = admission.definition.atlas.pages.find(page => page.id === pose.pageId).src;
    check(label + ': J' + (participant + 1) + ' escape visibly holds its own admitted guard drawing', rendered.some(draw => draw.frame === escaped.frame && !draw.capture && draw.actions[participant]?.phase === 'blockstun' && draw.src === src && JSON.stringify(draw.rect) === JSON.stringify(pose.rect)));
  }
  observations.push({kind: 'played-tech', label, before, caught, escaped}); await capture(label + '.png'); await page.clock.runFor(300);
}
async function finishAndReplay(label) {
  for (let attempt = 0; attempt < 400; attempt++) {
    const state = await read(); if (state.combatPhase === 'match-over' && state.terminal === 'true') break;
    if (state.phase !== 'fight' || state.blocked === 'true') {await page.clock.runFor(250); continue;}
    if (Math.abs(state.positions[1].x - state.positions[0].x) > 58) await approach(0);
    await press('KeyL', 32); await page.clock.runFor(900);
  }
  const terminal = await read(); check(label + ': actual attacks finish the complete two-round duel', terminal.combatPhase === 'match-over' && terminal.terminal === 'true');
  await capture(label + '-actual-victory.png');
  const download = page.waitForEvent('download'); await page.getByRole('button', {name: 'Exporter le replay JSON', exact: true}).click();
  const exported = await download, file = path.join(output, label + '-actual-replay.json'); await exported.saveAs(file);
  const replay = api.deserializePitReplay(await fs.readFile(file, 'utf8')); assert(replay); const played = api.playPitReplay(replay);
  check(label + ': exported real V16 inputs reproduce the actual terminal health, stock and frame', replay.engineVersion === 16 && played.frame === terminal.frame && JSON.stringify(played.fighters.map(f => f.health)) === JSON.stringify(terminal.life) && JSON.stringify(played.fighters.map(f => f.workbookDeviceV107)) === JSON.stringify(terminal.inventory));
  await page.getByRole('button', {name: 'Revoir le duel', exact: true}).click();
  await until(s => s.combatPhase === 'match-over' && s.terminal === 'true', label + ' complete public V16 replay', 1600, 250);
  const replayed = await read(); check(label + ': public replay reaches the same genuine outcome', replayed.frame === terminal.frame && JSON.stringify(replayed.life) === JSON.stringify(terminal.life));
  observations.push({kind: 'actual-victory-and-replay', terminal, replayed, archive: path.basename(file), sha256: sha(await fs.readFile(file))});
}
try {
  for (const [index, ids] of [['feral-hunter', 'scar'], ['scar', 'feral-hunter']].entries()) {
    const label = ids.join('-vs-'); await openMatch(ids, label);
    const before = await read(); await launch(0, 'keyboard'); await page.clock.runFor(750); const whiff = await read();
    check(label + ': real out-of-range L+M whiffs without damage or an invented target', !whiff.throw && JSON.stringify(whiff.life) === JSON.stringify(before.life) && !whiff.actions[0].workbookMove);
    await connected(0, label + '-J1', index === 0 ? 'pad' : 'keyboard', ids); await connected(1, label + '-J2', 'button', ids); await tech(index, label + '-tech', ids);
    if (index === 0) await finishAndReplay(label);
    const rendered = await draws();
    for (const admission of admissions) {
      const expectedFacing = ids.indexOf(admission.fighterId) === 0 ? 'right' : 'left'; if (admission.facing !== expectedFacing) continue;
      const slot = ids.indexOf(admission.fighterId);
      const missing = admission.definition.atlas.clips[0].frames.filter((frame, index) => {
        const src = admission.definition.atlas.pages.find(p => p.id === frame.pageId).src;
        return !rendered.some(draw => {
          const action = draw.actions[slot], actionFrame = action?.actionFrame;
          const roleTick = admission.role === 'victim'
            ? draw.capture && draw.capture.attackerSlot !== slot && api.getPitWorkbookThrowVictimFrameV109(draw.capture.age) === index
            : action?.workbookMove === 'TH_F' && (index < 2 || action.connected) && (actionFrame < 4 ? 0 : actionFrame < 8 ? 1 : actionFrame === 8 ? 2 : actionFrame < 11 ? 3 : actionFrame < 26 ? 4 : 5) === index;
          return roleTick && draw.src === src && JSON.stringify(draw.rect) === JSON.stringify(frame.rect) &&
            draw.destination?.[2] > 0 && draw.destination?.[3] > 0 &&
            Math.abs(draw.destination[2] / frame.rect[2] - draw.destination[3] / frame.rect[3]) < 1e-9 &&
            draw.matrix[0] > 0 && draw.matrix[3] > 0 && draw.matrix[1] === 0 && draw.matrix[2] === 0 && Math.abs(draw.matrix[0] - draw.matrix[3]) < 1e-9;
        });
      });
      check(label + ': ' + admission.fighterId + ' ' + admission.role + ' ' + admission.facing + ' paints all six actual native drawings without reflection, rotation or deformation', missing.length === 0, {missing});
    }
    observations.push({kind: 'actual-drawImage-calls', label, draws: rendered}); await context.close();
  }
  check('No JavaScript exception or console.error', errors.length === 0);
} catch (error) {failure = error; console.error(error); await page?.screenshot({path: path.join(output, 'failure.png'), timeout: 5000}).catch(() => {});}
finally {
  const sourceAfter = await snapshot(); const unchanged = JSON.stringify(sourceBefore) === JSON.stringify(sourceAfter);
  checks.push({name: 'Executed sources, driver, admitted art and receipts stay exact', status: unchanged ? 'PASS' : 'FAIL'}); if (!unchanged) failure ??= Error('Sources changed during recipe');
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify({schemaVersion: 1, status: failure ? 'FAIL' : mode === 'compiled-app' ? 'PASS' : 'PASS_EXPLORATORY', mode, baseUrl, buildId, runtimeCommit,
    scope: 'Two unvaried Feral/Scar local duels, independent attacker/victim BODY in both native orientations, actual walking/capture/flight/landing, L+M keyboard/pad/button, fresh tech, whiff, one complete played victory and exact exported/public V16 replay. Other partners/costumes, TH_B and source kit completion remain open.',
    sourceCompletion: false, facts, invocation: {command: 'node scripts/qa-pit-forward-throws-v109.mjs', nodeExecutable: process.execPath, nodeVersion: process.version, environment: {YAUTJA_QA_BASE_URL: baseUrl, YAUTJA_QA_MODE: mode, YAUTJA_QA_BUILD_ID: buildId, YAUTJA_QA_RUNTIME_COMMIT: runtimeCommit, YAUTJA_PIT_FORWARD_THROW_V109_OUTPUT: output}},
    fixtures: [{kind: 'existing-first-tracks-menu-profile', owner: profile.createdAt, description: 'Existing menu-unlock profile only; no combat, win, HP, meter, stock, replay or source draw injected. Neutral virtual pads are pressed only by declared live input.'}],
    servedBuilds, checks, captures, observations, errors, sourceBefore, sourceAfter, failure: failure ? String(failure) : null}, null, 2) + '\n');
  await Promise.allSettled(contexts.map(row => row.close())); await browser.close();
}
if (failure) process.exitCode = 1; else console.log(JSON.stringify({status: mode === 'compiled-app' ? 'PASS' : 'PASS_EXPLORATORY', checks: checks.length, captures: captures.length, output}));
