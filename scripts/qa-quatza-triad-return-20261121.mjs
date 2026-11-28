/** M019, one real triad expedition and both presentations in the compiled campaign. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { homeworldSceneSsrV78 } from '../tests/helpers/homeworld-scene-ssr-v78.mjs';
import { formationCampaignRoute } from '../tests/helpers/solo-v90-played-route.mjs';

const origin = new URL(process.env.QUATZA_QA_URL ?? 'http://127.0.0.1:3121/');
assert.equal(origin.protocol, 'http:');
assert.equal(origin.hostname, '127.0.0.1');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (process.env.QUATZA_QA_COMMIT) assert.equal(commit, process.env.QUATZA_QA_COMMIT);
const buildId = (await readFile('.next/BUILD_ID', 'utf8')).trim();
assert(buildId);
const output = resolve(process.env.QUATZA_QA_OUTPUT ?? 'outputs/qa-quatza-triad-return');
await mkdir(output, { recursive: true });
const qa = homeworldSceneSsrV78();
const saves = qa.load('app/game/save.ts');
const engine = qa.load('app/game/systems/quatzaRij.ts');
const { QUATZA_INPUT: I, QUATZA_POSTS: P } = engine;
const key = saves.SAVE_STORAGE_KEY;
const mode = 'triad';
const keys = { [I.left]: 'ArrowLeft', [I.right]: 'ArrowRight', [I.jump]: 'Space',
  [I.strike]: 'KeyJ', [I.interact]: 'KeyE', [I.signal]: 'KeyV' };

function inputRoute() {
  let frame = engine.createQuatzaFrame(mode);
  const input = [];
  const step = (code = 0) => {
    const next = engine.stepQuatza(mode, frame, code, 1);
    if (next === frame) return;
    input.push(code);
    frame = next;
  };
  const touch = () => { step(); step(I.interact); step(); };
  const walk = (x, tolerance = 4) => {
    for (let n = 0; n < 400 && Math.abs(frame.player.x - x) > tolerance; n++)
      step(frame.player.x < x ? I.right : I.left);
    assert(Math.abs(frame.player.x - x) <= tolerance, 'walk to ' + x);
  };
  const post = x => { walk(x); touch(); };
  const descend = () => { for (let n = 0; n < 100 && frame.player.y < 385; n++) step(); };
  post(P.rack);
  post(P.map);
  post(P.departure);
  assert.equal(frame.phase, 'field');
  post(P.trail);
  walk(845);
  for (let n = 0; n < 3900 && frame.phase === 'field' && frame.beast.stage !== 'dead'; n++) {
    const { beast, player, companions } = frame;
    const distance = Math.abs(beast.x - player.x);
    const ready = bit => !(frame.previous & bit);
    if (distance < 400 && ready(I.signal) &&
        (!frame.approachCalled || companions[0].contribution && !frame.blockCalled)) {
      step(I.signal);
    } else if (beast.stage === 'recover' && player.y > 368 && distance <= 122 &&
        player.cooldown === 0 && ready(I.strike) && companions.every(ally => ally.contribution)) {
      step(I.strike);
    } else if ((beast.stage === 'warning' && beast.remaining < 16 && distance < 190 ||
        beast.stage === 'charge' && distance < 130) && player.vy === 0 && ready(I.jump)) {
      step(I.jump);
    } else {
      step(beast.stage !== 'charge' && distance > 103 ? beast.x > player.x ? I.right : I.left : 0);
    }
  }
  assert.equal(frame.beast.stage, 'dead');
  assert(frame.companions.every(ally => ally.contribution && ally.health > 0));
  walk(frame.beast.x, 35);
  descend();
  touch();
  assert(frame.hide && !frame.skull);
  touch();
  assert(frame.hide && frame.skull);
  walk(P.refuge);
  descend();
  touch();
  assert.equal(frame.phase, 'return');
  assert.equal(engine.quatzaReturnAidPatient(frame)?.id, 'saar');
  assert.equal(frame.companions[0].health, 2);
  const returnTick = frame.tick;
  for (let n = 0; n < 12; n++) step(I.interact);
  const aidTick = frame.tick;
  assert.equal(frame.returnAid?.ticks, 12);
  for (let n = 12; n < engine.QUATZA_RETURN_AID_TICKS; n++) step(I.interact);
  assert.equal(frame.companions[0].health, 3);
  assert.equal(frame.returnAid, undefined);
  const careEndTick = frame.tick;
  post(P.witness);
  assert.equal(frame.phase, 'delivered');
  return { input, frame, returnTick, aidTick, careEndTick };
}

const report = {
  commit, buildId, passed: false, errors: [], admissionChecks: [],
  admission: 'Prior formation and temple are played in their canonical reducer fixture. No Quatza action, receipt, skin, skull or witness presentation is seeded. Playwright advances a virtual animation clock and delivers only ordinary keyboard and DOM events. The native browser replay must exactly match the input oracle.',
};
let browser, page;
try {
  const { save, origin: priorFormation } = formationCampaignRoute();
  save.settings.masterVolume = 0;
  const imported = saves.parseSaveImport(saves.exportSave(save));
  assert(imported.save, imported.failure);
  assert(engine.canEnterQuatza(imported.save, mode));
  assert(!imported.save.quatzaRij?.expeditions.triad);
  const expected = inputRoute();
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
  });
  const viewport = { width: 1380, height: 950 };
  const storageState = seed => ({ cookies: [], origins: [{ origin: origin.origin, localStorage: [
    { name: key, value: JSON.stringify(seed) },
  ] }] });
  async function openHomeworld(currentPage) {
    await currentPage.locator('[data-campaign-menu], [data-campaign-session]').first().waitFor();
    if (await currentPage.locator('[data-campaign-menu]').isVisible()) {
      const campaign = currentPage.locator('[data-menu-section="campaign"]');
      if (await campaign.isVisible()) await campaign.click();
      await currentPage.locator('[data-menu-action="continue"]').click();
    }
    await currentPage.locator('[data-campaign-location="homeworld"]').waitFor();
    await currentPage.locator('[data-homeworld-viewport]').waitFor();
  }
  const openCityNavigation = currentPage =>
    currentPage.getByRole('button', { name: 'Navigation', exact: true }).click();
  async function openDocument(currentPage) {
    const response = await currentPage.goto(origin.href, { waitUntil: 'domcontentloaded' });
    assert(response?.ok() && (await response.text()).includes(buildId));
  }
  const prior = saves.parseSaveImport(saves.exportSave(priorFormation));
  assert(prior.save, prior.failure);
  assert(!engine.canEnterQuatza(prior.save, mode));
  const locked = await browser.newPage({ viewport, storageState: storageState(prior.save) });
  await openDocument(locked);
  await openHomeworld(locked);
  await openCityNavigation(locked);
  assert.equal(await locked.locator('[data-open-quatza-homeworld]').count(), 0);
  report.admissionChecks.push('native Homeworld before V90 has no triad entry');
  await locked.close();

  page = await browser.newPage({ viewport, storageState: storageState(imported.save) });
  page.setDefaultTimeout(40_000);
  page.on('pageerror', error => report.errors.push(error.message));
  const root = page.locator('[data-quatza-campaign]');
  const expedition = root.locator('[data-quatza-expedition="triad"]');
  const resume = expedition.getByRole('button', { name: 'Reprendre la chasse', exact: true });
  const disk = () => page.evaluate(saveKey => JSON.parse(localStorage.getItem(saveKey)), key);
  const progress = checkpoint => checkpoint.quatzaRij.expeditions.triad;
  const action = id => root.locator('[data-quatza-present="' + id + '"]');
  const tick = async () => Number(await expedition.getAttribute('data-tick'));
  const stable = checkpoint => ({
    attempts: progress(checkpoint).attempts,
    trophies: checkpoint.trophies, profile: checkpoint.profile,
    specimens: checkpoint.inventory.harvestV112,
  });
  const homeworldEntry = page.locator('[data-open-quatza-homeworld]');
  const dossier = page.locator('[data-clan-chronicle]');
  async function openDossier() {
    await homeworldEntry.click();
    await dossier.waitFor();
    await dossier.getByRole('button', { name: 'Parcours et rites', exact: true }).click();
  }
  async function navigate() {
    await openHomeworld(page);
    await openCityNavigation(page);
    await openDossier();
    await dossier.locator('[data-quatza-open="triad"]').click();
    await root.waitFor();
  }
  async function awaitPresentations(count) {
    await page.waitForFunction(({ saveKey, count }) =>
      JSON.parse(localStorage.getItem(saveKey))?.quatzaRij?.expeditions.triad?.presentations?.length === count,
    { saveKey: key, count });
    return disk();
  }

  await openDocument(page);
  await openHomeworld(page);
  const cityPoint = (await disk()).homeworld.locationV77;
  const actor = page.locator('[data-homeworld-actor]');
  const actorPoint = () => actor.evaluate(node => [node.dataset.x, node.dataset.y, node.dataset.homeworldLevelV77]);
  await openCityNavigation(page);
  const livePoint = await actorPoint();
  await openDossier();
  await dossier.getByRole('button', { name: 'Retour', exact: true }).click();
  await openHomeworld(page);
  assert.deepEqual((await disk()).homeworld.locationV77, cityPoint);
  assert.deepEqual(await actorPoint(), livePoint);
  report.admissionChecks.push('eligible triad entry returns to the same Homeworld checkpoint');
  await navigate();
  assert.equal(await action('companions').count(), 0);
  assert.equal(await action('trophy').count(), 0);
  await root.locator('[data-quatza-begin="triad"]').click();
  await expedition.waitFor();
  const clockBase = Date.now();
  await page.clock.install({ time: clockBase });
  await page.clock.pauseAt(clockBase + 1000);
  async function play(startTick, lastTick) {
    assert.equal(await tick(), startTick);
    let pressed = null;
    for (let start = startTick; start < lastTick;) {
      const code = expected.input[start];
      let end = start + 1;
      while (end < lastTick && expected.input[end] === code) end++;
      const wanted = keys[code] ?? null;
      if (pressed !== wanted) {
        if (pressed) await page.keyboard.up(pressed);
        if (wanted) await page.keyboard.down(wanted);
        pressed = wanted;
      }
      for (let attempts = 0; ; attempts++) {
        const observed = await tick();
        assert(observed <= end, 'no animation step may cross an input boundary');
        if (observed === end) break;
        assert(attempts < 200, 'native animation is stalled at ' + observed);
        await page.clock.runFor(16 * Math.min(24, Math.max(1, end - observed - 2)));
      }
      start = end;
    }
    if (pressed) await page.keyboard.up(pressed);
  }

  const proofAttr = 'data-quatza-return-proof';
  const carried = expedition.locator('[data-quatza-carried]');
  const witnessId = engine.QUATZA_RETURN_WITNESS.id;
  const witness = expedition.locator('[data-quatza-witness-actor="' + witnessId + '"]');
  const saar = expedition.locator('[data-quatza-companion="saar"]');
  const care = expedition.getByRole('progressbar', { name: 'Soins de Saar' });
  await resume.click();
  await play(0, expected.returnTick);
  assert.equal(await expedition.getAttribute('data-phase'), 'return');
  assert.equal(await saar.getAttribute('data-health'), '2');
  assert.equal(await action('trophy').count(), 0);
  const proof = await carried.getAttribute(proofAttr);
  assert.equal(proof, engine.quatzaReturnProof(imported.save.createdAt, 1, expected.frame));
  assert(proof);
  await play(expected.returnTick, expected.aidTick);
  assert.equal(await care.getAttribute('value'), '12');
  await expedition.getByRole('button', { name: 'Pause', exact: true }).click();
  const checkpoint = await disk();
  assert.equal(progress(checkpoint).attempts[0].input.length, expected.aidTick);
  await page.clock.resume();
  await root.screenshot({ path: join(output, '00-aid-before-reload.png') });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await navigate();
  assert.equal(await carried.getAttribute(proofAttr), proof);
  assert.equal(await care.getAttribute('value'), '12');
  assert.deepEqual(progress(await disk()), progress(checkpoint));
  await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 1000);
  await resume.click();
  await play(expected.aidTick, expected.careEndTick);
  assert.equal(await care.count(), 0);
  assert.equal(await saar.getAttribute('data-health'), '3');
  await play(expected.careEndTick, expected.input.length);
  await page.clock.resume();
  await witness.waitFor({ state: 'attached' });
  const nativeWitness = await witness.locator('img[data-homeworld-npc-role-v84="guard"]').evaluate(async image => {
    await image.decode();
    return { src: image.getAttribute('src'), width: image.naturalWidth, height: image.naturalHeight };
  });
  assert(nativeWitness.width > 0 && nativeWitness.height > 0);
  assert.equal(await expedition.locator('[data-quatza-actor]').count(), 1);
  assert.deepEqual(await expedition.locator('[data-quatza-companion]').evaluateAll(nodes =>
    nodes.map(node => node.dataset.quatzaCompanion)), ['saar', 'vek']);
  assert.equal(await carried.getAttribute(proofAttr), proof);
  assert.equal(await expedition.locator('[data-quatza-witness]').getAttribute('data-quatza-witness'), witnessId);
  assert.equal(await expedition.getAttribute('data-phase'), 'delivered');
  assert.equal(await expedition.getAttribute('data-saar-ready'), 'true');
  assert.equal(await expedition.getAttribute('data-vek-ready'), 'true');
  assert.equal(await expedition.getAttribute('data-hide'), 'true');
  assert.equal(await expedition.getAttribute('data-skull'), 'true');
  const delivered = await disk();
  assert.equal(progress(delivered).attempts.length, 1);
  const attempt = progress(delivered).attempts[0];
  assert.deepEqual(attempt.input, expected.input);
  assert.equal(attempt.phase, 'delivered');
  assert.deepEqual(engine.replayQuatzaAttempt(mode, attempt.input, attempt.returnRules), expected.frame);

  await action('companions').click();
  const first = await awaitPresentations(1);
  assert.deepEqual(progress(first).presentations, ['companions']);
  assert.deepEqual(stable(first), stable(delivered));
  await root.screenshot({ path: join(output, '01-companions.png') });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await navigate();
  assert.equal(await expedition.getAttribute('data-phase'), 'delivered');
  assert.deepEqual(progress(await disk()).presentations, ['companions']);
  assert.equal(await carried.getAttribute(proofAttr), proof);
  await action('trophy').click();
  assert.equal(await carried.count(), 0);
  for (const piece of ['hide', 'skull']) {
    const received = expedition.locator('[data-quatza-handover="' + piece + '"]');
    assert.equal(await received.getAttribute(proofAttr), proof);
  }
  const second = await awaitPresentations(2);
  assert.deepEqual(progress(second).presentations, ['companions', 'trophy']);
  assert.deepEqual(stable(second), stable(delivered));
  const parsed = saves.parseSaveImport(saves.exportSave(second));
  assert(parsed.save, parsed.failure);
  assert.deepEqual(progress(parsed.save), progress(second));
  await root.screenshot({ path: join(output, '02-trophy.png') });
  await writeFile(join(output, 'witnessed-campaign-save.json'), saves.exportSave(second));

  await page.reload({ waitUntil: 'domcontentloaded' });
  await navigate();
  assert.equal(await expedition.getAttribute('data-phase'), 'delivered');
  assert.deepEqual(progress(await disk()), progress(second));
  assert.deepEqual(report.errors, []);
  report.result = { ticks: attempt.input.length, health: expected.frame.player.health,
    companions: expected.frame.companions, hide: expected.frame.hide, skull: expected.frame.skull,
    proof, witness: { id: witnessId, ...nativeWitness }, aidResumedAt: expected.aidTick,
    presentations: progress(second).presentations };
  report.passed = true;
} catch (error) {
  report.failure = String(error.stack ?? error);
  if (page) {
    report.failurePage = await page.evaluate(saveKey => ({
      url: location.href, location: document.querySelector('[data-campaign-location]')?.dataset.campaignLocation,
      phase: document.querySelector('[data-quatza-expedition]')?.dataset.phase,
      tick: document.querySelector('[data-quatza-expedition]')?.dataset.tick,
      activeSavePresent: localStorage.getItem(saveKey) !== null,
      text: document.body.innerText.slice(0, 1200),
    }), key).catch(() => null);
    await page.screenshot({ path: join(output, 'failure.png'), timeout: 5000 }).catch(() => {});
  }
  throw error;
} finally {
  await browser?.close();
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ commit, buildId, passed: report.passed, failure: report.failure ?? null,
    state: report.failurePage ?? null, result: report.result ?? null }));
}
