import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';

const url = process.env.V72_QA_URL ?? 'http://127.0.0.1:4192';
const output = process.env.V72_SHELL_OUTPUT ?? 'work-local/v72/qa/shell';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const checks = [], errors = [];
page.on('pageerror', error => errors.push(error.message));
const check = (name, details) => checks.push({ name, passed: true, details });
try {
  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  assert.equal(response.status(), 200);
  // The campaign menu owns its main node. The mounted game version is checked
  // after creating/continuing a campaign in the separate gameplay recipes.
  await page.locator('[data-campaign-menu]').waitFor();
  check('actual-game-shell-http', { http: response.status() });
  await page.getByRole('button', { name: /^Compte & sauvegardes/ }).click();
  await page.locator('[data-cloud-account-v71]').waitFor();
  assert(await page.locator('[data-campaign-menu]').evaluate(el => Boolean(el.closest('[inert]'))));
  check('existing-account-menu-remains-available-and-modal');
  await page.getByRole('button', { name: 'Fermer le compte', exact: true }).click();
  await page.getByRole('button', { name: /^Nouvelle partie/ }).click();
  await page.locator('[data-campaign-menu="new"]').waitFor();
  await page.getByLabel('Nom du chasseur').fill('QA V72');
  await page.screenshot({ path: path.join(output, 'new-game-desktop.png') });
  await page.setViewportSize({ width: 393, height: 852 });
  assert.equal(await page.locator('html').evaluate(el => el.scrollWidth > innerWidth + 1), false);
  await page.getByRole('button', { name: /^Créer la partie 1/ }).scrollIntoViewIfNeeded();
  assert(await page.getByRole('button', { name: /^Créer la partie 1/ }).isEnabled());
  await page.screenshot({ path: path.join(output, 'new-game-portrait.png') });
  check('desktop-mobile-new-game-form-ready-without-creating-user-data');
  const files = ['game/homeworld/v70/temple-modules.png', 'game/homeworld/v71/outskirts-kit.png', 'game/homeworld/v71/cinder-ground.png',
    'game/youth/v48/unblooded-left.png', 'game/youth/v48/unblooded-right.png'];
  for (const folder of ['game/homeworld/v72', 'game/prologue/v72', 'game/homeworld/v74', 'game/homeworld/v74/youth']) {
    for (const file of await fs.readdir(path.join('public', folder))) if (file.endsWith('.png')) files.push(folder + '/' + file);
  }
  // Follow the active V75 registries, not drafts from generation folders.
  const architecture = JSON.parse(await fs.readFile('app/game/data/homeworldArchitectureArtV75.json', 'utf8'));
  for (const identity of Object.values(architecture)) files.push(identity.art.src.replace(/^\//, ''));
  files.push('game/homeworld/v75/landscape-ground-materials-native.png');
  const angled=JSON.parse(await fs.readFile('app/game/data/homeworldArchitectureArtV76.json','utf8'));
  const interior=JSON.parse(await fs.readFile('app/game/data/homeworldInteriorDecorArtV76.json','utf8'));
  const exterior=JSON.parse(await fs.readFile('app/game/data/homeworldExteriorArtV76.json','utf8'));
  for(const art of [...Object.values(angled).map(identity=>identity.art),...Object.values(interior),...Object.values(exterior)])files.push(art.src.replace(/^\//,''));
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  for (const file of files) {
    const remote = await page.request.get(new URL('/' + file, url).href);
    const bytes = await remote.body(), local = await fs.readFile(path.join('public', file));
    assert.equal(remote.status(), 200, file); assert.equal(sha(bytes), sha(local), file);
    check('native-bitmap-http-and-identity', { file, http: remote.status(), bytes: bytes.length, sha256: sha(bytes) });
  }
  assert.equal(errors.length, 0); check('no-javascript-errors');
} catch (error) {
  checks.push({ name: 'exception', passed: false, details: error.message });
  await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
} finally { await browser.close(); }
const report = { status: checks.every(c => c.passed) ? 'PASS' : 'FAIL', url, at: new Date().toISOString(), checks, errors,
  limits: 'This recipe verifies shell and immutable bitmap delivery. The mounted game version, gameplay, movement, narrative continuity, physical routes and save refusal are verified in separate recipes after creating or continuing a campaign. No real signup, login or email is performed.' };
await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, checks: checks.length, output }));
if (report.status !== 'PASS') process.exitCode = 1;
