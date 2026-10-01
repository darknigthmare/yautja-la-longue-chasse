import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { campaignFixture, enterCampaignDeck } from './campaign-browser-helpers.mjs';
import { choosePitFighter, choosePitStage, closePitSelectionOptions, openPitPause, returnPitSelection } from './pit-selection-browser-helpers.mjs';

const url = process.env.V66_STAGE_LIFE_QA_URL || 'http://127.0.0.1:4184';
const output = process.env.V66_STAGE_LIFE_QA_OUTPUT || 'I:/CodexTemp/yautja-v66-20261001/stage-life-application';
const version = process.env.V66_STAGE_LIFE_QA_VERSION || 'V66';
const plan = {stages: JSON.parse(await fs.readFile('app/game/data/pitStageLifeV66.json','utf8')).stages.map(s=>({id:s.stageId,number:Number(s.stageId.split('-')[1])}))};
const manifest = JSON.parse(await fs.readFile('app/game/data/pitStageLifeV66.json', 'utf8'));
const requested = (process.env.V66_STAGE_LIFE_QA_TARGETS || 'all').split(',');
const cases = (process.env.V66_STAGE_LIFE_QA_CASES || 'desktop,reduced,mobile,retry').split(',');
const targets = plan.stages.filter(stage => requested.includes('all') || requested.includes(stage.id) || requested.includes(String(stage.number)));
assert(targets.length > 0, 'the requested application recipe must contain stages');
if (requested.includes('all')) assert.equal(targets.length, 3, 'the V66 application gate covers the three newly animated stages');
for (const target of targets) {
  const stage = manifest.stages.find(stage => stage.stageId === target.id);
  assert(stage, `${target.id} must be assembled before the application recipe`);
  assert.equal(stage.events.length, 3);
  assert.equal(new Set(stage.events.map(event => event.src)).size, 3);
  assert(stage.events.every(event => event.frames.length === 6), 'this batch contains six reviewed drawings per native event');
}
const compiled = await build({ stdin: { contents: 'export {getPitStageLifeScheduleV60,PIT_STAGE_LIFE_CYCLE_V60} from "./app/game/pitStageLifeDirectorV60";export {PIT_ROUND_FRAMES} from "./app/game/systems/pitCombat";', resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' });
const timing = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const temporary = path.resolve('I:/CodexTemp/yautja-v66-20261001/browser-temp');
await fs.mkdir(temporary, { recursive: true }); await fs.mkdir(output, { recursive: true });
process.env.TEMP = temporary; process.env.TMP = temporary;
const sha = value => createHash('sha256').update(value).digest('hex');
const verifiedSourcePaths = ['app/game/data/pitStageLifeV66.json', 'app/game/pitStageLifeV66.ts',
  'app/game/pitStageLifeDirectorV60.ts', 'app/game/pitStageLifeRenderingV60.ts',
  'app/game/PitCanvas.tsx', 'scripts/verify-pit-stage-life-v66.mjs'];
const readSourceHashes = async () => Object.fromEntries(await Promise.all(verifiedSourcePaths.map(async file => [file, sha(await fs.readFile(file))])));
const sourceHashes = await readSourceHashes();
const launchSeeds = new Set();
const checks = [], captures = [], errors = [], httpFailures = [], failedRequests = [];
let browser, context, page, clockInstalled = false;
let requests = [], intentionalFailure = null;

/** Read public telemetry and observe real drawImage calls. No simulation, input,
 * renderer return value, image bytes, schedule or storage is replaced. */
function observeNativeLife(stages) {
  const sources = new Map(stages.flatMap(stage => stage.events.map(event => [event.src, { ...event, stageId: stage.stageId }])));
  const original = CanvasRenderingContext2D.prototype.drawImage;
  const evidence = window.__stageLifeApplicationV66 = { draws: [], samples: [], keys: new Set(), last: '', invalidDraws: [] };
  evidence.read = () => {
    const root = document.querySelector('[data-pit-immersive]');
    const canvas = root?.querySelector('canvas[data-pit-fighter-positions]');
    return {
      frame: Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame),
      timer: Number(root?.dataset.pitTimerFrames), round: Number(root?.dataset.pitPresentationRound),
      phase: root?.dataset.pitCombatPhase, presentation: root?.dataset.pitPresentationPhase,
      paused: root?.dataset.pitPaused, blocked: root?.dataset.pitSimulationBlocked,
      stage: canvas?.dataset.pitStageLifeV66Stage, actors: Number(canvas?.dataset.pitStageLifeV66Actors),
      events: JSON.parse(canvas?.dataset.pitStageLifeV66Events || '[]'),
      missing: JSON.parse(canvas?.dataset.pitStageLifeV66Missing || '[]'),
      seed: Number(canvas?.dataset.pitStageLifeSeed), art: canvas?.dataset.pitArenaArtStatus, planes: canvas?.dataset.pitArenaPlanes,
      positions: JSON.parse(canvas?.dataset.pitFighterPositions || '[]'),
    };
  };
  CanvasRenderingContext2D.prototype.drawImage = function (...args) {
    const result = original.apply(this, args);
    if (!this.canvas.matches?.('canvas[data-pit-fighter-positions]') || !(args[0] instanceof HTMLImageElement) || args.length !== 9) return result;
    const src = new URL(args[0].currentSrc || args[0].src, location.href).pathname;
    const event = sources.get(src);
    if (!event) return result;
    const rect = args.slice(1, 5), destination = args.slice(5), transform = this.getTransform();
    const nativeFrame = event.frames.findIndex(frame => frame.rect.every((n, i) => n === rect[i]));
    const valid = nativeFrame >= 0 && destination[2] > 0 && destination[3] > 0 &&
      Math.abs(destination[2] / rect[2] - destination[3] / rect[3]) < .000001 && transform.a > 0 && transform.d > 0;
    if (!valid && evidence.invalidDraws.length < 40) evidence.invalidDraws.push({ src, rect, destination, matrix: [transform.a, transform.b, transform.c, transform.d] });
    const key = src + ':' + nativeFrame;
    if (!evidence.keys.has(key)) {
      evidence.keys.add(key);
      evidence.draws.push({ stageId: event.stageId, eventId: event.id, src, nativeFrame, rect, destination, matrix: [transform.a, transform.b, transform.c, transform.d], valid });
    }
    return result;
  };
  setInterval(() => {
    const state = evidence.read();
    if (!state.stage || state.actors !== 3) return;
    const key = JSON.stringify([state.stage, state.round, state.paused, state.events.map(event => [event.eventId, event.nativeFrame, event.active, event.cycle, event.occurrence])]);
    if (key !== evidence.last && evidence.samples.length < 8000) { evidence.last = key; evidence.samples.push(state); }
  }, 16);
}
const read = () => page.evaluate(() => window.__stageLifeApplicationV66.read());
const evidence = () => page.evaluate(() => ({ draws: window.__stageLifeApplicationV66.draws, samples: window.__stageLifeApplicationV66.samples, invalidDraws: window.__stageLifeApplicationV66.invalidDraws }));
const clearEvidence = () => page.evaluate(() => { const state = window.__stageLifeApplicationV66; state.draws = []; state.samples = []; state.keys.clear(); state.last = ''; state.invalidDraws = []; });
const storage = () => page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort(([a], [b]) => a.localeCompare(b)))));
function record(name, detail = {}) { checks.push({ name, ...detail }); console.log(JSON.stringify({ passed: true, name })); }
async function shot(name) {
  const file = path.join(output, name + '.png'); await page.screenshot({ path: file });
  captures.push({ file: path.basename(file), sha256: sha(await fs.readFile(file)), visualReview: 'pending-separate-image-inspection' });
}
async function createContext({ mobile = false, reduced = false, blockedPath = null } = {}) {
  console.log(JSON.stringify({ progress: 'opening-isolated-context', mobile, reduced, retry: Boolean(blockedPath) }));
  context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 720 }, isMobile: mobile, hasTouch: mobile, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const fixture = structuredClone(await campaignFixture()); fixture.save.settings.screenShake = false;
  await context.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), fixture);
  await context.addInitScript(observeNativeLife, manifest.stages);
  page = await context.newPage(); page.setDefaultTimeout(60000); requests = [];
  // Install before navigation: the game's rAF and our passive observer interval
  // must use the same browser clock, including timers created on initial load.
  await page.clock.install(); clockInstalled = true;
  intentionalFailure = blockedPath;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !(intentionalFailure && message.text().includes('503'))) errors.push(message.text()); });
  page.on('request', request => requests.push(new URL(request.url()).pathname));
  page.on('response', response => { const pathname = new URL(response.url()).pathname; if (response.status() >= 400 && !(response.status() === 503 && pathname === intentionalFailure)) httpFailures.push({ path: pathname, status: response.status() }); });
  page.on('requestfailed', request => { const reason = request.failure()?.errorText || ''; if (!reason.includes('ERR_ABORTED')) failedRequests.push({ url: request.url(), reason }); });
}
async function openSelection() {
  await enterCampaignDeck(page, { url });
  assert.equal(await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version'), version);
  await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
  await closePitSelectionOptions(page);
  await page.getByRole('radio', { name: /^Versus local/ }).click();
  await closePitSelectionOptions(page);
}
async function rosterToStage(stageId) {
  await choosePitFighter(page, 'jungle-hunter'); await page.locator('[data-pit-selection-confirm]').click();
  await choosePitFighter(page, 'city-hunter'); await page.locator('[data-pit-selection-confirm]').click();
  // Page navigation legitimately selects and previews its first tile. Observe
  // selective loading only after this public navigation reaches the target page.
  const flow = page.locator('[data-pit-selection-step="stage"]');
  const option = flow.locator(`[role="option"][data-choice-id="${stageId}"]`);
  for (let i = 0; i < 12 && !(await option.count()); i++) {
    const previous = flow.locator('[data-pit-stage-page-prev]');
    if (!(await previous.count()) || await previous.isDisabled()) break;
    await previous.click();
  }
  for (let i = 0; i < 12 && !(await option.count()); i++) {
    const next = flow.locator('[data-pit-stage-page-next]');
    if (!(await next.count()) || await next.isDisabled()) break;
    await next.click();
  }
  assert(await option.count(), `${stageId} is available in the real stage roster`);
  const requestStart = requests.length;
  await choosePitStage(page, stageId);
  return requestStart;
}
async function readyPreview(stageId) {
  await page.waitForFunction(id => document.querySelector('[data-pit-stage-preview]')?.dataset.pitStagePreview === id && document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus === 'ready', stageId);
  await page.waitForFunction(() => !document.querySelector('[data-pit-scene-assets]') && !document.querySelector('[data-pit-selection-confirm]')?.disabled);
}
async function launch(stageId) {
  await readyPreview(stageId); await page.locator('[data-pit-selection-confirm]').click();
  await page.waitForFunction(() => document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase === 'fight');
  await page.waitForFunction(id => { const canvas = document.querySelector('canvas[data-pit-stage-life-v66-stage]'); return canvas?.dataset.pitStageLifeV66Stage === id && canvas?.dataset.pitStageLifeV66Actors === '3'; }, stageId);
  await page.locator('[data-pit-immersive]').focus();
  const state = await read(); assert(Number.isInteger(state.seed) && state.seed > 0); assert(!launchSeeds.has(state.seed), 'each live launch owns a new seed'); launchSeeds.add(state.seed); assert.equal(state.stage, stageId); assert.equal(state.actors, 3); assert.deepEqual(state.missing, []);
  assert.equal(state.art, 'bitmap', 'the actual selected stage uses its complete bitmap bank');
  assert.equal(state.events.length, 3); assert(state.events.every(event => event.drawn && ['P1', 'P2', 'P3'].includes(event.pass)));
}
async function freezeClock() {
  if (!clockInstalled) { await page.clock.install(); clockInstalled = true; }
  await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 100));
  await clearEvidence(); await page.clock.runFor(32);
}
async function revealBackgroundByMovingFighters() {
  const before = await read();
  await page.keyboard.down('ArrowLeft'); await page.keyboard.down('Numpad6');
  try {
    for (let step = 0; step < 100; step++) {
      await page.clock.runFor(32);
      const state = await read();
      if (Math.abs(state.positions[0].x - state.positions[1].x) > 650) break;
    }
  } finally { await page.keyboard.up('ArrowLeft'); await page.keyboard.up('Numpad6'); }
  await page.clock.runFor(32);
  const after = await read();
  assert(after.frame > before.frame);
  assert(Math.abs(after.positions[0].x - after.positions[1].x) > 650, 'public movement reveals background motifs behind the initial fighter positions');
  record('public-movement-reveals-background', { before: before.positions, after: after.positions });
}
function roundFrame(state) { return timing.PIT_ROUND_FRAMES - state.timer; }
async function advanceTo(target) {
  let previous = await read(), stalled = 0;
  for (let step = 0; roundFrame(previous) < target && step < 500; step++) {
    assert.equal(previous.phase, 'round', 'the observed bag must belong to a live real round');
    await page.clock.runFor(Math.max(32, Math.min(2000, Math.ceil((target - roundFrame(previous)) * 1000 / 60))));
    const next = await read();
    stalled = next.frame > previous.frame ? 0 : stalled + 1;
    assert(stalled < 12, 'real simulation must advance under the browser clock');
    previous = next;
  }
  assert(roundFrame(previous) >= target, 'target live simulation tick is actually reached');
  return previous;
}
async function verifyPause(name) {
  await openPitPause(page); const before = await read();
  await page.clock.runFor(950); const after = await read();
  assert.equal(before.paused, 'true'); assert.deepEqual(after, before, 'pause holds physical positions, timer and all native life poses');
  await shot(name + '-paused');
  await page.locator('[data-pit-resume]').click();
  // The public resume button restores focus in a scheduled callback. Let that
  // callback run before checking it; waiting on rAF while the clock is paused
  // would deadlock the recipe, even though the application resumed correctly.
  await page.clock.runFor(48);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Combat THE PIT');
  assert.equal((await read()).paused, 'false');
  record(name + '-pause', { frame: before.frame, nativeFrames: before.events.map(event => event.nativeFrame) });
}
function verifySelectiveLoading(stage, start) {
  const paths = [...new Set(requests.slice(start).filter(src => src.includes('/v66/pit-life/')))];
  assert(paths.every(src => stage.events.some(event => event.src === src)), 'only the selected stage native life PNGs may be requested');
  const loaded = [...new Set(requests.filter(src => stage.events.some(event => event.src === src)))];
  assert.deepEqual(loaded.sort(), stage.events.map(event => event.src).sort(), 'all three selected native PNGs load through the application, including previously visited page previews');
  return loaded;
}
function verifyNativeEvidence(stage, observed, { reduced = false } = {}) {
  assert.deepEqual(observed.invalidDraws, []);
  assert(observed.samples.length > 0);
  for (const sample of observed.samples) {
    assert.equal(sample.stage, stage.stageId); assert.equal(sample.actors, 3); assert.deepEqual(sample.missing, []);
    assert.equal(new Set(sample.events.map(event => event.src)).size, 3);
    assert(sample.events.every(event => event.drawn));
    assert(sample.events.filter(event => event.active).length <= 1, 'at most one ambient gesture plays while other motifs rest');
  }
  const frames = stage.events.map(event => {
    const seen = [...new Set(observed.draws.filter(draw => draw.eventId === event.id).map(draw => draw.nativeFrame))].sort((a, b) => a - b);
    assert.deepEqual(seen, reduced ? [event.reducedMotionFrame] : event.frames.map((_, i) => i), `${event.id} native frames actually drawn`);
    return { eventId: event.id, src: event.src, seen };
  });
  if (reduced) assert(observed.samples.every(sample => sample.events.every(event => !event.active)), 'reduced motion must not autoplay ambient animation');
  return frames;
}
async function verifyDesktop(stage, index) {
  console.log(JSON.stringify({ progress: 'public-roster-stage-duel', stageId: stage.stageId, index: index + 1, total: targets.length }));
  const baseline = await storage();
  const requestStart = await rosterToStage(stage.stageId); await readyPreview(stage.stageId);
  await shot(stage.stageId + '-selection'); await launch(stage.stageId);
  const loadedPaths = verifySelectiveLoading(stage, requestStart);
  await freezeClock(); await shot(stage.stageId + '-rest');
  const schedule = timing.getPitStageLifeScheduleV60(stage.stageId, 1, 0, (await read()).seed);
  if (index === 0) {
    await revealBackgroundByMovingFighters(); await shot(stage.stageId + '-fighters-apart');
    await advanceTo(schedule.firstDelay + schedule.starts[1] + 24);
    assert((await read()).events.some(event => event.active), 'pause recipe begins during an actual native ambient gesture');
    await verifyPause(stage.stageId);
  }
  for (let occurrence = 0; occurrence < 3; occurrence++) {
    const event = stage.events[schedule.bag[occurrence]];
    if (roundFrame(await read()) < schedule.firstDelay + schedule.starts[occurrence] + Math.ceil(3 * 60 / event.fps)) await advanceTo(schedule.firstDelay + schedule.starts[occurrence] + Math.ceil(3 * 60 / event.fps));
    await shot(stage.stageId + '-event-' + occurrence);
    await advanceTo(schedule.firstDelay + schedule.starts[occurrence] + Math.ceil(event.frames.length * 60 / event.fps) + 24);
  }
  if (index === 0) {
    await advanceTo(schedule.firstDelay + timing.PIT_STAGE_LIFE_CYCLE_V60 + 60);
  }
  const observed = await evidence(), nativeFrames = verifyNativeEvidence(stage, observed);
  const bag = [0, 1, 2].map(occurrence => {
    const sample = observed.samples.find(sample => sample.events.some(event => event.active && event.cycle === 0 && event.occurrence === occurrence));
    assert(sample, `${stage.stageId}: occurrence ${occurrence} must be observed live`);
    return { eventId: sample.events.find(event => event.active).eventId, firstObservedRoundFrame: roundFrame(sample) };
  });
  assert.equal(new Set(bag.map(item => item.eventId)).size, 3, 'a bag contains all three distinct native events');
  for (let i = 1; i < bag.length; i++) {
    const gap = bag[i].firstObservedRoundFrame - bag[i - 1].firstObservedRoundFrame;
    assert(gap >= 748 && gap <= 1472, 'actual observed gaps stay within the authored12.5–24.5seconds');
  }
  if (index === 0) {
    const next = observed.samples.find(sample => sample.events.some(event => event.active && event.cycle === 1 && event.occurrence === 0));
    assert(next, 'next bag begins in the same real99second round');
    assert.notEqual(next.events.find(event => event.active).eventId, bag[2].eventId, 'no immediate repeat at the bag boundary');
  }
  assert.equal(await storage(), baseline, 'local exhibition leaves all localStorage bytes unchanged');
  await fs.writeFile(path.join(output, stage.stageId + '-evidence.json'), JSON.stringify(observed, null, 2) + '\n');
  record(stage.stageId + '-application', { loadedPaths, nativeFrames, bag, savedBytesUnchanged: true });
  await fs.writeFile(path.join(output, 'progress.json'), JSON.stringify({ status: 'IN_PROGRESS', url, version,
    updatedAt: new Date().toISOString(), checks, captures, errors, httpFailures, failedRequests }, null, 2) + '\n');
  await page.clock.resume(); await returnPitSelection(page);
}

try {
  browser = await chromium.launch({ channel: process.env.V66_STAGE_LIFE_QA_CHANNEL || 'chrome', headless: true });
  if (cases.includes('desktop')) {
    await createContext(); await openSelection();
    for (const [index, target] of targets.entries()) await verifyDesktop(manifest.stages.find(stage => stage.stageId === target.id), index);
    await context.close(); context = null; page = null;
  }
  const representative = manifest.stages.find(stage => stage.stageId === targets[0].id);
  if (cases.includes('reduced')) {
    await createContext({ reduced: true }); await openSelection(); const before = await storage();
    const start = await rosterToStage(representative.stageId); await launch(representative.stageId);
    verifySelectiveLoading(representative, start); await freezeClock();
    const initial = await read(), schedule = timing.getPitStageLifeScheduleV60(representative.stageId, 1, 0, (await read()).seed);
    await advanceTo(schedule.firstDelay + schedule.starts[2] + 180);
    const observed = await evidence(); const nativeFrames = verifyNativeEvidence(representative, observed, { reduced: true });
    assert((await read()).frame > initial.frame, 'reduced motion still allows the combat simulation to run');
    await verifyPause('reduced'); await shot('reduced-motion'); assert.equal(await storage(), before);
    record('reduced-motion', { stageId: representative.stageId, nativeFrames, savedBytesUnchanged: true });
    await context.close(); context = null; page = null;
  }
  if (cases.includes('mobile')) {
    const stage = manifest.stages.find(stage => stage.stageId === targets.at(-1).id);
    await createContext({ mobile: true }); await openSelection(); const before = await storage();
    const start = await rosterToStage(stage.stageId); await launch(stage.stageId); verifySelectiveLoading(stage, start); await freezeClock();
    const schedule = timing.getPitStageLifeScheduleV60(stage.stageId, 1, 0, (await read()).seed);
    await advanceTo(schedule.firstDelay + schedule.starts[2] + 180);
    const nativeFrames = verifyNativeEvidence(stage, await evidence());
    for (const [name, viewport] of [['landscape', { width: 844, height: 390 }], ['portrait', { width: 390, height: 844 }]]) {
      await page.setViewportSize(viewport); await page.clock.runFor(48);
      const layout = await page.evaluate(() => ({ viewport: [innerWidth, innerHeight], documentWidth: document.documentElement.scrollWidth,
        canvas: (() => { const rect = document.querySelector('canvas[data-pit-fighter-positions]')?.getBoundingClientRect(); return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null; })() }));
      assert(layout.documentWidth <= layout.viewport[0] + 1, 'mobile has no horizontal document overflow');
      assert(layout.canvas?.width > 0 && layout.canvas.height > 0 && layout.canvas.x >= -1 && layout.canvas.y >= -1 &&
        layout.canvas.x + layout.canvas.width <= layout.viewport[0] + 1 && layout.canvas.y + layout.canvas.height <= layout.viewport[1] + 1,
      'real combat canvas fits both dimensions of the mobile viewport');
      assert(await page.getByRole('button', { name: 'SAUT', exact: true }).isVisible(), 'public touch controls are available');
      await shot('mobile-' + name); record('mobile-' + name, layout);
    }
    await verifyPause('mobile'); assert.equal(await storage(), before);
    record('mobile-native-events', { stageId: stage.stageId, nativeFrames, savedBytesUnchanged: true, limitation: 'Chromium emulation, not a physical device.' });
    await context.close(); context = null; page = null;
  }
  if (cases.includes('retry')) {
    const blockedPath = representative.events[1].src;
    await createContext({ blockedPath }); let blocked = true, failures = 0;
    await page.route('**' + blockedPath, route => { if (blocked) { failures++; return route.fulfill({ status: 503, contentType: 'text/plain', body: 'Intentional native life PNG failure for V66 QA' }); } return route.continue(); });
    await openSelection(); const before = await storage(); const start = await rosterToStage(representative.stageId);
    await page.waitForFunction(() => document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus === 'failed');
    assert(failures > 0); assert(await page.locator('[data-pit-selection-confirm]').isDisabled(), 'a missing native event blocks launch');
    assert.equal(await page.locator('[data-pit-immersive]').count(), 0, 'failed assets cannot silently launch a substitute arena');
    await shot('native-png-503-blocked'); blocked = false;
    await page.getByRole('button', { name: 'Réessayer l’aperçu', exact: true }).click();
    await readyPreview(representative.stageId); await launch(representative.stageId);
    const loadedPaths = verifySelectiveLoading(representative, start); await freezeClock();
    assert.equal((await read()).actors, 3); assert.deepEqual((await read()).missing, []);
    await shot('native-png-retry-restored'); assert.equal(await storage(), before);
    record('native-png-retry-503', { blockedPath, intentionalFailures: failures, loadedPaths, realActorsAfterRetry: (await read()).actors, savedBytesUnchanged: true });
    await context.close(); context = null; page = null;
  }
  assert.deepEqual(errors, []); assert.deepEqual(httpFailures, []); assert.deepEqual(failedRequests, []);
  assert.deepEqual(await readSourceHashes(), sourceHashes, 'runtime and recipe sources remain unchanged during the verification');
  const result = { status: 'PASS', surface: 'full-application-public-roster-stage-duel-flow', checkedAt: new Date().toISOString(), url, version,
    completeV66ThreeStageGate: requested.includes('all') && cases.includes('desktop'), targets: targets.map(stage => stage.id), cases, sourceHashes, checks, captures, errors, httpFailures, failedRequests,
    limitations: ['Browser timer control advances the normal simulation; no combat state or schedule was injected.', 'The compositor/alpha/native-pixel gates remain separate.', 'Screenshots require explicit independent visual review.', 'Mobile checks emulate Chromium, not physical devices.'] };
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify({ status: 'PASS', output, checks: checks.length }));
} catch (error) {
  if (page) await shot('failure').catch(() => {});
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ status: 'FAIL', error: String(error), stack: error.stack, sourceHashes, checks, captures, errors, httpFailures, failedRequests, state: page ? await read().catch(() => null) : null, evidence: page ? await evidence().catch(() => null) : null }, null, 2) + '\n');
  console.error(error); process.exitCode = 1;
} finally { await context?.close().catch(() => {}); await browser?.close(); }
