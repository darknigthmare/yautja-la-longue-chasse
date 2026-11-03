import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { build } from 'esbuild';
import { campaignFixture, enterCampaignDeck } from './campaign-browser-helpers.mjs';
import { selectPitMatch, closePitSelectionOptions, openPitPause, resumePitFight, openPitLaboratory } from './pit-selection-browser-helpers.mjs';

const url = process.env.V51_ROUND_QA_URL || 'http://127.0.0.1:4174';
const output = process.env.V51_ROUND_QA_OUTPUT || 'outputs/qa-commercial-audit/v51/round-presentation-browser-qa';
await fs.mkdir(output, { recursive: true });
const checks = [], errors = [], responses = [];
const browserChannel = process.env.V51_QA_BROWSER_CHANNEL || 'chrome';
let browser;
let activePage;
const monitors = [];
const resultSelector = '[aria-labelledby="pit-result"]';

// These are read-only DOM observations. No combat refs, clock, health or replay data are patched.
function readBrowserState() {
  const root = document.querySelector('[data-pit-immersive]');
  if (!root) return null;
  const value = name => root.getAttribute(name) ?? document.querySelector(`[${name}]`)?.getAttribute(name) ?? null;
  const number = name => { const raw = value(name); return raw === null || raw === '' ? null : Number(raw); };
  const canvas = root.querySelector('canvas[data-pit-fighter-positions]');
  return {
    phase: value('data-pit-presentation-phase'),
    elapsedMs: number('data-pit-presentation-elapsed-ms') ?? number('data-pit-presentation-elapsed'),
    durationMs: number('data-pit-presentation-duration-ms') ?? number('data-pit-presentation-duration'),
    countdown: number('data-pit-presentation-countdown'), round: number('data-pit-presentation-round'),
    fighterSlot: number('data-pit-presentation-fighter-slot'), winnerSlot: number('data-pit-presentation-winner-slot'),
    blocked: value('data-pit-presentation-blocked') === 'true',
    simulationBlocked: value('data-pit-simulation-blocked') === 'true',
    terminalReady: value('data-pit-presentation-terminal-ready') === 'true',
    combatPhase: value('data-pit-combat-phase'), frame: number('data-pit-frame'), timer: number('data-pit-timer-frames'),
    paused: value('data-pit-paused') === 'true', loading: Boolean(root.querySelector('[data-pit-match-loading]')),
    meters: [...root.querySelectorAll('[data-pit-hud] [role="progressbar"]')].map(node => ({ name: node.getAttribute('aria-label'), value: Number(node.getAttribute('aria-valuenow')), max: Number(node.getAttribute('aria-valuemax')) })),
    rounds: [...root.querySelectorAll('[data-pit-hud] [aria-label$="manche gagnée"]')].map(node => node.getAttribute('aria-label')),
    positions: canvas ? JSON.parse(canvas.dataset.pitFighterPositions) : null,
  };
}
const read = page => page.evaluate(readBrowserState);
const engine = state => ({ frame: state.frame, timer: state.timer, meters: state.meters, rounds: state.rounds, positions: state.positions });
function noHeldAction(before, after) {
  assert.deepEqual(after.positions, before.positions);
  assert.deepEqual(after.meters.filter(meter => meter.name?.startsWith('Vie de ')), before.meters.filter(meter => meter.name?.startsWith('Vie de ')));
  const previous = before.meters.filter(meter => meter.name?.startsWith('Traque de '));
  const current = after.meters.filter(meter => meter.name?.startsWith('Traque de '));
  // Once COMBAT appears, passive resource regeneration resumes equally for both idle players.
  assert.equal(current[0].value - previous[0].value, current[1].value - previous[1].value);
  assert(current.every((meter, index) => meter.value >= previous[index].value));
}
async function phase(page, wanted, timeout = 45000) {
  await page.waitForFunction(wanted => document.querySelector('[data-pit-presentation-phase]')?.getAttribute('data-pit-presentation-phase') === wanted, wanted, { timeout });
  const state = await read(page);
  assert(Number.isFinite(state.frame) && Number.isFinite(state.timer) && Number.isFinite(state.elapsedMs), 'Exact simulation and presentation markers must be present');
  return state;
}
async function frozen(page, presentation = false, delay = 300) {
  const before = await read(page); await page.waitForTimeout(delay); const after = await read(page);
  assert.deepEqual(engine(after), engine(before), 'HP/resources, timer, simulation frame and positions must remain frozen');
  if (presentation) assert.deepEqual({ phase: after.phase, elapsed: after.elapsedMs, countdown: after.countdown }, { phase: before.phase, elapsed: before.elapsedMs, countdown: before.countdown });
  return { before, after };
}
function monitor(page, name) {
  let running = true, failure = null, previous = '';
  const events = [];
  const completed = (async () => {
    while (running && !page.isClosed()) {
      try {
        const state = await read(page);
        if (state) {
          const signature = JSON.stringify([state.phase, state.countdown, state.round, state.fighterSlot, state.winnerSlot, state.blocked, state.terminalReady, state.loading]);
          if (signature !== previous) { events.push({ at: new Date().toISOString(), ...state }); previous = signature; }
        }
        await page.waitForTimeout(40);
      } catch (error) { if (running) failure = String(error); break; }
    }
  })();
  const result = { name, events, async stop() { running = false; await completed; assert.equal(failure, null); return events; } };
  monitors.push(result); return result;
}
async function verifyCheckpointRotation(before, after, saveKey, changedKeys) {
  const bundle = await build({ stdin: { contents: 'export {createCompleteArchive} from "./app/game/systems/completeArchive.ts";', resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
  const { createCompleteArchive } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  const storage = { getItem: key => before[key] ?? null, setItem: () => { throw new Error('Read-only QA snapshot'); }, removeItem: () => { throw new Error('Read-only QA snapshot'); } };
  const expected = createCompleteArchive(JSON.parse(before[saveKey]), storage).archive;
  const priorSlots = Object.entries(before).filter(([key]) => /^yautja-long-hunt\.campaign-slot\.[1-5](\.backup)?$/.test(key)).map(([, raw]) => JSON.parse(raw));
  const priorCheckpoints = new Set(priorSlots.flatMap(slot => slot.checkpoints.map(checkpoint => JSON.stringify(checkpoint))));
  const deltas = [];
  for (const key of changedKeys) {
    assert(/^yautja-long-hunt\.campaign-slot\.[1-5](\.backup)?$/.test(key));
    const document = JSON.parse(after[key]);
    if (key.endsWith('.backup')) {
      assert(priorSlots.some(slot => JSON.stringify(slot) === JSON.stringify(document)), 'A rotated backup must equal a complete prior slot');
      deltas.push({ key, change: 'prior-slot-backed-up', revision: document.revision }); continue;
    }
    const old = before[key] ? JSON.parse(before[key]) : null; assert(old, 'Replay cannot create another campaign slot');
    for (const field of ['format', 'version', 'id', 'ownerCreatedAt', 'label']) assert.deepEqual(document[field], old[field]);
    const checkpoints = [];
    for (const checkpoint of document.checkpoints) {
      if (priorCheckpoints.has(JSON.stringify(checkpoint))) { checkpoints.push({ id: checkpoint.id, change: 'unchanged' }); continue; }
      assert.equal(checkpoint.kind, 'auto', 'Replay cannot alter manual checkpoints');
      assert.deepEqual(checkpoint.archive.campaign, expected.campaign, 'Autosave campaign payload must equal pre-replay progression');
      assert.deepEqual(checkpoint.archive.attachments, expected.attachments, 'Autosave sidecars must equal pre-replay PIT, replay, hunt and ship data');
      checkpoints.push({ id: checkpoint.id, change: 'scheduled-auto', campaignAndAllSidecarsEqualBeforeReplay: true });
    }
    deltas.push({ key, beforeRevision: old.revision, afterRevision: document.revision, checkpoints });
  }
  return deltas;
}
function record(name, details = {}) { checks.push({ name, ...details }); console.log(JSON.stringify({ check: name, passed: true })); }
async function shot(page, name) { await page.screenshot({ path: path.join(output, name + '.png') }); }
async function createPage(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'no-preference', ...options });
  const fixture = structuredClone(await campaignFixture()); fixture.save.settings.screenShake = false;
  await context.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), fixture);
  // Only the browser's standard hardware input surface is simulated for the declared gamepad checks.
  await context.addInitScript(() => {
    window.__pitV51Pad = { connected: false, axes: [0, 0, 0, 0], buttons: Array(17).fill(false) };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => {
      const pad = window.__pitV51Pad;
      return pad.connected ? [{ id: 'V51 QA virtual standard controller', index: 0, connected: true, mapping: 'standard', axes: pad.axes,
        buttons: pad.buttons.map(pressed => ({ pressed, touched: pressed, value: pressed ? 1 : 0 })) }] : [];
    } });
  });
  const page = await context.newPage(); activePage = page; page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) responses.push({ url: response.url(), status: response.status() }); });
  await enterCampaignDeck(page, { url });
  assert.equal(await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version'), 'V51', 'Browser QA must target the V51 production build, never a stale V50 server');
  return { page, context, fixture };
}
async function enterSelection(page, mode = 'Versus local') {
  await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
  await chooseMode(page, mode);
}
async function chooseMode(page, mode) {
  await closePitSelectionOptions(page);
  await page.getByRole('radio', { name: new RegExp('^' + mode) }).click();
  await closePitSelectionOptions(page);
}
async function select(page, launch = true) { await selectPitMatch(page, { player: 'jungle-hunter', opponent: 'city-hunter', arena: 'the-pit', launch }); }
async function readyFight(page) {
  await phase(page, 'fight');
  await page.waitForFunction(() => Number(document.querySelector('[data-pit-frame]')?.getAttribute('data-pit-frame')) > 5);
  assert.equal((await read(page)).blocked, false);
}
async function visibleOutcomes(page, winner) {
  for (const slot of [0, 1]) {
    const card = page.locator(`[data-pit-presentation-outcome-slot="${slot}"]`);
    assert(await card.isVisible(), 'Both result cards must actually be visible before the final dialog');
    assert.equal(await card.getAttribute('data-outcome'), slot === winner ? 'victory' : 'defeat');
    assert.match(await card.innerText(), slot === winner ? /VICTOIRE/ : /DÉFAITE/);
    assert.match(await card.innerText(), slot === 0 ? /Jungle Hunter/ : /City Hunter/);
  }
}
async function releaseKeys(page) { for (const key of ['ArrowRight', 'KeyL', 'Numpad4', 'Numpad5']) await page.keyboard.up(key); }
function assertOpening(events) {
  const initial = events.filter(event => event.round === 1 && !event.loading);
  const order = initial.map(event => event.phase + (event.phase === 'countdown' ? '-' + event.countdown : ''));
  let cursor = -1;
  for (const expected of ['intro-left', 'intro-right', 'countdown-3', 'countdown-2', 'countdown-1', 'fight']) {
    cursor = order.indexOf(expected, cursor + 1); assert(cursor >= 0, `Missing ordered phase ${expected}: ${JSON.stringify(order)}`);
  }
  for (const event of initial.filter(event => ['intro-left', 'intro-right', 'countdown'].includes(event.phase))) {
    assert.equal(event.frame, 0); assert.equal(event.blocked, true); assert.equal(event.timer, initial[0].timer);
    assert.equal(event.meters[0].value, event.meters[0].max); assert.equal(event.meters[2].value, event.meters[2].max);
  }
}
async function winTwoRounds(page, slot, trace, prefix) {
  const movement = slot === 0 ? 'ArrowRight' : 'Numpad4', attack = slot === 0 ? 'KeyL' : 'Numpad5';
  let reviewedRound = 0, attempts = 0;
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    const state = await read(page);
    if (state.phase === 'match-result') break;
    if (state.phase === 'round-result') {
      await releaseKeys(page);
      if (reviewedRound !== state.round) {
        reviewedRound = state.round;
        assert.equal(state.winnerSlot, slot); assert.equal(state.blocked, true); assert.equal(state.simulationBlocked, false);
        assert.equal(state.combatPhase, 'round-over');
        assert.equal(await page.locator(resultSelector).isVisible(), false);
        await visibleOutcomes(page, slot);
        const before = await read(page); await shot(page, `${prefix}-round-${state.round}-result`); await page.waitForTimeout(200); const after = await read(page);
        assert(after.frame > before.frame, 'Historic inter-round ticks continue for replay compatibility');
        assert.equal(after.timer, before.timer); assert.deepEqual(after.meters, before.meters);
        await phase(page, 'countdown');
        const next = await read(page); assert.equal(next.round, state.round + 1);
        assert.equal(next.countdown, 3); await frozen(page);
        await shot(page, `${prefix}-round-${next.round}-countdown`);
      }
      continue;
    }
    if (state.blocked) { await releaseKeys(page); await page.waitForTimeout(50); continue; }
    await page.keyboard.down(movement);
    await page.keyboard.press(attack, { delay: 70 });
    await page.waitForTimeout(440);
    if (++attempts % 20 === 0) console.log(JSON.stringify({ progress: prefix, attempts, round: state.round, frame: state.frame }));
  }
  await releaseKeys(page);
  const end = await phase(page, 'match-result', 1000);
  assert.equal(end.winnerSlot, slot); assert.equal(end.combatPhase, 'match-over'); assert.equal(end.blocked, true);
  assert.equal(end.terminalReady, false); assert.equal(await page.locator(resultSelector).isVisible(), false);
  assert.equal(end.meters[slot === 0 ? 2 : 0].value, 0);
  await visibleOutcomes(page, slot);
  await shot(page, `${prefix}-victory-defeat`);
  // A held confirm must not skip the cinematic or instantly rematch when its dialog opens.
  await page.evaluate(() => { window.__pitV51Pad.connected = true; window.__pitV51Pad.buttons[0] = true; });
  await frozen(page, false, 300);
  assert.equal(await page.locator(resultSelector).isVisible(), false);
  await page.locator(resultSelector).waitFor({ state: 'visible' });
  const final = await read(page); assert.equal(final.terminalReady, true); assert.deepEqual(engine(final), engine(end));
  await page.waitForTimeout(250); assert.equal((await read(page)).phase, 'match-result');
  await page.evaluate(() => { window.__pitV51Pad.buttons[0] = false; window.__pitV51Pad.connected = false; });
  await shot(page, `${prefix}-results-dialog`);
  const nextRound = trace.events.filter(event => event.round === 2);
  for (const digit of [3, 2, 1]) assert(nextRound.some(event => event.phase === 'countdown' && event.countdown === digit));
  assert(!nextRound.some(event => event.phase.startsWith('intro-')), 'Later rounds use countdown without repeating character introductions');
  return final;
}

try {
  browser = await chromium.launch({ ...(browserChannel === 'headless-shell' ? {} : { channel: browserChannel }), headless: true });
  const desktop = await createPage(); const page = desktop.page;
  let blockSprites = true; const pending = [];
  // Atlas loading starts when selection opens. Delay only a fighter atlas, never the mandatory arena preview.
  const delayedSprite = '**/game/sprites/v32/pit/jungle-hunter-idle.png';
  await page.route(delayedSprite, route => { if (blockSprites) pending.push(route); else return route.continue(); });
  await enterSelection(page); await select(page, false);
  const liveTrace = monitor(page, 'live-player-one');
  await page.locator('[data-pit-selection-confirm]').click();
  await page.locator('[data-pit-match-loading]').waitFor();
  const loading = await frozen(page, true, 400); assert.equal(loading.before.frame, 0); assert.equal(loading.before.elapsedMs, 0);
  assert(pending.length > 0, 'A real sprite request must be delayed');
  blockSprites = false; await Promise.all(pending.map(route => route.continue())); await page.unroute(delayedSprite);
  await page.locator('[data-pit-match-loading]').waitFor({ state: 'detached' });
  record('loading-delays-all-presentation-and-combat-clocks', { delayedRequests: pending.length, loading });

  await phase(page, 'intro-left');
  assert.match(await page.locator('[data-pit-round-presentation] [data-slot="0"]').innerText(), /CHASSEUR 1[\s\S]*Jungle Hunter/i);
  await shot(page, 'intro-player-one');
  await page.keyboard.press('Escape'); await page.locator('[data-pit-paused="true"]').waitFor();
  const pause = await frozen(page, true, 400); await resumePitFight(page);
  record('pause-freezes-character-introduction', { pause });
  await phase(page, 'intro-right');
  assert.match(await page.locator('[data-pit-round-presentation] [data-slot="1"]').innerText(), /ADVERSAIRE[\s\S]*City Hunter/i);
  await shot(page, 'intro-player-two');
  await phase(page, 'countdown');
  // Disable Chromium's always-focused automation emulation before a real tab activation.
  const focusCdp = await desktop.context.newCDPSession(page);
  await focusCdp.send('Emulation.setFocusEmulationEnabled', { enabled: false });
  const tab = await desktop.context.newPage(); await tab.goto('about:blank'); await tab.bringToFront();
  const hidden = await page.evaluate(() => ({ hidden: document.hidden, visibility: document.visibilityState, hasFocus: document.hasFocus() }));
  console.log(JSON.stringify({ tabFocusObservation: hidden }));
  assert.equal(hidden.hasFocus, false, 'The browser must actually remove focus; no synthetic blur event is dispatched');
  await page.locator('[data-pit-paused="true"]').waitFor({ timeout: 5000 });
  const tabFrozen = await frozen(page, true, 350); await tab.close(); await page.bringToFront();
  assert.equal((await read(page)).paused, true, 'Returning to the tab does not silently unpause');
  await focusCdp.send('Emulation.setFocusEmulationEnabled', { enabled: true }); await focusCdp.detach();
  await resumePitFight(page); record('real-tab-focus-loss-freezes-countdown-until-resume', { hidden, tabFrozen, hiddenVisibilityExercised: hidden.hidden });

  const start = await read(page); await page.keyboard.down('ArrowRight'); await page.keyboard.down('KeyL');
  await readyFight(page);
  assert.equal(await page.locator('[data-pit-round-presentation] strong').innerText(), 'COMBAT');
  await shot(page, 'fight-signal'); await page.waitForTimeout(250);
  const held = await read(page); noHeldAction(start, held);
  await releaseKeys(page); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(140); await page.keyboard.up('ArrowRight');
  assert((await read(page)).positions[0].x > start.positions[0].x);
  assertOpening(liveTrace.events); record('intro-countdown-order-and-held-key-release', { phases: liveTrace.events.slice(), heldInputsDidNotLeak: true });
  const final = await winTwoRounds(page, 0, liveTrace, 'player-one');
  record('real-round-win-next-countdown-and-terminal-victory', { final });
  await liveTrace.stop();

  const savedBeforeReplay = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await fs.writeFile(path.join(output, 'replay-storage-before.json'), JSON.stringify(savedBeforeReplay, null, 2));
  const replayTrace = monitor(page, 'replay');
  await page.getByRole('button', { name: 'Revoir le duel', exact: true }).click();
  await phase(page, 'intro-left'); const replayIntro = await frozen(page); assert.equal(replayIntro.before.frame, 0);
  await readyFight(page); await openPitPause(page); await frozen(page, true); await resumePitFight(page);
  await page.locator(resultSelector).waitFor({ state: 'visible', timeout: 180000 });
  assert.match(await page.locator(resultSelector).innerText(), /Archive restituée/i);
  const replayEnd = await read(page); assert.deepEqual(engine(replayEnd), engine(final));
  const savedAfterReplay = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await fs.writeFile(path.join(output, 'replay-storage-after.json'), JSON.stringify(savedAfterReplay, null, 2));
  const progressionStores = saved => Object.fromEntries(Object.entries(saved).filter(([key]) => !key.startsWith('yautja-long-hunt.campaign-slot.')));
  assert.deepEqual(progressionStores(savedAfterReplay), progressionStores(savedBeforeReplay), 'Replay cannot award another result or mutate progression, PIT archives or replay stores');
  const rotatedCheckpointKeys = [...new Set([...Object.keys(savedBeforeReplay), ...Object.keys(savedAfterReplay)])].filter(key => savedBeforeReplay[key] !== savedAfterReplay[key]);
  assert(rotatedCheckpointKeys.every(key => key.startsWith('yautja-long-hunt.campaign-slot.')), 'Only scheduled campaign checkpoints may rotate during the replay');
  const checkpointDeltas = await verifyCheckpointRotation(savedBeforeReplay, savedAfterReplay, desktop.fixture.key, rotatedCheckpointKeys);
  assertOpening(replayTrace.events); await shot(page, 'replay-identical-results'); await replayTrace.stop();
  record('replay-delays-outside-recorded-ticks-and-identical-results', { endFrame: replayEnd.frame, archiveUnchanged: true, rotatedCheckpointKeys, checkpointDeltas, replayIntro });

  await page.getByRole('button', { name: 'Retour au vaisseau', exact: true }).click();
  await page.locator('[data-campaign-location="deck"]').waitFor();
  await enterSelection(page); await select(page, false);
  const secondTrace = monitor(page, 'live-player-two');
  await page.locator('[data-pit-selection-confirm]').click(); await readyFight(page);
  const defeat = await winTwoRounds(page, 1, secondTrace, 'player-two'); await secondTrace.stop();
  record('real-player-one-defeat-and-player-two-victory', { defeat });
  await desktop.context.close();

  const training = await createPage(); await enterSelection(training.page, 'Entraînement');
  const trainingTrace = monitor(training.page, 'explicit-training'); await select(training.page); await readyFight(training.page);
  assert(!trainingTrace.events.some(event => event.phase.startsWith('intro-') || event.phase === 'countdown'));
  await openPitLaboratory(training.page);
  const lab = training.page.getByRole('complementary', { name: 'Laboratoire d’entraînement', exact: true });
  await lab.getByRole('button', { name: 'Geler la simulation', exact: true }).click(); const frozenLab = await frozen(training.page);
  await lab.getByRole('button', { name: 'Avancer d’un tick', exact: true }).click();
  await training.page.waitForFunction(frame => Number(document.querySelector('[data-pit-frame]')?.getAttribute('data-pit-frame')) === frame + 1, frozenLab.before.frame);
  await frozen(training.page); await trainingTrace.stop(); record('explicit-training-bypasses-intros-and-preserves-single-tick');
  await training.context.close();

  const pad = await createPage(); await enterSelection(pad.page); await select(pad.page, false);
  await pad.page.locator('[data-pit-selection-confirm]').click(); await phase(pad.page, 'intro-left');
  await pad.page.evaluate(() => { window.__pitV51Pad.connected = true; window.__pitV51Pad.axes[0] = 1; window.__pitV51Pad.buttons[2] = true; });
  const padStart = await read(pad.page); await readyFight(pad.page); await pad.page.waitForTimeout(250);
  noHeldAction(padStart, await read(pad.page));
  await pad.page.evaluate(() => { window.__pitV51Pad.axes[0] = 0; window.__pitV51Pad.buttons[2] = false; }); await pad.page.waitForTimeout(150);
  await pad.page.evaluate(() => { window.__pitV51Pad.axes[0] = 1; }); await pad.page.waitForTimeout(200);
  assert((await read(pad.page)).positions[0].x > padStart.positions[0].x);
  await pad.page.evaluate(() => { window.__pitV51Pad.axes[0] = 0; });
  record('held-virtual-gamepad-needs-neutral-before-fighting', { physicalControllerTested: false }); await pad.context.close();

  const mobile = await createPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  await enterSelection(mobile.page); await select(mobile.page); await phase(mobile.page, 'intro-left');
  // The visible controls are intentionally inert during introductions; includeHidden resolves their geometry without waiting for the fight.
  const right = mobile.page.getByRole('button', { name: '▶', exact: true, includeHidden: true }), box = await right.boundingBox(); assert(box);
  assert(box.x >= 0 && box.y >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844, 'The held touch must land on the visible control');
  const cdp = await mobile.context.newCDPSession(mobile.page); let touchActive = false;
  const startTouch = async () => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] }); touchActive = true; };
  const endTouch = async () => { if (touchActive) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); touchActive = false; } };
  try {
    await startTouch(); const touchStart = await read(mobile.page); await phase(mobile.page, 'countdown');
    await mobile.page.waitForFunction(() => Number(document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationElapsedMs) >= 300);
    await shot(mobile.page, 'mobile-countdown-reduced-motion');
    await readyFight(mobile.page); await mobile.page.waitForTimeout(250); assert.deepEqual((await read(mobile.page)).positions, touchStart.positions);
    await endTouch(); await startTouch(); await mobile.page.waitForFunction(x => JSON.parse(document.querySelector('canvas[data-pit-fighter-positions]').dataset.pitFighterPositions)[0].x > x + 10, touchStart.positions[0].x);
    await endTouch();
    assert(await mobile.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight + 1));
    record('touch-held-through-countdown-and-reduced-motion', { realCdpTouch: true, neutralRequired: true, viewport: { width: 390, height: 844 }, physicalTouchscreenTested: false });
  } finally { await endTouch(); await cdp.detach(); }
  await mobile.context.close();

  assert.deepEqual(errors, []); assert.deepEqual(responses, []);
  const traces = monitors.map(({ name, events }) => ({ name, events }));
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ passed: true, contentVersion: 'V51', browserChannel, checkedAt: new Date().toISOString(), url, checks, traces, errors, responses,
    limits: ['Real keyboard bouts against an idle second local player; no competitive-balance claim.', 'Read-only DOM polling; no combat, timing, health or replay injection.', 'Scheduled campaign checkpoint rotation is allowed during replay; all progression and PIT/replay stores must remain byte-identical.', 'Virtual standard Gamepad API and CDP touch, no physical hardware certification.', 'Headless Chromium tab activation exercises real focus loss after disabling always-focused emulation; document.hidden may remain false, so this is not hidden-window certification.', 'Default Jungle Hunter/City Hunter identity presentation is not evidence of dedicated intro/victory/defeat sprites for every fighter.'] }, null, 2));
  console.log(JSON.stringify({ passed: true, checks: checks.length, output }));
} catch (error) {
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ passed: false, checkedAt: new Date().toISOString(), url, error: String(error), stack: error?.stack, checks, traces: monitors.map(({ name, events }) => ({ name, events })), errors, responses }, null, 2));
  throw error;
} finally {
  await Promise.all(monitors.map(item => item.stop().catch(() => {})));
  await browser?.close();
}
