// Actual Next UI, native images and input/storage paths. Initial geometry
// fixtures are explicit; no earned survey, combat result or runtime is injected.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {campaignFixture, enterCampaignDeck} from './campaign-browser-helpers.mjs';

const baseUrl = process.env.YAUTJA_QA_BASE_URL ?? 'http://127.0.0.1:3116';
assert(['127.0.0.1', 'localhost'].includes(new URL(baseUrl).hostname));
const buildId = process.env.YAUTJA_QA_BUILD_ID;
assert(buildId, 'The production build identity must be supplied');
const runtimeCommit = process.env.YAUTJA_QA_RUNTIME_COMMIT;
assert.match(runtimeCommit ?? '', /^[a-f0-9]{40}$/, 'The exact compiled runtime commit must be supplied');
const localHead = () => execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
const headBefore = localHead();
assert.equal(headBefore, runtimeCommit, 'The local source HEAD must match the pinned runtime commit');
const output = path.resolve(process.env.YAUTJA_PRESERVE_V6_OUTPUT ?? 'work-local/preserve-v6-20261102/browser/attempt-01');
await fs.mkdir(output, {recursive: true});
const key = 'yautja-main-menu-bonus.v81.reserve';
const sha = value => createHash('sha256').update(value).digest('hex');
const bundled = await build({stdin: {contents: "export * from './app/game/systems/gameReserveV66';export * from './app/game/systems/gameReserveGrandHunt';export * from './app/game/systems/gameReserveExpeditionV109';", resolveDir: process.cwd()}, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent'});
const api = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const nativePaths = new Set();
function native(value) {if (typeof value === 'string' && value.startsWith('/game/')) nativePaths.add(value); else if (value && typeof value === 'object') Object.values(value).forEach(native);}
api.GAME_RESERVE_GRAND_CATALOGUE.forEach(item => native(item.nativeArt));
const appFiles = (await fs.readdir('app', {recursive: true})).filter(name => /\.(?:tsx?|json|css)$/.test(name)).map(name => 'app/' + name);
const sourceFiles = [...appFiles, 'next.config.ts', 'package.json', 'package-lock.json', 'scripts/qa-preserve-grand-hunts-v6.mjs', 'scripts/campaign-browser-helpers.mjs', ...[...nativePaths].map(src => 'public' + src)].sort();
const snapshot = () => Promise.all(sourceFiles.map(async file => {const bytes = await fs.readFile(file); return {file, bytes: bytes.length, sha256: sha(bytes)};}));
const sourceBefore = await snapshot();
const checks = [], captures = [], fixtures = [], errors = [], consoleErrors = [], httpErrors = [], textures = new Map(), contexts = [], outcomes = {}, servedBuilds = [], coverObservations = [];
const check = (name, value) => {checks.push({name, status: value ? 'PASS' : 'FAIL'}); console.log((value ? 'PASS ' : 'FAIL ') + name); assert(value, name);};
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ?? '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio']});
const canvas = page => page.locator('canvas[data-reserve-tick]');
const view = page => canvas(page).evaluate(node => ({...node.dataset}));
const raw = page => page.evaluate(k => localStorage.getItem(k), key);
const disk = async page => JSON.parse(await raw(page))?.state;
let failure;
async function page(initial) {
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'}); contexts.push(context);
  // Passive observation: the original browser drawImage runs first with its
  // original receiver and arguments. No image, state or rendering is replaced.
  await context.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.drawImage, samples = new Map(), observerErrors = [];
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      const result = Reflect.apply(original, this, args);
      try {
        const image = args[0];
        if (args.length === 9 && image instanceof HTMLImageElement && this.canvas.closest?.('[data-game-reserve-v66]')) {
          const source = new URL(image.src, location.href).pathname;
          if (/^\/game\/assets\/v19\/biome-decor\/[^/]+\/cov\/.+\.webp$/.test(source)) {
            const sample = {source, bitmap: [image.naturalWidth, image.naturalHeight], crop: args.slice(1, 5), destination: args.slice(5, 9), canvas: [this.canvas.width, this.canvas.height]};
            samples.set(JSON.stringify([source, sample.crop, sample.destination]), sample);
          }
        }
      } catch (error) {observerErrors.push(String(error));}
      return result;
    };
    window.__preserveCoverObservationV6 = {
      samples: () => [...samples.values()], errors: () => [...observerErrors],
      restore: () => {CanvasRenderingContext2D.prototype.drawImage = original; return CanvasRenderingContext2D.prototype.drawImage === original;},
    };
  });
  if (initial) await context.addInitScript(({key, initial}) => {if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({version: 1, state: initial}));}, {key, initial});
  const p = await context.newPage(); p.setDefaultTimeout(30000); await p.clock.install();
  p.on('pageerror', error => errors.push(error.message));
  p.on('console', message => {if (message.type() === 'error') consoleErrors.push(message.text());});
  p.on('response', response => {
    const u = new URL(response.url()); if (u.origin !== new URL(baseUrl).origin) return;
    if (response.status() >= 400) httpErrors.push({path: u.pathname, status: response.status()});
    if (nativePaths.has(u.pathname)) {
      const item = textures.get(u.pathname) ?? {path: u.pathname, responses: []};
      item.responses.push({status: response.status(), type: response.headers()['content-type'], context: contexts.indexOf(context)});
      textures.set(u.pathname, item);
    }
  });
  return p;
}
async function enter(p, protectedEntry = false) {
  const response = await p.goto(baseUrl, {waitUntil: 'domcontentloaded', timeout: 120000});
  const html = await p.content(), served = {url: p.url(), status: response.status(), expectedBuildId: buildId, foundInHtml: html.includes(buildId), htmlSha256: sha(html)};
  servedBuilds.push(served); assert.equal(served.status, 200); assert(served.foundInHtml, 'Served production build identity');
  await p.locator('[data-campaign-menu="main"]').waitFor();
  await p.locator('[data-main-menu-mode="game-reserve"]').click();
  await p.getByRole('button', {name: 'Accéder malgré les spoilers', exact: true}).click();
  await p.locator('[data-main-menu-bonus-entry="game-reserve"]').waitFor();
  if (!protectedEntry) await p.locator('[data-bonus-start]:not(:disabled)').waitFor();
}
async function mount(p) {
  await p.locator('[data-bonus-start]').click();
  await p.waitForFunction(() => document.querySelector('canvas[data-reserve-assets]')?.dataset.reserveAssets === 'true');
  await p.clock.pauseAt(new Date(await p.evaluate(() => Date.now() + 100)));
}
async function button(p, name) {await p.getByRole('button', {name, exact: true}).click({force: true}); await p.clock.runFor(100);}
async function hold(p, code, ms) {await canvas(p).focus(); await p.keyboard.down(code); await p.clock.runFor(ms); await p.keyboard.up(code); await p.clock.runFor(64);}
async function capture(p, name, target = p) {const file = name + '.png'; await target.screenshot({path: path.join(output, file)}); const bytes = await fs.readFile(path.join(output, file)); captures.push({file, bytes: bytes.length, sha256: sha(bytes), viewport: p.viewportSize()});}
async function walk(p, target) {
  for (let round = 0; round < 350; round++) {
    const x = Number((await view(p)).reserveX), distance = target - x;
    if (Math.abs(distance) < 5) return;
    await hold(p, distance > 0 ? 'ArrowRight' : 'ArrowLeft', Math.max(17, Math.min(180, Math.floor(Math.abs(distance) / 3.8) * 1000 / 60)));
    assert.equal((await view(p)).reserveStatus, 'active');
  }
  throw new Error('Physical movement did not reach ' + target);
}
async function observeNativeCovers(p, id) {
  const definition = api.GAME_RESERVE_GRAND_CATALOGUE.find(item => item.id === id);
  const observed = await p.evaluate(() => ({samples: window.__preserveCoverObservationV6.samples(), errors: window.__preserveCoverObservationV6.errors()}));
  const rows = definition.cover.map(cover => {
    const source = definition.nativeArt.covers[cover.art].src;
    const sample = observed.samples.find(item => item.source === source && item.destination[0] === cover.x && item.destination[2] === cover.w);
    if (!sample) return {source, cover, observed: false};
    const [sx, sy, sw, sh] = sample.crop, [x, y, width, height] = sample.destination;
    return {...sample, observed: true, scaleX: width / sw, scaleY: height / sh,
      valid: sx === 24 && sy === 24 && sw === sample.bitmap[0] - 48 && sh === sample.bitmap[1] - 48 && x === cover.x && width === cover.w && Math.abs(width / sw - height / sh) < 1e-12 && Math.abs(y + height - (definition.world.ground + 6)) < 1e-9};
  });
  coverObservations.push({id, scope: 'Passive calls of the actual compiled renderer and original native HTMLImageElements; no image or engine substitution.', errors: observed.errors, expectedCoverCount: definition.cover.length, rows});
  check(id + ': actual compiled R3 cover drawImage preserves native crop proportions and ground foot', rows.length > 0 && observed.errors.length === 0 && rows.every(item => item.observed && item.valid));
}
try {
  for (const id of api.GAME_RESERVE_GRAND_IDS) {
    const p = await page(); await enter(p);
    await p.locator('[data-reserve-expedition-choice]').selectOption(id); await mount(p);
    const initial = await disk(p);
    check(id + ': public menu creates exact V6 identity with24healthy adults,6aircraft and48lots', initial.version === 6 && initial.reserveId === id && initial.humans.length === 24 && initial.humans.every(h => h.status === 'active' && h.hp === 70) && initial.ships.length === 6 && initial.supplies.reduce((a, b) => a + b, 0) === 48);
    await button(p, 'Commencer l’expédition'); await hold(p, 'ArrowRight', 400);
    check(id + ': actual keyboard input advances a healthy native world', Number((await view(p)).reserveX) > 150 && Number((await view(p)).reserveTick) > 0);
    await observeNativeCovers(p, id);
    if (id === 'vharuun-grand-hunt') check('Vharuun: interception0/1 is visible in the live HUD without any mechanic goal', await p.locator('[data-reserve-field-status]').getByText('Départs interrompus : 0/1', {exact: true}).isVisible());
    await capture(p, id + '-native-canvas', canvas(p));
    await button(p, 'Pause'); const stopped = await view(p), durable = await raw(p); await p.clock.runFor(600);
    check(id + ': pause freezes actual simulation and durable bytes', (await view(p)).reserveTick === stopped.reserveTick && await raw(p) === durable);
    await capture(p, id + '-native-start'); outcomes[id] = await disk(p);
    const goalCount = api.GAME_RESERVE_GRAND_CATALOGUE.find(item => item.id === id).cacheObjectives?.length ?? 0;
    if (goalCount) {
      const summary = p.locator('[data-reserve-notebook-summary]'); await summary.scrollIntoViewIfNeeded(); await summary.click();
      const objectives = p.locator('[data-reserve-objectives-v109]'); await objectives.scrollIntoViewIfNeeded();
      const guidance = await objectives.locator('p').first().innerText(), displayed = /chacun des (\d+) dépôts.*? (\d+)\/(\d+) dépôts éprouvés/.exec(guidance);
      check(id + ': visible notebook guidance and real listed depots agree with its objective count', await objectives.isVisible() && displayed !== null && Number(displayed[1]) === goalCount && Number(displayed[2]) === 0 && Number(displayed[3]) === goalCount && await objectives.locator('ul > li').count() === goalCount);
      await capture(p, id + '-native-cache-objectives');
    }
  }
  // A real accepted V6 factory, with downed adults declared only to isolate
  // terrain/hazard/storage. No notes, result or earned inventory is seeded.
  const id = 'khar-duun-grand-hunt', definition = api.GAME_RESERVE_GRAND_CATALOGUE.find(item => item.id === id);
  const initial = api.createGameReserveV109(113, id);
  for (const human of initial.humans) {human.status = 'down'; human.hp = 0; human.downAt = 0;}
  assert(api.normalizeGameReserveV66(initial)); fixtures.push({kind: 'geometry', id, seed: 113, downedAdults: 24, scope: 'Terrain, hazard, pause, persistence and extraction only; no combat victory or earned record seeded.'});
  const p = await page(initial); await enter(p); await mount(p); await button(p, 'Commencer l’expédition');
  const hazard = definition.hazards.find(item => item.kind === 'harm');
  await walk(p, hazard.x + hazard.w / 2); const beforeHp = Number((await view(p)).reserveHealth);
  await p.clock.runFor(900);
  check('Khar: actual floor hazard wounds the hunter and is named by the native HUD', Number((await view(p)).reserveHealth) < beforeHp && await p.locator('[data-reserve-hazard="harm"]').count() === 1);
  await capture(p, 'khar-native-hazard');
  await walk(p, hazard.x - 40); await button(p, 'Pause'); const before = await raw(p), tick = (await view(p)).reserveTick;
  await p.evaluate(k => {const old = Storage.prototype.setItem; window.__restorePreserveV6 = () => {Storage.prototype.setItem = old;}; Storage.prototype.setItem = function (key, value) {if (key === k) throw new DOMException('V6 quota fixture', 'QuotaExceededError'); return old.call(this, key, value);};}, key);
  await button(p, 'Reprendre la chasse');
  check('V6 rejected storage blocks resume and preserves all durable bytes', (await view(p)).reservePaused === 'true' && await raw(p) === before && (await view(p)).reserveTick === tick);
  await p.evaluate(() => {window.__restorePreserveV6(); delete window.__restorePreserveV6;});
  await button(p, 'Réessayer la sauvegarde et reprendre');
  check('V6 retry resumes the same physical world', (await view(p)).reservePaused === 'false' && (await disk(p)).reserveId === id);
  await button(p, 'Ouvrir le carnet de traque et suspendre la chasse');
  await p.setViewportSize({width: 390, height: 844}); await p.clock.runFor(100);
  check('V6 native notebook names six real posts and fits390px', await p.locator('[data-reserve-route-site]').count() === 6 && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await p.locator('[data-reserve-route-site]').first().scrollIntoViewIfNeeded();
  check('Mobile notebook first actual post can be reached by native scrolling', await p.locator('[data-reserve-route-site]').first().isVisible());
  await capture(p, 'v6-mobile-notebook'); const saved = await raw(p);
  await p.locator('[data-reserve-route-site]').last().scrollIntoViewIfNeeded();
  await capture(p, 'v6-mobile-notebook-last-post');
  await p.clock.resume(); await enter(p); await mount(p);
  check('Ordinary reload restores the exact acknowledged V6 checkpoint', await raw(p) === saved);
  await button(p, 'Reprendre la chasse'); await walk(p, 115); await hold(p, 'KeyE', 1250);
  check('V6 returns by real keyboard movement and the exposed extraction channel', (await view(p)).reserveStatus === 'returned' && (await disk(p)).status === 'returned');
  await capture(p, 'v6-physical-return'); outcomes.geometryReturned = await disk(p);
  const legacy = api.createGameReserveV108(113), legacyPage = await page(legacy); fixtures.push({kind: 'legacy-cancellation', id: legacy.reserveId, scope: 'Untouched original V4 factory; no result seeded.'});
  await enter(legacyPage); const original = await raw(legacyPage);
  await legacyPage.getByRole('button', {name: 'Nouvelle expédition libre…', exact: true}).click();
  await legacyPage.locator('[data-reserve-expedition-choice]').selectOption('iskhel-grand-hunt');
  await legacyPage.getByRole('button', {name: 'Conserver l’expédition', exact: true}).click();
  check('Cancelling V6 replacement preserves every original V4 byte', await raw(legacyPage) === original);
  const unsupported = {...api.createGameReserveV109(113, 'iskhel-grand-hunt'), version: 7}, future = await page(unsupported);
  await enter(future, true); const protectedRaw = await raw(future);
  check('Future V7 is protected in the real menu without replacement', await future.locator('[data-bonus-start]').isDisabled() && await raw(future) === protectedRaw);
  const campaign = await page(), owner = await campaignFixture(); fixtures.push({kind: 'adult-campaign', owner: owner.save.createdAt, scope: 'Accepted existing adult campaign; no rite or ship acquisition claimed.'});
  await enterCampaignDeck(campaign, {url: baseUrl});
  await campaign.getByRole('button', {name: 'Dossier de campagne', exact: true}).click();
  await campaign.getByRole('button', {name: 'Mondes et réserves', exact: true}).click();
  await campaign.locator('[data-reserve-expedition-choice]').selectOption('avar-kesh-grand-hunt');
  await campaign.locator('[data-game-reserve-start]').click();
  await campaign.waitForFunction(() => document.querySelector('[data-game-reserve-campaign] canvas')?.getAttribute('data-reserve-assets') === 'true');
  const campaignSave = await campaign.evaluate(k => JSON.parse(localStorage.getItem(k)), owner.key);
  check('Real campaign callback selects V6, keeps its owner and leaves the free archive separate', campaignSave.gameReserveV66.version === 6 && campaignSave.gameReserveV66.reserveId === 'avar-kesh-grand-hunt' && campaignSave.createdAt === owner.save.createdAt && await raw(campaign) === null);
  await capture(campaign, 'v6-real-campaign-entry');
  check('Every original V6 texture has a genuine200image response; reload revalidation only uses200or304', textures.size === nativePaths.size && [...textures.values()].every(row => row.responses.some(response => response.status === 200 && response.type?.startsWith('image/')) && row.responses.every(response => response.status === 200 || response.status === 304)));
  check('No browser exception, console error or local HTTP error', errors.length === 0 && consoleErrors.length === 0 && httpErrors.length === 0);
} catch (error) {
  failure = error instanceof Error ? error.stack : String(error); console.error(failure);
  for (const [index, context] of contexts.entries()) await context.pages()[0]?.screenshot({path: path.join(output, 'failure-' + index + '.png'), timeout: 5000}).catch(() => {});
} finally {
  const sourceAfter = await snapshot();
  if (JSON.stringify(sourceBefore) !== JSON.stringify(sourceAfter)) failure ??= 'Source bytes changed during browser journey';
  const headAfter = localHead(); if (headAfter !== runtimeCommit) failure ??= 'Pinned runtime HEAD changed during browser journey';
  const restoredObservers = await Promise.all(contexts.map(async (context, index) => ({context: index, restored: await context.pages()[0]?.evaluate(() => window.__preserveCoverObservationV6?.restore() === true).catch(() => false)})));
  const restored = restoredObservers.every(item => item.restored);
  checks.push({name: 'Passive native drawImage observers are restored before contexts close', status: restored ? 'PASS' : 'FAIL'});
  if (!restored) failure ??= 'A passive drawImage observer was not restored';
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({status: failure ? 'FAIL' : 'PASS', checkedAt: new Date().toISOString(), mode: 'Next production compiled combined runtime', runtimeCommit, headBefore, headAfter, baseCommit: '03cf51badd450338d748da55599a317a71debd28', sourcePR82: '904cfa12519c5af1837b1e8b614e046c52982200', buildId, baseUrl,
    runtime: {node: process.version, chromium: browser.version()}, invocation: {command: 'node scripts/qa-preserve-grand-hunts-v6.mjs', environment: {YAUTJA_QA_BASE_URL: baseUrl, YAUTJA_QA_BUILD_ID: buildId, YAUTJA_QA_RUNTIME_COMMIT: runtimeCommit, YAUTJA_PRESERVE_V6_OUTPUT: output}},
    scope: 'Four healthy V6 public entries and actual keyboard/pause, passive real compiled cover drawImage observations, declared geometry hazard/storage/mobile/reload/extraction, untouched V4 replacement cancellation, real V7 protection and adult-campaign entry. No full combat victory,20–35minute duration, global performance or historical-certificate recertification claimed.',
    checks, fixtures, captures, outcomes, servedBuilds, coverObservations, restoredObservers, textures: [...textures.values()], errors, consoleErrors, httpErrors, sourceBefore, sourceAfter, ...(failure ? {failure} : {})}, null, 2) + '\n');
  await Promise.allSettled(contexts.map(context => context.close())); await browser.close();
}
if (failure) process.exitCode = 1; else console.log(JSON.stringify({status: 'PASS', checks: checks.length, captures: captures.length, output}));
