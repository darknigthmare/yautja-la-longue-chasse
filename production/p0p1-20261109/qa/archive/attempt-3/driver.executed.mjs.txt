/** Native Chromium QA of the actual V115 component, reducers, Web Locks and
 * IndexedDB fence. The host is the existing V151 esbuild fixture, not Next or
 * GameClient. Every V115 archive byte below is written by the production UI.
 * One disclosed fault delegates the native IDB put, then aborts its actual
 * confirmation transaction; no DOM, reducer, storage read or clock is faked. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, extname, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, process.env.WAR_ARCHIVE_QA_OUTPUT ?? 'production/p0p1-20261109/qa/archive/attempt-3');
const key = 'yautja.clan-war.v115.operations.fenced.v2';
const legacyKey = 'yautja.clan-war.v115.operations.free.v1';
const lockName = `${key}.write`;
const dbName = 'yautja.clan-war.v94.fences', storeName = 'intents';
const hunterKey = 'p0p1-v115-unrelated-hunter-save-20261109';
const sha = value => createHash('sha256').update(value).digest('hex');
const bundle = await build({ absWorkingDir: root, entryPoints: ['tests/browser/clan-war-v151-four-modes.fixture.tsx'],
  bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', write: false, metafile: true,
  outfile: 'archive.js', logLevel: 'warning' });
const js = bundle.outputFiles.find(file => file.path.endsWith('.js'))?.contents;
const css = bundle.outputFiles.find(file => file.path.endsWith('.css'))?.contents;
assert.ok(js && css, 'The actual V115 component and its CSS must bundle');
// Real pre-migration UI/model sources from the preceding committed version.
// They write the original namespace through their original production handler;
// shared dependencies and the existing fixture are current and declared below.
const legacyCommit = '39b601ce1873a1f400d2f545f0fab97691b779e3';
const legacyFiles = ['app/game/ClanWarOperationsV115.tsx', 'app/game/systems/clanWarOperationsV115.ts'];
const legacySources = Object.fromEntries(legacyFiles.map(file => [file,
  execFileSync('git', ['show', `${legacyCommit}:${file}`], { cwd: root, encoding: 'utf8' })]));
const oldBundle = await build({ absWorkingDir: root, entryPoints: ['tests/browser/clan-war-v151-four-modes.fixture.tsx'],
  bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', write: false, metafile: true,
  outfile: 'legacy.js', logLevel: 'warning', plugins: [{ name: 'exact-pre-migration-ui-and-model', setup(builder) {
    builder.onLoad({ filter: /(?:ClanWarOperationsV115\.tsx|clanWarOperationsV115\.ts)$/ }, args => {
      const relative = args.path.slice(root.length).replaceAll('\\', '/');
      const source = legacySources[relative];
      if (source === undefined) return null;
      return { contents: source, loader: relative.endsWith('.tsx') ? 'tsx' : 'ts', resolveDir: dirname(args.path) };
    });
  } }] });
const legacyJs = oldBundle.outputFiles.find(file => file.path.endsWith('.js'))?.contents;
const legacyCss = oldBundle.outputFiles.find(file => file.path.endsWith('.css'))?.contents;
assert.ok(legacyJs && legacyCss);
const html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Archive V115 · reprise transactionnelle native</title><style>body{color:#e8faf0;background:#0d1e24;font:14px system-ui;margin:0}*{box-sizing:border-box}button,select{min-height:38px}</style><link rel="stylesheet" href="/archive.css"></head><body><div id="root"></div><script src="/archive.js"></script></body></html>';
const legacyHtml = html.replaceAll('/archive.', '/legacy.').replace('Archive V115 · reprise transactionnelle native', 'Ancien client V115 · archive originale');
const sourcePaths = [...new Set([...Object.keys(bundle.metafile.inputs), ...Object.keys(oldBundle.metafile.inputs),
  'app/game/systems/clanWarOperationsArchive.ts', 'app/game/systems/clanWarFenceV94.ts',
  'scripts/qa-clan-war-operations-archive-20261109.mjs', 'package-lock.json'])].sort();
async function sources() {
  return Promise.all(sourcePaths.map(async path => {
    const bytes = await readFile(resolve(root, path)); return { path, bytes: bytes.length, sha256: sha(bytes) };
  }));
}
const sourceBefore = await sources(), served = [], missingAssets = [];
const checks = [], errors = [], consoleErrors = [], httpErrors = [], requestFailures = [], screenshots = [];
const pass = (name, detail) => { checks.push({ name, status: 'PASS', detail }); console.log(`[ARCHIVE PASS] ${name}`); };
const mime = { '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
const publicRoot = resolve(root, 'public');
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    let bytes, contentType;
    if (pathname === '/') { bytes = Buffer.from(html); contentType = 'text/html;charset=utf-8'; }
    else if (pathname === '/legacy/') { bytes = Buffer.from(legacyHtml); contentType = 'text/html;charset=utf-8'; }
    else if (pathname === '/legacy.js') { bytes = legacyJs; contentType = 'text/javascript;charset=utf-8'; }
    else if (pathname === '/legacy.css') { bytes = legacyCss; contentType = 'text/css;charset=utf-8'; }
    else if (pathname === '/archive.js') { bytes = js; contentType = 'text/javascript;charset=utf-8'; }
    else if (pathname === '/archive.css') { bytes = css; contentType = 'text/css;charset=utf-8'; }
    else if (pathname === '/favicon.ico') { response.writeHead(204); response.end(); return; }
    else {
      const path = resolve(publicRoot, `.${pathname}`);
      if (!path.startsWith(`${publicRoot}${sep}`)) throw new Error('Asset outside public');
      bytes = await readFile(path); contentType = mime[extname(path)] ?? 'application/octet-stream';
    }
    served.push({ path: pathname, bytes: bytes.length, sha256: sha(bytes) });
    response.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-store' }); response.end(bytes);
  } catch {
    missingAssets.push(request.url); response.writeHead(404); response.end('Missing actual asset');
  }
});
const panel = page => page.locator('[data-testid="clan-operations-v115"]');
const raw = (page, storageKey = key) => page.evaluate(k => localStorage.getItem(k), storageKey);
const read = async (page, storageKey = key) => JSON.parse(await raw(page, storageKey) ?? 'null');
async function until(page, predicate, message, timeout = 15_000, storageKey = key) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const state = await read(page, storageKey); if (predicate(state)) return state;
    await page.waitForTimeout(50);
  }
  throw new Error(message);
}
async function fence(page, storageKey = key) {
  return page.evaluate(async ({ dbName, storeName, key }) => {
    if (!(await indexedDB.databases()).some(database => database.name === dbName)) return null;
    return new Promise((resolve, reject) => {
      const opening = indexedDB.open(dbName, 1);
      opening.onerror = () => reject(new Error('Native fence inspection failed to open'));
      opening.onsuccess = () => {
        const db = opening.result, tx = db.transaction(storeName, 'readonly');
        let result = null;
        const request = tx.objectStore(storeName).get(key);
        request.onsuccess = () => { result = request.result ?? null; };
        tx.oncomplete = () => { db.close(); resolve(result); };
        tx.onabort = () => { db.close(); reject(new Error('Native fence inspection aborted')); };
      };
    });
  }, { dbName, storeName, key: storageKey });
}
async function confirmed(page) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const [record, bytes] = await Promise.all([fence(page), raw(page)]);
    if (record?.phase === 'confirmed' && record.after === bytes) return { record, raw: bytes, state: JSON.parse(bytes) };
    await page.waitForTimeout(50);
  }
  throw new Error('A native confirmed fence must match the exact readable mirror');
}
async function capture(page, name) {
  if (/^(01|02|07|10|12|13)-/.test(name)) {
    await panel(page).getByRole('region', { name: 'Mission jouable active' }).evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
  } else if (/09-/.test(name)) {
    await panel(page).getByRole('alert').evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
  } else await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  const path = resolve(output, name); await page.screenshot({ path, fullPage: false });
  const bytes = await readFile(path); screenshots.push({ file: name, bytes: bytes.length, sha256: sha(bytes) });
}
async function snapshot(page, name) {
  const value = { raw: await raw(page), fence: await fence(page), trace: await page.evaluate(() => window.archiveQa),
    protectedStorage: await page.evaluate(k => Object.fromEntries(Object.keys(localStorage).filter(key => key !== k).sort().map(key => [key, localStorage.getItem(key)])), key) };
  await writeFile(resolve(output, `${name}.json`), JSON.stringify(value, null, 2) + '\n'); return value;
}
async function prepare(page) {
  const lab = page.locator('[data-testid="v147-actual-four-mode-lab"]');
  const target = await lab.getAttribute('data-legal-target'), team = await lab.getAttribute('data-legal-team');
  const initialRav = Number(await lab.getAttribute('data-initial-rav'));
  assert.ok(target && team && Number.isFinite(initialRav));
  await panel(page).getByRole('button', { name: /^Bataille totale/ }).click();
  await panel(page).getByRole('combobox', { name: 'Territoire de la Bible V6' }).selectOption(target);
  const choices = panel(page).locator('input[type="checkbox"]');
  for (let i = await choices.count() - 1; i >= 1; i--) if (await choices.nth(i).isChecked()) await choices.nth(i).uncheck();
  if (!await choices.first().isChecked()) await choices.first().check();
  assert.equal(await panel(page).getByRole('button', { name: /^Lancer :/ }).isEnabled(), true);
  return { target, team, initialRav };
}
async function context(browser) {
  const ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width: 1320, height: 900 } });
  await ctx.addInitScript(({ key, legacyKey, dbName, storeName }) => {
    const trace = window.archiveQa = { abortNextConfirmation: false, aborts: [], mirrorWrites: [], legacyMirrorWrites: [], fencePuts: [] };
    const put = IDBObjectStore.prototype.put, set = Storage.prototype.setItem;
    IDBObjectStore.prototype.put = function (value, recordKey) {
      const request = put.apply(this, arguments); // Always perform the real IDB request first.
      if (this.transaction.db.name === dbName && this.name === storeName && recordKey === key) {
        trace.fencePuts.push({ token: value.token, phase: value.phase, before: value.before, after: value.after });
        if (trace.abortNextConfirmation && value.phase === 'confirmed') {
          trace.abortNextConfirmation = false;
          trace.aborts.push({ token: value.token, phase: value.phase, nativeTransactionMode: this.transaction.mode });
          this.transaction.abort(); // Real transaction rollback; the previous committed intent remains.
        }
      }
      return request;
    };
    Storage.prototype.setItem = function (storageKey, value) {
      const result = set.apply(this, arguments); // Observe only; production owns all mirror bytes.
      if (storageKey === key) trace.mirrorWrites.push(String(value));
      if (storageKey === legacyKey) trace.legacyMirrorWrites.push(String(value));
      return result;
    };
  }, { key, legacyKey, dbName, storeName });
  return ctx;
}
function observe(page, name) {
  page.setDefaultTimeout(25_000);
  page.on('pageerror', error => errors.push({ page: name, message: error.message }));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push({ page: name, message: message.text() }); });
  page.on('response', response => { if (response.status() >= 400) httpErrors.push({ page: name, url: response.url(), status: response.status() }); });
  page.on('requestfailed', request => requestFailures.push({ page: name, url: request.url(), failure: request.failure() }));
}

let browser, listening = false;
try {
  await mkdir(output, { recursive: true });
  await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
  listening = true;
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}/`;
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE ?? '/usr/bin/chromium', headless: true });
  const ctx = await context(browser), a = await ctx.newPage(), b = await ctx.newPage();
  for (const [name, page] of [['A', a], ['B', b]]) {
    observe(page, name); await page.goto(url, { waitUntil: 'domcontentloaded' }); await panel(page).waitFor();
  }
  await a.evaluate(k => localStorage.setItem(k, 'protected-hunter-profile-sentinel'), hunterKey);
  assert.equal(await raw(a), null); assert.equal(await raw(b), null);
  assert.equal(await fence(a), null);
  pass('Two real V115 panels adopt empty archives read-only without inventing a default save', { tabs: 2, mirror: null, fence: null });
  await a.bringToFront();
  const request = await prepare(a);
  await panel(a).getByRole('button', { name: /^Lancer :/ }).click();
  const initial = await until(a, state => state?.serial === 1 && state.active?.mode === 'rts' && state.active.rts?.realtime, 'Native RTS start did not persist');
  const initialCommit = await confirmed(a);
  assert.equal(initial.active.targetId, request.target);
  assert.equal(initial.assignments[request.team], 'W115-OPS-0001');
  assert.ok(initial.rav < request.initialRav, 'One actual source-unit upkeep is charged at launch');
  assert.equal(initialCommit.record.before, null);
  pass('Actual RTS launch reserves and confirms a native IDB intent before acknowledging the same mission and RAV mirror',
    { serial: initial.serial, team: request.team, target: request.target, beforeRav: request.initialRav, afterRav: initial.rav, token: initialCommit.record.token });
  await capture(a, '01-native-rts-committed.png'); await snapshot(a, '01-native-rts-committed');

  await b.evaluate(name => {
    window.archiveHeld = false;
    void navigator.locks.request(name, () => { window.archiveHeld = true; return new Promise(resolve => { window.releaseArchiveLock = resolve; }); });
  }, lockName);
  await b.waitForFunction(() => window.archiveHeld === true);
  const frozen = await confirmed(a);
  await a.waitForTimeout(2500);
  assert.equal(await raw(a), frozen.raw);
  assert.deepEqual(await fence(a), frozen.record);
  pass('A sibling native Web Lock freezes both RTS ticks and the IDB fence', { tick: frozen.state.active.tick, durationMs: 2500, token: frozen.record.token });
  await capture(a, '02-native-lock-frozen.png');
  await b.evaluate(() => window.releaseArchiveLock());
  const resumed = await until(a, state => state?.active?.tick > frozen.state.active.tick || state?.reports?.length > 0, 'Native realtime ticks did not resume');
  assert.equal(resumed.serial, 1); assert.equal(resumed.rav, initial.rav);
  pass('Lock release resumes the same native mission without charging upkeep twice', { fromTick: frozen.state.active.tick, toTick: resumed.active?.tick, serial: resumed.serial, rav: resumed.rav });
  assert.equal(resumed.active?.mode, 'rts', 'The selected live mission must remain available for its native pause control');
  await panel(a).getByRole('button', { name: 'Passer en ordres alternés' }).click();
  const alternating = await until(a, state => state?.active?.rts?.realtime === false, 'Alternating orders were not persisted');
  const alternatingCommit = await confirmed(a);
  assert.equal(alternating.serial, 1); assert.equal(alternating.rav, initial.rav);
  pass('Switching to alternating orders confirms another fence without starting or paying for another mission', { clock: alternating.clock, tick: alternating.active.tick, token: alternatingCommit.record.token });
  await b.bringToFront();
  await panel(b).getByRole('alert').filter({ hasText: /Front V115 modifié/ }).waitFor();
  assert.equal(await panel(b).getByRole('button', { name: 'Réinitialiser V115 uniquement' }).isDisabled(), true);
  assert.equal(await raw(b), alternatingCommit.raw);
  pass('The stale sibling detects the authoritative front and cannot reset it', { archiveBytesPreserved: true });
  await capture(b, '03-native-stale-tab-blocked.png');
  const beforeReload = await snapshot(b, '03-before-stale-reload');
  await b.reload({ waitUntil: 'domcontentloaded' }); await panel(b).waitFor();
  await panel(b).getByRole('button', { name: 'Activer la bataille en temps réel' }).waitFor();
  const reloaded = await snapshot(b, '04-after-stale-reload');
  assert.equal(reloaded.raw, beforeReload.raw); assert.deepEqual(reloaded.fence, beforeReload.fence);
  assert.deepEqual(reloaded.trace.mirrorWrites, []); assert.deepEqual(reloaded.trace.fencePuts, []);
  assert.equal(await panel(b).getByRole('button', { name: 'Réinitialiser V115 uniquement' }).isEnabled(), true);
  assert.equal(JSON.parse(reloaded.raw).rav, initial.rav);
  pass('Reload adopts the exact confirmed archive without mirror writes, fence writes or another upkeep debit', { serial: 1, rav: initial.rav, sameToken: true });
  await capture(b, '04-native-reloaded-alternating.png');
  assert.equal(await b.evaluate(k => localStorage.getItem(k), hunterKey), 'protected-hunter-profile-sentinel');
  await ctx.close();

  // Native old handler, not a direct test write of a made-up game DTO.
  const migrationContext = await context(browser), old = await migrationContext.newPage(), migrated = await migrationContext.newPage();
  observe(old, 'OLD-39b601ce'); observe(migrated, 'NEW-migration');
  await old.goto(`${url}legacy/`, { waitUntil: 'domcontentloaded' }); await panel(old).waitFor();
  await prepare(old); await panel(old).getByRole('button', { name: /^Lancer :/ }).click();
  await until(old, state => state?.serial === 1 && state.active?.rts?.realtime, 'The actual old UI must create its legacy exercise', 15_000, legacyKey);
  await panel(old).getByRole('button', { name: 'Passer en ordres alternés' }).click();
  await until(old, state => state?.active?.rts?.realtime === false, 'The old UI must pause its actual exercise', 15_000, legacyKey);
  const legacyBefore = await raw(old, legacyKey), chosen = JSON.parse(legacyBefore);
  assert.equal(await raw(old), null); assert.equal(await fence(old), null);
  await capture(old, '10-actual-old-client-before-adoption.png');
  pass('A real old V115 UI/model creates and pauses its original legacy archive without a canonical mirror',
    { commit: legacyCommit, pinnedFiles: legacyFiles, sharedDependencies: 'Current declared dependencies; this is not a complete historical checkout', serial: chosen.serial, rav: chosen.rav });
  await migrated.goto(url, { waitUntil: 'domcontentloaded' }); await panel(migrated).waitFor();
  assert.equal(await panel(migrated).getAttribute('data-war-archive-state'), 'legacy-available');
  assert.equal(await raw(migrated), null); assert.equal(await raw(migrated, legacyKey), legacyBefore);
  const exportedBeforePromise = migrated.waitForEvent('download');
  await panel(migrated).getByRole('button', { name: 'Exporter les sources de récupération V115' }).click();
  const exportedBefore = await exportedBeforePromise;
  await exportedBefore.saveAs(resolve(output, 'legacy-recovery-before-adoption.json'));
  const recoveryBefore = JSON.parse(await readFile(resolve(output, 'legacy-recovery-before-adoption.json'), 'utf8'));
  assert.equal(recoveryBefore.mirror, legacyBefore); assert.equal(recoveryBefore.fence, null);
  await capture(migrated, '11-native-explicit-adoption-preview.png');
  await panel(migrated).getByRole('button', { name: 'Adopter cette archive dans le registre isolé' }).click();
  await until(migrated, state => state?.serial === chosen.serial && state?.active?.id === chosen.active.id, 'Explicit adoption must persist the chosen state');
  const adoption = await confirmed(migrated);
  assert.equal(adoption.raw, legacyBefore); assert.equal(await raw(migrated, legacyKey), legacyBefore);
  assert.equal(adoption.state.rav, chosen.rav);
  pass('The new UI requires explicit adoption, copies the exact chosen checkpoint and offers a real recovery download without altering legacy',
    { serial: adoption.state.serial, rav: adoption.state.rav, token: adoption.record.token, legacyBytesPreserved: true });
  await migrated.evaluate(name => {
    window.archiveHeld = false;
    void navigator.locks.request(name, () => { window.archiveHeld = true; return new Promise(resolve => { window.releaseArchiveLock = resolve; }); });
  }, lockName);
  await migrated.waitForFunction(() => window.archiveHeld === true);
  await old.bringToFront();
  await panel(old).getByRole('button', { name: 'Défendre / laisser passer un tour tactique' }).click();
  const legacyAdvanced = await until(old, state => state?.active?.tick > chosen.active.tick, 'The actual old handler must write again after adoption', 15_000, legacyKey);
  const legacyAfter = await raw(old, legacyKey);
  assert.notEqual(legacyAfter, legacyBefore);
  assert.equal(await raw(old), adoption.raw); assert.deepEqual(await fence(old), adoption.record);
  pass('An old client genuinely writes its legacy key while the canonical Web Lock is held, without changing the adopted canonical bytes or fence',
    { oldTick: legacyAdvanced.active.tick, canonicalTick: adoption.state.active.tick, canonicalToken: adoption.record.token, oldClientUsesOwnLegacyProtocol: true });
  await migrated.evaluate(() => window.releaseArchiveLock());
  await migrated.bringToFront();
  assert.equal(await panel(migrated).getByRole('alert').count(), 0);
  await panel(migrated).getByRole('button', { name: 'Défendre / laisser passer un tour tactique' }).click();
  const continued = await until(migrated, state => state?.active?.tick > chosen.active.tick, 'The canonical exercise must remain playable after an old writer acts');
  await confirmed(migrated);
  assert.equal(continued.serial, chosen.serial); assert.equal(continued.rav, chosen.rav);
  assert.equal(await raw(migrated, legacyKey), legacyAfter);
  await capture(migrated, '12-native-canonical-continues-after-old-write.png');
  const exportedAfterPromise = migrated.waitForEvent('download');
  await panel(migrated).getByRole('button', { name: 'Exporter l’ancienne archive conservée' }).click();
  const exportedAfter = await exportedAfterPromise;
  await exportedAfter.saveAs(resolve(output, 'legacy-recovery-after-old-write.json'));
  const recoveryAfter = JSON.parse(await readFile(resolve(output, 'legacy-recovery-after-old-write.json'), 'utf8'));
  assert.equal(recoveryAfter.mirror, legacyAfter); assert.equal(recoveryAfter.legacyKey, legacyKey); assert.equal(recoveryAfter.canonicalKey, key);
  const oldTrace = await old.evaluate(() => window.archiveQa), newTrace = await migrated.evaluate(() => window.archiveQa);
  assert.ok(oldTrace.legacyMirrorWrites.length >= 3); assert.deepEqual(oldTrace.mirrorWrites, []);
  assert.deepEqual(newTrace.legacyMirrorWrites, []); assert.ok(newTrace.mirrorWrites.length >= 2);
  pass('Canonical orders continue with one upkeep debit and the independently advanced legacy branch remains downloadable from the current UI',
    { serial: continued.serial, rav: continued.rav, canonicalTick: continued.active.tick, actualRecoveryDownload: true });
  const canonicalBeforeReload = await raw(migrated), fenceBeforeReload = await fence(migrated);
  await migrated.reload({ waitUntil: 'domcontentloaded' }); await panel(migrated).waitFor();
  await panel(migrated).getByRole('button', { name: 'Activer la bataille en temps réel' }).waitFor();
  assert.equal(await raw(migrated), canonicalBeforeReload); assert.deepEqual(await fence(migrated), fenceBeforeReload);
  assert.equal(await panel(migrated).getAttribute('data-war-archive-state'), null);
  await writeFile(resolve(output, 'legacy-migration-native.json'), JSON.stringify({ legacyBefore, legacyAfter,
    adoption, continued, canonicalBeforeReload, fenceBeforeReload, recoveryBefore, recoveryAfter, oldTrace, newTrace }, null, 2) + '\n');
  pass('Reload selects the established canonical exercise and never re-imports an old-client branch', { canonicalBytesUnchanged: true, noSecondAdoptionPrompt: true });
  await migrationContext.close();

  // A new browser context owns a genuinely empty origin. Do not prepare or
  // edit V115 archive DTOs; the only fault is one actual IDB confirmation abort.
  const crashContext = await context(browser), c = await crashContext.newPage(); observe(c, 'C');
  await c.goto(url, { waitUntil: 'domcontentloaded' }); await panel(c).waitFor();
  await c.evaluate(k => localStorage.setItem(k, 'protected-hunter-profile-sentinel'), hunterKey);
  const crashRequest = await prepare(c);
  await c.evaluate(() => { window.archiveQa.abortNextConfirmation = true; });
  await panel(c).getByRole('button', { name: /^Lancer :/ }).click();
  await panel(c).getByRole('alert').filter({ hasText: /Écriture V115 non confirmée/ }).waitFor();
  const interrupted = await snapshot(c, '05-native-confirmation-aborted');
  const interruptedState = JSON.parse(interrupted.raw);
  assert.equal(interrupted.trace.aborts.length, 1);
  assert.equal(interrupted.trace.aborts[0].nativeTransactionMode, 'readwrite');
  assert.equal(interrupted.fence.phase, 'intent');
  assert.equal(interrupted.fence.after, interrupted.raw);
  assert.equal(interruptedState.serial, 1); assert.equal(interruptedState.active.tick, 0);
  assert.equal(interruptedState.rav, initial.rav); assert.equal(interruptedState.active.targetId, crashRequest.target);
  assert.equal(await panel(c).getByRole('button', { name: 'Réinitialiser V115 uniquement' }).isDisabled(), true);
  assert.ok(!(await panel(c).getByRole('status').last().textContent()).includes('Déploiement RTS confirmé'));
  pass('A delegated native confirmation put followed by real transaction abort preserves the durable intent and refuses a success announcement',
    { aborts: 1, phase: interrupted.fence.phase, serial: 1, tick: 0, rav: interruptedState.rav, token: interrupted.fence.token });
  await capture(c, '05-native-interrupted-write.png');
  await c.reload({ waitUntil: 'domcontentloaded' }); await panel(c).waitFor();
  const repair = panel(c).getByRole('button', { name: 'Reprendre l’écriture V115 interrompue' }); await repair.waitFor();
  const rediscovered = await snapshot(c, '06-native-intent-after-reload');
  assert.equal(rediscovered.raw, interrupted.raw); assert.deepEqual(rediscovered.fence, interrupted.fence);
  assert.deepEqual(rediscovered.trace.mirrorWrites, []); assert.deepEqual(rediscovered.trace.fencePuts, []);
  assert.equal(await panel(c).getByRole('button', { name: 'Réinitialiser V115 uniquement' }).isDisabled(), true);
  pass('Reload rediscovers the same real intent in read-only recovery and does not replay the operation', { token: rediscovered.fence.token, sameBytes: true, writes: 0 });
  await capture(c, '06-native-recovery-awaits-confirmation.png');
  await c.setViewportSize({ width: 390, height: 844 });
  await capture(c, '09-native-recovery-mobile-390.png');
  await c.setViewportSize({ width: 1320, height: 900 });
  // Two actual button events in one task exercise the component's native busy
  // guard while the first asynchronous Web Lock/IDB transaction is pending.
  await repair.evaluate(button => { button.click(); button.click(); });
  await repair.waitFor({ state: 'hidden' });
  await panel(c).getByRole('button', { name: 'Passer en ordres alternés' }).click();
  const repaired = await until(c, state => state?.active?.rts?.realtime === false, 'Repaired native mission could not enter alternating orders');
  const repairedCommit = await confirmed(c), repairedTrace = await c.evaluate(() => window.archiveQa);
  const repairConfirmations = repairedTrace.fencePuts.filter(record => record.phase === 'confirmed' && record.token === interrupted.fence.token);
  assert.equal(repairConfirmations.length, 1, 'Double input confirms exactly the original intent once');
  assert.equal(repairConfirmations[0].after, interrupted.raw);
  assert.equal(repairedTrace.mirrorWrites.filter(bytes => bytes === interrupted.raw).length, 0, 'Repair never rewrites an already readable intended mirror');
  assert.equal(repaired.serial, 1); assert.equal(repaired.rav, interruptedState.rav);
  assert.equal(repaired.active.id, interruptedState.active.id); assert.equal(repaired.reports.length, 0);
  pass('Explicit double-input repair confirms the original token once, without replaying launch, rewriting identical bytes or charging upkeep again',
    { originalToken: interrupted.fence.token, originalConfirmations: repairConfirmations.length, serial: repaired.serial, rav: repaired.rav, currentToken: repairedCommit.record.token });
  await capture(c, '07-native-repaired-mission.png'); await snapshot(c, '07-native-repaired-mission');
  const postRepairRaw = await raw(c), postRepairFence = await fence(c);
  await c.reload({ waitUntil: 'domcontentloaded' }); await panel(c).waitFor();
  await panel(c).getByRole('button', { name: 'Activer la bataille en temps réel' }).waitFor();
  assert.equal(await raw(c), postRepairRaw); assert.deepEqual(await fence(c), postRepairFence);
  assert.equal(await panel(c).getByRole('button', { name: 'Reprendre l’écriture V115 interrompue' }).count(), 0);
  assert.equal(await c.evaluate(k => localStorage.getItem(k), hunterKey), 'protected-hunter-profile-sentinel');
  pass('A second reload is a normal confirmed read with no recovery button, duplicate mission or unrelated hunter-save change', { serial: 1, sameBytes: true, sameFence: true });
  await c.setViewportSize({ width: 390, height: 844 }); await capture(c, '08-native-repaired-mobile-390.png');
  await crashContext.close();
  const sourceAfter = await sources();
  assert.deepEqual(sourceAfter, sourceBefore);
  assert.deepEqual(errors, []); assert.deepEqual(consoleErrors, []); assert.deepEqual(httpErrors, []); assert.deepEqual(requestFailures, []); assert.deepEqual(missingAssets, []);
  pass('Actual fixture resources load without runtime, console, HTTP or asset errors and source inputs stay byte-identical', { sourceFiles: sourceBefore.length, servedResponses: served.length });
  await writeFile(resolve(output, 'source-identity.json'), JSON.stringify({ before: sourceBefore, after: sourceAfter, equal: true }, null, 2) + '\n');
  const report = { schemaVersion: 1, asOf: new Date().toISOString(), baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    runKind: 'esbuild V151 fixture hosting the actual current V115 component, reducers, native localStorage, IndexedDB and Web Locks',
    fullGameClientTested: false, nextProductionTested: false, cloudTested: false, physicalControllerTested: false, artOneToOneApproved: false,
    namespace: { canonical: key, legacy: legacyKey, legacyNeverWrittenByCurrentClient: true, adoption: 'Explicitly chosen checkpoint revalidated before canonical reservation; later old-client progress remains separately recoverable. No atomic compare-and-swap across non-cooperating localStorage/IDB writers is claimed.' },
    oldClient: { commit: legacyCommit, exactPinnedSources: legacyFiles.map(file => ({ path: file, sha256: sha(legacySources[file]) })),
      sharedDependencies: 'Current files included in source-identity; only the two listed UI/model modules are loaded from the old commit',
      jsSha256: sha(legacyJs), cssSha256: sha(legacyCss), fullHistoricalCheckout: false, writesViaOriginalUiHandler: true },
    fixture: 'tests/browser/clan-war-v151-four-modes.fixture.tsx', referenceDriver: 'scripts/qa-clan-war-rts-two-tabs-v152.mjs',
    initialV115ArchiveInjected: false, reducersMocked: false, domPatched: false, clocksMocked: false,
    faultInjection: { kind: 'One native IDBObjectStore.put(confirmed) is delegated, then its real readwrite transaction is aborted',
      affectedOrigin: 'Fresh isolated browser context C', nativeApisDelegated: ['IDBObjectStore.put', 'Storage.setItem'],
      nativeTransactionAborts: 1, archiveBytesWrittenBy: 'Production V115 UI only', doubleRepairInput: 'Two actual button.click() events in one task; native component busy guard and native Web Lock decide acceptance' },
    browserVersion: browser.version(), viewports: [{ width: 1320, height: 900 }, { width: 390, height: 844 }],
    passed: checks.length, failed: 0, checks, screenshots, screenshotVisualInspection: { completed: false, note: 'Original PNGs must be opened separately before visual qualification.' },
    bundle: { jsSha256: sha(js), cssSha256: sha(css), htmlSha256: sha(html), sourceFiles: sourceBefore.length, sourceIdentitySha256: sha(JSON.stringify(sourceBefore)) },
    served, errors, consoleErrors, httpErrors, requestFailures, missingAssets };
  await writeFile(resolve(output, 'report.browser-run.json'), JSON.stringify(report, null, 2) + '\n');
  await mkdir(resolve(output, 'legacy-sources'), { recursive: true });
  for (const file of legacyFiles) await writeFile(resolve(output, 'legacy-sources', file.split('/').at(-1) + '.txt'), legacySources[file]);
  await writeFile(resolve(output, 'README.md'), '# Recette native de l’archive V115 — 9 novembre 2026\n\nCette recette utilise le vrai composant V115 et ses reducers dans la fixture esbuild V151 existante. Elle ne constitue pas une recette Next ou du GameClient complet. Aucun état V115 n’est injecté dans le stockage : le lancement, les ticks, la pause et la réparation passent par l’interface de production.\n\nLe seul failpoint appelle le vrai `IDBObjectStore.put` de confirmation puis `abort()` sur sa transaction native, une seule fois dans un contexte navigateur neuf. L’intention précédente reste dans le vrai IndexedDB. La recharge et la réparation relisent les vraies APIs. Le wrapper de `Storage.setItem` observe et délègue chaque écriture ; il n’en modifie ni les octets ni le résultat.\n\nLe double clic de réparation est constitué de deux événements `button.click()` dans la même tâche afin d’exercer le verrou d’écriture réel pendant la première transaction asynchrone. Aucun DOM ni horloge n’est remplacé. Les captures originales doivent être ouvertes séparément pour une revue visuelle. Les fichiers JSON conservent les octets du miroir, les intentions et les appels observés.\n');
  console.log(JSON.stringify({ passed: checks.length, failed: 0, screenshots: screenshots.length, output }));
} catch (error) {
  await writeFile(resolve(output, 'failure.json'), JSON.stringify({ error: error.stack ?? String(error), checks, errors, consoleErrors, httpErrors, requestFailures, missingAssets }, null, 2) + '\n');
  throw error;
} finally {
  await browser?.close();
  if (listening) { server.closeAllConnections(); await new Promise(done => server.close(done)); }
}
