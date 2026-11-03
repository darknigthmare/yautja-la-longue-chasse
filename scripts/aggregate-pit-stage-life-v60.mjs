import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Join independent browser partitions only after both passed against exactly
// the same frozen sources. This never upgrades partial or failed evidence.
const inputs = process.argv.slice(2);
assert(inputs.length >= 2, 'pass at least two complete application report paths');
const destination = process.env.V60_STAGE_LIFE_QA_AGGREGATE || 'work-local/v60/qa/application-next-complete/report.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const plan = JSON.parse(await fs.readFile('docs/v60-stage-plan.json', 'utf8'));
const expected = plan.stages.map(stage => stage.id).sort();
assert.equal(expected.length, 25);
const loaded = await Promise.all(inputs.map(async file => {
  const bytes = await fs.readFile(file);
  return { file, sha256: sha(bytes), report: JSON.parse(bytes) };
}));
const first = loaded[0].report;
const stages = [], checks = [], captures = [], coveredCases = new Set();
for (const { file, report } of loaded) {
  assert.equal(report.status, 'PASS', `${file} must pass independently`);
  assert.equal(report.surface, 'full-application-public-roster-stage-duel-flow');
  assert.equal(report.url, first.url); assert.equal(report.version, first.version);
  assert.deepEqual(report.sourceHashes, first.sourceHashes, 'partitions use the same frozen runtime and recipe');
  assert.deepEqual(report.errors, []); assert.deepEqual(report.httpFailures, []); assert.deepEqual(report.failedRequests, []);
  assert(report.cases.includes('desktop'), 'every partition must cover its stages in the actual desktop application');
  for (const name of report.cases) coveredCases.add(name);
  for (const stageId of report.targets) {
    const application = report.checks.filter(check => check.name === stageId + '-application');
    assert.equal(application.length, 1, `${stageId} has exactly one completed application result`);
    assert.equal(application[0].nativeFrames.length, 3);
    assert(application[0].nativeFrames.every(event => JSON.stringify(event.seen) === '[0,1,2,3,4,5]'));
    assert.equal(application[0].savedBytesUnchanged, true);
    assert.equal(new Set(application[0].bag.map(event => event.eventId)).size, 3);
    stages.push(stageId);
  }
  checks.push(...report.checks);
  for (const capture of report.captures) {
    const imagePath = path.resolve(path.dirname(file), capture.file);
    assert.equal(sha(await fs.readFile(imagePath)), capture.sha256, 'captured screenshots remain unchanged');
    captures.push({ ...capture, file: path.relative(path.dirname(destination), imagePath).replaceAll('\\', '/') });
  }
}
assert.deepEqual(stages.sort(), expected, 'the partitions cover all25 stages exactly once, without omissions or overlaps');
assert.deepEqual([...coveredCases].sort(), ['desktop', 'mobile', 'reduced', 'retry']);
for (const name of ['reduced-motion', 'mobile-landscape', 'mobile-portrait', 'mobile-native-events', 'native-png-retry-503']) {
  assert(checks.some(check => check.name === name), `${name} must have real successful browser evidence`);
}
for (const [file, expectedHash] of Object.entries(first.sourceHashes)) {
  assert.equal(sha(await fs.readFile(file)), expectedHash, 'verified sources still match at aggregation');
}
const report = {
  status: 'PASS', surface: first.surface, checkedAt: new Date().toISOString(), url: first.url, version: first.version,
  complete25StageGate: true, targets: stages, cases: [...coveredCases].sort(), sourceHashes: first.sourceHashes,
  partitions: loaded.map(({ file, sha256 }) => ({ file: path.resolve(file), sha256 })),
  stageCount: 25, distinctNativeEvents: 75, nativeCellsObserved: 450,
  checks, captures, errors: [], httpFailures: [], failedRequests: [],
  limitations: first.limitations,
};
await fs.mkdir(path.dirname(destination), { recursive: true });
await fs.writeFile(destination, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: 'PASS', stageCount: 25, nativeCellsObserved: 450, destination }));
