import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

// Native GameClient, campaign persistence and physical ClanShipInterior.
// Only initial disclosed saves, an existing navigator gamepad emulator and
// read-only DOM/storage observations are injected. No gameplay callback,
// actor, clock, result or campaign state is patched after the initial seed.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, process.env.CLAN_DIALOGUE_QA_OUTPUT || 'outputs/qa-clan-ship-crew-dialogue-20261109');
const externalUrl = process.env.CLAN_DIALOGUE_QA_URL;
const port = Number(process.env.CLAN_DIALOGUE_QA_PORT || 4191);
const headed = process.env.CLAN_DIALOGUE_HEADED === '1';
const sha = value => createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
await fs.mkdir(out, { recursive: true });
// An existing proof is never silently overwritten. Use a new output directory.
await fs.writeFile(path.join(out, 'recipe-run.lock'), new Date().toISOString() + '\n', { flag: 'wx' });
const bundle = await build({ stdin: { contents: [
  "export {defaultSave,SAVE_STORAGE_KEY,applyMissionResult,parseSaveImport} from './app/game/save.ts';",
  "export {MISSION_BY_ID} from './app/game/data.ts';",
  "export * from './app/game/systems/clanShipDocking.ts';",
  "export * from './app/game/systems/clanShipOperations.ts';",
  "export * from './app/game/systems/companionResidence.ts';",
  "export {isClanShipInteriorWalkable} from './app/game/systems/clanShipInterior.ts';",
].join('\n'), resolveDir: root }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const domain = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const { SAVE_STORAGE_KEY, CLAN_SHIP_RECRUITS, CLAN_SHIP_CONTRACTS, CLAN_SHIP_ONBOARDING_STEPS } = domain;
const roomRing = ['hangar', 'armurerie', 'entrainement', 'conseil', 'archives', 'trophees', 'soins'];
const crewRoute = [...CLAN_SHIP_RECRUITS].sort((a, b) => roomRing.indexOf(a.roomId) - roomRing.indexOf(b.roomId));
const contract = id => { const value = CLAN_SHIP_CONTRACTS.find(item => item.id === id); assert.ok(value, id); return value; };
function fixtureRoom(save, roomId) {
  if (save.clanShipDocking.roomId === roomId) return save;
  const moved = domain.actClanShipDocking(save.clanShipDocking, { type: 'move-room', roomId },
    { ownerCreatedAt: save.createdAt, personalShipId: save.clanShipDocking.personalShipId });
  assert.ok(moved.accepted, `Initial fixture room: ${roomId}`);
  return { ...save, clanShipDocking: moved.state };
}
function fixtureAction(save, type, values = {}, roomId = 'conseil') {
  save = fixtureRoom(save, roomId);
  const state = save.clanShipOperations ?? domain.createClanShipOperations(save.createdAt);
  const result = domain.actClanShipOperations(state, { type, expectedRevision: state.revision, ...values },
    { ownerCreatedAt: save.createdAt, docking: save.clanShipDocking, campaign: save });
  assert.ok(result.accepted && result.changed, `Initial fixture ${type}: ${result.message}`);
  return { ...save, clanShipOperations: result.state, profile: { ...save.profile, clanMarks: save.profile.clanMarks + result.clanMarksReward } };
}
function fixtureMissing() {
  const owner = '2026-11-09T09:00:00.000Z';
  let save = domain.defaultSave(owner);
  save.profile.hunterName = 'QA B05 · profils initiaux déclarés';
  save.settings.masterVolume = 0;
  let docking = domain.createClanShipDockingState(owner, 'classic-predator-spaceship');
  for (const type of ['approach', 'dock', 'board']) {
    const result = domain.actClanShipDocking(docking, { type }, { ownerCreatedAt: owner, personalShipId: 'classic-predator-spaceship' });
    assert.ok(result.accepted); docking = result.state;
  }
  save.clanShipDocking = docking;
  for (const step of CLAN_SHIP_ONBOARDING_STEPS) save = fixtureAction(save, 'onboard-step', { stepId: step.id }, step.roomId);
  return fixtureAction(save, 'accept-mandate');
}
function fixtureProofs() {
  let save = fixtureMissing();
  for (const id of ['ship-seal-check', 'ship-armory-audit', 'ship-triage-route', 'ship-training-circuit']) {
    save = fixtureAction(save, 'accept-contract', { contractId: id });
    for (const step of contract(id).steps) save = fixtureAction(save, 'interior-step', { stepId: step.id }, step.roomId);
  }
  // These jungle/ice results are synthetic INITIAL fixture data. Browser work
  // below proves conversation behavior and never claims to have played hunts.
  for (const id of ['field-jungle-survey', 'field-ice-route']) {
    const definition = contract(id), mission = domain.MISSION_BY_ID[definition.missionId];
    save = fixtureAction(save, 'accept-contract', { contractId: id });
    const bound = domain.bindClanShipMission(save.clanShipOperations, { ownerCreatedAt: save.createdAt,
      missionId: mission.id, encounterRun: save.missionProgress[mission.id].attempts, expectedRevision: save.clanShipOperations.revision });
    assert.ok(bound.accepted); save = { ...save, clanShipOperations: bound.state };
    const result = { missionId: mission.id, difficultyId: 'hunter', outcome: 'success', score: 80, scans: 3, elapsedSeconds: 240,
      completedObjectiveIds: mission.objectives.filter(item => item.required || item.kind === 'extract').map(item => item.id),
      honorEvents: [], trophyQuality: 'elite', trophyClaims: [{ id: `${mission.id}-disclosed-b05-fixture`, definitionId: mission.trophy.id,
        targetName: mission.targetName, targetKind: mission.targetKind, partId: mission.trophy.partId, condition: 'pristine', quality: 'elite' }],
      kills: 3, secondWindUsed: false, completedAt: '2026-11-09T09:15:00.000Z' };
    const progressed = domain.applyMissionResult(save, result);
    const settlement = domain.settleClanShipMission(save.clanShipOperations, save, progressed, result,
      { ownerSaveCreatedAt: save.createdAt, missionId: mission.id, encounterRun: save.missionProgress[mission.id].attempts });
    assert.ok(settlement.accepted && settlement.changed, settlement.message);
    save = { ...progressed, clanShipOperations: settlement.state,
      profile: { ...progressed.profile, clanMarks: progressed.profile.clanMarks + settlement.clanMarksReward } };
  }
  return fixtureRoom(save, 'hangar');
}
function fixtureCrew() {
  let save = fixtureProofs();
  for (const npc of CLAN_SHIP_RECRUITS) save = fixtureAction(save, 'recruit', { npcId: npc.id }, npc.roomId);
  return fixtureRoom(save, 'hangar');
}
function fixtureReturn() {
  let save = fixtureAction(fixtureCrew(), 'accept-contract', { contractId: 'space-screening' });
  for (const type of ['scan', 'manoeuvre', 'brace', 'brace', 'extract']) save = fixtureAction(save, 'space-command',
    { command: { type, expectedTurn: save.clanShipOperations.spaceEncounter.turn } });
  assert.equal(save.clanShipOperations.spaceEncounter.status, 'victory');
  return fixtureRoom(save, 'hangar');
}
function fixtureManaged() {
  let save = fixtureRoom(fixtureCrew(), 'hangar');
  const host = { kind: 'clan', shipId: 'avp-predator-mothership' };
  for (const npc of CLAN_SHIP_RECRUITS) for (const type of ['plan-refit', 'fund-refit', 'complete-refit']) {
    const result = domain.actCompanionResidence({ type, id: npc.id, ...(type === 'plan-refit' ? { host } : {}),
      expectedRevision: save.companionResidence?.revision ?? 0, ownerCreatedAt: save.createdAt }, {
      save, selectedShipId: 'classic-predator-spaceship', ownedShipIds: ['classic-predator-spaceship'], active: true, site: 'clan',
      observation: { site: 'clan', roomId: 'hangar', x: 820, y: 650 },
    });
    assert.ok(result.accepted && result.changed, `Initial managed ${type}: ${result.message}`);
    save = { ...save, companionResidence: result.state, profile: { ...save.profile, clanMarks: result.clanMarks } };
  }
  assert.equal(domain.companionResidencePresence(save, host).filter(entry => entry.avatarVisible && entry.serviceAvailable).length, 6);
  return save;
}
function fixtureUnavailable() {
  let save = fixtureCrew();
  // Valid initial residence ledger: reserve absent, suspended former post,
  // and transferred personal-ship resident. Clan members cannot field-deploy.
  save.companionResidence = { ...domain.createCompanionResidence(save.createdAt), revision: 1,
    members: [
      { id: 'threshold-guard', assignment: null, installation: null, refit: null, relation: 'active', legacyClanPost: false, deployment: null },
      { id: 'iron-claw', assignment: null, installation: null, refit: null, relation: 'suspended', legacyClanPost: true, deployment: null },
      { id: 'star-watch', assignment: { kind: 'personal', shipId: 'classic-predator-spaceship' }, installation: {
        host: { kind: 'personal', shipId: 'classic-predator-spaceship' }, module: 'hunterAlcove', berth: 0, completedRevision: 1 },
        refit: null, relation: 'active', legacyClanPost: false, deployment: null },
    ] };
  assert.equal(domain.inspectCompanionResidence(save.companionResidence, save.createdAt).status, 'valid');
  assert.equal(domain.evaluateCompanionResidenceCampaign(save.companionResidence, save).allowed, true);
  return save;
}
const disclosure = 'All initial campaign progression is synthetic and disclosed: production reducers prepare onboarding, mandated access, internal proofs, jungle/ice result receipts, legacy recruits and (where named) escort victory/circle. No field hunt or seeded spatial victory is claimed as browser-played. No campaign mutation follows initial seeding except native user actions.';
const fixtures = [
  { id: 'missing-proof', save: fixtureRoom(fixtureMissing(), 'hangar') },
  { id: 'recent-proof', save: fixtureProofs() },
  { id: 'agreement', save: fixtureCrew() },
  { id: 'operation-return', save: fixtureReturn() },
  { id: 'circle-confirmed', save: fixtureRoom(fixtureAction(fixtureReturn(), 'confirm-circle'), 'hangar') },
  { id: 'unavailable', save: fixtureUnavailable() },
  { id: 'active-spatial', save: fixtureRoom(fixtureAction(fixtureCrew(), 'accept-contract', { contractId: 'space-screening' }), 'hangar') },
  { id: 'managed-aboard', save: fixtureManaged() },
];
const fixtureDisclosures = [];
for (const fixture of fixtures) {
  const serialized = JSON.stringify(fixture.save, null, 2) + '\n';
  const imported = domain.parseSaveImport(serialized);
  assert.equal(imported.failure, null, `${fixture.id}: actual save import`);
  assert.ok(imported.save);
  for (const key of ['clanShipOperations', 'clanShipDocking', 'companionResidence']) assert.deepEqual(imported.save[key], fixture.save[key], `${fixture.id}: ${key}`);
  const filename = `initial-${fixture.id}.json`;
  await fs.writeFile(path.join(out, filename), serialized);
  fixtureDisclosures.push({ id: fixture.id, filename, sha256: sha(serialized), ownerCreatedAt: fixture.save.createdAt, disclosure,
    prepared: { onboardingStep: fixture.save.clanShipOperations.onboardingStep, mandateAccepted: fixture.save.clanShipOperations.mandateAccepted,
      completedContractIds: fixture.save.clanShipOperations.completedContracts.map(item => item.contractId),
      syntheticFieldContractIds: fixture.save.clanShipOperations.completedContracts.filter(item => item.proof.kind === 'field').map(item => item.contractId),
      recruitedNpcIds: fixture.save.clanShipOperations.recruitedNpcIds, circleConfirmed: fixture.save.clanShipOperations.circleConfirmed,
      spatialStatus: fixture.save.clanShipOperations.spaceEncounter?.status ?? null, clanMarks: fixture.save.profile.clanMarks,
      residence: fixture.save.companionResidence?.members.map(member => ({ id: member.id, assignment: member.assignment,
        relation: member.relation, legacyClanPost: member.legacyClanPost, berth: member.installation?.berth ?? null })) ?? [] } });
}
await fs.writeFile(path.join(out, 'fixture-disclosure.json'), JSON.stringify(fixtureDisclosures, null, 2) + '\n');
if (process.argv.includes('--fixtures-only')) {
  console.log(JSON.stringify({ fixtureValidationOnly: true, browserExecuted: false, fixtures: fixtureDisclosures }, null, 2));
  process.exit(0);
}
async function filesBelow(directory) {
  try {
    const entries = await fs.readdir(path.join(root, directory), { withFileTypes: true });
    const nested = await Promise.all(entries.map(entry => entry.isDirectory() ? filesBelow(path.join(directory, entry.name)) : [path.join(directory, entry.name)]));
    return nested.flat();
  } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
async function identity() {
  const sourceNames = [...await filesBelow('app'), ...await filesBelow('desktop'), 'package.json', 'package-lock.json', 'scripts/qa-clan-ship-crew-dialogue-20261109.mjs'].sort();
  const source = await Promise.all(sourceNames.map(async filename => ({ filename, sha256: sha(await fs.readFile(path.join(root, filename))) })));
  const buildNames = (await filesBelow('.next')).filter(filename => /(?:BUILD_ID|manifest\.json|\.js)$/.test(filename) && !filename.includes('/cache/')).sort();
  const productionBuild = await Promise.all(buildNames.map(async filename => ({ filename, sha256: sha(await fs.readFile(path.join(root, filename))) })));
  return { commit: git('rev-parse', 'HEAD'), branch: git('branch', '--show-current'), workingTree: git('status', '--porcelain'), sourceSha256: sha(JSON.stringify(source)),
    productionBuildSha256: sha(JSON.stringify(productionBuild)), source, productionBuild };
}
const report = { startedAt: new Date().toISOString(), recipe: 'scripts/qa-clan-ship-crew-dialogue-20261109.mjs', baseline: '19317af4',
  recipeSha256: sha(await fs.readFile(fileURLToPath(import.meta.url))), browserExecuted: false, passed: false,
  runtime: externalUrl ? 'native application at supplied URL' : 'actual desktop GameClient via Vite', url: externalUrl || `http://127.0.0.1:${port}`,
  fixtures: fixtureDisclosures, checks: [], contexts: [], conversations: [], managedConversations: [], readOnlySaves: [], screenshots: [], focusTransitions: [], servedScripts: [], errors: [], console: [], requestFailures: [], httpErrors: [], missingAssets: [],
  walking: { samples: 0, rooms: [], transitions: [] },
  gamepad: { kind: 'navigator.getGamepads emulator', reusedFrom: 'scripts/qa-clan-ship-browser.mjs', physicalHardware: false, executed: false },
  fieldDeployment: { applicable: false, reason: 'All six clan NPC definitions have fieldReady:false; no supported field deployment exists. Reserve, suspension, transfer and active spatial are exercised.' },
  limits: ['Initial progression is synthetic disclosed fixture data.', 'No canonical art fidelity or human artistic approval is inferred.', 'No physical gamepad is used.'] };
let browser, server, page, currentContext, label;
const requestedAssets = new Set(), missingAssets = new Set();
const scriptProofs = [];
try {
  report.identityBefore = await identity();
  if (!externalUrl) {
    server = await createServer({ configFile: path.join(root, 'desktop/vite.config.ts'), server: { host: '127.0.0.1', port, strictPort: true } });
    await server.listen();
  }
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium', headless: !headed, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  report.browserVersion = browser.version(); report.browserExecuted = true;
  const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const scene = () => page.locator('[data-clan-interior]');
  const panel = () => page.locator('[data-clan-operations]');
  const stored = () => page.evaluate(key => localStorage.getItem(key), SAVE_STORAGE_KEY);
  const actor = () => scene().evaluate(element => ({ room: element.getAttribute('data-interior-room'),
    x: Number(element.getAttribute('data-interior-actor-x')), y: Number(element.getAttribute('data-interior-actor-y')) }));
  const samePosition = (before, after) => { assert.equal(after.room, before.room); assert.ok(Math.hypot(after.x - before.x, after.y - before.y) < .1); };
  async function collectWalking() {
    const samples = await page.evaluate(() => window.__clanDialogueQa.walking.splice(0));
    for (const sample of samples) {
      assert.ok([0, -.02, .02].some(dx => [0, -.02, .02].some(dy => domain.isClanShipInteriorWalkable(sample.room, { x: sample.x + dx, y: sample.y + dy }))), `Solid footprint: ${JSON.stringify(sample)}`);
      if (!report.walking.rooms.includes(sample.room)) report.walking.rooms.push(sample.room);
    }
    report.walking.samples += samples.length; return samples;
  }
  async function check(name, run) {
    const started = Date.now();
    try { await run(); await collectWalking(); report.checks.push({ name, context: label, passed: true, durationMs: Date.now() - started }); console.log('PASS', label, name); }
    catch (error) { report.checks.push({ name, context: label, passed: false, durationMs: Date.now() - started, message: error.message }); throw error; }
  }
  async function screenshot(filename) {
    await page.waitForLoadState('networkidle');
    await page.locator('.toast').waitFor({ state: 'hidden', timeout: 6000 });
    await frames();
    await page.screenshot({ path: path.join(out, filename), fullPage: false });
    report.screenshots.push({ filename, context: label, viewport: page.viewportSize(), inspected: false });
  }
  async function start(fixture, viewport = { width: 1440, height: 1000 }) {
    currentContext = await browser.newContext({ viewport, hasTouch: true, reducedMotion: 'reduce' });
    await currentContext.addInitScript(({ key, save, id }) => {
      if (!['http:', 'https:'].includes(location.protocol)) return;
      if (!localStorage.getItem('__clanDialogueQaSeeded')) { localStorage.setItem(key, JSON.stringify(save)); localStorage.setItem('__clanDialogueQaSeeded', id); }
      // Same explicit synthetic device mechanism as historical Clan Ship QA.
      window.__clanDialogueQaPad = { index: 0, id: 'isolated-clan-dialogue-qa', connected: true, axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
      Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.__clanDialogueQaPad] });
      window.__clanDialogueQa = { walking: [] };
      let previous = '';
      const observe = () => {
        const element = document.querySelector('[data-clan-interior]');
        if (element) {
          const sample = { room: element.getAttribute('data-interior-room'), x: Number(element.getAttribute('data-interior-actor-x')), y: Number(element.getAttribute('data-interior-actor-y')) };
          const signature = JSON.stringify(sample);
          if (signature !== previous) { window.__clanDialogueQa.walking.push(sample); previous = signature; }
        } else previous = '';
        requestAnimationFrame(observe);
      };
      requestAnimationFrame(observe);
    }, { key: SAVE_STORAGE_KEY, save: fixture.save, id: fixture.id });
    page = await currentContext.newPage(); label = fixture.id; page.setDefaultTimeout(25000);
    page.on('pageerror', error => report.errors.push({ context: fixture.id, message: error.message, stack: error.stack }));
    page.on('console', message => { const item = { context: fixture.id, type: message.type(), text: message.text(), location: message.location() }; report.console.push(item); if (message.type() === 'error') report.errors.push(item); });
    page.on('requestfailed', request => report.requestFailures.push({ context: fixture.id, url: request.url(), failure: request.failure() }));
    page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/game/')) requestedAssets.add(new URL(request.url()).pathname); });
    page.on('response', response => {
      const pathname = new URL(response.url()).pathname;
      if (response.status() >= 400) report.httpErrors.push({ context: fixture.id, url: response.url(), status: response.status() });
      if (pathname.startsWith('/game/') && (response.status() >= 400 || response.request().resourceType() === 'image' && response.headers()['content-type']?.includes('text/html'))) missingAssets.add(pathname);
      if (response.request().resourceType() === 'script' && response.status() < 400) scriptProofs.push((async () => {
        const body = await response.body();
        const served = { context: fixture.id, pathname, sha256: sha(body), bytes: body.length };
        if (pathname.startsWith('/_next/static/') && pathname.endsWith('.js')) {
          const filename = '.next/' + pathname.slice('/_next/'.length);
          served.buildFile = filename;
          served.buildFileSha256 = sha(await fs.readFile(path.join(root, filename)));
          served.matchesBuiltFile = served.sha256 === served.buildFileSha256;
        }
        report.servedScripts.push(served);
      })().catch(error => { report.errors.push({ context: fixture.id, stage: 'served-script-proof', url: response.url(), message: error.message }); }));
    });
    report.contexts.push({ id: label, viewport, initialSaveSha256: sha(JSON.stringify(fixture.save)) });
    await page.goto(report.url, { waitUntil: 'networkidle', timeout: 120000 });
    await page.locator('[data-campaign-menu]').waitFor();
    if (await page.locator('[data-menu-section="campaign"]').isVisible()) await page.locator('[data-menu-section="campaign"]').click();
    await page.locator('[data-menu-action="continue"]').click();
    await page.locator('[data-campaign-session]').waitFor({ timeout: 90000 });
    await scene().waitFor(); await page.bringToFront(); await frames();
  }
  async function closePanel(mode = 'click') {
    if (await panel().count()) {
      if (mode === 'keyboard') await page.keyboard.press('Escape');
      else await page.locator('[data-clan-operations-close]').click();
      await panel().waitFor({ state: 'hidden' });
      await page.waitForFunction(() => document.activeElement?.hasAttribute('data-interior-world'));
    }
  }
  async function visit(roomId) {
    await closePanel(); await collectWalking();
    const from = (await actor()).room;
    await page.locator(`[data-clan-ship-room-target="${roomId}"]`).click();
    await page.waitForFunction(({ key, roomId }) => {
      const save = JSON.parse(localStorage.getItem(key)); const element = document.querySelector('[data-clan-interior]');
      return save?.clanShipDocking?.roomId === roomId && element?.getAttribute('data-interior-room') === roomId && element.getAttribute('data-interior-moving') === 'false' && !element.getAttribute('data-interior-target-room');
    }, { key: SAVE_STORAGE_KEY, roomId }, { timeout: 60000 });
    await frames();
    const samples = await collectWalking(), rooms = [from];
    for (const sample of samples) if (sample.room !== rooms.at(-1)) rooms.push(sample.room);
    for (let i = 1; i < rooms.length; i++) { const distance = Math.abs(roomRing.indexOf(rooms[i]) - roomRing.indexOf(rooms[i - 1])); assert.ok(distance === 1 || distance === roomRing.length - 1); }
    report.walking.transitions.push({ context: label, from, to: roomId, rooms, samples: samples.length });
  }
  async function openDossier() {
    const button = page.locator('[data-interior-operations]');
    if (await button.getAttribute('data-interior-operations-ready') !== 'true') {
      await button.click();
      await page.waitForFunction(() => document.querySelector('[data-interior-operations]')?.getAttribute('data-interior-operations-ready') === 'true' && document.querySelector('[data-clan-interior]')?.getAttribute('data-interior-moving') === 'false', null, { timeout: 45000 });
    }
    await button.click(); await panel().waitFor();
    await page.locator('[data-clan-operations-tab="crew"]').click();
  }
  async function readOnly(name, run, { expectedMovement = false } = {}) {
    await frames(); const before = await stored(), beforeActor = await actor();
    await run(); await frames();
    const after = await stored(); assert.equal(after, before, `${name}: read-only dialogue changed durable save bytes`);
    const afterActor = await actor();
    if (expectedMovement) {
      assert.equal(afterActor.room, beforeActor.room);
      assert.ok(Math.hypot(afterActor.x - beforeActor.x, afterActor.y - beforeActor.y) > 25, 'Fresh keyboard input must move the hunter after dialogue closure');
    } else samePosition(beforeActor, afterActor);
    const filename = `read-only-save-${label}-${name}.json`;
    await fs.writeFile(path.join(out, filename), JSON.stringify({ context: label, name, before, after, beforeActor, afterActor, expectedMovement, beforeSha256: sha(before), afterSha256: sha(after), unchanged: true }, null, 2) + '\n');
    report.readOnlySaves.push({ context: label, name, filename, beforeSha256: sha(before), afterSha256: sha(after), unchanged: true });
  }
  async function openNpc(npc, touch = false) {
    assert.equal((await actor()).room, npc.roomId);
    const button = page.locator(`[data-clan-crew-talk="${npc.id}"]`);
    await button.scrollIntoViewIfNeeded();
    if (touch) await button.tap(); else await button.click();
    await panel().waitFor();
    await page.waitForFunction(id => document.activeElement?.getAttribute('data-clan-recruit') === id, npc.id);
  }
  async function noOverflow() {
    const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth,
      panel: document.querySelector('[data-clan-operations]') ? { client: document.querySelector('[data-clan-operations]').clientWidth, scroll: document.querySelector('[data-clan-operations]').scrollWidth } : null }));
    assert.ok(sizes.document <= sizes.viewport + 2, JSON.stringify(sizes));
    if (sizes.panel) assert.ok(sizes.panel.scroll <= sizes.panel.client + 2, JSON.stringify(sizes));
  }
  const pad = async (button, pressed) => { await page.evaluate(({ button, pressed }) => { window.__clanDialogueQaPad.buttons[button] = { pressed, touched: pressed, value: pressed ? 1 : 0 }; }, { button, pressed }); await page.waitForTimeout(240); };
  for (const fixture of fixtures.slice(0, 5)) {
    await start(fixture);
    await check('Remote crew dossier emits no attributed speech', async () => {
      await openDossier();
      await readOnly('remote-dossier', async () => { assert.equal(await page.locator('[data-clan-crew-dialogue]').count(), 0); await closePanel('keyboard'); });
    });
    for (const npc of crewRoute) await check(`${npc.id} physically speaks ${fixture.id} without durable mutation`, async () => {
      await visit(npc.roomId);
      await readOnly(npc.id, async () => {
        await openNpc(npc);
        const dialogue = page.locator(`[data-clan-crew-dialogue="${npc.id}"]`);
        await dialogue.waitFor();
        assert.equal(await dialogue.getAttribute('data-clan-crew-dialogue-context'), fixture.id);
        assert.equal(await page.locator('[data-clan-crew-dialogue]').count(), 1);
        const line = (await dialogue.locator('blockquote').innerText()).trim(); assert.ok(line.length > 30);
        report.conversations.push({ context: fixture.id, npcId: npc.id, roomId: npc.roomId, line, actor: await actor(), entry: 'native physical NPC talk control' });
        if (npc.id === 'threshold-guard') await screenshot(`dialogue-${fixture.id}.png`);
        await page.locator(`[data-clan-crew-dialogue-ack="${npc.id}"]`).click();
        await dialogue.getByText('Paroles entendues.', { exact: true }).waitFor();
        await page.locator('[data-clan-operations-tab="journal"]').click();
        await page.locator('[data-clan-operations-tab="crew"]').click();
        await closePanel('keyboard');
      });
    });
    if (fixture.id === 'agreement') {
      const npc = CLAN_SHIP_RECRUITS.find(item => item.id === 'threshold-guard');
      await visit(npc.roomId);
      for (const width of [390, 320]) await check(`Touch dialogue, keyboard focus trap and return at ${width}px`, async () => {
        await page.setViewportSize({ width, height: 844 });
        await readOnly(`mobile-${width}`, async () => {
          await openNpc(npc, true); await noOverflow();
          const ack = page.locator(`[data-clan-crew-dialogue-ack="${npc.id}"]`); await ack.scrollIntoViewIfNeeded();
          const box = await ack.boundingBox(); assert.ok(box && box.width >= 44 && box.height >= 44, 'Acknowledgement needs a usable touch target');
          await screenshot(`dialogue-mobile-${width}.png`);
          await ack.tap();
          await page.locator(`[data-clan-crew-dialogue="${npc.id}"]`).getByText('Paroles entendues.', { exact: true }).waitFor();
          await page.locator('[data-clan-operations-close]').focus(); await page.keyboard.press('Shift+Tab');
          assert.equal(await page.evaluate(() => !!document.activeElement?.closest('[data-clan-operations]')), true);
          await page.keyboard.press('Tab');
          assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-clan-operations-close')), true);
          await closePanel('keyboard');
        });
      });
      await check('Closing dialogue returns physical movement to fresh keyboard input', async () => {
        await readOnly('keyboard-return', async () => {
          await openNpc(npc); await closePanel('keyboard');
          const before = await actor();
          await page.keyboard.down('d');
          try { await page.waitForFunction(x => Number(document.querySelector('[data-clan-interior]')?.getAttribute('data-interior-actor-x')) > x + 30, before.x, { timeout: 4000 }); }
          finally { await page.keyboard.up('d'); }
          await page.waitForFunction(() => document.querySelector('[data-clan-interior]')?.getAttribute('data-interior-moving') === 'false');
        }, { expectedMovement: true });
        await visit(npc.roomId);
      });
      await check('Existing explicit navigator gamepad emulator acknowledges and closes dialogue', async () => {
        await readOnly('gamepad-emulator', async () => {
          await openNpc(npc); await page.locator(`[data-clan-crew-dialogue-ack="${npc.id}"]`).focus();
          await pad(0, false); await pad(0, true); await pad(0, false);
          await page.locator(`[data-clan-crew-dialogue="${npc.id}"]`).getByText('Paroles entendues.', { exact: true }).waitFor();
          await pad(1, true); await pad(1, false); await panel().waitFor({ state: 'hidden' });
          await page.waitForFunction(() => document.activeElement?.hasAttribute('data-interior-world'));
          report.gamepad.executed = true;
        });
      });
      await check('Native browser focus loss suppresses dialogue while campaign is suspended', async () => {
        await readOnly('browser-suspended', async () => {
          await openNpc(npc);
          // Playwright normally emulates every page as focused. Disable that
          // browser setting so actual tab activation produces native focus
          // transitions; never replace hasFocus or dispatch a synthetic blur.
          const focusSession = await currentContext.newCDPSession(page);
          await focusSession.send('Emulation.setFocusEmulationEnabled', { enabled: false });
          await page.bringToFront();
          report.focusTransitions.push(await page.evaluate(() => ({ phase: 'before', focused: document.hasFocus(), hidden: document.hidden })));
          const other = await currentContext.newPage(); await other.goto('about:blank');
          const otherSession = await currentContext.newCDPSession(other);
          await otherSession.send('Emulation.setFocusEmulationEnabled', { enabled: false });
          await other.bringToFront();
          await page.waitForFunction(() => !document.hasFocus());
          report.focusTransitions.push(await page.evaluate(() => ({ phase: 'background', focused: document.hasFocus(), hidden: document.hidden })));
          await page.waitForFunction(() => !document.querySelector('[data-clan-crew-dialogue]'));
          assert.equal(await page.locator('[data-clan-operations]').getAttribute('inert'), '');
          await page.bringToFront(); await other.close();
          await page.waitForFunction(() => document.hasFocus());
          report.focusTransitions.push(await page.evaluate(() => ({ phase: 'restored', focused: document.hasFocus(), hidden: document.hidden })));
          await focusSession.detach();
          await page.locator(`[data-clan-crew-dialogue="${npc.id}"]`).waitFor(); await closePanel();
        });
      });
    }
    await currentContext.close();
  }
  const managedFixture = fixtures.find(item => item.id === 'managed-aboard');
  await start(managedFixture, { width: 320, height: 844 });
  for (const presence of domain.companionResidencePresence(managedFixture.save, { kind: 'clan', shipId: 'avp-predator-mothership' })) {
    const npc = { ...CLAN_SHIP_RECRUITS.find(item => item.id === presence.id), roomId: presence.avatarRoomId };
    await check(`${npc.id} managed resident speaks at actual berth ${npc.roomId} on 320px`, async () => {
      await visit(npc.roomId);
      assert.equal(await page.locator(`[data-clan-crew="${npc.id}"]`).count(), 0, 'The old legacy actor must not duplicate the managed resident');
      assert.equal(await page.locator(`[data-companion-avatar="${npc.id}"]`).count(), 1);
      assert.equal(await page.locator(`[data-clan-crew-talk="${npc.id}"]`).count(), 1);
      await readOnly(npc.id, async () => {
        await openNpc(npc, true); await noOverflow();
        const dialogue = page.locator(`[data-clan-crew-dialogue="${npc.id}"]`);
        assert.equal(await dialogue.getAttribute('data-clan-crew-dialogue-context'), 'agreement');
        report.managedConversations.push({ npcId: npc.id, actualRoomId: npc.roomId, usualRoomId: CLAN_SHIP_RECRUITS.find(item => item.id === npc.id).roomId,
          line: await dialogue.locator('blockquote').innerText(), avatarCount: 1, legacyActorCount: 0 });
        if (npc.id === 'star-watch') { await page.locator(`[data-clan-crew-dialogue-ack="${npc.id}"]`).scrollIntoViewIfNeeded(); await screenshot('managed-dialogue-mobile-320.png'); }
        await closePanel('keyboard');
      });
    });
  }
  await currentContext.close();
  await start(fixtures.find(item => item.id === 'unavailable'));
  for (const id of ['threshold-guard', 'iron-claw', 'star-watch']) await check(`${id} reserve/suspended/transferred post cannot emit speech`, async () => {
    const npc = CLAN_SHIP_RECRUITS.find(item => item.id === id); await visit(npc.roomId);
    assert.equal(await page.locator(`[data-clan-crew="${id}"]`).count(), 0);
    assert.equal(await page.locator(`[data-clan-crew-talk="${id}"]`).count(), 0);
    await openDossier();
    await readOnly(id, async () => { assert.equal(await page.locator('[data-clan-crew-dialogue]').count(), 0); if (id === 'star-watch') await screenshot('unavailable-crew-dossiers.png'); await closePanel(); });
  });
  await currentContext.close();
  await start(fixtures.find(item => item.id === 'active-spatial'));
  await check('Active spatial encounter does not fabricate an operation return', async () => {
    const npc = CLAN_SHIP_RECRUITS.find(item => item.id === 'threshold-guard');
    await visit(npc.roomId);
    await readOnly('active-spatial', async () => {
      await openNpc(npc);
      assert.equal(await page.locator(`[data-clan-crew-dialogue="${npc.id}"]`).getAttribute('data-clan-crew-dialogue-context'), 'agreement');
      assert.equal(JSON.parse(await stored()).clanShipOperations.spaceEncounter.turn, 0); await closePanel();
    });
  });
  await check('Native explicit recruitment callback is preserved and remains a single durable transaction', async () => {
    await currentContext.close();
    await start(fixtures.find(item => item.id === 'recent-proof'));
    const npc = CLAN_SHIP_RECRUITS.find(item => item.id === 'threshold-guard'); await visit(npc.roomId); await openNpc(npc);
    const before = JSON.parse(await stored());
    await page.locator(`[data-clan-recruit-action="${npc.id}"]`).click();
    await page.waitForFunction(({ key, revision }) => JSON.parse(localStorage.getItem(key))?.clanShipOperations?.revision === revision + 1,
      { key: SAVE_STORAGE_KEY, revision: before.clanShipOperations.revision });
    const after = JSON.parse(await stored());
    assert.deepEqual(after.clanShipOperations.recruitedNpcIds, [npc.id]);
    assert.equal(after.profile.clanMarks, before.profile.clanMarks);
    assert.deepEqual(after.clanShipOperations.completedContracts, before.clanShipOperations.completedContracts);
    assert.ok(after.companionResidence.members.some(item => item.id === npc.id && item.assignment === null && item.legacyClanPost === false));
    assert.equal(await page.locator(`[data-clan-recruit-action="${npc.id}"]`).count(), 0);
    assert.equal(await page.locator(`[data-clan-crew-dialogue="${npc.id}"]`).count(), 0, 'New reserve agreement must not leave a false present speaker');
    await fs.writeFile(path.join(out, 'native-recruitment-before-after.json'), JSON.stringify({ before, after }, null, 2) + '\n');
    report.nativeRecruitment = { npcId: npc.id, beforeRevision: before.clanShipOperations.revision, afterRevision: after.clanShipOperations.revision, clanMarksUnchanged: true, registeredReserve: true };
  });
  await check('All errors and assets remain unfiltered and no uncaught browser or network error occurred', async () => {
    await page.waitForLoadState('networkidle');
    await Promise.all(scriptProofs);
    assert.deepEqual(report.errors, []); assert.deepEqual(report.requestFailures, []); assert.deepEqual(report.httpErrors, []); assert.deepEqual([...missingAssets], []);
    assert.ok(report.servedScripts.length > 0);
    assert.ok(report.servedScripts.every(script => script.matchesBuiltFile !== false), 'A served Next chunk must match the current built file');
    assert.equal(report.conversations.length, 30); assert.equal(report.managedConversations.length, 6); assert.ok(report.walking.samples > 100);
  });
  report.identityAfter = await identity();
  assert.equal(report.identityAfter.sourceSha256, report.identityBefore.sourceSha256, 'Production source changed during browser recipe');
  assert.equal(report.identityAfter.productionBuildSha256, report.identityBefore.productionBuildSha256, 'Production build changed during browser recipe');
  report.passed = true;
} catch (error) {
  report.failure = error.stack || String(error); process.exitCode = 1; console.error(error);
  if (page && !page.isClosed()) {
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
    await fs.writeFile(path.join(out, 'failure-page.txt'), await page.locator('body').innerText().catch(() => 'Unavailable'));
    report.lastSave = await page.evaluate(key => localStorage.getItem(key), SAVE_STORAGE_KEY).catch(() => null);
  }
  report.identityAfter = await identity().catch(error => ({ error: error.message }));
} finally {
  report.finishedAt = new Date().toISOString(); report.requestedAssets = [...requestedAssets].sort(); report.missingAssets = [...missingAssets].sort();
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close(); await server?.close();
  console.log(JSON.stringify({ passed: report.passed, browserExecuted: report.browserExecuted, checks: report.checks.length, conversations: report.conversations.length, output: out }));
}
