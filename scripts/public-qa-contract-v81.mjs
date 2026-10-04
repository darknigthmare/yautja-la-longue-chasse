import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const alias='https://yautja-la-longue-chasse.vercel.app';
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const time=value=>{const result=Date.parse(value);assert(Number.isFinite(result),'A real ISO UTC timestamp is required');return result;};

/** Pure provider contract for QA tests. It does not query production or change
 * a deployment. The live preflight below reads the preserved provider receipts. */
export function validateV81ProviderContract({base,expectedSourceSha,readyAt,deploymentId,startedAt,deployment,provider}){
 assert.equal(base.replace(/\/$/,''),alias,'Only the exact production alias is permitted');
 assert.match(expectedSourceSha,/^[a-f0-9]{40}$/);assert.match(deploymentId,/^dpl_[A-Za-z0-9]+$/);
 assert.equal(deployment.id,deploymentId);assert.equal(provider.id,deploymentId);
 assert.equal(deployment.state,'READY');assert.equal(provider.state,'READY');
 assert.equal(provider.readyState,'READY');assert.equal(deployment.target,'production');assert.equal(provider.target,'production');
 assert.equal(deployment.sha,expectedSourceSha);assert.equal(provider.meta?.githubCommitSha,expectedSourceSha);
 const host=new URL(alias).hostname;assert(deployment.aliases?.includes(host));assert(provider.alias?.includes(host));
 assert.equal(provider.aliasError,null);assert.equal(time(deployment.checkedAt),time(readyAt),'READY must be the preserved real provider observation');
 assert(time(startedAt)>=time(readyAt),'No public QA may start before observed READY');
 assert(Number.isFinite(provider.ready)&&provider.ready<=time(readyAt),'Provider READY precedes its real observation');
 return{candidateId:'v81-source-public',expectedSourceSha,deploymentId,base:alias,readyObservedAt:readyAt,startedAt,providerReadyTimestamp:provider.ready};
}

/** Strict local evidence preflight, completed before any browser connection or
 * HTTPS navigation. Raw disk SHA and Git LF SHA remain distinct evidence. */
export function assertV81PublicPreflight({base,sourceFiles,startedAt=new Date().toISOString()}){
 const expectedSourceSha=process.env.V81_EXPECTED_SOURCE_SHA,readyAt=process.env.V81_PUBLIC_READY_AT,deploymentId=process.env.V81_PUBLIC_DEPLOYMENT_ID;
 const root=process.cwd(),deploymentFile=path.join(root,'work-local/v81/deployment.json'),providerFile=path.join(root,'work-local/v81/deployment-provider-raw.json');
 const deploymentBytes=fs.readFileSync(deploymentFile),providerBytes=fs.readFileSync(providerFile);
 const result=validateV81ProviderContract({base,expectedSourceSha,readyAt,deploymentId,startedAt,deployment:JSON.parse(deploymentBytes),provider:JSON.parse(providerBytes)});
 const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();assert.equal(head,expectedSourceSha,'Local source must be the exact published commit');
 const sources=sourceFiles.map(file=>{
  assert(!path.isAbsolute(file)&&!file.split(/[\\/]/).includes('..'),'QA source remains in the workspace');
  const disk=fs.readFileSync(path.join(root,file)),git=execFileSync('git',['show',expectedSourceSha+':'+file],{cwd:root,maxBuffer:20*1024*1024});
  assert.equal(disk.toString('utf8').replace(/\r\n/g,'\n'),git.toString('utf8').replace(/\r\n/g,'\n'),'Runtime source differs from the exact commit: '+file);
  return{file,filesystemSha256:sha256(disk),gitSha256:sha256(git),normalization:'CRLF versus LF recorded separately; text equality required'};
 });
 return{...result,verifiedAt:new Date().toISOString(),providerReceipts:[{file:deploymentFile,sha256:sha256(deploymentBytes)},{file:providerFile,sha256:sha256(providerBytes)}],sources};
}

// Compatibility exports for the root-owned V81 browser recipes.
export const hashV81 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

// This runner only uses new incognito contexts on the local QA CDP endpoint.
// Version V81 proves content identity, not the deployed commit: the exact
// SHA/READY relation comes separately from the publisher's deployment gate.
export function qaContractV81(base, output, env = process.env, now = Date.now()) {
  const url = new URL(base), isPublic = url.protocol === 'https:';
  const startedAt = new Date(now).toISOString();
  const candidateId = env.V81_CANDIDATE_ID || (isPublic ? 'v81-source-public' : 'v81-local-browser');
  const expectedSourceSha = env.V81_EXPECTED_SOURCE_SHA || null;
  const readyAt = env.V81_PUBLIC_READY_AT || null;
  if (isPublic) {
    assert.equal(url.origin, 'https://yautja-la-longue-chasse.vercel.app', 'Only the named public game alias is in this recipe');
    assert.match(expectedSourceSha || '', /^[0-9a-f]{40}$/i, 'Public QA requires the publisher-confirmed exact commit SHA');
    assert.equal(candidateId, 'v81-source-public');
    assert.ok(Number.isFinite(Date.parse(readyAt)) && Date.parse(readyAt) <= now, 'Public QA requires an observed READY date before this run');
    assert.notEqual(env.V81_COMPONENT_ONLY, '1', 'A component preview is never a public GameClient proof');
    assert.ok(env.V81_QA_OUTPUT, 'Public output must be explicitly new');
  } else {
    assert.ok(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname), 'Non-public recipes stay on a loopback server');
  }
  if (fs.existsSync(output)) assert.equal(fs.readdirSync(output).length, 0, 'Never overwrite historical QA output');
  const providerPreflight = isPublic ? assertV81PublicPreflight({base,sourceFiles:[],startedAt}) : null;
  return { providerPreflight, candidateId, expectedVersion: 'V81', expectedSourceSha, startedAt, isPublic,
    publication: isPublic ? { readyAt, deploymentId: env.V81_PUBLIC_DEPLOYMENT_ID || null,
      shaAuthority: 'Exact commit and READY observation supplied by the publishing agent; content version alone is not commit verification.' } : null,
    isolation: { cdpEndpoint: 'http://127.0.0.1:58677', freshIncognitoContextsOnly: true, existingBrowserContextsTouched: false, realUserSavesTouched: false } };
}

export function snapshotSourcesV81(files, contract) {
  return files.map(file => {
    const working = fs.readFileSync(file), sha256 = hashV81(working);
    let commitBinding;
    if (contract.isPublic) {
      const committed = execFileSync('git', ['show', contract.expectedSourceSha + ':' + file.replaceAll('\\', '/')], { encoding: null, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
      // Git normalizes these tracked text files to LF while Windows currently
      // contains both LF and CRLF. Preserve raw SHA and compare only CRLF→LF;
      // never describe a normalized text comparison as identical raw bytes.
      const normalize = bytes => Buffer.from(bytes.toString('utf8').replaceAll('\r\n', '\n'));
      assert.equal(hashV81(normalize(working)), hashV81(normalize(committed)), 'Local fixture/consumer text must match the expected published commit: ' + file);
      commitBinding = { gitBlobSha256: hashV81(committed), normalizedTextSha256: hashV81(normalize(committed)), comparison: 'CRLF-to-LF only; working-tree raw SHA256 retained' };
    }
    return { file, sha256, ...(commitBinding ? { commitBinding } : {}) };
  });
}

export async function requireVersionV81(page, report, checkpoint) {
  const version = await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version');
  assert.equal(version, 'V81', 'A stale published version cannot pass V81 QA');
  (report.versionChecks ||= []).push({ checkpoint, version, observedAt: new Date().toISOString(), url: page.url() });
  return version;
}

export function hardErrorsV81(errors) {
  return errors.filter(error => { if(error.kind !== 'requestfailed' || error.error !== 'net::ERR_ABORTED') return true; try { const u=new URL(error.url); return u.pathname !== '/' || !(u.hostname==='yautja-la-longue-chasse.vercel.app' || u.hostname==='localhost' || u.hostname==='127.0.0.1'); } catch { return true; } });
}

/** Read bytes from requests the real game already made through Chrome. This
 * does not issue a Node HTTP request, browser fetch, or extra asset request. */
export function observeLoadedBrowserAssetsV81(page, base, paths) {
  const origin = new URL(base).origin, expected = new Set(paths), responses = new Map();
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin !== origin || !expected.has(url.pathname)) return;
    const observedAt = new Date().toISOString();
    const entry = response.body().then(bytes => ({ src: url.pathname, url: response.url(), http: response.status(), sha256: hashV81(bytes), bytes: bytes.length,
      observedAt, bodyReadCompletedAt: new Date().toISOString(), byteTransport: 'body of actual already-loaded Chrome response via local CDP; no extra network request' }));
    // Retain an error without generating an unhandled rejection. The explicit
    // read below either finds a real delivered response or fails the recipe.
    const pending = entry.then(value => ({ value }), error => ({ error: String(error) }));
    const list = responses.get(url.pathname) || []; list.push(pending); responses.set(url.pathname, list);
  });
  return async src => {
    const pending = responses.get(src);
    assert.ok(pending?.length, 'The actual browser never received the expected asset: ' + src);
    const results = await Promise.all(pending), delivered = results.filter(result => result.value).map(result => result.value);
    assert.ok(delivered.length, 'No actual Chrome asset body could be read: ' + src + ' / ' + JSON.stringify(results));
    return delivered.at(-1);
  };
}

export function outputWithinQaV81(output) {
  const root = path.resolve('work-local/v81/qa');
  const relative = path.relative(root, path.resolve(output));
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'QA artifacts stay in a dedicated workspace subdirectory');
}

export function validatePublicBatchV81(report, { expectedSourceSha, readyAt, expectedCount }) {
  assert.equal(report.candidateId, 'v81-source-public');
  assert.equal(report.expectedSourceSha, expectedSourceSha);
  assert.equal(report.base, 'https://yautja-la-longue-chasse.vercel.app');
  assert.equal(report.isPublic, true);
  assert.match(report.status, /^PASS_/);
  assert.equal(report.expectedVersion, 'V81');
  assert.ok(report.versionChecks?.length > 0 && report.versionChecks.every(check => check.version === 'V81'));
  assert.deepEqual(report.hardErrors, [], 'A public raw report must explicitly pass its hard-error gate');
  assert.deepEqual(hardErrorsV81([...(report.errors || []), ...(report.contexts || []).flatMap(context => context.errors || [])]), [], 'The actual raw error ledger also passes');
  assert.equal(report.isolation?.freshIncognitoContextsOnly, true);
  assert.equal(report.isolation?.existingBrowserContextsTouched, false);
  assert.equal(report.isolation?.realUserSavesTouched, false);
  assert.ok(Date.parse(report.startedAt) >= Date.parse(readyAt), 'Public run must begin after the observed READY date');
  assert.ok(Date.parse(report.completedAt) >= Date.parse(report.startedAt));
  const before = report.sourceBefore || report.sourceHashes;
  assert.ok(before?.length && before.every(source => source.commitBinding?.normalizedTextSha256));
  assert.deepEqual(report.sourceAfter, before, 'Published commit-bound fixture/source snapshots remain unchanged');
  assert.equal(report.captures.length, expectedCount);
  for (const capture of report.captures) {
    assert.ok(Date.parse(capture.capturedAt) >= Date.parse(report.startedAt));
    assert.ok(Date.parse(capture.capturedAt) <= Date.parse(report.completedAt));
    const version = capture.detail?.contentVersion || capture.data?.contentVersion || capture.paint?.contentVersion;
    assert.equal(version, 'V81', 'Every actual V81 title/session capture retains its observed DOM content version');
  }
}

