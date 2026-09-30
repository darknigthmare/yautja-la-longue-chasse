import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { enterCampaignDeck } from './campaign-browser-helpers.mjs';
import { openPitSelectionOptions } from './pit-selection-browser-helpers.mjs';

const url = process.env.V59_FERAL_REPLAY_QA_URL || 'http://127.0.0.1:4177';
const output = process.env.V59_FERAL_REPLAY_QA_OUTPUT || 'work-local/v59/qa/replay-vinext-final';
const version = process.env.V59_FERAL_REPLAY_QA_VERSION || 'V59';
const fixturePath = 'tests/fixtures/pit-replay-v58-feral-v9.json';
const fixtureBytes = await fs.readFile(fixturePath, 'utf8');
const replay = JSON.parse(fixtureBytes);
assert.equal(replay.engineVersion, 9); assert.equal(replay.metadata.checksum, 'b3244626');
const art = JSON.parse(await fs.readFile('app/game/data/pitFeralArtV59.json', 'utf8'));
const launcherPaths = art.records.filter(record => record.action === 'launcher').map(record => record.src);
const bundle = await build({ stdin: { contents: [
  "export {defaultSave,SAVE_STORAGE_KEY} from './app/game/save.ts';",
  "export {playPitReplay} from './app/game/systems/pitReplay.ts';",
  "export {createPitReplayArchive,withLatestPitReplay,pitReplayStorageKey,serializePitReplayArchive} from './app/game/systems/pitReplayStorage.ts';",
].join('\n'), resolveDir: process.cwd() }, bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent' });
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const expected = api.playPitReplay(replay);
assert.deepEqual(expected.fighters.map(fighter => fighter.health), [960, 438]);
assert.equal(expected.frame, 360);
const owner = '2026-09-20T00:00:00.000Z';
const save = api.defaultSave(owner); save.settings.screenShake = false;
const archive = api.withLatestPitReplay(api.createPitReplayArchive(owner), replay, owner);
const seed = { [api.SAVE_STORAGE_KEY]: JSON.stringify(save), [api.pitReplayStorageKey(owner)]: api.serializePitReplayArchive(archive) };
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.V59_FERAL_REPLAY_QA_CHANNEL || 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const errors = [], httpFailures = [], captures = [];
await context.addInitScript(seed => {
  // Authorized, disposable QA fixture representing a pre-existing campaign and
  // its V9 replay archive. This is not a claim of file import through the UI.
  if (!sessionStorage.getItem('feral-v9-fixture-initialized')) {
    for (const [key, value] of Object.entries(seed)) localStorage.setItem(key, value);
    sessionStorage.setItem('feral-v9-fixture-initialized', 'true');
  }
}, seed);
await context.addInitScript(launcherPaths => {
  const sources = new WeakMap(), original = CanvasRenderingContext2D.prototype.drawImage;
  window.__feralReplayV59 = { nativeLauncherDraws: [], bodySources: {}, boltSamples: [] };
  CanvasRenderingContext2D.prototype.drawImage = function (...args) {
    const result = original.apply(this, args);
    const source = args[0], src = source instanceof HTMLImageElement
      ? new URL(source.currentSrc || source.src, location.href).pathname : sources.get(source);
    const combat = this.canvas.matches('canvas[data-pit-technique-entities]');
    if (src && !combat) sources.set(this.canvas, src);
    if (combat && args.length === 9) {
      const report = window.__feralReplayV59;
      if (src && launcherPaths.includes(src)) report.nativeLauncherDraws.push({ src, rect: args.slice(1, 5) });
      if (src?.includes('feral')) report.bodySources[src] = (report.bodySources[src] || 0) + 1;
      const entities = JSON.parse(this.canvas.dataset.pitTechniqueEntities || '[]');
      const frame = Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame);
      if (entities.some(entity => entity.bolt) && report.boltSamples.at(-1)?.frame !== frame) {
        report.boltSamples.push({ frame, entities, positions: JSON.parse(this.canvas.dataset.pitFighterPositions || '[]') });
      }
    }
    return result;
  };
}, launcherPaths);
const page = await context.newPage(); page.setDefaultTimeout(45000);
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('response', response => { if (response.status() >= 400) httpFailures.push({ status: response.status(), url: response.url() }); });
const readStorage = () => page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
const read = () => page.evaluate(() => ({
  frame: Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame),
  phase: document.querySelector('[data-pit-immersive]')?.dataset.pitCombatPhase,
  life: [...document.querySelectorAll('[role="progressbar"][aria-label^="Vie de"]')].map(el => Number(el.getAttribute('aria-valuenow'))),
  entities: JSON.parse(document.querySelector('canvas[data-pit-technique-entities]')?.dataset.pitTechniqueEntities || '[]'),
  plasma: Number(document.querySelector('canvas[data-pit-plasma-count]')?.dataset.pitPlasmaCount),
}));
const shot = async name => { await page.screenshot({ path: path.join(output, name + '.png') }); captures.push(name + '.png'); };
try {
  await enterCampaignDeck(page, { url });
  assert.equal(await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version'), version);
  await page.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
  await page.locator('[data-pit-selection-step]').waitFor();
  const before = await readStorage();
  await openPitSelectionOptions(page);
  await page.getByRole('button', { name: 'REVOIR LE DERNIER DUEL', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase === 'fight');
  await page.clock.install();
  await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 200));
  let capturedFlight = false;
  for (let tick = 0; tick < 400 && (await read()).frame < replay.metadata.ticks; tick++) {
    await page.clock.runFor(16);
    const state = await read();
    if (!capturedFlight && state.entities.some(entity => entity.bolt)) {
      await shot('v9-physical-flight-without-v59-launcher'); capturedFlight = true;
    }
  }
  await page.clock.runFor(80);
  const final = await read();
  const evidence = await page.evaluate(() => window.__feralReplayV59);
  assert.equal(final.frame, replay.metadata.finalFrame);
  assert.equal(final.phase, replay.metadata.finalPhase);
  assert.deepEqual(final.life, expected.fighters.map(fighter => fighter.health));
  assert.equal(final.plasma, 0);
  assert(capturedFlight && evidence.boltSamples.length > 0, 'the saved V9 technique must actually play in the browser');
  assert(Object.keys(evidence.bodySources).length > 0, 'a real Feral body must be drawn during playback');
  assert.deepEqual(evidence.nativeLauncherDraws, [], 'historical V9 torso-origin bolts must never use V59 muzzle-origin launcher frames');
  await page.getByRole('dialog').getByText('RELECTURE TERMINÉE', { exact: true }).waitFor();
  await shot('v9-replay-completed');
  assert.deepEqual(await readStorage(), before, 'reading the saved replay preserves all settings/progression/archive bytes');
  assert.equal(await fs.readFile(fixturePath, 'utf8'), fixtureBytes);
  assert.deepEqual(errors, []); assert.deepEqual(httpFailures, []);
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ status: 'PASS', version, url,
    setup: 'A fresh isolated browser context starts with an explicitly seeded pre-existing campaign and V9 replay sidecar. Playback is launched by the actual REVOIR LE DERNIER DUEL UI button; this is not file-import QA and no runtime combat state is injected.',
    fixture: fixturePath, engineVersion: replay.engineVersion, checksum: replay.metadata.checksum,
    expectedHealth: expected.fighters.map(fighter => fighter.health), final, nativeLauncherDrawCount: evidence.nativeLauncherDraws.length,
    legacyBodySources: evidence.bodySources, observedBoltFrames: evidence.boltSamples.length,
    firstBoltSample: evidence.boltSamples[0], storageUnchanged: true, captures, errors, httpFailures,
    visualInspection: 'Pending independent screenshot review.' }, null, 2));
  console.log(JSON.stringify({ status: 'PASS', frame: final.frame, health: final.life, nativeLauncherDraws: 0, boltFrames: evidence.boltSamples.length }));
} catch (error) {
  await shot('failure').catch(() => {});
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ status: 'FAIL', url, error: String(error.stack || error),
    state: await read().catch(() => null), evidence: await page.evaluate(() => window.__feralReplayV59).catch(() => null),
    body: await page.locator('body').innerText().catch(() => null), storage: await readStorage().catch(() => null), errors, httpFailures, captures }, null, 2));
  throw error;
} finally { await browser.close(); }
