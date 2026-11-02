/** Read-only verification of the retained R7 Pit publication. No replay,
 * gameplay, republishing, source update or new full artistic review occurs. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {
  validateExecutedResultV112, verifyExecutedSourcesV112, verifyRuntimeCommitV112,
} from '../../../scripts/publish-validation-v112.mjs';
import {snapshotRuntimeV112} from '../../../scripts/snapshot-runtime-v112.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const directory = path.dirname(fileURLToPath(import.meta.url));
const expected = {
  runtimeCommit: 'bda14a95aa8c9e6cf37039e2d67ea1544a8e8de1',
  buildId: 'wVuSG_xIKNn3geLlIq7Cb',
  report: {path: 'docs/v112-pit-validation.json', bytes: 1230898,
    sha256: '42bfd97315d3ebbc9f1a2416fd996fa204f62b4680871e2482c1893f4509ef60'},
  freeze: {path: 'docs/v112-runtime-freeze.json', bytes: 306338,
    sha256: 'c35f8b454ec26d1b05852cabbe4f6ee111d71e7413aef80282582d3ca5ee6a3e'},
  rawDecoded: {bytes: 12852220, sha256: '0110e74283791eaac33e7db239edacf5515591114192b158762fd71d987902d3'},
};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function pin(file) {
  const bytes = await fs.readFile(path.join(root, file));
  return {path: file, bytes: bytes.length, sha256: sha(bytes)};
}
const audit = {
  schemaVersion: 1, status: 'RUNNING', verifiedAtUtc: new Date().toISOString(),
  scope: 'Read-only integrity and current-source verification of the already executed and published R7 Pit evidence. Original publication bytes remain unchanged.',
  runtimeCommit: expected.runtimeCommit, buildId: expected.buildId,
  newGameplayExecuted: false, newBuildExecuted: false, publicationRewritten: false,
  newFullVisualReviewClaimed: false, checks: [], failures: [],
};
async function check(name, run) {
  const detail = await run();
  audit.checks.push({name, status: 'PASS', ...(detail === undefined ? {} : {detail})});
}

try {
  const entryFile = 'docs/qa/v112-pit/entry.json';
  const entryBytes = await fs.readFile(path.join(root, entryFile));
  const entry = JSON.parse(entryBytes);
  const reportBytes = await fs.readFile(path.join(root, expected.report.path));
  const report = JSON.parse(reportBytes);
  const freezeBytes = await fs.readFile(path.join(root, expected.freeze.path));
  const freeze = JSON.parse(freezeBytes);
  await check('Original report and freeze retain the exact pre-disconnection bytes', async () => {
    assert.deepEqual(await pin(expected.report.path), expected.report);
    assert.deepEqual(await pin(expected.freeze.path), expected.freeze);
    assert.deepEqual(entry.report, expected.report);
    assert.deepEqual(entry.sourceFreeze, expected.freeze);
    assert.deepEqual(report.sourceFreeze, expected.freeze);
    return {report: expected.report, sourceFreeze: expected.freeze};
  });
  const rawBytesCompressed = await fs.readFile(path.join(root, report.rawEvidence.path));
  const rawBytes = gunzipSync(rawBytesCompressed);
  const raw = JSON.parse(rawBytes);
  await check('Compressed raw evidence and its complete decoded transcript match the original fingerprints', async () => {
    const rawPin = await pin(report.rawEvidence.path);
    assert.deepEqual(rawPin, {
      path: report.rawEvidence.path, bytes: report.rawEvidence.bytes, sha256: report.rawEvidence.sha256,
    });
    assert.equal(rawBytes.length, expected.rawDecoded.bytes);
    assert.equal(sha(rawBytes), expected.rawDecoded.sha256);
    assert.equal(report.rawEvidence.decodedBytes, expected.rawDecoded.bytes);
    assert.equal(report.rawEvidence.decodedSha256, expected.rawDecoded.sha256);
    return {compressed: rawPin, decoded: expected.rawDecoded};
  });
  const opened = report.capturesOpened.map(file => {
    assert.ok(file.startsWith('docs/qa/v112-pit/'));
    return file.slice('docs/qa/v112-pit/'.length);
  });
  const validated = validateExecutedResultV112(raw, {
    domain: 'Pit', opened, runtimeCommit: expected.runtimeCommit, buildId: expected.buildId,
  });
  await check('The preserved raw record satisfies the unchanged strict production validator', async () => {
    assert.equal(raw.failure, null);
    assert.equal(raw.sourceCompletion, false);
    assert.equal(raw.checks.length, 127);
    assert.equal(raw.captures.length, 39);
    assert.deepEqual(raw.completedJourneys, ['FeralScar', 'ScarFeral']);
    assert.equal(entry.browserChecksPassed, 127);
    assert.equal(entry.capturesInspected, 39);
    for (const errors of [raw.errors, raw.consoleErrors, raw.workerErrors, raw.requestsFailed]) assert.deepEqual(errors, []);
    return {checksPassed: 127, captures: 39, completedJourneys: raw.completedJourneys,
      allFourUnfilteredErrorArraysEmpty: true};
  });
  await check('Every frozen runtime input still matches its source observation and committed regular Git blob', async () => {
    assert.equal(freeze.entries.length, 1649);
    assert.deepEqual(raw.sourceBefore, raw.sourceAfter);
    // Executed records use `file`; the freeze uses `path`. The existing
    // production verifier accepts these explicit aliases and checks bytes.
    const canonicalObserved = raw.sourceAfter.map(({file, path: declaredPath, ...row}) => {
      if (file !== undefined && declaredPath !== undefined) assert.equal(file, declaredPath);
      return {path: declaredPath ?? file, ...row};
    });
    assert.deepEqual(canonicalObserved, freeze.entries);
    assert.deepEqual(await snapshotRuntimeV112({root}), freeze);
    await verifyExecutedSourcesV112(raw, freeze, {root});
    await verifyRuntimeCommitV112(freeze, expected.runtimeCommit, {root});
    assert.equal((await fs.readFile(path.join(root, '.next/BUILD_ID'), 'utf8')).trim(), expected.buildId);
    return {frozenFiles: 1649, observationsBeforeAfterIdentical: true,
      currentWorkingBytesMatch: true, regularRuntimeGitBlobsMatch: true,
      retainedNextBuildIdMatches: true};
  });
  const captures = [];
  await check('All 39 original PNGs and every declared portable file remain byte-exact', async () => {
    for (const row of entry.portableFiles) {
      assert.deepEqual(await pin(row.path), {path: row.path, bytes: row.bytes, sha256: row.sha256});
    }
    assert.equal(entry.portableFiles.length, 40);
    for (const [index, source] of raw.captures.entries()) {
      const file = 'docs/qa/v112-pit/' + source.file;
      const bytes = await fs.readFile(path.join(root, file));
      const image = {file, sha256: sha(bytes), bytes: bytes.length};
      assert.deepEqual(image, report.captures[index]);
      assert.equal(source.sha256, image.sha256);
      assert.equal(source.bytes, image.bytes);
      assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      assert.ok(bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0);
      const stat = await fs.lstat(path.join(root, file));
      assert.ok(stat.isFile() && !stat.isSymbolicLink());
      captures.push({...image, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20)});
    }
    return {pngFiles: 39, portableFiles: 40};
  });
  await check('The published report is exactly derived from its genuine raw execution', async () => {
    const derived = {
      schemaVersion: 1, release: 'V112', status: 'PASS_CIBLE', scope: raw.scope,
      sourceFreeze: expected.freeze, domain: 'Pit', completedJourneys: raw.completedJourneys,
      production: {mode: 'compiled-app', runtimeCommit: expected.runtimeCommit, buildId: expected.buildId,
        browserErrors: 0, checksFailed: 0, checksPassed: raw.checks.length, servedBuilds: validated.servedBuilds},
      invocation: raw.invocation, sourceBefore: raw.sourceBefore, sourceAfter: raw.sourceAfter,
      errors: raw.errors, consoleErrors: raw.consoleErrors, workerErrors: raw.workerErrors,
      requestsFailed: raw.requestsFailed, checks: raw.checks,
      captures: captures.map(row => ({file: row.file, sha256: row.sha256, bytes: row.bytes})),
      capturesOpened: captures.map(row => row.file), rawEvidence: entry.portableFiles[0],
    };
    assert.deepEqual(report, derived);
    assert.equal(entry.domain, 'Pit'); assert.equal(entry.status, 'PASS_CIBLE');
    assert.equal(entry.runtimeCommit, expected.runtimeCommit); assert.equal(entry.buildId, expected.buildId);
    assert.equal(entry.driver, 'scripts/qa-pit-backward-throws-v112.mjs');
    assert.equal(entry.command, raw.invocation.command);
  });
  const launches = raw.observations.filter(row => row.kind === 'one-held-input-observed-launch');
  const whiffs = raw.observations.filter(row => row.kind === 'played-observed-whiff');
  await check('The original transcript retains 14 observed single input edges and both source-bounded whiffs', async () => {
    assert.equal(launches.length, 14); assert.equal(whiffs.length, 2);
    for (const row of launches) {
      assert.equal(row.status, 'PASS'); assert.equal(row.pressCalls, 1); assert.equal(row.releaseCalls, 1);
      assert.ok(row.started && row.released); assert.equal(row.failure, null); assert.equal(row.releaseFailure, null);
      assert.ok(row.effectiveFrames > 0 && row.effectiveFrames <= row.bounds.maximumEffectiveFrames);
      assert.equal(row.started.actions[row.slot].workbookMove, 'TH_B');
      assert.equal(row.started.actions[row.slot].phase, 'startup');
    }
    for (const row of whiffs) {
      assert.equal(row.effectiveFrames, 45);
      assert.ok(row.samples.length <= row.maximumPolls + 1);
      assert.ok(row.clockAdvances.some(advance => advance.milliseconds === 1));
      assert.ok(row.samples.every(sample => !sample.throw && !sample.forwardThrow));
      assert.ok(row.samples.every(sample => JSON.stringify(sample.life) === JSON.stringify(row.before.life)));
      assert.equal(row.recovered.actions[row.slot].phase, 'idle');
    }
    return {launches: 14, pressAndReleaseCallsPerLaunch: 1,
      whiffs: whiffs.map(row => ({label: row.label, effectiveFrames: row.effectiveFrames,
        observedSamples: row.samples.length, maximumPolls: row.maximumPolls}))};
  });
  const victory = raw.observations.filter(row => row.kind === 'actual-victory-and-replay');
  await check('The recorded played victory and public replay retain the same terminal state', async () => {
    assert.equal(victory.length, 1);
    assert.deepEqual(victory[0].terminal, victory[0].replayed);
    assert.equal(victory[0].terminal.terminal, 'true');
    assert.equal(victory[0].terminal.combatPhase, 'match-over');
    return {recordedReplaySha256: victory[0].sha256,
      exportedReplayFile: victory[0].archive,
      exportedReplayBytesRetainedInPortablePublication: entry.portableFiles.some(row => row.path.endsWith('/' + victory[0].archive)),
      separatelyReexecutedOrReconstructed: false};
  });
  const witnessNames = [
    'feral-hunter-vs-scar-J2-initial-flight.png',
    'scar-vs-feral-hunter-J2-initial-landing.png',
  ];
  audit.visualReview = {
    originalCapturesOpenedDeclaredByPublication: 39,
    witnessCapturesReopenedInThisAudit: witnessNames.map(name => captures.find(row => row.file.endsWith('/' + name))),
    inspectedWith: 'view_image',
    witnessNotes: 'The original flight and landing drawings are visible with their separate actors and real HUD. The retained HUD overlap limitation is not declared fixed. This is not a new review of all39 images or an artistic admission.',
  };
  assert.ok(audit.visualReview.witnessCapturesReopenedInThisAudit.every(Boolean));
  audit.captures = captures;
  audit.publication = {entry: {path: entryFile, bytes: entryBytes.length, sha256: sha(entryBytes)},
    report: expected.report, sourceFreeze: expected.freeze, rawEvidence: report.rawEvidence};
  audit.limits = [
    'This audit re-verifies preserved original evidence; it does not replay gameplay, rebuild the application, republish or relabel R7.',
    'The original39-image inspection is retained as the publication declaration; only the two named witnesses were reopened in this audit.',
    'The separately exported replay JSON is not part of the portable publication. Its recorded SHA and played/public-replay equality are retained in the original raw transcript; its bytes were not fabricated, reconstructed or separately verified here.',
    'The scope remains the unvaried Feral/Scar backward-throw recipe. Other costumes, partners, complete kits, artistic targets and source requirements remain open.',
  ];
  // Verify the authoritative evidence again after the read-only audit.
  assert.deepEqual(await pin(expected.report.path), expected.report);
  assert.deepEqual(await pin(expected.freeze.path), expected.freeze);
  assert.deepEqual(await fs.readFile(path.join(root, entryFile)), entryBytes);
  audit.status = 'PASS_PRESERVED_EVIDENCE_INTEGRITY';
} catch (error) {
  audit.status = 'FAIL_PRESERVED_EVIDENCE_INTEGRITY';
  audit.failures.push({message: error.message, stack: error.stack});
  process.exitCode = 1;
} finally {
  audit.verifier = await pin(path.relative(root, fileURLToPath(import.meta.url)));
  await fs.mkdir(directory, {recursive: true});
  await fs.writeFile(path.join(directory, 'pit-preserved-verification.json'), JSON.stringify(audit, null, 2) + '\n');
  console.log(JSON.stringify({status: audit.status, checksPassed: audit.checks.length, failures: audit.failures.length,
    output: path.relative(root, path.join(directory, 'pit-preserved-verification.json'))}));
}
