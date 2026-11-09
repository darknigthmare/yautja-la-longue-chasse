/** Native Next GameClient customization. Only the initial adult campaign and
 * class are fixtures; every palette/decal change is a real UI action. This is
 * technical regression evidence, never a PHG UV or artistic 1:1 approval. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.PHG_QA_URL || 'http://127.0.0.1:3121';
const output = path.resolve(root, process.env.PHG_QA_OUTPUT || 'outputs/phg-p0p1-20261109');
const probe = process.argv.includes('--probe');
const sha = data => createHash('sha256').update(data).digest('hex');
async function tree(dir) {
  const names = [];
  for (const entry of await fs.readdir(path.join(root, dir), { withFileTypes: true })) {
    const file = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) names.push(...await tree(file)); else if (entry.isFile()) names.push(file);
  }
  return names.sort();
}
async function identity() {
  const rows = [];
  for (const file of [...await tree('app'), ...await tree('desktop'), 'package.json', 'package-lock.json'].sort()) {
    const data = await fs.readFile(path.join(root, file)); rows.push({ path: file, bytes: data.length, sha256: sha(data) });
  }
  return { sha256: sha(JSON.stringify(rows)), files: rows };
}
await fs.mkdir(output, { recursive: true });
await fs.writeFile(path.join(output, 'run.lock'), new Date().toISOString(), { flag: 'wx' });
const bundle = await build({ stdin: { contents: [
  "export {defaultSave,SAVE_STORAGE_KEY,parseSaveImport} from './app/game/save';",
  "export {appearanceForPreset,loadoutForPreset} from './app/game/hunterLore';",
  "export {PHG_OGRE_BIOMASK_ID_V131} from './app/game/phgBiomaskTintsV131';",
  "export {DECAL_FIELDS_V133,Y_A_U_T_J_A_DECALS_V133} from './app/game/yautjaDecalsV133';",
  "export {PHG_WARPAINT_EVIDENCE_V133} from './app/game/yautjaDecalsV133';",
].join('\n'), resolveDir: root }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const report = { startedAt: new Date().toISOString(), url, fixture: 'Initial adult defaultSave and selected class only; no palette or decal reward/result seeded.',
  scope: 'Native Next GameClient controls and durable campaign palette; no official PHG pixel comparison, three-angle art approval, physical controller or long soak claim.',
  sourceBefore: await identity(), checks: [], errors: [], consoleErrors: [], httpErrors: [], requestFailures: [], servedScripts: [], resourceMismatches: [], screenshots: [], browserVersion: null, buildId: null,
  limits: { nativeViewAngles: 'Only the orientation actually offered by customization is exercised; no face/profile/back views are invented.',
    physicalController: false, longSoak60Minutes: false, officialPhgUvComparison: false, humanArtApproval: false },
  recipeSha256: sha(await fs.readFile(fileURLToPath(import.meta.url))), saveObservations: [] };
const pass = (name, detail) => { report.checks.push({ name, passed: true, detail }); console.log('PASS', name); };
let browser, activePage;
const responses = [];
try {
  report.buildId = (await fs.readFile(path.join(root, '.next/BUILD_ID'), 'utf8')).trim();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium', headless: true });
  report.browserVersion = browser.version();
  for (const preset of ['alpha', 'samurai']) {
    const initial = api.defaultSave('2026-11-09T14:00:00.000Z');
    initial.profile.hunterName = 'QA PHG ' + preset;
    initial.settings.masterVolume = 0;
    initial.appearance = api.appearanceForPreset(preset);
    initial.loadout = api.loadoutForPreset(preset);
    assert.equal(api.parseSaveImport(JSON.stringify(initial)).failure, null);
    await fs.writeFile(path.join(output, 'initial-' + preset + '.json'), JSON.stringify(initial, null, 2));
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await context.addInitScript(({ key, save }) => {
      if (!['http:', 'https:'].includes(location.protocol) || sessionStorage.getItem('phg-qa-initialized')) return;
      localStorage.setItem(key, JSON.stringify(save)); sessionStorage.setItem('phg-qa-initialized', 'true');
    }, { key: api.SAVE_STORAGE_KEY, save: initial });
    const page = await context.newPage(); activePage = page; page.setDefaultTimeout(30000);
    page.on('pageerror', e => report.errors.push(e.message));
    page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
    page.on('response', response => {
      if (response.status() >= 400 && response.url().startsWith(url)) report.httpErrors.push({ url: response.url(), status: response.status() });
      const pathname = new URL(response.url()).pathname;
      if (pathname.startsWith('/_next/static/') && pathname.endsWith('.js')) responses.push((async () => {
        const bytes = await response.body(), local = path.join(root, '.next', decodeURIComponent(pathname.slice('/_next/'.length)));
        const expected = await fs.readFile(local); assert.equal(sha(bytes), sha(expected), pathname);
        report.servedScripts.push({ pathname, sha256: sha(bytes) });
      })().catch(error => report.resourceMismatches.push(error.message)));
    });
    page.on('requestfailed', request => report.requestFailures.push({ url: request.url(), failure: request.failure() }));
    const openForge = async ({ reload = false } = {}) => {
      if (reload) await page.reload({ waitUntil: 'networkidle' });
      if (await page.locator('[data-campaign-menu]').isVisible()) {
        if (await page.locator('[data-menu-section="campaign"]').isVisible()) await page.locator('[data-menu-section="campaign"]').click();
        await page.locator('[data-menu-action="continue"]').click();
      }
      await page.locator('[data-campaign-session]').waitFor({ timeout: 90000 });
      if (await page.locator('[data-hunter-chromatics-v113]').isVisible()) return;
      const consoleButton = page.getByRole('button', { name: 'Console du vaisseau', exact: true });
      if (await consoleButton.isVisible()) await consoleButton.click();
      const ship = page.locator('[data-ship-room]');
      await ship.waitFor();
      await ship.getByRole('navigation', { name: 'Salles du vaisseau' }).getByRole('button', { name: 'Armurerie', exact: true }).click();
      await ship.getByRole('button', { name: /Personnaliser le chasseur/ }).click();
      await page.locator('[data-hunter-chromatics-v113]').waitFor();
    };
    await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
    await page.locator('[data-campaign-menu]').waitFor();
    await openForge();
    const forge = page.locator('[data-hunter-chromatics-v113]'); await forge.waitFor();
    if (probe) {
      const state = await page.evaluate(() => ({ buttons: Array.from(document.querySelectorAll('button')).filter(e => e.getBoundingClientRect().width).map(e => e.innerText).slice(-90),
        selects: Array.from(document.querySelectorAll('select')).filter(e => e.getBoundingClientRect().width).map(e => ({ id: e.id, options: Array.from(e.options).map(o => ({ value: o.value, text: o.text })) })) }));
      await fs.writeFile(path.join(output, 'probe-' + preset + '.json'), JSON.stringify(state, null, 2));
      pass(preset + ' native customization opened', state.selects.map(s => [s.id, s.options.length]));
      await context.close(); continue;
    }
    const storedRaw = () => page.evaluate(key => localStorage.getItem(key), api.SAVE_STORAGE_KEY);
    const stored = async () => JSON.parse(await storedRaw());
    let observation = 0;
    const recordSave = async (label, before) => {
      const after = await storedRaw();
      const file = `${preset}-save-${String(++observation).padStart(2, '0')}-${label}.json`;
      await fs.writeFile(path.join(output, file), JSON.stringify({ label, before: JSON.parse(before), after: JSON.parse(after) }, null, 2));
      report.saveObservations.push({ preset, label, filename: file, beforeSha256: sha(before), afterSha256: sha(after) });
    };
    const commit = async (label, { keyboard = false } = {}) => {
      const before = await storedRaw();
      const confirm = forge.getByRole('button', { name: 'Valider les couleurs et matières', exact: true });
      if (keyboard) { await confirm.focus(); await confirm.press('Enter'); } else await confirm.click();
      await page.waitForFunction(({ key, before }) => localStorage.getItem(key) !== before, { key: api.SAVE_STORAGE_KEY, before });
      assert.equal(api.parseSaveImport(await storedRaw()).failure, null);
      await recordSave(label, before);
    };
    const rig = page.locator('.customization-preview [data-hunter-rig]');
    const section = title => page.locator('.customization-section').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
    const chooseOption = async (title, label) => {
      const before = await storedRaw();
      await section(title).locator('button.appearance-option').filter({ has: page.locator('strong').filter({ hasText: new RegExp('^' + label + '$') }) }).click();
      if (await storedRaw() !== before) await recordSave(title.toLowerCase().replace(/[^a-z]+/g, '-') + '-' + label.toLowerCase().replace(/[^a-z]+/g, '-'), before);
    };
    const screenshot = async name => {
      await rig.scrollIntoViewIfNeeded();
      await rig.locator('img').evaluateAll(images => Promise.all(images.map(image => image.complete ? undefined : image.decode().catch(() => undefined))));
      const missing = await rig.locator('img').evaluateAll(images => images.filter(image => !image.complete || image.naturalWidth <= 0).map(image => image.src));
      assert.deepEqual(missing, [], 'all actual rig image layers decode');
      const filename = `${preset}-${name}.png`, target = path.join(output, filename);
      await rig.screenshot({ path: target });
      report.screenshots.push({ filename, sha256: sha(await fs.readFile(target)), inspected: false, viewport: page.viewportSize(), scope: 'Actual native preview; current offered orientation only.' });
    };
    const layers = () => rig.evaluate(element => ({
      morph: element.dataset.bodyMorph, mask: element.dataset.mask,
      maskSurface: Array.from(element.querySelectorAll('[data-chromatic-channel="biomask"]')).map(node => ({ background: getComputedStyle(node.lastElementChild ?? node).backgroundImage })),
      decals: Array.from(element.querySelectorAll('[data-yautja-decal-zone]')).map(node => {
        const owner = node.querySelector('[data-decal-mask-owner-v139]'); const cell = node.querySelector('[data-decal-projected-cell-v139]');
        const transformChain = [];
        for (let ancestor = node; ancestor && ancestor !== element; ancestor = ancestor.parentElement) {
          const transform = getComputedStyle(ancestor).transform;
          if (transform !== 'none') transformChain.push(transform);
        }
        return { zone: node.dataset.yautjaDecalZone, id: node.dataset.yautjaDecalId, transform: getComputedStyle(node).transform,
          transformChain,
          maskImage: getComputedStyle(owner).maskImage, maskRepeat: getComputedStyle(owner).maskRepeat,
          owner: { left: owner.style.left, top: owner.style.top, width: owner.style.width, height: owner.style.height },
          cell: { left: cell.style.left, top: cell.style.top, width: cell.style.width, height: cell.style.height },
          opacity: getComputedStyle(cell).opacity };
      }),
      bodySources: Array.from(element.querySelectorAll('[data-rig-slot^="body-"]')).map(node => ({ slot: node.dataset.rigSlot, src: node.currentSrc || node.src })),
    }));
    const armorClipParity = () => rig.locator('[data-chromatic-channel="armor"]').evaluateAll(nodes => nodes.map(node => {
      const source = node.previousElementSibling;
      return { slot: source?.dataset.rigSlot ?? node.parentElement?.dataset.rigArmorWrap ?? null,
        nativeClip: source ? getComputedStyle(source).clipPath : null,
        pigmentClip: getComputedStyle(node).clipPath,
        sourceUrl: source?.currentSrc ?? source?.src ?? null };
    }));
    if (preset === 'samurai') await screenshot('native-no-chromatics');
    const maskSelect = forge.locator('#chromatic-mask-material-v131');
    const options = await maskSelect.locator('option').evaluateAll(items => items.map(i => ({ value: i.value, label: i.textContent })));
    if (preset === 'alpha') {
      assert.ok(options.some(o => o.value === api.PHG_OGRE_BIOMASK_ID_V131));
      const before = await storedRaw();
      await forge.locator('#chromatic-color-skin').fill('#346b50');
      assert.equal(await storedRaw(), before, 'Draft skin color does not write the campaign');
      await commit('skin-color-keyboard', { keyboard: true });
      await maskSelect.selectOption(api.PHG_OGRE_BIOMASK_ID_V131); await commit('alpha-ogre');
      const saved = await stored();
      assert.equal(saved.appearance.presetId, 'custom');
      assert.equal(saved.appearance.chromaticsV113.maskOriginId, 'alpha');
      assert.equal(saved.appearance.chromaticsV113.maskMaterialId, api.PHG_OGRE_BIOMASK_ID_V131);
      pass('T01 Alpha lineage survives skin customization and durable Ogre selection', { chromatics: saved.appearance.chromaticsV113 });
    } else {
      assert.equal(options.some(o => o.value === api.PHG_OGRE_BIOMASK_ID_V131), false);
      const named = options.filter(o => /Requiem|Nova/.test(o.label)); assert.equal(named.length, 2);
      await forge.locator('#chromatic-color-armor').fill('#556677'); await commit('armor-color-keyboard', { keyboard: true });
      const clips = await armorClipParity();
      assert.ok(clips.length > 0);
      assert.deepEqual(clips.filter(layer => layer.nativeClip !== layer.pigmentClip), [], 'armor pigments must keep the same cutout as every native plate, including wrapped pieces');
      assert.ok(clips.some(layer => layer.sourceUrl?.includes('shin') && layer.nativeClip !== 'none'), 'the real shin keep-rectangle is exercised');
      await fs.writeFile(path.join(output, 'samurai-armor-native-pigment-clip-parity.json'), JSON.stringify(clips, null, 2));
      await screenshot('armor-pigment-only');
      pass('P0 armor pigment preserves every native plate cutout, including the shin fragments removed from its source drawing', clips);
      for (const option of named) {
        await maskSelect.selectOption(option.value); await commit('samurai-' + option.value.replace(/[^a-z]+/g, '-'));
        const saved = await stored();
        assert.equal(saved.appearance.chromaticsV113.maskOriginId, 'samurai');
        assert.equal(saved.appearance.chromaticsV113.maskMaterialId, option.value);
      }
      pass('T02 Samurai lineage keeps both Requiem and Nova after custom armor', named);
    }
    for (const zone of ['face', 'body', 'armor', 'biomask']) {
      const item = api.Y_A_U_T_J_A_DECALS_V133.find(d => d.zone === zone); assert.ok(item);
      const before = await storedRaw();
      await forge.locator('#decal-v133-' + zone).selectOption(item.id);
      assert.equal(await storedRaw(), before, 'Decal preview is read-only');
      await commit('decal-' + zone);
      assert.equal((await stored()).appearance.chromaticsV113[api.DECAL_FIELDS_V133[zone]], item.id);
      const currentLayers = await layers();
      assert.ok(currentLayers.decals.some(layer => layer.zone === zone && layer.id === item.id));
      pass(`${preset} T${{ face: '05', body: '06', armor: '07', biomask: '08' }[zone]} native ${zone} decal persists with its actual masked owner`, currentLayers.decals.filter(layer => layer.zone === zone));
    }
    await rig.waitFor(); assert.notEqual(await rig.getAttribute('data-mask'), 'off');
    await screenshot('palette');

    const durableAppearance = (await stored()).appearance;
    await openForge({ reload: true });
    assert.deepEqual((await stored()).appearance, durableAppearance);
    assert.equal(await maskSelect.inputValue(), durableAppearance.chromaticsV113.maskMaterialId);
    for (const zone of ['face', 'body', 'armor', 'biomask']) assert.equal(await forge.locator('#decal-v133-' + zone).inputValue(), durableAppearance.chromaticsV113[api.DECAL_FIELDS_V133[zone]]);
    pass(preset + ' durable reload restores the committed palette and all four real controls', { appearanceSha256: sha(JSON.stringify(durableAppearance)) });

    const beforePreview = await storedRaw();
    await page.locator('.customization-preview').getByRole('button', { name: 'Retirer mask', exact: true }).click();
    assert.equal(await rig.getAttribute('data-mask'), 'off');
    assert.equal(await rig.locator('[data-chromatic-channel="biomask"], [data-yautja-decal-zone="biomask"]').count(), 0);
    assert.equal(await storedRaw(), beforePreview, 'temporary inspection does not remove saved equipment');
    await screenshot('mask-inspection-off');
    await page.locator('.customization-preview').getByRole('button', { name: 'Porter mask', exact: true }).click();
    assert.equal(await rig.getAttribute('data-mask'), durableAppearance.biomaskId);
    assert.equal(await rig.locator('[data-yautja-decal-zone="biomask"]').count(), 1);
    pass(preset + ' T04 preview removal hides both the biomask pigment and decal without writing equipment');

    await chooseOption('Biomask', 'Visage découvert');
    assert.equal((await stored()).appearance.biomaskId, null);
    assert.equal(await rig.getAttribute('data-mask'), 'off');
    assert.equal(await rig.locator('[data-yautja-decal-zone="biomask"]').count(), 0);
    await screenshot('durable-unmasked');
    await openForge({ reload: true });
    assert.equal((await stored()).appearance.biomaskId, null);
    assert.equal(await rig.getAttribute('data-mask'), 'off');
    pass(preset + ' T04 durable biomask removal survives reload and has no worn-mask layers');

    if (preset === 'alpha') {
      await chooseOption('Biomask', 'City Hunter');
      assert.equal((await stored()).appearance.biomaskId, 'city');
      assert.equal((await maskSelect.locator('option').allTextContents()).some(value => /Ogre/.test(value)), false);
      assert.equal(await maskSelect.inputValue(), '');
      const city = await layers();
      assert.ok(city.maskSurface.every(layer => layer.background === 'none'), 'Ogre texture cannot paint City geometry');
      // A subsequent ordinary pigment confirmation also cleans the unavailable
      // saved finish; no crafted draft or forged lineage is sent by the recipe.
      await forge.locator('#chromatic-mask-color-v131').fill('#6b7275');
      await commit('city-natural-geometry');
      assert.equal((await stored()).appearance.chromaticsV113.maskMaterialId, null);
      await openForge({ reload: true });
      assert.equal(await rig.getAttribute('data-mask'), 'city');
      assert.equal((await stored()).appearance.chromaticsV113.maskMaterialId, null);
      await screenshot('city-no-ogre');
      pass('T03 Alpha-to-City rejects Ogre on actual geometry, clears the unavailable finish on confirmation and reloads cleanly', city);

      const matrix = [];
      for (const [morphId, label] of [['classic', 'Classique'], ['elder', 'Elder'], ['super', 'Super'], ['feral', 'Feral'], ['huntress', 'Huntress'], ['young', 'Young Blood']]) {
        await chooseOption('Morphologie', label);
        assert.equal(await rig.getAttribute('data-body-morph'), morphId);
        const current = await layers();
        assert.equal(current.decals.length, 4);
        for (const layer of current.decals) {
          assert.match(layer.maskImage, /^url\(/); assert.equal(layer.maskRepeat, 'no-repeat');
          assert.ok(layer.transformChain.length > 0, 'the actual layer or its native mask/head owner follows a bone transform'); assert.equal(layer.opacity, '0.82');
          assert.ok(Number.parseFloat(layer.owner.width) > 0 && Number.parseFloat(layer.owner.height) > 0);
        }
        assert.ok(current.decals.find(layer => layer.zone === 'face').maskImage.includes('head'));
        assert.ok(current.decals.find(layer => layer.zone === 'body').maskImage.includes('torso'));
        assert.ok(current.decals.find(layer => layer.zone === 'armor').maskImage.includes('chest'));
        await screenshot('morph-' + morphId); matrix.push(current);
      }
      await fs.writeFile(path.join(output, 'six-morph-dom-matrix.json'), JSON.stringify(matrix, null, 2));
      pass('T14 six real morphology selections preserve four independent alpha owners and bone transforms', { morphs: matrix.map(item => item.morph), scope: 'Technical native orientation; visual/UV fidelity and unavailable angles remain open.' });
    } else {
      await section('Archives cinéma').locator('button.hunter-preset-card').filter({ has: page.locator('strong').filter({ hasText: /^Scar$/ }) }).click();
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).appearance.presetId === 'scar', api.SAVE_STORAGE_KEY);
      const scarBefore = await layers();
      await screenshot('scar-before-clan-mark');
      const face = api.Y_A_U_T_J_A_DECALS_V133.find(item => item.zone === 'face');
      await forge.locator('#decal-v133-face').selectOption(face.id); await commit('scar-original-face-mark');
      const scarAfter = await layers();
      assert.deepEqual(scarAfter.bodySources, scarBefore.bodySources, 'an original clan mark never replaces Scar body/head source files');
      assert.ok(scarAfter.decals.some(layer => layer.zone === 'face' && layer.id === face.id));
      for (const officialName of api.PHG_WARPAINT_EVIDENCE_V133.officialNames) assert.ok((await forge.innerText()).includes(officialName));
      assert.ok((await forge.innerText()).includes('Nos motifs originaux ne sont pas présentés comme des copies 1:1'));
      await screenshot('scar-after-clan-mark');
      pass('T16 Scar base sources and original clan decal remain separate; PHG Warpaint names keep their stated limitations', { before: scarBefore, after: scarAfter, scope: 'No independent PHG Warpaint/Scar-effect selector or official pixel comparison is offered; criterion remains partial.' });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await screenshot('mobile-390');
    const layout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    assert.ok(layout.scrollWidth <= layout.width + 1, 'customization has no horizontal document overflow at 390 px');
    pass(preset + ' native keyboard confirmation and mobile viewport remain usable', layout);
    await fs.writeFile(path.join(output, 'final-' + preset + '.json'), await storedRaw());
    await Promise.all(responses); await context.close();
  }
  await Promise.all(responses);
  report.sourceAfter = await identity();
  assert.equal(report.sourceAfter.sha256, report.sourceBefore.sha256);
  assert.equal((await fs.readFile(path.join(root, '.next/BUILD_ID'), 'utf8')).trim(), report.buildId);
  assert.equal(report.errors.length, 0); assert.equal(report.httpErrors.length, 0);
  assert.equal(report.consoleErrors.length, 0); assert.equal(report.requestFailures.length, 0);
  assert.equal(report.resourceMismatches.length, 0);
  pass('Exact application sources and served production JavaScript remain identical during native PHG checks', { sourceSha256: report.sourceBefore.sha256, files: report.sourceBefore.files.length, buildId: report.buildId, scriptResponses: report.servedScripts.length });
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = error.stack; process.exitCode = 1; console.error(error);
  if (activePage && !activePage.isClosed()) {
    await fs.writeFile(path.join(output, 'failure-dom.json'), JSON.stringify(await activePage.evaluate(() => ({ title: document.title,
      buttons: Array.from(document.querySelectorAll('button')).filter(element => element.getBoundingClientRect().width).map(element => element.innerText).slice(-120),
      headings: Array.from(document.querySelectorAll('h1,h2,h3')).filter(element => element.getBoundingClientRect().width).map(element => element.innerText) })), null, 2)).catch(() => undefined);
    await activePage.screenshot({ path: path.join(output, 'failure.png') }).catch(() => undefined);
  }
}
finally {
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser?.close();
}
