/** Recette R2-M042 dans le jeu compilé, en passant par le dossier du vaisseau. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { homeworldSceneSsrV78 } from '../tests/helpers/homeworld-scene-ssr-v78.mjs';
import { playShipAcquisitionV161 } from '../tests/helpers/ship-receipt-v161.mjs';
import { playQuatzaHunt } from '../tests/helpers/quatza-triage-route.mjs';
import { openCampaignDossier } from './qa-elder-mentoring-v168.mjs';

const origin = new URL(process.env.QUATZA_QA_URL ?? 'http://127.0.0.1:3121/');
assert.equal(origin.protocol, 'http:');
assert.equal(origin.hostname, '127.0.0.1');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (process.env.QUATZA_QA_COMMIT) assert.equal(commit, process.env.QUATZA_QA_COMMIT);
const buildId = (await readFile('.next/BUILD_ID', 'utf8')).trim();
assert.ok(buildId);
const output = resolve(process.env.QUATZA_QA_OUTPUT ?? 'outputs/qa-quatza-solo-m042');
await mkdir(output, { recursive: true });

const qa = homeworldSceneSsrV78();
const saves = qa.load('app/game/save.ts');
const engine = qa.load('app/game/systems/quatzaRij.ts');
const { MISSIONS } = qa.load('app/game/data.ts');
const historical = saves.defaultSave('2026-11-21T12:00:00.000Z');
historical.profile = { ...historical.profile, honor: 2000, rankId: 'blooded', acquiredRankIdV166: 'blooded' };
historical.settings.masterVolume = 0;
MISSIONS.forEach(mission => {
  historical.missionProgress[mission.id] = {
    ...historical.missionProgress[mission.id], status: 'completed', attempts: 1, completions: 1,
  };
});
const owned = playShipAcquisitionV161(qa, historical);
const imported = saves.parseSaveImport(saves.exportSave(owned));
assert(imported.save, imported.failure);
assert(engine.canEnterQuatza(imported.save, 'solo'));

const report = { commit, buildId, passed: false, errors: [], checks: [],
  admission: 'Rang Blooded et huit chasses préremplis. Coque V89 acquise par les réducteurs du jeu. Aucun état Quatza prérempli. Entrées de terrain via le clavier dans Chromium.' };
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  headless: true,
});
const { QUATZA_INPUT: input, QUATZA_POSTS: posts } = engine;
const keys = { [input.left]: 'ArrowLeft', [input.right]: 'ArrowRight', [input.jump]: 'Space',
  [input.strike]: 'KeyJ', [input.interact]: 'KeyE' };
const mode = 'solo';
const retreat = playQuatzaHunt(engine, mode, 'care');
retreat.prepare();
retreat.post(posts.refuge);
assert.equal(retreat.frame.phase, 'retreated');
const win = playQuatzaHunt(engine, mode, 'mobility');
win.prepare();
win.fight();
win.gatherAndReturn();
assert.equal(win.frame.phase, 'delivered');

let page;
try {
  page = await browser.newPage({
    viewport: { width: 1380, height: 950 },
    storageState: { cookies: [], origins: [{ origin: origin.origin, localStorage: [{
      name: saves.SAVE_STORAGE_KEY, value: JSON.stringify(imported.save),
    }] }] },
  });
  page.setDefaultTimeout(45_000);
  page.on('pageerror', error => report.errors.push(error.message));
  const root = page.locator('[data-quatza-campaign]');
  const expedition = root.locator('[data-quatza-expedition="solo"]');
  const disk = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saves.SAVE_STORAGE_KEY);
  const begin = root.locator('[data-quatza-begin="solo"]');
  const resume = expedition.getByRole('button', { name: 'Reprendre la chasse', exact: true });
  const tick = async () => Number(await expedition.getAttribute('data-tick'));
  const current = save => save.quatzaRij.expeditions.solo;
  await page.goto(origin.href, { waitUntil: 'domcontentloaded' });

  async function navigate() {
    await openCampaignDossier(page);
    await page.locator('[data-campaign-location="deck"]').waitFor();
    await page.locator('[data-quatza-open="solo"]').click();
    await root.waitFor();
  }

  async function play(inputRoute, startTick = 0, lastTick = inputRoute.length) {
    const simulatedTime = await page.evaluate(() => Date.now());
    await page.clock.pauseAt(simulatedTime + 1000);
    await resume.click();
    assert.equal(await tick(), startTick);
    let held = null;
    try {
      for (let start = startTick; start < lastTick;) {
        const code = inputRoute[start];
        let end = start + 1;
        while (end < lastTick && inputRoute[end] === code) end++;
        const wanted = keys[code] ?? null;
        if (held !== wanted) {
          if (held) await page.keyboard.up(held);
          if (wanted) await page.keyboard.down(wanted);
          held = wanted;
        }
        for (let attempts = 0; ; attempts++) {
          const frame = await tick();
          assert(frame <= end, 'Le navigateur a avancé au-delà de l’entrée prévue');
          if (frame === end) break;
          assert(attempts < 200, 'Animation native arrêtée à la trame ' + frame);
          await page.clock.runFor(16 * Math.min(24, Math.max(1, end - frame - 2)));
        }
        start = end;
      }
    } finally {
      if (held) await page.keyboard.up(held);
    }
    if (lastTick < inputRoute.length) await expedition.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.clock.resume();
  }

  await navigate();
  assert.equal((await disk()).quatzaRij?.expeditions?.solo, undefined);
  await begin.click();
  await page.clock.install({ time: Date.now() });
  await play(retreat.input);
  await expedition.locator('..').getByText('Expédition interrompue', { exact: true }).waitFor();
  const first = await disk();
  assert.equal(current(first).attempts[0].phase, 'retreated');
  assert.deepEqual(current(first).attempts[0].input, retreat.input);
  assert.equal(engine.hasQuatzaReturn(first.quatzaRij, first.createdAt, mode), false);
  await root.screenshot({ path: join(output, '01-repli.png') });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await navigate();
  assert.deepEqual(current(await disk()), current(first));
  report.checks.push('Repli depuis le terrain et preuve négative préservés après reprise sur le pont');

  await begin.click();
  const midpoint = win.input.indexOf(input.strike) + 1;
  assert(midpoint > 0 && midpoint < win.input.length);
  await play(win.input, 0, midpoint);
  const frozen = await disk();
  assert.equal(current(frozen).attempts.length, 2);
  assert.deepEqual(current(frozen).attempts[1].input, win.input.slice(0, midpoint));
  const partial = engine.replayQuatzaAttempt(mode, current(frozen).attempts[1].input);
  assert(partial.beast.health < 8 && partial.beast.health > 0);
  await root.screenshot({ path: join(output, '02-combat-suspendu.png') });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await navigate();
  assert.deepEqual(current(await disk()), current(frozen));
  assert.equal(await tick(), midpoint);
  assert.equal(Number(await expedition.getAttribute('data-health')), partial.player.health);
  assert.equal(Number(await expedition.getAttribute('data-beast-health')), partial.beast.health);
  report.checks.push('Les vitalités, la phase et les entrées de combat reviennent au même point depuis le vaisseau');

  await play(win.input, midpoint);
  await expedition.getByText('Retour enregistré', { exact: true }).waitFor();
  const victory = await disk();
  assert.deepEqual(current(victory).attempts[0], current(first).attempts[0]);
  assert.equal(current(victory).attempts[1].phase, 'delivered');
  assert.deepEqual(current(victory).attempts[1].input, win.input);
  assert.deepEqual(engine.replayQuatzaAttempt(mode, current(victory).attempts[1].input), win.frame);
  assert.equal(await expedition.getAttribute('data-hide'), 'true');
  assert.equal(await expedition.getAttribute('data-skull'), 'true');
  assert.deepEqual(win.frame.companions, []);
  const parsed = saves.parseSaveImport(saves.exportSave(victory));
  assert.ok(parsed.save, parsed.failure);
  assert.deepEqual(current(parsed.save), current(victory));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await navigate();
  await expedition.getByText('Retour enregistré', { exact: true }).waitFor();
  assert.deepEqual(current(await disk()), current(victory));
  assert.deepEqual(report.errors, []);
  await root.screenshot({ path: join(output, '03-retour-solitaire.png') });
  report.checks.push('Victoire du chasseur seul, deux prélèvements, retour aux témoins et reçu relu au rechargement');
  report.passed = true;
} catch (error) {
  report.failure = String(error.stack ?? error);
  if (page) await page.screenshot({ path: join(output, 'failure.png') }).catch(() => {});
  throw error;
} finally {
  await writeFile(join(output, 'parcours.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
