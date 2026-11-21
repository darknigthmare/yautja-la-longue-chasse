import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { inspectRenamedOriginals, matchingAttempt } from '../scripts/audit-enforcer-historical-recovery.mjs';

test('matching historical bytes only yield a receipt with the exact accepted prompt', () => {
  const target = { repoPngPath: 'primary.png', bytes: 11, sha256: '7'.repeat(64), acceptedOutputPromptExact: 'Texte accepté' };
  const attempt = {
    accepted: true, bytes: target.bytes, sha256: target.sha256, promptExact: target.acceptedOutputPromptExact,
    generatedAtUtc: '2026-03-06T02:00:00.000Z',
  };
  const row = { ...target, attempts: [{ ...attempt, promptExact: 'Texte d’un autre essai' }, attempt] };
  assert.equal(matchingAttempt(target, row), attempt);
  assert.equal(matchingAttempt(target, { ...row, attempts: [row.attempts[0]] }), null);
  assert.equal(matchingAttempt(target, { ...row, attempts: [{ ...attempt, accepted: false }] }), null);
});

test('a real Git tree exposes the exact renamed original and excludes unrelated bytes of the same size', t => {
  const root = mkdtempSync(join(tmpdir(), 'yautja-git-scan-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root });
  git('init', '--quiet');
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);
  const other = Buffer.from(png);
  other[other.length - 1] = 2;
  writeFileSync(join(root, 'original.png'), png);
  writeFileSync(join(root, 'archive renomme.png'), png);
  writeFileSync(join(root, 'meme taille.png'), other);
  git('add', '--', '.');
  git('-c', 'user.name=QA', '-c', 'user.email=qa@example.invalid', 'commit', '-qm', 'Archive test');
  const commit = git('rev-parse', 'HEAD').toString().trim();
  const target = { id: 'v610-1', bytes: png.length, repoPath: 'original.png', sha256: createHash('sha256').update(png).digest('hex') };
  const report = inspectRenamedOriginals(commit, [target], git);
  assert.equal(report.commit, commit);
  assert.deepEqual(report.originalImages.map(({ id, path, bytes }) => ({ id, path, bytes })),
    [{ id: target.id, path: 'archive renomme.png', bytes: png.length }]);
  assert.equal(report.originalImages[0].sha256, target.sha256);
});
