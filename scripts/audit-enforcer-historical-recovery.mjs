import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const originalCommit = 'd71e995ae886df69c4165a1a153291449e8f22f6';
const v610Path = 'docs/suivi-production/v611/data/prior-production-v610.json';
const v613Path = 'docs/suivi-production/v613/data/production-manifest.json';
const checkpointPath = 'docs/suivi-production/v613/recovery/native-checkpoint.json';
const pngRoot = 'public/game/production/enforcers-v610';

function git(...args) {
  const result = spawnSync('git', args, {
    cwd: root,
    env: { ...process.env, GIT_NO_LAZY_FETCH: '1', GIT_ALLOW_PROTOCOL: '' },
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, 'git ' + args.join(' ') + ': ' + result.stderr);
  return result.stdout;
}

function commitFor(ref) {
  return git('rev-parse', '--verify', '--end-of-options', ref + '^{commit}').toString().trim();
}

function checkpointEntries(commit) {
  const entries = git('ls-tree', '-rz', commit, '--', pngRoot, checkpointPath).toString();
  return new Map(entries.split('\0').filter(Boolean).flatMap(entry => {
    const [metadata, path] = entry.split('\t');
    const [mode, type, blob] = metadata.split(' ');
    return type === 'blob' && /^100[67]/.test(mode) ? [[path, blob]] : [];
  }));
}

function readCheckpoint(blob) {
  const checkpoint = JSON.parse(git('cat-file', 'blob', blob));
  assert.equal(checkpoint.schemaVersion, 'yautja-v613-native-checkpoint-1');
  assert.ok(Array.isArray(checkpoint.assets));
  assert.equal(new Set(checkpoint.assets.map(row => row.id)).size, checkpoint.assets.length,
    'Un identifiant apparaît deux fois dans le checkpoint.');
  return new Map(checkpoint.assets.map(row => [row.id, row]));
}

function matchingAttempt(target, row) {
  if (!row || row.repoPngPath !== target.repoPngPath || row.sha256 !== target.sha256
      || row.bytes !== target.bytes || !Array.isArray(row.attempts)) return null;
  return row.attempts.find(attempt =>
    attempt.accepted === true && attempt.sha256 === target.sha256 && attempt.bytes === target.bytes
    && typeof attempt.promptExact === 'string' && attempt.promptExact.trim()
    && typeof attempt.generatedAtUtc === 'string' && Number.isFinite(Date.parse(attempt.generatedAtUtc))
  ) ?? null;
}

function inspectCandidates(commits, images, finals) {
  const rows = commits.map(commit => {
    const index = checkpointEntries(commit);
    const checkpointBlob = index.get(checkpointPath);
    const checkpoint = checkpointBlob ? readCheckpoint(checkpointBlob) : new Map();
    const originalImages = [];
    const differingImages = [];
    for (const target of images) {
      const blob = index.get(target.repoPath);
      if (!blob) continue;
      const file = git('cat-file', 'blob', blob);
      const sha256 = createHash('sha256').update(file).digest('hex');
      const item = { id: target.id, blob, bytes: file.length, sha256 };
      (item.bytes === target.bytes && sha256 === target.sha256 ? originalImages : differingImages).push(item);
    }
    const finalReceipts = finals.flatMap(target => {
      const attempt = matchingAttempt(target, checkpoint.get(target.id));
      return attempt ? [{
        id: target.id, sha256: target.sha256, checkpointBlob, attemptIndex: attempt.attemptIndex,
      }] : [];
    });
    return { commit, checkpointBlob: checkpointBlob ?? null, originalImages, differingImages, finalReceipts };
  });
  return rows;
}

function collectReport(refs) {
  const v610 = JSON.parse(git('show', originalCommit + ':' + v610Path));
  const v613 = JSON.parse(git('show', originalCommit + ':' + v613Path));
  const historic = new Map(JSON.parse(git('show', originalCommit + ':' + checkpointPath))
    .assets.map(row => [row.id, row]));
  assert.equal(v610.records.length, 36);
  assert.equal(v613.assets.length, 36);
  assert.equal(historic.size, 21);
  for (const [targets, pathFor] of [[v610.records, row => row.repoPath], [v613.assets, row => row.repoPngPath]]) {
    assert.equal(new Set(targets.map(row => row.id)).size, targets.length);
    assert.equal(new Set(targets.map(pathFor)).size, targets.length);
    assert.ok(targets.every(row => /^[a-f0-9]{64}$/.test(row.sha256)
      && Number.isSafeInteger(row.bytes) && row.bytes > 0));
  }
  const sourceReceipts = v613.assets.filter(target => {
    const match = matchingAttempt(target, historic.get(target.id));
    if (match) assert.equal(match.promptExact, target.acceptedOutputPromptExact, target.id);
    return Boolean(match);
  });
  assert.equal(sourceReceipts.length, v613.summary.matchingFinalReceiptsRecovered);
  const knownIds = new Set(sourceReceipts.map(row => row.id));
  const candidates = inspectCandidates([...new Set(refs.map(commitFor))], v610.records, v613.assets);
  const pngIds = new Set(candidates.flatMap(row => row.originalImages.map(image => image.id)));
  const receiptCandidateIds = new Set(candidates.flatMap(row => row.finalReceipts.map(receipt => receipt.id)));
  return {
    schemaVersion: 1,
    originalCommit,
    scope: 'Observation des chemins et checkpoints aux seuls commits examinés. Revue de provenance requise pour un nouveau reçu concordant.',
    v610: {
      criterion: 'ENFORCERS-V610-TRACES',
      preservedTraceCount: v610.records.length,
      originalPngMatches: pngIds.size,
      missingOriginalPngs: v610.records.filter(row => !pngIds.has(row.id)).map(row =>
        ({ id: row.id, path: row.repoPath, sourceRow: row.sourceRow, sha256: row.sha256, bytes: row.bytes })),
    },
    v613: {
      criterion: 'ENFORCERS-V613-RECEIPTS',
      finalCount: v613.assets.length,
      matchingPublishedReceipts: sourceReceipts.length,
      additionalReceiptCandidateIds: [...receiptCandidateIds].filter(id => !knownIds.has(id)).sort(),
      missingPublishedReceipts: v613.assets.filter(row => !knownIds.has(row.id)).map(row =>
        ({ id: row.id, sha256: row.sha256, bytes: row.bytes, path: row.repoPngPath })),
    },
    candidates,
  };
}

const args = process.argv.slice(2);
process.stdout.write(JSON.stringify(collectReport(['HEAD', ...args]), null, 2) + '\n');
