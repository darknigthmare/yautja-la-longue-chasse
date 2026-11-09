import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';

// OPS F08/09/10 and F29–33/47/48: actual production GameClient and durable
// native controls. Only initial disclosed saves and read-only observations
// are injected. No DOM fixture, synthetic result, clock or callback injection.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, process.env.CLAN_P0P1_QA_OUTPUT || 'outputs/qa-clan-ship-p0p1-20261109');
const url = process.env.CLAN_P0P1_QA_URL || 'http://127.0.0.1:3120';
const observeAudio = process.env.CLAN_P0P1_AUDIO_QA === '1';
const sha = value => createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, 'recipe-run.lock'), new Date().toISOString() + '\n', { flag: 'wx' });
const bundle = await build({ stdin: { contents: [
  "export {defaultSave,SAVE_STORAGE_KEY,parseSaveImport} from './app/game/save.ts';",
  "export * from './app/game/systems/clanShipDocking.ts';",
  "export * from './app/game/systems/clanShipOperations.ts';",
  "export * from './app/game/systems/clanShipSpaceEncounter.ts';",
  "export * from './app/game/systems/clanShipInterior.ts';",
].join('\n'), resolveDir: root }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const domain = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const { SAVE_STORAGE_KEY } = domain;
function initial(owner, room = 'hangar', ready = false) {
  let save = domain.defaultSave(owner);
  save.profile.hunterName = 'QA P0/P1 · préconditions déclarées';
  save.settings.masterVolume = observeAudio ? .3 : 0;
  if (observeAudio) save.settings.musicVolume = 0;
  let docking = domain.createClanShipDockingState(owner, 'classic-predator-spaceship');
  for (const type of ['approach', 'dock', 'board']) {
    const result = domain.actClanShipDocking(docking, { type }, { ownerCreatedAt: owner, personalShipId: 'classic-predator-spaceship' });
    assert.ok(result.accepted); docking = result.state;
  }
  save.clanShipDocking = docking;
  save.clanShipOperations = domain.createClanShipOperations(owner);
  const roomAt = target => {
    if (save.clanShipDocking.roomId === target) return;
    const result = domain.actClanShipDocking(save.clanShipDocking, { type: 'move-room', roomId: target },
      { ownerCreatedAt: owner, personalShipId: 'classic-predator-spaceship' });
    assert.ok(result.accepted); save.clanShipDocking = result.state;
  };
  if (ready) {
    for (const step of domain.CLAN_SHIP_ONBOARDING_STEPS) {
      roomAt(step.roomId);
      const result = domain.actClanShipOperations(save.clanShipOperations,
        { type: 'onboard-step', stepId: step.id, expectedRevision: save.clanShipOperations.revision },
        { ownerCreatedAt: owner, campaign: save, docking: save.clanShipDocking });
      assert.ok(result.accepted); save.clanShipOperations = result.state;
    }
    roomAt('conseil');
    const result = domain.actClanShipOperations(save.clanShipOperations,
      { type: 'accept-mandate', expectedRevision: save.clanShipOperations.revision },
      { ownerCreatedAt: owner, campaign: save, docking: save.clanShipDocking });
    assert.ok(result.accepted); save.clanShipOperations = result.state;
    save.profile.clanMarks += result.clanMarksReward;
  }
  roomAt(room);
  const imported = domain.parseSaveImport(JSON.stringify(save));
  assert.equal(imported.failure, null); assert.ok(imported.save);
  assert.deepEqual(imported.save.clanShipOperations, save.clanShipOperations);
  return save;
}
const fixtures = [
  { id: 'terminal-routing', save: initial('2026-11-09T12:00:00.000Z'),
    disclosure: 'Adult historical campaign, boarding and empty operations ledger only. Every welcome checkpoint, mandate and tested internal contract is completed through native browser controls.' },
  { id: 'spatial-gaps', save: initial('2026-11-09T13:00:00.000Z', 'conseil', true),
    disclosure: 'Adult historical campaign, initial welcome and mandate prepared through production reducers. No field result, recruit, spatial order, victory, defeat or spatial reward is seeded.' },
];
for (const fixture of fixtures) {
  const raw = JSON.stringify(fixture.save, null, 2) + '\n';
  fixture.filename = `initial-${fixture.id}.json`; fixture.sha256 = sha(raw);
  await fs.writeFile(path.join(out, fixture.filename), raw);
}
await fs.writeFile(path.join(out, 'fixture-disclosure.json'), JSON.stringify(fixtures.map(({ save, ...fixture }) => ({ ...fixture,
  ownerCreatedAt: save.createdAt, initialMarks: save.profile.clanMarks, initialReceipts: save.clanShipOperations.completedContracts.map(item => item.contractId),
  initialSpatialEncounter: save.clanShipOperations.spaceEncounter, initialCrew: save.clanShipOperations.recruitedNpcIds,
  browserPlayedFieldHunts: false })), null, 2) + '\n');
if (process.argv.includes('--fixtures-only')) {
  console.log(JSON.stringify({ fixturesValidated: fixtures.length, browserExecuted: false }));
  process.exit(0);
}
async function filesBelow(directory) {
  const entries = await fs.readdir(path.join(root, directory), { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? filesBelow(path.join(directory, entry.name)) : [path.join(directory, entry.name)]))).flat();
}
async function identity() {
  const names = [...await filesBelow('app'), ...await filesBelow('desktop'), 'package.json', 'package-lock.json', 'scripts/qa-clan-ship-p0p1-20261109.mjs'].sort();
  const source = await Promise.all(names.map(async filename => ({ filename, sha256: sha(await fs.readFile(path.join(root, filename))) })));
  const namesBuilt = (await filesBelow('.next')).filter(filename => /(?:BUILD_ID|manifest\.json|\.js)$/.test(filename) && !filename.includes('/cache/')).sort();
  const built = await Promise.all(namesBuilt.map(async filename => ({ filename, sha256: sha(await fs.readFile(path.join(root, filename))) })));
  return { commit: git('rev-parse', 'HEAD'), workingTree: git('status', '--porcelain'), source, sourceSha256: sha(JSON.stringify(source)),
    productionBuild: built, productionBuildSha256: sha(JSON.stringify(built)), buildId: (await fs.readFile(path.join(root, '.next/BUILD_ID'), 'utf8')).trim() };
}
const report = { startedAt: new Date().toISOString(), recipe: 'scripts/qa-clan-ship-p0p1-20261109.mjs',
  recipeSha256: sha(await fs.readFile(fileURLToPath(import.meta.url))), url, browserExecuted: false, passed: false,
  checks: [], routes: [], commands: [], readOnly: [], screenshots: [], servedScripts: [], errors: [], requestFailures: [], httpErrors: [], missingAssets: [],
  audio: { observed: observeAudio, method: 'Native AudioContext oscillator calls observed without replacing nodes, clocks, game callbacks or audio results', events: [], hardwareListening: false },
  limits: ['No field hunt completed by this recipe: OPS-F18/F19 remain outside its qualification.',
    'No physical gamepad, human artistic review, full campaign or performance measurement. Initial fixtures are explicitly disclosed.'],
  walking: { samples: 0, rooms: [] } };
let browser, context, page, label;
const scripts = [], assets = new Set();
try {
  report.identityBefore = await identity();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium', headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  report.browserVersion = browser.version(); report.browserExecuted = true;
  const scene = () => page.locator('[data-clan-interior]');
  const panel = () => page.locator('[data-clan-operations]');
  const storedRaw = () => page.evaluate(key => localStorage.getItem(key), SAVE_STORAGE_KEY);
  const stored = async () => JSON.parse(await storedRaw());
  const actor = () => scene().evaluate(element => ({ room: element.getAttribute('data-interior-room'),
    x: Number(element.getAttribute('data-interior-actor-x')), y: Number(element.getAttribute('data-interior-actor-y')) }));
  const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  async function collectWalking() {
    const samples = await page.evaluate(() => window.__clanP0P1Qa.walking.splice(0));
    for (const sample of samples) {
      assert.ok([0, -.02, .02].some(dx => [0, -.02, .02].some(dy => domain.isClanShipInteriorWalkable(sample.room, { x: sample.x + dx, y: sample.y + dy }))), `Footprint ${JSON.stringify(sample)}`);
      if (!report.walking.rooms.includes(sample.room)) report.walking.rooms.push(sample.room);
    }
    report.walking.samples += samples.length; return samples;
  }
  async function check(name, run) {
    const start = Date.now();
    try {
      await run(); await collectWalking();
      const save = await stored();
      assert.equal(domain.parseSaveImport(JSON.stringify(save)).failure, null, 'Native durable campaign remains importable');
      report.checks.push({ name, context: label, passed: true, durationMs: Date.now() - start }); console.log('PASS', label, name);
    } catch (error) { report.checks.push({ name, context: label, passed: false, message: error.message }); throw error; }
  }
  async function screenshot(filename) {
    await page.waitForLoadState('networkidle'); await page.locator('.toast').waitFor({ state: 'hidden', timeout: 8000 }); await frames();
    const bytes = await page.screenshot({ path: path.join(out, filename), fullPage: false });
    report.screenshots.push({ filename, sha256: sha(bytes), viewport: page.viewportSize(), inspected: false });
  }
  async function continueCampaign() {
    await page.locator('[data-campaign-menu]').waitFor();
    if (await page.locator('[data-menu-section="campaign"]').isVisible()) await page.locator('[data-menu-section="campaign"]').click();
    await page.locator('[data-menu-action="continue"]').click();
    await page.locator('[data-campaign-session]').waitFor({ timeout: 90000 }); await scene().waitFor(); await page.bringToFront(); await frames();
  }
  async function start(fixture) {
    label = fixture.id;
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, hasTouch: true, reducedMotion: 'reduce' });
    await context.addInitScript(({ key, save, observeAudio }) => {
      if (!['http:', 'https:'].includes(location.protocol)) return;
      if (!localStorage.getItem('__clanP0P1Seeded')) {
        localStorage.setItem(key, JSON.stringify(save)); localStorage.setItem('__clanP0P1Seeded', 'true');
      }
      window.__clanP0P1Qa = { walking: [], audio: [], masterGains: [] };
      if (observeAudio && window.AudioContext) {
        const proto = AudioContext.prototype, create = proto.createOscillator, createGain = proto.createGain;
        proto.createGain = function (...args) {
          const gain = createGain.apply(this, args), destination = this.destination, connect = gain.connect;
          gain.connect = function (...connections) {
            // GameAudio routes its master through the native limiter, then
            // to destination. Other owners may connect a master directly.
            if (connections[0] === destination || connections[0] instanceof DynamicsCompressorNode)
              window.__clanP0P1Qa.masterGains.push(gain.gain);
            return connect.apply(this, connections);
          };
          return gain;
        };
        let nextSource = 0;
        proto.createOscillator = function (...args) {
          const oscillator = create.apply(this, args), id = ++nextSource, currentTime = () => this.currentTime;
          for (const method of ['setValueAtTime', 'exponentialRampToValueAtTime']) {
            const original = oscillator.frequency[method];
            oscillator.frequency[method] = function (value, when) {
              window.__clanP0P1Qa.audio.push({ source: id, method, value, when, currentTime: currentTime() });
              return original.call(this, value, when);
            };
          }
          for (const method of ['start', 'stop']) {
            const original = oscillator[method];
            oscillator[method] = function (...args) {
              window.__clanP0P1Qa.audio.push({ source: id, method, when: args[0] ?? 0, currentTime: currentTime() });
              return original.apply(this, args);
            };
          }
          return oscillator;
        };
      }
      let previous = '';
      const observe = () => {
        const e = document.querySelector('[data-clan-interior]');
        if (e) {
          const sample = { room: e.getAttribute('data-interior-room'), x: Number(e.getAttribute('data-interior-actor-x')), y: Number(e.getAttribute('data-interior-actor-y')) };
          const signature = JSON.stringify(sample);
          if (signature !== previous) { window.__clanP0P1Qa.walking.push(sample); previous = signature; }
        } else previous = '';
        requestAnimationFrame(observe);
      }; requestAnimationFrame(observe);
    }, { key: SAVE_STORAGE_KEY, save: fixture.save, observeAudio });
    page = await context.newPage(); page.setDefaultTimeout(30000);
    page.on('pageerror', error => report.errors.push({ context: label, message: error.message, stack: error.stack }));
    page.on('console', message => { if (message.type() === 'error') report.errors.push({ context: label, type: 'console.error', message: message.text() }); });
    page.on('requestfailed', request => report.requestFailures.push({ context: label, url: request.url(), failure: request.failure() }));
    page.on('request', request => { const pathname = new URL(request.url()).pathname; if (pathname.startsWith('/game/')) assets.add(pathname); });
    page.on('response', response => {
      const pathname = new URL(response.url()).pathname;
      if (response.status() >= 400) report.httpErrors.push({ url: response.url(), status: response.status() });
      if (pathname.startsWith('/game/') && (response.status() >= 400 || response.request().resourceType() === 'image' && response.headers()['content-type']?.includes('text/html'))) report.missingAssets.push(pathname);
      if (response.request().resourceType() === 'script' && response.status() < 400) scripts.push((async () => {
        const bytes = await response.body(); const item = { pathname, sha256: sha(bytes), bytes: bytes.length };
        if (pathname.startsWith('/_next/static/') && pathname.endsWith('.js')) {
          item.buildFile = '.next/' + pathname.slice('/_next/'.length);
          item.buildFileSha256 = sha(await fs.readFile(path.join(root, item.buildFile)));
          item.matchesBuiltFile = item.sha256 === item.buildFileSha256;
        } report.servedScripts.push(item);
      })().catch(error => report.errors.push({ stage: 'served-script-proof', message: error.message })));
    });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 }); await continueCampaign();
  }
  async function openPanel(tab = 'post') {
    if (!await panel().count()) {
      const button = page.locator('[data-interior-operations]');
      if (await button.getAttribute('data-interior-operations-ready') !== 'true') {
        await button.click();
        await page.waitForFunction(() => document.querySelector('[data-interior-operations]')?.getAttribute('data-interior-operations-ready') === 'true' && document.querySelector('[data-clan-interior]')?.getAttribute('data-interior-moving') === 'false', null, { timeout: 45000 });
      }
      await button.click(); await panel().waitFor();
    }
    await page.locator(`[data-clan-operations-tab="${tab}"]`).click();
    assert.equal(await page.locator(`[data-clan-operations-tab="${tab}"]`).getAttribute('aria-pressed'), 'true');
  }
  async function closePanel() {
    if (!await panel().count()) return;
    await page.locator('[data-clan-operations-close]').click(); await panel().waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.activeElement?.hasAttribute('data-interior-world'));
  }
  async function durableClick(selector) {
    const before = await stored(); await page.locator(selector).click();
    await page.waitForFunction(({ key, revision }) => JSON.parse(localStorage.getItem(key))?.clanShipOperations?.revision > revision,
      { key: SAVE_STORAGE_KEY, revision: before.clanShipOperations.revision });
    await frames();
    const after = await stored(); assert.equal(after.clanShipOperations.revision, before.clanShipOperations.revision + 1); return after;
  }
  async function readOnly(name, run) {
    const before = await storedRaw(); await run(); await frames(); const after = await storedRaw(); assert.equal(after, before, name);
    const filename = `read-only-${label}-${name}.json`;
    await fs.writeFile(path.join(out, filename), JSON.stringify({ before, after, beforeSha256: sha(before), afterSha256: sha(after), unchanged: true }, null, 2) + '\n');
    report.readOnly.push({ name, filename, unchanged: true, sha256: sha(before) });
  }
  const audioCount = () => page.evaluate(() => window.__clanP0P1Qa.audio.length);
  async function toneSince(start, frequency, expected = true) {
    if (!observeAudio) return;
    const events = await page.evaluate(start => window.__clanP0P1Qa.audio.slice(start), start);
    const matching = events.filter(event => event.method === 'setValueAtTime' && Math.abs(event.value - frequency) < .001);
    assert.equal(matching.length > 0, expected, `Native oscillator ${frequency} Hz ${expected ? 'present' : 'absent'}`);
    for (const event of matching) assert.ok(events.some(other => other.source === event.source && other.method === 'start'), 'Observed oscillator really scheduled');
    report.audio.events.push({ context: label, frequency, expected, events });
  }
  async function route(target) {
    await collectWalking(); const before = await stored(), from = await actor();
    // This exact table control is the historical gap: no outside room selector.
    const button = page.locator(`[data-clan-operation-route="${target}"]`).first();
    await button.click(); await panel().waitFor({ state: 'hidden' });
    await page.waitForFunction(({ key, target }) => {
      const e = document.querySelector('[data-clan-interior]');
      return JSON.parse(localStorage.getItem(key))?.clanShipDocking?.roomId === target && e?.getAttribute('data-interior-room') === target &&
        e.getAttribute('data-interior-moving') === 'false' && !e.getAttribute('data-interior-target-room');
    }, { key: SAVE_STORAGE_KEY, target }, { timeout: 65000 });
    await frames(); const samples = await collectWalking(), after = await stored();
    assert.deepEqual(after.clanShipOperations, before.clanShipOperations, 'Guidance cannot advance an operation');
    assert.equal(after.profile.clanMarks, before.profile.clanMarks);
    const rooms = [from.room]; for (const sample of samples) if (sample.room !== rooms.at(-1)) rooms.push(sample.room);
    const ring = domain.CLAN_SHIP_INTERIOR_ROOM_ORDER;
    for (let i = 1; i < rooms.length; i++) { const gap = Math.abs(ring.indexOf(rooms[i]) - ring.indexOf(rooms[i - 1])); assert.ok(gap === 1 || gap === ring.length - 1); }
    assert.ok(samples.length > 10); assert.equal((await actor()).room, target);
    report.routes.push({ from, target, rooms, samples: samples.length, sourceControl: 'data-clan-operation-route', operationUnchanged: true });
  }
  async function accept(id) {
    await openPanel('contracts'); await page.locator(`[data-clan-contract-card="${id}"]`).click();
    const save = await durableClick(`[data-clan-accept-contract="${id}"]`); assert.equal(save.clanShipOperations.activeContract.contractId, id); return save;
  }
  async function order(type) {
    const before = await stored(), encounter = before.clanShipOperations.spaceEncounter;
    const expected = domain.actClanShipSpaceEncounter(encounter, { type, expectedTurn: encounter.turn }); assert.ok(expected.accepted);
    const after = await durableClick(`[data-clan-space-order="${type}"]`);
    assert.deepEqual(after.clanShipOperations.spaceEncounter, expected.state, `Native ${type} matches production deterministic rules`);
    report.commands.push({ type, before: encounter, after: after.clanShipOperations.spaceEncounter, marksBefore: before.profile.clanMarks, marksAfter: after.profile.clanMarks });
    return after;
  }
  async function reload() { await collectWalking(); await page.reload({ waitUntil: 'networkidle' }); await continueCampaign(); }

  await start(fixtures[0]);
  await check('P0 F09: opening the terminal walks to its real service point', async () => {
    const audioStart = await audioCount();
    const before = await actor(); await openPanel(); const after = await actor();
    assert.ok(Math.hypot(after.x - before.x, after.y - before.y) > 25);
    assert.ok(Math.hypot(after.x - domain.CLAN_SHIP_INTERIOR_ROOMS.hangar.servicePoint.x, after.y - domain.CLAN_SHIP_INTERIOR_ROOMS.hangar.servicePoint.y) <= 64);
    assert.equal((await stored()).clanShipOperations.onboardingStep, 0);
    await toneSince(audioStart, 164.8); await toneSince(audioStart, 329.6);
  });
  for (const [index, step] of domain.CLAN_SHIP_ONBOARDING_STEPS.entries()) await check(`Native welcome checkpoint ${index + 1} and terminal route to next post`, async () => {
    await openPanel(); await durableClick(`[data-clan-onboard-step="${step.id}"]`);
    const target = domain.CLAN_SHIP_ONBOARDING_STEPS[index + 1]?.roomId || 'conseil';
    await route(target);
  });
  await check('P1 F08/F10: council mandate, massive projection and four distinct tabs', async () => {
    await openPanel(); await durableClick('[data-clan-accept-mandate]');
    assert.equal((await stored()).clanShipOperations.mandateAccepted, true);
    await screenshot('01-native-council-mandate.png');
    await readOnly('four-tabs', async () => { for (const tab of ['post', 'contracts', 'crew', 'journal']) {
      await openPanel(tab); assert.equal(await panel().count(), 1);
    } });
  });
  for (const id of ['ship-training-circuit', 'ship-armory-audit']) {
    await check(`${id}: native acceptance at council`, async () => {
      if ((await actor()).room !== 'conseil') { await openPanel('contracts'); await route('conseil'); }
      await accept(id);
    });
    for (const step of domain.clanShipContract(id).steps) await check(`${id}: actual terminal guidance and ${step.id}`, async () => {
      await openPanel('contracts'); if ((await actor()).room !== step.roomId) { await route(step.roomId); await openPanel('contracts'); }
      const before = await stored(), after = await durableClick(`[data-clan-interior-step="${step.id}"]`);
      assert.equal(after.clanShipOperations.activeContract?.stepIndex ?? domain.clanShipContract(id).steps.length,
        (before.clanShipOperations.activeContract?.stepIndex ?? 0) + 1);
    });
  }
  await check('Terminal-only routes covered all seven rooms and retained save import validity', async () => {
    assert.equal(report.walking.rooms.length, 7); await screenshot('02-native-guidance-seven-rooms.png');
  });
  await context.close();

  await start(fixtures[1]); await openPanel('contracts');
  await check('Spatial departure contains no seeded spatial history or field receipt', async () => {
    const save = await stored(); assert.equal(save.clanShipOperations.spaceEncounter, null);
    assert.equal(save.clanShipOperations.completedContracts.filter(item => item.proof.kind === 'field').length, 0);
    await accept('space-screening');
  });
  await check('P1 F48: all nine previews are read-only and expose availability from actual saved rules', async () => {
    const audioStart = await audioCount();
    await readOnly('nine-previews', async () => {
      const encounter = (await stored()).clanShipOperations.spaceEncounter;
      for (const type of domain.CLAN_SHIP_SPACE_ORDERS) {
        const expected = domain.clanShipSpaceOrderAvailability(encounter, type), button = page.locator(`[data-clan-space-order="${type}"]`);
        assert.equal(await button.isDisabled(), !expected.available);
        await button.hover(); if (expected.available) { await button.focus(); await page.locator(`[data-clan-space-forecast="${type}"]`).waitFor(); }
      }
    });
    await toneSince(audioStart, 494.4, false); await toneSince(audioStart, 123.6, false);
  });
  await check('P0 F29: recharge executes once, caps energy and full reserves disable a second recharge', async () => {
    const audioStart = await audioCount();
    const before = await stored(), after = await order('recharge'); assert.equal(after.clanShipOperations.spaceEncounter.energy, 8);
    assert.equal(after.clanShipOperations.spaceEncounter.turn, before.clanShipOperations.spaceEncounter.turn + 1);
    assert.equal(await page.locator('[data-clan-space-order="recharge"]').isDisabled(), true);
    await toneSince(audioStart, 123.6); await toneSince(audioStart, 494.4);
    await screenshot('03-native-recharge-capped.png');
  });
  await check('P0 F33: closing, backgrounding and reopening preserve the active turn and exact save', async () => {
    await readOnly('close-background-resume', async () => {
      const closingAudio = await audioCount();
      await closePanel();
      await toneSince(closingAudio, 247.2);
      const backgroundAudio = await audioCount();
      const cdp = await context.newCDPSession(page); await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false });
      const other = await context.newPage(); await other.goto('about:blank');
      const otherCdp = await context.newCDPSession(other); await otherCdp.send('Emulation.setFocusEmulationEnabled', { enabled: false });
      await other.bringToFront(); await page.waitForFunction(() => !document.hasFocus());
      await page.bringToFront(); await other.close(); await page.waitForFunction(() => document.hasFocus()); await cdp.detach();
      await toneSince(backgroundAudio, 123.6, false); await toneSince(backgroundAudio, 494.4, false);
      await openPanel('contracts');
    });
  });
  await check('P0 F32: tactical formation reaches zero before the 16-turn timeout, without reward', async () => {
    const initialSave = await stored(); let save = initialSave;
    let lastAudio;
    while (save.clanShipOperations.spaceEncounter.status === 'active') {
      lastAudio = await audioCount();
      save = await order(save.clanShipOperations.spaceEncounter.energy < 7 ? 'recharge' : 'manoeuvre');
    }
    const end = save.clanShipOperations.spaceEncounter;
    assert.equal(end.status, 'defeat'); assert.equal(end.formationIntegrity, 0); assert.ok(end.turn < 16);
    assert.equal(save.profile.clanMarks, initialSave.profile.clanMarks);
    assert.equal(save.clanShipOperations.completedContracts.some(item => item.contractId === 'space-screening'), false);
    await toneSince(lastAudio, 92.7); await toneSince(lastAudio, 329.6, false);
    await page.locator('[data-space-gauge="Formation"]').scrollIntoViewIfNeeded();
    await screenshot('04-native-formation-defeat.png');
  });
  await check('P1 F47: terminal defeat report, orders and zero integrity survive a real reload', async () => {
    const before = await stored(); await reload(); await openPanel('contracts');
    const after = await stored(); assert.deepEqual(after.clanShipOperations, before.clanShipOperations);
    await page.locator('[data-clan-space-status="defeat"]').waitFor();
    const audioStart = await audioCount();
    await readOnly('terminal-defeat-report', async () => {
      const journal = page.locator('[data-clan-space] [data-clan-space-report]').locator('..'); assert.match(await journal.innerText(), /formation|objectif|fenêtre/i);
      await openPanel('journal'); await openPanel('contracts');
    });
    await toneSince(audioStart, 92.7, false); await toneSince(audioStart, 329.6, false);
  });
  await check('P0 F32: retry then voluntary withdrawal has its own persisted outcome, without reward', async () => {
    const before = await stored(); await accept('space-screening'); const audioStart = await audioCount(); const after = await order('withdraw');
    assert.equal(after.clanShipOperations.spaceEncounter.status, 'withdrawn'); assert.equal(after.profile.clanMarks, before.profile.clanMarks);
    await toneSince(audioStart, 185.4); await toneSince(audioStart, 329.6, false);
    await screenshot('05-native-voluntary-withdrawal.png');
  });
  await check('P0 F32: another retry secures the actual escort objective and pays only its one receipt', async () => {
    const before = await stored(); await accept('space-screening'); let save;
    let lastAudio;
    for (const type of ['scan', 'manoeuvre', 'brace', 'brace', 'extract']) { lastAudio = await audioCount(); save = await order(type); }
    assert.equal(save.clanShipOperations.spaceEncounter.status, 'victory');
    assert.equal(save.profile.clanMarks, before.profile.clanMarks + domain.clanShipContract('space-screening').clanMarksReward);
    assert.equal(save.clanShipOperations.completedContracts.filter(item => item.contractId === 'space-screening').length, 1);
    await toneSince(lastAudio, 164.8); await toneSince(lastAudio, 329.6);
    await readOnly('paid-once', async () => {
      await page.locator('[data-clan-contract-card="space-screening"]').click();
      assert.equal(await page.locator('[data-clan-accept-contract="space-screening"]').isDisabled(), true);
    }); await screenshot('06-native-escort-victory.png');
  });
  await check('P0 F29: native recovery exercises scan, disruption, close formation, boarding and extraction', async () => {
    await accept('space-recovery');
    for (const type of ['scan', 'scan', 'manoeuvre', 'brace', 'disrupt', 'brace', 'disrupt', 'brace', 'manoeuvre', 'brace', 'board', 'brace', 'extract']) await order(type);
    assert.equal((await stored()).clanShipOperations.spaceEncounter.status, 'victory'); await screenshot('07-native-recovery-victory.png');
  });
  await check('P0 F29: native interception accepts concentrated fire before an explicit withdrawal', async () => {
    await accept('space-interception');
    for (const type of ['scan', 'manoeuvre', 'fire', 'withdraw']) await order(type);
    assert.equal((await stored()).clanShipOperations.spaceEncounter.status, 'withdrawn');
    assert.deepEqual(new Set(report.commands.map(item => item.type)), new Set(domain.CLAN_SHIP_SPACE_ORDERS));
  });
  if (observeAudio) await check('B14: native audio mute reaches the shared master and old recharge/alert never replay on unmute', async () => {
    const settings = () => page.getByRole('dialog', { name: 'Réglages du biomask', exact: true });
    const openSettings = async () => {
      await closePanel();
      await page.locator('[data-clan-ship-status]').getByRole('button', { name: 'Ouvrir les paramètres', exact: true }).click();
      await settings().waitFor();
    };
    const closeSettings = async () => { await settings().getByRole('button', { name: 'Fermer', exact: true }).click(); await settings().waitFor({ state: 'hidden' }); await frames(); };
    await openSettings(); await settings().getByRole('checkbox', { name: 'Audio procédural', exact: true }).uncheck();
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).settings.masterVolume === 0, SAVE_STORAGE_KEY);
    await closeSettings(); await accept('space-interception'); await order('recharge');
    // Muting owns the shared output gain: native oscillators can still be
    // scheduled at zero output. Their existence does not mean audible sound.
    await page.waitForFunction(() => window.__clanP0P1Qa.masterGains.length > 0 && window.__clanP0P1Qa.masterGains.every(gain => gain.value < .00001));
    report.audio.mutedMasterGains = await page.evaluate(() => window.__clanP0P1Qa.masterGains.map(gain => gain.value));
    const before = (await stored()).clanShipOperations;
    await openSettings(); const audioStart = await audioCount();
    await settings().getByRole('checkbox', { name: 'Audio procédural', exact: true }).check();
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).settings.masterVolume > 0, SAVE_STORAGE_KEY);
    await closeSettings();
    await page.waitForFunction(() => window.__clanP0P1Qa.masterGains.some(gain => gain.value > .00001));
    report.audio.restoredMasterGains = await page.evaluate(() => window.__clanP0P1Qa.masterGains.map(gain => gain.value));
    await toneSince(audioStart, 123.6, false); await toneSince(audioStart, 494.4, false);
    assert.deepEqual((await stored()).clanShipOperations, before);
    await openPanel('contracts'); await order('withdraw');
  });
  for (const width of [390, 320]) await check(`P1 F31: retained tactical report supports touch and has no horizontal overflow at ${width}px`, async () => {
    await page.setViewportSize({ width, height: 844 });
    const before = (await stored()).clanShipOperations;
    await page.locator('[data-clan-operations-tab="journal"]').tap();
    await page.locator('[data-clan-operations-tab="contracts"]').tap();
    const reportSection = page.locator('[data-clan-space]');
    await reportSection.locator('h3').scrollIntoViewIfNeeded();
    assert.match(await reportSection.innerText(), /contact|formation/i);
    assert.deepEqual((await stored()).clanShipOperations, before);
    const overflow = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth,
      panel: document.querySelector('[data-clan-operations]').clientWidth, scroll: document.querySelector('[data-clan-operations]').scrollWidth }));
    assert.ok(overflow.document <= overflow.viewport + 2 && overflow.scroll <= overflow.panel + 2, JSON.stringify(overflow));
    await screenshot(`08-native-tactical-report-${width}.png`);
  });
  await context.close();
  await Promise.all(scripts); report.assets = [...assets].sort();
  report.identityAfter = await identity();
  assert.equal(report.identityAfter.sourceSha256, report.identityBefore.sourceSha256, 'Sources changed during qualification');
  assert.equal(report.identityAfter.productionBuildSha256, report.identityBefore.productionBuildSha256, 'Production build changed during qualification');
  assert.ok(report.servedScripts.length > 0 && report.servedScripts.every(item => item.matchesBuiltFile === true), 'Served Next scripts match built bytes');
  assert.deepEqual(report.errors, []); assert.deepEqual(report.httpErrors, []); assert.deepEqual(report.requestFailures, []); assert.deepEqual(report.missingAssets, []);
  report.passed = true;
} catch (error) {
  report.failure = { message: error.message, stack: error.stack };
  if (page && !page.isClosed()) await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
  process.exitCode = 1;
} finally {
  await Promise.allSettled(scripts);
  if (browser) await browser.close(); report.completedAt = new Date().toISOString();
  report.checksPassed = report.checks.filter(item => item.passed).length; report.checksFailed = report.checks.filter(item => !item.passed).length;
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, checksPassed: report.checksPassed, checksFailed: report.checksFailed, failure: report.failure?.message, out }));
}
