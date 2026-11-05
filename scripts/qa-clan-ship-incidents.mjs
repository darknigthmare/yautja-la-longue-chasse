import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

// Actual desktop GameClient and physical UI. Only a disclosed initial campaign,
// passive DOM/storage observations and an intentional write failure are injected.
// Never inject an actor, action callback, mission result or replacement clock.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, process.env.CLAN_INCIDENTS_QA_OUTPUT || 'outputs/qa-clan-ship-incidents');
const port = Number(process.env.CLAN_INCIDENTS_QA_PORT || 4188);
const headed = process.env.CLAN_INCIDENTS_HEADED === '1';
const checkoutCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const workingTreeDirty = !!execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim();
await fs.mkdir(out, { recursive: true });
const bundle = await build({ stdin: { contents: [
  "export {defaultSave,SAVE_STORAGE_KEY,applyMissionResult,parseSaveImport} from './app/game/save.ts';",
  "export {MISSION_BY_ID} from './app/game/data.ts';",
  "export * from './app/game/systems/clanShipDocking.ts';",
  "export * from './app/game/systems/clanShipOperations.ts';",
  "export * from './app/game/systems/clanShipIncidents.ts';",
  "export {isClanShipInteriorWalkable,CLAN_SHIP_INTERIOR_METRICS} from './app/game/systems/clanShipInterior.ts';",
  "export {selectClanShipCrewDialogue} from './app/game/clanShipCrewDialogues.ts';",
].join('\n'), resolveDir: root }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const domain = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const { SAVE_STORAGE_KEY, CLAN_SHIP_INCIDENTS, CLAN_SHIP_RECRUITS } = domain;
const roomRing = ['hangar', 'armurerie', 'entrainement', 'conseil', 'archives', 'trophees', 'soins'];

function fixtureRoom(save, roomId) {
  if (save.clanShipDocking.roomId === roomId) return save;
  const result = domain.actClanShipDocking(save.clanShipDocking, { type: 'move-room', roomId },
    { ownerCreatedAt: save.createdAt, personalShipId: save.clanShipDocking.personalShipId });
  assert.equal(result.accepted, true, result.message);
  return { ...save, clanShipDocking: result.state };
}
function fixtureOperation(source, type, values = {}, roomId = 'conseil') {
  const save = fixtureRoom(source, roomId), state = save.clanShipOperations ?? domain.createClanShipOperations(save.createdAt);
  const result = domain.actClanShipOperations(state, { type, expectedRevision: state.revision, ...values },
    { ownerCreatedAt: save.createdAt, docking: save.clanShipDocking, campaign: save });
  assert.equal(result.accepted, true, `Synthetic preparation ${type}: ${result.message}`);
  return { ...save, clanShipOperations: result.state, profile: { ...save.profile, clanMarks: save.profile.clanMarks + result.clanMarksReward } };
}
function syntheticResult(mission) {
  return { missionId: mission.id, difficultyId: 'hunter', outcome: 'success', score: 80, scans: 3, elapsedSeconds: 240,
    completedObjectiveIds: mission.objectives.filter(item => item.required || item.kind === 'extract').map(item => item.id),
    honorEvents: [], trophyQuality: 'elite', trophyClaims: [{ id: `${mission.id}-disclosed-incidents-fixture`, definitionId: mission.trophy.id,
      targetName: mission.targetName, targetKind: mission.targetKind, partId: mission.trophy.partId, condition: 'pristine', quality: 'elite' }],
    kills: 3, secondWindUsed: false, completedAt: '2026-11-05T11:15:00.000Z' };
}
function fixtureField(source, id) {
  const definition = domain.clanShipContract(id), mission = domain.MISSION_BY_ID[definition.missionId];
  let save = source;
  for (const previous of Object.values(domain.MISSION_BY_ID).filter(item => item.order < mission.order).sort((a, b) => a.order - b.order)) {
    if (save.missionProgress[previous.id].status !== 'completed') save = domain.applyMissionResult(save, syntheticResult(previous));
  }
  assert.notEqual(save.missionProgress[mission.id].status, 'locked');
  save = fixtureOperation(save, 'accept-contract', { contractId: id });
  const run = save.missionProgress[mission.id].attempts;
  const binding = domain.bindClanShipMission(save.clanShipOperations, { ownerCreatedAt: save.createdAt,
    missionId: mission.id, encounterRun: run, expectedRevision: save.clanShipOperations.revision });
  assert.equal(binding.accepted, true, binding.message);
  save = { ...save, clanShipOperations: binding.state };
  const result = syntheticResult(mission), progressed = domain.applyMissionResult(save, result);
  const settled = domain.settleClanShipMission(save.clanShipOperations, save, progressed, result,
    { ownerSaveCreatedAt: save.createdAt, missionId: mission.id, encounterRun: run });
  assert.equal(settled.accepted, true, settled.message);
  return { ...progressed, clanShipOperations: settled.state,
    profile: { ...progressed.profile, clanMarks: progressed.profile.clanMarks + settled.clanMarksReward } };
}
function createFixture() {
  let save = domain.defaultSave('2026-11-05T11:00:00.000Z');
  save.profile.hunterName = 'QA incidents · prérequis synthétiques déclarés';
  save.settings.masterVolume = 0;
  let visit = domain.createClanShipDockingState(save.createdAt, 'classic-predator-spaceship');
  for (const type of ['approach', 'dock', 'board']) visit = domain.actClanShipDocking(visit, { type },
    { ownerCreatedAt: save.createdAt, personalShipId: 'classic-predator-spaceship' }).state;
  save = { ...save, clanShipDocking: visit };
  for (const step of domain.CLAN_SHIP_ONBOARDING_STEPS) save = fixtureOperation(save, 'onboard-step', { stepId: step.id }, step.roomId);
  save = fixtureOperation(save, 'accept-mandate');
  for (const definition of domain.CLAN_SHIP_CONTRACTS.filter(item => item.kind === 'interior')) {
    save = fixtureOperation(save, 'accept-contract', { contractId: definition.id });
    for (const step of definition.steps) save = fixtureOperation(save, 'interior-step', { stepId: step.id }, step.roomId);
  }
  for (const id of ['field-jungle-survey', 'field-ice-route', 'field-ruins-memory']) save = fixtureField(save, id);
  for (const npc of CLAN_SHIP_RECRUITS) save = fixtureOperation(save, 'recruit', { npcId: npc.id }, npc.roomId);
  for (const [id, orders] of [
    ['space-screening', ['scan', 'manoeuvre', 'brace', 'brace', 'extract']],
    ['space-recovery', ['scan', 'manoeuvre', 'disrupt', 'recharge', 'disrupt', 'brace', 'board', 'extract']],
  ]) {
    save = fixtureOperation(save, 'accept-contract', { contractId: id });
    for (const type of orders) save = fixtureOperation(save, 'space-command', { command: { type, expectedTurn: save.clanShipOperations.spaceEncounter.turn } });
    assert.equal(save.clanShipOperations.spaceEncounter.status, 'victory');
  }
  save = fixtureRoom(save, 'conseil');
  assert.equal(save.clanShipIncidents, undefined, 'No incident evidence, decision, transfer or reward is pre-accomplished');
  assert.equal(save.clanShipOperations.completedContracts.some(item => item.contractId === 'space-interception'), false);
  return save;
}
const seed = createFixture(), serializedFixture = JSON.stringify(seed, null, 2) + '\n';
const imported = domain.parseSaveImport(serializedFixture);
assert.equal(imported.failure, null, 'The synthetic fixture must pass the real save boundary');
assert.deepEqual(imported.save.clanShipOperations, seed.clanShipOperations);
assert.deepEqual(imported.save.clanShipDocking, seed.clanShipDocking);
const fixtureDisclosure = { id: 'prerequisites-and-six-crew', filename: 'initial-incident-prerequisites.json',
  disclosure: 'Synthetic initial campaign made with production reducers: boarding, welcome/mandate, four interior contracts, jungle/ice/ruins field proofs and their required campaign chain, six recruited crew, spatial screening/recovery victories. These prior hunts and victories are NOT played by this browser recipe. All four incidents start absent. Interception is not completed. Browser evidence concerns only the subsequent physical UI actions.',
  ownerCreatedAt: seed.createdAt, marks: seed.profile.clanMarks, completedContracts: seed.clanShipOperations.completedContracts.map(item => item.contractId),
  sha256: createHash('sha256').update(serializedFixture).digest('hex') };
await fs.writeFile(path.join(out, fixtureDisclosure.filename), serializedFixture);
await fs.writeFile(path.join(out, 'fixture-disclosure.json'), JSON.stringify(fixtureDisclosure, null, 2) + '\n');
if (process.argv.includes('--fixtures-only')) {
  console.log(JSON.stringify({ fixtureValidationOnly: true, browserExecuted: false, fixture: fixtureDisclosure, checkoutCommit, workingTreeDirty }, null, 2));
  process.exit(0);
}

const report = { startedAt: new Date().toISOString(), sourceCommit: process.env.CLAN_INCIDENTS_SOURCE_COMMIT || checkoutCommit,
  checkoutCommit, workingTreeDirty, headed, runtime: 'actual desktop GameClient via Vite', fixture: fixtureDisclosure,
  checks: [], errors: [], screenshots: [], commands: [], focusTransitions: [],
  walking: { samples: 0, escortSamples: 0, rooms: [], transitions: [] }, requestedAssets: [], assetHashes: [], missingAssets: [] };
const missing = new Set(), requested = new Set();
let server, browser, context, page, previousSample = null;
try {
  if (process.env.CLAN_INCIDENTS_SOURCE_COMMIT) {
    assert.equal(checkoutCommit, process.env.CLAN_INCIDENTS_SOURCE_COMMIT, 'Browser evidence must exercise the exact requested commit');
    assert.equal(workingTreeDirty, false, 'Published evidence requires a clean source checkout');
  }
  server = await createServer({ configFile: path.join(root, 'desktop/vite.config.ts'), server: { host: '127.0.0.1', port, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined, headless: !headed,
    args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  report.browserVersion = browser.version();
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', hasTouch: true });
  await context.addInitScript(({ key, save }) => {
    if (!localStorage.getItem('__clanIncidentsQaSeeded')) {
      localStorage.setItem(key, JSON.stringify(save));
      localStorage.setItem('__clanIncidentsQaSeeded', 'declared-prerequisites');
    }
    const api = { refuseIncident: null, refusals: 0, writes: [], samples: [] };
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (this === localStorage && name === key) {
        let parsed;
        try { parsed = JSON.parse(value); } catch { /* Passive observation; real validation is in the campaign writer. */ }
        if (api.refuseIncident && parsed?.clanShipIncidents?.completedIncidents?.some(item => item.incidentId === api.refuseIncident)) {
          api.refusals += 1;
          throw new DOMException('QA: incident receipt cannot be stored', 'QuotaExceededError');
        }
        if (parsed?.clanShipIncidents) api.writes.push({ revision: parsed.clanShipIncidents.revision, active: parsed.clanShipIncidents.activeIncident,
          completed: parsed.clanShipIncidents.completedIncidents.map(item => item.incidentId), marks: parsed.profile.clanMarks });
      }
      return original.call(this, name, value);
    };
    let previous = '';
    const observe = () => {
      const scene = document.querySelector('[data-clan-interior]'), escort = document.querySelector('[data-clan-incident-escort]');
      if (scene) {
        const sample = { room: scene.getAttribute('data-interior-room'), x: Number(scene.getAttribute('data-interior-actor-x')),
          y: Number(scene.getAttribute('data-interior-actor-y')), moving: scene.getAttribute('data-interior-moving') === 'true',
          escort: escort ? { room: escort.getAttribute('data-escort-room'), x: Number(escort.getAttribute('data-escort-x')),
            y: Number(escort.getAttribute('data-escort-y')), moving: escort.getAttribute('data-escort-moving') === 'true',
            follows: escort.getAttribute('data-escort-follows') === 'true', checkpoint: escort.getAttribute('data-escort-checkpoint') } : null };
        const signature = JSON.stringify(sample);
        if (signature !== previous) { api.samples.push({ ...sample, t: performance.now() }); previous = signature; }
      } else previous = '';
      requestAnimationFrame(observe);
    };
    window.__clanIncidentsQa = api;
    requestAnimationFrame(observe);
  }, { key: SAVE_STORAGE_KEY, save: seed });
  page = await context.newPage();
  page.setDefaultTimeout(30_000);
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('request', request => { const url = new URL(request.url()); if (url.pathname.startsWith('/game/')) requested.add('public' + url.pathname); });
  page.on('response', response => {
    const pathname = new URL(response.url()).pathname;
    if (pathname.startsWith('/game/') && (response.status() >= 400 || response.request().resourceType() === 'image' && response.headers()['content-type']?.includes('text/html'))) missing.add(pathname);
  });
  const stored = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_STORAGE_KEY);
  const scene = () => page.locator('[data-clan-interior]');
  const panel = () => page.locator('[data-clan-incident-panel]');
  const operationsPanel = () => page.locator('[data-clan-operations]');
  const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const actor = () => scene().evaluate(element => ({ room: element.getAttribute('data-interior-room'),
    x: Number(element.getAttribute('data-interior-actor-x')), y: Number(element.getAttribute('data-interior-actor-y')) }));
  const companion = () => page.locator('[data-clan-incident-escort]').evaluate(element => ({ room: element.getAttribute('data-escort-room'),
    x: Number(element.getAttribute('data-escort-x')), y: Number(element.getAttribute('data-escort-y')) }));
  const samePosition = (a, b, message) => { assert.equal(a.room, b.room, message); assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < .1, message); };
  const closePanels = async () => {
    if (await panel().count()) { await page.locator('[data-clan-incident-close]').click(); await panel().waitFor({ state: 'hidden' }); }
    if (await operationsPanel().count()) { await page.locator('[data-clan-operations-close]').click(); await operationsPanel().waitFor({ state: 'hidden' }); }
    await frames();
  };
  const collectWalking = async () => {
    const samples = await page.evaluate(() => window.__clanIncidentsQa.samples.splice(0));
    const walkable = point => [0, -.02, .02].some(dx => [0, -.02, .02].some(dy => domain.isClanShipInteriorWalkable(point.room, { x: point.x + dx, y: point.y + dy })));
    for (const sample of samples) {
      assert.ok(walkable(sample), `Actor crossed solid geometry: ${JSON.stringify(sample)}`);
      if (!report.walking.rooms.includes(sample.room)) report.walking.rooms.push(sample.room);
      if (sample.escort) { assert.ok(walkable(sample.escort), `Companion crossed solid geometry: ${JSON.stringify(sample)}`); report.walking.escortSamples++; }
      if (previousSample) {
        const seconds = Math.max(0, sample.t - previousSample.t) / 1000;
        if (sample.room === previousSample.room) {
          assert.ok(Math.hypot(sample.x - previousSample.x, sample.y - previousSample.y) <= 300 * seconds + 30, 'Actor moved continuously inside one room');
          if (sample.escort && previousSample.escort && sample.escort.room === previousSample.escort.room) {
            assert.ok(Math.hypot(sample.escort.x - previousSample.escort.x, sample.escort.y - previousSample.escort.y) <= 240 * seconds + 30,
              `Companion teleported away from a door or reload: ${JSON.stringify({ previous: previousSample, sample })}`);
          }
        } else {
          const gap = Math.abs(roomRing.indexOf(sample.room) - roomRing.indexOf(previousSample.room));
          assert.ok(gap === 1 || gap === roomRing.length - 1, 'A room transition must follow an adjacent door');
          report.walking.transitions.push({ from: previousSample.room, to: sample.room, companion: !!sample.escort });
        }
      }
      previousSample = sample;
    }
    report.walking.samples += samples.length;
  };
  const check = async (name, run) => {
    const started = Date.now();
    try {
      await run(); await collectWalking();
      assert.equal(domain.parseSaveImport(JSON.stringify(await stored())).failure, null, 'Actual durable campaign remains importable');
      report.checks.push({ name, passed: true, durationMs: Date.now() - started }); console.log('PASS', name);
    } catch (error) { report.checks.push({ name, passed: false, durationMs: Date.now() - started, message: error.message }); throw error; }
  };
  const continueCampaign = async () => {
    await page.locator('[data-campaign-menu]').waitFor();
    if (await page.locator('[data-menu-section="campaign"]').isVisible()) await page.locator('[data-menu-section="campaign"]').click();
    await page.locator('[data-menu-action="continue"]').click();
    await page.locator('[data-campaign-location="clan-ship"]').waitFor({ timeout: 90_000 }); await scene().waitFor();
  };
  const reload = async () => {
    await collectWalking(); previousSample = null;
    await page.reload({ waitUntil: 'networkidle' }); await continueCampaign(); await frames();
  };
  const waitRoom = room => page.waitForFunction(room => {
    const node = document.querySelector('[data-clan-interior]');
    return node?.getAttribute('data-interior-room') === room && node.getAttribute('data-interior-moving') === 'false' && !node.getAttribute('data-interior-target-room');
  }, room, { timeout: 60_000 });
  const visit = async room => {
    await closePanels();
    await page.locator(`[data-clan-ship-room-target="${room}"]`).click(); await waitRoom(room); await frames();
  };
  const openOperations = async tab => {
    if (!await operationsPanel().count()) {
      await closePanels(); const button = page.locator('[data-interior-operations]');
      if (await button.getAttribute('data-interior-operations-ready') !== 'true') {
        await button.click();
        await page.waitForFunction(() => document.querySelector('[data-interior-operations]')?.getAttribute('data-interior-operations-ready') === 'true');
      }
      await button.click(); await operationsPanel().waitFor();
    }
    await page.locator(`[data-clan-operations-tab="${tab}"]`).click();
  };
  const durableClick = async (selector, module = 'clanShipIncidents', touch = false) => {
    const before = await stored(), revision = before[module]?.revision ?? 0;
    const control = page.locator(selector); assert.equal(await control.isEnabled(), true, selector);
    if (touch) await control.tap(); else await control.click();
    await page.waitForFunction(({ key, module, revision }) => JSON.parse(localStorage.getItem(key))?.[module]?.revision === revision + 1,
      { key: SAVE_STORAGE_KEY, module, revision });
    await frames(); return stored();
  };
  const startIncident = async id => {
    await visit('conseil'); await openOperations('incidents');
    await page.locator(`[data-clan-incident-card="${id}"]`).click();
    const after = await durableClick(`[data-clan-start-incident="${id}"]`);
    assert.equal(after.clanShipIncidents.activeIncident.incidentId, id);
    await page.locator('[data-clan-incident-route]').click();
    const target = domain.clanShipIncidentTarget(domain.getClanShipIncidentStep(after.clanShipIncidents).targetId);
    await waitRoom(target.roomId);
  };
  const openCurrentObject = async (touch = false) => {
    await closePanels();
    const current = await stored(), step = domain.getClanShipIncidentStep(current.clanShipIncidents), target = domain.clanShipIncidentTarget(step.targetId);
    if ((await actor()).room !== target.roomId) {
      await page.locator(`[data-clan-incident-next-route="${target.roomId}"]`).click(); await waitRoom(target.roomId);
    }
    const object = page.locator(`[data-clan-incident-target="${target.id}"]`);
    if (touch) await object.tap(); else await object.click();
    await panel().waitFor({ timeout: 60_000 });
    assert.equal(await panel().getAttribute('data-clan-incident-panel-target'), target.id);
    const physical = await actor(); assert.ok(Math.hypot(physical.x - target.position.x, physical.y - target.position.y) <= 64.1);
    if (step.kind === 'escort-checkpoint') {
      const follower = await companion(); assert.equal(follower.room, target.roomId);
      assert.ok(Math.hypot(follower.x - target.position.x, follower.y - target.position.y) <= 64.1, 'The modal opens only after the real companion reaches the checkpoint');
    }
    return step;
  };
  const completeStep = async (choiceId = null, touch = false) => {
    const step = await openCurrentObject(touch), before = await stored();
    const selector = step.kind === 'choice' ? `[data-clan-incident-choice="${choiceId ?? step.correctChoiceId}"]` : `[data-clan-incident-interact="${step.id}"]`;
    const after = await durableClick(selector, 'clanShipIncidents', touch);
    report.commands.push({ incidentId: before.clanShipIncidents.activeIncident.incidentId, stepId: step.id, kind: step.kind,
      choiceId: choiceId ?? step.correctChoiceId ?? null, touch, revision: after.clanShipIncidents.revision, marks: after.profile.clanMarks });
    return after;
  };
  const wrongChoice = async choiceId => {
    const before = await stored(), after = await completeStep(choiceId);
    assert.equal(after.clanShipIncidents.activeIncident.stepIndex, before.clanShipIncidents.activeIncident.stepIndex);
    assert.deepEqual(after.clanShipIncidents.activeIncident.choices, before.clanShipIncidents.activeIncident.choices);
    assert.equal(after.profile.clanMarks, before.profile.clanMarks);
    await page.locator('[data-clan-incident-rejection]').waitFor();
  };
  const screenshot = async filename => {
    await page.waitForLoadState('networkidle');
    const images = await page.locator('[data-clan-ship-status] img').evaluateAll(async elements => Promise.all(elements.map(async image => {
      try { await image.decode(); } catch { /* Preserve failure in the observed result. */ }
      return { src: image.getAttribute('src'), width: image.naturalWidth, complete: image.complete };
    })));
    assert.ok(images.length && images.every(image => image.complete && image.width > 0), JSON.stringify(images));
    assert.equal(await page.locator('[data-art-unavailable="true"]').count(), 0);
    await frames(); await page.screenshot({ path: path.join(out, filename), fullPage: true });
    report.screenshots.push({ filename, viewport: page.viewportSize(), images });
  };
  const noOverflow = async () => {
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, pageWidth: document.documentElement.scrollWidth,
      nodes: ['[data-clan-incident-panel]', '[data-clan-operations]', '[data-clan-ship-status]'].flatMap(selector =>
        Array.from(document.querySelectorAll(selector), node => ({ selector, width: node.clientWidth, scroll: node.scrollWidth }))) }));
    assert.ok(dimensions.pageWidth <= dimensions.viewport + 2, JSON.stringify(dimensions));
    assert.ok(dimensions.nodes.every(node => node.scroll <= node.width + 2), JSON.stringify(dimensions));
  };
  const conversation = async npcId => {
    const npc = CLAN_SHIP_RECRUITS.find(item => item.id === npcId);
    await visit(npc.roomId); await openOperations('crew');
    const current = await stored(), dialogue = page.locator(`[data-clan-crew-dialogue="${npcId}"]`);
    await dialogue.waitFor();
    await dialogue.locator('[data-clan-dialogue-topic="board"]').click();
    assert.equal(await dialogue.getAttribute('data-clan-dialogue-line'), domain.selectClanShipCrewDialogue(npcId, current.clanShipIncidents).id);
    await dialogue.locator('[data-clan-dialogue-topic="commitment"]').click();
    assert.equal(await dialogue.getAttribute('data-clan-dialogue-line'), `${npcId}-commitment`);
    await dialogue.locator('[data-clan-dialogue-topic="board"]').click();
    assert.deepEqual((await stored()).clanShipIncidents, current.clanShipIncidents);
    assert.deepEqual((await stored()).clanShipOperations, current.clanShipOperations);
    assert.equal((await stored()).profile.clanMarks, current.profile.clanMarks);
  };

  await check('The disclosed prerequisites load normally and all four untouched incidents are available at the table', async () => {
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle', timeout: 120_000 }); await continueCampaign();
    await openOperations('incidents');
    assert.equal(await page.locator('[data-clan-incident-card]').count(), 4);
    for (const definition of CLAN_SHIP_INCIDENTS) {
      await page.locator(`[data-clan-incident-card="${definition.id}"]`).click();
      assert.equal(await page.locator(`[data-clan-start-incident="${definition.id}"]`).isEnabled(), true);
    }
    assert.equal((await stored()).clanShipIncidents, undefined); await screenshot('01-four-available-incidents.png');
  });
  await check('Seal evidence is collected at physical cargo and archive objects; the modal traps focus and Escape restores walking', async () => {
    await startIncident('seal-discrepancy'); await openCurrentObject();
    const before = await actor();
    await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => !!document.activeElement?.closest('[data-clan-incident-panel]')), true);
    await page.keyboard.down('d'); await page.waitForTimeout(200); samePosition(await actor(), before, 'An object dialog suspends walking');
    await page.keyboard.up('d'); await page.keyboard.press('Escape'); await panel().waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.activeElement?.hasAttribute('data-interior-world'));
    await completeStep(); await completeStep();
    assert.equal((await stored()).clanShipIncidents.activeIncident.stepIndex, 2);
  });
  await check('A wrong isolator keeps both clues and currency; reload retains the diagnostic before correction', async () => {
    await wrongChoice('downstream'); const current = await stored();
    await screenshot('02-seal-diagnostic-rejected.png'); await reload();
    assert.deepEqual((await stored()).clanShipIncidents, current.clanShipIncidents);
    await completeStep('upstream'); await completeStep();
  });
  await check('A quota failure at the final cargo inspection preserves the step and balance; retry pays exactly once', async () => {
    await openCurrentObject(); const before = await stored();
    await page.evaluate(() => { window.__clanIncidentsQa.refuseIncident = 'seal-discrepancy'; });
    await page.locator('[data-clan-incident-interact="seal-closure"]').click();
    await page.waitForFunction(() => window.__clanIncidentsQa.refusals > 0); await frames();
    assert.deepEqual((await stored()).clanShipIncidents, before.clanShipIncidents); assert.equal((await stored()).profile.clanMarks, before.profile.clanMarks);
    await screenshot('03-quota-retains-seal-closure.png');
    await page.evaluate(() => { window.__clanIncidentsQa.refuseIncident = null; });
    const after = await durableClick('[data-clan-incident-interact="seal-closure"]');
    assert.equal(after.profile.clanMarks, before.profile.clanMarks + 8);
    assert.equal(after.clanShipIncidents.completedIncidents.filter(item => item.incidentId === 'seal-discrepancy').length, 1);
    await reload(); assert.equal((await stored()).profile.clanMarks, before.profile.clanMarks + 8);
  });
  await check('The warden acknowledges the resolved seal without modifying any progression', async () => { await conversation('threshold-guard'); });
  await check('The relay compares readable cycles before branch choice and keeps its single component after a failed permutation', async () => {
    await startIncident('relay-flicker'); await completeStep(); await completeStep(); await wrongChoice('branch-a');
    await completeStep('branch-b'); await completeStep(); await wrongChoice('circle-marks');
    const before = await stored(); await screenshot('04-relay-contact-diagnostic.png'); await reload();
    assert.deepEqual((await stored()).clanShipIncidents, before.clanShipIncidents);
    await completeStep('marks-circle'); const final = await completeStep();
    assert.equal(final.profile.clanMarks, seed.profile.clanMarks + 18);
  });
  await check('The armorer reacts to the actual restored relay and both conversation topics remain read-only', async () => { await conversation('iron-claw'); });
  await check('Trophy provenance reads both records and the veteran, rejects an unsupported attribution and preserves existing trophies', async () => {
    await startIncident('trophy-provenance'); for (let index = 0; index < 4; index++) await completeStep();
    await wrongChoice('replace-hunter');
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 }); await frames(); await noOverflow();
      await screenshot(`05-provenance-supported-evidence-${width}.png`);
    }
    await completeStep('distinct-roles', true); const final = await completeStep(null, true);
    await noOverflow(); await page.setViewportSize({ width: 1440, height: 1000 }); await frames();
    assert.equal(final.profile.clanMarks, seed.profile.clanMarks + 28); assert.deepEqual(final.trophies, seed.trophies);
  });
  await check('The tracker responds to the newly recorded provenance at the archive post', async () => { await conversation('cold-trace'); });
  await check('Return preparation and a transfer-point decision precede the visible companion pickup', async () => {
    await startIncident('return-transfer'); await completeStep(); await wrongChoice('freight-lane');
    await completeStep('near-medical'); await completeStep(); await closePanels();
    await page.locator('[data-clan-incident-escort][data-escort-follows="true"]').waitFor();
    assert.equal((await stored()).clanShipIncidents.activeIncident.stepIndex, 3);
    await screenshot('06-return-companion-picked-up.png');
  });
  await check('Settings freeze the real hunter and companion, and closing the dialog does not revive a held direction', async () => {
    await page.locator('[data-interior-world]').focus(); await page.keyboard.down('d'); await page.waitForTimeout(180);
    await page.locator('[data-clan-ship-status]').getByRole('button', { name: 'Ouvrir les paramètres', exact: true }).click();
    const settings = page.getByRole('dialog', { name: 'Réglages du biomask' }); await settings.waitFor(); await frames();
    const hunter = await actor(), follower = await companion(), before = await stored();
    await page.waitForTimeout(300); samePosition(await actor(), hunter, 'Settings freeze the hunter'); samePosition(await companion(), follower, 'Settings freeze the companion');
    await settings.getByRole('button', { name: 'Fermer', exact: true }).click(); await settings.waitFor({ state: 'hidden' });
    await page.waitForTimeout(250); samePosition(await actor(), hunter, 'Held movement is cleared on settings close');
    await page.keyboard.up('d'); assert.deepEqual((await stored()).clanShipIncidents, before.clanShipIncidents);
  });
  await check('A real second browser tab suspends both actors; focus restoration requires a fresh movement input', async () => {
    const session = await context.newCDPSession(page);
    await session.send('Emulation.setFocusEmulationEnabled', { enabled: false }); await page.bringToFront();
    await page.waitForFunction(() => !document.hidden && document.hasFocus(), null, { polling: 50 });
    await page.locator('[data-interior-world]').focus(); await page.keyboard.down('d'); await page.waitForTimeout(150);
    const other = await context.newPage(); await other.bringToFront();
    await page.waitForFunction(() => document.hidden || !document.hasFocus(), null, { polling: 50, timeout: 10_000 });
    report.focusTransitions.push(await page.evaluate(() => ({ phase: 'background', hidden: document.hidden, focused: document.hasFocus() })));
    await page.waitForTimeout(250); const hunter = await actor(), follower = await companion();
    await page.waitForTimeout(250); samePosition(await actor(), hunter, 'Background hunter frozen'); samePosition(await companion(), follower, 'Background companion frozen');
    await other.close(); await page.bringToFront();
    await page.waitForFunction(() => !document.hidden && document.hasFocus(), null, { polling: 50 });
    report.focusTransitions.push(await page.evaluate(() => ({ phase: 'restored', hidden: document.hidden, focused: document.hasFocus() })));
    await page.waitForTimeout(200); samePosition(await actor(), hunter, 'No stale held movement on focus restoration');
    await page.keyboard.up('d'); await session.detach();
  });
  await check('The companion walks to the real hangar door; a reload retains that safe checkpoint', async () => {
    await completeStep(); const current = await stored();
    assert.equal(current.clanShipIncidents.activeIncident.stepIndex, 4);
    await screenshot('07-return-hangar-door-confirmed.png'); await reload();
    assert.deepEqual((await stored()).clanShipIncidents, current.clanShipIncidents);
    // Approach the already-confirmed threshold after a coarse room reload,
    // then close its evidence panel before requesting the actual door route.
    await page.locator('[data-clan-incident-target="return-hangar-door"]').click(); await panel().waitFor({ timeout: 60_000 });
    await closePanels();
    await page.waitForFunction(() => {
      const follower = document.querySelector('[data-clan-incident-escort]');
      return follower && Math.hypot(Number(follower.getAttribute('data-escort-x')) - 128, Number(follower.getAttribute('data-escort-y')) - 635) <= 64;
    });
  });
  await check('Both actors cross the paired door, reach the prepared medical station and only then report at council', async () => {
    await page.setViewportSize({ width: 390, height: 844 }); await frames();
    await completeStep(null, true); assert.equal((await stored()).clanShipIncidents.activeIncident.stepIndex, 5);
    await noOverflow(); await screenshot('08-return-medical-entry-touch-390.png');
    await completeStep(null, true); const arrived = await stored();
    assert.equal(arrived.profile.clanMarks, seed.profile.clanMarks + 28);
    assert.equal(domain.getClanShipIncidentEscort(arrived.clanShipIncidents).arrived, true);
    await screenshot('08-return-physical-arrival.png');
    await page.setViewportSize({ width: 1440, height: 1000 }); await frames();
    const final = await completeStep(); assert.equal(final.profile.clanMarks, seed.profile.clanMarks + 40);
    assert.equal(final.clanShipIncidents.completedIncidents.length, 4);
  });
  await check('All six recruited members have contextual conversations at their actual posts without extra rewards', async () => {
    for (const npc of CLAN_SHIP_RECRUITS) await conversation(npc.id);
    assert.equal((await stored()).profile.clanMarks, seed.profile.clanMarks + 40);
  });
  await check('The four receipts and exactly forty incident marks survive save, menu and Continue with historical trophies unchanged', async () => {
    await closePanels(); const before = await stored();
    await page.locator('[data-clan-ship-status]').getByRole('button', { name: 'Ouvrir les paramètres', exact: true }).click();
    await page.getByRole('button', { name: 'Sauvegarder et revenir au menu principal', exact: true }).click();
    await collectWalking(); previousSample = null; await continueCampaign();
    assert.deepEqual((await stored()).clanShipIncidents, before.clanShipIncidents);
    assert.deepEqual((await stored()).clanShipOperations, seed.clanShipOperations);
    assert.deepEqual((await stored()).trophies, seed.trophies);
    await visit('conseil'); await openOperations('incidents');
    for (const id of domain.CLAN_SHIP_INCIDENT_IDS) {
      await page.locator(`[data-clan-incident-card="${id}"]`).click();
      assert.equal(await page.locator(`[data-clan-start-incident="${id}"]`).isDisabled(), true);
    }
    await screenshot('09-four-incidents-complete.png');
  });
  await check('At 390 and 320 pixels the completed dossier and crew topics remain accessible without overflow', async () => {
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 }); await frames(); await openOperations('incidents'); await noOverflow();
      await screenshot(`10-completed-dossiers-${width}.png`);
      await openOperations('crew'); await noOverflow();
      const navigator = page.locator('[data-clan-crew-dialogue="star-watch"]');
      await navigator.locator('[data-clan-dialogue-topic="commitment"]').tap(); await noOverflow();
    }
    await page.setViewportSize({ width: 1440, height: 1000 }); await frames();
  });
  await check('The original contract route button walks from hangar back to council during an interception', async () => {
    await visit('conseil'); await openOperations('contracts');
    await page.locator('[data-clan-contract-card="space-interception"]').click();
    await durableClick('[data-clan-accept-contract="space-interception"]', 'clanShipOperations');
    await visit('hangar'); await openOperations('contracts');
    await page.locator('[data-clan-active-contract="space-interception"] [data-clan-operation-route="conseil"]').click(); await waitRoom('conseil');
    await openOperations('contracts');
    assert.equal((await stored()).clanShipOperations.activeContract.contractId, 'space-interception');
  });
  await check('The original recharge order is clicked after analysis and approach, then withdrawal grants no new victory', async () => {
    const baseline = (await stored()).profile.clanMarks;
    for (const type of ['scan', 'manoeuvre', 'recharge', 'withdraw']) {
      const before = await stored(), after = await durableClick(`[data-clan-space-order="${type}"]`, 'clanShipOperations');
      assert.equal(after.clanShipOperations.spaceEncounter.turn, before.clanShipOperations.spaceEncounter.turn + 1);
      if (type === 'recharge') assert.ok(after.clanShipOperations.spaceEncounter.energy > before.clanShipOperations.spaceEncounter.energy, 'The UI recharge changes the actual encounter energy');
      report.commands.push({ kind: 'space-command', type, turn: after.clanShipOperations.spaceEncounter.turn });
    }
    const final = await stored(); assert.equal(final.clanShipOperations.spaceEncounter.status, 'withdrawn');
    assert.equal(final.profile.clanMarks, baseline);
    assert.equal(final.clanShipOperations.completedContracts.some(item => item.contractId === 'space-interception'), false);
    await screenshot('11-legacy-route-and-recharge-confirmed.png');
  });
  await check('All actual scene assets decode and the observed actors follow walkable paths without browser errors', async () => {
    await page.waitForLoadState('networkidle'); await collectWalking();
    assert.deepEqual(report.errors, []); assert.deepEqual([...missing], []);
    assert.equal(report.walking.rooms.length, 7); assert.ok(report.walking.samples > 150); assert.ok(report.walking.escortSamples > 30);
  });
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = error.stack || String(error); process.exitCode = 1;
  if (page) {
    report.lastScene = await page.evaluate(key => ({ save: JSON.parse(localStorage.getItem(key) || 'null'),
      scene: document.querySelector('[data-clan-interior]')?.dataset, escort: document.querySelector('[data-clan-incident-escort]')?.dataset,
      panel: document.querySelector('[data-clan-incident-panel]')?.dataset, focused: document.activeElement?.outerHTML?.slice(0, 500),
      hidden: document.hidden, documentFocused: document.hasFocus(), recentSamples: window.__clanIncidentsQa?.samples.slice(-20), recentWrites: window.__clanIncidentsQa?.writes.slice(-8) }), SAVE_STORAGE_KEY).catch(() => null);
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
    await fs.writeFile(path.join(out, 'failure-page.txt'), await page.locator('body').innerText().catch(() => 'Unavailable'));
  }
  console.error(error);
} finally {
  report.finishedAt = new Date().toISOString(); report.missingAssets = [...missing].sort(); report.requestedAssets = [...requested].sort();
  for (const filename of report.requestedAssets) {
    try { const content = await fs.readFile(path.join(root, filename)); report.assetHashes.push({ filename, bytes: content.length, sha256: createHash('sha256').update(content).digest('hex') }); }
    catch { report.assetHashes.push({ filename, missing: true }); }
  }
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  if (browser) await browser.close(); if (server) await server.close();
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, output: out, missingAssets: missing.size }));
}
