/** T15: real wall-clock/native-UI endurance, never accelerated game time.
 * The only fixture is an initial adult Alpha campaign. Observers do not patch
 * the game, its DOM, its clocks, its inputs, or its persistence callbacks. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.PHG_ENDURANCE_URL || 'http://127.0.0.1:3122';
const runtimeRoot = process.env.PHG_ENDURANCE_RUNTIME_ROOT || root;
const out = path.resolve(root, process.env.PHG_ENDURANCE_OUTPUT || 'outputs/phg-endurance-p0p1-20261109');
const probe = process.argv.includes('--probe');
const durationSeconds = probe ? 30 : 3600;
const intervalMs = probe ? 400 : 12000;
const sha = data => createHash('sha256').update(data).digest('hex');
const keyFor = { skin: 'skinMaterialId', dreads: 'dreadMaterialId', outfit: 'outfitMaterialId', armor: 'armorMaterialId', biomask: 'maskMaterialId' };
const selectorFor = channel => channel === 'biomask' ? '#chromatic-mask-material-v131' : '#chromatic-material-' + channel;
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, 'run.lock'), new Date().toISOString(), { flag: 'wx' });
const recipe = await fs.readFile(fileURLToPath(import.meta.url));
await fs.writeFile(path.join(out, 'recipe-used.mjs'), recipe);
const bundle = await build({ stdin: { contents: [
  "export {defaultSave,SAVE_STORAGE_KEY,parseSaveImport} from './app/game/save';",
  "export {appearanceForPreset,loadoutForPreset} from './app/game/hunterLore';",
  "export {PHG_CHROMATIC_MATERIALS_V113} from './app/game/hunterChromaticsV113';",
].join('\n'), resolveDir: root }, bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' });
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const materials = api.PHG_CHROMATIC_MATERIALS_V113.filter(item => item.status === 'integrated');
assert.equal(materials.length, 77);
const queues = Object.fromEntries(Object.keys(keyFor).map(channel => [channel, materials.filter(item => item.channel === channel)]));
const ordered = [];
while (Object.values(queues).some(items => items.length)) for (const items of Object.values(queues)) if (items.length) ordered.push(items.shift());
assert.equal(new Set(ordered.map(m => m.id)).size, 77);
async function tree(dir) {
  const files = [];
  for (const item of await fs.readdir(path.join(runtimeRoot, dir), { withFileTypes: true })) {
    const name = path.posix.join(dir, item.name);
    if (item.isDirectory()) files.push(...await tree(name)); else if (item.isFile()) files.push(name);
  }
  return files.sort();
}
async function identity() {
  const files = [...await tree('app'), ...await tree('desktop'), 'package.json', 'package-lock.json'];
  const entries = [];
  for (const name of files.sort()) { const bytes = await fs.readFile(path.join(runtimeRoot, name)); entries.push({ path: name, bytes: bytes.length, sha256: sha(bytes) }); }
  return { sha256: sha(JSON.stringify(entries)), entries };
}
const report = { schemaVersion: 1, startedAt: new Date().toISOString(), probe, url, recipeSha256: sha(recipe),
  sourceCriterion: { path: 'docs/production/Yautja_PHG_Implementation_Status_V137.xlsx', sheet: 'Tests_Parcours', row: 19,
    id: 'T15', priority: 'P1', trigger: '60min, alternance 77 matières', expected: 'Pas de fuite mémoire GPU' },
  scope: 'Native Next GameClient desktop customization; real 3600-second exposure with 77 admissible materials and native commits. GPU memory counters are reported only if the browser exposes them; GPU-process RSS is not VRAM.',
  requestedDurationSeconds: durationSeconds, intervalMs, runtimeRoot, sourceBefore: await identity(),
  buildId: (await fs.readFile(path.join(runtimeRoot, '.next/BUILD_ID'), 'utf8')).trim(), materials: ordered.map(m => ({ id: m.id, channel: m.channel, src: m.src })),
  fixture: 'Initial adult Alpha save only. No material, reward, mission result, experience or currency injected during the run.',
  samples: [], selections: [], screenshots: [], memoryDumps: [], errors: [], consoleErrors: [], requestFailures: [], httpErrors: [], servedScripts: [],
  limits: ['Headless managed-cloud hardware/backend only; no claim about other GPUs, VRAM unavailable to CDP, physical input devices, artistic UV fidelity or a full campaign.',
    'The observer uses its own bounded RAF/long-task counters and memory samples. It does not change game time, force garbage collection, or patch game functions.'] };
const responses = [], seen = new Set();
let browser, browserCdp, pageCdp, page, tracing = false, soakStart = null;
async function fingerprint(file) { const bytes = await fs.readFile(file); return { path: path.relative(root, file), bytes: bytes.length, sha256: sha(bytes) }; }
async function saveProgress(status) {
  const elapsedSeconds = soakStart === null ? 0 : (performance.now() - soakStart) / 1000;
  await fs.writeFile(path.join(out, 'progress.json'), JSON.stringify({ status, wallTime: new Date().toISOString(), elapsedSeconds,
    targetSeconds: durationSeconds, selections: report.selections.length, distinctMaterials: seen.size,
    fullCycles: Math.floor(report.selections.length / 77), lastSample: report.samples.at(-1), errors: report.errors.length,
    buildId: report.buildId, recipeSha256: report.recipeSha256 }, null, 2));
}
async function processMemory() {
  try {
    const { processInfo } = await browserCdp.send('SystemInfo.getProcessInfo');
    const rows = [];
    for (const proc of processInfo) {
      let values = {};
      try {
        const status = await fs.readFile('/proc/' + proc.id + '/status', 'utf8');
        values = Object.fromEntries([...status.matchAll(/^(VmRSS|VmSize|VmHWM):\s+(\d+)\s+kB$/gm)].map(([, name, size]) => [name + 'Bytes', +size * 1024]));
      } catch { /* Unavailable process metrics stay absent. */ }
      rows.push({ type: proc.type, id: proc.id, cpuTimeSeconds: proc.cpuTime, ...values });
    }
    return rows;
  } catch (error) { return { unavailable: error.message }; }
}
async function sample(label, dump = false) {
  const data = await page.evaluate(() => window.__phgEnduranceObserver.snapshot());
  const metrics = await pageCdp.send('Performance.getMetrics');
  const row = { label, elapsedSeconds: (performance.now() - soakStart) / 1000, ...data,
    cdp: Object.fromEntries(metrics.metrics.map(item => [item.name, item.value])), processes: await processMemory(), selections: report.selections.length, distinctMaterials: seen.size };
  report.samples.push(row);
  if (dump && tracing) {
    try { const result = await browserCdp.send('Tracing.requestMemoryDump', { levelOfDetail: 'detailed' }); report.memoryDumps.push({ label, elapsedSeconds: row.elapsedSeconds, ...result }); }
    catch (error) { report.memoryDumps.push({ label, unavailable: error.message }); }
  }
  await fs.appendFile(path.join(out, 'samples.ndjson'), JSON.stringify(row) + '\n');
  await saveProgress('running');
}
async function screenshot(label, fullPage = false) {
  const target = path.join(out, label + '.png');
  if (fullPage) await page.screenshot({ path: target, fullPage: false });
  else { const rig = page.locator('.customization-preview [data-hunter-rig]'); await rig.scrollIntoViewIfNeeded(); await rig.screenshot({ path: target }); }
  report.screenshots.push({ filename: path.basename(target), ...await fingerprint(target), inspected: false });
}
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium', headless: true, args: ['--enable-precise-memory-info'] });
  report.browserVersion = browser.version(); browserCdp = await browser.newBrowserCDPSession();
  report.systemInfo = await browserCdp.send('SystemInfo.getInfo');
  try {
    await browserCdp.send('Tracing.start', { transferMode: 'ReturnAsStream', traceConfig: {
      recordMode: 'recordAsMuchAsPossible', includedCategories: ['disabled-by-default-memory-infra'], excludedCategories: ['*'],
      memoryDumpConfig: { allowedDumpModes: ['light', 'detailed'], triggers: [] },
    } }); tracing = true;
  } catch (error) { report.traceUnavailable = error.message; }
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
  const initial = api.defaultSave('2026-11-09T14:00:00.000Z'); initial.profile.hunterName = 'QA PHG T15 endurance'; initial.settings.masterVolume = 0;
  initial.appearance = api.appearanceForPreset('alpha'); initial.loadout = api.loadoutForPreset('alpha');
  assert.equal(api.parseSaveImport(JSON.stringify(initial)).failure, null);
  await fs.writeFile(path.join(out, 'initial-fixture.json'), JSON.stringify(initial, null, 2));
  await context.addInitScript(({ key, save }) => {
    if (!['http:', 'https:'].includes(location.protocol)) return;
    if (!sessionStorage.getItem('phg-t15-seeded')) { localStorage.setItem(key, JSON.stringify(save)); sessionStorage.setItem('phg-t15-seeded', 'true'); }
    let started = performance.now(), previous = null, frames = 0, totalFrameMs = 0, maxFrameMs = 0, longTaskCount = 0, longTaskMs = 0;
    let visible = document.visibilityState === 'visible', visibilityChanged = started, visibleMs = 0;
    const buckets = new Uint32Array(251);
    const onVisibility = () => { const now = performance.now(); if (visible) visibleMs += now - visibilityChanged; visible = document.visibilityState === 'visible'; visibilityChanged = now; };
    document.addEventListener('visibilitychange', onVisibility);
    const observer = new PerformanceObserver(list => { for (const entry of list.getEntries()) { longTaskCount++; longTaskMs += entry.duration; } });
    try { observer.observe({ type: 'longtask', buffered: true }); } catch { /* Unsupported is reported by empty natural observations. */ }
    const frame = now => { if (previous !== null) { const dt = now - previous; frames++; totalFrameMs += dt; maxFrameMs = Math.max(maxFrameMs, dt); buckets[Math.min(250, Math.max(0, Math.floor(dt)))]++; } previous = now; requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
    window.__phgEnduranceObserver = {
      reset() { started = performance.now(); previous = null; frames = 0; totalFrameMs = 0; maxFrameMs = 0; longTaskCount = 0; longTaskMs = 0; visible = document.visibilityState === 'visible'; visibilityChanged = started; visibleMs = 0; buckets.fill(0); },
      snapshot() { const now = performance.now(); return { browserElapsedMs: now - started, visibleMs: visibleMs + (visible ? now - visibilityChanged : 0),
        visibility: document.visibilityState, focused: document.hasFocus(), frames, totalFrameMs, maxFrameMs, frameBucketsMs: Array.from(buckets), longTaskCount, longTaskMs,
        jsMemory: performance.memory ? { usedJSHeapSize: performance.memory.usedJSHeapSize, totalJSHeapSize: performance.memory.totalJSHeapSize, jsHeapSizeLimit: performance.memory.jsHeapSizeLimit } : null,
        domElements: document.getElementsByTagName('*').length, imageElements: document.images.length, resources: performance.getEntriesByType('resource').length };
      },
    };
  }, { key: api.SAVE_STORAGE_KEY, save: initial });
  page = await context.newPage(); page.setDefaultTimeout(25000); pageCdp = await context.newCDPSession(page); await pageCdp.send('Performance.enable');
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
  page.on('requestfailed', request => report.requestFailures.push({ url: request.url(), failure: request.failure() }));
  page.on('response', response => {
    if (response.status() >= 400) report.httpErrors.push({ url: response.url(), status: response.status() });
    const pathname = new URL(response.url()).pathname;
    if (pathname.startsWith('/_next/static/') && pathname.endsWith('.js')) responses.push((async () => {
      const bytes = await response.body(), local = path.join(runtimeRoot, '.next', decodeURIComponent(pathname.slice('/_next/'.length)));
      assert.equal(sha(bytes), sha(await fs.readFile(local)), pathname); report.servedScripts.push({ path: pathname, sha256: sha(bytes) });
    })());
  });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  await page.locator('[data-campaign-menu]').waitFor();
  if (await page.locator('[data-menu-section="campaign"]').isVisible()) await page.locator('[data-menu-section="campaign"]').click();
  await page.locator('[data-menu-action="continue"]').click(); await page.locator('[data-campaign-session]').waitFor({ timeout: 90000 });
  await page.getByRole('button', { name: 'Console du vaisseau', exact: true }).click();
  const ship = page.locator('[data-ship-room]'); await ship.waitFor();
  await ship.getByRole('navigation', { name: 'Salles du vaisseau' }).getByRole('button', { name: 'Armurerie', exact: true }).click();
  await ship.getByRole('button', { name: /Personnaliser le chasseur/ }).click();
  const forge = page.locator('[data-hunter-chromatics-v113]'); await forge.waitFor();
  const actualOptions = {};
  for (const channel of Object.keys(keyFor)) {
    actualOptions[channel] = await forge.locator(selectorFor(channel)).locator('option').evaluateAll(items => items.map(item => item.value).filter(Boolean));
    assert.deepEqual(new Set(actualOptions[channel]), new Set(materials.filter(item => item.channel === channel).map(item => item.id)), 'all registered ' + channel + ' materials are really selectable');
  }
  await fs.writeFile(path.join(out, 'native-options.json'), JSON.stringify(actualOptions, null, 2));
  const readRaw = () => page.evaluate(key => localStorage.getItem(key), api.SAVE_STORAGE_KEY);
  const before = await readRaw(); report.beforeSaveSha256 = sha(before); const baseline = JSON.parse(before);
  await fs.writeFile(path.join(out, 'before-save.json'), before);
  await page.locator('.customization-preview [data-hunter-rig]').scrollIntoViewIfNeeded(); await page.bringToFront();
  await page.evaluate(() => window.__phgEnduranceObserver.reset());
  soakStart = performance.now(); report.soakStartedAt = new Date().toISOString(); report.nodeMonotonicStartMs = soakStart;
  report.predeclaredMemoryCriteria = { baseline: 'first complete 77-material cycle, so one-time asset warming is not called a leak',
    gpuProcessRssGrowthToleranceBytes: 64 * 1024 * 1024, gpuAllocatorGrowthToleranceBytes: 16 * 1024 * 1024,
    noForcedGc: true, noTimeAcceleration: true, physicalGpuCertification: false };
  await sample('start', true); await screenshot('00-viewport-start', true); await screenshot('00-rig-start');
  await saveProgress('running'); console.log('SOAK_STARTED', report.soakStartedAt, 'targetSeconds', durationSeconds, 'allMaterials', materials.length);
  let iteration = 0, lastSample = 0, lastDump = 0, lastScreenshot = 0;
  while (true) {
    const elapsedSeconds = (performance.now() - soakStart) / 1000;
    const visibleSeconds = await page.evaluate(() => window.__phgEnduranceObserver.snapshot().visibleMs / 1000);
    if (elapsedSeconds >= durationSeconds && visibleSeconds >= durationSeconds) break;
    assert.ok(elapsedSeconds < durationSeconds + 300, 'excessive hidden/inactive exposure cannot be counted as sixty minutes');
    const material = ordered[iteration % ordered.length], previous = await readRaw();
    report.pendingSelection = { materialId: material.id, channel: material.channel, previousSha256: sha(previous) };
    await forge.locator(selectorFor(material.channel)).selectOption(material.id);
    assert.equal(await readRaw(), previous, 'preview cannot durably write before confirmation');
    await forge.getByRole('button', { name: 'Valider les couleurs et matières', exact: true }).click();
    await page.waitForFunction(({ key, previous }) => localStorage.getItem(key) !== previous, { key: api.SAVE_STORAGE_KEY, previous });
    const after = await readRaw(), save = JSON.parse(after);
    assert.equal(api.parseSaveImport(after).failure, null); assert.equal(save.appearance.chromaticsV113[keyFor[material.channel]], material.id);
    assert.deepEqual(save.profile, baseline.profile); assert.deepEqual(save.statistics, baseline.statistics); assert.deepEqual(save.missionProgress, baseline.missionProgress);
    assert.deepEqual(save.trophies, baseline.trophies);
    // A durable write precedes React's remount acknowledgement. Wait for the
    // actual newly mounted workshop instead of racing its previous draft.
    await page.waitForFunction(() => Array.from(document.querySelectorAll('[data-hunter-chromatics-v113] button')).find(button => button.textContent === 'Valider les couleurs et matières')?.disabled === true);
    assert.equal(await forge.locator(selectorFor(material.channel)).inputValue(), material.id);
    report.pendingSelection = null;
    await page.locator('.customization-preview [data-hunter-rig]').scrollIntoViewIfNeeded();
    await page.bringToFront();
    seen.add(material.id); iteration++;
    const selection = { iteration, materialId: material.id, channel: material.channel, elapsedSeconds: (performance.now() - soakStart) / 1000,
      beforeSha256: sha(previous), afterSha256: sha(after) };
    report.selections.push(selection); await fs.appendFile(path.join(out, 'selections.ndjson'), JSON.stringify(selection) + '\n');
    if (iteration % 77 === 0) {
      await sample('cycle-' + iteration / 77, true); lastDump = (performance.now() - soakStart) / 1000;
      console.log('CYCLE', iteration / 77, 'elapsedSeconds', lastDump.toFixed(2), 'materials', seen.size);
    }
    const now = (performance.now() - soakStart) / 1000;
    if (now - lastSample >= (probe ? 5 : 60)) {
      const dump = now - lastDump >= 300;
      await sample('minute-' + Math.floor(now / 60), dump); lastSample = now; if (dump) lastDump = now;
      console.log('PROGRESS', now.toFixed(1), 'seconds', iteration, 'selections', seen.size, 'distinct');
    }
    if (now - lastScreenshot >= (probe ? 15 : 600)) { await screenshot('rig-minute-' + Math.floor(now / 60)); lastScreenshot = now; }
    assert.equal(report.errors.length, 0); assert.equal(report.consoleErrors.length, 0); assert.equal(report.httpErrors.length, 0); assert.equal(report.requestFailures.length, 0);
    const nextAt = soakStart + iteration * intervalMs, delay = Math.min(15000, Math.max(0, nextAt - performance.now()));
    if (delay) await page.waitForTimeout(delay);
  }
  report.nodeMonotonicEndMs = performance.now(); report.elapsedSeconds = (report.nodeMonotonicEndMs - soakStart) / 1000;
  await sample('end', true); await screenshot('99-rig-end'); await screenshot('99-viewport-end', true);
  const after = await readRaw(); report.afterSaveSha256 = sha(after); await fs.writeFile(path.join(out, 'after-save.json'), after);
  report.distinctMaterialIds = [...seen].sort(); report.completedFullCycles = Math.floor(report.selections.length / 77);
  if (!probe) { assert.ok(report.elapsedSeconds >= 3600); assert.equal(seen.size, 77); }
  await Promise.all(responses); report.sourceAfter = await identity(); assert.equal(report.sourceAfter.sha256, report.sourceBefore.sha256);
  assert.equal((await fs.readFile(path.join(runtimeRoot, '.next/BUILD_ID'), 'utf8')).trim(), report.buildId);
  report.nativeRunPassed = true;
} catch (error) {
  report.nativeRunPassed = false; report.failure = error.stack; process.exitCode = 1; console.error(error);
  try {
    if (page && !page.isClosed()) {
      await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: false });
      const diagnostic = await page.evaluate(key => ({ rawSave: localStorage.getItem(key), workshop: document.querySelector('[data-hunter-chromatics-v113]')?.innerText,
        selects: Array.from(document.querySelectorAll('[data-hunter-chromatics-v113] select')).map(s => ({ id: s.id, value: s.value })) }), api.SAVE_STORAGE_KEY);
      await fs.writeFile(path.join(out, 'failure-state.json'), JSON.stringify(diagnostic, null, 2));
    }
  } catch { /* A closed/failed renderer remains an observed failure. */ }
}
finally {
  if (soakStart !== null && !report.elapsedSeconds) report.elapsedSeconds = (performance.now() - soakStart) / 1000;
  if (tracing) {
    try {
      const done = new Promise(resolve => browserCdp.once('Tracing.tracingComplete', resolve));
      await browserCdp.send('Tracing.end'); const { stream } = await done; const parts = [];
      while (true) { const item = await browserCdp.send('IO.read', { handle: stream, size: 1024 * 1024 }); parts.push(Buffer.from(item.data, item.base64Encoded ? 'base64' : 'utf8')); if (item.eof) break; }
      await browserCdp.send('IO.close', { handle: stream });
      const trace = Buffer.concat(parts); await fs.writeFile(path.join(out, 'memory-trace.json'), trace); report.memoryTrace = await fingerprint(path.join(out, 'memory-trace.json'));
    } catch (error) { report.traceReadFailure = error.message; }
  }
  report.finishedAt = new Date().toISOString();
  report.requestedNativeDurationCompleted = !probe && report.nativeRunPassed === true && report.elapsedSeconds >= 3600 && seen.size === 77;
  report.gpuLeakCriterionQualified = false; // The trace is analyzed separately; no inference from JS heap or elapsed time alone.
  await fs.writeFile(path.join(out, 'report.browser-run.json'), JSON.stringify(report, null, 2));
  await saveProgress(report.nativeRunPassed ? 'native-run-complete-memory-analysis-pending' : 'failed');
  await browser?.close();
}
