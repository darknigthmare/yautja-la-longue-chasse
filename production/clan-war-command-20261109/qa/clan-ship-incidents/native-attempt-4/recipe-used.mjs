import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { buildMaintenanceFixture, maintenanceAt, maintenanceOperation } from '../tests/helpers/clan-ship-maintenance-fixtures-20261109.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.CLAN_MAINTENANCE_QA_URL || 'http://127.0.0.1:3123';
const out = path.resolve(root, process.env.CLAN_MAINTENANCE_QA_OUTPUT || 'production/clan-war-command-20261109/qa/clan-ship-incidents/native-attempt-1');
const sha = data => createHash('sha256').update(data).digest('hex');
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, 'run.lock'), new Date().toISOString() + '\n', { flag: 'wx' });
await fs.copyFile(fileURLToPath(import.meta.url), path.join(out, 'recipe-used.mjs'));
const bundle = await build({ stdin: { contents: [
  "export * from './app/game/save.ts';",
  "export * from './app/game/systems/clanShipDocking.ts';",
  "export * from './app/game/systems/clanShipOperations.ts';",
  "export * from './app/game/systems/clanShipIncidents.ts';",
  "export * from './app/game/systems/clanShipInterior.ts';",
  "export * from './app/game/systems/clanShipMaintenanceDiagnostics.ts';",
  "export * from './app/game/systems/clanShipSpaceEncounter.ts';",
].join('\n'), resolveDir: root }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const domain = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
let fixture = buildMaintenanceFixture(domain);
fixture = maintenanceOperation(domain, fixture, { type: 'accept-contract', contractId: 'space-screening' });
for (const type of ['scan', 'manoeuvre', 'brace', 'brace', 'extract']) fixture = maintenanceOperation(domain, fixture,
  { type: 'space-command', command: { type, expectedTurn: fixture.clanShipOperations.spaceEncounter.turn } });
fixture = maintenanceAt(domain, fixture, 'hangar');
fixture.profile.hunterName = 'QA maintenance native · prérequis déclarés';
fixture.settings.masterVolume = 0;
assert.equal(fixture.clanShipIncidents == null, true);
assert.equal(domain.parseSaveImport(JSON.stringify(fixture)).failure, null);
await fs.writeFile(path.join(out, 'initial-save.json'), JSON.stringify(fixture, null, 2) + '\n');
const sourceNames = ['app/game/systems/clanShipMaintenanceDiagnostics.ts', 'app/game/systems/clanShipCrewDialogue.ts',
  'app/game/systems/clanShipIncidents.ts', 'app/game/systems/clanShipOperations.ts', 'app/game/systems/clanShipSpaceEncounter.ts',
  'app/game/ClanShipSpaceEncounter.tsx', 'app/game/ClanShipSpaceEncounter.module.css', 'app/game/ClanShipOperationsPanel.tsx',
  'app/game/ClanShipIncidentPanel.tsx', 'app/game/ClanShipIncidentScene.tsx', 'app/game/GameClient.tsx'];
const sourceIdentity = async () => Object.fromEntries(await Promise.all(sourceNames.map(async name => [name, sha(await fs.readFile(path.join(root, name)))])));
const report = { startedAt: new Date().toISOString(), url, browserExecuted: false, passed: false,
  recipe: 'scripts/qa-clan-ship-maintenance-20261109.mjs', recipeSha256: sha(await fs.readFile(fileURLToPath(import.meta.url))),
  scope: 'Actual Next/GameClient, physical incident controls, resident reply and manual tactical order. No DOM markup, reducer, clock or result callback patched. Original controls are scrolled into view only to frame screenshots.',
  fixture: { source: 'initial-save.json', sha256: sha(await fs.readFile(path.join(out, 'initial-save.json'))),
    disclosure: 'Adult historical campaign, boarding/welcome/mandate, ship-seal-check, ship-armory-audit and previous space-screening earned through production reducers. Neither incident nor interception is completed or active initially. No field hunt/full campaign claimed.' },
  sourceBefore: await sourceIdentity(), buildIdBefore: (await fs.readFile(path.join(root, '.next/BUILD_ID'), 'utf8')).trim(),
  checks: [], screenshots: [], commands: [], walking: [], saveChecks: [], escapeChecks: [], servedScripts: [], errors: [], consoleErrors: [], httpErrors: [], requestFailures: [],
  physicalController: false, humanArtApproved: false, fullCampaignPlayed: false };
let browser, page;
const scriptTasks = [];
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium', headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  report.browserExecuted = true; report.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, hasTouch: true, reducedMotion: 'reduce' });
  await context.addInitScript(({ key, save }) => {
    if (!['http:', 'https:'].includes(location.protocol)) return;
    if (!localStorage.getItem('__maintenanceSeed20261109')) {
      localStorage.setItem(key, JSON.stringify(save)); localStorage.setItem('__maintenanceSeed20261109', 'true');
    }
    window.__maintenanceWalk20261109 = [];
    let previous = '';
    const observe = () => {
      const e = document.querySelector('[data-clan-interior]');
      if (e) {
        const sample = { roomId: e.getAttribute('data-interior-room'), x: Number(e.getAttribute('data-interior-actor-x')), y: Number(e.getAttribute('data-interior-actor-y')) };
        const signature = JSON.stringify(sample);
        if (signature !== previous) { window.__maintenanceWalk20261109.push(sample); previous = signature; }
      }
      requestAnimationFrame(observe);
    }; requestAnimationFrame(observe);
  }, { key: domain.SAVE_STORAGE_KEY, save: fixture });
  page = await context.newPage(); page.setDefaultTimeout(30000);
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
  page.on('requestfailed', request => report.requestFailures.push({ url: request.url(), failure: request.failure() }));
  page.on('response', response => {
    const pathname = new URL(response.url()).pathname;
    if (response.status() >= 400) report.httpErrors.push({ pathname, status: response.status() });
    if (pathname.startsWith('/_next/static/') && pathname.endsWith('.js') && response.status() < 400) scriptTasks.push((async () => {
      const bytes = await response.body(), built = await fs.readFile(path.join(root, '.next', pathname.slice('/_next/'.length)));
      report.servedScripts.push({ pathname, bytes: bytes.length, sha256: sha(bytes), buildSha256: sha(built), matches: sha(bytes) === sha(built) });
    })().catch(error => report.errors.push(error.message)));
  });
  const storedRaw = () => page.evaluate(key => localStorage.getItem(key), domain.SAVE_STORAGE_KEY);
  const stored = async () => JSON.parse(await storedRaw());
  const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const scene = () => page.locator('[data-clan-interior]');
  const panel = () => page.locator('[data-clan-operations]');
  const dossier = () => page.locator('[data-clan-incident-panel]');
  async function continueGame() {
    await page.locator('[data-campaign-menu]').waitFor({ timeout: 90000 });
    if (await page.locator('[data-menu-section="campaign"]').isVisible()) await page.locator('[data-menu-section="campaign"]').click();
    await page.locator('[data-menu-action="continue"]').click(); await scene().waitFor({ timeout: 90000 });
    await page.bringToFront(); await frames();
  }
  async function collectWalking() {
    const walk = await page.evaluate(() => window.__maintenanceWalk20261109.splice(0));
    for (const point of walk) assert.ok([0, -.02, .02].some(dx => [0, -.02, .02].some(dy =>
      domain.isClanShipInteriorWalkable(point.roomId, { x: point.x + dx, y: point.y + dy }))), JSON.stringify(point));
    report.walking.push(...walk);
  }
  async function check(name, action) {
    await action();
    const raw = await storedRaw(), parsed = domain.parseSaveImport(raw);
    assert.equal(parsed.failure, null); assert.ok(parsed.save);
    await collectWalking(); report.checks.push({ name, passed: true }); console.log('PASS', name);
  }
  async function screenshot(filename, target) {
    await page.waitForLoadState('networkidle'); await frames();
    await page.locator('.toast').waitFor({ state: 'hidden', timeout: 12000 });
    if (target) await page.locator(target).first().evaluate(element => element.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' }));
    await frames();
    const bytes = await page.screenshot({ path: path.join(out, filename) });
    report.screenshots.push({ filename, sha256: sha(bytes), viewport: page.viewportSize(), framedOriginalControl: target ?? null, inspected: false });
  }
  async function closeDossier(acknowledgement = null) {
    if (await dossier().getAttribute('open') !== null) {
      await page.waitForFunction(() => !!document.activeElement?.closest('[data-clan-incident-panel]'), null, { timeout: 5000 });
      const focused = await page.evaluate(() => ({ tag: document.activeElement?.tagName,
        action: document.activeElement?.getAttribute('data-incident-action'), guide: document.activeElement?.getAttribute('data-incident-guide'),
        returnControl: document.activeElement?.hasAttribute('data-incident-return') ?? false }));
      const before = await storedRaw();
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.querySelector('[data-clan-incident-panel]')?.open === false);
      await frames();
      assert.equal(await page.locator('#settings-title').isVisible(), false, 'Escape from the dossier must not open GameClient settings');
      assert.equal(await storedRaw(), before, 'Closing the dossier must not change the acknowledged campaign');
      report.escapeChecks.push({ acknowledgement, focused, dossierClosed: true, settingsOpened: false, saveUnchanged: true, saveSha256: sha(before) });
    }
  }
  async function openDossier() {
    if (await dossier().getAttribute('open') === null) await page.locator('[data-interior-incidents]').click();
    await dossier().locator('[data-clan-incident]').first().waitFor();
  }
  async function reloadGame() {
    await collectWalking(); await page.reload({ waitUntil: 'networkidle' }); await continueGame();
  }
  async function incident(id, type, branch) {
    const before = await stored(), target = domain.clanShipIncidentTarget(id, type, before);
    await openDossier(); await page.locator(`[data-clan-incident="${id}"] [data-incident-guide="${target.id}"]`).click();
    await page.waitForFunction(target => {
      const e = document.querySelector('[data-clan-interior]');
      return e?.getAttribute('data-interior-room') === target.roomId && e.getAttribute('data-interior-moving') === 'false' &&
        e.getAttribute('data-interior-target-room') === '';
    }, target, { timeout: 60000 });
    const arrived = await scene().evaluate(e => ({ roomId: e.getAttribute('data-interior-room'),
      x: Number(e.getAttribute('data-interior-actor-x')), y: Number(e.getAttribute('data-interior-actor-y')) }));
    if (!domain.clanShipIncidentInReach(arrived, target)) {
      // The first guide crosses rooms; the second approaches the actual prop.
      await openDossier(); await page.locator(`[data-clan-incident="${id}"] [data-incident-guide="${target.id}"]`).click();
    }
    await page.waitForFunction(target => {
      const e = document.querySelector('[data-clan-interior]');
      return e?.getAttribute('data-interior-room') === target.roomId && e.getAttribute('data-interior-moving') === 'false' &&
        Math.hypot(Number(e.getAttribute('data-interior-actor-x')) - target.x, Number(e.getAttribute('data-interior-actor-y')) - target.y) <= target.reach;
    }, { ...target, reach: domain.CLAN_SHIP_INTERIOR_METRICS.interactionReach }, { timeout: 60000 });
    await openDossier();
    await page.locator(`[data-clan-incident="${id}"] [data-incident-action="${id}:${type}${branch ? ':' + branch : ''}"]`).tap();
    const revision = before.clanShipIncidents?.revision ?? 0;
    await page.waitForFunction(({ key, revision }) => JSON.parse(localStorage.getItem(key))?.clanShipIncidents?.revision === revision + 1,
      { key: domain.SAVE_STORAGE_KEY, revision });
    const after = await stored(); report.commands.push({ id, type, branch: branch ?? null, revision: after.clanShipIncidents.revision,
      completed: domain.clanShipIncidentView(after.clanShipIncidents, id).completedRevision, rewardDelta: after.profile.clanMarks - before.profile.clanMarks });
    await closeDossier({ id, type, branch: branch ?? null, revision: after.clanShipIncidents.revision });
    await collectWalking(); return after;
  }
  async function openOperations() {
    if (await panel().isVisible()) return;
    const button = page.locator('[data-interior-operations]');
    if (await button.getAttribute('data-interior-operations-ready') !== 'true') {
      await button.click(); await page.waitForFunction(() => document.querySelector('[data-interior-operations]')?.getAttribute('data-interior-operations-ready') === 'true' &&
        document.querySelector('[data-clan-interior]')?.getAttribute('data-interior-moving') === 'false', null, { timeout: 60000 });
    }
    await button.click(); await panel().waitFor();
  }
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 }); await continueGame();
  const initialMarks = (await stored()).profile.clanMarks;
  await check('B01 physical clues, wrong isolator and archive revalidation preserve a safe route', async () => {
    for (const type of ['accept', 'inspect-witness', 'read-reference']) await incident('sealed-lot', type);
    const variant = domain.clanShipIncidentVariant(fixture.createdAt, 'sealed-lot');
    await incident('sealed-lot', 'isolate', variant.other);
    assert.equal(domain.clanShipIncidentView((await stored()).clanShipIncidents, 'sealed-lot').diagnosticCurrent, false);
    await incident('sealed-lot', 'read-reference');
    await openDossier(); await screenshot('01-seal-revalidated.png', '[data-clan-incident="sealed-lot"]'); await closeDossier();
    await reloadGame();
    assert.equal(domain.clanShipIncidentView((await stored()).clanShipIncidents, 'sealed-lot').diagnosticCurrent, true);
    await incident('sealed-lot', 'isolate', variant.branch); await incident('sealed-lot', 'check-pressure'); await incident('sealed-lot', 'close-lot');
    assert.equal((await stored()).profile.clanMarks, initialMarks + 25);
  });
  await check('B01 guard speaks the earned trust reply through the actual contact without another write', async () => {
    const button = page.locator('[data-clan-crew-talk="threshold-guard"]').first();
    await button.click();
    if (!await panel().isVisible()) { await page.waitForFunction(() => document.querySelector('[data-interior-operations]')?.getAttribute('data-interior-operations-ready') === 'true'); await button.click(); }
    await panel().waitFor();
    const spoken = page.locator('[data-clan-crew-dialogue="threshold-guard"]'); await spoken.waitFor();
    assert.match(await spoken.innerText(), /confier de nouveau ce seuil/);
    const before = await storedRaw(); await page.locator('[data-clan-crew-dialogue-ack="threshold-guard"]').click(); await frames();
    assert.equal(await storedRaw(), before); report.saveChecks.push({ name: 'trust-read', unchanged: true, sha256: sha(before) });
    await screenshot('02-guard-trust.png'); await page.keyboard.press('Escape'); await panel().waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#settings-title').isVisible(), false);
  });
  await check('B02 physical relay accepts a single component, retries its permutation and restores both circuits on mobile', async () => {
    for (const type of ['accept', 'inspect-witness', 'read-reference']) await incident('relay-fault', type);
    const variant = domain.clanShipIncidentVariant(fixture.createdAt, 'relay-fault');
    await incident('relay-fault', 'isolate', variant.branch); await incident('relay-fault', 'collect-component'); await incident('relay-fault', 'install-component');
    await page.setViewportSize({ width: 390, height: 844 });
    await incident('relay-fault', 'restore-circuit', variant.branch);
    let view = domain.clanShipIncidentView((await stored()).clanShipIncidents, 'relay-fault');
    assert.equal(view.component, 'installed'); assert.deepEqual(view.restored, []);
    await incident('relay-fault', 'restore-circuit', variant.other);
    await openDossier(); await screenshot('03-relay-one-circuit-390.png', '[data-clan-incident="relay-fault"] [data-incident-circuit]'); await closeDossier();
    await reloadGame();
    view = domain.clanShipIncidentView((await stored()).clanShipIncidents, 'relay-fault');
    assert.equal(view.component, 'installed'); assert.deepEqual(view.restored, [variant.other]);
    await incident('relay-fault', 'restore-circuit', variant.branch); await incident('relay-fault', 'verify-signal');
    assert.equal((await stored()).profile.clanMarks, initialMarks + 55);
    await openDossier(); await screenshot('04-relay-completed-390.png', '[data-clan-incident="relay-fault"] [data-incident-circuit]'); await closeDossier();
  });
  await check('B02 real council interception unlocks two-order diagnostics without granting a scan or new crew role', async () => {
    await openOperations(); await page.locator('[data-clan-operations-tab="contracts"]').click();
    await page.locator('[data-clan-contract-card="space-interception"]').click();
    await page.locator('[data-clan-accept-contract="space-interception"]').click();
    await page.locator('[data-clan-relay-diagnostic]').waitFor();
    const save = await stored(), encounter = save.clanShipOperations.spaceEncounter;
    assert.equal(encounter.turn, 0); assert.equal(encounter.scanLevel, 0); assert.deepEqual(encounter.crewRoles, []);
    const expected = domain.readClanShipRelayDiagnostic(save);
    assert.equal(await page.locator('[data-clan-relay-order]').count(), expected.forecasts.length);
    await screenshot('05-interception-diagnostic-390.png', '[data-clan-relay-diagnostic]');
    await page.setViewportSize({ width: 320, height: 780 }); await screenshot('06-interception-diagnostic-320.png', '[data-clan-relay-diagnostic]');
    assert.equal(await page.locator('[data-clan-operations]').evaluate(e => e.scrollWidth <= e.clientWidth + 1), true);
    const raw = await storedRaw(); await page.locator('[data-clan-relay-diagnostic] > summary').click(); await page.locator('[data-clan-relay-diagnostic] > summary').click();
    assert.equal(await storedRaw(), raw); report.saveChecks.push({ name: 'diagnostic-read', unchanged: true, sha256: sha(raw) });
  });
  await check('choosing a relay forecast issues exactly its first native order and survives reload without replay', async () => {
    const before = await stored(), plan = domain.readClanShipRelayDiagnostic(before).forecasts[0];
    const expected = domain.actClanShipSpaceEncounter(before.clanShipOperations.spaceEncounter, { type: plan.first, expectedTurn: 0 });
    await page.locator(`[data-clan-relay-order="${plan.first}"]`).click();
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).clanShipOperations.spaceEncounter.turn === 1, domain.SAVE_STORAGE_KEY);
    const after = await stored(); assert.deepEqual(after.clanShipOperations.spaceEncounter, expected.state);
    assert.equal(after.clanShipOperations.revision, before.clanShipOperations.revision + 1);
    assert.equal(after.profile.clanMarks, before.profile.clanMarks);
    await reloadGame(); await openOperations();
    assert.deepEqual((await stored()).clanShipOperations.spaceEncounter, expected.state);
    await page.locator('[data-clan-relay-diagnostic]').waitFor();
    assert.equal(await page.locator('[data-clan-relay-diagnostic]').getAttribute('data-relay-source-turn'), '1');
    await screenshot('07-one-order-reloaded.png', '[data-clan-relay-diagnostic]');
  });
  await check('Escape closes the dossier after all 18 durably acknowledged B01/B02 actions without opening settings or changing saves', async () => {
    const confirmed = report.escapeChecks.filter(row => row.acknowledgement);
    assert.equal(confirmed.length, 18);
    assert.deepEqual(confirmed.map(row => row.acknowledgement.revision), Array.from({ length: 18 }, (_, index) => index + 1));
    assert.ok(confirmed.every(row => row.dossierClosed && !row.settingsOpened && row.saveUnchanged));
    assert.ok(report.walking.some(row => row.roomId === 'armurerie'), 'Pre-reload paths retain the actual armory visits');
  });
  await fs.writeFile(path.join(out, 'final-save.json'), JSON.stringify(await stored(), null, 2) + '\n');
  await Promise.all(scriptTasks); assert.ok(report.servedScripts.length > 0); assert.ok(report.servedScripts.every(item => item.matches));
  report.sourceAfter = await sourceIdentity(); report.buildIdAfter = (await fs.readFile(path.join(root, '.next/BUILD_ID'), 'utf8')).trim();
  assert.deepEqual(report.sourceAfter, report.sourceBefore); assert.equal(report.buildIdAfter, report.buildIdBefore);
  for (const key of ['errors', 'consoleErrors', 'httpErrors', 'requestFailures']) assert.deepEqual(report[key], []);
  report.passed = true;
} catch (error) {
  report.errors.push({ message: error.message, stack: error.stack });
  if (page) { try { const bytes = await page.screenshot({ path: path.join(out, 'failure.png') }); report.failureScreenshotSha256 = sha(bytes); } catch { /* preserve original failure */ } }
} finally {
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(out, 'report.browser-run.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
}
console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, screenshots: report.screenshots.length, output: path.relative(root, out) }));
if (!report.passed) process.exitCode = 1;
