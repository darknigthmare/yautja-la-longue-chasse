/** Actual GameClient, native actors and campaign writer. The prerequisite
 * fixture is synthetic; visiting rooms, changing topics, the space encounter
 * and persistence checks below are browser actions, not pre-seeded results. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { fixture, completeInterior, aboard, portable, saves, ops, qa } from '../tests/helpers/clan-ship-trophy-hearing-fixture.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, process.env.YAUTJA_DIALOGUE_QA_OUTPUT ?? 'outputs/qa-clan-dialogue-20261109');
const port = Number(process.env.YAUTJA_DIALOGUE_QA_PORT ?? 4194);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const { CLAN_SHIP_DIALOGUE_TOPICS, clanShipDialogue } = qa.load('app/game/systems/clanShipDialogue.ts');
let initial = ['ship-seal-check', 'ship-armory-audit', 'ship-triage-route']
  .reduce(completeInterior, fixture({ evidence: false, ruins: false }));
initial = portable(aboard(initial, 'hangar'));
initial.profile.hunterName = 'QA dialogues du clan'; initial.settings.masterVolume = 0;
assert.equal(initial.clanShipOperations.recruitedNpcIds.length, 0);
assert.equal(initial.clanShipOperations.spaceEncounter, null);
assert.equal(initial.clanShipTrophyHearing, undefined);
const fixtureBytes = JSON.stringify(initial, null, 2) + '\n';
const report = {
  startedAt: new Date().toISOString(), checkoutCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  scope: 'Native GameClient on three viewport sizes, earned clan contacts, four read-only dialogue topics, one browser-played escort and reload. Not a full campaign, physical controller, native mobile or art certification.',
  fixture: { file: 'initial-dialogue-fixture.json', sha256: digest(fixtureBytes), browserPlayed: false,
    description: 'Synthetic adult campaign and prerequisite hunts/interior preparations produced through production reducers. No recruitment, space victory or conversation is pre-seeded.',
    clanMarks: initial.profile.clanMarks, completedContracts: initial.clanShipOperations.completedContracts.map(r => r.contractId),
    recruitedNpcIds: initial.clanShipOperations.recruitedNpcIds, operation: initial.clanShipOperations.spaceEncounter },
  sourceSha256: {}, browserExecuted: false, passed: false, checks: [], contexts: [], errors: [], missingAssets: [], screenshots: [],
};
const sourceFiles = ['app/game/ClanShipCrewDialogue.tsx', 'app/game/systems/clanShipDialogue.ts',
  'app/game/ClanShipOperationsPanel.tsx', 'app/game/ClanShipOperationsPanel.module.css', 'app/game/systems/clanShipOperations.ts',
  'app/game/systems/companionResidence.ts', 'app/game/systems/clanShipTrophyHearing.ts', 'app/game/GameClient.tsx',
  'app/game/save.ts', 'tests/helpers/clan-ship-trophy-hearing-fixture.mjs', 'scripts/qa-clan-dialogue-browser-20261109.mjs'];
for (const file of sourceFiles) report.sourceSha256[file] = digest(await fs.readFile(path.join(root, file)));
await fs.mkdir(out, { recursive: true }); await fs.writeFile(path.join(out, report.fixture.file), fixtureBytes);
if (process.argv.includes('--fixtures-only')) {
  await fs.writeFile(path.join(out, 'fixture-disclosure.json'), JSON.stringify(report.fixture, null, 2) + '\n');
  console.log(JSON.stringify({ fixtureValidationOnly: true, browserExecuted: false, fixture: report.fixture }, null, 2));
  process.exit(0);
}
const core = save => ({ operations: save.clanShipOperations, residence: save.companionResidence,
  incidents: save.clanShipIncidents, hearing: save.clanShipTrophyHearing, profile: save.profile, missions: save.missionProgress });
let browser, server;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
    headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  report.browserVersion = browser.version();
  server = await createServer({ configFile: path.join(root, 'desktop/vite.config.ts'), server: { host: '127.0.0.1', port, strictPort: true } });
  await server.listen();
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
    const name = `${viewport.width}x${viewport.height}`;
    const context = await browser.newContext({ viewport, hasTouch: viewport.width < 600, reducedMotion: 'reduce' });
    await context.addInitScript(({ key, save }) => {
      if (!localStorage.getItem('__clanDialogueSeeded')) {
        localStorage.setItem(key, JSON.stringify(save)); localStorage.setItem('__clanDialogueSeeded', 'true');
      }
    }, { key: saves.SAVE_STORAGE_KEY, save: initial });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push({ context: name, message: error.message }));
    page.on('response', response => { if (response.status() >= 400) report.missingAssets.push({ context: name, status: response.status(), url: response.url() }); });
    const click = control => viewport.width < 600 ? control.tap() : control.click();
    const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saves.SAVE_STORAGE_KEY);
    const check = (label, detail = {}) => report.checks.push({ context: name, label, passed: true, ...detail });
    const panel = () => page.locator('[data-clan-operations]');
    const close = async () => { if (await panel().count()) { await click(page.locator('[data-clan-operations-close]')); await panel().waitFor({ state: 'detached' }); } };
    const openCampaign = async () => {
      await page.locator('[data-campaign-menu]').waitFor({ timeout: 90000 });
      const button = page.locator('[data-menu-section="campaign"]'); if (await button.isVisible()) await click(button);
      await click(page.locator('[data-menu-action="continue"]'));
      await page.locator('[data-clan-interior]').waitFor({ timeout: 90000 });
    };
    const visit = async roomId => {
      await close(); await click(page.locator(`[data-clan-ship-room-target="${roomId}"]`));
      await page.waitForFunction(id => {
        const scene = document.querySelector('[data-clan-interior]');
        return scene?.getAttribute('data-interior-room') === id && scene.getAttribute('data-interior-moving') === 'false'
          && !scene.getAttribute('data-interior-target-room');
      }, roomId, { timeout: 60000 });
      const control = page.locator('[data-interior-operations]');
      if (await control.getAttribute('data-interior-operations-ready') !== 'true') {
        await click(control);
        await page.waitForFunction(() => document.querySelector('[data-interior-operations]')?.getAttribute('data-interior-operations-ready') === 'true', null, { timeout: 45000 });
      }
    };
    const open = async tab => {
      await click(page.locator('[data-interior-operations]')); await panel().waitFor();
      await click(page.locator(`[data-clan-operations-tab="${tab}"]`));
    };
    const revealDialogue = async id => {
      const conversation = page.locator(`[data-clan-dialogue="${id}"]`);
      const drawer = conversation.locator('xpath=ancestor::details[1]');
      if (await drawer.count() && !await drawer.evaluate(element => element.open)) {
        await click(drawer.locator(':scope > summary'));
        assert.equal(await drawer.evaluate(element => element.open), true,
          'The optional conversation must open through its native summary control');
      }
      await conversation.waitFor({ state: 'visible' });
      return conversation;
    };
    const durable = async control => {
      const revision = (await read()).clanShipOperations.revision;
      await click(control);
      await page.waitForFunction(({ key, revision }) => JSON.parse(localStorage.getItem(key))?.clanShipOperations?.revision > revision,
        { key: saves.SAVE_STORAGE_KEY, revision }, { timeout: 20000 });
    };
    const capture = async (id, suffix) => {
      const conversation = page.locator(`[data-clan-dialogue="${id}"]`);
      await conversation.scrollIntoViewIfNeeded();
      const bounds = await conversation.evaluate(node => ({ scroll: node.scrollWidth, width: node.clientWidth,
        text: node.querySelector('blockquote')?.textContent, buttons: node.querySelectorAll('button').length }));
      assert.ok(bounds.scroll <= bounds.width, JSON.stringify(bounds)); assert.equal(bounds.buttons, 4); assert.ok(bounds.text);
      const filename = `${name}-${id}-${suffix}.png`;
      await page.screenshot({ path: path.join(out, filename), fullPage: true }); report.screenshots.push(filename);
    };
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle' }); await openCampaign();
    report.browserExecuted = true;
    for (const npc of ops.CLAN_SHIP_RECRUITS) {
      await visit(npc.roomId);
      assert.equal(await page.locator(`[data-clan-crew="${npc.id}"]`).count(), 1);
      await click(page.locator(`[data-clan-crew-talk="${npc.id}"]`)); await panel().waitFor();
      assert.equal(await page.locator('[data-clan-operations-tab="crew"]').getAttribute('aria-pressed'), 'true');
      const before = core(await read()), conversation = await revealDialogue(npc.id);
      assert.equal(await page.locator('[data-clan-dialogue]').count(), 1, 'Roster cards at other posts must not speak remotely');
      for (const topic of CLAN_SHIP_DIALOGUE_TOPICS) {
        await click(conversation.locator(`[data-clan-dialogue-topic="${topic.id}"]`));
        const current = await read(), expected = clanShipDialogue(current, npc.id, npc.roomId, topic.id);
        assert.equal(await conversation.getAttribute('data-dialogue-phase'), expected.phase);
        assert.equal(await conversation.locator('blockquote').textContent(), expected.line);
        assert.equal(await conversation.locator(`[data-clan-dialogue-topic="${topic.id}"]`).getAttribute('aria-pressed'), 'true');
        assert.deepEqual(core(current), before, 'Reading a topic must not mutate durable campaign data');
        check(`${npc.id}: ${topic.id} reads the real context without campaign writes`);
      }
      await capture(npc.id, 'before-space'); await close();
    }
    await visit('conseil'); await open('contracts');
    await click(page.locator('[data-clan-contract-card="space-screening"]'));
    const beforeSpace = await read();
    await durable(page.locator('[data-clan-accept-contract="space-screening"]'));
    for (const order of ['scan', 'manoeuvre', 'brace', 'brace', 'extract']) {
      await durable(page.locator(`[data-clan-space-order="${order}"]`));
    }
    const won = await read(); assert.equal(won.clanShipOperations.spaceEncounter.status, 'victory');
    assert.equal(won.profile.clanMarks - beforeSpace.profile.clanMarks, ops.clanShipContract('space-screening').clanMarksReward);
    check('The native tactical controls complete one escort; only its normal reward is granted');
    await click(page.locator('[data-clan-operations-tab="crew"]'));
    const conversation = await revealDialogue('star-watch');
    await click(conversation.locator('[data-clan-dialogue-topic="return"]'));
    assert.equal(await conversation.getAttribute('data-dialogue-phase'), 'return-victory');
    assert.deepEqual(core(await read()), core(won));
    await capture('star-watch', 'after-space'); check('The navigator reacts to the browser-played victory without a second reward');
    const beforeReload = core(await read()); await close();
    await page.reload({ waitUntil: 'networkidle' }); await openCampaign(); await visit('conseil'); await open('crew');
    await revealDialogue('star-watch');
    await click(page.locator('[data-clan-dialogue="star-watch"] [data-clan-dialogue-topic="return"]'));
    assert.equal(await page.locator('[data-clan-dialogue="star-watch"]').getAttribute('data-dialogue-phase'), 'return-victory');
    assert.deepEqual(core(await read()), beforeReload);
    const keyboardControl = page.locator('[data-clan-dialogue="star-watch"] [data-clan-dialogue-topic="greeting"]');
    await keyboardControl.focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-clan-dialogue="star-watch"]').getAttribute('data-dialogue-topic'), 'greeting');
    await page.keyboard.press('Escape'); await panel().waitFor({ state: 'detached' });
    assert.deepEqual(core(await read()), beforeReload);
    check('Reload, keyboard activation and Escape preserve the encounter, recruitment and marks');
    report.contexts.push({ name, completed: true, checks: report.checks.filter(c => c.context === name).length }); await context.close();
  }
  assert.deepEqual(report.errors, []); assert.deepEqual(report.missingAssets, []);
  report.passed = true;
} catch (error) {
  report.failure = error instanceof Error ? error.stack : String(error); process.exitCode = 1;
} finally {
  if (browser) await browser.close(); if (server) await server.close();
  report.completedAt = new Date().toISOString();
  await fs.writeFile(path.join(out, 'browser-verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, browserExecuted: report.browserExecuted, checks: report.checks.length, failure: report.failure, output: out }, null, 2));
}
