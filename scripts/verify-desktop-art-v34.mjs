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

async function captureCanvas(canvas, fileName) {
  const data = await canvas.evaluate(element => ({
    url: element.toDataURL('image/png'),
    dataset: { ...element.dataset },
  }));
  const bytes = Buffer.from(data.url.split(',')[1], 'base64');
  await fs.writeFile(path.join(evidence, fileName), bytes);
  return {
    sha256: createHash('sha256').update(bytes).digest('hex'),
    dataset: data.dataset,
  };
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
  const pitProductionLab = lab.locator('main[data-pit-production-lab]');
  await pitProductionLab.waitFor();
  assert.equal(await lab.locator('#production-fighter option').count(), 14);
  const pitProductionChecks = {};
  for (const fighter of ['tracker', 'greyback']) {
    await lab.locator('#production-fighter').selectOption(fighter);
    await lab.locator('#production-clip').selectOption('idle');
    pitProductionChecks[fighter] = {};
    for (const facing of ['right', 'left']) {
      await lab.locator('#production-facing').selectOption(facing);
      await lab.waitForFunction(({ expectedFighter, expectedFacing }) => {
        const root = document.querySelector('main[data-pit-production-lab]');
        return root?.dataset.fighter === expectedFighter
          && root.dataset.clip === 'idle'
          && root.dataset.facing === expectedFacing
          && root.dataset.renderStatus === 'ready';
      }, { expectedFighter: fighter, expectedFacing: facing });
      const state = await pitProductionLab.evaluate(element => ({
        fighter: element.dataset.fighter,
        clip: element.dataset.clip,
        facing: element.dataset.facing,
        renderStatus: element.dataset.renderStatus,
        frameIndex: element.dataset.frameIndex,
      }));
      assert.deepEqual(state, {
        fighter,
        clip: 'idle',
        facing,
        renderStatus: 'ready',
        frameIndex: '0',
      });
      pitProductionChecks[fighter][facing] = state;
    }
    assert.match(await lab.locator('[data-pit-lab-coverage]').innerText(), /28 clips orientés/);
  }
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

  const assemblyManifest = await assembly.evaluate(async () => {
    const response = await fetch('./manifest.json');
    if (!response.ok) throw new Error('Packaged assembly manifest ' + response.status);
    return response.json();
  });
  assert.equal(assemblyManifest.resources.length, 10);
  assert.equal(assemblyManifest.assemblies.length, 3);

  const boneAssemblyId = 'bone-bison-war-fit';
  await assembly.locator('#assembly').selectOption(boneAssemblyId);
  await assembly.waitForFunction(value => document.querySelector('#assembly-canvas')?.dataset.assembly === value, boneAssemblyId);
  assert.equal(await assembly.locator('#facing-control').isVisible(), true);
  assert.equal(await assembly.locator('#calibration').getAttribute('data-status'), 'static-module-fit-review');
  assert.equal(await assembly.locator('#play').isDisabled(), true);

  const boneSaddle = assembly.locator('input[data-module="war-saddle"]');
  const boneGuard = assembly.locator('input[data-module="flank-guard"]');
  assert.equal(await boneSaddle.isChecked(), true);
  assert.equal(await boneGuard.isChecked(), true);
  const boneBison = {};
  for (const facing of ['right', 'left']) {
    await assembly.locator('#facing').selectOption(facing);
    await assembly.waitForFunction(value => document.querySelector('#assembly-canvas')?.dataset.facing === value, facing);
    assert.equal(await assembly.locator('#overflow').getAttribute('data-safe'), 'true');
    const equipped = await captureCanvas(canvas, 'bone-bison-' + facing + '-equipped.png');
    assert.equal(equipped.dataset.modules.split(',').sort().join(','), 'flank-guard,war-saddle');

    await boneSaddle.uncheck();
    await boneGuard.uncheck();
    await assembly.waitForFunction(() => document.querySelector('#assembly-canvas')?.dataset.modules === '');
    assert.equal(await assembly.locator('#overflow').getAttribute('data-safe'), 'true');
    const bodyOnly = await captureCanvas(canvas, 'bone-bison-' + facing + '-body-only.png');
    assert.equal(bodyOnly.dataset.modules, '');
    assert.notEqual(equipped.sha256, bodyOnly.sha256);
    boneBison[facing] = { equipped: equipped.sha256, bodyOnly: bodyOnly.sha256 };

    await boneSaddle.check();
    await boneGuard.check();
    await assembly.waitForFunction(() => document.querySelector('#assembly-canvas')?.dataset.modules === 'flank-guard,war-saddle');
  }
  assert.equal(new Set(Object.values(boneBison).flatMap(result => Object.values(result))).size, 4);

  const razorwingAssemblyId = 'razorwing-flight-rig-review';
  await assembly.locator('#assembly').selectOption(razorwingAssemblyId);
  await assembly.waitForFunction(value => document.querySelector('#assembly-canvas')?.dataset.assembly === value, razorwingAssemblyId);
  assert.equal(await assembly.locator('#facing-control').isVisible(), true);
  assert.equal(await assembly.locator('#calibration').getAttribute('data-status'), 'estimated-flight-rig-review');
  assert.equal(await assembly.locator('#play').isDisabled(), false);

  const razorwingManifestEntry = assemblyManifest.assemblies.find(entry => entry.id === razorwingAssemblyId);
  assert(razorwingManifestEntry);
  assert.equal(razorwingManifestEntry.playable, false);
  assert.deepEqual(razorwingManifestEntry.facings, ['right', 'left']);
  assert.deepEqual(razorwingManifestEntry.modules.map(part => part.id), ['far-wing', 'near-wing']);
  const razorwingAnimationPart = razorwingManifestEntry.modules.find(part => part.id === razorwingManifestEntry.animation.moduleId);
  assert(razorwingAnimationPart);
  const razorwingPhasesPerFacing = Object.fromEntries(
    razorwingManifestEntry.facings.map(facing => [facing, razorwingAnimationPart.framesByFacing[facing].length]),
  );
  assert.deepEqual(razorwingPhasesPerFacing, { right: 6, left: 6 });

  const farWing = assembly.locator('input[data-module="far-wing"]');
  const nearWing = assembly.locator('input[data-module="near-wing"]');
  assert.equal(await farWing.isChecked(), true);
  assert.equal(await nearWing.isChecked(), true);
  const razorwing = {};
  for (const facing of ['right', 'left']) {
    await assembly.locator('#facing').selectOption(facing);
    await assembly.waitForFunction(value => {
      const target = document.querySelector('#assembly-canvas');
      return target?.dataset.facing === value && target.dataset.pose === '0';
    }, facing);
    const hashes = [];
    for (let phase = 0; phase < 6; phase += 1) {
      await assembly.waitForFunction(value => document.querySelector('#assembly-canvas')?.dataset.pose === String(value), phase);
      assert.equal(await assembly.locator('#overflow').getAttribute('data-safe'), 'true');
      const capture = await captureCanvas(canvas, 'razorwing-' + facing + '-phase-' + (phase + 1) + '.png');
      assert.equal(capture.dataset.modules, 'far-wing,near-wing');
      hashes.push(capture.sha256);
      if (phase < 5) await assembly.locator('#next').click();
    }
    assert.equal(new Set(hashes).size, 6);
    razorwing[facing] = hashes;
  }
  assert.equal(new Set([...razorwing.right, ...razorwing.left]).size, 12);

  await assembly.locator('#facing').selectOption('right');
  await assembly.waitForFunction(() => {
    const target = document.querySelector('#assembly-canvas');
    return target?.dataset.facing === 'right' && target.dataset.pose === '0';
  });
  const razorwingModuleHashes = {};
  razorwingModuleHashes.bothWings = (await captureCanvas(canvas, 'razorwing-right-both-wings.png')).sha256;
  await nearWing.uncheck();
  await assembly.waitForFunction(() => document.querySelector('#assembly-canvas')?.dataset.modules === 'far-wing');
  assert.equal(await assembly.locator('#play').isDisabled(), false);
  razorwingModuleHashes.farWingOnly = (await captureCanvas(canvas, 'razorwing-right-far-wing-only.png')).sha256;
  await farWing.uncheck();
  await assembly.waitForFunction(() => document.querySelector('#assembly-canvas')?.dataset.modules === '');
  assert.equal(await assembly.locator('#play').isDisabled(), true);
  razorwingModuleHashes.bodyOnly = (await captureCanvas(canvas, 'razorwing-right-body-only.png')).sha256;
  await nearWing.check();
  await assembly.waitForFunction(() => document.querySelector('#assembly-canvas')?.dataset.modules === 'near-wing');
  assert.equal(await assembly.locator('#play').isDisabled(), false);
  razorwingModuleHashes.nearWingOnly = (await captureCanvas(canvas, 'razorwing-right-near-wing-only.png')).sha256;
  assert.equal(new Set(Object.values(razorwingModuleHashes)).size, 4);
  await farWing.check();
  await assembly.waitForFunction(() => document.querySelector('#assembly-canvas')?.dataset.modules === 'far-wing,near-wing');

  const routedWindowCount = app.windows().length;
  await assembly.getByRole('link', { name: 'Atelier V34', exact: true }).click({ noWaitAfter: true });
  await gallery.waitForURL('yautja://game/game/assets/v34/production-review/index.html');
  await gallery.waitForFunction(() => document.querySelector('#canvas')?.dataset.loaded === 'true');
  assert.equal(assembly.url(), 'yautja://game/game/assets/v34/vehicle-assembly-review/index.html');
  assert.equal(app.windows().length, routedWindowCount);

  await activateInterceptedLink(lab, 'Atelier OpenAI V34');
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
    pitProductionAnimationLab: {
      markerPresent: true,
      fighterOptions: 14,
      checks: pitProductionChecks,
    },
    sourceImageExportShaVerified: true,
    packagedManifestVerified: true,
    distinctAssemblyPoses: frames.size,
    packagedAssemblyManifest: {
      resources: assemblyManifest.resources.length,
      assemblies: assemblyManifest.assemblies.length,
    },
    ejectionSeatAssembly: {
      distinctPoses: frames.size,
      overflowSafe: true,
    },
    boneBisonAssembly: {
      facings: Object.keys(boneBison),
      equippedAndBodyOnly: boneBison,
      distinctCompositions: new Set(Object.values(boneBison).flatMap(result => Object.values(result))).size,
      modules: ['war-saddle', 'flank-guard'],
      calibration: 'static-module-fit-review',
      playable: false,
      overflowSafe: true,
    },
    razorwingAssembly: {
      facings: Object.keys(razorwing),
      poseHashes: razorwing,
      distinctReviewCompositions: new Set([...razorwing.right, ...razorwing.left]).size,
      phasesPerFacing: razorwingPhasesPerFacing,
      moduleCombinationHashes: razorwingModuleHashes,
      distinctModuleCombinations: new Set(Object.values(razorwingModuleHashes)).size,
      modules: ['far-wing', 'near-wing'],
      calibration: 'estimated-flight-rig-review',
      playable: false,
      overflowSafe: true,
    },
    routeWindowsWithoutDuplicates: true,
    networkBlocked,
    errors,
    failed,
    httpErrors,
    limit: 'Hidden QA profile; button-stepped review compositions, not a visible-window framerate, flight-animation acceptance, or hardware certification.',
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
