/** Native workshop and Homeworld checks for B136-0374 / 0375 and a bounded
 * B136-0376 mask session. The only save fixture is the initial adult campaign.
 * Native controls perform the edits. Two storage faults exercise real refusals.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = new URL(process.env.PHG_QA_URL || 'http://127.0.0.1:3121');
const output = path.resolve(root, process.env.PHG_QA_OUTPUT || 'outputs/phg-decal-parity');
const sha = data => createHash('sha256').update(data).digest('hex');
const colors = [
  { channel: 'skin', field: 'skinHex', input: '#chromatic-color-skin', hex: '#346b50' },
  { channel: 'dreads', field: 'dreadHex', input: '#chromatic-color-dreads', hex: '#644e79' },
  { channel: 'outfit', field: 'outfitHex', input: '#chromatic-color-outfit', hex: '#295c67' },
  { channel: 'armor', field: 'armorHex', input: '#chromatic-color-armor', hex: '#945a38' },
  { channel: 'biomask', field: 'maskHex', input: '#chromatic-mask-color-v131', hex: '#736781' },
];
const report = {
  startedAt: new Date().toISOString(), url: url.href,
  criteria: ['B136-0374', 'B136-0375', 'B136-0376 (bounded)'],
  scope: '48 catalogue choices and five pigments on one classic custom hunter, then one actual Homeworld visit after reload. Renderer comparison uses mask sources, atlas cells and pigments; the two scenes intentionally have different transforms.',
  fixture: 'One initial adult defaultSave with custom appearance, native Jungle mask and muted audio. No pigments or motifs seeded.',
  limits: ['No human art or official UV validation', 'No other morphologies or three-angle review', 'Bounded mask cycle test, not the separate hour-long materials endurance run'],
  decals: [], colors: [], screenshots: [], errors: [], assetResponses: {},
};
let browser, context, page, tracing = false;

async function openCampaign() {
  const menu = page.locator('[data-campaign-menu]');
  await menu.waitFor();
  const campaign = menu.locator('[data-menu-section="campaign"]');
  if (await campaign.isVisible()) await campaign.click();
  await menu.locator('[data-menu-action="continue"]').click();
  await page.locator('[data-campaign-session]').waitFor();
}

async function openWorkshop() {
  await page.getByRole('button', { name: 'Console du vaisseau', exact: true }).click();
  const ship = page.locator('[data-ship-room]');
  await ship.getByRole('navigation', { name: 'Salles du vaisseau' }).getByRole('button', { name: 'Armurerie', exact: true }).click();
  await ship.getByRole('button', { name: /Personnaliser le chasseur/ }).click();
  await page.locator('[data-hunter-chromatics-v113]').waitFor();
}

async function capture(target, filename) {
  await target.locator('img').evaluateAll(async images => {
    await Promise.all(images.map(img => img.decode()));
    if (images.some(img => !img.naturalWidth)) throw Error('A sprite failed to decode');
  });
  const bytes = await target.screenshot({ path: path.join(output, filename), animations: 'disabled' });
  report.screenshots.push({ filename, sha256: sha(bytes) });
}

async function decalState(root, zone, id, atlasPath) {
  const layer = root.locator('[data-yautja-decal-zone="' + zone + '"][data-yautja-decal-id="' + id + '"]');
  await layer.first().waitFor({ state: 'attached' });
  const rows = await layer.evaluateAll(nodes => nodes.map(node => {
    const owner = getComputedStyle(node.querySelector('[data-decal-mask-owner-v139]'));
    const cell = getComputedStyle(node.querySelector('[data-decal-projected-cell-v139]'));
    return { mask: owner.maskImage, repeat: owner.maskRepeat, atlas: cell.backgroundImage,
      cellPosition: cell.backgroundPosition, cellSize: cell.backgroundSize };
  }));
  for (const row of rows) {
    assert.match(row.mask, /^url\(/, zone + ' needs its real alpha owner');
    assert.equal(row.repeat, 'no-repeat');
    assert.ok(row.atlas.includes(atlasPath), id + ' must render from the V133 atlas');
  }
  return rows;
}

async function pigmentState(root, { channel, hex }) {
  const selector = '[data-chromatic-channel="' + channel + '"]';
  const rgb = 'rgb(' + hex.slice(1).match(/../g).map(pair => parseInt(pair, 16)).join(', ') + ')';
  await page.waitForFunction(({ root, selector, rgb }) => {
    const target = document.querySelector(root);
    return target && [...target.querySelectorAll(selector)].some(node =>
      getComputedStyle(node.firstElementChild ?? node).backgroundColor === rgb);
  }, { root, selector, rgb });
  return rgb;
}

await mkdir(output, { recursive: true });
await writeFile(path.join(output, 'run.lock'), report.startedAt, { flag: 'wx' });
try {
  report.commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  report.buildId = (await readFile(path.join(root, '.next/BUILD_ID'), 'utf8')).trim();
  const bundle = await build({
    stdin: {
      contents: [
        "export { defaultSave, parseSaveImport, SAVE_STORAGE_KEY } from './app/game/save';",
        "export { DECAL_ATLAS_PATH_V133, DECAL_FIELDS_V133, DECAL_ZONES_V133, Y_A_U_T_J_A_DECALS_V133 } from './app/game/yautjaDecalsV133';",
      ].join('\n'), resolveDir: root,
    },
    bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
  });
  const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  assert.equal(api.Y_A_U_T_J_A_DECALS_V133.length, 48);
  const initial = api.defaultSave('2026-11-20T14:00:00.000Z');
  initial.profile.hunterName = 'QA Atelier Homeworld';
  initial.settings.masterVolume = 0;
  initial.appearance.presetId = 'custom';
  assert.equal(api.parseSaveImport(JSON.stringify(initial)).failure, null);
  browser = await chromium.launch(process.env.CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.CHROMIUM_EXECUTABLE }
    : { channel: process.env.AUDIT_CHROME_CHANNEL || 'chrome' });
  report.browserVersion = browser.version();
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    storageState: { cookies: [], origins: [{ origin: url.origin, localStorage: [
      { name: api.SAVE_STORAGE_KEY, value: JSON.stringify(initial) },
    ] }] },
  });
  await context.tracing.start({ screenshots: true, snapshots: true });
  tracing = true;
  page = await context.newPage();
  page.setDefaultTimeout(30_000);
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => {
    const resource = new URL(response.url());
    if (resource.origin !== url.origin || !resource.pathname.startsWith('/game/')) return;
    if (response.status() >= 400) report.errors.push(resource.pathname + ' returned HTTP ' + response.status());
    if (resource.pathname === api.DECAL_ATLAS_PATH_V133) report.assetResponses[resource.pathname] = response.status();
  });

  await page.goto(url.href, { waitUntil: 'domcontentloaded' });
  await openCampaign();
  await openWorkshop();
  const forge = page.locator('[data-hunter-chromatics-v113]');
  const previewSelector = '.customization-preview [data-hunter-rig]';
  const preview = page.locator(previewSelector);
  assert.equal(await preview.getAttribute('data-mask'), initial.appearance.biomaskId);
  const stored = () => page.evaluate(key => localStorage.getItem(key), api.SAVE_STORAGE_KEY);
  const before = await stored();
  assert(before, 'the active campaign must be readable before the first edit');
  const chosen = {};
  for (const zone of api.DECAL_ZONES_V133) {
    const select = forge.locator('#decal-v133-' + zone);
    const ids = api.Y_A_U_T_J_A_DECALS_V133.filter(decal => decal.zone === zone).map(decal => decal.id);
    const options = await select.locator('option').evaluateAll(nodes => nodes.map(node => node.value).filter(Boolean));
    assert.deepEqual([...options].sort(), [...ids].sort(), zone + ' catalogue coverage');
    for (const id of ids) {
      await select.selectOption(id);
      await preview.locator('[data-yautja-decal-zone="' + zone + '"]:not([data-yautja-decal-id="' + id + '"])').first().waitFor({ state: 'detached' });
      const layers = await decalState(preview, zone, id, api.DECAL_ATLAS_PATH_V133);
      assert.equal(await stored(), before, 'previewing ' + id + ' must not write the save');
      report.decals.push({ zone, id, layers });
      chosen[zone] = id;
    }
    await capture(preview, 'atelier-' + zone + '.png');
  }
  assert.equal(report.decals.length, 48);
  for (const color of colors) {
    await forge.locator(color.input).fill(color.hex);
    report.colors.push({ ...color, computed: await pigmentState(previewSelector, color) });
    assert.equal(await stored(), before, 'previewing ' + color.channel + ' must not write the save');
  }
  await capture(preview, 'atelier-palette.png');
  const workshopDecals = {};
  for (const [zone, id] of Object.entries(chosen)) {
    workshopDecals[zone] = await decalState(preview, zone, id, api.DECAL_ATLAS_PATH_V133);
  }

  const confirm = forge.getByRole('button', { name: 'Valider les couleurs et matières', exact: true });
  await confirm.press('Enter');
  await page.waitForFunction(({ key, before }) => localStorage.getItem(key) !== before, { key: api.SAVE_STORAGE_KEY, before });
  const after = await stored();
  const result = api.parseSaveImport(after);
  assert(result.save, result.failure);
  assert.equal(result.save.createdAt, initial.createdAt);
  assert.equal(result.save.profile.honor, initial.profile.honor);
  assert.equal(result.save.profile.clanMarks, initial.profile.clanMarks);
  const persisted = result.save.appearance.chromaticsV113;
  for (const [zone, id] of Object.entries(chosen)) assert.equal(persisted[api.DECAL_FIELDS_V133[zone]], id);
  for (const { field, hex } of colors) assert.equal(persisted[field], hex);
  report.persisted = { chromatics: persisted, beforeSha256: sha(before), afterSha256: sha(after) };

  const maskId = result.save.appearance.biomaskId;
  assert.equal(maskId, 'jungle', 'The initial recipe uses the native Jungle Hunter mask');
  const maskLayers = preview.locator('[data-chromatic-channel="biomask"], [data-yautja-decal-zone="biomask"]');
  const rigControls = page.locator('.customization-preview .rig-state-controls');
  const wear = rigControls.getByRole('button', { name: 'Porter mask', exact: true });
  const remove = rigControls.getByRole('button', { name: 'Retirer mask', exact: true });
  const maskOptions = page.locator('.customization-section').filter({
    has: page.getByRole('heading', { name: 'Biomask', exact: true }),
  });
  const uncover = maskOptions.getByRole('button', { name: /Visage découvert/ });
  const equip = maskOptions.getByRole('button', { name: /Jungle Hunter/ });

  async function waitMask(worn) {
    await page.waitForFunction(({ selector, value }) =>
      document.querySelector(selector)?.getAttribute('data-mask') === value,
    { selector: previewSelector, value: worn ? maskId : 'off' });
    if (worn) {
      await preview.locator('[data-chromatic-channel="biomask"]').first().waitFor({ state: 'attached' });
      await decalState(preview, 'biomask', chosen.biomask, api.DECAL_ATLAS_PATH_V133);
    } else {
      assert.equal(await maskLayers.count(), 0);
    }
  }

  async function checkRefusedMask(option, worn) {
    const unchanged = await stored();
    const restore = await page.evaluateHandle(key => {
      const original = Storage.prototype.setItem;
      let refused = 0;
      Storage.prototype.setItem = function (item, value) {
        if (this === localStorage && item === key) {
          refused += 1;
          throw new DOMException('Refus de stockage volontaire pour la recette', 'QuotaExceededError');
        }
        return original.call(this, item, value);
      };
      return () => { Storage.prototype.setItem = original; return refused; };
    }, api.SAVE_STORAGE_KEY);
    let refused;
    try {
      await option.click();
      await page.getByRole('status').filter({ hasText: /Personnalisation non confirmée/ }).waitFor();
      await waitMask(worn);
      assert.equal(await stored(), unchanged, 'A refused selection keeps the campaign bytes');
      assert.equal(await (worn ? equip : uncover).getAttribute('aria-pressed'), 'true');
    } finally {
      refused = await restore.evaluate(undo => undo());
      await restore.dispose();
    }
    assert.equal(refused, 1, 'The fault must refuse exactly the requested write');
  }

  const maskStarted = Date.now();
  const previewCycles = 24;
  for (let cycle = 0; cycle < previewCycles; cycle += 1) {
    await remove.click();
    await waitMask(false);
    assert.equal(await stored(), after, 'Preview removal does not write the campaign');
    await wear.click();
    await waitMask(true);
    assert.equal(await stored(), after, 'Preview re-equipping does not write the campaign');
  }

  await checkRefusedMask(uncover, true);
  await uncover.click();
  await waitMask(false);
  const unmasked = api.parseSaveImport(await stored()).save;
  assert.equal(unmasked?.appearance.biomaskId, null);
  assert.equal(unmasked?.createdAt, initial.createdAt);
  assert.deepEqual(unmasked?.profile, result.save.profile);
  await capture(preview, 'atelier-biomask-retire.png');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await openCampaign();
  await openWorkshop();
  await waitMask(false);
  assert.equal(await wear.isDisabled(), true);
  assert.equal(await wear.getAttribute('aria-pressed'), 'false');
  assert.equal(api.parseSaveImport(await stored()).save?.appearance.biomaskId, null);

  const pieceForge = page.locator('[data-hunter-pieces-v146]');
  const plasmaColor = pieceForge.locator('label').filter({ hasText: "Plasma et tirs d'énergie" }).locator('input[type="color"]');
  const newPlasmaColor = '#257085';
  const beforeLightDraft = await stored();
  await pieceForge.getByRole('tab', { name: 'Lumières', exact: true }).click();
  await plasmaColor.fill(newPlasmaColor);
  assert.equal(await stored(), beforeLightDraft, 'An independent light draft does not write the campaign');

  await checkRefusedMask(equip, false);
  await equip.click();
  await waitMask(true);
  assert.equal(await plasmaColor.inputValue(), newPlasmaColor, 'Equipping the mask preserves the independent light draft');
  const equipped = api.parseSaveImport(await stored()).save;
  assert.deepEqual(equipped?.appearance, result.save.appearance, 'The same mask recovers its original pigment and decal');
  assert.deepEqual(equipped?.profile, result.save.profile);
  assert.deepEqual(equipped?.inventory, result.save.inventory);
  await pieceForge.getByRole('button', { name: 'Confirmer les couleurs', exact: true }).click();
  await page.waitForFunction(({ key, value }) =>
    JSON.parse(localStorage.getItem(key))?.appearance?.lightsV146?.plasma === value,
  { key: api.SAVE_STORAGE_KEY, value: newPlasmaColor });
  assert.deepEqual(api.parseSaveImport(await stored()).save?.appearance, {
    ...result.save.appearance,
    lightsV146: { ...result.save.appearance.lightsV146, plasma: newPlasmaColor },
  }, 'Confirming the independent light never restores an earlier mask');
  await waitMask(true);
  await capture(preview, 'atelier-biomask-porte.png');
  report.biomaskSession = {
    previewCycles, failedDurableWrites: 2, confirmedDurableChanges: 2,
    independentLightDraftPreserved: true,
    durationMs: Date.now() - maskStarted, originalMaskRestored: true,
  };

  await page.reload({ waitUntil: 'domcontentloaded' });
  await openCampaign();
  await page.getByRole('button', { name: 'Yautja Prime · monde natal', exact: true }).click();
  const hubSelector = '[data-homeworld-hub][data-homeworld-motion-ready="true"]';
  const homeSelector = hubSelector + ' [data-homeworld-actor] [data-modular-homeworld-character]';
  const home = page.locator(homeSelector);
  await home.waitFor({ state: 'visible' });
  const signatures = rows => [...new Set(rows.map(row => JSON.stringify(row)))].sort();
  const homeDecals = {};
  for (const [zone, id] of Object.entries(chosen)) {
    homeDecals[zone] = await decalState(home, zone, id, api.DECAL_ATLAS_PATH_V133);
    assert.deepEqual(signatures(homeDecals[zone]), signatures(workshopDecals[zone]), zone + ': mask and atlas cell parity');
  }
  for (const color of colors) await pigmentState(homeSelector, color);
  report.homeworld = { decals: homeDecals, pigments: colors.map(color => color.channel) };
  await capture(home, 'homeworld-palette.png');
  assert.ok(report.assetResponses[api.DECAL_ATLAS_PATH_V133] < 400, 'the real decal atlas must have loaded');
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.stack;
  await page?.screenshot({ path: path.join(output, 'failure.png'), timeout: 5_000 }).catch(() => undefined);
  process.exitCode = 1;
  console.error(error);
} finally {
  if (tracing) await context.tracing.stop({ path: path.join(output, 'trace.zip') });
  report.finishedAt = new Date().toISOString();
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser?.close();
}
