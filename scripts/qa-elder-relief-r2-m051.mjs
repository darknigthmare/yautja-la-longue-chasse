import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { openCampaignDossier } from './qa-elder-mentoring-v168.mjs';
import { elderAssemblyBeforeRelief } from '../tests/helpers/senior-rite-campaign.mjs';
import { qa, saves } from '../tests/helpers/clan-ship-trophy-hearing-fixture.mjs';

const out = resolve('outputs/qa-elder-relief-r2-m051');
const owner = elderAssemblyBeforeRelief();
const key = saves.SAVE_STORAGE_KEY;
const chronicle = qa.load('app/game/systems/clanChronicle.ts');
const report = { steps: [], errors: [], passed: false };
const url = 'http://127.0.0.1:4222';
await mkdir(out, { recursive: true });
let browser, server, page;
try {
  server = await createServer({ configFile: resolve('desktop/vite.config.ts'), server: { host: '127.0.0.1', port: 4222, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
  page = await browser.newPage({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce',
    storageState: { cookies: [], origins: [{ origin: url, localStorage: [{ name: key, value: JSON.stringify(owner) }] }] } });
  page.on('pageerror', error => report.errors.push(error.message));
  const read = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
  const rank = save => chronicle.getChronicleRank(save.prologue.chronicle);
  async function enterAssembly() {
    await openCampaignDossier(page);
    await page.getByRole('button', { name: 'Ouvrir l’assemblée des aînés', exact: true }).click();
  }
  await page.goto(url);
  await enterAssembly();
  assert.equal(rank(await read()), 'elite');
  assert.equal((await read()).elderAssemblyV168.responsibility, 'council');
  report.steps.push('engagement admis au conseil');
  await page.locator('[data-elder-confirm-relief]').click();
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.elderAssemblyV168?.generationHandover === true, key);
  const advanced = await read();
  assert.equal(rank(advanced), 'elder');
  assert.ok(saves.parseSaveImport(saves.exportSave(advanced)).save);
  report.steps.push('relève et titre inscrits ensemble');
  await page.screenshot({ path: resolve(out, 'releve.png'), animations: 'disabled' });
  await page.reload();
  await enterAssembly();
  assert.equal(rank(await read()), 'elder');
  assert.equal(await page.locator('[data-elder-confirm-relief]').count(), 0);
  assert.deepEqual(report.errors, []);
  report.steps.push('titre et registre après rechargement');
  report.passed = true;
} finally {
  if (!report.passed && page) await page.screenshot({ path: resolve(out, 'failure.png') }).catch(() => {});
  await writeFile(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
  await browser?.close();
  await server?.close();
}
