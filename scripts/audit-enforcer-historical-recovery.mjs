import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

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

function parseCheckpoint(checkpoint) {
  assert.equal(checkpoint.schemaVersion, 'yautja-v613-native-checkpoint-1');
  assert.ok(Array.isArray(checkpoint.assets));
  assert.equal(new Set(checkpoint.assets.map(row => row.id)).size, checkpoint.assets.length,
    'Un identifiant apparaît deux fois dans le checkpoint.');
  return new Map(checkpoint.assets.map(row => [row.id, row]));
}

function manifestRecordsPrompt(target) {
  return typeof target.acceptedOutputPromptExact === 'string' && target.acceptedOutputPromptExact.trim().length > 0;
}

export function matchingAttempt(target, row) {
  if (!row || row.repoPngPath !== target.repoPngPath || row.sha256 !== target.sha256
      || row.bytes !== target.bytes || !Array.isArray(row.attempts)) return null;
  return row.attempts.find(attempt =>
    attempt.accepted === true && attempt.sha256 === target.sha256 && attempt.bytes === target.bytes
    && typeof attempt.promptExact === 'string' && attempt.promptExact.trim()
    && (!manifestRecordsPrompt(target) || attempt.promptExact === target.acceptedOutputPromptExact)
    && typeof attempt.generatedAtUtc === 'string' && Number.isFinite(Date.parse(attempt.generatedAtUtc))
  ) ?? null;
}

function matchingReceipts(finals, checkpoint, source) {
  return finals.flatMap(target => {
    const attempt = matchingAttempt(target, checkpoint.get(target.id));
    return attempt ? [{
      id: target.id, sha256: target.sha256, ...source, attemptIndex: attempt.attemptIndex,
      promptEvidence: manifestRecordsPrompt(target) ? 'matches-final-manifest' : 'requires-independent-source',
    }] : [];
  });
}

function inspectCandidates(commits, images, finals) {
  const rows = commits.map(commit => {
    const index = checkpointEntries(commit);
    const checkpointBlob = index.get(checkpointPath);
    const checkpoint = checkpointBlob ? parseCheckpoint(JSON.parse(git('cat-file', 'blob', checkpointBlob))) : new Map();
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
    const finalReceipts = matchingReceipts(finals, checkpoint, { checkpointBlob });
    return { commit, checkpointBlob: checkpointBlob ?? null, originalImages, differingImages, finalReceipts };
  });
  return rows;
}

/** Match original PNG bytes anywhere in selected Git trees without checkout or lazy fetch. */
export function inspectRenamedOriginals(commit, images, runGit = git, digests = new Map()) {
  const candidatesBySize = new Map();
  for (const target of images) {
    const targets = candidatesBySize.get(target.bytes) ?? [];
    targets.push(target);
    candidatesBySize.set(target.bytes, targets);
  }
  const originalImages = [];
  const entries = runGit('ls-tree', '-rlz', commit).toString().split('\0');
  for (const entry of entries) {
    const separator = entry.indexOf('\t');
    if (separator === -1) continue;
    const metadata = /^(100644|100755) blob ([\da-f]{40}|[\da-f]{64}) +([0-9]+)$/.exec(entry.slice(0, separator));
    if (!metadata) continue;
    const [, , blob, length] = metadata;
    const bytes = Number(length);
    const path = entry.slice(separator + 1);
    const targets = candidatesBySize.get(bytes)?.filter(target => path !== target.repoPath);
    if (!targets?.length) continue;
    let sha256 = digests.get(blob);
    if (!sha256) {
      const file = runGit('cat-file', 'blob', blob);
      assert.equal(file.length, bytes, 'Unexpected size for Git blob ' + blob);
      sha256 = createHash('sha256').update(file).digest('hex');
      digests.set(blob, sha256);
    }
    for (const target of targets) {
      if (sha256 === target.sha256) originalImages.push({ id: target.id, path, blob, bytes, sha256 });
    }
  }
  return { commit, originalImages };
}

function inspectArchive(directory, images) {
  const archiveRoot = resolve(directory);
  assert.ok(lstatSync(archiveRoot).isDirectory(), 'Dossier d’archive attendu : ' + directory);
  const imagesBySize = new Map();
  for (const target of images) {
    const group = imagesBySize.get(target.bytes) ?? [];
    group.push(target);
    imagesBySize.set(target.bytes, group);
  }
  const originalImages = [];
  function scan(folder) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) {
        scan(path);
      } else if (entry.isFile() && imagesBySize.has(lstatSync(path).size)) {
        const file = readFileSync(path);
        const sha256 = createHash('sha256').update(file).digest('hex');
        for (const target of imagesBySize.get(file.length) ?? []) {
          if (sha256 === target.sha256) {
            originalImages.push({ id: target.id, path: relative(archiveRoot, path), bytes: file.length, sha256 });
          }
        }
      }
    }
  }
  scan(archiveRoot);
  originalImages.sort((left, right) => left.path.localeCompare(right.path, 'en'));
  return { directory, originalImages };
}

function inspectArchiveCheckpoint(path, finals) {
  const stat = lstatSync(path);
  assert.ok(stat.isFile(), 'Fichier checkpoint attendu : ' + path);
  const file = readFileSync(path);
  const checkpointSha256 = createHash('sha256').update(file).digest('hex');
  const finalReceipts = matchingReceipts(finals, parseCheckpoint(JSON.parse(file)), { checkpointSha256 });
  return { path, checkpointSha256, finalReceipts };
}

function inspectZip(path, images, finals) {
  assert.ok(lstatSync(path).isFile(), 'Fichier ZIP attendu : ' + path);
  const script = fileURLToPath(new URL('./inspect-enforcer-recovery-zip.py', import.meta.url));
  const result = spawnSync('python3', [script, resolve(path)], {
    cwd: root,
    input: JSON.stringify(images.map(({ id, bytes, sha256 }) => ({ id, bytes, sha256 }))),
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, 'Inspection ZIP ' + path + ' : ' + result.stderr);

  const { originalImages, checkpoints, oversizedJson } = JSON.parse(result.stdout);
  return {
    path,
    originalImages,
    checkpoints: checkpoints.map(({ path: entry, checkpointSha256, document }) => ({
      path: entry,
      checkpointSha256,
      finalReceipts: matchingReceipts(finals, parseCheckpoint(document), { checkpointSha256 }),
    })),
    oversizedJson,
  };
}

function collectReport(refs, { archive, checkpoint, zip, 'scan-git-tree': scanGitTree }) {
  const v610 = JSON.parse(git('show', originalCommit + ':' + v610Path));
  const v613 = JSON.parse(git('show', originalCommit + ':' + v613Path));
  const historic = parseCheckpoint(JSON.parse(git('show', originalCommit + ':' + checkpointPath)));
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
  const commits = [...new Set(refs.map(commitFor))];
  const candidates = inspectCandidates(commits, v610.records, v613.assets);
  const digests = new Map();
  const gitTreeCandidates = scanGitTree
    ? commits.map(commit => inspectRenamedOriginals(commit, v610.records, git, digests))
    : [];
  const archiveCandidates = archive.map(directory => inspectArchive(directory, v610.records));
  const checkpointCandidates = checkpoint.map(path => inspectArchiveCheckpoint(path, v613.assets));
  const zipCandidates = zip.map(path => inspectZip(path, v610.records, v613.assets));
  const pngIds = new Set(
    [...candidates, ...gitTreeCandidates, ...archiveCandidates, ...zipCandidates].flatMap(row => row.originalImages.map(image => image.id))
  );
  const receiptCandidateIds = new Set(
    [...candidates, ...checkpointCandidates, ...zipCandidates.flatMap(row => row.checkpoints)]
      .flatMap(row => row.finalReceipts.map(receipt => receipt.id))
  );
  return {
    schemaVersion: 1,
    originalCommit,
    scope: 'Observation des chemins et checkpoints aux seuls commits examinés. Revue de provenance requise pour un nouveau reçu concordant.'
      + (archive.length || checkpoint.length ? ' Dossiers et checkpoints locaux fournis examinés aussi.' : '')
      + (zip.length ? ' Archives ZIP locales inspectées en lecture seule.' : '')
      + (scanGitTree ? ' Les visuels renommés sont recherchés dans tous les chemins Git sélectionnés.' : ''),
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
    ...(scanGitTree ? { gitTreeCandidates } : {}),
    ...(archive.length ? { archiveCandidates } : {}),
    ...(checkpoint.length ? { checkpointCandidates } : {}),
    ...(zip.length ? { zipCandidates } : {}),
  };
}

function invokedAsCommand() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (invokedAsCommand()) {
  const { values, positionals } = parseArgs({
    options: {
      archive: { type: 'string', multiple: true, default: [] },
      checkpoint: { type: 'string', multiple: true, default: [] },
      zip: { type: 'string', multiple: true, default: [] },
      'scan-git-tree': { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });
  process.stdout.write(JSON.stringify(collectReport(['HEAD', ...positionals], values), null, 2) + '\n');
}
