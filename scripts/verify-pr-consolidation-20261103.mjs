import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const directory = path.join(root, 'docs/pr-consolidation-20261103');
const baseline = JSON.parse(readFileSync(path.join(directory, 'pr-baseline.json'), 'utf8'));
const additions = JSON.parse(readFileSync(path.join(directory, 'pr-additions.json'), 'utf8'));
const inventory = [...baseline.pullRequests, ...additions];
const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim();
const requestedRef = process.argv[2] ?? 'HEAD';
const commit = git('rev-parse', '--verify', requestedRef + '^{commit}');
const numbers = inventory.map(item => item.number);
assert.equal(new Set(numbers).size, numbers.length, 'PR numbers must be unique');
assert.equal(baseline.pullRequests.length, 59, 'The resumed snapshot contains 59 open PRs');
const pullRequests = inventory.map(item => {
  assert.match(item.headSha, /^[a-f0-9]{40}$/);
  const result = spawnSync('git', ['merge-base', '--is-ancestor', item.headSha, commit], {cwd: root, encoding: 'utf8'});
  if (result.status !== 0 && result.status !== 1) throw new Error(result.stderr || result.error?.message || 'Unable to verify ancestry');
  return {...item, presentInCommit: result.status === 0};
});
const missing = pullRequests.filter(item => !item.presentInCommit).map(item => item.number);
const report = {schemaVersion: 1, repository: baseline.repository, baselineMain: baseline.main, verifiedRef: requestedRef, verifiedCommit: commit, expectedPullRequests: numbers.length, includedPullRequests: numbers.length - missing.length, missingPullRequests: missing, pullRequests};
writeFileSync(path.join(directory, 'coverage.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({verifiedCommit: commit, expected: numbers.length, included: numbers.length - missing.length, missing}));
if (missing.length) process.exitCode = 1;
