/** Production Next GameClient: T04 in a real hunt and T13 native dread motion.
 * Only the initial adult campaign/cosmetics are fixtures. Native buttons/keys
 * drive the game; CDP reads retained V8 scopes without invoking game callbacks.
 * No clock, health, results, canvas methods or application source is patched. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { inspectNativeHunt20261109 } from './lib/qa-native-hunt-inspection-20261109.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.PHG_HUNT_QA_URL || 'http://127.0.0.1:3122';
const out = path.resolve(root, process.env.PHG_HUNT_QA_OUTPUT || 'outputs/phg-hunt-p0p1-20261109');
const sha = data => createHash('sha256').update(data).digest('hex');
const recipeBytes = await fs.readFile(fileURLToPath(import.meta.url));
async function tree(dir) {
  const files = [];
  for (const entry of await fs.readdir(path.join(root, dir), { withFileTypes: true })) {
    const file = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await tree(file)); else if (entry.isFile()) files.push(file);
  }
  return files.sort();
}
async function identity() {
  const files = [];
  for (const file of [...await tree('app'), ...await tree('desktop'), 'package.json', 'package-lock.json'].sort()) {
    const bytes = await fs.readFile(path.join(root, file)); files.push({ path: file, bytes: bytes.length, sha256: sha(bytes) });
  }
  return { sha256: sha(JSON.stringify(files)), files };
}
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, 'run.lock'), new Date().toISOString(), { flag: 'wx' });
const bundle = await build({ stdin: { contents: [
  "export {defaultSave,SAVE_STORAGE_KEY,parseSaveImport} from './app/game/save';",
  "export {appearanceForPreset} from './app/game/hunterLore';",
  "export {PHG_OGRE_BIOMASK_ID_V131} from './app/game/phgBiomaskTintsV131';",
  "export {normalizeHunterChromaticsV113} from './app/game/hunterChromaticsV113';",
  "export {DECAL_FIELDS_V133,Y_A_U_T_J_A_DECALS_V133} from './app/game/yautjaDecalsV133';",
  "export {GALAXY_NAVIGATION} from './app/game/galaxyNavigation';",
  "export {ACTIVE_HUNT_STORAGE_KEY} from './app/game/systems/activeHuntSave';",
  "export {hunterDreadPath} from './app/game/hunterVisuals';",
].join('\n'), resolveDir: root }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const initial = api.defaultSave('2026-11-09T14:00:00.000Z');
initial.profile.hunterName = 'QA PHG chasse Alpha'; initial.settings.masterVolume = 0;
initial.appearance = api.appearanceForPreset('alpha');
initial.appearance.chromaticsV113 = api.normalizeHunterChromaticsV113({ maskOriginId: 'alpha', maskHex: '#56828b', maskMaterialId: api.PHG_OGRE_BIOMASK_ID_V131,
  ...Object.fromEntries(['face', 'body', 'armor', 'biomask'].map(zone => [api.DECAL_FIELDS_V133[zone], api.Y_A_U_T_J_A_DECALS_V133.find(item => item.zone === zone).id])) });
assert.equal(api.parseSaveImport(JSON.stringify(initial)).failure, null);
assert.ok(initial.loadout.weaponIds.includes('plasma-caster'), 'The adult default loadout already owns a caster; no weapon reward is forged.');
await fs.writeFile(path.join(out, 'initial-alpha-ogre.json'), JSON.stringify(initial, null, 2));
const report = { startedAt: new Date().toISOString(), recipe: 'scripts/qa-phg-hunt-p0p1-20261109.mjs', recipeSha256: sha(recipeBytes),
  helperSha256: sha(await fs.readFile(path.join(root, 'scripts/lib/qa-native-hunt-inspection-20261109.mjs'))), url,
  fixture: { disclosure: 'Synthetic INITIAL adult defaultSave only, Alpha appearance, Ogre pigment and four original clan decals. No mission completion, HP, clock, callback, result or later storage rewrite. Ringed coiffage is selected through the native UI.',
    filename: 'initial-alpha-ogre.json', sha256: sha(await fs.readFile(path.join(out, 'initial-alpha-ogre.json'))), loadout: initial.loadout },
  scope: 'Tests_Parcours T04 actual hunt mask toggle and T13 actual coiffage, movement, aiming and native spring/attachment observation. Not official PHG UV/1:1 artistic approval.',
  checks: [], screenshots: [], states: [], errors: [], consoleErrors: [], httpErrors: [], requestFailures: [], servedScripts: [], resourceMismatches: [], passed: false };
const pass = (name, detail) => { report.checks.push({ name, passed: true, detail }); console.log('PASS', name); };
async function nativeAssetBank(observer) {
  const scope = await observer.session.send('Runtime.getProperties', { objectId: observer.scopeObjectId, ownProperties: true });
  for (const variable of scope.result) {
    if (variable.value?.type !== 'object' || !variable.value.objectId || variable.value.subtype) continue;
    const properties = await observer.session.send('Runtime.getProperties', { objectId: variable.value.objectId, ownProperties: true });
    const names = new Set(properties.result.map(item => item.name));
    if (!['hunterDreads', 'hunterMask', 'hunterPlasma'].every(name => names.has(name))) continue;
    const copied = await observer.session.send('Runtime.callFunctionOn', { objectId: variable.value.objectId, returnByValue: true,
      functionDeclaration: 'function () { const image = value => value ? {src:value.src,complete:value.complete,width:value.naturalWidth,height:value.naturalHeight} : null; return {hunterDreads:image(this.hunterDreads),hunterMask:image(this.hunterMask),hunterPlasma:Object.fromEntries(Object.entries(this.hunterPlasma).map(([key,value])=>[key,image(value)]))}; }' });
    assert.ok(!copied.exceptionDetails); return { variableName: variable.name, ...copied.result.value };
  }
  throw new Error('Native retained scope did not expose its actual asset bank; no substitute observer is installed.');
}
const pending = []; let browser, page, observation;
try {
  report.sourceBefore = await identity(); report.buildId = (await fs.readFile(path.join(root, '.next/BUILD_ID'), 'utf8')).trim();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium', headless: true }); report.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await context.addInitScript(({ key, save }) => {
    if (!['http:', 'https:'].includes(location.protocol) || sessionStorage.getItem('phg-hunt-initialized')) return;
    localStorage.setItem(key, JSON.stringify(save)); sessionStorage.setItem('phg-hunt-initialized', 'true');
  }, { key: api.SAVE_STORAGE_KEY, save: initial });
  page = await context.newPage(); page.setDefaultTimeout(45000);
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
  page.on('requestfailed', request => report.requestFailures.push({ url: request.url(), failure: request.failure() }));
  page.on('response', response => {
    if (response.status() >= 400 && response.url().startsWith(url)) report.httpErrors.push({ url: response.url(), status: response.status() });
    const pathname = new URL(response.url()).pathname;
    if (pathname.startsWith('/_next/static/') && pathname.endsWith('.js')) pending.push((async () => {
      const bytes = await response.body(), local = await fs.readFile(path.join(root, '.next', decodeURIComponent(pathname.slice('/_next/'.length))));
      assert.equal(sha(bytes), sha(local), pathname); report.servedScripts.push({ pathname, sha256: sha(bytes) });
    })().catch(error => report.resourceMismatches.push(error.message)));
  });
  const stored = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), api.SAVE_STORAGE_KEY);
  const capture = async (name, { canvas = false } = {}) => {
    const filename = name + '.png';
    if (canvas) {
      const data = await page.locator('.hunt-screen canvas').evaluate(node => node.toDataURL('image/png'));
      await fs.writeFile(path.join(out, filename), Buffer.from(data.split(',')[1], 'base64'));
    } else await page.screenshot({ path: path.join(out, filename), fullPage: false });
    report.screenshots.push({ filename, sha256: sha(await fs.readFile(path.join(out, filename))), inspected: false, scope: canvas ? 'Unmodified native canvas PNG via toDataURL; no overlay or pixel editing.' : 'Native viewport screenshot.' });
  };
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  if (await page.locator('[data-menu-section="campaign"]').isVisible()) await page.locator('[data-menu-section="campaign"]').click();
  await page.locator('[data-menu-action="continue"]').click(); await page.locator('[data-campaign-session]').waitFor({ timeout: 90000 });
  await page.getByRole('button', { name: 'Console du vaisseau', exact: true }).click();
  const ship = page.locator('[data-ship-room]'); await ship.waitFor();
  await ship.getByRole('navigation', { name: 'Salles du vaisseau' }).getByRole('button', { name: 'Armurerie', exact: true }).click();
  await ship.getByRole('button', { name: /Personnaliser le chasseur/ }).click();
  const dreads = page.locator('.customization-section').filter({ has: page.getByRole('heading', { name: 'Dreadlocks', exact: true }) });
  await dreads.locator('button.appearance-option').filter({ has: page.locator('strong').filter({ hasText: /^Annelées$/ }) }).click();
  const coiffed = await stored(); assert.equal(coiffed.appearance.dreadStyleId, 'ringed');
  assert.equal(coiffed.appearance.chromaticsV113.maskMaterialId, api.PHG_OGRE_BIOMASK_ID_V131);
  await fs.writeFile(path.join(out, 'after-native-coiffage.json'), JSON.stringify(coiffed, null, 2));
  await capture('01-native-ringed-coiffage'); pass('T13 coiffage Annelées selected through native customization and persisted', { style: coiffed.appearance.dreadStyleId, material: coiffed.appearance.chromaticsV113.maskMaterialId });
  await page.getByRole('button', { name: /^← Retour au pont/ }).click();
  const shortcuts = page.getByRole('button', { name: 'Accès rapide aux installations', exact: true });
  if (await shortcuts.getAttribute('aria-expanded') !== 'true') await shortcuts.click();
  const direct = page.locator('[data-ship-shortcuts] summary');
  if (await direct.locator('..').getAttribute('open') === null) await direct.click();
  await page.getByRole('button', { name: /^NAVIGATION.*Ouvrir l’interface/ }).first().click();
  const routes = new Map(api.GALAXY_NAVIGATION.sectors.flatMap(sector => sector.systems.flatMap(system => system.bodies.flatMap(body => body.missions.map(mission => [mission.id, { sector, system, body, mission }])))));
  const route = routes.get('jungle-vey'); assert.ok(route);
  const galaxyRoot = page.locator('.galaxy-v10-breadcrumbs button').first(); if (await galaxyRoot.isEnabled()) await galaxyRoot.click();
  for (const label of [route.sector.name, route.system.name, route.body.name]) {
    console.log('NAVIGATE', label);
    await page.locator('.galaxy-v10-spatial-map button').filter({ hasText: label }).first().click();
    await page.getByRole('button', { name: 'Entrer', exact: true }).click();
  }
  await page.getByRole('button', { name: route.mission.title, exact: false }).first().click();
  await page.getByRole('button', { name: /^Préparer (la chasse|cette revisite)$/ }).click();
  await page.getByRole('button', { name: 'Départ rapide', exact: true }).click();
  const skipArrival = page.getByRole('button', { name: /^Passer l’arrivée/ });
  await skipArrival.waitFor({ timeout: 90000 }); await skipArrival.click();
  const canvas = page.locator('.hunt-screen canvas'); await canvas.waitFor({ timeout: 90000 });
  const opening = page.locator('[data-mission-opening-v78]'); await opening.waitFor({ timeout: 90000 });
  await opening.getByRole('button', { name: 'Commencer la chasse', exact: true }).click(); await canvas.focus();
  observation = await inspectNativeHunt20261109(page); report.inspection = observation.evidence;
  const read = async label => {
    const state = await observation.read(); report.states.push({ label, wallAt: new Date().toISOString(), state });
    await fs.writeFile(path.join(out, 'states.json'), JSON.stringify(report.states, null, 2)); return state;
  };
  const start = await read('actual-hunt-start'); assert.equal(start.paused, false); assert.equal(start.player.maskOn, true);
  await capture('02-hunt-mask-on', { canvas: true }); pass('T04 real jungle-vey hunt launched through galaxy, preparation and briefing', { phase: start.phase, elapsed: start.elapsed, x: start.player.x, health: start.player.health });
  report.nativeAssets = await nativeAssetBank(observation);
  assert.equal(new URL(report.nativeAssets.hunterDreads.src).pathname, api.hunterDreadPath('ringed'));
  assert.ok(report.nativeAssets.hunterDreads.complete && report.nativeAssets.hunterDreads.width > 0);
  assert.ok(report.nativeAssets.hunterMask.complete && report.nativeAssets.hunterMask.width > 0);
  assert.ok(report.nativeAssets.hunterPlasma.laser.complete && report.nativeAssets.hunterPlasma.laser.width > 0);
  await fs.writeFile(path.join(out, 'native-assets.json'), JSON.stringify(report.nativeAssets, null, 2));
  pass('T13 actual HuntCanvas asset bank loads the chosen ringed bitmap, biomask and laser', report.nativeAssets);
  if (process.argv.includes('--probe')) { pass('probe native scope read', observation.evidence); report.passed = true; }
  else {
    await page.keyboard.press('Digit2'); await page.keyboard.down('ShiftLeft'); await page.waitForTimeout(300);
    const aimedOn = await read('mask-on-caster-aim'); assert.equal(aimedOn.player.aiming, true); assert.equal(aimedOn.player.maskOn, true);
    await capture('03-mask-on-caster-aim', { canvas: true });
    await page.keyboard.press('KeyM'); await page.waitForTimeout(160);
    const aimedOff = await read('mask-off-caster-aim'); assert.equal(aimedOff.player.maskOn, false); assert.equal(aimedOff.player.aiming, true);
    await capture('04-mask-off-caster-aim', { canvas: true });
    pass('T04 KeyM removes mask during actual caster aim while manual aiming remains available', { maskOn: aimedOff.player.maskOn, aiming: aimedOff.player.aiming, note: 'Manual reticle is supported without biomask; laser and thermal-track gates are checked against this exact renderer source, not falsely claimed as whole-caster disablement.' });
    await page.keyboard.up('ShiftLeft'); await page.keyboard.press('KeyM'); await page.waitForTimeout(160);
    assert.equal((await read('mask-restored')).player.maskOn, true); await capture('05-mask-restored', { canvas: true });
    assert.deepEqual((await stored()).appearance, coiffed.appearance, 'Hunt removal never unequips the durable mask or clears its cosmetics.');
    pass('T04 second native KeyM restores biomask without rewriting durable Ogre/decal appearance', { appearanceSha256: sha(JSON.stringify(coiffed.appearance)) });
    const motion = [];
    for (const [direction, duration] of [['ArrowRight', 450], ['ArrowLeft', 350], ['ArrowRight', 350]]) {
      await page.keyboard.down(direction); await page.waitForTimeout(duration); motion.push(await read('motion-' + motion.length)); await page.keyboard.up(direction);
      await capture('06-dreads-motion-' + motion.length, { canvas: true });
    }
    assert.ok(motion.some(state => Math.abs(state.player.x - start.player.x) > 4), 'Real movement must change world position.');
    for (const state of motion) {
      assert.equal(state.player.dreadAngles.length, 7); assert.equal(state.player.dreadVelocities.length, 7);
      assert.ok(state.player.dreadAngles.every(value => Number.isFinite(value) && value >= -.25 && value <= .55));
      assert.ok(state.player.dreadVelocities.every(value => Number.isFinite(value) && Math.abs(value) <= 3));
    }
    assert.ok(motion.some(state => state.player.dreadAngles.some(value => Math.abs(value) > .0001)), 'Dread springs must react to native motion.');
    assert.notDeepEqual(motion[0].player.dreadAngles, motion[1].player.dreadAngles);
    pass('T13 real turns and movement produce finite bounded seven-strand spring motion', motion.map(state => ({ x: state.player.x, facing: state.player.facing, velocityX: state.player.velocityX, dreadAngles: state.player.dreadAngles, dreadVelocities: state.player.dreadVelocities })));
    await page.keyboard.down('ShiftLeft'); await page.waitForTimeout(220); const movingAim = await read('ringed-native-aim'); assert.equal(movingAim.player.aiming, true);
    await capture('07-ringed-native-aim', { canvas: true }); await page.keyboard.up('ShiftLeft');
    await page.getByRole('button', { name: 'Mettre en pause, consulter la carte et le sac', exact: true }).click();
    const frozen = await read('native-paused'); assert.equal(frozen.paused, true); await capture('08-native-pause');
    await page.keyboard.press('KeyM'); await page.waitForTimeout(600); const frozenLater = await read('paused-input-ignored');
    assert.equal(frozenLater.elapsed, frozen.elapsed); assert.deepEqual(frozenLater.player.dreadAngles, frozen.player.dreadAngles); assert.deepEqual(frozenLater.player.dreadVelocities, frozen.player.dreadVelocities); assert.equal(frozenLater.player.maskOn, frozen.player.maskOn);
    pass('T04/T13 native pause freezes elapsed time, dread springs and mask despite M input', { elapsed: frozen.elapsed, maskOn: frozen.player.maskOn });
    await page.getByRole('button', { name: 'Reprendre', exact: true }).click(); await canvas.focus(); await page.waitForTimeout(200);
    const resumed = await read('native-resumed'); assert.equal(resumed.paused, false); assert.ok(resumed.elapsed > frozen.elapsed);
    await page.keyboard.press('KeyM'); await page.waitForTimeout(160); assert.equal((await read('post-resume-mask-off')).player.maskOn, false);
    await capture('09-post-resume-mask-off', { canvas: true });
    await page.getByRole('button', { name: 'Mettre en pause, consulter la carte et le sac', exact: true }).click();
    const suspendedState = await read('before-native-suspend');
    await page.getByRole('button', { name: 'Suspendre et sauvegarder', exact: true }).click();
    await canvas.waitFor({ state: 'detached' }); await capture('10-native-suspended-return');
    const finalSave = await stored(); assert.deepEqual(finalSave.appearance, coiffed.appearance);
    assert.equal(finalSave.missionProgress['jungle-vey'].completions, coiffed.missionProgress['jungle-vey'].completions);
    assert.deepEqual(finalSave.missionProgress, coiffed.missionProgress);
    assert.deepEqual(finalSave.profile, coiffed.profile);
    const activeHunt = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), api.ACTIVE_HUNT_STORAGE_KEY); assert.ok(activeHunt);
    assert.equal(activeHunt.snapshot.checkpoint.player.maskOn, false);
    assert.deepEqual(activeHunt.configuration.appearance, coiffed.appearance);
    await fs.writeFile(path.join(out, 'native-suspended-hunt.json'), JSON.stringify(activeHunt, null, 2));
    await fs.writeFile(path.join(out, 'final-campaign.json'), JSON.stringify(finalSave, null, 2));
    pass('T04 native suspension returns to campaign without a fabricated hunt success or changing equipped cosmetics', { elapsed: suspendedState.elapsed, activeHuntPresent: true, suspendedMaskOn: activeHunt.snapshot.checkpoint.player.maskOn, appearanceSha256: sha(JSON.stringify(finalSave.appearance)), completions: finalSave.missionProgress['jungle-vey'].completions, missionProgressAndProfileUnchanged: true });
    await observation.close(); observation = null;
    await page.reload({ waitUntil: 'networkidle' });
    assert.deepEqual((await stored()).appearance, coiffed.appearance);
    const durableSidecar = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), api.ACTIVE_HUNT_STORAGE_KEY);
    assert.deepEqual(durableSidecar, activeHunt); await capture('11-native-reload-suspended');
    pass('T04 durable reload keeps the native suspended-hunt receipt and equipped Ogre/decal appearance', { activeHuntSha256: sha(JSON.stringify(durableSidecar)) });
    if (await page.locator('[data-menu-section="campaign"]').isVisible()) await page.locator('[data-menu-section="campaign"]').click();
    await page.locator('[data-menu-action="continue"]').click();
    await page.getByRole('button', { name: /^Reprendre la chasse ·/ }).click();
    await canvas.waitFor({ timeout: 90000 }); await canvas.focus();
    observation = await inspectNativeHunt20261109(page);
    const reloaded = await read('actual-resumed-after-durable-reload');
    assert.equal(reloaded.player.maskOn, false); assert.equal(reloaded.player.health, suspendedState.player.health);
    assert.deepEqual((await stored()).appearance, coiffed.appearance);
    await capture('12-durable-resumed-still-unmasked', { canvas: true });
    await page.keyboard.press('KeyM'); await page.waitForTimeout(160);
    assert.equal((await read('durable-resumed-mask-on-again')).player.maskOn, true);
    await capture('13-durable-resumed-mask-on-again', { canvas: true });
    pass('T04 native resume after reload restores the actual unmasked hunt and permits wearing the unchanged Ogre mask again', { restoredMaskOn: reloaded.player.maskOn, health: reloaded.player.health });
    await page.getByRole('button', { name: 'Mettre en pause, consulter la carte et le sac', exact: true }).click();
    await page.getByRole('button', { name: 'Suspendre et sauvegarder', exact: true }).click();
    await canvas.waitFor({ state: 'detached' });
    assert.deepEqual((await stored()).missionProgress, coiffed.missionProgress);
  }
  await Promise.all(pending); report.sourceAfter = await identity(); assert.equal(report.sourceAfter.sha256, report.sourceBefore.sha256);
  assert.equal((await fs.readFile(path.join(root, '.next/BUILD_ID'), 'utf8')).trim(), report.buildId);
  for (const key of ['errors', 'consoleErrors', 'httpErrors', 'requestFailures', 'resourceMismatches']) assert.deepEqual(report[key], [], key);
  pass('Exact application sources and served Next production JavaScript stay unchanged', { sourceSha256: report.sourceBefore.sha256, files: report.sourceBefore.files.length, buildId: report.buildId, scriptResponses: report.servedScripts.length });
  report.passed = true;
} catch (error) {
  report.failure = error.stack; console.error(error); process.exitCode = 1;
  if (page && !page.isClosed()) {
    await fs.writeFile(path.join(out, 'failure-dom.json'), JSON.stringify(await page.evaluate(() => ({ buttons: [...document.querySelectorAll('button')].filter(node => node.getBoundingClientRect().width).map(node => node.innerText), headings: [...document.querySelectorAll('h1,h2,h3')].filter(node => node.getBoundingClientRect().width).map(node => node.innerText) })), null, 2)).catch(() => undefined);
    await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => undefined);
  }
} finally {
  report.finishedAt = new Date().toISOString(); await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(out, 'recipe-used.mjs'), recipeBytes);
  await observation?.close().catch(() => undefined); await browser?.close();
}
