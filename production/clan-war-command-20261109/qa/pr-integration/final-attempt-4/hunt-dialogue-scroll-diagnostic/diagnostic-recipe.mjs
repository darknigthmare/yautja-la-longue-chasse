/** Actual GameClient conversations and storage reload. Hunts, prior recruitment
 * requirements and Cradle battles are disclosed synthetic prerequisites. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { qa, ops, saves, portable, clone } from '/workspace/yautja-la-longue-chasse/tests/helpers/clan-ship-trophy-hearing-fixture.mjs';
import { huntDialogueFixture, cradleDialogueFixture } from '/workspace/yautja-la-longue-chasse/tests/helpers/clan-ship-hunt-dialogue-fixture.mjs';

const root = '/workspace/yautja-la-longue-chasse';
const output = path.resolve(root, process.env.YAUTJA_HUNT_DIALOGUE_QA_OUTPUT ?? 'outputs/qa-clan-hunt-dialogue-20261109');
const port = Number(process.env.YAUTJA_HUNT_DIALOGUE_QA_PORT ?? 4198);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const model = qa.load('app/game/systems/clanShipHuntDialogue.ts');
const sourceFiles = ['app/game/ClanShipHuntConversation.tsx', 'app/game/ClanShipCrewDialogue.tsx',
  'app/game/ClanShipOperationsPanel.tsx', 'app/game/ClanShipOperationsPanel.module.css',
  'app/game/systems/clanShipHuntDialogue.ts', 'app/game/systems/clanShipDialogue.ts',
  'app/game/systems/clanShipOperations.ts', 'app/game/systems/companionResidence.ts',
  'app/game/systems/clanShipDocking.ts', 'app/game/systems/buriedCradleCampaign.ts', 'app/game/systems/buriedCradleReturn.ts',
  'app/game/GameClient.tsx', 'app/game/save.ts', 'tests/helpers/clan-ship-hunt-dialogue-fixture.mjs',
  'scripts/qa-clan-hunt-dialogue-browser-20261109.mjs'];
const protectedFields = ['profile', 'trophies', 'missionProgress', 'clanShipOperations', 'companionResidence',
  'buriedCradle', 'clanShipIncidents', 'clanShipTrophyHearing'];
const protectedState = save => JSON.parse(JSON.stringify(Object.fromEntries(protectedFields.map(key => [key, save[key]]))));
await fs.mkdir(output, { recursive: true });
const base = huntDialogueFixture();
const fixtures = Object.fromEntries([
  ['shared-crown', 'crown', 'present-clan'], ['shared-retreat', 'retreat', 'present-clan'],
  ['shared-no-crown', 'victory', 'present-clan'], ['private-crown', 'crown', 'analyze-workshop'],
].map(([id, result, choice]) => {
  const save = cradleDialogueFixture(clone(base), result, choice);
  save.profile.hunterName = 'QA récits rapportés'; save.settings.masterVolume = 0;
  return [id, portable(save)];
}));
const disclosures = [];
for (const [id, save] of Object.entries(fixtures)) {
  const file = `${id}.json`, bytes = JSON.stringify(save, null, 2) + '\n';
  await fs.writeFile(path.join(output, file), bytes);
  disclosures.push({ id, file, sha256: sha256(bytes), browserPlayed: false,
    description: 'Adult campaign, prerequisite quests, four successful field contracts and Cradle extraction/return prepared through production reducers. No hunt, boss battle, medical treatment or recruitment is played by this browser recipe.',
    clanMarks: save.profile.clanMarks, recruited: save.clanShipOperations.recruitedNpcIds,
    outcome: save.buriedCradle.outcome, ownerCreatedAt: save.createdAt });
}
await fs.writeFile(path.join(output, 'fixture-disclosure.json'), JSON.stringify(disclosures, null, 2) + '\n');
if (process.argv.includes('--fixtures-only')) {
  console.log(JSON.stringify({ browserExecuted: false, fixtures: disclosures }, null, 2));
  process.exit(0);
}
const { chromium } = await import('playwright-core');
const { createServer } = await import('vite');
const report = { startedAt: new Date().toISOString(),
  checkoutCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  scope: 'Actual GameClient walking, optional archived hunt conversations, private disclosure and localStorage reload. Synthetic prerequisite hunts are NOT browser-played.',
  fixtures: disclosures, sourceSha256: Object.fromEntries(await Promise.all(sourceFiles.map(async file => [file, sha256(await fs.readFile(path.join(root, file)))]))),
  browserExecuted: false, passed: false, checks: [], screenshots: [], errors: [], missingAssets: [], contexts: [] };
let browser, server;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
    headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  report.browserVersion = browser.version();
  server = await createServer({ configFile: path.join(root, 'desktop/vite.config.ts'), server: { host: '127.0.0.1', port, strictPort: true } });
  await server.listen();
  const cases = [{id:'shared-crown',viewport:{width:320,height:740},allContacts:false}];
  for (const scenario of cases) {
    const { viewport, id } = scenario, name = `${viewport.width}x${viewport.height}-${id}`;
    const context = await browser.newContext({ viewport, hasTouch: viewport.width < 600, reducedMotion: 'reduce' });
    await context.addInitScript(({ key, save }) => {
      if (!localStorage.getItem('__HuntStoriesSeeded')) {
        localStorage.setItem(key, JSON.stringify(save)); localStorage.setItem('__HuntStoriesSeeded', '1');
      }
    }, { key: saves.SAVE_STORAGE_KEY, save: clone(fixtures[id]) });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.on('pageerror', error => report.errors.push({ context: name, message: error.message }));
    page.on('response', response => { if (response.status() >= 400) report.missingAssets.push({ context: name, status: response.status(), url: response.url() }); });
    const activate = control => viewport.width < 600 ? control.tap() : control.click();
    const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saves.SAVE_STORAGE_KEY);
    const check = (label, detail = {}) => report.checks.push({ context: name, label, passed: true, ...detail });
    const waitRoom = roomId => page.waitForFunction(value => {
      const scene = document.querySelector('[data-clan-interior]');
      return scene?.getAttribute('data-interior-room') === value && scene.getAttribute('data-interior-moving') === 'false' && !scene.getAttribute('data-interior-target-room');
    }, roomId, { timeout: 60000 });
    const openCampaign = async () => {
      await page.locator('[data-campaign-menu]').waitFor({ timeout: 90000 });
      const campaign = page.locator('[data-menu-section="campaign"]');
      if (await campaign.isVisible()) await campaign.click();
      await page.locator('[data-menu-action="continue"]').click();
      await page.locator('[data-clan-interior]').waitFor({ timeout: 90000 });
    };
    const close = async () => {
      const button = page.locator('[data-clan-operations-close]');
      if (await button.isVisible()) await activate(button);
      await page.locator('[data-clan-operations]').waitFor({ state: 'detached' });
    };
    const visit = async roomId => {
      await close(); await activate(page.locator(`[data-clan-ship-room-target="${roomId}"]`));
      await waitRoom(roomId);
      await page.waitForFunction(value => document.querySelector(`[data-interior-service="${value}"]`)?.getAttribute('data-interior-ready') === 'true', roomId);
    };
    const openContact = async npc => {
      await visit(npc.roomId); await activate(page.locator(`[data-clan-crew-talk="${npc.id}"]`));
      await page.locator('[data-clan-operations]').waitFor();
      const view = page.locator(`[data-clan-hunt-conversation="${npc.id}"]`);
      const drawer = view.locator('xpath=ancestor::details[1]');
      if (await drawer.count() && !await drawer.evaluate(element => element.open)) {
        await activate(drawer.locator(':scope > summary'));
        assert.equal(await drawer.evaluate(element => element.open), true,
          'Archived reports must be reached through the native optional-conversation drawer');
      }
      await view.waitFor(); await activate(view.locator('[data-clan-hunt-toggle]'));
      return view;
    };
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle', timeout: 120000 });
    await openCampaign(); await waitRoom('armurerie'); report.browserExecuted = true;
    const contacts = ops.CLAN_SHIP_RECRUITS.filter(npc => npc.id === 'threshold-guard');
    for (const npc of contacts) {
      const view = await openContact(npc), before = protectedState(await read());
      assert.equal(await page.locator('[data-clan-recruit] > details').count(), 1,
        'Only a contact declared present may expose the optional-conversation drawer');
      const expected = model.clanShipHuntDialogue(await read(), npc.id, npc.roomId);
      assert(expected); assert.equal(await view.locator('[data-clan-hunt-report]').count(), id === 'private-crown' ? 4 : 5);
      assert.equal(await page.locator(`[data-clan-dialogue="${npc.id}"] [data-clan-dialogue-topic]`).count(), 4);
      check('Native contact keeps four original topics and exposes only available archived reports', { npc: npc.id, options: expected.options.length });
      for (const option of expected.options) {
        await activate(view.locator(`[data-clan-hunt-report="${option.id}"]`));
        const line = view.locator(`[data-clan-hunt-line="${option.id}"]`); await line.waitFor();
        assert.equal(await line.textContent(), option.line);
        assert.deepEqual(protectedState(await read()), before);
        check('Selected native line matches its archived proof without changing progression', { npc: npc.id, reportId: option.id, source: option.source });
      }
      if (id === 'private-crown') {
        assert.equal(await view.locator('[data-clan-hunt-report="buried-cradle"]').count(), 0);
        assert.equal(await view.locator('[data-clan-hunt-line="buried-cradle"]').count(), 0);
        check('Private workshop result is not disclosed to the clan');
      }
      const line = view.locator('[data-clan-hunt-line]');
      await page.locator('.toast[role="status"]').waitFor({ state: 'detached' });
      await line.scrollIntoViewIfNeeded();
      const measureFrame = async () => line.evaluate(node => {
        const rect = node.getBoundingClientRect();
        let left = 0, top = 0, right = innerWidth, bottom = innerHeight;
        for (let parent = node.parentElement; parent; parent = parent.parentElement) {
          const style = getComputedStyle(parent);
          if (/(auto|scroll|hidden|clip)/.test(`${style.overflowX} ${style.overflowY}`)) {
            const p = parent.getBoundingClientRect(); left = Math.max(left, p.left); top = Math.max(top, p.top); right = Math.min(right, p.right); bottom = Math.min(bottom, p.bottom);
          }
        }
        return { visible: rect.width > 0 && rect.height > 0 && rect.left >= left && rect.top >= top && rect.right <= right && rect.bottom <= bottom,
          bounds: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }, clip: { left, top, right, bottom } };
      });
      const beforeFrame = await measureFrame();
      await page.screenshot({path:path.join(output,'native-before-wheel.png')});
      const scrollState = () => page.evaluate(() => Array.from(document.querySelectorAll('*')).filter(n=>n.scrollHeight>n.clientHeight+2&&/(auto|scroll)/.test(getComputedStyle(n).overflowY)).map(n=>({tag:n.tagName,class:n.className,scrollTop:n.scrollTop,clientHeight:n.clientHeight,scrollHeight:n.scrollHeight,bounds:n.getBoundingClientRect().toJSON()})));
      const beforeScroll = await scrollState();
      await fs.writeFile(path.join(output,'before-native-wheel.json'),JSON.stringify({beforeFrame,beforeScroll},null,2)+'\n');
      await page.mouse.move(160,450);
      await page.mouse.wheel(0,80);
      await page.waitForFunction(top=>document.querySelector('[data-clan-hunt-line]')?.getBoundingClientRect().top<top-1,beforeFrame.bounds.top);
      const framed = await measureFrame();
      const afterScroll = await scrollState();
      await page.screenshot({path:path.join(output,'native-after-wheel.png')});
      await fs.writeFile(path.join(output,'native-wheel-result.json'),JSON.stringify({beforeFrame,framed,beforeScroll,afterScroll,input:'Real Chromium mouse.move(160,450) then wheel(0,80); unchanged strict full-rectangle clipping assertion'},null,2)+'\n');
      assert(framed.visible, JSON.stringify(framed));
      const screenshot = `${name}-${npc.id}.png`;
      await page.screenshot({ path: path.join(output, screenshot) }); report.screenshots.push(screenshot);
      check('Complete selected dialogue is inside the native scroll viewport', { npc: npc.id, screenshot, framed });
      await close();
    }
    const saved = protectedState(await read());
    await page.reload({ waitUntil: 'networkidle' }); await openCampaign();
    const npc = ops.CLAN_SHIP_RECRUITS.find(entry => entry.id === 'iron-claw'), view = await openContact(npc);
    assert.deepEqual(protectedState(await read()), saved);
    assert.equal(await view.locator('[data-clan-hunt-report="buried-cradle"]').count(), id === 'private-crown' ? 0 : 1);
    await activate(view.locator('[data-clan-hunt-report="field-jungle-survey"]'));
    assert.equal(await view.locator('[data-clan-hunt-line="field-jungle-survey"]').textContent(), model.CLAN_FIELD_STORIES['field-jungle-survey']['iron-claw']);
    assert.deepEqual(protectedState(await read()), saved);
    check('Reload preserves source reports, privacy and all progression values');
    report.contexts.push({ name, completed: true, checks: report.checks.filter(entry => entry.context === name).length });
    await context.close();
  }
  assert.equal(report.errors.length, 0); assert.equal(report.missingAssets.length, 0);
  assert.deepEqual(report.sourceSha256, Object.fromEntries(await Promise.all(sourceFiles.map(async file => [file, sha256(await fs.readFile(path.join(root, file)))]))));
  report.passed = true;
} catch (error) {
  report.errors.push({ message: error instanceof Error ? error.stack : String(error) }); process.exitCode = 1;
} finally {
  await browser?.close(); await server?.close(); report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(output, 'browser-verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, screenshots: report.screenshots.length, errors: report.errors }, null, 2));
}
