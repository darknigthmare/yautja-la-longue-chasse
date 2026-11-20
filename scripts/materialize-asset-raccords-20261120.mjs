#!/usr/bin/env node
/** Read-only Git materialization and official runtime candidate for the dated asset checks. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync, spawn, spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as pause} from 'node:timers/promises';
import {tmpdir} from 'node:os';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'outputs/qa-asset-raccords-20261120');
const current = 'docs/qa/current-integration-20261103/runtime-inputs.json';
const git = args => execFileSync('git', args, {cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024}).trim();
const sha = raw => createHash('sha256').update(raw).digest('hex');
const blob = raw => createHash('sha1').update('blob ' + raw.length + '\0').update(raw).digest('hex');
const local = file => typeof file === 'string' && /^[A-Za-z0-9._/-]+$/.test(file) &&
  !path.isAbsolute(file) && file.split('/').every(part => part && part !== '.' && part !== '..');
const sourceCommit = git(['rev-parse', 'HEAD']);
assert.match(sourceCommit, /^[a-f0-9]{40}$/);
if (process.env.ASSET_RACCORDS_SOURCE_COMMIT) assert.equal(sourceCommit, process.env.ASSET_RACCORDS_SOURCE_COMMIT);

function trackedTree() {
  return new Map(git(['ls-tree', '-r', '-z', '--full-tree', sourceCommit]).split('\0').filter(Boolean).map(line => {
    const at = line.indexOf('\t');
    const [mode, type, id] = line.slice(0, at).split(' ');
    return [line.slice(at + 1), {mode, type, id}];
  }));
}
async function writeReport(name, value) {
  await fs.mkdir(output, {recursive: true});
  await fs.writeFile(path.join(output, name), JSON.stringify(value, null, 2) + '\n');
}
async function materialize(files, immutable = new Map(), scope) {
  const ordered = [...new Set(files)].sort();
  assert.ok(ordered.length > 0 && ordered.every(local), 'Only explicit local Git paths may be materialized.');
  assert.equal(git(['config', '--bool', '--default', 'false', '--get', 'core.sparseCheckoutCone']), 'false');
  const tree = trackedTree();
  for (const file of ordered) {
    const entry = tree.get(file);
    assert.ok(entry && entry.type === 'blob' && ['100644', '100755'].includes(entry.mode), 'Missing regular HEAD blob: ' + file);
  }
  execFileSync('git', ['sparse-checkout', 'add', '--stdin'], {
    cwd: root, input: ordered.map(file => '/' + file).join('\n') + '\n',
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  const rows = [];
  for (const file of ordered) {
    const absolute = path.join(root, file), info = await fs.lstat(absolute);
    assert.ok(info.isFile() && !info.isSymbolicLink(), file);
    assert.equal(await fs.realpath(absolute), absolute, 'Materialized input traverses a symlink: ' + file);
    const raw = await fs.readFile(absolute), fingerprint = {path: file, bytes: raw.length, sha256: sha(raw), gitBlob: blob(raw)};
    assert.equal(fingerprint.gitBlob, tree.get(file).id, 'Working bytes differ from exact checkout: ' + file);
    const pin = immutable.get(file);
    if (pin) {
      assert.equal(fingerprint.bytes, pin.bytes, 'Published public input size changed: ' + file);
      assert.equal(fingerprint.sha256, pin.sha256, 'Published public input changed: ' + file);
    }
    rows.push(fingerprint);
  }
  const report = {schemaVersion: 1, sourceCommit, scope, files: rows.length,
    bytes: rows.reduce((sum, row) => sum + row.bytes, 0), substituteAssets: false,
    immutablePublicPinsVerified: immutable.size, humanArtReview: false, entries: rows};
  await writeReport('materialization-' + mode + '.json', report);
  console.log(JSON.stringify({sourceCommit, mode, files: report.files, bytes: report.bytes,
    immutablePublicPinsVerified: immutable.size, substituteAssets: false}));
}
const [mode, ...extra] = process.argv.slice(2);
assert.ok(['runtime', 'catalogue', 'hunt-runtime', 'forge-browser', 'production-assets', 'red-baseline', 'candidate'].includes(mode) && extra.length === 0);
if (mode === 'runtime') {
  const inventory = JSON.parse(await fs.readFile(path.join(root, current), 'utf8'));
  assert.ok(Array.isArray(inventory.entries) && inventory.entries.length === inventory.files);
  assert.equal(new Set(inventory.entries.map(row => row.path)).size, inventory.files);
  const immutable = new Map(inventory.entries.filter(row => row.path.startsWith('public/')).map(row => [row.path, row]));
  await materialize(inventory.entries.map(row => row.path), immutable,
    'Exact paths from the existing official current inventory; public pins preserved; modified source compared to this HEAD, not reattributed to an old hash.');
} else if (mode === 'forge-browser') {
  assert.ok(process.env.PHG_FAILED_REPORT_FILE, 'A failed PHG browser report is required.');
  const previous = JSON.parse(await fs.readFile(process.env.PHG_FAILED_REPORT_FILE, 'utf8'));
  assert.ok(previous.passed === false && Array.isArray(previous.httpErrors));
  const reportOrigin = new URL(previous.url).origin;
  const tree = trackedTree();
  const requests = new Map();
  for (const item of previous.httpErrors) {
    const url = new URL(item.url), pathname = decodeURIComponent(url.pathname), file = 'public' + pathname;
    const key = item.status + ' ' + url.origin + pathname;
    const found = requests.get(key);
    if (found) { found.responses++; continue; }
    const tracked = local(file) ? tree.get(file) : undefined;
    const eligible = item.status === 404 && url.origin === reportOrigin &&
      tracked?.type === 'blob' && ['100644', '100755'].includes(tracked.mode);
    const inCheckout = eligible ? await fs.stat(path.join(root, file)).then(() => true, error => {
      if (error.code === 'ENOENT') return false;
      throw error;
    }) : null;
    requests.set(key, {status: item.status, pathname, tracked: eligible, inCheckout, responses: 1,
      file: eligible ? file : null});
  }
  const entries = [...requests.values()].sort((a,b) => a.pathname.localeCompare(b.pathname) || a.status-b.status);
  await writeReport('forge-browser-prior-http.json', {sourceCommit, previousBuildId: previous.buildId,
    HTTPResponsesInPriorRun: previous.httpErrors.length, entries});
  for (const {status, pathname, tracked, inCheckout, responses} of entries) {
    console.log(JSON.stringify({status, pathname, tracked, inCheckout, responses}));
  }
  const files = entries.filter(row => row.tracked && !row.inCheckout).map(row => row.file);
  if (files.length) await materialize(files, new Map(),
    'Exact tracked public paths missing in the prior strict forge browser recipe; no substitutes or ignored network errors.');
} else if (mode === 'catalogue') {
  const {build} = await import('esbuild');
  const result = await build({
    stdin: {contents: "export {ENVIRONMENT_PROP_SPECS} from './app/game/environmentPropCatalogue'; export {ENVIRONMENT_PROP_AVAILABLE_RUNTIME_IDS} from './app/game/environmentPropAvailabilityData'; export {HOMEWORLD_PASSAGE_BRIDGE_V67, HOMEWORLD_PASSAGES_V67} from './app/game/systems/homeworldPassageV67'; export {HOMEWORLD_REGIONS_V68, REGION_FAUNA_ART_V68} from './app/game/systems/homeworldRegionsV68'; export {gauntletRigSpriteV139} from './app/game/systems/gauntletRigSpritesV139';",
      resolveDir: root, loader: 'ts'},
    bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
  });
  const api = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
  assert.equal(api.ENVIRONMENT_PROP_SPECS.length, 800, 'Dated V19 source contract has 800 candidates.');
  assert.equal(new Set(api.ENVIRONMENT_PROP_SPECS.map(spec => spec.id)).size, 800);
  assert.equal(new Set(api.ENVIRONMENT_PROP_SPECS.flatMap(spec => [spec.masterPath, spec.runtimePath])).size, 1600);
  const available = new Set(api.ENVIRONMENT_PROP_AVAILABLE_RUNTIME_IDS);
  assert.equal(available.size, api.ENVIRONMENT_PROP_AVAILABLE_RUNTIME_IDS.length);
  assert.equal(available.size, 464, 'Dated source/runtime admission projection has 464 complete pairs.');
  const catalogueTree = trackedTree(), presence = [];
  const completeIds = new Set();
  for (const spec of api.ENVIRONMENT_PROP_SPECS) {
    assert.ok(local(spec.masterPath) && spec.masterPath.startsWith('art-source/v19/biome-decor/'));
    assert.ok(local(spec.runtimePath) && spec.runtimePath.startsWith('public/game/assets/v19/biome-decor/'));
    const master = catalogueTree.get(spec.masterPath), runtime = catalogueTree.get(spec.runtimePath);
    for (const [file, entry] of [[spec.masterPath, master], [spec.runtimePath, runtime]]) {
      if (entry) assert.ok(entry.type === 'blob' && ['100644', '100755'].includes(entry.mode), 'A source/runtime asset path must be a regular tracked blob: ' + file);
    }
    const complete = Boolean(master && runtime);
    if (complete) completeIds.add(spec.id);
    assert.equal(available.has(spec.id), complete, 'Production availability must equal complete regular pairs in the Git tree: ' + spec.id);
    presence.push({id: spec.id, available: available.has(spec.id), complete,
      master: {path: spec.masterPath, mode: master?.mode ?? null, gitBlob: master?.id ?? null},
      runtime: {path: spec.runtimePath, mode: runtime?.mode ?? null, gitBlob: runtime?.id ?? null}});
  }
  assert.equal(completeIds.size, available.size);
  await writeReport('catalogue-presence.json', {schemaVersion: 1, sourceCommit,
    scope: 'All 1600 candidate source/runtime paths inspected independently in the Git tree before the 928 positive paths are materialized; absent and incomplete pairs are not inferred from sparse working-tree absence.',
    specs: presence.length, paths: presence.length * 2, declaredAvailable: available.size, completePairs: completeIds.size,
    incompleteOrAbsentPairs: presence.length - completeIds.size, entries: presence});
  const admitted = api.ENVIRONMENT_PROP_SPECS.filter(spec => available.has(spec.id));
  assert.equal(admitted.length, available.size, 'Every available ID must resolve to the real catalogue.');
  const files = admitted.flatMap(spec => {
    assert.ok(spec.masterPath.startsWith('art-source/v19/biome-decor/'));
    assert.ok(spec.runtimePath.startsWith('public/game/assets/v19/biome-decor/'));
    return [spec.masterPath, spec.runtimePath];
  });
  const nativeUrls = [api.HOMEWORLD_PASSAGE_BRIDGE_V67.src, ...Object.values(api.HOMEWORLD_PASSAGES_V67).map(item => item.panorama),
    ...Object.values(api.HOMEWORLD_REGIONS_V68).map(item => item.panorama), ...Object.values(api.REGION_FAUNA_ART_V68).map(item => item.src)];
  for (const id of ['city-hunter', 'jungle-hunter']) for (const part of ['base', 'lid']) nativeUrls.push(api.gauntletRigSpriteV139(id, part));
  for (const url of nativeUrls) { assert.ok(typeof url === 'string' && url.startsWith('/game/')); files.push('public' + url); }
  await materialize(files, new Map(),
    'Source/runtime pairs of IDs already present in the production availability projection, plus exact native imagery required by the unchanged passage/region suites and the two gauntlet identities used by the equipment checks; not all 800 catalogue candidates and no new admission.');
} else if (mode === 'hunt-runtime') {
  const {build} = await import('esbuild');
  const result = await build({
    stdin: {contents: "export {environmentPropRuntimeUrlsForSector} from './app/game/environmentPropRegistry'; export {worldScreensFor} from './app/game/worldScreens';",
      resolveDir: root, loader: 'ts'},
    bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
  });
  const api = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
  // Both cases in the unchanged durable recipe start this mission at encounter zero.
  // Retain its dated exact index and add only current sector bindings absent there.
  const old = JSON.parse(await fs.readFile(path.join(root, 'tests/fixtures/skinning-canopy-browser-assets-20261109.json'), 'utf8'));
  const included = new Set(old.assets.map(item => item.path));
  const selected = [...new Set(api.worldScreensFor('jungle-vey').screens.flatMap(screen =>
    api.environmentPropRuntimeUrlsForSector('jungle-vey', screen.id, 0).map(url => {
      assert.ok(url.startsWith('/game/assets/v19/biome-decor/'));
      return 'public' + url;
    })))];
  const files = selected.filter(file => !included.has(file));
  if (files.length) await materialize(files, new Map(),
    'Only current V19 sector URLs for jungle-vey encounter zero, derived from real exports and missing from the retained dated durable asset index; runtime images only, no masters.');
  else {
    const report = {schemaVersion: 1, sourceCommit, mode, files: 0, bytes: 0, substituteAssets: false,
      scope: 'All currently selected V19 sector URLs are already covered by the retained dated durable asset index.'};
    await writeReport('materialization-' + mode + '.json', report); console.log(JSON.stringify(report));
  }
} else if (mode === 'production-assets') {
  const {build} = await import('esbuild');
  const result = await build({
    stdin: {contents: "export {gauntletRigSpriteV139} from './app/game/systems/gauntletRigSpritesV139';", resolveDir: root, loader: 'ts'},
    bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
  });
  const api = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
  const urls = ['city-hunter', 'jungle-hunter'].flatMap(id => ['base', 'lid'].map(part => api.gauntletRigSpriteV139(id, part)));
  const buildId = (await fs.readFile(path.join(root, '.next/BUILD_ID'), 'utf8')).trim();
  assert.ok(buildId);
  await fs.mkdir(output, {recursive: true});
  const log = await fs.open(path.join(output, 'next-asset-probe-server.log'), 'w');
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '4399'],
    {cwd: root, env: {...process.env, NEXT_TELEMETRY_DISABLED: '1'}, stdio: ['ignore', log.fd, log.fd]});
  await log.close();
  let exit = null;
  server.once('error', error => { exit = {error: error.message}; });
  server.once('exit', (code, signal) => { exit = {code, signal}; });
  const report = {schemaVersion: 1, sourceCommit, buildId, mode, scope: 'Compiled Next HTTP delivery of the four existing City/Jungle gauntlet SVGs; not a gameplay or artistic qualification.',
    readiness: [], assets: [], passed: false};
  try {
    const deadline = Date.now() + 90_000;
    let ready = false;
    while (Date.now() < deadline && !ready) {
      assert.equal(exit, null, 'The launched Next server exited before readiness: ' + JSON.stringify(exit));
      try {
        const response = await fetch('http://127.0.0.1:4399/', {signal: AbortSignal.timeout(2_000)});
        const raw = Buffer.from(await response.arrayBuffer());
        report.readiness.push({status: response.status, bytes: raw.length, sha256: sha(raw)});
        ready = response.status === 200;
      } catch (error) { report.readiness.push({error: error.message}); }
      if (!ready) await pause(200);
    }
    assert.ok(ready, 'The compiled Next server must become ready.');
    for (const url of urls) {
      assert.ok(url.startsWith('/game/assets/v139/rig-gauntlets/'));
      const file = 'public' + url, expected = await fs.readFile(path.join(root, file));
      const response = await fetch('http://127.0.0.1:4399' + url, {signal: AbortSignal.timeout(30_000)});
      const actual = Buffer.from(await response.arrayBuffer());
      const row = {url, status: response.status, contentType: response.headers.get('content-type'),
        bytes: actual.length, sha256: sha(actual), expectedBytes: expected.length, expectedSha256: sha(expected),
        gitBlob: git(['rev-parse', sourceCommit + ':' + file])};
      report.assets.push(row);
      assert.equal(blob(expected), row.gitBlob, 'Probe source must be the exact HEAD asset.');
      assert.equal(response.status, 200, url);
      assert.match(row.contentType || '', /image\/svg\+xml/i, url);
      assert.deepEqual(actual, expected, 'Next must serve the actual gauntlet source without substitution: ' + url);
    }
    assert.equal(exit, null, 'The launched Next server must remain alive through the probes.');
    report.passed = true;
    console.log(JSON.stringify({sourceCommit, mode, buildId, checks: report.assets.length, passed: true}));
  } catch (error) {
    report.failure = {name: error.name, message: error.message}; throw error;
  } finally {
    if (exit === null) server.kill('SIGTERM');
    await Promise.race([new Promise(resolve => server.once('close', resolve)), pause(2_000)]);
    if (exit === null) server.kill('SIGKILL');
    await writeReport('next-asset-probe.json', report);
  }
} else if (mode === 'red-baseline') {
  const baseline = '351208cc9d3a7157e563a0426f9208aecab6c20e';
  const parent = await fs.mkdtemp(path.join(tmpdir(), 'yautja-assets-red-'));
  const directory = path.join(parent, 'checkout');
  const at = args => execFileSync('git', ['-C', directory, ...args], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024}).trim();
  const overlays = ['tests/homeworld-player-equipment-raccords-20261120.test.mjs',
    'tests/environment-prop-raccords-20261120.test.mjs', 'tests/fixtures/environment-prop-raccord-contract-20261120.mjs'];
  const report = {schemaVersion: 1, sourceCommit, baselineCommit: baseline,
    scope: 'Actual new Node regressions over an exact detached baseline; only three new test/contract files copied and existing node_modules linked. No production-code overlay or browser qualification.',
    startedAt: new Date().toISOString(), overlays: [], results: [], browserExecuted: false, passed: false};
  let created = false;
  try {
    execFileSync('git', ['-c', 'protocol.file.allow=never', 'fetch', '--filter=blob:none', '--no-tags', '--depth=1', 'origin', baseline],
      {cwd: root, stdio: 'inherit'});
    execFileSync('git', ['worktree', 'add', '--detach', '--no-checkout', directory, baseline], {cwd: root, stdio: 'inherit'});
    created = true;
    at(['sparse-checkout', 'init', '--no-cone']);
    execFileSync('git', ['-C', directory, 'sparse-checkout', 'set', '--no-cone', '--stdin'], {
      input: '/*\n!/*/\n/app/\n/tests/\n/scripts/\n/build/\n/.openai/hosting.json\n/public/**/manifest.json\n',
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    at(['checkout', '--detach', baseline]);
    assert.equal(at(['rev-parse', 'HEAD']), baseline);
    assert.equal(at(['status', '--porcelain', '--untracked-files=no']), '', 'Baseline tracked sources must begin exact.');
    report.baselineAppTree = at(['rev-parse', 'HEAD:app']);
    report.trackedStatusBefore = '';
    await fs.symlink(path.join(root, 'node_modules'), path.join(directory, 'node_modules'), 'dir');
    for (const file of overlays) {
      assert.equal(git(['ls-tree', baseline, '--', file]), '', 'Red overlay may only add a new test file: ' + file);
      const raw = await fs.readFile(path.join(root, file));
      assert.equal(blob(raw), git(['rev-parse', sourceCommit + ':' + file]));
      await fs.mkdir(path.dirname(path.join(directory, file)), {recursive: true});
      await fs.writeFile(path.join(directory, file), raw);
      report.overlays.push({path: file, bytes: raw.length, sha256: sha(raw), gitBlob: blob(raw)});
    }
    const cases = [
      {file: overlays[0], titles: [
        'hub: the actual custom player keeps its owner-resolved City Hunter kit',
        'region: the actual custom player keeps its owner-resolved City Hunter kit'],
        markers: ['The player must wear /game/assets/v139/rig-gauntlets/city-hunter/base.svg']},
      {file: overlays[1], titles: [
        'room-plan climbs prefer their first independently declared available family',
        'the six reported raccord regressions use the intended family or explicit native fallback'],
        markers: ['j-canopy-vine/run0', 'feature-j-canopy-vine']},
    ];
    for (const [index, item] of cases.entries()) {
      const command = ['--experimental-strip-types', '--test', '--test-reporter=tap', '--test-concurrency=1', item.file];
      const run = spawnSync(process.execPath, command, {cwd: directory, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024});
      const text = (run.stdout || '') + (run.stderr || '');
      const logName = 'baseline-' + (index + 1) + '.log';
      await fs.mkdir(output, {recursive: true}); await fs.writeFile(path.join(output, logName), text);
      const failed = text.split('\n').filter(line => /^not ok [0-9]+ - /.test(line)).map(line => line.replace(/^not ok [0-9]+ - /, '').trim());
      const row = {file: item.file, command: [process.execPath, ...command], exitCode: run.status,
        signal: run.signal, log: logName, bytes: Buffer.byteLength(text), sha256: sha(Buffer.from(text)),
        failedTests: failed, requiredTitles: item.titles, requiredMessages: item.markers, expectedFailure: false};
      report.results.push(row);
      assert.ifError(run.error);
      assert.equal(run.signal, null);
      assert.equal(run.status, 1, 'A baseline regression must exit through the test assertions.');
      assert.doesNotMatch(text, /ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND|ERR_DLOPEN_FAILED|SyntaxError|Transform failed|error during build|Build failed/i,
        'A setup/compile/import failure is not a red regression proof.');
      assert.match(text, /ERR_ASSERTION/);
      for (const title of item.titles) assert.ok(failed.includes(title), 'Required baseline regression did not fail: ' + title);
      for (const message of item.markers) assert.ok(text.includes(message), 'Expected regression assertion is missing: ' + message);
      row.expectedFailure = true;
    }
    report.trackedStatusAfter = at(['status', '--porcelain', '--untracked-files=no']);
    assert.equal(report.trackedStatusAfter, '', 'The baseline production code must stay exact after tests.');
    assert.equal(at(['rev-parse', 'HEAD']), baseline);
    assert.equal(at(['rev-parse', 'HEAD:app']), report.baselineAppTree);
    assert.equal(git(['rev-parse', 'HEAD']), sourceCommit);
    report.passed = true; report.classification = 'EXPECTED_BASELINE_REGRESSIONS';
    console.log(JSON.stringify({sourceCommit, baselineCommit: baseline, classification: report.classification,
      files: report.results.length, assertionsVerified: true, productionCodeUnchanged: true}));
  } catch (error) {
    report.failure = {name: error.name, message: error.message}; throw error;
  } finally {
    if (created) {
      const cleanup = spawnSync('git', ['worktree', 'remove', '--force', directory], {cwd: root, encoding: 'utf8'});
      report.cleanupExitCode = cleanup.status;
      if (cleanup.status !== 0) report.passed = false;
    }
    await fs.rm(parent, {recursive: true, force: true});
    report.finishedAt = new Date().toISOString();
    await writeReport('baseline-regressions.json', report);
    assert.ok(report.cleanupExitCode == null || report.cleanupExitCode === 0, 'The private baseline worktree must be removed.');
  }
} else {
  const file = path.join(output, 'runtime-inputs.candidate.json');
  await fs.mkdir(output, {recursive: true});
  const before = await fs.readFile(path.join(root, current));
  const command = [path.join(root, 'scripts/snapshot-runtime-v113.mjs'), '--write', file];
  const startedAt = new Date().toISOString();
  const result = spawnSync(process.execPath, command, {cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024});
  await fs.writeFile(path.join(output, 'runtime-generator.log'), (result.stdout || '') + (result.stderr || ''));
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, 'Official snapshot generator failed. See runtime-generator.log.');
  assert.deepEqual(await fs.readFile(path.join(root, current)), before, 'Candidate generation must not rewrite the committed current inventory.');
  const raw = await fs.readFile(file);
  assert.ok(raw.length > 0 && raw.length <= 1024 * 1024, 'Candidate log is bounded to one MiB of source inventory.');
  const metadata = {schemaVersion: 1, sourceCommit, startedAt, finishedAt: new Date().toISOString(),
    command: [process.execPath, 'scripts/snapshot-runtime-v113.mjs', '--write', 'outputs/qa-asset-raccords-20261120/runtime-inputs.candidate.json'],
    officialGenerator: 'scripts/snapshot-runtime-v113.mjs', exitCode: result.status,
    path: 'outputs/qa-asset-raccords-20261120/runtime-inputs.candidate.json',
    bytes: raw.length, sha256: sha(raw), gitBlob: blob(raw), committedInventoryUnchanged: true};
  await writeReport('runtime-generator-receipt.json', metadata);
  const encoded = raw.toString('base64'), chunks = encoded.match(/.{1,16384}/g);
  console.log('ASSET_RUNTIME_CANDIDATE_BEGIN ' + JSON.stringify({...metadata, chunks: chunks.length}));
  chunks.forEach((chunk, index) => console.log('ASSET_RUNTIME_CANDIDATE_CHUNK ' + (index + 1) + '/' + chunks.length + ' ' + chunk));
  console.log('ASSET_RUNTIME_CANDIDATE_END ' + metadata.sha256);
}
