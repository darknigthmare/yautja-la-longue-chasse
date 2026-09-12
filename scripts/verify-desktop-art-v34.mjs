import { _electron as electron } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DESKTOP_RELEASE_TAG, DESKTOP_VERSION } from '../desktop/release.mjs';

const evidence = path.resolve('tmp/desktop-qa', DESKTOP_RELEASE_TAG, 'art-workshops');
await fs.mkdir(evidence, { recursive: true });
const profile = await fs.mkdtemp(path.join(evidence, 'profile-'));
const executablePath = path.resolve('tmp/desktop-release', DESKTOP_RELEASE_TAG, 'Yautja-La-Longue-Chasse-win32-x64/Yautja-La-Longue-Chasse.exe');
const errors = [];
const failed = [];
const httpErrors = [];
const app = await electron.launch({ executablePath, env: { ...process.env, YAUTJA_DESKTOP_QA_PROFILE: profile }, timeout: 60000 });

function watch(page) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
  page.on('requestfailed', request => { if (request.url().startsWith('yautja:')) failed.push(request.url()); });
  page.on('response', response => {
    if (response.url().startsWith('yautja:') && response.status() >= 400) {
      httpErrors.push({ url: response.url(), status: response.status() });
    }
  });
}

async function newWindowAfter(action) {
  const pending = app.waitForEvent('window');
  await action();
  const page = await pending;
  watch(page);
  return page;
}

async function activateInterceptedLink(page, name) {
  const activated = await page.evaluate(label => {
    const link = [...document.querySelectorAll('a')].find(candidate => candidate.textContent?.includes(label));
    if (!link) return false;
    link.click();
    return true;
  }, name);
  assert(activated, 'Lien inter-route introuvable : ' + name);
}

try {
  const main = await app.firstWindow();
  watch(main);
  await main.clock.install();
  await main.reload();
  assert.equal(await app.evaluate(({ app }) => app.getVersion()), DESKTOP_VERSION);

  await main.getByRole('button', { name: 'Jouer', exact: true }).click();
  await main.getByRole('button', { name: 'THE PIT · combat', exact: true }).click();
  const lab = await newWindowAfter(() => main.getByRole('link', { name: /Atelier d’animation/ }).click({ noWaitAfter: true }));
  await lab.waitForURL('yautja://game/pit-lab');
  const gallery = await newWindowAfter(() => lab.getByRole('link', { name: /Atelier OpenAI V34/ }).click({ noWaitAfter: true }));
  await gallery.waitForURL('yautja://game/game/assets/v34/production-review/index.html');
  await gallery.waitForFunction(() => document.querySelector('#canvas')?.dataset.loaded === 'true');

  const id = 'v34-blade-fighter-viper-neca2014-chassis-r2';
  await gallery.locator('#asset').selectOption(id);
  await gallery.waitForFunction(value => {
    const canvas = document.querySelector('#canvas');
    return canvas?.dataset.assetId === value && canvas.dataset.loaded === 'true';
  }, id);
  assert.match(await gallery.locator('#digest').innerText(), /^SHA-256 [0-9a-f]{64}$/);

  const exportPath = path.join(evidence, 'exported-viper-chassis.png');
  await app.evaluate(({ session }, target) => {
    globalThis.yautjaArtDownload = new Promise(resolve => session.defaultSession.once('will-download', (_event, item) => {
      item.setSavePath(target);
      item.once('done', (_doneEvent, state) => resolve(state));
    }));
  }, exportPath);
  await gallery.locator('#source').click();
  assert.equal(await app.evaluate(() => globalThis.yautjaArtDownload), 'completed');
  const expected = await gallery.evaluate(async value => {
    const response = await fetch('./manifest.json');
    if (!response.ok) throw new Error('Packaged manifest ' + response.status);
    return (await response.json()).entries.find(entry => entry.id === value) ?? null;
  }, id);
  assert(expected);
  assert.equal(createHash('sha256').update(await fs.readFile(exportPath)).digest('hex'), expected.sha256);

  const windowCountBeforeAssembly = app.windows().length;
  const assembly = await newWindowAfter(() => gallery.getByRole('link', { name: 'Assemblage des véhicules', exact: true }).click({ noWaitAfter: true }));
  await assembly.waitForURL('yautja://game/game/assets/v34/vehicle-assembly-review/index.html');
  await assembly.waitForFunction(() => document.body.dataset.ready === 'true');
  assert.equal(app.windows().length, windowCountBeforeAssembly + 1);

  const canvas = assembly.locator('#assembly-canvas');
  const frames = new Set();
  for (let index = 0; index < 4; index += 1) {
    const data = await canvas.evaluate(element => ({ url: element.toDataURL('image/png'), dataset: { ...element.dataset } }));
    frames.add(createHash('sha256').update(data.url).digest('hex'));
    await fs.writeFile(path.join(evidence, 'ejector-pose-' + index + '.png'), Buffer.from(data.url.split(',')[1], 'base64'));
    assert.equal(await assembly.locator('#overflow').getAttribute('data-safe'), 'true');
    await assembly.locator('#next').click();
  }
  assert.equal(frames.size, 4);

  const routedWindowCount = app.windows().length;
  await assembly.getByRole('link', { name: 'Atelier V34', exact: true }).click({ noWaitAfter: true });
  await gallery.waitForURL('yautja://game/game/assets/v34/production-review/index.html');
  await gallery.waitForFunction(() => document.querySelector('#canvas')?.dataset.loaded === 'true');
  assert.equal(assembly.url(), 'yautja://game/game/assets/v34/vehicle-assembly-review/index.html');
  assert.equal(app.windows().length, routedWindowCount);

  await lab.getByRole('link', { name: /Atelier OpenAI V34/ }).click({ noWaitAfter: true });
  await gallery.waitForURL('yautja://game/game/assets/v34/production-review/index.html');
  assert.equal(app.windows().length, routedWindowCount);

  await activateInterceptedLink(gallery, 'Laboratoire THE PIT');
  await lab.waitForURL('yautja://game/pit-lab');
  assert.equal(gallery.url(), 'yautja://game/game/assets/v34/production-review/index.html');
  assert.equal(app.windows().length, routedWindowCount);

  await activateInterceptedLink(assembly, 'Retour au jeu');
  await main.waitForURL('yautja://game/');
  assert.equal(assembly.url(), 'yautja://game/game/assets/v34/vehicle-assembly-review/index.html');
  assert.equal(app.windows().length, routedWindowCount);

  const networkBlocked = await app.evaluate(async ({ session }) => {
    try {
      await session.defaultSession.fetch('https://example.com/yautja-workshop-probe');
      return false;
    } catch {
      return true;
    }
  });
  assert(networkBlocked);
  assert.deepEqual(errors, []);
  assert.deepEqual(failed, []);
  assert.deepEqual(httpErrors, []);

  const report = {
    passed: true,
    version: DESKTOP_VERSION,
    executablePath,
    checkedAt: new Date().toISOString(),
    actualNavigation: {
      main: main.url(),
      lab: lab.url(),
      productionReview: gallery.url(),
      vehicleAssemblyReview: assembly.url(),
      windowCount: app.windows().length,
    },
    sourceImageExportShaVerified: true,
    packagedManifestVerified: true,
    distinctAssemblyPoses: frames.size,
    routeWindowsWithoutDuplicates: true,
    networkBlocked,
    errors,
    failed,
    httpErrors,
    limit: 'Hidden QA profile; four button-stepped poses, not a visible-window framerate or hardware certification.',
  };
  await fs.writeFile(path.join(evidence, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally {
  await app.evaluate(({ dialog, BrowserWindow }) => {
    dialog.showMessageBoxSync = () => 1;
    for (const window of BrowserWindow.getAllWindows()) window.close();
  }).catch(() => {});
  await app.close().catch(() => {});
}
