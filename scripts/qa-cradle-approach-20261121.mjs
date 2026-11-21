/** R2-M025 on the compiled campaign. Admission provides only an adult save
 * with eight completed hunts. Preparation, route choice and departure are
 * performed in Chromium through the regular campaign controls. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { homeworldSceneSsrV78 } from '../tests/helpers/homeworld-scene-ssr-v78.mjs';

const origin = new URL(process.env.CRADLE_APPROACH_QA_URL ?? 'http://127.0.0.1:3121/');
assert.equal(origin.protocol, 'http:');
assert.equal(origin.hostname, '127.0.0.1');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (process.env.CRADLE_APPROACH_QA_COMMIT) assert.equal(commit, process.env.CRADLE_APPROACH_QA_COMMIT);
const buildId = (await readFile('.next/BUILD_ID', 'utf8')).trim();
assert.ok(buildId);
const output = resolve(process.env.CRADLE_APPROACH_QA_OUTPUT ?? 'outputs/qa-cradle-approach-20261121');
await mkdir(output, { recursive: true });

const qa = homeworldSceneSsrV78();
const saves = qa.load('app/game/save.ts');
const { MISSIONS } = qa.load('app/game/data.ts');
const save = saves.defaultSave('2026-11-21T12:00:00.000Z');
save.settings.masterVolume = 0;
for (const mission of MISSIONS) {
  save.missionProgress[mission.id] = { ...save.missionProgress[mission.id], status: 'completed', attempts: 1, completions: 1 };
}
const imported = saves.parseSaveImport(saves.exportSave(save));
assert.ok(imported.save, imported.failure);
assert.equal(imported.save.prologue, null);
assert.ok(!imported.save.buriedCradle);
const proof = JSON.parse(await readFile('app/game/data/buriedCradleArt.json', 'utf8'));
const authoredArt = new Map(Object.values(proof.assets).map(asset => [asset.src, asset]));
const report = {
  commit, buildId, passed: false, results: [], errors: [],
  scope: 'R2-M025 preparation through the ordinary compiled campaign. Separate direct and reconnaissance admissions from the same adult save with eight completed hunts.',
};
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  headless: true,
});

async function openBriefing(page) {
  await page.waitForSelector('[data-campaign-menu], [data-campaign-session]');
  if (await page.locator('[data-campaign-menu]').isVisible()) {
    const campaignSection = page.locator('[data-menu-section="campaign"]');
    if (await campaignSection.isVisible()) await campaignSection.click();
    await page.locator('[data-menu-action="continue"]').click();
    await page.locator('[data-campaign-session]').waitFor();
  }
  const play = page.getByRole('button', { name: 'Jouer', exact: true });
  if (await play.isVisible()) await play.click();
  const heading = page.locator('#buried-cradle-heading');
  const entry = page.locator('[data-open-buried-cradle]');
  await page.locator('#buried-cradle-heading:visible, [data-open-buried-cradle]:visible').first().waitFor();
  if (!(await heading.isVisible())) await entry.click();
  await heading.waitFor();
}

async function verifyArt(page, approach) {
  const decoded = await approach.locator('img, image').evaluateAll(async elements => {
    const paths = new Set(elements.map(element => {
      const uri = element instanceof HTMLImageElement
        ? element.currentSrc || element.getAttribute('src') : element.getAttribute('href');
      return uri ? new URL(uri, location.href).pathname : '';
    }).filter(path => path.startsWith('/game/xeno-prime/berceau-v1/')));
    return Promise.all(Array.from(paths, async path => {
      const image = new Image();
      image.src = path;
      await image.decode();
      return { path, width: image.naturalWidth, height: image.naturalHeight };
    }));
  });
  assert.ok(decoded.length > 0, 'The approach uses art registered for the Berceau.');
  for (const { path, width, height } of decoded) {
    const source = authoredArt.get(path);
    assert.ok(source, path);
    assert.equal(width, source.width, path);
    assert.equal(height, source.height, path);
    const response = await page.request.get(new URL(path, origin).href);
    assert.ok(response.ok(), path);
    const bytes = await response.body();
    assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256, path);
  }
  return decoded;
}

async function exercise(route) {
  const reconnaissance = route === 'reconnaissance';
  const context = await browser.newContext({
    viewport: reconnaissance ? { width: 720, height: 980 } : { width: 1440, height: 1000 },
    hasTouch: reconnaissance,
    storageState: { cookies: [], origins: [{ origin: origin.origin, localStorage: [{
      name: saves.SAVE_STORAGE_KEY, value: JSON.stringify(imported.save),
    }] }] },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45_000);
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  const disk = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saves.SAVE_STORAGE_KEY);

  try {
    const response = await page.goto(origin.href, { waitUntil: 'domcontentloaded' });
    assert.ok(response?.ok() && (await response.text()).includes(buildId), 'The compiled checkout is being served.');
    await openBriefing(page);
    const approach = page.locator('[data-cradle-approach]');
    const map = approach.locator('[data-cradle-approach-x]');
    const station = approach.locator('[data-cradle-approach-station]');
    const choice = value => approach.locator('[data-cradle-approach-choice="' + value + '"]');
    const position = async () => Number(await map.getAttribute('data-cradle-approach-x'));
    const waitPosition = value => page.waitForSelector(
      '[data-cradle-approach] [data-cradle-approach-x="' + value + '"]',
    );
    async function walk(target) {
      let x = await position();
      assert.ok(Number.isFinite(x) && Math.abs(target - x) % 40 === 0);
      if (!reconnaissance) await map.focus();
      while (x !== target) {
        const right = target > x;
        const direction = right ? 'right' : 'left';
        if (reconnaissance) await approach.locator('[data-cradle-approach-move="' + direction + '"]').tap();
        else await page.keyboard.press(right ? 'ArrowRight' : 'ArrowLeft');
        x += right ? 40 : -40;
        await waitPosition(x);
      }
    }
    async function inspectStation() {
      assert.ok(await station.isEnabled());
      if (reconnaissance) await station.tap();
      else {
        await map.focus();
        await page.keyboard.press('Space');
      }
    }

    await approach.waitFor();
    assert.equal(await position(), 80);
    assert.ok(await station.isDisabled());
    assert.equal(await approach.locator('[data-cradle-approach-choice]:enabled').count(), 0);
    await map.focus();
    await page.keyboard.press('Space');
    assert.ok(!(await disk()).buriedCradle);
    const art = await verifyArt(page, approach);

    for (const x of [160, 360, 560]) {
      await walk(x);
      await inspectStation();
    }
    assert.ok(!(await disk()).buriedCradle);
    if (reconnaissance) {
      await choice('recon').tap();
      assert.equal(await approach.locator('[data-cradle-approach-choice="return"]:enabled').count(), 0);
      await walk(800);
      await inspectStation();
      assert.equal(await approach.locator('[data-cradle-approach-choice="return"]:enabled').count(), 0);
      assert.ok(!(await disk()).buriedCradle);
      await walk(560);
    }

    await approach.screenshot({ path: join(output, route + '-approach.png') });
    if (reconnaissance) await choice('return').tap();
    else await choice('direct').click();
    const depart = page.getByRole('button', { name: 'Rejoindre Xeno Prime', exact: true });
    await depart.waitFor();
    const recorded = (await disk()).buriedCradle;
    const expected = [
      { id: 'risks', x: 160 }, { id: 'container', x: 360 }, { id: 'beacon', x: 560 },
      ...(reconnaissance ? [{ id: 'trace', x: 800 }] : []),
    ];
    assert.equal(recorded.status, 'prepared');
    assert.deepEqual(recorded.approach, { version: 1, route, returnX: 560, observations: expected });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await openBriefing(page);
    await depart.waitFor();
    assert.deepEqual((await disk()).buriedCradle, recorded);
    await depart.click();
    await page.locator('[data-buried-cradle][data-room="01"]').waitFor();
    const active = (await disk()).buriedCradle;
    assert.equal(active.status, 'active');
    assert.deepEqual(active.approach, recorded.approach);
    assert.equal(active.progress.bossDefeated, false);
    assert.equal(active.progress.crownClaimed, false);
    assert.deepEqual(errors, []);
    await page.locator('[data-buried-cradle][data-room="01"]').screenshot({ path: join(output, route + '-arrival.png') });
    report.results.push({ route, input: reconnaissance ? 'touch' : 'keyboard', art, receipt: active.approach });
  } catch (error) {
    report.errors.push(...errors.map(message => ({ route, message })));
    await page.screenshot({ path: join(output, route + '-failure.png') }).catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}

try {
  for (const route of ['direct', 'reconnaissance']) await exercise(route);
  report.passed = true;
} catch (error) {
  report.failure = String(error?.stack ?? error);
  throw error;
} finally {
  await browser.close();
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ commit, buildId, passed: report.passed, routes: report.results.map(result => result.route), failure: report.failure ?? null }));
}
