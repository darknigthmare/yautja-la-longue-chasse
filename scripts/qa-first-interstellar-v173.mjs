import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { firstVoyageAdmissionV173, qa, saves } from '../tests/helpers/first-interstellar-fixture-v173.mjs';

const output = resolve(process.env.FIRST_INTERSTELLAR_QA_OUTPUT ?? 'outputs/qa-first-interstellar-v173');
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const { save, fleet, fleetKey } = firstVoyageAdmissionV173({ prepared: true });
save.settings.masterVolume = 0;
const key = saves.SAVE_STORAGE_KEY;
const journey = qa.load('app/game/systems/firstInterstellarV173.ts');
const earth = qa.load('app/game/systems/earthHuntV171.ts');
const report = {
  sha, admission: 'Fixture Blooded, coque acquise V161 et huit inspections V88. Parcours navigateur depuis le cockpit.',
  commands: [], errors: [], steps: [],
};

await mkdir(output, { recursive: true });
let server, browser, page;
try {
  server = await createServer({ configFile: resolve('desktop/vite.config.ts'), server: { host: '127.0.0.1', port: 4218, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
  await context.addInitScript(({ key, save, fleet, fleetKey }) => {
    if (sessionStorage.getItem('qaFirstInterstellarV173')) return;
    localStorage.setItem(key, JSON.stringify(save));
    localStorage.setItem(fleetKey, JSON.stringify(fleet));
    sessionStorage.setItem('qaFirstInterstellarV173', 'true');
  }, { key, save, fleet, fleetKey });
  page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => report.errors.push(error.message));
  const deck = page.locator('[data-ship-interior="2.5d"]:not([inert])');
  const flight = page.locator('[data-first-interstellar]');
  const ground = page.locator('[data-earth-hunt]');
  const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  async function enter() {
    await page.locator('[data-campaign-menu]').waitFor({ timeout: 90000 });
    const campaign = page.locator('[data-menu-section="campaign"]');
    if (await campaign.isVisible()) await campaign.click();
    await page.locator('[data-menu-action="continue"]').click();
    await deck.waitFor({ timeout: 90000 });
  }
  async function cockpit() {
    await deck.waitFor();
    assert.equal(await deck.getAttribute('data-ship-room'), 'galaxy-map');
    if (await deck.getAttribute('data-ship-nearby') !== 'galaxy-map') {
      await deck.locator('[data-ship-approach-service]').click();
      await page.locator('[data-ship-interior="2.5d"][data-ship-nearby="galaxy-map"]').waitFor();
    }
    report.steps.push('Poste physique de la carte rejoint');
  }
  async function click(section, name, journal, times = 1) {
    for (let count = 0; count < times; count += 1) {
      const length = (await read())[journal]?.actions.length ?? 0;
      await section.getByRole('button', { name, exact: true }).click();
      await page.waitForFunction(({ key, journal, length }) =>
        JSON.parse(localStorage.getItem(key))?.[journal]?.actions.length === length + 1, { key, journal, length });
      report.commands.push({ journal, name });
    }
  }
  const pilot = (name, times) => click(flight, name, 'firstInterstellarV173', times);
  const hunt = (name, times) => click(ground, name, 'earthHuntV171', times);

  await page.goto('http://127.0.0.1:4218');
  await page.bringToFront();
  await enter();
  await cockpit();
  assert.equal(await deck.locator('[data-open-earth-hunt]').count(), 0);
  await deck.locator('[data-prepare-first-interstellar]').click();
  await deck.locator('[data-open-first-interstellar]').click();
  await pilot('Route directe');
  await pilot('Avancer', 4);
  await pilot('Prendre le départ');
  await pilot('Bâbord');
  await pilot('Franchir la balise');
  await pilot('Tribord', 2);
  await pilot('Franchir la balise');
  await pilot('Bâbord');
  await pilot('Franchir la balise');
  await flight.getByText('Poste de manœuvre du trajet réservé', { exact: true }).click();
  await pilot('Décaler à gauche', 3);
  await pilot('Maintenir l’alignement');
  await pilot('Freiner d’un cran', 2);
  await pilot('Avancer dans le couloir', 10);
  await pilot('Attache gauche');
  await pilot('Attache droite');
  await pilot('Tourner la bague d’un cran', 2);
  await pilot('Confirmer l’arrimage');

  assert.equal(await flight.getAttribute('data-first-interstellar'), 'quay');
  const moored = await read();
  assert.equal(journey.firstInterstellarReceiptV173(moored, moored.firstInterstellarV173), null);
  await pilot('Avancer', 5);
  await flight.screenshot({ path: resolve(output, '01-quai.png'), animations: 'disabled' });
  const quay = await read();
  assert.equal(journey.firstInterstellarReceiptV173(quay, quay.firstInterstellarV173), null);
  await pilot('Reculer', 5);
  const returned = await read();
  assert.equal(journey.firstInterstellarReceiptV173(returned, returned.firstInterstellarV173)?.visitedDestination, 'SPACE-BASE-01');
  await flight.getByRole('button', { name: 'Rejoindre le pont', exact: true }).click();
  await cockpit();
  await deck.locator('[data-open-earth-hunt]').click();
  await hunt('Îlot de papyrus · dépôt sûr');
  await hunt('Nord', 2);
  await hunt('Analyser');
  await hunt('Nord');
  await hunt('Analyser');
  await hunt('Est');
  await hunt('Camouflage');
  await hunt('Est', 3);
  await hunt('Écouter la radio');
  await hunt('Est', 2);
  await hunt('Frapper à la lame', 2);
  await hunt('Neutraliser le téléphone');
  await hunt('Camouflage');
  await hunt('Est');
  await hunt('Frapper à la lame');
  await hunt('Est');
  await hunt('Achever Lisle');
  await hunt('Prélever le trophée');
  await ground.screenshot({ path: resolve(output, '02-okavango.png'), animations: 'disabled' });
  await hunt('Sud');
  await hunt('Nettoyer les traces');
  await hunt('Sud');
  await hunt('Extraire');
  await hunt('Consigner le rapport');
  await ground.screenshot({ path: resolve(output, '03-registre.png'), animations: 'disabled' });

  const final = await read();
  assert.equal(earth.inspectEarthHuntV171(final.earthHuntV171, final.createdAt).view.phase, 'reported');
  assert.deepEqual(final.missionProgress, save.missionProgress);
  assert.ok(saves.parseSaveImport(saves.exportSave(final)).save);
  assert.deepEqual(report.errors, []);
  report.passed = true;
  await writeFile(resolve(output, 'campaign-receipts.json'), JSON.stringify({
    voyage: final.firstInterstellarV173, earth: final.earthHuntV171,
  }, null, 2) + '\n');
} catch (error) {
  report.failure = error.stack ?? error.message;
  await page?.screenshot({ path: resolve(output, 'failure.png') }).catch(() => null);
  throw error;
} finally {
  await browser?.close();
  await server?.close();
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
