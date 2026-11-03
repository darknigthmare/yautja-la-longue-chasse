import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { campaignFixture, enterCampaignDeck } from './campaign-browser-helpers.mjs';
import { homeworldQaModelV64 } from './homeworld-qa-model-v64.mjs';
import { homeworldNavigatorV66 } from './homeworld-navigation-browser-v66.mjs';
import { homeworldSensitiveExpeditionsV70 } from './homeworld-sensitive-expeditions-v70.mjs';

const url = process.env.V70_QA_URL ?? 'http://127.0.0.1:4187', output = process.env.V70_SENSITIVE_QA_OUTPUT ?? 'work-local/v70/qa/sensitive-expeditions';
await fs.mkdir(output, { recursive: true });
const api = homeworldQaModelV64(process.cwd(), ['homeworld.ts', 'homeworldCity.ts', 'homeworldSpatialCodex.ts', 'homeworldInteriorsV64.ts', 'homeworldRegionsV68.ts', 'homeworldPassageV67.ts', 'homeworldExpedition.ts', 'glassDesert.ts']);
const fixture = await campaignFixture(), browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }), page = await context.newPage(), captures = [], errors = [], failures = [];
const capture = async name => { const file = output + '/' + name + '.jpg'; await page.screenshot({ path: file, type: 'jpeg', quality: 88 }); captures.push(file); };
const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), fixture.key);
let sensitive, city;
page.setDefaultTimeout(60000); page.on('pageerror', e => errors.push(e.message)); page.on('response', r => { if (r.status() >= 400) failures.push({ status: r.status(), url: r.url() }); });
try {
  assert(!fixture.save.homeworld.evidenceIds.includes('suspect-trophy')); assert.equal(fixture.save.homeworld.expeditions['ash-marches'], null); assert.equal(fixture.save.homeworld.expeditions['glass-desert'], null);
  await page.clock.install();
  await enterCampaignDeck(page, { url }); await page.getByRole('button', { name: 'Yautja Prime · monde natal', exact: true }).click();
  await page.locator('[data-homeworld-actor]').waitFor({ state: 'attached' }); await page.locator('[data-homeworld-hub] img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 150));
  city = homeworldNavigatorV66(page, api); await city.focus();
  const departure = await city.position(); await page.keyboard.down('ArrowRight'); await city.tick(320); await page.keyboard.up('ArrowRight'); await city.tick(64);
  console.log(JSON.stringify({ check: 'public-city-control', departure, actual: await city.position(), focus: await page.evaluate(() => ({ focused: document.hasFocus(), hidden: document.hidden, element: document.activeElement?.outerHTML?.slice(0, 180) })) }));
  assert((await city.position()).x > departure.x + 40, 'The public city keyboard and controlled RAF must advance before any route is attempted');
  sensitive = homeworldSensitiveExpeditionsV70(page, api, { city, saveKey: fixture.key, controlledClock: true, capture });
  const before = await saved(), result = await sensitive.ensureReserveAccess(), after = await saved();
  assert.deepEqual(after.homeworld.contractsV68, before.homeworld.contractsV68, 'Legacy investigations create no accepted or completed village contract');
  assert.equal(result.routes.filter(r => r.kind === 'legacy-passage').length, 36, 'Nine real segments in each direction for each sensitive region');
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  await fs.writeFile(output + '/report.json', JSON.stringify({ status: 'PASS', url, ...result, cityRoutes: city.routes, captures, errors, failures,
    scope: 'Isolated legacy default campaign fixture without suspect trophy, reports or accepted contracts. Physical port trophy, four full V67 connector walks, real Ash platform jumps/grazer charge/convoi, real Glass decoy/careful movement/channel-preserve choice, acknowledged reports and physical city returns. No proof, coordinate, runtime callback or accepted contract is injected; no new-player campaign playthrough is claimed.', visualReview: 'pending' }, null, 2));
  console.log(JSON.stringify({ status: 'PASS', passages: 4, passageSegments: 36, sensitiveReports: 2, output }));
} catch (error) {
  await capture('failure').catch(() => {}); const publicSurface = await page.evaluate(() => ({ focused: document.hasFocus(), hidden: document.hidden, element: document.activeElement?.outerHTML?.slice(0, 300), hub: document.querySelector('[data-homeworld-hub]')?.outerHTML?.slice(0, 500) })).catch(() => null);
  await fs.writeFile(output + '/report.json', JSON.stringify({ status: 'FAIL', url, error: error.stack, publicSurface, checks: sensitive?.checks ?? [], routes: sensitive?.routes ?? [], cityRoutes: city?.routes ?? [], captures, errors, failures }, null, 2)); throw error;
} finally { await browser.close(); }
