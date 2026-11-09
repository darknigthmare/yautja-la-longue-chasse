import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { decideHuntCampaignInputV112 } from './lib/qa-hunt-campaign-input-v112.mjs';
import { inspectNativeHunt20261109 } from './lib/qa-native-hunt-inspection-20261109.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, process.env.CLAN_FIELD_QA_OUTPUT || 'outputs/qa-clan-field-p0p1-20261109');
const url = process.env.CLAN_FIELD_QA_URL || 'http://127.0.0.1:3122';
const ids = (process.env.CLAN_FIELD_CONTRACTS || 'field-jungle-survey,field-ice-route,field-bad-blood,field-ruins-memory').split(',');
const budget = Number(process.env.CLAN_FIELD_BUDGET_SECONDS || 900);
const hash = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, 'recipe-run.lock'), new Date().toISOString() + '\n', { flag: 'wx' });
const bundle = await build({ stdin: { contents: [
  "export {defaultSave,SAVE_STORAGE_KEY,parseSaveImport} from './app/game/save.ts';",
  "export * from './app/game/systems/clanShipDocking.ts';",
  "export * from './app/game/systems/clanShipOperations.ts';",
].join('\n'), resolveDir: root }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const domain = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const owner = '2026-11-09T15:00:00.000Z', shipId = 'classic-predator-spaceship';
let seed = domain.defaultSave(owner);
seed.profile.hunterName = 'QA P0 terrain · état initial déclaré';
seed.settings.masterVolume = 0; seed.settings.difficultyId = 'young-blood';
// Initial access is a declared adult fixture, not a seeded hunt result. All
// hunt counters/results remain zero; mission progression keeps its real locks.
let docking = domain.createClanShipDockingState(owner, shipId);
for (const type of ['approach', 'dock', 'board']) docking = domain.actClanShipDocking(docking, { type }, { ownerCreatedAt: owner, personalShipId: shipId }).state;
seed.clanShipDocking = docking; seed.clanShipOperations = domain.createClanShipOperations(owner);
function fixtureAction(type, values, roomId) {
  if (seed.clanShipDocking.roomId !== roomId) seed.clanShipDocking = domain.actClanShipDocking(seed.clanShipDocking,
    { type: 'move-room', roomId }, { ownerCreatedAt: owner, personalShipId: shipId }).state;
  const result = domain.actClanShipOperations(seed.clanShipOperations, { type, expectedRevision: seed.clanShipOperations.revision, ...values },
    { ownerCreatedAt: owner, campaign: seed, docking: seed.clanShipDocking });
  assert.ok(result.accepted); seed = { ...seed, clanShipOperations: result.state, profile: { ...seed.profile, clanMarks: seed.profile.clanMarks + result.clanMarksReward } };
}
for (const step of domain.CLAN_SHIP_ONBOARDING_STEPS) fixtureAction('onboard-step', { stepId: step.id }, step.roomId);
fixtureAction('accept-mandate', {}, 'conseil');
assert.equal(domain.parseSaveImport(JSON.stringify(seed)).failure, null);
await fs.writeFile(path.join(out, 'initial-campaign.json'), JSON.stringify(seed, null, 2) + '\n');
await fs.writeFile(path.join(out, 'fixture-disclosure.json'), JSON.stringify({ adultInitialAccess: true, dockingAndWelcomePreparedByProductionReducers: true,
  missionAccess: 'Default mission progression and locks; every attempt/completion counter remains zero.',
  difficulty: seed.settings.difficultyId, equipment: seed.loadout, inventory: seed.inventory, initialFieldReceipts: [],
  huntHealthOverride: false, objectiveInjection: false, forcedResult: false, callbackInjection: false }, null, 2) + '\n');
const report = { startedAt: new Date().toISOString(), recipe: 'scripts/qa-clan-ship-field-p0p1-20261109.mjs',
  recipeSha256: hash(await fs.readFile(fileURLToPath(import.meta.url))), observerSha256: hash(await fs.readFile(path.join(root, 'scripts/lib/qa-native-hunt-inspection-20261109.mjs'))),
  buildId: (await fs.readFile(path.join(root, '.next/BUILD_ID'), 'utf8')).trim(), url, browserExecuted: false, passed: false,
  attempts: [], screenshots: [], errors: [], requestFailures: [], httpErrors: [], limits: ['Initial adult access and mission availability are disclosed fixtures.', 'No physical controller, human artwork/mix approval or multiplayer qualification.'] };
let browser, page, observer;
const keys = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', jump: 'Space', aim: 'ShiftLeft',
  melee: 'KeyJ', weapon: 'KeyK', weaponOne: 'Digit1', weaponTwo: 'Digit2', weaponNext: 'KeyR', scan: 'KeyV', heal: 'KeyH', interact: 'KeyE', cloak: 'KeyC' };
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium', headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  report.browserVersion = browser.version(); report.browserExecuted = true;
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await context.addInitScript(({ key, save }) => {
    if (!['http:', 'https:'].includes(location.protocol) || localStorage.getItem('__clanFieldSeeded')) return;
    localStorage.setItem(key, JSON.stringify(save)); localStorage.setItem('__clanFieldSeeded', 'true');
  }, { key: domain.SAVE_STORAGE_KEY, save: seed });
  page = await context.newPage(); page.setDefaultTimeout(45000);
  page.on('pageerror', error => report.errors.push({ message: error.message, stack: error.stack }));
  page.on('console', message => { if (message.type() === 'error') report.errors.push({ message: message.text(), type: 'console.error' }); });
  page.on('requestfailed', request => report.requestFailures.push({ url: request.url(), failure: request.failure() }));
  page.on('response', response => { if (response.status() >= 400) report.httpErrors.push({ url: response.url(), status: response.status() }); });
  const stored = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), domain.SAVE_STORAGE_KEY);
  async function capture(name) { const bytes = await page.screenshot({ path: path.join(out, name + '.png'), fullPage: false }); report.screenshots.push({ filename: name + '.png', sha256: hash(bytes), inspected: false }); }
  async function continueCampaign() {
    await page.locator('[data-campaign-menu]').waitFor();
    if (await page.locator('[data-menu-section="campaign"]').isVisible()) await page.locator('[data-menu-section="campaign"]').click();
    await page.locator('[data-menu-action="continue"]').click(); await page.locator('[data-campaign-session]').waitFor({ timeout: 90000 }); await page.bringToFront();
  }
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 }); await continueCampaign();
  await page.locator('[data-clan-interior]').waitFor({ timeout: 90000 });
  async function openOperations() {
    const button = page.locator('[data-interior-operations]');
    if (await button.getAttribute('data-interior-operations-ready') !== 'true') {
      await button.click(); await page.waitForFunction(() => document.querySelector('[data-interior-operations]')?.getAttribute('data-interior-operations-ready') === 'true');
    }
    await button.click(); await page.locator('[data-clan-operations]').waitFor(); await page.locator('[data-clan-operations-tab="contracts"]').click();
  }
  async function awaitRoom(roomId) {
    await page.waitForFunction(roomId => {
      const element = document.querySelector('[data-clan-interior]');
      return element?.getAttribute('data-interior-room') === roomId && element.getAttribute('data-interior-moving') === 'false' && !element.getAttribute('data-interior-target-room');
    }, roomId, { timeout: 70000 });
  }
  for (const id of ids) {
    const contract = domain.clanShipContract(id); assert.equal(contract.kind, 'field');
    if (!await page.locator('[data-clan-interior]').count()) {
      const returnClan = page.locator('[data-clan-contract-return]');
      if (await returnClan.count()) await returnClan.click();
      else await page.getByRole('button', { name: /^Clan Ship AVP/ }).click();
      await page.locator('[data-clan-ship-action="approach"]').click();
      await page.locator('[data-clan-ship-action="dock"]').click();
      await page.locator('[data-clan-ship-action="board"]').click();
    }
    if ((await stored()).clanShipDocking.roomId !== 'conseil') {
      await page.locator('[data-clan-ship-room-target="conseil"]').click(); await awaitRoom('conseil');
    }
    await openOperations(); await page.locator(`[data-clan-contract-card="${id}"]`).click();
    const before = await stored();
    await page.locator(`[data-clan-accept-contract="${id}"]`).click();
    await page.waitForFunction(({ key, id }) => JSON.parse(localStorage.getItem(key))?.clanShipOperations.activeContract?.contractId === id, { key: domain.SAVE_STORAGE_KEY, id });
    await page.locator('[data-clan-operation-route="hangar"]').click(); await awaitRoom('hangar');
    const service = page.locator('[data-interior-service="hangar"]');
    if (await service.getAttribute('data-interior-ready') !== 'true') { await service.click(); await page.waitForFunction(() => document.querySelector('[data-interior-service="hangar"]')?.getAttribute('data-interior-ready') === 'true'); }
    await service.click(); await page.locator('[data-campaign-location="deck"]').waitFor();
    await page.getByRole('button', { name: /^Clan Ship AVP/ }).click();
    await page.locator('[data-clan-ship-action="undock"]').click(); await page.locator('[data-campaign-location="deck"]').waitFor();
    await page.locator('[data-clan-contract-briefing]').click();
    await page.getByRole('button', { name: 'Départ rapide', exact: true }).click();
    await page.getByRole('button', { name: /^Passer l’arrivée/ }).click();
    await page.getByRole('button', { name: 'Commencer la chasse', exact: true }).click();
    await page.locator('.hunt-screen canvas').waitFor({ timeout: 90000 });
    const opening = page.locator('[data-mission-opening-v78]');
    if (await opening.count()) {
      const button = opening.getByRole('button').last(); await button.click();
    }
    await page.getByText('Synchronisation du biomask…', { exact: true }).waitFor({ state: 'hidden', timeout: 90000 });
    await page.locator('.hunt-screen canvas').focus();
    observer = await inspectNativeHunt20261109(page);
    const observed = await observer.read();
    const bound = await stored();
    assert.equal(bound.clanShipOperations.activeContract.contractId, id);
    assert.ok(Number.isSafeInteger(bound.clanShipOperations.activeContract.missionEncounterRun));
    const attempt = { contractId: id, missionId: contract.missionId, initial: observed, observer: observer.evidence,
      worldSha256: hash(await observer.world()), beforeProgress: before.missionProgress[contract.missionId], binding: bound.clanShipOperations.activeContract,
      inputs: [], samples: [], completed: false };
    report.attempts.push(attempt); await capture(id + '-native-start');
    console.log('OBSERVED', id, JSON.stringify({ elapsed: observed.elapsed, phase: observed.phase, x: observed.player.x, health: observed.player.health }));
    if (process.argv.includes('--observe-only')) { await fs.writeFile(path.join(out, 'observer-probe.json'), JSON.stringify(observed, null, 2) + '\n'); break; }
    const held = new Set(), memory = { previousX: observed.player.x, stuckTicks: 0, jumpUntil: -1 }, started = Date.now();
    let lastSecond = -1, lastPhase = '', current = observed;
    while (Date.now() - started < budget * 1000 && current.phase !== 'dead' && current.phase !== 'finished') {
      current = await observer.read();
      if (Math.floor(current.elapsed) !== lastSecond) {
        lastSecond = Math.floor(current.elapsed); attempt.samples.push(current);
        await fs.writeFile(path.join(out, 'progress.json'), JSON.stringify({ contractId: id, elapsed: current.elapsed, phase: current.phase,
          x: current.player.x, y: current.player.y, health: current.player.health, scans: current.scans, kills: current.kills, message: current.message }, null, 2) + '\n');
        if (lastSecond % 10 === 0) console.log('HUNT', id, lastSecond, current.phase, Math.round(current.player.x), current.player.health, current.scans);
      }
      if (current.phase !== lastPhase) { await capture(id + '-phase-' + current.phase); lastPhase = current.phase; }
      if (current.paused) { await page.keyboard.press('Escape'); continue; }
      const decision = decideHuntCampaignInputV112(current, Math.round(current.elapsed * 60), memory, 'mixed');
      const wanted = new Set(decision.held);
      for (const action of held) if (!wanted.has(action)) { await page.keyboard.up(keys[action]); held.delete(action); }
      for (const action of wanted) if (!held.has(action)) { await page.keyboard.down(keys[action]); held.add(action); }
      if (decision.pointer) {
        const box = await page.locator('.hunt-screen canvas').boundingBox();
        if (box) await page.mouse.move(box.x + decision.pointer.x * box.width / 1280, box.y + decision.pointer.y * box.height / 720);
      }
      for (const action of decision.pressed) {
        if (wanted.has(action) && held.has(action)) { await page.keyboard.up(keys[action]); await page.keyboard.down(keys[action]); }
        else await page.keyboard.press(keys[action]);
      }
      attempt.inputs.push({ elapsed: current.elapsed, ...decision });
      await page.waitForTimeout(35);
    }
    for (const action of held) await page.keyboard.up(keys[action]);
    attempt.final = await observer.read(); await observer.close(); observer = null;
    await capture(id + '-terminal');
    const after = await stored(), receipt = after.clanShipOperations.completedContracts.find(item => item.contractId === id);
    attempt.afterProgress = after.missionProgress[contract.missionId]; attempt.receipt = receipt ?? null;
    attempt.completed = !!receipt && receipt.proof.kind === 'field' && receipt.proof.missionId === contract.missionId &&
      receipt.proof.encounterRun === attempt.binding.missionEncounterRun && receipt.proof.score >= contract.minimumScore && receipt.proof.scans >= contract.minimumScans &&
      attempt.afterProgress.completions === attempt.beforeProgress.completions + 1;
    await fs.writeFile(path.join(out, id + '-attempt.json'), JSON.stringify(attempt, null, 2) + '\n');
    await fs.writeFile(path.join(out, 'current-campaign.json'), JSON.stringify(after, null, 2) + '\n');
    if (!attempt.completed) throw new Error(`${id}: actual hunt did not earn the required native contract receipt (${attempt.final.phase}, score/scans in report)`);
  }
  report.passed = !process.argv.includes('--observe-only') && report.attempts.length === ids.length && report.attempts.every(item => item.completed);
} catch (error) {
  report.failure = { message: error.message, stack: error.stack }; process.exitCode = 1;
  if (page && !page.isClosed()) {
    await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
    await fs.writeFile(path.join(out, 'failure-buttons.json'), JSON.stringify(await page.getByRole('button').allTextContents(), null, 2) + '\n');
  }
} finally {
  if (observer) await observer.close().catch(() => {});
  if (page && !page.isClosed()) report.finalSave = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), domain.SAVE_STORAGE_KEY).catch(() => null);
  if (browser) await browser.close(); report.completedAt = new Date().toISOString();
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, completed: report.attempts.filter(item => item.completed).length, failure: report.failure?.message, out }));
}
