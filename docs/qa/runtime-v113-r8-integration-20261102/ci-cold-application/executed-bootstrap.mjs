import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync, spawnSync} from 'node:child_process';
const headBefore = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'});
const commits = ['homeworld', 'pit'].map(domain =>
  JSON.parse(fs.readFileSync('docs/v113-' + domain + '-validation.json', 'utf8')).production.runtimeCommit
);
for (const commit of commits) assert.match(commit, /^[a-f0-9]{40}$/);
assert.equal(commits[0], commits[1], 'Both publications must name the same current runtime');
const runtimeCommit = commits[0];
const probe = spawnSync('git', ['cat-file', '-t', runtimeCommit], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  env: {...process.env, GIT_NO_LAZY_FETCH: '1'},
});
if (probe.status !== 0 || probe.stdout.trim() !== 'commit') {
  execFileSync('git', ['fetch', '--no-tags', '--filter=blob:none', '--depth=1',
    'https://github.com/darknigthmare/yautja-la-longue-chasse.git', runtimeCommit], {stdio: 'inherit'});
}
assert.equal(execFileSync('git', ['cat-file', '-t', runtimeCommit], {
  encoding: 'utf8', env: {...process.env, GIT_NO_LAZY_FETCH: '1'},
}).trim(), 'commit');
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}), headBefore,
  'Fetching evidence history must not change the application checkout');
console.log('Current runtime object available: ' + runtimeCommit);