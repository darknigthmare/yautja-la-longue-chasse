import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

// Actual desktop GameClient, physical walking, campaign writer and UI callbacks.
// The browser may only receive initial disclosed saves and a deliberate storage
// failure. No action callback, game clock, mission result or actor is injected.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, process.env.CLAN_OPERATIONS_QA_OUTPUT || 'outputs/qa-clan-ship-operations');
const port = Number(process.env.CLAN_OPERATIONS_QA_PORT || 4187);
const headed = process.env.CLAN_OPERATIONS_HEADED === '1';
const checkoutCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const workingTreeDirty = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim().length > 0;
await fs.mkdir(out, { recursive: true });
const bundle = await build({
  stdin: { contents: [
    "export {defaultSave,SAVE_STORAGE_KEY,applyMissionResult,parseSaveImport} from './app/game/save.ts';",
    "export {MISSION_BY_ID} from './app/game/data.ts';",
    "export * from './app/game/systems/clanShipDocking.ts';",
    "export * from './app/game/systems/clanShipOperations.ts';",
    "export {isClanShipInteriorWalkable} from './app/game/systems/clanShipInterior.ts';",
    "export {inspectCompanionResidence,companionResidenceDefinition,companionResidencePresence,availableClanResidenceCrew} from './app/game/systems/companionResidence.ts';",
  ].join('\n'), resolveDir: root },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
});
const domain = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const { SAVE_STORAGE_KEY, CLAN_SHIP_CONTRACTS, CLAN_SHIP_RECRUITS, CLAN_SHIP_ONBOARDING_STEPS } = domain;
const interiorIds = ['ship-seal-check', 'ship-armory-audit', 'ship-triage-route', 'ship-training-circuit'];
const mainRecruitIds = ['threshold-guard', 'iron-claw', 'black-suture', 'ash-scar'];
const clanResidenceHost = { kind: 'clan', shipId: 'avp-predator-mothership' };
const roomRing = ['hangar', 'armurerie', 'entrainement', 'conseil', 'archives', 'trophees', 'soins'];
const spacePaths = {
  'space-screening': ['scan', 'manoeuvre', 'brace', 'brace', 'extract'],
  'space-interception': ['scan', 'manoeuvre', 'fire', 'brace', 'brace', 'fire', 'brace', 'fire'],
  'space-recovery': ['scan', 'scan', 'manoeuvre', 'brace', 'disrupt', 'brace', 'disrupt', 'brace', 'manoeuvre', 'brace', 'board', 'brace', 'extract'],
};
const definition = id => {
  const found = CLAN_SHIP_CONTRACTS.find(contract => contract.id === id);
  assert.ok(found, `Missing expected contract: ${id}`);
  return found;
};

function fixtureAboard(owner, name) {
  const save = domain.defaultSave(owner);
  save.profile.hunterName = name;
  save.settings.masterVolume = 0;
  let docking = domain.createClanShipDockingState(owner, 'classic-predator-spaceship');
  for (const type of ['approach', 'dock', 'board']) {
    const result = domain.actClanShipDocking(docking, { type }, { ownerCreatedAt: owner, personalShipId: 'classic-predator-spaceship' });
    assert.equal(result.accepted, true, `Disclosed initial boarding: ${type}`);
    docking = result.state;
  }
  save.clanShipDocking = docking;
  return save;
}
function fixtureRoom(save, roomId) {
  if (save.clanShipDocking.roomId === roomId) return save;
  const result = domain.actClanShipDocking(save.clanShipDocking, { type: 'move-room', roomId },
    { ownerCreatedAt: save.createdAt, personalShipId: save.clanShipDocking.personalShipId });
  assert.equal(result.accepted, true, `Fixture room ${roomId}`);
  return { ...save, clanShipDocking: result.state };
}
function fixtureAction(save, type, values = {}, roomId = 'conseil') {
  save = fixtureRoom(save, roomId);
  const state = save.clanShipOperations ?? domain.createClanShipOperations(save.createdAt);
  const result = domain.actClanShipOperations(state, { type, expectedRevision: state.revision, ...values },
    { ownerCreatedAt: save.createdAt, docking: save.clanShipDocking, campaign: save });
  assert.equal(result.accepted, true, `Fixture ${type}: ${result.message}`);
  assert.equal(result.changed, true);
  assert.equal(domain.inspectClanShipOperations(result.state, save.createdAt).status, 'valid');
  return { ...save, clanShipOperations: result.state, profile: { ...save.profile, clanMarks: save.profile.clanMarks + result.clanMarksReward } };
}

// This second context is an explicitly synthetic historical save, with field
// proofs and legacy clan posts predating the residence ledger. It tests backward
// compatibility, six crew effects and recognition, never claims to play hunts.
function fixtureFullCrew() {
  let save = fixtureAboard('2026-11-05T10:00:00.000Z', 'QA fixture équipage complet');
  for (const step of CLAN_SHIP_ONBOARDING_STEPS) save = fixtureAction(save, 'onboard-step', { stepId: step.id }, step.roomId);
  save = fixtureAction(save, 'accept-mandate');
  for (const id of interiorIds) {
    save = fixtureAction(save, 'accept-contract', { contractId: id });
    for (const step of definition(id).steps) save = fixtureAction(save, 'interior-step', { stepId: step.id }, step.roomId);
  }
  for (const id of ['field-jungle-survey', 'field-ice-route']) {
    const contract = definition(id), mission = domain.MISSION_BY_ID[contract.missionId];
    save = fixtureAction(save, 'accept-contract', { contractId: id });
    const bound = domain.bindClanShipMission(save.clanShipOperations, { ownerCreatedAt: save.createdAt,
      missionId: mission.id, encounterRun: save.missionProgress[mission.id].attempts, expectedRevision: save.clanShipOperations.revision });
    assert.equal(bound.accepted, true, `Fixture binding: ${id}`);
    save = { ...save, clanShipOperations: bound.state };
    const result = { missionId: mission.id, difficultyId: 'hunter', outcome: 'success', score: 80, scans: 3, elapsedSeconds: 240,
      completedObjectiveIds: mission.objectives.filter(item => item.required || item.kind === 'extract').map(item => item.id),
      honorEvents: [], trophyQuality: 'elite', trophyClaims: [{ id: `${mission.id}-disclosed-clan-fixture`, definitionId: mission.trophy.id,
        targetName: mission.targetName, targetKind: mission.targetKind, partId: mission.trophy.partId, condition: 'pristine', quality: 'elite' }],
      kills: 3, secondWindUsed: false, completedAt: '2026-11-05T10:15:00.000Z' };
    const progressed = domain.applyMissionResult(save, result);
    const settlement = domain.settleClanShipMission(save.clanShipOperations, save, progressed, result,
      { ownerSaveCreatedAt: save.createdAt, missionId: mission.id, encounterRun: save.missionProgress[mission.id].attempts });
    assert.equal(settlement.accepted, true, `Synthetic fixture settlement: ${id}: ${settlement.message}`);
    assert.equal(settlement.changed, true);
    save = { ...progressed, clanShipOperations: settlement.state,
      profile: { ...progressed.profile, clanMarks: progressed.profile.clanMarks + settlement.clanMarksReward } };
  }
  for (const npc of CLAN_SHIP_RECRUITS) save = fixtureAction(save, 'recruit', { npcId: npc.id }, npc.roomId);
  save = fixtureRoom(save, 'conseil');
  assert.equal(save.clanShipOperations.recruitedNpcIds.length, 6);
  assert.equal(save.clanShipOperations.spaceEncounter, null);
  assert.equal(save.clanShipOperations.circleConfirmed, false);
  return save;
}

const seed = fixtureAboard('2026-11-05T09:00:00.000Z', 'QA opérations Clan Ship');
const crewSeed = fixtureFullCrew();
const fixtures = [
  { id: 'adult-aboard', filename: 'initial-adult-aboard.json', save: seed,
    disclosure: 'Default adult campaign with boarding prepared by the docking reducer. No operations, rewards, contracts or crew are pre-completed.' },
  { id: 'six-crew-fixture', filename: 'initial-six-crew-fixture.json', save: crewSeed,
    disclosure: 'Synthetic historical fixture prepared by production reducers: onboarding, four internal contracts, jungle/ice field results and six legacy clan recruits, without a residence ledger. Those field hunts are NOT played by this browser recipe. No spatial victory or circle recognition is seeded.' },
];
const fixtureDisclosures = [];
for (const fixture of fixtures) {
  const serialized = JSON.stringify(fixture.save, null, 2) + '\n';
  const parsed = domain.parseSaveImport(serialized);
  assert.equal(parsed.failure, null, `${fixture.id}: fixture must pass the actual import boundary`);
  assert.ok(parsed.save);
  assert.deepEqual(parsed.save.clanShipOperations, fixture.save.clanShipOperations, 'The import boundary must preserve the disclosed operations');
  assert.deepEqual(parsed.save.clanShipDocking, fixture.save.clanShipDocking);
  await fs.writeFile(path.join(out, fixture.filename), serialized);
  fixtureDisclosures.push({ id: fixture.id, filename: fixture.filename, disclosure: fixture.disclosure,
    ownerCreatedAt: fixture.save.createdAt, sha256: createHash('sha256').update(serialized).digest('hex') });
}
await fs.writeFile(path.join(out, 'fixture-disclosure.json'), JSON.stringify(fixtureDisclosures, null, 2) + '\n');
if (process.argv.includes('--fixtures-only')) {
  console.log(JSON.stringify({ fixtureValidationOnly: true, browserExecuted: false, fixtures: fixtureDisclosures, checkoutCommit, workingTreeDirty }, null, 2));
  process.exit(0);
}

const report = { startedAt: new Date().toISOString(), sourceCommit: process.env.CLAN_OPERATIONS_SOURCE_COMMIT || checkoutCommit,
  checkoutCommit, workingTreeDirty, runtime: 'actual desktop GameClient via Vite', headed, assetGateRequired: true,
  fixtures: fixtureDisclosures, checks: [], errors: [], missingAssets: [], requestedAssets: [], screenshots: [], commands: [], residenceActions: [],
  walking: { samples: 0, rooms: [], transitions: [] }, contexts: [] };
const missing = new Set(), requested = new Set();
let server, browser, page, currentLabel = '';

try {
  if (process.env.CLAN_OPERATIONS_SOURCE_COMMIT) {
    assert.equal(checkoutCommit, process.env.CLAN_OPERATIONS_SOURCE_COMMIT, 'Evidence must exercise exactly the requested source commit');
    assert.equal(workingTreeDirty, false, 'Published browser evidence requires a clean source checkout');
  }
  server = await createServer({ configFile: path.join(root, 'desktop/vite.config.ts'), server: { host: '127.0.0.1', port, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined, headless: !headed,
    args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  report.browserVersion = browser.version();

  const startContext = async (fixture, viewport = { width: 1440, height: 1000 }) => {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce', hasTouch: true });
    await context.addInitScript(({ key, save, label }) => {
      if (!localStorage.getItem('__clanOperationsQaSeeded')) {
        localStorage.setItem(key, JSON.stringify(save));
        localStorage.setItem('__clanOperationsQaSeeded', label);
      }
      const api = { refuseContract: null, refusals: 0, writes: [], walking: [] };
      const originalSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function (name, value) {
        if (this === localStorage && name === key) {
          let parsed;
          try { parsed = JSON.parse(value); } catch { /* Observation only; the real writer validates data. */ }
          if (api.refuseContract && parsed?.clanShipOperations?.completedContracts?.some(item => item.contractId === api.refuseContract)) {
            api.refusals += 1;
            throw new DOMException('QA: clan operation reward cannot be stored', 'QuotaExceededError');
          }
          if (parsed?.clanShipOperations) api.writes.push({ revision: parsed.clanShipOperations.revision, residenceRevision: parsed.companionResidence?.revision ?? null, marks: parsed.profile.clanMarks,
            completed: parsed.clanShipOperations.completedContracts.map(item => item.contractId), turn: parsed.clanShipOperations.spaceEncounter?.turn ?? null });
        }
        return originalSet.call(this, name, value);
      };
      let previous = '';
      const observe = () => {
        const scene = document.querySelector('[data-clan-interior]');
        if (scene) {
          const sample = { room: scene.getAttribute('data-interior-room'), x: Number(scene.getAttribute('data-interior-actor-x')),
            y: Number(scene.getAttribute('data-interior-actor-y')) };
          const signature = JSON.stringify(sample);
          if (signature !== previous) { api.walking.push(sample); previous = signature; }
        } else previous = '';
        requestAnimationFrame(observe);
      };
      window.__clanOperationsQa = api;
      requestAnimationFrame(observe);
    }, { key: SAVE_STORAGE_KEY, save: fixture.save, label: fixture.id });
    page = await context.newPage();
    currentLabel = fixture.id;
    page.setDefaultTimeout(25_000);
    page.on('pageerror', error => report.errors.push({ context: fixture.id, message: error.message }));
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.startsWith('/game/')) requested.add('public' + url.pathname);
    });
    page.on('response', response => {
      const pathname = new URL(response.url()).pathname;
      if (pathname.startsWith('/game/') && (response.status() >= 400 ||
          (response.request().resourceType() === 'image' && response.headers()['content-type']?.includes('text/html')))) missing.add(pathname);
    });
    report.contexts.push({ id: fixture.id, viewport });
    return { context, page };
  };
  const stored = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_STORAGE_KEY);
  const operations = async () => (await stored()).clanShipOperations;
  const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const interior = () => page.locator('[data-clan-interior]');
  const panel = () => page.locator('[data-clan-operations]');
  const actor = () => interior().evaluate(scene => ({ room: scene.getAttribute('data-interior-room'),
    x: Number(scene.getAttribute('data-interior-actor-x')), y: Number(scene.getAttribute('data-interior-actor-y')) }));
  const samePosition = (after, before, label) => {
    assert.equal(after.room, before.room, label);
    assert.ok(Math.hypot(after.x - before.x, after.y - before.y) < .1, `${label}: ${JSON.stringify({ before, after })}`);
  };
  const collectWalking = async () => {
    const samples = await page.evaluate(() => window.__clanOperationsQa.walking.splice(0));
    for (const sample of samples) {
      assert.ok(roomRing.includes(sample.room));
      assert.ok(Number.isFinite(sample.x) && Number.isFinite(sample.y));
      assert.ok([0, -.02, .02].some(dx => [0, -.02, .02].some(dy => domain.isClanShipInteriorWalkable(sample.room, { x: sample.x + dx, y: sample.y + dy }))),
        `Movement crossed a solid footprint: ${JSON.stringify(sample)}`);
      if (!report.walking.rooms.includes(sample.room)) report.walking.rooms.push(sample.room);
    }
    report.walking.samples += samples.length;
    return samples;
  };
  const check = async (name, run) => {
    const started = Date.now();
    try {
      await run(); await collectWalking();
      const current = await stored();
      assert.equal(domain.inspectClanShipDocking(current.clanShipDocking, current.createdAt).status, 'valid');
      if (current.clanShipOperations) assert.equal(domain.inspectClanShipOperations(current.clanShipOperations, current.createdAt).status, 'valid');
      if (current.companionResidence) assert.equal(domain.inspectCompanionResidence(current.companionResidence, current.createdAt).status, 'valid');
      report.checks.push({ name, context: currentLabel, passed: true, durationMs: Date.now() - started });
      console.log('PASS', currentLabel, name);
    } catch (error) {
      report.checks.push({ name, context: currentLabel, passed: false, durationMs: Date.now() - started, message: error.message });
      throw error;
    }
  };
  const waitRevision = revision => page.waitForFunction(({ key, revision }) => JSON.parse(localStorage.getItem(key))?.clanShipOperations?.revision === revision,
    { key: SAVE_STORAGE_KEY, revision });
  const durableClick = async (selector, touch = false) => {
    const revision = (await operations())?.revision ?? 0;
    const button = page.locator(selector);
    assert.equal(await button.isEnabled(), true, `${selector} must be enabled`);
    if (touch) await button.tap(); else await button.click();
    await waitRevision(revision + 1); await frames();
    return stored();
  };
  const residenceClick = async (type, id) => {
    const before = await stored(), revision = before.companionResidence.revision;
    const button = page.locator(`[data-companion-action="${type}:${id}"]`);
    assert.equal(await button.isEnabled(), true, `${type}:${id} must be available at the actual dock`);
    await button.click();
    await page.waitForFunction(({ key, revision }) => JSON.parse(localStorage.getItem(key))?.companionResidence?.revision === revision,
      { key: SAVE_STORAGE_KEY, revision: revision + 1 });
    await frames();
    const after = await stored();
    assert.deepEqual(after.clanShipOperations, before.clanShipOperations, 'Housing cannot change a contract, recruit or tactical turn');
    report.residenceActions.push({ context: currentLabel, type, id, room: (await actor()).room,
      beforeRevision: revision, afterRevision: after.companionResidence.revision, beforeMarks: before.profile.clanMarks, afterMarks: after.profile.clanMarks });
    return after;
  };
  const continueCampaign = async () => {
    await page.locator('[data-campaign-menu]').waitFor();
    if (await page.locator('[data-menu-section="campaign"]').isVisible()) await page.locator('[data-menu-section="campaign"]').click();
    await page.locator('[data-menu-action="continue"]').click();
    await page.locator('[data-campaign-session]').waitFor({ timeout: 90_000 });
    await page.locator('[data-campaign-location="clan-ship"]').waitFor();
    await interior().waitFor();
  };
  const openApp = async () => {
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle', timeout: 120_000 });
    await continueCampaign();
  };
  const closePanel = async () => {
    if (await panel().count()) {
      await page.locator('[data-clan-operations-close]').click();
      await panel().waitFor({ state: 'hidden' });
      await page.waitForFunction(() => document.activeElement?.hasAttribute('data-interior-world'));
    }
  };
  const residencePanel = () => page.locator('[data-companion-residence-panel][data-companion-site="clan"]');
  const closeResidence = async () => {
    if (await residencePanel().evaluate(element => element.open)) {
      await residencePanel().locator('summary').click();
      await residencePanel().locator('[data-companion-member]').first().waitFor({ state: 'hidden' });
    }
  };
  const openResidence = async () => {
    await closePanel();
    if (!await residencePanel().evaluate(element => element.open)) await residencePanel().locator('summary').click();
    await residencePanel().getByRole('heading', { name: 'Accords de recrutement', exact: true }).waitFor();
  };
  const waitRoom = async roomId => {
    await page.waitForFunction(({ key, roomId }) => {
      const visit = JSON.parse(localStorage.getItem(key))?.clanShipDocking;
      const scene = document.querySelector('[data-clan-interior]');
      return visit?.status === 'aboard' && visit.roomId === roomId && scene?.getAttribute('data-interior-room') === roomId &&
        scene.getAttribute('data-interior-moving') === 'false' && !scene.getAttribute('data-interior-target-room');
    }, { key: SAVE_STORAGE_KEY, roomId }, { timeout: 60_000 });
  };
  const visit = async roomId => {
    await closePanel(); await closeResidence(); await collectWalking();
    const from = (await actor()).room;
    await page.locator(`[data-clan-ship-room-target="${roomId}"]`).click();
    await waitRoom(roomId); await frames();
    const samples = await collectWalking(), rooms = [from];
    for (const sample of samples) if (sample.room !== rooms.at(-1)) rooms.push(sample.room);
    for (let i = 1; i < rooms.length; i++) {
      const distance = Math.abs(roomRing.indexOf(rooms[i]) - roomRing.indexOf(rooms[i - 1]));
      assert.ok(distance === 1 || distance === roomRing.length - 1, `Non-adjacent walking route: ${rooms.join(' → ')}`);
    }
    report.walking.transitions.push({ context: currentLabel, from, to: roomId, rooms, samples: samples.length });
  };
  const openPanel = async (tab, touch = false) => {
    await closeResidence();
    if (!await panel().count()) {
      const control = page.locator('[data-interior-operations]');
      if (await control.getAttribute('data-interior-operations-ready') !== 'true') {
        if (touch) await control.tap(); else await control.click();
        await page.waitForFunction(() => {
          const scene = document.querySelector('[data-clan-interior]'), button = document.querySelector('[data-interior-operations]');
          return scene?.getAttribute('data-interior-moving') === 'false' && button?.getAttribute('data-interior-operations-ready') === 'true';
        }, null, { timeout: 45_000 });
      }
      if (touch) await control.tap(); else await control.click();
      await panel().waitFor();
    }
    if (tab) {
      const target = page.locator(`[data-clan-operations-tab="${tab}"]`);
      if (touch) await target.tap(); else await target.click();
      assert.equal(await target.getAttribute('aria-pressed'), 'true');
    }
  };
  const acceptContract = async (id, touch = false) => {
    assert.equal((await actor()).room, 'conseil', 'Contracts are issued at the physical council');
    await openPanel('contracts', touch);
    const card = page.locator(`[data-clan-contract-card="${id}"]`);
    if (touch) await card.tap(); else await card.click();
    await durableClick(`[data-clan-accept-contract="${id}"]`, touch);
    assert.equal((await operations()).activeContract?.contractId, id);
    await page.locator(`[data-clan-active-contract="${id}"]`).waitFor();
  };
  const spaceOrder = async (order, touch = false) => {
    const before = await operations();
    assert.equal(before.spaceEncounter.status, 'active');
    const after = await durableClick(`[data-clan-space-order="${order}"]`, touch);
    assert.equal(after.clanShipOperations.spaceEncounter.turn, before.spaceEncounter.turn + 1);
    report.commands.push({ context: currentLabel, contractId: before.activeContract.contractId, type: order, touch,
      beforeTurn: before.spaceEncounter.turn, afterTurn: after.clanShipOperations.spaceEncounter.turn,
      status: after.clanShipOperations.spaceEncounter.status, marks: after.profile.clanMarks });
    return after;
  };
  const receiptCount = (save, id) => save.clanShipOperations.completedContracts.filter(item => item.contractId === id).length;
  const reload = async () => {
    await collectWalking();
    await page.reload({ waitUntil: 'networkidle' });
    await continueCampaign();
  };
  const screenshot = async filename => {
    await page.waitForLoadState('networkidle');
    await page.locator('.toast').waitFor({ state: 'hidden', timeout: 8000 });
    const images = await page.locator('[data-clan-ship-status] img').evaluateAll(async elements => Promise.all(elements.map(async image => {
      try { await image.decode(); } catch { /* Return the failed native image instead of hiding it. */ }
      return { src: image.getAttribute('src'), width: image.naturalWidth, complete: image.complete };
    })));
    assert.ok(images.length > 0 && images.every(image => image.complete && image.width > 0), `Undecoded scene art: ${JSON.stringify(images)}`);
    assert.equal(await page.locator('[data-art-unavailable="true"]').count(), 0, 'Missing props must not disappear silently');
    await frames();
    await page.screenshot({ path: path.join(out, filename), fullPage: true });
    report.screenshots.push({ filename, context: currentLabel, viewport: page.viewportSize() });
  };
  const assertNoOverflow = async () => {
    const dimensions = await page.evaluate(() => {
      const selectors = ['[data-clan-operations]', '[data-clan-space]', '[data-clan-ship-status]'];
      return { viewport: innerWidth, pageWidth: document.documentElement.scrollWidth,
        nodes: selectors.flatMap(selector => Array.from(document.querySelectorAll(selector), element => ({ selector, client: element.clientWidth, scroll: element.scrollWidth }))) };
    });
    assert.ok(dimensions.pageWidth <= dimensions.viewport + 2, JSON.stringify(dimensions));
    assert.ok(dimensions.nodes.every(node => node.scroll <= node.client + 2), JSON.stringify(dimensions));
  };
  const showRecruit = async id => {
    const npc = CLAN_SHIP_RECRUITS.find(item => item.id === id);
    await visit(npc.roomId);
    const rendered = page.locator(`[data-clan-crew="${id}"]`);
    await rendered.waitFor({ state: 'attached' });
    // The scene anchor has zero size; the actual image and button are visible.
    const image = rendered.locator('img[data-homeworld-npc-variant-v84]');
    await image.waitFor({ state: 'visible' });
    await image.evaluate(image => image.decode());
    assert.equal(await rendered.getAttribute('data-clan-crew-recruited'), 'true');
    await page.locator(`[data-clan-crew-talk="${id}"]`).click();
    await panel().waitFor();
    assert.equal(await page.locator('[data-clan-operations-tab="crew"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator(`[data-clan-recruit="${id}"]`).getAttribute('data-clan-recruit-status'), 'recruited');
    await page.waitForFunction(id => document.activeElement?.getAttribute('data-clan-recruit') === id, id);
  };
  const assertReserve = async id => {
    const save = await stored(), member = save.companionResidence.members.find(member => member.id === id);
    assert.ok(member, `The native recruitment transaction must register ${id}`);
    assert.equal(member.assignment, null); assert.equal(member.installation, null); assert.equal(member.refit, null);
    assert.equal(member.legacyClanPost, false);
    assert.equal(domain.availableClanResidenceCrew(save).includes(id), false, 'A reserve agreement lends no tactical bonus');
    await closePanel();
    assert.equal(await page.locator(`[data-clan-crew="${id}"], [data-companion-avatar="${id}"], [data-companion-module="${id}"]`).count(), 0,
      'A reserve recruit must not acquire an uninstalled actor or quarter');
    await openResidence();
    const card = residencePanel().locator(`[data-companion-member="${id}"]`);
    assert.match(await card.innerText(), /Réserve du réseau/);
    assert.match(await card.innerText(), /Aucune installation personnelle/);
    assert.deepEqual((await stored()).companionResidence, save.companionResidence, 'Reading the reserve changes no assignment');
  };
  const showResident = async id => {
    const save = await stored(), entry = domain.companionResidencePresence(save, clanResidenceHost).find(entry => entry.id === id);
    assert.ok(entry?.avatarVisible && entry.serviceAvailable && entry.quarterVisible, `${id} must have a real active clan posting`);
    await visit(CLAN_SHIP_RECRUITS.find(npc => npc.id === id).roomId);
    assert.equal(await page.locator(`[data-clan-crew="${id}"]`).count(), 0, 'The old post must not retain a second actor after installation or reload');
    await visit(entry.avatarRoomId);
    const rendered = page.locator(`[data-companion-avatar="${id}"]`);
    assert.equal(await rendered.count(), 1, 'Each installed member has one actual resident actor');
    assert.equal(await rendered.getAttribute('data-companion-actor-location'), 'aboard');
    const image = rendered.locator('img[data-homeworld-npc-variant-v84]');
    await image.waitFor({ state: 'visible' });
    await image.evaluate(image => image.decode());
    assert.ok(await image.evaluate(image => image.complete && image.naturalWidth > 0));
    const quarter = page.locator(`[data-companion-module="${id}"]`);
    assert.equal(await quarter.count(), 1);
    const art = quarter.locator('img[data-companion-art]');
    await art.waitFor({ state: 'visible' }); await art.evaluate(image => image.decode());
    assert.ok(await art.evaluate(image => image.complete && image.naturalWidth > 0));
    assert.equal(await page.locator(`[data-clan-crew="${id}"]`).count(), 0, 'Managed housing must not duplicate the legacy actor');
    await openPanel('crew');
    assert.equal(await page.locator(`[data-clan-recruit="${id}"]`).getAttribute('data-clan-recruit-status'), 'recruited');
    await closePanel();
  };
  const installRecruit = async id => {
    // Walking to the hangar and opening its dossier approaches the actual service
    // point. All three residence transactions then use native UI callbacks.
    await visit('hangar'); await openPanel('crew'); await closePanel(); await openResidence();
    const before = await stored(), cost = domain.companionResidenceDefinition(id).installationCost;
    assert.equal(cost, 20); assert.ok(before.profile.clanMarks >= cost, 'Only earned marks may fund the new quarter');
    await residencePanel().locator(`[data-companion-member="${id}"] select`).selectOption('clan');
    let after = await residenceClick('plan-refit', id);
    let member = after.companionResidence.members.find(member => member.id === id);
    assert.equal(member.refit.stage, 'planned'); assert.deepEqual(member.refit.host, clanResidenceHost);
    assert.equal(member.refit.reservedMarks, 0); assert.equal(member.installation, null); assert.equal(member.assignment, null);
    assert.equal(after.profile.clanMarks, before.profile.clanMarks);
    after = await residenceClick('fund-refit', id);
    member = after.companionResidence.members.find(member => member.id === id);
    assert.equal(member.refit.stage, 'funded'); assert.equal(member.refit.reservedMarks, cost);
    assert.equal(member.installation, null); assert.equal(member.assignment, null);
    assert.equal(domain.availableClanResidenceCrew(after).includes(id), false, 'Funding alone does not bring a recruit aboard');
    assert.equal(after.profile.clanMarks, before.profile.clanMarks - cost);
    after = await residenceClick('complete-refit', id);
    member = after.companionResidence.members.find(member => member.id === id);
    assert.equal(member.refit, null); assert.deepEqual(member.assignment, clanResidenceHost);
    assert.deepEqual(member.installation.host, clanResidenceHost); assert.equal(member.legacyClanPost, false);
    assert.equal(after.profile.clanMarks, before.profile.clanMarks - cost, 'Confirmation must not charge the supplies twice');
    await showResident(id); await screenshot(`crew-${id}-installed-quarter.png`);
  };
  const completeInterior = async id => {
    await visit('conseil'); await acceptContract(id);
    const before = await stored();
    for (const [index, step] of definition(id).steps.entries()) {
      await visit(step.roomId); await openPanel('contracts');
      assert.equal(await page.locator('[data-clan-interior-step]').count(), 1, 'Only the current ordered intervention can be confirmed');
      const result = await durableClick(`[data-clan-interior-step="${step.id}"]`);
      assert.equal(result.profile.clanMarks, before.profile.clanMarks + (index === definition(id).steps.length - 1 ? definition(id).clanMarksReward : 0));
    }
    const finished = await stored();
    assert.equal(receiptCount(finished, id), 1);
    assert.equal(finished.clanShipOperations.activeContract, null);
    assert.equal(finished.clanShipOperations.recruitedNpcIds.length, before.clanShipOperations.recruitedNpcIds.length, 'Completion must not silently recruit a candidate');
    const npc = CLAN_SHIP_RECRUITS.find(item => item.requiredContractIds.includes(id));
    await openPanel('crew');
    assert.equal(await page.locator(`[data-clan-recruit="${npc.id}"]`).getAttribute('data-clan-recruit-status'), 'available');
    const recruited = await durableClick(`[data-clan-recruit-action="${npc.id}"]`);
    assert.ok(recruited.clanShipOperations.recruitedNpcIds.includes(npc.id));
    assert.equal(recruited.profile.clanMarks, finished.profile.clanMarks, 'An agreement does not create another currency reward');
    await assertReserve(npc.id);
    await installRecruit(npc.id);
  };

  const primary = await startContext(fixtures[0]);
  await check('A disclosed adult campaign resumes aboard with no pre-completed operations', async () => {
    await openApp(); await waitRoom('hangar');
    const current = await stored();
    assert.equal(current.createdAt, seed.createdAt);
    assert.equal(current.profile.clanMarks, 0);
    assert.equal(current.clanShipOperations, undefined);
    assert.equal(current.clanShipDocking.personalShipId, 'classic-predator-spaceship');
  });
  await check('The first dossier requires physical approach; closing or browsing grants nothing', async () => {
    const before = await actor();
    await openPanel('post');
    const after = await actor();
    assert.ok(Math.hypot(after.x - before.x, after.y - before.y) > 30, 'The hunter must approach the real service post');
    assert.equal(await interior().getAttribute('data-interior-suspended'), 'true');
    await page.locator('[data-clan-operations-tab="contracts"]').click();
    assert.equal(await page.locator('[data-clan-accept-contract]').count(), 0, 'The hangar cannot issue an operation');
    await page.locator('[data-clan-operations-tab="post"]').click();
    assert.equal((await stored()).clanShipOperations, undefined);
    await screenshot('01-welcome-hangar.png');
  });
  await check('The first onboarding checkpoint survives a real reload without granting the mandate', async () => {
    await durableClick('[data-clan-onboard-step="berth-register"]');
    const before = await operations();
    assert.equal(before.onboardingStep, 1); assert.equal(before.mandateAccepted, false);
    await reload(); await openPanel('post');
    assert.deepEqual(await operations(), before);
    assert.equal(await page.locator('[data-clan-onboard-step]').count(), 0, 'The next medical step is not remotely executable from the hangar');
  });
  await check('Onboarding walks to medical and archives, validates the ordered posts and awards no marks', async () => {
    for (const step of CLAN_SHIP_ONBOARDING_STEPS.slice(1)) {
      await visit(step.roomId); await openPanel('post');
      await durableClick(`[data-clan-onboard-step="${step.id}"]`);
    }
    const current = await stored();
    assert.equal(current.clanShipOperations.onboardingStep, 3);
    assert.equal(receiptCount(current, 'welcome-aboard'), 1);
    assert.equal(current.profile.clanMarks, 0);
    assert.equal(current.clanShipOperations.mandateAccepted, false);
    assert.equal(await panel().getAttribute('data-clan-operations-phase'), 'mandate');
  });
  await check('The massive council projection grants one mandate without changing rank or hull ownership', async () => {
    await visit('conseil');
    const projection = page.locator('[data-clan-holo-projection]');
    await projection.waitFor({ state: 'visible' });
    assert.ok((await projection.boundingBox()).width >= 250, 'The collective holo projection must read at scene scale');
    await screenshot('02-council-massive-table.png');
    await openPanel('post');
    const before = await stored();
    await durableClick('[data-clan-accept-mandate]');
    const after = await stored();
    assert.equal(after.clanShipOperations.mandateAccepted, true);
    assert.equal(after.profile.rankId, before.profile.rankId);
    assert.equal(after.profile.clanMarks, before.profile.clanMarks);
    assert.deepEqual(after.clanShipDocking, before.clanShipDocking);
    assert.equal(await page.locator('[data-clan-accept-mandate]').count(), 0);
    await screenshot('03-mandate-granted.png');
  });
  await check('Keyboard focus remains in the table and walking keys cannot move the suspended hunter', async () => {
    await openPanel('contracts');
    const beforeActor = await actor(), before = await operations();
    await page.locator('[data-clan-operations-close]').focus();
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(350); await page.keyboard.up('ArrowRight');
    await frames(); samePosition(await actor(), beforeActor, 'The table owns input');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => !!document.activeElement?.closest('[data-clan-operations]')), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-clan-operations-close')), true);
    await page.locator('[data-clan-operations-tab="crew"]').click();
    assert.equal(await page.locator('[data-clan-recruit-status="locked"]').count(), 6);
    assert.deepEqual(await operations(), before, 'Consulting the roster changes no campaign state');
    await page.keyboard.press('Escape'); await panel().waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.activeElement?.hasAttribute('data-interior-world'));
  });
  await check('A partial internal circuit persists and the other dossiers cannot replace it', async () => {
    await acceptContract('ship-seal-check');
    await page.locator('[data-clan-contract-card="ship-armory-audit"]').click();
    assert.equal(await page.locator('[data-clan-accept-contract="ship-armory-audit"]').isDisabled(), true);
    for (const step of definition('ship-seal-check').steps.slice(0, 2)) {
      await visit(step.roomId); await openPanel('contracts');
      await durableClick(`[data-clan-interior-step="${step.id}"]`);
    }
    const before = await operations();
    assert.equal(before.activeContract.stepIndex, 2);
    assert.equal((await stored()).profile.clanMarks, 0);
    await reload(); await openPanel('contracts');
    assert.deepEqual(await operations(), before);
    assert.equal(await page.locator('[data-clan-interior-step]').count(), 0, 'The archive step cannot be executed at medical after resuming');
  });
  await check('Finishing confinement awards once, then the warden accepts an explicit reserve agreement at the hangar', async () => {
    for (const step of definition('ship-seal-check').steps.slice(2)) {
      await visit(step.roomId); await openPanel('contracts');
      await durableClick(`[data-clan-interior-step="${step.id}"]`);
    }
    let current = await stored();
    assert.equal(receiptCount(current, 'ship-seal-check'), 1);
    assert.equal(current.profile.clanMarks, 15);
    assert.deepEqual(current.clanShipOperations.recruitedNpcIds, []);
    await closePanel();
    await page.locator('[data-clan-crew="threshold-guard"][data-clan-crew-recruited="false"] img').waitFor({ state: 'visible' });
    await page.locator('[data-clan-crew-talk="threshold-guard"]').click();
    await panel().waitFor();
    assert.equal(await page.locator('[data-clan-operations-tab="crew"]').getAttribute('aria-pressed'), 'true');
    current = await durableClick('[data-clan-recruit-action="threshold-guard"]');
    assert.deepEqual(current.clanShipOperations.recruitedNpcIds, ['threshold-guard']);
    assert.equal(current.profile.clanMarks, 15);
    assert.equal(await page.locator('[data-clan-recruit-action="threshold-guard"]').count(), 0);
    await assertReserve('threshold-guard');
    assert.ok(current.profile.clanMarks < domain.companionResidenceDefinition('threshold-guard').installationCost,
      'The first receipt alone cannot fund a quarter; no currency may be injected');
    await screenshot('crew-threshold-guard-in-reserve.png');
  });
  for (const id of interiorIds.slice(1)) await check(`The complete ${id} circuit pays once and its recruit moves from reserve into a funded quarter`, () => completeInterior(id));
  await check('Three installed recruits and the warden reserve persist after reload with the earned housing budget', async () => {
    const before = await stored();
    assert.deepEqual([...before.clanShipOperations.recruitedNpcIds].sort(), [...mainRecruitIds].sort());
    assert.deepEqual(domain.availableClanResidenceCrew(before), mainRecruitIds.slice(1));
    assert.equal(before.profile.clanMarks, 15, 'The four circuits earn 75 marks and three real quarters cost 60');
    await reload();
    assert.deepEqual(await operations(), before.clanShipOperations);
    assert.deepEqual((await stored()).companionResidence, before.companionResidence);
    await assertReserve('threshold-guard');
    for (const id of mainRecruitIds.slice(1)) await showResident(id);
    assert.equal((await stored()).profile.clanMarks, 15);
    assert.equal(await page.locator('[data-clan-confirm-circle]').count(), 0);
  });
  await check('A real escort binds only the three installed roles and advances through actual tactical orders', async () => {
    await visit('conseil'); await acceptContract('space-screening');
    assert.deepEqual((await operations()).spaceEncounter.crewRoles, ['armorer', 'medic', 'veteran']);
    assert.equal(await page.locator('[data-clan-space-order="board"]').isDisabled(), true);
    await spaceOrder('scan'); await spaceOrder('manoeuvre');
    const before = await operations();
    assert.equal(before.spaceEncounter.turn, 2);
    assert.equal(before.spaceEncounter.scanLevel, 1);
    assert.equal(before.spaceEncounter.range, 1);
    assert.equal((await stored()).profile.clanMarks, 15);
    await screenshot('04-escort-turn-two.png');
    await closePanel(); await page.waitForTimeout(350); await openPanel('contracts');
    assert.deepEqual(await operations(), before, 'Closing or reopening the command table consumes no turn');
    await reload(); await openPanel('contracts');
    assert.deepEqual(await operations(), before, 'Reload preserves the exact tactical turn and roles');
  });
  await check('Refusing the final escort write preserves the active turn, the receipt count and the balance', async () => {
    await spaceOrder('brace'); await spaceOrder('brace');
    const before = await stored();
    assert.equal(before.clanShipOperations.spaceEncounter.objectiveProgress, 3);
    await page.evaluate(() => { window.__clanOperationsQa.refuseContract = 'space-screening'; });
    await page.locator('[data-clan-space-order="extract"]').click();
    await page.waitForFunction(() => window.__clanOperationsQa.refusals > 0);
    await frames();
    const after = await stored();
    assert.deepEqual(after.clanShipOperations, before.clanShipOperations);
    assert.equal(after.profile.clanMarks, before.profile.clanMarks);
    assert.equal(receiptCount(after, 'space-screening'), 0);
    assert.equal(await page.locator('[data-clan-space]').getAttribute('data-clan-space-turn'), '4');
    assert.match(await page.locator('[data-clan-space-report]').innerText(), /Ordre non confirmé/);
    await screenshot('05-escort-write-refused.png');
  });
  await check('Retrying the same extraction pays the unique reward and completed dossiers cannot be paid twice', async () => {
    await page.evaluate(() => { window.__clanOperationsQa.refuseContract = null; });
    const after = await spaceOrder('extract');
    assert.equal(after.clanShipOperations.spaceEncounter.status, 'victory');
    assert.equal(after.clanShipOperations.activeContract, null);
    assert.equal(receiptCount(after, 'space-screening'), 1);
    assert.equal(after.profile.clanMarks, 60);
    await page.locator('[data-clan-contract-card="space-screening"]').click();
    assert.equal(await page.locator('[data-clan-accept-contract="space-screening"]').isDisabled(), true);
    await screenshot('06-escort-reward-confirmed.png');
    const before = await operations();
    await reload(); await openPanel('contracts');
    assert.deepEqual(await operations(), before);
    assert.equal((await stored()).profile.clanMarks, 60);
  });
  await check('The earned escort reward funds the warden quarter and all four actual residents survive reload', async () => {
    await assertReserve('threshold-guard');
    await installRecruit('threshold-guard');
    const before = await stored();
    assert.equal(before.profile.clanMarks, 40, '75 circuit marks plus 45 escort marks minus four 20-mark quarters');
    assert.deepEqual(domain.availableClanResidenceCrew(before), mainRecruitIds);
    assert.equal(new Set(before.companionResidence.members.map(member => member.installation.berth)).size, 4,
      'Each installed recruit owns a distinct actual berth');
    await reload();
    assert.deepEqual((await stored()).companionResidence, before.companionResidence);
    assert.deepEqual(await operations(), before.clanShipOperations);
    for (const id of mainRecruitIds) await showResident(id);
    assert.equal((await stored()).profile.clanMarks, 40);
    await visit('conseil');
  });
  await check('Withdrawing from interception ends the contact without a proof or reward and permits a new departure', async () => {
    await acceptContract('space-interception');
    assert.deepEqual((await operations()).spaceEncounter.crewRoles, ['armorer', 'medic', 'veteran', 'warden']);
    await spaceOrder('scan');
    const before = await stored();
    const after = await spaceOrder('withdraw');
    assert.equal(after.clanShipOperations.spaceEncounter.status, 'withdrawn');
    assert.equal(after.clanShipOperations.activeContract, null);
    assert.equal(receiptCount(after, 'space-interception'), 0);
    assert.equal(after.profile.clanMarks, before.profile.clanMarks);
    await screenshot('07-contact-withdrawn.png');
    await acceptContract('space-interception');
    assert.equal((await operations()).spaceEncounter.turn, 0);
  });
  await check('Sixteen defensive orders exhaust the tactical window without granting a victory', async () => {
    const marks = (await stored()).profile.clanMarks;
    for (let turn = 0; turn < 16 && (await operations()).spaceEncounter.status === 'active'; turn++) await spaceOrder('brace');
    const current = await stored();
    assert.equal(current.clanShipOperations.spaceEncounter.status, 'defeat');
    assert.equal(current.clanShipOperations.spaceEncounter.turn, 16);
    assert.ok(current.clanShipOperations.spaceEncounter.formationIntegrity > 0, 'This path exercises timeout rather than hull exhaustion');
    assert.equal(current.clanShipOperations.activeContract, null);
    assert.equal(receiptCount(current, 'space-interception'), 0);
    assert.equal(current.profile.clanMarks, marks);
    await screenshot('08-tactical-window-lost.png');
  });
  await check('A fresh interception is won through identification, approach, energy and actual fire orders', async () => {
    await acceptContract('space-interception');
    for (const order of spacePaths['space-interception']) await spaceOrder(order);
    const current = await stored();
    assert.equal(current.clanShipOperations.spaceEncounter.status, 'victory');
    assert.equal(current.clanShipOperations.spaceEncounter.hostileIntegrity, 0);
    assert.equal(receiptCount(current, 'space-interception'), 1);
    assert.equal(current.profile.clanMarks, 105);
    await screenshot('09-interception-completed.png');
  });
  await check('Recovery requires analysis, disabled propulsion and boarding before the final extraction', async () => {
    await acceptContract('space-recovery');
    for (const order of spacePaths['space-recovery'].slice(0, -2)) await spaceOrder(order);
    let current = await stored();
    assert.equal(current.clanShipOperations.spaceEncounter.objectiveProgress, 2);
    assert.equal(current.clanShipOperations.spaceEncounter.status, 'active');
    assert.equal(receiptCount(current, 'space-recovery'), 0);
    assert.equal(current.profile.clanMarks, 105);
    await screenshot('10-capsule-awaiting-extraction.png');
    await spaceOrder('brace'); current = await spaceOrder('extract');
    assert.equal(current.clanShipOperations.spaceEncounter.status, 'victory');
    assert.equal(current.clanShipOperations.spaceEncounter.objectiveProgress, 3);
    assert.equal(receiptCount(current, 'space-recovery'), 1);
    assert.equal(current.profile.clanMarks, 160);
    await screenshot('11-recovery-completed.png');
  });
  await check('The journal records eight real UI receipts and checkpointing preserves them with four crew', async () => {
    await openPanel('journal');
    const before = await stored();
    assert.equal(before.clanShipOperations.completedContracts.length, 8);
    assert.equal(before.clanShipOperations.completedContracts.filter(item => item.proof.kind === 'field').length, 0,
      'The primary browser context must never claim a synthetic field hunt');
    assert.equal(await panel().getByText('récompense déjà attribuée', { exact: false }).count(), 8);
    await screenshot('12-operation-journal.png');
    await closePanel();
    await page.locator('[data-clan-ship-status]').getByRole('button', { name: 'Ouvrir les paramètres', exact: true }).click();
    await page.getByRole('button', { name: 'Sauvegarder et revenir au menu principal', exact: true }).click();
    await continueCampaign();
    assert.deepEqual(await operations(), before.clanShipOperations);
    assert.deepEqual((await stored()).companionResidence, before.companionResidence);
    assert.equal((await stored()).profile.clanMarks, 160);
  });
  await check('At 390 px the four real recruits and all dossier tabs remain reachable by touch without overflow', async () => {
    await page.setViewportSize({ width: 390, height: 844 }); await frames();
    await openPanel('crew', true); await assertNoOverflow();
    assert.equal(await page.locator('[data-clan-recruit-status="recruited"]').count(), 4);
    assert.equal(await page.locator('[data-clan-recruit-status="locked"]').count(), 2);
    for (const tab of ['post', 'contracts', 'journal', 'crew']) {
      await page.locator(`[data-clan-operations-tab="${tab}"]`).tap();
      await assertNoOverflow();
    }
    await page.locator('[data-clan-recruit="threshold-guard"]').scrollIntoViewIfNeeded();
    await screenshot('13-earned-crew-mobile-390.png');
    await page.locator('[data-clan-operations-close]').tap();
    await panel().waitFor({ state: 'hidden' });
  });
  const primaryBeforeFixture = await stored();

  await startContext(fixtures[1]);
  await check('The disclosed six-crew fixture imports normally and each ally is rendered at their distinct post', async () => {
    await openApp();
    assert.equal((await stored()).createdAt, crewSeed.createdAt);
    assert.equal((await operations()).completedContracts.filter(item => item.proof.kind === 'field').length, 2,
      'These two receipts are explicitly disclosed fixture data, not browser-played hunts');
    for (const npc of CLAN_SHIP_RECRUITS) {
      await showRecruit(npc.id);
      if (npc.id === 'star-watch' || npc.id === 'cold-trace') await screenshot(`fixture-${npc.id}-dossier.png`);
    }
    assert.deepEqual((await operations()).recruitedNpcIds, crewSeed.clanShipOperations.recruitedNpcIds);
    assert.equal((await operations()).circleConfirmed, false);
  });
  await check('On mobile 390 the six actual crew effects are fixed at departure and tactical orders are usable touch targets', async () => {
    await visit('conseil');
    await page.setViewportSize({ width: 390, height: 844 }); await frames();
    await acceptContract('space-screening', true);
    const initial = await operations();
    assert.deepEqual(initial.spaceEncounter.crewRoles, ['navigator', 'armorer', 'medic', 'tracker', 'veteran', 'warden']);
    for (const order of ['scan', 'manoeuvre', 'brace', 'withdraw']) {
      const control = page.locator(`[data-clan-space-order="${order}"]`);
      await control.scrollIntoViewIfNeeded();
      const box = await control.boundingBox();
      assert.ok(box && box.width >= 44 && box.height >= 44, `${order}: usable mobile control`);
    }
    await assertNoOverflow();
    await spaceOrder('scan', true);
    let state = await operations();
    assert.equal(state.spaceEncounter.scanLevel, 2, 'The recruited tracker identifies and prepares boarding with one scan');
    assert.equal(state.spaceEncounter.formationIntegrity, 96, 'Medic and veteran reduce the first formation losses');
    assert.equal(state.spaceEncounter.assetIntegrity, 99, 'The warden protects the transported objective');
    await spaceOrder('manoeuvre', true);
    state = await operations();
    assert.equal(state.spaceEncounter.range, 2, 'The navigator reaches close formation in one manoeuvre');
    assert.equal(state.spaceEncounter.turn, 2);
    await page.locator('[data-clan-space-projection]').scrollIntoViewIfNeeded();
    await screenshot('14-six-crew-escort-mobile-390.png');
    const before = await operations();
    await reload(); await openPanel('contracts', true);
    assert.deepEqual(await operations(), before);
  });
  await check('At 320 px tactical commands scroll, disclose their real forecast and complete by touch after reload', async () => {
    await page.setViewportSize({ width: 320, height: 844 }); await frames(); await assertNoOverflow();
    await page.locator('[data-clan-space-order="brace"]').scrollIntoViewIfNeeded();
    assert.match(await page.locator('[data-clan-space-forecast="brace"]').innerText(), /Prévision/iu);
    await screenshot('15-tactical-controls-mobile-320.png');
    const marks = (await stored()).profile.clanMarks;
    for (const order of ['brace', 'brace', 'extract']) await spaceOrder(order, true);
    const current = await stored();
    assert.equal(current.clanShipOperations.spaceEncounter.status, 'victory');
    assert.equal(current.clanShipOperations.spaceEncounter.turn, 5);
    assert.equal(current.profile.clanMarks, marks + 45);
    assert.equal(receiptCount(current, 'space-screening'), 1);
    await assertNoOverflow(); await screenshot('16-mobile-escort-reward.png');
  });
  await check('With disclosed field proofs, six agreements and a browser-won escort the council confirms the circle once', async () => {
    await openPanel('crew', true);
    const before = await stored();
    assert.equal(before.clanShipOperations.circleConfirmed, false);
    await durableClick('[data-clan-confirm-circle]', true);
    const current = await stored();
    assert.equal(current.clanShipOperations.circleConfirmed, true);
    assert.equal(current.profile.clanMarks, before.profile.clanMarks);
    assert.equal(current.profile.rankId, before.profile.rankId);
    assert.equal(current.clanShipDocking.personalShipId, before.clanShipDocking.personalShipId);
    assert.equal(await page.locator('[data-clan-confirm-circle]').count(), 0);
    await page.locator('[data-clan-operations-tab="journal"]').tap();
    await assertNoOverflow(); await screenshot('17-fixture-circle-confirmed-mobile-320.png');
    await reload(); assert.equal((await operations()).circleConfirmed, true);
  });
  await check('The second isolated campaign cannot change the first campaign’s crew, receipts or currency', async () => {
    const original = await primary.page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_STORAGE_KEY);
    assert.equal(original.createdAt, seed.createdAt);
    assert.deepEqual(original.clanShipOperations, primaryBeforeFixture.clanShipOperations);
    assert.deepEqual(original.companionResidence, primaryBeforeFixture.companionResidence);
    assert.equal(original.profile.clanMarks, primaryBeforeFixture.profile.clanMarks);
    assert.notEqual(original.createdAt, (await stored()).createdAt);
    assert.equal(original.clanShipOperations.circleConfirmed, false);
  });
  await check('All requested assets and actual room/crew images load without uncaught browser errors', async () => {
    await page.waitForLoadState('networkidle');
    assert.deepEqual(report.errors, []);
    assert.deepEqual([...missing], [], 'The checkout must include every image/audio asset requested by these paths');
    assert.equal(report.walking.rooms.length, 7, 'Actual interior routes must reach all seven rooms');
    assert.ok(report.walking.samples > 100, 'Collision assertions must include real movement, not only room titles');
    assert.ok(report.commands.length >= 40, 'The spatial scenarios must issue actual commands');
    assert.equal(report.residenceActions.length, 12, 'All four arrivals require three native housing transactions');
  });
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.stack || String(error);
  if (page) {
    report.lastScene = await page.evaluate(key => {
      const scene = document.querySelector('[data-clan-interior]'), table = document.querySelector('[data-clan-operations]');
      const save = JSON.parse(localStorage.getItem(key) || 'null');
      return { owner: save?.createdAt, docking: save?.clanShipDocking, operations: save?.clanShipOperations,
        residence: save?.companionResidence, marks: save?.profile?.clanMarks,
        scene: scene ? { ...scene.dataset } : null, table: table ? { ...table.dataset } : null,
        focused: document.activeElement?.outerHTML?.slice(0, 500), hidden: document.hidden, documentFocused: document.hasFocus(),
        diagnostics: window.__clanOperationsQa ? { refusals: window.__clanOperationsQa.refusals,
          recentWalking: window.__clanOperationsQa.walking.slice(-12), recentWrites: window.__clanOperationsQa.writes.slice(-12) } : null };
    }, SAVE_STORAGE_KEY).catch(() => null);
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
    await fs.writeFile(path.join(out, 'failure-page.txt'), await page.locator('body').innerText().catch(() => 'Unavailable'));
  }
  console.error(error);
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  report.missingAssets = [...missing].sort(); report.requestedAssets = [...requested].sort();
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  if (browser) await browser.close();
  if (server) await server.close();
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, output: out, missingAssets: missing.size }));
}
