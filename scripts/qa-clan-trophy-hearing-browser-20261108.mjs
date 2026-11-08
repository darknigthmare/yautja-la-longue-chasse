/** Native GameClient recipe for the C-37 hearing. Initial field proofs are a
 * disclosed fixture, produced through the production reducers. The browser
 * performs the invitations, physical navigation, telemetry and conclusion.
 * A launch/asset/UI failure never becomes a passed browser check. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { fixture as campaignFixture, portable, clone, incidents, hearing, saves } from '../tests/helpers/clan-ship-trophy-hearing-fixture.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(root, process.env.YAUTJA_TROPHY_HEARING_QA_OUTPUT ?? 'outputs/qa-clan-trophy-hearing-20261108');
const port = Number(process.env.YAUTJA_TROPHY_HEARING_QA_PORT ?? 4193);
const origin = `http://127.0.0.1:${port}`;
const sha256 = value => createHash('sha256').update(value).digest('hex');
function fixture() {
  const save = campaignFixture();
  save.profile.hunterName = 'QA audience C-37'; save.settings.masterVolume = 0;
  assert.equal(incidents.clanShipIncidentView(save.clanShipIncidents, 'contested-trophy').trophy.testimonyHeard, true);
  assert.equal(save.clanShipTrophyHearing, undefined, 'No hearing invitation or observation is seeded.');
  return portable(save);
}

await fs.mkdir(output, { recursive: true });
const initial = fixture(), serialized = JSON.stringify(initial, null, 2) + '\n';
const disclosure = {
  file: 'initial-C37-fixture.json', sha256: sha256(serialized), ownerCreatedAt: initial.createdAt,
  description: 'Synthetic adult campaign, 1,000 initial marks, onboarding, training, jungle/ice/ruins field proofs and C-37 evidence prepared through production reducers. Those hunts and earlier observations are NOT browser-played. No invitation, telemetry sample, verdict or 35-mark hearing reward is seeded.',
  fixturesValidated: true, browserPlayed: false,
};
await fs.writeFile(path.join(output, disclosure.file), serialized);
await fs.writeFile(path.join(output, 'fixture-disclosure.json'), JSON.stringify(disclosure, null, 2) + '\n');
if (process.argv.includes('--fixtures-only')) {
  console.log(JSON.stringify({ fixtureValidationOnly: true, browserExecuted: false, disclosure }, null, 2));
  process.exit(0);
}

const sourceFiles = ['app/game/GameClient.tsx', 'app/game/ClanShipInterior.tsx', 'app/game/CompanionQuartersScene.tsx',
  'app/game/ClanShipIncidentPanel.tsx', 'app/game/ClanShipIncidentPanel.module.css',
  'app/game/ClanShipIncidentScene.tsx', 'app/game/ClanShipIncidentScene.module.css',
  'app/game/ClanShipTrophyTelemetry.tsx', 'app/game/ClanShipTrophyTelemetry.module.css', 'app/game/systems/clanShipIncidents.ts',
  'app/game/systems/clanShipTrophyHearing.ts', 'app/game/save.ts', 'app/game/types.ts'];
async function fingerprints() {
  return Object.fromEntries(await Promise.all(sourceFiles.map(async file => [file, sha256(await fs.readFile(path.join(root, file)))])));
}
const report = {
  startedAt: new Date().toISOString(), checkoutCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  scope: 'Actual desktop GameClient and campaign persistence through Vite. The disclosed prerequisite fixture is not a full campaign playthrough.',
  fixture: disclosure, sourceSha256: await fingerprints(), browserExecuted: false, passed: false,
  checks: [], errors: [], missingAssets: [], screenshots: [], contexts: [],
};
let browser, server;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
    headless: process.env.YAUTJA_TROPHY_HEARING_HEADED !== '1', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  report.browserVersion = browser.version();
  server = await createServer({ configFile: path.join(root, 'desktop/vite.config.ts'), server: { host: '127.0.0.1', port, strictPort: true } });
  await server.listen();
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
    const name = `${viewport.width}x${viewport.height}`;
    const context = await browser.newContext({ viewport, hasTouch: true, reducedMotion: 'reduce' });
    await context.addInitScript(({ key, save }) => {
      if (!localStorage.getItem('__C37HearingQaSeeded')) {
        localStorage.setItem(key, JSON.stringify(save)); localStorage.setItem('__C37HearingQaSeeded', 'true');
      }
    }, { key: saves.SAVE_STORAGE_KEY, save: clone(initial) });
    const page = await context.newPage();
    const activate = control => viewport.width < 600 ? control.tap() : control.click();
    page.on('pageerror', error => report.errors.push({ context: name, message: error.message }));
    page.on('response', response => {
      if (response.status() >= 400) report.missingAssets.push({ context: name, status: response.status(), url: response.url() });
    });
    const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saves.SAVE_STORAGE_KEY);
    const interior = () => page.locator('[data-clan-interior]');
    const waitRoom = roomId => page.waitForFunction(id => {
      const node = document.querySelector('[data-clan-interior]');
      return node?.getAttribute('data-interior-room') === id && node.getAttribute('data-interior-moving') === 'false'
        && !node.getAttribute('data-interior-target-room');
    }, roomId, { timeout: 60000 });
    const openCampaign = async () => {
      await page.locator('[data-campaign-menu]').waitFor({ timeout: 90000 });
      const campaign = page.locator('[data-menu-section="campaign"]');
      if (await campaign.isVisible()) await campaign.click();
      await page.locator('[data-menu-action="continue"]').click();
      await interior().waitFor({ timeout: 90000 });
    };
    const visit = async roomId => {
      if (await panel().getAttribute('open') !== null) await activate(panel().getByRole('button', { name: 'Reprendre le déplacement · B / Échap', exact: true }));
      await activate(page.locator(`[data-clan-ship-room-target="${roomId}"]`));
      await waitRoom(roomId);
      await page.waitForFunction(id => document.querySelector(`[data-interior-service="${id}"]`)?.getAttribute('data-interior-ready') === 'true', roomId);
    };
    const panel = () => page.locator('[data-clan-incident-panel]');
    const openJournal = async () => {
      if (await panel().getAttribute('open') === null) await activate(page.locator('[data-interior-incidents]'));
      await panel().locator('[data-clan-incident="contested-trophy"]').waitFor();
    };
    const check = (label, detail = {}) => report.checks.push({ context: name, label, passed: true, ...detail });
    const capture = async label => {
      const filename = `${name}-${label}.png`;
      await page.screenshot({ path: path.join(output, filename), fullPage: true });
      report.screenshots.push(filename);
    };
    await page.goto(origin, { waitUntil: 'networkidle', timeout: 120000 });
    await openCampaign(); await waitRoom('entrainement'); report.browserExecuted = true;
    await openJournal();
    for (const [witnessId, roomId] of [['ash-scar', 'entrainement'], ['cold-trace', 'archives']]) {
      await visit(roomId); await openJournal();
      const control = panel().locator(`[data-trophy-hearing-action="invite:${witnessId}"]`);
      await control.waitFor(); assert.equal(await control.isEnabled(), true);
      await activate(control);
      await page.waitForFunction(({ key, witnessId }) => {
        const save = JSON.parse(localStorage.getItem(key));
        return JSON.stringify(save?.clanShipTrophyHearing ?? '').includes(witnessId);
      }, { key: saves.SAVE_STORAGE_KEY, witnessId });
      check('Physical invitation saved', { witnessId, roomId });
    }
    await visit('trophees'); await openJournal();
    for (const id of ['ash-scar', 'cold-trace']) assert.equal(await page.locator(`[data-trophy-hearing-witness="${id}"]`).count(), 1);
    check('Both witnesses are drawn once in the gallery');
    await capture('witnesses');
    for (const sampleId of ['hunt-mark', 'transfer-seal', 'return-match']) {
      await activate(panel().locator(`[data-telemetry-select="${sampleId}"]`));
      const control = panel().locator(`[data-trophy-hearing-action="record-sample:${sampleId}"]`);
      await control.waitFor(); assert.equal(await control.isEnabled(), true); await activate(control);
      await page.waitForFunction(({ key, sampleId }) => JSON.stringify(JSON.parse(localStorage.getItem(key))?.clanShipTrophyHearing ?? '').includes(sampleId),
        { key: saves.SAVE_STORAGE_KEY, sampleId });
      check('Recorded telemetry sample saved', { sampleId });
    }
    const beforeReload = (await read()).clanShipTrophyHearing;
    await page.reload({ waitUntil: 'networkidle' }); await openCampaign();
    assert.deepEqual((await read()).clanShipTrophyHearing, beforeReload);
    await visit('trophees'); await openJournal(); check('Reload preserves invitations and three telemetry samples');
    const beforeVerdict = await read(), marks = beforeVerdict.profile.clanMarks;
    await activate(panel().locator('[data-incident-action="contested-trophy:conclude-provenance:paired-roles"]'));
    await page.waitForFunction(({ key, revision }) => JSON.parse(localStorage.getItem(key))?.clanShipIncidents?.revision > revision,
      { key: saves.SAVE_STORAGE_KEY, revision: beforeVerdict.clanShipIncidents.revision });
    assert.equal((await read()).profile.clanMarks, marks);
    await activate(panel().locator('[data-incident-action="contested-trophy:acknowledge-provenance"]'));
    await page.waitForFunction(({ key, marks }) => JSON.parse(localStorage.getItem(key))?.profile?.clanMarks === marks + 35,
      { key: saves.SAVE_STORAGE_KEY, marks });
    const concluded = await read();
    assert.equal(hearing.clanShipTrophyHearingView(concluded.clanShipTrophyHearing).completed, true);
    assert.equal(saves.parseSaveImport(JSON.stringify(concluded)).failure, null);
    check('Common hearing closes and grants exactly 35 marks');
    await capture('conclusion');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, 'Document must fit the viewport.');
    check('Document has no horizontal overflow');
    report.contexts.push({ viewport, reducedMotion: 'reduce', input: viewport.width < 600 ? 'Emulated touch; no physical controller' : 'Mouse; no physical controller' });
    await context.close();
  }
  assert.deepEqual(report.errors, []); assert.deepEqual(report.missingAssets, []);
  assert.deepEqual(await fingerprints(), report.sourceSha256, 'Source must stay unchanged during the browser recipe.');
  report.passed = true;
} catch (error) {
  report.failure = error instanceof Error ? error.stack : String(error); process.exitCode = 1;
} finally {
  await browser?.close(); await server?.close();
  await fs.writeFile(path.join(output, 'browser-verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, browserExecuted: report.browserExecuted,
    checks: report.checks.length, failure: report.failure, output }, null, 2));
}
