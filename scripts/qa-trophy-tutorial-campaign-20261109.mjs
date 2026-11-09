/** Actual Next/GameClient → walked Homeworld door/post → 18 tutorial gestures.
 * The initial legacy Young Blood/defaultSave and nearby exterior checkpoint
 * are explicit hypotheses. No rite, mission result or tutorial result is seeded.
 * One real Storage.setItem campaign write is deliberately refused, then restored.
 * No game callback, DOM state, clock, HP, completion or screen is patched. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';

const script = fileURLToPath(import.meta.url);
const root = path.resolve(process.env.TROPHY_CAMPAIGN_RUNTIME_ROOT ?? path.dirname(script) + '/..');
const url = process.env.TROPHY_CAMPAIGN_QA_URL ?? 'http://127.0.0.1:3152';
const output = path.resolve(root, process.env.TROPHY_CAMPAIGN_QA_OUTPUT ?? 'production/clan-war-command-20261109/qa/trophy-tutorial/native-campaign/attempt-1');
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(url).hostname));
await fs.mkdir(output, { recursive: true });
await fs.writeFile(path.join(output, 'run.lock'), new Date().toISOString() + '\n', { flag: 'wx' });
const sha = data => createHash('sha256').update(data).digest('hex');
const exports = [
  "export {defaultSave,parseSaveImport,SAVE_STORAGE_KEY} from './app/game/save';",
  "export {migrateLegacyCampaignSlot,saveCampaignCheckpoint} from './app/game/systems/campaignSlots';",
  "export {SHIP_PROGRESSION_STORAGE_KEY} from './app/game/systems/progression';",
  "export {HOMEWORLD_BUILDINGS_V77,createHomeworldWorldActorV77} from './app/game/systems/homeworldWorldV77';",
  "export {homeworldBuildingDoorwayV64} from './app/game/systems/homeworldGeometryV64';",
  "export {homeworldInteriorForBuildingV64,isHomeworldInteriorWalkableV64} from './app/game/systems/homeworldInteriorsV64';",
  "export {homeworldWalkRouteV77} from './app/game/systems/homeworldNavigationV77';",
  "export {createHomeworldCheckpointV77,resolveHomeworldLocationV77} from './app/game/systems/homeworldLocationV77';",
].join('\n');
const bundleOptions = { stdin: { contents: exports, resolveDir: root }, absWorkingDir: root, bundle: true, write: false, logLevel: 'silent' };
const nodeBundle = await build({ ...bundleOptions, platform: 'node', format: 'esm' });
const api = await import('data:text/javascript;base64,' + Buffer.from(nodeBundle.outputFiles[0].text).toString('base64'));
const browserBundle = await build({ ...bundleOptions, platform: 'browser', format: 'iife', globalName: '__trophyPreparationV6' });
const owner = '2026-11-09T18:00:00.000Z', initial = api.defaultSave(owner);
initial.profile.hunterName = 'QA atelier · Young Blood historique'; initial.settings.masterVolume = 0;
const building = api.HOMEWORLD_BUILDINGS_V77.find(b => b.id === 'trophy-mausoleum');
const doorway = api.homeworldBuildingDoorwayV64(building), room = api.homeworldInteriorForBuildingV64(building.id);
const startActor = { ...api.createHomeworldWorldActorV77(), x: doorway.approach.x, y: doorway.approach.y + 110 };
initial.homeworld.locationV77 = api.createHomeworldCheckpointV77(owner, building.levelId, startActor, null, startActor);
assert.equal(api.parseSaveImport(JSON.stringify(initial)).failure, null);
assert.equal(api.resolveHomeworldLocationV77(initial.homeworld.locationV77, owner).restored, true);
assert.equal(initial.profile.rankId, 'young-blood'); assert.equal(initial.trophies.length, 0); assert.equal(initial.trophyTutorialV6, undefined);
const service = room.points.find(p => p.pointId === 'trophy-service');
await fs.writeFile(path.join(output, 'initial-save.json'), JSON.stringify(initial, null, 2) + '\n');
await fs.writeFile(path.join(output, 'fixture-disclosure.json'), JSON.stringify({
  owner, initialSave: 'initial-save.json', initialSaveSha256: sha(await fs.readFile(path.join(output, 'initial-save.json'))),
  kind: 'Production defaultSave legacy Young Blood, absent prologue; valid nearby exterior Homeworld checkpoint only.',
  seededRanksEarnedByRecipe: false, currentNurseryOrYoungBloodRiteQualified: false, tutorialProgressSeeded: false, missionResultsSeeded: false,
  body: { startActor, level: building.levelId, building: building.id, doorway, room: { width: room.width, depth: room.depth, spawn: room.spawn, service } },
  preparation: 'Fresh browser origin: production migrateLegacyCampaignSlot then saveCampaignCheckpoint(location=homeworld), native Web Locks/localStorage, before mounting GameClient. This is initial fixture setup, not an earned result.',
  fault: 'For the quota check only, Storage.setItem on the principal campaign key rejects a candidate tutorial step1. Other writes delegate to the native method. The original method is restored before retry and on cleanup.',
}, null, 2) + '\n');
if (process.argv.includes('--fixtures-only')) { console.log(JSON.stringify({ validated: true, browserExecuted: false, output })); process.exit(0); }

const sourceNames = ['app/game/GameClient.tsx', 'app/game/save.ts', 'app/game/types.ts', 'app/game/TrophyTutorialBay.tsx',
  'app/game/TrophyTutorialBay.module.css', 'app/game/systems/trophyTutorialV6.ts', 'app/game/HomeworldHub.tsx',
  'app/game/systems/homeworldLocationV77.ts', 'app/game/systems/campaignSlots.ts'];
const sourceSnapshot = () => Promise.all(sourceNames.map(async name => ({ path: name, sha256: sha(await fs.readFile(path.join(root, name))) })));
const buildSnapshot = async () => ({ buildId: (await fs.readFile(path.join(root, '.next/BUILD_ID'), 'utf8')).trim(),
  manifestSha256: sha(await fs.readFile(path.join(root, '.next/build-manifest.json'))) });
const report = { schemaVersion: 1, startedAt: new Date().toISOString(), recipe: 'scripts/qa-trophy-tutorial-campaign-20261109.mjs',
  recipeSha256: sha(await fs.readFile(script)), url, runtimeRoot: root, fixture: 'fixture-disclosure.json',
  scope: 'Actual final Next/GameClient and campaign writer, native walked Homeworld access, 18gestures on the pedagogical model. Initial legacy Young Blood position is declared; no current nursery/rite or full campaign qualification.',
  checks: [], screenshots: [], errors: [], consoleErrors: [], httpErrors: [], requestFailures: [], servedScripts: [],
  sourceBefore: await sourceSnapshot(), buildBefore: await buildSnapshot(), physicalController: false, humanArt: false,
  faultInjection: 'One principal campaign Storage.setItem candidate fails with QuotaExceededError; all other methods/writes native.',
  homeworldWalking: [], tutorialWalking: [], saveSnapshots: [], downloads: [], servedDocuments: [] };
const pendingScripts = [];
const check = (name, condition, detail) => { report.checks.push({ name, passed: Boolean(condition), ...(detail === undefined ? {} : { detail }) }); console.log(condition ? 'PASS' : 'FAIL', name); assert.ok(condition, name); };
let browser, context, page;
async function stored() { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), api.SAVE_STORAGE_KEY); }
async function snap(label) {
  const save = await stored(); assert.equal(api.parseSaveImport(JSON.stringify(save)).failure, null);
  const storage = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])));
  const data = { save, storage }; const filename = label + '.json';
  await fs.writeFile(path.join(output, filename), JSON.stringify(data, null, 2) + '\n');
  report.saveSnapshots.push({ label, filename, sha256: sha(await fs.readFile(path.join(output, filename))) }); return data;
}
async function frames() { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function shot(filename) {
  await frames(); const data = await page.screenshot({ path: path.join(output, filename), fullPage: true });
  report.screenshots.push({ filename, bytes: data.length, sha256: sha(data), viewport: page.viewportSize() });
}
const hub = () => page.locator('[data-homeworld-hub]');
const tutorial = () => page.locator('[data-trophy-tutorial-v6]');
const panel = () => page.locator('[data-trophy-tutorial-manipulation]');
const actor = () => page.locator('[data-homeworld-actor]').evaluate(e => ({ x: Number(e.getAttribute('data-x')), y: Number(e.getAttribute('data-y')),
  level: e.getAttribute('data-homeworld-level-v77') }));
async function walkHomeworld(target, tolerance = 10) {
  await page.locator('[data-homeworld-viewport]').focus(); let held = null;
  try {
    for (let n = 0; n < 350; n++) {
      const current = await actor(); report.homeworldWalking.push(current);
      const dx = target.x - current.x, dy = target.y - current.y;
      if (Math.hypot(dx, dy) <= tolerance) return;
      const next = Math.abs(dx) / 330 > Math.abs(dy) / 260 ? dx > 0 ? 'ArrowRight' : 'ArrowLeft' : dy > 0 ? 'ArrowDown' : 'ArrowUp';
      if (held !== next) { if (held) await page.keyboard.up(held); await page.keyboard.down(next); held = next; }
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    }
  } finally { if (held) await page.keyboard.up(held); await frames(); }
  throw Error('Native Homeworld walk stalled: ' + JSON.stringify({ target, actual: await actor() }));
}
function indoorPath(start, target) {
  const walkable = p => api.isHomeworldInteriorWalkableV64(room, p);
  const clear = (a, b) => { const length = Math.hypot(a.x - b.x, a.y - b.y); for (let i = 0; i <= Math.ceil(length / 4); i++) {
    const t = i / Math.max(1, Math.ceil(length / 4)); if (!walkable({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })) return false;
  } return true; };
  if (clear(start, target)) return [target];
  const nodes = [start, target];
  for (let x = 20; x < room.width - 20; x += 12) for (let y = 20; y < room.depth - 20; y += 12) if (walkable({ x, y })) nodes.push({ x, y });
  const parents = new Map([[0, null]]), queue = [0];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const id = queue[cursor], p = nodes[id];
    if (clear(p, target)) { const result = [target]; let at = id; while (at !== null) { if (at !== 0) result.push(nodes[at]); at = parents.get(at); } return result.reverse(); }
    for (let i = 2; i < nodes.length; i++) if (!parents.has(i) && Math.hypot(nodes[i].x - p.x, nodes[i].y - p.y) <= 19 && clear(p, nodes[i])) { parents.set(i, id); queue.push(i); }
  }
  throw Error('No actual room path to trophy service');
}
async function continueToHomeworld() {
  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  assert.ok(response && response.status() === 200);
  const html = await response.text(), foundBuildId = html.includes(report.buildBefore.buildId);
  report.servedDocuments.push({ url: response.url(), status: response.status(), buildId: report.buildBefore.buildId, foundBuildId, sha256: sha(html) });
  assert.ok(foundBuildId, 'Real Next HTML belongs to the inspected production build');
  await page.locator('[data-campaign-menu]').waitFor();
  if (await page.locator('[data-menu-section="campaign"]').isVisible()) await page.locator('[data-menu-section="campaign"]').click();
  await page.locator('[data-menu-action="continue"]').click();
  await hub().waitFor({ timeout: 120000 }); await page.bringToFront(); await frames();
  await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor({ timeout: 120000 });
}
async function reachTrophyService() {
  if (!(await hub().getAttribute('data-homeworld-interior-id'))) {
    await walkHomeworld(doorway.approach, 10);
    await page.locator('[data-homeworld-viewport]').focus(); await page.keyboard.press('KeyE');
    await page.locator('[data-homeworld-hub][data-homeworld-interior-id="trophy-mausoleum"]').waitFor();
    check('The actual Mausoleum door is entered after native exterior movement', report.homeworldWalking.length > 0);
  }
  assert.equal(await hub().getAttribute('data-homeworld-interior-id'), 'trophy-mausoleum');
  for (const point of indoorPath(await actor(), service)) await walkHomeworld(point, 10);
  const actual = await actor();
  assert.ok(Math.hypot(actual.x - service.x, actual.y - service.y) < 20);
  const savePosition = page.getByRole('button', { name: 'Enregistrer la position', exact: true });
  if (await savePosition.count()) await savePosition.click();
  await page.locator('[data-homeworld-viewport]').focus(); await page.keyboard.press('KeyE');
  await page.getByRole('button', { name: 'Accéder au service', exact: true }).click();
  await page.locator('[data-trophy-tutorial-open]').waitFor();
  check('The real interior trophy-service opens its game screen', true, { actor: actual, service });
}
async function openTutorial() {
  await page.locator('[data-trophy-tutorial-open]').click(); await tutorial().waitFor(); await page.bringToFront(); await frames();
}
const atStep = n => page.waitForFunction(n => document.querySelector('[data-trophy-tutorial-v6]')?.getAttribute('data-trophy-tutorial-step') === String(n), n);
async function approach() {
  const before = await tutorial().getAttribute('data-trophy-tutorial-walked');
  const button = page.locator('[data-trophy-tutorial-approach]'); if (await button.count()) await button.click();
  await panel().waitFor({ timeout: 20000 });
  report.tutorialWalking.push({ before: Number(before), after: Number(await tutorial().getAttribute('data-trophy-tutorial-walked')),
    x: Number(await tutorial().getAttribute('data-trophy-tutorial-x')), y: Number(await tutorial().getAttribute('data-trophy-tutorial-y')) });
}
const tick = label => panel().getByLabel(label, { exact: true }).check();
const choose = label => panel().getByRole('button', { name: label, exact: true }).click();
async function range(name, value) {
  const slider = panel().getByRole('slider', { name, exact: true }); await slider.focus(); await slider.press('Home');
  for (let i = 0; i < value; i++) await slider.press('ArrowRight');
  assert.equal(Number(await slider.inputValue()), value);
}
async function finish(n) { await page.locator('[data-trophy-tutorial-confirm]').click(); await atStep(n); assert.equal((await stored()).trophyTutorialV6.completedSteps, n); }
async function reloadTutorial(n) {
  await continueToHomeworld(); await reachTrophyService(); await openTutorial(); await atStep(n);
}
async function restoreQuota() {
  await page?.evaluate(() => { if (window.__trophyNativeSetItem) { Storage.prototype.setItem = window.__trophyNativeSetItem; delete window.__trophyNativeSetItem; } }).catch(() => undefined);
}
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ?? '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
  // Initial fixture construction uses native browser locks/storage before any
  // GameClient exists. The temporary setup document is never a gameplay proof.
  const setup = await context.newPage(); const preparationUrl = new URL('/__trophy-initial-fixture-only', url).href;
  await setup.route(preparationUrl, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Declared fixture setup only</title>' }));
  await setup.goto(preparationUrl); await setup.addScriptTag({ content: browserBundle.outputFiles[0].text });
  const prepared = await setup.evaluate(async initial => {
    const api = window.__trophyPreparationV6; localStorage.setItem(api.SAVE_STORAGE_KEY, JSON.stringify(initial));
    const migration = await api.migrateLegacyCampaignSlot(localStorage);
    if (!migration.ok) throw Error('Initial production migration refused: ' + migration.failure);
    const revision = migration.catalog.slots.find(s => s.id === migration.slotId).revision;
    const checkpoint = await api.saveCampaignCheckpoint(migration.slotId, { kind: 'auto', expectedRevision: revision, location: 'homeworld' }, localStorage);
    if (!checkpoint.ok) throw Error('Initial production checkpoint refused: ' + checkpoint.failure);
    return { migrated: migration.ok, checkpoint: checkpoint.checkpoint,
      storage: Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])) };
  }, initial);
  report.initialPreparation = { migrated: prepared.migrated, checkpoint: prepared.checkpoint };
  await fs.writeFile(path.join(output, 'initial-prepared-storage.json'), JSON.stringify(prepared.storage, null, 2) + '\n');
  await setup.close();
  page = await context.newPage(); page.setDefaultTimeout(35000);
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
  page.on('requestfailed', request => report.requestFailures.push({ url: request.url(), error: request.failure() }));
  page.on('response', response => {
    const pathname = new URL(response.url()).pathname;
    if (response.status() >= 400) report.httpErrors.push({ url: response.url(), status: response.status() });
    if (response.request().resourceType() === 'script' && pathname.startsWith('/_next/static/')) pendingScripts.push((async () => {
      const served = await response.body(), name = '.next/' + pathname.slice('/_next/'.length), compiled = await fs.readFile(path.join(root, name));
      report.servedScripts.push({ pathname, bytes: served.length, sha256: sha(served), compiledSha256: sha(compiled), matched: sha(served) === sha(compiled) });
    })().catch(error => report.errors.push('served-script: ' + error.message)));
  });
  await continueToHomeworld(); await shot('00-homeworld-exterior.png'); await reachTrophyService();
  await shot('01-physical-service.png'); await openTutorial(); await atStep(0);
  const baseline = await snap('02-before-tutorial');
  check('Young Blood legacy access has no seeded tutorial, rank promotion or trophy claim', baseline.save.profile.rankId === 'young-blood' && !baseline.save.trophyTutorialV6 && baseline.save.trophies.length === 0);
  await shot('02-first-niche.png'); await approach(); await tick('Ouvrir la niche'); await tick('Repérer les deux rails'); await range('Marge latérale', 20);
  const beforeQuota = await page.evaluate(key => localStorage.getItem(key), api.SAVE_STORAGE_KEY);
  await page.evaluate(key => {
    window.__trophyQuotaCount = 0; window.__trophyNativeSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, bytes) {
      let candidate; try { candidate = name === key ? JSON.parse(bytes) : null; } catch { /* Native method still handles other bytes. */ }
      if (name === key && candidate?.trophyTutorialV6?.completedSteps === 1) { window.__trophyQuotaCount++; throw new DOMException('QA declared tutorial quota fault', 'QuotaExceededError'); }
      return window.__trophyNativeSetItem.call(this, name, bytes);
    };
  }, api.SAVE_STORAGE_KEY);
  await page.locator('[data-trophy-tutorial-confirm]').click();
  await page.locator('[data-trophy-tutorial-notice]').filter({ hasText: 'attend son enregistrement' }).waitFor();
  check('Actual campaign quota failure keeps the previous gesture and principal save bytes', await tutorial().getAttribute('data-trophy-tutorial-step') === '0' && await page.evaluate(key => localStorage.getItem(key), api.SAVE_STORAGE_KEY) === beforeQuota && await page.evaluate(() => window.__trophyQuotaCount > 0));
  await shot('03-quota-refused.png'); await restoreQuota(); await finish(1);
  check('Retry persists the same first gesture through the real campaign writer', (await stored()).trophyTutorialV6.revision === 1);
  await approach(); await range('Cadrage horizontal', 50); await range('Cadrage vertical', 50); await range('Ouverture du cadre', 60); await shot('04-source-frame.png'); await finish(2);
  await approach(); await tick('Marque visible'); await tick('Repère du sol'); await tick('Supposer une victoire de chasse (non observée)');
  const beforeInvented = JSON.stringify((await stored()).trophyTutorialV6);
  await page.locator('[data-trophy-tutorial-confirm]').click(); await page.locator('[data-trophy-tutorial-notice]').filter({ hasText: 'aucune chasse' }).waitFor();
  check('Unobserved hunt narrative is refused without advancing the durable journal', JSON.stringify((await stored()).trophyTutorialV6) === beforeInvented);
  await panel().getByLabel('Supposer une victoire de chasse (non observée)', { exact: true }).uncheck(); await finish(3);
  const discovery = await snap('05-discovery-before-reload'); await reloadTutorial(3); const discoveryAfter = await snap('05-discovery-after-reload');
  check('Real campaign reload resumes discovery3 and the same carried pedagogical object', JSON.stringify(discovery.save.trophyTutorialV6) === JSON.stringify(discoveryAfter.save.trophyTutorialV6));
  await approach(); await choose('Berceau ajusté : appuis libres'); await finish(4);
  await approach(); await range('Attache gauche · appui 18–28', 23); await range('Attache droite · appui 72–82', 77); await finish(5);
  await approach(); await choose('Modèle de l’atelier · provenance locale'); await tick('Fermer le contenant et prendre sa poignée'); await finish(6); await shot('06-carried-container.png');
  await approach(); await range('Glisser la caisse jusqu’à la butée', 100); await tick('L’étiquette de source reste visible'); await finish(7);
  await approach(); await choose('Conserver le résultat inconnu'); await choose('Original fermé · travailler sur le modèle'); await finish(8);
  await approach(); await choose('Face');
  const face = await snap('07-face-before-reload'); await reloadTutorial(8); const faceAfter = await snap('07-face-after-reload');
  check('Face-only inspection survives actual GameClient reload without completing gesture9', JSON.stringify(face.save.trophyTutorialV6) === JSON.stringify(faceAfter.save.trophyTutorialV6) && faceAfter.save.trophyTutorialV6.events.at(-1).values.view === 'face');
  await approach();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 }); await panel().scrollIntoViewIfNeeded();
    check(`${width}px tutorial controls and guidance remain horizontally contained`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await shot(`08-face-${width}.png`);
  }
  await page.setViewportSize({ width: 1440, height: 1050 }); await choose('Profil'); await choose('Revers'); await finish(9);
  await approach(); await tick('Relever la fibre fragile sur l’arête'); await tick('Relever la marque centrale'); await choose('Conserver l’état initial'); await finish(10);
  await approach(); await choose('Soulever la fibre détachable prévue'); await tick('Conserver la fibre avec l’index du modèle'); await finish(11);
  await approach(); await range('Appuis · repère 25', 25); await range('Motif · repère 75', 75); await finish(12);
  await approach(); for (const n of [1, 2, 3]) await choose(`Pièce ${n}`); await finish(13);
  await approach(); await choose('Base adaptée aux appuis'); await range('Équilibre · centre 50', 50); await finish(14);
  await approach(); await range('Lumière rasante', 30); await finish(15);
  await approach(); await tick('Provenance : modèle de l’atelier'); await tick('Marque centrale observée'); await tick('Âge : question non résolue'); await finish(16);
  const plaque = await snap('09-plaque-before-reload'); await shot('09-plaque.png'); await reloadTutorial(16); const plaqueAfter = await snap('09-plaque-after-reload');
  check('Ready plaque and the same carried cradle survive the third real campaign interruption', JSON.stringify(plaque.save.trophyTutorialV6) === JSON.stringify(plaqueAfter.save.trophyTutorialV6));
  await approach(); await tick('Verrouiller le rail gauche'); await tick('Verrouiller le rail droit'); await finish(17);
  await approach(); await choose('1 · Fermer'); await choose('2 · Vérifier la marge : 20'); await choose('3 · Rouvrir'); await tick('Confirmer l’exposition du modèle'); await finish(18);
  const final = await snap('10-completed'); await shot('10-exposed-model.png');
  check('18 gestures and21 durable events are confirmed in the actual campaign', final.save.trophyTutorialV6.completedSteps === 18 && final.save.trophyTutorialV6.revision === 21 && final.save.trophyTutorialV6.events.length === 21 && final.save.trophyTutorialV6.objectLocation === 'cabinet');
  const profile = p => ({ rankId: p.rankId, honor: p.honor, clanMarks: p.clanMarks, hunterName: p.hunterName });
  check('Rank, honor, marks and real trophies remain unchanged', JSON.stringify(profile(final.save.profile)) === JSON.stringify(profile(baseline.save.profile)) && JSON.stringify(final.save.trophies) === JSON.stringify(baseline.save.trophies));
  check('Fleet/progression bytes and ship-acquisition state remain unchanged', final.storage[api.SHIP_PROGRESSION_STORAGE_KEY] === baseline.storage[api.SHIP_PROGRESSION_STORAGE_KEY] && JSON.stringify(final.save.shipAcquisitionV89) === JSON.stringify(baseline.save.shipAcquisitionV89));
  check('No nursery/current rite or mission completion was invented by the tutorial', JSON.stringify(final.save.prologue) === JSON.stringify(baseline.save.prologue) && JSON.stringify(final.save.missionProgress) === JSON.stringify(baseline.save.missionProgress));
  await page.getByRole('button', { name: 'Revenir au poste', exact: true }).click(); await page.locator('[data-trophy-tutorial-open]').waitFor();
  await page.locator('[aria-labelledby="trophies-title"] .back-button').click(); await hub().waitFor();
  check('Closing returns to the actual physical Mausoleum interior', await hub().getAttribute('data-homeworld-interior-id') === 'trophy-mausoleum');
  await shot('11-returned-physical-post.png');
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = error.stack ?? String(error);
  if (page) { await shot('failure.png').catch(() => undefined); await snap('failure-save').catch(() => undefined); }
} finally {
  await restoreQuota(); await Promise.allSettled(pendingScripts);
  report.sourceAfter = await sourceSnapshot(); report.buildAfter = await buildSnapshot();
  report.sourceBeforeAfterEqual = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  report.buildBeforeAfterEqual = JSON.stringify(report.buildBefore) === JSON.stringify(report.buildAfter);
  report.passed = report.passed === true && report.sourceBeforeAfterEqual && report.buildBeforeAfterEqual && report.errors.length === 0 && report.consoleErrors.length === 0 && report.httpErrors.length === 0 && report.requestFailures.length === 0 && report.servedScripts.length > 0 && report.servedScripts.every(row => row.matched);
  report.browserVersion = browser?.version(); report.finishedAt = new Date().toISOString();
  report.checksPassed = report.checks.filter(c => c.passed).length; report.checksFailed = report.checks.filter(c => !c.passed).length;
  await fs.writeFile(path.join(output, 'report.browser-run.json'), JSON.stringify(report, null, 2) + '\n');
  await fs.copyFile(script, path.join(output, 'recipe-used.mjs'));
  await browser?.close();
}
console.log(JSON.stringify({ passed: report.passed, checksPassed: report.checksPassed, checksFailed: report.checksFailed, output, failure: report.failure }));
if (!report.passed) process.exitCode = 1;
